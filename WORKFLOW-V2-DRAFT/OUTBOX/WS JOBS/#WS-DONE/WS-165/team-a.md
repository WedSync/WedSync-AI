# TEAM A - ROUND 1: WS-165 - Payment Calendar - Frontend UI Components

**Date:** 2025-08-29  
**Feature ID:** WS-165 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive payment calendar UI with visual calendar interface, upcoming payment views, and payment status tracking  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple managing payment deadlines
**I want to:** View upcoming payment due dates on a calendar with automatic reminders
**So that:** I never miss important payment deadlines and can plan cash flow effectively

**Real Wedding Problem This Solves:**
Couples currently enter their wedding date 14 times across different vendor forms and track payment deadlines in multiple spreadsheets or notebooks. A photographer's final payment, venue balance, and florist deposit could all be due the same week, creating cash flow stress. The Payment Calendar creates a single visual interface showing all wedding payment deadlines with color-coded urgency, automatic reminders, and integration with budget categories to prevent payment surprises and financial stress during wedding planning.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Visual calendar showing payment due dates with color-coded status indicators
- Upcoming payments list with vendor details and payment amounts
- Payment status tracking (upcoming/due/overdue/paid) with visual indicators
- Integration with budget categories for complete financial planning view
- Mark as paid functionality with payment confirmation flow
- Responsive design for desktop and mobile payment management

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Library: Untitled UI (MANDATORY - no other component libraries allowed)
- Animations: Magic UI (MANDATORY for all animations)
- Icons: Lucide React (ONLY icon library allowed)
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Team B (Backend APIs): Payment schedule CRUD operations, status updates
- Team C (Budget Integration): Budget category connections, cash flow planning
- Database: payment_schedule, payment_reminders, budget_categories tables

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__Ref__ref_read_url("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router calendar components TypeScript"});
await mcp__Ref__ref_search_documentation({query: "React 19 calendar interface responsive design patterns"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS calendar grid layout wedding themes"});

// 3. UNDERSTAND EXISTING PATTERNS:
// Use Grep to find similar calendar implementations
// Use Read to examine existing payment-related components
// Use LS to understand wedding UI component structure
```

**WHY THIS ORDER MATTERS:**
- Ref MCP prevents using deprecated APIs (libraries change frequently!)
- UI Style Guides ensure consistent design patterns
- Understanding existing patterns prevents reinventing solutions
- Teams work with current, accurate knowledge

---

## 🧠 STEP 1.5: SEQUENTIAL THINKING FOR COMPLEX FEATURES (WHEN NEEDED)

**Use Sequential Thinking MCP for complex features requiring structured analysis:**

```typescript
// For complex calendar interface with multiple payment states
mcp__sequential-thinking__sequential_thinking({
  thought: "Payment Calendar requires: visual calendar grid, payment status indicators, upcoming payments list, mark-as-paid workflows, mobile responsiveness. Need to analyze how calendar state management works with payment data updates and visual feedback patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

// Continue with structured analysis for:
// - Calendar component architecture and state management
// - Payment status visual design and color coding
// - Mobile calendar interface optimization
// - Integration patterns with backend payment data
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-ultra-hard --with-ref-docs --track-dependencies "Payment calendar UI component architecture"
2. **react-ui-specialist** --think-ultra-hard --use-loaded-docs --follow-existing-patterns "Calendar interface with Untitled UI patterns" 
3. **wedding-domain-expert** --think-ultra-hard --wedding-context --user-focused "Wedding payment deadline stress and planning workflows"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices --validate-all-inputs "Payment data display security and privacy"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs --accessibility-first "Calendar component testing with payment interactions"
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab --comprehensive-validation "Visual testing of calendar interface and payment flows"
7. **code-quality-guardian** --check-patterns --match-codebase-style --enforce-conventions "Untitled UI component compliance for calendar design"

**AGENT INSTRUCTIONS:** "Use the Ref MCP documentation loaded in Step 1. Follow patterns found in existing code."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant calendar and payment files first using Read tool
- Understand existing payment patterns and conventions using Grep
- Check integration points with budget systems with LS and Read
- Review similar calendar implementations thoroughly
- Continue until you FULLY understand the payment and calendar codebase

### **PLAN PHASE (THINK ULTRA HARD!)**
- Create detailed implementation plan for payment calendar
- Write test cases FIRST (TDD approach)
- Plan error handling and edge cases for payment failures
- Consider accessibility and performance for calendar interactions
- Plan responsive design and mobile calendar optimization

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation (TDD mandatory)
- Follow existing patterns from loaded documentation
- Use Ref MCP examples as templates
- Implement with parallel agents working together
- Focus on completeness and quality over speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests and ensure 100% pass rate
- Verify with Playwright comprehensive testing
- Create complete evidence package
- Generate detailed reports with metrics
- Only mark complete when ACTUALLY complete with proof

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Calendar UI Implementation):
- [ ] PaymentCalendar component with visual calendar grid (`/wedsync/src/components/payments/PaymentCalendar.tsx`)
- [ ] UpcomingPaymentsList showing next payment deadlines (`/wedsync/src/components/payments/UpcomingPaymentsList.tsx`) 
- [ ] PaymentStatusIndicator component for visual status display (`/wedsync/src/components/payments/PaymentStatusIndicator.tsx`)
- [ ] MarkAsPaidModal for payment confirmation workflow (`/wedsync/src/components/payments/MarkAsPaidModal.tsx`)
- [ ] Payment calendar page layout integration (`/wedsync/src/app/payments/calendar/page.tsx`)
- [ ] Unit tests with >85% coverage requirement (`/wedsync/tests/payments/payment-calendar.test.tsx`)
- [ ] Basic Playwright tests for calendar user flows (`/wedsync/tests/e2e/payment-calendar.spec.ts`)

### Round 2 (Enhancement & Polish):
- [ ] Enhanced mobile calendar interface optimization
- [ ] Advanced payment filtering and search capabilities
- [ ] Performance optimization with calendar rendering metrics
- [ ] Additional test coverage >90%
- [ ] Advanced Playwright scenarios for payment workflows

### Round 3 (Integration & Finalization):
- [ ] Full integration with all team outputs
- [ ] Complete E2E testing with evidence
- [ ] Performance validation with benchmarks
- [ ] Documentation updates with examples
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Payment schedule API endpoints (/api/payments/schedule) - Required for calendar data
- FROM Team C: Budget category integration APIs - Dependency for financial planning display

### What other teams NEED from you:
- TO Team D: Calendar component exports for WedMe mobile integration - They need UI components for mobile app
- TO Team E: Testing interfaces for validation - Blocking their comprehensive payment testing workflows

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY IMPLEMENTATION

**EVERY component handling payment data MUST use secure patterns:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { PaymentDisplayProps } from '@/types/payments';
import { sanitizePaymentData } from '@/lib/security/payment-utils';

export function PaymentCalendar({ payments }: PaymentDisplayProps) {
  const sanitizedPayments = useMemo(() => 
    payments.map(payment => sanitizePaymentData(payment)), 
    [payments]
  );
  
  // Use sanitized data only
  return <CalendarGrid payments={sanitizedPayments} />;
}
```

### MANDATORY SECURITY CHECKLIST:
- [ ] **Payment Data Sanitization**: All payment amounts and vendor info sanitized before display
- [ ] **Input Validation**: MANDATORY validation for mark-as-paid actions
- [ ] **Session Verification**: Verify user can only see their own payment data
- [ ] **CSRF Protection**: Automatic via middleware - DO NOT disable
- [ ] **XSS Prevention**: Sanitize ALL payment descriptions and vendor names
- [ ] **Error Handling**: NEVER expose payment system internals in error messages

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION:**

```javascript
// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/payments/calendar"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for analysis

// 2. CALENDAR INTERACTION TESTING
await mcp__playwright__browser_click({
  element: "Calendar day with payment due",
  ref: "[data-testid='calendar-day-2025-09-15']"
});

await mcp__playwright__browser_click({
  element: "Mark as paid button",
  ref: "[data-testid='mark-paid-btn']"
});

// 3. PAYMENT CALENDAR PERFORMANCE MEASUREMENT
const calendarMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    calendarRenderTime: performance.mark('calendar-render-end') - performance.mark('calendar-render-start'),
    paymentCount: document.querySelectorAll('[data-testid="payment-item"]').length,
    calendarDaysVisible: document.querySelectorAll('[data-testid="calendar-day"]').length,
    upcomingPaymentsCount: document.querySelectorAll('[data-testid="upcoming-payment"]').length
  })`
});

// 4. RESPONSIVE CALENDAR TESTING
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `payment-calendar-${width}px.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Calendar navigation and date selection
- [ ] Payment status visual indicators
- [ ] Mark as paid workflow completion
- [ ] Mobile calendar interface usability
- [ ] Upcoming payments list interaction
- [ ] Payment deadline reminder display

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round 100% complete
- [ ] Tests written FIRST and passing with >85% coverage
- [ ] Playwright tests validating all calendar user flows
- [ ] Zero TypeScript errors (run npm run typecheck)
- [ ] Zero console errors (verified in browser)

### Integration & Performance:
- [ ] All integration points working perfectly with Team B and C outputs
- [ ] Performance targets met (<1s calendar load, <200ms payment updates)
- [ ] Accessibility validation passed (WCAG 2.1 AA)
- [ ] Security requirements 100% implemented
- [ ] Works flawlessly on all breakpoints including mobile payment management

### Evidence Package Required:
- [ ] Screenshot proof of working payment calendar
- [ ] Video walkthrough of complete payment management workflow
- [ ] Playwright test results with all tests passing
- [ ] Performance metrics meeting targets
- [ ] Console error-free proof screenshot
- [ ] Test coverage report >85%
- [ ] TypeScript compilation success proof

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/payments/`
- Calendar Pages: `/wedsync/src/app/payments/calendar/`
- Tests: `/wedsync/tests/payments/`
- Types: `/wedsync/src/types/payments.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/WS-165/team-a-complete.md`
- **Include:** Feature ID (WS-165) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND

### CRITICAL: Use Standard Team Output Template
**Must include ALL sections with detailed evidence**

### MANDATORY SECTIONS:
1. **Executive Summary** (2-3 paragraphs with metrics)
2. **Technical Implementation Details** (with code examples)
3. **Testing Evidence** (with actual test results)
4. **Performance Metrics** (with measured values)
5. **Integration Points** (with specific API contracts)
6. **Security Validation** (with checklist completion)
7. **Evidence Package** (screenshots, videos, reports)
8. **Next Steps** (for following rounds)

---

## ⚠️ CRITICAL WARNINGS

- Do NOT modify files assigned to other teams
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- Do NOT use forbidden UI libraries (only Untitled UI + Magic UI)
- REMEMBER: All 5 teams work in parallel on SAME feature
- WAIT: Do not start next round until ALL teams complete current round

---

END OF TEMPLATE STRUCTURE