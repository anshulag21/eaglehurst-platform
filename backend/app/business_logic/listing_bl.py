"""
Listing Business Logic
"""

from typing import Optional, List, Dict, Any, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
import logging

from ..dao.listing_dao import ListingDAO, ListingMediaDAO, SavedListingDAO, ListingViewDAO
from ..dao.user_dao import SellerDAO, BuyerDAO
from ..schemas.listing_schemas import (
    ListingCreate, ListingUpdate, ListingResponse, ListingDetailResponse,
    ListingFilters, ListingSearchParams, ListingAnalytics, MediaUploadRequest
)
from ..core.constants import ListingStatus, VerificationStatus
from ..models.listing_models import Listing, ListingEdit
from ..models.user_models import User

logger = logging.getLogger(__name__)


class ListingBusinessLogic:
    """Business logic for listing operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.listing_dao = ListingDAO(db)
        self.media_dao = ListingMediaDAO(db)
        self.saved_dao = SavedListingDAO(db)
        self.view_dao = ListingViewDAO(db)
        self.seller_dao = SellerDAO(db)
        self.buyer_dao = BuyerDAO(db)
    
    async def create_listing(self, seller_user: User, listing_data: ListingCreate) -> Dict[str, Any]:
        """
        Create a new listing
        
        Args:
            seller_user: Authenticated seller user
            listing_data: Listing creation data
            
        Returns:
            Created listing information
            
        Raises:
            HTTPException: If seller is not verified or other validation fails
        """
        # Get seller profile
        seller = self.seller_dao.get_by_user_id(seller_user.id)
        if not seller:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller profile not found"
            )
        
        # Check if seller is verified
        if seller.verification_status != VerificationStatus.APPROVED:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Seller verification required to create listings"
            )
        
        # TODO: Check subscription limits
        # current_listings = self.listing_dao.get_seller_listings(seller.id)
        # if len(current_listings) >= subscription_limit:
        #     raise HTTPException(...)
        
        try:
            # Create listing
            listing = self.listing_dao.create_listing(seller.id, listing_data)
            
            return {
                "listing_id": listing.id,
                "title": listing.title,
                "status": listing.status,
                "created_at": listing.created_at,
                "message": "Listing created successfully"
            }
            
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create listing: {str(e)}"
            )
    
    async def get_listings(
        self,
        search_params: ListingSearchParams,
        current_user: Optional[User] = None
    ) -> Dict[str, Any]:
        """
        Get published listings with filtering and search
        
        Args:
            search_params: Search and filter parameters
            current_user: Optional current user for personalization
            
        Returns:
            Paginated listing results
            
        Note:
            - Sellers are NOT allowed to browse other sellers' listings
            - Only buyers, admins, and anonymous users can browse listings
            - Sellers should use the /seller/my-listings endpoint instead
        """
        try:
            # SECURITY CHECK: Prevent sellers from browsing other sellers' listings
            if current_user and current_user.user_type == "seller":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sellers cannot browse other sellers' listings. Use /seller/my-listings to view your own listings."
                )
            
            # Calculate pagination
            skip = (search_params.page - 1) * search_params.limit
            
            # Get listings
            if search_params.search:
                listings = self.listing_dao.search_listings(
                    search_params.search,
                    search_params.filters,
                    skip,
                    search_params.limit
                )
            else:
                listings = self.listing_dao.get_published_listings(
                    search_params.filters,
                    skip,
                    search_params.limit,
                    search_params.sort_by or "created_at",
                    search_params.sort_order == "desc"
                )
            
            # Convert to response format
            listing_responses = []
            for listing in listings:
                response = await self._convert_to_listing_response(listing, current_user)
                listing_responses.append(response)
            
            # Get total count for pagination
            total_count = self._get_listings_count(search_params)
            total_pages = (total_count + search_params.limit - 1) // search_params.limit
            
            return {
                "listings": listing_responses,
                "pagination": {
                    "current_page": search_params.page,
                    "total_pages": total_pages,
                    "total_items": total_count,
                    "items_per_page": search_params.limit,
                    "has_next": search_params.page < total_pages,
                    "has_previous": search_params.page > 1
                }
            }
            
        except HTTPException:
            # Re-raise HTTP exceptions (like 403 Forbidden) as-is
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve listings: {str(e)}"
            )
    
    async def get_listing_detail(
        self,
        listing_id: UUID,
        current_user: Optional[User] = None,
        track_view: bool = True
    ) -> ListingDetailResponse:
        """
        Get detailed listing information
        
        Args:
            listing_id: Listing ID
            current_user: Current user (for access control)
            track_view: Whether to track this as a view
            
        Returns:
            Detailed listing information
            
        Raises:
            HTTPException: If listing not found or access denied
        """
        # Get listing
        listing = self.listing_dao.get_listing_with_seller(listing_id)
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        # SECURITY CHECK: Prevent sellers from viewing other sellers' listings
        if current_user and current_user.user_type == "seller":
            # Sellers can only view their own listings
            if not self._is_listing_owner(listing, current_user):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Sellers cannot view other sellers' listings"
                )
        
        # Check if listing is published
        if listing.status != ListingStatus.PUBLISHED:
            # Only seller and admin can view unpublished listings
            if not current_user or (
                current_user.user_type != "admin" and 
                not self._is_listing_owner(listing, current_user)
            ):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Listing not found"
                )
        
        # Note: View tracking is now handled by the analytics service endpoint
        # to ensure proper deduplication and accurate analytics
        # The frontend calls /api/v1/analytics/listings/{id}/view separately
        
        # Check if user is connected to seller (for full access)
        is_connected = await self._check_buyer_seller_connection(listing, current_user)
        
        # Convert to detailed response
        return await self._convert_to_detailed_response(listing, current_user, is_connected)
    
    async def update_listing(
        self,
        listing_id: UUID,
        seller_user: User,
        update_data: ListingUpdate
    ) -> Dict[str, Any]:
        """
        Update an existing listing
        
        Args:
            listing_id: Listing ID to update
            seller_user: Authenticated seller user
            update_data: Update data
            
        Returns:
            Update confirmation
            
        Raises:
            HTTPException: If listing not found or access denied
        """
        # Get seller profile
        seller = self.seller_dao.get_by_user_id(seller_user.id)
        if not seller:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller profile not found"
            )
        
        # Check if seller owns the listing
        if not self.listing_dao.is_listing_owner(listing_id, seller.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get existing listing
        listing = self.listing_dao.get(listing_id)
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        try:
            # Handle status change if is_draft is provided
            status_changed = False
            if hasattr(update_data, 'is_draft') and update_data.is_draft is not None:
                if update_data.is_draft == False and listing.status == ListingStatus.DRAFT:
                    # Publishing a draft - set to pending approval
                    self.listing_dao.update_listing_status(
                        listing_id,
                        ListingStatus.PENDING_APPROVAL,
                        admin_notes="Draft submitted for review"
                    )
                    status_changed = True
                elif update_data.is_draft == True and listing.status != ListingStatus.DRAFT:
                    # Converting back to draft
                    self.listing_dao.update_listing_status(
                        listing_id,
                        ListingStatus.DRAFT,
                        admin_notes="Listing converted back to draft"
                    )
                    status_changed = True
            
            # Update listing (excluding is_draft as it's handled above)
            update_dict = update_data.dict(exclude_unset=True)
            update_dict.pop('is_draft', None)  # Remove is_draft from update data
            
            if update_dict:  # Only update if there are other fields to update
                # For ANY listing update (draft, published, etc.), use staging table approach
                # This ensures all changes go through the review process
                
                # ONLY store the fields that were actually changed, not the entire listing
                # This prevents showing false "changes" for fields that weren't modified
                
                # Convert non-JSON-serializable objects for storage
                def make_json_serializable(obj):
                    """Convert objects to JSON-serializable format recursively"""
                    if obj is None:
                        return None
                    elif isinstance(obj, dict):
                        return {k: make_json_serializable(v) for k, v in obj.items()}
                    elif isinstance(obj, (list, tuple)):
                        return [make_json_serializable(item) for item in obj]
                    elif hasattr(obj, '__class__'):
                        class_name = obj.__class__.__name__
                        if class_name == 'Decimal':
                            return str(obj)
                        elif class_name == 'datetime':
                            return obj.isoformat()
                        elif class_name == 'UUID':
                            return str(obj)
                    return obj
                
                # Compare with current listing data to find ACTUAL changes
                def find_actual_changes(new_data, current_listing):
                    """Find only the fields that actually changed"""
                    changes = {}
                    
                    for field, new_value in new_data.items():
                        # Handle nested objects (business_details, financial_data)
                        if field == 'financial_data' and isinstance(new_value, dict):
                            # Skip financial_data comparison entirely for now - it's causing false positives
                            # The frontend always sends this data even when not changed
                            # TODO: Fix this properly by understanding the data storage structure
                            continue
                                
                        elif field == 'business_details' and isinstance(new_value, dict):
                            # Build current business details from individual listing fields and JSON field
                            current_business_json = getattr(current_listing, 'business_details', None) or {}
                            current_business = {
                                'practice_name': getattr(current_listing, 'practice_name', None),
                                'practice_type': getattr(current_listing, 'practice_type', None),
                                'premises_type': getattr(current_listing, 'premises_type', None),
                                'nhs_contract': getattr(current_listing, 'nhs_contract', False),
                                'patient_list_size': getattr(current_listing, 'patient_list_size', None),
                                'staff_count': getattr(current_listing, 'staff_count', None),
                                'cqc_registered': getattr(current_listing, 'cqc_registered', False),
                            }
                            
                            # Add any additional fields from the JSON business_details field
                            if isinstance(current_business_json, dict):
                                current_business.update(current_business_json)
                            
                            # Compare individual business fields
                            nested_changes = {}
                            for nested_field, nested_new_value in new_value.items():
                                nested_current_value = current_business.get(nested_field)
                                
                                # Convert for comparison
                                if hasattr(nested_current_value, '__class__') and nested_current_value.__class__.__name__ == 'Decimal':
                                    nested_current_value = str(nested_current_value)
                                if hasattr(nested_new_value, '__class__') and nested_new_value.__class__.__name__ == 'Decimal':
                                    nested_new_value = str(nested_new_value)
                                
                                # Only include if actually different
                                if str(nested_current_value) != str(nested_new_value):
                                    nested_changes[nested_field] = nested_new_value
                            
                            # Only include if there are actual changes
                            if nested_changes:
                                changes[field] = nested_changes
                        else:
                            # Handle simple fields
                            current_value = getattr(current_listing, field, None)
                            
                            # Convert for comparison
                            if hasattr(current_value, '__class__') and current_value.__class__.__name__ == 'Decimal':
                                current_value = str(current_value)
                            if hasattr(new_value, '__class__') and new_value.__class__.__name__ == 'Decimal':
                                new_value = str(new_value)
                            
                            # Only include if actually different
                            if str(current_value) != str(new_value):
                                changes[field] = new_value
                    
                    return changes
                
                # Find only the actual changes
                actual_changes = find_actual_changes(update_dict, listing)
                
                # Only proceed if there are actual changes
                if not actual_changes:
                    updated_listing = listing
                    requires_approval = False
                else:
                    # Only serialize the fields that actually changed
                    serializable_changes_only = make_json_serializable(actual_changes)
                
                    # Check if there's already a pending edit for this listing
                    existing_edit = self.db.query(ListingEdit).filter(
                        ListingEdit.listing_id == listing_id,
                        ListingEdit.status == "pending"
                    ).first()
                    
                    if existing_edit:
                        # Update existing pending edit with only the changed fields
                        existing_edit.edit_data = serializable_changes_only
                        existing_edit.created_at = func.now()
                        existing_edit.edit_reason = "Seller updated listing"
                        self.db.commit()
                        edit_id = existing_edit.id
                    else:
                        # Create new listing edit entry with only the changed fields
                        listing_edit = ListingEdit(
                            listing_id=listing_id,
                            edit_data=serializable_changes_only,
                            edit_reason="Seller updated listing",
                            status="pending"
                        )
                        self.db.add(listing_edit)
                        self.db.commit()
                        edit_id = listing_edit.id
                    
                    # Don't change the original listing - it stays as is and visible
                    updated_listing = listing
                    requires_approval = True
            else:
                updated_listing = listing
                requires_approval = False
            
            # Determine the appropriate message
            if status_changed and update_data.is_draft == False:
                message = "Listing submitted for review successfully"
            elif status_changed and update_data.is_draft == True:
                message = "Listing converted to draft successfully"
            elif requires_approval:
                message = "Changes submitted for admin review. Your listing remains visible to buyers with current information."
            elif update_dict and not requires_approval:
                message = "No changes detected - listing data is already up to date"
            else:
                message = "Listing updated successfully"
            
            return {
                "listing_id": updated_listing.id,
                "message": message,
                "requires_approval": requires_approval,
                "status_changed": status_changed,
                "listing_remains_visible": requires_approval  # New field to inform frontend
            }
            
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to update listing: {str(e)}"
            )
    
    async def delete_listing(self, listing_id: UUID, seller_user: User) -> Dict[str, Any]:
        """
        Delete a listing
        
        Args:
            listing_id: Listing ID to delete
            seller_user: Authenticated seller user
            
        Returns:
            Deletion confirmation
            
        Raises:
            HTTPException: If listing not found or access denied
        """
        # Get seller profile
        seller = self.seller_dao.get_by_user_id(seller_user.id)
        if not seller:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller profile not found"
            )
        
        # Check if seller owns the listing
        if not self.listing_dao.is_listing_owner(listing_id, seller.id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        try:
            # Delete listing
            deleted = self.listing_dao.delete(listing_id)
            if not deleted:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Listing not found"
                )
            
            return {
                "message": "Listing deleted successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete listing: {str(e)}"
            )
    
    async def get_seller_listings(
        self,
        seller_user: User,
        status: Optional[ListingStatus] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        Get listings for a seller
        
        Args:
            seller_user: Authenticated seller user
            status: Optional status filter
            page: Page number
            limit: Items per page
            
        Returns:
            Seller's listings
        """
        # Get seller profile
        seller = self.seller_dao.get_by_user_id(seller_user.id)
        if not seller:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller profile not found"
            )
        
        try:
            skip = (page - 1) * limit
            listings = self.listing_dao.get_seller_listings(seller.id, status, skip, limit)
            
            # Convert to response format
            listing_responses = []
            for listing in listings:
                response = await self._convert_to_listing_response(listing, seller_user, include_private=True)
                listing_responses.append(response)
            
            return {
                "listings": listing_responses,
                "total_count": len(listing_responses)
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve seller listings: {str(e)}"
            )
    
    async def get_pending_changes(self, listing_id: UUID, seller_user: User) -> Dict[str, Any]:
        """Get detailed pending changes for a listing"""
        # Verify ownership
        listing = self.listing_dao.get_by_id(listing_id)
        if not listing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        if not self._is_listing_owner(listing, seller_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Get pending edit
        pending_edit = self.db.query(ListingEdit).filter(
            ListingEdit.listing_id == listing_id,
            ListingEdit.status == "pending"
        ).first()
        
        if not pending_edit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No pending changes found"
            )
        
        # Now the edit_data only contains the fields that were actually changed
        # So we can directly use it for comparison
        proposed_data = pending_edit.edit_data
        
        # Find differences
        changes = []
        
        def add_change(field_name, field_label, current_val, new_val):
            """Helper to add a change if values are different"""
            if str(current_val) != str(new_val):
                changes.append({
                    'field': field_name,
                    'field_label': field_label,
                    'current_value': current_val,
                    'new_value': new_val
                })
        
        for field, new_value in proposed_data.items():
            # Get the current value from the listing
            current_value = getattr(listing, field, None)
            
            # Convert current value to string for comparison if it's a Decimal
            if hasattr(current_value, '__class__') and current_value.__class__.__name__ == 'Decimal':
                current_value = str(current_value)
            
            # Handle nested objects by breaking them down
            if field == 'business_details' and isinstance(new_value, dict) and isinstance(current_value, dict):
                # Compare individual business detail fields
                business_fields = {
                    'practice_name': 'Practice Name',
                    'practice_type': 'Practice Type', 
                    'premises_type': 'Premises Type',
                    'nhs_contract': 'NHS Contract',
                    'patient_list_size': 'Patient List Size',
                    'staff_count': 'Staff Count',
                    'cqc_registered': 'CQC Registered'
                }
                
                for detail_field, detail_label in business_fields.items():
                    current_detail = current_value.get(detail_field) if current_value else None
                    new_detail = new_value.get(detail_field) if new_value else None
                    add_change(f"business_details.{detail_field}", detail_label, current_detail, new_detail)
                    
            elif field == 'financial_data' and isinstance(new_value, dict) and isinstance(current_value, dict):
                # Compare individual financial fields
                financial_fields = {
                    'asking_price': 'Asking Price',
                    'annual_revenue': 'Annual Revenue',
                    'net_profit': 'Net Profit'
                }
                
                for fin_field, fin_label in financial_fields.items():
                    current_fin = current_value.get(fin_field) if current_value else None
                    new_fin = new_value.get(fin_field) if new_value else None
                    add_change(f"financial_data.{fin_field}", fin_label, current_fin, new_fin)
                    
            else:
                # Handle simple fields
                add_change(field, field.replace('_', ' ').title(), current_value, new_value)
        
        return {
            'listing_id': listing_id,
            'listing_title': listing.title,
            'edit_id': pending_edit.id,
            'submitted_at': pending_edit.created_at,
            'edit_reason': pending_edit.edit_reason,
            'changes': changes,
            'total_changes': len(changes)
        }
    
    async def save_listing(self, listing_id: UUID, buyer_user: User, notes: Optional[str] = None) -> Dict[str, Any]:
        """Save a listing for a buyer"""
        # Get buyer profile
        buyer = self.buyer_dao.get_by_user_id(buyer_user.id)
        if not buyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buyer profile not found"
            )
        
        # Check if listing exists and is published
        listing = self.listing_dao.get(listing_id)
        if not listing or listing.status != ListingStatus.PUBLISHED:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Listing not found"
            )
        
        try:
            saved_listing = self.saved_dao.save_listing(buyer.id, listing_id, notes)
            return {
                "message": "Listing saved successfully",
                "saved_at": saved_listing.created_at
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to save listing: {str(e)}"
            )
    
    async def get_saved_listings(self, buyer_user: User, skip: int = 0, limit: int = 20) -> Dict[str, Any]:
        """
        Get saved listings for a buyer
        
        Args:
            buyer_user: Authenticated buyer user
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            Paginated list of saved listings
            
        Raises:
            HTTPException: If buyer profile not found
        """
        # Get buyer profile
        buyer = self.buyer_dao.get_by_user_id(buyer_user.id)
        if not buyer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buyer profile not found"
            )
        
        try:
            # Get saved listings
            saved_listings = self.saved_dao.get_saved_listings(buyer.id, skip, limit)
            
            # Convert to response format
            items = []
            for saved in saved_listings:
                # Skip if listing has been deleted
                if not saved.listing:
                    continue
                    
                listing_response = await self._convert_to_listing_response(
                    saved.listing, buyer_user
                )
                items.append({
                    "id": str(saved.id),
                    "listing": listing_response,
                    "notes": saved.notes,
                    "saved_at": saved.created_at
                })
            
            # Get total count (only count saved listings where listing still exists)
            from ..models.listing_models import Listing
            total = self.db.query(self.saved_dao.model).join(
                Listing, self.saved_dao.model.listing_id == Listing.id
            ).filter(
                self.saved_dao.model.buyer_id == buyer.id
            ).count()
            
            return {
                "items": items,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": skip + limit < total
            }
            
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to get saved listings: {str(e)}"
            )
    
    async def get_listing_analytics(self, listing_id: UUID, current_user: User) -> ListingAnalytics:
        """Get analytics for a listing"""
        from ..core.constants import UserType
        
        # Check if user is admin (admins can view any listing analytics)
        if current_user.user_type == UserType.ADMIN:
            # Admin can view analytics for any listing
            pass
        else:
            # For sellers, check if they own the listing
            seller = self.seller_dao.get_by_user_id(current_user.id)
            if not seller:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller profile not found"
                )
            
            # Check if seller owns the listing
            if not self.listing_dao.is_listing_owner(listing_id, seller.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )
        
        # Get analytics data
        total_views = self.view_dao.get_view_count(listing_id, days=365)
        unique_views = self.view_dao.get_unique_view_count(listing_id, days=365)
        views_this_week = self.view_dao.get_view_count(listing_id, days=7)
        views_this_month = self.view_dao.get_view_count(listing_id, days=30)
        
        # Get listing for connection data
        listing = self.listing_dao.get(listing_id)
        
        # Get detailed viewer data
        viewer_locations = self._get_viewer_locations(listing_id)
        
        # Get view trend data (last 30 days)
        view_trend = self._get_view_trend(listing_id, days=30)
        
        # Get connection data
        approved_connections = self._get_approved_connections_count(listing_id)
        
        return ListingAnalytics(
            listing_id=listing_id,
            total_views=total_views,
            unique_views=unique_views,
            views_this_week=views_this_week,
            views_this_month=views_this_month,
            connection_requests=listing.connection_count if listing else 0,
            approved_connections=approved_connections,
            view_trend=view_trend,
            viewer_locations=viewer_locations
        )
    
    # Private helper methods
    
    async def _convert_to_listing_response(
        self,
        listing: Listing,
        current_user: Optional[User] = None,
        include_private: bool = False
    ) -> ListingResponse:
        """Convert listing model to response format"""
        # Get media files
        media_files = self.media_dao.get_listing_media(listing.id)
        primary_image = next((m.file_url for m in media_files if m.is_primary), None)
        
        # Check if user is connected (for buyers)
        is_connected = False
        if current_user and current_user.user_type == "buyer":
            is_connected = await self._check_buyer_seller_connection(listing, current_user)
        
        # Get saved count
        from ..models.listing_models import SavedListing
        saved_count = self.db.query(SavedListing).filter(
            SavedListing.listing_id == listing.id
        ).count()
        
        # Get last viewed timestamp
        from ..models.analytics_models import ListingView
        from sqlalchemy import desc
        last_view = self.db.query(ListingView).filter(
            ListingView.listing_id == listing.id
        ).order_by(desc(ListingView.viewed_at)).first()
        last_viewed_at = last_view.viewed_at if last_view else None
        
        # Mask sensitive information if not connected
        asking_price = listing.asking_price
        price_range = None
        
        if not include_private and not is_connected and listing.is_masked:
            if asking_price:
                # Create price range instead of exact price
                price_range = self._create_price_range(asking_price)
                asking_price = None
        
        # Convert media files to schema format
        media_files_response = []
        for media in media_files:
            media_files_response.append({
                "id": media.id,
                "file_url": media.file_url,
                "file_type": media.file_type,
                "file_name": media.file_name,
                "file_size": media.file_size,
                "display_order": media.display_order,
                "is_primary": media.is_primary,
                "caption": media.caption
            })
        
        # Only include performance data for listing owners (sellers), admins, or when explicitly requested
        view_count = None
        connection_count = None
        saved_count_response = None
        
        is_admin = current_user and current_user.user_type == "admin"
        if hasattr(current_user, 'jwt_user_type') and current_user.jwt_user_type == "admin":
            is_admin = True

        if include_private or self._is_listing_owner(listing, current_user) or is_admin:
            view_count = listing.view_count or 0
            connection_count = listing.connection_count or 0
            saved_count_response = saved_count

        # Check for pending edits (only for listing owners)
        has_pending_edit = False
        pending_edit_created_at = None
        pending_edit_reason = None
        
        if include_private or self._is_listing_owner(listing, current_user):
            pending_edit = self.db.query(ListingEdit).filter(
                ListingEdit.listing_id == listing.id,
                ListingEdit.status == "pending"
            ).first()
            
            if pending_edit:
                has_pending_edit = True
                pending_edit_created_at = pending_edit.created_at
                pending_edit_reason = pending_edit.edit_reason

        return ListingResponse(
            id=listing.id,
            seller_id=listing.seller_id,
            title=listing.title,
            description=listing.description[:200] + "..." if len(listing.description) > 200 else listing.description,
            business_type=listing.business_type,
            location=listing.location,
            postcode=listing.postcode,
            region=listing.region,
            status=listing.status,
            asking_price=asking_price,
            price_range=price_range,
            business_summary=self._create_business_summary(listing),
            patient_list_size=listing.patient_list_size,
            staff_count=listing.staff_count,
            media_files=media_files_response,
            primary_image=primary_image,
            view_count=view_count,
            connection_count=connection_count,
            saved_count=saved_count_response,
            last_viewed_at=last_viewed_at,
            is_connected=is_connected,
            created_at=listing.created_at,
            updated_at=listing.updated_at,
            published_at=listing.published_at,
            has_pending_edit=has_pending_edit,
            pending_edit_created_at=pending_edit_created_at,
            pending_edit_reason=pending_edit_reason
        )
    
    async def _convert_to_detailed_response(
        self,
        listing: Listing,
        current_user: Optional[User],
        is_connected: bool
    ) -> ListingDetailResponse:
        """Convert to detailed response with full information if connected"""
        # Start with basic response
        basic_response = await self._convert_to_listing_response(listing, current_user)
        
        # Add detailed information if connected or owner
        financial_data = None
        business_details = None
        seller_info = None
        
        if is_connected or self._is_listing_owner(listing, current_user):
            # Include full financial data
            financial_data = {
                "asking_price": listing.asking_price,
                "annual_revenue": listing.annual_revenue,
                "net_profit": listing.net_profit,
                "financial_statements": []  # TODO: Get document URLs
            }
            
            # Include full business details
            business_details = {
                "practice_name": listing.practice_name,
                "practice_type": listing.practice_type,
                "premises_type": listing.premises_type,
                "nhs_contract": listing.nhs_contract,
                "nhs_contract_details": listing.nhs_contract_details,
                "private_patient_base": listing.private_patient_base,
                "patient_list_size": listing.patient_list_size,
                "staff_count": listing.staff_count,
                "equipment_inventory": listing.equipment_inventory,
                "cqc_registered": listing.cqc_registered,
                "cqc_registration_number": listing.cqc_registration_number,
                "professional_indemnity_insurance": listing.professional_indemnity_insurance,
                "insurance_details": listing.insurance_details,
                "lease_agreement_details": listing.lease_agreement_details,
                "property_value": listing.property_value,
                "goodwill_valuation": listing.goodwill_valuation
            }
            
            # Include seller information
            seller_info = {
                "business_name": listing.seller.business_name if listing.seller else None,
                "contact_available": True
            }
        
        return ListingDetailResponse(
            **basic_response.dict(),
            financial_data=financial_data,
            business_details=business_details,
            seller_info=seller_info
        )
    
    def _create_price_range(self, price: float) -> str:
        """Create price range for masked listings"""
        if price < 50000:
            return "Under £50k"
        elif price < 100000:
            return "£50k - £100k"
        elif price < 250000:
            return "£100k - £250k"
        elif price < 500000:
            return "£250k - £500k"
        elif price < 1000000:
            return "£500k - £1M"
        else:
            return "Over £1M"
    
    def _create_business_summary(self, listing: Listing) -> str:
        """Create business summary for public view"""
        summary_parts = []
        
        if listing.practice_type:
            summary_parts.append(f"{listing.practice_type} practice")
        
        if listing.patient_list_size:
            summary_parts.append(f"~{listing.patient_list_size} patients")
        
        if listing.nhs_contract:
            summary_parts.append("NHS contract")
        
        if listing.cqc_registered:
            summary_parts.append("CQC registered")
        
        return " • ".join(summary_parts) if summary_parts else "Medical practice"
    
    def _is_listing_owner(self, listing: Listing, user: Optional[User]) -> bool:
        """Check if user owns the listing"""
        if not user or user.user_type != "seller":
            return False
        
        seller = self.seller_dao.get_by_user_id(user.id)
        return seller and listing.seller_id == seller.id
    
    async def _check_buyer_seller_connection(self, listing: Listing, user: Optional[User]) -> bool:
        """Check if buyer is connected to seller"""
        # TODO: Implement connection check
        return False
    def _get_viewer_locations(self, listing_id: UUID) -> List[Dict[str, Any]]:
        """Get recent viewers with location data"""
        from ..models.analytics_models import ListingView
        from ..models.user_models import User, Buyer
        from datetime import datetime, timedelta, timezone
        
        # Get recent views (last 30 days) - Only authenticated users for B2B platform
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        
        views = self.db.query(ListingView).filter(
            ListingView.listing_id == listing_id,
            ListingView.viewed_at >= thirty_days_ago,
            ListingView.buyer_id.isnot(None)  # Only authenticated users
        ).order_by(ListingView.viewed_at.desc()).limit(50).all()
        
        viewer_data = []
        processed_buyers = {}  # Track buyers to avoid duplicates and aggregate data
        
        for view in views:
            # All views are now authenticated (filtered above)
            buyer_id = str(view.buyer_id)
            
            if buyer_id not in processed_buyers:
                buyer = self.db.query(Buyer).filter(Buyer.id == view.buyer_id).first()
                if buyer:
                    user = self.db.query(User).filter(User.id == buyer.user_id).first()
                    if user:
                        # Count total views for this buyer
                        buyer_view_count = self.db.query(ListingView).filter(
                            ListingView.listing_id == listing_id,
                            ListingView.buyer_id == view.buyer_id
                        ).count()
                        
                        # Get most recent view
                        latest_view = self.db.query(ListingView).filter(
                            ListingView.listing_id == listing_id,
                            ListingView.buyer_id == view.buyer_id
                        ).order_by(ListingView.viewed_at.desc()).first()
                        
                        processed_buyers[buyer_id] = {
                            "buyer_id": buyer_id,
                            "viewed_at": latest_view.viewed_at.isoformat() if latest_view and latest_view.viewed_at else None,
                            "ip_address": latest_view.ip_address if latest_view else None,
                            "country": latest_view.country or "Unknown" if latest_view else "Unknown",
                            "region": latest_view.region or "Unknown" if latest_view else "Unknown", 
                            "city": latest_view.city or "Unknown" if latest_view else "Unknown",
                            "location": f"{latest_view.city or 'Unknown'}, {latest_view.country or 'Unknown'}" if latest_view else "Unknown",
                            "user_type": "buyer",
                            "buyer_name": f"{user.first_name} {user.last_name}".strip(),
                            "buyer_email": user.email,
                            "verification_status": buyer.verification_status or "pending",
                            "view_count": buyer_view_count
                        }
        
        # Return processed buyers as viewer data
        viewer_data = list(processed_buyers.values())
        
        return viewer_data
    
    def _get_view_trend(self, listing_id: UUID, days: int = 30) -> List[Dict[str, Any]]:
        """Get view trend data over time"""
        from ..models.analytics_models import ListingView
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import func
        
        # Get daily view counts for the last N days
        start_date = datetime.now(timezone.utc) - timedelta(days=days)
        
        daily_views = self.db.query(
            func.date(ListingView.viewed_at).label('date'),
            func.count(ListingView.id).label('views')
        ).filter(
            ListingView.listing_id == listing_id,
            ListingView.viewed_at >= start_date
        ).group_by(
            func.date(ListingView.viewed_at)
        ).order_by('date').all()
        
        # Convert to list of dictionaries
        trend_data = []
        for date_views in daily_views:
            trend_data.append({
                "date": str(date_views.date) if date_views.date else None,
                "views": date_views.views
            })
        
        return trend_data
    
    def _get_approved_connections_count(self, listing_id: UUID) -> int:
        """Get count of approved connections for listing"""
        from ..models.connection_models import Connection
        from ..core.constants import ConnectionStatus
        
        return self.db.query(Connection).filter(
            Connection.listing_id == listing_id,
            Connection.status == ConnectionStatus.APPROVED
        ).count()
    
    # DEPRECATED: View tracking is now handled by AnalyticsBusinessLogic
    # with proper daily deduplication. This method is kept for reference
    # but should not be used.
    async def _track_listing_view(self, listing_id: UUID, user: User) -> None:
        """
        DEPRECATED: Track listing view for analytics
        
        This method is deprecated in favor of AnalyticsBusinessLogic.track_listing_view()
        which includes proper daily deduplication logic.
        """
        # This method is intentionally disabled to prevent duplicate tracking
        # All view tracking should go through the analytics service endpoint
        pass
    
    def _get_listings_count(self, search_params: ListingSearchParams) -> int:
        """Get total count of listings matching search criteria"""
        # TODO: Implement proper count query
        return 100  # Placeholder
