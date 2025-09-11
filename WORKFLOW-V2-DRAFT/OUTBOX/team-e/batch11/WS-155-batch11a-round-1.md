# TEAM E - ROUND 1: WS-155 - Automated Monitoring, Alerting & Integration Hub
## 2025-01-25 - Round 1 (Security & Monitoring Focus)

**YOUR MISSION:** Set up automated health checks, smart alerting system, and integrate all monitoring services
**FEATURE ID:** WS-155 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about preventing wedding disasters through intelligent, context-aware alerting

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier with 15 couples getting married this weekend
**I want to:** Receive immediate, context-aware alerts when system issues could impact weddings
**So that:** I can resolve problems before they affect couples during their most important moments

**Real Wedding Problem This Solves:**
Traditional monitoring sends hundreds of generic alerts. This smart system prioritizes based on wedding context: if errors spike at 2 PM on a Saturday when 3 weddings start in 4 hours, that's CRITICAL and triggers phone calls. But the same error rate on Tuesday night is just an email. The system integrates all monitoring sources and routes alerts through appropriate channels based on wedding urgency.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
- Automated health checks running every 5 minutes
- Wedding-context-aware alert priority system
- Multi-channel alerts (Slack, Email, SMS, Phone)
- Integration hub connecting all monitoring services
- Uptime monitoring configuration
- Smart alert routing based on wedding dates and severity

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Alerts: Slack API, Twilio SMS, Email services
- Monitoring Integration: Sentry ↔ LogRocket ↔ Performance APIs

**Integration Points:**
- Health Check System: Automated system health validation
- Alert Manager: Multi-channel alert routing with wedding context
- Service Integration Hub: Connect Sentry, LogRocket, Performance APIs
- Uptime Monitoring: External monitoring configuration
- Wedding Context Engine: Priority alerts based on wedding proximity

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
// For ALL SaaS monitoring features (General SaaS components):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. CONTEXT7 MCP - Load latest docs for alerting and integration:
await mcp__context7__resolve-library-id("next.js");
await mcp__context7__get-library-docs("/vercel/next.js", "cron-jobs api-routes webhooks", 5000);
await mcp__context7__get-library-docs("/twilio/twilio-node", "sms-api notifications", 4000);
await mcp__context7__get-library-docs("/slackapi/node-slack-sdk", "webhooks messaging", 4000);
await mcp__context7__get-library-docs("/nodemailer/nodemailer", "email-automation templates", 3000);
await mcp__context7__get-library-docs("/getsentry/sentry-javascript", "integrations webhooks", 3000);

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing alert and integration patterns:
await mcp__serena__search_for_pattern("alert notification webhook cron");
await mcp__serena__find_symbol("cron", "/src/app/api", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
await mcp__serena__find_referencing_symbols("notification email sms");
```

**WHY THIS ORDER MATTERS:**
- Context7 provides latest Next.js cron and notification API patterns
- Serena shows existing integration and notification patterns
- Agents work with current knowledge for comprehensive alert system

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

**NOW that you have current docs, launch agents with specific knowledge:**

1. **task-tracker-coordinator** --think-hard --with-context7-docs "Build automated monitoring and alerting system"
2. **integration-specialist** --think-hard --use-loaded-docs "Connect all monitoring services with smart routing"
3. **api-architect** --think-ultra-hard --follow-existing-patterns "Design health check and alert APIs" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices "Secure alert endpoints and integrations"
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs "Test automated health checks and alerts"
6. **performance-optimization-expert** --accessibility-first --multi-tab "Optimize alert system performance"

**AGENT INSTRUCTIONS:** "Use the Context7 docs loaded in Step 1. Follow Serena patterns for integration architecture."

**AGENT USAGE TARGET:** >75% of session time in parallel execution

---

## 📋 STEP 3: DEVELOPMENT WORKFLOW (With loaded docs + agents)

### **EXPLORE PHASE (NO CODING!)**
- Read ALL existing integration and notification files first
- Understand current API structure and webhook patterns
- Check existing cron job and automated task implementations
- Review similar alert system implementations
- Continue until you FULLY understand the integration architecture

### **PLAN PHASE (THINK HARD!)**
- Create detailed alert system integration plan
- Write alert tests FIRST (TDD)
- Plan wedding context priority algorithm
- Consider alert fatigue prevention and escalation rules
- Don't rush - proper alert system design prevents critical issues from being missed

### **CODE PHASE (PARALLEL AGENTS!)**
- Create automated health check cron jobs
- Build smart alert manager with wedding context
- Implement multi-channel notification system
- Set up service integration hub
- Focus on reliability and intelligent alert routing

### **COMMIT PHASE (VERIFY EVERYTHING!)**
- Run all alert system integration tests
- Verify with Playwright that alerts fire correctly
- Create alert system evidence package
- Generate integration reports
- Only mark complete when alerting is ACTUALLY working

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Alert & Integration System):
- [ ] Automated health check system at `/api/cron/health-check/route.ts`
- [ ] Alert manager class at `/lib/monitoring/alerts.ts`
- [ ] Integration hub at `/lib/monitoring/integration-hub.ts`
- [ ] Multi-channel alert routing (Slack, Email, SMS)
- [ ] Wedding context priority system
- [ ] Uptime monitoring configuration
- [ ] Unit tests with >80% coverage for alert system
- [ ] Basic Playwright tests validating alert functionality

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Sentry and monitoring service configuration - Required for alert data sources
- FROM Team D: Database performance metrics - Dependency for health check data

### What other teams NEED from you:
- TO Team B: Health check status - They need this for dashboard health indicators
- TO Team C: Alert configuration UI - Required for admin alert management interface

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### 🚨 CRITICAL SECURITY LEARNINGS FROM PRODUCTION AUDIT

**MAJOR DISCOVERY:** Dev teams have been creating API routes with ZERO security validation. 305+ unprotected endpoints were found. This MUST stop immediately.

### MANDATORY SECURITY IMPLEMENTATION FOR ALERT SYSTEM

**ALL alert and health check endpoints MUST enforce strict security:**

```typescript
// ❌ NEVER DO THIS (FOUND IN ALERT ROUTES):
export async function POST(request: Request) {
  const alertData = await request.json(); // NO VALIDATION!
  await sendAlert(alertData); // DIRECT ALERT SENDING!
  return NextResponse.json({success: true});
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { alertConfigSchema } from '@/lib/validation/schemas';
import { getServerSession } from 'next-auth';

export const POST = withSecureValidation(
  alertConfigSchema, // Validate alert configuration
  async (request: NextRequest, validatedData) => {
    // MANDATORY: Admin-only access for alert configuration
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Validate and sanitize alert data
    const sanitizedAlertData = sanitizeAlertConfiguration(validatedData);
    await processAlert(sanitizedAlertData, session.user);
    
    return NextResponse.json({ success: true });
  }
);
```

### SECURITY CHECKLIST FOR ALERT SYSTEM

Teams MUST implement ALL of these for alert and health check features:

- [ ] **Admin Access Control**: Alert configuration restricted to admin users
- [ ] **Input Validation**: MANDATORY Zod schemas for all alert configurations
- [ ] **Webhook Security**: Verify webhook signatures from external services
- [ ] **Rate Limiting**: Prevent alert endpoint abuse and spam
- [ ] **Credential Protection**: Never expose API keys for SMS, email, or Slack
- [ ] **Alert Content Sanitization**: Sanitize alert messages to prevent injection
- [ ] **Audit Logging**: Log all alert configurations and system health events
- [ ] **Environment Security**: Store all alert service credentials securely

### ALERT SYSTEM SPECIFIC SECURITY PATTERNS

**1. Health Check Cron Security:**
```typescript
import { NextRequest } from 'next/server';
import { headers } from 'next/headers';

export async function GET(request: NextRequest) {
  // SECURITY: Verify cron request is from Vercel
  const cronSecret = headers().get('authorization');
  if (cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  try {
    // Perform health checks securely
    const healthStatus = await performSecureHealthChecks();
    
    // SECURITY: Sanitize health data before logging/alerting
    const sanitizedStatus = sanitizeHealthCheckData(healthStatus);
    
    // Log health check results securely
    await auditLogger.log({
      action: 'health_check_completed',
      status: sanitizedStatus.overall_status,
      timestamp: new Date(),
      source: 'cron'
    });
    
    return NextResponse.json({ status: 'success', data: sanitizedStatus });
  } catch (error) {
    // SECURITY: Don't expose internal errors in cron responses
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
```

**2. Alert Manager Security:**
```typescript
export class SecureAlertManager {
  async sendAlert(alertData: AlertConfiguration, context: WeddingContext) {
    // SECURITY: Validate alert data before processing
    const validatedAlert = alertConfigSchema.parse(alertData);
    
    // SECURITY: Sanitize alert content to prevent injection
    const sanitizedContent = sanitizeAlertContent(validatedAlert.message);
    
    // SECURITY: Rate limiting to prevent alert spam
    const rateLimitKey = `alert_${context.userId}_${context.alertType}`;
    const rateLimited = await rateLimitService.checkRateLimit(rateLimitKey, {
      max: 10, // Max 10 alerts per hour per user/type
      windowMs: 3600000
    });
    
    if (!rateLimited.allowed) {
      throw new Error('Alert rate limit exceeded');
    }
    
    // SECURITY: Use environment variables for API keys
    const alertChannels = {
      slack: process.env.SLACK_WEBHOOK_URL,
      sms: process.env.TWILIO_AUTH_TOKEN,
      email: process.env.EMAIL_API_KEY
    };
    
    // Send alert through appropriate channels
    await this.routeAlert(sanitizedContent, alertChannels, context);
  }
}
```

**3. Webhook Integration Security:**
```typescript
export async function POST(request: NextRequest) {
  // SECURITY: Verify webhook signature (example for Sentry)
  const signature = request.headers.get('sentry-hook-signature');
  const secret = process.env.SENTRY_WEBHOOK_SECRET;
  
  if (!signature || !secret) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }
  
  const body = await request.text();
  const expectedSignature = createHmac('sha256', secret).update(body).digest('hex');
  
  if (signature !== expectedSignature) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Process verified webhook data
  const webhookData = JSON.parse(body);
  await processSecureWebhook(webhookData);
  
  return NextResponse.json({ received: true });
}
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

**🧠 ACCESSIBILITY-FIRST VALIDATION (Not Screenshot Guessing!):**

```javascript
// REVOLUTIONARY ALERT SYSTEM TESTING APPROACH!

// 1. AUTOMATED HEALTH CHECK TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000"});

// Trigger health check manually for testing
const healthCheckResponse = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const response = await fetch('/api/cron/health-check', {
      headers: {
        'Authorization': 'Bearer ' + process.env.CRON_SECRET
      }
    });
    return {
      status: response.status,
      data: await response.json(),
      responseTime: performance.now() - startTime
    };
  }`
});

// Verify health check completes quickly
if (healthCheckResponse.responseTime > 5000) {
  throw new Error(`Health check too slow: ${healthCheckResponse.responseTime}ms`);
}

// 2. ALERT SYSTEM INTEGRATION TESTING
// Test Slack alert integration
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Simulate critical error that should trigger alert
    const alertData = {
      severity: 'critical',
      message: 'Test wedding impact alert',
      weddingContext: {
        weddingDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
        couplesAffected: 1,
        suppliersInvolved: ['photographer', 'caterer']
      }
    };
    
    const alertResponse = await fetch('/api/alerts/trigger', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('admin-token')
      },
      body: JSON.stringify(alertData)
    });
    
    return {
      status: alertResponse.status,
      alertSent: alertResponse.ok,
      channels: ['slack', 'sms', 'email'] // Expected channels for critical + wedding context
    };
  }`
});

// 3. MULTI-CHANNEL ALERT VALIDATION
// Test alert routing based on severity and wedding context
const alertScenarios = [
  { severity: 'low', weddingContext: null, expectedChannels: ['slack'] },
  { severity: 'high', weddingContext: null, expectedChannels: ['slack', 'email'] },
  { severity: 'critical', weddingContext: { hoursUntilWedding: 2 }, expectedChannels: ['slack', 'email', 'sms', 'phone'] }
];

for (const scenario of alertScenarios) {
  await mcp__playwright__browser_evaluate({
    function: `async (scenario) => {
      const response = await fetch('/api/alerts/test-routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scenario)
      });
      
      const result = await response.json();
      return {
        scenario: scenario.severity,
        expectedChannels: scenario.expectedChannels,
        actualChannels: result.channels,
        matched: JSON.stringify(scenario.expectedChannels.sort()) === JSON.stringify(result.channels.sort())
      };
    }`,
    args: [scenario]
  });
}

// 4. SERVICE INTEGRATION HUB TESTING
await mcp__playwright__browser_navigate({url: "http://localhost:3000/admin/monitoring"});

// Test integration status display
await mcp__playwright__browser_wait_for({text: "Service Integrations", timeout: 5000});

const integrationStatus = await mcp__playwright__browser_evaluate({
  function: `() => ({
    sentry: window.__INTEGRATIONS__?.sentry?.connected || false,
    logRocket: window.__INTEGRATIONS__?.logRocket?.connected || false,
    slack: window.__INTEGRATIONS__?.slack?.connected || false,
    twilio: window.__INTEGRATIONS__?.twilio?.connected || false,
    email: window.__INTEGRATIONS__?.email?.connected || false
  })`
});

// 5. WEDDING CONTEXT PRIORITY TESTING
await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Test wedding priority algorithm
    const testCases = [
      { weddingDate: new Date(Date.now() + 1 * 60 * 60 * 1000), expected: 'CRITICAL' }, // 1 hour
      { weddingDate: new Date(Date.now() + 24 * 60 * 60 * 1000), expected: 'HIGH' },    // 24 hours
      { weddingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), expected: 'MEDIUM' }, // 7 days
      { weddingDate: null, expected: 'LOW' }  // No wedding context
    ];
    
    const results = [];
    for (const testCase of testCases) {
      const priority = await fetch('/api/alerts/calculate-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase)
      }).then(r => r.json());
      
      results.push({
        input: testCase,
        expected: testCase.expected,
        actual: priority.level,
        correct: priority.level === testCase.expected
      });
    }
    return results;
  }`
});
```

**REQUIRED TEST COVERAGE:**
- [ ] Automated health checks running every 5 minutes
- [ ] Alert routing working based on severity and wedding context
- [ ] Multi-channel alerts (Slack, Email, SMS) functioning
- [ ] Service integration hub connecting all monitoring sources
- [ ] Wedding priority algorithm correctly prioritizing alerts
- [ ] Rate limiting preventing alert spam
- [ ] Webhook security validating signatures

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] Automated health checks running reliably every 5 minutes
- [ ] Alert manager routing alerts based on wedding context and severity
- [ ] Multi-channel alert system functional (Slack, Email, SMS tested)
- [ ] Integration hub connecting Sentry, LogRocket, and performance APIs
- [ ] Wedding context priority system working correctly
- [ ] Zero TypeScript errors in alert system code
- [ ] Zero failures in health check automation

### Integration & Performance:
- [ ] Health checks completing in < 5 seconds
- [ ] Alert routing responding in < 1 second
- [ ] Service integrations stable and reliable
- [ ] Alert rate limiting preventing spam
- [ ] Security requirements met for all alert endpoints
- [ ] Uptime monitoring configuration active

### Evidence Package Required:
- [ ] Screenshot proof of alerts firing in Slack/Email
- [ ] Health check automation logs showing 5-minute intervals
- [ ] Integration hub status showing all services connected
- [ ] Wedding context priority examples with different scenarios
- [ ] Security validation evidence (webhook signature verification)

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Health Checks: `/wedsync/src/app/api/cron/health-check/route.ts`
- Alert Manager: `/wedsync/src/lib/monitoring/alerts.ts`
- Integration Hub: `/wedsync/src/lib/monitoring/integration-hub.ts`
- Webhook Routes: `/wedsync/src/app/api/webhooks/monitoring/route.ts`
- Tests: `/wedsync/src/__tests__/monitoring/alerts-integration.test.ts`
- Types: `/wedsync/src/types/alert-system.ts`

### ⚠️ DATABASE MIGRATIONS:
- If needed, CREATE migration files in `/wedsync/supabase/migrations/`
- DO NOT run migrations yourself
- SEND to SQL Expert: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-155.md`
- SQL Expert will handle application and conflict resolution

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch11a/WS-155-round-1-complete.md`
- **Include:** Feature ID (WS-155) in all filenames
- **Save in:** batch11a folder for proper organization
- **After completion:** Run `./route-messages.sh`

---

## ⚠️ CRITICAL WARNINGS
- Do NOT expose alert service API keys in client code or responses
- Do NOT skip webhook signature verification - all webhooks must be validated
- Do NOT create alert spam - implement proper rate limiting
- Do NOT send alerts without wedding context prioritization
- REMEMBER: All 5 teams work in PARALLEL - no overlapping features
- WAIT: Do not start next round until ALL teams complete current round

## 🏁 ROUND COMPLETION CHECKLIST
- [ ] Automated health check system running every 5 minutes
- [ ] Alert manager with wedding context priority working
- [ ] Multi-channel alert routing functional and tested
- [ ] Service integration hub connecting all monitoring sources
- [ ] Dependencies provided to other teams (health status, alert configs)
- [ ] Code committed with evidence
- [ ] Comprehensive alert system integration report created

---

END OF ROUND PROMPT - EXECUTE IMMEDIATELY