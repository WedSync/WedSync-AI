#!/bin/bash

# Production Readiness Check for WS-158 Task Categories Feature
# Team E - Batch 16 - Round 3 Final Validation

set -e

echo "🚀 Starting Production Readiness Check for WS-158 Task Categories"
echo "=================================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Function to log results
log_check() {
    local status=$1
    local message=$2
    local details=$3
    
    if [ "$status" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC}: $message"
        ((PASSED++))
    elif [ "$status" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC}: $message"
        if [ ! -z "$details" ]; then
            echo -e "${RED}   Details: $details${NC}"
        fi
        ((FAILED++))
    elif [ "$status" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC}: $message"
        if [ ! -z "$details" ]; then
            echo -e "${YELLOW}   Details: $details${NC}"
        fi
        ((WARNINGS++))
    fi
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_check "FAIL" "Not in project root directory" "Run from wedsync/ directory"
    exit 1
fi

echo -e "\n${BLUE}1. Environment Configuration${NC}"
echo "================================"

# Check environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    log_check "FAIL" "NEXT_PUBLIC_SUPABASE_URL not set"
else
    log_check "PASS" "Supabase URL configured"
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
    log_check "FAIL" "NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
else
    log_check "PASS" "Supabase anon key configured"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    log_check "WARN" "SUPABASE_SERVICE_ROLE_KEY not set" "May be needed for migrations"
else
    log_check "PASS" "Supabase service role key configured"
fi

# Check for production environment
if [ "$NODE_ENV" = "production" ]; then
    log_check "PASS" "NODE_ENV set to production"
else
    log_check "WARN" "NODE_ENV not set to production" "Current: $NODE_ENV"
fi

echo -e "\n${BLUE}2. Dependencies & Build${NC}"
echo "============================="

# Check if node_modules exists
if [ -d "node_modules" ]; then
    log_check "PASS" "Dependencies installed"
else
    log_check "FAIL" "Dependencies not installed" "Run: npm install"
fi

# Check for critical dependencies
if npm list react@19 > /dev/null 2>&1; then
    log_check "PASS" "React 19 installed"
else
    log_check "FAIL" "React 19 not found"
fi

if npm list next@15 > /dev/null 2>&1; then
    log_check "PASS" "Next.js 15 installed"
else
    log_check "FAIL" "Next.js 15 not found"
fi

if npm list @supabase/supabase-js > /dev/null 2>&1; then
    log_check "PASS" "Supabase JS client installed"
else
    log_check "FAIL" "Supabase JS client not found"
fi

# Check TypeScript configuration
if [ -f "tsconfig.json" ]; then
    log_check "PASS" "TypeScript configuration found"
    
    # Validate TypeScript config
    if npx tsc --noEmit --skipLibCheck > /dev/null 2>&1; then
        log_check "PASS" "TypeScript compilation check passed"
    else
        log_check "FAIL" "TypeScript compilation errors found"
    fi
else
    log_check "FAIL" "TypeScript configuration not found"
fi

# Build check
echo -e "\n${BLUE}3. Build Process${NC}"
echo "==================="

if npm run build > build.log 2>&1; then
    log_check "PASS" "Production build successful"
    rm -f build.log
else
    log_check "FAIL" "Production build failed" "Check build.log for details"
fi

# Check for build artifacts
if [ -d ".next" ]; then
    log_check "PASS" "Build artifacts generated"
    
    # Check build size
    BUILD_SIZE=$(du -sh .next | cut -f1)
    log_check "PASS" "Build size: $BUILD_SIZE"
    
    # Check for static assets
    if [ -d ".next/static" ]; then
        log_check "PASS" "Static assets generated"
    else
        log_check "WARN" "Static assets not found"
    fi
else
    log_check "FAIL" "Build artifacts not found"
fi

echo -e "\n${BLUE}4. Database Schema & Migrations${NC}"
echo "===================================="

# Check for migration files
MIGRATION_COUNT=$(find supabase/migrations -name "*.sql" 2>/dev/null | wc -l)
if [ "$MIGRATION_COUNT" -gt 0 ]; then
    log_check "PASS" "Migration files found ($MIGRATION_COUNT files)"
else
    log_check "WARN" "No migration files found"
fi

# Check for task categorization tables
if command -v psql >/dev/null 2>&1 && [ ! -z "$DATABASE_URL" ]; then
    if psql "$DATABASE_URL" -c "SELECT 1 FROM tasks LIMIT 1;" > /dev/null 2>&1; then
        log_check "PASS" "Tasks table accessible"
    else
        log_check "FAIL" "Tasks table not accessible"
    fi
    
    if psql "$DATABASE_URL" -c "SELECT 1 FROM task_categories LIMIT 1;" > /dev/null 2>&1; then
        log_check "PASS" "Task categories table accessible"
    else
        log_check "WARN" "Task categories table not found" "May be using enum instead"
    fi
else
    log_check "WARN" "Cannot connect to database" "Database connection not available"
fi

echo -e "\n${BLUE}5. Testing Coverage${NC}"
echo "===================="

# Check for test files
E2E_TESTS=$(find tests/e2e -name "*.spec.ts" 2>/dev/null | wc -l)
INTEGRATION_TESTS=$(find tests/integration -name "*.spec.ts" 2>/dev/null | wc -l)
SECURITY_TESTS=$(find tests/security -name "*.spec.ts" 2>/dev/null | wc -l)
PRODUCTION_TESTS=$(find tests/production -name "*.spec.ts" 2>/dev/null | wc -l)

if [ "$E2E_TESTS" -gt 0 ]; then
    log_check "PASS" "E2E tests found ($E2E_TESTS files)"
else
    log_check "FAIL" "No E2E tests found"
fi

if [ "$INTEGRATION_TESTS" -gt 0 ]; then
    log_check "PASS" "Integration tests found ($INTEGRATION_TESTS files)"
else
    log_check "FAIL" "No integration tests found"
fi

if [ "$SECURITY_TESTS" -gt 0 ]; then
    log_check "PASS" "Security tests found ($SECURITY_TESTS files)"
else
    log_check "FAIL" "No security tests found"
fi

if [ "$PRODUCTION_TESTS" -gt 0 ]; then
    log_check "PASS" "Production tests found ($PRODUCTION_TESTS files)"
else
    log_check "WARN" "No production tests found"
fi

# Run tests if available
if command -v npx >/dev/null 2>&1; then
    if [ -f "playwright.config.ts" ]; then
        echo -e "\n${BLUE}Running Critical Path Tests...${NC}"
        
        # Run a subset of critical tests
        if npx playwright test tests/e2e/complete-categorization/task-categorization.spec.ts --grep "should create task with wedding phase category" --reporter=line > test.log 2>&1; then
            log_check "PASS" "Critical path test passed"
        else
            log_check "FAIL" "Critical path test failed" "Check test.log"
        fi
        rm -f test.log
    else
        log_check "WARN" "Playwright configuration not found"
    fi
else
    log_check "WARN" "Cannot run tests" "npx not available"
fi

echo -e "\n${BLUE}6. Security Configuration${NC}"
echo "=========================="

# Check for security headers in next.config.js
if grep -q "Content-Security-Policy" next.config.ts 2>/dev/null; then
    log_check "PASS" "CSP headers configured"
else
    log_check "WARN" "CSP headers not configured"
fi

if grep -q "X-Frame-Options" next.config.ts 2>/dev/null; then
    log_check "PASS" "Frame options configured"
else
    log_check "WARN" "X-Frame-Options not configured"
fi

# Check for environment-specific configurations
if [ -f ".env.production" ]; then
    log_check "PASS" "Production environment file found"
else
    log_check "WARN" "Production environment file not found"
fi

# Check for sensitive data in environment
if grep -r "password\|secret\|key" .env* 2>/dev/null | grep -v "PUBLIC" | head -1 >/dev/null; then
    log_check "WARN" "Potential sensitive data in environment files"
else
    log_check "PASS" "No obvious sensitive data in environment files"
fi

echo -e "\n${BLUE}7. Performance Optimization${NC}"
echo "============================"

# Check for bundle analysis
if [ -f "bundle-analyzer.json" ] || npm list webpack-bundle-analyzer > /dev/null 2>&1; then
    log_check "PASS" "Bundle analyzer available"
else
    log_check "WARN" "Bundle analyzer not configured"
fi

# Check for image optimization
if grep -q "next/image" src/**/*.tsx 2>/dev/null; then
    log_check "PASS" "Next.js Image optimization used"
else
    log_check "WARN" "Next.js Image optimization not detected"
fi

# Check for code splitting
if find .next -name "*.js" | grep -q "chunk"; then
    log_check "PASS" "Code splitting detected"
else
    log_check "WARN" "Code splitting not detected"
fi

echo -e "\n${BLUE}8. Monitoring & Logging${NC}"
echo "========================"

# Check for error tracking
if npm list @sentry/nextjs > /dev/null 2>&1; then
    log_check "PASS" "Sentry error tracking installed"
else
    log_check "WARN" "Error tracking not configured"
fi

# Check for analytics
if grep -r "analytics\|tracking" src/ 2>/dev/null | head -1 >/dev/null; then
    log_check "PASS" "Analytics implementation detected"
else
    log_check "WARN" "Analytics not detected"
fi

echo -e "\n${BLUE}9. PWA Configuration${NC}"
echo "===================="

# Check for service worker
if [ -f "public/sw.js" ] || [ -f "src/sw.ts" ]; then
    log_check "PASS" "Service worker found"
else
    log_check "WARN" "Service worker not found"
fi

# Check for manifest
if [ -f "public/manifest.json" ]; then
    log_check "PASS" "PWA manifest found"
    
    # Validate manifest structure
    if jq -e '.name and .short_name and .icons' public/manifest.json > /dev/null 2>&1; then
        log_check "PASS" "PWA manifest valid"
    else
        log_check "WARN" "PWA manifest incomplete"
    fi
else
    log_check "WARN" "PWA manifest not found"
fi

echo -e "\n${BLUE}10. Deployment Configuration${NC}"
echo "=============================="

# Check for deployment files
if [ -f "vercel.json" ] || [ -f ".vercelignore" ]; then
    log_check "PASS" "Vercel deployment configuration found"
elif [ -f "Dockerfile" ]; then
    log_check "PASS" "Docker deployment configuration found"
elif [ -f ".github/workflows/deploy.yml" ]; then
    log_check "PASS" "GitHub Actions deployment found"
else
    log_check "WARN" "No deployment configuration detected"
fi

# Check for proper gitignore
if grep -q ".env.local" .gitignore 2>/dev/null; then
    log_check "PASS" "Environment files excluded from git"
else
    log_check "FAIL" "Environment files not excluded from git"
fi

if grep -q "node_modules" .gitignore 2>/dev/null; then
    log_check "PASS" "Node modules excluded from git"
else
    log_check "FAIL" "Node modules not excluded from git"
fi

echo -e "\n${BLUE}11. Feature-Specific Checks${NC}"
echo "==========================="

# Check for task categorization components
if find src/components -name "*category*" -o -name "*task*" | head -1 >/dev/null 2>&1; then
    log_check "PASS" "Task categorization components found"
else
    log_check "FAIL" "Task categorization components not found"
fi

# Check for API routes
if find src/app/api -name "*task*" -o -name "*category*" | head -1 >/dev/null 2>&1; then
    log_check "PASS" "Task/category API routes found"
else
    log_check "FAIL" "Task/category API routes not found"
fi

# Check for category constants
if grep -r "setup\|ceremony\|reception\|breakdown" src/ 2>/dev/null | grep -i category | head -1 >/dev/null; then
    log_check "PASS" "Wedding phase categories defined"
else
    log_check "WARN" "Wedding phase categories not clearly defined"
fi

echo -e "\n${BLUE}Final Results${NC}"
echo "============="

TOTAL=$((PASSED + FAILED + WARNINGS))

echo -e "Total Checks: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo -e "${YELLOW}Warnings: $WARNINGS${NC}"

# Calculate percentage
if [ $TOTAL -gt 0 ]; then
    PASS_PERCENTAGE=$(( (PASSED * 100) / TOTAL ))
    echo -e "Pass Rate: ${GREEN}$PASS_PERCENTAGE%${NC}"
    
    # Determine deployment readiness
    if [ $FAILED -eq 0 ] && [ $PASS_PERCENTAGE -ge 85 ]; then
        echo -e "\n${GREEN}🎉 DEPLOYMENT READY${NC}"
        echo -e "All critical checks passed. Ready for production deployment."
        exit 0
    elif [ $FAILED -eq 0 ] && [ $PASS_PERCENTAGE -ge 70 ]; then
        echo -e "\n${YELLOW}🚧 CONDITIONALLY READY${NC}"
        echo -e "No critical failures, but some warnings need attention."
        exit 1
    else
        echo -e "\n${RED}🚫 NOT READY${NC}"
        echo -e "Critical failures detected. Address issues before deployment."
        exit 2
    fi
else
    echo -e "\n${RED}🚫 NO CHECKS RUN${NC}"
    exit 3
fi