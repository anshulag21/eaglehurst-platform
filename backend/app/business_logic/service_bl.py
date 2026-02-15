"""
Service request business logic
"""

from typing import Any, Dict, List, Optional
from uuid import UUID
from fastapi import HTTPException, status, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func

from ..dao.base_dao import BaseDAO
from ..models.user_models import User
from ..models.service_models import ServiceRequest, ServiceCommunication, ServiceDocument
from ..schemas.service_schemas import (
    ServiceRequestCreate, ServiceRequestUpdate, ServiceCommunicationCreate
)
from ..core.constants import UserType, ServiceRequestStatus
from ..utils.file_handler import FileHandler
import logging

logger = logging.getLogger(__name__)


class ServiceBusinessLogic:
    def __init__(self, db: Session):
        self.db = db
        self.base_dao = BaseDAO(db)
        self.file_handler = FileHandler()

    async def create_service_request(
        self, user: User, service_data: ServiceRequestCreate
    ) -> Dict[str, Any]:
        """Create a new service request"""
        try:
            # Create service request
            service_request = ServiceRequest(
                user_id=user.id,
                listing_id=service_data.listing_id,
                service_type=service_data.service_type,
                title=service_data.title,
                description=service_data.description,
                urgency=service_data.urgency,
                preferred_contact_method=service_data.preferred_contact_method,
                contact_phone=service_data.contact_phone,
                contact_email=service_data.contact_email,
                service_details=service_data.service_details,
                status=ServiceRequestStatus.PENDING
            )

            self.db.add(service_request)
            self.db.commit()
            self.db.refresh(service_request)

            return {
                "id": service_request.id,
                "service_type": service_request.service_type,
                "title": service_request.title,
                "status": service_request.status,
                "created_at": service_request.requested_at
            }

        except Exception as e:
            logger.error(f"Error creating service request: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create service request"
            )

    async def get_user_service_requests(
        self, user: User, page: int, limit: int, 
        service_type: Optional[str] = None, status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get user's service requests"""
        try:
            offset = (page - 1) * limit
            
            query = self.db.query(ServiceRequest).filter(
                ServiceRequest.user_id == user.id
            )
            
            if service_type:
                query = query.filter(ServiceRequest.service_type == service_type)
            
            if status_filter:
                query = query.filter(ServiceRequest.status == status_filter)
            
            total = query.count()
            requests = query.order_by(desc(ServiceRequest.requested_at)).offset(offset).limit(limit).all()

            request_list = []
            for req in requests:
                request_data = {
                    "id": req.id,
                    "service_type": req.service_type,
                    "title": req.title,
                    "description": req.description,
                    "urgency": req.urgency,
                    "status": req.status,
                    "estimated_cost": req.estimated_cost,
                    "final_cost": req.final_cost,
                    "requested_at": req.requested_at,
                    "updated_at": req.updated_at
                }
                request_list.append(request_data)

            return {
                "service_requests": request_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except Exception as e:
            logger.error(f"Error getting user service requests: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve service requests"
            )

    async def get_service_request_detail(
        self, user: User, service_request_id: UUID
    ) -> Dict[str, Any]:
        """Get detailed service request information"""
        try:
            service_request = self.db.query(ServiceRequest).filter(
                ServiceRequest.id == service_request_id
            ).first()

            if not service_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service request not found"
                )

            # Check access permissions
            if service_request.user_id != user.id and user.user_type != UserType.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this service request"
                )

            # Get communications
            communications = self.db.query(ServiceCommunication).filter(
                ServiceCommunication.service_request_id == service_request_id
            ).order_by(ServiceCommunication.created_at).all()

            # Get documents
            documents = self.db.query(ServiceDocument).filter(
                ServiceDocument.service_request_id == service_request_id
            ).all()

            return {
                "id": service_request.id,
                "service_type": service_request.service_type,
                "title": service_request.title,
                "description": service_request.description,
                "urgency": service_request.urgency,
                "status": service_request.status,
                "estimated_cost": service_request.estimated_cost,
                "final_cost": service_request.final_cost,
                "requested_at": service_request.requested_at,
                "communications": [
                    {
                        "id": comm.id,
                        "type": comm.communication_type,
                        "subject": comm.subject,
                        "content": comm.content,
                        "is_client_visible": comm.is_client_visible,
                        "created_at": comm.created_at
                    }
                    for comm in communications if comm.is_client_visible or user.user_type == UserType.ADMIN
                ],
                "documents": [
                    {
                        "id": doc.id,
                        "file_name": doc.file_name,
                        "document_type": doc.document_type,
                        "description": doc.description,
                        "uploaded_at": doc.uploaded_at
                    }
                    for doc in documents if doc.is_client_accessible or user.user_type == UserType.ADMIN
                ]
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting service request detail: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve service request details"
            )

    async def update_service_request(
        self, user: User, service_request_id: UUID, update_data: ServiceRequestUpdate
    ) -> Dict[str, Any]:
        """Update service request (user can update before assignment)"""
        try:
            service_request = self.db.query(ServiceRequest).filter(
                and_(
                    ServiceRequest.id == service_request_id,
                    ServiceRequest.user_id == user.id
                )
            ).first()

            if not service_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service request not found"
                )

            # Only allow updates if not yet assigned
            if service_request.status not in [ServiceRequestStatus.PENDING]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot update service request after it has been assigned"
                )

            # Update fields
            update_dict = update_data.dict(exclude_unset=True)
            for field, value in update_dict.items():
                setattr(service_request, field, value)

            service_request.updated_at = func.now()
            
            self.db.commit()
            self.db.refresh(service_request)

            return {
                "id": service_request.id,
                "title": service_request.title,
                "description": service_request.description,
                "updated_at": service_request.updated_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating service request: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update service request"
            )

    async def add_service_communication(
        self, user: User, service_request_id: UUID, communication_data: ServiceCommunicationCreate
    ) -> Dict[str, Any]:
        """Add communication to service request"""
        try:
            service_request = self.db.query(ServiceRequest).filter(
                ServiceRequest.id == service_request_id
            ).first()

            if not service_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service request not found"
                )

            # Check permissions
            if service_request.user_id != user.id and user.user_type != UserType.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this service request"
                )

            communication = ServiceCommunication(
                service_request_id=service_request_id,
                sender_id=user.id,
                communication_type=communication_data.communication_type,
                subject=communication_data.subject,
                content=communication_data.content,
                is_internal=user.user_type == UserType.ADMIN,
                is_client_visible=communication_data.is_client_visible
            )

            self.db.add(communication)
            self.db.commit()
            self.db.refresh(communication)

            return {
                "id": communication.id,
                "type": communication.communication_type,
                "subject": communication.subject,
                "created_at": communication.created_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error adding service communication: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to add communication"
            )

    async def get_service_communications(
        self, user: User, service_request_id: UUID, page: int, limit: int
    ) -> Dict[str, Any]:
        """Get communications for a service request"""
        try:
            # Check access to service request
            service_request = self.db.query(ServiceRequest).filter(
                ServiceRequest.id == service_request_id
            ).first()

            if not service_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service request not found"
                )

            if service_request.user_id != user.id and user.user_type != UserType.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this service request"
                )

            offset = (page - 1) * limit
            
            query = self.db.query(ServiceCommunication).filter(
                ServiceCommunication.service_request_id == service_request_id
            )

            # Filter based on user type
            if user.user_type != UserType.ADMIN:
                query = query.filter(ServiceCommunication.is_client_visible == True)

            total = query.count()
            communications = query.order_by(ServiceCommunication.created_at).offset(offset).limit(limit).all()

            comm_list = [
                {
                    "id": comm.id,
                    "type": comm.communication_type,
                    "subject": comm.subject,
                    "content": comm.content,
                    "created_at": comm.created_at
                }
                for comm in communications
            ]

            return {
                "communications": comm_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting service communications: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve communications"
            )

    async def upload_service_documents(
        self, user: User, service_request_id: UUID, files: List[UploadFile],
        document_type: Optional[str], description: Optional[str], is_confidential: bool
    ) -> Dict[str, Any]:
        """Upload documents for service request"""
        try:
            service_request = self.db.query(ServiceRequest).filter(
                ServiceRequest.id == service_request_id
            ).first()

            if not service_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service request not found"
                )

            if service_request.user_id != user.id and user.user_type != UserType.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this service request"
                )

            uploaded_docs = []
            for file in files:
                # Save file
                file_info = await self.file_handler.save_document(
                    file, f"service_requests/{service_request_id}"
                )

                # Create document record
                document = ServiceDocument(
                    service_request_id=service_request_id,
                    uploaded_by_id=user.id,
                    file_name=file_info["original_filename"],
                    file_url=file_info["file_url"],
                    file_size=str(file_info["file_size"]),
                    file_type=file_info["content_type"],
                    document_type=document_type,
                    description=description,
                    is_confidential=is_confidential,
                    is_client_accessible=not is_confidential
                )

                self.db.add(document)
                uploaded_docs.append({
                    "file_name": file_info["original_filename"],
                    "file_size": file_info["file_size"],
                    "document_type": document_type
                })

            self.db.commit()

            return {
                "uploaded_documents": uploaded_docs,
                "total_uploaded": len(uploaded_docs)
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error uploading service documents: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload documents"
            )

    async def get_service_documents(
        self, user: User, service_request_id: UUID
    ) -> Dict[str, Any]:
        """Get documents for a service request"""
        try:
            service_request = self.db.query(ServiceRequest).filter(
                ServiceRequest.id == service_request_id
            ).first()

            if not service_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service request not found"
                )

            if service_request.user_id != user.id and user.user_type != UserType.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this service request"
                )

            query = self.db.query(ServiceDocument).filter(
                ServiceDocument.service_request_id == service_request_id
            )

            # Filter based on user type
            if user.user_type != UserType.ADMIN:
                query = query.filter(ServiceDocument.is_client_accessible == True)

            documents = query.all()

            doc_list = [
                {
                    "id": doc.id,
                    "file_name": doc.file_name,
                    "file_url": doc.file_url,
                    "document_type": doc.document_type,
                    "description": doc.description,
                    "uploaded_at": doc.uploaded_at
                }
                for doc in documents
            ]

            return {"documents": doc_list}

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting service documents: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve documents"
            )

    async def cancel_service_request(
        self, user: User, service_request_id: UUID
    ) -> Dict[str, Any]:
        """Cancel service request"""
        try:
            service_request = self.db.query(ServiceRequest).filter(
                and_(
                    ServiceRequest.id == service_request_id,
                    ServiceRequest.user_id == user.id
                )
            ).first()

            if not service_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service request not found"
                )

            # Only allow cancellation if not yet started
            if service_request.status in [ServiceRequestStatus.IN_PROGRESS, ServiceRequestStatus.COMPLETED]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot cancel service request that is in progress or completed"
                )

            service_request.status = ServiceRequestStatus.CANCELLED
            service_request.updated_at = func.now()

            self.db.commit()

            return {
                "id": service_request_id,
                "status": service_request.status,
                "cancelled_at": service_request.updated_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cancelling service request: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cancel service request"
            )

    # Admin methods
    async def get_all_service_requests(
        self, page: int, limit: int, service_type: Optional[str] = None,
        status_filter: Optional[str] = None, urgency: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get all service requests (Admin only)"""
        try:
            offset = (page - 1) * limit
            
            query = self.db.query(ServiceRequest)
            
            if service_type:
                query = query.filter(ServiceRequest.service_type == service_type)
            if status_filter:
                query = query.filter(ServiceRequest.status == status_filter)
            if urgency:
                query = query.filter(ServiceRequest.urgency == urgency)
            
            total = query.count()
            requests = query.order_by(desc(ServiceRequest.requested_at)).offset(offset).limit(limit).all()

            request_list = []
            for req in requests:
                request_data = {
                    "id": req.id,
                    "user_id": req.user_id,
                    "service_type": req.service_type,
                    "title": req.title,
                    "urgency": req.urgency,
                    "status": req.status,
                    "estimated_cost": req.estimated_cost,
                    "requested_at": req.requested_at
                }
                request_list.append(request_data)

            return {
                "service_requests": request_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except Exception as e:
            logger.error(f"Error getting all service requests: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve service requests"
            )

    async def assign_service_request(
        self, admin_user: User, service_request_id: UUID, admin_notes: Optional[str]
    ) -> Dict[str, Any]:
        """Assign service request to admin"""
        try:
            service_request = self.db.query(ServiceRequest).filter(
                ServiceRequest.id == service_request_id
            ).first()

            if not service_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service request not found"
                )

            service_request.status = ServiceRequestStatus.ASSIGNED
            service_request.admin_assigned_id = admin_user.id
            service_request.admin_notes = admin_notes
            service_request.assigned_at = func.now()
            service_request.updated_at = func.now()

            self.db.commit()

            return {
                "id": service_request_id,
                "status": service_request.status,
                "assigned_to": admin_user.id,
                "assigned_at": service_request.assigned_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error assigning service request: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to assign service request"
            )

    async def update_service_request_status(
        self, admin_user: User, service_request_id: UUID, new_status: str,
        admin_notes: Optional[str], final_cost: Optional[float]
    ) -> Dict[str, Any]:
        """Update service request status (Admin only)"""
        try:
            service_request = self.db.query(ServiceRequest).filter(
                ServiceRequest.id == service_request_id
            ).first()

            if not service_request:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service request not found"
                )

            service_request.status = new_status
            if admin_notes:
                service_request.admin_notes = admin_notes
            if final_cost:
                service_request.final_cost = final_cost
            
            if new_status == ServiceRequestStatus.COMPLETED:
                service_request.completed_at = func.now()
            elif new_status == ServiceRequestStatus.IN_PROGRESS:
                service_request.started_at = func.now()
            
            service_request.updated_at = func.now()

            self.db.commit()

            return {
                "id": service_request_id,
                "status": service_request.status,
                "final_cost": service_request.final_cost,
                "updated_at": service_request.updated_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating service request status: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update service request status"
            )
