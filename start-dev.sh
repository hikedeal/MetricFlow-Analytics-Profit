#!/bin/bash
echo "🚀 Starting Adynic Performance App..."

# Function to kill all child processes on exit
trap 'kill $(jobs -p)' SIGINT

# Start Server
echo "📊 Starting Backend Server..."
cd server && npm run dev &

# Storage PID of server
SERVER_PID=$!

# Wait a bit for server
sleep 5

# Start Client
echo "🎨 Starting Frontend Client..."
cd client && npm run dev &

# Store PID of client
CLIENT_PID=$!

echo "✅ App is running!"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: http://localhost:5001
   - Database Studio: npx prisma studio (in server folder)
"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for both processes
wait $SERVER_PID $CLIENT_PID
