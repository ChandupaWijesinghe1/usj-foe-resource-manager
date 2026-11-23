from datetime import datetime, timezone
from typing import Optional
import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_email_verification_token,
    create_password_reset_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.department import Department
from app.models.notification import NotificationType
from app.models.user import RefreshToken, User, UserRole
from app.schemas.auth import (
    AdminCreateUserRequest,
    AuthMessageResponse,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LecturerRegisterRequest,
    LoginRequest,
    LogoutRequest,
    RefreshTokenRequest,
    ResetPasswordRequest,
    StudentRegisterRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.user import UserResponse
from app.services.notification_service import create_notification


class AuthService:
    """Enterprise authentication & role governance service."""

    @staticmethod
    async def register_student(db: AsyncSession, req: StudentRegisterRequest) -> AuthMessageResponse:
        email_clean = req.email.strip().lower()
        reg_clean = req.registration_number.strip().upper()

        # Check existing email
        existing_email = await db.execute(select(User).where(User.email == email_clean))
        if existing_email.scalar_one_or_none():
            raise ConflictException(f"An account with email '{email_clean}' already exists.")

        # Check existing registration number
        existing_reg = await db.execute(select(User).where(User.registration_number == reg_clean))
        if existing_reg.scalar_one_or_none():
            raise ConflictException(f"Registration number '{reg_clean}' is already registered.")

        # Check department if provided
        if req.department_id:
            dept = (await db.execute(select(Department).where(Department.id == req.department_id))).scalar_one_or_none()
            if not dept:
                raise NotFoundException("Department", str(req.department_id))

        student = User(
            email=email_clean,
            hashed_password=get_password_hash(req.password),
            full_name=req.full_name.strip(),
            registration_number=reg_clean,
            role=UserRole.STUDENT,
            department_id=req.department_id,
            phone_number=req.phone_number.strip() if req.phone_number else None,
            is_active=True,
            is_verified=False,  # Requires email verification
        )
        db.add(student)
        await db.commit()
        await db.refresh(student)

        # Generate verification token
        verify_token = create_email_verification_token(subject=student.id, email=student.email)

        # Log notification
        await create_notification(
            db=db,
            user_id=student.id,
            title="Verify Your University Email",
            message="Please verify your university email address to activate all system services.",
            notification_type=NotificationType.SYSTEM,
            reference_id=student.id,
        )

        return AuthMessageResponse(
            success=True,
            message="Student account created successfully. Please verify your university email before logging in.",
            token=verify_token,  # Provided for verification flow
        )

    @staticmethod
    async def register_lecturer(db: AsyncSession, req: LecturerRegisterRequest) -> AuthMessageResponse:
        email_clean = req.email.strip().lower()

        # Check existing email
        existing_email = await db.execute(select(User).where(User.email == email_clean))
        if existing_email.scalar_one_or_none():
            raise ConflictException(f"An account with email '{email_clean}' already exists.")

        if req.department_id:
            dept = (await db.execute(select(Department).where(Department.id == req.department_id))).scalar_one_or_none()
            if not dept:
                raise NotFoundException("Department", str(req.department_id))

        lecturer = User(
            email=email_clean,
            hashed_password=get_password_hash(req.password),
            full_name=req.full_name.strip(),
            role=UserRole.LECTURER,
            department_id=req.department_id,
            phone_number=req.phone_number.strip() if req.phone_number else None,
            is_active=True,
            is_verified=False,  # Requires Super Admin approval
        )
        db.add(lecturer)
        await db.commit()
        await db.refresh(lecturer)

        return AuthMessageResponse(
            success=True,
            message="Lecturer registration submitted. Account is pending verification by Super Admin.",
        )

    @staticmethod
    async def verify_email(db: AsyncSession, req: VerifyEmailRequest) -> AuthMessageResponse:
        try:
            payload = decode_token(req.token)
            if payload.get("type") != "email_verification":
                raise BadRequestException("Invalid token type. Expected email verification token.")
            user_id = uuid.UUID(payload.get("sub"))
        except Exception as e:
            raise BadRequestException(f"Verification token is invalid or has expired: {str(e)}")

        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user:
            raise NotFoundException("User")

        if user.is_verified:
            return AuthMessageResponse(
                success=True,
                message="Account email is already verified. You may proceed to log in.",
            )

        user.is_verified = True
        user.verified_at = datetime.now(timezone.utc)
        await db.commit()

        return AuthMessageResponse(
            success=True,
            message="Email successfully verified! Your account is now active.",
        )

    @staticmethod
    async def resend_verification(db: AsyncSession, email: str) -> AuthMessageResponse:
        email_clean = email.strip().lower()
        user = (await db.execute(select(User).where(User.email == email_clean))).scalar_one_or_none()
        if not user:
            # Do not reveal email existence to prevent user enumeration
            return AuthMessageResponse(
                success=True,
                message="If an unverified account exists for this email, a new verification link has been issued.",
            )

        if user.is_verified:
            raise ConflictException("This account has already been verified.")

        token = create_email_verification_token(subject=user.id, email=user.email)
        return AuthMessageResponse(
            success=True,
            message="Verification token generated successfully.",
            token=token,
        )

    @staticmethod
    async def login(db: AsyncSession, req: LoginRequest) -> TokenResponse:
        email_clean = req.email.strip().lower()
        query = select(User).where(User.email == email_clean)
        user = (await db.execute(query)).scalar_one_or_none()

        if not user or not verify_password(req.password, user.hashed_password):
            raise UnauthorizedException("Incorrect email or password.")

        if not user.is_active:
            raise UnauthorizedException("Your account is deactivated. Please contact the administrator.")

        if not user.is_verified:
            if user.role == UserRole.LECTURER:
                raise UnauthorizedException(
                    "Your lecturer account is pending administrative verification by the Super Admin."
                )
            raise UnauthorizedException(
                "Your email address has not been verified. Please check your email for the verification link."
            )

        # Generate tokens
        access_token = create_access_token(subject=user.id, role=user.role.value, email=user.email)
        refresh_token_str, jti = create_refresh_token(subject=user.id)

        # Store refresh token record with jti
        rf = RefreshToken(
            user_id=user.id,
            jti=jti,
            token_hash=get_password_hash(refresh_token_str[:25]),
            expires_at=datetime.now(timezone.utc),
            revoked=False,
        )
        db.add(rf)
        await db.commit()

        user_dto = UserResponse.model_validate(user)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token_str,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_dto,
        )

    @staticmethod
    async def logout(db: AsyncSession, req: LogoutRequest) -> AuthMessageResponse:
        try:
            payload = decode_token(req.refresh_token)
            jti = payload.get("jti")
            if jti:
                await db.execute(
                    update(RefreshToken).where(RefreshToken.jti == jti).values(revoked=True)
                )
                await db.commit()
        except Exception:
            pass  # Fail gracefully on invalid token logout

        return AuthMessageResponse(success=True, message="Successfully logged out.")

    @staticmethod
    async def rotate_refresh_token(db: AsyncSession, req: RefreshTokenRequest) -> TokenResponse:
        try:
            payload = decode_token(req.refresh_token)
            if payload.get("type") != "refresh":
                raise UnauthorizedException("Invalid token type. Expected refresh token.")
            jti = payload.get("jti")
            user_id = uuid.UUID(payload.get("sub"))
        except Exception:
            raise UnauthorizedException("Invalid or expired refresh token.")

        # Check DB for active, unrevoked refresh token
        rf_query = select(RefreshToken).where(RefreshToken.jti == jti, RefreshToken.revoked == False)
        rf_record = (await db.execute(rf_query)).scalar_one_or_none()
        if not rf_record:
            raise UnauthorizedException("Refresh token is invalid or has already been revoked.")

        # Revoke the used refresh token (One-time usage / rotation)
        rf_record.revoked = True

        # Fetch active user
        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user or not user.is_active or not user.is_verified:
            raise UnauthorizedException("User account is inactive or no longer valid.")

        # Issue new token pair
        new_access_token = create_access_token(subject=user.id, role=user.role.value, email=user.email)
        new_refresh_token_str, new_jti = create_refresh_token(subject=user.id)

        new_rf = RefreshToken(
            user_id=user.id,
            jti=new_jti,
            token_hash=get_password_hash(new_refresh_token_str[:25]),
            expires_at=datetime.now(timezone.utc),
            revoked=False,
        )
        db.add(new_rf)
        await db.commit()

        user_dto = UserResponse.model_validate(user)
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token_str,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_dto,
        )

    @staticmethod
    async def forgot_password(db: AsyncSession, req: ForgotPasswordRequest) -> AuthMessageResponse:
        email_clean = req.email.strip().lower()
        user = (await db.execute(select(User).where(User.email == email_clean))).scalar_one_or_none()

        token = None
        if user and user.is_active:
            token = create_password_reset_token(subject=user.id, email=user.email)

        return AuthMessageResponse(
            success=True,
            message="If an active account exists for this email, password reset instructions have been issued.",
            token=token,
        )

    @staticmethod
    async def reset_password(db: AsyncSession, req: ResetPasswordRequest) -> AuthMessageResponse:
        try:
            payload = decode_token(req.token)
            if payload.get("type") != "password_reset":
                raise BadRequestException("Invalid token type. Expected password reset token.")
            user_id = uuid.UUID(payload.get("sub"))
        except Exception as e:
            raise BadRequestException(f"Password reset token is invalid or expired: {str(e)}")

        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user:
            raise NotFoundException("User")

        user.hashed_password = get_password_hash(req.new_password)

        # Invalidate all existing refresh tokens for security
        await db.execute(
            update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked=True)
        )
        await db.commit()

        return AuthMessageResponse(
            success=True,
            message="Password has been successfully reset. You may now log in with your new credentials.",
        )

    @staticmethod
    async def change_password(
        db: AsyncSession, current_user: User, req: ChangePasswordRequest
    ) -> AuthMessageResponse:
        if not verify_password(req.current_password, current_user.hashed_password):
            raise UnauthorizedException("Current password does not match.")

        current_user.hashed_password = get_password_hash(req.new_password)

        # Revoke other active sessions
        await db.execute(
            update(RefreshToken).where(RefreshToken.user_id == current_user.id).values(revoked=True)
        )
        await db.commit()

        return AuthMessageResponse(
            success=True,
            message="Password updated successfully. Other active sessions have been logged out.",
        )

    @staticmethod
    async def admin_create_user(
        db: AsyncSession, current_admin: User, req: AdminCreateUserRequest
    ) -> UserResponse:
        """Only Super Admin can provision administrative or pre-verified faculty accounts."""
        email_clean = req.email.strip().lower()

        existing = await db.execute(select(User).where(User.email == email_clean))
        if existing.scalar_one_or_none():
            raise ConflictException(f"Email '{email_clean}' is already registered.")

        if req.registration_number:
            reg_clean = req.registration_number.strip().upper()
            existing_reg = await db.execute(select(User).where(User.registration_number == reg_clean))
            if existing_reg.scalar_one_or_none():
                raise ConflictException(f"Registration number '{reg_clean}' already exists.")

        user = User(
            email=email_clean,
            hashed_password=get_password_hash(req.password),
            full_name=req.full_name.strip(),
            role=req.role,
            department_id=req.department_id,
            registration_number=req.registration_number.strip().upper() if req.registration_number else None,
            phone_number=req.phone_number.strip() if req.phone_number else None,
            is_active=req.is_active,
            is_verified=req.is_verified,
            verified_by=current_admin.id if req.is_verified else None,
            verified_at=datetime.now(timezone.utc) if req.is_verified else None,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

        return UserResponse.model_validate(user)

    @staticmethod
    async def admin_verify_lecturer(
        db: AsyncSession, current_admin: User, lecturer_id: uuid.UUID
    ) -> UserResponse:
        """Super Admin: Verifies a pending lecturer registration."""
        lecturer = (await db.execute(select(User).where(User.id == lecturer_id))).scalar_one_or_none()
        if not lecturer:
            raise NotFoundException("Lecturer", str(lecturer_id))

        if lecturer.role != UserRole.LECTURER:
            raise BadRequestException("User account is not a lecturer role.")

        lecturer.is_verified = True
        lecturer.verified_by = current_admin.id
        lecturer.verified_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(lecturer)

        await create_notification(
            db=db,
            user_id=lecturer.id,
            title="Lecturer Account Verified",
            message=f"Your academic account has been verified and approved by Super Admin {current_admin.full_name}.",
            notification_type=NotificationType.SYSTEM,
            reference_id=lecturer.id,
        )

        return UserResponse.model_validate(lecturer)

    @staticmethod
    async def admin_set_user_status(
        db: AsyncSession, current_admin: User, user_id: uuid.UUID, is_active: bool
    ) -> UserResponse:
        """Super Admin: Activates or deactivates an account."""
        if current_admin.id == user_id and not is_active:
            raise ForbiddenException("Super Admins cannot deactivate their own account.")

        user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
        if not user:
            raise NotFoundException("User", str(user_id))

        user.is_active = is_active
        if not is_active:
            # Revoke all tokens for deactivated user
            await db.execute(
                update(RefreshToken).where(RefreshToken.user_id == user.id).values(revoked=True)
            )

        await db.commit()
        await db.refresh(user)
        return UserResponse.model_validate(user)
