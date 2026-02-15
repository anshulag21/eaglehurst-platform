"""
Admin management business logic
"""

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc, func, or_

from ..models.user_models import User, Seller, Buyer
from ..models.listing_models import Listing, ListingEdit
from ..models.connection_models import Connection
from ..models.subscription_models import UserSubscription, Payment
from ..models.service_models import ServiceRequest
from ..models.notification_models import Notification
from ..schemas.admin_schemas import UserVerificationRequest, ListingApprovalRequest
from ..core.constants import (
    UserType, VerificationStatus, ListingStatus, ConnectionStatus, 
    SubscriptionStatus, ServiceRequestStatus
)
from ..business_logic.notification_bl import NotificationBusinessLogic
import logging

logger = logging.getLogger(__name__)


class AdminBusinessLogic:
    def __init__(self, db: Session):
        self.db = db
        self.notification_bl = NotificationBusinessLogic(db)

    async def get_admin_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive admin dashboard data"""
        try:
            # User statistics
            total_users = self.db.query(User).count()
            total_sellers = self.db.query(User).filter(User.user_type == UserType.SELLER).count()
            total_buyers = self.db.query(User).filter(User.user_type == UserType.BUYER).count()
            verified_users = self.db.query(User).filter(User.is_verified == True).count()
            
            # New users this month
            month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            new_users_this_month = self.db.query(User).filter(
                User.created_at >= month_start
            ).count()

            # Listing statistics
            total_listings = self.db.query(Listing).count()
            published_listings = self.db.query(Listing).filter(
                Listing.status == ListingStatus.PUBLISHED
            ).count()
            pending_listings = self.db.query(Listing).filter(
                Listing.status == ListingStatus.PENDING_APPROVAL
            ).count()
            draft_listings = self.db.query(Listing).filter(
                Listing.status == ListingStatus.DRAFT
            ).count()

            # Connection statistics
            total_connections = self.db.query(Connection).count()
            active_connections = self.db.query(Connection).filter(
                Connection.status == ConnectionStatus.APPROVED
            ).count()
            pending_connections = self.db.query(Connection).filter(
                Connection.status == ConnectionStatus.PENDING
            ).count()

            # Subscription statistics
            active_subscriptions = self.db.query(UserSubscription).filter(
                UserSubscription.status == SubscriptionStatus.ACTIVE
            ).count()
            
            # Revenue this month
            revenue_this_month = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.payment_date >= month_start,
                    Payment.status == "succeeded"
                )
            ).scalar() or 0

            # Service requests
            pending_service_requests = self.db.query(ServiceRequest).filter(
                ServiceRequest.status == ServiceRequestStatus.PENDING
            ).count()

            # Recent activity (last 10 activities)
            recent_users = self.db.query(User).order_by(desc(User.created_at)).limit(5).all()
            recent_listings = self.db.query(Listing).order_by(desc(Listing.created_at)).limit(5).all()
            recent_connections = self.db.query(Connection).order_by(desc(Connection.requested_at)).limit(5).all()

            # Growth metrics (compare with last month)
            last_month_start = (month_start - timedelta(days=32)).replace(day=1)
            last_month_end = month_start - timedelta(days=1)
            
            users_last_month = self.db.query(User).filter(
                and_(User.created_at >= last_month_start, User.created_at <= last_month_end)
            ).count()
            
            user_growth = ((new_users_this_month - users_last_month) / max(users_last_month, 1)) * 100

            return {
                "overview": {
                    "total_users": total_users,
                    "total_sellers": total_sellers,
                    "total_buyers": total_buyers,
                    "verified_users": verified_users,
                    "new_users_this_month": new_users_this_month,
                    "user_growth_percentage": round(user_growth, 2),
                    "total_listings": total_listings,
                    "published_listings": published_listings,
                    "pending_listings": pending_listings,
                    "draft_listings": draft_listings,
                    "total_connections": total_connections,
                    "active_connections": active_connections,
                    "pending_connections": pending_connections,
                    "active_subscriptions": active_subscriptions,
                    "revenue_this_month": float(revenue_this_month),
                    "pending_service_requests": pending_service_requests
                },
                "recent_activity": {
                    "new_users": [
                        {
                            "id": user.id,
                            "name": f"{user.first_name} {user.last_name}",
                            "email": user.email,
                            "user_type": user.user_type,
                            "created_at": user.created_at
                        }
                        for user in recent_users
                    ],
                    "new_listings": [
                        {
                            "id": listing.id,
                            "title": listing.title,
                            "business_type": listing.business_type,
                            "status": listing.status,
                            "created_at": listing.created_at
                        }
                        for listing in recent_listings
                    ],
                    "new_connections": [
                        {
                            "id": conn.id,
                            "status": conn.status,
                            "requested_at": conn.requested_at
                        }
                        for conn in recent_connections
                    ]
                },
                "alerts": await self._get_admin_alerts()
            }

        except Exception as e:
            logger.error(f"Error getting admin dashboard: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve admin dashboard data"
            )

    async def get_system_status(self) -> Dict[str, Any]:
        """Get real-time system status and health metrics"""
        try:
            # Database status - check by performing a simple query
            database_status = "online"
            try:
                from sqlalchemy import text
                self.db.execute(text("SELECT 1"))
            except Exception:
                database_status = "offline"

            # API status - always healthy if we can execute this method
            api_status = "healthy"

            # Get pending items count for review
            pending_listings = self.db.query(Listing).filter(
                Listing.status == ListingStatus.PENDING_APPROVAL
            ).count()

            # Get pending listing edits count
            pending_edits = self.db.query(ListingEdit).filter(
                ListingEdit.status == "pending_approval"
            ).count()

            # Total items needing review
            total_pending_items = pending_listings + pending_edits

            # Get current timestamp for real-time updates
            current_time = datetime.utcnow()

            return {
                "database_status": database_status,
                "api_status": api_status,
                "pending_items": total_pending_items,
                "pending_listings": pending_listings,
                "pending_edits": pending_edits,
                "last_updated": current_time.isoformat(),
                "timestamp": current_time.timestamp()
            }

        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            # Return degraded status if there's an error
            return {
                "database_status": "error",
                "api_status": "degraded",
                "pending_items": 0,
                "pending_listings": 0,
                "pending_edits": 0,
                "last_updated": datetime.utcnow().isoformat(),
                "timestamp": datetime.utcnow().timestamp(),
                "error": "Unable to retrieve complete system status"
            }

    async def _get_admin_alerts(self) -> List[Dict[str, Any]]:
        """Get system alerts for admin attention"""
        alerts = []
        
        # Check for KYC verifications awaiting review
        kyc_awaiting_review = self.db.query(Seller).filter(
            Seller.verification_status == VerificationStatus.SUBMITTED_FOR_REVIEW
        ).count()
        
        if kyc_awaiting_review > 0:
            alerts.append({
                "type": "kyc_review",
                "message": f"{kyc_awaiting_review} seller KYC verification(s) awaiting review",
                "count": kyc_awaiting_review,
                "priority": "high"
            })

        # Check for new sellers who haven't started verification
        new_sellers_pending = self.db.query(Seller).filter(
            Seller.verification_status == VerificationStatus.PENDING
        ).count()
        
        if new_sellers_pending > 0:
            alerts.append({
                "type": "verification",
                "message": f"{new_sellers_pending} new seller(s) haven't started verification",
                "count": new_sellers_pending,
                "priority": "medium"
            })

        # Check for pending listings
        pending_listings = self.db.query(Listing).filter(
            Listing.status == ListingStatus.PENDING_APPROVAL
        ).count()
        
        if pending_listings > 0:
            alerts.append({
                "type": "listing_approval",
                "message": f"{pending_listings} listing(s) pending approval",
                "count": pending_listings,
                "priority": "medium"
            })

        # Check for urgent service requests
        urgent_service_requests = self.db.query(ServiceRequest).filter(
            and_(
                ServiceRequest.status == ServiceRequestStatus.PENDING,
                ServiceRequest.urgency == "high"
            )
        ).count()
        
        if urgent_service_requests > 0:
            alerts.append({
                "type": "service_request",
                "message": f"{urgent_service_requests} urgent service request(s) need attention",
                "count": urgent_service_requests,
                "priority": "high"
            })

        return alerts

    async def get_users_management(
        self, page: int, limit: int, user_type: Optional[str] = None,
        verification_status: Optional[str] = None, search: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get users for management with filtering"""
        try:
            offset = (page - 1) * limit
            
            query = self.db.query(User)
            
            # Apply filters
            if user_type:
                query = query.filter(User.user_type == user_type)
            
            # Apply verification status filter
            if verification_status:
                # Join with seller_profile or buyer_profile based on user type
                if user_type == 'seller':
                    query = query.join(Seller).filter(
                        Seller.verification_status == verification_status
                    )
                elif user_type == 'buyer':
                    query = query.join(Buyer).filter(
                        Buyer.verification_status == verification_status
                    )
                else:
                    # If no user_type specified, filter both sellers and buyers
                    query = query.outerjoin(Seller).outerjoin(Buyer).filter(
                        or_(
                            Seller.verification_status == verification_status,
                            Buyer.verification_status == verification_status
                        )
                    )
            
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    or_(
                        User.first_name.ilike(search_term),
                        User.last_name.ilike(search_term),
                        User.email.ilike(search_term)
                    )
                )
            
            total = query.count()
            users = query.order_by(desc(User.created_at)).offset(offset).limit(limit).all()

            user_list = []
            for user in users:
                user_data = {
                    "id": user.id,
                    "email": user.email,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "user_type": user.user_type,
                    "is_verified": user.is_verified,
                    "is_active": user.is_active,
                    "last_login": user.last_login,
                    "created_at": user.created_at
                }

                # Add role-specific data
                if user.user_type == UserType.SELLER and user.seller_profile:
                    user_data["seller_info"] = {
                        "business_name": user.seller_profile.business_name,
                        "verification_status": user.seller_profile.verification_status,
                        "listings_count": self.db.query(Listing).filter(
                            Listing.seller_id == user.seller_profile.id
                        ).count()
                    }
                elif user.user_type == UserType.BUYER and user.buyer_profile:
                    user_data["buyer_info"] = {
                        "verification_status": user.buyer_profile.verification_status,
                        "connections_count": self.db.query(Connection).filter(
                            Connection.buyer_id == user.buyer_profile.id
                        ).count()
                    }

                user_list.append(user_data)

            return {
                "users": user_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except Exception as e:
            logger.error(f"Error getting users management: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve users"
            )

    async def get_user_details(self, user_id: UUID) -> Dict[str, Any]:
        """Get detailed user information for admin review"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            user_data = {
                "id": user.id,
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "phone": user.phone,
                "user_type": user.user_type,
                "is_verified": user.is_verified,
                "is_active": user.is_active,
                "last_login": user.last_login,
                "created_at": user.created_at,
                "updated_at": user.updated_at
            }

            # Add role-specific details
            if user.user_type == UserType.SELLER and user.seller_profile:
                seller = user.seller_profile
                user_data["seller_profile"] = {
                    "id": seller.id,
                    "business_name": seller.business_name,
                    "business_description": seller.business_description,
                    "business_address": seller.business_address,
                    "verification_status": seller.verification_status,
                    "professional_qualifications": getattr(seller, 'professional_qualifications', None),
                    "experience_years": getattr(seller, 'experience_years', None),
                    "specializations": getattr(seller, 'specializations', None),
                    "kyc_documents": seller.kyc_documents,
                    "admin_notes": seller.admin_notes,
                    "created_at": seller.created_at
                }

                # Get seller's listings with analytics data
                listings = self.db.query(Listing).filter(
                    Listing.seller_id == seller.id
                ).all()
                user_data["listings"] = [
                    {
                        "id": listing.id,
                        "title": listing.title,
                        "status": listing.status,
                        "created_at": listing.created_at,
                        "view_count": listing.view_count or 0,
                        "connection_count": listing.connection_count or 0
                    }
                    for listing in listings
                ]

            elif user.user_type == UserType.BUYER and user.buyer_profile:
                buyer = user.buyer_profile
                user_data["buyer_profile"] = {
                    "id": buyer.id,
                    "verification_status": buyer.verification_status,
                    "preferences": buyer.preferences,
                    "created_at": buyer.created_at
                }

                # Get buyer's connections
                connections = self.db.query(Connection).filter(
                    Connection.buyer_id == buyer.id
                ).all()
                user_data["connections"] = [
                    {
                        "id": conn.id,
                        "status": conn.status,
                        "requested_at": conn.requested_at
                    }
                    for conn in connections
                ]

            return user_data

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting user details: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve user details"
            )

    async def verify_user(
        self, admin_user: User, user_id: UUID, verification_data: UserVerificationRequest
    ) -> Dict[str, Any]:
        """Verify or reject user verification"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Update verification status based on user type
            if user.user_type == UserType.SELLER and user.seller_profile:
                user.seller_profile.verification_status = verification_data.status
                if verification_data.admin_notes:
                    # Store admin notes in a separate field or log
                    pass
            elif user.user_type == UserType.BUYER and user.buyer_profile:
                user.buyer_profile.verification_status = verification_data.status

            # Update user verification status
            if verification_data.status == VerificationStatus.APPROVED:
                user.is_verified = True
            else:
                user.is_verified = False

            self.db.commit()

            # Send notification to user
            if verification_data.status == VerificationStatus.APPROVED:
                await self.notification_bl.create_notification(
                    user_id=user.id,
                    notification_type="kyc_approved",
                    title="Verification Approved",
                    message="Your account has been verified and approved!",
                    send_email=True
                )
            else:
                await self.notification_bl.create_notification(
                    user_id=user.id,
                    notification_type="kyc_rejected",
                    title="Verification Rejected",
                    message=f"Your verification has been rejected. {verification_data.admin_notes or ''}",
                    send_email=True
                )

            return {
                "user_id": user_id,
                "verification_status": verification_data.status,
                "verified_by": admin_user.id,
                "verified_at": datetime.utcnow()
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error verifying user: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user verification"
            )

    async def update_user_status(
        self, admin_user: User, user_id: UUID, is_active: bool, admin_notes: Optional[str]
    ) -> Dict[str, Any]:
        """Update user active status"""
        try:
            user = self.db.query(User).filter(User.id == user_id).first()
            
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            user.is_active = is_active
            self.db.commit()

            # Send notification
            status_text = "activated" if is_active else "deactivated"
            await self.notification_bl.create_notification(
                user_id=user.id,
                notification_type="account_status",
                title=f"Account {status_text.title()}",
                message=f"Your account has been {status_text}. {admin_notes or ''}",
                send_email=True
            )

            return {
                "user_id": user_id,
                "is_active": is_active,
                "updated_by": admin_user.id,
                "updated_at": datetime.utcnow(),
                "admin_notes": admin_notes
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating user status: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update user status"
            )

    async def get_pending_listings(
        self, page: int, limit: int, business_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get listings and listing edits pending admin approval"""
        try:
            offset = (page - 1) * limit
            
            # Get new listings pending approval
            new_listings_query = self.db.query(Listing).options(
                joinedload(Listing.seller).joinedload(Seller.user)
            ).filter(
                Listing.status == ListingStatus.PENDING_APPROVAL
            )
            
            if business_type:
                new_listings_query = new_listings_query.filter(Listing.business_type == business_type)
            
            # Get listing edits pending approval
            listing_edits_query = self.db.query(ListingEdit).options(
                joinedload(ListingEdit.listing).joinedload(Listing.seller).joinedload(Seller.user)
            ).filter(
                ListingEdit.status == "pending"
            )
            
            # Count total items
            new_listings_count = new_listings_query.count()
            listing_edits_count = listing_edits_query.count()
            total = new_listings_count + listing_edits_count
            
            # Get items for current page
            all_items = []
            
            # Get new listings
            new_listings = new_listings_query.order_by(desc(Listing.created_at)).all()
            for listing in new_listings:
                # Safely handle seller data
                seller_data = None
                if listing.seller:
                    seller_data = {
                        "id": str(listing.seller.id),  # Convert UUID to string
                        "business_name": listing.seller.business_name,
                        "verification_status": listing.seller.verification_status
                    }
                
                listing_data = {
                    "id": str(listing.id),  # Convert UUID to string
                    "title": listing.title,
                    "description": listing.description[:200] + "..." if len(listing.description) > 200 else listing.description,
                    "business_type": listing.business_type,
                    "location": listing.location,
                    "asking_price": str(listing.asking_price) if listing.asking_price else None,  # Convert Decimal to string
                    "status": listing.status,
                    "created_at": listing.created_at,
                    "seller": seller_data,
                    "type": "new_listing"  # Distinguish from edits
                }
                all_items.append((listing.created_at, listing_data))
            
            # Get listing edits
            listing_edits = listing_edits_query.order_by(desc(ListingEdit.created_at)).all()
            for edit in listing_edits:
                if edit.listing and edit.listing.seller:
                    seller_data = {
                        "id": str(edit.listing.seller.id),  # Convert UUID to string
                        "business_name": edit.listing.seller.business_name,
                        "verification_status": edit.listing.seller.verification_status
                    }
                    
                    edit_data = {
                        "id": str(edit.listing.id),  # Convert UUID to string
                        "edit_id": str(edit.id),     # Convert UUID to string
                        "title": edit.listing.title,
                        "description": edit.listing.description[:200] + "..." if len(edit.listing.description) > 200 else edit.listing.description,
                        "business_type": edit.listing.business_type,
                        "location": edit.listing.location,
                        "asking_price": str(edit.listing.asking_price) if edit.listing.asking_price else None,  # Convert Decimal to string
                        "status": "pending_edit",  # Special status for edits
                        "created_at": edit.created_at,
                        "seller": seller_data,
                        "type": "listing_edit",  # Distinguish from new listings
                        "edit_reason": edit.edit_reason
                    }
                    all_items.append((edit.created_at, edit_data))
            
            # Sort all items by creation date and paginate
            all_items.sort(key=lambda x: x[0], reverse=True)
            paginated_items = all_items[offset:offset + limit]
            listing_list = [item[1] for item in paginated_items]

            return {
                "listings": listing_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except Exception as e:
            logger.error(f"Error getting pending listings: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve pending listings"
            )

    async def get_all_listings(
        self, 
        page: int, 
        limit: int, 
        status_filter: Optional[str] = None,
        business_type: Optional[str] = None,
        search: Optional[str] = None,
        sort_by: Optional[str] = "created_at",
        sort_order: Optional[str] = "desc"
    ) -> Dict[str, Any]:
        """Get all listings for admin with filtering and sorting"""
        try:
            offset = (page - 1) * limit
            
            # Base query with eager loading
            query = self.db.query(Listing).options(
                joinedload(Listing.seller).joinedload(Seller.user)
            )
            
            # Apply filters
            if status_filter:
                query = query.filter(Listing.status == status_filter)
            
            if business_type:
                query = query.filter(Listing.business_type == business_type)
            
            if search:
                search_term = f"%{search}%"
                query = query.filter(
                    or_(
                        Listing.title.ilike(search_term),
                        Listing.description.ilike(search_term),
                        Listing.location.ilike(search_term)
                    )
                )
            
            # Apply sorting
            sort_field = getattr(Listing, sort_by, Listing.created_at)
            if sort_order == "desc":
                query = query.order_by(desc(sort_field))
            else:
                query = query.order_by(sort_field)
            
            # Get total count
            total = query.count()
            
            # Get listings for current page
            listings = query.offset(offset).limit(limit).all()
            
            # Format response
            listings_data = []
            for listing in listings:
                listing_data = {
                    "id": listing.id,
                    "title": listing.title,
                    "description": listing.description,
                    "business_type": listing.business_type,
                    "location": listing.location,
                    "asking_price": listing.asking_price,
                    "status": listing.status,
                    "created_at": listing.created_at,
                    "updated_at": listing.updated_at,
                    "seller": {
                        "id": listing.seller.id,
                        "user_id": listing.seller.user_id,  # Add user_id for navigation
                        "business_name": listing.seller.business_name,
                        "verification_status": listing.seller.verification_status,
                        "user": {
                            "id": listing.seller.user.id,  # Also include user.id for consistency
                            "name": f"{listing.seller.user.first_name} {listing.seller.user.last_name}",
                            "email": listing.seller.user.email,
                        }
                    } if listing.seller else None
                }
                listings_data.append(listing_data)
            
            return {
                "listings": listings_data,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }
            
        except Exception as e:
            logger.error(f"Error getting all listings: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve listings"
            )

    async def get_listing_for_review(self, listing_id: UUID, edit_id: Optional[UUID] = None) -> Dict[str, Any]:
        """Get detailed listing information for admin review"""
        try:
            listing = self.db.query(Listing).options(
                joinedload(Listing.seller).joinedload(Seller.user),
                joinedload(Listing.media_files)
            ).filter(Listing.id == listing_id).first()
            
            if not listing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Listing not found"
                )
            
            # Check if this is a listing edit review
            listing_edit = None
            if edit_id:
                listing_edit = self.db.query(ListingEdit).filter(
                    ListingEdit.id == edit_id,
                    ListingEdit.listing_id == listing_id,
                    ListingEdit.status == "pending"
                ).first()
                
                if not listing_edit:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Listing edit not found"
                    )

            # Safely handle seller data
            seller_data = None
            if listing.seller:
                seller_data = {
                    "id": str(listing.seller.id),  # Convert UUID to string
                    "user_id": str(listing.seller.user_id),  # Add user_id for navigation
                    "business_name": listing.seller.business_name,
                    "verification_status": listing.seller.verification_status,
                    "user": {
                        "id": str(listing.seller.user.id),  # Also include user.id for consistency
                        "name": f"{listing.seller.user.first_name} {listing.seller.user.last_name}",
                        "email": listing.seller.user.email,
                        "phone": listing.seller.user.phone
                    } if listing.seller.user else {"name": "Unknown", "email": "Unknown", "phone": "Unknown"}
                }

            # Handle media files
            media_data = []
            if listing.media_files:
                for media in listing.media_files:
                    media_data.append({
                        "id": str(media.id),  # Convert UUID to string
                        "file_url": media.file_url,
                        "file_type": media.file_type,
                        "is_primary": media.is_primary,
                        "uploaded_at": media.created_at
                    })

            # Base listing data - safely handle potentially missing fields
            listing_data = {
                "id": str(listing.id),  # Convert UUID to string
                "title": listing.title,
                "description": listing.description,
                "business_type": listing.business_type,
                "location": listing.location,
                "postcode": getattr(listing, 'postcode', None),
                "region": getattr(listing, 'region', None),
                "asking_price": str(getattr(listing, 'asking_price', None)) if getattr(listing, 'asking_price', None) else None,
                "annual_revenue": str(getattr(listing, 'annual_revenue', None)) if getattr(listing, 'annual_revenue', None) else None,
                "net_profit": str(getattr(listing, 'net_profit', None)) if getattr(listing, 'net_profit', None) else None,
                "practice_name": getattr(listing, 'practice_name', None),
                "practice_type": getattr(listing, 'practice_type', None),
                "premises_type": getattr(listing, 'premises_type', None),
                "nhs_contract": getattr(listing, 'nhs_contract', False),
                "nhs_contract_details": getattr(listing, 'nhs_contract_details', None),
                "private_patient_base": getattr(listing, 'private_patient_base', None),
                "staff_count": getattr(listing, 'staff_count', None),
                "patient_list_size": getattr(listing, 'patient_list_size', None),
                "equipment_inventory": getattr(listing, 'equipment_inventory', None),
                "cqc_registered": getattr(listing, 'cqc_registered', False),
                "cqc_registration_number": getattr(listing, 'cqc_registration_number', None),
                "professional_indemnity_insurance": getattr(listing, 'professional_indemnity_insurance', False),
                "insurance_details": getattr(listing, 'insurance_details', None),
                "lease_agreement_details": getattr(listing, 'lease_agreement_details', None),
                "property_value": str(getattr(listing, 'property_value', None)) if getattr(listing, 'property_value', None) else None,
                "goodwill_valuation": str(getattr(listing, 'goodwill_valuation', None)) if getattr(listing, 'goodwill_valuation', None) else None,
                "business_details": getattr(listing, 'business_details', None),
                "financial_statements": getattr(listing, 'financial_statements', None),
                "status": listing.status,
                "created_at": listing.created_at,
                "media": media_data,
                "seller": seller_data
            }
            
            # If this is an edit review, include the proposed changes
            if listing_edit:
                listing_data.update({
                    "is_edit_review": True,
                    "edit_id": str(listing_edit.id),  # Convert UUID to string
                    "edit_reason": listing_edit.edit_reason,
                    "edit_created_at": listing_edit.created_at,
                    "proposed_changes": listing_edit.edit_data,
                    "original_status": listing.status  # Show that original is still published
                })
            else:
                listing_data["is_edit_review"] = False
            
            return listing_data

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting listing for review: {e}")
            logger.error(f"Listing ID: {listing_id}, Edit ID: {edit_id}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to retrieve listing details: {str(e)}"
            )

    async def approve_or_reject_listing(
        self, admin_user: User, listing_id: UUID, approval_data: ListingApprovalRequest, edit_id: Optional[UUID] = None
    ) -> Dict[str, Any]:
        """Approve or reject a listing or listing edit"""
        try:
            listing = self.db.query(Listing).filter(Listing.id == listing_id).first()
            
            if not listing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Listing not found"
                )

            # Check if this is approving a listing edit
            if edit_id:
                listing_edit = self.db.query(ListingEdit).filter(
                    ListingEdit.id == edit_id,
                    ListingEdit.listing_id == listing_id,
                    ListingEdit.status == "pending"
                ).first()
                
                if not listing_edit:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="Listing edit not found"
                    )
                
                if approval_data.status == "approved":
                    # Apply only the changed fields from staging table to main listing table
                    edit_data = listing_edit.edit_data
                    
                    def restore_field_type(value, field_name):
                        """Restore the correct type for a field value"""
                        if value is None:
                            return None
                        
                        # Get the current field value to determine the expected type
                        if hasattr(listing, field_name):
                            current_value = getattr(listing, field_name)
                            if current_value is not None and hasattr(current_value, '__class__'):
                                current_class = current_value.__class__.__name__
                                
                                if current_class == 'Decimal':
                                    from decimal import Decimal
                                    try:
                                        return Decimal(str(value)) if value is not None else None
                                    except (ValueError, TypeError):
                                        return current_value
                                
                                elif current_class == 'datetime':
                                    from datetime import datetime
                                    try:
                                        return datetime.fromisoformat(str(value)) if value is not None else None
                                    except (ValueError, TypeError):
                                        return current_value
                                
                                elif current_class == 'UUID':
                                    from uuid import UUID
                                    try:
                                        return UUID(str(value)) if value is not None else None
                                    except (ValueError, TypeError):
                                        return current_value
                        
                        return value
                    
                    # Apply only the changed fields from the staging data to the main listing
                    for field, value in edit_data.items():
                        if hasattr(listing, field):
                            converted_value = restore_field_type(value, field)
                            setattr(listing, field, converted_value)
                    
                    # Update the listing's updated_at timestamp
                    listing.updated_at = datetime.utcnow()
                    
                    # Mark the edit as approved
                    listing_edit.status = "approved"
                    listing_edit.reviewed_at = datetime.utcnow()
                    listing_edit.admin_notes = approval_data.admin_notes
                    
                    # Listing stays PUBLISHED (it was already published)
                    message = "Listing changes approved and applied"
                    
                else:
                    # Reject the edit - original listing stays unchanged
                    listing_edit.status = "rejected"
                    listing_edit.reviewed_at = datetime.utcnow()
                    listing_edit.admin_notes = approval_data.admin_notes or approval_data.rejection_reason
                    
                    message = "Listing changes rejected"
                
                self.db.commit()
                
                # Send notification to seller about edit approval/rejection
                await self.notification_bl.notify_listing_status(
                    seller_user_id=listing.seller.user_id,
                    listing_title=listing.title,
                    status=f"edit_{approval_data.status}",
                    admin_notes=approval_data.admin_notes or approval_data.rejection_reason
                )
                
                return {
                    "listing_id": listing_id,
                    "edit_id": edit_id,
                    "status": listing_edit.status,
                    "approved_by": admin_user.id,
                    "approved_at": datetime.utcnow(),
                    "admin_notes": approval_data.admin_notes,
                    "message": message
                }
            
            else:
                # Handle new listing approval/rejection (original logic)
                if approval_data.status == "approved":
                    listing.status = ListingStatus.PUBLISHED
                    listing.published_at = datetime.utcnow()
                else:
                    listing.status = ListingStatus.REJECTED
                    listing.rejection_reason = approval_data.rejection_reason

                listing.admin_notes = approval_data.admin_notes
                self.db.commit()

                # Send notification to seller
                await self.notification_bl.notify_listing_status(
                    seller_user_id=listing.seller.user_id,
                    listing_title=listing.title,
                    status=approval_data.status,
                    admin_notes=approval_data.admin_notes or approval_data.rejection_reason
                )

                return {
                    "listing_id": listing_id,
                    "status": listing.status,
                    "approved_by": admin_user.id,
                    "approved_at": datetime.utcnow(),
                    "admin_notes": approval_data.admin_notes
                }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error approving/rejecting listing: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update listing status"
            )

    async def get_platform_analytics(self, period: str) -> Dict[str, Any]:
        """Get platform analytics for specified period"""
        try:
            # Calculate date range based on period
            end_date = datetime.utcnow()
            if period == "7d":
                start_date = end_date - timedelta(days=7)
            elif period == "30d":
                start_date = end_date - timedelta(days=30)
            elif period == "90d":
                start_date = end_date - timedelta(days=90)
            elif period == "1y":
                start_date = end_date - timedelta(days=365)
            else:
                start_date = end_date - timedelta(days=30)  # Default to 30 days

            # User analytics
            new_users = self.db.query(User).filter(
                User.created_at >= start_date
            ).count()

            # Listing analytics
            new_listings = self.db.query(Listing).filter(
                Listing.created_at >= start_date
            ).count()

            # Connection analytics
            new_connections = self.db.query(Connection).filter(
                Connection.requested_at >= start_date
            ).count()

            # Activity trends (daily breakdown)
            daily_stats = []
            current_date = start_date
            while current_date <= end_date:
                next_date = current_date + timedelta(days=1)
                
                daily_users = self.db.query(User).filter(
                    and_(User.created_at >= current_date, User.created_at < next_date)
                ).count()
                
                daily_listings = self.db.query(Listing).filter(
                    and_(Listing.created_at >= current_date, Listing.created_at < next_date)
                ).count()
                
                daily_connections = self.db.query(Connection).filter(
                    and_(Connection.requested_at >= current_date, Connection.requested_at < next_date)
                ).count()

                daily_stats.append({
                    "date": current_date.strftime("%Y-%m-%d"),
                    "users": daily_users,
                    "listings": daily_listings,
                    "connections": daily_connections
                })
                
                current_date = next_date

            return {
                "period": period,
                "start_date": start_date,
                "end_date": end_date,
                "summary": {
                    "new_users": new_users,
                    "new_listings": new_listings,
                    "new_connections": new_connections
                },
                "daily_breakdown": daily_stats
            }

        except Exception as e:
            logger.error(f"Error getting platform analytics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve platform analytics"
            )

    async def get_revenue_analytics(self, period: str) -> Dict[str, Any]:
        """Get revenue analytics for specified period"""
        try:
            # Calculate date range
            end_date = datetime.utcnow()
            if period == "7d":
                start_date = end_date - timedelta(days=7)
            elif period == "30d":
                start_date = end_date - timedelta(days=30)
            elif period == "90d":
                start_date = end_date - timedelta(days=90)
            elif period == "1y":
                start_date = end_date - timedelta(days=365)
            else:
                start_date = end_date - timedelta(days=30)

            # Total revenue
            total_revenue = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.payment_date >= start_date,
                    Payment.status == "succeeded"
                )
            ).scalar() or 0

            # Revenue by subscription tier
            revenue_by_tier = self.db.query(
                UserSubscription.subscription.has(),
                func.sum(Payment.amount)
            ).join(Payment).filter(
                and_(
                    Payment.payment_date >= start_date,
                    Payment.status == "succeeded"
                )
            ).group_by(UserSubscription.subscription_id).all()

            return {
                "period": period,
                "total_revenue": float(total_revenue),
                "revenue_by_tier": [
                    {
                        "tier": tier,
                        "revenue": float(revenue)
                    }
                    for tier, revenue in revenue_by_tier
                ]
            }

        except Exception as e:
            logger.error(f"Error getting revenue analytics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve revenue analytics"
            )

    async def get_admin_service_requests(
        self, page: int, limit: int, service_type: Optional[str] = None,
        status_filter: Optional[str] = None, urgency: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get service requests for admin management"""
        try:
            offset = (page - 1) * limit
            
            query = self.db.query(ServiceRequest)
            
            if service_type:
                query = query.filter(ServiceRequest.service_type == service_type)
            if status_filter:
                query = query.filter(ServiceRequest.status == status_filter)
            if urgency:
                query = query.filter(ServiceRequest.urgency == urgency)
            
            total = query.count()
            requests = query.order_by(desc(ServiceRequest.requested_at)).offset(offset).limit(limit).all()

            request_list = []
            for req in requests:
                request_data = {
                    "id": req.id,
                    "user_id": req.user_id,
                    "service_type": req.service_type,
                    "title": req.title,
                    "urgency": req.urgency,
                    "status": req.status,
                    "estimated_cost": req.estimated_cost,
                    "requested_at": req.requested_at,
                    "user": {
                        "name": f"{req.user.first_name} {req.user.last_name}",
                        "email": req.user.email
                    } if req.user else None
                }
                request_list.append(request_data)

            return {
                "service_requests": request_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except Exception as e:
            logger.error(f"Error getting admin service requests: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve service requests"
            )

    async def get_system_notifications(self) -> Dict[str, Any]:
        """Get system-wide notifications and alerts"""
        try:
            alerts = await self._get_admin_alerts()
            
            # Add system health checks
            system_health = {
                "database_status": "healthy",  # In real app, check DB connection
                "email_service_status": "healthy",  # In real app, check email service
                "storage_usage": "normal",  # In real app, check disk usage
                "api_response_time": "normal"  # In real app, check API performance
            }

            return {
                "alerts": alerts,
                "system_health": system_health,
                "last_updated": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"Error getting system notifications: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve system notifications"
            )

    async def broadcast_notification(
        self, admin_user: User, title: str, message: str, 
        user_type: Optional[str] = None, send_email: bool = False
    ) -> Dict[str, Any]:
        """Broadcast notification to users"""
        try:
            # Get target users
            query = self.db.query(User).filter(User.is_active == True)
            
            if user_type and user_type != "all":
                query = query.filter(User.user_type == user_type)
            
            target_users = query.all()
            
            # Create notifications for each user
            notification_count = 0
            for user in target_users:
                await self.notification_bl.create_notification(
                    user_id=user.id,
                    notification_type="system_announcement",
                    title=title,
                    message=message,
                    send_email=send_email
                )
                notification_count += 1

            return {
                "notifications_sent": notification_count,
                "target_user_type": user_type or "all",
                "email_sent": send_email,
                "broadcast_by": admin_user.id,
                "broadcast_at": datetime.utcnow()
            }

        except Exception as e:
            logger.error(f"Error broadcasting notification: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to broadcast notification"
            )

    async def get_activity_logs(
        self, page: int, limit: int, user_id: Optional[UUID] = None, 
        action_type: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get platform activity logs"""
        try:
            # In a real implementation, you'd have an activity log table
            # For now, return mock data structure
            
            return {
                "logs": [],
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": 0,
                    "pages": 0
                },
                "message": "Activity logging not yet implemented"
            }

        except Exception as e:
            logger.error(f"Error getting activity logs: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve activity logs"
            )

    async def export_users_data(self, format: str, user_type: Optional[str] = None) -> Dict[str, Any]:
        """Export users data for analysis"""
        try:
            # In a real implementation, you'd generate CSV/Excel files
            # For now, return mock response
            
            return {
                "export_format": format,
                "user_type_filter": user_type,
                "file_url": f"/exports/users_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format}",
                "generated_at": datetime.utcnow(),
                "message": "Export functionality not yet implemented"
            }

        except Exception as e:
            logger.error(f"Error exporting users data: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to export users data"
            )

    async def export_listings_data(self, format: str, status_filter: Optional[str] = None) -> Dict[str, Any]:
        """Export listings data for analysis"""
        try:
            # In a real implementation, you'd generate CSV/Excel files
            # For now, return mock response
            
            return {
                "export_format": format,
                "status_filter": status_filter,
                "file_url": f"/exports/listings_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.{format}",
                "generated_at": datetime.utcnow(),
                "message": "Export functionality not yet implemented"
            }

        except Exception as e:
            logger.error(f"Error exporting listings data: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to export listings data"
            )
