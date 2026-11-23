import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Text, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.equipment import Equipment
    from app.models.user import User


class BorrowStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    SCHEDULED = "SCHEDULED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

    # Compatibility & granular aliases
    ISSUED = "IN_PROGRESS"
    RETURNED = "COMPLETED"
    OVERDUE = "OVERDUE"
    DAMAGED = "DAMAGED"


class EquipmentBorrow(Base):
    __tablename__ = "equipment_borrows"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    equipment_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("equipment.id", ondelete="CASCADE"), index=True, nullable=False
    )
    borrower_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    expected_borrow_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expected_return_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    actual_return_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[BorrowStatus] = mapped_column(
        Enum(BorrowStatus, name="borrow_status_enum"),
        default=BorrowStatus.PENDING,
        nullable=False,
    )
    collection_instructions: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_damaged_or_missing: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    damage_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    student_confirmed_return: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    issued_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    received_by: Mapped[Optional[uuid.UUID]] = mapped_column(
        Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    condition_on_return: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    admin_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    equipment: Mapped["Equipment"] = relationship("Equipment", back_populates="borrow_records", lazy="selectin")
    borrower: Mapped["User"] = relationship(
        "User", foreign_keys=[borrower_id], back_populates="equipment_borrows", lazy="selectin"
    )
    issuer: Mapped[Optional["User"]] = relationship("User", foreign_keys=[issued_by], lazy="selectin")
    receiver: Mapped[Optional["User"]] = relationship("User", foreign_keys=[received_by], lazy="selectin")
