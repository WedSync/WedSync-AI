# 03-monitoring-setup.md

## Purpose

Implement comprehensive monitoring to ensure platform reliability, performance, and quick issue resolution.

## Monitoring Stack

### Core Services

- **Error Tracking**: Sentry
- **Performance**: Vercel Analytics + Custom metrics
- **Uptime**: Better Uptime or Uptime Robot
- **Logs**: Vercel Logs + Supabase Logs
- **APM**: Datadog or New Relic (when scaling)

## Key Metrics to Track

### Business Metrics

```
// Critical KPIs
- Daily Active Users (DAU)
- Form completion rate
- Journey engagement rate
- Viral coefficient (K-factor)
- Churn rate
- MRR growth
```

### Technical Metrics

```
// Performance
- Page load time (p50, p95, p99)
- API response time
- Database query time
- Error rate by endpoint
- CDN hit rate
```

### User Experience Metrics

```
// Core Web Vitals
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1
- Time to Interactive (TTI) < 3.5s
```

## Alert Configuration

### Critical Alerts (Page immediately)

- Application down (5xx errors > 10/min)
- Database connection failures
- Payment processing failures
- Authentication service down
- Data loss incidents

### Warning Alerts (Notify team)

- Error rate > 1% for 5 minutes
- Response time > 3s for 10 minutes
- Database CPU > 80%
- API rate limits approaching
- Disk space < 20%

### Info Alerts (Log for review)

- New user signups
- Tier upgrades/downgrades
- Large file uploads
- Unusual traffic patterns

## Dashboard Setup

### Operations Dashboard

```
- System health overview
- Real-time error feed
- Active user count
- API performance graphs
- Database metrics
```

### Business Dashboard

```
- Revenue metrics
- User growth
- Feature adoption
- Conversion funnels
- Churn analysis
```

## Log Management

### Log Levels

```
ERROR - Exceptions, failures
WARN - Degraded performance, retries
INFO - Business events, user actions
DEBUG - Detailed execution (dev only)
```

### Log Retention

- Production: 30 days hot, 1 year cold storage
- Staging: 7 days
- Development: 1 day

### Structured Logging

```json
{
  "timestamp": "2024-01-15T10:00:00Z",
  "level": "ERROR",
  "service": "api",
  "userId": "usr_123",
  "requestId": "req_abc",
  "error": "Database timeout",
  "context": { /* additional data */ }
}
```

## Incident Response

### Severity Levels

- **SEV1**: Platform down, data loss
- **SEV2**: Major feature broken, payments failing
- **SEV3**: Minor feature issues, performance degradation
- **SEV4**: Cosmetic issues, non-critical bugs

### Response SLAs

- SEV1: 15 minutes
- SEV2: 1 hour
- SEV3: 4 hours
- SEV4: Next business day

## Critical Considerations

- Set up monitoring before launch
- Test alerting pipeline regularly
- Document runbooks for common issues
- Review metrics weekly for trends
- Keep monitoring costs under control