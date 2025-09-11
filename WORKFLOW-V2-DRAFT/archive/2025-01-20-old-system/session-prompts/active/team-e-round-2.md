# TEAM E - ROUND 2: Tagging System - Client Organization & Smart Classification

**Date:** 2025-08-20  
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive client tagging system with smart suggestions, bulk operations, and filtering integration  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Source:** /CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/03-Client-Management/07-tagging-system md.md
- Create flexible tagging system for client organization
- Build smart tag suggestions based on client data
- Implement tag-based filtering and search
- Add bulk tagging operations for multiple clients
- Integration with existing client management system

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Search: Full-text search integration with tags

**Integration Points:**
- **Client Management**: Tag integration with client records
- **Filtering System**: Tag-based client filtering from Team C
- **Bulk Operations**: Tag management for bulk client operations

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");
await mcp__context7__get-library-docs("/supabase/supabase", "full-text-search", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "server-actions", 3000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "array-fields", 2000);

// Tagging system libraries:
await mcp__context7__get-library-docs("/supabase/supabase", "many-to-many", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing client patterns:
await mcp__serena__find_symbol("client", "src/components", true);
await mcp__serena__get_symbols_overview("src/lib/clients");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Tagging system implementation"
2. **postgresql-database-expert** --think-hard --use-loaded-docs "Many-to-many relationships"
3. **react-ui-specialist** --think-ultra-hard --follow-existing-patterns "Tag input components" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Build flexible tagging system."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 2

### Core Tagging System:
- [ ] Database schema for tags and client_tags many-to-many relationship
- [ ] TagInput component with autocomplete and suggestions
- [ ] TagManager component for bulk tag operations
- [ ] Smart tag suggestion engine based on client data patterns
- [ ] Tag-based filtering integration with existing client lists
- [ ] Tag analytics and usage tracking
- [ ] Bulk tagging operations for multiple clients
- [ ] Advanced Playwright tests for tag workflows

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team C: Client filtering system - Required for tag-based filtering integration
- FROM Team A: UI component patterns - Needed for consistent tag display

### What other teams NEED from you:
- TO Team B: Tag data structure - They need this for backend operations
- TO Team D: Client organization patterns - Blocking their photo organization features

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Tags protected by RLS policies per user
- [ ] No tag cross-contamination between users
- [ ] Input validation for tag names and descriptions
- [ ] Rate limiting on tag creation endpoints
- [ ] Audit logging for tag operations
- [ ] No SQL injection in tag search queries
- [ ] GDPR compliance for client categorization data

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. TAG CREATION AND APPLICATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/clients/123"});
await mcp__playwright__browser_click({
  element: "Add tags button",
  ref: "button[data-testid='add-tags']"
});
await mcp__playwright__browser_type({
  element: "Tag input",
  ref: "input[data-testid='tag-input']",
  text: "high-priority"
});
await mcp__playwright__browser_press_key({key: "Enter"});
await mcp__playwright__browser_snapshot();

// 2. TAG AUTOCOMPLETE TESTING
await mcp__playwright__browser_type({
  element: "Tag input",
  ref: "input[data-testid='tag-input']",
  text: "wed"
});
await mcp__playwright__browser_wait_for({text: "wedding-2024"});
await mcp__playwright__browser_click({
  element: "Suggested tag",
  ref: "[data-testid='suggested-tag-wedding-2024']"
});

// 3. BULK TAGGING TESTING
await mcp__playwright__browser_navigate({url: "/clients"});
await mcp__playwright__browser_click({
  element: "Select all checkbox",
  ref: "input[data-testid='select-all-clients']"
});
await mcp__playwright__browser_click({
  element: "Bulk actions menu",
  ref: "button[data-testid='bulk-actions']"
});
await mcp__playwright__browser_click({
  element: "Add tags option",
  ref: "[data-testid='bulk-add-tags']"
});
await mcp__playwright__browser_type({
  element: "Bulk tag input",
  ref: "input[data-testid='bulk-tag-input']",
  text: "summer-2024"
});

// 4. TAG FILTERING TESTING
await mcp__playwright__browser_click({
  element: "Filter by tags",
  ref: "button[data-testid='filter-by-tags']"
});
await mcp__playwright__browser_click({
  element: "High priority tag filter",
  ref: "[data-testid='filter-tag-high-priority']"
});
await mcp__playwright__browser_wait_for({text: "Filtered by: high-priority"});
await mcp__playwright__browser_snapshot();

// 5. TAG MANAGEMENT TESTING
await mcp__playwright__browser_navigate({url: "/settings/tags"});
await mcp__playwright__browser_click({
  element: "Edit tag button",
  ref: "button[data-testid='edit-tag-high-priority']"
});
await mcp__playwright__browser_type({
  element: "Tag description input",
  ref: "textarea[data-testid='tag-description']",
  text: "Clients requiring immediate attention"
});
await mcp__playwright__browser_click({
  element: "Save tag button",
  ref: "button[data-testid='save-tag']"
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Tags can be created and applied to clients
- [ ] Autocomplete suggestions work correctly
- [ ] Bulk tagging operations succeed
- [ ] Tag-based filtering returns correct results
- [ ] Tag management allows editing and deletion

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 2 deliverables complete
- [ ] Tagging system handles 1000+ tags efficiently
- [ ] Tag search and filtering performs in <500ms
- [ ] Zero TypeScript errors
- [ ] Zero database constraint violations

### UX & Integration:
- [ ] Tag input provides smooth user experience
- [ ] Smart suggestions improve tagging efficiency
- [ ] Bulk operations handle 100+ clients
- [ ] Tag filtering integrates with existing client views
- [ ] Tag analytics provide useful insights

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/clients/tags/`
- Tag service: `/wedsync/src/lib/clients/tag-service.ts`
- API routes: `/wedsync/src/app/api/tags/`
- Database migration: `/wedsync/supabase/migrations/018_client_tagging_system.sql`
- Tests: `/wedsync/tests/tags/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-e-round-2-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-e-round-2-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-e-round-2-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT create tags without user permission validation
- Do NOT allow unlimited tag creation (storage concerns)
- Do NOT skip tag deduplication (data quality)
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - coordinate with Team C for filtering

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY