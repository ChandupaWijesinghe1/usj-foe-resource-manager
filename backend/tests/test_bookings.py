from datetime import datetime, timedelta, timezone
import pytest
from httpx import AsyncClient
from app.models.facility_booking import BookingStatus


@pytest.mark.asyncio
async def test_list_facilities_and_filters(client: AsyncClient, seed_data):
    """Users can list lecture halls and filter by amenities."""
    res = await client.get("/api/v1/halls?has_projector=true&has_ac=true")
    assert res.status_code == 200
    halls = res.json()
    assert len(halls) > 0
    assert any(h["name"] == "Prof. E.O.E. Pereira Theatre" for h in halls)


@pytest.mark.asyncio
async def test_check_availability_preflight(client: AsyncClient, seed_data):
    """Pre-flight check returns true for free time slot."""
    hall_id = str(seed_data["facility"].id)
    start = (datetime.now(timezone.utc) + timedelta(days=2, hours=9)).isoformat()
    end = (datetime.now(timezone.utc) + timedelta(days=2, hours=11)).isoformat()

    res = await client.post(
        "/api/v1/bookings/check-availability",
        json={"facility_id": hall_id, "start_time": start, "end_time": end},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["available"] is True


@pytest.mark.asyncio
async def test_student_submits_booking_and_clash_prevention(client: AsyncClient, seed_data):
    """Students submit booking request; subsequent overlapping requests are rejected with 409 Conflict."""
    # 1. Student logs in
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
    )
    stu_token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {stu_token}"}

    hall_id = str(seed_data["facility"].id)
    slot_start = datetime.now(timezone.utc) + timedelta(days=3, hours=10)
    slot_end = slot_start + timedelta(hours=2)

    # 2. Submit booking request
    booking_payload = {
        "facility_id": hall_id,
        "title": "IEEE Student Branch Tech Talk",
        "purpose": "Artificial Intelligence Workshop for 2nd Year Engineers",
        "event_description": "Guest talk by industry specialists on machine learning deployments.",
        "attendee_count": 80,
        "start_time": slot_start.isoformat(),
        "end_time": slot_end.isoformat(),
        "document_name": "dean_approval_letter.pdf",
        "document_url": "/uploads/documents/sample_letter.pdf",
    }

    res = await client.post("/api/v1/bookings", json=booking_payload, headers=headers)
    assert res.status_code == 201
    booking_data = res.json()
    assert booking_data["status"] == "PENDING"
    assert booking_data["attendee_count"] == 80
    assert booking_data["event_description"] is not None
    booking_id = booking_data["id"]

    # 3. Another request for an overlapping interval must be blocked (Prevent Overlapping Bookings)
    overlap_start = slot_start + timedelta(minutes=30)
    overlap_end = slot_end + timedelta(hours=1)

    clash_payload = {
        "facility_id": hall_id,
        "title": "Conflicting Event",
        "purpose": "Robotics Club General Assembly",
        "attendee_count": 50,
        "start_time": overlap_start.isoformat(),
        "end_time": overlap_end.isoformat(),
    }

    clash_res = await client.post("/api/v1/bookings", json=clash_payload, headers=headers)
    assert clash_res.status_code == 409
    assert "scheduling conflict" in clash_res.json()["error"]["message"]

    # 4. Check preflight availability also detects conflict
    check_res = await client.post(
        "/api/v1/bookings/check-availability",
        json={"facility_id": hall_id, "start_time": overlap_start.isoformat(), "end_time": overlap_end.isoformat()},
    )
    assert check_res.status_code == 200
    assert check_res.json()["available"] is False


@pytest.mark.asyncio
async def test_exceeding_capacity_rejected(client: AsyncClient, seed_data):
    """Booking requests with attendee counts larger than hall capacity are rejected."""
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
    )
    headers = {"Authorization": f"Bearer {login_res.json()['access_token']}"}

    hall = seed_data["facility"]
    slot_start = datetime.now(timezone.utc) + timedelta(days=5, hours=8)
    slot_end = slot_start + timedelta(hours=2)

    res = await client.post(
        "/api/v1/bookings",
        headers=headers,
        json={
            "facility_id": str(hall.id),
            "title": "Mega Gathering",
            "purpose": "All-faculty gathering",
            "attendee_count": hall.capacity + 500,  # Exceeds max capacity
            "start_time": slot_start.isoformat(),
            "end_time": slot_end.isoformat(),
        },
    )
    assert res.status_code == 400
    assert "exceeds maximum capacity" in res.json()["error"]["message"]


@pytest.mark.asyncio
async def test_facility_admin_approves_and_rejects(client: AsyncClient, seed_data):
    """Facility Admin can review, approve, and reject bookings with reason."""
    # 1. Student creates booking
    stu_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
    )
    stu_headers = {"Authorization": f"Bearer {stu_login.json()['access_token']}"}

    hall_id = str(seed_data["facility"].id)
    slot_start = datetime.now(timezone.utc) + timedelta(days=6, hours=14)
    slot_end = slot_start + timedelta(hours=2)

    booking_res = await client.post(
        "/api/v1/bookings",
        headers=stu_headers,
        json={
            "facility_id": hall_id,
            "title": "Civil Eng Seminar",
            "purpose": "Structural Integrity Symposium",
            "attendee_count": 60,
            "start_time": slot_start.isoformat(),
            "end_time": slot_end.isoformat(),
        },
    )
    booking_id = booking_res.json()["id"]

    # 2. Student cannot approve own booking (403 Forbidden)
    stu_approve = await client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        headers=stu_headers,
        json={"status": "APPROVED"},
    )
    assert stu_approve.status_code == 403

    # 3. Super Admin / Facility Admin logs in
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["admin"].email, "password": "Admin@USJ2026!"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    # 4. Admin approves booking
    approve_res = await client.patch(
        f"/api/v1/bookings/{booking_id}/status",
        headers=admin_headers,
        json={"status": "APPROVED"},
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "APPROVED"
    assert approve_res.json()["approved_by"] is not None

    # 5. Admin rejects a booking with reason
    slot2_start = datetime.now(timezone.utc) + timedelta(days=7, hours=10)
    slot2_end = slot2_start + timedelta(hours=2)
    booking2_res = await client.post(
        "/api/v1/bookings",
        headers=stu_headers,
        json={
            "facility_id": hall_id,
            "title": "Late Night Music Jam",
            "purpose": "Band Rehearsal",
            "attendee_count": 25,
            "start_time": slot2_start.isoformat(),
            "end_time": slot2_end.isoformat(),
        },
    )
    booking2_id = booking2_res.json()["id"]

    reject_res = await client.patch(
        f"/api/v1/bookings/{booking2_id}/status",
        headers=admin_headers,
        json={"status": "REJECTED", "rejection_reason": "No amplified instruments allowed in lecture theatres."},
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "REJECTED"
    assert "No amplified instruments" in reject_res.json()["rejection_reason"]


@pytest.mark.asyncio
async def test_student_cancels_booking(client: AsyncClient, seed_data):
    """Students can cancel their pending booking."""
    stu_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["student"].email, "password": "Student@USJ2026!"},
    )
    headers = {"Authorization": f"Bearer {stu_login.json()['access_token']}"}

    hall_id = str(seed_data["facility"].id)
    slot_start = datetime.now(timezone.utc) + timedelta(days=8, hours=9)
    slot_end = slot_start + timedelta(hours=1)

    booking = await client.post(
        "/api/v1/bookings",
        headers=headers,
        json={
            "facility_id": hall_id,
            "title": "Study Group",
            "purpose": "Exam Prep",
            "attendee_count": 10,
            "start_time": slot_start.isoformat(),
            "end_time": slot_end.isoformat(),
        },
    )
    b_id = booking.json()["id"]

    # Cancel booking
    cancel_res = await client.patch(f"/api/v1/bookings/{b_id}/cancel", headers=headers)
    assert cancel_res.status_code == 200
    assert cancel_res.json()["status"] == "CANCELLED"


@pytest.mark.asyncio
async def test_hall_schedule_and_maintenance_block(client: AsyncClient, seed_data):
    """Admin can place a maintenance block and schedule returns occupied slots."""
    admin_login = await client.post(
        "/api/v1/auth/login",
        json={"email": seed_data["admin"].email, "password": "Admin@USJ2026!"},
    )
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}
    hall_id = str(seed_data["facility"].id)

    m_start = datetime.now(timezone.utc) + timedelta(days=10, hours=8)
    m_end = m_start + timedelta(hours=8)

    # Place maintenance block
    block_res = await client.post(
        f"/api/v1/halls/{hall_id}/maintenance",
        headers=admin_headers,
        json={
            "reason": "HVAC and Central AC Duct Cleaning",
            "start_time": m_start.isoformat(),
            "end_time": m_end.isoformat(),
        },
    )
    assert block_res.status_code == 201
    assert block_res.json()["is_maintenance_block"] is True

    # Query schedule for this interval
    schedule_res = await client.get(
        f"/api/v1/halls/{hall_id}/schedule",
        params={
            "start_date": (m_start - timedelta(days=1)).isoformat(),
            "end_date": (m_end + timedelta(days=1)).isoformat(),
        },
    )
    assert schedule_res.status_code == 200
    slots = schedule_res.json()
    assert len(slots) >= 1
    assert any(s["is_maintenance"] is True for s in slots)
