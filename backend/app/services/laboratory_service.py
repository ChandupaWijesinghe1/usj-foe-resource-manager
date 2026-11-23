from typing import List, Optional
import uuid
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.laboratory import Laboratory
from app.schemas.equipment import LaboratoryCreate, LaboratoryUpdate


class LaboratoryService:
    """Business logic service for engineering laboratories."""

    @staticmethod
    async def list_laboratories(
        db: AsyncSession,
        department_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
    ) -> List[Laboratory]:
        query = (
            select(Laboratory)
            .where(Laboratory.is_active == True)
            .order_by(Laboratory.name.asc())
        )
        if department_id:
            query = query.where(Laboratory.department_id == department_id)
        if search:
            search_pat = f"%{search.strip()}%"
            query = query.where(
                or_(
                    Laboratory.name.ilike(search_pat),
                    Laboratory.code.ilike(search_pat),
                    Laboratory.location.ilike(search_pat),
                )
            )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_laboratory_by_id(db: AsyncSession, lab_id: uuid.UUID) -> Laboratory:
        query = select(Laboratory).where(Laboratory.id == lab_id)
        lab = (await db.execute(query)).scalar_one_or_none()
        if not lab:
            raise NotFoundException("Laboratory", str(lab_id))
        return lab

    @staticmethod
    async def create_laboratory(db: AsyncSession, req: LaboratoryCreate) -> Laboratory:
        existing = await db.execute(
            select(Laboratory).where(Laboratory.code == req.code.strip().upper())
        )
        if existing.scalar_one_or_none():
            raise ConflictException(f"Lab code '{req.code}' already exists.")

        data = req.model_dump()
        data["code"] = req.code.strip().upper()
        lab = Laboratory(**data)
        db.add(lab)
        await db.commit()
        await db.refresh(lab)
        return lab

    @staticmethod
    async def update_laboratory(
        db: AsyncSession, lab_id: uuid.UUID, req: LaboratoryUpdate
    ) -> Laboratory:
        lab = await LaboratoryService.get_laboratory_by_id(db, lab_id)

        update_data = req.model_dump(exclude_unset=True)
        if "code" in update_data and update_data["code"]:
            new_code = update_data["code"].strip().upper()
            if new_code != lab.code:
                existing = await db.execute(
                    select(Laboratory).where(Laboratory.code == new_code, Laboratory.id != lab_id)
                )
                if existing.scalar_one_or_none():
                    raise ConflictException(f"Lab code '{new_code}' already exists.")
                update_data["code"] = new_code

        for key, val in update_data.items():
            setattr(lab, key, val)

        await db.commit()
        await db.refresh(lab)
        return lab

    @staticmethod
    async def delete_laboratory(db: AsyncSession, lab_id: uuid.UUID) -> None:
        lab = await LaboratoryService.get_laboratory_by_id(db, lab_id)
        lab.is_active = False
        await db.commit()
