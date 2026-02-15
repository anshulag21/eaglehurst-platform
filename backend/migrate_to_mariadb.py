#!/usr/bin/env python3
"""
MariaDB Migration Script for Eaglehurst Platform

This script creates all database tables and structures on a remote MariaDB server
based on the existing SQLAlchemy models.

Usage:
    python migrate_to_mariadb.py

Database Connection:
    Host: 37.220.31.46
    User: remoteuser123
    Password: G7v$9kL2pQ!x
    Database: eaglehurst_db
"""

import sys
import os
import logging
from typing import Optional
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import sessionmaker

# Add the app directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

# Import all models to ensure they're registered with Base
from app.models.user_models import User, Seller, Buyer, EmailVerification, PasswordReset
from app.models.listing_models import Listing, ListingMedia, ListingEdit, SavedListing
from app.models.connection_models import Connection, Message, MessageRead, ConnectionNote
from app.models.subscription_models import Subscription, UserSubscription, Payment, SubscriptionUsage
from app.models.service_models import ServiceRequest, ServiceCommunication, ServiceDocument, ServiceTemplate, ServiceProvider
from app.models.analytics_models import ListingView, ProfileView, SearchQuery, UserActivity, PlatformMetrics, ConversionFunnel
from app.models.blocking_models import UserBlock
from app.models.notification_models import Notification, NotificationPreference, EmailTemplate, NotificationLog, PushDevice
from app.core.database import Base

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
        # Connect without specifying database
        temp_url = f"mysql+pymysql://{config['user']}:{config['password']}@{config['host']}:{config['port']}"
        temp_engine = create_engine(temp_url)
        
        with temp_engine.connect() as conn:
            # Check if database exists
            result = conn.execute(text(f"SHOW DATABASES LIKE '{config['database']}'"))
            if result.fetchone():
                logger.info(f"✅ Database '{config['database']}' already exists")
            else:
                # Create database
                conn.execute(text(f"CREATE DATABASE {config['database']} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
                conn.commit()
                logger.info(f"✅ Created database '{config['database']}'")
        
        temp_engine.dispose()
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create database: {e}")
        return False

def get_existing_tables(engine) -> set:
    """Get list of existing tables"""
    try:
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        logger.info(f"📋 Found {len(tables)} existing tables: {', '.join(sorted(tables))}")
        return tables
    except Exception as e:
        logger.error(f"❌ Failed to get existing tables: {e}")
        return set()

def create_tables(engine) -> bool:
    """Create all tables"""
    try:
        logger.info("🔨 Creating database tables...")
        
        # Get existing tables
        existing_tables = get_existing_tables(engine)
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Get new tables
        new_tables = get_existing_tables(engine)
        created_tables = new_tables - existing_tables
        
        if created_tables:
            logger.info(f"✅ Created {len(created_tables)} new tables: {', '.join(sorted(created_tables))}")
        else:
            logger.info("ℹ️  No new tables were created (all tables already exist)")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        return False

def verify_table_structure(engine) -> bool:
    """Verify table structure"""
    try:
        logger.info("🔍 Verifying table structure...")
        
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        # Expected tables based on our models
        expected_tables = {
            'users', 'sellers', 'buyers', 'email_verifications', 'password_resets',
            'listings', 'listing_media', 'listing_edits', 'saved_listings',
            'connections', 'messages', 'message_reads', 'connection_notes',
            'subscriptions', 'user_subscriptions', 'payments', 'subscription_usage',
            'service_requests', 'service_communications', 'service_documents', 
            'service_templates', 'service_providers',
            'listing_views', 'profile_views', 'search_queries', 'user_activities', 
            'platform_metrics', 'conversion_funnel',
            'user_blocks',
            'notifications', 'notification_preferences', 'email_templates', 
            'notification_logs', 'push_devices'
        }
        
        missing_tables = expected_tables - set(tables)
        extra_tables = set(tables) - expected_tables
        
        if missing_tables:
            logger.warning(f"⚠️  Missing tables: {', '.join(sorted(missing_tables))}")
        
        if extra_tables:
            logger.info(f"ℹ️  Extra tables found: {', '.join(sorted(extra_tables))}")
        
        logger.info(f"✅ Found {len(tables)} tables total")
        
        # Check a few key tables for proper structure
        key_tables = ['users', 'listings', 'connections']
        for table_name in key_tables:
            if table_name in tables:
                columns = inspector.get_columns(table_name)
                logger.info(f"📋 Table '{table_name}' has {len(columns)} columns")
            else:
                logger.error(f"❌ Key table '{table_name}' is missing!")
                return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to verify table structure: {e}")
        return False

def create_indexes(engine) -> bool:
    """Create additional indexes for performance"""
    try:
        logger.info("📊 Creating performance indexes...")
        
        indexes = [
            # User indexes
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type)",
            "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)",
            
            # Listing indexes
            "CREATE INDEX IF NOT EXISTS idx_listings_seller_id ON listings(seller_id)",
            "CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status)",
            "CREATE INDEX IF NOT EXISTS idx_listings_business_type ON listings(business_type)",
            "CREATE INDEX IF NOT EXISTS idx_listings_location ON listings(location)",
            "CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at)",
            
            # Connection indexes
            "CREATE INDEX IF NOT EXISTS idx_connections_buyer_id ON connections(buyer_id)",
            "CREATE INDEX IF NOT EXISTS idx_connections_seller_id ON connections(seller_id)",
            "CREATE INDEX IF NOT EXISTS idx_connections_listing_id ON connections(listing_id)",
            "CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status)",
            
            # Message indexes
            "CREATE INDEX IF NOT EXISTS idx_messages_connection_id ON messages(connection_id)",
            "CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id)",
            "CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at)",
            
            # Analytics indexes
            "CREATE INDEX IF NOT EXISTS idx_listing_views_listing_id ON listing_views(listing_id)",
            "CREATE INDEX IF NOT EXISTS idx_listing_views_viewed_at ON listing_views(viewed_at)",
            "CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at)",
        ]
        
        with engine.connect() as conn:
            for index_sql in indexes:
                try:
                    conn.execute(text(index_sql))
                    logger.debug(f"✅ Created index: {index_sql.split('idx_')[1].split(' ')[0] if 'idx_' in index_sql else 'unknown'}")
                except Exception as e:
                    logger.warning(f"⚠️  Index creation failed (may already exist): {e}")
            
            conn.commit()
        
        logger.info("✅ Performance indexes created")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create indexes: {e}")
        return False

def setup_database_settings(engine) -> bool:
    """Setup database settings for optimal performance"""
    try:
        logger.info("⚙️  Configuring database settings...")
        
        settings = [
            "SET GLOBAL innodb_file_format = 'Barracuda'",
            "SET GLOBAL innodb_file_per_table = 1",
            "SET GLOBAL innodb_large_prefix = 1",
        ]
        
        with engine.connect() as conn:
            for setting in settings:
                try:
                    conn.execute(text(setting))
                    logger.debug(f"✅ Applied setting: {setting}")
                except Exception as e:
                    logger.warning(f"⚠️  Setting failed (may not have permissions): {e}")
        
        logger.info("✅ Database settings configured")
        return True
        
    except Exception as e:
        logger.warning(f"⚠️  Some database settings failed: {e}")
        return True  # Non-critical, continue

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
            echo=False,  # Set to True for SQL debugging
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
        
        # Step 3: Setup database settings
        logger.info("📝 Step 3: Configuring database settings...")
        setup_database_settings(engine)
        
        # Step 4: Create tables
        logger.info("📝 Step 4: Creating database tables...")
        if not create_tables(engine):
            logger.error("❌ Failed to create tables")
            return False
        
        # Step 5: Create indexes
        logger.info("📝 Step 5: Creating performance indexes...")
        if not create_indexes(engine):
            logger.error("❌ Failed to create indexes")
            return False
        
        # Step 6: Verify structure
        logger.info("📝 Step 6: Verifying table structure...")
        if not verify_table_structure(engine):
            logger.error("❌ Table structure verification failed")
            return False
        
        # Cleanup
        engine.dispose()
        
        logger.info("🎉 Migration completed successfully!")
        logger.info("📋 Next steps:")
        logger.info("   1. Update your .env file with the new DATABASE_URL")
        logger.info("   2. Test your application with the new database")
        logger.info("   3. Consider migrating existing data if needed")
        
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
