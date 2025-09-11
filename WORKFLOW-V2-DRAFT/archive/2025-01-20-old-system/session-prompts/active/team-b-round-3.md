# TEAM B - ROUND 3: Form Templates System - Template Engine & Dynamic Form Generation

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Build comprehensive form template system with dynamic generation, vendor customization, and template marketplace  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Source:** /CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/04-Forms-System/07-form-templates md.md
- Create dynamic form template engine with JSON-based configuration
- Build template marketplace with pre-built industry forms
- Implement vendor-specific template customization
- Add template versioning and migration system
- Integration with Team D's wedding-specific fields

**Technology Stack (VERIFIED):**
- Frontend: Form templates will be rendered by Team A
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Template Engine: JSON Schema-based form generation

**Integration Points:**
- **Team D Wedding Fields**: Integration with wedding-specific form components
- **Vendor Types**: Template customization based on vendor type selection
- **Form Builder**: Template foundation for dynamic form creation

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("json-schema");
await mcp__context7__get-library-docs("/supabase/supabase", "json-columns", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "dynamic-imports", 3000);
await mcp__context7__get-library-docs("/react-hook-form/react-hook-form", "dynamic-forms", 2000);

// Form template libraries:
await mcp__context7__get-library-docs("/ajv/ajv", "schema-validation", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing form patterns:
await mcp__serena__find_symbol("form", "src/components", true);
await mcp__serena__get_symbols_overview("src/lib/validations");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Form templates backend"
2. **postgresql-database-expert** --think-hard --use-loaded-docs "JSON schema storage"
3. **api-architect** --think-ultra-hard --follow-existing-patterns "Template engine APIs" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **wedding-domain-expert** --industry-templates --vendor-specialization
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Build template engine."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 3

### Final Template System:
- [ ] Form template database schema with JSON configuration storage
- [ ] FormTemplateEngine class for dynamic form generation
- [ ] Template marketplace with pre-built industry templates
- [ ] GET /api/templates/marketplace endpoint with categorization
- [ ] POST /api/templates/create endpoint for custom templates
- [ ] Template versioning and migration system
- [ ] Integration with Team D's wedding-specific field types
- [ ] Complete E2E testing of template system

---

## 🔗 DEPENDENCIES

### What you NEED from other teams (VERIFY FIRST!):
- FROM Team D: Wedding-specific field definitions - MUST BE AVAILABLE for template integration
- FROM Team A: Form builder component patterns - Required for template rendering

### What other teams NEED from you:
- TO Team A: Template rendering API - Final integration for form builder
- TO Team C: Template analytics data - Final data pipeline delivery

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Template JSON schemas validated before storage
- [ ] No code injection possible through template configurations
- [ ] Template access controlled by user permissions
- [ ] Marketplace templates verified and sandboxed
- [ ] Template versioning prevents data loss
- [ ] Audit logging for template creation and modification
- [ ] Rate limiting on template generation endpoints

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. TEMPLATE MARKETPLACE TESTING
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/templates/marketplace?category=photography')
    .then(r => r.json())`
});
// Should return photography-specific form templates

// 2. DYNAMIC FORM GENERATION TESTING
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/templates/photographer-contract/generate', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({
      vendorType: 'photographer',
      customizations: {
        includeWeddingFields: true,
        includePaymentFields: true
      }
    })
  }).then(r => r.json())`
});

// 3. TEMPLATE VERSIONING TESTING
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/templates/client-intake-form', {
    headers: {'Template-Version': 'v2.1'}
  }).then(r => r.json())`
});

// 4. WEDDING FIELD INTEGRATION TESTING
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/templates/wedding-questionnaire/generate', {
    method: 'POST',
    body: JSON.stringify({
      includeFields: ['wedding_date', 'venue_selector', 'wedding_party_manager']
    })
  }).then(r => r.json())`
});

// 5. TEMPLATE VALIDATION TESTING
await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/templates/create', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Custom Template',
      schema: {
        // Invalid schema to test validation
        fields: [{ type: 'invalid_field_type' }]
      }
    })
  }).then(r => ({status: r.status, valid: r.status !== 400}))`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Template marketplace returns categorized templates
- [ ] Dynamic form generation creates valid forms
- [ ] Template versioning maintains backward compatibility
- [ ] Wedding fields integrate correctly in templates
- [ ] Template validation prevents invalid schemas

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 3 deliverables complete
- [ ] Template engine generates valid forms
- [ ] Marketplace templates are production-ready
- [ ] Zero TypeScript errors
- [ ] Zero JSON schema validation errors

### Final System Integration:
- [ ] Templates integrate with all vendor types
- [ ] Wedding fields work seamlessly in templates
- [ ] Template versioning system functional
- [ ] Performance targets met (<1s template generation)
- [ ] Ready for production deployment

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Database migration: `/wedsync/supabase/migrations/019_form_templates_system.sql`
- Template engine: `/wedsync/src/lib/templates/engine.ts`
- API routes: `/wedsync/src/app/api/templates/`
- Template schemas: `/wedsync/src/lib/templates/schemas/`
- Tests: `/wedsync/tests/templates/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-b-round-3-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-b-round-3-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-b-round-3-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT allow arbitrary code execution in templates (security risk)
- Do NOT skip template schema validation (data integrity)
- Do NOT deploy without Team D's wedding field integration
- Do NOT claim completion without evidence
- REMEMBER: This is FINAL ROUND - template system must be production-ready

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY