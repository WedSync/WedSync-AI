# TEAM C — BATCH 27 — ROUND 1 — WS-191 - Backup Procedures - Monitoring Integration & Alerts

**Date:** 2025-08-26  
**Feature ID:** WS-191 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build monitoring integration and alerting system for backup operations and disaster recovery  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync database administrator responsible for protecting wedding vendor and couple data
**I want to:** Implement automated backup procedures with multiple recovery points and disaster recovery capabilities
**So that:** I can protect critical wedding data from loss, ensure business continuity during peak wedding seasons, and meet data recovery SLAs that prevent couples from losing their wedding planning progress or vendors from losing client information

**Real Wedding Problem This Solves:**
A database corruption occurs during peak wedding season (June) affecting 2,000+ active wedding timelines just weeks before ceremonies. With proper backup procedures, WedSync automatically maintained point-in-time backups every hour, full daily backups for 30 days, and weekly archives for 12 months. The system can restore to any point within the last 30 days, minimizing data loss to under 1 hour, ensuring couples don't lose their vendor communications, timeline updates, or payment records during this critical period.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Backup monitoring integration with existing alert system
- Real-time backup status tracking
- Failure detection and notification system
- Performance monitoring for backup operations
- Cross-region backup validation
- Recovery time tracking and SLA monitoring

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- Monitoring: Integration with WS-155 alert system

**Integration Points:**
- WS-155 Alert System: Backup failure notifications
- Team A backup orchestrator: Status reporting interface
- Team B APIs: Monitoring data endpoints
- Database: Backup operation logs and metrics

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
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__Ref__ref_resolve_library_id("monitoring");
await mcp__Ref__ref_get_library_docs("/prometheus/prometheus", "monitoring alerts backup-metrics", 5000);
await mcp__Ref__ref_get_library_docs("/supabase/supabase", "realtime monitoring edge-functions", 3000);
await mcp__Ref__ref_get_library_docs("/vercel/next.js", "monitoring integration webhooks", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("monitoring", "", true);
await mcp__serena__get_symbols_overview("/src/lib/monitoring/");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "coordinate backup monitoring implementation"
2. **devops-sre-engineer** --think-hard --use-loaded-docs "monitoring and alerting systems"
3. **supabase-specialist** --think-ultra-hard --follow-existing-patterns "realtime monitoring integration" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **slack-communication-specialist** --accessibility-first --multi-tab
7. **code-quality-guardian** --check-patterns --match-codebase-style

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing monitoring patterns first
- Understand WS-155 alert system integration
- Check current monitoring implementations
- Review backup monitoring requirements
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed monitoring integration plan
- Write test cases FIRST (TDD)
- Plan alert escalation procedures
- Consider peak season monitoring needs
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow existing monitoring patterns
- Use Ref MCP examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Backup monitoring service (`/src/lib/monitoring/backup-monitor.ts`)
- [ ] Alert integration with WS-155 system (`/src/lib/monitoring/backup-alerts.ts`)
- [ ] Real-time backup status tracking (`/src/lib/services/backup-status-tracker.ts`)
- [ ] Performance metrics collector (`/src/lib/monitoring/backup-metrics.ts`)
- [ ] Unit tests with >80% coverage
- [ ] Monitoring integration tests

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
- FROM Team A: Backup orchestrator status interface and event hooks
- FROM Team B: API endpoints for backup monitoring data

### What other teams NEED from you:
- TO Team A: Monitoring hooks and status callbacks
- TO Team D: Monitoring data for admin dashboard widgets
- TO Team E: Monitoring test patterns and validation approaches

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR MONITORING

```typescript
// ✅ MONITORING SECURITY PATTERN:
import { withMonitoringValidation } from '@/lib/validation/middleware';
import { monitoringSchema } from '@/lib/validation/schemas';

export class BackupMonitor {
  private validateMonitoringAccess(request: Request): boolean {
    // Validate monitoring service authentication
    const monitoringToken = request.headers.get('x-monitoring-token');
    return this.verifyMonitoringToken(monitoringToken);
  }

  async recordBackupMetrics(metrics: BackupMetrics): Promise<void> {
    // Sanitize sensitive data before logging
    const sanitizedMetrics = this.sanitizeBackupMetrics(metrics);
    await this.metricsStore.record(sanitizedMetrics);
  }
}
```

### CRITICAL MONITORING SECURITY PATTERNS

**1. Alert Webhook Security:**
```typescript
// Verify webhook signatures for backup alerts
export const POST = async (request: Request) => {
  const signature = request.headers.get('x-webhook-signature');
  if (!verifyWebhookSignature(signature, await request.text())) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  // Process backup alert
};
```

**2. Monitoring Data Sanitization:**
```typescript
// Remove sensitive data from monitoring logs
const sanitizeBackupMetrics = (metrics: BackupMetrics) => ({
  ...metrics,
  backup_path: undefined, // Don't log actual paths
  user_data: undefined,   // Remove any user-specific data
  timestamp: metrics.timestamp,
  status: metrics.status,
  duration: metrics.duration
});
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// BACKUP MONITORING TESTING

// 1. MONITORING INTEGRATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/monitoring"});

// 2. BACKUP ALERT SIMULATION
const alertTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    // Simulate backup failure alert
    window.backupMonitor?.simulateFailure('daily_backup_failed');
    return {
      alertTriggered: window.backupMonitor?.lastAlert,
      monitoringActive: window.backupMonitor?.isActive()
    };
  }`
});

// 3. REAL-TIME STATUS TRACKING
const statusTest = await mcp__playwright__browser_evaluate({
  function: `() => {
    return {
      backupStatus: window.backupMonitor?.getCurrentStatus(),
      metricsCollected: window.backupMonitor?.getMetrics(),
      alertsHistory: window.backupMonitor?.getAlertsHistory()
    };
  }`
});

// 4. MONITORING PERFORMANCE VALIDATION
const performanceTest = await mcp__playwright__browser_evaluate({
  function: `() => ({
    monitoringOverhead: performance.measure('monitoring-impact'),
    alertLatency: window.backupMonitor?.getAlertLatency(),
    metricsProcessingTime: window.backupMonitor?.getMetricsLatency()
  })`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Monitoring integration validation
- [ ] Alert system triggering and delivery
- [ ] Real-time status tracking accuracy
- [ ] Performance impact measurement
- [ ] Zero console errors in monitoring operations


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
- [ ] All deliverables for this round complete
- [ ] Tests written FIRST and passing (>80% coverage)
- [ ] Monitoring integration tests passing
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integration with WS-155 alert system working
- [ ] Real-time monitoring under 1s latency
- [ ] Alert delivery within 30 seconds of failure
- [ ] Security requirements met
- [ ] Performance overhead under 5%

### Evidence Package Required:
- [ ] Screenshot proof of monitoring dashboard
- [ ] Alert delivery test results
- [ ] Performance impact metrics
- [ ] Security validation proof
- [ ] Test coverage report

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Monitoring: `/wedsync/src/lib/monitoring/backup-monitor.ts`
- Alerts: `/wedsync/src/lib/monitoring/backup-alerts.ts`
- Services: `/wedsync/src/lib/services/backup-status-tracker.ts`
- Tests: `/wedsync/tests/monitoring/backup/`
- Types: `/wedsync/src/types/backup-monitoring.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch27/WS-191-team-c-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY