import enum
import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.laboratory import Laboratory
    from app.models.equipment_borrow import EquipmentBorrow


class EquipmentCondition(str, enum.Enum):
    EXCELLENT = "EXCELLENT"
    GOOD = "GOOD"
    NEEDS_REPAIR = "NEEDS_REPAIR"
    DECOMMISSIONED = "DECOMMISSIONED"


class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )
    lab_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("laboratories.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    model_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    serial_number: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    category: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    total_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    available_quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    is_borrowable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requires_admin_approval: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    condition_status: Mapped[EquipmentCondition] = mapped_column(
        Enum(EquipmentCondition, name="equipment_condition_enum"),
        default=EquipmentCondition.GOOD,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    # Relationships
    laboratory: Mapped["Laboratory"] = relationship("Laboratory", back_populates="equipment_items", lazy="selectin")
    borrow_records: Mapped[List["EquipmentBorrow"]] = relationship(
        "EquipmentBorrow", back_populates="equipment"
    )
