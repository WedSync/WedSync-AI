# TEAM C - ROUND 2: CSV/Excel Import Enhancement - Advanced Import Processing & Validation

**Date:** 2025-08-20  
**Priority:** P1 from roadmap  
**Mission:** Enhance existing CSV/Excel import system with advanced validation, mapping, and error handling  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Current Status:** 40% complete from master-queue.json
- **Enhancement Focus:** Advanced data validation, field mapping, duplicate detection
- Add support for multiple file formats (.csv, .xlsx, .xls)
- Implement intelligent column mapping with suggestions
- Build comprehensive error reporting and data preview
- Add batch processing for large import files

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- File Processing: xlsx, papaparse libraries

**Integration Points:**
- **Client Management**: Integration with existing client data tables
- **File Storage**: Supabase storage for temporary import files
- **Validation**: Enhanced data validation and cleansing

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("xlsx");
await mcp__context7__get-library-docs("/supabase/supabase", "storage-upload", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "file-uploads", 3000);
await mcp__context7__get-library-docs("/papaparse/papaparse", "csv-parsing", 2000);

// File processing libraries:
await mcp__context7__get-library-docs("/supabase/supabase", "edge-functions", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing import code:
await mcp__serena__find_symbol("import", "src/app", true);
await mcp__serena__get_symbols_overview("src/components/clients");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Import enhancement"
2. **integration-specialist** --think-hard --use-loaded-docs "File processing and validation"
3. **data-analytics-engineer** --think-ultra-hard --follow-existing-patterns "Data mapping and cleansing" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **performance-optimization-expert** --file-processing --memory-management

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Enhance existing import system."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 2

### Enhancement & Advanced Processing:
- [ ] Enhanced file upload component supporting .csv, .xlsx, .xls
- [ ] Advanced column mapping interface with intelligent suggestions
- [ ] Data validation engine with custom business rules
- [ ] Duplicate detection and merging capabilities
- [ ] Error reporting dashboard with detailed feedback
- [ ] Batch processing for files >1000 records
- [ ] Import preview with data transformation display
- [ ] Advanced Playwright tests for file processing workflows

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Client management UI patterns - Required for import UI consistency
- FROM Team B: Database optimization insights - Needed for batch processing

### What other teams NEED from you:
- TO Team E: Import component patterns - They need this for onboarding integration
- TO Team D: Import validation schemas - Blocking their wedding field validation

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] File uploads scanned for malicious content
- [ ] Temporary files deleted after processing
- [ ] No executable file formats accepted
- [ ] Import data validated and sanitized
- [ ] User permissions verified before import
- [ ] Audit logging for all import operations
- [ ] Rate limiting on file upload endpoints

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. FILE UPLOAD AND PROCESSING TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/clients/import"});
await mcp__playwright__browser_file_upload({
  paths: ["/path/to/test-clients.xlsx"]
});
await mcp__playwright__browser_wait_for({text: "Processing file"});
await mcp__playwright__browser_snapshot();

// 2. COLUMN MAPPING INTERFACE TESTING
await mcp__playwright__browser_wait_for({text: "Column Mapping"});
await mcp__playwright__browser_drag({
  startElement: "Excel column 'Full Name'",
  startRef: "[data-testid='source-column-name']",
  endElement: "Client name field",
  endRef: "[data-testid='target-client-name']"
});
await mcp__playwright__browser_snapshot();

// 3. DATA VALIDATION AND PREVIEW TESTING
await mcp__playwright__browser_click({
  element: "Preview import button",
  ref: "button[data-testid='preview-import']"
});
await mcp__playwright__browser_wait_for({text: "Import Preview"});
await mcp__playwright__browser_wait_for({text: "2 errors found"});
await mcp__playwright__browser_snapshot();

// 4. BATCH PROCESSING TESTING
await mcp__playwright__browser_file_upload({
  paths: ["/path/to/large-clients-5000-records.csv"]
});
await mcp__playwright__browser_wait_for({text: "Batch processing"});
await mcp__playwright__browser_wait_for({text: "Processing batch 1 of 5"});

// 5. ERROR HANDLING TESTING
await mcp__playwright__browser_file_upload({
  paths: ["/path/to/corrupted-file.xlsx"]
});
await mcp__playwright__browser_wait_for({text: "File format not supported"});
await mcp__playwright__browser_snapshot();
```

**REQUIRED TEST COVERAGE:**
- [ ] Multiple file formats processed correctly
- [ ] Column mapping suggestions work accurately
- [ ] Data validation catches common errors
- [ ] Duplicate detection identifies matches
- [ ] Batch processing handles large files

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 2 deliverables complete
- [ ] Import system handles files up to 10MB
- [ ] Column mapping UI functional and intuitive
- [ ] Zero TypeScript errors
- [ ] Zero memory leaks during file processing

### Integration & Performance:
- [ ] Import completes in <30s for 1000 records
- [ ] Error reporting provides actionable feedback
- [ ] Data validation prevents corrupt imports
- [ ] Duplicate detection accuracy >95%
- [ ] File processing memory usage optimized

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Import page: `/wedsync/src/app/(dashboard)/clients/import/page.tsx`
- Components: `/wedsync/src/components/clients/import/`
- Processing: `/wedsync/src/lib/import/file-processor.ts`
- Validation: `/wedsync/src/lib/import/data-validator.ts`
- Tests: `/wedsync/tests/import/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-c-round-2-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-c-round-2-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-c-round-2-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT allow unlimited file sizes (memory exhaustion risk)
- Do NOT skip file content validation (security risk)
- Do NOT process files without user permission verification
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - test with realistic file sizes

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY