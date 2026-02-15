#!/usr/bin/env python3
"""
Script to create test data for the Eaglehurst application
"""

import sys
import os
from datetime import datetime, timezone
from decimal import Decimal
import uuid

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy.orm import Session
from app.core.database import get_db, engine, Base
from app.models.user_models import User, Seller, Buyer
from app.models.listing_models import Listing
from app.core.constants import ListingStatus, BusinessType, UserType
from app.utils.auth import AuthUtils

def create_tables():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Tables created successfully")

def create_test_users(db: Session):
    """Create test users"""
    print("Creating test users...")
    
    # Admin User
    admin_user = User(
        id=uuid.UUID('00000000-0000-0000-0000-000000000001'),
        email="admin@eaglehursttestdev.co.in",
        password_hash=AuthUtils.get_password_hash("admin123"),
        user_type=UserType.ADMIN,
        is_verified=True,
        first_name="Admin",
        last_name="User",
        phone="+44 7000 000001",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Seller 1 - Dr. Smith (London GP)
    seller1_user = User(
        id=uuid.UUID('10000000-0000-0000-0000-000000000001'),
        email="dr.smith@eaglehursttestdev.co.in",
        password_hash=AuthUtils.get_password_hash("seller123"),
        user_type=UserType.SELLER,
        is_verified=True,
        first_name="Dr. James",
        last_name="Smith",
        phone="+44 7123 456789",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    seller1_profile = Seller(
        id=uuid.UUID('10000000-0000-0000-0000-000000000001'),
        user_id=uuid.UUID('10000000-0000-0000-0000-000000000001'),
        business_name="London General Practice",
        verification_status="approved",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Seller 2 - Dr. Jones (Manchester Dental)
    seller2_user = User(
        id=uuid.UUID('10000000-0000-0000-0000-000000000002'),
        email="dr.jones@eaglehursttestdev.co.in",
        password_hash=AuthUtils.get_password_hash("seller123"),
        user_type=UserType.SELLER,
        is_verified=True,
        first_name="Dr. Sarah",
        last_name="Jones",
        phone="+44 7234 567890",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    seller2_profile = Seller(
        id=uuid.UUID('10000000-0000-0000-0000-000000000002'),
        user_id=uuid.UUID('10000000-0000-0000-0000-000000000002'),
        business_name="Manchester Dental Excellence",
        verification_status="approved",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Seller 3 - Dr. Wilson (Birmingham Physiotherapy)
    seller3_user = User(
        id=uuid.UUID('10000000-0000-0000-0000-000000000003'),
        email="dr.wilson@eaglehursttestdev.co.in",
        password_hash=AuthUtils.get_password_hash("seller123"),
        user_type=UserType.SELLER,
        is_verified=True,
        first_name="Dr. Michael",
        last_name="Wilson",
        phone="+44 7345 678901",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    seller3_profile = Seller(
        id=uuid.UUID('10000000-0000-0000-0000-000000000003'),
        user_id=uuid.UUID('10000000-0000-0000-0000-000000000003'),
        business_name="Birmingham Physiotherapy Centre",
        verification_status="approved",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Seller 4 - Dr. Brown (Edinburgh Clinic)
    seller4_user = User(
        id=uuid.UUID('10000000-0000-0000-0000-000000000004'),
        email="dr.brown@eaglehursttestdev.co.in",
        password_hash=AuthUtils.get_password_hash("seller123"),
        user_type=UserType.SELLER,
        is_verified=True,
        first_name="Dr. Robert",
        last_name="Brown",
        phone="+44 7456 789012",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    seller4_profile = Seller(
        id=uuid.UUID('10000000-0000-0000-0000-000000000004'),
        user_id=uuid.UUID('10000000-0000-0000-0000-000000000004'),
        business_name="Edinburgh Medical Clinic",
        verification_status="approved",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Buyer 1 - James (Medical Capital Investor)
    buyer1_user = User(
        id=uuid.UUID('20000000-0000-0000-0000-000000000001'),
        email="james.investor@eaglehursttestdev.co.in",
        password_hash=AuthUtils.get_password_hash("buyer123"),
        user_type=UserType.BUYER,
        is_verified=True,
        first_name="James",
        last_name="Thompson",
        phone="+44 7567 890123",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    buyer1_profile = Buyer(
        id=uuid.UUID('20000000-0000-0000-0000-000000000001'),
        user_id=uuid.UUID('20000000-0000-0000-0000-000000000001'),
        verification_status="approved",
        preferences={
            "investment_range_min": 500000,
            "investment_range_max": 2000000,
            "preferred_locations": ["London", "Manchester", "Edinburgh"]
        },
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Buyer 2 - Sarah (Health Investment Group)
    buyer2_user = User(
        id=uuid.UUID('20000000-0000-0000-0000-000000000002'),
        email="sarah.acquisition@eaglehursttestdev.co.in",
        password_hash=AuthUtils.get_password_hash("buyer123"),
        user_type=UserType.BUYER,
        is_verified=True,
        first_name="Sarah",
        last_name="Mitchell",
        phone="+44 7678 901234",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    buyer2_profile = Buyer(
        id=uuid.UUID('20000000-0000-0000-0000-000000000002'),
        user_id=uuid.UUID('20000000-0000-0000-0000-000000000002'),
        verification_status="approved",
        preferences={
            "investment_range_min": 300000,
            "investment_range_max": 1500000,
            "preferred_locations": ["Birmingham", "Manchester", "Leeds"]
        },
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Buyer 3 - Michael (Practice Acquisition)
    buyer3_user = User(
        id=uuid.UUID('20000000-0000-0000-0000-000000000003'),
        email="michael.buyer@eaglehursttestdev.co.in",
        password_hash=AuthUtils.get_password_hash("buyer123"),
        user_type=UserType.BUYER,
        is_verified=True,
        first_name="Michael",
        last_name="Davies",
        phone="+44 7789 012345",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    buyer3_profile = Buyer(
        id=uuid.UUID('20000000-0000-0000-0000-000000000003'),
        user_id=uuid.UUID('20000000-0000-0000-0000-000000000003'),
        verification_status="approved",
        preferences={
            "investment_range_min": 200000,
            "investment_range_max": 1000000,
            "preferred_locations": ["London", "Brighton", "Cambridge"]
        },
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Buyer 4 - Emma (NHS Partnership Buyer)
    buyer4_user = User(
        id=uuid.UUID('20000000-0000-0000-0000-000000000004'),
        email="emma.healthcare@eaglehursttestdev.co.in",
        password_hash=AuthUtils.get_password_hash("buyer123"),
        user_type=UserType.BUYER,
        is_verified=True,
        first_name="Emma",
        last_name="Watson",
        phone="+44 7890 123456",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    buyer4_profile = Buyer(
        id=uuid.UUID('20000000-0000-0000-0000-000000000004'),
        user_id=uuid.UUID('20000000-0000-0000-0000-000000000004'),
        verification_status="approved",
        preferences={
            "investment_range_min": 400000,
            "investment_range_max": 1800000,
            "preferred_locations": ["London", "Manchester", "Birmingham", "Edinburgh"]
        },
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Add all users and profiles to database
    db.add_all([
        admin_user,
        seller1_user, seller1_profile,
        seller2_user, seller2_profile,
        seller3_user, seller3_profile,
        seller4_user, seller4_profile,
        buyer1_user, buyer1_profile,
        buyer2_user, buyer2_profile,
        buyer3_user, buyer3_profile,
        buyer4_user, buyer4_profile
    ])
    db.commit()
    print("✅ Test users created successfully")
    print(f"   - 1 Admin user")
    print(f"   - 4 Seller users with profiles")
    print(f"   - 4 Buyer users with profiles")
    return seller1_user.id, buyer1_user.id

def create_test_listings(db: Session, seller_id: uuid.UUID):
    """Create test listings"""
    print("Creating test listings...")
    
    # Listing 1 - GP Practice
    listing1 = Listing(
        id=uuid.UUID('123e4567-e89b-12d3-a456-426614174001'),
        seller_id=seller_id,
        title="Established GP Practice - Central London",
        description="Well-established GP practice in prime Central London location with excellent patient list and modern facilities. The practice has been serving the community for over 20 years and has built a strong reputation for quality healthcare delivery.",
        business_type=BusinessType.FULL_SALE,
        location="Central London",
        postcode="W1A 1AA",
        region="London",
        asking_price=Decimal('750000'),
        annual_revenue=Decimal('450000'),
        net_profit=Decimal('180000'),
        practice_name="Central Health Practice",
        practice_type="GP Practice",
        premises_type="leased",
        nhs_contract=True,
        private_patient_base=500,
        staff_count=8,
        patient_list_size=3500,
        cqc_registered=True,
        cqc_registration_number="1-123456789",
        professional_indemnity_insurance=True,
        status=ListingStatus.PUBLISHED,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Listing 2 - Dental Practice
    listing2 = Listing(
        id=uuid.UUID('123e4567-e89b-12d3-a456-426614174002'),
        seller_id=seller_id,
        title="Modern Dental Practice - Manchester",
        description="State-of-the-art dental practice with the latest equipment and growing patient base. Located in a busy commercial area with excellent transport links and parking facilities.",
        business_type=BusinessType.FULL_SALE,
        location="Manchester",
        postcode="M1 1AA",
        region="Greater Manchester",
        asking_price=Decimal('450000'),
        annual_revenue=Decimal('320000'),
        net_profit=Decimal('125000'),
        practice_name="Smile Dental Care",
        practice_type="Dental Practice",
        premises_type="owned",
        nhs_contract=False,
        private_patient_base=2800,
        staff_count=6,
        patient_list_size=2800,
        cqc_registered=True,
        cqc_registration_number="1-987654321",
        professional_indemnity_insurance=True,
        status=ListingStatus.PUBLISHED,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    # Listing 3 - Pharmacy
    listing3 = Listing(
        id=uuid.UUID('123e4567-e89b-12d3-a456-426614174003'),
        seller_id=seller_id,
        title="Community Pharmacy - Birmingham",
        description="Busy community pharmacy with NHS contract and excellent footfall. Located on a main high street with loyal customer base and growth potential.",
        business_type=BusinessType.PARTIAL_SALE,
        location="Birmingham",
        postcode="B1 1AA",
        region="West Midlands",
        asking_price=Decimal('280000'),
        annual_revenue=Decimal('180000'),
        net_profit=Decimal('65000'),
        practice_name="HealthFirst Pharmacy",
        practice_type="Community Pharmacy",
        premises_type="leased",
        nhs_contract=True,
        private_patient_base=0,
        staff_count=4,
        patient_list_size=0,
        cqc_registered=False,
        professional_indemnity_insurance=True,
        status=ListingStatus.PUBLISHED,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    
    db.add_all([listing1, listing2, listing3])
    db.commit()
    print("✅ Test listings created successfully")
    print(f"   - GP Practice: {listing1.id}")
    print(f"   - Dental Practice: {listing2.id}")
    print(f"   - Pharmacy: {listing3.id}")

def create_test_connections(db: Session, seller_id: str, buyer_id: str):
    """Create test connections between buyers and sellers"""
    from app.models.connection_models import Connection
    from app.models.listing_models import Listing
    from app.core.constants import ConnectionStatus
    from datetime import datetime, timezone, timedelta
    import uuid
    
    print("\n📞 Creating test connections...")
    
    # Get listings
    listings = db.query(Listing).all()
    if not listings:
        print("❌ No listings found to create connections")
        return
    
    # Create test connections with different statuses
    connection1 = Connection(
        id=uuid.uuid4(),
        buyer_id=buyer_id,
        seller_id=seller_id,
        listing_id=listings[0].id,  # GP Practice
        status=ConnectionStatus.PENDING,
        initial_message="I'm interested in learning more about this GP practice. Could we schedule a call to discuss the details?",
        seller_initiated=False,
        requested_at=datetime.now(timezone.utc) - timedelta(days=2),
        last_activity=datetime.now(timezone.utc) - timedelta(days=2)
    )
    
    connection2 = Connection(
        id=uuid.uuid4(),
        buyer_id=buyer_id,
        seller_id=seller_id,
        listing_id=listings[1].id,  # Dental Practice
        status=ConnectionStatus.APPROVED,
        initial_message="This dental practice looks perfect for my expansion plans. I'd like to discuss the financials and patient base.",
        response_message="Thank you for your interest! I'd be happy to discuss the details. The practice has been very successful.",
        seller_initiated=False,
        requested_at=datetime.now(timezone.utc) - timedelta(days=5),
        responded_at=datetime.now(timezone.utc) - timedelta(days=4),
        last_activity=datetime.now(timezone.utc) - timedelta(hours=6)
    )
    
    connection3 = Connection(
        id=uuid.uuid4(),
        buyer_id=buyer_id,
        seller_id=seller_id,
        listing_id=listings[2].id,  # Pharmacy
        status=ConnectionStatus.REJECTED,
        initial_message="I'm looking to acquire a pharmacy in this area. Is this still available?",
        response_message="Thank you for your interest, but we've decided to keep the pharmacy in the family for now.",
        seller_initiated=False,
        requested_at=datetime.now(timezone.utc) - timedelta(days=7),
        responded_at=datetime.now(timezone.utc) - timedelta(days=6),
        last_activity=datetime.now(timezone.utc) - timedelta(days=6)
    )
    
    # Create a seller-initiated connection
    connection4 = Connection(
        id=uuid.uuid4(),
        buyer_id=buyer_id,
        seller_id=seller_id,
        listing_id=None,  # Seller-initiated connections don't need a specific listing
        status=ConnectionStatus.PENDING,
        initial_message="I noticed your interest in medical practices. I have an exclusive opportunity that might interest you.",
        seller_initiated=True,
        requested_at=datetime.now(timezone.utc) - timedelta(hours=12),
        last_activity=datetime.now(timezone.utc) - timedelta(hours=12)
    )
    
    db.add_all([connection1, connection2, connection3, connection4])
    db.commit()
    
    print("✅ Test connections created successfully")
    print(f"   - Pending GP Practice enquiry: {connection1.id}")
    print(f"   - Approved Dental Practice enquiry: {connection2.id}")
    print(f"   - Rejected Pharmacy enquiry: {connection3.id}")
    print(f"   - Seller-initiated enquiry: {connection4.id}")

def main():
    """Main function to create test data"""
    print("🚀 Creating test data for Eaglehurst...")
    
    try:
        # Create tables
        create_tables()
        
        # Get database session
        db = next(get_db())
        
        # Create test users
        seller_id, buyer_id = create_test_users(db)
        
        # Create test listings
        create_test_listings(db, seller_id)
        
        # Create test connections
        create_test_connections(db, seller_id, buyer_id)
        
        print("\n✅ Test data creation completed successfully!")
        print("\nYou can now test the following endpoints:")
        print("- GET /api/v1/listings/ (should show 3 listings)")
        print("- GET /api/v1/listings/123e4567-e89b-12d3-a456-426614174001 (GP Practice)")
        print("- GET /api/v1/listings/123e4567-e89b-12d3-a456-426614174002 (Dental Practice)")
        print("- GET /api/v1/listings/123e4567-e89b-12d3-a456-426614174003 (Pharmacy)")
        
    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
