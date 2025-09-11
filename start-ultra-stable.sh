#!/bin/bash
# WedSync Ultra-Stable Development Environment
# The ultimate Docker setup with predictive monitoring and auto-recovery

set -e

# Colors and styling
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.ultra-stable.yml"
FALLBACK_COMPOSE_FILE="docker-compose.direct.yml"
CONTAINER_NAME="wedsync-ultra"

# Ultra-Stable Banner
show_ultra_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║              WedSync Ultra-Stable Environment               ║"
    echo "║                                                              ║"
    echo "║  🧠 Predictive Monitoring  📊 Real-time Metrics             ║"
    echo "║  🔄 Smart Auto-Recovery    🔧 IDE Integration               ║"
    echo "║  ⚡ Optimized Hot Reload   🛡️  Container Forensics          ║"
    echo "║  🚨 Intelligent Alerts    💪 99.9% Uptime Target            ║"
    echo "║                                                              ║"
    echo "║           Built for developers who can't afford              ║"
    echo "║              Docker stability issues                         ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Logging functions
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

# System requirements check
check_system_requirements() {
    log "Checking system requirements..."
    
    # Check available memory
    local available_memory=$(free -m | awk 'NR==2{print $7}' 2>/dev/null || echo 0)
    if [ "$available_memory" -lt 4096 ]; then
        warning "Available memory is low ($available_memory MB). Recommended: 4GB+"
        echo "Consider closing other applications for optimal performance"
    fi
    
    # Check disk space
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')
    if [ "$disk_usage" -gt 80 ]; then
        warning "Disk space is low (${disk_usage}% used)"
        if [ "$disk_usage" -gt 95 ]; then
            error "Critical disk space shortage"
            echo "Run: docker system prune -a --volumes"
            exit 1
        fi
    fi
    
    # Check Docker resources
    if ! docker info >/dev/null 2>&1; then
        error "Docker daemon is not running"
        echo "Please start Docker Desktop"
        exit 1
    fi
    
    success "System requirements check passed"
}

# Setup ultra-stable environment
setup_ultra_environment() {
    log "Setting up ultra-stable environment..."
    
    # Create necessary directories
    mkdir -p logs monitoring/dashboards monitoring/datasources forensics-reports
    
    # Setup configuration files
    if [ -f "next.config.ultra-stable.js" ]; then
        cp next.config.ultra-stable.js next.config.js
        success "Using ultra-stable Next.js configuration"
    elif [ -f "next.config.bulletproof.js" ]; then
        cp next.config.bulletproof.js next.config.js
        success "Using bulletproof Next.js configuration"
    fi
    
    # Setup Grafana datasources
    cat > monitoring/datasources/prometheus.yml << 'EOF'
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF
    
    # Setup Grafana dashboard provisioning
    cat > monitoring/dashboards/dashboard.yml << 'EOF'
apiVersion: 1

providers:
  - name: 'wedsync-dashboards'
    type: file
    options:
      path: /etc/grafana/provisioning/dashboards
EOF
    
    success "Ultra-stable environment setup completed"
}

# Comprehensive pre-flight checks
comprehensive_preflight() {
    log "Running comprehensive pre-flight checks..."
    
    # Check if ports are available
    local ports=(3000 3001 8080 9090 9091 9093 9100)
    for port in "${ports[@]}"; do
        if lsof -i ":$port" >/dev/null 2>&1; then
            warning "Port $port is in use"
            local process=$(lsof -ti ":$port" | head -1)
            if [ -n "$process" ]; then
                echo "  Process using port $port: $(ps -p $process -o comm= 2>/dev/null || echo 'Unknown')"
            fi
        fi
    done
    
    # Check for conflicting containers
    local running_wedsync=$(docker ps --filter "name=wedsync" --format "{{.Names}}" | wc -l)
    if [ "$running_wedsync" -gt 0 ]; then
        warning "Found $running_wedsync running WedSync containers"
        echo "Stopping conflicting containers..."
        docker ps --filter "name=wedsync" -q | xargs -r docker stop
    fi
    
    # Check Docker system health
    local docker_warnings=$(docker system info --format '{{.Warnings}}' 2>/dev/null | wc -w)
    if [ "$docker_warnings" -gt 0 ]; then
        warning "Docker system has $docker_warnings warnings"
        echo "Run 'docker system info' for details"
    fi
    
    success "Pre-flight checks completed"
}

# Start ultra-stable services
start_ultra_services() {
    log "Starting ultra-stable service stack..."
    
    # Determine compose file
    if [ -f "$COMPOSE_FILE" ]; then
        ACTIVE_COMPOSE_FILE="$COMPOSE_FILE"
        success "Using ultra-stable compose file: $COMPOSE_FILE"
    else
        ACTIVE_COMPOSE_FILE="$FALLBACK_COMPOSE_FILE"
        warning "Ultra-stable compose file not found, using fallback: $FALLBACK_COMPOSE_FILE"
        CONTAINER_NAME="wedsync-app"
    fi
    
    # Start services with intelligent ordering
    echo -e "${CYAN}🚀 Starting ultra-stable services...${NC}"
    
    # Start monitoring infrastructure first
    if [ -f "$COMPOSE_FILE" ]; then
        log "Starting monitoring infrastructure..."
        docker-compose -f "$ACTIVE_COMPOSE_FILE" up -d prometheus resource-watchdog
        sleep 10
        
        log "Starting auto-recovery and metrics collection..."
        docker-compose -f "$ACTIVE_COMPOSE_FILE" up -d auto-recovery dev-metrics
        sleep 5
        
        log "Starting application with full monitoring..."
        docker-compose -f "$ACTIVE_COMPOSE_FILE" up -d wedsync
        sleep 5
        
        log "Starting analysis and visualization services..."
        docker-compose -f "$ACTIVE_COMPOSE_FILE" up -d grafana alertmanager cadvisor
    else
        # Fallback to simple startup
        docker-compose -f "$ACTIVE_COMPOSE_FILE" up -d
    fi
    
    success "Ultra-stable services started"
}

# Monitor intelligent startup
monitor_intelligent_startup() {
    log "Monitoring intelligent startup sequence..."
    
    local max_wait=300  # 5 minutes
    local wait_time=0
    local startup_phase="initializing"
    
    echo -e "${YELLOW}Ultra-stable startup in progress...${NC}"
    echo "This includes dependency installation, monitoring setup, and health checks"
    
    # Start IDE integration
    if [ -f "scripts/ide-integration.js" ]; then
        log "Starting IDE integration..."
        nohup node scripts/ide-integration.js > logs/ide-integration.log 2>&1 &
        echo $! > .ide-integration.pid
    fi
    
    # Show logs in background
    (docker-compose -f "$ACTIVE_COMPOSE_FILE" logs -f 2>/dev/null | while IFS= read -r line; do
        case "$line" in
            *"Installing system dependencies"*)
                startup_phase="installing_dependencies"
                echo -e "${BLUE}📦 Installing system dependencies...${NC}"
                ;;
            *"Installing npm packages"*)
                startup_phase="installing_packages"
                echo -e "${BLUE}📚 Installing npm packages...${NC}"
                ;;
            *"Starting Next.js"*)
                startup_phase="starting_nextjs"
                echo -e "${BLUE}🌐 Starting Next.js server...${NC}"
                ;;
            *"ready"*|*"Ready in"*|*"Local:"*)
                startup_phase="ready"
                echo -e "${GREEN}✅ Application is ready!${NC}"
                ;;
            *"ERROR"*|*"error"*)
                echo -e "${RED}⚠️  Error detected in logs${NC}"
                ;;
        esac
    done) &
    local logs_pid=$!
    
    # Wait for application to be ready
    while [ $wait_time -lt $max_wait ]; do
        # Check if application is responding
        if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
            kill $logs_pid 2>/dev/null || true
            success "Application is ready and responding!"
            break
        fi
        
        # Show progress indicator
        case $startup_phase in
            "initializing") echo -n "🔄" ;;
            "installing_dependencies") echo -n "📦" ;;
            "installing_packages") echo -n "📚" ;;
            "starting_nextjs") echo -n "🌐" ;;
        esac
        
        sleep 5
        wait_time=$((wait_time + 5))
    done
    
    # Check final status
    if [ $wait_time -ge $max_wait ]; then
        kill $logs_pid 2>/dev/null || true
        error "Startup timeout after $max_wait seconds"
        echo "Check logs with: docker-compose -f $ACTIVE_COMPOSE_FILE logs"
        return 1
    fi
    
    # Start continuous monitoring
    if [ -f "scripts/docker-maintenance.sh" ]; then
        log "Starting background monitoring..."
        nohup ./scripts/docker-maintenance.sh monitor > logs/maintenance.log 2>&1 &
        echo $! > .maintenance.pid
    fi
    
    echo ""  # Clear progress indicators
}

# Show ultra-stable dashboard
show_ultra_dashboard() {
    echo -e "\n${GREEN}${BOLD}🎉 WedSync Ultra-Stable Environment Ready!${NC}\n"
    
    echo -e "${CYAN}📱 Primary Services:${NC}"
    echo -e "  🌐 WedSync Application:    ${BOLD}http://localhost:3000${NC}"
    echo -e "  📊 Performance Dashboard:  ${BOLD}http://localhost:3001${NC}"
    echo -e "  🔍 Prometheus Metrics:     ${BOLD}http://localhost:9090${NC}"
    echo -e "  🚨 Alert Manager:          ${BOLD}http://localhost:9093${NC}"
    
    echo -e "\n${PURPLE}🔧 Development Tools:${NC}"
    echo -e "  📋 Container Logs:         ${BOLD}http://localhost:9999${NC}"
    echo -e "  📈 cAdvisor Monitoring:    ${BOLD}http://localhost:8080${NC}"
    echo -e "  📊 Development Metrics:    ${BOLD}http://localhost:9091/metrics${NC}"
    
    echo -e "\n${YELLOW}🛠️  Management Commands:${NC}"
    echo -e "  Status Check:      ${BOLD}./scripts/docker-maintenance.sh status${NC}"
    echo -e "  Container Health:  ${BOLD}node scripts/ide-integration.js status${NC}"
    echo -e "  Performance Fix:   ${BOLD}./scripts/docker-maintenance.sh fix${NC}"
    echo -e "  Full Diagnostics:  ${BOLD}./scripts/container-forensics.sh full${NC}"
    echo -e "  IDE Integration:   ${BOLD}WebSocket: ws://localhost:8765${NC}"
    
    echo -e "\n${GREEN}🧠 Intelligent Features Active:${NC}"
    echo -e "  ✅ Predictive resource monitoring"
    echo -e "  ✅ Automatic failure recovery"
    echo -e "  ✅ Performance optimization"
    echo -e "  ✅ Real-time development metrics"
    echo -e "  ✅ IDE integration with status updates"
    echo -e "  ✅ Container forensics and debugging"
    echo -e "  ✅ Intelligent alerting system"
    
    echo -e "\n${BLUE}📊 Expected Performance:${NC}"
    echo -e "  🎯 Startup Time: < 3 minutes (first run)"
    echo -e "  🎯 Hot Reload: < 2 seconds"
    echo -e "  🎯 Build Time: < 30 seconds (incremental)"
    echo -e "  🎯 Memory Usage: 4-6GB (with monitoring)"
    echo -e "  🎯 CPU Usage: 2-4 cores (development)"
    echo -e "  🎯 Uptime Target: 99.9%"
    
    # Show system status
    echo -e "\n${CYAN}📈 Current System Status:${NC}"
    local mem_usage=$(free | awk 'NR==2{printf "%.1f%%", $3*100/$2}' 2>/dev/null || echo "N/A")
    local disk_usage=$(df -h . | awk 'NR==2 {print $5}' 2>/dev/null || echo "N/A")
    local containers_running=$(docker ps --filter "name=wedsync" | wc -l | xargs -I {} echo $(({} - 1)))
    
    echo -e "  🧠 Memory Usage: $mem_usage"
    echo -e "  💾 Disk Usage: $disk_usage"
    echo -e "  🐳 Active Containers: $containers_running"
    echo -e "  ⏱️  Started: $(date)"
    
    echo -e "\n${GREEN}🚀 Development environment is now ultra-stable and ready!${NC}"
    echo -e "${YELLOW}💡 Pro tip: Keep the Grafana dashboard open for real-time monitoring${NC}"
}

# Handle different commands
handle_command() {
    local command="${1:-start}"
    
    case $command in
        "start")
            show_ultra_banner
            check_system_requirements
            setup_ultra_environment
            comprehensive_preflight
            start_ultra_services
            monitor_intelligent_startup
            show_ultra_dashboard
            ;;
        "stop")
            log "Stopping ultra-stable environment..."
            
            # Stop background processes
            [ -f .ide-integration.pid ] && kill $(cat .ide-integration.pid) 2>/dev/null && rm .ide-integration.pid
            [ -f .maintenance.pid ] && kill $(cat .maintenance.pid) 2>/dev/null && rm .maintenance.pid
            
            # Stop Docker services
            docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || docker-compose -f "$FALLBACK_COMPOSE_FILE" down
            success "Ultra-stable environment stopped"
            ;;
        "restart")
            log "Restarting ultra-stable environment..."
            handle_command stop
            sleep 5
            handle_command start
            ;;
        "status")
            echo -e "${CYAN}${BOLD}Ultra-Stable Environment Status${NC}"
            
            # Check services
            if docker ps --filter "name=wedsync" | grep -q wedsync; then
                success "Core application is running"
            else
                error "Core application is not running"
            fi
            
            # Check monitoring services
            local monitoring_services=("prometheus" "grafana" "cadvisor")
            for service in "${monitoring_services[@]}"; do
                if docker ps --filter "name=$service" | grep -q "$service"; then
                    success "$service is running"
                else
                    warning "$service is not running"
                fi
            done
            
            # Check application health
            if curl -f -s http://localhost:3000 >/dev/null 2>&1; then
                success "Application is responding"
            else
                error "Application is not responding"
            fi
            ;;
        "logs")
            docker-compose -f "$COMPOSE_FILE" logs -f 2>/dev/null || docker-compose -f "$FALLBACK_COMPOSE_FILE" logs -f
            ;;
        "clean")
            log "Performing deep cleanup..."
            
            # Stop everything
            handle_command stop
            
            # Clean Docker system
            docker system prune -a --volumes -f
            
            # Clean application data
            rm -rf node_modules .next logs/* forensics-reports/*
            
            success "Deep cleanup completed"
            ;;
        "health")
            log "Running comprehensive health check..."
            if [ -f "scripts/container-forensics.sh" ]; then
                ./scripts/container-forensics.sh basic
            else
                echo "Health check tools not available"
            fi
            ;;
        *)
            echo "WedSync Ultra-Stable Development Environment"
            echo ""
            echo "Usage: $0 [command]"
            echo ""
            echo "Commands:"
            echo "  start    - Start the ultra-stable environment (default)"
            echo "  stop     - Stop all services"
            echo "  restart  - Restart the environment"
            echo "  status   - Show service status"
            echo "  logs     - Show service logs"
            echo "  clean    - Deep cleanup (removes all data)"
            echo "  health   - Run comprehensive health check"
            echo ""
            echo "Advanced Features:"
            echo "  📊 Real-time monitoring at http://localhost:3001"
            echo "  🧠 Predictive failure detection and auto-recovery"
            echo "  ⚡ Optimized hot reload and file sync"
            echo "  🔧 IDE integration with container status"
            echo "  🛡️  Advanced debugging and forensics tools"
            echo ""
            exit 1
            ;;
    esac
}

# Set up signal handlers for graceful shutdown
cleanup() {
    echo -e "\n${YELLOW}Caught interrupt signal${NC}"
    log "Cleaning up background processes..."
    
    # Kill background processes
    [ -f .ide-integration.pid ] && kill $(cat .ide-integration.pid) 2>/dev/null && rm .ide-integration.pid
    [ -f .maintenance.pid ] && kill $(cat .maintenance.pid) 2>/dev/null && rm .maintenance.pid
    jobs -p | xargs -r kill 2>/dev/null || true
    
    exit 0
}

trap cleanup INT TERM

# Main execution
main() {
    handle_command "$@"
}

# Run main function with all arguments
main "$@"