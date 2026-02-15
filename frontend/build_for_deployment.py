#!/usr/bin/env python3
"""
Frontend Build Script for Production Deployment
Creates a production build of the CareAcquire frontend with proper configuration
"""

import os
import shutil
import subprocess
import logging
from pathlib import Path
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_production_env():
    """Create production environment file"""
    env_content = """# Production Environment Configuration
VITE_API_BASE_URL=http://37.220.31.46:8000/api/v1
VITE_BACKEND_BASE_URL=http://37.220.31.46:8000
VITE_WS_BASE_URL=ws://37.220.31.46:8000/ws

# Frontend URL (will be served on port 80)
VITE_FRONTEND_URL=http://37.220.31.46

# Environment
NODE_ENV=production
"""
    
    with open('.env.production', 'w') as f:
        f.write(env_content)
    
    logger.info("✅ Created .env.production")

def install_dependencies():
    """Install npm dependencies"""
    logger.info("📦 Installing dependencies...")
    try:
        subprocess.run(['npm', 'install'], check=True, capture_output=True)
        logger.info("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to install dependencies: {e}")
        raise

def build_frontend():
    """Build the frontend for production"""
    logger.info("🏗️  Building frontend for production...")
    
    # Set environment variables for build
    env = os.environ.copy()
    env['NODE_ENV'] = 'production'
    env['VITE_API_BASE_URL'] = 'http://37.220.31.46:8000/api/v1'
    env['VITE_BACKEND_BASE_URL'] = 'http://37.220.31.46:8000'
    env['VITE_WS_BASE_URL'] = 'ws://37.220.31.46:8000/ws'
    env['VITE_FRONTEND_URL'] = 'http://37.220.31.46'
    
    try:
        subprocess.run(['npm', 'run', 'build'], check=True, env=env, capture_output=True)
        logger.info("✅ Frontend built successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Failed to build frontend: {e}")
        raise

def create_deployment_scripts():
    """Create deployment scripts"""
    
    # Create nginx configuration
    nginx_config = """server {
    listen 80;
    server_name 37.220.31.46;
    
    root /var/www/eaglehurst-frontend;
    index index.html;
    
    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}"""
    
    with open('nginx.conf', 'w') as f:
        f.write(nginx_config)
    
    # Create deployment script
    deploy_script = """#!/bin/bash
set -e

echo "🚀 Deploying CareAcquire Frontend..."

# Install nginx if not present
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing nginx..."
    sudo dnf install -y nginx
fi

# Create web directory
sudo mkdir -p /var/www/eaglehurst-frontend

# Copy built files
echo "📁 Copying frontend files..."
sudo cp -r dist/* /var/www/eaglehurst-frontend/

# Set permissions
sudo chown -R nginx:nginx /var/www/eaglehurst-frontend
sudo chmod -R 755 /var/www/eaglehurst-frontend

# Copy nginx configuration
echo "⚙️  Configuring nginx..."
sudo cp nginx.conf /etc/nginx/conf.d/eaglehurst-frontend.conf

# Test nginx configuration
sudo nginx -t

# Enable and start nginx
sudo systemctl enable nginx
sudo systemctl restart nginx

# Open firewall for HTTP
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --reload

echo "✅ Frontend deployed successfully!"
echo "🌐 Frontend available at: http://37.220.31.46"
echo "📋 Backend API: http://37.220.31.46:8000"
"""
    
    with open('deploy.sh', 'w') as f:
        f.write(deploy_script)
    
    os.chmod('deploy.sh', 0o755)
    
    # Create start/stop scripts
    start_script = """#!/bin/bash
echo "🚀 Starting nginx..."
sudo systemctl start nginx
sudo systemctl status nginx
echo "✅ Frontend server started"
echo "🌐 Available at: http://37.220.31.46"
"""
    
    with open('start_frontend.sh', 'w') as f:
        f.write(start_script)
    
    os.chmod('start_frontend.sh', 0o755)
    
    stop_script = """#!/bin/bash
echo "🛑 Stopping nginx..."
sudo systemctl stop nginx
echo "✅ Frontend server stopped"
"""
    
    with open('stop_frontend.sh', 'w') as f:
        f.write(stop_script)
    
    os.chmod('stop_frontend.sh', 0o755)
    
    logger.info("✅ Created deployment scripts")

def create_deployment_package():
    """Create deployment package"""
    logger.info("📦 Creating deployment package...")
    
    # Create build directory
    build_dir = Path('frontend-build')
    if build_dir.exists():
        shutil.rmtree(build_dir)
    
    build_dir.mkdir()
    
    # Copy dist folder
    if Path('dist').exists():
        shutil.copytree('dist', build_dir / 'dist')
    
    # Copy deployment files
    files_to_copy = [
        'nginx.conf',
        'deploy.sh',
        'start_frontend.sh',
        'stop_frontend.sh',
        '.env.production'
    ]
    
    for file in files_to_copy:
        if Path(file).exists():
            shutil.copy2(file, build_dir / file)
    
    # Create README
    readme_content = """# CareAcquire Frontend Deployment

## Quick Deployment

1. Upload this folder to your server
2. Run: `./deploy.sh`
3. Access: http://37.220.31.46

## Manual Steps

1. Install nginx: `sudo dnf install -y nginx`
2. Copy files: `sudo cp -r dist/* /var/www/eaglehurst-frontend/`
3. Configure nginx: `sudo cp nginx.conf /etc/nginx/conf.d/eaglehurst-frontend.conf`
4. Start nginx: `sudo systemctl start nginx`

## Management

- Start: `./start_frontend.sh`
- Stop: `./stop_frontend.sh`
- Logs: `sudo journalctl -u nginx -f`

## Configuration

- Frontend: http://37.220.31.46 (port 80)
- Backend API: http://37.220.31.46:8000
- WebSocket: ws://37.220.31.46:8000/ws
"""
    
    with open(build_dir / 'README.md', 'w') as f:
        f.write(readme_content)
    
    # Create tar.gz archive
    archive_name = 'eaglehurst-frontend-build.tar.gz'
    subprocess.run(['tar', '-czf', archive_name, '-C', str(build_dir.parent), build_dir.name], check=True)
    
    logger.info(f"✅ Created deployment package: {archive_name}")
    
    return archive_name

def main():
    """Main build process"""
    try:
        logger.info("🏗️  Building Eaglehurst Frontend for Production Deployment...")
        logger.info("=" * 60)
        
        # Change to frontend directory
        frontend_dir = Path(__file__).parent
        os.chdir(frontend_dir)
        
        # Create production environment
        create_production_env()
        
        # Install dependencies
        install_dependencies()
        
        # Build frontend
        build_frontend()
        
        # Create deployment scripts
        create_deployment_scripts()
        
        # Create deployment package
        archive_name = create_deployment_package()
        
        logger.info("=" * 60)
        logger.info("🎉 BUILD SUCCESSFUL!")
        logger.info("=" * 60)
        logger.info("✅ Frontend build created successfully")
        logger.info(f"📁 Build directory: {frontend_dir}/frontend-build")
        logger.info(f"📦 Deployment archive: {frontend_dir}/{archive_name}")
        logger.info("")
        logger.info("📋 Build includes:")
        logger.info("  - Built React application")
        logger.info("  - Nginx configuration")
        logger.info("  - Deployment scripts")
        logger.info("  - Production environment config")
        logger.info("")
        logger.info("🚀 Deployment steps:")
        logger.info("1. Upload the build archive to your server 37.220.31.46")
        logger.info("2. SSH into server: ssh user@37.220.31.46")
        logger.info("3. Extract: tar -xzf eaglehurst-frontend-build.tar.gz")
        logger.info("4. Deploy: cd frontend-build && ./deploy.sh")
        logger.info("")
        logger.info("🌐 Your frontend will be available at: http://37.220.31.46")
        logger.info("📡 Backend API: http://37.220.31.46:8000")
        logger.info("=" * 60)
        
    except Exception as e:
        logger.error(f"❌ Build failed: {e}")
        raise

if __name__ == "__main__":
    main()
