"""
User management API endpoints
"""

from typing import Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....schemas.user_schemas import (
    UserProfileUpdate, UserResponse, SellerProfileUpdate, BuyerProfileUpdate,
    SellerResponse, BuyerResponse
)
from ....schemas.common_schemas import SuccessResponse, PaginationParams
from ....business_logic.user_bl import UserBusinessLogic
from ....utils.dependencies import (
    get_current_user, get_current_seller, get_current_buyer, get_current_admin
)
from ....models.user_models import User

router = APIRouter()


@router.get("/profile", response_model=SuccessResponse)
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get current user's profile information
    
    Returns detailed profile information including role-specific data
    """
    user_bl = UserBusinessLogic(db)
    profile_data = await user_bl.get_user_profile(current_user.id)
    
    return SuccessResponse(
        success=True,
        message="Profile retrieved successfully",
        data=profile_data
    )


@router.put("/profile", response_model=SuccessResponse)
async def update_user_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update current user's basic profile information
    
    - **first_name**: Updated first name
    - **last_name**: Updated last name
    - **phone**: Updated phone number
    """
    user_bl = UserBusinessLogic(db)
    result = await user_bl.update_user_profile(current_user.id, profile_data)
    
    return SuccessResponse(
        success=True,
        message="Profile updated successfully",
        data=result
    )


@router.get("/seller/profile", response_model=SuccessResponse)
async def get_seller_profile(
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get seller-specific profile information
    
    Returns seller profile with business details and verification status
    """
    user_bl = UserBusinessLogic(db)
    seller_data = await user_bl.get_seller_profile(current_seller.id)
    
    return SuccessResponse(
        success=True,
        message="Seller profile retrieved successfully",
        data=seller_data
    )


@router.put("/seller/profile", response_model=SuccessResponse)
async def update_seller_profile(
    profile_data: SellerProfileUpdate,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update seller-specific profile information
    
    - **business_name**: Business name
    - **business_description**: Business description
    - **business_address**: Business address
    - **professional_qualifications**: Professional qualifications
    - **experience_years**: Years of experience
    """
    user_bl = UserBusinessLogic(db)
    result = await user_bl.update_seller_profile(current_seller.id, profile_data)
    
    return SuccessResponse(
        success=True,
        message="Seller profile updated successfully",
        data=result
    )


@router.post("/seller-verification", response_model=SuccessResponse)
async def submit_seller_verification(
    business_name: str = Form(...),
    business_description: str = Form(...),
    business_type: str = Form(...),
    business_address: str = Form(...),
    license_document: UploadFile = File(...),
    identity_document: UploadFile = File(...),
    additional_documents: list[UploadFile] = File(default=[]),
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Submit comprehensive seller verification with business information and documents
    
    - **business_name**: Official name of the medical practice
    - **business_description**: Detailed description of the practice
    - **business_type**: Type of medical practice (GP, dental, etc.)
    - **business_address**: Full business address
    - **license_document**: Medical license document
    - **identity_document**: Government-issued ID
    - **additional_documents**: Optional additional certificates
    """
    user_bl = UserBusinessLogic(db)
    
    # Prepare verification data
    verification_data = {
        'business_name': business_name,
        'business_description': business_description,
        'business_type': business_type,
        'business_address': business_address,
    }
    
    # Prepare documents
    documents = {
        'license_document': license_document,
        'identity_document': identity_document,
        'additional_documents': additional_documents
    }
    
    result = await user_bl.submit_seller_verification(current_seller.id, verification_data, documents)
    
    return SuccessResponse(
        success=True,
        message="Seller verification submitted successfully. Your information will be reviewed by our admin team.",
        data=result
    )

@router.post("/seller/kyc-documents", response_model=SuccessResponse)
async def upload_kyc_documents(
    documents: list[UploadFile] = File(...),
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Upload KYC documents for seller verification (Legacy endpoint)
    
    Accepts multiple files for identity verification, professional certificates, etc.
    """
    user_bl = UserBusinessLogic(db)
    result = await user_bl.upload_kyc_documents(current_seller.id, documents)
    
    return SuccessResponse(
        success=True,
        message="KYC documents uploaded successfully",
        data=result
    )


@router.get("/buyer/profile", response_model=SuccessResponse)
async def get_buyer_profile(
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get buyer-specific profile information
    
    Returns buyer profile with subscription details and preferences
    """
    user_bl = UserBusinessLogic(db)
    buyer_data = await user_bl.get_buyer_profile(current_buyer.id)
    
    return SuccessResponse(
        success=True,
        message="Buyer profile retrieved successfully",
        data=buyer_data
    )


@router.put("/buyer/profile", response_model=SuccessResponse)
async def update_buyer_profile(
    profile_data: BuyerProfileUpdate,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update buyer-specific profile information
    
    - **preferences**: Search and notification preferences
    - **investment_range**: Investment budget range
    - **preferred_locations**: Preferred business locations
    """
    user_bl = UserBusinessLogic(db)
    result = await user_bl.update_buyer_profile(current_buyer.id, profile_data)
    
    return SuccessResponse(
        success=True,
        message="Buyer profile updated successfully",
        data=result
    )


@router.delete("/account", response_model=SuccessResponse)
async def delete_user_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Delete user account (soft delete)
    
    Deactivates the account and anonymizes personal data while preserving
    business records for compliance
    """
    user_bl = UserBusinessLogic(db)
    result = await user_bl.delete_user_account(current_user.id)
    
    return SuccessResponse(
        success=True,
        message="Account deleted successfully",
        data=result
    )


@router.get("/dashboard", response_model=SuccessResponse)
async def get_user_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user dashboard data
    
    Returns role-specific dashboard information with key metrics and recent activity
    """
    user_bl = UserBusinessLogic(db)
    dashboard_data = await user_bl.get_user_dashboard(current_user.id, current_user.user_type)
    
    return SuccessResponse(
        success=True,
        message="Dashboard data retrieved successfully",
        data=dashboard_data
    )


@router.post("/create-seller-profile", response_model=SuccessResponse)
async def create_seller_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Create seller profile if it doesn't exist
    
    This is a helper endpoint for users who don't have a seller profile
    """
    from ....dao.user_dao import SellerDAO
    
    # Check if user is a seller
    if current_user.user_type != 'seller':
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only seller users can create seller profiles"
        )
    
    seller_dao = SellerDAO(db)
    
    # Check if seller profile already exists
    existing_seller = seller_dao.get_by_user_id(current_user.id)
    if existing_seller:
        return SuccessResponse(
            success=True,
            message="Seller profile already exists",
            data={
                "seller_id": existing_seller.id,
                "verification_status": existing_seller.verification_status
            }
        )
    
    # Create seller profile
    try:
        seller = seller_dao.create_seller_profile(current_user.id, {})
        
        return SuccessResponse(
            success=True,
            message="Seller profile created successfully",
            data={
                "seller_id": seller.id,
                "verification_status": seller.verification_status,
                "message": "You can now create listings. Complete your profile and upload KYC documents for verification."
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create seller profile: {str(e)}"
        )