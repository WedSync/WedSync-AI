#!/bin/bash

# WedSync Automatic Recovery System
# Monitors container health and automatically restarts failed services

set -e

# Configuration
MAX_RESTARTS=3
RESTART_DELAY=10
HEALTH_CHECK_INTERVAL=30
MEMORY_THRESHOLD_MB=3000
CPU_THRESHOLD=80

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    log "[ERROR] $1" >> wedsync-recovery.log
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
    log "[WARN] $1" >> wedsync-recovery.log
}

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
    log "[INFO] $1" >> wedsync-recovery.log
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
    log "[DEBUG] $1" >> wedsync-recovery.log
}

# Check if Docker is running
check_docker() {
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running"
        return 1
    fi
    return 0
}

# Get container stats
get_container_stats() {
    local container_name=$1
    
    if ! docker ps | grep -q "$container_name"; then
        echo "not_running"
        return
    fi
    
    # Get memory and CPU usage
    local stats=$(docker stats --no-stream --format "table {{.MemUsage}}\t{{.CPUPerc}}" "$container_name" 2>/dev/null | tail -1)
    
    if [ -z "$stats" ]; then
        echo "no_stats"
        return
    fi
    
    echo "$stats"
}

# Check container health
check_container_health() {
    local container_name=$1
    local compose_file=${2:-"docker-compose.monitor.yml"}
    
    log_debug "Checking health of $container_name"
    
    # Check if container is running
    if ! docker ps | grep -q "$container_name"; then
        log_warn "Container $container_name is not running"
        return 1
    fi
    
    # Check health status
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no_health_check")
    
    if [ "$health_status" = "unhealthy" ]; then
        log_error "Container $container_name is unhealthy"
        return 2
    fi
    
    # Check resource usage
    local stats=$(get_container_stats "$container_name")
    
    if [ "$stats" = "not_running" ]; then
        return 1
    elif [ "$stats" = "no_stats" ]; then
        log_warn "Cannot get stats for $container_name"
        return 0
    fi
    
    # Parse memory usage (format: 123.4MiB / 2GiB)
    local mem_usage=$(echo "$stats" | awk '{print $1}' | sed 's/MiB.*//')
    local cpu_usage=$(echo "$stats" | awk '{print $2}' | sed 's/%//')
    
    # Check memory threshold
    if [ -n "$mem_usage" ] && [ "$(echo "$mem_usage > $MEMORY_THRESHOLD_MB" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        log_warn "Container $container_name high memory usage: ${mem_usage}MB"
        return 3
    fi
    
    # Check CPU threshold
    if [ -n "$cpu_usage" ] && [ "$(echo "$cpu_usage > $CPU_THRESHOLD" | bc -l 2>/dev/null || echo 0)" -eq 1 ]; then
        log_warn "Container $container_name high CPU usage: ${cpu_usage}%"
        return 4
    fi
    
    return 0
}

# Restart container with backoff
restart_container() {
    local container_name=$1
    local compose_file=${2:-"docker-compose.monitor.yml"}
    local restart_count_file="/tmp/wedsync-restart-count-$container_name"
    
    # Get current restart count
    local restart_count=0
    if [ -f "$restart_count_file" ]; then
        restart_count=$(cat "$restart_count_file")
    fi
    
    # Check if we've exceeded max restarts
    if [ "$restart_count" -ge "$MAX_RESTARTS" ]; then
        log_error "Container $container_name has been restarted $restart_count times. Manual intervention required."
        return 1
    fi
    
    # Increment restart count
    restart_count=$((restart_count + 1))
    echo "$restart_count" > "$restart_count_file"
    
    log_info "Restarting container $container_name (attempt $restart_count/$MAX_RESTARTS)"
    
    # Try graceful restart first
    if docker-compose -f "$compose_file" restart "$container_name" >/dev/null 2>&1; then
        log_info "Successfully restarted $container_name"
        sleep "$RESTART_DELAY"
        return 0
    fi
    
    # If graceful restart fails, try force restart
    log_warn "Graceful restart failed, forcing restart of $container_name"
    
    docker-compose -f "$compose_file" stop "$container_name" >/dev/null 2>&1 || true
    sleep 5
    docker-compose -f "$compose_file" up -d "$container_name" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        log_info "Force restart of $container_name successful"
        sleep "$RESTART_DELAY"
        return 0
    else
        log_error "Failed to restart $container_name"
        return 1
    fi
}

# Clean up old restart counters
cleanup_restart_counters() {
    find /tmp -name "wedsync-restart-count-*" -mtime +1 -delete 2>/dev/null || true
}

# Handle specific recovery actions based on error type
handle_specific_error() {
    local container_name=$1
    local error_type=$2
    
    case $error_type in
        1) # Container not running
            log_info "Container $container_name is not running, attempting to start"
            docker-compose -f docker-compose.monitor.yml up -d "$container_name"
            ;;
        2) # Container unhealthy
            log_info "Container $container_name is unhealthy, restarting"
            restart_container "$container_name"
            ;;
        3) # High memory usage
            log_info "Container $container_name has high memory usage, restarting"
            restart_container "$container_name"
            ;;
        4) # High CPU usage
            log_warn "Container $container_name has high CPU usage, monitoring"
            # Don't restart immediately for CPU issues, just log
            ;;
        *)
            log_debug "Unknown error type $error_type for $container_name"
            ;;
    esac
}

# Recovery actions for application-specific issues
recover_app_issues() {
    local container_name="wedsync-monitored"
    
    # Check for common application errors in logs
    local recent_logs=$(docker logs "$container_name" --tail 50 2>&1 || echo "")
    
    # Check for out of memory errors
    if echo "$recent_logs" | grep -q "JavaScript heap out of memory\|FATAL ERROR: Ineffective mark-compacts"; then
        log_error "Detected memory exhaustion in $container_name"
        
        # Try to restart with memory optimization
        log_info "Applying memory optimization and restarting"
        docker-compose -f docker-compose.monitor.yml stop "$container_name"
        
        # Clear any cached data
        docker volume prune -f >/dev/null 2>&1 || true
        
        # Restart container
        docker-compose -f docker-compose.monitor.yml up -d "$container_name"
        return
    fi
    
    # Check for dependency resolution errors
    if echo "$recent_logs" | grep -q "npm ERR!\|Module not found\|Cannot resolve dependency"; then
        log_error "Detected dependency issues in $container_name"
        
        log_info "Attempting to resolve dependency issues"
        docker-compose -f docker-compose.monitor.yml exec "$container_name" sh -c "
            rm -rf node_modules package-lock.json
            npm install --legacy-peer-deps --no-audit
        " >/dev/null 2>&1 || true
        
        restart_container "$container_name"
        return
    fi
    
    # Check for port conflicts
    if echo "$recent_logs" | grep -q "EADDRINUSE.*3000\|port 3000.*already in use"; then
        log_error "Detected port conflict for $container_name"
        
        # Find and kill processes using port 3000
        local pid=$(lsof -ti:3000 2>/dev/null || echo "")
        if [ -n "$pid" ]; then
            log_info "Killing process $pid using port 3000"
            kill -9 "$pid" >/dev/null 2>&1 || true
            sleep 2
        fi
        
        restart_container "$container_name"
        return
    fi
}

# Main monitoring loop
monitor_containers() {
    local compose_file=${1:-"docker-compose.monitor.yml"}
    local containers=("wedsync-monitored" "wedsync-postgres-monitored" "wedsync-redis-monitored")
    
    log_info "Starting WedSync auto-recovery monitor"
    log_info "Compose file: $compose_file"
    log_info "Monitoring containers: ${containers[*]}"
    log_info "Health check interval: ${HEALTH_CHECK_INTERVAL}s"
    
    # Create recovery log
    echo "# WedSync Recovery Log - $(date)" > wedsync-recovery.log
    
    while true; do
        cleanup_restart_counters
        
        for container in "${containers[@]}"; do
            if ! check_docker; then
                log_error "Docker daemon check failed, retrying in 30 seconds"
                sleep 30
                continue 2
            fi
            
            check_container_health "$container" "$compose_file"
            local health_status=$?
            
            if [ $health_status -ne 0 ]; then
                handle_specific_error "$container" $health_status
                
                # Special handling for main app container
                if [ "$container" = "wedsync-monitored" ]; then
                    recover_app_issues
                fi
            else
                log_debug "Container $container is healthy"
                
                # Reset restart counter on successful health check
                rm -f "/tmp/wedsync-restart-count-$container"
            fi
        done
        
        # Check overall system health
        local total_containers=$(docker ps | grep -c wedsync- || echo 0)
        if [ "$total_containers" -eq 0 ]; then
            log_error "No WedSync containers running, attempting full restart"
            docker-compose -f "$compose_file" up -d
            sleep 30
        fi
        
        sleep "$HEALTH_CHECK_INTERVAL"
    done
}

# Signal handling for graceful shutdown
trap 'log_info "Shutting down auto-recovery monitor"; exit 0' SIGINT SIGTERM

# Command line options
case "${1:-monitor}" in
    "monitor")
        monitor_containers "${2:-docker-compose.monitor.yml}"
        ;;
    "check")
        container_name="${2:-wedsync-monitored}"
        check_container_health "$container_name"
        echo "Health check result: $?"
        ;;
    "restart")
        container_name="${2:-wedsync-monitored}"
        restart_container "$container_name"
        ;;
    "recover")
        recover_app_issues
        ;;
    *)
        echo "Usage: $0 {monitor|check|restart|recover} [container_name]"
        echo ""
        echo "Commands:"
        echo "  monitor  - Start continuous monitoring (default)"
        echo "  check    - Check health of specific container"
        echo "  restart  - Restart specific container"
        echo "  recover  - Run application-specific recovery"
        echo ""
        echo "Examples:"
        echo "  $0 monitor docker-compose.simple.yml"
        echo "  $0 check wedsync-monitored"
        echo "  $0 restart wedsync-monitored"
        exit 1
        ;;
esac