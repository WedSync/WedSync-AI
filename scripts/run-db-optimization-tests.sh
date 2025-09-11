#!/bin/bash

# =====================================================
# DATABASE OPTIMIZATION TESTING SCRIPT
# =====================================================
# Team D - Round 1: Database Indexes Optimization
# Automated testing script for database optimization validation
# Created: 2025-01-21
# =====================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="$PROJECT_DIR/database-optimization-test-results.log"
TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}DATABASE OPTIMIZATION TEST SUITE${NC}"
echo -e "${BLUE}======================================${NC}"
echo "Started at: $(date)"
echo "Project: WedSync Database Optimization"
echo "Test Suite: Team D - Round 1"
echo ""

# Function to log with timestamp
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Pre-flight checks
echo -e "${YELLOW}🔍 Running pre-flight checks...${NC}"

# Check if we're in the right directory
if [[ ! -f "$PROJECT_DIR/package.json" ]]; then
    echo -e "${RED}❌ Error: Not in WedSync project directory${NC}"
    exit 1
fi

# Check required tools
if ! command_exists node; then
    echo -e "${RED}❌ Error: Node.js not installed${NC}"
    exit 1
fi

if ! command_exists npm; then
    echo -e "${RED}❌ Error: npm not installed${NC}"
    exit 1
fi

# Check if tsx is available
if ! command_exists npx || ! npx tsx --version >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  tsx not found, installing...${NC}"
    npm install -g tsx
fi

# Check environment variables
if [[ -z "$NEXT_PUBLIC_SUPABASE_URL" ]]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SUPABASE_URL not set, using default local${NC}"
    export NEXT_PUBLIC_SUPABASE_URL="http://localhost:54321"
fi

if [[ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]]; then
    echo -e "${YELLOW}⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not set${NC}"
fi

if [[ -z "$SUPABASE_SERVICE_ROLE_KEY" ]]; then
    echo -e "${YELLOW}⚠️  SUPABASE_SERVICE_ROLE_KEY not set${NC}"
fi

echo -e "${GREEN}✅ Pre-flight checks completed${NC}"
echo ""

# Function to run database tests
run_database_tests() {
    echo -e "${BLUE}🗄️  Running Database Optimization Tests...${NC}"
    log "Starting database optimization tests"
    
    cd "$PROJECT_DIR"
    
    # Run the TypeScript test suite
    if npx tsx scripts/test-database-optimization.ts; then
        echo -e "${GREEN}✅ Database optimization tests completed successfully${NC}"
        log "Database optimization tests completed successfully"
        return 0
    else
        echo -e "${RED}❌ Database optimization tests failed${NC}"
        log "Database optimization tests failed"
        return 1
    fi
}

# Function to run migration validation
validate_migrations() {
    echo -e "${BLUE}📋 Validating Database Migrations...${NC}"
    log "Validating database migrations"
    
    # Check if migration files exist
    local migration_files=(
        "supabase/migrations/016_advanced_journey_index_optimization.sql"
        "supabase/migrations/017_index_monitoring_system.sql"
        "supabase/migrations/018_query_performance_validation.sql"
    )
    
    for file in "${migration_files[@]}"; do
        if [[ -f "$PROJECT_DIR/$file" ]]; then
            echo -e "${GREEN}✅ Found: $file${NC}"
            log "Migration file found: $file"
        else
            echo -e "${RED}❌ Missing: $file${NC}"
            log "Migration file missing: $file"
            return 1
        fi
    done
    
    echo -e "${GREEN}✅ All migration files validated${NC}"
    return 0
}

# Function to check database connectivity
check_database_connectivity() {
    echo -e "${BLUE}🔗 Checking Database Connectivity...${NC}"
    log "Checking database connectivity"
    
    # Simple connectivity test using curl
    if curl -f -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" > /dev/null; then
        echo -e "${GREEN}✅ Database connection successful${NC}"
        log "Database connection successful"
        return 0
    else
        echo -e "${RED}❌ Database connection failed${NC}"
        log "Database connection failed"
        return 1
    fi
}

# Function to generate test report
generate_test_report() {
    local exit_code=$1
    
    echo ""
    echo -e "${BLUE}======================================${NC}"
    echo -e "${BLUE}DATABASE OPTIMIZATION TEST REPORT${NC}"
    echo -e "${BLUE}======================================${NC}"
    
    echo "Test Suite: Team D - Database Indexes Optimization"
    echo "Timestamp: $TIMESTAMP"
    echo "Project Directory: $PROJECT_DIR"
    echo "Log File: $LOG_FILE"
    echo ""
    
    if [[ $exit_code -eq 0 ]]; then
        echo -e "${GREEN}🎉 OVERALL STATUS: PASSED${NC}"
        echo "All database optimization tests completed successfully!"
        echo ""
        echo -e "${GREEN}✅ Migration validation: PASSED${NC}"
        echo -e "${GREEN}✅ Database connectivity: PASSED${NC}"
        echo -e "${GREEN}✅ Optimization tests: PASSED${NC}"
    else
        echo -e "${RED}❌ OVERALL STATUS: FAILED${NC}"
        echo "Some database optimization tests failed!"
        echo ""
        echo "Please check the log file for detailed error information:"
        echo "$LOG_FILE"
    fi
    
    echo ""
    echo "Test completed at: $(date)"
    echo ""
    echo "Next Steps:"
    if [[ $exit_code -eq 0 ]]; then
        echo "1. Review performance improvements in Supabase dashboard"
        echo "2. Monitor query performance using the new monitoring system"
        echo "3. Run periodic performance tests to maintain optimization"
        echo "4. Deploy optimizations to production environment"
    else
        echo "1. Review error logs and fix failing tests"
        echo "2. Verify database migration status"
        echo "3. Check database connectivity and permissions"
        echo "4. Re-run tests after fixing issues"
    fi
    
    echo ""
    echo -e "${BLUE}======================================${NC}"
}

# Main execution flow
main() {
    local overall_result=0
    
    # Initialize log file
    echo "Database Optimization Test Suite - Started at $(date)" > "$LOG_FILE"
    
    # Step 1: Validate migrations
    if ! validate_migrations; then
        overall_result=1
    fi
    
    # Step 2: Check database connectivity
    if ! check_database_connectivity; then
        overall_result=1
    fi
    
    # Step 3: Run database optimization tests
    if ! run_database_tests; then
        overall_result=1
    fi
    
    # Generate final report
    generate_test_report $overall_result
    
    # Save final status to log
    if [[ $overall_result -eq 0 ]]; then
        log "Test suite completed successfully"
    else
        log "Test suite completed with failures"
    fi
    
    exit $overall_result
}

# Handle script interruption
trap 'echo -e "${RED}❌ Test suite interrupted${NC}"; exit 1' INT TERM

# Run main function
main "$@"