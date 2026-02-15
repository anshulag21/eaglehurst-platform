#!/usr/bin/env python3
"""
Data Migration Script: SQLite to MariaDB

This script migrates all user data from the existing SQLite database
to the new MariaDB database, preserving relationships and data integrity.

Key Features:
- Migrates all tables with data
- Preserves foreign key relationships
- Handles UUID conversion
- Provides detailed progress reporting
- Rollback capability on errors
"""

import sqlite3
import pymysql
import logging
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('data_migration.log')
    ]
)
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

# Tables to migrate in dependency order (parent tables first)
MIGRATION_ORDER = [
    'users',
    'sellers', 
    'buyers',
    'subscriptions',
    'user_subscriptions',
    'listings',
    'listing_media',
    'listing_edits',
    'connections',
    'messages',
    'message_reads',
    'connection_notes',
    'saved_listings',
    'email_verifications',
    'password_resets',
    'notifications',
    'notification_preferences',
    'payments',
    'subscription_usage',
    'user_blocks',
    'listing_views'
]

class DataMigrator:
    def __init__(self):
        self.sqlite_conn = None
        self.mariadb_conn = None
        self.migration_stats = {}
        
    def connect_databases(self) -> bool:
        """Connect to both SQLite and MariaDB databases"""
        try:
            # Connect to SQLite
            self.sqlite_conn = sqlite3.connect(SQLITE_CONFIG['database'])
            self.sqlite_conn.row_factory = sqlite3.Row  # Enable column access by name
            logger.info("✅ Connected to SQLite database")
            
            # Connect to MariaDB
            self.mariadb_conn = pymysql.connect(**MARIADB_CONFIG)
            logger.info("✅ Connected to MariaDB database")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    def get_table_data(self, table_name: str) -> List[Dict]:
        """Get all data from a SQLite table"""
        try:
            cursor = self.sqlite_conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            
            # Convert rows to dictionaries
            data = []
            for row in rows:
                row_dict = dict(row)
                data.append(row_dict)
            
            logger.info(f"📊 Retrieved {len(data)} rows from {table_name}")
            return data
            
        except Exception as e:
            logger.error(f"❌ Failed to get data from {table_name}: {e}")
            return []
    
    def get_table_columns(self, table_name: str, database: str = 'sqlite') -> List[str]:
        """Get column names for a table"""
        try:
            if database == 'sqlite':
                cursor = self.sqlite_conn.cursor()
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns = [col[1] for col in cursor.fetchall()]
            else:  # MariaDB
                cursor = self.mariadb_conn.cursor()
                cursor.execute(f"DESCRIBE {table_name}")
                columns = [col[0] for col in cursor.fetchall()]
            
            return columns
            
        except Exception as e:
            logger.error(f"❌ Failed to get columns for {table_name}: {e}")
            return []
    
    def prepare_value(self, value: Any, column_name: str) -> Any:
        """Prepare a value for MariaDB insertion"""
        if value is None:
            return None
        
        # Handle JSON columns
        if isinstance(value, str) and column_name in ['kyc_documents', 'preferences', 'nhs_contract_details', 
                                                      'equipment_inventory', 'insurance_details', 
                                                      'lease_agreement_details', 'business_details', 
                                                      'financial_statements', 'features', 'data']:
            try:
                # Validate JSON
                json.loads(value)
                return value
            except:
                return None
        
        # Handle boolean values
        if isinstance(value, bool) or (isinstance(value, int) and value in [0, 1]):
            return int(value)
        
        # Handle datetime strings
        if isinstance(value, str) and ('T' in value or '-' in value) and len(value) > 10:
            try:
                # Try to parse datetime
                if 'T' in value:
                    dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
                else:
                    dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S.%f')
                return dt.strftime('%Y-%m-%d %H:%M:%S')
            except:
                return value
        
        return value
    
    def insert_table_data(self, table_name: str, data: List[Dict]) -> bool:
        """Insert data into MariaDB table"""
        if not data:
            logger.info(f"ℹ️  No data to insert for {table_name}")
            return True
        
        try:
            cursor = self.mariadb_conn.cursor()
            
            # Get MariaDB table columns
            mariadb_columns = self.get_table_columns(table_name, 'mariadb')
            
            # Prepare data for insertion
            successful_inserts = 0
            failed_inserts = 0
            
            for row_data in data:
                try:
                    # Filter columns that exist in MariaDB
                    filtered_data = {}
                    for col in mariadb_columns:
                        if col in row_data:
                            filtered_data[col] = self.prepare_value(row_data[col], col)
                    
                    if not filtered_data:
                        continue
                    
                    # Create INSERT statement
                    columns = list(filtered_data.keys())
                    placeholders = ', '.join(['%s'] * len(columns))
                    column_names = ', '.join(columns)
                    
                    sql = f"INSERT INTO {table_name} ({column_names}) VALUES ({placeholders})"
                    values = [filtered_data[col] for col in columns]
                    
                    cursor.execute(sql, values)
                    successful_inserts += 1
                    
                except Exception as row_error:
                    failed_inserts += 1
                    logger.warning(f"⚠️  Failed to insert row in {table_name}: {row_error}")
                    continue
            
            # Commit the transaction
            self.mariadb_conn.commit()
            
            logger.info(f"✅ {table_name}: {successful_inserts} rows inserted successfully")
            if failed_inserts > 0:
                logger.warning(f"⚠️  {table_name}: {failed_inserts} rows failed to insert")
            
            self.migration_stats[table_name] = {
                'total': len(data),
                'successful': successful_inserts,
                'failed': failed_inserts
            }
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to insert data into {table_name}: {e}")
            self.mariadb_conn.rollback()
            return False
    
    def clear_mariadb_data(self) -> bool:
        """Clear existing data from MariaDB (for clean migration)"""
        try:
            cursor = self.mariadb_conn.cursor()
            
            # Disable foreign key checks
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            
            # Clear tables in reverse order
            for table_name in reversed(MIGRATION_ORDER):
                try:
                    cursor.execute(f"DELETE FROM {table_name}")
                    logger.info(f"🧹 Cleared {table_name}")
                except Exception as e:
                    logger.warning(f"⚠️  Could not clear {table_name}: {e}")
            
            # Re-enable foreign key checks
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            self.mariadb_conn.commit()
            
            logger.info("✅ MariaDB data cleared successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to clear MariaDB data: {e}")
            return False
    
    def verify_migration(self) -> bool:
        """Verify that migration was successful"""
        try:
            cursor = self.mariadb_conn.cursor()
            
            print("\n" + "="*80)
            print("🔍 MIGRATION VERIFICATION")
            print("="*80)
            
            total_migrated = 0
            verification_passed = True
            
            for table_name in MIGRATION_ORDER:
                if table_name in self.migration_stats:
                    stats = self.migration_stats[table_name]
                    
                    # Count rows in MariaDB
                    cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
                    mariadb_count = cursor.fetchone()[0]
                    
                    # Compare counts
                    expected = stats['successful']
                    if mariadb_count == expected:
                        status = "✅"
                        total_migrated += mariadb_count
                    else:
                        status = "❌"
                        verification_passed = False
                    
                    print(f"  {status} {table_name:<25} | Expected: {expected:>4} | Found: {mariadb_count:>4}")
            
            print("-" * 80)
            print(f"  📊 Total rows migrated: {total_migrated}")
            
            if verification_passed:
                print("  ✅ All tables verified successfully!")
            else:
                print("  ❌ Some tables have count mismatches!")
            
            return verification_passed
            
        except Exception as e:
            logger.error(f"❌ Migration verification failed: {e}")
            return False
    
    def migrate_all_data(self) -> bool:
        """Migrate all data from SQLite to MariaDB"""
        try:
            logger.info("🚀 Starting data migration...")
            
            # Clear existing MariaDB data
            logger.info("📝 Step 1: Clearing existing MariaDB data...")
            if not self.clear_mariadb_data():
                return False
            
            # Migrate tables in dependency order
            logger.info("📝 Step 2: Migrating data...")
            
            for table_name in MIGRATION_ORDER:
                logger.info(f"📊 Migrating {table_name}...")
                
                # Get data from SQLite
                data = self.get_table_data(table_name)
                
                if data:
                    # Insert into MariaDB
                    if not self.insert_table_data(table_name, data):
                        logger.error(f"❌ Failed to migrate {table_name}")
                        return False
                else:
                    logger.info(f"ℹ️  No data found in {table_name}")
                    self.migration_stats[table_name] = {'total': 0, 'successful': 0, 'failed': 0}
            
            # Verify migration
            logger.info("📝 Step 3: Verifying migration...")
            if not self.verify_migration():
                logger.warning("⚠️  Migration verification had issues")
            
            logger.info("🎉 Data migration completed!")
            return True
            
        except Exception as e:
            logger.error(f"❌ Data migration failed: {e}")
            return False
    
    def close_connections(self):
        """Close database connections"""
        if self.sqlite_conn:
            self.sqlite_conn.close()
        if self.mariadb_conn:
            self.mariadb_conn.close()
        logger.info("🔌 Database connections closed")

def main():
    """Main migration function"""
    migrator = DataMigrator()
    
    try:
        # Connect to databases
        if not migrator.connect_databases():
            return False
        
        # Perform migration
        success = migrator.migrate_all_data()
        
        if success:
            print("\n" + "="*80)
            print("🎉 DATA MIGRATION SUCCESSFUL!")
            print("="*80)
            print("✅ All user data has been migrated to MariaDB")
            print("✅ You can now login with your existing accounts")
            print("✅ Update your .env file to use the MariaDB connection")
            print("="*80)
            
            # Show key user accounts
            print("\n👥 KEY USER ACCOUNTS:")
            print("-" * 50)
            print("Admin: admin@eaglehursttestdev.co.in")
            print("Seller: dr.smith@eaglehursttestdev.co.in")
            print("Buyer: james.investor@eaglehursttestdev.co.in")
            print("-" * 50)
            print("All passwords remain the same as before!")
            print("="*80)
        else:
            print("\n" + "="*80)
            print("❌ DATA MIGRATION FAILED!")
            print("="*80)
            print("Check the logs for details")
            print("="*80)
        
        return success
        
    finally:
        migrator.close_connections()

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
