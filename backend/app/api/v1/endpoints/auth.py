import uuid
from fastapi import APIRouter, Body, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_super_admin
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.schemas.auth import (
    AdminCreateUserRequest,
    AuthMessageResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LecturerRegisterRequest,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    StudentRegisterRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.user import UserResponse
from app.services.auth_service import AuthService

router = APIRouter()


# --- Student & Lecturer Public Onboarding ---

@router.post(
    "/register/student",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60, key_prefix="reg_student"))],
)
async def register_student(
    req: StudentRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthMessageResponse:
    """Self-registration for students with university email and registration index validation."""
    return await AuthService.register_student(db, req)


@router.post(
    "/register/lecturer",
    response_model=AuthMessageResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60, key_prefix="reg_lecturer"))],
)
async def register_lecturer(
    req: LecturerRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthMessageResponse:
    """Registration request for academic staff (held pending Super Admin verification)."""
    return await AuthService.register_lecturer(db, req)


@router.post("/verify-email", response_model=AuthMessageResponse)
async def verify_email(
    req: VerifyEmailRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthMessageResponse:
    """Activates account upon verifying university email address with verification token."""
    return await AuthService.verify_email(db, req)


@router.post(
    "/resend-verification",
    response_model=AuthMessageResponse,
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60, key_prefix="resend_verif"))],
)
async def resend_verification_token(
    req: ResendVerificationRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthMessageResponse:
    """Reissues an email verification token if not yet verified."""
    return await AuthService.resend_verification(db, req.email)


# --- Core Session & Token Endpoints ---

@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(max_requests=10, window_seconds=60, key_prefix="login"))],
)
async def login(
    req: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticates credentials and returns JWT access and refresh tokens."""
    return await AuthService.login(db, req)


@router.post("/logout", response_model=AuthMessageResponse)
async def logout(
    req: LogoutRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthMessageResponse:
    """Revokes active refresh token to securely terminate session."""
    return await AuthService.logout(db, req)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    req: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Rotates refresh token and issues a new access token pair."""
    return await AuthService.rotate_refresh_token(db, req)


# --- Password Recovery & Profile Management ---

@router.post(
    "/forgot-password",
    response_model=AuthMessageResponse,
    dependencies=[Depends(rate_limit(max_requests=5, window_seconds=60, key_prefix="forgot_pw"))],
)
async def forgot_password(
    req: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthMessageResponse:
    """Initiates password reset procedure."""
    return await AuthService.forgot_password(db, req)


@router.post("/reset-password", response_model=AuthMessageResponse)
async def reset_password(
    req: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthMessageResponse:
    """Sets a new password using a verified password reset token."""
    return await AuthService.reset_password(db, req)


@router.patch("/change-password", response_model=AuthMessageResponse)
async def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AuthMessageResponse:
    """Allows authenticated user to update their password."""
    return await AuthService.change_password(db, current_user, req)


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Returns profile information and permissions for the currently authenticated user."""
    return UserResponse.model_validate(current_user)


# --- Super Admin Account Governance ---

@router.post("/admin/create-user", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def admin_create_user(
    req: AdminCreateUserRequest,
    current_admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Super Admin: Provisions new administrator, lecturer, or staff accounts."""
    return await AuthService.admin_create_user(db, current_admin, req)


@router.patch("/admin/users/{user_id}/verify-lecturer", response_model=UserResponse)
async def admin_verify_lecturer(
    user_id: uuid.UUID,
    current_admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Super Admin: Approves and verifies a pending lecturer account."""
    return await AuthService.admin_verify_lecturer(db, current_admin, user_id)


@router.patch("/admin/users/{user_id}/status", response_model=UserResponse)
async def admin_set_user_status(
    user_id: uuid.UUID,
    is_active: bool = Query(..., description="Set active (true) or deactivated (false)"),
    current_admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Super Admin: Activates or deactivates a user account."""
    return await AuthService.admin_set_user_status(db, current_admin, user_id, is_active)
