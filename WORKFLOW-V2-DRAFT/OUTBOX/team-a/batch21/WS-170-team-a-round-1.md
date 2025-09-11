# TEAM A — BATCH 21 — ROUND 1 — WS-170: Viral Optimization System - UI Components

**Date:** 2025-08-26  
**Feature ID:** WS-170 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build viral referral UI components for supplier growth mechanics  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before Round 2.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier using WedSync
**I want to:** Leverage happy clients to refer other couples and suppliers
**So that:** I can grow my business through word-of-mouth while helping WedSync expand

**Real Wedding Problem This Solves:**
A photographer completes a wedding and their happy couple shares their WedSync experience with 3 other engaged couples. Each referral that signs up gives both the photographer and couple rewards. This viral loop reduces customer acquisition cost by 60%.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-170:**
- Build ReferralWidget component with sharing capabilities
- Implement social sharing buttons and QR code generation
- Create referral code display and copy functionality
- Add referral stats dashboard
- Build reward progress tracker

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- Team B API: Referral creation and tracking endpoints
- Team C Analytics: Viral coefficient calculations
- Team D Rewards: Reward system integration
- Database: referrals, viral_metrics, sharing_events tables

---


## 🧠 SEQUENTIAL THINKING MCP FOR COMPLEX FEATURE ANALYSIS

### When to Use Sequential Thinking

Before diving into coding, use Sequential Thinking MCP when facing:

- **Complex Feature Architecture**: Multi-component systems with intricate dependencies
- **Integration Challenges**: Features that span multiple systems and require coordination  
- **Business Logic Complexity**: Wedding-specific rules that need careful analysis
- **Technical Trade-offs**: Choosing between multiple implementation approaches
- **Debugging Complex Issues**: Root cause analysis for multi-system problems

### Sequential Thinking Patterns for Development Teams

#### Pattern 1: Feature Architecture Analysis
```typescript
// Before starting complex feature development
mcp__sequential-thinking__sequential_thinking({
  thought: "This task tracking feature needs to integrate with existing task creation (WS-156), helper assignment (WS-157), and real-time notifications. Need to analyze data flow and identify potential integration points.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: User creates task -> assigns helpers -> helpers update status -> triggers notifications -> updates progress indicators. Each step requires API endpoints, validation, and error handling.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

#### Pattern 2: Integration Strategy Planning  
```typescript
// When coordinating with other teams' work
mcp__sequential-thinking__sequential_thinking({
  thought: "Team A is building UI components, Team C is handling real-time updates, and Team E is implementing testing. Need to define clear API contracts and data structures that all teams can use.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 3
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API contract definition: /api/tasks/status endpoints need to support CRUD operations, validation schemas, and webhook events. Response format should match Team A's UI expectations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 3
});
```

#### Pattern 3: Business Logic Analysis
```typescript
// When implementing wedding-specific business rules
mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding task tracking has unique requirements: tasks can be delegated to multiple helpers, status updates need photo evidence for critical tasks, and deadlines are tied to wedding date proximity.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Business rule implementation: Critical tasks (venue confirmation, catering numbers) require photo evidence. Non-critical tasks (decoration pickup) can be marked complete without evidence. Need validation logic for each task type.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});
```

### Using Sequential Thinking in Your Development Process

1. **Before Documentation Loading**: Use Sequential Thinking to understand the full scope and complexity
2. **During Planning Phase**: Structure your approach to handle all edge cases and integration points  
3. **When Stuck**: Use Sequential Thinking to work through complex problems systematically
4. **For Reviews**: Use Sequential Thinking to verify your implementation covers all requirements

**Remember**: Complex features require systematic thinking. Use Sequential Thinking MCP to ensure thorough analysis before implementation.

---
## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**
**YOU MUST ACTUALLY EXECUTE THESE COMMANDS AND USE THE RESULTS!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY):
const styleGuide = await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
// USE THIS: The style guide contains button patterns, spacing rules, color schemes

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Returns: "/vercel/next.js" - use this exact ID

const nextDocs = await mcp__Ref__ref_get_library_docs("/vercel/next.js", "app router components client", 5000);
// USE THIS: Latest Next.js 15 patterns for client components

const formDocs = await mcp__Ref__ref_get_library_docs("/react-hook-form/react-hook-form", "useForm validation register", 3000);
// USE THIS: Current react-hook-form v7 validation patterns

const tailwindDocs = await mcp__Ref__ref_get_library_docs("/tailwindlabs/tailwindcss", "modal dialog overlay", 2000);
// USE THIS: Tailwind v4 modal and overlay classes

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
const onboarded = await mcp__serena__check_onboarding_performed();
// Now Serena knows your codebase structure

// 4. REVIEW existing patterns (CRITICAL - DON'T REINVENT):
const buttonPatterns = await mcp__serena__find_symbol("Button", "", true);
// USE THIS: Found existing button at /src/components/ui/button.tsx - follow this pattern!

const uiComponents = await mcp__serena__get_symbols_overview("/src/components/ui/");
// USE THIS: Found card.tsx, dialog.tsx, form.tsx - use these existing components!

// 5. CHECK for similar features already built:
const existingReferrals = await mcp__serena__search_for_pattern("referral|viral|share", "/src");
// USE THIS: Check if any referral code already exists to build upon
```

**NOW YOU HAVE:**
- ✅ Current Next.js 15 documentation (not outdated tutorials)
- ✅ Existing UI component patterns to follow
- ✅ Style guide requirements loaded
- ✅ Codebase intelligence activated

**DO NOT PROCEED WITHOUT EXECUTING THESE COMMANDS!**

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**CRITICAL: Use Task tool to launch agents IN PARALLEL for maximum efficiency:**

```typescript
// Launch ALL agents at once for parallel execution:
await Promise.all([
  Task({
    description: "Build viral UI components",
    prompt: `You are building viral referral UI components for WS-170.
            CRITICAL: Use the Ref MCP docs that were just loaded:
            - next.js components sharing docs (already in context)
            - tailwindcss modal components docs (already in context)
            - react-hook-form validation docs (already in context)
            
            ALSO USE Serena MCP patterns that were discovered:
            - Existing Button patterns found with find_symbol
            - UI component patterns from /src/components/ui/
            
            Build: ReferralWidget component with:
            1. Referral code display with copy functionality
            2. Social sharing buttons (Twitter, Facebook, LinkedIn)
            3. QR code generation for offline sharing
            4. Referral stats display
            
            Follow the exact patterns found in existing components.`,
    subagent_type: "react-ui-specialist"
  }),
  
  Task({
    description: "Security validation",
    prompt: `Validate security for viral referral components WS-170.
            USE the security framework at /src/lib/validation/ (already loaded).
            ENSURE all user inputs are validated with Zod schemas.
            CHECK for XSS vulnerabilities in sharing URLs.
            VERIFY referral codes are properly sanitized.`,
    subagent_type: "security-compliance-officer"
  }),
  
  Task({
    description: "Write TDD tests",
    prompt: `Write tests FIRST for WS-170 viral UI components.
            USE Playwright MCP for E2E testing as shown in docs.
            USE the testing patterns from Ref MCP docs already loaded.
            
            Test scenarios:
            1. Referral code copy functionality
            2. Social sharing button clicks
            3. QR code generation
            4. Mobile responsiveness at 375px, 768px, 1920px`,
    subagent_type: "test-automation-architect"
  }),
  
  Task({
    description: "Coordinate implementation",
    prompt: `Track progress for WS-170 viral UI implementation.
            Monitor parallel agent work.
            Ensure all deliverables are met.
            Create evidence package with screenshots.`,
    subagent_type: "task-tracker-coordinator"
  })
]);

// AGENTS ARE NOW WORKING IN PARALLEL!
// Continue with your own work while agents complete their tasks
```

**AGENT INSTRUCTIONS:** All agents have access to:
- Ref MCP docs loaded in Step 1 (current library documentation)
- Serena patterns discovered in Step 1 (existing codebase patterns)
- Security framework at /src/lib/validation/
- Playwright MCP for testing

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core UI Components):
- [ ] ReferralWidget component with referral code display
- [ ] Social sharing buttons (Twitter, Facebook, LinkedIn, Email)
- [ ] Copy to clipboard functionality with success feedback
- [ ] QR code generation for offline sharing
- [ ] Basic referral stats display (total sent, successful)
- [ ] Unit tests with >80% coverage
- [ ] Playwright tests for sharing flows

**Objective:** Create core viral sharing UI that suppliers can use to refer clients
**Scope In:** UI components, client-side sharing, referral code display
**Scope Out:** Backend API calls, reward calculation, analytics processing
**Affected Paths:** /src/components/viral/, /src/hooks/useReferral.ts
**Dependencies:** Team B API structure (will mock initially)
**Acceptance Criteria:** 
- Referral code displays correctly
- Social sharing opens correct platforms
- Copy functionality works across browsers
- QR codes generate properly
- Component is mobile responsive

**NFRs:** <200ms render time, WCAG AA compliant, works offline
**Test Plan:** Unit tests for all interactions, Playwright E2E for sharing flows
**Risk/Mitigation:** Social platform API changes - use standard URLs
**Handoff Notes:** Export component interfaces for Team B integration
**Overlap Guard:** Team A only handles UI components, not API calls

---

## 🧭 NAVIGATION INTEGRATION REQUIREMENTS

**Critical Navigation Context:**
This feature must integrate seamlessly with WedSync's navigation system to provide intuitive user flows and maintain consistent user experience across all wedding management workflows.

### Navigation Implementation Requirements

**1. Breadcrumb Integration**
```tsx
// Add breadcrumb support to all new pages/components
import { Breadcrumb } from '@/components/ui/breadcrumb'

// Example breadcrumb hierarchy for this feature:
// Dashboard > Helpers > Schedules > [Helper Name] > [Schedule Details]
const breadcrumbItems = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Helpers', href: '/helpers' },
  { label: 'Schedules', href: '/helpers/schedules' },
  { label: helperName, href: `/helpers/schedules/${helperId}` },
  { label: 'Details', href: undefined } // current page
]
```

**2. Menu Integration Points**
- **Main Navigation**: Add/update relevant menu items in main navigation
- **Contextual Menus**: Implement context-sensitive navigation options
- **Quick Actions**: Provide navigation shortcuts for common workflows

**3. Mobile Navigation Considerations**
```tsx
// Ensure mobile-first responsive navigation
// Use progressive disclosure for complex navigation trees
// Implement touch-friendly navigation controls
// Consider swipe gestures for timeline/schedule navigation
```

**4. Navigation State Management**
```tsx
// Implement navigation state persistence
// Handle deep linking and shareable URLs
// Maintain navigation context across page refreshes
// Support browser back/forward functionality
```

**5. User Flow Integration**
- **Entry Points**: Define how users access this feature from existing workflows
- **Exit Points**: Provide clear paths to related features and main dashboard
- **Cross-Feature Navigation**: Enable seamless transitions between related features

**6. Wedding Context Navigation**
```tsx
// Maintain wedding context in navigation
// Support multi-wedding navigation switching
// Preserve user's current wedding selection across feature navigation
// Implement wedding-specific navigation shortcuts
```

**Navigation Testing Requirements:**
- Test all breadcrumb paths and hierarchy
- Verify mobile navigation responsiveness
- Validate deep linking functionality
- Test navigation state persistence
- Ensure keyboard navigation accessibility
- Verify screen reader navigation support

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: API contract for /api/referrals/create - Required for referral generation
- FROM Team C: Analytics integration interface - Needed for stats display

### What other teams NEED from you:
- TO Team B: Component prop interfaces - They need this for API integration
- TO Team D: Reward display requirements - Blocking their reward system UI

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

**EVERY component interaction with APIs MUST use existing validation:**

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { referralSchema } from '@/lib/validation/schemas';

// For component API calls:
const createReferral = async (data: ReferralData) => {
  const validatedData = referralSchema.parse(data);
  // API call with validated data
};
```

### SECURITY CHECKLIST FOR VIRAL COMPONENTS
- [ ] **Input Validation**: Validate email addresses with Zod
- [ ] **XSS Prevention**: Sanitize all user-generated content
- [ ] **URL Validation**: Verify sharing URLs before opening
- [ ] **Rate Limiting**: Don't overwhelm social platforms
- [ ] **Data Sanitization**: Clean referral codes and messages

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// ACCESSIBILITY-FIRST VIRAL SHARING TESTING

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS
await mcp__playwright__browser_navigate({url: "http://localhost:3000/viral-test"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// 2. MULTI-TAB SHARING WORKFLOW
await mcp__playwright__browser_tabs({action: "new"});
await mcp__playwright__browser_click({element: "Share Twitter Button", ref: "[ref]"});
await mcp__playwright__browser_tabs({action: "select", index: 1});
await mcp__playwright__browser_wait_for({text: "Tweet"});

// 3. COPY FUNCTIONALITY TESTING
await mcp__playwright__browser_click({element: "Copy Referral Code", ref: "[ref]"});
const clipboardContent = await mcp__playwright__browser_evaluate({
  function: `() => navigator.clipboard.readText()`
});

// 4. QR CODE GENERATION
await mcp__playwright__browser_wait_for({text: "QR Code"});
await mcp__playwright__browser_take_screenshot({
  element: "QR Code Canvas",
  filename: "qr-code-test.png"
});

// 5. RESPONSIVE VALIDATION
for (const width of [375, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
}
```

**REQUIRED TEST COVERAGE:**
- [ ] Referral code display and copy functionality
- [ ] Social sharing buttons open correct platforms
- [ ] QR code generates and displays properly
- [ ] Responsive design at all breakpoints
- [ ] Accessibility compliance validation
- [ ] Zero console errors during interactions


## 🌐 BROWSER MCP INTERACTIVE TESTING (NEW!)

**🚀 Real Browser Automation with Browser MCP:**

The Browser MCP provides interactive browser testing capabilities that complement Playwright MCP:

```javascript
// BROWSER MCP - Interactive Visual Testing
// Use for real-time UI validation and user flow testing

// 1. NAVIGATE AND CAPTURE STATE
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/dashboard"});
const snapshot = await mcp__browsermcp__browser_snapshot();

// 2. INTERACTIVE FORM TESTING
await mcp__browsermcp__browser_click({
  element: "Login button",
  ref: snapshot.querySelector('[data-testid="login-btn"]')
});

await mcp__browsermcp__browser_type({
  element: "Email input field", 
  ref: snapshot.querySelector('input[type="email"]'),
  text: "test@wedding.com",
  submit: false
});

// 3. VISUAL REGRESSION TESTING
await mcp__browsermcp__browser_screenshot(); // Captures current state

// 4. RESPONSIVE TESTING
for (const width of [375, 768, 1024, 1920]) {
  await mcp__browsermcp__browser_resize({width, height: 800});
  await mcp__browsermcp__browser_wait({time: 1});
  await mcp__browsermcp__browser_screenshot();
}

// 5. CONSOLE AND NETWORK MONITORING
const logs = await mcp__browsermcp__browser_get_console_logs();
const hasErrors = logs.some(log => log.level === 'error');

// 6. MULTI-TAB TESTING
await mcp__browsermcp__browser_tabs({action: "new"});
await mcp__browsermcp__browser_navigate({url: "http://localhost:3000/settings"});
await mcp__browsermcp__browser_tabs({action: "select", index: 0});
```

**Browser MCP vs Playwright MCP:**
- **Browser MCP**: Interactive, visual, real-time testing during development
- **Playwright MCP**: Automated, programmatic, CI/CD testing
- **Use Both**: Browser MCP for exploration, Playwright MCP for automation


---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All Round 1 deliverables complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating sharing flows
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Component renders in <200ms
- [ ] Works offline (cached data)
- [ ] Mobile responsive (375px+)
- [ ] WCAG AA compliant
- [ ] Integration interfaces documented

### Evidence Package Required:
- [ ] Screenshots of working referral widget
- [ ] Playwright test results for sharing flows
- [ ] QR code generation proof
- [ ] Mobile responsiveness screenshots
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Frontend: `/wedsync/src/components/viral/`
- Hooks: `/wedsync/src/hooks/useReferral.ts`
- Tests: `/wedsync/tests/viral/`
- Types: `/wedsync/src/types/viral.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch21/WS-170-team-a-round-1-complete.md`
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-170 | ROUND_1_COMPLETE | team-a | batch21" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip tests - write them FIRST
- Do NOT ignore security requirements
- Do NOT claim completion without evidence
- REMEMBER: All 5 teams work in PARALLEL - no overlapping work
- WAIT: Do not start Round 2 until ALL teams complete Round 1

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All deliverables complete
- [ ] Tests written and passing
- [ ] Security validated
- [ ] Dependencies provided
- [ ] Code committed
- [ ] Report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY