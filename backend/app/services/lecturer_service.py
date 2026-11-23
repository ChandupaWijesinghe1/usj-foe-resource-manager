from datetime import date, datetime, time, timedelta
from typing import List, Optional
import uuid
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.lecturer_availability import LecturerAvailability
from app.models.lecturer_meeting import LecturerMeeting, MeetingStatus
from app.models.user import User, UserRole
from app.schemas.lecturer_meeting import (
    LecturerAvailabilityCreate,
    LecturerAvailabilityUpdate,
    LecturerDiscreteSlot,
)


class LecturerService:
    """Business logic service for lecturer directories and consultation schedules."""

    @staticmethod
    async def list_lecturers(
        db: AsyncSession,
        department_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
    ) -> List[User]:
        query = (
            select(User)
            .where(
                User.role.in_([UserRole.LECTURER, UserRole.SUPER_ADMIN]),
                User.is_active == True,
            )
            .order_by(User.full_name.asc())
        )
        if department_id:
            query = query.where(User.department_id == department_id)
        if search:
            search_pattern = f"%{search.strip()}%"
            query = query.where(
                or_(
                    User.full_name.ilike(search_pattern),
                    User.email.ilike(search_pattern),
                )
            )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_lecturer_by_id(db: AsyncSession, lecturer_id: uuid.UUID) -> User:
        query = select(User).where(
            User.id == lecturer_id, User.role.in_([UserRole.LECTURER, UserRole.SUPER_ADMIN])
        )
        lecturer = (await db.execute(query)).scalar_one_or_none()
        if not lecturer:
            raise NotFoundException("Lecturer", str(lecturer_id))
        return lecturer

    @staticmethod
    async def get_availability_slots(
        db: AsyncSession, lecturer_id: uuid.UUID, include_inactive: bool = False
    ) -> List[LecturerAvailability]:
        query = (
            select(LecturerAvailability)
            .where(LecturerAvailability.lecturer_id == lecturer_id)
            .order_by(LecturerAvailability.day_of_week.asc(), LecturerAvailability.start_time.asc())
        )
        if not include_inactive:
            query = query.where(LecturerAvailability.is_active == True)

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def create_availability_slot(
        db: AsyncSession, lecturer_id: uuid.UUID, req: LecturerAvailabilityCreate
    ) -> LecturerAvailability:
        if req.end_time <= req.start_time:
            raise BadRequestException("Slot end time must be strictly after start time.")

        # Determine effective day_of_week
        if req.specific_date:
            day_of_week = req.specific_date.weekday()
        elif req.day_of_week is not None:
            day_of_week = req.day_of_week
        else:
            raise BadRequestException("Either specific_date or day_of_week must be provided.")

        # Overlap check for this lecturer's active slots
        overlap_query = select(LecturerAvailability).where(
            LecturerAvailability.lecturer_id == lecturer_id,
            LecturerAvailability.is_active == True,
            LecturerAvailability.day_of_week == day_of_week,
            or_(
                # Both recurring
                (LecturerAvailability.specific_date.is_(None) & (req.specific_date is None)),
                # Both for same specific date
                (LecturerAvailability.specific_date == req.specific_date),
            ),
            # Time overlap
            LecturerAvailability.start_time < req.end_time,
            LecturerAvailability.end_time > req.start_time,
        )
        conflicting = (await db.execute(overlap_query)).first()
        if conflicting:
            raise BadRequestException(
                "An overlapping availability slot already exists for this lecturer on the selected day/time."
            )

        slot = LecturerAvailability(
            lecturer_id=lecturer_id,
            specific_date=req.specific_date,
            day_of_week=day_of_week,
            start_time=req.start_time,
            end_time=req.end_time,
            slot_duration_minutes=req.slot_duration_minutes,
            max_students_per_slot=req.max_students_per_slot,
            location_type=req.location_type,
            room_or_link=req.room_or_link.strip(),
            is_active=req.is_active,
        )
        db.add(slot)
        await db.commit()
        await db.refresh(slot)
        return slot

    @staticmethod
    async def update_availability_slot(
        db: AsyncSession,
        lecturer_id: uuid.UUID,
        slot_id: uuid.UUID,
        req: LecturerAvailabilityUpdate,
    ) -> LecturerAvailability:
        query = select(LecturerAvailability).where(
            LecturerAvailability.id == slot_id, LecturerAvailability.lecturer_id == lecturer_id
        )
        slot = (await db.execute(query)).scalar_one_or_none()
        if not slot:
            raise NotFoundException("Availability Slot", str(slot_id))

        new_start = req.start_time if req.start_time is not None else slot.start_time
        new_end = req.end_time if req.end_time is not None else slot.end_time

        if new_end <= new_start:
            raise BadRequestException("Slot end time must be strictly after start time.")

        new_specific_date = req.specific_date if req.specific_date is not None else slot.specific_date
        if req.specific_date is not None:
            new_day = req.specific_date.weekday()
        elif req.day_of_week is not None:
            new_day = req.day_of_week
        else:
            new_day = slot.day_of_week

        # Check overlap against other slots of this lecturer
        overlap_query = select(LecturerAvailability).where(
            LecturerAvailability.lecturer_id == lecturer_id,
            LecturerAvailability.id != slot_id,
            LecturerAvailability.is_active == True,
            LecturerAvailability.day_of_week == new_day,
            or_(
                (LecturerAvailability.specific_date.is_(None) & (new_specific_date is None)),
                (LecturerAvailability.specific_date == new_specific_date),
            ),
            LecturerAvailability.start_time < new_end,
            LecturerAvailability.end_time > new_start,
        )
        conflicting = (await db.execute(overlap_query)).first()
        if conflicting:
            raise BadRequestException(
                "An overlapping availability slot already exists for this lecturer on the selected day/time."
            )

        slot.start_time = new_start
        slot.end_time = new_end
        slot.day_of_week = new_day
        slot.specific_date = new_specific_date
        if req.slot_duration_minutes is not None:
            slot.slot_duration_minutes = req.slot_duration_minutes
        if req.max_students_per_slot is not None:
            slot.max_students_per_slot = req.max_students_per_slot
        if req.location_type is not None:
            slot.location_type = req.location_type
        if req.room_or_link is not None:
            slot.room_or_link = req.room_or_link.strip()
        if req.is_active is not None:
            slot.is_active = req.is_active

        await db.commit()
        await db.refresh(slot)
        return slot

    @staticmethod
    async def delete_availability_slot(
        db: AsyncSession, lecturer_id: uuid.UUID, slot_id: uuid.UUID
    ) -> None:
        query = select(LecturerAvailability).where(
            LecturerAvailability.id == slot_id, LecturerAvailability.lecturer_id == lecturer_id
        )
        slot = (await db.execute(query)).scalar_one_or_none()
        if not slot:
            raise NotFoundException("Availability Slot", str(slot_id))
        await db.delete(slot)
        await db.commit()

    @staticmethod
    async def get_available_discrete_slots(
        db: AsyncSession, lecturer_id: uuid.UUID, target_date: date
    ) -> List[LecturerDiscreteSlot]:
        """
        Calculates discrete consultation time slots for a lecturer on a target date,
        factoring in active availability windows and existing student bookings.
        """
        day_of_week = target_date.weekday()

        # Fetch active availability slots matching either target_date specifically or matching weekday
        query = select(LecturerAvailability).where(
            LecturerAvailability.lecturer_id == lecturer_id,
            LecturerAvailability.is_active == True,
            or_(
                LecturerAvailability.specific_date == target_date,
                (LecturerAvailability.specific_date.is_(None) & (LecturerAvailability.day_of_week == day_of_week)),
            ),
        ).order_by(LecturerAvailability.start_time.asc())

        availability_slots = list((await db.execute(query)).scalars().all())
        if not availability_slots:
            return []

        # Fetch active/pending bookings on that target date
        meetings_query = select(LecturerMeeting).where(
            LecturerMeeting.lecturer_id == lecturer_id,
            LecturerMeeting.meeting_date == target_date,
            LecturerMeeting.meeting_status.in_([MeetingStatus.PENDING, MeetingStatus.ACCEPTED]),
        )
        existing_meetings = list((await db.execute(meetings_query)).scalars().all())

        discrete_slots: List[LecturerDiscreteSlot] = []

        dummy_date = target_date
        for slot in availability_slots:
            duration = timedelta(minutes=slot.slot_duration_minutes)
            slot_start_dt = datetime.combine(dummy_date, slot.start_time)
            slot_end_dt = datetime.combine(dummy_date, slot.end_time)

            current_start = slot_start_dt
            while current_start + duration <= slot_end_dt:
                current_end = current_start + duration
                cur_t_start = current_start.time()
                cur_t_end = current_end.time()

                # Count bookings overlapping this interval
                overlap_count = 0
                for m in existing_meetings:
                    if cur_t_start < m.end_time and cur_t_end > m.start_time:
                        overlap_count += 1

                is_available = overlap_count < slot.max_students_per_slot

                discrete_slots.append(
                    LecturerDiscreteSlot(
                        availability_slot_id=slot.id,
                        meeting_date=target_date,
                        start_time=cur_t_start,
                        end_time=cur_t_end,
                        location_type=slot.location_type,
                        room_or_link=slot.room_or_link,
                        is_available=is_available,
                        current_bookings_count=overlap_count,
                        max_students=slot.max_students_per_slot,
                    )
                )
                current_start = current_end

        # Sort by start_time
        discrete_slots.sort(key=lambda s: s.start_time)
        return discrete_slots
