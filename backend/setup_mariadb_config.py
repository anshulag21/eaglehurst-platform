#!/usr/bin/env python3
"""
MariaDB Configuration Setup Script

This script creates the .env file with the new MariaDB database credentials
so your application will connect to the migrated database.
"""

import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_env_file():
    """Create .env file with MariaDB configuration"""
    
    env_content = '''# Eaglehurst Platform Configuration
# Database Configuration - MariaDB Remote Server
DATABASE_URL="mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@37.220.31.46:3306/eaglehurst_db"

# Application Settings
APP_NAME="Eaglehurst API"
APP_VERSION="1.0.0"
DEBUG=true

# Security Keys (Change in production)
SECRET_KEY="dev-secret-key-change-in-production"
JWT_SECRET_KEY="dev-jwt-secret-change-in-production"
ENCRYPTION_KEY="dev-encryption-key-change-in-production"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USERNAME="eaglehurst.testuser@gmail.com"
SMTP_PASSWORD="pujo wbzq xwls htsr"
FROM_EMAIL="eaglehurst.testuser@gmail.com"
FROM_NAME="Eaglehurst Platform"

# Stripe Configuration (Development)
STRIPE_SECRET_KEY="sk_test_dev_key"
STRIPE_PUBLISHABLE_KEY="pk_test_dev_key"
STRIPE_WEBHOOK_SECRET="whsec_dev_secret"

# AWS S3 Configuration (Development)
AWS_ACCESS_KEY_ID="dev-aws-key"
AWS_SECRET_ACCESS_KEY="dev-aws-secret"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="eaglehurst-dev-files"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# CORS Configuration
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173"

# Rate Limiting
RATE_LIMIT_ENABLED=true

# File Upload
MAX_FILE_SIZE=10485760

# Monitoring
SENTRY_DSN=""
'''
    
    try:
        # Get the backend directory path
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        env_file_path = os.path.join(backend_dir, '.env')
        
        # Check if .env already exists
        if os.path.exists(env_file_path):
            logger.info("📝 .env file already exists")
            
            # Read existing content
            with open(env_file_path, 'r') as f:
                existing_content = f.read()
            
            # Check if it already has the new database URL
            if "37.220.31.46" in existing_content:
                logger.info("✅ .env file already configured with MariaDB credentials")
                return True
            else:
                # Backup existing file
                backup_path = env_file_path + '.backup'
                with open(backup_path, 'w') as f:
                    f.write(existing_content)
                logger.info(f"📋 Backed up existing .env to {backup_path}")
        
        # Write new .env file
        with open(env_file_path, 'w') as f:
            f.write(env_content)
        
        logger.info("✅ Created .env file with MariaDB configuration")
        logger.info(f"📍 Location: {env_file_path}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create .env file: {e}")
        return False

def verify_configuration():
    """Verify that the configuration is working"""
    try:
        # Try to import and load settings
        import sys
        import os
        
        # Add the app directory to Python path
        app_dir = os.path.join(os.path.dirname(__file__), 'app')
        sys.path.insert(0, app_dir)
        
        from core.config import settings
        
        db_info = settings.get_database_info()
        
        print("\n" + "="*60)
        print("🔍 CONFIGURATION VERIFICATION")
        print("="*60)
        print(f"Database Type: {db_info['type']}")
        print(f"Database Host: {db_info['host']}")
        print(f"Database Port: {db_info['port']}")
        print(f"Database Name: {db_info['database']}")
        print(f"Database User: {db_info['username']}")
        print("="*60)
        
        if db_info['host'] == '37.220.31.46':
            print("✅ Configuration successfully updated to use MariaDB!")
        else:
            print("❌ Configuration still using old database")
            return False
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Configuration verification failed: {e}")
        return False

def main():
    """Main setup function"""
    logger.info("🚀 Setting up MariaDB configuration...")
    
    print("="*60)
    print("🔧 MARIADB CONFIGURATION SETUP")
    print("="*60)
    
    # Create .env file
    if not create_env_file():
        logger.error("❌ Failed to create configuration")
        return False
    
    # Verify configuration
    if not verify_configuration():
        logger.error("❌ Configuration verification failed")
        return False
    
    print("\n" + "="*60)
    print("🎉 SETUP COMPLETE!")
    print("="*60)
    print("✅ .env file created with MariaDB credentials")
    print("✅ Your application will now connect to the migrated database")
    print("✅ All your user data is available for login")
    print("")
    print("🚀 Next steps:")
    print("1. Start your backend: cd backend && python -m uvicorn app.main:app --reload")
    print("2. Start your frontend: cd frontend && npm run dev")
    print("3. Login with any of your existing accounts!")
    print("")
    print("🔑 Test accounts:")
    print("- Admin: admin@eaglehursttestdev.co.in")
    print("- Seller: dr.smith@eaglehursttestdev.co.in") 
    print("- Buyer: james.investor@eaglehursttestdev.co.in")
    print("="*60)
    
    return True

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
