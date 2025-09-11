# WS-118: Supplier Profile Creation - Technical Specification

## Feature Overview
**Feature ID:** WS-118  
**Feature Name:** Supplier Profile Creation  
**Team Assignment:** Team A (Frontend) + Team E (Full-stack)  
**Dependencies:** WS-002 (Client Profiles) patterns  
**Status:** Technical Specification Complete  
**Priority:** Medium (Directory Foundation)

## User Stories with Wedding Context

### 👔 Story 1: New Wedding Photographer Onboarding
**As a** new wedding photographer starting my business  
**I want to** create a professional directory profile with guided setup steps  
**So that** I can attract couples and compete with established photographers in my area  

**Wedding Context:** New photographers need professional-looking profiles quickly to start booking weddings. The profile creation must guide them through essential elements (portfolio, pricing, availability) without overwhelming them with complex features.

### 🏛️ Story 2: Historic Venue Owner Profile Setup
**As a** historic venue owner with limited technical experience  
**I want to** build my venue profile using simple drag-and-drop tools and step-by-step guidance  
**So that** wedding couples can discover my venue and understand what makes it special for their celebration  

**Wedding Context:** Venue owners are often less tech-savvy but have unique selling points (historic charm, stunning architecture, exclusive locations). The profile builder must help them showcase these visual and narrative elements effectively.

### 💐 Story 3: Multi-Service Wedding Business Profile
**As a** wedding business owner providing both floral design and event planning services  
**I want to** create a profile that clearly displays both service categories with separate portfolios and pricing  
**So that** couples can understand my full range of services and book multiple services together  

**Wedding Context:** Many wedding suppliers offer complementary services (planning + flowers, photography + videography, catering + coordination). Profiles must support multi-category listings without confusion.

### 🎵 Story 4: Mobile Profile Creation for Wedding DJ
**As a** wedding DJ who travels frequently for gigs  
**I want to** create and update my profile from my mobile device between events  
**So that** I can respond to inquiries and update availability in real-time during busy wedding season  

**Wedding Context:** Wedding vendors often work weekends and travel to events. Mobile profile creation enables them to manage their business during downtime at wedding venues or while traveling.

### ✅ Story 5: Professional Verification Integration
**As a** certified wedding planner with insurance and professional credentials  
**I want to** upload my certifications and insurance documents during profile creation  
**So that** couples can see my professional qualifications and feel confident booking my services  

**Wedding Context:** Wedding couples invest significant money and trust in suppliers. Professional verification (insurance, certifications, industry memberships) provides credibility and peace of mind.

### 📊 Story 6: Profile Performance Analytics Setup
**As a** wedding supplier completing my profile  
**I want to** understand which sections improve my profile visibility and booking rates  
**So that** I can optimize my profile to compete effectively during peak booking seasons  

**Wedding Context:** Wedding suppliers need data-driven insights about what attracts couples - certain photo styles, pricing transparency, response times, review quality. Profile analytics help optimize for booking success.

## Database Schema Design

```sql
-- Supplier profiles with wedding industry optimizations
CREATE TABLE supplier_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) UNIQUE,
    
    -- Basic business information
    business_name VARCHAR(200) NOT NULL,
    business_slug VARCHAR(200) UNIQUE NOT NULL,
    tagline VARCHAR(250), -- Short marketing message
    description TEXT NOT NULL, -- Full business description
    
    -- Location and service area
    primary_address JSONB NOT NULL, -- Full address with geocoding
    service_radius_km INTEGER DEFAULT 50,
    travel_fee_per_km DECIMAL(8,2), -- Additional travel charges
    service_locations TEXT[] DEFAULT '{}', -- Cities/regions served
    
    -- Contact information
    public_email VARCHAR(255),
    public_phone VARCHAR(20),
    website_url VARCHAR(500),
    booking_url VARCHAR(500), -- Direct booking link
    
    -- Wedding business specifics
    years_experience INTEGER DEFAULT 0,
    weddings_completed INTEGER DEFAULT 0,
    average_wedding_count_per_year INTEGER,
    team_size INTEGER DEFAULT 1,
    typical_wedding_size VARCHAR(30), -- 'intimate', 'medium', 'large', 'all_sizes'
    
    -- Pricing and availability
    starting_price_cents INTEGER,
    price_range_min_cents INTEGER,
    price_range_max_cents INTEGER,
    currency VARCHAR(3) DEFAULT 'USD',
    accepts_payment_plans BOOLEAN DEFAULT false,
    deposit_percentage DECIMAL(4,1), -- Typical deposit required
    
    -- Booking preferences
    lead_time_weeks INTEGER DEFAULT 8, -- Minimum booking lead time
    availability_calendar_url VARCHAR(500),
    accepts_last_minute_bookings BOOLEAN DEFAULT false,
    peak_season_months INTEGER[] DEFAULT '{}', -- Months of peak pricing
    
    -- Business verification
    business_license_verified BOOLEAN DEFAULT false,
    insurance_verified BOOLEAN DEFAULT false,
    background_check_completed BOOLEAN DEFAULT false,
    professional_certifications JSONB DEFAULT '[]',
    
    -- Profile media
    profile_image_url VARCHAR(500),
    cover_image_url VARCHAR(500),
    portfolio_images JSONB DEFAULT '[]', -- Array of image objects
    featured_work JSONB DEFAULT '[]', -- Highlighted portfolio pieces
    
    -- Social proof
    social_media_links JSONB DEFAULT '{}',
    press_mentions JSONB DEFAULT '[]',
    awards_certifications JSONB DEFAULT '[]',
    
    -- Profile quality and visibility
    profile_completion_score INTEGER DEFAULT 0, -- 0-100 score
    is_profile_public BOOLEAN DEFAULT false,
    featured_supplier BOOLEAN DEFAULT false,
    premium_listing BOOLEAN DEFAULT false,
    
    -- SEO optimization
    meta_description TEXT,
    seo_keywords VARCHAR(500),
    alt_tags JSONB DEFAULT '{}', -- Alt tags for images
    
    -- Analytics tracking
    profile_views INTEGER DEFAULT 0,
    contact_clicks INTEGER DEFAULT 0,
    booking_inquiries INTEGER DEFAULT 0,
    conversion_rate DECIMAL(4,3) DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile creation progress tracking
CREATE TABLE profile_creation_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_profile_id UUID NOT NULL REFERENCES supplier_profiles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    
    -- Step completion tracking
    basic_info_completed BOOLEAN DEFAULT false,
    service_details_completed BOOLEAN DEFAULT false,
    portfolio_uploaded BOOLEAN DEFAULT false,
    business_verification_completed BOOLEAN DEFAULT false,
    
    -- Step completion timestamps
    basic_info_completed_at TIMESTAMPTZ,
    service_details_completed_at TIMESTAMPTZ,
    portfolio_uploaded_at TIMESTAMPTZ,
    business_verification_completed_at TIMESTAMPTZ,
    
    -- Overall progress
    total_completion_percentage INTEGER DEFAULT 0,
    is_profile_publishable BOOLEAN DEFAULT false,
    published_to_directory BOOLEAN DEFAULT false,
    
    -- User journey tracking
    session_count INTEGER DEFAULT 1,
    total_time_spent_seconds INTEGER DEFAULT 0,
    abandonment_stage VARCHAR(50), -- Where users typically drop off
    last_active_step VARCHAR(50),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Service offerings detail
CREATE TABLE supplier_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_profile_id UUID NOT NULL REFERENCES supplier_profiles(id) ON DELETE CASCADE,
    
    -- Service details
    service_name VARCHAR(150) NOT NULL,
    service_description TEXT NOT NULL,
    service_category VARCHAR(100) NOT NULL, -- 'photography', 'planning', etc.
    service_subcategory VARCHAR(100), -- 'engagement', 'reception', etc.
    
    -- Pricing
    base_price_cents INTEGER,
    price_type VARCHAR(20) DEFAULT 'starting_at', -- 'starting_at', 'flat_rate', 'hourly', 'per_guest'
    price_unit VARCHAR(30), -- 'per_event', 'per_hour', 'per_guest'
    includes_in_base_price TEXT[], -- What's included in base price
    additional_fees JSONB DEFAULT '[]', -- Extra costs and fees
    
    -- Service specifics
    duration_hours INTEGER, -- Typical service duration
    preparation_time_hours INTEGER, -- Setup/prep time needed
    travel_included_km INTEGER DEFAULT 0, -- Included travel distance
    
    -- Availability
    available_days_of_week INTEGER[] DEFAULT '{1,2,3,4,5,6,7}', -- 1=Monday, 7=Sunday
    seasonal_availability JSONB DEFAULT '{}',
    advance_booking_required_weeks INTEGER DEFAULT 8,
    
    -- Wedding context
    suitable_wedding_styles TEXT[] DEFAULT '{}', -- Styles this service works well with
    wedding_size_suitability VARCHAR(50) DEFAULT 'all', -- 'intimate', 'large', 'all'
    popular_wedding_venues TEXT[] DEFAULT '{}', -- Venues often worked at
    
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio image management
CREATE TABLE supplier_portfolio_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_profile_id UUID NOT NULL REFERENCES supplier_profiles(id) ON DELETE CASCADE,
    
    -- Image file information
    original_filename VARCHAR(255) NOT NULL,
    file_size_bytes INTEGER NOT NULL,
    mime_type VARCHAR(50) NOT NULL,
    
    -- Processed image URLs
    thumbnail_url VARCHAR(500), -- 300x200
    medium_url VARCHAR(500),    -- 800x600
    large_url VARCHAR(500),     -- 1200x800
    original_url VARCHAR(500),  -- Full resolution
    
    -- WebP optimized versions
    thumbnail_webp_url VARCHAR(500),
    medium_webp_url VARCHAR(500),
    large_webp_url VARCHAR(500),
    
    -- Image metadata
    image_title VARCHAR(200),
    image_description TEXT,
    alt_text VARCHAR(250), -- SEO alt text
    
    -- Wedding context
    wedding_style_tags TEXT[] DEFAULT '{}', -- 'rustic', 'luxury', 'bohemian'
    venue_type VARCHAR(100), -- Where this image was taken
    season_taken VARCHAR(20), -- 'spring', 'summer', 'fall', 'winter'
    wedding_size VARCHAR(30), -- 'intimate', 'medium', 'large'
    
    -- Image organization
    is_featured BOOLEAN DEFAULT false,
    is_portfolio_cover BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    gallery_category VARCHAR(100), -- 'ceremony', 'reception', 'portraits'
    
    -- Performance tracking
    view_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    inquiry_attribution INTEGER DEFAULT 0, -- Inquiries attributed to this image
    
    -- SEO and discoverability
    seo_filename VARCHAR(255), -- SEO-optimized filename
    image_colors JSONB, -- Dominant colors for style matching
    is_public BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profile draft auto-save
CREATE TABLE supplier_profile_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_profiles(id),
    supplier_profile_id UUID REFERENCES supplier_profiles(id),
    
    -- Draft data
    draft_data JSONB NOT NULL,
    step_name VARCHAR(50) NOT NULL,
    
    -- Auto-save metadata
    auto_saved_at TIMESTAMPTZ DEFAULT NOW(),
    manual_save BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_supplier_profiles_slug ON supplier_profiles(business_slug);
CREATE INDEX idx_supplier_profiles_location ON supplier_profiles 
    USING GIST (((primary_address->>'coordinates')::point)) 
    WHERE is_profile_public = true;
CREATE INDEX idx_supplier_profiles_completion ON supplier_profiles(profile_completion_score DESC)
    WHERE is_profile_public = true;
CREATE INDEX idx_supplier_services_category ON supplier_services(service_category, supplier_profile_id);
CREATE INDEX idx_portfolio_images_featured ON supplier_portfolio_images(supplier_profile_id, is_featured);
CREATE INDEX idx_portfolio_images_display ON supplier_portfolio_images(supplier_profile_id, display_order);

-- Row Level Security
ALTER TABLE supplier_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own supplier profile" ON supplier_profiles
    FOR ALL USING (user_id = auth.uid());

ALTER TABLE profile_creation_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile progress" ON profile_creation_progress
    FOR ALL USING (user_id = auth.uid());

ALTER TABLE supplier_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage services for their profiles" ON supplier_services
    FOR ALL USING (supplier_profile_id IN (
        SELECT id FROM supplier_profiles WHERE user_id = auth.uid()
    ));
```

## API Endpoints

### POST /api/suppliers/profiles/create
```typescript
interface CreateSupplierProfileRequest {
  businessName: string;
  businessType: 'sole_proprietorship' | 'llc' | 'corporation';
  primaryCategory: string; // Category ID from wedding_supplier_categories
  location: {
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude?: number;
    longitude?: number;
  };
  contactInfo: {
    email: string;
    phone: string;
    website?: string;
  };
  serviceRadius: number; // kilometers
}

interface CreateSupplierProfileResponse {
  profileId: string;
  businessSlug: string;
  nextStep: 'service_details' | 'portfolio_upload' | 'business_verification';
  completionPercentage: number;
  estimatedTimeToComplete: string; // "15-20 minutes"
  draftSaved: boolean;
}
```

### PATCH /api/suppliers/profiles/{profileId}
```typescript
interface UpdateSupplierProfileRequest {
  step: 'basic_info' | 'service_details' | 'portfolio' | 'business_verification';
  data: {
    // Basic info step
    businessName?: string;
    tagline?: string;
    description?: string;
    
    // Service details step
    services?: Array<{
      name: string;
      description: string;
      category: string;
      basePriceCents: number;
      priceType: 'starting_at' | 'flat_rate' | 'hourly';
      includes: string[];
    }>;
    yearsExperience?: number;
    weddingsCompleted?: number;
    teamSize?: number;
    
    // Portfolio step
    portfolioImages?: Array<{
      file: File;
      title: string;
      description: string;
      weddingStyleTags: string[];
      venueType: string;
      isFeatured: boolean;
    }>;
    
    // Business verification step
    businessLicense?: File;
    insuranceCertificate?: File;
    professionalCertifications?: Array<{
      name: string;
      issuingOrganization: string;
      certificateFile: File;
      expirationDate: string;
    }>;
    socialMediaLinks?: {
      instagram?: string;
      facebook?: string;
      website?: string;
    };
  };
  isDraft?: boolean; // Auto-save vs intentional save
}

interface UpdateSupplierProfileResponse {
  success: boolean;
  profileId: string;
  stepCompleted: boolean;
  completionPercentage: number;
  nextStep?: string;
  validationErrors?: Array<{
    field: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  
  // Image processing results
  processedImages?: Array<{
    originalFilename: string;
    imageId: string;
    thumbnailUrl: string;
    mediumUrl: string;
    largeUrl: string;
    altTextGenerated: string;
    seoFilename: string;
  }>;
  
  // Profile quality feedback
  qualityScore: {
    overall: number; // 0-100
    breakdown: {
      basicInfo: number;
      serviceDetails: number;
      portfolio: number;
      businessVerification: number;
    };
    recommendations: Array<{
      area: string;
      suggestion: string;
      impact: 'high' | 'medium' | 'low';
    }>;
  };
}
```

### POST /api/suppliers/profiles/{profileId}/publish
```typescript
interface PublishProfileRequest {
  confirmRequirements: boolean; // User confirms they meet publication requirements
  agreeToTerms: boolean;
  subscriptionTier: 'basic' | 'premium' | 'featured';
}

interface PublishProfileResponse {
  success: boolean;
  profileUrl: string;
  publicationStatus: 'published' | 'pending_review' | 'requires_verification';
  
  // SEO optimization results
  seoAnalysis: {
    metaTitle: string;
    metaDescription: string;
    keywords: string[];
    imageAltTags: number;
    seoScore: number; // 0-100
  };
  
  // Visibility settings
  visibility: {
    searchEngineIndexed: boolean;
    directoryListed: boolean;
    featuredListing: boolean;
  };
  
  // Next steps for supplier
  nextSteps: Array<{
    action: string;
    description: string;
    deadline?: string;
    required: boolean;
  }>;
}
```

### GET /api/suppliers/profiles/{profileId}/analytics
```typescript
interface ProfileAnalyticsResponse {
  profileId: string;
  timeframe: 'last_30_days' | 'last_90_days' | 'all_time';
  
  // Core metrics
  metrics: {
    totalViews: number;
    uniqueVisitors: number;
    contactClicks: number;
    bookingInquiries: number;
    conversionRate: number; // Views to inquiries
    avgTimeOnProfile: number; // seconds
  };
  
  // Performance trends
  trends: {
    viewsOverTime: Array<{ date: string; views: number }>;
    inquiriesOverTime: Array<{ date: string; inquiries: number }>;
    topTrafficSources: Array<{ source: string; visits: number }>;
    popularImages: Array<{ imageId: string; views: number; inquiries: number }>;
  };
  
  // Competitive insights
  benchmarks: {
    categoryAverageViews: number;
    categoryAverageConversion: number;
    yourRankInCategory: number;
    totalCompetitors: number;
  };
  
  // Improvement recommendations
  recommendations: Array<{
    area: 'portfolio' | 'pricing' | 'description' | 'response_time';
    suggestion: string;
    potentialImpact: string;
    difficulty: 'easy' | 'medium' | 'hard';
  }>;
}
```

## Frontend Components

### SupplierProfileCreationWizard Component
```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, MapPin, Phone, Globe, Camera, Award, CheckCircle, 
  AlertTriangle, Save, Eye, Upload, Star, TrendingUp 
} from 'lucide-react';

interface SupplierProfileCreationWizardProps {
  existingProfileId?: string;
  onComplete: (profileId: string, profileUrl: string) => void;
}

type CreationStep = 'basic_info' | 'service_details' | 'portfolio' | 'business_verification' | 'review_publish';

export function SupplierProfileCreationWizard({ 
  existingProfileId, 
  onComplete 
}: SupplierProfileCreationWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<CreationStep>('basic_info');
  const [profileId, setProfileId] = useState<string>(existingProfileId || '');
  const [completionScore, setCompletionScore] = useState(0);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');

  // Form data state
  const [formData, setFormData] = useState({
    // Basic info
    businessName: '',
    tagline: '',
    description: '',
    primaryCategory: '',
    location: {
      address: '',
      city: '',
      state: '',
      country: 'US',
      postalCode: '',
      latitude: 0,
      longitude: 0
    },
    contactInfo: {
      email: '',
      phone: '',
      website: ''
    },
    serviceRadius: 50,
    
    // Service details
    services: [],
    yearsExperience: 0,
    weddingsCompleted: 0,
    teamSize: 1,
    priceRanges: {
      minCents: 0,
      maxCents: 0
    },
    
    // Portfolio
    portfolioImages: [],
    
    // Business verification
    businessLicense: null,
    insuranceCertificate: null,
    certifications: [],
    socialMediaLinks: {
      instagram: '',
      facebook: '',
      website: ''
    }
  });

  // Auto-save functionality
  const autoSaveMutation = useMutation({
    mutationFn: async (data: any) => {
      setAutoSaveStatus('saving');
      const response = await fetch(`/api/suppliers/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: currentStep,
          data,
          isDraft: true
        })
      });
      
      if (!response.ok) throw new Error('Auto-save failed');
      return response.json();
    },
    onSuccess: () => {
      setAutoSaveStatus('saved');
      setTimeout(() => setAutoSaveStatus('saved'), 2000);
    },
    onError: () => {
      setAutoSaveStatus('error');
    }
  });

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!profileId) return;
    
    const interval = setInterval(() => {
      autoSaveMutation.mutate(formData);
    }, 30000);

    return () => clearInterval(interval);
  }, [formData, profileId, currentStep]);

  // Create initial profile
  const createProfileMutation = useMutation({
    mutationFn: async (initialData: any) => {
      const response = await fetch('/api/suppliers/profiles/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(initialData)
      });
      
      if (!response.ok) throw new Error('Failed to create profile');
      return response.json();
    },
    onSuccess: (data) => {
      setProfileId(data.profileId);
      setCompletionScore(data.completionPercentage);
    }
  });

  // Update profile step
  const updateStepMutation = useMutation({
    mutationFn: async ({ step, data }: { step: CreationStep; data: any }) => {
      const response = await fetch(`/api/suppliers/profiles/${profileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step,
          data,
          isDraft: false
        })
      });
      
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: (data) => {
      setCompletionScore(data.completionPercentage);
      if (data.nextStep) {
        setCurrentStep(data.nextStep);
      }
    }
  });

  // Publish profile
  const publishMutation = useMutation({
    mutationFn: async (publishData: any) => {
      const response = await fetch(`/api/suppliers/profiles/${profileId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishData)
      });
      
      if (!response.ok) throw new Error('Failed to publish profile');
      return response.json();
    },
    onSuccess: (data) => {
      onComplete(profileId, data.profileUrl);
    }
  });

  const handleStepComplete = (stepData: any) => {
    updateStepMutation.mutate({
      step: currentStep,
      data: stepData
    });
  };

  const handlePublish = () => {
    publishMutation.mutate({
      confirmRequirements: true,
      agreeToTerms: true,
      subscriptionTier: 'basic'
    });
  };

  const getStepProgress = () => {
    const steps = ['basic_info', 'service_details', 'portfolio', 'business_verification', 'review_publish'];
    const currentIndex = steps.indexOf(currentStep);
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'basic_info':
        return <BasicInfoStep formData={formData} onUpdate={setFormData} onComplete={handleStepComplete} />;
      case 'service_details':
        return <ServiceDetailsStep formData={formData} onUpdate={setFormData} onComplete={handleStepComplete} />;
      case 'portfolio':
        return <PortfolioStep formData={formData} onUpdate={setFormData} onComplete={handleStepComplete} />;
      case 'business_verification':
        return <BusinessVerificationStep formData={formData} onUpdate={setFormData} onComplete={handleStepComplete} />;
      case 'review_publish':
        return <ReviewPublishStep formData={formData} completionScore={completionScore} onPublish={handlePublish} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Your Supplier Profile</h1>
        <p className="text-gray-600">
          Build a professional profile that attracts couples and grows your wedding business
        </p>
        
        {/* Progress */}
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Profile Completion</span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{completionScore}% complete</span>
              <div className="flex items-center gap-1 text-xs">
                {autoSaveStatus === 'saving' && <Save className="h-3 w-3 animate-spin" />}
                {autoSaveStatus === 'saved' && <CheckCircle className="h-3 w-3 text-green-500" />}
                {autoSaveStatus === 'error' && <AlertTriangle className="h-3 w-3 text-red-500" />}
                <span className={`${
                  autoSaveStatus === 'saved' ? 'text-green-600' : 
                  autoSaveStatus === 'error' ? 'text-red-600' : 
                  'text-gray-500'
                }`}>
                  {autoSaveStatus === 'saving' ? 'Saving...' : 
                   autoSaveStatus === 'saved' ? 'Saved' : 
                   'Save failed'}
                </span>
              </div>
            </div>
          </div>
          <Progress value={completionScore} className="h-2" />
        </div>
      </div>

      {/* Step Navigation */}
      <div className="mb-8">
        <Tabs value={currentStep} onValueChange={(value) => setCurrentStep(value as CreationStep)}>
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="basic_info" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Basic Info</span>
            </TabsTrigger>
            <TabsTrigger value="service_details" className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Services</span>
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              <span className="hidden sm:inline">Portfolio</span>
            </TabsTrigger>
            <TabsTrigger value="business_verification" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              <span className="hidden sm:inline">Verification</span>
            </TabsTrigger>
            <TabsTrigger value="review_publish" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Review</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Help and Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Profile Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-1">High-Quality Photos</h4>
              <p className="text-gray-600">Upload at least 5 professional photos showcasing your best work</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Detailed Descriptions</h4>
              <p className="text-gray-600">Write compelling descriptions that highlight your unique style and approach</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Transparent Pricing</h4>
              <p className="text-gray-600">Clear pricing helps couples understand your services and increases bookings</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Step Components (condensed for brevity)
function BasicInfoStep({ formData, onUpdate, onComplete }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Information</CardTitle>
        <p className="text-gray-600">Tell us about your wedding business</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Business Name *</label>
          <Input 
            value={formData.businessName}
            onChange={(e) => onUpdate({ ...formData, businessName: e.target.value })}
            placeholder="Your Wedding Business Name"
            className="text-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Tagline</label>
          <Input 
            value={formData.tagline}
            onChange={(e) => onUpdate({ ...formData, tagline: e.target.value })}
            placeholder="e.g., 'Capturing love stories through timeless photography'"
            maxLength={250}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Business Description *</label>
          <Textarea 
            value={formData.description}
            onChange={(e) => onUpdate({ ...formData, description: e.target.value })}
            placeholder="Describe your services, style, and what makes you unique..."
            className="min-h-32"
            minLength={100}
            maxLength={2000}
          />
          <div className="text-xs text-gray-500 mt-1">
            {formData.description.length}/2000 characters (minimum 100)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Primary Service Category *</label>
            {/* Category selection component would go here */}
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Service Radius (km) *</label>
            <Input 
              type="number"
              value={formData.serviceRadius}
              onChange={(e) => onUpdate({ ...formData, serviceRadius: parseInt(e.target.value) })}
              min="10"
              max="500"
            />
          </div>
        </div>

        <Button onClick={() => onComplete(formData)} className="w-full">
          Continue to Services
        </Button>
      </CardContent>
    </Card>
  );
}

// Additional step components would be implemented similarly...

export default SupplierProfileCreationWizard;
```

## Integration Services

### Profile Creation Service
```typescript
// lib/services/supplier-profile-service.ts
import { createClient } from '@/lib/supabase/client';

interface ProfileCreationData {
  businessName: string;
  businessType: string;
  primaryCategory: string;
  location: any;
  contactInfo: any;
  serviceRadius: number;
}

class SupplierProfileService {
  private supabase = createClient();

  async createProfile(userId: string, data: ProfileCreationData) {
    // Validate business name uniqueness in location
    await this.validateBusinessName(data.businessName, data.location);

    // Generate SEO-friendly slug
    const businessSlug = await this.generateUniqueSlug(data.businessName);

    // Create profile record
    const { data: profile, error } = await this.supabase
      .from('supplier_profiles')
      .insert([{
        user_id: userId,
        business_name: data.businessName,
        business_slug: businessSlug,
        primary_address: data.location,
        service_radius_km: data.serviceRadius,
        public_email: data.contactInfo.email,
        public_phone: data.contactInfo.phone,
        website_url: data.contactInfo.website,
        profile_completion_score: 20, // Initial score for basic info
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create profile: ${error.message}`);
    }

    // Initialize progress tracking
    await this.supabase
      .from('profile_creation_progress')
      .insert([{
        supplier_profile_id: profile.id,
        user_id: userId,
        basic_info_completed: true,
        basic_info_completed_at: new Date().toISOString(),
        total_completion_percentage: 20
      }]);

    return {
      profileId: profile.id,
      businessSlug: profile.business_slug,
      nextStep: 'service_details',
      completionPercentage: 20,
      estimatedTimeToComplete: '15-20 minutes',
      draftSaved: true
    };
  }

  async updateProfile(profileId: string, step: string, data: any, isDraft = false) {
    const updateData: any = {};
    let completionBonus = 0;

    switch (step) {
      case 'service_details':
        updateData.description = data.description;
        updateData.years_experience = data.yearsExperience;
        updateData.weddings_completed = data.weddingsCompleted;
        updateData.team_size = data.teamSize;
        updateData.starting_price_cents = data.priceRanges?.minCents;
        updateData.price_range_max_cents = data.priceRanges?.maxCents;
        completionBonus = 25;
        
        // Update services
        if (data.services) {
          await this.updateSupplierServices(profileId, data.services);
        }
        break;

      case 'portfolio':
        if (data.portfolioImages) {
          await this.processPortfolioImages(profileId, data.portfolioImages);
          completionBonus = 25;
        }
        break;

      case 'business_verification':
        updateData.business_license_verified = !!data.businessLicense;
        updateData.insurance_verified = !!data.insuranceCertificate;
        updateData.professional_certifications = data.certifications || [];
        updateData.social_media_links = data.socialMediaLinks || {};
        completionBonus = 20;
        break;
    }

    // Update profile
    if (Object.keys(updateData).length > 0) {
      updateData.profile_completion_score = this.supabase.rpc('increment', {
        x: completionBonus
      });
      updateData.updated_at = new Date().toISOString();

      const { error } = await this.supabase
        .from('supplier_profiles')
        .update(updateData)
        .eq('id', profileId);

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }
    }

    // Update progress tracking
    if (!isDraft) {
      await this.updateProgressTracking(profileId, step);
    }

    // Get updated completion score
    const { data: profile } = await this.supabase
      .from('supplier_profiles')
      .select('profile_completion_score')
      .eq('id', profileId)
      .single();

    return {
      success: true,
      profileId,
      stepCompleted: !isDraft,
      completionPercentage: profile?.profile_completion_score || 0,
      nextStep: this.getNextStep(step),
      qualityScore: await this.calculateQualityScore(profileId)
    };
  }

  async processPortfolioImages(profileId: string, images: any[]) {
    const processedImages = [];

    for (const image of images) {
      // Process image through image optimization service
      const processed = await this.optimizeImage(image.file);
      
      // Generate SEO alt text
      const altText = await this.generateImageAltText(image.title, image.description);
      
      // Save to database
      const { data: imageRecord } = await this.supabase
        .from('supplier_portfolio_images')
        .insert([{
          supplier_profile_id: profileId,
          original_filename: image.file.name,
          file_size_bytes: image.file.size,
          mime_type: image.file.type,
          thumbnail_url: processed.thumbnailUrl,
          medium_url: processed.mediumUrl,
          large_url: processed.largeUrl,
          original_url: processed.originalUrl,
          image_title: image.title,
          image_description: image.description,
          alt_text: altText,
          wedding_style_tags: image.weddingStyleTags || [],
          venue_type: image.venueType,
          is_featured: image.isFeatured || false,
          seo_filename: this.generateSEOFilename(image.file.name)
        }])
        .select()
        .single();

      processedImages.push(imageRecord);
    }

    return processedImages;
  }

  private async validateBusinessName(businessName: string, location: any) {
    const { data: existing } = await this.supabase
      .from('supplier_profiles')
      .select('id')
      .ilike('business_name', businessName)
      .contains('primary_address', { city: location.city, state: location.state });

    if (existing && existing.length > 0) {
      throw new Error('A business with this name already exists in your area');
    }
  }

  private async generateUniqueSlug(businessName: string): Promise<string> {
    const baseSlug = businessName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();

    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const { data: existing } = await this.supabase
        .from('supplier_profiles')
        .select('id')
        .eq('business_slug', slug)
        .single();

      if (!existing) break;

      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async optimizeImage(file: File) {
    // This would integrate with image processing service (e.g., Sharp, Cloudinary)
    // For now, returning placeholder URLs
    return {
      thumbnailUrl: '/api/images/placeholder-thumb.jpg',
      mediumUrl: '/api/images/placeholder-medium.jpg',
      largeUrl: '/api/images/placeholder-large.jpg',
      originalUrl: '/api/images/placeholder-original.jpg'
    };
  }

  private async generateImageAltText(title: string, description: string): Promise<string> {
    // AI-powered alt text generation based on image content and context
    // For wedding images, include relevant keywords
    const keywords = ['wedding', 'bride', 'groom', 'ceremony', 'reception'];
    return `${title} - ${description}`.substring(0, 125);
  }

  private generateSEOFilename(originalName: string): string {
    const name = originalName.toLowerCase()
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .trim();
    
    return `wedding-${name}-${Date.now()}`;
  }

  private async updateSupplierServices(profileId: string, services: any[]) {
    // Clear existing services
    await this.supabase
      .from('supplier_services')
      .delete()
      .eq('supplier_profile_id', profileId);

    // Insert new services
    const serviceData = services.map((service, index) => ({
      supplier_profile_id: profileId,
      service_name: service.name,
      service_description: service.description,
      service_category: service.category,
      base_price_cents: service.basePriceCents,
      price_type: service.priceType,
      includes_in_base_price: service.includes || [],
      display_order: index,
      created_at: new Date().toISOString()
    }));

    const { error } = await this.supabase
      .from('supplier_services')
      .insert(serviceData);

    if (error) {
      throw new Error(`Failed to update services: ${error.message}`);
    }
  }

  private async updateProgressTracking(profileId: string, step: string) {
    const updateData: any = {
      [`${step}_completed`]: true,
      [`${step}_completed_at`]: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await this.supabase
      .from('profile_creation_progress')
      .update(updateData)
      .eq('supplier_profile_id', profileId);
  }

  private getNextStep(currentStep: string): string | undefined {
    const stepOrder = ['basic_info', 'service_details', 'portfolio', 'business_verification', 'review_publish'];
    const currentIndex = stepOrder.indexOf(currentStep);
    return stepOrder[currentIndex + 1];
  }

  private async calculateQualityScore(profileId: string) {
    // Calculate profile quality score based on completeness and content quality
    const { data: profile } = await this.supabase
      .from('supplier_profiles')
      .select(`
        *,
        services:supplier_services(count),
        images:supplier_portfolio_images(count)
      `)
      .eq('id', profileId)
      .single();

    const scores = {
      basicInfo: this.scoreBasicInfo(profile),
      serviceDetails: this.scoreServiceDetails(profile),
      portfolio: this.scorePortfolio(profile),
      businessVerification: this.scoreVerification(profile)
    };

    const overall = Math.round(
      scores.basicInfo * 0.3 +
      scores.serviceDetails * 0.25 +
      scores.portfolio * 0.25 +
      scores.businessVerification * 0.2
    );

    return {
      overall,
      breakdown: scores,
      recommendations: this.generateQualityRecommendations(profile, scores)
    };
  }

  private scoreBasicInfo(profile: any): number {
    let score = 0;
    if (profile.business_name) score += 25;
    if (profile.description && profile.description.length >= 100) score += 25;
    if (profile.tagline) score += 25;
    if (profile.primary_address) score += 25;
    return Math.min(score, 100);
  }

  private scoreServiceDetails(profile: any): number {
    let score = 0;
    if (profile.years_experience > 0) score += 20;
    if (profile.weddings_completed > 0) score += 20;
    if (profile.starting_price_cents > 0) score += 30;
    if (profile.services && profile.services.length > 0) score += 30;
    return Math.min(score, 100);
  }

  private scorePortfolio(profile: any): number {
    const imageCount = profile.images?.[0]?.count || 0;
    if (imageCount >= 10) return 100;
    if (imageCount >= 5) return 80;
    if (imageCount >= 3) return 60;
    if (imageCount >= 1) return 40;
    return 0;
  }

  private scoreVerification(profile: any): number {
    let score = 0;
    if (profile.business_license_verified) score += 30;
    if (profile.insurance_verified) score += 40;
    if (profile.professional_certifications?.length > 0) score += 30;
    return Math.min(score, 100);
  }

  private generateQualityRecommendations(profile: any, scores: any) {
    const recommendations = [];

    if (scores.portfolio < 80) {
      recommendations.push({
        area: 'portfolio',
        suggestion: 'Add more high-quality images to showcase your work',
        impact: 'high'
      });
    }

    if (scores.serviceDetails < 80) {
      recommendations.push({
        area: 'pricing',
        suggestion: 'Add clear pricing information to attract more inquiries',
        impact: 'high'
      });
    }

    if (!profile.description || profile.description.length < 200) {
      recommendations.push({
        area: 'description',
        suggestion: 'Write a more detailed business description (200+ characters)',
        impact: 'medium'
      });
    }

    return recommendations;
  }
}

export const supplierProfileService = new SupplierProfileService();
```

## Testing Requirements

### Unit Tests
```typescript
// __tests__/supplier-profile-service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { supplierProfileService } from '@/lib/services/supplier-profile-service';

describe('SupplierProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create a new supplier profile', async () => {
    const profileData = {
      businessName: 'Test Wedding Photography',
      businessType: 'sole_proprietorship',
      primaryCategory: 'photography',
      location: {
        address: '123 Main St',
        city: 'Test City',
        state: 'TS',
        country: 'US'
      },
      contactInfo: {
        email: 'test@example.com',
        phone: '555-0123'
      },
      serviceRadius: 50
    };

    const result = await supplierProfileService.createProfile('user-1', profileData);

    expect(result).toHaveProperty('profileId');
    expect(result).toHaveProperty('businessSlug');
    expect(result.nextStep).toBe('service_details');
    expect(result.completionPercentage).toBeGreaterThan(0);
  });

  it('should validate unique business names within location', async () => {
    const duplicateData = {
      businessName: 'Existing Business',
      location: { city: 'Test City', state: 'TS' }
    };

    await expect(
      supplierProfileService.createProfile('user-2', duplicateData as any)
    ).rejects.toThrow('already exists in your area');
  });

  it('should calculate profile quality scores correctly', async () => {
    const qualityScore = await supplierProfileService['calculateQualityScore']('profile-1');

    expect(qualityScore).toHaveProperty('overall');
    expect(qualityScore).toHaveProperty('breakdown');
    expect(qualityScore).toHaveProperty('recommendations');
    expect(qualityScore.overall).toBeGreaterThanOrEqual(0);
    expect(qualityScore.overall).toBeLessThanOrEqual(100);
  });
});
```

## Acceptance Criteria

### ✅ Multi-Step Creation Wizard
- [ ] Four-step guided setup process (Basic Info, Services, Portfolio, Verification)
- [ ] Progress tracking with completion percentage
- [ ] Step-by-step validation with clear error messages
- [ ] Auto-save functionality every 30 seconds
- [ ] Mobile-responsive design for on-the-go creation

### ✅ Profile Content Management
- [ ] Business information with location and service radius
- [ ] Service catalog with pricing and descriptions
- [ ] Portfolio image upload with automatic optimization
- [ ] Business verification document upload
- [ ] Social media integration

### ✅ Image Processing & SEO
- [ ] Automatic image resizing (thumbnail, medium, large)
- [ ] WebP format generation for performance
- [ ] AI-generated alt text for accessibility
- [ ] SEO-optimized filenames
- [ ] Bulk upload with progress tracking

### ✅ Profile Quality Scoring
- [ ] 100-point completion scoring system
- [ ] Quality recommendations for improvement
- [ ] Publication threshold (80+ points required)
- [ ] Category-specific best practices guidance
- [ ] Competitive analysis and benchmarking

### ✅ Business Validation
- [ ] Unique business name validation per location
- [ ] Address verification with geocoding
- [ ] Professional certification upload and tracking
- [ ] Insurance verification workflow
- [ ] Terms of service acceptance

**MCP Integration Requirements:**
- [ ] PostgreSQL MCP handles complex profile data relationships
- [ ] Image processing optimization through database functions
- [ ] Profile quality scoring via stored procedures
- [ ] Draft auto-save functionality with conflict resolution
- [ ] SEO optimization calculations for search visibility

---

**Estimated Development Time:** 3-4 weeks  
**Team Requirement:** Frontend + Full-stack team with image processing experience  
**External Dependencies:** Image optimization service (Sharp/Cloudinary), geocoding API  
**Success Metrics:** Profile completion rate, time-to-publish, profile quality scores, supplier onboarding conversion