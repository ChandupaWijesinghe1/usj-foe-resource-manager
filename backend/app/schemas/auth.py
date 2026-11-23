import re
import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.core.config import settings
from app.models.user import UserRole
from app.schemas.user import UserResponse


def validate_university_email(email: str) -> str:
    """Validates that email belongs to an approved university domain."""
    email_clean = email.strip().lower()
    if not settings.ENFORCE_EMAIL_DOMAIN:
        return email_clean

    domain = email_clean.split("@")[-1]
    if domain not in settings.ALLOWED_EMAIL_DOMAINS:
        allowed = ", ".join([f"@{d}" for d in settings.ALLOWED_EMAIL_DOMAINS])
        raise ValueError(f"Registration is restricted to university emails ({allowed}). Provided domain: @{domain}")
    return email_clean


class StudentRegisterRequest(BaseModel):
    email: EmailStr
    registration_number: str = Field(
        ...,
        min_length=5,
        max_length=50,
        description="University student index number (e.g. EG/2021/4500)",
    )
    full_name: str = Field(..., min_length=2, max_length=255)
    department_id: Optional[uuid.UUID] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=8, description="Minimum 8 characters")

    @field_validator("email")
    def validate_domain(cls, v: str) -> str:
        return validate_university_email(v)

    @field_validator("registration_number")
    def format_reg_number(cls, v: str) -> str:
        v_clean = v.strip().upper()
        if not re.match(r"^[A-Z]{2,4}/\d{4}/\d{3,5}$", v_clean):
            raise ValueError("Registration number format must be like 'EG/2021/4500'")
        return v_clean


# Alias for backward compatibility
RegisterRequest = StudentRegisterRequest


class LecturerRegisterRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    department_id: Optional[uuid.UUID] = None
    phone_number: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=8)

    @field_validator("email")
    def validate_domain(cls, v: str) -> str:
        return validate_university_email(v)


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole
    department_id: Optional[uuid.UUID] = None
    registration_number: Optional[str] = None
    phone_number: Optional[str] = None
    password: str = Field(..., min_length=8)
    is_verified: bool = True
    is_active: bool = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=1)


class LogoutRequest(BaseModel):
    refresh_token: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class VerifyEmailRequest(BaseModel):
    token: str


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class AuthMessageResponse(BaseModel):
    success: bool = True
    message: str
    token: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
