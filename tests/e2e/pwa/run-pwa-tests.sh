#!/bin/bash

# PWA Test Suite Runner - WS-171
# Comprehensive PWA testing for WedSync wedding platform

set -e

echo "🚀 Starting WedSync PWA Test Suite - WS-171"
echo "==========================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_TIMEOUT=300000  # 5 minutes timeout per test
MAX_RETRIES=2
REPORT_DIR="test-results/pwa-reports"
ARTIFACT_DIR="test-results/pwa-artifacts"

# Create output directories
mkdir -p "$REPORT_DIR"
mkdir -p "$ARTIFACT_DIR"
mkdir -p "test-results/screenshots"
mkdir -p "test-results/videos"

echo -e "${BLUE}📁 Created output directories${NC}"

# Check if development server is running
echo -e "${BLUE}🌐 Checking development server...${NC}"
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${YELLOW}⚠️  Development server not running, starting...${NC}"
    npm run dev &
    DEV_SERVER_PID=$!
    
    # Wait for server to start
    for i in {1..30}; do
        if curl -s http://localhost:3000 > /dev/null; then
            echo -e "${GREEN}✅ Development server started${NC}"
            break
        fi
        echo "   Waiting for server... ($i/30)"
        sleep 2
    done
    
    if ! curl -s http://localhost:3000 > /dev/null; then
        echo -e "${RED}❌ Failed to start development server${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Development server is running${NC}"
fi

# Function to run test suite with proper error handling
run_test_suite() {
    local config_file="$1"
    local suite_name="$2"
    
    echo -e "${BLUE}🧪 Running $suite_name...${NC}"
    
    if npx playwright test \
        --config="$config_file" \
        --timeout="$TEST_TIMEOUT" \
        --retries="$MAX_RETRIES" \
        --reporter=html,json,junit \
        --output-dir="$ARTIFACT_DIR" \
        --workers=1; then
        echo -e "${GREEN}✅ $suite_name completed successfully${NC}"
        return 0
    else
        echo -e "${RED}❌ $suite_name failed${NC}"
        return 1
    fi
}

# Function to generate comprehensive report
generate_final_report() {
    echo -e "${BLUE}📊 Generating comprehensive PWA test report...${NC}"
    
    # Create combined test results summary
    cat > "$REPORT_DIR/pwa-test-execution-summary.md" << EOF
# PWA Test Suite Execution Summary - WS-171

**Execution Date:** $(date)
**Total Execution Time:** $(date -d@$SECONDS -u +%H:%M:%S)
**Test Environment:** Development (localhost:3000)

## Test Suite Execution Results

EOF

    # Check for test result files and add summaries
    if [ -f "test-results/pwa-test-results.json" ]; then
        echo "✅ JSON test results available" >> "$REPORT_DIR/pwa-test-execution-summary.md"
    fi
    
    if [ -f "test-results/pwa-junit-results.xml" ]; then
        echo "✅ JUnit test results available" >> "$REPORT_DIR/pwa-test-execution-summary.md"
    fi
    
    if [ -d "playwright-report/pwa-tests" ]; then
        echo "✅ HTML test report generated" >> "$REPORT_DIR/pwa-test-execution-summary.md"
    fi

    echo -e "${GREEN}📊 Final report generated in $REPORT_DIR${NC}"
}

# Function to cleanup on exit
cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up...${NC}"
    if [ ! -z "$DEV_SERVER_PID" ]; then
        echo "   Stopping development server..."
        kill $DEV_SERVER_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Cleanup complete${NC}"
}

# Set up cleanup on exit
trap cleanup EXIT

# Start timer
START_TIME=$(date +%s)

# Run PWA Test Suites
echo -e "${BLUE}🎯 Starting PWA test execution...${NC}"

# Test execution results tracking
TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

# Core PWA functionality tests
echo -e "\n${BLUE}=== CORE PWA FUNCTIONALITY TESTS ===${NC}"
((TOTAL_SUITES++))

if npx playwright test \
    --config=tests/e2e/pwa/pwa-test-suite.config.ts \
    tests/e2e/pwa/service-worker/ \
    tests/e2e/pwa/compliance/ \
    --timeout="$TEST_TIMEOUT" \
    --retries="$MAX_RETRIES" \
    --workers=1; then
    echo -e "${GREEN}✅ Core PWA tests passed${NC}"
    ((PASSED_SUITES++))
else
    echo -e "${RED}❌ Core PWA tests failed${NC}"
    ((FAILED_SUITES++))
fi

# Performance and optimization tests
echo -e "\n${BLUE}=== PERFORMANCE & OPTIMIZATION TESTS ===${NC}"
((TOTAL_SUITES++))

if npx playwright test \
    --config=tests/e2e/pwa/pwa-test-suite.config.ts \
    tests/e2e/pwa/performance/ \
    --timeout="$TEST_TIMEOUT" \
    --retries="$MAX_RETRIES" \
    --workers=1; then
    echo -e "${GREEN}✅ Performance tests passed${NC}"
    ((PASSED_SUITES++))
else
    echo -e "${RED}❌ Performance tests failed${NC}"
    ((FAILED_SUITES++))
fi

# Cross-browser compatibility tests
echo -e "\n${BLUE}=== CROSS-BROWSER COMPATIBILITY TESTS ===${NC}"
((TOTAL_SUITES++))

if npx playwright test \
    --config=tests/e2e/pwa/pwa-test-suite.config.ts \
    tests/e2e/pwa/browser-support/ \
    --timeout="$TEST_TIMEOUT" \
    --retries="$MAX_RETRIES" \
    --workers=1; then
    echo -e "${GREEN}✅ Cross-browser tests passed${NC}"
    ((PASSED_SUITES++))
else
    echo -e "${RED}❌ Cross-browser tests failed${NC}"
    ((FAILED_SUITES++))
fi

# Mobile and offline tests
echo -e "\n${BLUE}=== MOBILE & OFFLINE TESTS ===${NC}"
((TOTAL_SUITES++))

if npx playwright test \
    --config=tests/e2e/pwa/pwa-test-suite.config.ts \
    tests/e2e/pwa/mobile/ \
    tests/e2e/pwa/offline/ \
    --timeout="$TEST_TIMEOUT" \
    --retries="$MAX_RETRIES" \
    --workers=1; then
    echo -e "${GREEN}✅ Mobile & offline tests passed${NC}"
    ((PASSED_SUITES++))
else
    echo -e "${RED}❌ Mobile & offline tests failed${NC}"
    ((FAILED_SUITES++))
fi

# Installation and user journey tests
echo -e "\n${BLUE}=== INSTALLATION & USER JOURNEY TESTS ===${NC}"
((TOTAL_SUITES++))

if npx playwright test \
    --config=tests/e2e/pwa/pwa-test-suite.config.ts \
    tests/e2e/pwa/installation/ \
    --timeout="$TEST_TIMEOUT" \
    --retries="$MAX_RETRIES" \
    --workers=1; then
    echo -e "${GREEN}✅ Installation tests passed${NC}"
    ((PASSED_SUITES++))
else
    echo -e "${RED}❌ Installation tests failed${NC}"
    ((FAILED_SUITES++))
fi

# Calculate execution time
END_TIME=$(date +%s)
EXECUTION_TIME=$((END_TIME - START_TIME))
EXECUTION_MIN=$((EXECUTION_TIME / 60))
EXECUTION_SEC=$((EXECUTION_TIME % 60))

# Generate final comprehensive report
generate_final_report

# Print final summary
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}🏁 PWA TEST SUITE EXECUTION COMPLETE${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "📊 ${GREEN}Suite Results: $PASSED_SUITES passed, $FAILED_SUITES failed (of $TOTAL_SUITES total)${NC}"
echo -e "⏱️  ${BLUE}Total Execution Time: ${EXECUTION_MIN}m ${EXECUTION_SEC}s${NC}"
echo -e "📁 ${BLUE}Reports Location: $REPORT_DIR${NC}"
echo -e "🎯 ${BLUE}Artifacts Location: $ARTIFACT_DIR${NC}"

# Open HTML report if available
if [ -d "playwright-report/pwa-tests" ]; then
    echo -e "🌐 ${BLUE}HTML Report: playwright-report/pwa-tests/index.html${NC}"
    if command -v open &> /dev/null; then
        echo -e "   ${YELLOW}Opening HTML report...${NC}"
        open playwright-report/pwa-tests/index.html
    fi
fi

# Final status
if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL PWA TESTS PASSED! Ready for deployment.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  SOME TESTS FAILED. Review reports before deployment.${NC}"
    exit 1
fi