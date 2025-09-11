# TEAM A - ROUND 1: WS-047 - Review Collection System - Frontend Components & UI

**Date:** 2025-01-20  
**Feature ID:** WS-047 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build the core review collection interface components for suppliers to manage automated review campaigns  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer who just completed a wedding
**I want to:** Automatically collect reviews 10 days post-wedding when couples are happiest
**So that:** I get 67% more bookings from online reviews instead of manually chasing testimonials for months

**Real Wedding Problem This Solves:**
Jake photographed Emma & Mike's wedding on June 15th. On June 25th, the system automatically sends Emma a personalized review request: "Hi Emma! Hope you're still glowing from your beautiful ceremony at Sunset Manor! Would you mind sharing your experience with Jake?" One-click takes her to a pre-filled form with her wedding details, she leaves a 5-star Google review, and Jake gets 3 inquiries that week from couples who found him through that review.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
This is a core SAAS feature that helps suppliers automatically collect positive reviews to grow their business. It's NOT lead generation for new clients - it's about showcasing success stories from completed weddings to attract future couples.

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Review Campaigns: Campaign management interface
- Analytics Dashboard: Performance metrics display
- Platform Integrations: Google Business, Facebook connections

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
# Use Ref MCP to search for:
# - "Next.js App Router forms server actions"
# - "React Hook Form validation patterns"
# - "Tailwind CSS responsive components"
# - "React 19 concurrent features"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("Dashboard", "", true);
await mcp__serena__get_symbols_overview("src/components/ui");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Review collection UI components"
2. **react-ui-specialist** --think-hard --use-loaded-docs "React 19 form components with server actions"
3. **ui-ux-designer** --think-ultra-hard --follow-existing-patterns "Review campaign management interface" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read ALL relevant files first in `/src/components/`
- Understand existing dashboard patterns and form components
- Check integration points with analytics and settings
- Review similar implementations for campaigns or automated systems
- Continue until you FULLY understand the codebase patterns

### **PLAN PHASE (THINK HARD!)**
- Create detailed implementation plan for review collection UI
- Write test cases FIRST (TDD approach)
- Plan responsive design for mobile suppliers
- Consider accessibility requirements
- Plan component architecture and state management

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing patterns from loaded documentation
- Use Ref MCP examples as templates for forms
- Implement with parallel agents
- Focus on completeness, not speed

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Primary Components to Build:
- [ ] **ReviewCampaignBuilder** - `/src/components/reviews/ReviewCampaignBuilder.tsx`
  - Campaign configuration form with timing options
  - Message template builder with merge fields
  - Platform selection interface
  - Incentive configuration UI
  - Preview functionality

- [ ] **ReviewDashboard** - `/src/components/reviews/ReviewDashboard.tsx`
  - Analytics overview cards
  - Recent reviews display
  - Campaign status indicators
  - Quick actions panel

- [ ] **ReviewPlatformIntegrations** - `/src/components/reviews/PlatformIntegrations.tsx`
  - Google Business connection interface
  - Facebook page integration UI
  - Connection status indicators
  - Platform-specific setup wizards

### Supporting Components:
- [ ] **ReviewCampaignCard** - Individual campaign display component
- [ ] **ReviewMetrics** - Metrics visualization component
- [ ] **MessageTemplateEditor** - Rich text editor for review request messages
- [ ] **PlatformToggle** - Platform selection toggle component

### Unit Tests Required:
- [ ] Test campaign form validation
- [ ] Test message template preview
- [ ] Test platform integration flows
- [ ] Test responsive behavior
- [ ] Test accessibility compliance

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Review campaigns API endpoints - Required for form submissions
- FROM Team B: Platform integration API - Needed for connection status
- FROM Team C: Email template integration - For message previews

### What other teams NEED from you:
- TO Team D: Component exports for WedMe integration
- TO Team E: Test fixtures and mock data for E2E testing
- TO All Teams: Shared UI components and patterns

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL FORMS

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { reviewCampaignSchema } from '@/lib/validation/schemas';

// All form submissions must use validated server actions
export const createReviewCampaign = withSecureValidation(
  reviewCampaignSchema,
  async (request: NextRequest, validatedData) => {
    // Implementation with validated data
  }
);
```

### SECURITY CHECKLIST FOR ALL COMPONENTS:
- [ ] Input validation with Zod schemas
- [ ] XSS prevention on all user inputs
- [ ] CSRF protection on state changes
- [ ] Sanitize message templates before preview
- [ ] Secure file upload for campaign assets
- [ ] Rate limiting on form submissions

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. ACCESSIBILITY SNAPSHOT ANALYSIS
await mcp__playwright__browser_navigate({url: "http://localhost:3000/reviews/campaigns"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. RESPONSIVE VALIDATION (All Breakpoints)
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `${width}px-review-dashboard.png`});
}

// 3. FORM INTERACTION TESTING
await mcp__playwright__browser_type({
  element: 'campaign name', 
  ref: 'input[name="campaignName"]', 
  text: 'Post-Wedding Reviews'
});
await mcp__playwright__browser_click({
  element: 'create campaign button', 
  ref: 'button[type="submit"]'
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Accessibility-first validation (structured tree, not pixels)
- [ ] Form validation and error states
- [ ] Responsive design at all sizes
- [ ] Zero console errors
- [ ] Performance validation (<1s load time)

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All primary components complete and responsive
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating user flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors
- [ ] Components integrate with existing dashboard layout

### Integration & Performance:
- [ ] Components use existing design system patterns
- [ ] Form submissions work with validation middleware
- [ ] Performance targets met (<1s component render)
- [ ] Accessibility validation passed (WCAG 2.1 AA)
- [ ] Works on all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working components
- [ ] Playwright test results showing form interactions
- [ ] Performance metrics for component loading
- [ ] Console error-free proof
- [ ] Test coverage report >80%

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/reviews/`
- Types: `/wedsync/src/types/reviews.ts`
- Tests: `/wedsync/tests/components/reviews/`
- Styles: Follow existing Tailwind patterns

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch18A/WS-047-team-a-round-1-complete.md`
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements - use validation middleware
- Do NOT claim completion without evidence
- REMEMBER: This is core SAAS functionality, not lead generation
- Focus on helping suppliers showcase their work to attract new couples

---

**END OF ROUND PROMPT - EXECUTE IMMEDIATELY**