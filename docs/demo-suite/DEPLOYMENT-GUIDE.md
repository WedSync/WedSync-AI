# WS-384 Demo Suite Deployment Guide

## 🚀 Production Deployment Instructions

This guide covers deploying the WS-384 Demo Suite to production environments with all security, performance, and reliability considerations.

## Prerequisites

### Required Services
- [ ] **Supabase Project** - PostgreSQL database and storage
- [ ] **Hosting Platform** - Vercel, Netlify, or similar Next.js host
- [ ] **Domain** - Custom domain for demo portal access
- [ ] **CDN** - Content delivery network for global asset distribution
- [ ] **Monitoring** - Error tracking and performance monitoring

### Required Credentials
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
SUPABASE_PROJECT_ID=your-project-id

# Security Configuration  
JWT_SECRET=your-production-jwt-secret-minimum-32-characters-long
DEMO_ENCRYPTION_KEY=your-demo-data-encryption-key

# Environment Configuration
NODE_ENV=production
DEMO_ENABLED=true
DEMO_RESET_SCHEDULE=nightly
```

## Pre-Deployment Checklist

### 🔐 Security Verification
- [ ] JWT secret is production-grade (32+ characters, high entropy)
- [ ] Supabase RLS policies configured and tested
- [ ] Demo data isolated from production data
- [ ] Storage bucket permissions verified (public read only)
- [ ] API rate limiting implemented
- [ ] CORS headers configured correctly

### ⚡ Performance Optimization
- [ ] All assets optimized and compressed
- [ ] CDN configured for global distribution  
- [ ] Database queries optimized with proper indexing
- [ ] Caching strategies implemented
- [ ] Bundle size analyzed and optimized
- [ ] Performance benchmarks met (see targets below)

### 🧪 Testing Verification
- [ ] All unit tests passing (95%+ coverage)
- [ ] Integration tests verified
- [ ] E2E tests completed successfully
- [ ] Load testing performed
- [ ] Cross-browser compatibility confirmed
- [ ] Mobile responsiveness verified

### 📊 Monitoring Setup
- [ ] Error tracking service configured
- [ ] Performance monitoring enabled
- [ ] Log aggregation setup
- [ ] Uptime monitoring configured
- [ ] Alert thresholds defined

## Deployment Steps

### Step 1: Database Migration

```bash
# Apply all migrations to production database
npm run db:migrate

# Verify migration success
npx supabase status --project-ref your-project-id

# Create storage buckets
npm run demo:initialize-storage
```

### Step 2: Build & Test

```bash
# Install dependencies
npm ci --only=production

# Run type checking
npm run typecheck

# Build application
npm run build

# Run comprehensive tests
npm run demo:test:full

# Performance audit
npm run demo:verify
```

### Step 3: Deploy Application

#### Vercel Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy with environment variables
vercel --prod \
  --env NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  --env SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  --env JWT_SECRET=your-jwt-secret \
  --env NODE_ENV=production
```

#### Custom Server Deployment
```bash
# Build Docker container
docker build -t wedsync-demo .

# Deploy with environment variables
docker run -d \
  --name wedsync-demo \
  -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_SERVICE_ROLE_KEY=your-service-role-key \
  -e JWT_SECRET=your-jwt-secret \
  -e NODE_ENV=production \
  wedsync-demo
```

### Step 4: Initialize Demo Data

```bash
# Generate all demo assets (run on production server)
npm run demo:generate-assets

# Seed database with demo data  
npm run demo:seed

# Verify complete system
npm run demo:verify
```

### Step 5: Configure Automation

#### Reset Automation (Cron Job)
```bash
# Add to crontab for nightly reset at 2 AM UTC
0 2 * * * cd /path/to/wedsync && npm run demo:reset && npm run demo:seed

# Weekly full regeneration on Sundays
0 3 * * 0 cd /path/to/wedsync && npm run demo:generate-assets && npm run demo:seed
```

#### Cloud Scheduler (Google Cloud)
```yaml
# cloud-scheduler.yaml
name: demo-reset-nightly
schedule: "0 2 * * *"
timezone: UTC
httpTarget:
  uri: https://your-domain.com/api/demo/reset
  httpMethod: POST
  headers:
    Authorization: Bearer your-admin-token
```

## Performance Targets

### 🎯 Production Performance Benchmarks

| Metric | Target | Monitoring |
|--------|--------|------------|
| **First Contentful Paint** | <1.2s | Lighthouse CI |
| **Time to Interactive** | <2.5s | WebPageTest |
| **Largest Contentful Paint** | <2.5s | Core Web Vitals |
| **Cumulative Layout Shift** | <0.1 | Real User Monitoring |
| **Demo Portal Load Time** | <2s | Synthetic monitoring |
| **Asset Generation Time** | <5min | Internal metrics |
| **Authentication Response** | <100ms | API monitoring |
| **Database Query Time** | <50ms | Database monitoring |

### 📊 Scalability Targets

| Resource | Target | Scaling Strategy |
|----------|--------|------------------|
| **Concurrent Users** | 1000+ | Horizontal scaling |
| **Demo Sessions/Day** | 10,000+ | CDN optimization |
| **Asset Storage** | <1GB | Asset compression |
| **Database Connections** | <100 | Connection pooling |
| **Memory Usage** | <512MB | Optimized queries |
| **CPU Utilization** | <70% | Auto-scaling |

## Monitoring & Alerting

### 🚨 Critical Alerts

Set up immediate alerts for:
```yaml
# Alert conditions
demo_system_down:
  condition: uptime < 99.5%
  severity: critical
  channels: [email, slack, pager]

asset_generation_failed:
  condition: asset_generation_success_rate < 95%
  severity: high  
  channels: [email, slack]

authentication_errors:
  condition: auth_error_rate > 1%
  severity: high
  channels: [email, slack]

performance_degradation:
  condition: response_time > 3s
  severity: medium
  channels: [slack]
```

### 📈 Performance Dashboards

Track these key metrics:
- **Demo Usage**: Daily active demos, session duration, account switches
- **System Health**: Uptime, error rates, response times
- **Asset Performance**: Generation success, storage usage, CDN hits
- **User Experience**: Page load times, interaction delays, error counts
- **Business Metrics**: Demo-to-trial conversion, feature engagement

## Security Configuration

### 🔒 Production Security Hardening

#### Rate Limiting
```typescript
// api/demo/auth/login - 10 requests per minute per IP
// api/demo/media/generate - 5 requests per minute (admin only)  
// api/demo/reset - 1 request per hour (admin only)
```

#### Content Security Policy
```javascript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'", 
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co",
      "frame-ancestors 'none'"
    ].join('; ')
  }
];
```

#### Database Security
```sql
-- Row Level Security policies
ALTER TABLE demo_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_assets ENABLE ROW LEVEL SECURITY;

-- Demo data access policies  
CREATE POLICY "Demo accounts are publicly readable" 
  ON demo_accounts FOR SELECT 
  USING (is_demo = true);

CREATE POLICY "Only service role can modify demo data"
  ON demo_accounts FOR ALL
  USING (auth.role() = 'service_role');
```

## Disaster Recovery

### 🛡️ Backup Strategy

#### Database Backups
```bash
# Daily automated backups via Supabase
# Retention: 7 days point-in-time recovery

# Manual backup before major changes
pg_dump "postgresql://postgres:password@db.supabase.co:5432/postgres" \
  --table=demo_* > demo_backup_$(date +%Y%m%d).sql
```

#### Asset Backups
```bash
# Sync demo assets to backup storage
aws s3 sync supabase-storage/demo-assets/ s3://backup-bucket/demo-assets/

# Schedule weekly backup verification
npm run demo:verify-backup
```

### 🚑 Recovery Procedures

#### Demo System Failure
1. **Immediate**: Switch to backup demo environment
2. **Investigate**: Check logs and monitoring dashboards  
3. **Restore**: Redeploy from last known good configuration
4. **Verify**: Run full system verification
5. **Communicate**: Update stakeholders on resolution

#### Data Corruption
1. **Stop**: Disable demo system to prevent further damage
2. **Assess**: Determine extent of data corruption
3. **Restore**: Restore from most recent clean backup
4. **Regenerate**: Re-run asset generation and seeding
5. **Test**: Comprehensive verification before re-enabling

## Post-Deployment Verification

### ✅ Deployment Success Checklist

Run this verification sequence after deployment:

```bash
# 1. Basic connectivity
curl https://your-domain.com/demo
curl https://your-domain.com/api/demo/accounts

# 2. Authentication flow
curl -X POST https://your-domain.com/api/demo/auth/login \
  -H "Content-Type: application/json" \
  -d '{"accountId":"supplier_1"}'

# 3. Asset availability  
curl https://your-domain.com/api/demo/media/logo/supplier_1

# 4. Full system verification
npm run demo:verify

# 5. Performance test
lighthouse https://your-domain.com/demo --output=json

# 6. Load test
ab -n 100 -c 10 https://your-domain.com/demo
```

### 📋 Go-Live Checklist

Before announcing the demo system:

- [ ] All verification tests passing
- [ ] Performance metrics within targets  
- [ ] SSL certificate valid and configured
- [ ] CDN properly distributing assets globally
- [ ] Monitoring dashboards showing green status
- [ ] Alert channels tested and working
- [ ] Documentation updated with production URLs
- [ ] Sales team trained on demo access
- [ ] Backup and recovery procedures tested
- [ ] Security audit completed
- [ ] Load testing completed successfully

## Maintenance Schedule

### 🗓️ Ongoing Maintenance Tasks

#### Daily (Automated)
- [ ] Reset demo data (2:00 AM UTC)
- [ ] Verify system health 
- [ ] Monitor performance metrics
- [ ] Check error rates

#### Weekly (Automated)  
- [ ] Full asset regeneration (Sunday 3:00 AM UTC)
- [ ] Performance report generation
- [ ] Security scan execution
- [ ] Backup verification

#### Monthly (Manual)
- [ ] Review and update demo content
- [ ] Analyze usage metrics and optimize
- [ ] Update documentation as needed
- [ ] Security audit and penetration testing
- [ ] Capacity planning review

#### Quarterly (Manual)
- [ ] Major technology updates
- [ ] Business content refresh  
- [ ] Infrastructure cost optimization
- [ ] Disaster recovery testing
- [ ] Compliance audit

## Rollback Procedures

### 🔙 Emergency Rollback

If critical issues are discovered post-deployment:

```bash
# 1. Immediate rollback to previous version
git checkout previous-stable-version
npm run build
npm run deploy

# 2. Restore previous database state (if needed)
pg_restore --clean --if-exists \
  "postgresql://postgres:password@db.supabase.co:5432/postgres" \
  backup_before_deployment.sql

# 3. Clear CDN cache to ensure old assets are served
curl -X POST https://api.cloudflare.com/client/v4/zones/zone-id/purge_cache \
  -H "Authorization: Bearer your-api-token" \
  -d '{"purge_everything":true}'

# 4. Verify rollback success
npm run demo:verify

# 5. Notify stakeholders
# Send notification about rollback and expected resolution time
```

## Support & Troubleshooting

### 🆘 Escalation Procedures

#### Level 1: Automated Recovery
- Automatic restart of failed services
- CDN cache clearing
- Demo data reset

#### Level 2: Manual Intervention  
- Investigation of logs and metrics
- Manual service restart
- Configuration adjustments

#### Level 3: Engineering Response
- Code fixes and patches
- Infrastructure changes
- Emergency deployments

### 📞 Contact Information

- **On-Call Engineer**: Slack #demo-system-alerts
- **Database Admin**: postgres-admin@company.com  
- **Infrastructure**: infra-team@company.com
- **Security**: security@company.com

---

## ✅ Deployment Complete

When all steps are completed successfully:

1. **Update Status**: Mark WS-384 as "Production Ready"
2. **Notify Stakeholders**: Send deployment success notification
3. **Schedule Training**: Organize demo training for sales team
4. **Monitor Closely**: Watch metrics for first 48 hours
5. **Document Issues**: Track any post-deployment issues for future improvements

**Deployment Date**: _________________  
**Deployed By**: ___________________  
**Version**: 1.0.0  
**Next Review**: _________________