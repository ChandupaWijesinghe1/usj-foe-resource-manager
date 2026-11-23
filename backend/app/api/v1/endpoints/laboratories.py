from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import require_lab_admin
from app.models.laboratory import Laboratory
from app.models.user import User
from app.schemas.equipment import LaboratoryCreate, LaboratoryResponse, LaboratoryUpdate
from app.services.laboratory_service import LaboratoryService

router = APIRouter()


@router.get("", response_model=List[LaboratoryResponse])
async def list_laboratories(
    department_id: Optional[uuid.UUID] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> List[Laboratory]:
    """Lists engineering laboratories across departments with optional search and department filter."""
    return await LaboratoryService.list_laboratories(db, department_id=department_id, search=search)


@router.post("", response_model=LaboratoryResponse, status_code=status.HTTP_201_CREATED)
async def create_laboratory(
    req: LaboratoryCreate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> Laboratory:
    """Lab Admin / Super Admin: Registers a laboratory profile."""
    return await LaboratoryService.create_laboratory(db, req)


@router.get("/{lab_id}", response_model=LaboratoryResponse)
async def get_laboratory(
    lab_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> Laboratory:
    """Retrieves laboratory profile, location, and safety guidelines."""
    return await LaboratoryService.get_laboratory_by_id(db, lab_id)


@router.put("/{lab_id}", response_model=LaboratoryResponse)
async def update_laboratory(
    lab_id: uuid.UUID,
    req: LaboratoryUpdate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> Laboratory:
    """Lab Admin / Super Admin: Updates laboratory details, hours, and guidelines."""
    return await LaboratoryService.update_laboratory(db, lab_id, req)


@router.delete("/{lab_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_laboratory(
    lab_id: uuid.UUID,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Lab Admin / Super Admin: Deactivates a laboratory."""
    await LaboratoryService.delete_laboratory(db, lab_id)
