# WS-155 Guest Communications System - Production Guide

## Overview

The WS-155 Guest Communications System is a comprehensive messaging platform designed for wedding professionals to communicate effectively with their guests. This production-ready system includes performance optimization, security hardening, compliance features, and comprehensive monitoring.

## Features Delivered

### 1. Performance Optimization
- **High-Volume Processing**: Handles 1000+ recipients efficiently
- **Connection Pooling**: Optimized database connections for better performance  
- **Batch Processing**: Smart batching with configurable sizes (50-200 per batch)
- **Rate Limiting**: Intelligent rate limiting based on organization tier
- **Circuit Breaker**: Automatic failure detection and recovery
- **Caching**: Redis-based caching for improved response times

### 2. CAN-SPAM Compliance
- **Automatic Compliance Headers**: List-Unsubscribe and other required headers
- **Unsubscribe Management**: One-click unsubscribe functionality
- **Physical Address**: Automatic inclusion of organization address
- **Suppression Lists**: Automatic suppression of unsubscribed emails
- **Compliance Validation**: Pre-send compliance checking
- **Audit Trail**: Complete audit trail for compliance reporting

### 3. Security Features
- **Content Filtering**: Advanced spam and malicious content detection
- **Rate Limiting**: Per-organization and per-user rate limits
- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Protection**: Parameterized queries throughout
- **XSS Prevention**: Content sanitization and CSP headers
- **Circuit Breakers**: Protection against cascading failures

### 4. Accessibility (WCAG 2.1 AA)
- **Screen Reader Support**: Full ARIA labels and roles
- **Keyboard Navigation**: Complete keyboard accessibility
- **Focus Management**: Proper focus indicators and management
- **Color Contrast**: WCAG AA compliant color contrast ratios
- **Alternative Text**: Alt text for all images and icons
- **Form Validation**: Accessible error messaging

### 5. Error Recovery & User Feedback
- **Automatic Retry**: Exponential backoff retry strategies
- **Graceful Degradation**: Alternative methods when primary fails
- **User Feedback**: Clear, actionable error messages
- **Progress Indicators**: Real-time progress updates
- **Recovery Options**: Multiple recovery paths for different error types

### 6. Monitoring & Analytics
- **Real-time Metrics**: Live dashboard with key performance indicators
- **Alert System**: Configurable alerts for performance thresholds
- **Performance Tracking**: Detailed performance metrics and trends
- **Error Tracking**: Comprehensive error logging and analysis
- **Business Metrics**: Delivery rates, engagement metrics, compliance stats

## Getting Started

### For Wedding Professionals

#### 1. Creating Your First Campaign

1. **Navigate to Communications**
   - Go to your dashboard
   - Click "Guest Communications" in the main menu

2. **Create New Campaign**
   - Click "New Campaign"
   - Enter campaign name and description
   - Select channels (Email, SMS, or both)

3. **Add Recipients**
   - Import from existing guest list
   - Upload CSV file (email, name, phone columns)
   - Manually add individual guests

4. **Compose Your Message**
   - Write subject line (for email campaigns)
   - Compose your message using available templates
   - Use personalization tokens: `{{guest_name}}`, `{{wedding_date}}`, etc.

5. **Preview and Test**
   - Use the preview function to see how messages will appear
   - Send test messages to yourself
   - Check compliance score

6. **Schedule and Send**
   - Choose immediate send or schedule for later
   - Review recipient count and estimated cost
   - Click "Send Campaign"

#### 2. Managing Recipients

**Adding Recipients:**
```csv
email,name,phone,dietary_requirements,plus_one
john@example.com,John Smith,+1234567890,vegetarian,yes
jane@example.com,Jane Doe,+1234567891,none,no
```

**Segmentation Options:**
- RSVP status (confirmed, pending, declined)
- Dietary requirements
- Plus-one status  
- Custom groups (family, friends, vendors)

**Bulk Operations:**
- Import/export guest lists
- Bulk update preferences
- Mass communications by segment

#### 3. Message Templates

**Wedding Invitation Template:**
```
Dear {{guest_name}},

We're thrilled to invite you to celebrate our wedding!

📅 Date: {{wedding_date}}
📍 Venue: {{venue_name}}
🕒 Time: {{ceremony_time}}

Please RSVP by {{rsvp_deadline}}: {{rsvp_link}}

With love,
{{couple_names}}
```

**RSVP Reminder Template:**
```
Hi {{guest_name}},

We haven't received your RSVP yet for our wedding on {{wedding_date}}.

Please respond by {{rsvp_deadline}}: {{rsvp_link}}

Thanks!
{{couple_names}}
```

**Week-of Details Template:**
```
Dear {{guest_name}},

Our big day is almost here! Final details:

🚗 Parking: {{parking_instructions}}
🍽️ Reception: {{reception_venue}}
📱 Wedding Hashtag: {{wedding_hashtag}}

See you soon!
{{couple_names}}
```

#### 4. Monitoring Your Campaigns

**Dashboard Metrics:**
- Messages sent today
- Delivery rate (email and SMS)
- Open rates and click-through rates
- Unsubscribe rate
- Complaint rate
- Campaign status and progress

**Real-time Updates:**
- Live delivery status per recipient
- Bounce and failure notifications
- Automatic retry status
- Performance metrics

### For System Administrators

#### 1. System Configuration

**Environment Variables:**
```bash
# Database
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...

# Redis Cache
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...

# Email Services
RESEND_API_KEY=...
SMTP_HOST=...
SMTP_PORT=587

# SMS Services  
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...

# Monitoring
SENTRY_DSN=...
LOGROCKET_APP_ID=...

# Security
UNSUBSCRIBE_SECRET=...
JWT_SECRET=...
```

**Rate Limits by Tier:**
```typescript
const TIER_LIMITS = {
  FREE: {
    maxRecipientsPerCampaign: 100,
    maxMessagesPerHour: 50,
    maxMessagesPerDay: 200
  },
  STARTER: {
    maxRecipientsPerCampaign: 500,
    maxMessagesPerHour: 200,
    maxMessagesPerDay: 1000
  },
  PROFESSIONAL: {
    maxRecipientsPerCampaign: 2000,
    maxMessagesPerHour: 500,
    maxMessagesPerDay: 5000
  },
  ENTERPRISE: {
    maxRecipientsPerCampaign: 10000,
    maxMessagesPerHour: 2000,
    maxMessagesPerDay: 20000
  }
}
```

#### 2. Performance Tuning

**Database Optimization:**
```sql
-- Index for performance
CREATE INDEX idx_messaging_metrics_org_time 
ON messaging_metrics(organization_id, timestamp);

CREATE INDEX idx_bulk_recipients_campaign_status 
ON bulk_message_recipients(campaign_id, email_status, sms_status);

-- Partitioning for large tables
CREATE TABLE messaging_metrics_2024 PARTITION OF messaging_metrics
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

**Redis Configuration:**
```bash
# Memory optimization
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
```

**Connection Pooling:**
```typescript
const poolConfig = {
  max: 20, // Maximum connections
  min: 5,  // Minimum connections  
  idle: 10000, // 10 seconds
  acquire: 30000, // 30 seconds
  evict: 1000 // 1 second
}
```

#### 3. Monitoring Setup

**Alert Rules:**
```typescript
const DEFAULT_ALERT_RULES = [
  {
    name: 'High Error Rate',
    metric: 'system.error.rate_percent',
    condition: 'gt',
    threshold: 5,
    timeWindow: 300 // 5 minutes
  },
  {
    name: 'Queue Backlog',
    metric: 'system.queue.size', 
    condition: 'gt',
    threshold: 1000,
    timeWindow: 60 // 1 minute
  },
  {
    name: 'High Latency',
    metric: 'system.processing.latency_ms',
    condition: 'gt', 
    threshold: 5000, // 5 seconds
    timeWindow: 300
  }
]
```

**Health Checks:**
```typescript
// API endpoint: /api/health
{
  status: 'healthy' | 'warning' | 'critical',
  checks: {
    database: 'connected' | 'disconnected',
    redis: 'connected' | 'disconnected', 
    email_service: 'available' | 'unavailable',
    sms_service: 'available' | 'unavailable'
  },
  metrics: {
    queue_size: number,
    error_rate: number,
    response_time: number
  }
}
```

### Operational Procedures

#### 1. Deployment Checklist

**Pre-deployment:**
- [ ] Run full test suite (`npm run test`)
- [ ] Run E2E tests (`npm run test:e2e`)
- [ ] Run load tests (`npm run test:load`)
- [ ] Check security scan results
- [ ] Verify database migrations
- [ ] Update environment variables
- [ ] Check third-party service status

**Deployment:**
- [ ] Deploy to staging first
- [ ] Run smoke tests on staging
- [ ] Check monitoring dashboards
- [ ] Deploy to production
- [ ] Verify health checks pass
- [ ] Monitor key metrics for 30 minutes
- [ ] Send test campaign to verify functionality

**Post-deployment:**
- [ ] Update operational documentation
- [ ] Notify team of deployment completion
- [ ] Monitor alerts for 24 hours
- [ ] Check error rates and performance
- [ ] Update release notes

#### 2. Incident Response

**Severity Levels:**
- **P0 (Critical)**: System down, data loss, security breach
- **P1 (High)**: Major functionality broken, high error rates
- **P2 (Medium)**: Partial functionality affected, degraded performance
- **P3 (Low)**: Minor issues, cosmetic problems

**Response Times:**
- P0: 15 minutes
- P1: 1 hour
- P2: 4 hours  
- P3: Next business day

**Escalation Path:**
1. On-call engineer
2. Senior developer
3. Engineering manager
4. CTO

#### 3. Backup and Recovery

**Database Backups:**
```bash
# Daily automated backups
pg_dump $DATABASE_URL | gzip > backup_$(date +%Y%m%d).sql.gz

# Point-in-time recovery available for 7 days
```

**Redis Backups:**
```bash
# Automated snapshots
redis-cli BGSAVE
```

**Campaign Data Recovery:**
```sql
-- Recover deleted campaign
SELECT * FROM campaigns_audit 
WHERE original_id = :campaign_id 
ORDER BY created_at DESC LIMIT 1;
```

#### 4. Maintenance Windows

**Schedule:** 
- Weekly: Sundays 2-4 AM UTC
- Monthly: First Sunday 2-6 AM UTC

**Maintenance Tasks:**
- Database optimization and cleanup
- Redis memory cleanup
- Log rotation and archival
- Security updates
- Performance tuning
- Backup verification

### Troubleshooting Guide

#### Common Issues

**High Error Rate:**
1. Check third-party service status
2. Review recent deployments
3. Check database connection pool
4. Verify rate limits not exceeded
5. Review error logs for patterns

**Slow Performance:**
1. Check database query performance
2. Verify Redis cache hit rates
3. Review API response times
4. Check memory and CPU usage
5. Examine network latency

**Email Delivery Issues:**
1. Check email service status
2. Verify DNS records (SPF, DKIM, DMARC)
3. Review bounce and complaint rates
4. Check IP reputation
5. Verify template rendering

**SMS Delivery Issues:**
1. Check SMS service balance
2. Verify phone number formats
3. Review carrier restrictions
4. Check message length limits
5. Verify opt-in compliance

#### Debug Commands

```bash
# Check system health
curl https://app.wedsync.com/api/health

# View queue status
curl https://app.wedsync.com/api/communications/queue/status

# Check campaign status
curl https://app.wedsync.com/api/communications/campaigns/:id/status

# View recent errors
curl https://app.wedsync.com/api/admin/errors?limit=50

# Performance metrics
curl https://app.wedsync.com/api/admin/metrics/dashboard
```

### Security Guidelines

#### Data Protection

**Personal Data Handling:**
- All guest data encrypted at rest and in transit
- PII access logged and audited
- Data retention policies enforced
- GDPR compliance maintained
- Regular security audits

**Access Controls:**
- Role-based access control (RBAC)
- Multi-factor authentication (MFA) required
- API key rotation every 90 days
- IP allowlisting for sensitive operations
- Session timeout after 4 hours of inactivity

#### Compliance Requirements

**CAN-SPAM Compliance:**
- ✅ Sender identification required
- ✅ Physical address included
- ✅ Clear unsubscribe mechanism
- ✅ Opt-out processing within 10 days
- ✅ No false or misleading headers
- ✅ Adult content clearly marked

**GDPR Compliance:**
- ✅ Explicit consent tracking
- ✅ Right to access data
- ✅ Right to deletion
- ✅ Data portability
- ✅ Breach notification procedures
- ✅ Privacy by design implementation

### Support and Maintenance

#### Documentation Links
- [API Documentation](https://docs.wedsync.com/api)
- [User Guide](https://docs.wedsync.com/user-guide)
- [Admin Portal](https://admin.wedsync.com)
- [Status Page](https://status.wedsync.com)

#### Support Contacts
- **Technical Issues**: support@wedsync.com
- **Security Issues**: security@wedsync.com  
- **Emergency**: +1-800-WEDSYNC

#### Monitoring Dashboards
- [Performance Dashboard](https://monitoring.wedsync.com/performance)
- [Error Dashboard](https://monitoring.wedsync.com/errors)
- [Business Metrics](https://monitoring.wedsync.com/business)

---

**Document Version:** 1.0  
**Last Updated:** 2025-08-25  
**Next Review:** 2025-09-25  
**Maintained By:** Engineering Team