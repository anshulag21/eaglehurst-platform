#!/usr/bin/env python3
"""
Backend Build Script for Production Deployment

This script creates a production-ready build of the backend
that can be deployed to your remote server.
"""

import os
import shutil
import subprocess
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_build_directory():
    """Create build directory structure"""
    try:
        build_dir = Path("/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/build")
        
        # Remove existing build directory
        if build_dir.exists():
            shutil.rmtree(build_dir)
            logger.info("🧹 Removed existing build directory")
        
        # Create new build directory
        build_dir.mkdir(exist_ok=True)
        logger.info(f"📁 Created build directory: {build_dir}")
        
        return build_dir
        
    except Exception as e:
        logger.error(f"❌ Failed to create build directory: {e}")
        return None

def copy_application_files(build_dir):
    """Copy application files to build directory"""
    try:
        backend_dir = Path("/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend")
        
        # Files and directories to copy
        items_to_copy = [
            "app",
            "alembic",
            "requirements.txt",
            "alembic.ini",
            ".env.server",
            "start_backend_server.sh",
            "SERVER_DEPLOYMENT_GUIDE.md"
        ]
        
        for item in items_to_copy:
            src = backend_dir / item
            dst = build_dir / item
            
            if src.exists():
                if src.is_dir():
                    shutil.copytree(src, dst, ignore=shutil.ignore_patterns('__pycache__', '*.pyc', '*.pyo'))
                    logger.info(f"📂 Copied directory: {item}")
                else:
                    shutil.copy2(src, dst)
                    logger.info(f"📄 Copied file: {item}")
            else:
                logger.warning(f"⚠️  Item not found: {item}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to copy application files: {e}")
        return False

def create_production_requirements(build_dir):
    """Create optimized requirements.txt for production"""
    try:
        # Read existing requirements
        backend_dir = Path("/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend")
        req_file = backend_dir / "requirements.txt"
        
        if req_file.exists():
            with open(req_file, 'r') as f:
                requirements = f.read()
        else:
            # Create basic requirements if file doesn't exist
            requirements = """fastapi==0.104.1
uvicorn[standard]==0.24.0
sqlalchemy==2.0.23
pymysql==1.1.0
cryptography==41.0.7
pydantic==2.5.0
pydantic-core==2.14.5
pydantic-settings==2.1.0
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-dotenv==1.0.0
alembic==1.12.1
gunicorn==21.2.0
email-validator==2.1.0
aiofiles==23.2.1
Pillow==10.1.0
psutil==5.9.6
"""
        
        # Add production-specific packages
        production_additions = """
# Production packages
gunicorn==21.2.0
psutil==5.9.6
"""
        
        # Write production requirements
        prod_req_file = build_dir / "requirements.txt"
        with open(prod_req_file, 'w') as f:
            f.write(requirements)
            if "gunicorn" not in requirements:
                f.write(production_additions)
        
        logger.info("✅ Created production requirements.txt")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create production requirements: {e}")
        return False

def create_deployment_scripts(build_dir):
    """Create deployment and startup scripts"""
    try:
        # Deployment script
        deploy_script = """#!/bin/bash
# CareAcquire Backend Deployment Script
# Server: 37.220.31.46

set -e  # Exit on any error

echo "🚀 Deploying CareAcquire Backend to 37.220.31.46"
echo "================================================"

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed"
    exit 1
fi

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Copy environment configuration
echo "⚙️  Setting up environment..."
cp .env.server .env

# Make scripts executable
chmod +x start_server.sh
chmod +x stop_server.sh

echo "✅ Deployment complete!"
echo ""
echo "🚀 To start the server:"
echo "   ./start_server.sh"
echo ""
echo "🛑 To stop the server:"
echo "   ./stop_server.sh"
echo ""
echo "🌐 Access your API at: http://37.220.31.46:8000"
echo "📚 API Documentation: http://37.220.31.46:8000/docs"
"""

        # Start server script
        start_script = """#!/bin/bash
# Start CareAcquire Backend Server

set -e

echo "🚀 Starting Eaglehurst Backend Server..."

# Activate virtual environment
source venv/bin/activate

# Check if server is already running
if pgrep -f "uvicorn app.main:app" > /dev/null; then
    echo "⚠️  Server is already running!"
    echo "   Use ./stop_server.sh to stop it first"
    exit 1
fi

# Start the server
echo "✅ Starting server on 0.0.0.0:8000..."
nohup python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > server.log 2>&1 &

# Get the process ID
SERVER_PID=$!
echo $SERVER_PID > server.pid

sleep 2

# Check if server started successfully
if ps -p $SERVER_PID > /dev/null; then
    echo "🎉 Server started successfully!"
    echo "   PID: $SERVER_PID"
    echo "   Log: tail -f server.log"
    echo "   URL: http://37.220.31.46:8000"
    echo "   Docs: http://37.220.31.46:8000/docs"
else
    echo "❌ Server failed to start. Check server.log for details."
    exit 1
fi
"""

        # Stop server script
        stop_script = """#!/bin/bash
# Stop Eaglehurst Backend Server

echo "🛑 Stopping Eaglehurst Backend Server..."

if [ -f server.pid ]; then
    PID=$(cat server.pid)
    if ps -p $PID > /dev/null; then
        kill $PID
        echo "✅ Server stopped (PID: $PID)"
        rm server.pid
    else
        echo "⚠️  Server process not found"
        rm server.pid
    fi
else
    echo "⚠️  No PID file found"
    # Try to kill any uvicorn processes
    pkill -f "uvicorn app.main:app" || echo "No uvicorn processes found"
fi

echo "🏁 Server shutdown complete"
"""

        # Status check script
        status_script = """#!/bin/bash
# Check Eaglehurst Backend Server Status

echo "📊 Eaglehurst Backend Server Status"
echo "=================================="

if [ -f server.pid ]; then
    PID=$(cat server.pid)
    if ps -p $PID > /dev/null; then
        echo "✅ Server is running (PID: $PID)"
        echo "🌐 URL: http://37.220.31.46:8000"
        echo "📚 Docs: http://37.220.31.46:8000/docs"
        echo ""
        echo "📊 Process info:"
        ps -p $PID -o pid,ppid,cmd,start,time
    else
        echo "❌ Server is not running (stale PID file)"
        rm server.pid
    fi
else
    echo "❌ Server is not running"
fi

echo ""
echo "📋 Recent logs (last 10 lines):"
if [ -f server.log ]; then
    tail -10 server.log
else
    echo "No log file found"
fi
"""

        # Write scripts
        scripts = {
            "deploy.sh": deploy_script,
            "start_server.sh": start_script,
            "stop_server.sh": stop_script,
            "status.sh": status_script
        }
        
        for script_name, script_content in scripts.items():
            script_file = build_dir / script_name
            with open(script_file, 'w') as f:
                f.write(script_content)
            os.chmod(script_file, 0o755)  # Make executable
            logger.info(f"✅ Created {script_name}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create deployment scripts: {e}")
        return False

def create_production_config(build_dir):
    """Create production configuration files"""
    try:
        # Production .env file
        prod_env = """# Production Environment Configuration
# Server: 37.220.31.46

# Database Configuration
DATABASE_URL="mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@37.220.31.46:3306/eaglehurst_db"

# Application Settings
APP_NAME="Eaglehurst API"
APP_VERSION="1.0.0"
DEBUG=false

# URLs
FRONTEND_URL="http://37.220.31.46"
API_URL="http://37.220.31.46:8000"

# Security Keys - CHANGE IN PRODUCTION!
SECRET_KEY="prod-secret-key-eaglehurst-2024-change-this-to-something-more-secure-32chars"
JWT_SECRET_KEY="prod-jwt-secret-eaglehurst-2024-change-this-to-something-more-secure-32chars"
ENCRYPTION_KEY="prod-encryption-key-eaglehurst-2024-change-this-to-something-more-secure"

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USERNAME="eaglehurst.testuser@gmail.com"
SMTP_PASSWORD="pujo wbzq xwls htsr"
FROM_EMAIL="eaglehurst.testuser@gmail.com"
FROM_NAME="Eaglehurst Platform"

# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_dev_key"
STRIPE_PUBLISHABLE_KEY="pk_test_dev_key"
STRIPE_WEBHOOK_SECRET="whsec_dev_secret"

# AWS S3 Configuration
AWS_ACCESS_KEY_ID="dev-aws-key"
AWS_SECRET_ACCESS_KEY="dev-aws-secret"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="eaglehurst-dev-files"

# Redis Configuration
REDIS_URL="redis://localhost:6379"

# CORS Configuration
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173,http://37.220.31.46:5173,http://37.220.31.46:8000,http://37.220.31.46"

# Rate Limiting
RATE_LIMIT_ENABLED=true

# File Upload
MAX_FILE_SIZE=10485760

# Monitoring
SENTRY_DSN=""
"""
        
        # Write production .env
        env_file = build_dir / ".env.server"
        with open(env_file, 'w') as f:
            f.write(prod_env)
        
        logger.info("✅ Created production .env.server")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create production config: {e}")
        return False

def create_readme(build_dir):
    """Create README for the build"""
    readme_content = """# Eaglehurst Backend - Production Build

## 🚀 Quick Deployment

1. Upload this entire folder to your server at `37.220.31.46`
2. SSH into your server: `ssh user@37.220.31.46`
3. Navigate to the uploaded folder: `cd eaglehurst-backend-build`
4. Run deployment: `./deploy.sh`
5. Start server: `./start_server.sh`

## 📋 Available Scripts

- `./deploy.sh` - Initial deployment setup
- `./start_server.sh` - Start the backend server
- `./stop_server.sh` - Stop the backend server
- `./status.sh` - Check server status

## 🌐 Access Points

- **API**: http://37.220.31.46:8000
- **Documentation**: http://37.220.31.46:8000/docs
- **Health Check**: http://37.220.31.46:8000/health

## 🔑 Test Accounts

- **Admin**: admin@eaglehursttestdev.co.in
- **Seller**: dr.smith@eaglehursttestdev.co.in
- **Buyer**: james.investor@eaglehursttestdev.co.in

All passwords remain the same as before!

## 📊 Database

Your MariaDB database is already set up with all user data:
- 23 user accounts
- Business listings
- Connections and messages
- Subscriptions and payments

## 🛠️ Troubleshooting

Check server logs: `tail -f server.log`
Check server status: `./status.sh`

## 📞 Support

All your data is migrated and ready to use!
"""
    
    try:
        readme_file = build_dir / "README.md"
        with open(readme_file, 'w') as f:
            f.write(readme_content)
        
        logger.info("✅ Created README.md")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create README: {e}")
        return False

def create_build_archive(build_dir):
    """Create a deployable archive"""
    try:
        # Create tar.gz archive
        archive_name = "eaglehurst-backend-build"
        archive_path = build_dir.parent / f"{archive_name}.tar.gz"
        
        # Remove existing archive
        if archive_path.exists():
            archive_path.unlink()
        
        # Create archive
        subprocess.run([
            "tar", "-czf", str(archive_path), 
            "-C", str(build_dir.parent), 
            build_dir.name
        ], check=True)
        
        logger.info(f"📦 Created deployment archive: {archive_path}")
        
        # Get archive size
        size_mb = archive_path.stat().st_size / (1024 * 1024)
        logger.info(f"📊 Archive size: {size_mb:.2f} MB")
        
        return archive_path
        
    except Exception as e:
        logger.error(f"❌ Failed to create archive: {e}")
        return None

def main():
    """Main build function"""
    logger.info("🏗️  Building Eaglehurst Backend for Production Deployment...")
    
    print("="*60)
    print("🏗️  BACKEND BUILD FOR PRODUCTION")
    print("="*60)
    
    # Create build directory
    build_dir = create_build_directory()
    if not build_dir:
        return False
    
    success_count = 0
    total_tasks = 6
    
    # Copy application files
    if copy_application_files(build_dir):
        success_count += 1
    
    # Create production requirements
    if create_production_requirements(build_dir):
        success_count += 1
    
    # Create deployment scripts
    if create_deployment_scripts(build_dir):
        success_count += 1
    
    # Create production config
    if create_production_config(build_dir):
        success_count += 1
    
    # Create README
    if create_readme(build_dir):
        success_count += 1
    
    # Create archive
    archive_path = create_build_archive(build_dir)
    if archive_path:
        success_count += 1
    
    print("\n" + "="*60)
    if success_count == total_tasks:
        print("🎉 BUILD SUCCESSFUL!")
        print("="*60)
        print("✅ Production build created successfully")
        print(f"📁 Build directory: {build_dir}")
        if archive_path:
            print(f"📦 Deployment archive: {archive_path}")
        print("")
        print("📋 Build includes:")
        print("  - Application code (without __pycache__)")
        print("  - Production requirements.txt")
        print("  - Deployment scripts")
        print("  - Production configuration")
        print("  - Documentation")
        print("")
        print("🚀 Deployment steps:")
        print("1. Upload the build folder to your server 37.220.31.46")
        print("2. SSH into server: ssh user@37.220.31.46")
        print("3. Extract and deploy: tar -xzf eaglehurst-backend-build.tar.gz")
        print("4. cd eaglehurst-backend-build && ./deploy.sh")
        print("5. ./start_server.sh")
        print("")
        print("🌐 Your API will be available at: http://37.220.31.46:8000")
        print("="*60)
    else:
        print("❌ BUILD FAILED!")
        print(f"✅ {success_count}/{total_tasks} tasks completed")
    
    return success_count == total_tasks

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
