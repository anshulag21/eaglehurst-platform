"""
User blocking models
"""

from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base
from ..core.types import UUID


class UserBlock(Base):
    __tablename__ = "user_blocks"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    blocker_id = Column(UUID(), ForeignKey("users.id"), nullable=False)  # User who is blocking
    blocked_id = Column(UUID(), ForeignKey("users.id"), nullable=False)  # User being blocked
    reason = Column(String(255), nullable=True)  # Optional reason for blocking
    admin_notes = Column(Text, nullable=True)  # Admin notes if block was done by admin
    is_active = Column(Boolean, default=True)  # Can be used to temporarily disable blocks
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    blocker = relationship("User", foreign_keys=[blocker_id], back_populates="blocks_made")
    blocked_user = relationship("User", foreign_keys=[blocked_id], back_populates="blocks_received")
    
    def __repr__(self):
        return f"<UserBlock {self.blocker_id} -> {self.blocked_id}>"

    class Config:
        # Ensure unique constraint - one user can only block another user once
        __table_args__ = (
            {"sqlite_autoincrement": True},
        )
