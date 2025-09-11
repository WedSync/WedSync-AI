# WS-285: Client Portal Analytics - Technical Specification

## Feature Overview
**Priority**: High  
**Tier**: Professional+ (with basic metrics in Starter)  
**Impact**: High - Business intelligence for suppliers  
**Complexity**: High  

Comprehensive analytics dashboard providing suppliers with actionable insights about their client interactions, portal usage, and business performance.

## Core Requirements

### Analytics Categories

#### 1. Client Engagement Metrics
- Portal login frequency and duration
- Form completion rates and abandonment points
- File upload/download activity
- Communication response times
- Feature usage patterns

#### 2. Business Performance Indicators
- Lead conversion rates from portal
- Average project value from portal clients
- Client satisfaction scores
- Referral rates and sources
- Revenue attribution to portal usage

#### 3. Operational Efficiency
- Time saved through automation
- Reduction in admin tasks
- Client inquiry response times
- Project milestone completion rates

#### 4. Growth Insights
- Client acquisition trends
- Seasonal booking patterns
- Service category performance
- Geographic client distribution
- Market opportunity identification

## Technical Implementation

### Database Schema

#### analytics_events table
```sql
CREATE TABLE analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  wedding_id UUID REFERENCES weddings(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  event_data JSONB,
  session_id VARCHAR(255),
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast analytics queries
CREATE INDEX idx_analytics_supplier_time ON analytics_events (supplier_id, created_at);
CREATE INDEX idx_analytics_event_type ON analytics_events (event_type, created_at);
CREATE INDEX idx_analytics_category ON analytics_events (event_category, supplier_id);
```

#### analytics_summaries table
```sql
CREATE TABLE analytics_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly'
  period_date DATE NOT NULL,
  summary_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(supplier_id, period_type, period_date)
);

-- Index for summary queries
CREATE INDEX idx_analytics_summaries_lookup ON analytics_summaries 
(supplier_id, period_type, period_date);
```

#### client_analytics table
```sql
CREATE TABLE client_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  engagement_score INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE,
  total_sessions INTEGER DEFAULT 0,
  total_session_duration INTEGER DEFAULT 0, -- seconds
  forms_completed INTEGER DEFAULT 0,
  files_uploaded INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  referrals_made INTEGER DEFAULT 0,
  satisfaction_rating DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS policies
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Suppliers can view their analytics events"
ON analytics_events FOR SELECT TO authenticated
USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers can view their analytics summaries"
ON analytics_summaries FOR SELECT TO authenticated
USING (supplier_id = auth.uid());

CREATE POLICY "Suppliers can view their client analytics"
ON client_analytics FOR SELECT TO authenticated
USING (supplier_id = auth.uid());
```

### API Endpoints

#### Analytics Overview API
```typescript
// GET /api/analytics/overview
interface AnalyticsOverviewResponse {
  totalClients: number;
  activeClients: number;
  avgEngagementScore: number;
  totalRevenue: number;
  conversionRate: number;
  trends: {
    clients: TrendData;
    engagement: TrendData;
    revenue: TrendData;
  };
}

// GET /api/analytics/dashboard
interface DashboardResponse {
  overview: OverviewMetrics;
  recentActivity: ActivityEvent[];
  topPerformingServices: ServiceMetric[];
  clientEngagement: EngagementMetric[];
  alerts: AlertItem[];
}
```

#### Detailed Analytics API
```typescript
// GET /api/analytics/clients
interface ClientAnalyticsResponse {
  clients: ClientMetric[];
  summary: {
    totalEngagement: number;
    averageSatisfaction: number;
    retentionRate: number;
  };
  filters?: AnalyticsFilters;
}

// GET /api/analytics/revenue
interface RevenueAnalyticsResponse {
  periodRevenue: PeriodRevenue[];
  revenueByService: ServiceRevenue[];
  projectedRevenue: ProjectionData;
  averageProjectValue: number;
}

// GET /api/analytics/engagement
interface EngagementAnalyticsResponse {
  sessionData: SessionMetric[];
  featureUsage: FeatureUsageMetric[];
  communicationMetrics: CommunicationMetric[];
  formCompletionRates: FormMetric[];
}
```

#### Real-time Analytics API
```typescript
// GET /api/analytics/realtime
interface RealtimeAnalyticsResponse {
  activeUsers: number;
  currentSessions: SessionData[];
  recentEvents: EventData[];
  liveMetrics: LiveMetric[];
}

// POST /api/analytics/track
interface TrackEventRequest {
  eventType: string;
  eventCategory: string;
  clientId?: string;
  weddingId?: string;
  eventData?: any;
  sessionId: string;
}
```

### React Components

#### AnalyticsDashboard Component
```typescript
interface AnalyticsDashboardProps {
  supplierId: string;
  dateRange?: DateRange;
  filters?: AnalyticsFilters;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  supplierId,
  dateRange = { from: subDays(new Date(), 30), to: new Date() },
  filters = {}
}) => {
  const { data: overview, isLoading } = useAnalyticsOverview(supplierId, dateRange);
  const { data: dashboard } = useAnalyticsDashboard(supplierId, dateRange);

  if (isLoading) return <AnalyticsSkeletonLoader />;

  return (
    <div className="analytics-dashboard">
      <AnalyticsHeader 
        dateRange={dateRange} 
        onDateRangeChange={setDateRange}
        filters={filters}
        onFiltersChange={setFilters}
      />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Clients"
          value={overview.totalClients}
          change={overview.trends.clients.change}
          trend={overview.trends.clients.trend}
          icon={Users}
        />
        <MetricCard
          title="Active Clients"
          value={overview.activeClients}
          change={overview.trends.engagement.change}
          trend={overview.trends.engagement.trend}
          icon={Activity}
        />
        <MetricCard
          title="Conversion Rate"
          value={`${overview.conversionRate}%`}
          change={overview.trends.conversion?.change}
          trend={overview.trends.conversion?.trend}
          icon={TrendingUp}
        />
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(overview.totalRevenue)}
          change={overview.trends.revenue.change}
          trend={overview.trends.revenue.trend}
          icon={DollarSign}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ClientEngagementChart data={dashboard.clientEngagement} />
        <RevenueChart data={dashboard.revenue} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentActivityPanel activities={dashboard.recentActivity} />
        <TopServicesPanel services={dashboard.topPerformingServices} />
        <AlertsPanel alerts={dashboard.alerts} />
      </div>
    </div>
  );
};
```

#### Client Engagement Chart
```typescript
const ClientEngagementChart: React.FC<{
  data: EngagementMetric[];
}> = ({ data }) => {
  const chartData = data.map(item => ({
    date: format(item.date, 'MMM dd'),
    sessions: item.sessions,
    duration: item.avgDuration / 60, // Convert to minutes
    satisfaction: item.avgSatisfaction
  }));

  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Client Engagement Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="sessions" fill="#8884d8" name="Sessions" />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="duration" 
              stroke="#82ca9d" 
              name="Avg Duration (min)"
            />
            <Line 
              yAxisId="right" 
              type="monotone" 
              dataKey="satisfaction" 
              stroke="#ffc658" 
              name="Satisfaction"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

#### Revenue Analytics Chart
```typescript
const RevenueChart: React.FC<{
  data: RevenueData[];
}> = ({ data }) => {
  return (
    <Card className="p-6">
      <CardHeader>
        <CardTitle>Revenue Analytics</CardTitle>
        <div className="flex space-x-4">
          <Button variant="outline" size="sm">Monthly</Button>
          <Button variant="outline" size="sm">Quarterly</Button>
          <Button variant="outline" size="sm">Yearly</Button>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Area 
              type="monotone" 
              dataKey="revenue" 
              stroke="#8884d8" 
              fill="#8884d8" 
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="projected" 
              stroke="#82ca9d" 
              fill="#82ca9d" 
              fillOpacity={0.4}
              strokeDasharray="5 5"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};
```

### Event Tracking System

#### Analytics Tracker Service
```typescript
class AnalyticsTracker {
  private sessionId: string;
  private supplierId: string;
  private clientId?: string;

  constructor(supplierId: string, clientId?: string) {
    this.supplierId = supplierId;
    this.clientId = clientId;
    this.sessionId = this.generateSessionId();
  }

  track(eventType: string, eventCategory: string, data?: any) {
    const event = {
      eventType,
      eventCategory,
      supplierId: this.supplierId,
      clientId: this.clientId,
      eventData: data,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString()
    };

    // Send immediately for critical events
    if (this.isCriticalEvent(eventType)) {
      this.sendEvent(event);
    } else {
      // Queue for batch sending
      this.queueEvent(event);
    }
  }

  trackPageView(page: string) {
    this.track('page_view', 'navigation', { page });
  }

  trackFormSubmission(formId: string, success: boolean) {
    this.track('form_submission', 'engagement', {
      formId,
      success,
      timestamp: Date.now()
    });
  }

  trackFileUpload(fileType: string, fileSize: number) {
    this.track('file_upload', 'content', {
      fileType,
      fileSize,
      timestamp: Date.now()
    });
  }

  trackCommunication(type: 'email' | 'sms' | 'message', direction: 'sent' | 'received') {
    this.track('communication', 'interaction', { type, direction });
  }

  private async sendEvent(event: AnalyticsEvent) {
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send analytics event:', error);
      // Store in local storage for retry
      this.storeFailedEvent(event);
    }
  }
}
```

#### React Hook for Analytics
```typescript
const useAnalytics = (supplierId: string, clientId?: string) => {
  const tracker = useMemo(
    () => new AnalyticsTracker(supplierId, clientId),
    [supplierId, clientId]
  );

  const trackEvent = useCallback(
    (eventType: string, category: string, data?: any) => {
      tracker.track(eventType, category, data);
    },
    [tracker]
  );

  const trackPageView = useCallback(
    (page: string) => {
      tracker.trackPageView(page);
    },
    [tracker]
  );

  return {
    trackEvent,
    trackPageView,
    trackFormSubmission: tracker.trackFormSubmission.bind(tracker),
    trackFileUpload: tracker.trackFileUpload.bind(tracker),
    trackCommunication: tracker.trackCommunication.bind(tracker)
  };
};
```

### Data Processing Pipeline

#### Analytics Processor
```typescript
class AnalyticsProcessor {
  async processEvents(events: AnalyticsEvent[]) {
    const processed = await Promise.all([
      this.calculateEngagementScores(events),
      this.updateSessionMetrics(events),
      this.processConversions(events),
      this.updateClientProfiles(events)
    ]);

    await this.generateSummaries(processed);
    await this.triggerAlerts(processed);
  }

  private async calculateEngagementScores(events: AnalyticsEvent[]) {
    const clientEngagement = new Map<string, EngagementData>();

    for (const event of events) {
      if (!event.client_id) continue;

      const existing = clientEngagement.get(event.client_id) || {
        sessions: 0,
        duration: 0,
        interactions: 0,
        satisfaction: 0
      };

      // Update engagement metrics based on event type
      switch (event.event_type) {
        case 'session_start':
          existing.sessions++;
          break;
        case 'session_end':
          existing.duration += event.event_data?.duration || 0;
          break;
        case 'form_submission':
          existing.interactions += 2;
          break;
        case 'message_sent':
          existing.interactions += 1;
          break;
        case 'satisfaction_rating':
          existing.satisfaction = event.event_data?.rating || 0;
          break;
      }

      clientEngagement.set(event.client_id, existing);
    }

    return clientEngagement;
  }
}
```

### Real-time Updates

#### WebSocket Integration
```typescript
const useRealtimeAnalytics = (supplierId: string) => {
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({});
  
  useEffect(() => {
    const channel = supabase
      .channel(`analytics:${supplierId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'analytics_events',
        filter: `supplier_id=eq.${supplierId}`
      }, (payload) => {
        setRealtimeData(prev => ({
          ...prev,
          events: [...(prev.events || []), payload.new],
          activeUsers: prev.activeUsers + (payload.new.event_type === 'session_start' ? 1 : 0)
        }));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supplierId]);

  return realtimeData;
};
```

### Success Metrics & Monitoring

#### Key Performance Indicators
```typescript
interface AnalyticsKPIs {
  // Engagement Metrics
  averageSessionDuration: number; // Target: >5 minutes
  sessionFrequency: number; // Target: >2 per week
  featureAdoptionRate: number; // Target: >70%
  
  // Business Metrics
  leadConversionRate: number; // Target: >15%
  clientRetentionRate: number; // Target: >85%
  averageProjectValue: number; // Target: increase 20% YoY
  
  // Operational Metrics
  timeToFirstValue: number; // Target: <24 hours
  supportTicketReduction: number; // Target: 40% reduction
  automationEfficiency: number; // Target: 60% of tasks automated
}
```

This comprehensive analytics system will provide suppliers with deep insights into their client portal performance, enabling data-driven decisions to improve client engagement and business outcomes.