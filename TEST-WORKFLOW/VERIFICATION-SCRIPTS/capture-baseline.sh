#!/bin/bash
# Capture baseline metrics before making any changes
# This provides a reference point for verification

set -e

echo "📸 BASELINE CAPTURE FOR TEST-WORKFLOW"
echo "====================================="
echo ""

# Configuration
PROJECT_ROOT="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/wedsync"
BASELINE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/BASELINE"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Create baseline directory
mkdir -p "$BASELINE_DIR"
cd "$PROJECT_ROOT"

echo "📁 Project: $PROJECT_ROOT"
echo "📊 Baseline will be saved to: $BASELINE_DIR"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "⚠️ node_modules not found. Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Function to capture a metric
capture_metric() {
    local METRIC_NAME=$1
    local COMMAND=$2
    local OUTPUT_FILE="$BASELINE_DIR/${METRIC_NAME}.log"
    
    echo -n "📊 Capturing $METRIC_NAME baseline... "
    
    # Run the command and save output
    eval "$COMMAND" > "$OUTPUT_FILE" 2>&1 || true
    
    # Count issues for summary
    local ISSUES=0
    if [ -f "$OUTPUT_FILE" ]; then
        if [[ "$METRIC_NAME" == "typecheck" ]]; then
            ISSUES=$(grep -c "error TS" "$OUTPUT_FILE" 2>/dev/null || echo "0")
        elif [[ "$METRIC_NAME" == "lint" ]]; then
            ISSUES=$(grep -c "warning\|error" "$OUTPUT_FILE" 2>/dev/null || echo "0")
        elif [[ "$METRIC_NAME" == "test" ]]; then
            ISSUES=$(grep -c "FAIL" "$OUTPUT_FILE" 2>/dev/null || echo "0")
        fi
    fi
    
    echo "✅ Captured (found $ISSUES issues)"
}

echo "🚀 Starting Baseline Capture"
echo "============================"
echo ""

# 1. TypeScript
echo "1️⃣ TypeScript Baseline"
capture_metric "typecheck" "npm run type-check"

# 2. Linting
echo "2️⃣ Linting Baseline"
capture_metric "lint" "npm run lint"

# 3. Build
echo "3️⃣ Build Baseline"
capture_metric "build" "npm run build"

# 4. Tests
echo "4️⃣ Test Baseline"
capture_metric "test" "npm test -- --passWithNoTests"

# 5. Coverage
echo "5️⃣ Coverage Baseline"
if npm run test:coverage -- --passWithNoTests > "$BASELINE_DIR/coverage.log" 2>&1; then
    if [ -f "coverage/coverage-summary.json" ]; then
        COVERAGE=$(node -e "const c=require('./coverage/coverage-summary.json'); console.log(c.total.lines.pct)" 2>/dev/null || echo "0")
        echo "$COVERAGE" > "$BASELINE_DIR/coverage.txt"
        echo "   ↳ Coverage: ${COVERAGE}%"
    fi
fi

# 6. File count and structure
echo "6️⃣ File Structure Baseline"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l > "$BASELINE_DIR/file-count.txt"
find src -type f \( -name "*.ts" -o -name "*.tsx" \) | sort > "$BASELINE_DIR/file-list.txt"
echo "   ↳ $(cat $BASELINE_DIR/file-count.txt) TypeScript files"

# 7. Git status
echo "7️⃣ Git Status Baseline"
git status --porcelain > "$BASELINE_DIR/git-status.txt"
git log --oneline -10 > "$BASELINE_DIR/git-log.txt"
echo "   ↳ Current branch: $(git branch --show-current)"

# Create summary
echo ""
echo "📋 Creating Baseline Summary..."

cat > "$BASELINE_DIR/summary.md" << EOF
# Baseline Capture Summary
**Timestamp**: $TIMESTAMP
**Project**: WedSync TEST-WORKFLOW

## Metrics Captured
- TypeScript errors: $(grep -c "error TS" "$BASELINE_DIR/typecheck.log" 2>/dev/null || echo "0")
- Lint warnings: $(grep -c "warning" "$BASELINE_DIR/lint.log" 2>/dev/null || echo "0")
- Failed tests: $(grep -c "FAIL" "$BASELINE_DIR/test.log" 2>/dev/null || echo "0")
- Test coverage: ${COVERAGE:-Unknown}%
- Total TS files: $(cat "$BASELINE_DIR/file-count.txt")
- Git branch: $(git branch --show-current)

## Files
$(ls -la "$BASELINE_DIR" | tail -n +2)

## Usage
This baseline will be used to compare against after fixes are applied.
Any regression from this baseline should trigger a rollback.

## Next Steps
1. Apply fixes using TEST-WORKFLOW
2. Run verify-fix.sh to compare against this baseline
3. Rollback if verification fails
EOF

echo ""
echo "✅ BASELINE CAPTURE COMPLETE"
echo "============================"
echo ""
echo "📊 Baseline saved to: $BASELINE_DIR"
echo "📋 Summary available at: $BASELINE_DIR/summary.md"
echo ""
echo "Next steps:"
echo "1. Apply your fixes"
echo "2. Run ./verify-fix.sh to verify no regressions"
echo "3. Rollback if verification fails"