# WedSync 2.0 Production Deployment Guide

## 🚀 Overview

This guide covers the complete deployment process for WedSync 2.0 from staging to production.

## 📋 Pre-Deployment Checklist

### ✅ Code Quality
- [ ] All tests passing (`npm run test`)
- [ ] TypeScript compilation clean (`npm run typecheck`)
- [ ] ESLint checks passing (`npm run lint`)
- [ ] Bundle size under 500KB (`npm run analyze`)
- [ ] Performance audit completed (Lighthouse 90+)

### ✅ Environment Setup
- [ ] Production Supabase project configured
- [ ] Stripe production keys configured
- [ ] Domain SSL certificate ready
- [ ] CDN configured (Vercel Edge Network)
- [ ] Error monitoring setup (Sentry)

### ✅ Security
- [ ] Environment variables secured
- [ ] API rate limiting configured
- [ ] CORS policies validated
- [ ] Content Security Policy tested
- [ ] Authentication flow verified

## 🌐 Staging Deployment

### 1. Initial Staging Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Deploy to staging
vercel --target preview
```

### 2. Configure Staging Environment

```bash
# Set staging environment variables
vercel env add NODE_ENV production preview
vercel env add NEXT_PUBLIC_ENV staging preview
vercel env add NEXT_PUBLIC_APP_URL https://staging.wedsync.com preview
vercel env add DATABASE_URL [staging_db_url] preview
vercel env add STRIPE_SECRET_KEY [staging_stripe_key] preview
```

### 3. Custom Domain Setup

```bash
# Add staging domain
vercel domains add staging.wedsync.com
vercel alias [deployment-url] staging.wedsync.com
```

### 4. Staging Health Checks

```bash
# Health check endpoints
curl https://staging.wedsync.com/api/health
curl https://staging.wedsync.com/api/db/health
curl https://staging.wedsync.com/api/stripe/health
```

## 🏭 Production Deployment

### 1. Pre-Production Validation

```bash
# Run full test suite
npm run test:all
npm run test:e2e
npm run test:security

# Performance audit
npm run lighthouse
npm run analyze

# Security scan
npm audit --audit-level moderate
```

### 2. Production Environment Variables

```bash
# Critical production variables
vercel env add NODE_ENV production production
vercel env add NEXT_PUBLIC_ENV production production
vercel env add NEXT_PUBLIC_APP_URL https://wedsync.com production
vercel env add DATABASE_URL [production_db_url] production
vercel env add STRIPE_SECRET_KEY [production_stripe_key] production
vercel env add NEXTAUTH_SECRET [strong_secret] production
vercel env add SENTRY_DSN [production_sentry_dsn] production
```

### 3. Production Deployment

```bash
# Deploy to production
vercel --prod

# Assign custom domain
vercel domains add wedsync.com
vercel alias wedsync.com
```

### 4. Post-Deployment Verification

```bash
# Verify critical paths
curl https://wedsync.com/api/health
curl https://wedsync.com/api/auth/session
curl https://wedsync.com/api/forms

# Run production E2E tests
npx playwright test --config=production
```

## 📊 Monitoring Setup

### 1. Error Monitoring (Sentry)

```javascript
// sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter sensitive data
    return event;
  }
});
```

### 2. Performance Monitoring

```javascript
// Real User Monitoring setup
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to analytics service
  const body = JSON.stringify(metric);
  
  if ('sendBeacon' in navigator) {
    navigator.sendBeacon('/api/analytics', body);
  } else {
    fetch('/api/analytics', { body, method: 'POST', keepalive: true });
  }
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 3. Uptime Monitoring

```bash
# Health check endpoints to monitor
https://wedsync.com/api/health
https://wedsync.com/api/db/health
https://wedsync.com/api/stripe/health
https://wedsync.com/api/auth/health
```

## 🔧 Configuration Files

### 1. Vercel Configuration

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "functions": {
    "app/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/health",
      "destination": "/api/health"
    }
  ]
}
```

### 2. Environment Template

```bash
# .env.production.template
NODE_ENV=production
NEXT_PUBLIC_ENV=production
NEXT_PUBLIC_APP_URL=https://wedsync.com

# Database
DATABASE_URL=postgresql://production_url
NEXT_PUBLIC_SUPABASE_URL=https://production.supabase.co

# Authentication
NEXTAUTH_URL=https://wedsync.com
NEXTAUTH_SECRET=[generate_strong_secret]

# Payments
STRIPE_SECRET_KEY=sk_live_[production_key]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_[production_key]

# Monitoring
SENTRY_DSN=https://production.sentry.io
NEXT_PUBLIC_SENTRY_DSN=https://production.sentry.io
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test
      - run: npm run lint
      - run: npm run typecheck

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          vercel-args: '--prod'
```

### 2. Deployment Hooks

```bash
# Add deployment webhook
curl -X POST "https://api.vercel.com/v1/integrations/webhooks" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://wedsync.com/api/deploy-hook",
    "events": ["deployment.created", "deployment.ready"]
  }'
```

## 🚨 Rollback Procedures

### 1. Quick Rollback

```bash
# Get deployment list
vercel ls

# Rollback to previous deployment
vercel alias [previous-deployment-url] wedsync.com
```

### 2. Database Migration Rollback

```bash
# Rollback database migrations
npx supabase db reset
npx supabase db push --backup-file=pre-deploy-backup.sql
```

## 📈 Performance Optimization

### 1. CDN Configuration

```javascript
// next.config.js additions for production
const nextConfig = {
  images: {
    domains: ['cdn.wedsync.com'],
    formats: ['image/avif', 'image/webp'],
  },
  headers: async () => [
    {
      source: '/static/(.*)',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable'
        }
      ]
    }
  ]
};
```

### 2. Database Optimization

```sql
-- Production database optimizations
CREATE INDEX CONCURRENTLY idx_forms_organization_created 
ON forms(organization_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_submissions_form_date 
ON form_submissions(form_id, created_at DESC);

-- Enable database statistics
ANALYZE;
```

## 🔐 Security Hardening

### 1. Production Security Headers

```javascript
// Strict CSP for production
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "upgrade-insecure-requests"
].join('; ');
```

### 2. Rate Limiting

```javascript
// Production rate limits
const rateLimits = {
  api: { max: 100, window: '15m' },
  auth: { max: 5, window: '15m' },
  payment: { max: 3, window: '15m' },
  upload: { max: 10, window: '1h' }
};
```

## 📞 Support & Maintenance

### Emergency Contacts
- **Infrastructure:** DevOps Team
- **Application:** Engineering Team  
- **Database:** Database Admin
- **Security:** Security Team

### Maintenance Windows
- **Regular:** Sundays 2-4 AM UTC
- **Emergency:** As needed with 1-hour notice
- **Database:** Monthly, coordinated with stakeholders

---

## ✅ Deployment Checklist

### Pre-Deploy
- [ ] Code review completed
- [ ] Tests passing
- [ ] Security scan completed
- [ ] Performance benchmark met
- [ ] Staging validation completed

### Deploy
- [ ] Environment variables configured
- [ ] Domain DNS updated
- [ ] SSL certificate active
- [ ] CDN configured
- [ ] Monitoring enabled

### Post-Deploy
- [ ] Health checks passing
- [ ] Critical path testing completed
- [ ] Performance metrics validated
- [ ] Error monitoring active
- [ ] Team notified

**Deployment Status:** Ready for Production 🚀