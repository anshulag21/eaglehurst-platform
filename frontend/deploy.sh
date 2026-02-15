#!/bin/bash
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
