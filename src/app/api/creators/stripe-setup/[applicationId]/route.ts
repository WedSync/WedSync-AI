import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { withRateLimit } from '@/lib/api-middleware';
import { stripeConnectService } from '@/lib/services/stripeConnectService';

// Create Stripe Connect Account and Onboarding Link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  return withRateLimit(
    request,
    { limit: 5, type: 'stripe_setup' },
    async () => {
      try {
        const { supabase } = await createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Authentication check
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const applicationId = applicationId;

        // Verify application ownership and get details
        const { data: application, error } = await supabase
          .from('marketplace_creator_applications')
          .select(
            `
            supplier_id,
            status,
            stripe_connect_account_id,
            suppliers (
              user_id,
              email,
              business_name,
              business_country,
              phone
            )
          `,
          )
          .eq('id', applicationId)
          .single();

        if (error || !application) {
          return NextResponse.json(
            { error: 'Application not found' },
            { status: 404 },
          );
        }

        if (application.suppliers?.user_id !== user.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // Check if Stripe account already exists
        if (application.stripe_connect_account_id) {
          // Generate new account link for existing account
          const onboardingUrl = await stripeConnectService.generateAccountLink(
            application.stripe_connect_account_id,
            applicationId,
          );

          // Check current account status
          const accountStatus = await stripeConnectService.getAccountStatus(
            application.stripe_connect_account_id,
          );

          return NextResponse.json({
            success: true,
            account_id: application.stripe_connect_account_id,
            onboarding_url: onboardingUrl,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/creator/onboarding/complete?application=${applicationId}`,
            setup_expires_at: new Date(
              Date.now() + 24 * 60 * 60 * 1000,
            ).toISOString(), // 24 hours
            account_status: accountStatus,
          });
        }

        // Create new Stripe Connect account
        const stripeAccountData =
          await stripeConnectService.createExpressAccount(
            application.supplier_id,
            applicationId,
          );

        return NextResponse.json({
          success: true,
          account_id: stripeAccountData.id,
          onboarding_url: stripeAccountData.onboarding_url,
          return_url: stripeAccountData.return_url,
          setup_expires_at: stripeAccountData.setup_expires_at,
          account_status: {
            details_submitted: stripeAccountData.details_submitted,
            charges_enabled: stripeAccountData.charges_enabled,
            payouts_enabled: stripeAccountData.payouts_enabled,
            capabilities: stripeAccountData.capabilities,
          },
        });
      } catch (error) {
        console.error('Stripe setup failed:', error);
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Failed to set up payment account',
          },
          { status: 500 },
        );
      }
    },
  );
}

// Get Stripe Account Status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  return withRateLimit(
    request,
    { limit: 20, type: 'stripe_status' },
    async () => {
      try {
        const { supabase } = await createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );

        // Authentication check
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const applicationId = applicationId;

        // Get application details
        const { data: application, error } = await supabase
          .from('marketplace_creator_applications')
          .select(
            `
            supplier_id,
            stripe_connect_account_id,
            suppliers (user_id)
          `,
          )
          .eq('id', applicationId)
          .single();

        if (error || !application) {
          return NextResponse.json(
            { error: 'Application not found' },
            { status: 404 },
          );
        }

        if (application.suppliers?.user_id !== user.id) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        if (!application.stripe_connect_account_id) {
          return NextResponse.json({
            success: true,
            account_exists: false,
            setup_required: true,
          });
        }

        // Get current account status from Stripe
        const accountStatus = await stripeConnectService.getAccountStatus(
          application.stripe_connect_account_id,
        );

        // Check account capabilities
        const capabilitiesVerified =
          await stripeConnectService.verifyAccountCapabilities(
            application.stripe_connect_account_id,
          );

        // Get tax form requirements
        const taxRequirements =
          await stripeConnectService.getTaxFormRequirements(
            application.stripe_connect_account_id,
          );

        // Get bank account status
        const bankAccountStatus =
          await stripeConnectService.getBankAccountStatus(
            application.stripe_connect_account_id,
          );

        return NextResponse.json({
          success: true,
          account_exists: true,
          account_id: application.stripe_connect_account_id,
          account_status: accountStatus,
          capabilities_verified: capabilitiesVerified,
          tax_requirements: taxRequirements,
          bank_account_status: bankAccountStatus,
          setup_complete:
            accountStatus.details_submitted &&
            accountStatus.charges_enabled &&
            accountStatus.payouts_enabled &&
            capabilitiesVerified,
        });
      } catch (error) {
        console.error('Failed to get Stripe account status:', error);
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Failed to get account status',
          },
          { status: 500 },
        );
      }
    },
  );
}
