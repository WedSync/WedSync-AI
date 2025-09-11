# TEAM B - ROUND 1: WS-201 - Webhook Endpoints - Core Delivery System

**Date:** 2025-08-26  
**Feature ID:** WS-201 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Implement comprehensive webhook delivery system with secure event delivery, retry mechanisms, and monitoring for wedding industry integrations  
**Context:** You are Team B working in parallel with Teams A, C, D, E. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync platform integration specialist enabling real-time data synchronization with external systems
**I want to:** Implement comprehensive webhook endpoints with secure event delivery, retry mechanisms, and monitoring
**So that:** When couples submit consultation forms, photography suppliers' CRMs are instantly notified; when wedding dates change, venue booking systems receive immediate updates; and when clients complete journeys, email automation platforms trigger follow-up sequences, all while maintaining security, reliability, and audit trails for compliance with wedding industry data protection requirements

**Real Wedding Problem This Solves:**
A premium photography supplier integrates their custom CRM with WedSync to manage 50+ weddings per season. When couples submit photography consultation forms through WedSync, webhooks instantly notify their CRM system, triggering automated booking confirmations and calendar updates. During peak season, the webhook system delivers 200+ notifications daily while maintaining 99.9% reliability through exponential backoff retries.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Webhook endpoint registration and management system
- Secure HMAC-SHA256 payload signing and verification
- Exponential backoff retry logic with maximum 5 attempts
- Dead letter queue for permanently failed deliveries
- Wedding industry specific event types and payload schemas

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Queue: Supabase Edge Functions for webhook delivery processing
- Security: HMAC signing, timestamp validation, rate limiting

**Integration Points:**
- API Routes: Webhook management endpoints for registration and monitoring
- Event System: Integration with form submissions, client updates, journey completions
- Database: Webhook configuration, delivery tracking, analytics storage

---


## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---
## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "supabase edge-functions latest documentation"});
await mcp__Ref__ref_search_documentation({query: "crypto hmac-signatures latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next api-routes-validation latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("webhookManager", "", true);
await mcp__serena__get_symbols_overview("src/lib/webhooks");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Webhook delivery system implementation"
2. **database-mcp-specialist** --think-hard --use-loaded-docs "Webhook tracking schema"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "Webhook API endpoints"  
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Focus on wedding industry webhook events."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing webhook patterns in codebase
- Understand current event system architecture  
- Check integration points with form system and client management
- Review similar webhook implementations for reference

### **PLAN PHASE (THINK HARD!)**
- Design wedding industry webhook event schema
- Plan HMAC signature generation and verification
- Write test cases FIRST (TDD approach)
- Plan exponential backoff retry algorithm
- Design dead letter queue processing

### **CODE PHASE (PARALLEL AGENTS!)**
- Create database schema for webhook management
- Implement core webhook delivery system
- Build HMAC signature validation
- Add retry logic with exponential backoff
- Create wedding industry event definitions

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests and ensure >80% coverage
- Verify webhook delivery with integration tests  
- Test HMAC signature validation accuracy
- Generate evidence package with delivery metrics

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] **Database Schema**: Webhook endpoints, deliveries, event types, analytics tables
- [ ] **Core Webhook Manager**: WedSyncWebhookManager with delivery system
- [ ] **HMAC Security**: Signature generation, verification, timestamp validation
- [ ] **Retry System**: Exponential backoff with configurable maximum attempts  
- [ ] **Event Definitions**: Wedding industry specific webhook event types
- [ ] **API Endpoints**: Webhook registration, management, and status endpoints
- [ ] **Unit Tests**: >80% coverage for delivery logic and security validation

**Key Files to Create:**
- `/wedsync/lib/webhooks/webhook-manager.ts` - Core webhook delivery system
- `/wedsync/lib/webhooks/webhook-security.ts` - HMAC signing and validation
- `/wedsync/lib/webhooks/delivery-queue.ts` - Queue management and processing
- `/wedsync/lib/webhooks/retry-handler.ts` - Exponential backoff retry logic
- `/wedsync/supabase/functions/webhook-delivery/index.ts` - Edge function for delivery
- Database migration: Webhook system schema

**Affected Paths:**
- `/wedsync/src/app/api/webhooks/` - Webhook management API endpoints
- `/wedsync/src/types/webhooks.ts` - TypeScript interfaces for webhook system

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: API versioning context headers - Required for version-aware webhook payloads
- FROM Team E: UI requirements for webhook management - Required for endpoint configuration interface planning

### What other teams NEED from you:
- TO Team E: Webhook endpoint data structures and management APIs - They need this for UI implementation
- TO Team A: Webhook endpoint schema - Required for their version compatibility system  
- TO Team C: Event trigger specifications - Blocking their realtime webhook integration

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ DATABASE MIGRATIONS:**
- CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-201.md`
- SQL Expert will handle application and conflict resolution

### MANDATORY SECURITY IMPLEMENTATION FOR WEBHOOK ENDPOINTS

**EVERY webhook management endpoint MUST use validation:**
```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { webhookEndpointSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  webhookEndpointSchema.extend({
    url: z.string().url().refine(url => url.startsWith('https://'), 'HTTPS required'),
    events: z.array(z.enum(['client.created', 'form.submitted', 'journey.completed']))
  }),
  async (request, validatedData) => {
    // Webhook endpoint creation with validated data
  }
);
```

### SECURITY CHECKLIST FOR WEBHOOK SYSTEM
- [ ] **HMAC Signature Validation**: SHA-256 signatures with timestamp validation (5-minute tolerance)
- [ ] **HTTPS Enforcement**: All webhook URLs must use HTTPS protocol
- [ ] **Rate Limiting**: Per-client limits on webhook registration and delivery attempts
- [ ] **Input Validation**: Strict payload validation with size limits (100KB max)
- [ ] **IP Whitelisting**: Optional IP range restrictions for webhook endpoints
- [ ] **Audit Logging**: Complete audit trail for webhook registrations and deliveries
- [ ] **Secret Management**: Secure generation and storage of webhook signing secrets
- [ ] **Replay Attack Prevention**: Timestamp validation and nonce tracking

**Critical Security Patterns:**
```typescript
// HMAC signature generation (Team B implementation)
private generateWebhookSignature(payload: string, secretKey: string): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `${timestamp}.${payload}`;
  
  return `t=${timestamp},v1=${crypto
    .createHmac('sha256', secretKey)
    .update(signaturePayload)
    .digest('hex')}`;
}

// Webhook URL validation
private validateWebhookUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && 
           parsedUrl.hostname !== 'localhost' &&
           !parsedUrl.hostname.match(/^127\.|^10\.|^172\.16\.|^192\.168\./);
  } catch {
    return false;
  }
}
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// WEBHOOK DELIVERY SYSTEM TESTING

// 1. WEBHOOK ENDPOINT REGISTRATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/webhooks/endpoints"});

const registrationResponse = await page.request.post('/api/webhooks/endpoints', {
  data: {
    url: 'https://example.com/webhook',
    events: ['client.created', 'form.submitted'],
    integrationType: 'crm_integration',
    description: 'CRM integration for wedding client management'
  }
});

expect(registrationResponse.status()).toBe(201);
const registration = await registrationResponse.json();
expect(registration.data.secret).toBeDefined();
expect(registration.data.verificationToken).toBeDefined();

// 2. WEBHOOK DELIVERY TESTING
const webhookDelivery = await page.request.post('/api/webhooks/test-delivery', {
  data: {
    endpointId: registration.data.id,
    eventType: 'client.created',
    payload: {
      client: {
        id: 'test-client-123',
        couple_name: 'John & Jane Doe',
        wedding_date: '2025-06-15',
        contact_email: 'john.jane@example.com'
      }
    }
  }
});

expect(webhookDelivery.status()).toBe(200);

// 3. HMAC SIGNATURE VALIDATION
const signatureValidation = await page.request.post('/api/webhooks/verify-signature', {
  data: {
    payload: '{"test": "data"}',
    signature: 't=1640995200,v1=test-signature-hash',
    secret: registration.data.secret
  }
});

expect(signatureValidation.status()).toBe(200);

// 4. RETRY MECHANISM TESTING  
const retryTest = await page.request.post('/api/webhooks/test-retry', {
  data: {
    endpointId: registration.data.id,
    forceFailure: true,
    maxAttempts: 3
  }
});

// Verify retry attempts are scheduled
expect(retryTest.status()).toBe(202);
```

**REQUIRED TEST COVERAGE:**
- [ ] Webhook endpoint registration with validation
- [ ] HMAC signature generation and verification accuracy  
- [ ] Exponential backoff retry logic correctness
- [ ] Dead letter queue processing for permanent failures
- [ ] Wedding industry event schema validation
- [ ] Performance under high-volume webhook deliveries


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Webhook system supports all critical wedding industry events (client creation, form submission, journey completion)
- [ ] HMAC-SHA256 signature validation prevents webhook tampering with 5-minute timestamp tolerance
- [ ] Exponential backoff retry logic (1, 2, 4, 8, 16 minutes) with maximum 5 attempts and dead letter queue
- [ ] Database schema optimized for high-volume webhook analytics storage  
- [ ] API endpoints provide comprehensive webhook management capabilities

### Security & Performance:
- [ ] All webhook URLs validated as HTTPS with optional IP whitelisting and rate limiting
- [ ] Performance: Webhook delivery processing completes within 30 seconds with queue-based architecture
- [ ] Security audit shows zero vulnerabilities in webhook signing and delivery
- [ ] Webhook payload size limits enforced (100KB maximum)

### Evidence Package Required:
- [ ] HMAC signature validation test results (100% accuracy)
- [ ] Webhook delivery reliability metrics (99.9% success rate target)
- [ ] Retry logic validation with failure scenarios
- [ ] Performance benchmarks under load testing
- [ ] Security audit results for webhook endpoints

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Core System: `/wedsync/lib/webhooks/webhook-manager.ts`
- Security: `/wedsync/lib/webhooks/webhook-security.ts`
- Database: `/wedsync/supabase/migrations/[timestamp]_webhook_system.sql`
- API Routes: `/wedsync/src/app/api/webhooks/endpoints/route.ts`
- Tests: `/wedsync/tests/webhooks/`
- Types: `/wedsync/src/types/webhooks.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch30/WS-201-team-b-round-1-complete.md`
- **Include:** Feature ID (WS-201) AND team identifier in all filenames
- **Save in:** Correct batch folder (batch30)
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-201 | ROUND_1_COMPLETE | team-b | batch30" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify API versioning endpoints assigned to Team A (causes conflicts)
- Do NOT skip webhook security validation - HMAC signatures are mandatory
- Do NOT ignore exponential backoff requirements - critical for reliability
- REMEMBER: Team E needs your webhook management APIs for UI implementation  
- WAIT: Do not start Round 2 until ALL teams complete Round 1

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY