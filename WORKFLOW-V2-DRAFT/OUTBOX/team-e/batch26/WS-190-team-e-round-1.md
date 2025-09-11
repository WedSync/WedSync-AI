# TEAM E - ROUND 1: WS-190 - Incident Response Procedures - Forensic Evidence & Automated Response

**Date:** 2025-08-26  
**Feature ID:** WS-190 (Track all work with this ID)  
**Priority:** P0 - Critical security infrastructure  
**Mission:** Build forensic evidence preservation system and automated incident response  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync security system detecting suspicious activity on wedding data
**I want to:** Automatically preserve forensic evidence, contain threats, and trigger response procedures
**So that:** Couples' personal wedding data remains protected and regulatory compliance is maintained during security incidents

**Real Wedding Problem This Solves:**
When unusual data access patterns are detected (like someone downloading 500+ client profiles at 2 AM), the system must immediately preserve evidence, isolate the threat, and prepare compliance documentation for GDPR breach notifications, all while maintaining service for legitimate wedding professionals.

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] IncidentResponseOrchestrator service with automated containment
- [ ] Forensic evidence preservation system with chain of custody
- [ ] Automated threat detection and classification
- [ ] Emergency containment procedures (account isolation, token revocation)
- [ ] GDPR compliance timeline tracking
- [ ] Security incident database schema implementation
- [ ] Unit tests with >80% coverage



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

### Core Security Services:
```typescript
// /wedsync/src/lib/security/incident-response-system.ts
export class IncidentResponseOrchestrator {
  async triggerIncidentResponse(alert: SecurityAlert): Promise<void> {
    // 1. Immediate threat assessment and classification
    // 2. Automated evidence preservation
    // 3. Emergency containment based on severity
    // 4. Compliance timeline initiation
    // 5. Response team notification
  }

  async preserveForensicEvidence(incident: Incident): Promise<EvidencePackage> {
    // Chain of custody compliant evidence collection
  }
}
```

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
- FROM Team B: Security monitoring API endpoints and alert formats
- FROM Team C: Integration with monitoring infrastructure

### What other teams NEED from you:
- TO Team A: Incident response status interfaces
- TO Team B: Forensic data collection requirements
- TO Team D: Security event processing patterns

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Core System: `/wedsync/src/lib/security/incident-response-system.ts`
- Forensics: `/wedsync/src/lib/security/forensic-evidence.ts`
- Database: `/wedsync/supabase/migrations/[timestamp]_incident_response_system.sql`
- Tests: `/wedsync/src/__tests__/unit/security/incident-response.test.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch26/WS-190-team-e-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY