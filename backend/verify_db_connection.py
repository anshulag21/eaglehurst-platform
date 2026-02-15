"""
Verify Database Connection and list tables
"""
import os
import sys
from sqlalchemy import create_engine, inspect

db_url = "mysql+pymysql://root:ruMXfGriDMZnIEKgcsAYkKUgzJlJrLQN@nozomi.proxy.rlwy.net:56420/railway"

def verify_db():
    print(f"🔍 Testing connection to: {db_url.split('@')[-1]}")
    try:
        engine = create_engine(db_url)
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        
        print(f"✅ Connection Successful!")
        print(f"📊 Found {len(tables)} tables:")
        for table in sorted(tables):
            print(f"  - {table}")
            
    except Exception as e:
        print(f"❌ Connection Failed: {e}")

if __name__ == "__main__":
    verify_db()
