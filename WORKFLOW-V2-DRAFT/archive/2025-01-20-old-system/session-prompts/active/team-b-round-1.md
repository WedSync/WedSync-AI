# TEAM B - ROUND 1: Vendor Type Selection Backend - Database Schema & Customization Engine

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Build vendor profile database schema and customization service for personalized onboarding experience  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- **Source:** /WORKFLOW-V2-DRAFT/02-FEATURE-DEVELOPMENT/output/2025-08-20/vendor-type-selection-technical.md
- Create vendor_profiles table with enum types
- Build vendor_type_templates and dashboard_customizations tables
- Implement VendorCustomizationService for applying vendor-specific settings
- Create API endpoints for vendor type selection and template retrieval
- Prepare vendor-specific form templates and dashboard configurations

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Database: PostgreSQL 15 with custom ENUM types

**Integration Points:**
- **Database**: vendor_profiles, vendor_type_templates, dashboard_customizations
- **Authentication**: User profile extension for vendor data
- **Form System**: Template provisioning for vendor-specific forms

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");
await mcp__context7__get-library-docs("/supabase/supabase", "database-functions", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "route-handlers", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "auth-rls", 2000);

// Backend-specific libraries:
await mcp__context7__get-library-docs("/supabase/supabase", "enum-types", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("route", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/lib");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Vendor backend implementation"
2. **postgresql-database-expert** --think-hard --use-loaded-docs "Schema design and RLS"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "Database functions and auth" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --accessibility-first --restful-design
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing database schema and migration patterns
- Understand current authentication flow
- Check existing API route patterns
- Review Supabase RLS policies structure

### **PLAN PHASE (THINK HARD!)**
- Design comprehensive database schema with ENUMs
- Plan customization service architecture
- Write test cases FIRST (TDD)
- Design API contracts for frontend integration

### **CODE PHASE (PARALLEL AGENTS!)**
- Create database migration with vendor types
- Implement VendorCustomizationService
- Build API endpoints with validation
- Add RLS policies for data security

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Implementation:
- [ ] Database migration with vendor_profiles, vendor_type_templates, dashboard_customizations tables
- [ ] VendorCustomizationService class with template application logic
- [ ] POST /api/onboarding/vendor-type endpoint with validation
- [ ] GET /api/vendor-types/templates/[type] endpoint
- [ ] Row Level Security policies for vendor data
- [ ] Unit tests with >80% coverage
- [ ] Basic API integration tests

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Analytics tracking requirements - Required for customization metrics
- FROM Team D: WedMe vendor type requirements - Needed for specialized vendor types

### What other teams NEED from you:
- TO Team A: API endpoints specification - They need this for frontend integration
- TO Team E: Database schema - Blocking their frontend components

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] All endpoints require authentication
- [ ] Input validation with Zod schemas for vendor type data
- [ ] Row Level Security on vendor_profiles table
- [ ] No vendor data cross-contamination between users
- [ ] SQL injection prevention in custom queries
- [ ] Audit logging for vendor profile changes
- [ ] Rate limiting on vendor type selection endpoint

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. API ENDPOINT TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/onboarding/vendor-type"});
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/onboarding/vendor-type', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({vendorType: 'photographer', businessSize: 'solo'})
  }).then(r => r.json())`
});

// 2. DATABASE INTEGRATION TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test vendor profile creation and customization application
    return fetch('/api/vendor-types/templates/photographer').then(r => r.json());
  }`
});

// 3. SECURITY VALIDATION
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test unauthorized access prevention
    return fetch('/api/onboarding/vendor-type', {method: 'POST'})
      .then(r => ({status: r.status, authorized: r.status !== 401}));
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Database schema migration successful
- [ ] API endpoints return correct vendor type data
- [ ] RLS policies prevent unauthorized access
- [ ] Customization service applies correct templates
- [ ] Input validation prevents invalid vendor types

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 1 deliverables complete
- [ ] Database migration runs successfully
- [ ] API endpoints tested and working
- [ ] Zero TypeScript errors
- [ ] Zero SQL syntax errors

### Integration & Security:
- [ ] RLS policies tested and working
- [ ] Vendor customization service functional
- [ ] API response times <500ms
- [ ] Security requirements met
- [ ] All database constraints enforced

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Migration: `/wedsync/supabase/migrations/016_vendor_type_selection.sql`
- API routes: `/wedsync/src/app/api/onboarding/vendor-type/route.ts`
- Services: `/wedsync/src/lib/onboarding/vendor-customization.ts`
- Types: `/wedsync/src/types/vendor-profile.ts`
- Tests: `/wedsync/tests/api/vendor-type/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-b-round-1-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-b-round-1-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-b-round-1-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip database migration testing
- Do NOT ignore RLS policy implementation
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY