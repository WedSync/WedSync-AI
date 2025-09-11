# TEAM D - ROUND 1: WS-165 - Payment Calendar - WedMe Mobile-First Implementation

**Date:** 2025-08-25  
**Feature ID:** WS-165 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build mobile-optimized payment calendar for WedMe couple-facing platform
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple using WedMe app on mobile devices
**I want to:** View and manage payment deadlines on my phone with easy touch interactions
**So that:** I can track wedding payments while on-the-go and never miss important deadlines

**Real Wedding Problem This Solves:**
Wedding couples are constantly mobile - at vendor meetings, venue visits, and planning sessions. They need to quickly check payment deadlines and mark payments as complete from their phones. This mobile-first implementation ensures the payment calendar works flawlessly on touch devices with intuitive gestures and offline-capable data sync.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Mobile-first responsive payment calendar
- Touch-optimized calendar navigation
- Offline-capable payment data sync
- Mobile payment marking workflow
- Push notification integration for reminders

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Mobile: PWA features, Touch optimization, Service Worker

**Integration Points:**
- WedMe Platform: Integration with couple portal features
- Payment APIs: Mobile-optimized API consumption
- Push Notifications: Payment reminder delivery to mobile
- Offline Storage: Local payment data caching

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
  
await mcp__Ref__ref_search_documentation({query: "next pwa service-worker latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react touch-events mobile latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss mobile-first responsive latest documentation"});

// For mobile optimization:
await mcp__Ref__ref_search_documentation({query: "notification push-notifications latest documentation"});
await mcp__Ref__ref_search_documentation({query: "service worker offline-sync latest documentation"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("mobile", "src/components", true);
await mcp__serena__get_symbols_overview("src/components/mobile");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "WedMe payment calendar mobile"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Mobile-first component expertise"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "PWA and mobile optimization" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --mobile-testing --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Ref MCP docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing WedMe mobile components
- Understand touch interaction patterns in codebase
- Check PWA implementation and service worker setup
- Review mobile calendar implementations
- Continue until you FULLY understand mobile architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed mobile-first component architecture
- Write touch interaction test cases FIRST (TDD)
- Plan offline data sync strategy
- Consider mobile performance optimization
- Don't rush - mobile UX requires careful planning

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing mobile component patterns
- Use Ref MCP mobile examples as templates
- Implement with parallel agents
- Focus on touch usability and performance

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] MobilePaymentCalendar component with touch-optimized navigation
- [ ] MobilePaymentList with swipe-to-mark-paid gestures
- [ ] Mobile-responsive calendar grid (works on 375px+ screens)
- [ ] Touch-friendly payment detail modal
- [ ] Mobile payment status indicators and quick actions
- [ ] Unit tests with >80% coverage focusing on mobile interactions
- [ ] Playwright mobile device testing

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
- FROM Team A: PaymentCalendar component base - Required for mobile adaptation
- FROM Team B: Payment API endpoints - Needed for mobile data consumption

### What other teams NEED from you:
- TO Team E: Mobile test patterns - They need this for comprehensive mobile testing
- TO Team C: Mobile integration requirements - Blocking their notification integration

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR MOBILE

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { mobilePaymentSchema } from '@/lib/validation/schemas';

// Secure mobile API consumption
export function MobilePaymentCalendar({ coupleId }: { coupleId: string }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  
  // Secure data fetching with offline handling
  const fetchPayments = async () => {
    try {
      const response = await fetch(`/api/payments/${coupleId}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': await getCsrfToken(),
          'x-device-type': 'mobile'
        },
      });
      
      if (!response.ok) {
        // Handle offline gracefully
        if (!navigator.onLine) {
          return loadOfflinePayments(coupleId);
        }
        throw new Error('Failed to fetch payments');
      }
      
      const data = await response.json();
      // Cache for offline use
      await cachePaymentsOffline(coupleId, data);
      return data;
    } catch (error) {
      console.error('Mobile payment fetch failed:', error);
      // Fallback to cached data
      return await loadOfflinePayments(coupleId);
    }
  };
  
  // Secure payment marking with optimistic updates
  const markPaymentPaid = async (paymentId: string, amount: number) => {
    // Optimistic update for mobile responsiveness
    setPayments(prev => prev.map(p => 
      p.id === paymentId ? { ...p, status: 'paid' } : p
    ));
    
    try {
      const response = await fetch(`/api/payments/${paymentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': await getCsrfToken(),
        },
        body: JSON.stringify({ status: 'paid', actual_amount_paid: amount })
      });
      
      if (!response.ok) {
        // Revert optimistic update
        setPayments(prev => prev.map(p => 
          p.id === paymentId ? { ...p, status: 'upcoming' } : p
        ));
        throw new Error('Failed to update payment');
      }
    } catch (error) {
      // Queue for offline sync if needed
      await queueOfflineAction('mark_paid', { paymentId, amount });
    }
  };
}
```

### SECURITY CHECKLIST FOR MOBILE:
- [ ] **Touch Input Validation**: Validate all touch gestures and inputs
- [ ] **Offline Data Security**: Encrypt cached payment data locally
- [ ] **CSRF Protection**: Include CSRF tokens in all API calls
- [ ] **Device Authentication**: Verify device permissions for payment actions
- [ ] **Secure Storage**: Use secure storage for offline payment caching

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. MOBILE DEVICE TESTING
await mcp__playwright__browser_resize({width: 375, height: 812}); // iPhone 12
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/payments"});
const mobileSnapshot = await mcp__playwright__browser_snapshot();

// 2. TOUCH INTERACTION TESTING
await mcp__playwright__browser_click({
  element: "Payment item for touch interaction",
  ref: "[data-payment-id='test-mobile-payment']"
});

// Test swipe gesture simulation
await mcp__playwright__browser_drag({
  startElement: "Payment item",
  startRef: "[data-payment-id='swipe-test']",
  endElement: "Mark paid area",
  endRef: "[data-swipe-target='paid']"
});

// 3. RESPONSIVE BREAKPOINT TESTING
const mobileBreakpoints = [375, 414, 360]; // iPhone SE, iPhone 12, Android
for (const width of mobileBreakpoints) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({
    filename: `mobile-payment-calendar-${width}px.png`
  });
  
  // Verify touch targets are large enough (minimum 44px)
  const touchTargets = await mcp__playwright__browser_evaluate({
    function: `() => {
      const targets = Array.from(document.querySelectorAll('[data-touch-target]'));
      return targets.map(el => ({
        width: el.offsetWidth,
        height: el.offsetHeight,
        accessible: el.offsetWidth >= 44 && el.offsetHeight >= 44
      }));
    }`
  });
}

// 4. OFFLINE FUNCTIONALITY TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate offline mode
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    window.dispatchEvent(new Event('offline'));
  }`
});

await mcp__playwright__browser_wait_for({text: "Offline mode"});
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
- [ ] Mobile payment calendar works flawlessly on 375px+ screens
- [ ] Touch interactions are responsive and intuitive
- [ ] Offline payment data caching working correctly
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Mobile-specific Playwright tests validating touch interactions
- [ ] Zero TypeScript errors
- [ ] Zero console errors on mobile devices

### Mobile UX & Performance:
- [ ] Touch targets meet minimum 44px accessibility requirements
- [ ] Payment calendar loads in <1s on mobile networks
- [ ] Touch gestures work smoothly (swipe-to-mark-paid)
- [ ] Offline mode gracefully handles network failures
- [ ] Mobile calendar navigation is intuitive and fast

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Mobile: `/wedsync/src/components/mobile/MobilePaymentCalendar.tsx`
- Mobile: `/wedsync/src/components/mobile/MobilePaymentList.tsx`
- Mobile: `/wedsync/src/components/mobile/MobilePaymentItem.tsx`
- Tests: `/wedsync/tests/mobile/mobile-payment-calendar.test.ts`
- Types: `/wedsync/src/types/mobile-payments.ts`
- PWA: `/wedsync/src/lib/pwa/payment-offline-sync.ts`

### Team Output:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch19/WS-165-team-d-round-1-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore mobile accessibility requirements  
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY