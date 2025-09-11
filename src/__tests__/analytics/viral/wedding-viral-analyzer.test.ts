import { WeddingViralAnalyzer, CohortViralData, VendorNetworkMetrics } from '@/lib/analytics/wedding-viral-analyzer';
import { createClient } from '@/lib/database/supabase-admin';

// Mock the Supabase client
jest.mock('@/lib/database/supabase-admin');
const mockSupabase = createClient as jest.MockedFunction<typeof createClient>;

describe('WeddingViralAnalyzer', () => {
  let analyzer: WeddingViralAnalyzer;
  let mockSupabaseInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockSupabaseInstance = {
      from: jest.fn(),
      rpc: jest.fn()
    };
    
    mockSupabase.mockReturnValue(mockSupabaseInstance);
    analyzer = new WeddingViralAnalyzer();
  });

  describe('analyzeWeddingCohortVirality', () => {
    it('should analyze wedding cohort virality correctly', async () => {
      const weddingDate = new Date('2024-06-15'); // Peak season wedding
      
      // Mock cohort users data
      const mockCohortUsers = [
        {
          id: 'couple1',
          user_type: 'couple',
          created_at: '2024-06-01',
          supplier_profiles: null,
          couple_profiles: [{ wedding_date: '2024-08-15' }]
        },
        {
          id: 'vendor1',
          user_type: 'supplier',
          created_at: '2024-06-05',
          supplier_profiles: [{ vendor_type: 'photographer' }],
          couple_profiles: null
        },
        {
          id: 'vendor2',
          user_type: 'supplier',
          created_at: '2024-06-10',
          supplier_profiles: [{ vendor_type: 'venue' }],
          couple_profiles: null
        }
      ];

      // Mock referrals data
      const mockIntraCohortReferrals = [
        { inviter_id: 'vendor1', invitee_id: 'couple1', status: 'activated' },
        { inviter_id: 'vendor2', invitee_id: 'couple1', status: 'sent' }
      ];

      const mockCrossCohortReferrals = [
        { inviter_id: 'vendor1', invitee_id: 'vendor3', status: 'activated' }
      ];

      // Setup mock responses
      mockSupabaseInstance.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: mockCohortUsers,
                  error: null
                }))
              }))
            }))
          };
        }
        
        if (table === 'invitation_tracking') {
          return {
            select: jest.fn(() => ({
              in: jest.fn((field: string, values: string[]) => {
                if (field === 'inviter_id' && values.includes('vendor1')) {
                  return {
                    in: jest.fn(() => ({
                      data: mockIntraCohortReferrals,
                      error: null
                    })),
                    not: jest.fn(() => ({
                      data: mockCrossCohortReferrals,
                      error: null
                    }))
                  };
                }
                return { data: [], error: null };
              }))
            }))
          };
        }

        if (table === 'client_supplier_relationships') {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                data: [
                  { client_id: 'couple1', supplier_id: 'vendor1' },
                  { client_id: 'couple1', supplier_id: 'vendor2' }
                ],
                error: null
              }))
            }))
          };
        }
        
        return { select: jest.fn(() => ({ data: [], error: null })) };
      });

      // Mock RPC calls
      mockSupabaseInstance.rpc.mockImplementation((funcName: string) => {
        switch (funcName) {
          case 'analyze_vendor_viral_breakdown':
            return {
              data: [
                {
                  vendor_type: 'photographer',
                  viral_coefficient: 1.2,
                  invitation_rate: 0.8,
                  conversion_rate: 0.6,
                  revenue_attribution: 1500,
                  network_effect: 1.3
                }
              ],
              error: null
            };
          case 'analyze_geographic_viral_spread':
            return {
              data: [
                {
                  region: 'London',
                  viral_strength: 0.9,
                  cluster_size: 25,
                  network_density: 0.7
                }
              ],
              error: null
            };
          default:
            return { data: [], error: null };
        }
      });

      const result = await analyzer.analyzeWeddingCohortVirality(weddingDate);

      expect(result).toBeDefined();
      expect(result.cohortMonth).toBe('2024-06');
      expect(result.totalCouples).toBe(1);
      expect(result.totalVendors).toBe(2);
      
      // Check viral metrics
      expect(result.viralMetrics).toBeDefined();
      expect(result.viralMetrics.viralCoefficient).toBeGreaterThanOrEqual(0);
      expect(result.viralMetrics.intraCohortReferrals).toBe(2);
      expect(result.viralMetrics.crossCohortReferrals).toBe(1);
      
      // Check network analysis
      expect(result.networkAnalysis).toBeDefined();
      expect(result.networkAnalysis.avgVendorsPerCouple).toBeGreaterThanOrEqual(0);
      expect(result.networkAnalysis.avgCouplesPerVendor).toBeGreaterThanOrEqual(0);
      
      // Check seasonal factors
      expect(result.seasonalFactors).toBeDefined();
      expect(result.seasonalFactors.weddingDensity).toBe(2.5); // Peak season
      expect(result.seasonalFactors.viralPotential).toBeGreaterThan(0);
      
      // Check cross-cohort influence
      expect(result.crossCohortInfluence).toBeDefined();
      expect(Array.isArray(result.crossCohortInfluence.influencingCohorts)).toBe(true);
      expect(Array.isArray(result.crossCohortInfluence.influencedCohorts)).toBe(true);
    });

    it('should handle different wedding seasons correctly', async () => {
      // Test off-season wedding
      const offSeasonDate = new Date('2024-01-15');
      
      mockSupabaseInstance.from.mockReturnValue({
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              data: [{ id: 'user1', user_type: 'couple' }],
              error: null
            }))
          })),
          in: jest.fn(() => ({ data: [], error: null }))
        }))
      });

      mockSupabaseInstance.rpc.mockReturnValue({ data: [], error: null });

      const result = await analyzer.analyzeWeddingCohortVirality(offSeasonDate);
      
      expect(result.seasonalFactors.weddingDensity).toBe(0.5); // Off season
      expect(result.seasonalFactors.competitionLevel).toBe(0.7); // Low competition
      expect(result.seasonalFactors.demandStress).toBe(0.8); // Low stress
    });

    it('should calculate network metrics accurately', async () => {
      const weddingDate = new Date('2024-06-15');
      
      // Mock data with more complex network
      const networkUsers = [
        { id: 'c1', user_type: 'couple' },
        { id: 'c2', user_type: 'couple' },
        { id: 'v1', user_type: 'supplier', supplier_profiles: [{ vendor_type: 'photographer' }] },
        { id: 'v2', user_type: 'supplier', supplier_profiles: [{ vendor_type: 'venue' }] },
        { id: 'v3', user_type: 'supplier', supplier_profiles: [{ vendor_type: 'caterer' }] }
      ];

      const networkConnections = [
        { client_id: 'c1', supplier_id: 'v1' },
        { client_id: 'c1', supplier_id: 'v2' },
        { client_id: 'c2', supplier_id: 'v1' }, // Shared vendor
        { client_id: 'c2', supplier_id: 'v3' }
      ];

      mockSupabaseInstance.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: networkUsers,
                  error: null
                }))
              }))
            }))
          };
        }
        
        if (table === 'client_supplier_relationships') {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                data: networkConnections,
                error: null
              }))
            }))
          };
        }
        
        return { select: jest.fn(() => ({ data: [], error: null })) };
      });

      mockSupabaseInstance.rpc.mockReturnValue({ data: [], error: null });

      const result = await analyzer.analyzeWeddingCohortVirality(weddingDate);
      
      // Should detect vendor overlap (v1 is shared between c1 and c2)
      expect(result.networkAnalysis.vendorOverlapRate).toBeGreaterThan(0);
      expect(result.networkAnalysis.avgVendorsPerCouple).toBeCloseTo(2.0, 1);
      expect(result.networkAnalysis.avgCouplesPerVendor).toBeCloseTo(1.33, 1);
    });

    it('should handle empty cohort data gracefully', async () => {
      const weddingDate = new Date('2024-06-15');
      
      mockSupabaseInstance.from.mockReturnValue({
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              data: [], // Empty cohort
              error: null
            }))
          })),
          in: jest.fn(() => ({ data: [], error: null }))
        }))
      });

      mockSupabaseInstance.rpc.mockReturnValue({ data: [], error: null });

      const result = await analyzer.analyzeWeddingCohortVirality(weddingDate);
      
      expect(result.totalCouples).toBe(0);
      expect(result.totalVendors).toBe(0);
      expect(result.viralMetrics.viralCoefficient).toBe(0);
      expect(result.networkAnalysis.avgVendorsPerCouple).toBe(0);
    });
  });

  describe('trackVendorReferralNetwork', () => {
    it('should track vendor referral network correctly', async () => {
      // Mock vendor referral data
      const mockReferrals = [
        {
          inviter_id: 'vendor1',
          invitee_id: 'vendor2',
          status: 'activated',
          attribution_value: 500,
          quality_score: 0.8,
          sent_at: '2024-06-01',
          activated_at: '2024-06-03',
          user_profiles: { user_type: 'supplier', supplier_profiles: [{ vendor_type: 'photographer' }] },
          invitee_profiles: { user_type: 'supplier', supplier_profiles: [{ vendor_type: 'venue' }] }
        },
        {
          inviter_id: 'vendor2',
          invitee_id: 'vendor3',
          status: 'activated',
          attribution_value: 750,
          quality_score: 0.9,
          sent_at: '2024-06-05',
          activated_at: '2024-06-07',
          user_profiles: { user_type: 'supplier', supplier_profiles: [{ vendor_type: 'venue' }] },
          invitee_profiles: { user_type: 'supplier', supplier_profiles: [{ vendor_type: 'caterer' }] }
        }
      ];

      mockSupabaseInstance.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockReferrals,
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await analyzer.trackVendorReferralNetwork();

      expect(result).toBeDefined();
      expect(Array.isArray(result.networkMap)).toBe(true);
      expect(Array.isArray(result.referralChains)).toBe(true);
      expect(Array.isArray(result.hubVendors)).toBe(true);
      expect(Array.isArray(result.bridgeVendors)).toBe(true);
      expect(Array.isArray(result.isolatedVendors)).toBe(true);
      expect(result.networkHealth).toBeDefined();

      // Check network connections
      expect(result.networkMap.length).toBeGreaterThan(0);
      result.networkMap.forEach(connection => {
        expect(connection.fromVendorId).toBeDefined();
        expect(connection.toVendorId).toBeDefined();
        expect(connection.connectionStrength).toBeGreaterThanOrEqual(0);
        expect(connection.referralCount).toBeGreaterThan(0);
        expect(connection.revenueGenerated).toBeGreaterThanOrEqual(0);
      });

      // Check network health metrics
      const health = result.networkHealth;
      expect(health.connectivity).toBeGreaterThanOrEqual(0);
      expect(health.connectivity).toBeLessThanOrEqual(1);
      expect(health.resilience).toBeGreaterThanOrEqual(0);
      expect(health.resilience).toBeLessThanOrEqual(1);
      expect(health.efficiency).toBeGreaterThanOrEqual(0);
      expect(health.diversity).toBeGreaterThanOrEqual(0);
      expect(health.diversity).toBeLessThanOrEqual(1);
    });

    it('should identify vendor hubs correctly', async () => {
      // Mock high-activity vendor data
      const mockReferrals = [
        // vendor1 is a hub (many outgoing and incoming)
        { inviter_id: 'vendor1', invitee_id: 'vendor2', attribution_value: 500, quality_score: 0.8, user_profiles: { supplier_profiles: [{ vendor_type: 'photographer' }] }, invitee_profiles: { supplier_profiles: [{ vendor_type: 'venue' }] } },
        { inviter_id: 'vendor1', invitee_id: 'vendor3', attribution_value: 600, quality_score: 0.9, user_profiles: { supplier_profiles: [{ vendor_type: 'photographer' }] }, invitee_profiles: { supplier_profiles: [{ vendor_type: 'caterer' }] } },
        { inviter_id: 'vendor2', invitee_id: 'vendor1', attribution_value: 700, quality_score: 0.7, user_profiles: { supplier_profiles: [{ vendor_type: 'venue' }] }, invitee_profiles: { supplier_profiles: [{ vendor_type: 'photographer' }] } },
        { inviter_id: 'vendor3', invitee_id: 'vendor1', attribution_value: 400, quality_score: 0.6, user_profiles: { supplier_profiles: [{ vendor_type: 'caterer' }] }, invitee_profiles: { supplier_profiles: [{ vendor_type: 'photographer' }] } }
      ];

      mockSupabaseInstance.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockReferrals,
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await analyzer.trackVendorReferralNetwork();

      // Should identify vendor1 as a hub
      expect(result.hubVendors.length).toBeGreaterThan(0);
      
      const topHub = result.hubVendors[0];
      expect(topHub.outgoingReferrals).toBeGreaterThan(0);
      expect(topHub.incomingReferrals).toBeGreaterThan(0);
      expect(topHub.networkReach).toBeGreaterThan(0);
      expect(topHub.influenceRadius).toBeGreaterThan(0);
      expect(topHub.vendorType).toBeDefined();
    });

    it('should handle empty vendor network gracefully', async () => {
      mockSupabaseInstance.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: [], // No referrals
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await analyzer.trackVendorReferralNetwork();

      expect(result.networkMap).toHaveLength(0);
      expect(result.referralChains).toHaveLength(0);
      expect(result.hubVendors).toHaveLength(0);
      expect(result.bridgeVendors).toHaveLength(0);
      expect(result.isolatedVendors).toHaveLength(0);
      expect(result.networkHealth.connectivity).toBe(0);
    });

    it('should calculate referral chains correctly', async () => {
      // Mock chain of referrals: vendor1 -> vendor2 -> vendor3
      const mockReferrals = [
        {
          inviter_id: 'vendor1',
          invitee_id: 'vendor2',
          status: 'activated',
          attribution_value: 500,
          quality_score: 0.8,
          user_profiles: { supplier_profiles: [{ vendor_type: 'photographer' }] },
          invitee_profiles: { supplier_profiles: [{ vendor_type: 'venue' }] }
        },
        {
          inviter_id: 'vendor2',
          invitee_id: 'vendor3',
          status: 'activated',
          attribution_value: 600,
          quality_score: 0.9,
          user_profiles: { supplier_profiles: [{ vendor_type: 'venue' }] },
          invitee_profiles: { supplier_profiles: [{ vendor_type: 'caterer' }] }
        }
      ];

      mockSupabaseInstance.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              eq: jest.fn(() => ({
                data: mockReferrals,
                error: null
              }))
            }))
          }))
        }))
      });

      const result = await analyzer.trackVendorReferralNetwork();

      // Should detect referral chains
      expect(result.referralChains.length).toBeGreaterThan(0);
      
      result.referralChains.forEach(chain => {
        expect(chain.chainLength).toBeGreaterThan(1);
        expect(chain.vendorPath.length).toBe(chain.chainLength);
        expect(chain.totalRevenue).toBeGreaterThanOrEqual(0);
        expect(chain.conversionRate).toBeGreaterThanOrEqual(0);
        expect(chain.conversionRate).toBeLessThanOrEqual(1);
        expect(chain.chainEfficiency).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Cross-Cohort Analysis', () => {
    it('should analyze cross-cohort influence correctly', async () => {
      const weddingDate = new Date('2024-06-15');
      
      // Mock users from current cohort
      const cohortUsers = [{ id: 'user1', user_type: 'supplier' }];
      
      // Mock influencing cohorts (previous months)
      const influencingReferrals = [
        {
          inviter_id: 'older_user1',
          invitee_id: 'user1',
          quality_score: 0.8,
          attribution_value: 500,
          user_profiles: { created_at: '2024-05-15' }
        }
      ];

      // Mock influenced cohorts (future months)
      const influencedReferrals = [
        {
          inviter_id: 'user1',
          invitee_id: 'newer_user1',
          quality_score: 0.9,
          attribution_value: 600,
          user_profiles: { created_at: '2024-07-15' }
        }
      ];

      let selectCallCount = 0;
      mockSupabaseInstance.from.mockImplementation((table: string) => {
        if (table === 'user_profiles') {
          return {
            select: jest.fn(() => ({
              gte: jest.fn(() => ({
                lte: jest.fn(() => ({
                  data: cohortUsers,
                  error: null
                }))
              }))
            }))
          };
        }
        
        if (table === 'invitation_tracking') {
          return {
            select: jest.fn(() => ({
              in: jest.fn(() => ({
                eq: jest.fn(() => ({
                  lt: jest.fn(() => ({
                    data: influencingReferrals,
                    error: null
                  })),
                  gt: jest.fn(() => ({
                    data: influencedReferrals,
                    error: null
                  }))
                }))
              }))
            }))
          };
        }
        
        return { select: jest.fn(() => ({ data: [], error: null })) };
      });

      mockSupabaseInstance.rpc.mockReturnValue({ data: [], error: null });

      const result = await analyzer.analyzeWeddingCohortVirality(weddingDate);
      
      expect(result.crossCohortInfluence).toBeDefined();
      expect(result.crossCohortInfluence.temporalDecay).toBeGreaterThanOrEqual(0);
      expect(result.crossCohortInfluence.temporalDecay).toBeLessThanOrEqual(1);
      expect(result.crossCohortInfluence.crossSeasonalEffect).toBeGreaterThanOrEqual(0);
      expect(result.crossCohortInfluence.crossSeasonalEffect).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const weddingDate = new Date('2024-06-15');
      
      mockSupabaseInstance.from.mockReturnValue({
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              data: null,
              error: { message: 'Database connection failed' }
            }))
          }))
        }))
      });

      await expect(analyzer.analyzeWeddingCohortVirality(weddingDate)).rejects.toThrow('Failed to get cohort users');
    });

    it('should handle RPC function errors gracefully', async () => {
      const weddingDate = new Date('2024-06-15');
      
      mockSupabaseInstance.from.mockReturnValue({
        select: jest.fn(() => ({
          gte: jest.fn(() => ({
            lte: jest.fn(() => ({
              data: [{ id: 'user1', user_type: 'couple' }],
              error: null
            }))
          })),
          in: jest.fn(() => ({ data: [], error: null }))
        }))
      });

      // Mock RPC error
      mockSupabaseInstance.rpc.mockReturnValue({
        data: null,
        error: { message: 'RPC function failed' }
      });

      const result = await analyzer.analyzeWeddingCohortVirality(weddingDate);
      
      // Should continue with empty data rather than failing
      expect(result.viralMetrics.viralCoefficient).toBe(0);
      expect(result.networkAnalysis.centralityMetrics).toHaveLength(0);
    });
  });
});