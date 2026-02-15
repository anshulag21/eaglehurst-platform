"""
Common Pydantic schemas used across the application
"""

from typing import Optional, Any, Dict, List
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


class BaseResponse(BaseModel):
    """Base response schema for all API responses"""
    success: bool = Field(..., description="Indicates if the request was successful")
    message: Optional[str] = Field(None, description="Response message")
    
    class Config:
        from_attributes = True


class SuccessResponse(BaseResponse):
    """Success response schema"""
    success: bool = Field(True, description="Always true for success responses")
    data: Optional[Any] = Field(None, description="Response data")


class ErrorResponse(BaseResponse):
    """Error response schema"""
    success: bool = Field(False, description="Always false for error responses")
    error: Dict[str, Any] = Field(..., description="Error details")


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints"""
    page: int = Field(1, ge=1, description="Page number (starts from 1)")
    limit: int = Field(20, ge=1, le=100, description="Number of items per page")


class PaginationResponse(BaseModel):
    """Pagination metadata for list responses"""
    current_page: int = Field(..., description="Current page number")
    total_pages: int = Field(..., description="Total number of pages")
    total_items: int = Field(..., description="Total number of items")
    items_per_page: int = Field(..., description="Number of items per page")
    has_next: bool = Field(..., description="Whether there is a next page")
    has_previous: bool = Field(..., description="Whether there is a previous page")


class SortParams(BaseModel):
    """Sorting parameters for list endpoints"""
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: Optional[str] = Field("asc", pattern="^(asc|desc)$", description="Sort order")


class FilterParams(BaseModel):
    """Base filter parameters"""
    search: Optional[str] = Field(None, description="Search query")
    created_after: Optional[datetime] = Field(None, description="Filter items created after this date")
    created_before: Optional[datetime] = Field(None, description="Filter items created before this date")


class FileUploadResponse(BaseModel):
    """Response schema for file uploads"""
    file_id: UUID = Field(..., description="Unique file identifier")
    file_name: str = Field(..., description="Original file name")
    file_url: str = Field(..., description="URL to access the file")
    file_size: int = Field(..., description="File size in bytes")
    file_type: str = Field(..., description="MIME type of the file")
    uploaded_at: datetime = Field(..., description="Upload timestamp")


class LocationSchema(BaseModel):
    """Location information schema"""
    address: Optional[str] = Field(None, description="Street address")
    city: Optional[str] = Field(None, description="City")
    region: Optional[str] = Field(None, description="Region/County")
    postcode: Optional[str] = Field(None, description="Postal code")
    country: str = Field("United Kingdom", description="Country")
    
    class Config:
        from_attributes = True


class ContactInfoSchema(BaseModel):
    """Contact information schema"""
    email: Optional[str] = Field(None, description="Email address")
    phone: Optional[str] = Field(None, description="Phone number")
    preferred_method: Optional[str] = Field("email", description="Preferred contact method")
    
    class Config:
        from_attributes = True


class MetadataSchema(BaseModel):
    """Generic metadata schema for flexible data storage"""
    key: str = Field(..., description="Metadata key")
    value: Any = Field(..., description="Metadata value")
    type: Optional[str] = Field(None, description="Value type hint")


class HealthCheckResponse(BaseModel):
    """Health check response schema"""
    status: str = Field("healthy", description="Service status")
    timestamp: datetime = Field(..., description="Check timestamp")
    version: str = Field(..., description="API version")
    database: str = Field(..., description="Database status")
    redis: Optional[str] = Field(None, description="Redis status")


class ValidationErrorDetail(BaseModel):
    """Validation error detail schema"""
    field: str = Field(..., description="Field name with error")
    message: str = Field(..., description="Error message")
    type: str = Field(..., description="Error type")


class APIKeySchema(BaseModel):
    """API key information schema"""
    key_id: UUID = Field(..., description="API key identifier")
    name: str = Field(..., description="API key name")
    permissions: List[str] = Field(..., description="API key permissions")
    expires_at: Optional[datetime] = Field(None, description="Expiration date")
    last_used: Optional[datetime] = Field(None, description="Last usage timestamp")
    is_active: bool = Field(..., description="Whether the key is active")


class AuditLogSchema(BaseModel):
    """Audit log entry schema"""
    id: UUID = Field(..., description="Log entry ID")
    user_id: Optional[UUID] = Field(None, description="User who performed the action")
    action: str = Field(..., description="Action performed")
    resource_type: Optional[str] = Field(None, description="Type of resource affected")
    resource_id: Optional[UUID] = Field(None, description="ID of resource affected")
    changes: Optional[Dict[str, Any]] = Field(None, description="Changes made")
    ip_address: Optional[str] = Field(None, description="IP address of the user")
    user_agent: Optional[str] = Field(None, description="User agent string")
    timestamp: datetime = Field(..., description="When the action occurred")
    
    class Config:
        from_attributes = True
