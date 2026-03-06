#!/bin/bash
# NEXUS OS - API Tunnel Manager
# Run this script to start/restart the API tunnel

API_SERVER="http://172.25.136.193:8080"
LOG_FILE="/tmp/api-tunnel.log"
PID_FILE="/tmp/api-tunnel.pid"

echo "═══════════════════════════════════════════════════════════"
echo "🚀 NEXUS OS - API Tunnel Manager"
echo "═══════════════════════════════════════════════════════════"

# Kill existing tunnel
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    kill $OLD_PID 2>/dev/null
    echo "Stopped existing tunnel (PID: $OLD_PID)"
fi

# Also kill any orphaned cloudflared processes
pkill -f "cloudflared tunnel --url" 2>/dev/null

sleep 2

# Start new tunnel
echo "Starting new tunnel..."
nohup /home/z/my-project/cloudflared tunnel --url $API_SERVER > "$LOG_FILE" 2>&1 &
NEW_PID=$!
echo $NEW_PID > "$PID_FILE"

echo "Tunnel starting (PID: $NEW_PID)"
echo "Waiting for URL..."

# Wait for URL
sleep 6

# Extract URL
TUNNEL_URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOG_FILE" | head -1)

if [ -n "$TUNNEL_URL" ]; then
    echo ""
    echo "✅ Tunnel is running!"
    echo ""
    echo "📡 API URL: $TUNNEL_URL/v1"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "📝 To update NEXUS OS with this URL:"
    echo ""
    echo "1. Go to Render Dashboard → nexus-os → Environment"
    echo "2. Update ZAI_API_URL to: $TUNNEL_URL/v1"
    echo "3. Save changes (Render will auto-redeploy)"
    echo ""
    echo "Or update render.yaml and push to GitHub"
    echo "═══════════════════════════════════════════════════════════"
    
    # Save URL to file for easy access
    echo "$TUNNEL_URL/v1" > /tmp/api-tunnel-url.txt
else
    echo "❌ Failed to get tunnel URL"
    echo "Check log: $LOG_FILE"
fi
