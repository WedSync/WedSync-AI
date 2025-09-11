# TEAM D - ROUND 1: WS-059 - Budget Tracker - Core Implementation

**Date:** 2025-08-22  
**Feature ID:** WS-059 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive wedding budget tracking system with category management and spending analysis  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Couple with a $25,000 wedding budget
**I want to:** Track actual spending vs. planned budget by category
**So that:** I stay on budget and avoid the 30% average wedding overspend

**Real Wedding Problem This Solves:**
Mike and Sarah set a $25,000 budget. They've spent $18,500 with venue ($8,000), photographer ($3,500), and catering ($7,000). The tracker shows they're 12% under budget with flowers and decorations still to book. They reallocate $500 from their contingency to upgrade flowers, staying exactly on budget.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Budget vs. actual tracking with visual progress indicators
- Category-based organization with reallocation support
- Integration with vendor contracts and payments
- Transaction recording and payment tracking
- Overspend alerts and budget warnings
- Visual charts showing spending patterns
- Vendor payment scheduling
- Budget reallocation between categories
- Export functionality for financial planning

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Charts: Recharts or Chart.js for budget visualizations
- Currency: Proper decimal handling for money
- Real-time: Live budget updates

**Integration Points:**
- Guest Database: Headcount affects per-person costs from Team A
- Task System: Budget-related tasks from Team C
- RSVP System: Final headcount impacts catering costs from Team B
- Vendor Management: Payment tracking and contracts

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
// Think hard about what documentation you need for budget tracking
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "forms number-input validation", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database decimal-types", 3000);
await mcp__context7__get-library-docs("/recharts/recharts", "pie-charts progress-bars", 2000);

// For this specific feature, also load:
await mcp__context7__get-library-docs("/decimal.js/decimal", "currency-math", 2000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "number-validation", 2000);
await mcp__context7__get-library-docs("/date-fns/date-fns", "date-calculations", 1500);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("couples", "", true);
await mcp__serena__get_symbols_overview("src/components");
await mcp__serena__search_for_pattern("budget|money|payment", true);

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build budget tracking with financial calculations"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Create budget management UI with charts"
3. **database-mcp-specialist** --think-ultra-hard --follow-existing-patterns "Design budget schema with decimal precision" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Secure financial data handling"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **data-analytics-engineer** --chart-focus "Budget visualization and reporting"
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for financial data."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing couples/user management patterns
- Understand current form implementations
- Check how decimal numbers are handled in the system
- Review similar financial UI components
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Design budget database schema per specification
- Plan currency handling and decimal precision
- Design category reallocation algorithm
- Plan chart visualization strategy
- Consider edge cases (negative budgets, currency conversion)

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing UI patterns from SAAS-UI-STYLE-GUIDE.md
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright (budget entry, calculations, charts)
- Test currency calculations for accuracy
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database schema implementation (budget_categories, budget_transactions tables)
- [ ] Budget Dashboard at `/src/components/wedme/budget/BudgetDashboard.tsx`
- [ ] Category Management UI with budget allocation
- [ ] Transaction entry form for expenses and payments
- [ ] Visual progress indicators for each category
- [ ] Budget vs. actual comparison charts
- [ ] Overspend alerts and warnings
- [ ] Budget summary with total calculations
- [ ] Mobile-responsive budget interface
- [ ] Currency formatting and validation
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for budget flow

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Guest count data for per-person calculations (WS-056)

### What other teams NEED from you:
- TO Team A: Budget impact data for guest modifications
- TO Team B: Budget allocated for catering based on RSVP counts
- TO Team C: Budget-related task creation and tracking
- TO Team E: Budget display widgets for website

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Financial data protected by couple authentication
- [ ] Decimal precision for currency calculations (no floating point errors)
- [ ] Input validation for monetary amounts
- [ ] SQL injection prevention
- [ ] XSS prevention in budget descriptions
- [ ] Access control for budget viewing/editing
- [ ] Audit logging for budget modifications
- [ ] Secure handling of vendor payment information

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/budget"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for budget interface - zero ambiguity!

// 2. BUDGET SETUP FLOW
await mcp__playwright__browser_type({
  element: "Total budget input",
  ref: "[data-testid='total-budget']",
  text: "25000"
});
await mcp__playwright__browser_click({
  element: "Set Budget button",
  ref: "[data-testid='set-budget']"
});
await mcp__playwright__browser_wait_for({text: "$25,000.00 total budget"});

// 3. CATEGORY ALLOCATION TEST
await mcp__playwright__browser_click({
  element: "Venue category",
  ref: "[data-testid='category-venue']"
});
await mcp__playwright__browser_type({
  element: "Venue budget input",
  ref: "[data-testid='venue-budget']",
  text: "8000"
});
await mcp__playwright__browser_click({
  element: "Save allocation",
  ref: "[data-testid='save-venue-allocation']"
});
await mcp__playwright__browser_wait_for({text: "Venue: $8,000 allocated"});

// 4. EXPENSE ENTRY TEST
await mcp__playwright__browser_click({
  element: "Add expense button",
  ref: "[data-testid='add-expense']"
});
await mcp__playwright__browser_type({
  element: "Vendor name",
  ref: "[data-testid='vendor-name']",
  text: "Paradise Gardens Venue"
});
await mcp__playwright__browser_type({
  element: "Expense amount",
  ref: "[data-testid='expense-amount']",
  text: "8000"
});
await mcp__playwright__browser_select_option({
  element: "Expense category",
  ref: "[data-testid='expense-category']",
  values: ["venue"]
});
await mcp__playwright__browser_click({
  element: "Record expense",
  ref: "[data-testid='record-expense']"
});
await mcp__playwright__browser_wait_for({text: "Expense recorded: $8,000.00"});

// 5. BUDGET PROGRESS VALIDATION
await mcp__playwright__browser_wait_for({text: "Venue: 100% spent"});
await mcp__playwright__browser_wait_for({text: "Total: 32% of budget used"});

// 6. OVERSPEND ALERT TEST
await mcp__playwright__browser_type({
  element: "Photography budget",
  ref: "[data-testid='photography-budget']",
  text: "2000"
});
await mcp__playwright__browser_type({
  element: "Photography expense",
  ref: "[data-testid='photography-expense']",
  text: "2500"
});
await mcp__playwright__browser_click({
  element: "Record expense",
  ref: "[data-testid='record-photography-expense']"
});
await mcp__playwright__browser_wait_for({text: "⚠️ Photography over budget by $500"});

// 7. BUDGET REALLOCATION TEST
await mcp__playwright__browser_click({
  element: "Reallocate budget",
  ref: "[data-testid='reallocate-button']"
});
await mcp__playwright__browser_type({
  element: "Move from contingency",
  ref: "[data-testid='move-from-contingency']",
  text: "500"
});
await mcp__playwright__browser_type({
  element: "Move to photography",
  ref: "[data-testid='move-to-photography']",
  text: "500"
});
await mcp__playwright__browser_click({
  element: "Confirm reallocation",
  ref: "[data-testid='confirm-reallocation']"
});
await mcp__playwright__browser_wait_for({text: "Budget reallocated successfully"});

// 8. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `budget-${width}px.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Budget setup and category allocation
- [ ] Expense entry and calculation accuracy
- [ ] Progress indicators and visual charts
- [ ] Overspend alerts and warnings
- [ ] Budget reallocation functionality
- [ ] Mobile responsive interface

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for Round 1 complete
- [ ] Budget calculations mathematically accurate
- [ ] Category allocation and reallocation working
- [ ] Expense tracking functional
- [ ] Visual progress indicators updating
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integrates with guest count data from Team A
- [ ] Budget calculations <200ms response time
- [ ] Chart rendering efficient
- [ ] Currency formatting consistent
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot of budget dashboard
- [ ] Screenshot of category allocation
- [ ] Screenshot of expense tracking
- [ ] Screenshots of progress charts
- [ ] Test results and coverage
- [ ] Performance metrics

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Dashboard: `/wedsync/src/components/wedme/budget/BudgetDashboard.tsx`
- Category Manager: `/wedsync/src/components/wedme/budget/CategoryManager.tsx`
- Expense Entry: `/wedsync/src/components/wedme/budget/ExpenseEntry.tsx`
- Budget Chart: `/wedsync/src/components/wedme/budget/BudgetChart.tsx`
- Progress Indicator: `/wedsync/src/components/wedme/budget/ProgressIndicator.tsx`
- API Routes: `/wedsync/src/app/api/budget/route.ts`
- Categories API: `/wedsync/src/app/api/budget/categories/route.ts`
- Transactions API: `/wedsync/src/app/api/budget/transactions/route.ts`
- Database: `/wedsync/supabase/migrations/XXX_budget_tracker.sql`
- Currency Utils: `/wedsync/src/lib/utils/currency.ts`
- Tests: `/wedsync/tests/wedme/budget/`
- Types: `/wedsync/src/types/budget.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch4/WS-059-batch4-round-1-complete.md`
- **Include:** Feature ID (WS-059) in all filenames
- **Save in:** batch4 folder (NOT in CORRECT folder)
- **After completion:** Update senior dev that Round 1 is complete

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch4/WS-059-batch4-round-1-complete.md`

Must include:
1. Summary of budget tracker system built
2. Files created/modified list
3. Test results and coverage
4. Screenshots/evidence
5. Currency calculation accuracy validation
6. Integration points ready
7. Any blockers or issues

---

## ⚠️ CRITICAL WARNINGS
- Do NOT build guest list UI (Team A's WS-056)
- Do NOT implement RSVP system (Team B's WS-057)
- Do NOT build task delegation (Team C's WS-058)
- Do NOT create website builder (Team E's WS-060)
- FOCUS ONLY on budget tracking and financial management
- REMEMBER: All 5 teams work in PARALLEL - no overlapping work

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Budget dashboard functional
- [ ] Category allocation working
- [ ] Expense tracking accurate
- [ ] Progress indicators updating
- [ ] Charts and visualizations working
- [ ] Currency calculations precise
- [ ] All tests passing
- [ ] Security validated
- [ ] Performance targets met
- [ ] Code committed
- [ ] Report created

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY