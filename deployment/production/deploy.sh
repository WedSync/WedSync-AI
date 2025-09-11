#!/bin/bash

# WS-168: Customer Success Dashboard - Production Deployment Script
# Automated deployment script for production environment

set -e  # Exit on any error

# =============================================================================
# CONFIGURATION
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
DEPLOYMENT_DIR="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT="production"
SKIP_TESTS="false"
SKIP_BUILD="false"
BACKUP_ENABLED="true"
ROLLBACK_ON_FAILURE="true"

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_prerequisites() {
    log_info "Checking deployment prerequisites..."
    
    # Check if Docker is installed and running
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        log_error "Docker is not running. Please start Docker first."
        exit 1
    fi
    
    # Check if Docker Compose is available
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if .env.production exists
    if [ ! -f "$DEPLOYMENT_DIR/.env.production" ]; then
        log_error "Production environment file not found at $DEPLOYMENT_DIR/.env.production"
        log_info "Please copy .env.production.template to .env.production and configure it"
        exit 1
    fi
    
    # Check if required environment variables are set
    source "$DEPLOYMENT_DIR/.env.production"
    
    required_vars=("SUPABASE_URL" "SUPABASE_ANON_KEY" "NEXTAUTH_SECRET" "REDIS_PASSWORD")
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "Required environment variable $var is not set in .env.production"
            exit 1
        fi
    done
    
    log_success "Prerequisites check completed"
}

create_backup() {
    if [ "$BACKUP_ENABLED" = "true" ]; then
        log_info "Creating backup before deployment..."
        
        backup_dir="$DEPLOYMENT_DIR/backups/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        
        # Backup current Docker volumes
        if docker volume ls | grep -q wedsync_redis_data; then
            docker run --rm -v wedsync_redis_data:/source:ro -v "$backup_dir":/backup alpine \
                tar czf /backup/redis_data.tar.gz -C /source .
            log_success "Redis data backed up"
        fi
        
        # Backup current logs
        if [ -d "$DEPLOYMENT_DIR/logs" ]; then
            cp -r "$DEPLOYMENT_DIR/logs" "$backup_dir/"
            log_success "Application logs backed up"
        fi
        
        # Create backup metadata
        cat > "$backup_dir/metadata.json" <<EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "version": "${WEDSYNC_VERSION:-unknown}",
  "environment": "$ENVIRONMENT",
  "git_commit": "$(cd "$PROJECT_ROOT" && git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "git_branch": "$(cd "$PROJECT_ROOT" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
}
EOF
        
        log_success "Backup created at $backup_dir"
        echo "$backup_dir" > "$DEPLOYMENT_DIR/.last_backup"
    fi
}

build_application() {
    if [ "$SKIP_BUILD" = "false" ]; then
        log_info "Building application for production..."
        
        cd "$PROJECT_ROOT"
        
        # Build the Docker image
        docker build \
            --build-arg NODE_ENV=production \
            --build-arg NEXT_PUBLIC_ENV=production \
            --tag wedsync:${WEDSYNC_VERSION:-latest} \
            --tag wedsync:production \
            .
        
        log_success "Application built successfully"
    else
        log_warning "Skipping build process"
    fi
}

run_tests() {
    if [ "$SKIP_TESTS" = "false" ]; then
        log_info "Running production readiness tests..."
        
        cd "$PROJECT_ROOT"
        
        # Run unit tests
        npm run test:unit
        
        # Run integration tests
        npm run test:integration
        
        # Run specific WS-168 tests
        npm run test ws-168-dashboard-api
        npm run test ws-168-intervention-workflows-browser
        
        log_success "All tests passed"
    else
        log_warning "Skipping tests"
    fi
}

deploy_services() {
    log_info "Deploying services..."
    
    cd "$DEPLOYMENT_DIR"
    
    # Copy environment file
    cp .env.production .env
    
    # Stop existing services gracefully
    if docker-compose -f docker-compose.prod.yml ps | grep -q wedsync; then
        log_info "Stopping existing services..."
        docker-compose -f docker-compose.prod.yml down --timeout 30
    fi
    
    # Start services
    log_info "Starting production services..."
    docker-compose -f docker-compose.prod.yml up -d
    
    # Wait for services to be ready
    log_info "Waiting for services to be healthy..."
    sleep 30
    
    # Check service health
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:3000/api/health > /dev/null; then
            log_success "Application is healthy"
            break
        fi
        
        log_info "Waiting for application to be ready... ($attempt/$max_attempts)"
        sleep 10
        ((attempt++))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        log_error "Application failed to become healthy within expected time"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            rollback_deployment
        fi
        exit 1
    fi
}

validate_deployment() {
    log_info "Validating deployment..."
    
    # Test application endpoints
    endpoints=(
        "http://localhost:3000/api/health"
        "http://localhost:3000/api/dashboard/customer-success"
        "http://localhost:3000/api/customer-success/health-score"
    )
    
    for endpoint in "${endpoints[@]}"; do
        if curl -f -s "$endpoint" > /dev/null; then
            log_success "✓ $endpoint is responding"
        else
            log_error "✗ $endpoint is not responding"
            return 1
        fi
    done
    
    # Check Docker container status
    if docker-compose -f "$DEPLOYMENT_DIR/docker-compose.prod.yml" ps | grep -q "Up"; then
        log_success "✓ All containers are running"
    else
        log_error "✗ Some containers are not running"
        return 1
    fi
    
    # Test Redis connection
    if docker exec wedsync-redis-prod redis-cli ping | grep -q "PONG"; then
        log_success "✓ Redis is responding"
    else
        log_error "✗ Redis connection failed"
        return 1
    fi
    
    log_success "Deployment validation completed successfully"
}

rollback_deployment() {
    log_warning "Rolling back deployment..."
    
    if [ -f "$DEPLOYMENT_DIR/.last_backup" ]; then
        backup_dir=$(cat "$DEPLOYMENT_DIR/.last_backup")
        
        if [ -d "$backup_dir" ]; then
            log_info "Restoring from backup: $backup_dir"
            
            # Stop current services
            docker-compose -f "$DEPLOYMENT_DIR/docker-compose.prod.yml" down
            
            # Restore Redis data
            if [ -f "$backup_dir/redis_data.tar.gz" ]; then
                docker run --rm -v wedsync_redis_data:/target -v "$backup_dir":/backup alpine \
                    tar xzf /backup/redis_data.tar.gz -C /target
                log_success "Redis data restored"
            fi
            
            # Restore logs
            if [ -d "$backup_dir/logs" ]; then
                cp -r "$backup_dir/logs" "$DEPLOYMENT_DIR/"
                log_success "Application logs restored"
            fi
            
            # Restart services
            docker-compose -f "$DEPLOYMENT_DIR/docker-compose.prod.yml" up -d
            
            log_success "Rollback completed"
        else
            log_error "Backup directory not found: $backup_dir"
        fi
    else
        log_error "No backup information found for rollback"
    fi
}

cleanup_old_images() {
    log_info "Cleaning up old Docker images..."
    
    # Remove unused images (keep last 3 versions)
    docker image prune -f
    
    # Remove old wedsync images (keep current and previous)
    old_images=$(docker images wedsync --format "table {{.Repository}}:{{.Tag}}" | tail -n +2 | tail -n +3)
    if [ -n "$old_images" ]; then
        echo "$old_images" | xargs docker rmi 2>/dev/null || true
    fi
    
    log_success "Image cleanup completed"
}

show_deployment_info() {
    log_info "Deployment Information"
    echo "=========================="
    echo "Environment: $ENVIRONMENT"
    echo "Version: ${WEDSYNC_VERSION:-latest}"
    echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo "Git Commit: $(cd "$PROJECT_ROOT" && git rev-parse HEAD 2>/dev/null || echo 'unknown')"
    echo "Git Branch: $(cd "$PROJECT_ROOT" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
    echo ""
    echo "Services:"
    docker-compose -f "$DEPLOYMENT_DIR/docker-compose.prod.yml" ps
    echo ""
    echo "Access URLs:"
    echo "- Application: http://localhost:3000"
    echo "- Health Check: http://localhost:3000/api/health"
    echo "- Customer Success Dashboard: http://localhost:3000/admin/customer-success"
}

# =============================================================================
# MAIN DEPLOYMENT PROCESS
# =============================================================================

main() {
    log_info "Starting WedSync Customer Success Dashboard Production Deployment"
    log_info "=================================================================="
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-tests)
                SKIP_TESTS="true"
                shift
                ;;
            --skip-build)
                SKIP_BUILD="true"
                shift
                ;;
            --no-backup)
                BACKUP_ENABLED="false"
                shift
                ;;
            --no-rollback)
                ROLLBACK_ON_FAILURE="false"
                shift
                ;;
            --version)
                WEDSYNC_VERSION="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --skip-tests        Skip running tests before deployment"
                echo "  --skip-build        Skip building the application"
                echo "  --no-backup         Skip creating backup before deployment"
                echo "  --no-rollback       Don't rollback on deployment failure"
                echo "  --version VERSION   Specify version to deploy"
                echo "  --help              Show this help message"
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Execute deployment steps
    check_prerequisites
    create_backup
    
    if [ "$SKIP_TESTS" = "false" ]; then
        run_tests
    fi
    
    build_application
    deploy_services
    
    if validate_deployment; then
        cleanup_old_images
        show_deployment_info
        log_success "🎉 Deployment completed successfully!"
    else
        log_error "Deployment validation failed"
        if [ "$ROLLBACK_ON_FAILURE" = "true" ]; then
            rollback_deployment
        fi
        exit 1
    fi
}

# Execute main function with all arguments
main "$@"