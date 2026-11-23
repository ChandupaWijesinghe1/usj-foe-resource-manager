import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.database import Base, check_db_connection, engine
from app.core.exceptions import register_exception_handlers
from app.core.logging import RequestLoggingMiddleware, get_logger, setup_logging

# Initialize logging system
setup_logging()
logger = get_logger("app.main")

# OpenAPI Tag Metadata for Swagger UI
TAGS_METADATA = [
    {
        "name": "System Health & Readiness",
        "description": "Liveness probes, system status, and PostgreSQL database connectivity checks.",
    },
    {
        "name": "Authentication",
        "description": "JWT-based authentication, user self-registration, login, and token rotation.",
    },
    {
        "name": "Users & Departments",
        "description": "User profiles, contact adjustments, and engineering department listings.",
    },
    {
        "name": "Students",
        "description": "Student index search, registration number lookups, and batch directories.",
    },
    {
        "name": "Lecturers",
        "description": "Academic faculty profiles and weekly student office hour availability slots.",
    },
    {
        "name": "Lecture Halls & Facilities",
        "description": "Auditoriums, drawing offices, lecture theatres, and technical amenities.",
    },
    {
        "name": "Bookings",
        "description": "Facility reservation petitions with real-time double-booking and clash prevention.",
    },
    {
        "name": "Consultation Meetings",
        "description": "One-on-one student-lecturer consultation appointments and meeting logs.",
    },
    {
        "name": "Laboratories",
        "description": "Faculty engineering labs, operating hours, safety guidelines, and locations.",
    },
    {
        "name": "Equipment & Inventory",
        "description": "Precision instrument inventory, operational status, and equipment loan check-out/return.",
    },
    {
        "name": "Service Requests & 3D Printing",
        "description": "FabLab rapid prototyping, CAD model ingestion, slicing quotations, and queue tracking.",
    },
    {
        "name": "Notifications",
        "description": "In-app notifications for status transitions, loan alerts, and quotes.",
    },
    {
        "name": "Administration & Governance",
        "description": "Executive metrics, role management, and administrative control panels.",
    },
]


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager for startup and shutdown events."""
    logger.info(f"Starting {settings.PROJECT_NAME} (v{settings.VERSION})...")

    # Ensure uploads directory exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

    # Verify Database Connection
    db_ok = await check_db_connection()
    if db_ok:
        logger.info("Successfully connected to PostgreSQL engine.")
        # Auto-create tables for development mode
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schema synchronized.")
    else:
        logger.warning(
            "Could not connect to PostgreSQL on startup. Ensure PostgreSQL service is running."
        )

    yield

    # Clean up connection pool on shutdown
    logger.info("Disposing database connection pool...")
    await engine.dispose()
    logger.info("Application shutdown completed.")


# Initialize FastAPI Application
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    openapi_tags=TAGS_METADATA,
    lifespan=lifespan,
)

# 1. Register Global Centralized Exception Handlers
register_exception_handlers(app)

# 2. Register Request Logging Middleware
app.add_middleware(RequestLoggingMiddleware)

# 3. Configure Cross-Origin Resource Sharing (CORS)
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# 4. Mount Static File Storage for CAD Models & Attachments
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
    app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="static_uploads")


# 5. Root Health Check Endpoint
@app.get("/health", tags=["System Health & Readiness"], status_code=status.HTTP_200_OK)
async def root_health():
    """Root health-check probe."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
    }


# 6. Include Versioned REST API Router
app.include_router(api_router, prefix=settings.API_V1_STR)
