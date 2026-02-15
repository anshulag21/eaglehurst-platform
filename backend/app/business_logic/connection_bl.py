"""
Connection management business logic
"""

from typing import Any, Dict, List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, func

from ..models.user_models import User, Buyer, Seller
from ..models.listing_models import Listing
from ..models.connection_models import Connection, Message, MessageRead
from ..models.subscription_models import UserSubscription, Subscription
from ..models.blocking_models import UserBlock
from ..schemas.connection_schemas import ConnectionCreate, ConnectionUpdate, MessageCreate
from ..core.constants import (
    UserType, ConnectionStatus, ListingStatus, SubscriptionStatus, MessageType
)
import logging

logger = logging.getLogger(__name__)


class ConnectionBusinessLogic:
    def __init__(self, db: Session):
        self.db = db

    async def create_connection_request(
        self, buyer_user: User, connection_data: ConnectionCreate
    ) -> Dict[str, Any]:
        """Create a new connection request from buyer to seller"""
        try:
            # Get buyer profile - query directly instead of using relationship
            buyer_profile = self.db.query(Buyer).filter(
                Buyer.user_id == buyer_user.id
            ).first()
            
            if not buyer_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer profile not found"
                )

            # Check if buyer has active subscription
            if not buyer_profile.subscription_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Active subscription required to send connection requests"
                )

            # Get subscription details
            subscription = self.db.query(UserSubscription).filter(
                UserSubscription.id == buyer_profile.subscription_id
            ).first()

            if not subscription or not subscription.is_effectively_active():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Active subscription required to send connection requests"
                )

            # Check connection limits (skip check for unlimited plans where limit = -1)
            connection_limit = subscription.subscription.connection_limit_monthly
            if connection_limit != -1 and subscription.connections_used_current_month >= connection_limit:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Connection limit reached for current subscription"
                )

            # Get listing and validate
            listing = self.db.query(Listing).filter(
                Listing.id == connection_data.listing_id
            ).first()

            if not listing:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Listing not found"
                )

            if listing.status != ListingStatus.PUBLISHED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Can only connect to published listings"
                )

            # Get seller profile to check for blocking
            seller_profile = self.db.query(Seller).filter(
                Seller.id == listing.seller_id
            ).first()

            if not seller_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller not found"
                )

            # Check if either user has blocked the other (silent blocking)
            blocking_exists = self.db.query(UserBlock).filter(
                and_(
                    or_(
                        and_(UserBlock.blocker_id == buyer_user.id, UserBlock.blocked_id == seller_profile.user_id),
                        and_(UserBlock.blocker_id == seller_profile.user_id, UserBlock.blocked_id == buyer_user.id)
                    ),
                    UserBlock.is_active == True
                )
            ).first()

            if blocking_exists:
                # Don't reveal that blocking exists - just say listing is unavailable
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="This listing is currently unavailable for connections"
                )

            # Check if connection already exists
            existing_connection = self.db.query(Connection).filter(
                and_(
                    Connection.buyer_id == buyer_profile.id,
                    Connection.listing_id == connection_data.listing_id
                )
            ).first()

            if existing_connection:
                if existing_connection.status == ConnectionStatus.PENDING:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Connection request is already pending"
                    )
                elif existing_connection.status == ConnectionStatus.APPROVED:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Already connected to this listing"
                    )
                elif existing_connection.status == ConnectionStatus.REJECTED:
                    # Allow re-connection attempt by updating the existing connection
                    # This will consume another connection from their subscription
                    existing_connection.status = ConnectionStatus.PENDING
                    existing_connection.initial_message = connection_data.initial_message
                    existing_connection.requested_at = func.now()
                    existing_connection.responded_at = None
                    existing_connection.response_message = None
                    existing_connection.seller_initiated = False
                    
                    # Increment connection usage
                    subscription.connections_used_current_month += 1
                    
                    self.db.commit()
                    self.db.refresh(existing_connection)
                    
                    # Send notification to seller
                    try:
                        notification_bl = NotificationBusinessLogic(self.db)
                        await notification_bl.create_connection_request_notification(
                            existing_connection.id, listing.seller.user_id
                        )
                    except Exception as e:
                        logger.warning(f"Failed to send connection notification: {e}")
                    
                    return {
                        "connection_id": existing_connection.id,
                        "status": existing_connection.status,
                        "message": "Connection request sent successfully"
                    }

            # Create connection
            connection = Connection(
                buyer_id=buyer_profile.id,
                seller_id=listing.seller_id,
                listing_id=connection_data.listing_id,
                status=ConnectionStatus.PENDING,
                initial_message=connection_data.initial_message
            )

            self.db.add(connection)
            self.db.flush()

            # Update subscription usage
            subscription.connections_used_current_month += 1
            
            # Update listing connection count
            listing.connection_count = (listing.connection_count or 0) + 1

            self.db.commit()
            self.db.refresh(connection)

            return {
                "id": connection.id,
                "listing_id": connection.listing_id,
                "status": connection.status,
                "initial_message": connection.initial_message,
                "requested_at": connection.requested_at,
                "connections_remaining": -1 if subscription.subscription.connection_limit_monthly == -1 else (subscription.subscription.connection_limit_monthly - subscription.connections_used_current_month)
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating connection request: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create connection request"
            )

    async def get_user_connections(
        self, user: User, page: int, limit: int, status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get user's connections (both sent and received)"""
        try:
            offset = (page - 1) * limit
            
            if user.user_type == UserType.BUYER:
                buyer_profile = user.buyer_profile
                query = self.db.query(Connection).filter(
                    Connection.buyer_id == buyer_profile.id
                )
            elif user.user_type == UserType.SELLER:
                seller_profile = user.seller_profile
                query = self.db.query(Connection).filter(
                    Connection.seller_id == seller_profile.id
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid user type for connections"
                )

            # Apply status filter
            if status_filter:
                query = query.filter(Connection.status == status_filter)

            # Get total count
            total = query.count()

            # Get paginated results
            connections = query.order_by(desc(Connection.requested_at)).offset(offset).limit(limit).all()

            # Format response
            connection_list = []
            for conn in connections:
                connection_data = {
                    "id": conn.id,
                    "listing_id": conn.listing_id,
                    "status": conn.status,
                    "initial_message": conn.initial_message,
                    "response_message": conn.response_message,
                    "requested_at": conn.requested_at,
                    "responded_at": conn.responded_at,
                    "last_activity": conn.last_activity,
                    "seller_initiated": getattr(conn, 'seller_initiated', False)
                }

                # Add listing info (or placeholder for seller-initiated connections)
                if conn.listing:
                    connection_data["listing"] = {
                        "id": conn.listing.id,
                        "title": conn.listing.title,
                        "business_type": conn.listing.business_type,
                        "location": conn.listing.location,
                        "asking_price": conn.listing.asking_price
                    }
                else:
                    # For seller-initiated connections without a specific listing
                    connection_data["listing"] = {
                        "id": "",
                        "title": "Direct Connection",
                        "business_type": "",
                        "location": "",
                        "asking_price": None
                    }

                # Add other_party info (standardized format for frontend)
                if user.user_type == UserType.BUYER and conn.seller:
                    connection_data["other_party"] = {
                        "id": conn.seller.id,
                        "name": conn.seller.business_name or f"{conn.seller.user.first_name} {conn.seller.user.last_name}",
                        "user_type": "seller",
                        "email": conn.seller.user.email
                    }
                    # Keep backward compatibility
                    connection_data["seller"] = {
                        "id": conn.seller.id,
                        "business_name": conn.seller.business_name,
                        "verification_status": conn.seller.verification_status
                    }
                elif user.user_type == UserType.SELLER and conn.buyer:
                    connection_data["other_party"] = {
                        "id": conn.buyer.id,
                        "name": f"{conn.buyer.user.first_name} {conn.buyer.user.last_name}",
                        "user_type": "buyer",
                        "email": conn.buyer.user.email
                    }
                    # Keep backward compatibility
                    connection_data["buyer"] = {
                        "id": conn.buyer.id,
                        "user_name": f"{conn.buyer.user.first_name} {conn.buyer.user.last_name}",
                        "verification_status": conn.buyer.verification_status
                    }

                connection_list.append(connection_data)

            return {
                "connections": connection_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting user connections: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve connections"
            )

    async def get_connection_detail(self, user: User, connection_id: UUID) -> Dict[str, Any]:
        """Get detailed connection information with message history"""
        try:
            # Get connection and validate access
            connection = self.db.query(Connection).filter(
                Connection.id == connection_id
            ).first()

            if not connection:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Connection not found"
                )

            # Check if user has access to this connection
            user_profile = user.buyer_profile if user.user_type == UserType.BUYER else user.seller_profile
            if not user_profile:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )

            if (user.user_type == UserType.BUYER and connection.buyer_id != user_profile.id) or \
               (user.user_type == UserType.SELLER and connection.seller_id != user_profile.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this connection"
                )

            # Get recent messages (last 20)
            messages = self.db.query(Message).filter(
                Message.connection_id == connection_id
            ).order_by(desc(Message.created_at)).limit(20).all()

            # Get other party information
            other_party_info = None
            if user.user_type == UserType.BUYER and connection.seller:
                other_party_info = {
                    "id": connection.seller.id,
                    "name": connection.seller.business_name or f"{connection.seller.user.first_name} {connection.seller.user.last_name}",
                    "user_type": "seller",
                    "email": connection.seller.user.email
                }
            elif user.user_type == UserType.SELLER and connection.buyer:
                other_party_info = {
                    "id": connection.buyer.id,
                    "name": f"{connection.buyer.user.first_name} {connection.buyer.user.last_name}",
                    "user_type": "buyer",
                    "email": connection.buyer.user.email
                }

            # Format connection data
            connection_data = {
                "id": connection.id,
                "listing_id": connection.listing_id,
                "status": connection.status,
                "initial_message": connection.initial_message,
                "response_message": connection.response_message,
                "requested_at": connection.requested_at,
                "responded_at": connection.responded_at,
                "last_activity": connection.last_activity,
                "seller_initiated": connection.seller_initiated,
                "other_party": other_party_info,
                "listing": {
                    "id": connection.listing.id,
                    "title": connection.listing.title,
                    "business_type": connection.listing.business_type,
                    "location": connection.listing.location,
                    "asking_price": connection.listing.asking_price
                } if connection.listing else None,
                "recent_messages": [
                    {
                        "id": msg.id,
                        "sender_id": msg.sender_id,
                        "content": msg.content,
                        "message_type": msg.message_type,
                        "is_read": msg.is_read,
                        "created_at": msg.created_at
                    }
                    for msg in reversed(messages)
                ]
            }

            return connection_data

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting connection detail: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve connection details"
            )

    async def respond_to_connection(
        self, seller_user: User, connection_id: UUID, response_data: ConnectionUpdate
    ) -> Dict[str, Any]:
        """Respond to a connection request (seller only)"""
        try:
            seller_profile = seller_user.seller_profile
            if not seller_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller profile not found"
                )

            # Get connection
            connection = self.db.query(Connection).filter(
                and_(
                    Connection.id == connection_id,
                    Connection.seller_id == seller_profile.id
                )
            ).first()

            if not connection:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Connection not found"
                )

            if connection.status != ConnectionStatus.PENDING:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Connection has already been responded to"
                )

            # Update connection
            connection.status = response_data.status
            connection.response_message = response_data.response_message
            connection.responded_at = func.now()
            connection.last_activity = func.now()

            self.db.commit()
            self.db.refresh(connection)

            return {
                "id": connection.id,
                "status": connection.status,
                "response_message": connection.response_message,
                "responded_at": connection.responded_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error responding to connection: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to respond to connection"
            )

    async def send_message(
        self, user: User, connection_id: UUID, message_data: MessageCreate
    ) -> Dict[str, Any]:
        """Send a message in a connection"""
        try:
            # Get connection and validate access
            connection = self.db.query(Connection).filter(
                Connection.id == connection_id
            ).first()

            if not connection:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Connection not found"
                )

            # Check if connection is approved
            if connection.status != ConnectionStatus.APPROVED:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Can only send messages in approved connections"
                )

            # Validate user access
            user_profile = user.buyer_profile if user.user_type == UserType.BUYER else user.seller_profile
            
            if not user_profile:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )

            if (user.user_type == UserType.BUYER and connection.buyer_id != user_profile.id) or \
               (user.user_type == UserType.SELLER and connection.seller_id != user_profile.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this connection"
                )

            # Get the other user's ID for blocking check
            if user.user_type == UserType.BUYER:
                other_user_id = connection.seller.user_id
            else:
                other_user_id = connection.buyer.user_id

            # Check if either user has blocked the other (silent blocking)
            blocking_exists = self.db.query(UserBlock).filter(
                and_(
                    or_(
                        and_(UserBlock.blocker_id == user.id, UserBlock.blocked_id == other_user_id),
                        and_(UserBlock.blocker_id == other_user_id, UserBlock.blocked_id == user.id)
                    ),
                    UserBlock.is_active == True
                )
            ).first()

            if blocking_exists:
                # Don't reveal that blocking exists - just say message failed to send
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Unable to send message at this time"
                )

            # Create message
            message = Message(
                connection_id=connection_id,
                sender_id=user.id,
                content=message_data.content,
                message_type=message_data.message_type or MessageType.TEXT
            )

            self.db.add(message)
            
            # Update connection last activity
            connection.last_activity = func.now()
            
            self.db.commit()
            self.db.refresh(message)

            return {
                "id": message.id,
                "connection_id": message.connection_id,
                "sender_id": message.sender_id,
                "content": message.content,
                "message_type": message.message_type,
                "created_at": message.created_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send message"
            )

    async def get_connection_messages(
        self, user: User, connection_id: UUID, page: int, limit: int
    ) -> Dict[str, Any]:
        """Get messages for a connection"""
        try:
            # Validate connection access (same as in get_connection_detail)
            connection = self.db.query(Connection).filter(
                Connection.id == connection_id
            ).first()

            if not connection:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Connection not found"
                )

            user_profile = user.buyer_profile if user.user_type == UserType.BUYER else user.seller_profile
            if not user_profile:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )

            if (user.user_type == UserType.BUYER and connection.buyer_id != user_profile.id) or \
               (user.user_type == UserType.SELLER and connection.seller_id != user_profile.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this connection"
                )

            # Get messages
            offset = (page - 1) * limit
            
            query = self.db.query(Message).filter(
                Message.connection_id == connection_id
            )
            
            total = query.count()
            messages = query.order_by(Message.created_at).offset(offset).limit(limit).all()

            message_list = []
            for msg in messages:
                # Get sender information
                sender_name = "Unknown"
                sender_type = "unknown"
                
                if msg.sender_id == user.id:
                    sender_name = "You"
                    sender_type = user.user_type
                else:
                    # Get the other party's name
                    if user.user_type == UserType.BUYER and connection.seller and connection.seller.user.id == msg.sender_id:
                        sender_name = connection.seller.business_name or f"{connection.seller.user.first_name} {connection.seller.user.last_name}"
                        sender_type = "seller"
                    elif user.user_type == UserType.SELLER and connection.buyer and connection.buyer.user.id == msg.sender_id:
                        sender_name = f"{connection.buyer.user.first_name} {connection.buyer.user.last_name}"
                        sender_type = "buyer"
                
                message_list.append({
                    "id": msg.id,
                    "sender_id": msg.sender_id,
                    "content": msg.content,
                    "message_type": msg.message_type,
                    "is_read": msg.is_read,
                    "created_at": msg.created_at,
                    "sender_name": sender_name,
                    "sender_type": sender_type
                })

            return {
                "messages": message_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                }
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting connection messages: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve messages"
            )

    async def mark_message_as_read(
        self, user: User, connection_id: UUID, message_id: UUID
    ) -> Dict[str, Any]:
        """Mark a message as read"""
        try:
            # Get message and validate
            message = self.db.query(Message).filter(
                and_(
                    Message.id == message_id,
                    Message.connection_id == connection_id
                )
            ).first()

            if not message:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Message not found"
                )

            # Mark as read
            message.is_read = True
            message.read_at = func.now()

            # Create read record
            message_read = MessageRead(
                message_id=message_id,
                user_id=user.id
            )
            
            self.db.add(message_read)
            self.db.commit()

            return {
                "message_id": message_id,
                "read_at": message.read_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error marking message as read: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to mark message as read"
            )

    async def block_connection(self, user: User, connection_id: UUID) -> Dict[str, Any]:
        """Block a connection"""
        try:
            # Get connection and validate access
            connection = self.db.query(Connection).filter(
                Connection.id == connection_id
            ).first()

            if not connection:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Connection not found"
                )

            # Validate user access
            user_profile = user.buyer_profile if user.user_type == UserType.BUYER else user.seller_profile
            if not user_profile:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied"
                )

            if (user.user_type == UserType.BUYER and connection.buyer_id != user_profile.id) or \
               (user.user_type == UserType.SELLER and connection.seller_id != user_profile.id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this connection"
                )

            # Block connection
            connection.status = ConnectionStatus.BLOCKED
            connection.last_activity = func.now()

            self.db.commit()

            return {
                "connection_id": connection_id,
                "status": connection.status,
                "blocked_at": connection.last_activity
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error blocking connection: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to block connection"
            )

    async def get_buyer_requests(self, buyer_user: User, page: int, limit: int) -> Dict[str, Any]:
        """Get buyer's sent connection requests"""
        buyer_profile = buyer_user.buyer_profile
        if not buyer_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Buyer profile not found"
            )

        return await self.get_user_connections(buyer_user, page, limit)

    async def get_seller_requests(
        self, seller_user: User, page: int, limit: int, status_filter: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get seller's received connection requests"""
        seller_profile = seller_user.seller_profile
        if not seller_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Seller profile not found"
            )

        return await self.get_user_connections(seller_user, page, limit, status_filter)

    def get_connection_status_for_listing(
        self, buyer_user: User, listing_id: UUID
    ) -> Dict[str, Any]:
        """Get connection status between buyer and listing"""
        try:
            # Get buyer profile
            buyer_profile = self.db.query(Buyer).filter(
                Buyer.user_id == buyer_user.id
            ).first()
            
            if not buyer_profile:
                return {
                    "has_connection": False,
                    "status": None,
                    "connection_id": None,
                    "can_connect": False,
                    "reason": "Buyer profile not found"
                }

            # Check if connection exists
            connection = self.db.query(Connection).filter(
                and_(
                    Connection.buyer_id == buyer_profile.id,
                    Connection.listing_id == listing_id
                )
            ).first()

            if not connection:
                # Check if buyer can connect (has active subscription)
                can_connect = False
                reason = "No active subscription"
                
                if buyer_profile.subscription_id:
                    # Join with subscription to get connection limit
                    subscription_query = self.db.query(UserSubscription, Subscription).join(
                        Subscription, UserSubscription.subscription_id == Subscription.id
                    ).filter(UserSubscription.id == buyer_profile.subscription_id).first()
                    
                    if subscription_query:
                        user_subscription, subscription_plan = subscription_query
                        if user_subscription.is_effectively_active():
                            # Check if unlimited (-1) or has remaining connections
                            if subscription_plan.connection_limit_monthly == -1 or user_subscription.connections_used_current_month < subscription_plan.connection_limit_monthly:
                                can_connect = True
                                reason = None
                            else:
                                reason = "Connection limit reached"

                return {
                    "has_connection": False,
                    "status": None,
                    "connection_id": None,
                    "can_connect": can_connect,
                    "reason": reason
                }

            # Connection exists - check status to determine if can reconnect
            can_connect = False
            reason = None
            
            if connection.status == ConnectionStatus.REJECTED:
                # If rejected, check if buyer can send another connection request
                if buyer_profile.subscription_id:
                    # Join with subscription to get connection limit
                    subscription_query = self.db.query(UserSubscription, Subscription).join(
                        Subscription, UserSubscription.subscription_id == Subscription.id
                    ).filter(UserSubscription.id == buyer_profile.subscription_id).first()
                    
                    if subscription_query:
                        user_subscription, subscription_plan = subscription_query
                        if user_subscription.is_effectively_active():
                            # Check if unlimited (-1) or has remaining connections
                            if subscription_plan.connection_limit_monthly == -1 or user_subscription.connections_used_current_month < subscription_plan.connection_limit_monthly:
                                can_connect = True
                                reason = None
                            else:
                                reason = "Connection limit reached"
                        else:
                            reason = "No active subscription"
                    else:
                        reason = "No active subscription"
                else:
                    reason = "No active subscription"
            elif connection.status == ConnectionStatus.PENDING:
                reason = "Connection request pending"
            elif connection.status == ConnectionStatus.APPROVED:
                reason = "Already connected"
            
            return {
                "has_connection": True,
                "status": connection.status,
                "connection_id": connection.id,
                "can_connect": can_connect,
                "reason": reason,
                "requested_at": connection.requested_at,
                "responded_at": connection.responded_at,
                "initial_message": connection.initial_message,
                "response_message": connection.response_message
            }

        except Exception as e:
            logger.error(f"Error getting connection status: {e}", exc_info=True)
            return {
                "has_connection": False,
                "status": None,
                "connection_id": None,
                "can_connect": False,
                "reason": "Error checking connection status"
            }

    def send_seller_to_buyer_connection(
        self, seller_user: User, buyer_id: UUID, message: str
    ) -> Dict[str, Any]:
        """Allow seller to send connection request to buyer"""
        try:
            # Get seller profile
            seller_profile = self.db.query(Seller).filter(
                Seller.user_id == seller_user.id
            ).first()
            
            if not seller_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Seller profile not found"
                )

            # Get buyer profile
            buyer_profile = self.db.query(Buyer).filter(
                Buyer.id == buyer_id
            ).first()
            
            if not buyer_profile:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Buyer not found"
                )

            # Check if buyer has active subscription
            if not buyer_profile.subscription_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Buyer does not have an active subscription"
                )

            subscription = self.db.query(UserSubscription).filter(
                UserSubscription.id == buyer_profile.subscription_id
            ).first()

            if not subscription or not subscription.is_effectively_active():
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Buyer does not have an active subscription"
                )

            # Check if buyer has available connections (skip check for unlimited plans where limit = -1)
            connection_limit = subscription.subscription.connection_limit_monthly
            if connection_limit != -1 and subscription.connections_used_current_month >= connection_limit:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Buyer has reached their connection limit"
                )

            # Create connection (seller-initiated, so it's pending buyer approval)
            connection = Connection(
                buyer_id=buyer_profile.id,
                seller_id=seller_profile.id,
                listing_id=None,  # No specific listing for seller-initiated connections
                status=ConnectionStatus.PENDING,
                initial_message=message,
                seller_initiated=True  # Add this field to track who initiated
            )

            self.db.add(connection)
            self.db.commit()
            self.db.refresh(connection)

            return {
                "id": connection.id,
                "buyer_id": connection.buyer_id,
                "status": connection.status,
                "initial_message": connection.initial_message,
                "requested_at": connection.requested_at,
                "seller_initiated": True
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error sending seller-to-buyer connection: {e}", exc_info=True)
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send connection request"
            )

    def check_seller_buyer_connection(
        self, seller_user: User, buyer_id: UUID
    ) -> Dict[str, Any]:
        """Check if connection exists between seller and buyer"""
        try:
            # Get seller profile
            seller_profile = self.db.query(Seller).filter(
                Seller.user_id == seller_user.id
            ).first()
            
            if not seller_profile:
                return {
                    "has_connection": False,
                    "status": None,
                    "connection_id": None,
                    "reason": "Seller profile not found"
                }

            # Check if connection exists between seller and buyer
            connection = self.db.query(Connection).filter(
                and_(
                    Connection.seller_id == seller_profile.id,
                    Connection.buyer_id == buyer_id
                )
            ).first()

            if not connection:
                return {
                    "has_connection": False,
                    "status": None,
                    "connection_id": None,
                    "can_connect": True,
                    "reason": None
                }

            return {
                "has_connection": True,
                "status": connection.status,
                "connection_id": connection.id,
                "can_connect": False,
                "reason": f"Connection already exists with status: {connection.status}",
                "requested_at": connection.requested_at,
                "responded_at": connection.responded_at,
                "initial_message": connection.initial_message,
                "response_message": connection.response_message,
                "seller_initiated": getattr(connection, 'seller_initiated', False)
            }

        except Exception as e:
            logger.error(f"Error checking seller-buyer connection: {e}", exc_info=True)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to check connection status"
            )

    def update_connection_status(
        self, user: User, connection_id: UUID, status: str, response_message: str = None
    ) -> Dict[str, Any]:
        """Update connection status (approve/reject)"""
        try:
            connection = self.db.query(Connection).filter(
                Connection.id == connection_id
            ).first()

            if not connection:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Connection not found"
                )

            # Check if user has permission to update this connection
            user_profile = None
            if user.user_type == UserType.BUYER:
                user_profile = self.db.query(Buyer).filter(Buyer.user_id == user.id).first()
                if not user_profile or connection.buyer_id != user_profile.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied"
                    )
            elif user.user_type == UserType.SELLER:
                user_profile = self.db.query(Seller).filter(Seller.user_id == user.id).first()
                if not user_profile or connection.seller_id != user_profile.id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Access denied"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid user type"
                )

            # Update connection status
            connection.status = status
            connection.response_message = response_message
            connection.responded_at = datetime.now(timezone.utc)

            # If approved and buyer is accepting, deduct from their connection count
            if status == ConnectionStatus.APPROVED and user.user_type == UserType.BUYER:
                buyer_profile = self.db.query(Buyer).filter(Buyer.user_id == user.id).first()
                if buyer_profile and buyer_profile.subscription_id:
                    subscription = self.db.query(UserSubscription).filter(
                        UserSubscription.id == buyer_profile.subscription_id
                    ).first()
                    if subscription:
                        subscription.connections_used_current_month += 1

            self.db.commit()
            self.db.refresh(connection)

            return {
                "id": connection.id,
                "status": connection.status,
                "response_message": connection.response_message,
                "responded_at": connection.responded_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating connection status: {e}", exc_info=True)
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update connection status"
            )
