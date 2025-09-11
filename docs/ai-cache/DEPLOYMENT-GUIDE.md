# WS-241 AI Caching System - Production Deployment Guide

## 🚀 Quick Deployment Checklist

### Pre-Deployment (1 hour before)
- [ ] Run all tests: `npm run test:ai-cache`
- [ ] Backup current database: `npm run db:backup`
- [ ] Verify staging environment matches production
- [ ] Alert on-call team about deployment
- [ ] Set maintenance mode if required

### Deployment Steps (30 minutes)
- [ ] Deploy database migrations
- [ ] Update application code
- [ ] Restart cache services
- [ ] Verify system health
- [ ] Remove maintenance mode
- [ ] Monitor for 1 hour post-deployment

### Post-Deployment (30 minutes)
- [ ] Run smoke tests
- [ ] Verify performance metrics
- [ ] Check error logs
- [ ] Update deployment log
- [ ] Notify team of completion

## 📋 Detailed Deployment Steps

### Step 1: Database Migration (5 minutes)

```bash
# 1.1 Connect to production database
export DATABASE_URL="postgresql://user:pass@prod-db:5432/wedsync"

# 1.2 Apply AI cache migrations
npx supabase migration up --linked

# 1.3 Verify migration success
psql $DATABASE_URL -c "
SELECT table_name 
FROM information_schema.tables 
WHERE table_name LIKE 'ai_cache_%';"

# Expected output: 7 tables
# - ai_cache_entries
# - ai_cache_performance_metrics  
# - ai_cache_seasonal_configs
# - ai_cache_location_configs
# - ai_cache_vendor_configs
# - ai_cache_audit_logs
# - ai_cache_gdpr_requests
```

### Step 2: Environment Configuration (5 minutes)

```bash
# 2.1 Update production environment variables
cat >> /etc/wedsync/.env.prod << EOF
# AI Cache Configuration
AI_CACHE_ENABLED=true
AI_CACHE_MEMORY_SIZE_MB=2048
AI_CACHE_REDIS_URL=redis://prod-redis-cluster:6379
AI_CACHE_DEFAULT_TTL=3600
AI_CACHE_MAX_ENTRIES=10000000

# Seasonal Scaling (IMPORTANT: Enable for peak season)
AI_CACHE_SEASONAL_SCALING_ENABLED=true
AI_CACHE_AUTO_SCALE_THRESHOLD=0.8
AI_CACHE_SCALE_UP_FACTOR=3.0
AI_CACHE_SCALE_DOWN_FACTOR=0.7

# Performance Monitoring
AI_CACHE_MONITORING_ENABLED=true
AI_CACHE_ALERT_THRESHOLD_MS=50
AI_CACHE_HIT_RATE_ALERT_THRESHOLD=0.85

# Security & Compliance
AI_CACHE_ENCRYPTION_ENABLED=true
AI_CACHE_AUDIT_LOGGING_ENABLED=true
AI_CACHE_GDPR_RETENTION_DAYS=2555
EOF

# 2.2 Verify environment variables loaded
source /etc/wedsync/.env.prod
echo "AI_CACHE_ENABLED: $AI_CACHE_ENABLED"
```

### Step 3: Redis Cluster Setup (10 minutes)

```bash
# 3.1 Deploy Redis cluster for high availability
kubectl apply -f - << EOF
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-cache-cluster
spec:
  serviceName: redis-cache
  replicas: 3
  selector:
    matchLabels:
      app: redis-cache
  template:
    metadata:
      labels:
        app: redis-cache
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        ports:
        - containerPort: 6379
        resources:
          requests:
            memory: "4Gi"
            cpu: "1"
          limits:
            memory: "8Gi" 
            cpu: "2"
        volumeMounts:
        - name: redis-data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: redis-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
EOF

# 3.2 Wait for Redis cluster to be ready
kubectl wait --for=condition=ready pod -l app=redis-cache --timeout=300s

# 3.3 Verify Redis connectivity
kubectl exec -it redis-cache-cluster-0 -- redis-cli ping
# Expected: PONG
```

### Step 4: Application Deployment (10 minutes)

```bash
# 4.1 Build production Docker image
docker build -t wedsync-ai-cache:v1.0.0 \
  --build-arg NODE_ENV=production \
  --build-arg AI_CACHE_ENABLED=true \
  .

# 4.2 Tag and push to registry
docker tag wedsync-ai-cache:v1.0.0 registry.wedsync.com/wedsync-ai-cache:v1.0.0
docker push registry.wedsync.com/wedsync-ai-cache:v1.0.0

# 4.3 Deploy to Kubernetes
kubectl set image deployment/wedsync-api \
  wedsync-api=registry.wedsync.com/wedsync-ai-cache:v1.0.0

# 4.4 Wait for rollout to complete
kubectl rollout status deployment/wedsync-api --timeout=600s

# 4.5 Verify pods are running
kubectl get pods -l app=wedsync-api
```

### Step 5: Health Verification (5 minutes)

```bash
# 5.1 Check API health endpoint
curl -f https://api.wedsync.com/health/cache || exit 1

# 5.2 Test cache functionality
curl -X POST https://api.wedsync.com/api/ai-cache/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_TEST_TOKEN" \
  -d '{
    "query": "Best photographers in NYC",
    "weddingContext": {
      "location": "New York, NY",
      "vendorTypes": ["photographer"],
      "budget": 5000
    }
  }'

# 5.3 Verify cache statistics
curl https://api.wedsync.com/api/ai-cache/statistics \
  -H "Authorization: Bearer $API_TEST_TOKEN"

# Expected response should include:
# - hitRate: should be > 0 after warmup
# - averageResponseTime: should be < 100ms
# - cacheSize: should show entries
```

## 🔧 Configuration Templates

### Production Docker Compose
```yaml
version: '3.8'
services:
  wedsync-api:
    image: registry.wedsync.com/wedsync-ai-cache:v1.0.0
    environment:
      - NODE_ENV=production
      - AI_CACHE_ENABLED=true
      - AI_CACHE_MEMORY_SIZE_MB=2048
      - AI_CACHE_REDIS_URL=redis://redis-cluster:6379
      - DATABASE_URL=postgresql://user:pass@postgres:5432/wedsync
    depends_on:
      - redis-cluster
      - postgres
    deploy:
      replicas: 3
      resources:
        limits:
          memory: 4G
          cpus: '2'
        reservations:
          memory: 2G
          cpus: '1'

  redis-cluster:
    image: redis:7-alpine
    command: redis-server --maxmemory 8gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    deploy:
      replicas: 3

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: wedsync
      POSTGRES_USER: wedsync_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data

volumes:
  redis-data:
  postgres-data:
```

### Nginx Load Balancer Configuration
```nginx
upstream wedsync_ai_cache {
    least_conn;
    server wedsync-api-1:3000 max_fails=3 fail_timeout=30s;
    server wedsync-api-2:3000 max_fails=3 fail_timeout=30s;
    server wedsync-api-3:3000 max_fails=3 fail_timeout=30s;
}

server {
    listen 443 ssl http2;
    server_name api.wedsync.com;
    
    # SSL configuration
    ssl_certificate /etc/ssl/certs/wedsync.crt;
    ssl_certificate_key /etc/ssl/private/wedsync.key;
    
    # Cache settings for AI cache endpoints
    location /api/ai-cache/query {
        proxy_pass http://wedsync_ai_cache;
        proxy_cache_bypass $http_cache_control;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_timeout 30s;
        proxy_read_timeout 30s;
        
        # Rate limiting
        limit_req zone=api burst=100 nodelay;
    }
    
    location /api/ai-cache/ {
        proxy_pass http://wedsync_ai_cache;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## 📊 Monitoring Setup

### Prometheus Configuration
```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "/etc/prometheus/ai-cache-rules.yml"

scrape_configs:
  - job_name: 'wedsync-ai-cache'
    static_configs:
      - targets: ['wedsync-api-1:3000', 'wedsync-api-2:3000', 'wedsync-api-3:3000']
    scrape_interval: 10s
    metrics_path: '/api/metrics'
    scrape_timeout: 5s

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Alert Rules
```yaml
groups:
- name: ai-cache-alerts
  rules:
  - alert: CacheHitRateLow
    expr: ai_cache_hit_rate < 0.85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "AI cache hit rate is below 85%"
      description: "Hit rate is {{ $value }}%, investigate cache performance"

  - alert: CacheResponseTimeSlow
    expr: ai_cache_response_time_p95 > 100
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "AI cache response time is too slow"
      description: "P95 response time is {{ $value }}ms, should be <100ms"

  - alert: CacheMemoryHigh
    expr: ai_cache_memory_usage > 0.90
    for: 1m
    labels:
      severity: warning
    annotations:
      summary: "AI cache memory usage is high"
      description: "Memory usage is {{ $value }}%, consider scaling up"
```

### Grafana Dashboard JSON
```json
{
  "dashboard": {
    "title": "AI Cache Performance Dashboard",
    "panels": [
      {
        "title": "Cache Hit Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "ai_cache_hit_rate",
            "legendFormat": "Hit Rate %"
          }
        ],
        "thresholds": {
          "steps": [
            {"color": "red", "value": 0},
            {"color": "yellow", "value": 80},
            {"color": "green", "value": 85}
          ]
        }
      },
      {
        "title": "Response Time Distribution",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, ai_cache_response_time_bucket)",
            "legendFormat": "P50"
          },
          {
            "expr": "histogram_quantile(0.95, ai_cache_response_time_bucket)",
            "legendFormat": "P95"
          },
          {
            "expr": "histogram_quantile(0.99, ai_cache_response_time_bucket)",
            "legendFormat": "P99"
          }
        ]
      }
    ]
  }
}
```

## 🚨 Emergency Procedures

### Cache Service Down
```bash
# 1. Immediate failover to direct database queries
kubectl patch deployment wedsync-api -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "wedsync-api",
          "env": [{
            "name": "AI_CACHE_ENABLED",
            "value": "false"
          }]
        }]
      }
    }
  }
}'

# 2. Check Redis cluster status
kubectl get pods -l app=redis-cache
kubectl logs -l app=redis-cache --tail=100

# 3. Restart Redis if needed
kubectl delete pods -l app=redis-cache
kubectl wait --for=condition=ready pod -l app=redis-cache --timeout=300s

# 4. Re-enable cache after verification
kubectl patch deployment wedsync-api -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "wedsync-api",
          "env": [{
            "name": "AI_CACHE_ENABLED",
            "value": "true"
          }]
        }]
      }
    }
  }
}'
```

### Performance Degradation
```bash
# 1. Scale up immediately
kubectl scale deployment wedsync-api --replicas=6

# 2. Increase Redis memory
kubectl patch statefulset redis-cache-cluster -p '{
  "spec": {
    "template": {
      "spec": {
        "containers": [{
          "name": "redis",
          "resources": {
            "limits": {
              "memory": "16Gi"
            }
          }
        }]
      }
    }
  }
}'

# 3. Clear low-priority cache entries
kubectl exec redis-cache-cluster-0 -- redis-cli FLUSHDB

# 4. Monitor recovery
watch "curl -s https://api.wedsync.com/api/ai-cache/statistics | jq '.hitRate,.averageResponseTime'"
```

## 📋 Rollback Procedure

### Application Rollback
```bash
# 1. Immediate rollback to previous version
kubectl rollout undo deployment/wedsync-api

# 2. Wait for rollback completion
kubectl rollout status deployment/wedsync-api --timeout=300s

# 3. Verify previous version is working
curl -f https://api.wedsync.com/health || echo "Rollback failed"

# 4. Disable new cache features if needed
kubectl set env deployment/wedsync-api AI_CACHE_SEASONAL_SCALING_ENABLED=false
```

### Database Rollback (If needed)
```bash
# 1. ONLY if database issues occur - Very rare!
# Backup current state first
pg_dump $DATABASE_URL > backup_before_rollback.sql

# 2. Revert migration (DANGER: Data loss possible)
npx supabase migration down --count=2 --linked

# 3. Verify application works with old schema
curl -f https://api.wedsync.com/health
```

## 🎯 Post-Deployment Validation

### Automated Tests
```bash
# Run full test suite
npm run test:ai-cache:production

# Performance benchmark
npm run benchmark:cache -- --duration=300 --concurrency=100

# Load test with realistic wedding data
npm run loadtest:wedding-season -- --users=1000 --duration=600
```

### Manual Verification Checklist
- [ ] Cache hit rate >80% within 15 minutes
- [ ] Response time <100ms for 95th percentile
- [ ] No errors in application logs
- [ ] Redis cluster healthy with all nodes up
- [ ] Database connections stable
- [ ] Seasonal scaling triggers working
- [ ] Security audit logs being created
- [ ] GDPR compliance features functional
- [ ] Monitoring dashboards showing correct metrics

### Success Criteria
✅ **Deployment is successful if:**
- All tests pass
- Cache hit rate reaches target within 30 minutes
- No critical errors in logs
- Performance metrics meet SLA requirements
- All monitoring alerts are green
- Wedding vendors can successfully use AI features

❌ **Rollback immediately if:**
- Cache hit rate stays below 50% after 30 minutes
- Response times exceed 500ms consistently
- More than 5% error rate in API calls
- Database performance degrades significantly
- Wedding day operations are impacted

---

## 📞 Emergency Contacts

**On-Call Engineer**: +1-555-AI-CACHE (24/7)
**Backend Team Lead**: backend-lead@wedsync.com
**CTO Escalation**: cto@wedsync.com
**DevOps Team**: devops@wedsync.com

**Deployment Status**: Post to #deployments Slack channel
**Issues**: Create ticket in JIRA with "AI-CACHE" label

---

*Follow this guide exactly for safe production deployment of the WS-241 AI Caching System.*