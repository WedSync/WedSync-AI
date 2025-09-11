#!/bin/bash
# Release all locks for this session

SESSION_ID=$(cat session-config.json | grep session_id | cut -d'"' -f4)
BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW"

echo "🔓 Releasing all locks for $SESSION_ID..."
"$BASE_DIR/VERIFICATION-SCRIPTS/file-lock.sh" release-all "$SESSION_ID"
