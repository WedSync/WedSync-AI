# TEAM A - ROUND 1: Landing Pages System - Marketing Page Implementation

**Date:** 2025-08-20  
**Priority:** P0 from roadmap  
**Mission:** Build responsive marketing landing pages with A/B testing framework and conversion tracking  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- **Source:** /WORKFLOW-V2-DRAFT/02-FEATURE-DEVELOPMENT/output/2025-08-20/landing-pages-system-technical.md
- Create main landing page at /(marketing)/page.tsx
- Implement vendor-specific landing pages (/photographers, /djs, /florists)
- Build invitation landing pages with personalized content
- A/B testing system with variant assignment
- Conversion tracking and analytics integration

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Analytics: Google Analytics, Supabase Analytics
- A/B Testing: Custom service with Redis caching

**Integration Points:**
- **Marketing Analytics**: Track visits, conversions, A/B test assignments
- **Database**: landing_page_visits, invitation_codes, ab_test_variants tables
- **Authentication**: User signup flow integration

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("next.js");
await mcp__context7__get-library-docs("/vercel/next.js", "app-router metadata", 5000);
await mcp__context7__get-library-docs("/tailwindlabs/tailwindcss", "responsive-design", 3000);
await mcp__context7__get-library-docs("/framer/motion", "animations", 2000);

// Marketing-specific libraries:
await mcp__context7__get-library-docs("/supabase/supabase", "analytics tracking", 3000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("layout", "src/app", true);
await mcp__serena__get_symbols_overview("src/components/ui");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Landing pages implementation"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Marketing components accessibility"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "App router implementation" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing app/layout.tsx and globals.css
- Understand current routing structure
- Check existing marketing components if any
- Review Supabase analytics patterns

### **PLAN PHASE (THINK HARD!)**
- Design component hierarchy for landing pages
- Plan A/B testing variant system
- Write test cases FIRST (TDD)
- Design analytics tracking events

### **CODE PHASE (PARALLEL AGENTS!)**
- Create marketing route group structure
- Implement LandingHero component with A/B testing
- Build SocialProof and FeatureHighlights components
- Add analytics tracking integration

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Implementation:
- [ ] Main landing page at /app/(marketing)/page.tsx
- [ ] LandingHero component with A/B testing variants
- [ ] SocialProof component with live metrics
- [ ] FeatureHighlights component with vendor filtering
- [ ] MarketingAnalytics service integration
- [ ] Unit tests with >80% coverage
- [ ] Basic Playwright accessibility tests

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Database schema for analytics tables - Required for tracking
- FROM Team C: Analytics integration endpoints - Needed for conversion tracking

### What other teams NEED from you:
- TO Team B: Landing page analytics requirements - They need this for backend
- TO Team E: Marketing component patterns - Blocking their onboarding work

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)
- [ ] No sensitive analytics data exposed in client-side code
- [ ] A/B test variants validated server-side
- [ ] Invitation codes require server-side validation
- [ ] No hardcoded API keys in frontend
- [ ] CSP headers for marketing assets
- [ ] Input sanitization for UTM parameters

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. ACCESSIBILITY SNAPSHOT ANALYSIS
await mcp__playwright__browser_navigate({url: "http://localhost:3000"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. A/B TEST VARIANT VALIDATION
await mcp__playwright__browser_navigate({url: "/?source=google&test_variant=hero_v2"});
await mcp__playwright__browser_wait_for({text: "variant-specific content"});
await mcp__playwright__browser_snapshot();

// 3. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-landing.png`});
}

// 4. CONVERSION FLOW TESTING
await mcp__playwright__browser_click({
  element: "Start Free Trial button",
  ref: "button[data-testid='primary-cta']"
});
await mcp__playwright__browser_wait_for({text: 'Create Account'});
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] A/B test variant assignments working correctly  
- [ ] Scientific performance (Core Web Vitals)
- [ ] Zero console errors (verified)
- [ ] Responsive at all sizes (375px, 768px, 1920px)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 1 deliverables complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating landing page flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Performance & UX:
- [ ] Landing page loads in <2s
- [ ] A/B testing variants assign consistently
- [ ] Performance targets met (Lighthouse >90)
- [ ] Accessibility validation passed
- [ ] Works on all breakpoints (375px, 768px, 1920px)

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Main page: `/wedsync/src/app/(marketing)/page.tsx`
- Components: `/wedsync/src/components/marketing/`
- Services: `/wedsync/src/lib/marketing/`
- Types: `/wedsync/src/types/marketing.ts`
- Tests: `/wedsync/tests/marketing/`

---

## 📝 THREE REPORTS REQUIRED AT END OF ROUND:

### REPORT 1: Brief Overview (2-3 paragraphs)
**File:** `/SESSION-LOGS/2025-08-20/team-a-round-1-overview.md`

### REPORT 2: Dev Manager Feedback  
**File:** `/SESSION-LOGS/2025-08-20/team-a-round-1-to-dev-manager.md`

### REPORT 3: Senior Dev Review Prompt
**File:** `/SESSION-LOGS/2025-08-20/team-a-round-1-senior-dev-prompt.md`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY