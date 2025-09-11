#!/bin/bash
# WedSync Docker Maintenance & Monitoring Script
# Keeps your Docker setup healthy and running 24/7

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.bulletproof.yml"
CONTAINER_NAME="wedsync-bulletproof"
MAX_LOG_SIZE="100m"
HEALTH_CHECK_INTERVAL=30

# Logging
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

# System status check
check_system_resources() {
    log "Checking system resources..."
    
    # Check disk space
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 90 ]; then
        warning "Disk usage is high: ${disk_usage}%"
        return 1
    else
        success "Disk usage OK: ${disk_usage}%"
    fi
    
    # Check memory usage
    if command -v free > /dev/null; then
        local mem_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
        info "Memory usage: ${mem_usage}%"
    fi
    
    # Check Docker daemon
    if ! docker info > /dev/null 2>&1; then
        error "Docker daemon is not running"
        return 1
    else
        success "Docker daemon is running"
    fi
}

# Container health check
check_container_health() {
    log "Checking container health..."
    
    if [ -z "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
        warning "Container $CONTAINER_NAME is not running"
        return 1
    fi
    
    local health_status=$(docker inspect --format='{{.State.Health.Status}}' $CONTAINER_NAME 2>/dev/null || echo "no-health-check")
    
    case $health_status in
        "healthy")
            success "Container is healthy"
            return 0
            ;;
        "unhealthy")
            error "Container is unhealthy"
            return 1
            ;;
        "starting")
            info "Container is starting up..."
            return 2
            ;;
        "no-health-check")
            info "No health check configured"
            return 0
            ;;
        *)
            warning "Unknown health status: $health_status"
            return 1
            ;;
    esac
}

# Check application status
check_application() {
    log "Checking application status..."
    
    # Test main application endpoint
    if curl -f -s http://localhost:3000 > /dev/null; then
        success "Application is responding on port 3000"
    else
        error "Application is not responding on port 3000"
        return 1
    fi
    
    # Test health endpoint if available
    if curl -f -s http://localhost:3000/api/health > /dev/null 2>&1; then
        success "Health endpoint is responding"
    else
        warning "Health endpoint is not available"
    fi
    
    # Check Next.js API routes
    if curl -f -s http://localhost:3000/api/status > /dev/null 2>&1; then
        success "API routes are working"
    else
        info "Custom API status endpoint not found (this is normal)"
    fi
}

# Clean up Docker resources
cleanup_docker() {
    log "Cleaning up Docker resources..."
    
    # Remove dangling images
    local dangling_images=$(docker images -f "dangling=true" -q)
    if [ -n "$dangling_images" ]; then
        docker rmi $dangling_images 2>/dev/null || warning "Could not remove some dangling images"
        success "Removed dangling images"
    else
        info "No dangling images to remove"
    fi
    
    # Clean up unused networks
    docker network prune -f > /dev/null 2>&1 || warning "Network cleanup had issues"
    
    # Clean build cache if it's large
    local cache_size=$(docker system df --format "table {{.Type}}\t{{.Size}}" | grep "Build Cache" | awk '{print $3}' | sed 's/[^0-9.]//g')
    if [ -n "$cache_size" ] && (( $(echo "$cache_size > 1" | bc -l 2>/dev/null || echo 0) )); then
        docker builder prune -f > /dev/null 2>&1 || warning "Build cache cleanup had issues"
        success "Cleaned build cache"
    fi
}

# Rotate logs
rotate_logs() {
    log "Rotating logs..."
    
    # Truncate container logs if they're too large
    local log_file="/var/lib/docker/containers/$(docker inspect --format='{{.Id}}' $CONTAINER_NAME 2>/dev/null)/$CONTAINER_NAME-json.log"
    
    if [ -f "$log_file" ]; then
        local log_size=$(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null || echo 0)
        local max_bytes=$(echo "$MAX_LOG_SIZE" | sed 's/m//' | awk '{print $1 * 1024 * 1024}')
        
        if [ "$log_size" -gt "$max_bytes" ]; then
            tail -n 1000 "$log_file" > "$log_file.tmp" && mv "$log_file.tmp" "$log_file"
            success "Rotated container logs"
        fi
    fi
    
    # Clean application logs
    if [ -d logs ]; then
        find logs -name "*.log" -size +50M -exec truncate -s 10M {} \;
        find logs -name "*.log.*" -mtime +7 -delete 2>/dev/null || true
        success "Cleaned application logs"
    fi
}

# Restart container if needed
restart_container() {
    log "Restarting container $CONTAINER_NAME..."
    
    docker restart $CONTAINER_NAME
    
    # Wait for container to be healthy
    local attempts=0
    local max_attempts=60  # 5 minutes
    
    while [ $attempts -lt $max_attempts ]; do
        if check_container_health; then
            success "Container restarted successfully"
            return 0
        fi
        
        sleep 5
        attempts=$((attempts + 1))
    done
    
    error "Container failed to restart properly"
    return 1
}

# Update application (pull latest code and rebuild)
update_application() {
    log "Updating application..."
    
    # Stop container gracefully
    docker-compose -f $COMPOSE_FILE stop wedsync
    
    # Pull latest code (if in git repository)
    if [ -d .git ]; then
        git pull origin main 2>/dev/null || warning "Could not pull latest code"
    fi
    
    # Rebuild and start
    docker-compose -f $COMPOSE_FILE up -d --build wedsync
    
    success "Application updated"
}

# Show system status
show_status() {
    echo -e "\n${BLUE}=== WedSync Docker Status ===${NC}"
    
    # Container status
    echo -e "\n${PURPLE}Container Status:${NC}"
    docker ps -f name=$CONTAINER_NAME --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Container not found"
    
    # Resource usage
    echo -e "\n${PURPLE}Resource Usage:${NC}"
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $CONTAINER_NAME 2>/dev/null || echo "No stats available"
    
    # Docker system info
    echo -e "\n${PURPLE}Docker System:${NC}"
    docker system df
    
    # Application endpoints
    echo -e "\n${PURPLE}Application Endpoints:${NC}"
    echo "🌐 Main App: http://localhost:3000"
    echo "📊 Logs: http://localhost:9999 (if monitoring enabled)"
    echo "🔍 SonarQube: http://localhost:9000 (if running)"
}

# Monitor continuously
monitor() {
    log "Starting continuous monitoring (Ctrl+C to stop)..."
    
    while true; do
        local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
        echo -e "\n${BLUE}[$timestamp] Monitoring Check${NC}"
        
        if ! check_system_resources; then
            warning "System resources are under pressure"
            cleanup_docker
        fi
        
        local health_result=0
        check_container_health || health_result=$?
        
        case $health_result in
            1)
                error "Container is unhealthy - attempting restart"
                restart_container
                ;;
            2)
                info "Container is starting up - waiting..."
                ;;
        esac
        
        if ! check_application; then
            warning "Application is not responding properly"
        fi
        
        sleep $HEALTH_CHECK_INTERVAL
    done
}

# Main command handler
case "${1:-status}" in
    "status")
        show_status
        ;;
    "health")
        check_system_resources
        check_container_health
        check_application
        ;;
    "cleanup")
        cleanup_docker
        rotate_logs
        ;;
    "restart")
        restart_container
        ;;
    "update")
        update_application
        ;;
    "monitor")
        monitor
        ;;
    "fix")
        log "Running comprehensive fix..."
        cleanup_docker
        restart_container
        check_application
        ;;
    *)
        echo "WedSync Docker Maintenance Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  status   - Show current system status (default)"
        echo "  health   - Check system and container health"
        echo "  cleanup  - Clean up Docker resources and logs"
        echo "  restart  - Restart the application container"
        echo "  update   - Update application code and rebuild"
        echo "  monitor  - Start continuous monitoring"
        echo "  fix      - Run comprehensive fix (cleanup + restart)"
        echo ""
        exit 1
        ;;
esac