# AI Operations Runbook for Wedding Optimization System

## Overview

This runbook provides operational procedures, troubleshooting guides, and emergency protocols for maintaining WedSync's AI-powered wedding optimization system. It serves as the definitive guide for operations teams, developers, and support staff.

## Emergency Contacts

### AI System Escalation Chain
1. **Primary**: AI Operations Team (Slack: #ai-ops-alerts)
2. **Secondary**: Platform Engineering Team (on-call)
3. **Tertiary**: CTO/Technical Leadership
4. **Emergency**: Wedding Day Support Team (24/7 during wedding seasons)

### Vendor Contacts
- **OpenAI Support**: Priority support contract
- **Infrastructure**: AWS/GCP enterprise support
- **Database**: PostgreSQL DBA team
- **Monitoring**: DataDog/New Relic support

## System Monitoring

### Key Performance Indicators (KPIs)

#### AI System Health
```bash
# AI Service Status Check
curl -H "Authorization: Bearer $API_TOKEN" \
  https://api.wedsync.com/ai/health

Expected Response:
{
  "status": "healthy",
  "optimization_engine": "operational",
  "recommendation_engine": "operational",
  "crisis_manager": "operational",
  "response_time_ms": 250,
  "accuracy_rate": 0.92,
  "availability": 0.999
}
```

#### Critical Metrics to Monitor
- **Response Time**: <5 seconds for optimization (Alert: >10 seconds)
- **Accuracy Rate**: >85% recommendation acceptance (Alert: <80%)
- **System Availability**: >99.9% uptime (Alert: <99.5%)
- **Error Rate**: <0.5% (Alert: >1%)
- **Queue Length**: <10 pending requests (Alert: >50)

### Monitoring Dashboards

#### Primary Dashboard: AI Performance
- **URL**: `https://monitoring.wedsync.com/ai-performance`
- **Metrics**: Response times, success rates, error rates
- **Alerts**: Automated alerts for threshold breaches
- **Refresh**: Real-time updates every 30 seconds

#### Secondary Dashboard: Business Impact
- **URL**: `https://monitoring.wedsync.com/ai-business`
- **Metrics**: Recommendation acceptance, cost savings, user satisfaction
- **Reports**: Daily, weekly, monthly trend analysis
- **Stakeholders**: Product, Business, Executive teams

### Alert Levels

#### Level 1: Information
- **Trigger**: Minor performance degradation (5-10% below normal)
- **Action**: Log for analysis, no immediate response required
- **Example**: Response time increases from 2s to 3s

#### Level 2: Warning
- **Trigger**: Moderate performance impact (10-25% degradation)
- **Action**: Investigation required within 4 hours
- **Example**: Accuracy rate drops from 90% to 82%

#### Level 3: Critical
- **Trigger**: Major system impact (>25% degradation)
- **Action**: Immediate investigation and response
- **Example**: Error rate exceeds 2% or response time >15 seconds

#### Level 4: Emergency
- **Trigger**: System failure or wedding day impact
- **Action**: Immediate escalation to on-call team
- **Example**: Complete AI system outage or crisis response failure

## Common Issues and Solutions

### Issue 1: High Response Times

#### Symptoms
- AI optimization requests taking >10 seconds
- User complaints about slow recommendations
- Queue length increasing rapidly

#### Diagnosis
```bash
# Check current load
kubectl get pods -n ai-services
kubectl top pods -n ai-services

# Check database performance
psql -h db-host -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"

# Monitor API endpoints
curl -w "@curl-format.txt" -s -o /dev/null https://api.wedsync.com/ai/optimize
```

#### Solutions
1. **Scale AI Services**:
   ```bash
   kubectl scale deployment ai-optimization-engine --replicas=10
   kubectl scale deployment ai-recommendation-engine --replicas=8
   ```

2. **Clear Cache if Corrupted**:
   ```bash
   redis-cli FLUSHDB
   # Restart cache warming
   curl -X POST https://api.wedsync.com/ai/cache/warm
   ```

3. **Database Optimization**:
   ```sql
   -- Check for slow queries
   SELECT query, mean_time, total_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_time DESC LIMIT 10;
   ```

### Issue 2: Low Recommendation Accuracy

#### Symptoms
- User acceptance rate dropping below 80%
- Negative feedback increasing
- Support tickets about poor recommendations

#### Diagnosis
```bash
# Check AI model health
curl https://api.wedsync.com/ai/models/health

# Review recent feedback
psql -c "SELECT rating, outcome, COUNT(*) 
         FROM ai_feedback 
         WHERE created_at > NOW() - INTERVAL '24 hours' 
         GROUP BY rating, outcome;"
```

#### Solutions
1. **Model Retraining Check**:
   ```python
   # Check if model needs retraining
   from ai_models import check_model_performance
   
   performance = check_model_performance()
   if performance.accuracy < 0.85:
       trigger_model_retraining()
   ```

2. **Data Quality Validation**:
   ```sql
   -- Check for data quality issues
   SELECT COUNT(*) FROM wedding_optimizations 
   WHERE quality_score IS NULL OR quality_score < 0.7;
   ```

3. **Feature Engineering Review**:
   - Analyze recent changes to input features
   - Validate data preprocessing pipeline
   - Check for missing or corrupted training data

### Issue 3: AI Service Outages

#### Symptoms
- 503 Service Unavailable errors
- AI endpoints not responding
- Fallback systems activated

#### Diagnosis
```bash
# Check service status
kubectl get pods -n ai-services
kubectl describe pod ai-optimization-engine-xxx

# Check logs
kubectl logs -f ai-optimization-engine-xxx --tail=100

# Check external dependencies
curl https://api.openai.com/v1/models
```

#### Solutions
1. **Service Restart**:
   ```bash
   kubectl rollout restart deployment/ai-optimization-engine
   kubectl rollout status deployment/ai-optimization-engine
   ```

2. **Traffic Rerouting**:
   ```bash
   # Route traffic to backup region
   kubectl patch ingress ai-ingress -p '{"spec":{"rules":[{"host":"api.wedsync.com","http":{"paths":[{"path":"/ai/","backend":{"serviceName":"ai-backup","servicePort":80}}]}}]}}'
   ```

3. **Activate Fallback Mode**:
   ```bash
   # Enable rule-based fallback
   curl -X POST https://api.wedsync.com/ai/fallback/enable
   ```

### Issue 4: Wedding Day Crisis Management Failure

#### Symptoms
- Crisis response time >10 seconds
- Failed vendor cancellation handling
- No alternative solutions provided

#### **EMERGENCY PROTOCOL** 🚨

#### Immediate Actions (0-5 minutes)
1. **Activate Wedding Day Emergency Team**:
   ```bash
   # Send emergency alert
   curl -X POST https://alerts.wedsync.com/emergency \
     -H "Content-Type: application/json" \
     -d '{"type": "ai_crisis_failure", "severity": "critical"}'
   ```

2. **Enable Manual Crisis Management**:
   ```bash
   # Switch to human crisis management
   curl -X POST https://api.wedsync.com/crisis/manual-mode/enable
   ```

3. **Notify Affected Couples**:
   ```sql
   -- Identify couples with active crises
   SELECT wedding_id, couple_email, crisis_type 
   FROM active_crises 
   WHERE status = 'ai_processing' 
   AND created_at > NOW() - INTERVAL '1 hour';
   ```

#### Follow-up Actions (5-30 minutes)
1. **Deploy Emergency Wedding Planners**
2. **Activate Vendor Emergency Network**
3. **Escalate to Executive Team**
4. **Begin Crisis Communication Protocol**

## Maintenance Procedures

### Daily Maintenance

#### Morning Health Check (9:00 AM GMT)
```bash
#!/bin/bash
# daily-health-check.sh

echo "=== AI System Health Check $(date) ==="

# Check system status
curl -s https://api.wedsync.com/ai/health | jq '.'

# Check performance metrics
echo "24-hour performance summary:"
curl -s https://api.wedsync.com/ai/metrics/daily | jq '.'

# Check error rates
echo "Recent errors:"
curl -s https://api.wedsync.com/ai/errors/recent | jq '.errors[] | select(.count > 10)'

# Check queue status
echo "Queue status:"
kubectl get pods -n ai-services -o wide
```

#### Evening Performance Review (6:00 PM GMT)
- Review daily performance metrics
- Analyze recommendation acceptance rates
- Check resource utilization trends
- Plan capacity adjustments for next day

### Weekly Maintenance

#### Sunday Maintenance Window (2:00-4:00 AM GMT)
1. **AI Model Updates**:
   ```bash
   # Deploy updated models
   ./scripts/deploy-ai-models.sh production
   
   # Validate model performance
   ./scripts/validate-models.sh
   ```

2. **Database Maintenance**:
   ```sql
   -- Clean old optimization data
   DELETE FROM wedding_optimizations 
   WHERE created_at < NOW() - INTERVAL '90 days' 
   AND status = 'completed';
   
   -- Update statistics
   ANALYZE wedding_optimizations;
   ANALYZE ai_recommendations;
   ANALYZE ai_feedback;
   ```

3. **Cache Optimization**:
   ```bash
   # Clear stale cache entries
   redis-cli --scan --pattern "ai:*" | 
     xargs -L 1000 redis-cli DEL
   
   # Warm critical caches
   ./scripts/warm-caches.sh
   ```

### Monthly Maintenance

#### Model Retraining (First Saturday of each month)
1. **Data Preparation**:
   ```python
   # Extract training data
   python scripts/extract_training_data.py --month=$(date +%Y-%m)
   
   # Validate data quality
   python scripts/validate_training_data.py
   ```

2. **Model Training**:
   ```bash
   # Train new models
   python ai_models/train_optimization_model.py
   python ai_models/train_recommendation_model.py
   
   # Validate model performance
   python ai_models/validate_models.py
   ```

3. **A/B Testing Setup**:
   ```bash
   # Deploy new models to staging
   ./scripts/deploy-models.sh staging
   
   # Configure A/B test
   ./scripts/setup-ab-test.sh --model-version=v2.1
   ```

## Performance Tuning

### Response Time Optimization

#### Caching Strategy
```python
# Implement intelligent caching
class AIOptimizationCache:
    def __init__(self):
        self.redis = redis.Redis(host='cache-cluster')
        self.default_ttl = 3600  # 1 hour
    
    def get_optimization(self, wedding_hash):
        key = f"optimization:{wedding_hash}"
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)
        return None
    
    def cache_optimization(self, wedding_hash, result):
        key = f"optimization:{wedding_hash}"
        self.redis.setex(key, self.default_ttl, json.dumps(result))
```

#### Database Query Optimization
```sql
-- Create indexes for common queries
CREATE INDEX CONCURRENTLY idx_wedding_opt_wedding_date 
ON wedding_optimizations(wedding_date) 
WHERE status = 'active';

CREATE INDEX CONCURRENTLY idx_ai_feedback_recommendation 
ON ai_feedback(recommendation_id, created_at DESC);

-- Optimize frequently used queries
EXPLAIN ANALYZE 
SELECT * FROM ai_recommendations 
WHERE optimization_id = $1 
ORDER BY confidence DESC;
```

### Scalability Improvements

#### Horizontal Scaling
```yaml
# kubernetes/ai-services-hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: ai-optimization-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: ai-optimization-engine
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### Load Balancing Configuration
```nginx
# Load balancer configuration
upstream ai_services {
    least_conn;
    server ai-node-1:8000 weight=3;
    server ai-node-2:8000 weight=3;
    server ai-node-3:8000 weight=2;  # Lower spec machine
    
    # Health checks
    health_check uri=/health interval=30s;
}

location /ai/ {
    proxy_pass http://ai_services;
    proxy_timeout 30s;
    proxy_retry_non_idempotent on;
}
```

## Disaster Recovery

### Backup Procedures

#### AI Model Backups
```bash
#!/bin/bash
# backup-ai-models.sh

BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="/backups/ai-models/$BACKUP_DATE"

# Create backup directory
mkdir -p $BACKUP_PATH

# Backup model files
aws s3 sync s3://wedsync-ai-models/ $BACKUP_PATH/models/

# Backup model metadata
kubectl get configmap ai-model-config -o yaml > $BACKUP_PATH/model-config.yaml

# Create backup manifest
echo "Backup created: $BACKUP_DATE" > $BACKUP_PATH/MANIFEST
echo "Models: $(ls -1 $BACKUP_PATH/models/ | wc -l)" >> $BACKUP_PATH/MANIFEST
```

#### Database Backups
```bash
# Automated database backup
pg_dump -h production-db \
  -U ai_user \
  -d wedsync_prod \
  --exclude-table=temp_* \
  --exclude-table=logs_* \
  | gzip > /backups/db/wedsync_ai_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Recovery Procedures

#### AI Service Recovery
```bash
#!/bin/bash
# recover-ai-services.sh

echo "Starting AI service recovery..."

# 1. Restore from last known good backup
aws s3 sync s3://wedsync-backups/ai-models/latest/ /tmp/model-recovery/

# 2. Deploy recovered models
kubectl apply -f /tmp/model-recovery/model-config.yaml

# 3. Restart services with recovered models
kubectl rollout restart deployment/ai-optimization-engine
kubectl rollout restart deployment/ai-recommendation-engine

# 4. Validate recovery
./scripts/validate-recovery.sh

echo "AI service recovery completed"
```

#### Database Recovery
```bash
# Point-in-time recovery
pg_restore -h recovery-db \
  -U ai_user \
  -d wedsync_recovery \
  --clean \
  --if-exists \
  /backups/db/wedsync_ai_20240101_120000.sql.gz
```

### Failover Procedures

#### Automatic Failover
```python
# Implement circuit breaker pattern
class AIServiceCircuitBreaker:
    def __init__(self, failure_threshold=5, timeout=60):
        self.failure_count = 0
        self.failure_threshold = failure_threshold
        self.timeout = timeout
        self.state = 'CLOSED'  # CLOSED, OPEN, HALF_OPEN
        
    def call_ai_service(self, request):
        if self.state == 'OPEN':
            # Use fallback service
            return self.fallback_service(request)
        
        try:
            result = self.ai_service.optimize(request)
            self.reset_failures()
            return result
        except Exception as e:
            self.record_failure()
            if self.failure_count >= self.failure_threshold:
                self.state = 'OPEN'
            return self.fallback_service(request)
```

#### Manual Failover
```bash
# Switch to backup AI infrastructure
kubectl patch ingress ai-ingress -p '{
  "spec": {
    "rules": [{
      "host": "api.wedsync.com",
      "http": {
        "paths": [{
          "path": "/ai/",
          "backend": {
            "serviceName": "ai-backup-services",
            "servicePort": 80
          }
        }]
      }
    }]
  }
}'
```

## Security Procedures

### Access Control
```yaml
# RBAC configuration for AI services
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ai-service-account
  namespace: ai-services
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: ai-service-role
rules:
- apiGroups: [""]
  resources: ["configmaps", "secrets"]
  verbs: ["get", "list"]
- apiGroups: ["apps"]
  resources: ["deployments"]
  verbs: ["get", "list", "update"]
```

### Data Protection
```python
# Implement data encryption for AI operations
class SecureAIOperation:
    def __init__(self):
        self.encryption_key = os.environ['AI_ENCRYPTION_KEY']
        
    def encrypt_wedding_data(self, data):
        cipher = Fernet(self.encryption_key)
        encrypted_data = cipher.encrypt(json.dumps(data).encode())
        return encrypted_data
        
    def decrypt_wedding_data(self, encrypted_data):
        cipher = Fernet(self.encryption_key)
        decrypted_data = cipher.decrypt(encrypted_data)
        return json.loads(decrypted_data.decode())
```

### Audit Logging
```python
# AI operation audit logging
class AIAuditLogger:
    def log_optimization(self, user_id, wedding_id, operation_type, result):
        audit_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'wedding_id': wedding_id,
            'operation': operation_type,
            'result_quality': result.get('quality_score'),
            'processing_time': result.get('processing_time'),
            'recommendations_count': len(result.get('recommendations', [])),
            'ip_address': request.remote_addr,
            'user_agent': request.headers.get('User-Agent')
        }
        
        # Store in audit database
        self.audit_db.store(audit_record)
        
        # Send to SIEM system
        self.siem_client.send_event(audit_record)
```

## Documentation and Training

### Runbook Updates
- **Monthly Review**: Update procedures based on operational experience
- **Version Control**: All runbook changes tracked in Git
- **Change Approval**: Technical review required for procedure changes
- **Distribution**: Ensure all team members have latest version

### Team Training
- **New Team Members**: Complete AI operations training within 2 weeks
- **Quarterly Drills**: Practice emergency procedures every quarter
- **Cross-Training**: Ensure multiple team members can handle critical procedures
- **Knowledge Base**: Maintain searchable internal wiki with operational tips

### Contact Information Update
- **Monthly Verification**: Verify all contact information monthly
- **On-Call Rotation**: Update on-call schedules weekly
- **Escalation Testing**: Test escalation procedures monthly
- **Emergency Contacts**: Maintain 24/7 reachable emergency contacts

This runbook is a living document and should be updated based on operational experience and system changes. Regular review and updates ensure it remains accurate and useful for maintaining optimal AI system operations.