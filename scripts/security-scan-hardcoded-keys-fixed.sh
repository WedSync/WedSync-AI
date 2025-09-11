#!/bin/bash

# 🚨 CRITICAL SECURITY SCANNER: Hardcoded API Key Detection
# 
# This script scans the WedSync codebase for hardcoded API keys and secrets
# that could be exposed in production builds or CI/CD pipelines.
#
# USAGE: ./scripts/security-scan-hardcoded-keys-fixed.sh
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
REPORT_FILE="${SCAN_RESULTS_DIR}/hardcoded-keys-scan-${TIMESTAMP}.txt"

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
echo -e "Scanner Version: 1.0.1"
echo -e ""

# Initialize report
cat > "$REPORT_FILE" << EOF
WedSync Security Scanner Report
===============================
Scan Time: $(date)
Scanner Version: 1.0.1
Project: WedSync Wedding Management Platform

EOF

# Function to log violation
log_violation() {
  local file="$1"
  local line_number="$2"
  local content="$3"
  local severity="$4"
  local key_type="$5"
  local description="$6"
  
  echo -e "${file}:${line_number} - ${severity} - ${key_type}" >> "$REPORT_FILE"
  echo -e "Content: ${content}" >> "$REPORT_FILE"
  echo -e "Impact: ${description}" >> "$REPORT_FILE"
  echo -e "---" >> "$REPORT_FILE"
  
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
  
  local files_scanned=0
  
  # Scan all TypeScript and JavaScript files
  find "$PROJECT_ROOT" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) | while read -r file; do
    ((files_scanned++))
    
    # Skip node_modules and other irrelevant directories
    if [[ "$file" =~ (node_modules|\.next|dist|build|coverage)/ ]]; then
      continue
    fi
    
    # Scan for critical Supabase service role keys
    if grep -n "SUPABASE_SERVICE_ROLE_KEY.*=.*['\"].*['\"]" "$file" 2>/dev/null; then
      while IFS=: read -r line_number content; do
        if [[ -n "$content" ]]; then
          echo -e "${RED}🚨 CRITICAL: Supabase Service Role Key found in $file:$line_number${NC}"
          echo -e "   Content: $(echo "$content" | cut -c1-80)..."
          echo -e "   Impact: Admin-level database access - bypass all security"
          echo -e ""
          
          log_violation "$file" "$line_number" "$content" "CRITICAL" "Supabase Service Role Key" "Admin-level database access - bypass all security"
        fi
      done < <(grep -n "SUPABASE_SERVICE_ROLE_KEY.*=.*['\"].*['\"]" "$file" 2>/dev/null || true)
    fi
    
    # Scan for webhook secrets
    if grep -n "WEBHOOK_SECRET.*=.*['\"].*['\"]" "$file" 2>/dev/null; then
      while IFS=: read -r line_number content; do
        if [[ -n "$content" ]]; then
          echo -e "${RED}🚨 CRITICAL: Webhook Secret found in $file:$line_number${NC}"
          echo -e "   Content: $(echo "$content" | cut -c1-80)..."
          echo -e "   Impact: Webhook spoofing attacks - fake notifications"
          echo -e ""
          
          log_violation "$file" "$line_number" "$content" "CRITICAL" "Webhook Secret" "Webhook spoofing attacks - fake notifications"
        fi
      done < <(grep -n "WEBHOOK_SECRET.*=.*['\"].*['\"]" "$file" 2>/dev/null || true)
    fi
    
    # Scan for Stripe keys
    if grep -n "STRIPE_SECRET_KEY.*=.*['\"].*['\"]" "$file" 2>/dev/null; then
      while IFS=: read -r line_number content; do
        if [[ -n "$content" ]]; then
          echo -e "${RED}🚨 CRITICAL: Stripe Secret Key found in $file:$line_number${NC}"
          echo -e "   Content: $(echo "$content" | cut -c1-80)..."
          echo -e "   Impact: Payment processing bypass - financial fraud"
          echo -e ""
          
          log_violation "$file" "$line_number" "$content" "CRITICAL" "Stripe Secret Key" "Payment processing bypass - financial fraud"
        fi
      done < <(grep -n "STRIPE_SECRET_KEY.*=.*['\"].*['\"]" "$file" 2>/dev/null || true)
    fi
    
    # Scan for anonymous keys
    if grep -n "SUPABASE_ANON_KEY.*=.*['\"].*['\"]" "$file" 2>/dev/null; then
      while IFS=: read -r line_number content; do
        if [[ -n "$content" ]]; then
          echo -e "${YELLOW}⚠️ HIGH: Supabase Anonymous Key found in $file:$line_number${NC}"
          echo -e "   Content: $(echo "$content" | cut -c1-80)..."
          echo -e "   Impact: Database access bypass"
          echo -e ""
          
          log_violation "$file" "$line_number" "$content" "HIGH" "Supabase Anonymous Key" "Database access bypass"
        fi
      done < <(grep -n "SUPABASE_ANON_KEY.*=.*['\"].*['\"]" "$file" 2>/dev/null || true)
    fi
    
    # Scan for hardcoded test keys (the specific problem patterns)
    if grep -n "test-service-role-key\|test-webhook-secret\|test-anon-key" "$file" 2>/dev/null; then
      while IFS=: read -r line_number content; do
        if [[ -n "$content" ]]; then
          echo -e "${RED}🚨 CRITICAL: Hardcoded test key found in $file:$line_number${NC}"
          echo -e "   Content: $(echo "$content" | cut -c1-80)..."
          echo -e "   Impact: Hardcoded secrets in production build"
          echo -e ""
          
          log_violation "$file" "$line_number" "$content" "CRITICAL" "Hardcoded Test Key" "Hardcoded secrets in production build"
        fi
      done < <(grep -n "test-service-role-key\|test-webhook-secret\|test-anon-key" "$file" 2>/dev/null || true)
    fi
    
  done
  
  echo -e "${BLUE}Files scanned: $files_scanned${NC}"
}

# Function to generate security report
generate_security_report() {
  echo -e "${PURPLE}📊 Generating Security Report...${NC}"
  echo -e "${BLUE}=====================================${NC}"
  
  # Append summary to report
  cat >> "$REPORT_FILE" << EOF

SCAN SUMMARY
============
Total Violations: $TOTAL_VIOLATIONS
🚨 Critical: $CRITICAL_VIOLATIONS
⚠️ High: $HIGH_VIOLATIONS  
ℹ️ Medium: $MEDIUM_VIOLATIONS

EOF
  
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
    
    return 1  # Return error code to fail CI/CD
  elif [[ $HIGH_VIOLATIONS -gt 0 ]]; then
    echo -e "${YELLOW}⚠️ HIGH PRIORITY ISSUES FOUND${NC}"
    echo -e "Review and remediate high-priority violations before production deployment"
    return 1
  else
    echo -e "${GREEN}✅ No critical hardcoded keys found!${NC}"
    echo -e "${GREEN}Security scan passed - safe for deployment${NC}"
    return 0
  fi
}

# Main execution
main() {
  echo -e "${BLUE}Starting security scan...${NC}"
  echo -e ""
  
  # Run scan
  scan_hardcoded_keys
  
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