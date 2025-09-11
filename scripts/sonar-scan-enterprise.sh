#!/bin/bash
# Enterprise SonarQube Scan for WedSync (2.2M+ LOC)
# Optimized for large-scale wedding platform analysis

set -e

echo "🏢 Starting Enterprise SonarQube Scan for WedSync..."
echo "📊 Platform: Wedding Platform (2.2M+ LOC)"
echo "🕒 Started: $(date)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${BLUE}🔍 Checking prerequisites...${NC}"

# Check if sonar-scanner is installed
if ! command -v sonar-scanner &> /dev/null; then
    echo -e "${RED}❌ sonar-scanner not found${NC}"
    echo "Install with: npm install -g sonarqube-scanner"
    echo "Or download from: https://docs.sonarqube.org/latest/analysis/scan/sonarscanner/"
    exit 1
fi

# Check if .env.local exists and has SONAR_TOKEN
if [[ ! -f .env.local ]]; then
    echo -e "${RED}❌ .env.local not found${NC}"
    exit 1
fi

# Load environment variables
source .env.local

if [[ -z "$SONAR_TOKEN" ]] || [[ "$SONAR_TOKEN" == "paste_your_sonarqube_token_here" ]]; then
    echo -e "${RED}❌ SONAR_TOKEN not configured in .env.local${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Display configuration
echo -e "\n${BLUE}📋 Enterprise Configuration:${NC}"
echo "Project Key: WedSync_WedSync2"
echo "Organization: wedsync"
echo "Sources: src,wedsync/src,wedsync/wedsync/src,scripts,middleware.ts,WORKFLOW-V2-DRAFT"
echo "Expected LOC: 2.2M+"

# Validate source directories exist
echo -e "\n${BLUE}🔍 Validating source directories...${NC}"
MISSING_DIRS=()

if [[ ! -d "src" ]]; then MISSING_DIRS+=("src"); fi
if [[ ! -d "wedsync/src" ]]; then MISSING_DIRS+=("wedsync/src"); fi
if [[ ! -d "wedsync/wedsync/src" ]]; then MISSING_DIRS+=("wedsync/wedsync/src"); fi
if [[ ! -d "scripts" ]]; then MISSING_DIRS+=("scripts"); fi
if [[ ! -f "middleware.ts" ]]; then MISSING_DIRS+=("middleware.ts"); fi

if [[ ${#MISSING_DIRS[@]} -gt 0 ]]; then
    echo -e "${YELLOW}⚠️  Some configured sources not found: ${MISSING_DIRS[*]}${NC}"
    echo "Continuing with available sources..."
fi

# Show actual LOC count
echo -e "\n${BLUE}📊 Counting lines of code...${NC}"
ACTUAL_LOC=$(find ./src ./wedsync/src ./wedsync/wedsync/src -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -exec wc -l {} + 2>/dev/null | tail -1 | awk '{print $1}' || echo "0")
echo "Actual LOC to scan: $(printf "%'d" $ACTUAL_LOC)"

if [[ $ACTUAL_LOC -lt 1000000 ]]; then
    echo -e "${YELLOW}⚠️  LOC count lower than expected 2.2M+ - check source directories${NC}"
fi

# Pre-scan cleanup
echo -e "\n${BLUE}🧹 Pre-scan cleanup...${NC}"
rm -rf .scannerwork/
rm -f sonarqube-*.json sonarqube-*.html

# Memory optimization for large codebase
echo -e "\n${BLUE}⚙️  Configuring memory for large codebase...${NC}"
export SONAR_SCANNER_OPTS="-Xmx4G -Xms1G"

# Run the enterprise scan
echo -e "\n${GREEN}🚀 Starting Enterprise SonarQube Scan...${NC}"
echo "This may take 15-30 minutes for 2.2M+ LOC..."

# Create scan log directory
mkdir -p logs
LOG_FILE="logs/sonar-scan-$(date +%Y%m%d-%H%M%S).log"

# Run sonar-scanner with enterprise configuration
sonar-scanner \
    -Dsonar.projectKey=WedSync_WedSync2 \
    -Dsonar.organization=wedsync \
    -Dsonar.host.url=https://sonarcloud.io \
    -Dsonar.login=$SONAR_TOKEN \
    -Dsonar.verbose=false \
    -Dsonar.log.level=INFO \
    2>&1 | tee "$LOG_FILE"

SCAN_EXIT_CODE=${PIPESTATUS[0]}

if [[ $SCAN_EXIT_CODE -eq 0 ]]; then
    echo -e "\n${GREEN}🎉 Enterprise scan completed successfully!${NC}"
    echo -e "📊 Log saved: ${LOG_FILE}"
    
    # Wait for processing
    echo -e "\n${BLUE}⏳ Waiting for SonarCloud processing (30 seconds)...${NC}"
    sleep 30
    
    # Run enterprise analysis
    echo -e "\n${BLUE}🔍 Running enterprise analysis...${NC}"
    if [[ -f "scripts/sonarqube-enterprise-analyzer.js" ]]; then
        node scripts/sonarqube-enterprise-analyzer.js
    else
        echo -e "${YELLOW}⚠️  Enterprise analyzer not found, using basic analyzer${NC}"
        node scripts/sonarqube-analyzer.js
    fi
    
    echo -e "\n${GREEN}✅ Complete enterprise analysis finished!${NC}"
    echo -e "${GREEN}📊 Your 2.2M+ LOC wedding platform has been analyzed${NC}"
    
    # Success summary
    echo -e "\n${BLUE}📋 SCAN SUMMARY:${NC}"
    echo "🕒 Completed: $(date)"
    echo "📁 Log File: $LOG_FILE"
    echo "🔗 View Results: https://sonarcloud.io/project/overview?id=WedSync_WedSync2"
    echo "📊 Analysis Reports Generated"
    
else
    echo -e "\n${RED}❌ Enterprise scan failed with exit code: $SCAN_EXIT_CODE${NC}"
    echo -e "📁 Check log file: ${LOG_FILE}"
    echo -e "🔧 Common issues:"
    echo "  - Network connectivity to SonarCloud"
    echo "  - Invalid SONAR_TOKEN"
    echo "  - Memory issues (increase SONAR_SCANNER_OPTS)"
    echo "  - File permission issues"
    exit $SCAN_EXIT_CODE
fi

echo -e "\n${BLUE}💡 Next Steps:${NC}"
echo "1. Review quality gate status in SonarCloud"
echo "2. Address critical issues (security vulnerabilities)"
echo "3. Focus on wedding-critical code paths first"
echo "4. Set up automated scans in CI/CD pipeline"
echo ""
echo -e "${GREEN}🎂 Remember: Wedding day reliability is paramount!${NC}"