# TEAM B — BATCH 21 — ROUND 1 — WS-170: Viral Optimization System - Referral API Backend

**Date:** 2025-08-26  
**Feature ID:** WS-170 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build backend APIs for referral tracking and viral coefficient calculation  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before Round 2.

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
- Build /api/referrals/create endpoint for generating referral codes
- Implement /api/referrals/stats endpoint for analytics
- Create referral tracking and attribution system
- Build viral coefficient calculation logic
- Implement reward system backend logic

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest

**Integration Points:**
- Team A Frontend: API contracts for referral UI components
- Team C Analytics: Viral metrics calculation integration
- Team D Rewards: Reward processing system coordination
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

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (for API responses):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
await mcp__Ref__ref_search_documentation({query: "next api-routes app-router latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase database functions latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase rls policies latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 4. REVIEW existing API patterns:
await mcp__serena__find_symbol("POST", "", true);
await mcp__serena__get_symbols_overview("/src/app/api/");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "viral referral API development"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "Next.js API routes"
3. **postgresql-database-expert** --think-ultra-hard --follow-existing-patterns "referral data modeling"
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **api-architect** --restful-design --comprehensive-validation
7. **code-quality-guardian** --check-patterns --match-codebase-style

**⚠️ DATABASE MIGRATIONS:**
- CREATE migration files in /wedsync/supabase/migrations/
- DO NOT run migrations yourself
- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-170.md

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Referral APIs):
- [ ] POST /api/referrals/create - Generate unique referral codes
- [ ] GET /api/referrals/stats - User referral statistics
- [ ] Database migration for referrals table structure
- [ ] Referral code generation and validation logic
- [ ] Basic referral attribution tracking
- [ ] Unit tests with >80% coverage
- [ ] API integration tests

**Objective:** Create robust referral tracking backend with secure APIs
**Scope In:** API endpoints, referral logic, database operations
**Scope Out:** Frontend integration, analytics dashboard, reward processing
**Affected Paths:** /src/app/api/referrals/, /wedsync/supabase/migrations/
**Dependencies:** Team A UI component contracts, Team C analytics interfaces
**Acceptance Criteria:**
- Referral codes generate uniquely and securely
- APIs handle authentication and validation properly
- Referral attribution tracks correctly
- Database operations are performant
- All security requirements met

**NFRs:** <200ms API response time, 99.9% uptime, secure by default
**Test Plan:** Unit tests for all endpoints, integration tests for flows
**Risk/Mitigation:** Duplicate referral codes - implement collision handling
**Handoff Notes:** Export API interfaces for frontend integration
**Overlap Guard:** Team B only handles backend APIs, not frontend components

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
- FROM Team A: UI component requirements - Required for API response format
- FROM Team C: Analytics integration points - Needed for metrics calculation

### What other teams NEED from you:
- TO Team A: API contracts and interfaces - They need this for frontend integration
- TO Team D: Referral data structure - Required for reward system integration

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

```typescript
// ✅ ALWAYS USE SECURITY FRAMEWORK:
import { withSecureValidation } from '@/lib/validation/middleware';
import { referralSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  referralSchema.extend({
    referredEmail: z.string().email('Valid email required'),
    rewardType: z.enum(['discount', 'credit', 'feature']).optional()
  }),
  async (request: NextRequest, validatedData) => {
    // Get authenticated user
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Generate secure referral code
    const referralCode = await generateSecureReferralCode();
    
    // Store in database with proper RLS
    const { data, error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: userId,
        referred_email: validatedData.referredEmail,
        referral_code: referralCode,
        status: 'pending',
        reward_type: validatedData.rewardType || 'discount'
      })
      .select()
      .single();
    
    if (error) {
      console.error('Referral creation failed:', error);
      return NextResponse.json({ error: 'Creation failed' }, { status: 500 });
    }
    
    return NextResponse.json({
      referralCode: data.referral_code,
      shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/signup?ref=${data.referral_code}`,
      rewardDetails: {
        type: data.reward_type,
        value: calculateRewardValue(data.reward_type),
        description: getRewardDescription(data.reward_type)
      }
    });
  }
);
```

### SECURITY CHECKLIST FOR REFERRAL APIS
- [ ] **Authentication**: All endpoints check user authentication
- [ ] **Input Validation**: Zod schemas validate all inputs
- [ ] **Rate Limiting**: Prevent referral code generation abuse
- [ ] **XSS Prevention**: Sanitize email addresses and codes
- [ ] **SQL Injection**: Use parameterized queries only
- [ ] **Code Security**: Referral codes are cryptographically secure
- [ ] **Data Privacy**: Don't expose sensitive referrer information

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// API TESTING WITH REAL HTTP REQUESTS

// 1. REFERRAL CREATION API TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/test-api"});

const apiTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test referral creation
    const response = await fetch('/api/referrals/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referredEmail: 'test@example.com',
        rewardType: 'discount'
      })
    });
    
    const data = await response.json();
    return {
      status: response.status,
      hasReferralCode: !!data.referralCode,
      hasShareUrl: !!data.shareUrl,
      rewardDetailsPresent: !!data.rewardDetails
    };
  }`
});

// 2. REFERRAL STATS API TESTING
const statsTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const response = await fetch('/api/referrals/stats');
    const data = await response.json();
    return {
      status: response.status,
      hasStats: typeof data.totalReferrals === 'number',
      viralCoefficientPresent: typeof data.viralCoefficient === 'number'
    };
  }`
});

// 3. ERROR HANDLING TESTING
const errorTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test with invalid email
    const response = await fetch('/api/referrals/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        referredEmail: 'invalid-email',
        rewardType: 'discount'
      })
    });
    
    return {
      status: response.status,
      isErrorResponse: response.status >= 400
    };
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Referral creation with valid data returns 200
- [ ] Invalid email addresses return 400 with error
- [ ] Unauthenticated requests return 401
- [ ] Referral codes are unique and secure
- [ ] Stats endpoint returns proper analytics
- [ ] Rate limiting prevents abuse


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
- [ ] All Round 1 API endpoints complete and functional
- [ ] Database migrations created (NOT applied)
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Zero TypeScript errors
- [ ] Zero console errors
- [ ] All security requirements implemented

### Integration & Performance:
- [ ] APIs respond in <200ms average
- [ ] Database operations are optimized
- [ ] Authentication integration works
- [ ] Rate limiting implemented
- [ ] Error handling comprehensive

### Evidence Package Required:
- [ ] API test results with Playwright
- [ ] Database migration files created
- [ ] Security validation screenshots
- [ ] Performance testing results
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- APIs: `/wedsync/src/app/api/referrals/`
- Migrations: `/wedsync/supabase/migrations/[timestamp]_viral_referral_system.sql`
- Tests: `/wedsync/tests/api/referrals/`
- Types: `/wedsync/src/types/referrals.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch21/WS-170-team-b-round-1-complete.md`
- **Migration Request:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-170.md`
- **Update status:** Add entry to feature-tracker.log

---

## ⚠️ CRITICAL WARNINGS
- Do NOT apply database migrations yourself
- Always use the security validation framework
- Test referral code uniqueness thoroughly
- Coordinate API contracts with Team A
- Implement comprehensive rate limiting

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY