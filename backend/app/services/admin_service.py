from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
import uuid
from sqlalchemy import func, select, or_, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from app.core.security import get_password_hash
from app.models.audit_log import AuditLog
from app.models.equipment import Equipment
from app.models.equipment_borrow import BorrowStatus, EquipmentBorrow
from app.models.facility import Facility
from app.models.facility_booking import BookingStatus, FacilityBooking
from app.models.laboratory import Laboratory
from app.models.lab_service import LabService
from app.models.notification import NotificationType
from app.models.service_request import Print3DDetails, ServiceRequest, ServiceStatus
from app.models.user import User, UserRole
from app.schemas.admin import CreateAdminAccountRequest, LecturerVerificationRequest
from app.schemas.user import UserRoleUpdate
from app.services.notification_service import create_notification


class AdminService:
    """Business logic service for faculty administrative metrics, user governance, and audits."""

    @staticmethod
    async def get_dashboard_metrics(db: AsyncSession, admin_user: User) -> Dict[str, Any]:
        """Role-tailored metrics for Super Admin, Facility Admin, and Lab Admin."""
        now = datetime.now(timezone.utc)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        # -------------------------------------------------------------
        # FACILITY ADMIN METRICS
        # -------------------------------------------------------------
        if admin_user.role == UserRole.FACILITY_ADMIN:
            total_halls = (
                await db.execute(select(func.count(Facility.id)))
            ).scalar() or 0

            today_bookings = (
                await db.execute(
                    select(func.count(FacilityBooking.id)).where(
                        FacilityBooking.start_time >= today_start,
                        FacilityBooking.start_time < today_end,
                        FacilityBooking.is_maintenance_block == False,
                    )
                )
            ).scalar() or 0

            pending_bookings = (
                await db.execute(
                    select(func.count(FacilityBooking.id)).where(
                        FacilityBooking.status == BookingStatus.PENDING,
                        FacilityBooking.is_maintenance_block == False,
                    )
                )
            ).scalar() or 0

            approved_bookings = (
                await db.execute(
                    select(func.count(FacilityBooking.id)).where(
                        FacilityBooking.status == BookingStatus.APPROVED,
                        FacilityBooking.is_maintenance_block == False,
                    )
                )
            ).scalar() or 0

            # Hall Utilization Rate (%)
            # Daily operating hours: 8:00 to 18:00 (10 hrs per hall)
            operational_halls_count = (
                await db.execute(
                    select(func.count(Facility.id)).where(Facility.is_operational == True)
                )
            ).scalar() or 0

            # Compute hours booked today across approved bookings
            today_approved_q = select(FacilityBooking).where(
                FacilityBooking.status == BookingStatus.APPROVED,
                FacilityBooking.start_time < today_end,
                FacilityBooking.end_time > today_start,
            )
            today_approved = (await db.execute(today_approved_q)).scalars().all()
            total_booked_hours = 0.0
            for b in today_approved:
                b_start = max(b.start_time, today_start)
                b_end = min(b.end_time, today_end)
                if b_end > b_start:
                    total_booked_hours += (b_end - b_start).total_seconds() / 3600.0

            total_capacity_hours = max(1.0, float(operational_halls_count) * 10.0)
            utilization_rate = round(min(100.0, (total_booked_hours / total_capacity_hours) * 100.0), 1)

            # Maintenance schedules
            maintenance_blocks_q = (
                select(FacilityBooking)
                .options(selectinload(FacilityBooking.facility))
                .where(
                    FacilityBooking.is_maintenance_block == True,
                    FacilityBooking.end_time >= today_start,
                )
                .order_by(FacilityBooking.start_time.asc())
                .limit(10)
            )
            maintenance_blocks = (await db.execute(maintenance_blocks_q)).scalars().all()

            # Today's active bookings list
            today_bookings_list_q = (
                select(FacilityBooking)
                .options(selectinload(FacilityBooking.facility), selectinload(FacilityBooking.user))
                .where(
                    FacilityBooking.start_time >= today_start,
                    FacilityBooking.start_time < today_end,
                )
                .order_by(FacilityBooking.start_time.asc())
                .limit(15)
            )
            today_bookings_list = (await db.execute(today_bookings_list_q)).scalars().all()

            return {
                "role": "FACILITY_ADMIN",
                "facilities": {
                    "total_halls": total_halls,
                    "today_bookings": today_bookings,
                    "pending_booking_requests": pending_bookings,
                    "approved_bookings": approved_bookings,
                    "hall_utilization_rate": utilization_rate,
                    "operational_halls": operational_halls_count,
                    "maintenance_schedules_count": len(maintenance_blocks),
                },
                "upcoming_maintenance": [
                    {
                        "id": str(m.id),
                        "facility_name": m.facility.name if m.facility else "Unknown Hall",
                        "start_time": m.start_time.isoformat(),
                        "end_time": m.end_time.isoformat(),
                        "reason": m.purpose,
                    }
                    for m in maintenance_blocks
                ],
                "today_schedule": [
                    {
                        "id": str(b.id),
                        "title": b.title,
                        "facility_name": b.facility.name if b.facility else "Unknown Hall",
                        "user_name": b.user.full_name if b.user else "Anonymous",
                        "start_time": b.start_time.isoformat(),
                        "end_time": b.end_time.isoformat(),
                        "status": b.status.value,
                        "is_maintenance": b.is_maintenance_block,
                        "attendee_count": b.attendee_count,
                    }
                    for b in today_bookings_list
                ],
            }

        # -------------------------------------------------------------
        # LAB ADMIN METRICS
        # -------------------------------------------------------------
        if admin_user.role == UserRole.LAB_ADMIN:
            total_laboratories = (
                await db.execute(select(func.count(Laboratory.id)).where(Laboratory.is_active == True))
            ).scalar() or 0

            total_equipment = (
                await db.execute(select(func.count(Equipment.id)))
            ).scalar() or 0

            available_inventory = (
                await db.execute(select(func.sum(Equipment.available_quantity)))
            ).scalar() or 0

            pending_borrows = (
                await db.execute(
                    select(func.count(EquipmentBorrow.id)).where(EquipmentBorrow.status == BorrowStatus.PENDING)
                )
            ).scalar() or 0

            pending_services = (
                await db.execute(
                    select(func.count(ServiceRequest.id)).where(
                        ServiceRequest.status.in_([ServiceStatus.PENDING, ServiceStatus.SUBMITTED])
                    )
                )
            ).scalar() or 0

            currently_borrowed = (
                await db.execute(
                    select(func.count(EquipmentBorrow.id)).where(
                        EquipmentBorrow.status.in_([BorrowStatus.IN_PROGRESS, BorrowStatus.ISSUED])
                    )
                )
            ).scalar() or 0

            # Overdue equipment
            overdue_q = (
                select(EquipmentBorrow)
                .options(selectinload(EquipmentBorrow.equipment), selectinload(EquipmentBorrow.borrower))
                .where(
                    EquipmentBorrow.status.in_([BorrowStatus.IN_PROGRESS, BorrowStatus.ISSUED]),
                    EquipmentBorrow.expected_return_date < now,
                )
                .order_by(EquipmentBorrow.expected_return_date.asc())
            )
            overdue_items = (await db.execute(overdue_q)).scalars().all()

            overdue_list = []
            for ob in overdue_items:
                delta_days = max(1, (now - ob.expected_return_date).days)
                overdue_list.append({
                    "borrow_id": str(ob.id),
                    "equipment_name": ob.equipment.name if ob.equipment else "Equipment Item",
                    "borrower_name": ob.borrower.full_name if ob.borrower else "Student",
                    "borrower_email": ob.borrower.email if ob.borrower else "N/A",
                    "quantity": ob.quantity,
                    "expected_return_date": ob.expected_return_date.isoformat(),
                    "days_overdue": delta_days,
                })

            return {
                "role": "LAB_ADMIN",
                "laboratory": {
                    "total_laboratories": total_laboratories,
                    "total_equipment": total_equipment,
                    "available_inventory": available_inventory,
                    "pending_borrowing_requests": pending_borrows,
                    "pending_laboratory_service_requests": pending_services,
                    "currently_borrowed_equipment": currently_borrowed,
                    "overdue_equipment_count": len(overdue_items),
                },
                "overdue_equipment": overdue_list,
            }

        # -------------------------------------------------------------
        # SUPER ADMIN METRICS (Complete Faculty Overview)
        # -------------------------------------------------------------
        total_students = (
            await db.execute(select(func.count(User.id)).where(User.role == UserRole.STUDENT))
        ).scalar() or 0

        total_lecturers = (
            await db.execute(select(func.count(User.id)).where(User.role == UserRole.LECTURER))
        ).scalar() or 0

        total_administrators = (
            await db.execute(
                select(func.count(User.id)).where(
                    User.role.in_([UserRole.SUPER_ADMIN, UserRole.FACILITY_ADMIN, UserRole.LAB_ADMIN])
                )
            )
        ).scalar() or 0

        total_lecture_halls = (
            await db.execute(select(func.count(Facility.id)))
        ).scalar() or 0

        total_laboratory_services = (
            await db.execute(select(func.count(LabService.id)).where(LabService.is_active == True))
        ).scalar() or 0

        total_booking_requests = (
            await db.execute(select(func.count(FacilityBooking.id)))
        ).scalar() or 0

        # Pending Requests across all departments
        pending_bookings = (
            await db.execute(select(func.count(FacilityBooking.id)).where(FacilityBooking.status == BookingStatus.PENDING))
        ).scalar() or 0

        pending_borrows = (
            await db.execute(select(func.count(EquipmentBorrow.id)).where(EquipmentBorrow.status == BorrowStatus.PENDING))
        ).scalar() or 0

        pending_services = (
            await db.execute(
                select(func.count(ServiceRequest.id)).where(
                    ServiceRequest.status.in_([ServiceStatus.PENDING, ServiceStatus.SUBMITTED])
                )
            )
        ).scalar() or 0

        pending_lecturer_verifications = (
            await db.execute(
                select(func.count(User.id)).where(
                    User.role == UserRole.LECTURER, User.is_verified == False
                )
            )
        ).scalar() or 0

        total_pending = pending_bookings + pending_borrows + pending_services + pending_lecturer_verifications

        # Aggregated inventories & laboratories
        total_laboratories = (
            await db.execute(select(func.count(Laboratory.id)).where(Laboratory.is_active == True))
        ).scalar() or 0

        total_equipment = (await db.execute(select(func.count(Equipment.id)))).scalar() or 0
        currently_borrowed = (
            await db.execute(
                select(func.count(EquipmentBorrow.id)).where(
                    EquipmentBorrow.status.in_([BorrowStatus.IN_PROGRESS, BorrowStatus.ISSUED])
                )
            )
        ).scalar() or 0

        # System Activity Stream (Top latest entries from Bookings, Borrows, Services, Registrations)
        recent_bookings = (
            await db.execute(
                select(FacilityBooking)
                .options(selectinload(FacilityBooking.user), selectinload(FacilityBooking.facility))
                .order_by(FacilityBooking.created_at.desc())
                .limit(8)
            )
        ).scalars().all()

        recent_borrows = (
            await db.execute(
                select(EquipmentBorrow)
                .options(selectinload(EquipmentBorrow.borrower), selectinload(EquipmentBorrow.equipment))
                .order_by(EquipmentBorrow.created_at.desc())
                .limit(8)
            )
        ).scalars().all()

        recent_services = (
            await db.execute(
                select(ServiceRequest)
                .options(selectinload(ServiceRequest.requester), selectinload(ServiceRequest.service))
                .order_by(ServiceRequest.created_at.desc())
                .limit(8)
            )
        ).scalars().all()

        recent_users = (
            await db.execute(select(User).order_by(User.created_at.desc()).limit(8))
        ).scalars().all()

        activities: List[Dict[str, Any]] = []

        for b in recent_bookings:
            activities.append({
                "id": f"booking-{b.id}",
                "activity_type": "FACILITY_BOOKING",
                "title": f"Facility Booking: {b.title}",
                "description": f"{b.facility.name if b.facility else 'Hall'} for {b.attendee_count} attendees",
                "actor_name": b.user.full_name if b.user else "User",
                "status": b.status.value,
                "timestamp": b.created_at.isoformat(),
            })

        for eq_b in recent_borrows:
            activities.append({
                "id": f"borrow-{eq_b.id}",
                "activity_type": "EQUIPMENT_BORROW",
                "title": f"Equipment Loan: {eq_b.equipment.name if eq_b.equipment else 'Device'}",
                "description": f"{eq_b.quantity} unit(s) requested - Purpose: {eq_b.purpose[:40]}",
                "actor_name": eq_b.borrower.full_name if eq_b.borrower else "Student",
                "status": eq_b.status.value,
                "timestamp": eq_b.created_at.isoformat(),
            })

        for s in recent_services:
            activities.append({
                "id": f"service-{s.id}",
                "activity_type": "LAB_SERVICE",
                "title": f"Service Job: {s.project_title}",
                "description": s.service.service_name if s.service else "Engineering Service",
                "actor_name": s.requester.full_name if s.requester else "Student",
                "status": s.status.value,
                "timestamp": s.created_at.isoformat(),
            })

        for u in recent_users:
            activities.append({
                "id": f"user-{u.id}",
                "activity_type": "USER_REGISTRATION",
                "title": f"New Account: {u.full_name}",
                "description": f"Role: {u.role.value} &bull; Email: {u.email}",
                "actor_name": u.full_name,
                "status": "ACTIVE" if u.is_active else "PENDING_VERIFICATION",
                "timestamp": u.created_at.isoformat(),
            })

        # Sort all combined activities descending by timestamp
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        recent_activity_overview = activities[:16]

        return {
            "role": "SUPER_ADMIN",
            "super_admin": {
                "total_students": total_students,
                "total_lecturers": total_lecturers,
                "total_administrators": total_administrators,
                "total_lecture_halls": total_lecture_halls,
                "total_laboratories": total_laboratories,
                "total_laboratory_services": total_laboratory_services,
                "total_booking_requests": total_booking_requests,
                "total_equipment": total_equipment,
                "currently_borrowed_equipment": currently_borrowed,
                "pending_requests": {
                    "bookings": pending_bookings,
                    "borrows": pending_borrows,
                    "services": pending_services,
                    "lecturer_verifications": pending_lecturer_verifications,
                    "total": total_pending,
                },
            },
            # Compatibility structure for existing components
            "facilities": {
                "total": total_lecture_halls,
                "total_bookings": total_booking_requests,
                "pending_approvals": pending_bookings,
                "approved": total_booking_requests - pending_bookings,
            },
            "equipment": {
                "total_items": total_equipment,
                "currently_issued": currently_borrowed,
                "pending_requests": pending_borrows,
            },
            "services": {
                "total_jobs": total_laboratory_services,
                "awaiting_estimate": pending_services,
                "in_progress": 0,
            },
            "users": {
                "total": total_students + total_lecturers + total_administrators,
                "students": total_students,
                "lecturers": total_lecturers,
                "admins": total_administrators,
                "pending_lecturers": pending_lecturer_verifications,
            },
            "system_activity_overview": recent_activity_overview,
        }

    @staticmethod
    async def get_admin_reports(
        db: AsyncSession,
        admin_user: User,
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """Generates comprehensive aggregated metrics and timeline charts for date ranges."""
        # 1. Facility Bookings Report
        booking_query = select(FacilityBooking).options(
            selectinload(FacilityBooking.facility)
        ).where(
            FacilityBooking.created_at >= start_date,
            FacilityBooking.created_at <= end_date,
        )
        bookings = (await db.execute(booking_query)).scalars().all()

        bookings_by_status = {
            "PENDING": 0, "APPROVED": 0, "REJECTED": 0, "CANCELLED": 0, "COMPLETED": 0
        }
        total_attendees = 0
        facility_utilization_map: Dict[str, int] = {}

        for b in bookings:
            st = b.status.value
            bookings_by_status[st] = bookings_by_status.get(st, 0) + 1
            total_attendees += b.attendee_count or 0
            if b.facility:
                facility_utilization_map[b.facility.name] = (
                    facility_utilization_map.get(b.facility.name, 0) + 1
                )

        top_facilities = [
            {"name": k, "booking_count": v}
            for k, v in sorted(facility_utilization_map.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        # 2. Equipment Loaning Report
        borrow_query = select(EquipmentBorrow).options(
            selectinload(EquipmentBorrow.equipment)
        ).where(
            EquipmentBorrow.created_at >= start_date,
            EquipmentBorrow.created_at <= end_date,
        )
        borrows = (await db.execute(borrow_query)).scalars().all()

        borrows_by_status = {
            "PENDING": 0, "APPROVED": 0, "IN_PROGRESS": 0, "COMPLETED": 0, "REJECTED": 0, "CANCELLED": 0
        }
        intact_returns = 0
        damaged_returns = 0
        equipment_map: Dict[str, int] = {}

        for br in borrows:
            st = br.status.value
            borrows_by_status[st] = borrows_by_status.get(st, 0) + 1
            if br.is_damaged_or_missing:
                damaged_returns += 1
            elif br.status in [BorrowStatus.COMPLETED, BorrowStatus.RETURNED]:
                intact_returns += 1

            if br.equipment:
                equipment_map[br.equipment.name] = equipment_map.get(br.equipment.name, 0) + br.quantity

        top_equipment = [
            {"name": k, "units_borrowed": v}
            for k, v in sorted(equipment_map.items(), key=lambda x: x[1], reverse=True)[:5]
        ]

        # 3. Laboratory Services Report
        service_query = select(ServiceRequest).options(
            selectinload(ServiceRequest.service)
        ).where(
            ServiceRequest.created_at >= start_date,
            ServiceRequest.created_at <= end_date,
        )
        service_jobs = (await db.execute(service_query)).scalars().all()

        services_by_status = {
            "PENDING": 0, "APPROVED": 0, "SCHEDULED": 0, "IN_PROGRESS": 0, "COMPLETED": 0, "REJECTED": 0, "CANCELLED": 0
        }
        total_charges_lkr = 0.0
        service_category_map: Dict[str, int] = {}
        total_3d_prints = 0

        for sj in service_jobs:
            st = sj.status.value
            services_by_status[st] = services_by_status.get(st, 0) + 1
            if sj.recorded_charges_lkr:
                total_charges_lkr += float(sj.recorded_charges_lkr)

            if sj.service:
                cat = sj.service.category or "General Lab Services"
                service_category_map[cat] = service_category_map.get(cat, 0) + 1
                if sj.service.service_type == "THREE_D_PRINTING":
                    total_3d_prints += 1

        # 4. User Onboarding (Super Admin)
        new_students = 0
        new_lecturers = 0
        if admin_user.role == UserRole.SUPER_ADMIN:
            user_query = select(User).where(
                User.created_at >= start_date,
                User.created_at <= end_date,
            )
            users = (await db.execute(user_query)).scalars().all()
            for u in users:
                if u.role == UserRole.STUDENT:
                    new_students += 1
                elif u.role == UserRole.LECTURER:
                    new_lecturers += 1

        # 5. Timeline Distribution for Charts (by day)
        date_map: Dict[str, Dict[str, int]] = {}
        curr_d = start_date.date()
        end_d = end_date.date()
        while curr_d <= end_d:
            date_map[curr_d.strftime("%Y-%m-%d")] = {"bookings": 0, "borrows": 0, "services": 0}
            curr_d += timedelta(days=1)

        for b in bookings:
            d_str = b.created_at.strftime("%Y-%m-%d")
            if d_str in date_map:
                date_map[d_str]["bookings"] += 1

        for br in borrows:
            d_str = br.created_at.strftime("%Y-%m-%d")
            if d_str in date_map:
                date_map[d_str]["borrows"] += 1

        for sj in service_jobs:
            d_str = sj.created_at.strftime("%Y-%m-%d")
            if d_str in date_map:
                date_map[d_str]["services"] += 1

        timeline_data = [
            {"date": k, "bookings": v["bookings"], "borrows": v["borrows"], "services": v["services"]}
            for k, v in sorted(date_map.items(), key=lambda x: x[0])
        ]

        return {
            "date_range": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
            },
            "bookings": {
                "total": len(bookings),
                "by_status": bookings_by_status,
                "total_attendees": total_attendees,
                "top_facilities": top_facilities,
            },
            "equipment": {
                "total_loans": len(borrows),
                "by_status": borrows_by_status,
                "intact_returns": intact_returns,
                "damaged_returns": damaged_returns,
                "top_equipment": top_equipment,
            },
            "services": {
                "total_requests": len(service_jobs),
                "by_status": services_by_status,
                "total_charges_collected_lkr": round(total_charges_lkr, 2),
                "total_3d_prints": total_3d_prints,
                "by_category": [
                    {"category": k, "count": v}
                    for k, v in sorted(service_category_map.items(), key=lambda x: x[1], reverse=True)
                ],
            },
            "users": {
                "new_students": new_students,
                "new_lecturers": new_lecturers,
            },
            "timeline": timeline_data,
        }

    @staticmethod
    async def send_equipment_return_reminders(db: AsyncSession, admin_user: User) -> Dict[str, Any]:
        """Scans active equipment loans and dispatches return reminders or overdue warnings."""
        now = datetime.now(timezone.utc)
        reminder_threshold = now + timedelta(days=1)

        active_borrows_q = (
            select(EquipmentBorrow)
            .options(selectinload(EquipmentBorrow.equipment), selectinload(EquipmentBorrow.borrower))
            .where(
                EquipmentBorrow.status.in_([BorrowStatus.IN_PROGRESS, BorrowStatus.ISSUED]),
                EquipmentBorrow.expected_return_date <= reminder_threshold,
            )
        )
        active_borrows = (await db.execute(active_borrows_q)).scalars().all()

        reminders_sent = 0
        overdue_count = 0
        upcoming_count = 0

        for b in active_borrows:
            eq_name = b.equipment.name if b.equipment else "Laboratory Equipment"
            is_overdue = b.expected_return_date < now
            ret_str = b.expected_return_date.strftime("%Y-%m-%d %H:%M")

            if is_overdue:
                overdue_count += 1
                title = "OVERDUE Equipment Return Notice"
                msg = (
                    f"URGENT: Your loan of {b.quantity}x '{eq_name}' was due on {ret_str}. "
                    "Please return the unit to the laboratory counter immediately to prevent administrative sanctions."
                )
            else:
                upcoming_count += 1
                title = "Equipment Return Reminder"
                msg = (
                    f"Reminder: Your loan of {b.quantity}x '{eq_name}' is scheduled for return by {ret_str}. "
                    "Please return the unit and all included accessories on time."
                )

            await create_notification(
                db=db,
                user_id=b.borrower_id,
                title=title,
                message=msg,
                notification_type=NotificationType.EQUIPMENT,
                reference_id=b.id,
            )
            reminders_sent += 1

        return {
            "reminders_sent": reminders_sent,
            "overdue_count": overdue_count,
            "upcoming_count": upcoming_count,
            "message": f"Successfully sent {reminders_sent} equipment return reminders ({overdue_count} overdue, {upcoming_count} upcoming).",
        }

    @staticmethod
    async def list_pending_lecturers(db: AsyncSession) -> List[User]:
        """Lists lecturer accounts awaiting Super Admin verification."""
        query = (
            select(User)
            .where(User.role == UserRole.LECTURER, User.is_verified == False)
            .order_by(User.created_at.desc())
        )
        return list((await db.execute(query)).scalars().all())

    @staticmethod
    async def verify_lecturer(
        db: AsyncSession,
        lecturer_id: uuid.UUID,
        req: LecturerVerificationRequest,
        super_admin: User,
    ) -> User:
        """Super Admin approves or rejects an academic lecturer registration."""
        query = select(User).where(User.id == lecturer_id)
        user = (await db.execute(query)).scalar_one_or_none()
        if not user:
            raise NotFoundException("Lecturer", str(lecturer_id))

        if user.role != UserRole.LECTURER:
            raise BadRequestException("User is not registered under the LECTURER role.")

        if req.is_verified:
            user.is_verified = True
            user.is_active = True
            await db.commit()
            await db.refresh(user)

            await create_notification(
                db=db,
                user_id=user.id,
                title="Lecturer Account Verified",
                message=(
                    f"Welcome Dr./Prof. {user.full_name}! Your lecturer account has been approved and verified "
                    f"by Super Admin {super_admin.full_name}. You can now schedule office hours and receive student consultations."
                ),
                notification_type=NotificationType.SYSTEM,
                reference_id=user.id,
            )
        else:
            reason = req.rejection_reason or "Faculty credentials could not be verified."
            user.is_verified = False
            user.is_active = False
            await db.commit()
            await db.refresh(user)

            await create_notification(
                db=db,
                user_id=user.id,
                title="Lecturer Verification Declined",
                message=f"Your lecturer account verification was declined. Reason: {reason}",
                notification_type=NotificationType.SYSTEM,
                reference_id=user.id,
            )

        return user

    @staticmethod
    async def create_admin_account(
        db: AsyncSession,
        current_admin: User,
        req: CreateAdminAccountRequest,
    ) -> User:
        """Super Admin: Provisions new administrative accounts with elevated credentials."""
        if req.role not in [UserRole.SUPER_ADMIN, UserRole.FACILITY_ADMIN, UserRole.LAB_ADMIN]:
            raise BadRequestException("Target role must be SUPER_ADMIN, FACILITY_ADMIN, or LAB_ADMIN.")

        # Check duplicate email
        existing = (await db.execute(select(User).where(User.email == req.email.lower().strip()))).scalar_one_or_none()
        if existing:
            raise ConflictException(f"An account with email '{req.email}' already exists.")

        hashed_pw = get_password_hash(req.password)
        admin = User(
            email=req.email.lower().strip(),
            full_name=req.full_name.strip(),
            hashed_password=hashed_pw,
            role=req.role,
            department_id=req.department_id,
            is_active=True,
            is_verified=True,
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)

        # Notify new admin
        await create_notification(
            db=db,
            user_id=admin.id,
            title="Administrator Credentials Provisioned",
            message=f"You have been appointed as {req.role.value} for the USJ FOE Resource System.",
            notification_type=NotificationType.SYSTEM,
            reference_id=admin.id,
        )

        return admin

    @staticmethod
    async def list_all_users(
        db: AsyncSession,
        role: Optional[UserRole] = None,
        department_id: Optional[uuid.UUID] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[User]:
        query = select(User).offset(skip).limit(limit).order_by(User.created_at.desc())
        if role:
            query = query.where(User.role == role)
        if department_id:
            query = query.where(User.department_id == department_id)
        if search:
            search_fmt = f"%{search.lower()}%"
            query = query.where(
                (User.full_name.ilike(search_fmt)) | (User.email.ilike(search_fmt))
            )
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def toggle_user_status(db: AsyncSession, user_id: uuid.UUID, is_active: bool) -> User:
        query = select(User).where(User.id == user_id)
        user = (await db.execute(query)).scalar_one_or_none()
        if not user:
            raise NotFoundException("User", str(user_id))
        user.is_active = is_active
        await db.commit()
        await db.refresh(user)
        return user

    @staticmethod
    async def update_user_role(
        db: AsyncSession, user_id: uuid.UUID, req: UserRoleUpdate
    ) -> User:
        query = select(User).where(User.id == user_id)
        user = (await db.execute(query)).scalar_one_or_none()
        if not user:
            raise NotFoundException("User", str(user_id))

        user.role = req.role
        if req.is_active is not None:
            user.is_active = req.is_active

        await db.commit()
        await db.refresh(user)
        return user
