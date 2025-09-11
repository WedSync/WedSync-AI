# WedSync Billing Infrastructure - Production Deployment Guide

**Document Version:** 1.0  
**Feature:** WS-131 Pricing Strategy System Round 3  
**Team:** Team D  
**Last Updated:** 2025-01-24  

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Pre-deployment Requirements](#pre-deployment-requirements)
3. [Environment Setup](#environment-setup)
4. [Database Deployment](#database-deployment)
5. [Application Deployment](#application-deployment)
6. [Third-party Integrations](#third-party-integrations)
7. [Performance Monitoring Setup](#performance-monitoring-setup)
8. [Security Configuration](#security-configuration)
9. [Health Checks & Validation](#health-checks--validation)
10. [Rollback Procedures](#rollback-procedures)
11. [Maintenance & Operations](#maintenance--operations)
12. [Troubleshooting](#troubleshooting)

## Architecture Overview

### System Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js 15    │    │   Supabase      │    │   Stripe        │
│   App Router    │◄──►│   PostgreSQL    │    │   Payments      │
│   (Frontend)    │    │   (Database)    │    │   (Gateway)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Edge Runtime  │    │   Redis Cache   │    │   Webhooks      │
│   (Serverless)  │    │   (Caching)     │    │   (Events)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Core Services

1. **Billing Service** (`/src/lib/billing/billing-service.ts`)
   - Subscription management
   - Payment processing
   - Invoice generation

2. **Usage Tracking Service** (`/src/lib/billing/usage-tracking-service.ts`)
   - AI service usage monitoring
   - Billing alerts and thresholds
   - Cross-team integration

3. **Revenue Analytics Service** (`/src/lib/billing/revenue-analytics-service.ts`)
   - MRR tracking
   - Revenue forecasting
   - Business intelligence

4. **Billing Cache Service** (`/src/lib/billing/billing-cache-service.ts`)
   - Performance optimization
   - Query result caching
   - Cache invalidation strategies

5. **Performance Monitoring** (`/src/lib/billing/revenue-performance-monitor.ts`)
   - Real-time metrics collection
   - Alert management
   - System health monitoring

## Pre-deployment Requirements

### Infrastructure Requirements

- **Hosting Platform:** Vercel (recommended) or compatible Next.js host
- **Database:** Supabase PostgreSQL 15+
- **Cache:** Redis 6.0+ (optional, for enhanced performance)
- **CDN:** Vercel Edge Network or CloudFlare
- **Monitoring:** DataDog, New Relic, or similar APM tool

### Third-party Services

1. **Stripe Account**
   - Live API keys
   - Webhook endpoint configured
   - Products and prices configured

2. **Supabase Project**
   - Production database
   - Edge functions enabled
   - Row Level Security configured

3. **Email Service**
   - SendGrid or similar (for billing notifications)
   - SMTP configuration

### Required Credentials

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...

# Database URLs
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Email Service
SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=billing@wedsync.com

# Monitoring & Analytics
DATADOG_API_KEY=...
SENTRY_DSN=https://...

# Application Configuration
NEXTAUTH_URL=https://wedsync.com
NEXTAUTH_SECRET=your-secret-key
ENCRYPTION_KEY=32-byte-key
```

## Environment Setup

### Development Environment

```bash
# Clone repository
git clone https://github.com/your-org/wedsync.git
cd wedsync

# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Run development server
npm run dev
```

### Production Environment Variables

Create production environment configuration:

```bash
# Production specific settings
NODE_ENV=production
VERCEL_ENV=production
NEXT_TELEMETRY_DISABLED=1

# Performance optimization
NEXT_SHARP=0
NEXT_DISABLE_EDGE_RUNTIME=false

# Security headers
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true

# Cache configuration
CACHE_MAX_AGE=3600
BILLING_CACHE_TTL=300

# Rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW=3600
```

## Database Deployment

### Migration Process

1. **Pre-deployment Database Backup**
```bash
# Create full database backup
supabase db dump --db-url="$DATABASE_URL" > backup-$(date +%Y%m%d-%H%M).sql

# Verify backup integrity
supabase db reset --db-url="$STAGING_DATABASE_URL"
supabase db push --db-url="$STAGING_DATABASE_URL" < backup-*.sql
```

2. **Apply Migrations**
```bash
# List pending migrations
supabase migration list --linked

# Apply all pending migrations
supabase migration up --linked

# Verify migration status
supabase migration list --linked
```

3. **Critical Tables for Billing System**

The following migrations must be applied in order:

- `20250124200001_advanced_billing_system.sql` - Core billing tables
- `20250124210001_revenue_performance_monitoring.sql` - Monitoring system
- `20250124220001_pricing_strategy_enhancement.sql` - Pricing optimization

### Database Performance Optimization

```sql
-- Create performance indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_status_period 
    ON user_subscriptions(status, current_period_end);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usage_records_billing_period 
    ON usage_records(subscription_id, recorded_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_records_organization 
    ON payment_records(organization_id, created_at DESC);

-- Enable query plan optimization
ANALYZE user_subscriptions;
ANALYZE usage_records;
ANALYZE payment_records;
```

### Database Monitoring Setup

```sql
-- Enable performance monitoring
SELECT pg_stat_statements_reset();

-- Create monitoring views
CREATE OR REPLACE VIEW billing_performance AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%user_subscriptions%' 
   OR query LIKE '%payment_records%'
ORDER BY total_time DESC;
```

## Application Deployment

### Vercel Deployment

1. **Configure Vercel Project**
```bash
# Install Vercel CLI
npm i -g vercel

# Link to project
vercel link

# Configure environment variables
vercel env add STRIPE_SECRET_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
# ... add all required environment variables
```

2. **Deploy to Production**
```bash
# Build and deploy
vercel --prod

# Verify deployment
vercel ls
```

3. **Vercel Configuration** (`vercel.json`)
```json
{
  "buildCommand": "npm run build",
  "framework": "nextjs",
  "regions": ["iad1", "sfo1"],
  "functions": {
    "src/app/api/billing/**": {
      "maxDuration": 30
    },
    "src/app/api/webhooks/**": {
      "maxDuration": 15
    }
  },
  "headers": [
    {
      "source": "/api/billing/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=300, stale-while-revalidate=60"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/billing/:path*",
      "destination": "/api/billing/:path*"
    }
  ]
}
```

### Custom Hosting Deployment

For non-Vercel deployments:

1. **Docker Configuration** (`Dockerfile`)
```dockerfile
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
COPY --from=deps /app/node_modules ./node_modules
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nextjs
EXPOSE 3000
CMD ["npm", "start"]
```

2. **Build Process**
```bash
# Build Docker image
docker build -t wedsync-billing .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY" \
  wedsync-billing
```

## Third-party Integrations

### Stripe Configuration

1. **Webhook Endpoints**
```bash
# Configure webhook endpoint in Stripe Dashboard
URL: https://wedsync.com/api/webhooks/stripe
Events: [
  "customer.subscription.created",
  "customer.subscription.updated", 
  "customer.subscription.deleted",
  "invoice.payment_succeeded",
  "invoice.payment_failed",
  "payment_intent.succeeded",
  "payment_method.attached"
]
```

2. **Product Configuration**
Create products in Stripe Dashboard matching the pricing tiers:
- Starter (Free)
- Professional ($29/month, $290/year)
- Premium ($79/month, $790/year) 
- Enterprise ($199/month, $1990/year)

3. **Stripe API Validation**
```bash
# Test API connectivity
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  https://api.stripe.com/v1/products
```

### Supabase Configuration

1. **Edge Functions Deployment**
```bash
# Deploy email service function
supabase functions deploy email-service --project-ref your-project-id

# Verify deployment
supabase functions list --project-ref your-project-id
```

2. **Database Connection Pooling**
```bash
# Configure connection pooler
supabase settings update --db-connection-pool-mode=transaction
```

3. **Row Level Security Verification**
```sql
-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = false;

-- Should return no results - all tables should have RLS enabled
```

## Performance Monitoring Setup

### Application Performance Monitoring

1. **Initialize Monitoring Services**
```typescript
// Add to app/layout.tsx
import { initializeMonitoring } from '@/lib/monitoring';

initializeMonitoring({
  environment: process.env.NODE_ENV,
  service: 'wedsync-billing',
  version: process.env.VERCEL_GIT_COMMIT_SHA
});
```

2. **Custom Metrics Configuration**
```typescript
// Configure billing-specific metrics
const billingMetrics = {
  payment_success_rate: { threshold: 0.95, critical: 0.90 },
  api_response_time: { threshold: 1000, critical: 2000 },
  cache_hit_ratio: { threshold: 0.80, critical: 0.70 },
  revenue_accuracy: { threshold: 0.995, critical: 0.99 }
};
```

### Database Monitoring

1. **Enable Query Performance Tracking**
```sql
-- Install pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Configure statement tracking
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
ALTER SYSTEM SET pg_stat_statements.max = 10000;
ALTER SYSTEM SET pg_stat_statements.track = 'all';
```

2. **Performance Alerts**
```sql
-- Create performance alert function
CREATE OR REPLACE FUNCTION check_billing_performance() 
RETURNS void AS $$
BEGIN
  -- Check for slow queries
  IF EXISTS (
    SELECT 1 FROM pg_stat_statements 
    WHERE query LIKE '%billing%' 
    AND mean_time > 1000
  ) THEN
    -- Send alert (implementation depends on notification system)
    PERFORM pg_notify('slow_query_alert', 'Billing queries exceeding 1s');
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Real-time Monitoring Dashboard

Access monitoring dashboard at: `https://wedsync.com/admin/monitoring`

Key metrics to monitor:
- Payment success rate (>95%)
- API response times (<1s average)
- Database query performance (<500ms average)
- Cache hit ratio (>80%)
- Error rates (<1%)
- System uptime (>99.9%)

## Security Configuration

### HTTPS and SSL

1. **Certificate Configuration**
```bash
# Verify SSL certificate
openssl s_client -connect wedsync.com:443 -servername wedsync.com

# Check certificate expiry
echo | openssl s_client -connect wedsync.com:443 -servername wedsync.com 2>/dev/null | openssl x509 -noout -dates
```

2. **Security Headers**
```typescript
// next.config.js security headers
const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self' js.stripe.com; style-src 'self' 'unsafe-inline'" },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' }
];
```

### Data Encryption

1. **Environment Variables Security**
```bash
# Use encrypted environment variables
ENCRYPTION_KEY=$(openssl rand -hex 32)
WEBHOOK_SECRET=$(openssl rand -hex 32)
NEXTAUTH_SECRET=$(openssl rand -hex 32)
```

2. **Database Encryption**
```sql
-- Enable transparent data encryption (if supported)
ALTER DATABASE wedsync SET encrypted = true;

-- Encrypt sensitive columns
ALTER TABLE payment_records 
ALTER COLUMN card_last_four TYPE TEXT USING encrypt_column(card_last_four);
```

### Access Control

1. **API Route Protection**
```typescript
// Implement rate limiting
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: Request) {
  const limit = await rateLimit(request);
  if (limit.error) {
    return new Response('Too Many Requests', { status: 429 });
  }
  // ... route logic
}
```

2. **Admin Route Security**
```typescript
// Admin-only route protection
const adminRoutes = ['/admin', '/billing/admin'];
const requiresAdmin = adminRoutes.some(route => pathname.startsWith(route));

if (requiresAdmin && user?.role !== 'admin') {
  return redirect('/unauthorized');
}
```

## Health Checks & Validation

### Automated Health Checks

1. **System Health Endpoint**
```typescript
// /api/health endpoint
export async function GET() {
  const checks = await Promise.all([
    checkDatabase(),
    checkStripe(),
    checkCache(),
    checkEmailService()
  ]);
  
  const healthy = checks.every(check => check.status === 'healthy');
  
  return Response.json({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks
  });
}
```

2. **External Monitoring Integration**
```bash
# Configure external monitoring (Pingdom, UptimeRobot, etc.)
Monitor URL: https://wedsync.com/api/health
Check interval: 60 seconds
Timeout: 30 seconds
Alert on: Status != 200 OR response time > 5s
```

### Deployment Validation Checklist

- [ ] Database migrations applied successfully
- [ ] All environment variables configured
- [ ] Stripe webhooks receiving events
- [ ] Payment processing functional
- [ ] Email notifications working
- [ ] Performance metrics collecting
- [ ] Security headers configured
- [ ] SSL certificate valid
- [ ] Health checks passing
- [ ] Error tracking functional

### Post-Deployment Testing

1. **Critical Path Testing**
```bash
# Test subscription creation
curl -X POST https://wedsync.com/api/billing/subscriptions \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"plan_id": "professional"}'

# Test payment processing  
curl -X POST https://wedsync.com/api/billing/payments \
  -H "Authorization: Bearer $TEST_TOKEN" \
  -d '{"payment_method": "pm_test", "amount": 2900}'
```

2. **Load Testing**
```bash
# Install artillery for load testing
npm install -g artillery

# Run load test
artillery quick --count 100 --num 10 https://wedsync.com/api/billing/health
```

## Rollback Procedures

### Immediate Rollback (< 5 minutes)

1. **Vercel Deployment Rollback**
```bash
# List recent deployments
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]
```

2. **DNS Rollback (if needed)**
```bash
# Update DNS to point to previous version
# This depends on your DNS provider
```

### Database Rollback

1. **Minor Issues - Schema Rollback**
```bash
# Rollback last migration
supabase migration down --linked

# Verify rollback
supabase migration list --linked
```

2. **Major Issues - Full Database Restore**
```bash
# Restore from backup (use with extreme caution)
supabase db reset --db-url="$DATABASE_URL"
supabase db push --db-url="$DATABASE_URL" < backup-latest.sql
```

### Rollback Decision Matrix

| Issue Severity | Response Time | Action |
|---|---|---|
| Payment failures > 50% | Immediate | Full rollback |
| API errors > 25% | < 5 minutes | Application rollback |
| Performance degradation > 2x | < 15 minutes | Investigate, possibly rollback |
| Minor bugs | Next deployment | Fix forward |

## Maintenance & Operations

### Regular Maintenance Tasks

1. **Daily Operations**
```bash
# Check system health
curl https://wedsync.com/api/health

# Review error logs
vercel logs --tail

# Monitor key metrics
# - Payment success rate
# - Response times  
# - Error rates
```

2. **Weekly Operations**
```bash
# Database maintenance
supabase db analyze --linked

# Review performance metrics
# Access monitoring dashboard

# Update dependencies (security patches)
npm audit
npm update
```

3. **Monthly Operations**
```bash
# Performance optimization review
# Database query optimization
# Cache hit ratio analysis
# Cost optimization review
```

### Backup Procedures

1. **Automated Database Backups**
```bash
# Configure daily backups
supabase backups create --linked
supabase backups list --linked
```

2. **Application State Backup**
```bash
# Backup environment configuration
vercel env ls > env-backup-$(date +%Y%m%d).json

# Backup deployment configuration
cp vercel.json vercel-backup-$(date +%Y%m%d).json
```

### Monitoring and Alerting

1. **Critical Alerts**
- Payment processing failure rate > 5%
- API response time > 2 seconds
- Database connection failures
- Stripe webhook failures
- Security incidents

2. **Warning Alerts**
- Response time > 1 second
- Cache hit ratio < 80%
- Unusual traffic patterns
- High resource usage

3. **Info Alerts**
- Daily summary reports
- Performance trend analysis
- Capacity planning alerts

## Troubleshooting

### Common Issues and Solutions

#### Payment Processing Issues

**Problem:** Payments failing with Stripe errors
```bash
# Check Stripe webhook delivery
stripe logs tail

# Verify webhook endpoint
curl -X POST https://wedsync.com/api/webhooks/stripe \
  -H "Stripe-Signature: $WEBHOOK_SIG" \
  -d '{test_event}'

# Solution: Verify webhook secret matches Stripe configuration
```

**Problem:** Subscription status not updating
```bash
# Check database connection
supabase db inspect --linked

# Verify subscription sync
SELECT * FROM user_subscriptions 
WHERE updated_at < NOW() - INTERVAL '1 hour'
AND status = 'active';

# Solution: Run subscription sync job manually
```

#### Database Performance Issues

**Problem:** Slow billing queries
```sql
-- Identify slow queries
SELECT query, mean_time, calls
FROM pg_stat_statements 
WHERE query LIKE '%user_subscriptions%'
ORDER BY mean_time DESC;

-- Solution: Add missing indexes
CREATE INDEX CONCURRENTLY ON user_subscriptions(user_id, status);
```

**Problem:** High database connections
```sql
-- Check connection count
SELECT count(*) FROM pg_stat_activity;

-- Solution: Optimize connection pooling
-- Update connection pool settings in Supabase
```

#### API Performance Issues

**Problem:** High response times
```bash
# Check API metrics
curl https://wedsync.com/api/billing/monitoring?action=metrics&metric=api_response_time_ms

# Solution: Enable caching or optimize queries
```

**Problem:** Rate limiting issues
```bash
# Check rate limit logs
vercel logs --tail | grep "429"

# Solution: Adjust rate limits or implement user-based limits
```

### Emergency Contacts

- **Team Lead:** [Lead Developer Contact]
- **DevOps:** [DevOps Engineer Contact]  
- **Database Admin:** [DBA Contact]
- **Security:** [Security Team Contact]

### Escalation Procedures

1. **Severity 1 (Critical)** - Immediate response required
   - Payment system down
   - Data breach suspected
   - Complete service outage

2. **Severity 2 (High)** - Response within 1 hour
   - Partial service degradation
   - Performance issues affecting users
   - Security vulnerabilities

3. **Severity 3 (Medium)** - Response within 4 hours
   - Minor functionality issues
   - Performance optimization needed
   - Non-critical bugs

### Logging and Debugging

1. **Application Logs**
```bash
# View real-time logs
vercel logs --tail

# Filter billing-related logs
vercel logs | grep -i billing

# Export logs for analysis
vercel logs --since 24h > billing-logs-$(date +%Y%m%d).log
```

2. **Database Logs**
```bash
# Access database logs through Supabase
supabase logs --type database --linked

# Monitor slow queries
SELECT * FROM pg_stat_statements 
WHERE mean_time > 1000 
ORDER BY mean_time DESC;
```

3. **Error Tracking**
```typescript
// Error reporting integration
import { captureException } from '@sentry/nextjs';

try {
  await processPayment();
} catch (error) {
  captureException(error, {
    tags: { component: 'billing', operation: 'payment_processing' },
    user: { id: userId, subscription: subscriptionId }
  });
}
```

---

## Conclusion

This deployment guide provides comprehensive instructions for deploying the WedSync billing infrastructure to production. Follow each section carefully and verify all health checks before going live.

For additional support or questions, contact the Team D development team or refer to the troubleshooting section.

**Document Status:** Production Ready ✅  
**Last Tested:** 2025-01-24  
**Next Review:** 2025-02-24