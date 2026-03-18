#!/bin/bash

# Check if .env is configured
if grep -q "your_shopify_api_key_here" server/.env; then
  echo "❌ ERROR: You must configure server/.env first!"
  echo "   1. Open server/.env"
  echo "   2. Paste your SHOPIFY_API_KEY and SHOPIFY_API_SECRET from Shopify Partners"
  echo "   3. Run this script again."
  exit 1
fi

echo "🚀 preparing to launch Adynic Performance on Shopify..."

# Install localtunnel if needed (temporary solution)
# Using npx to run cloudflared is better but localtunnel is easier for quick URL
echo "🌐 Starting Tunnel..."
# We use nohup to keep it running
npx localtunnel --port 5001 --subdomain adynic-test > tunnel.log 2>&1 &
TUNNEL_PID=$!

sleep 5

# Extract URL
TUNNEL_URL=$(grep -o "https://[a-zA-Z0-9-]*.*loca.lt" tunnel.log | head -n 1)

if [ -z "$TUNNEL_URL" ]; then
  echo "⚠️  Could not reserve 'adynic-test'. Trying random domain..."
  pkill -P $TUNNEL_PID
  npx localtunnel --port 5001 > tunnel.log 2>&1 &
  TUNNEL_PID=$!
  sleep 5
  TUNNEL_URL=$(grep -o "https://[a-zA-Z0-9-]*.*loca.lt" tunnel.log | head -n 1)
fi

echo ""
echo "✅ Tunnel Live at: $TUNNEL_URL"
echo ""
echo "⚠️  ACTION REQUIRED: Update Shopify Partners Dashboard"
echo "   1. Go to App Setup"
echo "   2. Set 'App URL' to: $TUNNEL_URL"
echo "   3. Set 'Allowed redirection URL(s)' to:"
echo "      $TUNNEL_URL/api/auth/callback"
echo "      $TUNNEL_URL/api/auth/toplevel"
echo ""

# Update local .env with the new URL
# (This is a simplified replacement for the demo)
# sed -i '' "s|SHOPIFY_APP_URL=.*|SHOPIFY_APP_URL=$TUNNEL_URL|g" server/.env

echo "⏱ Starting App Server & Client..."
./start-dev.sh
