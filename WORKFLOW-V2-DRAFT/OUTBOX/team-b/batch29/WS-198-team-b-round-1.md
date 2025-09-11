# TEAM B — BATCH 29 — ROUND 1 — WS-198 — Error Handling System — Core Error Framework

**Date:** 2025-01-20  
**Feature ID:** WS-198 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Build comprehensive error handling system with graceful failures, detailed logging, and user-friendly messaging for WedSync platform  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync platform reliability engineer ensuring robust error handling across all user interactions  
**I want to:** Implement comprehensive error handling with graceful failures, detailed logging, and user-friendly messaging  
**So that:** I can ensure that when a photographer supplier experiences an API timeout while uploading portfolio images, they receive clear guidance and automatic retry options; when couples encounter validation errors submitting wedding forms, they see specific field-level feedback; and when system errors occur during peak wedding season, detailed logs help developers quickly resolve issues without affecting other users

**Real Wedding Problem This Solves:**
During peak wedding booking season, a venue supplier attempts to upload 50 high-resolution photos to their portfolio at 2 PM when the system is under heavy load. The upload service times out after 30 seconds, but instead of a generic error page, the error handling system shows a clear message: "Upload temporarily unavailable - we're processing high traffic. Your photos are safe, we'll retry automatically in 60 seconds." The error is logged with full context (user ID, file sizes, server load metrics) to help developers optimize the upload service.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Comprehensive error handling framework with error classification and severity levels
- User-friendly error messages with technical details for developers
- Graceful failure patterns with automatic retry mechanisms
- Detailed error logging with full request context and stack traces
- Error boundary components for React with fallback UIs

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Error Tracking: Sentry integration, custom logging
- Monitoring: Winston, structured logging

**Integration Points:**
- API Routes: Error handling middleware integration
- React Components: Error boundary implementation
- Database: Error logging and tracking tables
- External Services: Graceful handling of third-party failures

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
// For ALL error handling and system features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "next error-handling api-routes latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react error-boundaries latest documentation"});
await mcp__Ref__ref_search_documentation({query: "sentry javascript nextjs integration latest documentation"});
await mcp__Ref__ref_search_documentation({query: "winston structured-logging latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing error handling patterns:
await mcp__serena__find_symbol("error", "", true);
await mcp__serena__get_symbols_overview("lib/errors");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --error-handling-focus --reliability-first "Error handling system implementation"
2. **security-compliance-officer** --error-security --log-sanitization "Secure error handling and logging"
3. **nextjs-fullstack-developer** --error-boundaries --api-errors "Next.js error handling patterns"
4. **react-ui-specialist** --error-boundaries --fallback-ui "React error boundary components"
5. **test-automation-architect** --error-testing --failure-scenarios "Error handling test coverage"
6. **code-quality-guardian** --error-patterns --logging-standards "Error handling code quality"

**AGENT INSTRUCTIONS:** "Use Ref MCP docs for Next.js error handling. Implement comprehensive error logging."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing error handling in API routes and components
- Review current Sentry configuration and error tracking
- Check logging patterns and error message formats
- Understand current retry mechanisms and graceful failures

### **PLAN PHASE (THINK HARD!)**
- Design error classification system with severity levels
- Plan error logging architecture with structured data
- Design user-friendly error message templates
- Plan error recovery and retry mechanisms

### **CODE PHASE (PARALLEL AGENTS!)**
- Core error handling framework with classification
- Error logging system with database persistence
- React error boundaries with fallback UIs
- API error handler middleware integration
- User-friendly error message system

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Core error handler in `/wedsync/lib/errors/api-error-handler.ts`
- [ ] Error codes and classification in `/wedsync/lib/errors/error-codes.ts`
- [ ] Error logger with database persistence in `/wedsync/lib/errors/error-logger.ts`
- [ ] React error boundary in `/wedsync/components/error-boundary/ErrorBoundary.tsx`
- [ ] Error hook for consistent handling in `/wedsync/hooks/useErrorHandler.ts`
- [ ] Database migration for error logs table
- [ ] Unit tests with >80% coverage for all error handling components
- [ ] Playwright tests validating error scenarios

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
- FROM Team A: Core middleware foundation - Required for error middleware integration
- FROM Team C: Rate limiting error responses - Need standardized rate limit error format
- FROM Team D: API route patterns - Required for error handling integration
- FROM Team E: Testing error scenarios - Dependency for comprehensive error testing

### What other teams NEED from you:
- TO Team A: Error handling middleware - They need this for middleware chain integration
- TO Team C: Error classification system - Blocking their rate limiting error responses
- TO Team D: API error patterns - They need this for consistent API error handling
- TO Team E: Error boundary components - Required for their UI security features

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY IMPLEMENTATION

**EVERY error handler MUST implement:**

```typescript
// ✅ MANDATORY PATTERN - Secure error handling:
import { NextRequest, NextResponse } from 'next/server';

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    public technical?: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function handleApiError(error: unknown, request: NextRequest) {
  // Sanitize error for user - NEVER expose sensitive data
  const sanitizedError = sanitizeError(error);
  
  // Log full error details for developers
  await logError(error, {
    requestId: request.headers.get('x-request-id'),
    userId: request.headers.get('x-user-id'),
    endpoint: request.nextUrl.pathname,
    method: request.method,
    timestamp: new Date().toISOString()
  });
  
  // Return user-friendly error
  return NextResponse.json({
    error: {
      code: sanitizedError.code,
      message: sanitizedError.message,
      requestId: request.headers.get('x-request-id')
    }
  }, { status: sanitizedError.statusCode });
}
```

### SECURITY CHECKLIST FOR ERROR HANDLING
- [ ] **Error Sanitization**: Never expose stack traces, database details, or system internals to users
- [ ] **Secure Logging**: Log full technical details server-side only, not to client
- [ ] **Request Context**: Include user ID, request ID, and endpoint in all error logs
- [ ] **Sensitive Data Protection**: Never log passwords, tokens, or personal data
- [ ] **Error Classification**: Classify errors by severity for proper escalation
- [ ] **Rate Limiting**: Prevent error flooding and abuse through error endpoints
- [ ] **Audit Trail**: Maintain comprehensive audit logs for security incidents
- [ ] **GDPR Compliance**: Ensure error logs can be purged for data deletion requests

---

## ⚠️ DATABASE MIGRATIONS:

```sql
-- CREATE migration files in /wedsync/supabase/migrations/
-- DO NOT run migrations yourself
-- SEND to SQL Expert: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-198.md

-- Error logging system
CREATE TABLE error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  
  -- Error classification
  error_code TEXT NOT NULL,
  error_type TEXT NOT NULL CHECK (error_type IN (
    'validation', 'authentication', 'authorization', 'not_found', 
    'rate_limit', 'payment', 'external_service', 'database', 
    'file_upload', 'network', 'timeout', 'internal'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Context and details
  message TEXT NOT NULL,
  technical_message TEXT,
  stack_trace TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// ERROR HANDLING TESTING WITH PLAYWRIGHT MCP

// 1. API ERROR RESPONSE VALIDATION
await mcp__playwright__browser_navigate({url: "http://localhost:3000/api/nonexistent"});
const errorResponse = await mcp__playwright__browser_network_requests();
// Should return proper 404 error format

// 2. REACT ERROR BOUNDARY TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Trigger error in React component
    window.triggerTestError = true;
    document.dispatchEvent(new CustomEvent('test-error'));
  }`
});
const errorBoundaryTest = await mcp__playwright__browser_snapshot();
// Should show error boundary fallback UI

// 3. ERROR LOGGING VERIFICATION
const consoleErrors = await mcp__playwright__browser_console_messages();
const errorLogs = consoleErrors.filter(msg => 
  msg.type === 'error' && msg.text.includes('Error ID:')
);

// 4. GRACEFUL DEGRADATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});
// Simulate network failure
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Mock fetch to simulate network failure
    window.fetch = () => Promise.reject(new Error('Network error'));
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
- [ ] API error responses with proper format and status codes
- [ ] React error boundary fallback UI display
- [ ] Error logging to database with full context
- [ ] User-friendly error messages vs technical details
- [ ] Graceful degradation under various failure scenarios
- [ ] Error recovery and retry mechanisms

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Core error handling framework with classification system
- [ ] Comprehensive error logger with database persistence
- [ ] React error boundaries with fallback UIs
- [ ] API error handler with sanitized user messages
- [ ] Error recovery mechanisms with automatic retries
- [ ] All tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating error scenarios
- [ ] Zero TypeScript errors in error handling code
- [ ] Error logs properly sanitized (no sensitive data)

### Integration & Performance:
- [ ] Error handling integrates with middleware chain
- [ ] Database error logging under 50ms per error
- [ ] User-friendly error messages displayed correctly
- [ ] Technical error details logged server-side only
- [ ] Error boundaries prevent app crashes
- [ ] Works with all API routes and React components

### Evidence Package Required:
- [ ] Screenshot proof of error boundary fallback UI
- [ ] API error response format validation
- [ ] Error logging database entries with context
- [ ] Performance impact measurement on error handling
- [ ] Test coverage report >80%

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Core: `/wedsync/lib/errors/api-error-handler.ts`
- Codes: `/wedsync/lib/errors/error-codes.ts`
- Logger: `/wedsync/lib/errors/error-logger.ts`
- Boundary: `/wedsync/components/error-boundary/ErrorBoundary.tsx`
- Hook: `/wedsync/hooks/useErrorHandler.ts`
- Tests: `/wedsync/tests/errors/`
- Migration: `/wedsync/supabase/migrations/[timestamp]_error_handling_system.sql`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch29/WS-198-team-b-round-1-complete.md`
- **Include:** Feature ID (WS-198) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-198 | ROUND_1_COMPLETE | team-b | batch29" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT expose sensitive data in error messages to users
- Do NOT skip error sanitization - this is critical for security
- Do NOT ignore performance impact - error handling affects all requests
- REMEMBER: All 5 teams work in PARALLEL - coordinate error handling integration

---

**🚨 OVERLAP GUARD: You are responsible for CORE ERROR HANDLING FRAMEWORK only. Do not implement middleware integration (Team A), rate limiting errors (Team C), or API route error patterns (Team D).**

END OF ROUND PROMPT - EXECUTE IMMEDIATELY