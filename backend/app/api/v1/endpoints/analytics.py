"""
Analytics API endpoints
"""

from typing import Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....utils.dependencies import get_current_user, get_current_buyer, get_current_seller
from ....business_logic.analytics_bl import AnalyticsBusinessLogic
from ....models.user_models import User
from ....schemas.common_schemas import SuccessResponse

router = APIRouter()


@router.post("/listings/{listing_id}/view", response_model=SuccessResponse)
async def track_listing_view(
    listing_id: UUID,
    request: Request,
    current_user: User = Depends(get_current_user),  # Require authentication
    db: Session = Depends(get_db)
) -> Any:
    """
    Track a listing view (Authenticated users only)
    
    - **listing_id**: ID of the listing being viewed
    - Only authenticated users can track views (B2B platform requirement)
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    
    # Get request details
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    result = await analytics_bl.track_listing_view(
        listing_id=listing_id,
        user_id=current_user.id,  # Always authenticated now
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return SuccessResponse(
        success=True,
        message="View tracked successfully",
        data=result
    )


@router.get("/listings/{listing_id}/analytics", response_model=SuccessResponse)
async def get_listing_analytics(
    listing_id: UUID,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get comprehensive analytics for a listing (Sellers only)
    
    - **listing_id**: ID of the listing
    - Returns detailed analytics including views, connections, and viewer details
    - Only accessible by the listing owner
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    result = await analytics_bl.get_listing_analytics(listing_id, current_seller.id)
    
    return SuccessResponse(
        success=True,
        message="Listing analytics retrieved successfully",
        data=result
    )


@router.get("/seller/overview", response_model=SuccessResponse)
async def get_seller_analytics(
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get overall analytics for the current seller
    
    - Returns total views, inquiries, saves across all listings
    - Includes performance metrics and conversion rates
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    result = await analytics_bl.get_seller_analytics(current_seller.id)
    
    return SuccessResponse(
        success=True,
        message="Seller analytics retrieved successfully",
        data=result
    )


@router.get("/buyer/overview", response_model=SuccessResponse)
async def get_buyer_analytics(
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get overall analytics for the current buyer
    
    - Returns total searches, saved listings, connections, messages
    - Includes activity metrics and engagement data
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    result = await analytics_bl.get_buyer_analytics(current_buyer.id)
    
    return SuccessResponse(
        success=True,
        message="Buyer analytics retrieved successfully",
        data=result
    )


@router.post("/listings/{listing_id}/save", response_model=SuccessResponse)
async def save_listing(
    listing_id: UUID,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Save/favorite a listing (Buyers only)
    
    - **listing_id**: ID of the listing to save
    - Adds the listing to buyer's saved/favorites list
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    result = await analytics_bl.save_listing(listing_id, current_buyer.id)
    
    return SuccessResponse(
        success=True,
        message="Listing saved successfully",
        data=result
    )


@router.delete("/listings/{listing_id}/save", response_model=SuccessResponse)
async def unsave_listing(
    listing_id: UUID,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Remove a listing from saved/favorites (Buyers only)
    
    - **listing_id**: ID of the listing to unsave
    - Removes the listing from buyer's saved/favorites list
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    result = await analytics_bl.unsave_listing(listing_id, current_buyer.id)
    
    return SuccessResponse(
        success=True,
        message="Listing removed from saved",
        data=result
    )


@router.get("/listings/{listing_id}/is-saved", response_model=SuccessResponse)
async def check_listing_saved(
    listing_id: UUID,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Check if a listing is saved by the current buyer
    
    - **listing_id**: ID of the listing to check
    - Returns whether the listing is in buyer's saved list
    """
    from ....models.listing_models import SavedListing
    from sqlalchemy import and_
    
    # Get buyer
    if not current_buyer.buyer_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer profile not found"
        )
    
    # Check if saved
    saved = db.query(SavedListing).filter(
        and_(
            SavedListing.buyer_id == current_buyer.buyer_profile.id,
            SavedListing.listing_id == listing_id
        )
    ).first()
    
    return SuccessResponse(
        success=True,
        message="Saved status retrieved",
        data={
            "listing_id": listing_id,
            "is_saved": saved is not None,
            "saved_at": saved.created_at if saved else None
        }
    )