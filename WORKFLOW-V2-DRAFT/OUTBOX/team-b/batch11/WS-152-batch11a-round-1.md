# TEAM B - ROUND 1: WS-152 - 00-STATUS Developer Monitoring Dashboard
## 2025-01-25 - Round 1 (Security & Monitoring Focus)

**YOUR MISSION:** Create standalone HTML dashboard for real-time system monitoring
**FEATURE ID:** WS-152 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about providing instant visibility into system health for developers

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Developer working on WedSync during critical wedding periods
**I want to:** Open a simple HTML file that shows real-time system health in my browser
**So that:** I can instantly see if any issues are affecting weddings without logging into multiple systems

**Real Wedding Problem This Solves:**
When a wedding is 2 hours away and the timeline system suddenly starts throwing errors, developers need immediate visibility. This standalone dashboard provides a single-file solution that can be opened instantly in any browser, showing critical metrics, error rates, and system status without requiring authentication or complex setup.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Standalone HTML file at `/WORKFLOW-V2-DRAFT/00-STATUS/index.html`
- Auto-refresh every 30 seconds with real-time metrics
- Monitoring API at `/api/monitoring/dashboard/route.ts`
- Modern, professional design with color-coded severity
- Shows: errors, performance, users, database, security status
- Must work by opening file directly in browser

**Technology Stack (VERIFIED):**
- Frontend: Pure HTML5, CSS3, Vanilla JavaScript (NO frameworks for standalone file)
- Backend API: Next.js 15 App Router endpoints
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Styling: Inline CSS with modern design patterns
- Data: JSON API endpoints from monitoring services

**Integration Points:**
- Monitoring API: Connect to system health endpoints
- Sentry Integration: Real error count and severity
- Performance Metrics: Core Web Vitals and API response times
- Database Health: Connection status and query performance

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL SaaS monitoring features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for dashboard development:
await mcp__context7__resolve-library-id("next.js");
await mcp__context7__get-library-docs("/vercel/next.js", "route-handlers api-endpoints", 5000);
await mcp__context7__get-library-docs("/w3c/html5", "modern-html5 css3-grid", 3000);
await mcp__context7__get-library-docs("/getsentry/sentry-javascript", "api-integration metrics", 3000);
await mcp__context7__get-library-docs("/web-platform/fetch-api", "javascript-fetch real-time", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing dashboard and API patterns:
await mcp__serena__search_for_pattern("dashboard api route monitoring");
await mcp__serena__find_symbol("route", "/src/app/api", true);
await mcp__serena__get_symbols_overview("src/app/api/monitoring");
```

**WHY THIS ORDER MATTERS:**
- Context7 provides latest HTML5 and API patterns
- Serena shows existing API route patterns to follow
- Agents work with current knowledge for modern dashboard development

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Create standalone monitoring dashboard"
2. **ui-ux-designer** --think-hard --use-loaded-docs "Design professional monitoring interface"
3. **api-architect** --think-ultra-hard --follow-existing-patterns "Build monitoring data API" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Secure monitoring endpoints"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs "Test dashboard auto-refresh"
6. **performance-optimization-expert** --accessibility-first --multi-tab "Optimize dashboard performance"

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for API development."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing dashboard files first
- Understand current API route patterns
- Check existing monitoring data structures
- Review similar dashboard implementations
- Continue until you FULLY understand the dashboard requirements

### **PLAN PHASE (THINK HARD!)**
- Create detailed dashboard layout plan
- Write API tests FIRST (TDD)
- Plan auto-refresh mechanism and data flow
- Consider error handling and offline states
- Don't rush - proper dashboard design prevents confusion

### **CODE PHASE (PARALLEL AGENTS!)**
- Create standalone HTML dashboard with inline styles
- Build monitoring API endpoints with security validation
- Implement auto-refresh with smooth animations
- Add responsive design for different screen sizes
- Focus on clarity and instant readability

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all dashboard integration tests
- Verify with Playwright that dashboard loads and refreshes
- Create dashboard evidence package
- Generate performance reports
- Only mark complete when dashboard is ACTUALLY working

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Dashboard Implementation):
- [ ] Standalone HTML file at `/WORKFLOW-V2-DRAFT/00-STATUS/index.html`
- [ ] Monitoring API at `/wedsync/src/app/api/monitoring/dashboard/route.ts`
- [ ] Auto-refresh functionality every 30 seconds
- [ ] Color-coded severity display (red=critical, yellow=warning, green=good)
- [ ] Responsive design for all screen sizes
- [ ] Unit tests with >80% coverage for API endpoints
- [ ] Basic Playwright tests validating dashboard functionality

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Monitoring services configuration - Required for API data sources
- FROM Team D: Database monitoring views - Dependency for database health metrics

### What other teams NEED from you:
- TO Team C: Dashboard API structure - They need this for admin dashboard integration
- TO Team E: Health check endpoints - Required for automated alerting system

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR DASHBOARD API

**EVERY API route MUST use the security framework at `/src/lib/validation/` and `/src/lib/security/`:**

```typescript
// ❌ NEVER DO THIS (FOUND IN 305+ ROUTES):
export async function GET(request: Request) {
  const data = await getMonitoringData(); // NO VALIDATION!
  return NextResponse.json(data); // DIRECT RESPONSE!
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { dashboardQuerySchema } from '@/lib/validation/schemas';

export const GET = withSecureValidation(
  dashboardQuerySchema, // Zod schema validation for query params
  async (request: NextRequest, validatedData) => {
    // validatedData is now safe and typed
    // Your dashboard API implementation here
  }
);
```

### SECURITY CHECKLIST FOR DASHBOARD ENDPOINTS

Teams MUST implement ALL of these for dashboard API routes:

- [ ] **Input Validation**: MANDATORY Zod schemas for all query parameters
- [ ] **Rate Limiting**: Prevent dashboard endpoint abuse (max 120 requests/minute)
- [ ] **CSRF Protection**: Automatic via middleware - DO NOT disable
- [ ] **Data Sanitization**: Sanitize all monitoring data before sending
- [ ] **Error Handling**: NEVER expose internal monitoring system details
- [ ] **Access Control**: Dashboard API should be internal/admin-only in production
- [ ] **Environment Security**: NEVER expose sensitive monitoring keys
- [ ] **Response Sanitization**: Remove sensitive fields from monitoring responses

### DASHBOARD-SPECIFIC SECURITY PATTERNS

**1. Dashboard Data API Routes:**
```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { dashboardMetricsSchema } from '@/lib/validation/schemas';

export const GET = withSecureValidation(
  dashboardMetricsSchema,
  async (request, validatedData) => {
    // Apply rate limiting for dashboard endpoints
    const rateLimitResult = await rateLimitService.checkRateLimit(request, {
      max: 120, // 120 requests per minute for dashboard
      windowMs: 60000
    });
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }
    
    // Fetch and sanitize monitoring data
    const metrics = await getSystemMetrics();
    const sanitizedMetrics = sanitizeMonitoringData(metrics);
    
    return NextResponse.json(sanitizedMetrics);
  }
);
```

**2. Real-time Dashboard Updates:**
```typescript
// Secure the dashboard update endpoint
export const POST = withSecureValidation(
  dashboardUpdateSchema,
  async (request, validatedData) => {
    // Validate dashboard update requests
    const { refresh_interval } = validatedData;
    
    // Enforce safe refresh intervals (minimum 10 seconds)
    if (refresh_interval < 10) {
      return NextResponse.json(
        { error: 'Minimum refresh interval is 10 seconds' }, 
        { status: 400 }
      );
    }
    
    // Process dashboard update safely
  }
);
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY DASHBOARD TESTING APPROACH!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "file:///path/to/00-STATUS/index.html"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for dashboard - zero ambiguity!

// 2. AUTO-REFRESH TESTING
await mcp__playwright__browser_navigate({url: "file:///path/to/00-STATUS/index.html"});
await mcp__playwright__browser_wait_for({text: "System Status", timeout: 5000});

// Wait for first auto-refresh (30 seconds)
await mcp__playwright__browser_wait_for({timeout: 35000});
const refreshedContent = await mcp__playwright__browser_snapshot();
// Verify content has updated

// 3. DASHBOARD PERFORMANCE VALIDATION
const dashboardMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    loadTime: performance.timing.loadEventEnd - performance.timing.navigationStart,
    domContentLoaded: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
    refreshCount: window.__REFRESH_COUNT__ || 0,
    apiCallDuration: window.__LAST_API_CALL_DURATION__ || 0
  })`
});

// 4. RESPONSIVE DASHBOARD TESTING
for (const width of [375, 768, 1200, 1920]) {
  await mcp__playwright__browser_resize({width, height: 800});
  const snapshot = await mcp__playwright__browser_snapshot();
  await mcp__playwright__browser_take_screenshot({filename: `dashboard-${width}px.png`});
}

// 5. ERROR STATE TESTING
// Simulate API failure to test dashboard error handling
await mcp__playwright__browser_evaluate({
  function: `() => {
    // Mock API failure
    window.originalFetch = window.fetch;
    window.fetch = () => Promise.reject(new Error('API Error'));
    // Trigger refresh
    window.refreshDashboard();
  }`
});
await mcp__playwright__browser_wait_for({text: "Unable to load", timeout: 10000});
```

**REQUIRED TEST COVERAGE:**
- [ ] Dashboard opens from file:// URL (standalone validation)
- [ ] Auto-refresh working every 30 seconds
- [ ] All monitoring metrics display correctly
- [ ] Error states handled gracefully
- [ ] Responsive at all screen sizes (375px, 768px, 1920px)
- [ ] No JavaScript errors in console during operation

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Standalone HTML dashboard opens directly in browser
- [ ] Monitoring API returning real data
- [ ] Auto-refresh working without manual intervention
- [ ] Color-coded severity system functioning
- [ ] Professional visual design with dark theme
- [ ] Zero TypeScript errors in API routes
- [ ] Zero JavaScript errors in dashboard

### Integration & Performance:
- [ ] Dashboard loads in < 2 seconds
- [ ] API responses < 200ms
- [ ] Smooth auto-refresh without flickering
- [ ] Accessibility validation passed
- [ ] Security requirements met for all endpoints
- [ ] Works across all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of working dashboard
- [ ] Screen recording of auto-refresh functionality
- [ ] API response examples with real data
- [ ] Performance metrics showing load times
- [ ] Responsive design screenshots at all breakpoints

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Dashboard HTML: `/WORKFLOW-V2-DRAFT/00-STATUS/index.html`
- API Endpoints: `/wedsync/src/app/api/monitoring/dashboard/route.ts`
- Dashboard Tests: `/wedsync/src/__tests__/monitoring/dashboard.test.ts`
- Types: `/wedsync/src/types/monitoring-dashboard.ts`

### ⚠️ DATABASE MIGRATIONS:
- If needed, CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-152.md`
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch11a/WS-152-round-1-complete.md`
- **Include:** Feature ID (WS-152) in all filenames
- **Save in:** batch11a folder for proper organization
- **After completion:** Run `./route-messages.sh`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT create a Next.js page component - this must be standalone HTML
- Do NOT skip security validation on monitoring API endpoints
- Do NOT make the dashboard require authentication (development tool)
- Do NOT use external CDN dependencies - all code must be inline
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Standalone HTML dashboard created and tested
- [ ] Monitoring API endpoints secured and functional
- [ ] Auto-refresh mechanism working reliably
- [ ] Dependencies provided to other teams
- [ ] Code committed with evidence
- [ ] Comprehensive dashboard report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY