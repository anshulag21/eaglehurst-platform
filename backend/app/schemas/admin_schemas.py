"""
Admin-related Pydantic schemas
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from ..core.constants import VerificationStatus, ListingStatus


# Admin Dashboard Schemas
class AdminDashboardResponse(BaseModel):
    """Schema for admin dashboard response"""
    overview: Dict[str, Any] = Field(..., description="Platform overview statistics")
    recent_activity: Dict[str, Any] = Field(..., description="Recent platform activity")
    alerts: List[Dict[str, Any]] = Field(..., description="System alerts requiring attention")
    
    class Config:
        from_attributes = True


# User Management Schemas
class UserManagementResponse(BaseModel):
    """Schema for user management response"""
    users: List[Dict[str, Any]] = Field(..., description="List of users")
    pagination: Dict[str, Any] = Field(..., description="Pagination information")
    
    class Config:
        from_attributes = True


class UserVerificationRequest(BaseModel):
    """Schema for user verification request"""
    status: VerificationStatus = Field(..., description="Verification status (approved/rejected)")
    admin_notes: Optional[str] = Field(None, max_length=1000, description="Admin notes for verification decision")
    
    class Config:
        from_attributes = True


# Listing Management Schemas
class ListingApprovalRequest(BaseModel):
    """Schema for listing approval/rejection"""
    status: str = Field(..., description="Approval status (approved/rejected)")
    admin_notes: Optional[str] = Field(None, max_length=1000, description="Admin notes")
    rejection_reason: Optional[str] = Field(None, max_length=500, description="Reason for rejection")
    
    class Config:
        from_attributes = True


# Platform Analytics Schemas
class PlatformStatsResponse(BaseModel):
    """Schema for platform statistics response"""
    period: str = Field(..., description="Analytics period")
    start_date: datetime = Field(..., description="Period start date")
    end_date: datetime = Field(..., description="Period end date")
    summary: Dict[str, Any] = Field(..., description="Summary statistics")
    daily_breakdown: List[Dict[str, Any]] = Field(..., description="Daily statistics breakdown")
    
    class Config:
        from_attributes = True


class RevenueAnalyticsResponse(BaseModel):
    """Schema for revenue analytics response"""
    period: str = Field(..., description="Analytics period")
    total_revenue: Decimal = Field(..., description="Total revenue for period")
    revenue_by_tier: List[Dict[str, Any]] = Field(..., description="Revenue breakdown by subscription tier")
    
    class Config:
        from_attributes = True


# System Management Schemas
class SystemNotificationResponse(BaseModel):
    """Schema for system notifications response"""
    alerts: List[Dict[str, Any]] = Field(..., description="System alerts")
    system_health: Dict[str, Any] = Field(..., description="System health status")
    last_updated: datetime = Field(..., description="Last update timestamp")
    
    class Config:
        from_attributes = True


class BroadcastNotificationRequest(BaseModel):
    """Schema for broadcasting notifications"""
    title: str = Field(..., max_length=255, description="Notification title")
    message: str = Field(..., max_length=1000, description="Notification message")
    user_type: Optional[str] = Field(None, description="Target user type (all, buyers, sellers)")
    send_email: bool = Field(False, description="Send email notification")
    
    class Config:
        from_attributes = True


# Activity Log Schemas
class ActivityLogResponse(BaseModel):
    """Schema for activity log response"""
    logs: List[Dict[str, Any]] = Field(..., description="Activity logs")
    pagination: Dict[str, Any] = Field(..., description="Pagination information")
    
    class Config:
        from_attributes = True


# Export Schemas
class ExportResponse(BaseModel):
    """Schema for data export response"""
    export_format: str = Field(..., description="Export file format")
    file_url: str = Field(..., description="Download URL for exported file")
    generated_at: datetime = Field(..., description="Export generation timestamp")
    
    class Config:
        from_attributes = True


# Service Request Management Schemas
class AdminServiceRequestResponse(BaseModel):
    """Schema for admin service request management"""
    service_requests: List[Dict[str, Any]] = Field(..., description="Service requests")
    pagination: Dict[str, Any] = Field(..., description="Pagination information")
    
    class Config:
        from_attributes = True


class ServiceRequestAssignmentRequest(BaseModel):
    """Schema for assigning service requests"""
    admin_notes: Optional[str] = Field(None, max_length=1000, description="Admin notes for assignment")
    
    class Config:
        from_attributes = True


class ServiceRequestStatusUpdate(BaseModel):
    """Schema for updating service request status"""
    status: str = Field(..., description="New status")
    admin_notes: Optional[str] = Field(None, max_length=1000, description="Admin notes")
    final_cost: Optional[Decimal] = Field(None, description="Final cost for completed service")
    
    class Config:
        from_attributes = True


# User Detail Schemas
class AdminUserDetailResponse(BaseModel):
    """Schema for detailed user information for admin"""
    id: UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    first_name: str = Field(..., description="First name")
    last_name: str = Field(..., description="Last name")
    phone: Optional[str] = Field(None, description="Phone number")
    user_type: str = Field(..., description="User type")
    is_verified: bool = Field(..., description="Verification status")
    is_active: bool = Field(..., description="Active status")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    
    # Role-specific data
    seller_profile: Optional[Dict[str, Any]] = Field(None, description="Seller profile data")
    buyer_profile: Optional[Dict[str, Any]] = Field(None, description="Buyer profile data")
    
    # Activity data
    listings: Optional[List[Dict[str, Any]]] = Field(None, description="User's listings")
    connections: Optional[List[Dict[str, Any]]] = Field(None, description="User's connections")
    
    class Config:
        from_attributes = True


# Listing Detail Schemas
class AdminListingDetailResponse(BaseModel):
    """Schema for detailed listing information for admin review"""
    id: UUID = Field(..., description="Listing ID")
    title: str = Field(..., description="Listing title")
    description: str = Field(..., description="Listing description")
    business_type: str = Field(..., description="Business type")
    location: str = Field(..., description="Business location")
    asking_price: Decimal = Field(..., description="Asking price")
    status: ListingStatus = Field(..., description="Listing status")
    created_at: datetime = Field(..., description="Creation timestamp")
    
    # Business details
    annual_revenue: Optional[Decimal] = Field(None, description="Annual revenue")
    net_profit: Optional[Decimal] = Field(None, description="Net profit")
    practice_name: Optional[str] = Field(None, description="Practice name")
    practice_type: Optional[str] = Field(None, description="Practice type")
    
    # Seller information
    seller: Optional[Dict[str, Any]] = Field(None, description="Seller information")
    
    class Config:
        from_attributes = True
