"""
Connection management API endpoints
"""

from typing import Any, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ....core.database import get_db
from ....schemas.connection_schemas import (
    ConnectionCreate, ConnectionResponse, ConnectionUpdate, MessageCreate, MessageResponse
)
from ....schemas.common_schemas import SuccessResponse, PaginationParams
from ....business_logic.connection_bl import ConnectionBusinessLogic
from ....utils.dependencies import (
    get_current_user, get_current_buyer, get_current_seller
)
from ....models.user_models import User

router = APIRouter()


class ConnectionStatusUpdate(BaseModel):
    status: str
    response_message: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "status": "approved",
                "response_message": "Happy to connect with you!"
            }
        }


class SellerToBuyerConnectionRequest(BaseModel):
    buyer_id: UUID
    message: str
    
    class Config:
        schema_extra = {
            "example": {
                "buyer_id": "4e437c36-24e3-4a84-9c04-5681491a7c63",
                "message": "Hi Jane Buyer, I noticed you viewed my listing. I'd love to discuss this opportunity with you."
            }
        }


@router.post("/", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def create_connection_request(
    connection_data: ConnectionCreate,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Create a connection request (Buyers only)
    
    - **listing_id**: ID of the listing to connect with
    - **initial_message**: Initial message to the seller
    
    Requires active subscription with available connections.
    If a previous connection was rejected, this will create a new request and consume another connection.
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.create_connection_request(
        current_buyer, connection_data
    )
    
    return SuccessResponse(
        success=True,
        message="Connection request sent successfully",
        data=result
    )


@router.get("/", response_model=SuccessResponse)
async def get_user_connections(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get user's connections (both sent and received)
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 20, max: 100)
    - **status**: Filter by connection status (pending, accepted, rejected, blocked)
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.get_user_connections(
        current_user, page, limit, status_filter
    )
    
    return SuccessResponse(
        success=True,
        message="Connections retrieved successfully",
        data=result
    )


@router.get("/{connection_id}", response_model=SuccessResponse)
async def get_connection_detail(
    connection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get detailed connection information
    
    Returns connection details with message history
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.get_connection_detail(current_user, connection_id)
    
    return SuccessResponse(
        success=True,
        message="Connection details retrieved successfully",
        data=result
    )


@router.put("/{connection_id}/respond", response_model=SuccessResponse)
async def respond_to_connection(
    connection_id: UUID,
    response_data: ConnectionUpdate,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Respond to a connection request (Sellers only)
    
    - **status**: Response status (accepted, rejected)
    - **response_message**: Optional response message
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.respond_to_connection(
        current_seller, connection_id, response_data
    )
    
    return SuccessResponse(
        success=True,
        message="Connection response sent successfully",
        data=result
    )


@router.post("/{connection_id}/messages", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    connection_id: UUID,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Send a message in a connection
    
    - **content**: Message content
    - **message_type**: Type of message (text, file)
    
    Only available for accepted connections
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.send_message(
        current_user, connection_id, message_data
    )
    
    return SuccessResponse(
        success=True,
        message="Message sent successfully",
        data=result
    )


@router.get("/{connection_id}/messages", response_model=SuccessResponse)
async def get_connection_messages(
    connection_id: UUID,
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(50, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get messages for a connection
    
    - **page**: Page number (default: 1)
    - **limit**: Items per page (default: 50, max: 100)
    
    Returns paginated message history
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.get_connection_messages(
        current_user, connection_id, page, limit
    )
    
    return SuccessResponse(
        success=True,
        message="Messages retrieved successfully",
        data=result
    )


@router.put("/{connection_id}/messages/{message_id}/read", response_model=SuccessResponse)
async def mark_message_as_read(
    connection_id: UUID,
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Mark a message as read
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.mark_message_as_read(
        current_user, connection_id, message_id
    )
    
    return SuccessResponse(
        success=True,
        message="Message marked as read",
        data=result
    )


@router.put("/{connection_id}/block", response_model=SuccessResponse)
async def block_connection(
    connection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Block a connection
    
    Prevents further communication between the parties
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.block_connection(current_user, connection_id)
    
    return SuccessResponse(
        success=True,
        message="Connection blocked successfully",
        data=result
    )


@router.get("/buyer/requests", response_model=SuccessResponse)
async def get_buyer_requests(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get buyer's sent connection requests
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.get_buyer_requests(current_buyer, page, limit)
    
    return SuccessResponse(
        success=True,
        message="Buyer requests retrieved successfully",
        data=result
    )


@router.get("/seller/requests", response_model=SuccessResponse)
async def get_seller_requests(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: Optional[str] = Query(None, description="Filter by status"),
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get seller's received connection requests
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = await connection_bl.get_seller_requests(
        current_seller, page, limit, status_filter
    )
    
    return SuccessResponse(
        success=True,
        message="Seller requests retrieved successfully",
        data=result
    )


@router.get("/status/{listing_id}", response_model=SuccessResponse)
def get_connection_status(
    listing_id: UUID,
    current_buyer: User = Depends(get_current_buyer),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get connection status for a specific listing (Buyers only)
    
    Returns:
    - has_connection: Whether a connection exists
    - status: Connection status (pending/approved/rejected)
    - connection_id: ID of the connection if exists
    - can_connect: Whether buyer can send a new connection request
    - reason: Reason if can't connect
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = connection_bl.get_connection_status_for_listing(
        current_buyer, listing_id
    )
    
    return SuccessResponse(
        success=True,
        message="Connection status retrieved successfully",
        data=result
    )


@router.post("/seller-to-buyer", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
def send_seller_to_buyer_connection(
    request_data: SellerToBuyerConnectionRequest,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Send connection request from seller to buyer (Sellers only)
    
    - **buyer_id**: ID of the buyer to connect with
    - **message**: Message to send with the connection request
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = connection_bl.send_seller_to_buyer_connection(
        current_seller, request_data.buyer_id, request_data.message
    )
    
    return SuccessResponse(
        success=True,
        message="Connection request sent to buyer successfully",
        data=result
    )


@router.get("/check-seller-buyer/{buyer_id}", response_model=SuccessResponse)
def check_seller_buyer_connection(
    buyer_id: UUID,
    current_seller: User = Depends(get_current_seller),
    db: Session = Depends(get_db)
) -> Any:
    """
    Check if connection exists between current seller and specified buyer
    
    - **buyer_id**: ID of the buyer to check connection with
    
    Returns connection status if exists, or indicates no connection
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = connection_bl.check_seller_buyer_connection(current_seller, buyer_id)
    
    return SuccessResponse(
        success=True,
        message="Connection status retrieved successfully",
        data=result
    )


@router.put("/{connection_id}/status", response_model=SuccessResponse)
async def update_connection_status(
    connection_id: UUID,
    status_data: ConnectionStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Update connection status (approve/reject)
    
    - **connection_id**: ID of the connection to update
    - **status_data**: Request body containing status and optional response_message
    """
    connection_bl = ConnectionBusinessLogic(db)
    result = connection_bl.update_connection_status(
        current_user, connection_id, status_data.status, status_data.response_message
    )
    
    return SuccessResponse(
        success=True,
        message="Connection status updated successfully",
        data=result
    )