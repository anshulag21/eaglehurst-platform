#!/usr/bin/env python3
"""
Setup Local Development Environment
Configures both backend and frontend for local development with remote MariaDB
"""

import os
import subprocess
from pathlib import Path

def create_backend_env():
    """Create backend .env file for local development"""
    backend_env = """# Local Development Environment Configuration
# Backend will run on localhost:8000, Frontend on localhost:5173

# Database - Remote MariaDB
DATABASE_URL=mysql+pymysql://remoteuser123:G7v$9kL2pQ!x@37.220.31.46:3306/eaglehurst_db

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
    with open(backend_dir / ".env", "w") as f:
        f.write(backend_env)
    
    print("✅ Created backend/.env for local development")

def create_frontend_env():
    """Create frontend .env file for local development"""
    frontend_env = """# Frontend Local Development Configuration
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_BACKEND_BASE_URL=http://localhost:8000
VITE_WS_BASE_URL=ws://localhost:8000/ws
VITE_FRONTEND_URL=http://localhost:5173

# Environment
NODE_ENV=development
"""
    
    frontend_dir = Path("frontend")
    with open(frontend_dir / ".env", "w") as f:
        f.write(frontend_env)
    
    print("✅ Created frontend/.env for local development")

def create_start_scripts():
    """Create scripts to start backend and frontend"""
    
    # Backend start script
    backend_start = """#!/bin/bash
echo "🚀 Starting Eaglehurst Backend (Local Development)..."

# Change to backend directory
cd "$(dirname "$0")/backend"

# Activate virtual environment or create if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate

# Install dependencies
echo "📦 Installing/updating dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Start the server
echo "🔥 Starting FastAPI server on http://localhost:8000"
echo "📚 API Documentation: http://localhost:8000/docs"
echo "🔍 Health Check: http://localhost:8000/health"
echo ""
echo "Press Ctrl+C to stop the server"

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
"""
    
    with open("start_backend_dev.sh", "w") as f:
        f.write(backend_start)
    
    os.chmod("start_backend_dev.sh", 0o755)
    
    # Frontend start script
    frontend_start = """#!/bin/bash
echo "🚀 Starting Eaglehurst Frontend (Local Development)..."

# Change to frontend directory
cd "$(dirname "$0")/frontend"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install --legacy-peer-deps
fi

# Start the development server
echo "🔥 Starting Vite dev server on http://localhost:5173"
echo "🔗 Backend API: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop the server"

npm run dev
"""
    
    with open("start_frontend_dev.sh", "w") as f:
        f.write(frontend_start)
    
    os.chmod("start_frontend_dev.sh", 0o755)
    
    # Combined start script
    start_both = """#!/bin/bash
echo "🚀 Starting Eaglehurst Full Stack (Local Development)..."

# Function to handle cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend in background
echo "🔧 Starting backend..."
./start_backend_dev.sh &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 5

# Start frontend in background
echo "🎨 Starting frontend..."
./start_frontend_dev.sh &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo "🔧 Backend: http://localhost:8000"
echo "🎨 Frontend: http://localhost:5173"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
"""
    
    with open("start_dev.sh", "w") as f:
        f.write(start_both)
    
    os.chmod("start_dev.sh", 0o755)
    
    print("✅ Created development start scripts:")
    print("   - start_backend_dev.sh (Backend only)")
    print("   - start_frontend_dev.sh (Frontend only)")
    print("   - start_dev.sh (Both servers)")

def main():
    """Main setup function"""
    print("🏗️  Setting up Eaglehurst Local Development Environment...")
    print("=" * 60)
    
    # Create environment files
    create_backend_env()
    create_frontend_env()
    
    # Create start scripts
    create_start_scripts()
    
    print("")
    print("=" * 60)
    print("🎉 LOCAL DEVELOPMENT SETUP COMPLETE!")
    print("=" * 60)
    print("")
    print("📋 What was configured:")
    print("✅ Backend .env - Points to remote MariaDB")
    print("✅ Frontend .env - Points to local backend")
    print("✅ Start scripts created")
    print("")
    print("🚀 To start development:")
    print("1. Start both servers: ./start_dev.sh")
    print("2. Or start individually:")
    print("   - Backend only: ./start_backend_dev.sh")
    print("   - Frontend only: ./start_frontend_dev.sh")
    print("")
    print("🌐 URLs:")
    print("- Frontend: http://localhost:5173")
    print("- Backend API: http://localhost:8000")
    print("- API Docs: http://localhost:8000/docs")
    print("- Database: Remote MariaDB (37.220.31.46)")
    print("")
    print("🔧 Development Features:")
    print("- Hot reload enabled")
    print("- Debug mode on")
    print("- CORS configured for localhost")
    print("- Remote database connection")
    print("=" * 60)

if __name__ == "__main__":
    main()
