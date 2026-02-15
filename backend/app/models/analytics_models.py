"""
Analytics and tracking related database models
"""

from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, JSON, Boolean
from ..core.types import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base


class ListingView(Base):
    """Track listing views for analytics"""
    __tablename__ = "listing_views"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=False)
    buyer_id = Column(UUID(), ForeignKey("buyers.id"), nullable=True)  # Null for anonymous views
    
    # View Details
    ip_address = Column(String(45), nullable=True)  # Support IPv6
    user_agent = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)
    
    # Location Data (if available)
    country = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    
    # Session Information
    session_id = Column(String(100), nullable=True)
    view_duration = Column(Integer, nullable=True)  # Duration in seconds
    
    # Timestamps
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    listing = relationship("Listing")
    buyer = relationship("Buyer")
    
    def __repr__(self):
        return f"<ListingView {self.listing_id}>"


class ProfileView(Base):
    """Track seller profile views for analytics"""
    __tablename__ = "profile_views"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(), ForeignKey("sellers.id"), nullable=False)
    buyer_id = Column(UUID(), ForeignKey("buyers.id"), nullable=True)  # Null for anonymous views
    
    # View Details
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)
    
    # Location Data (if available)
    country = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    
    # Session Information
    session_id = Column(String(100), nullable=True)
    view_duration = Column(Integer, nullable=True)  # Duration in seconds
    
    # Timestamps
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    seller = relationship("Seller", back_populates="profile_views")
    buyer = relationship("Buyer")
    
    def __repr__(self):
        return f"<ProfileView {self.seller_id}>"


class SearchQuery(Base):
    """Track search queries for analytics and improvements"""
    __tablename__ = "search_queries"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=True)  # Null for anonymous searches
    
    # Search Details
    query_text = Column(String(500), nullable=True)
    filters_applied = Column(JSON, nullable=True)  # Store filter parameters
    results_count = Column(Integer, nullable=True)
    
    # User Interaction
    clicked_listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=True)
    click_position = Column(Integer, nullable=True)  # Position of clicked result
    
    # Session Information
    session_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    
    # Timestamps
    searched_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    clicked_listing = relationship("Listing")
    
    def __repr__(self):
        return f"<SearchQuery {self.query_text}>"


class UserActivity(Base):
    """Track general user activities for analytics"""
    __tablename__ = "user_activities"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    
    # Activity Details
    activity_type = Column(String(50), nullable=False)  # login, logout, listing_created, etc.
    activity_description = Column(String(500), nullable=True)
    
    # Related Resources
    resource_type = Column(String(50), nullable=True)  # listing, connection, message, etc.
    resource_id = Column(UUID(), nullable=True)
    
    # Additional Data
    activity_metadata = Column(JSON, nullable=True)  # Flexible field for additional activity data
    
    # Session Information
    session_id = Column(String(100), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<UserActivity {self.activity_type}>"


class PlatformMetrics(Base):
    """Store daily/weekly/monthly platform metrics"""
    __tablename__ = "platform_metrics"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    
    # Metric Details
    metric_type = Column(String(50), nullable=False)  # daily_users, weekly_listings, etc.
    metric_value = Column(Integer, nullable=False)
    metric_date = Column(DateTime(timezone=True), nullable=False)
    
    # Additional Data
    breakdown = Column(JSON, nullable=True)  # Detailed breakdown of the metric
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<PlatformMetrics {self.metric_type}: {self.metric_value}>"


class ConversionFunnel(Base):
    """Track conversion funnel metrics"""
    __tablename__ = "conversion_funnel"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=True)
    
    # Funnel Stage
    stage = Column(String(50), nullable=False)  # registration, verification, subscription, etc.
    completed = Column(Boolean, default=False)
    
    # Timing
    stage_entered_at = Column(DateTime(timezone=True), server_default=func.now())
    stage_completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Additional Data
    funnel_metadata = Column(JSON, nullable=True)
    
    # Relationships
    user = relationship("User")
    
    def __repr__(self):
        return f"<ConversionFunnel {self.stage}>"
