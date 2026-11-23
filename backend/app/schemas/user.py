import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.user import UserRole


class DepartmentSummary(BaseModel):
    id: uuid.UUID
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    registration_number: Optional[str] = None
    role: UserRole
    department_id: Optional[uuid.UUID] = None
    department: Optional[DepartmentSummary] = None
    phone_number: Optional[str] = None
    is_active: bool
    is_verified: bool
    verified_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone_number: Optional[str] = None
    department_id: Optional[uuid.UUID] = None


class UserRoleUpdate(BaseModel):
    role: UserRole
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
