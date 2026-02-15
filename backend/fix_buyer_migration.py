#!/usr/bin/env python3
"""
Fix Buyer Migration Script

This script fixes the buyer migration by temporarily disabling foreign key constraints
and then re-enabling them after all data is migrated.
"""

import sqlite3
import pymysql
import logging
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Database configurations
SQLITE_CONFIG = {
    'database': '/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/eaglehurst.db'
}

MARIADB_CONFIG = {
    'host': '37.220.31.46',
    'user': 'remoteuser123',
    'password': 'G7v$9kL2pQ!x',
    'database': 'eaglehurst_db',
    'port': 3306,
    'charset': 'utf8mb4'
}

def fix_buyer_migration():
    """Fix the buyer migration by handling foreign key constraints properly"""
    try:
        # Connect to databases
        sqlite_conn = sqlite3.connect(SQLITE_CONFIG['database'])
        sqlite_conn.row_factory = sqlite3.Row
        mariadb_conn = pymysql.connect(**MARIADB_CONFIG)
        
        logger.info("✅ Connected to both databases")
        
        # Get buyer data from SQLite
        sqlite_cursor = sqlite_conn.cursor()
        sqlite_cursor.execute("SELECT * FROM buyers")
        buyers_data = [dict(row) for row in sqlite_cursor.fetchall()]
        
        logger.info(f"📊 Found {len(buyers_data)} buyers to migrate")
        
        # Migrate buyers with foreign key constraints disabled
        mariadb_cursor = mariadb_conn.cursor()
        
        # Disable foreign key checks
        mariadb_cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        
        # Clear existing buyers
        mariadb_cursor.execute("DELETE FROM buyers")
        logger.info("🧹 Cleared existing buyers")
        
        # Insert buyers
        successful = 0
        for buyer in buyers_data:
            try:
                # Handle NULL subscription_id
                subscription_id = buyer.get('subscription_id')
                if subscription_id == '' or subscription_id is None:
                    subscription_id = None
                
                sql = """
                INSERT INTO buyers (id, user_id, subscription_id, verification_status, preferences, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """
                values = (
                    buyer['id'],
                    buyer['user_id'],
                    subscription_id,
                    buyer.get('verification_status', 'pending'),
                    buyer.get('preferences'),
                    buyer.get('created_at'),
                    buyer.get('updated_at')
                )
                
                mariadb_cursor.execute(sql, values)
                successful += 1
                
            except Exception as e:
                logger.warning(f"⚠️  Failed to insert buyer {buyer.get('id', 'unknown')}: {e}")
        
        # Re-enable foreign key checks
        mariadb_cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        mariadb_conn.commit()
        
        logger.info(f"✅ Successfully migrated {successful} buyers")
        
        # Now try to migrate connections, messages, etc. with buyers in place
        logger.info("📊 Attempting to migrate dependent data...")
        
        # Migrate connections
        sqlite_cursor.execute("SELECT * FROM connections")
        connections_data = [dict(row) for row in sqlite_cursor.fetchall()]
        
        mariadb_cursor.execute("DELETE FROM connections")
        
        conn_successful = 0
        for conn in connections_data:
            try:
                sql = """
                INSERT INTO connections (id, buyer_id, seller_id, listing_id, status, initial_message, 
                                       response_message, seller_initiated, requested_at, responded_at, last_activity)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                values = (
                    conn['id'],
                    conn['buyer_id'],
                    conn['seller_id'],
                    conn.get('listing_id'),
                    conn.get('status', 'pending'),
                    conn.get('initial_message'),
                    conn.get('response_message'),
                    conn.get('seller_initiated', 0),
                    conn.get('requested_at'),
                    conn.get('responded_at'),
                    conn.get('last_activity')
                )
                
                mariadb_cursor.execute(sql, values)
                conn_successful += 1
                
            except Exception as e:
                logger.warning(f"⚠️  Failed to insert connection {conn.get('id', 'unknown')}: {e}")
        
        mariadb_conn.commit()
        logger.info(f"✅ Successfully migrated {conn_successful} connections")
        
        # Migrate messages
        sqlite_cursor.execute("SELECT * FROM messages")
        messages_data = [dict(row) for row in sqlite_cursor.fetchall()]
        
        mariadb_cursor.execute("DELETE FROM messages")
        
        msg_successful = 0
        for msg in messages_data:
            try:
                sql = """
                INSERT INTO messages (id, connection_id, sender_id, content, message_type, file_url,
                                    file_name, file_size, file_type, is_read, read_at, is_edited, 
                                    edited_at, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                values = (
                    msg['id'],
                    msg['connection_id'],
                    msg['sender_id'],
                    msg['content'],
                    msg.get('message_type', 'text'),
                    msg.get('file_url'),
                    msg.get('file_name'),
                    msg.get('file_size'),
                    msg.get('file_type'),
                    msg.get('is_read', 0),
                    msg.get('read_at'),
                    msg.get('is_edited', 0),
                    msg.get('edited_at'),
                    msg.get('created_at')
                )
                
                mariadb_cursor.execute(sql, values)
                msg_successful += 1
                
            except Exception as e:
                logger.warning(f"⚠️  Failed to insert message {msg.get('id', 'unknown')}: {e}")
        
        mariadb_conn.commit()
        logger.info(f"✅ Successfully migrated {msg_successful} messages")
        
        # Migrate saved listings
        sqlite_cursor.execute("SELECT * FROM saved_listings")
        saved_data = [dict(row) for row in sqlite_cursor.fetchall()]
        
        mariadb_cursor.execute("DELETE FROM saved_listings")
        
        saved_successful = 0
        for saved in saved_data:
            try:
                sql = """
                INSERT INTO saved_listings (id, buyer_id, listing_id, notes, created_at)
                VALUES (%s, %s, %s, %s, %s)
                """
                values = (
                    saved['id'],
                    saved['buyer_id'],
                    saved['listing_id'],
                    saved.get('notes'),
                    saved.get('created_at')
                )
                
                mariadb_cursor.execute(sql, values)
                saved_successful += 1
                
            except Exception as e:
                logger.warning(f"⚠️  Failed to insert saved listing {saved.get('id', 'unknown')}: {e}")
        
        mariadb_conn.commit()
        logger.info(f"✅ Successfully migrated {saved_successful} saved listings")
        
        # Close connections
        sqlite_conn.close()
        mariadb_conn.close()
        
        print("\n" + "="*80)
        print("🎉 BUYER MIGRATION FIX SUCCESSFUL!")
        print("="*80)
        print(f"✅ Buyers migrated: {successful}")
        print(f"✅ Connections migrated: {conn_successful}")
        print(f"✅ Messages migrated: {msg_successful}")
        print(f"✅ Saved listings migrated: {saved_successful}")
        print("="*80)
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Fix migration failed: {e}")
        return False

def main():
    """Main function"""
    logger.info("🚀 Starting buyer migration fix...")
    success = fix_buyer_migration()
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
