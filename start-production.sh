#!/usr/bin/env bash
# ==============================================================================
# VEX Deals - Unified Production Startup & Deployment Script
# 
# Features:
# 1. Automatic dependency check & installation
# 2. Ensures persistent database storage directory (./data)
# 3. Compiles production frontend (Vite) and bundles backend (esbuild) to dist/
# 4. Validates production artifacts (dist/index.html & dist/server.cjs)
# 5. Boots isolated production server with background worker & admin gateway
# 
# Admin Access: http://localhost:3000/admin (Default PIN: 7788)
# Health Check: http://localhost:3000/api/health
# ==============================================================================

set -e

# Change to the script's directory
cd "$(dirname "$0")"

echo ""
echo "=============================================================================="
echo " 🚀 VEX DEALS - UNIFIED PRODUCTION LAUNCHER"
echo "=============================================================================="
echo " 📅 Date: $(date)"
echo " 🖥️  Node Version: $(node -v 2>/dev/null || echo 'Not detected')"
echo " 📦 NPM Version:  $(npm -v 2>/dev/null || echo 'Not detected')"
echo "=============================================================================="
echo ""

# Step 1: Prepare persistent storage directory
echo "📁 [1/4] Checking persistent storage directory..."
mkdir -p ./data
chmod -R 755 ./data || true
echo "   ✅ Storage directory verified at: $(pwd)/data"

# Step 2: Install dependencies if missing
echo "📦 [2/4] Verifying node_modules..."
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ]; then
  echo "   ⚠️ Dependencies missing. Running npm install..."
  npm install
else
  echo "   ✅ Node modules present."
fi

# Step 3: Run production build (Frontend + Backend bundle)
echo "🔨 [3/4] Building production bundle..."
npm run build

# Verify build outputs
if [ ! -f "dist/server.cjs" ] || [ ! -f "dist/index.html" ]; then
  echo "   ❌ Build failed! Required artifacts (dist/server.cjs or dist/index.html) not found."
  exit 1
fi
echo "   ✅ Build successful: dist/server.cjs and dist/index.html created."

# Step 4: Environment configuration & Launch
echo "🚀 [4/4] Starting VEX Deals Production Server..."
export NODE_ENV=production
export PORT=${PORT:-3000}

echo ""
echo "=============================================================================="
echo " 🎉 VEX DEALS PRODUCTION ENGINE IS NOW RUNNING"
echo "=============================================================================="
echo " 🌐 Web Application:       http://localhost:${PORT}"
echo " 🔐 Standalone Admin Hub:  http://localhost:${PORT}/admin"
echo " 🔑 Default Master PIN:    7788 (Changeable inside Admin Panel)"
echo " 🩺 Health Check Endpoint: http://localhost:${PORT}/api/health"
echo " 🤖 Push Notification:     Active (FCM + Background Docker Worker)"
echo " 💾 Local Data Replica:    $(pwd)/data"
echo "=============================================================================="
echo " Press Ctrl+C to stop the server"
echo ""

# Execute the compiled server bundle
exec node dist/server.cjs

