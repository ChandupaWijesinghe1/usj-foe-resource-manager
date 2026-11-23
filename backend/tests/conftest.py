import asyncio
import os
import sys
from typing import AsyncGenerator

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

# Force testing configuration
os.environ["ENVIRONMENT"] = "testing"
os.environ["ENFORCE_EMAIL_DOMAIN"] = "true"

from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import get_password_hash
from app.main import app
from app.models.department import Department
from app.models.facility import Facility, FacilityType
from app.models.user import User, UserRole

# Use SQLite in-memory with StaticPool for cross-platform fast test execution
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)


@pytest_asyncio.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    """Provides a fresh transactional test database session."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Async HTTP test client overriding the application get_db dependency."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def seed_data(db_session: AsyncSession):
    """Seeds test department and default accounts."""
    dept = Department(name="Department of Computer Engineering", code="DCE")
    db_session.add(dept)
    await db_session.flush()

    # Pre-seeded Super Admin
    admin = User(
        email="admin@eng.sjp.ac.lk",
        hashed_password=get_password_hash("Admin@USJ2026!"),
        full_name="Deanery Super Admin",
        role=UserRole.SUPER_ADMIN,
        department_id=dept.id,
        is_active=True,
        is_verified=True,
    )

    # Pre-seeded Verified Lecturer
    lecturer = User(
        email="lecturer.kamal@eng.sjp.ac.lk",
        hashed_password=get_password_hash("Lecturer@USJ2026!"),
        full_name="Dr. Kamal Perera",
        role=UserRole.LECTURER,
        department_id=dept.id,
        is_active=True,
        is_verified=True,
    )

    # Pre-seeded Verified Student
    student = User(
        email="nuwan.student@eng.sjp.ac.lk",
        hashed_password=get_password_hash("Student@USJ2026!"),
        full_name="Nuwan Bandara",
        registration_number="EG/2021/4500",
        role=UserRole.STUDENT,
        department_id=dept.id,
        is_active=True,
        is_verified=True,
    )

    # Pre-seeded Lecture Hall
    fac = Facility(
        name="Prof. E.O.E. Pereira Theatre",
        code="LH-PEREIRA",
        building="Main Academic Complex",
        floor="1st Floor",
        capacity=250,
        facility_type=FacilityType.LECTURE_HALL,
        has_projector=True,
        has_ac=True,
        has_sound_system=True,
        department_id=dept.id,
        is_operational=True,
    )

    db_session.add_all([admin, lecturer, student, fac])
    await db_session.commit()

    return {
        "department": dept,
        "admin": admin,
        "lecturer": lecturer,
        "student": student,
        "facility": fac,
    }
