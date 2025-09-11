# TEAM E — BATCH 29 — ROUND 1 — WS-198 — Error Handling System — Frontend Error Components

**Date:** 2025-01-20  
**Feature ID:** WS-198 (Track all work with this ID)  
**Priority:** P0 from roadmap  
**Mission:** Build user-facing error components, error recovery mechanisms, and frontend error handling integration for WedSync platform  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync user experience engineer ensuring graceful error handling in the frontend  
**I want to:** Create comprehensive frontend error components with recovery options, loading states, and user-friendly messaging  
**So that:** I can ensure that when couples encounter errors while updating their guest list, they see clear instructions for recovery instead of technical jargon; when suppliers experience network issues during client form submissions, they get automatic retry options with progress indicators; and when system errors occur during peak wedding season, users maintain confidence in the platform through professional error messaging and smooth recovery flows

**Real Wedding Problem This Solves:**
A bride is updating her 150-person guest list at 10 PM, three weeks before her wedding, when her internet connection becomes unstable. Instead of losing her work to a generic error page, the error handling system saves her progress locally, shows a clear message "Your changes are saved locally - we'll sync when connection returns," and provides a retry button. Meanwhile, her photographer supplier experiences a timeout while uploading portfolio images, but sees a user-friendly message with automatic retry countdown and the option to continue with their other work.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Frontend error boundary components with graceful fallback UIs
- Error recovery mechanisms with automatic retry and manual recovery options
- User-friendly error messaging system with context-aware guidance
- Loading states and progress indicators for error recovery processes
- Integration with backend error handling system from Team B

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Error Handling: React Error Boundaries, Custom hooks
- State Management: Error recovery state and local storage

**Integration Points:**
- Backend Errors: Error handling system from Team B
- API Routes: Error responses from middleware integration
- Authentication: Error states for auth failures
- Form Validation: Error messaging for user input

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
// For ALL frontend and user interface features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 App Router Server Components forms latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase realtime database auth latest documentation"});
await mcp__Ref__ref_search_documentation({query: "Tailwind CSS v4 components styling patterns"});
await mcp__Ref__ref_search_documentation({query: "React 19 hooks patterns best practices"});
// Library ID resolution no longer needed with Ref MCP
await mcp__Ref__ref_search_documentation({query: "react error-boundaries hooks latest documentation"});
await mcp__Ref__ref_search_documentation({query: "next error-handling client latest documentation"});
await mcp__Ref__ref_search_documentation({query: "tailwindcss error-states animations latest documentation"});
await mcp__Ref__ref_search_documentation({query: "react hook form error-handling latest documentation"});

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing error components:
await mcp__serena__find_symbol("error", "src/components", true);
await mcp__serena__get_symbols_overview("src/components/error");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --frontend-error-focus --ux-first "Frontend error handling components"
2. **react-ui-specialist** --error-boundaries --recovery-ui "React error boundary and recovery components"
3. **nextjs-fullstack-developer** --client-error-handling --form-errors "Next.js client-side error patterns"
4. **ui-ux-designer** --error-messaging --user-guidance "Error messaging and user experience design"
5. **test-automation-architect** --error-scenarios --recovery-testing "Frontend error testing coverage"
6. **code-quality-guardian** --error-patterns --component-standards "Error component code quality"

**AGENT INSTRUCTIONS:** "Use Ref MCP docs for React 19 error boundaries. Focus on user experience and recovery flows."

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (NO CODING!)**
- Read existing error components and error handling patterns
- Review current user error messaging and recovery mechanisms
- Check form validation error displays and user guidance
- Understand current loading states and error recovery flows

### **PLAN PHASE (THINK HARD!)**
- Design error boundary hierarchy with fallback components
- Plan error recovery mechanisms with retry logic
- Design user-friendly error message templates
- Plan loading states and progress indicators

### **CODE PHASE (PARALLEL AGENTS!)**
- React error boundary components with fallback UIs
- Error recovery hooks with automatic retry
- User-friendly error message components
- Loading states and progress indicators
- Form error validation components

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Global error boundary in `/wedsync/components/error-boundary/GlobalErrorBoundary.tsx`
- [ ] Page error boundary in `/wedsync/components/error-boundary/PageErrorBoundary.tsx`
- [ ] Error recovery hook in `/wedsync/hooks/useErrorRecovery.ts`
- [ ] Error message components in `/wedsync/components/errors/ErrorMessage.tsx`
- [ ] Loading states in `/wedsync/components/loading/ErrorLoadingStates.tsx`
- [ ] Form error components in `/wedsync/components/forms/FormErrorDisplay.tsx`
- [ ] Unit tests with >80% coverage for all error components
- [ ] Playwright tests validating error recovery flows

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
- FROM Team A: Middleware error context - Required for error boundary integration
- FROM Team B: Backend error format - Need standardized error response format
- FROM Team C: Rate limiting error messages - Dependency for rate limit error display
- FROM Team D: API error responses - Required for consistent frontend error handling

### What other teams NEED from you:
- TO Team A: Error component requirements - They need this for middleware integration
- TO Team B: Frontend error format needs - Blocking their error response design
- TO Team C: Rate limit error display - They need this for user-friendly rate limit messages
- TO Team D: API error component integration - Required for their API route error handling

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY IMPLEMENTATION

**EVERY error component MUST implement:**

```typescript
// ✅ MANDATORY PATTERN - Secure frontend error handling:
import React, { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class SecureErrorBoundary extends React.Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Log error securely without exposing sensitive data
    const errorId = logErrorSecurely(error);
    
    return {
      hasError: true,
      errorId, // Only expose error ID to user
      // Never expose error.message or stack trace to user
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Send to error tracking service (sanitized)
    reportError({
      errorId: this.state.errorId,
      component: 'ErrorBoundary',
      // Never include user data, tokens, or sensitive information
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <UserFriendlyErrorDisplay 
          errorId={this.state.errorId}
          onRetry={() => this.setState({ hasError: false })}
        />
      );
    }

    return this.props.children;
  }
}
```

### SECURITY CHECKLIST FOR FRONTEND ERROR HANDLING
- [ ] **Error Sanitization**: Never display technical error details, stack traces, or system information to users
- [ ] **User Data Protection**: Ensure error logs don't capture user passwords, tokens, or sensitive form data
- [ ] **Error ID System**: Use error IDs for user reference instead of exposing error messages
- [ ] **Secure Logging**: Log detailed errors server-side only, not in browser console
- [ ] **Recovery Safety**: Ensure error recovery doesn't bypass authentication or validation
- [ ] **Form Security**: Validate all form data even during error recovery flows
- [ ] **Session Protection**: Maintain user session security during error states
- [ ] **XSS Prevention**: Sanitize any user-generated content in error messages

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// FRONTEND ERROR HANDLING TESTING WITH PLAYWRIGHT MCP

// 1. ERROR BOUNDARY TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard"});

// Trigger error boundary
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate component error
    window.triggerComponentError = true;
    const event = new CustomEvent('test-error', { 
      detail: { type: 'component-crash' } 
    });
    document.dispatchEvent(event);
  }`
});

const errorBoundaryResult = await mcp__playwright__browser_snapshot();
// Should show fallback UI, not crash the app

// 2. ERROR RECOVERY TESTING
await mcp__playwright__browser_click({
  element: "Retry button in error boundary",
  ref: "[data-testid='error-retry-button']"
});

const recoveryResult = await mcp__playwright__browser_wait_for({
  text: "Dashboard loaded successfully"
});

// 3. FORM ERROR DISPLAY TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/clients/new"});

await mcp__playwright__browser_fill_form({
  fields: [
    {
      name: "Client email field",
      type: "textbox",
      ref: "[data-testid='client-email']",
      value: "invalid-email"
    }
  ]
});

await mcp__playwright__browser_click({
  element: "Submit button",
  ref: "[data-testid='submit-client']"
});

const formErrorResult = await mcp__playwright__browser_snapshot();
// Should show user-friendly validation error

// 4. NETWORK ERROR RECOVERY TESTING
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Mock network failure
    window.fetch = () => Promise.reject(new Error('Network error'));
    
    // Trigger API call
    return fetch('/api/clients').catch(() => 'Network error handled');
  }`
});

const networkErrorTest = await mcp__playwright__browser_wait_for({
  text: "Connection issue detected"
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
- [ ] Error boundary fallback UI display and recovery
- [ ] Form validation error messages with user guidance
- [ ] Network error handling with retry mechanisms
- [ ] Loading states during error recovery
- [ ] User-friendly error messaging without technical details
- [ ] Error recovery flows maintaining user data

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Global and page-level error boundaries working correctly
- [ ] Error recovery hooks with automatic retry mechanisms
- [ ] User-friendly error message components with clear guidance
- [ ] Loading states and progress indicators during recovery
- [ ] Form error components with field-level validation display
- [ ] All tests written FIRST and passing (>80% coverage)
- [ ] Playwright tests validating error recovery flows
- [ ] Zero TypeScript errors in error handling components
- [ ] No sensitive data exposed in error messages or logs

### Integration & Performance:
- [ ] Error boundaries prevent app crashes and show fallback UI
- [ ] Error recovery maintains user data and session state
- [ ] Form errors display immediately with helpful guidance
- [ ] Loading states provide clear progress feedback
- [ ] Error messages are contextual and actionable
- [ ] Works across all pages and components

### Evidence Package Required:
- [ ] Screenshot proof of error boundary fallback UI
- [ ] Error recovery flow demonstration
- [ ] Form validation error display examples
- [ ] Network error handling with retry mechanism
- [ ] Test coverage report >80%

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Global: `/wedsync/components/error-boundary/GlobalErrorBoundary.tsx`
- Page: `/wedsync/components/error-boundary/PageErrorBoundary.tsx`
- Hook: `/wedsync/hooks/useErrorRecovery.ts`
- Messages: `/wedsync/components/errors/ErrorMessage.tsx`
- Loading: `/wedsync/components/loading/ErrorLoadingStates.tsx`
- Forms: `/wedsync/components/forms/FormErrorDisplay.tsx`
- Tests: `/wedsync/tests/errors/frontend/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch29/WS-198-team-e-round-1-complete.md`
- **Include:** Feature ID (WS-198) AND team identifier in all filenames
- **Update status:** Add entry to `/WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log`:
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-198 | ROUND_1_COMPLETE | team-e | batch29" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT expose sensitive error details to users
- Do NOT implement backend error handling (Team B responsibility)
- Do NOT create middleware error components (Team A responsibility)
- REMEMBER: All 5 teams work in PARALLEL - coordinate error handling integration

---

**🚨 OVERLAP GUARD: You are responsible for FRONTEND ERROR COMPONENTS only. Do not implement backend error handling (Team B), middleware error integration (Team A), or API error response logic (Team D).**

END OF ROUND PROMPT - EXECUTE IMMEDIATELY