import io
from datetime import date, datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.equipment import Equipment, EquipmentCondition
from app.models.equipment_borrow import EquipmentBorrow
from app.models.laboratory import Laboratory
from app.models.lab_service import LabService, ServiceType
from app.models.service_request import ServiceRequest, ServiceStatus
from app.models.user import User, UserRole


@pytest.mark.asyncio
async def test_complete_end_to_end_9_core_workflows(
    client: AsyncClient,
    db_session: AsyncSession,
    seed_data: dict,
):
    """
    Executes a comprehensive end-to-end integration test executing all 9 core workflows
    across Student, Lecturer, Facility Admin, Lab Admin, and Super Admin roles:
      1. Student registration & email verification & login
      2. Student lecture hall booking
      3. Facility Admin approval & conflict enforcement
      4. Student lecturer meeting request
      5. Lecturer meeting approval
      6. Student equipment borrowing
      7. Lab Admin equipment issuance & return inspection
      8. Student 3D printing lab service request
      9. Lab Admin service scheduling & completion
    """
    dept = seed_data["department"]
    fac = seed_data["facility"]
    lec = seed_data["lecturer"]

    # =========================================================================
    # WORKFLOW 1: Student Registration and Login
    # =========================================================================
    reg_payload = {
        "email": "kasun.fernando@eng.sjp.ac.lk",
        "full_name": "Kasun Fernando",
        "registration_number": "EG/2021/4999",
        "department_id": str(dept.id),
        "password": "Password@USJ2026!",
    }
    reg_resp = await client.post("/api/v1/auth/register/student", json=reg_payload)
    assert reg_resp.status_code == 201, reg_resp.text
    verify_token = reg_resp.json()["token"]

    verif_resp = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": verify_token},
    )
    assert verif_resp.status_code == 200

    # Student logs in
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "kasun.fernando@eng.sjp.ac.lk", "password": "Password@USJ2026!"},
    )
    assert login_resp.status_code == 200
    student_token = login_resp.json()["access_token"]
    student_headers = {"Authorization": f"Bearer {student_token}"}

    # Admin logs in
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["admin"].email, "password": "Admin@USJ2026!"},
    )
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # Lecturer logs in
    lec_login = await client.post(
        "/api/v1/auth/login",
        json={"email": lec.email, "password": "Lecturer@USJ2026!"},
    )
    lec_token = lec_login.json()["access_token"]
    lec_headers = {"Authorization": f"Bearer {lec_token}"}

    # =========================================================================
    # WORKFLOW 2: Student Lecture Hall Booking
    # =========================================================================
    hall_start = datetime.now(timezone.utc) + timedelta(days=5, hours=9)
    hall_end = hall_start + timedelta(hours=3)

    # 1. Preflight check
    precheck = await client.post(
        "/api/v1/bookings/check-availability",
        json={
            "facility_id": str(fac.id),
            "start_time": hall_start.isoformat(),
            "end_time": hall_end.isoformat(),
        },
    )
    assert precheck.status_code == 200
    assert precheck.json()["available"] is True

    # 2. Upload supporting doc
    doc_file = ("symposium_approval.pdf", io.BytesIO(b"%PDF-1.4 test document"), "application/pdf")
    upload_resp = await client.post(
        "/api/v1/bookings/upload-document",
        files={"file": doc_file},
        headers=student_headers,
    )
    assert upload_resp.status_code == 201
    doc_url = upload_resp.json()["url"]

    # 3. Create booking
    booking_req = {
        "facility_id": str(fac.id),
        "title": "Faculty Robotics & AI Symposium 2026",
        "purpose": "Annual technical symposium presenting undergraduate research prototypes.",
        "event_description": "Organized by Electronic & Telecommunication Engineering Society.",
        "start_time": hall_start.isoformat(),
        "end_time": hall_end.isoformat(),
        "attendee_count": 120,
        "document_url": doc_url,
    }
    booking_resp = await client.post("/api/v1/bookings", json=booking_req, headers=student_headers)
    assert booking_resp.status_code == 201
    booking_id = booking_resp.json()["id"]
    assert booking_resp.json()["status"] == "PENDING"

    # =========================================================================
    # WORKFLOW 3: Facility Admin Approval
    # =========================================================================
    approval_resp = await client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        json={"status": "APPROVED"},
        headers=admin_headers,
    )
    assert approval_resp.status_code == 200
    assert approval_resp.json()["status"] == "APPROVED"

    # Check clash prevention on approved booking
    conflict_booking_req = {
        "facility_id": str(fac.id),
        "title": "Conflicting Workshop",
        "purpose": "Overlapping booking attempt.",
        "start_time": (hall_start + timedelta(hours=1)).isoformat(),
        "end_time": (hall_end + timedelta(hours=1)).isoformat(),
        "attendee_count": 50,
    }
    conflict_resp = await client.post("/api/v1/bookings", json=conflict_booking_req, headers=student_headers)
    assert conflict_resp.status_code == 409

    # =========================================================================
    # WORKFLOW 4: Student Lecturer Meeting Request
    # =========================================================================
    # Lecturer publishes recurring consultation slot
    slot_dow = (date.today().weekday() + 2) % 7
    days_ahead = (slot_dow - date.today().weekday()) % 7
    if days_ahead == 0:
        days_ahead = 7
    target_meeting_date = date.today() + timedelta(days=days_ahead)

    create_slot_resp = await client.post(
        "/api/v1/lecturers/me/availability",
        json={
            "day_of_week": slot_dow,
            "start_time": "14:00:00",
            "end_time": "15:30:00",
            "slot_duration_minutes": 30,
            "location_type": "PHYSICAL_OFFICE",
            "room_or_link": "Department of Computer Engineering, Room CE-304",
            "max_students_per_slot": 1,
            "is_active": True,
        },
        headers=lec_headers,
    )
    assert create_slot_resp.status_code == 201
    slot_id = create_slot_resp.json()["id"]

    # Student requests consultation appointment
    meeting_req = {
        "lecturer_id": str(lec.id),
        "availability_slot_id": slot_id,
        "meeting_date": target_meeting_date.isoformat(),
        "start_time": "14:00:00",
        "end_time": "14:30:00",
        "subject": "Final Year Capstone Project Consultation",
        "agenda": "Discussing deep learning architecture for embedded robotics pipeline.",
    }
    meeting_resp = await client.post("/api/v1/meetings", json=meeting_req, headers=student_headers)
    assert meeting_resp.status_code == 201
    meeting_id = meeting_resp.json()["id"]
    assert meeting_resp.json()["meeting_status"] == "PENDING"

    # =========================================================================
    # WORKFLOW 5: Lecturer Approval
    # =========================================================================
    lec_accept_resp = await client.patch(
        f"/api/v1/meetings/{meeting_id}/status",
        json={"meeting_status": "ACCEPTED", "lecturer_notes": "Confirmed. Please bring your circuit schematics."},
        headers=lec_headers,
    )
    assert lec_accept_resp.status_code == 200
    assert lec_accept_resp.json()["meeting_status"] == "ACCEPTED"

    # =========================================================================
    # WORKFLOW 6: Student Equipment Borrowing
    # =========================================================================
    test_lab = Laboratory(
        name="Embedded Systems and Robotics Laboratory",
        code="LAB-EMBEDDED",
        department_id=dept.id,
        admin_in_charge_id=seed_data["admin"].id,
        location="Level 2, DCE Wing",
        is_active=True,
    )
    db_session.add(test_lab)
    await db_session.flush()

    test_equipment = Equipment(
        lab_id=test_lab.id,
        name="Raspberry Pi 4 Model B (8GB)",
        model_number="RPI4-8GB",
        serial_number="RPI-2026-9901",
        category="Microcontrollers",
        total_quantity=10,
        available_quantity=10,
        is_borrowable=True,
    )
    db_session.add(test_equipment)
    await db_session.commit()

    borrow_start = date.today() + timedelta(days=2)
    borrow_end = borrow_start + timedelta(days=7)

    borrow_req = {
        "equipment_id": str(test_equipment.id),
        "quantity": 2,
        "purpose": "Hardware sensor interface testing for embedded robotics course project.",
        "expected_borrow_date": borrow_start.isoformat(),
        "expected_return_date": borrow_end.isoformat(),
    }
    borrow_resp = await client.post("/api/v1/equipment/borrows", json=borrow_req, headers=student_headers)
    assert borrow_resp.status_code == 201
    borrow_id = borrow_resp.json()["id"]
    assert borrow_resp.json()["status"] == "PENDING"

    # =========================================================================
    # WORKFLOW 7: Lab Admin Equipment Issuance and Return
    # =========================================================================
    # 1. Lab Admin approves borrow request -> inventory decrements to 8
    borrow_approve_resp = await client.patch(
        f"/api/v1/equipment/borrows/{borrow_id}/status",
        json={
            "status": "APPROVED",
            "collection_instructions": "Collect from Lab Technician at Room CE-102 between 9am-12pm.",
        },
        headers=admin_headers,
    )
    assert borrow_approve_resp.status_code == 200
    assert borrow_approve_resp.json()["status"] == "APPROVED"

    eq_after_appr = (await db_session.execute(select(Equipment).where(Equipment.id == test_equipment.id))).scalar_one()
    assert eq_after_appr.available_quantity == 8

    # 2. Lab Admin records physical issuance
    issue_resp = await client.patch(
        f"/api/v1/equipment/borrows/{borrow_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=admin_headers,
    )
    assert issue_resp.status_code == 200
    assert issue_resp.json()["status"] == "IN_PROGRESS"

    # 3. Student confirms return handover
    return_confirm = await client.post(
        f"/api/v1/equipment/borrows/{borrow_id}/confirm-return",
        headers=student_headers,
    )
    assert return_confirm.status_code == 200
    assert return_confirm.json()["student_confirmed_return"] is True

    # 4. Lab Admin inspects equipment and marks complete -> inventory restored to 10
    complete_borrow_resp = await client.patch(
        f"/api/v1/equipment/borrows/{borrow_id}/status",
        json={"status": "COMPLETED", "is_damaged_or_missing": False, "condition_on_return": "Good condition"},
        headers=admin_headers,
    )
    assert complete_borrow_resp.status_code == 200
    assert complete_borrow_resp.json()["status"] == "COMPLETED"

    eq_after_return = (await db_session.execute(select(Equipment).where(Equipment.id == test_equipment.id))).scalar_one()
    assert eq_after_return.available_quantity == 10

    # =========================================================================
    # WORKFLOW 8: Student 3D Printing Lab Service Request
    # =========================================================================
    test_service = LabService(
        lab_id=test_lab.id,
        service_name="Ultimaker S5 Dual Extruder 3D Printing",
        description="High precision FDM 3D printing in PLA, ABS, and PETG.",
        category="3D Printing & Prototyping",
        service_type=ServiceType.THREE_D_PRINTING,
        is_active=True,
        is_available=True,
    )
    db_session.add(test_service)
    await db_session.commit()

    cad_file_data = ("quadcopter_chassis.stl", io.BytesIO(b"solid quadcopter_chassis\nendsolid"), "application/octet-stream")
    print_job_resp = await client.post(
        "/api/v1/services/requests/3d-print",
        data={
            "service_id": str(test_service.id),
            "project_title": "Autonomous Quadcopter Lightweight Chassis",
            "description": "Need high infill density for structural strength on drone arm mounts.",
            "material_type": "PLA",
            "color": "Matte Black",
            "infill_percentage": "35",
            "supervisor_name": "Dr. Kamal Perera",
        },
        files={"cad_file": cad_file_data},
        headers=student_headers,
    )
    assert print_job_resp.status_code == 201
    print_job_id = print_job_resp.json()["id"]
    assert print_job_resp.json()["status"] == "PENDING"
    assert print_job_resp.json()["project_title"] == "Autonomous Quadcopter Lightweight Chassis"

    # =========================================================================
    # WORKFLOW 9: Lab Admin Service Completion
    # =========================================================================
    # 1. Schedule appointment
    sched_resp = await client.patch(
        f"/api/v1/services/requests/{print_job_id}/status",
        json={
            "status": "SCHEDULED",
            "admin_notes": "Queued for slicing on Cura and printing on Printer #3.",
            "estimated_completion_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
        },
        headers=admin_headers,
    )
    assert sched_resp.status_code == 200
    assert sched_resp.json()["status"] == "SCHEDULED"

    # 2. Mark in progress
    in_prog_resp = await client.patch(
        f"/api/v1/services/requests/{print_job_id}/status",
        json={"status": "IN_PROGRESS"},
        headers=admin_headers,
    )
    assert in_prog_resp.status_code == 200
    assert in_prog_resp.json()["status"] == "IN_PROGRESS"

    # 3. Mark completed with cost charges in LKR
    complete_service_resp = await client.patch(
        f"/api/v1/services/requests/{print_job_id}/status",
        json={
            "status": "COMPLETED",
            "admin_notes": "Print completed cleanly without warpage. 185g PLA used.",
            "recorded_charges_lkr": 2500.0,
        },
        headers=admin_headers,
    )
    assert complete_service_resp.status_code == 200
    assert complete_service_resp.json()["status"] == "COMPLETED"
    assert complete_service_resp.json()["recorded_charges_lkr"] == 2500.0

    # Verify student request history reflects all completed items
    stu_borrows_resp = await client.get("/api/v1/equipment/borrows", headers=student_headers)
    assert stu_borrows_resp.status_code == 200
    assert any(b["id"] == borrow_id for b in stu_borrows_resp.json())

    stu_services_resp = await client.get("/api/v1/services/requests/me", headers=student_headers)
    assert stu_services_resp.status_code == 200
    assert any(s["id"] == print_job_id for s in stu_services_resp.json())
