# TEAM E - ROUND 1: WS-344 - Supplier-to-Supplier Referral & Gamification System
## 2025-01-22 - QA/Testing & Documentation Focus

**YOUR MISSION:** Create comprehensive test coverage for the referral system and document all functionality with wedding industry context
**FEATURE ID:** WS-344 (Track all work with this ID)  
**TIME LIMIT:** 20 hours for complete testing suite and documentation
**THINK ULTRA HARD** about edge cases that could break referral tracking during wedding season peaks and critical revenue periods

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **TEST SUITE EXECUTION PROOF:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm test referrals
# MUST show: All tests passing with >90% coverage
npm run test:coverage -- --testPathPattern=referrals
# MUST show: Coverage report with 90%+ lines/functions/branches
```

2. **E2E TEST EXECUTION:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run test:e2e referrals
# MUST show: All E2E scenarios passing
```

3. **DOCUMENTATION PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/docs/referrals/
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/docs/referrals/README.md | head -20
# MUST show: Complete documentation structure
```

4. **LOAD TESTING RESULTS:**
```bash
# Load test results showing system handles 1000+ concurrent referral creations
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/test-results/load-testing/
```

**Teams submitting hallucinated test results will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing test patterns and documentation structure
await mcp__serena__search_for_pattern("test.*referral|spec.*referral|\\.test\\.|__tests__");
await mcp__serena__find_symbol("describe|it|test", "", true);
await mcp__serena__get_symbols_overview("src/components/__tests__/");
await mcp__serena__get_symbols_overview("docs/");
```

### B. TESTING INFRASTRUCTURE ANALYSIS (MINUTES 3-5)
```typescript
// Load existing testing patterns for consistency
await mcp__serena__search_for_pattern("jest\\.config|playwright\\.config|vitest");
await mcp__serena__find_symbol("setupFilesAfterEnv", "", true);
await mcp__serena__get_symbols_overview("__tests__/");
```

### C. REF MCP CURRENT DOCS (MINUTES 5-7)
```typescript
// Load documentation SPECIFIC to testing referral systems
await mcp__Ref__ref_search_documentation("Jest React Testing Library referral system testing patterns");
await mcp__Ref__ref_search_documentation("Playwright E2E testing social sharing QR codes");
await mcp__Ref__ref_search_documentation("API testing Node.js referral tracking validation");
await mcp__Ref__ref_search_documentation("Load testing performance Stripe webhook testing");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPREHENSIVE QA STRATEGY

### Use Sequential Thinking MCP for Testing Architecture
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "For comprehensive referral system QA, I need to test 7 critical areas: 1) Referral link generation and uniqueness, 2) Multi-stage conversion tracking accuracy, 3) Reward automation with Stripe integration, 4) Leaderboard calculations under load, 5) Mobile/PWA functionality across devices, 6) Security vulnerabilities and fraud prevention, 7) Edge cases during wedding season peaks (May-October).",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Testing pyramid structure: 1) Unit tests (70%) - Test pure functions like reward calculations, referral code generation, validation logic, 2) Integration tests (20%) - Test API endpoints, database operations, third-party services, 3) E2E tests (10%) - Test complete user flows from link creation to reward issuance. Focus on wedding industry scenarios.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Critical edge cases to test: 1) Concurrent referral creation during wedding expo events, 2) Referral attribution conflicts when same person gets multiple links, 3) Stripe webhook delivery failures during payment processing, 4) QR code generation failures in production, 5) Leaderboard race conditions when multiple conversions happen simultaneously, 6) Mobile app state restoration after network interruptions.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance testing requirements: 1) Load test 1000+ concurrent users creating referrals (wedding expo scenario), 2) Stress test leaderboard calculations with 10,000+ suppliers, 3) Volume test QR code generation service, 4) Endurance test during 72-hour wedding weekend peak, 5) Spike test for viral referral sharing, 6) Mobile performance on 3G networks at venues.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Security testing focus: 1) SQL injection attempts on referral code inputs, 2) XSS vulnerabilities in custom messages, 3) CSRF protection on referral creation endpoints, 4) Rate limiting bypass attempts, 5) Referral code enumeration attacks, 6) Privilege escalation in leaderboard access, 7) Data exposure in error messages.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Documentation strategy: 1) User guides with wedding photographer/DJ examples, 2) API documentation with curl examples, 3) Troubleshooting guides for common issues, 4) Performance benchmarks and scaling notes, 5) Security considerations and best practices, 6) Mobile implementation notes, 7) Integration guides for third-party services.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down testing tasks and track coverage goals
2. **test-automation-architect** - Build comprehensive automated test suites  
3. **playwright-visual-testing-specialist** - Create E2E tests with visual regression testing
4. **security-compliance-officer** - Conduct security penetration testing
5. **performance-optimization-expert** - Execute load and performance testing
6. **documentation-chronicler** - Create comprehensive user and technical documentation

## 🧪 COMPREHENSIVE TESTING IMPLEMENTATION

### UNIT TESTS SUITE

### Unit Tests: Referral Service Logic
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/__tests__/referral-tracking.test.ts

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { ReferralTrackingService } from '../referral-tracking';
import { createMockSupabaseClient } from '../../__mocks__/supabase';

// Mock external dependencies
jest.mock('@supabase/supabase-js');
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'ABC12345')
}));

describe('ReferralTrackingService', () => {
  let service: ReferralTrackingService;
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new ReferralTrackingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createReferralLink', () => {
    it('should generate unique referral codes', async () => {
      const supplierId = 'supplier-123';
      const customMessage = 'Check out WedSync!';

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'referral-123',
                referral_code: 'ABC12345',
                custom_link: 'https://wedsync.com/join/ABC12345',
                created_at: new Date().toISOString()
              },
              error: null
            })
          })
        })
      });

      const result = await service.createReferralLink(supplierId, customMessage);

      expect(result.success).toBe(true);
      expect(result.data.referralCode).toBe('ABC12345');
      expect(result.data.customLink).toBe('https://wedsync.com/join/ABC12345');
      expect(mockSupabase.from).toHaveBeenCalledWith('supplier_referrals');
    });

    it('should handle referral code collisions by generating new codes', async () => {
      const supplierId = 'supplier-123';
      
      // First call returns existing code, second call returns null (unique)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn()
              .mockResolvedValueOnce({ data: { id: 'existing' }, error: null }) // Code exists
              .mockResolvedValueOnce({ data: null, error: null }) // Code is unique
          })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { referral_code: 'DEF67890' },
              error: null
            })
          })
        })
      });

      const result = await service.createReferralLink(supplierId);

      expect(result.success).toBe(true);
      // Should have checked uniqueness twice
      expect(mockSupabase.from().select().eq).toHaveBeenCalledTimes(2);
    });

    it('should fail gracefully when unable to generate unique code', async () => {
      const supplierId = 'supplier-123';
      
      // Always return existing code (simulate collision storm)
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: { id: 'existing' }, error: null })
          })
        })
      });

      const result = await service.createReferralLink(supplierId);

      expect(result.success).toBe(false);
      expect(result.error).toContain('unique referral code');
    });
  });

  describe('trackConversion', () => {
    const mockReferral = {
      id: 'referral-123',
      referral_code: 'ABC12345',
      referrer_id: 'supplier-123',
      stage: 'link_clicked',
      attribution_window: 30,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString() // 5 days ago
    };

    it('should track valid stage progression', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: mockReferral, error: null })
          })
        }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });

      const result = await service.trackConversion('ABC12345', 'signup_started');

      expect(result.success).toBe(true);
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'signup_started',
          signed_up_at: expect.any(String)
        })
      );
    });

    it('should reject invalid stage progression', async () => {
      const invalidReferral = { ...mockReferral, stage: 'first_payment' };
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: invalidReferral, error: null })
          })
        })
      });

      const result = await service.trackConversion('ABC12345', 'signup_started');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid stage progression');
    });

    it('should enforce attribution window', async () => {
      const expiredReferral = {
        ...mockReferral,
        created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString() // 35 days ago
      };
      
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: expiredReferral, error: null })
          })
        })
      });

      const result = await service.trackConversion('ABC12345', 'first_payment');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Attribution window expired');
    });
  });

  describe('calculateLeaderboards', () => {
    const mockSupplierData = [
      {
        referrer_id: 'supplier-1',
        paid_conversions: 5,
        total_referrals: 10,
        supplier_category: 'photography',
        supplier_location: 'London'
      },
      {
        referrer_id: 'supplier-2', 
        paid_conversions: 3,
        total_referrals: 8,
        supplier_category: 'photography',
        supplier_location: 'London'
      }
    ];

    it('should calculate rankings correctly', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockSupplierData, error: null })
        }),
        delete: jest.fn().mockResolvedValue({ error: null }),
        insert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null })
          })
        })
      });

      const result = await service.calculateLeaderboards();

      expect(result.success).toBe(true);
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            supplier_id: 'supplier-1',
            paid_conversions: 5,
            conversion_rate: 50.00
          })
        ])
      );
    });

    it('should handle empty leaderboard data gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: [], error: null })
        }),
        delete: jest.fn().mockResolvedValue({ error: null }),
        insert: jest.fn().mockResolvedValue({ error: null })
      });

      const result = await service.calculateLeaderboards();

      expect(result.success).toBe(true);
    });
  });

  describe('Wedding Industry Edge Cases', () => {
    it('should handle wedding season peak load', async () => {
      const concurrentRequests = Array.from({ length: 100 }, (_, i) => 
        service.createReferralLink(`supplier-${i}`)
      );

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { referral_code: 'ABC12345' },
              error: null
            })
          })
        })
      });

      const results = await Promise.all(concurrentRequests);
      const successfulResults = results.filter(r => r.success);

      expect(successfulResults.length).toBe(100);
    });

    it('should validate referral codes for wedding expo sharing', () => {
      const validCodes = ['ABC12345', 'DEF67890', 'GHI11111'];
      const invalidCodes = ['abc123', '123', 'TOOLONGCODE', ''];

      validCodes.forEach(code => {
        expect(service.validateReferralCode(code)).toBe(true);
      });

      invalidCodes.forEach(code => {
        expect(service.validateReferralCode(code)).toBe(false);
      });
    });

    it('should handle attribution conflicts correctly', async () => {
      // Same person gets referred by multiple suppliers
      const firstReferral = {
        id: 'ref-1',
        referrer_id: 'supplier-1',
        referred_email: 'dj@example.com',
        stage: 'signup_started',
        primary_referrer: true,
        created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      };

      const secondReferral = {
        id: 'ref-2',
        referrer_id: 'supplier-2',
        referred_email: 'dj@example.com',
        stage: 'link_clicked',
        primary_referrer: false,
        created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue({ 
                data: [firstReferral, secondReferral], 
                error: null 
              })
            })
          })
        })
      });

      const attribution = await service.resolveAttributionConflict('dj@example.com');

      expect(attribution.primaryReferrer).toBe('supplier-1');
      expect(attribution.reason).toBe('first_click_attribution');
    });
  });
});
```

### API Integration Tests
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/__tests__/integration.test.ts

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { POST as createReferralHandler } from '../create-link/route';
import { POST as trackConversionHandler } from '../track-conversion/route';
import { GET as getStatsHandler } from '../stats/route';
import { GET as getLeaderboardHandler } from '../leaderboard/route';

// Mock dependencies
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(() => ({
    user: { email: 'photographer@example.com' }
  }))
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn()
    }))
  }))
}));

describe('Referral API Integration Tests', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Setup default successful responses
    mockSupabaseClient = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'org-123',
            name: 'Test Photography',
            owner_email: 'photographer@example.com'
          },
          error: null
        }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null })
      }))
    };
  });

  describe('POST /api/referrals/create-link', () => {
    it('should create referral link successfully', async () => {
      const { req } = createMocks({
        method: 'POST',
        body: {
          customMessage: 'Check out WedSync for wedding coordination!',
          source: 'dashboard'
        }
      });

      // Mock successful referral creation
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValueOnce({
            data: { id: 'org-123', name: 'Test Photography' },
            error: null
          })
          .mockResolvedValueOnce({ data: null, error: null }), // No existing referral code
        insert: jest.fn().mockReturnThis(),
        update: jest.fn().mockReturnThis()
      });

      mockSupabaseClient.from().insert.mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'ref-123',
              referral_code: 'ABC12345',
              custom_link: 'https://wedsync.com/join/ABC12345',
              created_at: new Date().toISOString()
            },
            error: null
          })
        })
      });

      const request = new NextRequest('http://localhost:3000/api/referrals/create-link', {
        method: 'POST',
        body: JSON.stringify(req.body)
      });

      const response = await createReferralHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.referralCode).toBe('ABC12345');
      expect(data.data.customLink).toBe('https://wedsync.com/join/ABC12345');
    });

    it('should enforce rate limiting', async () => {
      // Simulate multiple rapid requests
      const requests = Array.from({ length: 6 }, () => {
        const { req } = createMocks({
          method: 'POST',
          body: { source: 'dashboard' }
        });
        
        return new NextRequest('http://localhost:3000/api/referrals/create-link', {
          method: 'POST',
          body: JSON.stringify(req.body)
        });
      });

      // Mock rate limit service to reject 6th request
      jest.doMock('@/services/rate-limit', () => ({
        rateLimitService: {
          checkRateLimit: jest.fn()
            .mockResolvedValueOnce({ allowed: true })
            .mockResolvedValueOnce({ allowed: true })
            .mockResolvedValueOnce({ allowed: true })
            .mockResolvedValueOnce({ allowed: true })
            .mockResolvedValueOnce({ allowed: true })
            .mockResolvedValueOnce({ allowed: false })
        }
      }));

      const responses = await Promise.all(
        requests.map(req => createReferralHandler(req))
      );

      const statusCodes = await Promise.all(
        responses.map(res => res.status)
      );

      // First 5 should succeed, 6th should be rate limited
      expect(statusCodes.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
      expect(statusCodes[5]).toBe(429);
    });

    it('should validate input data', async () => {
      const invalidInputs = [
        { customMessage: 'x'.repeat(300) }, // Too long
        { source: 'invalid_source' }, // Invalid enum
        { customMessage: '<script>alert("xss")</script>' } // XSS attempt
      ];

      for (const invalidInput of invalidInputs) {
        const request = new NextRequest('http://localhost:3000/api/referrals/create-link', {
          method: 'POST',
          body: JSON.stringify(invalidInput)
        });

        const response = await createReferralHandler(request);
        
        expect(response.status).toBe(400);
        
        const data = await response.json();
        expect(data.error).toBeDefined();
      }
    });
  });

  describe('POST /api/referrals/track-conversion', () => {
    it('should track conversion stages correctly', async () => {
      const mockReferral = {
        id: 'ref-123',
        referral_code: 'ABC12345',
        referrer_id: 'supplier-123',
        stage: 'link_clicked',
        attribution_window: 30,
        created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        referrer: {
          id: 'supplier-123',
          name: 'Test Photography',
          owner_email: 'photographer@example.com',
          subscription_tier: 'professional'
        }
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockReferral, error: null }),
        update: jest.fn().mockReturnThis()
      });

      mockSupabaseClient.from().update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null })
      });

      const request = new NextRequest('http://localhost:3000/api/referrals/track-conversion', {
        method: 'POST',
        body: JSON.stringify({
          referralCode: 'ABC12345',
          stage: 'signup_started',
          referredId: 'supplier-456'
        })
      });

      const response = await trackConversionHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle first payment conversion with reward processing', async () => {
      const mockReferral = {
        id: 'ref-123',
        referral_code: 'ABC12345',
        referrer_id: 'supplier-123',
        stage: 'trial_active',
        attribution_window: 30,
        created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        referrer: {
          id: 'supplier-123',
          name: 'Test Photography',
          owner_email: 'photographer@example.com',
          subscription_tier: 'professional',
          stripe_customer_id: 'cus_test123'
        }
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockReferral, error: null }),
        update: jest.fn().mockReturnThis(),
        rpc: jest.fn().mockResolvedValue({ error: null })
      });

      // Mock reward service
      jest.doMock('@/services/referral-rewards', () => ({
        rewardService: {
          processReferralReward: jest.fn().mockResolvedValue({
            success: true,
            milestoneAchieved: 'first_conversion'
          })
        }
      }));

      const request = new NextRequest('http://localhost:3000/api/referrals/track-conversion', {
        method: 'POST',
        body: JSON.stringify({
          referralCode: 'ABC12345',
          stage: 'first_payment',
          referredId: 'supplier-456'
        })
      });

      const response = await trackConversionHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.rewardEarned).toBe(true);
      expect(data.milestoneAchieved).toBe('first_conversion');
    });
  });

  describe('Wedding Industry Scenarios', () => {
    it('should handle wedding expo mass referral creation', async () => {
      // Simulate 50 suppliers creating referrals simultaneously at wedding expo
      const requests = Array.from({ length: 50 }, (_, i) => {
        return new NextRequest('http://localhost:3000/api/referrals/create-link', {
          method: 'POST',
          body: JSON.stringify({
            customMessage: `Wedding supplier ${i} referral`,
            source: 'mobile_app'
          })
        });
      });

      // Mock successful database operations
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn()
          .mockResolvedValue({ data: { id: 'org-123' }, error: null })
          .mockResolvedValue({ data: null, error: null }),
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: { referral_code: 'ABC12345' },
              error: null
            })
          })
        })
      });

      const startTime = Date.now();
      const responses = await Promise.all(
        requests.map(req => createReferralHandler(req))
      );
      const endTime = Date.now();

      const successfulResponses = responses.filter(async (response) => {
        const data = await response.json();
        return response.status === 200 && data.success;
      });

      expect(successfulResponses.length).toBe(50);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle attribution conflicts during viral sharing', async () => {
      // Same DJ gets referred by photographer and venue owner
      const photographerReferral = {
        id: 'ref-1',
        referrer_id: 'photographer-123',
        referred_email: 'dj@example.com',
        stage: 'link_clicked',
        primary_referrer: true,
        created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      };

      const venueReferral = {
        id: 'ref-2',
        referrer_id: 'venue-456',
        referred_email: 'dj@example.com',
        stage: 'link_clicked',
        primary_referrer: false,
        created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
      };

      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: photographerReferral, error: null }),
        update: jest.fn().mockReturnThis()
      });

      const request = new NextRequest('http://localhost:3000/api/referrals/track-conversion', {
        method: 'POST',
        body: JSON.stringify({
          referralCode: photographerReferral.referral_code,
          stage: 'first_payment',
          referredId: 'dj-supplier-789'
        })
      });

      const response = await trackConversionHandler(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      // Photographer should get the reward (first click attribution)
    });

    it('should maintain accuracy during Saturday wedding rush', async () => {
      // Simulate high load during Saturday wedding day
      const conversionRequests = Array.from({ length: 200 }, (_, i) => {
        return new NextRequest('http://localhost:3000/api/referrals/track-conversion', {
          method: 'POST',
          body: JSON.stringify({
            referralCode: `REF${String(i).padStart(5, '0')}`,
            stage: i < 100 ? 'link_clicked' : 'signup_started'
          })
        });
      });

      // Mock referrals exist and are valid
      mockSupabaseClient.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockImplementation((code) => ({
          data: {
            id: `ref-${code}`,
            referral_code: code,
            stage: 'link_created',
            attribution_window: 30,
            created_at: new Date().toISOString()
          },
          error: null
        })),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null })
        })
      });

      const responses = await Promise.all(
        conversionRequests.map(req => trackConversionHandler(req))
      );

      const successfulUpdates = responses.filter(async (response) => {
        const data = await response.json();
        return response.status === 200 && data.success;
      });

      expect(successfulUpdates.length).toBe(200);
    });
  });
});
```

### E2E TESTS WITH PLAYWRIGHT MCP

### E2E Test: Complete Referral Flow
```typescript
// /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/__tests__/e2e-referral-flow.test.ts

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('End-to-End Referral System Flow', () => {
  let baseUrl: string;

  beforeAll(async () => {
    baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    
    // Setup test environment
    await mcp__playwright__browser_navigate({ url: baseUrl });
  });

  afterAll(async () => {
    await mcp__playwright__browser_close();
  });

  it('should complete full referral cycle from creation to reward', async () => {
    // Step 1: Login as photographer
    await mcp__playwright__browser_navigate({ url: `${baseUrl}/auth/login` });
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Email',
          type: 'textbox',
          ref: '[data-testid="email-input"]',
          value: 'photographer@test.com'
        },
        {
          name: 'Password',
          type: 'textbox',
          ref: '[data-testid="password-input"]',
          value: 'testpassword123'
        }
      ]
    });
    await mcp__playwright__browser_click({
      element: 'Login button',
      ref: '[data-testid="login-button"]'
    });

    // Wait for dashboard redirect
    await mcp__playwright__browser_wait_for({ text: 'Dashboard' });
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-login-complete.png' 
    });

    // Step 2: Navigate to referral center
    await mcp__playwright__browser_navigate({ 
      url: `${baseUrl}/dashboard/referrals` 
    });
    await mcp__playwright__browser_snapshot();
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-referral-center.png' 
    });

    // Step 3: Create referral link
    await mcp__playwright__browser_click({
      element: 'Create Referral Link button',
      ref: '[data-testid="create-referral-link"]'
    });

    // Fill custom message
    await mcp__playwright__browser_type({
      element: 'Custom message input',
      ref: '[data-testid="custom-message"]',
      text: 'Hey! WedSync has been amazing for coordinating my wedding timelines. You should check it out!'
    });

    await mcp__playwright__browser_click({
      element: 'Generate Link button',
      ref: '[data-testid="generate-link"]'
    });

    // Wait for link generation
    await mcp__playwright__browser_wait_for({ text: 'wedsync.com/join/' });
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-referral-link-created.png' 
    });

    // Step 4: Copy referral link
    await mcp__playwright__browser_click({
      element: 'Copy Link button',
      ref: '[data-testid="copy-link"]'
    });
    await mcp__playwright__browser_wait_for({ text: 'Copied!' });

    // Step 5: Verify QR code generation
    await mcp__playwright__browser_click({
      element: 'Show QR Code button',
      ref: '[data-testid="show-qr-code"]'
    });
    await mcp__playwright__browser_wait_for({ text: 'Scan QR Code' });
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-qr-code-display.png' 
    });

    // Step 6: Test mobile sharing
    await mcp__playwright__browser_resize(375, 667); // iPhone SE viewport
    await mcp__playwright__browser_click({
      element: 'Share Referral button',
      ref: '[data-testid="native-share"]'
    });
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-mobile-sharing.png' 
    });

    // Step 7: Simulate referred user clicking link
    // Open new tab/session to simulate referred user
    await mcp__playwright__browser_tabs({ action: 'new' });
    
    // Extract referral code from previous session
    const referralCode = await mcp__playwright__browser_evaluate({
      function: '() => document.querySelector("[data-testid=\\"referral-code\\"]").textContent'
    });

    await mcp__playwright__browser_navigate({ 
      url: `${baseUrl}/join/${referralCode}` 
    });
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-referral-landing.png' 
    });

    // Step 8: Complete signup process
    await mcp__playwright__browser_click({
      element: 'Start Free Trial button',
      ref: '[data-testid="start-trial"]'
    });

    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Business Name',
          type: 'textbox',
          ref: '[data-testid="business-name"]',
          value: 'DJ Mike\'s Wedding Music'
        },
        {
          name: 'Email',
          type: 'textbox',
          ref: '[data-testid="signup-email"]',
          value: 'djmike@test.com'
        },
        {
          name: 'Password',
          type: 'textbox',
          ref: '[data-testid="signup-password"]',
          value: 'newuserpass123'
        }
      ]
    });

    await mcp__playwright__browser_click({
      element: 'Create Account button',
      ref: '[data-testid="create-account"]'
    });

    // Wait for trial activation
    await mcp__playwright__browser_wait_for({ text: 'Welcome to WedSync!' });
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-trial-activated.png' 
    });

    // Step 9: Simulate conversion to paid
    await mcp__playwright__browser_navigate({ 
      url: `${baseUrl}/dashboard/billing` 
    });
    
    await mcp__playwright__browser_click({
      element: 'Upgrade to Professional',
      ref: '[data-testid="upgrade-professional"]'
    });

    // Fill payment details (test mode)
    await mcp__playwright__browser_fill_form({
      fields: [
        {
          name: 'Card Number',
          type: 'textbox',
          ref: '[data-testid="card-number"]',
          value: '4242424242424242'
        },
        {
          name: 'Expiry',
          type: 'textbox', 
          ref: '[data-testid="card-expiry"]',
          value: '12/25'
        },
        {
          name: 'CVC',
          type: 'textbox',
          ref: '[data-testid="card-cvc"]',
          value: '123'
        }
      ]
    });

    await mcp__playwright__browser_click({
      element: 'Subscribe button',
      ref: '[data-testid="subscribe-button"]'
    });

    // Wait for subscription confirmation
    await mcp__playwright__browser_wait_for({ text: 'Subscription Active' });
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-conversion-complete.png' 
    });

    // Step 10: Verify referrer received reward
    await mcp__playwright__browser_tabs({ action: 'select', index: 0 });
    await mcp__playwright__browser_navigate({ 
      url: `${baseUrl}/dashboard/referrals` 
    });

    // Check for conversion notification
    await mcp__playwright__browser_wait_for({ text: 'Congratulations!' });
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-reward-notification.png' 
    });

    // Step 11: Verify leaderboard update
    await mcp__playwright__browser_navigate({ 
      url: `${baseUrl}/dashboard/referrals/leaderboard` 
    });
    
    // Should show increased conversion count
    const conversionCount = await mcp__playwright__browser_evaluate({
      function: '() => document.querySelector("[data-testid=\\"conversion-count\\"]").textContent'
    });
    
    expect(parseInt(conversionCount)).toBeGreaterThan(0);
    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-leaderboard-updated.png' 
    });

    // Step 12: Verify email notifications
    // In a real test, we'd check email delivery
    // For now, we'll verify the notification system is working
    const notifications = await mcp__playwright__browser_evaluate({
      function: '() => document.querySelectorAll("[data-testid=\\"notification\\"]").length'
    });
    
    expect(notifications).toBeGreaterThan(0);

    console.log('✅ Complete referral flow test passed!');
  });

  it('should handle mobile referral sharing at wedding venue', async () => {
    // Simulate wedding venue scenario with poor connectivity
    
    // Test mobile viewport
    await mcp__playwright__browser_resize(375, 667);
    
    // Login as supplier
    await mcp__playwright__browser_navigate({ url: `${baseUrl}/auth/login` });
    // ... login steps ...

    // Navigate to referral center on mobile
    await mcp__playwright__browser_navigate({ 
      url: `${baseUrl}/dashboard/referrals` 
    });

    // Test mobile navigation
    await mcp__playwright__browser_click({
      element: 'Mobile menu button',
      ref: '[data-testid="mobile-menu"]'
    });
    
    await mcp__playwright__browser_click({
      element: 'Share section',
      ref: '[data-testid="mobile-share-nav"]'
    });

    // Create referral link quickly
    await mcp__playwright__browser_click({
      element: 'Quick share button',
      ref: '[data-testid="quick-share"]'
    });

    // Generate QR code for venue sharing
    await mcp__playwright__browser_click({
      element: 'Generate QR Code button',
      ref: '[data-testid="generate-qr"]'
    });

    await mcp__playwright__browser_wait_for({ text: 'QR Code generated' });

    // Test QR code visibility in mobile viewport
    const qrCodeVisible = await mcp__playwright__browser_evaluate({
      function: '() => {' +
        'const qr = document.querySelector("[data-testid=\\"qr-code-image\\"]");' +
        'const rect = qr.getBoundingClientRect();' +
        'return rect.width >= 200 && rect.height >= 200;' +
      '}'
    });

    expect(qrCodeVisible).toBe(true);

    // Test one-tap sharing
    await mcp__playwright__browser_click({
      element: 'WhatsApp share button',
      ref: '[data-testid="whatsapp-share"]'
    });

    await mcp__playwright__browser_take_screenshot({ 
      filename: 'e2e-mobile-venue-sharing.png' 
    });

    console.log('✅ Mobile venue sharing test passed!');
  });

  it('should maintain performance during wedding season peak', async () => {
    // Test system performance under load
    const startTime = Date.now();

    // Simulate multiple suppliers creating referrals simultaneously
    const referralCreations = Array.from({ length: 50 }, async (_, i) => {
      await mcp__playwright__browser_navigate({ 
        url: `${baseUrl}/dashboard/referrals` 
      });
      
      await mcp__playwright__browser_click({
        element: 'Create Referral Link button',
        ref: '[data-testid="create-referral-link"]'
      });

      await mcp__playwright__browser_wait_for({ text: 'wedsync.com/join/' });
      
      return Date.now();
    });

    await Promise.all(referralCreations);
    const endTime = Date.now();

    const totalTime = endTime - startTime;
    const avgTimePerReferral = totalTime / 50;

    expect(avgTimePerReferral).toBeLessThan(2000); // < 2 seconds per referral
    expect(totalTime).toBeLessThan(30000); // < 30 seconds total

    console.log(`✅ Performance test passed! Average: ${avgTimePerReferral}ms per referral`);
  });
});
```

## 📚 COMPREHENSIVE DOCUMENTATION

### User Documentation
```markdown
<!-- /Users/skyphotography/CODE/WedSync-2.0/WedSync2/docs/referrals/README.md -->

# WedSync Referral System - User Guide

## Overview

The WedSync Referral System allows wedding suppliers to earn free months of WedSync by referring other wedding professionals to the platform. When your referrals become paying customers, you receive credit toward your subscription.

## Quick Start

### Creating Your First Referral Link

1. **Navigate to Referral Center**
   - Go to Dashboard → Referrals
   - Click "Create Referral Link"

2. **Customize Your Message** (Optional)
   - Add a personal message explaining why you love WedSync
   - Example: "WedSync has saved me 10+ hours per wedding in coordination time!"

3. **Generate and Share**
   - Click "Generate Link" 
   - Copy the unique referral link
   - Share via WhatsApp, email, or social media
   - Show the QR code for in-person sharing

### How Referrals Work

**The Referral Journey:**
1. **Link Created** - You generate a unique referral link
2. **Link Clicked** - Someone clicks your referral link  
3. **Signup Started** - They begin creating their WedSync account
4. **Trial Active** - They activate their free trial
5. **First Payment** - They subscribe to a paid plan (you earn reward!)
6. **Reward Issued** - Free month credit applied to your account

**Reward Structure:**
- **1 Month Free** for every successful referral conversion
- Credit value matches your current subscription tier
- Attribution window: 30 days from first click

## Wedding Industry Use Cases

### At Wedding Expos
- Generate QR codes on your phone
- Let other vendors scan with their camera app  
- Works even with poor venue wifi
- Track conversions in real-time

### Networking Events
- Share links via WhatsApp Business
- Email professional connections
- Post on LinkedIn with wedding hashtags

### Vendor Collaborations
- Recommend WedSync to wedding team members
- Share during vendor meetings
- Include in vendor resource guides

## Mobile Usage

The referral system is optimized for mobile use:
- **Large QR codes** for easy scanning in venue lighting
- **One-tap sharing** to WhatsApp, email, social media
- **Offline functionality** - QR codes work without internet
- **PWA installation** - Add to home screen for quick access

## Leaderboards and Gamification

### Ranking Categories
- **Overall Rankings** - All suppliers across all categories
- **Category Rankings** - Within your specialty (Photography, DJ, etc.)
- **Geographic Rankings** - Suppliers in your region

### Achievement Badges
- **First Conversion** - Your first successful referral
- **Rising Star** - 5 successful referrals
- **Community Builder** - 10 successful referrals
- **Wedding Network Champion** - 25 successful referrals
- **Referral Master** - 50 successful referrals
- **Wedding Industry Legend** - 100 successful referrals

## Best Practices

### Effective Referral Messages
```
✅ Good: "WedSync has transformed my wedding coordination process. I now spend 10+ fewer hours per wedding on admin tasks. The client portal keeps everyone informed and the timeline sync ensures nothing gets missed. Worth checking out!"

❌ Avoid: "Use this app"
```

### Optimal Sharing Timing
- **After successful weddings** when you're feeling positive about coordination
- **During vendor meetings** when discussing workflow challenges
- **At networking events** when meeting new wedding professionals
- **On social media** with wedding industry hashtags

### Conversion Tips
- **Share personal benefits** you've experienced with WedSync
- **Include specific examples** (time saved, stress reduced)
- **Follow up** with referred contacts to answer questions
- **Time your outreach** around their busy season when pain points are fresh

## Troubleshooting

### Common Issues

**Q: My referral link doesn't work**
- Ensure the link starts with `https://wedsync.com/join/`
- Check that the referral code is 8 characters (letters and numbers)
- Try generating a new link if the old one is over 30 days old

**Q: Someone signed up but I didn't get credit**
- Referrals must convert to paid subscriptions (not just free trials)
- Check the 30-day attribution window
- Ensure they used your specific referral link during signup

**Q: QR code won't scan**
- Ensure good lighting when displaying the code
- Try zooming in on the QR code for larger size
- Download and share the QR code image instead

**Q: My leaderboard rank isn't updating**
- Rankings update every 15 minutes
- Only paid conversions count toward rankings
- Check that your conversions show as "Reward Issued" status

### Getting Help

1. **Check your referral stats** in the dashboard for detailed information
2. **Review attribution** in your referral activity feed
3. **Contact support** with your referral code for specific issues
4. **Check system status** at status.wedsync.com for platform issues

## Advanced Features

### API Integration
For developers building custom referral tracking:
```javascript
// Track custom referral events
POST /api/referrals/track-conversion
{
  "referralCode": "ABC12345",
  "stage": "signup_started",
  "sourceDetails": "mobile_app_share"
}
```

### Bulk Referral Management
- Export referral data for analysis
- Import contact lists for targeted outreach  
- Automated email sequences for follow-up

### Analytics Integration
- Track referral performance in Google Analytics
- Monitor conversion funnels by source
- A/B test different referral messages

---

*For technical documentation, see the [API Documentation](./api.md)*  
*For developer implementation details, see the [Technical Guide](./technical.md)*
```

### API Documentation
```markdown
<!-- /Users/skyphotography/CODE/WedSync-2.0/WedSync2/docs/referrals/api.md -->

# WedSync Referral API Documentation

## Authentication

All referral API endpoints require authentication via session cookie or Bearer token.

```bash
# Using session cookie (web)
curl -X POST https://wedsync.com/api/referrals/create-link \
  -H "Content-Type: application/json" \
  -H "Cookie: session=..." \
  -d '{"customMessage": "Check out WedSync!"}'

# Using Bearer token (mobile)
curl -X POST https://wedsync.com/api/referrals/create-link \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_jwt_token" \
  -d '{"customMessage": "Check out WedSync!"}'
```

## Rate Limiting

| Endpoint | Limit | Window |
|----------|-------|--------|
| Create Link | 5 requests | 1 minute |
| Track Conversion | 10 requests | 1 minute |
| Get Stats | 20 requests | 1 minute |
| Get Leaderboard | 10 requests | 1 minute |

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 3
X-RateLimit-Reset: 1640995200
```

## Endpoints

### Create Referral Link

Creates a new referral link with optional custom message.

**Endpoint:** `POST /api/referrals/create-link`

**Request Body:**
```json
{
  "customMessage": "Check out WedSync for wedding coordination!",
  "source": "dashboard"
}
```

**Parameters:**
- `customMessage` (optional, string, max 280 chars): Personal message included with referral
- `source` (optional, enum): `dashboard` or `mobile_app`

**Response:**
```json
{
  "success": true,
  "data": {
    "referralCode": "ABC12345",
    "customLink": "https://wedsync.com/join/ABC12345",
    "qrCodeUrl": "https://storage.wedsync.com/qr/abc12345.png",
    "createdAt": "2025-01-22T10:30:00Z"
  }
}
```

**Example:**
```bash
curl -X POST https://wedsync.com/api/referrals/create-link \
  -H "Content-Type: application/json" \
  -d '{
    "customMessage": "WedSync has saved me 10+ hours per wedding!",
    "source": "mobile_app"
  }'
```

### Track Conversion

Tracks a conversion event in the referral funnel.

**Endpoint:** `POST /api/referrals/track-conversion`

**Request Body:**
```json
{
  "referralCode": "ABC12345",
  "stage": "signup_started",
  "referredId": "supplier-456",
  "sourceDetails": "clicked_from_whatsapp"
}
```

**Parameters:**
- `referralCode` (required, string): 8-character referral code
- `stage` (required, enum): `link_clicked`, `signup_started`, `trial_active`, `first_payment`
- `referredId` (optional, string): Supplier ID if known
- `sourceDetails` (optional, string, max 500 chars): Additional tracking information

**Response:**
```json
{
  "success": true,
  "rewardEarned": false,
  "milestoneAchieved": null
}
```

For `first_payment` conversions:
```json
{
  "success": true,
  "rewardEarned": true,
  "milestoneAchieved": "first_conversion"
}
```

### Get Referral Stats

Retrieves referral statistics for the authenticated supplier.

**Endpoint:** `GET /api/referrals/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalReferrals": 15,
    "activeTrials": 3,
    "paidConversions": 7,
    "conversionRate": 46.67,
    "monthsEarned": 7,
    "currentRankings": {
      "category": { "rank": 5, "total": 127 },
      "geographic": { "rank": 12, "total": 89 },
      "overall": { "rank": 45, "total": 1250 }
    },
    "recentActivity": [
      {
        "stage": "first_payment",
        "updated_at": "2025-01-22T09:15:00Z",
        "referred_email": "dj***@example.com"
      }
    ]
  }
}
```

### Get Leaderboard

Retrieves leaderboard data with filtering options.

**Endpoint:** `GET /api/referrals/leaderboard`

**Query Parameters:**
- `type` (optional, enum): `industry`, `geographic`, `temporal` (default: `industry`)
- `category` (optional, string): Filter by supplier category
- `location` (optional, string): Filter by location
- `period` (optional, enum): `all_time`, `this_year`, `this_quarter`, `this_month`, `this_week`
- `limit` (optional, number): Max entries to return (1-100, default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "entries": [
      {
        "supplier_id": "supplier-123",
        "paid_conversions": 25,
        "total_referrals_sent": 48,
        "conversion_rate": 52.08,
        "months_earned": 25,
        "total_value_earned_gbp": 1225.00,
        "supplier_category": "photography",
        "supplier_location": "London",
        "overall_rank": 1,
        "category_rank": 1,
        "geographic_rank": 1,
        "trend": "rising",
        "organizations": {
          "name": "Sarah's Wedding Photography",
          "logo_url": "https://storage.wedsync.com/logos/sarah.jpg"
        }
      }
    ],
    "userRank": 5,
    "totalEntries": 127,
    "lastUpdated": "2025-01-22T10:00:00Z"
  }
}
```

**Example Requests:**
```bash
# Get photography leaderboard
curl "https://wedsync.com/api/referrals/leaderboard?type=industry&category=photography&limit=10"

# Get monthly overall rankings
curl "https://wedsync.com/api/referrals/leaderboard?type=temporal&period=this_month"

# Get geographic rankings for London
curl "https://wedsync.com/api/referrals/leaderboard?type=geographic&location=London"
```

## Error Handling

All endpoints return errors in this format:
```json
{
  "success": false,
  "error": "Error message",
  "details": {
    "code": "VALIDATION_ERROR",
    "field": "customMessage"
  }
}
```

**Common Error Codes:**
- `AUTHENTICATION_REQUIRED` (401): No valid session/token
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `VALIDATION_ERROR` (400): Invalid input data
- `REFERRAL_NOT_FOUND` (404): Referral code doesn't exist
- `ATTRIBUTION_EXPIRED` (400): Outside 30-day attribution window
- `INVALID_STAGE_PROGRESSION` (400): Cannot move backwards in funnel

## Webhooks

Register webhook endpoints to receive real-time referral events.

**Webhook URL:** Configure in your account settings

**Events:**
```json
{
  "event": "referral.conversion",
  "data": {
    "referralCode": "ABC12345",
    "referrerId": "supplier-123",
    "referredId": "supplier-456", 
    "stage": "first_payment",
    "timestamp": "2025-01-22T10:30:00Z",
    "rewardEarned": true
  }
}
```

**Webhook Verification:**
Verify webhook authenticity using HMAC-SHA256:
```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}
```

## SDKs and Libraries

### JavaScript/TypeScript
```bash
npm install @wedsync/referrals-js
```

```javascript
import { WedSyncReferrals } from '@wedsync/referrals-js';

const referrals = new WedSyncReferrals({
  apiKey: 'your_api_key',
  environment: 'production' // or 'sandbox'
});

// Create referral link
const link = await referrals.createLink({
  customMessage: 'Check out WedSync!'
});

// Track conversion
await referrals.trackConversion('ABC12345', 'signup_started');
```

### cURL Examples
See individual endpoint documentation above for complete cURL examples.

---

*For user guides, see the [User Documentation](./README.md)*  
*For implementation details, see the [Technical Guide](./technical.md)*
```

## 🎯 REAL WEDDING SCENARIO (MANDATORY CONTEXT)

**Wedding Industry QA Scenario:**
"During peak wedding season (July), the referral system must handle 500+ suppliers creating links simultaneously at the National Wedding Show expo. Our QA needs to ensure: 1) No referral code collisions under load, 2) QR codes generate and display correctly on various mobile devices, 3) Attribution tracking remains accurate when the same DJ gets referred by multiple photographers, 4) Stripe reward processing completes within 24 hours of conversion, 5) Leaderboard updates don't lag during high conversion periods, 6) Mobile sharing works in exhibition halls with poor wifi. A single failure could cost thousands in missed referrals and damage WedSync's reputation in the tight-knit wedding industry."

## 💾 WHERE TO SAVE YOUR WORK

**Test Suites:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/services/__tests__/
├── referral-tracking.test.ts (Unit tests for referral service)
├── referral-rewards.test.ts (Stripe integration tests)
├── qr-generator.test.ts (QR code generation tests)
└── social-sharing.test.ts (Social platform integration tests)

/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/app/api/referrals/__tests__/
├── integration.test.ts (API integration tests)
├── e2e-referral-flow.test.ts (End-to-end scenarios)
├── load-testing.test.ts (Performance testing)
└── security.test.ts (Security penetration tests)

/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/components/referrals/__tests__/
├── ReferralCenter.test.tsx (Frontend component tests)
├── LeaderboardView.test.tsx (Leaderboard testing)
├── MobileQRDisplay.test.tsx (Mobile component tests)
└── visual-regression.test.ts (Visual regression tests)
```

**Documentation:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/docs/referrals/
├── README.md (User documentation)
├── api.md (API documentation)
├── technical.md (Technical implementation guide)
├── troubleshooting.md (Common issues and solutions)
├── performance.md (Performance benchmarks)
└── security.md (Security considerations)

/Users/skyphotography/CODE/WedSync-2.0/WedSync2/docs/referrals/examples/
├── wedding-photographer.md (Photographer use case)
├── dj-referral.md (DJ referral scenario)
├── venue-owner.md (Venue referral examples)
└── wedding-expo.md (Expo sharing guide)
```

**Test Results and Evidence:**
```
/Users/skyphotography/CODE/WedSync-2.0/WedSync2/test-results/
├── coverage/ (Coverage reports)
├── e2e-screenshots/ (Visual test evidence)
├── load-testing/ (Performance test results)
├── security-reports/ (Penetration test results)
└── mobile-testing/ (Mobile compatibility results)
```

## 🏁 COMPLETION CHECKLIST

**UNIT TESTING COVERAGE:**
- [ ] **Referral Service Tests** - >95% coverage with edge cases
- [ ] **Reward Processing Tests** - Stripe integration with mock scenarios  
- [ ] **QR Generation Tests** - Image creation and storage validation
- [ ] **Social Sharing Tests** - URL generation and platform compatibility
- [ ] **Validation Tests** - Input sanitization and security checks

**INTEGRATION TESTING:**
- [ ] **API Endpoint Tests** - All referral API routes tested
- [ ] **Database Integration** - PostgreSQL operations and RLS policies
- [ ] **Third-party Services** - Stripe webhooks, email delivery, storage
- [ ] **Authentication Flow** - Session validation and authorization
- [ ] **Rate Limiting Tests** - Proper enforcement of request limits

**E2E TESTING SCENARIOS:**
- [ ] **Complete Referral Flow** - Link creation to reward issuance
- [ ] **Mobile Venue Sharing** - QR code scanning in poor lighting
- [ ] **Attribution Conflicts** - Multiple referrers for same person
- [ ] **Wedding Season Load** - Peak traffic simulation
- [ ] **Cross-browser Testing** - Safari, Chrome, Samsung Internet

**PERFORMANCE TESTING:**
- [ ] **Load Testing Results** - 1000+ concurrent users handled
- [ ] **Stress Testing** - Leaderboard calculations under load
- [ ] **Volume Testing** - 10,000+ referrals in database
- [ ] **Endurance Testing** - 72-hour wedding weekend simulation
- [ ] **Mobile Performance** - <2s load times on 3G networks

**SECURITY TESTING:**
- [ ] **SQL Injection Tests** - All inputs protected
- [ ] **XSS Prevention** - Custom messages properly sanitized
- [ ] **CSRF Protection** - State-changing operations protected
- [ ] **Rate Limit Bypass** - Security boundaries enforced
- [ ] **Privilege Escalation** - Authorization properly implemented

**DOCUMENTATION DELIVERABLES:**
- [ ] **User Guide** - Complete with wedding industry examples
- [ ] **API Documentation** - Full endpoint specs with curl examples
- [ ] **Technical Guide** - Implementation details for developers
- [ ] **Troubleshooting Guide** - Common issues and solutions
- [ ] **Performance Benchmarks** - Load testing results and limits

**VISUAL REGRESSION TESTING:**
- [ ] **Component Screenshots** - All UI states documented
- [ ] **Mobile Responsiveness** - Every breakpoint verified
- [ ] **QR Code Display** - Proper rendering across devices
- [ ] **Leaderboard Views** - All filtering states captured
- [ ] **Error State Handling** - Graceful degradation verified

**EVIDENCE PACKAGE:**
- [ ] **Test Execution Proof** - All test suites passing with >90% coverage
- [ ] **Load Testing Results** - Performance metrics under wedding season load
- [ ] **Security Scan Reports** - No critical vulnerabilities found
- [ ] **Mobile Testing Matrix** - Compatibility across device types
- [ ] **Documentation Completeness** - All required docs created and reviewed

---

**EXECUTE IMMEDIATELY - Create bulletproof quality assurance for WedSync's referral system. Focus on wedding industry-specific scenarios where system failures could cost thousands of referrals during peak seasons. Ensure comprehensive testing coverage that validates both technical functionality and real-world wedding vendor usage patterns.**