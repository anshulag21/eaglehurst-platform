"""
Connection and messaging related database models
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Integer
from ..core.types import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base
from ..core.constants import ConnectionStatus, MessageType


class Connection(Base):
    __tablename__ = "connections"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    buyer_id = Column(UUID(), ForeignKey("buyers.id"), nullable=False)
    seller_id = Column(UUID(), ForeignKey("sellers.id"), nullable=False)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=True)  # Nullable for seller-initiated connections
    
    # Connection Details
    status = Column(String(20), default=ConnectionStatus.PENDING)
    initial_message = Column(Text, nullable=True)  # Initial message (from buyer or seller)
    response_message = Column(Text, nullable=True)  # Response message
    seller_initiated = Column(Boolean, default=False)  # Track if seller initiated the connection
    
    # Timestamps
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)
    last_activity = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    buyer = relationship("Buyer", back_populates="connections")
    seller = relationship("Seller", back_populates="connections")
    listing = relationship("Listing", back_populates="connections")
    messages = relationship("Message", back_populates="connection", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Connection {self.buyer_id}-{self.seller_id}>"


class Message(Base):
    __tablename__ = "messages"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(), ForeignKey("connections.id"), nullable=False)
    sender_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    
    # Message Content
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default=MessageType.TEXT)
    
    # File Attachments (for file type messages)
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(100), nullable=True)
    
    # Message Status
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    connection = relationship("Connection", back_populates="messages")
    sender = relationship("User", back_populates="sent_messages")
    
    def __repr__(self):
        return f"<Message {self.id}>"


class MessageRead(Base):
    __tablename__ = "message_reads"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(), ForeignKey("messages.id"), nullable=False)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    read_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    message = relationship("Message")
    user = relationship("User")
    
    def __repr__(self):
        return f"<MessageRead {self.message_id}-{self.user_id}>"


class ConnectionNote(Base):
    __tablename__ = "connection_notes"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(), ForeignKey("connections.id"), nullable=False)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    
    # Note Content
    note = Column(Text, nullable=False)
    is_private = Column(Boolean, default=True)  # Private notes only visible to the user
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    connection = relationship("Connection")
    user = relationship("User")
    
    def __repr__(self):
        return f"<ConnectionNote {self.connection_id}-{self.user_id}>"
