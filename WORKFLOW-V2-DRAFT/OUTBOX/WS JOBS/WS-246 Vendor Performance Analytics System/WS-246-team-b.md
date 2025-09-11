# TEAM B - ROUND 1: WS-246 - Vendor Performance Analytics System
## 2025-09-03 - Development Round 1

**YOUR MISSION:** Implement backend analytics engine and secure API endpoints for vendor performance data processing
**FEATURE ID:** WS-246 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about analytics data processing, scoring algorithms, and secure API design

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/app/api/analytics/
cat $WS_ROOT/wedsync/src/app/api/analytics/vendor-performance/route.ts | head-20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test analytics-api
# MUST show: "All tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧠 SEQUENTIAL THINKING FOR BACKEND ANALYTICS

### Backend-Specific Sequential Thinking Patterns

#### Pattern 1: Analytics Architecture Analysis
```typescript
// Before building analytics backend
mcp__sequential-thinking__sequential_thinking({
  thought: "This analytics system needs: performance data collection from multiple sources, scoring algorithms for vendor evaluation, aggregation services for dashboard metrics, and secure API endpoints with proper authentication. Each component handles sensitive vendor data.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Data flow analysis: Raw vendor interactions → data aggregation → scoring algorithms → cached results → API endpoints. Need to handle booking data, response times, customer feedback, and wedding completion rates. Consider batch processing for heavy calculations.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "API security considerations: Vendor performance data is sensitive business information. Need authentication on all endpoints, rate limiting for analytics queries, input validation on all filters, and audit logging for compliance. Consider API key authentication for external integrations.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding industry performance metrics: Response time to inquiries, booking conversion rates, wedding day execution quality, client satisfaction scores, vendor reliability during peak wedding seasons. Algorithms should weight wedding-critical metrics higher.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP (Backend Focus)

### A. SERENA BACKEND PATTERN DISCOVERY
```typescript
// Find existing backend patterns to follow
await mcp__serena__search_for_pattern("api route handler validation authentication");
await mcp__serena__find_symbol("withSecureValidation rateLimitService", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/app/api/");

// Analyze similar API endpoints for consistency
await mcp__serena__find_referencing_symbols("getServerSession createRouteHandler");
```

### B. API DEVELOPMENT DOCUMENTATION
```typescript
// Load API development patterns
# Use Ref MCP to search for:
# - "Next.js App Router API routes patterns"
# - "Supabase authentication server-side"
# - "PostgreSQL analytics queries optimization"
# - "API security validation middleware"
```

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - rateLimitService.checkRateLimit()
- [ ] **SQL injection prevention** - secureStringSchema for all strings
- [ ] **XSS prevention** - HTML encode all output
- [ ] **CSRF protection** - Automatic with Next.js App Router
- [ ] **Error messages sanitized** - Never leak database/system errors
- [ ] **Audit logging** - Log critical operations with user context

### Security Implementation Template:
```typescript
// MANDATORY: Every API route must follow this pattern
import { withSecureValidation } from '@/lib/middleware/security';
import { rateLimitService } from '@/lib/services/rate-limit';
import { getServerSession } from 'next-auth';
import { z } from 'zod';

const analyticsQuerySchema = z.object({
  vendorIds: z.array(z.string().uuid()).max(10),
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime()
  }),
  metrics: z.array(z.enum(['response_time', 'booking_rate', 'satisfaction']))
});

export async function GET(request: Request) {
  // Step 1: Rate limiting
  await rateLimitService.checkRateLimit(request, 'analytics', 60, 5);
  
  // Step 2: Authentication
  const session = await getServerSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Step 3: Validation
  const result = await withSecureValidation(request, analyticsQuerySchema);
  if (!result.success) {
    return Response.json({ error: 'Invalid input' }, { status: 400 });
  }
  
  // Step 4: Business logic with error handling
  try {
    // Your analytics logic here
  } catch (error) {
    // Sanitize error messages
    return Response.json({ error: 'Analytics processing failed' }, { status: 500 });
  }
}
```

## 🎯 TEAM B SPECIALIZATION: BACKEND/API FOCUS

**BACKEND/API FOCUS:**
- Analytics API endpoints with comprehensive security validation
- Performance calculation algorithms for vendor scoring
- Database operations and data aggregation services
- Authentication and rate limiting implementation
- Error handling and audit logging
- Business logic implementation for analytics
- Database migration creation for analytics tables

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Analytics API Endpoints:
- [ ] `/api/analytics/vendor-performance/` - Main analytics data API
- [ ] `/api/analytics/scoring/` - Vendor scoring algorithm endpoints
- [ ] `/api/analytics/benchmarks/` - Industry benchmark comparison API
- [ ] `/api/analytics/metrics/` - Real-time metrics collection API
- [ ] `/api/analytics/export/` - Analytics data export functionality

### Backend Services:
- [ ] `VendorAnalyticsService.ts` - Core performance calculation engine
- [ ] `DataAggregationService.ts` - Metrics collection and processing
- [ ] `PerformanceScoringAlgorithms.ts` - Vendor scoring algorithms
- [ ] `AnalyticsCacheService.ts` - Performance optimization with caching
- [ ] `AnalyticsAuditLogger.ts` - Compliance and audit logging

### Wedding-Specific Analytics:
- [ ] Response time calculation for wedding inquiries
- [ ] Booking success rate algorithms
- [ ] Wedding day reliability scoring
- [ ] Seasonal performance trend analysis
- [ ] Customer satisfaction aggregation

### Database Schema (Create Migration):
```sql
-- Create analytics tables migration
CREATE TABLE vendor_performance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES organizations(id) NOT NULL,
    metric_type VARCHAR(50) NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    calculation_date DATE NOT NULL,
    wedding_season BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_performance_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    vendor_id UUID REFERENCES organizations(id) NOT NULL,
    overall_score DECIMAL(5,2) NOT NULL,
    response_score DECIMAL(5,2) NOT NULL,
    booking_score DECIMAL(5,2) NOT NULL,
    satisfaction_score DECIMAL(5,2) NOT NULL,
    reliability_score DECIMAL(5,2) NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, calculated_at::date)
);

CREATE INDEX idx_vendor_performance_metrics_vendor_date 
ON vendor_performance_metrics(vendor_id, calculation_date DESC);

CREATE INDEX idx_vendor_performance_scores_vendor 
ON vendor_performance_scores(vendor_id, calculated_at DESC);
```

## 💾 WHERE TO SAVE YOUR WORK
- **API Routes**: `$WS_ROOT/wedsync/src/app/api/analytics/`
- **Services**: `$WS_ROOT/wedsync/src/lib/services/analytics/`
- **Types**: `$WS_ROOT/wedsync/src/types/analytics.ts`
- **Tests**: `$WS_ROOT/wedsync/tests/api/analytics/`
- **Migration**: `$WS_ROOT/wedsync/supabase/migrations/YYYYMMDDHHMMSS_vendor_analytics_system.sql`
- **Evidence Package**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/WS-246-analytics-backend-evidence.md`

## 🏁 COMPLETION CHECKLIST
- [ ] Files created and verified to exist
- [ ] TypeScript compilation successful
- [ ] All tests passing (>90% coverage)
- [ ] Security requirements implemented (all API routes secured)
- [ ] Rate limiting applied to all endpoints
- [ ] Authentication checks on all protected routes
- [ ] Input validation with Zod schemas
- [ ] Error handling and sanitized error messages
- [ ] Audit logging for compliance
- [ ] Database migration created and tested
- [ ] Evidence package prepared
- [ ] Senior dev review prompt created

## 📊 SUCCESS METRICS
- [ ] API endpoints respond in <200ms (p95)
- [ ] Analytics calculations are 99.9% accurate
- [ ] All security validations pass automated testing
- [ ] Rate limiting prevents abuse (5 requests/minute)
- [ ] Database queries optimized with proper indexing
- [ ] Error handling covers all edge cases

---

**EXECUTE IMMEDIATELY - Focus on secure, high-performance analytics backend with wedding industry-specific algorithms!**