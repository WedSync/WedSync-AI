# TEAM E - ROUND 1: Pain Point Wizard - Onboarding Problem Identification & Solution Mapping

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Build interactive pain point wizard that identifies vendor problems and maps them to WedSync solutions  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Source:** /CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/01-Onboarding/04-pain-point-wizard md.md
- Create multi-step wizard for pain point identification
- Build solution mapping engine that connects problems to WedSync features
- Implement personalized onboarding recommendations
- Add progress tracking and completion status
- Integration with vendor type selection for personalized questions

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- State Management: React Context for wizard state

**Integration Points:**
- **Vendor Type Selection**: Personalized questions based on vendor type from Team B
- **Onboarding Flow**: Step 3 in the onboarding sequence after vendor type selection
- **Feature Recommendations**: Maps pain points to specific WedSync feature sets

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("react");
await mcp__context7__get-library-docs("/vercel/next.js", "client-components", 5000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "multi-step-forms", 3000);
await mcp__context7__get-library-docs("/framer/motion", "step-transitions", 2000);

// Multi-step form libraries:
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "form-layouts", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("onboarding", "src/app", true);
await mcp__serena__get_symbols_overview("src/components/onboarding");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Pain point wizard implementation"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Multi-step form components"
3. **ui-ux-designer** --think-ultra-hard --follow-existing-patterns "Onboarding user experience" 
4. **wedding-domain-expert** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing onboarding flow components
- Understand vendor type data structure from Team B
- Check current form validation patterns
- Review wedding industry pain points and solutions

### **PLAN PHASE (THINK HARD!)**
- Design multi-step wizard component architecture
- Plan pain point to solution mapping algorithm
- Write test cases FIRST (TDD)
- Design wizard state management system

### **CODE PHASE (PARALLEL AGENTS!)**
- Create PainPointWizard main component
- Build individual wizard steps with validation
- Implement solution recommendation engine
- Add progress tracking and completion flow

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Implementation:
- [ ] PainPointWizard main component with step navigation
- [ ] WizardStep components for each pain point category
- [ ] SolutionMapper service for connecting problems to features
- [ ] ProgressTracker component with completion status
- [ ] PainPointResults component with personalized recommendations
- [ ] Wizard state management with React Context
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright user flow tests

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Vendor type data structure - Required for personalized questions
- FROM Team A: Landing page navigation patterns - Needed for onboarding flow

### What other teams NEED from you:
- TO Team A: Pain point data for landing page personalization - They need this for marketing
- TO Team D: Wedding-specific pain points - Blocking their WedMe integration

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Pain point responses stored securely with user consent
- [ ] No sensitive business data exposed in client code
- [ ] Input sanitization for all wizard text responses
- [ ] Rate limiting on wizard submission endpoints
- [ ] GDPR compliance for collecting business problem data
- [ ] Session management for incomplete wizard states
- [ ] Audit logging for completed wizard sessions

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. MULTI-STEP WIZARD NAVIGATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/onboarding/pain-points"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. PAIN POINT SELECTION TESTING
await mcp__playwright__browser_click({
  element: "Client communication pain point",
  ref: "input[data-testid='pain-client-communication']"
});
await mcp__playwright__browser_click({
  element: "Next step button",
  ref: "button[data-testid='wizard-next']"
});
await mcp__playwright__browser_wait_for({text: "Step 2 of 4"});

// 3. SOLUTION RECOMMENDATION TESTING
await mcp__playwright__browser_click({
  element: "Complete wizard button",
  ref: "button[data-testid='wizard-complete']"
});
await mcp__playwright__browser_wait_for({text: "Recommended Solutions"});
await mcp__playwright__browser_snapshot();

// 4. WIZARD STATE PERSISTENCE TESTING
await mcp__playwright__browser_navigate({url: "/onboarding/pain-points?step=2"});
await mcp__playwright__browser_wait_for({text: "Step 2 of 4"});
// Verify previous selections are maintained

// 5. RESPONSIVE WIZARD TESTING
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-wizard.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Multi-step navigation works correctly
- [ ] Pain point selections save and persist
- [ ] Solution recommendations are accurate
- [ ] Progress tracking displays correctly
- [ ] Wizard completion flow functional

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 1 deliverables complete
- [ ] Multi-step wizard functional with validation
- [ ] Solution mapping engine working correctly
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### UX & Integration:
- [ ] Wizard completes in <5 minutes for users
- [ ] Progress clearly indicated throughout
- [ ] Solution recommendations relevant and helpful
- [ ] Mobile-responsive wizard experience
- [ ] Integrates with vendor type selection data

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Main page: `/wedsync/src/app/(onboarding)/pain-points/page.tsx`
- Components: `/wedsync/src/components/onboarding/wizard/`
- Services: `/wedsync/src/lib/onboarding/solution-mapper.ts`
- Types: `/wedsync/src/types/pain-point.ts`
- Tests: `/wedsync/tests/onboarding/wizard/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-e-round-1-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-e-round-1-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-e-round-1-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip wizard state management implementation
- Do NOT ignore accessibility for multi-step forms
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY