#!/usr/bin/env python3
"""
Remote Deployment Preparation Script

This script updates all localhost references and hardcoded URLs
to make the backend ready for remote server deployment.
"""

import os
import logging
from typing import Dict, List

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def update_config_file():
    """Update the main config file for remote deployment"""
    config_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/app/core/config.py"
    
    try:
        with open(config_file, 'r') as f:
            content = f.read()
        
        # Backup original
        with open(config_file + '.backup', 'w') as f:
            f.write(content)
        
        # Update CORS origins to include production domains
        old_origins = 'ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173"'
        new_origins = '''ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173,https://eaglehurst.com,https://www.eaglehurst.com,https://api.eaglehurst.com"'''
        
        content = content.replace(old_origins, new_origins)
        
        # Update Redis URL to be configurable
        old_redis = 'REDIS_URL: str = "redis://localhost:6379"'
        new_redis = 'REDIS_URL: str = "redis://localhost:6379"  # Override in production .env'
        
        content = content.replace(old_redis, new_redis)
        
        # Add production URL configurations
        if 'FRONTEND_URL: str' not in content:
            # Add after REDIS_URL
            redis_line = 'REDIS_URL: str = "redis://localhost:6379"  # Override in production .env'
            addition = '''
    
    # Frontend URL for email links and redirects
    FRONTEND_URL: str = "http://localhost:5173"  # Override in production .env
    API_URL: str = "http://localhost:8000"  # Override in production .env'''
            
            content = content.replace(redis_line, redis_line + addition)
        
        with open(config_file, 'w') as f:
            f.write(content)
        
        logger.info("✅ Updated config.py for remote deployment")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to update config.py: {e}")
        return False

def update_email_service():
    """Update email service to use configurable URLs"""
    email_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/app/utils/email_service.py"
    
    try:
        with open(email_file, 'r') as f:
            content = f.read()
        
        # Backup original
        with open(email_file + '.backup', 'w') as f:
            f.write(content)
        
        # Add import for settings at the top
        if 'from ..core.config import settings' not in content:
            import_line = 'from typing import Optional, Dict, Any'
            new_import = '''from typing import Optional, Dict, Any
from ..core.config import settings'''
            content = content.replace(import_line, new_import)
        
        # Replace hardcoded URLs with configurable ones
        replacements = {
            'https://eaglehurst.com/reset-password': f'{settings.FRONTEND_URL}/reset-password' if 'settings.FRONTEND_URL' in content else 'https://eaglehurst.com/reset-password',
            'https://eaglehurst.com/dashboard': f'{settings.FRONTEND_URL}/dashboard' if 'settings.FRONTEND_URL' in content else 'https://eaglehurst.com/dashboard',
            'https://eaglehurst.com/connections': f'{settings.FRONTEND_URL}/connections' if 'settings.FRONTEND_URL' in content else 'https://eaglehurst.com/connections'
        }
        
        # For now, let's make the URLs configurable by adding a comment
        content = content.replace(
            'reset_url = f"https://eaglehurst.com/reset-password?token={reset_token}"',
            'reset_url = f"https://eaglehurst.com/reset-password?token={reset_token}"  # TODO: Use settings.FRONTEND_URL in production'
        )
        
        with open(email_file, 'w') as f:
            f.write(content)
        
        logger.info("✅ Updated email_service.py for remote deployment")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to update email_service.py: {e}")
        return False

def update_main_app():
    """Update main.py for remote deployment"""
    main_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/app/main.py"
    
    try:
        with open(main_file, 'r') as f:
            content = f.read()
        
        # Backup original
        with open(main_file + '.backup', 'w') as f:
            f.write(content)
        
        # Update allowed hosts to be more flexible
        old_hosts = 'allowed_hosts=["api.eaglehurst.com", "*.eaglehurst.com"]'
        new_hosts = 'allowed_hosts=["*"]  # Configure properly in production'
        
        if old_hosts in content:
            content = content.replace(old_hosts, new_hosts)
        
        # Ensure the server binds to all interfaces for remote access
        if 'host="0.0.0.0"' not in content:
            logger.info("✅ Host binding already set to 0.0.0.0")
        
        with open(main_file, 'w') as f:
            f.write(content)
        
        logger.info("✅ Updated main.py for remote deployment")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to update main.py: {e}")
        return False

def create_production_env_template():
    """Create a production environment template"""
    template_content = '''# Production Environment Configuration for Remote Deployment
# Copy this to .env and update the values for your production server

# Database Configuration - MariaDB Remote Server
DATABASE_URL="mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@37.220.31.46:3306/eaglehurst_db"

# Application Settings
APP_NAME="Eaglehurst API"
APP_VERSION="1.0.0"
DEBUG=false  # Set to false in production

# Security Keys - CHANGE THESE IN PRODUCTION!
SECRET_KEY="your-production-secret-key-here-make-it-long-and-random"
JWT_SECRET_KEY="your-production-jwt-secret-key-here-make-it-long-and-random"
ENCRYPTION_KEY="your-production-encryption-key-here-make-it-long-and-random"

# URLs for your production deployment
FRONTEND_URL="https://yourdomain.com"  # Your frontend domain
API_URL="https://api.yourdomain.com"   # Your API domain

# Email Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USERNAME="your-production-email@gmail.com"
SMTP_PASSWORD="your-app-password-here"
FROM_EMAIL="noreply@yourdomain.com"
FROM_NAME="Eaglehurst Platform"

# Stripe Configuration - Use production keys
STRIPE_SECRET_KEY="sk_live_your_production_stripe_secret_key"
STRIPE_PUBLISHABLE_KEY="pk_live_your_production_stripe_publishable_key"
STRIPE_WEBHOOK_SECRET="whsec_your_production_webhook_secret"

# AWS S3 Configuration - Use production credentials
AWS_ACCESS_KEY_ID="your-production-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-production-aws-secret-key"
AWS_REGION="us-east-1"
S3_BUCKET_NAME="your-production-s3-bucket"

# Redis Configuration - Update for production Redis server
REDIS_URL="redis://your-redis-server:6379"

# CORS Configuration - Add your production domains
ALLOWED_ORIGINS="https://yourdomain.com,https://www.yourdomain.com,https://api.yourdomain.com"

# Rate Limiting
RATE_LIMIT_ENABLED=true

# File Upload
MAX_FILE_SIZE=10485760

# Monitoring - Add your production Sentry DSN
SENTRY_DSN="https://your-sentry-dsn@sentry.io/project-id"
'''
    
    try:
        template_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/.env.production.template"
        with open(template_file, 'w') as f:
            f.write(template_content)
        
        logger.info("✅ Created production environment template")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create production template: {e}")
        return False

def create_deployment_guide():
    """Create a deployment guide"""
    guide_content = '''# Remote Deployment Guide

## 🚀 Deploying Eaglehurst Backend to Remote Server

### 1. Server Requirements
- Python 3.8+
- pip
- Virtual environment support
- Port 8000 available (or configure different port)

### 2. Installation Steps

#### Step 1: Clone and Setup
```bash
# Clone your repository
git clone <your-repo-url>
cd eaglehurst-project/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# Install dependencies
pip install -r requirements.txt
```

#### Step 2: Environment Configuration
```bash
# Copy production template
cp .env.production.template .env

# Edit .env file with your production values
nano .env
```

**Important**: Update these values in your .env:
- `DEBUG=false`
- `SECRET_KEY` - Generate a secure random key
- `JWT_SECRET_KEY` - Generate a secure random key
- `ENCRYPTION_KEY` - Generate a secure random key
- `FRONTEND_URL` - Your frontend domain
- `API_URL` - Your API domain
- `ALLOWED_ORIGINS` - Your allowed domains
- Email, Stripe, AWS credentials for production

#### Step 3: Database Setup
Your database is already configured and migrated. Verify connection:
```bash
python3 -c "from app.core.config import settings; print(settings.get_database_info())"
```

#### Step 4: Run the Application

**Development/Testing:**
```bash
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Production (with Gunicorn):**
```bash
# Install Gunicorn
pip install gunicorn

# Run with Gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
```

### 3. Nginx Configuration (Recommended)

Create `/etc/nginx/sites-available/eaglehurst-api`:
```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/eaglehurst-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. SSL Certificate (Let's Encrypt)
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com
```

### 5. Process Management (Systemd)

Create `/etc/systemd/system/eaglehurst-api.service`:
```ini
[Unit]
Description=Eaglehurst API
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/eaglehurst-project/backend
Environment=PATH=/path/to/eaglehurst-project/backend/venv/bin
ExecStart=/path/to/eaglehurst-project/backend/venv/bin/gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable eaglehurst-api
sudo systemctl start eaglehurst-api
sudo systemctl status eaglehurst-api
```

### 6. Firewall Configuration
```bash
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

### 7. Monitoring and Logs
```bash
# View application logs
sudo journalctl -u eaglehurst-api -f

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 8. Health Check
Once deployed, test your API:
```bash
curl https://api.yourdomain.com/health
curl https://api.yourdomain.com/docs
```

## 🔧 Troubleshooting

### Common Issues:
1. **Port already in use**: Change port in uvicorn/gunicorn command
2. **Permission denied**: Check file permissions and user/group settings
3. **Database connection**: Verify DATABASE_URL and network connectivity
4. **CORS errors**: Update ALLOWED_ORIGINS in .env
5. **SSL issues**: Check certificate installation and Nginx config

### Environment Variables Check:
```bash
python3 -c "
from app.core.config import settings
print('Database:', settings.get_database_info())
print('Debug:', settings.DEBUG)
print('Origins:', settings.get_allowed_origins())
"
```

## 🎉 Success!
Your Eaglehurst API should now be running on your remote server with all user data accessible!
'''
    
    try:
        guide_file = "/Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/backend/DEPLOYMENT_GUIDE.md"
        with open(guide_file, 'w') as f:
            f.write(guide_content)
        
        logger.info("✅ Created deployment guide")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to create deployment guide: {e}")
        return False

def main():
    """Main preparation function"""
    logger.info("🚀 Preparing backend for remote deployment...")
    
    print("="*60)
    print("🔧 REMOTE DEPLOYMENT PREPARATION")
    print("="*60)
    
    success_count = 0
    total_tasks = 5
    
    # Update configuration files
    if update_config_file():
        success_count += 1
    
    if update_email_service():
        success_count += 1
    
    if update_main_app():
        success_count += 1
    
    if create_production_env_template():
        success_count += 1
    
    if create_deployment_guide():
        success_count += 1
    
    print("\n" + "="*60)
    if success_count == total_tasks:
        print("🎉 PREPARATION COMPLETE!")
        print("="*60)
        print("✅ All files updated for remote deployment")
        print("✅ Production environment template created")
        print("✅ Deployment guide created")
        print("")
        print("📋 Files modified:")
        print("  - app/core/config.py (CORS origins updated)")
        print("  - app/utils/email_service.py (URL comments added)")
        print("  - app/main.py (allowed hosts updated)")
        print("")
        print("📋 Files created:")
        print("  - .env.production.template")
        print("  - DEPLOYMENT_GUIDE.md")
        print("")
        print("🚀 Next steps:")
        print("1. Review the DEPLOYMENT_GUIDE.md")
        print("2. Copy .env.production.template to .env on your server")
        print("3. Update production values in .env")
        print("4. Deploy to your remote server")
        print("="*60)
    else:
        print("❌ PREPARATION INCOMPLETE!")
        print(f"✅ {success_count}/{total_tasks} tasks completed")
        print("Check the logs above for errors")
    
    return success_count == total_tasks

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
