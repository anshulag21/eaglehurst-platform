#!/bin/bash

# Eaglehurst Mobile - Build Status Checker
# Run this script to check the Android build progress

echo "🔍 Checking Eaglehurst Mobile Build Status..."
echo "=============================================="
echo ""

# Check if Gradle daemon is running
GRADLE_RUNNING=$(ps aux | grep -E "gradle.*daemon" | grep -v grep | wc -l)
if [ "$GRADLE_RUNNING" -gt 0 ]; then
    echo "✅ Gradle Daemon: RUNNING"
    cd android && ./gradlew --status 2>/dev/null && cd ..
else
    echo "❌ Gradle Daemon: NOT RUNNING"
fi

echo ""

# Check if Metro bundler is running
METRO_RUNNING=$(ps aux | grep "react-native start" | grep -v grep | wc -l)
if [ "$METRO_RUNNING" -gt 0 ]; then
    echo "✅ Metro Bundler: RUNNING (port 8081)"
else
    echo "❌ Metro Bundler: NOT RUNNING"
fi

echo ""

# Check if emulator is running
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools
EMULATOR_STATUS=$(adb devices | grep "emulator" | grep "device" | wc -l)
if [ "$EMULATOR_STATUS" -gt 0 ]; then
    echo "✅ Android Emulator: CONNECTED"
    adb devices
else
    echo "❌ Android Emulator: NOT CONNECTED"
fi

echo ""

# Check build directory
if [ -d "android/app/build" ]; then
    BUILD_SIZE=$(du -sh android/app/build 2>/dev/null | cut -f1)
    echo "📦 Build Directory Size: $BUILD_SIZE"
    
    # Check for APK
    if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
        APK_SIZE=$(du -h android/app/build/outputs/apk/debug/app-debug.apk | cut -f1)
        echo "✅ APK Built: $APK_SIZE"
    else
        echo "⏳ APK: Building..."
    fi
else
    echo "⏳ Build: In Progress..."
fi

echo ""

# Check if app is installed on emulator
APP_INSTALLED=$(adb shell pm list packages | grep "com.eaglehurst" | wc -l)
if [ "$APP_INSTALLED" -gt 0 ]; then
    echo "✅ App Installed on Emulator"
else
    echo "⏳ App: Not Yet Installed"
fi

echo ""
echo "=============================================="
echo "💡 Tip: Run this script again to check progress"
echo "   ./check_build.sh"

