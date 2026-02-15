#!/bin/bash
# Frontend Configuration Script for Remote Server 37.220.31.46

echo "🔧 Configuring Frontend for Remote Server 37.220.31.46"

# Update frontend API endpoint
cd ../frontend

# Create or update .env file for frontend
cat > .env << EOF
VITE_API_URL=http://37.220.31.46:8000
VITE_APP_NAME=Eaglehurst Platform
VITE_APP_VERSION=1.0.0
EOF

echo "✅ Frontend configured to use backend at http://37.220.31.46:8000"
echo "🚀 Run 'npm run dev -- --host 0.0.0.0 --port 5173' to start frontend"
