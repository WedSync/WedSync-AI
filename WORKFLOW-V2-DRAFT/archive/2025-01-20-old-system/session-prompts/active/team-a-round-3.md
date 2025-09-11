# TEAM A - ROUND 3: Interactive Tutorial Frontend - Tutorial UI Components & User Experience

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Build interactive tutorial UI components that integrate with Team B's tutorial engine for guided user onboarding  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Source:** /CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/01-Onboarding/06-interactive-tutorial md.md
- Build TutorialOverlay component with step-by-step guidance
- Create TutorialTooltip and TutorialHighlight components
- Integrate with Team B's tutorial engine API endpoints
- Implement tutorial progress tracking and completion rewards
- Add tutorial skipping and resuming functionality

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Team B's tutorial engine API endpoints
- Testing: Playwright MCP, Vitest
- Animations: Framer Motion for smooth tutorial transitions

**Integration Points:**
- **Team B Backend**: Tutorial engine API endpoints for step management
- **Onboarding Flow**: Final step in the vendor onboarding sequence
- **Dashboard**: Tutorial overlays for first-time user guidance

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("framer-motion");
await mcp__context7__get-library-docs("/framer/motion", "overlay-animations", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "client-components", 3000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "step-validation", 2000);

// Tutorial UI libraries:
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "z-index-overlay", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW Team B's tutorial API:
await mcp__serena__find_symbol("tutorial", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/lib/tutorials");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Tutorial UI implementation"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Overlay and tooltip components"
3. **ui-ux-designer** --think-ultra-hard --follow-existing-patterns "Tutorial user experience" 
4. **nextjs-fullstack-developer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Integrate with Team B's APIs."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 3

### Final Integration & Polish:
- [ ] TutorialOverlay component with smooth animations
- [ ] TutorialTooltip component with smart positioning
- [ ] TutorialHighlight component for element focus
- [ ] TutorialProgress component showing completion status
- [ ] Integration with Team B's tutorial engine APIs
- [ ] Tutorial completion rewards and celebration
- [ ] Skip/resume tutorial functionality
- [ ] Complete E2E testing of tutorial flows

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (VERIFY FIRST!):
- FROM Team B: Tutorial API endpoints MUST BE WORKING - /api/tutorials/start, /api/tutorials/progress
- FROM Team E: Onboarding flow completion - Required for tutorial trigger

### What other teams NEED from you:
- TO Team C: Tutorial component integration patterns - Final integration milestone
- TO Team D: Tutorial overlay patterns - Final UI pattern delivery

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Tutorial data fetched securely from Team B's APIs
- [ ] No tutorial content cached without proper expiration
- [ ] Tutorial progress synced with authenticated user session
- [ ] No sensitive onboarding data exposed in tutorial UI
- [ ] Tutorial skip/resume state properly managed
- [ ] XSS protection in tutorial content rendering
- [ ] Rate limiting graceful handling in tutorial UI

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. TUTORIAL INITIALIZATION AND OVERLAY TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
await mcp__playwright__browser_wait_for({text: "Welcome! Let's get you started"});
const tutorialOverlay = await mcp__playwright__browser_snapshot();

// 2. TUTORIAL STEP PROGRESSION TESTING
await mcp__playwright__browser_click({
  element: "Next step button",
  ref: "button[data-testid='tutorial-next']"
});
await mcp__playwright__browser_wait_for({text: "Step 2 of 5"});
await mcp__playwright__browser_wait_for({text: "Create your first form"});
await mcp__playwright__browser_snapshot();

// 3. TUTORIAL ELEMENT HIGHLIGHTING TESTING
// Verify that the correct UI element is highlighted
await mcp__playwright__browser_wait_for({text: "Click the 'New Form' button"});
const highlightedElement = await mcp__playwright__browser_evaluate({
  function: `() => document.querySelector('[data-tutorial-highlight="true"]')?.textContent`
});
// Should return "New Form" button content

// 4. TUTORIAL SKIP/RESUME TESTING
await mcp__playwright__browser_click({
  element: "Skip tutorial button",
  ref: "button[data-testid='tutorial-skip']"
});
await mcp__playwright__browser_wait_for({text: "Tutorial skipped"});
// Navigate away and back
await mcp__playwright__browser_navigate({url: "/clients"});
await mcp__playwright__browser_navigate({url: "/dashboard"});
await mcp__playwright__browser_wait_for({text: "Resume tutorial"});

// 5. TUTORIAL COMPLETION TESTING
await mcp__playwright__browser_click({
  element: "Resume tutorial button",
  ref: "button[data-testid='resume-tutorial']"
});
// Fast-forward through all steps
for (let step = 2; step <= 5; step++) {
  await mcp__playwright__browser_click({
    element: "Next step button",
    ref: "button[data-testid='tutorial-next']"
  });
  await mcp__playwright__browser_wait_for({text: `Step ${step} of 5`});
}
await mcp__playwright__browser_wait_for({text: "Congratulations! Tutorial Complete"});
await mcp__playwright__browser_snapshot();

// 6. RESPONSIVE TUTORIAL TESTING
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_navigate({url: "/dashboard"});
  await mcp__playwright__browser_wait_for({text: "Welcome! Let's get you started"});
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-tutorial.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Tutorial overlays render correctly
- [ ] Step progression works smoothly
- [ ] Element highlighting focuses correctly
- [ ] Skip/resume functionality works
- [ ] Tutorial completion triggers celebration
- [ ] Responsive design works on all screen sizes

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 3 deliverables complete
- [ ] Tutorial integrates seamlessly with Team B's API
- [ ] Smooth animations and transitions
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Final Integration & UX:
- [ ] Tutorial provides clear step-by-step guidance
- [ ] User can skip and resume tutorials
- [ ] Tutorial completion celebrated appropriately
- [ ] Performance targets met (<200ms step transitions)
- [ ] Accessibility compliance for overlay components

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Tutorial page: `/wedsync/src/app/(onboarding)/tutorial/page.tsx`
- Components: `/wedsync/src/components/tutorial/`
- Tutorial context: `/wedsync/src/contexts/tutorial-context.tsx`
- Hooks: `/wedsync/src/hooks/useTutorial.ts`
- Tests: `/wedsync/tests/tutorial/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-a-round-3-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-a-round-3-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-a-round-3-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- VERIFY Team B's tutorial APIs are fully functional before integration
- Do NOT proceed if tutorial engine returns 500 errors
- Do NOT skip accessibility testing for overlay components
- Do NOT claim completion without evidence
- REMEMBER: This is FINAL ROUND - everything must integrate perfectly

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY