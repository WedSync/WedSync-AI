// Feature Gate Enforcement for Tier-Based Access Control
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  canUsePdfImport,
  canUseJourneyAutomation,
  canUseApiAccess,
  canCreateForm,
  mapLegacyTier,
  getUpgradePath,
  type SubscriptionTier,
} from './stripe-config';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export interface TierCheckResult {
  allowed: boolean;
  tier: SubscriptionTier;
  message?: string;
  upgradeUrl?: string;
  suggestedTier?: SubscriptionTier;
}

/**
 * Get user's current subscription tier from database
 */
export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  try {
    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .single();

    if (!userProfile?.organization_id) {
      return 'FREE';
    }

    // Get organization's subscription tier
    const { data: organization } = await supabase
      .from('organizations')
      .select('pricing_tier, subscription_status')
      .eq('id', userProfile.organization_id)
      .single();

    if (!organization || organization.subscription_status !== 'active') {
      return 'FREE';
    }

    // Map database tier to our tier system
    return mapLegacyTier(organization.pricing_tier || 'FREE');
  } catch (error) {
    console.error('Error getting user tier:', error);
    return 'FREE';
  }
}

/**
 * Check if user can access PDF import feature
 */
export async function checkPdfImportAccess(
  userId: string,
): Promise<TierCheckResult> {
  const tier = await getUserTier(userId);

  if (!canUsePdfImport(tier)) {
    const upgradePath = getUpgradePath(tier, 'pdfImport');

    return {
      allowed: false,
      tier,
      message: 'PDF import requires a Pro or Business subscription',
      upgradeUrl: '/pricing',
      suggestedTier: upgradePath?.suggestedTier,
    };
  }

  return { allowed: true, tier };
}

/**
 * Check if user can access journey automation
 */
export async function checkJourneyAutomationAccess(
  userId: string,
): Promise<TierCheckResult> {
  const tier = await getUserTier(userId);

  if (!canUseJourneyAutomation(tier)) {
    const upgradePath = getUpgradePath(tier, 'journeyAutomation');

    return {
      allowed: false,
      tier,
      message: 'Journey automation requires a Business subscription',
      upgradeUrl: '/pricing',
      suggestedTier: upgradePath?.suggestedTier,
    };
  }

  return { allowed: true, tier };
}

/**
 * Check if user can access API
 */
export async function checkApiAccess(userId: string): Promise<TierCheckResult> {
  const tier = await getUserTier(userId);

  if (!canUseApiAccess(tier)) {
    const upgradePath = getUpgradePath(tier, 'apiAccess');

    return {
      allowed: false,
      tier,
      message: 'API access requires a Business subscription',
      upgradeUrl: '/pricing',
      suggestedTier: upgradePath?.suggestedTier,
    };
  }

  return { allowed: true, tier };
}

/**
 * Check if user can create another form
 */
export async function checkFormCreationAccess(
  userId: string,
): Promise<TierCheckResult> {
  const tier = await getUserTier(userId);

  try {
    // Get user's organization
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .single();

    if (!userProfile?.organization_id) {
      return { allowed: true, tier }; // Allow if no org (shouldn't happen)
    }

    // Count existing forms
    const { count } = await supabase
      .from('forms')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', userProfile.organization_id)
      .eq('is_archived', false);

    const formCount = count || 0;

    if (!canCreateForm(tier, formCount)) {
      const upgradePath = getUpgradePath(tier, 'moreForms');

      return {
        allowed: false,
        tier,
        message:
          tier === 'FREE'
            ? 'Free tier is limited to 1 form. Upgrade to Pro for 5 forms.'
            : "You've reached your form limit. Upgrade to Business for unlimited forms.",
        upgradeUrl: '/pricing',
        suggestedTier: upgradePath?.suggestedTier,
      };
    }

    return { allowed: true, tier };
  } catch (error) {
    console.error('Error checking form creation access:', error);
    return { allowed: true, tier }; // Allow on error to not block users
  }
}

/**
 * Middleware to enforce tier limits on API routes
 */
export async function enforceTierLimits(
  request: NextRequest,
  feature: 'pdfImport' | 'journeyAutomation' | 'apiAccess' | 'formCreation',
): Promise<NextResponse | null> {
  try {
    // Get auth token from request
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 },
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 },
      );
    }

    // Check feature access based on type
    let accessCheck: TierCheckResult;

    switch (feature) {
      case 'pdfImport':
        accessCheck = await checkPdfImportAccess(user.id);
        break;
      case 'journeyAutomation':
        accessCheck = await checkJourneyAutomationAccess(user.id);
        break;
      case 'apiAccess':
        accessCheck = await checkApiAccess(user.id);
        break;
      case 'formCreation':
        accessCheck = await checkFormCreationAccess(user.id);
        break;
    }

    if (!accessCheck.allowed) {
      return NextResponse.json(
        {
          error: accessCheck.message,
          upgradeUrl: accessCheck.upgradeUrl,
          suggestedTier: accessCheck.suggestedTier,
          currentTier: accessCheck.tier,
        },
        { status: 403 },
      );
    }

    // Access allowed, return null to continue
    return null;
  } catch (error) {
    console.error('Error enforcing tier limits:', error);
    // On error, allow access to not break the app
    return null;
  }
}

/**
 * React hook to check feature access (for client components)
 */
export function useFeatureAccess() {
  // This would be implemented as a React hook
  // For now, it's a placeholder
  return {
    checkPdfImport: async () => {
      const response = await fetch('/api/features/check?feature=pdfImport');
      return response.ok;
    },
    checkJourneyAutomation: async () => {
      const response = await fetch(
        '/api/features/check?feature=journeyAutomation',
      );
      return response.ok;
    },
    checkApiAccess: async () => {
      const response = await fetch('/api/features/check?feature=apiAccess');
      return response.ok;
    },
    checkFormCreation: async () => {
      const response = await fetch('/api/features/check?feature=formCreation');
      return response.ok;
    },
  };
}
