import enum
import uuid
from datetime import date, time
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, Date, Enum, ForeignKey, Integer, SmallInteger, String, Time, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.lecturer_meeting import LecturerMeeting


class LocationType(str, enum.Enum):
    PHYSICAL_OFFICE = "PHYSICAL_OFFICE"
    LAB = "LAB"
    ONLINE_CALL = "ONLINE_CALL"


class LecturerAvailability(Base):
    __tablename__ = "lecturer_availability"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    lecturer_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    # Optional specific date (if None, applies recurringly to day_of_week)
    specific_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)  # 0=Monday, 6=Sunday
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    slot_duration_minutes: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    max_students_per_slot: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    location_type: Mapped[LocationType] = mapped_column(
        Enum(LocationType, name="location_type_enum"),
        default=LocationType.PHYSICAL_OFFICE,
        nullable=False,
    )
    room_or_link: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Relationships
    lecturer: Mapped["User"] = relationship("User", back_populates="availability_slots", lazy="selectin")
    meetings: Mapped[List["LecturerMeeting"]] = relationship(
        "LecturerMeeting", back_populates="availability_slot"
    )
