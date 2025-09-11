# TEAM C - ROUND 1: WS-159 - Task Tracking - Real-time Notifications & Integration

**Date:** 2025-01-25  
**Feature ID:** WS-159 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build real-time notification system and third-party integrations for task status tracking  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple monitoring task completion
**I want to:** Track task progress with status updates and completion confirmations from helpers
**So that:** I can ensure all wedding preparations are on track and identify bottlenecks early

**Real Wedding Problem This Solves:**
Wedding couples currently struggle to track whether their assigned helpers (bridesmaids, family, friends) have completed their tasks like "Order flowers," "Book transportation," or "Confirm guest count." This leads to last-minute panic when couples discover critical tasks weren't completed. This system provides real-time visibility into task progress with status updates and photo evidence of completion, with instant notifications to keep everyone synchronized.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Build real-time notification system for status changes
- Implement email and SMS alerts for task updates
- Create webhook endpoints for external integrations
- Build notification preference management
- Implement notification delivery tracking
- Create integration with calendar systems for deadline alerts

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Real-time: Supabase Realtime for instant updates
- Notifications: Resend for email, Twilio for SMS
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- WS-156 Task Creation: Uses existing task structure
- WS-157 Helper Assignment: Uses helper assignments data
- Team A: UI notification components
- Team B: Status update APIs and events
- Database: task_assignments, wedding_tasks, wedding_helpers, notifications tables

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
// 1. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "supabase realtime broadcast presence latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next server-sent-events webhooks latest documentation"});
await mcp__Ref__ref_search_documentation({query: "resend node email-templates notifications latest documentation"});
await mcp__Ref__ref_search_documentation({query: "twilio node sms messaging latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("notificationService", "", true);
await mcp__serena__get_symbols_overview("/src/lib/notifications/");
await mcp__serena__find_symbol("webhook", "/src/app/api/", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Real-time notification coordination"
2. **supabase-specialist** --think-hard --use-loaded-docs "Realtime subscriptions and webhooks"
3. **integration-specialist** --think-ultra-hard --follow-existing-patterns "Third-party notification services"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --check-patterns --match-codebase-style
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant notification service files first
- Understand existing real-time patterns and webhook implementations
- Check integration points with email/SMS services
- Review similar notification systems
- Continue until you FULLY understand the notification architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed notification system architecture
- Write test cases FIRST (TDD)
- Plan real-time event broadcasting
- Consider notification delivery patterns
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Build real-time status update broadcasting
- Create notification service for email/SMS
- Implement webhook endpoints
- Build notification preference management
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify real-time functionality
- Test notification delivery
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Real-time & Notifications Core):
- [ ] Real-time task status broadcasting with Supabase Realtime
- [ ] Email notification service for status changes
- [ ] SMS notification service for urgent updates
- [ ] Webhook endpoints for external systems
- [ ] Notification preference management API
- [ ] Notification delivery tracking system
- [ ] Unit tests with >80% coverage
- [ ] Integration tests for notification delivery

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Status change events - Required for notification triggers
- FROM Team A: Notification preference UI specs - Dependency for user settings

### What other teams NEED from you:
- TO Team A: Real-time event specifications - They need this for UI updates
- TO Team B: Notification delivery confirmation API - Required for their status tracking
- TO Team D: Notification webhook contracts - Blocking their WedMe integration

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL WEBHOOK ROUTES

**EVERY webhook route MUST verify signatures and validate payloads:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN for webhooks):
import { verifyWebhookSignature } from '@/lib/security/webhook-validation';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-webhook-signature');
  const timestamp = request.headers.get('x-webhook-timestamp');
  
  if (!signature || !timestamp) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  
  const rawBody = await request.text();
  const isValid = await verifyWebhookSignature(signature, timestamp, rawBody);
  
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Process verified webhook
  const payload = JSON.parse(rawBody);
  // Your implementation here
}

// ✅ For notification services - secure API key handling:
import { getSecureConfig } from '@/lib/config/environment';

const config = getSecureConfig();
const resendClient = new Resend(config.RESEND_API_KEY); // Secure key access
```

### SECURITY CHECKLIST FOR NOTIFICATION ROUTES

- [ ] **Webhook Signature Verification**: All webhooks MUST verify signatures
- [ ] **Rate Limiting**: Implement aggressive rate limiting for notification endpoints
- [ ] **API Key Security**: NEVER expose notification service API keys
- [ ] **Input Validation**: Validate all notification payloads
- [ ] **Delivery Tracking**: Log notification attempts without exposing sensitive data
- [ ] **User Consent**: Verify user opted-in to notification types

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 REAL-TIME & NOTIFICATION TESTING:**

```javascript
// REAL-TIME TESTING APPROACH

// 1. REAL-TIME EVENT TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/tasks/tracking"});
await mcp__playwright__browser_tab_new({url: "http://localhost:3000/tasks/assignments"});

// Tab 1: Update task status
await mcp__playwright__browser_tab_select({index: 0});
await mcp__playwright__browser_click({element: "Status Update", ref: "[data-testid=status-update]"});

// Tab 2: Verify real-time update received
await mcp__playwright__browser_tab_select({index: 1});
await mcp__playwright__browser_wait_for({text: "Status Updated", timeout: 5000});

// 2. NOTIFICATION DELIVERY TESTING
const notificationTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test notification service API
    return fetch('/api/notifications/send', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        type: 'task_status_change',
        recipient: 'test@example.com',
        taskId: 'test-uuid'
      })
    }).then(r => r.json());
  }`
});

// 3. WEBHOOK ENDPOINT TESTING
const webhookTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    return fetch('/api/webhooks/task-updates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-webhook-signature': 'test-signature',
        'x-webhook-timestamp': Date.now().toString()
      },
      body: JSON.stringify({event: 'task.status.changed'})
    }).then(r => ({status: r.status, valid: r.status !== 401}));
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Real-time events broadcasting correctly
- [ ] Notification services sending successfully
- [ ] Webhook endpoints validating signatures
- [ ] Rate limiting protecting endpoints
- [ ] Error handling returning proper responses
- [ ] Multi-tab real-time synchronization


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

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Real-time functionality tested across multiple tabs
- [ ] Zero TypeScript errors
- [ ] Security validation implemented

### Integration & Performance:
- [ ] Real-time events delivered <500ms
- [ ] Notification delivery confirmed
- [ ] Webhook signature validation working
- [ ] Rate limiting protecting endpoints
- [ ] Error handling robust

### Evidence Package Required:
- [ ] Real-time functionality demonstration
- [ ] Notification delivery proof
- [ ] Webhook testing results
- [ ] Performance metrics
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Notifications: `/wedsync/src/lib/notifications/`
- Webhooks: `/wedsync/src/app/api/webhooks/`
- Real-time: `/wedsync/src/lib/realtime/`
- Tests: `/wedsync/tests/notifications/`
- Types: `/wedsync/src/types/notifications.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch17/WS-159-team-c-round-1-complete.md`
- **Include:** Feature ID (WS-159) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-159 | ROUND_1_COMPLETE | team-c | batch17" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT expose notification service API keys
- REMEMBER: All 5 teams work in PARALLEL - coordinate through dependencies

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Real-time functionality working
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY