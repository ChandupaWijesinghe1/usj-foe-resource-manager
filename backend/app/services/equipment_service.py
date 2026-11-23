from datetime import datetime, timezone
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.models.equipment import Equipment, EquipmentCondition
from app.models.equipment_borrow import BorrowStatus, EquipmentBorrow
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.schemas.equipment import (
    EquipmentBorrowCreate,
    EquipmentBorrowStatusUpdate,
    EquipmentCreate,
    EquipmentUpdate,
)
from app.services.notification_service import create_notification


class EquipmentService:
    """Business logic service for lab equipment inventory and loaning."""

    @staticmethod
    async def list_equipment(
        db: AsyncSession,
        lab_id: Optional[uuid.UUID] = None,
        category: Optional[str] = None,
        borrowable_only: bool = False,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Equipment]:
        query = select(Equipment).offset(skip).limit(limit).order_by(Equipment.name.asc())

        if lab_id:
            query = query.where(Equipment.lab_id == lab_id)
        if category:
            query = query.where(Equipment.category.ilike(f"%{category}%"))
        if borrowable_only:
            query = query.where(Equipment.is_borrowable == True, Equipment.available_quantity > 0)
        if search:
            query = query.where(Equipment.name.ilike(f"%{search}%"))

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_equipment_by_id(db: AsyncSession, equipment_id: uuid.UUID) -> Equipment:
        query = select(Equipment).where(Equipment.id == equipment_id)
        item = (await db.execute(query)).scalar_one_or_none()
        if not item:
            raise NotFoundException("Equipment", str(equipment_id))
        return item

    @staticmethod
    async def create_equipment(db: AsyncSession, req: EquipmentCreate) -> Equipment:
        if req.serial_number:
            existing = await db.execute(
                select(Equipment).where(Equipment.serial_number == req.serial_number.strip().upper())
            )
            if existing.scalar_one_or_none():
                raise ConflictException(f"Serial number '{req.serial_number}' already registered.")

        item = Equipment(
            lab_id=req.lab_id,
            name=req.name.strip(),
            model_number=req.model_number.strip() if req.model_number else None,
            serial_number=req.serial_number.strip().upper() if req.serial_number else None,
            category=req.category.strip(),
            total_quantity=req.total_quantity,
            available_quantity=req.available_quantity,
            is_borrowable=req.is_borrowable,
            requires_admin_approval=req.requires_admin_approval,
            condition_status=req.condition_status,
        )
        db.add(item)
        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def update_equipment(
        db: AsyncSession, equipment_id: uuid.UUID, req: EquipmentUpdate
    ) -> Equipment:
        item = await EquipmentService.get_equipment_by_id(db, equipment_id)
        update_data = req.model_dump(exclude_unset=True)

        if "serial_number" in update_data and update_data["serial_number"]:
            new_sn = update_data["serial_number"].strip().upper()
            if new_sn != item.serial_number:
                existing = await db.execute(
                    select(Equipment).where(Equipment.serial_number == new_sn, Equipment.id != equipment_id)
                )
                if existing.scalar_one_or_none():
                    raise ConflictException(f"Serial number '{new_sn}' already registered.")
                update_data["serial_number"] = new_sn

        for field, val in update_data.items():
            setattr(item, field, val)

        await db.commit()
        await db.refresh(item)
        return item

    @staticmethod
    async def list_borrows(
        db: AsyncSession,
        current_user: User,
        status_filter: Optional[BorrowStatus] = None,
    ) -> List[EquipmentBorrow]:
        query = select(EquipmentBorrow).order_by(EquipmentBorrow.created_at.desc())

        if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN]:
            query = query.where(EquipmentBorrow.borrower_id == current_user.id)
        if status_filter:
            query = query.where(EquipmentBorrow.status == status_filter)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_borrow_by_id(
        db: AsyncSession, borrow_id: uuid.UUID, current_user: User
    ) -> EquipmentBorrow:
        query = select(EquipmentBorrow).where(EquipmentBorrow.id == borrow_id)
        borrow = (await db.execute(query)).scalar_one_or_none()
        if not borrow:
            raise NotFoundException("Borrow Record", str(borrow_id))

        if (
            current_user.role not in [UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN]
            and current_user.id != borrow.borrower_id
        ):
            raise ForbiddenException("You do not have permission to view this borrow record.")

        return borrow

    @staticmethod
    async def request_borrow(
        db: AsyncSession,
        borrower: User,
        req: EquipmentBorrowCreate,
    ) -> EquipmentBorrow:
        if req.expected_return_date <= req.expected_borrow_date:
            raise BadRequestException("Expected return date must be after borrowing date.")

        # Row-level lock on equipment row to serialize concurrent borrow requests
        item_query = select(Equipment).where(Equipment.id == req.equipment_id).with_for_update()
        item = (await db.execute(item_query)).scalar_one_or_none()
        if not item:
            raise NotFoundException("Equipment", str(req.equipment_id))

        if not item.is_borrowable:
            raise ConflictException(f"Equipment '{item.name}' is marked as non-borrowable.")

        if item.condition_status == EquipmentCondition.DECOMMISSIONED:
            raise BadRequestException(f"Equipment '{item.name}' is decommissioned and cannot be loaned.")

        # Inventory check: prevent borrowing beyond available quantities
        if item.available_quantity < req.quantity:
            raise ConflictException(
                f"Insufficient stock available. Only {item.available_quantity} unit(s) in stock, but {req.quantity} requested."
            )

        borrow = EquipmentBorrow(
            equipment_id=req.equipment_id,
            borrower_id=borrower.id,
            quantity=req.quantity,
            purpose=req.purpose.strip(),
            expected_borrow_date=req.expected_borrow_date,
            expected_return_date=req.expected_return_date,
            status=BorrowStatus.PENDING,
        )
        db.add(borrow)
        await db.commit()
        await db.refresh(borrow)

        # Notify Lab Admin
        if item.laboratory and item.laboratory.admin_in_charge_id:
            await create_notification(
                db=db,
                user_id=item.laboratory.admin_in_charge_id,
                title="New Equipment Borrow Request",
                message=f"{borrower.full_name} requested {req.quantity}x '{item.name}' for: {req.purpose[:60]}.",
                notification_type=NotificationType.EQUIPMENT,
                reference_id=borrow.id,
            )

        return borrow

    @staticmethod
    async def student_confirm_return(
        db: AsyncSession, borrow_id: uuid.UUID, current_user: User
    ) -> EquipmentBorrow:
        """Student marks that they have returned/handed over the equipment."""
        borrow = await EquipmentService.get_borrow_by_id(db, borrow_id, current_user)
        if borrow.borrower_id != current_user.id and current_user.role != UserRole.SUPER_ADMIN:
            raise ForbiddenException("Only the borrower can confirm return handover.")

        if borrow.status not in [BorrowStatus.IN_PROGRESS, BorrowStatus.APPROVED, BorrowStatus.OVERDUE]:
            raise BadRequestException(f"Cannot confirm return for a request in status: {borrow.status.value}")

        borrow.student_confirmed_return = True
        await db.commit()
        await db.refresh(borrow)

        # Notify lab admin to inspect equipment and complete check-in
        if borrow.equipment and borrow.equipment.laboratory and borrow.equipment.laboratory.admin_in_charge_id:
            await create_notification(
                db=db,
                user_id=borrow.equipment.laboratory.admin_in_charge_id,
                title="Student Return Confirmation",
                message=f"{current_user.full_name} reported returning {borrow.quantity}x '{borrow.equipment.name}'. Please inspect and finalize check-in.",
                notification_type=NotificationType.EQUIPMENT,
                reference_id=borrow.id,
            )

        return borrow

    @staticmethod
    async def cancel_borrow_request(
        db: AsyncSession, borrow_id: uuid.UUID, current_user: User, reason: Optional[str] = None
    ) -> EquipmentBorrow:
        """Student cancels borrow request prior to collection."""
        borrow = await EquipmentService.get_borrow_by_id(db, borrow_id, current_user)
        if borrow.borrower_id != current_user.id and current_user.role != UserRole.SUPER_ADMIN:
            raise ForbiddenException("Only the borrower can cancel this request.")

        if borrow.status in [BorrowStatus.COMPLETED, BorrowStatus.CANCELLED, BorrowStatus.REJECTED]:
            raise BadRequestException(f"Cannot cancel a request that is already {borrow.status.value}.")

        # If it was APPROVED, restore reserved inventory
        if borrow.status == BorrowStatus.APPROVED:
            eq = await EquipmentService.get_equipment_by_id(db, borrow.equipment_id)
            eq.available_quantity = min(eq.total_quantity, eq.available_quantity + borrow.quantity)

        borrow.status = BorrowStatus.CANCELLED
        if reason:
            borrow.admin_notes = f"Cancelled by student: {reason.strip()}"

        await db.commit()
        await db.refresh(borrow)
        return borrow

    @staticmethod
    async def update_borrow_status(
        db: AsyncSession,
        borrow_id: uuid.UUID,
        req: EquipmentBorrowStatusUpdate,
        admin_user: User,
    ) -> EquipmentBorrow:
        """Lab Admin updates loan approval, issuance, and inspection on return."""
        query = select(EquipmentBorrow).where(EquipmentBorrow.id == borrow_id)
        borrow = (await db.execute(query)).scalar_one_or_none()
        if not borrow:
            raise NotFoundException("Borrow Record", str(borrow_id))

        old_status = borrow.status
        target_status = req.status

        eq_query = select(Equipment).where(Equipment.id == borrow.equipment_id).with_for_update()
        eq = (await db.execute(eq_query)).scalar_one_or_none()
        if not eq:
            raise NotFoundException("Equipment", str(borrow.equipment_id))

        # 1. Transition to APPROVED: reserve inventory
        if target_status == BorrowStatus.APPROVED and old_status != BorrowStatus.APPROVED:
            if eq.available_quantity < borrow.quantity:
                raise ConflictException(
                    f"Insufficient inventory to approve loan. Available: {eq.available_quantity}, requested: {borrow.quantity}"
                )
            eq.available_quantity -= borrow.quantity
            if req.collection_instructions:
                borrow.collection_instructions = req.collection_instructions.strip()

        # 2. Transition to IN_PROGRESS / ISSUED: student collected equipment
        elif target_status in [BorrowStatus.IN_PROGRESS, BorrowStatus.ISSUED]:
            # If not previously approved (e.g. direct issuance), decrement inventory now
            if old_status not in [BorrowStatus.APPROVED, BorrowStatus.IN_PROGRESS, BorrowStatus.ISSUED]:
                if eq.available_quantity < borrow.quantity:
                    raise ConflictException("Insufficient available stock to issue equipment.")
                eq.available_quantity -= borrow.quantity

            borrow.issued_by = admin_user.id
            if req.collection_instructions:
                borrow.collection_instructions = req.collection_instructions.strip()

        # 3. Transition to COMPLETED / RETURNED: equipment returned and inspected
        elif target_status in [BorrowStatus.COMPLETED, BorrowStatus.RETURNED]:
            borrow.actual_return_date = datetime.now(timezone.utc)
            borrow.received_by = admin_user.id
            borrow.condition_on_return = req.condition_on_return

            if req.is_damaged_or_missing:
                borrow.is_damaged_or_missing = True
                borrow.damage_notes = req.damage_notes or "Equipment reported damaged/missing upon return inspection."
                eq.condition_status = EquipmentCondition.NEEDS_REPAIR
                # Damaged equipment is NOT added back to available inventory
            else:
                # Return intact inventory to available pool
                borrow.is_damaged_or_missing = False
                eq.available_quantity = min(eq.total_quantity, eq.available_quantity + borrow.quantity)

        # 4. Transition to REJECTED or CANCELLED: restore inventory if previously reserved
        elif target_status in [BorrowStatus.REJECTED, BorrowStatus.CANCELLED]:
            if old_status in [BorrowStatus.APPROVED, BorrowStatus.IN_PROGRESS, BorrowStatus.ISSUED]:
                eq.available_quantity = min(eq.total_quantity, eq.available_quantity + borrow.quantity)

            if req.rejection_reason:
                borrow.rejection_reason = req.rejection_reason.strip()

        borrow.status = target_status
        if req.admin_notes:
            borrow.admin_notes = req.admin_notes.strip()

        await db.commit()
        await db.refresh(borrow)

        # Build informative notification for student
        notif_msg = f"Your loan for '{eq.name}' is now: {target_status.value}."
        if target_status == BorrowStatus.APPROVED and borrow.collection_instructions:
            notif_msg += f" Instructions: {borrow.collection_instructions}"
        elif target_status == BorrowStatus.REJECTED and borrow.rejection_reason:
            notif_msg += f" Reason: {borrow.rejection_reason}"
        elif target_status in [BorrowStatus.COMPLETED, BorrowStatus.RETURNED]:
            notif_msg += " Return inspection finalized."

        await create_notification(
            db=db,
            user_id=borrow.borrower_id,
            title=f"Equipment Loan {target_status.value}",
            message=notif_msg,
            notification_type=NotificationType.EQUIPMENT,
            reference_id=borrow.id,
        )

        return borrow
