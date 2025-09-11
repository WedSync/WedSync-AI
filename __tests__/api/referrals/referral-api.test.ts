/**
 * WS-344 Supplier Referral Gamification System - API Integration Tests
 * Comprehensive testing of referral API endpoints with security validation
 * Tests authentication, authorization, input validation, and business logic
 */

import { testApiHandler } from 'next-test-api-route-handler';
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { 
  createMockSupplier, 
  createMockReferral, 
  createApiTestData,
  createSecurityTestData,
  setupMockDatabase,
  cleanupMockDatabase
} from '@/test-utils/factories';
import createLinkHandler from '@/pages/api/referrals/create-link';
import trackConversionHandler from '@/pages/api/referrals/track-conversion';
import statsHandler from '@/pages/api/referrals/stats';
import leaderboardHandler from '@/pages/api/referrals/leaderboard';
import { supabase } from '@/lib/supabase';
import { redis } from '@/lib/redis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock external dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/redis');
jest.mock('@supabase/auth-helpers-nextjs');
jest.mock('@/utils/rate-limit');

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockRedis = redis as jest.Mocked<typeof redis>;
const mockCreateRouteHandlerClient = createRouteHandlerClient as jest.MockedFunction<typeof createRouteHandlerClient>;

// Test data
const testData = createApiTestData();
const securityData = createSecurityTestData();

describe('Referral API Endpoints', () => {
  const mockSupplier = createMockSupplier({ email: 'test@example.com' });
  const mockAuthToken = 'mock-jwt-token';
  
  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockCreateRouteHandlerClient.mockReturnValue(mockSupabase as any);
    
    // Default auth success
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: mockSupplier.id, email: mockSupplier.email } as any },
      error: null
    });
    
    // Default database responses
    const defaultQuery = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
    };
    
    mockSupabase.from.mockReturnValue(defaultQuery as any);
    
    // Clear Redis
    mockRedis.get.mockResolvedValue(null);
    mockRedis.setex.mockResolvedValue('OK');
    mockRedis.incr.mockResolvedValue(1);
  });
  
  afterEach(async () => {
    await cleanupMockDatabase();
  });

  describe('POST /api/referrals/create-link', () => {
    it('should require authentication', async () => {
      // Mock failed authentication
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' } as any
      });

      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testData.validCreateReferralRequest)
          });

          expect(response.status).toBe(401);
          
          const data = await response.json();
          expect(data).toEqual({
            success: false,
            error: 'Authentication required',
            code: 'UNAUTHENTICATED'
          });
        }
      });
    });

    it('should validate input with Zod schema', async () => {
      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockAuthToken}`
            },
            body: JSON.stringify({
              customMessage: 'a'.repeat(1001), // Exceeds 1000 character limit
              source: 'invalid_source' // Not in enum
            })
          });

          expect(response.status).toBe(400);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('Validation failed');
          expect(data.errors).toEqual(expect.arrayContaining([
            expect.stringContaining('Custom message must be less than 1000 characters'),
            expect.stringContaining('Invalid source value')
          ]));
        }
      });
    });

    it('should sanitize XSS in custom messages', async () => {
      const xssPayload = securityData.xssPayloads[0];
      
      // Mock successful referral creation
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'ref-123',
            code: 'ABCD2345',
            custom_message: 'Sanitized message', // XSS content removed
            created_at: new Date().toISOString()
          },
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockAuthToken}`
            },
            body: JSON.stringify({
              customMessage: xssPayload,
              source: 'dashboard'
            })
          });

          expect(response.status).toBe(201);
          
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data.shareText).not.toContain('<script>');
          expect(data.data.shareText).not.toContain('javascript:');
          
          // Verify sanitized input was stored
          expect(mockQuery.insert).toHaveBeenCalledWith(
            expect.objectContaining({
              custom_message: expect.not.stringContaining('<script>')
            })
          );
        }
      });
    });

    it('should enforce rate limiting', async () => {
      // Mock rate limit exceeded
      mockRedis.get.mockResolvedValue('5'); // At limit

      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockAuthToken}`
            },
            body: JSON.stringify(testData.validCreateReferralRequest)
          });

          expect(response.status).toBe(429);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('Rate limit exceeded');
          expect(data.code).toBe('RATE_LIMITED');
          expect(response.headers.get('Retry-After')).toBe('3600'); // 1 hour
        }
      });
    });

    it('should create referral link successfully with all components', async () => {
      const mockCode = 'ABCD2345';
      
      // Mock successful database operations
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'ref-123',
            code: mockCode,
            custom_message: 'Join me on WedSync!',
            created_at: new Date().toISOString()
          },
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      // Mock rate limiting (within limits)
      mockRedis.get.mockResolvedValue('2'); // Under limit
      mockRedis.incr.mockResolvedValue(3);

      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockAuthToken}`
            },
            body: JSON.stringify(testData.validCreateReferralRequest)
          });

          expect(response.status).toBe(201);
          expect(response.headers.get('Content-Type')).toContain('application/json');
          
          const data = await response.json();
          expect(data).toEqual({
            success: true,
            data: {
              referralCode: mockCode,
              customLink: `https://wedsync.com/join/${mockCode}`,
              qrCodeUrl: expect.stringContaining('qrserver.com'),
              shareText: expect.stringContaining('Join me on WedSync!'),
              socialLinks: {
                whatsapp: expect.stringContaining('wa.me'),
                facebook: expect.stringContaining('facebook.com'),
                twitter: expect.stringContaining('twitter.com'),
                linkedin: expect.stringContaining('linkedin.com')
              },
              expiresAt: expect.any(String),
              analytics: {
                trackingEnabled: true,
                utmSource: 'wedsync',
                utmMedium: 'referral',
                utmCampaign: mockCode
              }
            }
          });

          // Verify database was called correctly
          expect(mockQuery.insert).toHaveBeenCalledWith(
            expect.objectContaining({
              referrer_id: mockSupplier.id,
              code: mockCode,
              custom_message: 'Join me on WedSync - the best platform for wedding suppliers!',
              source: 'dashboard',
              status: 'active'
            })
          );
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database connection failed', code: 'PGRST301' }
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockAuthToken}`
            },
            body: JSON.stringify(testData.validCreateReferralRequest)
          });

          expect(response.status).toBe(500);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('Failed to create referral link');
          expect(data.code).toBe('DATABASE_ERROR');
        }
      });
    });

    it('should only accept POST method', async () => {
      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const getResponse = await fetch({ method: 'GET' });
          expect(getResponse.status).toBe(405);
          expect(getResponse.headers.get('Allow')).toBe('POST');
          
          const putResponse = await fetch({ method: 'PUT' });
          expect(putResponse.status).toBe(405);
          
          const deleteResponse = await fetch({ method: 'DELETE' });
          expect(deleteResponse.status).toBe(405);
        }
      });
    });
  });

  describe('POST /api/referrals/track-conversion', () => {
    const mockReferral = createMockReferral({
      code: 'ABCD2345',
      referrerId: 'different-supplier-id',
      status: 'active'
    });

    it('should validate referral code format', async () => {
      for (const invalidCode of securityData.invalidReferralCodes) {
        await testApiHandler({
          handler: trackConversionHandler,
          test: async ({ fetch }) => {
            const response = await fetch({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referralCode: invalidCode,
                stage: 'signup_started'
              })
            });

            expect(response.status).toBe(400);
            
            const data = await response.json();
            expect(data.success).toBe(false);
            expect(data.error).toContain('Invalid referral code format');
            expect(data.code).toBe('INVALID_INPUT');
          }
        });
      }
    });

    it('should prevent SQL injection in referral code', async () => {
      for (const sqlPayload of securityData.sqlInjectionPayloads) {
        await testApiHandler({
          handler: trackConversionHandler,
          test: async ({ fetch }) => {
            const response = await fetch({
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referralCode: sqlPayload,
                stage: 'signup_started'
              })
            });

            expect(response.status).toBe(400);
            
            const data = await response.json();
            expect(data.success).toBe(false);
            expect(data.error).not.toContain('DROP TABLE');
            expect(data.error).not.toContain('INSERT');
            expect(data.code).toBe('INVALID_INPUT');
          }
        });
      }
    });

    it('should track conversion stages correctly', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferral,
          error: null
        })
      };
      
      const mockUpdate = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockReferral, status: 'signup_started' },
          error: null
        })
      };
      
      mockSupabase.from
        .mockReturnValueOnce(mockQuery as any)    // For select
        .mockReturnValueOnce(mockUpdate as any);  // For update

      await testApiHandler({
        handler: trackConversionHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referralCode: mockReferral.code,
              stage: 'signup_started',
              metadata: {
                ip: '192.168.1.100',
                userAgent: 'Mozilla/5.0...',
                device: 'desktop'
              }
            })
          });

          expect(response.status).toBe(200);
          
          const data = await response.json();
          expect(data).toEqual({
            success: true,
            data: {
              conversionStage: 'signup_started',
              previousStage: 'active',
              rewardEarned: false,
              referralId: mockReferral.id,
              timeToConversion: expect.any(Number),
              funnel: {
                currentStage: 'signup_started',
                progress: 0.4, // 40% through funnel
                nextStage: 'signup_completed'
              }
            }
          });

          // Verify database update
          expect(mockUpdate.update).toHaveBeenCalledWith({
            status: 'signup_started',
            conversion_stage: 'signup_started',
            metadata: expect.objectContaining({
              ip: '192.168.1.100',
              userAgent: 'Mozilla/5.0...',
              device: 'desktop',
              conversion_timestamp: expect.any(String)
            })
          });
        }
      });
    });

    it('should prevent self-referral fraud', async () => {
      // Mock self-referral scenario
      const selfReferral = createMockReferral({
        code: 'SELF2345',
        referrerId: mockSupplier.id // Same as authenticated user
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: selfReferral,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: trackConversionHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockAuthToken}`
            },
            body: JSON.stringify({
              referralCode: selfReferral.code,
              stage: 'signup_started',
              referredId: mockSupplier.id
            })
          });

          expect(response.status).toBe(403);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('Self-referral not allowed');
          expect(data.code).toBe('SELF_REFERRAL_BLOCKED');
        }
      });
    });

    it('should detect IP-based fraud patterns', async () => {
      // Mock multiple referrals from same IP
      mockRedis.get.mockResolvedValue('3'); // Already 3 referrals from this IP today

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferral,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: trackConversionHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referralCode: mockReferral.code,
              stage: 'signup_started',
              metadata: {
                ip: '192.168.1.100' // Same IP as previous referrals
              }
            })
          });

          expect(response.status).toBe(403);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('Too many referrals from this IP');
          expect(data.code).toBe('IP_FRAUD_DETECTED');
        }
      });
    });

    it('should handle expired referrals', async () => {
      const expiredReferral = createMockReferral({
        code: 'EXPIRED1',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired yesterday
      });

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: expiredReferral,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: trackConversionHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referralCode: expiredReferral.code,
              stage: 'signup_started'
            })
          });

          expect(response.status).toBe(410);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('Referral link has expired');
          expect(data.code).toBe('REFERRAL_EXPIRED');
        }
      });
    });

    it('should calculate rewards for payment conversions', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockReferral,
          error: null
        })
      };
      
      const mockUpdate = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { ...mockReferral, status: 'converted', rewardEarned: 39 },
          error: null
        })
      };
      
      mockSupabase.from
        .mockReturnValueOnce(mockQuery as any)
        .mockReturnValueOnce(mockUpdate as any);

      await testApiHandler({
        handler: trackConversionHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referralCode: mockReferral.code,
              stage: 'first_payment',
              subscriptionTier: 'professional' // £39/month
            })
          });

          expect(response.status).toBe(200);
          
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data.rewardEarned).toBe(true);
          expect(data.data.rewardAmount).toBe(39); // 1 month free
          expect(data.data.rewardDescription).toBe('1 month Professional plan credit');
        }
      });
    });
  });

  describe('GET /api/referrals/stats', () => {
    it('should require authentication', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' } as any
      });

      await testApiHandler({
        handler: statsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' });
          
          expect(response.status).toBe(401);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toBe('Authentication required');
        }
      });
    });

    it('should return comprehensive supplier statistics', async () => {
      const mockStats = {
        total_referrals_sent: 25,
        pending_referrals: 8,
        converted_referrals: 12,
        expired_referrals: 5,
        total_earned: 468,
        this_month_referrals: 6,
        this_month_conversions: 3,
        conversion_rate: 48.0,
        rank: 15,
        tier: 'professional',
        recent_activity: []
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockStats,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: statsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            headers: { 'Authorization': `Bearer ${mockAuthToken}` }
          });
          
          expect(response.status).toBe(200);
          
          const data = await response.json();
          expect(data).toEqual({
            success: true,
            data: {
              overview: {
                totalReferralsSent: 25,
                pendingReferrals: 8,
                convertedReferrals: 12,
                expiredReferrals: 5,
                conversionRate: 48.0,
                totalEarned: 468
              },
              performance: {
                thisMonthReferrals: 6,
                thisMonthConversions: 3,
                currentRank: 15,
                tier: 'professional'
              },
              milestones: {
                current: {
                  conversions: 12,
                  badge: 'Bronze Referrer'
                },
                next: {
                  conversions: 15,
                  reward: 'Silver Referrer Badge',
                  progress: 0.8
                }
              },
              recentActivity: expect.any(Array)
            }
          });
        }
      });
    });

    it('should handle database errors gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error', code: 'PGRST301' }
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: statsHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            headers: { 'Authorization': `Bearer ${mockAuthToken}` }
          });
          
          expect(response.status).toBe(500);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('Failed to fetch statistics');
        }
      });
    });
  });

  describe('GET /api/referrals/leaderboard', () => {
    it('should return paginated leaderboard results', async () => {
      const mockLeaderboard = Array.from({ length: 10 }, (_, i) => ({
        supplier_id: `supplier-${i}`,
        supplier_name: `Supplier ${i}`,
        category: 'photography',
        location: 'London, UK',
        total_referrals: 20 - i,
        paid_conversions: 15 - i,
        conversion_rate: ((15 - i) / (20 - i) * 100).toFixed(2),
        total_earned: (15 - i) * 39,
        rank: i + 1
      }));

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue({
          data: mockLeaderboard,
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: leaderboardHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            search: '?limit=10&offset=0&category=photography'
          });
          
          expect(response.status).toBe(200);
          
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data.entries).toHaveLength(10);
          expect(data.data.entries[0].rank).toBe(1);
          expect(data.data.pagination).toEqual({
            limit: 10,
            offset: 0,
            hasMore: expect.any(Boolean)
          });
        }
      });
    });

    it('should validate query parameters', async () => {
      await testApiHandler({
        handler: leaderboardHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            search: '?limit=1001&offset=-1&category=invalid'
          });
          
          expect(response.status).toBe(400);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.errors).toContain('Limit must be between 1 and 100');
          expect(data.errors).toContain('Offset must be non-negative');
          expect(data.errors).toContain('Invalid category');
        }
      });
    });

    it('should sanitize location filter to prevent XSS', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: leaderboardHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            search: `?location=${encodeURIComponent('<script>alert("xss")</script>')}`
          });
          
          expect(response.status).toBe(200);
          
          // Verify that XSS content was sanitized in query
          expect(mockQuery.ilike).toHaveBeenCalledWith(
            'location',
            expect.not.stringContaining('<script>')
          );
        }
      });
    });

    it('should support category filtering', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: leaderboardHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            search: '?category=photography'
          });
          
          expect(response.status).toBe(200);
          expect(mockQuery.eq).toHaveBeenCalledWith('category', 'photography');
        }
      });
    });

    it('should handle empty results gracefully', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: leaderboardHandler,
        test: async ({ fetch }) => {
          const response = await fetch({ method: 'GET' });
          
          expect(response.status).toBe(200);
          
          const data = await response.json();
          expect(data.success).toBe(true);
          expect(data.data.entries).toHaveLength(0);
          expect(data.data.totalSuppliers).toBe(0);
        }
      });
    });

    it('should calculate trends when requested', async () => {
      const mockCurrentData = [
        { supplier_id: 'sup-1', paid_conversions: 10, rank: 1 }
      ];
      
      const mockHistoricalData = [
        { supplier_id: 'sup-1', paid_conversions: 8, rank: 2 }
      ];

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn()
          .mockResolvedValueOnce({ data: mockCurrentData, error: null })    // Current
          .mockResolvedValueOnce({ data: mockHistoricalData, error: null }) // Historical
      };
      mockSupabase.from.mockReturnValue(mockQuery as any);

      await testApiHandler({
        handler: leaderboardHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'GET',
            search: '?includeTrends=true'
          });
          
          expect(response.status).toBe(200);
          
          const data = await response.json();
          expect(data.data.entries[0].trend).toBe('up');
          expect(data.data.entries[0].trendPercentage).toBe(25); // 8 -> 10 = 25% increase
          expect(data.data.entries[0].rankChange).toBe(1); // Rank 2 -> 1 = +1
        }
      });
    });
  });

  describe('CORS and Security Headers', () => {
    it('should include proper security headers', async () => {
      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'OPTIONS'
          });

          expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
          expect(response.headers.get('X-Frame-Options')).toBe('DENY');
          expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
          expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=');
          expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
        }
      });
    });

    it('should handle CORS preflight requests', async () => {
      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'OPTIONS',
            headers: {
              'Origin': 'https://wedsync.com',
              'Access-Control-Request-Method': 'POST',
              'Access-Control-Request-Headers': 'Content-Type, Authorization'
            }
          });

          expect(response.status).toBe(200);
          expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://wedsync.com');
          expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
          expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
          expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
        }
      });
    });

    it('should reject unauthorized origins', async () => {
      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'OPTIONS',
            headers: {
              'Origin': 'https://malicious.com',
              'Access-Control-Request-Method': 'POST'
            }
          });

          expect(response.status).toBe(403);
          expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
        }
      });
    });
  });

  describe('Error Handling and Logging', () => {
    it('should log security violations', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await testApiHandler({
        handler: trackConversionHandler,
        test: async ({ fetch }) => {
          await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              referralCode: "'; DROP TABLE suppliers; --",
              stage: 'signup_started'
            })
          });
        }
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Security violation detected'),
        expect.objectContaining({
          type: 'SQL_INJECTION_ATTEMPT',
          payload: expect.stringContaining('DROP TABLE')
        })
      );

      consoleSpy.mockRestore();
    });

    it('should handle malformed JSON gracefully', async () => {
      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: '{"invalid": json"}'
          });

          expect(response.status).toBe(400);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toContain('Invalid JSON format');
          expect(data.code).toBe('INVALID_REQUEST_FORMAT');
        }
      });
    });

    it('should handle unexpected errors gracefully', async () => {
      // Force an unexpected error
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      await testApiHandler({
        handler: createLinkHandler,
        test: async ({ fetch }) => {
          const response = await fetch({
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${mockAuthToken}`
            },
            body: JSON.stringify(testData.validCreateReferralRequest)
          });

          expect(response.status).toBe(500);
          
          const data = await response.json();
          expect(data.success).toBe(false);
          expect(data.error).toBe('Internal server error');
          expect(data.code).toBe('INTERNAL_ERROR');
          expect(data.requestId).toBeDefined(); // For tracking
        }
      });
    });
  });
});