import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.laboratory import Laboratory
from app.models.lab_service import LabService, ServiceType
from app.models.notification import Notification
from app.models.service_request import ServiceRequest, ServiceStatus
from app.models.user import User, UserRole
from app.core.security import get_password_hash


async def get_token_for(client: AsyncClient, email: str, password: str) -> str:
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert res.status_code == 200, res.text
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_laboratory_profile_management(client: AsyncClient, seed_data: dict, db_session: AsyncSession):
    # Create a Lab Admin user
    lab_admin = User(
        email="labadmin.dce@eng.sjp.ac.lk",
        hashed_password=get_password_hash("LabAdmin@USJ2026!"),
        full_name="Eng. Bandara (Lab Admin)",
        role=UserRole.LAB_ADMIN,
        department_id=seed_data["department"].id,
        is_active=True,
        is_verified=True,
    )
    db_session.add(lab_admin)
    await db_session.commit()

    admin_token = await get_token_for(client, "labadmin.dce@eng.sjp.ac.lk", "LabAdmin@USJ2026!")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    stu_token = await get_token_for(client, "nuwan.student@eng.sjp.ac.lk", "Student@USJ2026!")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # 1. Student cannot create laboratory
    fail_res = await client.post(
        "/api/v1/laboratories",
        json={
            "name": "Embedded Systems Lab",
            "code": "LAB-ES-01",
            "department_id": str(seed_data["department"].id),
            "location": "Room 304, Level 3",
        },
        headers=stu_headers,
    )
    assert fail_res.status_code == 403

    # 2. Lab Admin creates laboratory
    lab_payload = {
        "name": "Makerspace & Embedded Systems Lab",
        "code": "LAB-MAKER-01",
        "department_id": str(seed_data["department"].id),
        "admin_in_charge_id": str(lab_admin.id),
        "location": "Level 3, DCE Complex",
        "description": "Rapid prototyping, microcontroller programming, and PCB testing facility.",
        "operating_hours": "8:30 AM - 5:00 PM",
        "contact_email": "makerspace@eng.sjp.ac.lk",
        "contact_phone": "+94 11 280 2000 Ext 450",
        "safety_guidelines": "ESD protection required. Closed-toe shoes mandatory.",
    }
    create_res = await client.post("/api/v1/laboratories", json=lab_payload, headers=admin_headers)
    assert create_res.status_code == 201, create_res.text
    lab_data = create_res.json()
    assert lab_data["code"] == "LAB-MAKER-01"
    lab_id = lab_data["id"]

    # 3. Lab Admin updates laboratory
    update_res = await client.put(
        f"/api/v1/laboratories/{lab_id}",
        json={"location": "Level 3, East Wing DCE Complex"},
        headers=admin_headers,
    )
    assert update_res.status_code == 200
    assert update_res.json()["location"] == "Level 3, East Wing DCE Complex"

    # 4. Public/student can view laboratory details
    get_res = await client.get(f"/api/v1/laboratories/{lab_id}")
    assert get_res.status_code == 200
    assert get_res.json()["name"] == "Makerspace & Embedded Systems Lab"


@pytest.mark.asyncio
async def test_services_and_equipment_directory(client: AsyncClient, seed_data: dict, db_session: AsyncSession):
    # Setup Lab Admin and Laboratory
    lab_admin = User(
        email="labadmin.maker@eng.sjp.ac.lk",
        hashed_password=get_password_hash("LabAdmin@USJ2026!"),
        full_name="Dr. Nimal (Lab Head)",
        role=UserRole.LAB_ADMIN,
        department_id=seed_data["department"].id,
        is_active=True,
        is_verified=True,
    )
    db_session.add(lab_admin)
    await db_session.flush()

    lab = Laboratory(
        name="Prototyping & Electronics Lab",
        code="LAB-PROTO-01",
        department_id=seed_data["department"].id,
        admin_in_charge_id=lab_admin.id,
        location="Ground Floor, Mech Block",
        description="Comprehensive electronics development, sensor integration, and 3D printing.",
        contact_email="proto-lab@eng.sjp.ac.lk",
        contact_phone="+94 11 280 3300",
        is_active=True,
    )
    db_session.add(lab)
    await db_session.commit()

    admin_token = await get_token_for(client, "labadmin.maker@eng.sjp.ac.lk", "LabAdmin@USJ2026!")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    stu_token = await get_token_for(client, "nuwan.student@eng.sjp.ac.lk", "Student@USJ2026!")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # 1. Publish Microcontroller item (Arduino Mega 2560)
    arduino_payload = {
        "lab_id": str(lab.id),
        "service_name": "Arduino Mega 2560 Prototyping Board",
        "category": "Microcontrollers",
        "service_type": "ELECTRONIC_COMPONENTS",
        "description": "ATmega2560 development board with 54 digital I/O pins and 16 analog inputs.",
        "turnaround_time_days": 7,
        "cost_per_unit": 0.0,
        "unit_name": "board",
        "total_quantity": 20,
        "available_quantity": 18,
        "is_available": True,
        "usage_instructions": "Program via Arduino IDE using ATmega2560 board profile.",
        "borrowing_conditions": "Max borrow duration 14 days. Must return in original ESD container.",
    }
    arduino_res = await client.post("/api/v1/services", json=arduino_payload, headers=admin_headers)
    assert arduino_res.status_code == 201
    arduino_id = arduino_res.json()["id"]

    # 2. Publish Raspberry Pi 4 Device
    rpi_payload = {
        "lab_id": str(lab.id),
        "service_name": "Raspberry Pi 4 Model B (4GB)",
        "category": "Embedded Systems",
        "service_type": "EQUIPMENT_LOAN",
        "description": "Quad-core Cortex-A72 SBC with dual 4K micro-HDMI and Gigabit Ethernet.",
        "turnaround_time_days": 14,
        "cost_per_unit": 0.0,
        "unit_name": "kit",
        "total_quantity": 12,
        "available_quantity": 10,
        "is_available": True,
        "usage_instructions": "Pre-installed Raspberry Pi OS 64-bit on high-speed microSD.",
        "borrowing_conditions": "Faculty supervisor endorsement required. Return all peripherals.",
    }
    rpi_res = await client.post("/api/v1/services", json=rpi_payload, headers=admin_headers)
    assert rpi_res.status_code == 201

    # 3. Publish 3D Printing Facility Service
    print_payload = {
        "lab_id": str(lab.id),
        "service_name": "Ultimaker Dual Extrusion 3D Printing",
        "category": "Rapid Prototyping",
        "service_type": "THREE_D_PRINTING",
        "description": "High-precision FDM 3D printing with PLA, ABS, and soluble PVA support.",
        "turnaround_time_days": 3,
        "cost_per_unit": 15.0,
        "unit_name": "gram",
        "is_available": True,
        "usage_instructions": "Submit verified watertight STL or STEP file with infill percentage.",
        "borrowing_conditions": "Academic projects free up to 100g; additional filament at Rs. 15/g.",
    }
    print_res = await client.post("/api/v1/services", json=print_payload, headers=admin_headers)
    assert print_res.status_code == 201

    # 4. Student searches directory by keyword
    search_res = await client.get("/api/v1/services/directory?search=Arduino")
    assert search_res.status_code == 200
    search_data = search_res.json()
    assert len(search_data) == 1
    assert "Arduino Mega" in search_data[0]["service_name"]
    assert search_data[0]["laboratory"]["name"] == "Prototyping & Electronics Lab"
    assert search_data[0]["laboratory"]["contact_email"] == "proto-lab@eng.sjp.ac.lk"

    # 5. Student filters directory by category
    cat_res = await client.get("/api/v1/services/directory?category=Rapid Prototyping")
    assert cat_res.status_code == 200
    assert len(cat_res.json()) == 1
    assert "3D Printing" in cat_res.json()[0]["service_name"]

    # 6. Student requests an Arduino board
    request_payload = {
        "service_id": arduino_id,
        "project_title": "Automated Greenhouse Monitoring System",
        "supervisor_name": "Dr. Kamal Perera",
        "description": "Need Arduino Mega for sensor array telemetry (DHT22, soil moisture, light).",
        "requested_quantity": 2,
    }
    req_res = await client.post("/api/v1/services/requests", json=request_payload, headers=stu_headers)
    assert req_res.status_code == 201, req_res.text
    req_data = req_res.json()
    assert req_data["status"] == "PENDING"
    request_id = req_data["id"]

    # Verify notification sent to lab admin
    notif_query = select(Notification).where(
        Notification.user_id == lab_admin.id,
        Notification.reference_id == uuid.UUID(request_id)
    )
    notif = (await db_session.execute(notif_query)).scalar_one_or_none()
    assert notif is not None
    assert "Nuwan Bandara" in notif.message

    # 7. Lab Admin updates request status to APPROVED
    status_update = {
        "status": "APPROVED",
        "admin_notes": "Kit prepared and tested. Pick up from Workbench #3 with student ID.",
    }
    status_res = await client.patch(
        f"/api/v1/services/requests/{request_id}/status",
        json=status_update,
        headers=admin_headers,
    )
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "APPROVED"

    # Verify student received notification
    stu_notif_query = select(Notification).where(
        Notification.user_id == seed_data["student"].id,
        Notification.reference_id == uuid.UUID(request_id)
    )
    stu_notif = (await db_session.execute(stu_notif_query)).scalar_one_or_none()
    assert stu_notif is not None
    assert "APPROVED" in stu_notif.message

    # 8. Student views their own submitted requests
    my_requests_res = await client.get("/api/v1/services/requests/my-requests", headers=stu_headers)
    assert my_requests_res.status_code == 200
    assert len(my_requests_res.json()) >= 1
    assert my_requests_res.json()[0]["project_title"] == "Automated Greenhouse Monitoring System"
