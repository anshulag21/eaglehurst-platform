"""
Notification related database models
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, JSON
from ..core.types import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base
from ..core.constants import NotificationType


class Notification(Base):
    """User notifications for various platform events"""
    __tablename__ = "notifications"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    
    # Notification Details
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    
    # Related Resources
    resource_type = Column(String(50), nullable=True)  # listing, connection, message, etc.
    resource_id = Column(UUID(), nullable=True)
    
    # Notification Data
    data = Column(JSON, nullable=True)  # Additional notification data
    action_url = Column(String(500), nullable=True)  # URL for notification action
    
    # Status
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)  # For email/push notifications
    
    # Delivery Channels
    send_email = Column(Boolean, default=True)
    send_push = Column(Boolean, default=True)
    send_sms = Column(Boolean, default=False)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<Notification {self.notification_type}: {self.title}>"


class NotificationPreference(Base):
    """User preferences for different types of notifications"""
    __tablename__ = "notification_preferences"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False, unique=True)
    
    # Email Preferences
    email_connection_requests = Column(Boolean, default=True)
    email_connection_responses = Column(Boolean, default=True)
    email_new_messages = Column(Boolean, default=True)
    email_listing_updates = Column(Boolean, default=True)
    email_subscription_updates = Column(Boolean, default=True)
    email_marketing = Column(Boolean, default=False)
    
    # Push Notification Preferences
    push_connection_requests = Column(Boolean, default=True)
    push_connection_responses = Column(Boolean, default=True)
    push_new_messages = Column(Boolean, default=True)
    push_listing_updates = Column(Boolean, default=False)
    push_subscription_updates = Column(Boolean, default=True)
    
    # SMS Preferences
    sms_urgent_only = Column(Boolean, default=False)
    sms_subscription_expiry = Column(Boolean, default=False)
    
    # General Preferences
    notification_frequency = Column(String(20), default="immediate")  # immediate, daily, weekly
    quiet_hours_start = Column(String(5), nullable=True)  # "22:00"
    quiet_hours_end = Column(String(5), nullable=True)  # "08:00"
    timezone = Column(String(50), default="Europe/London")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<NotificationPreference {self.user_id}>"


class EmailTemplate(Base):
    """Email templates for different notification types"""
    __tablename__ = "email_templates"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    
    # Template Details
    template_name = Column(String(100), nullable=False, unique=True)
    template_type = Column(String(50), nullable=False)  # notification_type
    subject = Column(String(255), nullable=False)
    
    # Template Content
    html_content = Column(Text, nullable=False)
    text_content = Column(Text, nullable=True)  # Plain text version
    
    # Template Variables
    variables = Column(JSON, nullable=True)  # Available template variables
    
    # Template Settings
    is_active = Column(Boolean, default=True)
    version = Column(String(10), default="1.0")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<EmailTemplate {self.template_name}>"


class NotificationLog(Base):
    """Log of sent notifications for tracking and debugging"""
    __tablename__ = "notification_logs"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    notification_id = Column(UUID(), ForeignKey("notifications.id"), nullable=False)
    
    # Delivery Details
    delivery_channel = Column(String(20), nullable=False)  # email, push, sms
    recipient = Column(String(255), nullable=False)  # email address, device token, phone number
    
    # Status
    status = Column(String(20), nullable=False)  # sent, delivered, failed, bounced
    error_message = Column(Text, nullable=True)
    
    # External Service Details
    external_id = Column(String(255), nullable=True)  # ID from email/push service
    external_response = Column(JSON, nullable=True)  # Response from external service
    
    # Timestamps
    sent_at = Column(DateTime(timezone=True), server_default=func.now())
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    notification = relationship("Notification")
    
    def __repr__(self):
        return f"<NotificationLog {self.delivery_channel}: {self.status}>"


class PushDevice(Base):
    """User devices for push notifications"""
    __tablename__ = "push_devices"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    
    # Device Details
    device_token = Column(String(500), nullable=False, unique=True)
    device_type = Column(String(20), nullable=False)  # ios, android, web
    device_name = Column(String(255), nullable=True)
    app_version = Column(String(20), nullable=True)
    os_version = Column(String(50), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime(timezone=True), server_default=func.now())
    
    # Timestamps
    registered_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<PushDevice {self.device_type}: {self.device_name}>"
