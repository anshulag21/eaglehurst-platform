#!/usr/bin/env python3
"""
Create fresh SQLite database from models
"""

import sys
import os
sys.path.append('backend')

from sqlalchemy import create_engine
from backend.app.models.base import Base
from backend.app.core.config import settings

def create_fresh_database():
    """Create fresh database with all tables"""
    print("🔄 Creating fresh SQLite database...")
    
    # Remove existing database file if it exists
    db_file = "backend/eaglehurst_local.db"
    if os.path.exists(db_file):
        os.remove(db_file)
        print(f"✅ Removed existing database: {db_file}")
    
    # Create engine
    engine = create_engine("sqlite:///backend/eaglehurst_local.db")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("✅ Created fresh SQLite database with all tables")
    print(f"📁 Database location: {os.path.abspath(db_file)}")
    
    return True

if __name__ == "__main__":
    create_fresh_database()
