/**
 * WS-235: SLA Monitoring Background Service
 *
 * This service runs continuously to monitor SLA compliance and trigger
 * automatic escalations for support tickets in the wedding industry context.
 *
 * Features:
 * - Real-time SLA monitoring
 * - Wedding day emergency detection
 * - Automatic escalation workflows
 * - Performance analytics
 * - Executive alerting for critical issues
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key for background operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Monitoring configuration
const MONITORING_CONFIG = {
  checkIntervalMs: 60000, // Check every minute
  batchSize: 100, // Process tickets in batches
  maxRetries: 3,
  alertThresholds: {
    slaBreachRate: 0.1, // Alert if >10% of tickets breach SLA
    weddingEmergencies: 1, // Alert on any wedding emergency
    avgResponseTime: 240, // Alert if avg response time > 4 hours
  },
};

// SLA Performance metrics
interface SLAMetrics {
  totalTickets: number;
  breachedTickets: number;
  breachRate: number;
  avgResponseTimeMinutes: number;
  avgResolutionTimeMinutes: number;
  weddingEmergencies: number;
  escalationsByLevel: Record<number, number>;
}

export class SLAMonitorService {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private metrics: SLAMetrics = this.initMetrics();

  private initMetrics(): SLAMetrics {
    return {
      totalTickets: 0,
      breachedTickets: 0,
      breachRate: 0,
      avgResponseTimeMinutes: 0,
      avgResolutionTimeMinutes: 0,
      weddingEmergencies: 0,
      escalationsByLevel: {},
    };
  }

  /**
   * Start the SLA monitoring service
   */
  public start(): void {
    if (this.isRunning) {
      console.log('🔍 SLA Monitor already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting SLA Monitor Service...');

    // Initial check
    this.performSLACheck().catch((error) => {
      console.error('❌ Initial SLA check failed:', error);
    });

    // Schedule regular checks
    this.intervalId = setInterval(() => {
      this.performSLACheck().catch((error) => {
        console.error('❌ Scheduled SLA check failed:', error);
      });
    }, MONITORING_CONFIG.checkIntervalMs);

    console.log(
      `✅ SLA Monitor started (checking every ${MONITORING_CONFIG.checkIntervalMs}ms)`,
    );
  }

  /**
   * Stop the SLA monitoring service
   */
  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('🛑 SLA Monitor stopped');
  }

  /**
   * Perform a comprehensive SLA check
   */
  private async performSLACheck(): Promise<void> {
    try {
      const startTime = Date.now();
      console.log('🔍 Starting SLA compliance check...');

      // Reset metrics for this check
      this.metrics = this.initMetrics();

      // Get all active tickets that need SLA monitoring
      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select(
          `
          id,
          subject,
          status,
          priority,
          created_at,
          first_response_at,
          resolved_at,
          sla_response_deadline,
          sla_resolution_deadline,
          is_wedding_day_issue,
          hours_until_wedding,
          assigned_agent_id,
          organization_id,
          user_tier,
          escalation_level,
          last_escalation_at,
          organizations!inner(name, contact_email)
        `,
        )
        .in('status', ['open', 'in_progress', 'pending_customer', 'emergency'])
        .is('resolved_at', null);

      if (error) {
        throw new Error(`Failed to fetch tickets: ${error.message}`);
      }

      this.metrics.totalTickets = tickets?.length || 0;

      // Process tickets in batches
      const batches = this.chunkArray(
        tickets || [],
        MONITORING_CONFIG.batchSize,
      );
      let totalProcessed = 0;
      let totalEscalated = 0;

      for (const batch of batches) {
        const batchResults = await this.processBatch(batch);
        totalProcessed += batchResults.processed;
        totalEscalated += batchResults.escalated;

        // Update metrics from batch results
        this.metrics.breachedTickets += batchResults.breached;
        this.metrics.weddingEmergencies += batchResults.weddingEmergencies;
      }

      // Calculate final metrics
      this.metrics.breachRate =
        this.metrics.totalTickets > 0
          ? this.metrics.breachedTickets / this.metrics.totalTickets
          : 0;

      // Update performance metrics
      await this.updatePerformanceMetrics();

      // Check for system-wide alerts
      await this.checkSystemAlerts();

      const duration = Date.now() - startTime;
      console.log(
        `✅ SLA check completed in ${duration}ms: ${totalProcessed} processed, ${totalEscalated} escalated`,
      );
    } catch (error) {
      console.error('❌ SLA check failed:', error);
      throw error;
    }
  }

  /**
   * Process a batch of tickets for SLA compliance
   */
  private async processBatch(tickets: any[]): Promise<{
    processed: number;
    escalated: number;
    breached: number;
    weddingEmergencies: number;
  }> {
    let processed = 0;
    let escalated = 0;
    let breached = 0;
    let weddingEmergencies = 0;

    const now = new Date();

    for (const ticket of tickets) {
      try {
        processed++;

        // Check for wedding day emergencies first
        const weddingCheck = this.checkWeddingDayEmergency(ticket, now);
        if (weddingCheck.isEmergency) {
          await this.handleWeddingDayEmergency(ticket, weddingCheck);
          weddingEmergencies++;
          escalated++;
          continue;
        }

        // Check regular SLA compliance
        const slaCheck = this.checkSLACompliance(ticket, now);

        if (slaCheck.isBreached) {
          breached++;
        }

        if (slaCheck.needsEscalation) {
          await this.handleSLAEscalation(ticket, slaCheck);
          escalated++;
        }
      } catch (ticketError) {
        console.error(`Error processing ticket ${ticket.id}:`, ticketError);
      }
    }

    return { processed, escalated, breached, weddingEmergencies };
  }

  /**
   * Check if ticket requires wedding day emergency handling
   */
  private checkWeddingDayEmergency(
    ticket: any,
    now: Date,
  ): {
    isEmergency: boolean;
    urgencyLevel?: 'immediate' | 'urgent';
    reason?: string;
    hoursUntilWedding?: number;
  } {
    if (!ticket.hours_until_wedding) {
      return { isEmergency: false };
    }

    const hours = ticket.hours_until_wedding;

    // Immediate emergency: wedding day or within 8 hours
    if (hours <= 8 && ticket.is_wedding_day_issue) {
      return {
        isEmergency: true,
        urgencyLevel: 'immediate',
        reason: `Wedding ceremony in ${Math.round(hours)} hours`,
        hoursUntilWedding: hours,
      };
    }

    // Urgent: wedding within 48 hours and no escalation yet
    if (hours <= 48 && ticket.escalation_level === 0) {
      return {
        isEmergency: true,
        urgencyLevel: 'urgent',
        reason: `Wedding in ${Math.round(hours)} hours - requires priority attention`,
        hoursUntilWedding: hours,
      };
    }

    return { isEmergency: false };
  }

  /**
   * Check SLA compliance for a ticket
   */
  private checkSLACompliance(
    ticket: any,
    now: Date,
  ): {
    isBreached: boolean;
    needsEscalation: boolean;
    breachType?: 'response' | 'resolution';
    timeOverdue?: number;
    escalationLevel?: number;
  } {
    // Check response SLA
    if (!ticket.first_response_at && ticket.sla_response_deadline) {
      const responseDeadline = new Date(ticket.sla_response_deadline);
      const isResponseBreached = now > responseDeadline;
      const timeOverdue = isResponseBreached
        ? Math.round((now.getTime() - responseDeadline.getTime()) / (1000 * 60))
        : 0;

      // Determine if escalation is needed
      const needsEscalation = this.shouldEscalate(
        ticket,
        'response',
        timeOverdue,
      );

      return {
        isBreached: isResponseBreached,
        needsEscalation,
        breachType: 'response',
        timeOverdue: isResponseBreached ? timeOverdue : 0,
        escalationLevel: this.calculateEscalationLevel(timeOverdue, 'response'),
      };
    }

    // Check resolution SLA
    if (!ticket.resolved_at && ticket.sla_resolution_deadline) {
      const resolutionDeadline = new Date(ticket.sla_resolution_deadline);
      const isResolutionBreached = now > resolutionDeadline;
      const timeOverdue = isResolutionBreached
        ? Math.round(
            (now.getTime() - resolutionDeadline.getTime()) / (1000 * 60),
          )
        : 0;

      const needsEscalation = this.shouldEscalate(
        ticket,
        'resolution',
        timeOverdue,
      );

      return {
        isBreached: isResolutionBreached,
        needsEscalation,
        breachType: 'resolution',
        timeOverdue: isResolutionBreached ? timeOverdue : 0,
        escalationLevel: this.calculateEscalationLevel(
          timeOverdue,
          'resolution',
        ),
      };
    }

    return { isBreached: false, needsEscalation: false };
  }

  /**
   * Determine if a ticket should be escalated
   */
  private shouldEscalate(
    ticket: any,
    breachType: string,
    timeOverdue: number,
  ): boolean {
    const currentLevel = ticket.escalation_level || 0;
    const newLevel = this.calculateEscalationLevel(timeOverdue, breachType);

    // Only escalate if we're moving to a higher level
    return newLevel > currentLevel;
  }

  /**
   * Calculate the appropriate escalation level based on time overdue
   */
  private calculateEscalationLevel(
    timeOverdue: number,
    breachType: string,
  ): number {
    // More aggressive escalation for response breaches
    const multiplier = breachType === 'response' ? 1.5 : 1;
    const adjustedOverdue = timeOverdue * multiplier;

    if (adjustedOverdue >= 240) return 4; // 4+ hours overdue = Executive alert
    if (adjustedOverdue >= 60) return 3; // 1+ hours overdue = Manager escalation
    if (adjustedOverdue >= 15) return 2; // 15+ minutes overdue = Supervisor alert
    if (adjustedOverdue > 0) return 1; // Any overdue = Agent reminder

    return 0; // Not overdue
  }

  /**
   * Handle wedding day emergency escalation
   */
  private async handleWeddingDayEmergency(
    ticket: any,
    emergency: any,
  ): Promise<void> {
    console.log(
      `🚨 WEDDING EMERGENCY: Ticket ${ticket.id} - ${emergency.reason}`,
    );

    // Update ticket to emergency status
    await supabase
      .from('support_tickets')
      .update({
        status: 'emergency',
        priority: 'critical',
        escalation_level: 999, // Special wedding day escalation
        last_escalation_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    // Log the emergency escalation
    await supabase.from('support_escalations').insert({
      ticket_id: ticket.id,
      escalation_level: 999,
      escalation_reason: emergency.reason,
      escalation_type: 'wedding_day_emergency',
      triggered_by: 'sla_monitor',
      urgency_level: emergency.urgencyLevel,
      hours_until_wedding: emergency.hoursUntilWedding,
      created_at: new Date().toISOString(),
    });

    // Send immediate notifications to all wedding specialists
    await this.notifyWeddingSpecialists(ticket, emergency);

    // Create executive alert for immediate emergencies
    if (emergency.urgencyLevel === 'immediate') {
      await this.createExecutiveAlert(ticket, emergency);
    }
  }

  /**
   * Handle regular SLA escalation
   */
  private async handleSLAEscalation(ticket: any, slaCheck: any): Promise<void> {
    console.log(
      `📈 SLA ESCALATION: Ticket ${ticket.id} to level ${slaCheck.escalationLevel}`,
    );

    // Update ticket escalation
    await supabase
      .from('support_tickets')
      .update({
        escalation_level: slaCheck.escalationLevel,
        last_escalation_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    // Log escalation
    await supabase.from('support_escalations').insert({
      ticket_id: ticket.id,
      escalation_level: slaCheck.escalationLevel,
      escalation_reason: `${slaCheck.breachType.toUpperCase()} SLA breach: ${slaCheck.timeOverdue} minutes overdue`,
      escalation_type: 'sla_based',
      triggered_by: 'sla_monitor',
      breach_type: slaCheck.breachType,
      minutes_overdue: slaCheck.timeOverdue,
      created_at: new Date().toISOString(),
    });

    // Send appropriate notifications based on escalation level
    await this.sendEscalationNotifications(ticket, slaCheck);

    // Update metrics
    this.metrics.escalationsByLevel[slaCheck.escalationLevel] =
      (this.metrics.escalationsByLevel[slaCheck.escalationLevel] || 0) + 1;
  }

  /**
   * Send notifications for wedding specialist alerts
   */
  private async notifyWeddingSpecialists(
    ticket: any,
    emergency: any,
  ): Promise<void> {
    const { data: specialists } = await supabase
      .from('support_agents')
      .select('user_id, notification_preferences')
      .eq('organization_id', ticket.organization_id)
      .eq('is_wedding_day_specialist', true)
      .eq('is_available', true);

    const urgencyText =
      emergency.urgencyLevel === 'immediate' ? 'EMERGENCY' : 'URGENT';
    const message = `🚨 ${urgencyText}: Wedding ticket #${ticket.id} - ${emergency.reason}`;

    for (const specialist of specialists || []) {
      await supabase.from('notifications').insert({
        user_id: specialist.user_id,
        type: 'wedding_emergency',
        title: `Wedding Day ${urgencyText}`,
        message,
        data: {
          ticket_id: ticket.id,
          urgency_level: emergency.urgencyLevel,
          hours_until_wedding: emergency.hoursUntilWedding,
        },
        created_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Create executive alert for critical issues
   */
  private async createExecutiveAlert(
    ticket: any,
    emergency: any,
  ): Promise<void> {
    const { data: executives } = await supabase
      .from('support_agents')
      .select('user_id')
      .eq('organization_id', ticket.organization_id)
      .in('role', ['executive', 'ceo', 'owner']);

    for (const exec of executives || []) {
      await supabase.from('notifications').insert({
        user_id: exec.user_id,
        type: 'executive_alert',
        title: 'CRITICAL: Wedding Day Emergency',
        message: `Immediate attention required: Wedding emergency ticket #${ticket.id}. Customer wedding at risk.`,
        data: {
          ticket_id: ticket.id,
          executive_required: true,
          hours_until_wedding: emergency.hoursUntilWedding,
        },
        created_at: new Date().toISOString(),
      });
    }
  }

  /**
   * Send escalation notifications based on level
   */
  private async sendEscalationNotifications(
    ticket: any,
    slaCheck: any,
  ): Promise<void> {
    const level = slaCheck.escalationLevel;
    const roles = [];

    if (level >= 1) roles.push('agent');
    if (level >= 2) roles.push('supervisor');
    if (level >= 3) roles.push('manager');
    if (level >= 4) roles.push('executive');

    for (const role of roles) {
      const { data: agents } = await supabase
        .from('support_agents')
        .select('user_id')
        .eq('organization_id', ticket.organization_id)
        .eq('role', role);

      const notificationType = level >= 3 ? 'sla_breach' : 'ticket_escalation';
      const title = level >= 3 ? 'SLA Breach Alert' : 'Ticket Escalation';

      for (const agent of agents || []) {
        await supabase.from('notifications').insert({
          user_id: agent.user_id,
          type: notificationType,
          title,
          message: `Ticket #${ticket.id} escalated to level ${level} - ${slaCheck.timeOverdue} minutes overdue`,
          data: {
            ticket_id: ticket.id,
            escalation_level: level,
            breach_type: slaCheck.breachType,
            minutes_overdue: slaCheck.timeOverdue,
          },
          created_at: new Date().toISOString(),
        });
      }
    }
  }

  /**
   * Update system performance metrics
   */
  private async updatePerformanceMetrics(): Promise<void> {
    try {
      // Calculate average response and resolution times
      const { data: responseTimes } = await supabase.rpc(
        'calculate_avg_response_time',
        { days: 7 },
      );

      const { data: resolutionTimes } = await supabase.rpc(
        'calculate_avg_resolution_time',
        { days: 7 },
      );

      if (responseTimes?.[0]) {
        this.metrics.avgResponseTimeMinutes =
          responseTimes[0].avg_response_minutes || 0;
      }

      if (resolutionTimes?.[0]) {
        this.metrics.avgResolutionTimeMinutes =
          resolutionTimes[0].avg_resolution_minutes || 0;
      }

      // Store metrics snapshot
      await supabase.from('sla_monitoring_snapshots').insert({
        total_tickets: this.metrics.totalTickets,
        breached_tickets: this.metrics.breachedTickets,
        breach_rate: this.metrics.breachRate,
        avg_response_time_minutes: this.metrics.avgResponseTimeMinutes,
        avg_resolution_time_minutes: this.metrics.avgResolutionTimeMinutes,
        wedding_emergencies: this.metrics.weddingEmergencies,
        escalations_by_level: this.metrics.escalationsByLevel,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating performance metrics:', error);
    }
  }

  /**
   * Check for system-wide alerts
   */
  private async checkSystemAlerts(): Promise<void> {
    const thresholds = MONITORING_CONFIG.alertThresholds;

    // Alert if SLA breach rate is too high
    if (this.metrics.breachRate > thresholds.slaBreachRate) {
      await this.createSystemAlert(
        'high_breach_rate',
        `SLA breach rate is ${(this.metrics.breachRate * 100).toFixed(1)}% (threshold: ${thresholds.slaBreachRate * 100}%)`,
      );
    }

    // Alert on any wedding emergencies
    if (this.metrics.weddingEmergencies > thresholds.weddingEmergencies) {
      await this.createSystemAlert(
        'wedding_emergencies',
        `${this.metrics.weddingEmergencies} wedding day emergencies detected`,
      );
    }

    // Alert if average response time is too high
    if (this.metrics.avgResponseTimeMinutes > thresholds.avgResponseTime) {
      await this.createSystemAlert(
        'slow_response_time',
        `Average response time is ${Math.round(this.metrics.avgResponseTimeMinutes)} minutes (threshold: ${thresholds.avgResponseTime})`,
      );
    }
  }

  /**
   * Create system-wide alert
   */
  private async createSystemAlert(
    type: string,
    message: string,
  ): Promise<void> {
    await supabase.from('system_alerts').insert({
      alert_type: type,
      severity: 'high',
      message,
      metrics: this.metrics,
      created_at: new Date().toISOString(),
    });

    console.warn(`🚨 SYSTEM ALERT [${type}]: ${message}`);
  }

  /**
   * Utility function to chunk arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get current metrics
   */
  public getMetrics(): SLAMetrics {
    return { ...this.metrics };
  }

  /**
   * Get service status
   */
  public getStatus(): {
    isRunning: boolean;
    uptime: number;
    lastCheck: Date;
    metrics: SLAMetrics;
  } {
    return {
      isRunning: this.isRunning,
      uptime: this.intervalId ? Date.now() : 0,
      lastCheck: new Date(),
      metrics: this.metrics,
    };
  }
}

// Export singleton instance
export const slaMonitor = new SLAMonitorService();

// Auto-start in production
if (
  process.env.NODE_ENV === 'production' &&
  process.env.ENABLE_SLA_MONITORING === 'true'
) {
  slaMonitor.start();

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down SLA Monitor...');
    slaMonitor.stop();
    process.exit(0);
  });
}
