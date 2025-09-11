# TEAM D — BATCH 29 — ROUND 1 — WS-197 — Middleware Setup — API Route Integration

**Date:** 2025-01-20  
**Feature ID:** WS-197 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Integrate middleware system with existing API routes and implement route-specific security validation for WedSync platform  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync API developer ensuring consistent security across all endpoints  
**I want to:** Integrate comprehensive middleware with existing API routes and implement route-specific validation patterns  
**So that:** I can ensure that every API endpoint serving wedding data (client forms, vendor profiles, guest lists) has proper authentication, validation, and rate limiting; couples submitting sensitive information are protected by consistent security measures; and suppliers accessing client data through APIs have their permissions properly validated before any database operations

**Real Wedding Problem This Solves:**
A venue supplier uses the client management API to bulk-update 15 couples' timeline requirements before a busy weekend. Each API call goes through the middleware chain: authentication verifies their supplier account, validation ensures timeline data matches expected schemas, rate limiting prevents overwhelming the system, and CSRF protection validates the request origin. Meanwhile, couples using the guest management API to update RSVPs benefit from the same security layer, ensuring their guest data is protected and only accessible with proper authentication tokens.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Integration of middleware system with all existing API routes in /wedsync/src/app/api/
- Route-specific validation schemas for different endpoint types
- Authentication enforcement patterns for protected routes
- API route security headers and response formatting
- Middleware chain optimization for performance

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- API: Next.js App Router API routes
- Validation: Zod schemas with middleware integration

**Integration Points:**
- Middleware: Core middleware chain from Team A
- Error Handling: Error responses from Team B
- Rate Limiting: Rate limiting integration from Team C
- Validation: Schema validation and security enforcement

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
// For ALL API and system features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "next app-router api-routes latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next middleware route-matching latest documentation"});
await mcp__Ref__ref_search_documentation({query: "zod api-validation latest documentation"});
await mcp__Ref__ref_search_documentation({query: "supabase api-integration auth latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing API routes:
await mcp__serena__find_symbol("route", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --api-integration-focus --security-first "API route middleware integration"
2. **security-compliance-officer** --api-security --route-protection "API endpoint security validation"
3. **nextjs-fullstack-developer** --app-router-api --middleware-patterns "Next.js API route patterns"
4. **supabase-specialist** --api-integration --auth-validation "Supabase API authentication"
5. **test-automation-architect** --api-testing --endpoint-validation "API route test coverage"
6. **code-quality-guardian** --api-patterns --validation-standards "API code quality and validation"

**AGENT INSTRUCTIONS:** "Use Ref MCP docs for Next.js 15 App Router API patterns. Integrate with middleware from Team A."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read all existing API routes in /src/app/api/ to understand current patterns
- Review authentication patterns and validation schemas
- Check route protection and error handling implementations
- Understand current middleware integration points

### **PLAN PHASE (THINK HARD!)**
- Design API route middleware integration pattern
- Plan route-specific validation schemas
- Design authentication enforcement for different route types
- Plan API response formatting and security headers

### **CODE PHASE (PARALLEL AGENTS!)**
- API route middleware integration wrapper
- Route-specific validation schemas
- Authentication enforcement patterns
- API security headers and response formatting
- Route pattern matching for middleware application

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] API route wrapper in `/wedsync/lib/api/route-wrapper.ts`
- [ ] Route validation schemas in `/wedsync/lib/api/route-schemas.ts`
- [ ] Authentication patterns in `/wedsync/lib/api/auth-patterns.ts`
- [ ] API security utils in `/wedsync/lib/api/security-utils.ts`
- [ ] Route integration guide in `/wedsync/lib/api/integration-guide.md`
- [ ] Update 5 key API routes with new middleware integration
- [ ] Unit tests with >80% coverage for API integration
- [ ] Playwright tests validating API middleware functionality

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
- FROM Team A: Core middleware foundation - Required for API integration
- FROM Team B: Error handling system - Need standardized API error responses
- FROM Team C: Rate limiting integration - Dependency for API rate limiting
- FROM Team E: Testing patterns - Required for comprehensive API testing

### What other teams NEED from you:
- TO Team A: API route patterns - They need this for middleware route matching
- TO Team B: API error requirements - Blocking their error handling system
- TO Team C: Endpoint patterns - They need this for rate limiting configuration
- TO Team E: API authentication patterns - Required for their security features

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY IMPLEMENTATION

**EVERY API route MUST use the wrapper pattern:**

```typescript
// ✅ MANDATORY PATTERN - Secure API route wrapper:
import { NextRequest, NextResponse } from 'next/server';
import { withApiSecurity } from '@/lib/api/route-wrapper';
import { clientSchema } from '@/lib/api/route-schemas';

export const POST = withApiSecurity(
  {
    // Route configuration
    requireAuth: true,
    requiredRole: 'supplier',
    validationSchema: clientSchema,
    rateLimitKey: 'client-management',
    
    // Security options
    requireCSRF: true,
    requireHTTPS: true,
    allowedOrigins: ['https://wedsync.co']
  },
  async (request: NextRequest, validatedData: any, context: SecurityContext) => {
    // Route handler with validated data and security context
    const { user, subscription, permissions } = context;
    
    // Implement route logic with full security validation
    const result = await processClientData(validatedData, user.id);
    
    return NextResponse.json(result, {
      status: 200,
      headers: getSecurityHeaders()
    });
  }
);
```

### SECURITY CHECKLIST FOR API INTEGRATION
- [ ] **Route Wrapper**: All API routes use security wrapper with proper configuration
- [ ] **Authentication Check**: Protected routes verify user authentication and roles
- [ ] **Input Validation**: All request data validated with Zod schemas before processing
- [ ] **Rate Limiting**: API routes integrated with rate limiting system
- [ ] **CSRF Protection**: State-changing routes protected with CSRF validation
- [ ] **Security Headers**: All responses include proper security headers
- [ ] **Error Sanitization**: API errors sanitized before returning to client
- [ ] **Audit Logging**: All API access logged with user context and actions

---

## ⚠️ DATABASE MIGRATIONS:

```sql
-- CREATE migration files in /wedsync/supabase/migrations/
-- DO NOT run migrations yourself
-- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-197-api.md

-- API access logging for security audit
CREATE TABLE api_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Request details
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER NOT NULL,
  
  -- User context
  user_id UUID REFERENCES users(id),
  supplier_id UUID REFERENCES suppliers(id),
  ip_address INET,
  user_agent TEXT,
  
  -- Security context
  auth_method TEXT, -- 'session', 'api_key', 'oauth'
  rate_limit_applied BOOLEAN DEFAULT false,
  csrf_validated BOOLEAN DEFAULT false,
  
  -- Performance and debugging
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// API ROUTE INTEGRATION TESTING WITH PLAYWRIGHT MCP

// 1. AUTHENTICATION INTEGRATION TESTING
const apiAuthTest = async () => {
  const endpoints = [
    '/api/clients',
    '/api/suppliers/profile',
    '/api/bookings',
    '/api/guests'
  ];
  
  const results = [];
  for (const endpoint of endpoints) {
    // Test without authentication
    const unauthResponse = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'GET'
    });
    
    // Test with valid authentication
    const authResponse = await fetch(`http://localhost:3000${endpoint}`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer valid_token',
        'Cookie': 'auth=valid_session'
      }
    });
    
    results.push({
      endpoint,
      unauthStatus: unauthResponse.status,
      authStatus: authResponse.status
    });
  }
  return results;
};

// 2. VALIDATION INTEGRATION TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Test various validation scenarios
    return Promise.all([
      fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: 'data' })
      }),
      fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Valid Client',
          email: 'client@example.com',
          weddingDate: '2025-06-15'
        })
      })
    ]);
  }`
});

// 3. SECURITY HEADERS VALIDATION
const securityHeadersTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    return fetch('/api/test-endpoint')
      .then(response => ({
        headers: Object.fromEntries(response.headers.entries()),
        status: response.status
      }));
  }`
});

// 4. RATE LIMITING INTEGRATION
const rateLimitTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(fetch('/api/suppliers').then(r => ({
        status: r.status,
        remaining: r.headers.get('x-ratelimit-remaining')
      })));
    }
    return Promise.all(promises);
  }`
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
- [ ] Authentication integration across all API routes
- [ ] Input validation with various data scenarios
- [ ] Security headers presence and correctness
- [ ] Rate limiting integration with API endpoints
- [ ] Error handling integration with proper responses
- [ ] CSRF protection for state-changing operations

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] API route wrapper with comprehensive security integration
- [ ] Route-specific validation schemas for all endpoint types
- [ ] Authentication enforcement patterns working correctly
- [ ] Security headers properly set on all API responses
- [ ] At least 5 existing API routes updated with new integration
- [ ] All tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating API middleware functionality
- [ ] Zero TypeScript errors in API integration code
- [ ] API access logging working for security audit

### Integration & Performance:
- [ ] Middleware integration adds <10ms to API response time
- [ ] Authentication properly enforced on protected routes
- [ ] Input validation working with error responses
- [ ] Rate limiting properly applied to API endpoints
- [ ] Security headers included in all API responses
- [ ] Works with existing authentication and session management

### Evidence Package Required:
- [ ] API testing results showing security integration
- [ ] Authentication flow validation across endpoints
- [ ] Input validation testing with various scenarios
- [ ] Performance impact measurement on API routes
- [ ] Test coverage report >80%

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Wrapper: `/wedsync/lib/api/route-wrapper.ts`
- Schemas: `/wedsync/lib/api/route-schemas.ts`
- Auth: `/wedsync/lib/api/auth-patterns.ts`
- Security: `/wedsync/lib/api/security-utils.ts`
- Guide: `/wedsync/lib/api/integration-guide.md`
- Tests: `/wedsync/tests/api/`
- Migration: `/wedsync/supabase/migrations/[timestamp]_api_integration.sql`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch29/WS-197-team-d-round-1-complete.md`
- **Include:** Feature ID (WS-197) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-197 | ROUND_1_COMPLETE | team-d | batch29" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify core middleware files (Team A responsibility)
- Do NOT implement error handling logic (Team B responsibility)
- Do NOT implement rate limiting logic (Team C responsibility)
- REMEMBER: All 5 teams work in PARALLEL - coordinate API integration carefully

---

**🚨 OVERLAP GUARD: You are responsible for API ROUTE INTEGRATION only. Do not implement core middleware components (Team A), error handling systems (Team B), or rate limiting engines (Team C).**

END OF ROUND PROMPT - EXECUTE IMMEDIATELY