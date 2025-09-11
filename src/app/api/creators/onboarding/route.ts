import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { withRateLimit } from '@/lib/api-middleware';
import { generateSecureToken } from '@/lib/crypto-utils';
import { stripeConnectService } from '@/lib/services/stripeConnectService';
import { kycVerificationService } from '@/lib/services/kycVerificationService';
import { secureDocumentService } from '@/lib/services/secureDocumentService';

// Creator Eligibility Check
export async function GET(request: NextRequest) {
  return withRateLimit(
    request,
    { limit: 10, type: 'creator_onboarding' },
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

        // Get supplier ID from URL params
        const url = new URL(request.url);
        const supplierId = url.searchParams.get('supplierId');

        if (!supplierId) {
          return NextResponse.json(
            { error: 'Supplier ID required' },
            { status: 400 },
          );
        }

        // Check eligibility
        const eligibilityResult = await checkCreatorEligibility(supplierId);

        return NextResponse.json({
          success: true,
          eligibility: eligibilityResult,
          can_apply: eligibilityResult.overall_eligible,
          requirements_info: await getRequirementsInfo(eligibilityResult),
        });
      } catch (error) {
        console.error('Creator eligibility check failed:', error);
        return NextResponse.json(
          { error: 'Failed to check eligibility' },
          { status: 500 },
        );
      }
    },
  );
}

// Create Creator Application
export async function POST(request: NextRequest) {
  return withRateLimit(
    request,
    { limit: 5, type: 'creator_application' },
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

        // Parse request body
        const body = await request.json();
        const { supplier_id, application_data } = body;

        if (!supplier_id || !application_data) {
          return NextResponse.json(
            { error: 'Supplier ID and application data are required' },
            { status: 400 },
          );
        }

        // Verify user owns this supplier account
        await verifySupplierOwnership(supplier_id, user.id);

        // Check if application already exists
        const existingApplication = await getExistingApplication(supplier_id);
        if (existingApplication && existingApplication.status !== 'rejected') {
          return NextResponse.json({
            success: true,
            application_id: existingApplication.id,
            application: existingApplication,
            message: 'Application already exists',
          });
        }

        // Create new application
        const application = await createCreatorApplication(
          supplier_id,
          application_data,
        );
        const onboardingSteps = await initializeOnboardingSteps(application.id);

        return NextResponse.json({
          success: true,
          application_id: application.id,
          application,
          next_steps: onboardingSteps,
        });
      } catch (error) {
        console.error('Creator application creation failed:', error);
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Failed to create application',
          },
          { status: 500 },
        );
      }
    },
  );
}

// Helper Functions

async function checkCreatorEligibility(supplierId: string) {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get supplier information with metrics
  const { data: supplier, error } = await supabase
    .from('suppliers')
    .select(
      `
      id,
      subscription_tier,
      created_at,
      email,
      business_name,
      total_clients,
      completed_journeys,
      average_rating,
      response_time_hours,
      form_completion_rate
    `,
    )
    .eq('id', supplierId)
    .single();

  if (error || !supplier) {
    throw new Error('Supplier not found');
  }

  // Define eligibility requirements
  const requirements = {
    subscription_tier: ['professional', 'scale', 'enterprise'],
    minimum_account_age_days: 30,
    minimum_client_count: 50,
    minimum_journey_completions: 10,
    minimum_satisfaction_score: 4.0,
  };

  // Calculate account age
  const accountAgeDays = Math.floor(
    (Date.now() - new Date(supplier.created_at).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  // Build eligibility checks
  const checks = {
    subscription_tier: {
      required: requirements.subscription_tier,
      current: supplier.subscription_tier,
      passed: requirements.subscription_tier.includes(
        supplier.subscription_tier,
      ),
    },
    account_age: {
      required_days: requirements.minimum_account_age_days,
      current_days: accountAgeDays,
      passed: accountAgeDays >= requirements.minimum_account_age_days,
    },
    client_count: {
      required_minimum: requirements.minimum_client_count,
      current_count: supplier.total_clients || 0,
      passed:
        (supplier.total_clients || 0) >= requirements.minimum_client_count,
    },
    journey_completions: {
      required_minimum: requirements.minimum_journey_completions,
      current_count: supplier.completed_journeys || 0,
      passed:
        (supplier.completed_journeys || 0) >=
        requirements.minimum_journey_completions,
    },
    satisfaction_score: {
      required_minimum: requirements.minimum_satisfaction_score,
      current_score: supplier.average_rating || 0,
      passed:
        (supplier.average_rating || 0) >=
        requirements.minimum_satisfaction_score,
    },
  };

  // Calculate overall eligibility
  const passedChecks = Object.values(checks).filter(
    (check) => check.passed,
  ).length;
  const totalChecks = Object.values(checks).length;
  const eligibilityScore = (passedChecks / totalChecks) * 100;
  const overallEligible = passedChecks === totalChecks;

  // Identify missing requirements
  const missingRequirements = Object.entries(checks)
    .filter(([_, check]) => !check.passed)
    .map(([key, _]) => key);

  return {
    supplier_id: supplierId,
    checks,
    overall_eligible: overallEligible,
    eligibility_score,
    missing_requirements: missingRequirements,
  };
}

async function getRequirementsInfo(eligibilityResult: any) {
  const requirementsInfo = [];

  for (const [key, check] of Object.entries(eligibilityResult.checks)) {
    const requirement: any = {
      requirement: key
        .replace('_', ' ')
        .replace(/\b\w/g, (l: string) => l.toUpperCase()),
      description: getRequirementDescription(key),
      current_status: check.passed ? 'Met' : 'Not Met',
    };

    if (!check.passed) {
      requirement.action_needed = getActionNeeded(key, check);
    }

    requirementsInfo.push(requirement);
  }

  return requirementsInfo;
}

function getRequirementDescription(requirement: string): string {
  const descriptions = {
    subscription_tier:
      'Must have Professional, Scale, or Enterprise subscription',
    account_age: 'Account must be active for at least 30 days',
    client_count: 'Must have at least 50 active clients',
    journey_completions: 'Must have completed at least 10 client journeys',
    satisfaction_score:
      'Must maintain a client satisfaction rating of 4.0 or higher',
  };

  return (
    descriptions[requirement as keyof typeof descriptions] ||
    'Unknown requirement'
  );
}

function getActionNeeded(requirement: string, check: any): string {
  const actions = {
    subscription_tier: `Upgrade to Professional tier or higher. Current: ${check.current}`,
    account_age: `Wait ${check.required_days - check.current_days} more days`,
    client_count: `Add ${check.required_minimum - check.current_count} more clients`,
    journey_completions: `Complete ${check.required_minimum - check.current_count} more journeys`,
    satisfaction_score: `Improve satisfaction rating to ${check.required_minimum}. Current: ${check.current_score}`,
  };

  return (
    actions[requirement as keyof typeof actions] ||
    'Contact support for guidance'
  );
}

async function verifySupplierOwnership(
  supplierId: string,
  userId: string,
): Promise<void> {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: supplier, error } = await supabase
    .from('suppliers')
    .select('user_id')
    .eq('id', supplierId)
    .single();

  if (error || !supplier || supplier.user_id !== userId) {
    throw new Error('Unauthorized: You do not own this supplier account');
  }
}

async function getExistingApplication(supplierId: string) {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: application } = await supabase
    .from('marketplace_creator_applications')
    .select('*')
    .eq('supplier_id', supplierId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  return application;
}

async function createCreatorApplication(
  supplierId: string,
  applicationData: any,
) {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // First check eligibility again
  const eligibilityResult = await checkCreatorEligibility(supplierId);
  if (!eligibilityResult.overall_eligible) {
    throw new Error('Supplier does not meet eligibility requirements');
  }

  // Create application record
  const { data: application, error } = await supabase
    .from('marketplace_creator_applications')
    .insert({
      supplier_id: supplierId,
      status: 'draft',
      application_stage: 'verification',
      eligibility_checks: eligibilityResult.checks,
      eligibility_score: eligibilityResult.eligibility_score,
      eligibility_passed: true,
      application_data: applicationData,
      last_activity_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create application: ${error.message}`);
  }

  return application;
}

async function initializeOnboardingSteps(applicationId: string) {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const onboardingSteps = [
    {
      step_name: 'eligibility',
      display_name: 'Eligibility Check',
      description: 'Verify you meet creator requirements',
      status: 'completed',
      required: true,
      estimated_time_minutes: 2,
    },
    {
      step_name: 'verification',
      display_name: 'Profile & Verification',
      description: 'Complete your creator profile and business information',
      status: 'pending',
      required: true,
      estimated_time_minutes: 10,
    },
    {
      step_name: 'financial',
      display_name: 'Payment Setup',
      description: 'Set up Stripe Connect for payments and complete tax forms',
      status: 'pending',
      required: true,
      estimated_time_minutes: 15,
    },
    {
      step_name: 'kyc_verification',
      display_name: 'Identity Verification',
      description: 'Complete identity verification and document upload',
      status: 'pending',
      required: true,
      estimated_time_minutes: 10,
    },
    {
      step_name: 'content',
      display_name: 'First Template',
      description: 'Submit your first template for review',
      status: 'pending',
      required: true,
      estimated_time_minutes: 20,
    },
    {
      step_name: 'review',
      display_name: 'Review & Submit',
      description: 'Final review and application submission',
      status: 'pending',
      required: true,
      estimated_time_minutes: 5,
    },
  ];

  // Insert initial onboarding progress
  const progressRecords = onboardingSteps.map((step) => ({
    creator_application_id: applicationId,
    step_name: step.step_name,
    status: step.status,
    step_data: {
      display_name: step.display_name,
      description: step.description,
      required: step.required,
      estimated_time_minutes: step.estimated_time_minutes,
    },
    completed_at: step.status === 'completed' ? new Date().toISOString() : null,
  }));

  await supabase
    .from('marketplace_onboarding_progress')
    .insert(progressRecords);

  return onboardingSteps;
}
