# TEAM E - ROUND 1: WS-060 - Wedding Website Builder - Core Implementation

**Date:** 2025-08-22  
**Feature ID:** WS-060 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build wedding website builder with template selection and custom subdomain generation  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Tech-savvy couple planning our wedding
**I want to:** Create a beautiful wedding website without hiring a developer
**So that:** Guests have all wedding info in one place and we save $800 on a custom site

**Real Wedding Problem This Solves:**
Emma & Jake choose the "Classic Romance" template, customize it with their engagement photos and wedding colors. They add their schedule, registry links, and RSVP form. The site auto-generates at emmajake2025.wedsync.com and they share it on their save-the-dates. 95% of guests RSVP through the website instead of calling with questions.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Template selection with live preview and customization
- Custom subdomain generation (couplenames.wedsync.com)
- Mobile-responsive design with fast loading
- Integration with RSVP system and guest information
- Drag-and-drop website builder interface
- Photo gallery integration
- Custom color scheme and font selection
- Wedding schedule and timeline display
- Registry links and vendor information
- SEO optimization for guest discovery

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- File Storage: Supabase Storage for photos and assets
- Template Engine: Dynamic React components
- Subdomain Management: DNS and routing configuration
- SEO: Next.js metadata optimization

**Integration Points:**
- Guest Database: RSVP integration from Team A & B
- RSVP System: Direct RSVP forms from Team B
- Task System: Website launch tasks from Team C
- Photo Management: Wedding photo galleries
- Subdomain Routing: Custom domain handling

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
// Think hard about what documentation you need for website builder
await mcp__context7__resolve-library-id("next.js");  // Get correct library ID first
await mcp__context7__get-library-docs("/vercel/next.js", "dynamic-routing subdomains metadata", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "storage file-upload", 3000);
await mcp__context7__get-library-docs("/tailwindcss/tailwindcss", "dynamic-themes customization", 2000);

// For this specific feature, also load:
await mcp__context7__get-library-docs("/react-dnd/react-dnd", "drag-drop builder", 2000);
await mcp__context7__get-library-docs("/react-color/react-color", "color-picker", 1500);
await mcp__context7__get-library-docs("/framer-motion/framer-motion", "page-transitions", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("couples", "", true);
await mcp__serena__get_symbols_overview("src/components");
await mcp__serena__search_for_pattern("template|website|subdomain", true);

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Next.js changes weekly!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build website builder with template system"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Create drag-drop website builder UI"
3. **database-mcp-specialist** --think-ultra-hard --follow-existing-patterns "Design website storage schema" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Secure subdomain management"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **performance-optimization-expert** --seo-focus "Website performance and SEO optimization"
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for dynamic components."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read existing couples/user management patterns
- Understand current file upload and storage systems
- Check how dynamic routing is implemented
- Review similar template-based UI builders
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Design website database schema per specification
- Plan template rendering and customization system
- Design subdomain generation and routing
- Plan drag-and-drop builder interface
- Consider edge cases (subdomain conflicts, large images)

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing UI patterns from SAAS-UI-STYLE-GUIDE.md
- Use Context7 examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright (template selection, customization, publishing)
- Test subdomain generation and routing
- Create evidence package
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Database schema implementation (wedding_websites, website_templates tables)
- [ ] Website Builder Dashboard at `/src/components/wedme/website/WebsiteBuilder.tsx`
- [ ] Template Selection UI with preview functionality
- [ ] Basic customization panel (colors, fonts, content)
- [ ] Subdomain generation and validation system
- [ ] Template rendering engine for public websites
- [ ] File upload for wedding photos and assets
- [ ] Website preview functionality
- [ ] Basic drag-and-drop section management
- [ ] Mobile-responsive builder interface
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright tests for builder flow

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Guest data for RSVP integration (WS-056)
- FROM Team B: RSVP system integration for website forms (WS-057)

### What other teams NEED from you:
- TO Team A: Website URL for guest communication
- TO Team B: Website RSVP form embedding
- TO Team C: Website launch tasks and maintenance
- TO Team D: Website cost tracking and analytics

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] Subdomain validation and sanitization
- [ ] File upload restrictions (image types, sizes)
- [ ] Website content sanitization (XSS prevention)
- [ ] Access control for website editing
- [ ] Published website performance optimization
- [ ] SEO security (prevent malicious content)
- [ ] Custom domain validation if implemented
- [ ] Audit logging for website modifications

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/wedme/website"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for website builder - zero ambiguity!

// 2. TEMPLATE SELECTION FLOW
await mcp__playwright__browser_click({
  element: "Create Website button",
  ref: "[data-testid='create-website-btn']"
});
await mcp__playwright__browser_click({
  element: "Classic Romance template",
  ref: "[data-testid='template-classic-romance']"
});
await mcp__playwright__browser_wait_for({text: "Classic Romance selected"});

// 3. SUBDOMAIN GENERATION TEST
await mcp__playwright__browser_type({
  element: "Couple names input",
  ref: "[data-testid='couple-names']",
  text: "Emma & Jake"
});
await mcp__playwright__browser_click({
  element: "Generate subdomain",
  ref: "[data-testid='generate-subdomain']"
});
await mcp__playwright__browser_wait_for({text: "emmajake2025.wedsync.com"});

// 4. CUSTOMIZATION PANEL TEST
await mcp__playwright__browser_click({
  element: "Customize colors",
  ref: "[data-testid='customize-colors']"
});
await mcp__playwright__browser_click({
  element: "Primary color picker",
  ref: "[data-testid='primary-color']"
});
await mcp__playwright__browser_click({
  element: "Sage green color",
  ref: "[data-color='#87a96b']"
});
await mcp__playwright__browser_wait_for({text: "Color updated"});

// 5. PHOTO UPLOAD TEST
await mcp__playwright__browser_click({
  element: "Upload engagement photos",
  ref: "[data-testid='upload-photos']"
});
await mcp__playwright__browser_file_upload({
  paths: ["/test-data/engagement-photo-1.jpg", "/test-data/engagement-photo-2.jpg"]
});
await mcp__playwright__browser_wait_for({text: "2 photos uploaded"});

// 6. CONTENT EDITING TEST
await mcp__playwright__browser_click({
  element: "Edit welcome message",
  ref: "[data-testid='edit-welcome']"
});
await mcp__playwright__browser_type({
  element: "Welcome text editor",
  ref: "[data-testid='welcome-editor']",
  text: "Join us as we celebrate our love story!"
});
await mcp__playwright__browser_click({
  element: "Save content",
  ref: "[data-testid='save-welcome']"
});
await mcp__playwright__browser_wait_for({text: "Content saved"});

// 7. PREVIEW AND PUBLISH TEST
await mcp__playwright__browser_click({
  element: "Preview website",
  ref: "[data-testid='preview-website']"
});
await mcp__playwright__browser_tab_new({url: "emmajake2025.wedsync.com"});
await mcp__playwright__browser_wait_for({text: "Join us as we celebrate our love story!"});
await mcp__playwright__browser_tab_close();

await mcp__playwright__browser_click({
  element: "Publish website",
  ref: "[data-testid='publish-website']"
});
await mcp__playwright__browser_wait_for({text: "Website published successfully!"});

// 8. DRAG-AND-DROP BUILDER TEST
await mcp__playwright__browser_drag({
  startElement: "Photo gallery section",
  startRef: "[data-section='photo-gallery']",
  endElement: "Above schedule section",
  endRef: "[data-drop-zone='above-schedule']"
});
await mcp__playwright__browser_wait_for({text: "Section moved"});

// 9. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `website-builder-${width}px.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Template selection and preview
- [ ] Subdomain generation and validation
- [ ] Color and font customization
- [ ] Photo upload and management
- [ ] Content editing and saving
- [ ] Website preview and publishing
- [ ] Mobile responsive builder interface

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All deliverables for Round 1 complete
- [ ] Template system functional with previews
- [ ] Subdomain generation working correctly
- [ ] Customization panel fully operational
- [ ] Photo upload and display working
- [ ] Website publishing successful
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Ready for RSVP system integration
- [ ] Website loading <2s for published sites
- [ ] Builder interface responsive <500ms
- [ ] Photo optimization and caching working
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot of template selection
- [ ] Screenshot of customization panel
- [ ] Screenshot of published website
- [ ] Screenshots of mobile responsive builder
- [ ] Test results and coverage
- [ ] Performance metrics for published site

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Builder: `/wedsync/src/components/wedme/website/WebsiteBuilder.tsx`
- Templates: `/wedsync/src/components/wedme/website/templates/`
- Customizer: `/wedsync/src/components/wedme/website/Customizer.tsx`
- Preview: `/wedsync/src/components/wedme/website/WebsitePreview.tsx`
- Public Site: `/wedsync/src/app/[subdomain]/page.tsx`
- API Routes: `/wedsync/src/app/api/websites/route.ts`
- Templates API: `/wedsync/src/app/api/websites/templates/route.ts`
- Subdomain API: `/wedsync/src/app/api/websites/subdomains/route.ts`
- Database: `/wedsync/supabase/migrations/XXX_wedding_websites.sql`
- Template Engine: `/wedsync/src/lib/services/template-engine.ts`
- Subdomain Utils: `/wedsync/src/lib/utils/subdomain.ts`
- Tests: `/wedsync/tests/wedme/website/`
- Types: `/wedsync/src/types/website.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch4/WS-060-batch4-round-1-complete.md`
- **Include:** Feature ID (WS-060) in all filenames
- **Save in:** batch4 folder (NOT in CORRECT folder)
- **After completion:** Update senior dev that Round 1 is complete

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch4/WS-060-batch4-round-1-complete.md`

Must include:
1. Summary of website builder system built
2. Files created/modified list
3. Test results and coverage
4. Screenshots/evidence of published website
5. Template system functionality
6. Integration points ready
7. Any blockers or issues

---

## ⚠️ CRITICAL WARNINGS
- Do NOT build guest list UI (Team A's WS-056)
- Do NOT implement RSVP backend (Team B's WS-057)
- Do NOT build task delegation (Team C's WS-058)
- Do NOT build budget features (Team D's WS-059)
- FOCUS ONLY on website builder and template system
- REMEMBER: All 5 teams work in PARALLEL - no overlapping work

---

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Website builder interface functional
- [ ] Template selection with preview working
- [ ] Subdomain generation operational
- [ ] Customization panel complete
- [ ] Photo upload and display working
- [ ] Website publishing successful
- [ ] All tests passing
- [ ] Security validated
- [ ] Performance targets met
- [ ] Code committed
- [ ] Report created

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY