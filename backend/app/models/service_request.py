import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.lab_service import LabService
    from app.models.user import User


class ServiceStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

    # Compatibility aliases
    SUBMITTED = "PENDING"
    ESTIMATED = "APPROVED"
    APPROVED_BY_USER = "APPROVED"
    READY_FOR_PICKUP = "COMPLETED"


class MaterialType(str, enum.Enum):
    PLA = "PLA"
    ABS = "ABS"
    PETG = "PETG"
    RESIN = "RESIN"
    TPU = "TPU"


class ServiceRequest(Base):
    __tablename__ = "service_requests"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("lab_services.id", ondelete="CASCADE"), index=True, nullable=False
    )
    requester_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    project_title: Mapped[str] = mapped_column(String(255), nullable=False)
    supervisor_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    requested_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    dimensions: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    preferred_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    scheduled_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    estimated_completion_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    recorded_charges_lkr: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    attachment_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    attachment_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[ServiceStatus] = mapped_column(
        Enum(ServiceStatus, name="service_status_enum"),
        default=ServiceStatus.PENDING,
        nullable=False,
    )
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    service: Mapped["LabService"] = relationship("LabService", back_populates="requests", lazy="selectin")
    requester: Mapped["User"] = relationship("User", back_populates="service_requests", lazy="selectin")
    print_3d_detail: Mapped[Optional["Print3DDetails"]] = relationship(
        "Print3DDetails", back_populates="service_request", uselist=False, cascade="all, delete-orphan", lazy="selectin"
    )


class Print3DDetails(Base):
    __tablename__ = "print_3d_details"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    service_request_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("service_requests.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    file_url: Mapped[str] = mapped_column(String(500), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(BigInteger, nullable=False)
    material_type: Mapped[MaterialType] = mapped_column(
        Enum(MaterialType, name="material_type_enum"),
        default=MaterialType.PLA,
        nullable=False,
    )
    color: Mapped[str] = mapped_column(String(50), default="Black", nullable=False)
    infill_percentage: Mapped[int] = mapped_column(Integer, default=20, nullable=False)
    estimated_filament_grams: Mapped[Optional[float]] = mapped_column(Numeric(8, 2), nullable=True)
    estimated_print_hours: Mapped[Optional[float]] = mapped_column(Numeric(5, 2), nullable=True)
    calculated_cost_lkr: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    slicing_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    service_request: Mapped["ServiceRequest"] = relationship("ServiceRequest", back_populates="print_3d_detail")
