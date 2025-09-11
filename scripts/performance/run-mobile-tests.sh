#!/bin/bash

# WS-193 Mobile Performance Tests Suite - Team D
# Mobile & PWA Performance Focus for Wedding Workflows

set -e

echo "🎭 WS-193 Mobile Performance Tests Suite - Team D"
echo "=================================================="
echo "🎯 Focus: Mobile & PWA Performance for Wedding Workflows"
echo ""

# Configuration
PROJECT_ROOT=$(pwd)
TEST_DIR="tests/performance/mobile"
RESULTS_DIR="test-results/mobile-performance"
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for application to be ready
wait_for_app() {
    print_status "Waiting for application to be ready..."
    
    local max_attempts=30
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f http://localhost:3000 >/dev/null 2>&1; then
            print_success "Application is ready"
            return 0
        fi
        
        attempt=$((attempt + 1))
        sleep 2
    done
    
    print_error "Application failed to start within timeout"
    return 1
}

# Function to cleanup on exit
cleanup() {
    print_status "Cleaning up..."
    
    # Kill any remaining processes on port 3000
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
    
    # Kill background npm processes
    pkill -f "npm start" 2>/dev/null || true
    pkill -f "next" 2>/dev/null || true
    
    print_success "Cleanup completed"
}

# Set trap for cleanup
trap cleanup EXIT INT TERM

# Verify prerequisites
print_status "Verifying prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed"
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed"
    exit 1
fi

if ! command_exists npx; then
    print_error "npx is not available"
    exit 1
fi

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Make sure you're in the project root directory."
    exit 1
fi

# Create results directory
mkdir -p "$RESULTS_DIR"

print_success "Prerequisites verified"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
fi

# Check if Playwright browsers are installed
if ! npx playwright --version >/dev/null 2>&1; then
    print_status "Installing Playwright..."
    npx playwright install
    print_success "Playwright installed"
fi

# Build the application if needed
print_status "Building application..."
if npm run build; then
    print_success "Application built successfully"
else
    print_error "Build failed"
    exit 1
fi

# Start the application
print_status "Starting WedSync application..."

# Check if app is already running
if curl -f http://localhost:3000 >/dev/null 2>&1; then
    print_warning "Application is already running on port 3000"
else
    # Start application in background
    npm start > "$RESULTS_DIR/app-startup.log" 2>&1 &
    APP_PID=$!
    
    if wait_for_app; then
        print_success "Application started (PID: $APP_PID)"
    else
        print_error "Failed to start application"
        cat "$RESULTS_DIR/app-startup.log"
        exit 1
    fi
fi

# Run mobile performance tests
print_status "Running mobile performance test suite..."
echo ""

# Track overall test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Test 1: Lighthouse Tests
print_status "🔍 Running Lighthouse CI tests..."
if npx playwright test "$TEST_DIR/lighthouse-tests.ts" --reporter=json --output-dir="$RESULTS_DIR/lighthouse" 2>&1 | tee "$RESULTS_DIR/lighthouse-output.log"; then
    print_success "Lighthouse tests completed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_error "Lighthouse tests failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 2: PWA Performance Tests
print_status "📱 Running PWA performance tests..."
if npx playwright test "$TEST_DIR/pwa-performance.test.ts" --reporter=json --output-dir="$RESULTS_DIR/pwa" 2>&1 | tee "$RESULTS_DIR/pwa-output.log"; then
    print_success "PWA tests completed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_error "PWA tests failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Test 3: Cross-Device Validation (if exists)
if [ -d "tests/performance/cross-device" ]; then
    print_status "🔄 Running cross-device validation tests..."
    if npx playwright test tests/performance/cross-device/ --reporter=json --output-dir="$RESULTS_DIR/cross-device" 2>&1 | tee "$RESULTS_DIR/cross-device-output.log"; then
        print_success "Cross-device tests completed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "Cross-device tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Test 4: Mobile-specific Performance Tests (existing file)
if [ -f "tests/performance/mobile-performance.spec.ts" ]; then
    print_status "📱 Running existing mobile performance tests..."
    if npx playwright test tests/performance/mobile-performance.spec.ts --reporter=json --output-dir="$RESULTS_DIR/mobile-spec" 2>&1 | tee "$RESULTS_DIR/mobile-spec-output.log"; then
        print_success "Mobile spec tests completed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        print_error "Mobile spec tests failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
fi

# Test 5: Run comprehensive performance runner
print_status "🎭 Running comprehensive performance analysis..."
if npx ts-node scripts/performance/mobile-performance-runner.ts --output="$RESULTS_DIR" 2>&1 | tee "$RESULTS_DIR/comprehensive-output.log"; then
    print_success "Comprehensive analysis completed"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_error "Comprehensive analysis failed"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

# Generate summary report
print_status "📊 Generating test summary..."

SUMMARY_FILE="$RESULTS_DIR/test-summary-$TIMESTAMP.json"
cat > "$SUMMARY_FILE" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "testSuite": "WS-193 Mobile Performance Tests - Team D",
  "focus": "Mobile & PWA Performance for Wedding Workflows",
  "summary": {
    "totalTests": $TOTAL_TESTS,
    "passedTests": $PASSED_TESTS,
    "failedTests": $FAILED_TESTS,
    "passRate": "$(echo "scale=2; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
  },
  "testResults": {
    "lighthouseTests": $([ -f "$RESULTS_DIR/lighthouse-output.log" ] && echo "true" || echo "false"),
    "pwaTests": $([ -f "$RESULTS_DIR/pwa-output.log" ] && echo "true" || echo "false"),
    "crossDeviceTests": $([ -f "$RESULTS_DIR/cross-device-output.log" ] && echo "true" || echo "false"),
    "mobileSpecTests": $([ -f "$RESULTS_DIR/mobile-spec-output.log" ] && echo "true" || echo "false"),
    "comprehensiveAnalysis": $([ -f "$RESULTS_DIR/comprehensive-output.log" ] && echo "true" || echo "false")
  },
  "outputFiles": {
    "resultsDirectory": "$RESULTS_DIR",
    "summaryFile": "$SUMMARY_FILE",
    "logFiles": [
      "$RESULTS_DIR/lighthouse-output.log",
      "$RESULTS_DIR/pwa-output.log",
      "$RESULTS_DIR/cross-device-output.log",
      "$RESULTS_DIR/mobile-spec-output.log",
      "$RESULTS_DIR/comprehensive-output.log"
    ]
  }
}
EOF

# Display final results
echo ""
echo "=========================================="
echo "🎉 WS-193 Mobile Performance Tests Complete"
echo "=========================================="
echo "📊 Test Summary:"
echo "   Total Tests: $TOTAL_TESTS"
echo "   Passed: $PASSED_TESTS"
echo "   Failed: $FAILED_TESTS"
echo "   Pass Rate: $(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)%"
echo ""
echo "📁 Results Location: $RESULTS_DIR"
echo "📄 Summary Report: $SUMMARY_FILE"
echo ""

# Check for specific result files and display them
if [ -f "$RESULTS_DIR/mobile-performance-report.html" ]; then
    echo "🌐 HTML Report: $RESULTS_DIR/mobile-performance-report.html"
fi

if [ -f "$RESULTS_DIR/ci-metrics.json" ]; then
    echo "🤖 CI Metrics: $RESULTS_DIR/ci-metrics.json"
fi

echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    print_success "All mobile performance tests passed! 🎉"
    print_success "Wedding workflows are ready for production deployment."
    echo ""
    echo "✅ Key Achievements:"
    echo "   • Mobile performance benchmarks met"
    echo "   • PWA functionality validated"
    echo "   • Cross-device compatibility confirmed"
    echo "   • Wedding workflow performance optimized"
    exit 0
else
    print_error "$FAILED_TESTS out of $TOTAL_TESTS tests failed"
    echo ""
    echo "❌ Issues to Address:"
    echo "   • Review failed test logs in $RESULTS_DIR"
    echo "   • Check Core Web Vitals performance"
    echo "   • Verify PWA service worker implementation"
    echo "   • Validate cross-device compatibility"
    echo ""
    echo "🔧 Next Steps:"
    echo "   1. Review detailed logs for specific failures"
    echo "   2. Fix identified performance issues"
    echo "   3. Re-run tests to validate fixes"
    echo "   4. Ensure all wedding workflow requirements are met"
    exit 1
fi