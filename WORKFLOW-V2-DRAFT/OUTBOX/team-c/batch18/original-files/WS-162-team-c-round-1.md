# TEAM C - ROUND 1: WS-162 - Helper Schedules - Integration & Notifications

**Date:** 2025-08-25  
**Feature ID:** WS-162 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Integrate helper schedules with notification system and master timeline  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding helper receiving task assignments
**I want to:** View my personalized wedding day schedule with all assigned tasks and timing
**So that:** I know exactly when and where to be for my responsibilities

**Real Wedding Problem This Solves:**
Currently, wedding helpers (bridesmaids, groomsmen, family) receive fragmented information via texts, emails, or verbal instructions. They often miss tasks or arrive late because they don't have a clear schedule. This feature creates a single source of truth for each helper's personalized timeline.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Email/SMS schedule delivery with updates
- Integration with master timeline changes
- Schedule version tracking
- Real-time updates when timeline changes
- Notification preferences management

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Notifications: Resend (email), Twilio (SMS)
- Real-time: Supabase Realtime subscriptions

**Integration Points:**
- [Master Timeline]: Subscribe to timeline changes
- [Notification Service]: Send schedule updates
- [Email Templates]: Schedule formatting for emails
- [SMS Service]: Condensed schedule for texts

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
await mcp__Ref__ref_search_documentation({query: "resend node email templates latest documentation"});
await mcp__Ref__ref_search_documentation({query: "twilio node sms messaging latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("notification", "", true);
await mcp__serena__find_symbol("realtime", "", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Integrate notifications with schedules"
2. **integration-specialist** --think-hard --use-loaded-docs "Connect email/SMS services"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "Realtime subscriptions" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **websocket-channels** --realtime-focus --broadcast-events
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing notification service patterns
- Understand email template system
- Check SMS service integration
- Review realtime subscription patterns
- Continue until you FULLY understand integrations

### **PLAN PHASE (THINK HARD!)**
- Design notification flow architecture
- Plan email templates for schedules
- Create SMS message format
- Plan realtime update subscriptions
- Consider delivery failure handling

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Create schedule notification service
- Build email templates
- Implement SMS formatting
- Set up realtime subscriptions

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify email delivery
- Test SMS sending
- Validate realtime updates
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] ScheduleNotificationService with email/SMS delivery
- [ ] Email template for helper schedules
- [ ] SMS formatter for condensed schedules
- [ ] Realtime subscription for timeline changes
- [ ] Notification preference management
- [ ] Unit tests with >80% coverage

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
- FROM Team A: Schedule component structure for email rendering
- FROM Team B: Database schema for notification tracking
- FROM Team D: Mobile-specific notification requirements

### What other teams NEED from you:
- TO Team A: Realtime update events for UI
- TO Team B: Notification status updates for database
- TO Team E: Testable notification mocks

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION

```typescript
// ✅ SECURE NOTIFICATION HANDLING:
import { withSecureValidation } from '@/lib/validation/middleware';
import { notificationSchema } from '@/lib/validation/schemas';

export const sendScheduleNotification = withSecureValidation(
  notificationSchema,
  async (validatedData) => {
    // Verify recipient is authorized helper
    const helper = await verifyHelperIdentity(validatedData.helperId);
    
    // Sanitize schedule content
    const sanitizedSchedule = sanitizeScheduleData(validatedData.schedule);
    
    // Send via appropriate channel
    if (validatedData.method === 'email') {
      await sendEmail(helper.email, sanitizedSchedule);
    } else if (validatedData.method === 'sms') {
      await sendSMS(helper.phone, formatForSMS(sanitizedSchedule));
    }
  }
);
```

### SECURITY CHECKLIST
- [ ] **PII Protection**: Never log personal contact info
- [ ] **Rate Limiting**: Prevent notification spam
- [ ] **Content Sanitization**: Clean all user content
- [ ] **Delivery Verification**: Track successful sends
- [ ] **Unsubscribe Support**: Honor opt-out preferences

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// NOTIFICATION INTEGRATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/test-notifications"});

// Test email template rendering
const emailPreview = await mcp__playwright__browser_evaluate({
  function: `() => {
    return fetch('/api/notifications/preview', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        template: 'helper-schedule',
        data: mockScheduleData
      })
    }).then(r => r.text());
  }`
});

// Test realtime subscription
await mcp__playwright__browser_evaluate({
  function: `() => {
    const channel = supabase.channel('schedule-updates');
    channel.on('broadcast', {event: 'schedule-change'}, (payload) => {
      console.log('Schedule updated:', payload);
    });
    channel.subscribe();
  }`
});

// Verify notification delivery tracking
const deliveryStatus = await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/notifications/status/test-id').then(r => r.json())`
});
```


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
- [ ] Email notifications working with templates
- [ ] SMS notifications formatted correctly
- [ ] Realtime updates triggering notifications
- [ ] Delivery tracking implemented
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Zero console errors

### Evidence Package Required:
- [ ] Screenshot of email template
- [ ] SMS message example
- [ ] Realtime subscription logs
- [ ] Delivery success metrics

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Service: `/wedsync/src/lib/services/scheduleNotificationService.ts`
- Email: `/wedsync/src/lib/email/templates/helperSchedule.tsx`
- SMS: `/wedsync/src/lib/sms/formatters/scheduleFormatter.ts`
- Realtime: `/wedsync/src/lib/realtime/scheduleSubscriptions.ts`
- Tests: `/wedsync/tests/integration/schedule-notifications.test.ts`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch18/WS-162-team-c-round-1-complete.md`
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT log personal information
- Do NOT send test notifications to real numbers
- Do NOT skip delivery tracking
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL on same feature

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY