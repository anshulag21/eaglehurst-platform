"""
Notification API endpoints
"""

from typing import Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....schemas.notification_schemas import (
    NotificationResponse, NotificationPreferencesUpdate, NotificationPreferencesResponse
)
from ....schemas.common_schemas import SuccessResponse, PaginationParams
from ....business_logic.notification_bl import NotificationBusinessLogic
from ....utils.dependencies import get_current_user
from ....models.user_models import User

router = APIRouter()


@router.get("/test", response_model=SuccessResponse)
async def test_notifications_endpoint() -> Any:
    """Test endpoint to verify notifications router is working"""
    return SuccessResponse(
        success=True,
        message="Notifications router is working",
        data={"test": True}
    )


@router.get("/", response_model=SuccessResponse)
async def get_notifications(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    is_read: Optional[bool] = Query(None, description="Filter by read status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user notifications
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 20, max: 100)
    - **notification_type**: Filter by notification type
    - **is_read**: Filter by read status (true/false)
    """
    # Return a simple response for now to test the endpoint
    return SuccessResponse(
        success=True,
        message="Notifications retrieved successfully",
        data={
            "notifications": [],
            "pagination": {
                "page": page,
                "limit": limit,
                "total": 0,
                "pages": 0
            },
            "unread_count": 0
        }
    )


@router.put("/{notification_id}/read", response_model=SuccessResponse)
async def mark_notification_as_read(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Mark a notification as read
    """
    notification_bl = NotificationBusinessLogic(db)
    result = await notification_bl.mark_notification_as_read(current_user, notification_id)
    
    return SuccessResponse(
        success=True,
        message="Notification marked as read",
        data=result
    )


@router.put("/read-all", response_model=SuccessResponse)
async def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Mark all notifications as read for the current user
    """
    notification_bl = NotificationBusinessLogic(db)
    result = await notification_bl.mark_all_notifications_as_read(current_user)
    
    return SuccessResponse(
        success=True,
        message="All notifications marked as read",
        data=result
    )


@router.get("/unread-count", response_model=SuccessResponse)
async def get_unread_notification_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get count of unread notifications
    """
    notification_bl = NotificationBusinessLogic(db)
    result = await notification_bl.get_unread_notification_count(current_user)
    
    return SuccessResponse(
        success=True,
        message="Unread notification count retrieved",
        data=result
    )


@router.get("/preferences", response_model=SuccessResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user's notification preferences
    """
    notification_bl = NotificationBusinessLogic(db)
    result = await notification_bl.get_notification_preferences(current_user)
    
    return SuccessResponse(
        success=True,
        message="Notification preferences retrieved successfully",
        data=result
    )


@router.put("/preferences", response_model=SuccessResponse)
async def update_notification_preferences(
    preferences_data: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update user's notification preferences
    
    - **email_connection_requests**: Email notifications for connection requests
    - **email_connection_responses**: Email notifications for connection responses
    - **email_new_messages**: Email notifications for new messages
    - **email_listing_updates**: Email notifications for listing updates
    - **push_connection_requests**: Push notifications for connection requests
    - **push_new_messages**: Push notifications for new messages
    - **notification_frequency**: Notification frequency (immediate, hourly, daily)
    - **quiet_hours_start**: Start of quiet hours (HH:MM format)
    - **quiet_hours_end**: End of quiet hours (HH:MM format)
    """
    notification_bl = NotificationBusinessLogic(db)
    result = await notification_bl.update_notification_preferences(
        current_user, preferences_data
    )
    
    return SuccessResponse(
        success=True,
        message="Notification preferences updated successfully",
        data=result
    )


@router.delete("/{notification_id}", response_model=SuccessResponse)
async def delete_notification(
    notification_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Delete a notification
    """
    notification_bl = NotificationBusinessLogic(db)
    result = await notification_bl.delete_notification(current_user, notification_id)
    
    return SuccessResponse(
        success=True,
        message="Notification deleted successfully",
        data=result
    )


@router.delete("/", response_model=SuccessResponse)
async def delete_all_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Delete all notifications for the current user
    """
    notification_bl = NotificationBusinessLogic(db)
    result = await notification_bl.delete_all_notifications(current_user)
    
    return SuccessResponse(
        success=True,
        message="All notifications deleted successfully",
        data=result
    )