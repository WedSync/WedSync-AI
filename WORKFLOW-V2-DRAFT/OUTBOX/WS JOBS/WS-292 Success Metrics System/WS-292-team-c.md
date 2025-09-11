# TEAM C - ROUND 1: WS-292 - Success Metrics System
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive metrics integration system with external analytics platforms, webhook notifications, and data export capabilities
**FEATURE ID:** WS-292 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about data pipeline reliability, webhook security, and cross-platform analytics consistency

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/analytics/
cat $WS_ROOT/wedsync/src/lib/integrations/analytics/metrics-connector.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integrations analytics webhooks
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing integration patterns
await mcp__serena__search_for_pattern("integration webhook analytics external");
await mcp__serena__find_symbol("WebhookHandler IntegrationConnector", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
```

### B. ANALYZE EXISTING INTEGRATION PATTERNS (MANDATORY)
```typescript
// CRITICAL: Understand existing webhook and integration infrastructure
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/integrations/webhook-processor.ts");
await mcp__serena__find_referencing_symbols("external API integration");
await mcp__serena__search_for_pattern("webhook signature verification");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "Mixpanel JavaScript SDK integration"
# - "Google Analytics 4 custom events"
# - "Webhook signature verification Node.js"
# - "Slack webhook notifications payload"
```

### D. SECURITY PATTERN ANALYSIS (MINUTES 5-10)
```typescript
// CRITICAL: Find existing security patterns for webhooks
await mcp__serena__find_symbol("webhookSecurityValidator signatureVerification", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/security/webhook-security.ts");
await mcp__serena__search_for_pattern("rate limiting webhook");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: Analytics Integration Architecture Analysis
```typescript
// Before implementing analytics integrations
mcp__sequential-thinking__sequential_thinking({
  thought: "Analytics integration system needs: Mixpanel connector for detailed event tracking, Google Analytics 4 for web analytics, Slack webhook notifications for alert delivery, CSV/JSON export APIs for executive reporting, real-time data sync with external dashboards. Each has different authentication methods, rate limits, and data format requirements.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration reliability challenges: External APIs can fail, rate limits can be exceeded, data formats can change, webhook deliveries can be lost. Need circuit breaker patterns, retry mechanisms with exponential backoff, webhook replay capabilities, data transformation layers, and fallback strategies for each integration.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data consistency requirements: Metrics must be synchronized across all platforms, event timestamps need timezone handling, user identification requires mapping between systems, custom properties need validation and transformation. Duplicate prevention and idempotency are critical for accurate analytics.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use webhook queue system for reliable delivery, implement analytics event abstraction layer, create connector factory pattern for different platforms, add comprehensive monitoring and alerting, ensure webhook signature verification for security.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with Serena-enhanced capabilities:

1. **task-tracker-coordinator** - Break down integration endpoints, track external service dependencies
2. **integration-specialist** - Use Serena to ensure webhook patterns match existing infrastructure
3. **security-compliance-officer** - Ensure all webhook signatures are verified and integrations are secure
4. **code-quality-guardian** - Ensure integration patterns match existing connector architecture
5. **test-automation-architect** - Write comprehensive tests for webhook delivery and retry logic
6. **documentation-chronicler** - Document integration setup procedures and troubleshooting guides

## 🔒 CRITICAL: SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### EVERY WEBHOOK ENDPOINT MUST HAVE:

1. **SIGNATURE VERIFICATION:**
```typescript
// ❌ NEVER DO THIS (WEBHOOKS ARE ATTACK VECTORS!):
export async function POST(request: Request) {
  const payload = await request.json(); // NO SIGNATURE VERIFICATION!
  await processWebhookData(payload); // DANGEROUS!
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { verifyWebhookSignature } from '$WS_ROOT/wedsync/src/lib/security/webhook-security';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('x-signature') || '';
  
  // Verify webhook signature
  const isValid = verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET!);
  if (!isValid) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }
  
  // Process verified webhook safely
  const payload = JSON.parse(body);
  await processWebhookData(payload);
}
```

2. **RATE LIMITING AND IDEMPOTENCY:**
```typescript
// CRITICAL: Prevent webhook spam and duplicate processing
import { Ratelimit } from '@upstash/ratelimit';

const webhookRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute per IP
});

export async function POST(request: Request) {
  const clientIP = request.headers.get('cf-connecting-ip') || 'unknown';
  const { success } = await webhookRateLimit.limit(clientIP);
  
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  // Check for duplicate webhook using idempotency key
  const idempotencyKey = request.headers.get('idempotency-key');
  if (idempotencyKey && await isProcessedWebhook(idempotencyKey)) {
    return NextResponse.json({ status: 'already_processed' });
  }
  
  // Process webhook and mark as processed
  await processWebhookSafely(payload, idempotencyKey);
}
```

3. **SECURE EXTERNAL API CREDENTIALS:**
```typescript
// MANDATORY: Secure handling of external service credentials
const getSecureCredentials = (service: string) => {
  const credentials = {
    mixpanel: {
      token: process.env.MIXPANEL_PROJECT_TOKEN!,
      secret: process.env.MIXPANEL_API_SECRET!
    },
    google_analytics: {
      measurement_id: process.env.GA4_MEASUREMENT_ID!,
      api_secret: process.env.GA4_API_SECRET!
    },
    slack: {
      webhook_url: process.env.SLACK_WEBHOOK_URL!
    }
  };
  
  if (!credentials[service]) {
    throw new Error(`Missing credentials for ${service}`);
  }
  
  return credentials[service];
};
```

## 🎯 TECHNICAL SPECIFICATION: WS-292 METRICS INTEGRATIONS

### **INTEGRATION ENDPOINTS TO BUILD:**

#### 1. **External Analytics Webhooks**
```typescript
// POST /api/webhooks/analytics/mixpanel - Mixpanel event sync
const mixpanelWebhookSchema = z.object({
  event_type: z.enum(['track', 'people_set', 'people_increment']),
  distinct_id: z.string(),
  event: z.string(),
  properties: z.record(z.any()),
  timestamp: z.string().optional()
});

// POST /api/webhooks/analytics/ga4 - Google Analytics 4 events
const ga4WebhookSchema = z.object({
  client_id: z.string(),
  events: z.array(z.object({
    name: z.string(),
    params: z.record(z.any())
  }))
});
```

#### 2. **Data Export APIs**
```typescript
// GET /api/admin/metrics/export/csv - CSV export for Excel analysis
const csvExportSchema = z.object({
  metrics: z.array(z.string()),
  date_range: z.object({
    start: z.string().date(),
    end: z.string().date()
  }),
  format: z.enum(['csv', 'json', 'xlsx']).default('csv')
});

// GET /api/admin/metrics/export/dashboard - Dashboard data for external tools
const dashboardExportSchema = z.object({
  dashboard_type: z.enum(['executive', 'viral', 'engagement']),
  real_time: z.boolean().default(false)
});
```

#### 3. **Notification Webhooks**
```typescript
// POST /api/webhooks/notifications/slack - Slack alert delivery
// POST /api/webhooks/notifications/email - Email alert delivery
// POST /api/webhooks/notifications/custom - Custom webhook notifications
```

### **INTEGRATION SERVICE LAYER:**

#### 1. **AnalyticsConnector Service**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/analytics/analytics-connector.ts
export class AnalyticsConnector {
  private mixpanelClient: MixpanelClient;
  private ga4Client: GA4Client;
  private slackClient: SlackClient;
  
  constructor() {
    this.initializeConnectors();
  }
  
  async syncEventToAllPlatforms(event: AnalyticsEvent) {
    const results = await Promise.allSettled([
      this.sendToMixpanel(event),
      this.sendToGA4(event),
      this.logInternalAnalytics(event)
    ]);
    
    // Handle partial failures gracefully
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      await this.handleSyncFailures(event, failures);
    }
    
    return {
      success_count: results.filter(r => r.status === 'fulfilled').length,
      failure_count: failures.length,
      event_id: event.id
    };
  }
  
  private async sendToMixpanel(event: AnalyticsEvent) {
    const mixpanelEvent = this.transformToMixpanel(event);
    
    try {
      await this.mixpanelClient.track(mixpanelEvent.event, mixpanelEvent.properties);
    } catch (error) {
      // Queue for retry
      await this.queueForRetry('mixpanel', event, error);
      throw error;
    }
  }
  
  private async sendToGA4(event: AnalyticsEvent) {
    const ga4Event = this.transformToGA4(event);
    
    try {
      await this.ga4Client.gtag('event', ga4Event.event_name, ga4Event.parameters);
    } catch (error) {
      await this.queueForRetry('ga4', event, error);
      throw error;
    }
  }
  
  private transformToMixpanel(event: AnalyticsEvent): MixpanelEvent {
    return {
      event: event.event_name,
      properties: {
        distinct_id: event.user_id,
        ...event.properties,
        $source: 'wedsync',
        wedding_context: this.extractWeddingContext(event),
        user_type: event.user_type
      }
    };
  }
  
  private transformToGA4(event: AnalyticsEvent): GA4Event {
    return {
      event_name: event.event_name.toLowerCase().replace(/[^a-zA-Z0-9_]/g, '_'),
      parameters: {
        user_id: event.user_id,
        event_category: event.event_category,
        custom_parameter_1: event.properties?.custom_data,
        wedding_supplier_type: event.properties?.supplier_type
      }
    };
  }
}
```

#### 2. **WebhookDeliveryService**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/webhooks/delivery-service.ts
export class WebhookDeliveryService {
  private queue: Queue;
  
  async deliverWebhook(webhookUrl: string, payload: any, options: DeliveryOptions = {}) {
    const deliveryAttempt = {
      id: generateId(),
      webhook_url: webhookUrl,
      payload,
      attempt_count: 0,
      max_attempts: options.maxAttempts || 3,
      created_at: new Date(),
      status: 'pending'
    };
    
    return await this.executeDeliveryWithRetry(deliveryAttempt);
  }
  
  private async executeDeliveryWithRetry(attempt: DeliveryAttempt) {
    while (attempt.attempt_count < attempt.max_attempts) {
      try {
        attempt.attempt_count++;
        
        const response = await fetch(attempt.webhook_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WedSync-Webhooks/1.0',
            'X-Webhook-Signature': this.generateSignature(attempt.payload)
          },
          body: JSON.stringify(attempt.payload),
          timeout: 30000 // 30 second timeout
        });
        
        if (response.ok) {
          await this.logDeliverySuccess(attempt);
          return { success: true, attempt_id: attempt.id };
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
      } catch (error) {
        const isLastAttempt = attempt.attempt_count >= attempt.max_attempts;
        
        if (isLastAttempt) {
          await this.logDeliveryFailure(attempt, error);
          return { success: false, error: error.message, attempt_id: attempt.id };
        }
        
        // Exponential backoff: 2^attempt_count seconds
        const delayMs = Math.pow(2, attempt.attempt_count) * 1000;
        await this.delay(delayMs);
      }
    }
  }
  
  async handleSlackAlert(alert: MetricAlert, currentValue: number) {
    const slackPayload = {
      text: `🚨 Metrics Alert: ${alert.metric_name}`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: `${alert.severity.toUpperCase()} Alert: ${alert.metric_name}`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Current Value:* ${currentValue}`
            },
            {
              type: 'mrkdwn',
              text: `*Threshold:* ${alert.comparison} ${alert.threshold_value}`
            },
            {
              type: 'mrkdwn',
              text: `*Severity:* ${alert.severity}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:* ${new Date().toISOString()}`
            }
          ]
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: 'View Dashboard'
              },
              url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/metrics`
            }
          ]
        }
      ]
    };
    
    const credentials = getSecureCredentials('slack');
    return await this.deliverWebhook(credentials.webhook_url, slackPayload);
  }
}
```

#### 3. **MetricsExportService**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/export/metrics-export.ts
export class MetricsExportService {
  async exportToCSV(metrics: SuccessMetrics[], options: ExportOptions): Promise<string> {
    const headers = [
      'Date',
      'MRR',
      'MRR Growth Rate',
      'Total Users',
      'K-Factor',
      'Supplier DAU Rate',
      'Couple WAU Rate',
      'Page Load Time (ms)',
      'Uptime %'
    ];
    
    const rows = metrics.map(metric => [
      metric.date,
      metric.mrr.toFixed(2),
      (metric.mrr_growth_rate * 100).toFixed(2) + '%',
      metric.total_users,
      metric.k_factor.toFixed(3),
      (metric.supplier_dau_rate * 100).toFixed(2) + '%',
      (metric.couple_wau_rate * 100).toFixed(2) + '%',
      metric.avg_page_load_time_ms,
      (metric.uptime_percentage * 100).toFixed(3) + '%'
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    // Add executive summary at the top
    const summary = this.generateExecutiveSummary(metrics);
    return `# WedSync Success Metrics Export\n# Generated: ${new Date().toISOString()}\n# ${summary}\n\n${csvContent}`;
  }
  
  async exportDashboardData(dashboardType: string): Promise<DashboardExport> {
    const baseMetrics = await this.getLatestMetrics();
    
    switch (dashboardType) {
      case 'executive':
        return {
          kpis: this.extractExecutiveKPIs(baseMetrics),
          charts: this.generateExecutiveCharts(baseMetrics),
          alerts: await this.getActiveAlerts()
        };
        
      case 'viral':
        return {
          k_factor_trend: await this.getKFactorTrend(),
          invitation_funnel: await this.getInvitationFunnel(),
          network_growth: await this.getNetworkGrowth()
        };
        
      case 'engagement':
        return {
          user_activity: await this.getUserActivityMetrics(),
          feature_adoption: await this.getFeatureAdoption(),
          cohort_analysis: await this.getCohortData()
        };
        
      default:
        throw new Error(`Unknown dashboard type: ${dashboardType}`);
    }
  }
}
```

## 🎭 TESTING REQUIREMENTS

### Integration Tests Required:
```typescript
describe('AnalyticsConnector', () => {
  test('syncs events to all platforms with failure handling', async () => {
    const connector = new AnalyticsConnector();
    
    // Mock one service to fail
    jest.spyOn(connector, 'sendToMixpanel').mockRejectedValueOnce(new Error('API Error'));
    jest.spyOn(connector, 'sendToGA4').mockResolvedValueOnce(true);
    
    const result = await connector.syncEventToAllPlatforms(testEvent);
    
    expect(result.success_count).toBe(2); // Internal + GA4
    expect(result.failure_count).toBe(1); // Mixpanel failed
  });
  
  test('transforms events correctly for each platform', async () => {
    const connector = new AnalyticsConnector();
    
    const mixpanelEvent = connector.transformToMixpanel(testEvent);
    expect(mixpanelEvent.properties.distinct_id).toBe(testEvent.user_id);
    expect(mixpanelEvent.properties.wedding_context).toBeDefined();
    
    const ga4Event = connector.transformToGA4(testEvent);
    expect(ga4Event.event_name).toMatch(/^[a-zA-Z0-9_]+$/); // Valid GA4 format
  });
});

describe('WebhookDeliveryService', () => {
  test('retries failed webhooks with exponential backoff', async () => {
    const deliveryService = new WebhookDeliveryService();
    
    // Mock failed responses then success
    fetchMock
      .mockRejectOnce(new Error('Network error'))
      .mockRejectOnce(new Error('Network error'))
      .mockResolveOnce({ ok: true });
    
    const result = await deliveryService.deliverWebhook('https://test.com', testPayload);
    
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3); // 2 failures + 1 success
  });
  
  test('generates correct Slack alert format', async () => {
    const deliveryService = new WebhookDeliveryService();
    
    await deliveryService.handleSlackAlert(testAlert, 1.2);
    
    const slackPayload = fetchMock.mock.calls[0][1].body;
    const parsedPayload = JSON.parse(slackPayload);
    
    expect(parsedPayload.blocks).toBeDefined();
    expect(parsedPayload.text).toContain('Metrics Alert');
  });
});
```

### End-to-End Tests:
```typescript
// Test complete integration flow
test('metrics flow from event to external platforms', async () => {
  // Track an event
  await trackUserEvent('user-123', 'first_form_created');
  
  // Verify event reaches all platforms
  await waitFor(() => {
    expect(mixpanelSpy).toHaveBeenCalledWith('first_form_created', expect.any(Object));
    expect(ga4Spy).toHaveBeenCalledWith('event', 'first_form_created', expect.any(Object));
  });
  
  // Verify metrics are calculated
  const metrics = await getLatestMetrics();
  expect(metrics.total_events).toBeGreaterThan(0);
});
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] **Analytics Connectors**: Mixpanel, Google Analytics 4, internal tracking
- [ ] **Webhook Delivery System**: Reliable delivery with retry and exponential backoff
- [ ] **Data Export APIs**: CSV, JSON, Excel formats for executive reporting
- [ ] **Notification Integrations**: Slack alerts, email notifications, custom webhooks
- [ ] **Security Implementation**: Signature verification, rate limiting, credential management
- [ ] **Monitoring & Logging**: Integration health monitoring, delivery tracking
- [ ] **Unit Tests**: >90% coverage for all integration logic
- [ ] **Error Handling**: Circuit breakers, fallback strategies, graceful degradation

## 💾 WHERE TO SAVE YOUR WORK

- **Integration APIs**: `$WS_ROOT/wedsync/src/app/api/webhooks/analytics/`
- **Services**: `$WS_ROOT/wedsync/src/lib/integrations/analytics/`
- **Export APIs**: `$WS_ROOT/wedsync/src/app/api/admin/metrics/export/`
- **Types**: `$WS_ROOT/wedsync/src/types/integrations.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/integrations/analytics/`

## ⚠️ CRITICAL WARNINGS

- **NEVER trust external webhook data** - Always verify signatures
- **ALL credentials must be environment variables** - No hardcoded API keys
- **Webhook failures cannot block user experience** - Use async processing
- **Data transformations must preserve privacy** - No PII in external platforms
- **Rate limiting required** - Prevent integration abuse

## 🏁 COMPLETION CHECKLIST

### Security Verification:
```bash
# Verify ALL webhook endpoints verify signatures
grep -r "verifyWebhookSignature" $WS_ROOT/wedsync/src/app/api/webhooks/
# Should show signature verification on EVERY webhook route

# Check for exposed credentials (FORBIDDEN!)
grep -r "api.*key.*=" $WS_ROOT/wedsync/src/lib/integrations/
# Should return NOTHING (all should use env vars)

# Verify rate limiting
grep -r "Ratelimit" $WS_ROOT/wedsync/src/app/api/webhooks/
# Should show rate limiting on webhook endpoints
```

### Final Technical Checklist:
- [ ] All webhook endpoints verify signatures
- [ ] External API credentials secured in environment variables
- [ ] Retry logic implemented with exponential backoff
- [ ] Data transformations maintain user privacy
- [ ] Integration health monitoring in place
- [ ] Error handling doesn't expose sensitive information
- [ ] TypeScript compiles with NO errors
- [ ] Tests pass including integration failure scenarios

---

**EXECUTE IMMEDIATELY - Build bulletproof analytics integration pipeline with comprehensive error recovery!**