# CareAcquire Frontend - Production Deployment

## 🚀 Quick Deployment

1. Upload this entire folder to your server at `37.220.31.46`
2. SSH into your server: `ssh user@37.220.31.46`
3. Navigate to the uploaded folder: `cd eaglehurst-frontend-build`
4. Run deployment: `./deploy.sh`

## 📋 Available Scripts

- `./deploy.sh` - Initial deployment setup and nginx configuration

## 🌐 Access Points

- **Frontend**: http://37.220.31.46 (port 80)
- **Backend API**: http://37.220.31.46:8000
- **WebSocket**: ws://37.220.31.46:8000/ws

## 📊 Build Information

- **Build Size**: ~1.7MB (469KB gzipped)
- **Environment**: Production
- **API Endpoint**: http://37.220.31.46:8000/api/v1
- **Image URLs**: http://37.220.31.46:8000/uploads/

## 🔧 Configuration

The frontend is configured to connect to:
- Backend API: `http://37.220.31.46:8000/api/v1`
- WebSocket: `ws://37.220.31.46:8000/ws`
- Image Server: `http://37.220.31.46:8000`

## 📂 Contents

- `dist/` - Built React application
- `nginx.conf` - Nginx server configuration
- `deploy.sh` - Deployment script
- `README-deployment.md` - This file

## 🛠️ Manual Deployment Steps

If you prefer manual deployment:

1. Install nginx: `sudo dnf install -y nginx`
2. Copy files: `sudo cp -r dist/* /var/www/eaglehurst-frontend/`
3. Configure nginx: `sudo cp nginx.conf /etc/nginx/conf.d/eaglehurst-frontend.conf`
4. Test config: `sudo nginx -t`
5. Start nginx: `sudo systemctl start nginx`
6. Open firewall: `sudo firewall-cmd --permanent --add-service=http && sudo firewall-cmd --reload`

## 🔍 Troubleshooting

- Check nginx status: `sudo systemctl status nginx`
- View nginx logs: `sudo journalctl -u nginx -f`
- Test configuration: `sudo nginx -t`
- Restart nginx: `sudo systemctl restart nginx`

## 📞 Support

Your frontend is configured to work with your existing backend and database setup. All user data and functionality will be preserved.
