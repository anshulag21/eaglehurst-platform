"""
Notification-related Pydantic schemas
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

from ..core.constants import NotificationType


# Notification Schemas
class NotificationResponse(BaseModel):
    """Schema for notification response"""
    id: UUID = Field(..., description="Notification ID")
    notification_type: str = Field(..., description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    resource_type: Optional[str] = Field(None, description="Related resource type")
    resource_id: Optional[UUID] = Field(None, description="Related resource ID")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional notification data")
    action_url: Optional[str] = Field(None, description="Action URL")
    is_read: bool = Field(..., description="Whether notification is read")
    is_sent: bool = Field(..., description="Whether notification was sent")
    created_at: datetime = Field(..., description="Creation timestamp")
    read_at: Optional[datetime] = Field(None, description="Read timestamp")
    sent_at: Optional[datetime] = Field(None, description="Sent timestamp")
    
    class Config:
        from_attributes = True


# Notification Preferences Schemas
class NotificationPreferencesUpdate(BaseModel):
    """Schema for updating notification preferences"""
    # Email preferences
    email_connection_requests: Optional[bool] = Field(None, description="Email notifications for connection requests")
    email_connection_responses: Optional[bool] = Field(None, description="Email notifications for connection responses")
    email_new_messages: Optional[bool] = Field(None, description="Email notifications for new messages")
    email_listing_updates: Optional[bool] = Field(None, description="Email notifications for listing updates")
    email_subscription_updates: Optional[bool] = Field(None, description="Email notifications for subscription updates")
    email_marketing: Optional[bool] = Field(None, description="Marketing email notifications")
    
    # Push preferences
    push_connection_requests: Optional[bool] = Field(None, description="Push notifications for connection requests")
    push_connection_responses: Optional[bool] = Field(None, description="Push notifications for connection responses")
    push_new_messages: Optional[bool] = Field(None, description="Push notifications for new messages")
    push_listing_updates: Optional[bool] = Field(None, description="Push notifications for listing updates")
    push_subscription_updates: Optional[bool] = Field(None, description="Push notifications for subscription updates")
    
    # SMS preferences
    sms_urgent_only: Optional[bool] = Field(None, description="SMS notifications for urgent messages only")
    sms_subscription_expiry: Optional[bool] = Field(None, description="SMS notifications for subscription expiry")
    
    # General preferences
    notification_frequency: Optional[str] = Field(None, description="Notification frequency (immediate, hourly, daily)")
    quiet_hours_start: Optional[str] = Field(None, description="Quiet hours start time (HH:MM)")
    quiet_hours_end: Optional[str] = Field(None, description="Quiet hours end time (HH:MM)")
    timezone: Optional[str] = Field(None, description="User timezone")
    
    class Config:
        from_attributes = True


class NotificationPreferencesResponse(BaseModel):
    """Schema for notification preferences response"""
    id: UUID = Field(..., description="Preferences ID")
    user_id: UUID = Field(..., description="User ID")
    
    # Email preferences
    email_connection_requests: bool = Field(..., description="Email notifications for connection requests")
    email_connection_responses: bool = Field(..., description="Email notifications for connection responses")
    email_new_messages: bool = Field(..., description="Email notifications for new messages")
    email_listing_updates: bool = Field(..., description="Email notifications for listing updates")
    email_subscription_updates: bool = Field(..., description="Email notifications for subscription updates")
    email_marketing: bool = Field(..., description="Marketing email notifications")
    
    # Push preferences
    push_connection_requests: bool = Field(..., description="Push notifications for connection requests")
    push_connection_responses: bool = Field(..., description="Push notifications for connection responses")
    push_new_messages: bool = Field(..., description="Push notifications for new messages")
    push_listing_updates: bool = Field(..., description="Push notifications for listing updates")
    push_subscription_updates: bool = Field(..., description="Push notifications for subscription updates")
    
    # SMS preferences
    sms_urgent_only: bool = Field(..., description="SMS notifications for urgent messages only")
    sms_subscription_expiry: bool = Field(..., description="SMS notifications for subscription expiry")
    
    # General preferences
    notification_frequency: str = Field(..., description="Notification frequency")
    quiet_hours_start: str = Field(..., description="Quiet hours start time")
    quiet_hours_end: str = Field(..., description="Quiet hours end time")
    timezone: str = Field(..., description="User timezone")
    
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Update timestamp")
    
    class Config:
        from_attributes = True


# Notification Creation Schema (for internal use)
class NotificationCreate(BaseModel):
    """Schema for creating notifications"""
    user_id: UUID = Field(..., description="Target user ID")
    notification_type: str = Field(..., description="Notification type")
    title: str = Field(..., max_length=255, description="Notification title")
    message: str = Field(..., max_length=1000, description="Notification message")
    resource_type: Optional[str] = Field(None, description="Related resource type")
    resource_id: Optional[UUID] = Field(None, description="Related resource ID")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional notification data")
    action_url: Optional[str] = Field(None, description="Action URL")
    send_email: bool = Field(False, description="Send email notification")
    send_push: bool = Field(False, description="Send push notification")
    
    class Config:
        from_attributes = True