# TEAM C - ROUND 1: WS-153 - Admin Dashboard Monitoring Enhancement
## 2025-01-25 - Round 1 (Security & Monitoring Focus)

**YOUR MISSION:** Enhance existing admin dashboard with comprehensive monitoring tabs
**FEATURE ID:** WS-153 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about providing admins real-time visibility into wedding-critical system health

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** WedSync admin monitoring multiple wedding suppliers and their events
**I want to:** See real-time system health, errors, and performance in my admin dashboard
**So that:** I can proactively address issues before they impact couples on their wedding day

**Real Wedding Problem This Solves:**
When 20 weddings are happening this weekend and error rates suddenly spike, admins need immediate visibility. This monitoring enhancement adds comprehensive tabs to the existing admin dashboard, showing errors by wedding context (which couples affected), performance metrics for critical paths, and security alerts - all integrated into the admin's existing workflow.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- DO NOT create new admin dashboard - enhance existing at `/src/app/(dashboard)/admin/`
- Create `/src/app/(dashboard)/admin/monitoring/page.tsx`
- Build 5 monitoring tabs: Overview, Errors, Performance, Security, Business
- Integrate with Sentry for real error data
- Real-time updates every 30 seconds
- Use existing UI components (Untitled UI + Magic UI)

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- UI Components: Untitled UI (MANDATORY), Magic UI for animations
- Monitoring: Sentry integration, real-time data updates

**Integration Points:**
- Existing Admin Dashboard: Integrate seamlessly with current navigation
- Sentry Error Tracking: Real error feed with wedding context
- Performance Monitoring: Web Vitals and API response times
- Database Health: Connection status and query performance
- Real-time Updates: WebSocket or polling for live data

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL SaaS monitoring features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for admin dashboard development:
await mcp__context7__resolve-library-id("react");
await mcp__context7__get-library-docs("/facebook/react", "hooks state-management", 5000);
await mcp__context7__get-library-docs("/vercel/next.js", "app-router server-components", 4000);
await mcp__context7__get-library-docs("/untitled-ui/react", "dashboard-components tabs", 4000);
await mcp__context7__get-library-docs("/magic-ui/animations", "real-time-updates transitions", 3000);
await mcp__context7__get-library-docs("/getsentry/sentry-javascript", "react-integration error-tracking", 3000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing admin dashboard patterns:
await mcp__serena__search_for_pattern("admin dashboard layout tabs");
await mcp__serena__find_symbol("AdminLayout", "/src/app/(dashboard)/admin", true);
await mcp__serena__get_symbols_overview("src/app/(dashboard)/admin");
await mcp__serena__find_referencing_symbols("admin navigation menu");
```

**WHY THIS ORDER MATTERS:**
- Context7 provides latest React 19 and Untitled UI patterns
- Serena shows existing admin dashboard structure to follow
- Agents work with current knowledge for seamless integration

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Enhance admin dashboard with monitoring"
2. **react-ui-specialist** --think-hard --use-loaded-docs "Build monitoring UI components with Untitled UI"
3. **integration-specialist** --think-ultra-hard --follow-existing-patterns "Integrate with Sentry and monitoring APIs" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Secure admin monitoring access"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs "Test real-time monitoring updates"
6. **ui-ux-designer** --accessibility-first --multi-tab "Design monitoring interface with existing admin styles"

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for admin dashboard integration. MANDATORY: Use only Untitled UI + Magic UI components."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing admin dashboard files first
- Understand current admin navigation and layout patterns
- Check existing monitoring component structures
- Review similar admin feature implementations
- Continue until you FULLY understand the admin dashboard architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed monitoring page integration plan
- Write component tests FIRST (TDD)
- Plan real-time data flow and state management
- Consider admin user experience and workflow
- Don't rush - proper admin integration prevents UI inconsistencies

### **CODE PHASE (PARALLEL AGENTS!)**
- Create monitoring page integrated with admin layout
- Build 5 monitoring tab components using Untitled UI
- Implement real-time updates with smooth Magic UI animations
- Add responsive design matching existing admin styles
- Focus on admin-specific context and wedding-aware metrics

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all admin dashboard integration tests
- Verify with Playwright that monitoring tabs work seamlessly
- Create admin monitoring evidence package
- Generate integration reports
- Only mark complete when monitoring is ACTUALLY integrated

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Admin Monitoring Integration):
- [ ] Admin monitoring page at `/src/app/(dashboard)/admin/monitoring/page.tsx`
- [ ] Five monitoring tab components using Untitled UI:
  - SystemHealthOverview.tsx - Real-time status cards
  - ErrorMonitoring.tsx - Sentry error feed with wedding context  
  - PerformanceMetrics.tsx - Web Vitals and API metrics
  - SecurityMonitoring.tsx - Vulnerability tracking
  - BusinessMetrics.tsx - Revenue and user metrics
- [ ] Integration with existing admin navigation
- [ ] Real-time data updates every 30 seconds
- [ ] Unit tests with >80% coverage for monitoring components
- [ ] Basic Playwright tests validating admin monitoring access

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Sentry configuration and monitoring services - Required for error data
- FROM Team B: Monitoring API endpoints - Dependency for real-time data source

### What other teams NEED from you:
- TO Team D: Component structure for database metrics - They need this for database health display
- TO Team E: Alert integration points - Required for admin alert management

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR ADMIN MONITORING

**ALL admin monitoring components MUST enforce admin-only access:**

```typescript
// ❌ NEVER DO THIS (FOUND IN ADMIN ROUTES):
export default function AdminMonitoringPage() {
  // NO ACCESS CONTROL!
  return <MonitoringDashboard />;
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { redirect } from 'next/navigation';

export default async function AdminMonitoringPage() {
  const session = await getServerSession(authOptions);
  
  // MANDATORY: Verify admin role
  if (!session?.user?.role || session.user.role !== 'admin') {
    redirect('/dashboard'); // Redirect non-admins
  }
  
  return <MonitoringDashboard user={session.user} />;
}
```

### SECURITY CHECKLIST FOR ADMIN MONITORING COMPONENTS

Teams MUST implement ALL of these for admin monitoring features:

- [ ] **Admin Role Verification**: Server-side role check on monitoring page
- [ ] **Session Validation**: Active session required with admin privileges
- [ ] **Data Access Control**: Only show monitoring data appropriate for admin level
- [ ] **CSRF Protection**: Automatic via Next.js App Router
- [ ] **Input Sanitization**: Sanitize all monitoring filter inputs
- [ ] **Error Handling**: NEVER expose system internals to non-admin users
- [ ] **Audit Logging**: Log all admin monitoring access and actions
- [ ] **Rate Limiting**: Prevent monitoring endpoint abuse from admin interface

### ADMIN MONITORING SPECIFIC SECURITY PATTERNS

**1. Admin Monitoring Page Security:**
```typescript
// Server Component with Admin Verification
import { AdminMonitoringProvider } from '@/components/providers/AdminMonitoringProvider';

export default async function AdminMonitoringPage() {
  const session = await getServerSession(authOptions);
  
  // Verify admin access
  if (!session?.user?.isAdmin) {
    notFound(); // Return 404 to hide admin features
  }
  
  // Audit log admin monitoring access
  await auditLogger.log({
    action: 'admin_monitoring_access',
    userId: session.user.id,
    timestamp: new Date(),
    ip: headers().get('x-forwarded-for')
  });
  
  return (
    <AdminMonitoringProvider session={session}>
      <MonitoringTabs />
    </AdminMonitoringProvider>
  );
}
```

**2. Monitoring Component Security:**
```typescript
'use client';

import { useAdminSession } from '@/hooks/useAdminSession';

export function ErrorMonitoring() {
  const { isAdmin, session } = useAdminSession();
  
  // Client-side admin verification as fallback
  if (!isAdmin) {
    return <UnauthorizedMessage />;
  }
  
  // Filter sensitive error data for admin context
  const sanitizedErrors = errors.map(error => ({
    ...error,
    // Remove sensitive system details
    stack: error.level === 'critical' ? error.stack : undefined,
    user: error.user ? { id: error.user.id, role: error.user.role } : undefined
  }));
  
  return <ErrorList errors={sanitizedErrors} />;
}
```

---

## 🎨 UI IMPLEMENTATION REQUIREMENTS (MANDATORY)

**🚨 CRITICAL: Use ONLY Untitled UI + Magic UI Components**

```typescript
// MANDATORY: Import ONLY from Untitled UI and Magic UI
import { Card, Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/untitled';
import { AnimatedCard, FadeIn, SlideUp } from '@/components/ui/magic';

// ❌ FORBIDDEN IMPORTS:
// import { Card } from '@/components/ui/card'; // shadcn/ui - NOT ALLOWED
// import { Tabs } from '@radix-ui/react-tabs'; // Radix - NOT ALLOWED

// ✅ CORRECT UNTITLED UI PATTERN:
export function MonitoringTabs() {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <AnimatedCard>
            <SystemHealthOverview />
          </AnimatedCard>
        </TabsContent>
        
        {/* Additional tabs with Magic UI animations */}
      </Tabs>
    </div>
  );
}
```

**UI STYLE REQUIREMENTS:**
- **MUST use Untitled UI components** for all UI elements
- **MUST use Magic UI animations** for real-time updates
- **MUST match existing admin dashboard styling**
- **MUST be responsive** across all admin breakpoints
- **MUST maintain admin color scheme** (dark mode compatible)

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY ADMIN MONITORING TESTING APPROACH!

// 1. ADMIN ACCESS CONTROL TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/monitoring"});

// Test without admin access (should redirect)
await mcp__playwright__browser_evaluate({
  function: `() => { 
    // Clear admin session
    localStorage.removeItem('admin-session');
    window.location.reload();
  }`
});
await mcp__playwright__browser_wait_for({text: "Unauthorized", timeout: 5000});

// Test with admin access
await mcp__playwright__browser_navigate({url: "http://localhost:3000/auth/admin-login"});
await mcp__playwright__browser_type({
  element: "admin email input",
  ref: "[data-testid=admin-email]",
  text: "admin@wedsync.com"
});
await mcp__playwright__browser_type({
  element: "admin password input", 
  ref: "[data-testid=admin-password]",
  text: "admin-test-password"
});
await mcp__playwright__browser_click({
  element: "admin login button",
  ref: "[data-testid=admin-login]"
});

// 2. MONITORING TABS FUNCTIONALITY TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/monitoring"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();

// Test each monitoring tab
const tabs = ['overview', 'errors', 'performance', 'security', 'business'];
for (const tab of tabs) {
  await mcp__playwright__browser_click({
    element: `${tab} tab`,
    ref: `[data-value="${tab}"]`
  });
  await mcp__playwright__browser_wait_for({text: tab.charAt(0).toUpperCase() + tab.slice(1), timeout: 3000});
  await mcp__playwright__browser_take_screenshot({filename: `admin-monitoring-${tab}-tab.png`});
}

// 3. REAL-TIME UPDATES TESTING  
await mcp__playwright__browser_click({
  element: "errors tab",
  ref: '[data-value="errors"]'
});

// Wait for first data load
await mcp__playwright__browser_wait_for({text: "Error Rate", timeout: 5000});

// Wait for auto-refresh (30 seconds) and verify data updates
await mcp__playwright__browser_wait_for({timeout: 35000});
const updatedContent = await mcp__playwright__browser_snapshot();

// 4. ADMIN MONITORING PERFORMANCE VALIDATION
const adminMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    tabSwitchTime: window.__TAB_SWITCH_TIME__ || 0,
    dataLoadTime: window.__MONITORING_DATA_LOAD_TIME__ || 0,
    memoryUsage: performance.memory?.usedJSHeapSize || 0,
    updateInterval: window.__UPDATE_INTERVAL__ || 0
  })`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Admin access control working (non-admins blocked)
- [ ] All 5 monitoring tabs load and display data
- [ ] Real-time updates functioning every 30 seconds
- [ ] Tab switching performance < 200ms
- [ ] Integration with existing admin navigation
- [ ] Responsive design at admin dashboard breakpoints

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Monitoring page integrated seamlessly with existing admin dashboard
- [ ] All 5 monitoring tabs functional with real data
- [ ] Admin access control enforced (non-admins cannot access)
- [ ] Real-time updates working without manual intervention
- [ ] Untitled UI components used exclusively
- [ ] Zero TypeScript errors in admin monitoring code
- [ ] Zero console errors in admin interface

### Integration & Performance:
- [ ] Monitoring tabs switch in < 200ms
- [ ] Data loading performance < 500ms per tab
- [ ] Smooth Magic UI animations for data updates
- [ ] Accessibility validation passed for admin interface
- [ ] Security requirements met for admin features
- [ ] Integration with existing admin navigation and layout

### Evidence Package Required:
- [ ] Screenshot proof of integrated monitoring page
- [ ] Screen recording of all tab functionality
- [ ] Admin access control demonstration
- [ ] Performance metrics for tab switching and data loading
- [ ] Integration evidence with existing admin dashboard

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Admin Monitoring Page: `/wedsync/src/app/(dashboard)/admin/monitoring/page.tsx`
- Monitoring Components: `/wedsync/src/components/admin/monitoring/`
  - `SystemHealthOverview.tsx`
  - `ErrorMonitoring.tsx` 
  - `PerformanceMetrics.tsx`
  - `SecurityMonitoring.tsx`
  - `BusinessMetrics.tsx`
- Tests: `/wedsync/src/__tests__/admin/monitoring/`
- Types: `/wedsync/src/types/admin-monitoring.ts`

### ⚠️ DATABASE MIGRATIONS:
- If needed, CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-153.md`
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch11a/WS-153-round-1-complete.md`
- **Include:** Feature ID (WS-153) in all filenames
- **Save in:** batch11a folder for proper organization
- **After completion:** Run `./route-messages.sh`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT create separate admin dashboard - enhance existing one only
- Do NOT use forbidden UI libraries (shadcn, Radix, etc) - ONLY Untitled UI + Magic UI
- Do NOT skip admin access control - enforce admin-only access
- Do NOT break existing admin dashboard navigation or layout
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Admin monitoring page integrated with existing dashboard
- [ ] All monitoring components using Untitled UI exclusively
- [ ] Admin access control implemented and tested
- [ ] Real-time updates working reliably
- [ ] Dependencies provided to other teams
- [ ] Code committed with evidence
- [ ] Comprehensive admin monitoring integration report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY