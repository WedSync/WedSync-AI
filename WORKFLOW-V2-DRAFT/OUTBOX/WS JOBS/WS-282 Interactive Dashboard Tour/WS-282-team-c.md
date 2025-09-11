# TEAM C - ROUND 1: WS-282 - Interactive Dashboard Tour
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive integration layer for interactive tour system with real-time analytics and third-party integrations
**FEATURE ID:** WS-282 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about tour analytics, user behavior tracking, and wedding industry educational data integration

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/tour-analytics/
cat $WS_ROOT/wedsync/src/lib/integrations/tour-analytics/TourTracker.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test tour-analytics
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧠 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query tour integration patterns
await mcp__serena__search_for_pattern("tour tracking analytics realtime");
await mcp__serena__find_symbol("analytics tracker webhook", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide - General SaaS UI
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load integration-specific documentation
# Use Ref MCP to search for:
# - "Supabase realtime-subscriptions tour-analytics"
# - "Next.js webhooks event-streaming"
# - "React analytics tracking user-behavior"
# - "TypeScript event-system patterns"
# - "Wedding industry CRM integrations"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Find existing analytics and integration patterns
await mcp__serena__find_referencing_symbols("analytics tracking event");
await mcp__serena__search_for_pattern("realtime subscription integration");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX INTEGRATION PLANNING

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: Multi-System Integration Analysis
```typescript
// Before building system integrations
mcp__sequential-thinking__sequential_thinking({
  thought: "Interactive tour integration requires: real-time analytics tracking user progression, webhook notifications to CRM systems when tour completes, integration with wedding industry educational APIs, event streaming for progress updates, and synchronization with user onboarding status across platform.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration complexity analysis: Tour analytics must track micro-interactions (hover times, click patterns, step completion rates), educational content needs dynamic loading from wedding industry APIs, progress synchronization affects billing tiers (trial completion triggers), multi-device tour state sync required.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Failure scenarios: Analytics service outages during critical onboarding, educational API rate limits during high-traffic periods, realtime connection drops mid-tour, webhook endpoints become unavailable during trial-to-paid conversions. Need graceful degradation and retry mechanisms.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration architecture: Use event-driven pattern with Supabase realtime for tour state sync, implement analytics queue with retry logic, create educational content caching system, build webhook delivery system with idempotent operations, maintain comprehensive tour completion audit logs.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down integration work, track API dependencies, identify failure points
   
2. **integration-specialist** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture
   - Mission: Design tour analytics system, educational API integration patterns
   
3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Secure tour data collection, validate webhook security, protect user behavior data
   
4. **code-quality-guardian** --continuous --pattern-checking --sequential-thinking-quality
   - Mission: Ensure integration patterns match existing codebase analytics systems
   
5. **test-automation-architect** --tdd-first --coverage-analysis --sequential-thinking-testing
   - Mission: Write integration tests for tour analytics and webhook systems
   
6. **documentation-chronicler** --detailed-evidence --code-examples --sequential-thinking-docs
   - Mission: Document integration patterns and API specifications

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all integration patterns and analytics systems
await mcp__serena__find_symbol("analytics tracker realtime", "", true);
await mcp__serena__search_for_pattern("webhook integration event");
await mcp__serena__find_referencing_symbols("subscription broadcast");
```
- [ ] Identified existing analytics patterns to follow
- [ ] Found all webhook integration points
- [ ] Understood realtime subscription architecture
- [ ] Located similar tour/onboarding implementations

### **PLAN PHASE (THINK ULTRA HARD!)**
- [ ] Architecture decisions based on existing integration patterns
- [ ] Integration test cases written FIRST (TDD)
- [ ] Security measures for user behavior data collection
- [ ] Performance considerations for real-time tour analytics

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use integration patterns discovered by Serena
- [ ] Maintain consistency with existing analytics systems
- [ ] Include comprehensive error handling for external services
- [ ] Test integration points continuously during development

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**Core Integration Systems to Build:**

1. **TourAnalyticsTracker** - Real-time tour progression and interaction analytics
2. **EducationalContentIntegration** - Wedding industry educational API integration
3. **TourProgressWebhooks** - CRM integration hooks for tour completion events
4. **RealtimeTourSync** - Multi-device tour state synchronization
5. **TourCompletionEvents** - Event system for billing tier transitions
6. **WeddingIndustryDataAPI** - Integration with wedding planning educational resources

### Key Features:
- Real-time analytics for tour interaction patterns
- Webhook integration for CRM systems when tour completes
- Educational content API integration for wedding industry data
- Multi-device tour state synchronization
- Event streaming for tour progress and completion
- Integration with billing system for trial-to-paid transitions

### Integration Points:
- **Supabase Realtime**: Tour state synchronization across devices
- **CRM Webhooks**: HoneyBook, Dubsado integration for lead tracking
- **Analytics APIs**: Custom analytics for onboarding funnel optimization
- **Educational APIs**: Wedding Wire, The Knot educational content
- **Billing Integration**: Stripe webhook triggers for trial completion

## 📋 TECHNICAL SPECIFICATION

### Tour Analytics System Requirements:
- Track micro-interactions: hover time, click patterns, step duration
- Record tour abandonment points for optimization
- Monitor educational content engagement rates
- Measure tour completion impact on user activation
- Real-time progress sync across multiple sessions/devices

### Integration Architecture:
```typescript
interface TourAnalyticsSystem {
  // Real-time tracking
  trackTourStart(userId: string, tourType: string): Promise<void>;
  trackStepCompletion(stepId: string, duration: number, interactions: TourInteraction[]): Promise<void>;
  trackTourCompletion(completionData: TourCompletionEvent): Promise<void>;
  
  // Educational content integration
  loadEducationalContent(weddingType: string, region: string): Promise<EducationalContent[]>;
  trackContentEngagement(contentId: string, engagementMetrics: ContentEngagement): Promise<void>;
  
  // CRM integration
  triggerCRMWebhook(event: TourEvent, userData: UserData): Promise<WebhookResponse>;
  syncTourProgressToLeadScore(userId: string, progress: TourProgress): Promise<void>;
  
  // Realtime synchronization
  subscribeToTourUpdates(userId: string, callback: (update: TourUpdate) => void): Subscription;
  broadcastTourProgress(userId: string, progress: TourProgress): Promise<void>;
}
```

## 🎯 SPECIFIC DELIVERABLES

### Core Integration Components:
- [ ] **TourAnalyticsTracker.ts** - Real-time tour interaction tracking system
- [ ] **EducationalContentAPI.ts** - Wedding industry educational data integration
- [ ] **TourWebhookManager.ts** - CRM integration webhook system
- [ ] **RealtimeTourSync.ts** - Multi-device tour state synchronization
- [ ] **TourCompletionHandler.ts** - Billing integration for trial-to-paid transitions

### Supporting Infrastructure:
- [ ] **tour-analytics.types.ts** - TypeScript interfaces for all analytics data
- [ ] **webhook-handlers/** - Individual webhook handlers for each CRM integration
- [ ] **educational-content-cache.ts** - Caching system for wedding industry data
- [ ] **tour-event-stream.ts** - Event streaming system for tour progress

### Integration Tests:
- [ ] Tour analytics tracking accuracy tests
- [ ] Webhook delivery and retry mechanism tests
- [ ] Educational content API integration tests
- [ ] Multi-device synchronization tests
- [ ] Billing integration trigger tests

## 🔗 DEPENDENCIES

### What You Need from Other Teams:
- **Team A**: Tour UI component structure and event hooks
- **Team B**: Tour progress API endpoints and user session management
- **Team D**: Mobile tour experience requirements and PWA considerations
- **Team E**: Analytics testing requirements and performance benchmarks

### What Others Need from You:
- Tour analytics interface definitions for frontend integration
- Webhook endpoint specifications for CRM integrations
- Educational content data models for UI components
- Realtime subscription patterns for multi-device sync

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API Route Security Checklist:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for analytics endpoints
- [ ] **Rate limiting applied** - rateLimitService for webhook endpoints
- [ ] **Data sanitization** - Prevent PII leakage in analytics data
- [ ] **Webhook signature validation** - Verify CRM webhook authenticity
- [ ] **Analytics data encryption** - Encrypt sensitive user behavior data
- [ ] **Error messages sanitized** - Never leak integration credentials
- [ ] **Audit logging** - Log all CRM integration events with user context

### Required Security Files:
```typescript
// These MUST exist and be used:
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { secureStringSchema, analyticsEventSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { webhookSignatureValidator } from '$WS_ROOT/wedsync/src/lib/security/webhook-validation';
```

### Validation Pattern for Analytics:
```typescript
const tourAnalyticsSchema = z.object({
  userId: secureStringSchema,
  tourId: secureStringSchema,
  stepId: secureStringSchema,
  eventType: z.enum(['start', 'progress', 'complete', 'abandon']),
  timestamp: z.string().datetime(),
  interactions: z.array(z.object({
    type: z.enum(['click', 'hover', 'scroll', 'focus']),
    duration: z.number().min(0),
    elementId: secureStringSchema.optional()
  })),
  metadata: z.object({}).optional().default({})
});

export const POST = withSecureValidation(tourAnalyticsSchema, handler);
```

## 🎭 PLAYWRIGHT TESTING

Revolutionary accessibility-first testing for integrations:

```javascript
// INTEGRATION-SPECIFIC TESTING APPROACH

// 1. WEBHOOK INTEGRATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/webhooks"});
const webhookTestResults = await mcp__playwright__browser_evaluate({
  function: `() => ({
    webhookEndpoints: document.querySelectorAll('[data-testid="webhook-endpoint"]').length,
    deliveryStatus: Array.from(document.querySelectorAll('.webhook-status')).map(el => el.textContent),
    lastDelivery: document.querySelector('[data-testid="last-delivery"]')?.textContent
  })`
});

// 2. ANALYTICS INTEGRATION VERIFICATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard/analytics"});
const analyticsData = await mcp__playwright__browser_evaluate({
  function: `() => ({
    tourCompletionRate: document.querySelector('[data-testid="tour-completion-rate"]')?.textContent,
    avgTourDuration: document.querySelector('[data-testid="avg-tour-duration"]')?.textContent,
    abandonmentPoints: Array.from(document.querySelectorAll('.abandonment-point')).length
  })`
});

// 3. REALTIME SYNC TESTING (Multi-tab)
await mcp__playwright__browser_tabs({action: "new", url: "/onboarding/tour"});     // Start tour tab 1
await mcp__playwright__browser_tabs({action: "new", url: "/onboarding/tour"});     // Same tour tab 2
await mcp__playwright__browser_tabs({action: "select", index: 0});                  // Progress in tab 1
await mcp__playwright__browser_click({selector: '[data-testid="tour-next"]'});
await mcp__playwright__browser_tabs({action: "select", index: 1});                  // Verify sync in tab 2
await mcp__playwright__browser_wait_for({text: "Step 2"});

// 4. EDUCATIONAL CONTENT API TESTING
const educationalContentLoad = await mcp__playwright__browser_network_requests();
const educationalAPIcalls = educationalContentLoad.filter(req => req.url.includes('/api/educational-content'));

// 5. CRM WEBHOOK SIMULATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/integrations"});
await mcp__playwright__browser_click({selector: '[data-testid="test-webhook"]'});
const webhookResponse = await mcp__playwright__browser_wait_for({text: "Webhook delivered successfully"});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] All deliverables complete WITH EVIDENCE
- [ ] Integration tests written FIRST and passing (show test-first commits)
- [ ] Serena patterns followed (list integration patterns used)
- [ ] Zero TypeScript errors (show typecheck output)
- [ ] Zero webhook delivery failures (show delivery logs)

### Integration Evidence:
```typescript
// Include actual integration code showing:
// 1. Analytics tracking implementation
// 2. Webhook delivery system with retry logic
// 3. Educational content API integration
// 4. Realtime synchronization patterns
export const TourAnalyticsTracker = {
  // Following pattern from analytics/base-tracker.ts:23-45
  // Serena confirmed this matches 8 other analytics implementations
  trackTourProgress: async (data: TourProgressData) => {
    // Implementation here
  }
}
```

### Performance Evidence:
```javascript
// Required integration metrics
const integrationMetrics = {
  webhookDelivery: "98.5%", // Target: >98%
  analyticsLatency: "45ms", // Target: <100ms
  realtimeSync: "125ms", // Target: <200ms
  educationalContentLoad: "380ms", // Target: <500ms
}
```

## 💾 WHERE TO SAVE

### Core Integration Files:
- **Analytics System**: `$WS_ROOT/wedsync/src/lib/integrations/tour-analytics/`
- **Webhook Handlers**: `$WS_ROOT/wedsync/src/lib/integrations/webhooks/tour-completion/`
- **Educational APIs**: `$WS_ROOT/wedsync/src/lib/integrations/educational-content/`
- **Realtime Sync**: `$WS_ROOT/wedsync/src/lib/integrations/realtime/tour-sync/`

### Supporting Files:
- **Types**: `$WS_ROOT/wedsync/src/types/tour-integrations.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/integrations/tour-analytics/`
- **API Routes**: `$WS_ROOT/wedsync/src/app/api/tour-analytics/`
- **Reports**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## ⚠️ CRITICAL WARNINGS

### Integration-Specific Risks:
- **Data Privacy**: Tour analytics contain sensitive user behavior data - ensure GDPR compliance
- **Webhook Security**: CRM integrations expose sensitive lead data - validate all signatures
- **Rate Limits**: Educational APIs have strict rate limits - implement proper caching
- **Realtime Performance**: Tour sync affects user experience - optimize for <200ms latency
- **Billing Integration**: Tour completion triggers paid subscriptions - ensure idempotent operations

### Wedding Industry Considerations:
- Peak usage during engagement season (November-February) - plan for 10x traffic spikes
- Mobile-first analytics tracking - 80% of couples use mobile during tour
- Vendor CRM integration critical for lead conversion - failure impacts business directly
- Educational content must be region-specific (UK vs US wedding customs differ significantly)

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Code Security Verification:
```bash
# Verify ALL integration endpoints have validation
grep -r "withSecureValidation\|withValidation" $WS_ROOT/wedsync/src/app/api/tour-analytics/
# Should show validation on EVERY analytics route

# Check for webhook signature validation
grep -r "webhookSignatureValidator" $WS_ROOT/wedsync/src/lib/integrations/webhooks/
# Should be present in ALL webhook handlers

# Verify analytics data encryption
grep -r "encrypt.*analytics" $WS_ROOT/wedsync/src/lib/integrations/tour-analytics/
# Should show encryption for sensitive behavior data

# Check realtime security
grep -r "getServerSession" $WS_ROOT/wedsync/src/app/api/tour-analytics/
# Should be present in ALL tour analytics endpoints
```

### Final Integration Security Checklist:
- [ ] NO direct analytics data exposure without encryption
- [ ] ALL webhook endpoints validate signatures
- [ ] ALL analytics routes have proper authentication
- [ ] NO sensitive CRM data in error messages
- [ ] Educational content API keys properly secured
- [ ] Realtime subscriptions have user authorization
- [ ] TypeScript compiles with NO errors
- [ ] Integration tests pass including security tests

### Integration Performance Verification:
- [ ] Webhook delivery rate >98% under load
- [ ] Analytics tracking latency <100ms
- [ ] Realtime sync performance <200ms
- [ ] Educational content cache hit rate >90%
- [ ] CRM integration response time <500ms

---

**EXECUTE IMMEDIATELY - Build the integration layer that makes tour analytics actionable and CRM integration seamless!**