import os
import shutil
from typing import List, Optional
import uuid
import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.dependencies import get_current_user, require_lab_admin
from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from app.models.lab_service import LabService, ServiceType
from app.models.laboratory import Laboratory
from app.models.notification import NotificationType
from app.models.service_request import MaterialType, Print3DDetails, ServiceRequest, ServiceStatus
from app.models.user import User, UserRole
from app.schemas.service_request import (
    LabServiceCreate,
    LabServiceResponse,
    LabServiceUpdate,
    ServiceEstimateUpdate,
    ServiceRequestCreate,
    ServiceRequestResponse,
    ServiceStatusUpdate,
)
from app.services.notification_service import create_notification
from app.services.print_3d_service import calculate_3d_print_estimate

router = APIRouter()

ALLOWED_3D_EXTENSIONS = {".stl", ".obj", ".step", ".stp", ".3mf"}
ALLOWED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".svg"}


# University Services Directory & Marketplace
@router.get("/directory", response_model=List[LabServiceResponse])
@router.get("/catalog", response_model=List[LabServiceResponse])
@router.get("", response_model=List[LabServiceResponse])
async def list_services_directory(
    search: Optional[str] = None,
    category: Optional[str] = None,
    lab_id: Optional[uuid.UUID] = None,
    department_id: Optional[uuid.UUID] = None,
    service_type: Optional[ServiceType] = None,
    available_only: bool = False,
    db: AsyncSession = Depends(get_db),
) -> List[LabService]:
    """
    Public directory of university laboratory services, equipment, and facilities.
    Supports filtering by search query, category, laboratory, department, and availability.
    """
    query = (
        select(LabService)
        .join(LabService.laboratory)
        .where(LabService.is_active == True, Laboratory.is_active == True)
        .order_by(LabService.service_name.asc())
    )

    if lab_id:
        query = query.where(LabService.lab_id == lab_id)
    if department_id:
        query = query.where(Laboratory.department_id == department_id)
    if service_type:
        query = query.where(LabService.service_type == service_type)
    if category and category != "ALL":
        query = query.where(LabService.category.ilike(f"%{category.strip()}%"))
    if available_only:
        query = query.where(LabService.is_available == True)
    if search:
        search_pat = f"%{search.strip()}%"
        query = query.where(
            or_(
                LabService.service_name.ilike(search_pat),
                LabService.description.ilike(search_pat),
                LabService.category.ilike(search_pat),
                Laboratory.name.ilike(search_pat),
            )
        )

    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/categories", response_model=List[str])
async def list_service_categories(db: AsyncSession = Depends(get_db)) -> List[str]:
    """Retrieves unique categories of published services and equipment."""
    query = (
        select(LabService.category)
        .where(LabService.is_active == True)
        .distinct()
        .order_by(LabService.category.asc())
    )
    result = await db.execute(query)
    categories = [c for c in result.scalars().all() if c]
    return categories


@router.get("/{service_id}", response_model=LabServiceResponse)
async def get_service_details(
    service_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> LabService:
    """Retrieves full details of a specific service or equipment item."""
    query = select(LabService).where(LabService.id == service_id, LabService.is_active == True)
    service = (await db.execute(query)).scalar_one_or_none()
    if not service:
        raise NotFoundException("Service", str(service_id))
    return service


@router.post("", response_model=LabServiceResponse, status_code=status.HTTP_201_CREATED)
async def create_service(
    req: LabServiceCreate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> LabService:
    """Lab Admin: Publishes a new service, equipment, or facility in the university directory."""
    # Verify laboratory exists
    lab_query = select(Laboratory).where(Laboratory.id == req.lab_id, Laboratory.is_active == True)
    lab = (await db.execute(lab_query)).scalar_one_or_none()
    if not lab:
        raise NotFoundException("Laboratory", str(req.lab_id))

    # Optional: verify admin in charge if role is LAB_ADMIN (SUPER_ADMIN can manage all)
    if current_admin.role == UserRole.LAB_ADMIN and lab.admin_in_charge_id and lab.admin_in_charge_id != current_admin.id:
        pass  # allow lab admins to collaborate across facilities

    service = LabService(**req.model_dump())
    if service.available_quantity is None and service.total_quantity is not None:
        service.available_quantity = service.total_quantity

    db.add(service)
    await db.commit()
    await db.refresh(service)
    return service


@router.put("/{service_id}", response_model=LabServiceResponse)
async def update_service(
    service_id: uuid.UUID,
    req: LabServiceUpdate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> LabService:
    """Lab Admin: Updates details, pricing, availability, or borrowing conditions for a service."""
    query = select(LabService).where(LabService.id == service_id)
    service = (await db.execute(query)).scalar_one_or_none()
    if not service:
        raise NotFoundException("Service", str(service_id))

    update_data = req.model_dump(exclude_unset=True)
    if "lab_id" in update_data and update_data["lab_id"]:
        lab_query = select(Laboratory).where(Laboratory.id == update_data["lab_id"])
        lab = (await db.execute(lab_query)).scalar_one_or_none()
        if not lab:
            raise NotFoundException("Laboratory", str(update_data["lab_id"]))

    for key, val in update_data.items():
        setattr(service, key, val)

    await db.commit()
    await db.refresh(service)
    return service


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_service(
    service_id: uuid.UUID,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Lab Admin: Removes or deactivates a published service from the directory."""
    query = select(LabService).where(LabService.id == service_id)
    service = (await db.execute(query)).scalar_one_or_none()
    if not service:
        raise NotFoundException("Service", str(service_id))

    service.is_active = False
    await db.commit()


@router.post("/upload-image", response_model=dict)
async def upload_service_image(
    file: UploadFile = File(...),
    current_admin: User = Depends(require_lab_admin),
) -> dict:
    """Lab Admin: Uploads a product or service image to the directory."""
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported image format '{file_ext}'. Allowed formats: {', '.join(ALLOWED_IMAGE_EXTENSIONS)}",
        )

    upload_dir = os.path.join(settings.UPLOAD_DIR, "images")
    os.makedirs(upload_dir, exist_ok=True)
    unique_name = f"img_{uuid.uuid4()}{file_ext}"
    saved_path = os.path.join(upload_dir, unique_name)

    async with aiofiles.open(saved_path, "wb") as out_file:
        while content := await file.read(1024 * 1024):
            await out_file.write(content)

    return {
        "url": f"/static/uploads/images/{unique_name}",
        "filename": file.filename,
    }


@router.post("/upload-attachment", response_model=dict)
async def upload_service_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Student/Staff: Uploads CAD model, STL file, drawings, or specification documents for a service request."""
    allowed_exts = {".stl", ".obj", ".step", ".stp", ".3mf", ".pdf", ".zip", ".rar", ".dxf", ".dwg", ".png", ".jpg", ".jpeg"}
    file_ext = os.path.splitext(file.filename)[1].lower()
    if file_ext not in allowed_exts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported attachment format '{file_ext}'. Allowed formats: {', '.join(sorted(allowed_exts))}",
        )

    upload_dir = os.path.join(settings.UPLOAD_DIR, "attachments")
    os.makedirs(upload_dir, exist_ok=True)
    unique_name = f"att_{uuid.uuid4()}_{file.filename}"
    saved_path = os.path.join(upload_dir, unique_name)

    file_size = 0
    async with aiofiles.open(saved_path, "wb") as out_file:
        while content := await file.read(1024 * 1024):
            file_size += len(content)
            await out_file.write(content)

    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        if os.path.exists(saved_path):
            os.remove(saved_path)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum size limit of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    return {
        "url": f"/static/uploads/attachments/{unique_name}",
        "filename": file.filename,
        "size_bytes": file_size,
    }


# Service Requests & Student Petitions
@router.get("/requests/me", response_model=List[ServiceRequestResponse])
@router.get("/requests/my-requests", response_model=List[ServiceRequestResponse])
async def list_my_service_requests(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ServiceRequest]:
    """Retrieves all service and equipment requests submitted by the authenticated student."""
    query = (
        select(ServiceRequest)
        .where(ServiceRequest.requester_id == current_user.id)
        .order_by(ServiceRequest.created_at.desc())
    )
    result = await db.execute(query)
    return list(result.scalars().all())


@router.get("/requests", response_model=List[ServiceRequestResponse])
async def list_service_requests(
    status_filter: Optional[ServiceStatus] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[ServiceRequest]:
    """Lists service jobs. Requester sees their own; Admins see facility queue."""
    query = select(ServiceRequest).order_by(ServiceRequest.created_at.desc())

    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN]:
        query = query.where(ServiceRequest.requester_id == current_user.id)
    if status_filter:
        query = query.where(ServiceRequest.status == status_filter)

    result = await db.execute(query)
    return list(result.scalars().all())


@router.post("/requests", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_service_request(
    req: ServiceRequestCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequest:
    """Student: Submits a petition for an available service or equipment item."""
    query = select(LabService).where(LabService.id == req.service_id, LabService.is_active == True)
    service = (await db.execute(query)).scalar_one_or_none()
    if not service:
        raise NotFoundException("Service", str(req.service_id))

    if not service.is_available:
        raise BadRequestException("This service or equipment is currently marked as unavailable.")

    if service.available_quantity is not None and req.requested_quantity > service.available_quantity:
        raise BadRequestException(
            f"Requested quantity ({req.requested_quantity}) exceeds available stock ({service.available_quantity})."
        )

    job = ServiceRequest(
        service_id=req.service_id,
        requester_id=current_user.id,
        project_title=req.project_title.strip(),
        supervisor_name=req.supervisor_name.strip() if req.supervisor_name else None,
        description=req.description.strip(),
        requested_quantity=req.requested_quantity,
        dimensions=req.dimensions.strip() if req.dimensions else None,
        preferred_date=req.preferred_date,
        attachment_url=req.attachment_url,
        attachment_name=req.attachment_name,
        status=ServiceStatus.PENDING,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    # Notify Lab Admin
    if service.laboratory and service.laboratory.admin_in_charge_id:
        await create_notification(
            db=db,
            user_id=service.laboratory.admin_in_charge_id,
            title="New Laboratory Service Request",
            message=f"{current_user.full_name} submitted a request for '{service.service_name}' ({job.project_title}).",
            notification_type=NotificationType.EQUIPMENT,
            reference_id=job.id,
        )

    return job


@router.post("/requests/3d-print", response_model=ServiceRequestResponse, status_code=status.HTTP_201_CREATED)
async def submit_3d_print_request(
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
    """Submits a 3D printing job with CAD model attachment."""
    file_ext = os.path.splitext(cad_file.filename)[1].lower()
    if file_ext not in ALLOWED_3D_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(ALLOWED_3D_EXTENSIONS)}",
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    unique_name = f"{uuid.uuid4()}_{cad_file.filename}"
    saved_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    file_size = 0
    async with aiofiles.open(saved_path, "wb") as out_file:
        while content := await cad_file.read(1024 * 1024):
            file_size += len(content)
            await out_file.write(content)

    if file_size > settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024:
        os.remove(saved_path)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Uploaded file exceeds maximum limit of {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    job = ServiceRequest(
        service_id=service_id,
        requester_id=current_user.id,
        project_title=project_title.strip(),
        supervisor_name=supervisor_name.strip() if supervisor_name else None,
        description=description.strip(),
        status=ServiceStatus.SUBMITTED,
    )
    db.add(job)
    await db.flush()

    details = Print3DDetails(
        service_request_id=job.id,
        file_url=f"/static/uploads/{unique_name}",
        original_filename=cad_file.filename,
        file_size_bytes=file_size,
        material_type=material_type,
        color=color,
        infill_percentage=infill_percentage,
    )
    db.add(details)
    await db.commit()
    await db.refresh(job)
    return job


@router.patch("/requests/{request_id}/status", response_model=ServiceRequestResponse)
async def update_service_request_status(
    request_id: uuid.UUID,
    req: ServiceStatusUpdate,
    current_admin: User = Depends(require_lab_admin),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequest:
    """Lab Admin: Accepts, rejects, schedules appointments, updates progress, and records charges."""
    query = select(ServiceRequest).where(ServiceRequest.id == request_id)
    job = (await db.execute(query)).scalar_one_or_none()
    if not job:
        raise NotFoundException("Service Request", str(request_id))

    target_status = req.status
    job.status = target_status

    if req.scheduled_date is not None:
        job.scheduled_date = req.scheduled_date
    if req.estimated_completion_date is not None:
        job.estimated_completion_date = req.estimated_completion_date
    if req.recorded_charges_lkr is not None:
        job.recorded_charges_lkr = req.recorded_charges_lkr
    if req.rejection_reason is not None:
        job.rejection_reason = req.rejection_reason.strip()
    if req.admin_notes is not None:
        job.admin_notes = req.admin_notes.strip()

    await db.commit()
    await db.refresh(job)

    # Detailed notification for student
    notif_msg = f"Your request for '{job.project_title}' has been updated to: {target_status.value}."
    if target_status == ServiceStatus.SCHEDULED and job.scheduled_date:
        notif_msg += f" Appointment scheduled for {job.scheduled_date.strftime('%Y-%m-%d %H:%M')}."
    elif target_status == ServiceStatus.REJECTED and job.rejection_reason:
        notif_msg += f" Reason: {job.rejection_reason}"
    elif target_status == ServiceStatus.COMPLETED and job.recorded_charges_lkr is not None:
        notif_msg += f" Completed. Total charges: LKR {job.recorded_charges_lkr:.2f}."

    await create_notification(
        db=db,
        user_id=job.requester_id,
        title=f"Service Request {target_status.value}",
        message=notif_msg,
        notification_type=NotificationType.EQUIPMENT,
        reference_id=job.id,
    )

    return job


@router.post("/requests/{request_id}/cancel", response_model=ServiceRequestResponse)
async def cancel_service_request(
    request_id: uuid.UUID,
    reason: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ServiceRequest:
    """Student: Cancels a pending or approved service petition."""
    query = select(ServiceRequest).where(ServiceRequest.id == request_id)
    job = (await db.execute(query)).scalar_one_or_none()
    if not job:
        raise NotFoundException("Service Request", str(request_id))

    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN] and job.requester_id != current_user.id:
        raise ForbiddenException("You are not authorized to cancel this request.")

    if job.status in [ServiceStatus.COMPLETED, ServiceStatus.CANCELLED, ServiceStatus.REJECTED]:
        raise BadRequestException(f"Cannot cancel a request that is already {job.status.value}.")

    job.status = ServiceStatus.CANCELLED
    if reason:
        job.admin_notes = f"Cancelled by requester: {reason.strip()}"

    await db.commit()
    await db.refresh(job)
    return job
