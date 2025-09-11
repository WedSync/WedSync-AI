import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { WeddingPlatformScalabilityOrchestrator } from '../../lib/platform/scalability-orchestrator';
import type {
  PlatformScalingConfig,
  PlatformScalingMetrics,
  ScalingDecision,
  WeddingProtectionStatus,
} from '../../types/platform-scaling';

// Mock Supabase client
const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve({ data: null, error: null })),
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
  channel: jest.fn(() => ({
    on: jest.fn(() => ({ subscribe: jest.fn() })),
    send: jest.fn(),
  })),
  removeChannel: jest.fn(),
};

// Mock createClient
jest.mock('../../lib/supabase/client', () => ({
  createClient: () => mockSupabaseClient,
}));

describe('WeddingPlatformScalabilityOrchestrator', () => {
  let orchestrator: WeddingPlatformScalabilityOrchestrator;
  let config: PlatformScalingConfig;

  beforeEach(() => {
    config = {
      projectId: 'test-project',
      region: 'us-east-1',
      scalingThresholds: {
        cpu: 70,
        memory: 80,
        requests: 1000,
        errors: 1,
        weddingDayMultiplier: 2.0,
      },
      enableWeddingProtection: true,
      emergencyContacts: ['admin@wedsync.com'],
    };

    orchestrator = new WeddingPlatformScalabilityOrchestrator(config);

    // Mock Date.now for consistent testing
    jest.spyOn(Date, 'now').mockImplementation(() => 1640995200000); // 2022-01-01 00:00:00 UTC
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with correct configuration', async () => {
      await orchestrator.initialize();

      const metrics = await orchestrator.getCurrentMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.platformHealth.overallScore).toBeGreaterThanOrEqual(0);
    });

    it('should enable wedding protection by default', async () => {
      await orchestrator.initialize();

      const status = await orchestrator.getWeddingProtectionStatus();
      expect(status.isActive).toBe(false); // Should be false until manually activated
    });
  });

  describe('Saturday protection', () => {
    it('should detect Saturday and activate protection', async () => {
      // Mock Date to return a Saturday (2022-01-01 was a Saturday)
      const saturdayDate = new Date(2022, 0, 1, 19, 0, 0); // Saturday 7PM
      jest.spyOn(Date, 'now').mockImplementation(() => saturdayDate.getTime());

      await orchestrator.initialize();

      const decision = await orchestrator.makeScalingDecision();
      expect(decision.restrictions).toContain('saturday_protection');
    });

    it('should prevent deployments on Saturday', async () => {
      const saturdayDate = new Date(2022, 0, 1, 10, 0, 0); // Saturday 10AM
      jest.spyOn(Date, 'now').mockImplementation(() => saturdayDate.getTime());

      await orchestrator.initialize();

      const canDeploy = await orchestrator.canPerformDeployment();
      expect(canDeploy).toBe(false);
    });

    it('should allow deployments on weekdays', async () => {
      const mondayDate = new Date(2022, 0, 3, 10, 0, 0); // Monday 10AM
      jest.spyOn(Date, 'now').mockImplementation(() => mondayDate.getTime());

      await orchestrator.initialize();

      const canDeploy = await orchestrator.canPerformDeployment();
      expect(canDeploy).toBe(true);
    });
  });

  describe('wedding season scaling', () => {
    it('should detect peak wedding season', async () => {
      // Mock June (peak month)
      const juneDate = new Date(2022, 5, 15); // June 15
      jest.spyOn(Date, 'now').mockImplementation(() => juneDate.getTime());

      await orchestrator.initialize();

      const metrics = await orchestrator.getCurrentMetrics();
      expect(metrics.weddingSeasonMetrics.currentSeason).toBe('peak');
    });

    it('should apply wedding season multiplier in peak season', async () => {
      const juneDate = new Date(2022, 5, 15);
      jest.spyOn(Date, 'now').mockImplementation(() => juneDate.getTime());

      await orchestrator.initialize();

      const decision = await orchestrator.makeScalingDecision();
      expect(decision.scalingActions).toContain('increase_capacity');
      expect(decision.reasoning).toContain('peak wedding season');
    });
  });

  describe('viral growth handling', () => {
    it('should detect viral growth spike', async () => {
      // Mock high growth metrics
      const mockMetrics: Partial<PlatformScalingMetrics> = {
        viralGrowthMetrics: {
          currentGrowthRate: 600, // Above threshold of 500
          activeViralPatterns: ['celebrity'],
          newUserRegistrations: 1200,
          inviteConversionRate: 25.5,
        },
      };

      jest
        .spyOn(orchestrator, 'getCurrentMetrics')
        .mockResolvedValue(mockMetrics as PlatformScalingMetrics);

      await orchestrator.initialize();

      const decision = await orchestrator.makeScalingDecision();
      expect(decision.scalingActions).toContain('viral_scaling');
      expect(decision.reasoning).toContain('viral growth detected');
    });

    it('should handle celebrity wedding traffic', async () => {
      await orchestrator.initialize();

      await orchestrator.handleViralSpike({
        type: 'celebrity',
        expectedMultiplier: 25.0,
        durationHours: 72,
      });

      const metrics = await orchestrator.getCurrentMetrics();
      expect(metrics.viralGrowthMetrics.activeViralPatterns).toContain(
        'celebrity',
      );
    });
  });

  describe('platform health monitoring', () => {
    it('should calculate health score correctly', async () => {
      await orchestrator.initialize();

      const metrics = await orchestrator.getCurrentMetrics();
      expect(metrics.platformHealth.overallScore).toBeGreaterThanOrEqual(0);
      expect(metrics.platformHealth.overallScore).toBeLessThanOrEqual(100);
    });

    it('should identify unhealthy systems', async () => {
      // Mock unhealthy metrics
      const mockMetrics = {
        platformHealth: {
          overallScore: 45, // Low health score
          systemStatus: {
            database: 'degraded',
            api: 'healthy',
            storage: 'failed',
          },
        },
      };

      jest
        .spyOn(orchestrator, 'getCurrentMetrics')
        .mockResolvedValue(mockMetrics as any);

      await orchestrator.initialize();

      const decision = await orchestrator.makeScalingDecision();
      expect(decision.scalingActions).toContain('health_recovery');
    });
  });

  describe('scaling decisions', () => {
    it('should make appropriate scaling decisions based on metrics', async () => {
      await orchestrator.initialize();

      const decision = await orchestrator.makeScalingDecision();

      expect(decision).toHaveProperty('timestamp');
      expect(decision).toHaveProperty('scalingActions');
      expect(decision).toHaveProperty('reasoning');
      expect(decision).toHaveProperty('priority');
      expect(Array.isArray(decision.scalingActions)).toBe(true);
    });

    it('should prioritize wedding day operations', async () => {
      const saturdayDate = new Date(2022, 0, 1, 10, 0, 0); // Saturday
      jest.spyOn(Date, 'now').mockImplementation(() => saturdayDate.getTime());

      await orchestrator.initialize();

      const decision = await orchestrator.makeScalingDecision();
      expect(decision.priority).toBe('critical');
      expect(decision.reasoning).toContain('wedding day');
    });
  });

  describe('emergency protocols', () => {
    it('should activate emergency scaling during system failure', async () => {
      await orchestrator.initialize();

      await orchestrator.activateEmergencyScaling({
        reason: 'Database connection failure',
        severity: 'critical',
        affectedSystems: ['database', 'api'],
      });

      const status = await orchestrator.getWeddingProtectionStatus();
      expect(status.isActive).toBe(true);
      expect(status.reason).toContain('Database connection failure');
    });

    it('should notify emergency contacts', async () => {
      const mockSend = jest.fn();
      mockSupabaseClient.channel = jest.fn(() => ({
        on: jest.fn(),
        send: mockSend,
        subscribe: jest.fn(),
      }));

      await orchestrator.initialize();

      await orchestrator.activateEmergencyScaling({
        reason: 'System overload',
        severity: 'high',
        affectedSystems: ['api'],
      });

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'broadcast',
          event: 'emergency-scaling-activated',
        }),
      );
    });
  });

  describe('wedding protection management', () => {
    it('should enable wedding protection manually', async () => {
      await orchestrator.initialize();

      await orchestrator.enableWeddingProtection(
        'Manual activation for testing',
      );

      const status = await orchestrator.getWeddingProtectionStatus();
      expect(status.isActive).toBe(true);
      expect(status.reason).toBe('Manual activation for testing');
    });

    it('should disable wedding protection', async () => {
      await orchestrator.initialize();
      await orchestrator.enableWeddingProtection('Test activation');

      await orchestrator.disableWeddingProtection();

      const status = await orchestrator.getWeddingProtectionStatus();
      expect(status.isActive).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockSupabaseClient.from = jest.fn(() => ({
        select: jest.fn(() => {
          throw new Error('Database connection failed');
        }),
      }));

      await expect(orchestrator.initialize()).rejects.toThrow(
        'Database connection failed',
      );
    });

    it('should continue operating with degraded functionality', async () => {
      mockSupabaseClient.from = jest.fn(() => ({
        select: jest.fn(() =>
          Promise.resolve({
            data: null,
            error: { message: 'Connection timeout' },
          }),
        ),
      }));

      await orchestrator.initialize();

      const metrics = await orchestrator.getCurrentMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.platformHealth.overallScore).toBeLessThan(100); // Degraded due to connection issues
    });
  });

  describe('real-time monitoring', () => {
    it('should set up real-time subscriptions', async () => {
      const mockSubscribe = jest.fn();
      mockSupabaseClient.channel = jest.fn(() => ({
        on: jest.fn(() => ({ subscribe: mockSubscribe })),
        send: jest.fn(),
      }));

      await orchestrator.initialize();

      expect(mockSupabaseClient.channel).toHaveBeenCalledWith(
        'wedding-platform-scaling',
      );
      expect(mockSubscribe).toHaveBeenCalled();
    });

    it('should handle real-time wedding events', async () => {
      let eventHandler: Function = jest.fn();

      mockSupabaseClient.channel = jest.fn(() => ({
        on: jest.fn((event, callback) => {
          if (event === 'broadcast') {
            eventHandler = callback;
          }
          return { subscribe: jest.fn() };
        }),
        send: jest.fn(),
      }));

      await orchestrator.initialize();

      // Simulate wedding day event
      eventHandler({ event: 'wedding-day-started', wedding_count: 5 });

      const status = await orchestrator.getWeddingProtectionStatus();
      expect(status.isActive).toBe(true);
    });
  });
});
