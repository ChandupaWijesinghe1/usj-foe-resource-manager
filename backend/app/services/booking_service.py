from datetime import datetime, timezone
from typing import List, Optional
import uuid
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from app.models.facility import Facility
from app.models.facility_booking import BookingStatus, FacilityBooking
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.schemas.facility import FacilityMaintenanceBlock, FacilityScheduleSlot
from app.schemas.facility_booking import (
    CheckAvailabilityRequest,
    CheckAvailabilityResponse,
    FacilityBookingCreate,
    FacilityBookingStatusUpdate,
)
from app.services.notification_service import create_notification


class BookingService:
    """Business logic service for lecture hall reservations, conflict prevention, and concurrency control."""

    @staticmethod
    async def check_booking_conflict(
        db: AsyncSession,
        facility_id: uuid.UUID,
        start_time: datetime,
        end_time: datetime,
        exclude_booking_id: Optional[uuid.UUID] = None,
    ) -> Optional[FacilityBooking]:
        """Checks if any APPROVED booking or active maintenance block collides with the requested interval."""
        overlap_condition = and_(
            FacilityBooking.facility_id == facility_id,
            FacilityBooking.status.in_([BookingStatus.APPROVED, BookingStatus.PENDING]),
            FacilityBooking.start_time < end_time,
            FacilityBooking.end_time > start_time,
        )

        query = select(FacilityBooking).where(overlap_condition)
        if exclude_booking_id:
            query = query.where(FacilityBooking.id != exclude_booking_id)

        result = await db.execute(query)
        conflicting = result.scalars().first()
        return conflicting

    @staticmethod
    async def preflight_check_availability(
        db: AsyncSession,
        req: CheckAvailabilityRequest,
    ) -> CheckAvailabilityResponse:
        """Non-locking preflight check for frontend UI to inspect time slot availability."""
        fac = (await db.execute(select(Facility).where(Facility.id == req.facility_id))).scalar_one_or_none()
        if not fac:
            raise NotFoundException("Facility", str(req.facility_id))

        if not fac.is_operational:
            return CheckAvailabilityResponse(
                available=False,
                message=f"Facility '{fac.name}' is currently offline/deactivated: {fac.maintenance_reason or 'Under maintenance'}",
                facility_name=fac.name,
                facility_capacity=fac.capacity,
            )

        conflict = await BookingService.check_booking_conflict(
            db=db,
            facility_id=req.facility_id,
            start_time=req.start_time,
            end_time=req.end_time,
        )

        if conflict:
            reason = "Maintenance block" if conflict.is_maintenance_block else f"Reserved: {conflict.title}"
            return CheckAvailabilityResponse(
                available=False,
                message=f"Time slot conflicts with an existing booking ({reason}, status: {conflict.status.value})",
                facility_name=fac.name,
                facility_capacity=fac.capacity,
                conflict_start=conflict.start_time,
                conflict_end=conflict.end_time,
            )

        return CheckAvailabilityResponse(
            available=True,
            message=f"Time slot is available for booking at {fac.name} (Capacity: {fac.capacity})",
            facility_name=fac.name,
            facility_capacity=fac.capacity,
        )

    @staticmethod
    async def get_facility_schedule(
        db: AsyncSession,
        facility_id: uuid.UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> List[FacilityScheduleSlot]:
        """Retrieves schedule slots (approved bookings and maintenance blocks) for calendar view."""
        query = (
            select(FacilityBooking)
            .where(
                FacilityBooking.facility_id == facility_id,
                FacilityBooking.status.in_([BookingStatus.APPROVED, BookingStatus.PENDING]),
                FacilityBooking.start_time < end_date,
                FacilityBooking.end_time > start_date,
            )
            .order_by(FacilityBooking.start_time.asc())
        )
        result = await db.execute(query)
        bookings = result.scalars().all()

        slots: List[FacilityScheduleSlot] = []
        for b in bookings:
            slots.append(
                FacilityScheduleSlot(
                    id=b.id,
                    title="Maintenance" if b.is_maintenance_block else b.title,
                    start_time=b.start_time,
                    end_time=b.end_time,
                    status=b.status.value,
                    is_maintenance=b.is_maintenance_block,
                    attendee_count=b.attendee_count,
                )
            )
        return slots

    @staticmethod
    async def list_bookings(
        db: AsyncSession,
        current_user: User,
        status_filter: Optional[BookingStatus] = None,
        facility_id: Optional[uuid.UUID] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[FacilityBooking]:
        query = select(FacilityBooking).offset(skip).limit(limit).order_by(FacilityBooking.start_time.desc())

        # Non-admins only see their own requests
        if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.FACILITY_ADMIN]:
            query = query.where(FacilityBooking.user_id == current_user.id)
        else:
            if facility_id:
                query = query.where(FacilityBooking.facility_id == facility_id)

        if status_filter:
            query = query.where(FacilityBooking.status == status_filter)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def create_booking(
        db: AsyncSession,
        current_user: User,
        req: FacilityBookingCreate,
    ) -> FacilityBooking:
        """
        Concurrency-safe booking creation using row-level lock on Facility.
        Serializes concurrent requests for the same hall to prevent race conditions.
        """
        # Lock facility row for update to serialize concurrent booking checks
        fac_query = select(Facility).where(Facility.id == req.facility_id).with_for_update()
        fac = (await db.execute(fac_query)).scalar_one_or_none()

        if not fac:
            raise NotFoundException("Facility", str(req.facility_id))

        if not fac.is_operational:
            raise ConflictException(
                f"Facility '{fac.name}' is currently unavailable due to maintenance ({fac.maintenance_reason or 'Offline'})."
            )

        if req.attendee_count > fac.capacity:
            raise BadRequestException(
                f"Requested attendee count ({req.attendee_count}) exceeds maximum capacity of '{fac.name}' ({fac.capacity})."
            )

        # Atomic conflict check
        conflicting = await BookingService.check_booking_conflict(
            db=db,
            facility_id=req.facility_id,
            start_time=req.start_time,
            end_time=req.end_time,
        )

        if conflicting:
            conf_type = "maintenance window" if conflicting.is_maintenance_block else "another booking"
            raise ConflictException(
                f"Facility '{fac.name}' has a scheduling conflict with {conf_type} "
                f"from {conflicting.start_time.strftime('%Y-%m-%d %H:%M')} to {conflicting.end_time.strftime('%H:%M')} "
                f"(Status: {conflicting.status.value})."
            )

        booking = FacilityBooking(
            facility_id=req.facility_id,
            user_id=current_user.id,
            title=req.title.strip(),
            purpose=req.purpose.strip(),
            event_description=req.event_description.strip() if req.event_description else None,
            attendee_count=req.attendee_count,
            start_time=req.start_time,
            end_time=req.end_time,
            document_url=req.document_url,
            document_name=req.document_name,
            status=BookingStatus.PENDING,
            is_maintenance_block=False,
        )
        db.add(booking)
        await db.commit()
        await db.refresh(booking)

        # Notify user
        await create_notification(
            db=db,
            user_id=current_user.id,
            title="Lecture Hall Booking Submitted",
            message=f"Your reservation request for {fac.name} on {req.start_time.strftime('%Y-%m-%d %H:%M')} has been submitted for Facility Admin review.",
            notification_type=NotificationType.FACILITY_BOOKING,
            reference_id=booking.id,
        )

        # Notify facility admins
        fac_admins_query = select(User).where(
            User.role.in_([UserRole.FACILITY_ADMIN, UserRole.SUPER_ADMIN]),
            User.is_active == True,
        )
        facility_admins = (await db.execute(fac_admins_query)).scalars().all()
        for fa in facility_admins:
            await create_notification(
                db=db,
                user_id=fa.id,
                title="New Lecture Hall Booking Request",
                message=f"{current_user.full_name} submitted a reservation for '{fac.name}' ({req.start_time.strftime('%Y-%m-%d %H:%M')}).",
                notification_type=NotificationType.FACILITY_BOOKING,
                reference_id=booking.id,
            )

        return booking

    @staticmethod
    async def create_maintenance_block(
        db: AsyncSession,
        facility_id: uuid.UUID,
        req: FacilityMaintenanceBlock,
        admin_user: User,
    ) -> FacilityBooking:
        """Facility Admin: Blocks a hall during a scheduled maintenance interval."""
        fac_query = select(Facility).where(Facility.id == facility_id).with_for_update()
        fac = (await db.execute(fac_query)).scalar_one_or_none()
        if not fac:
            raise NotFoundException("Facility", str(facility_id))

        # Check for conflict with approved bookings
        conflicting = await BookingService.check_booking_conflict(
            db=db,
            facility_id=facility_id,
            start_time=req.start_time,
            end_time=req.end_time,
        )
        if conflicting and conflicting.status == BookingStatus.APPROVED:
            raise ConflictException(
                f"Cannot place maintenance block: Conflicting approved booking '{conflicting.title}' already exists."
            )

        block = FacilityBooking(
            facility_id=facility_id,
            user_id=admin_user.id,
            title=f"Maintenance: {req.reason.strip()}",
            purpose=req.reason.strip(),
            attendee_count=0,
            start_time=req.start_time,
            end_time=req.end_time,
            status=BookingStatus.APPROVED,
            is_maintenance_block=True,
            approved_by=admin_user.id,
        )
        db.add(block)
        await db.commit()
        await db.refresh(block)
        return block

    @staticmethod
    async def update_booking_status(
        db: AsyncSession,
        booking_id: uuid.UUID,
        req: FacilityBookingStatusUpdate,
        admin_user: User,
    ) -> FacilityBooking:
        """
        Concurrency-safe approval/rejection by Facility Admin.
        Re-verifies non-overlap under lock before final approval.
        """
        query = select(FacilityBooking).where(FacilityBooking.id == booking_id)
        booking = (await db.execute(query)).scalar_one_or_none()
        if not booking:
            raise NotFoundException("Booking", str(booking_id))

        if req.status == BookingStatus.APPROVED:
            # Lock facility row to ensure no concurrent approval double-books the slot
            fac_query = select(Facility).where(Facility.id == booking.facility_id).with_for_update()
            fac = (await db.execute(fac_query)).scalar_one_or_none()
            if not fac or not fac.is_operational:
                raise ConflictException("Facility is currently not operational.")

            # Re-check collision with approved bookings
            overlap_condition = and_(
                FacilityBooking.facility_id == booking.facility_id,
                FacilityBooking.id != booking.id,
                FacilityBooking.status == BookingStatus.APPROVED,
                FacilityBooking.start_time < booking.end_time,
                FacilityBooking.end_time > booking.start_time,
            )
            colliding = (await db.execute(select(FacilityBooking).where(overlap_condition))).scalars().first()
            if colliding:
                raise ConflictException(
                    f"Cannot approve: An approved booking already occupies this slot ({colliding.title})."
                )

            booking.status = BookingStatus.APPROVED
            booking.approved_by = admin_user.id
            booking.rejection_reason = None
            notif_msg = f"Your reservation for '{booking.title}' has been APPROVED by {admin_user.full_name}."
        elif req.status == BookingStatus.REJECTED:
            booking.status = BookingStatus.REJECTED
            booking.approved_by = admin_user.id
            booking.rejection_reason = req.rejection_reason or "Declined by Facility Administration"
            notif_msg = f"Your booking '{booking.title}' was REJECTED: {booking.rejection_reason}"
        else:
            booking.status = req.status
            notif_msg = f"Your booking status was updated to {req.status.value}."

        await db.commit()
        await db.refresh(booking)

        await create_notification(
            db=db,
            user_id=booking.user_id,
            title="Lecture Hall Reservation Update",
            message=notif_msg,
            notification_type=NotificationType.FACILITY_BOOKING,
            reference_id=booking.id,
        )

        return booking

    @staticmethod
    async def cancel_booking(
        db: AsyncSession,
        booking_id: uuid.UUID,
        current_user: User,
    ) -> FacilityBooking:
        query = select(FacilityBooking).where(FacilityBooking.id == booking_id)
        booking = (await db.execute(query)).scalar_one_or_none()
        if not booking:
            raise NotFoundException("Booking", str(booking_id))

        if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.FACILITY_ADMIN]:
            if booking.user_id != current_user.id:
                raise ForbiddenException("You cannot cancel another user's booking.")
            if booking.status in [BookingStatus.CANCELLED, BookingStatus.REJECTED, BookingStatus.COMPLETED]:
                raise ConflictException(f"Booking is already in '{booking.status.value}' state and cannot be cancelled.")

        booking.status = BookingStatus.CANCELLED
        await db.commit()
        await db.refresh(booking)

        # Notify user
        await create_notification(
            db=db,
            user_id=booking.user_id,
            title="Booking Cancelled",
            message=f"The reservation for '{booking.title}' has been cancelled.",
            notification_type=NotificationType.FACILITY_BOOKING,
            reference_id=booking.id,
        )

        return booking
