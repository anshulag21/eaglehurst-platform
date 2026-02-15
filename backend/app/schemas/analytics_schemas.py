"""
Analytics-related Pydantic schemas
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal
from uuid import UUID


# User Analytics Schemas
class UserAnalyticsResponse(BaseModel):
    """Schema for user analytics response"""
    user_id: UUID = Field(..., description="User ID")
    user_type: str = Field(..., description="User type")
    period: str = Field(..., description="Analytics period")
    start_date: datetime = Field(..., description="Period start date")
    end_date: datetime = Field(..., description="Period end date")
    
    # Common metrics
    engagement_score: float = Field(..., description="User engagement score (0-100)")
    activity_trends: List[Dict[str, Any]] = Field(..., description="Daily activity trends")
    subscription: Dict[str, Any] = Field(..., description="Subscription analytics")
    
    # Role-specific metrics
    seller_metrics: Optional[Dict[str, Any]] = Field(None, description="Seller-specific metrics")
    buyer_metrics: Optional[Dict[str, Any]] = Field(None, description="Buyer-specific metrics")
    
    class Config:
        from_attributes = True


# Listing Analytics Schemas
class ListingAnalyticsResponse(BaseModel):
    """Schema for listing analytics response"""
    listing_id: Optional[UUID] = Field(None, description="Specific listing ID (if applicable)")
    period: str = Field(..., description="Analytics period")
    
    # Summary metrics
    summary: Dict[str, Any] = Field(..., description="Summary statistics")
    
    # Detailed metrics
    listing_performance: Optional[List[Dict[str, Any]]] = Field(None, description="Individual listing performance")
    analytics: Optional[Dict[str, Any]] = Field(None, description="Detailed analytics for single listing")
    
    class Config:
        from_attributes = True


class ListingViewAnalyticsResponse(BaseModel):
    """Schema for listing view analytics response"""
    listing_id: UUID = Field(..., description="Listing ID")
    period: str = Field(..., description="Analytics period")
    
    # View metrics
    total_views: int = Field(..., description="Total views")
    unique_viewers: int = Field(..., description="Unique viewers")
    repeat_viewers: int = Field(..., description="Repeat viewers")
    
    # Geographic data
    geographic_distribution: List[Dict[str, Any]] = Field(..., description="Views by geographic region")
    
    # Referrer data
    referrer_sources: List[Dict[str, Any]] = Field(..., description="Traffic sources")
    
    # Time-based patterns
    hourly_distribution: List[Dict[str, Any]] = Field(..., description="Views by hour of day")
    daily_trends: List[Dict[str, Any]] = Field(..., description="Daily view trends")
    
    class Config:
        from_attributes = True


# Platform Analytics Schemas
class PlatformAnalyticsResponse(BaseModel):
    """Schema for platform analytics response"""
    period: str = Field(..., description="Analytics period")
    start_date: datetime = Field(..., description="Period start date")
    end_date: datetime = Field(..., description="Period end date")
    
    # User metrics
    user_metrics: Dict[str, Any] = Field(..., description="User growth and engagement metrics")
    
    # Listing metrics
    listing_metrics: Dict[str, Any] = Field(..., description="Listing activity metrics")
    
    # Connection metrics
    connection_metrics: Dict[str, Any] = Field(..., description="Connection and matching metrics")
    
    # Geographic distribution
    geographic_data: Dict[str, Any] = Field(..., description="Geographic distribution of activity")
    
    # Trends
    growth_trends: List[Dict[str, Any]] = Field(..., description="Platform growth trends")
    
    class Config:
        from_attributes = True


# Revenue Analytics Schemas
class RevenueAnalyticsResponse(BaseModel):
    """Schema for revenue analytics response"""
    period: str = Field(..., description="Analytics period")
    
    # Revenue metrics
    total_revenue: Decimal = Field(..., description="Total revenue")
    recurring_revenue: Decimal = Field(..., description="Recurring subscription revenue")
    one_time_revenue: Decimal = Field(..., description="One-time payment revenue")
    
    # Revenue breakdown
    revenue_by_tier: List[Dict[str, Any]] = Field(..., description="Revenue by subscription tier")
    revenue_by_region: List[Dict[str, Any]] = Field(..., description="Revenue by geographic region")
    revenue_by_user_type: List[Dict[str, Any]] = Field(..., description="Revenue by user type")
    
    # Trends
    revenue_trends: List[Dict[str, Any]] = Field(..., description="Revenue trends over time")
    
    # Metrics
    average_revenue_per_user: Decimal = Field(..., description="Average revenue per user")
    customer_lifetime_value: Decimal = Field(..., description="Customer lifetime value")
    churn_rate: float = Field(..., description="Monthly churn rate")
    
    class Config:
        from_attributes = True


# Engagement Analytics Schemas
class EngagementAnalyticsResponse(BaseModel):
    """Schema for engagement analytics response"""
    period: str = Field(..., description="Analytics period")
    metric_type: str = Field(..., description="Type of engagement metrics")
    
    # Engagement metrics
    total_engagements: int = Field(..., description="Total engagement events")
    unique_users_engaged: int = Field(..., description="Unique users who engaged")
    average_engagements_per_user: float = Field(..., description="Average engagements per user")
    
    # Trends
    engagement_trends: List[Dict[str, Any]] = Field(..., description="Engagement trends over time")
    
    # Breakdown by type
    engagement_by_type: Dict[str, int] = Field(..., description="Engagement breakdown by type")
    
    # User segments
    engagement_by_user_segment: List[Dict[str, Any]] = Field(..., description="Engagement by user segment")
    
    class Config:
        from_attributes = True


# Market Analytics Schemas
class MarketInsightsResponse(BaseModel):
    """Schema for market insights response"""
    period: str = Field(..., description="Analytics period")
    business_type: Optional[str] = Field(None, description="Business type filter")
    region: Optional[str] = Field(None, description="Region filter")
    
    # Market metrics
    total_listings: int = Field(..., description="Total listings in market")
    average_asking_price: Decimal = Field(..., description="Average asking price")
    median_asking_price: Decimal = Field(..., description="Median asking price")
    
    # Price trends
    price_trends: List[Dict[str, Any]] = Field(..., description="Price trends over time")
    
    # Activity metrics
    market_activity: Dict[str, Any] = Field(..., description="Market activity metrics")
    
    # Regional comparisons
    regional_comparisons: List[Dict[str, Any]] = Field(..., description="Regional market comparisons")
    
    # Industry benchmarks
    industry_benchmarks: Dict[str, Any] = Field(..., description="Industry benchmark data")
    
    class Config:
        from_attributes = True


class CompetitiveAnalysisResponse(BaseModel):
    """Schema for competitive analysis response"""
    business_type: str = Field(..., description="Business type analyzed")
    region: Optional[str] = Field(None, description="Region analyzed")
    
    # Market position
    market_position: Dict[str, Any] = Field(..., description="User's market position")
    
    # Competitive metrics
    competitive_metrics: Dict[str, Any] = Field(..., description="Competitive comparison metrics")
    
    # Pricing analysis
    pricing_analysis: Dict[str, Any] = Field(..., description="Pricing comparison with competitors")
    
    # Performance benchmarks
    performance_benchmarks: Dict[str, Any] = Field(..., description="Performance vs competitors")
    
    # Opportunities
    opportunities: List[str] = Field(..., description="Identified opportunities")
    
    # Recommendations
    recommendations: List[str] = Field(..., description="Strategic recommendations")
    
    class Config:
        from_attributes = True


# Seller Performance Schemas
class SellerPerformanceResponse(BaseModel):
    """Schema for seller performance analytics"""
    seller_id: UUID = Field(..., description="Seller ID")
    period: str = Field(..., description="Analytics period")
    
    # Performance metrics
    performance: Dict[str, Any] = Field(..., description="Performance metrics")
    
    # Benchmarks
    benchmarks: Dict[str, Any] = Field(..., description="Platform benchmarks")
    
    # Revenue data
    revenue: Dict[str, Any] = Field(..., description="Revenue analytics")
    
    # Recommendations
    recommendations: List[str] = Field(..., description="Performance recommendations")
    
    class Config:
        from_attributes = True


# Buyer Activity Schemas
class BuyerActivityResponse(BaseModel):
    """Schema for buyer activity analytics"""
    buyer_id: UUID = Field(..., description="Buyer ID")
    period: str = Field(..., description="Analytics period")
    
    # Browsing activity
    browsing_activity: Dict[str, Any] = Field(..., description="Browsing patterns and preferences")
    
    # Connection activity
    connection_activity: Dict[str, Any] = Field(..., description="Connection request activity")
    
    # Recommendations
    recommendations: List[str] = Field(..., description="Activity recommendations")
    
    class Config:
        from_attributes = True


# User Behavior Analytics Schemas
class UserBehaviorAnalyticsResponse(BaseModel):
    """Schema for user behavior analytics response"""
    period: str = Field(..., description="Analytics period")
    user_type: Optional[str] = Field(None, description="User type filter")
    
    # Behavior patterns
    behavior_patterns: Dict[str, Any] = Field(..., description="User behavior patterns")
    
    # Journey analysis
    user_journey: Dict[str, Any] = Field(..., description="User journey analysis")
    
    # Feature usage
    feature_usage: Dict[str, Any] = Field(..., description="Feature usage statistics")
    
    # Conversion funnels
    conversion_funnels: List[Dict[str, Any]] = Field(..., description="Conversion funnel analysis")
    
    # Retention metrics
    retention_metrics: Dict[str, Any] = Field(..., description="User retention metrics")
    
    class Config:
        from_attributes = True


# Export Schemas
class AnalyticsExportResponse(BaseModel):
    """Schema for analytics export response"""
    report_type: str = Field(..., description="Type of report exported")
    period: str = Field(..., description="Analytics period")
    format: str = Field(..., description="Export format")
    
    # Export details
    file_url: str = Field(..., description="Download URL for exported file")
    file_size: int = Field(..., description="File size in bytes")
    generated_at: datetime = Field(..., description="Export generation timestamp")
    expires_at: datetime = Field(..., description="Download link expiration")
    
    class Config:
        from_attributes = True


# Analytics Summary Schemas
class AnalyticsSummaryResponse(BaseModel):
    """Schema for analytics summary response"""
    user_id: UUID = Field(..., description="User ID")
    summary_type: str = Field(..., description="Type of summary")
    
    # Key metrics
    key_metrics: Dict[str, Any] = Field(..., description="Key performance metrics")
    
    # Trends
    trends: Dict[str, Any] = Field(..., description="Trend indicators")
    
    # Alerts
    alerts: List[str] = Field(..., description="Performance alerts")
    
    # Next steps
    next_steps: List[str] = Field(..., description="Recommended next steps")
    
    class Config:
        from_attributes = True
