# TEAM C - ROUND 1: WS-165 - Payment Calendar - Integration & External Services

**Date:** 2025-08-25  
**Feature ID:** WS-165 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build payment calendar integrations with budget categories and reminder services
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple managing payment deadlines
**I want to:** View upcoming payment due dates on a calendar with automatic reminders
**So that:** I never miss important payment deadlines and can plan cash flow effectively

**Real Wedding Problem This Solves:**
Couples currently track wedding payments in isolation from their budget categories, making cash flow planning difficult. This integration connects payment schedules with budget categories and enables automated reminder delivery through email and SMS channels, ensuring no critical wedding payments are missed.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Integration with budget categories for cash flow planning
- Automatic payment reminders via email/SMS
- Payment status tracking integration with existing systems
- Third-party reminder service connections
- Cross-system data synchronization

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- External Services: Email (Resend), SMS (Twilio), Calendar APIs

**Integration Points:**
- Budget Categories: Link payments to existing budget structure
- Notification Services: Email and SMS reminder delivery
- User Authentication: Payment access control integration
- Calendar Systems: Potential integration with external calendar services

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
  
await mcp__Ref__ref_search_documentation({query: "next api-routes integrations latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase edge-functions latest documentation"});

// For external service integrations:
await mcp__Ref__ref_search_documentation({query: "resend email-templates latest documentation"});
await mcp__Ref__ref_search_documentation({query: "twilio sms-messaging latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("integration", "src/lib", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Payment calendar integrations"
2. **integration-specialist** --think-hard --use-loaded-docs "Third-party service integration expertise"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "Edge functions and API integrations" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **supabase-specialist** --edge-functions --real-time-integration
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing integration patterns in /src/lib/integrations/
- Understand existing budget category system structure
- Check notification service implementations
- Review existing reminder/email patterns
- Continue until you FULLY understand the integration architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed integration architecture plan
- Write integration test cases FIRST (TDD)
- Plan error handling for external service failures
- Consider rate limiting and retry logic
- Don't rush - proper planning prevents integration problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing integration patterns
- Use Ref MCP service examples as templates
- Implement with parallel agents
- Focus on reliability and fault tolerance

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] PaymentBudgetIntegration service connecting payments to budget categories
- [ ] PaymentReminderService for automated email/SMS reminders
- [ ] Integration middleware for payment status synchronization
- [ ] Budget category payment aggregation logic
- [ ] External service configuration and error handling
- [ ] Unit tests with >80% coverage
- [ ] Integration tests with mock external services

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
- FROM Team B: Payment API structure - Required for integration interfaces
- FROM Team A: Frontend integration requirements - Needed for data flow design

### What other teams NEED from you:
- TO Team B: Budget integration patterns - They need this for API design
- TO Team D: Integration service exports - Blocking their mobile integration
- TO Team E: Integration test patterns - They need this for comprehensive testing

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL INTEGRATIONS

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { integrationSchema } from '@/lib/validation/schemas';

// Secure external service calls
export class PaymentReminderService {
  private async sendEmailReminder(payment: Payment, recipient: string) {
    // Validate input data
    const validatedData = integrationSchema.parse({
      paymentId: payment.id,
      recipientEmail: recipient,
      amount: payment.amount
    });
    
    // Secure API call with error handling
    try {
      const response = await fetch(`${process.env.RESEND_API_URL}/emails`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: validatedData.recipientEmail,
          subject: `Payment Reminder: ${payment.payment_title}`,
          // Sanitized HTML template
          html: sanitizeHTML(generatePaymentReminderTemplate(validatedData))
        })
      });
      
      if (!response.ok) {
        throw new Error(`Resend API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      // Log error server-side only
      console.error('Email reminder failed:', error);
      throw new Error('Failed to send payment reminder');
    }
  }
}
```

### SECURITY CHECKLIST FOR EVERY INTEGRATION:
- [ ] **API Key Security**: Store all API keys in environment variables
- [ ] **Input Validation**: Validate all data before external service calls
- [ ] **Error Handling**: Never expose external service errors to users
- [ ] **Rate Limiting**: Implement proper rate limiting for external calls
- [ ] **Timeout Handling**: Set reasonable timeouts for all external requests
- [ ] **Data Sanitization**: Sanitize all data sent to external services

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. INTEGRATION WORKFLOW TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/payments"});

// Test budget integration
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test budget category aggregation
    const response = await fetch('/api/payments/budget-summary/test-couple-id');
    const data = await response.json();
    return { 
      status: response.status, 
      hasCategories: data.categories?.length > 0,
      totalAmount: data.totalAmount 
    };
  }`
});

// Test reminder service integration
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test reminder scheduling
    const response = await fetch('/api/payments/reminders/schedule', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentId: 'test-payment-id',
        reminderType: 'upcoming',
        deliveryMethod: 'email'
      })
    });
    return { status: response.status, scheduled: response.ok };
  }`
});

// 2. ERROR HANDLING TESTING
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test external service failure handling
    const response = await fetch('/api/payments/reminders/test-failure');
    return { 
      status: response.status,
      errorHandled: response.status !== 500 
    };
  }`
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
- [ ] Budget category integration working correctly
- [ ] Payment reminder service sending emails/SMS successfully
- [ ] Integration error handling gracefully managing failures
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Integration tests validating external service connections
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] External service calls complete within timeout limits
- [ ] Budget aggregation updates in real-time
- [ ] Reminder delivery confirmed and logged
- [ ] Fallback mechanisms working for service failures

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Integration: `/wedsync/src/lib/integrations/payment-budget-integration.ts`
- Integration: `/wedsync/src/lib/integrations/payment-reminder-service.ts`
- Integration: `/wedsync/src/lib/integrations/payment-sync-middleware.ts`
- Tests: `/wedsync/tests/integrations/payment-integrations.test.ts`
- Types: `/wedsync/src/types/payment-integrations.ts`

### Team Output:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch19/WS-165-team-c-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements  
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY