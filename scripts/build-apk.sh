#!/usr/bin/env bash
# ==============================================================================
# 📱 VEX Deals - Android APK Build & Sync Automation Script (Local Machine)
#
# This script builds the modern Vite React web application, synchronizes the
# compiled assets into the native Android Capacitor project, and compiles the
# ready-to-install Android APK using Gradle.
#
# Usage:
#   bash ./scripts/build-apk.sh [debug|release]
#   OR
#   npm run apk:build
# ==============================================================================

set -e

# Change directory to project root
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"
BUILD_TYPE="${1:-debug}"

echo ""
echo "=============================================================================="
echo " 📱 VEX DEALS - ANDROID APK BUILD PIPELINE"
echo "=============================================================================="
echo " 🏗️  Target Build Type:  $BUILD_TYPE"
echo " 📂 Project Directory:  $PROJECT_ROOT"
echo " 📅 Timestamp:          $(date)"
echo "=============================================================================="
echo ""

# Step 1: Check Node & Build Environment
echo "🔍 [1/6] Checking local environment & prerequisites..."
if ! command -v node &> /dev/null; then
  echo "❌ Error: Node.js is not installed or not in PATH."
  exit 1
fi
echo "   ✅ Node.js: $(node -v)"
echo "   ✅ NPM:     $(npm -v)"

# Check Java (JDK 17 or 21 recommended for modern Android Gradle)
if command -v java &> /dev/null; then
  JAVA_VER=$(java -version 2>&1 | head -n 1)
  echo "   ✅ Java:    $JAVA_VER"
else
  echo "   ⚠️ Warning: 'java' command not found in PATH. Ensure JDK 17+ or Android Studio is configured."
fi

# Step 2: Build Web Frontend Assets
echo ""
echo "🔨 [2/6] Compiling Vite Frontend Production Bundle..."
npm run build

if [ ! -f "dist/index.html" ]; then
  echo "❌ Error: dist/index.html not found! Web compilation failed."
  exit 1
fi
echo "   ✅ Web assets built successfully in $PROJECT_ROOT/dist"

# Step 3: Check / Initialize Android Capacitor Project
echo ""
echo "🤖 [3/6] Verifying Capacitor Android workspace..."

if [ ! -d "android" ]; then
  echo "   ⚠️ 'android' directory not found. Adding Android platform via Capacitor..."
  npx cap add android || {
    echo "   ❌ Failed to add android platform. Make sure @capacitor/android is installed."
    echo "   Run: npm install @capacitor/core @capacitor/cli @capacitor/android"
    exit 1
  }
fi
echo "   ✅ Android Capacitor workspace verified."

# Step 4: Synchronize Web Assets & Plugins to Android
echo ""
echo "🔄 [4/6] Syncing web assets and plugins to Android (npx cap sync android)..."
npx cap sync android
echo "   ✅ Synchronization completed."

# Step 5: Compile APK using Gradle Wrapper
echo ""
echo "⚡ [5/6] Compiling Android APK with Gradle ($BUILD_TYPE mode)..."

cd "$PROJECT_ROOT/android"

# Make gradlew executable
if [ -f "./gradlew" ]; then
  chmod +x ./gradlew
else
  echo "❌ Error: gradlew wrapper not found in android/ directory."
  echo "   Please open the project in Android Studio once or install Gradle."
  exit 1
fi

if [ "$BUILD_TYPE" == "release" ]; then
  echo "   Compiling Release APK (./gradlew assembleRelease)..."
  ./gradlew assembleRelease
  APK_PATH="app/build/outputs/apk/release/app-release-unsigned.apk"
  if [ -f "app/build/outputs/apk/release/app-release.apk" ]; then
    APK_PATH="app/build/outputs/apk/release/app-release.apk"
  fi
else
  echo "   Compiling Debug APK (./gradlew assembleDebug)..."
  ./gradlew assembleDebug
  APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
fi

cd "$PROJECT_ROOT"

# Step 6: Verify and Report Generated APK
echo ""
echo "=============================================================================="
echo " 🎉 ANDROID APK BUILD FINISHED SUCCESSFULLY!"
echo "=============================================================================="

FULL_APK_PATH="$PROJECT_ROOT/android/$APK_PATH"

if [ -f "$FULL_APK_PATH" ]; then
  APK_SIZE=$(du -h "$FULL_APK_PATH" | cut -f1)
  echo " 📦 Output APK File:    $FULL_APK_PATH"
  echo " ⚖️  File Size:          $APK_SIZE"
  echo " 🏷️  Package ID:         deals.vex.app"
  echo " 📲 Target:              Android 8.0+ (API Level 26+)"
  echo ""
  echo " 🚀 Quick Install to USB-connected Android Device:"
  echo "    adb install -r $FULL_APK_PATH"
  echo ""
  echo " 🛠️ Open Project in Android Studio for Visual Debugging:"
  echo "    npx cap open android"
  echo "=============================================================================="
else
  echo " ℹ️ APK compilation finished. Check android/app/build/outputs/apk/ for generated artifacts."
  echo "=============================================================================="
fi
