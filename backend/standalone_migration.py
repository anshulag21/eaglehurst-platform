#!/usr/bin/env python3
"""
Standalone MariaDB Migration Script for Eaglehurst Platform

This script creates all database tables and structures on a remote MariaDB server
without depending on the existing configuration system.

Usage:
    python standalone_migration.py

Database Connection:
    Host: 37.220.31.46
    User: remoteuser123
    Password: G7v$9kL2pQ!x
    Database: eaglehurst_db
"""

import sys
import os
import logging
import uuid
from typing import Optional
from sqlalchemy import create_engine, text, inspect, Column, String, Boolean, DateTime, ForeignKey, Text, JSON, Numeric, Integer
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker, relationship, declarative_base
from sqlalchemy.sql import func
from sqlalchemy import TypeDecorator, CHAR
from sqlalchemy.dialects.mysql import CHAR as MySQLCHAR
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('mariadb_migration.log')
    ]
)
logger = logging.getLogger(__name__)

# Database configuration
MARIADB_CONFIG = {
    'host': '37.220.31.46',
    'user': 'remoteuser123',
    'password': 'G7v$9kL2pQ!x',
    'database': 'eaglehurst_db',
    'port': 3306
}

# Create base class for models
Base = declarative_base()

# Custom UUID type for cross-database compatibility
class UUID(TypeDecorator):
    """Platform-independent UUID type."""
    impl = CHAR
    cache_ok = True
    
    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(PostgreSQLUUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))
    
    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return str(value)
        else:
            if not isinstance(value, uuid.UUID):
                return str(uuid.UUID(value))
            else:
                return str(value)
    
    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            return value

# Define all models inline
class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    user_type = Column(String(20), nullable=False)  # admin, seller, buyer
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    phone = Column(String(20), nullable=True)
    is_verified = Column(Boolean, default=False)
    is_active = Column(Boolean, default=True)
    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Seller(Base):
    __tablename__ = "sellers"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False, unique=True)
    business_name = Column(String(255), nullable=True)
    business_description = Column(Text, nullable=True)
    business_address = Column(Text, nullable=True)
    verification_status = Column(String(20), default="pending")
    kyc_documents = Column(JSON, nullable=True)
    profile_completion_percentage = Column(String(3), default="0")
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Buyer(Base):
    __tablename__ = "buyers"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False, unique=True)
    subscription_id = Column(UUID(), ForeignKey("user_subscriptions.id"), nullable=True)
    verification_status = Column(String(20), default="pending")
    preferences = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class EmailVerification(Base):
    __tablename__ = "email_verifications"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    otp_code = Column(String(10), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class PasswordReset(Base):
    __tablename__ = "password_resets"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    reset_token = Column(String(255), nullable=False, unique=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Listing(Base):
    __tablename__ = "listings"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    seller_id = Column(UUID(), ForeignKey("sellers.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    business_type = Column(String(20), nullable=False)
    location = Column(String(255), nullable=False)
    postcode = Column(String(10), nullable=True)
    region = Column(String(100), nullable=True)
    asking_price = Column(Numeric(15, 2), nullable=True)
    annual_revenue = Column(Numeric(15, 2), nullable=True)
    net_profit = Column(Numeric(15, 2), nullable=True)
    practice_name = Column(String(255), nullable=True)
    practice_type = Column(String(100), nullable=True)
    premises_type = Column(String(50), nullable=True)
    nhs_contract = Column(Boolean, default=False)
    nhs_contract_details = Column(JSON, nullable=True)
    private_patient_base = Column(Integer, nullable=True)
    staff_count = Column(Integer, nullable=True)
    patient_list_size = Column(Integer, nullable=True)
    equipment_inventory = Column(JSON, nullable=True)
    cqc_registered = Column(Boolean, default=False)
    cqc_registration_number = Column(String(50), nullable=True)
    professional_indemnity_insurance = Column(Boolean, default=False)
    insurance_details = Column(JSON, nullable=True)
    lease_agreement_details = Column(JSON, nullable=True)
    property_value = Column(Numeric(15, 2), nullable=True)
    goodwill_valuation = Column(Numeric(15, 2), nullable=True)
    business_details = Column(JSON, nullable=True)
    financial_statements = Column(JSON, nullable=True)
    status = Column(String(20), default="draft")
    is_masked = Column(Boolean, default=True)
    scheduled_publish_date = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    admin_notes = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    view_count = Column(Integer, default=0)
    connection_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ListingMedia(Base):
    __tablename__ = "listing_media"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=False)
    file_url = Column(String(500), nullable=False)
    file_type = Column(String(20), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=True)
    mime_type = Column(String(100), nullable=True)
    display_order = Column(Integer, default=0)
    is_primary = Column(Boolean, default=False)
    caption = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ListingEdit(Base):
    __tablename__ = "listing_edits"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=False)
    edit_data = Column(JSON, nullable=False)
    edit_reason = Column(Text, nullable=True)
    status = Column(String(20), default="pending")
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

class SavedListing(Base):
    __tablename__ = "saved_listings"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    buyer_id = Column(UUID(), ForeignKey("buyers.id"), nullable=False)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Connection(Base):
    __tablename__ = "connections"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    buyer_id = Column(UUID(), ForeignKey("buyers.id"), nullable=False)
    seller_id = Column(UUID(), ForeignKey("sellers.id"), nullable=False)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=True)
    status = Column(String(20), default="pending")
    initial_message = Column(Text, nullable=True)
    response_message = Column(Text, nullable=True)
    seller_initiated = Column(Boolean, default=False)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)
    last_activity = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = "messages"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(), ForeignKey("connections.id"), nullable=False)
    sender_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    message_type = Column(String(20), default="text")
    file_url = Column(String(500), nullable=True)
    file_name = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)
    file_type = Column(String(100), nullable=True)
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    is_edited = Column(Boolean, default=False)
    edited_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class MessageRead(Base):
    __tablename__ = "message_reads"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    message_id = Column(UUID(), ForeignKey("messages.id"), nullable=False)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    read_at = Column(DateTime(timezone=True), server_default=func.now())

class ConnectionNote(Base):
    __tablename__ = "connection_notes"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    connection_id = Column(UUID(), ForeignKey("connections.id"), nullable=False)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=False)
    is_private = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)
    tier = Column(String(20), nullable=False)
    description = Column(String(500), nullable=True)
    price_monthly = Column(Numeric(10, 2), nullable=False)
    price_yearly = Column(Numeric(10, 2), nullable=True)
    currency = Column(String(3), default="GBP")
    connection_limit_monthly = Column(Integer, nullable=False)
    listing_limit = Column(Integer, nullable=False)
    priority_support = Column(Boolean, default=False)
    advanced_analytics = Column(Boolean, default=False)
    featured_listings = Column(Boolean, default=False)
    features = Column(JSON, nullable=True)
    stripe_price_id_monthly = Column(String(100), nullable=True)
    stripe_price_id_yearly = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True)
    display_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class UserSubscription(Base):
    __tablename__ = "user_subscriptions"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    subscription_id = Column(UUID(), ForeignKey("subscriptions.id"), nullable=False)
    status = Column(String(20), default="active")
    billing_cycle = Column(String(10), default="monthly")
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=False)
    trial_end_date = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    stripe_subscription_id = Column(String(100), nullable=True)
    stripe_customer_id = Column(String(100), nullable=True)
    connections_used_current_month = Column(Integer, default=0)
    listings_used = Column(Integer, default=0)
    usage_reset_date = Column(DateTime(timezone=True), nullable=False)
    amount_paid = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="GBP")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_subscription_id = Column(UUID(), ForeignKey("user_subscriptions.id"), nullable=False)
    amount = Column(Numeric(10, 2), nullable=False)
    currency = Column(String(3), default="GBP")
    payment_method = Column(String(50), default="stripe")
    stripe_payment_intent_id = Column(String(100), nullable=True)
    stripe_invoice_id = Column(String(100), nullable=True)
    status = Column(String(20), nullable=False)
    failure_reason = Column(String(500), nullable=True)
    payment_date = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class SubscriptionUsage(Base):
    __tablename__ = "subscription_usage"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_subscription_id = Column(UUID(), ForeignKey("user_subscriptions.id"), nullable=False)
    usage_type = Column(String(50), nullable=False)
    usage_count = Column(Integer, default=1)
    usage_metadata = Column(JSON, nullable=True)
    usage_date = Column(DateTime(timezone=True), server_default=func.now())

# Add more tables as needed...
class UserBlock(Base):
    __tablename__ = "user_blocks"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    blocker_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    blocked_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    reason = Column(String(255), nullable=True)
    admin_notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Add notification tables
class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    notification_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    resource_type = Column(String(50), nullable=True)
    resource_id = Column(UUID(), nullable=True)
    data = Column(JSON, nullable=True)
    action_url = Column(String(500), nullable=True)
    is_read = Column(Boolean, default=False)
    is_sent = Column(Boolean, default=False)
    send_email = Column(Boolean, default=True)
    send_push = Column(Boolean, default=True)
    send_sms = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    read_at = Column(DateTime(timezone=True), nullable=True)
    sent_at = Column(DateTime(timezone=True), nullable=True)

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False, unique=True)
    email_connection_requests = Column(Boolean, default=True)
    email_connection_responses = Column(Boolean, default=True)
    email_new_messages = Column(Boolean, default=True)
    email_listing_updates = Column(Boolean, default=True)
    email_subscription_updates = Column(Boolean, default=True)
    email_marketing = Column(Boolean, default=False)
    push_connection_requests = Column(Boolean, default=True)
    push_connection_responses = Column(Boolean, default=True)
    push_new_messages = Column(Boolean, default=True)
    push_listing_updates = Column(Boolean, default=False)
    push_subscription_updates = Column(Boolean, default=True)
    sms_urgent_only = Column(Boolean, default=False)
    sms_subscription_expiry = Column(Boolean, default=False)
    notification_frequency = Column(String(20), default="immediate")
    quiet_hours_start = Column(String(5), nullable=True)
    quiet_hours_end = Column(String(5), nullable=True)
    timezone = Column(String(50), default="Europe/London")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

# Add analytics tables
class ListingView(Base):
    __tablename__ = "listing_views"
    
    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    listing_id = Column(UUID(), ForeignKey("listings.id"), nullable=False)
    buyer_id = Column(UUID(), ForeignKey("buyers.id"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(String(500), nullable=True)
    referrer = Column(String(500), nullable=True)
    country = Column(String(100), nullable=True)
    region = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    session_id = Column(String(100), nullable=True)
    view_duration = Column(Integer, nullable=True)
    viewed_at = Column(DateTime(timezone=True), server_default=func.now())

# Helper functions
def create_database_url(config: dict) -> str:
    """Create MariaDB connection URL"""
    return f"mysql+pymysql://{config['user']}:{config['password']}@{config['host']}:{config['port']}/{config['database']}"

def test_connection(engine) -> bool:
    """Test database connection"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT VERSION()"))
            version = result.fetchone()[0]
            logger.info(f"✅ Connected to MariaDB version: {version}")
            return True
    except Exception as e:
        logger.error(f"❌ Connection failed: {e}")
        return False

def create_database_if_not_exists(config: dict) -> bool:
    """Create database if it doesn't exist"""
    try:
        temp_url = f"mysql+pymysql://{config['user']}:{config['password']}@{config['host']}:{config['port']}"
        temp_engine = create_engine(temp_url)
        
        with temp_engine.connect() as conn:
            result = conn.execute(text(f"SHOW DATABASES LIKE '{config['database']}'"))
            if result.fetchone():
                logger.info(f"✅ Database '{config['database']}' already exists")
            else:
                conn.execute(text(f"CREATE DATABASE {config['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
                conn.commit()
                logger.info(f"✅ Created database '{config['database']}'")
        
        temp_engine.dispose()
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create database: {e}")
        return False

def create_tables(engine) -> bool:
    """Create all tables"""
    try:
        logger.info("🔨 Creating database tables...")
        
        # Get existing tables
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())
        logger.info(f"📋 Found {len(existing_tables)} existing tables")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Get new tables
        new_tables = set(inspector.get_table_names())
        created_tables = new_tables - existing_tables
        
        if created_tables:
            logger.info(f"✅ Created {len(created_tables)} new tables: {', '.join(sorted(created_tables))}")
        else:
            logger.info("ℹ️  No new tables were created (all tables already exist)")
        
        logger.info(f"📊 Total tables in database: {len(new_tables)}")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        return False

def create_indexes(engine) -> bool:
    """Create additional indexes for performance"""
    try:
        logger.info("📊 Creating performance indexes...")
        
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type)",
            "CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id)",
            "CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status)",
            "CREATE INDEX IF NOT EXISTS idx_connections_buyer_id ON connections(buyer_id)",
            "CREATE INDEX IF NOT EXISTS idx_connections_seller_id ON connections(seller_id)",
            "CREATE INDEX IF NOT EXISTS idx_messages_connection_id ON messages(connection_id)",
            "CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)",
        ]
        
        with engine.connect() as conn:
            for index_sql in indexes:
                try:
                    conn.execute(text(index_sql))
                except Exception as e:
                    logger.debug(f"Index creation note: {e}")
            conn.commit()
        
        logger.info("✅ Performance indexes created")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create indexes: {e}")
        return False

def main():
    """Main migration function"""
    logger.info("🚀 Starting MariaDB migration for Eaglehurst Platform")
    logger.info(f"📡 Target: {MARIADB_CONFIG['host']}:{MARIADB_CONFIG['port']}/{MARIADB_CONFIG['database']}")
    
    try:
        # Step 1: Create database if needed
        logger.info("📝 Step 1: Creating database if needed...")
        if not create_database_if_not_exists(MARIADB_CONFIG):
            logger.error("❌ Failed to create database")
            return False
        
        # Step 2: Create engine and test connection
        logger.info("📝 Step 2: Testing database connection...")
        database_url = create_database_url(MARIADB_CONFIG)
        engine = create_engine(
            database_url,
            echo=False,
            pool_pre_ping=True,
            pool_recycle=3600,
            connect_args={
                "charset": "utf8mb4",
                "connect_timeout": 30,
                "read_timeout": 30,
                "write_timeout": 30,
            }
        )
        
        if not test_connection(engine):
            logger.error("❌ Database connection failed")
            return False
        
        # Step 3: Create tables
        logger.info("📝 Step 3: Creating database tables...")
        if not create_tables(engine):
            logger.error("❌ Failed to create tables")
            return False
        
        # Step 4: Create indexes
        logger.info("📝 Step 4: Creating performance indexes...")
        if not create_indexes(engine):
            logger.error("❌ Failed to create indexes")
            return False
        
        # Cleanup
        engine.dispose()
        
        logger.info("🎉 Migration completed successfully!")
        
        print("\n" + "="*60)
        print("🎉 MIGRATION SUCCESSFUL!")
        print("="*60)
        print(f"Database URL: mysql+pymysql://remoteuser123:***@{MARIADB_CONFIG['host']}:{MARIADB_CONFIG['port']}/{MARIADB_CONFIG['database']}")
        print("\nAdd this to your .env file:")
        print(f'DATABASE_URL="mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@{MARIADB_CONFIG["host"]}:{MARIADB_CONFIG["port"]}/{MARIADB_CONFIG["database"]}"')
        print("="*60)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
