from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.lecturer_meeting import LecturerMeeting, MeetingStatus
from app.models.user import User
from app.schemas.lecturer_meeting import (
    LecturerMeetingCancelRequest,
    LecturerMeetingCreate,
    LecturerMeetingResponse,
    LecturerMeetingStatusUpdate,
)
from app.services.meeting_service import MeetingService

router = APIRouter()


@router.get("", response_model=List[LecturerMeetingResponse])
async def list_meetings(
    status_filter: Optional[MeetingStatus] = None,
    upcoming: bool = Query(False, description="Filter for upcoming meetings only"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[LecturerMeeting]:
    """Lists meetings relevant to the current user (as student or as lecturer)."""
    return await MeetingService.list_meetings(
        db, current_user, status_filter=status_filter, upcoming_only=upcoming
    )


@router.get("/{meeting_id}", response_model=LecturerMeetingResponse)
async def get_meeting_details(
    meeting_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LecturerMeeting:
    """Retrieves single meeting details with authorization check."""
    return await MeetingService.get_meeting_by_id(db, meeting_id, current_user)


@router.post("", response_model=LecturerMeetingResponse, status_code=status.HTTP_201_CREATED)
async def request_consultation_meeting(
    req: LecturerMeetingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LecturerMeeting:
    """Student: Requests an academic consultation meeting with a lecturer."""
    return await MeetingService.request_meeting(db, current_user, req)


@router.patch("/{meeting_id}/status", response_model=LecturerMeetingResponse)
async def update_meeting_status(
    meeting_id: uuid.UUID,
    req: LecturerMeetingStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LecturerMeeting:
    """Lecturer: Confirms (ACCEPTED), declines (REJECTED), or updates consultation appointment."""
    return await MeetingService.update_meeting_status(db, meeting_id, req, current_user)


@router.post("/{meeting_id}/cancel", response_model=LecturerMeetingResponse)
@router.patch("/{meeting_id}/cancel", response_model=LecturerMeetingResponse)
async def cancel_meeting(
    meeting_id: uuid.UUID,
    req: Optional[LecturerMeetingCancelRequest] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> LecturerMeeting:
    """Student or Lecturer: Cancels an active or pending consultation meeting."""
    reason = req.cancellation_reason if req else None
    return await MeetingService.cancel_meeting(db, meeting_id, current_user, cancellation_reason=reason)
