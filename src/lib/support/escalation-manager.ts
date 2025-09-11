/**
 * Escalation Manager Service
 * WS-235: Support Operations Ticket Management System
 *
 * Comprehensive escalation workflow system that handles:
 * - Automatic SLA-based escalations
 * - Wedding emergency priority escalations
 * - Tier-based escalation rules
 * - Manual escalation workflows
 * - Priority upgrade algorithms
 * - Escalation notifications and routing
 */

import { supabase } from '@/lib/supabase';
import { slaMonitor } from './sla-monitor';
import { ticketRouter } from './ticket-router';

// Types for escalation system
export interface EscalationRule {
  id: string;
  name: string;
  triggerType:
    | 'sla_breach'
    | 'manual'
    | 'time_based'
    | 'priority_based'
    | 'wedding_emergency';
  conditions: EscalationCondition[];
  actions: EscalationAction[];
  isActive: boolean;
  priority: number;
  userTiers: string[];
  categories: string[];
}

export interface EscalationCondition {
  type:
    | 'sla_breach_percentage'
    | 'time_elapsed'
    | 'message_count'
    | 'escalation_level'
    | 'priority'
    | 'user_tier'
    | 'wedding_emergency';
  operator: 'greater_than' | 'less_than' | 'equals' | 'not_equals' | 'contains';
  value: any;
  field?: string;
}

export interface EscalationAction {
  type:
    | 'increase_priority'
    | 'increase_escalation_level'
    | 'reassign_agent'
    | 'notify_management'
    | 'create_internal_note'
    | 'send_sms'
    | 'send_email';
  parameters: Record<string, any>;
  delay?: number; // milliseconds
}

export interface EscalationEvent {
  id: string;
  ticketId: string;
  escalationType: 'automatic' | 'manual';
  escalationRule: string;
  fromLevel: number;
  toLevel: number;
  fromPriority: string;
  toPriority: string;
  reason: string;
  triggeredBy?: string; // user_id for manual escalations
  createdAt: Date;
  processedAt?: Date;
  success: boolean;
  errorMessage?: string;
  actions: ProcessedAction[];
}

export interface ProcessedAction {
  actionType: string;
  success: boolean;
  result?: any;
  errorMessage?: string;
  executedAt: Date;
}

export interface EscalationNotification {
  ticketId: string;
  escalationLevel: number;
  priority: string;
  reason: string;
  isWeddingEmergency: boolean;
  recipients: NotificationRecipient[];
  channels: ('email' | 'sms' | 'slack' | 'internal')[];
}

export interface NotificationRecipient {
  userId: string;
  role: string;
  contactMethod: string;
}

export class EscalationManager {
  private rules: Map<string, EscalationRule> = new Map();
  private processingQueue: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.loadEscalationRules();
  }

  /**
   * Process automatic escalation for a ticket based on current conditions
   */
  async processAutomaticEscalation(
    ticketId: string,
  ): Promise<EscalationEvent | null> {
    try {
      console.log(`Processing automatic escalation for ticket ${ticketId}`);

      // Get ticket details
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select(
          `
          *,
          user_profiles!support_tickets_user_id_fkey (
            user_tier,
            full_name,
            email
          ),
          support_agents!support_tickets_assigned_agent_id_fkey (
            full_name,
            specialties,
            wedding_expertise_level
          )
        `,
        )
        .eq('id', ticketId)
        .single();

      if (error || !ticket) {
        console.error(`Ticket not found: ${ticketId}`);
        return null;
      }

      // Skip if already at maximum escalation level
      if (ticket.escalation_level >= 3) {
        return null;
      }

      // Get SLA status
      const slaStatus = await slaMonitor.getTicketSLAStatus(ticketId);

      // Find applicable escalation rules
      const applicableRules = await this.findApplicableRules(ticket, slaStatus);

      if (applicableRules.length === 0) {
        return null;
      }

      // Sort by priority (higher priority first)
      applicableRules.sort((a, b) => b.priority - a.priority);

      // Process the highest priority rule
      const rule = applicableRules[0];
      return await this.executeEscalation(ticket, rule, slaStatus, 'automatic');
    } catch (error) {
      console.error('Error processing automatic escalation:', error);
      return null;
    }
  }

  /**
   * Process manual escalation requested by an agent or administrator
   */
  async processManualEscalation(
    ticketId: string,
    requestedBy: string,
    targetLevel: number,
    reason: string,
    priorityOverride?: string,
  ): Promise<EscalationEvent | null> {
    try {
      console.log(
        `Processing manual escalation for ticket ${ticketId} by ${requestedBy}`,
      );

      // Get ticket details
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select(
          `
          *,
          user_profiles!support_tickets_user_id_fkey (
            user_tier,
            full_name,
            email
          )
        `,
        )
        .eq('id', ticketId)
        .single();

      if (error || !ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      // Validate escalation level
      if (targetLevel <= ticket.escalation_level || targetLevel > 3) {
        throw new Error(`Invalid escalation level: ${targetLevel}`);
      }

      // Check permissions
      const hasPermission = await this.checkEscalationPermission(
        requestedBy,
        ticket,
        targetLevel,
      );
      if (!hasPermission) {
        throw new Error('Insufficient permissions for escalation');
      }

      // Create manual escalation rule
      const manualRule: EscalationRule = {
        id: `manual_${Date.now()}`,
        name: 'Manual Escalation',
        triggerType: 'manual',
        conditions: [],
        actions: [
          {
            type: 'increase_escalation_level',
            parameters: { targetLevel },
          },
          {
            type: 'create_internal_note',
            parameters: {
              message: `Manual escalation to level ${targetLevel}: ${reason}`,
            },
          },
          {
            type: 'notify_management',
            parameters: { reason, requestedBy },
          },
        ],
        isActive: true,
        priority: 100,
        userTiers: [],
        categories: [],
      };

      // Add priority override if specified
      if (priorityOverride) {
        manualRule.actions.unshift({
          type: 'increase_priority',
          parameters: { targetPriority: priorityOverride },
        });
      }

      // Execute escalation
      return await this.executeEscalation(
        ticket,
        manualRule,
        null,
        'manual',
        requestedBy,
      );
    } catch (error) {
      console.error('Error processing manual escalation:', error);
      throw error;
    }
  }

  /**
   * Handle wedding day emergency escalation (immediate to level 3)
   */
  async processWeddingEmergencyEscalation(
    ticketId: string,
    reason: string = 'Wedding day emergency',
  ): Promise<EscalationEvent | null> {
    try {
      console.log(
        `Processing wedding emergency escalation for ticket ${ticketId}`,
      );

      // Get ticket details
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error || !ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      // Create wedding emergency escalation rule
      const emergencyRule: EscalationRule = {
        id: `wedding_emergency_${Date.now()}`,
        name: 'Wedding Emergency Escalation',
        triggerType: 'wedding_emergency',
        conditions: [],
        actions: [
          {
            type: 'increase_escalation_level',
            parameters: { targetLevel: 3 },
          },
          {
            type: 'increase_priority',
            parameters: { targetPriority: 'critical' },
          },
          {
            type: 'reassign_agent',
            parameters: {
              requireWeddingSpecialist: true,
              minExpertiseLevel: 'specialist',
            },
          },
          {
            type: 'notify_management',
            parameters: {
              urgent: true,
              channels: ['email', 'sms', 'slack'],
            },
          },
          {
            type: 'send_sms',
            parameters: {
              message: `WEDDING EMERGENCY: Ticket ${ticket.smart_ticket_id} requires immediate attention`,
            },
          },
        ],
        isActive: true,
        priority: 1000,
        userTiers: [],
        categories: [],
      };

      return await this.executeEscalation(
        ticket,
        emergencyRule,
        null,
        'automatic',
      );
    } catch (error) {
      console.error('Error processing wedding emergency escalation:', error);
      throw error;
    }
  }

  /**
   * Find escalation rules that apply to the current ticket state
   */
  private async findApplicableRules(
    ticket: any,
    slaStatus: any,
  ): Promise<EscalationRule[]> {
    const applicableRules: EscalationRule[] = [];

    for (const [ruleId, rule] of this.rules) {
      if (!rule.isActive) continue;

      // Check if rule applies to this ticket's user tier
      if (
        rule.userTiers.length > 0 &&
        !rule.userTiers.includes(ticket.user_profiles?.user_tier)
      ) {
        continue;
      }

      // Check if rule applies to this ticket's category
      if (
        rule.categories.length > 0 &&
        !rule.categories.includes(ticket.category)
      ) {
        continue;
      }

      // Check all conditions
      const conditionsMet = rule.conditions.every((condition) =>
        this.evaluateCondition(condition, ticket, slaStatus),
      );

      if (conditionsMet) {
        applicableRules.push(rule);
      }
    }

    return applicableRules;
  }

  /**
   * Evaluate a single escalation condition
   */
  private evaluateCondition(
    condition: EscalationCondition,
    ticket: any,
    slaStatus: any,
  ): boolean {
    let actualValue: any;

    switch (condition.type) {
      case 'sla_breach_percentage':
        actualValue = slaStatus
          ? Math.max(
              slaStatus.responseTimeUsed || 0,
              slaStatus.resolutionTimeUsed || 0,
            )
          : 0;
        break;

      case 'time_elapsed':
        actualValue = Date.now() - new Date(ticket.created_at).getTime();
        break;

      case 'escalation_level':
        actualValue = ticket.escalation_level;
        break;

      case 'priority':
        actualValue = ticket.priority;
        break;

      case 'user_tier':
        actualValue = ticket.user_profiles?.user_tier;
        break;

      case 'wedding_emergency':
        actualValue = ticket.is_wedding_emergency;
        break;

      case 'message_count':
        // This would need to be passed in or fetched
        actualValue = 0; // Placeholder
        break;

      default:
        return false;
    }

    // Evaluate condition based on operator
    switch (condition.operator) {
      case 'greater_than':
        return actualValue > condition.value;
      case 'less_than':
        return actualValue < condition.value;
      case 'equals':
        return actualValue === condition.value;
      case 'not_equals':
        return actualValue !== condition.value;
      case 'contains':
        return Array.isArray(actualValue)
          ? actualValue.includes(condition.value)
          : String(actualValue).includes(condition.value);
      default:
        return false;
    }
  }

  /**
   * Execute an escalation rule and perform all associated actions
   */
  private async executeEscalation(
    ticket: any,
    rule: EscalationRule,
    slaStatus: any,
    escalationType: 'automatic' | 'manual',
    triggeredBy?: string,
  ): Promise<EscalationEvent> {
    const startTime = new Date();
    const processedActions: ProcessedAction[] = [];

    let newEscalationLevel = ticket.escalation_level;
    let newPriority = ticket.priority;

    try {
      console.log(
        `Executing escalation rule "${rule.name}" for ticket ${ticket.smart_ticket_id}`,
      );

      // Process each action in sequence
      for (const action of rule.actions) {
        try {
          // Add delay if specified
          if (action.delay && action.delay > 0) {
            await new Promise((resolve) => setTimeout(resolve, action.delay));
          }

          const result = await this.executeAction(action, ticket, slaStatus);

          processedActions.push({
            actionType: action.type,
            success: true,
            result,
            executedAt: new Date(),
          });

          // Track changes for event record
          if (action.type === 'increase_escalation_level') {
            newEscalationLevel =
              action.parameters.targetLevel || ticket.escalation_level + 1;
          }
          if (action.type === 'increase_priority') {
            newPriority =
              action.parameters.targetPriority ||
              this.getNextPriorityLevel(ticket.priority);
          }
        } catch (actionError) {
          console.error(
            `Failed to execute action ${action.type}:`,
            actionError,
          );
          processedActions.push({
            actionType: action.type,
            success: false,
            errorMessage:
              actionError instanceof Error
                ? actionError.message
                : 'Unknown error',
            executedAt: new Date(),
          });
        }
      }

      // Create escalation event record
      const escalationEvent: EscalationEvent = {
        id: `escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ticketId: ticket.id,
        escalationType,
        escalationRule: rule.name,
        fromLevel: ticket.escalation_level,
        toLevel: newEscalationLevel,
        fromPriority: ticket.priority,
        toPriority: newPriority,
        reason: this.generateEscalationReason(rule, slaStatus),
        triggeredBy,
        createdAt: startTime,
        processedAt: new Date(),
        success: processedActions.every((action) => action.success),
        actions: processedActions,
      };

      // Record escalation in database
      await this.recordEscalationEvent(escalationEvent);

      console.log(
        `Escalation completed for ticket ${ticket.smart_ticket_id}: ${ticket.escalation_level} → ${newEscalationLevel}`,
      );

      return escalationEvent;
    } catch (error) {
      console.error('Error executing escalation:', error);

      // Create failed escalation event
      const escalationEvent: EscalationEvent = {
        id: `escalation_failed_${Date.now()}`,
        ticketId: ticket.id,
        escalationType,
        escalationRule: rule.name,
        fromLevel: ticket.escalation_level,
        toLevel: ticket.escalation_level,
        fromPriority: ticket.priority,
        toPriority: ticket.priority,
        reason: 'Escalation failed',
        triggeredBy,
        createdAt: startTime,
        processedAt: new Date(),
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        actions: processedActions,
      };

      await this.recordEscalationEvent(escalationEvent);
      throw error;
    }
  }

  /**
   * Execute a single escalation action
   */
  private async executeAction(
    action: EscalationAction,
    ticket: any,
    slaStatus: any,
  ): Promise<any> {
    switch (action.type) {
      case 'increase_escalation_level':
        return await this.increaseEscalationLevel(ticket, action.parameters);

      case 'increase_priority':
        return await this.increasePriority(ticket, action.parameters);

      case 'reassign_agent':
        return await this.reassignAgent(ticket, action.parameters);

      case 'notify_management':
        return await this.notifyManagement(ticket, action.parameters);

      case 'create_internal_note':
        return await this.createInternalNote(ticket, action.parameters);

      case 'send_sms':
        return await this.sendSMSNotification(ticket, action.parameters);

      case 'send_email':
        return await this.sendEmailNotification(ticket, action.parameters);

      default:
        console.warn(`Unknown escalation action type: ${action.type}`);
        return null;
    }
  }

  /**
   * Increase escalation level
   */
  private async increaseEscalationLevel(
    ticket: any,
    parameters: any,
  ): Promise<any> {
    const targetLevel =
      parameters.targetLevel || Math.min(3, ticket.escalation_level + 1);

    const { error } = await supabase
      .from('support_tickets')
      .update({
        escalation_level: targetLevel,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    if (error) throw error;

    // Record SLA event
    await supabase.from('ticket_sla_events').insert({
      ticket_id: ticket.id,
      event_type: 'escalation',
      event_data: {
        from_level: ticket.escalation_level,
        to_level: targetLevel,
        reason: parameters.reason || 'Automatic escalation',
      },
      notes: `Escalated from level ${ticket.escalation_level} to ${targetLevel}`,
    });

    return { from: ticket.escalation_level, to: targetLevel };
  }

  /**
   * Increase priority level
   */
  private async increasePriority(ticket: any, parameters: any): Promise<any> {
    const targetPriority =
      parameters.targetPriority || this.getNextPriorityLevel(ticket.priority);

    const { error } = await supabase
      .from('support_tickets')
      .update({
        priority: targetPriority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);

    if (error) throw error;

    return { from: ticket.priority, to: targetPriority };
  }

  /**
   * Reassign to appropriate agent based on escalation level
   */
  private async reassignAgent(ticket: any, parameters: any): Promise<any> {
    try {
      // Use ticket router to find appropriate agent
      const routingResult = await ticketRouter.routeTicket({
        ticketId: ticket.id,
        classification: {
          category: ticket.category,
          type: ticket.type,
          priority: ticket.priority,
          vendorType: ticket.vendor_type,
          tags: ticket.tags || [],
          confidence: 1.0,
          method: 'pattern_match',
          isWeddingEmergency: ticket.is_wedding_emergency,
          urgencyScore: ticket.urgency_score || 5,
        },
        userTier: ticket.user_profiles?.user_tier || 'free',
        vendorType: ticket.vendor_type,
        priority: ticket.priority,
        isWeddingEmergency: ticket.is_wedding_emergency,
        escalationLevel: ticket.escalation_level + 1, // Use new escalation level
        tags: ticket.tags || [],
      });

      return routingResult;
    } catch (error) {
      console.error('Failed to reassign agent during escalation:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify management of escalation
   */
  private async notifyManagement(ticket: any, parameters: any): Promise<any> {
    try {
      // Get management team members
      const { data: managers, error } = await supabase
        .from('user_profiles')
        .select('user_id, full_name, email, phone_number')
        .in('role', ['admin', 'supervisor', 'manager'])
        .eq('receive_escalation_alerts', true);

      if (error) throw error;

      const notifications: EscalationNotification = {
        ticketId: ticket.id,
        escalationLevel: ticket.escalation_level + 1,
        priority: ticket.priority,
        reason: parameters.reason || 'Automatic escalation',
        isWeddingEmergency: ticket.is_wedding_emergency,
        recipients: (managers || []).map((manager) => ({
          userId: manager.user_id,
          role: 'manager',
          contactMethod: manager.email,
        })),
        channels: parameters.channels || ['email'],
      };

      // TODO: Implement actual notification sending
      console.log('Management notifications would be sent:', notifications);

      return { notified: notifications.recipients.length };
    } catch (error) {
      console.error('Failed to notify management:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create internal note
   */
  private async createInternalNote(ticket: any, parameters: any): Promise<any> {
    const { error } = await supabase.from('ticket_messages').insert({
      ticket_id: ticket.id,
      message_content: parameters.message || 'Ticket escalated automatically',
      message_type: 'note',
      is_internal: true,
      author_type: 'system',
      author_id: null,
    });

    if (error) throw error;

    return { message: 'Internal note created' };
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(
    ticket: any,
    parameters: any,
  ): Promise<any> {
    // TODO: Implement SMS sending via Twilio
    console.log(`SMS notification would be sent: ${parameters.message}`);
    return { message: 'SMS notification sent (placeholder)' };
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(
    ticket: any,
    parameters: any,
  ): Promise<any> {
    // TODO: Implement email sending via Resend
    console.log(`Email notification would be sent: ${parameters.message}`);
    return { message: 'Email notification sent (placeholder)' };
  }

  /**
   * Get next priority level for escalation
   */
  private getNextPriorityLevel(currentPriority: string): string {
    const priorityOrder = ['low', 'medium', 'high', 'critical'];
    const currentIndex = priorityOrder.indexOf(currentPriority);

    if (currentIndex < priorityOrder.length - 1) {
      return priorityOrder[currentIndex + 1];
    }

    return currentPriority; // Already at highest priority
  }

  /**
   * Generate escalation reason based on rule and conditions
   */
  private generateEscalationReason(
    rule: EscalationRule,
    slaStatus: any,
  ): string {
    switch (rule.triggerType) {
      case 'sla_breach':
        const breachType = slaStatus?.isResponseBreached
          ? 'response'
          : 'resolution';
        const percentage = slaStatus
          ? Math.max(
              slaStatus.responseTimeUsed || 0,
              slaStatus.resolutionTimeUsed || 0,
            ).toFixed(0)
          : '100';
        return `SLA ${breachType} deadline exceeded (${percentage}% used)`;

      case 'wedding_emergency':
        return 'Wedding day emergency requiring immediate attention';

      case 'manual':
        return 'Manual escalation by support agent';

      case 'time_based':
        return 'Escalated due to time elapsed without resolution';

      default:
        return `Escalated by rule: ${rule.name}`;
    }
  }

  /**
   * Check if user has permission to escalate to target level
   */
  private async checkEscalationPermission(
    userId: string,
    ticket: any,
    targetLevel: number,
  ): Promise<boolean> {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('role, permissions')
        .eq('user_id', userId)
        .single();

      if (error || !profile) return false;

      // Admin can escalate to any level
      if (profile.role === 'admin') return true;

      // Support agents can escalate to level 1-2
      if (profile.role === 'support_agent' && targetLevel <= 2) return true;

      // Supervisors can escalate to level 1-3
      if (profile.role === 'supervisor') return true;

      return false;
    } catch (error) {
      console.error('Error checking escalation permission:', error);
      return false;
    }
  }

  /**
   * Record escalation event in database
   */
  private async recordEscalationEvent(event: EscalationEvent): Promise<void> {
    try {
      await supabase.from('ticket_sla_events').insert({
        ticket_id: event.ticketId,
        event_type: 'escalation_processed',
        event_data: {
          escalation_type: event.escalationType,
          rule_name: event.escalationRule,
          from_level: event.fromLevel,
          to_level: event.toLevel,
          from_priority: event.fromPriority,
          to_priority: event.toPriority,
          success: event.success,
          actions: event.actions,
        },
        notes: event.reason,
        agent_id: event.triggeredBy,
      });
    } catch (error) {
      console.error('Failed to record escalation event:', error);
    }
  }

  /**
   * Load escalation rules from database
   */
  private async loadEscalationRules(): Promise<void> {
    try {
      // Load from database when implemented
      // For now, use built-in rules
      this.addBuiltinEscalationRules();

      console.log(`Loaded ${this.rules.size} escalation rules`);
    } catch (error) {
      console.error('Failed to load escalation rules:', error);
      this.addBuiltinEscalationRules();
    }
  }

  /**
   * Add built-in escalation rules
   */
  private addBuiltinEscalationRules(): void {
    const builtinRules: EscalationRule[] = [
      // SLA Response Breach - Level 1
      {
        id: 'sla_response_breach_l1',
        name: 'SLA Response Breach - Level 1',
        triggerType: 'sla_breach',
        conditions: [
          {
            type: 'sla_breach_percentage',
            operator: 'greater_than',
            value: 100,
          },
          { type: 'escalation_level', operator: 'equals', value: 0 },
        ],
        actions: [
          { type: 'increase_escalation_level', parameters: { targetLevel: 1 } },
          {
            type: 'notify_management',
            parameters: { reason: 'Response SLA breach' },
          },
          {
            type: 'create_internal_note',
            parameters: {
              message: 'Escalated to Level 1 due to response SLA breach',
            },
          },
        ],
        isActive: true,
        priority: 80,
        userTiers: [],
        categories: [],
      },

      // SLA Resolution Breach - Level 2
      {
        id: 'sla_resolution_breach_l2',
        name: 'SLA Resolution Breach - Level 2',
        triggerType: 'sla_breach',
        conditions: [
          {
            type: 'sla_breach_percentage',
            operator: 'greater_than',
            value: 150,
          },
          { type: 'escalation_level', operator: 'equals', value: 1 },
        ],
        actions: [
          { type: 'increase_escalation_level', parameters: { targetLevel: 2 } },
          { type: 'increase_priority', parameters: {} },
          {
            type: 'reassign_agent',
            parameters: { minExpertiseLevel: 'expert' },
          },
          { type: 'notify_management', parameters: { urgent: true } },
        ],
        isActive: true,
        priority: 90,
        userTiers: [],
        categories: [],
      },

      // Enterprise Tier Priority
      {
        id: 'enterprise_priority_escalation',
        name: 'Enterprise Tier Priority Escalation',
        triggerType: 'time_based',
        conditions: [
          { type: 'user_tier', operator: 'equals', value: 'enterprise' },
          {
            type: 'time_elapsed',
            operator: 'greater_than',
            value: 30 * 60 * 1000,
          }, // 30 minutes
          { type: 'escalation_level', operator: 'equals', value: 0 },
        ],
        actions: [
          { type: 'increase_escalation_level', parameters: { targetLevel: 1 } },
          {
            type: 'reassign_agent',
            parameters: { requireWeddingSpecialist: true },
          },
        ],
        isActive: true,
        priority: 70,
        userTiers: ['enterprise'],
        categories: [],
      },

      // Wedding Emergency Immediate Escalation
      {
        id: 'wedding_emergency_immediate',
        name: 'Wedding Emergency Immediate Escalation',
        triggerType: 'wedding_emergency',
        conditions: [
          { type: 'wedding_emergency', operator: 'equals', value: true },
        ],
        actions: [
          { type: 'increase_escalation_level', parameters: { targetLevel: 3 } },
          {
            type: 'increase_priority',
            parameters: { targetPriority: 'critical' },
          },
          {
            type: 'reassign_agent',
            parameters: {
              requireWeddingSpecialist: true,
              minExpertiseLevel: 'specialist',
            },
          },
          {
            type: 'notify_management',
            parameters: {
              urgent: true,
              channels: ['email', 'sms'],
            },
          },
          {
            type: 'send_sms',
            parameters: {
              message: 'WEDDING EMERGENCY: Immediate attention required',
            },
          },
        ],
        isActive: true,
        priority: 1000,
        userTiers: [],
        categories: [],
      },
    ];

    builtinRules.forEach((rule) => {
      this.rules.set(rule.id, rule);
    });
  }

  /**
   * Get escalation statistics for monitoring
   */
  async getEscalationMetrics(): Promise<any> {
    try {
      const { data: events, error } = await supabase
        .from('ticket_sla_events')
        .select('*')
        .eq('event_type', 'escalation_processed')
        .gte(
          'created_at',
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        );

      if (error) throw error;

      const metrics = {
        totalEscalations: events?.length || 0,
        automaticEscalations:
          events?.filter((e) => e.event_data?.escalation_type === 'automatic')
            .length || 0,
        manualEscalations:
          events?.filter((e) => e.event_data?.escalation_type === 'manual')
            .length || 0,
        weddingEmergencies:
          events?.filter((e) =>
            e.event_data?.rule_name?.includes('Wedding Emergency'),
          ).length || 0,
        slaBreaches:
          events?.filter((e) => e.event_data?.rule_name?.includes('SLA'))
            .length || 0,
        successRate:
          events?.length > 0
            ? (events.filter((e) => e.event_data?.success).length /
                events.length) *
              100
            : 0,
      };

      return metrics;
    } catch (error) {
      console.error('Error getting escalation metrics:', error);
      return {
        totalEscalations: 0,
        automaticEscalations: 0,
        manualEscalations: 0,
        weddingEmergencies: 0,
        slaBreaches: 0,
        successRate: 0,
      };
    }
  }
}

// Singleton instance for global use
export const escalationManager = new EscalationManager();

export default EscalationManager;
