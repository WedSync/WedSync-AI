import Stripe from 'stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { generateSecureToken, hashData } from '@/lib/crypto-utils';
import { auditPayment } from '@/lib/security-audit-logger';

// Initialize Stripe with conditional setup
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

export interface StripeConnectAccountData {
  id: string;
  onboarding_url: string;
  return_url: string;
  setup_expires_at: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  capabilities: {
    card_payments: string;
    transfers: string;
  };
}

export interface StripeAccountStatus {
  id: string;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  requirements: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
    pending_verification: string[];
  };
  capabilities: {
    card_payments: string;
    transfers: string;
  };
}

export interface KYCVerificationSession {
  id: string;
  verification_url: string;
  status: string;
  return_url: string;
  expires_at: string;
}

export class StripeConnectService {
  private static readonly CONNECT_CONFIG = {
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual' as const,
    tos_acceptance: {
      service_agreement: 'recipient',
    },
  };

  // Stripe Connect Express Account Creation
  async createExpressAccount(
    supplierId: string,
    applicationId: string,
  ): Promise<StripeConnectAccountData> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Get supplier information
      const { data: supplier, error } = await supabase
        .from('suppliers')
        .select('email, business_name, business_country, phone')
        .eq('id', supplierId)
        .single();

      if (error || !supplier) {
        throw new Error('Supplier not found');
      }

      // Generate request ID for tracking
      const requestId = generateSecureToken(16);

      // Create Stripe Connect account
      const account = await stripe.accounts.create({
        type: 'express',
        country: supplier.business_country || 'GB',
        email: supplier.email,
        capabilities: StripeConnectService.CONNECT_CONFIG.capabilities,
        business_type: StripeConnectService.CONNECT_CONFIG.business_type,
        tos_acceptance: StripeConnectService.CONNECT_CONFIG.tos_acceptance,
        metadata: {
          supplier_id: supplierId,
          application_id: applicationId,
          wedsync_creator: 'true',
          request_id: requestId,
          created_at: new Date().toISOString(),
        },
      });

      // Create onboarding link
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/creator/onboarding/refresh?application=${applicationId}`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/creator/onboarding/complete?application=${applicationId}`,
        type: 'account_onboarding',
      });

      // Update application with Stripe account ID
      await supabase
        .from('marketplace_creator_applications')
        .update({
          stripe_connect_account_id: account.id,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', applicationId);

      // Log account creation
      await this.logAccountActivity(
        supplierId,
        applicationId,
        'account_created',
        {
          account_id: account.id,
          request_id: requestId,
        },
      );

      return {
        id: account.id,
        onboarding_url: accountLink.url,
        return_url: accountLink.return_url,
        setup_expires_at: new Date(accountLink.expires_at * 1000).toISOString(),
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        capabilities: {
          card_payments:
            account.capabilities?.card_payments?.status || 'inactive',
          transfers: account.capabilities?.transfers?.status || 'inactive',
        },
      };
    } catch (error) {
      console.error('Failed to create Stripe Connect account:', error);

      // Log account creation failure
      await this.logAccountActivity(
        supplierId,
        applicationId,
        'account_creation_failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );

      throw new Error('Failed to create payment account. Please try again.');
    }
  }

  // Monitor Account Status
  async getAccountStatus(accountId: string): Promise<StripeAccountStatus> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const account = await stripe.accounts.retrieve(accountId);

      return {
        id: account.id,
        details_submitted: account.details_submitted,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled,
        requirements: {
          currently_due: account.requirements?.currently_due || [],
          eventually_due: account.requirements?.eventually_due || [],
          past_due: account.requirements?.past_due || [],
          pending_verification:
            account.requirements?.pending_verification || [],
        },
        capabilities: {
          card_payments:
            account.capabilities?.card_payments?.status || 'inactive',
          transfers: account.capabilities?.transfers?.status || 'inactive',
        },
      };
    } catch (error) {
      console.error('Failed to get account status:', error);
      throw new Error('Failed to check account status');
    }
  }

  // Verify Account Capabilities
  async verifyAccountCapabilities(accountId: string): Promise<boolean> {
    try {
      const status = await this.getAccountStatus(accountId);

      return (
        status.details_submitted &&
        status.charges_enabled &&
        status.payouts_enabled &&
        status.capabilities.card_payments === 'active' &&
        status.capabilities.transfers === 'active'
      );
    } catch (error) {
      console.error('Failed to verify account capabilities:', error);
      return false;
    }
  }

  // Create Identity Verification Session for KYC
  async createIdentityVerificationSession(
    accountId: string,
    returnUrl?: string,
  ): Promise<KYCVerificationSession> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const verificationSession =
        await stripe.identity.verificationSessions.create({
          type: 'document',
          options: {
            document: {
              allowed_types: ['driving_license', 'id_card', 'passport'],
              require_id_number: true,
              require_live_capture: true,
              require_matching_selfie: true,
            },
          },
          return_url:
            returnUrl ||
            `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/creator/onboarding/kyc-complete`,
          metadata: {
            account_id: accountId,
            verification_type: 'creator_kyc',
            created_at: new Date().toISOString(),
          },
        });

      return {
        id: verificationSession.id,
        verification_url: verificationSession.url,
        status: verificationSession.status,
        return_url: verificationSession.return_url || '',
        expires_at: new Date(
          verificationSession.expires_at * 1000,
        ).toISOString(),
      };
    } catch (error) {
      console.error('Failed to create identity verification session:', error);
      throw new Error('Failed to create identity verification session');
    }
  }

  // Check Identity Verification Status
  async getIdentityVerificationStatus(sessionId: string): Promise<{
    status: string;
    verified: boolean;
    failure_reason?: string;
  }> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const session =
        await stripe.identity.verificationSessions.retrieve(sessionId);

      return {
        status: session.status,
        verified: session.status === 'verified',
        failure_reason: session.last_error?.reason || undefined,
      };
    } catch (error) {
      console.error('Failed to get verification status:', error);
      throw new Error('Failed to check verification status');
    }
  }

  // Handle Webhook for Account Updates
  async handleAccountUpdate(
    accountId: string,
    eventType: string,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      const accountStatus = await this.getAccountStatus(accountId);

      // Find the application associated with this account
      const { data: application, error } = await supabase
        .from('marketplace_creator_applications')
        .select('id, supplier_id, status')
        .eq('stripe_connect_account_id', accountId)
        .single();

      if (error || !application) {
        console.warn(`No application found for account ${accountId}`);
        return;
      }

      // Update application based on account status
      const updates: any = {
        stripe_onboarding_complete: accountStatus.details_submitted,
        last_activity_at: new Date().toISOString(),
      };

      // Check if onboarding is complete
      if (
        accountStatus.details_submitted &&
        accountStatus.charges_enabled &&
        accountStatus.payouts_enabled
      ) {
        updates.application_stage = 'content';

        // Update onboarding progress
        await supabase.from('marketplace_onboarding_progress').upsert(
          {
            creator_application_id: application.id,
            step_name: 'financial',
            status: 'completed',
            completed_at: new Date().toISOString(),
            step_data: {
              stripe_account_id: accountId,
              onboarding_complete: true,
              capabilities_verified:
                await this.verifyAccountCapabilities(accountId),
            },
          },
          {
            onConflict: 'creator_application_id,step_name',
          },
        );
      }

      // Apply updates
      await supabase
        .from('marketplace_creator_applications')
        .update(updates)
        .eq('id', application.id);

      // Log the update
      await this.logAccountActivity(
        application.supplier_id,
        application.id,
        'account_updated',
        {
          account_id: accountId,
          event_type: eventType,
          status: accountStatus,
        },
      );
    } catch (error) {
      console.error('Failed to handle account update:', error);
    }
  }

  // Generate New Account Link (for refresh scenarios)
  async generateAccountLink(
    accountId: string,
    applicationId: string,
  ): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const accountLink = await stripe.accountLinks.create({
        account: accountId,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/creator/onboarding/refresh?application=${applicationId}`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/creator/onboarding/complete?application=${applicationId}`,
        type: 'account_onboarding',
      });

      return accountLink.url;
    } catch (error) {
      console.error('Failed to generate account link:', error);
      throw new Error('Failed to generate account link');
    }
  }

  // Get Account Dashboard Link (for existing accounts)
  async getAccountDashboardLink(accountId: string): Promise<string> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return loginLink.url;
    } catch (error) {
      console.error('Failed to create dashboard link:', error);
      throw new Error('Failed to create dashboard link');
    }
  }

  // Private helper method to log account activities
  private async logAccountActivity(
    supplierId: string,
    applicationId: string,
    activity: string,
    data: any,
  ): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      await supabase.from('marketplace_creator_communications').insert({
        creator_application_id: applicationId,
        communication_type: 'system_log',
        subject: `Account Activity: ${activity}`,
        message_content: JSON.stringify({
          activity,
          supplier_id: supplierId,
          data,
          timestamp: new Date().toISOString(),
        }),
        template_used: 'system_log',
      });
    } catch (error) {
      console.error('Failed to log account activity:', error);
    }
  }

  // Tax Information Collection Helper
  async getTaxFormRequirements(accountId: string): Promise<{
    required: boolean;
    form_type: 'w9' | 'w8ben' | null;
    deadline?: string;
  }> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const account = await stripe.accounts.retrieve(accountId);
      const requirements = account.requirements;

      const taxFormRequired =
        requirements?.currently_due?.some(
          (req) => req.includes('tax_') || req.includes('form_'),
        ) || false;

      // Determine form type based on country
      const formType = account.country === 'US' ? 'w9' : 'w8ben';

      return {
        required: taxFormRequired,
        form_type: taxFormRequired ? formType : null,
        deadline: requirements?.current_deadline
          ? new Date(requirements.current_deadline * 1000).toISOString()
          : undefined,
      };
    } catch (error) {
      console.error('Failed to get tax form requirements:', error);
      return { required: false, form_type: null };
    }
  }

  // Bank Account Verification Status
  async getBankAccountStatus(accountId: string): Promise<{
    verified: boolean;
    verification_status: string;
    last_four?: string;
    routing_number?: string;
  }> {
    if (!stripe) {
      throw new Error('Stripe is not configured');
    }

    try {
      const account = await stripe.accounts.retrieve(accountId, {
        expand: ['external_accounts'],
      });

      const externalAccounts = account.external_accounts?.data || [];
      const bankAccount = externalAccounts.find(
        (acc) => acc.object === 'bank_account',
      );

      if (!bankAccount || bankAccount.object !== 'bank_account') {
        return {
          verified: false,
          verification_status: 'no_account',
        };
      }

      return {
        verified: bankAccount.status === 'verified',
        verification_status: bankAccount.status,
        last_four: bankAccount.last4,
        routing_number: bankAccount.routing_number,
      };
    } catch (error) {
      console.error('Failed to get bank account status:', error);
      return {
        verified: false,
        verification_status: 'error',
      };
    }
  }
}

// Export singleton instance
export const stripeConnectService = new StripeConnectService();
