import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.lab_service import ServiceType
from app.models.service_request import MaterialType, ServiceStatus
from app.schemas.equipment import LaboratoryResponse
from app.schemas.user import UserResponse


class LabServiceBase(BaseModel):
    lab_id: uuid.UUID
    service_name: str = Field(..., min_length=2, max_length=255)
    category: str = Field(default="General", max_length=100)
    service_type: ServiceType = ServiceType.OTHER
    description: str = Field(..., min_length=5)
    image_url: Optional[str] = None
    turnaround_time_days: int = Field(default=3, ge=1)
    cost_per_unit: float = Field(default=0.00, ge=0.0)
    unit_name: str = Field(default="job", max_length=50)
    total_quantity: Optional[int] = Field(None, ge=0)
    available_quantity: Optional[int] = Field(None, ge=0)
    is_available: bool = True
    usage_instructions: Optional[str] = None
    borrowing_conditions: Optional[str] = None
    is_active: bool = True


class LabServiceCreate(LabServiceBase):
    pass


class LabServiceUpdate(BaseModel):
    lab_id: Optional[uuid.UUID] = None
    service_name: Optional[str] = Field(None, min_length=2, max_length=255)
    category: Optional[str] = Field(None, max_length=100)
    service_type: Optional[ServiceType] = None
    description: Optional[str] = Field(None, min_length=5)
    image_url: Optional[str] = None
    turnaround_time_days: Optional[int] = Field(None, ge=1)
    cost_per_unit: Optional[float] = Field(None, ge=0.0)
    unit_name: Optional[str] = Field(None, max_length=50)
    total_quantity: Optional[int] = Field(None, ge=0)
    available_quantity: Optional[int] = Field(None, ge=0)
    is_available: Optional[bool] = None
    usage_instructions: Optional[str] = None
    borrowing_conditions: Optional[str] = None
    is_active: Optional[bool] = None


class LabServiceResponse(LabServiceBase):
    id: uuid.UUID
    created_at: datetime
    laboratory: Optional[LaboratoryResponse] = None

    model_config = ConfigDict(from_attributes=True)


# 3D Print Specs
class Print3DDetailsBase(BaseModel):
    material_type: MaterialType = MaterialType.PLA
    color: str = Field(default="Black", max_length=50)
    infill_percentage: int = Field(default=20, ge=10, le=100)


class Print3DDetailsResponse(Print3DDetailsBase):
    id: uuid.UUID
    file_url: str
    original_filename: str
    file_size_bytes: int
    estimated_filament_grams: Optional[float] = None
    estimated_print_hours: Optional[float] = None
    calculated_cost_lkr: Optional[float] = None
    slicing_notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ServiceRequestCreate(BaseModel):
    service_id: uuid.UUID
    project_title: str = Field(..., min_length=3, max_length=255)
    supervisor_name: Optional[str] = None
    description: str = Field(..., min_length=5)
    requested_quantity: int = Field(default=1, ge=1)
    dimensions: Optional[str] = None
    preferred_date: Optional[datetime] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None


class ServiceEstimateUpdate(BaseModel):
    estimated_filament_grams: float = Field(..., gt=0)
    estimated_print_hours: float = Field(..., gt=0)
    calculated_cost_lkr: float = Field(..., ge=0)
    slicing_notes: Optional[str] = None


class ServiceStatusUpdate(BaseModel):
    status: ServiceStatus
    scheduled_date: Optional[datetime] = None
    estimated_completion_date: Optional[datetime] = None
    recorded_charges_lkr: Optional[float] = Field(None, ge=0.0)
    rejection_reason: Optional[str] = None
    admin_notes: Optional[str] = None


class ServiceRequestResponse(BaseModel):
    id: uuid.UUID
    service_id: uuid.UUID
    requester_id: uuid.UUID
    project_title: str
    supervisor_name: Optional[str] = None
    description: str
    requested_quantity: int = 1
    dimensions: Optional[str] = None
    preferred_date: Optional[datetime] = None
    scheduled_date: Optional[datetime] = None
    estimated_completion_date: Optional[datetime] = None
    recorded_charges_lkr: Optional[float] = None
    rejection_reason: Optional[str] = None
    attachment_url: Optional[str] = None
    attachment_name: Optional[str] = None
    status: ServiceStatus
    admin_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    service: Optional[LabServiceResponse] = None
    requester: Optional[UserResponse] = None
    print_3d_detail: Optional[Print3DDetailsResponse] = None

    model_config = ConfigDict(from_attributes=True)
