import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.department import Department
    from app.models.user import User
    from app.models.equipment import Equipment
    from app.models.lab_service import LabService


class Laboratory(Base):
    __tablename__ = "laboratories"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    department_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("departments.id", ondelete="CASCADE"), nullable=False
    )
    admin_in_charge_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    location: Mapped[str] = mapped_column(String(150), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    operating_hours: Mapped[str] = mapped_column(String(100), default="8:00 AM - 4:30 PM", nullable=False)
    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    safety_guidelines: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    department: Mapped["Department"] = relationship("Department", back_populates="laboratories", lazy="selectin")
    admin_in_charge: Mapped[Optional["User"]] = relationship("User", lazy="selectin")
    equipment_items: Mapped[List["Equipment"]] = relationship(
        "Equipment", back_populates="laboratory", cascade="all, delete-orphan"
    )
    services: Mapped[List["LabService"]] = relationship(
        "LabService", back_populates="laboratory", cascade="all, delete-orphan"
    )
