# 04-rollback-procedures.md

# Rollback Procedures for WedSync/WedMe

## What to Build

Implement automated rollback mechanisms that can quickly revert deployments when issues are detected in production. This includes database migration rollbacks, application version rollbacks, and feature flag controls.

## Key Technical Requirements

### Version Tracking System
```typescript
// src/lib/deployment/version-tracker.ts
interface DeploymentVersion {
  id: string
  timestamp: Date
  gitSha: string
  vercelDeploymentId: string
  dbMigrationVersion: string
  environmentVariables: Record<string, string>
  healthCheckStatus: 'passing' | 'failing' | 'unknown'
}

export class VersionTracker {
  async recordDeployment(deployment: DeploymentVersion): Promise<void> {
    await supabase
      .from('deployment_history')
      .insert(deployment)
  }

  async getLastStableVersion(): Promise<DeploymentVersion> {
    const { data } = await supabase
      .from('deployment_history')
      .select('*')
      .eq('healthCheckStatus', 'passing')
      .order('timestamp', { ascending: false })
      .limit(1)
      .single()
    
    return data
  }
}
```

# Rollback Procedures Implementation

## What to Build

Implement automated rollback mechanisms for failed deployments with instant recovery to last known good state. System must handle database migrations, API versions, and frontend deployments independently.

## Vercel Rollback Configuration

```bash
# .github/workflows/rollback.yml
name: Emergency Rollback

on:
  workflow_dispatch:
    inputs:
      deployment_id:
        description: 'Vercel deployment ID to rollback to'
        required: true
      environment:
        description: 'Environment to rollback'
        type: choice
        options:
          - production
          - staging
        required: true

jobs:
  rollback:
    runs-on: ubuntu-latest
    steps:
      - name: Rollback Vercel Deployment
        run: |
          vercel alias set ${{ inputs.deployment_id }} \
            ${{ inputs.environment }}-wedsync.vercel.app \
            --token=${{ secrets.VERCEL_TOKEN }} \
            --scope=${{ secrets.VERCEL_TEAM_ID }}
      
      - name: Verify Rollback
        run: |
          curl -f https://${{ inputs.environment }}-wedsync.vercel.app/api/health \
            || exit 1
```

## Database Migration Rollback

```tsx
// scripts/rollback-migration.ts
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function rollbackMigration(version: string) {
  try {
    // Check current migration version
    const { data: current } = await supabase
      .from('schema_migrations')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single()
    
    if (!current || current.version <= version) {
      throw new Error(`Cannot rollback to ${version}`)
    }
    
    // Load rollback script
    const rollbackPath = path.join(
      __dirname,
      `../migrations/rollback_${current.version}.sql`
    )
    const rollbackSQL = fs.readFileSync(rollbackPath, 'utf8')
    
    // Execute rollback in transaction
    await supabase.rpc('execute_sql', {
      sql: `
        BEGIN;
        ${rollbackSQL}
        DELETE FROM schema_migrations WHERE version = '${current.version}';
        COMMIT;
      `
    })
    
    console.log(`✓ Rolled back from ${current.version} to ${version}`)
  } catch (error) {
    console.error('Rollback failed:', error)
    process.exit(1)
  }
}

// Run with: npm run rollback:db -- --version=20250811
```

## Automated Health Checks

```tsx
// app/api/health/route.ts
export async function GET() {
  const checks = {
    api: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    stripe: 'unknown'
  }
  
  try {
    // Database check
    const { error: dbError } = await supabase
      .from('health_check')
      .select('id')
      .limit(1)
    checks.database = dbError ? 'unhealthy' : 'healthy'
    
    // Redis check
    await redis.ping()
    checks.redis = 'healthy'
    
    // Stripe check
    await stripe.customers.list({ limit: 1 })
    checks.stripe = 'healthy'
  } catch (error) {
    // Log but don't fail health check
  }
  
  const allHealthy = Object.values(checks).every(v => v === 'healthy')
  
  return Response.json(checks, {
    status: allHealthy ? 200 : 503
  })
}
```

## Blue-Green Deployment Strategy

```yaml
# vercel.json configuration
{
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://blue-api.wedsync.com/:path*",
      "has": [
        {
          "type": "header",
          "key": "x-deployment-version",
          "value": "blue"
        }
      ]
    }
  ]
}
```

## Rollback Decision Matrix

```tsx
// monitoring/rollback-monitor.ts
interface RollbackCriteria {
  errorRate: number      // > 5% triggers rollback
  responseTime: number   // > 3000ms triggers rollback
  availability: number   // < 99% triggers rollback
  criticalErrors: string[] // Specific errors trigger immediate rollback
}

const ROLLBACK_THRESHOLDS: RollbackCriteria = {
  errorRate: 0.05,
  responseTime: 3000,
  availability: 0.99,
  criticalErrors: [
    'STRIPE_WEBHOOK_FAILED',
    'DATABASE_CONNECTION_LOST',
    'AUTH_SERVICE_DOWN'
  ]
}

export async function checkDeploymentHealth(
  deploymentId: string
): Promise<boolean> {
  const metrics = await getMetrics(deploymentId, '5m')
  
  // Check each threshold
  if (metrics.errorRate > ROLLBACK_THRESHOLDS.errorRate) {
    await triggerRollback(deploymentId, 'High error rate')
    return false
  }
  
  if (metrics.p95ResponseTime > ROLLBACK_THRESHOLDS.responseTime) {
    await triggerRollback(deploymentId, 'Slow response time')
    return false
  }
  
  return true
}
```

## Feature Flag Rollback

```tsx
// lib/feature-flags.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
})

export async function rollbackFeature(featureName: string) {
  // Store rollback state
  await redis.hset('feature_rollbacks', {
    [featureName]: {
      rolled_back_at: new Date().toISOString(),
      previous_state: await redis.hget('feature_flags', featureName)
    }
  })
  
  // Disable feature immediately
  await redis.hset('feature_flags', featureName, 'disabled')
  
  // Clear CDN cache
  await fetch('https://api.vercel.com/v1/purge', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.VERCEL_TOKEN}`
    },
    body: JSON.stringify({
      urls: [`/api/features/${featureName}`]
    })
  })
}
```

## Manual Rollback Runbook

```markdown
# Emergency Rollback Procedure

## 1. Identify Issue (< 2 minutes)
- Check Sentry for critical errors
- Review Vercel Functions logs
- Check Supabase logs
- Monitor user reports in #incidents channel

## 2. Initiate Rollback (< 1 minute)
- Go to GitHub Actions
- Run "Emergency Rollback" workflow
- Select deployment ID from Vercel dashboard
- Choose environment (production/staging)

## 3. Verify Rollback (< 3 minutes)
- Check /api/health endpoint
- Verify critical user flows:
  - Supplier signup
  - Form submission
  - Payment processing
- Monitor error rates in Sentry

## 4. Communicate (< 5 minutes)
- Post in #incidents Slack channel
- Update status page
- Email affected users if necessary

## 5. Post-Mortem
- Document root cause
- Update rollback procedures
- Add regression tests
```

## State Recovery Script

```bash
#!/bin/bash
# scripts/recover-state.sh

# Backup current state
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Get last known good deployment
LAST_GOOD=$(vercel list --prod --limit 10 | grep '✓' | head -1 | awk '{print $1}')

# Rollback Vercel
vercel alias set $LAST_GOOD production.wedsync.com

# Restore database if needed
if [ "$1" == "--with-db" ]; then
  psql $DATABASE_URL < backups/last_known_good.sql
fi

# Clear all caches
redis-cli FLUSHALL

# Restart edge functions
vercel env pull
vercel dev --prod
```

## Critical Implementation Notes

- Always backup database before any rollback operation
- Keep last 10 deployments available for instant rollback
- Test rollback procedures weekly in staging environment
- Monitor for 30 minutes after any rollback
- Document every rollback incident for pattern analysis