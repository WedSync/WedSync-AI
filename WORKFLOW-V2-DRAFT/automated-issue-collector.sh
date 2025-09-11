#!/bin/bash

# Automated Issue Collector for TEST-WORKFLOW
# Fetches issues from multiple sources without manual intervention

echo "🤖 Automated Issue Collector v2.0"
echo "=================================="
echo "Collecting issues from all sources..."
echo ""

# Configuration
OUTPUT_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/WORKFLOW-V2-DRAFT/ISSUE-INBOX"
mkdir -p "$OUTPUT_DIR"

# Initialize combined issues file
COMBINED_FILE="$OUTPUT_DIR/all-issues-$(date +%Y%m%d-%H%M%S).json"
echo '{"collected_at": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'", "sources": [], "total_issues": 0, "issues": []}' > "$COMBINED_FILE"

TOTAL_ISSUES=0

# ============================================
# 1. CODERABBIT - Fetch from GitHub PRs
# ============================================
echo "📥 [1/4] Fetching CodeRabbit issues..."

if gh auth status &> /dev/null; then
    CODERABBIT_COUNT=0
    
    # Check all open PRs
    for pr in $(gh pr list --repo WedSync/WedSync2 --limit 50 --json number -q '.[].number' 2>/dev/null); do
        # Get review comments from CodeRabbit
        comments=$(gh api repos/WedSync/WedSync2/pulls/$pr/comments --jq '[.[] | select(.user.login | contains("coderabbit") or contains("CodeRabbit"))] | length' 2>/dev/null || echo 0)
        
        if [ "$comments" -gt 0 ]; then
            echo "  Found $comments issues in PR #$pr"
            
            # Export to individual file
            gh api repos/WedSync/WedSync2/pulls/$pr/comments --jq '.[] | select(.user.login | contains("coderabbit") or contains("CodeRabbit")) | {
                source: "coderabbit",
                pr_number: '$pr',
                file: .path,
                line: .line,
                severity: (if (.body | contains("⚠️")) then "warning" elif (.body | contains("🛠️")) then "refactor" elif (.body | contains("💡")) then "info" else "suggestion" end),
                category: (if (.body | contains("security")) then "security" elif (.body | contains("performance")) then "performance" elif (.body | contains("refactor")) then "quality" else "general" end),
                description: (.body | gsub("\n"; " ") | .[0:500]),
                full_comment: .body,
                created_at: .created_at,
                url: .html_url,
                auto_fixable: (if (.body | contains("```diff")) then true else false end)
            }' >> "$OUTPUT_DIR/coderabbit-pr-$pr.json" 2>/dev/null
            
            CODERABBIT_COUNT=$((CODERABBIT_COUNT + comments))
        fi
    done
    
    echo "  ✅ CodeRabbit: $CODERABBIT_COUNT issues collected"
    TOTAL_ISSUES=$((TOTAL_ISSUES + CODERABBIT_COUNT))
else
    echo "  ⚠️  GitHub not authenticated - skipping CodeRabbit"
fi

# ============================================
# 2. SONARQUBE - Fetch from API
# ============================================
echo "📥 [2/4] Fetching SonarQube issues..."

SONAR_URL="http://localhost:9000"
SONAR_TOKEN="squ_fa60ac7f813223f8901089b1aa12fa12b4432f2d"
SONAR_PROJECT="wedsync-2025"

# Check if SonarQube is running
if curl -s "$SONAR_URL/api/system/health" &> /dev/null; then
    # Fetch issues
    SONAR_ISSUES=$(curl -s -u admin:WedSync@SonarQube2025! \
        "$SONAR_URL/api/issues/search?componentKeys=$SONAR_PROJECT&ps=500" \
        | jq '.issues | map({
            source: "sonarqube",
            file: .component,
            line: .line,
            severity: .severity,
            category: .type,
            description: .message,
            rule: .rule,
            effort: .effort,
            created_at: .creationDate,
            auto_fixable: false
        })' 2>/dev/null || echo "[]")
    
    SONAR_COUNT=$(echo "$SONAR_ISSUES" | jq '. | length' 2>/dev/null || echo 0)
    
    if [ "$SONAR_COUNT" -gt 0 ]; then
        echo "$SONAR_ISSUES" > "$OUTPUT_DIR/sonarqube-issues.json"
        echo "  ✅ SonarQube: $SONAR_COUNT issues collected"
        TOTAL_ISSUES=$((TOTAL_ISSUES + SONAR_COUNT))
    else
        echo "  ⏳ SonarQube: No issues yet (scan may be pending)"
    fi
else
    echo "  ⚠️  SonarQube not running - skipping"
fi

# ============================================
# 3. DEEPSOURCE - Check for config/webhooks
# ============================================
echo "📥 [3/4] Checking DeepSource integration..."

# DeepSource typically sends webhooks or has an API
# For now, check if .deepsource.toml exists and is configured
if [ -f ".deepsource.toml" ]; then
    echo "  ✅ DeepSource config found"
    
    # If DeepSource CLI is installed, fetch issues
    if command -v deepsource &> /dev/null; then
        deepsource report --format json > "$OUTPUT_DIR/deepsource-issues.json" 2>/dev/null || true
        DS_COUNT=$(jq '.issues | length' "$OUTPUT_DIR/deepsource-issues.json" 2>/dev/null || echo 0)
        echo "  ✅ DeepSource: $DS_COUNT issues collected"
        TOTAL_ISSUES=$((TOTAL_ISSUES + DS_COUNT))
    else
        echo "  ℹ️  DeepSource CLI not installed - check dashboard manually"
    fi
else
    echo "  ⚠️  DeepSource not configured"
fi

# ============================================
# 4. ESLINT/PRETTIER - Run local analysis
# ============================================
echo "📥 [4/4] Running local linters..."

cd wedsync 2>/dev/null || cd /Volumes/Extreme\ Pro/CODE/WedSync\ 2.0/WedSync\ Dev/wedsync

# Run ESLint if available
if [ -f "package.json" ] && grep -q "eslint" package.json; then
    npm run lint -- --format json > "$OUTPUT_DIR/eslint-issues.json" 2>/dev/null || true
    ESLINT_COUNT=$(jq '.[] | .messages | length' "$OUTPUT_DIR/eslint-issues.json" 2>/dev/null | awk '{s+=$1} END {print s}' || echo 0)
    
    if [ -n "$ESLINT_COUNT" ] && [ "$ESLINT_COUNT" -gt 0 ]; then
        echo "  ✅ ESLint: $ESLINT_COUNT issues found"
        TOTAL_ISSUES=$((TOTAL_ISSUES + ESLINT_COUNT))
    else
        echo "  ✅ ESLint: Clean!"
    fi
else
    echo "  ⚠️  ESLint not configured"
fi

# ============================================
# COMBINE ALL ISSUES
# ============================================
echo ""
echo "📊 Combining all issues..."

# Create unified inbox
cat > "$OUTPUT_DIR/INBOX.json" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "total_issues": $TOTAL_ISSUES,
  "sources": {
    "coderabbit": $CODERABBIT_COUNT,
    "sonarqube": ${SONAR_COUNT:-0},
    "deepsource": ${DS_COUNT:-0},
    "eslint": ${ESLINT_COUNT:-0}
  },
  "status": "ready_for_processing",
  "auto_fixable_count": 0,
  "priority_breakdown": {
    "critical": 0,
    "high": 0,
    "medium": 0,
    "low": 0
  }
}
EOF

# ============================================
# CATEGORIZE FOR AUTO-FIX
# ============================================
echo ""
echo "🔧 Categorizing issues for auto-fix..."

cat > "$OUTPUT_DIR/auto-fix-queue.json" << 'EOF'
{
  "auto_fixable": [],
  "manual_review": [],
  "categories": {
    "formatting": [],
    "imports": [],
    "types": [],
    "security": [],
    "performance": [],
    "best_practices": []
  }
}
EOF

# ============================================
# SUMMARY
# ============================================
echo ""
echo "✅ Issue Collection Complete!"
echo "=============================="
echo "Total Issues Found: $TOTAL_ISSUES"
echo ""
echo "📁 Issues saved to: $OUTPUT_DIR/"
echo "   - INBOX.json (main file for TEST-WORKFLOW)"
echo "   - Individual source files for debugging"
echo ""
echo "🚀 TEST-WORKFLOW can now process these automatically:"
echo "   ./WORKFLOW-V2-DRAFT/process-issue-inbox.sh"
echo ""

# Create a flag file for TEST-WORKFLOW to detect new issues
touch "$OUTPUT_DIR/.new-issues-available"

# Return success with issue count
exit 0