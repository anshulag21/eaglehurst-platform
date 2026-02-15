"""
Listing management API endpoints
"""

from typing import Any, Optional, List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
import os
import shutil
from pathlib import Path

from ....core.database import get_db
from ....schemas.listing_schemas import (
    ListingCreate, ListingUpdate, ListingResponse, ListingDetailResponse,
    ListingSearchParams, ListingFilters, ListingAnalytics
)
from ....schemas.common_schemas import SuccessResponse, PaginationParams
from ....business_logic.listing_bl import ListingBusinessLogic
from ....utils.dependencies import (
    get_current_seller, get_current_buyer, get_current_verified_user,
    get_optional_current_user, get_current_seller_or_admin
)
from ....models.user_models import User
from ....core.constants import ListingStatus

router = APIRouter()


@router.get("/test", response_model=SuccessResponse)
async def test_listings_endpoint() -> Any:
    """Test endpoint to verify listings router is working"""
    return SuccessResponse(
        success=True,
        message="Listings router is working",
        data={"test": True}
    )


@router.get("/", response_model=SuccessResponse)
async def get_listings(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    location: Optional[str] = Query(None, description="Filter by location"),
    min_price: Optional[int] = Query(None, description="Minimum price filter"),
    max_price: Optional[int] = Query(None, description="Maximum price filter"),
    search: Optional[str] = Query(None, description="Search query"),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Browse published listings with filtering and search
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 20, max: 100)
    - **business_type**: Filter by business type (full_sale, partial_sale, fundraising)
    - **location**: Filter by location
    - **min_price**: Minimum price filter
    - **max_price**: Maximum price filter
    - **search**: Search query
    """
    from ....schemas.listing_schemas import ListingSearchParams, ListingFilters
    
    # Create filters
    filters = ListingFilters(
        business_type=business_type,
        location=location,
        min_price=min_price,
        max_price=max_price
    )
    
    # Create search params
    search_params = ListingSearchParams(
        page=page,
        limit=limit,
        search=search,
        filters=filters
    )
    
    # Get listings using business logic
    listing_bl = ListingBusinessLogic(db)
    result = await listing_bl.get_listings(search_params, current_user)
    
    return SuccessResponse(
        success=True,
        message="Listings retrieved successfully",
        data=result
    )


@router.get("/saved", response_model=SuccessResponse)
async def get_saved_listings(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return"),
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get saved listings for the current buyer
    
    - **skip**: Number of records to skip (for pagination)
    - **limit**: Maximum number of records to return (1-100)
    
    Returns paginated list of saved listings with:
    - Listing details
    - Personal notes (if any)
    - Date when saved
    """
    listing_bl = ListingBusinessLogic(db)
    result = await listing_bl.get_saved_listings(current_buyer, skip, limit)
    
    return SuccessResponse(
        success=True,
        message="Saved listings retrieved successfully",
        data=result
    )


@router.get("/{listing_id}", response_model=SuccessResponse)
async def get_listing_detail(
    listing_id: UUID,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get detailed listing information
    
    - **listing_id**: Unique listing identifier
    
    Returns full listing details. Sensitive information is masked unless:
    - User is the listing owner (seller)
    - User is connected to the seller
    - User is an admin
    """
    listing_bl = ListingBusinessLogic(db)
    listing_detail = await listing_bl.get_listing_detail(listing_id, current_user)
    
    return SuccessResponse(
        success=True,
        message="Listing details retrieved successfully",
        data=listing_detail
    )


@router.post("/", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_listing(
    listing_data: ListingCreate,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Create a new listing (Sellers only)
    
    - **title**: Listing title
    - **description**: Detailed description
    - **business_type**: Type of sale (full_sale, partial_sale, fundraising)
    - **location**: Business location
    - **business_details**: UK medical business specific details
    - **financial_data**: Financial information (optional)
    - **is_draft**: Whether to save as draft (default: true)
    
    Requires seller verification and active subscription.
    """
    listing_bl = ListingBusinessLogic(db)
    result = await listing_bl.create_listing(current_seller, listing_data)
    
    return SuccessResponse(
        success=True,
        message="Listing created successfully",
        data=result
    )


@router.put("/{listing_id}", response_model=SuccessResponse)
async def update_listing(
    listing_id: UUID,
    update_data: ListingUpdate,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update an existing listing (Sellers only)
    
    - **listing_id**: Listing to update
    - Updates can include any listing fields
    
    Note: Published listings require re-approval after updates.
    Only the listing owner can update their listings.
    """
    listing_bl = ListingBusinessLogic(db)
    result = await listing_bl.update_listing(listing_id, current_seller, update_data)
    
    return SuccessResponse(
        success=True,
        message="Listing updated successfully",
        data=result
    )


@router.delete("/{listing_id}", response_model=SuccessResponse)
async def delete_listing(
    listing_id: UUID,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Delete a listing (Sellers only)
    
    - **listing_id**: Listing to delete
    
    Only the listing owner can delete their listings.
    This action cannot be undone.
    """
    listing_bl = ListingBusinessLogic(db)
    result = await listing_bl.delete_listing(listing_id, current_seller)
    
    return SuccessResponse(
        success=True,
        message="Listing deleted successfully",
        data=result
    )


@router.get("/seller/my-listings", response_model=SuccessResponse)
async def get_my_listings(
    status: Optional[ListingStatus] = Query(None, description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get seller's own listings
    
    - **status**: Filter by listing status (draft, pending_approval, published, rejected)
    - **page**: Page number
    - **limit**: Items per page
    
    Returns all listings owned by the authenticated seller.
    """
    listing_bl = ListingBusinessLogic(db)
    result = await listing_bl.get_seller_listings(current_seller, status, page, limit)
    
    return SuccessResponse(
        success=True,
        message="Seller listings retrieved successfully",
        data=result
    )


@router.get("/{listing_id}/pending-changes", response_model=SuccessResponse)
async def get_pending_changes(
    listing_id: UUID,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get detailed pending changes for a listing (Sellers only)
    
    - **listing_id**: ID of the listing to get pending changes for
    
    Returns detailed comparison between current listing and pending changes.
    """
    listing_bl = ListingBusinessLogic(db)
    result = await listing_bl.get_pending_changes(listing_id, current_seller)
    
    return SuccessResponse(
        success=True,
        message="Pending changes retrieved successfully",
        data=result
    )


@router.post("/{listing_id}/save", response_model=SuccessResponse)
async def save_listing(
    listing_id: UUID,
    notes: Optional[str] = None,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Save a listing to favorites (Buyers only)
    
    - **listing_id**: Listing to save
    - **notes**: Optional personal notes about the listing
    
    Allows buyers to save interesting listings for later review.
    """
    listing_bl = ListingBusinessLogic(db)
    result = await listing_bl.save_listing(listing_id, current_buyer, notes)
    
    return SuccessResponse(
        success=True,
        message="Listing saved successfully",
        data=result
    )


@router.delete("/{listing_id}/save", response_model=SuccessResponse)
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
    listing_bl = ListingBusinessLogic(db)
    
    # Get buyer profile
    buyer = listing_bl.buyer_dao.get_by_user_id(current_buyer.id)
    if not buyer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Buyer profile not found"
        )
    
    # Remove saved listing
    success = listing_bl.saved_dao.unsave_listing(buyer.id, listing_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved listing not found"
        )
    
    return SuccessResponse(
        success=True,
        message="Listing removed from saved",
        data={"listing_id": str(listing_id)}
    )


@router.get("/{listing_id}/analytics", response_model=SuccessResponse)
async def get_listing_analytics(
    listing_id: UUID,
    current_user: User = Depends(get_current_seller_or_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get listing analytics (Sellers and Admins)
    
    - **listing_id**: Listing to get analytics for
    
    Returns detailed analytics including:
    - View counts (total, unique, weekly, monthly)
    - Connection requests
    - View trends over time
    - Viewer location data
    
    Listing owners (sellers) and admins can view analytics.
    """
    listing_bl = ListingBusinessLogic(db)
    analytics = await listing_bl.get_listing_analytics(listing_id, current_user)
    
    return SuccessResponse(
        success=True,
        message="Listing analytics retrieved successfully",
        data=analytics
    )


@router.post("/{listing_id}/media", response_model=SuccessResponse)
async def upload_listing_media(
    listing_id: UUID,
    media_files: List[UploadFile] = File(...),
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Upload media files for a listing (Sellers only)
    
    - **listing_id**: Listing to add media to
    - **media_files**: Media files (images, videos, documents)
    
    Uploads multiple media files and associates them with the listing.
    Only the listing owner can upload media.
    """
    listing_bl = ListingBusinessLogic(db)
    
    # Verify listing exists and user owns it
    listing = listing_bl.listing_dao.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Get seller profile
    seller = listing_bl.seller_dao.get_by_user_id(current_seller.id)
    if not seller or listing.seller_id != seller.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only upload media to your own listings."
        )
    
    # Validate files
    allowed_types = {
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/avi', 'video/mov', 'video/wmv',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }
    
    max_file_size = 10 * 1024 * 1024  # 10MB
    uploaded_files = []
    
    try:
        # Create upload directory if it doesn't exist
        upload_dir = Path("uploads/listings") / str(listing_id)
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        for i, file in enumerate(media_files):
            # Validate file type
            if file.content_type not in allowed_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File type {file.content_type} not allowed for {file.filename}"
                )
            
            # Validate file size
            file_content = await file.read()
            if len(file_content) > max_file_size:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File {file.filename} is too large. Maximum size is 10MB."
                )
            
            # Generate unique filename
            file_extension = Path(file.filename).suffix if file.filename else '.jpg'
            unique_filename = f"{listing_id}_{i}_{file.filename}" if file.filename else f"{listing_id}_{i}{file_extension}"
            file_path = upload_dir / unique_filename
            
            # Save file
            with open(file_path, "wb") as buffer:
                buffer.write(file_content)
            
            # Determine file type category
            file_type = "image" if file.content_type.startswith("image/") else \
                       "video" if file.content_type.startswith("video/") else "document"
            
            # Add media record to database
            media = listing_bl.media_dao.add_media_to_listing(
                listing_id=listing_id,
                file_url=f"/uploads/listings/{listing_id}/{unique_filename}",
                file_type=file_type,
                file_name=file.filename or unique_filename,
                file_size=len(file_content),
                mime_type=file.content_type,
                display_order=i,
                is_primary=(i == 0)  # First image is primary by default
            )
            
            uploaded_files.append({
                "id": str(media.id),
                "file_url": media.file_url,
                "file_type": media.file_type,
                "file_name": media.file_name,
                "is_primary": media.is_primary
            })
        
        return SuccessResponse(
            success=True,
            message=f"Successfully uploaded {len(uploaded_files)} media file(s)",
            data={
                "media_files": uploaded_files,
                "media_urls": [media["file_url"] for media in uploaded_files]
            }
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Clean up any uploaded files on error
        for uploaded_file in uploaded_files:
            try:
                file_path = Path("uploads") / uploaded_file["file_url"].lstrip("/")
                if file_path.exists():
                    file_path.unlink()
            except:
                pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload media files: {str(e)}"
        )


@router.delete("/{listing_id}/media/{media_id}", response_model=SuccessResponse)
async def delete_listing_media(
    listing_id: UUID,
    media_id: UUID,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Delete a media file from a listing (Sellers only)
    
    - **listing_id**: Listing ID
    - **media_id**: Media file ID to delete
    
    Only the listing owner can delete media files.
    """
    listing_bl = ListingBusinessLogic(db)
    
    # Verify listing exists and user owns it
    listing = listing_bl.listing_dao.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Get seller profile
    seller = listing_bl.seller_dao.get_by_user_id(current_seller.id)
    if not seller or listing.seller_id != seller.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only delete media from your own listings."
        )
    
    try:
        # Delete media from database
        deleted = listing_bl.media_dao.delete_media(media_id, listing_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Media file not found"
            )
        
        # TODO: Delete physical file from filesystem
        # This would require storing the file path and removing the actual file
        
        return SuccessResponse(
            success=True,
            message="Media file deleted successfully",
            data={"media_id": str(media_id)}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete media file: {str(e)}"
        )


@router.put("/{listing_id}/media/{media_id}/primary", response_model=SuccessResponse)
async def set_primary_media(
    listing_id: UUID,
    media_id: UUID,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Set a media file as primary for a listing (Sellers only)
    
    - **listing_id**: Listing ID
    - **media_id**: Media file ID to set as primary
    
    Only the listing owner can set primary media.
    """
    listing_bl = ListingBusinessLogic(db)
    
    # Verify listing exists and user owns it
    listing = listing_bl.listing_dao.get(listing_id)
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found"
        )
    
    # Get seller profile
    seller = listing_bl.seller_dao.get_by_user_id(current_seller.id)
    if not seller or listing.seller_id != seller.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. You can only modify media for your own listings."
        )
    
    try:
        # Set primary media
        updated = listing_bl.media_dao.set_primary_image(listing_id, media_id)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Media file not found"
            )
        
        return SuccessResponse(
            success=True,
            message="Primary media updated successfully",
            data={"media_id": str(media_id)}
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update primary media: {str(e)}"
        )


@router.get("/{listing_id}/connections", response_model=SuccessResponse)
async def get_listing_connections_for_seller(
    listing_id: UUID,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all connections for a specific listing (Seller only - own listings)
    
    - **listing_id**: ID of the listing
    - Returns all connection requests for the seller's listing with buyer details
    """
    from ....models.connection_models import Connection
    from ....models.user_models import User, Buyer, Seller
    from ....models.listing_models import Listing
    
    # Verify seller owns the listing
    seller_profile = db.query(Seller).filter(Seller.user_id == current_seller.id).first()
    if not seller_profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Seller profile not found"
        )
    
    listing = db.query(Listing).filter(
        Listing.id == listing_id,
        Listing.seller_id == seller_profile.id
    ).first()
    
    if not listing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Listing not found or access denied"
        )
    
    # Get all connections for the listing
    connections = db.query(Connection).filter(
        Connection.listing_id == listing_id
    ).order_by(Connection.requested_at.desc()).all()
    
    connection_data = []
    for conn in connections:
        # Get buyer details
        buyer = db.query(Buyer).filter(Buyer.id == conn.buyer_id).first()
        buyer_user = None
        if buyer:
            buyer_user = db.query(User).filter(User.id == buyer.user_id).first()
        
        connection_info = {
            "id": str(conn.id),
            "status": conn.status,
            "initial_message": conn.initial_message,
            "response_message": conn.response_message,
            "seller_initiated": conn.seller_initiated,
            "requested_at": conn.requested_at.isoformat() if conn.requested_at else None,
            "responded_at": conn.responded_at.isoformat() if conn.responded_at else None,
            "last_activity": conn.last_activity.isoformat() if conn.last_activity else None,
            "buyer_name": f"{buyer_user.first_name} {buyer_user.last_name}".strip() if buyer_user else "Unknown",
            "buyer_email": buyer_user.email if buyer_user else "Unknown",
            "buyer_phone": buyer_user.phone if buyer_user else None
        }
        connection_data.append(connection_info)
    
    return SuccessResponse(
        success=True,
        message="Listing connections retrieved successfully",
        data={
            "listing_id": str(listing_id),
            "connections": connection_data,
            "total_connections": len(connection_data)
        }
    )
