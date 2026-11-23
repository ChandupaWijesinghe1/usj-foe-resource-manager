import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.facility_booking import FacilityBooking


class FacilityType(str, enum.Enum):
    LECTURE_HALL = "LECTURE_HALL"
    AUDITORIUM = "AUDITORIUM"
    SEMINAR_ROOM = "SEMINAR_ROOM"
    COMPUTER_LAB = "COMPUTER_LAB"
    CONFERENCE_ROOM = "CONFERENCE_ROOM"


class Facility(Base):
    __tablename__ = "facilities"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    building: Mapped[str] = mapped_column(String(100), nullable=False)
    floor: Mapped[str] = mapped_column(String(20), nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    facility_type: Mapped[FacilityType] = mapped_column(
        Enum(FacilityType, name="facility_type_enum"),
        default=FacilityType.LECTURE_HALL,
        nullable=False,
    )
    has_projector: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    has_ac: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    has_sound_system: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    department_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    is_operational: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    maintenance_reason: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    maintenance_until: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    department: Mapped[Optional["Department"]] = relationship(
        "Department", back_populates="facilities", lazy="selectin"
    )
    bookings: Mapped[List["FacilityBooking"]] = relationship(
        "FacilityBooking", back_populates="facility", cascade="all, delete-orphan"
    )
