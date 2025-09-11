# Service Down Runbook

**Severity**: P0 (Critical)  
**Response Time**: 15 minutes  
**Escalation**: Immediate

## Symptoms
- Application returns 5xx errors or no response
- Load balancer health checks failing
- Users unable to access the application
- CloudWatch alarms firing for service availability

## Quick Diagnosis Steps

### 1. Check Load Balancer Status (2 minutes)
```bash
# Check ALB target group health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:us-east-1:ACCOUNT:targetgroup/wedsync-prod-tg/XXXXXXXXXX

# Check ALB metrics in CloudWatch
# Look for TargetResponseTime, HealthyHostCount, UnHealthyHostCount
```

**Expected**: At least 1 healthy target
**If unhealthy**: Proceed to step 2

### 2. Check Auto Scaling Group (2 minutes)
```bash
# Check ASG status
aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names wedsync-prod-asg

# Check recent scaling activities
aws autoscaling describe-scaling-activities --auto-scaling-group-name wedsync-prod-asg --max-items 10
```

**Expected**: Desired capacity matches running instances
**If not**: Check instance launch failures, proceed to step 3

### 3. Check Individual Instances (3 minutes)
```bash
# List instances in ASG
aws ec2 describe-instances --filters "Name=tag:aws:autoscaling:groupName,Values=wedsync-prod-asg" --query 'Reservations[*].Instances[*].[InstanceId,State.Name,PrivateIpAddress]' --output table

# Check system status
aws ec2 describe-instance-status --instance-ids i-1234567890abcdef0
```

**For each unhealthy instance**:
- Check CloudWatch Logs: `/aws/ec2/wedsync-prod-app`
- SSH to instance if accessible:
  ```bash
  ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[PRIVATE_IP]
  sudo docker ps
  sudo docker logs wedsync-app --tail 50
  ```

## Common Causes & Solutions

### Cause 1: Application Crash
**Symptoms**: Containers stopped, high CPU/memory before crash
**Solution**:
```bash
# Restart application containers on affected instances
ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[INSTANCE_IP]
sudo docker restart wedsync-app

# If that fails, redeploy
sudo docker pull your-registry/wedsync:latest
sudo docker stop wedsync-app
sudo docker rm wedsync-app
sudo docker run -d --name wedsync-app [container_config]
```

### Cause 2: Database Connection Issues
**Symptoms**: App logs show database connection errors
**Solution**:
```bash
# Check RDS status
aws rds describe-db-instances --db-instance-identifier wedsync-prod

# Check database connectivity from app server
ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[INSTANCE_IP]
nc -zv [RDS_ENDPOINT] 5432

# Check connection pool exhaustion
sudo docker exec wedsync-app npm run db:pool:status
```

### Cause 3: Insufficient Capacity
**Symptoms**: High CPU/memory, slow response times before failure
**Solution**:
```bash
# Manually scale up immediately
aws autoscaling set-desired-capacity --auto-scaling-group-name wedsync-prod-asg --desired-capacity 6

# Check if scaling is working
aws autoscaling describe-scaling-activities --auto-scaling-group-name wedsync-prod-asg --max-items 5
```

### Cause 4: External Service Dependency Failure
**Symptoms**: App logs show timeouts to external APIs (Stripe, Supabase, OpenAI)
**Solution**:
```bash
# Check external service status
curl -I https://api.stripe.com/v1/charges
curl -I https://[your-project].supabase.co/rest/v1/

# Enable circuit breaker if not already active
ssh -i ~/.ssh/wedsync-prod.pem ec2-user@[INSTANCE_IP]
sudo docker exec wedsync-app curl -X POST localhost:3000/api/admin/circuit-breaker/enable
```

### Cause 5: SSL Certificate Issues
**Symptoms**: HTTPS requests failing, certificate expired
**Solution**:
```bash
# Check certificate status
aws acm describe-certificate --certificate-arn [CERTIFICATE_ARN]

# Check ALB listener configuration
aws elbv2 describe-listeners --load-balancer-arn [ALB_ARN]

# If expired, request new certificate and update ALB
aws acm request-certificate --domain-name wedsync.com --domain-name "*.wedsync.com"
```

## Emergency Procedures

### Immediate Mitigation (5 minutes)
If service is completely down and cause is unclear:

1. **Scale up aggressively**:
   ```bash
   aws autoscaling set-desired-capacity --auto-scaling-group-name wedsync-prod-asg --desired-capacity 8
   ```

2. **Enable maintenance page** (if configured):
   ```bash
   aws elbv2 modify-rule --rule-arn [MAINTENANCE_RULE_ARN] --conditions '[{"Field":"path-pattern","Values":["*"]}]'
   ```

3. **Rollback to last known good version**:
   ```bash
   aws deploy create-deployment --application-name wedsync-prod --deployment-group-name prod-deployment-group --revision-type=S3 --s3-location bucket=wedsync-deployments,key=rollback/last-known-good.zip
   ```

### Communication (Immediate)
1. **Update status page**: status.wedsync.com
2. **Notify stakeholders**:
   ```bash
   # Send Slack alert
   curl -X POST -H 'Content-type: application/json' \
   --data '{"text":"🚨 CRITICAL: WedSync service is down. Investigating immediately."}' \
   [SLACK_WEBHOOK_URL]
   ```
3. **Prepare customer communication** if outage exceeds 10 minutes

## Recovery Verification

Once service appears to be restored:

### 1. Health Check Verification (2 minutes)
```bash
# Check all health endpoints
curl -f https://wedsync.com/api/health
curl -f https://wedsync.com/api/health/deep
curl -f https://wedsync.com/api/health/database
```

### 2. End-to-End Testing (3 minutes)
```bash
# Test critical user journeys
curl -X POST https://wedsync.com/api/auth/login -d '{"email":"test@example.com","password":"test"}'
curl -X GET https://wedsync.com/api/forms -H "Authorization: Bearer [token]"
curl -X POST https://wedsync.com/api/pdf/upload -F "file=@test.pdf" -H "Authorization: Bearer [token]"
```

### 3. Monitor for 15 Minutes
- Watch CloudWatch metrics for error rates
- Monitor application logs for errors
- Check database connection counts
- Verify no new alerts are firing

## Post-Incident Actions

### Immediate (Within 30 minutes of resolution)
1. **Document timeline** in incident tracking system
2. **Notify stakeholders** of resolution
3. **Update status page** with resolution
4. **Save all relevant logs** for analysis

### Follow-up (Within 24 hours)
1. **Conduct post-mortem** with engineering team
2. **Identify root cause** and contributing factors
3. **Create action items** to prevent recurrence
4. **Update runbooks** based on lessons learned
5. **Review monitoring coverage** - did we detect this fast enough?

### Prevention Tasks
- [ ] Add additional health checks if issue wasn't detected quickly
- [ ] Improve error handling for identified failure modes
- [ ] Review capacity planning if scale was a factor
- [ ] Update deployment procedures if deployment-related
- [ ] Enhance monitoring alerts based on incident patterns

## Key Metrics to Monitor Post-Recovery
- Response time: Should be < 200ms for 95% of requests
- Error rate: Should be < 1%
- Database connections: Should be < 80% of max
- Memory usage: Should be < 85%
- CPU usage: Should be < 75%

Remember: The goal is to restore service as quickly as possible. Don't spend too much time diagnosing during the incident - focus on mitigation first, root cause analysis second.