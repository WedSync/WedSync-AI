import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { withRateLimit } from '@/lib/api-middleware';
import { stripeConnectService } from '@/lib/services/stripeConnectService';
import { kycVerificationService } from '@/lib/services/kycVerificationService';
import { secureDocumentService } from '@/lib/services/secureDocumentService';

// Complete Onboarding Step
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;
  return withRateLimit(
    request,
    { limit: 10, type: 'step_completion' },
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
        const { step_name, step_data } = body;

        if (!step_name || !step_data) {
          return NextResponse.json(
            { error: 'Step name and step data are required' },
            { status: 400 },
          );
        }

        // Verify application ownership
        await verifyApplicationOwnership(applicationId, user.id);

        // Validate step data
        const validationErrors = await validateStepData(step_name, step_data);
        if (validationErrors.length > 0) {
          return NextResponse.json({
            success: false,
            validation_errors: validationErrors,
          });
        }

        // Process step completion
        const result = await completeOnboardingStep(
          applicationId,
          step_name,
          step_data,
        );

        if (!result.success) {
          return NextResponse.json({
            success: false,
            validation_errors: result.validation_errors || [
              'Failed to complete step',
            ],
          });
        }

        return NextResponse.json({
          success: true,
          step_completed: true,
          next_step: result.next_step,
          application_status: result.application_status,
        });
      } catch (error) {
        console.error('Step completion failed:', error);
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Failed to complete step',
          },
          { status: 500 },
        );
      }
    },
  );
}

// Get Application Status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const { applicationId } = await params;
  return withRateLimit(
    request,
    { limit: 20, type: 'application_status' },
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

        // Verify application ownership
        await verifyApplicationOwnership(applicationId, user.id);

        // Get application with progress
        const application = await getApplicationWithProgress(applicationId);
        const currentStep = getCurrentStep(application.onboarding_progress);
        const availableActions = getAvailableActions(application, currentStep);

        return NextResponse.json({
          success: true,
          application,
          current_step: currentStep,
          available_actions: availableActions,
        });
      } catch (error) {
        console.error('Failed to get application status:', error);
        return NextResponse.json(
          {
            error:
              error instanceof Error
                ? error.message
                : 'Failed to get application status',
          },
          { status: 500 },
        );
      }
    },
  );
}

// Helper Functions

async function verifyApplicationOwnership(
  applicationId: string,
  userId: string,
): Promise<void> {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: application, error } = await supabase
    .from('marketplace_creator_applications')
    .select('supplier_id, suppliers(user_id)')
    .eq('id', applicationId)
    .single();

  if (error || !application) {
    throw new Error('Application not found');
  }

  if (application.suppliers?.user_id !== userId) {
    throw new Error('Unauthorized: You do not own this application');
  }
}

async function validateStepData(
  stepName: string,
  stepData: any,
): Promise<string[]> {
  const errors: string[] = [];

  switch (stepName) {
    case 'verification':
      errors.push(...validateVerificationStep(stepData));
      break;
    case 'financial':
      errors.push(...validateFinancialStep(stepData));
      break;
    case 'kyc_verification':
      errors.push(...validateKYCStep(stepData));
      break;
    case 'content':
      errors.push(...validateContentStep(stepData));
      break;
    default:
      break;
  }

  return errors;
}

function validateVerificationStep(stepData: any): string[] {
  const errors: string[] = [];
  const required = ['creator_display_name', 'creator_bio', 'primary_expertise'];

  for (const field of required) {
    if (!stepData.verification_data?.[field]) {
      errors.push(`${field} is required`);
    }
  }

  if (stepData.verification_data?.primary_expertise?.length === 0) {
    errors.push('At least one area of expertise is required');
  }

  if (stepData.verification_data?.creator_display_name?.length > 50) {
    errors.push('Creator display name must be 50 characters or less');
  }

  if (stepData.verification_data?.creator_bio?.length > 500) {
    errors.push('Creator bio must be 500 characters or less');
  }

  return errors;
}

function validateFinancialStep(stepData: any): string[] {
  const errors: string[] = [];

  if (!stepData.stripe_account_id) {
    errors.push('Stripe account setup is required');
  }

  if (!stepData.tax_form_completed) {
    errors.push('Tax form completion is required');
  }

  return errors;
}

function validateKYCStep(stepData: any): string[] {
  const errors: string[] = [];

  if (!stepData.identity_verification_completed) {
    errors.push('Identity verification is required');
  }

  return errors;
}

function validateContentStep(stepData: any): string[] {
  const errors: string[] = [];

  if (!stepData.template_data?.title) {
    errors.push('Template title is required');
  }

  if (!stepData.template_data?.description) {
    errors.push('Template description is required');
  }

  if (!stepData.template_data?.category) {
    errors.push('Template category is required');
  }

  return errors;
}

async function completeOnboardingStep(
  applicationId: string,
  stepName: string,
  stepData: any,
): Promise<{
  success: boolean;
  nextStep?: any;
  validationErrors?: string[];
  applicationStatus?: string;
}> {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // Update step progress
    await supabase.from('marketplace_onboarding_progress').upsert(
      {
        creator_application_id: applicationId,
        step_name: stepName,
        status: 'completed',
        completed_at: new Date().toISOString(),
        step_data: stepData,
      },
      {
        onConflict: 'creator_application_id,step_name',
      },
    );

    // Process step-specific logic
    await processStepCompletion(applicationId, stepName, stepData);

    // Get next step
    const nextStep = await getNextOnboardingStep(applicationId);

    // Update application stage if needed
    let applicationStatus = 'draft';
    if (!nextStep) {
      applicationStatus = 'submitted';
      await finalizeApplication(applicationId);
    } else {
      // Update application stage based on current progress
      const stage = getApplicationStageFromStep(nextStep.step_name);
      await supabase
        .from('marketplace_creator_applications')
        .update({
          application_stage: stage,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', applicationId);
    }

    return {
      success: true,
      nextStep: nextStep || undefined,
      applicationStatus,
    };
  } catch (error) {
    console.error('Failed to complete onboarding step:', error);
    return {
      success: false,
      validationErrors: ['An error occurred while processing your request'],
    };
  }
}

async function processStepCompletion(
  applicationId: string,
  stepName: string,
  stepData: any,
): Promise<void> {
  switch (stepName) {
    case 'verification':
      await processVerificationStep(applicationId, stepData);
      break;
    case 'financial':
      await processFinancialStep(applicationId, stepData);
      break;
    case 'kyc_verification':
      await processKYCStep(applicationId, stepData);
      break;
    case 'content':
      await processContentStep(applicationId, stepData);
      break;
  }
}

async function processVerificationStep(
  applicationId: string,
  stepData: any,
): Promise<void> {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get application details
  const { data: application } = await supabase
    .from('marketplace_creator_applications')
    .select('supplier_id')
    .eq('id', applicationId)
    .single();

  if (application) {
    // Create or update creator profile
    await supabase.from('marketplace_creator_profiles').upsert(
      {
        supplier_id: application.supplier_id,
        creator_display_name: stepData.verification_data.creator_display_name,
        creator_bio: stepData.verification_data.creator_bio,
        creator_tagline: stepData.verification_data.creator_tagline || '',
        primary_expertise: stepData.verification_data.primary_expertise,
        years_experience: stepData.verification_data.years_experience || 0,
        business_name: stepData.verification_data.business_name || '',
        website_url: stepData.verification_data.website_url || '',
        creator_status: 'active',
      },
      {
        onConflict: 'supplier_id',
      },
    );
  }
}

async function processFinancialStep(
  applicationId: string,
  stepData: any,
): Promise<void> {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Update application with financial data
  await supabase
    .from('marketplace_creator_applications')
    .update({
      stripe_connect_account_id: stepData.stripe_account_id,
      stripe_onboarding_complete: stepData.onboarding_complete || false,
      tax_information_complete: stepData.tax_form_completed || false,
      payout_preferences: stepData.payout_preferences || {},
    })
    .eq('id', applicationId);
}

async function processKYCStep(
  applicationId: string,
  stepData: any,
): Promise<void> {
  // KYC verification is handled by the KYC service
  // This step completion just confirms the verification is done
  console.log('KYC step completed for application:', applicationId);
}

async function processContentStep(
  applicationId: string,
  stepData: any,
): Promise<void> {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Store template submission data
  await supabase.from('marketplace_template_submissions').insert({
    creator_application_id: applicationId,
    template_title: stepData.template_data.title,
    template_description: stepData.template_data.description,
    template_category: stepData.template_data.category,
    template_data: stepData.template_data,
    submission_status: 'pending_review',
    submitted_at: new Date().toISOString(),
  });
}

async function getNextOnboardingStep(applicationId: string): Promise<any> {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Get all onboarding steps
  const { data: steps, error } = await supabase
    .from('marketplace_onboarding_progress')
    .select('*')
    .eq('creator_application_id', applicationId)
    .order('created_at');

  if (error || !steps) {
    return null;
  }

  // Find the next pending step
  const nextStep = steps.find((step) => step.status === 'pending');

  if (nextStep) {
    return {
      step_name: nextStep.step_name,
      display_name: nextStep.step_data?.display_name || nextStep.step_name,
      description: nextStep.step_data?.description || '',
      status: nextStep.status,
      required: nextStep.step_data?.required || true,
      estimated_time_minutes: nextStep.step_data?.estimated_time_minutes || 10,
    };
  }

  return null;
}

async function finalizeApplication(applicationId: string): Promise<void> {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Update application status to submitted
  await supabase
    .from('marketplace_creator_applications')
    .update({
      status: 'submitted',
      application_stage: 'review',
      submitted_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  // Trigger quality assessment
  await triggerQualityAssessment(applicationId);
}

async function triggerQualityAssessment(applicationId: string): Promise<void> {
  // This would integrate with the quality assessment service
  // For now, we'll just log that assessment should begin
  console.log('Quality assessment triggered for application:', applicationId);
}

function getApplicationStageFromStep(stepName: string): string {
  const stageMapping = {
    eligibility: 'eligibility',
    verification: 'verification',
    financial: 'financial',
    kyc_verification: 'verification',
    content: 'content',
    review: 'review',
  };

  return stageMapping[stepName as keyof typeof stageMapping] || 'verification';
}

async function getApplicationWithProgress(applicationId: string): Promise<any> {
  const { supabase } = await createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: application, error } = await supabase
    .from('marketplace_creator_applications')
    .select(
      `
      *,
      marketplace_onboarding_progress (
        step_name,
        status,
        completed_at,
        step_data,
        validation_errors
      )
    `,
    )
    .eq('id', applicationId)
    .single();

  if (error || !application) {
    throw new Error('Application not found');
  }

  return {
    id: application.id,
    supplier_id: application.supplier_id,
    status: application.status,
    application_stage: application.application_stage,
    eligibility_results: {
      checks: application.eligibility_checks,
      score: application.eligibility_score,
      passed: application.eligibility_passed,
    },
    onboarding_progress: application.marketplace_onboarding_progress,
    submitted_at: application.submitted_at,
    approved_at: application.approved_at,
    reviewer_feedback: application.reviewer_notes,
  };
}

function getCurrentStep(progress: any[]): any {
  // Find the first non-completed step
  const currentStep = progress.find((step) => step.status !== 'completed');

  if (currentStep) {
    return {
      step_name: currentStep.step_name,
      display_name:
        currentStep.step_data?.display_name || currentStep.step_name,
      description: currentStep.step_data?.description || '',
      status: currentStep.status,
      required: currentStep.step_data?.required || true,
      estimated_time_minutes:
        currentStep.step_data?.estimated_time_minutes || 10,
      validation_errors: currentStep.validation_errors || [],
    };
  }

  return null;
}

function getAvailableActions(application: any, currentStep: any): string[] {
  const actions = [];

  if (currentStep) {
    if (currentStep.status === 'pending') {
      actions.push('complete_step');
    }
    if (currentStep.status === 'failed') {
      actions.push('retry_step');
    }
  }

  if (application.status === 'submitted') {
    actions.push('view_status');
  }

  if (application.status === 'approved') {
    actions.push('access_dashboard');
  }

  return actions;
}
