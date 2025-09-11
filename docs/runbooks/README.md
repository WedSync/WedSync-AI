# WedSync Production Runbooks

This directory contains incident response runbooks for common production issues in WedSync. Each runbook provides step-by-step instructions for diagnosing and resolving specific problems.

## Available Runbooks

### 🚨 Critical Issues (P0)
- [Service Down](./service-down.md) - When the application is completely unavailable
- [Database Failure](./database-failure.md) - RDS instance failures and connection issues
- [Payment Processing Failure](./payment-failure.md) - Stripe payment system issues

### ⚠️ High Priority Issues (P1)
- [High Response Times](./high-response-times.md) - Performance degradation issues
- [High Error Rates](./high-error-rates.md) - Increased 4xx/5xx error responses
- [PDF Processing Issues](./pdf-processing-issues.md) - OCR and form creation failures
- [Memory/CPU Alerts](./resource-alerts.md) - Server resource exhaustion

### 📊 Medium Priority Issues (P2)
- [Cache Issues](./cache-issues.md) - Redis connection and performance problems
- [S3 Upload Failures](./s3-upload-failures.md) - File storage issues
- [Email Delivery Issues](./email-delivery-issues.md) - Resend/SMTP problems

### 🔧 Maintenance & Scaling
- [Scaling Events](./scaling-events.md) - Auto-scaling triggers and manual scaling
- [Database Maintenance](./database-maintenance.md) - Planned maintenance procedures
- [Deployment Rollbacks](./deployment-rollbacks.md) - How to rollback failed deployments

## Using These Runbooks

### Quick Reference
1. **Identify the issue** - Check monitoring dashboards and alerts
2. **Find the appropriate runbook** - Use the issue type to locate the correct guide
3. **Follow the steps** - Execute troubleshooting steps in order
4. **Document the incident** - Record what happened and what was done
5. **Follow up** - Ensure the issue is fully resolved and create prevention tasks

### Alert Severity Levels
- **P0 (Critical)**: Service down, data loss, security breach - 15 minute response time
- **P1 (High)**: Major functionality impaired - 1 hour response time  
- **P2 (Medium)**: Minor functionality issues - 4 hour response time
- **P3 (Low)**: Enhancement requests - Next business day

### Escalation Path
1. **First Response**: On-call engineer
2. **Level 1**: Engineering team lead
3. **Level 2**: CTO/Technical director
4. **Executive**: CEO (for P0 incidents affecting revenue)

### Emergency Contacts
- **On-Call Engineer**: +1-XXX-XXX-XXXX
- **Engineering Manager**: +1-XXX-XXX-XXXX
- **CTO**: +1-XXX-XXX-XXXX

### Tools and Access
- **Monitoring**: CloudWatch Dashboard
- **Logs**: CloudWatch Logs
- **Infrastructure**: AWS Console
- **Database**: RDS Console
- **Cache**: ElastiCache Console
- **CDN**: CloudFront Console
- **Communication**: Slack #production-alerts

### Common Commands

#### AWS CLI
```bash
# Check ECS service status
aws ecs describe-services --cluster wedsync-prod --services wedsync-app

# Check RDS status
aws rds describe-db-instances --db-instance-identifier wedsync-prod

# Check ALB health
aws elbv2 describe-target-health --target-group-arn [TARGET_GROUP_ARN]
```

#### Docker Commands
```bash
# Check container status
docker ps

# View container logs
docker logs [container_id] --tail 100

# Restart container
docker restart [container_id]
```

#### Database Commands
```sql
-- Check active connections
SELECT count(*) FROM pg_stat_activity;

-- Check slow queries
SELECT query, query_start, state, wait_event 
FROM pg_stat_activity 
WHERE state != 'idle' 
ORDER BY query_start;

-- Check database size
SELECT pg_size_pretty(pg_database_size('wedsync_production'));
```

### Post-Incident Process

After resolving any incident:

1. **Document in incident log** - Record what happened, when, and how it was resolved
2. **Update monitoring** - Add new alerts if the issue wasn't caught early enough
3. **Create prevention tasks** - Add items to the backlog to prevent recurrence
4. **Review and improve** - Update runbooks based on what was learned
5. **Communicate** - Send summary to stakeholders if it was a significant incident

### Runbook Maintenance

These runbooks should be reviewed and updated:
- **Monthly**: Review all runbooks for accuracy
- **After each incident**: Update based on lessons learned
- **Quarterly**: Full review of all procedures and contacts
- **When systems change**: Update commands and procedures

For questions about these runbooks or to suggest improvements, contact the DevOps team in #infrastructure-ops.