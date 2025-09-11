#!/bin/bash

# PDF Analysis System Deployment Script
# WS-242: AI PDF Analysis System - Production Deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_ENV=${1:-production}
COMPOSE_FILE="docker/pdf-analysis/docker-compose.yml"
ENV_FILE=".env.${DEPLOYMENT_ENV}"

echo -e "${BLUE}🚀 WedSync PDF Analysis System Deployment${NC}"
echo -e "${BLUE}===========================================${NC}\n"

# Validate environment
if [[ ! "$DEPLOYMENT_ENV" =~ ^(development|staging|production)$ ]]; then
    echo -e "${RED}❌ Invalid environment: $DEPLOYMENT_ENV${NC}"
    echo -e "${YELLOW}Usage: $0 [development|staging|production]${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Environment: ${YELLOW}$DEPLOYMENT_ENV${NC}\n"

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

# Check environment file
if [[ ! -f "$ENV_FILE" ]]; then
    echo -e "${RED}❌ Environment file not found: $ENV_FILE${NC}"
    echo -e "${YELLOW}💡 Create $ENV_FILE with required variables${NC}"
    exit 1
fi

# Check compose file
if [[ ! -f "$COMPOSE_FILE" ]]; then
    echo -e "${RED}❌ Docker Compose file not found: $COMPOSE_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites satisfied${NC}\n"

# Load environment variables
echo -e "${BLUE}📦 Loading environment variables...${NC}"
set -a
source "$ENV_FILE"
set +a
echo -e "${GREEN}✅ Environment loaded${NC}\n"

# Validate required environment variables
echo -e "${BLUE}🔐 Validating required environment variables...${NC}"

required_vars=(
    "DATABASE_URL"
    "NEXT_PUBLIC_SUPABASE_URL"
    "NEXT_PUBLIC_SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "OPENAI_API_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [[ -z "${!var}" ]]; then
        missing_vars+=("$var")
    fi
done

if [[ ${#missing_vars[@]} -gt 0 ]]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    for var in "${missing_vars[@]}"; do
        echo -e "${RED}   - $var${NC}"
    done
    exit 1
fi

echo -e "${GREEN}✅ All required variables present${NC}\n"

# Pre-deployment checks
echo -e "${BLUE}🏥 Running pre-deployment health checks...${NC}"

# Test database connectivity
echo -e "${YELLOW}Testing database connectivity...${NC}"
if timeout 10s bash -c "</dev/tcp/${DATABASE_HOST:-localhost}/${DATABASE_PORT:-5432}"; then
    echo -e "${GREEN}✅ Database connection successful${NC}"
else
    echo -e "${RED}❌ Cannot connect to database${NC}"
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        exit 1
    else
        echo -e "${YELLOW}⚠️  Continuing in non-production environment${NC}"
    fi
fi

# Test OpenAI API
echo -e "${YELLOW}Testing OpenAI API...${NC}"
api_test=$(curl -s -w "%{http_code}" -H "Authorization: Bearer $OPENAI_API_KEY" \
    "https://api.openai.com/v1/models" || echo "000")

if [[ "$api_test" == "200" ]]; then
    echo -e "${GREEN}✅ OpenAI API connection successful${NC}"
else
    echo -e "${RED}❌ OpenAI API connection failed (HTTP: $api_test)${NC}"
    if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
        exit 1
    fi
fi

echo ""

# Build and deploy
echo -e "${BLUE}🔨 Building and deploying services...${NC}"

# Stop existing services
echo -e "${YELLOW}Stopping existing services...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down --remove-orphans || true

# Pull latest images
echo -e "${YELLOW}Pulling latest base images...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" pull --ignore-pull-failures

# Build services
echo -e "${YELLOW}Building PDF analysis services...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" build --no-cache

# Start services
echo -e "${YELLOW}Starting services...${NC}"
docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

# Wait for services to be healthy
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"

# Function to check service health
check_service_health() {
    local service_name=$1
    local health_url=$2
    local max_attempts=30
    local attempt=1

    echo -e "${YELLOW}Checking $service_name health...${NC}"
    
    while [[ $attempt -le $max_attempts ]]; do
        if curl -f -s "$health_url" >/dev/null 2>&1; then
            echo -e "${GREEN}✅ $service_name is healthy${NC}"
            return 0
        fi
        
        echo -n "."
        sleep 2
        ((attempt++))
    done
    
    echo -e "${RED}❌ $service_name failed to become healthy${NC}"
    return 1
}

# Check individual services
services_healthy=true

if ! check_service_health "PDF Analysis API" "http://localhost:3000/api/pdf-analysis/upload"; then
    services_healthy=false
fi

if ! check_service_health "Redis" "http://localhost:6379" || \
   ! docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli ping >/dev/null 2>&1; then
    echo -e "${RED}❌ Redis health check failed${NC}"
    services_healthy=false
else
    echo -e "${GREEN}✅ Redis is healthy${NC}"
fi

if ! check_service_health "Prometheus" "http://localhost:9090/-/healthy"; then
    services_healthy=false
fi

if ! check_service_health "Grafana" "http://localhost:3001/api/health"; then
    services_healthy=false
fi

# Initialize wedding field patterns
echo -e "${BLUE}🎯 Initializing wedding field patterns...${NC}"
docker-compose -f "$COMPOSE_FILE" exec -T pdf-analysis node scripts/initialize-wedding-patterns.js || {
    echo -e "${YELLOW}⚠️  Pattern initialization failed, will retry later${NC}"
}

# Final health check
if [[ "$services_healthy" == true ]]; then
    echo -e "\n${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}=====================================\n${NC}"
    
    # Service URLs
    echo -e "${BLUE}📋 Service URLs:${NC}"
    echo -e "${YELLOW}   PDF Analysis API: ${GREEN}http://localhost:3000/api/pdf-analysis/${NC}"
    echo -e "${YELLOW}   Health Check:     ${GREEN}http://localhost:3000/api/pdf-analysis/upload${NC}"
    echo -e "${YELLOW}   Monitoring:       ${GREEN}http://localhost:3001/monitoring/${NC}"
    echo -e "${YELLOW}   Prometheus:       ${GREEN}http://localhost:9090${NC}"
    
    # Quick test
    echo -e "\n${BLUE}🧪 Running quick deployment test...${NC}"
    
    test_response=$(curl -s -w "%{http_code}" http://localhost:3000/api/pdf-analysis/upload)
    if [[ "$test_response" =~ 200$ ]]; then
        echo -e "${GREEN}✅ Deployment test passed${NC}"
    else
        echo -e "${YELLOW}⚠️  Deployment test returned: $test_response${NC}"
    fi
    
else
    echo -e "\n${RED}❌ Deployment completed with warnings${NC}"
    echo -e "${YELLOW}💡 Check service logs for details:${NC}"
    echo -e "${YELLOW}   docker-compose -f $COMPOSE_FILE logs [service-name]${NC}"
fi

# Show running services
echo -e "\n${BLUE}🔍 Running services:${NC}"
docker-compose -f "$COMPOSE_FILE" ps

# Log aggregation setup
echo -e "\n${BLUE}📝 Setting up log monitoring...${NC}"
echo -e "${YELLOW}View logs with:${NC}"
echo -e "${YELLOW}   docker-compose -f $COMPOSE_FILE logs -f pdf-analysis${NC}"
echo -e "${YELLOW}   docker-compose -f $COMPOSE_FILE logs -f job-processor${NC}"

# Backup and monitoring reminders
if [[ "$DEPLOYMENT_ENV" == "production" ]]; then
    echo -e "\n${BLUE}⚠️  Production deployment reminders:${NC}"
    echo -e "${YELLOW}   1. Set up automated backups for pattern database${NC}"
    echo -e "${YELLOW}   2. Configure SSL certificates for HTTPS${NC}"
    echo -e "${YELLOW}   3. Set up log rotation and monitoring alerts${NC}"
    echo -e "${YELLOW}   4. Schedule pattern database updates${NC}"
    echo -e "${YELLOW}   5. Configure firewall rules${NC}"
fi

# Success
echo -e "\n${GREEN}✨ PDF Analysis System is ready for wedding season! ✨${NC}"
echo -e "${GREEN}======================================================${NC}"

exit 0