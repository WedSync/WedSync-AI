/**
 * Intelligent Ticket Routing and Assignment System
 * WS-235: Support Operations Ticket Management System
 *
 * Advanced routing engine that matches tickets to the most suitable agents
 * based on wedding industry expertise, specialties, workload, and availability.
 *
 * Features:
 * - AI-powered skill matching
 * - Wedding industry expertise routing
 * - Dynamic workload balancing
 * - Priority-based assignment
 * - Automatic escalation routing
 * - Real-time availability tracking
 * - Performance-based routing optimization
 */

import { supabase } from '@/lib/supabase';
import { AITicketClassifier, type TicketClassification } from './ai-classifier';
import { slaMonitor } from './sla-monitor';

// Types for routing system
export interface Agent {
  id: string;
  full_name: string;
  email: string;
  specialties: string[];
  wedding_expertise_level:
    | 'beginner'
    | 'intermediate'
    | 'expert'
    | 'specialist';
  vendor_types_handled: string[]; // photographer, venue, etc.
  max_concurrent_tickets: number;
  current_ticket_count: number;
  is_available: boolean;
  shift_start: string;
  shift_end: string;
  timezone: string;
  performance_score: number; // 0-100
  average_response_time: number; // minutes
  average_resolution_time: number; // minutes
  customer_satisfaction_rating: number; // 1-5
  escalation_rate: number; // percentage
  languages: string[];
  tier_access_level:
    | 'free'
    | 'starter'
    | 'professional'
    | 'scale'
    | 'enterprise';
  last_active_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface RoutingRequest {
  ticketId: string;
  classification: TicketClassification;
  userTier: string;
  vendorType?: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  isWeddingEmergency: boolean;
  weddingDate?: Date;
  requestedLanguage?: string;
  previousAgentId?: string; // For continuity
  escalationLevel: number;
  tags: string[];
}

export interface RoutingResult {
  assignedAgentId: string | null;
  agentName?: string;
  routingMethod:
    | 'skill_match'
    | 'workload_balance'
    | 'priority_override'
    | 'escalation'
    | 'fallback';
  confidence: number; // 0-1
  reasoning: string;
  fallbackReason?: string;
  estimatedResponseTime: number; // minutes
  alternativeAgents: string[]; // Backup options
  routingScore: number; // Quality of the match
  warnings: string[]; // Any issues with assignment
}

export interface RoutingConfiguration {
  maxWorkloadPerAgent: number;
  skillMatchWeight: number;
  workloadWeight: number;
  performanceWeight: number;
  experienceWeight: number;
  priorityBoostMultiplier: number;
  weddingEmergencyMultiplier: number;
  continuityBonus: number;
  maxAssignmentDelay: number; // seconds
  fallbackToGeneralist: boolean;
  requireWeddingExpertise: boolean;
}

export class TicketRouter {
  private aiClassifier: AITicketClassifier;
  private config: RoutingConfiguration;
  private agentCache: Map<string, Agent> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.aiClassifier = new AITicketClassifier();
    this.config = {
      maxWorkloadPerAgent: 15,
      skillMatchWeight: 0.4,
      workloadWeight: 0.3,
      performanceWeight: 0.2,
      experienceWeight: 0.1,
      priorityBoostMultiplier: 2.0,
      weddingEmergencyMultiplier: 3.0,
      continuityBonus: 1.5,
      maxAssignmentDelay: 30, // 30 seconds
      fallbackToGeneralist: true,
      requireWeddingExpertise: true,
    };
  }

  /**
   * Main routing method - find the best agent for a ticket
   */
  async routeTicket(request: RoutingRequest): Promise<RoutingResult> {
    try {
      console.log(
        `Routing ticket ${request.ticketId} with priority ${request.priority}`,
      );

      // Get available agents
      const availableAgents = await this.getAvailableAgents(request.userTier);

      if (availableAgents.length === 0) {
        return this.createFallbackResult('No agents available', request);
      }

      // Handle wedding emergencies with immediate escalation
      if (request.isWeddingEmergency) {
        return await this.handleWeddingEmergency(request, availableAgents);
      }

      // Handle escalated tickets
      if (request.escalationLevel > 0) {
        return await this.handleEscalatedTicket(request, availableAgents);
      }

      // Find best agent using intelligent matching
      const bestMatch = await this.findBestAgent(request, availableAgents);

      if (bestMatch.assignedAgentId) {
        // Assign the ticket
        await this.assignTicketToAgent(
          request.ticketId,
          bestMatch.assignedAgentId,
        );
        return bestMatch;
      }

      // Fallback assignment
      return await this.handleFallbackAssignment(request, availableAgents);
    } catch (error) {
      console.error('Ticket routing failed:', error);
      return this.createFallbackResult(
        `Routing error: ${error.message}`,
        request,
      );
    }
  }

  /**
   * Handle wedding day emergencies with special protocols
   */
  private async handleWeddingEmergency(
    request: RoutingRequest,
    availableAgents: Agent[],
  ): Promise<RoutingResult> {
    console.log(
      `WEDDING EMERGENCY: Routing critical ticket ${request.ticketId}`,
    );

    // Find wedding specialists who can handle emergencies
    const specialists = availableAgents
      .filter(
        (agent) =>
          agent.wedding_expertise_level === 'specialist' ||
          agent.wedding_expertise_level === 'expert',
      )
      .sort((a, b) => b.performance_score - a.performance_score);

    if (specialists.length > 0) {
      const bestSpecialist = specialists[0];

      // Even if overloaded, assign wedding emergency
      await this.assignTicketToAgent(request.ticketId, bestSpecialist.id);

      return {
        assignedAgentId: bestSpecialist.id,
        agentName: bestSpecialist.full_name,
        routingMethod: 'priority_override',
        confidence: 1.0,
        reasoning: `Wedding emergency assigned to top wedding specialist ${bestSpecialist.full_name} (expertise: ${bestSpecialist.wedding_expertise_level}, performance: ${bestSpecialist.performance_score})`,
        estimatedResponseTime: 5, // 5 minutes for emergencies
        alternativeAgents: specialists.slice(1, 3).map((a) => a.id),
        routingScore: 100,
        warnings:
          bestSpecialist.current_ticket_count >
          bestSpecialist.max_concurrent_tickets
            ? [
                `Agent ${bestSpecialist.full_name} is overloaded but assigned due to emergency`,
              ]
            : [],
      };
    }

    // Fallback to any available agent for wedding emergency
    const bestAvailable = availableAgents.sort(
      (a, b) => b.performance_score - a.performance_score,
    )[0];

    if (bestAvailable) {
      await this.assignTicketToAgent(request.ticketId, bestAvailable.id);

      return {
        assignedAgentId: bestAvailable.id,
        agentName: bestAvailable.full_name,
        routingMethod: 'priority_override',
        confidence: 0.7,
        reasoning: `Wedding emergency assigned to best available agent ${bestAvailable.full_name} - no wedding specialists available`,
        estimatedResponseTime: 10,
        alternativeAgents: [],
        routingScore: 70,
        warnings: [
          'No wedding specialists available for emergency - assigned to general agent',
        ],
      };
    }

    return this.createFallbackResult(
      'No agents available for wedding emergency',
      request,
    );
  }

  /**
   * Handle escalated tickets requiring senior agents
   */
  private async handleEscalatedTicket(
    request: RoutingRequest,
    availableAgents: Agent[],
  ): Promise<RoutingResult> {
    // Filter agents by escalation level capability
    let eligibleAgents = availableAgents;

    if (request.escalationLevel >= 3) {
      // Level 3: Senior specialists only
      eligibleAgents = availableAgents.filter(
        (agent) =>
          agent.performance_score >= 85 &&
          agent.wedding_expertise_level === 'specialist',
      );
    } else if (request.escalationLevel >= 2) {
      // Level 2: Experts and specialists
      eligibleAgents = availableAgents.filter(
        (agent) =>
          agent.performance_score >= 75 &&
          (agent.wedding_expertise_level === 'expert' ||
            agent.wedding_expertise_level === 'specialist'),
      );
    } else if (request.escalationLevel >= 1) {
      // Level 1: Intermediate and above
      eligibleAgents = availableAgents.filter(
        (agent) =>
          agent.performance_score >= 60 &&
          agent.wedding_expertise_level !== 'beginner',
      );
    }

    if (eligibleAgents.length === 0) {
      return this.createFallbackResult(
        `No agents available for escalation level ${request.escalationLevel}`,
        request,
      );
    }

    return await this.findBestAgent(request, eligibleAgents, true);
  }

  /**
   * Find the best agent using intelligent matching algorithm
   */
  private async findBestAgent(
    request: RoutingRequest,
    availableAgents: Agent[],
    isEscalated: boolean = false,
  ): Promise<RoutingResult> {
    const scoredAgents = availableAgents
      .map((agent) => {
        const score = this.calculateAgentScore(agent, request);
        return { agent, score };
      })
      .sort((a, b) => b.score - a.score);

    if (scoredAgents.length === 0) {
      return this.createFallbackResult('No suitable agents found', request);
    }

    const bestMatch = scoredAgents[0];

    // Check if agent is available (not overloaded)
    if (
      bestMatch.agent.current_ticket_count >=
      bestMatch.agent.max_concurrent_tickets
    ) {
      // For critical/high priority, allow some overload
      if (['critical', 'high'].includes(request.priority)) {
        const warnings = [
          `Agent ${bestMatch.agent.full_name} is at capacity but assigned due to ${request.priority} priority`,
        ];

        await this.assignTicketToAgent(request.ticketId, bestMatch.agent.id);

        return {
          assignedAgentId: bestMatch.agent.id,
          agentName: bestMatch.agent.full_name,
          routingMethod: isEscalated ? 'escalation' : 'skill_match',
          confidence: Math.max(0.6, bestMatch.score / 100),
          reasoning: this.explainAgentSelection(
            bestMatch.agent,
            request,
            bestMatch.score,
          ),
          estimatedResponseTime: this.estimateResponseTime(
            bestMatch.agent,
            request.priority,
          ),
          alternativeAgents: scoredAgents.slice(1, 3).map((s) => s.agent.id),
          routingScore: bestMatch.score,
          warnings,
        };
      }

      // Try next best agent
      for (let i = 1; i < scoredAgents.length; i++) {
        const candidate = scoredAgents[i];
        if (
          candidate.agent.current_ticket_count <
          candidate.agent.max_concurrent_tickets
        ) {
          await this.assignTicketToAgent(request.ticketId, candidate.agent.id);

          return {
            assignedAgentId: candidate.agent.id,
            agentName: candidate.agent.full_name,
            routingMethod: isEscalated ? 'escalation' : 'workload_balance',
            confidence: candidate.score / 100,
            reasoning: this.explainAgentSelection(
              candidate.agent,
              request,
              candidate.score,
            ),
            estimatedResponseTime: this.estimateResponseTime(
              candidate.agent,
              request.priority,
            ),
            alternativeAgents: [bestMatch.agent.id],
            routingScore: candidate.score,
            warnings: [
              `Best match ${bestMatch.agent.full_name} was overloaded`,
            ],
          };
        }
      }

      return this.createFallbackResult(
        'All suitable agents are overloaded',
        request,
      );
    }

    // Assign to best match
    await this.assignTicketToAgent(request.ticketId, bestMatch.agent.id);

    return {
      assignedAgentId: bestMatch.agent.id,
      agentName: bestMatch.agent.full_name,
      routingMethod: isEscalated ? 'escalation' : 'skill_match',
      confidence: bestMatch.score / 100,
      reasoning: this.explainAgentSelection(
        bestMatch.agent,
        request,
        bestMatch.score,
      ),
      estimatedResponseTime: this.estimateResponseTime(
        bestMatch.agent,
        request.priority,
      ),
      alternativeAgents: scoredAgents.slice(1, 3).map((s) => s.agent.id),
      routingScore: bestMatch.score,
      warnings: [],
    };
  }

  /**
   * Calculate agent suitability score for a ticket
   */
  private calculateAgentScore(agent: Agent, request: RoutingRequest): number {
    let score = 0;
    const weights = this.config;

    // 1. Skill matching (40% weight)
    const skillScore = this.calculateSkillMatch(agent, request);
    score += skillScore * weights.skillMatchWeight;

    // 2. Workload balance (30% weight)
    const workloadScore = this.calculateWorkloadScore(agent);
    score += workloadScore * weights.workloadWeight;

    // 3. Performance history (20% weight)
    const performanceScore = agent.performance_score;
    score += performanceScore * weights.performanceWeight;

    // 4. Wedding expertise (10% weight)
    const experienceScore = this.calculateExperienceScore(agent, request);
    score += experienceScore * weights.experienceWeight;

    // Apply priority boosts
    if (request.priority === 'critical') {
      score *= weights.priorityBoostMultiplier;
    } else if (request.priority === 'high') {
      score *= 1.5;
    }

    // Wedding emergency boost
    if (request.isWeddingEmergency) {
      score *= weights.weddingEmergencyMultiplier;
    }

    // Continuity bonus (same agent as before)
    if (request.previousAgentId === agent.id) {
      score *= weights.continuityBonus;
    }

    // Tier access penalty
    if (!this.canHandleTier(agent, request.userTier)) {
      score *= 0.5; // Reduce score if agent can't properly handle tier
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Calculate skill matching score
   */
  private calculateSkillMatch(agent: Agent, request: RoutingRequest): number {
    let skillScore = 0;

    // Category matching
    const categoryKeywords = this.getCategoryKeywords(
      request.classification.category,
    );
    const agentSpecialties = agent.specialties.map((s) => s.toLowerCase());

    const matchingSpecialties = categoryKeywords.filter((keyword) =>
      agentSpecialties.some((specialty) => specialty.includes(keyword)),
    );

    skillScore += (matchingSpecialties.length / categoryKeywords.length) * 30;

    // Vendor type matching
    if (
      request.vendorType &&
      agent.vendor_types_handled.includes(request.vendorType)
    ) {
      skillScore += 25;
    }

    // Type expertise (bug, billing, etc.)
    const typeSpecialties = this.getTypeSpecialties(
      request.classification.type,
    );
    const hasTypeExpertise = typeSpecialties.some((specialty) =>
      agentSpecialties.includes(specialty.toLowerCase()),
    );

    if (hasTypeExpertise) {
      skillScore += 20;
    }

    // Language matching
    if (
      request.requestedLanguage &&
      agent.languages.includes(request.requestedLanguage)
    ) {
      skillScore += 15;
    }

    // Tag-based matching
    const tagMatches = request.tags.filter((tag) =>
      agentSpecialties.some((specialty) =>
        specialty.includes(tag.toLowerCase()),
      ),
    ).length;

    skillScore += Math.min(10, tagMatches * 2);

    return Math.min(100, skillScore);
  }

  /**
   * Calculate workload balance score (higher score = less loaded)
   */
  private calculateWorkloadScore(agent: Agent): number {
    const utilizationRate =
      agent.current_ticket_count / agent.max_concurrent_tickets;

    // Higher score for less utilized agents
    return Math.max(0, 100 - utilizationRate * 100);
  }

  /**
   * Calculate experience/expertise score
   */
  private calculateExperienceScore(
    agent: Agent,
    request: RoutingRequest,
  ): number {
    let score = 0;

    // Wedding expertise level
    const expertiseLevels = {
      specialist: 100,
      expert: 80,
      intermediate: 60,
      beginner: 30,
    };

    score += expertiseLevels[agent.wedding_expertise_level] || 0;

    // Performance metrics bonus
    if (agent.customer_satisfaction_rating >= 4.5) score += 20;
    if (agent.escalation_rate < 10) score += 15; // Low escalation is good
    if (agent.average_response_time < 30) score += 10; // Fast response

    return Math.min(100, score);
  }

  /**
   * Check if agent can handle user tier
   */
  private canHandleTier(agent: Agent, userTier: string): boolean {
    const tierLevels = {
      free: 1,
      starter: 2,
      professional: 3,
      scale: 4,
      enterprise: 5,
    };

    const agentLevel = tierLevels[agent.tier_access_level] || 1;
    const requestLevel = tierLevels[userTier] || 1;

    return agentLevel >= requestLevel;
  }

  /**
   * Get category-specific keywords
   */
  private getCategoryKeywords(category: string): string[] {
    const categoryMap: Record<string, string[]> = {
      form_builder: ['forms', 'builder', 'fields', 'validation'],
      journey_canvas: ['journey', 'automation', 'workflow', 'canvas'],
      email_system: ['email', 'templates', 'delivery', 'bounce'],
      billing: ['billing', 'payment', 'invoice', 'subscription'],
      bug: ['technical', 'error', 'issue', 'troubleshooting'],
      data_loss: ['data', 'recovery', 'backup', 'migration'],
      security: ['security', 'breach', 'unauthorized', 'hack'],
      integration: ['integration', 'api', 'sync', 'connection'],
      performance: ['performance', 'speed', 'optimization', 'slowness'],
    };

    return categoryMap[category] || ['general'];
  }

  /**
   * Get type-specific specialties
   */
  private getTypeSpecialties(type: string): string[] {
    const typeMap: Record<string, string[]> = {
      bug: ['technical_support', 'troubleshooting', 'debugging'],
      billing: ['billing_specialist', 'payment_processing', 'subscriptions'],
      feature_request: ['product_specialist', 'feature_planning'],
      question: ['customer_success', 'training', 'onboarding'],
      onboarding: ['onboarding_specialist', 'training', 'setup'],
      technical: ['technical_support', 'integration', 'api_support'],
    };

    return typeMap[type] || ['general_support'];
  }

  /**
   * Explain why an agent was selected
   */
  private explainAgentSelection(
    agent: Agent,
    request: RoutingRequest,
    score: number,
  ): string {
    const reasons: string[] = [];

    reasons.push(
      `Agent ${agent.full_name} selected with score ${score.toFixed(1)}/100`,
    );
    reasons.push(`Wedding expertise: ${agent.wedding_expertise_level}`);
    reasons.push(`Performance score: ${agent.performance_score}/100`);
    reasons.push(
      `Current workload: ${agent.current_ticket_count}/${agent.max_concurrent_tickets}`,
    );

    if (
      request.vendorType &&
      agent.vendor_types_handled.includes(request.vendorType)
    ) {
      reasons.push(`Handles ${request.vendorType} vendors`);
    }

    if (agent.specialties.length > 0) {
      reasons.push(`Specialties: ${agent.specialties.join(', ')}`);
    }

    return reasons.join('; ');
  }

  /**
   * Estimate response time based on agent and priority
   */
  private estimateResponseTime(agent: Agent, priority: string): number {
    let baseTime = agent.average_response_time;

    // Adjust based on priority
    const priorityMultipliers = {
      critical: 0.25,
      high: 0.5,
      medium: 1.0,
      low: 2.0,
    };

    return Math.ceil(
      baseTime *
        (priorityMultipliers[priority as keyof typeof priorityMultipliers] ||
          1.0),
    );
  }

  /**
   * Assign ticket to agent and update workload
   */
  private async assignTicketToAgent(
    ticketId: string,
    agentId: string,
  ): Promise<void> {
    try {
      // Update ticket with agent assignment
      const { error: ticketError } = await supabase
        .from('support_tickets')
        .update({
          assigned_agent_id: agentId,
          status: 'in_progress',
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      if (ticketError) {
        console.error('Failed to assign ticket to agent:', ticketError);
        throw ticketError;
      }

      // Update agent workload
      const { error: agentError } = await supabase
        .from('support_agents')
        .update({
          current_ticket_count: supabase.raw('current_ticket_count + 1'),
          last_active_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', agentId);

      if (agentError) {
        console.error('Failed to update agent workload:', agentError);
      }

      // Record assignment event
      await supabase.from('ticket_sla_events').insert({
        ticket_id: ticketId,
        event_type: 'assignment',
        agent_id: agentId,
        notes: `Ticket assigned to agent ${agentId}`,
      });

      console.log(`Ticket ${ticketId} assigned to agent ${agentId}`);
    } catch (error) {
      console.error('Error assigning ticket to agent:', error);
      throw error;
    }
  }

  /**
   * Get available agents for a specific tier
   */
  private async getAvailableAgents(userTier: string): Promise<Agent[]> {
    // Check cache first
    if (
      Date.now() - this.lastCacheUpdate.getTime() < this.cacheTimeout &&
      this.agentCache.size > 0
    ) {
      return Array.from(this.agentCache.values()).filter(
        (agent) => agent.is_available && this.canHandleTier(agent, userTier),
      );
    }

    try {
      const { data: agents, error } = await supabase
        .from('support_agents')
        .select('*')
        .eq('is_available', true)
        .order('performance_score', { ascending: false });

      if (error) {
        console.error('Failed to fetch available agents:', error);
        return [];
      }

      if (!agents) {
        return [];
      }

      // Update cache
      this.agentCache.clear();
      agents.forEach((agent) => {
        this.agentCache.set(agent.id, {
          ...agent,
          last_active_at: new Date(agent.last_active_at),
          created_at: new Date(agent.created_at),
          updated_at: new Date(agent.updated_at),
        });
      });
      this.lastCacheUpdate = new Date();

      // Filter by tier capability
      return agents.filter((agent) => this.canHandleTier(agent, userTier));
    } catch (error) {
      console.error('Error fetching available agents:', error);
      return [];
    }
  }

  /**
   * Handle fallback assignment when no suitable agents found
   */
  private async handleFallbackAssignment(
    request: RoutingRequest,
    availableAgents: Agent[],
  ): Promise<RoutingResult> {
    if (this.config.fallbackToGeneralist && availableAgents.length > 0) {
      // Assign to least loaded agent as fallback
      const leastLoaded = availableAgents.sort(
        (a, b) => a.current_ticket_count - b.current_ticket_count,
      )[0];

      await this.assignTicketToAgent(request.ticketId, leastLoaded.id);

      return {
        assignedAgentId: leastLoaded.id,
        agentName: leastLoaded.full_name,
        routingMethod: 'fallback',
        confidence: 0.5,
        reasoning: `Fallback assignment to ${leastLoaded.full_name} (least loaded agent)`,
        estimatedResponseTime:
          this.estimateResponseTime(leastLoaded, request.priority) * 1.5,
        alternativeAgents: [],
        routingScore: 50,
        warnings: [
          'No agents with matching skills available - assigned to generalist',
        ],
      };
    }

    return this.createFallbackResult(
      'No agents available for fallback assignment',
      request,
    );
  }

  /**
   * Create fallback result for unassigned tickets
   */
  private createFallbackResult(
    reason: string,
    request: RoutingRequest,
  ): RoutingResult {
    return {
      assignedAgentId: null,
      routingMethod: 'fallback',
      confidence: 0,
      reasoning: reason,
      fallbackReason: reason,
      estimatedResponseTime: 999,
      alternativeAgents: [],
      routingScore: 0,
      warnings: [reason, 'Ticket will remain in unassigned queue'],
    };
  }

  /**
   * Reassign ticket to different agent (for escalation/workload changes)
   */
  async reassignTicket(
    ticketId: string,
    currentAgentId: string,
    reason: string = 'Reassignment',
  ): Promise<RoutingResult> {
    try {
      // Get ticket details
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .select(
          `
          *,
          user_profiles!support_tickets_user_id_fkey (user_tier)
        `,
        )
        .eq('id', ticketId)
        .single();

      if (error || !ticket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      // Decrease current agent's workload
      await supabase
        .from('support_agents')
        .update({
          current_ticket_count: supabase.raw('current_ticket_count - 1'),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentAgentId);

      // Create new routing request
      const routingRequest: RoutingRequest = {
        ticketId,
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
        escalationLevel: ticket.escalation_level || 0,
        tags: ticket.tags || [],
        previousAgentId: currentAgentId, // Exclude from reassignment
      };

      // Find new agent (exclude current agent)
      const result = await this.routeTicket({
        ...routingRequest,
        previousAgentId: undefined, // Don't give continuity bonus to same agent
      });

      // Record reassignment event
      await supabase.from('ticket_sla_events').insert({
        ticket_id: ticketId,
        event_type: 'reassignment',
        agent_id: result.assignedAgentId,
        event_data: {
          previous_agent_id: currentAgentId,
          reason,
          routing_method: result.routingMethod,
        },
        notes: `Ticket reassigned from ${currentAgentId} to ${result.assignedAgentId}: ${reason}`,
      });

      console.log(
        `Ticket ${ticketId} reassigned from ${currentAgentId} to ${result.assignedAgentId}`,
      );
      return result;
    } catch (error) {
      console.error('Error reassigning ticket:', error);
      throw error;
    }
  }

  /**
   * Get routing statistics and performance metrics
   */
  async getRoutingMetrics(): Promise<any> {
    // This would return comprehensive routing metrics
    // for performance monitoring and optimization
    return {
      totalRoutings: 0,
      successfulAssignments: 0,
      fallbackAssignments: 0,
      averageRoutingTime: 0,
      agentUtilization: {},
      skillMatchAccuracy: 0,
      reassignmentRate: 0,
    };
  }
}

// Singleton instance for global use
export const ticketRouter = new TicketRouter();

export default TicketRouter;
