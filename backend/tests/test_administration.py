import uuid
from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.equipment import Equipment, EquipmentCondition
from app.models.equipment_borrow import BorrowStatus, EquipmentBorrow
from app.models.facility import Facility, FacilityType
from app.models.facility_booking import BookingStatus, FacilityBooking
from app.models.laboratory import Laboratory
from app.models.lab_service import LabService, ServiceType
from app.models.notification import Notification, NotificationType
from app.models.service_request import ServiceRequest, ServiceStatus
from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_super_admin_metrics_and_user_governance(
    client: AsyncClient, db_session: AsyncSession, seed_data: dict
):
    super_admin = seed_data["admin"]
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": super_admin.email, "password": "Admin@USJ2026!"},
    )
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Test Super Admin Metrics
    metrics_res = await client.get("/api/v1/admin/metrics", headers=headers)
    assert metrics_res.status_code == 200
    data = metrics_res.json()
    assert data["role"] == "SUPER_ADMIN"
    assert "super_admin" in data
    sa = data["super_admin"]
    assert sa["total_students"] >= 1
    assert sa["total_administrators"] >= 1
    assert "pending_requests" in sa
    assert "system_activity_overview" in data

    # 2. Test Super Admin Creates Another Admin Account
    new_admin_email = f"facility.head.{uuid.uuid4().hex[:6]}@eng.sjp.ac.lk"
    create_admin_payload = {
        "email": new_admin_email,
        "full_name": "Eng. Nihal Wickramasinghe",
        "password": "AdminPassword123!",
        "role": "FACILITY_ADMIN",
        "department_id": str(seed_data["department"].id),
    }
    create_res = await client.post("/api/v1/admin/create-admin", json=create_admin_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    created_user = create_res.json()
    assert created_user["role"] == "FACILITY_ADMIN"
    assert created_user["is_verified"] is True
    assert created_user["is_active"] is True

    # 3. Test Super Admin Verifies Pending Lecturer
    pending_lecturer_email = f"lecturer.test.{uuid.uuid4().hex[:6]}@eng.sjp.ac.lk"
    lecturer_reg_payload = {
        "email": pending_lecturer_email,
        "full_name": "Dr. Sunil Jayakody",
        "password": "SecurePassword123!",
        "department_id": str(seed_data["department"].id),
        "title": "Senior Lecturer",
    }
    reg_lec_res = await client.post("/api/v1/auth/register/lecturer", json=lecturer_reg_payload)
    assert reg_lec_res.status_code == 201

    # Fetch pending lecturers
    pending_res = await client.get("/api/v1/admin/lecturers/pending", headers=headers)
    assert pending_res.status_code == 200
    pending_list = pending_res.json()
    lec_entry = next((l for l in pending_list if l["email"] == pending_lecturer_email), None)
    assert lec_entry is not None
    lec_id = lec_entry["id"]

    # Verify the lecturer
    verify_res = await client.post(
        f"/api/v1/admin/lecturers/{lec_id}/verify",
        json={"is_verified": True},
        headers=headers,
    )
    assert verify_res.status_code == 200
    assert verify_res.json()["is_verified"] is True


@pytest.mark.asyncio
async def test_facility_admin_dashboard_metrics_and_maintenance(
    client: AsyncClient, db_session: AsyncSession, seed_data: dict
):
    super_admin = seed_data["admin"]
    sa_token = (
        await client.post(
            "/api/v1/auth/login",
            json={"email": super_admin.email, "password": "Admin@USJ2026!"},
        )
    ).json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # Create Facility Admin
    fa_email = f"fac.admin.{uuid.uuid4().hex[:6]}@eng.sjp.ac.lk"
    fa_res = await client.post(
        "/api/v1/admin/create-admin",
        json={
            "email": fa_email,
            "full_name": "Facility Manager Bandara",
            "password": "FacilityAdmin123!",
            "role": "FACILITY_ADMIN",
        },
        headers=sa_headers,
    )
    assert fa_res.status_code == 201

    # Login as Facility Admin
    login_fa = await client.post(
        "/api/v1/auth/login",
        json={"email": fa_email, "password": "FacilityAdmin123!"},
    )
    fa_token = login_fa.json()["access_token"]
    fa_headers = {"Authorization": f"Bearer {fa_token}"}

    # 1. Fetch Facility Admin Metrics
    fa_metrics = await client.get("/api/v1/admin/metrics", headers=fa_headers)
    assert fa_metrics.status_code == 200
    data = fa_metrics.json()
    assert data["role"] == "FACILITY_ADMIN"
    assert "facilities" in data
    assert "hall_utilization_rate" in data["facilities"]
    assert "upcoming_maintenance" in data
    assert "today_schedule" in data

    # 2. Facility Admin should be blocked from Super Admin endpoints
    blocked_res = await client.post(
        "/api/v1/admin/create-admin",
        json={
            "email": "hacker@eng.sjp.ac.lk",
            "full_name": "Hacker",
            "password": "Password123!",
            "role": "SUPER_ADMIN",
        },
        headers=fa_headers,
    )
    assert blocked_res.status_code == 403


@pytest.mark.asyncio
async def test_lab_admin_dashboard_overdue_tracker_and_reminders(
    client: AsyncClient, db_session: AsyncSession, seed_data: dict
):
    super_admin = seed_data["admin"]
    sa_token = (
        await client.post(
            "/api/v1/auth/login",
            json={"email": super_admin.email, "password": "Admin@USJ2026!"},
        )
    ).json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # Create Lab Admin
    la_email = f"lab.lead.{uuid.uuid4().hex[:6]}@eng.sjp.ac.lk"
    la_create = await client.post(
        "/api/v1/admin/create-admin",
        json={
            "email": la_email,
            "full_name": "Lab Lead Gunawardena",
            "password": "LabLeadPass123!",
            "role": "LAB_ADMIN",
        },
        headers=sa_headers,
    )
    assert la_create.status_code == 201

    login_la = await client.post(
        "/api/v1/auth/login",
        json={"email": la_email, "password": "LabLeadPass123!"},
    )
    la_token = login_la.json()["access_token"]
    la_headers = {"Authorization": f"Bearer {la_token}"}

    # Seed an overdue borrow
    now = datetime.now(timezone.utc)
    lab = Laboratory(
        name="Advanced Mechatronics Lab",
        code=f"AML-{uuid.uuid4().hex[:4].upper()}",
        department_id=seed_data["department"].id,
        location="Block E",
        operating_hours="08:30 - 16:30",
        is_active=True,
    )
    db_session.add(lab)
    await db_session.flush()

    eq = Equipment(
        lab_id=lab.id,
        name="Arduino Mega 2560 Pro Kit",
        category="Microcontrollers",
        total_quantity=10,
        available_quantity=8,
        is_borrowable=True,
        requires_admin_approval=True,
        condition_status=EquipmentCondition.EXCELLENT,
    )
    db_session.add(eq)
    await db_session.flush()

    # Overdue borrow: expected return 2 days ago
    overdue_borrow = EquipmentBorrow(
        equipment_id=eq.id,
        borrower_id=seed_data["student"].id,
        quantity=2,
        purpose="Robotics experiment",
        expected_borrow_date=now - timedelta(days=5),
        expected_return_date=now - timedelta(days=2),
        status=BorrowStatus.IN_PROGRESS,
    )
    db_session.add(overdue_borrow)
    await db_session.commit()

    # 1. Fetch Lab Admin metrics
    la_metrics = await client.get("/api/v1/admin/metrics", headers=la_headers)
    assert la_metrics.status_code == 200
    m_data = la_metrics.json()
    assert m_data["role"] == "LAB_ADMIN"
    assert "laboratory" in m_data
    assert m_data["laboratory"]["overdue_equipment_count"] >= 1
    assert len(m_data["overdue_equipment"]) >= 1
    assert m_data["overdue_equipment"][0]["equipment_name"] == "Arduino Mega 2560 Pro Kit"

    # 2. Dispatch Return Reminders
    reminder_res = await client.post("/api/v1/admin/equipment/send-return-reminders", headers=la_headers)
    assert reminder_res.status_code == 200
    r_data = reminder_res.json()
    assert r_data["reminders_sent"] >= 1
    assert r_data["overdue_count"] >= 1

    # Verify notification received by student
    stu_token = (
        await client.post(
            "/api/v1/auth/login",
            json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
        )
    ).json()["access_token"]
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # Test unread notification count
    unread_res = await client.get("/api/v1/notifications/unread-count", headers=stu_headers)
    assert unread_res.status_code == 200
    assert unread_res.json()["unread_count"] >= 1


@pytest.mark.asyncio
async def test_admin_reporting_with_date_filters(
    client: AsyncClient, db_session: AsyncSession, seed_data: dict
):
    super_admin = seed_data["admin"]
    sa_token = (
        await client.post(
            "/api/v1/auth/login",
            json={"email": super_admin.email, "password": "Admin@USJ2026!"},
        )
    ).json()["access_token"]
    sa_headers = {"Authorization": f"Bearer {sa_token}"}

    # Request report for last 7 days
    now = datetime.now(timezone.utc)
    start_str = (now - timedelta(days=7)).isoformat()
    end_str = now.isoformat()

    report_res = await client.get(
        f"/api/v1/admin/reports?start_date={start_str}&end_date={end_str}",
        headers=sa_headers,
    )
    assert report_res.status_code == 200
    rep = report_res.json()
    assert "date_range" in rep
    assert "bookings" in rep
    assert "equipment" in rep
    assert "services" in rep
    assert "timeline" in rep
    assert isinstance(rep["timeline"], list)
