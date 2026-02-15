"""
Listing-related database models
"""

from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, JSON, Numeric, Integer
from ..core.types import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from ..core.database import Base
from ..core.constants import ListingStatus, BusinessType


class Listing(Base):
    __tablename__ = "listings"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(), ForeignKey("sellers.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    business_type = Column(String(20), nullable=False)  # full_sale, partial_sale, fundraising
    
    # Location Information
    location = Column(String(255), nullable=False)
    postcode = Column(String(10), nullable=True)
    region = Column(String(100), nullable=True)
    
    # Financial Information
    asking_price = Column(Numeric(15, 2), nullable=True)
    annual_revenue = Column(Numeric(15, 2), nullable=True)
    net_profit = Column(Numeric(15, 2), nullable=True)
    
    # Business Details (UK Medical Business Specific)
    practice_name = Column(String(255), nullable=True)
    practice_type = Column(String(100), nullable=True)
    premises_type = Column(String(50), nullable=True)  # owned, leased
    nhs_contract = Column(Boolean, default=False)
    nhs_contract_details = Column(JSON, nullable=True)
    private_patient_base = Column(Integer, nullable=True)
    staff_count = Column(Integer, nullable=True)
    patient_list_size = Column(Integer, nullable=True)
    equipment_inventory = Column(JSON, nullable=True)
    
    # Regulatory Information
    cqc_registered = Column(Boolean, default=False)
    cqc_registration_number = Column(String(50), nullable=True)
    professional_indemnity_insurance = Column(Boolean, default=False)
    insurance_details = Column(JSON, nullable=True)
    
    # Property Information
    lease_agreement_details = Column(JSON, nullable=True)
    property_value = Column(Numeric(15, 2), nullable=True)
    goodwill_valuation = Column(Numeric(15, 2), nullable=True)
    
    # Additional Business Information
    business_details = Column(JSON, nullable=True)  # Flexible field for additional data
    financial_statements = Column(JSON, nullable=True)  # URLs to financial documents
    
    # Listing Management
    status = Column(String(20), default=ListingStatus.DRAFT)
    is_masked = Column(Boolean, default=True)  # Whether sensitive info is masked
    scheduled_publish_date = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    
    # Admin Review
    admin_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    
    # Metrics
    view_count = Column(Integer, default=0)
    connection_count = Column(Integer, default=0)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    seller = relationship("Seller", back_populates="listings")
    media_files = relationship("ListingMedia", back_populates="listing", cascade="all, delete-orphan")
    connections = relationship("Connection", back_populates="listing")
    # views = relationship("ListingView", back_populates="listing")  # Commented out to avoid circular import
    
    def __repr__(self):
        return f"<Listing {self.title}>"


class ListingMedia(Base):
    __tablename__ = "listing_media"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)  # image, video, document
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)  # Size in bytes
    mime_type = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)  # Primary image for listing
    caption = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    listing = relationship("Listing", back_populates="media_files")
    
    def __repr__(self):
        return f"<ListingMedia {self.file_name}>"


class ListingEdit(Base):
    __tablename__ = "listing_edits"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=False)
    edit_data = Column(JSON, nullable=False)  # Store the proposed changes
    edit_reason = Column(Text, nullable=True)
    status = Column(String(20), default="pending")  # pending, approved, rejected
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    listing = relationship("Listing")
    
    def __repr__(self):
        return f"<ListingEdit {self.listing_id}>"


class SavedListing(Base):
    __tablename__ = "saved_listings"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    buyer_id = Column(UUID(), ForeignKey("buyers.id"), nullable=False)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    buyer = relationship("Buyer")
    listing = relationship("Listing")
    
    def __repr__(self):
        return f"<SavedListing {self.buyer_id}-{self.listing_id}>"
