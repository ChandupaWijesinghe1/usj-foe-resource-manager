from datetime import datetime, timedelta, timezone
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.equipment import Equipment, EquipmentCondition
from app.models.equipment_borrow import BorrowStatus, EquipmentBorrow
from app.models.laboratory import Laboratory
from app.models.lab_service import LabService, ServiceType
from app.models.notification import Notification
from app.models.service_request import ServiceRequest, ServiceStatus
from app.models.user import User, UserRole


async def get_token_for(client: AsyncClient, email: str, password: str) -> str:
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_equipment_borrowing_lifecycle_and_inventory_tracking(
    client: AsyncClient, seed_data: dict, db_session: AsyncSession
):
    # Setup Lab Admin and Laboratory
    lab_admin = User(
        email="labadmin.iot@eng.sjp.ac.lk",
        hashed_password=get_password_hash("LabAdmin@USJ2026!"),
        full_name="Eng. Jayasuriya (Lab Admin)",
        role=UserRole.LAB_ADMIN,
        department_id=seed_data["department"].id,
        is_active=True,
        is_verified=True,
    )
    db_session.add(lab_admin)
    await db_session.flush()

    lab = Laboratory(
        name="Microcontroller & Robotics Lab",
        code="LAB-ROBO-01",
        department_id=seed_data["department"].id,
        admin_in_charge_id=lab_admin.id,
        location="Level 2, DCE Wing",
        is_active=True,
    )
    db_session.add(lab)
    await db_session.flush()

    # Pre-seed Equipment with total=5, available=5
    arduino_board = Equipment(
        lab_id=lab.id,
        name="Arduino Mega 2560 R3",
        model_number="ATmega2560",
        serial_number="ARD-MEGA-001",
        category="Microcontrollers",
        total_quantity=5,
        available_quantity=5,
        is_borrowable=True,
        requires_admin_approval=True,
        condition_status=EquipmentCondition.GOOD,
    )
    db_session.add(arduino_board)
    await db_session.commit()

    admin_token = await get_token_for(client, "labadmin.iot@eng.sjp.ac.lk", "LabAdmin@USJ2026!")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    stu_token = await get_token_for(client, "nuwan.student@eng.sjp.ac.lk", "Student@USJ2026!")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    now = datetime.now(timezone.utc)
    borrow_dt = now + timedelta(days=1)
    return_dt = now + timedelta(days=8)

    # 1. Student requests quantity exceeding available inventory (e.g. 10 when 5 available)
    excess_res = await client.post(
        "/api/v1/equipment/borrows",
        json={
            "equipment_id": str(arduino_board.id),
            "quantity": 10,
            "purpose": "Need 10 boards for robotics class",
            "expected_borrow_date": borrow_dt.isoformat(),
            "expected_return_date": return_dt.isoformat(),
        },
        headers=stu_headers,
    )
    assert excess_res.status_code in [400, 409]
    assert "stock" in excess_res.text.lower() or "insufficient" in excess_res.text.lower()

    # 2. Student submits legitimate request for 2 units
    valid_res = await client.post(
        "/api/v1/equipment/borrows",
        json={
            "equipment_id": str(arduino_board.id),
            "quantity": 2,
            "purpose": "Final year autonomous agricultural robot project",
            "expected_borrow_date": borrow_dt.isoformat(),
            "expected_return_date": return_dt.isoformat(),
        },
        headers=stu_headers,
    )
    assert valid_res.status_code == 201
    borrow_data = valid_res.json()
    assert borrow_data["status"] == "PENDING"
    borrow_id = borrow_data["id"]

    # 3. Lab Admin approves request and provides collection instructions
    approve_res = await client.patch(
        f"/api/v1/equipment/borrows/{borrow_id}/status",
        json={
            "status": "APPROVED",
            "collection_instructions": "Collect from Workbench #4 between 9:00 AM - 11:30 AM with Student ID card.",
        },
        headers=admin_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"
    assert "Workbench #4" in approve_res.json()["collection_instructions"]

    # Verify inventory was decremented: 5 - 2 = 3
    eq_check = await client.get(f"/api/v1/equipment/{arduino_board.id}")
    assert eq_check.json()["available_quantity"] == 3

    # 4. Lab Admin records equipment issuance to student
    issue_res = await client.patch(
        f"/api/v1/equipment/borrows/{borrow_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=admin_headers,
    )
    assert issue_res.status_code == 200
    assert issue_res.json()["status"] in ["IN_PROGRESS", "ISSUED"]

    # 5. Student confirms return handover
    confirm_res = await client.post(
        f"/api/v1/equipment/borrows/{borrow_id}/confirm-return",
        json={"notes": "Handed back to technician at lab counter."},
        headers=stu_headers,
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["student_confirmed_return"] is True

    # 6. Lab Admin confirms return in good condition -> available inventory restored to 5
    return_res = await client.patch(
        f"/api/v1/equipment/borrows/{borrow_id}/status",
        json={
            "status": "COMPLETED",
            "condition_on_return": "Good condition. Tested pins working.",
            "is_damaged_or_missing": False,
        },
        headers=admin_headers,
    )
    assert return_res.status_code == 200
    assert return_res.json()["status"] in ["COMPLETED", "RETURNED"]

    eq_check2 = await client.get(f"/api/v1/equipment/{arduino_board.id}")
    assert eq_check2.json()["available_quantity"] == 5


@pytest.mark.asyncio
async def test_damaged_equipment_inventory_handling(
    client: AsyncClient, seed_data: dict, db_session: AsyncSession
):
    lab_admin = User(
        email="labadmin.sensor@eng.sjp.ac.lk",
        hashed_password=get_password_hash("LabAdmin@USJ2026!"),
        full_name="Eng. Perera",
        role=UserRole.LAB_ADMIN,
        department_id=seed_data["department"].id,
        is_active=True,
        is_verified=True,
    )
    db_session.add(lab_admin)
    await db_session.flush()

    lab = Laboratory(
        name="Sensors Lab",
        code="LAB-SENS-01",
        department_id=seed_data["department"].id,
        admin_in_charge_id=lab_admin.id,
        location="Level 1",
        is_active=True,
    )
    db_session.add(lab)
    await db_session.flush()

    sensor = Equipment(
        lab_id=lab.id,
        name="LiDAR Distance Sensor Module",
        category="Sensors",
        total_quantity=2,
        available_quantity=2,
        is_borrowable=True,
        condition_status=EquipmentCondition.GOOD,
    )
    db_session.add(sensor)
    await db_session.commit()

    admin_token = await get_token_for(client, "labadmin.sensor@eng.sjp.ac.lk", "LabAdmin@USJ2026!")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    stu_token = await get_token_for(client, "nuwan.student@eng.sjp.ac.lk", "Student@USJ2026!")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    now = datetime.now(timezone.utc)
    borrow_res = await client.post(
        "/api/v1/equipment/borrows",
        json={
            "equipment_id": str(sensor.id),
            "quantity": 1,
            "purpose": "Obstacle avoidance testing",
            "expected_borrow_date": (now + timedelta(days=1)).isoformat(),
            "expected_return_date": (now + timedelta(days=5)).isoformat(),
        },
        headers=stu_headers,
    )
    borrow_id = borrow_res.json()["id"]

    # Admin issues
    await client.patch(
        f"/api/v1/equipment/borrows/{borrow_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=admin_headers,
    )

    # Admin marks damaged on return
    damage_res = await client.patch(
        f"/api/v1/equipment/borrows/{borrow_id}/status",
        json={
            "status": "COMPLETED",
            "is_damaged_or_missing": True,
            "damage_notes": "Optical lens cracked; requires replacement.",
        },
        headers=admin_headers,
    )
    assert damage_res.status_code == 200
    assert damage_res.json()["is_damaged_or_missing"] is True

    # Inventory check: 2 total, but 1 was damaged and NOT returned to available stock -> available remains 1
    eq_check = await client.get(f"/api/v1/equipment/{sensor.id}")
    assert eq_check.json()["available_quantity"] == 1
    assert eq_check.json()["condition_status"] == "NEEDS_REPAIR"


@pytest.mark.asyncio
async def test_laboratory_service_request_lifecycle(
    client: AsyncClient, seed_data: dict, db_session: AsyncSession
):
    lab_admin = User(
        email="labadmin.fab@eng.sjp.ac.lk",
        hashed_password=get_password_hash("LabAdmin@USJ2026!"),
        full_name="Eng. Jayatillake (FabLab Head)",
        role=UserRole.LAB_ADMIN,
        department_id=seed_data["department"].id,
        is_active=True,
        is_verified=True,
    )
    db_session.add(lab_admin)
    await db_session.flush()

    lab = Laboratory(
        name="Digital Fabrication Lab",
        code="LAB-FAB-01",
        department_id=seed_data["department"].id,
        admin_in_charge_id=lab_admin.id,
        location="Ground Floor",
        is_active=True,
    )
    db_session.add(lab)
    await db_session.flush()

    service = LabService(
        lab_id=lab.id,
        service_name="Industrial SLA 3D Printing Service",
        category="Rapid Prototyping",
        service_type=ServiceType.THREE_D_PRINTING,
        description="High-precision resin 3D printing for mechanical gearboxes and enclosures.",
        cost_per_unit=25.0,
        unit_name="gram",
        is_available=True,
    )
    db_session.add(service)
    await db_session.commit()

    admin_token = await get_token_for(client, "labadmin.fab@eng.sjp.ac.lk", "LabAdmin@USJ2026!")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    stu_token = await get_token_for(client, "nuwan.student@eng.sjp.ac.lk", "Student@USJ2026!")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    now = datetime.now(timezone.utc)

    # 1. Student submits service request with requirements, dimensions, preferred date
    req_payload = {
        "service_id": str(service.id),
        "project_title": "Planetary Gearbox Assembly",
        "description": "Epicyclic gear train prototype for electric quadcopter test rig.",
        "dimensions": "120mm x 120mm x 45mm",
        "requested_quantity": 3,
        "preferred_date": (now + timedelta(days=2)).isoformat(),
        "supervisor_name": "Dr. Kamal Perera",
    }
    req_res = await client.post("/api/v1/services/requests", json=req_payload, headers=stu_headers)
    assert req_res.status_code == 201, req_res.text
    req_data = req_res.json()
    assert req_data["status"] == "PENDING"
    request_id = req_data["id"]

    # 2. Lab Admin schedules appointment and adds estimated completion date
    sched_dt = now + timedelta(days=3)
    est_comp_dt = now + timedelta(days=5)
    sched_res = await client.patch(
        f"/api/v1/services/requests/{request_id}/status",
        json={
            "status": "SCHEDULED",
            "scheduled_date": sched_dt.isoformat(),
            "estimated_completion_date": est_comp_dt.isoformat(),
            "admin_notes": "Scheduled on Formlabs Form 3+ Printer B.",
        },
        headers=admin_headers,
    )
    assert sched_res.status_code == 200
    assert sched_res.json()["status"] == "SCHEDULED"

    # 3. Lab Admin marks in-progress
    prog_res = await client.patch(
        f"/api/v1/services/requests/{request_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=admin_headers,
    )
    assert prog_res.status_code == 200
    assert prog_res.json()["status"] == "IN_PROGRESS"

    # 4. Lab Admin completes request and records material charges
    comp_res = await client.patch(
        f"/api/v1/services/requests/{request_id}/status",
        json={
            "status": "COMPLETED",
            "recorded_charges_lkr": 450.0,
            "admin_notes": "Post-curing complete. Ready for collection with receipt.",
        },
        headers=admin_headers,
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["status"] == "COMPLETED"
    assert comp_res.json()["recorded_charges_lkr"] == 450.0
