# WS-155 Guest Communications Production Operations Manual

**Feature ID**: WS-155  
**Team**: Team E  
**Version**: 3.0  
**Last Updated**: 2025-08-26  
**Status**: Production Ready  

## Table of Contents

1. [System Overview](#system-overview)
2. [Daily Operations](#daily-operations)
3. [Monitoring & Alerting](#monitoring--alerting)
4. [Database Maintenance](#database-maintenance)
5. [Backup & Recovery](#backup--recovery)
6. [Performance Tuning](#performance-tuning)
7. [Security Operations](#security-operations)
8. [Compliance Management](#compliance-management)
9. [Incident Response](#incident-response)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Scaling Procedures](#scaling-procedures)
12. [Emergency Procedures](#emergency-procedures)

## System Overview

The WS-155 Guest Communications System is designed to handle **2000+ concurrent messaging operations** with enterprise-grade reliability, security, and compliance.

### Core Components
- **Database**: PostgreSQL with production optimizations
- **Load Testing**: Concurrent operation testing up to 2000+ users
- **Monitoring**: Real-time performance and health monitoring
- **Security**: Audit logging, encryption, and access controls
- **Compliance**: GDPR and CAN-SPAM automated compliance
- **Backup**: Automated backup and recovery procedures

### Architecture
```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client Apps   │────│  Load Balancer   │────│   API Gateway   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │
                       ┌────────────────┐
                       │  Application   │
                       │   Services     │
                       └────────────────┘
                                │
                    ┌──────────────────────┐
                    │   PostgreSQL DB      │
                    │  (Production Tuned)  │
                    └──────────────────────┘
```

## Daily Operations

### Morning Checklist (9:00 AM)

1. **System Health Check**
   ```sql
   SELECT * FROM verify_production_readiness();
   SELECT * FROM check_communication_system_health();
   ```

2. **Review Overnight Metrics**
   ```typescript
   // Check overnight performance
   const summary = monitor.getMetricsSummary(720); // Last 12 hours
   console.log('Overnight Performance:', summary);
   ```

3. **Backup Status Verification**
   ```sql
   SELECT * FROM communication_backups 
   WHERE completed_at > NOW() - INTERVAL '24 hours'
   ORDER BY completed_at DESC;
   ```

4. **Alert Review**
   - Check monitoring dashboard for alerts
   - Review security audit logs
   - Verify compliance status

### Afternoon Checklist (2:00 PM)

1. **Performance Review**
   ```sql
   SELECT 
     metric_name,
     AVG(metric_value) as avg_value,
     MAX(metric_value) as max_value
   FROM communication_performance_metrics 
   WHERE metric_timestamp > NOW() - INTERVAL '4 hours'
   GROUP BY metric_name;
   ```

2. **Capacity Planning**
   - Review connection pool usage
   - Check queue depths
   - Monitor disk usage

3. **Data Quality Check**
   ```typescript
   const integrityService = new CommunicationDataIntegrityService();
   const report = await integrityService.runIntegrityChecks();
   console.log('Data Quality Report:', report);
   ```

### Evening Checklist (6:00 PM)

1. **Daily Maintenance**
   ```sql
   SELECT * FROM perform_communication_maintenance();
   ```

2. **Backup Schedule Verification**
   ```sql
   SELECT backup_id, status, row_count, backup_size_bytes 
   FROM communication_backups 
   WHERE DATE(started_at) = CURRENT_DATE;
   ```

3. **Security Review**
   - Review failed authentication attempts
   - Check for unusual access patterns
   - Verify encryption status

## Monitoring & Alerting

### Key Performance Indicators (KPIs)

1. **System Performance**
   - Average query response time < 500ms
   - P95 response time < 1000ms
   - P99 response time < 2000ms
   - Error rate < 1%

2. **Throughput Metrics**
   - Messages processed per minute
   - Concurrent operations supported
   - Queue processing rate

3. **Resource Utilization**
   - CPU usage < 70%
   - Memory usage < 80%
   - Database connections < 85% of max
   - Disk usage < 75%

### Alert Thresholds

```yaml
# Critical Alerts (Immediate Response)
critical_alerts:
  - metric: error_rate
    threshold: 5%
    action: "Page on-call engineer"
  
  - metric: average_query_time
    threshold: 2000ms
    action: "Escalate to database team"
  
  - metric: active_connections
    threshold: 95%
    action: "Scale connection pool"

# Warning Alerts (Review within 1 hour)
warning_alerts:
  - metric: cache_hit_ratio
    threshold: 70%
    action: "Review cache strategy"
  
  - metric: disk_usage
    threshold: 80%
    action: "Plan capacity expansion"
```

### Monitoring Setup

```typescript
// Initialize monitoring
const monitor = new CommunicationProductionMonitor(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Start monitoring with 1-minute intervals
await monitor.startMonitoring(60000);

// Set up alert handlers
monitor.on('alert:triggered', (alert) => {
  console.log(`ALERT: ${alert.metric} = ${alert.value} (threshold: ${alert.threshold})`);
  
  if (alert.severity === 'critical') {
    // Send to PagerDuty or similar
    sendCriticalAlert(alert);
  }
});
```

## Database Maintenance

### Weekly Maintenance (Sundays 2:00 AM)

1. **Statistics Update**
   ```sql
   ANALYZE;
   ```

2. **Index Maintenance**
   ```sql
   REINDEX DATABASE wedsync;
   ```

3. **Vacuum Operations**
   ```sql
   VACUUM ANALYZE;
   ```

4. **Archive Old Data**
   ```sql
   SELECT * FROM perform_communication_maintenance();
   ```

### Monthly Maintenance (First Sunday of Month)

1. **Partition Management**
   ```sql
   -- Create new monthly partition
   CREATE TABLE guest_communications_YYYY_MM PARTITION OF guest_communications
   FOR VALUES FROM ('YYYY-MM-01') TO ('YYYY-MM+1-01');
   
   -- Drop old partitions (older than 12 months)
   DROP TABLE IF EXISTS guest_communications_YYYY_MM;
   ```

2. **Performance Analysis**
   ```sql
   SELECT * FROM pg_stat_statements ORDER BY total_time DESC LIMIT 20;
   ```

3. **Capacity Planning Review**
   - Analyze growth trends
   - Plan for scaling needs
   - Review archive strategy

### Connection Pool Management

```typescript
// Monitor connection pool health
const poolConfig = {
  min_connections: 20,
  max_connections: 200,
  connection_timeout_ms: 5000,
  idle_timeout_ms: 30000
};

// Update pool configuration
await supabase
  .from('communication_pool_config')
  .upsert({
    pool_name: 'production',
    ...poolConfig
  });
```

## Backup & Recovery

### Automated Backup Schedule

- **Full Backup**: Daily at 1:00 AM
- **Incremental Backup**: Every 4 hours
- **Transaction Log Backup**: Every 15 minutes

### Backup Verification

```sql
-- Run daily backup
SELECT * FROM backup_communication_system('full');

-- Verify backup integrity
SELECT 
  backup_id,
  status,
  row_count,
  backup_size_bytes,
  completed_at
FROM communication_backups
WHERE DATE(started_at) = CURRENT_DATE;
```

### Recovery Procedures

#### Point-in-Time Recovery

```sql
-- Create recovery point
INSERT INTO communication_recovery_points (
  recovery_point_id,
  recovery_type,
  tables_included,
  point_in_time,
  consistent
) VALUES (
  'recovery_' || to_char(NOW(), 'YYYYMMDD_HH24MISS'),
  'point_in_time',
  ARRAY['guest_communications', 'communication_recipients'],
  NOW(),
  true
);
```

#### Table-Level Recovery

```sql
-- Restore specific table from backup
-- (This would typically be done with pg_restore or similar tools)
-- RESTORE TABLE guest_communications FROM BACKUP 'backup_20250826_020000';
```

## Performance Tuning

### Query Optimization

1. **Slow Query Analysis**
   ```sql
   SELECT 
     query_text,
     calls,
     total_time,
     mean_time,
     rows
   FROM pg_stat_statements 
   WHERE mean_time > 1000  -- Queries taking > 1 second on average
   ORDER BY total_time DESC;
   ```

2. **Index Usage Analysis**
   ```sql
   SELECT 
     schemaname,
     tablename,
     indexname,
     idx_tup_read,
     idx_tup_fetch
   FROM pg_stat_user_indexes
   WHERE idx_tup_read = 0;  -- Unused indexes
   ```

3. **Connection Pool Tuning**
   ```sql
   UPDATE communication_pool_config 
   SET max_connections = 300  -- Increase based on load
   WHERE pool_name = 'production';
   ```

### Load Testing

```typescript
// Run production load test
const loadTestService = new CommunicationLoadTestingService(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const config = {
  targetConcurrency: 2000,
  testDurationMs: 300000,  // 5 minutes
  rampUpTimeMs: 60000,     // 1 minute ramp up
  organizationId: 'prod-org-id',
  messageTypes: ['email', 'sms', 'push']
};

const result = await loadTestService.runLoadTest(config);
console.log('Load Test Results:', result);

// Verify 2000+ concurrent operations capability
const canHandle2000 = await loadTestService.verify2000ConcurrentOperations();
console.log('Can handle 2000+ concurrent operations:', canHandle2000);
```

## Security Operations

### Daily Security Checks

1. **Audit Log Review**
   ```sql
   SELECT 
     event_type,
     user_id,
     ip_address,
     risk_level,
     success,
     COUNT(*) as occurrences
   FROM communication_security_audit
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY event_type, user_id, ip_address, risk_level, success
   ORDER BY risk_level DESC, occurrences DESC;
   ```

2. **Failed Authentication Analysis**
   ```sql
   SELECT 
     ip_address,
     COUNT(*) as failed_attempts,
     MIN(created_at) as first_attempt,
     MAX(created_at) as last_attempt
   FROM communication_security_audit
   WHERE success = false 
     AND event_type = 'authentication'
     AND created_at > NOW() - INTERVAL '24 hours'
   GROUP BY ip_address
   HAVING COUNT(*) > 10
   ORDER BY failed_attempts DESC;
   ```

### Encryption Key Management

```sql
-- Rotate encryption keys monthly
INSERT INTO communication_encryption_keys (
  key_id,
  key_type,
  algorithm,
  encrypted_key,
  key_version
) VALUES (
  'master_key_' || to_char(NOW(), 'YYYYMM'),
  'master',
  'AES-256-GCM',
  encrypt_key(generate_random_key()),
  (SELECT COALESCE(MAX(key_version), 0) + 1 FROM communication_encryption_keys WHERE key_type = 'master')
);
```

### Rate Limiting Monitoring

```sql
-- Check for rate limit violations
SELECT 
  identifier,
  endpoint,
  SUM(request_count) as total_requests,
  COUNT(*) FILTER (WHERE limit_exceeded) as violations
FROM communication_rate_limits
WHERE window_start > NOW() - INTERVAL '1 hour'
GROUP BY identifier, endpoint
HAVING COUNT(*) FILTER (WHERE limit_exceeded) > 0
ORDER BY violations DESC;
```

## Compliance Management

### GDPR Compliance

1. **Data Retention Monitoring**
   ```sql
   -- Check for data past retention period
   SELECT 
     COUNT(*) as records_to_archive,
     MIN(created_at) as oldest_record
   FROM guest_communications
   WHERE created_at < NOW() - INTERVAL '365 days'
     AND is_archived = false;
   ```

2. **Consent Verification**
   ```sql
   -- Verify consent for recent communications
   SELECT 
     gc.id,
     gc.message_title,
     COUNT(cr.id) as total_recipients,
     COUNT(cgc.id) as recipients_with_consent
   FROM guest_communications gc
   JOIN communication_recipients cr ON gc.id = cr.communication_id
   LEFT JOIN communication_gdpr_consent cgc ON cr.recipient_email = cgc.guest_email
     AND cgc.consent_given = true
   WHERE gc.created_at > NOW() - INTERVAL '7 days'
   GROUP BY gc.id, gc.message_title
   HAVING COUNT(cr.id) > COUNT(cgc.id);
   ```

### CAN-SPAM Compliance

1. **Compliance Score Monitoring**
   ```sql
   -- Check compliance scores
   SELECT 
     AVG(compliance_score) as avg_compliance,
     COUNT(*) FILTER (WHERE compliance_score < 80) as non_compliant
   FROM communication_canspam_compliance
   WHERE validation_timestamp > NOW() - INTERVAL '24 hours';
   ```

2. **Auto-Validation**
   ```typescript
   // Validate all outgoing messages for CAN-SPAM compliance
   const validateCANSPAM = async (communicationId: string) => {
     const { data, error } = await supabase
       .from('communication_canspam_compliance')
       .insert({
         communication_id: communicationId,
         has_unsubscribe_link: true,
         has_physical_address: true,
         has_clear_sender: true,
         subject_line_accurate: true,
         compliance_score: 100
       });
   };
   ```

## Incident Response

### Severity Levels

1. **SEV-1 (Critical)**: System down, data loss, security breach
2. **SEV-2 (High)**: Major functionality impacted, performance degraded
3. **SEV-3 (Medium)**: Minor functionality issues, workarounds available
4. **SEV-4 (Low)**: Cosmetic issues, enhancement requests

### Response Procedures

#### SEV-1 Incidents

1. **Immediate Actions (0-5 minutes)**
   - Page on-call engineer
   - Create incident channel
   - Start incident timeline

2. **Assessment (5-15 minutes)**
   - Run health checks
   - Identify affected components
   - Estimate impact

3. **Mitigation (15-60 minutes)**
   - Implement immediate fixes
   - Activate backup systems
   - Communicate to stakeholders

#### Common Incident Scenarios

1. **High Error Rate**
   ```sql
   -- Check error patterns
   SELECT 
     error_code,
     COUNT(*) as error_count,
     error_message
   FROM delivery_status
   WHERE status = 'failed'
     AND created_at > NOW() - INTERVAL '1 hour'
   GROUP BY error_code, error_message
   ORDER BY error_count DESC;
   ```

2. **Database Connection Issues**
   ```typescript
   // Check connection pool status
   const poolStatus = await monitor.getConnectionMetrics();
   if (poolStatus.active > poolStatus.max * 0.9) {
     // Scale up connection pool
     await scaleConnectionPool(poolStatus.max * 1.2);
   }
   ```

3. **Performance Degradation**
   ```sql
   -- Identify slow queries
   SELECT 
     query_hash,
     query_text,
     execution_time_ms,
     rows_affected
   FROM communication_query_performance
   WHERE execution_time_ms > 5000
     AND created_at > NOW() - INTERVAL '30 minutes'
   ORDER BY execution_time_ms DESC;
   ```

## Troubleshooting Guide

### Common Issues

#### 1. Slow Query Performance

**Symptoms**: High response times, query timeouts

**Diagnosis**:
```sql
-- Check for blocking queries
SELECT 
  blocked.pid AS blocked_pid,
  blocked.query as blocked_query,
  blocking.pid AS blocking_pid,
  blocking.query as blocking_query
FROM pg_stat_activity blocked
JOIN pg_stat_activity blocking ON blocked.waiting = blocking.query
WHERE blocked.waiting;
```

**Resolution**:
1. Kill long-running queries if necessary
2. Update table statistics: `ANALYZE table_name;`
3. Consider adding indexes for frequently queried columns

#### 2. Connection Pool Exhaustion

**Symptoms**: Connection timeouts, "too many connections" errors

**Diagnosis**:
```sql
SELECT count(*) as active_connections 
FROM pg_stat_activity 
WHERE state = 'active';
```

**Resolution**:
1. Increase connection pool size
2. Optimize connection usage in application
3. Add connection pooling middleware

#### 3. High Memory Usage

**Symptoms**: System slowdown, OOM errors

**Diagnosis**:
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Resolution**:
1. Archive old data
2. Optimize queries to reduce memory usage
3. Consider partitioning large tables

## Scaling Procedures

### Vertical Scaling

1. **CPU Scaling**
   - Monitor CPU usage patterns
   - Scale up during peak hours
   - Consider auto-scaling policies

2. **Memory Scaling**
   - Monitor memory utilization
   - Increase shared_buffers for PostgreSQL
   - Add application memory

3. **Storage Scaling**
   - Monitor disk usage trends
   - Implement automated storage expansion
   - Optimize archival strategies

### Horizontal Scaling

1. **Read Replicas**
   ```sql
   -- Configure read replica for reporting queries
   -- Route read-only queries to replica
   ```

2. **Connection Pooling**
   ```typescript
   // Scale connection pools based on load
   const scaleConnectionPool = async (newMaxConnections: number) => {
     await supabase
       .from('communication_pool_config')
       .update({ max_connections: newMaxConnections })
       .eq('pool_name', 'production');
   };
   ```

3. **Queue Processing**
   ```sql
   -- Scale batch processing workers
   INSERT INTO communication_batch_queue (
     batch_id,
     operation_type,
     payload,
     priority
   ) VALUES (
     'scale_workers_' || generate_random_uuid(),
     'scale_workers',
     '{"worker_count": 10}',
     1
   );
   ```

## Emergency Procedures

### Data Recovery

1. **Immediate Actions**
   - Stop all write operations
   - Identify point of failure
   - Assess data loss scope

2. **Recovery Steps**
   ```sql
   -- Restore from most recent backup
   SELECT * FROM backup_communication_system('emergency_restore');
   
   -- Verify data integrity after restore
   SELECT * FROM check_communication_system_health();
   ```

3. **Verification**
   - Run integrity checks
   - Verify recent transactions
   - Test core functionality

### Security Incident Response

1. **Containment**
   - Isolate affected systems
   - Change access credentials
   - Enable additional logging

2. **Investigation**
   ```sql
   -- Review security audit logs
   SELECT * FROM communication_security_audit
   WHERE created_at > 'incident_start_time'
   ORDER BY created_at DESC;
   ```

3. **Recovery**
   - Patch vulnerabilities
   - Update security policies
   - Communicate to stakeholders

## Contact Information

### On-Call Escalation

1. **Primary**: Team E Lead
2. **Secondary**: Database Administrator
3. **Escalation**: Platform Engineering Manager

### External Contacts

- **Supabase Support**: [support@supabase.io]
- **Security Team**: [security@company.com]
- **Compliance Team**: [compliance@company.com]

---

**Document Version**: 3.0  
**Next Review Date**: 2025-09-26  
**Maintained By**: Team E - WS-155 Guest Communications