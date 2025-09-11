# WS-028: A/B Testing for Journeys - Technical Specification

## User Story

**As a wedding photographer**, I need to test different versions of my client communication journeys to optimize engagement and booking conversion rates through data-driven decisions.

**Real Wedding Scenario**: Alex, a photographer, wants to improve her consultation booking rate. She creates an A/B test comparing two journey variants: Version A sends formal emails with detailed portfolios, Version B sends casual texts with behind-the-scenes photos. After testing with 100 leads each, Version B shows 35% higher engagement and 28% more bookings. Alex confidently switches all new leads to the winning variant.

## Database Schema

```sql
-- A/B test configurations
CREATE TABLE ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  test_name VARCHAR(200) NOT NULL,
  test_description TEXT,
  test_type VARCHAR(30) NOT NULL, -- 'journey_variant', 'timing', 'content', 'channel'
  target_journey_id UUID, -- Base journey being tested
  hypothesis TEXT,
  success_metrics JSONB NOT NULL, -- Array of metric definitions
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed', 'archived'
  traffic_allocation JSONB NOT NULL, -- Percentage split between variants
  min_sample_size INTEGER DEFAULT 100,
  max_duration_days INTEGER DEFAULT 30,
  confidence_level DECIMAL(3,2) DEFAULT 0.95, -- 95% confidence
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  winner_variant_id UUID,
  auto_promote_winner BOOLEAN DEFAULT TRUE,
  rollout_percentage INTEGER DEFAULT 100, -- Gradual rollout of winner
  created_by UUID REFERENCES suppliers(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_ab_tests_supplier_status (supplier_id, status),
  INDEX idx_ab_tests_journey (target_journey_id),
  INDEX idx_ab_tests_running (status, start_date) WHERE status = 'running'
);

-- Test variants (different versions being tested)
CREATE TABLE ab_test_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_name VARCHAR(100) NOT NULL,
  variant_description TEXT,
  traffic_percentage INTEGER NOT NULL, -- 0-100
  is_control BOOLEAN DEFAULT FALSE,
  journey_config JSONB NOT NULL, -- Complete journey configuration
  participant_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0,
  total_revenue_cents INTEGER DEFAULT 0,
  metrics_data JSONB DEFAULT '{}', -- Cached performance metrics
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_variants_test (test_id),
  UNIQUE(test_id, variant_name)
);

-- Test participants (clients assigned to variants)
CREATE TABLE ab_test_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES ab_test_variants(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  journey_instance_id UUID, -- Links to actual journey execution
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  first_interaction_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ,
  conversion_events JSONB DEFAULT '[]', -- Array of conversion events
  custom_metrics JSONB DEFAULT '{}', -- Additional tracking data
  completed_at TIMESTAMPTZ,
  
  UNIQUE(test_id, client_id),
  INDEX idx_participants_test_variant (test_id, variant_id),
  INDEX idx_participants_client (client_id),
  INDEX idx_participants_journey (journey_instance_id)
);

-- Test metrics and events
CREATE TABLE ab_test_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES ab_test_variants(id) ON DELETE CASCADE,
  participant_id UUID REFERENCES ab_test_participants(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'page_view', 'email_open', 'click', 'conversion', 'booking'
  event_name VARCHAR(100),
  event_value DECIMAL(10,2), -- Revenue or other numeric value
  event_metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_test_events_test_variant (test_id, variant_id, event_type),
  INDEX idx_test_events_participant (participant_id, timestamp),
  INDEX idx_test_events_type_time (event_type, timestamp)
);

-- Statistical analysis results
CREATE TABLE ab_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  metric_name VARCHAR(100) NOT NULL,
  control_variant_id UUID REFERENCES ab_test_variants(id),
  test_variant_id UUID REFERENCES ab_test_variants(id),
  control_value DECIMAL(10,4),
  test_value DECIMAL(10,4),
  relative_difference DECIMAL(10,4), -- Percentage change
  statistical_significance BOOLEAN DEFAULT FALSE,
  p_value DECIMAL(10,8),
  confidence_interval_lower DECIMAL(10,4),
  confidence_interval_upper DECIMAL(10,4),
  sample_size_control INTEGER,
  sample_size_test INTEGER,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_test_results_test_metric (test_id, metric_name),
  INDEX idx_test_results_significance (statistical_significance, calculated_at)
);

-- Test segment rules (who gets included in tests)
CREATE TABLE ab_test_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  segment_name VARCHAR(100) NOT NULL,
  inclusion_rules JSONB NOT NULL, -- Criteria for including clients
  exclusion_rules JSONB DEFAULT '[]', -- Criteria for excluding clients
  priority INTEGER DEFAULT 1, -- Higher priority segments evaluated first
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_test_segments_test (test_id, priority)
);

-- Test insights and recommendations
CREATE TABLE ab_test_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  insight_type VARCHAR(50) NOT NULL, -- 'performance', 'statistical', 'recommendation'
  title VARCHAR(200) NOT NULL,
  description TEXT,
  confidence_score DECIMAL(3,2), -- 0.0 to 1.0
  action_required BOOLEAN DEFAULT FALSE,
  insight_data JSONB DEFAULT '{}',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID REFERENCES suppliers(id),
  
  INDEX idx_test_insights_test_type (test_id, insight_type),
  INDEX idx_test_insights_action (action_required, generated_at)
);

-- Indexes for performance optimization
CREATE INDEX idx_ab_tests_date_range ON ab_tests(start_date, end_date) WHERE status = 'running';
CREATE INDEX idx_ab_test_events_aggregation ON ab_test_events(test_id, variant_id, event_type, timestamp);
CREATE INDEX idx_participants_conversion ON ab_test_participants(test_id, completed_at) WHERE completed_at IS NOT NULL;

-- Function to calculate statistical significance
CREATE OR REPLACE FUNCTION calculate_statistical_significance(
  control_conversions INTEGER,
  control_total INTEGER,
  test_conversions INTEGER,
  test_total INTEGER
) RETURNS TABLE(
  p_value DECIMAL(10,8),
  is_significant BOOLEAN,
  confidence_lower DECIMAL(10,4),
  confidence_upper DECIMAL(10,4)
) AS $$
DECLARE
  control_rate DECIMAL := control_conversions::DECIMAL / NULLIF(control_total, 0);
  test_rate DECIMAL := test_conversions::DECIMAL / NULLIF(test_total, 0);
  pooled_rate DECIMAL := (control_conversions + test_conversions)::DECIMAL / NULLIF(control_total + test_total, 0);
  se DECIMAL := SQRT(pooled_rate * (1 - pooled_rate) * (1.0/control_total + 1.0/test_total));
  z_score DECIMAL := (test_rate - control_rate) / NULLIF(se, 0);
  p_val DECIMAL;
  margin_error DECIMAL := 1.96 * se; -- 95% confidence
BEGIN
  -- Simplified p-value calculation (in production, use proper statistical library)
  p_val := 2 * (1 - abs(z_score) / 3.0); -- Approximation
  
  RETURN QUERY SELECT
    p_val,
    p_val < 0.05,
    (test_rate - control_rate) - margin_error,
    (test_rate - control_rate) + margin_error;
END;
$$ LANGUAGE plpgsql;
```

## API Endpoints

```typescript
// A/B testing data types
interface ABTest {
  id: string;
  supplierId: string;
  testName: string;
  testDescription?: string;
  testType: 'journey_variant' | 'timing' | 'content' | 'channel';
  targetJourneyId?: string;
  hypothesis?: string;
  successMetrics: SuccessMetric[];
  status: 'draft' | 'running' | 'paused' | 'completed' | 'archived';
  trafficAllocation: TrafficAllocation;
  minSampleSize: number;
  maxDurationDays: number;
  confidenceLevel: number;
  startDate?: string;
  endDate?: string;
  winnerVariantId?: string;
  autoPromoteWinner: boolean;
  rolloutPercentage: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface SuccessMetric {
  name: string;
  type: 'conversion_rate' | 'revenue' | 'engagement' | 'retention';
  description: string;
  eventName: string;
  isPrimary: boolean;
  target?: number;
}

interface TrafficAllocation {
  variants: VariantAllocation[];
  mode: 'equal' | 'weighted' | 'dynamic';
}

interface VariantAllocation {
  variantId: string;
  percentage: number;
}

interface ABTestVariant {
  id: string;
  testId: string;
  variantName: string;
  variantDescription?: string;
  trafficPercentage: number;
  isControl: boolean;
  journeyConfig: JourneyConfiguration;
  participantCount: number;
  conversionCount: number;
  totalRevenueCents: number;
  metricsData: VariantMetrics;
  isWinner: boolean;
  createdAt: string;
  updatedAt: string;
}

interface JourneyConfiguration {
  modules: JourneyModule[];
  triggers: JourneyTrigger[];
  settings: JourneySettings;
}

interface VariantMetrics {
  conversionRate: number;
  averageRevenuePerUser: number;
  engagementScore: number;
  retentionRate: number;
  customMetrics: Record<string, number>;
}

interface ABTestParticipant {
  id: string;
  testId: string;
  variantId: string;
  clientId: string;
  journeyInstanceId?: string;
  assignedAt: string;
  firstInteractionAt?: string;
  lastInteractionAt?: string;
  conversionEvents: ConversionEvent[];
  customMetrics: Record<string, any>;
  completedAt?: string;
}

interface ConversionEvent {
  eventType: string;
  eventName: string;
  value?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

interface ABTestResults {
  testId: string;
  variants: VariantResults[];
  winnerAnalysis: WinnerAnalysis;
  statisticalSignificance: StatisticalSignificance;
  insights: TestInsight[];
  recommendations: string[];
}

interface VariantResults {
  variantId: string;
  variantName: string;
  isControl: boolean;
  participantCount: number;
  metrics: Record<string, MetricResult>;
  performance: PerformanceData;
}

interface MetricResult {
  value: number;
  conversionRate: number;
  confidenceInterval: [number, number];
  sampleSize: number;
}

interface StatisticalSignificance {
  isSignificant: boolean;
  pValue: number;
  confidenceLevel: number;
  sampleSizeAdequate: boolean;
  recommendedAction: 'continue' | 'stop_winner' | 'stop_inconclusive' | 'need_more_data';
}

interface TestInsight {
  type: 'performance' | 'statistical' | 'recommendation';
  title: string;
  description: string;
  confidenceScore: number;
  actionRequired: boolean;
  data: Record<string, any>;
}

// API Routes
// POST /api/ab-testing/tests
interface CreateABTestRequest {
  testName: string;
  testDescription?: string;
  testType: string;
  targetJourneyId?: string;
  hypothesis?: string;
  successMetrics: SuccessMetric[];
  variants: Array<{
    variantName: string;
    variantDescription?: string;
    trafficPercentage: number;
    isControl?: boolean;
    journeyConfig: JourneyConfiguration;
  }>;
  segments?: Array<{
    segmentName: string;
    inclusionRules: any[];
    exclusionRules?: any[];
  }>;
  minSampleSize?: number;
  maxDurationDays?: number;
  confidenceLevel?: number;
  autoPromoteWinner?: boolean;
}

interface CreateABTestResponse {
  success: boolean;
  data: ABTest;
}

// GET /api/ab-testing/tests
interface GetABTestsRequest {
  status?: string;
  testType?: string;
  createdBy?: string;
  page?: number;
  limit?: number;
}

interface GetABTestsResponse {
  success: boolean;
  data: ABTest[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// GET /api/ab-testing/tests/:testId/results
interface GetABTestResultsResponse {
  success: boolean;
  data: ABTestResults;
}

// POST /api/ab-testing/tests/:testId/start
interface StartABTestRequest {
  startDate?: string;
  notifyTeam?: boolean;
}

interface StartABTestResponse {
  success: boolean;
  data: {
    status: string;
    participantsEnrolled: number;
    estimatedDuration: string;
  };
}

// POST /api/ab-testing/tests/:testId/stop
interface StopABTestRequest {
  reason: 'completed' | 'inconclusive' | 'external_factors' | 'business_decision';
  promoteWinner?: boolean;
  winnerVariantId?: string;
  notes?: string;
}

interface StopABTestResponse {
  success: boolean;
  data: {
    finalResults: ABTestResults;
    winnerPromoted: boolean;
    affectedJourneys: string[];
  };
}

// POST /api/ab-testing/participants/assign
interface AssignParticipantRequest {
  testId: string;
  clientId: string;
  forceVariantId?: string; // For testing purposes
}

interface AssignParticipantResponse {
  success: boolean;
  data: {
    participantId: string;
    variantId: string;
    variantName: string;
    journeyConfig: JourneyConfiguration;
  };
}

// POST /api/ab-testing/events
interface TrackEventRequest {
  testId: string;
  participantId: string;
  eventType: string;
  eventName: string;
  eventValue?: number;
  eventMetadata?: Record<string, any>;
}

interface TrackEventResponse {
  success: boolean;
  data: {
    eventId: string;
    processed: boolean;
  };
}

// GET /api/ab-testing/analytics/dashboard
interface GetABTestingDashboardResponse {
  success: boolean;
  data: {
    overview: {
      activeTests: number;
      totalParticipants: number;
      completedTests: number;
      averageUplift: number;
    };
    activeTests: Array<{
      test: ABTest;
      progress: {
        participantsEnrolled: number;
        daysRunning: number;
        estimatedTimeToCompletion: string;
      };
      earlyIndicators: {
        leadingVariant: string;
        confidenceLevel: number;
        recommendedAction: string;
      };
    }>;
    recentCompletions: Array<{
      test: ABTest;
      winner: string;
      uplift: number;
      significance: boolean;
    }>;
    insights: TestInsight[];
  };
}
```

## Frontend Components

```typescript
// ABTestingDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ABTestingDashboardProps {
  supplierId: string;
}

export const ABTestingDashboard: React.FC<ABTestingDashboardProps> = ({ supplierId }) => {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [tests, setTests] = useState<ABTest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadTests();
  }, [supplierId]);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/ab-testing/analytics/dashboard');
      const data = await response.json();
      setDashboardData(data.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const loadTests = async () => {
    try {
      const response = await fetch('/api/ab-testing/tests');
      const data = await response.json();
      setTests(data.data);
    } catch (error) {
      console.error('Failed to load tests:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading A/B testing dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {dashboardData?.overview.activeTests || 0}
            </p>
            <p className="text-sm text-gray-500">Active Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {dashboardData?.overview.totalParticipants?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-500">Total Participants</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {dashboardData?.overview.completedTests || 0}
            </p>
            <p className="text-sm text-gray-500">Completed Tests</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              +{((dashboardData?.overview.averageUplift || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">Avg Uplift</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="active">Active Tests</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
          </TabsList>
          <Button onClick={() => window.location.href = '/ab-testing/create'}>
            Create Test
          </Button>
        </div>

        <TabsContent value="active">
          <ActiveTestsView 
            tests={dashboardData?.activeTests || []}
            onRefresh={loadDashboardData}
          />
        </TabsContent>

        <TabsContent value="completed">
          <CompletedTestsView 
            tests={dashboardData?.recentCompletions || []}
            onRefresh={loadDashboardData}
          />
        </TabsContent>

        <TabsContent value="insights">
          <TestInsightsView insights={dashboardData?.insights || []} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ABTestBuilder.tsx
interface ABTestBuilderProps {
  supplierId: string;
  baseJourneyId?: string;
}

export const ABTestBuilder: React.FC<ABTestBuilderProps> = ({ 
  supplierId, 
  baseJourneyId 
}) => {
  const [step, setStep] = useState<'setup' | 'variants' | 'metrics' | 'segments' | 'review'>('setup');
  const [testData, setTestData] = useState<Partial<ABTest>>({
    testName: '',
    testType: 'journey_variant',
    successMetrics: [],
    minSampleSize: 100,
    maxDurationDays: 30,
    confidenceLevel: 0.95,
    autoPromoteWinner: true
  });
  const [variants, setVariants] = useState<Partial<ABTestVariant>[]>([
    { variantName: 'Control', isControl: true, trafficPercentage: 50 },
    { variantName: 'Variant A', isControl: false, trafficPercentage: 50 }
  ]);

  const updateTestData = (updates: Partial<ABTest>) => {
    setTestData({ ...testData, ...updates });
  };

  const addVariant = () => {
    const newVariant = {
      variantName: `Variant ${String.fromCharCode(65 + variants.length - 1)}`,
      isControl: false,
      trafficPercentage: 0
    };
    setVariants([...variants, newVariant]);
    redistributeTraffic();
  };

  const redistributeTraffic = () => {
    const equalPercentage = Math.floor(100 / variants.length);
    const updatedVariants = variants.map(variant => ({
      ...variant,
      trafficPercentage: equalPercentage
    }));
    setVariants(updatedVariants);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <ABTestBuilderSteps currentStep={step} onStepSelect={setStep} />
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {step === 'setup' && (
            <TestSetupStep 
              data={testData}
              onChange={updateTestData}
              onNext={() => setStep('variants')}
            />
          )}

          {step === 'variants' && (
            <VariantConfigurationStep 
              variants={variants}
              onChange={setVariants}
              onAddVariant={addVariant}
              onNext={() => setStep('metrics')}
              onBack={() => setStep('setup')}
            />
          )}

          {step === 'metrics' && (
            <MetricsConfigurationStep 
              metrics={testData.successMetrics || []}
              onChange={(metrics) => updateTestData({ successMetrics: metrics })}
              onNext={() => setStep('segments')}
              onBack={() => setStep('variants')}
            />
          )}

          {step === 'segments' && (
            <SegmentConfigurationStep 
              onNext={() => setStep('review')}
              onBack={() => setStep('metrics')}
            />
          )}

          {step === 'review' && (
            <TestReviewStep 
              testData={testData}
              variants={variants}
              onLaunch={() => createAndLaunchTest()}
              onBack={() => setStep('segments')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// TestResultsView.tsx
interface TestResultsViewProps {
  testId: string;
}

export const TestResultsView: React.FC<TestResultsViewProps> = ({ testId }) => {
  const [results, setResults] = useState<ABTestResults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, [testId]);

  const loadResults = async () => {
    try {
      const response = await fetch(`/api/ab-testing/tests/${testId}/results`);
      const data = await response.json();
      setResults(data.data);
    } catch (error) {
      console.error('Failed to load test results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading test results...</div>;
  if (!results) return <div>No results available</div>;

  return (
    <div className="space-y-6">
      {/* Winner Summary */}
      {results.winnerAnalysis && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="text-green-800">🏆 Test Winner</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {results.winnerAnalysis.winnerVariant} wins with{' '}
                <span className="text-green-600 font-bold">
                  +{(results.winnerAnalysis.uplift * 100).toFixed(1)}%
                </span>{' '}
                improvement
              </p>
              <p className="text-sm text-gray-600">
                Confidence: {(results.statisticalSignificance.confidenceLevel * 100).toFixed(0)}%
                {results.statisticalSignificance.isSignificant && ' (Statistically Significant)'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variant Performance Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Variant Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.variants.map((variant) => (
              <VariantPerformanceCard 
                key={variant.variantId}
                variant={variant}
                isWinner={variant.variantId === results.winnerAnalysis?.winnerVariantId}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Statistical Significance */}
      <Card>
        <CardHeader>
          <CardTitle>Statistical Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <StatisticalSignificanceView significance={results.statisticalSignificance} />
        </CardContent>
      </Card>

      {/* Insights and Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.insights.map((insight, index) => (
              <InsightCard key={index} insight={insight} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button 
              onClick={() => promoteWinner()}
              disabled={!results.statisticalSignificance.isSignificant}
            >
              Promote Winner
            </Button>
            <Button variant="outline" onClick={() => runFollowUpTest()}>
              Run Follow-up Test
            </Button>
            <Button variant="outline" onClick={() => exportResults()}>
              Export Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
```

## Code Examples

### A/B Testing Service

```typescript
// lib/services/ab-testing-service.ts
import { createClient } from '@supabase/supabase-js';

export class ABTestingService {
  private supabase: any;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }

  async createTest(supplierId: string, testData: any): Promise<ABTest> {
    // Validate traffic allocation sums to 100%
    const totalAllocation = testData.variants.reduce((sum: number, v: any) => sum + v.trafficPercentage, 0);
    if (totalAllocation !== 100) {
      throw new Error('Traffic allocation must sum to 100%');
    }

    // Create test record
    const { data: test, error: testError } = await this.supabase
      .from('ab_tests')
      .insert({
        supplier_id: supplierId,
        test_name: testData.testName,
        test_description: testData.testDescription,
        test_type: testData.testType,
        target_journey_id: testData.targetJourneyId,
        hypothesis: testData.hypothesis,
        success_metrics: testData.successMetrics,
        traffic_allocation: { variants: testData.variants.map((v: any) => ({ variantId: v.tempId, percentage: v.trafficPercentage })) },
        min_sample_size: testData.minSampleSize,
        max_duration_days: testData.maxDurationDays,
        confidence_level: testData.confidenceLevel,
        auto_promote_winner: testData.autoPromoteWinner,
        created_by: supplierId
      })
      .select()
      .single();

    if (testError) throw new Error(`Failed to create test: ${testError.message}`);

    // Create variants
    const variantInserts = testData.variants.map((variant: any) => ({
      test_id: test.id,
      variant_name: variant.variantName,
      variant_description: variant.variantDescription,
      traffic_percentage: variant.trafficPercentage,
      is_control: variant.isControl,
      journey_config: variant.journeyConfig
    }));

    const { data: variants, error: variantsError } = await this.supabase
      .from('ab_test_variants')
      .insert(variantInserts)
      .select();

    if (variantsError) throw new Error(`Failed to create variants: ${variantsError.message}`);

    // Update traffic allocation with real variant IDs
    const trafficAllocation = {
      variants: variants.map((v: any) => ({ variantId: v.id, percentage: v.traffic_percentage })),
      mode: 'weighted'
    };

    await this.supabase
      .from('ab_tests')
      .update({ traffic_allocation: trafficAllocation })
      .eq('id', test.id);

    return { ...test, variants };
  }

  async assignParticipant(testId: string, clientId: string, forceVariantId?: string): Promise<any> {
    // Check if client is already in this test
    const { data: existing } = await this.supabase
      .from('ab_test_participants')
      .select('*')
      .eq('test_id', testId)
      .eq('client_id', clientId)
      .single();

    if (existing) {
      return existing;
    }

    // Get test configuration
    const { data: test } = await this.supabase
      .from('ab_tests')
      .select(`
        *,
        variants:ab_test_variants(*)
      `)
      .eq('id', testId)
      .single();

    if (!test || test.status !== 'running') {
      throw new Error('Test not available for enrollment');
    }

    // Check if client meets segment criteria
    const meetsSegmentCriteria = await this.checkSegmentEligibility(testId, clientId);
    if (!meetsSegmentCriteria) {
      throw new Error('Client does not meet test segment criteria');
    }

    // Select variant
    let selectedVariant;
    if (forceVariantId) {
      selectedVariant = test.variants.find((v: any) => v.id === forceVariantId);
    } else {
      selectedVariant = this.selectVariantByTraffic(test.variants, test.traffic_allocation);
    }

    if (!selectedVariant) {
      throw new Error('No variant available for assignment');
    }

    // Create participant record
    const { data: participant, error } = await this.supabase
      .from('ab_test_participants')
      .insert({
        test_id: testId,
        variant_id: selectedVariant.id,
        client_id: clientId
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to assign participant: ${error.message}`);

    // Update variant participant count
    await this.supabase
      .from('ab_test_variants')
      .update({ participant_count: selectedVariant.participant_count + 1 })
      .eq('id', selectedVariant.id);

    return {
      participantId: participant.id,
      variantId: selectedVariant.id,
      variantName: selectedVariant.variant_name,
      journeyConfig: selectedVariant.journey_config
    };
  }

  private selectVariantByTraffic(variants: any[], trafficAllocation: any): any {
    const random = Math.random() * 100;
    let cumulativePercentage = 0;

    for (const allocation of trafficAllocation.variants) {
      cumulativePercentage += allocation.percentage;
      if (random <= cumulativePercentage) {
        return variants.find(v => v.id === allocation.variantId);
      }
    }

    // Fallback to control
    return variants.find(v => v.is_control);
  }

  async trackEvent(
    testId: string,
    participantId: string,
    eventType: string,
    eventName: string,
    eventValue?: number,
    metadata?: any
  ): Promise<void> {
    // Get participant info
    const { data: participant } = await this.supabase
      .from('ab_test_participants')
      .select('*')
      .eq('id', participantId)
      .single();

    if (!participant) {
      throw new Error('Participant not found');
    }

    // Record event
    await this.supabase
      .from('ab_test_events')
      .insert({
        test_id: testId,
        variant_id: participant.variant_id,
        participant_id: participantId,
        event_type: eventType,
        event_name: eventName,
        event_value: eventValue,
        event_metadata: metadata
      });

    // Update participant conversion if this is a conversion event
    if (eventType === 'conversion') {
      const existingEvents = participant.conversion_events || [];
      const updatedEvents = [...existingEvents, {
        eventType,
        eventName,
        value: eventValue,
        timestamp: new Date().toISOString(),
        metadata
      }];

      await this.supabase
        .from('ab_test_participants')
        .update({
          conversion_events: updatedEvents,
          last_interaction_at: new Date().toISOString(),
          ...(eventName === 'completed' && { completed_at: new Date().toISOString() })
        })
        .eq('id', participantId);

      // Update variant conversion count
      await this.updateVariantMetrics(participant.variant_id);
    }
  }

  private async updateVariantMetrics(variantId: string): Promise<void> {
    const { data: events } = await this.supabase
      .from('ab_test_events')
      .select('event_type, event_value')
      .eq('variant_id', variantId);

    const conversionCount = events?.filter(e => e.event_type === 'conversion').length || 0;
    const totalRevenue = events?.reduce((sum, e) => sum + (e.event_value || 0), 0) || 0;

    await this.supabase
      .from('ab_test_variants')
      .update({
        conversion_count: conversionCount,
        total_revenue_cents: Math.round(totalRevenue * 100)
      })
      .eq('id', variantId);
  }

  async calculateResults(testId: string): Promise<ABTestResults> {
    // Get test and variants data
    const { data: test } = await this.supabase
      .from('ab_tests')
      .select(`
        *,
        variants:ab_test_variants(*),
        events:ab_test_events(*)
      `)
      .eq('id', testId)
      .single();

    if (!test) throw new Error('Test not found');

    // Calculate metrics for each variant
    const variantResults = test.variants.map((variant: any) => {
      const variantEvents = test.events.filter((e: any) => e.variant_id === variant.id);
      const conversions = variantEvents.filter((e: any) => e.event_type === 'conversion');
      
      return {
        variantId: variant.id,
        variantName: variant.variant_name,
        isControl: variant.is_control,
        participantCount: variant.participant_count,
        conversionCount: conversions.length,
        conversionRate: variant.participant_count > 0 ? conversions.length / variant.participant_count : 0,
        averageRevenue: variant.participant_count > 0 ? (variant.total_revenue_cents / 100) / variant.participant_count : 0,
        metrics: this.calculateVariantMetrics(variant, variantEvents)
      };
    });

    // Find control variant
    const controlVariant = variantResults.find(v => v.isControl);
    if (!controlVariant) throw new Error('No control variant found');

    // Calculate statistical significance for each test variant
    const statisticalAnalysis = variantResults
      .filter(v => !v.isControl)
      .map(variant => {
        const significance = this.calculateStatisticalSignificance(
          controlVariant.conversionCount,
          controlVariant.participantCount,
          variant.conversionCount,
          variant.participantCount
        );

        return {
          variantId: variant.variantId,
          significance
        };
      });

    // Determine winner
    const winnerAnalysis = this.determineWinner(variantResults, statisticalAnalysis);

    // Generate insights
    const insights = this.generateInsights(test, variantResults, statisticalAnalysis);

    return {
      testId,
      variants: variantResults,
      winnerAnalysis,
      statisticalSignificance: this.aggregateStatisticalSignificance(statisticalAnalysis),
      insights,
      recommendations: this.generateRecommendations(winnerAnalysis, statisticalAnalysis)
    };
  }

  private calculateStatisticalSignificance(
    controlConversions: number,
    controlTotal: number,
    testConversions: number,
    testTotal: number
  ): any {
    if (controlTotal === 0 || testTotal === 0) {
      return { isSignificant: false, pValue: 1.0, confidenceLevel: 0 };
    }

    const controlRate = controlConversions / controlTotal;
    const testRate = testConversions / testTotal;
    const pooledRate = (controlConversions + testConversions) / (controlTotal + testTotal);
    const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlTotal + 1/testTotal));
    
    if (standardError === 0) {
      return { isSignificant: false, pValue: 1.0, confidenceLevel: 0 };
    }

    const zScore = (testRate - controlRate) / standardError;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore)));
    
    return {
      isSignificant: pValue < 0.05,
      pValue,
      confidenceLevel: 1 - pValue,
      uplift: controlRate > 0 ? (testRate - controlRate) / controlRate : 0,
      marginOfError: 1.96 * standardError
    };
  }

  private normalCDF(x: number): number {
    // Approximation of normal cumulative distribution function
    return (1.0 + this.erf(x / Math.sqrt(2.0))) / 2.0;
  }

  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  async startTest(testId: string): Promise<void> {
    const { error } = await this.supabase
      .from('ab_tests')
      .update({
        status: 'running',
        start_date: new Date().toISOString()
      })
      .eq('id', testId);

    if (error) throw new Error(`Failed to start test: ${error.message}`);
  }

  async stopTest(testId: string, reason: string, promoteWinner: boolean = false): Promise<any> {
    // Calculate final results
    const results = await this.calculateResults(testId);

    // Update test status
    const { error } = await this.supabase
      .from('ab_tests')
      .update({
        status: 'completed',
        end_date: new Date().toISOString(),
        winner_variant_id: results.winnerAnalysis?.winnerVariantId
      })
      .eq('id', testId);

    if (error) throw new Error(`Failed to stop test: ${error.message}`);

    // Promote winner if requested and significant
    if (promoteWinner && results.statisticalSignificance.isSignificant) {
      await this.promoteWinner(testId, results.winnerAnalysis.winnerVariantId);
    }

    return results;
  }

  private async promoteWinner(testId: string, winnerVariantId: string): Promise<void> {
    // Get test and winner variant
    const { data: test } = await this.supabase
      .from('ab_tests')
      .select(`
        *,
        winner_variant:ab_test_variants!inner(*)
      `)
      .eq('id', testId)
      .eq('ab_test_variants.id', winnerVariantId)
      .single();

    if (!test) throw new Error('Test or winner variant not found');

    // Update target journey with winner configuration
    if (test.target_journey_id) {
      await this.supabase
        .from('journeys')
        .update({
          configuration: test.winner_variant[0].journey_config,
          updated_at: new Date().toISOString()
        })
        .eq('id', test.target_journey_id);
    }

    // Mark variant as winner
    await this.supabase
      .from('ab_test_variants')
      .update({ is_winner: true })
      .eq('id', winnerVariantId);
  }

  private determineWinner(variantResults: any[], statisticalAnalysis: any[]): any {
    const significantResults = statisticalAnalysis.filter(a => a.significance.isSignificant);
    
    if (significantResults.length === 0) {
      return {
        hasWinner: false,
        reason: 'No statistically significant results'
      };
    }

    // Find variant with highest uplift among significant results
    const winner = significantResults.reduce((best, current) => {
      return current.significance.uplift > best.significance.uplift ? current : best;
    });

    const winnerVariant = variantResults.find(v => v.variantId === winner.variantId);

    return {
      hasWinner: true,
      winnerVariantId: winner.variantId,
      winnerVariant: winnerVariant.variantName,
      uplift: winner.significance.uplift,
      confidenceLevel: winner.significance.confidenceLevel
    };
  }

  private generateInsights(test: any, variantResults: any[], statisticalAnalysis: any[]): TestInsight[] {
    const insights: TestInsight[] = [];

    // Performance insight
    const bestPerformer = variantResults.reduce((best, current) => 
      current.conversionRate > best.conversionRate ? current : best
    );

    insights.push({
      type: 'performance',
      title: 'Best Performing Variant',
      description: `${bestPerformer.variantName} achieved the highest conversion rate at ${(bestPerformer.conversionRate * 100).toFixed(2)}%`,
      confidenceScore: 0.9,
      actionRequired: false,
      data: { variantId: bestPerformer.variantId }
    });

    // Statistical insight
    const significantResults = statisticalAnalysis.filter(a => a.significance.isSignificant);
    if (significantResults.length > 0) {
      insights.push({
        type: 'statistical',
        title: 'Statistical Significance Achieved',
        description: `${significantResults.length} variant(s) show statistically significant results`,
        confidenceScore: 0.95,
        actionRequired: true,
        data: { significantVariants: significantResults.length }
      });
    }

    return insights;
  }

  private generateRecommendations(winnerAnalysis: any, statisticalAnalysis: any[]): string[] {
    const recommendations: string[] = [];

    if (winnerAnalysis.hasWinner) {
      recommendations.push(`Promote ${winnerAnalysis.winnerVariant} to all users for a ${(winnerAnalysis.uplift * 100).toFixed(1)}% improvement`);
    } else {
      recommendations.push('Continue testing or gather more data before making a decision');
    }

    const significantResults = statisticalAnalysis.filter(a => a.significance.isSignificant);
    if (significantResults.length === 0) {
      recommendations.push('Consider running a follow-up test with larger sample sizes or different variants');
    }

    return recommendations;
  }
}
```

## Test Requirements

```typescript
// __tests__/ab-testing.test.ts
import { ABTestingService } from '@/lib/services/ab-testing-service';

describe('A/B Testing', () => {
  let abTestingService: ABTestingService;

  beforeEach(() => {
    abTestingService = new ABTestingService();
  });

  describe('Test Creation', () => {
    it('should create test with variants', async () => {
      const testData = {
        testName: 'Email Subject Line Test',
        testType: 'content',
        successMetrics: [
          { name: 'open_rate', type: 'conversion_rate', isPrimary: true }
        ],
        variants: [
          { variantName: 'Control', isControl: true, trafficPercentage: 50, journeyConfig: {} },
          { variantName: 'Test A', isControl: false, trafficPercentage: 50, journeyConfig: {} }
        ]
      };

      const test = await abTestingService.createTest('supplier-1', testData);

      expect(test.id).toBeDefined();
      expect(test.variants).toHaveLength(2);
    });

    it('should validate traffic allocation sums to 100%', async () => {
      const invalidTestData = {
        testName: 'Invalid Test',
        variants: [
          { trafficPercentage: 60 },
          { trafficPercentage: 50 } // Total = 110%
        ]
      };

      await expect(
        abTestingService.createTest('supplier-1', invalidTestData)
      ).rejects.toThrow('Traffic allocation must sum to 100%');
    });
  });

  describe('Participant Assignment', () => {
    it('should assign participant to variant based on traffic allocation', async () => {
      const testId = 'test-1';
      const clientId = 'client-1';

      // Mock test with 70/30 split
      jest.spyOn(abTestingService, 'selectVariantByTraffic').mockReturnValue({
        id: 'variant-a',
        variant_name: 'Test A',
        journey_config: {}
      });

      const assignment = await abTestingService.assignParticipant(testId, clientId);

      expect(assignment.variantId).toBe('variant-a');
      expect(assignment.variantName).toBe('Test A');
    });

    it('should not reassign already assigned participants', async () => {
      const testId = 'test-1';
      const clientId = 'client-1';

      // Mock existing assignment
      jest.spyOn(abTestingService.supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-participant', variant_id: 'variant-b' }
        })
      });

      const assignment = await abTestingService.assignParticipant(testId, clientId);

      expect(assignment.id).toBe('existing-participant');
    });
  });

  describe('Event Tracking', () => {
    it('should track conversion events correctly', async () => {
      const testId = 'test-1';
      const participantId = 'participant-1';

      await abTestingService.trackEvent(
        testId,
        participantId,
        'conversion',
        'email_opened',
        1
      );

      // Verify event was recorded
      // This would require database mocking or test database
    });

    it('should update participant conversion status', async () => {
      const participantId = 'participant-1';

      await abTestingService.trackEvent(
        'test-1',
        participantId,
        'conversion',
        'completed',
        100
      );

      // Verify participant completed_at was set
      // This would require database checking
    });
  });

  describe('Statistical Analysis', () => {
    it('should calculate statistical significance correctly', () => {
      const significance = abTestingService.calculateStatisticalSignificance(
        10, // control conversions
        100, // control total
        15, // test conversions
        100  // test total
      );

      expect(significance.isSignificant).toBeDefined();
      expect(significance.pValue).toBeGreaterThanOrEqual(0);
      expect(significance.pValue).toBeLessThanOrEqual(1);
      expect(significance.uplift).toBeCloseTo(0.5, 1); // 50% improvement
    });

    it('should handle edge cases in statistical calculation', () => {
      // Zero conversions
      const zeroResult = abTestingService.calculateStatisticalSignificance(0, 100, 0, 100);
      expect(zeroResult.isSignificant).toBe(false);

      // Zero participants
      const zeroParticipants = abTestingService.calculateStatisticalSignificance(0, 0, 5, 100);
      expect(zeroParticipants.isSignificant).toBe(false);
    });
  });

  describe('Test Results Calculation', () => {
    it('should calculate comprehensive test results', async () => {
      const testId = 'test-1';

      // Mock test data
      jest.spyOn(abTestingService.supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: testId,
            variants: [
              { id: 'v1', variant_name: 'Control', is_control: true, participant_count: 100, conversion_count: 10 },
              { id: 'v2', variant_name: 'Test A', is_control: false, participant_count: 100, conversion_count: 15 }
            ],
            events: [
              { variant_id: 'v1', event_type: 'conversion' },
              { variant_id: 'v2', event_type: 'conversion' }
            ]
          }
        })
      });

      const results = await abTestingService.calculateResults(testId);

      expect(results.variants).toHaveLength(2);
      expect(results.winnerAnalysis).toBeDefined();
      expect(results.statisticalSignificance).toBeDefined();
      expect(results.insights).toBeInstanceOf(Array);
    });
  });

  describe('Winner Determination', () => {
    it('should determine winner correctly with significant results', () => {
      const variantResults = [
        { variantId: 'v1', variantName: 'Control', isControl: true, conversionRate: 0.1 },
        { variantId: 'v2', variantName: 'Test A', isControl: false, conversionRate: 0.15 }
      ];

      const statisticalAnalysis = [
        {
          variantId: 'v2',
          significance: { isSignificant: true, uplift: 0.5, confidenceLevel: 0.95 }
        }
      ];

      const winner = abTestingService.determineWinner(variantResults, statisticalAnalysis);

      expect(winner.hasWinner).toBe(true);
      expect(winner.winnerVariantId).toBe('v2');
      expect(winner.uplift).toBe(0.5);
    });

    it('should handle inconclusive tests', () => {
      const variantResults = [
        { variantId: 'v1', variantName: 'Control', isControl: true, conversionRate: 0.1 },
        { variantId: 'v2', variantName: 'Test A', isControl: false, conversionRate: 0.11 }
      ];

      const statisticalAnalysis = [
        {
          variantId: 'v2',
          significance: { isSignificant: false, uplift: 0.1, confidenceLevel: 0.7 }
        }
      ];

      const winner = abTestingService.determineWinner(variantResults, statisticalAnalysis);

      expect(winner.hasWinner).toBe(false);
      expect(winner.reason).toContain('No statistically significant results');
    });
  });

  describe('Test Lifecycle', () => {
    it('should start test successfully', async () => {
      const testId = 'test-1';

      await abTestingService.startTest(testId);

      // Verify test status was updated to 'running'
      // This would require database checking
    });

    it('should stop test and calculate final results', async () => {
      const testId = 'test-1';

      const results = await abTestingService.stopTest(testId, 'completed', false);

      expect(results.testId).toBe(testId);
      expect(results.variants).toBeDefined();
    });

    it('should promote winner when stopping with significant results', async () => {
      const testId = 'test-1';

      // Mock significant results
      jest.spyOn(abTestingService, 'calculateResults').mockResolvedValue({
        testId,
        winnerAnalysis: { hasWinner: true, winnerVariantId: 'winner-variant' },
        statisticalSignificance: { isSignificant: true }
      });

      await abTestingService.stopTest(testId, 'completed', true);

      // Verify winner was promoted
      // This would require checking that journey was updated
    });
  });
});
```

## Dependencies

### Statistical Analysis
- **jStat**: Statistical calculations
- **Simple Statistics**: P-value calculations
- **Math.js**: Advanced mathematical operations

### Internal Dependencies
- **Journey Service**: Journey configuration and execution
- **Analytics Service**: Event tracking and metrics
- **Notification Service**: Test alerts and updates

## Effort Estimate

- **Database Schema**: 10 hours
- **Test Configuration**: 12 hours
- **Participant Assignment**: 8 hours
- **Statistical Analysis**: 16 hours
- **Results Calculation**: 12 hours
- **Frontend Components**: 20 hours
- **Event Tracking**: 8 hours
- **Winner Promotion**: 6 hours
- **Testing**: 18 hours
- **Documentation**: 6 hours

**Total Estimated Effort**: 116 hours (14.5 days)

## Success Metrics

- 95% accurate variant assignment based on traffic allocation
- Statistical calculations with 99% accuracy
- Test results available within 10 seconds of completion
- Winner promotion success rate 100%
- 90% user confidence in statistical recommendations
- 25% average improvement from winning variants