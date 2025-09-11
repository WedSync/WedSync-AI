/**
 * @fileoverview Test suite for User Provisioning Service
 * Tests JIT provisioning, lifecycle management, and approval workflows
 * @version 1.0.0
 * @author WedSync Development Team
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UserProvisioningService } from '../UserProvisioningService';
import type {
  ProvisioningConfiguration,
  ProvisioningResult,
  UserLifecycleEvent,
  ApprovalWorkflow,
  RoleAssignmentRule,
} from '../UserProvisioningService';

// Mock Supabase
vi.mock('@supabase/supabase-js');
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => ({ data: null, error: null })),
        maybeSingle: vi.fn(() => ({ data: null, error: null })),
      })),
      in: vi.fn(() => ({ data: [], error: null })),
    })),
    insert: vi.fn(() => ({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({ data: null, error: null })),
    })),
    upsert: vi.fn(() => ({ data: null, error: null })),
  })),
};

vi.mocked(require('@supabase/supabase-js').createClient).mockReturnValue(
  mockSupabase,
);

describe('UserProvisioningService', () => {
  let provisioningService: UserProvisioningService;
  let mockConfig: ProvisioningConfiguration;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      jitProvisioning: {
        enabled: true,
        autoActivate: true,
        defaultRole: 'wedding_vendor',
        requiredAttributes: ['email', 'name', 'businessType'],
        attributeMapping: {
          firstName: 'first_name',
          lastName: 'last_name',
          businessType: 'vendor_type',
          companyName: 'business_name',
        },
      },
      lifecycleManagement: {
        enabled: true,
        suspensionPolicy: {
          inactivityDays: 90,
          autoSuspend: true,
          notificationDays: [30, 15, 7],
        },
        deactivationPolicy: {
          gracePeriodDays: 30,
          dataRetentionDays: 365,
        },
      },
      approvalWorkflows: {
        enabled: true,
        requireApproval: ['premium_vendor', 'venue_manager', 'admin'],
        approvers: {
          premium_vendor: ['business_development_manager'],
          venue_manager: ['operations_manager'],
          admin: ['system_administrator'],
        },
        timeoutDays: 5,
      },
      roleAssignment: {
        enabled: true,
        rules: [
          {
            condition: { businessType: 'photographer' },
            role: 'photographer_vendor',
            permissions: ['portfolio_management', 'booking_management'],
          },
          {
            condition: { businessType: 'venue', capacity: { gte: 200 } },
            role: 'large_venue_manager',
            permissions: [
              'venue_management',
              'capacity_planning',
              'booking_management',
            ],
          },
        ],
      },
    };

    provisioningService = new UserProvisioningService(
      'fake-url',
      'fake-key',
      mockConfig,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Just-in-Time Provisioning', () => {
    it('should provision new user successfully with JIT', async () => {
      const userAttributes = {
        id: 'provider-user-123',
        email: 'photographer@example.com',
        name: 'John Photographer',
        firstName: 'John',
        lastName: 'Photographer',
        businessType: 'photographer',
        companyName: 'Amazing Photography',
      };

      // Mock user doesn't exist
      mockSupabase.from().select().eq().maybeSingle.mockReturnValueOnce({
        data: null,
        error: null,
      });

      // Mock successful user creation
      mockSupabase.from().insert.mockReturnValueOnce({
        data: [{ id: 'new-user-id', ...userAttributes }],
        error: null,
      });

      const result = await provisioningService.provisionUserJIT(
        'okta',
        userAttributes,
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.user?.email).toBe('photographer@example.com');
      expect(result.user?.vendor_type).toBe('photographer');
      expect(result.user?.business_name).toBe('Amazing Photography');
      expect(result.assignedRole).toBe('photographer_vendor');
    });

    it('should update existing user during JIT provisioning', async () => {
      const existingUser = {
        id: 'existing-user-id',
        email: 'photographer@example.com',
        name: 'John Photographer',
        vendor_type: 'photographer',
        last_login: new Date('2024-01-01'),
      };

      const updatedAttributes = {
        id: 'provider-user-123',
        email: 'photographer@example.com',
        name: 'John Photographer',
        firstName: 'John',
        lastName: 'Photographer',
        businessType: 'photographer',
        companyName: 'Updated Photography Studio',
      };

      // Mock existing user found
      mockSupabase.from().select().eq().maybeSingle.mockReturnValueOnce({
        data: existingUser,
        error: null,
      });

      // Mock successful user update
      mockSupabase
        .from()
        .update()
        .eq.mockReturnValueOnce({
          data: [
            { ...existingUser, business_name: 'Updated Photography Studio' },
          ],
          error: null,
        });

      const result = await provisioningService.provisionUserJIT(
        'okta',
        updatedAttributes,
      );

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(mockSupabase.from().update).toHaveBeenCalled();
    });

    it('should validate required attributes during JIT provisioning', async () => {
      const incompleteAttributes = {
        id: 'provider-user-123',
        email: 'incomplete@example.com',
        // Missing name and businessType
      };

      const result = await provisioningService.provisionUserJIT(
        'okta',
        incompleteAttributes,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required attributes');
      expect(result.missingAttributes).toEqual(['name', 'businessType']);
    });
  });

  describe('Role Assignment', () => {
    it('should assign role based on business type rules', async () => {
      const photographerAttributes = {
        businessType: 'photographer',
        yearsExperience: 5,
        portfolio: { images: 50, reviews: 25 },
      };

      const assignment = await provisioningService.evaluateRoleAssignment(
        photographerAttributes,
      );

      expect(assignment.role).toBe('photographer_vendor');
      expect(assignment.permissions).toContain('portfolio_management');
      expect(assignment.permissions).toContain('booking_management');
      expect(assignment.ruleMatched).toBe(true);
    });

    it('should assign advanced role for large venues', async () => {
      const venueAttributes = {
        businessType: 'venue',
        capacity: 300,
        amenities: ['parking', 'catering', 'bridal_suite'],
        location: 'San Francisco, CA',
      };

      const assignment =
        await provisioningService.evaluateRoleAssignment(venueAttributes);

      expect(assignment.role).toBe('large_venue_manager');
      expect(assignment.permissions).toContain('venue_management');
      expect(assignment.permissions).toContain('capacity_planning');
      expect(assignment.capacityTier).toBe('large');
    });

    it('should apply default role when no rules match', async () => {
      const unknownAttributes = {
        businessType: 'caterer',
        specialties: ['italian', 'vegetarian'],
      };

      const assignment =
        await provisioningService.evaluateRoleAssignment(unknownAttributes);

      expect(assignment.role).toBe('wedding_vendor');
      expect(assignment.ruleMatched).toBe(false);
      expect(assignment.usedDefault).toBe(true);
    });

    it('should handle complex conditional role assignment', async () => {
      const premiumVenueAttributes = {
        businessType: 'venue',
        capacity: 500,
        priceRange: '$$$$',
        amenities: [
          'valet_parking',
          'full_catering',
          'luxury_bridal_suite',
          'ceremony_space',
        ],
        certifications: ['green_certified', 'accessibility_compliant'],
        yearsInBusiness: 15,
      };

      const assignment = await provisioningService.evaluateRoleAssignment(
        premiumVenueAttributes,
      );

      expect(assignment.role).toBe('premium_venue_partner');
      expect(assignment.permissions).toContain('premium_marketing');
      expect(assignment.permissions).toContain('priority_support');
      expect(assignment.tierLevel).toBe('premium');
    });
  });

  describe('Approval Workflows', () => {
    it('should create approval request for premium vendor', async () => {
      const premiumVendorRequest = {
        userId: 'user-123',
        requestedRole: 'premium_vendor',
        businessType: 'photographer',
        businessName: 'Elite Photography',
        annualRevenue: 500000,
        clientTestimonials: 50,
        portfolioQualityScore: 95,
      };

      // Mock approval request creation
      mockSupabase.from().insert.mockReturnValueOnce({
        data: [{ id: 'approval-request-123', status: 'pending' }],
        error: null,
      });

      const result =
        await provisioningService.createApprovalRequest(premiumVendorRequest);

      expect(result.success).toBe(true);
      expect(result.requestId).toBe('approval-request-123');
      expect(result.status).toBe('pending');
      expect(result.assignedApprovers).toContain(
        'business_development_manager',
      );
    });

    it('should process approval decision', async () => {
      const approvalDecision = {
        requestId: 'approval-request-123',
        approverId: 'business_development_manager',
        decision: 'approved' as const,
        comments: 'High-quality portfolio, excellent client reviews',
        conditions: ['complete_premium_onboarding', 'verify_insurance'],
      };

      // Mock approval request retrieval
      mockSupabase
        .from()
        .select()
        .eq()
        .single.mockReturnValueOnce({
          data: {
            id: 'approval-request-123',
            user_id: 'user-123',
            requested_role: 'premium_vendor',
            status: 'pending',
          },
          error: null,
        });

      // Mock approval update
      mockSupabase
        .from()
        .update()
        .eq.mockReturnValueOnce({
          data: [{ id: 'approval-request-123', status: 'approved' }],
          error: null,
        });

      const result =
        await provisioningService.processApprovalDecision(approvalDecision);

      expect(result.success).toBe(true);
      expect(result.finalStatus).toBe('approved');
      expect(result.nextSteps).toEqual([
        'complete_premium_onboarding',
        'verify_insurance',
      ]);
    });

    it('should handle approval timeout', async () => {
      const expiredRequest = {
        id: 'expired-request-123',
        user_id: 'user-123',
        requested_role: 'venue_manager',
        created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        status: 'pending',
      };

      const result =
        await provisioningService.handleApprovalTimeout(expiredRequest);

      expect(result.action).toBe('auto_rejected');
      expect(result.reason).toContain('approval timeout');
      expect(result.notificationSent).toBe(true);
    });
  });

  describe('User Lifecycle Management', () => {
    it('should track user lifecycle events', async () => {
      const lifecycleEvent: UserLifecycleEvent = {
        userId: 'user-123',
        event: 'account_created',
        timestamp: new Date(),
        metadata: {
          provider: 'okta',
          jitProvisioned: true,
          initialRole: 'photographer_vendor',
        },
      };

      // Mock event recording
      mockSupabase.from().insert.mockReturnValueOnce({
        data: [{ id: 'event-123', ...lifecycleEvent }],
        error: null,
      });

      const result =
        await provisioningService.recordLifecycleEvent(lifecycleEvent);

      expect(result.success).toBe(true);
      expect(result.eventId).toBe('event-123');
    });

    it('should identify inactive users for suspension', async () => {
      const inactiveUsers = [
        {
          id: 'inactive-user-1',
          email: 'inactive1@example.com',
          last_login: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
          status: 'active',
        },
        {
          id: 'inactive-user-2',
          email: 'inactive2@example.com',
          last_login: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000), // 95 days ago
          status: 'active',
        },
      ];

      // Mock inactive users query
      mockSupabase.from().select().mockReturnValueOnce({
        data: inactiveUsers,
        error: null,
      });

      const result = await provisioningService.identifyInactiveUsers();

      expect(result.length).toBe(2);
      expect(result[0].suspensionRecommended).toBe(true);
      expect(result[0].daysInactive).toBeGreaterThan(90);
    });

    it('should execute bulk user provisioning', async () => {
      const bulkUsers = Array.from({ length: 50 }, (_, i) => ({
        id: `bulk-user-${i}`,
        email: `vendor${i}@example.com`,
        name: `Vendor ${i}`,
        businessType: i % 2 === 0 ? 'photographer' : 'florist',
      }));

      // Mock successful bulk insert
      mockSupabase.from().insert.mockReturnValueOnce({
        data: bulkUsers.map((user) => ({ id: `db-${user.id}`, ...user })),
        error: null,
      });

      const result = await provisioningService.bulkProvisionUsers(
        'bulk-import-job',
        bulkUsers,
      );

      expect(result.success).toBe(true);
      expect(result.totalUsers).toBe(50);
      expect(result.provisionedUsers).toBe(50);
      expect(result.errors).toHaveLength(0);
      expect(result.processingTimeMs).toBeDefined();
    });
  });

  describe('Wedding Industry Provisioning', () => {
    it('should provision wedding vendor with industry-specific roles', async () => {
      const weddingVendorAttributes = {
        id: 'vendor-wedding-123',
        email: 'contact@elegantflowers.com',
        name: 'Elegant Flowers',
        businessType: 'florist',
        specialties: ['bridal_bouquets', 'centerpieces', 'ceremony_decor'],
        serviceRadius: 50,
        averageOrderValue: 1200,
        seasonalAvailability: {
          peak: ['may', 'june', 'september', 'october'],
          off_season: ['january', 'february', 'march'],
        },
        certifications: ['certified_florist', 'wedding_specialist'],
      };

      const result = await provisioningService.provisionWeddingVendor(
        weddingVendorAttributes,
      );

      expect(result.success).toBe(true);
      expect(result.user?.vendor_type).toBe('florist');
      expect(result.assignedRole).toBe('wedding_florist');
      expect(result.serviceCapabilities).toContain('seasonal_planning');
      expect(result.marketingTier).toBe('standard');
    });

    it('should provision wedding team member with coordinated access', async () => {
      const teamMemberAttributes = {
        id: 'team-member-456',
        email: 'sarah@weddingplanning.com',
        name: 'Sarah Wedding Planner',
        role: 'senior_planner',
        teamId: 'planning-team-1',
        specializations: ['luxury_weddings', 'destination_weddings'],
        clientCapacity: 15,
        currentWeddings: 8,
        certifications: ['certified_wedding_planner', 'abc_certified'],
      };

      const result =
        await provisioningService.provisionWeddingTeamMember(
          teamMemberAttributes,
        );

      expect(result.success).toBe(true);
      expect(result.user?.role).toBe('senior_planner');
      expect(result.teamAccess).toBeDefined();
      expect(result.teamAccess?.teamId).toBe('planning-team-1');
      expect(result.permissions).toContain('timeline_management');
      expect(result.permissions).toContain('vendor_coordination');
    });

    it('should handle wedding venue provisioning with capacity-based features', async () => {
      const venueAttributes = {
        id: 'venue-789',
        email: 'events@grandestates.com',
        name: 'Grand Estates Wedding Venue',
        businessType: 'venue',
        venueType: 'estate',
        indoorCapacity: 200,
        outdoorCapacity: 300,
        amenities: [
          'bridal_suite',
          'groom_suite',
          'catering_kitchen',
          'ceremony_space',
          'reception_hall',
          'parking_lot',
          'overnight_accommodations',
        ],
        location: {
          city: 'Napa',
          state: 'CA',
          region: 'wine_country',
        },
        priceRange: '$$$$',
        availableSeasons: 'year_round',
        cateringPolicy: 'preferred_vendors',
      };

      const result =
        await provisioningService.provisionWeddingVenue(venueAttributes);

      expect(result.success).toBe(true);
      expect(result.user?.business_type).toBe('venue');
      expect(result.capacityCategory).toBe('large');
      expect(result.premiumFeatures).toContain('luxury_amenities');
      expect(result.assignedRole).toBe('premium_venue_partner');
      expect(result.marketingFeatures).toContain('featured_listings');
    });
  });

  describe('Progress Tracking', () => {
    it('should track bulk provisioning progress', async () => {
      const jobId = 'bulk-job-123';
      let progressUpdates: any[] = [];

      const mockProgressCallback = vi.fn((progress) => {
        progressUpdates.push(progress);
      });

      const bulkUsers = Array.from({ length: 10 }, (_, i) => ({
        id: `user-${i}`,
        email: `user${i}@example.com`,
        name: `User ${i}`,
        businessType: 'photographer',
      }));

      const result = await provisioningService.bulkProvisionUsersWithProgress(
        jobId,
        bulkUsers,
        { batchSize: 3, progressCallback: mockProgressCallback },
      );

      expect(result.success).toBe(true);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100);
      expect(mockProgressCallback).toHaveBeenCalled();
    });

    it('should handle partial bulk provisioning failures', async () => {
      const mixedUsers = [
        {
          id: 'valid-1',
          email: 'valid1@example.com',
          name: 'Valid User 1',
          businessType: 'photographer',
        },
        {
          id: 'invalid-1',
          email: 'invalid-email',
          name: 'Invalid User',
          businessType: 'unknown',
        },
        {
          id: 'valid-2',
          email: 'valid2@example.com',
          name: 'Valid User 2',
          businessType: 'florist',
        },
      ];

      const result = await provisioningService.bulkProvisionUsers(
        'mixed-job',
        mixedUsers,
      );

      expect(result.success).toBe(false); // Overall failure due to invalid users
      expect(result.partialSuccess).toBe(true);
      expect(result.provisionedUsers).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].userId).toBe('invalid-1');
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      mockSupabase.from().insert.mockReturnValueOnce({
        data: null,
        error: { message: 'Connection failed', code: 'CONNECTION_ERROR' },
      });

      const userAttributes = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        businessType: 'photographer',
      };

      const result = await provisioningService.provisionUserJIT(
        'okta',
        userAttributes,
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Connection failed');
      expect(result.retryRecommended).toBe(true);
    });

    it('should validate user attributes before provisioning', async () => {
      const invalidAttributes = {
        id: 'user-123',
        email: 'invalid-email-format',
        name: '',
        businessType: 'unknown_type',
      };

      const result = await provisioningService.provisionUserJIT(
        'okta',
        invalidAttributes,
      );

      expect(result.success).toBe(false);
      expect(result.validationErrors).toBeDefined();
      expect(result.validationErrors?.email).toContain('invalid format');
      expect(result.validationErrors?.name).toContain('required');
      expect(result.validationErrors?.businessType).toContain(
        'unsupported type',
      );
    });
  });
});
