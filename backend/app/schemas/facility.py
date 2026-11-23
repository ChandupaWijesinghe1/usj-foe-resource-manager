import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.facility import FacilityType
from app.schemas.user import DepartmentSummary


class FacilityBase(BaseModel):
    name: str = Field(..., max_length=150)
    code: str = Field(..., max_length=50)
    building: str = Field(..., max_length=100)
    floor: str = Field(..., max_length=20)
    capacity: int = Field(..., gt=0)
    facility_type: FacilityType = FacilityType.LECTURE_HALL
    has_projector: bool = True
    has_ac: bool = True
    has_sound_system: bool = True
    department_id: Optional[uuid.UUID] = None
    is_operational: bool = True
    maintenance_reason: Optional[str] = None
    maintenance_until: Optional[datetime] = None


class FacilityCreate(FacilityBase):
    pass


class FacilityUpdate(BaseModel):
    name: Optional[str] = None
    building: Optional[str] = None
    floor: Optional[str] = None
    capacity: Optional[int] = None
    facility_type: Optional[FacilityType] = None
    has_projector: Optional[bool] = None
    has_ac: Optional[bool] = None
    has_sound_system: Optional[bool] = None
    department_id: Optional[uuid.UUID] = None
    is_operational: Optional[bool] = None
    maintenance_reason: Optional[str] = None
    maintenance_until: Optional[datetime] = None


class FacilityMaintenanceBlock(BaseModel):
    reason: str = Field(..., min_length=3, max_length=255)
    start_time: datetime
    end_time: datetime


class FacilityScheduleSlot(BaseModel):
    id: uuid.UUID
    title: str
    start_time: datetime
    end_time: datetime
    status: str
    is_maintenance: bool = False
    attendee_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class FacilityResponse(FacilityBase):
    id: uuid.UUID
    created_at: datetime
    department: Optional[DepartmentSummary] = None

    model_config = ConfigDict(from_attributes=True)
