# WS-282 Dashboard Tour System - Team B Backend Development

## Mission Statement
Design and implement a comprehensive backend system for an interactive dashboard tour experience that guides newly engaged couples through the WedSync platform, providing seamless progress tracking, configuration management, and analytics to support their wedding planning journey.

## Wedding Context: The Overwhelmed Couple Journey
"Emma and James just got engaged and are excited but completely overwhelmed. They've heard horror stories about wedding planning being stressful and expensive. When they first log into WedSync, they see dozens of features but don't know where to start. Our interactive tour needs to feel like having a knowledgeable wedding planner sitting beside them, gently guiding them through each step while tracking their progress and adapting to their specific needs."

## Core Responsibilities (Backend/API Focus)
- Database schema design for tour progress tracking and analytics
- RESTful API endpoints for tour management and user progress
- Real-time synchronization with Supabase for multi-device experiences
- Tour configuration management and A/B testing infrastructure
- Performance optimization for fast tour loading and smooth transitions
- Analytics backend for measuring tour effectiveness and user engagement

## Sequential Thinking Integration
Before starting implementation, use the Sequential Thinking MCP to analyze:
1. Database relationships between users, tours, steps, and progress tracking
2. API endpoint design for optimal performance during tour interactions
3. Real-time synchronization requirements for seamless multi-device experiences
4. Analytics data collection strategies without impacting tour performance
5. A/B testing infrastructure for optimizing tour effectiveness

Example Sequential Thinking prompt:
```
"I need to design a comprehensive backend system for dashboard tours. Key considerations: 1) Database schema supporting multiple tour types with progress tracking, 2) API endpoints for real-time updates, 3) Analytics collection without performance impact, 4) A/B testing for tour optimization, 5) Multi-device synchronization. Let me analyze the optimal architecture..."
```

## Evidence of Reality Requirements
**CRITICAL**: Your implementation must include these NON-NEGOTIABLE file outputs:

### 1. Database Migration Files (Required)
- `supabase/migrations/[timestamp]_dashboard_tours_schema.sql`
- Complete schema with all tables, relationships, RLS policies, and indexes

### 2. API Route Implementations (Required)
- `src/app/api/tours/[id]/route.ts` - Individual tour management
- `src/app/api/tours/progress/route.ts` - Progress tracking
- `src/app/api/tours/analytics/route.ts` - Analytics collection
- `src/app/api/tours/config/route.ts` - Tour configuration management

### 3. Database Service Layer (Required)
- `src/lib/services/tour-service.ts` - Core tour business logic
- `src/lib/services/tour-analytics.ts` - Analytics and tracking
- `src/lib/services/tour-config.ts` - Configuration management

### 4. TypeScript Types (Required)
- `src/types/tours.ts` - Comprehensive type definitions
- All types must be exported and used consistently

### 5. Integration Tests (Required)
- `src/__tests__/api/tours.test.ts` - API endpoint testing
- `src/__tests__/services/tour-service.test.ts` - Service layer testing
- Minimum 85% code coverage for all tour-related endpoints

**Verification Command**: After implementation, run this exact command to verify your work:
```bash
find . -name "*tour*" -type f \( -name "*.ts" -o -name "*.sql" \) | grep -E "(api|lib|types|__tests__|migrations)" | sort
```

## Technical Requirements

### Database Schema Design

#### Core Tables Structure
```sql
-- Tour Definitions
CREATE TABLE tour_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  tour_type tour_type_enum NOT NULL DEFAULT 'onboarding',
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
  target_audience audience_enum[] DEFAULT ARRAY['couples'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Wedding-specific metadata
  wedding_phase phase_enum DEFAULT 'engagement',
  estimated_duration_minutes INTEGER DEFAULT 15,
  prerequisite_tours UUID[] DEFAULT ARRAY[]::UUID[]
);

-- Tour Steps Configuration
CREATE TABLE tour_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tour_definitions(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_key VARCHAR(100) NOT NULL, -- 'welcome', 'timeline_setup', etc.
  title VARCHAR(200) NOT NULL,
  description TEXT,
  target_element VARCHAR(200), -- CSS selector
  content JSONB NOT NULL DEFAULT '{}', -- Rich content configuration
  
  -- Positioning and behavior
  position position_enum DEFAULT 'bottom',
  offset JSONB DEFAULT '{"x": 0, "y": 0}',
  backdrop_enabled BOOLEAN DEFAULT true,
  skip_enabled BOOLEAN DEFAULT true,
  
  -- Wedding context
  wedding_tip TEXT,
  pro_tip TEXT,
  estimated_time_seconds INTEGER DEFAULT 30,
  
  -- Conditional logic
  show_conditions JSONB DEFAULT '{}',
  skip_conditions JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tour_id, step_order),
  UNIQUE(tour_id, step_key)
);

-- User Tour Progress
CREATE TABLE user_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tour_definitions(id) ON DELETE CASCADE,
  
  -- Progress tracking
  status progress_status_enum DEFAULT 'not_started',
  current_step_index INTEGER DEFAULT 0,
  completed_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  skipped_steps INTEGER[] DEFAULT ARRAY[]::INTEGER[],
  
  -- Timing and analytics
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_interaction_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_time_seconds INTEGER DEFAULT 0,
  
  -- User feedback
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  feedback TEXT,
  was_helpful BOOLEAN,
  
  -- Metadata
  device_type device_enum,
  user_agent TEXT,
  viewport_size JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, organization_id, tour_id)
);

-- Tour Analytics Events
CREATE TABLE tour_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  tour_id UUID REFERENCES tour_definitions(id) ON DELETE CASCADE,
  progress_id UUID REFERENCES user_tour_progress(id) ON DELETE CASCADE,
  
  -- Event details
  event_type event_type_enum NOT NULL,
  step_index INTEGER,
  step_key VARCHAR(100),
  
  -- Event metadata
  event_data JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Context
  page_url TEXT,
  referrer TEXT,
  session_id UUID,
  
  -- Performance metrics
  load_time_ms INTEGER,
  interaction_time_ms INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tour A/B Test Configurations
CREATE TABLE tour_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tour_id UUID REFERENCES tour_definitions(id) ON DELETE CASCADE,
  test_name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Test configuration
  variant_a JSONB NOT NULL DEFAULT '{}', -- Control configuration
  variant_b JSONB NOT NULL DEFAULT '{}', -- Test configuration
  traffic_split DECIMAL(3,2) DEFAULT 0.50, -- 50/50 split
  
  -- Test lifecycle
  status ab_test_status_enum DEFAULT 'draft',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Success metrics
  primary_metric VARCHAR(100) DEFAULT 'completion_rate',
  minimum_sample_size INTEGER DEFAULT 100,
  statistical_significance DECIMAL(3,2) DEFAULT 0.95,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enums
CREATE TYPE tour_type_enum AS ENUM (
  'onboarding', 'feature_introduction', 'troubleshooting', 
  'wedding_milestone', 'seasonal_features', 'pro_tips'
);

CREATE TYPE audience_enum AS ENUM (
  'couples', 'photographers', 'venues', 'planners', 
  'florists', 'caterers', 'all_suppliers'
);

CREATE TYPE phase_enum AS ENUM (
  'engagement', 'planning', 'final_month', 
  'wedding_week', 'post_wedding'
);

CREATE TYPE position_enum AS ENUM (
  'top', 'bottom', 'left', 'right', 
  'top-left', 'top-right', 'bottom-left', 'bottom-right'
);

CREATE TYPE progress_status_enum AS ENUM (
  'not_started', 'in_progress', 'completed', 
  'abandoned', 'skipped_all'
);

CREATE TYPE device_enum AS ENUM (
  'desktop', 'tablet', 'mobile', 'unknown'
);

CREATE TYPE event_type_enum AS ENUM (
  'tour_started', 'step_viewed', 'step_completed', 'step_skipped',
  'tour_completed', 'tour_abandoned', 'tooltip_clicked', 
  'help_requested', 'feedback_submitted', 'error_encountered'
);

CREATE TYPE ab_test_status_enum AS ENUM (
  'draft', 'running', 'paused', 'completed', 'archived'
);
```

#### Indexes and Performance
```sql
-- Performance indexes
CREATE INDEX idx_tour_progress_user_org ON user_tour_progress(user_id, organization_id);
CREATE INDEX idx_tour_progress_status ON user_tour_progress(status);
CREATE INDEX idx_tour_progress_updated ON user_tour_progress(updated_at);
CREATE INDEX idx_tour_steps_tour_order ON tour_steps(tour_id, step_order);
CREATE INDEX idx_tour_analytics_user_date ON tour_analytics_events(user_id, created_at);
CREATE INDEX idx_tour_analytics_tour_event ON tour_analytics_events(tour_id, event_type);

-- Partial indexes for active records
CREATE INDEX idx_active_tours ON tour_definitions(id) WHERE is_active = true;
CREATE INDEX idx_active_progress ON user_tour_progress(id) WHERE status IN ('not_started', 'in_progress');
```

#### Row Level Security (RLS)
```sql
-- Enable RLS
ALTER TABLE tour_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_tour_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE tour_ab_tests ENABLE ROW LEVEL SECURITY;

-- Tour definitions - public read, admin write
CREATE POLICY "Anyone can view active tours" ON tour_definitions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage tours" ON tour_definitions
  FOR ALL USING (EXISTS (
    SELECT 1 FROM organizations 
    WHERE id = auth.jwt() ->> 'organization_id' 
    AND subscription_tier = 'enterprise'
  ));

-- User progress - users can only access their own data
CREATE POLICY "Users can view own tour progress" ON user_tour_progress
  FOR SELECT USING (
    user_id = auth.uid() OR 
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );

CREATE POLICY "Users can update own tour progress" ON user_tour_progress
  FOR ALL USING (user_id = auth.uid());

-- Analytics - users can insert own events, admins can view all
CREATE POLICY "Users can insert own analytics" ON tour_analytics_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organization members can view analytics" ON tour_analytics_events
  FOR SELECT USING (
    organization_id = (auth.jwt() ->> 'organization_id')::uuid
  );
```

### API Endpoint Specifications

#### 1. Tour Management API (`/api/tours`)

```typescript
// GET /api/tours - List available tours for user
interface GetToursRequest {
  audience?: string[];
  wedding_phase?: string;
  include_completed?: boolean;
}

interface GetToursResponse {
  tours: {
    id: string;
    name: string;
    description: string;
    tour_type: string;
    estimated_duration_minutes: number;
    progress?: {
      status: string;
      completed_steps: number[];
      current_step_index: number;
    };
  }[];
  total: number;
  has_active_tour: boolean;
}

// GET /api/tours/[id] - Get specific tour details
interface GetTourResponse {
  tour: {
    id: string;
    name: string;
    description: string;
    steps: TourStep[];
    wedding_phase: string;
    estimated_duration_minutes: number;
  };
  user_progress?: UserTourProgress;
  ab_test_variant?: string;
}

// POST /api/tours/[id]/start - Start a tour
interface StartTourRequest {
  device_type?: 'desktop' | 'tablet' | 'mobile';
  viewport_size?: { width: number; height: number };
}

interface StartTourResponse {
  progress_id: string;
  current_step: TourStep;
  total_steps: number;
  estimated_completion_time: number;
}
```

#### 2. Progress Tracking API (`/api/tours/progress`)

```typescript
// PUT /api/tours/progress/[progress_id] - Update progress
interface UpdateProgressRequest {
  action: 'next_step' | 'previous_step' | 'skip_step' | 'complete_tour' | 'abandon_tour';
  step_index?: number;
  step_key?: string;
  interaction_time_ms?: number;
  user_feedback?: {
    rating?: number;
    feedback?: string;
    was_helpful?: boolean;
  };
}

interface UpdateProgressResponse {
  progress: UserTourProgress;
  next_step?: TourStep;
  tour_completed: boolean;
  celebration_trigger?: boolean;
}

// GET /api/tours/progress/[progress_id] - Get current progress
interface GetProgressResponse {
  progress: UserTourProgress;
  current_step: TourStep;
  remaining_steps: number;
  completion_percentage: number;
}
```

#### 3. Analytics API (`/api/tours/analytics`)

```typescript
// POST /api/tours/analytics/events - Track tour events
interface TrackEventRequest {
  tour_id: string;
  progress_id: string;
  event_type: string;
  step_index?: number;
  step_key?: string;
  event_data?: Record<string, any>;
  interaction_time_ms?: number;
}

interface TrackEventResponse {
  event_id: string;
  recorded_at: string;
}

// GET /api/tours/analytics/dashboard - Analytics dashboard
interface AnalyticsDashboardResponse {
  overview: {
    total_tours_started: number;
    completion_rate: number;
    average_duration_minutes: number;
    user_satisfaction: number;
  };
  tour_performance: {
    tour_id: string;
    name: string;
    starts: number;
    completions: number;
    abandonment_rate: number;
    average_rating: number;
  }[];
  step_analytics: {
    step_key: string;
    views: number;
    skips: number;
    time_spent_avg: number;
    user_issues: number;
  }[];
  ab_test_results?: ABTestResults[];
}
```

#### 4. Configuration API (`/api/tours/config`)

```typescript
// GET /api/tours/config/[tour_id] - Get tour configuration
interface TourConfigResponse {
  config: {
    tour_id: string;
    steps: TourStepConfig[];
    targeting: {
      audience: string[];
      wedding_phase: string;
      prerequisites: string[];
    };
    ab_test?: {
      variant: 'a' | 'b';
      test_id: string;
    };
  };
}

// PUT /api/tours/config/[tour_id] - Update configuration (Admin only)
interface UpdateConfigRequest {
  steps?: Partial<TourStepConfig>[];
  targeting?: {
    audience?: string[];
    wedding_phase?: string;
    prerequisites?: string[];
  };
  ab_test?: {
    variant_a: Record<string, any>;
    variant_b: Record<string, any>;
    traffic_split: number;
  };
}
```

### Service Layer Implementation

#### Core Tour Service
```typescript
// src/lib/services/tour-service.ts
export class TourService {
  private supabase: SupabaseClient;
  private analytics: TourAnalytics;

  constructor() {
    this.supabase = createClientComponentClient();
    this.analytics = new TourAnalytics();
  }

  /**
   * Get available tours for user based on their context
   */
  async getAvailableTours(params: {
    userId: string;
    organizationId: string;
    audience?: string[];
    weddingPhase?: string;
    includeCompleted?: boolean;
  }): Promise<TourDefinition[]> {
    const { data: tours, error } = await this.supabase
      .from('tour_definitions')
      .select(`
        *,
        tour_steps!inner(id, step_order),
        user_tour_progress!left(status, completed_steps, current_step_index)
      `)
      .eq('is_active', true)
      .eq('user_tour_progress.user_id', params.userId)
      .eq('user_tour_progress.organization_id', params.organizationId);

    if (error) throw new TourServiceError('Failed to fetch tours', error);

    // Filter based on audience and wedding phase
    return tours.filter(tour => {
      if (params.audience && !tour.target_audience.some(aud => params.audience!.includes(aud))) {
        return false;
      }
      
      if (params.weddingPhase && tour.wedding_phase !== params.weddingPhase) {
        return false;
      }

      if (!params.includeCompleted && tour.user_tour_progress?.[0]?.status === 'completed') {
        return false;
      }

      return true;
    });
  }

  /**
   * Start a new tour for user
   */
  async startTour(params: {
    userId: string;
    organizationId: string;
    tourId: string;
    deviceType?: string;
    viewportSize?: { width: number; height: number };
  }): Promise<{ progressId: string; currentStep: TourStep }> {
    // Check for existing progress
    const existing = await this.getUserProgress(params.userId, params.organizationId, params.tourId);
    
    if (existing && existing.status === 'in_progress') {
      return {
        progressId: existing.id,
        currentStep: await this.getCurrentStep(existing.tour_id, existing.current_step_index)
      };
    }

    // Get A/B test variant
    const abVariant = await this.getABTestVariant(params.tourId, params.userId);

    // Create new progress record
    const { data: progress, error } = await this.supabase
      .from('user_tour_progress')
      .insert({
        user_id: params.userId,
        organization_id: params.organizationId,
        tour_id: params.tourId,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        device_type: params.deviceType || 'desktop',
        viewport_size: params.viewportSize,
        current_step_index: 0
      })
      .select()
      .single();

    if (error) throw new TourServiceError('Failed to start tour', error);

    // Track tour started event
    await this.analytics.trackEvent({
      userId: params.userId,
      organizationId: params.organizationId,
      tourId: params.tourId,
      progressId: progress.id,
      eventType: 'tour_started',
      eventData: { ab_variant: abVariant }
    });

    const currentStep = await this.getCurrentStep(params.tourId, 0);
    
    return {
      progressId: progress.id,
      currentStep
    };
  }

  /**
   * Update tour progress
   */
  async updateProgress(params: {
    progressId: string;
    action: 'next_step' | 'previous_step' | 'skip_step' | 'complete_tour' | 'abandon_tour';
    stepIndex?: number;
    interactionTimeMs?: number;
    userFeedback?: UserFeedback;
  }): Promise<{ progress: UserTourProgress; nextStep?: TourStep; completed: boolean }> {
    const progress = await this.getProgressById(params.progressId);
    if (!progress) throw new TourServiceError('Progress record not found');

    let updates: Partial<UserTourProgress> = {
      last_interaction_at: new Date().toISOString(),
      total_time_seconds: progress.total_time_seconds + Math.floor((params.interactionTimeMs || 0) / 1000)
    };

    let nextStep: TourStep | undefined;
    let completed = false;

    switch (params.action) {
      case 'next_step':
        const newStepIndex = progress.current_step_index + 1;
        updates.current_step_index = newStepIndex;
        updates.completed_steps = [...progress.completed_steps, progress.current_step_index];
        
        // Check if tour is complete
        const totalSteps = await this.getTotalSteps(progress.tour_id);
        if (newStepIndex >= totalSteps) {
          updates.status = 'completed';
          updates.completed_at = new Date().toISOString();
          completed = true;
        } else {
          nextStep = await this.getCurrentStep(progress.tour_id, newStepIndex);
        }
        break;

      case 'skip_step':
        updates.current_step_index = progress.current_step_index + 1;
        updates.skipped_steps = [...progress.skipped_steps, progress.current_step_index];
        break;

      case 'complete_tour':
        updates.status = 'completed';
        updates.completed_at = new Date().toISOString();
        completed = true;
        break;

      case 'abandon_tour':
        updates.status = 'abandoned';
        break;
    }

    // Add user feedback if provided
    if (params.userFeedback) {
      updates.user_rating = params.userFeedback.rating;
      updates.feedback = params.userFeedback.feedback;
      updates.was_helpful = params.userFeedback.was_helpful;
    }

    // Update progress record
    const { data: updatedProgress, error } = await this.supabase
      .from('user_tour_progress')
      .update(updates)
      .eq('id', params.progressId)
      .select()
      .single();

    if (error) throw new TourServiceError('Failed to update progress', error);

    // Track event
    await this.analytics.trackEvent({
      userId: progress.user_id,
      organizationId: progress.organization_id,
      tourId: progress.tour_id,
      progressId: params.progressId,
      eventType: this.getEventTypeFromAction(params.action),
      stepIndex: params.stepIndex,
      eventData: { interaction_time_ms: params.interactionTimeMs },
      interactionTimeMs: params.interactionTimeMs
    });

    return {
      progress: updatedProgress,
      nextStep,
      completed
    };
  }

  /**
   * Get A/B test variant for user
   */
  private async getABTestVariant(tourId: string, userId: string): Promise<string | null> {
    const { data: abTest } = await this.supabase
      .from('tour_ab_tests')
      .select('*')
      .eq('tour_id', tourId)
      .eq('status', 'running')
      .single();

    if (!abTest) return null;

    // Use user ID hash to determine variant (consistent assignment)
    const hash = this.hashUserId(userId);
    const variant = hash < abTest.traffic_split ? 'a' : 'b';

    return variant;
  }

  /**
   * Hash user ID for consistent A/B test assignment
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / Math.pow(2, 32);
  }

  private async getCurrentStep(tourId: string, stepIndex: number): Promise<TourStep> {
    const { data: step, error } = await this.supabase
      .from('tour_steps')
      .select('*')
      .eq('tour_id', tourId)
      .eq('step_order', stepIndex)
      .single();

    if (error) throw new TourServiceError('Failed to get tour step', error);
    return step;
  }

  private async getTotalSteps(tourId: string): Promise<number> {
    const { count, error } = await this.supabase
      .from('tour_steps')
      .select('*', { count: 'exact', head: true })
      .eq('tour_id', tourId);

    if (error) throw new TourServiceError('Failed to count tour steps', error);
    return count || 0;
  }

  private getEventTypeFromAction(action: string): string {
    const mapping: Record<string, string> = {
      'next_step': 'step_completed',
      'skip_step': 'step_skipped',
      'complete_tour': 'tour_completed',
      'abandon_tour': 'tour_abandoned'
    };
    return mapping[action] || 'unknown_action';
  }
}

export class TourServiceError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'TourServiceError';
  }
}
```

#### Analytics Service
```typescript
// src/lib/services/tour-analytics.ts
export class TourAnalytics {
  private supabase: SupabaseClient;
  private eventQueue: AnalyticsEvent[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    this.supabase = createClientComponentClient();
    this.startBatchProcessor();
  }

  /**
   * Track tour interaction event
   */
  async trackEvent(event: {
    userId: string;
    organizationId: string;
    tourId: string;
    progressId: string;
    eventType: string;
    stepIndex?: number;
    stepKey?: string;
    eventData?: Record<string, any>;
    interactionTimeMs?: number;
  }): Promise<void> {
    const analyticsEvent: AnalyticsEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      session_id: this.getSessionId(),
      page_url: typeof window !== 'undefined' ? window.location.href : undefined,
      referrer: typeof window !== 'undefined' ? document.referrer : undefined
    };

    // Add to batch queue
    this.eventQueue.push(analyticsEvent);

    // Flush immediately for critical events
    if (['tour_abandoned', 'error_encountered'].includes(event.eventType)) {
      await this.flushEvents();
    }
  }

  /**
   * Get tour performance analytics
   */
  async getTourAnalytics(params: {
    organizationId: string;
    tourId?: string;
    dateRange?: { start: string; end: string };
  }): Promise<TourAnalyticsReport> {
    const dateFilter = params.dateRange ? 
      `AND created_at >= '${params.dateRange.start}' AND created_at <= '${params.dateRange.end}'` : 
      '';

    // Get overview metrics
    const { data: overview } = await this.supabase
      .rpc('get_tour_overview_metrics', {
        org_id: params.organizationId,
        tour_filter: params.tourId,
        date_filter: dateFilter
      });

    // Get tour performance breakdown
    const { data: tourPerformance } = await this.supabase
      .rpc('get_tour_performance_breakdown', {
        org_id: params.organizationId,
        date_filter: dateFilter
      });

    // Get step analytics
    const { data: stepAnalytics } = await this.supabase
      .rpc('get_tour_step_analytics', {
        org_id: params.organizationId,
        tour_filter: params.tourId,
        date_filter: dateFilter
      });

    return {
      overview: overview[0] || this.getDefaultOverview(),
      tour_performance: tourPerformance || [],
      step_analytics: stepAnalytics || []
    };
  }

  /**
   * Track user feedback on tour helpfulness
   */
  async trackFeedback(params: {
    progressId: string;
    rating: number;
    feedback: string;
    wasHelpful: boolean;
    organizationId: string;
  }): Promise<void> {
    // Update progress record
    await this.supabase
      .from('user_tour_progress')
      .update({
        user_rating: params.rating,
        feedback: params.feedback,
        was_helpful: params.wasHelpful
      })
      .eq('id', params.progressId);

    // Track feedback event
    const progress = await this.supabase
      .from('user_tour_progress')
      .select('user_id, tour_id')
      .eq('id', params.progressId)
      .single();

    if (progress.data) {
      await this.trackEvent({
        userId: progress.data.user_id,
        organizationId: params.organizationId,
        tourId: progress.data.tour_id,
        progressId: params.progressId,
        eventType: 'feedback_submitted',
        eventData: {
          rating: params.rating,
          feedback: params.feedback,
          was_helpful: params.wasHelpful
        }
      });
    }
  }

  /**
   * Get A/B test results
   */
  async getABTestResults(testId: string): Promise<ABTestResults> {
    const { data: test } = await this.supabase
      .from('tour_ab_tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (!test) throw new Error('A/B test not found');

    // Get results for each variant
    const { data: results } = await this.supabase
      .rpc('get_ab_test_results', { test_id: testId });

    return {
      test_id: testId,
      test_name: test.test_name,
      status: test.status,
      variants: results || [],
      statistical_significance: this.calculateSignificance(results),
      recommendation: this.getABTestRecommendation(results)
    };
  }

  /**
   * Batch process analytics events
   */
  private startBatchProcessor(): void {
    if (typeof window === 'undefined') return; // Server-side guard

    setInterval(async () => {
      if (this.eventQueue.length > 0) {
        await this.flushEvents();
      }
    }, this.flushInterval);

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      if (this.eventQueue.length > 0) {
        // Use sendBeacon for reliable delivery
        navigator.sendBeacon(
          '/api/tours/analytics/batch',
          JSON.stringify(this.eventQueue)
        );
        this.eventQueue = [];
      }
    });
  }

  /**
   * Flush queued events to database
   */
  private async flushEvents(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const batch = this.eventQueue.splice(0, this.batchSize);

    try {
      const { error } = await this.supabase
        .from('tour_analytics_events')
        .insert(batch);

      if (error) {
        console.error('Failed to flush analytics events:', error);
        // Re-queue events for retry
        this.eventQueue.unshift(...batch);
      }
    } catch (error) {
      console.error('Analytics batch processing error:', error);
      // Re-queue for retry
      this.eventQueue.unshift(...batch);
    }
  }

  private getSessionId(): string {
    if (typeof window === 'undefined') return 'server-session';
    
    let sessionId = sessionStorage.getItem('tour_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('tour_session_id', sessionId);
    }
    return sessionId;
  }

  private getDefaultOverview(): TourOverview {
    return {
      total_tours_started: 0,
      completion_rate: 0,
      average_duration_minutes: 0,
      user_satisfaction: 0
    };
  }

  private calculateSignificance(results: any[]): number {
    // Implement statistical significance calculation
    // This is a simplified version - use proper statistical libraries in production
    if (!results || results.length < 2) return 0;
    
    const [variantA, variantB] = results;
    const n1 = variantA.sample_size;
    const n2 = variantB.sample_size;
    const p1 = variantA.conversion_rate;
    const p2 = variantB.conversion_rate;
    
    if (n1 < 30 || n2 < 30) return 0; // Insufficient sample size
    
    // Simple z-test calculation
    const pooledP = (n1 * p1 + n2 * p2) / (n1 + n2);
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
    const zScore = Math.abs(p1 - p2) / se;
    
    // Convert z-score to confidence level (simplified)
    if (zScore > 2.576) return 0.99; // 99% confidence
    if (zScore > 1.96) return 0.95;  // 95% confidence
    if (zScore > 1.645) return 0.90; // 90% confidence
    
    return 0;
  }

  private getABTestRecommendation(results: any[]): string {
    if (!results || results.length < 2) return 'insufficient_data';
    
    const [variantA, variantB] = results;
    const improvement = ((variantB.conversion_rate - variantA.conversion_rate) / variantA.conversion_rate) * 100;
    
    if (Math.abs(improvement) < 5) return 'no_significant_difference';
    if (improvement > 0) return 'implement_variant_b';
    return 'keep_variant_a';
  }
}
```

### Configuration Management

#### Tour Configuration Service
```typescript
// src/lib/services/tour-config.ts
export class TourConfigService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClientComponentClient();
  }

  /**
   * Get tour configuration with A/B test variants
   */
  async getTourConfig(tourId: string, userId?: string): Promise<TourConfiguration> {
    // Get base tour configuration
    const { data: tour, error } = await this.supabase
      .from('tour_definitions')
      .select(`
        *,
        tour_steps (
          *
        ),
        tour_ab_tests!inner (
          *
        )
      `)
      .eq('id', tourId)
      .eq('is_active', true)
      .single();

    if (error) throw new TourConfigError('Tour configuration not found', error);

    // Determine A/B test variant for user
    let config = this.baseConfiguration(tour);
    
    if (userId && tour.tour_ab_tests?.length > 0) {
      const activeTest = tour.tour_ab_tests.find(test => test.status === 'running');
      if (activeTest) {
        const variant = this.determineVariant(userId, activeTest);
        config = this.applyVariantConfig(config, activeTest, variant);
      }
    }

    return config;
  }

  /**
   * Update tour configuration (Admin only)
   */
  async updateTourConfig(
    tourId: string, 
    updates: Partial<TourConfiguration>,
    adminUserId: string
  ): Promise<void> {
    // Verify admin permissions
    const hasPermission = await this.verifyAdminPermission(adminUserId);
    if (!hasPermission) {
      throw new TourConfigError('Insufficient permissions');
    }

    // Update tour definition
    if (updates.tour) {
      const { error: tourError } = await this.supabase
        .from('tour_definitions')
        .update(updates.tour)
        .eq('id', tourId);

      if (tourError) throw new TourConfigError('Failed to update tour', tourError);
    }

    // Update steps
    if (updates.steps) {
      await this.updateTourSteps(tourId, updates.steps);
    }

    // Update A/B test configuration
    if (updates.abTest) {
      await this.updateABTestConfig(tourId, updates.abTest);
    }

    // Increment version
    await this.incrementTourVersion(tourId);
  }

  /**
   * Create A/B test for tour
   */
  async createABTest(params: {
    tourId: string;
    testName: string;
    description: string;
    variantA: Record<string, any>;
    variantB: Record<string, any>;
    trafficSplit?: number;
    primaryMetric?: string;
    adminUserId: string;
  }): Promise<string> {
    const hasPermission = await this.verifyAdminPermission(params.adminUserId);
    if (!hasPermission) {
      throw new TourConfigError('Insufficient permissions');
    }

    const { data: test, error } = await this.supabase
      .from('tour_ab_tests')
      .insert({
        tour_id: params.tourId,
        test_name: params.testName,
        description: params.description,
        variant_a: params.variantA,
        variant_b: params.variantB,
        traffic_split: params.trafficSplit || 0.5,
        primary_metric: params.primaryMetric || 'completion_rate'
      })
      .select('id')
      .single();

    if (error) throw new TourConfigError('Failed to create A/B test', error);
    return test.id;
  }

  /**
   * Start A/B test
   */
  async startABTest(testId: string, adminUserId: string): Promise<void> {
    const hasPermission = await this.verifyAdminPermission(adminUserId);
    if (!hasPermission) {
      throw new TourConfigError('Insufficient permissions');
    }

    const { error } = await this.supabase
      .from('tour_ab_tests')
      .update({
        status: 'running',
        start_date: new Date().toISOString()
      })
      .eq('id', testId);

    if (error) throw new TourConfigError('Failed to start A/B test', error);
  }

  private baseConfiguration(tour: any): TourConfiguration {
    return {
      tour: {
        id: tour.id,
        name: tour.name,
        description: tour.description,
        tour_type: tour.tour_type,
        wedding_phase: tour.wedding_phase,
        estimated_duration_minutes: tour.estimated_duration_minutes
      },
      steps: tour.tour_steps.sort((a: any, b: any) => a.step_order - b.step_order),
      targeting: {
        audience: tour.target_audience,
        wedding_phase: tour.wedding_phase,
        prerequisites: tour.prerequisite_tours || []
      }
    };
  }

  private determineVariant(userId: string, abTest: any): 'a' | 'b' {
    // Consistent hash-based assignment
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const normalizedHash = Math.abs(hash) / Math.pow(2, 32);
    return normalizedHash < abTest.traffic_split ? 'a' : 'b';
  }

  private applyVariantConfig(
    baseConfig: TourConfiguration, 
    abTest: any, 
    variant: 'a' | 'b'
  ): TourConfiguration {
    const variantConfig = variant === 'a' ? abTest.variant_a : abTest.variant_b;
    
    // Deep merge variant configuration
    return {
      ...baseConfig,
      steps: this.applyVariantToSteps(baseConfig.steps, variantConfig),
      abTest: {
        test_id: abTest.id,
        variant: variant,
        test_name: abTest.test_name
      }
    };
  }

  private applyVariantToSteps(steps: any[], variantConfig: any): any[] {
    return steps.map(step => {
      const stepVariant = variantConfig.steps?.[step.step_key];
      if (stepVariant) {
        return { ...step, ...stepVariant };
      }
      return step;
    });
  }

  private async updateTourSteps(tourId: string, steps: any[]): Promise<void> {
    // Delete existing steps
    await this.supabase
      .from('tour_steps')
      .delete()
      .eq('tour_id', tourId);

    // Insert updated steps
    const stepsWithTourId = steps.map((step, index) => ({
      ...step,
      tour_id: tourId,
      step_order: index
    }));

    const { error } = await this.supabase
      .from('tour_steps')
      .insert(stepsWithTourId);

    if (error) throw new TourConfigError('Failed to update tour steps', error);
  }

  private async updateABTestConfig(tourId: string, abTestConfig: any): Promise<void> {
    // Implementation for A/B test configuration updates
    const { error } = await this.supabase
      .from('tour_ab_tests')
      .update(abTestConfig)
      .eq('tour_id', tourId);

    if (error) throw new TourConfigError('Failed to update A/B test config', error);
  }

  private async incrementTourVersion(tourId: string): Promise<void> {
    // Get current version and increment
    const { data: tour } = await this.supabase
      .from('tour_definitions')
      .select('version')
      .eq('id', tourId)
      .single();

    if (tour) {
      const currentVersion = tour.version || '1.0.0';
      const versionParts = currentVersion.split('.');
      const patchVersion = parseInt(versionParts[2] || '0') + 1;
      const newVersion = `${versionParts[0]}.${versionParts[1]}.${patchVersion}`;

      await this.supabase
        .from('tour_definitions')
        .update({ version: newVersion })
        .eq('id', tourId);
    }
  }

  private async verifyAdminPermission(userId: string): Promise<boolean> {
    // Check if user has admin permissions
    const { data: profile } = await this.supabase
      .from('user_profiles')
      .select('role, organization_id')
      .eq('user_id', userId)
      .single();

    if (!profile) return false;

    // Check if organization has enterprise tier (required for tour management)
    const { data: org } = await this.supabase
      .from('organizations')
      .select('subscription_tier')
      .eq('id', profile.organization_id)
      .single();

    return profile.role === 'admin' && org?.subscription_tier === 'enterprise';
  }
}

export class TourConfigError extends Error {
  constructor(message: string, public cause?: any) {
    super(message);
    this.name = 'TourConfigError';
  }
}
```

### API Route Implementations

#### Individual Tour Management
```typescript
// src/app/api/tours/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TourService, TourConfigService } from '@/lib/services';
import { withSecureValidation } from '@/lib/middleware/security';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSecureValidation(async () => {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tourService = new TourService();
    const configService = new TourConfigService();

    try {
      // Get tour configuration with user-specific variant
      const config = await configService.getTourConfig(params.id, user.id);
      
      // Get user's progress if exists
      const userProfile = await supabase
        .from('user_profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile.data) {
        return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
      }

      const progress = await tourService.getUserProgress(
        user.id, 
        userProfile.data.organization_id, 
        params.id
      );

      return NextResponse.json({
        tour: config.tour,
        steps: config.steps,
        user_progress: progress,
        ab_test_variant: config.abTest?.variant,
        total_steps: config.steps.length
      });

    } catch (error) {
      console.error('Tour fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch tour' },
        { status: 500 }
      );
    }
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return withSecureValidation(async () => {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { device_type, viewport_size } = body;

    const userProfile = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile.data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const tourService = new TourService();

    try {
      const result = await tourService.startTour({
        userId: user.id,
        organizationId: userProfile.data.organization_id,
        tourId: params.id,
        deviceType: device_type,
        viewportSize: viewport_size
      });

      return NextResponse.json({
        progress_id: result.progressId,
        current_step: result.currentStep,
        message: 'Tour started successfully'
      });

    } catch (error) {
      console.error('Tour start error:', error);
      return NextResponse.json(
        { error: 'Failed to start tour' },
        { status: 500 }
      );
    }
  });
}
```

#### Progress Tracking
```typescript
// src/app/api/tours/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TourService } from '@/lib/services';
import { withSecureValidation } from '@/lib/middleware/security';
import { z } from 'zod';

const UpdateProgressSchema = z.object({
  progress_id: z.string().uuid(),
  action: z.enum(['next_step', 'previous_step', 'skip_step', 'complete_tour', 'abandon_tour']),
  step_index: z.number().optional(),
  step_key: z.string().optional(),
  interaction_time_ms: z.number().optional(),
  user_feedback: z.object({
    rating: z.number().min(1).max(5).optional(),
    feedback: z.string().optional(),
    was_helpful: z.boolean().optional()
  }).optional()
});

export async function PUT(request: NextRequest) {
  return withSecureValidation(async () => {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const body = await request.json();
      const validatedData = UpdateProgressSchema.parse(body);

      const tourService = new TourService();
      
      // Verify user owns this progress record
      const progress = await supabase
        .from('user_tour_progress')
        .select('user_id')
        .eq('id', validatedData.progress_id)
        .single();

      if (!progress.data || progress.data.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      const result = await tourService.updateProgress({
        progressId: validatedData.progress_id,
        action: validatedData.action,
        stepIndex: validatedData.step_index,
        interactionTimeMs: validatedData.interaction_time_ms,
        userFeedback: validatedData.user_feedback
      });

      return NextResponse.json({
        progress: result.progress,
        next_step: result.nextStep,
        tour_completed: result.completed,
        celebration_trigger: result.completed && validatedData.action === 'complete_tour'
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid request data', details: error.errors },
          { status: 400 }
        );
      }

      console.error('Progress update error:', error);
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withSecureValidation(async () => {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const progressId = searchParams.get('progress_id');

    if (!progressId) {
      return NextResponse.json({ error: 'Progress ID required' }, { status: 400 });
    }

    try {
      const { data: progress, error } = await supabase
        .from('user_tour_progress')
        .select(`
          *,
          tour_definitions!inner (
            name,
            tour_steps!inner (
              id,
              step_order,
              title,
              description,
              target_element,
              content,
              position
            )
          )
        `)
        .eq('id', progressId)
        .eq('user_id', user.id)
        .single();

      if (error || !progress) {
        return NextResponse.json({ error: 'Progress not found' }, { status: 404 });
      }

      const totalSteps = progress.tour_definitions.tour_steps.length;
      const currentStep = progress.tour_definitions.tour_steps.find(
        (step: any) => step.step_order === progress.current_step_index
      );

      return NextResponse.json({
        progress: progress,
        current_step: currentStep,
        remaining_steps: totalSteps - progress.current_step_index,
        completion_percentage: Math.round((progress.current_step_index / totalSteps) * 100)
      });

    } catch (error) {
      console.error('Progress fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch progress' },
        { status: 500 }
      );
    }
  });
}
```

#### Analytics Collection
```typescript
// src/app/api/tours/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { TourAnalytics } from '@/lib/services';
import { withSecureValidation } from '@/lib/middleware/security';
import { z } from 'zod';

const TrackEventSchema = z.object({
  tour_id: z.string().uuid(),
  progress_id: z.string().uuid(),
  event_type: z.string(),
  step_index: z.number().optional(),
  step_key: z.string().optional(),
  event_data: z.record(z.any()).optional(),
  interaction_time_ms: z.number().optional()
});

const BatchEventSchema = z.array(TrackEventSchema);

export async function POST(request: NextRequest) {
  return withSecureValidation(async () => {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile.data) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    try {
      const body = await request.json();
      const analytics = new TourAnalytics();

      // Handle both single events and batch events
      const events = Array.isArray(body) ? body : [body];
      const validatedEvents = BatchEventSchema.parse(events);

      const results = await Promise.allSettled(
        validatedEvents.map(event => 
          analytics.trackEvent({
            ...event,
            userId: user.id,
            organizationId: userProfile.data.organization_id
          })
        )
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return NextResponse.json({
        recorded_events: successful,
        failed_events: failed,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { error: 'Invalid event data', details: error.errors },
          { status: 400 }
        );
      }

      console.error('Analytics tracking error:', error);
      return NextResponse.json(
        { error: 'Failed to track events' },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withSecureValidation(async () => {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userProfile = await supabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single();

    if (!userProfile.data || userProfile.data.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tour_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    try {
      const analytics = new TourAnalytics();
      const report = await analytics.getTourAnalytics({
        organizationId: userProfile.data.organization_id,
        tourId: tourId || undefined,
        dateRange: startDate && endDate ? { start: startDate, end: endDate } : undefined
      });

      return NextResponse.json(report);

    } catch (error) {
      console.error('Analytics fetch error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }
  });
}
```

### Database Functions for Analytics

```sql
-- Function to get tour overview metrics
CREATE OR REPLACE FUNCTION get_tour_overview_metrics(
  org_id UUID,
  tour_filter UUID DEFAULT NULL,
  date_filter TEXT DEFAULT ''
)
RETURNS TABLE (
  total_tours_started BIGINT,
  completion_rate NUMERIC,
  average_duration_minutes NUMERIC,
  user_satisfaction NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    WITH tour_stats AS (
      SELECT 
        COUNT(*) as started,
        COUNT(*) FILTER (WHERE status = ''completed'') as completed,
        AVG(total_time_seconds / 60.0) as avg_duration,
        AVG(user_rating) as avg_rating
      FROM user_tour_progress 
      WHERE organization_id = $1
        %s %s
    )
    SELECT 
      started,
      CASE WHEN started > 0 
        THEN ROUND((completed::NUMERIC / started::NUMERIC) * 100, 2)
        ELSE 0 
      END,
      ROUND(COALESCE(avg_duration, 0), 1),
      ROUND(COALESCE(avg_rating, 0), 1)
    FROM tour_stats',
    CASE WHEN tour_filter IS NOT NULL THEN 'AND tour_id = $2' ELSE '' END,
    date_filter
  ) USING org_id, tour_filter;
END;
$$ LANGUAGE plpgsql;

-- Function to get tour performance breakdown
CREATE OR REPLACE FUNCTION get_tour_performance_breakdown(
  org_id UUID,
  date_filter TEXT DEFAULT ''
)
RETURNS TABLE (
  tour_id UUID,
  name VARCHAR,
  starts BIGINT,
  completions BIGINT,
  abandonment_rate NUMERIC,
  average_rating NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    SELECT 
      td.id,
      td.name,
      COUNT(utp.id) as starts,
      COUNT(utp.id) FILTER (WHERE utp.status = ''completed'') as completions,
      CASE WHEN COUNT(utp.id) > 0 
        THEN ROUND((COUNT(utp.id) FILTER (WHERE utp.status = ''abandoned'')::NUMERIC / COUNT(utp.id)::NUMERIC) * 100, 2)
        ELSE 0 
      END as abandonment_rate,
      ROUND(AVG(utp.user_rating), 1) as avg_rating
    FROM tour_definitions td
    LEFT JOIN user_tour_progress utp ON td.id = utp.tour_id AND utp.organization_id = $1
    WHERE td.is_active = true %s
    GROUP BY td.id, td.name
    ORDER BY starts DESC',
    date_filter
  ) USING org_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get step analytics
CREATE OR REPLACE FUNCTION get_tour_step_analytics(
  org_id UUID,
  tour_filter UUID DEFAULT NULL,
  date_filter TEXT DEFAULT ''
)
RETURNS TABLE (
  step_key VARCHAR,
  title VARCHAR,
  views BIGINT,
  skips BIGINT,
  time_spent_avg NUMERIC,
  user_issues BIGINT
) AS $$
BEGIN
  RETURN QUERY
  EXECUTE format('
    WITH step_events AS (
      SELECT 
        ts.step_key,
        ts.title,
        COUNT(*) FILTER (WHERE tae.event_type = ''step_viewed'') as views,
        COUNT(*) FILTER (WHERE tae.event_type = ''step_skipped'') as skips,
        AVG(tae.interaction_time_ms / 1000.0) as avg_time,
        COUNT(*) FILTER (WHERE tae.event_type = ''error_encountered'') as issues
      FROM tour_steps ts
      LEFT JOIN tour_analytics_events tae ON ts.step_key = tae.step_key 
        AND tae.organization_id = $1 %s
      WHERE ts.tour_id IN (
        SELECT id FROM tour_definitions WHERE is_active = true
      ) %s
      GROUP BY ts.step_key, ts.title, ts.step_order
      ORDER BY ts.step_order
    )
    SELECT * FROM step_events',
    CASE WHEN tour_filter IS NOT NULL THEN 'AND tae.tour_id = $2' ELSE '' END,
    CASE WHEN tour_filter IS NOT NULL THEN 'AND ts.tour_id = $2' ELSE '' END
  ) USING org_id, tour_filter;
END;
$$ LANGUAGE plpgsql;

-- Function to get A/B test results
CREATE OR REPLACE FUNCTION get_ab_test_results(test_id UUID)
RETURNS TABLE (
  variant CHAR(1),
  sample_size BIGINT,
  conversions BIGINT,
  conversion_rate NUMERIC,
  average_time NUMERIC,
  user_satisfaction NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH test_data AS (
    SELECT 
      tat.variant_a,
      tat.variant_b,
      utp.status,
      CASE 
        WHEN (tae.event_data->>'ab_variant') = 'a' THEN 'a'
        ELSE 'b'
      END as user_variant,
      utp.total_time_seconds,
      utp.user_rating
    FROM tour_ab_tests tat
    JOIN tour_analytics_events tae ON tat.tour_id = tae.tour_id
    JOIN user_tour_progress utp ON tae.progress_id = utp.id
    WHERE tat.id = test_id
      AND tae.event_type = 'tour_started'
  )
  SELECT 
    user_variant::CHAR(1),
    COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE status = 'completed')::BIGINT,
    ROUND((COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2),
    ROUND(AVG(total_time_seconds / 60.0), 1),
    ROUND(AVG(user_rating), 1)
  FROM test_data
  WHERE user_variant IS NOT NULL
  GROUP BY user_variant
  ORDER BY user_variant;
END;
$$ LANGUAGE plpgsql;
```

### Type Definitions

```typescript
// src/types/tours.ts
export interface TourDefinition {
  id: string;
  name: string;
  description: string;
  tour_type: 'onboarding' | 'feature_introduction' | 'troubleshooting' | 'wedding_milestone' | 'seasonal_features' | 'pro_tips';
  version: string;
  target_audience: ('couples' | 'photographers' | 'venues' | 'planners' | 'florists' | 'caterers' | 'all_suppliers')[];
  is_active: boolean;
  wedding_phase: 'engagement' | 'planning' | 'final_month' | 'wedding_week' | 'post_wedding';
  estimated_duration_minutes: number;
  prerequisite_tours: string[];
  created_at: string;
  updated_at: string;
}

export interface TourStep {
  id: string;
  tour_id: string;
  step_order: number;
  step_key: string;
  title: string;
  description: string;
  target_element: string;
  content: Record<string, any>;
  position: 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  offset: { x: number; y: number };
  backdrop_enabled: boolean;
  skip_enabled: boolean;
  wedding_tip?: string;
  pro_tip?: string;
  estimated_time_seconds: number;
  show_conditions: Record<string, any>;
  skip_conditions: Record<string, any>;
  created_at: string;
}

export interface UserTourProgress {
  id: string;
  user_id: string;
  organization_id: string;
  tour_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned' | 'skipped_all';
  current_step_index: number;
  completed_steps: number[];
  skipped_steps: number[];
  started_at?: string;
  completed_at?: string;
  last_interaction_at: string;
  total_time_seconds: number;
  user_rating?: number;
  feedback?: string;
  was_helpful?: boolean;
  device_type?: 'desktop' | 'tablet' | 'mobile';
  user_agent?: string;
  viewport_size?: { width: number; height: number };
  created_at: string;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  user_id: string;
  organization_id: string;
  tour_id: string;
  progress_id: string;
  event_type: 'tour_started' | 'step_viewed' | 'step_completed' | 'step_skipped' | 'tour_completed' | 'tour_abandoned' | 'tooltip_clicked' | 'help_requested' | 'feedback_submitted' | 'error_encountered';
  step_index?: number;
  step_key?: string;
  event_data: Record<string, any>;
  timestamp: string;
  page_url?: string;
  referrer?: string;
  session_id?: string;
  load_time_ms?: number;
  interaction_time_ms?: number;
  created_at: string;
}

export interface TourConfiguration {
  tour: Pick<TourDefinition, 'id' | 'name' | 'description' | 'tour_type' | 'wedding_phase' | 'estimated_duration_minutes'>;
  steps: TourStep[];
  targeting: {
    audience: string[];
    wedding_phase: string;
    prerequisites: string[];
  };
  abTest?: {
    test_id: string;
    variant: 'a' | 'b';
    test_name: string;
  };
}

export interface TourAnalyticsReport {
  overview: {
    total_tours_started: number;
    completion_rate: number;
    average_duration_minutes: number;
    user_satisfaction: number;
  };
  tour_performance: {
    tour_id: string;
    name: string;
    starts: number;
    completions: number;
    abandonment_rate: number;
    average_rating: number;
  }[];
  step_analytics: {
    step_key: string;
    title: string;
    views: number;
    skips: number;
    time_spent_avg: number;
    user_issues: number;
  }[];
  ab_test_results?: ABTestResults[];
}

export interface ABTestResults {
  test_id: string;
  test_name: string;
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  variants: {
    variant: 'a' | 'b';
    sample_size: number;
    conversions: number;
    conversion_rate: number;
    average_time: number;
    user_satisfaction: number;
  }[];
  statistical_significance: number;
  recommendation: 'insufficient_data' | 'no_significant_difference' | 'implement_variant_b' | 'keep_variant_a';
}

export interface UserFeedback {
  rating?: number;
  feedback?: string;
  was_helpful?: boolean;
}

// Error types
export class TourError extends Error {
  constructor(message: string, public code?: string, public cause?: any) {
    super(message);
    this.name = 'TourError';
  }
}
```

## Performance Optimization

### Real-time Synchronization
```typescript
// Real-time tour progress sync using Supabase Realtime
export function useTourProgressSync(progressId: string) {
  const supabase = createClientComponentClient();
  const [progress, setProgress] = useState<UserTourProgress | null>(null);

  useEffect(() => {
    if (!progressId) return;

    // Subscribe to progress updates
    const channel = supabase
      .channel(`tour_progress:${progressId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'user_tour_progress',
          filter: `id=eq.${progressId}`
        }, 
        (payload) => {
          setProgress(payload.new as UserTourProgress);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [progressId, supabase]);

  return progress;
}
```

### Caching Strategy
```typescript
// Tour configuration caching with SWR
export function useTourConfig(tourId: string, userId?: string) {
  const { data, error, mutate } = useSWR(
    tourId ? `/api/tours/${tourId}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
      errorRetryCount: 3
    }
  );

  return {
    config: data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}

// Background prefetching for next steps
export async function prefetchNextSteps(tourId: string, currentStepIndex: number) {
  const nextSteps = await fetch(`/api/tours/${tourId}/steps?from=${currentStepIndex}&limit=3`);
  // Cache in local storage or IndexedDB for offline access
  if (nextSteps.ok) {
    const steps = await nextSteps.json();
    localStorage.setItem(`tour_${tourId}_steps_${currentStepIndex}`, JSON.stringify(steps));
  }
}
```

## Testing Requirements

### Integration Tests
```typescript
// src/__tests__/api/tours.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/app/api/tours/[id]/route';
import { TourService } from '@/lib/services';

describe('/api/tours/[id]', () => {
  let tourService: TourService;

  beforeEach(() => {
    tourService = new TourService();
  });

  describe('GET /api/tours/[id]', () => {
    it('should return tour configuration for authenticated user', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'tour-123' },
        headers: { authorization: 'Bearer valid-token' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.tour).toBeDefined();
      expect(data.steps).toBeInstanceOf(Array);
    });

    it('should return 401 for unauthenticated requests', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'tour-123' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
    });

    it('should return 404 for non-existent tours', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        query: { id: 'non-existent' },
        headers: { authorization: 'Bearer valid-token' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(404);
    });
  });

  describe('POST /api/tours/[id]', () => {
    it('should start tour and return progress ID', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'tour-123' },
        headers: { authorization: 'Bearer valid-token' },
        body: {
          device_type: 'desktop',
          viewport_size: { width: 1920, height: 1080 }
        }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.progress_id).toBeDefined();
      expect(data.current_step).toBeDefined();
    });

    it('should handle tour restart for existing progress', async () => {
      // Mock existing progress
      jest.spyOn(tourService, 'getUserProgress').mockResolvedValue({
        id: 'progress-123',
        status: 'in_progress',
        current_step_index: 2
      } as any);

      const { req, res } = createMocks({
        method: 'POST',
        query: { id: 'tour-123' },
        headers: { authorization: 'Bearer valid-token' },
        body: { device_type: 'mobile' }
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.progress_id).toBe('progress-123');
    });
  });
});

// Service layer tests
describe('TourService', () => {
  let service: TourService;

  beforeEach(() => {
    service = new TourService();
  });

  describe('getAvailableTours', () => {
    it('should filter tours by audience', async () => {
      const tours = await service.getAvailableTours({
        userId: 'user-123',
        organizationId: 'org-123',
        audience: ['couples']
      });

      expect(tours.every(tour => tour.target_audience.includes('couples'))).toBe(true);
    });

    it('should filter tours by wedding phase', async () => {
      const tours = await service.getAvailableTours({
        userId: 'user-123',
        organizationId: 'org-123',
        weddingPhase: 'engagement'
      });

      expect(tours.every(tour => tour.wedding_phase === 'engagement')).toBe(true);
    });

    it('should exclude completed tours when requested', async () => {
      const tours = await service.getAvailableTours({
        userId: 'user-123',
        organizationId: 'org-123',
        includeCompleted: false
      });

      expect(tours.every(tour => 
        !tour.user_tour_progress || 
        tour.user_tour_progress[0]?.status !== 'completed'
      )).toBe(true);
    });
  });

  describe('updateProgress', () => {
    it('should advance to next step', async () => {
      const result = await service.updateProgress({
        progressId: 'progress-123',
        action: 'next_step',
        interactionTimeMs: 5000
      });

      expect(result.progress.current_step_index).toBeGreaterThan(0);
      expect(result.nextStep).toBeDefined();
      expect(result.completed).toBe(false);
    });

    it('should mark tour as completed on last step', async () => {
      // Mock progress at last step
      jest.spyOn(service, 'getProgressById').mockResolvedValue({
        current_step_index: 9, // Assuming 10 total steps
        completed_steps: [0,1,2,3,4,5,6,7,8],
        total_time_seconds: 300
      } as any);

      jest.spyOn(service, 'getTotalSteps').mockResolvedValue(10);

      const result = await service.updateProgress({
        progressId: 'progress-123',
        action: 'next_step'
      });

      expect(result.completed).toBe(true);
      expect(result.progress.status).toBe('completed');
      expect(result.progress.completed_at).toBeDefined();
    });

    it('should handle step skipping', async () => {
      const result = await service.updateProgress({
        progressId: 'progress-123',
        action: 'skip_step'
      });

      expect(result.progress.skipped_steps).toContainEqual(
        expect.any(Number)
      );
    });
  });

  describe('A/B testing', () => {
    it('should assign consistent variants based on user ID', async () => {
      const variant1 = await service['getABTestVariant']('tour-123', 'user-123');
      const variant2 = await service['getABTestVariant']('tour-123', 'user-123');
      
      expect(variant1).toBe(variant2);
    });

    it('should distribute variants according to traffic split', async () => {
      const userIds = Array.from({ length: 1000 }, (_, i) => `user-${i}`);
      const variants = await Promise.all(
        userIds.map(id => service['getABTestVariant']('tour-123', id))
      );

      const variantA = variants.filter(v => v === 'a').length;
      const variantB = variants.filter(v => v === 'b').length;

      // Should be roughly 50/50 split (within 10% tolerance)
      expect(Math.abs(variantA - variantB) / 1000).toBeLessThan(0.1);
    });
  });
});
```

## Security Considerations

### Data Protection
- All tour progress data is encrypted at rest
- RLS policies ensure users can only access their own tour data
- Analytics data is anonymized for reporting
- GDPR compliance with data retention policies

### API Security
- JWT authentication required for all endpoints
- Rate limiting on tour progress updates (10 req/min per user)
- Input validation with Zod schemas
- SQL injection protection through parameterized queries

### A/B Testing Privacy
- User variant assignment is deterministic but not personally identifiable
- Test data cannot be traced back to individual users
- Aggregated metrics only for reporting

## Deployment Considerations

### Database Migration Strategy
1. Deploy schema changes during low-traffic hours
2. Run data validation scripts post-migration
3. Monitor query performance with new indexes
4. Rollback plan for each migration step

### Performance Monitoring
- Track API response times for tour endpoints
- Monitor database query performance
- Set up alerts for tour completion rate drops
- Real-time dashboard for tour system health

### Scaling Considerations
- Implement Redis caching for frequently accessed tours
- Consider CDN for static tour assets
- Database read replicas for analytics queries
- Horizontal scaling for high-traffic periods

---

## Wedding Context Integration

### Couple Journey Mapping
Tours are designed around real wedding planning milestones:
- **Engagement Phase**: Getting started with basic platform setup
- **Planning Phase**: Deep feature exploration and workflow establishment
- **Final Month**: Streamlined workflows and stress-reduction features
- **Wedding Week**: Essential functions only, minimal cognitive load
- **Post-Wedding**: Thank you management, photo sharing, vendor reviews

### Emotional Context Awareness
The backend tracks emotional indicators:
- High abandonment rates may indicate overwhelm
- Frequent help requests signal confusion
- Long interaction times may suggest uncertainty
- Positive feedback correlates with wedding planning confidence

### Vendor-Specific Adaptations
Different supplier types receive customized tour experiences:
- **Photographers**: Focus on gallery organization and client delivery
- **Venues**: Emphasize booking management and event coordination
- **Florists**: Highlight design tools and client communication
- **Planners**: Comprehensive workflow and client management features

This backend system provides the robust foundation for creating truly helpful, context-aware tour experiences that guide couples and vendors through the complexities of wedding planning with confidence and ease.

---

**Estimated Implementation Time**: 15-20 development days
**Team Dependencies**: Requires coordination with Team A for UI integration
**Critical Success Metrics**: 
- Tour completion rate >60%
- Average tour duration <15 minutes
- User satisfaction score >4.2/5
- System response time <200ms
- Zero data loss incidents