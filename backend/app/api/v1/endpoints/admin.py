"""
Admin API endpoints
"""

from typing import Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....schemas.admin_schemas import (
    AdminDashboardResponse, UserManagementResponse, ListingApprovalRequest,
    UserVerificationRequest, PlatformStatsResponse
)
from ....schemas.common_schemas import SuccessResponse, PaginationParams
from ....business_logic.admin_bl import AdminBusinessLogic
from ....utils.dependencies import get_current_admin
from ....models.user_models import User

router = APIRouter()


@router.get("/dashboard", response_model=SuccessResponse)
async def get_admin_dashboard(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get admin dashboard with platform statistics
    
    Returns comprehensive platform metrics, recent activity, and key performance indicators
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_admin_dashboard()
    
    return SuccessResponse(
        success=True,
        message="Admin dashboard data retrieved successfully",
        data=result
    )


@router.get("/system-status", response_model=SuccessResponse)
async def get_system_status(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get real-time system status including database, API health, and pending items
    
    Returns current system health metrics and status indicators
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_system_status()
    
    return SuccessResponse(
        success=True,
        message="System status retrieved successfully",
        data=result
    )


@router.get("/users", response_model=SuccessResponse)
async def get_users_management(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    user_type: Optional[str] = Query(None, description="Filter by user type"),
    verification_status: Optional[str] = Query(None, description="Filter by verification status"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get users for management
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 20, max: 100)
    - **user_type**: Filter by user type (buyer, seller, admin)
    - **verification_status**: Filter by verification status
    - **search**: Search by name or email
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_users_management(
        page, limit, user_type, verification_status, search
    )
    
    return SuccessResponse(
        success=True,
        message="Users retrieved successfully",
        data=result
    )


@router.get("/users/{user_id}", response_model=SuccessResponse)
async def get_user_details(
    user_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get detailed user information for admin review
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_user_details(user_id)
    
    return SuccessResponse(
        success=True,
        message="User details retrieved successfully",
        data=result
    )


@router.put("/users/{user_id}/verify", response_model=SuccessResponse)
async def verify_user(
    user_id: UUID,
    verification_data: UserVerificationRequest,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Verify or reject user verification
    
    - **status**: Verification status (approved, rejected)
    - **admin_notes**: Admin notes for the verification decision
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.verify_user(current_admin, user_id, verification_data)
    
    return SuccessResponse(
        success=True,
        message="User verification status updated successfully",
        data=result
    )


@router.put("/users/{user_id}/status", response_model=SuccessResponse)
async def update_user_status(
    user_id: UUID,
    is_active: bool = Query(..., description="User active status"),
    admin_notes: Optional[str] = Query(None, description="Admin notes"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update user status (activate/deactivate)
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.update_user_status(
        current_admin, user_id, is_active, admin_notes
    )
    
    return SuccessResponse(
        success=True,
        message="User status updated successfully",
        data=result
    )


@router.get("/listings/pending", response_model=SuccessResponse)
async def get_pending_listings(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get listings pending admin approval
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 20, max: 100)
    - **business_type**: Filter by business type
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_pending_listings(page, limit, business_type)
    
    return SuccessResponse(
        success=True,
        message="Pending listings retrieved successfully",
        data=result
    )


@router.get("/listings/all", response_model=SuccessResponse)
async def get_all_listings(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    business_type: Optional[str] = Query(None, description="Filter by business type"),
    search: Optional[str] = Query(None, description="Search query"),
    sort_by: Optional[str] = Query("created_at", description="Sort field"),
    sort_order: Optional[str] = Query("desc", description="Sort order (asc/desc)"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all listings for admin (all statuses)
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 20, max: 100)
    - **status**: Filter by status (draft, pending_approval, published, rejected)
    - **business_type**: Filter by business type
    - **search**: Search query
    - **sort_by**: Sort field (created_at, title, asking_price, status)
    - **sort_order**: Sort order (asc/desc)
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_all_listings(page, limit, status, business_type, search, sort_by, sort_order)
    
    return SuccessResponse(
        success=True,
        message="All listings retrieved successfully",
        data=result
    )


@router.get("/listings/{listing_id}", response_model=SuccessResponse)
async def get_listing_for_review(
    listing_id: UUID,
    edit_id: Optional[UUID] = Query(None, description="Edit ID for reviewing listing changes"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get detailed listing information for admin review
    
    - **listing_id**: ID of the listing to review
    - **edit_id**: Optional ID of the listing edit to review (for published listing changes)
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_listing_for_review(listing_id, edit_id)
    
    return SuccessResponse(
        success=True,
        message="Listing details retrieved successfully",
        data=result
    )


@router.put("/listings/{listing_id}/approve", response_model=SuccessResponse)
async def approve_or_reject_listing(
    listing_id: UUID,
    approval_data: ListingApprovalRequest,
    edit_id: Optional[UUID] = Query(None, description="Edit ID for approving listing changes"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Approve or reject a listing or listing edit
    
    - **listing_id**: ID of the listing to approve/reject
    - **edit_id**: Optional ID of the listing edit to approve/reject (for published listing changes)
    - **status**: Approval status (approved, rejected)
    - **admin_notes**: Admin notes for the decision
    - **rejection_reason**: Reason for rejection (if applicable)
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.approve_or_reject_listing(
        current_admin, listing_id, approval_data, edit_id
    )
    
    return SuccessResponse(
        success=True,
        message="Listing status updated successfully",
        data=result
    )


@router.get("/analytics/platform", response_model=SuccessResponse)
async def get_platform_analytics(
    period: str = Query("30d", description="Analytics period (7d, 30d, 90d, 1y)"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get platform analytics and statistics
    
    - **period**: Time period for analytics (7d, 30d, 90d, 1y)
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_platform_analytics(period)
    
    return SuccessResponse(
        success=True,
        message="Platform analytics retrieved successfully",
        data=result
    )


@router.get("/analytics/revenue", response_model=SuccessResponse)
async def get_revenue_analytics(
    period: str = Query("30d", description="Analytics period (7d, 30d, 90d, 1y)"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get revenue analytics and subscription metrics
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_revenue_analytics(period)
    
    return SuccessResponse(
        success=True,
        message="Revenue analytics retrieved successfully",
        data=result
    )


@router.get("/service-requests", response_model=SuccessResponse)
async def get_admin_service_requests(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    service_type: Optional[str] = Query(None, description="Filter by service type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    urgency: Optional[str] = Query(None, description="Filter by urgency"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get service requests for admin management
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_admin_service_requests(
        page, limit, service_type, status, urgency
    )
    
    return SuccessResponse(
        success=True,
        message="Service requests retrieved successfully",
        data=result
    )


@router.get("/notifications/system", response_model=SuccessResponse)
async def get_system_notifications(
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get system-wide notifications and alerts for admin
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_system_notifications()
    
    return SuccessResponse(
        success=True,
        message="System notifications retrieved successfully",
        data=result
    )


@router.post("/notifications/broadcast", response_model=SuccessResponse)
async def broadcast_notification(
    title: str = Query(..., description="Notification title"),
    message: str = Query(..., description="Notification message"),
    user_type: Optional[str] = Query(None, description="Target user type (all, buyers, sellers)"),
    send_email: bool = Query(False, description="Send email notification"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Broadcast notification to users
    
    - **title**: Notification title
    - **message**: Notification message
    - **user_type**: Target user type (all, buyers, sellers)
    - **send_email**: Whether to send email notifications
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.broadcast_notification(
        current_admin, title, message, user_type, send_email
    )
    
    return SuccessResponse(
        success=True,
        message="Notification broadcast successfully",
        data=result
    )


@router.get("/logs/activity", response_model=SuccessResponse)
async def get_activity_logs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=200, description="Items per page"),
    user_id: Optional[UUID] = Query(None, description="Filter by user ID"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get platform activity logs
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.get_activity_logs(page, limit, user_id, action_type)
    
    return SuccessResponse(
        success=True,
        message="Activity logs retrieved successfully",
        data=result
    )


@router.get("/export/users", response_model=SuccessResponse)
async def export_users_data(
    format: str = Query("csv", description="Export format (csv, xlsx)"),
    user_type: Optional[str] = Query(None, description="Filter by user type"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Export users data for analysis
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.export_users_data(format, user_type)
    
    return SuccessResponse(
        success=True,
        message="Users data exported successfully",
        data=result
    )


@router.get("/export/listings", response_model=SuccessResponse)
async def export_listings_data(
    format: str = Query("csv", description="Export format (csv, xlsx)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Export listings data for analysis
    """
    admin_bl = AdminBusinessLogic(db)
    result = await admin_bl.export_listings_data(format, status)
    
    return SuccessResponse(
        success=True,
        message="Listings data exported successfully",
        data=result
    )


@router.get("/listings/{listing_id}/connections", response_model=SuccessResponse)
async def get_listing_connections(
    listing_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get all connections for a specific listing (Admin only)
    
    - **listing_id**: ID of the listing
    - Returns all connection requests for the listing with buyer details
    """
    from ....models.connection_models import Connection
    from ....models.user_models import User, Buyer
    
    # Get all connections for the listing
    connections = db.query(Connection).filter(
        Connection.listing_id == listing_id
    ).order_by(Connection.requested_at.desc()).all()
    
    connection_data = []
    for conn in connections:
        # Get buyer details
        buyer = db.query(Buyer).filter(Buyer.id == conn.buyer_id).first()
        buyer_user = None
        if buyer:
            buyer_user = db.query(User).filter(User.id == buyer.user_id).first()
        
        connection_info = {
            "id": str(conn.id),
            "status": conn.status,
            "initial_message": conn.initial_message,
            "response_message": conn.response_message,
            "seller_initiated": conn.seller_initiated,
            "requested_at": conn.requested_at.isoformat() if conn.requested_at else None,
            "responded_at": conn.responded_at.isoformat() if conn.responded_at else None,
            "last_activity": conn.last_activity.isoformat() if conn.last_activity else None,
            "buyer": {
                "id": str(buyer.id) if buyer else None,
                "name": f"{buyer_user.first_name} {buyer_user.last_name}".strip() if buyer_user else "Unknown",
                "email": buyer_user.email if buyer_user else "Unknown",
                "phone": buyer_user.phone if buyer_user else None
            } if buyer else None
        }
        connection_data.append(connection_info)
    
    return SuccessResponse(
        success=True,
        message="Listing connections retrieved successfully",
        data={
            "listing_id": str(listing_id),
            "connections": connection_data,
            "total_connections": len(connection_data)
        }
    )


@router.get("/users/{user_id}/analytics", response_model=SuccessResponse)
async def get_user_analytics(
    user_id: UUID,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get detailed analytics for a specific user (Admin only)
    
    - **user_id**: ID of the user
    - Returns comprehensive analytics based on user type (buyer/seller)
    """
    from ....business_logic.analytics_bl import AnalyticsBusinessLogic
    from ....models.user_models import User as UserModel
    
    # Get user details
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    analytics_bl = AnalyticsBusinessLogic(db)
    
    try:
        if user.user_type == "buyer":
            analytics_data = await analytics_bl.get_buyer_analytics(user_id)
        elif user.user_type == "seller":
            analytics_data = await analytics_bl.get_seller_analytics(user_id)
        else:
            # For admin users, return basic info
            analytics_data = {
                "user_type": "admin",
                "message": "Analytics not available for admin users"
            }
        
        return SuccessResponse(
            success=True,
            message=f"{user.user_type.title()} analytics retrieved successfully",
            data=analytics_data
        )
        
    except Exception as e:
        logger.error(f"Error getting user analytics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve user analytics"
        )