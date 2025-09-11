# WedSync Production Environment Documentation

## 🏗️ Infrastructure Overview

WedSync production infrastructure is designed for high availability, scalability, and security. The architecture follows AWS Well-Architected Framework principles.

### Architecture Components

```
Internet → CloudFront → WAF → ALB → Auto Scaling Group → Application Servers
                                     ↓
                               Private Subnets
                                     ↓
                          RDS (Multi-AZ) + Read Replicas
                          ElastiCache Redis Cluster
                          S3 Buckets (Encrypted)
```

## 🔐 Security Configuration

### Multi-Layer Security Approach

1. **Network Security**
   - VPC with private/public subnet isolation
   - Security groups with least privilege access
   - NACLs for additional network-level protection
   - NAT Gateways for secure outbound access

2. **Application Security**
   - WAF with custom rules for DDoS protection
   - Rate limiting at multiple layers
   - API key rotation system
   - Circuit breakers and retry policies

3. **Data Security**
   - Encryption at rest (RDS, S3, EBS)
   - Encryption in transit (TLS 1.3)
   - Secrets management via AWS Secrets Manager
   - Regular automated backups

## 📊 Monitoring & Alerting

### CloudWatch Dashboards
- **Application Dashboard**: Request metrics, response times, error rates
- **Infrastructure Dashboard**: CPU, memory, network, disk utilization
- **Business Metrics Dashboard**: PDF processing, form submissions, payments
- **Security Dashboard**: Failed authentications, suspicious activities

### Alert Thresholds
| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| CPU Utilization | >75% | >90% | Auto-scale |
| Memory Usage | >80% | >95% | Alert + Scale |
| Response Time | >500ms | >2s | Alert |
| Error Rate | >1% | >5% | Page ops team |
| DB Connections | >80% | >95% | Alert + Scale |

## 🚀 Deployment Process

### Blue-Green Deployment Strategy

1. **Preparation**
   ```bash
   # Build and test new version
   npm run build
   npm run test:production
   npm run security:audit
   ```

2. **Infrastructure Provisioning**
   ```bash
   cd infrastructure/terraform
   terraform plan -var-file="production.tfvars"
   terraform apply -var-file="production.tfvars"
   ```

3. **Application Deployment**
   ```bash
   # Deploy to green environment
   aws deploy create-deployment \
     --application-name wedsync-production \
     --deployment-group-name green-deployment-group \
     --s3-location bucket=wedsync-deployments,key=app-v1.2.3.zip
   ```

4. **Health Checks & Validation**
   ```bash
   # Automated health checks
   curl -f https://green.wedsync.com/api/health
   npm run test:e2e:production
   ```

5. **Traffic Switching**
   ```bash
   # Switch ALB target groups
   aws elbv2 modify-listener \
     --listener-arn $LISTENER_ARN \
     --default-actions Type=forward,TargetGroupArn=$GREEN_TG_ARN
   ```

## 🗃️ Database Configuration

### Primary Database (RDS PostgreSQL)
- **Instance Class**: db.r5.xlarge
- **Storage**: 500GB GP2 with auto-scaling up to 2TB
- **Backup**: 30-day retention, daily backups at 3 AM UTC
- **Maintenance**: Sunday 4-5 AM UTC
- **Encryption**: AES-256 at rest

### Read Replicas
- **Count**: 2 replicas across different AZs
- **Purpose**: Read-heavy queries, reporting, analytics
- **Lag Monitoring**: Alert if lag > 5 seconds

### Connection Pooling
```env
DB_POOL_MIN=5
DB_POOL_MAX=50
DB_POOL_ACQUIRE_TIMEOUT=30000
DB_POOL_IDLE_TIMEOUT=30000
```

## 🔄 Backup & Recovery

### Automated Backup Strategy
- **Daily**: Full database backup at 2 AM UTC (7-day retention)
- **Weekly**: Full system backup every Sunday (4-week retention)
- **Monthly**: Archive backup on 1st of month (12-month retention)

### Point-in-Time Recovery
- **RDS**: 5-minute granularity up to backup retention period
- **Application Data**: S3 versioning with lifecycle policies
- **Config**: Git-backed infrastructure as code

### Disaster Recovery Plan
1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour
3. **DR Region**: us-west-2
4. **Automated Failover**: RDS Multi-AZ deployment

## 🌐 Environment Variables

### Required Environment Variables

#### Core Application
```env
# Application
NODE_ENV=production
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_URL=https://wedsync.com

# Database (via Secrets Manager)
DATABASE_URL=postgresql://[credentials_from_secrets_manager]
SUPABASE_URL=https://[project].supabase.co
SUPABASE_ANON_KEY=[from_secrets_manager]
SUPABASE_SERVICE_ROLE_KEY=[from_secrets_manager]

# Cache
REDIS_URL=redis://[elasticache_endpoint]

# External Services
STRIPE_SECRET_KEY=[from_secrets_manager]
STRIPE_WEBHOOK_SECRET=[from_secrets_manager]
OPENAI_API_KEY=[from_secrets_manager]
RESEND_API_KEY=[from_secrets_manager]

# Security
JWT_SECRET=[from_secrets_manager]
ENCRYPTION_KEY=[from_secrets_manager]

# Monitoring
SENTRY_DSN=[from_secrets_manager]
DATADOG_API_KEY=[from_secrets_manager]
```

#### Performance & Scaling
```env
# Server Configuration
PORT=3000
WORKER_PROCESSES=4
MAX_REQUEST_SIZE=50mb
REQUEST_TIMEOUT=30000

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=1000
RATE_LIMIT_SKIP_SUCCESSFUL_REQUESTS=false

# Circuit Breaker
CIRCUIT_BREAKER_TIMEOUT=30000
CIRCUIT_BREAKER_ERROR_THRESHOLD=5
CIRCUIT_BREAKER_RESET_TIMEOUT=60000

# Caching
CACHE_TTL_DEFAULT=300
CACHE_TTL_STATIC=86400
CACHE_TTL_API=60
```

#### Feature Flags
```env
# Features
FEATURE_PDF_OCR=true
FEATURE_REALTIME_NOTIFICATIONS=true
FEATURE_ADVANCED_ANALYTICS=true
FEATURE_API_V2=false

# Limits
MAX_PDF_SIZE_MB=50
MAX_FORM_FIELDS=100
MAX_ORGANIZATIONS_PER_USER=3
```

### Secrets Management

All sensitive configuration is managed through AWS Secrets Manager:

```bash
# Database credentials
aws secretsmanager get-secret-value \
  --secret-id wedsync/production/database \
  --query SecretString --output text

# API keys
aws secretsmanager get-secret-value \
  --secret-id wedsync/production/api-keys \
  --query SecretString --output text

# Webhook secrets
aws secretsmanager get-secret-value \
  --secret-id wedsync/production/webhooks \
  --query SecretString --output text
```

## 🔧 Performance Optimization

### Application Performance
- **Response Time Target**: <200ms for 95% of requests
- **Throughput Target**: 10,000 concurrent users
- **Availability Target**: 99.99% uptime

### Database Optimization
- **Query Performance**: <50ms average query time
- **Connection Pooling**: Optimized for high concurrency
- **Read Replicas**: Distribute read load effectively
- **Indexing Strategy**: Automated monitoring and recommendations

### Caching Strategy
- **Redis Cache**: Session data, API responses, computed results
- **CloudFront CDN**: Static assets, images, CSS, JavaScript
- **Application Cache**: Frequently accessed data, user permissions

## 📈 Scaling Configuration

### Auto Scaling Policies

#### Application Servers
```yaml
ScaleUpPolicy:
  MetricName: CPUUtilization
  Threshold: 75%
  ScalingAdjustment: +2 instances
  Cooldown: 300 seconds

ScaleDownPolicy:
  MetricName: CPUUtilization
  Threshold: 25%
  ScalingAdjustment: -1 instance
  Cooldown: 300 seconds
```

#### Database Scaling
- **Read Replicas**: Auto-scale based on read load
- **Storage**: Auto-scaling enabled up to 2TB
- **Compute**: Manual scaling with alerts at 80% CPU

### Load Balancing
- **Algorithm**: Round robin with sticky sessions
- **Health Checks**: HTTP GET /api/health every 30 seconds
- **Unhealthy Threshold**: 3 consecutive failures
- **Healthy Threshold**: 2 consecutive successes

## 🚨 Incident Response

### Severity Levels
- **P0 (Critical)**: Service down, data loss, security breach
- **P1 (High)**: Major functionality impaired, performance degraded
- **P2 (Medium)**: Minor functionality issues, workarounds available
- **P3 (Low)**: Enhancement requests, cosmetic issues

### Response Times
- **P0**: 15 minutes
- **P1**: 1 hour
- **P2**: 4 hours
- **P3**: Next business day

### Escalation Matrix
1. **First Response**: On-call engineer
2. **Escalation Level 1**: Engineering team lead
3. **Escalation Level 2**: CTO/Technical director
4. **Executive**: CEO (for P0 incidents affecting revenue)

## 🔒 Security Compliance

### SOC 2 Type II Compliance
- **Access Controls**: Multi-factor authentication required
- **Audit Logging**: All access and changes logged
- **Data Encryption**: At rest and in transit
- **Vulnerability Management**: Regular scans and patching

### GDPR Compliance
- **Data Processing**: Documented legal basis
- **Data Retention**: Automated deletion policies
- **Data Portability**: Export functionality available
- **Right to be Forgotten**: Secure deletion processes

### Regular Security Tasks
- **Weekly**: Vulnerability scans
- **Monthly**: Security patch updates
- **Quarterly**: Penetration testing
- **Annually**: Full security audit

## 📊 Cost Optimization

### Resource Right-Sizing
- **Automated Monitoring**: CloudWatch with cost allocation tags
- **Reserved Instances**: 70% of baseline capacity
- **Spot Instances**: For development and testing environments
- **Scheduled Scaling**: Scale down during low-traffic hours

### Cost Monitoring Alerts
- **Daily Budget**: Alert at 80% of daily budget
- **Monthly Budget**: Alert at 90% of monthly budget
- **Anomaly Detection**: Unusual spending patterns
- **Resource Utilization**: Under-utilized resources

## 🛠️ Maintenance Procedures

### Regular Maintenance Windows
- **Time**: Sunday 4-6 AM UTC (lowest traffic period)
- **Frequency**: Monthly for major updates, weekly for patches
- **Notification**: 48-hour advance notice to stakeholders

### Update Procedures
1. **Security Patches**: Applied within 48 hours of release
2. **Application Updates**: Staged through dev → staging → production
3. **Infrastructure Updates**: Blue-green deployment strategy
4. **Database Updates**: During maintenance windows with rollback plan

### Health Checks
- **Automated**: Every 5 minutes via load balancer
- **Deep Health Check**: Every hour via monitoring system
- **End-to-End Tests**: Every 4 hours
- **Manual Verification**: Daily during business hours

## 📞 Support Contacts

### Emergency Contacts
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Engineering Manager**: +1-XXX-XXX-XXXX
- **CTO**: +1-XXX-XXX-XXXX

### Vendor Support
- **AWS Support**: Enterprise support plan
- **Supabase Support**: Pro plan support
- **Stripe Support**: Business critical support

### Communication Channels
- **Slack**: #production-alerts, #incident-response
- **Email**: ops@wedsync.com
- **Status Page**: status.wedsync.com