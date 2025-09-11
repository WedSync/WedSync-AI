# TEAM C - ROUND 1: WS-293 - Technical Architecture Main Overview
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive external service monitoring and integration health tracking with webhook reliability and third-party API performance monitoring
**FEATURE ID:** WS-293 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about external service dependency management, circuit breaker patterns, and integration failure detection

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/monitoring/
cat $WS_ROOT/wedsync/src/lib/integrations/monitoring/external-health.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test integrations external monitoring
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

// Query existing integration and external service patterns
await mcp__serena__search_for_pattern("integration external service monitoring health");
await mcp__serena__find_symbol("ExternalServiceMonitor IntegrationHealth", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/integrations/");
```

### B. ANALYZE EXISTING INTEGRATION PATTERNS (MANDATORY)
```typescript
// CRITICAL: Understand existing external service and webhook infrastructure
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/integrations/webhook-processor.ts");
await mcp__serena__find_referencing_symbols("external service health check");
await mcp__serena__search_for_pattern("integration circuit breaker retry");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "Node.js circuit breaker pattern"
# - "External API health monitoring"
# - "Webhook reliability patterns"
# - "Service dependency management"
```

### D. SECURITY PATTERN ANALYSIS (MINUTES 5-10)
```typescript
// CRITICAL: Find existing security patterns for external integrations
await mcp__serena__find_symbol("webhookSecurity apiKeyValidator", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/security/webhook-security.ts");
await mcp__serena__search_for_pattern("external api authentication");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Integration-Specific Sequential Thinking Patterns

#### Pattern 1: External Service Integration Architecture Analysis
```typescript
// Before implementing external service monitoring
mcp__sequential-thinking__sequential_thinking({
  thought: "External service monitoring needs: Stripe payment API health checks, Supabase service status monitoring, Resend email delivery tracking, Twilio SMS service health, Google Calendar API monitoring, webhook endpoint reliability testing, third-party authentication provider status checks, CDN and static asset service monitoring. Each has different SLAs, authentication, and failure modes.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Integration reliability challenges: External APIs can have unpredictable downtimes, rate limits can be exceeded during peak wedding seasons, webhook deliveries can fail and need replay, authentication tokens can expire, network latency varies by geographic region. Need circuit breaker patterns, exponential backoff retry logic, fallback strategies, and real-time alerting.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding business dependency analysis: Stripe downtime blocks all subscription payments during peak season, email service failures prevent couple invitations and supplier notifications, SMS failures block critical wedding day communications, calendar integration failures disrupt supplier scheduling. Each service failure has different business impact levels requiring tiered alerting.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Create external service health checker with configurable timeouts, implement circuit breaker pattern with automatic recovery, build webhook reliability tracker with replay capabilities, add integration status dashboard for ops team, ensure graceful degradation when services are unavailable, comprehensive logging for integration debugging.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with Serena-enhanced capabilities:

1. **task-tracker-coordinator** - Break down external service monitoring components, track integration dependencies
2. **integration-specialist** - Use Serena to ensure monitoring patterns match existing webhook infrastructure
3. **security-compliance-officer** - Ensure all external service monitoring is secure and doesn't leak credentials
4. **code-quality-guardian** - Ensure integration patterns match existing external service architecture
5. **test-automation-architect** - Write comprehensive tests for service failure scenarios and circuit breaker logic
6. **documentation-chronicler** - Document integration health procedures and troubleshooting guides

## 🔒 CRITICAL: SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### EVERY EXTERNAL SERVICE INTEGRATION MUST HAVE:

1. **SECURE CREDENTIAL MANAGEMENT:**
```typescript
// ❌ NEVER DO THIS (CREDENTIALS EXPOSED!):
const stripeHealth = await fetch('https://api.stripe.com/health', {
  headers: { 'Authorization': 'Bearer sk_live_actual_key_here' } // DANGEROUS!
});

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
const getSecureCredentials = (service: string) => {
  const credentials = {
    stripe: {
      api_key: process.env.STRIPE_SECRET_KEY!,
      publishable_key: process.env.STRIPE_PUBLISHABLE_KEY!
    },
    resend: {
      api_key: process.env.RESEND_API_KEY!
    },
    twilio: {
      account_sid: process.env.TWILIO_ACCOUNT_SID!,
      auth_token: process.env.TWILIO_AUTH_TOKEN!
    }
  };
  
  if (!credentials[service]) {
    throw new Error(`Missing credentials for ${service}`);
  }
  
  return credentials[service];
};
```

2. **CIRCUIT BREAKER SECURITY:**
```typescript
// CRITICAL: Circuit breaker must not expose internal errors
export class SecureCircuitBreaker {
  async callExternalService(service: string, operation: () => Promise<any>) {
    try {
      return await this.executeWithBreaker(operation);
    } catch (error) {
      // Log detailed error internally
      this.logError(service, error);
      
      // Return sanitized error to client
      throw new Error(`External service temporarily unavailable`);
    }
  }
  
  private logError(service: string, error: any) {
    // Log with service identifier but sanitize credentials
    const sanitizedError = this.sanitizeError(error);
    console.error(`Service ${service} failed:`, sanitizedError);
  }
}
```

3. **WEBHOOK REPLAY SECURITY:**
```typescript
// MANDATORY: Secure webhook replay with idempotency
export class SecureWebhookReplay {
  async replayWebhook(webhookId: string, retryCount: number = 0) {
    // Verify admin permissions for webhook replay
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      throw new Error('Admin access required for webhook replay');
    }
    
    // Rate limit webhook replays
    if (retryCount > 5) {
      throw new Error('Maximum retry attempts exceeded');
    }
    
    // Process with original signature verification
    const webhook = await this.getWebhookWithSignature(webhookId);
    return await this.processWebhookSecurely(webhook);
  }
}
```

## 🎯 TECHNICAL SPECIFICATION: WS-293 INTEGRATION MONITORING

### **INTEGRATION MONITORING ENDPOINTS TO BUILD:**

#### 1. **External Service Health APIs**
```typescript
// GET /api/admin/integrations/health - All external service status
const integrationHealthSchema = z.object({
  service: z.enum(['stripe', 'resend', 'twilio', 'google_calendar', 'supabase']).optional(),
  detailed: z.boolean().default(false),
  include_history: z.boolean().default(false)
});

// POST /api/admin/integrations/test/:service - Test specific service
const serviceTestSchema = z.object({
  service: z.string().min(1),
  test_type: z.enum(['connectivity', 'authentication', 'functionality']),
  timeout_ms: z.number().min(1000).max(30000).default(5000)
});

// GET /api/admin/integrations/status - Integration status dashboard
const statusDashboardSchema = z.object({
  timeframe: z.enum(['1h', '24h', '7d']).default('24h'),
  include_metrics: z.boolean().default(true)
});
```

#### 2. **Webhook Monitoring APIs**
```typescript
// GET /api/admin/webhooks/health - Webhook delivery status
const webhookHealthSchema = z.object({
  webhook_type: z.enum(['stripe', 'resend', 'custom']).optional(),
  status: z.enum(['delivered', 'failed', 'retrying']).optional(),
  timeframe: z.enum(['1h', '24h', '7d']).default('24h')
});

// POST /api/admin/webhooks/replay/:id - Replay failed webhook
const webhookReplaySchema = z.object({
  webhook_id: z.string().uuid(),
  force_retry: z.boolean().default(false),
  max_retries: z.number().min(1).max(5).default(3)
});

// GET /api/admin/webhooks/failures - Failed webhook analysis
const failureAnalysisSchema = z.object({
  group_by: z.enum(['service', 'error_type', 'time']).default('service'),
  min_failure_count: z.number().min(1).default(1)
});
```

#### 3. **Circuit Breaker Management APIs**
```typescript
// GET /api/admin/circuit-breakers/status - Circuit breaker states
// POST /api/admin/circuit-breakers/reset/:service - Manual circuit reset
// GET /api/admin/circuit-breakers/metrics - Circuit breaker performance metrics
```

### **INTEGRATION SERVICE LAYER:**

#### 1. **ExternalServiceHealthMonitor Service**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/monitoring/external-health.ts
export class ExternalServiceHealthMonitor {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private healthCache: Map<string, HealthCheckResult> = new Map();
  
  async checkAllServices(): Promise<IntegrationHealthResponse> {
    const services = [
      'stripe',
      'resend', 
      'twilio',
      'google_calendar',
      'supabase_auth',
      'supabase_realtime'
    ];
    
    const healthChecks = await Promise.allSettled(
      services.map(async (service) => {
        const startTime = Date.now();
        try {
          const result = await this.checkServiceHealth(service);
          return {
            service,
            ...result,
            response_time: Date.now() - startTime
          };
        } catch (error) {
          return {
            service,
            status: 'critical' as const,
            error: error.message,
            response_time: Date.now() - startTime
          };
        }
      })
    );
    
    const results = healthChecks.map(result => 
      result.status === 'fulfilled' ? result.value : result.reason
    );
    
    // Calculate overall integration health
    const healthyCount = results.filter(r => r.status === 'healthy').length;
    const overallHealth = healthyCount / results.length;
    
    return {
      overall_status: overallHealth > 0.8 ? 'healthy' : 
                     overallHealth > 0.5 ? 'degraded' : 'critical',
      services: results,
      last_updated: new Date().toISOString(),
      healthy_services: healthyCount,
      total_services: results.length
    };
  }
  
  private async checkServiceHealth(service: string): Promise<ServiceHealthResult> {
    // Use circuit breaker for each service
    const breaker = this.getCircuitBreaker(service);
    
    return await breaker.execute(async () => {
      switch (service) {
        case 'stripe':
          return await this.checkStripeHealth();
        case 'resend':
          return await this.checkResendHealth();
        case 'twilio':
          return await this.checkTwilioHealth();
        case 'google_calendar':
          return await this.checkGoogleCalendarHealth();
        case 'supabase_auth':
          return await this.checkSupabaseAuthHealth();
        case 'supabase_realtime':
          return await this.checkSupabaseRealtimeHealth();
        default:
          throw new Error(`Unknown service: ${service}`);
      }
    });
  }
  
  private async checkStripeHealth(): Promise<ServiceHealthResult> {
    try {
      const credentials = getSecureCredentials('stripe');
      
      // Test Stripe API connectivity
      const response = await fetch('https://api.stripe.com/v1/balance', {
        headers: {
          'Authorization': `Bearer ${credentials.api_key}`,
          'User-Agent': 'WedSync-HealthCheck/1.0'
        },
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Stripe API returned ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        status: 'healthy',
        details: {
          api_version: response.headers.get('stripe-version'),
          account_available: data.available?.length > 0,
          last_check: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'critical',
        error: 'Stripe API unreachable',
        details: {
          error_type: error.name,
          last_check: new Date().toISOString()
        }
      };
    }
  }
  
  private async checkResendHealth(): Promise<ServiceHealthResult> {
    try {
      const credentials = getSecureCredentials('resend');
      
      // Test Resend API with a health check endpoint
      const response = await fetch('https://api.resend.com/domains', {
        headers: {
          'Authorization': `Bearer ${credentials.api_key}`,
          'User-Agent': 'WedSync-HealthCheck/1.0'
        },
        timeout: 5000
      });
      
      if (!response.ok) {
        throw new Error(`Resend API returned ${response.status}`);
      }
      
      const domains = await response.json();
      
      return {
        status: 'healthy',
        details: {
          domains_configured: domains.data?.length || 0,
          api_accessible: true,
          last_check: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        status: 'critical',
        error: 'Resend API unreachable',
        details: {
          error_type: error.name,
          last_check: new Date().toISOString()
        }
      };
    }
  }
  
  private getCircuitBreaker(service: string): CircuitBreaker {
    if (!this.circuitBreakers.has(service)) {
      const breaker = new CircuitBreaker(async () => {}, {
        timeout: 10000, // 10 seconds
        errorThresholdPercentage: 50, // Open circuit at 50% failure rate
        resetTimeout: 30000, // 30 seconds before trying again
        rollingCountTimeout: 10000, // 10 second rolling window
        rollingCountBuckets: 10
      });
      
      // Add event listeners for monitoring
      breaker.on('open', () => {
        console.warn(`Circuit breaker opened for ${service}`);
        this.notifyCircuitBreakerOpen(service);
      });
      
      breaker.on('halfOpen', () => {
        console.info(`Circuit breaker half-open for ${service}`);
      });
      
      breaker.on('close', () => {
        console.info(`Circuit breaker closed for ${service}`);
      });
      
      this.circuitBreakers.set(service, breaker);
    }
    
    return this.circuitBreakers.get(service)!;
  }
  
  private async notifyCircuitBreakerOpen(service: string): Promise<void> {
    // Send alert when circuit breaker opens
    await this.sendAlert({
      type: 'circuit_breaker_open',
      severity: 'critical',
      service,
      message: `Circuit breaker opened for ${service} - external service unavailable`,
      timestamp: new Date().toISOString()
    });
  }
}
```

#### 2. **WebhookReliabilityTracker Service**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/monitoring/webhook-reliability.ts
export class WebhookReliabilityTracker {
  private supabase = createClient();
  
  async trackWebhookDelivery(webhookData: WebhookDeliveryAttempt): Promise<void> {
    try {
      // Record webhook attempt
      const { error } = await this.supabase
        .from('webhook_delivery_log')
        .insert({
          webhook_id: webhookData.webhook_id,
          service: webhookData.service,
          endpoint: webhookData.endpoint,
          payload_size: JSON.stringify(webhookData.payload).length,
          attempt_number: webhookData.attempt_number,
          status: webhookData.success ? 'delivered' : 'failed',
          response_code: webhookData.response_code,
          response_time_ms: webhookData.response_time_ms,
          error_message: webhookData.error_message,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Update webhook reliability metrics
      await this.updateReliabilityMetrics(webhookData.service, webhookData.success);
      
      // Check if webhook needs retry
      if (!webhookData.success && webhookData.attempt_number < 3) {
        await this.scheduleWebhookRetry(webhookData);
      }
      
    } catch (error) {
      console.error('Failed to track webhook delivery:', error);
    }
  }
  
  async getWebhookReliabilityStats(timeframe: string = '24h'): Promise<WebhookReliabilityStats> {
    const hoursBack = timeframe === '1h' ? 1 : timeframe === '24h' ? 24 : 168; // 7d
    
    const { data: deliveryStats } = await this.supabase
      .from('webhook_delivery_log')
      .select('service, status, response_time_ms')
      .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString());
    
    if (!deliveryStats) {
      return {
        overall_success_rate: 0,
        services: {},
        total_deliveries: 0,
        failed_deliveries: 0
      };
    }
    
    const totalDeliveries = deliveryStats.length;
    const successfulDeliveries = deliveryStats.filter(d => d.status === 'delivered').length;
    
    // Group by service
    const serviceStats = deliveryStats.reduce((acc, delivery) => {
      const service = delivery.service;
      if (!acc[service]) {
        acc[service] = {
          total: 0,
          successful: 0,
          avg_response_time: 0,
          success_rate: 0
        };
      }
      
      acc[service].total++;
      if (delivery.status === 'delivered') {
        acc[service].successful++;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate success rates and average response times
    Object.keys(serviceStats).forEach(service => {
      const stats = serviceStats[service];
      stats.success_rate = stats.successful / stats.total;
      
      const serviceTimes = deliveryStats
        .filter(d => d.service === service && d.response_time_ms)
        .map(d => d.response_time_ms);
      
      stats.avg_response_time = serviceTimes.length > 0 
        ? serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length 
        : 0;
    });
    
    return {
      overall_success_rate: successfulDeliveries / totalDeliveries,
      services: serviceStats,
      total_deliveries: totalDeliveries,
      failed_deliveries: totalDeliveries - successfulDeliveries,
      timeframe
    };
  }
  
  async replayFailedWebhook(webhookId: string): Promise<WebhookReplayResult> {
    // Get original webhook data
    const { data: webhook } = await this.supabase
      .from('webhook_delivery_log')
      .select('*')
      .eq('webhook_id', webhookId)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (!webhook) {
      throw new Error('Webhook not found or not in failed state');
    }
    
    try {
      // Attempt webhook replay with original payload
      const result = await this.executeWebhookReplay(webhook);
      
      // Log replay attempt
      await this.trackWebhookDelivery({
        webhook_id: webhookId,
        service: webhook.service,
        endpoint: webhook.endpoint,
        payload: webhook.payload,
        attempt_number: webhook.attempt_number + 1,
        success: result.success,
        response_code: result.response_code,
        response_time_ms: result.response_time_ms,
        error_message: result.error_message
      });
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
        webhook_id: webhookId
      };
    }
  }
}
```

### **CIRCUIT BREAKER IMPLEMENTATION:**

```typescript
// Location: $WS_ROOT/wedsync/src/lib/integrations/monitoring/circuit-breaker.ts
export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime?: number;
  private successCount = 0;
  
  constructor(
    private operation: () => Promise<any>,
    private options: {
      failureThreshold: number;
      recoveryTimeout: number;
      monitoringWindow: number;
    } = {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitoringWindow: 60000  // 1 minute
    }
  ) {}
  
  async execute(): Promise<any> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime! < this.options.recoveryTimeout) {
        throw new Error('Circuit breaker is OPEN');
      }
      // Try to recover
      this.state = 'HALF_OPEN';
      this.successCount = 0;
    }
    
    try {
      const result = await this.operation();
      
      if (this.state === 'HALF_OPEN') {
        this.successCount++;
        if (this.successCount >= 2) { // Require 2 successes to close
          this.state = 'CLOSED';
          this.failureCount = 0;
        }
      } else if (this.state === 'CLOSED') {
        this.failureCount = Math.max(0, this.failureCount - 1); // Gradual recovery
      }
      
      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      
      if (this.failureCount >= this.options.failureThreshold) {
        this.state = 'OPEN';
      } else if (this.state === 'HALF_OPEN') {
        this.state = 'OPEN'; // Back to OPEN if half-open fails
      }
      
      throw error;
    }
  }
  
  getState(): string {
    return this.state;
  }
  
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
  }
}
```

## 🎭 TESTING REQUIREMENTS

### Integration Tests Required:
```typescript
describe('ExternalServiceHealthMonitor', () => {
  test('detects external service failures accurately', async () => {
    const monitor = new ExternalServiceHealthMonitor();
    
    // Mock Stripe API failure
    fetchMock.mockRejectOnce(new Error('Network error'));
    
    const health = await monitor.checkAllServices();
    
    const stripeService = health.services.find(s => s.service === 'stripe');
    expect(stripeService?.status).toBe('critical');
    expect(health.overall_status).toBe('degraded'); // Not all services failed
  });
  
  test('circuit breaker prevents cascading failures', async () => {
    const monitor = new ExternalServiceHealthMonitor();
    
    // Mock consistent failures to trigger circuit breaker
    fetchMock.mockReject(new Error('Service unavailable'));
    
    // Attempt multiple calls
    for (let i = 0; i < 6; i++) {
      try {
        await monitor.checkServiceHealth('stripe');
      } catch (error) {
        if (i >= 5) {
          expect(error.message).toContain('Circuit breaker is OPEN');
        }
      }
    }
  });
});

describe('WebhookReliabilityTracker', () => {
  test('tracks webhook delivery success rates correctly', async () => {
    const tracker = new WebhookReliabilityTracker();
    
    // Simulate webhook deliveries
    await tracker.trackWebhookDelivery({
      webhook_id: 'test-1',
      service: 'stripe',
      success: true,
      response_time_ms: 200
    });
    
    await tracker.trackWebhookDelivery({
      webhook_id: 'test-2', 
      service: 'stripe',
      success: false,
      error_message: 'Timeout'
    });
    
    const stats = await tracker.getWebhookReliabilityStats('1h');
    
    expect(stats.services.stripe.success_rate).toBe(0.5);
    expect(stats.total_deliveries).toBe(2);
  });
  
  test('replays failed webhooks with proper tracking', async () => {
    const tracker = new WebhookReliabilityTracker();
    
    // Mock successful replay
    fetchMock.mockResolveOnce({ ok: true, status: 200 });
    
    const result = await tracker.replayFailedWebhook('failed-webhook-123');
    
    expect(result.success).toBe(true);
    // Verify tracking was logged
  });
});
```

### Circuit Breaker Tests:
```typescript
describe('CircuitBreaker', () => {
  test('opens after threshold failures', async () => {
    let failureCount = 0;
    const operation = () => {
      failureCount++;
      if (failureCount <= 5) {
        throw new Error('Service failure');
      }
      return Promise.resolve('success');
    };
    
    const breaker = new CircuitBreaker(operation, { failureThreshold: 5 });
    
    // Cause 5 failures
    for (let i = 0; i < 5; i++) {
      await expect(breaker.execute()).rejects.toThrow('Service failure');
    }
    
    expect(breaker.getState()).toBe('OPEN');
    
    // Next call should be rejected by circuit breaker
    await expect(breaker.execute()).rejects.toThrow('Circuit breaker is OPEN');
  });
});
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] **External Service Health Monitor**: Stripe, Resend, Twilio, Google Calendar health checks
- [ ] **Circuit Breaker Implementation**: Automatic failure detection and recovery
- [ ] **Webhook Reliability Tracker**: Delivery success monitoring and replay capabilities
- [ ] **Integration Status Dashboard**: Real-time external service status for ops team
- [ ] **Security Implementation**: Credential management and secure error handling
- [ ] **Monitoring & Alerting**: Real-time integration failure notifications
- [ ] **Unit Tests**: >90% coverage for all integration monitoring logic
- [ ] **Integration Tests**: External service failure simulation and recovery testing

## 💾 WHERE TO SAVE YOUR WORK

- **Integration APIs**: `$WS_ROOT/wedsync/src/app/api/admin/integrations/`
- **Services**: `$WS_ROOT/wedsync/src/lib/integrations/monitoring/`
- **Types**: `$WS_ROOT/wedsync/src/types/integration-health.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/integrations/monitoring/`

## ⚠️ CRITICAL WARNINGS

- **NEVER expose external service credentials** - Use secure environment variables
- **Circuit breaker failures cannot block user experience** - Implement graceful degradation
- **Webhook replay requires admin permissions** - Security is critical
- **External service timeouts must be reasonable** - Don't block internal operations
- **Comprehensive error handling required** - Integration failures must not crash system

## 🏁 COMPLETION CHECKLIST

### Security Verification:
```bash
# Verify NO credentials in code
grep -r "api.*key.*=\|secret.*=" $WS_ROOT/wedsync/src/lib/integrations/
# Should return NOTHING (all should use env vars)

# Check circuit breaker security
grep -r "sanitizeError\|SecureCircuitBreaker" $WS_ROOT/wedsync/src/lib/integrations/
# Should show proper error sanitization

# Verify webhook replay security
grep -r "admin.*webhook.*replay" $WS_ROOT/wedsync/src/
# Should show admin-only access control
```

### Final Technical Checklist:
- [ ] All external service health checks implemented
- [ ] Circuit breakers prevent cascading failures
- [ ] Webhook reliability tracking and replay functional
- [ ] External service credentials secured in environment
- [ ] Error handling doesn't expose sensitive information
- [ ] Integration failures don't impact user experience
- [ ] TypeScript compiles with NO errors
- [ ] Tests pass including failure simulation scenarios

---

**EXECUTE IMMEDIATELY - Build bulletproof external service monitoring with comprehensive failure recovery!**