#!/usr/bin/env python3
"""
Configure Backend for Remote Server Deployment

This script configures the backend to work with the remote server IP 37.220.31.46
for both backend and frontend over HTTP.
"""

import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

SERVER_IP = "37.220.31.46"
BACKEND_PORT = "8000"
FRONTEND_PORT = "5173"  # or 3000, depending on your setup

def update_backend_config():
    """Update backend configuration for the remote server"""
    config_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/app/core/config.py"
    
    try:
        with open(config_file, 'r') as f:
            content = f.read()
        
        # Update CORS origins to include the server IP
        old_origins = 'ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173,https://eaglehurst.com,https://www.eaglehurst.com,https://api.eaglehurst.com"'
        new_origins = f'ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173,http://{SERVER_IP}:{FRONTEND_PORT},http://{SERVER_IP}:{BACKEND_PORT},http://{SERVER_IP}"'
        
        if old_origins in content:
            content = content.replace(old_origins, new_origins)
        else:
            # Fallback - find the ALLOWED_ORIGINS line and update it
            import re
            pattern = r'ALLOWED_ORIGINS: str = "[^"]*"'
            replacement = f'ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173,http://{SERVER_IP}:{FRONTEND_PORT},http://{SERVER_IP}:{BACKEND_PORT},http://{SERVER_IP}"'
            content = re.sub(pattern, replacement, content)
        
        # Update frontend and API URLs if they exist
        if 'FRONTEND_URL: str' in content:
            content = re.sub(
                r'FRONTEND_URL: str = "[^"]*"',
                f'FRONTEND_URL: str = "http://{SERVER_IP}:{FRONTEND_PORT}"',
                content
            )
        
        if 'API_URL: str' in content:
            content = re.sub(
                r'API_URL: str = "[^"]*"',
                f'API_URL: str = "http://{SERVER_IP}:{BACKEND_PORT}"',
                content
            )
        
        with open(config_file, 'w') as f:
            f.write(content)
        
        logger.info("✅ Updated config.py for remote server")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to update config.py: {e}")
        return False

def create_server_env_file():
    """Create .env file configured for the remote server"""
    env_content = f'''# Eaglehurst Platform Configuration for Remote Server
# Server IP: {SERVER_IP}

# Database Configuration - MariaDB Remote Server
DATABASE_URL="mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@{SERVER_IP}:3306/eaglehurst_db"

# Application Settings
APP_NAME="Eaglehurst API"
APP_VERSION="1.0.0"
DEBUG=false

# URLs for remote server deployment
FRONTEND_URL="http://{SERVER_IP}:{FRONTEND_PORT}"
API_URL="http://{SERVER_IP}:{BACKEND_PORT}"

# Security Keys (Change in production)
SECRET_KEY="prod-secret-key-eaglehurst-2024-change-this-to-something-more-secure"
JWT_SECRET_KEY="prod-jwt-secret-eaglehurst-2024-change-this-to-something-more-secure"
ENCRYPTION_KEY="prod-encryption-key-eaglehurst-2024-change-this-to-something-more-secure"

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

# Redis Configuration (use localhost on server)
REDIS_URL="redis://localhost:6379"

# CORS Configuration - Allow server IP
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173,http://{SERVER_IP}:{FRONTEND_PORT},http://{SERVER_IP}:{BACKEND_PORT},http://{SERVER_IP}"

# Rate Limiting
RATE_LIMIT_ENABLED=true

# File Upload
MAX_FILE_SIZE=10485760

# Monitoring
SENTRY_DSN=""
'''
    
    try:
        env_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/.env.server"
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        logger.info("✅ Created .env.server file")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create .env.server: {e}")
        return False

def update_alembic_config():
    """Update alembic.ini to use the correct database URL"""
    alembic_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/alembic.ini"
    
    try:
        with open(alembic_file, 'r') as f:
            content = f.read()
        
        # Update the database URL in alembic.ini
        old_url = "sqlalchemy.url = postgresql://user:password@localhost/eaglehurst_db"
        new_url = f"sqlalchemy.url = mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@{SERVER_IP}:3306/eaglehurst_db"
        
        content = content.replace(old_url, new_url)
        
        with open(alembic_file, 'w') as f:
            f.write(content)
        
        logger.info("✅ Updated alembic.ini")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to update alembic.ini: {e}")
        return False

def create_deployment_scripts():
    """Create deployment scripts for the remote server"""
    
    # Backend start script
    backend_script = f'''#!/bin/bash
# Backend Start Script for Remote Server {SERVER_IP}

echo "🚀 Starting Eaglehurst Backend on {SERVER_IP}:{BACKEND_PORT}"

# Activate virtual environment
source venv/bin/activate

# Copy server environment file
cp .env.server .env

# Install/update dependencies
pip install -r requirements.txt

# Start the backend server
echo "✅ Starting backend server..."
python -m uvicorn app.main:app --host 0.0.0.0 --port {BACKEND_PORT} --reload

echo "🎉 Backend running at http://{SERVER_IP}:{BACKEND_PORT}"
echo "📚 API Documentation: http://{SERVER_IP}:{BACKEND_PORT}/docs"
'''
    
    # Frontend configuration script
    frontend_config = f'''#!/bin/bash
# Frontend Configuration Script for Remote Server {SERVER_IP}

echo "🔧 Configuring Frontend for Remote Server {SERVER_IP}"

# Update frontend API endpoint
cd ../frontend

# Create or update .env file for frontend
cat > .env << EOF
VITE_API_URL=http://{SERVER_IP}:{BACKEND_PORT}
VITE_APP_NAME=Eaglehurst Platform
VITE_APP_VERSION=1.0.0
EOF

echo "✅ Frontend configured to use backend at http://{SERVER_IP}:{BACKEND_PORT}"
echo "🚀 Run 'npm run dev -- --host 0.0.0.0 --port {FRONTEND_PORT}' to start frontend"
'''
    
    try:
        # Write backend script
        backend_script_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/start_backend_server.sh"
        with open(backend_script_file, 'w') as f:
            f.write(backend_script)
        os.chmod(backend_script_file, 0o755)  # Make executable
        
        # Write frontend config script
        frontend_script_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/configure_frontend.sh"
        with open(frontend_script_file, 'w') as f:
            f.write(frontend_config)
        os.chmod(frontend_script_file, 0o755)  # Make executable
        
        logger.info("✅ Created deployment scripts")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create deployment scripts: {e}")
        return False

def create_server_deployment_guide():
    """Create deployment guide for the specific server"""
    guide_content = f'''# Remote Server Deployment Guide
## Server IP: {SERVER_IP}

## 🚀 Quick Deployment Steps

### 1. Upload Files to Server
Upload your entire `eaglehurst-project` folder to your server at `{SERVER_IP}`.

### 2. Backend Setup
```bash
# SSH into your server
ssh user@{SERVER_IP}

# Navigate to backend directory
cd eaglehurst-project/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Use the server configuration
cp .env.server .env

# Start backend
./start_backend_server.sh
```

### 3. Frontend Setup (in another terminal)
```bash
# SSH into your server (new terminal)
ssh user@{SERVER_IP}

# Navigate to frontend directory
cd eaglehurst-project/frontend

# Install dependencies
npm install

# Configure frontend for server
../backend/configure_frontend.sh

# Start frontend
npm run dev -- --host 0.0.0.0 --port {FRONTEND_PORT}
```

## 🌐 Access Your Application

- **Frontend**: http://{SERVER_IP}:{FRONTEND_PORT}
- **Backend API**: http://{SERVER_IP}:{BACKEND_PORT}
- **API Documentation**: http://{SERVER_IP}:{BACKEND_PORT}/docs

## 🔑 Test Login Accounts

All your migrated accounts are available:
- **Admin**: admin@eaglehursttestdev.co.in
- **Seller**: dr.smith@eaglehursttestdev.co.in
- **Buyer**: james.investor@eaglehursttestdev.co.in

## 🔧 Configuration Details

### Backend Configuration:
- **Host**: 0.0.0.0 (binds to all interfaces)
- **Port**: {BACKEND_PORT}
- **Database**: MariaDB on {SERVER_IP}:3306
- **CORS**: Configured for {SERVER_IP}

### Frontend Configuration:
- **Host**: 0.0.0.0 (accessible from outside)
- **Port**: {FRONTEND_PORT}
- **API Endpoint**: http://{SERVER_IP}:{BACKEND_PORT}

## 🛠️ Troubleshooting

### If Backend Won't Start:
```bash
# Check if port is in use
sudo netstat -tlnp | grep {BACKEND_PORT}

# Check database connection
python3 -c "from app.core.config import settings; print(settings.get_database_info())"
```

### If Frontend Can't Connect:
1. Verify backend is running: http://{SERVER_IP}:{BACKEND_PORT}/health
2. Check CORS settings in backend config
3. Verify .env file in frontend has correct API_URL

### Firewall Configuration:
```bash
# Allow HTTP traffic
sudo ufw allow {BACKEND_PORT}
sudo ufw allow {FRONTEND_PORT}
sudo ufw allow 80
sudo ufw allow 22  # SSH
```

## 🚀 Production Deployment (Optional)

For production, consider:
1. Use a reverse proxy (Nginx)
2. Set up SSL certificates
3. Use process managers (PM2, systemd)
4. Set up monitoring and logging

### Nginx Configuration Example:
```nginx
server {{
    listen 80;
    server_name {SERVER_IP};

    # Frontend
    location / {{
        proxy_pass http://127.0.0.1:{FRONTEND_PORT};
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }}

    # Backend API
    location /api/ {{
        proxy_pass http://127.0.0.1:{BACKEND_PORT}/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }}
}}
```

## ✅ Success Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads in browser
- [ ] Can login with test accounts
- [ ] API documentation accessible
- [ ] Database connection working
- [ ] CORS configured correctly

Your Eaglehurst platform should now be running on http://{SERVER_IP}! 🎉
'''
    
    try:
        guide_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/SERVER_DEPLOYMENT_GUIDE.md"
        with open(guide_file, 'w') as f:
            f.write(guide_content)
        
        logger.info("✅ Created server deployment guide")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create server deployment guide: {e}")
        return False

def main():
    """Main configuration function"""
    logger.info(f"🚀 Configuring backend for remote server {SERVER_IP}...")
    
    print("="*60)
    print(f"🔧 CONFIGURING FOR SERVER {SERVER_IP}")
    print("="*60)
    
    success_count = 0
    total_tasks = 5
    
    if update_backend_config():
        success_count += 1
    
    if create_server_env_file():
        success_count += 1
    
    if update_alembic_config():
        success_count += 1
    
    if create_deployment_scripts():
        success_count += 1
    
    if create_server_deployment_guide():
        success_count += 1
    
    print("\n" + "="*60)
    if success_count == total_tasks:
        print("🎉 CONFIGURATION COMPLETE!")
        print("="*60)
        print(f"✅ Backend configured for server {SERVER_IP}")
        print(f"✅ CORS updated to allow {SERVER_IP}")
        print("✅ Database connection configured")
        print("✅ Deployment scripts created")
        print("")
        print("📋 Files created/updated:")
        print("  - .env.server (server environment)")
        print("  - start_backend_server.sh (backend startup)")
        print("  - configure_frontend.sh (frontend config)")
        print("  - SERVER_DEPLOYMENT_GUIDE.md (deployment guide)")
        print("  - alembic.ini (database migrations)")
        print("")
        print("🚀 Next steps:")
        print(f"1. Upload your project to server {SERVER_IP}")
        print("2. Follow SERVER_DEPLOYMENT_GUIDE.md")
        print(f"3. Access your app at http://{SERVER_IP}:{FRONTEND_PORT}")
        print("="*60)
    else:
        print("❌ CONFIGURATION INCOMPLETE!")
        print(f"✅ {success_count}/{total_tasks} tasks completed")
    
    return success_count == total_tasks

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
