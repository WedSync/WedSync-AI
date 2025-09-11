/**
 * WS-167 Trial Management System - Activity Score Calculation Unit Tests
 * Comprehensive test suite for activity scoring algorithms and ROI calculations
 */

import { describe, beforeEach, afterEach, it, expect, vi, beforeAll } from 'vitest';
import { TrialService } from '@/lib/trial/TrialService';
import { SubscriptionService } from '@/lib/services/subscriptionService';
import { 
  TrialConfig, 
  TrialFeatureUsage,
  TrialMilestone,
  TrialROIMetrics,
  TrialProgress,
  MilestoneType,
  ActivityScore
} from '@/types/trial';
import { addDays, subDays, differenceInDays } from 'date-fns';

// Mock setup for complex query chaining
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  rpc: vi.fn().mockReturnThis()
};

const mockSupabase = {
  from: vi.fn().mockReturnValue(mockQueryBuilder),
  rpc: vi.fn().mockReturnValue(mockQueryBuilder),
  ...mockQueryBuilder
};

const mockSubscriptionService = {
  getUserSubscription: vi.fn(),
  getPlanByName: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  getPlan: vi.fn()
} as unknown as SubscriptionService;

describe('WS-167 Trial Activity Score Calculations', () => {
  let trialService: TrialService;
  let mockUserId: string;
  let mockTrialId: string;
  let baseTrial: TrialConfig;
  
  beforeAll(() => {
    // Mock console methods to prevent noise during testing
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset query builder methods
    Object.keys(mockQueryBuilder).forEach(key => {
      if (key !== 'single' && key !== 'rpc' && mockQueryBuilder[key].mockReturnThis) {
        mockQueryBuilder[key].mockReturnThis();
      }
    });
    
    trialService = new TrialService(mockSupabase as any, mockSubscriptionService);
    
    mockUserId = 'user-activity-test-123';
    mockTrialId = 'trial-activity-test-456';
    
    // Base trial configuration for testing
    baseTrial = {
      id: mockTrialId,
      user_id: mockUserId,
      business_type: 'wedding_planner',
      business_goals: ['save_time', 'grow_business', 'improve_efficiency'],
      current_workflow_pain_points: ['manual_tasks', 'communication_delays', 'tracking_issues'],
      expected_time_savings_hours: 15,
      hourly_rate: 85,
      trial_start: subDays(new Date(), 10), // 10 days into trial
      trial_end: addDays(new Date(), 20), // 20 days remaining
      status: 'active',
      onboarding_completed: true,
      created_at: subDays(new Date(), 10),
      updated_at: new Date()
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Activity Score Calculation Engine', () => {
    it('should calculate basic activity score with minimal usage', async () => {
      // Arrange
      const minimalFeatureUsage: TrialFeatureUsage[] = [
        {
          id: 'usage-1',
          trial_id: mockTrialId,
          feature_key: 'client_onboarding',
          feature_name: 'Client Onboarding',
          usage_count: 1,
          time_saved_minutes: 30,
          last_used_at: new Date(),
          created_at: new Date()
        }
      ];

      const minimalMilestones: TrialMilestone[] = [
        {
          id: 'milestone-1',
          trial_id: mockTrialId,
          milestone_type: 'first_client_connected',
          milestone_name: 'First Client Connected',
          description: 'Successfully connected first client',
          achieved: true,
          achieved_at: subDays(new Date(), 2),
          time_to_achieve_hours: 48,
          value_impact_score: 8,
          created_at: subDays(new Date(), 5)
        }
      ];

      // Mock database responses for calculateTrialProgress call
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: baseTrial, error: null }) // getActiveTrial
        .mockResolvedValueOnce({ data: baseTrial, error: null }) // calculateTrialProgress trial fetch
        .mockResolvedValueOnce({ data: baseTrial, error: null }); // calculateROI trial fetch

      mockQueryBuilder.select
        .mockResolvedValueOnce({ data: minimalMilestones, error: null }) // milestones for progress
        .mockResolvedValueOnce({ data: minimalFeatureUsage, error: null }) // feature usage for progress
        .mockResolvedValueOnce({ data: minimalFeatureUsage, error: null }) // feature usage for ROI
        .mockResolvedValueOnce({ data: minimalMilestones.filter(m => m.achieved), error: null }); // achieved milestones for ROI

      // Act
      const result = await trialService.getTrialStatus(mockUserId);

      // Assert - Verify basic calculations
      expect(result.success).toBe(true);
      expect(result.progress.progress_percentage).toBeCloseTo(33.33, 1); // 10 days of 30
      expect(result.progress.days_elapsed).toBe(10);
      expect(result.progress.days_remaining).toBe(20);
      
      // Verify ROI calculations
      expect(result.progress.roi_metrics.total_time_saved_hours).toBe(0.5); // 30 minutes
      expect(result.progress.roi_metrics.estimated_cost_savings).toBe(42.5); // 0.5 * 85
      expect(result.progress.roi_metrics.milestones_achieved_count).toBe(1);
      expect(result.progress.roi_metrics.features_adopted_count).toBe(1);
      
      // Verify urgency score calculation
      expect(result.progress.urgency_score).toBe(2); // 20 days remaining = score 2
    });

    it('should calculate high activity score with extensive usage', async () => {
      // Arrange - Extensive feature usage and milestones
      const extensiveFeatureUsage: TrialFeatureUsage[] = [
        {
          id: 'usage-1',
          trial_id: mockTrialId,
          feature_key: 'client_onboarding',
          feature_name: 'Client Onboarding',
          usage_count: 8,
          time_saved_minutes: 240,
          last_used_at: new Date(),
          created_at: subDays(new Date(), 8)
        },
        {
          id: 'usage-2',
          trial_id: mockTrialId,
          feature_key: 'email_automation',
          feature_name: 'Email Automation',
          usage_count: 12,
          time_saved_minutes: 180,
          last_used_at: new Date(),
          created_at: subDays(new Date(), 6)
        },
        {
          id: 'usage-3',
          trial_id: mockTrialId,
          feature_key: 'timeline_management',
          feature_name: 'Timeline Management',
          usage_count: 5,
          time_saved_minutes: 210,
          last_used_at: subDays(new Date(), 1),
          created_at: subDays(new Date(), 4)
        },
        {
          id: 'usage-4',
          trial_id: mockTrialId,
          feature_key: 'guest_management',
          feature_name: 'Guest Management',
          usage_count: 6,
          time_saved_minutes: 165,
          last_used_at: new Date(),
          created_at: subDays(new Date(), 3)
        }
      ];

      const allMilestones: TrialMilestone[] = [
        {
          id: 'milestone-1',
          trial_id: mockTrialId,
          milestone_type: 'first_client_connected',
          milestone_name: 'First Client Connected',
          description: 'Successfully connected first client',
          achieved: true,
          achieved_at: subDays(new Date(), 8),
          time_to_achieve_hours: 12,
          value_impact_score: 8,
          created_at: subDays(new Date(), 9)
        },
        {
          id: 'milestone-2',
          trial_id: mockTrialId,
          milestone_type: 'initial_journey_created',
          milestone_name: 'Initial Journey Created',
          description: 'Created first automated journey',
          achieved: true,
          achieved_at: subDays(new Date(), 6),
          time_to_achieve_hours: 18,
          value_impact_score: 9,
          created_at: subDays(new Date(), 9)
        },
        {
          id: 'milestone-3',
          trial_id: mockTrialId,
          milestone_type: 'vendor_added',
          milestone_name: 'Vendor Added',
          description: 'Added first vendor partner',
          achieved: true,
          achieved_at: subDays(new Date(), 4),
          time_to_achieve_hours: 24,
          value_impact_score: 7,
          created_at: subDays(new Date(), 9)
        },
        {
          id: 'milestone-4',
          trial_id: mockTrialId,
          milestone_type: 'timeline_created',
          milestone_name: 'Timeline Created',
          description: 'Built comprehensive wedding timeline',
          achieved: true,
          achieved_at: subDays(new Date(), 2),
          time_to_achieve_hours: 36,
          value_impact_score: 9,
          created_at: subDays(new Date(), 9)
        },
        {
          id: 'milestone-5',
          trial_id: mockTrialId,
          milestone_type: 'guest_list_imported',
          milestone_name: 'Guest List Imported',
          description: 'Imported comprehensive guest list',
          achieved: false,
          value_impact_score: 8,
          created_at: subDays(new Date(), 9)
        }
      ];

      const achievedMilestones = allMilestones.filter(m => m.achieved);

      // Mock database responses
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: baseTrial, error: null });

      mockQueryBuilder.select
        .mockResolvedValueOnce({ data: allMilestones, error: null })
        .mockResolvedValueOnce({ data: extensiveFeatureUsage, error: null })
        .mockResolvedValueOnce({ data: extensiveFeatureUsage, error: null })
        .mockResolvedValueOnce({ data: achievedMilestones, error: null });

      // Act
      const result = await trialService.getTrialStatus(mockUserId);

      // Assert - Verify high-activity calculations
      expect(result.success).toBe(true);
      
      // Total time saved: 240 + 180 + 210 + 165 = 795 minutes = 13.25 hours
      expect(result.progress.roi_metrics.total_time_saved_hours).toBe(13.25);
      expect(result.progress.roi_metrics.estimated_cost_savings).toBe(1126.25); // 13.25 * 85
      expect(result.progress.roi_metrics.milestones_achieved_count).toBe(4);
      expect(result.progress.roi_metrics.features_adopted_count).toBe(4);
      
      // Productivity improvement: (4 milestones * 15) + (4 features * 5) = 80%
      expect(result.progress.roi_metrics.productivity_improvement_percent).toBe(80);
      
      // Workflow efficiency: 13.25 actual vs 15 expected = 88.33%
      expect(result.progress.roi_metrics.workflow_efficiency_gain).toBeCloseTo(88.33, 1);
      
      // ROI calculation: projected monthly savings vs subscription cost
      const weeklyTimeSaved = 13.25 / (10/7); // 13.25 hours over ~1.43 weeks = ~9.28 hours/week
      const projectedMonthlySavings = (weeklyTimeSaved * 4) * 85; // ~3,153
      const roiPercentage = ((projectedMonthlySavings - 49) / 49) * 100; // ~6,332%
      
      expect(result.progress.roi_metrics.projected_monthly_savings).toBeCloseTo(3153, 0);
      expect(result.progress.roi_metrics.roi_percentage).toBeGreaterThan(6000);
      
      // Conversion recommendation should be highly positive
      expect(result.progress.conversion_recommendation).toMatch(/Exceptional ROI|You're saving/);
    });

    it('should calculate urgency scores correctly based on days remaining', async () => {
      const testCases = [
        { daysRemaining: 1, expectedUrgencyScore: 5 },
        { daysRemaining: 3, expectedUrgencyScore: 5 },
        { daysRemaining: 5, expectedUrgencyScore: 4 },
        { daysRemaining: 7, expectedUrgencyScore: 4 },
        { daysRemaining: 10, expectedUrgencyScore: 3 },
        { daysRemaining: 14, expectedUrgencyScore: 3 },
        { daysRemaining: 20, expectedUrgencyScore: 2 },
        { daysRemaining: 25, expectedUrgencyScore: 2 }
      ];

      for (const { daysRemaining, expectedUrgencyScore } of testCases) {
        // Arrange
        const testTrial = {
          ...baseTrial,
          trial_start: subDays(new Date(), 30 - daysRemaining),
          trial_end: addDays(new Date(), daysRemaining)
        };

        mockQueryBuilder.single
          .mockResolvedValueOnce({ data: testTrial, error: null })
          .mockResolvedValueOnce({ data: testTrial, error: null })
          .mockResolvedValueOnce({ data: testTrial, error: null });

        mockQueryBuilder.select
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: [], error: null });

        // Act
        const result = await trialService.getTrialStatus(mockUserId);

        // Assert
        expect(result.progress.urgency_score).toBe(expectedUrgencyScore);
        expect(result.progress.days_remaining).toBe(daysRemaining);
      }
    });

    it('should handle complex workflow efficiency calculations', async () => {
      // Arrange - Test various time saved vs expected scenarios
      const testCases = [
        {
          expectedHours: 20,
          actualHours: 25,
          expectedEfficiency: 100, // Capped at 100%
          description: 'exceeding expectations'
        },
        {
          expectedHours: 15,
          actualHours: 15,
          expectedEfficiency: 100,
          description: 'meeting expectations exactly'
        },
        {
          expectedHours: 10,
          actualHours: 7.5,
          expectedEfficiency: 75,
          description: 'partial achievement'
        },
        {
          expectedHours: 12,
          actualHours: 3,
          expectedEfficiency: 25,
          description: 'low achievement'
        },
        {
          expectedHours: 8,
          actualHours: 0,
          expectedEfficiency: 0,
          description: 'no time saved'
        }
      ];

      for (const { expectedHours, actualHours, expectedEfficiency, description } of testCases) {
        // Arrange specific test case
        const testTrial = {
          ...baseTrial,
          expected_time_savings_hours: expectedHours
        };

        const testFeatureUsage: TrialFeatureUsage[] = [
          {
            id: 'test-usage',
            trial_id: mockTrialId,
            feature_key: 'test_feature',
            feature_name: 'Test Feature',
            usage_count: 1,
            time_saved_minutes: actualHours * 60,
            last_used_at: new Date(),
            created_at: new Date()
          }
        ];

        mockQueryBuilder.single
          .mockResolvedValueOnce({ data: testTrial, error: null })
          .mockResolvedValueOnce({ data: testTrial, error: null })
          .mockResolvedValueOnce({ data: testTrial, error: null });

        mockQueryBuilder.select
          .mockResolvedValueOnce({ data: [], error: null })
          .mockResolvedValueOnce({ data: testFeatureUsage, error: null })
          .mockResolvedValueOnce({ data: testFeatureUsage, error: null })
          .mockResolvedValueOnce({ data: [], error: null });

        // Act
        const result = await trialService.getTrialStatus(mockUserId);

        // Assert
        expect(result.progress.roi_metrics.workflow_efficiency_gain).toBe(expectedEfficiency);
        expect(result.progress.roi_metrics.total_time_saved_hours).toBe(actualHours);
      }
    });

    it('should calculate productivity improvement scores accurately', async () => {
      // Test productivity calculation: (milestones * 15) + (features * 5)
      const testCases = [
        {
          milestonesAchieved: 0,
          featuresAdopted: 0,
          expectedScore: 0,
          description: 'no activity'
        },
        {
          milestonesAchieved: 1,
          featuresAdopted: 1,
          expectedScore: 20, // (1 * 15) + (1 * 5) = 20
          description: 'minimal activity'
        },
        {
          milestonesAchieved: 3,
          featuresAdopted: 4,
          expectedScore: 65, // (3 * 15) + (4 * 5) = 65
          description: 'moderate activity'
        },
        {
          milestonesAchieved: 5,
          featuresAdopted: 8,
          expectedScore: 100, // (5 * 15) + (8 * 5) = 115, capped at 100
          description: 'high activity with capping'
        }
      ];

      for (const { milestonesAchieved, featuresAdopted, expectedScore, description } of testCases) {
        // Create test milestones
        const testMilestones: TrialMilestone[] = Array.from(
          { length: milestonesAchieved }, 
          (_, i) => ({
            id: `milestone-${i}`,
            trial_id: mockTrialId,
            milestone_type: 'first_client_connected',
            milestone_name: `Test Milestone ${i}`,
            description: `Test milestone ${i}`,
            achieved: true,
            achieved_at: new Date(),
            time_to_achieve_hours: 12,
            value_impact_score: 8,
            created_at: new Date()
          })
        );

        // Create test feature usage
        const testFeatureUsage: TrialFeatureUsage[] = Array.from(
          { length: featuresAdopted },
          (_, i) => ({
            id: `usage-${i}`,
            trial_id: mockTrialId,
            feature_key: `feature_${i}`,
            feature_name: `Test Feature ${i}`,
            usage_count: 1,
            time_saved_minutes: 30,
            last_used_at: new Date(),
            created_at: new Date()
          })
        );

        mockQueryBuilder.single
          .mockResolvedValueOnce({ data: baseTrial, error: null })
          .mockResolvedValueOnce({ data: baseTrial, error: null })
          .mockResolvedValueOnce({ data: baseTrial, error: null });

        mockQueryBuilder.select
          .mockResolvedValueOnce({ data: testMilestones, error: null })
          .mockResolvedValueOnce({ data: testFeatureUsage, error: null })
          .mockResolvedValueOnce({ data: testFeatureUsage, error: null })
          .mockResolvedValueOnce({ data: testMilestones, error: null });

        // Act
        const result = await trialService.getTrialStatus(mockUserId);

        // Assert
        expect(result.progress.roi_metrics.productivity_improvement_percent).toBe(expectedScore);
        expect(result.progress.roi_metrics.milestones_achieved_count).toBe(milestonesAchieved);
        expect(result.progress.roi_metrics.features_adopted_count).toBe(featuresAdopted);
      }
    });

    it('should generate appropriate conversion recommendations', async () => {
      const testCases = [
        {
          roiPercentage: 300,
          milestonesAchieved: 4,
          daysRemaining: 15,
          expectedPattern: /Exceptional ROI.*saving.*upgrade now/i,
          description: 'exceptional ROI scenario'
        },
        {
          roiPercentage: 150,
          milestonesAchieved: 3,
          daysRemaining: 10,
          expectedPattern: /Great progress.*milestones.*consider upgrading/i,
          description: 'good progress scenario'
        },
        {
          roiPercentage: 50,
          milestonesAchieved: 2,
          daysRemaining: 5,
          expectedPattern: /Trial ending soon.*achieved.*upgrade to continue/i,
          description: 'trial ending urgency'
        },
        {
          roiPercentage: 80,
          milestonesAchieved: 1,
          daysRemaining: 20,
          expectedPattern: /Keep exploring.*milestones.*full value/i,
          description: 'encouragement scenario'
        }
      ];

      for (const { roiPercentage, milestonesAchieved, daysRemaining, expectedPattern, description } of testCases) {
        // Calculate required time saved to achieve target ROI
        const monthlySubscriptionCost = 49;
        const projectedMonthlySavings = ((roiPercentage / 100) * monthlySubscriptionCost) + monthlySubscriptionCost;
        const weeklyTimeSaved = projectedMonthlySavings / (4 * baseTrial.hourly_rate!);
        const totalTimeSaved = weeklyTimeSaved * (10 / 7); // 10 days into trial

        const testTrial = {
          ...baseTrial,
          trial_end: addDays(new Date(), daysRemaining)
        };

        const testFeatureUsage: TrialFeatureUsage[] = [
          {
            id: 'roi-test-usage',
            trial_id: mockTrialId,
            feature_key: 'roi_test',
            feature_name: 'ROI Test Feature',
            usage_count: 1,
            time_saved_minutes: Math.max(0, totalTimeSaved * 60),
            last_used_at: new Date(),
            created_at: new Date()
          }
        ];

        const testMilestones: TrialMilestone[] = Array.from(
          { length: milestonesAchieved },
          (_, i) => ({
            id: `roi-milestone-${i}`,
            trial_id: mockTrialId,
            milestone_type: 'first_client_connected',
            milestone_name: `ROI Milestone ${i}`,
            description: 'ROI test milestone',
            achieved: true,
            achieved_at: new Date(),
            time_to_achieve_hours: 12,
            value_impact_score: 8,
            created_at: new Date()
          })
        );

        mockQueryBuilder.single
          .mockResolvedValueOnce({ data: testTrial, error: null })
          .mockResolvedValueOnce({ data: testTrial, error: null })
          .mockResolvedValueOnce({ data: testTrial, error: null });

        mockQueryBuilder.select
          .mockResolvedValueOnce({ data: testMilestones, error: null })
          .mockResolvedValueOnce({ data: testFeatureUsage, error: null })
          .mockResolvedValueOnce({ data: testFeatureUsage, error: null })
          .mockResolvedValueOnce({ data: testMilestones, error: null });

        // Act
        const result = await trialService.getTrialStatus(mockUserId);

        // Assert
        expect(result.progress.conversion_recommendation).toMatch(expectedPattern);
      }
    });

    it('should handle edge cases and error conditions', async () => {
      // Test zero time saved
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: { ...baseTrial, expected_time_savings_hours: 0 }, error: null });

      mockQueryBuilder.select
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const result = await trialService.getTrialStatus(mockUserId);

      expect(result.progress.roi_metrics.total_time_saved_hours).toBe(0);
      expect(result.progress.roi_metrics.workflow_efficiency_gain).toBe(0);
      expect(result.progress.roi_metrics.estimated_cost_savings).toBe(0);
      expect(result.progress.roi_metrics.roi_percentage).toBe(0);
    });

    it('should handle null/undefined values gracefully', async () => {
      // Test with null feature usage and milestones
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: baseTrial, error: null });

      mockQueryBuilder.select
        .mockResolvedValueOnce({ data: null, error: null }) // null milestones
        .mockResolvedValueOnce({ data: null, error: null }) // null feature usage
        .mockResolvedValueOnce({ data: null, error: null }) // null feature usage for ROI
        .mockResolvedValueOnce({ data: null, error: null }); // null achieved milestones

      const result = await trialService.getTrialStatus(mockUserId);

      expect(result.success).toBe(true);
      expect(result.progress.milestones_achieved).toEqual([]);
      expect(result.progress.milestones_remaining).toEqual([]);
      expect(result.progress.feature_usage_summary).toEqual([]);
      expect(result.progress.roi_metrics.features_adopted_count).toBe(0);
      expect(result.progress.roi_metrics.milestones_achieved_count).toBe(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should complete activity score calculations within performance thresholds', async () => {
      // Arrange - Large dataset to test performance
      const largeFeatureUsage: TrialFeatureUsage[] = Array.from(
        { length: 50 },
        (_, i) => ({
          id: `perf-usage-${i}`,
          trial_id: mockTrialId,
          feature_key: `feature_${i}`,
          feature_name: `Performance Feature ${i}`,
          usage_count: Math.floor(Math.random() * 10) + 1,
          time_saved_minutes: Math.floor(Math.random() * 120) + 10,
          last_used_at: new Date(),
          created_at: subDays(new Date(), Math.floor(Math.random() * 10))
        })
      );

      const largeMilestones: TrialMilestone[] = Array.from(
        { length: 20 },
        (_, i) => ({
          id: `perf-milestone-${i}`,
          trial_id: mockTrialId,
          milestone_type: 'first_client_connected',
          milestone_name: `Performance Milestone ${i}`,
          description: `Performance test milestone ${i}`,
          achieved: Math.random() > 0.3, // 70% achieved
          achieved_at: Math.random() > 0.3 ? subDays(new Date(), Math.floor(Math.random() * 8)) : undefined,
          time_to_achieve_hours: Math.random() > 0.3 ? Math.floor(Math.random() * 48) + 1 : undefined,
          value_impact_score: Math.floor(Math.random() * 5) + 6,
          created_at: subDays(new Date(), 10)
        })
      );

      const achievedMilestones = largeMilestones.filter(m => m.achieved);

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: baseTrial, error: null });

      mockQueryBuilder.select
        .mockResolvedValueOnce({ data: largeMilestones, error: null })
        .mockResolvedValueOnce({ data: largeFeatureUsage, error: null })
        .mockResolvedValueOnce({ data: largeFeatureUsage, error: null })
        .mockResolvedValueOnce({ data: achievedMilestones, error: null });

      // Act & Assert - Measure performance
      const startTime = performance.now();
      const result = await trialService.getTrialStatus(mockUserId);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;

      // Performance assertions
      expect(executionTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.success).toBe(true);
      expect(result.progress.roi_metrics.features_adopted_count).toBe(50);
      expect(result.progress.roi_metrics.milestones_achieved_count).toBe(achievedMilestones.length);
    });
  });

  describe('Integration with Real Scenarios', () => {
    it('should calculate wedding planner activity scores realistically', async () => {
      // Arrange - Real wedding planner workflow
      const weddingPlannerUsage: TrialFeatureUsage[] = [
        {
          id: 'wp-client-onboarding',
          trial_id: mockTrialId,
          feature_key: 'client_onboarding',
          feature_name: 'Client Onboarding System',
          usage_count: 5, // 5 clients onboarded
          time_saved_minutes: 150, // 30 min per client saved
          last_used_at: new Date(),
          created_at: subDays(new Date(), 8)
        },
        {
          id: 'wp-email-automation',
          trial_id: mockTrialId,
          feature_key: 'email_automation',
          feature_name: 'Automated Email Sequences',
          usage_count: 15, // 15 automated emails sent
          time_saved_minutes: 300, // 20 min per email saved
          last_used_at: subDays(new Date(), 1),
          created_at: subDays(new Date(), 7)
        },
        {
          id: 'wp-timeline-management',
          trial_id: mockTrialId,
          feature_key: 'timeline_management',
          feature_name: 'Wedding Timeline Builder',
          usage_count: 3, // 3 timelines created
          time_saved_minutes: 105, // 35 min per timeline saved
          last_used_at: subDays(new Date(), 2),
          created_at: subDays(new Date(), 5)
        },
        {
          id: 'wp-vendor-coordination',
          trial_id: mockTrialId,
          feature_key: 'vendor_communication',
          feature_name: 'Vendor Coordination Tools',
          usage_count: 8, // 8 vendor coordination sessions
          time_saved_minutes: 200, // 25 min per session saved
          last_used_at: new Date(),
          created_at: subDays(new Date(), 6)
        }
      ];

      const weddingPlannerMilestones: TrialMilestone[] = [
        {
          id: 'wp-first-client',
          trial_id: mockTrialId,
          milestone_type: 'first_client_connected',
          milestone_name: 'First Client Connected',
          description: 'Successfully onboarded first wedding couple',
          achieved: true,
          achieved_at: subDays(new Date(), 8),
          time_to_achieve_hours: 6,
          value_impact_score: 8,
          created_at: subDays(new Date(), 9)
        },
        {
          id: 'wp-journey-created',
          trial_id: mockTrialId,
          milestone_type: 'initial_journey_created',
          milestone_name: 'Client Journey Automated',
          description: 'Set up first automated client communication journey',
          achieved: true,
          achieved_at: subDays(new Date(), 7),
          time_to_achieve_hours: 24,
          value_impact_score: 9,
          created_at: subDays(new Date(), 9)
        },
        {
          id: 'wp-vendor-added',
          trial_id: mockTrialId,
          milestone_type: 'vendor_added',
          milestone_name: 'Vendor Network Established',
          description: 'Added trusted vendor partners to platform',
          achieved: true,
          achieved_at: subDays(new Date(), 6),
          time_to_achieve_hours: 12,
          value_impact_score: 7,
          created_at: subDays(new Date(), 9)
        },
        {
          id: 'wp-timeline-created',
          trial_id: mockTrialId,
          milestone_type: 'timeline_created',
          milestone_name: 'Master Timeline Built',
          description: 'Created comprehensive wedding timeline template',
          achieved: true,
          achieved_at: subDays(new Date(), 5),
          time_to_achieve_hours: 18,
          value_impact_score: 9,
          created_at: subDays(new Date(), 9)
        }
      ];

      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: baseTrial, error: null })
        .mockResolvedValueOnce({ data: baseTrial, error: null });

      mockQueryBuilder.select
        .mockResolvedValueOnce({ data: weddingPlannerMilestones, error: null })
        .mockResolvedValueOnce({ data: weddingPlannerUsage, error: null })
        .mockResolvedValueOnce({ data: weddingPlannerUsage, error: null })
        .mockResolvedValueOnce({ data: weddingPlannerMilestones, error: null });

      // Act
      const result = await trialService.getTrialStatus(mockUserId);

      // Assert - Verify realistic wedding planner metrics
      expect(result.success).toBe(true);
      
      // Total time saved: 150 + 300 + 105 + 200 = 755 minutes = 12.58 hours
      expect(result.progress.roi_metrics.total_time_saved_hours).toBeCloseTo(12.58, 1);
      
      // Cost savings: 12.58 * $85 = $1,069.30
      expect(result.progress.roi_metrics.estimated_cost_savings).toBeCloseTo(1069.30, 0);
      
      // All 4 milestones achieved
      expect(result.progress.roi_metrics.milestones_achieved_count).toBe(4);
      
      // All 4 features adopted
      expect(result.progress.roi_metrics.features_adopted_count).toBe(4);
      
      // Productivity improvement: (4 * 15) + (4 * 5) = 80%
      expect(result.progress.roi_metrics.productivity_improvement_percent).toBe(80);
      
      // Workflow efficiency: 12.58 vs 15 expected = 83.87%
      expect(result.progress.roi_metrics.workflow_efficiency_gain).toBeCloseTo(83.87, 1);
      
      // High ROI should generate positive conversion message
      expect(result.progress.conversion_recommendation).toMatch(/Great progress|Exceptional ROI/i);
      
      // Should have practical next actions
      expect(result.recommendations.next_actions).toContain('Upgrade now to secure your productivity gains');
    });
  });
});