"""
Migration script to move dummy users and related data from local SQLite to Railway PostgreSQL.
"""
import sys
import os
import uuid
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sqlite3

# Add app directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.models.user_models import User, Seller, Buyer
from app.models.listing_models import Listing
from app.core.database import Base

# Configuration
SQLITE_DB = 'eaglehurst.db'
POSTGRES_URL = "postgresql+psycopg2://postgres:vIGZUYMlHipTLnKyyyvReDPwSoDPIbYI@centerbeam.proxy.rlwy.net:27160/railway"

def migrate():
    print(f"🚀 Starting migration from {SQLITE_DB} to Railway PostgreSQL...")

    # Connect to PostgreSQL
    pg_engine = create_engine(POSTGRES_URL)
    Base.metadata.create_all(bind=pg_engine) # Ensure tables exist
    PgSession = sessionmaker(bind=pg_engine)
    pg_session = PgSession()

    # Connect to SQLite
    sqlite_conn = sqlite3.connect(SQLITE_DB)
    sqlite_conn.row_factory = sqlite3.Row
    sqlite_cursor = sqlite_conn.cursor()

    try:
        # 1. Migrate Users
        print("👤 Migrating Users...")
        sqlite_cursor.execute("SELECT * FROM users")
        rows = sqlite_cursor.fetchall()
        for row in rows:
            user = User(
                id=uuid.UUID(row['id']),
                email=row['email'],
                password_hash=row['password_hash'],
                user_type=row['user_type'],
                first_name=row['first_name'],
                last_name=row['last_name'],
                phone=row['phone'],
                is_verified=bool(row['is_verified']),
                is_active=bool(row['is_active'])
            )
            pg_session.merge(user)
        pg_session.commit()
        print(f"✅ Migrated {len(rows)} users.")

        # 2. Migrate Sellers
        print("🏢 Migrating Sellers...")
        sqlite_cursor.execute("SELECT * FROM sellers")
        rows = sqlite_cursor.fetchall()
        for row in rows:
            seller = Seller(
                id=uuid.UUID(row['id']),
                user_id=uuid.UUID(row['user_id']),
                business_name=row['business_name'],
                verification_status=row['verification_status']
            )
            pg_session.merge(seller)
        pg_session.commit()
        print(f"✅ Migrated {len(rows)} sellers.")

        # 3. Migrate Buyers
        print("🛍️ Migrating Buyers...")
        sqlite_cursor.execute("SELECT * FROM buyers")
        rows = sqlite_cursor.fetchall()
        for row in rows:
            buyer = Buyer(
                id=uuid.UUID(row['id']),
                user_id=uuid.UUID(row['user_id']),
                verification_status=row['verification_status']
            )
            pg_session.merge(buyer)
        pg_session.commit()
        print(f"✅ Migrated {len(rows)} buyers.")

        # 4. Migrate Listings
        print("📝 Migrating Listings...")
        sqlite_cursor.execute("SELECT * FROM listings")
        rows = sqlite_cursor.fetchall()
        for row in rows:
            listing = Listing(
                id=uuid.UUID(row['id']),
                seller_id=uuid.UUID(row['seller_id']),
                title=row['title'],
                description=row['description'],
                business_type=row['business_type'],
                location=row['location'],
                status=row['status']
            )
            pg_session.merge(listing)
        pg_session.commit()
        print(f"✅ Migrated {len(rows)} listings.")

        print("\n🎉 Migration to PostgreSQL completed successfully!")

    except Exception as e:
        print(f"❌ Error during migration: {e}")
        pg_session.rollback()
    finally:
        sqlite_conn.close()
        pg_session.close()

if __name__ == "__main__":
    migrate()
