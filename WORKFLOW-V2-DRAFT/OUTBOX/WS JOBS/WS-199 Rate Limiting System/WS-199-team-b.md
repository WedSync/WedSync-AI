# TEAM B - ROUND 1: WS-199 - Rate Limiting System
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Implement Redis-backed rate limiting engine with subscription tier awareness and abuse detection
**FEATURE ID:** WS-199 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about distributed rate limiting performance and Redis optimization

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/rate-limiting/
cat $WS_ROOT/wedsync/src/lib/rate-limiting/rate-limiter.ts | head -20
cat $WS_ROOT/wedsync/src/lib/rate-limiting/redis-store.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test rate-limiting
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

// Query specific areas relevant to rate limiting
await mcp__serena__search_for_pattern("middleware rate limit redis");
await mcp__serena__find_symbol("rateLimitService", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/lib/");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to rate limiting
# Use Ref MCP to search for:
# - "Redis rate limiting patterns upstash"
# - "Next.js middleware performance"
# - "Supabase database performance optimization"
# - "Rate limiting algorithms sliding window"
```

### C. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing middleware patterns
await mcp__serena__find_referencing_symbols("middleware authentication");
await mcp__serena__search_for_pattern("redis upstash");
await mcp__serena__read_file("$WS_ROOT/wedsync/src/lib/validation/middleware.ts");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR RATE LIMITING ARCHITECTURE

### Backend-Specific Sequential Thinking Patterns

#### Pattern 1: Rate Limiting Performance & Redis Strategy
```typescript
// Before implementing rate limiting engine
mcp__sequential-thinking__sequential_thinking({
  thought: "Rate limiting system needs: Redis for distributed counters, PostgreSQL for configuration and violation logs, subscription tier multipliers (free: 1x, premium: 5x), wedding season adjustments, and abuse detection. Critical performance requirement: <5ms response time for rate limit checks during peak traffic.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Redis architecture: Use sliding window counters with multiple time windows (minute/hour/day), implement pipeline operations for atomic updates, design efficient bucket keys for quick lookups, consider memory optimization for millions of wedding suppliers. Need fallback to PostgreSQL if Redis fails.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Subscription tier logic: Free tier photographers get 400 requests/hour, premium get 2000/hour during wedding season. Need dynamic calculation based on vendor type, subscription status, and seasonal multipliers. Wedding season (May-September) increases limits by 1.5x for all users.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Abuse detection patterns: Track violations per user/IP, implement progressive backoff (1min->5min->15min blocks), detect scraping patterns (>10 req/sec to search endpoints), maintain violation history for escalation. Need to distinguish legitimate bulk operations from abuse.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 5
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Create WedSyncRateLimiter class with Redis primary storage, PostgreSQL backup, middleware integration, comprehensive logging, and monitoring hooks. Include subscription upgrade recommendations in rate limit responses.",
  nextThoughtNeeded: false,
  thoughtNumber: 5,
  totalThoughts: 5
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down rate limiting implementation, track Redis integration progress
   
2. **postgresql-database-expert** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture
   - Mission: Design rate limit tables with optimal indexing and performance
   
3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Ensure rate limiting prevents abuse while maintaining legitimate access
   
4. **performance-optimization-expert** --continuous --pattern-checking --sequential-thinking-quality
   - Mission: Optimize Redis operations for <5ms response times under load
   
5. **test-automation-architect** --tdd-first --coverage-analysis --sequential-thinking-testing
   - Mission: Test rate limiting under various load scenarios and abuse patterns
   
6. **documentation-chronicler** --detailed-evidence --code-examples --sequential-thinking-docs
   - Mission: Document rate limiting configuration and monitoring procedures

**AGENT COORDINATION:** Agents work in parallel but share Redis optimization insights AND performance analysis

## 🎯 TEAM B SPECIALIZATION: Backend/API Focus

**BACKEND/API FOCUS:**
- API endpoints with security validation  
- Database operations and migrations
- withSecureValidation middleware required
- Authentication and rate limiting
- Error handling and logging
- Business logic implementation

## 📋 TECHNICAL SPECIFICATION

**Based on:** `/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-199-rate-limiting-system-technical.md`

**Wedding Industry Context:** During peak wedding season, premium photography suppliers with 25+ couples need 2000 API requests/hour while free accounts get 400/hour. System must prevent competitor scraping while supporting legitimate bulk operations.

**Core Components to Implement:**
1. **WedSyncRateLimiter** class with Redis backend
2. **Subscription tier multiplier** logic (free: 1x, premium: 5x)  
3. **Wedding season adjustments** (1.5x during May-September)
4. **Abuse detection** with progressive backoff
5. **Database migrations** for rate limit configuration and violation tracking

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Primary Deliverables:
- [ ] **Core Rate Limiter Class** (`/src/lib/rate-limiting/rate-limiter.ts`)
- [ ] **Redis Store Integration** (`/src/lib/rate-limiting/redis-store.ts`)
- [ ] **Tier Configuration Logic** (`/src/lib/rate-limiting/tier-configuration.ts`)
- [ ] **Abuse Detection Engine** (`/src/lib/rate-limiting/abuse-detection.ts`)
- [ ] **Database Migration** (rate limit tables with indexes)
- [ ] **API Route Integration** with middleware
- [ ] **Comprehensive Unit Tests** (>90% coverage)

### Database Schema Requirements:
```sql
-- Create comprehensive rate limiting tables
CREATE TABLE rate_limit_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_pattern TEXT UNIQUE NOT NULL,
  requests_per_minute INTEGER NOT NULL DEFAULT 60,
  requests_per_hour INTEGER NOT NULL DEFAULT 1000,
  requests_per_day INTEGER NOT NULL DEFAULT 10000,
  burst_limit INTEGER NOT NULL DEFAULT 10,
  
  -- Subscription tier multipliers
  free_tier_multiplier DECIMAL(3,2) DEFAULT 1.0,
  premium_tier_multiplier DECIMAL(3,2) DEFAULT 5.0,
  enterprise_tier_multiplier DECIMAL(3,2) DEFAULT 10.0,
  
  -- Wedding context
  applies_to_user_types TEXT[] DEFAULT ARRAY['supplier', 'couple'],
  seasonal_multiplier DECIMAL(3,2) DEFAULT 1.0,
  operation_cost INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Violation tracking with wedding industry context
CREATE TABLE rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  endpoint_pattern TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  user_id UUID REFERENCES users(id),
  supplier_id UUID REFERENCES suppliers(id),
  subscription_tier TEXT,
  during_peak_season BOOLEAN DEFAULT FALSE,
  vendor_type TEXT,
  action_taken TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_violations_identifier ON rate_limit_violations(identifier, created_at DESC);
```

## 🔗 DEPENDENCIES

**What you need from other teams:**
- Team C: Redis/Upstash connection configuration
- Team D: Performance monitoring hooks for mobile apps
- Team A: Admin dashboard components for rate limit monitoring

**What others need from you:**
- Rate limiting middleware for all API routes
- Subscription tier validation logic  
- Abuse detection hooks for security alerts

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API ROUTE SECURITY CHECKLIST:
- [ ] **Rate limit checks before any processing** - Fail fast on violations
- [ ] **Secure violation logging** - No sensitive data in logs  
- [ ] **IP-based rate limiting** for unauthenticated requests
- [ ] **User-based rate limiting** for authenticated requests
- [ ] **Progressive penalties** for repeat violators
- [ ] **Redis security** - Proper authentication and encryption
- [ ] **Audit logging** - Log all rate limit violations with context

### REQUIRED SECURITY FILES:
```typescript
// Rate limiting must integrate with existing security
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { getServerSession } from 'next-auth';
import { rateLimitService } from '$WS_ROOT/wedsync/src/lib/rate-limiter';
```

### VALIDATION PATTERN (COPY THIS!):
```typescript
// Middleware integration pattern
export const POST = withSecureValidation(schema, async (request, validatedData) => {
  // Step 1: Check rate limits FIRST
  const rateLimitResult = await rateLimitService.checkRateLimit(request);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ 
      error: 'Rate limit exceeded',
      retryAfter: rateLimitResult.retryAfter,
      upgradeRecommendation: rateLimitResult.upgradeRecommendation
    }, { 
      status: 429,
      headers: {
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
        'Retry-After': rateLimitResult.retryAfter.toString()
      }
    });
  }

  // Step 2: Continue with normal processing
  // ... rest of API logic
});
```

## 📱 CORE IMPLEMENTATION REQUIREMENTS

### 1. Rate Limiting Engine Implementation
```typescript
// /src/lib/rate-limiting/rate-limiter.ts
export class WedSyncRateLimiter {
  private redis: Redis;
  private supabase: any;

  // Wedding industry specific configurations
  private readonly ENDPOINT_CONFIGS = {
    '/api/suppliers/search': {
      limits: { minute: 30, hour: 1000, day: 5000 },
      costs: { computational: 3, bandwidth: 2, storage: 1 },
      weddingContext: { isWeddingSeason: true }
    },
    '/api/forms/submit': {
      limits: { minute: 5, hour: 50, day: 200 },
      costs: { computational: 5, bandwidth: 4, storage: 6 }
    },
    '/api/ai/generate': {
      limits: { minute: 2, hour: 30, day: 100 },
      costs: { computational: 9, bandwidth: 3, storage: 2 },
      requiresPremium: true
    }
  };

  async checkRateLimit(request: RateLimitRequest): Promise<RateLimitResult> {
    // Implement with <5ms response time requirement
  }
}
```

### 2. Redis Store Optimization
```typescript
// /src/lib/rate-limiting/redis-store.ts
export class RedisRateLimitStore {
  // Implement sliding window counters with pipeline operations
  async incrementCounters(identifier: string, endpoint: string): Promise<void> {
    // Use Redis pipeline for atomic operations
  }

  async getCurrentUsage(identifier: string, endpoint: string): Promise<Usage> {
    // Optimized multi-window usage retrieval
  }
}
```

### 3. Subscription Tier Integration
```typescript
// /src/lib/rate-limiting/tier-configuration.ts
export class TierConfiguration {
  private readonly SUBSCRIPTION_MULTIPLIERS = {
    free: { minute: 1.0, hour: 1.0, day: 1.0 },
    basic: { minute: 2.0, hour: 2.5, day: 3.0 },
    premium: { minute: 5.0, hour: 7.0, day: 10.0 },
    enterprise: { minute: 20.0, hour: 25.0, day: 50.0 }
  };

  calculateEffectiveLimits(config: RateLimitConfig, tier: string): EffectiveLimits {
    // Apply tier multipliers with wedding season adjustments
  }
}
```

### 4. Database Migration
```sql
-- Migration: [TIMESTAMP]_ws199_rate_limiting_system.sql
-- Comprehensive rate limiting tables with wedding industry context
-- (Use full schema from technical specification)
```

## 📊 MANDATORY: DATABASE MIGRATION HANDOVER

**⚠️ CRITICAL: Create migration files and send to SQL Expert:**

**File:** `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-199.md`

```markdown
# MIGRATION REQUEST - WS-199 - Rate Limiting System
## Team: Team B
## Round: 1

### Migration Files Created:
- `$WS_ROOT/wedsync/supabase/migrations/[timestamp]_ws199_rate_limiting_system.sql`

### Purpose:
Comprehensive rate limiting infrastructure supporting subscription tiers, abuse detection, and wedding industry context

### Dependencies:
- Requires tables: users, suppliers (existing)
- Creates tables: rate_limit_configurations, rate_limit_violations, rate_limit_buckets, subscription_rate_limits
- Modifies tables: None

### Testing Done:
- [ ] Syntax validated locally
- [ ] Applied to development database
- [ ] Rollback procedure tested

### Special Notes:
- Includes optimized indexes for high-frequency rate limit checks
- Supports wedding season multipliers and vendor-specific limits
- Comprehensive abuse tracking with business context
```

## 🔒 CRITICAL: API INTEGRATION WITH EXISTING MIDDLEWARE

### Integration with withSecureValidation
```typescript
// Modify existing middleware to include rate limiting
// File: /src/lib/validation/middleware.ts

export const withSecureValidation = <T>(
  schema: ZodSchema<T>,
  handler: (request: NextRequest, data: T) => Promise<NextResponse>
) => {
  return async (request: NextRequest) => {
    try {
      // Step 1: Rate limiting check FIRST
      const rateLimitResult = await checkRateLimit({
        identifier: getUserIdentifier(request),
        endpoint: getEndpointFromRequest(request),
        subscriptionTier: await getUserSubscriptionTier(request),
        userType: await getUserType(request)
      });

      if (!rateLimitResult.allowed) {
        return createRateLimitResponse(rateLimitResult);
      }

      // Step 2: Existing validation logic
      const body = await request.json();
      const validatedData = schema.parse(body);
      
      // Step 3: Execute handler
      return await handler(request, validatedData);
      
    } catch (error) {
      // Enhanced error handling with rate limit context
      return handleErrorWithRateLimit(error, request);
    }
  };
};
```

## 🎯 WEDDING INDUSTRY SPECIFIC REQUIREMENTS

### 1. Vendor Type Considerations
```typescript
// Different vendors have different API usage patterns
const VENDOR_TYPE_LIMITS = {
  photographer: {
    portfolioUploads: { minute: 5, hour: 30, day: 200 },
    clientSearch: { minute: 20, hour: 500, day: 2000 }
  },
  venue: {
    availabilityChecks: { minute: 10, hour: 200, day: 1000 },
    bookingUpdates: { minute: 3, hour: 50, day: 300 }
  },
  caterer: {
    menuUpdates: { minute: 5, hour: 100, day: 500 },
    dietaryQueries: { minute: 15, hour: 300, day: 1500 }
  }
};
```

### 2. Wedding Season Logic
```typescript
// Seasonal multiplier calculation
private isWeddingSeason(): boolean {
  const month = new Date().getMonth() + 1; // 1-12
  return month >= 5 && month <= 9; // May through September
}

private getSeasonalMultiplier(): number {
  if (this.isWeddingSeason()) return 1.5; // Higher limits during peak
  const month = new Date().getMonth() + 1;
  if ([11, 12, 1].includes(month)) return 0.8; // Lower during holidays
  return 1.0; // Normal off-season
}
```

### 3. Abuse Protection for Wedding Data
```typescript
// Protect sensitive wedding vendor data from scraping
const ABUSE_DETECTION_PATTERNS = {
  rapidSearch: {
    pattern: '>10 requests/second to /api/suppliers/search',
    action: 'temporary_block',
    duration: '15min'
  },
  portfolioScraping: {
    pattern: '>50 portfolio views/hour without engagement',
    action: 'captcha_challenge'
  },
  bulkDataAccess: {
    pattern: 'Sequential ID enumeration on client endpoints',
    action: 'account_review'
  }
};
```

## 🔧 IMPLEMENTATION CHECKLIST

### Phase 1: Core Rate Limiting (Hours 0-1)
- [ ] Create WedSyncRateLimiter class with Redis integration
- [ ] Implement sliding window algorithm with multiple time windows
- [ ] Add subscription tier multiplier logic
- [ ] Create basic rate limit checking functionality

### Phase 2: Wedding Industry Features (Hours 1-2)  
- [ ] Add vendor-type specific rate limiting
- [ ] Implement wedding season multipliers
- [ ] Create abuse detection patterns
- [ ] Add upgrade recommendation logic

### Phase 3: Integration & Testing (Hours 2-3)
- [ ] Integrate with existing middleware pipeline
- [ ] Create database migrations with optimized indexes
- [ ] Implement comprehensive error handling
- [ ] Write unit tests covering all scenarios
- [ ] Performance test under load simulation

## 💾 WHERE TO SAVE YOUR WORK

**Code Files:**
- `/src/lib/rate-limiting/rate-limiter.ts` - Main rate limiting engine
- `/src/lib/rate-limiting/redis-store.ts` - Redis operations optimized for performance  
- `/src/lib/rate-limiting/tier-configuration.ts` - Subscription tier logic
- `/src/lib/rate-limiting/abuse-detection.ts` - Abuse pattern detection
- `/src/lib/validation/middleware.ts` - Updated middleware with rate limiting

**Migration Files:**  
- `/supabase/migrations/[timestamp]_ws199_rate_limiting_system.sql`

**Test Files:**
- `/tests/rate-limiting/rate-limiter.test.ts` - Core functionality tests
- `/tests/rate-limiting/redis-store.test.ts` - Redis integration tests
- `/tests/rate-limiting/abuse-detection.test.ts` - Abuse pattern tests

## ⚠️ CRITICAL WARNINGS

### Performance Critical:
- Rate limit checks must complete in <5ms (test with 1000 concurrent requests)
- Redis pipeline operations required for atomic updates
- Implement connection pooling for Redis to prevent connection exhaustion
- Monitor memory usage - Redis buckets must auto-expire properly

### Wedding Season Considerations:
- May-September traffic increases 300% - test scaling
- Photographer bulk uploads happen in batches - don't block legitimate usage
- Wedding day coordination requires real-time responsiveness

### Security Critical:
- Never expose internal rate limiting logic to client responses
- Log violations with business context for pattern analysis
- Implement progressive backoff to discourage abuse
- Provide clear upgrade paths in rate limit messages

## 🏁 COMPLETION CHECKLIST (WITH SECURITY VERIFICATION)

### Code Security Verification:
```bash
# Verify rate limiting middleware integration
grep -r "checkRateLimit\|rateLimitService" $WS_ROOT/wedsync/src/app/api/
# Should show integration in key endpoints

# Check for proper Redis authentication
grep -r "UPSTASH_REDIS" $WS_ROOT/wedsync/src/lib/rate-limiting/
# Should show secure Redis connection setup

# Verify no hardcoded rate limits
grep -r "requests.*=.*[0-9]" $WS_ROOT/wedsync/src/lib/rate-limiting/
# Should use configuration-driven limits only
```

### Final Security Checklist:
- [ ] Redis connection uses authentication tokens
- [ ] Rate limit violations logged with user context
- [ ] No sensitive data exposed in rate limit responses  
- [ ] Subscription tier validation prevents bypassing
- [ ] Abuse detection patterns active and tested
- [ ] Progressive backoff implemented correctly
- [ ] TypeScript compiles with NO errors
- [ ] All tests pass including load testing
- [ ] Database migration tested and optimized

### Performance Verification:
```bash
# Test rate limiting performance
npm test rate-limiting-performance
# Must show: <5ms average response time

# Load test with concurrent requests  
npm run test:load -- --feature=rate-limiting
# Must handle 1000 concurrent checks
```

### Wedding Industry Compliance:
- [ ] Vendor-specific rate limits configured correctly
- [ ] Wedding season multipliers tested and active
- [ ] Photographer bulk upload scenarios supported
- [ ] Abuse patterns protect vendor portfolio data
- [ ] Subscription upgrade paths provide clear value

## 📊 SUCCESS METRICS

### Technical Performance:
- Rate limit check latency: <5ms (95th percentile)
- Redis connection efficiency: >99.9% uptime
- Memory usage: <100MB for 10k active rate limit buckets
- Database query performance: <2ms for violation logging

### Business Impact:
- Reduced API abuse by >90% (measured via violation patterns)
- Premium tier conversions from rate limit messaging: >5%
- Wedding season traffic handling: 300% increase supported
- Zero false positive blocks for legitimate bulk operations

---

**EXECUTE IMMEDIATELY - Focus on Redis performance optimization and wedding industry context!**