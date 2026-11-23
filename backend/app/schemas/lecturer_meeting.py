import uuid
from datetime import date, datetime, time
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.lecturer_availability import LocationType
from app.models.lecturer_meeting import MeetingStatus
from app.schemas.user import UserResponse


class LecturerAvailabilityBase(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6, description="0=Monday, 6=Sunday")
    specific_date: Optional[date] = Field(None, description="Optional specific date override")
    start_time: time
    end_time: time
    slot_duration_minutes: int = Field(default=20, ge=10, le=180)
    max_students_per_slot: int = Field(default=1, ge=1, le=50)
    location_type: LocationType = LocationType.PHYSICAL_OFFICE
    room_or_link: str = Field(..., min_length=2, max_length=255)
    is_active: bool = True


class LecturerAvailabilityCreate(LecturerAvailabilityBase):
    pass


class LecturerAvailabilityUpdate(BaseModel):
    day_of_week: Optional[int] = Field(None, ge=0, le=6)
    specific_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    slot_duration_minutes: Optional[int] = Field(None, ge=10, le=180)
    max_students_per_slot: Optional[int] = Field(None, ge=1, le=50)
    location_type: Optional[LocationType] = None
    room_or_link: Optional[str] = Field(None, min_length=2, max_length=255)
    is_active: Optional[bool] = None


class LecturerAvailabilityResponse(LecturerAvailabilityBase):
    id: uuid.UUID
    lecturer_id: uuid.UUID
    day_of_week: int

    model_config = ConfigDict(from_attributes=True)


class LecturerDiscreteSlot(BaseModel):
    availability_slot_id: uuid.UUID
    meeting_date: date
    start_time: time
    end_time: time
    location_type: LocationType
    room_or_link: str
    is_available: bool
    current_bookings_count: int = 0
    max_students: int = 1


class LecturerMeetingCreate(BaseModel):
    lecturer_id: uuid.UUID
    availability_slot_id: Optional[uuid.UUID] = None
    meeting_date: date
    start_time: time
    end_time: time
    subject: str = Field(..., min_length=3, max_length=255)
    agenda: str = Field(..., min_length=5)


class LecturerMeetingStatusUpdate(BaseModel):
    meeting_status: MeetingStatus
    decline_reason: Optional[str] = None
    lecturer_notes: Optional[str] = None

    @field_validator("meeting_status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if isinstance(v, str):
            v_upper = v.upper()
            if v_upper == "REQUESTED":
                return MeetingStatus.PENDING
            elif v_upper == "CONFIRMED":
                return MeetingStatus.ACCEPTED
            elif v_upper == "DECLINED":
                return MeetingStatus.REJECTED
        return v


class LecturerMeetingCancelRequest(BaseModel):
    cancellation_reason: Optional[str] = None


class LecturerMeetingResponse(BaseModel):
    id: uuid.UUID
    lecturer_id: uuid.UUID
    student_id: uuid.UUID
    availability_slot_id: Optional[uuid.UUID] = None
    meeting_date: date
    start_time: time
    end_time: time
    subject: str
    agenda: str
    meeting_status: MeetingStatus
    decline_reason: Optional[str] = None
    lecturer_notes: Optional[str] = None
    created_at: datetime
    lecturer: Optional[UserResponse] = None
    student: Optional[UserResponse] = None
    availability_slot: Optional[LecturerAvailabilityResponse] = None

    model_config = ConfigDict(from_attributes=True)
