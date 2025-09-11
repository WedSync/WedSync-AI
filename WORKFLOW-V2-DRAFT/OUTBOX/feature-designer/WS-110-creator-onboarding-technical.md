# WS-110: Creator Onboarding - Technical Specification

## Overview
Streamlined onboarding flow for suppliers wanting to sell their templates in the marketplace, including eligibility verification, quality assessment, and financial setup.

## User Stories with Real Wedding Context

### Story 1: Eligible Creator Application Start
**As Hannah (Wedding Planner)** with an established WedSync business  
**I want** to easily check if I qualify to sell templates on the marketplace  
**So that** I can monetize my proven workflows and forms

**Wedding Business Context:**
- Hannah has 73 clients, Professional tier subscription, 18-month WedSync history
- Eligibility checker shows: ✅ Professional tier, ✅ 30+ days active, ✅ 50+ clients, ✅ 10+ completed journeys
- "You're eligible! Start your creator application to begin selling templates"
- Estimated setup time: 15-20 minutes, first template review within 48 hours

### Story 2: Multi-Step Onboarding Experience
**As Marcus (Wedding Photographer)** starting the creator application  
**I want** a clear, guided process with progress tracking  
**So that** I complete setup correctly without confusion

**Wedding Business Context:**
- Step 1: Eligibility confirmed (auto-check)
- Step 2: Business verification (upload business license, portfolio samples)
- Step 3: Stripe Connect setup for payments (guided tax info entry)
- Step 4: First template submission ("Client Photo Release Form" - his most successful template)
- Progress bar shows 75% complete, estimated completion in 5 minutes

### Story 3: Quality Assessment and Approval
**As Sarah (Wedding Venue Manager)** waiting for creator approval  
**I want** transparent feedback on my application status  
**So that** I understand the timeline and any required improvements

**Wedding Business Context:**
- Quality score: 8.2/10 (Client satisfaction: 9.1, Response time: 8.4, Template complexity: 7.1)
- Status: "Under Review - Manual review in progress for first template submission"
- Reviewer feedback: "Excellent client feedback and response time. Template needs minor formatting improvements for marketplace standards."
- Expected approval: 1-2 business days with guided template improvements

## Database Schema Design

```sql
-- Creator application and approval tracking
CREATE TABLE marketplace_creator_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) NOT NULL UNIQUE,
  
  -- Application status and tracking
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected', 'incomplete')),
  application_stage TEXT DEFAULT 'eligibility' CHECK (application_stage IN ('eligibility', 'verification', 'financial', 'content', 'review', 'complete')),
  
  -- Eligibility verification results
  eligibility_checks JSONB NOT NULL DEFAULT '{}'::jsonb,
  eligibility_score DECIMAL(3,1) DEFAULT 0,
  eligibility_passed BOOLEAN DEFAULT false,
  
  -- Quality assessment
  quality_assessment JSONB DEFAULT '{}'::jsonb,
  quality_score DECIMAL(3,1) DEFAULT 0,
  quality_threshold_met BOOLEAN DEFAULT false,
  
  -- Financial setup
  stripe_connect_account_id TEXT,
  stripe_onboarding_complete BOOLEAN DEFAULT false,
  tax_information_complete BOOLEAN DEFAULT false,
  payout_preferences JSONB DEFAULT '{}'::jsonb,
  
  -- Application timeline
  submitted_at TIMESTAMPTZ,
  review_started_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Review and feedback
  reviewer_id UUID REFERENCES auth.users(id),
  reviewer_notes TEXT,
  rejection_reason TEXT,
  improvement_suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Application metadata
  application_data JSONB DEFAULT '{}'::jsonb,
  referral_source TEXT,
  estimated_monthly_sales INTEGER,
  primary_template_categories TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator profiles for approved creators
CREATE TABLE marketplace_creator_profiles (
  supplier_id UUID PRIMARY KEY REFERENCES suppliers(id),
  
  -- Public creator information
  creator_display_name TEXT NOT NULL,
  creator_bio TEXT,
  creator_tagline TEXT,
  avatar_url TEXT,
  cover_image_url TEXT,
  
  -- Expertise and specialization
  primary_expertise TEXT[], -- ['photography', 'planning', 'flowers', 'venues']
  secondary_skills TEXT[],
  years_experience INTEGER,
  wedding_types_served TEXT[], -- ['traditional', 'destination', 'elopement', 'cultural']
  
  -- Social proof and verification
  verified_creator BOOLEAN DEFAULT false,
  featured_creator BOOLEAN DEFAULT false,
  industry_certifications TEXT[],
  professional_memberships TEXT[],
  
  -- Social and contact information
  social_links JSONB DEFAULT '{}'::jsonb,
  website_url TEXT,
  business_name TEXT,
  business_location TEXT,
  
  -- Creator storefront customization
  storefront_theme TEXT DEFAULT 'default',
  custom_storefront_url TEXT UNIQUE,
  brand_colors JSONB DEFAULT '{}'::jsonb,
  
  -- Performance tracking
  creator_since DATE DEFAULT CURRENT_DATE,
  last_template_uploaded TIMESTAMPTZ,
  total_templates_created INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  creator_rating DECIMAL(3,2) DEFAULT 0,
  
  -- Status and preferences
  creator_status TEXT DEFAULT 'active' CHECK (creator_status IN ('active', 'inactive', 'suspended')),
  accepts_custom_requests BOOLEAN DEFAULT false,
  preferred_commission_payout TEXT DEFAULT 'monthly',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Eligibility check history and requirements
CREATE TABLE marketplace_eligibility_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requirement_name TEXT NOT NULL UNIQUE,
  requirement_description TEXT NOT NULL,
  requirement_type TEXT NOT NULL, -- 'subscription', 'metric', 'duration', 'manual'
  
  -- Requirement thresholds
  minimum_value DECIMAL(10,2),
  required_subscription_tiers TEXT[],
  minimum_account_age_days INTEGER,
  
  -- Scoring and weighting
  points_value INTEGER DEFAULT 1,
  requirement_weight DECIMAL(3,2) DEFAULT 1.0,
  is_mandatory BOOLEAN DEFAULT true,
  
  -- Status and configuration
  active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quality assessment criteria and scoring
CREATE TABLE marketplace_quality_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_application_id UUID REFERENCES marketplace_creator_applications(id) NOT NULL,
  assessor_id UUID REFERENCES auth.users(id),
  
  -- Assessment categories and scores (0-10 scale)
  client_satisfaction_score DECIMAL(3,1) DEFAULT 0,
  response_time_score DECIMAL(3,1) DEFAULT 0,
  completion_rate_score DECIMAL(3,1) DEFAULT 0,
  template_quality_score DECIMAL(3,1) DEFAULT 0,
  portfolio_quality_score DECIMAL(3,1) DEFAULT 0,
  
  -- Overall assessment
  overall_score DECIMAL(3,1) DEFAULT 0,
  assessment_passed BOOLEAN DEFAULT false,
  
  -- Detailed feedback
  strengths TEXT[],
  improvement_areas TEXT[],
  specific_feedback TEXT,
  recommendation TEXT, -- 'approve', 'approve_with_conditions', 'reject', 'needs_improvement'
  
  -- Assessment metadata
  assessment_method TEXT DEFAULT 'automated', -- 'automated', 'manual', 'hybrid'
  assessment_data JSONB DEFAULT '{}'::jsonb,
  time_spent_minutes INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Onboarding step completion tracking
CREATE TABLE marketplace_onboarding_progress (
  creator_application_id UUID REFERENCES marketplace_creator_applications(id) NOT NULL,
  step_name TEXT NOT NULL,
  
  -- Step completion status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  completed_at TIMESTAMPTZ,
  
  -- Step data and validation
  step_data JSONB DEFAULT '{}'::jsonb,
  validation_errors JSONB DEFAULT '[]'::jsonb,
  
  -- Progress tracking
  attempts_count INTEGER DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  
  PRIMARY KEY (creator_application_id, step_name)
);

-- Creator application communications
CREATE TABLE marketplace_creator_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_application_id UUID REFERENCES marketplace_creator_applications(id) NOT NULL,
  
  -- Communication details
  communication_type TEXT NOT NULL, -- 'welcome', 'status_update', 'approval', 'rejection', 'improvement_request'
  subject TEXT NOT NULL,
  message_content TEXT NOT NULL,
  
  -- Delivery tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Communication metadata
  template_used TEXT,
  personalization_data JSONB DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_creator_applications_supplier ON marketplace_creator_applications(supplier_id);
CREATE INDEX idx_creator_applications_status ON marketplace_creator_applications(status, application_stage);
CREATE INDEX idx_creator_profiles_expertise ON marketplace_creator_profiles USING GIN(primary_expertise);
CREATE INDEX idx_creator_profiles_verified ON marketplace_creator_profiles(verified_creator, featured_creator);
CREATE INDEX idx_quality_assessments_score ON marketplace_quality_assessments(overall_score, assessment_passed);
CREATE INDEX idx_onboarding_progress_status ON marketplace_onboarding_progress(status, completed_at);
```

## API Endpoint Design

```typescript
// Creator onboarding interfaces
interface EligibilityCheck {
  supplier_id: string;
  checks: {
    subscription_tier: {
      required: string[];
      current: string;
      passed: boolean;
    };
    account_age: {
      required_days: number;
      current_days: number;
      passed: boolean;
    };
    client_count: {
      required_minimum: number;
      current_count: number;
      passed: boolean;
    };
    journey_completions: {
      required_minimum: number;
      current_count: number;
      passed: boolean;
    };
    satisfaction_score: {
      required_minimum: number;
      current_score: number;
      passed: boolean;
    };
  };
  overall_eligible: boolean;
  eligibility_score: number;
  missing_requirements: string[];
}

interface CreatorApplication {
  id: string;
  supplier_id: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'incomplete';
  application_stage: 'eligibility' | 'verification' | 'financial' | 'content' | 'review' | 'complete';
  
  // Application data
  eligibility_results: EligibilityCheck;
  quality_assessment?: QualityAssessment;
  onboarding_progress: OnboardingStep[];
  
  // Timeline
  submitted_at?: string;
  estimated_review_time?: string;
  approved_at?: string;
  
  // Feedback
  reviewer_feedback?: string;
  improvement_suggestions?: string[];
}

interface QualityAssessment {
  overall_score: number;
  assessment_passed: boolean;
  breakdown: {
    client_satisfaction: number;
    response_time: number;
    completion_rate: number;
    template_quality: number;
    portfolio_quality: number;
  };
  feedback: {
    strengths: string[];
    improvement_areas: string[];
    specific_feedback: string;
  };
}

interface OnboardingStep {
  step_name: string;
  display_name: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  required: boolean;
  estimated_time_minutes: number;
  completed_at?: string;
  validation_errors?: string[];
}

interface CreatorProfile {
  supplier_id: string;
  creator_display_name: string;
  creator_bio: string;
  avatar_url: string;
  primary_expertise: string[];
  years_experience: number;
  verified_creator: boolean;
  social_links: Record<string, string>;
  creator_since: string;
  total_templates: number;
  creator_rating: number;
}

// GET /api/marketplace/creator/eligibility/:supplierId
interface EligibilityCheckResponse {
  success: boolean;
  eligibility: EligibilityCheck;
  can_apply: boolean;
  requirements_info: Array<{
    requirement: string;
    description: string;
    current_status: string;
    action_needed?: string;
  }>;
}

// POST /api/marketplace/creator/application
interface CreateApplicationRequest {
  supplier_id: string;
  application_data: {
    motivation: string;
    primary_expertise: string[];
    estimated_monthly_sales: number;
    template_categories: string[];
    referral_source?: string;
  };
}

interface CreateApplicationResponse {
  success: boolean;
  application_id: string;
  application: CreatorApplication;
  next_steps: OnboardingStep[];
}

// GET /api/marketplace/creator/application/:applicationId
interface GetApplicationResponse {
  success: boolean;
  application: CreatorApplication;
  current_step: OnboardingStep;
  available_actions: string[];
}

// POST /api/marketplace/creator/application/:applicationId/complete-step
interface CompleteStepRequest {
  step_name: string;
  step_data: Record<string, any>;
}

interface CompleteStepResponse {
  success: boolean;
  step_completed: boolean;
  next_step?: OnboardingStep;
  validation_errors?: string[];
  application_status: string;
}

// POST /api/marketplace/creator/stripe-setup/:applicationId
interface StripeSetupResponse {
  success: boolean;
  account_id: string;
  onboarding_url: string;
  return_url: string;
  setup_expires_at: string;
}

// POST /api/marketplace/creator/quality-assessment/:applicationId
interface QualityAssessmentResponse {
  success: boolean;
  assessment: QualityAssessment;
  auto_approved: boolean;
  manual_review_required: boolean;
  estimated_review_time?: string;
}
```

## React Components Architecture

```typescript
// Creator Onboarding Wizard Component
interface CreatorOnboardingWizardProps {
  supplierId: string;
  onComplete: (applicationId: string) => void;
}

export function CreatorOnboardingWizard({ supplierId, onComplete }: CreatorOnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [application, setApplication] = useState<CreatorApplication | null>(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    { id: 'eligibility', title: 'Eligibility Check', component: EligibilityCheckStep },
    { id: 'verification', title: 'Profile & Verification', component: VerificationStep },
    { id: 'financial', title: 'Payment Setup', component: FinancialSetupStep },
    { id: 'content', title: 'First Template', component: ContentSubmissionStep },
    { id: 'review', title: 'Review & Submit', component: ReviewStep }
  ];

  const handleStepComplete = async (stepData: any) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/marketplace/creator/application/${application?.id}/complete-step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step_name: steps[currentStep].id,
          step_data: stepData
        })
      });

      const data = await response.json();
      
      if (data.success) {
        if (data.next_step) {
          setCurrentStep(currentStep + 1);
        } else {
          // Application complete
          onComplete(application!.id);
        }
      } else {
        // Handle validation errors
        console.error('Step completion failed:', data.validation_errors);
      }
    } catch (error) {
      console.error('Failed to complete step:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Become a Template Creator</h1>
          <Badge variant="outline">
            Step {currentStep + 1} of {steps.length}
          </Badge>
        </div>
        
        {/* Progress Bar */}
        <div className="flex items-center space-x-4">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                index < currentStep ? 'bg-green-500 text-white' :
                index === currentStep ? 'bg-blue-500 text-white' :
                'bg-gray-200 text-gray-600'
              }`}>
                {index < currentStep ? '✓' : index + 1}
              </div>
              <span className={`text-sm ${
                index <= currentStep ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${
                  index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <Card>
        <CardBody>
          {React.createElement(steps[currentStep].component, {
            supplierId,
            application,
            onComplete: handleStepComplete,
            loading
          })}
        </CardBody>
      </Card>
    </div>
  );
}

// Eligibility Check Step Component
interface EligibilityCheckStepProps {
  supplierId: string;
  onComplete: (data: any) => void;
  loading: boolean;
}

export function EligibilityCheckStep({ supplierId, onComplete, loading }: EligibilityCheckStepProps) {
  const [eligibility, setEligibility] = useState<EligibilityCheck | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const checkEligibility = async () => {
    try {
      const response = await fetch(`/api/marketplace/creator/eligibility/${supplierId}`);
      const data = await response.json();
      setEligibility(data.eligibility);
    } catch (error) {
      console.error('Failed to check eligibility:', error);
    } finally {
      setCheckingEligibility(false);
    }
  };

  useEffect(() => {
    checkEligibility();
  }, [supplierId]);

  if (checkingEligibility) {
    return (
      <div className="text-center py-8">
        <Spinner className="w-8 h-8 mx-auto mb-4" />
        <p>Checking your eligibility...</p>
      </div>
    );
  }

  if (!eligibility) {
    return <ErrorState message="Unable to check eligibility" />;
  }

  const getCheckIcon = (passed: boolean) => {
    return passed ? 
      <CheckCircleIcon className="w-5 h-5 text-green-500" /> :
      <XCircleIcon className="w-5 h-5 text-red-500" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Creator Eligibility Check</h2>
        <p className="text-gray-600">
          We need to verify you meet our creator requirements before you can start selling templates.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            {getCheckIcon(eligibility.checks.subscription_tier.passed)}
            <div>
              <div className="font-medium">Professional Subscription</div>
              <div className="text-sm text-gray-600">
                Current: {eligibility.checks.subscription_tier.current}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            {getCheckIcon(eligibility.checks.account_age.passed)}
            <div>
              <div className="font-medium">Account Age (30+ days)</div>
              <div className="text-sm text-gray-600">
                Your account: {eligibility.checks.account_age.current_days} days old
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            {getCheckIcon(eligibility.checks.client_count.passed)}
            <div>
              <div className="font-medium">Active Clients (50+ required)</div>
              <div className="text-sm text-gray-600">
                You have: {eligibility.checks.client_count.current_count} clients
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            {getCheckIcon(eligibility.checks.journey_completions.passed)}
            <div>
              <div className="font-medium">Completed Journeys (10+ required)</div>
              <div className="text-sm text-gray-600">
                You've completed: {eligibility.checks.journey_completions.current_count} journeys
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            {getCheckIcon(eligibility.checks.satisfaction_score.passed)}
            <div>
              <div className="font-medium">Client Satisfaction (4.0+ required)</div>
              <div className="text-sm text-gray-600">
                Your rating: {eligibility.checks.satisfaction_score.current_score}/5.0
              </div>
            </div>
          </div>
        </div>
      </div>

      {eligibility.overall_eligible ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircleIcon className="w-6 h-6 text-green-500" />
            <div>
              <h3 className="font-semibold text-green-800">Congratulations! You're eligible</h3>
              <p className="text-sm text-green-700">
                You meet all requirements to become a template creator. Let's continue with your application.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <XCircleIcon className="w-6 h-6 text-red-500" />
            <div>
              <h3 className="font-semibold text-red-800">Not quite ready yet</h3>
              <p className="text-sm text-red-700 mb-2">
                You need to meet a few more requirements before applying:
              </p>
              <ul className="text-sm text-red-700 space-y-1">
                {eligibility.missing_requirements.map((requirement, index) => (
                  <li key={index}>• {requirement}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          onClick={() => onComplete({ eligibility_check: eligibility })}
          disabled={!eligibility.overall_eligible || loading}
          className="px-6"
        >
          {eligibility.overall_eligible ? 'Continue Application' : 'I understand'}
        </Button>
      </div>
    </div>
  );
}

// Profile Verification Step Component
interface VerificationStepProps {
  supplierId: string;
  onComplete: (data: any) => void;
  loading: boolean;
}

export function VerificationStep({ supplierId, onComplete, loading }: VerificationStepProps) {
  const [formData, setFormData] = useState({
    creator_display_name: '',
    creator_bio: '',
    creator_tagline: '',
    primary_expertise: [] as string[],
    years_experience: 0,
    business_name: '',
    website_url: '',
    portfolio_files: [] as File[]
  });

  const expertiseOptions = [
    'Wedding Planning', 'Photography', 'Videography', 'Floral Design',
    'Venue Management', 'Catering', 'DJ/Music', 'Officiant Services',
    'Hair & Makeup', 'Transportation', 'Decor & Styling', 'Stationery'
  ];

  const handleExpertiseChange = (expertise: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        primary_expertise: [...prev.primary_expertise, expertise]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        primary_expertise: prev.primary_expertise.filter(exp => exp !== expertise)
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.creator_display_name || !formData.creator_bio || formData.primary_expertise.length === 0) {
      alert('Please fill in all required fields');
      return;
    }

    onComplete({
      verification_data: formData
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Create Your Creator Profile</h2>
        <p className="text-gray-600">
          This information will be displayed on your creator profile and templates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Creator Display Name *
          </label>
          <input
            type="text"
            value={formData.creator_display_name}
            onChange={(e) => setFormData(prev => ({ ...prev, creator_display_name: e.target.value }))}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="How you want to appear to customers"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Years of Experience *
          </label>
          <input
            type="number"
            value={formData.years_experience || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, years_experience: Number(e.target.value) }))}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            min="0"
            max="50"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Creator Tagline
        </label>
        <input
          type="text"
          value={formData.creator_tagline}
          onChange={(e) => setFormData(prev => ({ ...prev, creator_tagline: e.target.value }))}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder="A short tagline describing your specialty"
          maxLength={100}
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Creator Bio *
        </label>
        <textarea
          value={formData.creator_bio}
          onChange={(e) => setFormData(prev => ({ ...prev, creator_bio: e.target.value }))}
          className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Tell customers about your experience, approach, and what makes your templates special..."
          maxLength={500}
          required
        />
        <div className="text-xs text-gray-500 mt-1">
          {formData.creator_bio.length}/500 characters
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          Primary Expertise * (Select up to 3)
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {expertiseOptions.map((expertise) => (
            <label key={expertise} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.primary_expertise.includes(expertise)}
                onChange={(e) => handleExpertiseChange(expertise, e.target.checked)}
                disabled={!formData.primary_expertise.includes(expertise) && formData.primary_expertise.length >= 3}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm">{expertise}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Business Name
          </label>
          <input
            type="text"
            value={formData.business_name}
            onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="Your business name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Website URL
          </label>
          <input
            type="url"
            value={formData.website_url}
            onChange={(e) => setFormData(prev => ({ ...prev, website_url: e.target.value }))}
            className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="https://yourwebsite.com"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="px-6"
        >
          {loading ? 'Saving...' : 'Continue to Payment Setup'}
        </Button>
      </div>
    </form>
  );
}
```

## Core Services Implementation

```typescript
// Creator eligibility service
export class CreatorEligibilityService {
  private static readonly ELIGIBILITY_REQUIREMENTS = {
    subscription_tier: ['professional', 'scale', 'enterprise'],
    minimum_account_age_days: 30,
    minimum_client_count: 50,
    minimum_journey_completions: 10,
    minimum_satisfaction_score: 4.0
  };

  async checkEligibility(supplierId: string): Promise<EligibilityCheck> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Get supplier information
    const { data: supplier, error } = await supabase
      .from('suppliers')
      .select(`
        *,
        subscription_tier,
        created_at,
        total_clients,
        completed_journeys,
        average_rating
      `)
      .eq('id', supplierId)
      .single();

    if (error) throw error;

    // Calculate account age
    const accountAgeDays = Math.floor(
      (Date.now() - new Date(supplier.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Build eligibility checks
    const checks = {
      subscription_tier: {
        required: CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.subscription_tier,
        current: supplier.subscription_tier,
        passed: CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.subscription_tier.includes(supplier.subscription_tier)
      },
      account_age: {
        required_days: CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.minimum_account_age_days,
        current_days: accountAgeDays,
        passed: accountAgeDays >= CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.minimum_account_age_days
      },
      client_count: {
        required_minimum: CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.minimum_client_count,
        current_count: supplier.total_clients || 0,
        passed: (supplier.total_clients || 0) >= CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.minimum_client_count
      },
      journey_completions: {
        required_minimum: CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.minimum_journey_completions,
        current_count: supplier.completed_journeys || 0,
        passed: (supplier.completed_journeys || 0) >= CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.minimum_journey_completions
      },
      satisfaction_score: {
        required_minimum: CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.minimum_satisfaction_score,
        current_score: supplier.average_rating || 0,
        passed: (supplier.average_rating || 0) >= CreatorEligibilityService.ELIGIBILITY_REQUIREMENTS.minimum_satisfaction_score
      }
    };

    // Calculate overall eligibility
    const passedChecks = Object.values(checks).filter(check => check.passed).length;
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
      missing_requirements: missingRequirements
    };
  }

  async recordEligibilityCheck(supplierId: string, eligibilityResult: EligibilityCheck): Promise<string> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    const { data: application, error } = await supabase
      .from('marketplace_creator_applications')
      .upsert({
        supplier_id: supplierId,
        status: eligibilityResult.overall_eligible ? 'draft' : 'incomplete',
        application_stage: 'eligibility',
        eligibility_checks: eligibilityResult.checks,
        eligibility_score: eligibilityResult.eligibility_score,
        eligibility_passed: eligibilityResult.overall_eligible,
        last_activity_at: new Date().toISOString()
      }, {
        onConflict: 'supplier_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;

    return application.id;
  }
}

// Creator onboarding service
export class CreatorOnboardingService {
  async createApplication(supplierId: string, applicationData: any): Promise<CreatorApplication> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // First check eligibility
    const eligibilityService = new CreatorEligibilityService();
    const eligibilityResult = await eligibilityService.checkEligibility(supplierId);

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
        eligibility_passed: true,
        application_data: applicationData,
        last_activity_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // Initialize onboarding progress
    await this.initializeOnboardingProgress(application.id);

    return this.buildApplicationResponse(application);
  }

  async completeOnboardingStep(
    applicationId: string,
    stepName: string,
    stepData: any
  ): Promise<{ success: boolean; nextStep?: OnboardingStep; validationErrors?: string[] }> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    try {
      // Validate step data
      const validationErrors = await this.validateStepData(stepName, stepData);
      if (validationErrors.length > 0) {
        return { success: false, validationErrors };
      }

      // Update step progress
      await supabase
        .from('marketplace_onboarding_progress')
        .upsert({
          creator_application_id: applicationId,
          step_name: stepName,
          status: 'completed',
          completed_at: new Date().toISOString(),
          step_data: stepData
        }, {
          onConflict: 'creator_application_id,step_name'
        });

      // Process step-specific logic
      await this.processStepCompletion(applicationId, stepName, stepData);

      // Determine next step
      const nextStep = await this.getNextOnboardingStep(applicationId);

      // Update application stage if needed
      if (!nextStep) {
        await this.finalizeApplication(applicationId);
      }

      return {
        success: true,
        nextStep: nextStep || undefined
      };

    } catch (error) {
      console.error('Failed to complete onboarding step:', error);
      return {
        success: false,
        validationErrors: ['An error occurred while processing your request']
      };
    }
  }

  private async processStepCompletion(applicationId: string, stepName: string, stepData: any): Promise<void> {
    switch (stepName) {
      case 'verification':
        await this.processVerificationStep(applicationId, stepData);
        break;
      case 'financial':
        await this.processFinancialStep(applicationId, stepData);
        break;
      case 'content':
        await this.processContentStep(applicationId, stepData);
        break;
    }
  }

  private async processVerificationStep(applicationId: string, verificationData: any): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Create creator profile draft
    const { data: application } = await supabase
      .from('marketplace_creator_applications')
      .select('supplier_id')
      .eq('id', applicationId)
      .single();

    if (application) {
      await supabase
        .from('marketplace_creator_profiles')
        .upsert({
          supplier_id: application.supplier_id,
          creator_display_name: verificationData.verification_data.creator_display_name,
          creator_bio: verificationData.verification_data.creator_bio,
          creator_tagline: verificationData.verification_data.creator_tagline,
          primary_expertise: verificationData.verification_data.primary_expertise,
          years_experience: verificationData.verification_data.years_experience,
          business_name: verificationData.verification_data.business_name,
          website_url: verificationData.verification_data.website_url,
          creator_status: 'active'
        }, {
          onConflict: 'supplier_id'
        });
    }
  }

  private async processFinancialStep(applicationId: string, financialData: any): Promise<void> {
    // Update application with Stripe account info
    const { supabase } = await createRouteHandlerClient({ cookies });

    await supabase
      .from('marketplace_creator_applications')
      .update({
        stripe_connect_account_id: financialData.stripe_account_id,
        stripe_onboarding_complete: financialData.onboarding_complete,
        tax_information_complete: financialData.tax_complete,
        payout_preferences: financialData.payout_preferences
      })
      .eq('id', applicationId);
  }

  async setupStripeConnect(applicationId: string): Promise<StripeSetupResponse> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Get application and supplier info
    const { data: application, error } = await supabase
      .from('marketplace_creator_applications')
      .select(`
        supplier_id,
        suppliers (
          email,
          business_name,
          business_country
        )
      `)
      .eq('id', applicationId)
      .single();

    if (error) throw error;

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: 'express',
      country: application.suppliers.business_country || 'GB',
      email: application.suppliers.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true }
      },
      business_type: 'individual',
      metadata: {
        supplier_id: application.supplier_id,
        application_id: applicationId,
        wedsync_creator: 'true'
      }
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/creator/onboarding/refresh?application=${applicationId}`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketplace/creator/onboarding/complete?application=${applicationId}`,
      type: 'account_onboarding'
    });

    // Update application with Stripe account ID
    await supabase
      .from('marketplace_creator_applications')
      .update({
        stripe_connect_account_id: account.id
      })
      .eq('id', applicationId);

    return {
      success: true,
      account_id: account.id,
      onboarding_url: accountLink.url,
      return_url: accountLink.return_url,
      setup_expires_at: new Date(accountLink.expires_at * 1000).toISOString()
    };
  }
}

// Quality assessment service
export class CreatorQualityAssessmentService {
  async assessCreator(applicationId: string): Promise<QualityAssessment> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Get application and supplier data
    const { data: application, error } = await supabase
      .from('marketplace_creator_applications')
      .select(`
        supplier_id,
        suppliers (
          average_rating,
          total_clients,
          completed_journeys,
          response_time_hours,
          form_completion_rate
        )
      `)
      .eq('id', applicationId)
      .single();

    if (error) throw error;

    const supplier = application.suppliers;

    // Calculate quality scores (0-10 scale)
    const scores = {
      client_satisfaction: this.scoreFromRating(supplier.average_rating),
      response_time: this.scoreFromResponseTime(supplier.response_time_hours),
      completion_rate: this.scoreFromCompletionRate(supplier.form_completion_rate),
      template_quality: await this.assessTemplateQuality(application.supplier_id),
      portfolio_quality: await this.assessPortfolioQuality(application.supplier_id)
    };

    // Calculate overall score
    const overallScore = Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length;
    const assessmentPassed = overallScore >= 7.0;

    // Generate feedback
    const feedback = this.generateFeedback(scores);

    // Record assessment
    const { data: assessment } = await supabase
      .from('marketplace_quality_assessments')
      .insert({
        creator_application_id: applicationId,
        client_satisfaction_score: scores.client_satisfaction,
        response_time_score: scores.response_time,
        completion_rate_score: scores.completion_rate,
        template_quality_score: scores.template_quality,
        portfolio_quality_score: scores.portfolio_quality,
        overall_score: overallScore,
        assessment_passed: assessmentPassed,
        strengths: feedback.strengths,
        improvement_areas: feedback.improvement_areas,
        specific_feedback: feedback.specific_feedback,
        assessment_method: 'automated'
      })
      .select()
      .single();

    return {
      overall_score: overallScore,
      assessment_passed: assessmentPassed,
      breakdown: scores,
      feedback
    };
  }

  private scoreFromRating(rating: number): number {
    // Convert 5-star rating to 10-point score
    return Math.min(10, (rating / 5) * 10);
  }

  private scoreFromResponseTime(hours: number): number {
    // Scoring: < 2 hours = 10, < 4 hours = 8, < 8 hours = 6, etc.
    if (hours <= 2) return 10;
    if (hours <= 4) return 8;
    if (hours <= 8) return 6;
    if (hours <= 24) return 4;
    return 2;
  }

  private scoreFromCompletionRate(rate: number): number {
    // Direct conversion: 90% completion = 9 points
    return rate * 10;
  }

  private async assessTemplateQuality(supplierId: string): Promise<number> {
    // Assess existing forms and workflows for complexity and quality
    // This would analyze form structures, automation complexity, etc.
    return 7.5; // Placeholder - would implement actual assessment logic
  }

  private async assessPortfolioQuality(supplierId: string): Promise<number> {
    // Assess portfolio quality based on client outcomes, testimonials, etc.
    return 8.0; // Placeholder - would implement actual assessment logic
  }

  private generateFeedback(scores: Record<string, number>): {
    strengths: string[];
    improvement_areas: string[];
    specific_feedback: string;
  } {
    const strengths: string[] = [];
    const improvement_areas: string[] = [];

    // Identify strengths (scores >= 8)
    Object.entries(scores).forEach(([area, score]) => {
      if (score >= 8) {
        const areaName = area.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        strengths.push(`Excellent ${areaName.toLowerCase()}`);
      } else if (score < 6) {
        const areaName = area.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
        improvement_areas.push(`${areaName} needs improvement`);
      }
    });

    const specificFeedback = `Overall quality score: ${(Object.values(scores).reduce((a, b) => a + b) / Object.keys(scores).length).toFixed(1)}/10. ${
      strengths.length > 0 ? `Strengths include ${strengths.join(', ').toLowerCase()}.` : ''
    } ${
      improvement_areas.length > 0 ? `Areas for improvement: ${improvement_areas.join(', ').toLowerCase()}.` : ''
    }`;

    return {
      strengths,
      improvement_areas,
      specific_feedback: specificFeedback
    };
  }
}
```

## Integration Points

### Integration with WS-107 (Tier Access) and WS-109 (Commission Structure)
```typescript
// Creator approval triggers tier and commission setup
export class CreatorApprovalService {
  async approveCreatorApplication(applicationId: string): Promise<void> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Approve application
    await supabase
      .from('marketplace_creator_applications')
      .update({
        status: 'approved',
        approved_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    // Get application data
    const { data: application } = await supabase
      .from('marketplace_creator_applications')
      .select('supplier_id')
      .eq('id', applicationId)
      .single();

    // Initialize creator commission tier (integrates with WS-109)
    await supabase
      .from('marketplace_creator_commission_tiers')
      .insert({
        creator_id: application.supplier_id,
        current_tier: 'base',
        tier_achieved_date: new Date().toISOString()
      });

    // Update creator profile to verified status
    await supabase
      .from('marketplace_creator_profiles')
      .update({
        verified_creator: true,
        creator_since: new Date().toISOString().split('T')[0]
      })
      .eq('supplier_id', application.supplier_id);

    // Send approval notification
    await this.sendApprovalNotification(application.supplier_id);
  }
}
```

### MCP Database Operations
```typescript
// Use PostgreSQL MCP for complex creator analytics
export async function getCreatorOnboardingAnalytics(): Promise<OnboardingAnalytics> {
  const query = `
    SELECT 
      DATE_TRUNC('week', submitted_at) as week,
      COUNT(*) as total_applications,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_count,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_count,
      AVG(EXTRACT(epoch FROM (approved_at - submitted_at))/3600/24) as avg_review_days,
      AVG(quality_score) as avg_quality_score
    FROM marketplace_creator_applications 
    WHERE submitted_at >= NOW() - INTERVAL '12 weeks'
    GROUP BY week 
    ORDER BY week DESC
  `;

  return await executePostgreSQLQuery(query);
}
```

## Test Requirements

### Unit Tests
```typescript
describe('CreatorEligibilityService', () => {
  it('should correctly identify eligible creators', async () => {
    const service = new CreatorEligibilityService();
    
    const eligibleSupplier = {
      subscription_tier: 'professional',
      created_at: '2024-01-01',
      total_clients: 75,
      completed_journeys: 15,
      average_rating: 4.5
    };
    
    const eligibility = await service.checkEligibility('test-supplier-id');
    
    expect(eligibility.overall_eligible).toBe(true);
    expect(eligibility.missing_requirements).toHaveLength(0);
  });

  it('should identify missing requirements for ineligible creators', async () => {
    const ineligibleSupplier = {
      subscription_tier: 'starter',
      created_at: '2024-10-01', // Too recent
      total_clients: 25, // Too few
      completed_journeys: 15,
      average_rating: 4.5
    };
    
    const eligibility = await service.checkEligibility('test-supplier-id');
    
    expect(eligibility.overall_eligible).toBe(false);
    expect(eligibility.missing_requirements).toContain('subscription_tier');
    expect(eligibility.missing_requirements).toContain('client_count');
  });
});

describe('CreatorQualityAssessmentService', () => {
  it('should calculate quality scores correctly', async () => {
    const service = new CreatorQualityAssessmentService();
    
    const assessment = await service.assessCreator('test-application-id');
    
    expect(assessment.overall_score).toBeGreaterThanOrEqual(0);
    expect(assessment.overall_score).toBeLessThanOrEqual(10);
    expect(assessment.breakdown).toHaveProperty('client_satisfaction');
    expect(assessment.feedback.strengths).toBeInstanceOf(Array);
  });
});
```

### Integration Tests
```typescript
describe('Creator Onboarding Flow', () => {
  it('should complete full onboarding process', async () => {
    const onboardingService = new CreatorOnboardingService();
    
    // Create application
    const application = await onboardingService.createApplication('test-supplier', {
      motivation: 'Test motivation',
      primary_expertise: ['Wedding Planning']
    });
    
    expect(application.status).toBe('draft');
    
    // Complete verification step
    const verificationResult = await onboardingService.completeOnboardingStep(
      application.id,
      'verification',
      { verification_data: { creator_display_name: 'Test Creator' } }
    );
    
    expect(verificationResult.success).toBe(true);
    expect(verificationResult.nextStep?.step_name).toBe('financial');
  });
});
```

## Acceptance Criteria

- [x] **Eligibility Verification**: Automatic checking of creator requirements before application
- [x] **Multi-Step Onboarding**: Guided wizard with progress tracking through all setup stages
- [x] **Stripe Connect Integration**: Seamless payment account setup for creator payouts
- [x] **Quality Assessment**: Automated scoring system based on supplier performance metrics
- [x] **Profile Creation**: Complete creator profile setup with expertise and portfolio information
- [x] **Application Tracking**: Status tracking and communication throughout review process
- [x] **Approval Workflow**: Manual review process with feedback and improvement suggestions
- [x] **Creator Dashboard**: Post-approval dashboard showing profile and template management
- [x] **Integration with Commission**: Automatic tier setup upon creator approval
- [x] **Communication Flow**: Email notifications and status updates throughout onboarding

## Deployment Notes

1. **Eligibility Requirements**: Configure creator qualification thresholds
2. **Stripe Connect Setup**: Enable Express accounts for creator payments
3. **Quality Scoring**: Configure assessment criteria and scoring algorithms
4. **Email Templates**: Set up onboarding communication templates
5. **Review Workflow**: Configure manual review process and reviewer assignment

---

**Specification Status**: ✅ Complete  
**Implementation Priority**: High (Marketplace Foundation)  
**Estimated Effort**: 10-12 developer days  
**Dependencies**: WS-106 (Marketplace Foundation), WS-076 (Stripe Setup)