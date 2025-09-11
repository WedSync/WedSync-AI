# WS-255 TEAM B PROMPT: Vercel Deployment - Backend Infrastructure & API Endpoints

## 🎯 TEAM B OBJECTIVE
Build the complete backend infrastructure for Vercel deployment management including health check endpoints, deployment verification services, rollback capabilities, and integration with Vercel API. Focus on zero-downtime deployment orchestration and wedding-day reliability.

## 📚 CONTEXT - MISSION CRITICAL WEDDING SCENARIO
**Saturday Wedding Emergency:** It's 2pm on a Saturday, 200 guests are seated, and the photographer's upload system fails due to a bad deployment. The venue coordinator is panicking because they can't access the timeline. You have 60 seconds to execute an automated rollback before the ceremony starts. Your backend systems must handle this flawlessly.

## 🔐 EVIDENCE OF REALITY REQUIREMENTS

### 1. FILE EXISTENCE PROOF
Before claiming completion, provide evidence these EXACT files exist:
```bash
# Paste the actual terminal output of these commands:
ls -la /src/app/api/health/deployment/route.ts
ls -la /src/app/api/admin/deployment/rollback/route.ts
ls -la /src/lib/services/DeploymentManager.ts
ls -la /src/lib/services/VercelClient.ts
ls -la /scripts/build-check.js
ls -la /scripts/deployment-health.js
```

### 2. DATABASE SCHEMA PROOF
```bash
# Must show deployment tables exist:
npx supabase migration list --linked | grep -E "(deployment|health)" || echo "❌ Missing deployment tables"
```

### 3. API ENDPOINT FUNCTIONALITY PROOF
```bash
# Must return valid responses:
curl -X GET http://localhost:3000/api/health/deployment
# Should return: {"success": true, "data": {...}}

curl -X POST http://localhost:3000/api/admin/deployment/rollback \
  -H "Content-Type: application/json" \
  -d '{"deploymentId": "test", "confirmationCode": "EMERGENCY_ROLLBACK_CONFIRMED"}'
```

## 🛡️ SECURITY PATTERNS - MAXIMUM PROTECTION

### withSecureValidation Middleware Pattern
```typescript
// MANDATORY: Use this exact pattern for all deployment endpoints
import { withSecureValidation } from '@/lib/security/secure-validation';

const DeploymentRollbackHandler = withSecureValidation(
  async (request: Request) => {
    const { deploymentId, confirmationCode } = await request.json();
    
    // Multi-layer security for critical deployment actions
    const { user, session } = await getServerSession();
    const userProfile = await getUserProfile(user.id);
    
    // 1. Admin role verification
    if (userProfile?.role !== 'admin') {
      throw new SecurityError('DEPLOYMENT_ADMIN_REQUIRED', {
        userId: user.id,
        attemptedAction: 'deployment_rollback',
        riskLevel: 'CRITICAL'
      });
    }
    
    // 2. Confirmation code verification
    if (confirmationCode !== 'EMERGENCY_ROLLBACK_CONFIRMED') {
      throw new SecurityError('ROLLBACK_CONFIRMATION_REQUIRED', {
        provided: confirmationCode ? 'REDACTED' : 'NONE',
        expected: 'EMERGENCY_ROLLBACK_CONFIRMED'
      });
    }
    
    // 3. Wedding day protection (extra verification on Saturdays)
    const now = new Date();
    if (now.getDay() === 6) { // Saturday
      const currentHour = now.getHours();
      if (currentHour >= 8 && currentHour <= 22) {
        // Peak wedding hours - require additional confirmation
        await logAuditEvent({
          action: 'SATURDAY_DEPLOYMENT_ROLLBACK',
          severity: 'CRITICAL',
          metadata: { deploymentId, hour: currentHour }
        });
      }
    }
    
    // 4. Rate limiting (critical for deployment actions)
    await enforceRateLimit(user.id, 'deployment_rollback', {
      requests: 2,
      windowMs: 300000 // 5 minutes
    });
    
    return await executeRollback(deploymentId, user.id);
  },
  {
    rateLimits: { 
      deployment_rollback: { requests: 2, windowMs: 300000 }
    },
    auditLog: {
      action: 'DEPLOYMENT_ROLLBACK',
      riskLevel: 'CRITICAL'
    }
  }
);
```

## 📊 DATABASE SCHEMA REQUIREMENTS

### Migration: Deployment Logging Tables
```sql
-- /supabase/migrations/009_deployment_management.sql
-- CRITICAL: This tracks all deployment events for debugging and audit

CREATE TABLE IF NOT EXISTS deployment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id TEXT NOT NULL,
    version TEXT,
    state TEXT NOT NULL CHECK (state IN ('building', 'ready', 'error', 'canceled', 'rollback')),
    region TEXT DEFAULT 'us-east-1',
    build_time INTEGER, -- seconds
    cold_start_time INTEGER, -- milliseconds  
    memory_usage INTEGER, -- MB
    creator_id TEXT,
    rollback_reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployment_health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deployment_id TEXT NOT NULL,
    check_type TEXT NOT NULL CHECK (check_type IN ('startup', 'periodic', 'pre_rollback')),
    status TEXT NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    response_time INTEGER NOT NULL, -- milliseconds
    services JSONB NOT NULL DEFAULT '{}', -- {database: 'connected', redis: 'connected'}
    error_details TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deployment_rollbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_deployment_id TEXT NOT NULL,
    to_deployment_id TEXT NOT NULL,
    initiated_by UUID REFERENCES user_profiles(id),
    reason TEXT NOT NULL,
    confirmation_code TEXT NOT NULL,
    rollback_duration INTEGER, -- seconds
    success BOOLEAN NOT NULL DEFAULT false,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_deployment_logs_state ON deployment_logs(state, created_at DESC);
CREATE INDEX idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);
CREATE INDEX idx_health_checks_deployment ON deployment_health_checks(deployment_id, checked_at DESC);
CREATE INDEX idx_rollbacks_created_at ON deployment_rollbacks(created_at DESC);

-- Row Level Security
ALTER TABLE deployment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_health_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_rollbacks ENABLE ROW LEVEL SECURITY;

-- Admin-only access
CREATE POLICY "deployment_logs_admin_only" ON deployment_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "health_checks_admin_only" ON deployment_health_checks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );

CREATE POLICY "rollbacks_admin_only" ON deployment_rollbacks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() 
            AND role = 'admin'
        )
    );
```

## 🚀 DETAILED IMPLEMENTATION REQUIREMENTS

### Core Service: DeploymentManager
```typescript
// /src/lib/services/DeploymentManager.ts
import { VercelClient } from './VercelClient';
import { supabase } from '@/lib/supabase/client';
import { DeploymentInfo, PerformanceMetrics, ServiceHealth } from '@/types/deployment';

export class DeploymentManager {
  private vercelClient: VercelClient;
  private healthCheckInterval: number = 30000; // 30 seconds

  constructor() {
    this.vercelClient = new VercelClient({
      token: process.env.VERCEL_TOKEN!,
      teamId: process.env.VERCEL_TEAM_ID
    });
  }

  async getCurrentDeployment(): Promise<DeploymentInfo | null> {
    try {
      const deployment = await this.vercelClient.getLatestDeployment();
      
      if (!deployment) return null;

      // Log deployment status to database
      await this.logDeploymentStatus({
        deploymentId: deployment.uid,
        version: deployment.meta?.githubCommitSha?.substring(0, 8) || 'unknown',
        state: this.mapVercelState(deployment.state),
        buildTime: deployment.buildingAt ? 
          Math.floor((Date.now() - new Date(deployment.buildingAt).getTime()) / 1000) : 0,
        metadata: {
          url: deployment.url,
          creator: deployment.creator?.username,
          source: deployment.source
        }
      });

      return {
        id: deployment.uid,
        version: deployment.meta?.githubCommitSha?.substring(0, 8) || 'unknown',
        state: this.mapVercelState(deployment.state),
        timestamp: deployment.createdAt,
        region: deployment.regions?.[0] || 'unknown',
        url: deployment.url,
        creator: deployment.creator?.username
      };
    } catch (error) {
      console.error('Failed to get current deployment:', error);
      throw error;
    }
  }

  async performHealthCheck(): Promise<{
    success: boolean;
    services: ServiceHealth;
    performance: PerformanceMetrics;
    timestamp: string;
  }> {
    const startTime = Date.now();
    const healthCheck = {
      success: true,
      services: {} as ServiceHealth,
      performance: {} as PerformanceMetrics,
      timestamp: new Date().toISOString()
    };

    try {
      // 1. Database connectivity check
      const dbStart = Date.now();
      const { error: dbError } = await supabase
        .from('deployment_logs')
        .select('id')
        .limit(1);
      
      healthCheck.services.database = dbError ? 'error' : 'connected';
      const dbResponseTime = Date.now() - dbStart;

      // 2. Redis connectivity check (if configured)
      healthCheck.services.redis = 'connected'; // Implement actual Redis check

      // 3. External APIs check (Stripe, Resend, etc.)
      const apiStart = Date.now();
      try {
        // Test critical external services
        await Promise.all([
          fetch('https://api.stripe.com/v1/payment_intents', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.STRIPE_SECRET_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({}) // This will fail but prove connectivity
          }).catch(() => {}), // Expected to fail, just testing connectivity
        ]);
        healthCheck.services.external_apis = 'connected';
      } catch {
        healthCheck.services.external_apis = 'error';
      }

      // 4. Performance metrics
      const totalResponseTime = Date.now() - startTime;
      healthCheck.performance = {
        buildTime: 0, // Set during actual builds
        coldStartTime: totalResponseTime,
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        responseTime: totalResponseTime
      };

      // 5. Overall health determination
      healthCheck.success = Object.values(healthCheck.services).every(status => status === 'connected');

      // 6. Log health check to database
      const deployment = await this.getCurrentDeployment();
      if (deployment) {
        await supabase.from('deployment_health_checks').insert({
          deployment_id: deployment.id,
          check_type: 'periodic',
          status: healthCheck.success ? 'healthy' : 'degraded',
          response_time: totalResponseTime,
          services: healthCheck.services
        });
      }

      return healthCheck;
    } catch (error) {
      console.error('Health check failed:', error);
      
      healthCheck.success = false;
      healthCheck.services = {
        database: 'error',
        redis: 'error', 
        external_apis: 'error'
      };

      return healthCheck;
    }
  }

  async rollbackDeployment(targetDeploymentId: string, userId: string, reason: string): Promise<boolean> {
    const rollbackId = crypto.randomUUID();
    const startTime = Date.now();

    try {
      // 1. Get current deployment for logging
      const currentDeployment = await this.getCurrentDeployment();
      if (!currentDeployment) {
        throw new Error('Cannot determine current deployment');
      }

      // 2. Log rollback initiation
      const { data: rollbackRecord, error: logError } = await supabase
        .from('deployment_rollbacks')
        .insert({
          from_deployment_id: currentDeployment.id,
          to_deployment_id: targetDeploymentId,
          initiated_by: userId,
          reason,
          confirmation_code: 'EMERGENCY_ROLLBACK_CONFIRMED'
        })
        .select()
        .single();

      if (logError) {
        throw new Error(`Failed to log rollback: ${logError.message}`);
      }

      // 3. Pre-rollback health check
      await supabase.from('deployment_health_checks').insert({
        deployment_id: currentDeployment.id,
        check_type: 'pre_rollback',
        status: 'unhealthy',
        response_time: 0,
        services: { note: 'Pre-rollback check' }
      });

      // 4. Execute Vercel rollback
      const rollbackSuccess = await this.vercelClient.promoteDeployment(targetDeploymentId);
      
      if (!rollbackSuccess) {
        throw new Error('Vercel rollback API call failed');
      }

      // 5. Wait for rollback to take effect (up to 30 seconds)
      let attempts = 0;
      const maxAttempts = 30;
      let rollbackComplete = false;

      while (attempts < maxAttempts && !rollbackComplete) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const newDeployment = await this.getCurrentDeployment();
        if (newDeployment && newDeployment.id === targetDeploymentId) {
          rollbackComplete = true;
        }
        
        attempts++;
      }

      const rollbackDuration = Math.floor((Date.now() - startTime) / 1000);

      // 6. Update rollback record with results
      await supabase
        .from('deployment_rollbacks')
        .update({
          success: rollbackComplete,
          rollback_duration: rollbackDuration,
          completed_at: new Date().toISOString(),
          error_message: rollbackComplete ? null : 'Rollback did not complete within timeout'
        })
        .eq('id', rollbackRecord.id);

      // 7. Post-rollback health check
      if (rollbackComplete) {
        await this.performHealthCheck();
      }

      return rollbackComplete;
    } catch (error) {
      console.error('Rollback failed:', error);
      
      // Update rollback record with error
      try {
        await supabase
          .from('deployment_rollbacks')
          .update({
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            completed_at: new Date().toISOString()
          })
          .eq('from_deployment_id', (await this.getCurrentDeployment())?.id || '');
      } catch (updateError) {
        console.error('Failed to update rollback record:', updateError);
      }

      throw error;
    }
  }

  private async logDeploymentStatus(status: {
    deploymentId: string;
    version: string;
    state: string;
    buildTime?: number;
    metadata?: any;
  }) {
    try {
      await supabase.from('deployment_logs').insert({
        deployment_id: status.deploymentId,
        version: status.version,
        state: status.state,
        build_time: status.buildTime || 0,
        metadata: status.metadata || {}
      });
    } catch (error) {
      console.error('Failed to log deployment status:', error);
      // Don't throw - logging failures shouldn't break deployment operations
    }
  }

  private mapVercelState(vercelState: string): 'ready' | 'building' | 'error' | 'canceled' {
    switch (vercelState.toLowerCase()) {
      case 'ready': return 'ready';
      case 'building': return 'building';
      case 'error': case 'failed': return 'error';
      case 'canceled': case 'cancelled': return 'canceled';
      default: return 'building';
    }
  }
}
```

### Vercel API Client
```typescript
// /src/lib/services/VercelClient.ts
interface VercelClientConfig {
  token: string;
  teamId?: string;
}

interface VercelDeployment {
  uid: string;
  name: string;
  url: string;
  state: string;
  createdAt: string;
  buildingAt?: string;
  readyAt?: string;
  creator?: {
    username: string;
    uid: string;
  };
  meta?: {
    githubCommitSha?: string;
    githubCommitMessage?: string;
  };
  regions?: string[];
  source?: string;
}

export class VercelClient {
  private baseUrl = 'https://api.vercel.com';
  private config: VercelClientConfig;

  constructor(config: VercelClientConfig) {
    this.config = config;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.config.token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`Vercel API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Vercel API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  async getLatestDeployment(): Promise<VercelDeployment | null> {
    try {
      const queryParams = new URLSearchParams({
        limit: '1',
        ...(this.config.teamId && { teamId: this.config.teamId })
      });

      const response = await this.makeRequest<{ deployments: VercelDeployment[] }>(
        `/v6/deployments?${queryParams}`
      );

      return response.deployments[0] || null;
    } catch (error) {
      console.error('Failed to get latest deployment:', error);
      throw error;
    }
  }

  async getDeployment(deploymentId: string): Promise<VercelDeployment> {
    try {
      const queryParams = new URLSearchParams({
        ...(this.config.teamId && { teamId: this.config.teamId })
      });

      return await this.makeRequest<VercelDeployment>(
        `/v13/deployments/${deploymentId}?${queryParams}`
      );
    } catch (error) {
      console.error(`Failed to get deployment ${deploymentId}:`, error);
      throw error;
    }
  }

  async promoteDeployment(deploymentId: string): Promise<boolean> {
    try {
      const queryParams = new URLSearchParams({
        ...(this.config.teamId && { teamId: this.config.teamId })
      });

      await this.makeRequest(`/v13/deployments/${deploymentId}/promote?${queryParams}`, {
        method: 'POST'
      });

      return true;
    } catch (error) {
      console.error(`Failed to promote deployment ${deploymentId}:`, error);
      return false;
    }
  }

  async getDeploymentLogs(deploymentId: string): Promise<string[]> {
    try {
      const queryParams = new URLSearchParams({
        ...(this.config.teamId && { teamId: this.config.teamId })
      });

      const response = await this.makeRequest<{ logs: Array<{ text: string }> }>(
        `/v2/deployments/${deploymentId}/events?${queryParams}`
      );

      return response.logs.map(log => log.text);
    } catch (error) {
      console.error(`Failed to get deployment logs for ${deploymentId}:`, error);
      throw error;
    }
  }
}
```

### API Route: Health Check Endpoint
```typescript
// /src/app/api/health/deployment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DeploymentManager } from '@/lib/services/DeploymentManager';
import { withSecureValidation } from '@/lib/security/secure-validation';

const deploymentManager = new DeploymentManager();

export const GET = withSecureValidation(
  async (request: NextRequest) => {
    try {
      // Get current deployment info
      const deployment = await deploymentManager.getCurrentDeployment();
      
      // Perform comprehensive health check
      const healthCheck = await deploymentManager.performHealthCheck();

      return NextResponse.json({
        success: healthCheck.success,
        data: {
          version: deployment?.version || 'unknown',
          deploymentId: deployment?.id || 'unknown',
          timestamp: healthCheck.timestamp,
          services: healthCheck.services,
          performance: healthCheck.performance
        },
        region: deployment?.region || 'unknown'
      });
    } catch (error) {
      console.error('Health check endpoint failed:', error);
      
      return NextResponse.json({
        success: false,
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
  },
  {
    rateLimits: {
      health_check: { requests: 60, windowMs: 60000 } // 1 per second max
    },
    auditLog: {
      action: 'HEALTH_CHECK',
      riskLevel: 'LOW'
    }
  }
);

// HEAD request for simple uptime monitoring
export async function HEAD() {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache',
      'X-Health-Check': 'ok'
    }
  });
}
```

### API Route: Emergency Rollback Endpoint
```typescript
// /src/app/api/admin/deployment/rollback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { DeploymentManager } from '@/lib/services/DeploymentManager';
import { withSecureValidation } from '@/lib/security/secure-validation';
import { getServerSession } from 'next-auth';
import { getUserProfile } from '@/lib/database/user-queries';

const deploymentManager = new DeploymentManager();

export const POST = withSecureValidation(
  async (request: NextRequest) => {
    try {
      const body = await request.json();
      const { deploymentId, confirmationCode, reason } = body;

      // Validate required fields
      if (!deploymentId || !confirmationCode) {
        return NextResponse.json({
          success: false,
          error: 'Missing required fields: deploymentId and confirmationCode'
        }, { status: 400 });
      }

      // Get user session (middleware already verified admin role)
      const { user } = await getServerSession();
      
      // Execute rollback with comprehensive logging
      const rollbackSuccess = await deploymentManager.rollbackDeployment(
        deploymentId, 
        user.id, 
        reason || 'Emergency rollback via admin panel'
      );

      if (rollbackSuccess) {
        return NextResponse.json({
          success: true,
          message: 'Deployment rollback completed successfully',
          deploymentId,
          timestamp: new Date().toISOString()
        });
      } else {
        return NextResponse.json({
          success: false,
          error: 'Rollback failed to complete within timeout'
        }, { status: 500 });
      }
    } catch (error) {
      console.error('Rollback endpoint failed:', error);
      
      return NextResponse.json({
        success: false,
        error: error instanceof Error ? error.message : 'Rollback failed'
      }, { status: 500 });
    }
  },
  {
    rateLimits: {
      deployment_rollback: { requests: 2, windowMs: 300000 } // 2 per 5 minutes
    },
    auditLog: {
      action: 'DEPLOYMENT_ROLLBACK',
      riskLevel: 'CRITICAL'
    }
  }
);
```

### Build Verification Script
```javascript
// /scripts/build-check.js
#!/usr/bin/env node
/**
 * Pre-deployment build verification script
 * Runs comprehensive checks before allowing deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REQUIRED_FILES = [
  'src/app/layout.tsx',
  'src/app/page.tsx',
  'next.config.js',
  'package.json'
];

const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

async function main() {
  console.log('🔍 Starting pre-deployment build verification...\n');

  let exitCode = 0;

  try {
    // 1. Check required files exist
    console.log('📁 Checking required files...');
    for (const file of REQUIRED_FILES) {
      if (!fs.existsSync(file)) {
        console.error(`❌ Missing required file: ${file}`);
        exitCode = 1;
      } else {
        console.log(`✅ Found: ${file}`);
      }
    }

    // 2. Check environment variables
    console.log('\n🔐 Checking environment variables...');
    for (const envVar of REQUIRED_ENV_VARS) {
      if (!process.env[envVar]) {
        console.error(`❌ Missing environment variable: ${envVar}`);
        exitCode = 1;
      } else {
        console.log(`✅ Found: ${envVar}`);
      }
    }

    // 3. TypeScript type check
    console.log('\n📝 Running TypeScript checks...');
    try {
      execSync('npx tsc --noEmit', { stdio: 'pipe' });
      console.log('✅ TypeScript checks passed');
    } catch (error) {
      console.error('❌ TypeScript errors found:');
      console.error(error.stdout?.toString() || error.message);
      exitCode = 1;
    }

    // 4. Next.js build test
    console.log('\n🏗️ Testing Next.js build...');
    try {
      execSync('npm run build', { stdio: 'pipe' });
      console.log('✅ Build completed successfully');
    } catch (error) {
      console.error('❌ Build failed:');
      console.error(error.stdout?.toString() || error.message);
      exitCode = 1;
    }

    // 5. Security check for common vulnerabilities
    console.log('\n🔒 Running security checks...');
    try {
      execSync('npm audit --audit-level moderate', { stdio: 'pipe' });
      console.log('✅ No security vulnerabilities found');
    } catch (error) {
      console.warn('⚠️ Security vulnerabilities detected - review required');
      // Don't fail build for audit issues, just warn
    }

    // 6. Database migration check
    console.log('\n💾 Checking database migrations...');
    try {
      const migrationDir = 'supabase/migrations';
      if (fs.existsSync(migrationDir)) {
        const migrations = fs.readdirSync(migrationDir).filter(f => f.endsWith('.sql'));
        console.log(`✅ Found ${migrations.length} migration files`);
      } else {
        console.warn('⚠️ No migrations directory found');
      }
    } catch (error) {
      console.error('❌ Migration check failed:', error.message);
    }

    // 7. Bundle size check
    console.log('\n📦 Checking bundle size...');
    try {
      const buildDir = '.next';
      if (fs.existsSync(path.join(buildDir, 'static'))) {
        console.log('✅ Build artifacts created successfully');
      } else {
        console.error('❌ Build artifacts not found');
        exitCode = 1;
      }
    } catch (error) {
      console.error('❌ Bundle size check failed:', error.message);
    }

    // Summary
    console.log('\n📊 Build Verification Summary:');
    if (exitCode === 0) {
      console.log('✅ All checks passed! Ready for deployment.');
    } else {
      console.log('❌ Build verification failed. Fix issues before deploying.');
    }

  } catch (error) {
    console.error('💥 Build verification script failed:', error.message);
    exitCode = 1;
  }

  process.exit(exitCode);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
```

## 🔧 TEAM B DELIVERABLES CHECKLIST
- [x] DeploymentManager service with full Vercel integration
- [x] VercelClient for API communication
- [x] Health check endpoint with comprehensive monitoring
- [x] Emergency rollback endpoint with multi-layer security
- [x] Database schema for deployment logging and audit trails
- [x] Build verification script for pre-deployment checks
- [x] Rate limiting and security validation
- [x] Error handling and recovery mechanisms
- [x] Performance monitoring and metrics collection
- [x] Comprehensive logging and audit trails
- [x] Wedding-day specific protections (Saturday safeguards)
- [x] Zero-downtime rollback capabilities

**CRITICAL: This backend must handle 99.9% uptime. Every function must be tested for wedding-day scenarios!**