# Frontend Deployment Guide

## 🚀 Complete Deployment Process

### **Step 1: Build Fresh Frontend (Local Machine)**

```bash
cd /Users/adityabajpai/Documents/eaglehurst/eaglehurst-project/frontend

# Build production version
npx vite build --mode production

# Package the build
rm -rf frontend-build
mkdir -p frontend-build
cp -r dist/* frontend-build/

# Create deployment archive
tar -czf eaglehurst-frontend-build.tar.gz frontend-build/

# Verify the archive
ls -lh eaglehurst-frontend-build.tar.gz
```

---

### **Step 2: Upload to Server**

```bash
# Upload the build
scp eaglehurst-frontend-build.tar.gz root@37.220.31.46:/root/app/frontend/v1/
```

---

### **Step 3: Deploy on Server**

SSH into the server:
```bash
ssh root@37.220.31.46
```

Then run these commands:

```bash
# Navigate to deployment directory
cd /root/app/frontend/v1

# Extract the new build
tar -xzf eaglehurst-frontend-build.tar.gz

# Stop Nginx
systemctl stop nginx

# Backup current deployment (optional but recommended)
BACKUP_DIR="/var/www/html_backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r /var/www/html/* "$BACKUP_DIR/" 2>/dev/null || true

# Remove old files completely
rm -rf /var/www/html/*

# Copy new files
cp -r /root/app/frontend/v1/frontend-build/* /var/www/html/

# Set correct permissions
chown -R nginx:nginx /var/www/html
chmod -R 755 /var/www/html

# Clear any Nginx cache
rm -rf /var/cache/nginx/* 2>/dev/null || true

# Start Nginx
systemctl start nginx

# Verify Nginx is running
systemctl status nginx

# Test the deployment
curl -I http://localhost/
```

---

### **Step 4: Verify Deployment**

```bash
# Check what's deployed
ls -la /var/www/html/

# Check the JS bundle
ls -lh /var/www/html/assets/index-*.js

# Test external access
curl -I http://37.220.31.46/
```

---

### **Step 5: Test in Browser**

1. **Hard Refresh:** Press `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. **Or Incognito:** Open a new incognito/private window
3. **Verify Version:** Check the bottom of the login page for the version number

---

## 🛑 Quick Commands Reference

### Stop Nginx
```bash
systemctl stop nginx
```

### Start Nginx
```bash
systemctl start nginx
```

### Restart Nginx
```bash
systemctl restart nginx
```

### Reload Nginx (without stopping)
```bash
systemctl reload nginx
```

### Check Nginx Status
```bash
systemctl status nginx
```

### Test Nginx Config
```bash
nginx -t
```

---

## 📋 One-Command Deployment Script

For convenience, here's a single script that does everything:

```bash
#!/bin/bash
# Save this as: /root/app/frontend/v1/quick_deploy.sh

echo "🚀 Starting Frontend Deployment..."

# Stop Nginx
echo "⏸️  Stopping Nginx..."
systemctl stop nginx

# Backup
BACKUP_DIR="/var/www/html_backup_$(date +%Y%m%d_%H%M%S)"
echo "💾 Creating backup at $BACKUP_DIR..."
mkdir -p "$BACKUP_DIR"
cp -r /var/www/html/* "$BACKUP_DIR/" 2>/dev/null || true

# Clean old files
echo "🧹 Removing old files..."
rm -rf /var/www/html/*

# Deploy new files
echo "📦 Deploying new build..."
cp -r /root/app/frontend/v1/frontend-build/* /var/www/html/

# Set permissions
echo "🔐 Setting permissions..."
chown -R nginx:nginx /var/www/html
chmod -R 755 /var/www/html

# Clear cache
echo "🗑️  Clearing cache..."
rm -rf /var/cache/nginx/* 2>/dev/null || true

# Start Nginx
echo "▶️  Starting Nginx..."
systemctl start nginx

# Verify
if systemctl is-active --quiet nginx; then
    echo "✅ Deployment successful!"
    echo "🌐 Site: http://37.220.31.46"
    echo "💾 Backup: $BACKUP_DIR"
else
    echo "❌ Nginx failed to start!"
    systemctl status nginx
    exit 1
fi
```

**Usage:**
```bash
chmod +x /root/app/frontend/v1/quick_deploy.sh
bash /root/app/frontend/v1/quick_deploy.sh
```

---

## ⚠️ Important Notes

### **1. Always Stop Nginx Before Deploying**
- This prevents file locking issues
- Ensures clean deployment

### **2. Check for Conflicting Configs**
Make sure there are NO other config files in:
```bash
ls /etc/nginx/conf.d/
```
If you see any `.conf` files, remove or rename them:
```bash
mv /etc/nginx/conf.d/old-config.conf /etc/nginx/conf.d/old-config.conf.backup
```

### **3. Main Nginx Config Location**
The main config is at: `/etc/nginx/nginx.conf`

Key settings:
- `root /var/www/html;` - Where files are served from
- `try_files $uri $uri/ /index.html;` - For React Router

### **4. Browser Cache**
After deployment, users may need to:
- Hard refresh: `Ctrl+Shift+R` or `Cmd+Shift+R`
- Clear browser cache
- Use incognito mode

### **5. Rollback**
If something goes wrong:
```bash
# Stop Nginx
systemctl stop nginx

# Restore from backup (use the backup directory from deployment)
rm -rf /var/www/html/*
cp -r /var/www/html_backup_YYYYMMDD_HHMMSS/* /var/www/html/

# Start Nginx
systemctl start nginx
```

---

## 🔍 Troubleshooting

### Issue: "Old version still showing"
**Solution:**
1. Check Nginx is serving correct files: `curl -I http://37.220.31.46/`
2. Check for conflicting configs: `ls /etc/nginx/conf.d/`
3. Clear browser cache completely
4. Try different browser or incognito

### Issue: "404 Not Found"
**Solution:**
1. Check files exist: `ls -la /var/www/html/`
2. Check Nginx config: `nginx -t`
3. Check Nginx root directive: `grep "root" /etc/nginx/nginx.conf`

### Issue: "Nginx won't start"
**Solution:**
1. Check config syntax: `nginx -t`
2. Check error logs: `tail -50 /var/log/nginx/error.log`
3. Check if port 80 is in use: `netstat -tulpn | grep :80`

---

## 📝 Deployment Checklist

- [ ] Build fresh frontend locally
- [ ] Create tar.gz archive
- [ ] Upload to server
- [ ] SSH into server
- [ ] Extract build
- [ ] **Stop Nginx**
- [ ] Backup current files (optional)
- [ ] Remove old files
- [ ] Copy new files
- [ ] Set permissions
- [ ] Clear cache
- [ ] **Start Nginx**
- [ ] Verify deployment (curl test)
- [ ] Test in browser (hard refresh)
- [ ] Check version number on login page

---

## 🎯 Quick Reference

| Action | Command |
|--------|---------|
| Stop Nginx | `systemctl stop nginx` |
| Start Nginx | `systemctl start nginx` |
| Restart Nginx | `systemctl restart nginx` |
| Check Status | `systemctl status nginx` |
| Test Config | `nginx -t` |
| View Logs | `tail -f /var/log/nginx/error.log` |
| Check Files | `ls -la /var/www/html/` |
| Test Server | `curl -I http://localhost/` |

---

**Last Updated:** November 9, 2025
**Server IP:** 37.220.31.46
**Deployment Path:** /var/www/html
**Build Source:** /root/app/frontend/v1/frontend-build

