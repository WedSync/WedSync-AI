#!/bin/bash

# 🚨 CRITICAL SECURITY SCANNER: Hardcoded API Key Detection
# 
# This script scans the WedSync codebase for hardcoded API keys and secrets
# that could be exposed in production builds or CI/CD pipelines.
#
# USAGE: ./scripts/security-scan-hardcoded-keys.sh
# 
# EXIT CODES:
#   0 = No hardcoded keys found (PASS)
#   1 = Hardcoded keys detected (FAIL)
#   2 = Scanner error

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SCAN_RESULTS_DIR="${PROJECT_ROOT}/security-scan-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="${SCAN_RESULTS_DIR}/hardcoded-keys-scan-${TIMESTAMP}.json"

# Create scan results directory
mkdir -p "$SCAN_RESULTS_DIR"

# Initialize counters
TOTAL_VIOLATIONS=0
CRITICAL_VIOLATIONS=0
HIGH_VIOLATIONS=0
MEDIUM_VIOLATIONS=0

echo -e "${PURPLE}🔒 WedSync Security Scanner - Hardcoded API Key Detection${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo -e "Project: WedSync Wedding Management Platform"
echo -e "Scan Time: $(date)"
echo -e "Scanner Version: 1.0.0"
echo -e ""

# Initialize JSON report
cat > "$REPORT_FILE" << EOF
{
  "scan_metadata": {
    "timestamp": "$(date -Iseconds)",
    "scanner_version": "1.0.0",
    "project": "WedSync",
    "scan_type": "hardcoded_api_keys"
  },
  "summary": {
    "total_violations": 0,
    "critical_violations": 0,
    "high_violations": 0,
    "medium_violations": 0,
    "files_scanned": 0
  },
  "violations": []
}
EOF

# Function to add violation to report
add_violation() {
  local file="$1"
  local line_number="$2"
  local content="$3"
  local severity="$4"
  local key_type="$5"
  local description="$6"
  
  # Escape JSON special characters
  content_escaped=$(echo "$content" | sed 's/\\/\\\\/g; s/"/\\"/g')
  description_escaped=$(echo "$description" | sed 's/\\/\\\\/g; s/"/\\"/g')
  
  # Create temp file for JSON manipulation
  temp_file=$(mktemp)
  
  # Add violation to JSON
  jq --arg file "$file" \
     --arg line "$line_number" \
     --arg content "$content_escaped" \
     --arg severity "$severity" \
     --arg key_type "$key_type" \
     --arg description "$description_escaped" \
     '.violations += [{
       "file": $file,
       "line_number": ($line | tonumber),
       "content": $content,
       "severity": $severity,
       "key_type": $key_type,
       "description": $description,
       "scan_timestamp": now | strftime("%Y-%m-%d %H:%M:%S")
     }]' "$REPORT_FILE" > "$temp_file" && mv "$temp_file" "$report_file"
  
  # Update counters
  ((TOTAL_VIOLATIONS++))
  case "$severity" in
    "CRITICAL") ((CRITICAL_VIOLATIONS++)) ;;
    "HIGH") ((HIGH_VIOLATIONS++)) ;;
    "MEDIUM") ((MEDIUM_VIOLATIONS++)) ;;
  esac
}

# Function to scan for hardcoded keys
scan_hardcoded_keys() {
  echo -e "${BLUE}🔍 Scanning for hardcoded API keys and secrets...${NC}"
  
  # Critical patterns that indicate hardcoded secrets
  declare -A CRITICAL_PATTERNS=(
    ["SUPABASE_SERVICE_ROLE_KEY.*=.*['\"][^'\"]*['\"]"]="CRITICAL|Supabase Service Role Key|Admin-level database access - bypass all security"
    ["RESEND_WEBHOOK_SECRET.*=.*['\"][^'\"]*['\"]"]="CRITICAL|Resend Webhook Secret|Webhook spoofing attacks - fake email notifications"
    ["STRIPE_SECRET_KEY.*=.*['\"][^'\"]*['\"]"]="CRITICAL|Stripe Secret Key|Payment processing bypass - financial fraud"
    ["OPENAI_API_KEY.*=.*['\"][^'\"]*['\"]"]="HIGH|OpenAI API Key|AI service abuse - cost exploitation"
    ["TWILIO_AUTH_TOKEN.*=.*['\"][^'\"]*['\"]"]="HIGH|Twilio Auth Token|SMS/Voice service abuse"
    ["SUPABASE_ANON_KEY.*=.*['\"][^'\"]*['\"]"]="HIGH|Supabase Anonymous Key|Database access bypass"
    ["REDIS_URL.*=.*redis://[^'\"]*['\"]"]="MEDIUM|Redis Connection String|Cache manipulation potential"
  )
  
  # Additional patterns for environment variable assignments
  declare -A ENV_PATTERNS=(
    ["process\.env\.[A-Z_]*KEY[A-Z_]*\s*=\s*['\"][^'\"]+['\"]"]="HIGH|Environment API Key|Hardcoded environment variable assignment"
    ["process\.env\.[A-Z_]*SECRET[A-Z_]*\s*=\s*['\"][^'\"]+['\"]"]="CRITICAL|Environment Secret|Hardcoded secret in environment variable"
    ["process\.env\.[A-Z_]*TOKEN[A-Z_]*\s*=\s*['\"][^'\"]+['\"]"]="HIGH|Environment Token|Hardcoded token in environment variable"
  )
  
  local files_scanned=0
  
  # Scan all TypeScript and JavaScript files
  while IFS= read -r -d '' file; do
    ((files_scanned++))
    
    # Skip node_modules and other irrelevant directories
    if [[ "$file" =~ (node_modules|\.next|dist|build|coverage)/ ]]; then
      continue
    fi
    
    # Scan for critical patterns
    for pattern in "${!CRITICAL_PATTERNS[@]}"; do
      IFS="|" read -r severity key_type description <<< "${CRITICAL_PATTERNS[$pattern]}"
      
      while IFS=: read -r line_number content; do
        if [[ -n "$content" ]]; then
          echo -e "${RED}🚨 $severity: $key_type found in $file:$line_number${NC}"
          echo -e "   Content: $(echo "$content" | cut -c1-80)..."
          echo -e "   Impact: $description"
          echo -e ""
          
          add_violation "$file" "$line_number" "$content" "$severity" "$key_type" "$description"
        fi
      done < <(grep -n -E "$pattern" "$file" || true)
    done
    
    # Scan for environment variable patterns
    for pattern in "${!ENV_PATTERNS[@]}"; do
      IFS="|" read -r severity key_type description <<< "${ENV_PATTERNS[$pattern]}"
      
      while IFS=: read -r line_number content; do
        if [[ -n "$content" ]]; then
          echo -e "${YELLOW}⚠️  $severity: $key_type found in $file:$line_number${NC}"
          echo -e "   Content: $(echo "$content" | cut -c1-80)..."
          echo -e "   Impact: $description"
          echo -e ""
          
          add_violation "$file" "$line_number" "$content" "$severity" "$key_type" "$description"
        fi
      done < <(grep -n -E "$pattern" "$file" || true)
    done
    
  done < <(find "$PROJECT_ROOT" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -print0)
  
  # Update summary in JSON report
  temp_file=$(mktemp)
  jq --arg total "$TOTAL_VIOLATIONS" \
     --arg critical "$CRITICAL_VIOLATIONS" \
     --arg high "$HIGH_VIOLATIONS" \
     --arg medium "$MEDIUM_VIOLATIONS" \
     --arg files_scanned "$files_scanned" \
     '.summary.total_violations = ($total | tonumber) |
      .summary.critical_violations = ($critical | tonumber) |
      .summary.high_violations = ($high | tonumber) |
      .summary.medium_violations = ($medium | tonumber) |
      .summary.files_scanned = ($files_scanned | tonumber)' \
     "$REPORT_FILE" > "$temp_file" && mv "$temp_file" "$REPORT_FILE"
  
  echo -e "${BLUE}Files scanned: $files_scanned${NC}"
}

# Function to scan CI/CD files for potential key exposure
scan_cicd_exposure() {
  echo -e "${BLUE}🔍 Scanning CI/CD files for potential key exposure...${NC}"
  
  local cicd_files=(
    ".github/workflows/*.yml"
    ".github/workflows/*.yaml"
    "Dockerfile*"
    "docker-compose*.yml"
    ".env*"
    "vercel.json"
    "netlify.toml"
  )
  
  for pattern in "${cicd_files[@]}"; do
    while IFS= read -r -d '' file; do
      # Look for environment variable usage that might expose secrets
      if grep -qE "(SUPABASE_SERVICE_ROLE_KEY|RESEND_WEBHOOK_SECRET|STRIPE_SECRET_KEY)" "$file" 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Potential key exposure in CI/CD: $file${NC}"
        add_violation "$file" "0" "CI/CD file references sensitive environment variables" "HIGH" "CI/CD Exposure" "Secrets might be logged or exposed in build artifacts"
      fi
    done < <(find "$PROJECT_ROOT" -name "$pattern" -print0 2>/dev/null || true)
  done
}

# Function to generate security report
generate_security_report() {
  echo -e "${PURPLE}📊 Generating Security Report...${NC}"
  echo -e "${BLUE}=====================================${NC}"
  
  echo -e "📁 Report saved to: $REPORT_FILE"
  echo -e ""
  echo -e "🎯 SCAN SUMMARY:"
  echo -e "   Total Violations: $TOTAL_VIOLATIONS"
  echo -e "   🚨 Critical: $CRITICAL_VIOLATIONS"
  echo -e "   ⚠️  High: $HIGH_VIOLATIONS"
  echo -e "   ℹ️  Medium: $MEDIUM_VIOLATIONS"
  echo -e ""
  
  if [[ $CRITICAL_VIOLATIONS -gt 0 ]]; then
    echo -e "${RED}🚨 CRITICAL SECURITY ALERT!${NC}"
    echo -e "${RED}Production deployment MUST BE BLOCKED until all critical violations are resolved!${NC}"
    echo -e ""
    echo -e "Critical violations pose immediate security risks:"
    echo -e "- Database compromise through hardcoded service keys"
    echo -e "- Payment fraud through exposed Stripe keys"  
    echo -e "- Webhook spoofing attacks"
    echo -e "- Complete authentication bypass"
    echo -e ""
  fi
  
  if [[ $TOTAL_VIOLATIONS -gt 0 ]]; then
    echo -e "${YELLOW}📋 REMEDIATION REQUIRED:${NC}"
    echo -e ""
    echo -e "1. Replace all hardcoded keys with secure test environment manager:"
    echo -e "   import { setupSecureTestEnvironment } from '@/__tests__/utils/secure-test-env'"
    echo -e ""
    echo -e "2. Add security validation to CI/CD pipeline:"
    echo -e "   - Run this scanner before any deployment"
    echo -e "   - Block builds with critical violations"
    echo -e "   - Implement secret scanning in GitHub Actions"
    echo -e ""
    echo -e "3. Use dynamic key generation for all test environments"
    echo -e "4. Implement proper secret management for production"
    echo -e ""
    
    return 1  # Return error code to fail CI/CD
  else
    echo -e "${GREEN}✅ No hardcoded API keys found!${NC}"
    echo -e "${GREEN}Security scan passed - safe for deployment${NC}"
    return 0
  fi
}

# Main execution
main() {
  echo -e "${BLUE}Starting security scan...${NC}"
  echo -e ""
  
  # Run scans
  scan_hardcoded_keys
  scan_cicd_exposure
  
  # Generate report and determine exit status
  if generate_security_report; then
    echo -e "${GREEN}🎉 Security scan completed successfully!${NC}"
    exit 0
  else
    echo -e "${RED}❌ Security scan failed - critical issues found!${NC}"
    echo -e "${RED}Deployment must be blocked until issues are resolved.${NC}"
    exit 1
  fi
}

# Handle script interruption
trap 'echo -e "${RED}Scanner interrupted!${NC}"; exit 2' INT TERM

# Execute main function
main "$@"