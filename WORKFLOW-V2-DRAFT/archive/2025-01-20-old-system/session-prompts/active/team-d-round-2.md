# TEAM D - ROUND 2: Photo Management System - File Upload, Organization & Gallery Integration

**Date:** 2025-08-20  
**Priority:** P1 from roadmap  
**Mission:** Build comprehensive photo management system with secure upload, organization, and client gallery features  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Feature Assignment:**
- **Source:** /CORE-SPECIFICATIONS/02-WEDSYNC-SUPPLIER-PLATFORM/03-Client-Management/09-photo-management md.md
- Create secure file upload system for wedding photos
- Build photo organization with albums, tags, and metadata
- Implement client gallery with viewing permissions
- Add photo processing (resizing, optimization, watermarking)
- Integration with existing client management system

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Storage: Supabase Storage with CDN
- Testing: Playwright MCP, Vitest
- Image Processing: Sharp, Next.js Image optimization

**Integration Points:**
- **Client Management**: Photo albums linked to client records
- **Supabase Storage**: Secure file storage with RLS policies
- **WedMe Platform**: Photo sync capabilities for wedding galleries

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");
await mcp__context7__get-library-docs("/supabase/supabase", "storage-upload", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "image-optimization", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "row-level-security", 2000);

// Photo management libraries:
await mcp__context7__get-library-docs("/lovell/sharp", "image-processing", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("upload", "src/lib", true);
await mcp__serena__get_symbols_overview("src/components/clients");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Photo management system"
2. **supabase-specialist** --think-hard --use-loaded-docs "File storage and RLS"
3. **react-ui-specialist** --think-ultra-hard --follow-existing-patterns "Gallery and upload UI" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **performance-optimization-expert** --image-optimization --lazy-loading

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Focus on secure photo handling."

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 2

### Core Photo Management:
- [ ] Secure photo upload component with drag-and-drop
- [ ] Photo album organization system with client linking
- [ ] Client gallery viewer with permission controls
- [ ] Photo metadata management (EXIF, tags, descriptions)
- [ ] Image processing pipeline (resize, optimize, watermark)
- [ ] Photo sharing and download controls
- [ ] Bulk photo operations (select, move, delete)
- [ ] Advanced Playwright tests for file upload workflows

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team C: Client data structure - Required for photo-client linking
- FROM Team B: File upload security patterns - Needed for secure photo handling

### What other teams NEED from you:
- TO Team E: Photo component patterns - They need this for onboarding galleries
- TO Team A: Photo gallery UI patterns - Blocking their portfolio features

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Only image files accepted (.jpg, .png, .webp, .heic)
- [ ] File size limits enforced (max 50MB per photo)
- [ ] RLS policies prevent cross-client photo access
- [ ] Malicious file scanning before storage
- [ ] Watermarking applied to protect photographer IP
- [ ] Audit logging for photo access and downloads
- [ ] GDPR compliance for photo metadata and facial recognition

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. PHOTO UPLOAD TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/clients/123/photos"});
await mcp__playwright__browser_file_upload({
  paths: [
    "/path/to/wedding-photo-1.jpg",
    "/path/to/wedding-photo-2.png",
    "/path/to/wedding-photo-3.heic"
  ]
});
await mcp__playwright__browser_wait_for({text: "Uploading 3 photos"});
await mcp__playwright__browser_snapshot();

// 2. PHOTO GALLERY TESTING
await mcp__playwright__browser_wait_for({text: "3 photos uploaded"});
await mcp__playwright__browser_click({
  element: "Gallery view button",
  ref: "button[data-testid='gallery-view']"
});
await mcp__playwright__browser_snapshot();

// 3. PHOTO ORGANIZATION TESTING
await mcp__playwright__browser_click({
  element: "Create album button",
  ref: "button[data-testid='create-album']"
});
await mcp__playwright__browser_type({
  element: "Album name input",
  ref: "input[data-testid='album-name']",
  text: "Ceremony Photos"
});
await mcp__playwright__browser_drag({
  startElement: "Photo thumbnail",
  startRef: "[data-testid='photo-123']",
  endElement: "Album drop zone",
  endRef: "[data-testid='album-dropzone']"
});

// 4. CLIENT GALLERY PERMISSIONS TESTING
await mcp__playwright__browser_navigate({url: "/clients/123/gallery?share_token=abc123"});
await mcp__playwright__browser_wait_for({text: "Wedding Gallery"});
// Verify client can view but not download without permission
await mcp__playwright__browser_click({
  element: "Download photo",
  ref: "button[data-testid='download-photo']"
});
await mcp__playwright__browser_wait_for({text: "Permission required"});

// 5. BULK OPERATIONS TESTING
await mcp__playwright__browser_navigate({url: "/clients/123/photos"});
await mcp__playwright__browser_click({
  element: "Select all checkbox",
  ref: "input[data-testid='select-all-photos']"
});
await mcp__playwright__browser_click({
  element: "Bulk move button",
  ref: "button[data-testid='bulk-move']"
});
await mcp__playwright__browser_select_option({
  element: "Target album",
  ref: "select[data-testid='target-album']",
  values: ["Reception Photos"]
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Photo upload accepts valid formats only
- [ ] Gallery displays photos with proper permissions
- [ ] Album organization works with drag-and-drop
- [ ] Client gallery respects sharing permissions
- [ ] Bulk operations handle multiple photo selection

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 2 deliverables complete
- [ ] Photo upload handles files up to 50MB
- [ ] Gallery loads photos in <2s
- [ ] Zero TypeScript errors
- [ ] Zero memory leaks during image processing

### Security & Performance:
- [ ] RLS policies tested and working
- [ ] Image optimization reduces file sizes by >60%
- [ ] Watermarking applied to all client-facing photos
- [ ] Photo permissions system functional
- [ ] Performance targets met for gallery loading

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Photo management: `/wedsync/src/app/(dashboard)/clients/[id]/photos/`
- Components: `/wedsync/src/components/photos/`
- Upload service: `/wedsync/src/lib/photos/upload-service.ts`
- Gallery components: `/wedsync/src/components/photos/gallery/`
- Tests: `/wedsync/tests/photos/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-d-round-2-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-d-round-2-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-d-round-2-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT allow unlimited photo uploads (storage costs)
- Do NOT skip image optimization (bandwidth costs)
- Do NOT expose client photos without permission checks
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - test with realistic photo sizes

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY