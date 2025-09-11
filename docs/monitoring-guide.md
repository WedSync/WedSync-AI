# WedSync Production Monitoring Guide

## Overview

This guide provides comprehensive monitoring setup for WedSync's backend infrastructure, ensuring 99.99% uptime and optimal performance under load.

## 🎯 Monitoring Objectives

### Service Level Objectives (SLOs)
- **Availability**: 99.99% uptime (8.76 minutes downtime/month)
- **Response Time**: 95% of requests < 200ms
- **Error Rate**: < 0.1% of requests fail
- **Throughput**: Handle 10k+ concurrent users
- **Database Performance**: Query times < 50ms average

### Key Performance Indicators (KPIs)
- **User Experience**: Page load times, form submission success rates
- **Business Metrics**: PDF processing rate, payment completion rate
- **System Health**: CPU/memory usage, database connections
- **Security**: Failed authentication attempts, rate limit triggers

## 📊 Monitoring Stack

### Application Metrics
```typescript
// Built-in metrics collection via /src/lib/monitoring/metrics.ts
import { metrics } from '@/lib/monitoring/metrics';

// Track business operations
metrics.trackBusinessMetrics.pdfProcessed(pageCount, processingTime, success);
metrics.trackBusinessMetrics.paymentProcessed(amount, success);
metrics.trackBusinessMetrics.formSubmitted(formId, responseTime, success);
```

### Structured Logging
```typescript
// Production-ready logging via /src/lib/monitoring/structured-logger.ts
import { logger } from '@/lib/monitoring/structured-logger';

logger.info('User action completed', {
  userId,
  action: 'form_created',
  duration: responseTime,
  organizationId
});
```

### Database Monitoring
```sql
-- Performance monitoring functions in /supabase/migrations/006_performance_monitoring.sql
SELECT * FROM get_table_stats();
SELECT * FROM get_index_stats(); 
SELECT * FROM wedsync_performance_summary;
```

## 🚨 Health Check Endpoints

### Primary Health Check
```
GET /api/health
```
Returns comprehensive system status:
- Database connectivity
- Storage availability  
- External service status
- Memory/CPU metrics
- Response time thresholds

### Service-Specific Checks
```
GET /api/health/database    # Database connection only
GET /api/health/storage     # File storage status
GET /api/health/stripe      # Payment processing status
GET /api/health/email       # Email service status
```

## 🔧 Performance Testing

### Automated Testing Schedule
```bash
# Daily light performance test (via GitHub Actions)
npm run stress-test:ci

# Weekly heavy load test
npm run stress-test:heavy

# Monthly database analysis
npm run db-analyze
```

### Manual Performance Validation
```bash
# Quick development check
npm run perf-quick

# Full production simulation
npm run perf-suite

# Database optimization analysis
npm run db-analyze
```

## 📈 Monitoring Setup

### 1. Application Performance Monitoring

#### Metrics Collection
The WedSync backend automatically collects:
- **HTTP Request Metrics**: Response times, status codes, endpoint usage
- **Database Metrics**: Query times, connection counts, cache hit ratios
- **Business Metrics**: PDF processing rates, form submissions, payments
- **System Metrics**: Memory usage, CPU utilization, disk I/O

#### Circuit Breaker Monitoring
```typescript
// Monitor circuit breaker states
import { circuitBreakers } from '@/lib/resilience/circuit-breaker';

// Check circuit breaker health
const dbHealth = await circuitBreakers.database.getHealth();
const stripeHealth = await circuitBreakers.stripe.getHealth();
```

### 2. Database Performance Monitoring

#### Real-time Database Metrics
```sql
-- Monitor active connections
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';

-- Check slow queries (requires pg_stat_statements)
SELECT query, mean_time, calls 
FROM pg_stat_statements 
WHERE mean_time > 100 
ORDER BY mean_time DESC;

-- Monitor cache hit ratio
SELECT 
  round(blks_hit::numeric / (blks_hit + blks_read) * 100, 2) as cache_hit_ratio
FROM pg_stat_database 
WHERE datname = current_database();
```

#### Index Usage Analysis
```sql
-- Identify unused indexes
SELECT schemaname, tablename, indexrelname, idx_scan
FROM pg_stat_user_indexes 
WHERE idx_scan = 0 
AND NOT indexrelname LIKE '%_pkey';

-- Check index efficiency
SELECT * FROM index_usage_stats 
WHERE usage_status IN ('UNUSED', 'RARELY_USED');
```

### 3. Redis Cache Monitoring

```typescript
// Cache performance metrics
import { cache } from '@/lib/cache/redis-cache';

// Health check
const cacheHealthy = await cache.isHealthy();

// Performance metrics available via metrics system
// cache.hits, cache.misses, cache.sets, cache.deletes
```

### 4. External Service Monitoring

#### Stripe Integration
```typescript
// Payment processing monitoring
import { auditPayment } from '@/lib/security-audit-logger';

// Webhook processing metrics
await auditPayment.webhookReceived(eventData, request);
await auditPayment.paymentProcessed(paymentData, request);
```

#### Email Service Monitoring
```typescript
// Email delivery tracking
import { EmailService } from '@/lib/email/service';

// Monitor email delivery rates and failures
const deliveryStats = await EmailService.getDeliveryStats();
```

## 🚨 Alerting Rules

### Critical Alerts (Immediate Response)
- **Service Down**: Health check failure for > 1 minute
- **High Error Rate**: > 5% error rate for > 2 minutes  
- **Database Issues**: Connection failures or query times > 5 seconds
- **Payment Failures**: Stripe webhook failures or payment processing errors

### Warning Alerts (Monitor Closely)
- **Response Time**: 95th percentile > 500ms for > 5 minutes
- **Cache Issues**: Redis cache hit ratio < 90%
- **High Load**: CPU > 80% or memory > 85% for > 10 minutes
- **Database Performance**: Query times > 200ms average

### Info Alerts (Trending Issues)
- **Capacity Planning**: Connection count > 70% of limit
- **Index Maintenance**: Tables with > 20% dead tuples
- **Security Events**: Elevated rate limit triggers

## 📊 Dashboard Setup

### Production Monitoring Dashboard
Monitor these key metrics in real-time:

1. **Service Health Overview**
   - Overall system status
   - Response time trends
   - Error rate trends
   - Throughput metrics

2. **Database Performance**
   - Active connections
   - Query performance
   - Cache hit ratios
   - Lock contention

3. **Business Metrics**
   - PDF processing rates
   - Form submission success
   - Payment completion rates
   - User engagement metrics

4. **Infrastructure Health**
   - CPU/Memory utilization
   - Disk usage
   - Network I/O
   - Service dependencies

### Using the Built-in Reports
```bash
# Generate performance dashboard
npm run perf-suite

# View reports at:
# - stress-test-results/report-{timestamp}.html
# - db-analysis-results/analysis-report-{timestamp}.html  
# - performance-reports/dashboard-{timestamp}.html
```

## 🔍 Troubleshooting Guide

### High Response Times
1. **Check Database Performance**
   ```bash
   npm run db-analyze
   ```
2. **Review Slow Queries**
   ```sql
   SELECT * FROM get_slow_queries(100);
   ```
3. **Monitor Cache Hit Ratio**
   ```sql
   SELECT * FROM get_cache_stats();
   ```

### High Error Rates
1. **Check Application Logs**
   ```bash
   grep "ERROR" /var/log/wedsync/app.log | tail -50
   ```
2. **Review Circuit Breaker Status**
3. **Validate External Service Health**

### Database Issues
1. **Connection Pool Status**
   ```sql
   SELECT * FROM pg_stat_activity;
   ```
2. **Lock Analysis**
   ```sql
   SELECT * FROM get_lock_stats();
   ```
3. **Table Maintenance**
   ```sql
   SELECT * FROM get_table_stats() WHERE n_dead_tup > n_live_tup * 0.2;
   ```

### Performance Degradation
1. **Run Full Performance Analysis**
   ```bash
   npm run perf-suite:heavy
   ```
2. **Compare Against Baselines**
3. **Implement Recommended Optimizations**

## 🛠️ Maintenance Procedures

### Daily Tasks (Automated)
- Health check validation via CI/CD
- Light performance testing
- Log rotation and cleanup
- Security scan execution

### Weekly Tasks  
- Heavy load testing
- Database statistics update
- Index usage analysis
- Cache performance review

### Monthly Tasks
- Full database analysis with optimization
- Capacity planning review
- Performance baseline updates
- Infrastructure scaling assessment

### Quarterly Tasks
- Complete security audit
- Disaster recovery testing
- Performance benchmark updates
- Infrastructure architecture review

## 📋 Performance Optimization Checklist

### Application Level
- [ ] Implement response caching where appropriate
- [ ] Optimize database queries (use EXPLAIN ANALYZE)
- [ ] Use connection pooling effectively
- [ ] Enable compression for API responses
- [ ] Implement proper error handling and retry logic

### Database Level  
- [ ] Add indexes for frequently queried columns
- [ ] Configure auto-vacuum settings appropriately
- [ ] Monitor and address slow queries
- [ ] Optimize PostgreSQL configuration
- [ ] Implement query result caching

### Infrastructure Level
- [ ] Set up horizontal scaling with load balancers
- [ ] Use CDN for static asset delivery
- [ ] Implement Redis caching for session data
- [ ] Monitor resource usage and scale proactively
- [ ] Set up proper backup and recovery procedures

### Security Level
- [ ] Implement rate limiting
- [ ] Monitor for security threats
- [ ] Audit user access patterns  
- [ ] Validate input sanitization
- [ ] Keep dependencies updated

## 📞 Incident Response

### Severity Levels
- **P0**: Service completely down (< 5 min response)
- **P1**: Major functionality impaired (< 30 min response)  
- **P2**: Minor functionality issues (< 2 hour response)
- **P3**: Enhancement requests (< 24 hour response)

### Response Procedures
1. **Immediate Assessment**
   - Check health endpoints
   - Review recent deployments
   - Analyze error patterns

2. **Mitigation Steps**
   - Implement circuit breakers if needed
   - Scale resources if capacity issue
   - Rollback if deployment-related

3. **Root Cause Analysis**
   - Analyze performance reports
   - Review application logs
   - Document findings and improvements

## 🎯 Success Metrics

Track these metrics to ensure monitoring effectiveness:
- **Mean Time to Detection (MTTD)**: < 2 minutes
- **Mean Time to Resolution (MTTR)**: < 15 minutes for P0 issues
- **False Positive Rate**: < 5% of alerts
- **Coverage**: > 95% of critical paths monitored

## 🚀 Next Steps

1. **Implement Monitoring Stack**
   - Set up metrics collection
   - Configure alerting rules
   - Create monitoring dashboards

2. **Establish Baselines**
   - Run initial performance tests
   - Document current performance levels
   - Set up trending analysis

3. **Automate Monitoring**
   - Integrate with CI/CD pipelines  
   - Set up scheduled health checks
   - Implement automated responses

4. **Train Team**
   - Document runbooks
   - Conduct incident response drills
   - Establish on-call procedures

---

This monitoring guide ensures WedSync maintains optimal performance and availability at scale. Regular monitoring and proactive optimization will help achieve and maintain 99.99% uptime objectives.