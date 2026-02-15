"""
User-related Pydantic schemas for API validation
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator
from datetime import datetime
from uuid import UUID

from ..core.constants import UserType, VerificationStatus
from .common_schemas import BaseResponse, LocationSchema, ContactInfoSchema


# Base User Schemas
class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: EmailStr = Field(..., description="User email address")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    phone: Optional[str] = Field(None, max_length=20, description="Phone number")
    
    class Config:
        from_attributes = True


class UserCreate(UserBase):
    """Schema for user registration"""
    password: str = Field(..., min_length=8, description="Password (minimum 8 characters)")
    user_type: UserType = Field(..., description="User type (buyer or seller)")
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


class UserLogin(BaseModel):
    """Schema for user login"""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., description="User password")


class UserResponse(UserBase):
    """Schema for user response data"""
    id: UUID = Field(..., description="User unique identifier")
    user_type: UserType = Field(..., description="User type")
    is_verified: bool = Field(..., description="Whether user is verified")
    is_active: bool = Field(..., description="Whether user is active")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: datetime = Field(..., description="Account creation timestamp")
    
    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    """Schema for updating user profile"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(None, min_length=1, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)


# Authentication Schemas
class TokenResponse(BaseModel):
    """Schema for authentication token response"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field("bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user: UserResponse = Field(..., description="User information")


class RefreshTokenRequest(BaseModel):
    """Schema for token refresh request"""
    refresh_token: str = Field(..., description="Refresh token")


class EmailVerificationRequest(BaseModel):
    """Schema for email verification"""
    email: EmailStr = Field(..., description="Email address to verify")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")


class TokenVerificationRequest(BaseModel):
    """Schema for token-based email verification"""
    verification_token: str = Field(..., description="Secure verification token from registration")
    otp: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")


class ResendOTPRequest(BaseModel):
    """Schema for resending OTP"""
    email: EmailStr = Field(..., description="Email address")


class ResendOTPTokenRequest(BaseModel):
    """Schema for resending OTP with token"""
    verification_token: str = Field(..., description="Secure verification token from registration")


class PasswordResetRequest(BaseModel):
    """Schema for password reset request"""
    email: EmailStr = Field(..., description="Email address")


class PasswordResetConfirm(BaseModel):
    """Schema for password reset confirmation"""
    token: str = Field(..., description="Password reset token")
    new_password: str = Field(..., min_length=8, description="New password")
    
    @validator('new_password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain at least one digit')
        return v


# Seller Schemas
class SellerProfileCreate(BaseModel):
    """Schema for creating seller profile"""
    business_name: str = Field(..., min_length=1, max_length=255, description="Business name")
    business_description: Optional[str] = Field(None, description="Business description")
    business_address: Optional[str] = Field(None, description="Business address")


class SellerProfileUpdate(BaseModel):
    """Schema for updating seller profile"""
    business_name: Optional[str] = Field(None, min_length=1, max_length=255)
    business_description: Optional[str] = Field(None)
    business_address: Optional[str] = Field(None)


class SellerProfileResponse(BaseModel):
    """Schema for seller profile response"""
    id: UUID = Field(..., description="Seller profile ID")
    user_id: UUID = Field(..., description="Associated user ID")
    business_name: Optional[str] = Field(None, description="Business name")
    business_description: Optional[str] = Field(None, description="Business description")
    business_address: Optional[str] = Field(None, description="Business address")
    verification_status: VerificationStatus = Field(..., description="Verification status")
    profile_completion_percentage: str = Field(..., description="Profile completion percentage")
    created_at: datetime = Field(..., description="Profile creation timestamp")
    
    class Config:
        from_attributes = True


class KYCDocumentUpload(BaseModel):
    """Schema for KYC document upload metadata"""
    document_type: str = Field(..., description="Type of document (license, identity, etc.)")
    file_name: str = Field(..., description="Original file name")
    file_url: str = Field(..., description="URL to the uploaded file")
    file_size: int = Field(..., description="File size in bytes")


# Buyer Schemas
class BuyerProfileResponse(BaseModel):
    """Schema for buyer profile response"""
    id: UUID = Field(..., description="Buyer profile ID")
    user_id: UUID = Field(..., description="Associated user ID")
    verification_status: VerificationStatus = Field(..., description="Verification status")
    preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")
    created_at: datetime = Field(..., description="Profile creation timestamp")
    
    class Config:
        from_attributes = True


class BuyerPreferencesUpdate(BaseModel):
    """Schema for updating buyer preferences"""
    business_types: Optional[List[str]] = Field(None, description="Preferred business types")
    location_preferences: Optional[List[str]] = Field(None, description="Preferred locations")
    price_range: Optional[Dict[str, float]] = Field(None, description="Price range preferences")
    notification_preferences: Optional[Dict[str, bool]] = Field(None, description="Notification preferences")


# Admin Schemas
class AdminUserCreate(BaseModel):
    """Schema for creating admin users"""
    email: EmailStr = Field(..., description="Admin email address")
    first_name: str = Field(..., min_length=1, max_length=100, description="First name")
    last_name: str = Field(..., min_length=1, max_length=100, description="Last name")
    password: str = Field(..., min_length=8, description="Password")
    permissions: List[str] = Field(..., description="Admin permissions")


class UserVerificationUpdate(BaseModel):
    """Schema for updating user verification status"""
    status: VerificationStatus = Field(..., description="New verification status")
    notes: Optional[str] = Field(None, description="Admin notes")


class UserManagementResponse(BaseModel):
    """Schema for user management response"""
    id: UUID = Field(..., description="User ID")
    email: str = Field(..., description="User email")
    full_name: str = Field(..., description="User full name")
    user_type: UserType = Field(..., description="User type")
    verification_status: VerificationStatus = Field(..., description="Verification status")
    is_active: bool = Field(..., description="Whether user is active")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: datetime = Field(..., description="Account creation timestamp")
    
    class Config:
        from_attributes = True


# Profile Analytics Schemas
class ProfileAnalytics(BaseModel):
    """Schema for profile analytics data"""
    total_views: int = Field(..., description="Total profile views")
    views_this_week: int = Field(..., description="Views in the current week")
    views_this_month: int = Field(..., description="Views in the current month")
    unique_viewers: int = Field(..., description="Number of unique viewers")
    view_trend: List[Dict[str, Any]] = Field(..., description="View trend data")
    top_referrers: List[Dict[str, Any]] = Field(..., description="Top referrer sources")
    
    class Config:
        from_attributes = True


# Update Schemas
class UserProfileUpdate(BaseModel):
    """Schema for updating basic user profile"""
    first_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated first name")
    last_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated last name")
    phone: Optional[str] = Field(None, max_length=20, description="Updated phone number")
    
    class Config:
        from_attributes = True


class SellerProfileUpdate(BaseModel):
    """Schema for updating seller profile"""
    business_name: Optional[str] = Field(None, max_length=255, description="Business name")
    business_description: Optional[str] = Field(None, description="Business description")
    business_address: Optional[str] = Field(None, description="Business address")
    professional_qualifications: Optional[List[str]] = Field(None, description="Professional qualifications")
    experience_years: Optional[int] = Field(None, ge=0, le=100, description="Years of experience")
    specializations: Optional[List[str]] = Field(None, description="Medical specializations")
    
    class Config:
        from_attributes = True


class BuyerProfileUpdate(BaseModel):
    """Schema for updating buyer profile"""
    preferences: Optional[Dict[str, Any]] = Field(None, description="Search and notification preferences")
    
    class Config:
        from_attributes = True


# Response Schemas
class SellerResponse(BaseModel):
    """Schema for seller profile response"""
    id: UUID = Field(..., description="Seller profile ID")
    user_id: UUID = Field(..., description="User ID")
    business_name: Optional[str] = Field(None, description="Business name")
    business_description: Optional[str] = Field(None, description="Business description")
    business_address: Optional[str] = Field(None, description="Business address")
    verification_status: VerificationStatus = Field(..., description="Verification status")
    professional_qualifications: Optional[List[str]] = Field(None, description="Professional qualifications")
    experience_years: Optional[int] = Field(None, description="Years of experience")
    specializations: Optional[List[str]] = Field(None, description="Medical specializations")
    created_at: datetime = Field(..., description="Profile creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Profile update timestamp")
    
    class Config:
        from_attributes = True


class BuyerResponse(BaseModel):
    """Schema for buyer profile response"""
    id: UUID = Field(..., description="Buyer profile ID")
    user_id: UUID = Field(..., description="User ID")
    verification_status: VerificationStatus = Field(..., description="Verification status")
    preferences: Optional[Dict[str, Any]] = Field(None, description="Search and notification preferences")
    created_at: datetime = Field(..., description="Profile creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Profile update timestamp")
    
    class Config:
        from_attributes = True
