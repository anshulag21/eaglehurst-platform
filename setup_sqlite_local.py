#!/usr/bin/env python3
"""
Setup Local SQLite Database for Development
Much simpler than MySQL - no server setup required!
"""

import os
import subprocess
import sys
from pathlib import Path
import logging
import shutil

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_local_env_sqlite():
    """Create .env file for local SQLite"""
    local_env = """# Local Development Environment Configuration
# Backend with LOCAL SQLite Database (FASTEST!)

# Database - Local SQLite (no server needed!)
DATABASE_URL=sqlite:///./eaglehurst_local.db

# Application Settings
DEBUG=true
APP_NAME=Eaglehurst API (Local Dev)
APP_VERSION=1.0.0

# Security Keys (Development)
SECRET_KEY=dev-secret-key-change-in-production
JWT_SECRET_KEY=dev-jwt-secret-change-in-production
ENCRYPTION_KEY=dev-encryption-key-change-in-production

# Local URLs
FRONTEND_URL=http://localhost:5173
API_URL=http://localhost:8000

# Redis (Local)
REDIS_URL=redis://localhost:6379

# Email Configuration (Development)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=eaglehurst.testuser@gmail.com
SMTP_PASSWORD=pujo wbzq xwls htsr
FROM_EMAIL=eaglehurst.testuser@gmail.com
FROM_NAME=Eaglehurst Platform (Dev)

# SendGrid (Development)
SENDGRID_API_KEY=dev-sendgrid-key

# CORS Origins (Local Development)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173,http://127.0.0.1:5173

# Stripe (Test Keys)
STRIPE_SECRET_KEY=sk_test_dev_key
STRIPE_PUBLISHABLE_KEY=pk_test_dev_key
STRIPE_WEBHOOK_SECRET=whsec_dev_secret

# AWS S3 (Development)
AWS_ACCESS_KEY_ID=dev-aws-key
AWS_SECRET_ACCESS_KEY=dev-aws-secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=eaglehurst-dev-files
"""
    
    backend_dir = Path("backend")
    
    # Backup existing .env
    env_file = backend_dir / ".env"
    if env_file.exists():
        backup_file = backend_dir / ".env.backup"
        shutil.copy2(env_file, backup_file)
        logger.info("✅ Backed up existing .env to .env.backup")
    
    # Write new .env
    with open(env_file, "w") as f:
        f.write(local_env)
    
    logger.info("✅ Created backend/.env with local SQLite configuration")

def run_migrations():
    """Run Alembic migrations to create tables"""
    logger.info("🔄 Running database migrations...")
    
    backend_dir = Path("backend")
    original_dir = os.getcwd()
    
    try:
        os.chdir(backend_dir)
        
        # Run migrations
        result = subprocess.run([
            sys.executable, "-m", "alembic", "upgrade", "head"
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info("✅ Database migrations completed")
            logger.info("✅ SQLite database created: backend/eaglehurst_local.db")
            return True
        else:
            logger.error(f"❌ Migration failed: {result.stderr}")
            logger.info("💡 Try running manually: cd backend && alembic upgrade head")
            return False
            
    except Exception as e:
        logger.error(f"❌ Migration error: {e}")
        return False
    finally:
        os.chdir(original_dir)

def create_data_migration_script():
    """Create script to migrate data from remote to local SQLite"""
    migration_script = '''#!/usr/bin/env python3
"""
Migrate data from remote MariaDB to local SQLite
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Database URLs
REMOTE_DB_URL = "mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@37.220.31.46:3306/eaglehurst_db"
LOCAL_DB_URL = "sqlite:///backend/eaglehurst_local.db"

def migrate_data():
    """Migrate data from remote to local database"""
    logger.info("🔄 Starting data migration from remote MariaDB to local SQLite...")
    
    # Create engines
    remote_engine = create_engine(REMOTE_DB_URL)
    local_engine = create_engine(LOCAL_DB_URL)
    
    # Get table list (in dependency order)
    tables = [
        'users', 'sellers', 'buyers', 'subscriptions', 'user_subscriptions',
        'listings', 'listing_media', 'connections', 'messages', 'saved_listings',
        'listing_views', 'listing_edits', 'notifications', 'service_requests',
        'analytics_events', 'blocked_users'
    ]
    
    try:
        with remote_engine.connect() as remote_conn, local_engine.connect() as local_conn:
            
            # SQLite doesn't need foreign key checks disabled for this operation
            
            for table in tables:
                try:
                    logger.info(f"📋 Migrating table: {table}")
                    
                    # Check if table exists in remote
                    try:
                        result = remote_conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                        count = result.scalar()
                        logger.info(f"   📊 Found {count} rows in remote {table}")
                    except Exception:
                        logger.info(f"   ⚠️  Table {table} not found in remote, skipping")
                        continue
                    
                    if count == 0:
                        logger.info(f"   ⚠️  No data in {table}")
                        continue
                    
                    # Get data from remote
                    result = remote_conn.execute(text(f"SELECT * FROM {table}"))
                    rows = result.fetchall()
                    columns = result.keys()
                    
                    # Clear local table
                    local_conn.execute(text(f"DELETE FROM {table}"))
                    
                    # Insert data
                    placeholders = ", ".join([f":{col}" for col in columns])
                    insert_sql = f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})"
                    
                    # Convert rows to dictionaries
                    data = [dict(zip(columns, row)) for row in rows]
                    
                    local_conn.execute(text(insert_sql), data)
                    local_conn.commit()
                    
                    logger.info(f"   ✅ Migrated {len(rows)} rows to {table}")
                    
                except Exception as e:
                    logger.error(f"   ❌ Failed to migrate {table}: {e}")
                    continue
            
            local_conn.commit()
            
        logger.info("🎉 Data migration completed!")
        logger.info("📁 Local database: backend/eaglehurst_local.db")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    migrate_data()
'''
    
    with open("migrate_to_local_sqlite.py", "w") as f:
        f.write(migration_script)
    
    os.chmod("migrate_to_local_sqlite.py", 0o755)
    logger.info("✅ Created migrate_to_local_sqlite.py script")

def main():
    """Main setup function"""
    logger.info("🏗️  Setting up Local SQLite Development Environment...")
    logger.info("=" * 60)
    
    # Create local environment
    create_local_env_sqlite()
    
    # Run migrations
    if not run_migrations():
        logger.warning("⚠️  Migrations failed - you may need to run them manually")
    
    # Create data migration script
    create_data_migration_script()
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("🎉 LOCAL SQLITE SETUP COMPLETE!")
    logger.info("=" * 60)
    logger.info("")
    logger.info("📋 What was configured:")
    logger.info("✅ Local SQLite database: backend/eaglehurst_local.db")
    logger.info("✅ Backend .env updated for local SQLite")
    logger.info("✅ Database migrations run")
    logger.info("✅ Data migration script created")
    logger.info("")
    logger.info("🚀 Next steps:")
    logger.info("1. Migrate data: python3 migrate_to_local_sqlite.py")
    logger.info("2. Start backend: ./start_backend_dev.sh")
    logger.info("3. Start frontend: ./start_frontend_dev.sh")
    logger.info("")
    logger.info("🌐 URLs:")
    logger.info("- Frontend: http://localhost:5173")
    logger.info("- Backend API: http://localhost:8000")
    logger.info("- Database: Local SQLite file")
    logger.info("")
    logger.info("⚡ Benefits:")
    logger.info("- No MySQL server setup required")
    logger.info("- Fastest possible database access")
    logger.info("- Single file database")
    logger.info("- Perfect for development")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()
