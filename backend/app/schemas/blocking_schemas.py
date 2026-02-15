"""
Blocking-related Pydantic schemas
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from uuid import UUID


class BlockUserRequest(BaseModel):
    """Request schema for blocking a user"""
    blocked_user_id: UUID = Field(..., description="ID of the user to block")
    reason: Optional[str] = Field(None, max_length=255, description="Optional reason for blocking")


class UnblockUserRequest(BaseModel):
    """Request schema for unblocking a user"""
    blocked_user_id: UUID = Field(..., description="ID of the user to unblock")


class BlockedUserResponse(BaseModel):
    """Response schema for a blocked user"""
    id: UUID
    first_name: str
    last_name: str
    email: str
    user_type: str
    blocked_at: datetime
    reason: Optional[str] = None


class BlockedUsersListResponse(BaseModel):
    """Response schema for list of blocked users"""
    blocked_users: List[BlockedUserResponse]
    total_blocked: int


class BlockUserResponse(BaseModel):
    """Response schema for blocking a user"""
    id: UUID
    blocked_user_id: UUID
    blocked_user_name: str
    reason: Optional[str] = None
    created_at: datetime
    message: str


class UnblockUserResponse(BaseModel):
    """Response schema for unblocking a user"""
    blocked_user_id: UUID
    message: str


class BlockStatusResponse(BaseModel):
    """Response schema for checking block status between users"""
    user1_blocks_user2: bool
    user2_blocks_user1: bool
    any_blocking: bool
