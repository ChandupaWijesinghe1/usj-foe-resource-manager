import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.laboratory import Laboratory
    from app.models.service_request import ServiceRequest


class ServiceType(str, enum.Enum):
    THREE_D_PRINTING = "THREE_D_PRINTING"
    PCB_FABRICATION = "PCB_FABRICATION"
    LASER_CUTTING = "LASER_CUTTING"
    MATERIAL_TESTING = "MATERIAL_TESTING"
    EQUIPMENT_LOAN = "EQUIPMENT_LOAN"
    COMPUTING_FACILITY = "COMPUTING_FACILITY"
    ELECTRONIC_COMPONENTS = "ELECTRONIC_COMPONENTS"
    OTHER = "OTHER"


class LabService(Base):
    __tablename__ = "lab_services"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    lab_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("laboratories.id", ondelete="CASCADE"), index=True, nullable=False
    )
    service_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General", index=True, nullable=False)
    service_type: Mapped[ServiceType] = mapped_column(
        Enum(ServiceType, name="service_type_enum"),
        default=ServiceType.OTHER,
        nullable=False,
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    turnaround_time_days: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    cost_per_unit: Mapped[float] = mapped_column(Numeric(10, 2), default=0.00, nullable=False)
    unit_name: Mapped[str] = mapped_column(String(50), default="job", nullable=False)
    total_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    available_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    usage_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    borrowing_conditions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    laboratory: Mapped["Laboratory"] = relationship("Laboratory", back_populates="services", lazy="selectin")
    requests: Mapped[List["ServiceRequest"]] = relationship(
        "ServiceRequest", back_populates="service", cascade="all, delete-orphan"
    )
