# WS-026: Bulk Messaging - Technical Specification

## User Story

**As a wedding planner**, I need to send personalized messages to multiple clients simultaneously across email, SMS, and WhatsApp so I can efficiently share seasonal updates, holiday greetings, and service announcements while maintaining personal relationships.

**Real Wedding Scenario**: Sarah, a wedding planner, wants to send a personalized holiday message to all her spring 2024 couples. She creates a bulk campaign targeting 45 couples, personalizes each message with their names and wedding dates, and sends via email and SMS. The system automatically schedules delivery for optimal times, tracks engagement, and provides detailed analytics showing 89% open rates and 23% response rates, helping her measure campaign effectiveness.

## Database Schema

```sql
-- Bulk messaging campaigns
CREATE TABLE bulk_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  campaign_name VARCHAR(200) NOT NULL,
  campaign_type VARCHAR(50) NOT NULL, -- 'announcement', 'seasonal', 'promotional', 'reminder', 'survey'
  target_audience JSONB NOT NULL, -- Recipient selection criteria
  channels JSONB NOT NULL DEFAULT '["email"]', -- Array of channels: email, sms, whatsapp
  message_content JSONB NOT NULL, -- Content for each channel
  personalization JSONB DEFAULT '{}', -- Personalization settings
  scheduling JSONB NOT NULL, -- Send timing configuration
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled'
  total_recipients INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  messages_delivered INTEGER DEFAULT 0,
  messages_opened INTEGER DEFAULT 0,
  messages_clicked INTEGER DEFAULT 0,
  messages_failed INTEGER DEFAULT 0,
  estimated_cost_cents INTEGER DEFAULT 0,
  actual_cost_cents INTEGER DEFAULT 0,
  send_started_at TIMESTAMPTZ,
  send_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_bulk_campaigns_supplier_status (supplier_id, status),
  INDEX idx_bulk_campaigns_created (created_at),
  INDEX idx_bulk_campaigns_send_started (send_started_at)
);

-- Individual message instances within campaigns
CREATE TABLE bulk_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES bulk_campaigns(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'whatsapp'
  recipient_identifier VARCHAR(255) NOT NULL, -- Email or phone number
  personalized_content JSONB NOT NULL, -- Final processed content
  status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'
  external_message_id VARCHAR(200), -- Provider's message ID
  scheduled_send_time TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  cost_cents INTEGER DEFAULT 0,
  engagement_score DECIMAL(3,2) DEFAULT 0, -- 0.00 to 1.00
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_bulk_messages_campaign_status (campaign_id, status),
  INDEX idx_bulk_messages_client (client_id),
  INDEX idx_bulk_messages_scheduled (scheduled_send_time, status),
  INDEX idx_bulk_messages_channel_status (channel, status)
);

-- Campaign analytics and tracking
CREATE TABLE campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES bulk_campaigns(id) ON DELETE CASCADE,
  metric_name VARCHAR(50) NOT NULL,
  metric_value DECIMAL(10,2) NOT NULL,
  channel VARCHAR(20), -- NULL for overall metrics
  time_period VARCHAR(20), -- 'hourly', 'daily', 'total'
  period_start TIMESTAMPTZ,
  period_end TIMESTAMPTZ,
  additional_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_campaign_analytics_campaign_metric (campaign_id, metric_name),
  INDEX idx_campaign_analytics_period (period_start, period_end)
);

-- Recipient segments and filters
CREATE TABLE recipient_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  segment_name VARCHAR(100) NOT NULL,
  segment_description TEXT,
  filter_criteria JSONB NOT NULL,
  is_dynamic BOOLEAN DEFAULT TRUE, -- Recalculates membership
  member_count INTEGER DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_recipient_segments_supplier (supplier_id, is_active),
  UNIQUE(supplier_id, segment_name)
);

-- Cached segment memberships
CREATE TABLE segment_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id UUID REFERENCES recipient_segments(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(segment_id, client_id),
  INDEX idx_segment_memberships_segment (segment_id),
  INDEX idx_segment_memberships_client (client_id)
);

-- Message templates for bulk campaigns
CREATE TABLE bulk_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  template_name VARCHAR(100) NOT NULL,
  template_category VARCHAR(50), -- 'seasonal', 'promotional', 'announcement', etc.
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'whatsapp'
  subject_template VARCHAR(200), -- For email
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- Available merge variables
  design_config JSONB DEFAULT '{}', -- For email HTML design
  usage_count INTEGER DEFAULT 0,
  average_open_rate DECIMAL(5,4),
  average_click_rate DECIMAL(5,4),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_bulk_templates_supplier_channel (supplier_id, channel, is_active),
  INDEX idx_bulk_templates_category (template_category)
);

-- Unsubscribe management
CREATE TABLE bulk_unsubscribes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  email_address VARCHAR(255),
  phone_number VARCHAR(20),
  channel VARCHAR(20) NOT NULL, -- 'email', 'sms', 'whatsapp', 'all'
  unsubscribe_method VARCHAR(30) NOT NULL, -- 'link_click', 'reply', 'manual', 'complaint'
  campaign_id UUID REFERENCES bulk_campaigns(id) ON DELETE SET NULL, -- Which campaign triggered unsubscribe
  unsubscribe_reason VARCHAR(100),
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  INDEX idx_bulk_unsubscribes_supplier_channel (supplier_id, channel),
  INDEX idx_bulk_unsubscribes_email (email_address),
  INDEX idx_bulk_unsubscribes_phone (phone_number),
  INDEX idx_bulk_unsubscribes_client (client_id)
);

-- Send rate limiting and throttling
CREATE TABLE send_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL,
  max_per_hour INTEGER NOT NULL,
  max_per_day INTEGER NOT NULL,
  current_hour_count INTEGER DEFAULT 0,
  current_day_count INTEGER DEFAULT 0,
  hour_reset_at TIMESTAMPTZ DEFAULT NOW(),
  day_reset_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(supplier_id, channel)
);

-- A/B test variants for campaigns
CREATE TABLE campaign_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES bulk_campaigns(id) ON DELETE CASCADE,
  variant_name VARCHAR(50) NOT NULL, -- 'A', 'B', 'C', etc.
  allocation_percentage INTEGER NOT NULL, -- 10, 50, 90, etc.
  message_content JSONB NOT NULL,
  recipient_count INTEGER DEFAULT 0,
  performance_metrics JSONB DEFAULT '{}',
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  INDEX idx_campaign_variants_campaign (campaign_id),
  UNIQUE(campaign_id, variant_name)
);

-- Indexes for performance
CREATE INDEX idx_bulk_campaigns_supplier_type_status ON bulk_campaigns(supplier_id, campaign_type, status);
CREATE INDEX idx_bulk_messages_status_scheduled ON bulk_messages(status, scheduled_send_time) WHERE status IN ('queued', 'sending');
CREATE INDEX idx_campaign_analytics_campaign_channel ON campaign_analytics(campaign_id, channel, metric_name);
```

## API Endpoints

```typescript
// Bulk messaging data types
interface BulkCampaign {
  id: string;
  supplierId: string;
  campaignName: string;
  campaignType: 'announcement' | 'seasonal' | 'promotional' | 'reminder' | 'survey';
  targetAudience: TargetAudience;
  channels: ('email' | 'sms' | 'whatsapp')[];
  messageContent: MessageContent;
  personalization: PersonalizationSettings;
  scheduling: SchedulingSettings;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'paused' | 'cancelled';
  totalRecipients: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesOpened: number;
  messagesClicked: number;
  messagesFailed: number;
  estimatedCostCents: number;
  actualCostCents: number;
  sendStartedAt?: string;
  sendCompletedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface TargetAudience {
  segments?: string[]; // Segment IDs
  customFilters?: AudienceFilter[];
  excludeSegments?: string[];
  maxRecipients?: number;
}

interface AudienceFilter {
  field: string; // 'wedding_date', 'status', 'tags', 'package_value', etc.
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'between';
  value: any;
}

interface MessageContent {
  email?: EmailContent;
  sms?: SMSContent;
  whatsapp?: WhatsAppContent;
}

interface EmailContent {
  subject: string;
  preheader?: string;
  htmlBody: string;
  textBody: string;
  attachments?: Attachment[];
}

interface SMSContent {
  message: string;
  mediaUrl?: string;
}

interface WhatsAppContent {
  messageType: 'text' | 'template';
  text?: string;
  templateName?: string;
  templateVariables?: Record<string, string>;
}

interface PersonalizationSettings {
  enabled: boolean;
  variables: PersonalizationVariable[];
  fallbackValues: Record<string, string>;
  testRecipient?: string; // For preview testing
}

interface PersonalizationVariable {
  name: string;
  label: string;
  dataSource: 'client_field' | 'custom_field' | 'calculated';
  field?: string;
  calculation?: string;
  defaultValue?: string;
}

interface SchedulingSettings {
  sendType: 'immediate' | 'scheduled' | 'optimal' | 'drip';
  scheduledTime?: string;
  timezone?: string;
  optimalTiming?: OptimalTimingSettings;
  dripSettings?: DripSettings;
  throttling?: ThrottlingSettings;
}

interface OptimalTimingSettings {
  enabled: boolean;
  respectTimezones: boolean;
  preferredDays: number[]; // 0=Sunday, 1=Monday, etc.
  preferredHours: number[]; // 9, 10, 11, etc.
  avoidHolidays: boolean;
}

interface DripSettings {
  interval: number; // minutes between sends
  batchSize: number; // messages per batch
  respectBusinessHours: boolean;
}

interface ThrottlingSettings {
  maxPerHour: number;
  maxPerDay: number;
  respectProviderLimits: boolean;
}

interface BulkMessage {
  id: string;
  campaignId: string;
  clientId: string;
  channel: 'email' | 'sms' | 'whatsapp';
  recipientIdentifier: string;
  personalizedContent: any;
  status: 'queued' | 'sending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced';
  externalMessageId?: string;
  scheduledSendTime: string;
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  failedAt?: string;
  failureReason?: string;
  costCents: number;
  engagementScore: number;
}

interface RecipientSegment {
  id: string;
  supplierId: string;
  segmentName: string;
  segmentDescription?: string;
  filterCriteria: AudienceFilter[];
  isDynamic: boolean;
  memberCount: number;
  lastCalculatedAt?: string;
  isActive: boolean;
  createdAt: string;
}

interface CampaignAnalytics {
  campaignId: string;
  totalRecipients: number;
  byChannel: ChannelAnalytics[];
  engagement: EngagementMetrics;
  performance: PerformanceMetrics;
  timeline: TimelineMetrics[];
  topPerformingVariant?: string;
}

interface ChannelAnalytics {
  channel: string;
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  cost: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}

interface EngagementMetrics {
  averageTimeToOpen: number; // minutes
  averageTimeToClick: number; // minutes
  peakEngagementHour: number;
  engagementByDay: { day: string; engagement: number }[];
}

interface PerformanceMetrics {
  roi: number; // Return on investment
  costPerEngagement: number;
  unsubscribeRate: number;
  complaintRate: number;
  listGrowthRate: number;
}

// API Routes
// POST /api/bulk-messaging/campaigns
interface CreateCampaignRequest {
  campaignName: string;
  campaignType: string;
  targetAudience: TargetAudience;
  channels: string[];
  messageContent: MessageContent;
  personalization?: PersonalizationSettings;
  scheduling: SchedulingSettings;
}

interface CreateCampaignResponse {
  success: boolean;
  data: BulkCampaign;
}

// GET /api/bulk-messaging/campaigns
interface GetCampaignsRequest {
  status?: string;
  campaignType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

interface GetCampaignsResponse {
  success: boolean;
  data: BulkCampaign[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

// POST /api/bulk-messaging/campaigns/:campaignId/preview
interface PreviewCampaignRequest {
  recipientEmail?: string;
  sampleData?: Record<string, any>;
}

interface PreviewCampaignResponse {
  success: boolean;
  data: {
    email?: {
      subject: string;
      htmlBody: string;
      textBody: string;
    };
    sms?: {
      message: string;
      characterCount: number;
      segmentCount: number;
    };
    whatsapp?: {
      content: any;
    };
    estimatedReach: number;
    estimatedCost: number;
  };
}

// POST /api/bulk-messaging/campaigns/:campaignId/send
interface SendCampaignRequest {
  sendType: 'test' | 'full';
  testRecipients?: string[]; // For test sends
  confirmSend?: boolean; // Required for full send
}

interface SendCampaignResponse {
  success: boolean;
  data: {
    messagesSent: number;
    estimatedDeliveryTime: string;
    trackingUrl: string;
  };
}

// GET /api/bulk-messaging/campaigns/:campaignId/analytics
interface GetCampaignAnalyticsResponse {
  success: boolean;
  data: CampaignAnalytics;
}

// POST /api/bulk-messaging/segments
interface CreateSegmentRequest {
  segmentName: string;
  segmentDescription?: string;
  filterCriteria: AudienceFilter[];
  isDynamic?: boolean;
}

interface CreateSegmentResponse {
  success: boolean;
  data: RecipientSegment;
}

// GET /api/bulk-messaging/segments
interface GetSegmentsResponse {
  success: boolean;
  data: RecipientSegment[];
}

// POST /api/bulk-messaging/segments/:segmentId/calculate
interface CalculateSegmentResponse {
  success: boolean;
  data: {
    memberCount: number;
    members: Array<{
      clientId: string;
      name: string;
      email: string;
      phone?: string;
    }>;
  };
}

// GET /api/bulk-messaging/templates
interface GetTemplatesRequest {
  channel?: string;
  category?: string;
}

interface GetTemplatesResponse {
  success: boolean;
  data: BulkMessageTemplate[];
}

// POST /api/bulk-messaging/unsubscribe
interface UnsubscribeRequest {
  token: string; // Encrypted unsubscribe token
  reason?: string;
}

interface UnsubscribeResponse {
  success: boolean;
  message: string;
}

// GET /api/bulk-messaging/analytics/dashboard
interface GetBulkAnalyticsDashboardResponse {
  success: boolean;
  data: {
    overview: {
      totalCampaigns: number;
      totalMessagesSent: number;
      averageOpenRate: number;
      averageClickRate: number;
      totalCost: number;
    };
    recentCampaigns: BulkCampaign[];
    topPerformingCampaigns: Array<{
      campaign: BulkCampaign;
      metrics: PerformanceMetrics;
    }>;
    channelPerformance: ChannelAnalytics[];
    monthlyTrends: Array<{
      month: string;
      campaigns: number;
      messagesSent: number;
      cost: number;
    }>;
  };
}
```

## Frontend Components

```typescript
// BulkMessagingDashboard.tsx
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface BulkMessagingDashboardProps {
  supplierId: string;
}

export const BulkMessagingDashboard: React.FC<BulkMessagingDashboardProps> = ({
  supplierId
}) => {
  const [campaigns, setCampaigns] = useState<BulkCampaign[]>([]);
  const [segments, setSegments] = useState<RecipientSegment[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, [supplierId]);

  const loadDashboardData = async () => {
    try {
      const [campaignsRes, segmentsRes, analyticsRes] = await Promise.all([
        fetch('/api/bulk-messaging/campaigns?limit=10'),
        fetch('/api/bulk-messaging/segments'),
        fetch('/api/bulk-messaging/analytics/dashboard')
      ]);

      const [campaignsData, segmentsData, analyticsData] = await Promise.all([
        campaignsRes.json(),
        segmentsRes.json(),
        analyticsRes.json()
      ]);

      setCampaigns(campaignsData.data);
      setSegments(segmentsData.data);
      setAnalytics(analyticsData.data);
    } catch (error) {
      console.error('Failed to load bulk messaging data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading bulk messaging dashboard...</div>;

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {analytics?.overview.totalCampaigns || 0}
            </p>
            <p className="text-sm text-gray-500">Total Campaigns</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {analytics?.overview.totalMessagesSent?.toLocaleString() || 0}
            </p>
            <p className="text-sm text-gray-500">Messages Sent</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {((analytics?.overview.averageOpenRate || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">Avg Open Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {((analytics?.overview.averageClickRate || 0) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-500">Avg Click Rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              ${((analytics?.overview.totalCost || 0) / 100).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">Total Spent</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="segments">Segments</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
          <Button onClick={() => window.location.href = '/bulk-messaging/create'}>
            Create Campaign
          </Button>
        </div>

        <TabsContent value="campaigns">
          <CampaignsView campaigns={campaigns} onRefresh={loadDashboardData} />
        </TabsContent>

        <TabsContent value="segments">
          <SegmentsManager segments={segments} onRefresh={loadDashboardData} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplatesManager supplierId={supplierId} />
        </TabsContent>

        <TabsContent value="analytics">
          <BulkAnalyticsView analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// CampaignBuilder.tsx
interface CampaignBuilderProps {
  supplierId: string;
  campaignId?: string; // For editing existing campaigns
}

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  supplierId,
  campaignId
}) => {
  const [step, setStep] = useState<'details' | 'audience' | 'content' | 'schedule' | 'review'>('details');
  const [campaignData, setCampaignData] = useState<Partial<BulkCampaign>>({
    campaignName: '',
    campaignType: 'announcement',
    channels: ['email'],
    targetAudience: {},
    messageContent: {},
    personalization: { enabled: false, variables: [], fallbackValues: {} },
    scheduling: { sendType: 'immediate' }
  });

  const [previewData, setPreviewData] = useState<any>(null);
  const [segments, setSegments] = useState<RecipientSegment[]>([]);

  useEffect(() => {
    loadSegments();
    if (campaignId) {
      loadExistingCampaign();
    }
  }, [campaignId]);

  const loadSegments = async () => {
    try {
      const response = await fetch('/api/bulk-messaging/segments');
      const data = await response.json();
      setSegments(data.data);
    } catch (error) {
      console.error('Failed to load segments:', error);
    }
  };

  const loadExistingCampaign = async () => {
    try {
      const response = await fetch(`/api/bulk-messaging/campaigns/${campaignId}`);
      const data = await response.json();
      setCampaignData(data.data);
    } catch (error) {
      console.error('Failed to load campaign:', error);
    }
  };

  const updateCampaignData = (updates: Partial<BulkCampaign>) => {
    setCampaignData({ ...campaignData, ...updates });
  };

  const generatePreview = async () => {
    try {
      const response = await fetch('/api/bulk-messaging/campaigns/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });
      const data = await response.json();
      setPreviewData(data.data);
    } catch (error) {
      console.error('Failed to generate preview:', error);
    }
  };

  const saveCampaign = async () => {
    try {
      const url = campaignId 
        ? `/api/bulk-messaging/campaigns/${campaignId}` 
        : '/api/bulk-messaging/campaigns';
      
      const method = campaignId ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData)
      });

      const data = await response.json();
      
      if (data.success) {
        window.location.href = `/bulk-messaging/campaigns/${data.data.id}`;
      }
    } catch (error) {
      console.error('Failed to save campaign:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <CampaignBuilderSteps currentStep={step} onStepSelect={setStep} />
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="p-6">
          {step === 'details' && (
            <CampaignDetailsStep 
              data={campaignData}
              onChange={updateCampaignData}
              onNext={() => setStep('audience')}
            />
          )}

          {step === 'audience' && (
            <AudienceSelectionStep 
              data={campaignData}
              segments={segments}
              onChange={updateCampaignData}
              onNext={() => setStep('content')}
              onBack={() => setStep('details')}
            />
          )}

          {step === 'content' && (
            <MessageContentStep 
              data={campaignData}
              onChange={updateCampaignData}
              onNext={() => setStep('schedule')}
              onBack={() => setStep('audience')}
            />
          )}

          {step === 'schedule' && (
            <SchedulingStep 
              data={campaignData}
              onChange={updateCampaignData}
              onNext={() => {
                generatePreview();
                setStep('review');
              }}
              onBack={() => setStep('content')}
            />
          )}

          {step === 'review' && (
            <ReviewAndSendStep 
              data={campaignData}
              previewData={previewData}
              onSave={saveCampaign}
              onBack={() => setStep('schedule')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// AudienceSelectionStep.tsx
interface AudienceSelectionStepProps {
  data: Partial<BulkCampaign>;
  segments: RecipientSegment[];
  onChange: (updates: Partial<BulkCampaign>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const AudienceSelectionStep: React.FC<AudienceSelectionStepProps> = ({
  data,
  segments,
  onChange,
  onNext,
  onBack
}) => {
  const [selectedSegments, setSelectedSegments] = useState<string[]>(
    data.targetAudience?.segments || []
  );
  const [customFilters, setCustomFilters] = useState<AudienceFilter[]>(
    data.targetAudience?.customFilters || []
  );
  const [estimatedReach, setEstimatedReach] = useState<number>(0);

  useEffect(() => {
    calculateEstimatedReach();
  }, [selectedSegments, customFilters]);

  const calculateEstimatedReach = async () => {
    try {
      const response = await fetch('/api/bulk-messaging/audience/estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: selectedSegments,
          customFilters: customFilters
        })
      });
      
      const data = await response.json();
      setEstimatedReach(data.data.estimatedReach);
    } catch (error) {
      console.error('Failed to calculate reach:', error);
    }
  };

  const handleSegmentToggle = (segmentId: string) => {
    const newSegments = selectedSegments.includes(segmentId)
      ? selectedSegments.filter(id => id !== segmentId)
      : [...selectedSegments, segmentId];
    
    setSelectedSegments(newSegments);
    onChange({
      targetAudience: {
        ...data.targetAudience,
        segments: newSegments
      }
    });
  };

  const addCustomFilter = () => {
    const newFilter: AudienceFilter = {
      field: 'status',
      operator: 'equals',
      value: 'active'
    };
    
    const newFilters = [...customFilters, newFilter];
    setCustomFilters(newFilters);
    onChange({
      targetAudience: {
        ...data.targetAudience,
        customFilters: newFilters
      }
    });
  };

  const updateCustomFilter = (index: number, updates: Partial<AudienceFilter>) => {
    const newFilters = [...customFilters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setCustomFilters(newFilters);
    onChange({
      targetAudience: {
        ...data.targetAudience,
        customFilters: newFilters
      }
    });
  };

  const removeCustomFilter = (index: number) => {
    const newFilters = customFilters.filter((_, i) => i !== index);
    setCustomFilters(newFilters);
    onChange({
      targetAudience: {
        ...data.targetAudience,
        customFilters: newFilters
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Select Your Audience</h3>
        
        {/* Estimated Reach */}
        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600">Estimated Reach</p>
                <p className="text-2xl font-bold text-blue-800">{estimatedReach.toLocaleString()}</p>
              </div>
              <div className="text-blue-600">
                📊
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Segments Selection */}
      <div>
        <h4 className="font-medium mb-3">Choose Segments</h4>
        <div className="grid grid-cols-2 gap-3">
          {segments.map((segment) => (
            <div
              key={segment.id}
              onClick={() => handleSegmentToggle(segment.id)}
              className={`
                p-4 border rounded-lg cursor-pointer transition-colors
                ${selectedSegments.includes(segment.id) 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{segment.segmentName}</p>
                  <p className="text-sm text-gray-500">{segment.memberCount} members</p>
                  {segment.segmentDescription && (
                    <p className="text-xs text-gray-400 mt-1">{segment.segmentDescription}</p>
                  )}
                </div>
                <input
                  type="checkbox"
                  checked={selectedSegments.includes(segment.id)}
                  onChange={() => {}} // Handled by onClick
                  className="w-4 h-4"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Filters */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium">Custom Filters</h4>
          <Button size="sm" variant="outline" onClick={addCustomFilter}>
            Add Filter
          </Button>
        </div>
        
        <div className="space-y-3">
          {customFilters.map((filter, index) => (
            <CustomFilterRow
              key={index}
              filter={filter}
              onChange={(updates) => updateCustomFilter(index, updates)}
              onRemove={() => removeCustomFilter(index)}
            />
          ))}
          
          {customFilters.length === 0 && (
            <p className="text-gray-500 text-sm italic">
              No custom filters added. Click "Add Filter" to create one.
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={onNext}
          disabled={estimatedReach === 0}
        >
          Continue to Content
        </Button>
      </div>
    </div>
  );
};

// MessageContentStep.tsx
interface MessageContentStepProps {
  data: Partial<BulkCampaign>;
  onChange: (updates: Partial<BulkCampaign>) => void;
  onNext: () => void;
  onBack: () => void;
}

export const MessageContentStep: React.FC<MessageContentStepProps> = ({
  data,
  onChange,
  onNext,
  onBack
}) => {
  const [activeChannel, setActiveChannel] = useState<string>(data.channels?.[0] || 'email');
  const [templates, setTemplates] = useState<BulkMessageTemplate[]>([]);

  useEffect(() => {
    loadTemplates();
  }, [activeChannel]);

  const loadTemplates = async () => {
    try {
      const response = await fetch(`/api/bulk-messaging/templates?channel=${activeChannel}`);
      const data = await response.json();
      setTemplates(data.data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const updateMessageContent = (channel: string, content: any) => {
    onChange({
      messageContent: {
        ...data.messageContent,
        [channel]: content
      }
    });
  };

  const applyTemplate = (template: BulkMessageTemplate) => {
    const content = activeChannel === 'email' 
      ? {
          subject: template.subjectTemplate || '',
          htmlBody: template.contentTemplate,
          textBody: stripHtml(template.contentTemplate)
        }
      : {
          message: template.contentTemplate
        };
    
    updateMessageContent(activeChannel, content);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Create Your Message</h3>
        
        {/* Channel Tabs */}
        <div className="flex gap-2 mb-6">
          {data.channels?.map((channel) => (
            <button
              key={channel}
              onClick={() => setActiveChannel(channel)}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${activeChannel === channel 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              {channel.charAt(0).toUpperCase() + channel.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Templates Sidebar */}
        <div>
          <h4 className="font-medium mb-3">Templates</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {templates.map((template) => (
              <div
                key={template.id}
                onClick={() => applyTemplate(template)}
                className="p-3 border rounded-lg cursor-pointer hover:border-blue-300 hover:bg-blue-50"
              >
                <p className="font-medium text-sm">{template.templateName}</p>
                <p className="text-xs text-gray-500">{template.templateCategory}</p>
                {template.averageOpenRate && (
                  <p className="text-xs text-green-600">
                    {(template.averageOpenRate * 100).toFixed(1)}% open rate
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content Editor */}
        <div className="col-span-2">
          {activeChannel === 'email' && (
            <EmailContentEditor
              content={data.messageContent?.email}
              onChange={(content) => updateMessageContent('email', content)}
            />
          )}

          {activeChannel === 'sms' && (
            <SMSContentEditor
              content={data.messageContent?.sms}
              onChange={(content) => updateMessageContent('sms', content)}
            />
          )}

          {activeChannel === 'whatsapp' && (
            <WhatsAppContentEditor
              content={data.messageContent?.whatsapp}
              onChange={(content) => updateMessageContent('whatsapp', content)}
            />
          )}
        </div>
      </div>

      {/* Personalization Settings */}
      <PersonalizationSettings
        settings={data.personalization}
        onChange={(settings) => onChange({ personalization: settings })}
      />

      {/* Navigation */}
      <div className="flex justify-between pt-6 border-t">
        <Button variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onNext}>
          Continue to Scheduling
        </Button>
      </div>
    </div>
  );
};
```

## Code Examples

### Bulk Messaging Service

```typescript
// lib/services/bulk-messaging-service.ts
import { createClient } from '@supabase/supabase-js';
import { EmailService } from './email-service';
import { SMSService } from './sms-service';
import { WhatsAppService } from './whatsapp-service';

export class BulkMessagingService {
  private supabase: any;
  private emailService: EmailService;
  private smsService: SMSService;
  private whatsappService: WhatsAppService;

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.emailService = new EmailService();
    this.smsService = new SMSService();
    this.whatsappService = new WhatsAppService();
  }

  async createCampaign(supplierId: string, campaignData: any): Promise<BulkCampaign> {
    // Calculate recipient count
    const recipients = await this.calculateRecipients(supplierId, campaignData.targetAudience);
    
    // Estimate costs
    const estimatedCost = await this.calculateCampaignCost(campaignData.channels, recipients.length);

    // Create campaign record
    const { data: campaign, error } = await this.supabase
      .from('bulk_campaigns')
      .insert({
        supplier_id: supplierId,
        campaign_name: campaignData.campaignName,
        campaign_type: campaignData.campaignType,
        target_audience: campaignData.targetAudience,
        channels: campaignData.channels,
        message_content: campaignData.messageContent,
        personalization: campaignData.personalization,
        scheduling: campaignData.scheduling,
        total_recipients: recipients.length,
        estimated_cost_cents: estimatedCost,
        status: 'draft'
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to create campaign: ${error.message}`);

    // Pre-generate bulk messages if immediate send
    if (campaignData.scheduling.sendType === 'immediate') {
      await this.generateBulkMessages(campaign.id, recipients, campaignData);
    }

    return campaign;
  }

  async sendCampaign(campaignId: string, sendType: 'test' | 'full', testRecipients?: string[]): Promise<any> {
    const campaign = await this.getCampaign(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      throw new Error('Campaign cannot be sent in current status');
    }

    let recipients: any[];
    
    if (sendType === 'test') {
      recipients = await this.getTestRecipients(testRecipients || []);
    } else {
      recipients = await this.calculateRecipients(campaign.supplierId, campaign.targetAudience);
      
      // Check for unsubscribed recipients
      recipients = await this.filterUnsubscribedRecipients(recipients, campaign.channels);
    }

    // Update campaign status
    await this.supabase
      .from('bulk_campaigns')
      .update({
        status: 'sending',
        send_started_at: new Date().toISOString(),
        total_recipients: recipients.length
      })
      .eq('id', campaignId);

    // Generate and queue messages
    const bulkMessages = await this.generateBulkMessages(campaignId, recipients, campaign);
    
    // Start sending process
    await this.processBulkSending(campaignId, bulkMessages, campaign.scheduling);

    return {
      messagesSent: bulkMessages.length,
      estimatedDeliveryTime: this.calculateDeliveryTime(bulkMessages.length, campaign.scheduling),
      trackingUrl: `/bulk-messaging/campaigns/${campaignId}/track`
    };
  }

  private async generateBulkMessages(
    campaignId: string, 
    recipients: any[], 
    campaign: BulkCampaign
  ): Promise<BulkMessage[]> {
    const bulkMessages: any[] = [];
    const currentTime = new Date();

    for (const recipient of recipients) {
      for (const channel of campaign.channels) {
        // Personalize content for each recipient
        const personalizedContent = await this.personalizeContent(
          campaign.messageContent[channel],
          recipient,
          campaign.personalization
        );

        // Calculate send time based on scheduling settings
        const sendTime = this.calculateSendTime(
          currentTime,
          campaign.scheduling,
          recipient,
          bulkMessages.length
        );

        const messageData = {
          campaign_id: campaignId,
          client_id: recipient.id,
          channel,
          recipient_identifier: channel === 'email' ? recipient.email : recipient.phone,
          personalized_content: personalizedContent,
          scheduled_send_time: sendTime.toISOString(),
          status: 'queued',
          cost_cents: await this.calculateMessageCost(channel, personalizedContent)
        };

        bulkMessages.push(messageData);
      }
    }

    // Batch insert messages
    const { data: insertedMessages } = await this.supabase
      .from('bulk_messages')
      .insert(bulkMessages)
      .select();

    return insertedMessages;
  }

  private async personalizeContent(
    content: any,
    recipient: any,
    personalizationSettings: PersonalizationSettings
  ): Promise<any> {
    if (!personalizationSettings.enabled) {
      return content;
    }

    let personalizedContent = { ...content };

    // Replace variables in all text fields
    for (const variable of personalizationSettings.variables) {
      const value = this.getVariableValue(recipient, variable) || 
                   personalizationSettings.fallbackValues[variable.name] || 
                   `{{${variable.name}}}`;

      if (personalizedContent.subject) {
        personalizedContent.subject = personalizedContent.subject.replace(
          new RegExp(`{{${variable.name}}}`, 'g'),
          value
        );
      }

      if (personalizedContent.htmlBody) {
        personalizedContent.htmlBody = personalizedContent.htmlBody.replace(
          new RegExp(`{{${variable.name}}}`, 'g'),
          value
        );
      }

      if (personalizedContent.textBody) {
        personalizedContent.textBody = personalizedContent.textBody.replace(
          new RegExp(`{{${variable.name}}}`, 'g'),
          value
        );
      }

      if (personalizedContent.message) {
        personalizedContent.message = personalizedContent.message.replace(
          new RegExp(`{{${variable.name}}}`, 'g'),
          value
        );
      }
    }

    return personalizedContent;
  }

  private getVariableValue(recipient: any, variable: PersonalizationVariable): string {
    switch (variable.dataSource) {
      case 'client_field':
        return recipient[variable.field!] || variable.defaultValue || '';
      
      case 'custom_field':
        return recipient.customFields?.[variable.field!] || variable.defaultValue || '';
      
      case 'calculated':
        return this.calculateVariableValue(recipient, variable.calculation!) || variable.defaultValue || '';
      
      default:
        return variable.defaultValue || '';
    }
  }

  private calculateVariableValue(recipient: any, calculation: string): string {
    // Simple calculation engine for common patterns
    switch (calculation) {
      case 'days_until_wedding':
        if (recipient.weddingDate) {
          const weddingDate = new Date(recipient.weddingDate);
          const today = new Date();
          const diffTime = weddingDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return diffDays.toString();
        }
        return '0';
      
      case 'months_until_wedding':
        if (recipient.weddingDate) {
          const weddingDate = new Date(recipient.weddingDate);
          const today = new Date();
          const diffMonths = (weddingDate.getFullYear() - today.getFullYear()) * 12 + 
                           (weddingDate.getMonth() - today.getMonth());
          return diffMonths.toString();
        }
        return '0';
      
      case 'first_name':
        return recipient.name?.split(' ')[0] || recipient.name || '';
      
      default:
        return '';
    }
  }

  private calculateSendTime(
    baseTime: Date,
    scheduling: SchedulingSettings,
    recipient: any,
    messageIndex: number
  ): Date {
    switch (scheduling.sendType) {
      case 'immediate':
        if (scheduling.throttling) {
          // Add delay based on throttling settings
          const delayMinutes = Math.floor(messageIndex / scheduling.throttling.maxPerHour) * 60;
          return new Date(baseTime.getTime() + delayMinutes * 60 * 1000);
        }
        return baseTime;

      case 'scheduled':
        return new Date(scheduling.scheduledTime!);

      case 'optimal':
        return this.calculateOptimalSendTime(baseTime, scheduling.optimalTiming!, recipient);

      case 'drip':
        const interval = scheduling.dripSettings!.interval;
        const batchSize = scheduling.dripSettings!.batchSize;
        const batchNumber = Math.floor(messageIndex / batchSize);
        return new Date(baseTime.getTime() + batchNumber * interval * 60 * 1000);

      default:
        return baseTime;
    }
  }

  private calculateOptimalSendTime(
    baseTime: Date,
    optimalSettings: OptimalTimingSettings,
    recipient: any
  ): Date {
    const recipientTimezone = recipient.timezone || 'America/New_York';
    const recipientTime = new Date(baseTime.toLocaleString("en-US", { timeZone: recipientTimezone }));

    // Find next optimal time
    let optimalTime = new Date(recipientTime);

    // Adjust to preferred hours
    if (optimalSettings.preferredHours.length > 0) {
      const currentHour = optimalTime.getHours();
      const nextOptimalHour = optimalSettings.preferredHours.find(hour => hour > currentHour) ||
                             optimalSettings.preferredHours[0];
      
      if (nextOptimalHour <= currentHour) {
        // Next day
        optimalTime.setDate(optimalTime.getDate() + 1);
      }
      
      optimalTime.setHours(nextOptimalHour, 0, 0, 0);
    }

    // Adjust to preferred days
    if (optimalSettings.preferredDays.length > 0) {
      while (!optimalSettings.preferredDays.includes(optimalTime.getDay())) {
        optimalTime.setDate(optimalTime.getDate() + 1);
      }
    }

    // Avoid holidays if configured
    if (optimalSettings.avoidHolidays) {
      optimalTime = this.adjustForHolidays(optimalTime);
    }

    // Convert back to supplier's timezone for storage
    return new Date(optimalTime.toLocaleString("en-US", { timeZone: 'UTC' }));
  }

  private async processBulkSending(
    campaignId: string,
    messages: BulkMessage[],
    scheduling: SchedulingSettings
  ): Promise<void> {
    // Group messages by send time for batch processing
    const messageGroups = this.groupMessagesBySendTime(messages);

    for (const [sendTime, groupMessages] of messageGroups) {
      // Schedule batch for this time
      await this.scheduleBatch(campaignId, groupMessages, new Date(sendTime));
    }
  }

  private async scheduleBatch(
    campaignId: string,
    messages: BulkMessage[],
    sendTime: Date
  ): Promise<void> {
    // In a production environment, this would use a job queue like Bull or Agenda
    const delay = sendTime.getTime() - Date.now();
    
    if (delay <= 0) {
      // Send immediately
      await this.sendMessageBatch(messages);
    } else {
      // Schedule for later (pseudo-code - implement with your job queue)
      setTimeout(async () => {
        await this.sendMessageBatch(messages);
      }, delay);
    }
  }

  private async sendMessageBatch(messages: BulkMessage[]): Promise<void> {
    const promises = messages.map(message => this.sendSingleMessage(message));
    await Promise.allSettled(promises);
  }

  private async sendSingleMessage(message: BulkMessage): Promise<void> {
    try {
      await this.supabase
        .from('bulk_messages')
        .update({ status: 'sending' })
        .eq('id', message.id);

      let result: any;

      switch (message.channel) {
        case 'email':
          result = await this.emailService.send({
            to: message.recipientIdentifier,
            subject: message.personalizedContent.subject,
            html: message.personalizedContent.htmlBody,
            text: message.personalizedContent.textBody
          });
          break;

        case 'sms':
          result = await this.smsService.send({
            to: message.recipientIdentifier,
            message: message.personalizedContent.message
          });
          break;

        case 'whatsapp':
          result = await this.whatsappService.send({
            to: message.recipientIdentifier,
            content: message.personalizedContent
          });
          break;
      }

      // Update message status
      await this.supabase
        .from('bulk_messages')
        .update({
          status: 'sent',
          external_message_id: result.messageId,
          sent_at: new Date().toISOString()
        })
        .eq('id', message.id);

    } catch (error) {
      // Log failure
      await this.supabase
        .from('bulk_messages')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          failure_reason: error.message
        })
        .eq('id', message.id);
    }
  }

  async calculateRecipients(supplierId: string, targetAudience: TargetAudience): Promise<any[]> {
    let recipients: any[] = [];

    // Get recipients from segments
    if (targetAudience.segments?.length) {
      const { data: segmentMembers } = await this.supabase
        .from('segment_memberships')
        .select(`
          client_id,
          clients:client_id (
            id, name, email, phone, wedding_date, status, custom_fields, timezone
          )
        `)
        .in('segment_id', targetAudience.segments);

      recipients = segmentMembers?.map(m => m.clients) || [];
    }

    // Apply custom filters
    if (targetAudience.customFilters?.length) {
      recipients = await this.applyCustomFilters(recipients, targetAudience.customFilters);
    }

    // Remove excluded segments
    if (targetAudience.excludeSegments?.length) {
      const { data: excludedMembers } = await this.supabase
        .from('segment_memberships')
        .select('client_id')
        .in('segment_id', targetAudience.excludeSegments);

      const excludedIds = excludedMembers?.map(m => m.client_id) || [];
      recipients = recipients.filter(r => !excludedIds.includes(r.id));
    }

    // Apply max recipients limit
    if (targetAudience.maxRecipients && recipients.length > targetAudience.maxRecipients) {
      recipients = recipients.slice(0, targetAudience.maxRecipients);
    }

    return recipients;
  }

  private async applyCustomFilters(recipients: any[], filters: AudienceFilter[]): Promise<any[]> {
    return recipients.filter(recipient => {
      return filters.every(filter => this.evaluateFilter(recipient, filter));
    });
  }

  private evaluateFilter(recipient: any, filter: AudienceFilter): boolean {
    const fieldValue = this.getFieldValue(recipient, filter.field);
    
    switch (filter.operator) {
      case 'equals':
        return fieldValue === filter.value;
      case 'not_equals':
        return fieldValue !== filter.value;
      case 'greater_than':
        return fieldValue > filter.value;
      case 'less_than':
        return fieldValue < filter.value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(fieldValue);
      case 'between':
        return Array.isArray(filter.value) && 
               fieldValue >= filter.value[0] && 
               fieldValue <= filter.value[1];
      default:
        return true;
    }
  }

  private getFieldValue(recipient: any, field: string): any {
    if (field.includes('.')) {
      // Handle nested fields like 'custom_fields.budget'
      const parts = field.split('.');
      let value = recipient;
      for (const part of parts) {
        value = value?.[part];
      }
      return value;
    }
    return recipient[field];
  }

  async trackCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
    const [campaign, messages, analytics] = await Promise.all([
      this.getCampaign(campaignId),
      this.getCampaignMessages(campaignId),
      this.getCampaignAnalyticsData(campaignId)
    ]);

    const byChannel = this.calculateChannelAnalytics(messages);
    const engagement = this.calculateEngagementMetrics(messages);
    const performance = this.calculatePerformanceMetrics(campaign, messages);
    const timeline = this.calculateTimelineMetrics(messages);

    return {
      campaignId,
      totalRecipients: campaign.totalRecipients,
      byChannel,
      engagement,
      performance,
      timeline
    };
  }

  private calculateChannelAnalytics(messages: BulkMessage[]): ChannelAnalytics[] {
    const channelGroups = messages.reduce((acc, message) => {
      if (!acc[message.channel]) {
        acc[message.channel] = [];
      }
      acc[message.channel].push(message);
      return acc;
    }, {} as Record<string, BulkMessage[]>);

    return Object.entries(channelGroups).map(([channel, channelMessages]) => {
      const sent = channelMessages.filter(m => ['sent', 'delivered', 'opened', 'clicked'].includes(m.status)).length;
      const delivered = channelMessages.filter(m => ['delivered', 'opened', 'clicked'].includes(m.status)).length;
      const opened = channelMessages.filter(m => ['opened', 'clicked'].includes(m.status)).length;
      const clicked = channelMessages.filter(m => m.status === 'clicked').length;
      const failed = channelMessages.filter(m => m.status === 'failed').length;
      const cost = channelMessages.reduce((sum, m) => sum + (m.costCents || 0), 0);

      return {
        channel,
        sent,
        delivered,
        opened,
        clicked,
        failed,
        cost,
        deliveryRate: sent > 0 ? delivered / sent : 0,
        openRate: delivered > 0 ? opened / delivered : 0,
        clickRate: opened > 0 ? clicked / opened : 0
      };
    });
  }
}
```

## Test Requirements

```typescript
// __tests__/bulk-messaging.test.ts
import { BulkMessagingService } from '@/lib/services/bulk-messaging-service';

describe('Bulk Messaging', () => {
  let bulkService: BulkMessagingService;

  beforeEach(() => {
    bulkService = new BulkMessagingService();
  });

  describe('Campaign Creation', () => {
    it('should create campaign with recipient calculation', async () => {
      const campaignData = {
        campaignName: 'Spring 2024 Update',
        campaignType: 'seasonal',
        targetAudience: {
          segments: ['segment-1', 'segment-2']
        },
        channels: ['email', 'sms'],
        messageContent: {
          email: {
            subject: 'Spring Wedding Updates',
            htmlBody: '<p>Hello {{client_name}}</p>',
            textBody: 'Hello {{client_name}}'
          }
        },
        scheduling: { sendType: 'immediate' }
      };

      jest.spyOn(bulkService, 'calculateRecipients').mockResolvedValue([
        { id: '1', name: 'John Doe', email: 'john@example.com' },
        { id: '2', name: 'Jane Smith', email: 'jane@example.com' }
      ]);

      const campaign = await bulkService.createCampaign('supplier-1', campaignData);

      expect(campaign.totalRecipients).toBe(2);
      expect(campaign.status).toBe('draft');
      expect(campaign.estimatedCostCents).toBeGreaterThan(0);
    });
  });

  describe('Content Personalization', () => {
    it('should personalize content with recipient data', async () => {
      const content = {
        subject: 'Hello {{client_name}}!',
        htmlBody: '<p>Your wedding is in {{days_until_wedding}} days!</p>'
      };

      const recipient = {
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        weddingDate: '2024-08-15'
      };

      const personalizationSettings = {
        enabled: true,
        variables: [
          { name: 'client_name', dataSource: 'client_field', field: 'name' },
          { name: 'days_until_wedding', dataSource: 'calculated', calculation: 'days_until_wedding' }
        ],
        fallbackValues: { client_name: 'Friend' }
      };

      const personalized = await bulkService.personalizeContent(
        content,
        recipient,
        personalizationSettings
      );

      expect(personalized.subject).toBe('Hello John Doe!');
      expect(personalized.htmlBody).toContain('Your wedding is in');
    });

    it('should use fallback values for missing data', async () => {
      const content = { subject: 'Hello {{client_name}}!' };
      const recipient = { id: '1', email: 'john@example.com' }; // No name field
      const personalizationSettings = {
        enabled: true,
        variables: [
          { name: 'client_name', dataSource: 'client_field', field: 'name' }
        ],
        fallbackValues: { client_name: 'Friend' }
      };

      const personalized = await bulkService.personalizeContent(
        content,
        recipient,
        personalizationSettings
      );

      expect(personalized.subject).toBe('Hello Friend!');
    });
  });

  describe('Recipient Filtering', () => {
    it('should apply custom filters correctly', async () => {
      const recipients = [
        { id: '1', status: 'active', weddingDate: '2024-08-15' },
        { id: '2', status: 'inactive', weddingDate: '2024-09-20' },
        { id: '3', status: 'active', weddingDate: '2024-07-10' }
      ];

      const filters = [
        { field: 'status', operator: 'equals', value: 'active' },
        { field: 'weddingDate', operator: 'greater_than', value: '2024-08-01' }
      ];

      const filtered = await bulkService.applyCustomFilters(recipients, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('should handle complex nested field filters', async () => {
      const recipients = [
        { id: '1', customFields: { budget: 5000 } },
        { id: '2', customFields: { budget: 15000 } },
        { id: '3', customFields: { budget: 25000 } }
      ];

      const filters = [
        { field: 'customFields.budget', operator: 'between', value: [10000, 20000] }
      ];

      const filtered = await bulkService.applyCustomFilters(recipients, filters);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('2');
    });
  });

  describe('Send Scheduling', () => {
    it('should calculate immediate send times with throttling', () => {
      const baseTime = new Date('2024-06-15T14:00:00Z');
      const scheduling = {
        sendType: 'immediate',
        throttling: { maxPerHour: 60 }
      };

      const sendTime1 = bulkService.calculateSendTime(baseTime, scheduling, {}, 0);
      const sendTime2 = bulkService.calculateSendTime(baseTime, scheduling, {}, 60);

      expect(sendTime1).toEqual(baseTime);
      expect(sendTime2.getTime()).toBeGreaterThan(baseTime.getTime());
    });

    it('should calculate optimal send times by timezone', () => {
      const baseTime = new Date('2024-06-15T14:00:00Z'); // 2 PM UTC
      const scheduling = {
        sendType: 'optimal',
        optimalTiming: {
          enabled: true,
          respectTimezones: true,
          preferredHours: [9, 10, 11], // Morning hours
          preferredDays: [1, 2, 3, 4, 5] // Weekdays
        }
      };

      const recipient = { timezone: 'America/New_York' };
      
      const optimalTime = bulkService.calculateOptimalSendTime(
        baseTime,
        scheduling.optimalTiming,
        recipient
      );

      const recipientTime = new Date(optimalTime.toLocaleString("en-US", { 
        timeZone: 'America/New_York' 
      }));
      
      expect([9, 10, 11]).toContain(recipientTime.getHours());
    });

    it('should implement drip campaign timing', () => {
      const baseTime = new Date('2024-06-15T14:00:00Z');
      const scheduling = {
        sendType: 'drip',
        dripSettings: {
          interval: 30, // 30 minutes between batches
          batchSize: 10
        }
      };

      const sendTime1 = bulkService.calculateSendTime(baseTime, scheduling, {}, 5); // First batch
      const sendTime2 = bulkService.calculateSendTime(baseTime, scheduling, {}, 15); // Second batch

      const timeDiff = sendTime2.getTime() - sendTime1.getTime();
      expect(timeDiff).toBe(30 * 60 * 1000); // 30 minutes in milliseconds
    });
  });

  describe('Analytics Calculation', () => {
    it('should calculate channel-specific analytics', () => {
      const messages = [
        { channel: 'email', status: 'sent', costCents: 1 },
        { channel: 'email', status: 'delivered', costCents: 1 },
        { channel: 'email', status: 'opened', costCents: 1 },
        { channel: 'sms', status: 'sent', costCents: 75 },
        { channel: 'sms', status: 'delivered', costCents: 75 }
      ];

      const analytics = bulkService.calculateChannelAnalytics(messages);

      const emailAnalytics = analytics.find(a => a.channel === 'email');
      const smsAnalytics = analytics.find(a => a.channel === 'sms');

      expect(emailAnalytics.sent).toBe(3);
      expect(emailAnalytics.delivered).toBe(2);
      expect(emailAnalytics.opened).toBe(1);
      expect(emailAnalytics.openRate).toBe(0.5); // 1/2

      expect(smsAnalytics.sent).toBe(2);
      expect(smsAnalytics.delivered).toBe(1);
      expect(smsAnalytics.deliveryRate).toBe(0.5); // 1/2
    });

    it('should calculate ROI and performance metrics', () => {
      const campaign = {
        actualCostCents: 1000, // $10 spent
        totalRecipients: 100
      };

      const messages = [
        { status: 'clicked', costCents: 5 },
        { status: 'opened', costCents: 5 },
        { status: 'sent', costCents: 5 }
      ];

      const performance = bulkService.calculatePerformanceMetrics(campaign, messages);

      expect(performance.costPerEngagement).toBeDefined();
      expect(performance.costPerEngagement).toBeGreaterThan(0);
    });
  });

  describe('Unsubscribe Management', () => {
    it('should filter out unsubscribed recipients', async () => {
      const recipients = [
        { id: '1', email: 'john@example.com', phone: '+1234567890' },
        { id: '2', email: 'jane@example.com', phone: '+1234567891' },
        { id: '3', email: 'bob@example.com', phone: '+1234567892' }
      ];

      // Mock that jane@example.com has unsubscribed from email
      jest.spyOn(bulkService.supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: [{ email_address: 'jane@example.com', channel: 'email' }]
      });

      const filtered = await bulkService.filterUnsubscribedRecipients(recipients, ['email']);

      expect(filtered).toHaveLength(2);
      expect(filtered.find(r => r.email === 'jane@example.com')).toBeUndefined();
    });

    it('should handle global unsubscribes', async () => {
      const recipients = [
        { id: '1', email: 'john@example.com' },
        { id: '2', email: 'jane@example.com' }
      ];

      // Mock that jane@example.com has unsubscribed from all channels
      jest.spyOn(bulkService.supabase, 'from').mockReturnValue({
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        data: [{ email_address: 'jane@example.com', channel: 'all' }]
      });

      const filtered = await bulkService.filterUnsubscribedRecipients(recipients, ['email', 'sms']);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].email).toBe('john@example.com');
    });
  });
});
```

## Dependencies

### External Services
- **SendGrid API**: Email delivery
- **Twilio API**: SMS delivery  
- **WhatsApp Business API**: WhatsApp messaging
- **AWS SES**: Alternative email provider

### Internal Dependencies
- **Email Service**: Individual email sending
- **SMS Service**: Individual SMS sending
- **WhatsApp Service**: Individual WhatsApp messaging
- **Segment Service**: Audience calculation

### Frontend Dependencies
- **React Query**: API state management
- **Chart.js**: Analytics visualization
- **React Hook Form**: Form management
- **Rich Text Editor**: Email template editing

## Effort Estimate

- **Database Schema**: 12 hours
- **Campaign Management**: 16 hours
- **Recipient Segmentation**: 14 hours
- **Content Personalization**: 12 hours
- **Send Scheduling & Throttling**: 16 hours
- **Multi-channel Sending**: 14 hours
- **Analytics & Tracking**: 12 hours
- **Unsubscribe Management**: 8 hours
- **Frontend Components**: 28 hours
- **A/B Testing Integration**: 10 hours
- **Testing**: 22 hours
- **Documentation**: 8 hours

**Total Estimated Effort**: 172 hours (21.5 days)

## Success Metrics

- 99%+ message delivery rate across all channels
- Personalization accuracy 100% (no template errors)
- Campaign setup time under 10 minutes
- Unsubscribe processing within 5 minutes
- 95% user satisfaction with bulk messaging features
- 60% increase in client engagement through targeted campaigns