# TEAM C - ROUND 1: WS-206 - AI Email Templates System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build the complete integration layer connecting OpenAI API, email services, and template performance tracking for AI-generated wedding vendor emails
**FEATURE ID:** WS-206 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about AI service reliability, email delivery integration, and performance analytics workflows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/openai-service.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/email-template-performance.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ai/merge-tag-processor.ts
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/openai-service.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **INTEGRATION TEST RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm test -- --testPathPattern=integration
# MUST show: "All integration tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query specific areas relevant to integrations
await mcp__serena__search_for_pattern("email-service");
await mcp__serena__find_symbol("integration", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
await mcp__serena__get_symbols_overview("src/lib/email");
```

### B. INTEGRATION ARCHITECTURE PATTERNS (MANDATORY)
```typescript
// Load existing integration patterns
await mcp__serena__read_file("src/lib/email/email-service.ts");
await mcp__serena__search_for_pattern("webhook");
await mcp__serena__search_for_pattern("third-party");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to this feature
await mcp__Ref__ref_search_documentation("OpenAI API error handling");
await mcp__Ref__ref_search_documentation("Email delivery webhooks");
await mcp__Ref__ref_search_documentation("Handlebars template processing");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequentialthinking({
  thought: "The AI email template integration system needs: 1) Robust OpenAI API wrapper with retry logic, 2) Template performance tracking via email webhooks, 3) Merge tag processing system, 4) Integration with existing email services, 5) Real-time analytics pipeline. I must ensure reliability, webhook security, and data consistency.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **integration-specialist** - Build OpenAI and email service integrations
2. **security-compliance-officer** - Secure webhook endpoints and API integrations
3. **code-quality-guardian** - Maintain integration reliability and error handling
4. **performance-optimization-expert** - Optimize API calls and data processing
5. **test-automation-architect** - Create integration and webhook tests
6. **documentation-chronicler** - Document integration architecture and flows

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **API key protection** - Environment variables only, never logged
- [ ] **Webhook signature verification** - Validate all incoming webhooks
- [ ] **Rate limiting on external APIs** - Prevent service abuse
- [ ] **Circuit breaker pattern** - Handle external service failures gracefully
- [ ] **Data sanitization** - Clean all external API responses
- [ ] **Audit trail** - Log all external service interactions
- [ ] **Timeout handling** - Prevent hanging requests
- [ ] **Retry logic with backoff** - Handle transient failures

## 🎯 TEAM C SPECIALIZATION:

**INTEGRATION FOCUS:**
- Third-party service integration
- Real-time data synchronization
- Webhook handling and processing
- Data flow between systems
- Integration health monitoring
- Failure handling and recovery

## 📋 TECHNICAL SPECIFICATION
**Real Wedding Scenario:**
When a photographer generates AI email templates, the system: 1) Calls OpenAI API with retry logic, 2) Processes wedding-specific merge tags, 3) Sends test emails for A/B testing, 4) Tracks open/click rates via webhooks, 5) Updates performance metrics, 6) Provides real-time analytics for template optimization.

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY INTEGRATION COMPONENTS (MUST BUILD):

#### 1. OpenAI Service Wrapper
**Location:** `src/lib/integrations/openai-service.ts`

**Features:**
- Robust OpenAI API client with retry logic
- Circuit breaker pattern for service failures
- Request/response logging and monitoring
- Token usage tracking and budgeting
- Wedding vendor-specific prompt templates
- Streaming response handling
- Error classification and handling

**Implementation Pattern:**
```typescript
export class OpenAIService {
  private client: OpenAI;
  private circuitBreaker: CircuitBreaker;
  private rateLimiter: RateLimiter;
  
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000
    });
    this.setupCircuitBreaker();
    this.setupRateLimiter();
  }
  
  async generateEmailTemplates(
    request: EmailGenerationRequest
  ): Promise<EmailTemplate[]> {
    return this.circuitBreaker.execute(async () => {
      await this.rateLimiter.acquire();
      return this.callOpenAI(request);
    });
  }
}
```

#### 2. Merge Tag Processor
**Location:** `src/lib/ai/merge-tag-processor.ts`

**Features:**
- Handlebars template compilation
- Wedding-specific merge tag library
- Client data mapping and transformation
- Conditional logic processing
- Fallback value handling
- Performance optimization for large datasets

**Wedding-Specific Merge Tags:**
```typescript
const WEDDING_MERGE_TAGS = {
  // Basic couple information
  '{{couple_names}}': (client) => `${client.partner1_name} & ${client.partner2_name}`,
  '{{wedding_date}}': (client) => formatWeddingDate(client.wedding_date),
  '{{venue_name}}': (client) => client.venue?.name || 'your venue',
  
  // Vendor-specific tags
  '{{photo_style}}': (client) => client.photography_style || 'classic',
  '{{guest_count}}': (client) => client.guest_count || 'your guests',
  '{{ceremony_time}}': (client) => formatTime(client.ceremony_time),
  
  // Dynamic content
  '{{days_until_wedding}}': (client) => calculateDaysUntil(client.wedding_date),
  '{{season_comment}}': (client) => getSeasonComment(client.wedding_date),
  '{{venue_specific_note}}': (client) => getVenueNote(client.venue)
};
```

#### 3. Email Template Performance Tracker
**Location:** `src/lib/integrations/email-template-performance.ts`

**Features:**
- Email delivery webhook processing
- Open rate tracking and analytics
- Click-through rate monitoring
- A/B test result compilation
- Performance metric calculations
- Real-time dashboard data updates

**Performance Metrics:**
- Template generation success rate
- Email delivery rate
- Open rate by template variant
- Click-through rate
- Response rate (when replies detected)
- Template effectiveness scoring

#### 4. Email Service Integration
**Location:** `src/lib/integrations/email-template-integration.ts`

**Features:**
- Integration with existing email service
- Template sending with tracking
- A/B test email distribution
- Webhook endpoint creation
- Performance data collection
- Error handling and retry logic

### WEBHOOK ENDPOINTS:
```typescript
// POST /api/webhooks/email/delivery
// Handle email delivery status updates
export async function POST(request: NextRequest) {
  const signature = request.headers.get('webhook-signature');
  const body = await request.text();
  
  // Verify webhook signature
  if (!verifyWebhookSignature(body, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  const event = JSON.parse(body);
  await processEmailEvent(event);
  
  return NextResponse.json({ success: true });
}
```

#### 5. Real-time Analytics Pipeline
**Location:** `src/lib/integrations/template-analytics-pipeline.ts`

**Features:**
- Event-driven analytics processing
- Real-time metric calculations
- Dashboard data updates
- Trend analysis and reporting
- Performance alerting system
- Data warehouse integration

### INTEGRATION REQUIREMENTS:
- [ ] OpenAI API integration with full error handling
- [ ] Email service integration for template testing
- [ ] Webhook processing for performance tracking
- [ ] Real-time analytics data pipeline
- [ ] Circuit breaker and retry logic implementation
- [ ] Comprehensive monitoring and alerting

### RELIABILITY REQUIREMENTS:
- [ ] 99.9% uptime for integration services
- [ ] <5 second response time for AI generation
- [ ] Automatic retry with exponential backoff
- [ ] Graceful degradation when services unavailable
- [ ] Health checks for all external dependencies

### MONITORING REQUIREMENTS:
- [ ] API call success/failure rates
- [ ] Response time metrics
- [ ] Token usage tracking
- [ ] Error rate monitoring
- [ ] Webhook delivery confirmation
- [ ] Performance dashboard updates

### TESTING REQUIREMENTS:
- [ ] Integration tests with mocked external services
- [ ] Webhook endpoint testing
- [ ] Error handling and retry logic tests
- [ ] Performance and load testing
- [ ] End-to-end workflow testing

## 💾 WHERE TO SAVE YOUR WORK
- Integrations: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/integrations/`
- AI Services: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/lib/ai/`
- Webhooks: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/webhooks/`
- Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/integrations/`
- Reports: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST
- [ ] OpenAI service wrapper implemented with reliability features
- [ ] Merge tag processor functional with wedding-specific tags
- [ ] Email template performance tracking system working
- [ ] Webhook endpoints created and secured
- [ ] Real-time analytics pipeline operational
- [ ] TypeScript compilation successful
- [ ] All integration tests passing (>90% coverage)
- [ ] Circuit breakers and retry logic implemented
- [ ] Monitoring and alerting configured
- [ ] Error handling comprehensive
- [ ] Evidence package with integration proofs prepared
- [ ] Senior dev review prompt created

## 🔧 IMPLEMENTATION PATTERNS:

### Circuit Breaker Pattern:
```typescript
class CircuitBreaker {
  private failureCount = 0;
  private lastFailTime: number | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
      } else {
        throw new CircuitOpenError('Service unavailable');
      }
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
}
```

### Webhook Security:
```typescript
function verifyWebhookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}
```

### Performance Tracking:
```typescript
async function trackTemplatePerformance(
  templateId: string,
  event: EmailEvent
): Promise<void> {
  const metrics = await getTemplateMetrics(templateId);
  
  switch (event.type) {
    case 'delivered':
      metrics.deliveryRate = calculateDeliveryRate(event);
      break;
    case 'opened':
      metrics.openRate = calculateOpenRate(event);
      break;
    case 'clicked':
      metrics.clickRate = calculateClickRate(event);
      break;
  }
  
  await updateTemplateMetrics(templateId, metrics);
  await broadcastMetricsUpdate(templateId, metrics);
}
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for building the complete AI email template integration system with OpenAI and email service connections!**