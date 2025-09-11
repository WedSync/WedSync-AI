import { BaseIntegrationService } from './BaseIntegrationService';
import { createClient } from '@supabase/supabase-js';
import {
  IntegrationConfig,
  IntegrationCredentials,
  IntegrationResponse,
  SupportIntegrationConfig,
  SupportTicket,
  EscalationRule,
  SupportAgent,
  TicketPriority,
  EscalationContext,
  ChatMessage,
  ChatContext,
  SupportChatTransfer,
  AgentWorkload,
} from '@/types/integrations';

export class SupportEscalationService extends BaseIntegrationService {
  protected serviceName = 'SupportEscalation';
  private supabase: ReturnType<typeof createClient>;
  private supportConfig: SupportIntegrationConfig;
  private escalationRules: Map<string, EscalationRule[]> = new Map();
  private agentWorkloads: Map<string, AgentWorkload> = new Map();

  constructor(
    config: IntegrationConfig,
    credentials: IntegrationCredentials,
    supportConfig: SupportIntegrationConfig,
  ) {
    super(config, credentials);
    this.supportConfig = supportConfig;
    this.supabase = createClient(
      supportConfig.supabaseConfig.url,
      supportConfig.supabaseConfig.serviceKey,
    );

    // Initialize escalation rules
    this.initializeEscalationRules();
    this.startAgentWorkloadMonitoring();
  }

  protected async makeRequest(
    endpoint: string,
    options?: any,
  ): Promise<IntegrationResponse> {
    const headers = {
      Authorization: `Bearer ${this.credentials.apiKey}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Support API error: ${response.status} ${response.statusText}`,
      );
    }

    return {
      success: true,
      data: await response.json(),
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    };
  }

  async validateConnection(): Promise<boolean> {
    try {
      // Test Supabase connection
      const { data, error } = await this.supabase
        .from('support_agents')
        .select('id')
        .limit(1);

      if (error) {
        console.error('Support service connection failed:', error);
        return false;
      }

      // Test support API if configured
      if (this.supportConfig.externalApiUrl) {
        await this.makeRequest('/health');
      }

      return true;
    } catch (error) {
      console.error('Support validation failed:', error);
      return false;
    }
  }

  async refreshToken(): Promise<string> {
    if (!this.supportConfig.tokenRefreshUrl) {
      throw new Error('Token refresh not configured for support service');
    }

    const response = await this.makeRequest('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({
        refreshToken: this.credentials.refreshToken,
      }),
    });

    return response.data.accessToken;
  }

  // Core escalation functionality
  async escalateChat(
    chatHistory: ChatMessage[],
    context: ChatContext,
    escalationReason: string,
  ): Promise<SupportTicket> {
    this.logRequest('POST', '/escalate-chat', {
      escalationReason,
      contextType: context.type,
      messageCount: chatHistory.length,
    });

    try {
      // Determine escalation priority based on context
      const priority = this.determineEscalationPriority(
        context,
        escalationReason,
      );

      // Find the best available agent
      const assignedAgent = await this.findBestAvailableAgent(
        priority,
        context,
      );

      // Create support ticket with conversation context
      const ticket = await this.createSupportTicket({
        priority,
        subject: this.generateTicketSubject(context, escalationReason),
        description: this.formatConversationForTicket(
          chatHistory,
          context,
          escalationReason,
        ),
        assignedAgentId: assignedAgent?.id,
        originalContext: context,
        escalationReason,
        customerType: context.userType,
        weddingDate: context.weddingDate,
        urgencyScore: this.calculateUrgencyScore(context),
      });

      // Transfer chat context to human agent
      if (assignedAgent) {
        await this.transferChatToAgent(
          chatHistory,
          context,
          assignedAgent,
          ticket.id,
        );
        this.updateAgentWorkload(assignedAgent.id, 1);
      }

      // Notify relevant parties
      await this.sendEscalationNotifications(ticket, assignedAgent);

      this.logResponse('POST', '/escalate-chat', {
        ticketId: ticket.id,
        assignedAgent: assignedAgent?.name,
      });

      return ticket;
    } catch (error) {
      const sanitizedError = this.sanitizeError(error);
      throw new Error(`Escalation failed: ${sanitizedError.message}`);
    }
  }

  private determineEscalationPriority(
    context: ChatContext,
    reason: string,
  ): TicketPriority {
    // Wedding day emergencies get highest priority
    if (context.weddingDate && this.isWeddingDay(context.weddingDate)) {
      return TicketPriority.CRITICAL;
    }

    // Payment/billing issues are high priority
    if (
      reason.toLowerCase().includes('payment') ||
      reason.toLowerCase().includes('billing')
    ) {
      return TicketPriority.HIGH;
    }

    // Vendor issues during wedding week
    if (
      context.userType === 'vendor' &&
      this.isWeddingWeek(context.weddingDate)
    ) {
      return TicketPriority.HIGH;
    }

    // Data loss or security concerns
    if (
      reason.toLowerCase().includes('data') ||
      reason.toLowerCase().includes('security')
    ) {
      return TicketPriority.HIGH;
    }

    // API or integration failures for vendors
    if (
      context.userType === 'vendor' &&
      reason.toLowerCase().includes('integration')
    ) {
      return TicketPriority.MEDIUM;
    }

    return TicketPriority.LOW;
  }

  private async findBestAvailableAgent(
    priority: TicketPriority,
    context: ChatContext,
  ): Promise<SupportAgent | null> {
    try {
      // Get available agents with appropriate skills
      const { data: agents, error } = await this.supabase
        .from('support_agents')
        .select(
          `
          *,
          agent_skills (
            skill_type,
            proficiency_level
          )
        `,
        )
        .eq('is_available', true)
        .eq('status', 'online');

      if (error) {
        console.error('Failed to fetch agents:', error);
        return null;
      }

      if (!agents || agents.length === 0) {
        // No agents available - queue for next available
        return null;
      }

      // Score agents based on workload, skills, and priority handling
      const scoredAgents = agents.map((agent) => {
        const workload = this.agentWorkloads.get(agent.id) || {
          activeChats: 0,
          queuedTickets: 0,
          utilizationScore: 0,
        };

        let score = 100 - workload.utilizationScore;

        // Bonus for wedding industry expertise
        const hasWeddingExpertise = agent.agent_skills.some(
          (skill: any) =>
            skill.skill_type === 'wedding_industry' &&
            skill.proficiency_level >= 3,
        );
        if (hasWeddingExpertise && context.userType === 'vendor') {
          score += 25;
        }

        // Bonus for technical skills for integration issues
        const hasTechnicalSkills = agent.agent_skills.some(
          (skill: any) =>
            skill.skill_type === 'technical_support' &&
            skill.proficiency_level >= 3,
        );
        if (hasTechnicalSkills && context.type === 'support_technical') {
          score += 20;
        }

        // Priority handling bonus
        if (priority === TicketPriority.CRITICAL && agent.handles_critical) {
          score += 30;
        }

        return { agent, score, workload };
      });

      // Sort by score and return best available agent
      scoredAgents.sort((a, b) => b.score - a.score);
      return scoredAgents[0]?.agent || null;
    } catch (error) {
      console.error('Failed to find available agent:', error);
      return null;
    }
  }

  private async createSupportTicket(ticketData: {
    priority: TicketPriority;
    subject: string;
    description: string;
    assignedAgentId?: string;
    originalContext: ChatContext;
    escalationReason: string;
    customerType: string;
    weddingDate?: string;
    urgencyScore: number;
  }): Promise<SupportTicket> {
    const { data: ticket, error } = await this.supabase
      .from('support_tickets')
      .insert({
        subject: ticketData.subject,
        description: ticketData.description,
        priority: ticketData.priority,
        status: ticketData.assignedAgentId ? 'assigned' : 'open',
        assigned_agent_id: ticketData.assignedAgentId,
        customer_id: ticketData.originalContext.userId,
        organization_id: ticketData.originalContext.organizationId,
        escalation_reason: ticketData.escalationReason,
        customer_type: ticketData.customerType,
        wedding_date: ticketData.weddingDate,
        urgency_score: ticketData.urgencyScore,
        metadata: {
          originalContext: ticketData.originalContext,
          chatbotHandoff: true,
          createdAt: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create support ticket: ${error.message}`);
    }

    return {
      id: ticket.id,
      subject: ticket.subject,
      description: ticket.description,
      priority: ticket.priority as TicketPriority,
      status: ticket.status,
      assignedAgentId: ticket.assigned_agent_id,
      customerId: ticket.customer_id,
      organizationId: ticket.organization_id,
      createdAt: new Date(ticket.created_at),
      updatedAt: new Date(ticket.updated_at),
    };
  }

  private async transferChatToAgent(
    chatHistory: ChatMessage[],
    context: ChatContext,
    agent: SupportAgent,
    ticketId: string,
  ): Promise<SupportChatTransfer> {
    // Store chat context for agent
    const contextSummary = this.generateContextSummary(chatHistory, context);

    const { data: transfer, error } = await this.supabase
      .from('chat_transfers')
      .insert({
        ticket_id: ticketId,
        agent_id: agent.id,
        chat_history: chatHistory,
        context_summary: contextSummary,
        transfer_reason: 'escalation',
        customer_sentiment: this.analyzeSentiment(chatHistory),
        key_issues: this.extractKeyIssues(chatHistory),
        suggested_actions: this.suggestActions(context, chatHistory),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to transfer chat:', error);
      throw new Error('Chat transfer failed');
    }

    // Notify agent via real-time channel
    await this.supabase.channel(`agent-${agent.id}`).send({
      type: 'broadcast',
      event: 'new_chat_transfer',
      payload: {
        ticketId,
        contextSummary,
        priority: this.determineEscalationPriority(context, ''),
        customerInfo: {
          name: context.userProfile?.name || 'Unknown',
          type: context.userType,
          weddingDate: context.weddingDate,
        },
      },
    });

    return {
      id: transfer.id,
      ticketId,
      agentId: agent.id,
      transferredAt: new Date(),
      contextSummary,
      status: 'active',
    };
  }

  private generateTicketSubject(context: ChatContext, reason: string): string {
    const userType = context.userType === 'vendor' ? 'Vendor' : 'Couple';
    const weddingInfo = context.weddingDate
      ? ` (Wedding: ${context.weddingDate})`
      : '';
    return `[${userType}] Chatbot Escalation - ${reason}${weddingInfo}`;
  }

  private formatConversationForTicket(
    chatHistory: ChatMessage[],
    context: ChatContext,
    escalationReason: string,
  ): string {
    const contextInfo = [
      `Customer: ${context.userProfile?.name || 'Unknown'} (${context.userType})`,
      context.weddingDate ? `Wedding Date: ${context.weddingDate}` : '',
      `Organization: ${context.organizationId}`,
      `Escalation Reason: ${escalationReason}`,
      '',
      '--- CONVERSATION HISTORY ---',
    ]
      .filter(Boolean)
      .join('\n');

    const conversation = chatHistory
      .slice(-20) // Last 20 messages
      .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n');

    return `${contextInfo}\n${conversation}`;
  }

  private generateContextSummary(
    chatHistory: ChatMessage[],
    context: ChatContext,
  ): string {
    const issues = this.extractKeyIssues(chatHistory);
    const sentiment = this.analyzeSentiment(chatHistory);

    return [
      `Customer Type: ${context.userType}`,
      context.weddingDate ? `Wedding Date: ${context.weddingDate}` : '',
      `Key Issues: ${issues.join(', ')}`,
      `Customer Sentiment: ${sentiment}`,
      `Messages Exchanged: ${chatHistory.length}`,
      `Context: ${context.type}`,
    ]
      .filter(Boolean)
      .join('\n');
  }

  private extractKeyIssues(chatHistory: ChatMessage[]): string[] {
    // Simple keyword-based issue extraction
    const issues = new Set<string>();
    const keywords = {
      billing: ['payment', 'billing', 'charge', 'invoice', 'subscription'],
      technical: ['error', 'bug', 'broken', 'not working', 'issue'],
      integration: ['sync', 'import', 'connection', 'API', 'integration'],
      wedding: ['wedding day', 'venue', 'vendor', 'timeline', 'guest'],
      account: ['login', 'password', 'access', 'account', 'profile'],
    };

    chatHistory.forEach((msg) => {
      if (msg.role === 'user') {
        const content = msg.content.toLowerCase();
        Object.entries(keywords).forEach(([category, terms]) => {
          if (terms.some((term) => content.includes(term))) {
            issues.add(category);
          }
        });
      }
    });

    return Array.from(issues);
  }

  private analyzeSentiment(
    chatHistory: ChatMessage[],
  ): 'positive' | 'neutral' | 'negative' {
    // Simple sentiment analysis based on keywords
    const userMessages = chatHistory.filter((msg) => msg.role === 'user');
    const negativeKeywords = [
      'angry',
      'frustrated',
      'terrible',
      'awful',
      'hate',
      'broken',
      'useless',
    ];
    const positiveKeywords = [
      'great',
      'amazing',
      'wonderful',
      'perfect',
      'love',
      'excellent',
    ];

    let sentimentScore = 0;
    userMessages.forEach((msg) => {
      const content = msg.content.toLowerCase();
      negativeKeywords.forEach((keyword) => {
        if (content.includes(keyword)) sentimentScore -= 1;
      });
      positiveKeywords.forEach((keyword) => {
        if (content.includes(keyword)) sentimentScore += 1;
      });
    });

    if (sentimentScore > 0) return 'positive';
    if (sentimentScore < -1) return 'negative';
    return 'neutral';
  }

  private suggestActions(
    context: ChatContext,
    chatHistory: ChatMessage[],
  ): string[] {
    const suggestions: string[] = [];
    const issues = this.extractKeyIssues(chatHistory);

    if (issues.includes('billing')) {
      suggestions.push('Check billing history and recent charges');
      suggestions.push('Verify subscription status');
    }

    if (issues.includes('technical')) {
      suggestions.push('Check system status and recent deployments');
      suggestions.push('Review error logs for user account');
    }

    if (issues.includes('integration')) {
      suggestions.push('Verify API connections and credentials');
      suggestions.push('Check integration sync status');
    }

    if (context.weddingDate && this.isWeddingWeek(context.weddingDate)) {
      suggestions.push('Prioritize: Wedding week - expedite resolution');
      suggestions.push('Consider escalating to senior support');
    }

    return suggestions;
  }

  private calculateUrgencyScore(context: ChatContext): number {
    let score = 5; // Base score

    // Wedding day urgency
    if (context.weddingDate) {
      const daysToWedding = this.getDaysToWedding(context.weddingDate);
      if (daysToWedding === 0)
        score += 10; // Wedding day
      else if (daysToWedding <= 7)
        score += 7; // Wedding week
      else if (daysToWedding <= 30) score += 3; // Wedding month
    }

    // Vendor vs couple urgency
    if (context.userType === 'vendor') score += 2;

    // Business hours bonus
    if (this.isDuringBusinessHours()) score += 1;

    return Math.min(score, 10); // Cap at 10
  }

  private isWeddingDay(weddingDate?: string): boolean {
    if (!weddingDate) return false;
    const wedding = new Date(weddingDate);
    const today = new Date();
    return wedding.toDateString() === today.toDateString();
  }

  private isWeddingWeek(weddingDate?: string): boolean {
    if (!weddingDate) return false;
    const wedding = new Date(weddingDate);
    const today = new Date();
    const diffTime = Math.abs(wedding.getTime() - today.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 7;
  }

  private getDaysToWedding(weddingDate: string): number {
    const wedding = new Date(weddingDate);
    const today = new Date();
    const diffTime = wedding.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private isDuringBusinessHours(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();

    // Monday-Friday, 9 AM - 5 PM
    return day >= 1 && day <= 5 && hour >= 9 && hour <= 17;
  }

  private initializeEscalationRules(): void {
    // Define escalation rules by context type
    const defaultRules: EscalationRule[] = [
      {
        id: 'wedding-day-emergency',
        condition: 'isWeddingDay',
        priority: TicketPriority.CRITICAL,
        maxWaitMinutes: 5,
        requiredSkills: ['wedding_emergency'],
      },
      {
        id: 'payment-issue',
        condition: 'containsKeywords',
        keywords: ['payment', 'billing', 'charge'],
        priority: TicketPriority.HIGH,
        maxWaitMinutes: 30,
        requiredSkills: ['billing_support'],
      },
      {
        id: 'technical-integration',
        condition: 'containsKeywords',
        keywords: ['API', 'sync', 'integration', 'connection'],
        priority: TicketPriority.MEDIUM,
        maxWaitMinutes: 60,
        requiredSkills: ['technical_support', 'integrations'],
      },
    ];

    this.escalationRules.set('default', defaultRules);
  }

  private startAgentWorkloadMonitoring(): void {
    // Update agent workloads every 30 seconds
    setInterval(async () => {
      await this.updateAllAgentWorkloads();
    }, 30000);
  }

  private async updateAllAgentWorkloads(): Promise<void> {
    try {
      const { data: agents } = await this.supabase
        .from('support_agents')
        .select('id')
        .eq('is_available', true);

      if (agents) {
        for (const agent of agents) {
          await this.refreshAgentWorkload(agent.id);
        }
      }
    } catch (error) {
      console.error('Failed to update agent workloads:', error);
    }
  }

  private async refreshAgentWorkload(agentId: string): Promise<void> {
    const { data: activeChats } = await this.supabase
      .from('chat_transfers')
      .select('id')
      .eq('agent_id', agentId)
      .eq('status', 'active');

    const { data: queuedTickets } = await this.supabase
      .from('support_tickets')
      .select('id')
      .eq('assigned_agent_id', agentId)
      .in('status', ['open', 'assigned']);

    const activeCount = activeChats?.length || 0;
    const queuedCount = queuedTickets?.length || 0;
    const utilizationScore = Math.min(activeCount * 20 + queuedCount * 10, 100);

    this.agentWorkloads.set(agentId, {
      activeChats: activeCount,
      queuedTickets: queuedCount,
      utilizationScore,
    });
  }

  private updateAgentWorkload(agentId: string, deltaChats: number): void {
    const current = this.agentWorkloads.get(agentId) || {
      activeChats: 0,
      queuedTickets: 0,
      utilizationScore: 0,
    };

    current.activeChats += deltaChats;
    current.utilizationScore = Math.min(
      current.activeChats * 20 + current.queuedTickets * 10,
      100,
    );

    this.agentWorkloads.set(agentId, current);
  }

  private async sendEscalationNotifications(
    ticket: SupportTicket,
    agent?: SupportAgent,
  ): Promise<void> {
    try {
      // Send notification to assigned agent
      if (agent) {
        await this.supabase.channel(`agent-${agent.id}`).send({
          type: 'broadcast',
          event: 'ticket_assigned',
          payload: {
            ticketId: ticket.id,
            subject: ticket.subject,
            priority: ticket.priority,
            urgencyScore: (ticket as any).urgencyScore,
          },
        });
      }

      // Send notification to supervisors for high priority tickets
      if (
        ticket.priority === TicketPriority.CRITICAL ||
        ticket.priority === TicketPriority.HIGH
      ) {
        await this.supabase.channel('supervisor-alerts').send({
          type: 'broadcast',
          event: 'high_priority_escalation',
          payload: {
            ticketId: ticket.id,
            priority: ticket.priority,
            assignedAgent: agent?.name || 'Unassigned',
          },
        });
      }
    } catch (error) {
      console.error('Failed to send escalation notifications:', error);
    }
  }

  // Public API methods for managing support workflows
  async getTicketsByAgent(agentId: string): Promise<SupportTicket[]> {
    const { data: tickets, error } = await this.supabase
      .from('support_tickets')
      .select('*')
      .eq('assigned_agent_id', agentId)
      .in('status', ['open', 'assigned', 'in_progress'])
      .order('urgency_score', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch agent tickets: ${error.message}`);
    }

    return tickets.map(this.mapTicketFromDB);
  }

  async updateTicketStatus(
    ticketId: string,
    status: string,
    agentNotes?: string,
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (agentNotes) {
      updateData.agent_notes = agentNotes;
    }

    const { error } = await this.supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    if (error) {
      throw new Error(`Failed to update ticket status: ${error.message}`);
    }
  }

  private mapTicketFromDB(dbTicket: any): SupportTicket {
    return {
      id: dbTicket.id,
      subject: dbTicket.subject,
      description: dbTicket.description,
      priority: dbTicket.priority as TicketPriority,
      status: dbTicket.status,
      assignedAgentId: dbTicket.assigned_agent_id,
      customerId: dbTicket.customer_id,
      organizationId: dbTicket.organization_id,
      createdAt: new Date(dbTicket.created_at),
      updatedAt: new Date(dbTicket.updated_at),
    };
  }
}
