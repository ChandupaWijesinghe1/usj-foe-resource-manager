import asyncio
import uuid
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, Base, engine
from app.core.security import get_password_hash
from app.models.department import Department
from app.models.equipment import Equipment, EquipmentCondition
from app.models.facility import Facility, FacilityType
from app.models.laboratory import Laboratory
from app.models.lab_service import LabService, ServiceType
from app.models.user import User, UserRole


async def seed():
    print("Beginning database initialization and seeding for USJ Faculty of Engineering...")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Departments
        departments_data = [
            {"name": "Department of Computer Engineering", "code": "DCE"},
            {"name": "Department of Electrical & Electronic Engineering", "code": "DEE"},
            {"name": "Department of Mechanical & Mechatronics Engineering", "code": "DME"},
            {"name": "Department of Civil & Environmental Engineering", "code": "DCEE"},
            {"name": "Department of Interdisciplinary Studies", "code": "DIS"},
        ]

        dept_map = {}
        for d in departments_data:
            existing = (await db.execute(select(Department).where(Department.code == d["code"]))).scalar_one_or_none()
            if not existing:
                dept = Department(name=d["name"], code=d["code"])
                db.add(dept)
                await db.flush()
                dept_map[d["code"]] = dept
            else:
                dept_map[d["code"]] = existing

        # 2. Super Admin User
        admin_email = "admin@eng.sjp.ac.lk"
        admin_user = (await db.execute(select(User).where(User.email == admin_email))).scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                hashed_password=get_password_hash("Admin@USJ2026!"),
                full_name="Deanery Super Admin",
                role=UserRole.SUPER_ADMIN,
                department_id=dept_map["DIS"].id,
                is_active=True,
                is_verified=True,
            )
            db.add(admin_user)
            await db.flush()
            print(f"Created Super Admin: {admin_email} (Password: Admin@USJ2026!)")

        # 3. Facility Admin User
        facility_admin_email = "facility.admin@eng.sjp.ac.lk"
        facility_admin = (await db.execute(select(User).where(User.email == facility_admin_email))).scalar_one_or_none()
        if not facility_admin:
            facility_admin = User(
                email=facility_admin_email,
                hashed_password=get_password_hash("Facility@USJ2026!"),
                full_name="Facility Custodian Officer",
                role=UserRole.FACILITY_ADMIN,
                department_id=dept_map["DIS"].id,
                is_active=True,
                is_verified=True,
                verified_by=admin_user.id,
            )
            db.add(facility_admin)
            await db.flush()
            print(f"Created Facility Admin: {facility_admin_email}")

        # 4. Lab Admin User
        lab_admin_email = "lab.admin@eng.sjp.ac.lk"
        lab_admin = (await db.execute(select(User).where(User.email == lab_admin_email))).scalar_one_or_none()
        if not lab_admin:
            lab_admin = User(
                email=lab_admin_email,
                hashed_password=get_password_hash("LabAdmin@USJ2026!"),
                full_name="Chief Technical Officer",
                role=UserRole.LAB_ADMIN,
                department_id=dept_map["DME"].id,
                is_active=True,
                is_verified=True,
                verified_by=admin_user.id,
            )
            db.add(lab_admin)
            await db.flush()
            print(f"Created Lab Admin: {lab_admin_email}")

        # 5. Verified Lecturer User
        lecturer_email = "kamal@eng.sjp.ac.lk"
        lecturer = (await db.execute(select(User).where(User.email == lecturer_email))).scalar_one_or_none()
        if not lecturer:
            lecturer = User(
                email=lecturer_email,
                hashed_password=get_password_hash("Lecturer@USJ2026!"),
                full_name="Dr. Kamal Perera",
                role=UserRole.LECTURER,
                department_id=dept_map["DCE"].id,
                phone_number="+94771234567",
                is_active=True,
                is_verified=True,
                verified_by=admin_user.id,
            )
            db.add(lecturer)
            await db.flush()
            print(f"Created Verified Lecturer: {lecturer_email}")

        # 6. Verified Student User
        student_email = "student@eng.sjp.ac.lk"
        student = (await db.execute(select(User).where(User.email == student_email))).scalar_one_or_none()
        if not student:
            student = User(
                email=student_email,
                hashed_password=get_password_hash("Student@USJ2026!"),
                full_name="Nuwan Bandara",
                registration_number="EG/2021/4580",
                role=UserRole.STUDENT,
                department_id=dept_map["DCE"].id,
                phone_number="+94719876543",
                is_active=True,
                is_verified=True,
            )
            db.add(student)
            await db.flush()
            print(f"Created Verified Student: {student_email}")

        # 7. Lecture Halls & Auditoriums
        halls_data = [
            {
                "name": "E1 Main Lecture Theatre",
                "code": "LH-E1",
                "building": "Main Academic Complex",
                "floor": "1st Floor",
                "capacity": 250,
                "facility_type": FacilityType.LECTURE_HALL,
                "has_projector": True,
                "has_ac": True,
                "has_sound_system": True,
            },
            {
                "name": "E2 Lecture Theatre",
                "code": "LH-E2",
                "building": "Main Academic Complex",
                "floor": "2nd Floor",
                "capacity": 180,
                "facility_type": FacilityType.LECTURE_HALL,
                "has_projector": True,
                "has_ac": True,
                "has_sound_system": True,
            },
            {
                "name": "Faculty Main Auditorium",
                "code": "AUD-MAIN",
                "building": "Faculty Central Building",
                "floor": "Ground Floor",
                "capacity": 600,
                "facility_type": FacilityType.AUDITORIUM,
                "has_projector": True,
                "has_ac": True,
                "has_sound_system": True,
            },
            {
                "name": "Civil Engineering Drawing Office 1",
                "code": "DO-01",
                "building": "Civil Complex",
                "floor": "3rd Floor",
                "capacity": 120,
                "facility_type": FacilityType.SEMINAR_ROOM,
                "has_projector": True,
                "has_ac": False,
                "has_sound_system": False,
                "department_id": dept_map["DCEE"].id,
            },
        ]

        for h in halls_data:
            existing_hall = (await db.execute(select(Facility).where(Facility.code == h["code"]))).scalar_one_or_none()
            if not existing_hall:
                hall = Facility(**h)
                db.add(hall)

        # 8. Laboratories
        lab_code = "LAB-FAB-01"
        fab_lab = (await db.execute(select(Laboratory).where(Laboratory.code == lab_code))).scalar_one_or_none()
        if not fab_lab:
            fab_lab = Laboratory(
                name="Makerspace & Rapid Prototyping FabLab",
                code=lab_code,
                department_id=dept_map["DME"].id,
                admin_in_charge_id=lab_admin.id,
                location="Workshop Complex, Ground Floor Room W-04",
                operating_hours="8:30 AM - 4:30 PM (Mon-Fri)",
                safety_guidelines="Safety goggles and closed footwear mandatory at all times inside the FabLab.",
            )
            db.add(fab_lab)
            await db.flush()

        # 9. Lab Services (3D Printing)
        existing_srv = (
            await db.execute(select(LabService).where(LabService.service_name == "FDM 3D Rapid Prototyping"))
        ).scalar_one_or_none()
        if not existing_srv:
            srv = LabService(
                lab_id=fab_lab.id,
                service_name="FDM 3D Rapid Prototyping",
                service_type=ServiceType.THREE_D_PRINTING,
                description="High precision FDM 3D printing in PLA, PETG, ABS, and TPU for academic and research models.",
                turnaround_time_days=2,
                cost_per_unit=12.00,
            )
            db.add(srv)

        # 10. Equipment Items
        equipment_data = [
            {
                "name": "Prusa i3 MK3S+ 3D Printer",
                "lab_id": fab_lab.id,
                "model_number": "MK3S+",
                "serial_number": "PRUSA-MK3-001",
                "category": "Additive Manufacturing",
                "total_quantity": 4,
                "available_quantity": 4,
                "is_borrowable": False,
                "condition_status": EquipmentCondition.EXCELLENT,
            },
            {
                "name": "Rigol DS1054Z Digital Storage Oscilloscope (50MHz, 4-Channel)",
                "lab_id": fab_lab.id,
                "model_number": "DS1054Z",
                "serial_number": "RIGOL-OSC-042",
                "category": "Electronic Test & Measurement",
                "total_quantity": 10,
                "available_quantity": 10,
                "is_borrowable": True,
                "condition_status": EquipmentCondition.EXCELLENT,
            },
            {
                "name": "Fluke 87V True-RMS Digital Multimeter",
                "lab_id": fab_lab.id,
                "model_number": "87-V",
                "serial_number": "FLUKE-87-019",
                "category": "Handheld Instruments",
                "total_quantity": 15,
                "available_quantity": 15,
                "is_borrowable": True,
                "condition_status": EquipmentCondition.GOOD,
            },
        ]

        for eq in equipment_data:
            existing_eq = (
                await db.execute(select(Equipment).where(Equipment.serial_number == eq["serial_number"]))
            ).scalar_one_or_none()
            if not existing_eq:
                db.add(Equipment(**eq))

        await db.commit()
        print("Database initialized and seeded successfully!")


async def main():
    try:
        await seed()
    finally:
        # Close pooled asyncpg connections while the event loop is still alive.
        # Without this, Windows' Proactor loop logs "RuntimeError: Event loop is closed"
        # when the leftover connections are garbage-collected after asyncio.run() exits.
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
