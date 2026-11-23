from fastapi import APIRouter

from app.api.v1.endpoints import (
    administration,
    auth,
    bookings,
    equipment,
    halls,
    health,
    laboratories,
    lecturers,
    meetings,
    notifications,
    services,
    students,
    users,
)

api_router = APIRouter()

# Register all modular domain routers under /api/v1
api_router.include_router(health.router, prefix="/health", tags=["System Health & Readiness"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Departments"])
api_router.include_router(students.router, prefix="/students", tags=["Students"])
api_router.include_router(lecturers.router, prefix="/lecturers", tags=["Lecturers"])
api_router.include_router(halls.router, prefix="/halls", tags=["Lecture Halls & Facilities"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["Bookings"])
api_router.include_router(meetings.router, prefix="/meetings", tags=["Consultation Meetings"])
api_router.include_router(laboratories.router, prefix="/laboratories", tags=["Laboratories"])
api_router.include_router(equipment.router, prefix="/equipment", tags=["Equipment & Inventory"])
api_router.include_router(services.router, prefix="/services", tags=["University Services Directory & Marketplace"])
api_router.include_router(services.router, prefix="/service-requests", tags=["Service Requests & 3D Printing"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(administration.router, prefix="/admin", tags=["Administration & Governance"])
