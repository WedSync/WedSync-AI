# TEAM C — BATCH 21 — ROUND 3 — WS-172: Offline Functionality - Conflict Resolution

**Date:** 2025-08-26  
**Feature ID:** WS-172 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build conflict resolution system for offline data synchronization  
**Context:** You are Team C working in parallel with 4 other teams. Final integration round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding coordinator working at remote venues
**I want to:** Access client timelines, vendor contacts, and forms when internet is unavailable
**So that:** I can continue coordinating the wedding even in areas with poor connectivity

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-172:**
- Build conflict detection algorithms for simultaneous edits
- Implement merge strategies for timeline data
- Create user-friendly conflict resolution UI
- Build automatic resolution for non-conflicting changes
- Implement audit trail for conflict resolutions

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 3 (Conflict Resolution):
- [ ] Conflict detection engine for overlapping changes
- [ ] Smart merge algorithms for timeline and form data
- [ ] Conflict resolution UI components
- [ ] Automatic resolution for compatible changes
- [ ] Audit logging for all resolution decisions
- [ ] Unit tests with >80% coverage
- [ ] Conflict scenario integration tests

**Objective:** Complete offline conflict resolution with intelligent merging
**Scope In:** Conflict detection, merge strategies, resolution UI
**Scope Out:** Sync engine implementation, storage management
**Affected Paths:** /src/lib/offline/conflict-resolver.ts, /src/components/offline/ConflictResolution.tsx
**Dependencies:** Team A offline hooks, Team B sync engine, Team D background sync
**Acceptance Criteria:**
- Conflicts detected accurately for all data types
- Merge strategies preserve data integrity
- Users can resolve conflicts intuitively
- Automatic resolution works for simple cases
- All resolution decisions are logged


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

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ SECURE CONFLICT RESOLUTION:
export async function resolveConflict(
  conflictId: string,
  resolution: ConflictResolution,
  userId: string
): Promise<ResolutionResult> {
  // Verify user owns the conflicted data
  const conflict = await validateUserOwnsConflict(conflictId, userId);
  if (!conflict) {
    throw new Error('Unauthorized conflict resolution');
  }
  
  // Apply resolution with validation
  const result = await applyResolutionSafely(conflict, resolution);
  
  // Log resolution for audit trail
  await auditLog({
    action: 'conflict_resolved',
    userId,
    conflictId,
    resolution: resolution.strategy,
    timestamp: new Date()
  });
  
  return result;
}
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Conflict detection works for all data types
- [ ] Merge strategies preserve data integrity
- [ ] Resolution UI provides clear options
- [ ] Automatic resolution handles simple cases
- [ ] Tests written FIRST and passing (>80% coverage)

**Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch21/WS-172-team-c-round-3-complete.md`

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