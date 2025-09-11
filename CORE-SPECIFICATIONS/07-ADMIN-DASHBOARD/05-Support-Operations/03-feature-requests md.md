# 03-feature-requests.md

# Feature Request Management System for WedSync/WedMe

## Overview

A comprehensive system for collecting, prioritizing, and managing feature requests from wedding suppliers and couples. This system helps drive product development based on actual user needs and market demands.

## Feature Request Architecture

### Request Structure

```tsx
interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: FeatureCategory;

  requester: {
    userId: string;
    userType: 'supplier' | 'couple';
    userTier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
    accountValue: number; // MRR or LTV
  };

  details: {
    problem: string;           // Problem being solved
    solution: string;          // Proposed solution
    alternatives: string[];    // Current workarounds
    impact: string;           // Expected impact
    urgency: 'low' | 'medium' | 'high' | 'critical';
  };

  scoring: {
    rice: RICEScore;          // Reach, Impact, Confidence, Effort
    value: number;            // Business value score
    userVotes: number;        // Community votes
    mrr_impact: number;       // Potential MRR impact
  };

  status: RequestStatus;
  timeline: {
    submitted: Date;
    reviewed: Date | null;
    planned: Date | null;
    developed: Date | null;
    released: Date | null;
  };
}

enum FeatureCategory {
  FORMS = 'forms',
  JOURNEY = 'journey',
  COMMUNICATION = 'communication',
  AUTOMATION = 'automation',
  INTEGRATIONS = 'integrations',
  ANALYTICS = 'analytics',
  COLLABORATION = 'collaboration',
  PAYMENTS = 'payments',
  MOBILE = 'mobile',
  PERFORMANCE = 'performance'
}

enum RequestStatus {
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  GATHERING_FEEDBACK = 'gathering_feedback',
  PLANNED = 'planned',
  IN_DEVELOPMENT = 'in_development',
  BETA = 'beta',
  RELEASED = 'released',
  DECLINED = 'declined',
  DUPLICATE = 'duplicate'
}

```

## Implementation

### 1. Feature Request Collection System

```tsx
// lib/features/requestManager.ts
export class FeatureRequestManager {
  private static instance: FeatureRequestManager;
  private duplicateDetector: DuplicateDetector;
  private scorer: FeatureScorer;
  private notifier: NotificationService;

  static getInstance(): FeatureRequestManager {
    if (!FeatureRequestManager.instance) {
      FeatureRequestManager.instance = new FeatureRequestManager();
    }
    return FeatureRequestManager.instance;
  }

  async submitRequest(request: FeatureRequestInput): Promise<FeatureRequest> {
    // Check for duplicates
    const duplicates = await this.duplicateDetector.findSimilar(request);

    if (duplicates.length > 0) {
      // Merge with existing request
      return await this.mergeWithExisting(request, duplicates[0]);
    }

    // Enrich request with user data
    const enrichedRequest = await this.enrichRequest(request);

    // Calculate initial scores
    const scoring = await this.scorer.calculateScores(enrichedRequest);

    // Create feature request
    const featureRequest: FeatureRequest = {
      id: this.generateRequestId(),
      title: request.title,
      description: request.description,
      category: this.categorizeRequest(request),

      requester: {
        userId: request.userId,
        userType: await this.getUserType(request.userId),
        userTier: await this.getUserTier(request.userId),
        accountValue: await this.calculateAccountValue(request.userId)
      },

      details: {
        problem: request.problem,
        solution: request.solution,
        alternatives: request.alternatives || [],
        impact: request.expectedImpact,
        urgency: this.assessUrgency(request)
      },

      scoring: {
        rice: scoring.rice,
        value: scoring.businessValue,
        userVotes: 1, // Requester's implicit vote
        mrr_impact: scoring.estimatedMRRImpact
      },

      status: 'submitted',

      timeline: {
        submitted: new Date(),
        reviewed: null,
        planned: null,
        developed: null,
        released: null
      },

      metadata: {
        source: request.source, // 'app', 'email', 'support', 'sales'
        attachments: request.attachments || [],
        tags: await this.generateTags(request),
        relatedTickets: request.relatedTickets || [],
        competitorFeature: request.competitorHasThis || false
      }
    };

    // Save to database
    await this.saveRequest(featureRequest);

    // Notify product team
    await this.notifyProductTeam(featureRequest);

    // Auto-analyze for quick wins
    if (scoring.isQuickWin) {
      await this.flagAsQuickWin(featureRequest);
    }

    return featureRequest;
  }

  private async enrichRequest(request: FeatureRequestInput): Promise<EnrichedRequest> {
    const user = await this.getUser(request.userId);

    return {
      ...request,
      userContext: {
        accountAge: this.calculateAccountAge(user.createdAt),
        totalSpend: await this.getUserTotalSpend(user.id),
        featureUsage: await this.getFeatureUsagePattern(user.id),
        previousRequests: await this.getPreviousRequests(user.id),
        churnRisk: await this.getChurnRiskScore(user.id)
      },
      marketContext: {
        similarRequests: await this.countSimilarRequests(request),
        competitorAnalysis: await this.checkCompetitorFeatures(request),
        marketDemand: await this.assessMarketDemand(request)
      }
    };
  }

  private async mergeWithExisting(
    newRequest: FeatureRequestInput,
    existingRequest: FeatureRequest
  ): Promise<FeatureRequest> {
    // Add vote from new requester
    existingRequest.scoring.userVotes++;

    // Add additional context
    existingRequest.additionalContext = existingRequest.additionalContext || [];
    existingRequest.additionalContext.push({
      userId: newRequest.userId,
      description: newRequest.description,
      useCase: newRequest.problem,
      submittedAt: new Date()
    });

    // Update MRR impact
    const additionalMRR = await this.calculateAccountValue(newRequest.userId);
    existingRequest.scoring.mrr_impact += additionalMRR;

    // Recalculate priority
    existingRequest.scoring = await this.scorer.recalculateScores(existingRequest);

    // Notify original requester of support
    await this.notifyOfAdditionalSupport(existingRequest, newRequest.userId);

    await this.saveRequest(existingRequest);

    return existingRequest;
  }

  private assessUrgency(request: FeatureRequestInput): string {
    // Critical urgency triggers
    if (request.description.toLowerCase().includes('blocking')) return 'critical';
    if (request.description.toLowerCase().includes('losing customers')) return 'critical';
    if (request.isBlocker) return 'critical';

    // High urgency triggers
    if (request.competitorHasThis) return 'high';
    if (request.affectsRevenue) return 'high';

    // Medium urgency
    if (request.improvesEfficiency) return 'medium';

    return 'low';
  }

  async voteForFeature(requestId: string, userId: string, vote: 'up' | 'down'): Promise<void> {
    const request = await this.getRequest(requestId);
    const existingVote = await this.getUserVote(requestId, userId);

    if (existingVote) {
      // Update existing vote
      if (existingVote.vote === vote) {
        // Remove vote (toggle off)
        await this.removeVote(requestId, userId);
        request.scoring.userVotes--;
      } else {
        // Change vote
        await this.updateVote(requestId, userId, vote);
        request.scoring.userVotes += vote === 'up' ? 2 : -2;
      }
    } else {
      // New vote
      await this.addVote(requestId, userId, vote);
      request.scoring.userVotes += vote === 'up' ? 1 : -1;
    }

    // Recalculate priority
    request.scoring = await this.scorer.recalculateScores(request);

    // Check for threshold triggers
    await this.checkVoteThresholds(request);

    await this.saveRequest(request);
  }

  private async checkVoteThresholds(request: FeatureRequest): Promise<void> {
    // Auto-escalate highly voted features
    if (request.scoring.userVotes >= 50 && request.status === 'submitted') {
      await this.escalateToReview(request);
    }

    // Alert on trending features
    if (await this.isTrending(request)) {
      await this.alertProductTeam('Trending feature request', request);
    }

    // Check for enterprise interest
    const enterpriseVoters = await this.getEnterpriseVoters(request.id);
    if (enterpriseVoters.length >= 3) {
      await this.flagEnterpriseInterest(request);
    }
  }
}

```

### 2. RICE Scoring System

```tsx
// lib/features/riceScorer.ts
export class RICEScorer {
  async calculateRICEScore(request: EnrichedFeatureRequest): Promise<RICEScore> {
    const reach = await this.calculateReach(request);
    const impact = await this.calculateImpact(request);
    const confidence = await this.calculateConfidence(request);
    const effort = await this.estimateEffort(request);

    const score = (reach * impact * confidence) / effort;

    return {
      reach,
      impact,
      confidence,
      effort,
      score,
      breakdown: {
        reachFactors: this.getReachFactors(request),
        impactFactors: this.getImpactFactors(request),
        confidenceFactors: this.getConfidenceFactors(request),
        effortFactors: this.getEffortFactors(request)
      }
    };
  }

  private async calculateReach(request: EnrichedFeatureRequest): Promise<number> {
    // How many users will this impact per quarter?
    let reach = 0;

    // Direct requesters and voters
    reach += request.scoring.userVotes;

    // Users in same segment
    const segmentSize = await this.getSegmentSize(request.requester.userType);
    const adoptionRate = this.estimateAdoptionRate(request);
    reach += segmentSize * adoptionRate;

    // Account for user tier multiplier
    const tierMultiplier = {
      'enterprise': 5,
      'scale': 3,
      'professional': 2,
      'starter': 1.5,
      'free': 1
    }[request.requester.userTier];

    reach *= tierMultiplier;

    // Cap at total user base
    const totalUsers = await this.getTotalActiveUsers();
    return Math.min(reach, totalUsers);
  }

  private async calculateImpact(request: EnrichedFeatureRequest): Promise<number> {
    // Scale: 0.25 (minimal), 0.5 (low), 1 (medium), 2 (high), 3 (massive)
    let impact = 1; // Default medium

    // Revenue impact
    if (request.scoring.mrr_impact > 1000) impact = 3;
    else if (request.scoring.mrr_impact > 500) impact = 2;
    else if (request.scoring.mrr_impact > 100) impact = 1;
    else if (request.scoring.mrr_impact > 0) impact = 0.5;

    // Retention impact
    if (request.details.impact.includes('retention')) impact += 0.5;
    if (request.details.impact.includes('churn')) impact += 1;

    // Competitive advantage
    if (request.metadata.competitorFeature) impact += 0.5;

    // User satisfaction impact
    const sentimentScore = await this.analyzeSentiment(request.description);
    if (sentimentScore < -0.5) impact += 0.5; // Fixing pain point

    return Math.min(impact, 3);
  }

  private async calculateConfidence(request: EnrichedFeatureRequest): Promise<number> {
    // Scale: 0-1 (0% - 100% confidence)
    let confidence = 0.5; // Start at 50%

    // User validation
    if (request.scoring.userVotes > 10) confidence += 0.1;
    if (request.scoring.userVotes > 25) confidence += 0.1;
    if (request.scoring.userVotes > 50) confidence += 0.1;

    // Problem clarity
    if (request.details.problem.length > 100) confidence += 0.1;
    if (request.details.alternatives.length > 0) confidence += 0.1;

    // Similar successful features
    const similarFeatures = await this.findSimilarReleasedFeatures(request);
    if (similarFeatures.length > 0) {
      const successRate = this.calculateSuccessRate(similarFeatures);
      confidence += successRate * 0.2;
    }

    // Technical feasibility
    const feasibility = await this.assessTechnicalFeasibility(request);
    confidence *= feasibility;

    return Math.min(confidence, 1);
  }

  private async estimateEffort(request: EnrichedFeatureRequest): Promise<number> {
    // Person-weeks of effort
    let effort = 2; // Default 2 weeks

    // Category-based baseline
    const categoryEffort = {
      'forms': 1,
      'journey': 2,
      'communication': 1.5,
      'automation': 3,
      'integrations': 4,
      'analytics': 2.5,
      'collaboration': 3,
      'payments': 5,
      'mobile': 4,
      'performance': 2
    };

    effort = categoryEffort[request.category] || 2;

    // Complexity modifiers
    if (request.description.includes('AI') || request.description.includes('machine learning')) {
      effort *= 2;
    }

    if (request.description.includes('real-time')) {
      effort *= 1.5;
    }

    if (request.category === 'integrations') {
      // External dependencies add complexity
      effort *= 1.5;
    }

    // Scope creep factor
    const scopeComplexity = this.assessScopeComplexity(request);
    effort *= scopeComplexity;

    return effort;
  }
}

```

### 3. Feature Request Portal

```tsx
// components/FeatureRequestPortal.tsx
export function FeatureRequestPortal() {
  const { user } = useUser();
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [filter, setFilter] = useState<FilterOptions>({ status: 'all', category: 'all' });
  const [sortBy, setSortBy] = useState<'votes' | 'recent' | 'rice'>('votes');

  return (
    <div className="feature-portal">
      <div className="portal-header">
        <h1>Feature Requests</h1>
        <p>Help shape the future of WedSync</p>

        <div className="actions">
          <button onClick={() => openRequestModal()} className="primary">
            <Plus /> Request Feature
          </button>
        </div>
      </div>

      <div className="portal-stats">
        <StatCard title="Planned" count={requests.filter(r => r.status === 'planned').length} />
        <StatCard title="In Development" count={requests.filter(r => r.status === 'in_development').length} />
        <StatCard title="Recently Released" count={getRecentlyReleased().length} />
        <StatCard title="Your Votes" count={getUserVoteCount()} />
      </div>

      <div className="filters-bar">
        <FilterDropdown
          options={['all', 'submitted', 'planned', 'in_development', 'released']}
          value={filter.status}
          onChange={(status) => setFilter({ ...filter, status })}
        />

        <CategoryFilter
          value={filter.category}
          onChange={(category) => setFilter({ ...filter, category })}
        />

        <SortDropdown
          value={sortBy}
          onChange={setSortBy}
          options={[
            { value: 'votes', label: 'Most Voted' },
            { value: 'recent', label: 'Recently Added' },
            { value: 'rice', label: 'Priority Score' }
          ]}
        />
      </div>

      <div className="requests-list">
        {getFilteredRequests().map(request => (
          <FeatureRequestCard
            key={request.id}
            request={request}
            onVote={(vote) => handleVote(request.id, vote)}
            userVote={getUserVote(request.id)}
            isOwner={request.requester.userId === user.id}
          />
        ))}
      </div>

      <RequestDetailsModal />
      <SubmitRequestModal />
    </div>
  );
}

function FeatureRequestCard({ request, onVote, userVote, isOwner }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="request-card">
      <div className="voting-section">
        <button
          className={`vote-btn ${userVote === 'up' ? 'voted' : ''}`}
          onClick={() => onVote('up')}
        >
          <ChevronUp />
        </button>
        <span className="vote-count">{request.scoring.userVotes}</span>
      </div>

      <div className="request-content">
        <div className="request-header">
          <h3>{request.title}</h3>
          <div className="badges">
            <CategoryBadge category={request.category} />
            <StatusBadge status={request.status} />
            {request.metadata.competitorFeature && (
              <span className="competitor-badge">Competitor Has</span>
            )}
          </div>
        </div>

        <p className="description">
          {request.description.substring(0, 150)}
          {request.description.length > 150 && '...'}
        </p>

        {expanded && (
          <div className="expanded-content">
            <div className="problem-section">
              <h4>Problem</h4>
              <p>{request.details.problem}</p>
            </div>

            <div className="solution-section">
              <h4>Proposed Solution</h4>
              <p>{request.details.solution}</p>
            </div>

            <div className="impact-section">
              <h4>Expected Impact</h4>
              <p>{request.details.impact}</p>
            </div>

            <div className="supporters">
              <h4>Supporters ({request.additionalContext?.length || 0})</h4>
              <div className="supporter-list">
                {request.additionalContext?.map(ctx => (
                  <div key={ctx.userId} className="supporter">
                    <UserAvatar userId={ctx.userId} />
                    <span>{ctx.useCase}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="request-footer">
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? 'Show Less' : 'Show More'}
          </button>

          <div className="metadata">
            <span>Requested {formatTimeAgo(request.timeline.submitted)}</span>
            {request.timeline.planned && (
              <span>Planned for {formatDate(request.timeline.planned)}</span>
            )}
          </div>
        </div>
      </div>

      {request.status === 'released' && (
        <div className="release-banner">
          <CheckCircle /> Released in version {request.releaseVersion}
        </div>
      )}
    </div>
  );
}

```

### 4. Product Roadmap Integration

```tsx
// lib/features/roadmapManager.ts
export class RoadmapManager {
  async generateRoadmap(quarter: string): Promise<Roadmap> {
    const requests = await this.getPlannedRequests();
    const resources = await this.getAvailableResources(quarter);

    // Sort by RICE score
    const prioritized = requests.sort((a, b) =>
      b.scoring.rice.score - a.scoring.rice.score
    );

    const roadmap: Roadmap = {
      quarter,
      themes: [],
      features: [],
      capacity: resources.totalWeeks,
      allocated: 0
    };

    // Group by themes
    const themes = this.identifyThemes(prioritized);

    for (const theme of themes) {
      const themeFeatures = prioritized.filter(r =>
        this.matchesTheme(r, theme)
      );

      const themeAllocation = {
        name: theme.name,
        description: theme.description,
        features: [],
        totalEffort: 0,
        expectedImpact: 0
      };

      for (const feature of themeFeatures) {
        if (roadmap.allocated + feature.scoring.rice.effort <= roadmap.capacity) {
          themeAllocation.features.push({
            id: feature.id,
            title: feature.title,
            effort: feature.scoring.rice.effort,
            impact: feature.scoring.rice.impact,
            status: 'planned'
          });

          roadmap.allocated += feature.scoring.rice.effort;
          themeAllocation.totalEffort += feature.scoring.rice.effort;
          themeAllocation.expectedImpact += feature.scoring.rice.impact;
        }
      }

      if (themeAllocation.features.length > 0) {
        roadmap.themes.push(themeAllocation);
      }
    }

    // Generate timeline
    roadmap.timeline = this.generateTimeline(roadmap);

    // Calculate expected outcomes
    roadmap.expectedOutcomes = await this.calculateExpectedOutcomes(roadmap);

    return roadmap;
  }

  private identifyThemes(requests: FeatureRequest[]): Theme[] {
    const themes = new Map<string, Theme>();

    // Predefined strategic themes
    const strategicThemes = [
      {
        name: 'Supplier Efficiency',
        keywords: ['automation', 'workflow', 'efficiency', 'time-saving'],
        priority: 1
      },
      {
        name: 'Couple Experience',
        keywords: ['couple', 'guest', 'collaboration', 'communication'],
        priority: 2
      },
      {
        name: 'Growth & Revenue',
        keywords: ['payment', 'invoice', 'booking', 'revenue'],
        priority: 3
      },
      {
        name: 'Platform Intelligence',
        keywords: ['analytics', 'insights', 'AI', 'smart'],
        priority: 4
      }
    ];

    for (const request of requests) {
      const matchedTheme = this.findBestTheme(request, strategicThemes);

      if (!themes.has(matchedTheme.name)) {
        themes.set(matchedTheme.name, {
          ...matchedTheme,
          features: []
        });
      }

      themes.get(matchedTheme.name).features.push(request);
    }

    return Array.from(themes.values())
      .sort((a, b) => a.priority - b.priority);
  }

  async communicateRoadmap(roadmap: Roadmap): Promise<void> {
    // Generate different versions for different audiences
    const versions = {
      internal: this.generateInternalRoadmap(roadmap),
      customer: this.generateCustomerRoadmap(roadmap),
      investor: this.generateInvestorRoadmap(roadmap)
    };

    // Notify stakeholders
    await this.notifyStakeholders(versions);

    // Update feature requests with roadmap placement
    for (const theme of roadmap.themes) {
      for (const feature of theme.features) {
        await this.updateFeatureStatus(feature.id, 'planned', {
          quarter: roadmap.quarter,
          theme: theme.name
        });
      }
    }

    // Publish to portal
    await this.publishToPortal(versions.customer);
  }
}

```

### 5. Database Schema

```sql
-- Feature requests
CREATE TABLE feature_requests (
  id VARCHAR(20) PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,

  -- Requester info
  requester_id UUID REFERENCES users(id),
  requester_type VARCHAR(20),
  requester_tier VARCHAR(20),
  account_value DECIMAL(10,2),

  -- Details
  problem TEXT,
  solution TEXT,
  alternatives TEXT[],
  expected_impact TEXT,
  urgency VARCHAR(20),

  -- Scoring
  rice_score DECIMAL(10,2),
  business_value INTEGER,
  user_votes INTEGER DEFAULT 0,
  mrr_impact DECIMAL(10,2),

  -- Status tracking
  status VARCHAR(30) NOT NULL,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  planned_at TIMESTAMPTZ,
  developed_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  release_version VARCHAR(20),

  -- Metadata
  tags TEXT[],
  competitor_feature BOOLEAN DEFAULT FALSE,
  quick_win BOOLEAN DEFAULT FALSE,
  enterprise_interest BOOLEAN DEFAULT FALSE,

  INDEX idx_requests_status (status),
  INDEX idx_requests_category (category),
  INDEX idx_requests_votes (user_votes DESC),
  INDEX idx_requests_rice (rice_score DESC)
);

-- User votes
CREATE TABLE feature_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  user_id UUID REFERENCES users(id),
  vote VARCHAR(10), -- 'up' or 'down'
  voted_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(request_id, user_id)
);

-- Additional context from duplicate requests
CREATE TABLE feature_request_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  user_id UUID REFERENCES users(id),
  description TEXT,
  use_case TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feature comments/discussion
CREATE TABLE feature_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  user_id UUID REFERENCES users(id),
  comment TEXT NOT NULL,
  is_team_member BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  edited_at TIMESTAMPTZ,

  INDEX idx_comments_request (request_id)
);

-- Roadmap planning
CREATE TABLE roadmap_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),
  quarter VARCHAR(10), -- 'Q1 2024'
  theme VARCHAR(100),
  priority INTEGER,
  estimated_weeks DECIMAL(5,2),
  assigned_to VARCHAR(100),
  status VARCHAR(30),

  INDEX idx_roadmap_quarter (quarter)
);

-- Feature success metrics (post-release)
CREATE TABLE feature_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id VARCHAR(20) REFERENCES feature_requests(id),

  -- Adoption metrics
  users_adopted INTEGER,
  adoption_rate DECIMAL(5,2),

  -- Impact metrics
  mrr_impact_actual DECIMAL(10,2),
  retention_impact DECIMAL(5,2),
  nps_impact DECIMAL(5,2),

  -- Usage metrics
  daily_active_users INTEGER,
  feature_engagement_rate DECIMAL(5,2),

  measured_at TIMESTAMPTZ DEFAULT NOW()
);

```

## Prioritization Framework

### Scoring Algorithm

```tsx
const prioritizationConfig = {
  weights: {
    userVotes: 0.2,
    riceScore: 0.3,
    businessValue: 0.25,
    strategicAlignment: 0.15,
    technicalDebt: 0.1
  },

  modifiers: {
    enterpriseRequest: 2.0,
    competitorFeature: 1.5,
    quickWin: 1.3,
    churnPrevention: 1.8,
    communityDriven: 1.2
  },

  thresholds: {
    autoReview: 50,      // votes
    fastTrack: 100,      // votes
    mustHave: 150        // votes
  }
};

```

## Reporting & Analytics

### Feature Request Analytics Query

```sql
-- Monthly feature request summary
WITH monthly_stats AS (
  SELECT
    DATE_TRUNC('month', submitted_at) as month,
    COUNT(*) as total_requests,
    COUNT(DISTINCT requester_id) as unique_requesters,
    SUM(user_votes) as total_votes,
    AVG(rice_score) as avg_rice_score,

    COUNT(CASE WHEN status = 'released' THEN 1 END) as released,
    COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned,
    COUNT(CASE WHEN status = 'declined' THEN 1 END) as declined,

    SUM(CASE WHEN status = 'released' THEN mrr_impact END) as realized_mrr_impact

  FROM feature_requests
  WHERE submitted_at >= NOW() - INTERVAL '12 months'
  GROUP BY month
)
SELECT
  month,
  total_requests,
  unique_requesters,
  total_votes,
  ROUND(avg_rice_score::numeric, 2) as avg_priority_score,
  released,
  planned,
  declined,
  ROUND((released::FLOAT / NULLIF(total_requests, 0) * 100)::numeric, 1) as release_rate,
  ROUND(realized_mrr_impact::numeric, 2) as mrr_impact
FROM monthly_stats
ORDER BY month DESC;

```

## Best Practices

### 1. Collection

- Make submission easy and accessible
- Provide clear templates
- Allow anonymous submissions
- Capture context and use cases

### 2. Evaluation

- Use consistent scoring criteria
- Consider multiple perspectives
- Weight by user value
- Look for patterns across requests

### 3. Communication

- Be transparent about status
- Explain prioritization decisions
- Close the loop when released
- Share roadmap publicly

### 4. Execution

- Group related features
- Define clear success metrics
- Beta test with requesters
- Measure actual vs expected impact

## Success Metrics

- **Submission Rate**: >5% of MAU submit requests
- **Engagement Rate**: >20% of users vote on features
- **Release Rate**: >30% of top-voted features released
- **Accuracy**: >70% of released features meet success criteria
- **Cycle Time**: <90 days from popular request to release
- **Satisfaction**: >80% satisfaction with released features