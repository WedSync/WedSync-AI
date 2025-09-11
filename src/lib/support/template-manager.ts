/**
 * Template Management Service for Support System
 * WS-235: Support Operations Ticket Management System
 *
 * Handles canned responses and templates for support agents
 * Features:
 * - Template categories (billing, technical, onboarding, etc.)
 * - Variable substitution for personalization
 * - Usage tracking and optimization
 * - Wedding industry specific templates
 * - Tier-based template access
 */

import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

// Types for template system
export interface Template {
  id: string;
  name: string;
  category: string;
  subject?: string;
  content: string;
  variables: TemplateVariable[];
  tags: string[];
  tier_access: 'all' | 'professional' | 'scale' | 'enterprise';
  vendor_type?:
    | 'photographer'
    | 'videographer'
    | 'dj'
    | 'florist'
    | 'caterer'
    | 'venue'
    | 'planner'
    | 'other';
  is_active: boolean;
  usage_count: number;
  avg_rating?: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  type: 'text' | 'date' | 'number' | 'email' | 'phone';
  description: string;
  required: boolean;
  default_value?: string;
}

export interface TemplateUsage {
  template_id: string;
  used_by: string;
  ticket_id?: string;
  variables_used: Record<string, string>;
  agent_rating?: number;
  effectiveness_score?: number;
  used_at: string;
}

export interface ProcessedTemplate {
  subject: string;
  content: string;
  variables_replaced: Record<string, string>;
  missing_variables: string[];
}

export class TemplateManager {
  // Template categories for organization
  private readonly categories = [
    'billing',
    'technical_support',
    'onboarding',
    'feature_help',
    'bug_report',
    'data_recovery',
    'payment_issues',
    'account_access',
    'integration_help',
    'wedding_emergency',
    'general',
    'escalation',
  ];

  // Built-in wedding industry templates
  private readonly weddingTemplates = {
    wedding_day_emergency: {
      subject: 'URGENT: Wedding Day Support - Immediate Response',
      content: `Hi {{customer_name}},

I understand you're experiencing issues on your wedding day at {{venue_name}}. This is our absolute top priority.

I'm {{agent_name}}, your dedicated wedding day specialist, and I'm personally handling your case right now.

Current Issue: {{issue_description}}
Wedding Time: {{ceremony_time}}
Venue: {{venue_name}}

IMMEDIATE ACTIONS TAKEN:
1. Escalated to our wedding day emergency team
2. Assigned our senior technical specialist
3. Set up direct phone line: {{emergency_phone}}

I will call you within the next 5 minutes at {{customer_phone}}.

Your wedding day is sacred to us. We will resolve this immediately.

Best regards,
{{agent_name}}
WedSync Wedding Day Emergency Team`,
      variables: [
        {
          name: 'customer_name',
          type: 'text',
          description: 'Customer first name',
          required: true,
        },
        {
          name: 'venue_name',
          type: 'text',
          description: 'Wedding venue name',
          required: true,
        },
        {
          name: 'issue_description',
          type: 'text',
          description: 'Brief description of the issue',
          required: true,
        },
        {
          name: 'ceremony_time',
          type: 'text',
          description: 'Wedding ceremony time',
          required: false,
        },
        {
          name: 'customer_phone',
          type: 'phone',
          description: 'Customer phone number',
          required: true,
        },
        {
          name: 'agent_name',
          type: 'text',
          description: 'Support agent name',
          required: true,
        },
        {
          name: 'emergency_phone',
          type: 'phone',
          description: 'Emergency support phone',
          required: true,
        },
      ],
    },
    data_recovery_help: {
      subject: "Data Recovery in Progress - We're Here to Help",
      content: `Dear {{customer_name}},

I understand your concern about the missing {{data_type}} for {{client_count}} clients. Data loss is every wedding professional's worst nightmare, and I want to assure you that we take this extremely seriously.

RECOVERY STATUS:
✅ Automatic backup check initiated
✅ Database recovery team notified
✅ Your account secured and protected

NEXT STEPS:
1. Our data recovery specialists are analyzing your account
2. We're checking our automatic backups (taken every hour)
3. We're also checking our disaster recovery systems

EXPECTED TIMELINE:
- Initial assessment: Within 1 hour
- Recovery options presented: Within 2 hours  
- Full data recovery: Within 6 hours (usually much faster)

Your wedding business data is irreplaceable, and we understand the impact this has on your {{upcoming_wedding_count}} upcoming weddings.

I'll personally update you every 30 minutes until this is resolved.

Direct contact: {{agent_email}} | {{agent_phone}}

We will make this right.

{{agent_name}}
Senior Data Recovery Specialist`,
      variables: [
        {
          name: 'customer_name',
          type: 'text',
          description: 'Customer name',
          required: true,
        },
        {
          name: 'data_type',
          type: 'text',
          description: 'Type of data (clients, photos, forms)',
          required: true,
        },
        {
          name: 'client_count',
          type: 'number',
          description: 'Number of affected clients',
          required: true,
        },
        {
          name: 'upcoming_wedding_count',
          type: 'number',
          description: 'Number of upcoming weddings',
          required: false,
        },
        {
          name: 'agent_name',
          type: 'text',
          description: 'Agent name',
          required: true,
        },
        {
          name: 'agent_email',
          type: 'email',
          description: 'Agent email',
          required: true,
        },
        {
          name: 'agent_phone',
          type: 'phone',
          description: 'Agent phone',
          required: true,
        },
      ],
    },
    payment_failure_help: {
      subject: 'Payment Issue Resolved - Account Restored',
      content: `Hi {{customer_name}},

Good news! I've resolved the payment issue with your {{subscription_plan}} subscription.

WHAT HAPPENED:
{{failure_reason}}

WHAT I'VE DONE:
✅ Updated your payment method
✅ Processed the payment successfully  
✅ Restored full account access
✅ Extended your billing cycle by {{grace_days}} days as an apology

Your account is now fully active and all features are restored.

CURRENT STATUS:
- Subscription: {{subscription_plan}} (Active)
- Next billing date: {{next_billing_date}}
- All wedding data: Fully accessible

If you have any questions about your billing or need help with anything else, I'm here to help.

{{agent_name}}
Billing Support Specialist`,
      variables: [
        {
          name: 'customer_name',
          type: 'text',
          description: 'Customer name',
          required: true,
        },
        {
          name: 'subscription_plan',
          type: 'text',
          description: 'Subscription plan name',
          required: true,
        },
        {
          name: 'failure_reason',
          type: 'text',
          description: 'Reason for payment failure',
          required: true,
        },
        {
          name: 'grace_days',
          type: 'number',
          description: 'Grace period days',
          required: false,
          default_value: '3',
        },
        {
          name: 'next_billing_date',
          type: 'date',
          description: 'Next billing date',
          required: true,
        },
        {
          name: 'agent_name',
          type: 'text',
          description: 'Agent name',
          required: true,
        },
      ],
    },
  };

  /**
   * Get all templates available to user based on their tier
   */
  async getTemplatesForUser(
    userId: string,
    userTier: string,
    category?: string,
  ): Promise<Template[]> {
    try {
      let query = supabase
        .from('support_templates')
        .select(
          `
          id,
          name,
          category,
          subject,
          content,
          variables,
          tags,
          tier_access,
          vendor_type,
          is_active,
          usage_count,
          avg_rating,
          created_by,
          created_at,
          updated_at
        `,
        )
        .eq('is_active', true);

      // Filter by category if specified
      if (category) {
        query = query.eq('category', category);
      }

      // Apply tier-based access control
      query = query.or(`tier_access.eq.all,tier_access.eq.${userTier}`);

      const { data: templates, error } = await query.order('usage_count', {
        ascending: false,
      });

      if (error) {
        console.error('Failed to fetch templates:', error);
        return [];
      }

      return templates || [];
    } catch (error) {
      console.error('Error fetching templates:', error);
      return [];
    }
  }

  /**
   * Get template by ID with access verification
   */
  async getTemplate(
    templateId: string,
    userId: string,
    userTier: string,
  ): Promise<Template | null> {
    try {
      const { data: template, error } = await supabase
        .from('support_templates')
        .select('*')
        .eq('id', templateId)
        .eq('is_active', true)
        .single();

      if (error || !template) {
        console.error('Template not found:', error);
        return null;
      }

      // Verify tier access
      if (template.tier_access !== 'all' && template.tier_access !== userTier) {
        console.error('Insufficient tier access for template:', templateId);
        return null;
      }

      return template;
    } catch (error) {
      console.error('Error fetching template:', error);
      return null;
    }
  }

  /**
   * Process template with variable substitution
   */
  async processTemplate(
    templateId: string,
    variables: Record<string, string>,
    userId: string,
    userTier: string,
    ticketId?: string,
  ): Promise<ProcessedTemplate | null> {
    try {
      const template = await this.getTemplate(templateId, userId, userTier);
      if (!template) {
        return null;
      }

      // Find missing required variables
      const requiredVariables = template.variables
        .filter((v) => v.required)
        .map((v) => v.name);

      const providedVariables = Object.keys(variables);
      const missingVariables = requiredVariables.filter(
        (req) => !providedVariables.includes(req),
      );

      // Process subject and content with variable substitution
      let processedSubject = template.subject || '';
      let processedContent = template.content;
      const variablesReplaced: Record<string, string> = {};

      // Replace variables in both subject and content
      template.variables.forEach((variable) => {
        const value =
          variables[variable.name] ||
          variable.default_value ||
          `{{${variable.name}}}`;
        const placeholder = `{{${variable.name}}}`;

        if (value !== `{{${variable.name}}}`) {
          processedSubject = processedSubject.replace(
            new RegExp(placeholder, 'g'),
            value,
          );
          processedContent = processedContent.replace(
            new RegExp(placeholder, 'g'),
            value,
          );
          variablesReplaced[variable.name] = value;
        }
      });

      // Track template usage
      await this.trackTemplateUsage(templateId, userId, ticketId, variables);

      return {
        subject: processedSubject,
        content: processedContent,
        variables_replaced: variablesReplaced,
        missing_variables: missingVariables,
      };
    } catch (error) {
      console.error('Error processing template:', error);
      return null;
    }
  }

  /**
   * Create a new template
   */
  async createTemplate(
    templateData: Omit<
      Template,
      'id' | 'created_at' | 'updated_at' | 'usage_count' | 'avg_rating'
    >,
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('support_templates')
        .insert({
          name: templateData.name,
          category: templateData.category,
          subject: templateData.subject,
          content: templateData.content,
          variables: templateData.variables,
          tags: templateData.tags,
          tier_access: templateData.tier_access,
          vendor_type: templateData.vendor_type,
          is_active: templateData.is_active,
          created_by: templateData.created_by,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Failed to create template:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating template:', error);
      return null;
    }
  }

  /**
   * Update existing template
   */
  async updateTemplate(
    templateId: string,
    updates: Partial<Template>,
    userId: string,
  ): Promise<boolean> {
    try {
      // Verify user owns this template or is admin
      const { data: template, error: fetchError } = await supabase
        .from('support_templates')
        .select('created_by')
        .eq('id', templateId)
        .single();

      if (fetchError || !template) {
        console.error('Template not found for update:', fetchError);
        return false;
      }

      // For now, only allow creator to update (extend later for admin roles)
      if (template.created_by !== userId) {
        console.error('Unauthorized template update attempt');
        return false;
      }

      const { error: updateError } = await supabase
        .from('support_templates')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      if (updateError) {
        console.error('Failed to update template:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating template:', error);
      return false;
    }
  }

  /**
   * Track template usage for analytics
   */
  private async trackTemplateUsage(
    templateId: string,
    userId: string,
    ticketId?: string,
    variables?: Record<string, string>,
  ): Promise<void> {
    try {
      // Insert usage record
      await supabase.from('template_usage').insert({
        template_id: templateId,
        used_by: userId,
        ticket_id: ticketId,
        variables_used: variables || {},
        used_at: new Date().toISOString(),
      });

      // Increment usage count
      await supabase.rpc('increment_template_usage', {
        template_id: templateId,
      });
    } catch (error) {
      console.error('Error tracking template usage:', error);
      // Don't throw - usage tracking shouldn't break template processing
    }
  }

  /**
   * Get template usage statistics
   */
  async getTemplateAnalytics(
    templateId: string,
    days = 30,
  ): Promise<{
    total_usage: number;
    unique_users: number;
    avg_rating: number;
    recent_usage: TemplateUsage[];
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data: analytics, error } = await supabase.rpc(
        'get_template_analytics',
        {
          template_id: templateId,
          start_date: startDate.toISOString(),
        },
      );

      if (error) {
        console.error('Failed to fetch template analytics:', error);
        return {
          total_usage: 0,
          unique_users: 0,
          avg_rating: 0,
          recent_usage: [],
        };
      }

      return (
        analytics || {
          total_usage: 0,
          unique_users: 0,
          avg_rating: 0,
          recent_usage: [],
        }
      );
    } catch (error) {
      console.error('Error fetching template analytics:', error);
      return {
        total_usage: 0,
        unique_users: 0,
        avg_rating: 0,
        recent_usage: [],
      };
    }
  }

  /**
   * Search templates by content, tags, or category
   */
  async searchTemplates(
    searchTerm: string,
    userId: string,
    userTier: string,
    filters?: {
      category?: string;
      vendor_type?: string;
      tier_access?: string;
    },
  ): Promise<Template[]> {
    try {
      let query = supabase
        .from('support_templates')
        .select('*')
        .eq('is_active', true)
        .or(`tier_access.eq.all,tier_access.eq.${userTier}`)
        .or(
          `name.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%,tags.cs.{${searchTerm}}`,
        );

      // Apply filters
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }
      if (filters?.vendor_type) {
        query = query.eq('vendor_type', filters.vendor_type);
      }
      if (filters?.tier_access) {
        query = query.eq('tier_access', filters.tier_access);
      }

      const { data: templates, error } = await query
        .order('usage_count', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Template search failed:', error);
        return [];
      }

      return templates || [];
    } catch (error) {
      console.error('Error searching templates:', error);
      return [];
    }
  }

  /**
   * Get template suggestions based on ticket classification
   */
  async getSuggestedTemplates(
    ticketCategory: string,
    ticketType: string,
    vendorType?: string,
    userTier: string = 'professional',
  ): Promise<Template[]> {
    try {
      let query = supabase
        .from('support_templates')
        .select('*')
        .eq('is_active', true)
        .eq('category', ticketCategory)
        .or(`tier_access.eq.all,tier_access.eq.${userTier}`);

      // Prefer templates for specific vendor type
      if (vendorType) {
        query = query.or(`vendor_type.eq.${vendorType},vendor_type.is.null`);
      }

      const { data: templates, error } = await query
        .order('usage_count', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Failed to get suggested templates:', error);
        return [];
      }

      return templates || [];
    } catch (error) {
      console.error('Error getting suggested templates:', error);
      return [];
    }
  }

  /**
   * Initialize built-in wedding industry templates
   */
  async initializeWeddingTemplates(createdBy: string): Promise<void> {
    try {
      console.log('Initializing wedding industry templates...');

      for (const [key, template] of Object.entries(this.weddingTemplates)) {
        // Check if template already exists
        const { data: existing } = await supabase
          .from('support_templates')
          .select('id')
          .eq('name', key)
          .single();

        if (!existing) {
          await this.createTemplate({
            name: key,
            category: key.includes('emergency')
              ? 'wedding_emergency'
              : key.includes('data')
                ? 'data_recovery'
                : key.includes('payment')
                  ? 'billing'
                  : 'technical_support',
            subject: template.subject,
            content: template.content,
            variables: template.variables as TemplateVariable[],
            tags: ['wedding', 'built-in', key.replace(/_/g, '-')],
            tier_access: 'all',
            is_active: true,
            created_by: createdBy,
          });
        }
      }

      console.log('Wedding industry templates initialized successfully');
    } catch (error) {
      console.error('Error initializing wedding templates:', error);
    }
  }

  /**
   * Rate template effectiveness after use
   */
  async rateTemplate(
    templateId: string,
    userId: string,
    ticketId: string,
    rating: number,
    feedback?: string,
  ): Promise<boolean> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Update the usage record with rating
      await supabase
        .from('template_usage')
        .update({
          agent_rating: rating,
          feedback: feedback,
        })
        .eq('template_id', templateId)
        .eq('used_by', userId)
        .eq('ticket_id', ticketId);

      // Recalculate average rating
      await supabase.rpc('update_template_avg_rating', {
        template_id: templateId,
      });

      return true;
    } catch (error) {
      console.error('Error rating template:', error);
      return false;
    }
  }
}

export default TemplateManager;
