# Remote Server Deployment Guide
## Server IP: 37.220.31.46

## 🚀 Quick Deployment Steps

### 1. Upload Files to Server
Upload your entire `eaglehurst-project` folder to your server at `37.220.31.46`.

### 2. Backend Setup
```bash
# SSH into your server
ssh user@37.220.31.46

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
ssh user@37.220.31.46

# Navigate to frontend directory
cd eaglehurst-project/frontend

# Install dependencies
npm install

# Configure frontend for server
../backend/configure_frontend.sh

# Start frontend
npm run dev -- --host 0.0.0.0 --port 5173
```

## 🌐 Access Your Application

- **Frontend**: http://37.220.31.46:5173
- **Backend API**: http://37.220.31.46:8000
- **API Documentation**: http://37.220.31.46:8000/docs

## 🔑 Test Login Accounts

All your migrated accounts are available:
- **Admin**: admin@eaglehursttestdev.co.in
- **Seller**: dr.smith@eaglehursttestdev.co.in
- **Buyer**: james.investor@eaglehursttestdev.co.in

## 🔧 Configuration Details

### Backend Configuration:
- **Host**: 0.0.0.0 (binds to all interfaces)
- **Port**: 8000
- **Database**: MariaDB on 37.220.31.46:3306
- **CORS**: Configured for 37.220.31.46

### Frontend Configuration:
- **Host**: 0.0.0.0 (accessible from outside)
- **Port**: 5173
- **API Endpoint**: http://37.220.31.46:8000

## 🛠️ Troubleshooting

### If Backend Won't Start:
```bash
# Check if port is in use
sudo netstat -tlnp | grep 8000

# Check database connection
python3 -c "from app.core.config import settings; print(settings.get_database_info())"
```

### If Frontend Can't Connect:
1. Verify backend is running: http://37.220.31.46:8000/health
2. Check CORS settings in backend config
3. Verify .env file in frontend has correct API_URL

### Firewall Configuration:
```bash
# Allow HTTP traffic
sudo ufw allow 8000
sudo ufw allow 5173
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
server {
    listen 80;
    server_name 37.220.31.46;

    # Frontend
    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## ✅ Success Checklist

- [ ] Backend starts without errors
- [ ] Frontend loads in browser
- [ ] Can login with test accounts
- [ ] API documentation accessible
- [ ] Database connection working
- [ ] CORS configured correctly

Your Eaglehurst platform should now be running on http://37.220.31.46! 🎉
