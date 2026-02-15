#!/usr/bin/env python3
"""
Update .env file to use local MySQL instead of remote MariaDB
"""

from pathlib import Path

def update_backend_env():
    """Update backend .env file for local MySQL"""
    local_env = """# Local Development Environment Configuration
# Backend with LOCAL MySQL Database (FAST!)

# Database - Local MySQL (much faster than remote!)
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
    
    # Backup existing .env
    env_file = backend_dir / ".env"
    if env_file.exists():
        backup_file = backend_dir / ".env.backup"
        with open(env_file, 'r') as f:
            content = f.read()
        with open(backup_file, 'w') as f:
            f.write(content)
        print(f"✅ Backed up existing .env to .env.backup")
    
    # Write new .env
    with open(env_file, "w") as f:
        f.write(local_env)
    
    print("✅ Updated backend/.env for local MySQL")

if __name__ == "__main__":
    print("🔄 Updating .env for local MySQL...")
    update_backend_env()
    print("🎉 Done! Your backend will now use local MySQL for faster development.")
