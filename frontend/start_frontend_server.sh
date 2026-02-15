#!/bin/bash
# Frontend Start Script for Remote Server 37.220.31.46

echo "🚀 Starting Eaglehurst Frontend on 37.220.31.46:5173"

# Copy server environment file
cp .env.server .env

# Install dependencies
npm install

# Start the frontend server
echo "✅ Starting frontend server..."
npm run dev -- --host 0.0.0.0 --port 5173

echo "🎉 Frontend running at http://37.220.31.46:5173"
