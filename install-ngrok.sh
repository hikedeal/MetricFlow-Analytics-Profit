#!/bin/bash

# Quick Ngrok Installation Script for macOS

echo "🚀 Installing ngrok..."

# Download ngrok for macOS
echo "📥 Downloading ngrok..."
curl -L -o ngrok.zip https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-darwin-amd64.zip

# Unzip
echo "📦 Extracting..."
unzip -o ngrok.zip

# Move to /usr/local/bin
echo "📁 Installing to /usr/local/bin..."
sudo mv ngrok /usr/local/bin/

# Clean up
rm ngrok.zip

# Verify installation
if command -v ngrok &> /dev/null; then
    echo "✅ Ngrok installed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Sign up at https://dashboard.ngrok.com/signup"
    echo "2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "3. Run: ngrok config add-authtoken YOUR_TOKEN"
    echo "4. Run: ngrok http 5001"
else
    echo "❌ Installation failed. Please install manually from https://ngrok.com/download"
fi
