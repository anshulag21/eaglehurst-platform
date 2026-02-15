#!/bin/bash

echo "╔═══════════════════════════════════════════════════════════════════╗"
echo "║                                                                   ║"
echo "║          🚀 CAREACQUIRE LOCAL DEVELOPMENT 🚀                      ║"
echo "║          Backend: SQLite | Frontend: React Native                ║"
echo "║                                                                   ║"
echo "╚═══════════════════════════════════════════════════════════════════╝"
echo ""

# Get script directory
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
# BACKEND SETUP
# ============================================================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Setting up Backend (FastAPI + SQLite)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$SCRIPT_DIR/backend"

# Set SQLite environment variable
export DATABASE_URL="sqlite:///./data/careacquire_local.db"
export ENVIRONMENT="development"
export DEBUG="true"

echo "✅ Database: SQLite"
echo "📁 Location: $SCRIPT_DIR/backend/data/careacquire_local.db"
echo ""

# Check/create virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔌 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
if [ ! -f "venv/bin/uvicorn" ]; then
    echo "📦 Installing Python dependencies..."
    pip install -q -r requirements.txt
fi

# Initialize database
echo "🔄 Initializing SQLite database..."
python init_sqlite.py

echo ""
echo "✅ Backend ready!"
echo "🚀 Starting FastAPI on http://localhost:8000"
echo "📚 API Docs: http://localhost:8000/docs"
echo ""

# Start backend in background
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > "$SCRIPT_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 5

# Check if backend is running
if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo "✅ Backend is running!"
else
    echo "❌ Backend failed to start. Check backend.log"
    cat "$SCRIPT_DIR/backend.log"
    exit 1
fi

# ============================================================================
# MOBILE APP SETUP
# ============================================================================

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Setting up Mobile App (React Native)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cd "$SCRIPT_DIR/mobile/EaglehurstMobile"

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node dependencies..."
    npm install --legacy-peer-deps
fi

echo "🚀 Starting Metro bundler..."
echo "📱 Metro: http://localhost:8081"
echo ""

# Start Metro in background
npx react-native start --reset-cache > "$SCRIPT_DIR/metro.log" 2>&1 &
METRO_PID=$!

sleep 3

# ============================================================================
# SUMMARY
# ============================================================================

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "✅ ALL SERVICES RUNNING!"
echo ""
echo "📡 Backend API:    http://localhost:8000"
echo "📚 API Docs:       http://localhost:8000/docs"
echo "📱 Metro Bundler:  http://localhost:8081"
echo "💾 Database:       SQLite (backend/data/careacquire_local.db)"
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

# Keep script running
wait

