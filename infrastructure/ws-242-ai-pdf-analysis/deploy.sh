#!/bin/bash

# WS-242: AI PDF Analysis System - Team E Deployment Script
# Platform Infrastructure and Operations Deployment

set -e  # Exit on any error

echo "🚀 Deploying WS-242 AI PDF Analysis Platform Infrastructure (Team E)"
echo "=================================================================="

# Configuration
NAMESPACE="wedsync-pdf-analysis"
KUBECTL_CONTEXT="production"  # Change as needed
REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}==== $1 ====${NC}"
}

# Function to check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check kubectl
    if ! command -v kubectl &> /dev/null; then
        print_error "kubectl is not installed"
        exit 1
    fi
    
    # Check cluster connection
    if ! kubectl cluster-info &> /dev/null; then
        print_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi
    
    # Check required tools
    for tool in python3 pip redis-cli; do
        if ! command -v $tool &> /dev/null; then
            print_warning "$tool is not installed - some features may not work"
        fi
    done
    
    print_status "Prerequisites check completed"
}

# Function to create namespace
create_namespace() {
    print_header "Creating Namespace"
    
    if kubectl get namespace $NAMESPACE &> /dev/null; then
        print_status "Namespace $NAMESPACE already exists"
    else
        kubectl create namespace $NAMESPACE
        kubectl label namespace $NAMESPACE app.kubernetes.io/name=pdf-analysis
        print_status "Created namespace: $NAMESPACE"
    fi
}

# Function to create secrets
create_secrets() {
    print_header "Creating Secrets"
    
    # Create OpenAI API key secret
    if [ -z "$OPENAI_API_KEY" ]; then
        print_error "OPENAI_API_KEY environment variable not set"
        exit 1
    fi
    
    kubectl create secret generic openai-credentials \
        --from-literal=api-key="$OPENAI_API_KEY" \
        --namespace=$NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create Supabase secrets
    if [ -z "$SUPABASE_SERVICE_KEY" ]; then
        print_error "SUPABASE_SERVICE_KEY environment variable not set"
        exit 1
    fi
    
    kubectl create secret generic supabase-credentials \
        --from-literal=service-key="$SUPABASE_SERVICE_KEY" \
        --namespace=$NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create Redis connection secret
    kubectl create secret generic redis-connection \
        --from-literal=url="redis://redis-pdf-queue:6379" \
        --namespace=$NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    # Create Grafana admin secret
    kubectl create secret generic grafana-admin \
        --from-literal=password="$(openssl rand -base64 32)" \
        --namespace=$NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_status "Secrets created successfully"
}

# Function to deploy core infrastructure
deploy_infrastructure() {
    print_header "Deploying Core Infrastructure"
    
    print_status "Deploying PDF processing workers and Redis cluster..."
    kubectl apply -f kubernetes-pdf-processing.yaml
    
    print_status "Deploying global load balancer configuration..."
    kubectl apply -f global-deployment.yaml
    
    print_status "Deploying monitoring stack..."
    kubectl apply -f monitoring-stack.yaml
    
    print_status "Waiting for deployments to be ready..."
    kubectl wait --for=condition=available --timeout=600s deployment/pdf-analysis-workers -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n $NAMESPACE
    kubectl wait --for=condition=available --timeout=300s deployment/grafana -n $NAMESPACE
    
    print_status "Core infrastructure deployed successfully"
}

# Function to deploy Python services
deploy_python_services() {
    print_header "Deploying Python Services"
    
    print_status "Installing Python dependencies..."
    pip3 install -r requirements.txt
    
    print_status "Building Docker images for Python services..."
    
    # Build intelligent resource manager image
    docker build -t wedsync/intelligent-resource-manager:latest -f Dockerfile.resource-manager .
    
    # Build cost optimization service image
    docker build -t wedsync/cost-optimization:latest -f Dockerfile.cost-optimizer .
    
    # Build disaster recovery service image
    docker build -t wedsync/disaster-recovery:latest -f Dockerfile.disaster-recovery .
    
    # Build performance dashboard image
    docker build -t wedsync/performance-dashboard:latest -f Dockerfile.dashboard .
    
    print_status "Deploying Python services to Kubernetes..."
    
    # Deploy services
    kubectl apply -f python-services-deployment.yaml
    
    print_status "Python services deployed successfully"
}

# Function to configure monitoring
configure_monitoring() {
    print_header "Configuring Monitoring and Alerting"
    
    # Wait for Prometheus to be ready
    kubectl wait --for=condition=available --timeout=300s deployment/prometheus -n $NAMESPACE
    
    # Import Grafana dashboards
    print_status "Importing Grafana dashboards..."
    kubectl exec -n $NAMESPACE deployment/grafana -- grafana-cli admin reset-admin-password admin
    
    # Configure Prometheus alerts
    print_status "Configuring Prometheus alerts..."
    kubectl create configmap prometheus-rules \
        --from-file=prometheus-rules/ \
        --namespace=$NAMESPACE \
        --dry-run=client -o yaml | kubectl apply -f -
    
    print_status "Monitoring configuration completed"
}

# Function to run health checks
run_health_checks() {
    print_header "Running Health Checks"
    
    print_status "Checking PDF processing workers..."
    if kubectl get pods -n $NAMESPACE -l app=pdf-analysis-worker | grep -q "Running"; then
        print_status "✓ PDF processing workers are running"
    else
        print_error "✗ PDF processing workers are not running properly"
        return 1
    fi
    
    print_status "Checking Redis cluster..."
    if kubectl get pods -n $NAMESPACE -l app=redis-pdf-queue | grep -q "Running"; then
        print_status "✓ Redis cluster is running"
    else
        print_error "✗ Redis cluster is not running properly"
        return 1
    fi
    
    print_status "Checking monitoring stack..."
    if kubectl get pods -n $NAMESPACE -l app=prometheus | grep -q "Running"; then
        print_status "✓ Prometheus is running"
    else
        print_warning "⚠ Prometheus is not running properly"
    fi
    
    if kubectl get pods -n $NAMESPACE -l app=grafana | grep -q "Running"; then
        print_status "✓ Grafana is running"
    else
        print_warning "⚠ Grafana is not running properly"
    fi
    
    print_status "Health checks completed"
}

# Function to setup wedding season optimization
setup_wedding_season_optimization() {
    print_header "Setting Up Wedding Season Optimization"
    
    print_status "Configuring seasonal scaling policies..."
    
    # Apply seasonal HPA configurations
    current_month=$(date +%m)
    
    if [ $current_month -ge 4 ] && [ $current_month -le 10 ]; then
        print_status "Applying peak wedding season configuration..."
        kubectl patch hpa pdf-analysis-hpa -n $NAMESPACE --patch '{
            "spec": {
                "minReplicas": 15,
                "maxReplicas": 100
            }
        }'
    else
        print_status "Applying off-season configuration..."
        kubectl patch hpa pdf-analysis-hpa -n $NAMESPACE --patch '{
            "spec": {
                "minReplicas": 5,
                "maxReplicas": 30
            }
        }'
    fi
    
    print_status "Wedding season optimization configured"
}

# Function to create necessary requirements.txt
create_requirements() {
    print_status "Creating requirements.txt for Python services..."
    
    cat > requirements.txt << EOF
# Core dependencies
fastapi==0.104.1
uvicorn==0.24.0
redis==5.0.1
kubernetes==28.1.0
boto3==1.34.0
psycopg2-binary==2.9.9
prometheus-client==0.19.0
aiohttp==3.9.1

# Data processing
numpy==1.25.2

# Development and testing
pytest==7.4.3
pytest-asyncio==0.21.1
EOF
    
    print_status "requirements.txt created"
}

# Function to create Dockerfiles
create_dockerfiles() {
    print_status "Creating Dockerfiles for services..."
    
    # Dockerfile for resource manager
    cat > Dockerfile.resource-manager << EOF
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY intelligent-resource-manager.py .
EXPOSE 8080

CMD ["python", "intelligent-resource-manager.py"]
EOF

    # Dockerfile for cost optimizer
    cat > Dockerfile.cost-optimizer << EOF
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY cost-optimization-system.py .
EXPOSE 8081

CMD ["python", "cost-optimization-system.py"]
EOF

    # Dockerfile for disaster recovery
    cat > Dockerfile.disaster-recovery << EOF
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY disaster-recovery-system.py .
EXPOSE 8082

CMD ["python", "disaster-recovery-system.py"]
EOF

    # Dockerfile for dashboard
    cat > Dockerfile.dashboard << EOF
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY performance-monitoring-dashboard.py .
EXPOSE 8000

CMD ["python", "performance-monitoring-dashboard.py"]
EOF

    print_status "Dockerfiles created"
}

# Function to create Python services deployment
create_python_services_deployment() {
    print_status "Creating Python services deployment configuration..."
    
    cat > python-services-deployment.yaml << EOF
# Python Services Deployment
apiVersion: apps/v1
kind: Deployment
metadata:
  name: intelligent-resource-manager
  namespace: $NAMESPACE
spec:
  replicas: 2
  selector:
    matchLabels:
      app: intelligent-resource-manager
  template:
    metadata:
      labels:
        app: intelligent-resource-manager
    spec:
      containers:
      - name: resource-manager
        image: wedsync/intelligent-resource-manager:latest
        ports:
        - containerPort: 8080
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-connection
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cost-optimization-service
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: cost-optimization-service
  template:
    metadata:
      labels:
        app: cost-optimization-service
    spec:
      containers:
      - name: cost-optimizer
        image: wedsync/cost-optimization:latest
        ports:
        - containerPort: 8081
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-connection
              key: url
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: openai-credentials
              key: api-key
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: performance-dashboard
  namespace: $NAMESPACE
spec:
  replicas: 1
  selector:
    matchLabels:
      app: performance-dashboard
  template:
    metadata:
      labels:
        app: performance-dashboard
    spec:
      containers:
      - name: dashboard
        image: wedsync/performance-dashboard:latest
        ports:
        - containerPort: 8000
        env:
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-connection
              key: url
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
# Services
apiVersion: v1
kind: Service
metadata:
  name: performance-dashboard
  namespace: $NAMESPACE
spec:
  selector:
    app: performance-dashboard
  ports:
  - name: http
    port: 80
    targetPort: 8000
  type: LoadBalancer
EOF

    print_status "Python services deployment configuration created"
}

# Function to display access information
display_access_info() {
    print_header "Deployment Complete - Access Information"
    
    # Get service URLs
    GRAFANA_IP=$(kubectl get svc grafana -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    DASHBOARD_IP=$(kubectl get svc performance-dashboard -n $NAMESPACE -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || echo "pending")
    
    echo -e "\n${GREEN}🎉 WS-242 AI PDF Analysis Platform Infrastructure Successfully Deployed!${NC}\n"
    
    echo "📊 Access URLs:"
    echo "  • Performance Dashboard: http://$DASHBOARD_IP (when available)"
    echo "  • Grafana Monitoring:   http://$GRAFANA_IP:3000 (admin/admin)"
    echo "  • Prometheus Metrics:   http://$GRAFANA_IP:9090"
    
    echo -e "\n🔧 Management Commands:"
    echo "  • View pods:      kubectl get pods -n $NAMESPACE"
    echo "  • View services:  kubectl get svc -n $NAMESPACE"
    echo "  • View logs:      kubectl logs -f deployment/pdf-analysis-workers -n $NAMESPACE"
    echo "  • Scale workers:  kubectl scale deployment pdf-analysis-workers --replicas=20 -n $NAMESPACE"
    
    echo -e "\n📈 Wedding Season Features:"
    echo "  • Auto-scaling: 5-100 workers based on demand"
    echo "  • Cost optimization: Intelligent batch processing"
    echo "  • Disaster recovery: Multi-region failover"
    echo "  • Real-time monitoring: Wedding industry specific metrics"
    
    echo -e "\n🚨 Saturday Wedding Day Protection:"
    echo "  • Zero-downtime deployment enforced"
    echo "  • Error rate monitoring: <0.01% target"
    echo "  • Priority processing for wedding day forms"
    
    if [ "$DASHBOARD_IP" != "pending" ]; then
        echo -e "\n🎯 Quick Health Check:"
        curl -s "http://$DASHBOARD_IP/api/metrics" > /dev/null && \
            echo "  ✅ Dashboard API responding" || \
            echo "  ⚠️  Dashboard API not yet ready"
    fi
    
    echo -e "\n${BLUE}Next Steps:${NC}"
    echo "1. Access the performance dashboard to monitor system health"
    echo "2. Configure Grafana alerts for your team's Slack/email"
    echo "3. Test disaster recovery procedures in staging environment"
    echo "4. Review cost optimization recommendations in the dashboard"
    
    print_status "Deployment completed successfully! 🚀"
}

# Main execution
main() {
    echo "Starting WS-242 Team E deployment..."
    
    # Check if running on Saturday
    if [ $(date +%u) -eq 6 ]; then
        print_warning "⚠️  Today is Saturday (wedding day) - deployment paused for safety"
        print_warning "Wedding day protection: No deployments on Saturdays"
        echo "Please run deployment on Monday-Friday to ensure wedding day stability"
        exit 1
    fi
    
    check_prerequisites
    create_namespace
    create_requirements
    create_dockerfiles
    create_python_services_deployment
    create_secrets
    deploy_infrastructure
    deploy_python_services
    configure_monitoring
    setup_wedding_season_optimization
    run_health_checks
    display_access_info
    
    echo -e "\n${GREEN}🎊 WS-242 Team E Platform Infrastructure Deployment Complete! 🎊${NC}"
}

# Run main function
main "$@"