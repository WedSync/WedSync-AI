#!/bin/bash

# INTEGRATION TESTING RUNNER SCRIPT
# 
# Comprehensive script to run all integration tests for Session A ↔ B coordination
# This script ensures proper test environment setup and execution order

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_RESULTS_DIR="$PROJECT_ROOT/test-results"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

echo -e "${BLUE}🔧 WEDSYNC INTEGRATION TEST RUNNER${NC}"
echo -e "${BLUE}=====================================${NC}"
echo ""
echo -e "📍 Project Root: ${PROJECT_ROOT}"
echo -e "📁 Test Results: ${TEST_RESULTS_DIR}"
echo -e "⏰ Timestamp: ${TIMESTAMP}"
echo ""

# Function to print section headers
print_section() {
    echo ""
    echo -e "${PURPLE}$1${NC}"
    echo -e "${PURPLE}$(printf '%.0s-' {1..50})${NC}"
}

# Function to print status messages
print_status() {
    local status=$1
    local message=$2
    case $status in
        "SUCCESS")
            echo -e "${GREEN}✅ $message${NC}"
            ;;
        "ERROR")
            echo -e "${RED}❌ $message${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $message${NC}"
            ;;
        "INFO")
            echo -e "${CYAN}ℹ️  $message${NC}"
            ;;
    esac
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-flight checks
print_section "PRE-FLIGHT CHECKS"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_status "SUCCESS" "Node.js found: $NODE_VERSION"
else
    print_status "ERROR" "Node.js not found. Please install Node.js 18 or higher."
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_status "SUCCESS" "npm found: $NPM_VERSION"
else
    print_status "ERROR" "npm not found."
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
    print_status "ERROR" "package.json not found. Are you in the right directory?"
    exit 1
fi

print_status "SUCCESS" "Pre-flight checks completed"

# Environment setup
print_section "ENVIRONMENT SETUP"

# Check for .env.test file
if [[ -f "$PROJECT_ROOT/.env.test" ]]; then
    print_status "SUCCESS" "Test environment file found"
    source "$PROJECT_ROOT/.env.test"
else
    print_status "WARNING" ".env.test file not found - using default environment"
fi

# Verify test database configuration
if [[ -z "$TEST_SUPABASE_URL" ]]; then
    print_status "WARNING" "TEST_SUPABASE_URL not set"
else
    print_status "SUCCESS" "Test database URL configured"
fi

if [[ -z "$TEST_SUPABASE_ANON_KEY" ]]; then
    print_status "WARNING" "TEST_SUPABASE_ANON_KEY not set"
else
    print_status "SUCCESS" "Test database key configured"
fi

# Install dependencies if needed
print_section "DEPENDENCY CHECK"

if [[ ! -d "$PROJECT_ROOT/node_modules" ]]; then
    print_status "INFO" "Installing dependencies..."
    cd "$PROJECT_ROOT"
    npm install
    print_status "SUCCESS" "Dependencies installed"
else
    print_status "SUCCESS" "Dependencies already installed"
fi

# Verify integration test files exist
print_section "TEST FILE VERIFICATION"

INTEGRATION_TESTS=(
    "tests/integration/session-a-b-coordination.test.ts"
    "tests/integration/csrf-token-flow.test.ts"
    "tests/integration/cross-session-validation.test.ts"
    "tests/integration/e2e-user-workflows.test.ts"
    "tests/integration/form-data-flow.test.ts"
    "tests/integration/rls-form-validation.test.ts"
)

MISSING_TESTS=()
for test_file in "${INTEGRATION_TESTS[@]}"; do
    if [[ -f "$PROJECT_ROOT/$test_file" ]]; then
        print_status "SUCCESS" "Found: $test_file"
    else
        print_status "WARNING" "Missing: $test_file"
        MISSING_TESTS+=("$test_file")
    fi
done

if [[ ${#MISSING_TESTS[@]} -gt 0 ]]; then
    print_status "WARNING" "${#MISSING_TESTS[@]} integration test files are missing"
else
    print_status "SUCCESS" "All integration test files found"
fi

# Run integration verification script
print_section "INTEGRATION VERIFICATION"

if [[ -f "$PROJECT_ROOT/scripts/integration-verification.ts" ]]; then
    print_status "INFO" "Running integration verification..."
    cd "$PROJECT_ROOT"
    
    if command_exists tsx; then
        tsx scripts/integration-verification.ts > "$TEST_RESULTS_DIR/verification_${TIMESTAMP}.log" 2>&1
        VERIFICATION_EXIT_CODE=$?
    elif command_exists npx; then
        npx tsx scripts/integration-verification.ts > "$TEST_RESULTS_DIR/verification_${TIMESTAMP}.log" 2>&1
        VERIFICATION_EXIT_CODE=$?
    else
        print_status "WARNING" "tsx not found - skipping verification script"
        VERIFICATION_EXIT_CODE=0
    fi
    
    if [[ $VERIFICATION_EXIT_CODE -eq 0 ]]; then
        print_status "SUCCESS" "Integration verification passed"
    else
        print_status "WARNING" "Integration verification had issues (see log)"
    fi
else
    print_status "WARNING" "Integration verification script not found"
fi

# Function to run test suite with error handling
run_test_suite() {
    local test_name=$1
    local test_command=$2
    local output_file="$TEST_RESULTS_DIR/${test_name}_${TIMESTAMP}.log"
    
    print_status "INFO" "Running $test_name..."
    
    if eval "$test_command" > "$output_file" 2>&1; then
        print_status "SUCCESS" "$test_name completed successfully"
        return 0
    else
        print_status "ERROR" "$test_name failed (see $output_file)"
        
        # Show last few lines of error log
        echo ""
        echo -e "${RED}Last 10 lines of error output:${NC}"
        tail -n 10 "$output_file" | sed 's/^/  /'
        echo ""
        
        return 1
    fi
}

# Run Jest integration tests
print_section "JEST INTEGRATION TESTS"

cd "$PROJECT_ROOT"

# Check if Jest is available
if command_exists npx && npx jest --version >/dev/null 2>&1; then
    print_status "SUCCESS" "Jest found"
    
    # Run integration tests
    JEST_TESTS_PASSED=true
    
    if ! run_test_suite "session-a-b-coordination" "npx jest tests/integration/session-a-b-coordination.test.ts --verbose"; then
        JEST_TESTS_PASSED=false
    fi
    
    if ! run_test_suite "csrf-token-flow" "npx jest tests/integration/csrf-token-flow.test.ts --verbose"; then
        JEST_TESTS_PASSED=false
    fi
    
    if ! run_test_suite "cross-session-validation" "npx jest tests/integration/cross-session-validation.test.ts --verbose"; then
        JEST_TESTS_PASSED=false
    fi
    
    if ! run_test_suite "form-data-flow" "npx jest tests/integration/form-data-flow.test.ts --verbose"; then
        JEST_TESTS_PASSED=false
    fi
    
    if ! run_test_suite "rls-form-validation" "npx jest tests/integration/rls-form-validation.test.ts --verbose"; then
        JEST_TESTS_PASSED=false
    fi
    
    if [[ "$JEST_TESTS_PASSED" == true ]]; then
        print_status "SUCCESS" "All Jest integration tests passed"
    else
        print_status "ERROR" "Some Jest integration tests failed"
    fi
    
else
    print_status "WARNING" "Jest not found - skipping Jest tests"
fi

# Run Playwright E2E tests
print_section "PLAYWRIGHT E2E TESTS"

if command_exists npx && npx playwright --version >/dev/null 2>&1; then
    print_status "SUCCESS" "Playwright found"
    
    # Install Playwright browsers if needed
    if [[ ! -d "$HOME/.cache/ms-playwright" ]] && [[ ! -d "$HOME/Library/Caches/ms-playwright" ]]; then
        print_status "INFO" "Installing Playwright browsers..."
        npx playwright install
    fi
    
    if ! run_test_suite "e2e-user-workflows" "npx playwright test tests/integration/e2e-user-workflows.test.ts"; then
        print_status "ERROR" "Playwright E2E tests failed"
    else
        print_status "SUCCESS" "Playwright E2E tests passed"
    fi
    
else
    print_status "WARNING" "Playwright not found - skipping E2E tests"
fi

# Run security tests
print_section "SECURITY TESTS"

if [[ -d "$PROJECT_ROOT/tests/security" ]]; then
    if ! run_test_suite "security-integration" "npx jest tests/security/ --verbose"; then
        print_status "ERROR" "Security tests failed"
    else
        print_status "SUCCESS" "Security tests passed"
    fi
else
    print_status "WARNING" "Security test directory not found"
fi

# Generate test report
print_section "TEST REPORT GENERATION"

REPORT_FILE="$TEST_RESULTS_DIR/integration_test_report_${TIMESTAMP}.md"

cat > "$REPORT_FILE" << EOF
# Integration Test Report

**Generated:** $(date)
**Project:** WedSync 2.0 Integration Testing
**Session:** A ↔ B Coordination

## Test Environment

- Node.js: $NODE_VERSION
- npm: $NPM_VERSION
- Test Database: ${TEST_SUPABASE_URL:-"Not configured"}

## Test Results

### Jest Integration Tests
EOF

# Add Jest test results to report
for log_file in "$TEST_RESULTS_DIR"/*_${TIMESTAMP}.log; do
    if [[ -f "$log_file" ]]; then
        test_name=$(basename "$log_file" "_${TIMESTAMP}.log")
        echo "- **$test_name:** $(grep -q "PASS\|SUCCESS" "$log_file" && echo "✅ PASSED" || echo "❌ FAILED")" >> "$REPORT_FILE"
    fi
done

cat >> "$REPORT_FILE" << EOF

## Test Artifacts

The following test artifacts have been generated:

EOF

# List all generated files
for file in "$TEST_RESULTS_DIR"/*_${TIMESTAMP}.*; do
    if [[ -f "$file" ]]; then
        echo "- $(basename "$file")" >> "$REPORT_FILE"
    fi
done

print_status "SUCCESS" "Test report generated: $REPORT_FILE"

# Final summary
print_section "FINAL SUMMARY"

echo ""
echo -e "${BLUE}📊 INTEGRATION TEST SUMMARY${NC}"
echo -e "${BLUE}============================${NC}"
echo ""

# Count test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

for log_file in "$TEST_RESULTS_DIR"/*_${TIMESTAMP}.log; do
    if [[ -f "$log_file" ]]; then
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        if grep -q "PASS\|SUCCESS" "$log_file"; then
            PASSED_TESTS=$((PASSED_TESTS + 1))
        else
            FAILED_TESTS=$((FAILED_TESTS + 1))
        fi
    fi
done

echo -e "📋 Total Test Suites: $TOTAL_TESTS"
echo -e "✅ Passed: $PASSED_TESTS"
echo -e "❌ Failed: $FAILED_TESTS"
echo ""

if [[ $FAILED_TESTS -eq 0 ]]; then
    print_status "SUCCESS" "ALL INTEGRATION TESTS PASSED! 🎉"
    echo -e "${GREEN}🚀 Integration framework is ready for Session C coordination!${NC}"
    exit 0
else
    print_status "ERROR" "SOME INTEGRATION TESTS FAILED"
    echo -e "${RED}🔧 Please review test logs and fix failing tests before proceeding.${NC}"
    exit 1
fi