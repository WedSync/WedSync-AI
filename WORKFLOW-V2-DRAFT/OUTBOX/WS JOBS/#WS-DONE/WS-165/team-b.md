# TEAM B - ROUND 1: WS-165 - Payment Calendar - Backend APIs and Database

**Date:** 2025-08-29  
**Feature ID:** WS-165 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build robust payment schedule APIs, database operations, and reminder system backend for wedding payment deadline management  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding couple managing payment deadlines
**I want to:** View upcoming payment due dates on a calendar with automatic reminders
**So that:** I never miss important payment deadlines and can plan cash flow effectively

**Real Wedding Problem This Solves:**
Wedding couples struggle to track payment deadlines across multiple vendors - venue final payment due 30 days before wedding, photographer deposit due at booking, florist balance due 2 weeks prior. Missing a payment can jeopardize vendor contracts during critical planning phases. The Payment Calendar backend ensures reliable payment deadline tracking with automatic reminder scheduling, status updates when payments are made, and integration with budget systems to prevent financial surprises during the most stressful planning period.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Payment schedule CRUD API endpoints with vendor integration
- Payment status tracking system (upcoming/due/overdue/paid)
- Automated reminder scheduling system with notification triggers
- Database schema for payment_schedule and payment_reminders tables
- Integration with budget categories for financial planning
- Payment verification and status update workflows

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- UI Library: Untitled UI (MANDATORY - no other component libraries allowed)
- Animations: Magic UI (MANDATORY for all animations)
- Icons: Lucide React (ONLY icon library allowed)
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Team A (Frontend UI): Payment data APIs, status update endpoints
- Team C (Budget Integration): Budget category connections, financial planning data
- Database: payment_schedule, payment_reminders, budget_categories tables

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__Ref__ref_read_url("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 API routes database operations TypeScript"});
await mcp__Ref__ref_search_documentation({query: "Supabase database functions payment scheduling"});
await mcp__Ref__ref_search_documentation({query: "PostgreSQL recurring reminders automation patterns"});

// 3. UNDERSTAND EXISTING PATTERNS:
// Use Grep to find similar API implementations
// Use Read to examine existing payment-related backend code
// Use LS to understand database schema patterns
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
// For complex payment scheduling with reminder automation
mcp__sequential-thinking__sequential_thinking({
  thought: "Payment Calendar backend requires: payment CRUD APIs, automated reminder scheduling, status tracking with state transitions, integration with budget systems, notification triggers. Need to analyze database consistency, reminder reliability, and payment status workflow patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

// Continue with structured analysis for:
// - Payment schedule database design and indexing
// - Automated reminder system architecture
// - Payment status state machine logic
// - Integration patterns with budget and notification systems
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-ultra-hard --with-ref-docs --track-dependencies "Payment calendar backend API architecture"
2. **api-architect** --think-ultra-hard --use-loaded-docs --follow-existing-patterns "Payment scheduling APIs with Supabase patterns" 
3. **wedding-domain-expert** --think-ultra-hard --wedding-context --user-focused "Wedding payment deadline critical timing and automation"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices --validate-all-inputs "Payment data security and financial information protection"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs --accessibility-first "API testing with payment data validation"
6. **database-mcp-specialist** --database-design --migration-patterns --performance-optimization "Payment schedule database optimization"
7. **code-quality-guardian** --check-patterns --match-codebase-style --enforce-conventions "API security and validation compliance"

**AGENT INSTRUCTIONS:** "Use the Ref MCP documentation loaded in Step 1. Follow patterns found in existing code."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant API and database files first using Read tool
- Understand existing payment patterns and conventions using Grep
- Check integration points with budget and notification systems with LS and Read
- Review similar API implementations thoroughly
- Continue until you FULLY understand the payment backend architecture

### **PLAN PHASE (THINK ULTRA HARD!)**
- Create detailed implementation plan for payment APIs
- Write test cases FIRST (TDD approach)
- Plan error handling and edge cases for payment failures
- Consider performance and scalability for payment reminders
- Plan database migration and indexing strategies

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

### Round 1 (Core Backend Implementation):
- [ ] Payment schedule API routes with CRUD operations (`/wedsync/src/app/api/payments/schedule/route.ts`)
- [ ] Payment status update API endpoint (`/wedsync/src/app/api/payments/status/route.ts`) 
- [ ] Reminder scheduling system with automation (`/wedsync/src/lib/payments/reminder-scheduler.ts`)
- [ ] Database migration for payment_schedule table (`/wedsync/supabase/migrations/[timestamp]_payment_schedule.sql`)
- [ ] Database migration for payment_reminders table (`/wedsync/supabase/migrations/[timestamp]_payment_reminders.sql`)
- [ ] Unit tests with >85% coverage requirement (`/wedsync/tests/api/payments/payment-schedule.test.ts`)
- [ ] API integration tests (`/wedsync/tests/integration/payments/payment-apis.test.ts`)

### Round 2 (Enhancement & Polish):
- [ ] Enhanced reminder automation with notification integration
- [ ] Advanced payment filtering and search APIs
- [ ] Performance optimization with database query metrics
- [ ] Additional test coverage >90%
- [ ] Advanced API testing scenarios for edge cases

### Round 3 (Integration & Finalization):
- [ ] Full integration with all team outputs
- [ ] Complete E2E testing with evidence
- [ ] Performance validation with benchmarks
- [ ] Documentation updates with examples
- [ ] Production readiness validation

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team C: Budget category API integration patterns - Required for financial planning connections
- FROM Team A: Frontend component requirements for API contracts - Dependency for UI data needs

### What other teams NEED from you:
- TO Team A: Payment schedule API endpoints (/api/payments/schedule) - They need data for calendar display
- TO Team D: Mobile payment APIs for WedMe integration - Blocking their mobile payment features

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY IMPLEMENTATION

**EVERY API route MUST use the security framework:**

```typescript
// ❌ NEVER DO THIS (FOUND IN 305+ ROUTES):
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  const { data } = await supabase.from('table').insert(body); // DIRECT INSERT!
  return NextResponse.json(data);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { paymentScheduleSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  paymentScheduleSchema, // Zod schema validation
  async (request: NextRequest, validatedData) => {
    // validatedData is now safe and typed
    // Your implementation here
  }
);
```

### MANDATORY SECURITY CHECKLIST:
- [ ] **Authentication Check**: Use existing middleware from `/src/middleware.ts`
- [ ] **Input Validation**: MANDATORY Zod schemas from `/src/lib/validation/schemas.ts`
- [ ] **Payment Data Protection**: Encrypt sensitive payment information
- [ ] **CSRF Protection**: Automatic via middleware - DO NOT disable
- [ ] **SQL Injection Prevention**: Use parameterized queries ONLY
- [ ] **Payment Access Control**: Verify user can only access their own payment data
- [ ] **Financial Data Logging**: Audit all payment status changes
- [ ] **Error Handling**: NEVER expose payment system internals or financial details

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 API AND DATABASE VALIDATION:**

```javascript
// 1. API ENDPOINT TESTING
const paymentData = {
  vendor_name: "Test Photographer",
  payment_title: "Final Payment",
  amount: 2500.00,
  due_date: "2025-09-15",
  payment_type: "final_payment"
};

const response = await fetch('/api/payments/schedule', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(paymentData)
});

// 2. DATABASE INTEGRITY VALIDATION
await mcp__supabase__execute_sql({
  query: "SELECT COUNT(*) FROM payment_schedule WHERE couple_id = $1",
  params: [testCoupleId]
});

// 3. REMINDER AUTOMATION TESTING
const reminderTest = await mcp__playwright__browser_evaluate({
  function: `() => ({
    reminderCount: document.querySelectorAll('[data-testid="reminder-notification"]').length,
    upcomingPayments: document.querySelectorAll('[data-testid="due-soon"]').length,
    overduePayments: document.querySelectorAll('[data-testid="overdue"]').length
  })`
});

// 4. PAYMENT STATUS WORKFLOW TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/payments/status"});
```

**REQUIRED TEST COVERAGE:**
- [ ] Payment CRUD API endpoint validation
- [ ] Reminder scheduling automation testing
- [ ] Payment status transition workflows
- [ ] Database consistency and constraint validation
- [ ] Integration with budget category systems
- [ ] Error handling and edge case scenarios

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for this round 100% complete
- [ ] Tests written FIRST and passing with >85% coverage
- [ ] API integration tests validating all payment workflows
- [ ] Zero TypeScript errors (run npm run typecheck)
- [ ] Database migrations successfully applied

### Integration & Performance:
- [ ] All integration points working perfectly with Team A and C outputs
- [ ] Performance targets met (<200ms API response, reliable reminder scheduling)
- [ ] Database query optimization validated
- [ ] Security requirements 100% implemented
- [ ] Payment data protection verified

### Evidence Package Required:
- [ ] API endpoint testing results with all tests passing
- [ ] Database migration success proof
- [ ] Payment workflow testing evidence
- [ ] Performance metrics meeting targets
- [ ] Security validation proof
- [ ] Test coverage report >85%
- [ ] TypeScript compilation success proof

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/wedsync/src/app/api/payments/`
- Services: `/wedsync/src/lib/payments/`
- Tests: `/wedsync/tests/api/payments/`
- Types: `/wedsync/src/types/payments.ts`
- Migrations: `/wedsync/supabase/migrations/`

### ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-165.md
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/WS JOBS/WS-165/team-b-complete.md`
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