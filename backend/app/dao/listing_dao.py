"""
Listing Data Access Object for listing-related database operations
"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc
from datetime import datetime, timedelta

from .base_dao import BaseDAO
from ..models.listing_models import Listing, ListingMedia, ListingEdit, SavedListing
from ..models.analytics_models import ListingView
from ..schemas.listing_schemas import ListingCreate, ListingUpdate, ListingFilters
from ..core.constants import ListingStatus, BusinessType, VerificationStatus


class ListingDAO(BaseDAO[Listing, ListingCreate, ListingUpdate]):
    """Data Access Object for Listing operations"""
    
    def __init__(self, db: Session):
        super().__init__(Listing, db)
    
    def create_listing(self, seller_id: UUID, listing_data: ListingCreate) -> Listing:
        """Create a new listing"""
        listing_dict = listing_data.dict()
        
        # Extract nested data that needs special handling
        financial_data = listing_dict.pop('financial_data', {})
        business_details = listing_dict.pop('business_details', {})
        is_draft = listing_dict.pop('is_draft', True)
        
        # Merge business details into main listing
        if business_details:
            listing_dict.update(business_details)
        
        # Merge financial data
        if financial_data:
            listing_dict.update(financial_data)
        
        # Set seller and initial status
        listing_dict['seller_id'] = seller_id
        listing_dict['status'] = ListingStatus.DRAFT if is_draft else ListingStatus.PENDING_APPROVAL
        
        # Remove any fields that might not be in the Listing model
        # These are schema-only fields used for processing
        fields_to_remove = ['is_draft']  # Add more if needed
        for field in fields_to_remove:
            listing_dict.pop(field, None)
        
        listing = Listing(**listing_dict)
        self.db.add(listing)
        self.db.commit()
        self.db.refresh(listing)
        
        return listing
    
    def get_published_listings(
        self,
        filters: Optional[ListingFilters] = None,
        skip: int = 0,
        limit: int = 20,
        sort_by: str = "created_at",
        sort_desc: bool = True
    ) -> List[Listing]:
        """Get published listings with filters"""
        query = self.db.query(Listing).filter(
            Listing.status == ListingStatus.PUBLISHED
        )
        
        # Apply filters
        if filters:
            if filters.business_type:
                query = query.filter(Listing.business_type == filters.business_type)
            
            if filters.location:
                query = query.filter(Listing.location.ilike(f"%{filters.location}%"))
            
            if filters.region:
                query = query.filter(Listing.region.ilike(f"%{filters.region}%"))
            
            if filters.min_price:
                query = query.filter(Listing.asking_price >= filters.min_price)
            
            if filters.max_price:
                query = query.filter(Listing.asking_price <= filters.max_price)
            
            if filters.nhs_contract is not None:
                query = query.filter(Listing.nhs_contract == filters.nhs_contract)
            
            if filters.cqc_registered is not None:
                query = query.filter(Listing.cqc_registered == filters.cqc_registered)
            
            if filters.premises_type:
                query = query.filter(Listing.premises_type == filters.premises_type)
            
            if filters.min_patient_list:
                query = query.filter(Listing.patient_list_size >= filters.min_patient_list)
            
            if filters.max_patient_list:
                query = query.filter(Listing.patient_list_size <= filters.max_patient_list)
        
        # Apply sorting
        if hasattr(Listing, sort_by):
            order_field = getattr(Listing, sort_by)
            if sort_desc:
                query = query.order_by(desc(order_field))
            else:
                query = query.order_by(asc(order_field))
        
        return query.offset(skip).limit(limit).all()
    
    def search_listings(
        self,
        search_term: str,
        filters: Optional[ListingFilters] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Listing]:
        """Search listings by text"""
        query = self.db.query(Listing).filter(
            Listing.status == ListingStatus.PUBLISHED
        )
        
        # Apply text search
        if search_term:
            search_conditions = [
                Listing.title.ilike(f"%{search_term}%"),
                Listing.description.ilike(f"%{search_term}%"),
                Listing.practice_name.ilike(f"%{search_term}%"),
                Listing.location.ilike(f"%{search_term}%"),
                Listing.region.ilike(f"%{search_term}%")
            ]
            query = query.filter(or_(*search_conditions))
        
        # Apply additional filters
        if filters:
            if filters.business_type:
                query = query.filter(Listing.business_type == filters.business_type)
            # Add other filters as needed
        
        return query.offset(skip).limit(limit).all()
    
    def get_seller_listings(
        self,
        seller_id: UUID,
        status: Optional[ListingStatus] = None,
        skip: int = 0,
        limit: int = 20
    ) -> List[Listing]:
        """Get listings for a specific seller"""
        query = self.db.query(Listing).filter(Listing.seller_id == seller_id)
        
        if status:
            query = query.filter(Listing.status == status)
        
        return query.order_by(desc(Listing.created_at)).offset(skip).limit(limit).all()
    
    def get_pending_listings(self, skip: int = 0, limit: int = 20) -> List[Listing]:
        """Get listings pending admin approval"""
        return self.db.query(Listing).filter(
            Listing.status == ListingStatus.PENDING_APPROVAL
        ).order_by(asc(Listing.created_at)).offset(skip).limit(limit).all()
    
    def update_listing_status(
        self,
        listing_id: UUID,
        status: ListingStatus,
        admin_notes: Optional[str] = None,
        rejection_reason: Optional[str] = None
    ) -> bool:
        """Update listing status (for admin approval/rejection)"""
        update_data = {"status": status}
        
        if admin_notes:
            update_data["admin_notes"] = admin_notes
        
        if rejection_reason:
            update_data["rejection_reason"] = rejection_reason
        
        if status == ListingStatus.PUBLISHED:
            update_data["published_at"] = datetime.utcnow()
        
        result = self.db.query(Listing).filter(Listing.id == listing_id).update(update_data)
        self.db.commit()
        return result > 0
    
    def increment_view_count(self, listing_id: UUID) -> bool:
        """Increment listing view count"""
        result = self.db.query(Listing).filter(Listing.id == listing_id).update({
            "view_count": Listing.view_count + 1
        })
        self.db.commit()
        return result > 0
    
    def increment_connection_count(self, listing_id: UUID) -> bool:
        """Increment listing connection count"""
        result = self.db.query(Listing).filter(Listing.id == listing_id).update({
            "connection_count": Listing.connection_count + 1
        })
        self.db.commit()
        return result > 0
    
    def get_listing_with_seller(self, listing_id: UUID) -> Optional[Listing]:
        """Get listing with seller information"""
        return self.db.query(Listing).filter(Listing.id == listing_id).first()
    
    def is_listing_owner(self, listing_id: UUID, seller_id: UUID) -> bool:
        """Check if seller owns the listing"""
        listing = self.db.query(Listing).filter(
            and_(Listing.id == listing_id, Listing.seller_id == seller_id)
        ).first()
        return listing is not None


class ListingMediaDAO(BaseDAO[ListingMedia, dict, dict]):
    """Data Access Object for Listing Media operations"""
    
    def __init__(self, db: Session):
        super().__init__(ListingMedia, db)
    
    def add_media_to_listing(
        self,
        listing_id: UUID,
        file_url: str,
        file_type: str,
        file_name: str,
        file_size: Optional[int] = None,
        mime_type: Optional[str] = None,
        display_order: int = 0,
        is_primary: bool = False,
        caption: Optional[str] = None
    ) -> ListingMedia:
        """Add media file to listing"""
        media = ListingMedia(
            listing_id=listing_id,
            file_url=file_url,
            file_type=file_type,
            file_name=file_name,
            file_size=file_size,
            mime_type=mime_type,
            display_order=display_order,
            is_primary=is_primary,
            caption=caption
        )
        
        self.db.add(media)
        self.db.commit()
        self.db.refresh(media)
        
        return media
    
    def get_listing_media(self, listing_id: UUID) -> List[ListingMedia]:
        """Get all media for a listing"""
        return self.db.query(ListingMedia).filter(
            ListingMedia.listing_id == listing_id
        ).order_by(asc(ListingMedia.display_order)).all()
    
    def set_primary_image(self, listing_id: UUID, media_id: UUID) -> bool:
        """Set primary image for listing"""
        # First, remove primary flag from all media
        self.db.query(ListingMedia).filter(
            ListingMedia.listing_id == listing_id
        ).update({"is_primary": False})
        
        # Set the specified media as primary
        result = self.db.query(ListingMedia).filter(
            and_(ListingMedia.id == media_id, ListingMedia.listing_id == listing_id)
        ).update({"is_primary": True})
        
        self.db.commit()
        return result > 0
    
    def delete_media(self, media_id: UUID, listing_id: UUID) -> bool:
        """Delete media file"""
        result = self.db.query(ListingMedia).filter(
            and_(ListingMedia.id == media_id, ListingMedia.listing_id == listing_id)
        ).delete()
        self.db.commit()
        return result > 0


class SavedListingDAO(BaseDAO[SavedListing, dict, dict]):
    """Data Access Object for Saved Listing operations"""
    
    def __init__(self, db: Session):
        super().__init__(SavedListing, db)
    
    def save_listing(self, buyer_id: UUID, listing_id: UUID, notes: Optional[str] = None) -> SavedListing:
        """Save a listing for a buyer"""
        # Check if already saved
        existing = self.db.query(SavedListing).filter(
            and_(SavedListing.buyer_id == buyer_id, SavedListing.listing_id == listing_id)
        ).first()
        
        if existing:
            return existing
        
        saved_listing = SavedListing(
            buyer_id=buyer_id,
            listing_id=listing_id,
            notes=notes
        )
        
        self.db.add(saved_listing)
        self.db.commit()
        self.db.refresh(saved_listing)
        
        return saved_listing
    
    def unsave_listing(self, buyer_id: UUID, listing_id: UUID) -> bool:
        """Remove saved listing"""
        result = self.db.query(SavedListing).filter(
            and_(SavedListing.buyer_id == buyer_id, SavedListing.listing_id == listing_id)
        ).delete()
        self.db.commit()
        return result > 0
    
    def get_saved_listings(self, buyer_id: UUID, skip: int = 0, limit: int = 20) -> List[SavedListing]:
        """Get saved listings for a buyer"""
        from sqlalchemy.orm import joinedload
        from ..models.listing_models import Listing
        return self.db.query(SavedListing).options(
            joinedload(SavedListing.listing)
        ).join(Listing, SavedListing.listing_id == Listing.id).filter(
            SavedListing.buyer_id == buyer_id
        ).order_by(desc(SavedListing.created_at)).offset(skip).limit(limit).all()
    
    def is_listing_saved(self, buyer_id: UUID, listing_id: UUID) -> bool:
        """Check if listing is saved by buyer"""
        return self.db.query(SavedListing).filter(
            and_(SavedListing.buyer_id == buyer_id, SavedListing.listing_id == listing_id)
        ).first() is not None


class ListingViewDAO(BaseDAO[ListingView, dict, dict]):
    """Data Access Object for Listing View tracking"""
    
    def __init__(self, db: Session):
        super().__init__(ListingView, db)
    
    def record_view(
        self,
        listing_id: UUID,
        buyer_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> ListingView:
        """Record a listing view"""
        view = ListingView(
            listing_id=listing_id,
            buyer_id=buyer_id,
            ip_address=ip_address,
            user_agent=user_agent,
            session_id=session_id
        )
        
        self.db.add(view)
        self.db.commit()
        self.db.refresh(view)
        
        return view
    
    def get_listing_views(
        self,
        listing_id: UUID,
        days: int = 30
    ) -> List[ListingView]:
        """Get listing views for analytics"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        return self.db.query(ListingView).filter(
            and_(
                ListingView.listing_id == listing_id,
                ListingView.viewed_at >= cutoff_date
            )
        ).order_by(desc(ListingView.viewed_at)).all()
    
    def get_view_count(self, listing_id: UUID, days: int = 30) -> int:
        """Get view count for a listing"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        return self.db.query(ListingView).filter(
            and_(
                ListingView.listing_id == listing_id,
                ListingView.viewed_at >= cutoff_date
            )
        ).count()
    
    def get_unique_view_count(self, listing_id: UUID, days: int = 30) -> int:
        """Get unique view count for a listing"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        return self.db.query(ListingView.buyer_id).filter(
            and_(
                ListingView.listing_id == listing_id,
                ListingView.viewed_at >= cutoff_date,
                ListingView.buyer_id.isnot(None)
            )
        ).distinct().count()
