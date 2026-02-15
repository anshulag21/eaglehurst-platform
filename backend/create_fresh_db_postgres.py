"""
Initialization script for Production PostgreSQL
This script creates all required tables for the CareAcquire platform
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

    # Convert to postgresql+psycopg2 if needed
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg2://", 1)

    print(f"🔧 Connecting to PostgreSQL: {database_url.split('@')[-1]}")
    
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
                time.sleep(0.5)
        
        print("\n" + "="*50)
        print("🎉 SUCCESS: PostgreSQL initialization complete!")
        print("="*50)
        
    except Exception as e:
        print(f"❌ Failed to create database: {e}")

if __name__ == "__main__":
    # Use the connection details provided by the user
    db_url = "postgresql+psycopg2://postgres:vIGZUYMlHipTLnKyyyvReDPwSoDPIbYI@centerbeam.proxy.rlwy.net:27160/railway"
    create_production_db(db_url)
