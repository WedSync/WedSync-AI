# TEAM B - ROUND 1: WS-201 - Webhook Endpoints
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Implement comprehensive webhook delivery system with secure HMAC signing, exponential backoff retry logic, and robust queue management for wedding industry integrations
**FEATURE ID:** WS-201 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating reliable webhook infrastructure that handles 200+ daily notifications during peak wedding season

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/webhooks/webhook-manager.ts
ls -la $WS_ROOT/wedsync/src/lib/webhooks/webhook-security.ts
ls -la $WS_ROOT/wedsync/src/lib/webhooks/delivery-queue.ts
ls -la $WS_ROOT/wedsync/src/lib/webhooks/retry-handler.ts
cat $WS_ROOT/wedsync/src/lib/webhooks/webhook-manager.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test webhook-system
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query webhook and queue systems
await mcp__serena__search_for_pattern("webhook.*delivery");
await mcp__serena__find_symbol("QueueManager", "", true);
await mcp__serena__get_symbols_overview("src/lib/webhooks");
await mcp__serena__search_for_pattern("crypto.*hmac");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to webhook implementation
await mcp__Ref__ref_search_documentation("Node.js webhook delivery HMAC signatures");
await mcp__Ref__ref_search_documentation("exponential backoff retry patterns");
await mcp__Ref__ref_search_documentation("Supabase Edge Functions webhook queue");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Webhook Architecture
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Webhook system needs comprehensive architecture: secure payload delivery with HMAC-SHA256 signatures, exponential backoff retry logic (1,2,4,8,16 minutes), dead letter queue for permanent failures, real-time analytics tracking, and wedding industry event handling. I need to analyze: 1) Secure webhook delivery with signature validation, 2) Retry queue management with exponential backoff, 3) Dead letter queue for failed deliveries, 4) Performance optimization for high-volume delivery, 5) Integration with Supabase Edge Functions for scalability.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down webhook system components
2. **database-mcp-specialist** - Handle webhook database schema and operations
3. **security-compliance-officer** - Ensure webhook security and signature validation
4. **code-quality-guardian** - Maintain webhook reliability standards
5. **test-automation-architect** - Comprehensive webhook testing with mock endpoints
6. **documentation-chronicler** - Evidence-based webhook documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### WEBHOOK SECURITY CHECKLIST:
- [ ] **HMAC-SHA256 signature validation** - All webhook payloads signed with secret keys
- [ ] **Timestamp validation** - 5-minute window for replay attack prevention
- [ ] **HTTPS enforcement** - All webhook URLs must use HTTPS
- [ ] **Rate limiting per endpoint** - Prevent webhook spam and abuse
- [ ] **Secure secret generation** - Cryptographically secure webhook secrets
- [ ] **Input validation** - All webhook configuration inputs validated with Zod
- [ ] **Audit logging** - All webhook activities logged with supplier context
- [ ] **Error sanitization** - Never expose system internals in webhook responses

### REQUIRED SECURITY IMPORTS:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '$WS_ROOT/wedsync/src/lib/auth/options';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import crypto from 'crypto';
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API RESPONSIBILITIES:**
- Secure webhook delivery system with HMAC validation
- Database operations for webhook tracking and analytics
- withSecureValidation middleware for all webhook endpoints
- Authentication and rate limiting for webhook management
- Comprehensive error handling and retry logic
- Business logic for wedding industry event processing

### SPECIFIC DELIVERABLES FOR WS-201:

1. **Webhook Manager System:**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/webhooks/webhook-manager.ts
export class WedSyncWebhookManager {
  // Core webhook functionality
  async triggerWebhook(event: WebhookEventData): Promise<WebhookTriggerResult>;
  async deliverWebhook(deliveryId: string): Promise<WebhookDeliveryResult>;
  async scheduleWebhookDelivery(payload: WebhookPayload, endpoint: WebhookEndpoint): Promise<void>;
  
  // Wedding industry events
  async triggerClientCreatedWebhook(clientData: any, supplierId: string): Promise<void>;
  async triggerFormSubmittedWebhook(formData: any, responseData: any, supplierId: string): Promise<void>;
  async triggerJourneyCompletedWebhook(journeyData: any, supplierId: string): Promise<void>;
  async triggerWeddingDateChangedWebhook(weddingData: any, supplierId: string): Promise<void>;
  
  // Security and validation
  async verifyWebhookSignature(payload: string, signature: string, secretKey: string): Promise<boolean>;
  private generateWebhookSignature(payload: string, secretKey: string): string;
  private validateWebhookURL(url: string): boolean;
}
```

2. **Database Schema Implementation:**
```typescript
// Create comprehensive database schema for webhook system
// Location: $WS_ROOT/wedsync/supabase/migrations/[timestamp]_webhook_system.sql

// Tables to implement:
// - webhook_endpoints: Endpoint registration and configuration
// - webhook_event_types: Available event definitions
// - webhook_deliveries: Delivery tracking and analytics
// - webhook_analytics: Usage metrics and performance data
// - webhook_dead_letter_queue: Permanently failed deliveries
// - webhook_security_events: Security incident tracking
```

3. **API Endpoints Implementation:**
```typescript
// Location: $WS_ROOT/wedsync/src/app/api/webhooks/endpoints/route.ts
export const POST = withSecureValidation(
  z.object({
    url: z.string().url().startsWith('https://'),
    events: z.array(z.string()),
    description: z.string().optional(),
    integrationType: z.enum(['crm_integration', 'email_automation', 'booking_system', 'other']),
    businessCritical: z.boolean().optional()
  }),
  async (request, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    
    // Create webhook endpoint with generated secret
    const secretKey = crypto.randomBytes(32).toString('hex');
    // Implementation continues...
  }
);

// Location: $WS_ROOT/wedsync/src/app/api/webhooks/deliver/route.ts  
export const POST = withSecureValidation(
  z.object({
    deliveryId: z.string().uuid()
  }),
  async (request, validatedData) => {
    // Manual webhook delivery trigger
    await webhookManager.deliverWebhook(validatedData.deliveryId);
  }
);
```

4. **Retry and Queue Management:**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/webhooks/retry-handler.ts
export class WebhookRetryHandler {
  async scheduleRetry(deliveryId: string, attemptNumber: number): Promise<void>;
  async processRetryQueue(): Promise<void>;
  private calculateRetryDelay(attemptNumber: number): number; // Exponential backoff
  async markPermanentlyFailed(deliveryId: string, reason: string): Promise<void>;
  async addToDeadLetterQueue(failedDelivery: FailedWebhookDelivery): Promise<void>;
}

// Location: $WS_ROOT/wedsync/src/lib/webhooks/delivery-queue.ts
export class WebhookDeliveryQueue {
  async enqueueDelivery(webhookDelivery: WebhookDelivery): Promise<void>;
  async processQueue(batchSize: number = 10): Promise<ProcessingResults>;
  async getQueueStatus(): Promise<QueueStatus>;
  async prioritizeBusinessCriticalDeliveries(): Promise<void>;
}
```

5. **Edge Function Implementation:**
```typescript
// Location: $WS_ROOT/wedsync/supabase/functions/webhook-delivery/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    // Process webhook delivery queue
    const webhookManager = new WebhookDeliveryProcessor(supabase);
    await webhookManager.processDeliveryQueue();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
```

## 📋 TECHNICAL SPECIFICATION FROM WS-201

**Database Schema Requirements:**
```sql
-- Core webhook tables from specification:
CREATE TABLE webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_url TEXT NOT NULL,
  secret_key TEXT NOT NULL,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  subscribed_events TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  -- Additional fields for configuration and analytics
);

CREATE TABLE webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID UNIQUE NOT NULL,
  webhook_endpoint_id UUID NOT NULL REFERENCES webhook_endpoints(id),
  payload JSONB NOT NULL,
  signature TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'failed', 'permanently_failed', 'retrying')),
  -- Additional fields for retry logic and analytics
);
```

**Performance Requirements:**
- Webhook delivery processing within 30 seconds
- Support for 200+ daily notifications during peak wedding season
- 99.9% delivery reliability with retry mechanisms
- Sub-100ms signature generation and validation

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Backend Implementation:
- [ ] WedSyncWebhookManager with complete event handling
- [ ] Database schema migration for webhook system
- [ ] API endpoints for webhook management (CRUD operations)
- [ ] HMAC-SHA256 signature generation and validation
- [ ] Exponential backoff retry logic (1, 2, 4, 8, 16 minutes)
- [ ] Dead letter queue for permanently failed deliveries

### Wedding Industry Integration:
- [ ] Event types for client lifecycle (created, updated, invited)
- [ ] Form submission webhook triggers
- [ ] Journey completion notifications
- [ ] Wedding date change alerts
- [ ] Supplier business event handling
- [ ] Integration with photography CRM workflows

### Security & Reliability:
- [ ] HTTPS URL validation and enforcement
- [ ] Webhook secret generation and rotation
- [ ] Rate limiting per endpoint and supplier
- [ ] Audit logging for all webhook activities
- [ ] Input validation with comprehensive Zod schemas
- [ ] Error handling without information leakage

### Performance Optimization:
- [ ] Queue-based delivery for high throughput
- [ ] Edge Function integration for scalability
- [ ] Connection pooling for external HTTP requests
- [ ] Batch processing for multiple deliveries
- [ ] Performance monitoring and metrics collection

## 💾 WHERE TO SAVE YOUR WORK
- Core Logic: $WS_ROOT/wedsync/src/lib/webhooks/
- API Routes: $WS_ROOT/wedsync/src/app/api/webhooks/
- Database: $WS_ROOT/wedsync/supabase/migrations/
- Edge Functions: $WS_ROOT/wedsync/supabase/functions/
- Types: $WS_ROOT/wedsync/src/types/webhooks.ts
- Tests: $WS_ROOT/wedsync/__tests__/webhooks/
- Reports: $WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-201-team-b-round-1-complete.md

## 🏁 COMPLETION CHECKLIST
- [ ] WedSyncWebhookManager implemented with all core functionality
- [ ] Database schema migration created and applied
- [ ] API endpoints secure and fully validated
- [ ] HMAC signature system implemented and tested
- [ ] Retry logic with exponential backoff functional
- [ ] Dead letter queue management system active
- [ ] Wedding industry event triggers implemented
- [ ] Edge Function for scalable delivery deployed
- [ ] Security validation across all endpoints
- [ ] Performance requirements met (<30s delivery, 99.9% reliability)
- [ ] TypeScript compilation successful
- [ ] All webhook tests passing
- [ ] Evidence package prepared with delivery testing results
- [ ] Senior dev review prompt created

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for webhook delivery system implementation!**