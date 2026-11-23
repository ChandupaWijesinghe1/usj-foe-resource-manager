from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_any_admin
from app.models.equipment import Equipment
from app.models.equipment_borrow import BorrowStatus, EquipmentBorrow
from app.models.facility import Facility
from app.models.facility_booking import BookingStatus, FacilityBooking
from app.models.service_request import Print3DDetails, ServiceRequest, ServiceStatus
from app.models.user import User

router = APIRouter()


@router.get("/dashboard-summary")
async def get_dashboard_summary(
    current_admin: User = Depends(require_any_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Admin: Aggregates system metrics for executive overview dashboard."""
    # Facilities & Bookings
    total_facilities = (await db.execute(select(func.count(Facility.id)))).scalar() or 0
    total_bookings = (await db.execute(select(func.count(FacilityBooking.id)))).scalar() or 0
    pending_bookings = (
        await db.execute(select(func.count(FacilityBooking.id)).where(FacilityBooking.status == BookingStatus.PENDING))
    ).scalar() or 0
    approved_bookings = (
        await db.execute(select(func.count(FacilityBooking.id)).where(FacilityBooking.status == BookingStatus.APPROVED))
    ).scalar() or 0

    # Equipment & Borrows
    total_equipment = (await db.execute(select(func.count(Equipment.id)))).scalar() or 0
    active_borrows = (
        await db.execute(select(func.count(EquipmentBorrow.id)).where(EquipmentBorrow.status == BorrowStatus.ISSUED))
    ).scalar() or 0
    pending_borrows = (
        await db.execute(select(func.count(EquipmentBorrow.id)).where(EquipmentBorrow.status == BorrowStatus.PENDING))
    ).scalar() or 0

    # 3D Printing & Services
    total_service_jobs = (await db.execute(select(func.count(ServiceRequest.id)))).scalar() or 0
    pending_estimates = (
        await db.execute(select(func.count(ServiceRequest.id)).where(ServiceRequest.status == ServiceStatus.SUBMITTED))
    ).scalar() or 0
    in_progress_jobs = (
        await db.execute(select(func.count(ServiceRequest.id)).where(ServiceRequest.status == ServiceStatus.IN_PROGRESS))
    ).scalar() or 0

    # Material totals
    filament_sum = (await db.execute(select(func.sum(Print3DDetails.estimated_filament_grams)))).scalar() or 0.0

    return {
        "facilities": {
            "total": total_facilities,
            "total_bookings": total_bookings,
            "pending_approvals": pending_bookings,
            "approved": approved_bookings,
        },
        "equipment": {
            "total_items": total_equipment,
            "currently_issued": active_borrows,
            "pending_requests": pending_borrows,
        },
        "services": {
            "total_jobs": total_service_jobs,
            "awaiting_estimate": pending_estimates,
            "in_progress": in_progress_jobs,
            "total_filament_grams_printed": float(filament_sum),
        },
    }
