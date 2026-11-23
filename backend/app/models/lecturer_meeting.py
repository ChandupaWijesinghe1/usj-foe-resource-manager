import enum
import uuid
from datetime import date, datetime, time, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Date, DateTime, Enum, ForeignKey, String, Text, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.lecturer_availability import LecturerAvailability


class MeetingStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"

    # Compatibility aliases
    REQUESTED = "PENDING"
    CONFIRMED = "ACCEPTED"
    DECLINED = "REJECTED"


class LecturerMeeting(Base):
    __tablename__ = "lecturer_meetings"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    lecturer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    availability_slot_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("lecturer_availability.id", ondelete="SET NULL"), nullable=True
    )
    meeting_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    agenda: Mapped[str] = mapped_column(Text, nullable=False)
    meeting_status: Mapped[MeetingStatus] = mapped_column(
        Enum(MeetingStatus, name="meeting_status_enum"),
        default=MeetingStatus.PENDING,
        nullable=False,
    )
    decline_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    lecturer_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    lecturer: Mapped["User"] = relationship(
        "User", foreign_keys=[lecturer_id], back_populates="meetings_as_lecturer", lazy="selectin"
    )
    student: Mapped["User"] = relationship(
        "User", foreign_keys=[student_id], back_populates="meetings_as_student", lazy="selectin"
    )
    availability_slot: Mapped[Optional["LecturerAvailability"]] = relationship(
        "LecturerAvailability", back_populates="meetings", lazy="selectin"
    )
