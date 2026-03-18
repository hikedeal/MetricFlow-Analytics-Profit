#!/bin/bash

# Configuration
PROJECT_ROOT="/Users/arnavkumar/Desktop/shopify app"
NGROK_DOMAIN="untanned-tamie-unspasmodically.ngrok-free.dev"

echo "🚀 Starting MetricFlow Local Online Service..."

# Kill any existing processes on these ports to avoid conflicts
kill -9 $(lsof -t -i:5001) 2>/dev/null
kill -9 $(lsof -t -i:3000) 2>/dev/null
pkill ngrok

# 0. Start Database & Redis (Docker)
echo "🐳 Starting Database & Redis..."
docker-compose up -d

cd "$PROJECT_ROOT"

# 1. Start Ngrok in the background
echo "🌐 Starting Ngrok Tunnel..."
./ngrok http --domain=$NGROK_DOMAIN 5001 > ngrok.log 2>&1 &

# 2. Start Backend Server
echo "📊 Starting Backend..."
cd server
npm run dev > ../server.log 2>&1 &

# 3. Start Frontend Client
echo "🎨 Starting Frontend..."
cd ../client
npm run dev > ../client.log 2>&1 &

echo "✅ All services are starting up!"
echo "   - App URL: https://$NGROK_DOMAIN"
echo "   - Local Frontend: http://localhost:3000"
echo "   - Local Backend: http://localhost:5001"
echo ""
echo "This script will stay running to monitor processes. Press Ctrl+C to stop everything."

# Wait for children
wait
