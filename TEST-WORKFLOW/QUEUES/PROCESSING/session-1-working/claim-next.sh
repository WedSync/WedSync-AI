#!/bin/bash
# Claim next file from queue for this session

SESSION_ID=$(cat session-config.json | grep session_id | cut -d'"' -f4)
PRIORITY=$(cat session-config.json | grep priority | cut -d'"' -f4)
BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW"

echo "🔍 Looking for next $PRIORITY issue..."

# Find next unclaimed file
for FILE in "$BASE_DIR/QUEUES/BY-SEVERITY/$PRIORITY"/*.json; do
    if [ -f "$FILE" ]; then
        FILE_NAME=$(basename "$FILE")
        if "$BASE_DIR/VERIFICATION-SCRIPTS/file-lock.sh" claim "$FILE" "$SESSION_ID"; then
            cp "$FILE" .
            echo "✅ Claimed: $FILE_NAME"
            echo "$(date): Claimed $FILE_NAME" >> "$BASE_DIR/METRICS/$SESSION_ID.log"
            exit 0
        fi
    fi
done

echo "⏸️ No unclaimed $PRIORITY issues available"
