import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

from app.models.equipment import EquipmentCondition
from app.models.equipment_borrow import BorrowStatus
from app.schemas.user import DepartmentSummary, UserResponse


# Laboratory Schemas
class LaboratoryBase(BaseModel):
    name: str = Field(..., max_length=255)
    code: str = Field(..., max_length=50)
    department_id: uuid.UUID
    admin_in_charge_id: Optional[uuid.UUID] = None
    location: str = Field(..., max_length=150)
    description: Optional[str] = None
    operating_hours: str = Field(default="8:00 AM - 4:30 PM", max_length=100)
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    safety_guidelines: Optional[str] = None
    image_url: Optional[str] = None
    is_active: bool = True


class LaboratoryCreate(LaboratoryBase):
    pass


class LaboratoryUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    department_id: Optional[uuid.UUID] = None
    admin_in_charge_id: Optional[uuid.UUID] = None
    location: Optional[str] = None
    description: Optional[str] = None
    operating_hours: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    safety_guidelines: Optional[str] = None
    image_url: Optional[str] = None
    is_active: Optional[bool] = None


class LaboratoryResponse(LaboratoryBase):
    id: uuid.UUID
    created_at: datetime
    department: Optional[DepartmentSummary] = None
    admin_in_charge: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)


# Equipment Schemas
class EquipmentBase(BaseModel):
    lab_id: uuid.UUID
    name: str = Field(..., max_length=255)
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    category: str = Field(..., max_length=100)
    total_quantity: int = Field(default=1, ge=1)
    available_quantity: int = Field(default=1, ge=0)
    is_borrowable: bool = True
    requires_admin_approval: bool = True
    condition_status: EquipmentCondition = EquipmentCondition.GOOD


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: Optional[str] = None
    model_number: Optional[str] = None
    serial_number: Optional[str] = None
    category: Optional[str] = None
    total_quantity: Optional[int] = None
    available_quantity: Optional[int] = None
    is_borrowable: Optional[bool] = None
    requires_admin_approval: Optional[bool] = None
    condition_status: Optional[EquipmentCondition] = None


class EquipmentResponse(EquipmentBase):
    id: uuid.UUID
    created_at: datetime
    laboratory: Optional[LaboratoryResponse] = None

    model_config = ConfigDict(from_attributes=True)


# Equipment Borrowing Schemas
class EquipmentBorrowCreate(BaseModel):
    equipment_id: uuid.UUID
    quantity: int = Field(default=1, ge=1)
    purpose: str = Field(..., min_length=5)
    expected_borrow_date: datetime
    expected_return_date: datetime


class EquipmentBorrowStatusUpdate(BaseModel):
    status: BorrowStatus
    collection_instructions: Optional[str] = None
    rejection_reason: Optional[str] = None
    condition_on_return: Optional[str] = None
    is_damaged_or_missing: Optional[bool] = None
    damage_notes: Optional[str] = None
    admin_notes: Optional[str] = None


class EquipmentBorrowReturnConfirm(BaseModel):
    notes: Optional[str] = None


class EquipmentBorrowResponse(BaseModel):
    id: uuid.UUID
    equipment_id: uuid.UUID
    borrower_id: uuid.UUID
    quantity: int
    purpose: str
    expected_borrow_date: datetime
    expected_return_date: datetime
    actual_return_date: Optional[datetime] = None
    status: BorrowStatus
    collection_instructions: Optional[str] = None
    rejection_reason: Optional[str] = None
    is_damaged_or_missing: bool = False
    damage_notes: Optional[str] = None
    student_confirmed_return: bool = False
    condition_on_return: Optional[str] = None
    admin_notes: Optional[str] = None
    created_at: datetime
    equipment: Optional[EquipmentResponse] = None
    borrower: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
