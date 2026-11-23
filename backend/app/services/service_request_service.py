import os
from typing import List, Optional
import uuid
import aiofiles
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.exceptions import BadRequestException, ConflictException, ForbiddenException, NotFoundException
from app.models.lab_service import LabService, ServiceType
from app.models.notification import NotificationType
from app.models.service_request import MaterialType, Print3DDetails, ServiceRequest, ServiceStatus
from app.models.user import User, UserRole
from app.schemas.service_request import LabServiceCreate, ServiceEstimateUpdate, ServiceStatusUpdate
from app.services.notification_service import create_notification
from app.services.print_3d_service import calculate_3d_print_estimate

ALLOWED_3D_EXTENSIONS = {".stl", ".obj", ".step", ".stp", ".3mf"}


class ServiceRequestService:
    """Business logic service for lab service requests and 3D printing jobs."""

    @staticmethod
    async def list_services(
        db: AsyncSession,
        lab_id: Optional[uuid.UUID] = None,
        service_type: Optional[ServiceType] = None,
    ) -> List[LabService]:
        query = select(LabService).where(LabService.is_active == True).order_by(LabService.service_name.asc())
        if lab_id:
            query = query.where(LabService.lab_id == lab_id)
        if service_type:
            query = query.where(LabService.service_type == service_type)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def create_service(db: AsyncSession, req: LabServiceCreate) -> LabService:
        service = LabService(**req.model_dump())
        db.add(service)
        await db.commit()
        await db.refresh(service)
        return service

    @staticmethod
    async def list_service_requests(
        db: AsyncSession,
        current_user: User,
        status_filter: Optional[ServiceStatus] = None,
    ) -> List[ServiceRequest]:
        query = select(ServiceRequest).order_by(ServiceRequest.created_at.desc())
        if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.LAB_ADMIN]:
            query = query.where(ServiceRequest.requester_id == current_user.id)
        if status_filter:
            query = query.where(ServiceRequest.status == status_filter)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def submit_3d_print_request(
        db: AsyncSession,
        current_user: User,
        service_id: uuid.UUID,
        project_title: str,
        description: str,
        material_type: MaterialType,
        color: str,
        infill_percentage: int,
        supervisor_name: Optional[str],
        cad_file: UploadFile,
    ) -> ServiceRequest:
        file_ext = os.path.splitext(cad_file.filename or "")[1].lower()
        if file_ext not in ALLOWED_3D_EXTENSIONS:
            raise BadRequestException(
                f"Unsupported file format '{file_ext}'. Allowed formats: {', '.join(ALLOWED_3D_EXTENSIONS)}"
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
            if os.path.exists(saved_path):
                os.remove(saved_path)
            raise BadRequestException(f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB.")

        req = ServiceRequest(
            service_id=service_id,
            requester_id=current_user.id,
            project_title=project_title.strip(),
            supervisor_name=supervisor_name.strip() if supervisor_name else None,
            description=description.strip(),
            status=ServiceStatus.SUBMITTED,
        )
        db.add(req)
        await db.flush()

        print_detail = Print3DDetails(
            service_request_id=req.id,
            file_url=f"/uploads/{unique_name}",
            original_filename=cad_file.filename or "model.stl",
            file_size_bytes=file_size,
            material_type=material_type,
            color=color.strip(),
            infill_percentage=infill_percentage,
        )
        db.add(print_detail)

        await db.commit()
        await db.refresh(req)
        return req

    @staticmethod
    async def provide_estimate(
        db: AsyncSession,
        request_id: uuid.UUID,
        req_data: ServiceEstimateUpdate,
    ) -> ServiceRequest:
        query = select(ServiceRequest).where(ServiceRequest.id == request_id)
        service_req = (await db.execute(query)).scalar_one_or_none()
        if not service_req:
            raise NotFoundException("Service Request", str(request_id))

        detail = service_req.print_3d_detail
        if detail:
            if req_data.estimated_filament_grams is not None:
                detail.estimated_filament_grams = req_data.estimated_filament_grams
            if req_data.estimated_print_hours is not None:
                detail.estimated_print_hours = req_data.estimated_print_hours
            if req_data.slicing_notes:
                detail.slicing_notes = req_data.slicing_notes

            if req_data.calculated_cost_lkr is not None:
                detail.calculated_cost_lkr = req_data.calculated_cost_lkr
            elif detail.estimated_filament_grams and detail.estimated_print_hours:
                detail.calculated_cost_lkr = calculate_3d_print_estimate(
                    material=detail.material_type,
                    filament_grams=float(detail.estimated_filament_grams),
                    print_hours=float(detail.estimated_print_hours),
                )

        service_req.status = ServiceStatus.ESTIMATED
        if req_data.admin_notes:
            service_req.admin_notes = req_data.admin_notes

        await db.commit()
        await db.refresh(service_req)

        cost_str = f"LKR {detail.calculated_cost_lkr:.2f}" if detail and detail.calculated_cost_lkr else "Quoted"
        await create_notification(
            db=db,
            user_id=service_req.requester_id,
            title="3D Print Quote Available",
            message=f"Your print job '{service_req.project_title}' has been sliced. Estimated cost: {cost_str}.",
            notification_type=NotificationType.SERVICE_3D,
            reference_id=service_req.id,
        )

        return service_req

    @staticmethod
    async def accept_estimate(
        db: AsyncSession, request_id: uuid.UUID, current_user: User
    ) -> ServiceRequest:
        query = select(ServiceRequest).where(ServiceRequest.id == request_id)
        service_req = (await db.execute(query)).scalar_one_or_none()
        if not service_req:
            raise NotFoundException("Service Request", str(request_id))

        if service_req.requester_id != current_user.id:
            raise ForbiddenException("You can only accept estimates for your own requests.")

        if service_req.status != ServiceStatus.ESTIMATED:
            raise ConflictException(f"Cannot accept estimate when request status is '{service_req.status.value}'.")

        service_req.status = ServiceStatus.APPROVED_BY_USER
        await db.commit()
        await db.refresh(service_req)
        return service_req

    @staticmethod
    async def update_status(
        db: AsyncSession, request_id: uuid.UUID, req_data: ServiceStatusUpdate
    ) -> ServiceRequest:
        query = select(ServiceRequest).where(ServiceRequest.id == request_id)
        service_req = (await db.execute(query)).scalar_one_or_none()
        if not service_req:
            raise NotFoundException("Service Request", str(request_id))

        service_req.status = req_data.status
        if req_data.admin_notes:
            service_req.admin_notes = req_data.admin_notes

        await db.commit()
        await db.refresh(service_req)

        await create_notification(
            db=db,
            user_id=service_req.requester_id,
            title=f"Print Job {req_data.status.value}",
            message=f"Your print job '{service_req.project_title}' is now {req_data.status.value}.",
            notification_type=NotificationType.SERVICE_3D,
            reference_id=service_req.id,
        )

        return service_req
