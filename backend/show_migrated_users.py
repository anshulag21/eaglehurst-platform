#!/usr/bin/env python3
"""
Show Migrated Users Script

This script shows all the user accounts that have been successfully migrated
to the MariaDB database so you can login with them.
"""

import pymysql
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

MARIADB_CONFIG = {
    'host': '37.220.31.46',
    'user': 'remoteuser123',
    'password': 'G7v$9kL2pQ!x',
    'database': 'eaglehurst_db',
    'port': 3306,
    'charset': 'utf8mb4'
}

def show_migrated_users():
    """Show all migrated user accounts"""
    try:
        connection = pymysql.connect(**MARIADB_CONFIG)
        cursor = connection.cursor()
        
        print("="*100)
        print("👥 MIGRATED USER ACCOUNTS - READY FOR LOGIN")
        print("="*100)
        
        # Get all users with their profile information
        cursor.execute("""
            SELECT 
                u.email,
                u.user_type,
                u.first_name,
                u.last_name,
                u.is_verified,
                u.is_active,
                u.created_at,
                s.business_name,
                b.verification_status as buyer_status
            FROM users u
            LEFT JOIN sellers s ON u.id = s.user_id
            LEFT JOIN buyers b ON u.id = b.user_id
            ORDER BY u.user_type, u.email
        """)
        
        users = cursor.fetchall()
        
        # Group users by type
        admin_users = []
        seller_users = []
        buyer_users = []
        
        for user in users:
            email, user_type, first_name, last_name, is_verified, is_active, created_at, business_name, buyer_status = user
            
            user_info = {
                'email': email,
                'name': f"{first_name} {last_name}",
                'verified': "✅ Yes" if is_verified else "❌ No",
                'active': "✅ Yes" if is_active else "❌ No",
                'business_name': business_name,
                'buyer_status': buyer_status
            }
            
            if user_type == 'admin':
                admin_users.append(user_info)
            elif user_type == 'seller':
                seller_users.append(user_info)
            elif user_type == 'buyer':
                buyer_users.append(user_info)
        
        # Display admin users
        if admin_users:
            print(f"\n🔑 ADMIN ACCOUNTS ({len(admin_users)} total):")
            print("-" * 80)
            for user in admin_users:
                print(f"  📧 {user['email']:<35} | {user['name']:<20} | {user['verified']} | {user['active']}")
        
        # Display seller users
        if seller_users:
            print(f"\n🏥 SELLER ACCOUNTS ({len(seller_users)} total):")
            print("-" * 80)
            for user in seller_users:
                business = user['business_name'] if user['business_name'] else "No business name"
                print(f"  📧 {user['email']:<35} | {user['name']:<20} | {user['verified']} | {user['active']}")
                print(f"     🏢 Business: {business}")
                print()
        
        # Display buyer users
        if buyer_users:
            print(f"\n💰 BUYER ACCOUNTS ({len(buyer_users)} total):")
            print("-" * 80)
            for user in buyer_users:
                print(f"  📧 {user['email']:<35} | {user['name']:<20} | {user['verified']} | {user['active']}")
        
        # Show statistics
        print("\n" + "="*100)
        print("📊 MIGRATION STATISTICS")
        print("="*100)
        
        # Count data in each table
        tables_to_check = [
            ('users', 'User accounts'),
            ('sellers', 'Seller profiles'),
            ('buyers', 'Buyer profiles'),
            ('listings', 'Business listings'),
            ('connections', 'Buyer-seller connections'),
            ('messages', 'Messages exchanged'),
            ('subscriptions', 'Subscription plans'),
            ('user_subscriptions', 'User subscriptions'),
            ('payments', 'Payment records'),
            ('notifications', 'Notifications'),
            ('email_verifications', 'Email verifications'),
            ('user_blocks', 'User blocks'),
            ('listing_media', 'Listing media files'),
            ('saved_listings', 'Saved listings')
        ]
        
        total_records = 0
        for table, description in tables_to_check:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            total_records += count
            if count > 0:
                print(f"  ✅ {description:<25} | {count:>6} records")
        
        print("-" * 50)
        print(f"  📈 Total migrated records: {total_records}")
        
        print("\n" + "="*100)
        print("🎉 READY TO LOGIN!")
        print("="*100)
        print("✅ All user passwords remain the same as before")
        print("✅ Update your .env file with the MariaDB connection:")
        print('   DATABASE_URL="mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@37.220.31.46:3306/eaglehurst_db"')
        print("✅ Start your application and login with any of the accounts above")
        print("="*100)
        
        # Show some key test accounts
        print("\n🔑 KEY TEST ACCOUNTS:")
        print("-" * 50)
        print("Admin:  admin@eaglehursttestdev.co.in")
        print("Seller: dr.smith@eaglehursttestdev.co.in")
        print("Buyer:  james.investor@eaglehursttestdev.co.in")
        print("-" * 50)
        print("All passwords are the same as in your original database!")
        print("="*100)
        
        cursor.close()
        connection.close()
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to show migrated users: {e}")
        return False

def main():
    """Main function"""
    logger.info("🚀 Showing migrated user accounts...")
    success = show_migrated_users()
    return success

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
