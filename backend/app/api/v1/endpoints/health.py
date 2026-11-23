from typing import Any, Dict
from fastapi import APIRouter, Depends, status
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import check_db_connection

router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
async def health_check() -> Dict[str, Any]:
    """Basic health check and system information."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }


@router.get("/ready", status_code=status.HTTP_200_OK)
async def readiness_probe() -> JSONResponse:
    """Readiness probe verifying external services (PostgreSQL)."""
    db_ok = await check_db_connection()
    payload = {
        "status": "ready" if db_ok else "unhealthy",
        "database": "connected" if db_ok else "disconnected",
        "version": settings.VERSION,
    }

    if not db_ok:
        return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, content=payload)

    return JSONResponse(status_code=status.HTTP_200_OK, content=payload)
