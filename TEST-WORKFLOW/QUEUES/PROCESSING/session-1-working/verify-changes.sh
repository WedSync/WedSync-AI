#!/bin/bash
# Verify changes before committing

SESSION_ID=$(cat session-config.json | grep session_id | cut -d'"' -f4)
BASE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW"

echo "🔍 Verifying changes for $SESSION_ID..."
"$BASE_DIR/VERIFICATION-SCRIPTS/verify-fix.sh"
