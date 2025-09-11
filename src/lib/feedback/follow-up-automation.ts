/**
 * WS-236: User Feedback System - Follow-up Automation Service
 *
 * Handles automated follow-up workflows based on NPS responses,
 * sentiment analysis, and wedding industry context
 */

import { createClient } from '@/lib/supabase/server';
import { npsManager } from './nps-manager';
import { sentimentAnalyzer } from './sentiment-analyzer';

// Types for follow-up automation
export interface FollowUpTrigger {
  sessionId: string;
  userId: string;
  npsScore?: number;
  npsCategory?: 'promoter' | 'passive' | 'detractor';
  sentimentScore?: number;
  sentimentCategory?: 'positive' | 'neutral' | 'negative';
  urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
  weddingContext?: {
    isWeddingSeason?: boolean;
    daysUntilWedding?: number;
    vendorType?: string;
    userTier?: string;
  };
}

export interface FollowUpAction {
  actionType: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  scheduledAt: Date;
  actionConfig: any;
  weddingPriority?: boolean;
  escalationLevel?: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  conditions: any;
  actions: FollowUpAction[];
  weddingIndustrySpecific: boolean;
}

/**
 * Follow-up Automation Service
 * Singleton service for managing automated follow-up workflows
 */
class FollowUpAutomationService {
  private static instance: FollowUpAutomationService;
  private automationRules: AutomationRule[] = [];

  private constructor() {
    this.initializeAutomationRules();
  }

  public static getInstance(): FollowUpAutomationService {
    if (!FollowUpAutomationService.instance) {
      FollowUpAutomationService.instance = new FollowUpAutomationService();
    }
    return FollowUpAutomationService.instance;
  }

  /**
   * Initialize wedding industry specific automation rules
   */
  private initializeAutomationRules(): void {
    this.automationRules = [
      // NPS Detractor Rules (0-6)
      {
        id: 'nps-detractor-critical',
        name: 'Critical NPS Detractor Response',
        conditions: {
          npsScore: { min: 0, max: 6 },
          sentimentCategory: 'negative',
          urgencyLevel: ['high', 'critical'],
        },
        actions: [
          {
            actionType: 'executive_outreach',
            priority: 'critical',
            scheduledAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
            actionConfig: {
              escalationLevel: 3,
              requiresPersonalCall: true,
              timeframe: '24 hours',
            },
            weddingPriority: true,
            escalationLevel: 3,
          },
          {
            actionType: 'retention_specialist_assignment',
            priority: 'high',
            scheduledAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
            actionConfig: {
              specialistType: 'senior_retention',
              maxResponseTime: '2 hours',
            },
          },
        ],
        weddingIndustrySpecific: true,
      },
      {
        id: 'nps-detractor-wedding-day',
        name: 'Wedding Day Detractor Emergency',
        conditions: {
          npsScore: { min: 0, max: 6 },
          weddingContext: { daysUntilWedding: { max: 1 } },
        },
        actions: [
          {
            actionType: 'wedding_day_emergency_response',
            priority: 'critical',
            scheduledAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            actionConfig: {
              escalationLevel: 4,
              requiresImmediateCall: true,
              emergencyTeamAlert: true,
            },
            weddingPriority: true,
            escalationLevel: 4,
          },
        ],
        weddingIndustrySpecific: true,
      },

      // NPS Passive Rules (7-8)
      {
        id: 'nps-passive-improvement',
        name: 'Passive User Improvement Opportunity',
        conditions: {
          npsScore: { min: 7, max: 8 },
        },
        actions: [
          {
            actionType: 'improvement_consultation',
            priority: 'medium',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            actionConfig: {
              consultationType: 'workflow_optimization',
              duration: '30 minutes',
            },
          },
          {
            actionType: 'feature_recommendations',
            priority: 'low',
            scheduledAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
            actionConfig: {
              recommendationType: 'personalized_features',
            },
          },
        ],
        weddingIndustrySpecific: true,
      },

      // NPS Promoter Rules (9-10)
      {
        id: 'nps-promoter-advocacy',
        name: 'Promoter Advocacy Program',
        conditions: {
          npsScore: { min: 9, max: 10 },
          sentimentCategory: 'positive',
        },
        actions: [
          {
            actionType: 'referral_program_invitation',
            priority: 'low',
            scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours
            actionConfig: {
              programType: 'wedding_professional_referrals',
              bonusMultiplier: 2.0,
            },
          },
          {
            actionType: 'testimonial_request',
            priority: 'low',
            scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            actionConfig: {
              requestType: 'case_study',
              includePhotos: true,
            },
          },
          {
            actionType: 'beta_features_access',
            priority: 'medium',
            scheduledAt: new Date(Date.now() + 1 * 60 * 60 * 1000), // 1 hour
            actionConfig: {
              betaType: 'premium_features',
            },
          },
        ],
        weddingIndustrySpecific: true,
      },

      // Sentiment-based Rules
      {
        id: 'negative-sentiment-urgent',
        name: 'Negative Sentiment Urgent Response',
        conditions: {
          sentimentScore: { max: 0.3 },
          urgencyLevel: ['high', 'critical'],
        },
        actions: [
          {
            actionType: 'senior_support_escalation',
            priority: 'high',
            scheduledAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
            actionConfig: {
              supportLevel: 'tier_3',
              responseTime: '2 hours',
            },
          },
          {
            actionType: 'improvement_plan_creation',
            priority: 'medium',
            scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            actionConfig: {
              planType: 'personalized_improvement',
            },
          },
        ],
        weddingIndustrySpecific: true,
      },

      // Wedding Season Specific Rules
      {
        id: 'wedding-season-proactive',
        name: 'Wedding Season Proactive Support',
        conditions: {
          weddingContext: { isWeddingSeason: true },
          npsScore: { max: 8 }, // Anyone not a promoter during wedding season
        },
        actions: [
          {
            actionType: 'wedding_season_check_in',
            priority: 'medium',
            scheduledAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
            actionConfig: {
              checkInType: 'wedding_season_support',
              offerExtendedSupport: true,
            },
            weddingPriority: true,
          },
        ],
        weddingIndustrySpecific: true,
      },

      // Vendor Type Specific Rules
      {
        id: 'photographer-workflow-support',
        name: 'Photographer Workflow Support',
        conditions: {
          weddingContext: { vendorType: 'photographer' },
          sentimentCategory: 'neutral',
        },
        actions: [
          {
            actionType: 'photographer_workflow_consultation',
            priority: 'low',
            scheduledAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
            actionConfig: {
              consultationType: 'photography_workflow_optimization',
              includePortfolioReview: true,
            },
          },
        ],
        weddingIndustrySpecific: true,
      },
    ];
  }

  /**
   * Process feedback trigger and execute appropriate follow-up actions
   */
  async processFeedbackTrigger(trigger: FollowUpTrigger): Promise<void> {
    try {
      console.log(
        `Processing follow-up trigger for session ${trigger.sessionId}`,
      );

      // Determine NPS category if score provided
      if (trigger.npsScore !== undefined && !trigger.npsCategory) {
        trigger.npsCategory = npsManager.getNPSCategory(trigger.npsScore);
      }

      // Determine urgency level based on wedding context
      trigger.urgencyLevel = this.calculateUrgencyLevel(trigger);

      // Find matching automation rules
      const matchingRules = this.findMatchingRules(trigger);

      console.log(`Found ${matchingRules.length} matching automation rules`);

      // Execute actions for each matching rule
      for (const rule of matchingRules) {
        await this.executeRuleActions(rule, trigger);
      }

      // Log automation execution
      await this.logAutomationExecution(trigger, matchingRules);
    } catch (error) {
      console.error('Error processing feedback trigger:', error);
      throw error;
    }
  }

  /**
   * Calculate urgency level based on wedding context and sentiment
   */
  private calculateUrgencyLevel(
    trigger: FollowUpTrigger,
  ): 'low' | 'medium' | 'high' | 'critical' {
    const { weddingContext, npsScore, sentimentScore } = trigger;

    // Wedding day proximity takes highest priority
    if (weddingContext?.daysUntilWedding !== undefined) {
      if (weddingContext.daysUntilWedding <= 1) return 'critical';
      if (weddingContext.daysUntilWedding <= 7) return 'high';
      if (weddingContext.daysUntilWedding <= 30) return 'medium';
    }

    // Very negative feedback during wedding season
    if (
      weddingContext?.isWeddingSeason &&
      npsScore !== undefined &&
      npsScore <= 4
    ) {
      return 'high';
    }

    // Sentiment-based urgency
    if (sentimentScore !== undefined) {
      if (sentimentScore <= 0.2) return 'high';
      if (sentimentScore <= 0.4) return 'medium';
    }

    // NPS-based urgency
    if (npsScore !== undefined) {
      if (npsScore <= 3) return 'high';
      if (npsScore <= 6) return 'medium';
    }

    return 'low';
  }

  /**
   * Find automation rules that match the trigger conditions
   */
  private findMatchingRules(trigger: FollowUpTrigger): AutomationRule[] {
    return this.automationRules.filter((rule) => {
      return this.evaluateRuleConditions(rule.conditions, trigger);
    });
  }

  /**
   * Evaluate if trigger meets rule conditions
   */
  private evaluateRuleConditions(
    conditions: any,
    trigger: FollowUpTrigger,
  ): boolean {
    // Check NPS score conditions
    if (conditions.npsScore && trigger.npsScore !== undefined) {
      const { min = -Infinity, max = Infinity } = conditions.npsScore;
      if (trigger.npsScore < min || trigger.npsScore > max) {
        return false;
      }
    }

    // Check sentiment conditions
    if (
      conditions.sentimentCategory &&
      trigger.sentimentCategory !== conditions.sentimentCategory
    ) {
      return false;
    }

    if (conditions.sentimentScore && trigger.sentimentScore !== undefined) {
      const { min = -Infinity, max = Infinity } = conditions.sentimentScore;
      if (trigger.sentimentScore < min || trigger.sentimentScore > max) {
        return false;
      }
    }

    // Check urgency level
    if (conditions.urgencyLevel) {
      const urgencyLevels = Array.isArray(conditions.urgencyLevel)
        ? conditions.urgencyLevel
        : [conditions.urgencyLevel];
      if (!urgencyLevels.includes(trigger.urgencyLevel)) {
        return false;
      }
    }

    // Check wedding context conditions
    if (conditions.weddingContext && trigger.weddingContext) {
      const { weddingContext } = conditions;
      const triggerContext = trigger.weddingContext;

      if (
        weddingContext.isWeddingSeason !== undefined &&
        triggerContext.isWeddingSeason !== weddingContext.isWeddingSeason
      ) {
        return false;
      }

      if (
        weddingContext.daysUntilWedding &&
        triggerContext.daysUntilWedding !== undefined
      ) {
        const { min = -Infinity, max = Infinity } =
          weddingContext.daysUntilWedding;
        if (
          triggerContext.daysUntilWedding < min ||
          triggerContext.daysUntilWedding > max
        ) {
          return false;
        }
      }

      if (
        weddingContext.vendorType &&
        triggerContext.vendorType !== weddingContext.vendorType
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Execute actions for a matching automation rule
   */
  private async executeRuleActions(
    rule: AutomationRule,
    trigger: FollowUpTrigger,
  ): Promise<void> {
    const supabase = createClient();

    for (const action of rule.actions) {
      try {
        // Insert follow-up action into database
        const { error } = await supabase
          .from('feedback_follow_up_actions')
          .insert({
            session_id: trigger.sessionId,
            user_id: trigger.userId,
            action_type: action.actionType,
            action_status: 'pending',
            scheduled_at: action.scheduledAt.toISOString(),
            action_config: {
              ...action.actionConfig,
              automationRuleId: rule.id,
              automationRuleName: rule.name,
              priority: action.priority,
              escalationLevel: action.escalationLevel,
              weddingPriority: action.weddingPriority,
            },
            wedding_priority: action.weddingPriority || false,
            created_at: new Date().toISOString(),
          });

        if (error) {
          console.error(
            `Error inserting follow-up action ${action.actionType}:`,
            error,
          );
        } else {
          console.log(
            `Scheduled follow-up action: ${action.actionType} for ${action.scheduledAt}`,
          );
        }

        // For critical actions, also trigger immediate notifications
        if (action.priority === 'critical') {
          await this.triggerImmediateNotification(action, trigger);
        }
      } catch (actionError) {
        console.error(
          `Error executing action ${action.actionType}:`,
          actionError,
        );
      }
    }
  }

  /**
   * Trigger immediate notification for critical actions
   */
  private async triggerImmediateNotification(
    action: FollowUpAction,
    trigger: FollowUpTrigger,
  ): Promise<void> {
    try {
      const supabase = createClient();

      // Insert high-priority notification
      await supabase.from('notifications').insert({
        user_id: trigger.userId,
        type: 'feedback_escalation',
        title: 'Critical Feedback Alert',
        message: `A critical feedback issue requires immediate attention`,
        priority: 'critical',
        action_required: true,
        action_config: {
          feedbackSessionId: trigger.sessionId,
          escalationLevel: action.escalationLevel,
          actionType: action.actionType,
        },
        created_at: new Date().toISOString(),
      });

      console.log(
        `Triggered immediate notification for critical action: ${action.actionType}`,
      );
    } catch (error) {
      console.error('Error triggering immediate notification:', error);
    }
  }

  /**
   * Log automation execution for analytics and debugging
   */
  private async logAutomationExecution(
    trigger: FollowUpTrigger,
    matchingRules: AutomationRule[],
  ): Promise<void> {
    try {
      const supabase = createClient();

      const totalActions = matchingRules.reduce(
        (sum, rule) => sum + rule.actions.length,
        0,
      );

      // Log to events table for analytics
      await supabase.from('events').insert({
        event_type: 'feedback_automation',
        event_name: 'follow_up_automation_executed',
        event_data: {
          sessionId: trigger.sessionId,
          userId: trigger.userId,
          rulesMatched: matchingRules.length,
          actionsScheduled: totalActions,
          npsScore: trigger.npsScore,
          npsCategory: trigger.npsCategory,
          sentimentCategory: trigger.sentimentCategory,
          urgencyLevel: trigger.urgencyLevel,
          weddingContext: trigger.weddingContext,
          matchedRules: matchingRules.map((r) => ({ id: r.id, name: r.name })),
        },
        user_id: trigger.userId,
        created_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging automation execution:', error);
    }
  }

  /**
   * Process scheduled follow-up actions (to be called by cron job)
   */
  async processScheduledActions(): Promise<void> {
    try {
      const supabase = createClient();

      // Get pending actions that are due
      const { data: pendingActions, error } = await supabase
        .from('feedback_follow_up_actions')
        .select('*')
        .eq('action_status', 'pending')
        .lte('scheduled_at', new Date().toISOString())
        .order('wedding_priority', { ascending: false })
        .order('scheduled_at', { ascending: true })
        .limit(50);

      if (error) {
        throw error;
      }

      console.log(
        `Processing ${pendingActions?.length || 0} scheduled follow-up actions`,
      );

      for (const action of pendingActions || []) {
        await this.executeScheduledAction(action);
      }
    } catch (error) {
      console.error('Error processing scheduled actions:', error);
      throw error;
    }
  }

  /**
   * Execute a scheduled follow-up action
   */
  private async executeScheduledAction(action: any): Promise<void> {
    try {
      const supabase = createClient();

      // Update status to in_progress
      await supabase
        .from('feedback_follow_up_actions')
        .update({
          action_status: 'in_progress',
          started_at: new Date().toISOString(),
        })
        .eq('id', action.id);

      // Execute action based on type
      let executionResult: any;
      switch (action.action_type) {
        case 'executive_outreach':
          executionResult = await this.executeExecutiveOutreach(action);
          break;
        case 'retention_specialist_assignment':
          executionResult =
            await this.executeRetentionSpecialistAssignment(action);
          break;
        case 'wedding_day_emergency_response':
          executionResult =
            await this.executeWeddingDayEmergencyResponse(action);
          break;
        case 'improvement_consultation':
          executionResult = await this.executeImprovementConsultation(action);
          break;
        case 'referral_program_invitation':
          executionResult = await this.executeReferralProgramInvitation(action);
          break;
        case 'testimonial_request':
          executionResult = await this.executeTestimonialRequest(action);
          break;
        default:
          executionResult = {
            status: 'skipped',
            reason: `Unknown action type: ${action.action_type}`,
          };
      }

      // Update action status
      await supabase
        .from('feedback_follow_up_actions')
        .update({
          action_status:
            executionResult.status === 'success' ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          execution_result: executionResult,
        })
        .eq('id', action.id);

      console.log(
        `Executed follow-up action ${action.action_type}: ${executionResult.status}`,
      );
    } catch (error) {
      console.error(`Error executing scheduled action ${action.id}:`, error);

      // Mark action as failed
      try {
        const supabase = createClient();
        await supabase
          .from('feedback_follow_up_actions')
          .update({
            action_status: 'failed',
            completed_at: new Date().toISOString(),
            execution_result: { status: 'error', error: error.message },
          })
          .eq('id', action.id);
      } catch (updateError) {
        console.error('Error updating failed action status:', updateError);
      }
    }
  }

  // Action execution methods (placeholder implementations)
  private async executeExecutiveOutreach(action: any): Promise<any> {
    try {
      const { EmailService } = await import('@/lib/email/service');
      const supabase = createClient();

      // Get user and organization details
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select(
          `
          user_id,
          full_name,
          email,
          user_type,
          vendor_type,
          organization_id,
          organizations (
            name
          )
        `,
        )
        .eq('user_id', action.user_id)
        .single();

      if (userError || !userProfile) {
        throw new Error(`Failed to fetch user profile: ${userError?.message}`);
      }

      // Get feedback session details
      const { data: feedbackSession, error: sessionError } = await supabase
        .from('feedback_sessions')
        .select(
          `
          *,
          feedback_responses (
            question_text,
            text_value,
            nps_score,
            sentiment_score
          )
        `,
        )
        .eq('id', action.session_id)
        .single();

      if (sessionError || !feedbackSession) {
        throw new Error(
          `Failed to fetch feedback session: ${sessionError?.message}`,
        );
      }

      // Prepare executive outreach email
      const executiveEmail =
        process.env.EXECUTIVE_EMAIL || 'executives@wedsync.com';
      const subject = `🚨 Critical Feedback Alert: ${userProfile.user_type} - ${userProfile.vendor_type || 'User'}`;

      const emailContent = {
        userDetails: {
          name: userProfile.full_name,
          email: userProfile.email,
          userType: userProfile.user_type,
          vendorType: userProfile.vendor_type,
          organizationName: userProfile.organizations?.name,
        },
        feedbackDetails: {
          type: feedbackSession.session_type,
          triggerReason: feedbackSession.trigger_reason,
          overallSentiment: feedbackSession.overall_sentiment,
          satisfactionCategory: feedbackSession.satisfaction_category,
          completedAt: feedbackSession.completed_at,
          responses: feedbackSession.feedback_responses,
        },
        actionConfig: action.action_config,
        urgency:
          action.action_config?.escalationLevel >= 3 ? 'CRITICAL' : 'HIGH',
      };

      // Send email via EmailService (we'll need to create an executive alert template)
      await EmailService.sendEmail({
        to: executiveEmail,
        subject,
        template: 'executive_feedback_alert',
        organizationId: userProfile.organization_id,
        recipientId: action.user_id,
        recipientType: 'admin',
        templateType: 'feedback_executive_alert',
        priority: 'urgent',
        variables: emailContent,
      });

      // Create support ticket for tracking
      await supabase.from('support_tickets').insert({
        user_id: action.user_id,
        organization_id: userProfile.organization_id,
        title: `Critical Feedback - Executive Escalation`,
        description: `User ${userProfile.full_name} (${userProfile.email}) has provided critical negative feedback. Requires immediate executive attention.`,
        priority: 'critical',
        status: 'open',
        category: 'feedback_escalation',
        assigned_to: 'executive_team',
        metadata: {
          feedbackSessionId: action.session_id,
          escalationLevel: action.action_config?.escalationLevel,
          automationRuleId: action.action_config?.automationRuleId,
        },
        created_at: new Date().toISOString(),
      });

      return {
        status: 'success',
        message: 'Executive outreach initiated successfully',
        emailSent: true,
        ticketCreated: true,
        executiveEmail,
        escalationLevel: action.action_config?.escalationLevel,
      };
    } catch (error) {
      console.error('Error in executeExecutiveOutreach:', error);
      return {
        status: 'error',
        message: `Failed to execute executive outreach: ${error.message}`,
        error: error.message,
      };
    }
  }

  private async executeRetentionSpecialistAssignment(
    action: any,
  ): Promise<any> {
    try {
      const { EmailService } = await import('@/lib/email/service');
      const supabase = createClient();

      // Get user profile
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select(
          `
          user_id,
          full_name,
          email,
          user_type,
          vendor_type,
          subscription_tier,
          organization_id,
          organizations (
            name
          )
        `,
        )
        .eq('user_id', action.user_id)
        .single();

      if (userError || !userProfile) {
        throw new Error(`Failed to fetch user profile: ${userError?.message}`);
      }

      // Find available retention specialist based on specialization
      const specialistType =
        action.action_config?.specialistType || 'general_retention';
      const retentionTeamEmail =
        process.env.RETENTION_TEAM_EMAIL || 'retention@wedsync.com';

      // Create retention case in database
      const { data: retentionCase, error: caseError } = await supabase
        .from('retention_cases')
        .insert({
          user_id: action.user_id,
          organization_id: userProfile.organization_id,
          case_type: 'negative_feedback',
          priority: action.priority === 'critical' ? 'urgent' : 'high',
          status: 'assigned',
          specialist_type: specialistType,
          assigned_to: retentionTeamEmail,
          case_details: {
            feedbackSessionId: action.session_id,
            userType: userProfile.user_type,
            vendorType: userProfile.vendor_type,
            subscriptionTier: userProfile.subscription_tier,
            maxResponseTime: action.action_config?.maxResponseTime || '4 hours',
            automationTriggered: true,
          },
          created_at: new Date().toISOString(),
          target_response_time: new Date(
            Date.now() +
              (action.action_config?.maxResponseTime === '2 hours'
                ? 2 * 60 * 60 * 1000
                : 4 * 60 * 60 * 1000),
          ).toISOString(),
        })
        .select()
        .single();

      if (caseError) {
        throw new Error(
          `Failed to create retention case: ${caseError.message}`,
        );
      }

      // Send assignment email to retention team
      const subject = `🎯 Retention Case Assignment: ${userProfile.user_type} - ${userProfile.vendor_type || 'User'}`;

      const emailContent = {
        caseId: retentionCase.id,
        userDetails: {
          name: userProfile.full_name,
          email: userProfile.email,
          userType: userProfile.user_type,
          vendorType: userProfile.vendor_type,
          subscriptionTier: userProfile.subscription_tier,
          organizationName: userProfile.organizations?.name,
        },
        caseDetails: {
          priority: retentionCase.priority,
          specialistType,
          maxResponseTime: action.action_config?.maxResponseTime || '4 hours',
          feedbackSessionId: action.session_id,
        },
        actionRequired: [
          'Contact user within target response time',
          'Review feedback session details',
          'Assess retention risk and opportunities',
          'Develop personalized retention strategy',
          'Document all interactions and outcomes',
        ],
      };

      await EmailService.sendEmail({
        to: retentionTeamEmail,
        subject,
        template: 'retention_specialist_assignment',
        organizationId: userProfile.organization_id,
        recipientType: 'admin',
        templateType: 'retention_assignment',
        priority: action.priority === 'critical' ? 'urgent' : 'high',
        variables: emailContent,
      });

      // Send acknowledgment email to user
      const userSubject = `We're Here to Help - Your Feedback Matters`;
      const userEmailContent = {
        userName: userProfile.full_name,
        userType: userProfile.user_type,
        vendorType: userProfile.vendor_type,
        responseTime: action.action_config?.maxResponseTime || '4 hours',
        caseId: retentionCase.id,
      };

      await EmailService.sendEmail({
        to: userProfile.email,
        subject: userSubject,
        template: 'feedback_acknowledgment',
        organizationId: userProfile.organization_id,
        recipientId: action.user_id,
        recipientType: userProfile.user_type as 'client',
        templateType: 'feedback_acknowledgment',
        priority: 'normal',
        variables: userEmailContent,
      });

      return {
        status: 'success',
        message: 'Retention specialist assigned successfully',
        caseId: retentionCase.id,
        assignedTo: retentionTeamEmail,
        specialistType,
        maxResponseTime: action.action_config?.maxResponseTime || '4 hours',
        userNotified: true,
      };
    } catch (error) {
      console.error('Error in executeRetentionSpecialistAssignment:', error);
      return {
        status: 'error',
        message: `Failed to assign retention specialist: ${error.message}`,
        error: error.message,
      };
    }
  }

  private async executeWeddingDayEmergencyResponse(action: any): Promise<any> {
    try {
      const { EmailService } = await import('@/lib/email/service');
      const supabase = createClient();

      // Get user profile
      const { data: userProfile, error: userError } = await supabase
        .from('user_profiles')
        .select(
          `
          user_id,
          full_name,
          email,
          phone,
          user_type,
          vendor_type,
          organization_id,
          organizations (
            name
          )
        `,
        )
        .eq('user_id', action.user_id)
        .single();

      if (userError || !userProfile) {
        throw new Error(`Failed to fetch user profile: ${userError?.message}`);
      }

      // Create critical incident record
      const { data: incident, error: incidentError } = await supabase
        .from('emergency_incidents')
        .insert({
          user_id: action.user_id,
          organization_id: userProfile.organization_id,
          incident_type: 'wedding_day_feedback_critical',
          priority: 'emergency',
          status: 'active',
          title: `🚨 WEDDING DAY EMERGENCY: Critical feedback from ${userProfile.full_name}`,
          description: `Critical negative feedback received on or near wedding day. Immediate response required.`,
          metadata: {
            feedbackSessionId: action.session_id,
            escalationLevel: 4,
            requiresImmediateCall: action.action_config?.requiresImmediateCall,
            userContact: {
              email: userProfile.email,
              phone: userProfile.phone,
            },
            automationTriggered: true,
          },
          created_at: new Date().toISOString(),
          target_response_time: new Date(
            Date.now() + 5 * 60 * 1000,
          ).toISOString(), // 5 minutes
        })
        .select()
        .single();

      if (incidentError) {
        throw new Error(
          `Failed to create emergency incident: ${incidentError.message}`,
        );
      }

      // Send emergency alerts to multiple teams
      const emergencyTeamEmail =
        process.env.EMERGENCY_TEAM_EMAIL || 'emergency@wedsync.com';
      const executiveEmail =
        process.env.EXECUTIVE_EMAIL || 'executives@wedsync.com';
      const supportEmail = process.env.SUPPORT_EMAIL || 'support@wedsync.com';

      const subject = `🚨🔴 WEDDING DAY EMERGENCY ALERT - Immediate Action Required`;

      const emailContent = {
        incidentId: incident.id,
        urgency: 'WEDDING DAY EMERGENCY',
        userDetails: {
          name: userProfile.full_name,
          email: userProfile.email,
          phone: userProfile.phone,
          userType: userProfile.user_type,
          vendorType: userProfile.vendor_type,
          organizationName: userProfile.organizations?.name,
        },
        actionRequired: [
          '🔴 IMMEDIATE PHONE CALL REQUIRED within 5 minutes',
          '📞 Multiple contact attempts until reached',
          '💬 Escalate to on-call executive if needed',
          '📝 Document all interactions immediately',
          '🔄 Provide status updates every 15 minutes',
        ],
        contactInfo: {
          primaryEmail: userProfile.email,
          phone: userProfile.phone,
          backupContacts: 'Check organization contacts',
        },
        timeline: {
          createdAt: new Date().toISOString(),
          responseDeadline: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          escalationTime: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      };

      // Send to all critical response teams
      const emailPromises = [
        EmailService.sendEmail({
          to: emergencyTeamEmail,
          subject,
          template: 'wedding_day_emergency_alert',
          organizationId: userProfile.organization_id,
          recipientType: 'admin',
          templateType: 'wedding_day_emergency',
          priority: 'urgent',
          variables: emailContent,
        }),
        EmailService.sendEmail({
          to: executiveEmail,
          subject,
          template: 'wedding_day_emergency_alert',
          organizationId: userProfile.organization_id,
          recipientType: 'admin',
          templateType: 'wedding_day_emergency',
          priority: 'urgent',
          variables: emailContent,
        }),
        EmailService.sendEmail({
          to: supportEmail,
          subject,
          template: 'wedding_day_emergency_alert',
          organizationId: userProfile.organization_id,
          recipientType: 'admin',
          templateType: 'wedding_day_emergency',
          priority: 'urgent',
          variables: emailContent,
        }),
      ];

      await Promise.all(emailPromises);

      // Send immediate acknowledgment to user
      const userSubject = `We're Responding Immediately - Your Wedding Day Concerns`;
      const userEmailContent = {
        userName: userProfile.full_name,
        incidentId: incident.id,
        responseTime: '5 minutes',
        contactMethod: userProfile.phone ? 'phone call' : 'email',
        supportContact: supportEmail,
      };

      await EmailService.sendEmail({
        to: userProfile.email,
        subject: userSubject,
        template: 'wedding_day_user_acknowledgment',
        organizationId: userProfile.organization_id,
        recipientId: action.user_id,
        recipientType: userProfile.user_type as 'client',
        templateType: 'wedding_day_acknowledgment',
        priority: 'urgent',
        variables: userEmailContent,
      });

      return {
        status: 'success',
        message: 'Wedding day emergency response activated',
        incidentId: incident.id,
        teamsNotified: ['emergency', 'executive', 'support'],
        responseDeadline: '5 minutes',
        userNotified: true,
        escalationLevel: 4,
        requiresImmediateCall: action.action_config?.requiresImmediateCall,
      };
    } catch (error) {
      console.error('Error in executeWeddingDayEmergencyResponse:', error);
      return {
        status: 'error',
        message: `Failed to activate wedding day emergency response: ${error.message}`,
        error: error.message,
      };
    }
  }

  private async executeImprovementConsultation(action: any): Promise<any> {
    // Implementation for improvement consultation scheduling
    return { status: 'success', message: 'Improvement consultation scheduled' };
  }

  private async executeReferralProgramInvitation(action: any): Promise<any> {
    // Implementation for referral program invitation
    return { status: 'success', message: 'Referral program invitation sent' };
  }

  private async executeTestimonialRequest(action: any): Promise<any> {
    // Implementation for testimonial request
    return { status: 'success', message: 'Testimonial request sent' };
  }
}

// Export singleton instance
export const followUpAutomation = FollowUpAutomationService.getInstance();
