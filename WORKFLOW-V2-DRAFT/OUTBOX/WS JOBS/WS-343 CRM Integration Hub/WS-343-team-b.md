# TEAM B - ROUND 1: WS-343 - CRM Integration Hub Backend
## 2025-01-31 - Development Round 1

**YOUR MISSION:** Build the comprehensive CRM Integration API endpoints, database schema, sync job processing system, and secure authentication flows
**FEATURE ID:** WS-343 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about bulletproof data integrity and security for wedding suppliers' precious client data

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/crm/
cat $WS_ROOT/wedsync/src/services/CRMIntegrationService.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **API TEST RESULTS:**
```bash
npm test api/crm
# MUST show: "All API endpoints passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing API patterns and database structures
await mcp__serena__search_for_pattern("api.*route|.*Service.*class|supabase.*client");
await mcp__serena__find_symbol("ApiRoute", "", true);
await mcp__serena__get_symbols_overview("src/app/api/");
await mcp__serena__get_symbols_overview("src/services/");
```

### B. SUPABASE MCP INTEGRATION (CRITICAL)
```typescript
// Use Supabase MCP for database operations
mcp__supabase__list_tables();
mcp__supabase__generate_typescript_types();
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load Next.js API, Supabase, and CRM integration documentation
mcp__Ref__ref_search_documentation("Next.js 15 API routes authentication middleware security");
mcp__Ref__ref_search_documentation("Supabase database schema migrations TypeScript");
mcp__Ref__ref_search_documentation("CRM API integration OAuth2 webhook processing");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "The CRM Integration Hub backend needs to handle 9+ different CRM providers, each with different auth mechanisms (OAuth2, API keys, screen scraping), different rate limits, and different data formats. I need bulletproof error handling, secure credential storage, and a robust sync job processing system that can handle thousands of client records.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down API endpoints and database schema
2. **supabase-specialist** - Design secure database schema and migrations  
3. **security-compliance-officer** - Implement OAuth2 and credential encryption
4. **code-quality-guardian** - Ensure API security standards
5. **test-automation-architect** - Comprehensive API testing
6. **documentation-chronicler** - Document all CRM integration APIs

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **OAuth2 PKCE flow** - Enhanced security for CRM provider authentication
- [ ] **Credential encryption** - AES-256 encryption for stored API keys/tokens
- [ ] **Audit logging** - Log all integration operations with user context
- [ ] **Input sanitization** - Clean all CRM data before database insertion

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API REQUIREMENTS:**
- API endpoints with comprehensive security validation
- Database operations with row-level security
- withSecureValidation middleware on ALL routes
- Authentication and authorization checks
- Comprehensive error handling and logging
- Background job processing for sync operations

## 📋 DETAILED TECHNICAL SPECIFICATION

### Real Wedding Scenario Context
**Critical Data Protection:** Wedding suppliers trust us with their life's work - 3+ years of client data representing hundreds of thousands in revenue. ONE data loss incident destroys our reputation forever.

**Performance Requirements:** Import 500+ clients in <5 minutes, handle 10 concurrent sync jobs, process field mappings for 20+ custom fields per client.

### Database Schema Implementation

#### 1. CRM Integrations Table
```sql
-- Apply this migration via Supabase MCP
mcp__supabase__apply_migration("create_crm_integrations_schema", `
CREATE TABLE crm_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
    crm_provider TEXT NOT NULL CHECK (crm_provider IN (
        'tave', 'lightblue', 'honeybook', 'seventeen', 'shootq', 
        'pixieset', 'iris_works', 'dubsado', 'studio_ninja', 'custom'
    )),
    connection_name TEXT NOT NULL,
    connection_status TEXT NOT NULL CHECK (connection_status IN (
        'connected', 'disconnected', 'error', 'pending_auth', 'sync_in_progress'
    )) DEFAULT 'pending_auth',
    auth_config JSONB NOT NULL DEFAULT '{}', -- Encrypted OAuth tokens, API keys
    sync_config JSONB NOT NULL DEFAULT '{}', -- Sync preferences, field mappings
    last_sync_at TIMESTAMPTZ,
    last_sync_status TEXT CHECK (last_sync_status IN ('success', 'partial', 'failed')),
    sync_error_details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(supplier_id, crm_provider, connection_name)
);

-- Row Level Security
ALTER TABLE crm_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own integrations" ON crm_integrations
    FOR ALL USING (
        supplier_id IN (
            SELECT s.id FROM suppliers s 
            JOIN user_profiles up ON s.user_id = up.id 
            WHERE up.id = auth.uid()
        )
    );
`);
```

#### 2. CRM Sync Jobs Table
```sql
mcp__supabase__apply_migration("create_crm_sync_jobs", `
CREATE TABLE crm_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES crm_integrations(id) ON DELETE CASCADE,
    job_type TEXT NOT NULL CHECK (job_type IN (
        'full_import', 'incremental_sync', 'export_to_crm', 'field_mapping_update'
    )),
    job_status TEXT NOT NULL CHECK (job_status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled'
    )) DEFAULT 'pending',
    job_config JSONB NOT NULL DEFAULT '{}',
    progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
    records_processed INTEGER DEFAULT 0,
    records_total INTEGER,
    error_details JSONB,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_sync_jobs_integration_status ON crm_sync_jobs(integration_id, job_status);
CREATE INDEX idx_sync_jobs_pending ON crm_sync_jobs(created_at) WHERE job_status = 'pending';
`);
```

### Core API Endpoints Implementation

#### 1. GET /api/crm/providers - List CRM Providers
```typescript
// File: src/app/api/crm/providers/route.ts
import { withSecureValidation } from '@/lib/middleware/security';
import { z } from 'zod';

const GetProvidersSchema = z.object({});

export const GET = withSecureValidation(GetProvidersSchema, async (request, { user }) => {
  try {
    // Return static provider configuration
    const providers = [
      {
        id: 'tave',
        name: 'Tave',
        description: 'Professional photography studio management',
        logo_url: '/crm-logos/tave.png',
        auth_type: 'api_key',
        supported_features: ['clients', 'projects', 'invoices', 'events'],
        rate_limits: { requests_per_minute: 60, requests_per_hour: 1000 },
        popularity_rank: 1
      },
      {
        id: 'lightblue',
        name: 'Light Blue',
        description: 'Wedding photography business management',
        logo_url: '/crm-logos/lightblue.png',
        auth_type: 'basic_auth',
        supported_features: ['clients', 'projects'],
        rate_limits: { requests_per_minute: 30, requests_per_hour: 500 },
        popularity_rank: 2,
        requires_scraping: true
      },
      {
        id: 'honeybook',
        name: 'HoneyBook', 
        description: 'All-in-one business management platform',
        logo_url: '/crm-logos/honeybook.png',
        auth_type: 'oauth2',
        auth_url: 'https://api.honeybook.com/oauth/authorize',
        scopes: ['read:contacts', 'read:projects'],
        supported_features: ['clients', 'projects', 'invoices', 'contracts'],
        rate_limits: { requests_per_minute: 120, requests_per_hour: 2000 },
        popularity_rank: 3
      }
      // Additional providers...
    ];

    return Response.json({ providers });
  } catch (error) {
    console.error('Failed to load CRM providers:', error);
    return Response.json({ error: 'Failed to load providers' }, { status: 500 });
  }
});
```

#### 2. POST /api/crm/integrations - Create Integration
```typescript
// File: src/app/api/crm/integrations/route.ts
import { withSecureValidation } from '@/lib/middleware/security';
import { CRMIntegrationService } from '@/services/CRMIntegrationService';
import { z } from 'zod';

const CreateIntegrationSchema = z.object({
  crm_provider: z.enum(['tave', 'lightblue', 'honeybook', 'seventeen', 'shootq', 'pixieset', 'iris_works', 'dubsado', 'studio_ninja', 'custom']),
  connection_name: z.string().min(1).max(100),
  auth_config: z.record(z.any()),
  sync_config: z.object({
    auto_sync_enabled: z.boolean(),
    sync_interval_minutes: z.number().min(15).max(1440),
    sync_direction: z.enum(['import_only', 'export_only', 'bidirectional']),
    import_historical_data: z.boolean(),
    conflict_resolution: z.enum(['wedsync_wins', 'crm_wins', 'newest_wins', 'manual_review'])
  })
});

export const POST = withSecureValidation(CreateIntegrationSchema, async (request, { user, validatedData }) => {
  const crmService = new CRMIntegrationService();
  
  try {
    // Get supplier ID from user
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!supplier) {
      return Response.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Check tier limits for integrations
    const tierLimits = {
      free: 0,
      starter: 1, 
      professional: 3,
      scale: 5,
      enterprise: 999
    };

    const currentTier = supplier.subscription_tier || 'free';
    const maxIntegrations = tierLimits[currentTier];

    // Count existing integrations
    const { count: existingCount } = await supabase
      .from('crm_integrations')
      .select('*', { count: 'exact', head: true })
      .eq('supplier_id', supplier.id);

    if (existingCount >= maxIntegrations) {
      return Response.json({ 
        error: 'Integration limit reached',
        details: `Your ${currentTier} plan allows ${maxIntegrations} integrations. Upgrade to add more.`
      }, { status: 402 });
    }

    // Create integration
    const integration = await crmService.createIntegration(
      supplier.id,
      validatedData.crm_provider,
      validatedData.connection_name,
      validatedData.auth_config,
      validatedData.sync_config
    );

    // Log audit trail
    await crmService.logAuditEvent(
      user.id,
      'integration_created',
      { integration_id: integration.id, provider: validatedData.crm_provider }
    );

    // For OAuth providers, return authorization URL
    let authUrl = null;
    if (validatedData.crm_provider === 'honeybook') {
      authUrl = await crmService.generateOAuthUrl(integration.id, validatedData.crm_provider);
    }

    return Response.json({ 
      integration,
      auth_url: authUrl
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create CRM integration:', error);
    return Response.json({ 
      error: 'Failed to create integration',
      details: error.message 
    }, { status: 500 });
  }
});
```

#### 3. POST /api/crm/integrations/[id]/sync - Trigger Sync
```typescript
// File: src/app/api/crm/integrations/[id]/sync/route.ts
import { withSecureValidation } from '@/lib/middleware/security';
import { CRMSyncJobProcessor } from '@/services/CRMSyncJobProcessor';
import { z } from 'zod';

const TriggerSyncSchema = z.object({
  job_type: z.enum(['full_import', 'incremental_sync', 'export_to_crm']),
  job_config: z.record(z.any()).optional()
});

export const POST = withSecureValidation(TriggerSyncSchema, async (request, { user, validatedData, params }) => {
  const integrationId = params.id;
  const syncProcessor = new CRMSyncJobProcessor();
  
  try {
    // Verify integration ownership
    const { data: integration, error } = await supabase
      .from('crm_integrations') 
      .select(`
        *,
        suppliers!inner (
          user_id
        )
      `)
      .eq('id', integrationId)
      .eq('suppliers.user_id', user.id)
      .single();

    if (error || !integration) {
      return Response.json({ error: 'Integration not found' }, { status: 404 });
    }

    // Check if integration is connected
    if (integration.connection_status !== 'connected') {
      return Response.json({ 
        error: 'Integration not connected',
        details: 'Please complete the authentication setup first'
      }, { status: 400 });
    }

    // Check for existing running jobs
    const { data: runningJobs } = await supabase
      .from('crm_sync_jobs')
      .select('id')
      .eq('integration_id', integrationId)
      .eq('job_status', 'running');

    if (runningJobs?.length > 0) {
      return Response.json({ 
        error: 'Sync already in progress',
        details: 'Please wait for the current sync to complete'
      }, { status: 409 });
    }

    // Create sync job
    const { data: syncJob, error: jobError } = await supabase
      .from('crm_sync_jobs')
      .insert({
        integration_id: integrationId,
        job_type: validatedData.job_type,
        job_config: validatedData.job_config || {}
      })
      .select()
      .single();

    if (jobError) {
      throw jobError;
    }

    // Queue job for background processing
    await syncProcessor.queueSyncJob(syncJob);

    // Log audit trail
    await syncProcessor.logAuditEvent(
      user.id,
      'sync_triggered',
      { 
        integration_id: integrationId,
        job_id: syncJob.id,
        job_type: validatedData.job_type
      }
    );

    return Response.json({ sync_job: syncJob }, { status: 201 });

  } catch (error) {
    console.error('Failed to trigger sync:', error);
    return Response.json({ 
      error: 'Failed to trigger sync',
      details: error.message 
    }, { status: 500 });
  }
});
```

### CRM Integration Service Implementation

#### Core Service Class
```typescript
// File: src/services/CRMIntegrationService.ts
import { createClient } from '@supabase/supabase-js';
import { encrypt, decrypt } from '@/lib/crypto';
import type { CRMIntegration, CRMProvider } from '@/types/crm';

export class CRMIntegrationService {
  private supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  async createIntegration(
    supplierId: string,
    crmProvider: string,
    connectionName: string,
    authConfig: Record<string, any>,
    syncConfig: any
  ): Promise<CRMIntegration> {
    // Encrypt sensitive auth data
    const encryptedAuthConfig = this.encryptAuthConfig(authConfig);

    const { data, error } = await this.supabase
      .from('crm_integrations')
      .insert({
        supplier_id: supplierId,
        crm_provider: crmProvider,
        connection_name: connectionName,
        auth_config: encryptedAuthConfig,
        sync_config: syncConfig,
        connection_status: 'pending_auth'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create integration: ${error.message}`);
    }

    // Test connection immediately
    try {
      const isConnected = await this.testConnection(data.id);
      await this.updateConnectionStatus(
        data.id, 
        isConnected ? 'connected' : 'error'
      );
      
      if (isConnected) {
        // Set up default field mappings
        await this.createDefaultFieldMappings(data.id, crmProvider);
      }
    } catch (testError) {
      console.error('Connection test failed:', testError);
      await this.updateConnectionStatus(data.id, 'error', {
        message: 'Failed to establish connection',
        error: testError.message
      });
    }

    return data;
  }

  async testConnection(integrationId: string): Promise<boolean> {
    const integration = await this.getIntegration(integrationId);
    if (!integration) {
      throw new Error('Integration not found');
    }

    const provider = this.getCRMProvider(integration.crm_provider);
    const decryptedAuthConfig = this.decryptAuthConfig(integration.auth_config);
    
    try {
      return await provider.testConnection(decryptedAuthConfig);
    } catch (error) {
      console.error('Connection test failed:', error);
      return false;
    }
  }

  private encryptAuthConfig(authConfig: Record<string, any>): Record<string, any> {
    const encrypted = { ...authConfig };
    
    // Encrypt sensitive fields
    const sensitiveFields = ['api_key', 'access_token', 'refresh_token', 'password'];
    
    for (const field of sensitiveFields) {
      if (encrypted[field]) {
        encrypted[field] = encrypt(encrypted[field]);
      }
    }
    
    return encrypted;
  }

  private decryptAuthConfig(authConfig: Record<string, any>): Record<string, any> {
    const decrypted = { ...authConfig };
    
    // Decrypt sensitive fields
    const sensitiveFields = ['api_key', 'access_token', 'refresh_token', 'password'];
    
    for (const field of sensitiveFields) {
      if (decrypted[field]) {
        try {
          decrypted[field] = decrypt(decrypted[field]);
        } catch (error) {
          console.error(`Failed to decrypt ${field}:`, error);
        }
      }
    }
    
    return decrypted;
  }

  async logAuditEvent(
    userId: string,
    eventType: string,
    eventData: Record<string, any>
  ): Promise<void> {
    await this.supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        event_type: eventType,
        event_data: eventData,
        event_source: 'crm_integration'
      });
  }

  private getCRMProvider(providerName: string): CRMProviderInterface {
    switch (providerName) {
      case 'tave':
        return new TaveCRMProvider();
      case 'lightblue':
        return new LightBlueCRMProvider();
      case 'honeybook':
        return new HoneyBookCRMProvider();
      default:
        throw new Error(`Unsupported CRM provider: ${providerName}`);
    }
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Database Schema (PRIORITY 1)
- [ ] CRM integrations table with RLS policies
- [ ] CRM sync jobs table with background processing support
- [ ] CRM field mappings table for flexible mapping
- [ ] CRM sync logs table for detailed audit trail
- [ ] Indexes for performance optimization

### API Endpoints (PRIORITY 2)
- [ ] GET /api/crm/providers - List supported CRM systems
- [ ] POST /api/crm/integrations - Create new integration
- [ ] GET /api/crm/integrations - List user's integrations
- [ ] POST /api/crm/integrations/:id/sync - Trigger sync job
- [ ] GET /api/crm/integrations/:id/sync-jobs - List sync history

### Security Implementation (PRIORITY 3)
- [ ] OAuth2 PKCE flow for HoneyBook integration
- [ ] Credential encryption/decryption service
- [ ] Rate limiting middleware for CRM API calls
- [ ] Comprehensive input validation with Zod
- [ ] Audit logging for all operations

## 💾 WHERE TO SAVE YOUR WORK

**API Route Files:**
- `$WS_ROOT/wedsync/src/app/api/crm/providers/route.ts`
- `$WS_ROOT/wedsync/src/app/api/crm/integrations/route.ts`
- `$WS_ROOT/wedsync/src/app/api/crm/integrations/[id]/route.ts`
- `$WS_ROOT/wedsync/src/app/api/crm/integrations/[id]/sync/route.ts`

**Service Files:**
- `$WS_ROOT/wedsync/src/services/CRMIntegrationService.ts`
- `$WS_ROOT/wedsync/src/services/CRMSyncJobProcessor.ts`
- `$WS_ROOT/wedsync/src/services/crm-providers/TaveCRMProvider.ts`

**Database Migrations:**
- `$WS_ROOT/wedsync/supabase/migrations/YYYYMMDDHHMMSS_create_crm_schema.sql`

**Type Definitions:**
- `$WS_ROOT/wedsync/src/types/crm.ts`

## 🧪 TESTING REQUIREMENTS

### API Tests Required
```bash
# Test files to create:
$WS_ROOT/wedsync/src/app/api/crm/__tests__/providers.test.ts
$WS_ROOT/wedsync/src/app/api/crm/__tests__/integrations.test.ts
$WS_ROOT/wedsync/src/services/__tests__/CRMIntegrationService.test.ts
```

### Testing Scenarios
- [ ] Create integration with valid provider
- [ ] Reject integration creation without authentication
- [ ] Handle OAuth2 callback processing
- [ ] Test connection with encrypted credentials
- [ ] Trigger sync job with proper validation
- [ ] Handle rate limiting from CRM APIs

## 🏁 COMPLETION CHECKLIST

### Database Implementation
- [ ] All tables created with proper constraints
- [ ] Row Level Security policies implemented
- [ ] Performance indexes added
- [ ] Migration files created and tested
- [ ] TypeScript types generated from schema

### API Security
- [ ] withSecureValidation on ALL endpoints
- [ ] OAuth2 PKCE flow implemented
- [ ] Credential encryption working
- [ ] Rate limiting configured
- [ ] Comprehensive error handling

### CRM Provider Support
- [ ] Tave API integration functional
- [ ] Light Blue screen scraping framework
- [ ] HoneyBook OAuth2 flow complete
- [ ] Default field mappings configured
- [ ] Connection testing reliable

### Background Processing
- [ ] Sync job queuing system working
- [ ] Progress tracking implementation
- [ ] Error recovery mechanisms
- [ ] Audit logging comprehensive
- [ ] Performance monitoring enabled

---

**EXECUTE IMMEDIATELY - Build the bulletproof CRM integration backend that wedding suppliers can trust with their life's work!**