# TEAM A - ROUND 2: Vendor Type Selection Frontend - UI Components & Integration

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Build responsive vendor type selection UI components that integrate with Team B's backend customization engine  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- **Source:** /WORKFLOW-V2-DRAFT/02-FEATURE-DEVELOPMENT/output/2025-08-20/vendor-type-selection-technical.md
- Build VendorTypeGrid and VendorTypeCard components from spec
- Integrate with Team B's vendor customization API endpoints
- Implement hover effects and feature previews
- Add loading states and error handling for API calls
- Create responsive design for all screen sizes

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Team B's vendor customization API endpoints
- Testing: Playwright MCP, Vitest
- Icons: Heroicons for vendor type visualization

**Integration Points:**
- **Team B Backend**: POST /api/onboarding/vendor-type endpoint
- **Team B Backend**: GET /api/vendor-types/templates/[type] endpoint
- **Team E Components**: Pain point wizard navigation integration

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("heroicons");
await mcp__context7__get-library-docs("/vercel/next.js", "client-components", 5000);
await mcp__context7__get-library-docs("/heroicons/react", "icon-usage", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "hover-effects", 2000);

// Frontend integration libraries:
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "form-state", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW Team B's work before integrating:
await mcp__serena__find_symbol("vendor-type", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/types");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Vendor selection UI"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Interactive card components"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "API integration frontend" 
4. **ui-ux-designer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Integrate with Team B's API."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 2

### Enhancement & Integration:
- [ ] VendorTypeGrid component with 9 vendor types (photographer, venue, caterer, etc.)
- [ ] VendorTypeCard component with hover effects and feature previews
- [ ] Integration with Team B's customization API endpoints
- [ ] Loading states and error handling for API calls
- [ ] Mobile-responsive design with touch interactions
- [ ] Feature tooltip system for vendor type previews
- [ ] Advanced Playwright tests with API integration
- [ ] Error boundary components for failed API calls

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (CRITICAL - VERIFY FIRST!):
- FROM Team B: API endpoints /api/onboarding/vendor-type and templates - MUST BE WORKING
- FROM Team E: Pain point wizard navigation - Required for onboarding flow

### What other teams NEED from you:
- TO Team C: Vendor type component patterns - They need this for client integration
- TO Team D: Vendor selection state - Blocking their wedding field customization

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] API calls include proper authentication headers
- [ ] No vendor customization data cached in localStorage without encryption
- [ ] Input validation on vendor type selection
- [ ] CSRF protection on form submissions
- [ ] No sensitive vendor data exposed in component props
- [ ] Error messages don't leak backend information
- [ ] Rate limiting graceful degradation in UI

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. VENDOR TYPE GRID RENDERING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/onboarding/vendor-type"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. VENDOR TYPE SELECTION WITH API INTEGRATION
await mcp__playwright__browser_click({
  element: "Photographer card",
  ref: "[data-testid='vendor-type-photographer']"
});
await mcp__playwright__browser_wait_for({text: "Setting up your personalized experience"});
await mcp__playwright__browser_wait_for({textGone: "Setting up"});

// 3. FEATURE PREVIEW HOVER TESTING
await mcp__playwright__browser_hover({
  element: "Venue card",
  ref: "[data-testid='vendor-type-venue']"
});
await mcp__playwright__browser_wait_for({text: "Capacity management"});
await mcp__playwright__browser_snapshot();

// 4. ERROR HANDLING TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate API failure
    fetch = () => Promise.reject(new Error('Network error'));
  }`
});
await mcp__playwright__browser_click({
  element: "Caterer card",
  ref: "[data-testid='vendor-type-caterer']"
});
await mcp__playwright__browser_wait_for({text: "Something went wrong"});

// 5. RESPONSIVE DESIGN VALIDATION
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-vendor-selection.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] All 9 vendor types render with correct icons
- [ ] API integration successful with loading states
- [ ] Feature previews show on hover
- [ ] Error handling displays appropriate messages
- [ ] Responsive design works on all screen sizes

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 2 deliverables complete
- [ ] API integration working with Team B's endpoints
- [ ] Responsive design functional
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Vendor selection saves and triggers customization
- [ ] Loading states provide good UX during API calls
- [ ] Feature previews enhance vendor type understanding
- [ ] Performance targets met (<1s selection response)
- [ ] Accessibility compliance maintained

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Main page: `/wedsync/src/app/(onboarding)/vendor-type/page.tsx`
- Components: `/wedsync/src/components/onboarding/VendorTypeGrid.tsx`
- Components: `/wedsync/src/components/onboarding/VendorTypeCard.tsx`
- Error boundaries: `/wedsync/src/components/error-boundary.tsx`
- Tests: `/wedsync/tests/onboarding/vendor-type/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-a-round-2-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-a-round-2-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-a-round-2-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- VERIFY Team B's API endpoints are working before starting integration
- Do NOT proceed if backend APIs return 500 errors
- Do NOT skip error boundary implementation
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - coordinate with Team B

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY