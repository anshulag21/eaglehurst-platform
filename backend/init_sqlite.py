"""
Initialize SQLite database for local development
Run this script to create a fresh SQLite database with all tables
"""
import os
import sys
from pathlib import Path

# Set SQLite as database
os.environ['DATABASE_URL'] = 'sqlite:///./data/careacquire_local.db'

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import create_engine
from app.core.database import Base
from app.models import *  # Import all models

def init_db():
    """Initialize database with all tables"""
    print("🔧 Initializing SQLite database...")
    print(f"📁 Database location: {Path(__file__).parent}/data/careacquire_local.db")
    
    # Create data directory
    data_dir = Path(__file__).parent / "data"
    data_dir.mkdir(exist_ok=True)
    
    # Create engine
    database_url = "sqlite:///./data/careacquire_local.db"
    engine = create_engine(database_url, echo=False)
    
    # Drop all tables (fresh start)
    print("🗑️  Dropping existing tables...")
    Base.metadata.drop_all(bind=engine)
    
    # Create all tables
    print("📊 Creating all tables...")
    Base.metadata.create_all(bind=engine)
    
    print("✅ Database initialized successfully!")
    print(f"✅ Tables created: {len(Base.metadata.tables)}")
    print(f"📋 Tables: {', '.join(Base.metadata.tables.keys())}")
    
if __name__ == "__main__":
    init_db()

