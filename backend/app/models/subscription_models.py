"""
Subscription-related database models
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric, Integer, JSON
from ..core.types import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base
from ..core.constants import SubscriptionStatus, SubscriptionTier


class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)  # Silver, Gold, Platinum
    tier = Column(String(20), nullable=False)  # silver, gold, platinum
    description = Column(String(500), nullable=True)
    price_monthly = Column(Numeric(10, 2), nullable=False)
    price_yearly = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="GBP")
    
    # Subscription Limits and Features
    connection_limit_monthly = Column(Integer, nullable=False)
    listing_limit = Column(Integer, nullable=False)
    priority_support = Column(Boolean, default=False)
    advanced_analytics = Column(Boolean, default=False)
    featured_listings = Column(Boolean, default=False)
    
    # Additional Features (stored as JSON for flexibility)
    features = Column(JSON, nullable=True)
    
    # Stripe Integration
    stripe_price_id_monthly = Column(String(100), nullable=True)
    stripe_price_id_yearly = Column(String(100), nullable=True)
    
    # Status
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user_subscriptions = relationship("UserSubscription", back_populates="subscription")
    
    def __repr__(self):
        return f"<Subscription {self.name}>"


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    subscription_id = Column(UUID(), ForeignKey("subscriptions.id"), nullable=False)
    
    # Subscription Details
    status = Column(String(20), default=SubscriptionStatus.ACTIVE)
    billing_cycle = Column(String(10), default="monthly")  # monthly, yearly
    
    # Dates
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    trial_end_date = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    
    # Stripe Integration
    stripe_subscription_id = Column(String(100), nullable=True)
    stripe_customer_id = Column(String(100), nullable=True)
    
    # Usage Tracking
    connections_used_current_month = Column(Integer, default=0)
    listings_used = Column(Integer, default=0)
    usage_reset_date = Column(DateTime(timezone=True), nullable=False)
    
    # Payment Information
    amount_paid = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="GBP")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User")
    subscription = relationship("Subscription", back_populates="user_subscriptions")
    buyer = relationship("Buyer", back_populates="subscription")
    payments = relationship("Payment", back_populates="user_subscription")
    
    def is_effectively_active(self) -> bool:
        """
        Check if subscription is effectively active for access purposes.
        This includes both active subscriptions and cancelled subscriptions that haven't expired yet.
        """
        from datetime import datetime, timezone
        from ..core.constants import SubscriptionStatus
        
        # Must be either active or cancelled
        if self.status not in [SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED]:
            return False
        
        # If active, it's effectively active
        if self.status == SubscriptionStatus.ACTIVE:
            return True
        
        # If cancelled, check if it's still within the paid period
        if self.status == SubscriptionStatus.CANCELLED and self.end_date:
            current_time = datetime.now(timezone.utc)
            return self.end_date > current_time
        
        return False
    
    def __repr__(self):
        return f"<UserSubscription {self.user_id}-{self.subscription.name}>"


class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_subscription_id = Column(UUID(), ForeignKey("user_subscriptions.id"), nullable=False)
    
    # Payment Details
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="GBP")
    payment_method = Column(String(50), default="stripe")
    
    # Stripe Integration
    stripe_payment_intent_id = Column(String(100), nullable=True)
    stripe_invoice_id = Column(String(100), nullable=True)
    
    # Status
    status = Column(String(20), nullable=False)  # succeeded, failed, pending, refunded
    failure_reason = Column(String(500), nullable=True)
    
    # Dates
    payment_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user_subscription = relationship("UserSubscription", back_populates="payments")
    
    def __repr__(self):
        return f"<Payment {self.amount} {self.currency}>"


class SubscriptionUsage(Base):
    __tablename__ = "subscription_usage"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_subscription_id = Column(UUID(), ForeignKey("user_subscriptions.id"), nullable=False)
    
    # Usage Type
    usage_type = Column(String(50), nullable=False)  # connection, listing, etc.
    usage_count = Column(Integer, default=1)
    
    # Metadata
    usage_metadata = Column(JSON, nullable=True)  # Additional usage information
    
    # Timestamps
    usage_date = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user_subscription = relationship("UserSubscription")
    
    def __repr__(self):
        return f"<SubscriptionUsage {self.usage_type}>"
