"""
User-related database models
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base
from ..core.constants import UserType, VerificationStatus
from ..core.types import UUID


class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(20), nullable=False)  # admin, seller, buyer
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    seller_profile = relationship("Seller", back_populates="user", uselist=False)
    buyer_profile = relationship("Buyer", back_populates="user", uselist=False)
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    service_requests = relationship("ServiceRequest", foreign_keys="ServiceRequest.user_id", back_populates="user")
    assigned_service_requests = relationship("ServiceRequest", foreign_keys="ServiceRequest.admin_assigned_id")
    
    # Blocking relationships
    blocks_made = relationship("UserBlock", foreign_keys="UserBlock.blocker_id", back_populates="blocker")
    blocks_received = relationship("UserBlock", foreign_keys="UserBlock.blocked_id", back_populates="blocked_user")
    
    def __repr__(self):
        return f"<User {self.email}>"


class Seller(Base):
    __tablename__ = "sellers"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False, unique=True)
    business_name = Column(String(255), nullable=True)
    business_description = Column(Text, nullable=True)
    business_address = Column(Text, nullable=True)
    verification_status = Column(String(20), default=VerificationStatus.PENDING)
    kyc_documents = Column(JSON, nullable=True)  # Store document URLs and metadata
    profile_completion_percentage = Column(String(3), default="0")
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="seller_profile")
    listings = relationship("Listing", back_populates="seller")
    connections = relationship("Connection", back_populates="seller")
    profile_views = relationship("ProfileView", back_populates="seller")
    
    def __repr__(self):
        return f"<Seller {self.business_name}>"


class Buyer(Base):
    __tablename__ = "buyers"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False, unique=True)
    subscription_id = Column(UUID(), ForeignKey("user_subscriptions.id"), nullable=True)
    verification_status = Column(String(20), default=VerificationStatus.PENDING)
    preferences = Column(JSON, nullable=True)  # Store search preferences, interests, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="buyer_profile")
    subscription = relationship("UserSubscription", back_populates="buyer")
    connections = relationship("Connection", back_populates="buyer")
    # listing_views = relationship("ListingView", back_populates="buyer")  # Commented out to avoid circular import
    
    def __repr__(self):
        return f"<Buyer {self.user.email}>"


class EmailVerification(Base):
    __tablename__ = "email_verifications"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    otp_code = Column(String(10), nullable=False)
    verification_token = Column(String(64), nullable=False, unique=True)  # Secure URL token
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<EmailVerification {self.user_id}>"


class PasswordReset(Base):
    __tablename__ = "password_resets"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    reset_token = Column(String(255), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<PasswordReset {self.user_id}>"
