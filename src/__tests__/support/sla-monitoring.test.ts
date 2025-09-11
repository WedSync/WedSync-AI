/**
 * WS-235: SLA Monitoring Service - Test Suite
 *
 * Tests the automated SLA monitoring and escalation system including:
 * - Real-time SLA breach detection
 * - Wedding day emergency protocols
 * - Automated escalation workflows
 * - Performance metrics tracking
 * - System alert generation
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  jest,
} from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { SLAMonitorService } from '../../lib/support/sla-monitor';

// Test configuration
const TEST_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
};

const supabase = createClient(
  TEST_CONFIG.supabaseUrl,
  TEST_CONFIG.supabaseServiceKey,
);

describe('WS-235: SLA Monitoring Service Tests', () => {
  let testOrganizationId: string;
  let testUserId: string;
  let testAgentId: string;
  let slaMonitor: SLAMonitorService;

  beforeAll(async () => {
    console.log('🔧 Setting up SLA monitoring test data...');

    // Create test organization
    const { data: org } = await supabase
      .from('organizations')
      .insert({
        name: 'SLA Test Wedding Studio',
        domain: 'sla-test-studio.com',
        subscription_tier: 'PROFESSIONAL',
        settings: {
          sla_monitoring_enabled: true,
          wedding_day_alerts: true,
        },
      })
      .select()
      .single();

    testOrganizationId = org.id;

    // Create test user
    const { data: user } = await supabase.auth.admin.createUser({
      email: `sla-test-${Date.now()}@wedsync-test.com`,
      password: 'test-password-123',
      email_confirm: true,
    });

    testUserId = user.user.id;

    await supabase.from('user_profiles').insert({
      user_id: testUserId,
      organization_id: testOrganizationId,
      role: 'admin',
    });

    // Create test support agents
    const agents = [
      {
        role: 'agent',
        skills: ['technical', 'billing'],
        is_wedding_day_specialist: true,
        satisfaction_score: 4.5,
      },
      {
        role: 'supervisor',
        skills: ['technical', 'wedding_day'],
        is_wedding_day_specialist: true,
        satisfaction_score: 4.8,
      },
      {
        role: 'manager',
        skills: ['all'],
        is_wedding_day_specialist: false,
        satisfaction_score: 4.7,
      },
    ];

    for (const agentData of agents) {
      await supabase.from('support_agents').insert({
        organization_id: testOrganizationId,
        user_id: testUserId,
        ...agentData,
        is_available: true,
        max_concurrent_tickets: 10,
        current_ticket_count: 0,
      });
    }

    // Initialize SLA monitor instance for testing
    slaMonitor = new SLAMonitorService();

    console.log('✅ SLA monitoring test setup complete');
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up SLA monitoring test data...');

    // Stop SLA monitor if running
    slaMonitor?.stop();

    // Clean up test data
    await supabase
      .from('support_escalations')
      .delete()
      .eq('organization_id', testOrganizationId);
    await supabase
      .from('support_tickets')
      .delete()
      .eq('organization_id', testOrganizationId);
    await supabase
      .from('support_agents')
      .delete()
      .eq('organization_id', testOrganizationId);
    await supabase.from('user_profiles').delete().eq('user_id', testUserId);
    await supabase.from('organizations').delete().eq('id', testOrganizationId);
    await supabase.auth.admin.deleteUser(testUserId);

    console.log('✅ SLA monitoring test cleanup complete');
  });

  beforeEach(() => {
    // Reset mocks between tests
    jest.clearAllMocks();
  });

  describe('SLA Breach Detection', () => {
    it('should detect response SLA breach', async () => {
      // Create ticket that's overdue for response
      const overdueResponseTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
      const slaDeadline = new Date(Date.now() - 30 * 60 * 1000); // 30 minutes ago (missed)

      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Response SLA Breach Test',
          description: 'This ticket should trigger response SLA escalation',
          organization_id: testOrganizationId,
          status: 'open',
          priority: 'high',
          category: 'technical',
          user_tier: 'PROFESSIONAL',
          created_at: overdueResponseTime.toISOString(),
          sla_response_deadline: slaDeadline.toISOString(),
          first_response_at: null, // No response yet
          escalation_level: 0,
        })
        .select()
        .single();

      // Manually trigger SLA check
      const result = await slaMonitor['performSLACheck']();

      // Verify escalation was triggered
      const { data: escalations } = await supabase
        .from('support_escalations')
        .select('*')
        .eq('ticket_id', ticket.id)
        .order('created_at', { ascending: false });

      expect(escalations?.length).toBeGreaterThan(0);

      const latestEscalation = escalations[0];
      expect(latestEscalation.escalation_type).toBe('sla_based');
      expect(latestEscalation.breach_type).toBe('response');
      expect(latestEscalation.escalation_level).toBeGreaterThan(0);

      console.log(
        `✅ Response SLA breach detected and escalated to level ${latestEscalation.escalation_level}`,
      );
    });

    it('should detect resolution SLA breach', async () => {
      // Create ticket that has response but overdue for resolution
      const createdTime = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago
      const responseTime = new Date(Date.now() - 7 * 60 * 60 * 1000); // 7 hours ago (responded)
      const resolutionDeadline = new Date(Date.now() - 1 * 60 * 60 * 1000); // 1 hour ago (missed)

      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Resolution SLA Breach Test',
          description: 'This ticket should trigger resolution SLA escalation',
          organization_id: testOrganizationId,
          status: 'in_progress',
          priority: 'medium',
          category: 'billing',
          user_tier: 'PROFESSIONAL',
          created_at: createdTime.toISOString(),
          first_response_at: responseTime.toISOString(),
          sla_resolution_deadline: resolutionDeadline.toISOString(),
          resolved_at: null, // Not resolved yet
          escalation_level: 0,
        })
        .select()
        .single();

      // Trigger SLA check
      await slaMonitor['performSLACheck']();

      // Verify resolution escalation
      const { data: escalations } = await supabase
        .from('support_escalations')
        .select('*')
        .eq('ticket_id', ticket.id)
        .eq('breach_type', 'resolution');

      expect(escalations?.length).toBeGreaterThan(0);
      expect(escalations[0].escalation_type).toBe('sla_based');
      expect(escalations[0].breach_type).toBe('resolution');

      console.log(`✅ Resolution SLA breach detected and escalated`);
    });

    it('should not escalate tickets already at appropriate level', async () => {
      // Create ticket that's already escalated appropriately
      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Already Escalated Ticket',
          description: 'This ticket is already escalated appropriately',
          organization_id: testOrganizationId,
          status: 'open',
          priority: 'high',
          category: 'technical',
          user_tier: 'PROFESSIONAL',
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          sla_response_deadline: new Date(
            Date.now() - 5 * 60 * 1000,
          ).toISOString(),
          escalation_level: 2, // Already escalated
          last_escalation_at: new Date(
            Date.now() - 10 * 60 * 1000,
          ).toISOString(),
        })
        .select()
        .single();

      const initialEscalationCount = await supabase
        .from('support_escalations')
        .select('id')
        .eq('ticket_id', ticket.id);

      await slaMonitor['performSLACheck']();

      const finalEscalationCount = await supabase
        .from('support_escalations')
        .select('id')
        .eq('ticket_id', ticket.id);

      // Should not create additional escalations for already-escalated ticket
      expect(finalEscalationCount.data?.length).toBe(
        initialEscalationCount.data?.length,
      );

      console.log(`✅ Appropriately escalated ticket was not re-escalated`);
    });
  });

  describe('Wedding Day Emergency Protocols', () => {
    it('should trigger immediate emergency protocol for wedding day issue', async () => {
      // Create wedding day emergency (ceremony in 4 hours)
      const weddingDate = new Date(Date.now() + 4 * 60 * 60 * 1000);

      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'WEDDING DAY EMERGENCY: Website completely down!',
          description:
            'The wedding website is completely inaccessible and the ceremony is in 4 hours!',
          organization_id: testOrganizationId,
          status: 'open',
          priority: 'critical',
          category: 'technical',
          user_tier: 'PROFESSIONAL',
          is_wedding_day_issue: true,
          hours_until_wedding: 4,
          wedding_date: weddingDate.toISOString(),
          escalation_level: 0,
        })
        .select()
        .single();

      // Trigger SLA check
      await slaMonitor['performSLACheck']();

      // Verify emergency escalation
      const { data: updatedTicket } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticket.id)
        .single();

      expect(updatedTicket.status).toBe('emergency');
      expect(updatedTicket.escalation_level).toBe(999); // Special wedding day level
      expect(updatedTicket.priority).toBe('critical');

      // Verify escalation record
      const { data: escalations } = await supabase
        .from('support_escalations')
        .select('*')
        .eq('ticket_id', ticket.id)
        .eq('escalation_type', 'wedding_day_emergency');

      expect(escalations?.length).toBeGreaterThan(0);
      expect(escalations[0].escalation_level).toBe(999);
      expect(escalations[0].urgency_level).toBe('immediate');

      console.log(`✅ Wedding day emergency escalated to level 999`);
    });

    it('should prioritize wedding within 48 hours', async () => {
      // Create wedding priority issue (wedding tomorrow)
      const weddingDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Guest list sync issue before wedding',
          description: 'Guest list is not syncing and wedding is tomorrow',
          organization_id: testOrganizationId,
          status: 'open',
          priority: 'high',
          category: 'guest_management',
          user_tier: 'PROFESSIONAL',
          hours_until_wedding: 24,
          wedding_date: weddingDate.toISOString(),
          escalation_level: 0,
        })
        .select()
        .single();

      await slaMonitor['performSLACheck']();

      // Should escalate to wedding priority
      const { data: escalations } = await supabase
        .from('support_escalations')
        .select('*')
        .eq('ticket_id', ticket.id)
        .eq('escalation_type', 'wedding_day_emergency');

      expect(escalations?.length).toBeGreaterThan(0);
      expect(escalations[0].urgency_level).toBe('urgent');

      console.log(`✅ Wedding within 48 hours escalated with urgent priority`);
    });

    it('should notify wedding specialists for wedding emergencies', async () => {
      const weddingDate = new Date(Date.now() + 2 * 60 * 60 * 1000);

      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Payment system failure on wedding day',
          description:
            'Cannot process any payments and reception starts in 2 hours',
          organization_id: testOrganizationId,
          status: 'open',
          priority: 'critical',
          category: 'billing',
          user_tier: 'ENTERPRISE',
          is_wedding_day_issue: true,
          hours_until_wedding: 2,
          wedding_date: weddingDate.toISOString(),
        })
        .select()
        .single();

      await slaMonitor['performSLACheck']();

      // Check that notifications were sent to wedding specialists
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'wedding_emergency')
        .contains('data', { ticket_id: ticket.id });

      expect(notifications?.length).toBeGreaterThan(0);

      const notification = notifications[0];
      expect(notification.title).toContain('EMERGENCY');
      expect(notification.message).toContain(ticket.id);

      console.log(
        `✅ ${notifications.length} wedding emergency notifications sent`,
      );
    });
  });

  describe('Escalation Level Progression', () => {
    it('should progress through escalation levels appropriately', async () => {
      // Create ticket and simulate time progression
      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Multi-level Escalation Test',
          description: 'Testing escalation level progression',
          organization_id: testOrganizationId,
          status: 'open',
          priority: 'high',
          category: 'technical',
          user_tier: 'PROFESSIONAL',
          escalation_level: 0,
        })
        .select()
        .single();

      const escalationTests = [
        { ageMinutes: 30, expectedLevel: 0 }, // Within SLA
        { ageMinutes: 360, expectedLevel: 1 }, // 75% of SLA (6 hours * 0.75 = 4.5 hours)
        { ageMinutes: 432, expectedLevel: 2 }, // 90% of SLA (6 hours * 0.9 = 5.4 hours)
        { ageMinutes: 480, expectedLevel: 3 }, // 100% of SLA (6 hours)
        { ageMinutes: 600, expectedLevel: 4 }, // 125% of SLA (6 hours * 1.25 = 7.5 hours)
      ];

      for (const test of escalationTests) {
        // Update ticket creation time
        const createdAt = new Date(Date.now() - test.ageMinutes * 60 * 1000);
        const slaDeadline = new Date(createdAt.getTime() + 8 * 60 * 60 * 1000); // 8 hour SLA for PROFESSIONAL high priority

        await supabase
          .from('support_tickets')
          .update({
            created_at: createdAt.toISOString(),
            sla_response_deadline: slaDeadline.toISOString(),
          })
          .eq('id', ticket.id);

        // Check escalation level
        const escalationCheck = slaMonitor['checkSLACompliance'](
          {
            ...ticket,
            created_at: createdAt.toISOString(),
            sla_response_deadline: slaDeadline.toISOString(),
          },
          new Date(),
        );

        if (test.expectedLevel > 0) {
          expect(escalationCheck.needsEscalation).toBe(true);
          expect(escalationCheck.escalationLevel).toBe(test.expectedLevel);
        } else {
          expect(escalationCheck.needsEscalation).toBe(false);
        }

        console.log(
          `✅ At ${test.ageMinutes} minutes: escalation level ${escalationCheck.escalationLevel || 0} (expected ${test.expectedLevel})`,
        );
      }
    });

    it('should send appropriate notifications for each escalation level', async () => {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .insert({
          subject: 'Notification Test Ticket',
          description: 'Testing escalation notifications',
          organization_id: testOrganizationId,
          status: 'open',
          priority: 'critical',
          category: 'technical',
          user_tier: 'PROFESSIONAL',
          created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
          sla_response_deadline: new Date(
            Date.now() - 1 * 60 * 60 * 1000,
          ).toISOString(), // 1 hour overdue
          escalation_level: 0,
        })
        .select()
        .single();

      await slaMonitor['performSLACheck']();

      // Check for escalation notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('type', 'sla_breach')
        .contains('data', { ticket_id: ticket.id });

      expect(notifications?.length).toBeGreaterThan(0);

      // Should notify appropriate roles based on escalation level
      const notification = notifications[0];
      expect(notification.title).toContain('SLA Breach');
      expect(notification.data.escalation_level).toBeGreaterThan(0);

      console.log(`✅ SLA breach notifications sent for escalation`);
    });
  });

  describe('Performance Metrics and Monitoring', () => {
    it('should calculate and store performance metrics', async () => {
      // Create sample tickets with various states
      const sampleTickets = [
        {
          status: 'closed',
          first_response_at: new Date(Date.now() - 1 * 60 * 60 * 1000),
          resolved_at: new Date(),
        },
        { status: 'open', first_response_at: null, resolved_at: null }, // SLA breach
        {
          status: 'in_progress',
          first_response_at: new Date(Date.now() - 30 * 60 * 1000),
          resolved_at: null,
        },
      ];

      for (let i = 0; i < sampleTickets.length; i++) {
        await supabase.from('support_tickets').insert({
          subject: `Metrics Test Ticket ${i + 1}`,
          description: 'For performance metrics testing',
          organization_id: testOrganizationId,
          priority: 'medium',
          category: 'technical',
          user_tier: 'PROFESSIONAL',
          created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          sla_response_deadline: new Date(
            Date.now() - 30 * 60 * 1000,
          ).toISOString(),
          ...sampleTickets[i],
        });
      }

      await slaMonitor['performSLACheck']();

      const metrics = slaMonitor.getMetrics();

      expect(metrics.totalTickets).toBeGreaterThan(0);
      expect(metrics.breachRate).toBeGreaterThanOrEqual(0);
      expect(metrics.breachRate).toBeLessThanOrEqual(1);

      console.log(
        `✅ Performance metrics calculated: ${metrics.totalTickets} tickets, ${(metrics.breachRate * 100).toFixed(1)}% breach rate`,
      );
    });

    it('should generate system alerts for high breach rates', async () => {
      // Create multiple tickets with SLA breaches to trigger system alert
      const breachedTickets = [];
      for (let i = 0; i < 5; i++) {
        const { data: ticket } = await supabase
          .from('support_tickets')
          .insert({
            subject: `High Breach Rate Test ${i + 1}`,
            description: 'Creating high breach rate scenario',
            organization_id: testOrganizationId,
            status: 'open',
            priority: 'high',
            category: 'technical',
            user_tier: 'PROFESSIONAL',
            created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            sla_response_deadline: new Date(
              Date.now() - 1 * 60 * 60 * 1000,
            ).toISOString(),
            first_response_at: null,
          })
          .select()
          .single();

        breachedTickets.push(ticket);
      }

      await slaMonitor['performSLACheck']();

      // Check for system alerts
      const { data: systemAlerts } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('alert_type', 'high_breach_rate')
        .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // Last 5 minutes

      expect(systemAlerts?.length).toBeGreaterThan(0);
      expect(systemAlerts[0].severity).toBe('high');
      expect(systemAlerts[0].message).toContain('breach rate');

      console.log(`✅ System alert generated for high breach rate`);
    });
  });

  describe('Service Management', () => {
    it('should start and stop monitoring service correctly', async () => {
      const testMonitor = new SLAMonitorService();

      // Test starting
      expect(testMonitor.getStatus().isRunning).toBe(false);

      testMonitor.start();
      expect(testMonitor.getStatus().isRunning).toBe(true);

      // Test stopping
      testMonitor.stop();
      expect(testMonitor.getStatus().isRunning).toBe(false);

      console.log(`✅ SLA Monitor service start/stop functionality working`);
    });

    it('should handle errors gracefully during SLA checks', async () => {
      // Create invalid ticket data to trigger error handling
      await supabase.from('support_tickets').insert({
        subject: 'Error Handling Test',
        description: 'Testing error scenarios',
        organization_id: 'invalid-org-id', // This should cause errors
        status: 'open',
        priority: 'high',
        category: 'technical',
        user_tier: 'PROFESSIONAL',
      });

      // Should not crash when encountering errors
      await expect(slaMonitor['performSLACheck']()).resolves.not.toThrow();

      console.log(`✅ SLA Monitor handles errors gracefully`);
    });

    it('should provide accurate status and metrics', async () => {
      const status = slaMonitor.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('uptime');
      expect(status).toHaveProperty('lastCheck');
      expect(status).toHaveProperty('metrics');

      expect(typeof status.isRunning).toBe('boolean');
      expect(typeof status.uptime).toBe('number');
      expect(status.lastCheck).toBeInstanceOf(Date);
      expect(status.metrics).toHaveProperty('totalTickets');
      expect(status.metrics).toHaveProperty('breachRate');

      console.log(`✅ SLA Monitor status reporting working correctly`);
    });
  });

  describe('Load and Stress Testing', () => {
    it('should handle large batches of tickets efficiently', async () => {
      const startTime = Date.now();
      const batchSize = 50;

      // Create large batch of tickets
      const ticketPromises = [];
      for (let i = 0; i < batchSize; i++) {
        ticketPromises.push(
          supabase.from('support_tickets').insert({
            subject: `Batch Test Ticket ${i + 1}`,
            description: 'Testing batch processing performance',
            organization_id: testOrganizationId,
            status: 'open',
            priority: 'medium',
            category: 'technical',
            user_tier: 'PROFESSIONAL',
            created_at: new Date(
              Date.now() - Math.random() * 2 * 60 * 60 * 1000,
            ).toISOString(), // Random age up to 2 hours
            sla_response_deadline: new Date(
              Date.now() - Math.random() * 30 * 60 * 1000,
            ).toISOString(), // Some overdue
          }),
        );
      }

      await Promise.all(ticketPromises);

      // Process the batch
      const processStart = Date.now();
      await slaMonitor['performSLACheck']();
      const processEnd = Date.now();

      const setupTime = processStart - startTime;
      const processingTime = processEnd - processStart;

      expect(processingTime).toBeLessThan(10000); // Should process within 10 seconds

      console.log(
        `✅ Processed ${batchSize} tickets in ${processingTime}ms (setup: ${setupTime}ms)`,
      );
    }, 30000); // 30 second timeout
  });
});
