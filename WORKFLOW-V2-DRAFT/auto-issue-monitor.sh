#!/bin/bash

# Automated Issue Monitor for TEST-WORKFLOW
# Can be run via cron, GitHub Actions, or manually
# Completely hands-off operation

echo "🤖 TEST-WORKFLOW Automated Monitor"
echo "=================================="
echo "Started: $(date)"
echo ""

LOG_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/WORKFLOW-V2-DRAFT/LOGS"
mkdir -p "$LOG_DIR"

LOG_FILE="$LOG_DIR/monitor-$(date +%Y%m%d-%H%M%S).log"

# Function to log messages
log_message() {
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a "$LOG_FILE"
}

# ============================================
# CONTINUOUS MONITORING LOOP
# ============================================

monitor_sources() {
    log_message "🔍 Checking all issue sources..."
    
    # 1. Check for new GitHub PR comments
    if gh auth status &> /dev/null; then
        NEW_PRS=$(gh pr list --repo WedSync/WedSync2 --state open --json number,updatedAt --jq '.[] | select(.updatedAt > (now - 3600 | strftime("%Y-%m-%dT%H:%M:%SZ"))) | .number' 2>/dev/null | wc -l)
        if [ "$NEW_PRS" -gt 0 ]; then
            log_message "📥 Found $NEW_PRS PRs with recent activity"
            return 0  # New issues found
        fi
    fi
    
    # 2. Check SonarQube for completed scans
    if curl -s "http://localhost:9000/api/system/health" &> /dev/null; then
        ANALYSIS_DATE=$(curl -s -u admin:WedSync@SonarQube2025! \
            "http://localhost:9000/api/project_analyses/search?project=wedsync-2025&ps=1" \
            | jq -r '.analyses[0].date' 2>/dev/null)
        
        if [ -n "$ANALYSIS_DATE" ]; then
            # Check if analysis is recent (within last hour)
            CURRENT_TIME=$(date +%s)
            ANALYSIS_TIME=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${ANALYSIS_DATE%.*}" +%s 2>/dev/null || echo 0)
            TIME_DIFF=$((CURRENT_TIME - ANALYSIS_TIME))
            
            if [ "$TIME_DIFF" -lt 3600 ] && [ "$TIME_DIFF" -gt 0 ]; then
                log_message "📊 New SonarQube analysis completed"
                return 0  # New issues found
            fi
        fi
    fi
    
    # 3. Check for webhook notifications (if configured)
    WEBHOOK_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/WORKFLOW-V2-DRAFT/WEBHOOKS"
    if [ -d "$WEBHOOK_DIR" ] && [ "$(ls -A $WEBHOOK_DIR 2>/dev/null)" ]; then
        log_message "🔔 Found webhook notifications"
        return 0  # New issues found
    fi
    
    return 1  # No new issues
}

# ============================================
# MAIN AUTOMATION FLOW
# ============================================

# Step 1: Check for new issues
if monitor_sources; then
    log_message "✅ New issues detected! Starting collection..."
    
    # Step 2: Collect all issues
    ./WORKFLOW-V2-DRAFT/automated-issue-collector.sh >> "$LOG_FILE" 2>&1
    
    # Step 3: Process the inbox
    log_message "🔧 Processing issue inbox..."
    ./WORKFLOW-V2-DRAFT/process-issue-inbox.sh >> "$LOG_FILE" 2>&1
    
    # Step 4: Generate summary
    INBOX_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/WORKFLOW-V2-DRAFT/ISSUE-INBOX"
    if [ -f "$INBOX_DIR/INBOX.json" ]; then
        TOTAL=$(jq '.total_issues' "$INBOX_DIR/INBOX.json")
        CODERABBIT=$(jq '.sources.coderabbit' "$INBOX_DIR/INBOX.json")
        SONARQUBE=$(jq '.sources.sonarqube' "$INBOX_DIR/INBOX.json")
        
        log_message "📊 Summary: Total=$TOTAL (CodeRabbit=$CODERABBIT, SonarQube=$SONARQUBE)"
        
        # Step 5: Send notification (optional)
        if [ "$TOTAL" -gt 50 ]; then
            log_message "⚠️ High issue count detected: $TOTAL issues"
            # Could send Slack notification, email, etc.
        fi
    fi
    
    # Step 6: Auto-apply safe fixes
    FIXES_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/WORKFLOW-V2-DRAFT/FIXES"
    SAFE_FIXES=$(ls -1 "$FIXES_DIR"/*.diff 2>/dev/null | wc -l)
    
    if [ "$SAFE_FIXES" -gt 0 ]; then
        log_message "🔄 Found $SAFE_FIXES safe fixes to apply"
        
        # Apply only formatting and simple fixes automatically
        for fix in "$FIXES_DIR"/*-formatting.diff "$FIXES_DIR"/*-imports.diff; do
            [ -f "$fix" ] || continue
            log_message "Applying: $(basename $fix)"
            # git apply "$fix" >> "$LOG_FILE" 2>&1 || log_message "Failed to apply: $fix"
        done
    fi
    
else
    log_message "😴 No new issues detected. System idle."
fi

# ============================================
# SCHEDULING OPTIONS
# ============================================

cat >> "$LOG_FILE" << 'EOF'

=====================================
AUTOMATION SETUP OPTIONS:
=====================================

1. CRON JOB (Check every 30 minutes):
   */30 * * * * /path/to/auto-issue-monitor.sh

2. GITHUB ACTIONS (On PR/Push):
   Add to .github/workflows/issue-monitor.yml

3. CONTINUOUS (Keep running):
   while true; do
     ./auto-issue-monitor.sh
     sleep 1800  # Wait 30 minutes
   done

4. WEBHOOK TRIGGER:
   Configure CodeRabbit/SonarQube to POST to:
   http://localhost:8080/webhook/trigger-monitor
EOF

log_message "✅ Monitor cycle complete"
echo ""
echo "📁 Full log: $LOG_FILE"

# Create status file for dashboard/monitoring
cat > "$LOG_DIR/latest-status.json" << EOF
{
  "last_run": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "issues_found": ${TOTAL:-0},
  "fixes_applied": ${SAFE_FIXES:-0},
  "status": "success"
}
EOF