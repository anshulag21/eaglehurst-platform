#!/bin/bash
# Backend Start Script for Remote Server 37.220.31.46

echo "🚀 Starting Eaglehurst Backend on 37.220.31.46:8000"

# Activate virtual environment
source venv/bin/activate

# Copy server environment file
cp .env.server .env

# Install/update dependencies
pip install -r requirements.txt

# Start the backend server
echo "✅ Starting backend server..."
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

echo "🎉 Backend running at http://37.220.31.46:8000"
echo "📚 API Documentation: http://37.220.31.46:8000/docs"
