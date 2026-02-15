"""
User blocking business logic
"""

from typing import Any, Dict, List, Optional
from uuid import UUID
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from ..models.user_models import User
from ..models.blocking_models import UserBlock
from ..core.constants import UserType
import logging

logger = logging.getLogger(__name__)


class BlockingBusinessLogic:
    def __init__(self, db: Session):
        self.db = db

    async def block_user(self, blocker_id: UUID, blocked_id: UUID, reason: Optional[str] = None) -> Dict[str, Any]:
        """Block a user"""
        try:
            # Prevent self-blocking
            if blocker_id == blocked_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot block yourself"
                )

            # Check if users exist
            blocker = self.db.query(User).filter(User.id == blocker_id).first()
            blocked_user = self.db.query(User).filter(User.id == blocked_id).first()

            if not blocker or not blocked_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="User not found"
                )

            # Check if block already exists
            existing_block = self.db.query(UserBlock).filter(
                and_(
                    UserBlock.blocker_id == blocker_id,
                    UserBlock.blocked_id == blocked_id,
                    UserBlock.is_active == True
                )
            ).first()

            if existing_block:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User is already blocked"
                )

            # Create new block
            new_block = UserBlock(
                blocker_id=blocker_id,
                blocked_id=blocked_id,
                reason=reason,
                is_active=True
            )

            self.db.add(new_block)
            self.db.commit()
            self.db.refresh(new_block)

            logger.info(f"User {blocker_id} blocked user {blocked_id}")

            return {
                "id": new_block.id,
                "blocked_user_id": blocked_id,
                "blocked_user_name": f"{blocked_user.first_name} {blocked_user.last_name}",
                "reason": reason,
                "created_at": new_block.created_at,
                "message": "User blocked successfully"
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error blocking user: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to block user"
            )

    async def unblock_user(self, blocker_id: UUID, blocked_id: UUID) -> Dict[str, Any]:
        """Unblock a user"""
        try:
            # Find the active block
            block = self.db.query(UserBlock).filter(
                and_(
                    UserBlock.blocker_id == blocker_id,
                    UserBlock.blocked_id == blocked_id,
                    UserBlock.is_active == True
                )
            ).first()

            if not block:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Block not found or user is not blocked"
                )

            # Deactivate the block instead of deleting it (for audit trail)
            block.is_active = False
            self.db.commit()

            logger.info(f"User {blocker_id} unblocked user {blocked_id}")

            return {
                "blocked_user_id": blocked_id,
                "message": "User unblocked successfully"
            }

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error unblocking user: {e}")
            self.db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to unblock user"
            )

    async def get_blocked_users(self, user_id: UUID) -> Dict[str, Any]:
        """Get list of users blocked by the current user"""
        try:
            blocks = self.db.query(UserBlock).filter(
                and_(
                    UserBlock.blocker_id == user_id,
                    UserBlock.is_active == True
                )
            ).all()

            blocked_users = []
            for block in blocks:
                blocked_user = self.db.query(User).filter(User.id == block.blocked_id).first()
                if blocked_user:
                    blocked_users.append({
                        "id": blocked_user.id,
                        "first_name": blocked_user.first_name,
                        "last_name": blocked_user.last_name,
                        "email": blocked_user.email,
                        "user_type": blocked_user.user_type,
                        "blocked_at": block.created_at,
                        "reason": block.reason
                    })

            return {
                "blocked_users": blocked_users,
                "total_blocked": len(blocked_users)
            }

        except Exception as e:
            logger.error(f"Error getting blocked users: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve blocked users"
            )

    def is_user_blocked(self, blocker_id: UUID, blocked_id: UUID) -> bool:
        """Check if a user is blocked by another user"""
        try:
            block = self.db.query(UserBlock).filter(
                and_(
                    UserBlock.blocker_id == blocker_id,
                    UserBlock.blocked_id == blocked_id,
                    UserBlock.is_active == True
                )
            ).first()

            return block is not None

        except Exception as e:
            logger.error(f"Error checking if user is blocked: {e}")
            return False

    def is_blocked_by_user(self, user_id: UUID, potential_blocker_id: UUID) -> bool:
        """Check if a user is blocked by another user (reverse check)"""
        try:
            block = self.db.query(UserBlock).filter(
                and_(
                    UserBlock.blocker_id == potential_blocker_id,
                    UserBlock.blocked_id == user_id,
                    UserBlock.is_active == True
                )
            ).first()

            return block is not None

        except Exception as e:
            logger.error(f"Error checking if blocked by user: {e}")
            return False

    def are_users_blocking_each_other(self, user1_id: UUID, user2_id: UUID) -> Dict[str, bool]:
        """Check if two users are blocking each other"""
        try:
            user1_blocks_user2 = self.is_user_blocked(user1_id, user2_id)
            user2_blocks_user1 = self.is_user_blocked(user2_id, user1_id)

            return {
                "user1_blocks_user2": user1_blocks_user2,
                "user2_blocks_user1": user2_blocks_user1,
                "any_blocking": user1_blocks_user2 or user2_blocks_user1
            }

        except Exception as e:
            logger.error(f"Error checking mutual blocking: {e}")
            return {
                "user1_blocks_user2": False,
                "user2_blocks_user1": False,
                "any_blocking": False
            }
