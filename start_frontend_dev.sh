#!/bin/bash
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
