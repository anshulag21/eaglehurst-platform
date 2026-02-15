"""
Service request related database models
"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Numeric, JSON, Boolean
from ..core.types import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base
from ..core.constants import ServiceType, ServiceRequestStatus


class ServiceRequest(Base):
    """Service requests for legal and valuation services"""
    __tablename__ = "service_requests"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=True)  # Optional if related to specific listing
    
    # Service Details
    service_type = Column(String(20), nullable=False)  # legal, valuation
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    urgency = Column(String(10), default="medium")  # low, medium, high
    
    # Contact Preferences
    preferred_contact_method = Column(String(20), default="email")  # email, phone
    contact_phone = Column(String(20), nullable=True)
    contact_email = Column(String(255), nullable=True)
    
    # Service Specific Data
    service_details = Column(JSON, nullable=True)  # Flexible field for service-specific information
    
    # Pricing and Payment
    estimated_cost = Column(Numeric(10, 2), nullable=True)
    final_cost = Column(Numeric(10, 2), nullable=True)
    commission_rate = Column(Numeric(5, 2), nullable=True)  # Percentage
    commission_amount = Column(Numeric(10, 2), nullable=True)
    
    # Status and Progress
    status = Column(String(20), default=ServiceRequestStatus.PENDING)
    admin_assigned_id = Column(UUID(), ForeignKey("users.id"), nullable=True)
    
    # Admin Notes and Communication
    admin_notes = Column(Text, nullable=True)
    internal_notes = Column(Text, nullable=True)  # Internal admin notes
    client_feedback = Column(Text, nullable=True)
    
    # Timestamps
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="service_requests")
    listing = relationship("Listing")
    admin_assigned = relationship("User", foreign_keys=[admin_assigned_id])
    communications = relationship("ServiceCommunication", back_populates="service_request", cascade="all, delete-orphan")
    documents = relationship("ServiceDocument", back_populates="service_request", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ServiceRequest {self.service_type}: {self.title}>"


class ServiceCommunication(Base):
    """Communication history for service requests"""
    __tablename__ = "service_communications"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    service_request_id = Column(UUID(), ForeignKey("service_requests.id"), nullable=False)
    sender_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    
    # Communication Details
    communication_type = Column(String(20), nullable=False)  # email, phone, meeting, note
    subject = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    
    # Communication Metadata
    is_internal = Column(Boolean, default=False)  # Internal admin communication
    is_client_visible = Column(Boolean, default=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    service_request = relationship("ServiceRequest", back_populates="communications")
    sender = relationship("User")
    
    def __repr__(self):
        return f"<ServiceCommunication {self.communication_type}>"


class ServiceDocument(Base):
    """Documents related to service requests"""
    __tablename__ = "service_documents"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    service_request_id = Column(UUID(), ForeignKey("service_requests.id"), nullable=False)
    uploaded_by_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    
    # Document Details
    file_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_size = Column(String(20), nullable=True)  # Size in bytes
    file_type = Column(String(100), nullable=True)  # MIME type
    document_type = Column(String(50), nullable=True)  # contract, report, invoice, etc.
    
    # Document Metadata
    description = Column(Text, nullable=True)
    is_confidential = Column(Boolean, default=False)
    is_client_accessible = Column(Boolean, default=True)
    
    # Timestamps
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    service_request = relationship("ServiceRequest", back_populates="documents")
    uploaded_by = relationship("User")
    
    def __repr__(self):
        return f"<ServiceDocument {self.file_name}>"


class ServiceTemplate(Base):
    """Templates for different types of service requests"""
    __tablename__ = "service_templates"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    
    # Template Details
    service_type = Column(String(20), nullable=False)  # legal, valuation
    template_name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Template Content
    form_fields = Column(JSON, nullable=False)  # Define form fields and validation
    default_pricing = Column(Numeric(10, 2), nullable=True)
    estimated_duration = Column(String(50), nullable=True)  # "2-3 weeks", "1 month", etc.
    
    # Template Settings
    is_active = Column(Boolean, default=True)
    display_order = Column(String(3), default="0")
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<ServiceTemplate {self.template_name}>"


class ServiceProvider(Base):
    """External service providers for legal and valuation services"""
    __tablename__ = "service_providers"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    
    # Provider Details
    company_name = Column(String(255), nullable=False)
    contact_person = Column(String(255), nullable=True)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    website = Column(String(255), nullable=True)
    
    # Service Information
    service_types = Column(JSON, nullable=False)  # Array of service types they provide
    specializations = Column(JSON, nullable=True)  # Specific areas of expertise
    coverage_areas = Column(JSON, nullable=True)  # Geographic coverage
    
    # Business Information
    business_address = Column(Text, nullable=True)
    registration_number = Column(String(50), nullable=True)
    insurance_details = Column(JSON, nullable=True)
    certifications = Column(JSON, nullable=True)
    
    # Platform Integration
    is_active = Column(Boolean, default=True)
    is_preferred = Column(Boolean, default=False)
    commission_rate = Column(Numeric(5, 2), nullable=True)  # Percentage
    
    # Performance Metrics
    total_requests_handled = Column(String(10), default="0")
    average_rating = Column(Numeric(3, 2), nullable=True)
    completion_rate = Column(Numeric(5, 2), nullable=True)  # Percentage
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<ServiceProvider {self.company_name}>"
