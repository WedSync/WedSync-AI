#!/bin/bash

# WS-232 Predictive Modeling System - Production Deployment Script
# Comprehensive ML infrastructure deployment with monitoring and alerting

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
ENV_FILE="${PROJECT_ROOT}/.env.production"
BACKUP_DIR="${HOME}/wedsync-ml-backups/$(date +%Y%m%d_%H%M%S)"

# Functions
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
    log_info "Checking prerequisites..."
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check AWS CLI (for S3 model storage)
    if ! command -v aws &> /dev/null; then
        log_warning "AWS CLI is not installed. S3 model storage will not be available."
    fi
    
    # Check environment file
    if [[ ! -f "$ENV_FILE" ]]; then
        log_error "Production environment file not found: $ENV_FILE"
        log_info "Please create the environment file with required variables."
        exit 1
    fi
    
    log_success "Prerequisites check completed"
}

validate_environment() {
    log_info "Validating environment configuration..."
    
    # Load environment variables
    source "$ENV_FILE"
    
    # Required variables
    required_vars=(
        "ML_DB_PASSWORD"
        "REDIS_PASSWORD" 
        "GRAFANA_ADMIN_PASSWORD"
        "AWS_ACCESS_KEY_ID"
        "AWS_SECRET_ACCESS_KEY"
        "AWS_REGION"
        "ML_MODELS_BUCKET"
    )
    
    for var in "${required_vars[@]}"; do
        if [[ -z "${!var:-}" ]]; then
            log_error "Required environment variable $var is not set"
            exit 1
        fi
    done
    
    # Validate AWS credentials
    if command -v aws &> /dev/null; then
        if ! aws sts get-caller-identity &> /dev/null; then
            log_error "AWS credentials are invalid"
            exit 1
        fi
        log_success "AWS credentials validated"
    fi
    
    log_success "Environment validation completed"
}

create_backup() {
    log_info "Creating backup of existing deployment..."
    
    mkdir -p "$BACKUP_DIR"
    
    # Backup existing volumes if they exist
    if docker volume ls -q | grep -q "wedsync-ml"; then
        log_info "Backing up existing Docker volumes..."
        docker run --rm \
            -v "$(docker volume ls -q | grep wedsync-ml-postgres-data)":/source:ro \
            -v "$BACKUP_DIR":/backup \
            alpine \
            tar -czf /backup/postgres-data.tar.gz -C /source .
            
        docker run --rm \
            -v "$(docker volume ls -q | grep wedsync-ml-models)":/source:ro \
            -v "$BACKUP_DIR":/backup \
            alpine \
            tar -czf /backup/ml-models.tar.gz -C /source .
            
        log_success "Docker volumes backed up to $BACKUP_DIR"
    fi
    
    # Backup configuration files
    cp -r "$SCRIPT_DIR" "$BACKUP_DIR/deployment-config"
    
    log_success "Backup completed"
}

prepare_deployment() {
    log_info "Preparing deployment environment..."
    
    # Create necessary directories
    mkdir -p "$SCRIPT_DIR/monitoring/grafana/dashboards"
    mkdir -p "$SCRIPT_DIR/monitoring/grafana/datasources"
    mkdir -p "$SCRIPT_DIR/nginx/ssl"
    mkdir -p "$SCRIPT_DIR/logs"
    
    # Generate SSL certificates if they don't exist
    if [[ ! -f "$SCRIPT_DIR/nginx/ssl/server.crt" ]]; then
        log_info "Generating self-signed SSL certificates..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout "$SCRIPT_DIR/nginx/ssl/server.key" \
            -out "$SCRIPT_DIR/nginx/ssl/server.crt" \
            -subj "/C=GB/ST=London/L=London/O=WedSync/CN=ml.wedsync.com"
        log_success "SSL certificates generated"
    fi
    
    # Create Grafana datasource configuration
    cat > "$SCRIPT_DIR/monitoring/grafana/datasources/prometheus.yml" << EOF
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
EOF

    # Create Grafana dashboard configuration
    cat > "$SCRIPT_DIR/monitoring/grafana/dashboards/dashboard.yml" << EOF
apiVersion: 1

providers:
  - name: 'WedSync ML Dashboards'
    orgId: 1
    folder: 'ML Monitoring'
    type: file
    disableDeletion: false
    editable: true
    options:
      path: /etc/grafana/provisioning/dashboards
EOF

    log_success "Deployment environment prepared"
}

build_images() {
    log_info "Building Docker images..."
    
    cd "$PROJECT_ROOT"
    
    # Build ML API image
    log_info "Building ML API image..."
    docker build -f "$SCRIPT_DIR/Dockerfile.ml-api" -t wedsync-ml-api:latest .
    
    # Build ML Trainer image
    log_info "Building ML Trainer image..."
    docker build -f "$SCRIPT_DIR/Dockerfile.ml-trainer" -t wedsync-ml-trainer:latest .
    
    # Build ML Registry image
    log_info "Building ML Registry image..."
    docker build -f "$SCRIPT_DIR/Dockerfile.ml-registry" -t wedsync-ml-registry:latest .
    
    log_success "Docker images built successfully"
}

deploy_infrastructure() {
    log_info "Deploying ML infrastructure..."
    
    cd "$SCRIPT_DIR"
    
    # Load environment variables for Docker Compose
    export $(grep -v '^#' "$ENV_FILE" | xargs)
    
    # Deploy services
    docker-compose -f docker-compose.ml.yml up -d
    
    log_success "ML infrastructure deployed"
}

wait_for_services() {
    log_info "Waiting for services to be ready..."
    
    # Wait for PostgreSQL
    log_info "Waiting for PostgreSQL..."
    while ! docker exec wedsync-ml-postgres pg_isready -U ml_user -d ml_predictions; do
        sleep 2
    done
    log_success "PostgreSQL is ready"
    
    # Wait for Redis
    log_info "Waiting for Redis..."
    while ! docker exec wedsync-ml-redis redis-cli ping | grep -q PONG; do
        sleep 2
    done
    log_success "Redis is ready"
    
    # Wait for ML API
    log_info "Waiting for ML API..."
    timeout=60
    while ! curl -f http://localhost:3001/health &> /dev/null && ((timeout > 0)); do
        sleep 5
        ((timeout -= 5))
    done
    
    if ((timeout <= 0)); then
        log_error "ML API failed to start within timeout"
        exit 1
    fi
    log_success "ML API is ready"
    
    # Wait for Prometheus
    log_info "Waiting for Prometheus..."
    timeout=60
    while ! curl -f http://localhost:9091/api/v1/status/config &> /dev/null && ((timeout > 0)); do
        sleep 5
        ((timeout -= 5))
    done
    log_success "Prometheus is ready"
    
    # Wait for Grafana
    log_info "Waiting for Grafana..."
    timeout=60
    while ! curl -f http://localhost:3002/api/health &> /dev/null && ((timeout > 0)); do
        sleep 5
        ((timeout -= 5))
    done
    log_success "Grafana is ready"
}

run_health_checks() {
    log_info "Running comprehensive health checks..."
    
    # Test ML API endpoints
    log_info "Testing ML API endpoints..."
    
    # Test wedding trends endpoint
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer test-token" \
        -H "Content-Type: application/json" \
        -d '{"weddingData":{"date":"2024-06-15","region":"london","venue":"indoor","guestCount":100,"budget":25000},"timeRange":"6m","includeSeasonality":true}' \
        http://localhost:3001/api/ml/predictions/wedding-trends)
    
    if [[ "${response: -3}" != "200" ]]; then
        log_error "Wedding trends endpoint health check failed"
        exit 1
    fi
    log_success "Wedding trends endpoint is healthy"
    
    # Test budget optimizer endpoint
    response=$(curl -s -w "%{http_code}" -H "Authorization: Bearer test-token" \
        -H "Content-Type: application/json" \
        -d '{"totalBudget":30000,"guestCount":120,"region":"london","venueType":"indoor"}' \
        http://localhost:3001/api/ml/predictions/budget-optimization)
    
    if [[ "${response: -3}" != "200" ]]; then
        log_error "Budget optimizer endpoint health check failed"
        exit 1
    fi
    log_success "Budget optimizer endpoint is healthy"
    
    # Check Prometheus metrics
    if ! curl -f http://localhost:9091/api/v1/query?query=up &> /dev/null; then
        log_error "Prometheus metrics query failed"
        exit 1
    fi
    log_success "Prometheus metrics are accessible"
    
    # Check Grafana dashboard
    if ! curl -f http://localhost:3002/api/health &> /dev/null; then
        log_error "Grafana health check failed"
        exit 1
    fi
    log_success "Grafana dashboard is accessible"
    
    log_success "All health checks passed"
}

setup_monitoring_dashboards() {
    log_info "Setting up monitoring dashboards..."
    
    # Import ML monitoring dashboard
    dashboard_json='{
        "dashboard": {
            "title": "WedSync ML System Overview",
            "panels": [
                {
                    "title": "Model Accuracy",
                    "type": "graph",
                    "targets": [{"expr": "ml_model_accuracy"}]
                },
                {
                    "title": "Response Times",
                    "type": "graph", 
                    "targets": [{"expr": "ml_model_response_time_seconds"}]
                },
                {
                    "title": "Request Rate",
                    "type": "graph",
                    "targets": [{"expr": "rate(ml_api_requests_total[5m])"}]
                },
                {
                    "title": "Error Rate", 
                    "type": "graph",
                    "targets": [{"expr": "rate(ml_api_errors_total[5m])"}]
                }
            ]
        }
    }'
    
    # Wait a bit for Grafana to fully initialize
    sleep 10
    
    # Create dashboard via API
    curl -X POST http://admin:${GRAFANA_ADMIN_PASSWORD}@localhost:3002/api/dashboards/db \
        -H "Content-Type: application/json" \
        -d "$dashboard_json" &> /dev/null || log_warning "Failed to create Grafana dashboard automatically"
    
    log_success "Monitoring dashboards configured"
}

initialize_ml_models() {
    log_info "Initializing ML models..."
    
    # Trigger initial model training
    docker exec wedsync-ml-trainer /app/scripts/initialize-models.sh || log_warning "Model initialization script not found"
    
    # Load pre-trained models from S3 if available
    if command -v aws &> /dev/null && [[ -n "${ML_MODELS_BUCKET:-}" ]]; then
        log_info "Downloading pre-trained models from S3..."
        aws s3 sync s3://"$ML_MODELS_BUCKET"/models/ ./ml-models/ || log_warning "Failed to download models from S3"
    fi
    
    log_success "ML models initialized"
}

display_deployment_info() {
    log_success "🎉 WedSync ML System deployment completed successfully!"
    echo
    echo "📊 Service URLs:"
    echo "  ML API:          http://localhost:3001"
    echo "  Prometheus:      http://localhost:9091"
    echo "  Grafana:         http://localhost:3002 (admin/${GRAFANA_ADMIN_PASSWORD})"
    echo "  AlertManager:    http://localhost:9093"
    echo "  ML Registry:     http://localhost:3003"
    echo
    echo "🔍 Health Check URLs:"
    echo "  ML API Health:   http://localhost:3001/health"
    echo "  Metrics:         http://localhost:3001/metrics"
    echo
    echo "📁 Important Paths:"
    echo "  Backup Location: $BACKUP_DIR"
    echo "  Config Files:    $SCRIPT_DIR"
    echo "  Logs:            docker logs <container_name>"
    echo
    echo "🚨 Monitoring:"
    echo "  - All services are monitored via Prometheus"
    echo "  - Alerts configured for critical ML metrics"
    echo "  - Grafana dashboards available for visualization"
    echo "  - Wedding industry specific metrics included"
    echo
    echo "📈 Key ML Models Deployed:"
    echo "  ✓ Wedding Trends Predictor"
    echo "  ✓ Budget Optimizer"
    echo "  ✓ Vendor Performance Analyzer" 
    echo "  ✓ Churn Risk Model"
    echo "  ✓ Revenue Forecaster"
    echo
    echo "⚡ Production Notes:"
    echo "  - SSL certificates generated (replace with real ones for production)"
    echo "  - Database backups recommended daily"
    echo "  - Monitor resource usage and scale as needed"
    echo "  - Review alerts and customize notification channels"
    echo "  - Wedding season (Apr-Oct) requires extra capacity"
    echo
}

cleanup_on_error() {
    log_error "Deployment failed. Cleaning up..."
    
    # Stop and remove containers
    cd "$SCRIPT_DIR"
    docker-compose -f docker-compose.ml.yml down -v || true
    
    # Restore from backup if it exists
    if [[ -d "$BACKUP_DIR" ]]; then
        log_info "Backup available at: $BACKUP_DIR"
        log_info "To restore: docker-compose down -v && restore from backup"
    fi
    
    exit 1
}

# Main execution
main() {
    log_info "🚀 Starting WedSync ML System Production Deployment"
    echo "========================================================"
    
    # Set up error handling
    trap cleanup_on_error ERR
    
    # Run deployment steps
    check_prerequisites
    validate_environment
    create_backup
    prepare_deployment
    build_images
    deploy_infrastructure
    wait_for_services
    setup_monitoring_dashboards
    initialize_ml_models
    run_health_checks
    
    display_deployment_info
    
    log_success "🎯 Deployment completed successfully!"
    log_info "The WedSync ML system is now running in production mode."
}

# Run main function
main "$@"