# WS-120: MRR Tracking Dashboard - Technical Specification

## Feature Overview
A comprehensive Monthly Recurring Revenue (MRR) tracking dashboard providing real-time calculations, growth trends, waterfall analysis, and segment breakdowns for wedding platform subscription business.

## User Stories

### Revenue Operations Manager - Business Health Monitoring
**As a revenue operations manager**, I want to track MRR trends and movements so that I can understand business growth patterns and identify revenue optimization opportunities.

**Scenario**: Revenue Ops Manager Sarah needs to present quarterly business review to investors, showing MRR growth trajectory and key metrics.

**User Journey**:
1. Sarah accesses the MRR dashboard at 8am for daily revenue check
2. Dashboard shows current MRR of $47,500 (+12.5% from last month)
3. She reviews MRR waterfall chart showing $5,200 from new subscriptions, $1,800 from expansions, -$900 from churn
4. Drills down into plan performance: Pro plan driving 60% of growth
5. Analyzes cohort performance: March cohort showing 95% retention after 3 months
6. Exports MRR report with trend charts for investor presentation
7. Sets up alerts for daily MRR drop >2% and monthly growth <5%

### CEO - Strategic Decision Making
**As a CEO**, I want real-time MRR visibility and growth forecasting so I can make informed strategic decisions about product development and market expansion.

**Scenario**: CEO needs to decide between investing in new features vs. geographic expansion based on revenue trajectory.

**User Journey**:
1. CEO opens executive dashboard showing key MRR metrics
2. Reviews 12-month MRR trend showing consistent 8-15% monthly growth
3. Analyzes expansion revenue: 35% of growth from existing customers upgrading
4. Examines churn patterns: 3.2% monthly churn, mainly from SMB segment
5. Forecasts hitting $100k MRR in 8 months at current growth rate
6. Decides to focus on enterprise features to accelerate expansion revenue
7. Sets revenue milestone of $75k MRR by end of quarter

## Database Schema

### MRR Tracking Core Tables

```sql
-- Daily MRR snapshots for historical tracking
CREATE TABLE mrr_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    total_mrr DECIMAL(12, 2) NOT NULL,
    new_mrr DECIMAL(12, 2) DEFAULT 0,
    expansion_mrr DECIMAL(12, 2) DEFAULT 0,
    contraction_mrr DECIMAL(12, 2) DEFAULT 0,
    churned_mrr DECIMAL(12, 2) DEFAULT 0,
    reactivation_mrr DECIMAL(12, 2) DEFAULT 0,
    net_mrr_change DECIMAL(12, 2) GENERATED ALWAYS AS (
        new_mrr + expansion_mrr + reactivation_mrr - contraction_mrr - churned_mrr
    ) STORED,
    growth_rate DECIMAL(5, 2), -- Percentage growth vs previous day
    active_subscriptions INTEGER NOT NULL,
    active_customers INTEGER NOT NULL,
    avg_revenue_per_customer DECIMAL(10, 2) GENERATED ALWAYS AS (
        CASE WHEN active_customers > 0 THEN total_mrr / active_customers ELSE 0 END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Detailed MRR movements for audit trail
CREATE TABLE mrr_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN (
        'new_subscription',
        'plan_upgrade',
        'plan_downgrade', 
        'churn_voluntary',
        'churn_involuntary',
        'reactivation',
        'discount_applied',
        'discount_removed',
        'proration_adjustment'
    )),
    amount_change DECIMAL(10, 2) NOT NULL, -- Positive for increases, negative for decreases
    previous_mrr DECIMAL(10, 2),
    new_mrr DECIMAL(10, 2),
    plan_id UUID REFERENCES subscription_plans(id),
    previous_plan_id UUID REFERENCES subscription_plans(id),
    stripe_subscription_id VARCHAR(255),
    stripe_invoice_id VARCHAR(255),
    reason TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- MRR by plan breakdown
CREATE TABLE mrr_plan_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    plan_id UUID REFERENCES subscription_plans(id) ON DELETE CASCADE,
    plan_name VARCHAR(100) NOT NULL,
    plan_tier VARCHAR(50) NOT NULL, -- 'starter', 'professional', 'enterprise'
    total_mrr DECIMAL(10, 2) NOT NULL,
    active_subscriptions INTEGER NOT NULL,
    new_subscriptions_count INTEGER DEFAULT 0,
    churned_subscriptions_count INTEGER DEFAULT 0,
    upgraded_to_count INTEGER DEFAULT 0,
    downgraded_from_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (date, plan_id)
);

-- Cohort-based MRR analysis
CREATE TABLE mrr_cohort_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_month DATE NOT NULL, -- First subscription month
    measurement_month DATE NOT NULL, -- Month being measured
    months_since_cohort INTEGER GENERATED ALWAYS AS (
        EXTRACT(YEAR FROM AGE(measurement_month, cohort_month)) * 12 + 
        EXTRACT(MONTH FROM AGE(measurement_month, cohort_month))
    ) STORED,
    initial_mrr DECIMAL(10, 2) NOT NULL,
    current_mrr DECIMAL(10, 2) NOT NULL,
    revenue_retention_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE WHEN initial_mrr > 0 THEN (current_mrr / initial_mrr) * 100 ELSE 0 END
    ) STORED,
    customers_remaining INTEGER NOT NULL,
    customers_initial INTEGER NOT NULL,
    customer_retention_rate DECIMAL(5, 2) GENERATED ALWAYS AS (
        CASE WHEN customers_initial > 0 THEN (customers_remaining::DECIMAL / customers_initial) * 100 ELSE 0 END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (cohort_month, measurement_month)
);

-- MRR forecasting data
CREATE TABLE mrr_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    forecast_date DATE NOT NULL,
    target_month DATE NOT NULL,
    forecasted_mrr DECIMAL(12, 2) NOT NULL,
    confidence_interval_lower DECIMAL(12, 2),
    confidence_interval_upper DECIMAL(12, 2),
    forecast_method VARCHAR(50) NOT NULL, -- 'linear_regression', 'arima', 'manual'
    assumptions JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (forecast_date, target_month)
);

-- MRR alerts and thresholds
CREATE TABLE mrr_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type VARCHAR(50) NOT NULL, -- 'daily_drop', 'growth_threshold', 'churn_spike'
    threshold_value DECIMAL(10, 2) NOT NULL,
    current_value DECIMAL(10, 2) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    notified_users UUID[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'
);
```

### Indexes and Performance Optimization

```sql
-- Performance indexes
CREATE INDEX idx_mrr_snapshots_date_desc ON mrr_snapshots(date DESC);
CREATE INDEX idx_mrr_movements_date_type ON mrr_movements(date, movement_type);
CREATE INDEX idx_mrr_movements_customer ON mrr_movements(customer_id, date);
CREATE INDEX idx_mrr_movements_subscription ON mrr_movements(subscription_id, date);
CREATE INDEX idx_mrr_plan_snapshots_date_plan ON mrr_plan_snapshots(date, plan_id);
CREATE INDEX idx_mrr_cohort_analysis ON mrr_cohort_snapshots(cohort_month, months_since_cohort);

-- Materialized views for fast dashboard queries
CREATE MATERIALIZED VIEW mrr_monthly_summary AS
SELECT 
    DATE_TRUNC('month', date) as month,
    AVG(total_mrr) as avg_mrr,
    MAX(total_mrr) as max_mrr,
    MIN(total_mrr) as min_mrr,
    SUM(new_mrr) as total_new_mrr,
    SUM(expansion_mrr) as total_expansion_mrr,
    SUM(contraction_mrr) as total_contraction_mrr,
    SUM(churned_mrr) as total_churned_mrr,
    AVG(active_subscriptions) as avg_active_subscriptions,
    AVG(active_customers) as avg_active_customers
FROM mrr_snapshots 
WHERE date >= CURRENT_DATE - INTERVAL '24 months'
GROUP BY DATE_TRUNC('month', date)
ORDER BY month;

CREATE UNIQUE INDEX idx_mrr_monthly_summary_month ON mrr_monthly_summary(month);

-- Real-time MRR calculation view
CREATE VIEW current_mrr AS
SELECT 
    SUM(
        CASE sp.billing_interval
            WHEN 'monthly' THEN sp.price
            WHEN 'quarterly' THEN sp.price / 3.0
            WHEN 'yearly' THEN sp.price / 12.0
            ELSE sp.price
        END
    ) as total_mrr,
    COUNT(*) as active_subscriptions,
    COUNT(DISTINCT s.organization_id) as active_customers
FROM subscriptions s
JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active'
    AND s.cancelled_at IS NULL;
```

### Row Level Security

```sql
-- RLS for MRR data access
ALTER TABLE mrr_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE mrr_alerts ENABLE ROW LEVEL SECURITY;

-- Only admin users can access MRR data
CREATE POLICY mrr_admin_access ON mrr_snapshots
    FOR ALL TO authenticated
    USING (
        auth.uid() IN (
            SELECT u.id FROM users u 
            WHERE u.role = 'admin' OR u.role = 'finance'
        )
    );

CREATE POLICY mrr_movements_admin_access ON mrr_movements
    FOR ALL TO authenticated
    USING (
        auth.uid() IN (
            SELECT u.id FROM users u 
            WHERE u.role = 'admin' OR u.role = 'finance'
        )
    );
```

## API Endpoints

### MRR Data Retrieval

```typescript
// Get current MRR overview
GET /api/admin/mrr/overview
interface MRROverviewResponse {
  current_mrr: number;
  previous_month_mrr: number;
  growth_rate: number;
  growth_amount: number;
  active_subscriptions: number;
  active_customers: number;
  avg_revenue_per_customer: number;
  components: {
    new_mrr: number;
    expansion_mrr: number;
    contraction_mrr: number;
    churned_mrr: number;
    net_change: number;
  };
  forecast: {
    next_month: number;
    confidence_range: [number, number];
  };
}

// Get MRR trend data
GET /api/admin/mrr/trends?period=12m&granularity=monthly
interface MRRTrendsResponse {
  data_points: {
    date: string;
    total_mrr: number;
    new_mrr: number;
    expansion_mrr: number;
    contraction_mrr: number;
    churned_mrr: number;
    net_change: number;
    growth_rate: number;
    active_subscriptions: number;
  }[];
  summary: {
    avg_growth_rate: number;
    median_growth_rate: number;
    total_mrr_growth: number;
    best_month: string;
    worst_month: string;
  };
}

// Get MRR waterfall data
GET /api/admin/mrr/waterfall?month=2024-03
interface MRRWaterfallResponse {
  start_mrr: number;
  end_mrr: number;
  movements: {
    type: 'new' | 'expansion' | 'contraction' | 'churn';
    amount: number;
    count: number;
    description: string;
  }[];
  net_change: number;
  growth_rate: number;
}

// Get plan breakdown
GET /api/admin/mrr/by-plan?date=2024-03-31
interface MRRByPlanResponse {
  plans: {
    plan_id: string;
    plan_name: string;
    plan_tier: string;
    mrr_contribution: number;
    mrr_percentage: number;
    active_subscriptions: number;
    avg_revenue_per_subscription: number;
    month_over_month_change: number;
  }[];
  total_mrr: number;
}

// Get cohort analysis
GET /api/admin/mrr/cohorts?months_back=12
interface MRRCohortsResponse {
  cohorts: {
    cohort_month: string;
    initial_mrr: number;
    initial_customers: number;
    retention_data: {
      month: number;
      mrr: number;
      customers: number;
      revenue_retention_rate: number;
      customer_retention_rate: number;
    }[];
  }[];
  averages: {
    month_1_retention: number;
    month_3_retention: number;
    month_6_retention: number;
    month_12_retention: number;
  };
}

// Create MRR alert
POST /api/admin/mrr/alerts
interface CreateMRRAlertRequest {
  alert_type: 'daily_drop' | 'growth_threshold' | 'churn_spike' | 'milestone';
  threshold_value: number;
  comparison: 'greater_than' | 'less_than' | 'equals';
  notification_channels: ('email' | 'slack' | 'webhook')[];
  recipients: string[]; // User IDs or email addresses
  is_active: boolean;
}

// MRR forecast
GET /api/admin/mrr/forecast?months=6&method=arima
interface MRRForecastResponse {
  forecasts: {
    month: string;
    forecasted_mrr: number;
    confidence_lower: number;
    confidence_upper: number;
    assumptions: string[];
  }[];
  model_accuracy: {
    mae: number; // Mean Absolute Error
    rmse: number; // Root Mean Square Error
    confidence_level: number;
  };
}
```

## React Components

### MRR Dashboard Main Component

```typescript
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  AlertTriangle,
  Target,
  Calendar,
  Download
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from 'recharts';

interface MRRDashboardProps {
  initialData?: MRROverviewResponse;
}

export function MRRDashboard({ initialData }: MRRDashboardProps) {
  const [timeRange, setTimeRange] = useState<'3m' | '6m' | '12m' | '24m'>('12m');
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [selectedView, setSelectedView] = useState<'overview' | 'waterfall' | 'cohorts' | 'forecast'>('overview');
  
  const [mrrData, setMrrData] = useState<MRROverviewResponse | null>(initialData || null);
  const [trendsData, setTrendsData] = useState<MRRTrendsResponse | null>(null);
  const [waterfallData, setWaterfallData] = useState<MRRWaterfallResponse | null>(null);
  const [cohortsData, setCohortsData] = useState<MRRCohortsResponse | null>(null);
  const [forecastData, setForecastData] = useState<MRRForecastResponse | null>(null);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange, granularity]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [overview, trends] = await Promise.all([
        fetch('/api/admin/mrr/overview').then(r => r.json()),
        fetch(`/api/admin/mrr/trends?period=${timeRange}&granularity=${granularity}`).then(r => r.json())
      ]);

      setMrrData(overview);
      setTrendsData(trends);
    } catch (error) {
      console.error('Failed to load MRR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWaterfallData = async (month: string) => {
    const data = await fetch(`/api/admin/mrr/waterfall?month=${month}`).then(r => r.json());
    setWaterfallData(data);
  };

  const loadCohortsData = async () => {
    const data = await fetch('/api/admin/mrr/cohorts?months_back=12').then(r => r.json());
    setCohortsData(data);
  };

  const loadForecastData = async () => {
    const data = await fetch('/api/admin/mrr/forecast?months=6&method=arima').then(r => r.json());
    setForecastData(data);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const exportMRRReport = async () => {
    try {
      const response = await fetch(`/api/admin/mrr/export?period=${timeRange}&format=xlsx`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mrr-report-${timeRange}-${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  if (!mrrData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">MRR Dashboard</h1>
          <p className="text-gray-600">Monthly Recurring Revenue Analytics</p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3m">3 Months</SelectItem>
              <SelectItem value="6m">6 Months</SelectItem>
              <SelectItem value="12m">12 Months</SelectItem>
              <SelectItem value="24m">24 Months</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={exportMRRReport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mrrData.current_mrr)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {mrrData.growth_rate >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
              )}
              {formatPercentage(mrrData.growth_rate)} from last month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mrrData.active_customers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(mrrData.avg_revenue_per_customer)} ARPC
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net MRR Change</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mrrData.components.net_change)}
            </div>
            <div className="text-xs text-muted-foreground">
              This month
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth Forecast</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(mrrData.forecast.next_month)}
            </div>
            <div className="text-xs text-muted-foreground">
              Next month projection
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'waterfall', label: 'Waterfall' },
          { key: 'cohorts', label: 'Cohorts' },
          { key: 'forecast', label: 'Forecast' }
        ].map(tab => (
          <Button
            key={tab.key}
            variant={selectedView === tab.key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => {
              setSelectedView(tab.key as any);
              if (tab.key === 'waterfall' && !waterfallData) loadWaterfallData('2024-03');
              if (tab.key === 'cohorts' && !cohortsData) loadCohortsData();
              if (tab.key === 'forecast' && !forecastData) loadForecastData();
            }}
            className="flex-1"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content based on selected view */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* MRR Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle>MRR Trend</CardTitle>
              <CardDescription>Monthly recurring revenue over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendsData?.data_points || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                    />
                    <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip 
                      formatter={(value: any, name) => [formatCurrency(value), name]}
                      labelFormatter={(date) => new Date(date).toLocaleDateString()}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="total_mrr"
                      fill="#3b82f6"
                      fillOpacity={0.1}
                      stroke="#3b82f6"
                      name="Total MRR"
                    />
                    <Bar dataKey="new_mrr" fill="#10b981" name="New MRR" />
                    <Bar dataKey="expansion_mrr" fill="#06b6d4" name="Expansion" />
                    <Bar dataKey="churned_mrr" fill="#ef4444" name="Churn" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* MRR Components Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">New MRR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(mrrData.components.new_mrr)}
                </div>
                <p className="text-xs text-gray-500">From new subscriptions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Expansion MRR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(mrrData.components.expansion_mrr)}
                </div>
                <p className="text-xs text-gray-500">From plan upgrades</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contraction MRR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-orange-600">
                  -{formatCurrency(mrrData.components.contraction_mrr)}
                </div>
                <p className="text-xs text-gray-500">From plan downgrades</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Churned MRR</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-red-600">
                  -{formatCurrency(mrrData.components.churned_mrr)}
                </div>
                <p className="text-xs text-gray-500">From cancellations</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedView === 'waterfall' && waterfallData && (
        <Card>
          <CardHeader>
            <CardTitle>MRR Waterfall Analysis</CardTitle>
            <CardDescription>How MRR changed this month</CardDescription>
          </CardHeader>
          <CardContent>
            <MRRWaterfallChart data={waterfallData} />
          </CardContent>
        </Card>
      )}

      {selectedView === 'cohorts' && cohortsData && (
        <Card>
          <CardHeader>
            <CardTitle>Cohort Revenue Retention</CardTitle>
            <CardDescription>Revenue retention by customer signup month</CardDescription>
          </CardHeader>
          <CardContent>
            <CohortRetentionHeatmap data={cohortsData} />
          </CardContent>
        </Card>
      )}

      {selectedView === 'forecast' && forecastData && (
        <Card>
          <CardHeader>
            <CardTitle>MRR Forecast</CardTitle>
            <CardDescription>Projected MRR growth with confidence intervals</CardDescription>
          </CardHeader>
          <CardContent>
            <MRRForecastChart data={forecastData} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Sub-components for different views
function MRRWaterfallChart({ data }: { data: MRRWaterfallResponse }) {
  // Waterfall chart implementation
  return <div>Waterfall Chart Component</div>;
}

function CohortRetentionHeatmap({ data }: { data: MRRCohortsResponse }) {
  // Cohort heatmap implementation
  return <div>Cohort Heatmap Component</div>;
}

function MRRForecastChart({ data }: { data: MRRForecastResponse }) {
  // Forecast chart implementation
  return <div>Forecast Chart Component</div>;
}
```

## Integration Services

### MRR Calculation Service

```typescript
// lib/services/mrr-calculator.ts
import { createClient } from '@supabase/supabase-js';
import { Stripe } from 'stripe';

interface MRRComponents {
  new_mrr: number;
  expansion_mrr: number;
  contraction_mrr: number;
  churned_mrr: number;
  reactivation_mrr: number;
}

export class MRRCalculator {
  private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  private stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

  async calculateCurrentMRR(): Promise<number> {
    const { data: currentMRR } = await this.supabase
      .from('current_mrr')
      .select('total_mrr')
      .single();
      
    return currentMRR?.total_mrr || 0;
  }

  async calculateMRRForDate(date: Date): Promise<{
    total_mrr: number;
    components: MRRComponents;
    active_subscriptions: number;
    active_customers: number;
  }> {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // Get all active subscriptions for the date
    const { data: subscriptions } = await this.supabase
      .from('subscriptions')
      .select(`
        *,
        subscription_plans (
          price,
          billing_interval
        )
      `)
      .eq('status', 'active')
      .lte('created_at', endOfMonth.toISOString())
      .or(`cancelled_at.is.null,cancelled_at.gt.${endOfMonth.toISOString()}`);

    // Calculate total MRR
    const total_mrr = subscriptions?.reduce((sum, sub) => {
      return sum + this.normalizeToMonthly(sub.subscription_plans.price, sub.subscription_plans.billing_interval);
    }, 0) || 0;

    // Calculate MRR components for the month
    const components = await this.calculateMRRComponents(startOfMonth, endOfMonth);

    return {
      total_mrr,
      components,
      active_subscriptions: subscriptions?.length || 0,
      active_customers: new Set(subscriptions?.map(s => s.organization_id)).size || 0
    };
  }

  private async calculateMRRComponents(startDate: Date, endDate: Date): Promise<MRRComponents> {
    const { data: movements } = await this.supabase
      .from('mrr_movements')
      .select('movement_type, amount_change')
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0]);

    const components: MRRComponents = {
      new_mrr: 0,
      expansion_mrr: 0,
      contraction_mrr: 0,
      churned_mrr: 0,
      reactivation_mrr: 0
    };

    movements?.forEach(movement => {
      switch (movement.movement_type) {
        case 'new_subscription':
          components.new_mrr += movement.amount_change;
          break;
        case 'plan_upgrade':
          components.expansion_mrr += movement.amount_change;
          break;
        case 'plan_downgrade':
          components.contraction_mrr += Math.abs(movement.amount_change);
          break;
        case 'churn_voluntary':
        case 'churn_involuntary':
          components.churned_mrr += Math.abs(movement.amount_change);
          break;
        case 'reactivation':
          components.reactivation_mrr += movement.amount_change;
          break;
      }
    });

    return components;
  }

  private normalizeToMonthly(price: number, interval: string): number {
    switch (interval) {
      case 'monthly':
        return price;
      case 'quarterly':
        return price / 3;
      case 'yearly':
        return price / 12;
      default:
        return price;
    }
  }

  async trackMRRMovement(movement: {
    subscription_id: string;
    customer_id: string;
    organization_id?: string;
    movement_type: string;
    amount_change: number;
    previous_mrr?: number;
    new_mrr?: number;
    plan_id?: string;
    previous_plan_id?: string;
    reason?: string;
  }) {
    // Insert movement record
    await this.supabase
      .from('mrr_movements')
      .insert({
        date: new Date().toISOString().split('T')[0],
        ...movement
      });

    // Refresh materialized views
    await this.supabase.rpc('refresh_materialized_view', { view_name: 'mrr_monthly_summary' });

    // Check for alerts
    await this.checkMRRAlerts(movement.amount_change);

    // Send webhook if significant change
    if (Math.abs(movement.amount_change) > 500) {
      await this.sendMRRWebhook('significant_change', movement);
    }
  }

  async createDailyMRRSnapshot() {
    const today = new Date();
    const mrrData = await this.calculateMRRForDate(today);

    // Get previous day's MRR for growth calculation
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: previousSnapshot } = await this.supabase
      .from('mrr_snapshots')
      .select('total_mrr')
      .eq('date', yesterday.toISOString().split('T')[0])
      .single();

    const growthRate = previousSnapshot?.total_mrr 
      ? ((mrrData.total_mrr - previousSnapshot.total_mrr) / previousSnapshot.total_mrr) * 100
      : 0;

    // Insert today's snapshot
    await this.supabase
      .from('mrr_snapshots')
      .upsert({
        date: today.toISOString().split('T')[0],
        total_mrr: mrrData.total_mrr,
        new_mrr: mrrData.components.new_mrr,
        expansion_mrr: mrrData.components.expansion_mrr,
        contraction_mrr: mrrData.components.contraction_mrr,
        churned_mrr: mrrData.components.churned_mrr,
        reactivation_mrr: mrrData.components.reactivation_mrr,
        growth_rate: growthRate,
        active_subscriptions: mrrData.active_subscriptions,
        active_customers: mrrData.active_customers
      }, {
        onConflict: 'date'
      });
  }

  async generateMRRForecast(months: number): Promise<MRRForecastResponse> {
    // Simple linear regression forecast (in production, use more sophisticated models)
    const { data: historical } = await this.supabase
      .from('mrr_snapshots')
      .select('date, total_mrr')
      .order('date', { ascending: true })
      .limit(24); // Use 24 months of data

    if (!historical || historical.length < 3) {
      throw new Error('Insufficient historical data for forecasting');
    }

    // Calculate trend
    const x = historical.map((_, i) => i);
    const y = historical.map(h => h.total_mrr);
    const { slope, intercept } = this.linearRegression(x, y);

    const forecasts = [];
    const lastIndex = historical.length - 1;

    for (let i = 1; i <= months; i++) {
      const forecastMonth = new Date();
      forecastMonth.setMonth(forecastMonth.getMonth() + i);
      
      const forecastedMRR = slope * (lastIndex + i) + intercept;
      const confidenceRange = this.calculateConfidenceInterval(forecastedMRR, historical);
      
      forecasts.push({
        month: forecastMonth.toISOString().split('T')[0],
        forecasted_mrr: Math.max(0, forecastedMRR),
        confidence_lower: Math.max(0, confidenceRange.lower),
        confidence_upper: confidenceRange.upper,
        assumptions: [
          'Linear growth trend continues',
          'No major market disruptions',
          'Current churn rates maintain'
        ]
      });
    }

    return {
      forecasts,
      model_accuracy: this.calculateModelAccuracy(historical, slope, intercept)
    };
  }

  private linearRegression(x: number[], y: number[]) {
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  }

  private calculateConfidenceInterval(forecast: number, historical: any[]): { lower: number; upper: number } {
    const variance = this.calculateVariance(historical.map(h => h.total_mrr));
    const standardError = Math.sqrt(variance);
    const margin = 1.96 * standardError; // 95% confidence interval

    return {
      lower: forecast - margin,
      upper: forecast + margin
    };
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
    return variance;
  }

  private calculateModelAccuracy(historical: any[], slope: number, intercept: number) {
    const predictions = historical.map((_, i) => slope * i + intercept);
    const actual = historical.map(h => h.total_mrr);
    
    const mae = actual.reduce((acc, val, i) => acc + Math.abs(val - predictions[i]), 0) / actual.length;
    const rmse = Math.sqrt(actual.reduce((acc, val, i) => acc + Math.pow(val - predictions[i], 2), 0) / actual.length);
    
    return {
      mae: Math.round(mae),
      rmse: Math.round(rmse),
      confidence_level: 0.95
    };
  }

  private async checkMRRAlerts(amountChange: number) {
    // Implementation for checking and triggering MRR alerts
    // This would check against configured thresholds and send notifications
  }

  private async sendMRRWebhook(event: string, data: any) {
    // Implementation for sending MRR change webhooks
    // This would notify external systems of significant MRR events
  }
}
```

## MCP Integration

### MRR Database Operations

```typescript
// For MCP server integration - MRR analytics operations
export const mrrMCPOperations = {
  // Daily MRR health check query
  async getDailyMRRHealth() {
    return `
      WITH daily_changes AS (
        SELECT 
          date,
          total_mrr,
          LAG(total_mrr) OVER (ORDER BY date) as previous_mrr,
          growth_rate,
          active_subscriptions,
          active_customers
        FROM mrr_snapshots 
        WHERE date >= CURRENT_DATE - INTERVAL '30 days'
        ORDER BY date DESC
      )
      SELECT 
        date,
        total_mrr,
        previous_mrr,
        total_mrr - previous_mrr as daily_change,
        growth_rate,
        active_subscriptions,
        active_customers,
        CASE 
          WHEN growth_rate < -5 THEN 'Critical'
          WHEN growth_rate < 0 THEN 'Warning'
          WHEN growth_rate > 10 THEN 'Excellent'
          ELSE 'Good'
        END as health_status
      FROM daily_changes
      WHERE previous_mrr IS NOT NULL
      ORDER BY date DESC
      LIMIT 7;
    `;
  },

  // MRR cohort performance analysis
  async getMRRCohortPerformance() {
    return `
      SELECT 
        cohort_month,
        months_since_cohort,
        initial_mrr,
        current_mrr,
        revenue_retention_rate,
        customer_retention_rate,
        CASE 
          WHEN months_since_cohort = 1 THEN 'Month 1'
          WHEN months_since_cohort = 3 THEN 'Month 3'
          WHEN months_since_cohort = 6 THEN 'Month 6'
          WHEN months_since_cohort = 12 THEN 'Month 12'
          ELSE CONCAT('Month ', months_since_cohort)
        END as milestone
      FROM mrr_cohort_snapshots
      WHERE months_since_cohort IN (1, 3, 6, 12, 24)
        AND cohort_month >= CURRENT_DATE - INTERVAL '24 months'
      ORDER BY cohort_month DESC, months_since_cohort;
    `;
  },

  // MRR movement analysis for optimization
  async getMRRMovementInsights() {
    return `
      WITH movement_summary AS (
        SELECT 
          DATE_TRUNC('month', date) as month,
          movement_type,
          COUNT(*) as event_count,
          SUM(ABS(amount_change)) as total_amount,
          AVG(amount_change) as avg_amount
        FROM mrr_movements
        WHERE date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', date), movement_type
      )
      SELECT 
        month,
        SUM(CASE WHEN movement_type LIKE '%new%' THEN total_amount ELSE 0 END) as new_revenue,
        SUM(CASE WHEN movement_type LIKE '%upgrade%' THEN total_amount ELSE 0 END) as expansion_revenue,
        SUM(CASE WHEN movement_type LIKE '%downgrade%' THEN total_amount ELSE 0 END) as contraction_revenue,
        SUM(CASE WHEN movement_type LIKE '%churn%' THEN total_amount ELSE 0 END) as churn_revenue,
        ROUND(
          (SUM(CASE WHEN movement_type LIKE '%upgrade%' THEN total_amount ELSE 0 END) * 100.0) / 
          NULLIF(SUM(CASE WHEN movement_type LIKE '%new%' THEN total_amount ELSE 0 END), 0), 2
        ) as expansion_to_new_ratio
      FROM movement_summary
      GROUP BY month
      ORDER BY month DESC;
    `;
  }
};
```

## Testing Requirements

### Unit Tests

```typescript
// __tests__/mrr-calculator.test.ts
import { MRRCalculator } from '@/lib/services/mrr-calculator';

describe('MRRCalculator', () => {
  let mrrCalculator: MRRCalculator;

  beforeEach(() => {
    mrrCalculator = new MRRCalculator();
  });

  test('should calculate current MRR correctly', async () => {
    const currentMRR = await mrrCalculator.calculateCurrentMRR();
    expect(currentMRR).toBeGreaterThanOrEqual(0);
  });

  test('should normalize billing intervals to monthly', () => {
    expect(mrrCalculator.normalizeToMonthly(120, 'yearly')).toBe(10);
    expect(mrrCalculator.normalizeToMonthly(30, 'quarterly')).toBe(10);
    expect(mrrCalculator.normalizeToMonthly(10, 'monthly')).toBe(10);
  });

  test('should track MRR movements correctly', async () => {
    const movement = {
      subscription_id: 'sub_123',
      customer_id: 'cus_123',
      movement_type: 'new_subscription',
      amount_change: 99,
      reason: 'New professional plan subscription'
    };

    await expect(mrrCalculator.trackMRRMovement(movement)).resolves.not.toThrow();
  });

  test('should generate MRR forecast', async () => {
    const forecast = await mrrCalculator.generateMRRForecast(6);
    
    expect(forecast.forecasts).toHaveLength(6);
    expect(forecast.forecasts[0]).toHaveProperty('forecasted_mrr');
    expect(forecast.forecasts[0]).toHaveProperty('confidence_lower');
    expect(forecast.forecasts[0]).toHaveProperty('confidence_upper');
    expect(forecast.model_accuracy).toHaveProperty('mae');
    expect(forecast.model_accuracy).toHaveProperty('rmse');
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/mrr-dashboard.test.ts
import { test, expect } from '@playwright/test';

test('admin can access MRR dashboard', async ({ page }) => {
  // Login as admin user
  await page.goto('/login');
  await page.fill('[name=email]', 'admin@wedsync.com');
  await page.fill('[name=password]', 'admin123');
  await page.click('[type=submit]');

  // Navigate to MRR dashboard
  await page.goto('/admin/mrr');

  // Check dashboard loads
  await expect(page.locator('h1')).toHaveText('MRR Dashboard');
  
  // Verify key metrics are displayed
  await expect(page.locator('[data-testid=current-mrr]')).toBeVisible();
  await expect(page.locator('[data-testid=growth-rate]')).toBeVisible();
  await expect(page.locator('[data-testid=active-customers]')).toBeVisible();

  // Test time range selection
  await page.selectOption('[data-testid=time-range]', '6m');
  await expect(page.locator('[data-testid=mrr-chart]')).toBeVisible();

  // Test waterfall view
  await page.click('[data-testid=waterfall-tab]');
  await expect(page.locator('[data-testid=waterfall-chart]')).toBeVisible();

  // Test cohort analysis
  await page.click('[data-testid=cohorts-tab]');
  await expect(page.locator('[data-testid=cohort-heatmap]')).toBeVisible();

  // Test export functionality
  const downloadPromise = page.waitForDownload();
  await page.click('[data-testid=export-button]');
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/mrr-report.*\.xlsx$/);
});

test('MRR calculations update in real-time', async ({ page }) => {
  // Setup WebSocket listener for MRR updates
  await page.goto('/admin/mrr');
  
  // Wait for initial load
  await page.waitForSelector('[data-testid=current-mrr]');
  const initialMRR = await page.textContent('[data-testid=current-mrr-value]');

  // Simulate subscription creation (this would be done via API)
  // In a real test, you'd trigger an actual subscription creation
  await page.evaluate(() => {
    // Mock WebSocket message for new subscription
    window.dispatchEvent(new CustomEvent('mrr-update', {
      detail: { type: 'new_subscription', amount: 99 }
    }));
  });

  // Verify MRR updates
  await expect(page.locator('[data-testid=mrr-notification]')).toBeVisible();
  await expect(page.locator('[data-testid=mrr-notification]')).toHaveText(/New subscription: \+\$99/);
});
```

## Acceptance Criteria

### Core Functionality
- ✅ Real-time MRR calculation with sub-second accuracy
- ✅ MRR waterfall analysis showing new, expansion, contraction, and churn
- ✅ Historical MRR trends with configurable time ranges
- ✅ Plan-based MRR breakdown with performance metrics
- ✅ Cohort-based revenue retention analysis
- ✅ MRR forecasting with confidence intervals

### Performance Requirements
- ✅ Dashboard loads in under 3 seconds for 24 months of data
- ✅ Real-time updates via WebSocket with <1 second latency
- ✅ MRR calculations complete in under 10 seconds for daily snapshots
- ✅ Export functionality generates reports in under 30 seconds
- ✅ Database queries optimized with proper indexing

### Business Intelligence
- ✅ Automated daily MRR snapshots at midnight UTC
- ✅ Alert system for significant MRR changes (>2% daily drop)
- ✅ Growth rate calculations with month-over-month comparison
- ✅ ARPC (Average Revenue Per Customer) tracking
- ✅ Revenue retention cohort analysis with heatmap visualization

### Security & Access Control
- ✅ Role-based access (admin and finance roles only)
- ✅ Audit trail for all MRR data access
- ✅ Sensitive financial data encryption at rest
- ✅ API rate limiting for MRR endpoints
- ✅ Export functionality with access logging

---

**Completion Status**: ✅ Ready for Development
**Estimated Development Time**: 4-5 weeks
**Dependencies**: Subscription billing system, Stripe integration, analytics infrastructure
**Business Value**: Critical for investor reporting, strategic planning, and revenue optimization - enables data-driven growth decisions