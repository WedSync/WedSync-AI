import { createClient } from '@/lib/supabase/client';

export interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  subcategory?: string;
  tags: string[];
  is_active: boolean;
  is_wedding_specific: boolean;
  urgency_level: 'low' | 'medium' | 'high' | 'critical' | 'wedding_day';
  requires_personalization: boolean;
  variables: ResponseVariable[];
  usage_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface ResponseVariable {
  name: string;
  description: string;
  type: 'text' | 'date' | 'number' | 'email' | 'phone' | 'select';
  required: boolean;
  default_value?: string;
  select_options?: string[];
  placeholder?: string;
}

export interface ResponseSuggestion {
  response: CannedResponse;
  relevance_score: number;
  match_reasons: string[];
  suggested_variables?: Record<string, string>;
}

export interface TicketContext {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  priority: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  wedding_date?: string;
  days_until_wedding?: number;
  tags: string[];
  ai_sentiment?: 'positive' | 'neutral' | 'negative';
  organization_id: string;
}

export class ResponseManager {
  private supabase = createClient();

  // Wedding-specific canned responses templates
  private readonly WEDDING_RESPONSES: Partial<CannedResponse>[] = [
    {
      title: 'Wedding Day Emergency Response',
      content: `Hi {{customer_name}},

I understand this is urgent as your wedding is {{wedding_urgency}}! I'm here to help resolve this immediately.

I've marked your ticket as a wedding day emergency and you'll have our fastest response time. 

{{emergency_action}}

I'll personally monitor this issue and keep you updated every step of the way.

You deserve a perfect wedding day! ❤️

{{agent_name}}
{{agent_title}}
Direct Line: {{emergency_phone}}`,
      category: 'emergency',
      subcategory: 'wedding_day',
      tags: ['wedding_day', 'emergency', 'urgent'],
      is_wedding_specific: true,
      urgency_level: 'wedding_day',
      requires_personalization: true,
      variables: [
        {
          name: 'customer_name',
          description: "Customer's name",
          type: 'text',
          required: true,
          placeholder: 'Customer Name',
        },
        {
          name: 'wedding_urgency',
          description: 'Wedding timing urgency',
          type: 'select',
          required: true,
          select_options: [
            'TODAY',
            'tomorrow',
            'this weekend',
            'in a few days',
          ],
        },
        {
          name: 'emergency_action',
          description: 'Immediate action being taken',
          type: 'text',
          required: true,
          placeholder: "What specific action you're taking immediately",
        },
        {
          name: 'agent_name',
          description: "Support agent's name",
          type: 'text',
          required: true,
          placeholder: 'Your full name',
        },
        {
          name: 'agent_title',
          description: "Support agent's title",
          type: 'text',
          required: true,
          default_value: 'Wedding Support Specialist',
          placeholder: 'Your job title',
        },
        {
          name: 'emergency_phone',
          description: 'Emergency contact phone',
          type: 'phone',
          required: true,
          placeholder: 'Direct phone number',
        },
      ],
    },
    {
      title: 'General Wedding Support Acknowledgment',
      content: `Hi {{customer_name}},

Thank you for reaching out! I can see your wedding is {{wedding_timing}}, so I understand how important it is to get this sorted quickly.

I'm {{agent_name}}, and I'll be personally handling your request. Here's what I'm going to do:

1. {{action_step_1}}
2. {{action_step_2}}
3. {{follow_up_action}}

I'll have an update for you within {{response_timeline}} and will keep you posted throughout the process.

Your wedding day should be stress-free! ❤️

Best regards,
{{agent_name}}`,
      category: 'general',
      subcategory: 'acknowledgment',
      tags: ['wedding', 'acknowledgment', 'timeline'],
      is_wedding_specific: true,
      urgency_level: 'high',
      requires_personalization: true,
      variables: [
        {
          name: 'customer_name',
          description: "Customer's name",
          type: 'text',
          required: true,
          placeholder: 'Customer Name',
        },
        {
          name: 'wedding_timing',
          description: 'When their wedding is',
          type: 'text',
          required: true,
          placeholder: "e.g., 'in 2 weeks', 'next month'",
        },
        {
          name: 'action_step_1',
          description: 'First action step',
          type: 'text',
          required: true,
          placeholder: "First thing you'll do",
        },
        {
          name: 'action_step_2',
          description: 'Second action step',
          type: 'text',
          required: true,
          placeholder: "Second thing you'll do",
        },
        {
          name: 'follow_up_action',
          description: 'Follow-up action',
          type: 'text',
          required: true,
          placeholder: "How you'll follow up",
        },
        {
          name: 'response_timeline',
          description: 'Response timeline commitment',
          type: 'select',
          required: true,
          select_options: [
            '2 hours',
            '4 hours',
            'by end of today',
            '24 hours',
            '48 hours',
          ],
        },
        {
          name: 'agent_name',
          description: "Support agent's name",
          type: 'text',
          required: true,
          placeholder: 'Your full name',
        },
      ],
    },
    {
      title: 'PDF Import Issue Resolution',
      content: `Hi {{customer_name}},

I've looked into the PDF import issue you're experiencing with your {{document_type}}.

{{issue_explanation}}

Here's how we'll fix this:

1. **Immediate workaround**: {{workaround_solution}}
2. **Permanent fix**: {{permanent_solution}}
3. **Prevention**: {{prevention_tip}}

I've processed your document manually and you should see your {{data_type}} appearing in your dashboard within the next 15 minutes.

{{additional_support}}

Let me know if you need anything else!

{{agent_name}}`,
      category: 'technical',
      subcategory: 'pdf_import',
      tags: ['pdf', 'import', 'technical', 'resolution'],
      is_wedding_specific: false,
      urgency_level: 'medium',
      requires_personalization: true,
      variables: [
        {
          name: 'customer_name',
          description: "Customer's name",
          type: 'text',
          required: true,
          placeholder: 'Customer Name',
        },
        {
          name: 'document_type',
          description: 'Type of document imported',
          type: 'select',
          required: true,
          select_options: [
            'guest list',
            'vendor contracts',
            'timeline',
            'budget spreadsheet',
            'venue details',
          ],
        },
        {
          name: 'issue_explanation',
          description: 'Explanation of what went wrong',
          type: 'text',
          required: true,
          placeholder: 'Brief explanation of the technical issue',
        },
        {
          name: 'workaround_solution',
          description: 'Immediate temporary solution',
          type: 'text',
          required: true,
          placeholder: 'Quick fix they can use right now',
        },
        {
          name: 'permanent_solution',
          description: "Long-term fix we're implementing",
          type: 'text',
          required: true,
          placeholder: "What we're doing to prevent this in future",
        },
        {
          name: 'prevention_tip',
          description: 'How to avoid this issue',
          type: 'text',
          required: false,
          placeholder: 'Optional tip to prevent similar issues',
        },
        {
          name: 'data_type',
          description: 'Type of data that was imported',
          type: 'select',
          required: true,
          select_options: [
            'guests',
            'vendors',
            'timeline events',
            'budget items',
            'venue information',
          ],
        },
        {
          name: 'additional_support',
          description: 'Additional support offered',
          type: 'text',
          required: false,
          default_value:
            "If you have any other documents to import, I'm happy to process them personally to ensure they work perfectly.",
          placeholder: 'Optional additional support message',
        },
        {
          name: 'agent_name',
          description: "Support agent's name",
          type: 'text',
          required: true,
          placeholder: 'Your full name',
        },
      ],
    },
    {
      title: 'Integration Problem Solution',
      content: `Hi {{customer_name}},

I've investigated the {{integration_type}} integration issue you reported, and I have good news!

**The Problem**: {{problem_description}}

**The Solution**: {{solution_description}}

**What I've Done**:
{{action_taken}}

**What You Need to Do**:
{{customer_action}}

{{testing_instructions}}

Your {{integration_type}} data should start syncing within {{sync_timeline}}. I'll monitor this personally and reach out if there are any issues.

{{additional_notes}}

Best regards,
{{agent_name}}`,
      category: 'integration',
      subcategory: 'sync_issues',
      tags: ['integration', 'sync', 'crm', 'technical'],
      is_wedding_specific: false,
      urgency_level: 'high',
      requires_personalization: true,
      variables: [
        {
          name: 'customer_name',
          description: "Customer's name",
          type: 'text',
          required: true,
          placeholder: 'Customer Name',
        },
        {
          name: 'integration_type',
          description: 'Type of integration having issues',
          type: 'select',
          required: true,
          select_options: [
            'Tave',
            'HoneyBook',
            'Light Blue',
            'Google Calendar',
            'Stripe',
            'Email Marketing',
          ],
        },
        {
          name: 'problem_description',
          description: 'Description of what was wrong',
          type: 'text',
          required: true,
          placeholder: 'Brief description of the technical problem',
        },
        {
          name: 'solution_description',
          description: 'How the problem is being solved',
          type: 'text',
          required: true,
          placeholder: 'Technical solution explanation',
        },
        {
          name: 'action_taken',
          description: 'Actions taken by support team',
          type: 'text',
          required: true,
          placeholder: "What you've already done to fix it",
        },
        {
          name: 'customer_action',
          description: 'What customer needs to do',
          type: 'text',
          required: false,
          default_value: "Nothing! I've handled everything on our end.",
          placeholder: 'Any action customer needs to take',
        },
        {
          name: 'testing_instructions',
          description: 'How customer can test the fix',
          type: 'text',
          required: false,
          placeholder: 'Optional testing instructions',
        },
        {
          name: 'sync_timeline',
          description: 'How long until sync works',
          type: 'select',
          required: true,
          select_options: [
            '5 minutes',
            '15 minutes',
            '1 hour',
            '2 hours',
            '24 hours',
          ],
        },
        {
          name: 'additional_notes',
          description: 'Any additional information',
          type: 'text',
          required: false,
          placeholder: 'Optional additional notes',
        },
        {
          name: 'agent_name',
          description: "Support agent's name",
          type: 'text',
          required: true,
          placeholder: 'Your full name',
        },
      ],
    },
    {
      title: 'Account and Billing Resolution',
      content: `Hi {{customer_name}},

I've reviewed your account and {{billing_issue}} concern. Let me sort this out for you right away!

**What Happened**: {{issue_explanation}}

**Resolution**: {{resolution_action}}

{{refund_information}}

**Account Status**: {{account_status}}
**Next Billing Date**: {{next_billing_date}}
**Current Plan**: {{current_plan}}

{{upgrade_information}}

{{gesture_of_goodwill}}

If you have any other questions about your account or billing, please don't hesitate to ask. I'm here to help make this as smooth as possible!

Best regards,
{{agent_name}}
Billing Support Specialist`,
      category: 'billing',
      subcategory: 'account_issues',
      tags: ['billing', 'account', 'subscription', 'payment'],
      is_wedding_specific: false,
      urgency_level: 'high',
      requires_personalization: true,
      variables: [
        {
          name: 'customer_name',
          description: "Customer's name",
          type: 'text',
          required: true,
          placeholder: 'Customer Name',
        },
        {
          name: 'billing_issue',
          description: 'Type of billing issue',
          type: 'select',
          required: true,
          select_options: [
            'billing',
            'subscription',
            'payment',
            'refund',
            'upgrade',
            'downgrade',
          ],
        },
        {
          name: 'issue_explanation',
          description: 'What caused the issue',
          type: 'text',
          required: true,
          placeholder: 'Brief explanation of what went wrong',
        },
        {
          name: 'resolution_action',
          description: "How you're resolving it",
          type: 'text',
          required: true,
          placeholder: "Specific actions you've taken to resolve",
        },
        {
          name: 'refund_information',
          description: 'Refund details if applicable',
          type: 'text',
          required: false,
          placeholder: 'Refund amount and timeline, if applicable',
        },
        {
          name: 'account_status',
          description: 'Current account status',
          type: 'select',
          required: true,
          select_options: [
            'Active',
            'Past Due',
            'Cancelled',
            'Suspended',
            'Trial',
          ],
        },
        {
          name: 'next_billing_date',
          description: "When they'll be charged next",
          type: 'date',
          required: true,
          placeholder: 'Next billing date',
        },
        {
          name: 'current_plan',
          description: 'Their current subscription plan',
          type: 'select',
          required: true,
          select_options: [
            'Free Trial',
            'Starter',
            'Professional',
            'Scale',
            'Enterprise',
          ],
        },
        {
          name: 'upgrade_information',
          description: 'Information about plan changes',
          type: 'text',
          required: false,
          placeholder: 'Optional information about plan upgrades/changes',
        },
        {
          name: 'gesture_of_goodwill',
          description: 'Any compensation offered',
          type: 'text',
          required: false,
          placeholder: 'Optional goodwill gesture (credit, extension, etc.)',
        },
        {
          name: 'agent_name',
          description: "Support agent's name",
          type: 'text',
          required: true,
          placeholder: 'Your full name',
        },
      ],
    },
    {
      title: 'Feature Request Follow-up',
      content: `Hi {{customer_name}},

Thank you for suggesting {{feature_name}}! Feature requests like yours help us build exactly what wedding professionals need.

I've reviewed your request with our product team, and here's the update:

**Your Request**: {{feature_description}}

**Status**: {{feature_status}}

{{implementation_timeline}}

{{workaround_solution}}

{{beta_invitation}}

We truly appreciate customers like you who help shape WedSync into the perfect platform for wedding professionals. Your input directly impacts our roadmap!

{{follow_up_action}}

Best regards,
{{agent_name}}
Product Support Team`,
      category: 'feature_request',
      subcategory: 'product_feedback',
      tags: ['feature_request', 'product', 'feedback', 'roadmap'],
      is_wedding_specific: false,
      urgency_level: 'low',
      requires_personalization: true,
      variables: [
        {
          name: 'customer_name',
          description: "Customer's name",
          type: 'text',
          required: true,
          placeholder: 'Customer Name',
        },
        {
          name: 'feature_name',
          description: 'Name of the requested feature',
          type: 'text',
          required: true,
          placeholder: 'Brief name of the feature',
        },
        {
          name: 'feature_description',
          description: 'Description of what they want',
          type: 'text',
          required: true,
          placeholder: "What they're asking for",
        },
        {
          name: 'feature_status',
          description: 'Current status of the request',
          type: 'select',
          required: true,
          select_options: [
            'Added to our roadmap for Q1',
            'Added to our roadmap for Q2',
            'Under consideration by our product team',
            'In development - coming soon!',
            'Already available (let me show you where)',
            "Not currently planned but we're tracking interest",
          ],
        },
        {
          name: 'implementation_timeline',
          description: 'When it might be available',
          type: 'text',
          required: false,
          placeholder: 'Optional timeline information',
        },
        {
          name: 'workaround_solution',
          description: 'Current alternative solution',
          type: 'text',
          required: false,
          placeholder: 'Any current workaround they can use',
        },
        {
          name: 'beta_invitation',
          description: 'Invitation to beta test',
          type: 'text',
          required: false,
          placeholder: 'Optional beta testing invitation',
        },
        {
          name: 'follow_up_action',
          description: 'Next steps or follow-up',
          type: 'text',
          required: false,
          default_value:
            "I'll personally reach out as soon as we have news about this feature!",
          placeholder: "How you'll follow up",
        },
        {
          name: 'agent_name',
          description: "Support agent's name",
          type: 'text',
          required: true,
          placeholder: 'Your full name',
        },
      ],
    },
  ];

  /**
   * Initialize default canned responses in database
   */
  async initializeDefaultResponses(
    organizationId: string,
    agentId: string,
  ): Promise<void> {
    try {
      const responses = this.WEDDING_RESPONSES.map((response) => ({
        ...response,
        id: crypto.randomUUID(),
        organization_id: organizationId,
        created_by: agentId,
        is_active: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase
        .from('support_canned_responses')
        .insert(responses);

      if (error) throw error;
    } catch (error) {
      console.error('Error initializing default responses:', error);
      throw error;
    }
  }

  /**
   * Get all canned responses for an organization
   */
  async getCannedResponses(
    organizationId: string,
    filters?: {
      category?: string;
      is_wedding_specific?: boolean;
      is_active?: boolean;
    },
  ): Promise<CannedResponse[]> {
    try {
      let query = this.supabase
        .from('support_canned_responses')
        .select('*')
        .eq('organization_id', organizationId)
        .order('usage_count', { ascending: false })
        .order('title', { ascending: true });

      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      if (filters?.is_wedding_specific !== undefined) {
        query = query.eq('is_wedding_specific', filters.is_wedding_specific);
      }

      if (filters?.is_active !== undefined) {
        query = query.eq('is_active', filters.is_active);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('Error getting canned responses:', error);
      throw error;
    }
  }

  /**
   * Get intelligent response suggestions based on ticket content
   */
  async getResponseSuggestions(
    ticketContext: TicketContext,
    organizationId: string,
  ): Promise<ResponseSuggestion[]> {
    try {
      const responses = await this.getCannedResponses(organizationId, {
        is_active: true,
      });
      const suggestions: ResponseSuggestion[] = [];

      for (const response of responses) {
        const relevanceScore = this.calculateRelevanceScore(
          response,
          ticketContext,
        );

        if (relevanceScore > 0.3) {
          // Only show relevant suggestions
          suggestions.push({
            response,
            relevance_score: relevanceScore,
            match_reasons: this.getMatchReasons(response, ticketContext),
            suggested_variables: this.generateSuggestedVariables(
              response,
              ticketContext,
            ),
          });
        }
      }

      // Sort by relevance score and return top 5
      return suggestions
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, 5);
    } catch (error) {
      console.error('Error getting response suggestions:', error);
      throw error;
    }
  }

  /**
   * Calculate relevance score between a response and ticket context
   */
  private calculateRelevanceScore(
    response: CannedResponse,
    ticket: TicketContext,
  ): number {
    let score = 0;
    const maxScore = 10;

    // Category match (high weight)
    if (response.category === ticket.category) {
      score += 3;
    }

    // Subcategory match
    if (response.subcategory === ticket.subcategory) {
      score += 2;
    }

    // Priority/urgency match
    if (response.urgency_level === ticket.priority) {
      score += 2;
    }

    // Wedding urgency bonus
    if (response.is_wedding_specific && ticket.wedding_date) {
      score += 1;

      // Wedding day emergency
      if (ticket.days_until_wedding !== undefined) {
        if (
          ticket.days_until_wedding <= 0 &&
          response.urgency_level === 'wedding_day'
        ) {
          score += 3; // Major bonus for wedding day emergencies
        } else if (
          ticket.days_until_wedding <= 7 &&
          response.urgency_level === 'critical'
        ) {
          score += 1;
        }
      }
    }

    // Tag matching
    const commonTags = response.tags.filter(
      (tag) =>
        ticket.tags.includes(tag) ||
        ticket.title.toLowerCase().includes(tag.toLowerCase()) ||
        ticket.description.toLowerCase().includes(tag.toLowerCase()),
    );
    score += Math.min(commonTags.length * 0.5, 2);

    // Text content matching
    const titleWords = ticket.title.toLowerCase().split(' ');
    const descWords = ticket.description.toLowerCase().split(' ');
    const responseWords = response.content.toLowerCase().split(' ');

    let textMatches = 0;
    for (const word of [...titleWords, ...descWords]) {
      if (word.length > 3 && responseWords.includes(word)) {
        textMatches++;
      }
    }
    score += Math.min(textMatches * 0.1, 1);

    return Math.min(score / maxScore, 1);
  }

  /**
   * Get reasons why a response matches a ticket
   */
  private getMatchReasons(
    response: CannedResponse,
    ticket: TicketContext,
  ): string[] {
    const reasons: string[] = [];

    if (response.category === ticket.category) {
      reasons.push(`Same category: ${ticket.category}`);
    }

    if (response.subcategory === ticket.subcategory) {
      reasons.push(`Same subcategory: ${ticket.subcategory}`);
    }

    if (response.urgency_level === ticket.priority) {
      reasons.push(`Matching priority: ${ticket.priority}`);
    }

    if (response.is_wedding_specific && ticket.wedding_date) {
      if (
        ticket.days_until_wedding !== undefined &&
        ticket.days_until_wedding <= 1
      ) {
        reasons.push('Wedding day emergency protocol');
      } else {
        reasons.push('Wedding-specific response');
      }
    }

    const commonTags = response.tags.filter(
      (tag) =>
        ticket.tags.includes(tag) ||
        ticket.title.toLowerCase().includes(tag.toLowerCase()),
    );

    if (commonTags.length > 0) {
      reasons.push(`Matching tags: ${commonTags.join(', ')}`);
    }

    return reasons;
  }

  /**
   * Generate suggested variable values based on ticket context
   */
  private generateSuggestedVariables(
    response: CannedResponse,
    ticket: TicketContext,
  ): Record<string, string> {
    const suggestions: Record<string, string> = {};

    for (const variable of response.variables) {
      switch (variable.name) {
        case 'customer_name':
          suggestions[variable.name] = ticket.customer_name;
          break;

        case 'customer_email':
          suggestions[variable.name] = ticket.customer_email;
          break;

        case 'wedding_timing':
          if (ticket.days_until_wedding !== undefined) {
            if (ticket.days_until_wedding === 0) {
              suggestions[variable.name] = 'TODAY';
            } else if (ticket.days_until_wedding === 1) {
              suggestions[variable.name] = 'tomorrow';
            } else if (ticket.days_until_wedding <= 7) {
              suggestions[variable.name] =
                `in ${ticket.days_until_wedding} days`;
            } else {
              suggestions[variable.name] =
                `in ${Math.ceil(ticket.days_until_wedding / 7)} weeks`;
            }
          }
          break;

        case 'wedding_urgency':
          if (ticket.days_until_wedding !== undefined) {
            if (ticket.days_until_wedding === 0) {
              suggestions[variable.name] = 'TODAY';
            } else if (ticket.days_until_wedding === 1) {
              suggestions[variable.name] = 'tomorrow';
            } else if (ticket.days_until_wedding <= 2) {
              suggestions[variable.name] = 'this weekend';
            } else {
              suggestions[variable.name] = 'in a few days';
            }
          }
          break;

        case 'document_type':
          if (
            ticket.title.toLowerCase().includes('guest') ||
            ticket.description.toLowerCase().includes('guest')
          ) {
            suggestions[variable.name] = 'guest list';
          } else if (
            ticket.title.toLowerCase().includes('vendor') ||
            ticket.description.toLowerCase().includes('vendor')
          ) {
            suggestions[variable.name] = 'vendor contracts';
          } else if (
            ticket.title.toLowerCase().includes('budget') ||
            ticket.description.toLowerCase().includes('budget')
          ) {
            suggestions[variable.name] = 'budget spreadsheet';
          }
          break;

        case 'integration_type':
          const integrationKeywords = {
            tave: 'Tave',
            honeybook: 'HoneyBook',
            'light blue': 'Light Blue',
            google: 'Google Calendar',
            stripe: 'Stripe',
            email: 'Email Marketing',
          };

          const content = `${ticket.title} ${ticket.description}`.toLowerCase();
          for (const [keyword, integration] of Object.entries(
            integrationKeywords,
          )) {
            if (content.includes(keyword)) {
              suggestions[variable.name] = integration;
              break;
            }
          }
          break;
      }
    }

    return suggestions;
  }

  /**
   * Process response template with variable substitution
   */
  processResponseTemplate(
    response: CannedResponse,
    variableValues: Record<string, string>,
  ): string {
    let processed = response.content;

    // Replace all variables
    for (const [key, value] of Object.entries(variableValues)) {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, value || `[${key}]`);
    }

    // Replace any remaining variables with placeholders
    processed = processed.replace(/{{(\w+)}}/g, '[$1]');

    return processed;
  }

  /**
   * Track usage of a canned response
   */
  async trackResponseUsage(responseId: string): Promise<void> {
    try {
      const { error } = await this.supabase.rpc('increment_response_usage', {
        response_id: responseId,
      });

      if (error) throw error;
    } catch (error) {
      console.error('Error tracking response usage:', error);
    }
  }

  /**
   * Create a new canned response
   */
  async createCannedResponse(
    response: Omit<
      CannedResponse,
      'id' | 'created_at' | 'updated_at' | 'usage_count'
    >,
    organizationId: string,
    agentId: string,
  ): Promise<CannedResponse> {
    try {
      const newResponse = {
        ...response,
        id: crypto.randomUUID(),
        organization_id: organizationId,
        created_by: agentId,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from('support_canned_responses')
        .insert(newResponse)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating canned response:', error);
      throw error;
    }
  }

  /**
   * Update an existing canned response
   */
  async updateCannedResponse(
    responseId: string,
    updates: Partial<CannedResponse>,
  ): Promise<CannedResponse> {
    try {
      const { data, error } = await this.supabase
        .from('support_canned_responses')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', responseId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating canned response:', error);
      throw error;
    }
  }

  /**
   * Delete a canned response
   */
  async deleteCannedResponse(responseId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('support_canned_responses')
        .delete()
        .eq('id', responseId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting canned response:', error);
      throw error;
    }
  }

  /**
   * Get response analytics
   */
  async getResponseAnalytics(organizationId: string): Promise<{
    total_responses: number;
    most_used: CannedResponse[];
    least_used: CannedResponse[];
    category_usage: Record<string, number>;
    wedding_specific_usage: number;
  }> {
    try {
      const responses = await this.getCannedResponses(organizationId);

      const analytics = {
        total_responses: responses.length,
        most_used: responses
          .filter((r) => r.usage_count > 0)
          .sort((a, b) => b.usage_count - a.usage_count)
          .slice(0, 5),
        least_used: responses.filter((r) => r.usage_count === 0).slice(0, 5),
        category_usage: responses.reduce(
          (acc, response) => {
            acc[response.category] =
              (acc[response.category] || 0) + response.usage_count;
            return acc;
          },
          {} as Record<string, number>,
        ),
        wedding_specific_usage: responses
          .filter((r) => r.is_wedding_specific)
          .reduce((sum, r) => sum + r.usage_count, 0),
      };

      return analytics;
    } catch (error) {
      console.error('Error getting response analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const responseManager = new ResponseManager();
