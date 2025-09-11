# WS-248: Chatbot Training System - Technical Specification

## Feature Identifier
- **Feature ID**: WS-248
- **Feature Name**: Chatbot Training System
- **Category**: AI Integration - Chatbot
- **Priority**: High (Revenue Analytics batch)

## User Story
As a **wedding supplier**, I want **an intelligent training system that automatically creates and maintains my chatbot using my FAQ content, articles, and conversation data**, so that **my chatbot can provide accurate, personalized responses that improve over time**.

## Database Schema

### Core Tables

```sql
-- Store training data pairs for chatbot learning
CREATE TABLE chatbot_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  supplier_type VARCHAR(50) NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  source_type VARCHAR(50) NOT NULL, -- 'faq', 'article', 'conversation', 'manual', 'generated'
  source_id UUID,
  source_reference TEXT, -- URL or file reference
  content_category VARCHAR(100), -- 'pricing', 'process', 'timeline', 'requirements', 'policies'
  wedding_context JSONB DEFAULT '{}',
  confidence_score DECIMAL(3,2) DEFAULT 1.0,
  quality_score DECIMAL(3,2),
  verification_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'verified', 'rejected', 'needs_review'
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,
  effectiveness_rating DECIMAL(3,2),
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store training sessions and their results
CREATE TABLE training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  session_type VARCHAR(50) NOT NULL, -- 'initial', 'incremental', 'rebuild', 'quality_improvement'
  trigger_reason VARCHAR(100), -- 'new_content', 'poor_performance', 'scheduled', 'manual'
  training_data_snapshot JSONB NOT NULL DEFAULT '{}',
  training_pairs_count INTEGER DEFAULT 0,
  new_pairs_added INTEGER DEFAULT 0,
  pairs_removed INTEGER DEFAULT 0,
  embeddings_generated INTEGER DEFAULT 0,
  system_prompt TEXT,
  training_config JSONB DEFAULT '{}',
  performance_baseline JSONB DEFAULT '{}',
  performance_after JSONB DEFAULT '{}',
  improvement_metrics JSONB DEFAULT '{}',
  processing_time_ms INTEGER,
  tokens_used INTEGER,
  training_cost DECIMAL(10,4),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'
  error_details TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  deployed_at TIMESTAMPTZ
);

-- Store conversation feedback for continuous learning
CREATE TABLE chatbot_conversation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  client_id UUID REFERENCES clients(id),
  conversation_id UUID NOT NULL,
  message_id UUID NOT NULL,
  user_question TEXT NOT NULL,
  bot_response TEXT NOT NULL,
  response_type VARCHAR(50), -- 'knowledge_base', 'fallback', 'escalation'
  confidence_score DECIMAL(3,2),
  response_time_ms INTEGER,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  feedback_comment TEXT,
  user_correction TEXT, -- What the correct response should have been
  helpful_vote BOOLEAN, -- Thumbs up/down
  escalated_to_human BOOLEAN DEFAULT FALSE,
  resolution_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'escalated'
  feedback_processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store training test cases and validation
CREATE TABLE training_test_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  test_category VARCHAR(100) NOT NULL,
  test_question TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  expected_confidence DECIMAL(3,2) DEFAULT 0.80,
  test_context JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store training validation results
CREATE TABLE training_validation_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES training_sessions(id) ON DELETE CASCADE,
  test_case_id UUID REFERENCES training_test_cases(id),
  supplier_id UUID REFERENCES suppliers(id),
  test_question TEXT NOT NULL,
  expected_answer TEXT NOT NULL,
  actual_response TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  similarity_score DECIMAL(3,2),
  accuracy_score DECIMAL(3,2),
  response_time_ms INTEGER,
  passed BOOLEAN DEFAULT FALSE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store extracted training pairs from content sources
CREATE TABLE content_extraction_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  source_type VARCHAR(50) NOT NULL,
  source_id UUID,
  source_content TEXT NOT NULL,
  extraction_config JSONB DEFAULT '{}',
  extracted_pairs_count INTEGER DEFAULT 0,
  extraction_quality DECIMAL(3,2),
  ai_model VARCHAR(50) DEFAULT 'gpt-4',
  tokens_used INTEGER,
  extraction_cost DECIMAL(10,4),
  status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  extracted_pairs JSONB DEFAULT '[]',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Store chatbot system prompts and configurations
CREATE TABLE chatbot_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  config_version INTEGER DEFAULT 1,
  system_prompt TEXT NOT NULL,
  brand_voice_config JSONB DEFAULT '{}',
  response_guidelines JSONB DEFAULT '{}',
  fallback_config JSONB DEFAULT '{}',
  escalation_config JSONB DEFAULT '{}',
  performance_thresholds JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT FALSE,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store training performance metrics over time
CREATE TABLE training_performance_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  session_id UUID REFERENCES training_sessions(id),
  measurement_date DATE NOT NULL,
  total_training_pairs INTEGER,
  verified_pairs INTEGER,
  test_accuracy DECIMAL(3,2),
  user_satisfaction DECIMAL(3,2),
  response_confidence DECIMAL(3,2),
  fallback_rate DECIMAL(3,2),
  escalation_rate DECIMAL(3,2),
  conversation_completion_rate DECIMAL(3,2),
  average_response_time_ms INTEGER,
  daily_conversations INTEGER,
  improvement_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(supplier_id, measurement_date)
);

-- Store conversation learning insights
CREATE TABLE conversation_learning_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id),
  insight_type VARCHAR(50) NOT NULL, -- 'missing_knowledge', 'poor_response', 'common_question', 'improvement'
  insight_category VARCHAR(100),
  question_pattern TEXT,
  frequency INTEGER DEFAULT 1,
  confidence_level DECIMAL(3,2),
  suggested_action TEXT,
  suggested_training_pair JSONB,
  impact_priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'implemented', 'rejected', 'resolved'
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_training_data_supplier ON chatbot_training_data(supplier_id);
CREATE INDEX idx_training_data_status ON chatbot_training_data(verification_status, supplier_id);
CREATE INDEX idx_training_data_source ON chatbot_training_data(source_type, supplier_id);
CREATE INDEX idx_training_sessions_supplier ON training_sessions(supplier_id, started_at DESC);
CREATE INDEX idx_conversation_feedback_supplier ON chatbot_conversation_feedback(supplier_id, created_at DESC);
CREATE INDEX idx_conversation_feedback_rating ON chatbot_conversation_feedback(user_rating, feedback_processed);
CREATE INDEX idx_test_cases_supplier ON training_test_cases(supplier_id, is_active);
CREATE INDEX idx_validation_results_session ON training_validation_results(session_id);
CREATE INDEX idx_performance_history_supplier ON training_performance_history(supplier_id, measurement_date DESC);
CREATE INDEX idx_learning_insights_supplier ON conversation_learning_insights(supplier_id, status);
CREATE INDEX idx_extraction_jobs_supplier ON content_extraction_jobs(supplier_id, status);

-- Full-text search indexes
CREATE INDEX idx_training_data_question_fts ON chatbot_training_data 
  USING gin(to_tsvector('english', question));
CREATE INDEX idx_training_data_answer_fts ON chatbot_training_data 
  USING gin(to_tsvector('english', answer));
```

## API Endpoints

### Training Management Endpoints

```typescript
// POST /api/chatbot/training/extract-from-content
interface ExtractFromContentRequest {
  supplierId: string;
  sources: Array<{
    type: 'faq' | 'article' | 'document' | 'website';
    id?: string;
    content?: string;
    url?: string;
  }>;
  extractionConfig?: {
    maxPairsPerSource?: number;
    qualityThreshold?: number;
    categories?: string[];
  };
}

interface ExtractFromContentResponse {
  jobId: string;
  extractedPairs: Array<{
    id: string;
    question: string;
    answer: string;
    sourceType: string;
    category?: string;
    confidence: number;
    requiresReview: boolean;
  }>;
  extractionMetrics: {
    totalPairs: number;
    highQualityPairs: number;
    tokensUsed: number;
    cost: number;
    processingTimeMs: number;
  };
}

// POST /api/chatbot/training/start-session
interface StartTrainingSessionRequest {
  supplierId: string;
  sessionType: 'initial' | 'incremental' | 'rebuild' | 'quality_improvement';
  triggerReason: string;
  options?: {
    includeUnverified?: boolean;
    qualityThreshold?: number;
    rebuildSystemPrompt?: boolean;
    testValidation?: boolean;
  };
}

interface StartTrainingSessionResponse {
  sessionId: string;
  trainingPairs: number;
  estimatedDuration: string;
  systemPrompt: string;
  validationTests: number;
  estimatedCost: number;
  status: 'queued' | 'processing';
}

// GET /api/chatbot/training/session/:sessionId/status
interface TrainingSessionStatusResponse {
  sessionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    currentStep: string;
    completedSteps: string[];
    totalSteps: number;
    percentage: number;
  };
  metrics?: {
    trainingPairs: number;
    embeddingsGenerated: number;
    testAccuracy?: number;
    improvementScore?: number;
  };
  error?: string;
  estimatedTimeRemaining?: string;
}

// POST /api/chatbot/training/validate-pairs
interface ValidateTrainingPairsRequest {
  supplierId: string;
  pairIds: string[];
  validationDecisions: Array<{
    pairId: string;
    action: 'approve' | 'reject' | 'modify';
    modifications?: {
      question?: string;
      answer?: string;
      category?: string;
    };
    rejectReason?: string;
  }>;
}

// GET /api/chatbot/training/test-performance/:supplierId
interface TestPerformanceResponse {
  supplierId: string;
  testResults: {
    totalTests: number;
    passed: number;
    failed: number;
    averageAccuracy: number;
    averageConfidence: number;
    averageResponseTime: number;
  };
  categoryBreakdown: Record<string, {
    tests: number;
    accuracy: number;
    confidence: number;
  }>;
  failureAnalysis: Array<{
    question: string;
    expectedAnswer: string;
    actualResponse: string;
    failureReason: string;
    suggestions: string[];
  }>;
}

// POST /api/chatbot/training/feedback
interface SubmitFeedbackRequest {
  supplierId: string;
  conversationId: string;
  messageId: string;
  userQuestion: string;
  botResponse: string;
  rating: number; // 1-5
  comment?: string;
  correction?: string;
  helpful?: boolean;
}

// GET /api/chatbot/training/analytics/:supplierId
interface TrainingAnalyticsResponse {
  supplierId: string;
  overview: {
    totalTrainingPairs: number;
    verifiedPairs: number;
    lastTrainingDate: string;
    currentAccuracy: number;
    userSatisfaction: number;
  };
  performance: {
    weeklyAccuracyTrend: number[];
    satisfactionTrend: number[];
    conversationVolume: number[];
    fallbackRate: number;
    escalationRate: number;
  };
  insights: Array<{
    type: string;
    priority: string;
    description: string;
    suggestedAction: string;
    impact: number;
  }>;
  recommendations: Array<{
    action: string;
    description: string;
    estimatedImprovement: number;
    effort: 'low' | 'medium' | 'high';
  }>;
}

// POST /api/chatbot/training/schedule-retraining
interface ScheduleRetrainingRequest {
  supplierId: string;
  schedule: {
    frequency: 'daily' | 'weekly' | 'monthly';
    dayOfWeek?: number; // 0-6
    hour?: number; // 0-23
  };
  triggers: {
    newContentThreshold?: number;
    performanceThreshold?: number;
    feedbackThreshold?: number;
  };
}
```

## Frontend Components

### React Component Structure

```typescript
// components/chatbot/TrainingDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useChatbotTraining } from '@/hooks/useChatbotTraining';

interface TrainingDashboardProps {
  supplierId: string;
}

export const TrainingDashboard: React.FC<TrainingDashboardProps> = ({
  supplierId
}) => {
  const {
    analytics,
    currentSession,
    pendingPairs,
    insights,
    isLoading,
    startTraining,
    validatePairs,
    testPerformance
  } = useChatbotTraining(supplierId);

  const [activeTab, setActiveTab] = useState('overview');
  const [testResults, setTestResults] = useState<any>(null);

  const handleStartTraining = async (sessionType: string) => {
    const session = await startTraining({
      supplierId,
      sessionType,
      triggerReason: 'manual'
    });
  };

  const handleRunTests = async () => {
    const results = await testPerformance(supplierId);
    setTestResults(results);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 0.9) return 'text-green-600';
    if (accuracy >= 0.8) return 'text-blue-600';
    if (accuracy >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSatisfactionColor = (satisfaction: number) => {
    if (satisfaction >= 4.0) return 'text-green-600';
    if (satisfaction >= 3.5) return 'text-blue-600';
    if (satisfaction >= 3.0) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Training Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Training Pairs</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{analytics?.overview?.totalTrainingPairs || 0}</p>
            <p className="text-xs text-muted-foreground">
              {analytics?.overview?.verifiedPairs || 0} verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Accuracy</p>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getAccuracyColor(analytics?.overview?.currentAccuracy || 0)}`}>
              {Math.round((analytics?.overview?.currentAccuracy || 0) * 100)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">User Satisfaction</p>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${getSatisfactionColor(analytics?.overview?.userSatisfaction || 0)}`}>
              {(analytics?.overview?.userSatisfaction || 0).toFixed(1)}/5
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Last Training</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">
              {analytics?.overview?.lastTrainingDate ? 
                new Date(analytics.overview.lastTrainingDate).toLocaleDateString() :
                'Never'
              }
            </p>
            {pendingPairs > 0 && (
              <Badge variant="outline" className="mt-1">
                {pendingPairs} pending
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Current Training Session */}
      {currentSession && (
        <Alert>
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Training in progress:</strong> {currentSession.currentStep}
              </div>
              <div className="flex items-center gap-2">
                <Progress value={currentSession.percentage} className="w-32" />
                <span className="text-sm">{currentSession.percentage}%</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="validation">Validation</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TrainingPerformanceChart analytics={analytics} />
            <TrainingInsightsSummary insights={insights} />
          </div>
        </TabsContent>

        <TabsContent value="training">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">Training Management</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your chatbot's training data and start new training sessions
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleStartTraining('incremental')}
                    disabled={!!currentSession}
                  >
                    Start Incremental Training
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleStartTraining('rebuild')}
                    disabled={!!currentSession}
                  >
                    Rebuild Training
                  </Button>
                </div>
              </CardContent>
            </Card>

            <ContentExtractionInterface supplierId={supplierId} />
          </div>
        </TabsContent>

        <TabsContent value="validation">
          <TrainingPairValidation
            supplierId={supplierId}
            pendingPairs={pendingPairs}
            onValidate={validatePairs}
          />
        </TabsContent>

        <TabsContent value="testing">
          <Card>
            <CardHeader>
              <h3 className="font-semibold">Performance Testing</h3>
              <p className="text-sm text-muted-foreground">
                Test your chatbot's performance against validation questions
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={handleRunTests}>
                  Run Performance Tests
                </Button>

                {testResults && (
                  <TestResultsDisplay results={testResults} />
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights">
          <TrainingInsights
            supplierId={supplierId}
            insights={insights}
            analytics={analytics}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// components/chatbot/TrainingPairValidation.tsx
export const TrainingPairValidation: React.FC<{
  supplierId: string;
  pendingPairs: number;
  onValidate: (decisions: any[]) => void;
}> = ({ supplierId, pendingPairs, onValidate }) => {
  const [pairs, setPairs] = useState<any[]>([]);
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  const [validationDecisions, setValidationDecisions] = useState<Map<string, any>>(new Map());

  const handlePairDecision = (pairId: string, decision: any) => {
    const newDecisions = new Map(validationDecisions);
    newDecisions.set(pairId, decision);
    setValidationDecisions(newDecisions);
  };

  const handleBulkValidation = () => {
    const decisions = Array.from(validationDecisions.entries()).map(([pairId, decision]) => ({
      pairId,
      ...decision
    }));
    onValidate(decisions);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold">Training Pair Validation</h3>
        <Badge variant="outline">
          {pendingPairs} pairs need review
        </Badge>
      </div>

      <div className="space-y-4">
        {pairs.map((pair) => (
          <Card key={pair.id} className="border-l-4 border-yellow-500">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Question:</label>
                  <p className="text-sm">{pair.question}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Answer:</label>
                  <p className="text-sm">{pair.answer}</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline">{pair.sourceType}</Badge>
                    <Badge variant="secondary">
                      {Math.round(pair.confidence * 100)}% confidence
                    </Badge>
                    {pair.category && (
                      <Badge variant="outline">{pair.category}</Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600"
                      onClick={() => handlePairDecision(pair.id, { action: 'approve' })}
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600"
                      onClick={() => handlePairDecision(pair.id, { action: 'modify' })}
                    >
                      Modify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => handlePairDecision(pair.id, { action: 'reject' })}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {validationDecisions.size > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleBulkValidation}>
            Save Validation Decisions ({validationDecisions.size})
          </Button>
        </div>
      )}
    </div>
  );
};

// components/chatbot/ContentExtractionInterface.tsx
export const ContentExtractionInterface: React.FC<{
  supplierId: string;
}> = ({ supplierId }) => {
  const [extractionConfig, setExtractionConfig] = useState({
    sourceType: 'article',
    content: '',
    maxPairs: 10,
    qualityThreshold: 0.8
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionResult, setExtractionResult] = useState<any>(null);

  const { extractFromContent } = useChatbotTraining(supplierId);

  const handleExtraction = async () => {
    setIsExtracting(true);
    try {
      const result = await extractFromContent({
        supplierId,
        sources: [{
          type: extractionConfig.sourceType as any,
          content: extractionConfig.content
        }],
        extractionConfig: {
          maxPairsPerSource: extractionConfig.maxPairs,
          qualityThreshold: extractionConfig.qualityThreshold
        }
      });
      
      setExtractionResult(result);
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold">Extract Training Data</h3>
        <p className="text-sm text-muted-foreground">
          Extract Q&A pairs from your content to improve chatbot training
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Source Type</label>
            <select
              value={extractionConfig.sourceType}
              onChange={(e) => setExtractionConfig({
                ...extractionConfig,
                sourceType: e.target.value
              })}
              className="w-full p-2 border rounded-md mt-1"
            >
              <option value="faq">FAQ</option>
              <option value="article">Article</option>
              <option value="document">Document</option>
              <option value="website">Website</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Content</label>
            <textarea
              value={extractionConfig.content}
              onChange={(e) => setExtractionConfig({
                ...extractionConfig,
                content: e.target.value
              })}
              className="w-full p-2 border rounded-md mt-1 min-h-[120px]"
              placeholder="Paste your content here..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Max Pairs</label>
              <input
                type="number"
                min="1"
                max="20"
                value={extractionConfig.maxPairs}
                onChange={(e) => setExtractionConfig({
                  ...extractionConfig,
                  maxPairs: parseInt(e.target.value)
                })}
                className="w-full p-2 border rounded-md mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium">Quality Threshold</label>
              <input
                type="number"
                min="0.1"
                max="1.0"
                step="0.1"
                value={extractionConfig.qualityThreshold}
                onChange={(e) => setExtractionConfig({
                  ...extractionConfig,
                  qualityThreshold: parseFloat(e.target.value)
                })}
                className="w-full p-2 border rounded-md mt-1"
              />
            </div>
          </div>

          <Button
            onClick={handleExtraction}
            disabled={!extractionConfig.content || isExtracting}
            className="w-full"
          >
            {isExtracting ? (
              <>
                <span className="animate-spin mr-2">⚡</span>
                Extracting Q&A Pairs...
              </>
            ) : (
              'Extract Training Pairs'
            )}
          </Button>

          {extractionResult && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm font-medium text-green-800">
                Extracted {extractionResult.extractionMetrics.totalPairs} training pairs
              </p>
              <div className="text-xs text-green-700 mt-1">
                <p>High Quality: {extractionResult.extractionMetrics.highQualityPairs}</p>
                <p>Cost: ${extractionResult.extractionMetrics.cost.toFixed(4)}</p>
                <p>Time: {extractionResult.extractionMetrics.processingTimeMs}ms</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
```

## Integration Points

### AI Service Integration

```typescript
// lib/ai/chatbot-trainer.ts
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';

export class ChatbotTrainer {
  private openai: OpenAI;
  private supabase: any;
  private contentExtractor: ContentExtractor;
  private conversationLearner: ConversationLearner;
  private performanceTester: PerformanceTester;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    this.contentExtractor = new ContentExtractor();
    this.conversationLearner = new ConversationLearner();
    this.performanceTester = new PerformanceTester();
  }

  async startTrainingSession(
    supplierId: string,
    sessionType: string,
    options: TrainingOptions = {}
  ): Promise<TrainingSession> {
    const sessionId = crypto.randomUUID();
    
    try {
      // Create training session record
      await this.supabase
        .from('training_sessions')
        .insert({
          id: sessionId,
          supplier_id: supplierId,
          session_type: sessionType,
          trigger_reason: options.triggerReason || 'manual',
          status: 'processing'
        });

      // Gather training data
      const trainingData = await this.gatherTrainingData(supplierId, options);
      
      // Generate system prompt
      const systemPrompt = await this.generateSystemPrompt(supplierId, trainingData);
      
      // Process embeddings (if using vector search)
      const embeddings = await this.processEmbeddings(trainingData.pairs);
      
      // Run validation tests
      const testResults = options.testValidation ? 
        await this.performanceTester.validateTraining(supplierId, trainingData.pairs) : null;
      
      // Update configuration
      await this.updateChatbotConfiguration(supplierId, {
        systemPrompt,
        trainingPairs: trainingData.pairs.length,
        sessionId
      });
      
      // Complete session
      await this.supabase
        .from('training_sessions')
        .update({
          status: 'completed',
          training_pairs_count: trainingData.pairs.length,
          embeddings_generated: embeddings.length,
          system_prompt: systemPrompt,
          performance_after: testResults,
          completed_at: new Date()
        })
        .eq('id', sessionId);

      return {
        sessionId,
        trainingPairs: trainingData.pairs.length,
        systemPrompt,
        testResults,
        status: 'completed'
      };

    } catch (error) {
      await this.supabase
        .from('training_sessions')
        .update({
          status: 'failed',
          error_details: error.message
        })
        .eq('id', sessionId);
      
      throw error;
    }
  }

  private async gatherTrainingData(
    supplierId: string,
    options: TrainingOptions
  ): Promise<TrainingDataSet> {
    const { data: pairs } = await this.supabase
      .from('chatbot_training_data')
      .select('*')
      .eq('supplier_id', supplierId)
      .eq('is_active', true)
      .gte('confidence_score', options.qualityThreshold || 0.7);

    // Filter by verification status if required
    const filteredPairs = options.includeUnverified ? 
      pairs : 
      pairs.filter(p => p.verification_status === 'verified');

    return {
      pairs: filteredPairs || [],
      totalPairs: filteredPairs?.length || 0,
      verifiedPairs: pairs?.filter(p => p.verification_status === 'verified').length || 0
    };
  }

  private async generateSystemPrompt(
    supplierId: string,
    trainingData: TrainingDataSet
  ): Promise<string> {
    // Get supplier information
    const { data: supplier } = await this.supabase
      .from('suppliers')
      .select('*')
      .eq('id', supplierId)
      .single();

    if (!supplier) {
      throw new Error('Supplier not found');
    }

    const basePrompt = `You are a helpful AI assistant for ${supplier.business_name}, a professional ${supplier.supplier_type} service specializing in weddings.

CORE INSTRUCTIONS:
- Only answer questions using information from your knowledge base
- If you don't know something, say so and offer to connect them with ${supplier.contact_name || 'our team'}
- Maintain a ${supplier.brand_voice || 'professional and friendly'} tone
- Never make up prices, dates, or specific details
- Always prioritize accuracy over helpfulness

BUSINESS CONTEXT:
- Business Name: ${supplier.business_name}
- Service Type: ${supplier.supplier_type}
- Location: ${supplier.location || 'Not specified'}
- Specialties: ${supplier.specialties?.join(', ') || 'Wedding services'}

CONTACT INFORMATION:
- Email: ${supplier.email}
- Phone: ${supplier.phone || 'Available on request'}
- Website: ${supplier.website || 'Not provided'}

CONVERSATION GUIDELINES:
1. Greet clients warmly and ask how you can help
2. Answer questions directly using your knowledge base
3. If information is partial, explain what you know and what you don't
4. For booking requests, pricing questions, or detailed planning, offer to connect them with ${supplier.contact_name || 'our team'}
5. End conversations by thanking them and providing contact information

ESCALATION TRIGGERS:
- Questions about specific pricing not in your knowledge base
- Booking requests or availability questions
- Complex planning requests requiring human expertise
- Any question you cannot answer confidently

When escalating, say: "I'd love to connect you with ${supplier.contact_name || 'our team'} who can give you detailed information about this. You can reach us at ${supplier.email} or ${supplier.phone || 'through our website'}."

Remember: It's better to admit you don't know something than to provide incorrect information.`;

    return basePrompt;
  }

  async extractFromContent(
    supplierId: string,
    sources: ContentSource[],
    extractionConfig: ExtractionConfig
  ): Promise<ExtractionResult> {
    const allPairs: TrainingPair[] = [];
    let totalTokens = 0;
    let totalCost = 0;

    for (const source of sources) {
      const extracted = await this.contentExtractor.extractQAPairs(
        source,
        extractionConfig
      );
      
      allPairs.push(...extracted.pairs);
      totalTokens += extracted.tokensUsed;
      totalCost += extracted.cost;
    }

    // Store extraction job
    const { data: job } = await this.supabase
      .from('content_extraction_jobs')
      .insert({
        supplier_id: supplierId,
        source_type: sources[0]?.type || 'mixed',
        extracted_pairs_count: allPairs.length,
        extraction_quality: this.calculateAverageQuality(allPairs),
        tokens_used: totalTokens,
        extraction_cost: totalCost,
        extracted_pairs: allPairs,
        status: 'completed'
      })
      .select('id')
      .single();

    return {
      jobId: job.id,
      extractedPairs: allPairs,
      extractionMetrics: {
        totalPairs: allPairs.length,
        highQualityPairs: allPairs.filter(p => p.confidence >= 0.8).length,
        tokensUsed: totalTokens,
        cost: totalCost,
        processingTimeMs: 0 // Set by caller
      }
    };
  }

  async processFeedback(
    supplierId: string,
    feedback: ConversationFeedback[]
  ): Promise<LearningInsights> {
    const insights = await this.conversationLearner.analyzeConversations(feedback);
    
    // Store insights
    for (const insight of insights) {
      await this.supabase
        .from('conversation_learning_insights')
        .insert({
          supplier_id: supplierId,
          insight_type: insight.type,
          insight_category: insight.category,
          question_pattern: insight.questionPattern,
          frequency: insight.frequency,
          confidence_level: insight.confidence,
          suggested_action: insight.suggestedAction,
          suggested_training_pair: insight.suggestedTrainingPair,
          impact_priority: insight.priority
        });
    }

    return {
      totalInsights: insights.length,
      highPriorityInsights: insights.filter(i => i.priority === 'high').length,
      insights: insights.slice(0, 10) // Return top 10 insights
    };
  }
}

// lib/ai/content-extractor.ts
export class ContentExtractor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async extractQAPairs(
    source: ContentSource,
    config: ExtractionConfig
  ): Promise<ExtractionResult> {
    const prompt = this.buildExtractionPrompt(source, config);
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: this.getExtractionSystemPrompt() },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    const pairs = result.pairs?.map((pair: any) => ({
      ...pair,
      source: source.type,
      sourceId: source.id,
      confidence: pair.confidence || 0.8,
      requiresReview: pair.confidence < 0.9
    })) || [];

    return {
      pairs,
      tokensUsed: response.usage?.total_tokens || 0,
      cost: this.calculateCost(response.usage?.total_tokens || 0)
    };
  }

  private getExtractionSystemPrompt(): string {
    return `You are an expert at extracting Q&A pairs from wedding business content.

Extract realistic questions a couple might ask and accurate answers based ONLY on the provided content.

Return JSON format:
{
  "pairs": [
    {
      "question": "What packages do you offer?",
      "answer": "We offer three main packages: Basic ($2000), Premium ($3500), and Luxury ($5000). Each includes...",
      "category": "pricing",
      "confidence": 0.95
    }
  ]
}

Guidelines:
1. Questions should sound natural and client-focused
2. Answers must be based only on the provided content
3. Include specific details like prices, timelines, and processes when mentioned
4. Don't make up information not in the source
5. Focus on practical questions couples would actually ask
6. Assign confidence based on how clearly the content answers the question
7. Categorize as: pricing, process, timeline, requirements, policies, services

Quality requirements:
- High confidence (0.9+): Direct, clear answer from content
- Medium confidence (0.7-0.9): Answer derivable from content but requires interpretation
- Low confidence (<0.7): Partial information or unclear answer`;
  }

  private buildExtractionPrompt(source: ContentSource, config: ExtractionConfig): string {
    return `Extract up to ${config.maxPairsPerSource || 10} Q&A pairs from this ${source.type}:

${source.content}

Focus on:
- Pricing and package information
- Service details and offerings
- Process and timeline questions
- Requirements and logistics
- Policies and terms

Only extract pairs with confidence >= ${config.qualityThreshold || 0.7}`;
  }
}
```

## Testing Requirements

### Unit Tests
- Test training pair extraction accuracy
- Test system prompt generation
- Test conversation learning algorithms
- Test performance validation logic
- Test feedback processing
- Test quality scoring algorithms

### Integration Tests
- Test complete training pipeline
- Test OpenAI API integration
- Test database operations
- Test continuous learning cycle
- Test performance monitoring

### E2E Tests with Playwright
```typescript
test('Complete chatbot training workflow', async ({ page }) => {
  // Navigate to training dashboard
  await page.goto('/chatbot/training');
  
  // Extract training pairs from content
  await page.click('[data-testid="content-extraction-tab"]');
  await page.fill('[data-testid="content-input"]', 
    'Our wedding photography packages start at $2000 and include 8 hours of coverage, 500+ edited photos, and online gallery. We also offer engagement sessions for $500.'
  );
  await page.selectOption('[data-testid="source-type"]', 'article');
  await page.click('[data-testid="extract-pairs"]');
  
  // Wait for extraction
  await page.waitForSelector('[data-testid="extraction-success"]', { timeout: 15000 });
  
  // Validate extracted pairs
  await page.click('[data-testid="validation-tab"]');
  const pairs = await page.$$('[data-testid="training-pair"]');
  expect(pairs.length).toBeGreaterThan(0);
  
  // Approve pairs
  await page.click('[data-testid="approve-all-high-confidence"]');
  
  // Start training session
  await page.click('[data-testid="training-tab"]');
  await page.click('[data-testid="start-incremental-training"]');
  
  // Wait for training completion
  await page.waitForSelector('[data-testid="training-complete"]', { timeout: 30000 });
  
  // Verify training metrics
  const accuracy = await page.textContent('[data-testid="training-accuracy"]');
  expect(parseInt(accuracy!)).toBeGreaterThan(80);
});
```

## Acceptance Criteria

### Functional Requirements
- [ ] Extract 10+ Q&A pairs from typical article content
- [ ] Training session completes in < 2 minutes for 100 pairs
- [ ] System prompt generation includes all supplier details
- [ ] Performance testing validates 80%+ accuracy
- [ ] Feedback processing identifies improvement opportunities
- [ ] Continuous learning improves accuracy over time

### Performance Requirements
- [ ] Content extraction: < 10 seconds per 1000 words
- [ ] Training session: < 3 minutes for 500 pairs
- [ ] Performance testing: < 30 seconds for 50 test cases
- [ ] Feedback processing: < 5 seconds per conversation
- [ ] Database queries: < 200ms average

### Quality Requirements
- [ ] Extraction accuracy > 85% for wedding domain content
- [ ] Training pair quality scores correlate with actual performance
- [ ] System prompts maintain brand voice consistency
- [ ] Test validation catches 90%+ of performance issues
- [ ] Learning insights lead to measurable improvements

## Effort Estimation

### Development Tasks
- Database schema and migrations: 14 hours
- Core training engine: 45 hours
- Content extraction system: 30 hours
- System prompt generation: 16 hours
- Performance testing framework: 24 hours
- Conversation learning system: 28 hours
- Validation and approval workflows: 20 hours
- Frontend components and UI: 40 hours
- API endpoints: 20 hours
- Analytics and monitoring: 18 hours
- Testing implementation: 32 hours

### Team Requirements
- Backend Developer: 160 hours
- Frontend Developer: 60 hours
- AI/ML Engineer: 50 hours
- QA Engineer: 35 hours
- DevOps: 12 hours

### Total Effort: 317 hours

## Dependencies
- WS-247: AI Chatbot Knowledge Base System (completed)
- OpenAI API (GPT-4 and GPT-3.5)
- PostgreSQL with JSONB support
- Supabase for data storage
- Wedding domain expertise

## Risk Mitigation
- **Risk**: Poor quality of extracted training pairs
  - **Mitigation**: Multi-level validation and manual review processes
- **Risk**: Training sessions taking too long
  - **Mitigation**: Incremental training and optimized embedding generation
- **Risk**: Chatbots providing incorrect information
  - **Mitigation**: Strict validation, confidence thresholds, and escalation logic
- **Risk**: Insufficient feedback for learning
  - **Mitigation**: Active feedback collection and synthetic feedback generation