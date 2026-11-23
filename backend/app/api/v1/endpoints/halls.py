from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_facility_admin
from app.models.facility import Facility, FacilityType
from app.models.facility_booking import FacilityBooking
from app.models.user import User
from app.schemas.facility import (
    FacilityCreate,
    FacilityMaintenanceBlock,
    FacilityResponse,
    FacilityScheduleSlot,
    FacilityUpdate,
)
from app.schemas.facility_booking import FacilityBookingResponse
from app.services.booking_service import BookingService
from app.services.hall_service import HallService

router = APIRouter()


@router.get("", response_model=List[FacilityResponse])
async def list_halls(
    facility_type: Optional[FacilityType] = None,
    min_capacity: Optional[int] = None,
    has_projector: Optional[bool] = None,
    has_ac: Optional[bool] = None,
    has_sound_system: Optional[bool] = None,
    department_id: Optional[uuid.UUID] = None,
    include_deactivated: bool = Query(False, description="Include offline/deactivated facilities"),
    db: AsyncSession = Depends(get_db),
) -> List[Facility]:
    """Lists lecture halls and facilities with amenity filters."""
    return await HallService.list_facilities(
        db=db,
        facility_type=facility_type,
        min_capacity=min_capacity,
        has_projector=has_projector,
        has_ac=has_ac,
        has_sound_system=has_sound_system,
        department_id=department_id,
        include_deactivated=include_deactivated,
    )


@router.post("", response_model=FacilityResponse, status_code=status.HTTP_201_CREATED)
async def create_hall(
    req: FacilityCreate,
    current_admin: User = Depends(require_facility_admin),
    db: AsyncSession = Depends(get_db),
) -> Facility:
    """Facility Admin / Super Admin: Registers a new lecture hall or auditorium."""
    return await HallService.create_facility(db, req)


@router.get("/{hall_id}", response_model=FacilityResponse)
async def get_hall_by_id(
    hall_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Facility:
    """Retrieves full specifications for a lecture hall or facility."""
    return await HallService.get_facility_by_id(db, hall_id)


@router.patch("/{hall_id}", response_model=FacilityResponse)
async def update_hall(
    hall_id: uuid.UUID,
    req: FacilityUpdate,
    current_admin: User = Depends(require_facility_admin),
    db: AsyncSession = Depends(get_db),
) -> Facility:
    """Facility Admin: Updates hall specifications and operational details."""
    return await HallService.update_facility(db, hall_id, req)


@router.patch("/{hall_id}/status", response_model=FacilityResponse)
async def set_hall_status(
    hall_id: uuid.UUID,
    is_operational: bool = Query(..., description="Active or Deactivated"),
    maintenance_reason: Optional[str] = Query(None, description="Reason if deactivating"),
    current_admin: User = Depends(require_facility_admin),
    db: AsyncSession = Depends(get_db),
) -> Facility:
    """Facility Admin: Activates or deactivates a lecture hall."""
    return await HallService.set_operational_status(
        db=db,
        facility_id=hall_id,
        is_operational=is_operational,
        maintenance_reason=maintenance_reason,
    )


@router.get("/{hall_id}/schedule", response_model=List[FacilityScheduleSlot])
async def get_hall_schedule(
    hall_id: uuid.UUID,
    start_date: datetime = Query(..., description="Interval start in ISO format"),
    end_date: datetime = Query(..., description="Interval end in ISO format"),
    db: AsyncSession = Depends(get_db),
) -> List[FacilityScheduleSlot]:
    """Retrieves occupied time slots (approved reservations and maintenance) for calendar rendering."""
    return await BookingService.get_facility_schedule(
        db=db,
        facility_id=hall_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.post("/{hall_id}/maintenance", response_model=FacilityBookingResponse, status_code=status.HTTP_201_CREATED)
async def block_hall_maintenance(
    hall_id: uuid.UUID,
    req: FacilityMaintenanceBlock,
    current_admin: User = Depends(require_facility_admin),
    db: AsyncSession = Depends(get_db),
) -> FacilityBooking:
    """Facility Admin: Blocks a lecture hall for scheduled maintenance."""
    return await BookingService.create_maintenance_block(
        db=db,
        facility_id=hall_id,
        req=req,
        admin_user=current_admin,
    )
