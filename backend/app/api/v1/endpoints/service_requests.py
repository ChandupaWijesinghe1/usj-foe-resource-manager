from typing import List, Optional
import uuid
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_lab_admin
from app.models.lab_service import LabService, ServiceType
from app.models.service_request import MaterialType, ServiceRequest, ServiceStatus
from app.models.user import User
from app.schemas.service_request import (
    LabServiceCreate,
    LabServiceResponse,
    ServiceEstimateUpdate,
    ServiceRequestResponse,
    ServiceStatusUpdate,
)
from app.services.service_request_service import ServiceRequestService

router = APIRouter()


@router.get("/catalog", response_model=List[LabServiceResponse])
async def list_services_catalog(
    lab_id: Optional[uuid.UUID] = None,
    service_type: Optional[ServiceType] = None,
    db: AsyncSession = Depends(get_db),
) -> List[LabService]:
    """Lists available technical lab services."""
    return await ServiceRequestService.list_services(db, lab_id, service_type)


@router.post("/catalog", response_model=LabServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service_entry(
    req: LabServiceCreate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> LabService:
    """Lab Admin: Adds an offering to the lab services catalog."""
    return await ServiceRequestService.create_service(db, req)


@router.get("", response_model=List[ServiceRequestResponse])
async def list_service_requests(
    status_filter: Optional[ServiceStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ServiceRequest]:
    """Lists submitted service jobs. Students see own; Admins see queue."""
    return await ServiceRequestService.list_service_requests(db, current_user, status_filter)


@router.post("/3d-print", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_3d_print_job(
    service_id: uuid.UUID = Form(...),
    project_title: str = Form(...),
    description: str = Form(...),
    material_type: MaterialType = Form(MaterialType.PLA),
    color: str = Form("Black"),
    infill_percentage: int = Form(20),
    supervisor_name: Optional[str] = Form(None),
    cad_file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequest:
    """Submits a CAD model (.stl, .obj, .step) for rapid prototyping slicing & quotation."""
    return await ServiceRequestService.submit_3d_print_request(
        db=db,
        current_user=current_user,
        service_id=service_id,
        project_title=project_title,
        description=description,
        material_type=material_type,
        color=color,
        infill_percentage=infill_percentage,
        supervisor_name=supervisor_name,
        cad_file=cad_file,
    )


@router.patch("/{request_id}/estimate", response_model=ServiceRequestResponse)
async def provide_slicing_estimate(
    request_id: uuid.UUID,
    req_data: ServiceEstimateUpdate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequest:
    """Lab Admin: Sets filament grams, print hours, and estimated cost."""
    return await ServiceRequestService.provide_estimate(db, request_id, req_data)


@router.patch("/{request_id}/accept-estimate", response_model=ServiceRequestResponse)
async def accept_slicing_estimate(
    request_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequest:
    """Requester: Accepts cost quotation and authorizes print job to proceed."""
    return await ServiceRequestService.accept_estimate(db, request_id, current_user)


@router.patch("/{request_id}/status", response_model=ServiceRequestResponse)
async def update_service_status(
    request_id: uuid.UUID,
    req_data: ServiceStatusUpdate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequest:
    """Lab Admin: Advances print job status (e.g. IN_PROGRESS, READY_FOR_PICKUP, COMPLETED)."""
    return await ServiceRequestService.update_status(db, request_id, req_data)
