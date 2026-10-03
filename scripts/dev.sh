#!/usr/bin/env bash
# ==============================================================================
# 🚀 VEX Deals - Development Server Launcher
# ==============================================================================
set -e
cd "$(dirname "$0")/.."
echo "🚀 Starting VEX Deals in Development Mode (Hot Reloading + Live Server)..."
npm run dev
