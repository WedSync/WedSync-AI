# TEAM E - ROUND 1: WS-199 - Rate Limiting System
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Comprehensive testing and documentation of distributed rate limiting system with wedding industry scenarios
**FEATURE ID:** WS-199 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about load testing wedding peak traffic and documenting complex distributed systems

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/tests/rate-limiting/
cat $WS_ROOT/wedsync/tests/rate-limiting/load-testing.test.ts | head -20
cat $WS_ROOT/wedsync/docs/rate-limiting/admin-guide.md | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test rate-limiting -- --coverage
# MUST show: "All tests passing" + >90% coverage
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query testing patterns for rate limiting
await mcp__serena__search_for_pattern("test rate limit load performance");
await mcp__serena__find_symbol("describe it expect", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/tests/");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to testing distributed systems
# Use Ref MCP to search for:
# - "Jest load testing rate limiting"
# - "Playwright API rate limiting testing"
# - "Redis testing performance benchmarks"
# - "Documentation patterns technical writing"
```

### C. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Use Serena to understand existing testing patterns
await mcp__serena__find_referencing_symbols("test suite coverage performance");
await mcp__serena__search_for_pattern("playwright test browser");
await mcp__serena__read_file("$WS_ROOT/wedsync/tests/utils/test-helpers.ts");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR TESTING STRATEGY

### QA-Specific Sequential Thinking Patterns

#### Pattern 1: Comprehensive Rate Limiting Testing Strategy
```typescript
// Before creating comprehensive test plans
mcp__sequential-thinking__sequential_thinking({
  thought: "Rate limiting testing requires: Unit tests for core rate limiting logic, integration tests for Redis cluster coordination, load tests simulating wedding peak season traffic (300% normal load), E2E tests for user experience across subscription tiers, security tests for abuse prevention, and performance benchmarks for <5ms response times.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific test scenarios: Photography supplier bulk uploading 200 images while couples submit consultation forms, wedding day coordination with multiple vendors accessing same couple data, abuse detection testing with competitor data scraping patterns, subscription tier testing with upgrade/downgrade scenarios during active usage.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Load testing complexity: Need to simulate 500+ concurrent suppliers during peak season Saturday evening, test Redis cluster performance under distributed load, verify rate limiting doesn't become bottleneck under wedding traffic spikes, and ensure graceful degradation when Redis cluster nodes fail.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Documentation requirements: Admin guides for configuring vendor-specific rate limits, troubleshooting guides for Redis cluster issues, user guides explaining rate limit messages to couples and suppliers, API documentation for developers, and runbooks for managing abuse incidents during wedding season.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security testing focus: Verify rate limiting prevents data scraping attacks, test bypass attempts using multiple IPs/accounts, validate progressive backoff effectiveness, ensure rate limiting doesn't leak sensitive wedding data, and confirm subscription tier validation prevents privilege escalation.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Quality assurance process: Create comprehensive test matrix covering all user types, subscription tiers, and wedding scenarios. Build automated testing pipeline, establish performance benchmarks, create documentation with real usage examples, and implement continuous monitoring of rate limiting effectiveness in production.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with testing-focused capabilities:

1. **task-tracker-coordinator** --think-hard --testing-focus --track-coverage --sequential-thinking-enabled
   - Mission: Track test coverage across all rate limiting components
   
2. **test-automation-architect** --think-ultra-hard --comprehensive-testing --sequential-thinking-for-architecture
   - Mission: Design load testing scenarios for wedding peak traffic patterns
   
3. **security-compliance-officer** --think-ultra-hard --security-testing --sequential-thinking-security
   - Mission: Test abuse prevention and rate limiting security measures
   
4. **performance-optimization-expert** --continuous --performance-benchmarking --sequential-thinking-quality
   - Mission: Establish performance benchmarks and validate <5ms requirement
   
5. **playwright-visual-testing-specialist** --visual-testing --mobile-testing --sequential-thinking-testing
   - Mission: Test rate limiting UX across devices and browsers with visual validation
   
6. **documentation-chronicler** --detailed-evidence --comprehensive-docs --sequential-thinking-docs
   - Mission: Create complete documentation suite for rate limiting system

**AGENT COORDINATION:** Comprehensive testing approach with evidence-based validation

## 🎯 TEAM E SPECIALIZATION: QA/Testing & Documentation Focus

**QA/TESTING & DOCUMENTATION:**
- Comprehensive test suite (>90% coverage)
- E2E testing with Playwright MCP
- Documentation with screenshots  
- Bug tracking and resolution
- Performance benchmarking
- Cross-browser compatibility

## 📋 TECHNICAL SPECIFICATION

**Based on:** `/WORKFLOW-V2-DRAFT/OUTBOX/feature-designer/WS-199-rate-limiting-system-technical.md`

**Testing Context:** Rate limiting system handles critical wedding coordination traffic. Must be tested under peak wedding season load, validated for security against abuse, and documented for both technical and non-technical stakeholders.

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Primary Testing Components:
- [ ] **Comprehensive Test Suite** (>90% coverage)
- [ ] **Load Testing Framework** for wedding peak traffic simulation
- [ ] **Security Testing Suite** for abuse prevention validation
- [ ] **Cross-Browser Testing** with Playwright MCP
- [ ] **Performance Benchmarks** with <5ms requirement validation
- [ ] **User Documentation** with wedding industry examples
- [ ] **Admin Documentation** for rate limiting management
- [ ] **API Documentation** for developers

### 1. Comprehensive Unit Testing
```typescript
// /tests/rate-limiting/rate-limiter.test.ts
import { WedSyncRateLimiter } from '$WS_ROOT/wedsync/src/lib/rate-limiting/rate-limiter';
import { Redis } from '@upstash/redis';

describe('WedSync Rate Limiting System', () => {
  let rateLimiter: WedSyncRateLimiter;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = {
      incr: jest.fn(),
      expire: jest.fn(),
      get: jest.fn(),
      pipeline: jest.fn()
    } as any;
    
    rateLimiter = new WedSyncRateLimiter();
    (rateLimiter as any).redis = mockRedis;
  });

  describe('Subscription Tier Rate Limiting', () => {
    it('should apply correct multipliers for subscription tiers', async () => {
      // Test: Free tier gets 1x limits, Premium gets 5x limits
      const freeUserRequest = {
        identifier: 'free-user-123',
        endpoint: '/api/suppliers/search',
        subscriptionTier: 'free',
        userType: 'supplier' as const
      };

      const premiumUserRequest = {
        ...freeUserRequest,
        identifier: 'premium-user-456',
        subscriptionTier: 'premium'
      };

      mockRedis.get.mockResolvedValue('25'); // Current usage

      const freeResult = await rateLimiter.checkRateLimit(freeUserRequest);
      const premiumResult = await rateLimiter.checkRateLimit(premiumUserRequest);

      // Free tier: 30 requests/minute base limit
      expect(freeResult.remaining).toBe(5); // 30 - 25 = 5
      
      // Premium tier: 150 requests/minute (30 * 5x multiplier)  
      expect(premiumResult.remaining).toBe(125); // 150 - 25 = 125
    });

    it('should apply wedding season multipliers correctly', async () => {
      // Mock wedding season (May-September)
      const originalDate = Date;
      global.Date = class extends Date {
        constructor() {
          super('2025-07-15'); // July - peak wedding season
        }
        static now() {
          return new originalDate('2025-07-15').getTime();
        }
        getMonth() {
          return 6; // July (0-based index)
        }
      } as any;

      const request = {
        identifier: 'supplier-123',
        endpoint: '/api/portfolio/upload', 
        subscriptionTier: 'basic',
        userType: 'supplier' as const,
        isWeddingSeason: true
      };

      mockRedis.get.mockResolvedValue('0');
      
      const result = await rateLimiter.checkRateLimit(request);
      
      // Should apply 1.5x wedding season multiplier to basic tier (2x) limits
      // Base: 20/hour, Basic: 40/hour, Wedding Season: 60/hour
      expect(result.remaining).toBeGreaterThan(50);
      
      global.Date = originalDate; // Restore original Date
    });
  });

  describe('Vendor Type Specific Limits', () => {
    it('should apply photographer-specific limits for portfolio uploads', async () => {
      const photographerRequest = {
        identifier: 'photographer-789',
        endpoint: '/api/uploads/portfolio',
        subscriptionTier: 'premium',
        userType: 'supplier' as const,
        vendorType: 'photographer'
      };

      mockRedis.get.mockResolvedValue('2');

      const result = await rateLimiter.checkRateLimit(photographerRequest);
      
      // Photographers get higher upload limits (burst: 5)
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should handle venue availability checking with appropriate limits', async () => {
      // Test venue-specific rate limiting for availability checks
    });
  });

  describe('Abuse Detection and Prevention', () => {
    it('should detect rapid search patterns as potential scraping', async () => {
      const abuseRequest = {
        identifier: 'suspicious-user-999',
        endpoint: '/api/suppliers/search',
        subscriptionTier: 'free',
        userType: 'supplier' as const
      };

      // Simulate rapid requests
      mockRedis.get.mockResolvedValue('25'); // At limit
      
      const result = await rateLimiter.checkRateLimit(abuseRequest);
      
      expect(result.allowed).toBe(false);
      expect(result.violationType).toBe('minute_exceeded');
      expect(result.upgradeRecommendation).toBeDefined();
    });

    it('should implement progressive backoff for repeat violators', async () => {
      // Test escalating penalties for repeated violations
    });
  });

  describe('Performance Requirements', () => {
    it('should complete rate limit checks within 5ms', async () => {
      const startTime = performance.now();
      
      await rateLimiter.checkRateLimit({
        identifier: 'test-user',
        endpoint: '/api/test',
        subscriptionTier: 'free',
        userType: 'couple' as const
      });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(5); // <5ms requirement
    });
  });
});
```

### 2. Load Testing for Wedding Peak Traffic
```typescript
// /tests/rate-limiting/load-testing.test.ts
describe('Wedding Peak Season Load Testing', () => {
  it('should handle 500 concurrent suppliers during peak traffic', async () => {
    // Simulate Saturday evening peak wedding season traffic
    const concurrentRequests = 500;
    const supplierRequests = Array.from({ length: concurrentRequests }, (_, i) => ({
      identifier: `supplier-${i}`,
      endpoint: '/api/clients/update',
      subscriptionTier: i % 3 === 0 ? 'premium' : 'free',
      userType: 'supplier' as const,
      vendorType: ['photographer', 'venue', 'caterer'][i % 3]
    }));

    const promises = supplierRequests.map(request => 
      rateLimiter.checkRateLimit(request)
    );

    const startTime = performance.now();
    const results = await Promise.allSettled(promises);
    const endTime = performance.now();

    // Performance validation
    expect(endTime - startTime).toBeLessThan(100); // <100ms for 500 concurrent checks
    
    // Success rate validation  
    const successfulChecks = results.filter(r => r.status === 'fulfilled').length;
    expect(successfulChecks / concurrentRequests).toBeGreaterThan(0.95); // >95% success rate
    
    // Rate limiting validation
    const allowedRequests = results
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as any).value.allowed);
    
    const premiumAllowed = allowedRequests.filter((_, i) => i % 3 === 0);
    const freeAllowed = allowedRequests.filter((_, i) => i % 3 !== 0);
    
    // Premium users should have higher success rate
    expect(premiumAllowed.filter(Boolean).length / premiumAllowed.length)
      .toBeGreaterThan(freeAllowed.filter(Boolean).length / freeAllowed.length);
  });

  it('should maintain Redis performance under sustained load', async () => {
    // Test Redis cluster performance with sustained wedding season traffic
    const testDuration = 60000; // 1 minute test
    const requestsPerSecond = 50;
    const totalRequests = (testDuration / 1000) * requestsPerSecond;

    let completedRequests = 0;
    let totalLatency = 0;

    const startTime = Date.now();
    
    const testInterval = setInterval(async () => {
      const requestPromises = Array.from({ length: requestsPerSecond }, () => {
        const requestStart = performance.now();
        
        return rateLimiter.checkRateLimit({
          identifier: `load-test-${Math.random()}`,
          endpoint: '/api/suppliers/search',
          subscriptionTier: 'free',
          userType: 'supplier'
        }).then(result => {
          completedRequests++;
          totalLatency += performance.now() - requestStart;
          return result;
        });
      });

      await Promise.all(requestPromises);
      
      if (Date.now() - startTime >= testDuration) {
        clearInterval(testInterval);
      }
    }, 1000);

    // Wait for test completion
    await new Promise(resolve => setTimeout(resolve, testDuration + 1000));

    // Validate performance metrics
    const averageLatency = totalLatency / completedRequests;
    expect(averageLatency).toBeLessThan(5); // <5ms average
    expect(completedRequests).toBeGreaterThan(totalRequests * 0.95); // >95% completion rate
  });
});
```

### 3. Security Testing Suite
```typescript
// /tests/rate-limiting/security-testing.test.ts
describe('Rate Limiting Security Testing', () => {
  it('should prevent rate limit bypass through multiple endpoints', async () => {
    const attacker = {
      identifier: 'attacker-ip-192.168.1.100',
      subscriptionTier: 'free',
      userType: 'supplier' as const
    };

    // Try to bypass limits using different endpoints
    const bypassAttempts = [
      '/api/suppliers/search',
      '/api/suppliers/browse', 
      '/api/suppliers/find',
      '/api/suppliers/list'
    ];

    // Exhaust rate limit on first endpoint
    for (let i = 0; i < 35; i++) {
      await rateLimiter.checkRateLimit({
        ...attacker,
        endpoint: '/api/suppliers/search'
      });
    }

    // Attempt bypass on other endpoints
    const bypassResults = await Promise.all(
      bypassAttempts.slice(1).map(endpoint =>
        rateLimiter.checkRateLimit({ ...attacker, endpoint })
      )
    );

    // Should be blocked on related endpoints too
    expect(bypassResults.every(result => !result.allowed)).toBe(true);
  });

  it('should detect and prevent wedding vendor data scraping patterns', async () => {
    // Simulate competitor scraping vendor portfolios
    const scraperPattern = {
      identifier: 'scraper-bot-001',
      subscriptionTier: 'free',
      userType: 'supplier' as const
    };

    // Rapid sequential vendor profile requests (scraping pattern)
    const scrapingRequests = Array.from({ length: 50 }, (_, i) => ({
      ...scraperPattern,
      endpoint: `/api/suppliers/${1000 + i}/portfolio`
    }));

    const results = await Promise.all(
      scrapingRequests.map(req => rateLimiter.checkRateLimit(req))
    );

    // Should detect and block scraping after pattern detection
    const blockedCount = results.filter(r => !r.allowed).length;
    expect(blockedCount).toBeGreaterThan(30); // Majority should be blocked

    // Should log violation for security review
    const violations = await mockSupabase
      .from('rate_limit_violations')
      .select()
      .eq('identifier', 'scraper-bot-001');
    
    expect(violations.data.length).toBeGreaterThan(0);
  });

  it('should validate subscription tier limits are tamper-proof', async () => {
    // Attempt to bypass subscription tier validation
    const tierBypassAttempt = {
      identifier: 'free-user-trying-premium',
      endpoint: '/api/ai/generate',
      subscriptionTier: 'premium', // Claiming premium but actually free
      userType: 'supplier' as const,
      actualTierFromDb: 'free' // What database says
    };

    const result = await rateLimiter.checkRateLimit(tierBypassAttempt);
    
    // Should use actual database tier, not claimed tier
    expect(result.allowed).toBe(false); // AI endpoint requires premium
    expect(result.upgradeRecommendation).toBeDefined();
  });
});
```

### 4. E2E Testing with Playwright MCP
```typescript
// /tests/rate-limiting/e2e-playwright.test.ts
describe('Rate Limiting E2E User Experience', () => {
  it('should show clear rate limit indicators to suppliers', async () => {
    // Test supplier dashboard rate limiting UX
    await mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/dashboard/clients'
    });

    // Trigger rate limiting by making rapid requests
    for (let i = 0; i < 25; i++) {
      await page.click('[data-testid="search-suppliers-btn"]');
      await page.waitForTimeout(100);
    }

    // Should show rate limit indicator
    const rateLimitIndicator = await mcp__playwright__browser_snapshot();
    expect(rateLimitIndicator).toContain('API Usage');
    expect(rateLimitIndicator).toContain('requests remaining');

    // Take screenshot for documentation
    await mcp__playwright__browser_take_screenshot({
      filename: 'rate-limit-supplier-dashboard.png',
      fullPage: false
    });
  });

  it('should provide helpful messaging for couples on WedMe platform', async () => {
    // Test couple experience when rate limited
    await mcp__playwright__browser_navigate({
      url: 'http://localhost:3000/wedme/dashboard'
    });

    // Simulate rapid task updates (wedding coordination)
    for (let i = 0; i < 15; i++) {
      await page.click('[data-testid="update-task-status"]');
      await page.waitForTimeout(50);
    }

    // Should show wedding-friendly rate limit message
    const notification = await page.waitForSelector('[data-testid="rate-limit-toast"]');
    const message = await notification.textContent();
    
    expect(message).toContain('wedding');
    expect(message).toContain('coordination');
    expect(message).not.toContain('API'); // User-friendly language

    await mcp__playwright__browser_take_screenshot({
      filename: 'rate-limit-couple-experience.png'
    });
  });

  it('should work correctly across mobile devices', async () => {
    const mobileDevices = [
      { width: 375, height: 667, name: 'iPhone SE' },
      { width: 414, height: 896, name: 'iPhone 11' },
      { width: 360, height: 800, name: 'Galaxy S20' }
    ];

    for (const device of mobileDevices) {
      await mcp__playwright__browser_resize({
        width: device.width,
        height: device.height
      });

      // Test rate limiting UX on mobile device
      await page.goto('http://localhost:3000/dashboard');
      
      // Trigger rate limiting
      for (let i = 0; i < 20; i++) {
        await page.tap('[data-testid="quick-action-btn"]');
      }

      // Verify mobile-optimized rate limit indicator appears
      const mobileIndicator = await page.waitForSelector('.mobile-rate-limit-indicator');
      expect(mobileIndicator).toBeTruthy();

      // Screenshot for each device  
      await mcp__playwright__browser_take_screenshot({
        filename: `rate-limit-${device.name.toLowerCase().replace(' ', '-')}.png`
      });
    }
  });
});
```

### 5. Performance Benchmarking
```typescript
// /tests/rate-limiting/performance-benchmarks.test.ts
describe('Rate Limiting Performance Benchmarks', () => {
  it('should meet 5ms response time requirement under load', async () => {
    const iterations = 1000;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      
      await rateLimiter.checkRateLimit({
        identifier: `perf-test-${i}`,
        endpoint: '/api/test',
        subscriptionTier: 'free',
        userType: 'supplier'
      });
      
      const endTime = performance.now();
      latencies.push(endTime - startTime);
    }

    // Calculate performance metrics
    const averageLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
    const p95Latency = latencies.sort((a, b) => a - b)[Math.floor(latencies.length * 0.95)];
    const maxLatency = Math.max(...latencies);

    // Validate performance requirements
    expect(averageLatency).toBeLessThan(5); // <5ms average
    expect(p95Latency).toBeLessThan(10); // <10ms 95th percentile  
    expect(maxLatency).toBeLessThan(50); // <50ms maximum

    console.log('Performance Benchmarks:', {
      averageLatency: `${averageLatency.toFixed(2)}ms`,
      p95Latency: `${p95Latency.toFixed(2)}ms`, 
      maxLatency: `${maxLatency.toFixed(2)}ms`
    });
  });

  it('should maintain performance with Redis cluster operations', async () => {
    // Test distributed Redis performance across edge locations
  });
});
```

## 📚 COMPREHENSIVE DOCUMENTATION REQUIREMENTS

### 1. Admin Documentation
```markdown
<!-- /docs/rate-limiting/admin-guide.md -->
# Rate Limiting System - Administrator Guide

## Overview
The WedSync rate limiting system protects the platform from abuse while ensuring legitimate wedding coordination activities proceed smoothly.

## Monitoring Dashboard
Access real-time rate limiting metrics at `/dashboard/admin/rate-limits`

### Key Metrics to Monitor:
- **Request Volume**: Requests per minute across all endpoints
- **Violation Patterns**: Unusual abuse attempts or scraping activity  
- **Subscription Tier Usage**: How different tiers utilize their limits
- **Wedding Season Impact**: Traffic multipliers during peak season

## Configuring Rate Limits

### Endpoint-Specific Configuration:
```typescript
// Common endpoints and their limits
const endpointConfig = {
  '/api/suppliers/search': {
    free: 30, // requests per minute
    premium: 150,
    wedding_season_multiplier: 1.5
  },
  '/api/uploads/portfolio': {
    free: 5,
    premium: 25,
    vendor_type: 'photographer' // Special limits for photographers
  }
};
```

### Subscription Tier Multipliers:
- **Free Tier**: 1x base limits (baseline)
- **Basic Tier**: 2x base limits  
- **Premium Tier**: 5x base limits
- **Enterprise Tier**: 10x base limits

## Handling Abuse Incidents

### Detecting Abuse Patterns:
1. **Rapid Search Patterns**: >10 requests/second to supplier search
2. **Portfolio Scraping**: Sequential portfolio access without engagement
3. **Data Enumeration**: Systematic ID-based data access attempts

### Response Procedures:
1. **Automatic**: Progressive backoff (1min → 5min → 15min)
2. **Manual Review**: Account suspension for persistent violators
3. **Escalation**: Contact security team for sophisticated attacks
```

### 2. User Documentation  
```markdown
<!-- /docs/rate-limiting/user-guide.md -->
# API Usage and Rate Limits - User Guide

## Understanding Your API Limits

WedSync rate limiting ensures fair access to platform features for all users during busy wedding seasons.

### For Wedding Suppliers

Your API usage limits depend on your subscription tier:

#### Free Plan:
- **Client Management**: 30 requests/minute, 1,000/hour
- **Portfolio Updates**: 5 uploads/minute, 50/hour  
- **Supplier Search**: 20 searches/minute, 400/hour

#### Premium Plan:
- **Client Management**: 150 requests/minute, 5,000/hour
- **Portfolio Updates**: 25 uploads/minute, 250/hour
- **Supplier Search**: 100 searches/minute, 2,000/hour

### For Couples (WedMe Platform)

#### Wedding Coordination:
- **Task Updates**: 15 actions/minute, 200/hour
- **Vendor Messages**: 10 messages/minute, 100/hour
- **Guest List Updates**: 8 updates/minute, 100/hour

#### Planning Activities:
- **Supplier Browsing**: 30 searches/minute, 500/hour  
- **Photo Viewing**: 50 views/minute, 800/hour

### What Happens When You Reach Your Limits?

1. **Temporary Pause**: System asks you to wait before continuing
2. **Helpful Messaging**: Clear explanation in wedding context
3. **Upgrade Options**: Information about higher tier benefits
4. **Alternative Actions**: Suggestions for what you can do meanwhile

### Wedding Season Considerations

During peak wedding season (May-September), all users receive:
- **50% higher limits** to support increased coordination needs
- **Priority processing** for wedding day coordination
- **Extended grace periods** for couples within 30 days of their wedding
```

### 3. API Documentation
```markdown
<!-- /docs/rate-limiting/api-reference.md -->
# Rate Limiting API Reference

## Rate Limit Headers

All API responses include rate limiting headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847  
X-RateLimit-Reset: 1693545600
X-RateLimit-Type: subscription-tier
X-RateLimit-Tier: premium
```

## Rate Limit Check Endpoint

### POST /api/rate-limits/check

Check current rate limit status for a specific endpoint.

```typescript
// Request
{
  "endpoint": "/api/suppliers/search",
  "identifier": "optional-user-override"
}

// Response
{
  "allowed": true,
  "remaining": 847,
  "resetTime": 1693545600,
  "subscriptionTier": "premium",
  "weddingSeasonActive": true
}
```

## Error Responses

### 429 - Rate Limit Exceeded

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED", 
  "details": {
    "limitType": "minute_exceeded",
    "current": 151,
    "limit": 150, 
    "retryAfter": 45,
    "resetTime": 1693545600
  },
  "upgradeRecommendation": {
    "suggestedTier": "enterprise",
    "benefits": ["Unlimited requests", "Priority support"],
    "upgradeUrl": "/billing/upgrade"
  }
}
```
```

## 🧪 COMPREHENSIVE TESTING CHECKLIST

### Unit Testing (Target: >90% coverage):
- [ ] **Core rate limiting logic** with all subscription tiers
- [ ] **Wedding season multipliers** with date mocking
- [ ] **Vendor type specific limits** for all vendor types
- [ ] **Abuse detection patterns** with simulated attacks
- [ ] **Progressive backoff logic** with violation escalation
- [ ] **Redis integration** with connection failure scenarios
- [ ] **Performance metrics** under various load conditions

### Integration Testing:
- [ ] **Database operations** with real PostgreSQL connections
- [ ] **Redis cluster coordination** across multiple instances
- [ ] **External service integration** with mock third-party APIs
- [ ] **Middleware pipeline** integration with existing auth
- [ ] **Monitoring event publishing** with real data flows

### E2E Testing with Playwright:
- [ ] **Supplier dashboard** rate limiting experience
- [ ] **WedMe couple platform** mobile rate limiting
- [ ] **Cross-browser compatibility** (Chrome, Firefox, Safari, Edge)
- [ ] **Mobile device testing** (iOS, Android, various screen sizes)
- [ ] **Network condition testing** (3G, 4G, WiFi, offline)
- [ ] **Accessibility testing** for rate limiting indicators

### Load Testing:
- [ ] **Wedding peak season simulation** (500+ concurrent users)
- [ ] **Redis cluster performance** under sustained load
- [ ] **Database performance** with high violation logging volume
- [ ] **Memory usage optimization** during extended load
- [ ] **Graceful degradation** when components fail

## 💾 WHERE TO SAVE YOUR WORK

**Test Files:**
- `/tests/rate-limiting/rate-limiter.test.ts` - Comprehensive unit tests
- `/tests/rate-limiting/load-testing.test.ts` - Peak traffic simulation
- `/tests/rate-limiting/security-testing.test.ts` - Abuse prevention tests
- `/tests/rate-limiting/e2e-playwright.test.ts` - End-to-end user experience
- `/tests/rate-limiting/performance-benchmarks.test.ts` - Performance validation

**Documentation Files:**
- `/docs/rate-limiting/admin-guide.md` - Administrator documentation
- `/docs/rate-limiting/user-guide.md` - End-user documentation  
- `/docs/rate-limiting/api-reference.md` - Developer API documentation
- `/docs/rate-limiting/troubleshooting.md` - Problem resolution guide
- `/docs/rate-limiting/wedding-scenarios.md` - Wedding-specific examples

**Evidence Files:**
- `/docs/rate-limiting/test-results/` - Test coverage reports and screenshots
- `/docs/rate-limiting/benchmarks/` - Performance benchmark results
- `/docs/rate-limiting/security-audit/` - Security testing evidence

## ⚠️ CRITICAL WARNINGS

### Testing Challenges:
- Redis cluster testing requires multiple instances - use Docker containers
- Load testing can overwhelm development environment - use production-like setup
- Wedding season testing requires date mocking for consistent results
- Security testing might trigger real abuse detection - use test identifiers

### Documentation Accuracy:
- All code examples must be tested and working  
- Screenshots must reflect actual implemented UI
- Performance metrics must be measured, not estimated
- Wedding scenarios must be realistic and validated with domain experts

### Wedding Industry Context:
- Test scenarios must reflect real wedding coordination workflows
- Documentation must use wedding terminology couples and suppliers understand
- Rate limiting messages must be helpful, not technical
- Consider emotional context - couples are stressed near wedding day

## 🏁 COMPLETION CHECKLIST (WITH EVIDENCE VERIFICATION)

### Test Coverage Verification:
```bash
# Verify comprehensive test coverage
npm test rate-limiting -- --coverage --verbose
# Must show: >90% statement, branch, function, and line coverage

# Run load testing suite
npm run test:load-rate-limiting
# Must show: Performance requirements met under load

# Security testing validation
npm test rate-limiting-security
# Must show: All abuse prevention tests passing

# Cross-browser E2E testing  
npm run test:e2e-rate-limiting
# Must show: Works in Chrome, Firefox, Safari, Edge
```

### Documentation Quality Verification:
```bash
# Verify all documentation files exist and have content
ls -la docs/rate-limiting/
wc -l docs/rate-limiting/*.md
# Must show: Substantial documentation (>100 lines each)

# Check for code example accuracy
grep -r "```typescript" docs/rate-limiting/
# Must show: Multiple working code examples

# Validate screenshot evidence  
ls -la docs/rate-limiting/screenshots/
# Must show: UI screenshots from testing
```

### Final QA Checklist:
- [ ] **>90% test coverage** across all rate limiting components
- [ ] **Load testing passed** for wedding peak traffic (500+ concurrent)
- [ ] **Security tests validate** abuse prevention effectiveness  
- [ ] **Cross-browser compatibility** verified with Playwright
- [ ] **Mobile testing complete** across iOS and Android devices
- [ ] **Performance benchmarks met** (<5ms rate limit checks)
- [ ] **Documentation complete** with working examples and screenshots
- [ ] **TypeScript compilation** successful with zero errors
- [ ] **Wedding scenario validation** with realistic use cases

## 📊 SUCCESS METRICS

### Test Quality Metrics:
- Test coverage: >90% (statement, branch, function, line)
- Load test capacity: 500+ concurrent users supported
- Security test effectiveness: >99% abuse pattern detection
- Cross-browser compatibility: 100% across Chrome, Firefox, Safari, Edge
- Mobile device coverage: iOS and Android major versions

### Documentation Quality:
- Admin guide completeness: All configuration scenarios covered
- User guide clarity: Wedding terminology used throughout  
- API reference accuracy: All examples tested and working
- Troubleshooting effectiveness: Common issues and solutions documented
- Screenshot currency: All UI screenshots current and accurate

### Wedding Business Validation:
- Rate limiting supports legitimate wedding coordination without hindrance
- Abuse protection prevents vendor data scraping effectively
- Subscription tier incentives encourage appropriate upgrades
- Wedding season handling supports 300% traffic increase
- User experience optimized for wedding industry context

---

**EXECUTE IMMEDIATELY - Focus on comprehensive testing and wedding-industry documentation!**