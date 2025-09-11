#!/bin/bash
# WedSync Smart Auto-Recovery Agent
# Intelligent container management and failure recovery

set -e

# Configuration
CONTAINER_NAME="wedsync-ultra"
PROMETHEUS_URL="http://prometheus:9090"
MAX_RECOVERY_ATTEMPTS=3
RECOVERY_COOLDOWN=300  # 5 minutes
LOG_FILE="/var/log/auto-recovery.log"

# Colors for logging
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] AUTO-RECOVERY:${NC} $1" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" | tee -a "$LOG_FILE"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1" | tee -a "$LOG_FILE"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1" | tee -a "$LOG_FILE"
}

# Function to query Prometheus metrics
query_metric() {
    local query="$1"
    local result
    
    result=$(curl -s -G "$PROMETHEUS_URL/api/v1/query" \
        --data-urlencode "query=$query" \
        | jq -r '.data.result[0].value[1] // "0"' 2>/dev/null || echo "0")
    
    echo "$result"
}

# Check container health
check_container_health() {
    local container_status
    local health_status
    
    # Check if container is running
    if ! docker ps --filter "name=$CONTAINER_NAME" --format "{{.Names}}" | grep -q "$CONTAINER_NAME"; then
        echo "stopped"
        return 1
    fi
    
    # Check health status
    health_status=$(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "no-health-check")
    
    case $health_status in
        "healthy")
            echo "healthy"
            return 0
            ;;
        "unhealthy")
            echo "unhealthy"
            return 1
            ;;
        "starting")
            echo "starting"
            return 2
            ;;
        *)
            echo "unknown"
            return 1
            ;;
    esac
}

# Check system resources
check_system_resources() {
    local memory_available
    local cpu_usage
    local disk_usage
    
    # Memory check (using Prometheus metrics)
    memory_available=$(query_metric "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes")
    
    # CPU usage check
    cpu_usage=$(query_metric "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)")
    
    # Disk usage check
    disk_usage=$(query_metric "100 - (node_filesystem_avail_bytes / node_filesystem_size_bytes * 100)")
    
    log "System Resources: Memory Available: $(echo "$memory_available * 100" | bc -l | cut -d. -f1)%, CPU Usage: $(echo "$cpu_usage" | cut -d. -f1)%, Disk Usage: $(echo "$disk_usage" | cut -d. -f1)%"
    
    # Check thresholds
    if (( $(echo "$memory_available < 0.15" | bc -l) )); then
        warning "Memory pressure detected ($(echo "$memory_available * 100" | bc -l | cut -d. -f1)% available)"
        return 1
    fi
    
    if (( $(echo "$cpu_usage > 90" | bc -l) )); then
        warning "High CPU usage detected ($(echo "$cpu_usage" | cut -d. -f1)%)"
        return 2
    fi
    
    if (( $(echo "$disk_usage > 90" | bc -l) )); then
        error "Critical disk usage ($(echo "$disk_usage" | cut -d. -f1)%)"
        return 3
    fi
    
    return 0
}

# Intelligent container restart
smart_restart() {
    local restart_reason="$1"
    local recovery_file="/tmp/recovery_attempts_$(date +%Y%m%d)"
    local attempts
    
    # Track recovery attempts
    if [ -f "$recovery_file" ]; then
        attempts=$(cat "$recovery_file")
    else
        attempts=0
    fi
    
    if [ "$attempts" -ge "$MAX_RECOVERY_ATTEMPTS" ]; then
        error "Maximum recovery attempts ($MAX_RECOVERY_ATTEMPTS) reached for today. Manual intervention required."
        return 1
    fi
    
    log "Initiating smart restart (attempt $((attempts + 1))/$MAX_RECOVERY_ATTEMPTS). Reason: $restart_reason"
    
    # Pre-restart cleanup
    log "Performing pre-restart cleanup..."
    
    # Clean up Docker resources
    docker system prune -f --volumes || warning "System prune failed"
    
    # Clear application cache if possible
    docker exec "$CONTAINER_NAME" rm -rf /app/.next/cache/* 2>/dev/null || true
    
    # Graceful container restart
    log "Performing graceful container restart..."
    
    if docker restart "$CONTAINER_NAME"; then
        success "Container restart successful"
        
        # Wait for container to become healthy
        local wait_time=0
        local max_wait=300  # 5 minutes
        
        while [ $wait_time -lt $max_wait ]; do
            local health=$(check_container_health)
            
            case $health in
                "healthy")
                    success "Container is healthy after restart"
                    echo $((attempts + 1)) > "$recovery_file"
                    return 0
                    ;;
                "starting")
                    log "Container is starting up... (${wait_time}s elapsed)"
                    ;;
                "unhealthy"|"stopped")
                    warning "Container is $health after restart"
                    ;;
            esac
            
            sleep 10
            wait_time=$((wait_time + 10))
        done
        
        error "Container failed to become healthy after restart within $max_wait seconds"
        echo $((attempts + 1)) > "$recovery_file"
        return 1
    else
        error "Container restart failed"
        echo $((attempts + 1)) > "$recovery_file"
        return 1
    fi
}

# Memory pressure mitigation
mitigate_memory_pressure() {
    log "Mitigating memory pressure..."
    
    # Force garbage collection in Node.js
    docker exec "$CONTAINER_NAME" node -e "
        if (global.gc) {
            global.gc();
            console.log('Garbage collection triggered');
        } else {
            console.log('Garbage collection not available');
        }
    " 2>/dev/null || true
    
    # Clean Docker system
    docker system prune -f || warning "System prune failed"
    
    # Clear npm cache
    docker exec "$CONTAINER_NAME" npm cache clean --force 2>/dev/null || true
    
    success "Memory pressure mitigation completed"
}

# Performance optimization
optimize_performance() {
    log "Running performance optimization..."
    
    # Clear Next.js cache
    docker exec "$CONTAINER_NAME" rm -rf /app/.next/cache/* 2>/dev/null || true
    
    # Optimize Docker images
    docker image prune -f || warning "Image prune failed"
    
    # Restart container if needed
    local cpu_usage=$(query_metric "100 - (avg by (instance) (irate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)")
    
    if (( $(echo "$cpu_usage > 85" | bc -l) )); then
        log "High CPU usage ($cpu_usage%), considering restart for optimization"
        smart_restart "performance_optimization"
    fi
    
    success "Performance optimization completed"
}

# Handle development workflow issues
fix_development_issues() {
    log "Checking for development workflow issues..."
    
    # Check if hot reload is working
    local hot_reload_errors=$(docker logs "$CONTAINER_NAME" --since 5m 2>&1 | grep -c "webpack" | head -1 || echo 0)
    
    if [ "$hot_reload_errors" -gt 10 ]; then
        warning "Hot reload issues detected ($hot_reload_errors errors in 5 minutes)"
        
        # Restart the development server
        docker exec "$CONTAINER_NAME" pkill -f "next dev" 2>/dev/null || true
        sleep 5
        docker exec "$CONTAINER_NAME" nohup npm run dev -- --hostname 0.0.0.0 --port 3000 > /dev/null 2>&1 & || true
    fi
    
    # Check TypeScript compilation
    local ts_errors=$(docker exec "$CONTAINER_NAME" npx tsc --noEmit --skipLibCheck 2>&1 | grep -c "error" || echo 0)
    
    if [ "$ts_errors" -gt 0 ]; then
        log "TypeScript compilation issues detected ($ts_errors errors)"
        # Could trigger auto-fixes here if desired
    fi
}

# Main recovery logic
main_recovery_loop() {
    log "Starting auto-recovery check cycle..."
    
    # Check container health
    local container_health=$(check_container_health)
    local health_check_result=$?
    
    log "Container health: $container_health"
    
    case $health_check_result in
        0) # Healthy
            log "Container is healthy, performing routine optimizations..."
            
            # Check system resources
            if ! check_system_resources; then
                local resource_result=$?
                case $resource_result in
                    1) # Memory pressure
                        mitigate_memory_pressure
                        ;;
                    2) # High CPU
                        optimize_performance
                        ;;
                    3) # Disk space
                        warning "Critical disk space - manual intervention may be required"
                        docker system prune -a -f --volumes || true
                        ;;
                esac
            fi
            
            # Check development workflow
            fix_development_issues
            ;;
            
        1) # Unhealthy or stopped
            error "Container is $container_health, attempting recovery..."
            smart_restart "container_unhealthy"
            ;;
            
        2) # Starting
            log "Container is starting up, monitoring..."
            sleep 30  # Give it more time
            ;;
    esac
    
    success "Auto-recovery check cycle completed"
}

# Signal handlers
cleanup() {
    log "Auto-recovery agent shutting down..."
    exit 0
}

trap cleanup SIGTERM SIGINT

# Main execution
log "WedSync Auto-Recovery Agent starting..."
log "Monitoring container: $container_name"
log "Prometheus URL: $PROMETHEUS_URL"

# Ensure required tools are available
command -v bc >/dev/null 2>&1 || { error "bc is required but not installed"; exit 1; }
command -v jq >/dev/null 2>&1 || { error "jq is required but not installed"; exit 1; }
command -v docker >/dev/null 2>&1 || { error "docker is required but not available"; exit 1; }

# Run main recovery logic
main_recovery_loop