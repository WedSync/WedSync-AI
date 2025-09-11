import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Type definitions for invitation system
export interface InvitationCode {
  id: string;
  code: string;
  supplier_id: string;
  supplier_type: string;
  supplier_name: string;
  supplier_logo_url?: string;
  supplier_brand_color: string;
  couple_names?: string;
  wedding_date?: string;
  personalized_message?: string;
  is_active: boolean;
  expires_at?: string;
  max_uses?: number;
  current_uses: number;
  created_at: string;
  updated_at: string;
}

export interface InvitationVisit {
  id: string;
  invitation_code_id: string;
  ip_address?: string;
  user_agent?: string;
  referer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  country?: string;
  region?: string;
  city?: string;
  device_type?: string;
  browser?: string;
  os?: string;
  session_id?: string;
  visit_duration?: number;
  created_at: string;
}

export interface InvitationConversion {
  id: string;
  invitation_code_id: string;
  visit_id?: string;
  converted_user_id?: string;
  email: string;
  full_name?: string;
  oauth_provider?: string;
  time_to_convert?: number;
  funnel_step: string;
  attributed_utm_source?: string;
  attributed_utm_medium?: string;
  attributed_utm_campaign?: string;
  created_at: string;
}

export interface SupplierInvitationSettings {
  id: string;
  supplier_id: string;
  default_brand_color: string;
  default_logo_url?: string;
  welcome_message_template: string;
  value_proposition: string;
  call_to_action: string;
  featured_benefits: string[];
  google_analytics_id?: string;
  facebook_pixel_id?: string;
  conversion_webhook_url?: string;
  enable_ab_testing: boolean;
  variant_weights: Record<string, number>;
  created_at: string;
  updated_at: string;
}

// Validation schemas
export const CreateInvitationCodeSchema = z.object({
  supplier_id: z.string().uuid(),
  supplier_type: z.string().min(1),
  supplier_name: z.string().min(1),
  supplier_logo_url: z.string().url().optional(),
  supplier_brand_color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .default('#000000'),
  couple_names: z.string().optional(),
  wedding_date: z.string().optional(),
  personalized_message: z.string().optional(),
  expires_at: z.string().datetime().optional(),
  max_uses: z.number().positive().optional(),
});

export const TrackVisitSchema = z.object({
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  referer: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  device_type: z.enum(['mobile', 'desktop', 'tablet']).optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  session_id: z.string().optional(),
});

export const TrackConversionSchema = z.object({
  visit_id: z.string().uuid().optional(),
  email: z.string().email(),
  full_name: z.string().optional(),
  oauth_provider: z.enum(['google', 'apple', 'email']).optional(),
  time_to_convert: z.number().optional(),
  attributed_utm_source: z.string().optional(),
  attributed_utm_medium: z.string().optional(),
  attributed_utm_campaign: z.string().optional(),
});

export class InvitationService {
  /**
   * Get invitation code details by code
   */
  static async getInvitationByCode(
    code: string,
  ): Promise<InvitationCode | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', code)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    // Check if invitation is expired
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return null;
    }

    return data as InvitationCode;
  }

  /**
   * Create a new invitation code
   */
  static async createInvitationCode(
    data: z.infer<typeof CreateInvitationCodeSchema>,
  ): Promise<InvitationCode> {
    const validated = CreateInvitationCodeSchema.parse(data);
    const supabase = await createClient();

    // Generate unique code
    const code = await this.generateUniqueCode();

    const { data: invitation, error } = await supabase
      .from('invitation_codes')
      .insert({
        ...validated,
        code,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create invitation code: ${error.message}`);
    }

    return invitation as InvitationCode;
  }

  /**
   * Track a visit to an invitation landing page
   */
  static async trackVisit(
    invitationCodeId: string,
    visitData: z.infer<typeof TrackVisitSchema>,
  ): Promise<InvitationVisit> {
    const validated = TrackVisitSchema.parse(visitData);
    const supabase = await createClient();

    const { data: visit, error } = await supabase
      .from('invitation_visits')
      .insert({
        invitation_code_id: invitationCodeId,
        ...validated,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to track visit: ${error.message}`);
    }

    return visit as InvitationVisit;
  }

  /**
   * Track a successful conversion (signup)
   */
  static async trackConversion(
    invitationCodeId: string,
    conversionData: z.infer<typeof TrackConversionSchema>,
  ): Promise<InvitationConversion> {
    const validated = TrackConversionSchema.parse(conversionData);
    const supabase = await createClient();

    const { data: conversion, error } = await supabase
      .from('invitation_conversions')
      .insert({
        invitation_code_id: invitationCodeId,
        funnel_step: 'signup_completed',
        ...validated,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to track conversion: ${error.message}`);
    }

    // Update invitation code usage count
    await supabase
      .from('invitation_codes')
      .update({
        current_uses: supabase.raw('current_uses + 1'),
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationCodeId);

    return conversion as InvitationConversion;
  }

  /**
   * Get supplier invitation settings
   */
  static async getSupplierSettings(
    supplierId: string,
  ): Promise<SupplierInvitationSettings | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('supplier_invitation_settings')
      .select('*')
      .eq('supplier_id', supplierId)
      .single();

    if (error || !data) {
      return null;
    }

    return data as SupplierInvitationSettings;
  }

  /**
   * Create or update supplier invitation settings
   */
  static async upsertSupplierSettings(
    supplierId: string,
    settings: Partial<SupplierInvitationSettings>,
  ): Promise<SupplierInvitationSettings> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('supplier_invitation_settings')
      .upsert({
        supplier_id: supplierId,
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update supplier settings: ${error.message}`);
    }

    return data as SupplierInvitationSettings;
  }

  /**
   * Get invitation analytics
   */
  static async getInvitationAnalytics(invitationCodeId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invitation_analytics')
      .select('*')
      .eq('invitation_code_id', invitationCodeId)
      .single();

    if (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all invitation codes for a supplier
   */
  static async getSupplierInvitations(
    supplierId: string,
  ): Promise<InvitationCode[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get supplier invitations: ${error.message}`);
    }

    return data as InvitationCode[];
  }

  /**
   * Deactivate an invitation code
   */
  static async deactivateInvitation(invitationCodeId: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
      .from('invitation_codes')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationCodeId);

    if (error) {
      throw new Error(`Failed to deactivate invitation: ${error.message}`);
    }
  }

  /**
   * Generate a unique invitation code
   */
  private static async generateUniqueCode(): Promise<string> {
    const supabase = await createClient();

    const generateCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excludes confusing chars
      let result = '';
      for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const code = generateCode();

      const { data } = await supabase
        .from('invitation_codes')
        .select('id')
        .eq('code', code)
        .single();

      if (!data) {
        return code; // Code is unique
      }

      attempts++;
    }

    // Fallback: use timestamp-based code
    return 'INV' + Date.now().toString(36).toUpperCase();
  }

  /**
   * Parse user agent for device information
   */
  static parseUserAgent(userAgent: string): {
    device_type: 'mobile' | 'desktop' | 'tablet';
    browser: string;
    os: string;
  } {
    const ua = userAgent.toLowerCase();

    // Device type detection
    let device_type: 'mobile' | 'desktop' | 'tablet' = 'desktop';
    if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
      device_type = 'mobile';
    } else if (/tablet|ipad/i.test(ua)) {
      device_type = 'tablet';
    }

    // Browser detection
    let browser = 'unknown';
    if (ua.includes('firefox')) browser = 'firefox';
    else if (ua.includes('chrome')) browser = 'chrome';
    else if (ua.includes('safari')) browser = 'safari';
    else if (ua.includes('edge')) browser = 'edge';

    // OS detection
    let os = 'unknown';
    if (ua.includes('windows')) os = 'windows';
    else if (ua.includes('mac')) os = 'macos';
    else if (ua.includes('linux')) os = 'linux';
    else if (ua.includes('android')) os = 'android';
    else if (ua.includes('ios')) os = 'ios';

    return { device_type, browser, os };
  }

  /**
   * Validate invitation code format
   */
  static isValidCodeFormat(code: string): boolean {
    return /^[A-Z0-9]{6,12}$/.test(code);
  }

  /**
   * Build invitation URL
   */
  static buildInvitationUrl(code: string, baseUrl?: string): string {
    const base =
      baseUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://wedme.app';
    return `${base}/invite/${code}`;
  }
}
