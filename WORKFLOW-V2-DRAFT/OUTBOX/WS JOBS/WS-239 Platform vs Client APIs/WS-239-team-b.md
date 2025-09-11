# TEAM B - ROUND 1: WS-239 - Platform vs Client APIs Implementation
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build secure backend architecture managing dual AI systems - platform-provided AI features (WedSync's OpenAI keys) vs client-managed AI features (suppliers' own API keys)
**FEATURE ID:** WS-239 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about secure API key management, cost allocation, and transparent usage tracking for wedding suppliers

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/ai-features/
ls -la $WS_ROOT/wedsync/src/lib/ai/dual-system/
cat $WS_ROOT/wedsync/src/lib/ai/dual-system/AIFeatureRouter.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test api/ai-features
# MUST show: "All tests passing"
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__search_for_pattern("api.*route|ai.*service|subscription.*billing");
await mcp__serena__find_symbol("OpenAIService", "", true);
```

### B. API SECURITY & AI SERVICE PATTERNS (MANDATORY)
```typescript
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/middleware/withSecureValidation.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/ai/openai-client.ts");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Dual AI system needs: 1) Platform AI router (WedSync keys) with usage limits per tier, 2) Client AI router (supplier keys) with cost tracking, 3) Transparent cost allocation and billing, 4) Migration system from platform to client features, 5) Failure handling when one system is down. Challenge: Maintaining consistent API interface while routing to different AI providers based on supplier configuration.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **API key encryption** - Client API keys encrypted at rest and in transit
- [ ] **Key rotation support** - Enable suppliers to rotate their API keys
- [ ] **Usage validation** - Prevent API key abuse and unauthorized access
- [ ] **Cost tracking security** - Encrypted cost data with supplier isolation
- [ ] **Audit logging** - Log all AI service usage with user context
- [ ] **Rate limiting** - Different limits for platform vs client features
- [ ] **Failover security** - Secure fallback when AI services fail

## 🎯 TEAM B SPECIALIZATION - BACKEND/API FOCUS:

### Core Backend Architecture Components:

**1. AI Feature Router System:**
```typescript
interface AIFeatureRouter {
  routeAIRequest(
    supplierId: string,
    featureType: AIFeatureType,
    request: AIRequest
  ): Promise<AIResponse>;
  
  validateFeatureAccess(
    supplierId: string,
    featureType: AIFeatureType
  ): Promise<AccessValidationResult>;
  
  trackUsageAndCost(
    supplierId: string,
    usage: AIUsageEvent
  ): Promise<void>;
}
```

**2. Dual System Management:**
```typescript
interface DualAIManager {
  // Platform AI (WedSync's keys)
  executePlatformAI(request: PlatformAIRequest): Promise<AIResponse>;
  checkPlatformLimits(supplierId: string): Promise<UsageLimits>;
  
  // Client AI (Supplier's keys) 
  executeClientAI(request: ClientAIRequest): Promise<AIResponse>;
  validateClientAPIKey(apiKey: string): Promise<ValidationResult>;
  estimateClientCost(request: AIRequest): Promise<CostEstimate>;
}
```

**3. Cost Tracking and Billing:**
```typescript
interface AIBillingService {
  trackPlatformUsage(supplierId: string, usage: PlatformUsage): Promise<void>;
  trackClientCost(supplierId: string, cost: ClientCostEvent): Promise<void>;
  generateUsageReport(supplierId: string, period: TimePeriod): Promise<UsageReport>;
  processMonthlyBilling(supplierId: string): Promise<BillingResult>;
}
```

## 📋 SPECIFIC DELIVERABLES FOR ROUND 1

### API Endpoints to Build:
- [ ] `POST /api/ai-features/execute` - Route AI requests to platform or client systems
- [ ] `GET /api/ai-features/config` - Get supplier's AI feature configuration
- [ ] `PUT /api/ai-features/config` - Update AI feature settings and API keys
- [ ] `GET /api/ai-features/usage` - Real-time usage and cost tracking
- [ ] `POST /api/ai-features/migrate` - Migrate from platform to client features
- [ ] `GET /api/ai-features/limits` - Current usage limits and remaining quota
- [ ] `POST /api/ai-features/test-key` - Validate client API key before saving
- [ ] `GET /api/ai-features/billing` - Cost breakdown and billing information

### Database Schema Implementation:
```sql
-- AI feature configuration per supplier
CREATE TABLE ai_feature_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  
  -- Platform features configuration  
  platform_features_enabled BOOLEAN DEFAULT TRUE,
  platform_usage_tier tier_enum NOT NULL,
  platform_monthly_limits JSONB DEFAULT '{}'::JSONB,
  
  -- Client API configuration
  client_api_enabled BOOLEAN DEFAULT FALSE,
  client_api_provider api_provider_enum,
  client_api_key_encrypted TEXT, -- Encrypted API key
  client_monthly_budget_pounds DECIMAL(10,2),
  client_auto_disable_at_limit BOOLEAN DEFAULT TRUE,
  
  -- Migration settings
  migration_status migration_status_enum DEFAULT 'platform_only',
  migration_date TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id)
);

-- Real-time usage tracking
CREATE TABLE ai_usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  feature_type ai_feature_enum NOT NULL,
  provider_type provider_type_enum NOT NULL, -- 'platform' or 'client'
  
  -- Request details
  request_type VARCHAR(50) NOT NULL,
  tokens_input INTEGER DEFAULT 0,
  tokens_output INTEGER DEFAULT 0,
  model_used VARCHAR(50),
  
  -- Cost tracking
  cost_pounds DECIMAL(8,4) DEFAULT 0.0000,
  billing_period DATE NOT NULL,
  
  -- Performance metrics
  response_time_ms INTEGER,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_supplier_billing (supplier_id, billing_period),
  INDEX idx_feature_type (feature_type, created_at)
);

-- Monthly billing summaries
CREATE TABLE ai_billing_summary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID REFERENCES users(id) NOT NULL,
  billing_period DATE NOT NULL,
  
  -- Platform usage
  platform_requests INTEGER DEFAULT 0,
  platform_tokens_used INTEGER DEFAULT 0,
  platform_overage_cost DECIMAL(8,2) DEFAULT 0.00,
  
  -- Client usage
  client_requests INTEGER DEFAULT 0,
  client_cost_pounds DECIMAL(10,2) DEFAULT 0.00,
  client_savings_vs_platform DECIMAL(10,2) DEFAULT 0.00,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, billing_period)
);
```

### Backend Logic Requirements:
- [ ] **Smart AI Routing Logic:**
  - Check supplier's AI configuration (platform vs client)
  - Route requests to appropriate AI service
  - Handle failover between platform and client systems
  - Apply usage limits and cost controls

- [ ] **Secure API Key Management:**
  - Encrypt client API keys using industry-standard encryption
  - Support API key rotation with zero downtime
  - Validate API keys before storing
  - Never log or expose API keys in plain text

- [ ] **Real-time Cost Tracking:**
  - Track token usage and costs per request
  - Calculate real-time spending against budgets
  - Generate alerts at configurable thresholds
  - Support different billing periods and cycles

## 💾 WHERE TO SAVE YOUR WORK
- API Routes: $WS_ROOT/wedsync/src/app/api/ai-features/
- AI Services: $WS_ROOT/wedsync/src/lib/ai/dual-system/
- Billing Logic: $WS_ROOT/wedsync/src/lib/billing/ai-features/
- Database Migration: $WS_ROOT/wedsync/supabase/migrations/
- Tests: $WS_ROOT/wedsync/tests/api/ai-features/

## 🏁 COMPLETION CHECKLIST
- [ ] All API endpoints created and verified to exist
- [ ] TypeScript compilation successful with no errors
- [ ] All API tests passing (>90% coverage)
- [ ] Security requirements implemented (encryption, validation, audit)
- [ ] Database migration created and tested
- [ ] AI routing system operational with failover
- [ ] Cost tracking and billing systems functional
- [ ] Wedding industry context properly implemented
- [ ] Evidence package prepared with API test results

## 🌟 WEDDING SUPPLIER BACKEND SUCCESS SCENARIOS

**Scenario 1**: Photography studio has Professional tier (1,000 photo tags/month). API routes photo tagging request to platform AI, tracks usage (800/1000), and suggests client upgrade when approaching limit.

**Scenario 2**: Venue coordinator adds their OpenAI API key. Backend validates key, encrypts for storage, migrates their description generation from platform to client system, and begins tracking their direct costs.

**Scenario 3**: Catering business exceeds platform limits during peak season. API automatically routes additional requests to their client system, tracks costs separately, and provides transparent billing breakdown.

---

**EXECUTE IMMEDIATELY - Comprehensive backend architecture for dual AI system management with wedding industry cost optimization!**