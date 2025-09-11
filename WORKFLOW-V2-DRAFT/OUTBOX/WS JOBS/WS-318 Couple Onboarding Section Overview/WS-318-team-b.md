# TEAM B - ROUND 1: WS-318 - Couple Onboarding Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build robust backend infrastructure for couple onboarding with progress tracking, data validation, and seamless vendor integration
**FEATURE ID:** WS-318 (Track all work with this ID)

## 🚨 EVIDENCE REQUIREMENTS
```bash
ls -la $WS_ROOT/wedsync/src/app/api/onboarding/couple/
npx supabase migration up --linked  # Migration successful
npm run typecheck  # No errors
npm test api/onboarding/couple  # All API tests passing
```

## 🎯 COUPLE ONBOARDING BACKEND FOCUS
- **Onboarding State Management:** Progressive data collection with automatic saving and resumption
- **Vendor Integration Pipeline:** Seamless connection between couple onboarding and vendor platforms
- **Wedding Data Validation:** Smart validation of wedding details with helpful suggestions and corrections
- **Progress Tracking System:** Detailed analytics on onboarding completion rates and drop-off points
- **Personalization Engine:** Dynamic content serving based on inviting vendor and couple preferences
- **Security & Privacy:** Secure handling of couple wedding details and vendor invitation tokens

## 📊 DATABASE SCHEMA
```sql
-- WS-318 Couple Onboarding System Schema
CREATE TABLE couple_onboarding (
  couple_id UUID PRIMARY KEY REFERENCES clients(id),
  inviting_vendor_id UUID REFERENCES user_profiles(id),
  invitation_token VARCHAR(255) UNIQUE,
  current_step VARCHAR(50) DEFAULT 'welcome',
  completed_steps JSONB DEFAULT '[]',
  onboarding_data JSONB DEFAULT '{}',
  personalization_settings JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  completion_source VARCHAR(50), -- 'web', 'mobile', 'tablet'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE onboarding_step_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id),
  step_id VARCHAR(50) NOT NULL,
  step_data JSONB NOT NULL,
  validation_errors JSONB DEFAULT '[]',
  time_spent INTEGER DEFAULT 0, -- seconds
  attempts INTEGER DEFAULT 1,
  completed BOOLEAN DEFAULT FALSE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE wedding_basics (
  couple_id UUID PRIMARY KEY REFERENCES clients(id),
  wedding_date DATE,
  ceremony_time TIME,
  venue_name VARCHAR(255),
  venue_address TEXT,
  venue_type VARCHAR(100),
  estimated_guest_count INTEGER,
  actual_guest_count INTEGER,
  budget_range VARCHAR(50),
  wedding_style VARCHAR(100),
  dietary_requirements TEXT[],
  accessibility_needs TEXT[],
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE couple_vendor_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID NOT NULL REFERENCES clients(id),
  vendor_email VARCHAR(255) NOT NULL,
  vendor_business_name VARCHAR(255),
  service_type VARCHAR(100) NOT NULL,
  invitation_token VARCHAR(255) UNIQUE NOT NULL,
  invitation_status VARCHAR(50) DEFAULT 'sent', -- sent, accepted, declined, expired
  personal_message TEXT,
  expected_response_date DATE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE TABLE onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id UUID REFERENCES clients(id),
  event_type VARCHAR(100) NOT NULL,
  step_id VARCHAR(50),
  event_data JSONB DEFAULT '{}',
  user_agent TEXT,
  ip_address INET,
  session_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE onboarding_personalization (
  couple_id UUID PRIMARY KEY REFERENCES clients(id),
  inviting_vendor_type VARCHAR(100),
  wedding_size_category VARCHAR(50), -- intimate, medium, large
  planning_timeline VARCHAR(50), -- short, normal, extended
  experience_level VARCHAR(50), -- first_time, experienced
  preferred_communication VARCHAR(50), -- email, sms, app
  content_preferences JSONB DEFAULT '{}',
  feature_interests JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_couple_onboarding_current_step ON couple_onboarding(current_step, last_active_at);
CREATE INDEX idx_onboarding_progress_couple ON onboarding_step_progress(couple_id, step_id);
CREATE INDEX idx_vendor_invitations_token ON couple_vendor_invitations(invitation_token);
CREATE INDEX idx_vendor_invitations_status ON couple_vendor_invitations(couple_id, invitation_status);
CREATE INDEX idx_onboarding_analytics_event ON onboarding_analytics(event_type, created_at DESC);
```

## 🎯 API ENDPOINTS STRUCTURE
- `GET/POST/PUT /api/onboarding/couple` - Onboarding state management
- `POST /api/onboarding/couple/step` - Step completion and validation
- `GET /api/onboarding/couple/progress` - Progress tracking and resumption
- `POST /api/onboarding/couple/wedding-basics` - Wedding details setup
- `POST /api/onboarding/couple/vendor-invites` - Vendor invitation system
- `GET /api/onboarding/couple/personalization` - Personalized content delivery
- `POST /api/onboarding/couple/complete` - Onboarding completion processing
- `POST /api/onboarding/couple/analytics` - Event tracking and analytics
- `GET /api/onboarding/couple/validation` - Data validation and suggestions

## 🛡️ CRITICAL SECURITY REQUIREMENTS

### Couple Data Protection
- [ ] withSecureValidation on all onboarding endpoints
- [ ] Secure handling and storage of sensitive wedding details
- [ ] GDPR compliance for international couples
- [ ] Encrypted storage of personal information and preferences
- [ ] Secure vendor invitation token generation and validation

### Wedding Data Privacy
- [ ] Granular privacy controls for wedding information sharing
- [ ] Secure vendor invitation workflow with token expiration
- [ ] Audit logging for all couple data access and modifications
- [ ] Consent management for vendor data sharing permissions
- [ ] Right to data deletion and account removal

### Onboarding Security
- [ ] Protection against automated onboarding attempts
- [ ] Rate limiting on onboarding API endpoints
- [ ] Input validation and sanitization for all wedding data
- [ ] Session management for onboarding progress
- [ ] Secure handling of vendor invitation workflows

## 💾 REQUIRED FILES TO CREATE
```
$WS_ROOT/wedsync/src/app/api/onboarding/couple/
├── route.ts                         # Main onboarding CRUD operations
├── step/route.ts                    # Step completion and validation
├── progress/route.ts                # Progress tracking and resumption
├── wedding-basics/route.ts          # Wedding details setup
├── vendor-invites/route.ts          # Vendor invitation management
├── personalization/route.ts         # Personalized content delivery
├── complete/route.ts                # Onboarding completion processing
├── analytics/route.ts               # Event tracking and analytics
└── validation/route.ts              # Data validation and suggestions

$WS_ROOT/wedsync/src/lib/onboarding/couple/
├── onboardingManager.ts             # Core onboarding logic
├── progressTracker.ts               # Progress state management
├── weddingBasicsValidator.ts        # Wedding data validation
├── vendorInvitationService.ts       # Vendor invitation system
├── personalizationEngine.ts        # Dynamic content personalization
├── onboardingAnalytics.ts           # Usage tracking and optimization
├── dataIntegrityChecker.ts          # Data consistency validation
└── __tests__/
    ├── onboardingManager.test.ts
    ├── progressTracker.test.ts
    ├── weddingBasicsValidator.test.ts
    └── vendorInvitationService.test.ts

$WS_ROOT/wedsync/supabase/migrations/
└── 63_couple_onboarding_system.sql  # Database migration
```

## 🔧 IMPLEMENTATION DETAILS

### Onboarding State Manager
```typescript
export class CoupleOnboardingManager {
  async initializeOnboarding(
    coupleId: string,
    invitingVendorId: string,
    invitationToken: string
  ): Promise<OnboardingSession> {
    // Validate invitation token and vendor relationship
    const vendor = await this.validateVendorInvitation(invitingVendorId, invitationToken);
    
    // Initialize onboarding record
    const onboarding = await this.createOnboardingRecord({
      coupleId,
      invitingVendorId,
      invitationToken,
      currentStep: 'welcome',
      completedSteps: [],
      personalizationSettings: await this.generatePersonalizationSettings(vendor)
    });
    
    // Track onboarding start event
    await this.trackOnboardingEvent(coupleId, 'onboarding_started', {
      invitingVendor: vendor.businessName,
      vendorType: vendor.serviceType
    });
    
    return onboarding;
  }

  async saveStepProgress(
    coupleId: string,
    stepId: string,
    stepData: OnboardingStepData
  ): Promise<StepSaveResult> {
    // Validate step data according to step requirements
    const validationResult = await this.validateStepData(stepId, stepData);
    if (!validationResult.isValid) {
      return { success: false, errors: validationResult.errors };
    }
    
    // Save step progress with automatic timestamp
    await this.saveStepData(coupleId, stepId, stepData);
    
    // Update overall onboarding progress
    await this.updateOnboardingProgress(coupleId, stepId);
    
    // Track step completion event
    await this.trackOnboardingEvent(coupleId, 'step_completed', {
      stepId,
      timeSpent: stepData.timeSpent || 0
    });
    
    return { success: true, nextStep: this.calculateNextStep(stepId) };
  }
}
```

### Wedding Basics Validation System
```typescript
export class WeddingBasicsValidator {
  async validateWeddingDetails(weddingData: WeddingBasicsData): Promise<ValidationResult> {
    const validations = await Promise.all([
      this.validateWeddingDate(weddingData.weddingDate),
      this.validateVenueInformation(weddingData.venue),
      this.validateGuestCount(weddingData.guestCount),
      this.validateBudgetConsistency(weddingData.budget, weddingData.guestCount)
    ]);
    
    return {
      isValid: validations.every(v => v.isValid),
      errors: validations.flatMap(v => v.errors),
      suggestions: validations.flatMap(v => v.suggestions),
      warnings: this.generateHelpfulWarnings(weddingData)
    };
  }

  private async validateWeddingDate(weddingDate: Date): Promise<ValidationResult> {
    // Check if date is in the future
    if (weddingDate <= new Date()) {
      return { isValid: false, errors: ['Wedding date must be in the future'] };
    }
    
    // Check if date is on a popular wedding date
    const isPopularDate = await this.checkPopularWeddingDate(weddingDate);
    const warnings = isPopularDate ? 
      ['This is a popular wedding date - book vendors early!'] : [];
    
    // Check for seasonal considerations
    const seasonalAdvice = this.getSeasonalAdvice(weddingDate);
    
    return {
      isValid: true,
      errors: [],
      suggestions: seasonalAdvice,
      warnings
    };
  }

  private async validateVenueInformation(venue: VenueInfo): Promise<ValidationResult> {
    if (!venue.name || !venue.location) {
      return { 
        isValid: false, 
        errors: ['Venue name and location are required'],
        suggestions: ['Search our venue database or enter venue details manually']
      };
    }
    
    // Validate venue exists and get additional information
    const venueDetails = await this.enrichVenueData(venue);
    
    return {
      isValid: true,
      errors: [],
      suggestions: [`Consider ${venueDetails.recommendedVendorTypes.join(', ')} for this venue type`]
    };
  }
}
```

### Vendor Invitation Service
```typescript
export class VendorInvitationService {
  async sendVendorInvitation(
    coupleId: string,
    vendorInvite: VendorInviteRequest
  ): Promise<VendorInvitation> {
    // Generate secure invitation token
    const invitationToken = await this.generateSecureInvitationToken();
    
    // Create invitation record
    const invitation = await this.createInvitationRecord({
      coupleId,
      vendorEmail: vendorInvite.email,
      vendorBusinessName: vendorInvite.businessName,
      serviceType: vendorInvite.serviceType,
      invitationToken,
      personalMessage: vendorInvite.personalMessage,
      expectedResponseDate: this.calculateExpectedResponse(vendorInvite.serviceType)
    });
    
    // Send invitation email with personalized content
    await this.sendInvitationEmail({
      vendorEmail: vendorInvite.email,
      coupleNames: await this.getCoupleNames(coupleId),
      invitationUrl: this.generateInvitationUrl(invitationToken),
      personalMessage: vendorInvite.personalMessage,
      serviceType: vendorInvite.serviceType
    });
    
    // Track invitation sent event
    await this.trackOnboardingEvent(coupleId, 'vendor_invited', {
      serviceType: vendorInvite.serviceType,
      vendorEmail: vendorInvite.email
    });
    
    return invitation;
  }

  async processVendorResponse(
    invitationToken: string,
    response: VendorInvitationResponse
  ): Promise<void> {
    // Validate invitation token and check expiration
    const invitation = await this.validateInvitationToken(invitationToken);
    if (!invitation || invitation.expiresAt < new Date()) {
      throw new Error('Invalid or expired invitation token');
    }
    
    // Update invitation status
    await this.updateInvitationStatus(invitation.id, response.status);
    
    if (response.status === 'accepted') {
      // Create vendor connection on couple platform
      await this.establishVendorConnection(invitation, response.vendorId);
      
      // Initialize vendor data sharing permissions
      await this.setupVendorPermissions(invitation.coupleId, response.vendorId);
    }
    
    // Notify couple of vendor response
    await this.notifyCoupleOfVendorResponse(invitation, response);
  }
}
```

### Personalization Engine
```typescript
export class OnboardingPersonalizationEngine {
  async generatePersonalizedContent(
    coupleId: string,
    invitingVendorId: string,
    onboardingStep: string
  ): Promise<PersonalizedContent> {
    const [vendor, coupleData, preferences] = await Promise.all([
      this.getVendorDetails(invitingVendorId),
      this.getCoupleOnboardingData(coupleId),
      this.getCouplePreferences(coupleId)
    ]);
    
    return {
      welcomeMessage: this.generateWelcomeMessage(vendor, coupleData),
      featuredContent: this.selectFeaturedContent(vendor.serviceType, preferences),
      tips: this.generateContextualTips(onboardingStep, vendor, coupleData),
      nextSteps: this.recommendNextSteps(coupleData, vendor),
      vendorSuggestions: await this.generateVendorSuggestions(coupleData, vendor)
    };
  }

  private generateWelcomeMessage(vendor: VendorInfo, coupleData: CoupleData): string {
    const vendorType = vendor.serviceType;
    const coupleNames = this.formatCoupleNames(coupleData);
    
    const messages = {
      photography: `Welcome ${coupleNames}! ${vendor.businessName} invited you to coordinate your wedding planning. Let's start by setting up your wedding timeline so your photographer can plan the perfect shots for your special day.`,
      venue: `Hi ${coupleNames}! ${vendor.businessName} wants to help coordinate your wedding planning. Let's gather your wedding details so we can work with your venue to create the perfect celebration.`,
      planning: `Welcome ${coupleNames}! Your wedding planner ${vendor.businessName} invited you to streamline your wedding coordination. Let's set up your wedding details so we can keep everything organized.`
    };
    
    return messages[vendorType] || `Welcome ${coupleNames}! ${vendor.businessName} invited you to coordinate your wedding planning together.`;
  }
}
```

## 🚀 ONBOARDING ANALYTICS AND OPTIMIZATION

### Progress Tracking System
```typescript
export class OnboardingAnalyticsTracker {
  async trackOnboardingMetrics(coupleId: string): Promise<OnboardingMetrics> {
    return {
      startTime: await this.getOnboardingStartTime(coupleId),
      currentStep: await this.getCurrentStep(coupleId),
      stepsCompleted: await this.getCompletedSteps(coupleId),
      timeSpentPerStep: await this.getTimePerStep(coupleId),
      dropOffPoints: await this.identifyDropOffPoints(coupleId),
      completionLikelihood: await this.predictCompletionProbability(coupleId)
    };
  }

  async identifyOptimizationOpportunities(): Promise<OptimizationInsights> {
    const analytics = await this.getAggregatedOnboardingAnalytics();
    
    return {
      highDropOffSteps: this.identifyProblematicSteps(analytics),
      averageCompletionTime: analytics.averageCompletionTime,
      mobileVsDesktopPerformance: analytics.deviceComparison,
      personalizationEffectiveness: analytics.personalizationImpact,
      vendorTypePerformance: analytics.vendorTypeAnalysis
    };
  }
}
```

## 🎯 ACCEPTANCE CRITERIA

### Backend Functionality
- [ ] Onboarding state saves automatically every 30 seconds
- [ ] All API endpoints respond within 500ms (95th percentile)
- [ ] Wedding data validation provides helpful suggestions, not just errors
- [ ] Vendor invitation system generates secure tokens with proper expiration
- [ ] Progress can be resumed seamlessly across different devices
- [ ] Personalization engine delivers relevant content based on context

### Data Integrity & Security
- [ ] All couple wedding data encrypted at rest and in transit
- [ ] Vendor invitation tokens expire appropriately (30 days default)
- [ ] Onboarding progress maintains consistency during concurrent access
- [ ] Wedding data validation prevents common input errors
- [ ] GDPR compliance verified for international couple data
- [ ] Audit trails capture all onboarding activities

### Integration & Performance
- [ ] Onboarding completion triggers proper couple platform setup
- [ ] Vendor connections establish correctly after invitation acceptance
- [ ] Wedding website initialization includes onboarding data
- [ ] Analytics tracking captures all relevant onboarding events
- [ ] System scales to handle peak onboarding loads during wedding season

## 📊 WEDDING INDUSTRY SPECIFIC FEATURES

### Wedding Timeline Intelligence
- Automatic timeline suggestions based on wedding date and venue type
- Seasonal considerations for outdoor vs indoor weddings
- Cultural wedding tradition integration for diverse couples
- Vendor booking timeline recommendations based on service type

### Vendor Ecosystem Integration
- Smart vendor suggestions based on already-connected vendors
- Vendor compatibility scoring for optimal wedding team assembly
- Referral tracking between vendors for commission management
- Vendor portfolio integration for couple inspiration during onboarding

### Wedding Planning Education
- Budget guidance based on guest count and location
- Vendor priority recommendations based on wedding size and style
- Timeline education about typical wedding planning phases
- Accessibility and dietary requirement guidance for inclusive weddings

**EXECUTE IMMEDIATELY - Build backend foundation that makes couple onboarding seamless, secure, and sets up perfect wedding planning coordination!**