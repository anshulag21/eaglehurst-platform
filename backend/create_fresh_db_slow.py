"""
Initialization script for Production MariaDB/MySQL
This script creates all required tables one-by-one with pauses to avoid proxy timeouts
"""
import os
import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine, inspect
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
        print("❌ Error: DATABASE_URL is missing.")
        return

    print(f"🔧 Connecting to database: {database_url.split('@')[-1]}")
    
    try:
        # Create engine
        engine = create_engine(database_url, echo=False)
        
        # Get list of tables to create
        tables = Base.metadata.sorted_tables
        print(f"📊 Found {len(tables)} tables to create/verify.")
        
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        for table in tables:
            if table.name in existing_tables:
                print(f"⏭️  Table '{table.name}' already exists. Skipping.")
            else:
                print(f"🛠️  Creating table '{table.name}'...")
                table.create(bind=engine)
                print(f"✅ Created '{table.name}'")
                # Small pause to avoid proxy disconnects
                time.sleep(1)
        
        print("\n" + "="*50)
        print("🎉 SUCCESS: Database initialization complete!")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Failed to create database: {e}")

if __name__ == "__main__":
    db_url = sys.argv[1] if len(sys.argv) > 1 else os.getenv("DATABASE_URL")
    if not db_url:
        print("Usage: python create_fresh_db_slow.py <YOUR_DATABASE_URL>")
    else:
        create_production_db(db_url)
