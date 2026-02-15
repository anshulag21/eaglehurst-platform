"""
Service request related Pydantic schemas
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from ..core.constants import ServiceRequestStatus


# Service Request Schemas
class ServiceRequestCreate(BaseModel):
    """Schema for creating a service request"""
    listing_id: Optional[UUID] = Field(None, description="Related listing ID")
    service_type: str = Field(..., description="Type of service (legal, valuation, etc.)")
    title: str = Field(..., max_length=255, description="Service request title")
    description: str = Field(..., max_length=2000, description="Detailed description of service needed")
    urgency: str = Field(..., description="Urgency level (low, medium, high)")
    preferred_contact_method: str = Field(..., description="Preferred contact method (email, phone)")
    contact_phone: Optional[str] = Field(None, description="Contact phone number")
    contact_email: Optional[str] = Field(None, description="Contact email address")
    service_details: Optional[Dict[str, Any]] = Field(None, description="Additional service-specific details")
    
    class Config:
        from_attributes = True


class ServiceRequestUpdate(BaseModel):
    """Schema for updating a service request"""
    title: Optional[str] = Field(None, max_length=255, description="Updated title")
    description: Optional[str] = Field(None, max_length=2000, description="Updated description")
    urgency: Optional[str] = Field(None, description="Updated urgency level")
    preferred_contact_method: Optional[str] = Field(None, description="Updated contact method")
    contact_phone: Optional[str] = Field(None, description="Updated phone number")
    contact_email: Optional[str] = Field(None, description="Updated email address")
    service_details: Optional[Dict[str, Any]] = Field(None, description="Updated service details")
    
    class Config:
        from_attributes = True


class ServiceRequestResponse(BaseModel):
    """Schema for service request response"""
    id: UUID = Field(..., description="Service request ID")
    user_id: UUID = Field(..., description="User ID who requested the service")
    listing_id: Optional[UUID] = Field(None, description="Related listing ID")
    service_type: str = Field(..., description="Type of service")
    title: str = Field(..., description="Service request title")
    description: str = Field(..., description="Service description")
    urgency: str = Field(..., description="Urgency level")
    status: ServiceRequestStatus = Field(..., description="Request status")
    preferred_contact_method: str = Field(..., description="Preferred contact method")
    contact_phone: Optional[str] = Field(None, description="Contact phone")
    contact_email: Optional[str] = Field(None, description="Contact email")
    service_details: Optional[Dict[str, Any]] = Field(None, description="Service-specific details")
    estimated_cost: Optional[Decimal] = Field(None, description="Estimated cost")
    final_cost: Optional[Decimal] = Field(None, description="Final cost")
    admin_notes: Optional[str] = Field(None, description="Admin notes")
    requested_at: datetime = Field(..., description="Request timestamp")
    assigned_at: Optional[datetime] = Field(None, description="Assignment timestamp")
    started_at: Optional[datetime] = Field(None, description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    class Config:
        from_attributes = True


# Service Communication Schemas
class ServiceCommunicationCreate(BaseModel):
    """Schema for creating service communication"""
    communication_type: str = Field(..., description="Communication type (email, phone, meeting)")
    subject: str = Field(..., max_length=255, description="Communication subject")
    content: str = Field(..., max_length=2000, description="Communication content")
    is_client_visible: bool = Field(True, description="Whether client can see this communication")
    
    class Config:
        from_attributes = True


class ServiceCommunicationResponse(BaseModel):
    """Schema for service communication response"""
    id: UUID = Field(..., description="Communication ID")
    service_request_id: UUID = Field(..., description="Service request ID")
    sender_id: UUID = Field(..., description="Sender user ID")
    communication_type: str = Field(..., description="Communication type")
    subject: str = Field(..., description="Communication subject")
    content: str = Field(..., description="Communication content")
    is_internal: bool = Field(..., description="Whether this is internal communication")
    is_client_visible: bool = Field(..., description="Whether client can see this")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    class Config:
        from_attributes = True


# Service Document Schemas
class ServiceDocumentResponse(BaseModel):
    """Schema for service document response"""
    id: UUID = Field(..., description="Document ID")
    service_request_id: UUID = Field(..., description="Service request ID")
    uploaded_by_id: UUID = Field(..., description="Uploader user ID")
    file_name: str = Field(..., description="Original file name")
    file_url: str = Field(..., description="File URL")
    file_size: str = Field(..., description="File size")
    file_type: str = Field(..., description="File MIME type")
    document_type: Optional[str] = Field(None, description="Document type category")
    description: Optional[str] = Field(None, description="Document description")
    is_confidential: bool = Field(..., description="Whether document is confidential")
    is_client_accessible: bool = Field(..., description="Whether client can access this document")
    uploaded_at: datetime = Field(..., description="Upload timestamp")
    
    class Config:
        from_attributes = True


# Service Analytics Schemas
class ServiceAnalyticsResponse(BaseModel):
    """Schema for service analytics response"""
    total_requests: int = Field(..., description="Total service requests")
    pending_requests: int = Field(..., description="Pending requests")
    in_progress_requests: int = Field(..., description="In progress requests")
    completed_requests: int = Field(..., description="Completed requests")
    cancelled_requests: int = Field(..., description="Cancelled requests")
    average_completion_time: Optional[float] = Field(None, description="Average completion time in days")
    total_revenue: Decimal = Field(..., description="Total revenue from services")
    requests_by_type: Dict[str, int] = Field(..., description="Requests breakdown by service type")
    requests_by_urgency: Dict[str, int] = Field(..., description="Requests breakdown by urgency")
    monthly_trends: List[Dict[str, Any]] = Field(..., description="Monthly request trends")
    
    class Config:
        from_attributes = True


# Service Type Configuration Schemas
class ServiceTypeConfig(BaseModel):
    """Schema for service type configuration"""
    service_type: str = Field(..., description="Service type identifier")
    display_name: str = Field(..., description="Display name for service type")
    description: str = Field(..., description="Service type description")
    base_cost: Optional[Decimal] = Field(None, description="Base cost for this service type")
    estimated_duration: Optional[int] = Field(None, description="Estimated duration in days")
    required_fields: List[str] = Field(..., description="Required fields for this service type")
    available_urgency_levels: List[str] = Field(..., description="Available urgency levels")
    
    class Config:
        from_attributes = True


# Service Provider Schemas (for future use)
class ServiceProviderResponse(BaseModel):
    """Schema for service provider response"""
    id: UUID = Field(..., description="Provider ID")
    name: str = Field(..., description="Provider name")
    email: str = Field(..., description="Provider email")
    phone: Optional[str] = Field(None, description="Provider phone")
    specializations: List[str] = Field(..., description="Provider specializations")
    rating: Optional[float] = Field(None, description="Provider rating")
    completed_services: int = Field(..., description="Number of completed services")
    is_active: bool = Field(..., description="Whether provider is active")
    
    class Config:
        from_attributes = True


# Service Feedback Schemas
class ServiceFeedbackCreate(BaseModel):
    """Schema for creating service feedback"""
    rating: int = Field(..., ge=1, le=5, description="Service rating (1-5)")
    feedback: Optional[str] = Field(None, max_length=1000, description="Written feedback")
    would_recommend: bool = Field(..., description="Whether user would recommend the service")
    
    class Config:
        from_attributes = True


class ServiceFeedbackResponse(BaseModel):
    """Schema for service feedback response"""
    id: UUID = Field(..., description="Feedback ID")
    service_request_id: UUID = Field(..., description="Service request ID")
    user_id: UUID = Field(..., description="User who provided feedback")
    rating: int = Field(..., description="Service rating")
    feedback: Optional[str] = Field(None, description="Written feedback")
    would_recommend: bool = Field(..., description="Recommendation status")
    created_at: datetime = Field(..., description="Feedback creation timestamp")
    
    class Config:
        from_attributes = True