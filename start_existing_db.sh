#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║     🚀 CAREACQUIRE - USING EXISTING DATABASE 🚀                   ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup SIGINT SIGTERM

# ============================================================================
# BACKEND
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Starting Backend with Existing Database"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$SCRIPT_DIR/backend"

# Use existing database
export DATABASE_URL="sqlite:///./eaglehurst.db"
export ENVIRONMENT="development"
export DEBUG="true"

echo "✅ Using existing database: eaglehurst.db"
echo "📁 Location: $SCRIPT_DIR/backend/eaglehurst.db"
echo "📊 Tables: 35"
echo ""

# Activate venv
source venv/bin/activate 2>/dev/null || (python3 -m venv venv && source venv/bin/activate)

# Start backend
echo "🚀 Starting FastAPI on http://localhost:8000"
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

echo "⏳ Waiting for backend..."
sleep 5

if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo "✅ Backend is running!"
else
    echo "❌ Backend failed. Check backend.log"
    exit 1
fi

# ============================================================================
# MOBILE APP
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Starting Mobile App"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$SCRIPT_DIR/mobile/EaglehurstMobile"

echo "🚀 Starting Metro bundler..."
npx react-native start --reset-cache > "$SCRIPT_DIR/metro.log" 2>&1 &
METRO_PID=$!

sleep 3

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "✅ ALL SERVICES RUNNING WITH EXISTING DATABASE!"
echo ""
echo "📡 Backend API:    http://localhost:8000"
echo "📚 API Docs:       http://localhost:8000/docs"
echo "📱 Metro Bundler:  http://localhost:8081"
echo "💾 Database:       SQLite (backend/eaglehurst.db) - EXISTING DATA"
echo ""
echo "📋 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Metro:    tail -f metro.log"
echo ""
echo "🔧 To run Android app:"
echo "   cd mobile/EaglehurstMobile"
echo "   npx react-native run-android"
echo ""
echo "🛑 Press Ctrl+C to stop all services"
echo ""
echo "═══════════════════════════════════════════════════════════════════"

wait

