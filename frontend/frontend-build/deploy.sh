#!/bin/bash
echo "============================================================"
echo "🚀 Eaglehurst Frontend Deployment Script"
echo "============================================================"
echo ""
NGINX_ROOT="/var/www/html"
BACKUP_DIR="/var/www/html_backup_$(date +%Y%m%d_%H%M%S)"
if [ "$EUID" -ne 0 ]; then 
    echo "⚠️  This script requires sudo privileges"
    echo "Please run: sudo ./deploy.sh"
    exit 1
fi
echo "📋 Deployment Configuration:"
echo "   - Nginx root: $NGINX_ROOT"
echo "   - Backup directory: $BACKUP_DIR"
echo ""
if [ -d "$NGINX_ROOT" ]; then
    echo "📦 Creating backup..."
    mkdir -p "$BACKUP_DIR"
    cp -r "$NGINX_ROOT"/* "$BACKUP_DIR/" 2>/dev/null || true
    echo "✅ Backup created at: $BACKUP_DIR"
else
    echo "📁 Creating nginx root directory..."
    mkdir -p "$NGINX_ROOT"
fi
echo ""
echo "📂 Deploying frontend files..."
cp -r ./* "$NGINX_ROOT/"
echo "✅ Files copied to $NGINX_ROOT"
echo ""
echo "🔐 Setting permissions..."
chown -R www-data:www-data "$NGINX_ROOT" 2>/dev/null || chown -R nginx:nginx "$NGINX_ROOT" 2>/dev/null || true
chmod -R 755 "$NGINX_ROOT"
echo "✅ Permissions set"
echo ""
echo "🔄 Starting/Reloading Nginx..."
if systemctl is-active --quiet nginx; then
    echo "   Nginx is running, reloading..."
    systemctl reload nginx
else
    echo "   Nginx is not running, starting..."
    systemctl start nginx
fi
if systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
else
    echo "⚠️  Nginx failed to start, trying alternative method..."
    systemctl restart nginx
fi
echo ""
echo "============================================================"
echo "✅ FRONTEND DEPLOYMENT COMPLETE!"
echo "============================================================"
echo ""
echo "🌐 Your frontend is available at: http://37.220.31.46"
echo "📋 Check version at bottom of login page: v1.0.2"
echo "💾 Backup location: $BACKUP_DIR"
echo ""
echo "📊 Nginx Status:"
systemctl status nginx --no-pager -l | head -3
echo "============================================================"
