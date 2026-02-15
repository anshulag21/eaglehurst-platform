"""
Admin-specific analytics API endpoints
"""

from typing import Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....schemas.analytics_schemas import (
    PlatformAnalyticsResponse, RevenueAnalyticsResponse, UserBehaviorAnalyticsResponse
)
from ....schemas.common_schemas import SuccessResponse
from ....business_logic.analytics_bl import AnalyticsBusinessLogic
from ....utils.dependencies import get_current_admin
from ....models.user_models import User

router = APIRouter()


@router.get("/platform", response_model=SuccessResponse)
async def get_admin_platform_analytics(
    period: str = Query("30d", description="Analytics period (7d, 30d, 90d, 1y)"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get comprehensive platform analytics (Admin only)
    
    Returns platform-wide metrics:
    - User growth and engagement
    - Listing activity
    - Connection success rates
    - Revenue metrics
    - Geographic distribution
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    result = await analytics_bl.get_platform_analytics(period)
    
    return SuccessResponse(
        success=True,
        message="Platform analytics retrieved successfully",
        data=result
    )


@router.get("/revenue", response_model=SuccessResponse)
async def get_admin_revenue_analytics(
    period: str = Query("30d", description="Analytics period (7d, 30d, 90d, 1y)"),
    breakdown_by: str = Query("tier", description="Revenue breakdown (tier, region, user_type)"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get detailed revenue analytics (Admin only)
    
    - **period**: Time period for analysis
    - **breakdown_by**: How to break down revenue data
    
    Returns comprehensive revenue analysis
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    result = await analytics_bl.get_admin_revenue_analytics(period, breakdown_by)
    
    return SuccessResponse(
        success=True,
        message="Revenue analytics retrieved successfully",
        data=result
    )


@router.get("/user-behavior", response_model=SuccessResponse)
async def get_admin_user_behavior_analytics(
    period: str = Query("30d", description="Analytics period (7d, 30d, 90d, 1y)"),
    user_type: Optional[str] = Query(None, description="Filter by user type"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user behavior analytics (Admin only)
    
    Returns behavioral insights:
    - User journey analysis
    - Feature usage patterns
    - Conversion funnels
    - Retention metrics
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    result = await analytics_bl.get_user_behavior_analytics(period, user_type)
    
    return SuccessResponse(
        success=True,
        message="User behavior analytics retrieved successfully",
        data=result
    )


@router.get("/performance-metrics", response_model=SuccessResponse)
async def get_platform_performance_metrics(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get real-time platform performance metrics
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    
    # Get current performance metrics
    result = {
        "real_time_metrics": {
            "active_users_today": 0,  # Would be calculated from actual data
            "listings_created_today": 0,
            "connections_made_today": 0,
            "revenue_today": 0.0
        },
        "system_health": {
            "database_status": "healthy",
            "api_response_time": "normal",
            "error_rate": "low"
        },
        "alerts": []
    }
    
    return SuccessResponse(
        success=True,
        message="Performance metrics retrieved successfully",
        data=result
    )


@router.get("/conversion-funnel", response_model=SuccessResponse)
async def get_conversion_funnel_analytics(
    period: str = Query("30d", description="Analytics period"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get conversion funnel analytics for admin
    """
    analytics_bl = AnalyticsBusinessLogic(db)
    
    # Mock conversion funnel data
    result = {
        "funnel_stages": [
            {"stage": "registration", "users": 1000, "conversion_rate": 100.0},
            {"stage": "email_verification", "users": 850, "conversion_rate": 85.0},
            {"stage": "profile_completion", "users": 720, "conversion_rate": 72.0},
            {"stage": "first_listing", "users": 450, "conversion_rate": 45.0},
            {"stage": "first_connection", "users": 320, "conversion_rate": 32.0},
            {"stage": "subscription", "users": 180, "conversion_rate": 18.0}
        ],
        "period": period,
        "total_drop_off": 82.0
    }
    
    return SuccessResponse(
        success=True,
        message="Conversion funnel analytics retrieved successfully",
        data=result
    )
