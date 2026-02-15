# Remote Deployment Guide

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
source venv/bin/activate  # On Windows: venv\Scripts\activate

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
