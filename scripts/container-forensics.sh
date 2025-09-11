#!/bin/bash
# WedSync Container Forensics and Debugging Tools
# Advanced diagnostics for container and application issues

set -e

# Configuration
CONTAINER_NAME="wedsync-ultra"
REPORT_DIR="./forensics-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/forensics_report_$TIMESTAMP.md"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Create report directory
mkdir -p "$REPORT_DIR"

# Logging functions
log() { echo -e "${BLUE}[FORENSICS]${NC} $1" | tee -a "$REPORT_FILE"; }
error() { echo -e "${RED}[ERROR]${NC} $1" | tee -a "$REPORT_FILE"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$REPORT_FILE"; }
warning() { echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$REPORT_FILE"; }
section() { echo -e "\n${PURPLE}${BOLD}=== $1 ===${NC}" | tee -a "$REPORT_FILE"; }

# Initialize report
init_report() {
    cat > "$REPORT_FILE" << EOF
# WedSync Container Forensics Report
**Generated**: $(date)  
**Container**: $CONTAINER_NAME  
**Report ID**: $TIMESTAMP

## Executive Summary
This report provides comprehensive diagnostics for WedSync Docker container issues.

EOF
}

# Container basic information
analyze_container_basics() {
    section "Container Basic Information"
    
    echo "### Container Status" >> "$REPORT_FILE"
    if docker ps -a --filter "name=$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Image}}\t{{.Ports}}" | tee -a "$REPORT_FILE"; then
        success "Container information retrieved"
    else
        error "Failed to get container information"
        echo "**ERROR**: Container may not exist" >> "$REPORT_FILE"
        return 1
    fi
    
    echo -e "\n### Container Configuration" >> "$REPORT_FILE"
    if docker inspect "$CONTAINER_NAME" > "$REPORT_DIR/container_inspect_$TIMESTAMP.json" 2>/dev/null; then
        success "Container inspect data saved to container_inspect_$TIMESTAMP.json"
        
        # Extract key configuration details
        echo "**Image**: $(docker inspect --format='{{.Config.Image}}' "$CONTAINER_NAME" 2>/dev/null || echo 'Unknown')" >> "$REPORT_FILE"
        echo "**Command**: $(docker inspect --format='{{join .Config.Cmd " "}}' "$CONTAINER_NAME" 2>/dev/null || echo 'Unknown')" >> "$REPORT_FILE"
        echo "**Environment Variables**: $(docker inspect --format='{{range .Config.Env}}{{.}} {{end}}' "$CONTAINER_NAME" 2>/dev/null | wc -w || echo 'Unknown')" >> "$REPORT_FILE"
        echo "**Memory Limit**: $(docker inspect --format='{{.HostConfig.Memory}}' "$CONTAINER_NAME" 2>/dev/null || echo 'Not set')" >> "$REPORT_FILE"
        echo "**CPU Limit**: $(docker inspect --format='{{.HostConfig.CpuQuota}}' "$CONTAINER_NAME" 2>/dev/null || echo 'Not set')" >> "$REPORT_FILE"
    else
        error "Failed to inspect container"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# System resource analysis
analyze_system_resources() {
    section "System Resource Analysis"
    
    echo "### Host System Resources" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    
    # Memory analysis
    echo "MEMORY USAGE:" >> "$REPORT_FILE"
    free -h >> "$REPORT_FILE" 2>/dev/null || echo "Memory info unavailable" >> "$REPORT_FILE"
    
    echo -e "\nDISK USAGE:" >> "$REPORT_FILE"
    df -h >> "$REPORT_FILE" 2>/dev/null || echo "Disk info unavailable" >> "$REPORT_FILE"
    
    echo -e "\nCPU INFORMATION:" >> "$REPORT_FILE"
    lscpu >> "$REPORT_FILE" 2>/dev/null || echo "CPU info unavailable" >> "$REPORT_FILE"
    
    echo -e "\nLOAD AVERAGE:" >> "$REPORT_FILE"
    uptime >> "$REPORT_FILE" 2>/dev/null || echo "Load average unavailable" >> "$REPORT_FILE"
    
    echo '```' >> "$REPORT_FILE"
    
    # Docker system resources
    echo -e "\n### Docker System Resources" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    docker system df >> "$REPORT_FILE" 2>/dev/null || echo "Docker system info unavailable" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    
    # Container resource usage
    if docker ps --filter "name=$CONTAINER_NAME" | grep -q "$CONTAINER_NAME"; then
        echo -e "\n### Container Resource Usage" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        docker stats "$CONTAINER_NAME" --no-stream >> "$REPORT_FILE" 2>/dev/null || echo "Container stats unavailable" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        success "System resource analysis completed"
    else
        warning "Container not running - resource usage unavailable"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Container logs analysis
analyze_logs() {
    section "Container Logs Analysis"
    
    echo "### Recent Logs (Last 100 Lines)" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    if docker logs --tail=100 "$CONTAINER_NAME" >> "$REPORT_FILE" 2>&1; then
        success "Container logs retrieved"
    else
        error "Failed to retrieve container logs"
        echo "ERROR: Could not retrieve container logs" >> "$REPORT_FILE"
    fi
    echo '```' >> "$REPORT_FILE"
    
    # Error analysis
    echo -e "\n### Error Analysis" >> "$REPORT_FILE"
    local log_file="$REPORT_DIR/container_logs_$TIMESTAMP.log"
    docker logs "$CONTAINER_NAME" > "$log_file" 2>&1 || true
    
    if [ -f "$log_file" ]; then
        local error_count=$(grep -ci "error" "$log_file" || echo 0)
        local warning_count=$(grep -ci "warning" "$log_file" || echo 0)
        local fatal_count=$(grep -ci "fatal" "$log_file" || echo 0)
        
        echo "- **Errors**: $error_count" >> "$REPORT_FILE"
        echo "- **Warnings**: $warning_count" >> "$REPORT_FILE"
        echo "- **Fatal errors**: $fatal_count" >> "$REPORT_FILE"
        
        # Show recent errors
        if [ "$error_count" -gt 0 ]; then
            echo -e "\n### Recent Errors" >> "$REPORT_FILE"
            echo '```' >> "$REPORT_FILE"
            grep -i "error" "$log_file" | tail -10 >> "$REPORT_FILE" 2>/dev/null || echo "No recent errors found" >> "$REPORT_FILE"
            echo '```' >> "$REPORT_FILE"
        fi
        
        log "Log analysis completed - $error_count errors, $warning_count warnings found"
    else
        warning "Could not analyze logs"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Network connectivity analysis
analyze_network() {
    section "Network Connectivity Analysis"
    
    echo "### Container Network Configuration" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}} {{end}}' "$CONTAINER_NAME" >> "$REPORT_FILE" 2>/dev/null || echo "Network info unavailable" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    
    echo -e "\n### Port Connectivity Tests" >> "$REPORT_FILE"
    local ports=("3000" "9090" "3001" "9100")
    
    for port in "${ports[@]}"; do
        echo "#### Testing Port $port" >> "$REPORT_FILE"
        if nc -z localhost "$port" 2>/dev/null; then
            echo "✅ Port $port is accessible" >> "$REPORT_FILE"
            success "Port $port is accessible"
        else
            echo "❌ Port $port is not accessible" >> "$REPORT_FILE"
            warning "Port $port is not accessible"
        fi
    done
    
    # Test application endpoints
    echo -e "\n### Application Endpoint Tests" >> "$REPORT_FILE"
    local endpoints=("http://localhost:3000" "http://localhost:3000/api/health")
    
    for endpoint in "${endpoints[@]}"; do
        echo "#### Testing $endpoint" >> "$REPORT_FILE"
        if curl -f -s -m 5 "$endpoint" > /dev/null 2>&1; then
            echo "✅ $endpoint is responding" >> "$REPORT_FILE"
            success "$endpoint is responding"
        else
            echo "❌ $endpoint is not responding" >> "$REPORT_FILE"
            warning "$endpoint is not responding"
        fi
    done
    
    echo "" >> "$REPORT_FILE"
}

# Application-specific diagnostics
analyze_application() {
    section "Application Diagnostics"
    
    if docker ps --filter "name=$CONTAINER_NAME" | grep -q "$CONTAINER_NAME"; then
        echo "### Node.js Process Information" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        docker exec "$CONTAINER_NAME" ps aux | grep node >> "$REPORT_FILE" 2>/dev/null || echo "Node.js process info unavailable" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        echo -e "\n### Package.json Information" >> "$REPORT_FILE"
        echo '```json' >> "$REPORT_FILE"
        docker exec "$CONTAINER_NAME" cat package.json >> "$REPORT_FILE" 2>/dev/null || echo "package.json unavailable" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        echo -e "\n### Next.js Configuration" >> "$REPORT_FILE"
        echo '```javascript' >> "$REPORT_FILE"
        docker exec "$CONTAINER_NAME" cat next.config.js >> "$REPORT_FILE" 2>/dev/null || echo "next.config.js unavailable" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        # Check for TypeScript errors
        echo -e "\n### TypeScript Compilation Check" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        docker exec "$CONTAINER_NAME" npx tsc --noEmit --skipLibCheck >> "$REPORT_FILE" 2>&1 || echo "TypeScript check completed with errors" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        # Check dependencies
        echo -e "\n### Dependency Issues" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        docker exec "$CONTAINER_NAME" npm ls --depth=0 >> "$REPORT_FILE" 2>&1 || echo "Dependency check completed" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        success "Application diagnostics completed"
    else
        warning "Container not running - application diagnostics unavailable"
        echo "**Container not running** - Application-specific diagnostics unavailable" >> "$REPORT_FILE"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Performance analysis
analyze_performance() {
    section "Performance Analysis"
    
    if docker ps --filter "name=$CONTAINER_NAME" | grep -q "$CONTAINER_NAME"; then
        echo "### Container Performance Metrics" >> "$REPORT_FILE"
        
        # Collect multiple samples for better accuracy
        echo '```' >> "$REPORT_FILE"
        echo "Collecting performance samples..." >> "$REPORT_FILE"
        for i in {1..5}; do
            echo "Sample $i:" >> "$REPORT_FILE"
            docker stats "$CONTAINER_NAME" --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}" >> "$REPORT_FILE" 2>/dev/null || echo "Performance sample $i failed" >> "$REPORT_FILE"
            sleep 2
        done
        echo '```' >> "$REPORT_FILE"
        
        # Memory analysis inside container
        echo -e "\n### Container Memory Analysis" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        docker exec "$CONTAINER_NAME" cat /proc/meminfo >> "$REPORT_FILE" 2>/dev/null || echo "Container memory info unavailable" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        # File system analysis
        echo -e "\n### Container File System" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        docker exec "$CONTAINER_NAME" df -h >> "$REPORT_FILE" 2>/dev/null || echo "Container filesystem info unavailable" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        # Check for large files that might be causing issues
        echo -e "\n### Large Files in Container" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        docker exec "$CONTAINER_NAME" find /app -type f -size +50M -ls >> "$REPORT_FILE" 2>/dev/null || echo "Large file search completed" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        success "Performance analysis completed"
    else
        warning "Container not running - performance analysis unavailable"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Docker daemon analysis
analyze_docker_daemon() {
    section "Docker Daemon Analysis"
    
    echo "### Docker Version" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    docker version >> "$REPORT_FILE" 2>/dev/null || echo "Docker version unavailable" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    
    echo -e "\n### Docker System Info" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    docker system info >> "$REPORT_FILE" 2>/dev/null || echo "Docker system info unavailable" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    
    echo -e "\n### Docker Events (Last 50)" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    docker events --since 1h --until now >> "$REPORT_FILE" 2>/dev/null | tail -50 || echo "Docker events unavailable" >> "$REPORT_FILE"
    echo '```' >> "$REPORT_FILE"
    
    success "Docker daemon analysis completed"
    echo "" >> "$REPORT_FILE"
}

# Security analysis
analyze_security() {
    section "Security Analysis"
    
    if docker ps --filter "name=$CONTAINER_NAME" | grep -q "$CONTAINER_NAME"; then
        echo "### Container Security Configuration" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        # Check user
        echo "Running as user: $(docker exec "$CONTAINER_NAME" whoami 2>/dev/null || echo 'Unknown')" >> "$REPORT_FILE"
        
        # Check capabilities
        echo "Capabilities:" >> "$REPORT_FILE"
        docker inspect --format='{{.HostConfig.CapAdd}}' "$CONTAINER_NAME" >> "$REPORT_FILE" 2>/dev/null || echo "Capabilities info unavailable" >> "$REPORT_FILE"
        
        # Check privileged mode
        echo "Privileged mode: $(docker inspect --format='{{.HostConfig.Privileged}}' "$CONTAINER_NAME" 2>/dev/null || echo 'Unknown')" >> "$REPORT_FILE"
        
        echo '```' >> "$REPORT_FILE"
        
        # Check for security vulnerabilities in dependencies
        echo -e "\n### Security Vulnerabilities" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        docker exec "$CONTAINER_NAME" npm audit >> "$REPORT_FILE" 2>&1 || echo "npm audit completed" >> "$REPORT_FILE"
        echo '```' >> "$REPORT_FILE"
        
        success "Security analysis completed"
    else
        warning "Container not running - security analysis unavailable"
    fi
    
    echo "" >> "$REPORT_FILE"
}

# Generate recommendations
generate_recommendations() {
    section "Recommendations and Next Steps"
    
    echo "### Immediate Actions" >> "$REPORT_FILE"
    
    # Analyze the collected data and provide recommendations
    if ! docker ps --filter "name=$CONTAINER_NAME" | grep -q "$CONTAINER_NAME"; then
        echo "1. **Start the container**: The container is not currently running" >> "$REPORT_FILE"
        echo "   \`docker-compose -f docker-compose.ultra-stable.yml up -d\`" >> "$REPORT_FILE"
    fi
    
    # Check if logs show errors
    if [ -f "$REPORT_DIR/container_logs_$TIMESTAMP.log" ]; then
        local error_count=$(grep -ci "error" "$REPORT_DIR/container_logs_$TIMESTAMP.log" || echo 0)
        if [ "$error_count" -gt 10 ]; then
            echo "2. **Address application errors**: $error_count errors found in logs" >> "$REPORT_FILE"
            echo "   - Review error details in the logs section above" >> "$REPORT_FILE"
            echo "   - Consider restarting with: \`./scripts/docker-maintenance.sh restart\`" >> "$REPORT_FILE"
        fi
    fi
    
    # Check system resources
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//' || echo 0)
    if [ "$disk_usage" -gt 90 ]; then
        echo "3. **Free disk space**: Disk usage is at ${disk_usage}%" >> "$REPORT_FILE"
        echo "   - Run: \`./scripts/docker-maintenance.sh cleanup\`" >> "$REPORT_FILE"
    fi
    
    echo -e "\n### Long-term Improvements" >> "$REPORT_FILE"
    echo "1. **Monitor resource trends** using the Grafana dashboard" >> "$REPORT_FILE"
    echo "2. **Set up automated alerts** for critical issues" >> "$REPORT_FILE"
    echo "3. **Regular maintenance** using the auto-recovery system" >> "$REPORT_FILE"
    echo "4. **Update dependencies** regularly for security and performance" >> "$REPORT_FILE"
    
    echo -e "\n### Additional Resources" >> "$REPORT_FILE"
    echo "- **Monitoring Dashboard**: http://localhost:3001" >> "$REPORT_FILE"
    echo "- **Container Logs**: http://localhost:9999" >> "$REPORT_FILE"
    echo "- **Prometheus Metrics**: http://localhost:9090" >> "$REPORT_FILE"
    echo "- **Auto-recovery**: \`./scripts/docker-maintenance.sh monitor\`" >> "$REPORT_FILE"
    
    success "Recommendations generated"
    echo "" >> "$REPORT_FILE"
}

# Main forensics function
run_forensics() {
    local analysis_type="${1:-full}"
    
    log "Starting WedSync Container Forensics Analysis..."
    log "Analysis type: $analysis_type"
    
    init_report
    
    case $analysis_type in
        "basic")
            analyze_container_basics
            analyze_logs
            generate_recommendations
            ;;
        "network")
            analyze_container_basics
            analyze_network
            generate_recommendations
            ;;
        "performance")
            analyze_container_basics
            analyze_system_resources
            analyze_performance
            generate_recommendations
            ;;
        "security")
            analyze_container_basics
            analyze_security
            generate_recommendations
            ;;
        "full"|*)
            analyze_container_basics
            analyze_system_resources
            analyze_logs
            analyze_network
            analyze_application
            analyze_performance
            analyze_docker_daemon
            analyze_security
            generate_recommendations
            ;;
    esac
    
    echo -e "\n---\n**Report generated**: $(date)" >> "$REPORT_FILE"
    echo "**Analysis duration**: $(date -d "$start_time" +'%s' 2>/dev/null | xargs -I {} echo $(( $(date +'%s') - {} )) || echo 'Unknown') seconds" >> "$REPORT_FILE"
    
    success "Forensics analysis completed!"
    success "Report saved to: $REPORT_FILE"
    
    # Display summary
    echo ""
    echo -e "${CYAN}${BOLD}📊 Analysis Summary:${NC}"
    echo "🔍 Report: $REPORT_FILE"
    echo "📁 Data: $REPORT_DIR/"
    echo "⏰ Timestamp: $TIMESTAMP"
    echo ""
    
    # Suggest next steps
    if ! docker ps --filter "name=$CONTAINER_NAME" | grep -q "$CONTAINER_NAME"; then
        echo -e "${YELLOW}💡 Suggested next step: Start the container${NC}"
        echo "   ./start-bulletproof.sh start"
    else
        echo -e "${GREEN}✅ Container is running - check the report for optimization opportunities${NC}"
    fi
}

# CLI handling
case "${1:-full}" in
    "basic"|"network"|"performance"|"security"|"full")
        start_time=$(date)
        run_forensics "$1"
        ;;
    "help"|"--help"|"-h")
        echo "WedSync Container Forensics Tool"
        echo ""
        echo "Usage: $0 [analysis_type]"
        echo ""
        echo "Analysis Types:"
        echo "  basic       - Basic container and log analysis"
        echo "  network     - Network connectivity analysis"
        echo "  performance - Performance and resource analysis"
        echo "  security    - Security configuration analysis"
        echo "  full        - Complete forensics analysis (default)"
        echo ""
        echo "Reports are saved to: $REPORT_DIR/"
        ;;
    *)
        echo "Unknown analysis type: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac