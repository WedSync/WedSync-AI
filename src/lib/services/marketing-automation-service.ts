import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { EmailService } from './email-service';
import { ABTestingService } from './ab-testing-service';
import { aiEmailGenerator } from './ai-email-generator';
import { emailPersonalizationEngine } from './email-personalization-engine';

export interface CampaignExecution {
  id: string;
  campaign_id: string;
  client_id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  current_step_id?: string;
  steps_completed: number;
  total_steps: number;
  execution_data: any;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  next_execution_at?: string;
  variant_id?: string;
}

export interface CampaignStep {
  id: string;
  campaign_id: string;
  step_name: string;
  step_type:
    | 'email'
    | 'sms'
    | 'delay'
    | 'condition'
    | 'webhook'
    | 'update_profile';
  step_order: number;
  config: any;
  template_id?: string;
  conditions?: any;
  true_next_step_id?: string;
  false_next_step_id?: string;
}

export interface WeddingContext {
  coupleName: string;
  weddingDate: string;
  venue: string;
  partnerFirstName?: string;
  partnerLastName?: string;
  daysUntilWedding: number;
  supplierType?: string;
  businessName?: string;
}

export interface PersonalizationData {
  actorName: string;
  businessName: string;
  supplierType: string;
  coupleName: string;
  weddingDate: string;
  venue: string;
  daysUntilWedding: number;
  relationship: string;
  recipientType: 'supplier' | 'couple';
  valueProposition: string[];
}

export interface ViralInvitationResult {
  success: boolean;
  inviteCode: string;
  messageId?: string;
  error?: string;
  attributionId?: string;
}

export interface AttributionChain {
  user_id: string;
  referrer_id: string | null;
  generation: number;
  total_referrals: number;
  max_depth: number;
  attributed_revenue: number;
  viral_coefficient: number;
}

/**
 * Marketing Automation Service
 * Handles campaign execution, workflow processing, and message delivery
 */
export class MarketingAutomationService {
  private static instance: MarketingAutomationService;
  private supabase: any;
  private emailService: EmailService;
  private abTestingService: ABTestingService;

  constructor() {
    this.supabase = createServerComponentClient({ cookies });
    this.emailService = new EmailService();
    this.abTestingService = new ABTestingService();
  }

  static getInstance(): MarketingAutomationService {
    if (!MarketingAutomationService.instance) {
      MarketingAutomationService.instance = new MarketingAutomationService();
    }
    return MarketingAutomationService.instance;
  }

  /**
   * Start campaign execution for a specific client
   */
  async startCampaignExecution(
    campaignId: string,
    clientId: string,
  ): Promise<CampaignExecution | null> {
    try {
      // Get campaign details
      const { data: campaign, error: campaignError } = await this.supabase
        .from('marketing_campaigns')
        .select(
          `
          *,
          steps:marketing_campaign_steps(*) 
        `,
        )
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        console.error('Campaign not found:', campaignError);
        return null;
      }

      if (campaign.status !== 'active') {
        console.error('Cannot start execution for non-active campaign');
        return null;
      }

      // Check if execution already exists
      const { data: existingExecution } = await this.supabase
        .from('marketing_campaign_executions')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('client_id', clientId)
        .single();

      if (existingExecution && existingExecution.status !== 'failed') {
        return existingExecution;
      }

      // Get first step
      const firstStep = campaign.steps.find(
        (step: CampaignStep) => step.step_order === 1,
      );
      if (!firstStep) {
        console.error('No first step found in campaign');
        return null;
      }

      // Check A/B testing
      let variantId: string | undefined;
      if (campaign.enable_ab_testing && campaign.ab_test_id) {
        const variant = await this.abTestingService.getVariantForClient({
          testId: campaign.ab_test_id,
          clientId: clientId,
          messageType: 'email', // Default to email
          campaignId: campaignId,
        });
        variantId = variant?.metadata?.variantId;
      }

      // Create execution record
      const { data: execution, error } = await this.supabase
        .from('marketing_campaign_executions')
        .insert({
          campaign_id: campaignId,
          client_id: clientId,
          status: 'pending',
          current_step_id: firstStep.id,
          steps_completed: 0,
          total_steps: campaign.steps.length,
          execution_data: {},
          variant_id: variantId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating campaign execution:', error);
        return null;
      }

      // Start processing the first step
      await this.processExecutionStep(execution.id);

      return execution;
    } catch (error) {
      console.error('Error starting campaign execution:', error);
      return null;
    }
  }

  /**
   * Process a single step in campaign execution
   */
  async processExecutionStep(executionId: string): Promise<void> {
    try {
      // Get execution details
      const { data: execution, error: executionError } = await this.supabase
        .from('marketing_campaign_executions')
        .select(
          `
          *,
          campaign:marketing_campaigns(*),
          client:clients(*),
          current_step:marketing_campaign_steps(*)
        `,
        )
        .eq('id', executionId)
        .single();

      if (executionError || !execution) {
        console.error('Execution not found:', executionError);
        return;
      }

      if (
        execution.status !== 'pending' &&
        execution.status !== 'in_progress'
      ) {
        return; // Already processed or failed
      }

      const currentStep = execution.current_step;
      if (!currentStep) {
        await this.completeExecution(executionId);
        return;
      }

      // Update execution status to in_progress
      await this.supabase
        .from('marketing_campaign_executions')
        .update({ status: 'in_progress' })
        .eq('id', executionId);

      let stepResult: any;
      let nextStepId: string | null = null;

      // Process step based on type
      switch (currentStep.step_type) {
        case 'email':
          stepResult = await this.processEmailStep(execution, currentStep);
          break;

        case 'sms':
          stepResult = await this.processSMSStep(execution, currentStep);
          break;

        case 'delay':
          stepResult = await this.processDelayStep(execution, currentStep);
          break;

        case 'condition':
          stepResult = await this.processConditionStep(execution, currentStep);
          break;

        case 'webhook':
          stepResult = await this.processWebhookStep(execution, currentStep);
          break;

        case 'update_profile':
          stepResult = await this.processUpdateProfileStep(
            execution,
            currentStep,
          );
          break;

        default:
          stepResult = { success: false, error: 'Unknown step type' };
      }

      // Update step execution metrics
      await this.supabase.rpc('increment_step_execution', {
        step_id: currentStep.id,
        success: stepResult.success,
      });

      if (!stepResult.success) {
        // Mark execution as failed
        await this.supabase
          .from('marketing_campaign_executions')
          .update({
            status: 'failed',
            error_message: stepResult.error,
            completed_at: new Date().toISOString(),
          })
          .eq('id', executionId);
        return;
      }

      // Determine next step
      if (stepResult.nextStepId) {
        nextStepId = stepResult.nextStepId;
      } else {
        // Get next step in sequence
        const { data: nextStep } = await this.supabase
          .from('marketing_campaign_steps')
          .select('id')
          .eq('campaign_id', execution.campaign_id)
          .eq('step_order', currentStep.step_order + 1)
          .single();

        nextStepId = nextStep?.id || null;
      }

      // Update execution with next step or completion
      if (nextStepId) {
        const updateData: any = {
          current_step_id: nextStepId,
          steps_completed: execution.steps_completed + 1,
          execution_data: {
            ...execution.execution_data,
            ...stepResult.executionData,
          },
        };

        // Handle delay step scheduling
        if (stepResult.scheduleNext) {
          updateData.status = 'pending';
          updateData.next_execution_at = stepResult.scheduleNext;
        }

        await this.supabase
          .from('marketing_campaign_executions')
          .update(updateData)
          .eq('id', executionId);

        // Continue processing if not scheduled for later
        if (!stepResult.scheduleNext) {
          await this.processExecutionStep(executionId);
        }
      } else {
        // Campaign execution completed
        await this.completeExecution(executionId);
      }
    } catch (error) {
      console.error('Error processing execution step:', error);

      // Mark execution as failed
      await this.supabase
        .from('marketing_campaign_executions')
        .update({
          status: 'failed',
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId);
    }
  }

  /**
   * Process email step
   */
  private async processEmailStep(
    execution: any,
    step: CampaignStep,
  ): Promise<any> {
    try {
      const client = execution.client;
      const campaign = execution.campaign;

      // Get email template or generate with AI
      let emailContent: any;
      let subject: string;

      if (step.template_id) {
        // Use predefined template
        const { data: template } = await this.supabase
          .from('marketing_email_templates')
          .select('*')
          .eq('id', step.template_id)
          .single();

        if (!template) {
          return { success: false, error: 'Email template not found' };
        }

        emailContent = this.personalizeTemplate(
          template.html_content,
          client,
          campaign,
        );
        subject = this.personalizeTemplate(template.subject, client, campaign);
      } else {
        // Generate with AI
        const aiResponse = await aiEmailGenerator.generateEmailTemplate({
          context: {
            client_name: client.name,
            wedding_date: client.wedding_date,
            communication_purpose:
              step.config.purpose || 'Campaign communication',
            relationship_stage: 'existing_client',
          },
          style_preferences: step.config.style || {
            use_emojis: false,
            include_personal_touches: true,
            formal_language: false,
            include_vendor_branding: true,
            template_structure: 'standard',
          },
          personalization_data: {
            client_preferences: client.preferences,
            wedding_details: {
              theme: client.wedding_theme,
              guest_count: client.guest_count,
            },
          },
          template_type: step.config.template_type || 'client_communication',
          tone: step.config.tone || 'professional',
          length: step.config.length || 'medium',
          include_call_to_action: step.config.include_cta || true,
        });

        if (!aiResponse.success) {
          return { success: false, error: 'Failed to generate email content' };
        }

        emailContent = aiResponse.generated_template.body_html;
        subject = aiResponse.generated_template.subject;
      }

      // Send email
      const messageId = await this.emailService.sendEmail({
        to: client.email,
        subject: subject,
        html_content: emailContent,
        text_content: this.convertHtmlToText(emailContent),
      });

      // Record message
      await this.supabase.from('marketing_campaign_messages').insert({
        campaign_id: execution.campaign_id,
        execution_id: execution.id,
        step_id: step.id,
        message_type: 'email',
        recipient: client.email,
        subject: subject,
        content: emailContent,
        status: 'sent',
        external_id: messageId,
      });

      return {
        success: true,
        executionData: {
          last_email_sent: new Date().toISOString(),
          last_message_id: messageId,
        },
      };
    } catch (error) {
      console.error('Error processing email step:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email sending failed',
      };
    }
  }

  /**
   * Process SMS step (placeholder)
   */
  private async processSMSStep(
    execution: any,
    step: CampaignStep,
  ): Promise<any> {
    // SMS implementation would go here
    return { success: true, executionData: {} };
  }

  /**
   * Process delay step
   */
  private async processDelayStep(
    execution: any,
    step: CampaignStep,
  ): Promise<any> {
    const delayMinutes = step.config.delay_minutes || 60;
    const scheduleTime = new Date();
    scheduleTime.setMinutes(scheduleTime.getMinutes() + delayMinutes);

    return {
      success: true,
      scheduleNext: scheduleTime.toISOString(),
      executionData: {
        delayed_until: scheduleTime.toISOString(),
      },
    };
  }

  /**
   * Process condition step
   */
  private async processConditionStep(
    execution: any,
    step: CampaignStep,
  ): Promise<any> {
    // Simple condition evaluation - can be extended significantly
    const conditions = step.conditions || {};
    let conditionResult = true;

    // Example condition checks
    if (conditions.wedding_date_within_days) {
      const weddingDate = new Date(execution.client.wedding_date);
      const now = new Date();
      const daysUntilWedding = Math.floor(
        (weddingDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      conditionResult = daysUntilWedding <= conditions.wedding_date_within_days;
    }

    const nextStepId = conditionResult
      ? step.true_next_step_id
      : step.false_next_step_id;

    return {
      success: true,
      nextStepId: nextStepId,
      executionData: {
        condition_result: conditionResult,
        condition_evaluation: new Date().toISOString(),
      },
    };
  }

  /**
   * Process webhook step (placeholder)
   */
  private async processWebhookStep(
    execution: any,
    step: CampaignStep,
  ): Promise<any> {
    // Webhook implementation would go here
    return { success: true, executionData: {} };
  }

  /**
   * Process update profile step
   */
  private async processUpdateProfileStep(
    execution: any,
    step: CampaignStep,
  ): Promise<any> {
    const updates = step.config.profile_updates || {};

    if (Object.keys(updates).length === 0) {
      return { success: true, executionData: {} };
    }

    const { error } = await this.supabase
      .from('clients')
      .update(updates)
      .eq('id', execution.client_id);

    if (error) {
      return { success: false, error: 'Failed to update client profile' };
    }

    return {
      success: true,
      executionData: {
        profile_updated: new Date().toISOString(),
        updates_applied: updates,
      },
    };
  }

  /**
   * Complete campaign execution
   */
  private async completeExecution(executionId: string): Promise<void> {
    await this.supabase
      .from('marketing_campaign_executions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', executionId);
  }

  /**
   * Personalize template content
   */
  private personalizeTemplate(
    template: string,
    client: any,
    campaign: any,
  ): string {
    return template
      .replace(/\{\{client_name\}\}/g, client.name || 'Valued Client')
      .replace(/\{\{client_email\}\}/g, client.email || '')
      .replace(
        /\{\{wedding_date\}\}/g,
        client.wedding_date
          ? new Date(client.wedding_date).toLocaleDateString()
          : '',
      )
      .replace(/\{\{campaign_name\}\}/g, campaign.name || '')
      .replace(/\{\{vendor_name\}\}/g, 'WedSync'); // This could be dynamic
  }

  /**
   * Convert HTML to plain text (simplified)
   */
  private convertHtmlToText(html: string): string {
    return html
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  /**
   * Process scheduled executions (to be called by cron job)
   */
  async processScheduledExecutions(): Promise<void> {
    const now = new Date().toISOString();

    const { data: scheduledExecutions, error } = await this.supabase
      .from('marketing_campaign_executions')
      .select('id')
      .eq('status', 'pending')
      .lte('next_execution_at', now);

    if (error || !scheduledExecutions) {
      console.error('Error fetching scheduled executions:', error);
      return;
    }

    for (const execution of scheduledExecutions) {
      await this.processExecutionStep(execution.id);
    }
  }

  /**
   * Process viral invitation with wedding context and attribution tracking
   */
  async processViralInvitation(
    actorId: string,
    recipientEmail: string,
    weddingContext: WeddingContext,
  ): Promise<ViralInvitationResult> {
    try {
      // Generate unique invitation code
      const inviteCode = crypto.randomUUID();

      // Get actor data for personalization
      const { data: actor, error: actorError } = await this.supabase
        .from('user_profiles')
        .select('first_name, last_name, business_name, supplier_type')
        .eq('id', actorId)
        .single();

      if (actorError || !actor) {
        return {
          success: false,
          inviteCode,
          error: 'Actor not found',
        };
      }

      // Gather personalization data
      const personalization = await this.gatherPersonalizationData(
        actorId,
        weddingContext,
      );

      // Select optimal email template based on relationship type
      const template = await this.selectOptimalTemplate(
        personalization.relationship,
        personalization.recipientType,
      );

      // Create attribution record
      const { data: attribution, error: attributionError } = await this.supabase
        .from('viral_attributions')
        .insert({
          referrer_id: actorId,
          recipient_email: recipientEmail,
          invite_code: inviteCode,
          wedding_context: weddingContext,
          created_at: new Date().toISOString(),
          status: 'sent',
        })
        .select()
        .single();

      if (attributionError) {
        console.error('Attribution tracking failed:', attributionError);
      }

      // Send personalized viral invitation
      const messageId = await this.sendViralInvitation(
        recipientEmail,
        template,
        personalization,
        inviteCode,
      );

      // Update attribution with message ID
      if (attribution && messageId) {
        await this.supabase
          .from('viral_attributions')
          .update({ message_id: messageId })
          .eq('id', attribution.id);
      }

      return {
        success: true,
        inviteCode,
        messageId,
        attributionId: attribution?.id,
      };
    } catch (error) {
      console.error('Viral invitation processing failed:', error);
      return {
        success: false,
        inviteCode: crypto.randomUUID(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Trigger automated marketing sequence based on events
   */
  async triggerAutomatedSequence(
    eventType:
      | 'supplier_signup'
      | 'wedding_completed'
      | 'couple_signup'
      | 'form_submitted',
    userId: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    try {
      // Get applicable campaigns for this trigger
      const campaigns = await this.getActiveCampaigns(eventType);

      for (const campaign of campaigns) {
        // Check if user matches campaign filters
        if (await this.userMatchesFilters(userId, campaign.filters)) {
          await this.startCampaignExecution(campaign.id, userId);
        }
      }

      // Special handling for viral events
      if (eventType === 'supplier_signup' && metadata.referrer_id) {
        await this.updateViralAttribution(userId, metadata.referrer_id);
      }
    } catch (error) {
      console.error('Automated sequence trigger failed:', error);
    }
  }

  /**
   * Calculate viral coefficient and attribution metrics
   */
  async calculateViralMetrics(rootUserId: string): Promise<AttributionChain> {
    try {
      // Execute viral attribution chain analysis
      const { data, error } = await this.supabase.rpc(
        'calculate_viral_attribution_chain',
        {
          root_user_id: rootUserId,
        },
      );

      if (error) throw error;

      return (
        data[0] || {
          user_id: rootUserId,
          referrer_id: null,
          generation: 1,
          total_referrals: 0,
          max_depth: 1,
          attributed_revenue: 0,
          viral_coefficient: 0,
        }
      );
    } catch (error) {
      console.error('Viral metrics calculation failed:', error);
      throw error;
    }
  }

  /**
   * Get active campaigns for specific trigger event
   */
  private async getActiveCampaigns(eventType: string): Promise<any[]> {
    const { data, error } = await this.supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('status', 'active')
      .contains('trigger_events', [eventType]);

    return data || [];
  }

  /**
   * Check if user matches campaign filter criteria
   */
  private async userMatchesFilters(
    userId: string,
    filters: any,
  ): Promise<boolean> {
    if (!filters || Object.keys(filters).length === 0) {
      return true;
    }

    const { data: user } = await this.supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!user) return false;

    // Apply filter logic (simplified)
    if (filters.supplier_type && user.supplier_type !== filters.supplier_type) {
      return false;
    }

    if (filters.business_size && user.business_size !== filters.business_size) {
      return false;
    }

    return true;
  }

  /**
   * Gather personalization data for viral invitations
   */
  private async gatherPersonalizationData(
    actorId: string,
    weddingContext: WeddingContext,
  ): Promise<PersonalizationData> {
    const { data: actor } = await this.supabase
      .from('user_profiles')
      .select('first_name, last_name, business_name, supplier_type')
      .eq('id', actorId)
      .single();

    if (!actor) throw new Error('Actor data not found');

    return {
      actorName: actor.first_name || 'Your colleague',
      businessName: actor.business_name || 'Wedding Professional',
      supplierType: actor.supplier_type || 'wedding_professional',
      coupleName: weddingContext.coupleName,
      weddingDate: new Date(weddingContext.weddingDate).toLocaleDateString(),
      venue: weddingContext.venue,
      daysUntilWedding: this.calculateDaysUntilWedding(
        weddingContext.weddingDate,
      ),
      relationship: this.determineRelationship(actor, weddingContext),
      recipientType: weddingContext.supplierType ? 'supplier' : 'couple',
      valueProposition: this.generateValueProposition(actor.supplier_type),
    };
  }

  /**
   * Select optimal email template based on relationship and recipient type
   */
  private async selectOptimalTemplate(
    relationship: string,
    recipientType: 'supplier' | 'couple',
  ): Promise<any> {
    const templateType =
      recipientType === 'supplier'
        ? 'supplier_invitation'
        : 'couple_invitation';

    const { data: template } = await this.supabase
      .from('marketing_email_templates')
      .select('*')
      .eq('template_type', templateType)
      .eq('relationship_context', relationship)
      .eq('status', 'active')
      .single();

    return template || (await this.getDefaultTemplate(templateType));
  }

  /**
   * Send personalized viral invitation email
   */
  private async sendViralInvitation(
    recipientEmail: string,
    template: any,
    personalization: PersonalizationData,
    inviteCode: string,
  ): Promise<string> {
    // Personalize template content
    const personalizedSubject = this.personalizeTemplate(
      template.subject,
      personalization,
      inviteCode,
    );
    const personalizedContent = this.personalizeTemplate(
      template.html_content,
      personalization,
      inviteCode,
    );

    // Send email via EmailService
    return await this.emailService.sendEmail({
      to: recipientEmail,
      subject: personalizedSubject,
      html_content: personalizedContent,
      text_content: this.convertHtmlToText(personalizedContent),
      template_id: template.id,
      metadata: {
        invitation_type: 'viral',
        invite_code: inviteCode,
        referrer_id: personalization.actorName,
      },
    });
  }

  /**
   * Update viral attribution when user signs up via referral
   */
  private async updateViralAttribution(
    newUserId: string,
    referrerId: string,
  ): Promise<void> {
    try {
      // Find the attribution record
      const { data: attribution, error } = await this.supabase
        .from('viral_attributions')
        .update({
          converted_user_id: newUserId,
          converted_at: new Date().toISOString(),
          status: 'converted',
        })
        .eq('referrer_id', referrerId)
        .eq('status', 'sent')
        .select()
        .single();

      if (error) {
        console.error('Attribution update failed:', error);
        return;
      }

      // Create user attribution record
      await this.supabase.from('user_attributions').insert({
        user_id: newUserId,
        referrer_id: referrerId,
        attribution_source: 'viral_invitation',
        conversion_value_cents: 0, // Will be updated when user makes payments
        created_at: new Date().toISOString(),
      });

      // Update referrer's viral metrics
      await this.updateReferrerMetrics(referrerId);
    } catch (error) {
      console.error('Viral attribution update failed:', error);
    }
  }

  /**
   * Update referrer's viral performance metrics
   */
  private async updateReferrerMetrics(referrerId: string): Promise<void> {
    await this.supabase.rpc('update_referrer_metrics', {
      referrer_user_id: referrerId,
    });
  }

  /**
   * Calculate days until wedding
   */
  private calculateDaysUntilWedding(weddingDate: string): number {
    const wedding = new Date(weddingDate);
    const today = new Date();
    const diffTime = wedding.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Determine relationship context between actor and wedding
   */
  private determineRelationship(
    actor: any,
    weddingContext: WeddingContext,
  ): string {
    if (actor.supplier_type === weddingContext.supplierType) {
      return 'peer_supplier';
    }
    if (weddingContext.supplierType) {
      return 'cross_supplier';
    }
    return 'supplier_to_couple';
  }

  /**
   * Generate value proposition based on supplier type
   */
  private generateValueProposition(supplierType: string): string[] {
    const valueProps: Record<string, string[]> = {
      photographer: [
        'Professional wedding photography with 2,847+ couples served',
        'Seamless photo sharing and timeline coordination',
        'Free client management tools worth $200/month',
      ],
      florist: [
        'Connect with couples who love your floral designs',
        'Streamlined wedding day coordination with all vendors',
        'Automated client communication saves 10+ hours per wedding',
      ],
      venue: [
        'Coordinate with all wedding vendors in one platform',
        'Reduce venue coordination calls by 80%',
        'Premium vendor network for guest referrals',
      ],
      caterer: [
        'Menu planning and dietary restriction management',
        'Seamless coordination with venue and other vendors',
        'Automated guest count updates for accurate planning',
      ],
      dj: [
        'Music timeline coordination with photographers',
        'Automated announcement scheduling',
        'Seamless vendor communication throughout the event',
      ],
    };

    return (
      valueProps[supplierType] || [
        'Streamlined wedding vendor coordination',
        'Professional tools for wedding planning',
        'Join 15,000+ wedding professionals',
      ]
    );
  }

  /**
   * Get default template for template type
   */
  private async getDefaultTemplate(templateType: string): Promise<any> {
    const { data } = await this.supabase
      .from('marketing_email_templates')
      .select('*')
      .eq('template_type', templateType)
      .eq('is_default', true)
      .single();

    return (
      data || {
        subject: 'Join WedSync - Wedding Professional Platform',
        html_content: "<p>You've been invited to join WedSync!</p>",
        template_type: templateType,
      }
    );
  }

  /**
   * Enhanced template personalization for viral invitations
   */
  private personalizeTemplate(
    template: string,
    personalization: PersonalizationData,
    inviteCode: string,
  ): string {
    return template
      .replace(/\{\{actor_name\}\}/g, personalization.actorName)
      .replace(/\{\{business_name\}\}/g, personalization.businessName)
      .replace(/\{\{supplier_type\}\}/g, personalization.supplierType)
      .replace(/\{\{couple_name\}\}/g, personalization.coupleName)
      .replace(/\{\{wedding_date\}\}/g, personalization.weddingDate)
      .replace(/\{\{venue\}\}/g, personalization.venue)
      .replace(
        /\{\{days_until_wedding\}\}/g,
        personalization.daysUntilWedding.toString(),
      )
      .replace(/\{\{invite_code\}\}/g, inviteCode)
      .replace(
        /\{\{value_propositions\}\}/g,
        personalization.valueProposition.map((vp) => `<li>${vp}</li>`).join(''),
      )
      .replace(
        /\{\{signup_url\}\}/g,
        `${process.env.NEXT_PUBLIC_APP_URL}/signup?invite=${inviteCode}`,
      );
  }

  /**
   * Start campaign for all targeted clients
   */
  async launchCampaign(campaignId: string): Promise<{
    success: boolean;
    executions_started: number;
    errors?: string[];
  }> {
    try {
      // Get campaign with segmentation rules
      const { data: campaign, error } = await this.supabase
        .from('marketing_campaigns')
        .select(
          `
          *,
          segments:user_segment_memberships!inner(
            client:clients(*)
          )
        `,
        )
        .eq('id', campaignId)
        .single();

      if (error || !campaign) {
        return {
          success: false,
          executions_started: 0,
          errors: ['Campaign not found'],
        };
      }

      // Get target clients based on segmentation rules
      const targetClients = campaign.segments.map((s: any) => s.client);
      const errors: string[] = [];
      let executionsStarted = 0;

      // Start execution for each target client
      for (const client of targetClients) {
        try {
          const execution = await this.startCampaignExecution(
            campaignId,
            client.id,
          );
          if (execution) {
            executionsStarted++;
          } else {
            errors.push(`Failed to start execution for client ${client.name}`);
          }
        } catch (error) {
          errors.push(
            `Error starting execution for client ${client.name}: ${error}`,
          );
        }
      }

      // Update campaign status
      await this.supabase
        .from('marketing_campaigns')
        .update({
          status: 'active',
          started_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      return {
        success: true,
        executions_started: executionsStarted,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error('Error launching campaign:', error);
      return {
        success: false,
        executions_started: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }
}

// Export singleton instance
export const marketingAutomationService =
  MarketingAutomationService.getInstance();
