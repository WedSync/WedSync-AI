#!/bin/bash

# WedSync Comprehensive Diagnostics Script
# This script identifies common issues that cause WedSync to fail

set -e

echo "🏥 WedSync Diagnostic Report - $(date)"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    case $2 in
        "ERROR")
            echo -e "${RED}❌ $1${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}⚠️  $1${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}✅ $1${NC}"
            ;;
        "INFO")
            echo -e "${BLUE}ℹ️  $1${NC}"
            ;;
        *)
            echo "$1"
            ;;
    esac
}

# Check system resources
check_system_resources() {
    echo -e "\n${BLUE}📊 System Resources Check${NC}"
    echo "----------------------------------------"
    
    # Available memory
    if command -v free >/dev/null 2>&1; then
        MEMORY_GB=$(free -g | awk 'NR==2{printf "%.1f", $2}')
        if (( $(echo "$MEMORY_GB < 4" | bc -l) )); then
            print_status "Low system memory: ${MEMORY_GB}GB (recommend 8GB+)" "WARNING"
        else
            print_status "System memory: ${MEMORY_GB}GB" "SUCCESS"
        fi
    fi
    
    # Docker memory
    if command -v docker >/dev/null 2>&1; then
        DOCKER_MEM=$(docker info 2>/dev/null | grep "Total Memory" | awk '{print $3 $4}' || echo "Unknown")
        print_status "Docker memory available: $DOCKER_MEM" "INFO"
    fi
    
    # Disk space
    DISK_USAGE=$(df -h . | awk 'NR==2{print $5}')
    DISK_USAGE_PERCENT=$(echo $DISK_USAGE | sed 's/%//')
    if [ "$DISK_USAGE_PERCENT" -gt 85 ]; then
        print_status "High disk usage: $DISK_USAGE" "WARNING"
    else
        print_status "Disk usage: $DISK_USAGE" "SUCCESS"
    fi
}

# Check Docker setup
check_docker() {
    echo -e "\n${BLUE}🐳 Docker Environment Check${NC}"
    echo "----------------------------------------"
    
    if ! command -v docker >/dev/null 2>&1; then
        print_status "Docker not installed" "ERROR"
        return 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        print_status "Docker daemon not running" "ERROR"
        return 1
    fi
    
    print_status "Docker is running" "SUCCESS"
    
    # Check running containers
    RUNNING_CONTAINERS=$(docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v NAMES)
    if [ -z "$RUNNING_CONTAINERS" ]; then
        print_status "No containers running" "WARNING"
    else
        echo -e "${GREEN}Running containers:${NC}"
        echo "$RUNNING_CONTAINERS"
    fi
}

# Check dependency conflicts
check_dependencies() {
    echo -e "\n${BLUE}📦 Dependency Analysis${NC}"
    echo "----------------------------------------"
    
    if [ ! -f "package.json" ]; then
        print_status "package.json not found" "ERROR"
        return 1
    fi
    
    # Check for common problematic packages
    PROBLEMATIC_DEPS=(
        "eslint@0.6.2"
        "@vitest/coverage-v8@0.34.6"
        "vitest@0.12.6"
    )
    
    for dep in "${PROBLEMATIC_DEPS[@]}"; do
        if grep -q "$dep" package.json; then
            print_status "Found problematic dependency: $dep" "WARNING"
        fi
    done
    
    # Check node_modules size
    if [ -d "node_modules" ]; then
        NODE_MODULES_SIZE=$(du -sh node_modules 2>/dev/null | cut -f1)
        print_status "node_modules size: $NODE_MODULES_SIZE" "INFO"
        
        # Check for excessive size
        NODE_MODULES_MB=$(du -sm node_modules 2>/dev/null | cut -f1)
        if [ "$NODE_MODULES_MB" -gt 2000 ]; then
            print_status "Large node_modules directory (>2GB)" "WARNING"
        fi
    else
        print_status "node_modules directory missing - run npm install" "ERROR"
    fi
    
    # Check for package-lock.json
    if [ ! -f "package-lock.json" ]; then
        print_status "package-lock.json missing - inconsistent installs likely" "WARNING"
    else
        print_status "package-lock.json present" "SUCCESS"
    fi
}

# Check configuration files
check_configuration() {
    echo -e "\n${BLUE}⚙️  Configuration Check${NC}"
    echo "----------------------------------------"
    
    # Next.js config
    if [ -f "next.config.js" ]; then
        print_status "next.config.js found" "SUCCESS"
        # Check for common issues
        if grep -q "experimental" next.config.js; then
            print_status "Experimental features detected in next.config.js" "WARNING"
        fi
    else
        print_status "next.config.js missing" "WARNING"
    fi
    
    # Environment variables
    if [ -f ".env.local" ]; then
        print_status ".env.local found" "SUCCESS"
        ENV_COUNT=$(wc -l < .env.local)
        print_status "Environment variables: $ENV_COUNT" "INFO"
    else
        print_status ".env.local missing - may cause runtime errors" "WARNING"
    fi
    
    # TypeScript config
    if [ -f "tsconfig.json" ]; then
        print_status "tsconfig.json found" "SUCCESS"
    else
        print_status "tsconfig.json missing" "ERROR"
    fi
    
    # Docker configs
    DOCKER_CONFIGS=(
        "Dockerfile"
        "Dockerfile.fixed" 
        "docker-compose.yml"
        "docker-compose.simple.yml"
        "docker-compose.monitor.yml"
    )
    
    for config in "${DOCKER_CONFIGS[@]}"; do
        if [ -f "$config" ]; then
            print_status "$config found" "SUCCESS"
        fi
    done
}

# Check for common error patterns
check_error_patterns() {
    echo -e "\n${BLUE}🚨 Error Pattern Analysis${NC}"
    echo "----------------------------------------"
    
    # Check recent Docker logs if container exists
    if docker ps -a | grep -q "wedsync"; then
        CONTAINER_NAME=$(docker ps -a --format "{{.Names}}" | grep wedsync | head -1)
        echo -e "${GREEN}Recent errors from $CONTAINER_NAME:${NC}"
        docker logs "$CONTAINER_NAME" --tail 20 2>&1 | grep -E "(ERROR|Error|error|FAILED|Failed|failed)" | head -5 || echo "No recent errors found"
    fi
    
    # Check for common file issues
    PROBLEMATIC_FILES=(
        "._.env.local"
        "._Dockerfile"
        "._package.json"
    )
    
    for file in "${PROBLEMATIC_FILES[@]}"; do
        if [ -f "$file" ]; then
            print_status "Found problematic macOS metadata file: $file" "WARNING"
            echo "  → Run: rm -f $file"
        fi
    done
}

# Performance analysis
check_performance() {
    echo -e "\n${BLUE}⚡ Performance Analysis${NC}"
    echo "----------------------------------------"
    
    # Check for memory-intensive operations
    if grep -q "max-old-space-size=32768" package.json; then
        print_status "Detected 32GB memory allocation - indicates memory issues" "ERROR"
        print_status "Consider reducing build complexity or increasing Docker memory" "WARNING"
    fi
    
    # Check build scripts complexity
    SCRIPT_COUNT=$(grep -c '".*":' package.json | head -1)
    if [ "$SCRIPT_COUNT" -gt 100 ]; then
        print_status "High script count ($SCRIPT_COUNT) - may indicate over-complexity" "WARNING"
    fi
    
    # Check dependency count
    if command -v jq >/dev/null 2>&1; then
        DEP_COUNT=$(jq -r '.dependencies | length' package.json 2>/dev/null || echo "unknown")
        DEV_DEP_COUNT=$(jq -r '.devDependencies | length' package.json 2>/dev/null || echo "unknown")
        print_status "Dependencies: $DEP_COUNT, Dev Dependencies: $DEV_DEP_COUNT" "INFO"
        
        TOTAL_DEPS=$((DEP_COUNT + DEV_DEP_COUNT))
        if [ "$TOTAL_DEPS" -gt 300 ]; then
            print_status "Very high dependency count ($TOTAL_DEPS) - consider dependency reduction" "WARNING"
        fi
    fi
}

# Generate recommendations
generate_recommendations() {
    echo -e "\n${BLUE}💡 Recommendations${NC}"
    echo "----------------------------------------"
    
    echo "1. To start with monitoring:"
    echo "   docker-compose -f docker-compose.monitor.yml up -d"
    echo ""
    echo "2. To view monitoring dashboard:"
    echo "   open http://localhost:8080"
    echo ""
    echo "3. For immediate stability:"
    echo "   - Use docker-compose.simple.yml for basic functionality"
    echo "   - Monitor memory usage with: docker stats"
    echo "   - Check logs with: docker logs <container-name>"
    echo ""
    echo "4. Dependency management:"
    echo "   - Run: npm audit --audit-level moderate"
    echo "   - Consider: npm update (carefully)"
    echo "   - Clean install: rm -rf node_modules && npm install --legacy-peer-deps"
    echo ""
    echo "5. For persistent issues:"
    echo "   - Clear Docker cache: docker system prune -a"
    echo "   - Restart Docker daemon"
    echo "   - Check Docker resource limits in Docker Desktop"
}

# Main execution
main() {
    check_system_resources
    check_docker
    check_dependencies
    check_configuration
    check_error_patterns
    check_performance
    generate_recommendations
    
    echo -e "\n${GREEN}🏁 Diagnostic Complete - $(date)${NC}"
    echo "Report saved to: wedsync-diagnostic-$(date +%Y%m%d-%H%M%S).log"
}

# Run diagnostics and save to log file
main | tee "wedsync-diagnostic-$(date +%Y%m%d-%H%M%S).log"