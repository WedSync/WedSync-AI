# TEAM A - ROUND 1: WS-056 - Guest List Builder - Core Frontend Implementation

**Date:** 2025-08-22  
**Feature ID:** WS-056 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive guest list management system with CSV import and smart household grouping  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Bride managing a 150-person wedding
**I want to:** Import my contact list and organize guests by family/friends/work
**So that:** I can track RSVPs and assign tables without losing track of who's coming

**Real Wedding Problem This Solves:**
Sarah imports 200 contacts from her phone's CSV export. The system automatically groups "John & Jane Smith" into households, categorizes work contacts by email domains (@company.com), and lets her drag Uncle Bob from "friends" to "family." She sees real-time counts: 89 adults, 12 children, 3 infants - helping her finalize catering numbers.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- CSV import with intelligent field mapping and household detection
- Drag-and-drop categorization with real-time count updates
- Bulk operations for invitation management
- Export functionality for vendor coordination
- Mobile-responsive interface for on-the-go updates
- Smart household grouping by last name and address
- Category management (family/friends/work/other)
- Age group tracking (adult/child/infant)
- Plus-one management
- Table assignment functionality

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- File Upload: Supabase Storage for CSV files
- Real-time: Live guest count updates
- UI Components: React DnD for drag-and-drop

**Integration Points:**
- Guest Database: Core guests and households tables
- RSVP System: Provides guest data to Team B (WS-057)
- Task System: Guest assignment data to Team C (WS-058)
- Budget System: Headcount data to Team D (WS-059)

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
// Think hard about what documentation you need for guest list builder
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "forms file-upload drag-drop", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database insert batch-operations", 3000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "responsive tables forms", 2000);

// For this specific feature, also load:
await mcp__context7__get-library-docs("/react-dnd/react-dnd", "drag-drop lists", 2000);
await mcp__context7__get-library-docs("/papaparse/papaparse", "csv-parsing", 1500);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "bulk-forms validation", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("couples", "", true);
await mcp__serena__get_symbols_overview("src/components");
await mcp__serena__search_for_pattern("import|upload|csv", true);

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build guest list UI with CSV import"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Create guest management components"
3. **database-mcp-specialist** --think-ultra-hard --follow-existing-patterns "Implement guest database schema" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Secure guest data handling"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab "Test drag-drop functionality"
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for components."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing couples/user management patterns
- Understand current file upload implementations
- Check how tables and forms are implemented
- Review similar bulk operation UIs
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Design guest database schema per specification
- Plan CSV import and parsing workflow
- Design drag-and-drop categorization UI
- Plan household grouping algorithm
- Consider edge cases (duplicate contacts, invalid data)

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing UI patterns from SAAS-UI-STYLE-GUIDE.md
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright (CSV upload, drag-drop, bulk operations)
- Test household grouping algorithm
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database schema implementation (guests, households, guest_import_sessions tables)
- [ ] Guest List Dashboard at `/src/components/wedme/guests/GuestListDashboard.tsx`
- [ ] CSV Import Component at `/src/components/wedme/guests/GuestImporter.tsx`
- [ ] Guest Table with drag-and-drop categorization
- [ ] Household grouping algorithm implementation
- [ ] Real-time guest count display
- [ ] Basic guest CRUD operations
- [ ] Field mapping UI for CSV imports
- [ ] Mobile-responsive guest interface
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for import flow

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- None (Team A is the foundation for guest data)

### What other teams NEED from you:
- TO Team B: Guest data structure for RSVP system (WS-057)
- TO Team C: Guest IDs for task assignments (WS-058)
- TO Team D: Headcount data for budget calculations (WS-059)
- TO Team E: Guest information for website features (WS-060)

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] CSV file validation and sanitization
- [ ] Guest data protected by couple authentication
- [ ] Input validation for all guest fields
- [ ] SQL injection prevention
- [ ] XSS prevention in guest names/addresses
- [ ] File upload restrictions (CSV only, size limits)
- [ ] Data export restrictions (couple owns data)
- [ ] Audit logging for guest modifications

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/guests"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for guest interface - zero ambiguity!

// 2. CSV IMPORT FLOW TEST
await mcp__playwright__browser_click({
  element: "Import Guests button",
  ref: "[data-testid='import-guests-btn']"
});
await mcp__playwright__browser_file_upload({
  paths: ["/test-data/sample-guest-list.csv"]
});
await mcp__playwright__browser_wait_for({text: "200 contacts found"});

// 3. FIELD MAPPING TEST
await mcp__playwright__browser_select_option({
  element: "First Name mapping",
  ref: "[data-testid='map-first-name']",
  values: ["Column A"]
});
await mcp__playwright__browser_select_option({
  element: "Email mapping",
  ref: "[data-testid='map-email']",
  values: ["Column C"]
});
await mcp__playwright__browser_click({
  element: "Import Contacts",
  ref: "[data-testid='confirm-import']"
});
await mcp__playwright__browser_wait_for({text: "Successfully imported 198 guests"});

// 4. DRAG-AND-DROP CATEGORIZATION TEST
await mcp__playwright__browser_drag({
  startElement: "Uncle Bob guest card",
  startRef: "[data-guest-id='uncle-bob']",
  endElement: "Family category",
  endRef: "[data-category='family']"
});
await mcp__playwright__browser_wait_for({text: "Family: 24 guests"}); // Count updated

// 5. HOUSEHOLD GROUPING TEST
await mcp__playwright__browser_click({
  element: "John Smith guest",
  ref: "[data-guest='john-smith']"
});
await mcp__playwright__browser_wait_for({text: "John & Jane Smith household"});

// 6. BULK OPERATIONS TEST
await mcp__playwright__browser_click({
  element: "Select all work contacts",
  ref: "[data-testid='select-work-category']"
});
await mcp__playwright__browser_click({
  element: "Bulk actions menu",
  ref: "[data-testid='bulk-actions']"
});
await mcp__playwright__browser_click({
  element: "Send invitations",
  ref: "[data-testid='bulk-send-invites']"
});
await mcp__playwright__browser_wait_for({text: "45 invitations queued"});

// 7. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `guests-${width}px.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] CSV import with field mapping
- [ ] Drag-and-drop categorization
- [ ] Household grouping algorithm
- [ ] Bulk operations (select, invite, export)
- [ ] Real-time count updates
- [ ] Mobile responsive interface

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for Round 1 complete
- [ ] CSV import fully functional with error handling
- [ ] Drag-and-drop categorization working smoothly
- [ ] Household grouping algorithm accurate
- [ ] Real-time guest counts updating
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Guest data structure ready for other teams
- [ ] CSV import handles 200+ contacts efficiently
- [ ] Drag-and-drop responsive <100ms
- [ ] Household grouping <500ms for 200 guests
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot of guest dashboard
- [ ] Screenshot of CSV import flow
- [ ] Screenshot of drag-and-drop in action
- [ ] Household grouping examples
- [ ] Test results and coverage
- [ ] Performance metrics

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Dashboard: `/wedsync/src/components/wedme/guests/GuestListDashboard.tsx`
- Importer: `/wedsync/src/components/wedme/guests/GuestImporter.tsx`
- Guest Table: `/wedsync/src/components/wedme/guests/GuestTable.tsx`
- Guest Card: `/wedsync/src/components/wedme/guests/GuestCard.tsx`
- Household Logic: `/wedsync/src/lib/services/household-grouping.ts`
- API Routes: `/wedsync/src/app/api/guests/route.ts`
- Import API: `/wedsync/src/app/api/guests/import/route.ts`
- Database: `/wedsync/supabase/migrations/XXX_guest_management.sql`
- Tests: `/wedsync/tests/wedme/guests/`
- Types: `/wedsync/src/types/guests.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch4/WS-056-batch4-round-1-complete.md`
- **Include:** Feature ID (WS-056) in all filenames
- **Save in:** batch4 folder (NOT in CORRECT folder)
- **After completion:** Update senior dev that Round 1 is complete

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch4/WS-056-batch4-round-1-complete.md`

Must include:
1. Summary of guest list system built
2. Files created/modified list
3. Test results and coverage
4. Screenshots/evidence
5. Database schema implemented
6. Integration points ready
7. Any blockers or issues

---

## ⚠️ CRITICAL WARNINGS
- Do NOT implement RSVP functionality (Team B's WS-057)
- Do NOT build task delegation (Team C's WS-058)
- Do NOT build budget features (Team D's WS-059)
- Do NOT create website builder (Team E's WS-060)
- FOCUS ONLY on guest list management and CSV import
- REMEMBER: All 5 teams work in PARALLEL - no overlapping work

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Guest dashboard functional
- [ ] CSV import with field mapping working
- [ ] Drag-and-drop categorization implemented
- [ ] Household grouping algorithm accurate
- [ ] Real-time counts updating
- [ ] Bulk operations implemented
- [ ] All tests passing
- [ ] Security validated
- [ ] Performance targets met
- [ ] Code committed
- [ ] Report created

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY