// Tier Limitations System - Enforces subscription limits
// Critical for revenue generation - must work perfectly
// UPDATED: 5-tier structure with GBP pricing

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export type PricingTier =
  | 'FREE'
  | 'STARTER'
  | 'PROFESSIONAL'
  | 'SCALE'
  | 'ENTERPRISE';

export interface TierLimits {
  logins: number; // -1 for unlimited
  forms: number; // -1 for unlimited
  submissions_per_month: number; // -1 for unlimited (deprecated, keeping for compatibility)
  pdf_import: boolean;
  ai_chatbot: boolean;
  email_enabled: boolean;
  sms_enabled: boolean | 'bring_own';
  api_access: boolean | 'full';
  white_label: boolean;
  client_portal: boolean;
  file_upload_size_mb: number;
  custom_domain: boolean;
  priority_support: boolean;
  phone_support: boolean;
  directory_listing: false | 'basic' | 'premium' | 'featured';
  show_branding: boolean | string; // false or "Powered by WedSync"
}

// CORRECTED tier limits - 5 tiers with GBP pricing
export const TIER_LIMITS: Record<PricingTier, TierLimits> = {
  FREE: {
    logins: 1,
    forms: 1, // Can't create new ones after trial
    submissions_per_month: -1, // Deprecated
    pdf_import: false,
    ai_chatbot: false,
    email_enabled: false,
    sms_enabled: false,
    api_access: false,
    white_label: false,
    client_portal: false,
    file_upload_size_mb: 5,
    custom_domain: false,
    priority_support: false,
    phone_support: false,
    directory_listing: false,
    show_branding: 'Powered by WedSync',
  },
  STARTER: {
    logins: 2,
    forms: -1, // Unlimited
    submissions_per_month: -1,
    pdf_import: true, // ✅ Session B feature enabled!
    ai_chatbot: false,
    email_enabled: true,
    sms_enabled: 'bring_own', // Bring own Twilio
    api_access: false,
    white_label: false,
    client_portal: true,
    file_upload_size_mb: 25,
    custom_domain: false,
    priority_support: false,
    phone_support: false,
    directory_listing: 'basic',
    show_branding: false, // No WedSync branding
  },
  PROFESSIONAL: {
    logins: 3,
    forms: -1,
    submissions_per_month: -1,
    pdf_import: true,
    ai_chatbot: true, // ✅ Major differentiator
    email_enabled: true,
    sms_enabled: true, // Full SMS
    api_access: false,
    white_label: false,
    client_portal: true,
    file_upload_size_mb: 50,
    custom_domain: false,
    priority_support: true,
    phone_support: false,
    directory_listing: 'premium',
    show_branding: false,
  },
  SCALE: {
    logins: 5,
    forms: -1,
    submissions_per_month: -1,
    pdf_import: true,
    ai_chatbot: true,
    email_enabled: true,
    sms_enabled: true,
    api_access: true, // API access
    white_label: false,
    client_portal: true,
    file_upload_size_mb: 100,
    custom_domain: true,
    priority_support: true,
    phone_support: true,
    directory_listing: 'featured',
    show_branding: false,
  },
  ENTERPRISE: {
    logins: -1, // Unlimited
    forms: -1,
    submissions_per_month: -1,
    pdf_import: true,
    ai_chatbot: true,
    email_enabled: true,
    sms_enabled: true,
    api_access: 'full', // Full API access
    white_label: true, // White label options
    client_portal: true,
    file_upload_size_mb: 500,
    custom_domain: true,
    priority_support: true,
    phone_support: true,
    directory_listing: 'featured',
    show_branding: false,
  },
};

// Pricing information (GBP)
export const TIER_PRICING = {
  FREE: {
    monthly: 0,
    annual: 0,
    currency: 'GBP',
    name: 'Free',
    description: 'Perfect for trying out WedSync',
  },
  STARTER: {
    monthly: 19, // £19
    annual: 190, // £190 (2 months free)
    currency: 'GBP',
    name: 'Starter',
    description: 'Great for solo wedding vendors',
  },
  PROFESSIONAL: {
    monthly: 49, // £49
    annual: 490, // £490 (2 months free)
    currency: 'GBP',
    name: 'Professional',
    description: 'Everything you need to scale your wedding business',
  },
  SCALE: {
    monthly: 79, // £79
    annual: 790, // £790 (2 months free)
    currency: 'GBP',
    name: 'Scale',
    description: 'For established wedding businesses',
  },
  ENTERPRISE: {
    monthly: 149, // £149
    annual: 1490, // £1490 (2 months free)
    currency: 'GBP',
    name: 'Enterprise',
    description: 'For agencies and wedding venues',
  },
};

export interface UsageStats {
  forms_count: number;
  submissions_this_month: number;
  team_members_count: number;
  storage_used_mb: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  current_usage: number;
  limit: number;
  message?: string;
  upgrade_options?: Array<{
    tier: PricingTier;
    price: number;
    cta: string;
  }>;
  upgrade_url?: string;
}

export class TierLimitsManager {
  private supabase;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Get organization's current tier
   */
  async getCurrentTier(organizationId?: string): Promise<PricingTier> {
    try {
      let orgId = organizationId;

      if (!orgId) {
        const {
          data: { user },
        } = await this.supabase.auth.getUser();
        if (!user) return 'FREE';

        const { data: profile } = await this.supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        orgId = profile?.organization_id;
      }

      if (!orgId) return 'FREE';

      const { data, error } = await this.supabase
        .from('organizations')
        .select('pricing_tier')
        .eq('id', orgId)
        .single();

      if (error || !data) return 'FREE';

      return (data.pricing_tier as PricingTier) || 'FREE';
    } catch (error) {
      console.error('Error getting current tier:', error);
      return 'FREE';
    }
  }

  /**
   * Get current usage statistics
   */
  async getCurrentUsage(organizationId?: string): Promise<UsageStats> {
    try {
      let orgId = organizationId;

      if (!orgId) {
        const {
          data: { user },
        } = await this.supabase.auth.getUser();
        if (!user) throw new Error('No authenticated user');

        const { data: profile } = await this.supabase
          .from('user_profiles')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();

        orgId = profile?.organization_id;
      }

      if (!orgId) throw new Error('No organization found');

      // Count forms
      const { count: formsCount } = await this.supabase
        .from('forms')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('is_archived', false);

      // Count submissions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: submissionsCount } = await this.supabase
        .from('form_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('created_at', startOfMonth.toISOString());

      // Count team members
      const { count: teamCount } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId);

      return {
        forms_count: formsCount || 0,
        submissions_this_month: submissionsCount || 0,
        team_members_count: teamCount || 0,
        storage_used_mb: 0, // TODO: Implement storage tracking
      };
    } catch (error) {
      console.error('Error getting usage stats:', error);
      return {
        forms_count: 0,
        submissions_this_month: 0,
        team_members_count: 0,
        storage_used_mb: 0,
      };
    }
  }

  /**
   * Check if user can create a new form (updated for 5-tier structure)
   */
  async canCreateForm(organizationId?: string): Promise<LimitCheckResult> {
    const tier = await this.getCurrentTier(organizationId);
    const usage = await this.getCurrentUsage(organizationId);
    const limits = TIER_LIMITS[tier];

    if (limits.forms === -1) {
      return { allowed: true, current_usage: usage.forms_count, limit: -1 };
    }

    if (usage.forms_count >= limits.forms) {
      // FREE tier can only have 1 form
      if (tier === 'FREE') {
        return {
          allowed: false,
          current_usage: usage.forms_count,
          limit: limits.forms,
          message: `Free tier is limited to 1 form. Upgrade to Starter for unlimited forms and PDF import.`,
          upgrade_options: [
            {
              tier: 'STARTER',
              price: TIER_PRICING.STARTER.monthly,
              cta: 'Upgrade to Starter (£19/mo)',
            },
            {
              tier: 'PROFESSIONAL',
              price: TIER_PRICING.PROFESSIONAL.monthly,
              cta: 'Go Professional (£49/mo)',
            },
          ],
          upgrade_url: '/pricing',
        };
      }

      return {
        allowed: false,
        current_usage: usage.forms_count,
        limit: limits.forms,
        message: `You've reached your form limit.`,
        upgrade_url: '/pricing',
      };
    }

    return {
      allowed: true,
      current_usage: usage.forms_count,
      limit: limits.forms,
    };
  }

  /**
   * Check if user can submit to a form
   */
  async canSubmitForm(organizationId?: string): Promise<LimitCheckResult> {
    const tier = await this.getCurrentTier(organizationId);
    const usage = await this.getCurrentUsage(organizationId);
    const limits = TIER_LIMITS[tier];

    if (limits.submissions_per_month === -1) {
      return {
        allowed: true,
        current_usage: usage.submissions_this_month,
        limit: -1,
      };
    }

    if (usage.submissions_this_month >= limits.submissions_per_month) {
      return {
        allowed: false,
        current_usage: usage.submissions_this_month,
        limit: limits.submissions_per_month,
        message: `You've reached your monthly submission limit (${limits.submissions_per_month} for ${tier} tier). Upgrade for unlimited submissions.`,
        upgrade_options: [
          {
            tier: 'PROFESSIONAL',
            price: TIER_PRICING.PROFESSIONAL.monthly,
            cta: 'Upgrade Now',
          },
        ],
        upgrade_url: '/pricing',
      };
    }

    // Warn when approaching limit
    const remaining =
      limits.submissions_per_month - usage.submissions_this_month;
    if (remaining <= 10) {
      return {
        allowed: true,
        current_usage: usage.submissions_this_month,
        limit: limits.submissions_per_month,
        message: `⚠️ Only ${remaining} submission${remaining > 1 ? 's' : ''} remaining this month`,
      };
    }

    return {
      allowed: true,
      current_usage: usage.submissions_this_month,
      limit: limits.submissions_per_month,
    };
  }

  /**
   * Check if feature is available for tier (updated for 5-tier structure)
   */
  async isFeatureAvailable(
    feature: keyof TierLimits,
    organizationId?: string,
  ): Promise<boolean> {
    const tier = await this.getCurrentTier(organizationId);
    const limits = TIER_LIMITS[tier];

    const value = limits[feature];

    // For boolean features
    if (typeof value === 'boolean') {
      return value;
    }

    // For numeric limits (-1 means unlimited/available)
    if (typeof value === 'number') {
      return value === -1 || value > 0;
    }

    // For string features (like directory_listing)
    if (typeof value === 'string') {
      return value !== false;
    }

    return false;
  }

  /**
   * Check if user can use PDF import (STARTER+ only)
   */
  async canUsePdfImport(organizationId?: string): Promise<LimitCheckResult> {
    const tier = await this.getCurrentTier(organizationId);
    const limits = TIER_LIMITS[tier];

    if (!limits.pdf_import) {
      return {
        allowed: false,
        current_usage: 0,
        limit: 0,
        message: 'PDF Import requires Starter subscription or higher',
        upgrade_options: [
          {
            tier: 'STARTER',
            price: TIER_PRICING.STARTER.monthly,
            cta: 'Unlock PDF Import (£19/mo)',
          },
        ],
        upgrade_url: '/pricing',
      };
    }

    return { allowed: true, current_usage: 0, limit: -1 };
  }

  /**
   * Check if user can use AI chatbot (PROFESSIONAL+ only)
   */
  async canUseAiChatbot(organizationId?: string): Promise<LimitCheckResult> {
    const tier = await this.getCurrentTier(organizationId);
    const limits = TIER_LIMITS[tier];

    if (!limits.ai_chatbot) {
      return {
        allowed: false,
        current_usage: 0,
        limit: 0,
        message: 'AI Chatbot requires Professional subscription or higher',
        upgrade_options: [
          {
            tier: 'PROFESSIONAL',
            price: TIER_PRICING.PROFESSIONAL.monthly,
            cta: 'Unlock AI Chatbot (£49/mo)',
          },
        ],
        upgrade_url: '/pricing',
      };
    }

    return { allowed: true, current_usage: 0, limit: -1 };
  }

  /**
   * Check if user can use API access (SCALE+ only)
   */
  async canUseApiAccess(organizationId?: string): Promise<LimitCheckResult> {
    const tier = await this.getCurrentTier(organizationId);
    const limits = TIER_LIMITS[tier];

    if (!limits.api_access) {
      return {
        allowed: false,
        current_usage: 0,
        limit: 0,
        message: 'API Access requires Scale subscription or higher',
        upgrade_options: [
          {
            tier: 'SCALE',
            price: TIER_PRICING.SCALE.monthly,
            cta: 'Unlock API Access (£79/mo)',
          },
        ],
        upgrade_url: '/pricing',
      };
    }

    return { allowed: true, current_usage: 0, limit: -1 };
  }

  /**
   * Get branding requirements for tier
   */
  async getBrandingRequirements(organizationId?: string): Promise<{
    show_branding: boolean;
    branding_text: string;
    branding_link: string;
  }> {
    const tier = await this.getCurrentTier(organizationId);
    const limits = TIER_LIMITS[tier];

    return {
      show_branding: limits.show_branding,
      branding_text: 'Powered by WedSync',
      branding_link: 'https://wedsync.io?ref=form',
    };
  }

  /**
   * Check if user can add team member
   */
  async canAddTeamMember(organizationId?: string): Promise<LimitCheckResult> {
    const tier = await this.getCurrentTier(organizationId);
    const usage = await this.getCurrentUsage(organizationId);
    const limits = TIER_LIMITS[tier];

    if (limits.team_members === -1) {
      return {
        allowed: true,
        current_usage: usage.team_members_count,
        limit: -1,
      };
    }

    if (usage.team_members_count >= limits.team_members) {
      return {
        allowed: false,
        current_usage: usage.team_members_count,
        limit: limits.team_members,
        message: `Team member limit reached (${limits.team_members} for ${tier} tier)`,
        upgrade_options:
          tier === 'FREE'
            ? [
                {
                  tier: 'PROFESSIONAL',
                  price: TIER_PRICING.PROFESSIONAL.monthly,
                  cta: 'Upgrade for 5 team members',
                },
                {
                  tier: 'SCALE',
                  price: TIER_PRICING.SCALE.monthly,
                  cta: 'Unlimited team members',
                },
              ]
            : [
                {
                  tier: 'SCALE',
                  price: TIER_PRICING.SCALE.monthly,
                  cta: 'Unlimited team members',
                },
              ],
        upgrade_url: '/pricing',
      };
    }

    return {
      allowed: true,
      current_usage: usage.team_members_count,
      limit: limits.team_members,
    };
  }

  /**
   * Get upgrade benefits for a tier
   */
  getUpgradeBenefits(fromTier: PricingTier, toTier: PricingTier): string[] {
    const benefits: string[] = [];
    const fromLimits = TIER_LIMITS[fromTier];
    const toLimits = TIER_LIMITS[toTier];

    if (fromLimits.forms !== toLimits.forms) {
      if (toLimits.forms === -1) {
        benefits.push('✅ Unlimited forms');
      } else if (toLimits.forms > fromLimits.forms) {
        benefits.push(`✅ Up to ${toLimits.forms} forms`);
      }
    }

    if (fromLimits.submissions_per_month !== toLimits.submissions_per_month) {
      if (toLimits.submissions_per_month === -1) {
        benefits.push('✅ Unlimited submissions');
      } else if (
        toLimits.submissions_per_month > fromLimits.submissions_per_month
      ) {
        benefits.push(`✅ ${toLimits.submissions_per_month} submissions/month`);
      }
    }

    if (fromLimits.show_branding && !toLimits.show_branding) {
      benefits.push('✅ Remove WedSync branding');
    }

    if (!fromLimits.email_enabled && toLimits.email_enabled) {
      benefits.push('✅ Email automation');
    }

    if (!fromLimits.sms_enabled && toLimits.sms_enabled) {
      benefits.push('✅ SMS automation');
    }

    if (!fromLimits.api_access && toLimits.api_access) {
      benefits.push('✅ API access');
    }

    if (!fromLimits.white_label && toLimits.white_label) {
      benefits.push('✅ White-label options');
    }

    if (!fromLimits.client_portal && toLimits.client_portal) {
      benefits.push('✅ Client portal');
    }

    if (!fromLimits.priority_support && toLimits.priority_support) {
      benefits.push('✅ Priority support');
    }

    if (!fromLimits.phone_support && toLimits.phone_support) {
      benefits.push('✅ Phone support');
    }

    return benefits;
  }
}

// Export singleton instance
export const tierLimitsManager = new TierLimitsManager();
