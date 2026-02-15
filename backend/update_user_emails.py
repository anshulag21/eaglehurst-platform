#!/usr/bin/env python3
"""
Script to update all user email addresses to use @eaglehursttestdev.co.in domain
This is for protecting actual email addresses in the test environment.
"""

import sys
import os
from datetime import datetime, timezone

# Add the app directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from sqlalchemy.orm import Session
from app.core.database import get_db, engine
from app.models.user_models import User

def update_user_emails(db: Session):
    """Update all user email addresses to use @eaglehursttestdev.co.in domain"""
    print("🔄 Updating user email addresses...")
    
    try:
        # Get all users
        users = db.query(User).all()
        
        if not users:
            print("❌ No users found in the database")
            return
        
        print(f"📧 Found {len(users)} users to update")
        
        updated_count = 0
        for user in users:
            # Extract the local part (before @) from the current email
            if '@' in user.email:
                local_part = user.email.split('@')[0]
            else:
                # If no @ found, use the whole email as local part
                local_part = user.email
            
            # Create new email with the test domain
            new_email = f"{local_part}@eaglehursttestdev.co.in"
            
            # Update the email if it's different
            if user.email != new_email:
                old_email = user.email
                user.email = new_email
                user.updated_at = datetime.now(timezone.utc)
                
                print(f"   ✅ Updated: {old_email} → {new_email}")
                updated_count += 1
            else:
                print(f"   ⏭️  Skipped: {user.email} (already has correct domain)")
        
        # Commit all changes
        db.commit()
        
        print(f"\n✅ Email update completed successfully!")
        print(f"   - Total users processed: {len(users)}")
        print(f"   - Users updated: {updated_count}")
        print(f"   - Users skipped: {len(users) - updated_count}")
        
        # Display all updated emails for verification
        print(f"\n📋 Current user emails:")
        updated_users = db.query(User).all()
        for user in updated_users:
            print(f"   - {user.user_type.upper()}: {user.first_name} {user.last_name} ({user.email})")
        
    except Exception as e:
        print(f"❌ Error updating user emails: {e}")
        db.rollback()
        raise

def main():
    """Main function to update user emails"""
    print("🚀 Starting email domain update for Eaglehurst users...")
    print("🎯 Target domain: @eaglehursttestdev.co.in")
    
    try:
        # Get database session
        db = next(get_db())
        
        # Update user emails
        update_user_emails(db)
        
        print("\n🎉 All user emails have been updated to use the test domain!")
        print("🔐 This protects actual email addresses in the development environment.")
        
    except Exception as e:
        print(f"❌ Error in main execution: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    main()
