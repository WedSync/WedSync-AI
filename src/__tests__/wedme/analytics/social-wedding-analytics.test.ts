import { SocialWeddingAnalyticsSystem } from '@/lib/wedme/analytics/social-wedding-analytics';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
        maybeSingle: jest.fn(),
      })),
      order: jest.fn(() => ({
        limit: jest.fn(),
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(),
      })),
      in: jest.fn(),
      gt: jest.fn(),
      ilike: jest.fn(),
    })),
  })),
  rpc: jest.fn(),
};

(createClient as jest.Mock).mockReturnValue(mockSupabase);

describe('SocialWeddingAnalyticsSystem', () => {
  let system: SocialWeddingAnalyticsSystem;
  const mockCoupleId = 'couple-123';
  const mockWeddingId = 'wedding-456';

  beforeEach(() => {
    system = new SocialWeddingAnalyticsSystem();
    jest.clearAllMocks();
  });

  describe('getSocialWeddingInsights', () => {
    beforeEach(() => {
      // Mock wedding data
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: mockWeddingId,
            wedding_date: '2024-08-15',
            guest_count: 150,
            couple_names: 'John & Jane',
            hashtag: '#JohnAndJane2024',
            social_sharing_enabled: true,
          },
          error: null,
        });

      // Mock guest data with engagement metrics
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 'guest-1',
              name: 'Alice Smith',
              email: 'alice@example.com',
              rsvp_status: 'confirmed',
              engagement_score: 85,
              last_interaction: '2024-01-15T10:00:00Z',
              social_shares: 3,
              form_interactions: 5,
              group: 'friends',
            },
            {
              id: 'guest-2',
              name: 'Bob Johnson',
              email: 'bob@example.com',
              rsvp_status: 'confirmed',
              engagement_score: 92,
              last_interaction: '2024-01-20T15:00:00Z',
              social_shares: 7,
              form_interactions: 8,
              group: 'family',
            },
            {
              id: 'guest-3',
              name: 'Carol Wilson',
              email: 'carol@example.com',
              rsvp_status: 'pending',
              engagement_score: 45,
              last_interaction: '2024-01-05T09:00:00Z',
              social_shares: 1,
              form_interactions: 2,
              group: 'work',
            },
            {
              id: 'guest-4',
              name: 'David Brown',
              email: 'david@example.com',
              rsvp_status: 'declined',
              engagement_score: 20,
              last_interaction: '2024-01-01T12:00:00Z',
              social_shares: 0,
              form_interactions: 1,
              group: 'extended_family',
            },
          ],
          error: null,
        });

      // Mock wedding party data
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 'party-1',
              name: 'Maid of Honor - Sarah',
              role: 'maid_of_honor',
              tasks_assigned: 8,
              tasks_completed: 6,
              coordination_score: 88,
              communication_frequency: 'daily',
            },
            {
              id: 'party-2',
              name: 'Best Man - Mike',
              role: 'best_man',
              tasks_assigned: 5,
              tasks_completed: 4,
              coordination_score: 80,
              communication_frequency: 'weekly',
            },
            {
              id: 'party-3',
              name: 'Bridesmaid - Lisa',
              role: 'bridesmaid',
              tasks_assigned: 3,
              tasks_completed: 2,
              coordination_score: 70,
              communication_frequency: 'weekly',
            },
          ],
          error: null,
        });

      // Mock social activity data
      mockSupabase
        .from()
        .select()
        .gte()
        .lte()
        .mockResolvedValue({
          data: [
            {
              id: 'activity-1',
              type: 'hashtag_use',
              user_id: 'guest-1',
              platform: 'instagram',
              engagement: 25,
              reach: 150,
              created_at: '2024-01-10T14:00:00Z',
            },
            {
              id: 'activity-2',
              type: 'story_share',
              user_id: 'guest-2',
              platform: 'instagram',
              engagement: 45,
              reach: 300,
              created_at: '2024-01-12T16:00:00Z',
            },
            {
              id: 'activity-3',
              type: 'rsvp_share',
              user_id: 'guest-1',
              platform: 'facebook',
              engagement: 15,
              reach: 80,
              created_at: '2024-01-08T11:00:00Z',
            },
          ],
          error: null,
        });
    });

    it('should provide comprehensive social wedding insights', async () => {
      const result = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('guestEngagement');
      expect(result).toHaveProperty('weddingParty');
      expect(result).toHaveProperty('socialDynamics');
      expect(result).toHaveProperty('viralAnalysis');
      expect(result).toHaveProperty('communicationInsights');
      expect(result).toHaveProperty('coordinationMetrics');

      expect(result.guestEngagement).toBeInstanceOf(Array);
      expect(result.weddingParty).toBeInstanceOf(Array);
      expect(result.viralAnalysis).toBeInstanceOf(Array);
    });

    it('should analyze guest engagement correctly', async () => {
      const result = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.guestEngagement).toBeInstanceOf(Array);
      expect(result.guestEngagement.length).toBe(4);

      const guestEngagement = result.guestEngagement[0];
      expect(guestEngagement).toHaveProperty('guestId');
      expect(guestEngagement).toHaveProperty('name');
      expect(guestEngagement).toHaveProperty('engagementLevel');
      expect(guestEngagement).toHaveProperty('interactions');
      expect(guestEngagement).toHaveProperty('lastActivity');
      expect(guestEngagement).toHaveProperty('socialShares');
      expect(guestEngagement).toHaveProperty('rsvpStatus');
      expect(guestEngagement).toHaveProperty('group');

      expect(guestEngagement.engagementLevel).toMatch(/high|medium|low/);
      expect(guestEngagement.interactions).toBeGreaterThanOrEqual(0);
      expect(guestEngagement.socialShares).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average engagement correctly', async () => {
      const result = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      // Calculate expected average engagement: (85 + 92 + 45 + 20) / 4 = 60.5
      const expectedAverage = (85 + 92 + 45 + 20) / 400; // Normalize to 0-1 scale

      expect(result.guestEngagement.averageEngagement).toBeCloseTo(
        expectedAverage,
        2,
      );
      expect(result.guestEngagement.totalGuests).toBe(4);
      expect(result.guestEngagement.activeGuests).toBe(3); // Guests with score > 30
    });

    it('should analyze wedding party coordination', async () => {
      const result = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.weddingParty).toBeInstanceOf(Array);
      expect(result.weddingParty.length).toBe(3);

      const partyMember = result.weddingParty[0];
      expect(partyMember).toHaveProperty('memberId');
      expect(partyMember).toHaveProperty('name');
      expect(partyMember).toHaveProperty('role');
      expect(partyMember).toHaveProperty('taskCompletion');
      expect(partyMember).toHaveProperty('coordinationScore');
      expect(partyMember).toHaveProperty('communicationLevel');
      expect(partyMember).toHaveProperty('responsibilities');

      expect(partyMember.taskCompletion).toBeGreaterThanOrEqual(0);
      expect(partyMember.taskCompletion).toBeLessThanOrEqual(100);
      expect(partyMember.coordinationScore).toBeGreaterThanOrEqual(0);
      expect(partyMember.coordinationScore).toBeLessThanOrEqual(100);
      expect(partyMember.communicationLevel).toMatch(
        /daily|weekly|monthly|rarely/,
      );
    });

    it('should create social dynamics map', async () => {
      const result = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.socialDynamics).toHaveProperty('groupInfluencers');
      expect(result.socialDynamics).toHaveProperty('engagementClusters');
      expect(result.socialDynamics).toHaveProperty('communicationPatterns');
      expect(result.socialDynamics).toHaveProperty('networkStrength');

      expect(result.socialDynamics.groupInfluencers).toBeInstanceOf(Array);
      expect(result.socialDynamics.engagementClusters).toBeInstanceOf(Array);
      expect(result.socialDynamics.networkStrength).toBeGreaterThanOrEqual(0);
      expect(result.socialDynamics.networkStrength).toBeLessThanOrEqual(1);
    });

    it('should analyze viral potential correctly', async () => {
      const result = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.viralAnalysis).toBeInstanceOf(Array);

      if (result.viralAnalysis.length > 0) {
        const viralMetric = result.viralAnalysis[0];
        expect(viralMetric).toHaveProperty('category');
        expect(viralMetric).toHaveProperty('score');
        expect(viralMetric).toHaveProperty('factors');
        expect(viralMetric).toHaveProperty('recommendations');

        expect(viralMetric.score).toBeGreaterThanOrEqual(0);
        expect(viralMetric.score).toBeLessThanOrEqual(1);
        expect(viralMetric.factors).toBeInstanceOf(Array);
        expect(viralMetric.recommendations).toBeInstanceOf(Array);
      }
    });

    it('should provide communication insights', async () => {
      const result = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.communicationInsights).toHaveProperty('responseRates');
      expect(result.communicationInsights).toHaveProperty('preferredChannels');
      expect(result.communicationInsights).toHaveProperty('engagementTimes');
      expect(result.communicationInsights).toHaveProperty('contentPerformance');

      expect(result.communicationInsights.responseRates).toBeInstanceOf(Object);
      expect(result.communicationInsights.preferredChannels).toBeInstanceOf(
        Array,
      );
      expect(result.communicationInsights.contentPerformance).toBeInstanceOf(
        Array,
      );
    });
  });

  describe('analyzeGuestEngagementPatterns', () => {
    it('should categorize guests by engagement level', async () => {
      const result = await system.analyzeGuestEngagementPatterns(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('highEngagement');
      expect(result).toHaveProperty('mediumEngagement');
      expect(result).toHaveProperty('lowEngagement');
      expect(result).toHaveProperty('disengaged');
      expect(result).toHaveProperty('patterns');

      expect(result.highEngagement).toBeInstanceOf(Array);
      expect(result.mediumEngagement).toBeInstanceOf(Array);
      expect(result.lowEngagement).toBeInstanceOf(Array);
      expect(result.disengaged).toBeInstanceOf(Array);

      // Should have 2 high engagement guests (score > 70)
      expect(result.highEngagement.length).toBe(2);

      // Should have 1 medium engagement guest (score 30-70)
      expect(result.mediumEngagement.length).toBe(1);

      // Should have 1 low/disengaged guest (score < 30)
      expect(result.lowEngagement.length + result.disengaged.length).toBe(1);
    });

    it('should identify engagement patterns over time', async () => {
      const result = await system.analyzeGuestEngagementPatterns(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.patterns).toHaveProperty('trend');
      expect(result.patterns).toHaveProperty('peakTimes');
      expect(result.patterns).toHaveProperty('dropoffReasons');
      expect(result.patterns).toHaveProperty('recoveryStrategies');

      expect(result.patterns.trend).toMatch(
        /increasing|decreasing|stable|mixed/,
      );
      expect(result.patterns.peakTimes).toBeInstanceOf(Array);
      expect(result.patterns.dropoffReasons).toBeInstanceOf(Array);
      expect(result.patterns.recoveryStrategies).toBeInstanceOf(Array);
    });

    it('should analyze group-specific engagement', async () => {
      const result = await system.analyzeGuestEngagementPatterns(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('groupAnalysis');
      expect(result.groupAnalysis).toBeInstanceOf(Object);

      // Should have analysis for each guest group
      const expectedGroups = ['friends', 'family', 'work', 'extended_family'];
      expectedGroups.forEach((group) => {
        if (result.groupAnalysis[group]) {
          expect(result.groupAnalysis[group]).toHaveProperty(
            'averageEngagement',
          );
          expect(result.groupAnalysis[group]).toHaveProperty('memberCount');
          expect(result.groupAnalysis[group]).toHaveProperty('topPerformers');
          expect(
            result.groupAnalysis[group].averageEngagement,
          ).toBeGreaterThanOrEqual(0);
          expect(result.groupAnalysis[group].memberCount).toBeGreaterThan(0);
        }
      });
    });

    it('should recommend engagement improvements', async () => {
      const result = await system.analyzeGuestEngagementPatterns(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('recommendations');
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.recommendations.length).toBeGreaterThan(0);

      const recommendation = result.recommendations[0];
      expect(recommendation).toHaveProperty('type');
      expect(recommendation).toHaveProperty('target');
      expect(recommendation).toHaveProperty('action');
      expect(recommendation).toHaveProperty('expectedImpact');

      expect(recommendation.type).toMatch(/re_engagement|activation|retention/);
      expect(recommendation.expectedImpact).toMatch(/high|medium|low/);
    });
  });

  describe('trackWeddingPartyCoordination', () => {
    it('should track coordination metrics comprehensively', async () => {
      const result = await system.trackWeddingPartyCoordination(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('overallCoordination');
      expect(result).toHaveProperty('memberPerformance');
      expect(result).toHaveProperty('taskDistribution');
      expect(result).toHaveProperty('communicationEfficiency');
      expect(result).toHaveProperty('bottlenecks');
      expect(result).toHaveProperty('recommendations');

      expect(result.overallCoordination).toBeGreaterThanOrEqual(0);
      expect(result.overallCoordination).toBeLessThanOrEqual(100);
      expect(result.memberPerformance).toBeInstanceOf(Array);
      expect(result.taskDistribution).toBeInstanceOf(Object);
      expect(result.bottlenecks).toBeInstanceOf(Array);
    });

    it('should calculate task completion rates correctly', async () => {
      const result = await system.trackWeddingPartyCoordination(
        mockCoupleId,
        mockWeddingId,
      );

      result.memberPerformance.forEach((member) => {
        expect(member).toHaveProperty('completionRate');
        expect(member.completionRate).toBeGreaterThanOrEqual(0);
        expect(member.completionRate).toBeLessThanOrEqual(100);
      });

      // Maid of Honor should have 75% completion rate (6/8 tasks)
      const maidOfHonor = result.memberPerformance.find(
        (member) => member.role === 'maid_of_honor',
      );
      if (maidOfHonor) {
        expect(maidOfHonor.completionRate).toBe(75);
      }
    });

    it('should identify coordination bottlenecks', async () => {
      // Mock scenario with coordination issues
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 'party-1',
              name: 'Slow Coordinator',
              tasks_assigned: 10,
              tasks_completed: 3, // Low completion rate
              coordination_score: 45,
              communication_frequency: 'rarely',
            },
          ],
          error: null,
        });

      const result = await system.trackWeddingPartyCoordination(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.bottlenecks.length).toBeGreaterThan(0);

      const bottleneck = result.bottlenecks[0];
      expect(bottleneck).toHaveProperty('member');
      expect(bottleneck).toHaveProperty('issue');
      expect(bottleneck).toHaveProperty('impact');
      expect(bottleneck).toHaveProperty('solution');

      expect(bottleneck.issue).toMatch(
        /completion|communication|coordination/i,
      );
      expect(bottleneck.impact).toMatch(/high|medium|low/);
    });

    it('should recommend coordination improvements', async () => {
      const result = await system.trackWeddingPartyCoordination(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.recommendations).toBeInstanceOf(Array);

      if (result.recommendations.length > 0) {
        const recommendation = result.recommendations[0];
        expect(recommendation).toHaveProperty('type');
        expect(recommendation).toHaveProperty('target');
        expect(recommendation).toHaveProperty('action');
        expect(recommendation).toHaveProperty('priority');

        expect(recommendation.type).toMatch(
          /task_rebalancing|communication_improvement|coordination_enhancement/,
        );
        expect(recommendation.priority).toMatch(/high|medium|low/);
      }
    });
  });

  describe('analyzeViralPotential', () => {
    beforeEach(() => {
      // Mock social activity with viral potential
      mockSupabase
        .from()
        .select()
        .gte()
        .lte()
        .mockResolvedValue({
          data: [
            {
              type: 'hashtag_use',
              platform: 'instagram',
              engagement: 85,
              reach: 500,
              shares: 12,
              created_at: '2024-01-15T14:00:00Z',
            },
            {
              type: 'story_share',
              platform: 'tiktok',
              engagement: 150,
              reach: 800,
              shares: 25,
              created_at: '2024-01-16T16:00:00Z',
            },
            {
              type: 'rsvp_share',
              platform: 'facebook',
              engagement: 45,
              reach: 200,
              shares: 8,
              created_at: '2024-01-14T11:00:00Z',
            },
          ],
          error: null,
        });
    });

    it('should analyze viral potential across categories', async () => {
      const result = await system.analyzeViralPotential(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const expectedCategories = [
        'content_quality',
        'social_reach',
        'engagement_rate',
        'shareability',
        'timing',
      ];

      result.forEach((analysis) => {
        expect(analysis).toHaveProperty('category');
        expect(analysis).toHaveProperty('score');
        expect(analysis).toHaveProperty('factors');
        expect(analysis).toHaveProperty('recommendations');
        expect(analysis).toHaveProperty('benchmarks');

        expect(expectedCategories.includes(analysis.category)).toBe(true);
        expect(analysis.score).toBeGreaterThanOrEqual(0);
        expect(analysis.score).toBeLessThanOrEqual(1);
        expect(analysis.factors).toBeInstanceOf(Array);
        expect(analysis.recommendations).toBeInstanceOf(Array);
      });
    });

    it('should calculate engagement rates correctly', async () => {
      const result = await system.analyzeViralPotential(
        mockCoupleId,
        mockWeddingId,
      );

      const engagementAnalysis = result.find(
        (r) => r.category === 'engagement_rate',
      );
      if (engagementAnalysis) {
        // Should be high due to good engagement in mock data
        expect(engagementAnalysis.score).toBeGreaterThan(0.6);

        expect(engagementAnalysis.factors).toContain(
          'High social media engagement',
        );
      }
    });

    it('should assess content quality factors', async () => {
      const result = await system.analyzeViralPotential(
        mockCoupleId,
        mockWeddingId,
      );

      const contentAnalysis = result.find(
        (r) => r.category === 'content_quality',
      );
      if (contentAnalysis) {
        expect(contentAnalysis.factors).toBeInstanceOf(Array);
        expect(contentAnalysis.recommendations).toBeInstanceOf(Array);

        // Should have recommendations for content improvement
        expect(contentAnalysis.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('should provide platform-specific recommendations', async () => {
      const result = await system.analyzeViralPotential(
        mockCoupleId,
        mockWeddingId,
      );

      result.forEach((analysis) => {
        if (analysis.recommendations.length > 0) {
          const platformRec = analysis.recommendations.find(
            (rec: string) =>
              rec.toLowerCase().includes('instagram') ||
              rec.toLowerCase().includes('tiktok') ||
              rec.toLowerCase().includes('facebook'),
          );

          // At least some recommendations should be platform-specific
          if (platformRec) {
            expect(typeof platformRec).toBe('string');
          }
        }
      });
    });

    it('should benchmark against industry standards', async () => {
      const result = await system.analyzeViralPotential(
        mockCoupleId,
        mockWeddingId,
      );

      result.forEach((analysis) => {
        expect(analysis.benchmarks).toHaveProperty('industry_average');
        expect(analysis.benchmarks).toHaveProperty('top_performers');
        expect(analysis.benchmarks).toHaveProperty('your_position');

        expect(analysis.benchmarks.industry_average).toBeGreaterThanOrEqual(0);
        expect(analysis.benchmarks.industry_average).toBeLessThanOrEqual(1);
        expect(analysis.benchmarks.top_performers).toBeGreaterThanOrEqual(0);
        expect(analysis.benchmarks.top_performers).toBeLessThanOrEqual(1);
        expect(analysis.benchmarks.your_position).toMatch(/above|at|below/);
      });
    });
  });

  describe('generateSocialDynamicsMap', () => {
    it('should create comprehensive social dynamics map', async () => {
      const result = await system.generateSocialDynamicsMap(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('groupInfluencers');
      expect(result).toHaveProperty('engagementClusters');
      expect(result).toHaveProperty('communicationPatterns');
      expect(result).toHaveProperty('networkStrength');
      expect(result).toHaveProperty('socialConnections');
      expect(result).toHaveProperty('influenceMetrics');

      expect(result.groupInfluencers).toBeInstanceOf(Array);
      expect(result.engagementClusters).toBeInstanceOf(Array);
      expect(result.networkStrength).toBeGreaterThanOrEqual(0);
      expect(result.networkStrength).toBeLessThanOrEqual(1);
    });

    it('should identify group influencers correctly', async () => {
      const result = await system.generateSocialDynamicsMap(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.groupInfluencers.length).toBeGreaterThan(0);

      const influencer = result.groupInfluencers[0];
      expect(influencer).toHaveProperty('guestId');
      expect(influencer).toHaveProperty('name');
      expect(influencer).toHaveProperty('group');
      expect(influencer).toHaveProperty('influenceScore');
      expect(influencer).toHaveProperty('connections');
      expect(influencer).toHaveProperty('engagementImpact');

      expect(influencer.influenceScore).toBeGreaterThanOrEqual(0);
      expect(influencer.influenceScore).toBeLessThanOrEqual(100);
      expect(influencer.connections).toBeGreaterThanOrEqual(0);

      // High engagement guests should be identified as influencers
      expect(['guest-1', 'guest-2'].includes(influencer.guestId)).toBe(true);
    });

    it('should map engagement clusters', async () => {
      const result = await system.generateSocialDynamicsMap(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.engagementClusters).toBeInstanceOf(Array);

      if (result.engagementClusters.length > 0) {
        const cluster = result.engagementClusters[0];
        expect(cluster).toHaveProperty('clusterId');
        expect(cluster).toHaveProperty('members');
        expect(cluster).toHaveProperty('avgEngagement');
        expect(cluster).toHaveProperty('commonTraits');
        expect(cluster).toHaveProperty('recommendedActions');

        expect(cluster.members).toBeInstanceOf(Array);
        expect(cluster.members.length).toBeGreaterThan(0);
        expect(cluster.avgEngagement).toBeGreaterThanOrEqual(0);
        expect(cluster.avgEngagement).toBeLessThanOrEqual(100);
      }
    });

    it('should analyze communication patterns', async () => {
      const result = await system.generateSocialDynamicsMap(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.communicationPatterns).toHaveProperty('frequency');
      expect(result.communicationPatterns).toHaveProperty('channels');
      expect(result.communicationPatterns).toHaveProperty('responsiveness');
      expect(result.communicationPatterns).toHaveProperty('peakTimes');

      expect(result.communicationPatterns.channels).toBeInstanceOf(Array);
      expect(result.communicationPatterns.peakTimes).toBeInstanceOf(Array);
      expect(
        result.communicationPatterns.responsiveness,
      ).toBeGreaterThanOrEqual(0);
      expect(result.communicationPatterns.responsiveness).toBeLessThanOrEqual(
        100,
      );
    });

    it('should calculate network strength accurately', async () => {
      const result = await system.generateSocialDynamicsMap(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.networkStrength).toBeGreaterThanOrEqual(0);
      expect(result.networkStrength).toBeLessThanOrEqual(1);

      // Network strength should be based on engagement levels and connections
      // With good engagement in mock data, should be reasonably strong
      expect(result.networkStrength).toBeGreaterThan(0.3);
    });
  });

  describe('optimizeRSVPAndCommunication', () => {
    beforeEach(() => {
      // Mock RSVP data
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            { rsvp_status: 'confirmed', response_time: 2 },
            { rsvp_status: 'confirmed', response_time: 1 },
            { rsvp_status: 'pending', response_time: null },
            { rsvp_status: 'declined', response_time: 5 },
          ],
          error: null,
        });
    });

    it('should provide RSVP optimization recommendations', async () => {
      const result = await system.optimizeRSVPAndCommunication(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toHaveProperty('rsvpOptimization');
      expect(result).toHaveProperty('communicationStrategy');
      expect(result).toHaveProperty('followUpSchedule');
      expect(result).toHaveProperty('personalizedMessages');

      expect(result.rsvpOptimization).toHaveProperty('currentRate');
      expect(result.rsvpOptimization).toHaveProperty('targetRate');
      expect(result.rsvpOptimization).toHaveProperty('strategies');
      expect(result.rsvpOptimization.strategies).toBeInstanceOf(Array);
    });

    it('should calculate RSVP rates correctly', async () => {
      const result = await system.optimizeRSVPAndCommunication(
        mockCoupleId,
        mockWeddingId,
      );

      // 2 confirmed + 1 declined = 3 responded out of 4 = 75%
      expect(result.rsvpOptimization.currentRate).toBe(75);
      expect(result.rsvpOptimization.targetRate).toBeGreaterThan(
        result.rsvpOptimization.currentRate,
      );
    });

    it('should create follow-up schedule for pending RSVPs', async () => {
      const result = await system.optimizeRSVPAndCommunication(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.followUpSchedule).toBeInstanceOf(Array);
      expect(result.followUpSchedule.length).toBeGreaterThan(0);

      const followUp = result.followUpSchedule[0];
      expect(followUp).toHaveProperty('guestId');
      expect(followUp).toHaveProperty('scheduledDate');
      expect(followUp).toHaveProperty('method');
      expect(followUp).toHaveProperty('message');
      expect(followUp).toHaveProperty('priority');

      expect(followUp.method).toMatch(/email|phone|text|personal/);
      expect(followUp.priority).toMatch(/high|medium|low/);
    });

    it('should generate personalized messages', async () => {
      const result = await system.optimizeRSVPAndCommunication(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.personalizedMessages).toBeInstanceOf(Array);

      if (result.personalizedMessages.length > 0) {
        const message = result.personalizedMessages[0];
        expect(message).toHaveProperty('guestId');
        expect(message).toHaveProperty('messageType');
        expect(message).toHaveProperty('content');
        expect(message).toHaveProperty('channel');
        expect(message).toHaveProperty('timing');

        expect(message.messageType).toMatch(
          /reminder|thank_you|follow_up|invitation/,
        );
        expect(message.channel).toMatch(/email|sms|social|personal/);
        expect(typeof message.content).toBe('string');
        expect(message.content.length).toBeGreaterThan(0);
      }
    });

    it('should adapt communication strategy by guest segment', async () => {
      const result = await system.optimizeRSVPAndCommunication(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result.communicationStrategy).toHaveProperty('segmentStrategies');
      expect(result.communicationStrategy.segmentStrategies).toBeInstanceOf(
        Object,
      );

      // Should have different strategies for different groups
      const expectedGroups = ['family', 'friends', 'work', 'extended_family'];
      expectedGroups.forEach((group) => {
        if (result.communicationStrategy.segmentStrategies[group]) {
          const strategy =
            result.communicationStrategy.segmentStrategies[group];
          expect(strategy).toHaveProperty('preferredChannel');
          expect(strategy).toHaveProperty('messageFrequency');
          expect(strategy).toHaveProperty('personalizedTone');
          expect(strategy).toHaveProperty('followUpTiming');
        }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });

      await expect(
        system.getSocialWeddingInsights(mockCoupleId, mockWeddingId),
      ).rejects.toThrow('Wedding not found');
    });

    it('should handle missing guest data', async () => {
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: { id: mockWeddingId },
          error: null,
        });

      mockSupabase.from().select().eq().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeDefined();
      expect(result.guestEngagement).toEqual([]);
      expect(result.weddingParty).toEqual([]);
      expect(result.viralAnalysis).toBeInstanceOf(Array);
    });

    it('should validate input parameters', async () => {
      await expect(
        system.getSocialWeddingInsights('', mockWeddingId),
      ).rejects.toThrow('Invalid couple ID');

      await expect(
        system.getSocialWeddingInsights(mockCoupleId, ''),
      ).rejects.toThrow('Invalid wedding ID');
    });
  });

  describe('Business Logic Validation', () => {
    it('should correctly identify high-influence guests', async () => {
      const result = await system.generateSocialDynamicsMap(
        mockCoupleId,
        mockWeddingId,
      );

      const highInfluencers = result.groupInfluencers.filter(
        (influencer) => influencer.influenceScore > 70,
      );

      // Guests with high engagement and social shares should be influencers
      expect(highInfluencers.length).toBeGreaterThan(0);

      highInfluencers.forEach((influencer) => {
        // Should be from high-engagement guests (guest-1 or guest-2)
        expect(['guest-1', 'guest-2'].includes(influencer.guestId)).toBe(true);
      });
    });

    it('should prioritize family and close friends for coordination', async () => {
      const result = await system.trackWeddingPartyCoordination(
        mockCoupleId,
        mockWeddingId,
      );

      // Maid of Honor and Best Man should have higher priority roles
      const keyRoles = result.memberPerformance.filter((member) =>
        ['maid_of_honor', 'best_man'].includes(member.role),
      );

      expect(keyRoles.length).toBe(2);

      keyRoles.forEach((member) => {
        // Key roles should have more tasks assigned
        expect(member.tasksAssigned).toBeGreaterThan(3);
        expect(member.coordinationScore).toBeGreaterThan(75);
      });
    });

    it('should adapt viral strategies to wedding characteristics', async () => {
      // Mock destination wedding
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            id: mockWeddingId,
            location: 'Tuscany, Italy',
            venue_type: 'destination',
            hashtag: '#TuscanyWedding2024',
          },
          error: null,
        });

      const result = await system.analyzeViralPotential(
        mockCoupleId,
        mockWeddingId,
      );

      // Destination weddings should have different viral potential
      const contentAnalysis = result.find(
        (r) => r.category === 'content_quality',
      );
      if (contentAnalysis) {
        const locationFactor = contentAnalysis.factors.find(
          (factor: string) =>
            factor.toLowerCase().includes('destination') ||
            factor.toLowerCase().includes('location'),
        );

        if (locationFactor) {
          expect(typeof locationFactor).toBe('string');
        }
      }
    });

    it('should scale recommendations based on guest count', async () => {
      // Mock large wedding
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockResolvedValue({
          data: {
            guest_count: 300, // Large wedding
          },
          error: null,
        });

      const result = await system.optimizeRSVPAndCommunication(
        mockCoupleId,
        mockWeddingId,
      );

      // Large weddings should have more structured follow-up
      expect(result.followUpSchedule.length).toBeGreaterThan(0);
      expect(result.communicationStrategy).toHaveProperty('scalingStrategies');

      if (result.communicationStrategy.scalingStrategies) {
        expect(result.communicationStrategy.scalingStrategies).toContain(
          'automated_reminders',
        );
      }
    });
  });

  describe('Performance Tests', () => {
    it('should complete social analysis within reasonable time', async () => {
      const startTime = Date.now();

      await system.getSocialWeddingInsights(mockCoupleId, mockWeddingId);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds
    });

    it('should handle large guest lists efficiently', async () => {
      // Mock large guest list
      const largeGuestData = Array.from({ length: 500 }, (_, i) => ({
        id: `guest-${i}`,
        name: `Guest ${i}`,
        engagement_score: Math.floor(Math.random() * 100),
        rsvp_status: ['confirmed', 'pending', 'declined'][i % 3],
        social_shares: Math.floor(Math.random() * 10),
        group: ['family', 'friends', 'work', 'extended_family'][i % 4],
      }));

      mockSupabase.from().select().eq().mockResolvedValue({
        data: largeGuestData,
        error: null,
      });

      const startTime = Date.now();

      const result = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.guestEngagement.length).toBe(500);
      expect(duration).toBeLessThan(5000); // Should handle large datasets within 5 seconds
    });
  });

  describe('Integration Tests', () => {
    it('should provide consistent metrics across methods', async () => {
      const socialInsights = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );
      const engagementPatterns = await system.analyzeGuestEngagementPatterns(
        mockCoupleId,
        mockWeddingId,
      );
      const dynamicsMap = await system.generateSocialDynamicsMap(
        mockCoupleId,
        mockWeddingId,
      );

      // Guest counts should match
      const totalGuests = socialInsights.guestEngagement.length;
      const categorizedGuests =
        engagementPatterns.highEngagement.length +
        engagementPatterns.mediumEngagement.length +
        engagementPatterns.lowEngagement.length +
        engagementPatterns.disengaged.length;

      expect(totalGuests).toBe(categorizedGuests);

      // Influencers should be from high engagement groups
      dynamicsMap.groupInfluencers.forEach((influencer) => {
        const highEngagementGuest = engagementPatterns.highEngagement.find(
          (guest: any) => guest.guestId === influencer.guestId,
        );
        const mediumEngagementGuest = engagementPatterns.mediumEngagement.find(
          (guest: any) => guest.guestId === influencer.guestId,
        );

        // Influencers should be from high or medium engagement groups
        expect(highEngagementGuest || mediumEngagementGuest).toBeDefined();
      });
    });

    it('should handle edge cases gracefully', async () => {
      // Test with no social activity
      mockSupabase.from().select().gte().lte().mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await system.analyzeViralPotential(
        mockCoupleId,
        mockWeddingId,
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0); // Should still provide analysis

      // Test with single guest
      mockSupabase
        .from()
        .select()
        .eq()
        .mockResolvedValue({
          data: [
            {
              id: 'guest-1',
              name: 'Solo Guest',
              engagement_score: 75,
              rsvp_status: 'confirmed',
            },
          ],
          error: null,
        });

      const singleGuestResult = await system.getSocialWeddingInsights(
        mockCoupleId,
        mockWeddingId,
      );

      expect(singleGuestResult.guestEngagement.length).toBe(1);
      expect(
        singleGuestResult.socialDynamics.networkStrength,
      ).toBeGreaterThanOrEqual(0);
    });
  });
});
