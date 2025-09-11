#!/bin/bash

# WedSync 2.0 - Secrets Validation Script
# Feature: WS-097 - Environment Management (Round 3)
# 
# Validates that all required secrets are present and properly encrypted

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
ENVIRONMENT="${1:-production}"

# Log function
log() {
    local level=$1
    shift
    local message="$@"
    
    case $level in
        INFO)
            echo -e "${BLUE}[INFO]${NC} ${message}"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS]${NC} ${message}"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING]${NC} ${message}"
            ;;
        ERROR)
            echo -e "${RED}[ERROR]${NC} ${message}"
            ;;
    esac
}

# Required secrets by environment
declare -A REQUIRED_SECRETS_PRODUCTION=(
    ["NEXT_PUBLIC_SUPABASE_URL"]="Supabase URL"
    ["SUPABASE_SERVICE_ROLE_KEY"]="Supabase service role key"
    ["NEXTAUTH_SECRET"]="NextAuth secret"
    ["STRIPE_SECRET_KEY"]="Stripe secret key"
    ["STRIPE_WEBHOOK_SECRET"]="Stripe webhook secret"
    ["RESEND_API_KEY"]="Resend API key"
    ["TWILIO_ACCOUNT_SID"]="Twilio account SID"
    ["TWILIO_AUTH_TOKEN"]="Twilio auth token"
    ["SENTRY_DSN"]="Sentry DSN"
    ["PRODUCTION_ENCRYPTION_KEY"]="Production encryption key"
    ["DR_ENCRYPTION_KEY"]="Disaster recovery encryption key"
)

declare -A REQUIRED_SECRETS_STAGING=(
    ["NEXT_PUBLIC_SUPABASE_URL"]="Supabase URL"
    ["SUPABASE_SERVICE_ROLE_KEY"]="Supabase service role key"
    ["NEXTAUTH_SECRET"]="NextAuth secret"
    ["STRIPE_SECRET_KEY"]="Stripe secret key (test)"
    ["RESEND_API_KEY"]="Resend API key"
)

declare -A REQUIRED_SECRETS_DEVELOPMENT=(
    ["NEXT_PUBLIC_SUPABASE_URL"]="Supabase URL"
    ["SUPABASE_SERVICE_ROLE_KEY"]="Supabase service role key"
    ["NEXTAUTH_SECRET"]="NextAuth secret"
)

# Function to check if secret is encrypted
is_encrypted() {
    local value=$1
    
    # Check if value looks like it's encrypted (base64 with specific pattern)
    if [[ "$value" =~ ^[A-Za-z0-9+/]{40,}[=]{0,2}:[A-Za-z0-9+/]{32}:[A-Za-z0-9+/]{40,}$ ]]; then
        return 0
    fi
    
    return 1
}

# Function to validate secret format
validate_secret_format() {
    local key=$1
    local value=$2
    
    case $key in
        STRIPE_SECRET_KEY)
            if [[ "$value" =~ ^sk_(test_|live_)[A-Za-z0-9]{24,}$ ]]; then
                return 0
            fi
            ;;
        STRIPE_WEBHOOK_SECRET)
            if [[ "$value" =~ ^whsec_[A-Za-z0-9]{32,}$ ]]; then
                return 0
            fi
            ;;
        NEXTAUTH_SECRET)
            if [[ ${#value} -ge 32 ]]; then
                return 0
            fi
            ;;
        TWILIO_ACCOUNT_SID)
            if [[ "$value" =~ ^AC[a-f0-9]{32}$ ]]; then
                return 0
            fi
            ;;
        *)
            # Generic validation - just check it's not empty
            if [[ -n "$value" ]]; then
                return 0
            fi
            ;;
    esac
    
    return 1
}

# Function to check secret rotation age
check_secret_age() {
    local key=$1
    local rotation_file="${PROJECT_ROOT}/.secret-rotations"
    
    if [[ ! -f "$rotation_file" ]]; then
        return 1
    fi
    
    local last_rotation=$(grep "^${key}=" "$rotation_file" 2>/dev/null | cut -d'=' -f2)
    
    if [[ -z "$last_rotation" ]]; then
        return 1
    fi
    
    local age_days=$(( ($(date +%s) - $(date -d "$last_rotation" +%s)) / 86400 ))
    
    if [[ $age_days -gt 90 ]]; then
        return 1
    fi
    
    return 0
}

# Main validation
main() {
    log INFO "==================================================="
    log INFO "WedSync Secrets Validation"
    log INFO "Environment: ${ENVIRONMENT}"
    log INFO "==================================================="
    
    local missing_secrets=()
    local invalid_secrets=()
    local unencrypted_secrets=()
    local rotation_needed=()
    local total_secrets=0
    local valid_secrets=0
    
    # Select required secrets based on environment
    case $ENVIRONMENT in
        production)
            declare -n required_secrets=REQUIRED_SECRETS_PRODUCTION
            ;;
        staging)
            declare -n required_secrets=REQUIRED_SECRETS_STAGING
            ;;
        development)
            declare -n required_secrets=REQUIRED_SECRETS_DEVELOPMENT
            ;;
        *)
            log ERROR "Invalid environment: ${ENVIRONMENT}"
            exit 1
            ;;
    esac
    
    # Check each required secret
    for secret_key in "${!required_secrets[@]}"; do
        ((total_secrets++))
        local secret_desc="${required_secrets[$secret_key]}"
        local secret_value="${!secret_key:-}"
        
        log INFO "Checking ${secret_key} (${secret_desc})..."
        
        # Check if secret exists
        if [[ -z "$secret_value" ]]; then
            log ERROR "  ✗ Missing"
            missing_secrets+=("$secret_key")
            continue
        fi
        
        # Validate format
        if ! validate_secret_format "$secret_key" "$secret_value"; then
            log WARNING "  ⚠ Invalid format"
            invalid_secrets+=("$secret_key")
            continue
        fi
        
        # Check encryption (production only)
        if [[ "$ENVIRONMENT" == "production" ]]; then
            # Skip encryption check for certain keys that shouldn't be encrypted
            case $secret_key in
                NEXT_PUBLIC_*|STRIPE_PUBLISHABLE_KEY)
                    # Public keys don't need encryption
                    ;;
                *)
                    if ! is_encrypted "$secret_value"; then
                        log WARNING "  ⚠ Not encrypted"
                        unencrypted_secrets+=("$secret_key")
                    fi
                    ;;
            esac
        fi
        
        # Check rotation age
        if ! check_secret_age "$secret_key"; then
            log WARNING "  ⚠ Needs rotation (>90 days old)"
            rotation_needed+=("$secret_key")
        fi
        
        ((valid_secrets++))
        log SUCCESS "  ✓ Valid"
    done
    
    # Summary
    log INFO "==================================================="
    log INFO "Validation Summary"
    log INFO "==================================================="
    
    log INFO "Total secrets checked: ${total_secrets}"
    log SUCCESS "Valid secrets: ${valid_secrets}"
    
    if [[ ${#missing_secrets[@]} -gt 0 ]]; then
        log ERROR "Missing secrets: ${#missing_secrets[@]}"
        for secret in "${missing_secrets[@]}"; do
            echo "  - $secret"
        done
    fi
    
    if [[ ${#invalid_secrets[@]} -gt 0 ]]; then
        log WARNING "Invalid format: ${#invalid_secrets[@]}"
        for secret in "${invalid_secrets[@]}"; do
            echo "  - $secret"
        done
    fi
    
    if [[ ${#unencrypted_secrets[@]} -gt 0 ]]; then
        log WARNING "Unencrypted secrets: ${#unencrypted_secrets[@]}"
        for secret in "${unencrypted_secrets[@]}"; do
            echo "  - $secret"
        done
    fi
    
    if [[ ${#rotation_needed[@]} -gt 0 ]]; then
        log WARNING "Rotation needed: ${#rotation_needed[@]}"
        for secret in "${rotation_needed[@]}"; do
            echo "  - $secret"
        done
    fi
    
    # Exit status
    if [[ ${#missing_secrets[@]} -gt 0 ]]; then
        log ERROR "Validation FAILED - Missing required secrets"
        exit 1
    elif [[ "$ENVIRONMENT" == "production" && ${#unencrypted_secrets[@]} -gt 0 ]]; then
        log ERROR "Validation FAILED - Production secrets must be encrypted"
        exit 1
    elif [[ ${#invalid_secrets[@]} -gt 0 ]]; then
        log WARNING "Validation PASSED with warnings"
        exit 0
    else
        log SUCCESS "Validation PASSED"
        exit 0
    fi
}

# Run main function
main