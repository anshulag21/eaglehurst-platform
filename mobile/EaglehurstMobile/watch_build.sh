#!/bin/bash

# Eaglehurst Mobile - Live Build Log Viewer
# Watch the build progress in real-time

echo "📺 Watching Eaglehurst Mobile Build Logs..."
echo "Press Ctrl+C to stop watching"
echo "=============================================="
echo ""

# Find the Gradle log file
LOG_FILE=$(find ~/.gradle/daemon -name "*.log" -type f -mmin -10 | head -1)

if [ -n "$LOG_FILE" ]; then
    echo "📄 Tailing Gradle log: $LOG_FILE"
    echo ""
    tail -f "$LOG_FILE" 2>/dev/null | grep --line-buffered -E "(BUILD|Task|:app:|FAILED|SUCCESS|UP-TO-DATE|> Task)"
else
    echo "⚠️  No recent Gradle log found."
    echo "The build might have completed or not started yet."
    echo ""
    echo "Run ./check_build.sh to check status"
fi

