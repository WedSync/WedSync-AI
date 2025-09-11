/**
 * POST /api/integrations/retention/orchestrate
 * Trigger multi-channel retention campaign orchestration
 */

import { NextRequest, NextResponse } from 'next/server';
import { RetentionCampaignOrchestrator } from '@/lib/integrations/retention-campaign-orchestrator';
import { createClient } from '@supabase/supabase-js';

interface RetentionOrchestrationRequest {
  supplierId: string;
  churnRisk: ChurnRiskScore;
  campaignStrategy: 'immediate' | 'gradual' | 'intensive' | 'gentle';
  preferredChannels?: CommunicationChannel[];
  customTiming?: CampaignTimingOverride;
  personalizedContent?: PersonalizationParameters;
}

interface ChurnRiskScore {
  supplierId: string;
  probability: number;
  factors: ChurnFactor[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  urgency: 'immediate' | 'within_24h' | 'within_week' | 'monitor';
}

interface ChurnFactor {
  type: string;
  weight: number;
  description: string;
  recommendation: string;
}

interface CommunicationChannel {
  type: 'email' | 'sms' | 'whatsapp' | 'voice' | 'crm' | 'slack';
  provider: string;
  priority: number;
  config: Record<string, any>;
  fallback?: CommunicationChannel;
}

interface CampaignTimingOverride {
  immediateStart?: boolean;
  customSchedule?: ScheduledAction[];
  timezone?: string;
  avoidTimes?: TimeRange[];
}

interface ScheduledAction {
  type: string;
  scheduledFor: Date;
  channel: string;
  config: any;
}

interface TimeRange {
  start: string;
  end: string;
  reason: string;
}

interface PersonalizationParameters {
  customIncentives?: Record<string, any>;
  customMessages?: Record<string, string>;
  brandingOverrides?: Record<string, any>;
  languagePreference?: string;
}

interface RetentionOrchestrationResponse {
  orchestrationId: string;
  campaignPlan: MultiChannelCampaignPlan;
  estimatedDuration: string;
  scheduledActions: ScheduledCampaignAction[];
  expectedOutcome: CampaignOutcomePrediction;
  trackingUrls: CampaignTrackingUrls;
  success: boolean;
  message: string;
}

interface MultiChannelCampaignPlan {
  campaignId: string;
  supplierId: string;
  channels: string[];
  timeline: CampaignTimeline[];
  personalization: PersonalizationSummary;
  metrics: ExpectedMetrics;
}

interface CampaignTimeline {
  step: number;
  channel: string;
  scheduledFor: string;
  description: string;
}

interface PersonalizationSummary {
  supplierName: string;
  incentives: string[];
  customContent: boolean;
  languageOptimized: boolean;
}

interface ExpectedMetrics {
  estimatedReachRate: number;
  estimatedEngagementRate: number;
  estimatedRetentionProbability: number;
  estimatedCost: number;
}

interface ScheduledCampaignAction {
  id: string;
  type: string;
  channel: string;
  scheduledFor: string;
  status: 'pending' | 'scheduled' | 'executing' | 'completed' | 'failed';
  estimatedCost: number;
}

interface CampaignOutcomePrediction {
  retentionProbability: number;
  confidenceLevel: number;
  keySuccessFactors: string[];
  riskFactors: string[];
  recommendedFollowUp: string[];
}

interface CampaignTrackingUrls {
  campaignDashboard: string;
  realTimeMetrics: string;
  supplierProfile: string;
  webhookEndpoints: WebhookEndpoint[];
}

interface WebhookEndpoint {
  event: string;
  url: string;
  method: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: RetentionOrchestrationRequest = await request.json();

    // Validate required fields
    const validation = validateOrchestrationRequest(body);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.errors,
        },
        { status: 400 },
      );
    }

    // Extract supplier and risk information
    const {
      supplierId,
      churnRisk,
      campaignStrategy,
      preferredChannels,
      customTiming,
      personalizedContent,
    } = body;

    // Initialize orchestrator
    const orchestrator = new RetentionCampaignOrchestrator();

    // Build campaign strategy from request parameters
    const retentionCampaignStrategy = await buildCampaignStrategy(
      campaignStrategy,
      preferredChannels,
      customTiming,
      churnRisk,
    );

    // Log campaign initiation
    await logCampaignInitiation(supplierId, churnRisk, campaignStrategy);

    // Orchestrate the retention campaign
    const orchestrationResult = await orchestrator.orchestrateRetentionCampaign(
      churnRisk,
      retentionCampaignStrategy,
    );

    // Store campaign in database
    await storeCampaignRecord(orchestrationResult, body);

    // Generate response with comprehensive campaign information
    const response: RetentionOrchestrationResponse = {
      orchestrationId: orchestrationResult.campaignId,
      campaignPlan: await buildCampaignPlanSummary(orchestrationResult, body),
      estimatedDuration: calculateEstimatedDuration(orchestrationResult),
      scheduledActions: await buildScheduledActions(orchestrationResult),
      expectedOutcome: await predictCampaignOutcome(
        orchestrationResult,
        churnRisk,
      ),
      trackingUrls: buildTrackingUrls(
        orchestrationResult.campaignId,
        supplierId,
      ),
      success: true,
      message: `Retention campaign ${orchestrationResult.campaignId} successfully orchestrated for supplier ${supplierId}`,
    };

    // Set up real-time monitoring
    await setupRealTimeMonitoring(orchestrationResult.campaignId);

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Retention orchestration failed:', error);

    // Log error for monitoring
    await logOrchestrationError(error, request);

    return NextResponse.json(
      {
        success: false,
        error: 'Campaign orchestration failed',
        message: error.message,
        orchestrationId: null,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

/**
 * Validate orchestration request parameters
 */
function validateOrchestrationRequest(body: RetentionOrchestrationRequest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  if (!body.supplierId) {
    errors.push('supplierId is required');
  }

  if (!body.churnRisk) {
    errors.push('churnRisk is required');
  } else {
    if (
      !body.churnRisk.probability ||
      body.churnRisk.probability < 0 ||
      body.churnRisk.probability > 1
    ) {
      errors.push('churnRisk.probability must be between 0 and 1');
    }
    if (!body.churnRisk.severity) {
      errors.push('churnRisk.severity is required');
    }
    if (!body.churnRisk.urgency) {
      errors.push('churnRisk.urgency is required');
    }
  }

  if (!body.campaignStrategy) {
    errors.push('campaignStrategy is required');
  }

  // Validate campaign strategy
  const validStrategies = ['immediate', 'gradual', 'intensive', 'gentle'];
  if (
    body.campaignStrategy &&
    !validStrategies.includes(body.campaignStrategy)
  ) {
    errors.push(
      `campaignStrategy must be one of: ${validStrategies.join(', ')}`,
    );
  }

  // Validate preferred channels if provided
  if (body.preferredChannels) {
    const validChannelTypes = [
      'email',
      'sms',
      'whatsapp',
      'voice',
      'crm',
      'slack',
    ];
    for (const channel of body.preferredChannels) {
      if (!validChannelTypes.includes(channel.type)) {
        errors.push(`Invalid channel type: ${channel.type}`);
      }
      if (!channel.provider) {
        errors.push(`Provider is required for channel type: ${channel.type}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Build campaign strategy from request parameters
 */
async function buildCampaignStrategy(
  strategy: string,
  preferredChannels?: CommunicationChannel[],
  customTiming?: CampaignTimingOverride,
  churnRisk?: ChurnRiskScore,
): Promise<any> {
  // Define base strategies
  const strategyTemplates = {
    immediate: {
      type: 'immediate',
      channels: ['email', 'sms', 'crm', 'slack'],
      frequency: 'once',
      duration: 1,
      escalationRules: [
        {
          trigger: 'no_response',
          threshold: 4, // hours
          action: 'escalate_channel',
          delay: 2,
        },
      ],
    },
    gradual: {
      type: 'gradual',
      channels: ['email', 'crm'],
      frequency: 'weekly',
      duration: 14,
      escalationRules: [
        {
          trigger: 'no_response',
          threshold: 48, // hours
          action: 'increase_frequency',
          delay: 24,
        },
      ],
    },
    intensive: {
      type: 'intensive',
      channels: ['email', 'sms', 'whatsapp', 'voice', 'crm', 'slack'],
      frequency: 'daily',
      duration: 7,
      escalationRules: [
        {
          trigger: 'negative_response',
          threshold: 1,
          action: 'personal_call',
          delay: 1,
        },
      ],
    },
    gentle: {
      type: 'gentle',
      channels: ['email'],
      frequency: 'bi_weekly',
      duration: 30,
      escalationRules: [
        {
          trigger: 'engagement_decline',
          threshold: 7, // days
          action: 'notify_manager',
          delay: 24,
        },
      ],
    },
  };

  let campaignStrategy =
    strategyTemplates[strategy as keyof typeof strategyTemplates];

  // Override with preferred channels if provided
  if (preferredChannels && preferredChannels.length > 0) {
    campaignStrategy.channels = preferredChannels;
  }

  // Apply custom timing if provided
  if (customTiming) {
    if (customTiming.immediateStart) {
      campaignStrategy.type = 'immediate';
      campaignStrategy.frequency = 'once';
    }
  }

  // Adjust strategy based on churn risk severity
  if (churnRisk?.severity === 'critical') {
    campaignStrategy.type = 'immediate';
    campaignStrategy.channels = ['email', 'sms', 'voice', 'crm', 'slack'];
    campaignStrategy.escalationRules[0].threshold = 2; // 2 hours
  }

  return campaignStrategy;
}

/**
 * Build campaign plan summary for response
 */
async function buildCampaignPlanSummary(
  orchestrationResult: any,
  request: RetentionOrchestrationRequest,
): Promise<MultiChannelCampaignPlan> {
  // Get supplier information
  const supplier = await getSupplierInfo(request.supplierId);

  return {
    campaignId: orchestrationResult.campaignId,
    supplierId: request.supplierId,
    channels: orchestrationResult.channels.map((c: any) => c.channel),
    timeline: orchestrationResult.nextActions.map(
      (action: any, index: number) => ({
        step: index + 1,
        channel: action.channel,
        scheduledFor: action.scheduledFor.toISOString(),
        description: `Execute ${action.type} via ${action.channel}`,
      }),
    ),
    personalization: {
      supplierName: supplier?.businessName || 'Supplier',
      incentives: ['Reduced commission rate', 'Premium features'],
      customContent: !!request.personalizedContent,
      languageOptimized: !!request.personalizedContent?.languagePreference,
    },
    metrics: {
      estimatedReachRate: calculateEstimatedReachRate(
        orchestrationResult.channels,
      ),
      estimatedEngagementRate: calculateEstimatedEngagementRate(
        request.churnRisk,
      ),
      estimatedRetentionProbability: calculateRetentionProbability(
        request.churnRisk,
        request.campaignStrategy,
      ),
      estimatedCost: orchestrationResult.metrics.totalCost || 0,
    },
  };
}

/**
 * Calculate estimated campaign duration
 */
function calculateEstimatedDuration(orchestrationResult: any): string {
  const estimatedHours = Math.max(
    24,
    orchestrationResult.nextActions.length * 2,
  );

  if (estimatedHours < 24) {
    return `${estimatedHours} hours`;
  } else if (estimatedHours < 168) {
    return `${Math.ceil(estimatedHours / 24)} days`;
  } else {
    return `${Math.ceil(estimatedHours / 168)} weeks`;
  }
}

/**
 * Build scheduled actions for response
 */
async function buildScheduledActions(
  orchestrationResult: any,
): Promise<ScheduledCampaignAction[]> {
  return orchestrationResult.nextActions.map((action: any, index: number) => ({
    id: `${orchestrationResult.campaignId}_action_${index + 1}`,
    type: action.type,
    channel: action.channel,
    scheduledFor: action.scheduledFor.toISOString(),
    status: 'scheduled' as const,
    estimatedCost: calculateActionCost(action.type, action.channel),
  }));
}

/**
 * Predict campaign outcome
 */
async function predictCampaignOutcome(
  orchestrationResult: any,
  churnRisk: ChurnRiskScore,
): Promise<CampaignOutcomePrediction> {
  const baseRetentionRate = 1 - churnRisk.probability;
  const channelBoost = orchestrationResult.channels.length * 0.05;
  const urgencyBoost = churnRisk.urgency === 'immediate' ? 0.1 : 0;

  const retentionProbability = Math.min(
    0.95,
    baseRetentionRate + channelBoost + urgencyBoost,
  );

  return {
    retentionProbability,
    confidenceLevel: 0.75,
    keySuccessFactors: [
      'Multi-channel approach increases touchpoints',
      'Personalized messaging based on supplier profile',
      'Timely intervention based on churn signals',
    ],
    riskFactors: [
      'High initial churn probability',
      'Supplier may have already made decision',
      'Market conditions affecting entire industry',
    ],
    recommendedFollowUp: [
      'Monitor engagement metrics closely',
      'Prepare personal outreach if automated campaign fails',
      'Review and adjust incentives based on response',
    ],
  };
}

/**
 * Build tracking URLs for campaign monitoring
 */
function buildTrackingUrls(
  campaignId: string,
  supplierId: string,
): CampaignTrackingUrls {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wedsync.app';

  return {
    campaignDashboard: `${baseUrl}/dashboard/retention/campaigns/${campaignId}`,
    realTimeMetrics: `${baseUrl}/dashboard/retention/campaigns/${campaignId}/metrics`,
    supplierProfile: `${baseUrl}/dashboard/suppliers/${supplierId}`,
    webhookEndpoints: [
      {
        event: 'email_delivered',
        url: `${baseUrl}/api/webhooks/retention/email`,
        method: 'POST',
      },
      {
        event: 'sms_delivered',
        url: `${baseUrl}/api/webhooks/retention/sms`,
        method: 'POST',
      },
      {
        event: 'supplier_responded',
        url: `${baseUrl}/api/webhooks/retention/response`,
        method: 'POST',
      },
    ],
  };
}

/**
 * Helper functions for calculations and data operations
 */
async function logCampaignInitiation(
  supplierId: string,
  churnRisk: ChurnRiskScore,
  strategy: string,
): Promise<void> {
  try {
    await supabase.from('retention_campaign_logs').insert({
      supplier_id: supplierId,
      event_type: 'campaign_initiated',
      churn_probability: churnRisk.probability,
      strategy: strategy,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to log campaign initiation:', error);
  }
}

async function storeCampaignRecord(
  orchestrationResult: any,
  request: RetentionOrchestrationRequest,
): Promise<void> {
  try {
    await supabase.from('retention_campaigns').insert({
      id: orchestrationResult.campaignId,
      supplier_id: request.supplierId,
      churn_probability: request.churnRisk.probability,
      strategy: request.campaignStrategy,
      status: orchestrationResult.status,
      channels: orchestrationResult.channels.map((c: any) => c.channel),
      estimated_cost: orchestrationResult.metrics.totalCost,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to store campaign record:', error);
  }
}

async function setupRealTimeMonitoring(campaignId: string): Promise<void> {
  // Implementation would set up real-time monitoring and alerts
  console.log(`Setting up real-time monitoring for campaign ${campaignId}`);
}

async function logOrchestrationError(
  error: any,
  request: NextRequest,
): Promise<void> {
  try {
    await supabase.from('retention_campaign_logs').insert({
      event_type: 'orchestration_error',
      error_message: error.message,
      error_stack: error.stack,
      request_url: request.url,
      created_at: new Date().toISOString(),
    });
  } catch (logError) {
    console.error('Failed to log orchestration error:', logError);
  }
}

async function getSupplierInfo(supplierId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('business_name, contact_email, account_value')
      .eq('id', supplierId)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Failed to get supplier info:', error);
    return null;
  }
}

function calculateEstimatedReachRate(channels: any[]): number {
  // Base reach rate increases with more channels
  return Math.min(95, 70 + channels.length * 5);
}

function calculateEstimatedEngagementRate(churnRisk: ChurnRiskScore): number {
  // Higher churn risk may correlate with lower engagement, but urgency might increase it
  const baseRate = churnRisk.urgency === 'immediate' ? 25 : 15;
  const riskPenalty = churnRisk.probability * 10;
  return Math.max(5, baseRate - riskPenalty);
}

function calculateRetentionProbability(
  churnRisk: ChurnRiskScore,
  strategy: string,
): number {
  const baseRetention = 1 - churnRisk.probability;
  const strategyBoost = {
    immediate: 0.15,
    intensive: 0.12,
    gradual: 0.08,
    gentle: 0.05,
  };

  return Math.min(
    0.9,
    baseRetention +
      (strategyBoost[strategy as keyof typeof strategyBoost] || 0),
  );
}

function calculateActionCost(actionType: string, channel: string): number {
  const costs = {
    email: 0.01,
    sms: 0.05,
    whatsapp: 0.03,
    voice: 0.15,
    crm: 0.0,
    slack: 0.0,
  };

  return costs[channel as keyof typeof costs] || 0;
}
