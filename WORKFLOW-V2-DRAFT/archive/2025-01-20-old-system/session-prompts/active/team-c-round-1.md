# TEAM C - ROUND 1: Client List Views Completion - Integration & Data Management

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Complete the remaining 30% of client list views with advanced filtering, sorting, and bulk operation integration  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Current Status:** 70% complete from master-queue.json
- **Remaining Work:** Advanced filtering, bulk selection integration, performance optimization
- Complete integration with existing client management system
- Add real-time updates and synchronization
- Implement advanced search and filter capabilities
- Prepare integration points for bulk operations (Feature 7)

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Real-time: Supabase Realtime subscriptions

**Integration Points:**
- **Client Database**: Existing client tables and relationships
- **Bulk Operations**: Prepare endpoints for Team B's bulk operations feature
- **Real-time Updates**: Supabase subscriptions for live client updates

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");
await mcp__context7__get-library-docs("/supabase/supabase", "realtime-subscriptions", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "server-components", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "database-functions", 2000);

// Integration-specific libraries:
await mcp__context7__get-library-docs("/supabase/supabase", "full-text-search", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("client", "src/app", true);
await mcp__serena__get_symbols_overview("src/components/clients");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Client list completion"
2. **supabase-specialist** --think-hard --use-loaded-docs "Realtime integration and search"
3. **integration-specialist** --think-ultra-hard --follow-existing-patterns "Data synchronization" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **performance-optimization-expert** --database-queries --check-n-plus-one

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing client management code in /src/app/(dashboard)/clients/
- Understand current database schema and relationships
- Check existing filtering and search implementations
- Review real-time subscription patterns in codebase

### **PLAN PHASE (THINK HARD!)**
- Identify the missing 30% of functionality
- Design advanced filter and search system
- Plan real-time updates integration
- Write test cases FIRST (TDD)

### **CODE PHASE (PARALLEL AGENTS!)**
- Complete missing client list functionality
- Implement advanced filtering and search
- Add real-time subscriptions
- Optimize database queries and performance

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Completion:
- [ ] Advanced client filtering (status, tags, date ranges, custom fields)
- [ ] Full-text search across client data
- [ ] Real-time client list updates via Supabase subscriptions
- [ ] Bulk selection UI preparation for Team B's bulk operations
- [ ] Performance optimization (pagination, virtual scrolling)
- [ ] Unit tests with >80% coverage
- [ ] Integration tests for real-time updates

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Bulk operation requirements - Required for bulk selection UI
- FROM Team D: WedMe client data requirements - Needed for cross-platform sync

### What other teams NEED from you:
- TO Team B: Client selection interface - They need this for bulk operations
- TO Team E: Client list component patterns - Blocking their UI components

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Client data access limited by user permissions
- [ ] Row Level Security on client queries
- [ ] No client data leakage between different users/vendors
- [ ] Search queries sanitized to prevent injection
- [ ] Real-time subscriptions require authentication
- [ ] Audit logging for client data access
- [ ] Rate limiting on search endpoints

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. CLIENT LIST FUNCTIONALITY TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/clients"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. ADVANCED FILTERING TESTING
await mcp__playwright__browser_click({
  element: "Filter button",
  ref: "button[data-testid='client-filter']"
});
await mcp__playwright__browser_select_option({
  element: "Status filter",
  ref: "select[name='status']",
  values: ["active"]
});
await mcp__playwright__browser_wait_for({text: "Filtered results"});

// 3. REAL-TIME UPDATES TESTING
await mcp__playwright__browser_tab_new({url: "/clients"});
await mcp__playwright__browser_tab_select({index: 0});
// Simulate adding a new client
await mcp__playwright__browser_tab_select({index: 1});
await mcp__playwright__browser_wait_for({text: "New client"});

// 4. SEARCH FUNCTIONALITY TESTING
await mcp__playwright__browser_type({
  element: "Search input",
  ref: "input[data-testid='client-search']",
  text: "John Doe"
});
await mcp__playwright__browser_wait_for({text: "Search results"});
```

**REQUIRED TEST COVERAGE:**
- [ ] Advanced filtering works correctly
- [ ] Full-text search returns accurate results
- [ ] Real-time updates reflect across sessions
- [ ] Bulk selection UI prepares data correctly
- [ ] Performance meets requirements (<2s load time)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 1 deliverables complete
- [ ] Client list functionality reaches 100% complete
- [ ] Real-time subscriptions working
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integration points prepared for other teams
- [ ] Performance targets met (<2s initial load)
- [ ] Security requirements met
- [ ] Bulk selection interface ready
- [ ] Search performance <500ms

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Client pages: `/wedsync/src/app/(dashboard)/clients/`
- Components: `/wedsync/src/components/clients/`
- Services: `/wedsync/src/lib/clients/`
- Types: `/wedsync/src/types/clients.ts`
- Tests: `/wedsync/tests/clients/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-c-round-1-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-c-round-1-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-c-round-1-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT break existing client management functionality
- Do NOT ignore real-time subscription cleanup
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY