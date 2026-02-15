"""
Initialization script for Production MariaDB/MySQL
This script creates all required tables for the CareAcquire platform
"""
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine
from app.core.database import Base
# Import all models to ensure they are registered with Base metadata
from app.models import (
    user_models, 
    listing_models, 
    subscription_models, 
    connection_models, 
    service_models, 
    notification_models, 
    analytics_models,
    blocking_models
)

def create_production_db(database_url: str):
    """Create all tables in the specified database"""
    if not database_url:
        print("❌ Error: DATABASE_URL environment variable or argument is missing.")
        return

    print(f"🔧 Connecting to database: {database_url.split('@')[-1]}")
    
    try:
        # Create engine
        engine = create_engine(database_url, echo=True)
        
        # Create all tables defined in models
        print("📊 Creating all tables from SQLAlchemy models...")
        Base.metadata.create_all(bind=engine)
        
        print("\n" + "="*50)
        print("✅ SUCCESS: Database tables created successfully!")
        print(f"📋 Total tables created: {len(Base.metadata.tables)}")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Failed to create database: {e}")

if __name__ == "__main__":
    # You can pass the URL as a command line argument or set it in your environment
    db_url = sys.argv[1] if len(sys.argv) > 1 else os.getenv("DATABASE_URL")
    
    if not db_url:
        print("Usage: python create_fresh_db.py <YOUR_DATABASE_URL>")
    else:
        create_production_db(db_url)
