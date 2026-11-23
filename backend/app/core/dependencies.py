from typing import Callable, List, Optional
import uuid
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token
from app.models.user import User, UserRole

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user(
    auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extracts and validates JWT Bearer token, returning the authenticated active user."""
    if not auth or not auth.credentials:
        raise UnauthorizedException("Authentication token was not provided")

    try:
        payload = decode_token(auth.credentials)
        if payload.get("type") != "access":
            raise UnauthorizedException("Invalid token type. Expected access token.")
        user_id_str = payload.get("sub")
        if not user_id_str:
            raise UnauthorizedException("Malformed token: missing subject identifier.")
        user_id = uuid.UUID(user_id_str)
    except Exception as e:
        raise UnauthorizedException(f"Invalid or expired token: {str(e)}")

    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise UnauthorizedException("User account belonging to this token no longer exists.")
    if not user.is_active:
        raise ForbiddenException("User account is deactivated. Please contact administration.")
    if not user.is_verified:
        raise ForbiddenException("User email has not been verified. Please verify your email before proceeding.")

    return user


def require_roles(allowed_roles: List[UserRole]) -> Callable:
    """Dependency factory ensuring current user possesses at least one authorized role."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        # Super Admin has global override permission across all resources
        if current_user.role == UserRole.SUPER_ADMIN:
            return current_user
        if current_user.role not in allowed_roles:
            raise ForbiddenException(
                f"Role '{current_user.role.value}' does not have sufficient permission for this resource."
            )
        return current_user

    return role_checker


# Named role guards
require_super_admin = require_roles([UserRole.SUPER_ADMIN])
require_facility_admin = require_roles([UserRole.SUPER_ADMIN, UserRole.FACILITY_ADMIN])
require_hall_admin = require_facility_admin  # Backward-compatible alias
require_lab_admin = require_roles([UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN])
require_lecturer = require_roles([UserRole.SUPER_ADMIN, UserRole.LECTURER])
require_any_admin = require_roles([UserRole.SUPER_ADMIN, UserRole.FACILITY_ADMIN, UserRole.LAB_ADMIN])
