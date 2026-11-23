import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_facility_admin
from app.models.facility_booking import BookingStatus, FacilityBooking
from app.models.user import User
from app.schemas.facility_booking import (
    CheckAvailabilityRequest,
    CheckAvailabilityResponse,
    FacilityBookingCreate,
    FacilityBookingResponse,
    FacilityBookingStatusUpdate,
)
from app.services.booking_service import BookingService

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
    """Lists hall bookings. Students/lecturers see their own; Facility Admins see all."""
    return await BookingService.list_bookings(
        db=db,
        current_user=current_user,
        status_filter=status_filter,
        facility_id=facility_id,
        skip=skip,
        limit=limit,
    )


@router.get("/my-bookings", response_model=List[FacilityBookingResponse])
async def list_my_bookings(
    status_filter: Optional[BookingStatus] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[FacilityBooking]:
    """Retrieves current authenticated user's lecture hall booking requests."""
    return await BookingService.list_bookings(
        db=db,
        current_user=current_user,
        status_filter=status_filter,
        skip=skip,
        limit=limit,
    )


@router.post("/check-availability", response_model=CheckAvailabilityResponse)
async def check_availability(
    req: CheckAvailabilityRequest,
    db: AsyncSession = Depends(get_db),
) -> CheckAvailabilityResponse:
    """Pre-flight check to verify if a lecture hall is available for the requested time slot."""
    return await BookingService.preflight_check_availability(db, req)


@router.post("/upload-document", status_code=status.HTTP_201_CREATED)
async def upload_supporting_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Uploads supporting documentation (approval letters, society signatures, PDFs/images)."""
    allowed_extensions = {".pdf", ".png", ".jpg", ".jpeg", ".docx", ".doc"}
    raw_name = os.path.basename(file.filename or "doc.pdf")
    ext = os.path.splitext(raw_name)[1].lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(allowed_extensions)}",
        )

    content = await file.read()
    if len(content) > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded document exceeds the maximum allowable limit of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    doc_dir = os.path.join(settings.UPLOAD_DIR, "documents")
    os.makedirs(doc_dir, exist_ok=True)

    safe_name = f"{uuid.uuid4().hex}_{raw_name}"
    file_path = os.path.join(doc_dir, safe_name)

    with open(file_path, "wb") as f:
        f.write(content)

    return {
        "url": f"/uploads/documents/{safe_name}",
        "filename": raw_name,
        "size_bytes": len(content),
    }


@router.post("", response_model=FacilityBookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    req: FacilityBookingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FacilityBooking:
    """Submits a hall booking request with concurrency-safe clash prevention."""
    return await BookingService.create_booking(db, current_user, req)


@router.patch("/{booking_id}/status", response_model=FacilityBookingResponse)
async def update_booking_status(
    booking_id: uuid.UUID,
    req: FacilityBookingStatusUpdate,
    current_admin: User = Depends(require_facility_admin),
    db: AsyncSession = Depends(get_db),
) -> FacilityBooking:
    """Facility Admin: Approves or rejects a booking request with rejection reason."""
    return await BookingService.update_booking_status(db, booking_id, req, current_admin)


@router.patch("/{booking_id}/cancel", response_model=FacilityBookingResponse)
async def cancel_booking_request(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> FacilityBooking:
    """Cancels an eligible pending booking request."""
    return await BookingService.cancel_booking(db, booking_id, current_user)


@router.delete("/{booking_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_or_cancel_booking(
    booking_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Cancels a booking request (DELETE endpoint)."""
    await BookingService.cancel_booking(db, booking_id, current_user)
