#!/bin/bash

# Configuration
PROJECT_ROOT="/Users/arnavkumar/Desktop/shopify app"
PLIST_PATH="$HOME/Library/LaunchAgents/com.metricflow.startup.plist"
LOG_DIR="$PROJECT_ROOT/logs"

mkdir -p "$LOG_DIR"

echo "⚙️  Setting up automatic startup for MetricFlow..."

# 1. Create the LaunchAgent Plist file
cat > "$PLIST_PATH" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.metricflow.startup</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$PROJECT_ROOT/auto-online.sh</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>$PROJECT_ROOT</string>
    <key>StandardErrorPath</key>
    <string>$LOG_DIR/startup_error.log</string>
    <key>StandardOutPath</key>
    <string>$LOG_DIR/startup_out.log</string>
</dict>
</plist>
EOF

# 2. Set permissions
chmod 644 "$PLIST_PATH"

# 3. Load the LaunchAgent
launchctl unload "$PLIST_PATH" 2>/dev/null
launchctl load "$PLIST_PATH"

echo "✅ Automatic startup configured!"
echo "   - Your app will now start every time you log in."
echo "   - Config saved to: $PLIST_PATH"
echo "   - To check if it's running: launchctl list | grep metricflow"
echo ""
echo "Note: If you ever want to REMOVE this, run: ./setup-auto-start.sh --remove"

if [ "$1" == "--remove" ]; then
    launchctl unload "$PLIST_PATH"
    rm "$PLIST_PATH"
    echo "❌ Automatic startup removed."
fi
