# Remote Server Deployment Guide
## Server IP: 37.220.31.46

## 🎉 Your Backend is Ready for Remote Deployment!

All localhost references have been fixed and your application is configured to run on your remote server.

## 📋 What Was Fixed/Updated

### ✅ Backend Configuration
- **CORS Origins**: Updated to include `http://37.220.31.46:5173`, `http://37.220.31.46:8000`, `http://37.220.31.46`
- **Database**: Already configured for MariaDB on `37.220.31.46:3306`
- **Host Binding**: Set to `0.0.0.0` (accessible from outside)
- **Alembic**: Updated to use correct database URL

### ✅ Frontend Configuration
- **API Endpoint**: Set to `http://37.220.31.46:8000`
- **Environment**: Configured for production
- **Host Binding**: Set to `0.0.0.0` (accessible from outside)

### ✅ Files Created
- `backend/.env.server` - Server environment configuration
- `backend/start_backend_server.sh` - Backend startup script
- `frontend/.env.server` - Frontend environment configuration
- `frontend/start_frontend_server.sh` - Frontend startup script
- `backend/SERVER_DEPLOYMENT_GUIDE.md` - Detailed deployment guide

## 🚀 Quick Deployment Steps

### 1. Upload to Server
Upload your entire `eaglehurst-project` folder to your server at `37.220.31.46`.

### 2. Start Backend
```bash
# SSH into your server
ssh user@37.220.31.46

# Navigate to backend
cd eaglehurst-project/backend

# Setup and start backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.server .env
./start_backend_server.sh
```

### 3. Start Frontend (in another terminal)
```bash
# SSH into your server (new terminal)
ssh user@37.220.31.46

# Navigate to frontend
cd eaglehurst-project/frontend

# Setup and start frontend
npm install
cp .env.server .env
./start_frontend_server.sh
```

## 🌐 Access Your Application

Once deployed, your application will be available at:

- **🖥️ Frontend**: http://37.220.31.46:5173
- **🔧 Backend API**: http://37.220.31.46:8000
- **📚 API Docs**: http://37.220.31.46:8000/docs
- **❤️ Health Check**: http://37.220.31.46:8000/health

## 🔑 Test Login Accounts

All your migrated user accounts are ready:

### Admin Account
- **Email**: admin@eaglehursttestdev.co.in
- **Role**: Administrator

### Seller Accounts
- **Email**: dr.smith@eaglehursttestdev.co.in (London General Practice)
- **Email**: dr.jones@eaglehursttestdev.co.in (Manchester Dental Excellence)
- **Email**: ishan@fibiso.com (My General practice)

### Buyer Accounts
- **Email**: james.investor@eaglehursttestdev.co.in (James Thompson)
- **Email**: sarah.acquisition@eaglehursttestdev.co.in (Sarah Mitchell)
- **Email**: aditya+100@fibiso.com (Aditya Bajpai)

**All passwords remain the same as before!**

## 🛠️ Configuration Details

### Backend Configuration:
- **Host**: 0.0.0.0 (binds to all network interfaces)
- **Port**: 8000
- **Database**: MariaDB on 37.220.31.46:3306
- **CORS**: Configured for 37.220.31.46
- **Debug**: Set to false for production

### Frontend Configuration:
- **Host**: 0.0.0.0 (accessible from outside)
- **Port**: 5173
- **API Endpoint**: http://37.220.31.46:8000
- **Environment**: Production

### Database:
- **Host**: 37.220.31.46
- **Port**: 3306
- **Database**: eaglehurst_db
- **User**: remoteuser123
- **Data**: All 23 user accounts + business data migrated

## 🔧 Troubleshooting

### If Backend Won't Start:
```bash
# Check if port is in use
sudo netstat -tlnp | grep 8000

# Test database connection
python3 -c "from app.core.config import settings; print(settings.get_database_info())"

# Check logs
tail -f logs/app.log
```

### If Frontend Can't Connect:
1. Verify backend is running: http://37.220.31.46:8000/health
2. Check frontend .env file has correct VITE_API_URL
3. Verify CORS settings in backend

### Firewall Configuration:
```bash
# Allow required ports
sudo ufw allow 8000  # Backend
sudo ufw allow 5173  # Frontend
sudo ufw allow 22    # SSH
sudo ufw enable
```

## 📊 Available Data

Your application has access to all migrated data:
- ✅ **23 user accounts** (1 admin, 10 sellers, 12 buyers)
- ✅ **3 business listings**
- ✅ **11 buyer-seller connections**
- ✅ **10 messages**
- ✅ **22 user subscriptions**
- ✅ **22 payment records**
- ✅ **43 notifications**
- ✅ **197 total records**

## 🎯 Success Checklist

- [ ] Backend starts without errors on port 8000
- [ ] Frontend loads in browser on port 5173
- [ ] Can access API docs at /docs
- [ ] Health check returns OK
- [ ] Can login with test accounts
- [ ] Database connection working
- [ ] CORS configured correctly
- [ ] All user data accessible

## 🚀 Production Optimization (Optional)

For better production setup:

1. **Use Process Manager**:
   ```bash
   # Install PM2
   npm install -g pm2
   
   # Start backend with PM2
   pm2 start "python -m uvicorn app.main:app --host 0.0.0.0 --port 8000" --name eaglehurst-backend
   
   # Start frontend with PM2
   pm2 start "npm run dev -- --host 0.0.0.0 --port 5173" --name eaglehurst-frontend
   ```

2. **Use Nginx Reverse Proxy**:
   ```nginx
   server {
       listen 80;
       server_name 37.220.31.46;

       location / {
           proxy_pass http://127.0.0.1:5173;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }

       location /api/ {
           proxy_pass http://127.0.0.1:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

## 🎉 You're Ready to Deploy!

Your Eaglehurst platform is now fully configured for deployment on your remote server `37.220.31.46`. All localhost references have been removed and replaced with the server IP address.

Simply upload your files to the server and follow the deployment steps above! 🚀
