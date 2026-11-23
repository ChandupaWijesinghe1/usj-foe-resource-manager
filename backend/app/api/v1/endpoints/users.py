from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.department import Department
from app.models.user import User
from app.schemas.user import DepartmentSummary, UserResponse, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.get("/departments", response_model=List[DepartmentSummary])
async def list_departments(
    db: AsyncSession = Depends(get_db),
) -> List[Department]:
    """Retrieves all engineering departments."""
    return await UserService.list_departments(db)


@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    req: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Updates profile contact details for the authenticated user."""
    return await UserService.update_profile(db, current_user, req)
