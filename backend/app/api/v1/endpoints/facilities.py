from datetime import datetime
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_hall_admin
from app.core.exceptions import ConflictException, ResourceNotFoundException
from app.models.facility import Facility, FacilityType
from app.models.facility_booking import BookingStatus, FacilityBooking
from app.models.user import User
from app.schemas.facility import FacilityCreate, FacilityResponse, FacilityUpdate
from app.schemas.facility_booking import FacilityBookingResponse

router = APIRouter()


@router.get("", response_model=List[FacilityResponse])
async def list_facilities(
    facility_type: Optional[FacilityType] = None,
    min_capacity: Optional[int] = None,
    has_projector: Optional[bool] = None,
    has_ac: Optional[bool] = None,
    department_id: Optional[uuid.UUID] = None,
    db: AsyncSession = Depends(get_db),
) -> List[Facility]:
    """Lists available lecture halls and facilities with filters."""
    query = select(Facility).where(Facility.is_operational == True).order_by(Facility.name.asc())

    if facility_type:
        query = query.where(Facility.facility_type == facility_type)
    if min_capacity:
        query = query.where(Facility.capacity >= min_capacity)
    if has_projector is not None:
        query = query.where(Facility.has_projector == has_projector)
    if has_ac is not None:
        query = query.where(Facility.has_ac == has_ac)
    if department_id:
        query = query.where(Facility.department_id == department_id)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=FacilityResponse, status_code=status.HTTP_201_CREATED)
async def create_facility(
    req: FacilityCreate,
    current_admin: User = Depends(require_hall_admin),
    db: AsyncSession = Depends(get_db),
) -> Facility:
    """Hall Admin / Super Admin: Creates a new lecture hall or facility."""
    # Check code uniqueness
    existing = await db.execute(select(Facility).where(Facility.code == req.code))
    if existing.scalar_one_or_none():
        raise ConflictException(f"Facility code '{req.code}' is already registered.")

    facility = Facility(**req.model_dump())
    db.add(facility)
    await db.commit()
    await db.refresh(facility)
    return facility


@router.get("/{facility_id}", response_model=FacilityResponse)
async def get_facility(
    facility_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Facility:
    """Retrieves full details for a facility."""
    query = select(Facility).where(Facility.id == facility_id)
    facility = (await db.execute(query)).scalar_one_or_none()
    if not facility:
        raise ResourceNotFoundException("Facility", str(facility_id))
    return facility


@router.patch("/{facility_id}", response_model=FacilityResponse)
async def update_facility(
    facility_id: uuid.UUID,
    req: FacilityUpdate,
    current_admin: User = Depends(require_hall_admin),
    db: AsyncSession = Depends(get_db),
) -> Facility:
    """Hall Admin: Updates facility configuration."""
    query = select(Facility).where(Facility.id == facility_id)
    facility = (await db.execute(query)).scalar_one_or_none()
    if not facility:
        raise ResourceNotFoundException("Facility", str(facility_id))

    update_data = req.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        setattr(facility, field, val)

    await db.commit()
    await db.refresh(facility)
    return facility


@router.get("/{facility_id}/schedule", response_model=List[FacilityBookingResponse])
async def get_facility_schedule(
    facility_id: uuid.UUID,
    start_date: datetime = Query(...),
    end_date: datetime = Query(...),
    db: AsyncSession = Depends(get_db),
) -> List[FacilityBooking]:
    """Retrieves booked and pending slots for a facility over a given date range."""
    query = (
        select(FacilityBooking)
        .where(
            FacilityBooking.facility_id == facility_id,
            FacilityBooking.status.in_([BookingStatus.APPROVED, BookingStatus.PENDING]),
            FacilityBooking.start_time >= start_date,
            FacilityBooking.end_time <= end_date,
        )
        .order_by(FacilityBooking.start_time.asc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())
