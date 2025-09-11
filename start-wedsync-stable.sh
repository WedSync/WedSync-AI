#!/bin/bash

# WedSync Bulletproof Startup Script
# This script ensures WedSync starts reliably with comprehensive monitoring

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.monitor.yml"
DASHBOARD_URL="http://localhost:8080"
APP_URL="http://localhost:3000"
RECOVERY_ENABLED=true
SKIP_ANALYSIS=false

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Print banner
print_banner() {
    echo -e "${MAGENTA}"
    echo "██╗    ██╗███████╗██████╗ ███████╗██╗   ██╗███╗   ██╗ ██████╗"
    echo "██║    ██║██╔════╝██╔══██╗██╔════╝╚██╗ ██╔╝████╗  ██║██╔════╝"
    echo "██║ █╗ ██║█████╗  ██║  ██║███████╗ ╚████╔╝ ██╔██╗ ██║██║     "
    echo "██║███╗██║██╔══╝  ██║  ██║╚════██║  ╚██╔╝  ██║╚██╗██║██║     "
    echo "╚███╔███╔╝███████╗██████╔╝███████║   ██║   ██║ ╚████║╚██████╗"
    echo " ╚══╝╚══╝ ╚══════╝╚═════╝ ╚══════╝   ╚═╝   ╚═╝  ╚═══╝ ╚═════╝"
    echo -e "${NC}"
    echo -e "${CYAN}           Bulletproof Wedding Platform Startup${NC}"
    echo -e "${CYAN}         🔍 With Monitoring & Auto-Recovery${NC}"
    echo "=============================================================="
}

# Check system requirements
check_prerequisites() {
    log "🔍 Checking system prerequisites..."
    
    # Check Docker
    if ! command -v docker >/dev/null 2>&1; then
        log_error "Docker is not installed. Please install Docker Desktop."
        exit 1
    fi
    
    if ! docker info >/dev/null 2>&1; then
        log_error "Docker daemon is not running. Please start Docker Desktop."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose >/dev/null 2>&1; then
        log_error "Docker Compose is not installed."
        exit 1
    fi
    
    # Check Node.js (for analysis scripts)
    if ! command -v node >/dev/null 2>&1; then
        log_warn "Node.js not found. Some analysis features will be limited."
    fi
    
    # Check available memory
    if command -v free >/dev/null 2>&1; then
        MEMORY_GB=$(free -g | awk 'NR==2{printf "%.1f", $2}')
        if (( $(echo "$MEMORY_GB < 4" | bc -l) )); then
            log_warn "Low system memory: ${MEMORY_GB}GB. WedSync may be unstable."
            log_warn "Consider increasing Docker memory allocation to 4GB+"
        else
            log_info "System memory: ${MEMORY_GB}GB ✓"
        fi
    fi
    
    # Check disk space
    DISK_USAGE=$(df -h . | awk 'NR==2{print $5}' | sed 's/%//')
    if [ "$DISK_USAGE" -gt 85 ]; then
        log_warn "High disk usage: ${DISK_USAGE}%. May cause build failures."
    else
        log_info "Disk usage: ${DISK_USAGE}% ✓"
    fi
    
    log_success "Prerequisites check completed"
}

# Run dependency analysis
run_dependency_analysis() {
    if [ "$SKIP_ANALYSIS" = true ]; then
        log_info "Skipping dependency analysis (--skip-analysis flag)"
        return
    fi
    
    log "🔬 Running dependency conflict analysis..."
    
    if [ -f "monitoring/scripts/detect-conflicts.js" ] && command -v node >/dev/null 2>&1; then
        node monitoring/scripts/detect-conflicts.js
        
        # Check if quick-fix script was generated
        if [ -f "monitoring/scripts/quick-fix.sh" ]; then
            log_warn "Critical issues detected. Quick fixes available."
            read -p "Apply quick fixes automatically? (y/n): " -r
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                log "🔧 Applying quick fixes..."
                chmod +x monitoring/scripts/quick-fix.sh
                ./monitoring/scripts/quick-fix.sh || log_warn "Some fixes may have failed"
            fi
        fi
    else
        log_warn "Dependency analysis unavailable (Node.js required)"
    fi
}

# Clean up previous runs
cleanup_previous() {
    log "🧹 Cleaning up previous containers..."
    
    # Stop any existing WedSync containers
    docker-compose -f "$COMPOSE_FILE" down --remove-orphans >/dev/null 2>&1 || true
    docker-compose -f "docker-compose.simple.yml" down --remove-orphans >/dev/null 2>&1 || true
    docker-compose -f "docker-compose.yml" down --remove-orphans >/dev/null 2>&1 || true
    
    # Clean up orphaned containers
    docker container prune -f >/dev/null 2>&1 || true
    
    # Remove problematic macOS files
    find . -name "._*" -type f -delete 2>/dev/null || true
    
    log_success "Cleanup completed"
}

# Start monitoring stack
start_monitoring_stack() {
    log "🚀 Starting WedSync with monitoring..."
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        log_error "Monitoring compose file not found: $COMPOSE_FILE"
        log_info "Falling back to simple configuration"
        COMPOSE_FILE="docker-compose.simple.yml"
    fi
    
    # Build and start containers
    log_info "Building containers (this may take a few minutes)..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache app >/dev/null 2>&1 || {
        log_warn "Build failed, trying without cache clear..."
        docker-compose -f "$COMPOSE_FILE" build app
    }
    
    log_info "Starting containers..."
    docker-compose -f "$COMPOSE_FILE" up -d
    
    # Wait for containers to be ready
    log "⏳ Waiting for containers to start..."
    sleep 10
    
    # Check container status
    local failed_containers=()
    local containers=("app" "postgres" "redis")
    
    if [[ "$COMPOSE_FILE" == *"monitor"* ]]; then
        containers+=("monitor" "dashboard")
    fi
    
    for container in "${containers[@]}"; do
        if ! docker-compose -f "$COMPOSE_FILE" ps "$container" | grep -q "Up"; then
            failed_containers+=("$container")
        fi
    done
    
    if [ ${#failed_containers[@]} -gt 0 ]; then
        log_warn "Some containers failed to start: ${failed_containers[*]}"
        log_info "Check logs with: docker-compose -f $COMPOSE_FILE logs"
    else
        log_success "All containers started successfully"
    fi
}

# Wait for application to be ready
wait_for_app() {
    log "⏳ Waiting for WedSync to be ready..."
    
    local max_attempts=60
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$APP_URL" >/dev/null 2>&1; then
            log_success "WedSync is ready! 🎉"
            return 0
        fi
        
        if [ $((attempt % 10)) -eq 0 ]; then
            log_info "Still waiting for WedSync... (attempt $attempt/$max_attempts)"
        fi
        
        sleep 5
        attempt=$((attempt + 1))
    done
    
    log_warn "WedSync is taking longer than expected to start"
    log_info "Check application logs: docker-compose -f $COMPOSE_FILE logs app"
    return 1
}

# Start auto-recovery system
start_auto_recovery() {
    if [ "$RECOVERY_ENABLED" != true ]; then
        log_info "Auto-recovery disabled"
        return
    fi
    
    log "🏥 Starting auto-recovery system..."
    
    if [ -f "monitoring/scripts/auto-recovery.sh" ]; then
        # Start recovery in background
        nohup ./monitoring/scripts/auto-recovery.sh monitor "$COMPOSE_FILE" > wedsync-recovery.log 2>&1 &
        local recovery_pid=$!
        
        echo "$recovery_pid" > wedsync-recovery.pid
        log_info "Auto-recovery system started (PID: $recovery_pid)"
        log_info "Recovery logs: wedsync-recovery.log"
    else
        log_warn "Auto-recovery script not found"
    fi
}

# Show status and URLs
show_status() {
    log "📊 WedSync Status:"
    echo ""
    
    # Container status
    echo -e "${BLUE}Containers:${NC}"
    docker-compose -f "$COMPOSE_FILE" ps
    echo ""
    
    # URLs
    echo -e "${GREEN}🌐 Access URLs:${NC}"
    echo -e "   WedSync App:       ${CYAN}$APP_URL${NC}"
    
    if [[ "$COMPOSE_FILE" == *"monitor"* ]]; then
        echo -e "   Monitoring Dashboard: ${CYAN}$DASHBOARD_URL${NC}"
    fi
    
    echo ""
    
    # Useful commands
    echo -e "${YELLOW}💡 Useful Commands:${NC}"
    echo -e "   View logs:         ${CYAN}docker-compose -f $COMPOSE_FILE logs -f app${NC}"
    echo -e "   Restart app:       ${CYAN}docker-compose -f $COMPOSE_FILE restart app${NC}"
    echo -e "   Stop all:          ${CYAN}docker-compose -f $COMPOSE_FILE down${NC}"
    echo -e "   Run diagnostics:   ${CYAN}./monitoring/scripts/diagnose-issues.sh${NC}"
    
    if [ -f "wedsync-recovery.pid" ]; then
        echo -e "   Stop auto-recovery: ${CYAN}kill \$(cat wedsync-recovery.pid)${NC}"
    fi
    
    echo ""
}

# Open browser windows
open_browser() {
    log "🌐 Opening browser windows..."
    
    # Wait a moment for services to be ready
    sleep 3
    
    # Open main application
    if command -v open >/dev/null 2>&1; then
        # macOS
        open "$APP_URL" >/dev/null 2>&1 &
        if [[ "$COMPOSE_FILE" == *"monitor"* ]]; then
            open "$DASHBOARD_URL" >/dev/null 2>&1 &
        fi
    elif command -v xdg-open >/dev/null 2>&1; then
        # Linux
        xdg-open "$APP_URL" >/dev/null 2>&1 &
        if [[ "$COMPOSE_FILE" == *"monitor"* ]]; then
            xdg-open "$DASHBOARD_URL" >/dev/null 2>&1 &
        fi
    else
        log_info "Please manually open: $APP_URL"
        if [[ "$COMPOSE_FILE" == *"monitor"* ]]; then
            log_info "Monitoring dashboard: $DASHBOARD_URL"
        fi
    fi
}

# Handle shutdown
cleanup_on_exit() {
    log ""
    log "🛑 Shutting down WedSync..."
    
    # Stop auto-recovery
    if [ -f "wedsync-recovery.pid" ]; then
        local recovery_pid=$(cat wedsync-recovery.pid)
        if kill -0 "$recovery_pid" 2>/dev/null; then
            log_info "Stopping auto-recovery system..."
            kill "$recovery_pid"
        fi
        rm -f wedsync-recovery.pid
    fi
    
    # Stop containers
    docker-compose -f "$COMPOSE_FILE" down
    
    log_success "WedSync stopped. Goodbye! 👋"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --simple)
                COMPOSE_FILE="docker-compose.simple.yml"
                RECOVERY_ENABLED=false
                log_info "Using simple configuration (no monitoring)"
                ;;
            --no-recovery)
                RECOVERY_ENABLED=false
                log_info "Auto-recovery disabled"
                ;;
            --skip-analysis)
                SKIP_ANALYSIS=true
                log_info "Dependency analysis will be skipped"
                ;;
            --no-browser)
                NO_BROWSER=true
                log_info "Browser windows will not be opened"
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
        shift
    done
}

# Show help
show_help() {
    echo ""
    echo "WedSync Bulletproof Startup Script"
    echo ""
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --simple        Use simple configuration without monitoring"
    echo "  --no-recovery   Disable automatic recovery system"  
    echo "  --skip-analysis Skip dependency conflict analysis"
    echo "  --no-browser    Don't open browser windows"
    echo "  --help, -h      Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Full monitoring setup"
    echo "  $0 --simple           # Basic setup only"
    echo "  $0 --no-recovery      # With monitoring but no auto-recovery"
    echo ""
}

# Main execution
main() {
    print_banner
    
    # Parse command line arguments
    parse_args "$@"
    
    # Set up signal handlers
    trap cleanup_on_exit SIGINT SIGTERM
    
    # Run startup sequence
    check_prerequisites
    run_dependency_analysis
    cleanup_previous
    start_monitoring_stack
    
    if wait_for_app; then
        start_auto_recovery
        show_status
        
        if [ "$NO_BROWSER" != true ]; then
            open_browser
        fi
        
        log_success "WedSync is running with bulletproof monitoring! 🚀"
        log_info "Press Ctrl+C to stop all services"
        
        # Keep script running
        while true; do
            sleep 60
            # Optional: Add periodic health checks here
        done
    else
        log_error "Failed to start WedSync properly"
        log_info "Run diagnostics: ./monitoring/scripts/diagnose-issues.sh"
        exit 1
    fi
}

# Run the main function with all arguments
main "$@"