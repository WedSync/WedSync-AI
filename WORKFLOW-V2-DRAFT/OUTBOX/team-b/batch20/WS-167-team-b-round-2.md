# TEAM B - ROUND 2: WS-167 - Trial Management System - API Enhancement & Edge Cases

**Date:** 2025-08-27  
**Feature ID:** WS-167 (Track all work with this ID)
**Mission:** Enhance trial management APIs with advanced features, error handling, and edge cases
**Context:** Building on Round 1 foundation with comprehensive error handling and advanced business logic

---

## < USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier new to digital management
**I want to:** Robust trial management that handles all edge cases and provides detailed analytics
**So that:** I can trust the system to handle complex scenarios and understand my usage patterns

**Real Wedding Problem This Solves:**
A venue coordinator starts their trial but needs to pause for a family emergency. The enhanced APIs handle trial pausing, resuming, and proper extension calculations. The activity analytics show they've actively used key features despite the interruption, qualifying them for an automatic extension offer.

---

## < DELIVERABLES FOR ROUND 2 (ENHANCEMENT & EDGE CASES)

### API Enhancements Required:
- [ ] `/api/trial/pause` - Trial pause/resume functionality
- [ ] `/api/trial/analytics` - Detailed activity analytics endpoint
- [ ] `/api/trial/conversion` - Trial-to-paid conversion tracking
- [ ] `/api/trial/bulk-extend` - Admin bulk extension capabilities
- [ ] Enhanced error handling with detailed error codes
- [ ] Rate limiting and abuse prevention
- [ ] Webhook integration for trial events
- [ ] Batch operations for admin management
- [ ] Advanced activity tracking with feature usage metrics
- [ ] Trial history and audit logging

### Edge Cases to Handle:
- [ ] Multiple trial requests from same user
- [ ] Expired trials with pending work
- [ ] Team member access during trial period
- [ ] Trial extension during last 24 hours
- [ ] Timezone handling for global users
- [ ] Concurrent modification conflicts
- [ ] Payment failure during conversion
- [ ] Data retention after trial expiry

---

## = STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. Ref MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__Ref__ref_search_documentation({query: "Next.js 15 middleware error handling latest"});
await mcp__Ref__ref_search_documentation({query: "Supabase RLS policies triggers latest documentation"});
await mcp__Ref__ref_search_documentation({query: "date-fns timezone handling latest patterns"});

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW Round 1 implementation:
await mcp__serena__find_symbol("trial", "src/app/api", true);
await mcp__serena__get_symbols_overview("src/lib/trial");
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


---

## = STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "Enhance trial management APIs with edge cases"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "Advanced API features and error handling"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "Advanced trial data operations and triggers"
4. **security-compliance-officer** --think-ultra-hard --audit-round1 "Security hardening and compliance"
5. **test-automation-architect** --edge-case-testing --comprehensive-coverage

---

## = SECURITY REQUIREMENTS (ENHANCED FOR ROUND 2)

### ADVANCED SECURITY PATTERN:

```typescript
//  ENHANCED SECURITY WITH RATE LIMITING & AUDIT:
import { withSecureValidation } from '@/lib/validation/middleware';
import { rateLimiter } from '@/lib/security/rate-limit';
import { auditLog } from '@/lib/security/audit';

export const POST = withSecureValidation(
  trialExtensionSchema,
  rateLimiter({ requests: 5, window: '1h' }),
  async (request: NextRequest, validatedData) => {
    const userId = request.headers.get('x-user-id');
    
    try {
      // Check for abuse patterns
      const abuseCheck = await checkTrialAbusePatterns(userId);
      if (abuseCheck.suspicious) {
        await auditLog.warning('Suspicious trial activity', { userId, patterns: abuseCheck });
        return NextResponse.json({ error: 'Trial extension under review' }, { status: 429 });
      }
      
      // Business logic with comprehensive validation
      const result = await processTrialExtension(validatedData);
      
      // Audit successful operations
      await auditLog.info('Trial extended', { userId, extension: result });
      
      return NextResponse.json(result);
    } catch (error) {
      // Enhanced error handling
      await auditLog.error('Trial extension failed', { userId, error });
      return handleTrialError(error);
    }
  }
);
```

---

## = DEPENDENCIES

### What you NEED from Round 1:
- Core trial APIs must be functional
- Database schema must be created
- Basic validation must be working

### What other teams NEED from you:
- TO Team A: Enhanced API responses for UI updates
- TO Team E: Comprehensive test scenarios
- TO Team C: Webhook endpoints for email triggers

---

##  SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All edge cases handled gracefully
- [ ] Zero security vulnerabilities
- [ ] Performance targets met (<200ms response time)
- [ ] 95% test coverage including edge cases
- [ ] Comprehensive error handling with recovery
- [ ] Audit logging for all critical operations
- [ ] Rate limiting prevents abuse
- [ ] Webhook events fire reliably

---

## = WHERE TO SAVE YOUR WORK

### Code Files:
- Enhanced APIs: `/wedsync/src/app/api/trial/`
- Advanced Services: `/wedsync/src/lib/trial/advanced/`
- Security: `/wedsync/src/lib/security/trial/`
- Tests: `/wedsync/tests/api/trial/edge-cases/`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-167-team-b-batch20-round2-complete.md`

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

END OF ROUND PROMPT - EXECUTE IMMEDIATELY