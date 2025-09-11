# TEAM C - ROUND 1: WS-156 - Task Creation System - Integration & Services

**Date:** 2025-01-25  
**Feature ID:** WS-156 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build integration services connecting task creation with timeline, notification, and validation systems  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple preparing for their big day
**I want to:** Create detailed tasks for my wedding helpers with specific timing, locations, and instructions
**So that:** My helpers know exactly what to do, when to do it, and where to be, eliminating confusion and ensuring smooth execution

**Real Wedding Problem This Solves:**
A couple typically creates a "day-of timeline" in a Word document that gets lost or outdated. With this feature, they create tasks like "Set up ceremony chairs (2pm-2:30pm at Garden Pavilion, need 100 white chairs from storage)" that get assigned to specific helpers. This eliminates the chaos of people asking "what should I be doing now?" throughout the wedding day.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Integration between task creation and master timeline system
- Real-time conflict detection service connecting multiple data sources
- Notification service integration for task assignments
- Timeline validation service with dependency checking
- Third-party calendar integration for venue and vendor schedules

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Integrations: Webhooks, real-time subscriptions, external APIs

**Integration Points:**
- Timeline Service: Master wedding timeline synchronization
- Notification Service: Task assignment and reminder systems
- Calendar APIs: Google Calendar, Outlook, Apple Calendar integration
- Venue Systems: Location-based conflict detection
- Real-time: Supabase realtime for live updates

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (For integration components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");  // Get correct library ID first
await mcp__context7__get-library-docs("/supabase/supabase", "realtime subscriptions", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "webhooks api-routes", 3000);
await mcp__context7__get-library-docs("/microsoft/graph", "calendar-api", 2000);
await mcp__context7__get-library-docs("/google/googleapis", "calendar-v3", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("integrationService", "", true);
await mcp__serena__get_symbols_overview("/src/lib/integrations");
await mcp__serena__get_symbols_overview("/src/lib/services");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (integration APIs change frequently!)
- Serena shows existing patterns to follow (consistent service architecture!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Track task integration development"
2. **integration-specialist** --think-hard --use-loaded-docs "Build third-party service integrations"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "Create webhook and real-time endpoints" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --think-hard --integration-patterns "Design service-to-service communication"
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files first
- Understand existing patterns and conventions
- Check integration points
- Review similar implementations
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan
- Write test cases FIRST (TDD)
- Plan error handling
- Consider edge cases
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Timeline integration service connecting tasks to master timeline
- [ ] Real-time conflict detection system using Supabase realtime
- [ ] Notification service integration for task assignments
- [ ] Webhook endpoints for external calendar systems
- [ ] Integration middleware for service-to-service communication
- [ ] Unit tests with >80% coverage
- [ ] Basic integration testing with mock services

### Round 2 (Enhancement & Polish):
- [ ] Google Calendar API integration for venue conflicts
- [ ] Outlook Calendar integration for vendor schedules
- [ ] Real-time collaborative editing for task changes
- [ ] Advanced conflict resolution algorithms
- [ ] Performance optimization for high-frequency updates

### Round 3 (Integration & Finalization):
- [ ] Full end-to-end integration testing
- [ ] Production webhook security and validation
- [ ] Monitoring and alerting for integration failures
- [ ] Rollback and recovery procedures
- [ ] Production deployment with failover

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Component interfaces for real-time updates - Required for live conflict detection
- FROM Team B: Task service APIs and database triggers - Dependency for timeline integration

### What other teams NEED from you:
- TO Team A: Real-time update interfaces - They need this for live form validation
- TO Team B: Integration service contracts - Blocking their notification features
- TO Team D: Webhook endpoints for helper notifications - Dependency for assignment system

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR ALL INTEGRATIONS

**EVERY integration endpoint MUST use the security framework:**

```typescript
// ❌ NEVER DO THIS (FOUND IN INTEGRATION ROUTES):
export async function POST(request: Request) {
  const webhookData = await request.json(); // NO VERIFICATION!
  await processWebhook(webhookData); // DIRECT PROCESSING!
  return NextResponse.json({success: true});
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { verifyWebhookSignature } from '@/lib/security/webhook-validation';
import { withSecureValidation } from '@/lib/validation/middleware';
import { webhookSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  webhookSchema,
  async (request: NextRequest, validatedData) => {
    // Verify webhook signature first
    const signature = request.headers.get('x-webhook-signature');
    const isValid = await verifyWebhookSignature(signature, validatedData, 'calendar-service');
    
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    // Process verified webhook
    await integrationService.processCalendarUpdate(validatedData);
    return NextResponse.json({ success: true });
  }
);
```

### SECURITY CHECKLIST FOR EVERY INTEGRATION

Teams MUST implement ALL of these for EVERY integration endpoint:

- [ ] **Webhook Signature Verification**: All external webhooks must be cryptographically verified
- [ ] **API Key Validation**: Third-party services require proper key management
- [ ] **Rate Limiting**: Prevent abuse of integration endpoints
- [ ] **Input Validation**: MANDATORY Zod schemas for all webhook payloads
- [ ] **Error Handling**: NEVER expose internal service details in errors
- [ ] **Timeout Handling**: All external API calls must have timeouts
- [ ] **Retry Logic**: Implement exponential backoff for failed integrations
- [ ] **Audit Logging**: Log all integration attempts for security monitoring

### SPECIFIC SECURITY PATTERNS FOR INTEGRATIONS

```typescript
// Calendar Integration Security Pattern
export class CalendarIntegrationService {
  private async callExternalAPI(endpoint: string, data: any, timeout = 5000): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getValidToken()}`,
          'Content-Type': 'application/json',
          'User-Agent': 'WedSync/1.0'
        },
        body: JSON.stringify(this.sanitizePayload(data)),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new IntegrationError(`API call failed: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new IntegrationError('API call timeout');
      }
      
      // Log error but don't expose details
      console.error('Calendar integration error:', error);
      throw new IntegrationError('External service unavailable');
    }
  }
  
  private sanitizePayload(data: any): any {
    // Remove sensitive fields that shouldn't leave our system
    const { couple_id, internal_notes, ...safeData } = data;
    return safeData;
  }
  
  private async getValidToken(): Promise<string> {
    // Implement token refresh logic
    const token = await this.tokenStore.get('calendar_service');
    if (this.isTokenExpired(token)) {
      return await this.refreshToken();
    }
    return token;
  }
}

// Real-time Updates Security Pattern
export class TaskRealtimeService {
  async subscribeToTaskUpdates(coupleId: string, callback: Function) {
    // Verify user can only subscribe to their own couple's tasks
    const session = await getServerSession();
    if (session.user.couple_id !== coupleId) {
      throw new Error('Unauthorized subscription');
    }
    
    const channel = supabase.channel(`tasks:${coupleId}`)
      .on('postgres_changes', 
        {
          event: '*',
          schema: 'public',
          table: 'wedding_tasks',
          filter: `couple_id=eq.${coupleId}`
        },
        (payload) => {
          // Sanitize payload before sending to client
          const safePayload = this.sanitizeRealtimePayload(payload);
          callback(safePayload);
        }
      )
      .subscribe();
    
    return channel;
  }
  
  private sanitizeRealtimePayload(payload: any): any {
    // Remove sensitive internal fields from realtime updates
    const { internal_id, created_by_system, ...safePayload } = payload;
    return safePayload;
  }
}
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 INTEGRATION-FIRST VALIDATION (Beyond Unit Testing!):**

```javascript
// REVOLUTIONARY INTEGRATION TESTING APPROACH!

// 1. REAL-TIME COLLABORATION TESTING
test('Real-time task updates across multiple clients', async () => {
  // Open multiple browser contexts to simulate multiple users
  const context1 = await mcp__playwright__browser_tabs({action: 'new'});
  const context2 = await mcp__playwright__browser_tabs({action: 'new'});
  
  // Navigate to task page in both contexts
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  await mcp__playwright__browser_tabs({action: 'select', index: 1});
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  
  // Create task in first context
  await mcp__playwright__browser_tabs({action: 'select', index: 0});
  await mcp__playwright__browser_type({
    element: 'Task title input',
    ref: 'input[name="title"]',
    text: 'Real-time test task'
  });
  
  await mcp__playwright__browser_click({
    element: 'Create task button',
    ref: 'button[type="submit"]'
  });
  
  // Verify task appears in second context within 2 seconds
  await mcp__playwright__browser_tabs({action: 'select', index: 1});
  await mcp__playwright__browser_wait_for({
    text: 'Real-time test task'
  });
  
  await mcp__playwright__browser_snapshot();
});

// 2. CALENDAR INTEGRATION WORKFLOW TESTING
test('External calendar conflict detection', async () => {
  // Mock external calendar API
  await mcp__playwright__browser_evaluate({
    function: `() => {
      window.mockCalendarAPI = {
        events: [
          {
            start: '2025-02-15T14:00:00',
            end: '2025-02-15T15:00:00',
            title: 'Vendor Meeting',
            location: 'Garden Pavilion'
          }
        ]
      };
    }`
  });
  
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  
  // Try to create conflicting task
  await mcp__playwright__browser_type({
    element: 'Task timing input',
    ref: 'input[name="timing_value"]',
    text: '14:30'  // Conflicts with vendor meeting
  });
  
  await mcp__playwright__browser_type({
    element: 'Task location input',
    ref: 'input[name="location"]',
    text: 'Garden Pavilion'
  });
  
  // Verify conflict warning appears
  await mcp__playwright__browser_wait_for({
    text: 'Calendar Conflict Detected'
  });
  
  await mcp__playwright__browser_snapshot();
});

// 3. WEBHOOK SECURITY VALIDATION
test('Webhook signature validation', async () => {
  // Test webhook endpoint directly
  const webhookPayload = {
    event_type: 'calendar_updated',
    calendar_id: 'test-calendar',
    changes: [
      {
        event_id: 'event-123',
        start_time: '2025-02-15T14:00:00Z'
      }
    ]
  };
  
  // Test with invalid signature
  const invalidResponse = await fetch('/api/webhooks/calendar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': 'invalid-signature'
    },
    body: JSON.stringify(webhookPayload)
  });
  
  expect(invalidResponse.status).toBe(401);
  
  // Test with valid signature
  const validSignature = await generateWebhookSignature(webhookPayload, 'calendar-service');
  const validResponse = await fetch('/api/webhooks/calendar', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': validSignature
    },
    body: JSON.stringify(webhookPayload)
  });
  
  expect(validResponse.status).toBe(200);
});

// 4. SERVICE RESILIENCE TESTING
test('Integration failure handling and recovery', async () => {
  // Mock external service failure
  await mcp__playwright__browser_evaluate({
    function: `() => {
      window.originalFetch = window.fetch;
      window.fetch = (...args) => {
        if (args[0].includes('calendar-api')) {
          return Promise.reject(new Error('Service unavailable'));
        }
        return window.originalFetch(...args);
      };
    }`
  });
  
  await mcp__playwright__browser_navigate({url: 'http://localhost:3000/tasks'});
  
  // Try to create task that requires calendar integration
  await mcp__playwright__browser_type({
    element: 'Task title input',
    ref: 'input[name="title"]',
    text: 'Calendar integration test'
  });
  
  await mcp__playwright__browser_click({
    element: 'Create task button',
    ref: 'button[type="submit"]'
  });
  
  // Verify graceful degradation
  await mcp__playwright__browser_wait_for({
    text: 'Task created (calendar sync pending)'
  });
  
  await mcp__playwright__browser_snapshot();
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Real-time collaborative updates across multiple sessions
- [ ] Calendar integration conflict detection
- [ ] Webhook security and signature validation
- [ ] Service failure handling and graceful degradation
- [ ] Performance under integration load
- [ ] Network timeout and retry logic
- [ ] Cross-service data consistency validation

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Integration tests validating all service connections
- [ ] Zero TypeScript errors
- [ ] Zero integration timeouts or failures

### Integration & Performance:
- [ ] Real-time updates working across multiple sessions
- [ ] External service integrations responding correctly
- [ ] Performance targets met (<500ms integration calls, <2s conflict detection)
- [ ] Security requirements met for all webhooks and APIs
- [ ] Failover and recovery procedures tested

### Evidence Package Required:
- [ ] Integration testing results with external services
- [ ] Real-time collaboration proof
- [ ] Security validation for webhooks
- [ ] Performance benchmarks for service calls
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Integration Services: `/wedsync/src/lib/integrations/`
- Webhooks: `/wedsync/src/app/api/webhooks/`
- Real-time: `/wedsync/src/lib/realtime/`
- Tests: `/wedsync/tests/integration/`
- Types: `/wedsync/src/types/integrations.ts`

### ⚠️ DATABASE MIGRATIONS:
- CREATE migration files if needed in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-156.md
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch16/WS-156-team-c-round-1-complete.md`
- **Include:** Feature ID (WS-156) AND team identifier in all filenames
- **Save in:** Correct batch folder (batch16)
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-156 | ROUND_1_COMPLETE | team-c | batch16" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

Use the standard team output template in `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md`
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch16/WS-156-team-c-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY