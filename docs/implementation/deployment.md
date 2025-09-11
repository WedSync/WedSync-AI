# WedSync/WedMe Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the WedSync/WedMe platform to production. Written for clarity and precision, avoiding technical assumptions.

## Prerequisites

### Required Accounts
Before beginning deployment, you need active accounts for:

1. **Vercel** (Frontend hosting)
   - Sign up at: https://vercel.com
   - Free tier available, paid recommended for production
   
2. **Supabase** (Database & Authentication)
   - Sign up at: https://supabase.com
   - Free tier for development, paid for production
   
3. **GitHub** (Code repository)
   - Sign up at: https://github.com
   - Required for Vercel deployment
   
4. **Resend** (Email service)
   - Sign up at: https://resend.com
   - For transactional emails
   
5. **OpenAI** (AI features)
   - Sign up at: https://platform.openai.com
   - API key required for form generation

### Domain Names
- Production domain for WedSync (e.g., `wedsync.ai`)
- Production domain for WedMe (e.g., `wedme.app`)
- DNS management access (Cloudflare recommended)

## Environment Setup

### 1. Local Development Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/wedsync.git
cd wedsync

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
2. Environment Variables Configuration
Create .env.local with the following structure:
env# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Resend Email Configuration
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@wedsync.ai

# Application URLs
NEXT_PUBLIC_WEDSYNC_URL=https://wedsync.ai
NEXT_PUBLIC_WEDME_URL=https://wedme.app

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_FEATURES=true
NEXT_PUBLIC_ENABLE_SMS=false
Database Setup
1. Supabase Project Creation

Log into Supabase Dashboard
Click "New Project"
Configure:

Project name: wedsync-production
Database Password: Generate strong password (save securely)
Region: Choose closest to target users
Pricing Plan: Pro recommended for production



2. Database Schema Migration
sql-- Run these migrations in order through Supabase SQL Editor

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "vector";

-- 2. Create base tables (suppliers, couples, forms, etc.)
-- Use the complete schema from your database design documents
-- This should be run via Supabase migrations
3. Row Level Security (RLS) Setup
sql-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE couples ENABLE ROW LEVEL SECURITY;
ALTER TABLE forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_dashboard ENABLE ROW LEVEL SECURITY;

-- Create policies for each table
-- Example for suppliers table:
CREATE POLICY "Suppliers can view own data" ON suppliers
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Suppliers can update own data" ON suppliers
  FOR UPDATE USING (auth.uid() = user_id);
4. Database Backups Configuration
In Supabase Dashboard:

Navigate to Settings → Backups
Enable Point-in-Time Recovery
Set backup retention: 30 days
Enable daily backups

Frontend Deployment (Vercel)
1. Connect GitHub Repository

Log into Vercel Dashboard
Click "Add New Project"
Import Git Repository
Select your WedSync repository
Configure project:

Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next



2. Environment Variables in Vercel

Go to Project Settings → Environment Variables
Add all variables from .env.local
Set scope:

Production: Main deployment
Preview: Branch deployments
Development: Local development



3. Domain Configuration
For WedSync (wedsync.ai):

In Vercel: Settings → Domains
Add domain: wedsync.ai
Add www redirect: www.wedsync.ai → wedsync.ai

For WedMe (wedme.app):

Create separate Vercel project for WedMe
Add domain: wedme.app
Configure subdomain: app.wedme.app for authenticated users

4. DNS Configuration (Cloudflare)
# WedSync (wedsync.ai) DNS Records
Type    Name    Content                 TTL
A       @       76.76.21.21            Auto
CNAME   www     cname.vercel-dns.com   Auto

# WedMe (wedme.app) DNS Records  
Type    Name    Content                 TTL
A       @       76.76.21.21            Auto
CNAME   www     cname.vercel-dns.com   Auto
CNAME   app     cname.vercel-dns.com   Auto
API Deployment
1. Edge Functions (Supabase)
Create edge functions for critical operations:
typescript// supabase/functions/process-form-submission/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from '@supabase/supabase-js'

serve(async (req) => {
  // Function logic here
})
Deploy:
bashsupabase functions deploy process-form-submission
2. Webhook Endpoints
Configure webhooks for:

Payment processing (when implemented)
Email delivery status
Form submissions
Client dashboard updates

Security Configuration
1. API Rate Limiting
In Vercel, create vercel.json:
json{
  "functions": {
    "api/*": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-RateLimit-Limit",
          "value": "100"
        },
        {
          "key": "X-RateLimit-Window",
          "value": "60"
        }
      ]
    }
  ]
}
2. CORS Configuration
typescript// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: process.env.NEXT_PUBLIC_WEDME_URL },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  },
}
3. Content Security Policy
typescript// Add to _app.tsx or middleware
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.supabase.co https://api.openai.com;
`
Monitoring Setup
1. Error Tracking (Sentry)
bashnpm install @sentry/nextjs

# Run setup wizard
npx @sentry/wizard -i nextjs
Configure in sentry.client.config.ts:
typescriptimport * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
})
2. Analytics (Vercel Analytics)
bashnpm install @vercel/analytics

# Add to _app.tsx
import { Analytics } from '@vercel/analytics/react'

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  )
}
3. Uptime Monitoring
Configure external monitoring:

Sign up for Better Uptime or similar
Add monitors for:

https://wedsync.ai (2-minute checks)
https://wedme.app (2-minute checks)
API endpoints (5-minute checks)



Deployment Checklist
Pre-Deployment

 All environment variables configured
 Database migrations tested in staging
 RLS policies verified
 API rate limits configured
 Error tracking setup
 DNS records configured
 SSL certificates verified

Deployment Steps

 Push code to main branch
 Verify Vercel build succeeds
 Run database migrations
 Test critical user flows
 Monitor error logs for 30 minutes
 Verify email delivery
 Check AI features functioning

Post-Deployment

 Monitor error rates
 Check page load speeds
 Verify mobile responsiveness
 Test form submissions
 Confirm email notifications
 Review security headers
 Update status page

Rollback Procedure
Immediate Rollback (< 5 minutes)

In Vercel Dashboard → Deployments
Find previous stable deployment
Click "..." → "Promote to Production"
Deployment rolls back instantly

Database Rollback

Supabase Dashboard → Backups
Select point-in-time recovery
Choose timestamp before migration
Restore to new database
Update connection string in Vercel

Production Maintenance
Weekly Tasks

Review error logs
Check database performance
Monitor API usage and costs
Review security alerts
Update dependencies (security patches only)

Monthly Tasks

Full backup verification
Performance audit
Security audit
Cost analysis
Feature usage analytics

Troubleshooting Guide
Common Issues and Solutions
Build Failures
bash# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
Database Connection Issues

Verify Supabase project is active
Check connection pooling settings
Verify environment variables
Test with Supabase connection pooler URL

Email Delivery Problems

Check Resend API key
Verify sender domain (noreply@wedsync.ai)
Check SPF/DKIM records
Review Resend dashboard for bounces

AI Features Not Working

Verify OpenAI API key is valid
Check API usage limits
Monitor rate limiting
Review error logs for API responses

Staging Environment
Setup Staging Environment

Create separate Supabase project: wedsync-staging
Create Vercel preview deployment
Use subdomains:

staging.wedsync.ai
staging.wedme.app



Staging Deploy Process
bash# Deploy to staging branch
git checkout staging
git merge develop
git push origin staging

# Vercel automatically deploys staging branch
# Test all features before production merge
Performance Optimization
Image Optimization
typescript// next.config.js
module.exports = {
  images: {
    domains: ['wedsync.ai', 'wedme.app'],
    formats: ['image/avif', 'image/webp'],
  },
}
Database Indexing
sql-- Add indexes for common queries
CREATE INDEX idx_forms_supplier_id ON forms(supplier_id);
CREATE INDEX idx_forms_created_at ON forms(created_at DESC);
CREATE INDEX idx_couples_wedding_date ON couples(wedding_date);
Caching Strategy

Static pages: 1 hour cache
API responses: 5 minute cache for non-critical
Form data: No cache (real-time required)
Images: 30 day cache with versioning

Disaster Recovery
Backup Strategy

Database: Daily automated backups, 30-day retention
Code: Git repository with tagged releases
Media: Supabase Storage with versioning
Configurations: Version controlled in repository

Recovery Time Objectives

RTO (Recovery Time Objective): 4 hours
RPO (Recovery Point Objective): 24 hours

Emergency Contacts

Primary Developer: [Contact]
Vercel Support: support@vercel.com
Supabase Support: support@supabase.com
Domain Registrar: [Contact]

Launch Checklist
Soft Launch (Beta)

 Deploy to production URLs
 Invite 10 beta suppliers
 Monitor for 1 week
 Gather feedback
 Fix critical issues

Public Launch

 Marketing website live
 Documentation complete
 Support system ready
 Monitoring active
 Backup verified
 Team trained

Cost Monitoring
Expected Monthly Costs

Vercel: ~$20-100 (based on traffic)
Supabase: ~$25-125 (based on usage)
OpenAI: ~$50-500 (based on AI usage)
Resend: ~$20-100 (based on emails)
Domains: ~$5 (annual, divided monthly)

Cost Optimization

Monitor OpenAI token usage
Implement caching for AI responses
Use Supabase connection pooling
Optimize image sizes
Review Vercel function execution times

RetryScontinueEditmarkdown## Deployment Automation

### CI/CD Pipeline Setup

#### GitHub Actions Configuration

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
 push:
   branches: [main]
 pull_request:
   branches: [main]

jobs:
 test:
   runs-on: ubuntu-latest
   steps:
     - uses: actions/checkout@v3
     
     - name: Setup Node.js
       uses: actions/setup-node@v3
       with:
         node-version: '20'
         cache: 'npm'
     
     - name: Install dependencies
       run: npm ci
     
     - name: Run type check
       run: npm run type-check
     
     - name: Run tests
       run: npm test
     
     - name: Run build
       run: npm run build
       env:
         NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
         NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}

 deploy:
   needs: test
   runs-on: ubuntu-latest
   if: github.ref == 'refs/heads/main'
   
   steps:
     - uses: actions/checkout@v3
     
     - name: Deploy to Vercel
       uses: amondnet/vercel-action@v20
       with:
         vercel-token: ${{ secrets.VERCEL_TOKEN }}
         vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
         vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
         vercel-args: '--prod'
Database Migration Automation
Create supabase/migrations/ directory structure:
bashsupabase/
├── migrations/
│   ├── 20240101000000_initial_schema.sql
│   ├── 20240102000000_add_forms_table.sql
│   ├── 20240103000000_add_rls_policies.sql
│   └── 20240104000000_add_indexes.sql
├── seed.sql
└── config.toml
Migration deployment script:
bash#!/bin/bash
# deploy-migrations.sh

echo "Running database migrations..."

# Set environment
ENVIRONMENT=${1:-staging}

if [ "$ENVIRONMENT" = "production" ]; then
  SUPABASE_URL=$PROD_SUPABASE_URL
  SUPABASE_KEY=$PROD_SUPABASE_SERVICE_KEY
else
  SUPABASE_URL=$STAGING_SUPABASE_URL
  SUPABASE_KEY=$STAGING_SUPABASE_SERVICE_KEY
fi

# Run migrations
supabase db push --db-url "$SUPABASE_URL" --access-token "$SUPABASE_KEY"

echo "Migrations complete!"
Multi-Environment Management
Environment Configuration
typescript// config/environments.ts
export const config = {
  development: {
    apiUrl: 'http://localhost:3000',
    supabaseUrl: process.env.NEXT_PUBLIC_DEV_SUPABASE_URL,
    wedSyncUrl: 'http://localhost:3000',
    wedMeUrl: 'http://localhost:3001',
  },
  staging: {
    apiUrl: 'https://staging.wedsync.ai',
    supabaseUrl: process.env.NEXT_PUBLIC_STAGING_SUPABASE_URL,
    wedSyncUrl: 'https://staging.wedsync.ai',
    wedMeUrl: 'https://staging.wedme.app',
  },
  production: {
    apiUrl: 'https://wedsync.ai',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
    wedSyncUrl: 'https://wedsync.ai',
    wedMeUrl: 'https://wedme.app',
  },
}

export const currentConfig = config[process.env.NEXT_PUBLIC_ENV || 'development']
Environment-Specific Features
typescript// utils/featureFlags.ts
export const features = {
  aiFormGeneration: process.env.NEXT_PUBLIC_ENV === 'production',
  smsIntegration: false, // Not yet implemented
  templateMarketplace: process.env.NEXT_PUBLIC_ENV !== 'development',
  referralProgram: process.env.NEXT_PUBLIC_ENV === 'production',
}
Load Testing & Performance
Load Testing Setup
Using Artillery for load testing:
bashnpm install -D artillery

# Create test scenario
# artillery-config.yml
config:
  target: "https://staging.wedsync.ai"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Ramp up"
    - duration: 300
      arrivalRate: 100
      name: "Sustained load"

scenarios:
  - name: "Browse and submit form"
    flow:
      - get:
          url: "/"
      - think: 5
      - get:
          url: "/forms"
      - think: 3
      - post:
          url: "/api/forms/submit"
          json:
            formId: "{{ $randomString() }}"
            data: "{{ $randomData() }}"
Run load test:
bashartillery run artillery-config.yml
Performance Benchmarks
Target metrics:

Time to First Byte (TTFB): < 200ms
First Contentful Paint (FCP): < 1.5s
Largest Contentful Paint (LCP): < 2.5s
Time to Interactive (TTI): < 3.5s
Form submission response: < 500ms
API response time (p95): < 1s

Monitoring & Alerting
Custom Health Check Endpoint
typescript// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET() {
  const checks = {
    api: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    storage: 'unknown',
  }

  try {
    // Check database
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    const { error } = await supabase.from('suppliers').select('count').limit(1)
    checks.database = error ? 'unhealthy' : 'healthy'
    
    // Check storage
    const { error: storageError } = await supabase.storage.listBuckets()
    checks.storage = storageError ? 'unhealthy' : 'healthy'
    
  } catch (error) {
    checks.api = 'unhealthy'
  }

  const allHealthy = Object.values(checks).every(status => status === 'healthy')
  
  return NextResponse.json(
    { 
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    },
    { status: allHealthy ? 200 : 503 }
  )
}
Alert Configuration
Configure alerts in Better Uptime or similar:
json{
  "monitors": [
    {
      "url": "https://wedsync.ai/api/health",
      "name": "WedSync API Health",
      "check_frequency": 60,
      "request_timeout": 30,
      "confirmation_period": 2,
      "alert_channels": ["email", "sms"]
    },
    {
      "url": "https://wedme.app/api/health",
      "name": "WedMe API Health",
      "check_frequency": 60,
      "request_timeout": 30,
      "confirmation_period": 2,
      "alert_channels": ["email", "sms"]
    }
  ],
  "escalation_policy": {
    "level_1": {
      "wait_time": 0,
      "contacts": ["primary_developer"]
    },
    "level_2": {
      "wait_time": 15,
      "contacts": ["backup_developer", "founder"]
    }
  }
}
Data Privacy & GDPR Compliance
User Data Export
typescript// app/api/gdpr/export/route.ts
export async function POST(request: Request) {
  const { userId } = await request.json()
  
  // Gather all user data
  const userData = {
    profile: await getSupplierProfile(userId),
    forms: await getUserForms(userId),
    clients: await getUserClients(userId),
    journeys: await getUserJourneys(userId),
    analytics: await getUserAnalytics(userId),
  }
  
  // Generate ZIP file
  const zip = new JSZip()
  zip.file('user-data.json', JSON.stringify(userData, null, 2))
  
  const blob = await zip.generateAsync({ type: 'blob' })
  
  return new Response(blob, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename=wedsync-data-${userId}.zip`
    }
  })
}
Data Deletion
typescript// app/api/gdpr/delete/route.ts
export async function DELETE(request: Request) {
  const { userId } = await request.json()
  
  // Soft delete with 30-day retention
  await supabase
    .from('suppliers')
    .update({ 
      deleted_at: new Date().toISOString(),
      deletion_scheduled: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    })
    .eq('id', userId)
  
  // Schedule hard delete after 30 days
  await scheduleHardDelete(userId)
  
  return NextResponse.json({ success: true })
}
Scaling Considerations
Database Connection Pooling
typescript// lib/database.ts
import { createClient } from '@supabase/supabase-js'

// Use connection pooler URL for better performance
const supabaseUrl = process.env.DATABASE_POOLER_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const supabase = createClient(supabaseUrl!, supabaseKey!, {
  auth: {
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-connection-pooling': 'true'
    }
  }
})
Caching Strategy Implementation
typescript// lib/cache.ts
import { unstable_cache } from 'next/cache'

// Cache form templates for 1 hour
export const getCachedFormTemplates = unstable_cache(
  async () => {
    const { data } = await supabase
      .from('form_templates')
      .select('*')
      .eq('is_public', true)
    return data
  },
  ['form-templates'],
  {
    revalidate: 3600, // 1 hour
    tags: ['forms']
  }
)

// Cache supplier profiles for 5 minutes
export const getCachedSupplierProfile = unstable_cache(
  async (supplierId: string) => {
    const { data } = await supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single()
    return data
  },
  ['supplier-profile'],
  {
    revalidate: 300, // 5 minutes
    tags: ['suppliers']
  }
)
CDN Configuration
typescript// next.config.js
module.exports = {
  images: {
    domains: ['wedsync.ai', 'wedme.app'],
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
  },
  async headers() {
    return [
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|avif|ico)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}
Security Hardening
API Authentication Middleware
typescript// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Check authentication for protected routes
  if (req.nextUrl.pathname.startsWith('/api/protected')) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
  }
  
  // Add security headers
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'DENY')
  res.headers.set('X-XSS-Protection', '1; mode=block')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  return res
}

export const config = {
  matcher: ['/api/:path*', '/dashboard/:path*']
}
Input Validation
typescript// lib/validation.ts
import { z } from 'zod'

export const formSubmissionSchema = z.object({
  formId: z.string().uuid(),
  data: z.record(z.unknown()),
  clientId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
})

export const validateFormSubmission = (data: unknown) => {
  try {
    return formSubmissionSchema.parse(data)
  } catch (error) {
    throw new Error('Invalid form submission data')
  }
}
Final Launch Preparation
Pre-Launch Checklist
1 Week Before Launch

 Complete security audit
 Perform load testing
 Verify all environment variables
 Test payment flows (when implemented)
 Confirm email deliverability
 Review and update documentation
 Prepare customer support resources

3 Days Before Launch

 Final staging deployment
 Complete user acceptance testing
 Verify monitoring and alerts
 Backup production database
 Prepare rollback plan
 Brief support team

Launch Day

 Deploy to production (early morning)
 Verify all systems operational
 Monitor error rates closely
 Test critical user journeys
 Announce launch (social media, email)
 Monitor user feedback channels
 Stand by for immediate fixes

Post-Launch Monitoring (First 48 Hours)

Monitor error rates every hour
Check database performance
Review user sign-up flow completion
Track API response times
Monitor OpenAI token usage
Check email delivery rates
Review user feedback
Address critical issues immediately

Support & Maintenance Documentation
Documentation Links

API Documentation: /docs/api
User Guide: /docs/user-guide
Admin Guide: /docs/admin
Troubleshooting: /docs/troubleshooting

Support Channels

Email: support@wedsync.ai
Status Page: status.wedsync.ai
Documentation: docs.wedsync.ai