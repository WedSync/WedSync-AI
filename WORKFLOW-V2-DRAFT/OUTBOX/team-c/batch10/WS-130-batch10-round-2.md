# TEAM C - ROUND 2: WS-130 - Photography Library AI - Integration & Enhancement

**Date:** 2025-01-24  
**Feature ID:** WS-130 (Track all work with this ID)  
**Priority:** HIGH from roadmap  
**Mission:** Enhance AI photography system with color harmony analysis and portfolio matching capabilities  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding florist designing 120+ arrangements per year with varying seasonal availability and sustainability concerns
**I want to:** Access AI-powered flower selection that considers seasonality, color harmony, sustainability, and allergen compatibility
**So that:** I reduce 3 hours per consultation spent on flower research and eliminate client disappointment from unavailable or problematic flower choices

**Real Wedding Problem This Solves:**
A couple wants "dusty rose and eucalyptus" for their November outdoor wedding in Chicago. Instead of manually checking seasonal charts and allergen lists, the florist enters the color scheme and date. The AI suggests alternatives like "mauve chrysanthemums with silver brunia" (in season, allergy-friendly), calculates sustainability scores based on local growing regions, and generates care timelines to ensure peak freshness on wedding day.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Color harmony analysis and matching system
- Photographer portfolio style categorization
- AI-powered mood board creation
- Advanced search with style filtering
- Integration with photography booking system
- Real-time style trend analysis

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- AI: OpenAI GPT-4 for image analysis and style matching
- Testing: Playwright MCP, Vitest

**Integration Points:**
- AI Infrastructure: Color analysis APIs and image processing
- Photography Database: Style categorization and portfolio management
- Wedding Context System: Theme and style preferences
- Vendor Coordination: Photographer matching and booking integration

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("openai");  // Get correct library ID first
await mcp__context7__get-library-docs("/openai/openai-node", "structured-output image-analysis", 5000);
await mcp__context7__get-library-docs("/supabase/supabase", "database functions image-storage", 3000);
await mcp__context7__get-library-docs("/vercel/next.js", "api-routes file-upload", 2000);

// For this specific feature, also load:
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "color-utilities grid-layouts", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("AIAnalysisService", "", true);
await mcp__serena__get_symbols_overview("/src/lib/ai/");

// NOW you have current docs + codebase context. Agents can work intelligently!
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (OpenAI updates frequently!)
- Serena shows existing patterns to follow (don't reinvent the wheel!)
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Photography AI enhancement and color analysis"
2. **ai-ml-engineer** --think-hard --use-loaded-docs "Image analysis and style matching algorithms"
3. **react-ui-specialist** --think-ultra-hard --follow-existing-patterns "Photography portfolio interface and color harmony tools" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files first
- Understand existing AI infrastructure patterns
- Check integration points with photography system
- Review similar implementations in the codebase
- Continue until you FULLY understand the architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan for Round 2 enhancements
- Write test cases FIRST (TDD)
- Plan error handling for AI operations
- Consider edge cases in image analysis
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns from AI infrastructure
- Use Context7 examples as templates for OpenAI integration
- Implement with parallel agents
- Focus on completeness, not speed

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all tests
- Verify with Playwright
- Create evidence package
- Generate reports
- Only mark complete when ACTUALLY complete

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Enhancement & Integration):
- [ ] Advanced color harmony analysis system
- [ ] Photographer style matching algorithm
- [ ] Mood board generation with AI recommendations
- [ ] Integration with existing photography booking system
- [ ] Enhanced search filters with style categorization
- [ ] Performance optimization for large image processing
- [ ] Advanced Playwright test scenarios
- [ ] Error handling and fallback mechanisms

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Music recommendation integration for style consistency
- FROM Team B: Florist AI color palette sharing for unified wedding themes

### What other teams NEED from you:
- TO Team D: Photography style data for pricing tier feature gates
- TO Team E: Usage analytics for trial conversion tracking

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] All image uploads require authentication
- [ ] Input validation with Zod schemas for AI prompts  
- [ ] No sensitive data in AI request logs
- [ ] Image processing rate limiting
- [ ] Secure file upload handling
- [ ] API key protection for OpenAI
- [ ] CSRF protection for image upload endpoints

---

## ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-130.md
- SQL Expert will handle application and conflict resolution

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY TESTING APPROACH - Microsoft's Breakthrough!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/photography/library"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for LLM analysis - zero ambiguity!

// 2. MULTI-TAB COMPLEX AI WORKFLOW (REVOLUTIONARY!)
await mcp__playwright__browser_tab_new({url: "/photography/search"});     // Tab 1: Search
await mcp__playwright__browser_tab_new({url: "/photography/mood-board"}); // Tab 2: Mood Board
await mcp__playwright__browser_tab_select({index: 0});                    // Switch to search
await mcp__playwright__browser_drag({                                     // Test image drag-drop
  startElement: "Photo Thumbnail", startRef: ".photo-grid img:first-child",
  endElement: "Mood Board Canvas", endRef: ".mood-board-drop-zone"
});
await mcp__playwright__browser_tab_select({index: 1});                    // Check mood board
await mcp__playwright__browser_wait_for({text: "Photo added to mood board"});

// 3. SCIENTIFIC PERFORMANCE MEASUREMENT (Real Metrics!)
const realMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    TTFB: performance.timing.responseStart - performance.timing.fetchStart,
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    memoryUsage: performance.memory?.usedJSHeapSize || 0,
    imageLoadTime: document.querySelectorAll('img').length
  })`
});

// 4. AI PROCESSING VALIDATION
await mcp__playwright__browser_type({
  element: 'Style Search Input',
  ref: 'input[name="styleQuery"]',
  text: 'romantic garden party photography'
});
await mcp__playwright__browser_click({element: 'Analyze Style Button', ref: 'button.analyze-style'});
await mcp__playwright__browser_wait_for({text: 'Style analysis complete'});

// 5. ERROR DETECTION & CONSOLE MONITORING
const consoleErrors = await mcp__playwright__browser_console_messages();
const networkFailures = await mcp__playwright__browser_network_requests();
const failedRequests = networkFailures.filter(req => req.status >= 400);

// 6. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-photography-ai.png`});
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] Multi-tab AI workflow testing (image processing across tabs)
- [ ] Scientific performance (Core Web Vitals + AI processing time)
- [ ] Zero console errors (verified)
- [ ] Network success (no 4xx/5xx, especially for AI API calls)
- [ ] Responsive at all sizes (375px, 768px, 1920px)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 2 deliverables complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating AI workflows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integration points working with Teams A & B
- [ ] AI processing under 3 seconds per image
- [ ] Accessibility validation passed
- [ ] Security requirements met
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working AI features
- [ ] Playwright test results showing AI workflows
- [ ] Performance metrics for image processing
- [ ] Console error-free proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/photography/`
- Backend: `/wedsync/src/app/api/photography/`
- AI Services: `/wedsync/src/lib/ai/photography/`
- Tests: `/wedsync/tests/photography/`
- Types: `/wedsync/src/types/photography.ts`
- Migrations: `/wedsync/supabase/migrations/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch10/WS-130-round-2-complete.md`
- **Include:** Feature ID (WS-130) in all filenames
- **Save in:** Correct batch folder (batch10)
- **After completion:** Run `./route-messages.sh`

---

## 📝 TEAM OUTPUT REQUIRED AT END OF ROUND:

### CRITICAL: Use Standard Team Output Template
**Template:** See `/WORKFLOW-V2-DRAFT/TEAM-OUTPUT-TEMPLATE.md` for EXACT format
**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch10/WS-130-round-2-complete.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY