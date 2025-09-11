import { createClient } from '@/lib/supabase/client';
import { Database } from '@/types/supabase';

type Tables = Database['public']['Tables'];
type Couple = Tables['couples']['Row'];
type CoupleInsert = Tables['couples']['Insert'];
type InvitationLink = Tables['invitation_links']['Row'];
type OAuthAccount = Tables['oauth_accounts']['Row'];

export interface CoupleSignupData {
  // Account details
  email: string;
  password: string;
  firstName: string;
  lastName: string;

  // Wedding details
  weddingDate?: string;
  venueName?: string;
  venueAddress?: string;
  guestCount?: string;
  budget?: string;

  // Partner details
  hasPartner?: boolean;
  partnerFirstName?: string;
  partnerLastName?: string;
  partnerEmail?: string;
  partnerPhone?: string;

  // Preferences
  weddingStyle?: string;
  weddingTheme?: string;
  communicationPreference?: string;
  notifications?: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };

  // Legal agreements
  agreeToTerms: boolean;
  agreeToPrivacy: boolean;
  agreeToMarketing?: boolean;

  // Invitation context
  invitationToken?: string;
}

export interface CoupleSignupResult {
  success: boolean;
  user?: any;
  couple?: Couple;
  error?: string;
  redirect?: string;
}

export interface InvitationValidationResult {
  valid: boolean;
  invitation?: InvitationLink & { vendor?: any };
  error?: string;
}

class CoupleAuthService {
  private supabase = createClient();

  /**
   * Validate invitation token and get prefilled data
   */
  async validateInvitation(token: string): Promise<InvitationValidationResult> {
    try {
      const { data: invitation, error } = await this.supabase
        .from('invitation_links')
        .select(
          `
          *,
          vendors!supplier_id (
            id,
            business_name,
            first_name,
            last_name,
            email,
            phone
          )
        `,
        )
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !invitation) {
        return {
          valid: false,
          error: 'Invalid or expired invitation link',
        };
      }

      // Check if invitation has expired
      if (
        invitation.expires_at &&
        new Date(invitation.expires_at) < new Date()
      ) {
        await this.supabase
          .from('invitation_links')
          .update({ status: 'expired' })
          .eq('id', invitation.id);

        return {
          valid: false,
          error: 'Invitation link has expired',
        };
      }

      return {
        valid: true,
        invitation,
      };
    } catch (error) {
      console.error('Error validating invitation:', error);
      return {
        valid: false,
        error: 'Failed to validate invitation',
      };
    }
  }

  /**
   * Create couple account with complete onboarding
   */
  async createCoupleAccount(
    signupData: CoupleSignupData,
  ): Promise<CoupleSignupResult> {
    try {
      let invitationData: InvitationLink | null = null;

      // Validate invitation if provided
      if (signupData.invitationToken) {
        const validation = await this.validateInvitation(
          signupData.invitationToken,
        );
        if (!validation.valid) {
          return {
            success: false,
            error: validation.error,
          };
        }
        invitationData = validation.invitation!;
      }

      // Create auth user
      const { data: authData, error: authError } =
        await this.supabase.auth.signUp({
          email: signupData.email,
          password: signupData.password,
          options: {
            data: {
              first_name: signupData.firstName,
              last_name: signupData.lastName,
              role: 'couple',
              signup_method: 'email',
              invitation_token: signupData.invitationToken,
            },
          },
        });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create user profile in users table
      const { error: userError } = await this.supabase.from('users').insert({
        id: authData.user.id,
        email: signupData.email,
        first_name: signupData.firstName,
        last_name: signupData.lastName,
        role: 'couple',
        phone: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (userError) {
        console.error('Error creating user profile:', userError);
        // Continue anyway - this is not critical for the flow
      }

      // Create couple profile
      const coupleData: CoupleInsert = {
        user_id: authData.user.id,
        wedding_date: signupData.weddingDate
          ? new Date(signupData.weddingDate).toISOString()
          : null,
        venue_name: signupData.venueName || invitationData?.venue_name || null,
        venue_address: signupData.venueAddress || null,
        guest_count: signupData.guestCount
          ? parseInt(signupData.guestCount)
          : null,
        budget: signupData.budget ? parseFloat(signupData.budget) : null,
        invitation_token: signupData.invitationToken || null,
        supplier_id: invitationData?.supplier_id || null,
        wedding_style: signupData.weddingStyle || null,
        wedding_theme: signupData.weddingTheme || null,
        partner_first_name: signupData.hasPartner
          ? signupData.partnerFirstName
          : null,
        partner_last_name: signupData.hasPartner
          ? signupData.partnerLastName
          : null,
        partner_email: signupData.hasPartner ? signupData.partnerEmail : null,
        partner_phone: signupData.hasPartner ? signupData.partnerPhone : null,
        primary_contact_preference:
          signupData.communicationPreference || 'email',
        notification_preferences: signupData.notifications || {
          email: true,
          sms: false,
          push: true,
        },
        onboarding_progress: {
          steps_completed: 1,
          total_steps: 5,
          current_step: 'basic_info',
        },
      };

      const { data: couple, error: coupleError } = await this.supabase
        .from('couples')
        .insert(coupleData)
        .select()
        .single();

      if (coupleError) {
        throw coupleError;
      }

      // Create couple preferences
      await this.supabase.from('couple_preferences').insert({
        couple_id: couple.id,
        communication_preferences: {
          email_frequency: 'weekly',
          sms_enabled: signupData.notifications?.sms || false,
          push_enabled: signupData.notifications?.push || true,
          marketing_emails: signupData.agreeToMarketing || false,
          reminder_emails: true,
        },
      });

      // Handle invitation acceptance if present
      if (invitationData) {
        await this.acceptInvitation(
          couple.id,
          invitationData,
          authData.user.id,
        );
      }

      // Track initial onboarding step
      await this.trackOnboardingStep(couple.id, 'account_creation', {
        signup_method: 'email',
        has_partner: signupData.hasPartner || false,
        invitation_used: !!signupData.invitationToken,
      });

      // Track signup analytics
      await this.trackSignupAnalytics(authData.user.id, couple.id, {
        signup_method: 'email',
        invitation_token: signupData.invitationToken,
        completed: true,
      });

      return {
        success: true,
        user: authData.user,
        couple,
        redirect: signupData.invitationToken
          ? '/onboarding?from=invitation'
          : '/onboarding',
      };
    } catch (error: any) {
      console.error('Couple signup error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create account',
      };
    }
  }

  /**
   * Handle OAuth signup completion
   */
  async handleOAuthSignup(
    user: any,
    provider: string,
    invitationToken?: string,
  ): Promise<CoupleSignupResult> {
    try {
      let invitationData: InvitationLink | null = null;

      // Validate invitation if provided
      if (invitationToken) {
        const validation = await this.validateInvitation(invitationToken);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.error,
          };
        }
        invitationData = validation.invitation!;
      }

      // Create OAuth account record
      await this.supabase.from('oauth_accounts').insert({
        user_id: user.id,
        provider,
        provider_user_id: user.user_metadata?.sub || user.id,
        provider_email: user.email,
        provider_name:
          user.user_metadata?.full_name || user.user_metadata?.name,
        provider_picture:
          user.user_metadata?.avatar_url || user.user_metadata?.picture,
      });

      // Create user profile if not exists
      const { error: userError } = await this.supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        first_name:
          user.user_metadata?.given_name ||
          user.user_metadata?.first_name ||
          '',
        last_name:
          user.user_metadata?.family_name ||
          user.user_metadata?.last_name ||
          '',
        role: 'couple',
        phone: user.user_metadata?.phone || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (userError) {
        console.error('Error creating user profile:', userError);
      }

      // Create couple profile
      const coupleData: CoupleInsert = {
        user_id: user.id,
        invitation_token: invitationToken || null,
        supplier_id: invitationData?.supplier_id || null,
        wedding_date: invitationData?.wedding_date || null,
        venue_name: invitationData?.venue_name || null,
        primary_contact_preference: 'email',
        notification_preferences: {
          email: true,
          sms: false,
          push: true,
        },
        onboarding_progress: {
          steps_completed: 1,
          total_steps: 5,
          current_step: 'basic_info',
        },
      };

      const { data: couple, error: coupleError } = await this.supabase
        .from('couples')
        .insert(coupleData)
        .select()
        .single();

      if (coupleError) {
        throw coupleError;
      }

      // Create default preferences
      await this.supabase.from('couple_preferences').insert({
        couple_id: couple.id,
      });

      // Handle invitation acceptance if present
      if (invitationData) {
        await this.acceptInvitation(couple.id, invitationData, user.id);
      }

      // Track onboarding step
      await this.trackOnboardingStep(couple.id, 'account_creation', {
        signup_method: provider,
        oauth_provider: provider,
        invitation_used: !!invitationToken,
      });

      // Track signup analytics
      await this.trackSignupAnalytics(user.id, couple.id, {
        signup_method: provider,
        invitation_token: invitationToken,
        completed: true,
      });

      return {
        success: true,
        user,
        couple,
        redirect: invitationToken
          ? '/onboarding?from=invitation'
          : '/onboarding',
      };
    } catch (error: any) {
      console.error('OAuth signup error:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete OAuth signup',
      };
    }
  }

  /**
   * Accept invitation and create vendor relationship
   */
  private async acceptInvitation(
    coupleId: string,
    invitation: InvitationLink,
    userId: string,
  ): Promise<void> {
    try {
      // Create vendor relationship
      await this.supabase.from('couple_vendor_relationships').insert({
        couple_id: coupleId,
        vendor_id: invitation.supplier_id,
        relationship_type: 'client',
        connected_via: 'invitation',
        invitation_link_id: invitation.id,
      });

      // Update invitation status
      await this.supabase
        .from('invitation_links')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by_user_id: userId,
        })
        .eq('id', invitation.id);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      // Don't throw - this shouldn't stop the signup process
    }
  }

  /**
   * Track onboarding step completion
   */
  private async trackOnboardingStep(
    coupleId: string,
    stepName: string,
    stepData: any = {},
  ): Promise<void> {
    try {
      await this.supabase.from('onboarding_steps').insert({
        couple_id: coupleId,
        step_name: stepName,
        step_order: this.getStepOrder(stepName),
        completed: true,
        completed_at: new Date().toISOString(),
        data: stepData,
      });
    } catch (error) {
      console.error('Error tracking onboarding step:', error);
    }
  }

  /**
   * Track signup analytics
   */
  private async trackSignupAnalytics(
    userId: string,
    coupleId: string,
    analytics: {
      signup_method: string;
      invitation_token?: string;
      completed: boolean;
    },
  ): Promise<void> {
    try {
      await this.supabase.from('signup_analytics').insert({
        user_id: userId,
        couple_id: coupleId,
        signup_method: analytics.signup_method,
        referral_source: analytics.invitation_token
          ? 'supplier_invitation'
          : 'direct',
        completed: analytics.completed,
        time_to_complete_seconds: 0, // TODO: Track actual time
      });
    } catch (error) {
      console.error('Error tracking signup analytics:', error);
    }
  }

  /**
   * Get step order for onboarding tracking
   */
  private getStepOrder(stepName: string): number {
    const stepOrders: Record<string, number> = {
      account_creation: 1,
      basic_info: 2,
      partner_info: 3,
      vendor_connection: 4,
      preferences: 5,
    };
    return stepOrders[stepName] || 0;
  }

  /**
   * Get couple profile by user ID
   */
  async getCoupleProfile(userId: string): Promise<Couple | null> {
    try {
      const { data, error } = await this.supabase
        .from('couples')
        .select(
          `
          *,
          couple_preferences (*),
          couple_vendor_relationships (
            *,
            vendors (*)
          )
        `,
        )
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching couple profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching couple profile:', error);
      return null;
    }
  }

  /**
   * Update onboarding progress
   */
  async updateOnboardingProgress(
    coupleId: string,
    stepName: string,
    stepData: any = {},
  ): Promise<any> {
    try {
      const { data, error } = await this.supabase.rpc(
        'update_onboarding_progress',
        {
          p_couple_id: coupleId,
          p_step_name: stepName,
          p_step_data: stepData,
        },
      );

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating onboarding progress:', error);
      throw error;
    }
  }
}

export const coupleAuthService = new CoupleAuthService();
export default coupleAuthService;
