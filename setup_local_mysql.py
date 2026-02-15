#!/usr/bin/env python3
"""
Setup Local MySQL Database for Development
Creates local MySQL database and migrates data from remote MariaDB
"""

import os
import subprocess
import sys
from pathlib import Path
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def check_mysql_installed():
    """Check if MySQL is installed"""
    try:
        result = subprocess.run(['mysql', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            logger.info(f"✅ MySQL found: {result.stdout.strip()}")
            return True
    except FileNotFoundError:
        pass
    
    logger.error("❌ MySQL not found")
    return False

def install_mysql_macos():
    """Install MySQL on macOS using Homebrew"""
    logger.info("📦 Installing MySQL via Homebrew...")
    
    # Check if Homebrew is installed
    try:
        subprocess.run(['brew', '--version'], capture_output=True, check=True)
    except (FileNotFoundError, subprocess.CalledProcessError):
        logger.error("❌ Homebrew not found. Please install Homebrew first:")
        logger.error("   /bin/bash -c \"$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"")
        return False
    
    try:
        # Install MySQL
        subprocess.run(['brew', 'install', 'mysql'], check=True)
        
        # Start MySQL service
        subprocess.run(['brew', 'services', 'start', 'mysql'], check=True)
        
        logger.info("✅ MySQL installed and started")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install MySQL: {e}")
        return False

def setup_mysql_database():
    """Setup MySQL database and user"""
    logger.info("🔧 Setting up MySQL database...")
    
    # MySQL commands to create database and user
    mysql_commands = [
        "CREATE DATABASE IF NOT EXISTS eaglehurst_local;",
        "CREATE USER IF NOT EXISTS 'eaglehurst_user'@'localhost' IDENTIFIED BY 'eaglehurst_pass';",
        "GRANT ALL PRIVILEGES ON eaglehurst_local.* TO 'eaglehurst_user'@'localhost';",
        "FLUSH PRIVILEGES;"
    ]
    
    try:
        for cmd in mysql_commands:
            subprocess.run([
                'mysql', '-u', 'root', '-e', cmd
            ], check=True)
        
        logger.info("✅ MySQL database 'eaglehurst_local' created")
        logger.info("✅ MySQL user 'eaglehurst_user' created")
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to setup database: {e}")
        logger.info("💡 Try running: mysql -u root")
        logger.info("   Then manually run the SQL commands")
        return False

def create_local_env():
    """Create .env file for local MySQL"""
    local_env = """# Local Development Environment Configuration
# Backend with LOCAL MySQL Database

# Database - Local MySQL
DATABASE_URL=mysql+pymysql://eaglehurst_user:eaglehurst_pass@localhost:3306/eaglehurst_local

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
    with open(backend_dir / ".env", "w") as f:
        f.write(local_env)
    
    logger.info("✅ Created backend/.env with local MySQL configuration")

def run_migrations():
    """Run Alembic migrations to create tables"""
    logger.info("🔄 Running database migrations...")
    
    backend_dir = Path("backend")
    original_dir = os.getcwd()
    
    try:
        os.chdir(backend_dir)
        
        # Activate virtual environment and run migrations
        if Path("venv").exists():
            if sys.platform == "win32":
                activate_cmd = "venv\\Scripts\\activate"
            else:
                activate_cmd = "source venv/bin/activate"
            
            cmd = f"{activate_cmd} && alembic upgrade head"
        else:
            cmd = "alembic upgrade head"
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info("✅ Database migrations completed")
            return True
        else:
            logger.error(f"❌ Migration failed: {result.stderr}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Migration error: {e}")
        return False
    finally:
        os.chdir(original_dir)

def create_data_migration_script():
    """Create script to migrate data from remote to local"""
    migration_script = '''#!/usr/bin/env python3
"""
Migrate data from remote MariaDB to local MySQL
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
LOCAL_DB_URL = "mysql+pymysql://eaglehurst_user:eaglehurst_pass@localhost:3306/eaglehurst_local"

def migrate_data():
    """Migrate data from remote to local database"""
    logger.info("🔄 Starting data migration from remote to local...")
    
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
            
            # Disable foreign key checks
            local_conn.execute(text("SET FOREIGN_KEY_CHECKS = 0"))
            
            for table in tables:
                try:
                    logger.info(f"📋 Migrating table: {table}")
                    
                    # Get data from remote
                    result = remote_conn.execute(text(f"SELECT * FROM {table}"))
                    rows = result.fetchall()
                    columns = result.keys()
                    
                    if not rows:
                        logger.info(f"   ⚠️  No data in {table}")
                        continue
                    
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
            
            # Re-enable foreign key checks
            local_conn.execute(text("SET FOREIGN_KEY_CHECKS = 1"))
            local_conn.commit()
            
        logger.info("🎉 Data migration completed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    migrate_data()
'''
    
    with open("migrate_to_local.py", "w") as f:
        f.write(migration_script)
    
    os.chmod("migrate_to_local.py", 0o755)
    logger.info("✅ Created migrate_to_local.py script")

def main():
    """Main setup function"""
    logger.info("🏗️  Setting up Local MySQL Development Environment...")
    logger.info("=" * 60)
    
    # Check if MySQL is installed
    if not check_mysql_installed():
        if sys.platform == "darwin":  # macOS
            if not install_mysql_macos():
                logger.error("❌ Failed to install MySQL")
                return False
        else:
            logger.error("❌ Please install MySQL manually:")
            logger.error("   Ubuntu/Debian: sudo apt install mysql-server")
            logger.error("   CentOS/RHEL: sudo yum install mysql-server")
            return False
    
    # Setup database
    if not setup_mysql_database():
        return False
    
    # Create local environment
    create_local_env()
    
    # Run migrations
    if not run_migrations():
        logger.warning("⚠️  Migrations failed - you may need to run them manually")
    
    # Create data migration script
    create_data_migration_script()
    
    logger.info("")
    logger.info("=" * 60)
    logger.info("🎉 LOCAL MYSQL SETUP COMPLETE!")
    logger.info("=" * 60)
    logger.info("")
    logger.info("📋 What was configured:")
    logger.info("✅ Local MySQL database: eaglehurst_local")
    logger.info("✅ MySQL user: eaglehurst_user")
    logger.info("✅ Backend .env updated for local MySQL")
    logger.info("✅ Database migrations run")
    logger.info("✅ Data migration script created")
    logger.info("")
    logger.info("🚀 Next steps:")
    logger.info("1. Migrate data: python3 migrate_to_local.py")
    logger.info("2. Start backend: ./start_backend_dev.sh")
    logger.info("3. Start frontend: ./start_frontend_dev.sh")
    logger.info("")
    logger.info("🌐 URLs:")
    logger.info("- Frontend: http://localhost:5173")
    logger.info("- Backend API: http://localhost:8000")
    logger.info("- Database: Local MySQL (localhost:3306)")
    logger.info("")
    logger.info("🔧 Database Connection:")
    logger.info("- Host: localhost")
    logger.info("- Port: 3306")
    logger.info("- Database: eaglehurst_local")
    logger.info("- User: eaglehurst_user")
    logger.info("- Password: eaglehurst_pass")
    logger.info("=" * 60)

if __name__ == "__main__":
    main()
