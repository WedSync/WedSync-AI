/**
 * Comprehensive Ticket Management System
 * WS-235: Support Operations Ticket Management System
 *
 * Main orchestrator that coordinates:
 * - AI classification
 * - SLA monitoring
 * - Automatic routing and assignment
 * - Response management
 * - Escalation workflows
 * - Wedding industry specific handling
 */

import { supabase } from '@/lib/supabase';
import {
  AITicketClassifier,
  type ClassificationRequest,
  type TicketClassification,
} from './ai-classifier';
import { SLAMonitor, type SLAConfig } from './sla-monitor';

// Core ticket interfaces
export interface Ticket {
  id: string;
  userId: string;
  userType: 'supplier' | 'couple';
  userTier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';

  subject: string;
  description: string;
  attachments: Attachment[];

  type:
    | 'bug'
    | 'question'
    | 'feature_request'
    | 'billing'
    | 'onboarding'
    | 'technical';
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status:
    | 'open'
    | 'in_progress'
    | 'waiting_customer'
    | 'waiting_internal'
    | 'resolved'
    | 'closed';

  assignedTo: string | null;
  assignedTeam: string | null;
  assignedAt: Date | null;

  createdAt: Date;
  firstResponseAt: Date | null;
  lastUpdateAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;

  slaFirstResponseMinutes: number;
  slaResolutionMinutes: number;
  slaFirstResponseDeadline: Date;
  slaResolutionDeadline: Date;
  slaBreach: boolean;

  escalationLevel: number;
  escalatedAt: Date | null;
  escalationReason: string | null;

  satisfactionRating: number | null;
  satisfactionFeedback: string | null;

  weddingDate: Date | null;
  vendorType: string | null;
  isWeddingDayEmergency: boolean;
  urgencyScore: number;

  tags: string[];
  source: 'web' | 'email' | 'chat' | 'api';
  metadata: Record<string, any>;

  relatedTickets: string[];
  duplicateOf: string | null;
}

export interface CreateTicketRequest {
  userId: string;
  userType: 'supplier' | 'couple';
  subject: string;
  description: string;
  attachments?: Attachment[];
  source?: 'web' | 'email' | 'chat' | 'api';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  weddingDate?: Date;
  browserInfo?: string;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  url: string;
  uploadedAt: Date;
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderType: 'customer' | 'agent' | 'system';
  senderId: string | null;
  senderName: string;
  message: string;
  messageType: 'reply' | 'note' | 'status_change' | 'assignment';
  attachments: Attachment[];
  isInternal: boolean;
  isAutomated: boolean;
  templateUsed: string | null;
  createdAt: Date;
  editedAt: Date | null;
  statusChangeFrom: string | null;
  statusChangeTo: string | null;
  emailSent: boolean;
  readByCustomer: boolean;
  readAt: Date | null;
}

export interface SupportAgent {
  id: string;
  userId: string;
  agentName: string;
  email: string;
  skills: string[];
  languages: string[];
  expertiseLevel: number;
  team: string;
  timezone: string;
  workingHours: { start: string; end: string };
  maxConcurrentTickets: number;
  currentTicketCount: number;
  totalTicketsHandled: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  satisfactionScore: number | null;
  status: 'active' | 'busy' | 'away' | 'offline';
  lastActive: Date;
}

export interface TicketMetrics {
  overview: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    avgFirstResponseTime: number;
    avgResolutionTime: number;
    satisfactionScore: number;
    resolutionRate: number;
  };
  byPriority: Record<string, number>;
  byCategory: Record<string, number>;
  trends: {
    volumeTrend: Array<{ date: string; count: number }>;
    responseTrend: Array<{ date: string; avgMinutes: number }>;
    satisfactionTrend: Array<{ date: string; score: number }>;
  };
  agentMetrics: Array<{
    agentId: string;
    agentName: string;
    ticketsHandled: number;
    avgResponseTime: number;
    satisfactionScore: number;
  }>;
}

export class TicketManager {
  private static instance: TicketManager;
  private aiClassifier: AITicketClassifier;
  private slaMonitor: SLAMonitor;

  static getInstance(): TicketManager {
    if (!TicketManager.instance) {
      TicketManager.instance = new TicketManager();
    }
    return TicketManager.instance;
  }

  constructor() {
    this.aiClassifier = new AITicketClassifier();
    this.slaMonitor = SLAMonitor.getInstance();
  }

  /**
   * Create a new support ticket with full AI processing and routing
   */
  async createTicket(request: CreateTicketRequest): Promise<Ticket> {
    try {
      console.log(
        `Creating ticket for user ${request.userId}: ${request.subject}`,
      );

      // 1. Get user context for better classification
      const userContext = await this.getUserContext(request.userId);

      // 2. AI-powered classification
      const classificationRequest: ClassificationRequest = {
        subject: request.subject,
        description: request.description,
        userType: request.userType,
        userTier: userContext.tier,
        accountAge: userContext.accountAge,
        previousTicketCount: userContext.previousTickets,
        browserInfo: request.browserInfo,
      };

      const classification = await this.aiClassifier.classify(
        classificationRequest,
      );

      // 3. Generate unique ticket ID with category prefix
      const ticketId = this.generateTicketId(classification.category);

      // 4. Calculate SLA based on classification and context
      const sla = this.slaMonitor.calculateSLA(
        classification.priority,
        userContext.tier,
        classification.tags,
        request.weddingDate,
      );

      // 5. Extract wedding context
      const weddingContext = this.extractWeddingContext(
        request.description,
        request.weddingDate,
      );

      // 6. Build comprehensive ticket object
      const ticket: Ticket = {
        id: ticketId,
        userId: request.userId,
        userType: request.userType,
        userTier: userContext.tier,

        subject: request.subject.trim(),
        description: request.description.trim(),
        attachments: request.attachments || [],

        type: classification.type,
        category: classification.category,
        priority: classification.priority,
        status: 'open',

        assignedTo: null,
        assignedTeam: null,
        assignedAt: null,

        createdAt: new Date(),
        firstResponseAt: null,
        lastUpdateAt: new Date(),
        resolvedAt: null,
        closedAt: null,

        slaFirstResponseMinutes: sla.firstResponse,
        slaResolutionMinutes: sla.resolution,
        slaFirstResponseDeadline: sla.firstResponseDeadline,
        slaResolutionDeadline: sla.resolutionDeadline,
        slaBreach: false,

        escalationLevel: 0,
        escalatedAt: null,
        escalationReason: null,

        satisfactionRating: null,
        satisfactionFeedback: null,

        weddingDate: request.weddingDate || weddingContext.extractedWeddingDate,
        vendorType: classification.vendorType || weddingContext.vendorType,
        isWeddingDayEmergency:
          classification.isWeddingEmergency || weddingContext.isEmergency,
        urgencyScore: classification.urgencyScore,

        tags: [
          ...classification.tags,
          ...this.extractContextualTags(request, classification),
        ],
        source: request.source || 'web',
        metadata: {
          classification: {
            method: classification.method,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
          },
          userContext,
          weddingContext,
          browserInfo: request.browserInfo,
          createdVia: 'ticket_manager',
        },

        relatedTickets: [],
        duplicateOf: null,
      };

      // 7. Save to database
      await this.saveTicketToDatabase(ticket);

      // 8. Start SLA monitoring
      await this.slaMonitor.startMonitoring(ticketId);

      // 9. Auto-assignment and routing
      const assignment = await this.routeAndAssignTicket(ticket);
      if (assignment) {
        await this.assignTicket(
          ticketId,
          assignment.agentId,
          assignment.reason,
        );
        ticket.assignedTo = assignment.agentId;
        ticket.assignedTeam = assignment.team;
        ticket.assignedAt = new Date();
      }

      // 10. Check for auto-responses
      const autoResponse = await this.checkForAutoResponse(ticket);
      if (autoResponse) {
        await this.addTicketMessage(ticketId, {
          senderType: 'system',
          senderName: 'WedSync Support Bot',
          message: autoResponse.message,
          messageType: 'reply',
          isAutomated: true,
          templateUsed: autoResponse.templateId,
        });

        // Update first response time
        ticket.firstResponseAt = new Date();
        await this.updateTicketFirstResponse(ticketId);
      }

      // 11. Check for duplicates and related tickets
      const relatedTickets = await this.findRelatedTickets(ticket);
      if (relatedTickets.length > 0) {
        await this.linkRelatedTickets(ticketId, relatedTickets);
        ticket.relatedTickets = relatedTickets.map((t) => t.id);
      }

      // 12. Send notifications
      await this.sendTicketNotifications(ticket);

      console.log(`Ticket ${ticketId} created successfully`, {
        priority: ticket.priority,
        category: ticket.category,
        assignedTo: ticket.assignedTo,
        slaDeadlines: {
          firstResponse: ticket.slaFirstResponseDeadline,
          resolution: ticket.slaResolutionDeadline,
        },
      });

      return ticket;
    } catch (error) {
      console.error('Failed to create ticket:', error);
      throw new Error(`Ticket creation failed: ${error.message}`);
    }
  }

  /**
   * Get ticket by ID with full details
   */
  async getTicket(ticketId: string): Promise<Ticket | null> {
    try {
      const { data: ticketData, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', ticketId)
        .single();

      if (error || !ticketData) {
        return null;
      }

      return this.mapDatabaseToTicket(ticketData);
    } catch (error) {
      console.error(`Failed to get ticket ${ticketId}:`, error);
      return null;
    }
  }

  /**
   * List tickets with filtering and pagination
   */
  async listTickets(
    params: {
      status?: string[];
      priority?: string[];
      category?: string[];
      assignedTo?: string;
      userTier?: string[];
      limit?: number;
      offset?: number;
      sortBy?: 'created_at' | 'priority' | 'last_update_at' | 'sla_deadline';
      sortOrder?: 'asc' | 'desc';
    } = {},
  ): Promise<{
    tickets: Ticket[];
    total: number;
    pagination: {
      limit: number;
      offset: number;
      totalPages: number;
    };
  }> {
    try {
      let query = supabase
        .from('support_tickets')
        .select('*', { count: 'exact' });

      // Apply filters
      if (params.status?.length) {
        query = query.in('status', params.status);
      }
      if (params.priority?.length) {
        query = query.in('priority', params.priority);
      }
      if (params.category?.length) {
        query = query.in('category', params.category);
      }
      if (params.assignedTo) {
        query = query.eq('assigned_to', params.assignedTo);
      }
      if (params.userTier?.length) {
        query = query.in('user_tier', params.userTier);
      }

      // Apply sorting
      const sortBy = params.sortBy || 'created_at';
      const sortOrder = params.sortOrder || 'desc';
      query = query.order(sortBy, { ascending: sortOrder === 'asc' });

      // Apply pagination
      const limit = params.limit || 50;
      const offset = params.offset || 0;
      query = query.range(offset, offset + limit - 1);

      const { data: tickets, error, count } = await query;

      if (error) {
        throw new Error(`Failed to list tickets: ${error.message}`);
      }

      const mappedTickets = (tickets || []).map(this.mapDatabaseToTicket);
      const total = count || 0;
      const totalPages = Math.ceil(total / limit);

      return {
        tickets: mappedTickets,
        total,
        pagination: {
          limit,
          offset,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Failed to list tickets:', error);
      throw error;
    }
  }

  /**
   * Assign ticket to a support agent
   */
  async assignTicket(
    ticketId: string,
    agentId: string,
    reason?: string,
  ): Promise<void> {
    try {
      const ticket = await this.getTicket(ticketId);
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} not found`);
      }

      const agent = await this.getAgent(agentId);
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Check agent capacity
      if (agent.currentTicketCount >= agent.maxConcurrentTickets) {
        throw new Error(
          `Agent ${agent.agentName} is at capacity (${agent.currentTicketCount}/${agent.maxConcurrentTickets})`,
        );
      }

      const now = new Date();

      // Update ticket assignment
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: agentId,
          assigned_team: agent.team,
          assigned_at: now.toISOString(),
          last_update_at: now.toISOString(),
        })
        .eq('id', ticketId);

      if (error) {
        throw new Error(`Failed to assign ticket: ${error.message}`);
      }

      // Update agent ticket count
      await this.updateAgentTicketCount(agentId, 1);

      // Add assignment message
      await this.addTicketMessage(ticketId, {
        senderType: 'system',
        senderName: 'System',
        message: `Ticket assigned to ${agent.agentName}${reason ? `: ${reason}` : ''}`,
        messageType: 'assignment',
        isInternal: true,
      });

      // Send notifications
      await this.sendAssignmentNotifications(ticket, agent);

      console.log(`Ticket ${ticketId} assigned to ${agent.agentName}`);
    } catch (error) {
      console.error(`Failed to assign ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Add message/response to ticket
   */
  async addTicketMessage(
    ticketId: string,
    message: {
      senderType: 'customer' | 'agent' | 'system';
      senderId?: string;
      senderName: string;
      message: string;
      messageType?: 'reply' | 'note' | 'status_change' | 'assignment';
      attachments?: Attachment[];
      isInternal?: boolean;
      isAutomated?: boolean;
      templateUsed?: string;
      statusChangeFrom?: string;
      statusChangeTo?: string;
    },
  ): Promise<TicketMessage> {
    try {
      const messageData = {
        id: crypto.randomUUID(),
        ticket_id: ticketId,
        sender_type: message.senderType,
        sender_id: message.senderId || null,
        sender_name: message.senderName,
        message: message.message,
        message_type: message.messageType || 'reply',
        attachments: message.attachments || [],
        is_internal: message.isInternal || false,
        is_automated: message.isAutomated || false,
        template_used: message.templateUsed || null,
        status_change_from: message.statusChangeFrom || null,
        status_change_to: message.statusChangeTo || null,
        created_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('ticket_messages')
        .insert([messageData])
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to add message: ${error.message}`);
      }

      // Update ticket last_update_at (handled by trigger)

      return this.mapDatabaseToMessage(data);
    } catch (error) {
      console.error(`Failed to add message to ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Update ticket status with SLA tracking
   */
  async updateTicketStatus(
    ticketId: string,
    newStatus: string,
    agentId?: string,
    note?: string,
  ): Promise<void> {
    try {
      const ticket = await this.getTicket(ticketId);
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} not found`);
      }

      const oldStatus = ticket.status;
      const now = new Date();

      // Update ticket status
      const updateData: any = {
        status: newStatus,
        last_update_at: now.toISOString(),
      };

      // Handle first response
      if (
        oldStatus === 'open' &&
        ['in_progress', 'waiting_customer', 'resolved'].includes(newStatus) &&
        !ticket.firstResponseAt
      ) {
        updateData.first_response_at = now.toISOString();
      }

      // Handle resolution
      if (newStatus === 'resolved' && oldStatus !== 'resolved') {
        updateData.resolved_at = now.toISOString();
      }

      // Handle closure
      if (newStatus === 'closed' && oldStatus !== 'closed') {
        updateData.closed_at = now.toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updateData)
        .eq('id', ticketId);

      if (error) {
        throw new Error(`Failed to update ticket status: ${error.message}`);
      }

      // Update SLA tracking
      await this.slaMonitor.updateSLAOnStatusChange(
        ticketId,
        oldStatus,
        newStatus,
      );

      // Add status change message
      if (note || oldStatus !== newStatus) {
        await this.addTicketMessage(ticketId, {
          senderType: agentId ? 'agent' : 'system',
          senderId: agentId,
          senderName: agentId ? 'Agent' : 'System',
          message: note || `Status changed from ${oldStatus} to ${newStatus}`,
          messageType: 'status_change',
          statusChangeFrom: oldStatus,
          statusChangeTo: newStatus,
        });
      }

      console.log(
        `Ticket ${ticketId} status updated: ${oldStatus} → ${newStatus}`,
      );
    } catch (error) {
      console.error(`Failed to update ticket status for ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Escalate ticket with automatic routing
   */
  async escalateTicket(
    ticketId: string,
    reason: string,
    escalateTo?: 'senior' | 'team_lead' | 'founder',
  ): Promise<void> {
    try {
      const ticket = await this.getTicket(ticketId);
      if (!ticket) {
        throw new Error(`Ticket ${ticketId} not found`);
      }

      const escalationLevel = ticket.escalationLevel + 1;
      const now = new Date();

      // Determine escalation target
      let newAssignee: string | null = null;
      const finalEscalateTo =
        escalateTo || this.determineEscalationTarget(escalationLevel);

      switch (finalEscalateTo) {
        case 'senior':
          newAssignee = await this.findSeniorAgent(ticket.category);
          break;
        case 'team_lead':
          newAssignee = await this.findTeamLead(ticket.assignedTeam);
          break;
        case 'founder':
          newAssignee = await this.getFounderId();
          break;
      }

      // Increase priority on escalation
      let newPriority = ticket.priority;
      if (ticket.priority === 'low') newPriority = 'medium';
      else if (ticket.priority === 'medium') newPriority = 'high';
      else if (ticket.priority === 'high') newPriority = 'critical';

      // Update ticket
      const { error } = await supabase
        .from('support_tickets')
        .update({
          escalation_level: escalationLevel,
          escalated_at: now.toISOString(),
          escalation_reason: reason,
          priority: newPriority,
          assigned_to: newAssignee,
          last_update_at: now.toISOString(),
        })
        .eq('id', ticketId);

      if (error) {
        throw new Error(`Failed to escalate ticket: ${error.message}`);
      }

      // Record escalation history
      await this.recordEscalation(
        ticketId,
        ticket.assignedTo,
        newAssignee,
        escalationLevel,
        reason,
      );

      // Add escalation message
      await this.addTicketMessage(ticketId, {
        senderType: 'system',
        senderName: 'Escalation System',
        message: `Ticket escalated to ${finalEscalateTo} level ${escalationLevel}: ${reason}`,
        messageType: 'status_change',
        isInternal: true,
      });

      console.log(
        `Ticket ${ticketId} escalated to level ${escalationLevel}: ${reason}`,
      );
    } catch (error) {
      console.error(`Failed to escalate ticket ${ticketId}:`, error);
      throw error;
    }
  }

  /**
   * Get comprehensive ticket metrics
   */
  async getTicketMetrics(
    timeframe: '24h' | '7d' | '30d' | '90d' = '30d',
  ): Promise<TicketMetrics> {
    try {
      const startDate = this.getTimeframeStartDate(timeframe);

      const { data: tickets, error } = await supabase
        .from('support_tickets')
        .select('*')
        .gte('created_at', startDate.toISOString());

      if (error) {
        throw new Error(`Failed to fetch ticket metrics: ${error.message}`);
      }

      if (!tickets || tickets.length === 0) {
        return this.getEmptyMetrics();
      }

      // Calculate overview metrics
      const totalTickets = tickets.length;
      const openTickets = tickets.filter((t) => t.status === 'open').length;
      const inProgressTickets = tickets.filter(
        (t) => t.status === 'in_progress',
      ).length;
      const resolvedTickets = tickets.filter(
        (t) => t.status === 'resolved',
      ).length;

      // Calculate response and resolution times
      const respondedTickets = tickets.filter((t) => t.first_response_at);
      const avgFirstResponseTime =
        respondedTickets.length > 0
          ? respondedTickets.reduce((sum, ticket) => {
              const responseTime =
                new Date(ticket.first_response_at!).getTime() -
                new Date(ticket.created_at).getTime();
              return sum + responseTime / (1000 * 60);
            }, 0) / respondedTickets.length
          : 0;

      const resolvedTicketsList = tickets.filter((t) => t.resolved_at);
      const avgResolutionTime =
        resolvedTicketsList.length > 0
          ? resolvedTicketsList.reduce((sum, ticket) => {
              const resolutionTime =
                new Date(ticket.resolved_at!).getTime() -
                new Date(ticket.created_at).getTime();
              return sum + resolutionTime / (1000 * 60);
            }, 0) / resolvedTicketsList.length
          : 0;

      // Calculate satisfaction
      const satisfactionResponses = tickets.filter(
        (t) => t.satisfaction_rating,
      );
      const avgSatisfaction =
        satisfactionResponses.length > 0
          ? satisfactionResponses.reduce(
              (sum, t) => sum + t.satisfaction_rating,
              0,
            ) / satisfactionResponses.length
          : 0;

      // Group by priority and category
      const byPriority = this.groupTicketCounts(tickets, 'priority');
      const byCategory = this.groupTicketCounts(tickets, 'category');

      return {
        overview: {
          totalTickets,
          openTickets,
          inProgressTickets,
          resolvedTickets,
          avgFirstResponseTime: Math.round(avgFirstResponseTime),
          avgResolutionTime: Math.round(avgResolutionTime / 60), // convert to hours
          satisfactionScore: Math.round(avgSatisfaction * 100) / 100,
          resolutionRate: Math.round((resolvedTickets / totalTickets) * 100),
        },
        byPriority,
        byCategory,
        trends: await this.calculateTrends(tickets, timeframe),
        agentMetrics: await this.getAgentMetrics(startDate),
      };
    } catch (error) {
      console.error('Failed to get ticket metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  // Private helper methods

  private generateTicketId(category: string): string {
    const prefixMap: Record<string, string> = {
      form_builder: 'FB',
      billing: 'BIL',
      bug: 'BUG',
      onboarding: 'ONB',
      data_loss: 'DL',
      security: 'SEC',
      performance: 'PERF',
      journey_canvas: 'JC',
      email_system: 'EMAIL',
      import_export: 'IE',
      integration: 'INT',
    };

    const prefix = prefixMap[category] || 'TKT';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
  }

  private async getUserContext(userId: string): Promise<{
    tier: string;
    accountAge: number;
    previousTickets: number;
  }> {
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('created_at, subscription_tier')
        .eq('user_id', userId)
        .single();

      // Get previous ticket count
      const { count: previousTickets } = await supabase
        .from('support_tickets')
        .select('id', { count: 'exact' })
        .eq('user_id', userId);

      const accountAge = profile
        ? Math.floor(
            (Date.now() - new Date(profile.created_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      return {
        tier: profile?.subscription_tier || 'free',
        accountAge,
        previousTickets: previousTickets || 0,
      };
    } catch (error) {
      console.error(`Failed to get user context for ${userId}:`, error);
      return { tier: 'free', accountAge: 0, previousTickets: 0 };
    }
  }

  private extractWeddingContext(
    description: string,
    weddingDate?: Date,
  ): {
    extractedWeddingDate: Date | null;
    vendorType: string | null;
    isEmergency: boolean;
    timeContext: string;
  } {
    const text = description.toLowerCase();

    // Extract wedding date from text if not provided
    let extractedWeddingDate = weddingDate || null;
    if (!extractedWeddingDate) {
      // Simple date extraction - could be more sophisticated
      const datePatterns = [
        /(\d{1,2}\/\d{1,2}\/\d{4})/,
        /(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
      ];
      // Implementation would extract dates from text
    }

    // Determine vendor type
    const vendorType = this.extractVendorTypeFromText(text);

    // Check for emergency indicators
    const emergencyPatterns = [
      /wedding.*(today|tomorrow|this weekend)/i,
      /ceremony.*(today|now|urgent)/i,
      /(urgent|emergency|asap).*(wedding|ceremony)/i,
    ];
    const isEmergency = emergencyPatterns.some((pattern) => pattern.test(text));

    // Determine time context
    let timeContext = 'planning';
    if (text.includes('today') || text.includes('right now')) {
      timeContext = 'day_of';
    } else if (text.includes('tomorrow') || text.includes('this weekend')) {
      timeContext = 'week_of';
    }

    return {
      extractedWeddingDate,
      vendorType,
      isEmergency,
      timeContext,
    };
  }

  private extractVendorTypeFromText(text: string): string | null {
    const vendorPatterns = {
      photographer: /photographer|photo|picture|shoot/i,
      videographer: /videographer|video|film/i,
      dj: /\bdj\b|disc jockey|music/i,
      florist: /florist|flower|bouquet/i,
      caterer: /cater|food|menu/i,
      venue: /venue|location|hall/i,
      planner: /planner|coordinator/i,
    };

    for (const [type, pattern] of Object.entries(vendorPatterns)) {
      if (pattern.test(text)) {
        return type;
      }
    }

    return null;
  }

  private extractContextualTags(
    request: CreateTicketRequest,
    classification: TicketClassification,
  ): string[] {
    const tags: string[] = [];

    // Add user context tags
    tags.push(`source_${request.source || 'web'}`);
    tags.push(`user_${request.userType}`);

    // Add urgency tags based on classification
    if (classification.urgencyScore >= 8) tags.push('high_urgency');
    if (classification.isWeddingEmergency) tags.push('wedding_emergency');

    // Add browser context if available
    if (request.browserInfo?.includes('Mobile')) tags.push('mobile_user');

    return tags;
  }

  private async saveTicketToDatabase(ticket: Ticket): Promise<void> {
    const { error } = await supabase.from('support_tickets').insert([
      {
        id: ticket.id,
        user_id: ticket.userId,
        user_type: ticket.userType,
        user_tier: ticket.userTier,

        subject: ticket.subject,
        description: ticket.description,
        attachments: ticket.attachments,

        ticket_type: ticket.type,
        category: ticket.category,
        priority: ticket.priority,
        status: ticket.status,

        assigned_to: ticket.assignedTo,
        assigned_team: ticket.assignedTeam,
        assigned_at: ticket.assignedAt?.toISOString(),

        created_at: ticket.createdAt.toISOString(),
        last_update_at: ticket.lastUpdateAt.toISOString(),

        sla_first_response_minutes: ticket.slaFirstResponseMinutes,
        sla_resolution_minutes: ticket.slaResolutionMinutes,
        sla_first_response_deadline:
          ticket.slaFirstResponseDeadline.toISOString(),
        sla_resolution_deadline: ticket.slaResolutionDeadline.toISOString(),
        sla_breach: ticket.slaBreach,

        escalation_level: ticket.escalationLevel,
        escalated_at: ticket.escalatedAt?.toISOString(),
        escalation_reason: ticket.escalationReason,

        wedding_date: ticket.weddingDate?.toISOString().split('T')[0],
        vendor_type: ticket.vendorType,
        is_wedding_day_emergency: ticket.isWeddingDayEmergency,
        urgency_score: ticket.urgencyScore,

        tags: ticket.tags,
        source: ticket.source,
        metadata: ticket.metadata,
      },
    ]);

    if (error) {
      throw new Error(`Failed to save ticket to database: ${error.message}`);
    }
  }

  private mapDatabaseToTicket(data: any): Ticket {
    return {
      id: data.id,
      userId: data.user_id,
      userType: data.user_type,
      userTier: data.user_tier,

      subject: data.subject,
      description: data.description,
      attachments: data.attachments || [],

      type: data.ticket_type,
      category: data.category,
      priority: data.priority,
      status: data.status,

      assignedTo: data.assigned_to,
      assignedTeam: data.assigned_team,
      assignedAt: data.assigned_at ? new Date(data.assigned_at) : null,

      createdAt: new Date(data.created_at),
      firstResponseAt: data.first_response_at
        ? new Date(data.first_response_at)
        : null,
      lastUpdateAt: new Date(data.last_update_at),
      resolvedAt: data.resolved_at ? new Date(data.resolved_at) : null,
      closedAt: data.closed_at ? new Date(data.closed_at) : null,

      slaFirstResponseMinutes: data.sla_first_response_minutes,
      slaResolutionMinutes: data.sla_resolution_minutes,
      slaFirstResponseDeadline: new Date(data.sla_first_response_deadline),
      slaResolutionDeadline: new Date(data.sla_resolution_deadline),
      slaBreach: data.sla_breach,

      escalationLevel: data.escalation_level,
      escalatedAt: data.escalated_at ? new Date(data.escalated_at) : null,
      escalationReason: data.escalation_reason,

      satisfactionRating: data.satisfaction_rating,
      satisfactionFeedback: data.satisfaction_feedback,

      weddingDate: data.wedding_date ? new Date(data.wedding_date) : null,
      vendorType: data.vendor_type,
      isWeddingDayEmergency: data.is_wedding_day_emergency || false,
      urgencyScore: data.urgency_score || 5,

      tags: data.tags || [],
      source: data.source,
      metadata: data.metadata || {},

      relatedTickets: data.related_tickets || [],
      duplicateOf: data.duplicate_of,
    };
  }

  private mapDatabaseToMessage(data: any): TicketMessage {
    return {
      id: data.id,
      ticketId: data.ticket_id,
      senderType: data.sender_type,
      senderId: data.sender_id,
      senderName: data.sender_name,
      message: data.message,
      messageType: data.message_type,
      attachments: data.attachments || [],
      isInternal: data.is_internal,
      isAutomated: data.is_automated,
      templateUsed: data.template_used,
      createdAt: new Date(data.created_at),
      editedAt: data.edited_at ? new Date(data.edited_at) : null,
      statusChangeFrom: data.status_change_from,
      statusChangeTo: data.status_change_to,
      emailSent: data.email_sent,
      readByCustomer: data.read_by_customer,
      readAt: data.read_at ? new Date(data.read_at) : null,
    };
  }

  // Additional helper methods for routing, assignment, notifications, etc.
  // would be implemented here...

  private async routeAndAssignTicket(
    ticket: Ticket,
  ): Promise<{ agentId: string; team: string; reason: string } | null> {
    // Intelligent routing logic would go here
    return null; // Placeholder
  }

  private async getAgent(agentId: string): Promise<SupportAgent | null> {
    // Get agent details from database
    return null; // Placeholder
  }

  private async updateAgentTicketCount(
    agentId: string,
    delta: number,
  ): Promise<void> {
    // Update agent's current ticket count
  }

  private async checkForAutoResponse(
    ticket: Ticket,
  ): Promise<{ message: string; templateId: string } | null> {
    // Check auto-response rules
    return null; // Placeholder
  }

  private async findRelatedTickets(ticket: Ticket): Promise<Ticket[]> {
    // Find related tickets based on content similarity
    return []; // Placeholder
  }

  private async linkRelatedTickets(
    ticketId: string,
    relatedTickets: Ticket[],
  ): Promise<void> {
    // Link tickets in database
  }

  private async sendTicketNotifications(ticket: Ticket): Promise<void> {
    // Send notifications to relevant parties
  }

  private async sendAssignmentNotifications(
    ticket: Ticket,
    agent: SupportAgent,
  ): Promise<void> {
    // Send assignment notifications
  }

  private async updateTicketFirstResponse(ticketId: string): Promise<void> {
    // Update first response timestamp
  }

  private async recordEscalation(
    ticketId: string,
    fromAgent: string | null,
    toAgent: string | null,
    level: number,
    reason: string,
  ): Promise<void> {
    // Record escalation in history table
  }

  private determineEscalationTarget(
    level: number,
  ): 'senior' | 'team_lead' | 'founder' {
    if (level === 1) return 'senior';
    if (level === 2) return 'team_lead';
    return 'founder';
  }

  private async findSeniorAgent(category: string): Promise<string | null> {
    // Find senior agent for category
    return null;
  }

  private async findTeamLead(team: string | null): Promise<string | null> {
    // Find team lead
    return null;
  }

  private async getFounderId(): Promise<string | null> {
    // Get founder's agent ID
    return null;
  }

  private getTimeframeStartDate(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  }

  private groupTicketCounts(
    tickets: any[],
    field: string,
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    tickets.forEach((ticket) => {
      const value = ticket[field] || 'unknown';
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  private async calculateTrends(
    tickets: any[],
    timeframe: string,
  ): Promise<TicketMetrics['trends']> {
    // Calculate trends based on historical data
    return {
      volumeTrend: [],
      responseTrend: [],
      satisfactionTrend: [],
    };
  }

  private async getAgentMetrics(
    startDate: Date,
  ): Promise<TicketMetrics['agentMetrics']> {
    // Get agent performance metrics
    return [];
  }

  private getEmptyMetrics(): TicketMetrics {
    return {
      overview: {
        totalTickets: 0,
        openTickets: 0,
        inProgressTickets: 0,
        resolvedTickets: 0,
        avgFirstResponseTime: 0,
        avgResolutionTime: 0,
        satisfactionScore: 0,
        resolutionRate: 0,
      },
      byPriority: {},
      byCategory: {},
      trends: {
        volumeTrend: [],
        responseTrend: [],
        satisfactionTrend: [],
      },
      agentMetrics: [],
    };
  }
}

export default TicketManager;
