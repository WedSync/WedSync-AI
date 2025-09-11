#!/bin/bash
# Main verification script for TEST-WORKFLOW
# Ensures fixes don't break other features

set -e  # Exit on any error

echo "🔍 TEST-WORKFLOW VERIFICATION SUITE v2.0"
echo "========================================"
echo ""

# Configuration
PROJECT_ROOT="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/wedsync"
BASELINE_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/BASELINE"
RESULTS_DIR="/Volumes/Extreme Pro/CODE/WedSync 2.0/WedSync Dev/TEST-WORKFLOW/VERIFICATION-RESULTS"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create results directory
mkdir -p "$RESULTS_DIR/$TIMESTAMP"
cd "$PROJECT_ROOT"

echo "📁 Working directory: $PROJECT_ROOT"
echo "📊 Results will be saved to: $RESULTS_DIR/$TIMESTAMP"
echo ""

# Function to check if npm is ready
check_npm_ready() {
    if [ ! -d "node_modules" ]; then
        echo -e "${YELLOW}⚠️ node_modules not found. Installing dependencies...${NC}"
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}❌ Failed to install dependencies${NC}"
            exit 1
        fi
    fi
}

# Function to run a check and compare with baseline
run_check() {
    local CHECK_NAME=$1
    local COMMAND=$2
    local BASELINE_FILE="$BASELINE_DIR/${CHECK_NAME}.log"
    local RESULT_FILE="$RESULTS_DIR/$TIMESTAMP/${CHECK_NAME}.log"
    
    echo -n "🔧 Running $CHECK_NAME... "
    
    # Run the command
    eval "$COMMAND" > "$RESULT_FILE" 2>&1
    local EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo -e "${GREEN}✅ PASSED${NC}"
        
        # Compare with baseline if it exists
        if [ -f "$BASELINE_FILE" ]; then
            if diff -q "$BASELINE_FILE" "$RESULT_FILE" > /dev/null 2>&1; then
                echo "   ↳ No changes from baseline"
            else
                echo -e "   ↳ ${YELLOW}Changes detected from baseline${NC}"
                # Check if there are new errors
                if grep -q "ERROR\|FAIL" "$RESULT_FILE"; then
                    if ! grep -q "ERROR\|FAIL" "$BASELINE_FILE"; then
                        echo -e "   ↳ ${RED}⚠️ NEW ERRORS INTRODUCED!${NC}"
                        return 1
                    fi
                fi
            fi
        fi
    else
        echo -e "${RED}❌ FAILED (exit code: $EXIT_CODE)${NC}"
        return 1
    fi
    
    return 0
}

# Start verification
echo "🚀 Starting Comprehensive Verification"
echo "======================================"
echo ""

# Check npm is ready
check_npm_ready

# Track overall status
VERIFICATION_PASSED=true

# 1. TypeScript Compilation
echo "1️⃣ TypeScript Verification"
if ! run_check "typecheck" "npm run type-check"; then
    VERIFICATION_PASSED=false
    echo -e "${RED}   ⚠️ TypeScript compilation failed - DO NOT PROCEED${NC}"
fi
echo ""

# 2. Linting
echo "2️⃣ Code Quality (Linting)"
if ! run_check "lint" "npm run lint"; then
    echo -e "${YELLOW}   ⚠️ Linting issues found - Review before proceeding${NC}"
fi
echo ""

# 3. Build Verification
echo "3️⃣ Build Verification"
if ! run_check "build" "npm run build"; then
    VERIFICATION_PASSED=false
    echo -e "${RED}   ⚠️ Build failed - DO NOT PROCEED${NC}"
fi
echo ""

# 4. Unit Tests
echo "4️⃣ Unit Tests"
if ! run_check "test" "npm test -- --passWithNoTests"; then
    VERIFICATION_PASSED=false
    echo -e "${RED}   ⚠️ Tests failed - DO NOT PROCEED${NC}"
fi
echo ""

# 5. Test Coverage
echo "5️⃣ Test Coverage"
if command -v npm run test:coverage &> /dev/null; then
    run_check "coverage" "npm run test:coverage -- --passWithNoTests"
    
    # Extract coverage percentage
    if [ -f "coverage/coverage-summary.json" ]; then
        COVERAGE=$(node -e "const c=require('./coverage/coverage-summary.json'); console.log(c.total.lines.pct)")
        echo "   ↳ Coverage: ${COVERAGE}%"
        
        # Check if coverage dropped
        if [ -f "$BASELINE_DIR/coverage.txt" ]; then
            BASELINE_COVERAGE=$(cat "$BASELINE_DIR/coverage.txt")
            if (( $(echo "$COVERAGE < $BASELINE_COVERAGE - 5" | bc -l) )); then
                echo -e "   ↳ ${RED}⚠️ Coverage dropped by more than 5%${NC}"
                VERIFICATION_PASSED=false
            fi
        fi
        echo "$COVERAGE" > "$RESULTS_DIR/$TIMESTAMP/coverage.txt"
    fi
else
    echo "   ↳ Coverage script not found, skipping"
fi
echo ""

# 6. Security Audit
echo "6️⃣ Security Audit"
npm audit --audit-level=high > "$RESULTS_DIR/$TIMESTAMP/audit.log" 2>&1
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ No high/critical vulnerabilities${NC}"
else
    echo -e "${YELLOW}⚠️ Security vulnerabilities found - Review audit.log${NC}"
fi
echo ""

# Generate summary report
echo "📊 VERIFICATION SUMMARY"
echo "======================="
echo ""

cat > "$RESULTS_DIR/$TIMESTAMP/summary.md" << EOF
# Verification Report
**Timestamp**: $TIMESTAMP
**Project**: WedSync TEST-WORKFLOW

## Results
- TypeScript: $([ -f "$RESULTS_DIR/$TIMESTAMP/typecheck.log" ] && echo "✅ PASSED" || echo "❌ FAILED")
- Linting: $([ -f "$RESULTS_DIR/$TIMESTAMP/lint.log" ] && echo "✅ PASSED" || echo "⚠️ WARNINGS")
- Build: $([ -f "$RESULTS_DIR/$TIMESTAMP/build.log" ] && echo "✅ PASSED" || echo "❌ FAILED")
- Tests: $([ -f "$RESULTS_DIR/$TIMESTAMP/test.log" ] && echo "✅ PASSED" || echo "❌ FAILED")
- Coverage: ${COVERAGE:-N/A}%
- Security: $(grep -q "found 0 vulnerabilities" "$RESULTS_DIR/$TIMESTAMP/audit.log" && echo "✅ CLEAN" || echo "⚠️ ISSUES")

## Recommendation
EOF

if [ "$VERIFICATION_PASSED" = true ]; then
    echo -e "${GREEN}✅ ALL CRITICAL CHECKS PASSED${NC}"
    echo "✅ **SAFE TO PROCEED** - All critical verifications passed" >> "$RESULTS_DIR/$TIMESTAMP/summary.md"
    echo ""
    echo "You can safely proceed with these changes."
    exit 0
else
    echo -e "${RED}❌ VERIFICATION FAILED${NC}"
    echo "❌ **DO NOT PROCEED** - Critical verifications failed" >> "$RESULTS_DIR/$TIMESTAMP/summary.md"
    echo ""
    echo "⚠️ CRITICAL: Do not proceed with these changes!"
    echo "Review the logs in: $RESULTS_DIR/$TIMESTAMP"
    echo ""
    echo "Recommended action: ROLLBACK these changes"
    exit 1
fi