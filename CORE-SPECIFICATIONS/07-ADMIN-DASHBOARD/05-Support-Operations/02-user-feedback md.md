# 02-user-feedback.md

# User Feedback System for WedSync/WedMe

## Overview

A comprehensive feedback system that captures user sentiment, satisfaction, and insights across all touchpoints of the WedSync platform. This system helps understand user needs, measure satisfaction, and identify areas for improvement.

## Feedback Architecture

### Feedback Types

```tsx
interface FeedbackStructure {
  // Core feedback types
  types: {
    nps: NetPromoterScore;          // Overall satisfaction
    csat: CustomerSatisfaction;      // Support interactions
    ces: CustomerEffortScore;        // Task completion ease
    feature: FeatureFeedback;        // Specific feature feedback
    onboarding: OnboardingFeedback; // New user experience
    churn: ChurnFeedback;           // Exit surveys
    product: ProductFeedback;        // General product feedback
  };

  // Collection methods
  channels: {
    inApp: 'widget' | 'modal' | 'banner' | 'inline';
    email: 'survey' | 'followup' | 'campaign';
    support: 'post_ticket' | 'chat_end';
    automated: 'milestone' | 'event_triggered';
  };

  // User segments
  segments: {
    userType: 'supplier' | 'couple';
    tier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
    lifecycle: 'trial' | 'new' | 'active' | 'power' | 'at_risk' | 'churned';
    engagement: 'daily' | 'weekly' | 'monthly' | 'dormant';
  };
}

```

## Implementation

### 1. Feedback Collection System

```tsx
// lib/feedback/feedbackCollector.ts
export class FeedbackCollector {
  private static instance: FeedbackCollector;
  private activeCollections: Map<string, FeedbackSession> = new Map();
  private rateLimiter: RateLimiter;

  static getInstance(): FeedbackCollector {
    if (!FeedbackCollector.instance) {
      FeedbackCollector.instance = new FeedbackCollector();
    }
    return FeedbackCollector.instance;
  }

  async collectFeedback(config: FeedbackConfig): Promise<FeedbackResponse> {
    // Check if user should see feedback request
    const shouldShow = await this.shouldShowFeedback(config);
    if (!shouldShow.show) {
      return { skipped: true, reason: shouldShow.reason };
    }

    // Create feedback session
    const session: FeedbackSession = {
      id: generateId(),
      userId: config.userId,
      type: config.type,
      trigger: config.trigger,
      startedAt: new Date(),
      completedAt: null,
      responses: [],
      metadata: {
        userType: await this.getUserType(config.userId),
        userTier: await this.getUserTier(config.userId),
        accountAge: await this.getAccountAge(config.userId),
        lastFeedback: await this.getLastFeedbackDate(config.userId),
        context: config.context
      }
    };

    this.activeCollections.set(session.id, session);

    // Determine feedback flow
    const flow = this.determineFeedbackFlow(config.type, session.metadata);

    return {
      sessionId: session.id,
      flow,
      questions: this.generateQuestions(flow, session)
    };
  }

  private async shouldShowFeedback(config: FeedbackConfig): Promise<ShouldShowResult> {
    // Rate limiting per user
    const userLimit = await this.rateLimiter.checkUserLimit(config.userId);
    if (!userLimit.allowed) {
      return { show: false, reason: 'rate_limited' };
    }

    // Check feedback fatigue
    const recentFeedback = await this.getRecentFeedback(config.userId, 7); // Last 7 days
    if (recentFeedback.length >= 2) {
      return { show: false, reason: 'feedback_fatigue' };
    }

    // Check user eligibility
    const eligibility = await this.checkEligibility(config);
    if (!eligibility.eligible) {
      return { show: false, reason: eligibility.reason };
    }

    // Sampling logic
    if (config.samplingRate && Math.random() > config.samplingRate) {
      return { show: false, reason: 'sampling' };
    }

    return { show: true };
  }

  private determineFeedbackFlow(type: FeedbackType, metadata: any): FeedbackFlow {
    switch (type) {
      case 'nps':
        return {
          steps: [
            { type: 'nps_score', question: 'How likely are you to recommend WedSync to a friend or colleague?' },
            { type: 'nps_reason', question: 'What\'s the main reason for your score?' },
            { type: 'improvement', question: 'What could we do to improve?' }
          ]
        };

      case 'feature':
        return {
          steps: [
            { type: 'rating', question: 'How satisfied are you with [FEATURE_NAME]?', scale: 5 },
            { type: 'usage', question: 'How often do you use this feature?' },
            { type: 'value', question: 'How valuable is this feature to your workflow?' },
            { type: 'suggestions', question: 'Any suggestions for improvement?' }
          ]
        };

      case 'churn':
        return {
          steps: [
            { type: 'reason', question: 'What\'s the main reason you\'re leaving?' },
            { type: 'alternatives', question: 'Are you switching to another service?' },
            { type: 'missing', question: 'What features or improvements would have kept you?' },
            { type: 'rating', question: 'How was your overall experience?', scale: 5 }
          ]
        };

      case 'onboarding':
        if (metadata.accountAge <= 7) {
          return {
            steps: [
              { type: 'ease', question: 'How easy was it to get started with WedSync?', scale: 5 },
              { type: 'time', question: 'How long did it take to set up your first form?' },
              { type: 'confusion', question: 'Was anything confusing or difficult?' },
              { type: 'help', question: 'Did you need help? If so, was it helpful?' }
            ]
          };
        }
        break;
    }

    return { steps: [] };
  }

  async submitResponse(sessionId: string, response: any): Promise<void> {
    const session = this.activeCollections.get(sessionId);
    if (!session) throw new Error('Invalid session');

    session.responses.push({
      ...response,
      timestamp: new Date()
    });

    // Save to database
    await this.saveFeedbackResponse(session, response);

    // Check if session is complete
    if (this.isSessionComplete(session)) {
      session.completedAt = new Date();
      await this.processFeedbackSession(session);
      this.activeCollections.delete(sessionId);
    }
  }

  private async processFeedbackSession(session: FeedbackSession): Promise<void> {
    // Calculate scores
    const scores = this.calculateScores(session);

    // Analyze sentiment
    const sentiment = await this.analyzeSentiment(session.responses);

    // Extract insights
    const insights = await this.extractInsights(session);

    // Store processed feedback
    await this.storeFeedback({
      ...session,
      scores,
      sentiment,
      insights,
      processedAt: new Date()
    });

    // Trigger actions based on feedback
    await this.triggerFeedbackActions(session, scores, sentiment);
  }

  private async triggerFeedbackActions(
    session: FeedbackSession,
    scores: any,
    sentiment: any
  ): Promise<void> {
    // Alert on negative feedback
    if (scores.nps <= 6 || sentiment.score < -0.5) {
      await this.alertNegativeFeedback(session);
    }

    // Thank promoters
    if (scores.nps >= 9) {
      await this.sendPromoterThankYou(session.userId);
    }

    // Follow up on specific issues
    if (session.type === 'churn' && session.responses.some(r => r.willReturn)) {
      await this.scheduleWinBackCampaign(session.userId);
    }

    // Update user segments
    await this.updateUserSegments(session.userId, scores);
  }
}

```

### 2. NPS (Net Promoter Score) System

```tsx
// lib/feedback/npsManager.ts
export class NPSManager {
  async triggerNPSSurvey(userId: string): Promise<NPSSurvey> {
    // Check eligibility
    const eligibility = await this.checkNPSEligibility(userId);
    if (!eligibility.eligible) {
      return null;
    }

    const survey: NPSSurvey = {
      id: generateId(),
      userId,
      triggeredAt: new Date(),
      triggerReason: eligibility.reason,
      status: 'pending',
      score: null,
      feedback: null,
      followUpScheduled: false
    };

    // Schedule survey delivery
    await this.scheduleSurvey(survey);

    return survey;
  }

  private async checkNPSEligibility(userId: string): Promise<NPSEligibility> {
    const user = await this.getUser(userId);

    // Check last NPS date
    const lastNPS = await this.getLastNPSDate(userId);
    if (lastNPS && daysSince(lastNPS) < 90) {
      return { eligible: false, reason: 'too_recent' };
    }

    // Check account age
    if (daysSince(user.createdAt) < 30) {
      return { eligible: false, reason: 'account_too_new' };
    }

    // Check engagement level
    const engagement = await this.getEngagementScore(userId);
    if (engagement < 0.3) {
      return { eligible: false, reason: 'low_engagement' };
    }

    // Determine trigger reason
    let triggerReason = 'quarterly_check';

    if (await this.hasCompletedMilestone(userId)) {
      triggerReason = 'milestone_reached';
    } else if (await this.hasHighUsage(userId)) {
      triggerReason = 'high_engagement';
    } else if (await this.isAtRisk(userId)) {
      triggerReason = 'at_risk_check';
    }

    return { eligible: true, reason: triggerReason };
  }

  async processNPSResponse(surveyId: string, score: number, feedback?: string): Promise<void> {
    const survey = await this.getSurvey(surveyId);

    survey.score = score;
    survey.feedback = feedback;
    survey.completedAt = new Date();
    survey.category = this.categorizeNPS(score);

    await this.saveSurvey(survey);

    // Calculate rolling NPS
    const rollingNPS = await this.calculateRollingNPS();
    await this.updateNPSMetrics(rollingNPS);

    // Trigger follow-up actions
    await this.triggerNPSActions(survey);
  }

  private categorizeNPS(score: number): NPSCategory {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
  }

  private async triggerNPSActions(survey: NPSSurvey): Promise<void> {
    switch (survey.category) {
      case 'detractor':
        // Immediate follow-up for detractors
        await this.createSupportTicket({
          userId: survey.userId,
          priority: 'high',
          type: 'nps_detractor',
          subject: `NPS Detractor Follow-up - Score: ${survey.score}`,
          description: survey.feedback || 'No feedback provided',
          assignTo: 'customer_success_lead'
        });

        // Schedule recovery email
        await this.scheduleEmail({
          userId: survey.userId,
          template: 'nps_detractor_followup',
          delay: '1 hour'
        });
        break;

      case 'passive':
        // Educational content to convert to promoter
        await this.scheduleEmail({
          userId: survey.userId,
          template: 'feature_highlights',
          delay: '1 day'
        });
        break;

      case 'promoter':
        // Thank you and referral request
        await this.scheduleEmail({
          userId: survey.userId,
          template: 'nps_promoter_thanks',
          delay: '1 hour'
        });

        // Add to referral program
        await this.addToReferralProgram(survey.userId);
        break;
    }
  }

  async calculateRollingNPS(): Promise<NPSMetrics> {
    const surveys = await this.getRecentSurveys(90); // Last 90 days

    const promoters = surveys.filter(s => s.score >= 9).length;
    const detractors = surveys.filter(s => s.score <= 6).length;
    const total = surveys.length;

    const npsScore = ((promoters - detractors) / total) * 100;

    return {
      score: Math.round(npsScore),
      promoters,
      passives: total - promoters - detractors,
      detractors,
      totalResponses: total,
      trend: await this.calculateNPSTrend(),
      bySegment: await this.calculateNPSBySegment(surveys)
    };
  }
}

```

### 3. In-App Feedback Widget

```tsx
// components/FeedbackWidget.tsx
export function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('general');
  const [session, setSession] = useState<FeedbackSession | null>(null);
  const { user } = useUser();

  useEffect(() => {
    // Check for triggered feedback
    checkTriggeredFeedback();
  }, []);

  const checkTriggeredFeedback = async () => {
    const triggered = await feedbackApi.checkTriggers({
      userId: user.id,
      context: {
        currentPage: window.location.pathname,
        sessionDuration: getSessionDuration(),
        actionsPerformed: getRecentActions()
      }
    });

    if (triggered.shouldShow) {
      setFeedbackType(triggered.type);
      setIsOpen(true);
      initializeSession(triggered);
    }
  };

  const initializeSession = async (config: any) => {
    const session = await feedbackApi.startSession({
      userId: user.id,
      type: config.type,
      trigger: config.trigger
    });
    setSession(session);
  };

  return (
    <>
      {/* Floating feedback button */}
      <button
        className="feedback-trigger"
        onClick={() => setIsOpen(true)}
        aria-label="Give feedback"
      >
        <MessageCircle />
      </button>

      {/* Feedback modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="feedback-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
          >
            <div className="feedback-header">
              <h3>We'd love your feedback!</h3>
              <button onClick={() => setIsOpen(false)}>
                <X />
              </button>
            </div>

            <div className="feedback-content">
              {feedbackType === 'nps' && (
                <NPSFeedback
                  session={session}
                  onComplete={handleComplete}
                />
              )}

              {feedbackType === 'feature' && (
                <FeatureFeedback
                  feature={getCurrentFeature()}
                  session={session}
                  onComplete={handleComplete}
                />
              )}

              {feedbackType === 'general' && (
                <GeneralFeedback
                  session={session}
                  onComplete={handleComplete}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contextual feedback prompts */}
      <ContextualFeedback />
    </>
  );
}

function NPSFeedback({ session, onComplete }) {
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [step, setStep] = useState(1);

  const handleScoreSelect = (selectedScore: number) => {
    setScore(selectedScore);
    setStep(2);

    // Track partial response
    trackEvent('nps_score_selected', {
      score: selectedScore,
      category: categorizeNPS(selectedScore)
    });
  };

  const handleSubmit = async () => {
    await feedbackApi.submitNPS({
      sessionId: session.id,
      score,
      feedback,
      metadata: {
        timeToComplete: Date.now() - session.startedAt,
        device: getDeviceInfo()
      }
    });

    onComplete();
  };

  return (
    <div className="nps-feedback">
      {step === 1 && (
        <div className="nps-score-selector">
          <p>How likely are you to recommend WedSync to a friend or colleague?</p>
          <div className="score-buttons">
            {[...Array(11)].map((_, i) => (
              <button
                key={i}
                className={`score-btn ${score === i ? 'selected' : ''}`}
                onClick={() => handleScoreSelect(i)}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="score-labels">
            <span>Not at all likely</span>
            <span>Extremely likely</span>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="nps-feedback-form">
          <p>
            {score >= 9 && "That's fantastic! What do you love most about WedSync?"}
            {score >= 7 && score < 9 && "Thanks! What could we do to earn a 10 from you?"}
            {score < 7 && "We appreciate your honesty. What can we improve?"}
          </p>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Your feedback helps us improve..."
            rows={4}
          />
          <div className="actions">
            <button onClick={() => setStep(1)}>Back</button>
            <button
              onClick={handleSubmit}
              className="primary"
              disabled={!feedback.trim()}
            >
              Submit Feedback
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

```

### 4. Feedback Analytics Engine

```tsx
// lib/feedback/analyticsEngine.ts
export class FeedbackAnalytics {
  async analyzeFeedbackTrends(timeRange: TimeRange): Promise<FeedbackInsights> {
    const feedback = await this.getFeedbackData(timeRange);

    const insights: FeedbackInsights = {
      summary: await this.generateSummary(feedback),
      trends: await this.identifyTrends(feedback),
      sentiment: await this.analyzeSentiment(feedback),
      themes: await this.extractThemes(feedback),
      segments: await this.analyzeBySegment(feedback),
      actionItems: await this.generateActionItems(feedback)
    };

    return insights;
  }

  private async identifyTrends(feedback: Feedback[]): Promise<Trends> {
    // Group feedback by week
    const weeklyData = this.groupByWeek(feedback);

    const trends = {
      nps: this.calculateTrend(weeklyData.map(w => w.nps)),
      csat: this.calculateTrend(weeklyData.map(w => w.csat)),
      volume: this.calculateTrend(weeklyData.map(w => w.count)),
      sentiment: this.calculateTrend(weeklyData.map(w => w.sentiment))
    };

    // Identify significant changes
    const significantChanges = [];

    if (Math.abs(trends.nps.change) > 10) {
      significantChanges.push({
        metric: 'NPS',
        change: trends.nps.change,
        direction: trends.nps.direction,
        significance: 'high'
      });
    }

    return {
      ...trends,
      significantChanges,
      forecast: this.forecastTrends(weeklyData)
    };
  }

  private async extractThemes(feedback: Feedback[]): Promise<Themes> {
    // Extract text from all feedback
    const allText = feedback
      .map(f => f.responses.map(r => r.text).join(' '))
      .join(' ');

    // Use AI to identify themes
    const themes = await this.aiThemeExtraction(allText);

    // Count theme occurrences
    const themeCounts = new Map<string, number>();
    for (const theme of themes) {
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    }

    // Categorize themes
    const categorizedThemes = {
      positive: [],
      negative: [],
      suggestions: [],
      bugs: []
    };

    for (const [theme, count] of themeCounts) {
      const category = await this.categorizeTheme(theme);
      categorizedThemes[category].push({
        theme,
        count,
        percentage: (count / feedback.length) * 100,
        examples: this.getExamplesForTheme(theme, feedback)
      });
    }

    return categorizedThemes;
  }

  private async analyzeSentiment(feedback: Feedback[]): Promise<SentimentAnalysis> {
    const sentiments = await Promise.all(
      feedback.map(f => this.analyzeSingleSentiment(f))
    );

    const aggregated = {
      overall: this.average(sentiments.map(s => s.score)),
      positive: sentiments.filter(s => s.score > 0.3).length,
      neutral: sentiments.filter(s => s.score >= -0.3 && s.score <= 0.3).length,
      negative: sentiments.filter(s => s.score < -0.3).length,

      byCategory: this.groupSentimentByCategory(sentiments, feedback),
      byUserSegment: this.groupSentimentBySegment(sentiments, feedback),

      keywords: {
        positive: this.extractKeywords(sentiments.filter(s => s.score > 0.3)),
        negative: this.extractKeywords(sentiments.filter(s => s.score < -0.3))
      },

      emotionalTriggers: this.identifyEmotionalTriggers(sentiments, feedback)
    };

    return aggregated;
  }

  async generateActionItems(feedback: Feedback[]): Promise<ActionItem[]> {
    const actionItems: ActionItem[] = [];

    // Analyze critical issues
    const criticalIssues = feedback.filter(f =>
      f.sentiment < -0.5 || f.npsScore <= 3
    );

    if (criticalIssues.length > 0) {
      actionItems.push({
        priority: 'critical',
        category: 'customer_recovery',
        action: 'Contact dissatisfied customers immediately',
        affectedUsers: criticalIssues.map(f => f.userId),
        estimatedImpact: 'high',
        owner: 'customer_success'
      });
    }

    // Identify feature requests
    const featureRequests = await this.extractFeatureRequests(feedback);
    const topRequests = this.rankFeatureRequests(featureRequests);

    for (const request of topRequests.slice(0, 5)) {
      actionItems.push({
        priority: 'medium',
        category: 'product',
        action: `Evaluate feature request: ${request.feature}`,
        requestCount: request.count,
        estimatedImpact: this.estimateFeatureImpact(request),
        owner: 'product_team'
      });
    }

    // Find improvement opportunities
    const improvements = await this.identifyImprovements(feedback);

    for (const improvement of improvements) {
      actionItems.push({
        priority: improvement.urgency,
        category: 'improvement',
        action: improvement.description,
        metric: improvement.affectedMetric,
        potentialGain: improvement.estimatedImprovement,
        owner: improvement.team
      });
    }

    return actionItems.sort((a, b) =>
      this.priorityScore(a.priority) - this.priorityScore(b.priority)
    );
  }
}

```

### 5. Database Schema

```sql
-- Feedback sessions
CREATE TABLE feedback_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR(50) NOT NULL,
  trigger_reason VARCHAR(100),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  abandoned_at TIMESTAMPTZ,

  -- User context
  user_type VARCHAR(20),
  user_tier VARCHAR(20),
  account_age_days INTEGER,

  -- Session metadata
  device_type VARCHAR(50),
  browser VARCHAR(50),
  location VARCHAR(100),
  session_duration INTEGER, -- seconds

  INDEX idx_feedback_user (user_id),
  INDEX idx_feedback_type (type),
  INDEX idx_feedback_completed (completed_at)
);

-- Feedback responses
CREATE TABLE feedback_responses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES feedback_sessions(id),
  question_id VARCHAR(100),
  question_text TEXT,
  response_type VARCHAR(50), -- 'rating', 'text', 'choice', 'nps'

  -- Response data
  rating_value INTEGER,
  text_value TEXT,
  choice_value VARCHAR(255),
  nps_score INTEGER CHECK (nps_score >= 0 AND nps_score <= 10),

  responded_at TIMESTAMPTZ DEFAULT NOW(),
  time_to_respond INTEGER, -- seconds

  INDEX idx_response_session (session_id)
);

-- NPS tracking
CREATE TABLE nps_surveys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  score INTEGER CHECK (score >= 0 AND score <= 10),
  category VARCHAR(20), -- 'promoter', 'passive', 'detractor'
  feedback TEXT,

  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  trigger_reason VARCHAR(100),

  follow_up_scheduled BOOLEAN DEFAULT FALSE,
  follow_up_completed BOOLEAN DEFAULT FALSE,

  INDEX idx_nps_user (user_id),
  INDEX idx_nps_score (score),
  INDEX idx_nps_completed (completed_at)
);

-- Feature feedback
CREATE TABLE feature_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  feature_name VARCHAR(100),
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  ease_of_use INTEGER CHECK (ease_of_use >= 1 AND ease_of_use <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),

  usage_frequency VARCHAR(50), -- 'daily', 'weekly', 'monthly', 'rarely'
  suggestions TEXT,
  would_recommend BOOLEAN,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_feature_feedback_feature (feature_name),
  INDEX idx_feature_feedback_user (user_id)
);

-- Feedback analytics (aggregated daily)
CREATE TABLE feedback_analytics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,

  -- NPS metrics
  nps_score DECIMAL(5,2),
  promoters_count INTEGER,
  passives_count INTEGER,
  detractors_count INTEGER,

  -- CSAT metrics
  csat_score DECIMAL(5,2),
  csat_responses INTEGER,

  -- Sentiment
  avg_sentiment DECIMAL(5,2),
  positive_count INTEGER,
  neutral_count INTEGER,
  negative_count INTEGER,

  -- Response rates
  surveys_sent INTEGER,
  surveys_completed INTEGER,
  response_rate DECIMAL(5,2),

  -- By segment
  metrics_by_tier JSONB,
  metrics_by_user_type JSONB,

  UNIQUE(date)
);

```

## Feedback Triggers

### Automated Trigger Rules

```tsx
const feedbackTriggers = [
  {
    name: 'first_form_created',
    type: 'onboarding',
    condition: 'user.formsCreated === 1',
    delay: '5 minutes',
    questions: ['ease_of_creation', 'time_taken', 'confusion_points']
  },
  {
    name: 'power_user_check',
    type: 'nps',
    condition: 'user.monthlyActiveDay >= 20',
    frequency: 'quarterly',
    priority: 'high'
  },
  {
    name: 'feature_adoption',
    type: 'feature',
    condition: 'user.usedFeature("journey_builder") >= 5',
    delay: '1 day',
    feature: 'journey_builder'
  },
  {
    name: 'support_resolution',
    type: 'csat',
    condition: 'ticket.status === "resolved"',
    delay: '1 hour',
    channel: 'email'
  },
  {
    name: 'subscription_upgrade',
    type: 'general',
    condition: 'user.upgradedTier',
    delay: '3 days',
    questions: ['upgrade_reason', 'value_perception']
  },
  {
    name: 'at_risk_pulse',
    type: 'nps',
    condition: 'user.engagementScore < 0.3 && user.dayssinceLastLogin > 14',
    priority: 'critical'
  }
];

```

## Reporting & Insights

### Feedback Dashboard Query

```sql
-- Weekly feedback summary
WITH weekly_metrics AS (
  SELECT
    DATE_TRUNC('week', completed_at) as week,

    -- NPS calculation
    COUNT(CASE WHEN nps_score >= 9 THEN 1 END) as promoters,
    COUNT(CASE WHEN nps_score <= 6 THEN 1 END) as detractors,
    COUNT(nps_score) as total_nps,

    -- CSAT calculation
    AVG(CASE WHEN response_type = 'rating' THEN rating_value END) as avg_csat,

    -- Response metrics
    COUNT(DISTINCT session_id) as total_responses,
    COUNT(DISTINCT user_id) as unique_respondents

  FROM feedback_responses r
  JOIN feedback_sessions s ON r.session_id = s.id
  WHERE s.completed_at >= NOW() - INTERVAL '12 weeks'
  GROUP BY week
)
SELECT
  week,
  ROUND(((promoters - detractors)::FLOAT / NULLIF(total_nps, 0) * 100)::NUMERIC, 1) as nps_score,
  ROUND(avg_csat::NUMERIC, 2) as csat_score,
  total_responses,
  unique_respondents,
  ROUND((total_responses::FLOAT / unique_respondents)::NUMERIC, 2) as responses_per_user
FROM weekly_metrics
ORDER BY week DESC;

```

## Best Practices

### 1. Collection Strategy

- Don't over-survey users (max 1 per week)
- Time surveys appropriately (after key actions)
- Keep surveys short (< 2 minutes)
- Provide value exchange (show how feedback helps)

### 2. Response Optimization

- Use progressive disclosure
- Make first question easy
- Allow anonymous feedback
- Provide multiple channels

### 3. Analysis & Action

- Respond to negative feedback within 24 hours
- Share positive feedback with team
- Close the feedback loop
- Track impact of changes

### 4. Segmentation

- Customize surveys by user segment
- Weight feedback by user value
- Track trends by cohort
- Identify segment-specific issues

## Success Metrics

- **Response Rate**: >25% for email, >40% for in-app
- **NPS Score**: >50 (world-class for SaaS)
- **CSAT Score**: >4.5/5
- **Feedback Processing**: <24 hours for negative
- **Action Rate**: >80% of critical feedback addressed
- **Close-the-loop Rate**: 100% for detractors