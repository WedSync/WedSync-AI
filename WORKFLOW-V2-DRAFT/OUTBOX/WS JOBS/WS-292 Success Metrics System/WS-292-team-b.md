# TEAM B - ROUND 1: WS-292 - Success Metrics System
## 2025-01-25 - Development Round 1

**YOUR MISSION:** Build comprehensive metrics calculation engine with real-time KPI tracking, viral coefficient algorithms, and automated alert systems
**FEATURE ID:** WS-292 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about data accuracy, statistical calculations, and high-performance analytics processing

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/metrics/
cat $WS_ROOT/wedsync/src/lib/metrics/success-tracker.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test metrics analytics
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

// Query existing analytics and metrics patterns
await mcp__serena__search_for_pattern("analytics metrics calculation tracking");
await mcp__serena__find_symbol("MetricsService AnalyticsTracker", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/analytics/");
```

### B. ANALYZE EXISTING BACKEND PATTERNS (MANDATORY)
```typescript
// CRITICAL: Understand existing analytics infrastructure
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/analytics/tracking.ts");
await mcp__serena__find_referencing_symbols("analytics database");
await mcp__serena__search_for_pattern("metrics calculation algorithm");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
# Use Ref MCP to search for:
# - "Node.js analytics calculation patterns"
# - "Supabase real-time subscriptions analytics"
# - "PostgreSQL analytics queries optimization"
# - "Statistical calculation algorithms JavaScript"
```

### D. SECURITY PATTERN ANALYSIS (MINUTES 5-10)
```typescript
// CRITICAL: Find existing security patterns
await mcp__serena__find_symbol("withSecureValidation secureAnalyticsSchema", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Backend-Specific Sequential Thinking Patterns

#### Pattern 1: Analytics Architecture & Performance Analysis
```typescript
// Before implementing metrics calculation engine
mcp__sequential-thinking__sequential_thinking({
  thought: "Metrics system needs: POST /api/metrics/track (event ingestion), GET /api/metrics/overview (KPI dashboard), GET /api/metrics/viral-coefficient (K-factor calculation), GET /api/metrics/cohort-analysis (retention tracking), GET /api/metrics/alerts (threshold monitoring). Each handles different data volumes and calculation complexities with varying performance requirements.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance complexity analysis: Event tracking handles high volume writes (>1000 events/minute), KPI calculations require complex aggregations across multiple tables, viral coefficient needs network analysis algorithms, cohort analysis involves time-series calculations. All need caching strategies, database optimization, and real-time update mechanisms.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Statistical accuracy requirements: MRR calculations must handle prorations and cancellations correctly, K-factor needs precise invitation tracking and conversion attribution, retention rates require cohort-based calculations, churn prediction needs trend analysis. All calculations must be reproducible and auditable for business decisions.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Use withSecureValidation for all admin-only metrics endpoints, implement Redis caching for expensive calculations, create scheduled jobs for daily metric updates, build alert evaluation engine with configurable thresholds, ensure database transaction integrity for metric updates.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with Serena-enhanced capabilities:

1. **task-tracker-coordinator** - Break down metrics API endpoints, track database calculation dependencies
2. **supabase-specialist** - Use Serena to optimize metrics database queries and RLS policies
3. **security-compliance-officer** - Ensure all metrics APIs have proper admin-only validation
4. **code-quality-guardian** - Ensure API patterns match existing analytics infrastructure
5. **test-automation-architect** - Write comprehensive tests for statistical calculations
6. **documentation-chronicler** - Document metrics calculation algorithms and business logic

## 🔒 CRITICAL: SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### EVERY API ROUTE MUST HAVE:

1. **ADMIN-ONLY ACCESS WITH ZOD:**
```typescript
// ❌ NEVER DO THIS (METRICS ARE SENSITIVE!):
export async function GET(request: Request) {
  const metrics = await calculateBusinessMetrics(); // NO AUTH CHECK!
  return NextResponse.json(metrics);
}

// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { metricsSchema } from '$WS_ROOT/wedsync/src/lib/validation/schemas';

const metricsQuerySchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d', '1y']),
  segment: z.string().optional(),
  include_sensitive: z.boolean().default(false)
});

export const GET = withSecureValidation(
  metricsQuerySchema,
  async (request, validatedData) => {
    // Verify admin access
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // All metrics data is now validated and access-controlled
  }
);
```

2. **RATE LIMITING ON METRICS ENDPOINTS:**
```typescript
// CRITICAL: Prevent metrics API abuse
import { Ratelimit } from '@upstash/ratelimit';

const metricsRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
});

export async function GET(request: Request) {
  const { success } = await metricsRateLimit.limit(session.user.id);
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  // Process metrics request
}
```

3. **DATA AGGREGATION ONLY (NEVER RAW USER DATA):**
```typescript
// MANDATORY: Only return aggregated, anonymized metrics
const sensitiveDataFilter = (metrics: any) => {
  // Remove any potentially identifying information
  delete metrics.individual_user_data;
  delete metrics.specific_client_names;
  delete metrics.payment_details;
  
  return {
    total_users: metrics.user_count,
    conversion_rate: metrics.conversion_rate,
    revenue_aggregate: metrics.total_revenue,
    // Only aggregated business metrics
  };
};
```

## 🎯 TECHNICAL SPECIFICATION: WS-292 SUCCESS METRICS

### **API ENDPOINTS TO BUILD:**

#### 1. **Metrics Overview APIs**
```typescript
// GET /api/admin/metrics/overview - Executive dashboard KPIs
const overviewSchema = z.object({
  timeframe: z.enum(['7d', '30d', '90d', '1y']),
  compare_previous: z.boolean().default(true)
});

// GET /api/admin/metrics/viral-coefficient - K-factor tracking
const viralSchema = z.object({
  period: z.string(),
  breakdown_by_source: z.boolean().default(false)
});

// GET /api/admin/metrics/engagement - User activity analytics
const engagementSchema = z.object({
  user_type: z.enum(['supplier', 'couple', 'all']).default('all'),
  include_feature_breakdown: z.boolean().default(true)
});
```

#### 2. **Event Tracking APIs**
```typescript
// POST /api/metrics/track - Event ingestion endpoint
const trackingSchema = z.object({
  user_id: z.string().uuid(),
  event_name: z.string().min(1).max(100),
  event_category: z.enum(['onboarding', 'engagement', 'viral', 'revenue', 'feature_usage']),
  properties: z.record(z.any()).optional(),
  timestamp: z.string().datetime().optional()
});

// POST /api/admin/metrics/calculate - Trigger metric recalculation
const calculationSchema = z.object({
  date: z.string().date().optional(),
  metrics: z.array(z.string()).optional(), // Specific metrics to recalculate
  force_refresh: z.boolean().default(false)
});
```

#### 3. **Alert Management APIs**
```typescript
// GET /api/admin/metrics/alerts - Active alerts monitoring
// POST /api/admin/metrics/alerts - Create new alert
const alertSchema = z.object({
  metric_name: z.string().min(1),
  alert_type: z.enum(['threshold', 'change', 'trend']),
  threshold_value: z.number(),
  comparison: z.enum(['>', '<', '=', 'change_%']),
  severity: z.enum(['critical', 'warning', 'info']).default('warning'),
  notification_channels: z.array(z.enum(['email', 'slack', 'webhook'])),
  recipients: z.array(z.string())
});

// DELETE /api/admin/metrics/alerts/:id - Remove alert
```

### **SERVICE LAYER IMPLEMENTATION:**

#### 1. **SuccessMetricsTracker Service**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/metrics/success-tracker.ts
export class SuccessMetricsTracker {
  private supabase = createClient();
  
  async trackUserJourneyEvent(userId: string, event: AnalyticsEvent) {
    // Validate event data
    if (!userId || !event.event_name) {
      throw new Error('Invalid event tracking data');
    }
    
    // Insert event record
    const { error } = await this.supabase
      .from('user_journey_events')
      .insert({
        user_id: userId,
        event_name: event.event_name,
        event_category: event.event_category,
        properties: event.properties,
        time_since_signup_minutes: await this.getTimeSinceSignup(userId),
        session_id: event.session_id
      });
      
    if (error) throw error;
    
    // Check for milestone achievements
    await this.checkSuccessMilestones(userId, event);
    
    // Update real-time aggregations
    await this.updateRealTimeMetrics(event);
    
    // Evaluate alert conditions
    await this.evaluateAlerts(event);
  }
  
  async calculateDailyMetrics(date: Date): Promise<SuccessMetrics> {
    // MRR Calculation
    const mrr = await this.calculateMRR(date);
    const mrrGrowth = await this.calculateMRRGrowth(date);
    
    // Viral Metrics
    const kFactor = await this.calculateViralCoefficient(date);
    const inviteMetrics = await this.calculateInviteMetrics(date);
    
    // Engagement Metrics
    const engagement = await this.calculateEngagementMetrics(date);
    
    // Performance Metrics
    const performance = await this.calculatePerformanceMetrics(date);
    
    // Store calculated metrics
    const metrics = {
      date: date.toISOString().split('T')[0],
      mrr,
      mrr_growth_rate: mrrGrowth,
      k_factor: kFactor,
      supplier_dau_rate: engagement.supplierDAU,
      couple_wau_rate: engagement.coupleWAU,
      avg_page_load_time_ms: performance.avgPageLoad,
      uptime_percentage: performance.uptime,
      ...inviteMetrics,
      ...engagement
    };
    
    await this.supabase
      .from('success_metrics')
      .upsert(metrics);
      
    return metrics;
  }
  
  private async calculateViralCoefficient(date: Date): Promise<number> {
    // Get invitation and conversion data
    const { data: viralData } = await this.supabase.rpc('calculate_viral_metrics', {
      calculation_date: date.toISOString().split('T')[0]
    });
    
    if (!viralData || viralData.length === 0) return 0;
    
    const inviteData = viralData[0];
    
    // K-factor = (Number of invites per user) × (Conversion rate of invites)
    const avgInvitesPerUser = inviteData.total_invites / inviteData.unique_inviters;
    const conversionRate = inviteData.successful_signups / inviteData.total_invites;
    
    return avgInvitesPerUser * conversionRate;
  }
  
  private async checkSuccessMilestones(userId: string, event: AnalyticsEvent) {
    const milestones = {
      'first_form_created': async () => {
        const timeSinceSignup = await this.getTimeSinceSignup(userId);
        if (timeSinceSignup <= 24 * 60) { // Within 24 hours
          await this.recordMilestone(userId, 'fast_activation', { 
            hours: timeSinceSignup / 60 
          });
        }
      },
      
      'first_invitation_sent': async () => {
        const timeSinceSignup = await this.getTimeSinceSignup(userId);
        if (timeSinceSignup <= 3 * 24 * 60) { // Within 3 days
          await this.recordMilestone(userId, 'viral_activation', { 
            days: timeSinceSignup / (24 * 60) 
          });
        }
      },
      
      'first_client_imported': async () => {
        await this.recordMilestone(userId, 'onboarding_complete');
        
        // Check if this triggers bulk import milestone (>50 clients)
        const clientCount = await this.getImportedClientCount(userId);
        if (clientCount >= 50) {
          await this.recordMilestone(userId, 'bulk_import_user', { count: clientCount });
        }
      }
    };
    
    if (milestones[event.event_name]) {
      await milestones[event.event_name]();
    }
  }
}
```

#### 2. **AlertsManager Service**
```typescript
// Location: $WS_ROOT/wedsync/src/lib/metrics/alerts-manager.ts
export class AlertsManager {
  private supabase = createClient();
  
  async evaluateAllAlerts() {
    const { data: alerts } = await this.supabase
      .from('metric_alerts')
      .select('*')
      .eq('is_active', true);
      
    const currentMetrics = await this.getCurrentMetrics();
    
    for (const alert of alerts || []) {
      const shouldTrigger = this.evaluateAlertCondition(alert, currentMetrics);
      
      if (shouldTrigger && this.shouldSendNotification(alert)) {
        await this.triggerAlert(alert, currentMetrics[alert.metric_name]);
      }
    }
  }
  
  private evaluateAlertCondition(alert: MetricAlert, metrics: any): boolean {
    const currentValue = metrics[alert.metric_name];
    const threshold = alert.threshold_value;
    
    switch (alert.comparison) {
      case '>':
        return currentValue > threshold;
      case '<':
        return currentValue < threshold;
      case '=':
        return Math.abs(currentValue - threshold) < 0.001;
      case 'change_%':
        const previousValue = metrics[`${alert.metric_name}_previous`];
        const changePercent = ((currentValue - previousValue) / previousValue) * 100;
        return Math.abs(changePercent) > threshold;
      default:
        return false;
    }
  }
  
  private async triggerAlert(alert: MetricAlert, currentValue: number) {
    // Update alert trigger tracking
    await this.supabase
      .from('metric_alerts')
      .update({
        last_triggered_at: new Date().toISOString(),
        trigger_count: alert.trigger_count + 1
      })
      .eq('id', alert.id);
    
    // Send notifications based on configured channels
    for (const channel of alert.notification_channels) {
      switch (channel) {
        case 'email':
          await this.sendEmailAlert(alert, currentValue);
          break;
        case 'slack':
          await this.sendSlackAlert(alert, currentValue);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert, currentValue);
          break;
      }
    }
  }
}
```

### **DATABASE OPERATIONS:**

```typescript
// CRITICAL: All metrics operations must use database transactions
export class MetricsDatabase {
  private supabase = createClient();
  
  async updateMetricsTransaction(metrics: SuccessMetrics) {
    const { error } = await this.supabase.rpc('update_success_metrics_transaction', {
      p_date: metrics.date,
      p_mrr: metrics.mrr,
      p_k_factor: metrics.k_factor,
      p_total_users: metrics.total_users,
      p_engagement_data: metrics.engagement_data
    });
    
    if (error) {
      throw new Error(`Metrics update failed: ${error.message}`);
    }
  }
  
  async batchInsertEvents(events: AnalyticsEvent[]) {
    // Use batch insert for performance
    const { error } = await this.supabase
      .from('user_journey_events')
      .insert(events);
      
    if (error) {
      throw new Error(`Batch event insert failed: ${error.message}`);
    }
  }
}
```

## 🎭 TESTING REQUIREMENTS

### Unit Tests Required:
```typescript
describe('SuccessMetricsTracker', () => {
  test('calculates K-factor correctly with mixed conversion rates', async () => {
    const tracker = new SuccessMetricsTracker();
    
    // Mock invitation and conversion data
    const mockData = {
      total_invites: 1000,
      unique_inviters: 200,
      successful_signups: 150
    };
    
    const kFactor = await tracker.calculateViralCoefficient(new Date());
    
    // K-factor = (1000/200) * (150/1000) = 5 * 0.15 = 0.75
    expect(kFactor).toBeCloseTo(0.75, 2);
  });
  
  test('handles milestone tracking edge cases', async () => {
    const tracker = new SuccessMetricsTracker();
    
    // Test rapid-fire milestone events
    await tracker.trackUserJourneyEvent('user-123', {
      event_name: 'first_form_created',
      event_category: 'onboarding'
    });
    
    // Should not create duplicate milestones
    const milestones = await getMilestones('user-123');
    expect(milestones.filter(m => m.type === 'fast_activation')).toHaveLength(1);
  });
  
  test('alert evaluation handles threshold edge cases', async () => {
    const alertsManager = new AlertsManager();
    
    // Test boundary conditions for alerts
    const alert = {
      metric_name: 'k_factor',
      comparison: '>',
      threshold_value: 1.5
    };
    
    expect(alertsManager.evaluateAlertCondition(alert, { k_factor: 1.5001 })).toBe(true);
    expect(alertsManager.evaluateAlertCondition(alert, { k_factor: 1.4999 })).toBe(false);
  });
});
```

### Integration Tests Required:
```typescript
// Test complete metrics calculation pipeline
test('metrics pipeline processes events to aggregated KPIs', async () => {
  // Create test events
  const events = generateTestUserJourney();
  
  // Process events through tracker
  for (const event of events) {
    await tracker.trackUserJourneyEvent(event.userId, event);
  }
  
  // Calculate daily metrics
  const metrics = await tracker.calculateDailyMetrics(new Date());
  
  // Verify aggregated metrics are correct
  expect(metrics.k_factor).toBeGreaterThan(0);
  expect(metrics.mrr).toBeGreaterThan(0);
  expect(metrics.total_users).toBe(events.length);
});
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] **Metrics Tracking APIs**: Event ingestion, KPI overview, viral coefficient calculation
- [ ] **Alert Management System**: Threshold monitoring with notification channels
- [ ] **Statistical Calculation Engine**: MRR, K-factor, cohort analysis algorithms
- [ ] **Database Integration**: Optimized queries with proper indexing
- [ ] **Security Implementation**: Admin-only access with rate limiting
- [ ] **Unit Tests**: >95% coverage for calculation accuracy
- [ ] **Performance Optimization**: Sub-100ms response times for dashboard APIs
- [ ] **Real-time Updates**: WebSocket or polling for live metrics

## 💾 WHERE TO SAVE YOUR WORK

- **API Routes**: `$WS_ROOT/wedsync/src/app/api/admin/metrics/`
- **Services**: `$WS_ROOT/wedsync/src/lib/metrics/`
- **Types**: `$WS_ROOT/wedsync/src/types/analytics.ts`
- **Tests**: `$WS_ROOT/wedsync/__tests__/api/metrics/`
- **Database**: `$WS_ROOT/wedsync/supabase/migrations/`

## ⚠️ CRITICAL WARNINGS

- **NEVER expose raw user data** - Always aggregate and anonymize
- **ALL metrics endpoints are admin-only** - No exceptions
- **Database transactions required** - Metrics accuracy is business-critical
- **Comprehensive error handling** - Failed calculations cannot crash dashboards
- **Audit logging mandatory** - All metric accesses must be logged

## 🏁 COMPLETION CHECKLIST

### Security Verification:
```bash
# Verify ALL API routes have admin validation
grep -r "role.*admin" $WS_ROOT/wedsync/src/app/api/admin/metrics/
# Should show admin checks on EVERY route.ts file

# Check for unvalidated request.json() (FORBIDDEN!)
grep -r "request\\.json()" $WS_ROOT/wedsync/src/app/api/admin/metrics/
# Should return NOTHING (all should be validated)

# Verify rate limiting
grep -r "Ratelimit" $WS_ROOT/wedsync/src/app/api/admin/metrics/
# Should show rate limiting on metrics endpoints
```

### Final Technical Checklist:
- [ ] All API routes use withSecureValidation
- [ ] Admin access verified on protected metrics
- [ ] Database operations use transactions
- [ ] Calculation algorithms are statistically sound
- [ ] Error handling doesn't leak sensitive data
- [ ] Rate limiting applied to metrics endpoints
- [ ] TypeScript compiles with NO errors
- [ ] Tests pass including edge cases and accuracy verification

---

**EXECUTE IMMEDIATELY - Build bulletproof business intelligence engine with comprehensive statistical accuracy!**