from datetime import date
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_lecturer
from app.models.lecturer_availability import LecturerAvailability
from app.models.user import User
from app.schemas.lecturer_meeting import (
    LecturerAvailabilityCreate,
    LecturerAvailabilityResponse,
    LecturerAvailabilityUpdate,
    LecturerDiscreteSlot,
)
from app.schemas.user import UserResponse
from app.services.lecturer_service import LecturerService

router = APIRouter()


@router.get("", response_model=List[UserResponse])
async def list_lecturers(
    department_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> List[User]:
    """Retrieves engineering faculty lecturer directory with optional search and department filter."""
    return await LecturerService.list_lecturers(db, department_id=department_id, search=search)


@router.get("/me/availability", response_model=List[LecturerAvailabilityResponse])
async def get_my_availability(
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
) -> List[LecturerAvailability]:
    """Lecturer: Retrieves the authenticated lecturer's published availability slots."""
    return await LecturerService.get_availability_slots(db, current_user.id, include_inactive=True)


@router.post("/me/availability", response_model=LecturerAvailabilityResponse, status_code=status.HTTP_201_CREATED)
async def create_availability_slot(
    req: LecturerAvailabilityCreate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
) -> LecturerAvailability:
    """Lecturer: Adds a recurring weekly office hour or date-specific availability slot."""
    return await LecturerService.create_availability_slot(db, current_user.id, req)


@router.put("/me/availability/{slot_id}", response_model=LecturerAvailabilityResponse)
async def update_availability_slot(
    slot_id: uuid.UUID,
    req: LecturerAvailabilityUpdate,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
) -> LecturerAvailability:
    """Lecturer: Updates an existing availability slot."""
    return await LecturerService.update_availability_slot(db, current_user.id, slot_id, req)


@router.delete("/me/availability/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_availability_slot(
    slot_id: uuid.UUID,
    current_user: User = Depends(require_lecturer),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Lecturer: Removes an office hour availability slot."""
    await LecturerService.delete_availability_slot(db, current_user.id, slot_id)


@router.get("/{lecturer_id}", response_model=UserResponse)
async def get_lecturer(
    lecturer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> User:
    """Retrieves lecturer profile details."""
    return await LecturerService.get_lecturer_by_id(db, lecturer_id)


@router.get("/{lecturer_id}/availability", response_model=List[LecturerAvailabilityResponse])
async def get_lecturer_availability(
    lecturer_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> List[LecturerAvailability]:
    """Retrieves published weekly consultation slots for a lecturer."""
    return await LecturerService.get_availability_slots(db, lecturer_id)


@router.get("/{lecturer_id}/available-slots", response_model=List[LecturerDiscreteSlot])
async def get_lecturer_discrete_slots(
    lecturer_id: uuid.UUID,
    target_date: date = Query(..., alias="date", description="Target consultation date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
) -> List[LecturerDiscreteSlot]:
    """Retrieves discrete consultation time slots for a lecturer on a specific date, indicating availability."""
    return await LecturerService.get_available_discrete_slots(db, lecturer_id, target_date)
