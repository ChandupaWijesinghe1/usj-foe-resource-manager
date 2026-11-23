from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_any_admin, require_lab_admin, require_super_admin
from app.models.user import User, UserRole
from app.schemas.admin import CreateAdminAccountRequest, LecturerVerificationRequest
from app.schemas.user import UserResponse, UserRoleUpdate
from app.services.admin_service import AdminService

router = APIRouter()


@router.get("/metrics", response_model=Dict[str, Any])
async def get_system_metrics(
    current_admin: User = Depends(require_any_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Admin: Returns role-tailored metrics for Super Admin, Facility Admin, or Lab Admin."""
    return await AdminService.get_dashboard_metrics(db, current_admin)


@router.get("/reports", response_model=Dict[str, Any])
async def get_faculty_reports(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_admin: User = Depends(require_any_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Admin: Aggregates date-filtered faculty reports, utilization metrics, and chart series."""
    now = datetime.now(timezone.utc)
    parsed_start: Optional[datetime] = None
    parsed_end: Optional[datetime] = None

    if start_date:
        clean_start = start_date.strip().replace(" ", "+")
        try:
            parsed_start = datetime.fromisoformat(clean_start)
        except Exception:
            try:
                parsed_start = datetime.strptime(clean_start, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except Exception:
                from app.core.exceptions import BadRequestException
                raise BadRequestException("Invalid start_date format. Please use ISO 8601 or YYYY-MM-DD.")

    if end_date:
        clean_end = end_date.strip().replace(" ", "+")
        try:
            parsed_end = datetime.fromisoformat(clean_end)
        except Exception:
            try:
                parsed_end = datetime.strptime(clean_end, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except Exception:
                from app.core.exceptions import BadRequestException
                raise BadRequestException("Invalid end_date format. Please use ISO 8601 or YYYY-MM-DD.")

    if not parsed_end:
        parsed_end = now
    if not parsed_start:
        parsed_start = parsed_end - timedelta(days=30)

    if parsed_start.tzinfo is None:
        parsed_start = parsed_start.replace(tzinfo=timezone.utc)
    if parsed_end.tzinfo is None:
        parsed_end = parsed_end.replace(tzinfo=timezone.utc)

    return await AdminService.get_admin_reports(
        db=db,
        admin_user=current_admin,
        start_date=parsed_start,
        end_date=parsed_end,
    )


@router.post("/equipment/send-return-reminders", response_model=Dict[str, Any])
async def send_equipment_return_reminders(
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lab Admin: Scans active equipment loans and dispatches return reminders and overdue notices."""
    return await AdminService.send_equipment_return_reminders(db, current_admin)


# --- Super Admin Governance Endpoints ---

@router.get("/lecturers/pending", response_model=List[UserResponse])
async def list_pending_lecturers(
    current_admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> List[User]:
    """Super Admin: Lists lecturer accounts awaiting verification."""
    return await AdminService.list_pending_lecturers(db)


@router.post("/lecturers/{lecturer_id}/verify", response_model=UserResponse)
async def verify_lecturer_account(
    lecturer_id: uuid.UUID,
    req: LecturerVerificationRequest,
    current_admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Super Admin: Approves or declines academic lecturer registration."""
    return await AdminService.verify_lecturer(
        db=db,
        lecturer_id=lecturer_id,
        req=req,
        super_admin=current_admin,
    )


@router.post("/create-admin", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_administrator_account(
    req: CreateAdminAccountRequest,
    current_admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Super Admin: Provisions a new Facility Admin, Lab Admin, or Super Admin account."""
    return await AdminService.create_admin_account(db, current_admin, req)


@router.get("/users", response_model=List[UserResponse])
async def list_faculty_users(
    role: Optional[UserRole] = None,
    department_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> List[User]:
    """Super Admin: Lists all registered accounts across roles and departments."""
    return await AdminService.list_all_users(
        db=db,
        role=role,
        department_id=department_id,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.patch("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role_assignment(
    user_id: uuid.UUID,
    req: UserRoleUpdate,
    current_admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Super Admin: Promotes, demotes, or alters active status of a user."""
    return await AdminService.update_user_role(db, user_id, req)


@router.patch("/users/{user_id}/status", response_model=UserResponse)
async def toggle_user_account_status(
    user_id: uuid.UUID,
    is_active: bool = Query(...),
    current_admin: User = Depends(require_super_admin),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Super Admin: Activates or deactivates a user account."""
    return await AdminService.toggle_user_status(db, user_id, is_active)
