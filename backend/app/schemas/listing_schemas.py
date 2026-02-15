"""
Listing-related Pydantic schemas for API validation
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from ..core.constants import ListingStatus, BusinessType
from .common_schemas import LocationSchema, PaginationParams, SortParams


# Base Listing Schemas
class ListingBase(BaseModel):
    """Base listing schema with common fields"""
    title: str = Field(..., min_length=1, max_length=255, description="Listing title")
    description: str = Field(..., min_length=10, description="Listing description")
    business_type: BusinessType = Field(..., description="Type of business sale")
    location: str = Field(..., min_length=1, max_length=255, description="Business location")
    
    class Config:
        from_attributes = True


class BusinessDetailsSchema(BaseModel):
    """Schema for UK medical business specific details"""
    practice_name: Optional[str] = Field(None, max_length=255, description="Practice name")
    practice_type: Optional[str] = Field(None, max_length=100, description="Type of medical practice")
    premises_type: Optional[str] = Field(None, description="Premises type (owned/leased)")
    
    # NHS and Patient Information
    nhs_contract: bool = Field(False, description="Has NHS contract")
    nhs_contract_details: Optional[Dict[str, Any]] = Field(None, description="NHS contract details")
    private_patient_base: Optional[int] = Field(None, ge=0, description="Number of private patients")
    patient_list_size: Optional[int] = Field(None, ge=0, description="Total patient list size")
    
    # Staff and Operations
    staff_count: Optional[int] = Field(None, ge=0, description="Number of staff members")
    equipment_inventory: Optional[Dict[str, Any]] = Field(None, description="Equipment inventory details")
    
    # Regulatory Information
    cqc_registered: bool = Field(False, description="CQC registered")
    cqc_registration_number: Optional[str] = Field(None, max_length=50, description="CQC registration number")
    professional_indemnity_insurance: bool = Field(False, description="Has professional indemnity insurance")
    insurance_details: Optional[Dict[str, Any]] = Field(None, description="Insurance details")
    
    # Property Information
    lease_agreement_details: Optional[Dict[str, Any]] = Field(None, description="Lease agreement details")
    property_value: Optional[Decimal] = Field(None, ge=0, description="Property value")
    goodwill_valuation: Optional[Decimal] = Field(None, ge=0, description="Goodwill valuation")
    
    class Config:
        from_attributes = True


class FinancialDataSchema(BaseModel):
    """Schema for financial information (sensitive data)"""
    asking_price: Optional[Decimal] = Field(None, ge=0, description="Asking price")
    annual_revenue: Optional[Decimal] = Field(None, ge=0, description="Annual revenue")
    net_profit: Optional[Decimal] = Field(None, description="Net profit")
    financial_statements: Optional[List[str]] = Field(None, description="URLs to financial documents")
    
    class Config:
        from_attributes = True


class ListingCreate(ListingBase):
    """Schema for creating a new listing"""
    postcode: Optional[str] = Field(None, max_length=10, description="Postcode")
    region: Optional[str] = Field(None, max_length=100, description="Region")
    
    # Financial Information
    financial_data: Optional[FinancialDataSchema] = Field(None, description="Financial information")
    
    # Business Details
    business_details: Optional[BusinessDetailsSchema] = Field(None, description="Business specific details")
    
    # Listing Settings
    is_masked: bool = Field(True, description="Whether to mask sensitive information")
    scheduled_publish_date: Optional[datetime] = Field(None, description="Scheduled publication date")
    is_draft: bool = Field(True, description="Whether this is a draft listing")


class ListingUpdate(BaseModel):
    """Schema for updating an existing listing"""
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, min_length=10)
    business_type: Optional[BusinessType] = Field(None)
    location: Optional[str] = Field(None, min_length=1, max_length=255)
    postcode: Optional[str] = Field(None, max_length=10)
    region: Optional[str] = Field(None, max_length=100)
    
    # Financial Information
    financial_data: Optional[FinancialDataSchema] = Field(None)
    
    # Business Details
    business_details: Optional[BusinessDetailsSchema] = Field(None)
    
    # Listing Settings
    is_masked: Optional[bool] = Field(None)
    scheduled_publish_date: Optional[datetime] = Field(None)
    is_draft: Optional[bool] = Field(None, description="Whether this is a draft listing")


class ListingMediaSchema(BaseModel):
    """Schema for listing media files"""
    id: UUID = Field(..., description="Media file ID")
    file_url: str = Field(..., description="File URL")
    file_type: str = Field(..., description="File type (image, video, document)")
    file_name: str = Field(..., description="Original file name")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    display_order: int = Field(..., description="Display order")
    is_primary: bool = Field(..., description="Whether this is the primary image")
    caption: Optional[str] = Field(None, description="Media caption")
    
    class Config:
        from_attributes = True


class ListingResponse(ListingBase):
    """Schema for listing response (public view)"""
    id: UUID = Field(..., description="Listing unique identifier")
    seller_id: UUID = Field(..., description="Seller ID")
    status: ListingStatus = Field(..., description="Listing status")
    postcode: Optional[str] = Field(None, description="Postcode")
    region: Optional[str] = Field(None, description="Region")
    
    # Financial Information (may be masked)
    asking_price: Optional[Decimal] = Field(None, description="Asking price (may be masked)")
    price_range: Optional[str] = Field(None, description="Price range if masked")
    
    # Business Information (may be masked)
    business_summary: Optional[str] = Field(None, description="Business summary")
    patient_list_size: Optional[int] = Field(None, description="Total patient list size")
    staff_count: Optional[int] = Field(None, description="Number of staff members")
    
    # Media
    media_files: List[ListingMediaSchema] = Field([], description="Media files")
    primary_image: Optional[str] = Field(None, description="Primary image URL")
    
    # Metadata (only visible to listing owners)
    view_count: Optional[int] = Field(None, description="Number of views (sellers only)")
    connection_count: Optional[int] = Field(None, description="Number of connections (sellers only)")
    saved_count: Optional[int] = Field(None, description="Number of times saved/favorited (sellers only)")
    last_viewed_at: Optional[datetime] = Field(None, description="Last time the listing was viewed")
    is_connected: bool = Field(False, description="Whether current user is connected")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    published_at: Optional[datetime] = Field(None, description="Publication timestamp")
    
    # Pending edit information (for seller listings)
    has_pending_edit: Optional[bool] = Field(None, description="Whether this listing has pending changes")
    pending_edit_created_at: Optional[datetime] = Field(None, description="When pending changes were submitted")
    pending_edit_reason: Optional[str] = Field(None, description="Reason for the pending edit")
    
    class Config:
        from_attributes = True


class ListingDetailResponse(ListingResponse):
    """Schema for detailed listing response (for connected users)"""
    # Full financial data (only for connected users)
    financial_data: Optional[FinancialDataSchema] = Field(None, description="Complete financial information")
    
    # Full business details
    business_details: Optional[BusinessDetailsSchema] = Field(None, description="Complete business details")
    
    # Seller information (limited)
    seller_info: Optional[Dict[str, Any]] = Field(None, description="Seller information")


class ListingFilters(BaseModel):
    """Schema for listing search filters"""
    business_type: Optional[BusinessType] = Field(None, description="Filter by business type")
    location: Optional[str] = Field(None, description="Filter by location")
    region: Optional[str] = Field(None, description="Filter by region")
    min_price: Optional[Decimal] = Field(None, ge=0, description="Minimum price")
    max_price: Optional[Decimal] = Field(None, ge=0, description="Maximum price")
    nhs_contract: Optional[bool] = Field(None, description="Filter by NHS contract")
    cqc_registered: Optional[bool] = Field(None, description="Filter by CQC registration")
    premises_type: Optional[str] = Field(None, description="Filter by premises type")
    min_patient_list: Optional[int] = Field(None, ge=0, description="Minimum patient list size")
    max_patient_list: Optional[int] = Field(None, ge=0, description="Maximum patient list size")


class ListingSearchParams(PaginationParams, SortParams):
    """Schema for listing search parameters"""
    search: Optional[str] = Field(None, description="Search query")
    filters: Optional[ListingFilters] = Field(None, description="Search filters")


class ListingApprovalRequest(BaseModel):
    """Schema for admin listing approval/rejection"""
    status: ListingStatus = Field(..., description="New listing status")
    feedback: Optional[str] = Field(None, description="Admin feedback")
    admin_notes: Optional[str] = Field(None, description="Internal admin notes")


class ListingEditRequest(BaseModel):
    """Schema for requesting listing edits"""
    edit_data: Dict[str, Any] = Field(..., description="Proposed changes")
    edit_reason: Optional[str] = Field(None, description="Reason for the edit")


class ListingAnalytics(BaseModel):
    """Schema for listing analytics data"""
    listing_id: UUID = Field(..., description="Listing ID")
    total_views: int = Field(..., description="Total views")
    unique_views: int = Field(..., description="Unique views")
    views_this_week: int = Field(..., description="Views this week")
    views_this_month: int = Field(..., description="Views this month")
    connection_requests: int = Field(..., description="Total connection requests")
    approved_connections: int = Field(..., description="Approved connections")
    view_trend: List[Dict[str, Any]] = Field(..., description="View trend over time")
    viewer_locations: List[Dict[str, Any]] = Field(..., description="Viewer location data")
    
    class Config:
        from_attributes = True


class SavedListingResponse(BaseModel):
    """Schema for saved listing response"""
    id: UUID = Field(..., description="Saved listing ID")
    listing: ListingResponse = Field(..., description="Listing information")
    notes: Optional[str] = Field(None, description="User notes")
    saved_at: datetime = Field(..., description="When the listing was saved")
    
    class Config:
        from_attributes = True


class MediaUploadRequest(BaseModel):
    """Schema for media upload request"""
    file_type: str = Field(..., description="Type of media (image, video, document)")
    display_order: Optional[int] = Field(0, description="Display order")
    is_primary: Optional[bool] = Field(False, description="Whether this is the primary image")
    caption: Optional[str] = Field(None, max_length=500, description="Media caption")
