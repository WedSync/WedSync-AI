# TEAM D - ROUND 1: Wedding-Specific Fields - WedMe Platform Integration

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Build wedding-specific form fields with WedMe platform integration and wedding industry terminology  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Source:** /CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/04-Forms-System/03-field-types/02-wedding-specific-fields md.md
- Create wedding-specific form field components (date pickers, vendor selectors, guest count, etc.)
- Integrate with WedMe platform for wedding data synchronization
- Build wedding timeline components and milestone tracking
- Implement wedding party management fields
- Add ceremony/reception venue field types with location integration

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- WedMe Integration: Custom API endpoints and webhooks

**Integration Points:**
- **WedMe Platform**: Wedding data synchronization and cross-platform features
- **Form Builder**: Custom field types for wedding-specific data
- **Date/Timeline**: Wedding milestone and timeline management

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("react-hook-form");
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "custom-fields", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes", 3000);
await mcp__context7__get-library-docs("/date-fns/date-fns", "date-manipulation", 2000);

// Wedding/WedMe-specific libraries:
await mcp__context7__get-library-docs("/supabase/supabase", "webhooks", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("form", "src/components", true);
await mcp__serena__get_symbols_overview("src/lib/validations");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Wedding fields implementation"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Custom form components"
3. **integration-specialist** --think-ultra-hard --follow-existing-patterns "WedMe platform integration" 
4. **wedding-domain-expert** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing form builder components and patterns
- Understand current field type architecture
- Check existing date/time handling patterns
- Review WedMe integration requirements

### **PLAN PHASE (THINK HARD!)**
- Design wedding-specific field component architecture
- Plan WedMe API integration contracts
- Write test cases FIRST (TDD)
- Design wedding timeline data structures

### **CODE PHASE (PARALLEL AGENTS!)**
- Create wedding-specific form field components
- Implement WedMe integration service
- Build wedding timeline and milestone tracking
- Add comprehensive validation schemas

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Implementation:
- [ ] WeddingDatePicker component with ceremony/reception date selection
- [ ] VendorSelector component with WedMe vendor database integration
- [ ] WeddingPartyManager component for bridal party organization
- [ ] VenueSelector component with location and capacity fields
- [ ] WeddingTimelineBuilder component for milestone tracking
- [ ] WedMe API integration service with webhook handling
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright accessibility tests

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Form builder component patterns - Required for field integration
- FROM Team B: Database schema for wedding data - Needed for data storage

### What other teams NEED from you:
- TO Team E: Wedding field component exports - They need this for onboarding
- TO Team A: Wedding field specifications - Blocking their form templates

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] WedMe API calls require secure authentication
- [ ] Wedding data encrypted at rest and in transit
- [ ] No hardcoded WedMe API keys in frontend code
- [ ] Input validation for all wedding-specific fields
- [ ] Cross-site scripting prevention in rich text fields
- [ ] Rate limiting on WedMe API endpoints
- [ ] GDPR compliance for wedding party personal data

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. WEDDING DATE PICKER TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/forms/builder"});
await mcp__playwright__browser_click({
  element: "Add Wedding Date field",
  ref: "button[data-testid='add-wedding-date']"
});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. VENDOR SELECTOR INTEGRATION TESTING
await mcp__playwright__browser_click({
  element: "Vendor selector",
  ref: "select[data-testid='vendor-selector']"
});
await mcp__playwright__browser_wait_for({text: "Loading vendors from WedMe"});
await mcp__playwright__browser_snapshot();

// 3. WEDDING TIMELINE TESTING
await mcp__playwright__browser_drag({
  startElement: "Timeline milestone",
  startRef: "[data-testid='milestone-ceremony']",
  endElement: "Timeline slot",
  endRef: "[data-testid='timeline-14-00']"
});
await mcp__playwright__browser_wait_for({text: "Timeline updated"});

// 4. RESPONSIVE WEDDING FORM TESTING
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-wedding-form.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Wedding-specific fields render correctly
- [ ] WedMe API integration returns valid data
- [ ] Wedding timeline drag-and-drop functionality
- [ ] Date validation prevents invalid wedding dates
- [ ] Accessibility compliance for complex wedding forms

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 1 deliverables complete
- [ ] Wedding-specific fields functional and validated
- [ ] WedMe integration tested and working
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & UX:
- [ ] Wedding fields integrate with form builder
- [ ] WedMe API calls complete in <2s
- [ ] Timeline components support drag-and-drop
- [ ] Mobile-responsive wedding forms
- [ ] Wedding terminology accurate throughout

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/forms/wedding/`
- WedMe integration: `/wedsync/src/lib/wedme/`
- API routes: `/wedsync/src/app/api/wedme/`
- Types: `/wedsync/src/types/wedding.ts`
- Tests: `/wedsync/tests/wedding/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-d-round-1-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-d-round-1-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-d-round-1-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT expose WedMe API credentials in client code
- Do NOT ignore wedding industry terminology accuracy
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY