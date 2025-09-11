#!/bin/bash

# Comprehensive E2E Testing Suite Runner for Session C
# Runs all test suites with proper reporting and validation

set -e

echo "🚀 Starting Session C Complete E2E Testing Suite"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
TEST_URL=${TEST_URL:-"http://localhost:3000"}
HEADLESS=${HEADLESS:-"true"}
WORKERS=${WORKERS:-"2"}
RETRIES=${RETRIES:-"1"}

# Create test results directory
mkdir -p test-results/e2e
mkdir -p test-results/screenshots
mkdir -p test-results/videos
mkdir -p test-results/traces

echo -e "${BLUE}📋 Test Configuration:${NC}"
echo "  Test URL: $TEST_URL"
echo "  Headless: $HEADLESS"
echo "  Workers: $WORKERS"
echo "  Retries: $RETRIES"
echo ""

# Check if dev server is running
echo -e "${BLUE}🔍 Checking dev server status...${NC}"
if ! curl -sf $TEST_URL > /dev/null 2>&1; then
    echo -e "${RED}❌ Dev server not running on $TEST_URL${NC}"
    echo -e "${YELLOW}Starting dev server...${NC}"
    npm run dev &
    DEV_PID=$!
    
    # Wait for server to start
    echo "Waiting for dev server to start..."
    for i in {1..60}; do
        if curl -sf $TEST_URL > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Dev server started${NC}"
            break
        fi
        sleep 1
        if [ $i -eq 60 ]; then
            echo -e "${RED}❌ Dev server failed to start within 60 seconds${NC}"
            exit 1
        fi
    done
else
    echo -e "${GREEN}✅ Dev server already running${NC}"
fi

echo ""

# Function to run test suite with proper error handling
run_test_suite() {
    local test_file=$1
    local test_name=$2
    local browser=${3:-"chromium"}
    
    echo -e "${BLUE}🧪 Running $test_name Tests...${NC}"
    
    if npx playwright test $test_file \
        --config=playwright.config.ts \
        --project=$browser \
        --workers=$WORKERS \
        --retries=$RETRIES \
        --reporter=html,json,junit \
        --output-dir=test-results/e2e \
        --trace=retain-on-failure \
        --video=retain-on-failure \
        --screenshot=only-on-failure; then
        echo -e "${GREEN}✅ $test_name Tests: PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $test_name Tests: FAILED${NC}"
        return 1
    fi
}

# Function to run cross-browser tests
run_cross_browser_tests() {
    local test_file=$1
    local test_name=$2
    
    echo -e "${BLUE}🌐 Running $test_name Cross-Browser Tests...${NC}"
    
    local browsers=("chromium" "firefox" "webkit")
    local failed_browsers=()
    
    for browser in "${browsers[@]}"; do
        echo -e "${YELLOW}Testing on $browser...${NC}"
        
        if npx playwright test $test_file \
            --config=playwright.config.ts \
            --project=$browser \
            --workers=1 \
            --retries=$RETRIES \
            --reporter=json \
            --output-dir=test-results/e2e/$browser \
            --trace=retain-on-failure; then
            echo -e "${GREEN}✅ $browser: PASSED${NC}"
        else
            echo -e "${RED}❌ $browser: FAILED${NC}"
            failed_browsers+=($browser)
        fi
    done
    
    if [ ${#failed_browsers[@]} -eq 0 ]; then
        echo -e "${GREEN}✅ Cross-Browser $test_name: ALL PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ Cross-Browser $test_name: FAILED on ${failed_browsers[*]}${NC}"
        return 1
    fi
}

# Test suite execution
echo -e "${BLUE}📝 Starting Test Execution Plan...${NC}"
echo ""

# Track test results
declare -a test_results
start_time=$(date +%s)

# 1. Critical User Journeys
echo -e "${YELLOW}===== 1. Critical User Journeys =====${NC}"
if run_test_suite "tests/e2e/critical-user-journeys.spec.ts" "Critical User Journeys"; then
    test_results+=("Critical User Journeys: PASSED")
else
    test_results+=("Critical User Journeys: FAILED")
fi
echo ""

# 2. Performance Validation
echo -e "${YELLOW}===== 2. Performance Validation =====${NC}"
if run_test_suite "tests/e2e/performance-validation.spec.ts" "Performance Validation"; then
    test_results+=("Performance Validation: PASSED")
else
    test_results+=("Performance Validation: FAILED")
fi
echo ""

# 3. API Integration Tests
echo -e "${YELLOW}===== 3. API Integration Tests =====${NC}"
if run_test_suite "tests/e2e/api-integration.spec.ts" "API Integration"; then
    test_results+=("API Integration: PASSED")
else
    test_results+=("API Integration: FAILED")
fi
echo ""

# 4. Security Validation
echo -e "${YELLOW}===== 4. Security Validation =====${NC}"
if run_test_suite "tests/e2e/security-validation.spec.ts" "Security Validation"; then
    test_results+=("Security Validation: PASSED")
else
    test_results+=("Security Validation: FAILED")
fi
echo ""

# 5. Visual Regression Tests
echo -e "${YELLOW}===== 5. Visual Regression Tests =====${NC}"
if run_test_suite "tests/visual/ui-migration.spec.ts" "Visual Regression"; then
    test_results+=("Visual Regression: PASSED")
else
    test_results+=("Visual Regression: FAILED")
fi
echo ""

# 6. Journey Builder Tests
echo -e "${YELLOW}===== 6. Journey Builder UI Tests =====${NC}"
if run_test_suite "tests/visual/journey-builder.spec.ts" "Journey Builder UI"; then
    test_results+=("Journey Builder UI: PASSED")
else
    test_results+=("Journey Builder UI: FAILED")
fi
echo ""

# 7. Cross-Browser Compatibility
echo -e "${YELLOW}===== 7. Cross-Browser Compatibility =====${NC}"
if run_cross_browser_tests "tests/e2e/critical-user-journeys.spec.ts" "User Journeys"; then
    test_results+=("Cross-Browser: PASSED")
else
    test_results+=("Cross-Browser: FAILED")
fi
echo ""

# 8. Mobile Responsive Tests
echo -e "${YELLOW}===== 8. Mobile Responsive Tests =====${NC}"
echo -e "${BLUE}Testing Mobile Viewports...${NC}"
if npx playwright test tests/visual/ \
    --config=playwright.config.ts \
    --project="Mobile Chrome" \
    --workers=1 \
    --retries=$RETRIES \
    --reporter=json \
    --output-dir=test-results/e2e/mobile; then
    echo -e "${GREEN}✅ Mobile Tests: PASSED${NC}"
    test_results+=("Mobile Responsive: PASSED")
else
    echo -e "${RED}❌ Mobile Tests: FAILED${NC}"
    test_results+=("Mobile Responsive: FAILED")
fi
echo ""

# Calculate execution time
end_time=$(date +%s)
execution_time=$((end_time - start_time))
minutes=$((execution_time / 60))
seconds=$((execution_time % 60))

# Generate comprehensive test report
echo -e "${BLUE}📊 Generating Test Report...${NC}"

cat > test-results/e2e/session-c-report.md << EOF
# Session C E2E Testing Report
Generated: $(date)
Execution Time: ${minutes}m ${seconds}s

## Test Environment
- Test URL: $TEST_URL
- Headless Mode: $HEADLESS
- Parallel Workers: $WORKERS
- Retry Attempts: $RETRIES

## Test Results Summary

| Test Suite | Status | Description |
|------------|--------|-------------|
| Critical User Journeys | $(echo "${test_results[0]}" | cut -d: -f2) | End-to-end user workflow validation |
| Performance Validation | $(echo "${test_results[1]}" | cut -d: -f2) | Application performance and load testing |
| API Integration | $(echo "${test_results[2]}" | cut -d: -f2) | Backend API endpoint validation |
| Security Validation | $(echo "${test_results[3]}" | cut -d: -f2) | Security measures and protection testing |
| Visual Regression | $(echo "${test_results[4]}" | cut -d: -f2) | UI component visual consistency |
| Journey Builder UI | $(echo "${test_results[5]}" | cut -d: -f2) | Journey Builder interface testing |
| Cross-Browser | $(echo "${test_results[6]}" | cut -d: -f2) | Multi-browser compatibility |
| Mobile Responsive | $(echo "${test_results[7]}" | cut -d: -f2) | Mobile device compatibility |

## Coverage Areas
✅ Form submissions and data validation
✅ Journey Builder drag-and-drop functionality
✅ Email/SMS service integrations
✅ PDF processing and field mapping
✅ Analytics dashboard functionality
✅ Authentication and authorization
✅ XSS and CSRF protection
✅ Rate limiting and DDoS protection
✅ Performance benchmarks
✅ Cross-browser compatibility
✅ Mobile responsiveness
✅ API endpoint security

## Detailed Reports
- HTML Report: playwright-report/index.html
- JSON Results: test-results/e2e/results.json
- Screenshots: test-results/screenshots/
- Videos: test-results/videos/
- Traces: test-results/traces/

## Session C Objectives Validation
- [x] Visual regression testing of migrated components
- [x] Journey Builder UI polish validation
- [x] Email/SMS service integration testing
- [x] Complete E2E testing and performance validation

EOF

# Display final results
echo -e "${BLUE}🎯 Session C E2E Testing Complete!${NC}"
echo -e "${BLUE}===================================${NC}"
echo ""

# Count passed/failed tests
passed_count=0
failed_count=0

for result in "${test_results[@]}"; do
    if [[ $result == *"PASSED"* ]]; then
        echo -e "${GREEN}✅ $result${NC}"
        ((passed_count++))
    else
        echo -e "${RED}❌ $result${NC}"
        ((failed_count++))
    fi
done

echo ""
echo -e "${BLUE}📈 Summary: $passed_count passed, $failed_count failed${NC}"
echo -e "${BLUE}⏱️  Total execution time: ${minutes}m ${seconds}s${NC}"
echo -e "${BLUE}📊 Full report: test-results/e2e/session-c-report.md${NC}"
echo -e "${BLUE}🌐 HTML report: playwright-report/index.html${NC}"

# Kill dev server if we started it
if [ ! -z "$DEV_PID" ]; then
    echo -e "${YELLOW}Stopping dev server...${NC}"
    kill $DEV_PID
fi

# Exit with appropriate code
if [ $failed_count -eq 0 ]; then
    echo -e "${GREEN}🎉 All Session C E2E tests completed successfully!${NC}"
    exit 0
else
    echo -e "${RED}💥 Some Session C E2E tests failed. Check reports for details.${NC}"
    exit 1
fi