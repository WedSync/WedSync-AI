# TEAM D — BATCH 27 — ROUND 1 — WS-191 - Backup Procedures - Admin Dashboard & Recovery UI

**Date:** 2025-08-26  
**Feature ID:** WS-191 (Track all work with this ID)  
**Priority:** P1 from roadmap  
**Mission:** Build admin dashboard interface for backup management and disaster recovery operations  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

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
- Admin backup management dashboard
- Recovery point-in-time selection interface
- Backup status monitoring widgets
- Disaster recovery workflow UI
- Backup schedule configuration interface
- Recovery progress tracking and visualization

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Browser MCP, Vitest
- UI: SaaS admin dashboard patterns

**Integration Points:**
- Team A backup orchestrator: Status data for dashboard
- Team B APIs: Admin backup management endpoints
- Team C monitoring: Real-time status and alerts
- Database: Backup metadata for UI display

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
// For ALL OTHER UI features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

await mcp__Ref__ref_resolve_library_id("react");
await mcp__Ref__ref_get_library_docs("/facebook/react", "dashboard-components admin-ui", 5000);
await mcp__Ref__ref_get_library_docs("/tailwindlabs/tailwindcss", "admin-dashboard layouts", 3000);
await mcp__Ref__ref_get_library_docs("/vercel/next.js", "admin-routing server-components", 2000);

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns before creating new ones:
await mcp__serena__find_symbol("Dashboard", "", true);
await mcp__serena__get_symbols_overview("/src/components/admin/");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-mcp-docs "coordinate backup dashboard implementation"
2. **react-ui-specialist** --think-hard --use-loaded-docs "admin dashboard components"
3. **nextjs-fullstack-developer** --think-ultra-hard --follow-existing-patterns "admin routing and server components" 
4. **ui-ux-designer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **playwright-visual-testing-specialist** --accessibility-first --multi-tab --use-browser-mcp
7. **code-quality-guardian** --check-patterns --match-codebase-style

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing admin dashboard patterns first
- Understand current admin UI components and styling
- Check SAAS UI style guide requirements
- Review admin authentication and routing
- Continue until you FULLY understand the codebase

### **PLAN PHASE (THINK HARD!)**
- Create detailed dashboard component plan
- Write test cases FIRST (TDD)
- Plan recovery workflow UX
- Consider admin user experience during crisis
- Don't rush - proper planning prevents problems

### **CODE PHASE (PARALLEL AGENTS!)**
- Write tests before implementation
- Follow SAAS UI style guide
- Use Ref MCP examples as templates
- Implement with parallel agents
- Focus on completeness, not speed

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] Backup dashboard component (`/src/components/admin/BackupDashboard.tsx`)
- [ ] Recovery interface component (`/src/components/admin/RecoveryInterface.tsx`)
- [ ] Backup status widgets (`/src/components/admin/backup/StatusWidgets.tsx`)
- [ ] Admin backup page (`/src/app/(dashboard)/admin/backup/page.tsx`)
- [ ] Unit tests with >80% coverage
- [ ] Playwright visual tests for dashboard

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
- FROM Team A: Backup orchestrator status data interface
- FROM Team B: Admin API endpoints for backup management
- FROM Team C: Monitoring data for real-time dashboard updates

### What other teams NEED from you:
- TO Team A: Dashboard status display requirements
- TO Team B: API contract requirements for dashboard data
- TO Team E: UI component patterns for testing

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ADMIN UI

```typescript
// ✅ ADMIN DASHBOARD SECURITY PATTERN:
import { withAdminAuth } from '@/lib/auth/admin-middleware';
import { AdminDashboardLayout } from '@/components/layouts/AdminLayout';

export default async function BackupDashboard() {
  // Server-side admin authentication
  const adminUser = await verifyAdminAccess();
  if (!adminUser) {
    redirect('/login?admin=true');
  }

  return (
    <AdminDashboardLayout>
      <BackupManagementInterface adminUser={adminUser} />
    </AdminDashboardLayout>
  );
}
```

### CRITICAL ADMIN UI SECURITY PATTERNS

**1. Admin Component Protection:**
```typescript
// Protect sensitive backup operations
const BackupManagementInterface = ({ adminUser }: { adminUser: AdminUser }) => {
  const [confirmationModal, setConfirmationModal] = useState<string | null>(null);
  
  const handleDangerousOperation = (operation: 'restore' | 'delete') => {
    // Require additional confirmation for destructive operations
    setConfirmationModal(`confirm-${operation}`);
  };

  return (
    <div className="admin-backup-dashboard">
      {/* Backup status without sensitive paths */}
      <BackupStatusWidget />
      
      {/* Recovery operations with confirmation */}
      <RecoveryControls 
        onRestore={() => handleDangerousOperation('restore')}
        requireConfirmation={true}
      />
    </div>
  );
};
```

**2. Sensitive Data Filtering:**
```typescript
// Filter backup data for UI display
const sanitizeBackupDataForUI = (backupData: RawBackupData): UIBackupData => ({
  id: backupData.id,
  timestamp: backupData.timestamp,
  status: backupData.status,
  size: backupData.size,
  // Exclude: actual file paths, connection strings, etc.
  duration: backupData.duration,
  type: backupData.type
});
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// BACKUP DASHBOARD UI TESTING

// 1. ADMIN DASHBOARD ACCESSIBILITY
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/backup"});
const dashboardStructure = await mcp__playwright__browser_snapshot();

// 2. BACKUP MANAGEMENT UI INTERACTION
await mcp__playwright__browser_click({
  element: "Backup Now button",
  ref: "button[data-testid='backup-now']"
});

await mcp__playwright__browser_wait_for({text: "Backup initiated"});

// 3. RECOVERY INTERFACE TESTING
await mcp__playwright__browser_click({
  element: "Recovery tab",
  ref: "button[data-testid='recovery-tab']"
});

const recoveryInterface = await mcp__playwright__browser_snapshot();

// 4. RESPONSIVE ADMIN DASHBOARD VALIDATION
for (const width of [1200, 768, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const responsiveSnapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({
    filename: `admin-backup-${width}px.png`,
    fullPage: true
  });
}

// 5. REAL-TIME STATUS UPDATES
const statusUpdates = await mcp__playwright__browser_evaluate({
  function: `() => {
    return new Promise((resolve) => {
      let updateCount = 0;
      const checkUpdates = () => {
        updateCount++;
        if (updateCount >= 3) {
          resolve({
            statusUpdated: window.backupDashboard?.statusUpdateCount || 0,
            realTimeActive: window.backupDashboard?.isRealTimeActive()
          });
        } else {
          setTimeout(checkUpdates, 1000);
        }
      };
      checkUpdates();
    });
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Admin dashboard accessibility validation
- [ ] Backup management UI interactions
- [ ] Recovery interface usability testing
- [ ] Responsive design across all breakpoints
- [ ] Real-time status updates working correctly


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
- [ ] Playwright visual tests passing
- [ ] Zero TypeScript errors
- [ ] Zero console errors

### Integration & Performance:
- [ ] Integration with all team APIs working
- [ ] Dashboard loads under 2 seconds
- [ ] Real-time updates under 1 second latency
- [ ] Security requirements met
- [ ] Works on all admin breakpoints (1200px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of complete backup dashboard
- [ ] Playwright visual test results
- [ ] Performance metrics for dashboard loading
- [ ] Console error-free proof
- [ ] Responsive design validation

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Components: `/wedsync/src/components/admin/backup/`
- Pages: `/wedsync/src/app/(dashboard)/admin/backup/`
- Tests: `/wedsync/tests/components/admin/backup/`
- Types: `/wedsync/src/types/admin-backup.ts`
- Styles: Follow SAAS UI style guide patterns

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch27/WS-191-team-d-round-1-complete.md`

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY