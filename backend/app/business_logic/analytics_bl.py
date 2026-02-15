"""
Analytics business logic for tracking and retrieving performance metrics
"""

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, or_

from ..models.listing_models import Listing, SavedListing
from ..models.analytics_models import ListingView
from ..models.connection_models import Connection
from ..models.user_models import User, Buyer, Seller
from ..core.constants import ListingStatus
import logging

logger = logging.getLogger(__name__)


class AnalyticsBusinessLogic:
    def __init__(self, db: Session):
        self.db = db

    async def track_listing_view(
        self, 
        listing_id: UUID, 
        user_id: Optional[UUID] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Track a listing view with daily deduplication
        
        Only increments view count once per user per day:
        - For authenticated users: tracks by buyer_id per day
        - For anonymous users: tracks by IP address per day
        - Sellers viewing their own listings are not tracked
        """
        try:
            # Check if listing exists
            listing = self.db.query(Listing).filter(Listing.id == listing_id).first()
            if not listing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Listing not found"
                )

            # Check if user is the listing owner (seller) - don't track their own views
            if user_id:
                user = self.db.query(User).filter(User.id == user_id).first()
                if user and user.seller_profile and listing.seller_id == user.seller_profile.id:
                    # Return current count without incrementing for seller's own views
                    return {
                        "view_id": None,
                        "listing_id": listing_id,
                        "total_views": listing.view_count or 0,
                        "message": "Seller view not tracked"
                    }

            # Get buyer_id if user is a buyer
            buyer_id = None
            if user_id:
                user = self.db.query(User).filter(User.id == user_id).first()
                if user and user.buyer_profile:
                    buyer_id = user.buyer_profile.id

            # Check for duplicate views within the same day (24 hours)
            from datetime import datetime, timedelta
            from ..models.analytics_models import ListingView
            
            # Get start of current day (midnight)
            today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Check for existing view from same user or IP today
            today_view_query = self.db.query(ListingView).filter(
                ListingView.listing_id == listing_id,
                ListingView.viewed_at >= today_start
            )
            
            if user_id:
                # For authenticated users, check by buyer_id
                today_view_query = today_view_query.filter(ListingView.buyer_id == buyer_id)
            elif ip_address:
                # For anonymous users, check by IP address
                today_view_query = today_view_query.filter(ListingView.ip_address == ip_address)
            
            existing_view_today = today_view_query.first()
            
            if existing_view_today:
                # Return existing count without incrementing
                logger.info(f"View already tracked today for listing {listing_id}, user {user_id or 'anonymous'}")
                return {
                    "view_id": existing_view_today.id,
                    "listing_id": listing_id,
                    "total_views": listing.view_count or 0,
                    "message": "View already tracked today"
                }

            # Create view record
            view_record = ListingView(
                listing_id=listing_id,
                buyer_id=buyer_id,
                ip_address=ip_address,
                user_agent=user_agent,
                session_id=session_id
            )
            
            self.db.add(view_record)
            
            # Update listing view count
            listing.view_count = (listing.view_count or 0) + 1
            
            self.db.commit()
            
            logger.info(f"New view tracked for listing {listing_id}, user {user_id or 'anonymous'}, total views: {listing.view_count}")
            
            return {
                "view_id": view_record.id,
                "listing_id": listing_id,
                "total_views": listing.view_count
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error tracking listing view: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to track listing view"
            )

    async def get_listing_analytics(self, listing_id: UUID, seller_user_id: UUID) -> Dict[str, Any]:
        """Get comprehensive analytics for a listing (seller only)"""
        try:
            # Verify seller owns the listing
            listing = self.db.query(Listing).filter(Listing.id == listing_id).first()
            if not listing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Listing not found"
                )
            
            seller = self.db.query(Seller).filter(Seller.user_id == seller_user_id).first()
            if not seller or listing.seller_id != seller.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied - not listing owner"
                )
            
            # Get view analytics
            total_views = self.db.query(ListingView).filter(
                ListingView.listing_id == listing_id
            ).count()
            
            unique_views = self.db.query(ListingView).filter(
                ListingView.listing_id == listing_id
            ).distinct(ListingView.ip_address).count()
            
            # Views in last 7 days
            week_ago = datetime.utcnow() - timedelta(days=7)
            views_this_week = self.db.query(ListingView).filter(
                and_(
                    ListingView.listing_id == listing_id,
                    ListingView.viewed_at >= week_ago
                )
            ).count()
            
            # Views in last 30 days
            month_ago = datetime.utcnow() - timedelta(days=30)
            views_this_month = self.db.query(ListingView).filter(
                and_(
                    ListingView.listing_id == listing_id,
                    ListingView.viewed_at >= month_ago
                )
            ).count()
            
            # Connection analytics
            connections = self.db.query(Connection).filter(
                Connection.listing_id == listing_id
            ).all()
            
            connection_requests = len(connections)
            approved_connections = len([c for c in connections if c.status == 'approved'])
            pending_connections = len([c for c in connections if c.status == 'pending'])
            
            # Get viewer details (last 50 viewers - both authenticated and anonymous)
            recent_viewers = self.db.query(ListingView).filter(
                ListingView.listing_id == listing_id
            ).order_by(desc(ListingView.viewed_at)).limit(50).all()
            
            viewer_details = []
            for view in recent_viewers:
                if view.buyer:
                    # Authenticated buyer
                    viewer_details.append({
                        "buyer_id": view.buyer.id,
                        "buyer_name": f"{view.buyer.user.first_name} {view.buyer.user.last_name}",
                        "buyer_email": view.buyer.user.email,
                        "verification_status": view.buyer.verification_status,
                        "viewed_at": view.viewed_at,
                        "location": f"{view.city}, {view.region}" if view.city and view.region else None,
                        "viewer_type": "authenticated"
                    })
                else:
                    # Anonymous viewer
                    viewer_details.append({
                        "buyer_id": None,
                        "buyer_name": "Anonymous Visitor",
                        "buyer_email": None,
                        "verification_status": None,
                        "viewed_at": view.viewed_at,
                        "location": f"{view.city}, {view.region}" if view.city and view.region else None,
                        "viewer_type": "anonymous",
                        "ip_address": view.ip_address[:8] + "..." if view.ip_address else None  # Partial IP for privacy
                    })
            
            return {
                "listing_id": listing_id,
                "analytics": {
                    "total_views": total_views,
                    "unique_views": unique_views,
                    "views_this_week": views_this_week,
                    "views_this_month": views_this_month,
                    "connection_requests": connection_requests,
                    "approved_connections": approved_connections,
                    "pending_connections": pending_connections,
                    "conversion_rate": round((connection_requests / total_views * 100), 2) if total_views > 0 else 0
                },
                "viewers": viewer_details,
                "connections": [
                    {
                        "id": conn.id,
                        "buyer_name": f"{conn.buyer.user.first_name} {conn.buyer.user.last_name}",
                        "buyer_email": conn.buyer.user.email,
                        "status": conn.status,
                        "initial_message": conn.initial_message,
                        "requested_at": conn.requested_at,
                        "responded_at": conn.responded_at
                    } for conn in connections
                ]
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting listing analytics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve listing analytics"
            )

    async def get_listing_performance(self, listing_id: UUID, seller_user_id: UUID) -> Dict[str, Any]:
        """Get performance analytics for a specific listing"""
        try:
            # Verify listing ownership
            listing = self.db.query(Listing).filter(
                and_(
                    Listing.id == listing_id,
                    Listing.seller.has(Seller.user_id == seller_user_id)
                )
            ).first()
            
            if not listing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Listing not found or access denied"
                )

            # Get view count
            view_count = listing.view_count or 0
            
            # Get connection count (inquiries)
            connection_count = self.db.query(Connection).filter(
                Connection.listing_id == listing_id
            ).count()
            
            # Get saved count (favorites)
            saved_count = self.db.query(SavedListing).filter(
                SavedListing.listing_id == listing_id
            ).count()
            
            # Get recent views (last 30 days)
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            recent_views = self.db.query(ListingView).filter(
                and_(
                    ListingView.listing_id == listing_id,
                    ListingView.viewed_at >= thirty_days_ago
                )
            ).count()
            
            # Get view trend (daily views for last 7 days)
            daily_views = []
            for i in range(7):
                day_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=i)
                day_end = day_start + timedelta(days=1)
                
                day_views = self.db.query(ListingView).filter(
                    and_(
                        ListingView.listing_id == listing_id,
                        ListingView.viewed_at >= day_start,
                        ListingView.viewed_at < day_end
                    )
                ).count()
                
                daily_views.append({
                    "date": day_start.strftime("%Y-%m-%d"),
                    "views": day_views
                })
            
            # Get last viewed timestamp
            last_view = self.db.query(ListingView).filter(
                ListingView.listing_id == listing_id
            ).order_by(desc(ListingView.viewed_at)).first()
            
            return {
                "listing_id": listing_id,
                "total_views": view_count,
                "total_inquiries": connection_count,
                "total_saved": saved_count,
                "recent_views_30d": recent_views,
                "daily_views": daily_views,
                "last_viewed": last_view.viewed_at if last_view else None,
                "performance_score": self._calculate_performance_score(view_count, connection_count, saved_count)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting listing analytics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve listing analytics"
            )

    async def get_seller_analytics(self, seller_user_id: UUID) -> Dict[str, Any]:
        """Get overall analytics for a seller"""
        try:
            # Get seller
            user = self.db.query(User).filter(User.id == seller_user_id).first()
            if not user or not user.seller_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller not found"
                )
            
            seller = user.seller_profile
            
            # Get all seller's listings
            listings = self.db.query(Listing).filter(Listing.seller_id == seller.id).all()
            listing_ids = [listing.id for listing in listings]
            
            if not listing_ids:
                return {
                    "total_listings": 0,
                    "total_views": 0,
                    "total_inquiries": 0,
                    "total_saved": 0,
                    "active_listings": 0,
                    "average_views_per_listing": 0,
                    "conversion_rate": 0
                }
            
            # Calculate totals
            total_views = sum(listing.view_count or 0 for listing in listings)
            
            total_inquiries = self.db.query(Connection).filter(
                Connection.listing_id.in_(listing_ids)
            ).count()
            
            total_saved = self.db.query(SavedListing).filter(
                SavedListing.listing_id.in_(listing_ids)
            ).count()
            
            active_listings = len([l for l in listings if l.status == ListingStatus.PUBLISHED])
            
            # Calculate metrics
            average_views = total_views / len(listings) if listings else 0
            conversion_rate = (total_inquiries / total_views * 100) if total_views > 0 else 0
            
            return {
                "total_listings": len(listings),
                "total_views": total_views,
                "total_inquiries": total_inquiries,
                "total_saved": total_saved,
                "active_listings": active_listings,
                "average_views_per_listing": round(average_views, 1),
                "conversion_rate": round(conversion_rate, 2)
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting seller analytics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve seller analytics"
            )

    async def get_buyer_analytics(self, buyer_user_id: UUID) -> Dict[str, Any]:
        """Get overall analytics for a buyer"""
        try:
            # Get buyer
            user = self.db.query(User).filter(User.id == buyer_user_id).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )
            
            # Get or create buyer profile if it doesn't exist
            buyer = user.buyer_profile
            if not buyer:
                # Create buyer profile if it doesn't exist
                from ..models.user_models import Buyer
                buyer = Buyer(user_id=user.id)
                self.db.add(buyer)
                self.db.commit()
                self.db.refresh(buyer)
            
            # Get saved listings count (with error handling)
            try:
                saved_listings = self.db.query(SavedListing).filter(
                    SavedListing.buyer_id == buyer.id
                ).count()
            except Exception as e:
                logger.warning(f"Error getting saved listings count: {e}")
                saved_listings = 0
            
            # Get connections count (with error handling)
            try:
                total_connections = self.db.query(Connection).filter(
                    Connection.buyer_id == buyer.id
                ).count()
                
                active_connections = self.db.query(Connection).filter(
                    and_(
                        Connection.buyer_id == buyer.id,
                        Connection.status == 'approved'
                    )
                ).count()
            except Exception as e:
                logger.warning(f"Error getting connections count: {e}")
                total_connections = 0
                active_connections = 0
            
            # Get search activity (from listing views) (with error handling)
            try:
                total_searches = self.db.query(ListingView).filter(
                    ListingView.buyer_id == buyer.id
                ).count()
                
                # Calculate recent activity (views in last 30 days)
                thirty_days_ago = datetime.utcnow() - timedelta(days=30)
                recent_activity = self.db.query(ListingView).filter(
                    and_(
                        ListingView.buyer_id == buyer.id,
                        ListingView.viewed_at >= thirty_days_ago
                    )
                ).count()
            except Exception as e:
                logger.warning(f"Error getting search activity: {e}")
                total_searches = 0
                recent_activity = 0
            
            # Get message counts and response time analytics
            try:
                from ..models.connection_models import Message
                
                # Get total messages sent by this buyer
                total_messages_sent = self.db.query(Message).join(Connection).filter(
                    and_(
                        Connection.buyer_id == buyer.id,
                        Message.sender_id == user.id
                    )
                ).count()
                
                # Get total messages received by this buyer
                total_messages_received = self.db.query(Message).join(Connection).filter(
                    and_(
                        Connection.buyer_id == buyer.id,
                        Message.sender_id != user.id
                    )
                ).count()
                
                total_messages = total_messages_sent + total_messages_received
                
                # Get unread messages count
                unread_messages = self.db.query(Message).join(Connection).filter(
                    and_(
                        Connection.buyer_id == buyer.id,
                        Message.sender_id != user.id,  # Messages from others
                        Message.is_read == False
                    )
                ).count()
                
                # Calculate average response time (in hours)
                avg_response_time = await self._calculate_buyer_response_time(buyer.id, user.id)
                
            except Exception as e:
                logger.warning(f"Error getting message analytics: {e}")
                total_messages = 0
                total_messages_sent = 0
                total_messages_received = 0
                unread_messages = 0
                avg_response_time = 0
            
            # Get message counts per connection
            try:
                connection_message_counts = await self._get_connection_message_counts(buyer.id)
            except Exception as e:
                logger.warning(f"Error getting connection message counts: {e}")
                connection_message_counts = {}
            
            return {
                "total_searches": total_searches,
                "listings_viewed": total_searches,  # Alias for consistency
                "saved_listings": saved_listings,
                "total_connections": total_connections,
                "active_connections": active_connections,
                "total_messages": total_messages,
                "messages_sent": total_messages_sent,
                "messages_received": total_messages_received,
                "unread_messages": unread_messages,
                "recent_activity": recent_activity,
                "avg_response_time": avg_response_time,
                "connection_message_counts": connection_message_counts
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting buyer analytics: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve buyer analytics"
            )

    async def save_listing(self, listing_id: UUID, buyer_user_id: UUID) -> Dict[str, Any]:
        """Save/favorite a listing"""
        try:
            # Get buyer
            user = self.db.query(User).filter(User.id == buyer_user_id).first()
            if not user or not user.buyer_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer not found"
                )
            
            buyer = user.buyer_profile
            
            # Check if listing exists
            listing = self.db.query(Listing).filter(Listing.id == listing_id).first()
            if not listing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Listing not found"
                )
            
            # Check if already saved
            existing = self.db.query(SavedListing).filter(
                and_(
                    SavedListing.buyer_id == buyer.id,
                    SavedListing.listing_id == listing_id
                )
            ).first()
            
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Listing already saved"
                )
            
            # Create saved listing
            saved_listing = SavedListing(
                buyer_id=buyer.id,
                listing_id=listing_id
            )
            
            self.db.add(saved_listing)
            self.db.commit()
            
            return {
                "saved_id": saved_listing.id,
                "listing_id": listing_id,
                "saved_at": saved_listing.created_at
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving listing: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save listing"
            )

    async def unsave_listing(self, listing_id: UUID, buyer_user_id: UUID) -> Dict[str, Any]:
        """Remove a listing from saved/favorites"""
        try:
            # Get buyer
            user = self.db.query(User).filter(User.id == buyer_user_id).first()
            if not user or not user.buyer_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer not found"
                )
            
            buyer = user.buyer_profile
            
            # Find saved listing
            saved_listing = self.db.query(SavedListing).filter(
                and_(
                    SavedListing.buyer_id == buyer.id,
                    SavedListing.listing_id == listing_id
                )
            ).first()
            
            if not saved_listing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Saved listing not found"
                )
            
            self.db.delete(saved_listing)
            self.db.commit()
            
            return {
                "listing_id": listing_id,
                "message": "Listing removed from saved"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error unsaving listing: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to unsave listing"
            )
    
    async def _calculate_buyer_response_time(self, buyer_id: UUID, user_id: UUID) -> float:
        """Calculate average response time for a buyer in hours"""
        try:
            from ..models.connection_models import Message
            
            # Get all conversations where buyer participated
            conversations = self.db.query(Connection).filter(
                Connection.buyer_id == buyer_id
            ).all()
            
            total_response_time = 0
            response_count = 0
            
            for connection in conversations:
                # Get messages in chronological order
                messages = self.db.query(Message).filter(
                    Message.connection_id == connection.id
                ).order_by(Message.created_at).all()
                
                # Calculate response times between messages
                for i in range(1, len(messages)):
                    prev_msg = messages[i-1]
                    curr_msg = messages[i]
                    
                    # If current message is from buyer and previous is not
                    if (curr_msg.sender_id == user_id and 
                        prev_msg.sender_id != user_id):
                        
                        time_diff = curr_msg.created_at - prev_msg.created_at
                        response_time_hours = time_diff.total_seconds() / 3600
                        
                        # Only count reasonable response times (less than 7 days)
                        if response_time_hours < 168:  # 7 days
                            total_response_time += response_time_hours
                            response_count += 1
            
            return round(total_response_time / response_count, 1) if response_count > 0 else 0
            
        except Exception as e:
            logger.warning(f"Error calculating response time: {e}")
            return 0
    
    async def _get_connection_message_counts(self, buyer_id: UUID) -> Dict[str, int]:
        """Get message counts per connection for a buyer"""
        try:
            from ..models.connection_models import Message
            
            # Get all connections for the buyer
            connections = self.db.query(Connection).filter(
                Connection.buyer_id == buyer_id
            ).all()
            
            connection_counts = {}
            
            for connection in connections:
                message_count = self.db.query(Message).filter(
                    Message.connection_id == connection.id
                ).count()
                
                connection_counts[str(connection.id)] = message_count
            
            return connection_counts
            
        except Exception as e:
            logger.warning(f"Error getting connection message counts: {e}")
            return {}

    def _calculate_performance_score(self, views: int, inquiries: int, saved: int) -> float:
        """Calculate a performance score for a listing"""
        # Simple scoring algorithm - can be made more sophisticated
        score = 0
        
        # Views contribute to score
        score += min(views * 0.1, 10)  # Max 10 points from views
        
        # Inquiries are more valuable
        score += inquiries * 2  # 2 points per inquiry
        
        # Saved listings are also valuable
        score += saved * 1.5  # 1.5 points per save
        
        return round(min(score, 100), 1)  # Cap at 100