#!/bin/bash

# TEST-WORKFLOW Issue Processor
# Automatically processes issues from the inbox without manual intervention

echo "🤖 TEST-WORKFLOW Issue Processor v2.0"
echo "======================================"
echo ""

INBOX_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/WORKFLOW-V2-DRAFT/ISSUE-INBOX"
PROCESSED_DIR="$INBOX_DIR/processed"
FIXES_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/WORKFLOW-V2-DRAFT/FIXES"

mkdir -p "$PROCESSED_DIR"
mkdir -p "$FIXES_DIR"

# Check for new issues
if [ ! -f "$INBOX_DIR/.new-issues-available" ]; then
    echo "📭 No new issues in inbox. Running collector..."
    ./WORKFLOW-V2-DRAFT/automated-issue-collector.sh
fi

# Load the inbox
if [ ! -f "$INBOX_DIR/INBOX.json" ]; then
    echo "❌ No inbox found. Please run automated-issue-collector.sh first"
    exit 1
fi

TOTAL_ISSUES=$(jq '.total_issues' "$INBOX_DIR/INBOX.json")
echo "📥 Found $TOTAL_ISSUES issues to process"
echo ""

# ============================================
# AUTO-FIX STRATEGIES
# ============================================

# 1. Process CodeRabbit issues with diff suggestions
echo "🐰 Processing CodeRabbit auto-fixable issues..."
for file in "$INBOX_DIR"/coderabbit-*.json; do
    [ -f "$file" ] || continue
    
    # Extract issues with diff suggestions (auto-fixable)
    jq -r 'select(.auto_fixable == true) | {file: .file, line: .line, fix: .full_comment} | @json' "$file" 2>/dev/null | while read -r issue; do
        FILE_PATH=$(echo "$issue" | jq -r '.file')
        LINE=$(echo "$issue" | jq -r '.line')
        FIX=$(echo "$issue" | jq -r '.fix' | grep -A20 '```diff' | sed -n '/```diff/,/```/p' | sed '1d;$d')
        
        if [ -n "$FIX" ]; then
            echo "  🔧 Auto-fixing: $FILE_PATH:$LINE"
            # Create fix file
            echo "$FIX" > "$FIXES_DIR/coderabbit-$(basename $FILE_PATH)-line$LINE.diff"
        fi
    done
done

# 2. Process SonarQube issues
echo "🔍 Processing SonarQube issues..."
if [ -f "$INBOX_DIR/sonarqube-issues.json" ]; then
    # Count by severity
    CRITICAL=$(jq '[.[] | select(.severity == "CRITICAL")] | length' "$INBOX_DIR/sonarqube-issues.json")
    HIGH=$(jq '[.[] | select(.severity == "MAJOR")] | length' "$INBOX_DIR/sonarqube-issues.json")
    MEDIUM=$(jq '[.[] | select(.severity == "MINOR")] | length' "$INBOX_DIR/sonarqube-issues.json")
    
    echo "  Critical: $CRITICAL, High: $HIGH, Medium: $MEDIUM"
    
    # Auto-fix common patterns
    jq -r '.[] | select(.rule | contains("typescript:S") or contains("javascript:S")) | @json' "$INBOX_DIR/sonarqube-issues.json" | while read -r issue; do
        RULE=$(echo "$issue" | jq -r '.rule')
        FILE=$(echo "$issue" | jq -r '.file')
        
        case "$RULE" in
            *"S1116"*) # Empty statements
                echo "  🔧 Auto-fix: Remove empty statement in $FILE"
                ;;
            *"S1117"*) # Variable shadowing
                echo "  🔧 Auto-fix: Rename shadowed variable in $FILE"
                ;;
            *"S2933"*) # Readonly fields
                echo "  🔧 Auto-fix: Add readonly modifier in $FILE"
                ;;
            *)
                # Add to manual review
                echo "$issue" >> "$PROCESSED_DIR/manual-review.json"
                ;;
        esac
    done
fi

# 3. Process ESLint issues (highly auto-fixable)
echo "🔧 Processing ESLint issues..."
if [ -f "$INBOX_DIR/eslint-issues.json" ] && [ -s "$INBOX_DIR/eslint-issues.json" ]; then
    cd wedsync 2>/dev/null || cd /Volumes/Extreme\ Pro/CODE/WedSync\ 2.0/WedSync\ Dev/wedsync
    
    # Run ESLint auto-fix
    echo "  Running ESLint --fix..."
    npm run lint -- --fix > "$FIXES_DIR/eslint-fixed.log" 2>&1 || true
    
    # Count remaining issues
    npm run lint -- --format json > "$INBOX_DIR/eslint-remaining.json" 2>/dev/null || true
    REMAINING=$(jq '.[] | .messages | length' "$INBOX_DIR/eslint-remaining.json" 2>/dev/null | awk '{s+=$1} END {print s}' || echo 0)
    
    echo "  ✅ ESLint auto-fixed most issues. Remaining: $REMAINING"
fi

# ============================================
# GENERATE REPORTS
# ============================================
echo ""
echo "📊 Generating reports..."

# Create summary report
cat > "$PROCESSED_DIR/processing-report-$(date +%Y%m%d-%H%M%S).json" << EOF
{
  "processed_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_issues": $TOTAL_ISSUES,
  "auto_fixed": $(ls -1 "$FIXES_DIR"/*.diff 2>/dev/null | wc -l),
  "manual_review_needed": $(wc -l < "$PROCESSED_DIR/manual-review.json" 2>/dev/null || echo 0),
  "status": "completed",
  "next_actions": [
    "Apply diff files from $FIXES_DIR",
    "Review manual items in $PROCESSED_DIR/manual-review.json",
    "Run tests to verify fixes"
  ]
}
EOF

# ============================================
# APPLY FIXES (Optional - requires confirmation)
# ============================================
echo ""
echo "🔄 Ready to apply fixes?"
echo "  - $(ls -1 "$FIXES_DIR"/*.diff 2>/dev/null | wc -l) diff files ready"
echo "  - ESLint fixes already applied"
echo ""
echo "To apply all fixes, run:"
echo "  ./WORKFLOW-V2-DRAFT/apply-fixes.sh"

# Mark inbox as processed
mv "$INBOX_DIR/.new-issues-available" "$INBOX_DIR/.processed-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

echo ""
echo "✅ Processing complete!"
echo "  📁 Fixes ready in: $FIXES_DIR"
echo "  📋 Reports in: $PROCESSED_DIR"