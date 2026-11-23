from datetime import date, timedelta
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification
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
async def test_browse_lecturers_with_search_and_filters(client: AsyncClient, seed_data: dict, db_session: AsyncSession):
    # Add a second lecturer in another department
    lecturer2 = User(
        email="prof.nimal@eng.sjp.ac.lk",
        hashed_password=get_password_hash("Lecturer@USJ2026!"),
        full_name="Prof. Nimal Senanayake",
        role=UserRole.LECTURER,
        is_active=True,
        is_verified=True,
    )
    db_session.add(lecturer2)
    await db_session.commit()

    # List all lecturers
    res = await client.get("/api/v1/lecturers")
    assert res.status_code == 200
    lecturers = res.json()
    assert len(lecturers) >= 2

    # Search by name
    res_search = await client.get("/api/v1/lecturers?search=Kamal")
    assert res_search.status_code == 200
    search_results = res_search.json()
    assert len(search_results) == 1
    assert "Kamal" in search_results[0]["full_name"]

    # Filter by department
    dept_id = str(seed_data["department"].id)
    res_dept = await client.get(f"/api/v1/lecturers?department_id={dept_id}")
    assert res_dept.status_code == 200
    dept_results = res_dept.json()
    assert all(lec["department_id"] == dept_id for lec in dept_results)


@pytest.mark.asyncio
async def test_lecturer_availability_lifecycle(client: AsyncClient, seed_data: dict):
    lec_token = await get_token_for(client, "lecturer.kamal@eng.sjp.ac.lk", "Lecturer@USJ2026!")
    lec_headers = {"Authorization": f"Bearer {lec_token}"}

    # 1. Lecturer creates recurring office hours slot
    slot_payload = {
        "day_of_week": 2,  # Wednesday
        "start_time": "09:00:00",
        "end_time": "11:00:00",
        "slot_duration_minutes": 30,
        "location_type": "PHYSICAL_OFFICE",
        "room_or_link": "Room 204, Mechanical Block",
        "max_students_per_slot": 1,
        "is_active": True,
    }
    create_res = await client.post("/api/v1/lecturers/me/availability", json=slot_payload, headers=lec_headers)
    assert create_res.status_code == 201, create_res.text
    slot_data = create_res.json()
    assert slot_data["day_of_week"] == 2
    assert slot_data["start_time"] == "09:00:00"
    slot_id = slot_data["id"]

    # 2. Overlapping slot creation rejected
    overlap_payload = {
        "day_of_week": 2,
        "start_time": "10:00:00",
        "end_time": "12:00:00",
        "slot_duration_minutes": 30,
        "location_type": "ONLINE_CALL",
        "room_or_link": "https://meet.google.com/test",
    }
    overlap_res = await client.post("/api/v1/lecturers/me/availability", json=overlap_payload, headers=lec_headers)
    assert overlap_res.status_code == 400
    assert "overlapping" in overlap_res.text.lower()

    # 3. Lecturer edits slot
    update_payload = {
        "room_or_link": "Room 205, Main Block",
        "slot_duration_minutes": 20,
    }
    update_res = await client.put(f"/api/v1/lecturers/me/availability/{slot_id}", json=update_payload, headers=lec_headers)
    assert update_res.status_code == 200
    assert update_res.json()["room_or_link"] == "Room 205, Main Block"
    assert update_res.json()["slot_duration_minutes"] == 20

    # 4. Lecturer retrieves their own availability
    my_avail = await client.get("/api/v1/lecturers/me/availability", headers=lec_headers)
    assert my_avail.status_code == 200
    assert len(my_avail.json()) == 1

    # 5. Lecturer deletes slot
    del_res = await client.delete(f"/api/v1/lecturers/me/availability/{slot_id}", headers=lec_headers)
    assert del_res.status_code == 204

    # Verify deleted
    my_avail_after = await client.get("/api/v1/lecturers/me/availability", headers=lec_headers)
    assert len(my_avail_after.json()) == 0


@pytest.mark.asyncio
async def test_discrete_slot_generation_and_student_booking(client: AsyncClient, seed_data: dict, db_session: AsyncSession):
    lec_token = await get_token_for(client, "lecturer.kamal@eng.sjp.ac.lk", "Lecturer@USJ2026!")
    lec_headers = {"Authorization": f"Bearer {lec_token}"}

    stu_token = await get_token_for(client, "nuwan.student@eng.sjp.ac.lk", "Student@USJ2026!")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    # Find a future date that is a Wednesday (day_of_week=2)
    today = date.today()
    days_ahead = (2 - today.weekday()) % 7
    if days_ahead <= 0:
        days_ahead += 7
    target_wednesday = today + timedelta(days=days_ahead)

    # 1. Lecturer creates office hours on Wednesday from 10:00 to 11:30 (30 min slots = 3 slots)
    slot_payload = {
        "day_of_week": 2,
        "start_time": "10:00:00",
        "end_time": "11:30:00",
        "slot_duration_minutes": 30,
        "location_type": "PHYSICAL_OFFICE",
        "room_or_link": "Room 301, Admin Block",
        "max_students_per_slot": 1,
        "is_active": True,
    }
    slot_res = await client.post("/api/v1/lecturers/me/availability", json=slot_payload, headers=lec_headers)
    assert slot_res.status_code == 201
    slot_id = slot_res.json()["id"]
    lecturer_id = str(seed_data["lecturer"].id)

    # 2. Student queries available discrete slots for target Wednesday
    slots_res = await client.get(
        f"/api/v1/lecturers/{lecturer_id}/available-slots?date={target_wednesday.isoformat()}"
    )
    assert slots_res.status_code == 200
    slots = slots_res.json()
    assert len(slots) == 3
    assert slots[0]["start_time"] == "10:00:00"
    assert slots[0]["end_time"] == "10:30:00"
    assert slots[0]["is_available"] is True

    # 3. Student requests a meeting for the first slot (10:00 - 10:30)
    meeting_payload = {
        "lecturer_id": lecturer_id,
        "availability_slot_id": slot_id,
        "meeting_date": target_wednesday.isoformat(),
        "start_time": "10:00:00",
        "end_time": "10:30:00",
        "subject": "Final Year Project Consultation",
        "agenda": "Discussing deep learning architecture and dataset selection.",
    }
    req_res = await client.post("/api/v1/meetings", json=meeting_payload, headers=stu_headers)
    assert req_res.status_code == 201, req_res.text
    meeting_data = req_res.json()
    assert meeting_data["meeting_status"] == "PENDING"
    meeting_id = meeting_data["id"]

    # Verify notification was sent to lecturer
    notif_query = select(Notification).where(
        Notification.user_id == seed_data["lecturer"].id,
        Notification.reference_id == uuid.UUID(meeting_data["id"])
    )
    notif = (await db_session.execute(notif_query)).scalar_one_or_none()
    assert notif is not None
    assert "Nuwan Bandara" in notif.message

    # 4. Check that slot (10:00 - 10:30) is now marked is_available: false
    slots_res_after = await client.get(
        f"/api/v1/lecturers/{lecturer_id}/available-slots?date={target_wednesday.isoformat()}"
    )
    assert slots_res_after.status_code == 200
    slots_after = slots_res_after.json()
    assert slots_after[0]["is_available"] is False
    assert slots_after[1]["is_available"] is True

    # 5. Attempting to book the same slot again results in 409 Conflict
    duplicate_res = await client.post("/api/v1/meetings", json=meeting_payload, headers=stu_headers)
    assert duplicate_res.status_code == 409
    assert "already" in duplicate_res.text.lower()

    # 6. Lecturer accepts the meeting
    accept_payload = {
        "meeting_status": "ACCEPTED",
        "lecturer_notes": "Please bring your literature review draft with you.",
    }
    accept_res = await client.patch(f"/api/v1/meetings/{meeting_id}/status", json=accept_payload, headers=lec_headers)
    assert accept_res.status_code == 200
    assert accept_res.json()["meeting_status"] == "ACCEPTED"
    assert accept_res.json()["lecturer_notes"] == "Please bring your literature review draft with you."

    # Verify notification was sent to student
    student_notif_query = select(Notification).where(
        Notification.user_id == seed_data["student"].id,
        Notification.reference_id == uuid.UUID(meeting_id)
    )
    stu_notifs = list((await db_session.execute(student_notif_query)).scalars().all())
    assert len(stu_notifs) >= 1
    assert any("accepted" in n.title.lower() for n in stu_notifs)


@pytest.mark.asyncio
async def test_lecturer_rejection_and_cancellation(client: AsyncClient, seed_data: dict, db_session: AsyncSession):
    lec_token = await get_token_for(client, "lecturer.kamal@eng.sjp.ac.lk", "Lecturer@USJ2026!")
    lec_headers = {"Authorization": f"Bearer {lec_token}"}

    stu_token = await get_token_for(client, "nuwan.student@eng.sjp.ac.lk", "Student@USJ2026!")
    stu_headers = {"Authorization": f"Bearer {stu_token}"}

    target_date = date.today() + timedelta(days=5)

    # Specific date availability
    date_slot_payload = {
        "specific_date": target_date.isoformat(),
        "start_time": "14:00:00",
        "end_time": "15:00:00",
        "slot_duration_minutes": 30,
        "location_type": "ONLINE_CALL",
        "room_or_link": "https://meet.google.com/usj-foe-mech",
        "max_students_per_slot": 1,
    }
    create_res = await client.post("/api/v1/lecturers/me/availability", json=date_slot_payload, headers=lec_headers)
    assert create_res.status_code == 201
    slot_id = create_res.json()["id"]

    # Student books 14:00 - 14:30
    booking_req = {
        "lecturer_id": str(seed_data["lecturer"].id),
        "availability_slot_id": slot_id,
        "meeting_date": target_date.isoformat(),
        "start_time": "14:00:00",
        "end_time": "14:30:00",
        "subject": "Lab Experiment Review",
        "agenda": "Reviewing thermodynamics test bench readings.",
    }
    book_res = await client.post("/api/v1/meetings", json=booking_req, headers=stu_headers)
    assert book_res.status_code == 201
    meeting_id = book_res.json()["id"]

    # Lecturer rejects with reason
    reject_payload = {
        "meeting_status": "REJECTED",
        "decline_reason": "Department Board Meeting scheduled at this hour.",
    }
    rej_res = await client.patch(f"/api/v1/meetings/{meeting_id}/status", json=reject_payload, headers=lec_headers)
    assert rej_res.status_code == 200
    assert rej_res.json()["meeting_status"] == "REJECTED"
    assert rej_res.json()["decline_reason"] == "Department Board Meeting scheduled at this hour."

    # Verify student receives decline notification with reason
    stu_notif_query = select(Notification).where(
        Notification.user_id == seed_data["student"].id,
        Notification.reference_id == uuid.UUID(meeting_id)
    )
    stu_notifs = list((await db_session.execute(stu_notif_query)).scalars().all())
    assert any("declined" in n.title.lower() or "rejected" in n.title.lower() for n in stu_notifs)

    # After rejection, the slot becomes available again for other bookings
    slots_res = await client.get(
        f"/api/v1/lecturers/{seed_data['lecturer'].id}/available-slots?date={target_date.isoformat()}"
    )
    assert slots_res.status_code == 200
    available_slots = slots_res.json()
    assert available_slots[0]["is_available"] is True

    # Student books again
    book_res2 = await client.post("/api/v1/meetings", json=booking_req, headers=stu_headers)
    assert book_res2.status_code == 201
    meeting2_id = book_res2.json()["id"]

    # Student cancels meeting
    cancel_res = await client.post(
        f"/api/v1/meetings/{meeting2_id}/cancel",
        json={"cancellation_reason": "Resolved problem with tutor."},
        headers=stu_headers,
    )
    assert cancel_res.status_code == 200
    assert cancel_res.json()["meeting_status"] == "CANCELLED"
