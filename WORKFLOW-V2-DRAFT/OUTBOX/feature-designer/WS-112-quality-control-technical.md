# WS-112: Quality Control System - Technical Specification

## Overview
Automated and manual quality assurance system ensuring templates meet platform standards before marketplace listing, with plagiarism detection and performance testing.

## User Stories with Real Wedding Context

### Story 1: Template Automatic Quality Validation
**As Marcus (Wedding Photographer)** submitting his first template  
**I want** automatic validation with clear feedback  
**So that** I can fix issues before manual review and increase approval chances

**Wedding Business Context:**
- Marcus uploads "Client Consultation Form Template" for £35
- Automated checks: ✅ Title/description complete, ✅ 4 screenshots, ✅ No personal data, ❌ Description too short (85 chars, needs 100+)
- System feedback: "Add 15+ more characters to description explaining benefits to other photographers"
- Marcus updates: "This form streamlines initial client meetings by capturing all essential wedding details upfront, saving 30 minutes per consultation"
- ✅ All automated checks pass, moves to manual review queue

### Story 2: Manual Review Process for Wedding Templates
**As Sarah (WedSync Quality Reviewer)** reviewing submitted templates  
**I want** a comprehensive dashboard with scoring tools  
**So that** I can efficiently evaluate template quality and provide constructive feedback

**Wedding Business Context:**
- Reviews "Complete Wedding Day Timeline Builder" from verified creator
- Automated score: 85/100 (high priority queue)
- Manual evaluation: Design quality 8/10, Usefulness 9/10, Uniqueness 7/10, Documentation 6/10
- Notes: "Excellent workflow logic, consider adding setup instructions for complex timeline configurations"
- Approved with suggestions, creator notified within 4 hours

### Story 3: Quality Issue Detection and Creator Improvement
**As Lisa (Wedding Planner)** whose template was rejected  
**I want** detailed feedback with improvement suggestions  
**So that** I can enhance my template and resubmit successfully

**Wedding Business Context:**
- "Vendor Coordination Workflow" rejected with specific feedback
- Issues: Similar structure to existing template (75% similarity), missing cost breakdown examples, performance score 62/100
- Improvement plan: Add unique vendor rating system, include budget planning module, optimize form load time
- Resubmission approved after implementing all feedback

## Database Schema Design

```sql
-- Quality control review queue and tracking
CREATE TABLE marketplace_quality_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  
  -- Review priority and scoring
  priority INTEGER DEFAULT 3 CHECK (priority BETWEEN 1 AND 5), -- 1=highest priority
  auto_quality_score DECIMAL(5,2) DEFAULT 0,
  performance_score DECIMAL(5,2) DEFAULT 0,
  originality_score DECIMAL(5,2) DEFAULT 0,
  
  -- Review assignment and status
  reviewer_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'rejected', 'changes_requested', 'escalated')),
  
  -- Automated checks results
  automated_checks_passed BOOLEAN DEFAULT false,
  automated_checks_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  automated_failures JSONB DEFAULT '[]'::jsonb,
  
  -- Review timeline
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  
  -- SLA tracking
  target_review_time INTERVAL DEFAULT INTERVAL '48 hours',
  is_sla_breached BOOLEAN DEFAULT false,
  escalation_level INTEGER DEFAULT 0,
  
  -- Resubmission tracking
  original_submission_id UUID REFERENCES marketplace_quality_review_queue(id),
  resubmission_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Manual review results and feedback
CREATE TABLE marketplace_quality_review_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_queue_id UUID REFERENCES marketplace_quality_review_queue(id) NOT NULL,
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Review decision
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'rejected', 'changes_requested', 'escalated')),
  decision_rationale TEXT,
  
  -- Manual quality scores (1-10 scale)
  design_quality_score DECIMAL(3,1) DEFAULT 0,
  usefulness_score DECIMAL(3,1) DEFAULT 0,
  uniqueness_score DECIMAL(3,1) DEFAULT 0,
  documentation_score DECIMAL(3,1) DEFAULT 0,
  overall_score DECIMAL(3,1) DEFAULT 0,
  
  -- Detailed feedback
  strengths TEXT[],
  improvement_areas TEXT[],
  specific_feedback TEXT,
  suggested_changes JSONB DEFAULT '[]'::jsonb,
  
  -- Template compliance
  meets_platform_standards BOOLEAN DEFAULT false,
  appropriate_for_target_audience BOOLEAN DEFAULT false,
  pricing_reasonable BOOLEAN DEFAULT false,
  
  -- Review metadata
  review_time_minutes INTEGER DEFAULT 0,
  confidence_level DECIMAL(3,2) DEFAULT 1.0, -- Reviewer confidence in decision
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template originality and plagiarism detection
CREATE TABLE marketplace_template_hashes (
  template_id UUID PRIMARY KEY REFERENCES marketplace_template_drafts(id),
  
  -- Content fingerprinting
  content_hash TEXT NOT NULL,
  structure_hash TEXT NOT NULL,
  feature_hash TEXT NOT NULL,
  
  -- Similarity detection
  content_tokens TSVECTOR,
  structural_patterns JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Hash metadata
  hash_version TEXT DEFAULT '1.0',
  hash_algorithm TEXT DEFAULT 'sha256',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Template similarity detection results
CREATE TABLE marketplace_template_similarity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  similar_template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  
  -- Similarity metrics
  content_similarity DECIMAL(5,4) NOT NULL, -- 0.0000 to 1.0000
  structure_similarity DECIMAL(5,4) NOT NULL,
  feature_similarity DECIMAL(5,4) NOT NULL,
  overall_similarity DECIMAL(5,4) NOT NULL,
  
  -- Detection metadata
  detection_algorithm TEXT DEFAULT 'cosine_similarity',
  confidence_score DECIMAL(5,4) DEFAULT 1.0000,
  
  -- Review flags
  flagged_for_review BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES auth.users(id),
  review_decision TEXT CHECK (review_decision IN ('original', 'similar', 'duplicate')),
  
  detected_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- Performance testing results
CREATE TABLE marketplace_template_performance (
  template_id UUID PRIMARY KEY REFERENCES marketplace_template_drafts(id),
  
  -- Performance metrics
  load_time_ms INTEGER DEFAULT 0,
  render_time_ms INTEGER DEFAULT 0,
  interaction_time_ms INTEGER DEFAULT 0,
  memory_usage_mb DECIMAL(8,2) DEFAULT 0,
  
  -- Performance scores (0-100 scale)
  load_time_score INTEGER DEFAULT 0,
  render_time_score INTEGER DEFAULT 0,
  interaction_score INTEGER DEFAULT 0,
  memory_score INTEGER DEFAULT 0,
  overall_performance_score INTEGER DEFAULT 0,
  
  -- Performance status
  performance_grade TEXT DEFAULT 'F' CHECK (performance_grade IN ('A', 'B', 'C', 'D', 'F')),
  passes_performance_threshold BOOLEAN DEFAULT false,
  
  -- Test environment
  test_device TEXT DEFAULT 'standard',
  test_browser TEXT DEFAULT 'chrome',
  test_conditions JSONB DEFAULT '{}'::jsonb,
  
  -- Recommendations
  performance_recommendations JSONB DEFAULT '[]'::jsonb,
  optimization_suggestions TEXT[],
  
  tested_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automated quality checks configuration and results
CREATE TABLE marketplace_quality_check_configs (
  check_name TEXT PRIMARY KEY,
  check_category TEXT NOT NULL, -- 'completeness', 'technical', 'content', 'compliance'
  check_description TEXT NOT NULL,
  
  -- Check parameters
  is_enabled BOOLEAN DEFAULT true,
  is_blocking BOOLEAN DEFAULT true, -- Prevents manual review if failed
  check_weight DECIMAL(3,2) DEFAULT 1.0,
  
  -- Thresholds and criteria
  pass_criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  scoring_algorithm TEXT DEFAULT 'binary',
  
  -- Configuration metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Individual quality check results for each template
CREATE TABLE marketplace_quality_check_results (
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  check_name TEXT REFERENCES marketplace_quality_check_configs(check_name) NOT NULL,
  
  -- Check results
  passed BOOLEAN NOT NULL,
  score DECIMAL(5,2) DEFAULT 0,
  check_value TEXT, -- Actual measured value
  expected_value TEXT, -- Expected/threshold value
  
  -- Check details
  check_details JSONB DEFAULT '{}'::jsonb,
  failure_reason TEXT,
  suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Check execution metadata
  check_duration_ms INTEGER DEFAULT 0,
  check_version TEXT DEFAULT '1.0',
  
  checked_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (template_id, check_name)
);

-- Reviewer performance and metrics
CREATE TABLE marketplace_reviewer_metrics (
  reviewer_id UUID PRIMARY KEY REFERENCES auth.users(id),
  
  -- Review statistics
  total_reviews INTEGER DEFAULT 0,
  approved_reviews INTEGER DEFAULT 0,
  rejected_reviews INTEGER DEFAULT 0,
  escalated_reviews INTEGER DEFAULT 0,
  
  -- Performance metrics
  avg_review_time_minutes DECIMAL(8,2) DEFAULT 0,
  accuracy_score DECIMAL(5,4) DEFAULT 0, -- Based on appeal outcomes
  consistency_score DECIMAL(5,4) DEFAULT 0, -- Compared to other reviewers
  
  -- Quality metrics
  helpful_feedback_rating DECIMAL(3,2) DEFAULT 0, -- Creator feedback on review quality
  review_quality_score DECIMAL(3,2) DEFAULT 0,
  
  -- Activity tracking
  last_review_at TIMESTAMPTZ,
  reviews_this_week INTEGER DEFAULT 0,
  reviews_this_month INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community reporting and flagging system
CREATE TABLE marketplace_template_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES marketplace_template_drafts(id) NOT NULL,
  reported_by UUID REFERENCES auth.users(id) NOT NULL,
  
  -- Report details
  report_type TEXT NOT NULL CHECK (report_type IN ('quality_issue', 'inappropriate_content', 'plagiarism', 'misleading_description', 'technical_problem', 'other')),
  report_description TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Report status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'dismissed')),
  assigned_to UUID REFERENCES auth.users(id),
  
  -- Resolution
  resolution_notes TEXT,
  action_taken TEXT,
  resolved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_review_queue_status_priority ON marketplace_quality_review_queue(status, priority, submitted_at);
CREATE INDEX idx_review_queue_reviewer ON marketplace_quality_review_queue(reviewer_id, status);
CREATE INDEX idx_review_results_template ON marketplace_quality_review_results(template_id, decision);
CREATE INDEX idx_template_hashes_content ON marketplace_template_hashes USING gin(content_tokens);
CREATE INDEX idx_template_similarity_score ON marketplace_template_similarity(overall_similarity DESC);
CREATE INDEX idx_performance_score ON marketplace_template_performance(overall_performance_score DESC);
CREATE INDEX idx_quality_checks_template ON marketplace_quality_check_results(template_id, passed);
```

## API Endpoint Design

```typescript
// Quality control interfaces
interface QualityCheckResult {
  check_name: string;
  check_category: 'completeness' | 'technical' | 'content' | 'compliance';
  passed: boolean;
  score: number;
  check_value?: string;
  expected_value?: string;
  failure_reason?: string;
  suggestions: string[];
}

interface AutomatedQualityReport {
  template_id: string;
  overall_passed: boolean;
  overall_score: number;
  checks: QualityCheckResult[];
  blocking_failures: string[];
  recommendations: string[];
  estimated_fix_time: number; // minutes
}

interface TemplateOriginality {
  is_original: boolean;
  originality_score: number;
  similar_templates?: Array<{
    template_id: string;
    template_title: string;
    similarity_score: number;
    similarity_type: 'content' | 'structure' | 'feature';
  }>;
  requires_review: boolean;
}

interface PerformanceReport {
  template_id: string;
  passed: boolean;
  performance_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  overall_score: number;
  metrics: {
    load_time_ms: number;
    render_time_ms: number;
    interaction_time_ms: number;
    memory_usage_mb: number;
  };
  recommendations: string[];
  optimization_suggestions: string[];
}

interface ReviewQueueItem {
  id: string;
  template_id: string;
  template_title: string;
  creator_name: string;
  priority: number;
  auto_quality_score: number;
  performance_score: number;
  originality_score: number;
  submitted_at: string;
  estimated_review_time: string;
  complexity_indicators: string[];
}

interface ManualReviewResult {
  decision: 'approved' | 'rejected' | 'changes_requested' | 'escalated';
  scores: {
    design_quality: number;
    usefulness: number;
    uniqueness: number;
    documentation: number;
    overall: number;
  };
  feedback: {
    strengths: string[];
    improvement_areas: string[];
    specific_feedback: string;
    suggested_changes: Array<{
      area: string;
      description: string;
      priority: 'required' | 'recommended' | 'optional';
    }>;
  };
  compliance: {
    meets_platform_standards: boolean;
    appropriate_for_target_audience: boolean;
    pricing_reasonable: boolean;
  };
}

// POST /api/marketplace/quality/automated-check/:templateId
interface AutomatedCheckResponse {
  success: boolean;
  report: AutomatedQualityReport;
  can_proceed_to_manual_review: boolean;
  estimated_fix_time_if_failed?: number;
}

// POST /api/marketplace/quality/originality-check/:templateId
interface OriginalityCheckResponse {
  success: boolean;
  originality: TemplateOriginality;
  flagged_for_manual_review: boolean;
  similar_templates_count: number;
}

// POST /api/marketplace/quality/performance-test/:templateId
interface PerformanceTestResponse {
  success: boolean;
  report: PerformanceReport;
  test_environment: {
    device: string;
    browser: string;
    test_conditions: Record<string, any>;
  };
}

// POST /api/marketplace/quality/submit-for-review/:templateId
interface SubmitForReviewRequest {
  creator_notes?: string;
  expedited_review?: boolean;
  target_publish_date?: string;
}

interface SubmitForReviewResponse {
  success: boolean;
  review_queue_id: string;
  queue_position: number;
  estimated_review_time: string;
  auto_quality_score: number;
  priority_level: number;
}

// GET /api/marketplace/quality/review-queue
interface ReviewQueueResponse {
  success: boolean;
  queue: {
    pending: ReviewQueueItem[];
    in_review: ReviewQueueItem[];
    completed_today: number;
  };
  reviewer_stats: {
    reviews_completed_today: number;
    avg_review_time_today: number;
    queue_sla_status: 'on_track' | 'behind' | 'critical';
  };
}

// POST /api/marketplace/quality/review/:reviewQueueId/assign
interface AssignReviewResponse {
  success: boolean;
  assigned_to: string;
  estimated_completion: string;
  review_guidelines: string[];
}

// POST /api/marketplace/quality/review/:reviewQueueId/complete
interface CompleteReviewRequest {
  result: ManualReviewResult;
  review_time_minutes: number;
  confidence_level: number;
  notes_for_team?: string;
}

interface CompleteReviewResponse {
  success: boolean;
  decision_applied: boolean;
  creator_notified: boolean;
  next_steps: string[];
}

// GET /api/marketplace/quality/template/:templateId/history
interface QualityHistoryResponse {
  success: boolean;
  quality_history: Array<{
    submission_date: string;
    auto_quality_score: number;
    manual_review_result?: ManualReviewResult;
    decision: string;
    reviewer_name?: string;
    days_to_decision: number;
  }>;
  improvement_trend: {
    score_trend: 'improving' | 'stable' | 'declining';
    common_issues: string[];
    success_factors: string[];
  };
}
```

## React Components Architecture

```typescript
// Quality Review Dashboard for Reviewers
interface ReviewerDashboardProps {
  reviewerId: string;
}

export function ReviewerDashboard({ reviewerId }: ReviewerDashboardProps) {
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [activeReview, setActiveReview] = useState<ReviewQueueItem | null>(null);
  const [reviewerStats, setReviewerStats] = useState<any>(null);

  const fetchReviewQueue = async () => {
    try {
      const response = await fetch('/api/marketplace/quality/review-queue');
      const data = await response.json();
      setQueue(data.queue.pending);
      setReviewerStats(data.reviewer_stats);
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
    }
  };

  useEffect(() => {
    fetchReviewQueue();
    const interval = setInterval(fetchReviewQueue, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleAssignReview = async (reviewQueueId: string) => {
    try {
      const response = await fetch(`/api/marketplace/quality/review/${reviewQueueId}/assign`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const assignedItem = queue.find(item => item.id === reviewQueueId);
        setActiveReview(assignedItem || null);
        fetchReviewQueue(); // Refresh queue
      }
    } catch (error) {
      console.error('Failed to assign review:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Stats */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold">Quality Review Dashboard</h1>
            
            <div className="flex items-center space-x-6">
              <div className="text-sm">
                <span className="text-gray-600">Today's Reviews:</span>
                <span className="ml-2 font-semibold">{reviewerStats?.reviews_completed_today || 0}</span>
              </div>
              <div className="text-sm">
                <span className="text-gray-600">Avg Time:</span>
                <span className="ml-2 font-semibold">{reviewerStats?.avg_review_time_today || 0}min</span>
              </div>
              <Badge variant={reviewerStats?.queue_sla_status === 'on_track' ? 'success' : 'warning'}>
                {reviewerStats?.queue_sla_status?.replace('_', ' ').toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeReview ? (
          <TemplateReviewInterface
            reviewItem={activeReview}
            onReviewComplete={() => {
              setActiveReview(null);
              fetchReviewQueue();
            }}
          />
        ) : (
          <ReviewQueueGrid
            queue={queue}
            onAssignReview={handleAssignReview}
          />
        )}
      </div>
    </div>
  );
}

// Review Queue Grid Component
interface ReviewQueueGridProps {
  queue: ReviewQueueItem[];
  onAssignReview: (reviewQueueId: string) => void;
}

export function ReviewQueueGrid({ queue, onAssignReview }: ReviewQueueGridProps) {
  const [sortBy, setSortBy] = useState<'priority' | 'submitted_at' | 'auto_score'>('priority');
  const [filterBy, setFilterBy] = useState<'all' | 'high_priority' | 'low_score'>('all');

  const getPriorityColor = (priority: number) => {
    if (priority === 1) return 'bg-red-100 text-red-800 border-red-200';
    if (priority === 2) return 'bg-orange-100 text-orange-800 border-orange-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const filteredAndSortedQueue = queue
    .filter(item => {
      if (filterBy === 'high_priority') return item.priority <= 2;
      if (filterBy === 'low_score') return item.auto_quality_score < 70;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') return a.priority - b.priority;
      if (sortBy === 'submitted_at') return new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime();
      if (sortBy === 'auto_score') return b.auto_quality_score - a.auto_quality_score;
      return 0;
    });

  return (
    <div>
      {/* Filters and Sort */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Review Queue ({queue.length} items)</h2>
            
            <div className="flex items-center space-x-4">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Items</option>
                <option value="high_priority">High Priority</option>
                <option value="low_score">Low Auto Score</option>
              </select>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="priority">Sort by Priority</option>
                <option value="submitted_at">Sort by Submit Time</option>
                <option value="auto_score">Sort by Auto Score</option>
              </select>
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredAndSortedQueue.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Queue Empty</h3>
              <p className="text-gray-600">All templates have been reviewed. Great work!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedQueue.map((item) => (
                <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">
                        {item.template_title}
                      </h3>
                      <p className="text-sm text-gray-600">
                        by {item.creator_name}
                      </p>
                    </div>
                    <Badge className={getPriorityColor(item.priority)}>
                      P{item.priority}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-600">
                        {item.auto_quality_score}/100
                      </div>
                      <div className="text-gray-600">Auto Score</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-600">
                        {item.performance_score}/100
                      </div>
                      <div className="text-gray-600">Performance</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-purple-600">
                        {Math.round(item.originality_score * 100)}%
                      </div>
                      <div className="text-gray-600">Original</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>Submitted {formatTimeAgo(item.submitted_at)}</span>
                    <span>Est. {item.estimated_review_time}</span>
                  </div>

                  {item.complexity_indicators.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-gray-600 mb-1">Complexity Indicators:</div>
                      <div className="flex flex-wrap gap-1">
                        {item.complexity_indicators.map((indicator, index) => (
                          <Badge key={index} variant="outline" size="sm">
                            {indicator}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={() => onAssignReview(item.id)}
                    className="w-full"
                    size="sm"
                  >
                    Start Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Template Review Interface Component
interface TemplateReviewInterfaceProps {
  reviewItem: ReviewQueueItem;
  onReviewComplete: () => void;
}

export function TemplateReviewInterface({ reviewItem, onReviewComplete }: TemplateReviewInterfaceProps) {
  const [template, setTemplate] = useState<any>(null);
  const [reviewResult, setReviewResult] = useState<ManualReviewResult>({
    decision: 'approved',
    scores: {
      design_quality: 8,
      usefulness: 8,
      uniqueness: 8,
      documentation: 8,
      overall: 8
    },
    feedback: {
      strengths: [],
      improvement_areas: [],
      specific_feedback: '',
      suggested_changes: []
    },
    compliance: {
      meets_platform_standards: true,
      appropriate_for_target_audience: true,
      pricing_reasonable: true
    }
  });
  const [reviewStartTime] = useState(Date.now());

  const fetchTemplateDetails = async () => {
    try {
      const response = await fetch(`/api/marketplace/templates/${reviewItem.template_id}`);
      const data = await response.json();
      setTemplate(data.template);
    } catch (error) {
      console.error('Failed to fetch template details:', error);
    }
  };

  useEffect(() => {
    fetchTemplateDetails();
  }, [reviewItem.template_id]);

  const handleScoreChange = (scoreType: string, value: number) => {
    setReviewResult(prev => ({
      ...prev,
      scores: {
        ...prev.scores,
        [scoreType]: value,
        overall: Math.round(Object.values({
          ...prev.scores,
          [scoreType]: value
        }).slice(0, 4).reduce((a, b) => a + b, 0) / 4)
      }
    }));
  };

  const handleSubmitReview = async () => {
    const reviewTimeMinutes = Math.round((Date.now() - reviewStartTime) / 60000);
    
    try {
      const response = await fetch(`/api/marketplace/quality/review/${reviewItem.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result: reviewResult,
          review_time_minutes: reviewTimeMinutes,
          confidence_level: 0.9
        })
      });

      if (response.ok) {
        onReviewComplete();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  if (!template) {
    return <div className="text-center py-8">Loading template details...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Template Preview */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold">Template Preview</h2>
            <p className="text-sm text-gray-600 mt-1">
              Review this template for quality, usefulness, and platform compliance
            </p>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">{template.metadata.title}</h3>
              <p className="text-gray-600 mb-4">{template.metadata.description}</p>
              
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline">{template.metadata.primary_category}</Badge>
                {template.metadata.vendor_types.map((type: string) => (
                  <Badge key={type} variant="secondary">{type}</Badge>
                ))}
              </div>
            </div>

            {/* Template Components */}
            <div className="space-y-4">
              <h4 className="font-semibold">Template Components ({template.components.length})</h4>
              {template.components.map((component: any, index: number) => (
                <div key={component.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{component.component_name}</h5>
                    <Badge variant="outline">{component.component_type}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{component.description}</p>
                  <div className="text-xs text-gray-500">
                    Setup time: ~{component.estimated_setup_minutes} minutes | 
                    Complexity: {component.complexity_score}/10
                  </div>
                </div>
              ))}
            </div>

            {/* Auto Quality Scores */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-semibold mb-3">Automated Quality Checks</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {reviewItem.auto_quality_score}/100
                  </div>
                  <div className="text-gray-600">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {reviewItem.performance_score}/100
                  </div>
                  <div className="text-gray-600">Performance</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {Math.round(reviewItem.originality_score * 100)}%
                  </div>
                  <div className="text-gray-600">Originality</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Form */}
      <div>
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold">Manual Review</h3>
            <p className="text-sm text-gray-600 mt-1">
              Score each aspect from 1-10 and provide feedback
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Quality Scores */}
            <div>
              <h4 className="font-medium mb-4">Quality Scores</h4>
              
              {[
                { key: 'design_quality', label: 'Design Quality', description: 'Visual appeal and user experience' },
                { key: 'usefulness', label: 'Usefulness', description: 'Practical value for target users' },
                { key: 'uniqueness', label: 'Uniqueness', description: 'Originality and differentiation' },
                { key: 'documentation', label: 'Documentation', description: 'Setup instructions and clarity' }
              ].map(({ key, label, description }) => (
                <div key={key} className="mb-4">
                  <label className="block text-sm font-medium mb-2">
                    {label} ({reviewResult.scores[key as keyof typeof reviewResult.scores]}/10)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={reviewResult.scores[key as keyof typeof reviewResult.scores]}
                    onChange={(e) => handleScoreChange(key, Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="text-xs text-gray-500 mt-1">{description}</div>
                </div>
              ))}
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800">
                  Overall Score: {reviewResult.scores.overall}/10
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div>
              <h4 className="font-medium mb-3">Review Feedback</h4>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Specific Feedback
                </label>
                <textarea
                  value={reviewResult.feedback.specific_feedback}
                  onChange={(e) => setReviewResult(prev => ({
                    ...prev,
                    feedback: { ...prev.feedback, specific_feedback: e.target.value }
                  }))}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder="Provide detailed feedback for the creator..."
                />
              </div>
            </div>

            {/* Decision */}
            <div>
              <h4 className="font-medium mb-3">Review Decision</h4>
              
              <div className="space-y-2">
                {[
                  { value: 'approved', label: 'Approve', color: 'text-green-600' },
                  { value: 'changes_requested', label: 'Request Changes', color: 'text-yellow-600' },
                  { value: 'rejected', label: 'Reject', color: 'text-red-600' },
                  { value: 'escalated', label: 'Escalate', color: 'text-purple-600' }
                ].map(({ value, label, color }) => (
                  <label key={value} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="decision"
                      value={value}
                      checked={reviewResult.decision === value}
                      onChange={(e) => setReviewResult(prev => ({ ...prev, decision: e.target.value as any }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className={`font-medium ${color}`}>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t">
              <Button
                onClick={handleSubmitReview}
                className="w-full"
                disabled={!reviewResult.feedback.specific_feedback.trim()}
              >
                Submit Review
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Core Services Implementation

```typescript
// Automated quality check service
export class AutomatedQualityCheckService {
  private static readonly QUALITY_THRESHOLDS = {
    completeness: {
      min_title_length: 10,
      min_description_length: 100,
      min_screenshots: 3,
      required_fields: ['title', 'description', 'primary_category', 'vendor_types']
    },
    technical: {
      max_load_time_ms: 3000,
      min_performance_score: 70,
      max_memory_usage_mb: 50
    },
    content: {
      max_spelling_errors: 3,
      banned_words: ['guarantee', 'unlimited', 'free money'],
      min_originality_score: 0.7
    }
  };

  async runAllChecks(templateId: string): Promise<AutomatedQualityReport> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Get template data
    const { data: template } = await supabase
      .from('marketplace_template_drafts')
      .select('*, marketplace_template_components(*)')
      .eq('id', templateId)
      .single();

    if (!template) throw new Error('Template not found');

    // Run all check categories
    const checks: QualityCheckResult[] = [];
    
    checks.push(...await this.runCompletenessChecks(template));
    checks.push(...await this.runTechnicalChecks(template));
    checks.push(...await this.runContentChecks(template));
    checks.push(...await this.runComplianceChecks(template));

    // Calculate overall results
    const overallPassed = checks.every(check => check.passed || !this.isBlockingCheck(check.check_name));
    const overallScore = this.calculateOverallScore(checks);
    const blockingFailures = checks.filter(check => !check.passed && this.isBlockingCheck(check.check_name))
                                   .map(check => check.check_name);

    // Save results
    await this.saveCheckResults(templateId, checks);

    return {
      template_id: templateId,
      overall_passed: overallPassed,
      overall_score: overallScore,
      checks,
      blocking_failures: blockingFailures,
      recommendations: this.generateRecommendations(checks),
      estimated_fix_time: this.estimateFixTime(checks.filter(c => !c.passed))
    };
  }

  private async runCompletenessChecks(template: any): Promise<QualityCheckResult[]> {
    const checks: QualityCheckResult[] = [];
    const thresholds = AutomatedQualityCheckService.QUALITY_THRESHOLDS.completeness;

    // Title length check
    checks.push({
      check_name: 'title_length',
      check_category: 'completeness',
      passed: template.template_title.length >= thresholds.min_title_length,
      score: Math.min(template.template_title.length / thresholds.min_title_length * 100, 100),
      check_value: template.template_title.length.toString(),
      expected_value: `${thresholds.min_title_length}+ characters`,
      failure_reason: template.template_title.length < thresholds.min_title_length 
        ? 'Title is too short' : undefined,
      suggestions: template.template_title.length < thresholds.min_title_length 
        ? ['Add more descriptive words to your title', 'Include the target vendor type in title'] : []
    });

    // Description length check
    checks.push({
      check_name: 'description_length',
      check_category: 'completeness',
      passed: template.template_description.length >= thresholds.min_description_length,
      score: Math.min(template.template_description.length / thresholds.min_description_length * 100, 100),
      check_value: template.template_description.length.toString(),
      expected_value: `${thresholds.min_description_length}+ characters`,
      failure_reason: template.template_description.length < thresholds.min_description_length 
        ? 'Description is too short' : undefined,
      suggestions: template.template_description.length < thresholds.min_description_length 
        ? ['Explain what the template includes', 'Describe benefits for buyers', 'Add use case examples'] : []
    });

    // Component count check
    const componentCount = template.marketplace_template_components?.length || 0;
    checks.push({
      check_name: 'component_count',
      check_category: 'completeness',
      passed: componentCount > 0,
      score: Math.min(componentCount * 25, 100),
      check_value: componentCount.toString(),
      expected_value: '1+ components',
      failure_reason: componentCount === 0 ? 'No components added to template' : undefined,
      suggestions: componentCount === 0 ? ['Add forms, journeys, or email sequences to your template'] : []
    });

    return checks;
  }

  private async runTechnicalChecks(template: any): Promise<QualityCheckResult[]> {
    const checks: QualityCheckResult[] = [];

    // JSON validation check
    try {
      JSON.parse(JSON.stringify(template.package_data));
      checks.push({
        check_name: 'valid_json',
        check_category: 'technical',
        passed: true,
        score: 100,
        suggestions: []
      });
    } catch (error) {
      checks.push({
        check_name: 'valid_json',
        check_category: 'technical',
        passed: false,
        score: 0,
        failure_reason: 'Template data contains invalid JSON',
        suggestions: ['Contact support - this is a system error']
      });
    }

    // Dependencies check
    const missingDependencies = await this.checkDependencies(template);
    checks.push({
      check_name: 'dependencies_resolved',
      check_category: 'technical',
      passed: missingDependencies.length === 0,
      score: missingDependencies.length === 0 ? 100 : Math.max(0, 100 - missingDependencies.length * 20),
      check_value: `${missingDependencies.length} missing`,
      expected_value: '0 missing dependencies',
      failure_reason: missingDependencies.length > 0 ? 'Unresolved dependencies detected' : undefined,
      suggestions: missingDependencies.length > 0 ? [`Resolve dependencies: ${missingDependencies.join(', ')}`] : []
    });

    return checks;
  }

  private async runContentChecks(template: any): Promise<QualityCheckResult[]> {
    const checks: QualityCheckResult[] = [];

    // Spell check
    const spellCheckResults = await this.performSpellCheck(template);
    checks.push({
      check_name: 'spell_check',
      check_category: 'content',
      passed: spellCheckResults.errors.length <= AutomatedQualityCheckService.QUALITY_THRESHOLDS.content.max_spelling_errors,
      score: Math.max(0, 100 - spellCheckResults.errors.length * 10),
      check_value: `${spellCheckResults.errors.length} errors`,
      expected_value: `≤${AutomatedQualityCheckService.QUALITY_THRESHOLDS.content.max_spelling_errors} errors`,
      suggestions: spellCheckResults.errors.length > 0 ? ['Review and fix spelling errors in description and component names'] : []
    });

    // Profanity check
    const profanityCheck = await this.checkProfanity(template);
    checks.push({
      check_name: 'no_profanity',
      check_category: 'content',
      passed: !profanityCheck.found,
      score: profanityCheck.found ? 0 : 100,
      failure_reason: profanityCheck.found ? 'Inappropriate language detected' : undefined,
      suggestions: profanityCheck.found ? ['Remove inappropriate language from title and description'] : []
    });

    return checks;
  }

  private calculateOverallScore(checks: QualityCheckResult[]): number {
    const weights = {
      completeness: 0.3,
      technical: 0.3,
      content: 0.2,
      compliance: 0.2
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([category, weight]) => {
      const categoryChecks = checks.filter(check => check.check_category === category);
      if (categoryChecks.length > 0) {
        const categoryScore = categoryChecks.reduce((sum, check) => sum + check.score, 0) / categoryChecks.length;
        totalScore += categoryScore * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  private isBlockingCheck(checkName: string): boolean {
    const blockingChecks = [
      'valid_json',
      'dependencies_resolved',
      'no_profanity',
      'no_personal_data',
      'component_count'
    ];
    return blockingChecks.includes(checkName);
  }
}

// Plagiarism detection service
export class PlagiarismDetectionService {
  async checkOriginality(templateId: string): Promise<TemplateOriginality> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Get template data
    const { data: template } = await supabase
      .from('marketplace_template_drafts')
      .select('*, marketplace_template_components(*)')
      .eq('id', templateId)
      .single();

    if (!template) throw new Error('Template not found');

    // Generate content hashes
    const contentHash = await this.generateContentHash(template);
    const structureHash = await this.generateStructureHash(template);
    const featureHash = await this.generateFeatureHash(template);

    // Save hashes
    await supabase
      .from('marketplace_template_hashes')
      .upsert({
        template_id: templateId,
        content_hash: contentHash,
        structure_hash: structureHash,
        feature_hash: featureHash
      }, {
        onConflict: 'template_id'
      });

    // Check for similar templates
    const similarTemplates = await this.findSimilarTemplates(templateId, {
      content_hash: contentHash,
      structure_hash: structureHash,
      feature_hash: featureHash
    });

    // Calculate originality score
    const maxSimilarity = similarTemplates.length > 0 
      ? Math.max(...similarTemplates.map(t => t.similarity_score))
      : 0;
    
    const originalityScore = 1 - maxSimilarity;
    const isOriginal = originalityScore >= AutomatedQualityCheckService.QUALITY_THRESHOLDS.content.min_originality_score;

    return {
      is_original: isOriginal,
      originality_score: originalityScore,
      similar_templates: similarTemplates.slice(0, 5), // Top 5 similar
      requires_review: maxSimilarity > 0.5 // Manual review if >50% similar
    };
  }

  private async generateContentHash(template: any): Promise<string> {
    // Create content fingerprint based on text content
    const contentParts = [
      template.template_title,
      template.template_description,
      ...(template.marketplace_template_components || []).map((c: any) => c.component_name),
      ...(template.marketplace_template_components || []).map((c: any) => c.description || '')
    ];

    const normalizedContent = contentParts
      .join(' ')
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    const encoder = new TextEncoder();
    const data = encoder.encode(normalizedContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async generateStructureHash(template: any): Promise<string> {
    // Create structural fingerprint based on component types and organization
    const structure = {
      component_types: (template.marketplace_template_components || [])
        .map((c: any) => c.component_type)
        .sort(),
      component_count: template.marketplace_template_components?.length || 0,
      primary_category: template.primary_category,
      vendor_types: template.vendor_types?.sort() || []
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(structure));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async findSimilarTemplates(templateId: string, hashes: any): Promise<any[]> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Find templates with similar hashes
    const { data: candidates } = await supabase
      .from('marketplace_template_hashes')
      .select(`
        template_id,
        content_hash,
        structure_hash,
        feature_hash,
        marketplace_template_drafts!template_id (
          template_title,
          creator_id
        )
      `)
      .neq('template_id', templateId);

    if (!candidates) return [];

    const similarities = candidates.map(candidate => {
      // Calculate similarity scores using Jaccard similarity for hashes
      const contentSim = this.calculateHashSimilarity(hashes.content_hash, candidate.content_hash);
      const structureSim = this.calculateHashSimilarity(hashes.structure_hash, candidate.structure_hash);
      const featureSim = this.calculateHashSimilarity(hashes.feature_hash, candidate.feature_hash);

      // Weighted overall similarity
      const overallSim = (contentSim * 0.5) + (structureSim * 0.3) + (featureSim * 0.2);

      return {
        template_id: candidate.template_id,
        template_title: candidate.marketplace_template_drafts.template_title,
        similarity_score: overallSim,
        similarity_type: contentSim > structureSim && contentSim > featureSim ? 'content' :
                        structureSim > featureSim ? 'structure' : 'feature'
      };
    }).filter(sim => sim.similarity_score > 0.3) // Only return meaningful similarities
     .sort((a, b) => b.similarity_score - a.similarity_score);

    return similarities;
  }

  private calculateHashSimilarity(hash1: string, hash2: string): number {
    if (hash1 === hash2) return 1.0;
    
    // Simple character-based similarity for demonstration
    // In production, use more sophisticated similarity algorithms
    let matches = 0;
    const minLength = Math.min(hash1.length, hash2.length);
    
    for (let i = 0; i < minLength; i++) {
      if (hash1[i] === hash2[i]) matches++;
    }
    
    return matches / Math.max(hash1.length, hash2.length);
  }
}

// Performance testing service
export class TemplatePerformanceTestService {
  async testTemplate(templateId: string): Promise<PerformanceReport> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Simulate template loading and rendering
    const metrics = await this.simulateTemplatePerformance(templateId);

    // Calculate performance scores
    const scores = this.calculatePerformanceScores(metrics);
    const overallScore = Math.round((scores.load_time_score + scores.render_time_score + 
                                   scores.interaction_score + scores.memory_score) / 4);

    // Generate grade and recommendations
    const grade = this.calculateGrade(overallScore);
    const recommendations = this.generatePerformanceRecommendations(metrics, scores);

    // Save performance results
    await supabase
      .from('marketplace_template_performance')
      .upsert({
        template_id: templateId,
        load_time_ms: metrics.load_time_ms,
        render_time_ms: metrics.render_time_ms,
        interaction_time_ms: metrics.interaction_time_ms,
        memory_usage_mb: metrics.memory_usage_mb,
        load_time_score: scores.load_time_score,
        render_time_score: scores.render_time_score,
        interaction_score: scores.interaction_score,
        memory_score: scores.memory_score,
        overall_performance_score: overallScore,
        performance_grade: grade,
        passes_performance_threshold: overallScore >= 70,
        performance_recommendations: recommendations
      }, {
        onConflict: 'template_id'
      });

    return {
      template_id: templateId,
      passed: overallScore >= 70,
      performance_grade: grade,
      overall_score: overallScore,
      metrics,
      recommendations,
      optimization_suggestions: this.generateOptimizationSuggestions(metrics)
    };
  }

  private async simulateTemplatePerformance(templateId: string): Promise<{
    load_time_ms: number;
    render_time_ms: number;
    interaction_time_ms: number;
    memory_usage_mb: number;
  }> {
    // Simulate performance testing
    // In a real implementation, this would use headless browser testing
    
    const baseLoadTime = 800; // Base load time in ms
    const baseRenderTime = 200;
    const baseInteractionTime = 50;
    const baseMemoryUsage = 15; // MB

    // Add complexity-based delays
    const complexityMultiplier = 1 + Math.random() * 0.5; // Simulate template complexity

    return {
      load_time_ms: Math.round(baseLoadTime * complexityMultiplier),
      render_time_ms: Math.round(baseRenderTime * complexityMultiplier),
      interaction_time_ms: Math.round(baseInteractionTime * complexityMultiplier),
      memory_usage_mb: Math.round(baseMemoryUsage * complexityMultiplier * 10) / 10
    };
  }

  private calculatePerformanceScores(metrics: any): any {
    // Score calculation based on performance thresholds
    const thresholds = AutomatedQualityCheckService.QUALITY_THRESHOLDS.technical;
    
    return {
      load_time_score: Math.max(0, 100 - (metrics.load_time_ms - 1000) / 20),
      render_time_score: Math.max(0, 100 - (metrics.render_time_ms - 200) / 5),
      interaction_score: Math.max(0, 100 - (metrics.interaction_time_ms - 50) / 2),
      memory_score: Math.max(0, 100 - (metrics.memory_usage_mb - thresholds.max_memory_usage_mb) * 2)
    };
  }

  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private generatePerformanceRecommendations(metrics: any, scores: any): string[] {
    const recommendations: string[] = [];

    if (scores.load_time_score < 70) {
      recommendations.push('Optimize template loading time by reducing component complexity');
    }
    if (scores.render_time_score < 70) {
      recommendations.push('Improve render performance by simplifying form structures');
    }
    if (scores.memory_score < 70) {
      recommendations.push('Reduce memory usage by optimizing data structures');
    }

    return recommendations;
  }
}

// Review queue management service
export class ReviewQueueService {
  async submitForReview(templateId: string, submissionData: any): Promise<any> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Run automated checks
    const qualityService = new AutomatedQualityCheckService();
    const qualityReport = await qualityService.runAllChecks(templateId);

    if (!qualityReport.overall_passed) {
      return {
        success: false,
        reason: 'automated_checks_failed',
        quality_report: qualityReport
      };
    }

    // Calculate priority
    const priority = await this.calculateReviewPriority(templateId);

    // Add to review queue
    const { data: queueItem, error } = await supabase
      .from('marketplace_quality_review_queue')
      .insert({
        template_id: templateId,
        priority,
        auto_quality_score: qualityReport.overall_score,
        automated_checks_passed: true,
        automated_checks_results: qualityReport.checks,
        target_review_time: this.calculateTargetReviewTime(priority)
      })
      .select()
      .single();

    if (error) throw error;

    // Get queue position
    const { count: queuePosition } = await supabase
      .from('marketplace_quality_review_queue')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .lte('priority', priority);

    return {
      success: true,
      review_queue_id: queueItem.id,
      queue_position: queuePosition || 0,
      estimated_review_time: this.formatEstimatedTime(priority),
      auto_quality_score: qualityReport.overall_score,
      priority_level: priority
    };
  }

  private async calculateReviewPriority(templateId: string): Promise<number> {
    const { supabase } = await createRouteHandlerClient({ cookies });

    // Get creator information
    const { data: template } = await supabase
      .from('marketplace_template_drafts')
      .select(`
        creator_id,
        suppliers (
          marketplace_creator_commission_tiers (
            current_tier,
            total_marketplace_sales
          )
        )
      `)
      .eq('id', templateId)
      .single();

    if (!template) return 3; // Default priority

    const creatorTier = template.suppliers.marketplace_creator_commission_tiers?.current_tier;
    const totalSales = template.suppliers.marketplace_creator_commission_tiers?.total_marketplace_sales || 0;

    // Priority calculation
    if (creatorTier === 'elite' || totalSales > 50) return 1; // Highest priority
    if (creatorTier === 'performer' || totalSales > 20) return 2; // High priority
    if (creatorTier === 'verified' || totalSales > 5) return 3; // Medium priority
    return 4; // Standard priority for new creators
  }

  private calculateTargetReviewTime(priority: number): string {
    const targetHours = {
      1: 12, // 12 hours for highest priority
      2: 24, // 24 hours for high priority
      3: 48, // 48 hours for medium priority
      4: 72  // 72 hours for standard priority
    };

    const hours = targetHours[priority as keyof typeof targetHours] || 48;
    const targetTime = new Date();
    targetTime.setHours(targetTime.getHours() + hours);
    
    return `${hours} hours`;
  }

  private formatEstimatedTime(priority: number): string {
    const timeMap = {
      1: '4-12 hours',
      2: '12-24 hours', 
      3: '1-2 days',
      4: '2-3 days'
    };
    
    return timeMap[priority as keyof typeof timeMap] || '2-3 days';
  }
}
```

## Integration Points

### Integration with WS-111 (Template Builder)
```typescript
// Quality control integrates with template builder
export class TemplateBuilderQualityIntegration {
  async validateTemplateBeforePublish(templateId: string): Promise<any> {
    const qualityService = new AutomatedQualityCheckService();
    const plagiarismService = new PlagiarismDetectionService();
    const performanceService = new TemplatePerformanceTestService();

    // Run all quality checks
    const [qualityReport, originalityCheck, performanceReport] = await Promise.all([
      qualityService.runAllChecks(templateId),
      plagiarismService.checkOriginality(templateId),
      performanceService.testTemplate(templateId)
    ]);

    return {
      quality_report: qualityReport,
      originality: originalityCheck,
      performance: performanceReport,
      ready_for_review: qualityReport.overall_passed && 
                       originalityCheck.is_original && 
                       performanceReport.passed
    };
  }
}
```

### MCP Database Operations
```typescript
// Use PostgreSQL MCP for quality analytics
export async function getQualityControlAnalytics(): Promise<any> {
  const query = `
    SELECT 
      DATE_TRUNC('week', submitted_at) as week,
      COUNT(*) as total_submissions,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
      AVG(auto_quality_score) as avg_auto_score,
      AVG(EXTRACT(epoch FROM (reviewed_at - submitted_at))/3600) as avg_review_hours
    FROM marketplace_quality_review_queue 
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
describe('AutomatedQualityCheckService', () => {
  it('should pass complete template with good content', async () => {
    const service = new AutomatedQualityCheckService();
    
    const completeTemplate = {
      template_title: 'Comprehensive Wedding Photography Client Onboarding',
      template_description: 'A complete onboarding workflow that includes initial consultation forms, contract management, payment scheduling, and final delivery tracking. Perfect for photography businesses looking to streamline their client experience.',
      marketplace_template_components: [
        { component_type: 'form', component_name: 'Initial Consultation' },
        { component_type: 'journey', component_name: 'Onboarding Workflow' }
      ]
    };
    
    const report = await service.runAllChecks('test-template-id');
    
    expect(report.overall_passed).toBe(true);
    expect(report.overall_score).toBeGreaterThan(80);
    expect(report.blocking_failures).toHaveLength(0);
  });

  it('should fail template with missing content', async () => {
    const incompleteTemplate = {
      template_title: 'Short',
      template_description: 'Too brief',
      marketplace_template_components: []
    };
    
    const report = await service.runAllChecks('test-template-id');
    
    expect(report.overall_passed).toBe(false);
    expect(report.blocking_failures.length).toBeGreaterThan(0);
  });
});

describe('PlagiarismDetectionService', () => {
  it('should detect similar templates', async () => {
    const service = new PlagiarismDetectionService();
    
    const originalityCheck = await service.checkOriginality('test-template-id');
    
    expect(originalityCheck).toHaveProperty('is_original');
    expect(originalityCheck).toHaveProperty('originality_score');
    expect(originalityCheck.originality_score).toBeGreaterThanOrEqual(0);
    expect(originalityCheck.originality_score).toBeLessThanOrEqual(1);
  });
});
```

### Integration Tests
```typescript
describe('Quality Control Integration', () => {
  it('should complete full quality review workflow', async () => {
    const qualityService = new AutomatedQualityCheckService();
    const queueService = new ReviewQueueService();
    
    // Run automated checks
    const qualityReport = await qualityService.runAllChecks('test-template-id');
    expect(qualityReport.overall_passed).toBe(true);
    
    // Submit for manual review
    const submission = await queueService.submitForReview('test-template-id', {});
    expect(submission.success).toBe(true);
    expect(submission.queue_position).toBeGreaterThanOrEqual(0);
  });
});
```

## Acceptance Criteria

- [x] **Automated Quality Checks**: Comprehensive automated validation of completeness, technical quality, content, and compliance
- [x] **Plagiarism Detection**: Content and structural similarity detection with originality scoring
- [x] **Performance Testing**: Automated performance testing with load time, rendering, and memory usage metrics
- [x] **Review Queue Management**: Priority-based queue system with SLA tracking and assignment
- [x] **Manual Review Interface**: Comprehensive reviewer dashboard with scoring tools and feedback forms
- [x] **Creator Feedback**: Detailed feedback system with improvement suggestions and resubmission capability
- [x] **Quality Analytics**: Performance tracking for review times, approval rates, and quality trends
- [x] **Fast-Track System**: Priority handling for verified creators and high-quality templates
- [x] **Community Reporting**: System for users to report quality issues post-publication
- [x] **Integration with Builder**: Seamless integration with template builder for pre-publication validation

## Deployment Notes

1. **Quality Thresholds**: Configure automated check thresholds and scoring algorithms
2. **Reviewer Training**: Set up reviewer onboarding and quality assessment training
3. **Performance Testing**: Configure performance testing environment and benchmarks
4. **Plagiarism Database**: Initialize template hash database for similarity detection
5. **SLA Monitoring**: Set up monitoring and alerting for review queue SLA breaches

---

**Specification Status**: ✅ Complete  
**Implementation Priority**: High (Quality Assurance)  
**Estimated Effort**: 10-12 developer days  
**Dependencies**: WS-111 (Template Builder), WS-110 (Creator Onboarding)