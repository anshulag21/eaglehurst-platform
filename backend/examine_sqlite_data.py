#!/usr/bin/env python3
"""
SQLite Data Examination Script

This script examines the existing SQLite database to see what user data
needs to be migrated to MariaDB.
"""

import sqlite3
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def examine_sqlite_data():
    """Examine existing SQLite data"""
    db_path = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/eaglehurst.db"
    
    if not os.path.exists(db_path):
        logger.error(f"❌ SQLite database not found at: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("="*80)
        print("🔍 SQLITE DATABASE EXAMINATION")
        print("="*80)
        print(f"Database: {db_path}")
        print("="*80)
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [table[0] for table in cursor.fetchall()]
        
        print(f"\n📋 TABLES ({len(tables)} total):")
        print("-" * 40)
        
        table_data = {}
        total_rows = 0
        
        for table in sorted(tables):
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            row_count = cursor.fetchone()[0]
            table_data[table] = row_count
            total_rows += row_count
            
            print(f"  📊 {table:<25} | {row_count:>6} rows")
        
        print("-" * 40)
        print(f"  📈 TOTAL ROWS: {total_rows}")
        
        # Focus on key tables with data
        key_tables = ['users', 'sellers', 'buyers', 'listings', 'connections', 'messages', 'subscriptions', 'user_subscriptions']
        
        for table in key_tables:
            if table in table_data and table_data[table] > 0:
                print(f"\n📋 TABLE: {table.upper()} ({table_data[table]} rows)")
                print("-" * 60)
                
                # Get table structure
                cursor.execute(f"PRAGMA table_info({table})")
                columns = cursor.fetchall()
                
                print("Columns:")
                for col in columns:
                    col_id, name, type_, not_null, default, pk = col
                    pk_str = " (PK)" if pk else ""
                    print(f"  - {name}: {type_}{pk_str}")
                
                # Show sample data (first 3 rows)
                cursor.execute(f"SELECT * FROM {table} LIMIT 3")
                rows = cursor.fetchall()
                
                if rows:
                    print("\nSample data:")
                    column_names = [col[1] for col in columns]
                    
                    for i, row in enumerate(rows, 1):
                        print(f"  Row {i}:")
                        for j, value in enumerate(row):
                            if j < len(column_names):
                                # Truncate long values
                                if isinstance(value, str) and len(value) > 50:
                                    value = value[:47] + "..."
                                print(f"    {column_names[j]}: {value}")
                        print()
        
        # Special focus on users table
        if 'users' in table_data and table_data['users'] > 0:
            print(f"\n👥 USER ACCOUNTS DETAILS:")
            print("-" * 60)
            
            cursor.execute("SELECT id, email, user_type, first_name, last_name, is_verified, is_active, created_at FROM users")
            users = cursor.fetchall()
            
            print(f"{'Email':<30} {'Type':<8} {'Name':<20} {'Verified':<8} {'Active':<6} {'Created':<12}")
            print("-" * 90)
            
            for user in users:
                user_id, email, user_type, first_name, last_name, is_verified, is_active, created_at = user
                name = f"{first_name} {last_name}"
                verified = "Yes" if is_verified else "No"
                active = "Yes" if is_active else "No"
                created = created_at[:10] if created_at else "N/A"
                
                print(f"{email:<30} {user_type:<8} {name:<20} {verified:<8} {active:<6} {created:<12}")
        
        # Check for related data
        if 'users' in table_data and table_data['users'] > 0:
            print(f"\n🔗 RELATED DATA:")
            print("-" * 40)
            
            # Check sellers
            if 'sellers' in table_data:
                cursor.execute("SELECT COUNT(*) FROM sellers")
                seller_count = cursor.fetchone()[0]
                print(f"  📊 Sellers: {seller_count}")
            
            # Check buyers
            if 'buyers' in table_data:
                cursor.execute("SELECT COUNT(*) FROM buyers")
                buyer_count = cursor.fetchone()[0]
                print(f"  📊 Buyers: {buyer_count}")
            
            # Check listings
            if 'listings' in table_data:
                cursor.execute("SELECT COUNT(*) FROM listings")
                listing_count = cursor.fetchone()[0]
                print(f"  📊 Listings: {listing_count}")
            
            # Check connections
            if 'connections' in table_data:
                cursor.execute("SELECT COUNT(*) FROM connections")
                connection_count = cursor.fetchone()[0]
                print(f"  📊 Connections: {connection_count}")
        
        conn.close()
        
        print("\n" + "="*80)
        print("✅ SQLITE EXAMINATION COMPLETE!")
        print("="*80)
        
        if total_rows > 0:
            print(f"📊 Found {total_rows} total rows across {len(tables)} tables")
            print("🚀 Ready to migrate data to MariaDB")
        else:
            print("ℹ️  No data found in SQLite database")
        
        print("="*80)
        
        return total_rows > 0
        
    except Exception as e:
        logger.error(f"❌ Failed to examine SQLite data: {e}")
        return False

def main():
    """Main examination function"""
    logger.info("🚀 Starting SQLite data examination...")
    
    success = examine_sqlite_data()
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
