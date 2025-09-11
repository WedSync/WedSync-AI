/**
 * WS-167 Trial Management System - Integration Tests for API Endpoints
 * Comprehensive test suite for trial management API routes
 */

import { describe, beforeEach, afterEach, it, expect, vi, beforeAll } from 'vitest';
import { NextRequest } from 'next/server';
import { createMocks } from 'node-mocks-http';
import { POST as startTrialPOST } from '@/app/api/trial/start/route';
import { GET as getTrialStatus } from '@/app/api/trial/status/route';
import { GET as getTrialUsage, POST as trackTrialUsage } from '@/app/api/trial/usage/route';
import { GET as getMilestones, POST as achieveMilestone } from '@/app/api/trial/milestones/route';
import { POST as convertTrial } from '@/app/api/trial/convert/route';
import { 
  TrialOnboardingData, 
  MilestoneType,
  BusinessType,
  TrialConfig,
  TrialFeatureUsage,
  TrialMilestone 
} from '@/types/trial';

// Mock external dependencies with factory functions
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      rpc: vi.fn().mockReturnThis()
    })),
    rpc: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn(),
      rpc: vi.fn().mockReturnThis()
    })),
  })),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

vi.mock('@/lib/stripe/config', () => ({
  stripe: {
    customers: {
      create: vi.fn().mockResolvedValue({
        id: 'cus_test_123',
        email: 'test@example.com',
      }),
    },
    subscriptions: {
      create: vi.fn().mockResolvedValue({
        id: 'sub_test_123',
        status: 'active',
      }),
    },
  },
}));

// Create mockQueryBuilder for test access
const mockQueryBuilder = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn(),
  rpc: vi.fn().mockReturnThis(),
};

// Create mockSupabaseClient for test access
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn(),
  },
  from: vi.fn(() => mockQueryBuilder),
  rpc: vi.fn(() => mockQueryBuilder),
};

// Mock services
vi.mock('@/lib/trial/TrialService');
vi.mock('@/lib/services/subscriptionService');

describe('WS-167 Trial API Endpoints Integration Tests', () => {
  let mockUser: any;
  let mockTrial: TrialConfig;
  let validOnboardingData: TrialOnboardingData;

  beforeAll(() => {
    // Suppress console logs during testing
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock authenticated user
    mockUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      aud: 'authenticated',
    };

    // Mock trial data
    mockTrial = {
      id: 'trial-123',
      user_id: mockUser.id,
      business_type: 'wedding_planner',
      business_goals: ['save_time', 'grow_business'],
      current_workflow_pain_points: ['manual_tasks', 'communication'],
      expected_time_savings_hours: 12,
      hourly_rate: 75,
      trial_start: new Date('2025-01-15'),
      trial_end: new Date('2025-02-14'),
      status: 'active',
      onboarding_completed: true,
      created_at: new Date('2025-01-15'),
      updated_at: new Date('2025-01-15'),
    };

    // Valid onboarding data
    validOnboardingData = {
      business_type: 'wedding_planner',
      business_name: 'Dream Weddings Co',
      primary_goals: ['save_time', 'grow_business'],
      current_challenges: ['manual_tasks', 'communication_delays'],
      weekly_time_spent_hours: 40,
      estimated_hourly_value: 75,
      team_size: 3,
      current_client_count: 15,
      growth_goals: 'Scale to 50 weddings per year and build strong vendor relationships',
    };

    // Default auth mock - authenticated user
    mockSupabaseClient.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null,
    });

    // Reset query builder methods
    Object.keys(mockQueryBuilder).forEach(key => {
      if (key !== 'single' && mockQueryBuilder[key].mockReturnThis) {
        mockQueryBuilder[key].mockReturnThis();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /api/trial/start', () => {
    it('should successfully start a new trial with valid data', async () => {
      // Arrange - Mock successful service responses
      mockQueryBuilder.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // No existing trial
        .mockResolvedValueOnce({ data: mockTrial, error: null }); // Created trial

      const mockPlan = {
        id: 'plan-123',
        stripe_price_id: 'price_123',
        name: 'professional'
      };
      
      const mockSubscription = {
        subscription: { id: 'sub_123' }
      };

      // Mock TrialService methods
      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        startTrial: vi.fn().mockResolvedValue({
          success: true,
          trial_id: mockTrial.id,
          trial_end_date: mockTrial.trial_end.toISOString(),
          onboarding_required: false,
          next_steps: [
            'Complete your profile setup',
            'Add your first client',
            'Create your first journey',
            'Explore the milestone achievements'
          ]
        }),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {
        getUserSubscription: vi.fn().mockResolvedValue(null),
        getPlanByName: vi.fn().mockResolvedValue(mockPlan),
        createSubscription: vi.fn().mockResolvedValue(mockSubscription),
      };

      // Mock constructors
      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      // Create request
      const requestBody = JSON.stringify({
        plan_tier: 'professional',
        onboarding_data: validOnboardingData,
      });

      const request = new NextRequest('http://localhost:3000/api/trial/start', {
        method: 'POST',
        body: requestBody,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await startTrialPOST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.trial_id).toBe(mockTrial.id);
      expect(responseData.next_steps).toHaveLength(4);
      expect(mockTrialService.startTrial).toHaveBeenCalledWith(
        mockUser.id,
        'professional',
        validOnboardingData
      );
    });

    it('should reject unauthenticated requests', async () => {
      // Arrange - Mock unauthenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/trial/start', {
        method: 'POST',
        body: JSON.stringify({ plan_tier: 'professional', onboarding_data: validOnboardingData }),
      });

      // Act
      const response = await startTrialPOST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should validate request body and reject invalid data', async () => {
      // Arrange - Invalid onboarding data
      const invalidData = {
        plan_tier: 'professional',
        onboarding_data: {
          business_type: 'invalid_type', // Invalid business type
          business_name: '', // Too short
          primary_goals: [], // Empty array
          estimated_hourly_value: 5, // Too low
        },
      };

      const request = new NextRequest('http://localhost:3000/api/trial/start', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await startTrialPOST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid request data');
      expect(responseData.details).toBeDefined();
      expect(Array.isArray(responseData.details)).toBe(true);
    });

    it('should prevent duplicate trials for users with existing active subscriptions', async () => {
      // Arrange - Mock existing subscription
      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {
        getUserSubscription: vi.fn().mockResolvedValue({
          status: 'active'
        }),
      };

      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/start', {
        method: 'POST',
        body: JSON.stringify({
          plan_tier: 'professional',
          onboarding_data: validOnboardingData,
        }),
      });

      // Act
      const response = await startTrialPOST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(409);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('User already has an active subscription or trial');
      expect(responseData.existing_status).toBe('active');
    });

    it('should handle service errors gracefully', async () => {
      // Arrange - Mock service error
      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        startTrial: vi.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {
        getUserSubscription: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/start', {
        method: 'POST',
        body: JSON.stringify({
          plan_tier: 'professional',
          onboarding_data: validOnboardingData,
        }),
      });

      // Act
      const response = await startTrialPOST(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Failed to start trial');
      expect(responseData.message).toBe('An unexpected error occurred while starting your trial');
    });
  });

  describe('GET /api/trial/status', () => {
    it('should return comprehensive trial status for active trial', async () => {
      // Arrange - Mock trial service response
      const mockTrialStatus = {
        success: true,
        trial: mockTrial,
        progress: {
          trial_id: mockTrial.id,
          days_remaining: 25,
          days_elapsed: 5,
          progress_percentage: 16.67,
          milestones_achieved: [],
          milestones_remaining: [],
          feature_usage_summary: [],
          roi_metrics: {
            trial_id: mockTrial.id,
            total_time_saved_hours: 8.5,
            estimated_cost_savings: 637.5,
            productivity_improvement_percent: 45,
            features_adopted_count: 3,
            milestones_achieved_count: 2,
            workflow_efficiency_gain: 70.8,
            projected_monthly_savings: 2550,
            roi_percentage: 5104,
            calculated_at: new Date(),
          },
          conversion_recommendation: 'Great progress! Your 2 milestones show strong ROI. Consider upgrading to maximize benefits.',
          urgency_score: 2,
        },
        recommendations: {
          next_actions: ['Complete more milestones to maximize your trial benefits'],
          upgrade_benefits: [
            'Unlimited clients and vendors',
            'Advanced journey automation',
            'Priority support access',
            'Advanced analytics and reporting'
          ],
        },
      };

      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        getTrialStatus: vi.fn().mockResolvedValue(mockTrialStatus),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {};

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/status');

      // Act
      const response = await getTrialStatus(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.trial).toBeDefined();
      expect(responseData.progress).toBeDefined();
      expect(responseData.progress.roi_metrics.total_time_saved_hours).toBe(8.5);
      expect(responseData.progress.roi_metrics.estimated_cost_savings).toBe(637.5);
      expect(responseData.progress.urgency_score).toBe(2);
      expect(responseData.recommendations.next_actions).toHaveLength(1);
    });

    it('should handle no active trial case appropriately', async () => {
      // Arrange - Mock no active trial
      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        getTrialStatus: vi.fn().mockRejectedValue(new Error('No active trial found')),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {
        getUserSubscription: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/status');

      // Act
      const response = await getTrialStatus(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('No active trial found');
      expect(responseData.message).toBe('User has no active trial or subscription');
    });

    it('should handle expired trial case', async () => {
      // Arrange - Mock expired trial
      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        getTrialStatus: vi.fn().mockRejectedValue(new Error('Trial has expired')),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {};

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/status');

      // Act
      const response = await getTrialStatus(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(410); // Gone - resource no longer available
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Trial expired');
      expect(responseData.message).toBe('Your trial period has ended');
      expect(responseData.expired).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      // Arrange
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Not authenticated'),
      });

      const request = new NextRequest('http://localhost:3000/api/trial/status');

      // Act
      const response = await getTrialStatus(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Unauthorized');
    });
  });

  describe('POST /api/trial/usage', () => {
    it('should successfully track feature usage', async () => {
      // Arrange
      const usageData = {
        feature_key: 'client_onboarding',
        feature_name: 'Client Onboarding System',
        time_saved_minutes: 45,
        context_data: {
          client_id: 'client-123',
          workflow_step: 'initial_setup',
        },
      };

      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        trackFeatureUsage: vi.fn().mockResolvedValue(undefined),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {};

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/usage', {
        method: 'POST',
        body: JSON.stringify(usageData),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Act
      const response = await trackTrialUsage(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Feature usage tracked successfully');
      expect(responseData.feature_key).toBe(usageData.feature_key);
      expect(responseData.time_saved_minutes).toBe(usageData.time_saved_minutes);
      expect(mockTrialService.trackFeatureUsage).toHaveBeenCalledWith(
        mockUser.id,
        usageData.feature_key,
        usageData.feature_name,
        usageData.time_saved_minutes,
        usageData.context_data
      );
    });

    it('should validate usage tracking request data', async () => {
      // Arrange - Invalid data
      const invalidData = {
        feature_key: '', // Empty feature key
        feature_name: '', // Empty feature name
        time_saved_minutes: 500, // Exceeds maximum (480 minutes)
      };

      const request = new NextRequest('http://localhost:3000/api/trial/usage', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await trackTrialUsage(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid request data');
      expect(responseData.details).toBeDefined();
    });
  });

  describe('GET /api/trial/usage', () => {
    it('should return comprehensive usage summary for active trial', async () => {
      // Arrange
      const mockFeatureUsage: TrialFeatureUsage[] = [
        {
          id: 'usage-1',
          trial_id: mockTrial.id,
          feature_key: 'client_onboarding',
          feature_name: 'Client Onboarding',
          usage_count: 5,
          time_saved_minutes: 150,
          last_used_at: new Date(),
          created_at: new Date(),
        },
        {
          id: 'usage-2',
          trial_id: mockTrial.id,
          feature_key: 'email_automation',
          feature_name: 'Email Automation',
          usage_count: 8,
          time_saved_minutes: 160,
          last_used_at: new Date(),
          created_at: new Date(),
        },
      ];

      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        getActiveTrial: vi.fn().mockResolvedValue(mockTrial),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {};

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      // Mock Supabase query for feature usage
      mockQueryBuilder.select.mockResolvedValue({
        data: mockFeatureUsage,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/trial/usage');

      // Act
      const response = await getTrialUsage(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.usage_summary).toEqual(mockFeatureUsage);
      expect(responseData.metrics.total_time_saved_minutes).toBe(310); // 150 + 160
      expect(responseData.metrics.features_used_count).toBe(2);
      expect(responseData.metrics.total_usage_count).toBe(13); // 5 + 8
      expect(responseData.metrics.estimated_cost_savings).toBe(387.5); // (310/60) * 75
      expect(responseData.trial_info.trial_id).toBe(mockTrial.id);
    });

    it('should handle no active trial case', async () => {
      // Arrange
      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        getActiveTrial: vi.fn().mockResolvedValue(null),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {};

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/usage');

      // Act
      const response = await getTrialUsage(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('No active trial found');
      expect(responseData.usage_summary).toEqual([]);
    });
  });

  describe('POST /api/trial/milestones', () => {
    it('should successfully achieve a milestone', async () => {
      // Arrange
      const milestoneData = {
        milestone_type: 'first_client_connected' as MilestoneType,
        context_data: {
          client_name: 'John & Jane Wedding',
          setup_time_minutes: 25,
        },
      };

      const achievedMilestone: TrialMilestone = {
        id: 'milestone-123',
        trial_id: mockTrial.id,
        milestone_type: milestoneData.milestone_type,
        milestone_name: 'First Client Connected',
        description: 'Successfully add and configure your first client profile',
        achieved: true,
        achieved_at: new Date(),
        time_to_achieve_hours: 2,
        value_impact_score: 8,
        created_at: new Date(),
      };

      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        achieveMilestone: vi.fn().mockResolvedValue(achievedMilestone),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {};

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/milestones', {
        method: 'POST',
        body: JSON.stringify(milestoneData),
      });

      // Act
      const response = await achieveMilestone(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Milestone achieved successfully!');
      expect(responseData.milestone).toEqual(achievedMilestone);
      expect(responseData.celebration.title).toContain('First Client Connected Achieved!');
      expect(responseData.celebration.time_savings).toContain('2 hours');
      expect(mockTrialService.achieveMilestone).toHaveBeenCalledWith(
        mockUser.id,
        milestoneData.milestone_type,
        milestoneData.context_data
      );
    });

    it('should validate milestone request data', async () => {
      // Arrange - Invalid milestone type
      const invalidData = {
        milestone_type: 'invalid_milestone_type',
      };

      const request = new NextRequest('http://localhost:3000/api/trial/milestones', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      // Act
      const response = await achieveMilestone(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Invalid request data');
      expect(responseData.details).toBeDefined();
    });

    it('should handle no active trial case for milestone achievement', async () => {
      // Arrange
      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        achieveMilestone: vi.fn().mockRejectedValue(new Error('No active trial found')),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {};

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/milestones', {
        method: 'POST',
        body: JSON.stringify({
          milestone_type: 'first_client_connected',
        }),
      });

      // Act
      const response = await achieveMilestone(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('No active trial');
      expect(responseData.message).toBe('You need an active trial to achieve milestones');
    });
  });

  describe('GET /api/trial/milestones', () => {
    it('should return comprehensive milestone progress', async () => {
      // Arrange
      const mockMilestones: TrialMilestone[] = [
        {
          id: 'milestone-1',
          trial_id: mockTrial.id,
          milestone_type: 'first_client_connected',
          milestone_name: 'First Client Connected',
          description: 'Successfully add and configure your first client profile',
          achieved: true,
          achieved_at: new Date(),
          time_to_achieve_hours: 2,
          value_impact_score: 8,
          created_at: new Date(),
        },
        {
          id: 'milestone-2',
          trial_id: mockTrial.id,
          milestone_type: 'initial_journey_created',
          milestone_name: 'Initial Journey Created',
          description: 'Create your first automated client journey',
          achieved: false,
          value_impact_score: 9,
          created_at: new Date(),
        },
      ];

      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        getActiveTrial: vi.fn().mockResolvedValue(mockTrial),
      };

      const SubscriptionService = await import('@/lib/services/subscriptionService');
      const mockSubscriptionService = {};

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);
      vi.mocked(SubscriptionService.SubscriptionService).mockImplementation(() => mockSubscriptionService as any);

      // Mock Supabase query for milestones
      mockQueryBuilder.select.mockResolvedValue({
        data: mockMilestones,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/trial/milestones');

      // Act
      const response = await getMilestones(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.milestones).toHaveLength(2);
      expect(responseData.progress.total_milestones).toBe(2);
      expect(responseData.progress.achieved_count).toBe(1);
      expect(responseData.progress.remaining_count).toBe(1);
      expect(responseData.progress.progress_percentage).toBe(50);
      expect(responseData.progress.total_time_savings_hours).toBe(2); // From achieved milestone
      expect(responseData.next_recommended).toBeDefined();
      expect(responseData.next_recommended.milestone_type).toBe('initial_journey_created');
      expect(responseData.trial_info.trial_id).toBe(mockTrial.id);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost:3000/api/trial/start', {
        method: 'POST',
        body: '{"invalid": json}', // Malformed JSON
      });

      const response = await startTrialPOST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500); // JSON parsing error leads to 500
      expect(responseData.success).toBe(false);
    });

    it('should handle database connection errors', async () => {
      // Arrange - Mock database error
      mockSupabaseClient.auth.getUser.mockRejectedValue(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/trial/status');

      // Act
      const response = await getTrialStatus(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
      expect(responseData.error).toBe('Failed to get trial status');
    });

    it('should handle service timeout errors', async () => {
      // Arrange - Mock timeout error
      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        getTrialStatus: vi.fn().mockRejectedValue(new Error('Request timeout')),
      };

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);

      const request = new NextRequest('http://localhost:3000/api/trial/status');

      // Act
      const response = await getTrialStatus(request);
      const responseData = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(responseData.success).toBe(false);
    });

    it('should handle concurrent access scenarios', async () => {
      // This test simulates multiple simultaneous requests
      const requests = Array.from({ length: 5 }, () => 
        new NextRequest('http://localhost:3000/api/trial/status')
      );

      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        getTrialStatus: vi.fn().mockResolvedValue({
          success: true,
          trial: mockTrial,
          progress: {
            trial_id: mockTrial.id,
            days_remaining: 25,
            roi_metrics: {},
          },
          recommendations: {},
        }),
      };

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);

      // Act - Make multiple concurrent requests
      const responses = await Promise.all(
        requests.map(request => getTrialStatus(request))
      );

      // Assert - All requests should succeed
      responses.forEach(async (response) => {
        expect(response.status).toBe(200);
        const data = await response.json();
        expect(data.success).toBe(true);
      });

      // Service should be called for each request
      expect(mockTrialService.getTrialStatus).toHaveBeenCalledTimes(5);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle large usage data sets efficiently', async () => {
      // Arrange - Large feature usage dataset
      const largeUsageData = Array.from({ length: 1000 }, (_, i) => ({
        id: `usage-${i}`,
        trial_id: mockTrial.id,
        feature_key: `feature_${i % 10}`,
        feature_name: `Test Feature ${i % 10}`,
        usage_count: Math.floor(Math.random() * 50) + 1,
        time_saved_minutes: Math.floor(Math.random() * 120) + 5,
        last_used_at: new Date(),
        created_at: new Date(),
      }));

      const TrialService = await import('@/lib/trial/TrialService');
      const mockTrialService = {
        getActiveTrial: vi.fn().mockResolvedValue(mockTrial),
      };

      vi.mocked(TrialService.TrialService).mockImplementation(() => mockTrialService as any);

      mockQueryBuilder.select.mockResolvedValue({
        data: largeUsageData,
        error: null,
      });

      const request = new NextRequest('http://localhost:3000/api/trial/usage');

      // Act - Measure performance
      const startTime = performance.now();
      const response = await getTrialUsage(request);
      const endTime = performance.now();
      
      const responseData = await response.json();
      const executionTime = endTime - startTime;

      // Assert - Performance requirements
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.usage_summary).toHaveLength(1000);
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(responseData.metrics.total_time_saved_minutes).toBeGreaterThan(0);
    });
  });
});