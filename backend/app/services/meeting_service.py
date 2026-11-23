from datetime import date, datetime, time
from typing import List, Optional
import uuid
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from app.models.lecturer_availability import LecturerAvailability
from app.models.lecturer_meeting import LecturerMeeting, MeetingStatus
from app.models.notification import NotificationType
from app.models.user import User, UserRole
from app.schemas.lecturer_meeting import LecturerMeetingCreate, LecturerMeetingStatusUpdate
from app.services.notification_service import create_notification


class MeetingService:
    """Business logic service for lecturer-student consultation meetings."""

    @staticmethod
    async def list_meetings(
        db: AsyncSession,
        current_user: User,
        status_filter: Optional[MeetingStatus] = None,
        upcoming_only: bool = False,
    ) -> List[LecturerMeeting]:
        query = select(LecturerMeeting).order_by(
            LecturerMeeting.meeting_date.desc(), LecturerMeeting.start_time.desc()
        )

        if current_user.role == UserRole.LECTURER:
            query = query.where(LecturerMeeting.lecturer_id == current_user.id)
        elif current_user.role == UserRole.STUDENT:
            query = query.where(LecturerMeeting.student_id == current_user.id)

        if status_filter:
            query = query.where(LecturerMeeting.meeting_status == status_filter)

        if upcoming_only:
            today = date.today()
            query = query.where(
                LecturerMeeting.meeting_date >= today,
                LecturerMeeting.meeting_status.in_([MeetingStatus.PENDING, MeetingStatus.ACCEPTED]),
            )

        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_meeting_by_id(
        db: AsyncSession, meeting_id: uuid.UUID, current_user: User
    ) -> LecturerMeeting:
        query = select(LecturerMeeting).where(LecturerMeeting.id == meeting_id)
        meeting = (await db.execute(query)).scalar_one_or_none()
        if not meeting:
            raise NotFoundException("Meeting", str(meeting_id))

        if (
            current_user.role not in [UserRole.SUPER_ADMIN]
            and current_user.id != meeting.student_id
            and current_user.id != meeting.lecturer_id
        ):
            raise ForbiddenException("You do not have permission to view this meeting.")

        return meeting

    @staticmethod
    async def request_meeting(
        db: AsyncSession,
        student: User,
        req: LecturerMeetingCreate,
    ) -> LecturerMeeting:
        # Validate that student is active
        if not student.is_active:
            raise ForbiddenException("Inactive student account cannot book meetings.")

        if req.end_time <= req.start_time:
            raise BadRequestException("Meeting end time must be after start time.")

        if req.meeting_date < date.today():
            raise BadRequestException("Cannot schedule consultation meetings in the past.")

        # Validate that lecturer exists
        lec_query = select(User).where(
            User.id == req.lecturer_id,
            User.role.in_([UserRole.LECTURER, UserRole.SUPER_ADMIN]),
            User.is_active == True,
        )
        lecturer = (await db.execute(lec_query)).scalar_one_or_none()
        if not lecturer:
            raise NotFoundException("Lecturer", str(req.lecturer_id))

        # Check published availability slot
        slot: Optional[LecturerAvailability] = None
        if req.availability_slot_id:
            slot_query = select(LecturerAvailability).where(
                LecturerAvailability.id == req.availability_slot_id,
                LecturerAvailability.lecturer_id == req.lecturer_id,
                LecturerAvailability.is_active == True,
            ).with_for_update()
            slot = (await db.execute(slot_query)).scalar_one_or_none()
            if not slot:
                raise NotFoundException("Availability Slot", str(req.availability_slot_id))
        else:
            # Rule: Students can only request published available slots
            # Find an active slot for this date and time
            req_dow = req.meeting_date.weekday()
            slot_query = select(LecturerAvailability).where(
                LecturerAvailability.lecturer_id == req.lecturer_id,
                LecturerAvailability.is_active == True,
                or_(
                    LecturerAvailability.specific_date == req.meeting_date,
                    (LecturerAvailability.specific_date.is_(None) & (LecturerAvailability.day_of_week == req_dow)),
                ),
                LecturerAvailability.start_time <= req.start_time,
                LecturerAvailability.end_time >= req.end_time,
            ).with_for_update()
            slot = (await db.execute(slot_query)).scalars().first()
            if not slot:
                raise BadRequestException(
                    "Students can only request published available slots. Please choose an active consultation slot."
                )

        # Validate that the requested date & time align with the slot
        if slot.specific_date and slot.specific_date != req.meeting_date:
            raise BadRequestException("Meeting date does not match the availability slot date.")
        if not slot.specific_date and slot.day_of_week != req.meeting_date.weekday():
            raise BadRequestException("Meeting date day of week does not match the recurring slot.")
        if req.start_time < slot.start_time or req.end_time > slot.end_time:
            raise BadRequestException("Meeting time is outside published availability window.")

        # Prevent double booking: check if this slot is already fully booked
        clash_query = select(LecturerMeeting).where(
            LecturerMeeting.lecturer_id == req.lecturer_id,
            LecturerMeeting.meeting_date == req.meeting_date,
            LecturerMeeting.meeting_status.in_([MeetingStatus.PENDING, MeetingStatus.ACCEPTED]),
            LecturerMeeting.start_time < req.end_time,
            LecturerMeeting.end_time > req.start_time,
        )
        existing_bookings = list((await db.execute(clash_query)).scalars().all())
        if len(existing_bookings) >= slot.max_students_per_slot:
            raise ConflictException(
                "The selected consultation time slot is already booked or has reached maximum capacity."
            )

        # Prevent student from booking overlapping meetings
        student_conflict_query = select(LecturerMeeting).where(
            LecturerMeeting.student_id == student.id,
            LecturerMeeting.meeting_date == req.meeting_date,
            LecturerMeeting.meeting_status.in_([MeetingStatus.PENDING, MeetingStatus.ACCEPTED]),
            LecturerMeeting.start_time < req.end_time,
            LecturerMeeting.end_time > req.start_time,
        )
        has_student_conflict = (await db.execute(student_conflict_query)).first()
        if has_student_conflict:
            raise ConflictException("You already have an appointment scheduled or pending at this time.")

        meeting = LecturerMeeting(
            lecturer_id=req.lecturer_id,
            student_id=student.id,
            availability_slot_id=slot.id,
            meeting_date=req.meeting_date,
            start_time=req.start_time,
            end_time=req.end_time,
            subject=req.subject.strip(),
            agenda=req.agenda.strip(),
            meeting_status=MeetingStatus.PENDING,
        )
        db.add(meeting)
        await db.commit()
        await db.refresh(meeting)

        # Send notification to lecturer
        time_str = f"{req.start_time.strftime('%H:%M')} - {req.end_time.strftime('%H:%M')}"
        await create_notification(
            db=db,
            user_id=req.lecturer_id,
            title="New Student Consultation Request",
            message=f"{student.full_name} has requested an appointment on {req.meeting_date} ({time_str}) for '{req.subject}'.",
            notification_type=NotificationType.MEETING,
            reference_id=meeting.id,
        )

        return meeting

    @staticmethod
    async def update_meeting_status(
        db: AsyncSession,
        meeting_id: uuid.UUID,
        req: LecturerMeetingStatusUpdate,
        current_user: User,
    ) -> LecturerMeeting:
        query = select(LecturerMeeting).where(LecturerMeeting.id == meeting_id)
        meeting = (await db.execute(query)).scalar_one_or_none()
        if not meeting:
            raise NotFoundException("Meeting", str(meeting_id))

        # Permission check: Only the designated lecturer or super admin can update
        if current_user.id != meeting.lecturer_id and current_user.role != UserRole.SUPER_ADMIN:
            raise ForbiddenException("Only the designated lecturer can update this appointment.")

        target_status = req.meeting_status

        # If accepting, verify that slot hasn't been taken in the meantime
        if target_status == MeetingStatus.ACCEPTED and meeting.meeting_status != MeetingStatus.ACCEPTED:
            overlap_query = select(LecturerMeeting).where(
                LecturerMeeting.lecturer_id == meeting.lecturer_id,
                LecturerMeeting.id != meeting.id,
                LecturerMeeting.meeting_date == meeting.meeting_date,
                LecturerMeeting.meeting_status == MeetingStatus.ACCEPTED,
                LecturerMeeting.start_time < meeting.end_time,
                LecturerMeeting.end_time > meeting.start_time,
            )
            overlap = (await db.execute(overlap_query)).first()
            if overlap:
                raise ConflictException("Another meeting has already been accepted for this time slot.")

        meeting.meeting_status = target_status
        if req.decline_reason:
            meeting.decline_reason = req.decline_reason.strip()
        if req.lecturer_notes:
            meeting.lecturer_notes = req.lecturer_notes.strip()

        await db.commit()
        await db.refresh(meeting)

        # Notify student with actionable information
        status_label = target_status.value
        title = f"Consultation Request {status_label}"
        if target_status == MeetingStatus.ACCEPTED:
            loc_info = meeting.availability_slot.room_or_link if meeting.availability_slot else "Designated location"
            message = (
                f"Dr./Prof. {current_user.full_name} accepted your consultation request for "
                f"{meeting.meeting_date} ({meeting.start_time.strftime('%H:%M')}). Location/Link: {loc_info}."
            )
        elif target_status == MeetingStatus.REJECTED:
            reason = meeting.decline_reason or "No specific reason provided."
            message = (
                f"Dr./Prof. {current_user.full_name} declined your consultation request for "
                f"{meeting.meeting_date}. Reason: {reason}"
            )
        else:
            message = f"Your consultation status has been updated to {status_label}."

        await create_notification(
            db=db,
            user_id=meeting.student_id,
            title=title,
            message=message,
            notification_type=NotificationType.MEETING,
            reference_id=meeting.id,
        )

        return meeting

    @staticmethod
    async def cancel_meeting(
        db: AsyncSession,
        meeting_id: uuid.UUID,
        current_user: User,
        cancellation_reason: Optional[str] = None,
    ) -> LecturerMeeting:
        """Allows either student or lecturer to cancel a pending or accepted meeting."""
        query = select(LecturerMeeting).where(LecturerMeeting.id == meeting_id)
        meeting = (await db.execute(query)).scalar_one_or_none()
        if not meeting:
            raise NotFoundException("Meeting", str(meeting_id))

        if (
            current_user.id not in [meeting.student_id, meeting.lecturer_id]
            and current_user.role != UserRole.SUPER_ADMIN
        ):
            raise ForbiddenException("You are not authorized to cancel this meeting.")

        if meeting.meeting_status in [MeetingStatus.CANCELLED, MeetingStatus.REJECTED, MeetingStatus.COMPLETED]:
            raise BadRequestException(f"Cannot cancel a meeting that is already {meeting.meeting_status.value}.")

        meeting.meeting_status = MeetingStatus.CANCELLED
        if cancellation_reason:
            meeting.decline_reason = f"Cancelled by {current_user.full_name}: {cancellation_reason.strip()}"

        await db.commit()
        await db.refresh(meeting)

        # Notify the opposite party
        if current_user.id == meeting.student_id:
            notify_target_id = meeting.lecturer_id
            notify_title = "Consultation Cancelled by Student"
            notify_msg = f"Student {current_user.full_name} cancelled their consultation on {meeting.meeting_date} ({meeting.start_time.strftime('%H:%M')})."
        else:
            notify_target_id = meeting.student_id
            notify_title = "Consultation Cancelled by Lecturer"
            notify_msg = f"Dr./Prof. {current_user.full_name} cancelled your consultation on {meeting.meeting_date} ({meeting.start_time.strftime('%H:%M')})."

        await create_notification(
            db=db,
            user_id=notify_target_id,
            title=notify_title,
            message=notify_msg,
            notification_type=NotificationType.MEETING,
            reference_id=meeting.id,
        )

        return meeting
