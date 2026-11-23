from datetime import datetime, timezone
from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_hall_admin
from app.core.exceptions import ConflictException, PermissionDeniedException, ResourceNotFoundException
from app.models.facility import Facility
from app.models.facility_booking import BookingStatus, FacilityBooking
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.schemas.facility_booking import (
    FacilityBookingCreate,
    FacilityBookingResponse,
    FacilityBookingStatusUpdate,
)
from app.services.booking_service import check_booking_conflict
from app.services.notification_service import create_notification

router = APIRouter()


@router.get("", response_model=List[FacilityBookingResponse])
async def list_bookings(
    status_filter: Optional[BookingStatus] = None,
    facility_id: Optional[uuid.UUID] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[FacilityBooking]:
    """Lists bookings. Normal users see their own; Admins see all."""
    query = select(FacilityBooking).offset(skip).limit(limit).order_by(FacilityBooking.created_at.desc())

    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.HALL_ADMIN]:
        query = query.where(FacilityBooking.user_id == current_user.id)
    else:
        if facility_id:
            query = query.where(FacilityBooking.facility_id == facility_id)

    if status_filter:
        query = query.where(FacilityBooking.status == status_filter)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("", response_model=FacilityBookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    req: FacilityBookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FacilityBooking:
    """Submits a hall booking request after checking for scheduling clashes."""
    # Check facility existence and operational status
    fac_query = select(Facility).where(Facility.id == req.facility_id)
    facility = (await db.execute(fac_query)).scalar_one_or_none()
    if not facility:
        raise ResourceNotFoundException("Facility", str(req.facility_id))
    if not facility.is_operational:
        raise ConflictException(f"Facility '{facility.name}' is currently closed for maintenance.")

    # Concurrency and overlap clash prevention
    await check_booking_conflict(
        db=db,
        facility_id=req.facility_id,
        start_time=req.start_time,
        end_time=req.end_time,
    )

    booking = FacilityBooking(
        facility_id=req.facility_id,
        user_id=current_user.id,
        title=req.title,
        purpose=req.purpose,
        attendee_count=req.attendee_count,
        start_time=req.start_time,
        end_time=req.end_time,
        status=BookingStatus.PENDING,
    )
    db.add(booking)
    await db.commit()
    await db.refresh(booking)

    # Trigger notification
    await create_notification(
        db=db,
        user_id=current_user.id,
        title="Booking Request Submitted",
        message=f"Your request for {facility.name} on {req.start_time.strftime('%Y-%m-%d %H:%M')} has been submitted for approval.",
        notification_type=NotificationType.FACILITY_BOOKING,
        reference_id=booking.id,
    )

    return booking


@router.patch("/{booking_id}/status", response_model=FacilityBookingResponse)
async def update_booking_status(
    booking_id: uuid.UUID,
    req: FacilityBookingStatusUpdate,
    current_admin: User = Depends(require_hall_admin),
    db: AsyncSession = Depends(get_db),
) -> FacilityBooking:
    """Hall Admin: Approves or rejects a booking request."""
    query = select(FacilityBooking).where(FacilityBooking.id == booking_id)
    booking = (await db.execute(query)).scalar_one_or_none()
    if not booking:
        raise ResourceNotFoundException("Booking", str(booking_id))

    if req.status == BookingStatus.APPROVED:
        # Re-check for overlap right before final approval
        await check_booking_conflict(
            db=db,
            facility_id=booking.facility_id,
            start_time=booking.start_time,
            end_time=booking.end_time,
            exclude_booking_id=booking.id,
        )
        booking.status = BookingStatus.APPROVED
        booking.approved_by = current_admin.id
        booking.rejection_reason = None
        notif_msg = f"Your booking for '{booking.title}' has been APPROVED by {current_admin.full_name}."
    elif req.status == BookingStatus.REJECTED:
        booking.status = BookingStatus.REJECTED
        booking.approved_by = current_admin.id
        booking.rejection_reason = req.rejection_reason or "Declined by Hall Administration"
        notif_msg = f"Your booking for '{booking.title}' was REJECTED: {booking.rejection_reason}"
    else:
        booking.status = req.status
        notif_msg = f"Your booking status was updated to {req.status.value}."

    await db.commit()
    await db.refresh(booking)

    # Notify requester
    await create_notification(
        db=db,
        user_id=booking.user_id,
        title="Booking Status Update",
        message=notif_msg,
        notification_type=NotificationType.FACILITY_BOOKING,
        reference_id=booking.id,
    )

    return booking


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def cancel_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Cancels a booking. Users can cancel their own; Hall Admins can cancel any."""
    query = select(FacilityBooking).where(FacilityBooking.id == booking_id)
    booking = (await db.execute(query)).scalar_one_or_none()
    if not booking:
        raise ResourceNotFoundException("Booking", str(booking_id))

    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.HALL_ADMIN]:
        if booking.user_id != current_user.id:
            raise PermissionDeniedException("You cannot cancel another user's booking.")
        if booking.status == BookingStatus.COMPLETED:
            raise ConflictException("Completed bookings cannot be cancelled.")

    booking.status = BookingStatus.CANCELLED
    await db.commit()
