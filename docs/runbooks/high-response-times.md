# High Response Times Runbook

**Severity**: P1 (High)  
**Response Time**: 1 hour  
**Escalation**: After 2 hours if not resolved

## Symptoms
- Response times > 500ms for 95th percentile
- Users reporting slow page loads
- CloudWatch ALB TargetResponseTime alerts
- Application performance degradation

## Quick Diagnosis Steps

### 1. Check Current Performance Metrics (2 minutes)
```bash
# Check ALB response times
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name TargetResponseTime \
  --dimensions Name=LoadBalancer,Value=app/wedsync-prod-alb/xxxxx \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check request volume
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApplicationELB \
  --metric-name RequestCount \
  --dimensions Name=LoadBalancer,Value=app/wedsync-prod-alb/xxxxx \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### 2. Check Application Server Resources (3 minutes)
```bash
# Check CPU and memory usage
aws cloudwatch get-metric-statistics \
  --namespace AWS/EC2 \
  --metric-name CPUUtilization \
  --dimensions Name=AutoScalingGroupName,Value=wedsync-prod-asg \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# SSH to an instance to check detailed metrics
ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[INSTANCE_IP]
top -n 1
free -h
iostat -x 1 3
```

### 3. Check Database Performance (3 minutes)
```bash
# Check RDS CPU and connections
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name CPUUtilization \
  --dimensions Name=DBInstanceIdentifier,Value=wedsync-prod \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check database connection count
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=wedsync-prod \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

## Common Causes & Solutions

### Cause 1: High CPU Usage on Application Servers
**Symptoms**: CPU > 80%, slow response across all endpoints
**Diagnosis**:
```bash
# Check which processes are consuming CPU
ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[INSTANCE_IP]
top -n 1 -p $(pgrep -f node)
sudo docker stats wedsync-app

# Check for CPU-intensive operations in logs
sudo docker logs wedsync-app --tail 100 | grep -i "slow\|timeout\|processing"
```

**Solution**:
```bash
# Immediate: Scale out
aws autoscaling set-desired-capacity --auto-scaling-group-name wedsync-prod-asg --desired-capacity [CURRENT+2]

# Check for inefficient code paths
# Look for N+1 queries, unoptimized loops, or blocking operations
```

### Cause 2: Database Performance Issues
**Symptoms**: High DB CPU, slow queries, connection pool exhaustion
**Diagnosis**:
```bash
# Connect to database and check for slow queries
psql -h [RDS_ENDPOINT] -U wedsync_admin -d wedsync_production

-- Check active queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- Check for blocking queries
SELECT blocked_locks.pid AS blocked_pid,
       blocked_activity.usename AS blocked_user,
       blocking_locks.pid AS blocking_pid,
       blocking_activity.usename AS blocking_user,
       blocked_activity.query AS blocked_statement,
       blocking_activity.query AS current_statement_in_blocking_process
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON (blocking_locks.locktype = blocked_locks.locktype 
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation)
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;
```

**Solution**:
```bash
# Kill long-running queries (be careful!)
-- SELECT pg_terminate_backend([PID]);

# Scale up RDS instance temporarily
aws rds modify-db-instance --db-instance-identifier wedsync-prod --db-instance-class db.r5.xlarge --apply-immediately

# Add read replica if read-heavy
aws rds create-db-instance-read-replica --db-instance-identifier wedsync-prod-replica-3 --source-db-instance-identifier wedsync-prod
```

### Cause 3: Memory Pressure
**Symptoms**: High memory usage, frequent garbage collection, swap usage
**Diagnosis**:
```bash
ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[INSTANCE_IP]
free -h
sudo docker exec wedsync-app node -e "console.log(process.memoryUsage())"
sudo docker exec wedsync-app ps aux --sort=-%mem | head -10
```

**Solution**:
```bash
# Immediate: Restart containers to clear memory leaks
sudo docker restart wedsync-app

# Scale up to larger instance types
aws autoscaling update-auto-scaling-group --auto-scaling-group-name wedsync-prod-asg --launch-template Version='$Latest',LaunchTemplateName=wedsync-prod-lt-large

# Check for memory leaks in application
sudo docker exec wedsync-app curl localhost:3000/api/admin/memory-usage
```

### Cause 4: Cache Performance Issues
**Symptoms**: High Redis CPU, cache misses, slow Redis responses
**Diagnosis**:
```bash
# Check Redis metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ElastiCache \
  --metric-name CPUUtilization \
  --dimensions Name=CacheClusterId,Value=wedsync-prod-redis \
  --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Connect to Redis and check performance
redis-cli -h [REDIS_ENDPOINT]
INFO stats
SLOWLOG GET 10
```

**Solution**:
```bash
# Scale up Redis cluster
aws elasticache modify-replication-group --replication-group-id wedsync-prod-redis --cache-node-type cache.r5.large --apply-immediately

# Clear cache if corrupted
redis-cli -h [REDIS_ENDPOINT] FLUSHDB

# Check cache hit rates and optimize cache keys
redis-cli -h [REDIS_ENDPOINT] INFO stats | grep keyspace_hits
```

### Cause 5: External API Latency
**Symptoms**: Slow responses on specific endpoints that call external APIs
**Diagnosis**:
```bash
# Check application logs for external API timeouts
sudo docker logs wedsync-app --tail 200 | grep -i "stripe\|supabase\|openai\|timeout"

# Test external API response times
time curl -I https://api.stripe.com/v1/charges
time curl -I https://[your-project].supabase.co/rest/v1/
time curl -I https://api.openai.com/v1/models
```

**Solution**:
```bash
# Enable circuit breaker for slow external services
ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[INSTANCE_IP]
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/circuit-breaker/enable

# Increase timeouts temporarily
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/config/timeout -d '{"value": 30000}'

# Implement async processing for non-critical operations
```

## Performance Optimization Actions

### Immediate Actions (< 30 minutes)
1. **Scale horizontally**:
   ```bash
   aws autoscaling set-desired-capacity --auto-scaling-group-name wedsync-prod-asg --desired-capacity [CURRENT+2]
   ```

2. **Check and restart problematic services**:
   ```bash
   # Restart application containers showing high resource usage
   ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[PROBLEM_INSTANCE]
   sudo docker restart wedsync-app
   ```

3. **Enable performance mode features**:
   ```bash
   # Enable aggressive caching
   sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/cache/aggressive-mode

   # Enable request rate limiting
   sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/rate-limit/enable
   ```

### Medium-term Actions (1-4 hours)
1. **Database optimization**:
   ```sql
   -- Add missing indexes
   CREATE INDEX CONCURRENTLY idx_forms_user_id ON forms(user_id);
   CREATE INDEX CONCURRENTLY idx_pdf_uploads_status ON pdf_uploads(status);
   
   -- Update table statistics
   ANALYZE;
   ```

2. **Code optimization**:
   ```bash
   # Deploy performance fixes if available
   aws deploy create-deployment --application-name wedsync-prod --deployment-group-name prod-deployment-group --revision-type=S3 --s3-location bucket=wedsync-deployments,key=hotfix/performance-v1.2.4.zip
   ```

## Monitoring & Verification

### Key Metrics to Track
```bash
# Monitor these metrics every 5 minutes during incident
watch -n 300 "
  echo 'ALB Response Time:';
  aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB --metric-name TargetResponseTime --dimensions Name=LoadBalancer,Value=app/wedsync-prod-alb/xxxxx --start-time \$(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) --end-time \$(date -u +%Y-%m-%dT%H:%M:%S) --period 300 --statistics Average --query 'Datapoints[0].Average';
  
  echo 'Error Rate:';
  aws cloudwatch get-metric-statistics --namespace AWS/ApplicationELB --metric-name HTTPCode_Target_5XX_Count --dimensions Name=LoadBalancer,Value=app/wedsync-prod-alb/xxxxx --start-time \$(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%S) --end-time \$(date -u +%Y-%m-%dT%H:%M:%S) --period 300 --statistics Sum --query 'Datapoints[0].Sum || \`0\`';
"
```

### Performance Targets
- **95th percentile response time**: < 500ms
- **99th percentile response time**: < 1000ms
- **Average response time**: < 200ms
- **Error rate**: < 1%

### Recovery Verification
```bash
# Run performance test to verify improvement
curl -w "@curl-format.txt" -o /dev/null -s https://wedsync.com/api/health
curl -w "@curl-format.txt" -o /dev/null -s https://wedsync.com/api/forms
curl -w "@curl-format.txt" -o /dev/null -s https://wedsync.com/api/users/profile
```

## Prevention Tasks

After resolving the incident:
- [ ] Analyze slow query logs and add missing database indexes
- [ ] Review application code for performance bottlenecks
- [ ] Implement additional caching for frequently accessed data
- [ ] Set up automated performance testing in CI/CD
- [ ] Configure additional CloudWatch alarms for early detection
- [ ] Review capacity planning and auto-scaling policies
- [ ] Document performance baselines and thresholds

## Long-term Performance Improvements
1. **Database optimization**: Regular index analysis, query optimization
2. **Caching strategy**: Implement multi-level caching (Redis, CDN, application)
3. **Code profiling**: Regular performance audits and optimization
4. **Load testing**: Monthly load tests to identify performance regressions
5. **Capacity planning**: Predictive scaling based on usage patterns