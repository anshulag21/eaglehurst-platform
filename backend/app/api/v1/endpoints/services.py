"""
Service request API endpoints
"""

from typing import Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....schemas.service_schemas import (
    ServiceRequestCreate, ServiceRequestResponse, ServiceRequestUpdate,
    ServiceCommunicationCreate, ServiceDocumentResponse
)
from ....schemas.common_schemas import SuccessResponse, PaginationParams
from ....business_logic.service_bl import ServiceBusinessLogic
from ....utils.dependencies import (
    get_current_user, get_current_admin
)
from ....models.user_models import User

router = APIRouter()


@router.post("/", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_service_request(
    service_data: ServiceRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Create a new service request
    
    - **service_type**: Type of service (legal, valuation)
    - **title**: Service request title
    - **description**: Detailed description of service needed
    - **urgency**: Urgency level (low, medium, high)
    - **listing_id**: Optional - related listing ID
    - **preferred_contact_method**: email or phone
    - **service_details**: Additional service-specific information
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.create_service_request(current_user, service_data)
    
    return SuccessResponse(
        success=True,
        message="Service request created successfully",
        data=result
    )


@router.get("/", response_model=SuccessResponse)
async def get_user_service_requests(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    service_type: Optional[str] = Query(None, description="Filter by service type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user's service requests
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 20, max: 100)
    - **service_type**: Filter by service type (legal, valuation)
    - **status**: Filter by status
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.get_user_service_requests(
        current_user, page, limit, service_type, status
    )
    
    return SuccessResponse(
        success=True,
        message="Service requests retrieved successfully",
        data=result
    )


@router.get("/{service_request_id}", response_model=SuccessResponse)
async def get_service_request_detail(
    service_request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get detailed service request information
    
    Returns service request details with communications and documents
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.get_service_request_detail(current_user, service_request_id)
    
    return SuccessResponse(
        success=True,
        message="Service request details retrieved successfully",
        data=result
    )


@router.put("/{service_request_id}", response_model=SuccessResponse)
async def update_service_request(
    service_request_id: UUID,
    update_data: ServiceRequestUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update service request (user can update before assignment)
    
    - **title**: Updated title
    - **description**: Updated description
    - **urgency**: Updated urgency level
    - **service_details**: Updated service details
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.update_service_request(
        current_user, service_request_id, update_data
    )
    
    return SuccessResponse(
        success=True,
        message="Service request updated successfully",
        data=result
    )


@router.post("/{service_request_id}/communications", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def add_service_communication(
    service_request_id: UUID,
    communication_data: ServiceCommunicationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Add communication to service request
    
    - **communication_type**: Type of communication (email, call, meeting, note)
    - **subject**: Communication subject
    - **content**: Communication content
    - **is_client_visible**: Whether client can see this communication
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.add_service_communication(
        current_user, service_request_id, communication_data
    )
    
    return SuccessResponse(
        success=True,
        message="Communication added successfully",
        data=result
    )


@router.get("/{service_request_id}/communications", response_model=SuccessResponse)
async def get_service_communications(
    service_request_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get communications for a service request
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.get_service_communications(
        current_user, service_request_id, page, limit
    )
    
    return SuccessResponse(
        success=True,
        message="Communications retrieved successfully",
        data=result
    )


@router.post("/{service_request_id}/documents", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def upload_service_document(
    service_request_id: UUID,
    files: list[UploadFile] = File(...),
    document_type: Optional[str] = Query(None, description="Document type"),
    description: Optional[str] = Query(None, description="Document description"),
    is_confidential: bool = Query(False, description="Is document confidential"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Upload documents for service request
    
    - **files**: Document files to upload
    - **document_type**: Type of document (contract, report, certificate, etc.)
    - **description**: Document description
    - **is_confidential**: Whether document is confidential
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.upload_service_documents(
        current_user, service_request_id, files, document_type, description, is_confidential
    )
    
    return SuccessResponse(
        success=True,
        message="Documents uploaded successfully",
        data=result
    )


@router.get("/{service_request_id}/documents", response_model=SuccessResponse)
async def get_service_documents(
    service_request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get documents for a service request
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.get_service_documents(current_user, service_request_id)
    
    return SuccessResponse(
        success=True,
        message="Documents retrieved successfully",
        data=result
    )


@router.delete("/{service_request_id}", response_model=SuccessResponse)
async def cancel_service_request(
    service_request_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Cancel service request (only if not yet assigned or started)
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.cancel_service_request(current_user, service_request_id)
    
    return SuccessResponse(
        success=True,
        message="Service request cancelled successfully",
        data=result
    )


# Admin endpoints for service management
@router.get("/admin/all", response_model=SuccessResponse)
async def get_all_service_requests(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    service_type: Optional[str] = Query(None, description="Filter by service type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    urgency: Optional[str] = Query(None, description="Filter by urgency"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all service requests (Admin only)
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.get_all_service_requests(
        page, limit, service_type, status, urgency
    )
    
    return SuccessResponse(
        success=True,
        message="All service requests retrieved successfully",
        data=result
    )


@router.put("/admin/{service_request_id}/assign", response_model=SuccessResponse)
async def assign_service_request(
    service_request_id: UUID,
    admin_notes: Optional[str] = Query(None, description="Admin assignment notes"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Assign service request to admin (Admin only)
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.assign_service_request(
        current_admin, service_request_id, admin_notes
    )
    
    return SuccessResponse(
        success=True,
        message="Service request assigned successfully",
        data=result
    )


@router.put("/admin/{service_request_id}/status", response_model=SuccessResponse)
async def update_service_request_status(
    service_request_id: UUID,
    new_status: str = Query(..., description="New status"),
    admin_notes: Optional[str] = Query(None, description="Admin notes"),
    final_cost: Optional[float] = Query(None, description="Final cost"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update service request status (Admin only)
    
    - **new_status**: New status (assigned, in_progress, completed, cancelled)
    - **admin_notes**: Admin notes for status change
    - **final_cost**: Final cost (required for completion)
    """
    service_bl = ServiceBusinessLogic(db)
    result = await service_bl.update_service_request_status(
        current_admin, service_request_id, new_status, admin_notes, final_cost
    )
    
    return SuccessResponse(
        success=True,
        message="Service request status updated successfully",
        data=result
    )