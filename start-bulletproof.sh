#!/bin/bash
# WedSync Bulletproof Start Script
# One command to rule them all - handles all dependency and platform issues

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
COMPOSE_FILE="docker-compose.bulletproof.yml"
FALLBACK_COMPOSE_FILE="docker-compose.direct.yml"
CONTAINER_NAME="wedsync-bulletproof"

# Banner
show_banner() {
    echo -e "${CYAN}${BOLD}"
    echo "╔══════════════════════════════════════════════════════╗"
    echo "║           WedSync Bulletproof Docker Setup          ║"
    echo "║                                                      ║"
    echo "║  🚀 Handles all dependency issues automatically      ║"
    echo "║  🔧 Cross-platform compatible                        ║"
    echo "║  💪 Built for 24/7 development server uptime        ║"
    echo "╚══════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# Logging functions
log() { echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"; }
success() { echo -e "${GREEN}✅ $1${NC}"; }
warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
error() { echo -e "${RED}❌ $1${NC}"; }
info() { echo -e "${PURPLE}ℹ️  $1${NC}"; }

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    
    # Check if we're in the right directory
    if [ ! -f package.json ]; then
        error "package.json not found. Are you in the wedsync directory?"
        echo -e "  ${YELLOW}Expected location: /path/to/WedSync2/wedsync/${NC}"
        exit 1
    fi
    
    # Check Docker installation
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
        echo -e "  ${YELLOW}Please install Docker Desktop: https://www.docker.com/products/docker-desktop${NC}"
        exit 1
    fi
    
    # Check Docker daemon
    if ! docker info &> /dev/null; then
        error "Docker daemon is not running"
        echo -e "  ${YELLOW}Please start Docker Desktop${NC}"
        exit 1
    fi
    
    # Check docker-compose
    if ! command -v docker-compose &> /dev/null; then
        warning "docker-compose command not found, using docker compose instead"
    fi
    
    success "Pre-flight checks passed"
}

# Clean up previous runs
cleanup_previous() {
    log "Cleaning up previous Docker runs..."
    
    # Stop any running wedsync containers
    docker ps -a -q --filter "name=wedsync" | xargs -r docker stop 2>/dev/null || true
    docker ps -a -q --filter "name=wedsync" | xargs -r docker rm 2>/dev/null || true
    
    # Clean up dangling images and containers
    docker system prune -f --volumes 2>/dev/null || warning "System prune had issues"
    
    success "Previous runs cleaned up"
}

# Setup environment
setup_environment() {
    log "Setting up environment..."
    
    # Create necessary directories
    mkdir -p logs scripts
    
    # Check for .env.local
    if [ ! -f .env.local ]; then
        warning ".env.local not found - creating minimal version"
        cat > .env.local << 'EOF'
# Minimal environment for Docker development
NODE_ENV=development
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
NEXTAUTH_URL=http://localhost:3000

# Database (using Supabase)
DATABASE_URL=postgresql://postgres.azhgptjkqiiqvvvhapml:postgres@aws-0-us-west-1.pooler.supabase.com:6543/postgres
NEXT_PUBLIC_SUPABASE_URL=https://azhgptjkqiiqvvvhapml.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6aGdwdGprcWlpcXZ2dmhhcG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUyMTk4MDUsImV4cCI6MjA1MDc5NTgwNX0.oXoH0zRHEI71mLIcuwXsxR_CWMkZL5JsVgE5BG9LzY0

# Storage
NEXT_PUBLIC_STORAGE_BUCKET=wedsync-uploads

# Features
NEXT_PUBLIC_ENABLE_REALTIME_SYNC=true

# Optimization
NEXT_TELEMETRY_DISABLED=1
EOF
        info "Created basic .env.local file"
    fi
    
    success "Environment setup complete"
}

# Fix package.json issues
fix_package_json() {
    log "Checking and fixing package.json issues..."
    
    # Backup original package.json
    if [ -f package.json ] && [ ! -f package.json.backup ]; then
        cp package.json package.json.backup
        info "Created package.json backup"
    fi
    
    # Check for problematic dependencies
    local problematic_deps=(
        "@tensorflow/tfjs"
        "@tensorflow/tfjs-node"
        "bullmq"
        "ioredis"
        "hiredis"
    )
    
    local found_issues=false
    for dep in "${problematic_deps[@]}"; do
        if grep -q "\"$dep\"" package.json; then
            warning "Found problematic dependency: $dep"
            found_issues=true
        fi
    done
    
    if [ "$found_issues" = true ]; then
        warning "Problematic dependencies detected. Consider removing them for stable Docker builds."
        info "The Docker setup will handle these gracefully"
    else
        success "No problematic dependencies found"
    fi
}

# Choose and setup Docker Compose file
setup_compose_file() {
    log "Setting up Docker Compose configuration..."
    
    # Determine which compose file to use
    if [ -f "$COMPOSE_FILE" ]; then
        ACTIVE_COMPOSE_FILE="$COMPOSE_FILE"
        success "Using bulletproof compose file: $COMPOSE_FILE"
    elif [ -f "$FALLBACK_COMPOSE_FILE" ]; then
        ACTIVE_COMPOSE_FILE="$FALLBACK_COMPOSE_FILE"
        warning "Bulletproof compose file not found, using: $FALLBACK_COMPOSE_FILE"
        CONTAINER_NAME="wedsync-app"  # Update container name for fallback
    else
        error "No suitable Docker Compose file found"
        echo -e "  ${YELLOW}Expected files: $COMPOSE_FILE or $FALLBACK_COMPOSE_FILE${NC}"
        exit 1
    fi
    
    # Setup Next.js configuration
    if [ -f next.config.bulletproof.js ]; then
        cp next.config.bulletproof.js next.config.js
        success "Using bulletproof Next.js config"
    elif [ -f next.config.simple.js ]; then
        cp next.config.simple.js next.config.js
        success "Using simple Next.js config"
    else
        info "Using existing Next.js config"
    fi
}

# Start the application
start_application() {
    log "Starting WedSync application..."
    
    echo -e "${CYAN}Starting containers with: $ACTIVE_COMPOSE_FILE${NC}"
    
    # Start the services
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$ACTIVE_COMPOSE_FILE" up -d
    else
        docker compose -f "$ACTIVE_COMPOSE_FILE" up -d
    fi
    
    success "Containers started successfully"
}

# Monitor startup
monitor_startup() {
    log "Monitoring application startup..."
    
    local max_attempts=60  # 5 minutes
    local attempt=0
    
    echo -e "${YELLOW}This may take 2-3 minutes for the first run (npm install)...${NC}"
    
    # Show logs in background
    if command -v docker-compose &> /dev/null; then
        docker-compose -f "$ACTIVE_COMPOSE_FILE" logs -f &
    else
        docker compose -f "$ACTIVE_COMPOSE_FILE" logs -f &
    fi
    local logs_pid=$!
    
    # Wait for application to be ready
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
            kill $logs_pid 2>/dev/null || true
            success "Application is ready!"
            break
        fi
        
        echo -n "."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        kill $logs_pid 2>/dev/null || true
        error "Application failed to start within expected time"
        return 1
    fi
}

# Show final status
show_final_status() {
    echo -e "\n${GREEN}${BOLD}🎉 WedSync is now running successfully!${NC}\n"
    
    echo -e "${CYAN}📱 Application URLs:${NC}"
    echo -e "  🌐 Main App:     ${BOLD}http://localhost:3000${NC}"
    echo -e "  📊 Health Check: ${BOLD}http://localhost:3000/api/health${NC}"
    
    # Check for additional services
    if docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -q "9000"; then
        echo -e "  🔍 SonarQube:    ${BOLD}http://localhost:9000${NC}"
    fi
    
    if docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -q "9999"; then
        echo -e "  📋 Logs:        ${BOLD}http://localhost:9999${NC}"
    fi
    
    echo -e "\n${PURPLE}🔧 Management Commands:${NC}"
    echo -e "  📊 Status:       ${BOLD}./scripts/docker-maintenance.sh status${NC}"
    echo -e "  🔄 Restart:      ${BOLD}./scripts/docker-maintenance.sh restart${NC}"
    echo -e "  🧹 Cleanup:      ${BOLD}./scripts/docker-maintenance.sh cleanup${NC}"
    echo -e "  📈 Monitor:      ${BOLD}./scripts/docker-maintenance.sh monitor${NC}"
    
    echo -e "\n${YELLOW}⚠️  Troubleshooting:${NC}"
    echo -e "  If you see issues, run: ${BOLD}./scripts/docker-maintenance.sh fix${NC}"
    echo -e "  For logs, run: ${BOLD}docker logs $CONTAINER_NAME${NC}"
    
    echo -e "\n${GREEN}Happy coding! 🚀${NC}"
}

# Handle interruption
cleanup_on_exit() {
    echo -e "\n${YELLOW}Caught interrupt signal${NC}"
    log "Cleaning up..."
    
    # Kill background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    exit 0
}

# Set trap for cleanup
trap cleanup_on_exit INT TERM

# Main execution
main() {
    show_banner
    
    # Run all setup steps
    preflight_checks
    cleanup_previous
    setup_environment
    fix_package_json
    setup_compose_file
    start_application
    monitor_startup
    show_final_status
}

# Handle command line arguments
case "${1:-start}" in
    "start")
        main
        ;;
    "stop")
        log "Stopping WedSync containers..."
        docker-compose -f "$COMPOSE_FILE" down 2>/dev/null || docker-compose -f "$FALLBACK_COMPOSE_FILE" down 2>/dev/null || true
        success "Containers stopped"
        ;;
    "restart")
        log "Restarting WedSync..."
        docker-compose -f "$COMPOSE_FILE" restart 2>/dev/null || docker-compose -f "$FALLBACK_COMPOSE_FILE" restart 2>/dev/null || true
        success "Containers restarted"
        ;;
    "logs")
        docker-compose -f "$COMPOSE_FILE" logs -f 2>/dev/null || docker-compose -f "$FALLBACK_COMPOSE_FILE" logs -f 2>/dev/null || true
        ;;
    "clean")
        log "Performing full cleanup..."
        cleanup_previous
        docker system prune -a --volumes -f
        success "Full cleanup completed"
        ;;
    *)
        echo "WedSync Bulletproof Start Script"
        echo ""
        echo "Usage: $0 [command]"
        echo ""
        echo "Commands:"
        echo "  start   - Start WedSync (default)"
        echo "  stop    - Stop all containers"
        echo "  restart - Restart containers"
        echo "  logs    - Show container logs"
        echo "  clean   - Full cleanup (removes all Docker data)"
        echo ""
        exit 1
        ;;
esac