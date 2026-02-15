#!/usr/bin/env python3
"""
Migrate data from remote MariaDB to local SQLite
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URLs
REMOTE_DB_URL = "mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@37.220.31.46:3306/eaglehurst_db"
LOCAL_DB_URL = "sqlite:///backend/eaglehurst_local.db"

def migrate_data():
    """Migrate data from remote to local database"""
    logger.info("🔄 Starting data migration from remote MariaDB to local SQLite...")
    
    # Create engines
    remote_engine = create_engine(REMOTE_DB_URL)
    local_engine = create_engine(LOCAL_DB_URL)
    
    # Get table list (in dependency order)
    tables = [
        'users', 'sellers', 'buyers', 'subscriptions', 'user_subscriptions',
        'listings', 'listing_media', 'connections', 'messages', 'saved_listings',
        'listing_views', 'listing_edits', 'notifications', 'service_requests',
        'analytics_events', 'blocked_users'
    ]
    
    try:
        with remote_engine.connect() as remote_conn, local_engine.connect() as local_conn:
            
            # SQLite doesn't need foreign key checks disabled for this operation
            
            for table in tables:
                try:
                    logger.info(f"📋 Migrating table: {table}")
                    
                    # Check if table exists in remote
                    try:
                        result = remote_conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.scalar()
                        logger.info(f"   📊 Found {count} rows in remote {table}")
                    except Exception:
                        logger.info(f"   ⚠️  Table {table} not found in remote, skipping")
                        continue
                    
                    if count == 0:
                        logger.info(f"   ⚠️  No data in {table}")
                        continue
                    
                    # Get data from remote
                    result = remote_conn.execute(text(f"SELECT * FROM {table}"))
                    rows = result.fetchall()
                    columns = result.keys()
                    
                    # Clear local table
                    local_conn.execute(text(f"DELETE FROM {table}"))
                    
                    # Insert data
                    placeholders = ", ".join([f":{col}" for col in columns])
                    insert_sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
                    
                    # Convert rows to dictionaries
                    data = [dict(zip(columns, row)) for row in rows]
                    
                    local_conn.execute(text(insert_sql), data)
                    local_conn.commit()
                    
                    logger.info(f"   ✅ Migrated {len(rows)} rows to {table}")
                    
                except Exception as e:
                    logger.error(f"   ❌ Failed to migrate {table}: {e}")
                    continue
            
            local_conn.commit()
            
        logger.info("🎉 Data migration completed!")
        logger.info("📁 Local database: backend/eaglehurst_local.db")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    migrate_data()
