from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.department import Department
from app.models.user import User, UserRole
from app.schemas.user import UserUpdate


class UserService:
    """Business logic service for user profile and departmental directories."""

    @staticmethod
    async def update_profile(db: AsyncSession, user: User, req: UserUpdate) -> User:
        if req.full_name is not None:
            user.full_name = req.full_name.strip()
        if req.phone_number is not None:
            user.phone_number = req.phone_number.strip()
        if req.department_id is not None:
            # Check department existence
            dept = (await db.execute(select(Department).where(Department.id == req.department_id))).scalar_one_or_none()
            if not dept:
                raise NotFoundException("Department", str(req.department_id))
            user.department_id = req.department_id

        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def list_departments(db: AsyncSession) -> List[Department]:
        query = select(Department).order_by(Department.name.asc())
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def list_students(
        db: AsyncSession,
        department_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[User]:
        query = select(User).where(User.role == UserRole.STUDENT, User.is_active == True)
        if department_id:
            query = query.where(User.department_id == department_id)
        if search:
            search_fmt = f"%{search.lower()}%"
            query = query.where(
                (User.full_name.ilike(search_fmt))
                | (User.email.ilike(search_fmt))
                | (User.registration_number.ilike(search_fmt))
            )
        query = query.offset(skip).limit(limit).order_by(User.full_name.asc())
        result = await db.execute(query)
        return list(result.scalars().all())
