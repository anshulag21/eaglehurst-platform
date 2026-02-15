"""
Notification management business logic
"""

from typing import Any, Dict, List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func

from ..models.user_models import User
from ..models.notification_models import Notification, NotificationPreference
from ..schemas.notification_schemas import NotificationPreferencesUpdate
from ..core.constants import NotificationType
from ..utils.email_service import email_service
import logging

logger = logging.getLogger(__name__)


class NotificationBusinessLogic:
    def __init__(self, db: Session):
        self.db = db

    async def get_user_notifications(
        self, user: User, page: int, limit: int, 
        notification_type: Optional[str] = None, is_read: Optional[bool] = None
    ) -> Dict[str, Any]:
        """Get user's notifications with pagination and filtering"""
        try:
            offset = (page - 1) * limit
            
            query = self.db.query(Notification).filter(
                Notification.user_id == user.id
            )
            
            if notification_type:
                query = query.filter(Notification.notification_type == notification_type)
            
            if is_read is not None:
                query = query.filter(Notification.is_read == is_read)
            
            total = query.count()
            notifications = query.order_by(desc(Notification.created_at)).offset(offset).limit(limit).all()

            notification_list = []
            for notif in notifications:
                notification_data = {
                    "id": notif.id,
                    "notification_type": notif.notification_type,
                    "title": notif.title,
                    "message": notif.message,
                    "resource_type": notif.resource_type,
                    "resource_id": notif.resource_id,
                    "data": notif.data,
                    "action_url": notif.action_url,
                    "is_read": notif.is_read,
                    "is_sent": notif.is_sent,
                    "created_at": notif.created_at,
                    "read_at": notif.read_at
                }
                notification_list.append(notification_data)

            return {
                "notifications": notification_list,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "pages": (total + limit - 1) // limit
                },
                "unread_count": self.db.query(Notification).filter(
                    and_(
                        Notification.user_id == user.id,
                        Notification.is_read == False
                    )
                ).count()
            }

        except Exception as e:
            logger.error(f"Error getting user notifications: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve notifications"
            )

    async def mark_notification_as_read(
        self, user: User, notification_id: UUID
    ) -> Dict[str, Any]:
        """Mark a specific notification as read"""
        try:
            notification = self.db.query(Notification).filter(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user.id
                )
            ).first()

            if not notification:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Notification not found"
                )

            if not notification.is_read:
                notification.is_read = True
                notification.read_at = func.now()
                self.db.commit()

            return {
                "notification_id": notification_id,
                "is_read": True,
                "read_at": notification.read_at
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to mark notification as read"
            )

    async def mark_all_notifications_as_read(self, user: User) -> Dict[str, Any]:
        """Mark all notifications as read for a user"""
        try:
            updated_count = self.db.query(Notification).filter(
                and_(
                    Notification.user_id == user.id,
                    Notification.is_read == False
                )
            ).update({
                "is_read": True,
                "read_at": func.now()
            })

            self.db.commit()

            return {
                "updated_count": updated_count,
                "message": f"Marked {updated_count} notifications as read"
            }

        except Exception as e:
            logger.error(f"Error marking all notifications as read: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to mark all notifications as read"
            )

    async def get_unread_notification_count(self, user: User) -> Dict[str, Any]:
        """Get count of unread notifications"""
        try:
            unread_count = self.db.query(Notification).filter(
                and_(
                    Notification.user_id == user.id,
                    Notification.is_read == False
                )
            ).count()

            return {"unread_count": unread_count}

        except Exception as e:
            logger.error(f"Error getting unread notification count: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get unread notification count"
            )

    async def get_notification_preferences(self, user: User) -> Dict[str, Any]:
        """Get user's notification preferences"""
        try:
            preferences = self.db.query(NotificationPreference).filter(
                NotificationPreference.user_id == user.id
            ).first()

            if not preferences:
                # Create default preferences
                preferences = NotificationPreference(
                    user_id=user.id,
                    email_connection_requests=True,
                    email_connection_responses=True,
                    email_new_messages=True,
                    email_listing_updates=True,
                    email_subscription_updates=True,
                    email_marketing=False,
                    push_connection_requests=True,
                    push_connection_responses=True,
                    push_new_messages=True,
                    push_listing_updates=True,
                    push_subscription_updates=True,
                    sms_urgent_only=False,
                    sms_subscription_expiry=True,
                    notification_frequency="immediate",
                    quiet_hours_start="22:00",
                    quiet_hours_end="08:00",
                    timezone="Europe/London"
                )
                self.db.add(preferences)
                self.db.commit()
                self.db.refresh(preferences)

            return {
                "id": preferences.id,
                "email_connection_requests": preferences.email_connection_requests,
                "email_connection_responses": preferences.email_connection_responses,
                "email_new_messages": preferences.email_new_messages,
                "email_listing_updates": preferences.email_listing_updates,
                "email_subscription_updates": preferences.email_subscription_updates,
                "email_marketing": preferences.email_marketing,
                "push_connection_requests": preferences.push_connection_requests,
                "push_connection_responses": preferences.push_connection_responses,
                "push_new_messages": preferences.push_new_messages,
                "push_listing_updates": preferences.push_listing_updates,
                "push_subscription_updates": preferences.push_subscription_updates,
                "sms_urgent_only": preferences.sms_urgent_only,
                "sms_subscription_expiry": preferences.sms_subscription_expiry,
                "notification_frequency": preferences.notification_frequency,
                "quiet_hours_start": preferences.quiet_hours_start,
                "quiet_hours_end": preferences.quiet_hours_end,
                "timezone": preferences.timezone,
                "created_at": preferences.created_at,
                "updated_at": preferences.updated_at
            }

        except Exception as e:
            logger.error(f"Error getting notification preferences: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve notification preferences"
            )

    async def update_notification_preferences(
        self, user: User, preferences_data: NotificationPreferencesUpdate
    ) -> Dict[str, Any]:
        """Update user's notification preferences"""
        try:
            preferences = self.db.query(NotificationPreference).filter(
                NotificationPreference.user_id == user.id
            ).first()

            if not preferences:
                # Create new preferences
                preferences = NotificationPreference(user_id=user.id)
                self.db.add(preferences)

            # Update preferences
            update_data = preferences_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(preferences, field, value)

            preferences.updated_at = func.now()
            
            self.db.commit()
            self.db.refresh(preferences)

            return {
                "id": preferences.id,
                "updated_at": preferences.updated_at,
                "message": "Notification preferences updated successfully"
            }

        except Exception as e:
            logger.error(f"Error updating notification preferences: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update notification preferences"
            )

    async def delete_notification(self, user: User, notification_id: UUID) -> Dict[str, Any]:
        """Delete a specific notification"""
        try:
            notification = self.db.query(Notification).filter(
                and_(
                    Notification.id == notification_id,
                    Notification.user_id == user.id
                )
            ).first()

            if not notification:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Notification not found"
                )

            self.db.delete(notification)
            self.db.commit()

            return {
                "notification_id": notification_id,
                "deleted_at": func.now()
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting notification: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete notification"
            )

    async def delete_all_notifications(self, user: User) -> Dict[str, Any]:
        """Delete all notifications for a user"""
        try:
            deleted_count = self.db.query(Notification).filter(
                Notification.user_id == user.id
            ).delete()

            self.db.commit()

            return {
                "deleted_count": deleted_count,
                "message": f"Deleted {deleted_count} notifications"
            }

        except Exception as e:
            logger.error(f"Error deleting all notifications: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete all notifications"
            )

    # Utility methods for creating notifications
    async def create_notification(
        self, user_id: UUID, notification_type: str, title: str, message: str,
        resource_type: Optional[str] = None, resource_id: Optional[UUID] = None,
        data: Optional[Dict[str, Any]] = None, action_url: Optional[str] = None,
        send_email: bool = False, send_push: bool = False
    ) -> Notification:
        """Create a new notification"""
        try:
            notification = Notification(
                user_id=user_id,
                notification_type=notification_type,
                title=title,
                message=message,
                resource_type=resource_type,
                resource_id=resource_id,
                data=data,
                action_url=action_url,
                send_email=send_email,
                send_push=send_push,
                is_read=False,
                is_sent=False
            )

            self.db.add(notification)
            self.db.commit()
            self.db.refresh(notification)

            # Send email if requested
            if send_email:
                await self._send_notification_email(notification)

            return notification

        except Exception as e:
            logger.error(f"Error creating notification: {e}")
            self.db.rollback()
            raise

    async def _send_notification_email(self, notification: Notification):
        """Send email notification"""
        try:
            user = self.db.query(User).filter(User.id == notification.user_id).first()
            if not user:
                return

            # Check user preferences
            preferences = self.db.query(NotificationPreference).filter(
                NotificationPreference.user_id == user.id
            ).first()

            if not preferences:
                return  # No preferences set, don't send

            # Check if email notifications are enabled for this type
            should_send = False
            if notification.notification_type == NotificationType.CONNECTION_REQUEST:
                should_send = preferences.email_connection_requests
            elif notification.notification_type == NotificationType.CONNECTION_APPROVED:
                should_send = preferences.email_connection_responses
            elif notification.notification_type == NotificationType.NEW_MESSAGE:
                should_send = preferences.email_new_messages
            elif notification.notification_type == NotificationType.LISTING_APPROVED:
                should_send = preferences.email_listing_updates

            if not should_send:
                return

            # Send email
            user_name = f"{user.first_name} {user.last_name}"
            subject = notification.title
            
            html_content = f"""
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #667eea;">{notification.title}</h2>
                <p>{notification.message}</p>
                {f'<p><a href="{notification.action_url}" style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Details</a></p>' if notification.action_url else ''}
                <hr>
                <p style="color: #666; font-size: 14px;">
                    This is an automated notification from CareAcquire. 
                    You can manage your notification preferences in your account settings.
                </p>
            </div>
            """

            email_sent = await email_service.send_email(
                user.email, subject, html_content
            )

            if email_sent:
                notification.is_sent = True
                notification.sent_at = func.now()
                self.db.commit()

        except Exception as e:
            logger.error(f"Error sending notification email: {e}")

    # Helper methods for common notification types
    async def notify_connection_request(
        self, seller_user_id: UUID, buyer_name: str, listing_title: str, message: str
    ):
        """Create notification for new connection request"""
        await self.create_notification(
            user_id=seller_user_id,
            notification_type=NotificationType.CONNECTION_REQUEST,
            title="New Connection Request",
            message=f"{buyer_name} wants to connect regarding '{listing_title}': {message}",
            resource_type="connection",
            action_url="/connections",
            send_email=True,
            send_push=True
        )

    async def notify_connection_response(
        self, buyer_user_id: UUID, seller_name: str, listing_title: str, 
        status: str, response_message: str = None
    ):
        """Create notification for connection response"""
        status_text = "accepted" if status == "accepted" else "declined"
        message = f"{seller_name} has {status_text} your connection request for '{listing_title}'"
        if response_message:
            message += f": {response_message}"

        await self.create_notification(
            user_id=buyer_user_id,
            notification_type=NotificationType.CONNECTION_APPROVED if status == "accepted" else NotificationType.CONNECTION_REJECTED,
            title=f"Connection Request {status_text.title()}",
            message=message,
            resource_type="connection",
            action_url="/connections",
            send_email=True,
            send_push=True
        )

    async def notify_new_message(
        self, recipient_user_id: UUID, sender_name: str, listing_title: str
    ):
        """Create notification for new message"""
        await self.create_notification(
            user_id=recipient_user_id,
            notification_type=NotificationType.NEW_MESSAGE,
            title="New Message",
            message=f"You have a new message from {sender_name} regarding '{listing_title}'",
            resource_type="message",
            action_url="/messages",
            send_email=True,
            send_push=True
        )

    async def notify_listing_status(
        self, seller_user_id: UUID, listing_title: str, status: str, admin_notes: str = None
    ):
        """Create notification for listing status change"""
        if status == "approved":
            title = "Listing Approved"
            message = f"Your listing '{listing_title}' has been approved and is now live!"
            notification_type = NotificationType.LISTING_APPROVED
        else:
            title = "Listing Rejected"
            message = f"Your listing '{listing_title}' has been rejected."
            if admin_notes:
                message += f" Reason: {admin_notes}"
            notification_type = NotificationType.LISTING_REJECTED

        await self.create_notification(
            user_id=seller_user_id,
            notification_type=notification_type,
            title=title,
            message=message,
            resource_type="listing",
            action_url="/listings",
            send_email=True,
            send_push=True
        )
