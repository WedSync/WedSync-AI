# WS-113: Creator Analytics - Technical Specification

## Feature Overview
**Feature ID:** WS-113  
**Feature Name:** Creator Analytics  
**Team Assignment:** Team D (Analytics)  
**Dependencies:** WS-110 (Creator Onboarding)  
**Status:** Technical Specification Complete  
**Priority:** Medium (Analytics & Insights)

## User Stories with Wedding Context

### 📊 Story 1: Analytics Dashboard Access
**As a** template creator specializing in luxury wedding forms  
**I want to** view comprehensive performance analytics for my templates  
**So that I can** optimize my template offerings and maximize revenue from wedding coordinators purchasing my proven forms  

**Wedding Context:** A creator who developed high-converting contact forms for luxury venues wants to see which wedding markets (destination vs local) generate the most sales and what pricing strategies work best during peak wedding seasons.

### 💰 Story 2: Revenue Performance Tracking  
**As a** creator selling journey templates for wedding timeline management  
**I want to** track revenue trends and identify my highest-performing templates  
**So that I can** focus development effort on template categories that wedding coordinators purchase most frequently  

**Wedding Context:** A creator notices their "6-month wedding planning timeline" template sells 3x more than their "12-month version" during winter months when couples book spring weddings and need compressed timelines.

### 🎯 Story 3: A/B Testing Optimization
**As a** template creator in the RSVP management category  
**I want to** run A/B tests on template descriptions and pricing  
**So that I can** increase conversion rates from wedding coordinators browsing the marketplace  

**Wedding Context:** Testing whether "Stress-Free Guest Management" or "Professional RSVP Tracking" generates more clicks from busy wedding coordinators managing multiple events simultaneously.

### 📈 Story 4: Market Intelligence  
**As a** creator competing in the vendor communication template space  
**I want to** understand competitor performance and market trends  
**So that I can** position my templates competitively during peak wedding booking seasons (Jan-Mar)  

**Wedding Context:** Analyzing that competitor templates focusing on "last-minute vendor coordination" perform 40% better during summer wedding season when timeline pressure is highest.

### 🔍 Story 5: Customer Behavior Insights
**As a** template creator with multiple wedding workflow packages  
**I want to** understand which templates customers buy together  
**So that I can** create profitable bundles for wedding coordinators managing full-service events  

**Wedding Context:** Discovering that coordinators who buy "vendor onboarding forms" also purchase "payment tracking spreadsheets" 60% of the time, suggesting a "vendor management bundle" opportunity.

## Database Schema Design

```sql
-- Analytics events table with wedding-specific context
CREATE TABLE creator_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES user_profiles(id),
    template_id UUID NOT NULL REFERENCES marketplace_templates(id),
    event_type VARCHAR(50) NOT NULL, -- 'view', 'click', 'purchase', 'bundle_view'
    event_data JSONB DEFAULT '{}',
    user_id UUID REFERENCES user_profiles(id), -- Purchasing coordinator
    session_id UUID NOT NULL,
    wedding_season VARCHAR(20), -- 'spring', 'summer', 'fall', 'winter'
    wedding_type VARCHAR(30), -- 'luxury', 'destination', 'local', 'elopement'
    referrer_category VARCHAR(50), -- Which marketplace category led to this event
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily aggregated metrics for fast dashboard loading
CREATE TABLE creator_daily_metrics (
    creator_id UUID NOT NULL REFERENCES user_profiles(id),
    metric_date DATE NOT NULL,
    template_views INTEGER DEFAULT 0,
    template_clicks INTEGER DEFAULT 0,
    purchases INTEGER DEFAULT 0,
    gross_revenue INTEGER DEFAULT 0, -- In cents
    net_revenue INTEGER DEFAULT 0, -- After platform commission
    unique_visitors INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,4) DEFAULT 0,
    wedding_season_breakdown JSONB DEFAULT '{}', -- Views/purchases by season
    customer_type_breakdown JSONB DEFAULT '{}', -- Luxury vs budget coordinators
    PRIMARY KEY (creator_id, metric_date)
);

-- A/B testing framework for creators
CREATE TABLE creator_ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES user_profiles(id),
    template_id UUID NOT NULL REFERENCES marketplace_templates(id),
    test_name VARCHAR(100) NOT NULL,
    test_type VARCHAR(30) NOT NULL, -- 'pricing', 'description', 'title', 'screenshots'
    control_variant JSONB NOT NULL, -- Original version
    test_variant JSONB NOT NULL, -- New version being tested
    traffic_allocation DECIMAL(3,2) DEFAULT 0.50, -- 0.50 = 50/50 split
    success_metric VARCHAR(30) DEFAULT 'conversion_rate',
    target_significance DECIMAL(3,2) DEFAULT 0.95,
    minimum_sample_size INTEGER DEFAULT 100,
    status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'running', 'completed', 'stopped'
    wedding_seasonality_factor JSONB DEFAULT '{}', -- Seasonal performance adjustments
    starts_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bundle performance tracking for revenue optimization
CREATE TABLE creator_bundle_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES user_profiles(id),
    bundle_templates UUID[] NOT NULL, -- Array of template IDs in bundle
    bundle_name VARCHAR(100),
    frequency_bought_together DECIMAL(3,2), -- How often bought together
    average_bundle_revenue INTEGER, -- In cents
    projected_individual_revenue INTEGER, -- What individual sales would generate
    bundle_uplift_percentage DECIMAL(4,1), -- Revenue increase from bundling
    wedding_coordinator_segment VARCHAR(30), -- Which coordinator type buys most
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance indexes for fast analytics queries
CREATE INDEX idx_analytics_events_creator_date ON creator_analytics_events(creator_id, created_at DESC);
CREATE INDEX idx_analytics_events_template_type ON creator_analytics_events(template_id, event_type, created_at);
CREATE INDEX idx_daily_metrics_creator_range ON creator_daily_metrics(creator_id, metric_date DESC);
CREATE INDEX idx_ab_tests_active ON creator_ab_tests(creator_id, status) WHERE status IN ('running', 'draft');

-- Row Level Security for creator data isolation
ALTER TABLE creator_analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators can only view their own analytics events" ON creator_analytics_events
    FOR ALL USING (creator_id = auth.uid());

ALTER TABLE creator_daily_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creators can only view their own metrics" ON creator_daily_metrics
    FOR ALL USING (creator_id = auth.uid());
```

## API Endpoints

### GET /api/creators/analytics/dashboard
```typescript
interface CreatorAnalyticsDashboardRequest {
  timeframe: 'today' | 'week' | 'month' | 'quarter' | 'year';
  compareToPeriodsAgo?: number; // Compare to N periods ago
  templateIds?: string[]; // Filter to specific templates
  weddingSeasons?: ('spring' | 'summer' | 'fall' | 'winter')[]; // Filter by season
}

interface CreatorAnalyticsDashboardResponse {
  overview: {
    totalSales: number;
    totalGrossRevenue: number; // Before commission
    totalNetRevenue: number; // After commission
    conversionRate: number;
    averageOrderValue: number;
    uniqueCustomers: number;
    repeatCustomers: number;
    rankInCategory: number; // 1-based ranking among creators in same categories
    rankImprovement: number; // Change from last period
  };
  timeSeries: {
    daily: Array<{
      date: string;
      views: number;
      purchases: number;
      revenue: number;
      conversionRate: number;
    }>;
    seasonalTrends: {
      spring: { views: number; conversions: number; avgRevenue: number };
      summer: { views: number; conversions: number; avgRevenue: number };
      fall: { views: number; conversions: number; avgRevenue: number };
      winter: { views: number; conversions: number; avgRevenue: number };
    };
  };
  topTemplates: Array<{
    id: string;
    title: string;
    views: number;
    purchases: number;
    revenue: number;
    conversionRate: number;
    category: string;
    weddingTypePerformance: Record<string, number>; // Revenue by wedding type
  }>;
  customerInsights: {
    coordinatorTypes: Record<string, { count: number; avgSpend: number }>;
    geographicDistribution: Array<{ region: string; sales: number; revenue: number }>;
    purchasePatterns: {
      averageTemplatesPerOrder: number;
      mostCommonBundles: Array<{ templates: string[]; frequency: number }>;
    };
  };
  competitorBenchmarks: {
    categoryAvgConversionRate: number;
    categoryAvgPrice: number;
    yourPerformanceVsAvg: {
      conversionRate: number; // Percentage above/below category average
      pricing: number; // Percentage above/below category average
    };
  };
}
```

### GET /api/creators/analytics/insights
```typescript
interface CreatorInsightsResponse {
  insights: Array<{
    id: string;
    type: 'pricing' | 'timing' | 'competition' | 'seasonality' | 'bundling';
    severity: 'low' | 'medium' | 'high';
    title: string;
    description: string;
    impact: string; // Estimated revenue impact
    actionable: boolean;
    suggestedActions: Array<{
      action: string;
      description: string;
      estimatedUplift: string;
    }>;
    weddingContext: string; // Wedding industry specific context
    expires_at: string; // Time-sensitive insights
  }>;
  recommendations: {
    pricingOptimization: Array<{
      templateId: string;
      currentPrice: number;
      suggestedPrice: number;
      expectedUplift: number;
      confidence: number;
    }>;
    bundleOpportunities: Array<{
      templates: string[];
      bundleName: string;
      individualPrice: number;
      suggestedBundlePrice: number;
      projectedSales: number;
    }>;
    seasonalStrategies: Array<{
      season: string;
      strategy: string;
      expectedImpact: string;
    }>;
  };
}
```

### POST /api/creators/analytics/ab-tests
```typescript
interface CreateABTestRequest {
  templateId: string;
  testName: string;
  testType: 'pricing' | 'description' | 'title' | 'screenshots';
  controlVariant: {
    price?: number;
    title?: string;
    description?: string;
    screenshots?: string[];
  };
  testVariant: {
    price?: number;
    title?: string;
    description?: string;
    screenshots?: string[];
  };
  trafficAllocation: number; // 0.0 to 1.0
  duration: number; // Days to run test
  minimumSampleSize: number;
  weddingSeasonConsideration: boolean; // Account for seasonal effects
}

interface CreateABTestResponse {
  testId: string;
  status: 'created';
  estimatedCompletionDate: string;
  requiredSampleSize: number;
  estimatedDailyTraffic: number;
}
```

## Frontend Components

### CreatorAnalyticsDashboard Component
```typescript
'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, DollarSign, Eye, ShoppingCart, Users } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CreatorAnalyticsDashboardProps {
  creatorId: string;
}

export function CreatorAnalyticsDashboard({ creatorId }: CreatorAnalyticsDashboardProps) {
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month' | 'quarter'>('month');
  const [selectedSeason, setSelectedSeason] = useState<string>('all');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['creator-analytics', creatorId, timeframe, selectedSeason],
    queryFn: async () => {
      const params = new URLSearchParams({
        timeframe,
        ...(selectedSeason !== 'all' && { weddingSeasons: selectedSeason })
      });
      const response = await fetch(`/api/creators/analytics/dashboard?${params}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      return response.json();
    },
    refetchInterval: 5 * 60 * 1000 // Refresh every 5 minutes
  });

  const { data: insights } = useQuery({
    queryKey: ['creator-insights', creatorId],
    queryFn: async () => {
      const response = await fetch(`/api/creators/analytics/insights`);
      if (!response.ok) throw new Error('Failed to fetch insights');
      return response.json();
    },
    refetchInterval: 30 * 60 * 1000 // Refresh every 30 minutes
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Creator Analytics</h1>
          <p className="text-muted-foreground">Track your template performance and optimize revenue</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="quarter">This Quarter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedSeason} onValueChange={setSelectedSeason}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All Seasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Seasons</SelectItem>
              <SelectItem value="spring">Spring Weddings</SelectItem>
              <SelectItem value="summer">Summer Weddings</SelectItem>
              <SelectItem value="fall">Fall Weddings</SelectItem>
              <SelectItem value="winter">Winter Weddings</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.overview.totalSales}</div>
            <p className="text-xs text-muted-foreground">
              +{analytics.overview.totalSales - 120} from last {timeframe}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(analytics.overview.totalNetRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              After marketplace commission
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(analytics.overview.conversionRate)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.competitorBenchmarks.yourPerformanceVsAvg.conversionRate > 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
              )}
              {Math.abs(analytics.competitorBenchmarks.yourPerformanceVsAvg.conversionRate)}% vs category avg
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Category Rank</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#{analytics.overview.rankInCategory}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {analytics.overview.rankImprovement > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  +{analytics.overview.rankImprovement} positions
                </>
              ) : analytics.overview.rankImprovement < 0 ? (
                <>
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  {analytics.overview.rankImprovement} positions
                </>
              ) : (
                'No change'
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
            <CardDescription>Daily revenue and conversion performance</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={analytics.timeSeries.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Revenue' : 'Purchases'
                  ]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.6}
                />
                <Line type="monotone" dataKey="purchases" stroke="#82ca9d" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Wedding Season Performance</CardTitle>
            <CardDescription>Revenue distribution by wedding season</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={Object.entries(analytics.timeSeries.seasonalTrends).map(([season, data]) => ({
                    season: season.charAt(0).toUpperCase() + season.slice(1),
                    revenue: data.avgRevenue,
                    conversions: data.conversions
                  }))}
                  dataKey="revenue"
                  nameKey="season"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                >
                  {Object.keys(analytics.timeSeries.seasonalTrends).map((_, index) => (
                    <Cell key={`cell-${index}`} fill={['#0088FE', '#00C49F', '#FFBB28', '#FF8042'][index]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>AI-powered recommendations to optimize your templates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.insights.slice(0, 3).map((insight: any) => (
                <div key={insight.id} className="border-l-4 border-l-blue-500 pl-4 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={insight.severity === 'high' ? 'destructive' : 
                                   insight.severity === 'medium' ? 'default' : 'secondary'}>
                      {insight.severity}
                    </Badge>
                    <h4 className="font-semibold">{insight.title}</h4>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                  <p className="text-sm font-medium text-blue-600">{insight.weddingContext}</p>
                  {insight.suggestedActions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm font-medium">Suggested Actions:</p>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {insight.suggestedActions.map((action: any, idx: number) => (
                          <li key={idx}>{action.action} - {action.estimatedUplift}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Templates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Top Performing Templates</CardTitle>
          <CardDescription>Your most successful templates this {timeframe}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Template</th>
                  <th className="text-right p-2">Views</th>
                  <th className="text-right p-2">Sales</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Conversion</th>
                  <th className="text-right p-2">Wedding Type</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topTemplates.map((template: any) => (
                  <tr key={template.id} className="border-b hover:bg-muted/50">
                    <td className="p-2">
                      <div>
                        <div className="font-medium">{template.title}</div>
                        <div className="text-sm text-muted-foreground">{template.category}</div>
                      </div>
                    </td>
                    <td className="text-right p-2">{template.views.toLocaleString()}</td>
                    <td className="text-right p-2">{template.purchases}</td>
                    <td className="text-right p-2">{formatCurrency(template.revenue)}</td>
                    <td className="text-right p-2">
                      <Badge variant="outline">{formatPercentage(template.conversionRate)}</Badge>
                    </td>
                    <td className="text-right p-2 text-sm">
                      {Object.entries(template.weddingTypePerformance)
                        .sort(([,a], [,b]) => (b as number) - (a as number))
                        .slice(0, 1)
                        .map(([type]) => type.charAt(0).toUpperCase() + type.slice(1))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreatorAnalyticsDashboard;
```

## Integration Services

### Analytics Collection Service
```typescript
// lib/services/creator-analytics-service.ts
import { createClient } from '@/lib/supabase/client';

interface AnalyticsEvent {
  creatorId: string;
  templateId: string;
  eventType: 'view' | 'click' | 'purchase' | 'bundle_view';
  eventData?: Record<string, any>;
  userId?: string;
  sessionId: string;
  weddingSeason?: 'spring' | 'summer' | 'fall' | 'winter';
  weddingType?: string;
  referrerCategory?: string;
}

class CreatorAnalyticsService {
  private supabase = createClient();

  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      // Real-time event tracking
      await this.supabase
        .from('creator_analytics_events')
        .insert([{
          ...event,
          created_at: new Date().toISOString()
        }]);

      // Update daily metrics if it's a significant event
      if (['purchase', 'click'].includes(event.eventType)) {
        await this.updateDailyMetrics(event.creatorId, event.eventType);
      }

      // Send real-time updates via WebSocket if creator is online
      if (event.eventType === 'purchase') {
        await this.sendRealtimeUpdate(event.creatorId, {
          type: 'new_purchase',
          templateId: event.templateId,
          revenue: event.eventData?.revenue || 0
        });
      }
    } catch (error) {
      console.error('Failed to track analytics event:', error);
      // Don't throw - analytics shouldn't break user experience
    }
  }

  async generateInsights(creatorId: string): Promise<any> {
    const supabase = createClient();
    
    // Get creator's performance data
    const { data: metrics } = await supabase
      .from('creator_daily_metrics')
      .select('*')
      .eq('creator_id', creatorId)
      .gte('metric_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('metric_date', { ascending: false });

    if (!metrics?.length) return { insights: [], recommendations: {} };

    const insights = [];
    
    // Conversion rate insight
    const avgConversion = metrics.reduce((sum, m) => sum + Number(m.conversion_rate), 0) / metrics.length;
    if (avgConversion < 0.02) {
      insights.push({
        id: `conversion-${Date.now()}`,
        type: 'pricing',
        severity: 'high',
        title: 'Low Conversion Rate Detected',
        description: `Your conversion rate of ${(avgConversion * 100).toFixed(1)}% is below the wedding industry average of 2.5%`,
        impact: 'Could increase revenue by 25-40% with optimization',
        actionable: true,
        suggestedActions: [
          {
            action: 'Review pricing strategy',
            description: 'Consider reducing prices by 10-15% to test market response',
            estimatedUplift: '+25% in conversions'
          },
          {
            action: 'Optimize template descriptions',
            description: 'Focus on specific wedding pain points and time-saving benefits',
            estimatedUplift: '+15% in conversions'
          }
        ],
        weddingContext: 'Wedding coordinators are price-sensitive during off-peak seasons. Consider seasonal pricing adjustments.',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Seasonal performance insight
    const seasonalData = this.analyzeSeasonalPerformance(metrics);
    if (seasonalData.strongestSeason) {
      insights.push({
        id: `seasonal-${Date.now()}`,
        type: 'seasonality',
        severity: 'medium',
        title: 'Seasonal Performance Pattern Identified',
        description: `Your templates perform ${seasonalData.uplift}% better during ${seasonalData.strongestSeason} wedding season`,
        impact: `Focus marketing during ${seasonalData.strongestSeason} for maximum ROI`,
        actionable: true,
        suggestedActions: [
          {
            action: `Increase marketing spend during ${seasonalData.strongestSeason}`,
            description: 'Capitalize on your strongest performance period',
            estimatedUplift: `+${seasonalData.uplift}% revenue`
          }
        ],
        weddingContext: `${seasonalData.strongestSeason} weddings typically have different planning timelines and coordinator needs`,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    return {
      insights,
      recommendations: await this.generateRecommendations(creatorId, metrics)
    };
  }

  private async updateDailyMetrics(creatorId: string, eventType: string): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    
    const updateData: any = {};
    if (eventType === 'purchase') {
      updateData.purchases = 1;
    } else if (eventType === 'click') {
      updateData.template_clicks = 1;
    }

    await this.supabase.rpc('increment_daily_metrics', {
      p_creator_id: creatorId,
      p_date: today,
      p_updates: updateData
    });
  }

  private async sendRealtimeUpdate(creatorId: string, update: any): Promise<void> {
    await this.supabase.channel(`creator_${creatorId}`)
      .send({
        type: 'broadcast',
        event: 'analytics_update',
        payload: update
      });
  }

  private analyzeSeasonalPerformance(metrics: any[]): any {
    // Analyze seasonal patterns from wedding_season_breakdown JSONB data
    const seasonalTotals = { spring: 0, summer: 0, fall: 0, winter: 0 };
    
    metrics.forEach(metric => {
      if (metric.wedding_season_breakdown) {
        Object.entries(metric.wedding_season_breakdown).forEach(([season, data]: [string, any]) => {
          seasonalTotals[season as keyof typeof seasonalTotals] += data.revenue || 0;
        });
      }
    });

    const avgRevenue = Object.values(seasonalTotals).reduce((sum, rev) => sum + rev, 0) / 4;
    const strongestSeason = Object.entries(seasonalTotals)
      .sort(([,a], [,b]) => b - a)[0];

    return {
      strongestSeason: strongestSeason[0],
      uplift: Math.round(((strongestSeason[1] - avgRevenue) / avgRevenue) * 100)
    };
  }

  private async generateRecommendations(creatorId: string, metrics: any[]): Promise<any> {
    // Bundle opportunity analysis
    const { data: purchasePatterns } = await this.supabase.rpc('analyze_bundle_opportunities', {
      p_creator_id: creatorId,
      p_days_back: 30
    });

    return {
      bundleOpportunities: purchasePatterns?.map((pattern: any) => ({
        templates: pattern.template_ids,
        bundleName: `${pattern.category} Bundle`,
        individualPrice: pattern.individual_total,
        suggestedBundlePrice: Math.round(pattern.individual_total * 0.85), // 15% bundle discount
        projectedSales: pattern.frequency * 4 // Estimate monthly sales
      })) || [],
      pricingOptimization: [],
      seasonalStrategies: [
        {
          season: 'spring',
          strategy: 'Launch new templates 60 days before spring wedding season',
          expectedImpact: '+30% revenue during peak booking period'
        }
      ]
    };
  }
}

export const creatorAnalyticsService = new CreatorAnalyticsService();
```

## PostgreSQL/Supabase MCP Integration

```sql
-- Function to increment daily metrics (called via MCP)
CREATE OR REPLACE FUNCTION increment_daily_metrics(
  p_creator_id UUID,
  p_date DATE,
  p_updates JSONB
) RETURNS VOID AS $$
BEGIN
  INSERT INTO creator_daily_metrics (creator_id, metric_date, template_views, template_clicks, purchases)
  VALUES (
    p_creator_id, 
    p_date,
    COALESCE((p_updates->>'template_views')::INTEGER, 0),
    COALESCE((p_updates->>'template_clicks')::INTEGER, 0),
    COALESCE((p_updates->>'purchases')::INTEGER, 0)
  )
  ON CONFLICT (creator_id, metric_date)
  DO UPDATE SET
    template_views = creator_daily_metrics.template_views + COALESCE((p_updates->>'template_views')::INTEGER, 0),
    template_clicks = creator_daily_metrics.template_clicks + COALESCE((p_updates->>'template_clicks')::INTEGER, 0),
    purchases = creator_daily_metrics.purchases + COALESCE((p_updates->>'purchases')::INTEGER, 0),
    conversion_rate = CASE 
      WHEN (creator_daily_metrics.template_clicks + COALESCE((p_updates->>'template_clicks')::INTEGER, 0)) > 0
      THEN (creator_daily_metrics.purchases + COALESCE((p_updates->>'purchases')::INTEGER, 0))::DECIMAL / 
           (creator_daily_metrics.template_clicks + COALESCE((p_updates->>'template_clicks')::INTEGER, 0))
      ELSE 0
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to analyze bundle opportunities (complex analytics via MCP)
CREATE OR REPLACE FUNCTION analyze_bundle_opportunities(
  p_creator_id UUID,
  p_days_back INTEGER DEFAULT 30
) RETURNS TABLE (
  template_ids UUID[],
  category TEXT,
  individual_total INTEGER,
  frequency DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  WITH purchase_pairs AS (
    SELECT 
      ARRAY[e1.template_id, e2.template_id] as template_pair,
      COUNT(*) as co_purchases
    FROM creator_analytics_events e1
    JOIN creator_analytics_events e2 ON e1.session_id = e2.session_id
    WHERE e1.creator_id = p_creator_id 
      AND e2.creator_id = p_creator_id
      AND e1.event_type = 'purchase'
      AND e2.event_type = 'purchase' 
      AND e1.template_id != e2.template_id
      AND e1.created_at >= NOW() - INTERVAL '1 day' * p_days_back
    GROUP BY template_pair
    HAVING COUNT(*) >= 3
  ),
  total_purchases AS (
    SELECT COUNT(*) as total
    FROM creator_analytics_events
    WHERE creator_id = p_creator_id 
      AND event_type = 'purchase'
      AND created_at >= NOW() - INTERVAL '1 day' * p_days_back
  )
  SELECT 
    pp.template_pair,
    'Mixed' as category,
    5000 as individual_total, -- Placeholder, would calculate from template prices
    (pp.co_purchases::DECIMAL / tp.total) as frequency
  FROM purchase_pairs pp
  CROSS JOIN total_purchases tp
  WHERE (pp.co_purchases::DECIMAL / tp.total) >= 0.15; -- 15% co-purchase rate
END;
$$ LANGUAGE plpgsql;
```

## Testing Requirements

### Unit Tests
```typescript
// __tests__/creator-analytics.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { creatorAnalyticsService } from '@/lib/services/creator-analytics-service';

describe('CreatorAnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should track analytics events without throwing', async () => {
    const event = {
      creatorId: 'creator-1',
      templateId: 'template-1', 
      eventType: 'purchase' as const,
      eventData: { revenue: 2500 },
      sessionId: 'session-123',
      weddingSeason: 'spring' as const
    };

    await expect(creatorAnalyticsService.trackEvent(event)).resolves.not.toThrow();
  });

  it('should generate insights for low conversion rates', async () => {
    const insights = await creatorAnalyticsService.generateInsights('creator-1');
    
    expect(insights).toHaveProperty('insights');
    expect(insights.insights).toBeInstanceOf(Array);
    
    const conversionInsight = insights.insights.find((i: any) => i.type === 'pricing');
    if (conversionInsight) {
      expect(conversionInsight).toHaveProperty('weddingContext');
      expect(conversionInsight.suggestedActions).toBeInstanceOf(Array);
    }
  });
});
```

### Integration Tests  
```typescript
// __tests__/integration/creator-analytics-flow.test.ts
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

describe('Creator Analytics Integration', () => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  it('should track purchase event and update daily metrics', async () => {
    // Insert test creator and template
    const { data: creator } = await supabase
      .from('user_profiles')
      .insert([{ id: 'test-creator', email: 'creator@test.com' }])
      .select()
      .single();

    // Track purchase event
    await supabase
      .from('creator_analytics_events')
      .insert([{
        creator_id: creator.id,
        template_id: 'test-template',
        event_type: 'purchase',
        event_data: { revenue: 2500 },
        session_id: 'test-session'
      }]);

    // Check daily metrics were updated
    const { data: metrics } = await supabase
      .from('creator_daily_metrics')
      .select('*')
      .eq('creator_id', creator.id)
      .eq('metric_date', new Date().toISOString().split('T')[0])
      .single();

    expect(metrics.purchases).toBe(1);
    expect(metrics.gross_revenue).toBeGreaterThan(0);
  });
});
```

## Acceptance Criteria

### ✅ Core Analytics Dashboard
- [ ] Creator can view real-time sales, revenue, and conversion metrics
- [ ] Dashboard updates automatically every 5 minutes  
- [ ] Data can be filtered by timeframe (day, week, month, quarter)
- [ ] Wedding season filtering shows performance by spring/summer/fall/winter
- [ ] Category ranking shows creator's position among competitors

### ✅ Performance Insights Engine
- [ ] AI-generated insights identify pricing, timing, and competition opportunities
- [ ] Recommendations include wedding industry specific context
- [ ] Action items provide estimated revenue impact
- [ ] Insights refresh automatically and expire when no longer relevant
- [ ] Bundle opportunities analysis suggests profitable template combinations

### ✅ A/B Testing Framework  
- [ ] Creators can test different prices, titles, descriptions, and screenshots
- [ ] Statistical significance calculation determines test winners
- [ ] Wedding seasonality factors are considered in test analysis
- [ ] Test results include confidence levels and conversion uplifts
- [ ] Automatic test stopping when significance is reached

### ✅ Revenue Optimization
- [ ] Pricing recommendations based on conversion rate analysis
- [ ] Bundle suggestions based on purchase pattern analysis  
- [ ] Seasonal strategy recommendations for different wedding periods
- [ ] Competitor benchmarking shows performance vs category averages
- [ ] Revenue projections help creators plan template development

### ✅ Data Security & Performance
- [ ] Row Level Security ensures creators only see their own data
- [ ] Real-time updates via WebSocket connections
- [ ] Database indexes optimize query performance for large datasets
- [ ] Analytics events tracked without blocking user experience
- [ ] GDPR compliant data retention and deletion policies

**MCP Integration Requirements:**
- [ ] PostgreSQL MCP enables complex analytics queries
- [ ] Bundle opportunity analysis via database functions
- [ ] Daily metrics aggregation through stored procedures
- [ ] Real-time dashboard updates using Supabase subscriptions
- [ ] Analytics event tracking optimized for high volume

---

**Estimated Development Time:** 3-4 weeks  
**Team Requirement:** Full-stack developer with analytics experience  
**External Dependencies:** PostHog (alternative), Stripe (revenue data), Supabase (real-time)  
**Success Metrics:** Creator engagement with analytics, revenue optimization adoption, A/B test completion rates