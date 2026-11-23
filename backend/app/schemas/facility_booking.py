import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.facility_booking import BookingStatus
from app.schemas.facility import FacilityResponse
from app.schemas.user import UserResponse


class FacilityBookingBase(BaseModel):
    facility_id: uuid.UUID
    title: str = Field(..., min_length=3, max_length=255)
    purpose: str = Field(..., min_length=5)
    event_description: Optional[str] = None
    attendee_count: int = Field(default=1, gt=0)
    start_time: datetime
    end_time: datetime
    document_url: Optional[str] = None
    document_name: Optional[str] = None

    @model_validator(mode="after")
    def validate_times(self) -> "FacilityBookingBase":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be strictly greater than start_time")
        return self


class FacilityBookingCreate(FacilityBookingBase):
    pass


class FacilityBookingStatusUpdate(BaseModel):
    status: BookingStatus
    rejection_reason: Optional[str] = None


class CheckAvailabilityRequest(BaseModel):
    facility_id: uuid.UUID
    start_time: datetime
    end_time: datetime

    @model_validator(mode="after")
    def validate_times(self) -> "CheckAvailabilityRequest":
        if self.end_time <= self.start_time:
            raise ValueError("end_time must be strictly greater than start_time")
        return self


class CheckAvailabilityResponse(BaseModel):
    available: bool
    message: str
    facility_name: Optional[str] = None
    facility_capacity: Optional[int] = None
    conflict_start: Optional[datetime] = None
    conflict_end: Optional[datetime] = None


class FacilityBookingResponse(BaseModel):
    id: uuid.UUID
    facility_id: uuid.UUID
    user_id: uuid.UUID
    title: str
    purpose: str
    event_description: Optional[str] = None
    attendee_count: int
    start_time: datetime
    end_time: datetime
    document_url: Optional[str] = None
    document_name: Optional[str] = None
    is_maintenance_block: bool = False
    status: BookingStatus
    approved_by: Optional[uuid.UUID] = None
    rejection_reason: Optional[str] = None
    created_at: datetime
    facility: Optional[FacilityResponse] = None
    user: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
