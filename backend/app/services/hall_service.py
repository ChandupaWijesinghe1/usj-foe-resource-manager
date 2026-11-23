from datetime import datetime
from typing import List, Optional
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.facility import Facility, FacilityType
from app.schemas.facility import FacilityCreate, FacilityUpdate


class HallService:
    """Business logic service for lecture halls, auditoriums, and seminar facilities."""

    @staticmethod
    async def list_facilities(
        db: AsyncSession,
        facility_type: Optional[FacilityType] = None,
        min_capacity: Optional[int] = None,
        has_projector: Optional[bool] = None,
        has_ac: Optional[bool] = None,
        has_sound_system: Optional[bool] = None,
        department_id: Optional[uuid.UUID] = None,
        include_deactivated: bool = False,
    ) -> List[Facility]:
        query = select(Facility).order_by(Facility.name.asc())

        if not include_deactivated:
            query = query.where(Facility.is_operational == True)

        if facility_type:
            query = query.where(Facility.facility_type == facility_type)
        if min_capacity:
            query = query.where(Facility.capacity >= min_capacity)
        if has_projector is not None:
            query = query.where(Facility.has_projector == has_projector)
        if has_ac is not None:
            query = query.where(Facility.has_ac == has_ac)
        if has_sound_system is not None:
            query = query.where(Facility.has_sound_system == has_sound_system)
        if department_id:
            query = query.where(Facility.department_id == department_id)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_facility_by_id(db: AsyncSession, facility_id: uuid.UUID) -> Facility:
        query = select(Facility).where(Facility.id == facility_id)
        facility = (await db.execute(query)).scalar_one_or_none()
        if not facility:
            raise NotFoundException("Facility", str(facility_id))
        return facility

    @staticmethod
    async def create_facility(db: AsyncSession, req: FacilityCreate) -> Facility:
        # Check code uniqueness
        existing = await db.execute(select(Facility).where(Facility.code == req.code.strip().upper()))
        if existing.scalar_one_or_none():
            raise ConflictException(f"Facility code '{req.code}' is already registered.")

        data = req.model_dump()
        data["code"] = req.code.strip().upper()
        facility = Facility(**data)
        db.add(facility)
        await db.commit()
        await db.refresh(facility)
        return facility

    @staticmethod
    async def update_facility(db: AsyncSession, facility_id: uuid.UUID, req: FacilityUpdate) -> Facility:
        facility = await HallService.get_facility_by_id(db, facility_id)
        update_data = req.model_dump(exclude_unset=True)
        for field, val in update_data.items():
            setattr(facility, field, val)

        await db.commit()
        await db.refresh(facility)
        return facility

    @staticmethod
    async def set_operational_status(
        db: AsyncSession,
        facility_id: uuid.UUID,
        is_operational: bool,
        maintenance_reason: Optional[str] = None,
        maintenance_until: Optional[datetime] = None,
    ) -> Facility:
        facility = await HallService.get_facility_by_id(db, facility_id)
        facility.is_operational = is_operational
        facility.maintenance_reason = maintenance_reason
        facility.maintenance_until = maintenance_until

        await db.commit()
        await db.refresh(facility)
        return facility
