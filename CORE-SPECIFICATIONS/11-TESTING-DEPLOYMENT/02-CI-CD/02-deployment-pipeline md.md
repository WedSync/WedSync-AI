# 02-deployment-pipeline.md

# Deployment Pipeline for WedSync/WedMe

## What to Build

Create a multi-stage deployment pipeline with automatic preview deployments for PRs, staging environment for testing, and production deployment with rollback capabilities.

## Environment Strategy

```
// environments.config.ts
export const ENVIRONMENTS = {
  development: {
    url: '[http://localhost:3000](http://localhost:3000)',
    database: 'local',
    features: 'all'
  },
  preview: {
    url: '[https://preview-{pr-number}.wedsync.vercel.app](https://preview-{pr-number}.wedsync.vercel.app)',
    database: 'preview',
    features: 'all'
  },
  staging: {
    url: '[https://staging.wedsync.com](https://staging.wedsync.com)',
    database: 'staging',
    features: 'all'
  },
  production: {
    url: '[https://wedsync.com](https://wedsync.com)',
    database: 'production',
    features: 'stable'
  }
}
```

## Vercel Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build:prod",
  "outputDirectory": ".next",
  "installCommand": "npm ci",
  "regions": ["iad1", "lhr1"],
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    },
    "app/api/ai/**/*.ts": {
      "maxDuration": 60
    }
  },
  "crons": [
    {
      "path": "/api/cron/daily-metrics",
      "schedule": "0 5 * * *"
    },
    {
      "path": "/api/cron/cleanup-temp",
      "schedule": "0 */6 * * *"
    }
  ]
}
```

## Build Scripts

```json
// package.json
{
  "scripts": {
    "build:dev": "NEXT_PUBLIC_ENV=development next build",
    "build:staging": "NEXT_PUBLIC_ENV=staging next build",
    "build:prod": "NEXT_PUBLIC_ENV=production next build",
    "deploy:preview": "vercel --env preview",
    "deploy:staging": "vercel --env staging --prod",
    "deploy:production": "vercel --prod",
    "rollback": "vercel rollback"
  }
}
```

## Pre-deployment Checks

```
// scripts/pre-deploy.ts
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

const preDeployChecks = async () => {
  console.log('Running pre-deployment checks...')
  
  // Check for TypeScript errors
  try {
    await execAsync('npm run type-check')
    console.log('✅ TypeScript check passed')
  } catch (error) {
    console.error('❌ TypeScript errors found')
    process.exit(1)
  }
  
  // Check for build errors
  try {
    await execAsync('npm run build:prod')
    console.log('✅ Build successful')
  } catch (error) {
    console.error('❌ Build failed')
    process.exit(1)
  }
  
  // Check bundle size
  const { stdout } = await execAsync('npm run analyze:quiet')
  const mainBundleSize = parseInt(stdout.match(/main: (\d+)/)?.[1] || '0')
  
  if (mainBundleSize > 250000) {
    console.error(`❌ Main bundle too large: ${mainBundleSize} bytes`)
    process.exit(1)
  }
  
  // Database migration check
  try {
    await execAsync('npm run db:migrate:dry-run')
    console.log('✅ Database migrations ready')
  } catch (error) {
    console.error('❌ Database migration issues')
    process.exit(1)
  }
  
  console.log('All pre-deployment checks passed!')
}

preDeployChecks()
```

## Staging Deployment Script

```
#!/bin/bash
# scripts/[deploy-staging.sh](http://deploy-staging.sh)

set -e

echo "🚀 Starting staging deployment..."

# Run tests
echo "Running tests..."
npm run test:ci

# Run pre-deployment checks
echo "Running pre-deployment checks..."
node scripts/pre-deploy.ts

# Build application
echo "Building application..."
npm run build:staging

# Deploy to Vercel staging
echo "Deploying to staging..."
VERCEL_ORG_ID=$VERCEL_ORG_ID \
VERCEL_PROJECT_ID=$VERCEL_PROJECT_ID \
vercel --token=$VERCEL_TOKEN \
       --env=staging \
       --prod \
       --yes

# Run smoke tests
echo "Running smoke tests..."
STAGING_URL=[https://staging.wedsync.com](https://staging.wedsync.com) npm run test:smoke

# Update deployment status
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text":"✅ Staging deployment successful"}'

echo "✅ Staging deployment complete!"
```

## Production Deployment with Rollback

```
// scripts/deploy-production.ts
import { Vercel } from '@vercel/client'
import { createClient } from '@supabase/supabase-js'

const vercel = new Vercel({ token: process.env.VERCEL_TOKEN })
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

interface DeploymentConfig {
  environment: 'production'
  gitBranch: string
  gitCommit: string
  meta: {
    deployedBy: string
    timestamp: string
    previousDeployment: string
  }
}

async function deployToProduction() {
  // Save current deployment info for rollback
  const currentDeployment = await vercel.getDeployment('current')
  
  // Create deployment record
  const { error: dbError } = await supabase
    .from('deployments')
    .insert({
      environment: 'production',
      git_commit: process.env.GITHUB_SHA,
      deployed_by: process.env.GITHUB_ACTOR,
      status: 'in_progress'
    })
  
  if (dbError) {
    console.error('Failed to create deployment record')
    process.exit(1)
  }
  
  try {
    // Deploy to Vercel
    const deployment = await vercel.createDeployment({
      name: 'wedsync',
      env: 'production',
      gitBranch: 'main',
      gitCommit: process.env.GITHUB_SHA
    })
    
    // Wait for deployment to be ready
    await vercel.waitForDeployment([deployment.id](http://deployment.id))
    
    // Run production smoke tests
    const testResult = await runSmokeTests('[https://wedsync.com](https://wedsync.com)')
    
    if (!testResult.success) {
      throw new Error('Smoke tests failed')
    }
    
    // Update deployment record
    await supabase
      .from('deployments')
      .update({ status: 'success' })
      .eq('git_commit', process.env.GITHUB_SHA)
    
    console.log('✅ Production deployment successful')
    
  } catch (error) {
    console.error('Deployment failed, initiating rollback...')
    
    // Rollback to previous deployment
    await vercel.rollback([currentDeployment.id](http://currentDeployment.id))
    
    // Update deployment record
    await supabase
      .from('deployments')
      .update({ 
        status: 'failed',
        error_message: error.message
      })
      .eq('git_commit', process.env.GITHUB_SHA)
    
    process.exit(1)
  }
}
```

## Health Check Endpoints

```
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: 'unknown',
    redis: 'unknown',
    storage: 'unknown'
  }
  
  // Check database
  try {
    const { error } = await supabase.from('health_check').select('id').limit(1)
    checks.database = error ? 'unhealthy' : 'healthy'
  } catch {
    checks.database = 'unhealthy'
  }
  
  // Check Redis
  try {
    await [redis.ping](http://redis.ping)()
    checks.redis = 'healthy'
  } catch {
    checks.redis = 'unhealthy'
  }
  
  // Check storage
  try {
    await fetch([process.env.NEXT](http://process.env.NEXT)_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/test')
    [checks.storage](http://checks.storage) = 'healthy'
  } catch {
    [checks.storage](http://checks.storage) = 'unhealthy'
  }
  
  const allHealthy = Object.values(checks).every(status => status === 'healthy')
  
  return Response.json(
    { 
      status: allHealthy ? 'healthy' : 'degraded',
      checks,
      timestamp: new Date().toISOString()
    },
    { status: allHealthy ? 200 : 503 }
  )
}
```

## Smoke Tests

```
// tests/smoke/production.test.ts
import { test, expect } from '@playwright/test'

const PRODUCTION_URL = process.env.PRODUCTION_URL || '[https://wedsync.com](https://wedsync.com)'

test.describe('Production Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto(PRODUCTION_URL)
    await expect(page).toHaveTitle(/WedSync/)
  })
  
  test('login works', async ({ page }) => {
    await page.goto(`${PRODUCTION_URL}/login`)
    await page.fill('[name=email]', process.env.TEST_EMAIL!)
    await page.fill('[name=password]', process.env.TEST_PASSWORD!)
    await [page.click](http://page.click)('[type=submit]')
    await expect(page).toHaveURL(/dashboard/)
  })
  
  test('API health check', async ({ request }) => {
    const response = await request.get(`${PRODUCTION_URL}/api/health`)
    expect(response.status()).toBe(200)
    const data = await response.json()
    expect(data.status).toBe('healthy')
  })
})
```

## Critical Implementation Notes

1. **Always deploy to staging first** - Never skip staging validation
2. **Keep deployment artifacts** - Store build outputs for rollback
3. **Monitor deployment metrics** - Track deployment frequency and success rate
4. **Implement feature flags** - Deploy code without enabling features
5. **Database migrations separate** - Run migrations before deployment

## Rollback Procedure

```
# Emergency rollback script
#!/bin/bash
# scripts/[emergency-rollback.sh](http://emergency-rollback.sh)

echo "🔄 Initiating emergency rollback..."

# Get last successful deployment
LAST_DEPLOYMENT=$(vercel ls --prod | head -2 | tail -1 | awk '{print $1}')

# Rollback
vercel rollback $LAST_DEPLOYMENT --yes

# Notify team
curl -X POST $SLACK_WEBHOOK \
  -H 'Content-Type: application/json' \
  -d '{"text":"🚨 Emergency rollback executed"}'

echo "✅ Rollback complete"
```