#!/bin/bash
# Automated Feature Scanner for WedSync Testing Agent
# Systematically scans all 383 features to find what's ready for testing

SCRIPT_DIR="/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/08-AUTOMATED-TESTING-AGENT"
WORKFLOW_DIR="/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT"
MASTER_TRACKER="$SCRIPT_DIR/master-feature-tracker.json"
SCAN_LOG="$SCRIPT_DIR/daily-reports/feature-scan-$(date +%Y-%m-%d).log"

echo "=== AUTOMATED FEATURE SCANNER - $(date) ===" | tee -a "$SCAN_LOG"
echo "Scanning for completed features ready for testing..." | tee -a "$SCAN_LOG"
echo "" | tee -a "$SCAN_LOG"

# Counter for tracking
FEATURES_FOUND=0
NEW_FEATURES=0
READY_FOR_TESTING=0

# Function to check if feature is complete based on evidence patterns
check_feature_completion() {
    local ws_id=$1
    local completion_found=false
    
    # Check for evidence packages
    if ls EVIDENCE-PACKAGE-${ws_id}-*.md 2>/dev/null | head -1; then
        echo "✅ Evidence package found for $ws_id" | tee -a "$SCAN_LOG"
        completion_found=true
    fi
    
    # Check for team completion files
    if find "$WORKFLOW_DIR" -name "*${ws_id}*complete*.md" 2>/dev/null | head -1; then
        echo "✅ Team completion files found for $ws_id" | tee -a "$SCAN_LOG"
        completion_found=true
    fi
    
    # Check senior dev approved features
    if find "$WORKFLOW_DIR/OUTBOX/senior-dev" -name "*${ws_id}*" 2>/dev/null | head -1; then
        echo "✅ Senior dev approval found for $ws_id" | tee -a "$SCAN_LOG"
        completion_found=true
    fi
    
    # Check git operations ready for testing
    if find "$WORKFLOW_DIR/OUTBOX/git-operations" -name "*${ws_id}*" 2>/dev/null | head -1; then
        echo "✅ Git operations ready marker found for $ws_id" | tee -a "$SCAN_LOG"
        completion_found=true
    fi
    
    if [ "$completion_found" = true ]; then
        return 0  # Feature is complete
    else
        return 1  # Feature not complete
    fi
}

# Function to check if feature has already been tested
check_already_tested() {
    local ws_id=$1
    
    # Check if test report exists
    if ls "$SCRIPT_DIR/test-reports/${ws_id}-"*.md 2>/dev/null | head -1; then
        return 0  # Already tested
    fi
    
    # Check if in approved for human QA
    if ls "$SCRIPT_DIR/approved-for-human-qa/${ws_id}-"*.md 2>/dev/null | head -1; then
        return 0  # Already approved
    fi
    
    return 1  # Not tested yet
}

# Function to determine feature priority
get_feature_priority() {
    local ws_id=$1
    
    # High priority features (critical business functions)
    case $ws_id in
        WS-001|WS-002|WS-003) echo "critical" ;;  # Authentication
        WS-04*|WS-05*) echo "high" ;;             # Payment systems
        WS-16*|WS-17*) echo "high" ;;             # Mobile features
        WS-19*|WS-20*) echo "high" ;;             # Wedding day critical
        *) echo "medium" ;;
    esac
}

# Main scanning loop for all 383 features
echo "Scanning WS-001 through WS-383..." | tee -a "$SCAN_LOG"
echo "" | tee -a "$SCAN_LOG"

for i in $(seq -w 1 383); do
    WS_ID="WS-$(printf "%03d" $i)"
    
    # Check if feature is complete
    if check_feature_completion "$WS_ID"; then
        FEATURES_FOUND=$((FEATURES_FOUND + 1))
        
        # Check if already tested
        if check_already_tested "$WS_ID"; then
            echo "ℹ️  $WS_ID already tested - skipping" | tee -a "$SCAN_LOG"
        else
            # New feature ready for testing!
            NEW_FEATURES=$((NEW_FEATURES + 1))
            PRIORITY=$(get_feature_priority "$WS_ID")
            
            echo "🔥 NEW: $WS_ID ready for testing (Priority: $PRIORITY)" | tee -a "$SCAN_LOG"
            
            # Add to testing queue
            echo "$WS_ID" >> "$SCRIPT_DIR/testing-queue-$(date +%Y-%m-%d).txt"
            
            # Create testing assignment file
            cat > "$SCRIPT_DIR/in-progress/queue-${WS_ID}.md" << EOF
# Testing Assignment: $WS_ID

**Status:** Queued for Testing
**Priority:** $PRIORITY
**Discovered:** $(date)
**Evidence Found:** Yes
**Dependencies:** To be analyzed

## Next Steps:
1. Analyze feature dependencies
2. Run 4-step testing protocol
3. Generate comprehensive test report
4. Route results to appropriate teams

## Evidence Files Found:
$(find . -name "*${WS_ID}*" -type f | head -5)
EOF
            
            READY_FOR_TESTING=$((READY_FOR_TESTING + 1))
        fi
    fi
done

# Generate summary report
echo "" | tee -a "$SCAN_LOG"
echo "=== SCAN SUMMARY ===" | tee -a "$SCAN_LOG"
echo "Completed Features Found: $FEATURES_FOUND" | tee -a "$SCAN_LOG"
echo "New Features Ready for Testing: $NEW_FEATURES" | tee -a "$SCAN_LOG"
echo "Total Features Queued: $READY_FOR_TESTING" | tee -a "$SCAN_LOG"
echo "" | tee -a "$SCAN_LOG"

# Update master tracker with scan results
TIMESTAMP=$(date -Iseconds)
cat > "$SCRIPT_DIR/scan-results-$(date +%Y-%m-%d).json" << EOF
{
  "scan_timestamp": "$TIMESTAMP",
  "features_scanned": 383,
  "completed_features_found": $FEATURES_FOUND,
  "new_features_ready": $NEW_FEATURES,
  "total_queued_for_testing": $READY_FOR_TESTING,
  "next_scan_due": "$(date -d '+30 minutes' -Iseconds)",
  "priority_features": $(ls "$SCRIPT_DIR/in-progress/queue-WS-"*.md 2>/dev/null | wc -l),
  "scan_log": "$SCAN_LOG"
}
EOF

# Create testing priority list
echo "=== TESTING PRIORITY QUEUE ===" | tee "$SCRIPT_DIR/current-testing-queue.txt"
echo "Generated: $(date)" | tee -a "$SCRIPT_DIR/current-testing-queue.txt"
echo "" | tee -a "$SCRIPT_DIR/current-testing-queue.txt"

# Sort queued features by priority
if [ -f "$SCRIPT_DIR/testing-queue-$(date +%Y-%m-%d).txt" ]; then
    echo "High Priority Features:" | tee -a "$SCRIPT_DIR/current-testing-queue.txt"
    while read -r ws_id; do
        priority=$(get_feature_priority "$ws_id")
        if [ "$priority" = "high" ] || [ "$priority" = "critical" ]; then
            echo "- $ws_id ($priority)" | tee -a "$SCRIPT_DIR/current-testing-queue.txt"
        fi
    done < "$SCRIPT_DIR/testing-queue-$(date +%Y-%m-%d).txt"
    
    echo "" | tee -a "$SCRIPT_DIR/current-testing-queue.txt"
    echo "Medium Priority Features:" | tee -a "$SCRIPT_DIR/current-testing-queue.txt"
    while read -r ws_id; do
        priority=$(get_feature_priority "$ws_id")
        if [ "$priority" = "medium" ]; then
            echo "- $ws_id ($priority)" | tee -a "$SCRIPT_DIR/current-testing-queue.txt"
        fi
    done < "$SCRIPT_DIR/testing-queue-$(date +%Y-%m-%d).txt"
fi

echo "" | tee -a "$SCAN_LOG"
echo "🚀 Automated feature scanning complete!" | tee -a "$SCAN_LOG"
echo "Next recommended action: Start testing highest priority features" | tee -a "$SCAN_LOG"
echo "Testing queue: $SCRIPT_DIR/current-testing-queue.txt" | tee -a "$SCAN_LOG"
echo "" | tee -a "$SCAN_LOG"

# If new features found, alert workflow manager
if [ $NEW_FEATURES -gt 0 ]; then
    echo "🔔 ALERT: $NEW_FEATURES new features detected and queued for testing" > "$WORKFLOW_DIR/OUTBOX/automated-testing-agent/workflow-status/new-features-alert-$(date +%Y-%m-%d).md"
    echo "Check testing queue for priority assignments." >> "$WORKFLOW_DIR/OUTBOX/automated-testing-agent/workflow-status/new-features-alert-$(date +%Y-%m-%d).md"
fi

echo "Scan complete. Results saved to: $SCAN_LOG"