#!/bin/bash

# WedSync 2.0 - Configuration Drift Detection Script
# Feature: WS-097 - Environment Management (Round 3)
# 
# Detects and reports configuration drift between environments

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/drift"
REPORTS_DIR="${PROJECT_ROOT}/reports/drift"

# Create necessary directories
mkdir -p "${LOG_DIR}" "${REPORTS_DIR}"

# Log file with timestamp
LOG_FILE="${LOG_DIR}/drift-check-$(date +%Y%m%d-%H%M%S).log"
REPORT_FILE="${REPORTS_DIR}/drift-report-$(date +%Y%m%d-%H%M%S).json"

# Function to log messages
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
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
        DRIFT)
            echo -e "${MAGENTA}[DRIFT]${NC} ${message}"
            ;;
    esac
    
    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
}

# Function to check drift between two environments
check_drift() {
    local source=$1
    local target=$2
    
    log INFO "Checking drift: ${source} -> ${target}"
    
    # Use Node.js script to detect drift
    local drift_json=$(node -e "
        const { detectConfigDrift } = require('${PROJECT_ROOT}/src/lib/config/environment-sync');
        
        (async () => {
            try {
                const drift = await detectConfigDrift('${source}', '${target}');
                if (drift) {
                    console.log(JSON.stringify(drift, null, 2));
                } else {
                    console.log(JSON.stringify({ hasDrift: false }));
                }
            } catch (error) {
                console.error(JSON.stringify({ error: error.message }));
                process.exit(1);
            }
        })();
    " 2>/dev/null || echo '{"error": "Failed to detect drift"}')
    
    echo "${drift_json}"
}

# Function to format drift report
format_drift_report() {
    local drift_json=$1
    local source=$2
    local target=$3
    
    local has_drift=$(echo "${drift_json}" | jq -r '.hasDrift // true')
    
    if [[ "${has_drift}" == "false" ]]; then
        log SUCCESS "No drift detected between ${source} and ${target}"
        return 0
    fi
    
    local severity=$(echo "${drift_json}" | jq -r '.severity // "unknown"')
    local drifted_keys=$(echo "${drift_json}" | jq -r '.driftedKeys // []')
    local missing_keys=$(echo "${drift_json}" | jq -r '.missingKeys // []')
    local extra_keys=$(echo "${drift_json}" | jq -r '.extraKeys // []')
    
    log DRIFT "==================================================="
    log DRIFT "Configuration Drift Detected"
    log DRIFT "==================================================="
    log DRIFT "Environments: ${source} -> ${target}"
    
    # Color code severity
    case $severity in
        critical)
            echo -e "${RED}Severity: CRITICAL${NC}"
            ;;
        high)
            echo -e "${RED}Severity: HIGH${NC}"
            ;;
        medium)
            echo -e "${YELLOW}Severity: MEDIUM${NC}"
            ;;
        low)
            echo -e "${GREEN}Severity: LOW${NC}"
            ;;
        *)
            echo -e "${BLUE}Severity: ${severity}${NC}"
            ;;
    esac
    
    # Show drifted keys
    local drifted_count=$(echo "${drifted_keys}" | jq 'length')
    if [[ ${drifted_count} -gt 0 ]]; then
        log DRIFT "Drifted Keys (${drifted_count}):"
        echo "${drifted_keys}" | jq -r '.[]' | while read -r key; do
            echo -e "  ${YELLOW}↔${NC} ${key}"
        done
    fi
    
    # Show missing keys
    local missing_count=$(echo "${missing_keys}" | jq 'length')
    if [[ ${missing_count} -gt 0 ]]; then
        log DRIFT "Missing Keys in ${target} (${missing_count}):"
        echo "${missing_keys}" | jq -r '.[]' | while read -r key; do
            echo -e "  ${RED}-${NC} ${key}"
        done
    fi
    
    # Show extra keys
    local extra_count=$(echo "${extra_keys}" | jq 'length')
    if [[ ${extra_count} -gt 0 ]]; then
        log DRIFT "Extra Keys in ${target} (${extra_count}):"
        echo "${extra_keys}" | jq -r '.[]' | while read -r key; do
            echo -e "  ${GREEN}+${NC} ${key}"
        done
    fi
    
    # Show value mismatches
    local mismatches=$(echo "${drift_json}" | jq -r '.valueMismatches // []')
    local mismatch_count=$(echo "${mismatches}" | jq 'length')
    if [[ ${mismatch_count} -gt 0 ]]; then
        log DRIFT "Value Mismatches (${mismatch_count}):"
        echo "${mismatches}" | jq -r '.[] | "\(.key): \(.expected) → \(.actual)"' | while read -r mismatch; do
            echo -e "  ${CYAN}≠${NC} ${mismatch}"
        done
    fi
    
    log DRIFT "==================================================="
    
    return 1  # Return 1 to indicate drift was found
}

# Function to generate summary report
generate_summary() {
    local all_drifts=$1
    
    log INFO "==================================================="
    log INFO "Drift Detection Summary"
    log INFO "==================================================="
    
    # Parse all drifts
    local total_environments=0
    local environments_with_drift=0
    local critical_drifts=0
    local high_drifts=0
    local medium_drifts=0
    local low_drifts=0
    
    echo "${all_drifts}" | jq -c '.[]' | while read -r drift; do
        ((total_environments++))
        
        local has_drift=$(echo "${drift}" | jq -r '.hasDrift // true')
        if [[ "${has_drift}" != "false" ]]; then
            ((environments_with_drift++))
            
            local severity=$(echo "${drift}" | jq -r '.severity // "unknown"')
            case $severity in
                critical) ((critical_drifts++)) ;;
                high) ((high_drifts++)) ;;
                medium) ((medium_drifts++)) ;;
                low) ((low_drifts++)) ;;
            esac
        fi
    done
    
    log INFO "Total environment pairs checked: ${total_environments}"
    log INFO "Pairs with drift: ${environments_with_drift}"
    
    if [[ ${critical_drifts} -gt 0 ]]; then
        echo -e "${RED}Critical drifts: ${critical_drifts}${NC}"
    fi
    if [[ ${high_drifts} -gt 0 ]]; then
        echo -e "${RED}High severity drifts: ${high_drifts}${NC}"
    fi
    if [[ ${medium_drifts} -gt 0 ]]; then
        echo -e "${YELLOW}Medium severity drifts: ${medium_drifts}${NC}"
    fi
    if [[ ${low_drifts} -gt 0 ]]; then
        echo -e "${GREEN}Low severity drifts: ${low_drifts}${NC}"
    fi
    
    log INFO "==================================================="
}

# Function to send alerts for critical drift
send_drift_alert() {
    local drift_json=$1
    local severity=$(echo "${drift_json}" | jq -r '.severity // "unknown"')
    
    if [[ "${severity}" == "critical" || "${severity}" == "high" ]]; then
        log WARNING "Sending drift alert for ${severity} severity drift..."
        
        # Send webhook notification (if configured)
        if [[ -n "${DRIFT_WEBHOOK_URL:-}" ]]; then
            curl -X POST "${DRIFT_WEBHOOK_URL}" \
                -H "Content-Type: application/json" \
                -d "${drift_json}" \
                2>/dev/null || log ERROR "Failed to send webhook alert"
        fi
        
        # Send email notification (if configured)
        if [[ -n "${DRIFT_EMAIL:-}" ]]; then
            echo "Critical configuration drift detected. See attached report." | \
                mail -s "WedSync Configuration Drift Alert - ${severity}" \
                -a "${REPORT_FILE}" \
                "${DRIFT_EMAIL}" \
                2>/dev/null || log ERROR "Failed to send email alert"
        fi
    fi
}

# Function to attempt auto-healing
attempt_auto_heal() {
    local environment=$1
    local severity=$2
    
    if [[ "${AUTO_HEAL}" == "true" && "${severity}" != "critical" ]]; then
        log INFO "Attempting to auto-heal drift in ${environment}..."
        
        node -e "
            const { envSyncManager } = require('${PROJECT_ROOT}/src/lib/config/environment-sync');
            
            envSyncManager.autoHealDrift('${environment}')
                .then(success => {
                    console.log(success ? 'Auto-heal successful' : 'Auto-heal failed');
                    process.exit(success ? 0 : 1);
                })
                .catch(err => {
                    console.error('Auto-heal error:', err);
                    process.exit(1);
                });
        " 2>&1 | tee -a "${LOG_FILE}"
        
        if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
            log SUCCESS "Auto-heal completed successfully"
        else
            log WARNING "Auto-heal failed - manual intervention required"
        fi
    fi
}

# Function to show usage
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Detects configuration drift between environments

OPTIONS:
    -e, --environments ENV1,ENV2   Specific environments to check (comma-separated)
    -a, --all                      Check all environment pairs
    -f, --format FORMAT            Output format: text, json, html (default: text)
    -o, --output FILE              Save report to file
    -w, --webhook URL              Webhook URL for alerts
    -m, --email ADDRESS            Email address for alerts
    --auto-heal                    Attempt to auto-heal non-critical drift
    -h, --help                     Show this help message

EXAMPLES:
    # Check drift between staging and production
    $0 -e staging,production
    
    # Check all environment pairs
    $0 --all
    
    # Check with auto-healing enabled
    $0 --all --auto-heal
    
    # Check with alerts
    $0 --all --webhook https://hooks.slack.com/... --email ops@wedsync.com

EOF
    exit 0
}

# Parse command line arguments
ENVIRONMENTS=""
CHECK_ALL=false
FORMAT="text"
OUTPUT_FILE=""
DRIFT_WEBHOOK_URL=""
DRIFT_EMAIL=""
AUTO_HEAL=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environments)
            ENVIRONMENTS="$2"
            shift 2
            ;;
        -a|--all)
            CHECK_ALL=true
            shift
            ;;
        -f|--format)
            FORMAT="$2"
            shift 2
            ;;
        -o|--output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        -w|--webhook)
            DRIFT_WEBHOOK_URL="$2"
            shift 2
            ;;
        -m|--email)
            DRIFT_EMAIL="$2"
            shift 2
            ;;
        --auto-heal)
            AUTO_HEAL=true
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            log ERROR "Unknown option: $1"
            usage
            ;;
    esac
done

# Main execution
main() {
    log INFO "==================================================="
    log INFO "WedSync Configuration Drift Detection"
    log INFO "==================================================="
    log INFO "Timestamp: $(date)"
    log INFO "Check All: ${CHECK_ALL}"
    log INFO "Auto-heal: ${AUTO_HEAL}"
    log INFO "==================================================="
    
    local all_drifts="[]"
    local has_any_drift=false
    
    if [[ "${CHECK_ALL}" == "true" ]]; then
        # Check all environment pairs
        pairs=(
            "development:staging"
            "staging:production"
            "development:production"
        )
        
        for pair in "${pairs[@]}"; do
            IFS=':' read -r source target <<< "${pair}"
            
            drift_json=$(check_drift "${source}" "${target}")
            all_drifts=$(echo "${all_drifts}" | jq ". + [{source: \"${source}\", target: \"${target}\", drift: ${drift_json}}]")
            
            if format_drift_report "${drift_json}" "${source}" "${target}"; then
                # No drift
                continue
            else
                has_any_drift=true
                send_drift_alert "${drift_json}"
                
                # Attempt auto-heal if enabled
                local severity=$(echo "${drift_json}" | jq -r '.severity // "unknown"')
                attempt_auto_heal "${target}" "${severity}"
            fi
        done
    elif [[ -n "${ENVIRONMENTS}" ]]; then
        # Check specific environment pair
        IFS=',' read -r source target <<< "${ENVIRONMENTS}"
        
        if [[ -z "${source}" || -z "${target}" ]]; then
            log ERROR "Please provide two environments separated by comma"
            exit 1
        fi
        
        drift_json=$(check_drift "${source}" "${target}")
        all_drifts=$(echo "${all_drifts}" | jq ". + [{source: \"${source}\", target: \"${target}\", drift: ${drift_json}}]")
        
        if format_drift_report "${drift_json}" "${source}" "${target}"; then
            # No drift
            :
        else
            has_any_drift=true
            send_drift_alert "${drift_json}"
            
            # Attempt auto-heal if enabled
            local severity=$(echo "${drift_json}" | jq -r '.severity // "unknown"')
            attempt_auto_heal "${target}" "${severity}"
        fi
    else
        log ERROR "Please specify environments to check or use --all"
        usage
    fi
    
    # Save report
    echo "${all_drifts}" > "${REPORT_FILE}"
    log INFO "Drift report saved to: ${REPORT_FILE}"
    
    # Generate summary
    generate_summary "${all_drifts}"
    
    # Save to output file if specified
    if [[ -n "${OUTPUT_FILE}" ]]; then
        case "${FORMAT}" in
            json)
                echo "${all_drifts}" > "${OUTPUT_FILE}"
                ;;
            html)
                # Generate HTML report (simplified)
                cat > "${OUTPUT_FILE}" << HTML
<!DOCTYPE html>
<html>
<head>
    <title>WedSync Configuration Drift Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .critical { color: #ff0000; font-weight: bold; }
        .high { color: #ff6600; font-weight: bold; }
        .medium { color: #ffaa00; }
        .low { color: #00aa00; }
        .drift-item { margin: 10px 0; padding: 10px; border: 1px solid #ddd; }
    </style>
</head>
<body>
    <h1>Configuration Drift Report</h1>
    <p>Generated: $(date)</p>
    <div id="drifts">
        <pre>${all_drifts}</pre>
    </div>
</body>
</html>
HTML
                ;;
            *)
                cp "${REPORT_FILE}" "${OUTPUT_FILE}"
                ;;
        esac
        log SUCCESS "Report saved to: ${OUTPUT_FILE}"
    fi
    
    log INFO "==================================================="
    
    if [[ "${has_any_drift}" == "true" ]]; then
        log WARNING "Configuration drift detected!"
        exit 1
    else
        log SUCCESS "No configuration drift detected"
        exit 0
    fi
}

# Run main function
main