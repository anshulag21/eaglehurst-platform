"""
User blocking API endpoints
"""

from typing import Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ....core.database import get_db
from ....schemas.blocking_schemas import (
    BlockUserRequest, UnblockUserRequest, BlockUserResponse, 
    UnblockUserResponse, BlockedUsersListResponse, BlockStatusResponse
)
from ....schemas.common_schemas import SuccessResponse
from ....business_logic.blocking_bl import BlockingBusinessLogic
from ....utils.dependencies import get_current_user
from ....models.user_models import User

router = APIRouter()


@router.post("/block", response_model=SuccessResponse, status_code=status.HTTP_201_CREATED)
async def block_user(
    block_request: BlockUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Block a user
    
    - **blocked_user_id**: ID of the user to block
    - **reason**: Optional reason for blocking
    """
    blocking_bl = BlockingBusinessLogic(db)
    result = await blocking_bl.block_user(
        blocker_id=current_user.id,
        blocked_id=block_request.blocked_user_id,
        reason=block_request.reason
    )
    
    return SuccessResponse(
        success=True,
        message="User blocked successfully",
        data=result
    )


@router.post("/unblock", response_model=SuccessResponse)
async def unblock_user(
    unblock_request: UnblockUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Unblock a user
    
    - **blocked_user_id**: ID of the user to unblock
    """
    blocking_bl = BlockingBusinessLogic(db)
    result = await blocking_bl.unblock_user(
        blocker_id=current_user.id,
        blocked_id=unblock_request.blocked_user_id
    )
    
    return SuccessResponse(
        success=True,
        message="User unblocked successfully",
        data=result
    )


@router.get("/blocked-users", response_model=SuccessResponse)
async def get_blocked_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Get list of users blocked by the current user
    """
    blocking_bl = BlockingBusinessLogic(db)
    result = await blocking_bl.get_blocked_users(current_user.id)
    
    return SuccessResponse(
        success=True,
        message="Blocked users retrieved successfully",
        data=result
    )


@router.get("/status/{user_id}", response_model=SuccessResponse)
async def check_block_status(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> Any:
    """
    Check blocking status between current user and another user
    
    - **user_id**: ID of the other user to check blocking status with
    """
    blocking_bl = BlockingBusinessLogic(db)
    result = blocking_bl.are_users_blocking_each_other(current_user.id, user_id)
    
    return SuccessResponse(
        success=True,
        message="Block status retrieved successfully",
        data=result
    )
