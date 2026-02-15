"""
Connection and messaging related Pydantic schemas
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID

from ..core.constants import ConnectionStatus, MessageType
from .common_schemas import PaginationParams


# Connection Schemas
class ConnectionRequest(BaseModel):
    """Schema for creating a connection request"""
    listing_id: UUID = Field(..., description="ID of the listing to connect to")
    initial_message: Optional[str] = Field(None, max_length=1000, description="Initial message to seller")


class ConnectionCreate(BaseModel):
    """Schema for creating a connection request"""
    listing_id: UUID = Field(..., description="ID of the listing to connect to")
    initial_message: Optional[str] = Field(None, max_length=1000, description="Initial message to seller")


class ConnectionUpdate(BaseModel):
    """Schema for updating connection status"""
    status: ConnectionStatus = Field(..., description="Connection status (accepted/rejected)")
    response_message: Optional[str] = Field(None, max_length=1000, description="Response message")


class ConnectionResponse(BaseModel):
    """Schema for connection response"""
    status: ConnectionStatus = Field(..., description="Connection status (approved/rejected)")
    response_message: Optional[str] = Field(None, max_length=1000, description="Response message")


class ConnectionSchema(BaseModel):
    """Schema for connection information"""
    id: UUID = Field(..., description="Connection ID")
    buyer_id: UUID = Field(..., description="Buyer ID")
    seller_id: UUID = Field(..., description="Seller ID")
    listing_id: UUID = Field(..., description="Listing ID")
    status: ConnectionStatus = Field(..., description="Connection status")
    initial_message: Optional[str] = Field(None, description="Initial message from buyer")
    response_message: Optional[str] = Field(None, description="Response message from seller")
    requested_at: datetime = Field(..., description="When connection was requested")
    responded_at: Optional[datetime] = Field(None, description="When connection was responded to")
    last_activity: datetime = Field(..., description="Last activity timestamp")
    
    # Related information
    listing: Optional[Dict[str, Any]] = Field(None, description="Listing information")
    other_party: Optional[Dict[str, Any]] = Field(None, description="Other party information")
    unread_messages: int = Field(0, description="Number of unread messages")
    last_message: Optional[Dict[str, Any]] = Field(None, description="Last message preview")
    
    class Config:
        from_attributes = True


class ConnectionListResponse(BaseModel):
    """Schema for connection list response"""
    connections: List[ConnectionSchema] = Field(..., description="List of connections")
    total_count: int = Field(..., description="Total number of connections")
    pending_count: int = Field(..., description="Number of pending connections")
    approved_count: int = Field(..., description="Number of approved connections")


# Message Schemas
class MessageCreate(BaseModel):
    """Schema for creating a new message"""
    content: str = Field(..., min_length=1, max_length=5000, description="Message content")
    message_type: MessageType = Field(MessageType.TEXT, description="Message type")
    
    # For file messages
    file_url: Optional[str] = Field(None, description="File URL for file messages")
    file_name: Optional[str] = Field(None, description="Original file name")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    file_type: Optional[str] = Field(None, description="File MIME type")


class MessageSchema(BaseModel):
    """Schema for message information"""
    id: UUID = Field(..., description="Message ID")
    connection_id: UUID = Field(..., description="Connection ID")
    sender_id: UUID = Field(..., description="Sender user ID")
    content: str = Field(..., description="Message content")
    message_type: MessageType = Field(..., description="Message type")
    
    # File information (for file messages)
    file_url: Optional[str] = Field(None, description="File URL")
    file_name: Optional[str] = Field(None, description="File name")
    file_size: Optional[int] = Field(None, description="File size")
    file_type: Optional[str] = Field(None, description="File type")
    
    # Message status
    is_read: bool = Field(..., description="Whether message is read")
    read_at: Optional[datetime] = Field(None, description="When message was read")
    is_edited: bool = Field(..., description="Whether message was edited")
    edited_at: Optional[datetime] = Field(None, description="When message was edited")
    
    # Sender information
    sender_name: Optional[str] = Field(None, description="Sender name")
    sender_type: Optional[str] = Field(None, description="Sender user type")
    
    # Timestamp
    created_at: datetime = Field(..., description="Message creation timestamp")
    
    class Config:
        from_attributes = True


class MessageListParams(PaginationParams):
    """Schema for message list parameters"""
    before_message_id: Optional[UUID] = Field(None, description="Get messages before this message ID")
    after_message_id: Optional[UUID] = Field(None, description="Get messages after this message ID")


class MessageListResponse(BaseModel):
    """Schema for message list response"""
    messages: List[MessageSchema] = Field(..., description="List of messages")
    total_count: int = Field(..., description="Total number of messages")
    unread_count: int = Field(..., description="Number of unread messages")
    has_more: bool = Field(..., description="Whether there are more messages")


class MessageReadUpdate(BaseModel):
    """Schema for marking messages as read"""
    message_ids: List[UUID] = Field(..., description="List of message IDs to mark as read")


class MessageEditRequest(BaseModel):
    """Schema for editing a message"""
    content: str = Field(..., min_length=1, max_length=5000, description="New message content")


# Connection Note Schemas
class ConnectionNoteCreate(BaseModel):
    """Schema for creating a connection note"""
    note: str = Field(..., min_length=1, max_length=2000, description="Note content")
    is_private: bool = Field(True, description="Whether note is private to the user")


class ConnectionNoteUpdate(BaseModel):
    """Schema for updating a connection note"""
    note: str = Field(..., min_length=1, max_length=2000, description="Updated note content")


class ConnectionNoteSchema(BaseModel):
    """Schema for connection note information"""
    id: UUID = Field(..., description="Note ID")
    connection_id: UUID = Field(..., description="Connection ID")
    user_id: UUID = Field(..., description="User ID who created the note")
    note: str = Field(..., description="Note content")
    is_private: bool = Field(..., description="Whether note is private")
    created_at: datetime = Field(..., description="Note creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Note update timestamp")
    
    class Config:
        from_attributes = True


# Chat Interface Schemas
class ChatRoomSchema(BaseModel):
    """Schema for chat room information"""
    connection_id: UUID = Field(..., description="Connection ID")
    listing_title: str = Field(..., description="Listing title")
    other_party_name: str = Field(..., description="Other party name")
    other_party_type: str = Field(..., description="Other party user type")
    other_party_avatar: Optional[str] = Field(None, description="Other party avatar URL")
    last_message: Optional[MessageSchema] = Field(None, description="Last message")
    unread_count: int = Field(..., description="Number of unread messages")
    is_online: bool = Field(False, description="Whether other party is online")
    connection_status: ConnectionStatus = Field(..., description="Connection status")


class ChatHistoryParams(BaseModel):
    """Schema for chat history parameters"""
    limit: int = Field(50, ge=1, le=100, description="Number of messages to retrieve")
    before_timestamp: Optional[datetime] = Field(None, description="Get messages before this timestamp")
    after_timestamp: Optional[datetime] = Field(None, description="Get messages after this timestamp")


class TypingIndicator(BaseModel):
    """Schema for typing indicator"""
    connection_id: UUID = Field(..., description="Connection ID")
    is_typing: bool = Field(..., description="Whether user is typing")


class OnlineStatus(BaseModel):
    """Schema for online status"""
    user_id: UUID = Field(..., description="User ID")
    is_online: bool = Field(..., description="Whether user is online")
    last_seen: Optional[datetime] = Field(None, description="Last seen timestamp")


# WebSocket Message Schemas
class WebSocketMessage(BaseModel):
    """Schema for WebSocket messages"""
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(..., description="Message data")
    timestamp: datetime = Field(..., description="Message timestamp")


class ConnectionNotification(BaseModel):
    """Schema for connection-related notifications"""
    connection_id: UUID = Field(..., description="Connection ID")
    notification_type: str = Field(..., description="Notification type")
    message: str = Field(..., description="Notification message")
    data: Optional[Dict[str, Any]] = Field(None, description="Additional notification data")


# Additional Message Schemas - MessageCreate is already defined above


class MessageResponse(BaseModel):
    """Schema for message response"""
    id: UUID = Field(..., description="Message ID")
    connection_id: UUID = Field(..., description="Connection ID")
    sender_id: UUID = Field(..., description="Sender user ID")
    content: str = Field(..., description="Message content")
    message_type: MessageType = Field(..., description="Message type")
    is_read: bool = Field(..., description="Whether message is read")
    created_at: datetime = Field(..., description="Message creation timestamp")
    read_at: Optional[datetime] = Field(None, description="Message read timestamp")
