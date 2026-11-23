from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole


class CreateAdminAccountRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = Field(..., description="Target administrative role")
    department_id: Optional[uuid.UUID] = None


class LecturerVerificationRequest(BaseModel):
    is_verified: bool
    rejection_reason: Optional[str] = None


class SystemActivityItem(BaseModel):
    id: str
    activity_type: str  # BOOKING, BORROW, SERVICE, USER_REGISTRATION
    title: str
    description: str
    actor_name: Optional[str] = None
    status: str
    timestamp: datetime


class OverdueEquipmentItem(BaseModel):
    borrow_id: uuid.UUID
    equipment_name: str
    borrower_name: str
    borrower_email: str
    quantity: int = 1
    expected_return_date: datetime
    days_overdue: int


class ReturnRemindersResponse(BaseModel):
    reminders_sent: int
    overdue_count: int
    upcoming_count: int
    message: str
