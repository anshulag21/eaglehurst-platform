#!/bin/bash
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
