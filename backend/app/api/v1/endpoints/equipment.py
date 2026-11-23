from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_lab_admin
from app.models.equipment import Equipment
from app.models.equipment_borrow import BorrowStatus, EquipmentBorrow
from app.models.user import User
from app.schemas.equipment import (
    EquipmentBorrowCreate,
    EquipmentBorrowResponse,
    EquipmentBorrowReturnConfirm,
    EquipmentBorrowStatusUpdate,
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
)
from app.services.equipment_service import EquipmentService

router = APIRouter()


@router.get("", response_model=List[EquipmentResponse])
async def list_equipment(
    lab_id: Optional[uuid.UUID] = None,
    category: Optional[str] = None,
    borrowable_only: bool = False,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> List[Equipment]:
    """Lists laboratory equipment inventory items."""
    return await EquipmentService.list_equipment(
        db=db,
        lab_id=lab_id,
        category=category,
        borrowable_only=borrowable_only,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.post("", response_model=EquipmentResponse, status_code=status.HTTP_201_CREATED)
async def create_equipment(
    req: EquipmentCreate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> Equipment:
    """Lab Admin: Adds an equipment item to laboratory inventory."""
    return await EquipmentService.create_equipment(db, req)


@router.get("/borrows/my-borrows", response_model=List[EquipmentBorrowResponse])
@router.get("/my-borrows", response_model=List[EquipmentBorrowResponse])
async def list_my_borrows(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[EquipmentBorrow]:
    """Retrieves borrowing history for the current authenticated student."""
    return await EquipmentService.list_borrows(db, current_user)


@router.get("/borrows/records", response_model=List[EquipmentBorrowResponse])
@router.get("/borrows", response_model=List[EquipmentBorrowResponse])
async def list_borrow_records(
    status_filter: Optional[BorrowStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[EquipmentBorrow]:
    """Lists equipment loan requests. Students see own; Admins see queue."""
    return await EquipmentService.list_borrows(db, current_user, status_filter)


@router.post("/borrows", response_model=EquipmentBorrowResponse, status_code=status.HTTP_201_CREATED)
@router.post("/borrow", response_model=EquipmentBorrowResponse, status_code=status.HTTP_201_CREATED)
async def request_borrow(
    req: EquipmentBorrowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EquipmentBorrow:
    """Student: Submits a loan request for laboratory equipment."""
    return await EquipmentService.request_borrow(db, current_user, req)


@router.post("/borrows/{borrow_id}/confirm-return", response_model=EquipmentBorrowResponse)
async def confirm_return(
    borrow_id: uuid.UUID,
    req: Optional[EquipmentBorrowReturnConfirm] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EquipmentBorrow:
    """Student: Confirms that equipment has been returned to the laboratory."""
    return await EquipmentService.student_confirm_return(db, borrow_id, current_user)


@router.post("/borrows/{borrow_id}/cancel", response_model=EquipmentBorrowResponse)
async def cancel_borrow(
    borrow_id: uuid.UUID,
    reason: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> EquipmentBorrow:
    """Student: Cancels a pending or approved borrow request prior to collection."""
    return await EquipmentService.cancel_borrow_request(db, borrow_id, current_user, reason)


@router.patch("/borrows/{borrow_id}/status", response_model=EquipmentBorrowResponse)
async def update_borrow_status(
    borrow_id: uuid.UUID,
    req: EquipmentBorrowStatusUpdate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> EquipmentBorrow:
    """Lab Admin: Manages loan lifecycle (APPROVE, ISSUE, RETURN, OVERDUE, REJECT, DAMAGED)."""
    return await EquipmentService.update_borrow_status(db, borrow_id, req, current_admin)


@router.get("/{equipment_id}", response_model=EquipmentResponse)
async def get_equipment(
    equipment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Equipment:
    """Retrieves equipment specifications and stock availability."""
    return await EquipmentService.get_equipment_by_id(db, equipment_id)


@router.patch("/{equipment_id}", response_model=EquipmentResponse)
@router.put("/{equipment_id}", response_model=EquipmentResponse)
async def update_equipment(
    equipment_id: uuid.UUID,
    req: EquipmentUpdate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> Equipment:
    """Lab Admin: Modifies equipment stock or operational condition."""
    return await EquipmentService.update_equipment(db, equipment_id, req)
