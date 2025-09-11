import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals';
import { SlaMonitor } from '@/lib/support/sla-monitor';
import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
jest.mock('@supabase/supabase-js');
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      gte: jest.fn(() => ({
        lte: jest.fn(() => Promise.resolve({ data: [], error: null })),
      })),
    })),
    insert: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    update: jest.fn(() => ({
      eq: jest.fn(() => Promise.resolve({ data: {}, error: null })),
    })),
  })),
  rpc: jest.fn(() => Promise.resolve({ data: [], error: null })),
};

describe('SlaMonitor', () => {
  let slaMonitor: SlaMonitor;

  beforeEach(() => {
    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    slaMonitor = new SlaMonitor();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('SLA Calculation', () => {
    it('should calculate correct SLA times for Enterprise tier', () => {
      const ticket = {
        id: 'test-ticket',
        priority: 'high' as const,
        customer_tier: 'enterprise' as const,
        created_at: new Date().toISOString(),
      };

      const sla = slaMonitor.calculateSla(ticket);

      expect(sla.response_time_minutes).toBe(15); // Enterprise: 15 min response
      expect(sla.resolution_time_hours).toBe(2); // Enterprise: 2 hour resolution
      expect(sla.tier).toBe('enterprise');
    });

    it('should calculate correct SLA times for Professional tier', () => {
      const ticket = {
        id: 'test-ticket',
        priority: 'medium' as const,
        customer_tier: 'professional' as const,
        created_at: new Date().toISOString(),
      };

      const sla = slaMonitor.calculateSla(ticket);

      expect(sla.response_time_minutes).toBe(60); // Professional: 1 hour response
      expect(sla.resolution_time_hours).toBe(8); // Professional: 8 hour resolution
    });

    it('should calculate correct SLA times for Free tier', () => {
      const ticket = {
        id: 'test-ticket',
        priority: 'low' as const,
        customer_tier: 'free' as const,
        created_at: new Date().toISOString(),
      };

      const sla = slaMonitor.calculateSla(ticket);

      expect(sla.response_time_minutes).toBe(1440); // Free: 24 hour response
      expect(sla.resolution_time_hours).toBe(48); // Free: 48 hour resolution
    });

    it('should handle wedding emergencies with immediate SLA', () => {
      const ticket = {
        id: 'test-ticket',
        priority: 'wedding_emergency' as const,
        customer_tier: 'starter' as const,
        is_wedding_emergency: true,
        created_at: new Date().toISOString(),
      };

      const sla = slaMonitor.calculateSla(ticket);

      expect(sla.response_time_minutes).toBe(5); // Wedding emergency: 5 min response
      expect(sla.resolution_time_hours).toBe(1); // Wedding emergency: 1 hour resolution
    });
  });

  describe('Wedding Season Adjustments', () => {
    it('should apply wedding season multiplier during peak season', () => {
      // Mock peak wedding season (June)
      const juneTicker = new Date('2024-06-15T10:00:00Z');
      jest.setSystemTime(juneTicker);

      const ticket = {
        id: 'test-ticket',
        priority: 'medium' as const,
        customer_tier: 'professional' as const,
        created_at: juneTicker.toISOString(),
      };

      const sla = slaMonitor.calculateSla(ticket);

      // Should have reduced SLA times during wedding season
      expect(sla.response_time_minutes).toBeLessThan(60); // Less than normal 60 minutes
      expect(sla.resolution_time_hours).toBeLessThan(8); // Less than normal 8 hours
    });

    it('should apply Saturday/Sunday adjustments', () => {
      // Mock Saturday
      const saturday = new Date('2024-06-08T10:00:00Z'); // A Saturday
      jest.setSystemTime(saturday);

      const ticket = {
        id: 'test-ticket',
        priority: 'high' as const,
        customer_tier: 'professional' as const,
        created_at: saturday.toISOString(),
      };

      const sla = slaMonitor.calculateSla(ticket);

      // Weekend SLA should be different (likely more urgent)
      expect(sla.is_weekend_priority).toBe(true);
    });
  });

  describe('SLA Tracking', () => {
    it('should create SLA tracking record when ticket is created', async () => {
      const ticket = {
        id: 'test-ticket-123',
        priority: 'high' as const,
        customer_tier: 'enterprise' as const,
        created_at: new Date().toISOString(),
      };

      await slaMonitor.startTracking(ticket);

      expect(mockSupabase.from).toHaveBeenCalledWith('support_sla_tracking');
      expect(mockSupabase.from().insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ticket_id: 'test-ticket-123',
          sla_type: 'response',
          target_minutes: 15, // Enterprise response time
          status: 'active',
        }),
      );
    });

    it('should update SLA status when response is provided', async () => {
      await slaMonitor.recordResponse('test-ticket-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('support_sla_tracking');
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'met',
          actual_minutes: expect.any(Number),
          updated_at: expect.any(String),
        }),
      );
    });

    it('should update SLA status when ticket is resolved', async () => {
      await slaMonitor.recordResolution('test-ticket-123');

      expect(mockSupabase.from).toHaveBeenCalledWith('support_sla_tracking');
      expect(mockSupabase.from().update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'met',
          updated_at: expect.any(String),
        }),
      );
    });
  });

  describe('Breach Detection', () => {
    it('should detect response time breaches', async () => {
      // Mock tickets approaching breach
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            ticket_id: 'breach-ticket-1',
            sla_type: 'response',
            target_minutes: 60,
            minutes_elapsed: 55,
            status: 'active',
          },
        ],
        error: null,
      });

      const breaches = await slaMonitor.checkBreaches();

      expect(breaches).toHaveLength(1);
      expect(breaches[0].ticket_id).toBe('breach-ticket-1');
      expect(breaches[0].breach_type).toBe('approaching');
    });

    it('should detect actual SLA breaches', async () => {
      // Mock actual breaches
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            ticket_id: 'breached-ticket-1',
            sla_type: 'resolution',
            target_minutes: 480, // 8 hours
            minutes_elapsed: 500,
            status: 'active',
          },
        ],
        error: null,
      });

      const breaches = await slaMonitor.checkBreaches();

      expect(breaches).toHaveLength(1);
      expect(breaches[0].ticket_id).toBe('breached-ticket-1');
      expect(breaches[0].breach_type).toBe('breached');
      expect(breaches[0].time_over_minutes).toBe(20);
    });
  });

  describe('Escalation Rules', () => {
    it('should trigger escalation for enterprise SLA breaches', async () => {
      const breach = {
        ticket_id: 'enterprise-ticket',
        customer_tier: 'enterprise',
        sla_type: 'response',
        breach_type: 'breached' as const,
        time_over_minutes: 10,
        priority: 'high' as const,
      };

      const escalation = await slaMonitor.processEscalation(breach);

      expect(escalation.should_escalate).toBe(true);
      expect(escalation.escalate_to).toBe('senior_support');
      expect(escalation.urgency_level).toBe('high');
    });

    it('should trigger immediate escalation for wedding emergencies', async () => {
      const breach = {
        ticket_id: 'wedding-emergency',
        customer_tier: 'professional',
        sla_type: 'response',
        breach_type: 'breached' as const,
        time_over_minutes: 1,
        priority: 'wedding_emergency' as const,
        is_wedding_emergency: true,
      };

      const escalation = await slaMonitor.processEscalation(breach);

      expect(escalation.should_escalate).toBe(true);
      expect(escalation.escalate_to).toBe('emergency_team');
      expect(escalation.urgency_level).toBe('critical');
      expect(escalation.notify_management).toBe(true);
    });

    it('should not escalate minor breaches for free tier', async () => {
      const breach = {
        ticket_id: 'free-ticket',
        customer_tier: 'free',
        sla_type: 'response',
        breach_type: 'approaching' as const,
        time_over_minutes: 0,
        priority: 'low' as const,
      };

      const escalation = await slaMonitor.processEscalation(breach);

      expect(escalation.should_escalate).toBe(false);
    });
  });

  describe('Performance Metrics', () => {
    it('should calculate SLA compliance rates', async () => {
      // Mock SLA performance data
      mockSupabase
        .from()
        .select()
        .gte()
        .lte.mockResolvedValueOnce({
          data: [
            { status: 'met', sla_type: 'response' },
            { status: 'met', sla_type: 'response' },
            { status: 'breached', sla_type: 'response' },
            { status: 'met', sla_type: 'resolution' },
            { status: 'breached', sla_type: 'resolution' },
          ],
          error: null,
        });

      const metrics = await slaMonitor.getSlaMetrics(
        '2024-01-01',
        '2024-01-31',
      );

      expect(metrics.response_sla_compliance).toBe(66.67); // 2/3 met
      expect(metrics.resolution_sla_compliance).toBe(50); // 1/2 met
      expect(metrics.total_tickets).toBe(5);
      expect(metrics.total_breaches).toBe(2);
    });

    it('should calculate average response times by tier', async () => {
      mockSupabase
        .from()
        .select()
        .gte()
        .lte.mockResolvedValueOnce({
          data: [
            { customer_tier: 'enterprise', actual_minutes: 10 },
            { customer_tier: 'enterprise', actual_minutes: 20 },
            { customer_tier: 'professional', actual_minutes: 45 },
            { customer_tier: 'professional', actual_minutes: 55 },
          ],
          error: null,
        });

      const metrics = await slaMonitor.getSlaMetrics(
        '2024-01-01',
        '2024-01-31',
      );

      expect(metrics.avg_response_time_by_tier.enterprise).toBe(15); // (10+20)/2
      expect(metrics.avg_response_time_by_tier.professional).toBe(50); // (45+55)/2
    });
  });

  describe('Real-time Monitoring', () => {
    it('should start monitoring when initialized', () => {
      const monitor = new SlaMonitor();

      // Should have started the monitoring interval
      expect(setInterval).toHaveBeenCalledWith(
        expect.any(Function),
        60000, // 1 minute intervals
      );
    });

    it('should check breaches periodically', async () => {
      const checkBreachesSpy = jest.spyOn(slaMonitor, 'checkBreaches');

      // Fast-forward 1 minute
      jest.advanceTimersByTime(60000);

      expect(checkBreachesSpy).toHaveBeenCalled();
    });

    it('should handle monitoring errors gracefully', async () => {
      // Mock error in breach checking
      mockSupabase.rpc.mockRejectedValueOnce(new Error('Database error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Fast-forward to trigger monitoring
      jest.advanceTimersByTime(60000);

      // Should log error but not crash
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error checking SLA breaches'),
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Wedding Day Special Handling', () => {
    it('should detect wedding day tickets and apply special SLA', () => {
      const weddingDayTicket = {
        id: 'wedding-today',
        priority: 'high' as const,
        customer_tier: 'professional' as const,
        created_at: new Date().toISOString(),
        metadata: {
          wedding_date: new Date().toISOString(), // Wedding is today
        },
      };

      const sla = slaMonitor.calculateSla(weddingDayTicket);

      expect(sla.is_wedding_day).toBe(true);
      expect(sla.response_time_minutes).toBeLessThanOrEqual(15); // Elevated priority
    });

    it('should apply weekend wedding adjustments', () => {
      // Mock Saturday wedding day
      const saturday = new Date('2024-06-08T10:00:00Z');
      jest.setSystemTime(saturday);

      const saturdayWeddingTicket = {
        id: 'saturday-wedding',
        priority: 'medium' as const,
        customer_tier: 'starter' as const,
        created_at: saturday.toISOString(),
        metadata: {
          wedding_date: saturday.toISOString(),
          is_weekend_wedding: true,
        },
      };

      const sla = slaMonitor.calculateSla(saturdayWeddingTicket);

      expect(sla.is_weekend_priority).toBe(true);
      expect(sla.response_time_minutes).toBeLessThan(60); // Better than normal starter SLA
    });
  });

  describe('Notifications and Alerts', () => {
    it('should send notifications for SLA breaches', async () => {
      const notificationSpy = jest.fn();
      slaMonitor.onSlaEvent = notificationSpy;

      const breach = {
        ticket_id: 'breached-ticket',
        customer_tier: 'enterprise',
        sla_type: 'response',
        breach_type: 'breached' as const,
        time_over_minutes: 5,
        priority: 'high' as const,
      };

      await slaMonitor.processEscalation(breach);

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sla_breach',
          ticket_id: 'breached-ticket',
          severity: 'high',
        }),
      );
    });

    it('should send early warning notifications', async () => {
      const notificationSpy = jest.fn();
      slaMonitor.onSlaEvent = notificationSpy;

      // Mock approaching breach
      mockSupabase.rpc.mockResolvedValueOnce({
        data: [
          {
            ticket_id: 'warning-ticket',
            sla_type: 'response',
            target_minutes: 60,
            minutes_elapsed: 50, // 10 minutes left
            status: 'active',
            customer_tier: 'professional',
          },
        ],
        error: null,
      });

      await slaMonitor.checkBreaches();

      expect(notificationSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'sla_warning',
          ticket_id: 'warning-ticket',
          minutes_remaining: 10,
        }),
      );
    });
  });
});
