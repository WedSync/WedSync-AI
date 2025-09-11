# TEAM B - ROUND 1: WS-285 - Client Portal Analytics
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build robust analytics API backend with wedding progress calculations, data aggregation, and client-specific insights generation
**FEATURE ID:** WS-285 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding data analysis, progress algorithms, and actionable insight generation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/analytics/client/
cat $WS_ROOT/wedsync/src/app/api/analytics/client/progress/route.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test client-analytics-api
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

// Query analytics API and data aggregation patterns
await mcp__serena__search_for_pattern("analytics api route data aggregation");
await mcp__serena__find_symbol("Analytics ApiRoute DataAggregator", "", true);
await mcp__serena__get_symbols_overview("src/app/api/analytics/");
```

### B. SECURITY AND VALIDATION PATTERNS (MANDATORY)
```typescript
// CRITICAL: Load security validation patterns
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/schemas.ts");

// Find existing analytics validation patterns
await mcp__serena__search_for_pattern("withSecureValidation analytics data");
await mcp__serena__find_symbol("validateAnalyticsAuth analyticsSchema", "", true);
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to analytics APIs
# Use Ref MCP to search for:
# - "Analytics API design data-aggregation patterns"
# - "Wedding data-analysis algorithms progress-calculation"
# - "Supabase analytics-queries optimization"
# - "Client analytics security data-protection"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing analytics and API patterns
await mcp__serena__find_referencing_symbols("analytics route handler");
await mcp__serena__search_for_pattern("wedding data calculation");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Analytics API Architecture Strategy
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "Client analytics API requirements: GET /api/analytics/client/progress (wedding readiness score), GET /api/analytics/client/budget (spending analysis), GET /api/analytics/client/guests (RSVP insights), GET /api/analytics/client/vendors (coordination metrics), GET /api/analytics/client/timeline (milestone tracking). Each endpoint requires complex data aggregation from multiple tables.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding progress calculation complexity: Progress depends on task completion (weighted by importance), vendor booking status (critical vs. optional), budget allocation (spending vs. planned), guest response rates (RSVP timeline), milestone achievements (venue booked, invitations sent). Algorithm must account for wedding size, style, and timeline constraints.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data aggregation challenges: Wedding data spans multiple tables (clients, tasks, vendors, guests, budget_items, communications, timeline_events). Real-time calculations require efficient queries, caching strategies for expensive computations, incremental updates for progress changes, and historical trend analysis.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Client insight generation: Actionable insights require comparing client progress against benchmarks (similar weddings, industry standards), identifying bottlenecks (delayed vendor responses, budget overruns), predicting issues (timeline conflicts, budget shortfalls), recommending next actions (book photographer, send save-the-dates).",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API performance and security strategy: Analytics queries are expensive, need response caching with smart invalidation, query optimization with proper indexes, rate limiting to prevent abuse, client data isolation (strict access controls), audit logging for sensitive analytics access, GDPR compliance for analytics data retention.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities:**

1. **task-tracker-coordinator** --think-hard --use-serena --analytics-api-requirements
   - Mission: Track analytics API endpoints, data aggregation needs, calculation algorithms

2. **database-architect** --think-ultra-hard --analytics-optimization --wedding-data-expert
   - Mission: Optimize database queries for analytics performance and create efficient aggregation

3. **security-compliance-officer** --think-ultra-hard --analytics-data-protection --client-privacy
   - Mission: Ensure client analytics data security, access controls, and GDPR compliance

4. **api-specialist** --continuous --analytics-patterns --wedding-calculations
   - Mission: Build secure analytics API endpoints with comprehensive validation

5. **test-automation-architect** --tdd-first --analytics-testing --calculation-accuracy
   - Mission: Create comprehensive API tests including analytics calculation validation

6. **documentation-chronicler** --detailed-evidence --api-documentation
   - Mission: Document analytics API contracts and calculation methodologies

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all related analytics API and wedding data patterns
await mcp__serena__find_symbol("Analytics ApiRoute WeddingData", "", true);
await mcp__serena__search_for_pattern("wedding progress calculation algorithm");
await mcp__serena__find_referencing_symbols("data aggregation analytics");
```
- [ ] Identified existing analytics API patterns and endpoints
- [ ] Found wedding data structures and calculation logic
- [ ] Understood security requirements from similar analytics endpoints
- [ ] Located data aggregation and caching patterns

### **PLAN PHASE (THINK ULTRA HARD!)**
Based on Serena analysis, create detailed analytics API architecture:
- [ ] Analytics API endpoints with comprehensive data aggregation
- [ ] Wedding progress calculation algorithms with benchmarking
- [ ] Client insight generation with actionable recommendations
- [ ] Performance optimization with caching and query optimization

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use API route patterns discovered by Serena
- [ ] Implement wedding-specific calculation algorithms
- [ ] Create efficient data aggregation with caching
- [ ] Include comprehensive security and audit logging

## 📋 TECHNICAL SPECIFICATION

### Client Analytics API Endpoints:

1. **Wedding Progress Analytics**
   - `GET /api/analytics/client/progress` - Overall wedding readiness score
   - `GET /api/analytics/client/progress/breakdown` - Detailed progress by category
   - `GET /api/analytics/client/progress/timeline` - Progress over time

2. **Budget Analytics**
   - `GET /api/analytics/client/budget/overview` - Budget summary and spending
   - `GET /api/analytics/client/budget/categories` - Spending by category breakdown
   - `GET /api/analytics/client/budget/forecast` - Budget projection and trends

3. **Guest Analytics**
   - `GET /api/analytics/client/guests/engagement` - RSVP rates and guest insights
   - `GET /api/analytics/client/guests/demographics` - Guest composition analysis
   - `GET /api/analytics/client/guests/timeline` - Response timeline tracking

4. **Vendor Analytics**
   - `GET /api/analytics/client/vendors/coordination` - Vendor communication metrics
   - `GET /api/analytics/client/vendors/performance` - Vendor response and progress
   - `GET /api/analytics/client/vendors/timeline` - Vendor milestone tracking

5. **Insight Generation**
   - `GET /api/analytics/client/insights` - Actionable insights and recommendations
   - `GET /api/analytics/client/insights/predictions` - Wedding readiness predictions
   - `POST /api/analytics/client/insights/feedback` - Track insight effectiveness

### Wedding Progress Calculation Engine:

```sql
-- Wedding Progress Calculation View
CREATE VIEW wedding_progress_calculation AS
SELECT 
    c.id as client_id,
    c.wedding_date,
    -- Task completion progress (40% weight)
    COALESCE(
        (SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER(), 0)
         FROM wedding_tasks wt 
         WHERE wt.client_id = c.id AND wt.completed_at IS NOT NULL), 0
    ) * 0.40 as task_progress_weighted,
    
    -- Vendor booking progress (30% weight)
    COALESCE(
        (SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*) OVER(), 0)
         FROM vendor_bookings vb 
         WHERE vb.client_id = c.id AND vb.status = 'confirmed'), 0
    ) * 0.30 as vendor_progress_weighted,
    
    -- Budget allocation progress (20% weight)
    COALESCE(
        (SELECT 
            CASE 
                WHEN c.total_budget > 0 THEN 
                    LEAST(100, (SUM(bi.amount) * 100.0 / c.total_budget))
                ELSE 0
            END
         FROM budget_items bi WHERE bi.client_id = c.id), 0
    ) * 0.20 as budget_progress_weighted,
    
    -- Guest response progress (10% weight)
    COALESCE(
        (SELECT COUNT(CASE WHEN rsvp_status IS NOT NULL THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)
         FROM guests g WHERE g.client_id = c.id), 0
    ) * 0.10 as guest_progress_weighted

FROM clients c;
```

### Analytics Data Aggregation Services:

```typescript
// Wedding Analytics Data Aggregator
class WeddingAnalyticsAggregator {
  private cacheManager: CacheManager;
  private queryOptimizer: QueryOptimizer;
  private insightGenerator: ClientInsightGenerator;

  async aggregateProgressData(clientId: string): Promise<ProgressAnalytics> {
    const cacheKey = `progress:${clientId}`;
    
    // Check cache first
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    // Aggregate from multiple data sources
    const [taskProgress, vendorProgress, budgetProgress, guestProgress] = await Promise.all([
      this.calculateTaskProgress(clientId),
      this.calculateVendorProgress(clientId),
      this.calculateBudgetProgress(clientId),
      this.calculateGuestProgress(clientId)
    ]);

    const overallProgress = this.calculateOverallReadinessScore({
      taskProgress,
      vendorProgress,
      budgetProgress,
      guestProgress
    });

    const result = {
      overallProgress,
      breakdown: { taskProgress, vendorProgress, budgetProgress, guestProgress },
      insights: await this.insightGenerator.generateProgressInsights(overallProgress),
      lastUpdated: new Date()
    };

    // Cache for 5 minutes
    await this.cacheManager.set(cacheKey, result, 300);
    
    return result;
  }

  private calculateOverallReadinessScore(components: ProgressComponents): number {
    // Weighted algorithm: Tasks 40%, Vendors 30%, Budget 20%, Guests 10%
    return Math.round(
      (components.taskProgress * 0.40) +
      (components.vendorProgress * 0.30) +
      (components.budgetProgress * 0.20) +
      (components.guestProgress * 0.10)
    );
  }

  async generateBudgetAnalytics(clientId: string): Promise<BudgetAnalytics> {
    const query = `
      SELECT 
        bi.category,
        SUM(bi.amount) as spent,
        AVG(bi.amount) as avg_expense,
        COUNT(*) as expense_count,
        c.total_budget,
        (SUM(bi.amount) * 100.0 / c.total_budget) as category_percentage
      FROM budget_items bi
      JOIN clients c ON c.id = bi.client_id
      WHERE bi.client_id = $1
      GROUP BY bi.category, c.total_budget
      ORDER BY spent DESC
    `;

    const results = await this.queryOptimizer.executeOptimized(query, [clientId]);
    return this.transformBudgetData(results);
  }

  async generateGuestAnalytics(clientId: string): Promise<GuestAnalytics> {
    const query = `
      SELECT 
        COUNT(*) as total_invited,
        COUNT(CASE WHEN rsvp_status = 'yes' THEN 1 END) as confirmed_yes,
        COUNT(CASE WHEN rsvp_status = 'no' THEN 1 END) as confirmed_no,
        COUNT(CASE WHEN rsvp_status IS NOT NULL THEN 1 END) as total_responded,
        COUNT(CASE WHEN dietary_restrictions IS NOT NULL THEN 1 END) as has_dietary_needs,
        AVG(EXTRACT(EPOCH FROM (responded_at - created_at))/3600) as avg_response_time_hours
      FROM guests 
      WHERE client_id = $1
    `;

    const results = await this.queryOptimizer.executeOptimized(query, [clientId]);
    return this.transformGuestData(results);
  }
}

// Client Insight Generation Engine
class ClientInsightGenerator {
  async generateActionableInsights(clientId: string, analyticsData: AnalyticsData): Promise<Insight[]> {
    const insights: Insight[] = [];

    // Budget insights
    if (analyticsData.budget.spentPercentage > 80) {
      insights.push({
        type: 'budget_warning',
        priority: 'high',
        title: 'Budget Alert',
        description: 'You\'ve spent 80% of your budget with tasks remaining.',
        action: 'Review remaining expenses and consider budget adjustment.',
        actionUrl: '/client/budget/review'
      });
    }

    // Timeline insights
    const daysUntilWedding = this.calculateDaysUntilWedding(clientId);
    if (daysUntilWedding < 90 && analyticsData.progress.overallProgress < 70) {
      insights.push({
        type: 'timeline_warning',
        priority: 'high',
        title: 'Timeline Concern',
        description: 'You\'re less than 90 days out with 70% progress.',
        action: 'Focus on critical tasks: venue, catering, and invitations.',
        actionUrl: '/client/timeline/critical'
      });
    }

    // Guest insights
    if (analyticsData.guests.responseRate < 50 && daysUntilWedding < 30) {
      insights.push({
        type: 'guest_followup',
        priority: 'medium',
        title: 'Guest Follow-up Needed',
        description: 'Less than 50% of guests have responded with 30 days remaining.',
        action: 'Send RSVP reminders to non-responders.',
        actionUrl: '/client/guests/reminders'
      });
    }

    // Vendor insights
    const vendorResponseTime = analyticsData.vendors.averageResponseTime;
    if (vendorResponseTime > 48) {
      insights.push({
        type: 'vendor_communication',
        priority: 'medium',
        title: 'Vendor Communication',
        description: `Vendors taking ${Math.round(vendorResponseTime)} hours to respond on average.`,
        action: 'Consider following up on pending vendor communications.',
        actionUrl: '/client/vendors/communications'
      });
    }

    return insights.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
  }

  private getPriorityWeight(priority: string): number {
    const weights = { 'high': 3, 'medium': 2, 'low': 1 };
    return weights[priority] || 0;
  }
}
```

## 🎯 SPECIFIC DELIVERABLES

### Analytics API Implementation with Evidence:
- [ ] Complete client analytics API with comprehensive data aggregation
- [ ] Wedding progress calculation engine with weighted algorithms
- [ ] Budget analytics with spending breakdown and forecasting
- [ ] Guest analytics with engagement tracking and insights
- [ ] Vendor analytics with coordination metrics and performance tracking
- [ ] Client insight generation with actionable recommendations

### Performance and Caching:
- [ ] Query optimization with proper database indexes
- [ ] Response caching with intelligent invalidation
- [ ] Data aggregation optimization for complex analytics
- [ ] Real-time analytics updates with efficient change detection
- [ ] Rate limiting on analytics endpoints
- [ ] Performance benchmarking with <200ms response times

### Security and Compliance:
- [ ] Client data isolation with strict access controls
- [ ] Analytics audit logging for sensitive data access
- [ ] Input validation with Zod schemas on all endpoints
- [ ] GDPR compliance with analytics data retention policies
- [ ] Secure export functionality for analytics reports

## 🔗 DEPENDENCIES

**What you need from other teams:**
- Team A: Frontend analytics component data requirements and chart specifications
- Team C: Real-time analytics update requirements for live progress tracking

**What others need from you:**
- Team A: Analytics API contracts and data structure specifications
- Team D: Mobile-optimized analytics API responses with minimal data transfer
- Team E: API testing specifications and calculation validation requirements

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### ANALYTICS API SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for all analytics endpoints
- [ ] **Client data isolation** - Strict access controls ensuring clients see only their data
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit() on expensive analytics endpoints
- [ ] **SQL injection prevention** - Parameterized queries for all analytics calculations
- [ ] **XSS prevention** - Sanitize all analytics data before response
- [ ] **Error messages sanitized** - Never leak database structure or other client data
- [ ] **Audit logging** - Log all analytics access with client and user context

### REQUIRED SECURITY IMPORTS:
```typescript
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { analyticsRequestSchema } from '$WS_ROOT/wedsync/src/lib/validation/analytics-schemas';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
import { getServerSession } from 'next-auth';
import { auditAnalyticsAccess } from '$WS_ROOT/wedsync/src/lib/audit/analytics-logger';
import { validateClientAccess } from '$WS_ROOT/wedsync/src/lib/auth/client-access';
```

### ANALYTICS ENDPOINT SECURITY PATTERN:
```typescript
const clientProgressRequestSchema = z.object({
  clientId: z.string().uuid(),
  dateRange: z.object({
    start: z.string().datetime().optional(),
    end: z.string().datetime().optional()
  }).optional(),
  includeBreakdown: z.boolean().default(false)
});

export const GET = withSecureValidation(
  clientProgressRequestSchema,
  async (request, validatedData) => {
    // Authenticate user
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify client access
    const hasAccess = await validateClientAccess(session.user.id, validatedData.clientId);
    if (!hasAccess) {
      auditAnalyticsAccess.warn('Unauthorized analytics access attempt', {
        userId: session.user.id,
        clientId: validatedData.clientId,
        endpoint: 'progress',
        timestamp: new Date()
      });
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Apply rate limiting for expensive analytics
    const rateLimitResult = await rateLimitService.checkRateLimit(request, {
      identifier: session.user.id,
      limit: 30, // 30 requests per minute for analytics
      window: 60
    });
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    try {
      // Generate analytics data
      const analyticsData = await weddingAnalyticsAggregator.aggregateProgressData(
        validatedData.clientId,
        validatedData.dateRange
      );

      // Log successful access
      auditAnalyticsAccess.info('Client progress analytics accessed', {
        userId: session.user.id,
        clientId: validatedData.clientId,
        includeBreakdown: validatedData.includeBreakdown,
        dataPoints: Object.keys(analyticsData).length
      });

      return NextResponse.json(analyticsData);
    } catch (error) {
      // Log error without exposing details
      auditAnalyticsAccess.error('Analytics generation failed', {
        userId: session.user.id,
        clientId: validatedData.clientId,
        error: error.message
      });

      return NextResponse.json(
        { error: 'Unable to generate analytics' },
        { status: 500 }
      );
    }
  }
);
```

## 🧪 ANALYTICS API TESTING WITH COMPREHENSIVE VALIDATION

```typescript
// 1. WEDDING PROGRESS CALCULATION TESTING
describe('Wedding Progress Analytics API', () => {
  test('calculates accurate wedding readiness score', async () => {
    // Set up test wedding data
    const testClientId = await createTestClient({
      wedding_date: '2025-08-15',
      total_budget: 20000
    });

    // Create test data for progress calculation
    await createTestTasks(testClientId, { completed: 8, total: 10 }); // 80% tasks
    await createTestVendors(testClientId, { booked: 3, total: 4 }); // 75% vendors
    await createTestBudget(testClientId, { spent: 15000, budget: 20000 }); // 75% budget
    await createTestGuests(testClientId, { responded: 90, invited: 100 }); // 90% guests

    const authToken = await generateAuthToken(testClientId);
    const response = await request(app)
      .get(`/api/analytics/client/progress?clientId=${testClientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Expected calculation: (80*0.4) + (75*0.3) + (75*0.2) + (90*0.1) = 32 + 22.5 + 15 + 9 = 78.5
    expect(response.body.overallProgress).toBeCloseTo(79, 0); // Rounded

    expect(response.body.breakdown).toMatchObject({
      taskProgress: 80,
      vendorProgress: 75,
      budgetProgress: 75,
      guestProgress: 90
    });

    expect(response.body.insights).toBeDefined();
    expect(Array.isArray(response.body.insights)).toBe(true);
  });

  test('handles edge cases in progress calculation', async () => {
    // Test with minimal data
    const minimalClientId = await createTestClient({
      wedding_date: '2025-12-31',
      total_budget: 0 // No budget set
    });

    const authToken = await generateAuthToken(minimalClientId);
    const response = await request(app)
      .get(`/api/analytics/client/progress?clientId=${minimalClientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Should handle missing data gracefully
    expect(response.body.overallProgress).toBeGreaterThanOrEqual(0);
    expect(response.body.overallProgress).toBeLessThanOrEqual(100);
    expect(response.body.breakdown.budgetProgress).toBe(0); // No budget = 0%
  });

  test('provides timeline-based progress predictions', async () => {
    const clientId = await createTestClient({
      wedding_date: '2025-06-15' // 6 months from now
    });

    const authToken = await generateAuthToken(clientId);
    const response = await request(app)
      .get(`/api/analytics/client/progress/timeline?clientId=${clientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      currentProgress: expect.any(Number),
      projectedProgress: expect.any(Number),
      daysUntilWedding: expect.any(Number),
      onTrack: expect.any(Boolean),
      recommendations: expect.any(Array)
    });

    if (response.body.daysUntilWedding < 90 && response.body.currentProgress < 70) {
      expect(response.body.onTrack).toBe(false);
      expect(response.body.recommendations.length).toBeGreaterThan(0);
    }
  });
});

// 2. BUDGET ANALYTICS API TESTING
describe('Budget Analytics API', () => {
  test('provides detailed budget breakdown analysis', async () => {
    const clientId = await createTestClient({ total_budget: 25000 });
    
    // Create budget items across categories
    await createBudgetItems(clientId, [
      { category: 'venue', amount: 10000 },
      { category: 'catering', amount: 6000 },
      { category: 'photography', amount: 3000 },
      { category: 'flowers', amount: 1500 }
    ]);

    const authToken = await generateAuthToken(clientId);
    const response = await request(app)
      .get(`/api/analytics/client/budget/categories?clientId=${clientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.totalSpent).toBe(20500);
    expect(response.body.totalBudget).toBe(25000);
    expect(response.body.spentPercentage).toBeCloseTo(82, 0);

    const categories = response.body.categories;
    expect(categories).toHaveLength(4);
    
    const venueCategory = categories.find(c => c.category === 'venue');
    expect(venueCategory.amount).toBe(10000);
    expect(venueCategory.percentage).toBeCloseTo(48.8, 1); // 10000/20500
  });

  test('generates budget forecast and predictions', async () => {
    const clientId = await createTestClient({
      wedding_date: '2025-07-01',
      total_budget: 30000
    });

    // Add spending history over time
    await createBudgetHistory(clientId, [
      { date: '2025-01-01', amount: 5000 },
      { date: '2025-01-15', amount: 3000 },
      { date: '2025-02-01', amount: 4000 }
    ]);

    const authToken = await generateAuthToken(clientId);
    const response = await request(app)
      .get(`/api/analytics/client/budget/forecast?clientId=${clientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      currentSpent: 12000,
      projectedFinalSpent: expect.any(Number),
      budgetRisk: expect.stringMatching(/^(low|medium|high)$/),
      monthlyTrend: expect.any(Number),
      recommendations: expect.any(Array)
    });

    if (response.body.projectedFinalSpent > 30000) {
      expect(response.body.budgetRisk).toBe('high');
      expect(response.body.recommendations.length).toBeGreaterThan(0);
    }
  });
});

// 3. GUEST ANALYTICS API TESTING
describe('Guest Analytics API', () => {
  test('analyzes guest engagement and RSVP patterns', async () => {
    const clientId = await createTestClient({ wedding_date: '2025-09-20' });
    
    // Create diverse guest data
    await createTestGuests(clientId, [
      { rsvp_status: 'yes', responded_at: '2025-01-10', dietary_restrictions: 'vegetarian' },
      { rsvp_status: 'yes', responded_at: '2025-01-12', dietary_restrictions: null },
      { rsvp_status: 'no', responded_at: '2025-01-15', dietary_restrictions: null },
      { rsvp_status: null, responded_at: null, dietary_restrictions: null }, // Not responded
      { rsvp_status: 'yes', responded_at: '2025-01-20', dietary_restrictions: 'gluten-free' }
    ]);

    const authToken = await generateAuthToken(clientId);
    const response = await request(app)
      .get(`/api/analytics/client/guests/engagement?clientId=${clientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body).toMatchObject({
      totalInvited: 5,
      confirmedYes: 3,
      confirmedNo: 1,
      notResponded: 1,
      responseRate: 80, // 4/5 responded
      averageResponseTimeHours: expect.any(Number),
      dietaryRequirements: {
        total: 2,
        breakdown: expect.any(Object)
      }
    });

    expect(response.body.dietaryRequirements.breakdown).toMatchObject({
      vegetarian: 1,
      'gluten-free': 1
    });
  });

  test('provides guest demographic insights', async () => {
    const clientId = await createTestClient({ wedding_date: '2025-10-15' });
    
    await createGuestDemographics(clientId, [
      { age_group: '25-34', relationship: 'family', location: 'local' },
      { age_group: '35-44', relationship: 'friends', location: 'out-of-town' },
      { age_group: '25-34', relationship: 'work', location: 'local' },
      { age_group: '55-64', relationship: 'family', location: 'out-of-town' }
    ]);

    const authToken = await generateAuthToken(clientId);
    const response = await request(app)
      .get(`/api/analytics/client/guests/demographics?clientId=${clientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(response.body.ageGroups).toMatchObject({
      '25-34': 2,
      '35-44': 1,
      '55-64': 1
    });

    expect(response.body.relationships).toMatchObject({
      family: 2,
      friends: 1,
      work: 1
    });

    expect(response.body.locations).toMatchObject({
      local: 2,
      'out-of-town': 2
    });
  });
});

// 4. ANALYTICS SECURITY TESTING
describe('Analytics API Security', () => {
  test('prevents unauthorized access to client analytics', async () => {
    const clientA = await createTestClient({ name: 'Client A' });
    const clientB = await createTestClient({ name: 'Client B' });

    const clientAToken = await generateAuthToken(clientA);

    // Try to access Client B's analytics with Client A's token
    const response = await request(app)
      .get(`/api/analytics/client/progress?clientId=${clientB}`)
      .set('Authorization', `Bearer ${clientAToken}`)
      .expect(403);

    expect(response.body.error).toBe('Access denied');
  });

  test('enforces rate limiting on analytics endpoints', async () => {
    const clientId = await createTestClient({ name: 'Rate Test Client' });
    const authToken = await generateAuthToken(clientId);

    const requests = Array(35).fill().map(() => 
      request(app)
        .get(`/api/analytics/client/progress?clientId=${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
    );

    const responses = await Promise.all(requests);
    const rateLimitedCount = responses.filter(r => r.status === 429).length;

    expect(rateLimitedCount).toBeGreaterThan(0); // Should hit rate limit (30/min)
  });

  test('validates input parameters to prevent injection', async () => {
    const clientId = await createTestClient({ name: 'Injection Test' });
    const authToken = await generateAuthToken(clientId);

    // Try SQL injection in date range
    const maliciousRequest = await request(app)
      .get(`/api/analytics/client/progress?clientId=${clientId}&dateRange[start]='; DROP TABLE clients; --`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(400);

    expect(maliciousRequest.body.error).toContain('Invalid input');

    // Verify clients table still exists
    const clientCheck = await request(app)
      .get(`/api/analytics/client/progress?clientId=${clientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    expect(clientCheck.body).toBeDefined();
  });

  test('audits all analytics access attempts', async () => {
    const clientId = await createTestClient({ name: 'Audit Test' });
    const authToken = await generateAuthToken(clientId);

    await request(app)
      .get(`/api/analytics/client/progress?clientId=${clientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    // Verify audit log entry
    const auditLogs = await db.query(
      'SELECT * FROM audit_logs WHERE action = ? AND resource_id = ?',
      ['analytics_access', clientId]
    );

    expect(auditLogs.rows.length).toBeGreaterThan(0);
    expect(auditLogs.rows[0]).toMatchObject({
      action: 'analytics_access',
      resource_id: clientId,
      user_id: expect.any(String),
      details: expect.any(Object)
    });
  });
});

// 5. ANALYTICS PERFORMANCE TESTING
describe('Analytics API Performance', () => {
  test('responds to progress calculations under 200ms', async () => {
    const clientId = await createLargeTestDataset(); // 1000+ tasks, guests, etc.
    const authToken = await generateAuthToken(clientId);

    const startTime = Date.now();
    
    const response = await request(app)
      .get(`/api/analytics/client/progress?clientId=${clientId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .expect(200);

    const responseTime = Date.now() - startTime;
    
    expect(responseTime).toBeLessThan(200); // Under 200ms
    expect(response.body.overallProgress).toBeDefined();
  });

  test('efficiently handles concurrent analytics requests', async () => {
    const clients = await Promise.all([
      createTestClient({ name: 'Concurrent 1' }),
      createTestClient({ name: 'Concurrent 2' }),
      createTestClient({ name: 'Concurrent 3' })
    ]);

    const concurrentRequests = clients.map(async clientId => {
      const authToken = await generateAuthToken(clientId);
      const startTime = Date.now();
      
      const response = await request(app)
        .get(`/api/analytics/client/progress?clientId=${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      return {
        clientId,
        responseTime: Date.now() - startTime,
        success: response.status === 200
      };
    });

    const results = await Promise.all(concurrentRequests);
    
    results.forEach(result => {
      expect(result.success).toBe(true);
      expect(result.responseTime).toBeLessThan(500); // Should handle concurrency well
    });
  });
});
```

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Technical Implementation:
- [ ] Complete client analytics API with comprehensive data aggregation
- [ ] Wedding progress calculation engine with >95% accuracy
- [ ] Budget, guest, vendor, and timeline analytics endpoints
- [ ] Client insight generation with actionable recommendations
- [ ] Performance optimization with <200ms response times
- [ ] Comprehensive caching with intelligent invalidation

### Security Evidence:
```bash
# Verify ALL analytics endpoints have validation
grep -r "withSecureValidation" $WS_ROOT/wedsync/src/app/api/analytics/client/
# Should show validation on EVERY route.ts file

# Check client access validation
grep -r "validateClientAccess" $WS_ROOT/wedsync/src/app/api/analytics/client/
# Should be present in ALL analytics endpoints

# Verify rate limiting
grep -r "rateLimitService" $WS_ROOT/wedsync/src/app/api/analytics/client/
# Should be applied to expensive analytics endpoints

# Check audit logging
grep -r "auditAnalyticsAccess" $WS_ROOT/wedsync/src/app/api/analytics/client/
# Should log ALL analytics access attempts
```

### Analytics Accuracy Evidence:
```typescript
// Required analytics API performance metrics
const analyticsApiMetrics = {
  progressCalculationAccuracy: "98.5%",  // Target: >95%
  apiResponseTime: "145ms",              // Target: <200ms
  cacheHitRate: "87%",                   // Target: >80%
  dataAggregationSpeed: "95ms",          // Target: <100ms
  insightGenerationTime: "180ms",        // Target: <200ms
  concurrentRequestHandling: "99.2%"     // Target: >95% success rate
}
```

### Database Performance Evidence:
- [ ] Analytics queries execute in <100ms with proper indexes
- [ ] Data aggregation handles 10,000+ records efficiently
- [ ] Cache invalidation works correctly for real-time updates
- [ ] Concurrent request handling maintains performance
- [ ] Memory usage optimized for complex calculations

## 💾 WHERE TO SAVE

### Analytics API Routes Structure:
```
$WS_ROOT/wedsync/src/app/api/analytics/client/
├── progress/
│   ├── route.ts                        # Overall wedding readiness score
│   ├── breakdown/route.ts              # Detailed progress by category
│   └── timeline/route.ts               # Progress over time tracking
├── budget/
│   ├── overview/route.ts               # Budget summary and spending
│   ├── categories/route.ts             # Spending breakdown by category
│   └── forecast/route.ts               # Budget projection and trends
├── guests/
│   ├── engagement/route.ts             # RSVP rates and guest insights
│   ├── demographics/route.ts           # Guest composition analysis
│   └── timeline/route.ts               # Response timeline tracking
├── vendors/
│   ├── coordination/route.ts           # Vendor communication metrics
│   ├── performance/route.ts            # Vendor response and progress
│   └── timeline/route.ts               # Vendor milestone tracking
└── insights/
    ├── route.ts                        # Actionable insights and recommendations
    ├── predictions/route.ts            # Wedding readiness predictions
    └── feedback/route.ts               # Track insight effectiveness
```

### Analytics Services:
```
$WS_ROOT/wedsync/src/lib/analytics/client/
├── wedding-analytics-aggregator.ts    # Main analytics data aggregation
├── progress-calculator.ts             # Wedding progress calculations
├── insight-generator.ts               # Client insight generation
├── budget-analyzer.ts                 # Budget analytics calculations
├── guest-analyzer.ts                  # Guest engagement analytics
├── vendor-analyzer.ts                 # Vendor coordination analytics
├── cache-manager.ts                   # Analytics caching strategy
└── query-optimizer.ts                 # Database query optimization
```

### Database Migrations:
```
$WS_ROOT/wedsync/supabase/migrations/
├── [timestamp]_analytics_views.sql     # Analytics calculation views
├── [timestamp]_analytics_indexes.sql   # Performance optimization indexes
└── [timestamp]_analytics_audit.sql     # Audit logging for analytics
```

## ⚠️ CRITICAL WARNINGS

### Wedding Analytics Sensitivity:
- **Progress Anxiety**: Incorrect calculations can stress couples during wedding planning
- **Budget Privacy**: Financial data requires extra security and access controls
- **Timeline Pressure**: Progress predictions affect vendor booking decisions
- **Guest Privacy**: RSVP and demographic data needs careful protection

### Performance Considerations:
- **Complex Calculations**: Wedding progress involves multiple weighted factors
- **Large Datasets**: Popular venues may have thousands of events for benchmarking
- **Real-time Updates**: Progress changes must reflect immediately for user trust
- **Concurrent Access**: Multiple team members may access analytics simultaneously

### Data Accuracy Requirements:
- **Calculation Errors**: Wrong progress scores can cause poor wedding planning decisions
- **Insight Relevance**: Recommendations must be contextually appropriate and actionable
- **Benchmark Data**: Comparison data must be relevant to wedding size, style, and location
- **Prediction Accuracy**: Timeline predictions affect critical vendor booking decisions

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### API Security Verification:
```bash
# Verify ALL analytics endpoints have validation
grep -r "withSecureValidation\|withValidation" $WS_ROOT/wedsync/src/app/api/analytics/client/
# Should show validation on EVERY route.ts file

# Check for direct request access without validation
grep -r "request\." $WS_ROOT/wedsync/src/app/api/analytics/client/ | grep -v "validatedData\|getServerSession"
# Should return minimal results (all requests should be validated)

# Verify client access controls
grep -r "validateClientAccess\|hasAccess" $WS_ROOT/wedsync/src/app/api/analytics/client/
# Should be present in ALL analytics endpoints

# Check rate limiting implementation
grep -r "rateLimitService" $WS_ROOT/wedsync/src/app/api/analytics/client/
# Should be applied to resource-intensive analytics endpoints

# Verify audit logging
grep -r "auditAnalyticsAccess\|audit.*analytics" $WS_ROOT/wedsync/src/lib/analytics/client/
# Should log ALL analytics data access
```

### Final Client Analytics API Checklist:
- [ ] Wedding progress calculation API with weighted algorithm implementation
- [ ] Budget analytics with spending breakdown, forecasting, and insights
- [ ] Guest analytics with engagement tracking, demographics, and RSVP insights
- [ ] Vendor analytics with coordination metrics and performance tracking
- [ ] Client insight generation with actionable recommendations
- [ ] Performance optimization: <200ms response times, efficient caching
- [ ] Security measures: validation, authentication, client access controls
- [ ] Database optimization: proper indexes, query optimization
- [ ] Comprehensive audit logging for all analytics data access
- [ ] Rate limiting to prevent abuse of expensive analytics calculations

### Analytics Data Quality:
- [ ] Progress calculations validated against manual calculations (>95% accuracy)
- [ ] Budget analytics reflect actual spending data with <1% variance
- [ ] Guest engagement metrics accurately represent RSVP and interaction data
- [ ] Vendor coordination insights align with actual communication history
- [ ] Timeline analytics correctly identify critical path items and deadlines
- [ ] Insight generation provides relevant, actionable recommendations

**✅ Ready for Team A frontend integration and Team E comprehensive analytics API testing**