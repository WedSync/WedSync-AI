# WS-237: Feature Request Management System - Technical Specification

## Executive Summary

A comprehensive feature request management system that enables wedding suppliers and couples to suggest, vote on, and track feature requests. The system includes AI-powered duplicate detection, RICE scoring, roadmap integration, and transparency features designed for the wedding industry context.

**Estimated Effort**: 120 hours
- **Frontend**: 40 hours (33%)
- **Backend**: 45 hours (37%)
- **Integration**: 20 hours (17%)  
- **Platform**: 10 hours (8%)
- **General**: 5 hours (5%)

**Business Impact**: 
- Increase product-market fit through user-driven development
- Reduce feature request noise through intelligent duplicate detection
- Improve user engagement and satisfaction through transparency
- Enable data-driven roadmap planning with wedding-specific priorities

## User Story

**As a** wedding photographer supplier  
**I want to** suggest a new feature for automatic gallery organization by event date  
**So that** I can reduce the 2-3 hours I spend manually organizing photos after each wedding

**Acceptance Criteria**:
- ✅ Can submit detailed feature requests with business context
- ✅ System detects similar existing requests and merges intelligently
- ✅ Other suppliers can vote and add use cases
- ✅ RICE scoring automatically calculates priority
- ✅ Can track request status from submission to release
- ✅ Product team receives actionable prioritization data
- ✅ Transparent roadmap shows planned features by quarter

## Database Schema

```sql
-- Feature requests with wedding industry context
CREATE TABLE feature_requests (
  id VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category feature_category_enum NOT NULL,
  
  -- Wedding industry requester context
  requester_id UUID REFERENCES users(id),
  requester_type requester_type_enum,
  requester_tier tier_enum,
  account_value DECIMAL(10,2),
  wedding_season_context JSONB, -- June: peak season context
  vendor_type vendor_type_enum,
  
  -- Detailed requirements
  problem TEXT,
  solution TEXT,
  alternatives TEXT[],
  expected_impact TEXT,
  urgency urgency_enum,
  affects_wedding_day BOOLEAN DEFAULT FALSE, -- Critical priority flag
  
  -- RICE scoring
  rice_score DECIMAL(10,2),
  reach_score DECIMAL(8,2),
  impact_score DECIMAL(5,2),
  confidence_score DECIMAL(3,2),
  effort_weeks DECIMAL(5,2),
  business_value INTEGER,
  user_votes INTEGER DEFAULT 0,
  mrr_impact DECIMAL(10,2),
  
  -- Status and timeline
  status request_status_enum NOT NULL DEFAULT 'submitted',
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  planned_at TIMESTAMPTZ,
  developed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  release_version VARCHAR(20),
  
  -- Wedding industry metadata
  tags TEXT[],
  competitor_feature BOOLEAN DEFAULT FALSE,
  quick_win BOOLEAN DEFAULT FALSE,
  enterprise_interest BOOLEAN DEFAULT FALSE,
  wedding_season_impact DECIMAL(3,2), -- Multiplier for peak season
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE feature_category_enum AS ENUM (
  'forms', 'journey', 'communication', 'automation', 
  'integrations', 'analytics', 'collaboration', 'payments', 
  'mobile', 'performance', 'guest_management', 'vendor_coordination',
  'timeline_planning', 'budget_tracking'
);

CREATE TYPE requester_type_enum AS ENUM ('supplier', 'couple');
CREATE TYPE tier_enum AS ENUM ('free', 'starter', 'professional', 'scale', 'enterprise');
CREATE TYPE vendor_type_enum AS ENUM (
  'photographer', 'planner', 'venue', 'caterer', 'florist', 
  'musician', 'baker', 'officiant', 'decorator', 'other'
);

CREATE TYPE urgency_enum AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE request_status_enum AS ENUM (
  'submitted', 'under_review', 'gathering_feedback', 'planned',
  'in_development', 'beta', 'released', 'declined', 'duplicate'
);

-- User voting system with wedding industry context
CREATE TABLE feature_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  user_id UUID REFERENCES users(id),
  vote vote_type_enum, -- 'up' or 'down'
  vote_weight DECIMAL(3,2) DEFAULT 1.0, -- Enterprise users get higher weight
  vendor_context JSONB, -- Wedding vendor specific use case
  voted_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(request_id, user_id),
  INDEX idx_votes_request (request_id),
  INDEX idx_votes_user (user_id)
);

CREATE TYPE vote_type_enum AS ENUM ('up', 'down');

-- Additional context from merged duplicate requests
CREATE TABLE feature_request_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  user_id UUID REFERENCES users(id),
  description TEXT,
  use_case TEXT,
  wedding_scenario TEXT, -- Specific wedding context
  priority_reason TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_context_request (request_id)
);

-- Community discussion and feedback
CREATE TABLE feature_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  user_id UUID REFERENCES users(id),
  comment TEXT NOT NULL,
  is_team_member BOOLEAN DEFAULT FALSE,
  is_product_update BOOLEAN DEFAULT FALSE, -- Official status updates
  wedding_context TEXT, -- Industry-specific insights
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,
  
  INDEX idx_comments_request (request_id),
  INDEX idx_comments_created (created_at DESC)
);

-- Roadmap planning with wedding seasonality
CREATE TABLE roadmap_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  quarter VARCHAR(10), -- 'Q2 2025' (before peak wedding season)
  theme VARCHAR(100),
  priority INTEGER,
  estimated_weeks DECIMAL(5,2),
  assigned_team VARCHAR(100),
  status roadmap_status_enum,
  wedding_season_priority BOOLEAN DEFAULT FALSE, -- Must ship before peak season
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_roadmap_quarter (quarter),
  INDEX idx_roadmap_priority (priority)
);

CREATE TYPE roadmap_status_enum AS ENUM (
  'planned', 'in_progress', 'completed', 'delayed', 'cancelled'
);

-- Post-release success metrics
CREATE TABLE feature_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  
  -- Adoption metrics
  users_adopted INTEGER,
  adoption_rate DECIMAL(5,2),
  supplier_adoption_rate DECIMAL(5,2), -- Supplier vs couple adoption
  couple_adoption_rate DECIMAL(5,2),
  
  -- Business impact
  mrr_impact_actual DECIMAL(10,2),
  retention_impact DECIMAL(5,2),
  nps_impact DECIMAL(5,2),
  efficiency_gain_hours DECIMAL(8,2), -- Time saved for suppliers
  
  -- Usage patterns
  daily_active_users INTEGER,
  feature_engagement_rate DECIMAL(5,2),
  peak_usage_during_season DECIMAL(5,2), -- June wedding season impact
  
  measured_at TIMESTAMPTZ DEFAULT NOW(),
  INDEX idx_metrics_request (request_id),
  INDEX idx_metrics_measured (measured_at DESC)
);

-- Feature request analytics tracking
CREATE TABLE request_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  
  view_count INTEGER DEFAULT 0,
  detail_views INTEGER DEFAULT 0,
  vote_conversions INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- Wedding industry specific metrics
  supplier_interest_score DECIMAL(5,2),
  couple_interest_score DECIMAL(5,2),
  seasonal_interest_pattern JSONB, -- Interest by wedding season
  
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Database indexes for performance
CREATE INDEX idx_requests_status ON feature_requests(status);
CREATE INDEX idx_requests_category ON feature_requests(category);
CREATE INDEX idx_requests_votes ON feature_requests(user_votes DESC);
CREATE INDEX idx_requests_rice ON feature_requests(rice_score DESC);
CREATE INDEX idx_requests_submitted ON feature_requests(submitted_at DESC);
CREATE INDEX idx_requests_vendor_type ON feature_requests(vendor_type);
CREATE INDEX idx_requests_wedding_priority ON feature_requests(affects_wedding_day);

-- Performance optimization for RICE score calculations
CREATE INDEX idx_requests_rice_components ON feature_requests(
  reach_score DESC, impact_score DESC, confidence_score DESC, effort_weeks ASC
);
```

## API Endpoints

### Feature Request Management

```typescript
// Feature request submission with wedding industry context
POST /api/feature-requests
interface CreateFeatureRequestRequest {
  title: string;
  description: string;
  category: FeatureCategory;
  problem: string;
  solution: string;
  alternatives?: string[];
  expectedImpact: string;
  urgency: UrgencyLevel;
  weddingContext?: {
    affectsWeddingDay: boolean;
    seasonalImportance: 'low' | 'medium' | 'high';
    vendorType: VendorType;
    clientImpact: string;
  };
  competitorHasThis?: boolean;
  attachments?: FileUpload[];
}

interface CreateFeatureRequestResponse {
  request: FeatureRequest;
  duplicateCheck: {
    foundSimilar: boolean;
    similarRequests?: FeatureRequest[];
    autoMerged?: boolean;
  };
  initialScoring: RICEScore;
}

// Feature request retrieval with filtering
GET /api/feature-requests
interface GetFeatureRequestsQuery {
  status?: RequestStatus | 'all';
  category?: FeatureCategory | 'all';
  sortBy?: 'votes' | 'recent' | 'rice' | 'wedding_priority';
  vendorType?: VendorType;
  userTier?: TierLevel;
  includeReleased?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

// Voting system with wedding industry weighting
POST /api/feature-requests/:id/vote
interface VoteRequest {
  vote: 'up' | 'down';
  context?: {
    useCase: string;
    weddingScenario: string;
    priorityReason: string;
  };
}

// Community discussion
POST /api/feature-requests/:id/comments
interface AddCommentRequest {
  comment: string;
  weddingContext?: string;
  isProductUpdate?: boolean; // Team members only
}

// Feature request details with full context
GET /api/feature-requests/:id
interface FeatureRequestDetails extends FeatureRequest {
  votes: FeatureVote[];
  comments: FeatureComment[];
  additionalContext: FeatureRequestContext[];
  relatedRequests: FeatureRequest[];
  roadmapStatus?: RoadmapItem;
  metrics?: FeatureMetrics;
}
```

### RICE Scoring & Analytics

```typescript
// RICE score calculation endpoint
GET /api/feature-requests/:id/rice-score
interface RICEScoreDetails {
  score: number;
  components: {
    reach: {
      value: number;
      factors: string[];
      calculation: string;
    };
    impact: {
      value: number;
      factors: string[];
      businessValue: number;
      weddingSeasonMultiplier: number;
    };
    confidence: {
      value: number;
      factors: string[];
      dataPoints: number;
    };
    effort: {
      value: number;
      factors: string[];
      complexity: string;
    };
  };
  lastCalculated: Date;
}

// Feature request analytics
GET /api/analytics/feature-requests
interface FeatureRequestAnalytics {
  summary: {
    totalRequests: number;
    activeRequests: number;
    releasedFeatures: number;
    averageTimeToRelease: number;
    communityEngagement: number;
  };
  trends: {
    submissionRate: TimeSeriesData[];
    categoryDistribution: CategoryCount[];
    userEngagement: EngagementMetrics;
    seasonalPatterns: SeasonalData[];
  };
  topRequests: {
    byVotes: FeatureRequest[];
    byRICE: FeatureRequest[];
    byWeddingPriority: FeatureRequest[];
  };
}
```

### Roadmap Integration

```typescript
// Roadmap generation
GET /api/roadmap/:quarter
interface RoadmapResponse {
  quarter: string;
  themes: RoadmapTheme[];
  capacity: {
    totalWeeks: number;
    allocated: number;
    remaining: number;
  };
  timeline: RoadmapTimeline[];
  expectedOutcomes: ExpectedOutcome[];
  weddingSeasonConsiderations: {
    peakSeasonDeadlines: Date[];
    criticalFeatures: FeatureRequest[];
    resourceAllocation: ResourcePlan;
  };
}

// Roadmap communication
POST /api/roadmap/:quarter/publish
interface PublishRoadmapRequest {
  audience: 'internal' | 'customer' | 'investor';
  includeTimelines: boolean;
  includeConfidentialFeatures: boolean;
}
```

## Frontend Components

### Feature Request Portal

```tsx
// Main feature request portal with wedding industry filtering
// components/features/FeatureRequestPortal.tsx
import React, { useState, useEffect } from 'react';
import { useFeatureRequests, useUser } from '@/hooks';
import { FeatureRequestCard } from './FeatureRequestCard';
import { SubmitRequestModal } from './SubmitRequestModal';
import { FilterBar } from './FilterBar';
import { StatsOverview } from './StatsOverview';

export function FeatureRequestPortal() {
  const { user } = useUser();
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [filters, setFilters] = useState<RequestFilters>({
    status: 'all',
    category: 'all',
    vendorType: 'all',
    sortBy: 'votes'
  });
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  const {
    data: requestsData,
    isLoading,
    refetch
  } = useFeatureRequests(filters);

  return (
    <div className="feature-request-portal max-w-7xl mx-auto p-6">
      {/* Portal Header */}
      <div className="portal-header mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Feature Requests
            </h1>
            <p className="text-gray-600 mt-2">
              Help shape the future of WedSync with your ideas
            </p>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5 mr-2" />
            Request Feature
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <StatsOverview
        stats={{
          totalRequests: requestsData?.totalCount || 0,
          plannedFeatures: requestsData?.planned || 0,
          inDevelopment: requestsData?.inDevelopment || 0,
          recentlyReleased: requestsData?.recentReleased || 0,
          userVotes: requestsData?.userVotes || 0
        }}
      />

      {/* Filters and Search */}
      <FilterBar
        filters={filters}
        onFiltersChange={setFilters}
        userType={user.userType}
        vendorType={user.vendorType}
      />

      {/* Feature Requests List */}
      <div className="requests-grid">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6">
            {[1, 2, 3, 4, 5].map(i => (
              <FeatureRequestSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {requestsData?.requests.map(request => (
              <FeatureRequestCard
                key={request.id}
                request={request}
                onVote={handleVote}
                userVote={getUserVote(request.id)}
                isOwner={request.requester.userId === user.id}
                showWeddingContext={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSubmitModal && (
        <SubmitRequestModal
          onClose={() => setShowSubmitModal(false)}
          onSubmit={handleSubmitRequest}
          userContext={{
            userType: user.userType,
            vendorType: user.vendorType,
            tier: user.tier
          }}
        />
      )}
    </div>
  );
}

// Individual feature request card with wedding industry context
export function FeatureRequestCard({
  request,
  onVote,
  userVote,
  isOwner,
  showWeddingContext = true
}: FeatureRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="request-card bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex gap-4">
          {/* Voting Section */}
          <div className="flex flex-col items-center space-y-2">
            <button
              onClick={() => onVote('up')}
              className={`vote-btn p-2 rounded-lg transition-colors ${
                userVote === 'up'
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <span className="font-semibold text-lg">
              {request.scoring.userVotes}
            </span>
            <button
              onClick={() => onVote('down')}
              className={`vote-btn p-2 rounded-lg transition-colors ${
                userVote === 'down'
                  ? 'bg-red-100 text-red-600'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
              }`}
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Content Section */}
          <div className="flex-1">
            <div className="request-header mb-3">
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {request.title}
                </h3>
                <div className="flex gap-2 ml-4">
                  {/* Status Badge */}
                  <StatusBadge status={request.status} />
                  {/* Category Badge */}
                  <CategoryBadge category={request.category} />
                  {/* Wedding Priority Badge */}
                  {request.details.affectsWeddingDay && (
                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-semibold">
                      Wedding Day Critical
                    </span>
                  )}
                  {/* Competitor Feature Badge */}
                  {request.metadata.competitorFeature && (
                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded-full text-xs font-semibold">
                      Competitor Has
                    </span>
                  )}
                </div>
              </div>

              {/* Wedding Context */}
              {showWeddingContext && request.weddingContext && (
                <div className="wedding-context mb-3 p-3 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="w-4 h-4 text-purple-600" />
                    <span className="text-purple-800 font-medium">
                      Wedding Context:
                    </span>
                  </div>
                  <div className="mt-1 text-sm text-purple-700">
                    <span className="font-medium">Vendor:</span> {request.weddingContext.vendorType} • 
                    <span className="font-medium ml-2">Impact:</span> {request.weddingContext.clientImpact}
                  </div>
                </div>
              )}
            </div>

            <p className="text-gray-700 mb-4">
              {expanded 
                ? request.description 
                : `${request.description.substring(0, 200)}${request.description.length > 200 ? '...' : ''}`
              }
            </p>

            {/* RICE Score Display */}
            <div className="rice-score-display mb-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <span className="text-gray-600">Priority Score:</span>
                  <span className="font-bold text-purple-600 text-lg">
                    {request.scoring.rice.score.toFixed(1)}
                  </span>
                </div>
                <div className="text-gray-500">
                  R:{request.scoring.rice.reach} • 
                  I:{request.scoring.rice.impact} • 
                  C:{request.scoring.rice.confidence} • 
                  E:{request.scoring.rice.effort}w
                </div>
              </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
              <div className="expanded-content space-y-4">
                <div className="problem-section">
                  <h4 className="font-semibold text-gray-900 mb-2">Problem</h4>
                  <p className="text-gray-700">{request.details.problem}</p>
                </div>

                <div className="solution-section">
                  <h4 className="font-semibold text-gray-900 mb-2">Proposed Solution</h4>
                  <p className="text-gray-700">{request.details.solution}</p>
                </div>

                <div className="impact-section">
                  <h4 className="font-semibold text-gray-900 mb-2">Expected Impact</h4>
                  <p className="text-gray-700">{request.details.impact}</p>
                </div>

                {/* Additional Context from Supporters */}
                {request.additionalContext && request.additionalContext.length > 0 && (
                  <div className="supporters-section">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      Community Support ({request.additionalContext.length})
                    </h4>
                    <div className="space-y-3">
                      {request.additionalContext.map((context, idx) => (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg">
                          <div className="flex items-start gap-2">
                            <UserAvatar userId={context.userId} size="sm" />
                            <div className="flex-1">
                              <p className="text-sm text-gray-700 mb-1">
                                {context.description}
                              </p>
                              {context.weddingScenario && (
                                <p className="text-xs text-purple-600">
                                  Wedding scenario: {context.weddingScenario}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="request-footer flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  {expanded ? 'Show Less' : 'Show More'}
                </button>
                <button
                  onClick={() => setShowDetails(true)}
                  className="text-sm text-gray-600 hover:text-gray-700 font-medium"
                >
                  View Details
                </button>
              </div>

              <div className="text-sm text-gray-500">
                <span>Requested {formatTimeAgo(request.timeline.submitted)}</span>
                {request.timeline.planned && (
                  <span className="ml-2">• Planned for {formatDate(request.timeline.planned)}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Release Banner */}
      {request.status === 'released' && (
        <div className="release-banner bg-green-50 border-t border-green-200 p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">
              Released in version {request.releaseVersion}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
```

### Feature Request Submission Modal

```tsx
// Advanced feature request submission with wedding context
// components/features/SubmitRequestModal.tsx
export function SubmitRequestModal({
  onClose,
  onSubmit,
  userContext
}: SubmitRequestModalProps) {
  const [formData, setFormData] = useState<FeatureRequestForm>({
    title: '',
    description: '',
    category: '',
    problem: '',
    solution: '',
    alternatives: [''],
    expectedImpact: '',
    urgency: 'medium',
    weddingContext: {
      affectsWeddingDay: false,
      seasonalImportance: 'medium',
      vendorType: userContext.vendorType || '',
      clientImpact: ''
    },
    competitorHasThis: false,
    attachments: []
  });

  const [duplicateCheck, setDuplicateCheck] = useState<DuplicateCheckResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Real-time duplicate detection
  useEffect(() => {
    if (formData.title.length > 10 && formData.description.length > 50) {
      const debounced = debounce(async () => {
        const result = await checkForDuplicates({
          title: formData.title,
          description: formData.description,
          category: formData.category
        });
        setDuplicateCheck(result);
      }, 1000);

      debounced();
    }
  }, [formData.title, formData.description, formData.category]);

  return (
    <Modal isOpen onClose={onClose} size="xl">
      <div className="submit-request-modal">
        <div className="modal-header p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">
            Request New Feature
          </h2>
          <p className="text-gray-600 mt-1">
            Help us understand what would make your wedding business more efficient
          </p>
        </div>

        <form onSubmit={handleSubmit} className="modal-content p-6 space-y-6">
          {/* Basic Information */}
          <div className="section">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Basic Information
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Feature Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => updateFormData('title', e.target.value)}
                  placeholder="e.g., Automatic photo gallery organization by event date"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category *
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => updateFormData('category', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="automation">Automation</option>
                  <option value="communication">Communication</option>
                  <option value="guest_management">Guest Management</option>
                  <option value="vendor_coordination">Vendor Coordination</option>
                  <option value="timeline_planning">Timeline Planning</option>
                  <option value="analytics">Analytics & Reporting</option>
                  <option value="integrations">Integrations</option>
                  <option value="mobile">Mobile Experience</option>
                  <option value="performance">Performance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => updateFormData('description', e.target.value)}
                  placeholder="Describe your feature idea in detail..."
                  rows={4}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Duplicate Check Results */}
          {duplicateCheck && duplicateCheck.foundSimilar && (
            <div className="duplicate-alert bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-yellow-800 mb-2">
                    Similar Request Found
                  </h4>
                  <p className="text-yellow-700 text-sm mb-3">
                    We found a similar request that you might want to support instead:
                  </p>
                  <div className="space-y-2">
                    {duplicateCheck.similarRequests.map(req => (
                      <div key={req.id} className="bg-white p-3 rounded border">
                        <h5 className="font-medium text-gray-900">{req.title}</h5>
                        <p className="text-sm text-gray-600 mt-1">{req.description.substring(0, 100)}...</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm text-purple-600">{req.scoring.userVotes} votes</span>
                          <button
                            type="button"
                            onClick={() => redirectToExisting(req.id)}
                            className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200"
                          >
                            Vote & Add Context
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setDuplicateCheck(null)}
                      className="text-sm text-yellow-700 hover:text-yellow-800 font-medium"
                    >
                      Continue with my request anyway
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Problem & Solution */}
          <div className="section">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Problem & Solution
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What problem does this solve? *
                </label>
                <textarea
                  value={formData.problem}
                  onChange={(e) => updateFormData('problem', e.target.value)}
                  placeholder="Describe the specific problem you're facing..."
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proposed solution *
                </label>
                <textarea
                  value={formData.solution}
                  onChange={(e) => updateFormData('solution', e.target.value)}
                  placeholder="How would you like this feature to work?"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current workarounds (if any)
                </label>
                {formData.alternatives.map((alt, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={alt}
                      onChange={(e) => updateAlternative(index, e.target.value)}
                      placeholder="How do you currently handle this?"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeAlternative(index)}
                        className="p-3 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAlternative}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  + Add another workaround
                </button>
              </div>
            </div>
          </div>

          {/* Wedding Industry Context */}
          {userContext.userType === 'supplier' && (
            <div className="section">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Wedding Industry Context
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="weddingDay"
                    checked={formData.weddingContext.affectsWeddingDay}
                    onChange={(e) => updateWeddingContext('affectsWeddingDay', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="weddingDay" className="text-sm font-medium text-gray-700">
                    This feature is critical for wedding day operations
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Impact on your clients
                  </label>
                  <textarea
                    value={formData.weddingContext.clientImpact}
                    onChange={(e) => updateWeddingContext('clientImpact', e.target.value)}
                    placeholder="How would this feature benefit the couples you work with?"
                    rows={2}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seasonal importance
                  </label>
                  <select
                    value={formData.weddingContext.seasonalImportance}
                    onChange={(e) => updateWeddingContext('seasonalImportance', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="low">Low - Not season dependent</option>
                    <option value="medium">Medium - Helpful during busy seasons</option>
                    <option value="high">High - Critical for peak wedding season</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Impact & Priority */}
          <div className="section">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Impact & Priority
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Expected impact *
                </label>
                <textarea
                  value={formData.expectedImpact}
                  onChange={(e) => updateFormData('expectedImpact', e.target.value)}
                  placeholder="What would be the impact if this feature existed?"
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency Level
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'low', label: 'Low - Nice to have', color: 'gray' },
                    { value: 'medium', label: 'Medium - Would improve efficiency', color: 'blue' },
                    { value: 'high', label: 'High - Significant impact', color: 'orange' },
                    { value: 'critical', label: 'Critical - Blocking business', color: 'red' }
                  ].map((urgency) => (
                    <label
                      key={urgency.value}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        formData.urgency === urgency.value
                          ? `border-${urgency.color}-500 bg-${urgency.color}-50`
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="urgency"
                        value={urgency.value}
                        checked={formData.urgency === urgency.value}
                        onChange={(e) => updateFormData('urgency', e.target.value)}
                        className="sr-only"
                      />
                      <span className="text-sm font-medium">{urgency.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="competitor"
                  checked={formData.competitorHasThis}
                  onChange={(e) => updateFormData('competitorHasThis', e.target.checked)}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="competitor" className="text-sm font-medium text-gray-700">
                  A competitor already has this feature
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="modal-footer flex justify-end gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
```

## Business Logic Implementation

### RICE Scorer with Wedding Industry Context

```typescript
// lib/features/weddingRiceScorer.ts
export class WeddingIndustryRICEScorer {
  private readonly weddingSeasonMultiplier = {
    // Wedding season demand patterns
    1: 0.7,   // January - low season
    2: 0.8,   // February - low-medium
    3: 0.9,   // March - medium
    4: 1.2,   // April - high
    5: 1.4,   // May - peak lead-up
    6: 1.6,   // June - peak season
    7: 1.5,   // July - peak
    8: 1.4,   // August - peak
    9: 1.3,   // September - high
    10: 1.2,  // October - high
    11: 0.8,  // November - medium-low
    12: 0.6   // December - lowest
  };

  private readonly vendorTypeWeights = {
    photographer: 1.2,    // High feature adoption
    planner: 1.3,         // Most feature-demanding
    venue: 1.0,           // Standard adoption
    caterer: 0.9,         // Lower tech adoption
    florist: 0.8,         // Lower tech adoption
    musician: 0.7,        // Lower tech adoption
    baker: 0.7,           // Lower tech adoption
    officiant: 0.6,       // Lowest tech adoption
    decorator: 0.8,       // Lower tech adoption
    other: 0.9            // Average
  };

  async calculateWeddingRICE(request: EnrichedFeatureRequest): Promise<WeddingRICEScore> {
    const baseRICE = await this.calculateBaseRICE(request);
    
    // Apply wedding industry modifiers
    const weddingModifiedRICE = this.applyWeddingModifiers(baseRICE, request);
    
    return {
      ...weddingModifiedRICE,
      weddingFactors: {
        seasonalMultiplier: this.calculateSeasonalMultiplier(request),
        vendorTypeWeight: this.vendorTypeWeights[request.requester.vendorType] || 1,
        weddingDayImportance: request.weddingContext?.affectsWeddingDay ? 1.5 : 1,
        peakSeasonUrgency: this.calculatePeakSeasonUrgency(request)
      }
    };
  }

  private applyWeddingModifiers(
    baseRICE: RICEScore, 
    request: EnrichedFeatureRequest
  ): WeddingRICEScore {
    let modifiedScore = baseRICE.score;

    // Wedding day critical features get priority boost
    if (request.weddingContext?.affectsWeddingDay) {
      modifiedScore *= 1.5;
    }

    // Peak season features get timing boost
    const seasonalUrgency = this.calculatePeakSeasonUrgency(request);
    if (seasonalUrgency > 1) {
      modifiedScore *= seasonalUrgency;
    }

    // Vendor type adoption likelihood
    const vendorWeight = this.vendorTypeWeights[request.requester.vendorType] || 1;
    modifiedScore *= vendorWeight;

    // High-value vendor tiers get amplification
    if (request.requester.userTier === 'enterprise') {
      modifiedScore *= 1.3;
    } else if (request.requester.userTier === 'scale') {
      modifiedScore *= 1.2;
    }

    return {
      ...baseRICE,
      score: modifiedScore,
      weddingAdjustedScore: modifiedScore
    };
  }

  private calculateSeasonalMultiplier(request: EnrichedFeatureRequest): number {
    const currentMonth = new Date().getMonth() + 1;
    const baseMultiplier = this.weddingSeasonMultiplier[currentMonth];

    // If feature affects wedding day and we're approaching peak season
    if (request.weddingContext?.affectsWeddingDay) {
      const monthsToJune = (6 - currentMonth + 12) % 12;
      if (monthsToJune <= 3) {
        // Within 3 months of peak season - boost priority
        return baseMultiplier * 1.3;
      }
    }

    return baseMultiplier;
  }

  private calculatePeakSeasonUrgency(request: EnrichedFeatureRequest): number {
    if (request.weddingContext?.seasonalImportance === 'high') {
      const currentMonth = new Date().getMonth() + 1;
      const monthsToJune = (6 - currentMonth + 12) % 12;
      
      if (monthsToJune <= 2) {
        return 1.8; // Very urgent - peak season approaching
      } else if (monthsToJune <= 4) {
        return 1.4; // Urgent - need to ship before peak
      }
    }
    
    return 1.0; // No seasonal urgency
  }

  async calculateReach(request: EnrichedFeatureRequest): Promise<number> {
    let reach = 0;

    // Base votes and similar requests
    reach += request.scoring.userVotes * 1.2;
    
    // Estimate market segment size
    const segmentData = await this.getWeddingMarketSegment(request);
    const adoptionRate = this.estimateVendorAdoption(request);
    
    reach += segmentData.totalVendors * adoptionRate;

    // Account for seasonal demand variation
    const seasonalMultiplier = this.calculateSeasonalMultiplier(request);
    reach *= seasonalMultiplier;

    // Wedding day features affect more stakeholders
    if (request.weddingContext?.affectsWeddingDay) {
      // Each vendor affects multiple couples/events
      reach *= 2.5; // Average vendor handles 2-3 weddings per weekend in peak season
    }

    return Math.min(reach, segmentData.marketCap);
  }

  async calculateImpact(request: EnrichedFeatureRequest): Promise<number> {
    let impact = 1.0; // Base medium impact

    // Revenue impact assessment
    if (request.scoring.mrr_impact > 2000) impact = 3.0;
    else if (request.scoring.mrr_impact > 1000) impact = 2.5;
    else if (request.scoring.mrr_impact > 500) impact = 2.0;
    else if (request.scoring.mrr_impact > 100) impact = 1.5;

    // Wedding industry specific impact factors
    if (request.weddingContext?.affectsWeddingDay) {
      impact += 1.0; // Wedding day features have massive impact
    }

    if (request.details.expectedImpact.toLowerCase().includes('time sav')) {
      impact += 0.5; // Time-saving is critical for wedding vendors
    }

    if (request.details.expectedImpact.toLowerCase().includes('client satisfaction')) {
      impact += 0.7; // Client satisfaction drives referrals
    }

    // Efficiency gains during peak season are amplified
    if (request.weddingContext?.seasonalImportance === 'high') {
      impact *= 1.3;
    }

    // Vendor type impact variation
    const vendorWeight = this.vendorTypeWeights[request.requester.vendorType] || 1;
    if (vendorWeight > 1) {
      impact *= Math.min(vendorWeight, 1.2); // Cap multiplier effect
    }

    return Math.min(impact, 3.0);
  }

  private async getWeddingMarketSegment(
    request: EnrichedFeatureRequest
  ): Promise<MarketSegment> {
    // Get wedding industry market data
    const vendorCounts = await this.getVendorTypeCounts();
    const categoryRelevance = await this.getCategoryRelevance(request.category);

    return {
      totalVendors: vendorCounts[request.requester.vendorType] || 0,
      relevantVendors: Math.floor(
        vendorCounts[request.requester.vendorType] * categoryRelevance
      ),
      marketCap: vendorCounts.total,
      seasonalVariation: this.weddingSeasonMultiplier
    };
  }

  private estimateVendorAdoption(request: EnrichedFeatureRequest): number {
    let baseAdoption = 0.15; // 15% base adoption rate

    // Category-based adoption rates
    const categoryAdoption = {
      automation: 0.25,           // High - saves time
      guest_management: 0.30,     // Very high - core need
      communication: 0.35,        // Very high - essential
      vendor_coordination: 0.20,  // Medium-high
      timeline_planning: 0.25,    // High
      analytics: 0.15,            // Medium - nice to have
      integrations: 0.20,         // Medium-high
      mobile: 0.40,               // Very high - on-the-go
      performance: 0.10           // Lower - behind the scenes
    };

    baseAdoption = categoryAdoption[request.category] || baseAdoption;

    // Urgency affects adoption speed
    if (request.details.urgency === 'critical') baseAdoption *= 1.5;
    else if (request.details.urgency === 'high') baseAdoption *= 1.3;

    // Wedding day features have higher adoption
    if (request.weddingContext?.affectsWeddingDay) {
      baseAdoption *= 1.4;
    }

    return Math.min(baseAdoption, 0.6); // Cap at 60% adoption
  }
}
```

### Duplicate Detection with Wedding Context

```typescript
// lib/features/weddingDuplicateDetector.ts
export class WeddingDuplicateDetector {
  private readonly weddingTerms = [
    'wedding', 'bride', 'groom', 'couple', 'ceremony', 'reception',
    'venue', 'photographer', 'planner', 'guest', 'invitation',
    'timeline', 'vendor', 'supplier', 'event', 'celebration'
  ];

  private readonly categoryKeywords = {
    automation: ['automatic', 'auto', 'workflow', 'trigger', 'scheduled'],
    communication: ['message', 'email', 'notification', 'chat', 'contact'],
    guest_management: ['guest', 'rsvp', 'invitation', 'attendee', 'list'],
    vendor_coordination: ['vendor', 'supplier', 'coordination', 'booking'],
    timeline_planning: ['timeline', 'schedule', 'calendar', 'planning', 'date'],
    analytics: ['report', 'analytics', 'metrics', 'dashboard', 'insights']
  };

  async findSimilarRequests(
    request: FeatureRequestInput
  ): Promise<DuplicateCheckResult> {
    // Multi-layered similarity detection
    const titleSimilarity = await this.findTitleSimilarity(request.title);
    const descriptionSimilarity = await this.findDescriptionSimilarity(request.description);
    const categoryMatches = await this.findCategoryMatches(request);
    const weddingContextSimilarity = await this.findWeddingContextSimilarity(request);

    // Combine results with weighted scoring
    const allMatches = this.combineAndScoreMatches([
      { matches: titleSimilarity, weight: 0.4 },
      { matches: descriptionSimilarity, weight: 0.3 },
      { matches: categoryMatches, weight: 0.2 },
      { matches: weddingContextSimilarity, weight: 0.1 }
    ]);

    // Filter by similarity threshold
    const similarRequests = allMatches
      .filter(match => match.similarityScore > 0.7)
      .sort((a, b) => b.similarityScore - a.similarityScore)
      .slice(0, 3);

    return {
      foundSimilar: similarRequests.length > 0,
      similarRequests: similarRequests.map(m => m.request),
      bestMatch: similarRequests[0]?.request || null,
      similarityScores: similarRequests.map(m => ({
        requestId: m.request.id,
        score: m.similarityScore,
        matchFactors: m.matchFactors
      }))
    };
  }

  private async findTitleSimilarity(title: string): Promise<ScoredMatch[]> {
    // Normalize and tokenize title
    const normalizedTitle = this.normalizeText(title);
    const titleTokens = this.tokenize(normalizedTitle);
    const titleEmbedding = await this.generateEmbedding(normalizedTitle);

    // Query existing requests
    const query = `
      SELECT fr.*, 
             similarity(fr.title, $1) as text_similarity
      FROM feature_requests fr
      WHERE fr.status NOT IN ('declined', 'duplicate')
        AND fr.title % $1  -- PostgreSQL trigram similarity
      ORDER BY text_similarity DESC
      LIMIT 20;
    `;

    const candidates = await this.db.query(query, [normalizedTitle]);

    // Calculate combined similarity scores
    const scoredMatches: ScoredMatch[] = [];

    for (const candidate of candidates) {
      const candidateEmbedding = await this.generateEmbedding(candidate.title);
      const semanticSimilarity = this.calculateCosineSimilarity(titleEmbedding, candidateEmbedding);
      
      // Combine text and semantic similarity
      const combinedScore = (candidate.text_similarity * 0.6) + (semanticSimilarity * 0.4);
      
      if (combinedScore > 0.5) {
        scoredMatches.push({
          request: candidate,
          similarityScore: combinedScore,
          matchFactors: ['title_similarity']
        });
      }
    }

    return scoredMatches;
  }

  private async findWeddingContextSimilarity(
    request: FeatureRequestInput
  ): Promise<ScoredMatch[]> {
    // Find requests from same vendor type with similar context
    const query = `
      SELECT fr.*
      FROM feature_requests fr
      WHERE fr.requester_type = $1
        AND fr.vendor_type = $2
        AND fr.category = $3
        AND fr.status NOT IN ('declined', 'duplicate')
      ORDER BY fr.user_votes DESC, fr.rice_score DESC
      LIMIT 10;
    `;

    const candidates = await this.db.query(query, [
      request.requesterType,
      request.vendorType,
      request.category
    ]);

    const scoredMatches: ScoredMatch[] = [];

    for (const candidate of candidates) {
      let similarity = 0.3; // Base similarity for same context

      // Check for keyword overlap
      const requestKeywords = this.extractWeddingKeywords(request.description);
      const candidateKeywords = this.extractWeddingKeywords(candidate.description);
      const keywordOverlap = this.calculateKeywordOverlap(requestKeywords, candidateKeywords);
      
      similarity += keywordOverlap * 0.4;

      // Check wedding-specific factors
      if (request.affectsWeddingDay === candidate.affects_wedding_day) {
        similarity += 0.2;
      }

      if (similarity > 0.6) {
        scoredMatches.push({
          request: candidate,
          similarityScore: similarity,
          matchFactors: ['wedding_context', 'vendor_type', 'category']
        });
      }
    }

    return scoredMatches;
  }

  private extractWeddingKeywords(text: string): string[] {
    const normalizedText = this.normalizeText(text);
    const tokens = this.tokenize(normalizedText);
    
    return tokens.filter(token => 
      this.weddingTerms.some(term => token.includes(term)) ||
      Object.values(this.categoryKeywords).flat().some(keyword => token.includes(keyword))
    );
  }

  private calculateKeywordOverlap(keywords1: string[], keywords2: string[]): number {
    const set1 = new Set(keywords1);
    const set2 = new Set(keywords2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    // Use OpenAI embeddings for semantic similarity
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text
    });

    return response.data[0].embedding;
  }

  private calculateCosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    return dotProduct / (magnitudeA * magnitudeB);
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    return text
      .split(' ')
      .filter(token => token.length > 2)
      .filter(token => !this.isStopWord(token));
  }

  private isStopWord(word: string): boolean {
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'under', 'over'];
    return stopWords.includes(word);
  }
}
```

## Integration Points

### MCP Server Integration

```typescript
// Integration with Context7 for documentation
async function getFeatureImplementationGuidance(request: FeatureRequest): Promise<ImplementationGuidance> {
  const context7 = getMCPServer('context7');
  
  // Get relevant library documentation
  const libraryId = await context7.resolveLibraryId('next.js');
  const docs = await context7.getLibraryDocs(libraryId, {
    topic: request.category,
    tokens: 5000
  });

  return {
    suggestedApproach: generateImplementationApproach(request, docs),
    relevantLibraries: extractRelevantLibraries(docs),
    estimatedComplexity: assessImplementationComplexity(request, docs),
    prerequisites: identifyPrerequisites(request, docs)
  };
}

// Integration with PostgreSQL MCP for advanced queries
async function generateFeatureAnalytics(timeframe: string): Promise<FeatureAnalytics> {
  const postgres = getMCPServer('postgres');
  
  const query = `
    WITH feature_performance AS (
      SELECT 
        fr.category,
        COUNT(*) as total_requests,
        AVG(fr.rice_score) as avg_priority,
        SUM(fr.user_votes) as total_votes,
        COUNT(CASE WHEN fr.status = 'released' THEN 1 END) as released_count,
        AVG(CASE WHEN fr.status = 'released' 
                THEN EXTRACT(days FROM fr.released_at - fr.submitted_at) 
                END) as avg_delivery_days
      FROM feature_requests fr
      WHERE fr.submitted_at >= NOW() - INTERVAL '${timeframe}'
      GROUP BY fr.category
    ),
    vendor_engagement AS (
      SELECT 
        fr.vendor_type,
        COUNT(*) as requests_submitted,
        SUM(fv.vote_weight) as voting_participation
      FROM feature_requests fr
      LEFT JOIN feature_votes fv ON fr.id = fv.request_id
      WHERE fr.submitted_at >= NOW() - INTERVAL '${timeframe}'
      GROUP BY fr.vendor_type
    )
    SELECT * FROM feature_performance fp
    FULL OUTER JOIN vendor_engagement ve ON 1=1;
  `;

  const results = await postgres.query(query);
  
  return transformAnalyticsResults(results);
}
```

### Supabase Real-time Integration

```typescript
// Real-time updates for feature request status
export function useFeatureRequestUpdates(requestId: string) {
  const [request, setRequest] = useState<FeatureRequest | null>(null);
  const [updates, setUpdates] = useState<FeatureUpdate[]>([]);

  useEffect(() => {
    const channel = supabase
      .channel(`feature-request-${requestId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'feature_requests',
        filter: `id=eq.${requestId}`
      }, (payload) => {
        setRequest(payload.new as FeatureRequest);
        
        // Track status changes
        if (payload.old.status !== payload.new.status) {
          setUpdates(prev => [...prev, {
            type: 'status_change',
            from: payload.old.status,
            to: payload.new.status,
            timestamp: new Date()
          }]);
        }
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'feature_comments',
        filter: `request_id=eq.${requestId}`
      }, (payload) => {
        setUpdates(prev => [...prev, {
          type: 'new_comment',
          comment: payload.new,
          timestamp: new Date()
        }]);
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [requestId]);

  return { request, updates };
}
```

## Testing Strategy

### E2E Test Scenarios

```typescript
// tests/e2e/feature-requests.spec.ts
describe('Feature Request Management - Wedding Industry Flows', () => {
  test('Supplier submits wedding day critical feature request', async ({ page }) => {
    // Setup: Login as photographer
    await loginAsSupplier(page, { vendorType: 'photographer', tier: 'professional' });

    // Navigate to feature request portal
    await page.goto('/feature-requests');
    await page.click('[data-testid="request-feature-btn"]');

    // Fill out wedding-specific feature request
    await page.fill('[data-testid="title-input"]', 'Automatic timeline adjustments for weather delays');
    await page.selectOption('[data-testid="category-select"]', 'timeline_planning');
    await page.fill('[data-testid="description-textarea"]', 
      'When outdoor ceremonies get moved indoors due to weather, all timeline items should automatically adjust'
    );

    // Wedding context
    await page.check('[data-testid="wedding-day-critical"]');
    await page.selectOption('[data-testid="seasonal-importance"]', 'high');
    await page.fill('[data-testid="client-impact-textarea"]', 
      'Prevents chaos on wedding day when weather forces venue changes'
    );

    // Problem and solution
    await page.fill('[data-testid="problem-textarea"]', 
      'Currently spend 30-45 minutes manually adjusting every timeline when weather changes venue'
    );
    await page.fill('[data-testid="solution-textarea"]', 
      'System should detect venue changes and automatically recalculate timing based on new location logistics'
    );

    // Impact and urgency
    await page.fill('[data-testid="expected-impact-textarea"]', 
      'Save 30-45 minutes of stress during wedding day emergencies, improve client satisfaction'
    );
    await page.click('[data-testid="urgency-high"]');

    // Submit request
    await page.click('[data-testid="submit-request-btn"]');

    // Verify submission success and RICE calculation
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="rice-score"]')).toContainText(/\d+\.\d+/);
    
    // Verify wedding day priority badge
    await expect(page.locator('[data-testid="wedding-day-badge"]')).toBeVisible();
  });

  test('Duplicate detection merges similar wedding vendor requests', async ({ page }) => {
    // Setup: Create existing request
    await setupExistingRequest({
      title: 'Weather contingency timeline management',
      category: 'timeline_planning',
      vendorType: 'planner',
      weddingDayCritical: true
    });

    // Login as different vendor
    await loginAsSupplier(page, { vendorType: 'photographer', tier: 'scale' });
    await page.goto('/feature-requests');
    await page.click('[data-testid="request-feature-btn"]');

    // Enter similar request
    await page.fill('[data-testid="title-input"]', 'Automatic timeline updates for weather changes');
    await page.fill('[data-testid="description-textarea"]', 
      'Need automated way to adjust schedules when weather forces indoor ceremonies'
    );

    // Wait for duplicate detection
    await page.waitForSelector('[data-testid="duplicate-alert"]', { timeout: 5000 });
    
    // Verify similar request shown
    await expect(page.locator('[data-testid="similar-request"]')).toBeVisible();
    await expect(page.locator('[data-testid="similar-request-title"]'))
      .toContainText('Weather contingency timeline management');

    // Choose to support existing request
    await page.click('[data-testid="support-existing-btn"]');

    // Add additional context
    await page.fill('[data-testid="additional-context"]', 
      'As a photographer, this would help me coordinate with planners during weather emergencies'
    );
    await page.click('[data-testid="add-support-btn"]');

    // Verify merge success
    await expect(page.locator('[data-testid="merge-success"]')).toBeVisible();
    
    // Check vote count increased
    await expect(page.locator('[data-testid="vote-count"]')).toContainText('2');
  });

  test('RICE scoring prioritizes wedding season critical features', async ({ page }) => {
    // Setup requests with different wedding season contexts
    const requests = await setupTestRequests([
      {
        title: 'Basic analytics dashboard',
        category: 'analytics',
        weddingDayCritical: false,
        seasonalImportance: 'low',
        vendorType: 'photographer'
      },
      {
        title: 'Emergency guest communication system',
        category: 'communication',
        weddingDayCritical: true,
        seasonalImportance: 'high',
        vendorType: 'planner'
      }
    ]);

    await page.goto('/feature-requests?sortBy=rice');

    // Verify wedding-critical feature ranks higher
    const firstRequest = page.locator('[data-testid="request-card"]:first-child');
    await expect(firstRequest.locator('[data-testid="request-title"]'))
      .toContainText('Emergency guest communication system');

    // Verify RICE score display includes wedding factors
    await expect(firstRequest.locator('[data-testid="wedding-day-badge"]')).toBeVisible();
    await expect(firstRequest.locator('[data-testid="seasonal-priority-badge"]')).toBeVisible();

    // Check detailed RICE breakdown
    await firstRequest.click();
    await page.waitForSelector('[data-testid="rice-details"]');
    
    await expect(page.locator('[data-testid="wedding-multiplier"]')).toContainText('1.5x');
    await expect(page.locator('[data-testid="seasonal-multiplier"]')).toContainText(/1\.[3-6]x/);
  });

  test('Roadmap integration shows wedding season priorities', async ({ page }) => {
    // Setup requests planned for different quarters
    await setupRoadmapRequests([
      {
        quarter: 'Q1 2025',
        requests: ['Basic features', 'Nice-to-have improvements']
      },
      {
        quarter: 'Q2 2025',
        requests: ['Wedding season critical features', 'Peak performance optimizations']
      }
    ]);

    await page.goto('/roadmap');

    // Verify Q2 shows wedding season priority
    const q2Section = page.locator('[data-testid="quarter-Q2-2025"]');
    await expect(q2Section.locator('[data-testid="season-priority-banner"]')).toBeVisible();
    await expect(q2Section.locator('[data-testid="season-priority-banner"]'))
      .toContainText('Peak Wedding Season Priority');

    // Check feature prioritization
    const criticalFeature = q2Section.locator('[data-testid="feature-item"]').first();
    await expect(criticalFeature.locator('[data-testid="wedding-critical-badge"]')).toBeVisible();

    // Verify timeline shows pre-season deployment
    await expect(q2Section.locator('[data-testid="deployment-note"]'))
      .toContainText('Deploy before May 1st for peak season readiness');
  });

  test('Community engagement drives feature prioritization', async ({ page }) => {
    // Setup feature with growing community support
    const requestId = await createFeatureRequest({
      title: 'Multi-vendor collaboration workspace',
      category: 'collaboration',
      initialVotes: 15
    });

    // Simulate multiple vendors voting and adding context
    await simulateVotingActivity(requestId, [
      { vendorType: 'photographer', vote: 'up', context: 'Need to coordinate photo timelines with DJ' },
      { vendorType: 'planner', vote: 'up', context: 'Essential for managing vendor schedules' },
      { vendorType: 'caterer', vote: 'up', context: 'Would help coordinate meal service timing' },
      { vendorType: 'venue', vote: 'up', context: 'Need visibility into all vendor activities' }
    ]);

    await page.goto(`/feature-requests/${requestId}`);

    // Verify community engagement metrics
    await expect(page.locator('[data-testid="vote-count"]')).toContainText('19');
    await expect(page.locator('[data-testid="vendor-diversity"]')).toContainText('4 vendor types');
    
    // Check supporter context display
    const supportersSection = page.locator('[data-testid="supporters-section"]');
    await expect(supportersSection.locator('[data-testid="supporter-card"]')).toHaveCount(4);

    // Verify cross-vendor use case visibility
    await expect(supportersSection.locator('[data-testid="use-case-photographer"]'))
      .toContainText('coordinate photo timelines');
    await expect(supportersSection.locator('[data-testid="use-case-planner"]'))
      .toContainText('managing vendor schedules');

    // Check auto-escalation trigger
    await addMoreVotes(requestId, 35); // Push past threshold
    await page.reload();
    
    await expect(page.locator('[data-testid="status-badge"]')).toContainText('Under Review');
    await expect(page.locator('[data-testid="escalation-notice"]'))
      .toContainText('Auto-escalated due to community interest');
  });
});
```

## Success Metrics & KPIs

### Feature Request Health Dashboard

```sql
-- Feature Request Analytics Dashboard Queries
-- Wedding industry specific metrics

-- 1. Submission and Engagement Rates
WITH monthly_metrics AS (
  SELECT 
    DATE_TRUNC('month', submitted_at) as month,
    COUNT(*) as total_submissions,
    COUNT(DISTINCT requester_id) as unique_submitters,
    SUM(user_votes) as total_votes,
    COUNT(CASE WHEN affects_wedding_day THEN 1 END) as wedding_critical_count,
    
    -- Vendor engagement breakdown
    COUNT(CASE WHEN vendor_type = 'photographer' THEN 1 END) as photographer_requests,
    COUNT(CASE WHEN vendor_type = 'planner' THEN 1 END) as planner_requests,
    COUNT(CASE WHEN vendor_type = 'venue' THEN 1 END) as venue_requests,
    
    -- Seasonal patterns
    AVG(CASE WHEN EXTRACT(month FROM submitted_at) = 6 THEN 1.0 ELSE 0.0 END) as june_submission_rate,
    
    -- Quality metrics
    AVG(rice_score) as avg_quality_score,
    COUNT(CASE WHEN status = 'duplicate' THEN 1 END) as duplicate_rate
    
  FROM feature_requests 
  WHERE submitted_at >= NOW() - INTERVAL '12 months'
  GROUP BY month
)
SELECT 
  month,
  total_submissions,
  unique_submitters,
  ROUND((unique_submitters::FLOAT / total_submissions * 100)::numeric, 1) as diversity_rate,
  total_votes,
  ROUND((total_votes::FLOAT / total_submissions)::numeric, 2) as avg_votes_per_request,
  wedding_critical_count,
  ROUND((wedding_critical_count::FLOAT / total_submissions * 100)::numeric, 1) as critical_percentage,
  avg_quality_score,
  ROUND((duplicate_rate::FLOAT / total_submissions * 100)::numeric, 1) as duplicate_percentage
FROM monthly_metrics
ORDER BY month DESC;

-- 2. Release Performance and Impact
WITH release_metrics AS (
  SELECT 
    fr.id,
    fr.title,
    fr.category,
    fr.vendor_type,
    fr.rice_score,
    fr.user_votes,
    fr.affects_wedding_day,
    
    -- Timeline metrics
    EXTRACT(days FROM fr.released_at - fr.submitted_at) as days_to_release,
    EXTRACT(days FROM fr.planned_at - fr.submitted_at) as days_to_planning,
    
    -- Impact metrics
    fm.adoption_rate,
    fm.mrr_impact_actual,
    fm.efficiency_gain_hours,
    fm.nps_impact,
    
    -- Seasonal context
    EXTRACT(month FROM fr.released_at) as release_month
    
  FROM feature_requests fr
  LEFT JOIN feature_metrics fm ON fr.id = fm.request_id
  WHERE fr.status = 'released'
    AND fr.released_at >= NOW() - INTERVAL '18 months'
)
SELECT 
  category,
  COUNT(*) as features_released,
  ROUND(AVG(days_to_release)::numeric, 1) as avg_delivery_days,
  ROUND(AVG(rice_score)::numeric, 2) as avg_pre_release_score,
  ROUND(AVG(adoption_rate)::numeric, 2) as avg_adoption_rate,
  SUM(efficiency_gain_hours) as total_time_saved,
  ROUND(AVG(nps_impact)::numeric, 2) as avg_nps_improvement,
  
  -- Wedding season release timing
  COUNT(CASE WHEN release_month IN (3,4,5) THEN 1 END) as pre_season_releases,
  COUNT(CASE WHEN affects_wedding_day THEN 1 END) as critical_features_released,
  
  -- Success rate
  COUNT(CASE WHEN adoption_rate > 0.2 THEN 1 END) as successful_features,
  ROUND((COUNT(CASE WHEN adoption_rate > 0.2 THEN 1 END)::FLOAT / COUNT(*) * 100)::numeric, 1) as success_rate
  
FROM release_metrics
GROUP BY category
ORDER BY features_released DESC;

-- 3. Community Engagement and Health
SELECT 
  vendor_type,
  COUNT(DISTINCT requester_id) as active_submitters,
  COUNT(*) as total_requests,
  SUM(user_votes) as total_votes,
  ROUND(AVG(user_votes)::numeric, 2) as avg_votes_per_request,
  
  -- Engagement quality
  COUNT(CASE WHEN user_votes > 10 THEN 1 END) as highly_voted_requests,
  COUNT(CASE WHEN user_votes > 50 THEN 1 END) as community_favorites,
  
  -- Cross-vendor support
  (SELECT COUNT(DISTINCT fv.user_id) 
   FROM feature_votes fv 
   JOIN feature_requests fr2 ON fv.request_id = fr2.id 
   WHERE fr2.vendor_type = fr.vendor_type) as cross_vendor_voters,
   
  -- Request quality
  ROUND(AVG(rice_score)::numeric, 2) as avg_request_quality,
  COUNT(CASE WHEN status IN ('planned', 'in_development', 'released') THEN 1 END) as accepted_requests,
  ROUND((COUNT(CASE WHEN status IN ('planned', 'in_development', 'released') THEN 1 END)::FLOAT / COUNT(*) * 100)::numeric, 1) as acceptance_rate

FROM feature_requests fr
WHERE submitted_at >= NOW() - INTERVAL '6 months'
GROUP BY vendor_type
ORDER BY total_votes DESC;
```

### Success Criteria

**Engagement Metrics**:
- ✅ >8% of monthly active suppliers submit feature requests
- ✅ >25% of suppliers vote on at least one feature monthly
- ✅ >15 average votes per feature request
- ✅ <15% duplicate submission rate

**Quality Metrics**:
- ✅ >70% of released features achieve >20% adoption rate
- ✅ >80% accuracy in RICE score predictions vs actual impact
- ✅ <90 days average time from popular request to release
- ✅ >85% satisfaction rating from requesters on released features

**Wedding Industry Specific**:
- ✅ >40% of requests marked as wedding-day critical get prioritized
- ✅ >90% of peak-season critical features released before May 1st
- ✅ >60% cross-vendor type engagement (photographers voting on planner requests, etc.)
- ✅ >2.5x RICE score multiplier for wedding day critical features during peak season approach

**Business Impact**:
- ✅ >$50K additional MRR attributed to user-requested features
- ✅ >15% improvement in product-market fit scores
- ✅ >500 total hours saved for suppliers from efficiency features
- ✅ >25% increase in feature adoption rates vs internally planned features

## Completion Checklist

**Backend Implementation**:
- [ ] Database schema with wedding industry context fields
- [ ] Feature request CRUD APIs with RICE scoring
- [ ] Wedding-aware duplicate detection system
- [ ] Community voting system with vendor weighting
- [ ] Roadmap integration with seasonal planning
- [ ] Analytics and reporting endpoints
- [ ] Real-time updates via Supabase channels

**Frontend Implementation**:
- [ ] Feature request portal with wedding industry filtering
- [ ] Advanced submission modal with wedding context
- [ ] Community discussion and voting interface
- [ ] Roadmap visualization with seasonal priorities
- [ ] Analytics dashboard for product team
- [ ] Mobile-responsive design for on-the-go vendors

**Integration & Testing**:
- [ ] MCP server integration (Context7, PostgreSQL, Supabase)
- [ ] End-to-end testing of complete user journeys
- [ ] Performance testing under peak season load
- [ ] Security testing for community features
- [ ] Cross-vendor collaboration workflow testing

**Documentation & Training**:
- [ ] API documentation for product team
- [ ] User guides for suppliers and couples
- [ ] Product manager training on RICE scoring
- [ ] Analytics interpretation guide

---

**Estimated Completion**: 15 business days  
**Success Measurement**: 30-day post-launch metrics review  
**Rollout Strategy**: Soft launch to professional tier, full rollout based on engagement metrics
