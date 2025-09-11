# TEAM A — BATCH 29 — ROUND 1 — WS-197 — Middleware Setup — Core Middleware Components

**Date:** 2025-01-20  
**Feature ID:** WS-197 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Build core middleware infrastructure with authentication, request validation, and CSRF protection for WedSync platform  
**Context:** You are Team A working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync platform security engineer implementing robust API protection  
**I want to:** Implement comprehensive middleware for authentication, rate limiting, logging, and request validation across all API routes  
**So that:** I can ensure that suppliers accessing client data have proper authentication, couples submitting wedding forms are protected from abuse, and the platform maintains security compliance while handling sensitive wedding information including guest lists, vendor contracts, and financial details

**Real Wedding Problem This Solves:**
A photography supplier logs into their dashboard at 8 AM during peak wedding season to review 12 couples' requirements before their consultation calls. The middleware authenticates their session, applies rate limiting appropriate to their subscription tier, logs each client access for security auditing, and validates all form submissions. Meanwhile, couples are simultaneously updating their guest lists - the middleware ensures proper CSRF protection and prevents unauthorized access to sensitive wedding planning data.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Core middleware infrastructure with authentication, validation, and security layers
- CSRF protection for all state-changing operations
- Request validation middleware with Zod schema integration
- Authentication middleware with Supabase Auth integration
- Security headers middleware (CORS, HSTS, CSP)

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Authentication: Supabase Auth, JWT validation
- Validation: Zod schemas, middleware chains

**Integration Points:**
- Next.js Middleware: Core request interception and routing
- Supabase Auth: Authentication and session management
- Database: Rate limiting tracking and audit logs
- API Routes: Validation and protection for all endpoints

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

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL middleware and security features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "next middleware authentication latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase auth-ssr jwt-verification latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react hook form validation zod latest documentation"});
await mcp__Ref__ref_search_documentation({query: "zod validation schemas latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing middleware patterns:
await mcp__serena__find_symbol("middleware", "", true);
await mcp__serena__get_symbols_overview("middleware.ts");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --middleware-focus --security-first "Core middleware infrastructure setup"
2. **security-compliance-officer** --auth-middleware --csrf-protection "Authentication and CSRF middleware"
3. **nextjs-fullstack-developer** --middleware-patterns --app-router "Next.js 15 middleware implementation"
4. **supabase-specialist** --auth-integration --session-management "Supabase Auth middleware"
5. **test-automation-architect** --middleware-testing --security-validation "Middleware test coverage"
6. **code-quality-guardian** --security-patterns --middleware-standards "Code quality and security standards"

**AGENT INSTRUCTIONS:** "Use Ref MCP docs for Next.js 15 middleware patterns. Follow security best practices."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing middleware.ts and authentication patterns
- Review Supabase Auth implementation in current codebase
- Check security validation patterns in `/src/lib/validation/`
- Understand current CSRF and rate limiting approaches

### **PLAN PHASE (THINK HARD!)**
- Design middleware chain architecture (auth → validation → rate limiting)
- Plan authentication flow with Supabase Auth
- Design CSRF token validation system
- Plan request validation with Zod schemas

### **CODE PHASE (PARALLEL AGENTS!)**
- Core middleware.ts with route matching
- Authentication middleware with session validation
- CSRF protection middleware
- Request validation middleware with Zod integration
- Security headers middleware

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Core `/wedsync/middleware.ts` with route matching and middleware chain
- [ ] Authentication middleware in `/wedsync/lib/middleware/auth.ts`
- [ ] CSRF protection middleware in `/wedsync/lib/middleware/csrf.ts`
- [ ] Request validation middleware in `/wedsync/lib/middleware/validation.ts`
- [ ] Security headers middleware in `/wedsync/lib/middleware/security.ts`
- [ ] Unit tests with >80% coverage for all middleware components
- [ ] Playwright tests validating middleware functionality

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
- FROM Team B: Error handling middleware - Required for proper error responses
- FROM Team C: Rate limiting configuration - Dependency for request throttling
- FROM Team D: API route structure - Need endpoint patterns for middleware matching
- FROM Team E: Testing patterns - Required for comprehensive middleware testing

### What other teams NEED from you:
- TO Team B: Core middleware foundation - They need this for error handling integration
- TO Team C: Authentication middleware - Blocking their rate limiting implementation
- TO Team D: Request validation patterns - They need this for API security
- TO Team E: Security middleware - Required for their advanced security features

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY IMPLEMENTATION

**EVERY middleware component MUST implement:**

```typescript
// ✅ MANDATORY PATTERN - Secure middleware implementation:
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/middleware';

export async function authMiddleware(request: NextRequest) {
  // Create supabase client for middleware
  const { supabase, response } = createServerClient(request);
  
  // Verify authentication
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (!session && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Set user context for downstream middleware
  const requestWithUser = new NextRequest(request, {
    headers: new Headers(request.headers)
  });
  
  if (session) {
    requestWithUser.headers.set('x-user-id', session.user.id);
    requestWithUser.headers.set('x-user-role', session.user.role || 'user');
  }
  
  return response;
}
```

### SECURITY CHECKLIST FOR MIDDLEWARE
- [ ] **Session Validation**: Verify Supabase Auth sessions on protected routes
- [ ] **CSRF Protection**: Generate and validate CSRF tokens for state-changing requests
- [ ] **Request Validation**: Validate all incoming requests with Zod schemas
- [ ] **Security Headers**: Set CORS, HSTS, CSP, and other security headers
- [ ] **Route Protection**: Authenticate access to all protected endpoints
- [ ] **Error Sanitization**: Never expose sensitive data in error responses
- [ ] **Logging**: Log all security events for audit trails
- [ ] **Rate Limiting Integration**: Prepare headers for rate limiting middleware

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// MIDDLEWARE TESTING WITH PLAYWRIGHT MCP

// 1. AUTHENTICATION FLOW TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
const redirectResponse = await mcp__playwright__browser_network_requests();
// Should redirect to login for unauthenticated users

// 2. CSRF PROTECTION VALIDATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/clients"});
const csrfTest = await mcp__playwright__browser_evaluate({
  function: `() => fetch('/api/clients', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}) 
  }).then(r => r.status)`
});
// Should return 403 without CSRF token

// 3. MIDDLEWARE ERROR HANDLING
const consoleErrors = await mcp__playwright__browser_console_messages();
const middlewareErrors = consoleErrors.filter(msg => 
  msg.text.includes('middleware') && msg.type === 'error'
);

// 4. SECURITY HEADERS VALIDATION
const securityHeaders = await mcp__playwright__browser_evaluate({
  function: `() => Object.fromEntries([...document.querySelectorAll('meta')].map(m => [m.name, m.content]))`
});
```



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

### REQUIRED TEST COVERAGE:
- [ ] Authentication redirect for protected routes
- [ ] CSRF token validation for state-changing requests
- [ ] Request validation with various input types
- [ ] Security headers presence and values
- [ ] Error handling in middleware chain
- [ ] Performance impact measurement

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Core middleware.ts properly configured for Next.js 15
- [ ] Authentication middleware with Supabase Auth integration
- [ ] CSRF protection for all state-changing operations
- [ ] Request validation middleware with Zod schemas
- [ ] Security headers middleware with proper CSP, CORS, HSTS
- [ ] All tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating middleware functionality
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Middleware chain executes in correct order
- [ ] Authentication properly verified for protected routes
- [ ] CSRF tokens generated and validated correctly
- [ ] Security headers properly set on all responses
- [ ] Performance impact <10ms per request
- [ ] Works with all API routes and page routes

### Evidence Package Required:
- [ ] Screenshot proof of middleware execution
- [ ] Playwright test results showing security validation
- [ ] Network logs showing security headers
- [ ] Authentication flow testing results
- [ ] Test coverage report >80%

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Core: `/wedsync/middleware.ts`
- Auth: `/wedsync/lib/middleware/auth.ts`
- CSRF: `/wedsync/lib/middleware/csrf.ts`
- Validation: `/wedsync/lib/middleware/validation.ts`
- Security: `/wedsync/lib/middleware/security.ts`
- Tests: `/wedsync/tests/middleware/`
- Types: `/wedsync/src/types/middleware.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch29/WS-197-team-a-round-1-complete.md`
- **Include:** Feature ID (WS-197) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-197 | ROUND_1_COMPLETE | team-a | batch29" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify files assigned to other teams (causes conflicts)
- Do NOT skip security validation - this is critical infrastructure
- Do NOT ignore performance requirements - middleware affects all requests
- REMEMBER: All 5 teams work in PARALLEL - coordinate middleware integration

---

**🚨 OVERLAP GUARD: You are responsible for CORE MIDDLEWARE COMPONENTS only. Do not implement rate limiting logic (Team C), error handling middleware (Team B), or API route patterns (Team D).**

END OF ROUND PROMPT - EXECUTE IMMEDIATELY