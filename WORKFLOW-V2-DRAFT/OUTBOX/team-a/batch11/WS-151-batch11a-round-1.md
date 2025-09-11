# TEAM A - ROUND 1: WS-151 - Core Infrastructure & Monitoring Tools
## 2025-01-25 - Round 1 (Security & Monitoring Focus)

**YOUR MISSION:** Install and configure all external monitoring services for WedSync production security
**FEATURE ID:** WS-151 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about preventing wedding day disasters through proactive monitoring

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier managing multiple couples' most important day
**I want to:** Know immediately if our system has issues affecting wedding coordination
**So that:** I can resolve problems before they impact couples on their wedding day

**Real Wedding Problem This Solves:**
Wedding suppliers need bulletproof reliability. When a photographer can't access the timeline 30 minutes before ceremony, or when a caterer loses the guest list during setup, it creates wedding day chaos. This comprehensive monitoring system provides early warning and deep visibility into system health to prevent these disasters.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Enhanced Sentry configuration with session replay for bug reproduction
- LogRocket integration for user session recording and debugging
- Snyk security scanning for vulnerability detection
- SonarCloud code quality monitoring
- Bundle analyzer for performance tracking
- Monitoring API endpoints for health checks

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Monitoring: Sentry, LogRocket, Snyk, SonarCloud
- Performance: Bundle Analyzer, Core Web Vitals

**Integration Points:**
- Sentry Error Tracking: Connect to production error reporting
- LogRocket Session Replay: 10% sampling rate for performance
- Security Scanning: Automated vulnerability detection
- Performance Monitoring: Real-time bundle size and load time tracking

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL SaaS monitoring features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for monitoring integration:
await mcp__context7__resolve-library-id("sentry");
await mcp__context7__get-library-docs("/getsentry/sentry-javascript", "nextjs-configuration session-replay", 5000);
await mcp__context7__get-library-docs("/logrocket/logrocket", "nextjs-integration performance", 3000);
await mcp__context7__get-library-docs("/vercel/next.js", "monitoring instrumentation", 3000);
await mcp__context7__get-library-docs("/snyk/snyk", "security-scanning ci-cd", 2000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing monitoring patterns:
await mcp__serena__search_for_pattern("sentry monitoring error tracking");
await mcp__serena__find_symbol("instrumentation", "", true);
await mcp__serena__get_symbols_overview("src/lib/monitoring");
```

**WHY THIS ORDER MATTERS:**
- Context7 prevents using deprecated APIs (Sentry SDK changes frequently!)
- Serena shows existing monitoring patterns to follow
- Agents work with current knowledge (no wasted effort on outdated approaches!)

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Configure production monitoring stack"
2. **performance-optimization-expert** --think-hard --use-loaded-docs "Minimize monitoring performance impact"
3. **security-compliance-officer** --think-ultra-hard --follow-existing-patterns "Secure monitoring data collection" 
4. **test-automation-architect** --think-ultra-hard --check-current-best-practices "Test monitoring integrations"
5. **code-quality-guardian** --tdd-approach --use-testing-patterns-from-docs "Validate monitoring setup"
6. **documentation-chronicler** --accessibility-first --multi-tab "Document monitoring configuration"

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for monitoring."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing monitoring files first
- Understand current Sentry configuration patterns
- Check existing performance monitoring setup
- Review similar monitoring implementations
- Continue until you FULLY understand the monitoring architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed monitoring implementation plan
- Write monitoring tests FIRST (TDD)
- Plan error collection and performance sampling
- Consider production impact and sampling rates
- Don't rush - proper monitoring setup prevents disasters

### **CODE PHASE (PARALLEL AGENTS!)**
- Configure Sentry with session replay
- Integrate LogRocket with minimal performance impact
- Set up Snyk security scanning automation
- Implement bundle analysis monitoring
- Focus on reliability and minimal overhead

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all monitoring integration tests
- Verify with Playwright that monitoring loads correctly
- Create monitoring evidence package
- Generate configuration reports
- Only mark complete when monitoring is ACTUALLY working

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Monitoring Setup):
- [ ] Enhanced Sentry configuration with session replay
- [ ] LogRocket integration with 10% sampling
- [ ] Snyk security scanning scripts in package.json
- [ ] Bundle analyzer configuration and reporting
- [ ] Monitoring API endpoints: /api/monitoring/sentry/events and /api/monitoring/security/scan
- [ ] Unit tests with >80% coverage for monitoring utilities
- [ ] Basic Playwright tests validating monitoring loads

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team D: Database monitoring views - Required for system health API
- FROM Team E: Alert configuration - Dependency for error notification routing

### What other teams NEED from you:
- TO Team B: Monitoring API endpoints - They need these for dashboard data
- TO Team C: Sentry integration - Required for admin dashboard error display

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

**EVERY API route MUST use the security framework at `/src/lib/validation/` and `/src/lib/security/`:**

```typescript
// ❌ NEVER DO THIS (FOUND IN 305+ ROUTES):
export async function POST(request: Request) {
  const body = await request.json(); // NO VALIDATION!
  const { data } = await supabase.from('monitoring_events').insert(body); // DIRECT INSERT!
  return NextResponse.json(data);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { monitoringEventSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  monitoringEventSchema, // Zod schema validation
  async (request: NextRequest, validatedData) => {
    // validatedData is now safe and typed
    // Your monitoring implementation here
  }
);
```

### SECURITY CHECKLIST FOR MONITORING ENDPOINTS

Teams MUST implement ALL of these for monitoring API routes:

- [ ] **Authentication Check**: Admin-only access for sensitive monitoring data
- [ ] **Input Validation**: MANDATORY Zod schemas for all monitoring data
- [ ] **Rate Limiting**: Prevent monitoring endpoint abuse
- [ ] **CSRF Protection**: Automatic via middleware - DO NOT disable
- [ ] **Data Sanitization**: Sanitize all monitoring events before storage
- [ ] **Error Handling**: NEVER expose monitoring system internals
- [ ] **Environment Security**: NEVER expose Sentry DSN or LogRocket keys in client
- [ ] **Audit Logging**: Log all monitoring configuration changes

### MONITORING-SPECIFIC SECURITY PATTERNS

**1. Monitoring Event Routes:**
```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { monitoringEventSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  monitoringEventSchema.extend({
    event_type: z.enum(['error', 'performance', 'security', 'business']),
    severity: z.enum(['low', 'medium', 'high', 'critical'])
  }),
  async (request, validatedData) => {
    // Verify admin access for sensitive events
    const session = await getServerSession(authOptions);
    if (!session?.user?.role === 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    // Implementation with validated data
  }
);
```

**2. Monitoring Configuration Routes:**
```typescript
export const POST = withSecureValidation(
  monitoringConfigSchema,
  async (request, validatedData) => {
    // NEVER expose sensitive monitoring keys
    const sanitizedConfig = {
      ...validatedData,
      sentryDsn: undefined, // Remove from response
      logrocketAppId: undefined
    };
    // Process configuration securely
  }
);
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY MONITORING TESTING APPROACH!

// 1. ACCESSIBILITY SNAPSHOT ANALYSIS (GAME CHANGER!)
await mcp__playwright__browser_navigate({url: "http://localhost:3000/dashboard/monitoring"});
const accessibilityStructure = await mcp__playwright__browser_snapshot();
// Returns structured accessibility tree for monitoring UI - zero ambiguity!

// 2. MONITORING INTEGRATION TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000"});
// Trigger an error to test Sentry integration
await mcp__playwright__browser_evaluate({
  function: `() => { throw new Error('Test monitoring error'); }`
});
await mcp__playwright__browser_wait_for({text: "Error logged", timeout: 5000});

// 3. PERFORMANCE MONITORING VALIDATION
const performanceMetrics = await mcp__playwright__browser_evaluate({
  function: `() => ({
    LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
    FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
    monitoringOverhead: window.__MONITORING_OVERHEAD__ || 0,
    sentryLoaded: !!window.__SENTRY__,
    logrocketLoaded: !!window.LogRocket
  })`
});

// 4. MONITORING ERROR DETECTION
const consoleErrors = await mcp__playwright__browser_console_messages();
const monitoringErrors = consoleErrors.filter(msg => 
  msg.text().includes('sentry') || msg.text().includes('logrocket')
);

// 5. MONITORING NETWORK VALIDATION
const networkRequests = await mcp__playwright__browser_network_requests();
const monitoringRequests = networkRequests.filter(req => 
  req.url().includes('sentry.io') || req.url().includes('logrocket.com')
);
```

**REQUIRED TEST COVERAGE:**
- [ ] Sentry error capture working (validated with test error)
- [ ] LogRocket session recording active (verified in browser)
- [ ] Performance monitoring < 2% overhead (measured)
- [ ] Zero monitoring-related console errors
- [ ] All monitoring network requests successful (2xx responses)
- [ ] Monitoring UI accessible and functional

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All monitoring services configured and tested
- [ ] Sentry session replay working in development
- [ ] LogRocket recording sessions with 10% sampling
- [ ] Security scanning integrated into CI/CD pipeline
- [ ] Bundle analyzer generating reports
- [ ] Zero TypeScript errors in monitoring code
- [ ] Zero console errors from monitoring integrations

### Integration & Performance:
- [ ] Monitoring performance overhead < 2%
- [ ] All monitoring APIs responding < 200ms
- [ ] Accessibility validation passed for monitoring UI
- [ ] Security requirements met for all endpoints
- [ ] Works across all breakpoints (375px, 768px, 1920px)

### Evidence Package Required:
- [ ] Screenshot proof of Sentry dashboard with test errors
- [ ] LogRocket session recordings evidence
- [ ] Bundle analyzer report showing size impact
- [ ] Security scan results with zero critical issues
- [ ] Performance metrics showing minimal overhead

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Monitoring Config: `/wedsync/src/lib/monitoring/`
- API Endpoints: `/wedsync/src/app/api/monitoring/`
- Tests: `/wedsync/src/__tests__/monitoring/`
- Types: `/wedsync/src/types/monitoring.ts`
- Configuration: `/wedsync/sentry.client.config.js`, `/wedsync/sentry.server.config.js`

### ⚠️ DATABASE MIGRATIONS:
- CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-151.md`
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-a/batch11a/WS-151-round-1-complete.md`
- **Include:** Feature ID (WS-151) in all filenames
- **Save in:** batch11a folder for proper organization
- **After completion:** Run `./route-messages.sh`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT modify monitoring files assigned to other teams (causes conflicts)
- Do NOT skip security validation on monitoring endpoints
- Do NOT exceed 2% performance overhead with monitoring
- Do NOT expose sensitive monitoring credentials in client code
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] All monitoring services configured and tested
- [ ] Security validation implemented on all endpoints
- [ ] Performance impact measured and under 2%
- [ ] Dependencies provided to other teams
- [ ] Code committed with evidence
- [ ] Comprehensive monitoring report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY