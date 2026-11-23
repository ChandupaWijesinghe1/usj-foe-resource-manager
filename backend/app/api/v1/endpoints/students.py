from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.exceptions import NotFoundException
from app.models.user import User, UserRole
from app.schemas.user import UserResponse
from app.services.user_service import UserService

router = APIRouter()


@router.get("", response_model=List[UserResponse])
async def list_students(
    department_id: Optional[uuid.UUID] = None,
    search: Optional[str] = Query(None, description="Search by name, email, or registration number"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[User]:
    """Lists enrolled engineering students."""
    return await UserService.list_students(
        db=db,
        department_id=department_id,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.get("/{student_id}", response_model=UserResponse)
async def get_student_by_id(
    student_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Retrieves student details by user ID."""
    query = select(User).where(User.id == student_id, User.role == UserRole.STUDENT)
    student = (await db.execute(query)).scalar_one_or_none()
    if not student:
        raise NotFoundException("Student", str(student_id))
    return student
