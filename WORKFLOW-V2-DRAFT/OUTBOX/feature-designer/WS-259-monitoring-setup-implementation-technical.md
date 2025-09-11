# WS-259: Monitoring Setup Implementation System

## Feature ID
**WS-259**

## Feature Name  
**Monitoring Setup Implementation System**

## Feature Type
**Critical Infrastructure - Observability & Reliability**

## User Stories

### DevOps Engineer Story
> **As Alex, the DevOps engineer responsible for WedSync platform reliability,**  
> I want a comprehensive monitoring system that automatically detects issues, sends appropriate alerts, and provides actionable insights, so that I can maintain 99.9% uptime and resolve incidents before they impact user experience.

### Product Manager Story
> **As Maria, the product manager tracking WedSync business metrics,**  
> I want real-time visibility into user engagement, feature adoption, and conversion funnels, so that I can make data-driven decisions about product development and identify opportunities for growth optimization.

### End User Experience Story
> **As any WedSync user (supplier or couple),**  
> I want the platform to be consistently fast and reliable, with issues detected and resolved proactively, so that I can focus on planning amazing weddings without worrying about technical problems disrupting my workflow.

## Core Requirements

### 1. Comprehensive Error Tracking & Alerting
- **Multi-Level Error Tracking**: Frontend errors, API failures, database issues, third-party integrations
- **Intelligent Alert Routing**: Context-aware notifications with escalation policies
- **Error Correlation**: Link related errors across services for faster root cause analysis
- **Auto-Recovery Monitoring**: Track failed operations that recover automatically

### 2. Performance Monitoring & Optimization
- **Real-Time Performance Metrics**: API response times, database performance, Core Web Vitals
- **Performance Regression Detection**: Automatic detection of performance degradation
- **User Experience Monitoring**: Track actual user experience across different workflows
- **Resource Utilization Tracking**: CPU, memory, database connections, rate limits

### 3. Business Intelligence & Analytics Dashboard
- **Real-Time Business Metrics**: DAU, engagement rates, conversion funnels, revenue metrics
- **Feature Adoption Tracking**: Monitor usage of new features and workflows
- **User Journey Analytics**: Track user progression through onboarding and key workflows
- **Predictive Analytics**: Early warning indicators for churn and growth patterns

### 4. Incident Management & Response Automation
- **Automated Incident Detection**: Proactive issue identification with severity classification
- **Escalation Management**: Smart routing and escalation based on severity and context
- **Runbook Integration**: Automated response procedures for common issues
- **Post-Incident Analysis**: Automatic collection of incident data for retrospectives

## Database Schema

### Monitoring Configuration Tables

```sql
-- Monitoring metrics configuration
CREATE TABLE monitoring_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL UNIQUE,
    metric_type TEXT CHECK (metric_type IN ('business', 'technical', 'user_experience', 'security')),
    collection_method TEXT CHECK (collection_method IN ('api', 'database', 'frontend', 'external')),
    collection_frequency_seconds INTEGER NOT NULL DEFAULT 300,
    retention_days INTEGER NOT NULL DEFAULT 30,
    alert_thresholds JSONB,
    dashboard_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert configuration and routing
CREATE TABLE alert_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name TEXT NOT NULL UNIQUE,
    metric_name TEXT REFERENCES monitoring_metrics(metric_name),
    condition_type TEXT CHECK (condition_type IN ('threshold', 'anomaly', 'pattern', 'absence')),
    condition_config JSONB NOT NULL,
    severity_level TEXT CHECK (severity_level IN ('critical', 'high', 'medium', 'low', 'info')),
    escalation_policy JSONB,
    notification_channels JSONB NOT NULL, -- ['slack', 'email', 'pagerduty', 'webhook']
    suppression_rules JSONB, -- Rules to prevent alert spam
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Real-time metrics data
CREATE TABLE metrics_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    dimensions JSONB DEFAULT '{}', -- {'user_type': 'supplier', 'feature': 'dashboard'}
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    source_system TEXT,
    INDEX (metric_name, timestamp),
    INDEX (timestamp DESC) -- For time-series queries
);

-- Create time-series partitioning for metrics_data
CREATE TABLE metrics_data_daily () INHERITS (metrics_data);
-- Add partitioning by day to manage large volumes
```

### Incident Management Tables

```sql
-- Incident tracking and management
CREATE TABLE incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_number TEXT UNIQUE NOT NULL, -- INC-2024-001
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT CHECK (severity IN ('SEV1', 'SEV2', 'SEV3', 'SEV4')),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'mitigating', 'resolved', 'closed')),
    affected_services TEXT[] DEFAULT '{}',
    affected_users_count INTEGER DEFAULT 0,
    root_cause TEXT,
    resolution_summary TEXT,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    assigned_to UUID, -- User ID
    created_by TEXT DEFAULT 'system', -- 'system' for auto-detected
    tags TEXT[] DEFAULT '{}',
    timeline JSONB DEFAULT '[]', -- Incident timeline events
    metrics_snapshot JSONB, -- System state when incident occurred
    post_mortem_url TEXT
);

-- Alert instances and their lifecycle
CREATE TABLE alert_instances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_configuration_id UUID REFERENCES alert_configurations(id),
    incident_id UUID REFERENCES incidents(id),
    alert_key TEXT NOT NULL, -- Deduplication key
    status TEXT DEFAULT 'firing' CHECK (status IN ('firing', 'resolved', 'suppressed', 'expired')),
    first_triggered_at TIMESTAMPTZ DEFAULT NOW(),
    last_triggered_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 1,
    trigger_value NUMERIC,
    trigger_dimensions JSONB,
    notification_history JSONB DEFAULT '[]',
    suppression_reason TEXT,
    UNIQUE (alert_configuration_id, alert_key)
);

-- System health checks and status
CREATE TABLE health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_name TEXT NOT NULL,
    check_type TEXT CHECK (check_type IN ('http', 'database', 'service', 'custom')),
    check_config JSONB NOT NULL,
    status TEXT CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
    response_time_ms INTEGER,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count_24h INTEGER DEFAULT 0,
    check_frequency_seconds INTEGER DEFAULT 60,
    timeout_seconds INTEGER DEFAULT 30,
    is_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Performance Analytics Tables

```sql
-- Web Vitals and performance metrics
CREATE TABLE performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT,
    user_id UUID,
    page_route TEXT NOT NULL,
    metric_type TEXT CHECK (metric_type IN ('LCP', 'FID', 'CLS', 'TTFB', 'FCP', 'TTI')),
    metric_value NUMERIC NOT NULL,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    connection_type TEXT,
    browser TEXT,
    country_code TEXT,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX (page_route, recorded_at),
    INDEX (metric_type, recorded_at)
);

-- API performance tracking
CREATE TABLE api_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id TEXT UNIQUE,
    method TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    response_time_ms INTEGER NOT NULL,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    user_id UUID,
    user_type TEXT,
    ip_address INET,
    user_agent TEXT,
    error_message TEXT,
    database_query_time_ms INTEGER,
    external_api_time_ms INTEGER,
    cache_hit BOOLEAN,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX (endpoint, recorded_at),
    INDEX (status_code, recorded_at),
    INDEX (response_time_ms, recorded_at)
);

-- Business metrics aggregation
CREATE TABLE business_metrics_daily (
    date DATE PRIMARY KEY,
    dau INTEGER DEFAULT 0, -- Daily Active Users
    new_signups INTEGER DEFAULT 0,
    form_completions INTEGER DEFAULT 0,
    journey_starts INTEGER DEFAULT 0,
    journey_completions INTEGER DEFAULT 0,
    revenue_usd NUMERIC DEFAULT 0,
    churn_count INTEGER DEFAULT 0,
    support_tickets INTEGER DEFAULT 0,
    critical_errors INTEGER DEFAULT 0,
    avg_response_time_ms NUMERIC DEFAULT 0,
    uptime_percentage NUMERIC DEFAULT 100,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API Endpoints

### Monitoring Management APIs

```typescript
// Metrics configuration
GET    /api/admin/monitoring/metrics              // List all monitoring metrics
POST   /api/admin/monitoring/metrics              // Create new metric
PUT    /api/admin/monitoring/metrics/:name        // Update metric configuration
DELETE /api/admin/monitoring/metrics/:name        // Remove metric

// Alert management
GET    /api/admin/monitoring/alerts               // List alert configurations
POST   /api/admin/monitoring/alerts               // Create alert rule
PUT    /api/admin/monitoring/alerts/:id           // Update alert configuration
POST   /api/admin/monitoring/alerts/:id/test      // Test alert configuration
DELETE /api/admin/monitoring/alerts/:id           // Delete alert rule

// Health checks
GET    /api/admin/monitoring/health               // Current system health
GET    /api/admin/monitoring/health/history       // Health check history
POST   /api/admin/monitoring/health/checks        // Create custom health check
PUT    /api/admin/monitoring/health/checks/:id    // Update health check
```

### Data Collection APIs

```typescript
// Metrics ingestion
POST   /api/monitoring/metrics                    // Submit custom metrics
POST   /api/monitoring/performance               // Submit performance metrics
POST   /api/monitoring/errors                    // Submit error events
POST   /api/monitoring/business-events           // Submit business events

// Real-time data
GET    /api/monitoring/live/metrics              // Live metrics feed
GET    /api/monitoring/live/alerts               // Active alerts
GET    /api/monitoring/live/health               // Real-time health status
WebSocket /api/monitoring/live/stream            // Real-time monitoring stream
```

### Incident Management APIs

```typescript
// Incident lifecycle
GET    /api/admin/incidents                      // List incidents
POST   /api/admin/incidents                      // Create manual incident
GET    /api/admin/incidents/:id                  // Get incident details
PUT    /api/admin/incidents/:id/status           // Update incident status
POST   /api/admin/incidents/:id/timeline         // Add timeline event
POST   /api/admin/incidents/:id/resolve          // Resolve incident

// Alert management
GET    /api/admin/alerts/active                  // Active alerts
POST   /api/admin/alerts/:id/acknowledge         // Acknowledge alert
POST   /api/admin/alerts/:id/suppress            // Suppress alert
POST   /api/admin/alerts/:id/escalate            // Manual escalation
```

### Dashboard & Analytics APIs

```typescript
// Dashboard data
GET    /api/monitoring/dashboard/overview        // System overview dashboard
GET    /api/monitoring/dashboard/business        // Business metrics dashboard
GET    /api/monitoring/dashboard/performance     // Performance dashboard
GET    /api/monitoring/dashboard/custom          // Custom dashboard configurations

// Analytics queries
POST   /api/monitoring/query/metrics             // Query metrics with filters
GET    /api/monitoring/analytics/trends          // Performance trends
GET    /api/monitoring/analytics/anomalies       // Anomaly detection results
GET    /api/monitoring/analytics/forecasts       // Predictive analytics
```

## Frontend Components

### Real-Time Monitoring Dashboard

```typescript
// Comprehensive real-time monitoring dashboard
const MonitoringDashboard: React.FC = () => {
    const [systemHealth, setSystemHealth] = useState<SystemHealth>();
    const [activeAlerts, setActiveAlerts] = useState<Alert[]>([]);
    const [metrics, setMetrics] = useState<MetricsData>();
    const [incidents, setIncidents] = useState<Incident[]>([]);

    // Real-time data subscription
    useEffect(() => {
        const ws = new WebSocket(`${process.env.NEXT_PUBLIC_API_URL}/monitoring/live/stream`);
        
        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            switch (data.type) {
                case 'metrics_update':
                    setMetrics(prev => ({ ...prev, ...data.metrics }));
                    break;
                case 'health_update':
                    setSystemHealth(data.health);
                    break;
                case 'alert_triggered':
                    setActiveAlerts(prev => [data.alert, ...prev]);
                    break;
                case 'incident_created':
                    setIncidents(prev => [data.incident, ...prev]);
                    break;
            }
        };

        return () => ws.close();
    }, []);

    return (
        <div className="monitoring-dashboard">
            {/* System Health Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
                <Card className={cn(
                    "border-l-4",
                    systemHealth?.overall_status === 'healthy' ? "border-l-green-500" :
                    systemHealth?.overall_status === 'warning' ? "border-l-yellow-500" :
                    "border-l-red-500"
                )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Heart className={cn(
                                "h-5 w-5",
                                systemHealth?.overall_status === 'healthy' ? "text-green-500" :
                                systemHealth?.overall_status === 'warning' ? "text-yellow-500" :
                                "text-red-500"
                            )} />
                            System Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold mb-2">
                            {systemHealth?.uptime_percentage.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-600 mb-4">
                            {systemHealth?.overall_status === 'healthy' ? 'All Systems Operational' :
                             systemHealth?.overall_status === 'warning' ? 'Minor Issues Detected' :
                             'Service Disruption'}
                        </div>
                        <div className="space-y-2">
                            {systemHealth?.services.map((service) => (
                                <ServiceHealthIndicator
                                    key={service.name}
                                    service={service}
                                />
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Zap className="h-5 w-5 text-blue-600" />
                            Performance
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                            {metrics?.avg_response_time_ms}ms
                        </div>
                        <div className="text-sm text-gray-600 mb-4">Average Response Time</div>
                        <div className="space-y-2">
                            <PerformanceMetric
                                label="API P95"
                                value={`${metrics?.api_response_p95}ms`}
                                threshold={2000}
                                status={metrics?.api_response_p95 < 2000 ? 'good' : 'warning'}
                            />
                            <PerformanceMetric
                                label="Page Load P95"
                                value={`${metrics?.page_load_p95}ms`}
                                threshold={3000}
                                status={metrics?.page_load_p95 < 3000 ? 'good' : 'warning'}
                            />
                            <PerformanceMetric
                                label="Database P95"
                                value={`${metrics?.db_query_p95}ms`}
                                threshold={500}
                                status={metrics?.db_query_p95 < 500 ? 'good' : 'warning'}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-purple-600" />
                            Active Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-purple-600 mb-2">
                            {metrics?.current_active_users?.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-600 mb-4">Currently Online</div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span>Suppliers</span>
                                <span className="font-medium">
                                    {metrics?.active_suppliers?.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Couples</span>
                                <span className="font-medium">
                                    {metrics?.active_couples?.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span>Peak Today</span>
                                <span className="font-medium">
                                    {metrics?.peak_users_today?.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                            Alerts
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                            {activeAlerts.length}
                        </div>
                        <div className="text-sm text-gray-600 mb-4">Active Alerts</div>
                        <div className="space-y-2 max-h-24 overflow-y-auto">
                            {activeAlerts.slice(0, 3).map((alert) => (
                                <div key={alert.id} className="flex items-center justify-between text-xs">
                                    <span className="truncate">{alert.title}</span>
                                    <Badge 
                                        variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                                        className="text-xs"
                                    >
                                        {alert.severity}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                        {activeAlerts.length > 3 && (
                            <Button variant="ghost" size="sm" className="w-full mt-2 text-xs">
                                View All {activeAlerts.length} Alerts
                            </Button>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Performance Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Response Time Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={metrics?.response_time_history}>
                                <XAxis dataKey="timestamp" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" />
                                <Tooltip />
                                <Legend />
                                <Line 
                                    type="monotone" 
                                    dataKey="p50" 
                                    stroke="#3b82f6" 
                                    name="50th Percentile"
                                />
                                <Line 
                                    type="monotone" 
                                    dataKey="p95" 
                                    stroke="#ef4444" 
                                    name="95th Percentile"
                                />
                                <ReferenceLine y={2000} stroke="#f59e0b" strokeDasharray="5 5" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Error Rate</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={metrics?.error_rate_history}>
                                <XAxis dataKey="timestamp" />
                                <YAxis domain={[0, 'dataMax']} />
                                <CartesianGrid strokeDasharray="3 3" />
                                <Tooltip />
                                <Legend />
                                <Area 
                                    type="monotone" 
                                    dataKey="error_rate" 
                                    stroke="#ef4444" 
                                    fill="#ef4444" 
                                    fillOpacity={0.3}
                                    name="Error Rate %"
                                />
                                <ReferenceLine y={1} stroke="#f59e0b" strokeDasharray="5 5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Incidents and Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Active Incidents</CardTitle>
                            <Button onClick={() => createIncident()}>
                                <Plus className="h-4 w-4 mr-2" />
                                New Incident
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <IncidentsTable 
                            incidents={incidents}
                            onUpdateStatus={updateIncidentStatus}
                            onViewDetails={viewIncidentDetails}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Recent Alerts</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AlertsTable 
                            alerts={activeAlerts}
                            onAcknowledge={acknowledgeAlert}
                            onSuppress={suppressAlert}
                            onEscalate={escalateAlert}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Business Metrics */}
            <BusinessMetricsDashboard 
                metrics={metrics?.business_metrics}
                onTimeRangeChange={updateTimeRange}
            />
        </div>
    );
};
```

### Alert Configuration Interface

```typescript
// Alert rule configuration interface
const AlertConfigurationPanel: React.FC = () => {
    const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
    const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
    const [testResults, setTestResults] = useState<TestResults | null>(null);

    const alertTemplates = [
        {
            name: 'High Error Rate',
            description: 'Alert when error rate exceeds threshold',
            condition: {
                type: 'threshold',
                metric: 'error_rate_percentage',
                operator: 'greater_than',
                value: 1,
                duration_minutes: 5
            },
            severity: 'high'
        },
        {
            name: 'Slow Response Time',
            description: 'Alert when API response time is consistently slow',
            condition: {
                type: 'threshold',
                metric: 'api_response_time_p95',
                operator: 'greater_than',
                value: 2000,
                duration_minutes: 10
            },
            severity: 'medium'
        },
        {
            name: 'Service Unavailable',
            description: 'Alert when health checks fail',
            condition: {
                type: 'absence',
                metric: 'health_check_success',
                duration_minutes: 2
            },
            severity: 'critical'
        }
    ];

    return (
        <div className="alert-configuration space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Alert Configuration</h2>
                <Button onClick={() => setEditingRule({ id: null, name: '', condition: {} } as AlertRule)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Alert Rule
                </Button>
            </div>

            {/* Alert Templates */}
            <Card>
                <CardHeader>
                    <CardTitle>Alert Templates</CardTitle>
                    <CardDescription>
                        Quick-start templates for common alerting scenarios
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {alertTemplates.map((template) => (
                            <Card
                                key={template.name}
                                className="cursor-pointer hover:border-blue-500 transition-colors"
                                onClick={() => createAlertFromTemplate(template)}
                            >
                                <CardContent className="p-4">
                                    <h3 className="font-semibold mb-2">{template.name}</h3>
                                    <p className="text-sm text-gray-600 mb-3">
                                        {template.description}
                                    </p>
                                    <Badge variant="outline">
                                        {template.severity}
                                    </Badge>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Existing Alert Rules */}
            <Card>
                <CardHeader>
                    <CardTitle>Active Alert Rules</CardTitle>
                </CardHeader>
                <CardContent>
                    <AlertRulesTable
                        rules={alertRules}
                        onEdit={setEditingRule}
                        onTest={testAlertRule}
                        onToggle={toggleAlertRule}
                        onDelete={deleteAlertRule}
                    />
                </CardContent>
            </Card>

            {/* Alert Rule Editor Modal */}
            {editingRule && (
                <AlertRuleEditor
                    rule={editingRule}
                    onSave={saveAlertRule}
                    onCancel={() => setEditingRule(null)}
                    onTest={testAlertRule}
                />
            )}

            {/* Test Results */}
            {testResults && (
                <Card>
                    <CardHeader>
                        <CardTitle>Test Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <AlertTestResults
                            results={testResults}
                            onDismiss={() => setTestResults(null)}
                        />
                    </CardContent>
                </Card>
            )}
        </div>
    );
};
```

### Business Metrics Dashboard

```typescript
// Business intelligence and metrics dashboard
const BusinessMetricsDashboard: React.FC<{ 
    metrics: BusinessMetrics;
    onTimeRangeChange: (range: string) => void;
}> = ({ metrics, onTimeRangeChange }) => {
    const [timeRange, setTimeRange] = useState<string>('24h');

    return (
        <div className="business-metrics space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Business Metrics</h3>
                <Select value={timeRange} onValueChange={(value) => {
                    setTimeRange(value);
                    onTimeRangeChange(value);
                }}>
                    <SelectTrigger className="w-32">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="1h">1 Hour</SelectItem>
                        <SelectItem value="24h">24 Hours</SelectItem>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="30d">30 Days</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Key Business Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Daily Active Users"
                    value={metrics?.dau?.toLocaleString()}
                    change={metrics?.dau_change}
                    trend={metrics?.dau_trend}
                    icon={<Users />}
                />
                <MetricCard
                    title="Form Completion Rate"
                    value={`${metrics?.form_completion_rate?.toFixed(1)}%`}
                    change={metrics?.completion_rate_change}
                    trend={metrics?.completion_trend}
                    icon={<FileCheck />}
                />
                <MetricCard
                    title="Revenue (MRR)"
                    value={`$${metrics?.mrr?.toLocaleString()}`}
                    change={metrics?.mrr_change}
                    trend={metrics?.mrr_trend}
                    icon={<DollarSign />}
                />
                <MetricCard
                    title="Churn Rate"
                    value={`${metrics?.churn_rate?.toFixed(1)}%`}
                    change={metrics?.churn_change}
                    trend={metrics?.churn_trend}
                    icon={<TrendingDown />}
                />
            </div>

            {/* User Journey Funnel */}
            <Card>
                <CardHeader>
                    <CardTitle>User Conversion Funnel</CardTitle>
                </CardHeader>
                <CardContent>
                    <UserJourneyFunnel
                        data={metrics?.conversion_funnel}
                        timeRange={timeRange}
                    />
                </CardContent>
            </Card>

            {/* Feature Adoption */}
            <Card>
                <CardHeader>
                    <CardTitle>Feature Adoption</CardTitle>
                </CardHeader>
                <CardContent>
                    <FeatureAdoptionChart
                        data={metrics?.feature_adoption}
                        onFeatureClick={viewFeatureDetails}
                    />
                </CardContent>
            </Card>
        </div>
    );
};
```

## Implementation Code Examples

### Monitoring Service Core

```typescript
// Comprehensive monitoring service implementation
export class MonitoringService {
    constructor(
        private supabase: SupabaseClient,
        private alertingService: AlertingService,
        private metricsCollector: MetricsCollector,
        private healthChecker: HealthChecker
    ) {
        this.initializeMonitoring();
    }

    private async initializeMonitoring(): Promise<void> {
        // Start health check monitoring
        setInterval(() => this.performHealthChecks(), 60000); // Every minute

        // Start metrics collection
        setInterval(() => this.collectMetrics(), 30000); // Every 30 seconds

        // Start alert evaluation
        setInterval(() => this.evaluateAlerts(), 15000); // Every 15 seconds
    }

    async collectMetrics(): Promise<void> {
        try {
            const metrics = await Promise.all([
                this.collectPerformanceMetrics(),
                this.collectBusinessMetrics(),
                this.collectUserExperienceMetrics(),
                this.collectSystemMetrics()
            ]);

            const allMetrics = metrics.flat();

            // Store metrics in batch
            await this.supabase
                .from('metrics_data')
                .insert(allMetrics);

            // Trigger real-time updates
            await this.broadcastMetricsUpdate(allMetrics);

        } catch (error) {
            console.error('Metrics collection failed:', error);
            await this.alertingService.sendAlert({
                title: 'Metrics Collection Failure',
                severity: 'high',
                description: `Failed to collect metrics: ${error.message}`
            });
        }
    }

    private async collectPerformanceMetrics(): Promise<MetricData[]> {
        const metrics = [];

        // API Performance Metrics
        const apiMetrics = await this.supabase
            .from('api_performance')
            .select('*')
            .gte('recorded_at', new Date(Date.now() - 300000).toISOString()); // Last 5 minutes

        if (apiMetrics.data) {
            const avgResponseTime = apiMetrics.data.reduce((sum, m) => sum + m.response_time_ms, 0) / apiMetrics.data.length;
            const p95ResponseTime = this.calculatePercentile(
                apiMetrics.data.map(m => m.response_time_ms), 
                95
            );
            const errorRate = (apiMetrics.data.filter(m => m.status_code >= 400).length / apiMetrics.data.length) * 100;

            metrics.push(
                {
                    metric_name: 'api_response_time_avg',
                    metric_value: avgResponseTime,
                    dimensions: { timeframe: '5min' }
                },
                {
                    metric_name: 'api_response_time_p95',
                    metric_value: p95ResponseTime,
                    dimensions: { timeframe: '5min' }
                },
                {
                    metric_name: 'api_error_rate',
                    metric_value: errorRate,
                    dimensions: { timeframe: '5min' }
                }
            );
        }

        // Database Performance Metrics
        const dbMetrics = await this.getDatabaseMetrics();
        metrics.push(
            {
                metric_name: 'database_cpu_usage',
                metric_value: dbMetrics.cpu_usage
            },
            {
                metric_name: 'database_connection_count',
                metric_value: dbMetrics.active_connections
            },
            {
                metric_name: 'database_query_time_avg',
                metric_value: dbMetrics.avg_query_time
            }
        );

        return metrics;
    }

    private async collectBusinessMetrics(): Promise<MetricData[]> {
        const metrics = [];
        const now = new Date();
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Daily Active Users
        const dauQuery = await this.supabase
            .from('user_sessions')
            .select('user_id')
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', now.toISOString());

        const dau = new Set(dauQuery.data?.map(s => s.user_id)).size;

        // New Signups Today
        const signupsQuery = await this.supabase
            .from('users')
            .select('id')
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', now.toISOString());

        const newSignups = signupsQuery.data?.length || 0;

        // Form Completions Today
        const completionsQuery = await this.supabase
            .from('form_submissions')
            .select('id')
            .eq('status', 'completed')
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', now.toISOString());

        const completions = completionsQuery.data?.length || 0;

        // Revenue Today (from subscriptions)
        const revenueQuery = await this.supabase
            .from('subscription_payments')
            .select('amount')
            .eq('status', 'succeeded')
            .gte('created_at', dayStart.toISOString())
            .lt('created_at', now.toISOString());

        const todayRevenue = revenueQuery.data?.reduce((sum, p) => sum + p.amount, 0) || 0;

        metrics.push(
            {
                metric_name: 'daily_active_users',
                metric_value: dau,
                dimensions: { date: dayStart.toISOString().split('T')[0] }
            },
            {
                metric_name: 'new_signups_today',
                metric_value: newSignups,
                dimensions: { date: dayStart.toISOString().split('T')[0] }
            },
            {
                metric_name: 'form_completions_today',
                metric_value: completions,
                dimensions: { date: dayStart.toISOString().split('T')[0] }
            },
            {
                metric_name: 'revenue_today',
                metric_value: todayRevenue / 100, // Convert cents to dollars
                dimensions: { date: dayStart.toISOString().split('T')[0] }
            }
        );

        return metrics;
    }

    async evaluateAlerts(): Promise<void> {
        const { data: alertConfigs } = await this.supabase
            .from('alert_configurations')
            .select('*')
            .eq('is_enabled', true);

        for (const config of alertConfigs || []) {
            try {
                const shouldTrigger = await this.evaluateAlertCondition(config);
                
                if (shouldTrigger) {
                    await this.triggerAlert(config, shouldTrigger);
                } else {
                    // Check if we should resolve existing alert
                    await this.checkAlertResolution(config);
                }

            } catch (error) {
                console.error(`Alert evaluation failed for ${config.alert_name}:`, error);
            }
        }
    }

    private async evaluateAlertCondition(config: AlertConfiguration): Promise<AlertTrigger | null> {
        const condition = config.condition_config;
        
        // Get recent metric data
        const { data: metricData } = await this.supabase
            .from('metrics_data')
            .select('*')
            .eq('metric_name', config.metric_name)
            .gte('timestamp', new Date(Date.now() - condition.duration_minutes * 60000).toISOString())
            .order('timestamp', { ascending: false });

        if (!metricData || metricData.length === 0) {
            return null;
        }

        switch (condition.type) {
            case 'threshold':
                return this.evaluateThresholdCondition(metricData, condition);
            case 'anomaly':
                return this.evaluateAnomalyCondition(metricData, condition);
            case 'pattern':
                return this.evaluatePatternCondition(metricData, condition);
            case 'absence':
                return this.evaluateAbsenceCondition(metricData, condition);
            default:
                return null;
        }
    }

    private evaluateThresholdCondition(
        metricData: MetricData[], 
        condition: any
    ): AlertTrigger | null {
        const values = metricData.map(m => m.metric_value);
        const avgValue = values.reduce((sum, v) => sum + v, 0) / values.length;
        const latestValue = values[0];

        let triggered = false;
        let triggerValue = latestValue;

        switch (condition.operator) {
            case 'greater_than':
                triggered = avgValue > condition.value;
                break;
            case 'less_than':
                triggered = avgValue < condition.value;
                break;
            case 'equals':
                triggered = Math.abs(avgValue - condition.value) < 0.001;
                break;
        }

        if (triggered) {
            return {
                trigger_value: triggerValue,
                trigger_reason: `${condition.operator} ${condition.value} (actual: ${avgValue.toFixed(2)})`,
                affected_dimensions: metricData[0].dimensions
            };
        }

        return null;
    }

    private async triggerAlert(
        config: AlertConfiguration, 
        trigger: AlertTrigger
    ): Promise<void> {
        const alertKey = this.generateAlertKey(config, trigger);

        // Check if alert is already firing (deduplication)
        const { data: existingAlert } = await this.supabase
            .from('alert_instances')
            .select('*')
            .eq('alert_configuration_id', config.id)
            .eq('alert_key', alertKey)
            .eq('status', 'firing')
            .single();

        if (existingAlert) {
            // Update trigger count and last triggered time
            await this.supabase
                .from('alert_instances')
                .update({
                    last_triggered_at: new Date().toISOString(),
                    trigger_count: existingAlert.trigger_count + 1,
                    trigger_value: trigger.trigger_value
                })
                .eq('id', existingAlert.id);
            return;
        }

        // Create new alert instance
        const { data: alertInstance } = await this.supabase
            .from('alert_instances')
            .insert({
                alert_configuration_id: config.id,
                alert_key: alertKey,
                trigger_value: trigger.trigger_value,
                trigger_dimensions: trigger.affected_dimensions
            })
            .select()
            .single();

        // Send notifications
        await this.alertingService.sendNotifications(config, trigger, alertInstance);

        // Check if incident should be created
        if (config.severity_level === 'critical') {
            await this.createIncidentFromAlert(config, trigger, alertInstance);
        }
    }

    private async createIncidentFromAlert(
        config: AlertConfiguration,
        trigger: AlertTrigger,
        alertInstance: AlertInstance
    ): Promise<void> {
        const incidentNumber = await this.generateIncidentNumber();

        const { data: incident } = await this.supabase
            .from('incidents')
            .insert({
                incident_number: incidentNumber,
                title: `Critical Alert: ${config.alert_name}`,
                description: `Automatically created from critical alert: ${trigger.trigger_reason}`,
                severity: this.mapAlertSeverityToIncidentSeverity(config.severity_level),
                affected_services: [config.metric_name.split('_')[0]], // Extract service from metric name
                detected_at: new Date().toISOString(),
                created_by: 'system'
            })
            .select()
            .single();

        // Link alert to incident
        await this.supabase
            .from('alert_instances')
            .update({ incident_id: incident.id })
            .eq('id', alertInstance.id);

        // Send incident notification
        await this.alertingService.sendIncidentNotification(incident);
    }
}
```

### Real-Time Alert Service

```typescript
// Real-time alerting and notification service
export class AlertingService {
    constructor(
        private supabase: SupabaseClient,
        private slackService: SlackService,
        private emailService: EmailService,
        private pagerDutyService?: PagerDutyService
    ) {}

    async sendNotifications(
        config: AlertConfiguration,
        trigger: AlertTrigger,
        alertInstance: AlertInstance
    ): Promise<void> {
        const notificationChannels = config.notification_channels;

        const notificationPromises = [];

        // Slack notifications
        if (notificationChannels.includes('slack')) {
            notificationPromises.push(
                this.sendSlackNotification(config, trigger, alertInstance)
            );
        }

        // Email notifications
        if (notificationChannels.includes('email')) {
            notificationPromises.push(
                this.sendEmailNotification(config, trigger, alertInstance)
            );
        }

        // PagerDuty for critical alerts
        if (notificationChannels.includes('pagerduty') && config.severity_level === 'critical') {
            notificationPromises.push(
                this.sendPagerDutyNotification(config, trigger, alertInstance)
            );
        }

        // Webhook notifications
        if (notificationChannels.includes('webhook') && config.webhook_url) {
            notificationPromises.push(
                this.sendWebhookNotification(config, trigger, alertInstance)
            );
        }

        await Promise.all(notificationPromises);

        // Log notification history
        await this.supabase
            .from('alert_instances')
            .update({
                notification_history: [
                    ...(alertInstance.notification_history || []),
                    {
                        sent_at: new Date().toISOString(),
                        channels: notificationChannels,
                        success: true // TODO: Track individual channel success
                    }
                ]
            })
            .eq('id', alertInstance.id);
    }

    private async sendSlackNotification(
        config: AlertConfiguration,
        trigger: AlertTrigger,
        alertInstance: AlertInstance
    ): Promise<void> {
        const color = this.getSeverityColor(config.severity_level);
        
        const message = {
            channel: '#alerts',
            attachments: [
                {
                    color,
                    title: `🚨 ${config.alert_name}`,
                    text: trigger.trigger_reason,
                    fields: [
                        {
                            title: 'Severity',
                            value: config.severity_level.toUpperCase(),
                            short: true
                        },
                        {
                            title: 'Metric',
                            value: config.metric_name,
                            short: true
                        },
                        {
                            title: 'Current Value',
                            value: trigger.trigger_value?.toString(),
                            short: true
                        },
                        {
                            title: 'Alert ID',
                            value: alertInstance.id,
                            short: true
                        }
                    ],
                    actions: [
                        {
                            type: 'button',
                            text: 'Acknowledge',
                            url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${alertInstance.id}/acknowledge`,
                            style: 'primary'
                        },
                        {
                            type: 'button',
                            text: 'View Dashboard',
                            url: `${process.env.NEXT_PUBLIC_APP_URL}/admin/monitoring`,
                        }
                    ],
                    timestamp: Math.floor(Date.now() / 1000)
                }
            ]
        };

        await this.slackService.sendMessage(message);
    }

    private async sendEmailNotification(
        config: AlertConfiguration,
        trigger: AlertTrigger,
        alertInstance: AlertInstance
    ): Promise<void> {
        const recipients = this.getAlertRecipients(config.severity_level);
        
        const subject = `[${config.severity_level.toUpperCase()}] ${config.alert_name}`;
        
        const htmlContent = `
            <h2>Alert: ${config.alert_name}</h2>
            <p><strong>Severity:</strong> ${config.severity_level}</p>
            <p><strong>Condition:</strong> ${trigger.trigger_reason}</p>
            <p><strong>Time:</strong> ${new Date().toISOString()}</p>
            <p><strong>Alert ID:</strong> ${alertInstance.id}</p>
            
            <h3>Actions</h3>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/alerts/${alertInstance.id}/acknowledge" 
               style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none;">
               Acknowledge Alert
            </a>
            <br><br>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/monitoring">
               View Monitoring Dashboard
            </a>
        `;

        await this.emailService.sendEmail({
            to: recipients,
            subject,
            html: htmlContent
        });
    }

    private getSeverityColor(severity: string): string {
        switch (severity) {
            case 'critical': return '#FF0000';
            case 'high': return '#FF8C00';
            case 'medium': return '#FFD700';
            case 'low': return '#32CD32';
            default: return '#808080';
        }
    }

    private getAlertRecipients(severity: string): string[] {
        // Configure based on severity and escalation policies
        switch (severity) {
            case 'critical':
                return ['oncall@wedsync.com', 'leadership@wedsync.com'];
            case 'high':
                return ['oncall@wedsync.com', 'engineering@wedsync.com'];
            case 'medium':
                return ['engineering@wedsync.com'];
            default:
                return ['monitoring@wedsync.com'];
        }
    }
}
```

## MCP Server Usage

### Development & Testing
- **PostgreSQL MCP**: Monitoring data schema validation, metrics data integrity, alert configuration testing
- **Supabase MCP**: Real-time monitoring subscriptions, health check automation, alert system testing
- **Playwright MCP**: End-to-end monitoring of user workflows, performance testing automation

### Real-Time Operations
- **Slack MCP**: Alert notifications, incident communications, team coordination during outages
- **Context7 MCP**: Monitoring best practices documentation, alerting pattern research

### Analytics & Optimization  
- **OpenAI MCP**: Anomaly detection enhancement, alert fatigue reduction, incident pattern analysis
- **Filesystem MCP**: Log file management, monitoring report generation, dashboard configuration backup

### Infrastructure Management
- **Vercel MCP**: Performance metrics collection, deployment monitoring, CDN analytics integration

## Navigation Integration

### Admin Dashboard Navigation
- **Monitoring Overview**: Real-time system health, active alerts, performance metrics
- **Incidents**: Incident management, timeline tracking, post-mortem documentation
- **Alerts**: Alert configuration, notification settings, escalation policies
- **Performance**: Detailed performance analytics, regression tracking, optimization insights

### Operations Navigation
- **System Health**: Service status overview, uptime tracking, dependency monitoring
- **Alert Management**: Active alerts, acknowledgment, suppression, escalation
- **Business Metrics**: KPI tracking, conversion analytics, user behavior insights

### Developer Navigation
- **Error Tracking**: Error rates, exception details, debugging information
- **Performance Monitoring**: API response times, database performance, optimization opportunities
- **Custom Dashboards**: Team-specific metrics, feature performance, development KPIs

## Testing Requirements

### Monitoring System Testing
```typescript
describe('Monitoring Service', () => {
    test('collects performance metrics accurately', async () => {
        // Generate test API requests
        const requests = await generateTestAPIRequests(100);
        
        // Wait for metrics collection
        await wait(35000); // Wait for next collection cycle
        
        const { data: metrics } = await supabase
            .from('metrics_data')
            .select('*')
            .eq('metric_name', 'api_response_time_avg')
            .gte('timestamp', new Date(Date.now() - 60000).toISOString());
            
        expect(metrics).toHaveLength(1);
        expect(metrics[0].metric_value).toBeGreaterThan(0);
        
        // Verify metric accuracy
        const actualAvg = requests.reduce((sum, r) => sum + r.responseTime, 0) / requests.length;
        expect(metrics[0].metric_value).toBeCloseTo(actualAvg, 2);
    });

    test('triggers alerts correctly', async () => {
        // Create alert configuration
        const alertConfig = await createTestAlert({
            metric_name: 'api_error_rate',
            condition: {
                type: 'threshold',
                operator: 'greater_than',
                value: 5, // 5% error rate
                duration_minutes: 2
            },
            severity_level: 'high'
        });

        // Generate high error rate
        await generateAPIErrors({ errorRate: 0.1, duration: 150000 }); // 10% errors for 2.5 minutes
        
        // Wait for alert evaluation
        await wait(20000);
        
        const { data: alertInstances } = await supabase
            .from('alert_instances')
            .select('*')
            .eq('alert_configuration_id', alertConfig.id)
            .eq('status', 'firing');
            
        expect(alertInstances).toHaveLength(1);
        expect(alertInstances[0].trigger_value).toBeGreaterThan(5);
    });

    test('prevents alert spam with deduplication', async () => {
        const alertConfig = await createTestAlert({
            metric_name: 'cpu_usage',
            condition: { type: 'threshold', operator: 'greater_than', value: 80 }
        });

        // Generate multiple high CPU events
        for (let i = 0; i < 5; i++) {
            await recordMetric('cpu_usage', 85);
            await wait(20000); // Wait for alert evaluation
        }

        const { data: alertInstances } = await supabase
            .from('alert_instances')
            .select('*')
            .eq('alert_configuration_id', alertConfig.id);
            
        // Should only create one alert instance, but update trigger count
        expect(alertInstances).toHaveLength(1);
        expect(alertInstances[0].trigger_count).toBeGreaterThan(1);
    });
});
```

### Alert Notification Testing
```typescript
describe('Alerting Service', () => {
    test('sends Slack notifications for alerts', async () => {
        const mockSlackService = jest.fn();
        const alertConfig = await createTestAlert({
            notification_channels: ['slack'],
            severity_level: 'high'
        });

        await alertingService.sendNotifications(alertConfig, mockTrigger, mockAlertInstance);

        expect(mockSlackService.sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                channel: '#alerts',
                attachments: expect.arrayContaining([
                    expect.objectContaining({
                        title: expect.stringContaining(alertConfig.alert_name),
                        color: '#FF8C00' // High severity color
                    })
                ])
            })
        );
    });

    test('escalates critical alerts to PagerDuty', async () => {
        const mockPagerDutyService = jest.fn();
        const alertConfig = await createTestAlert({
            notification_channels: ['pagerduty'],
            severity_level: 'critical'
        });

        await alertingService.sendNotifications(alertConfig, mockTrigger, mockAlertInstance);

        expect(mockPagerDutyService.createIncident).toHaveBeenCalledWith(
            expect.objectContaining({
                title: expect.stringContaining(alertConfig.alert_name),
                severity: 'critical'
            })
        );
    });

    test('creates incidents for critical alerts', async () => {
        const alertConfig = await createTestAlert({
            severity_level: 'critical'
        });

        await monitoringService.triggerAlert(alertConfig, mockTrigger);

        const { data: incidents } = await supabase
            .from('incidents')
            .select('*')
            .eq('severity', 'SEV1');
            
        expect(incidents).toHaveLength(1);
        expect(incidents[0].title).toContain(alertConfig.alert_name);
        expect(incidents[0].created_by).toBe('system');
    });
});
```

### Business Metrics Testing
```typescript
describe('Business Metrics Collection', () => {
    test('calculates daily active users correctly', async () => {
        const testUsers = await createTestUsers(50);
        
        // Create user sessions for today
        for (const user of testUsers.slice(0, 30)) {
            await createUserSession(user.id);
        }
        
        await monitoringService.collectBusinessMetrics();
        
        const { data: dauMetric } = await supabase
            .from('metrics_data')
            .select('*')
            .eq('metric_name', 'daily_active_users')
            .single();
            
        expect(dauMetric.metric_value).toBe(30);
    });

    test('tracks form completion rates', async () => {
        // Create test forms and submissions
        const testForms = await createTestForms(10);
        await createFormSubmissions(testForms, { completionRate: 0.75 });
        
        await monitoringService.collectBusinessMetrics();
        
        const { data: completionMetric } = await supabase
            .from('metrics_data')
            .select('*')
            .eq('metric_name', 'form_completions_today')
            .single();
            
        expect(completionMetric.metric_value).toBe(7.5); // 75% of 10
    });
});
```

## Acceptance Criteria

### Comprehensive Monitoring Coverage
- [ ] Performance metrics collected every 30 seconds with 99.9% reliability
- [ ] Business metrics calculated in real-time with accurate DAU, conversion rates
- [ ] Error tracking captures all frontend and backend errors with context
- [ ] Health checks monitor all critical services with 1-minute frequency
- [ ] User experience metrics include Core Web Vitals for all pages

### Intelligent Alerting System
- [ ] Alert rules evaluate conditions within 15 seconds of metric collection
- [ ] Alert deduplication prevents spam with intelligent grouping
- [ ] Notification routing delivers alerts via appropriate channels within 60 seconds
- [ ] Escalation policies automatically escalate critical alerts after 15 minutes
- [ ] Alert suppression rules prevent false positives during maintenance

### Incident Management
- [ ] Critical alerts automatically create incidents with proper context
- [ ] Incident severity mapping follows SLA response times
- [ ] Timeline tracking captures all incident events automatically
- [ ] Post-incident analysis tools support comprehensive retrospectives
- [ ] Incident resolution tracked with MTTR metrics

### Business Intelligence
- [ ] Real-time dashboards update every 30 seconds
- [ ] Business metrics accuracy within 5% of actual values
- [ ] Feature adoption tracking covers all major product features
- [ ] User journey analytics identify conversion bottlenecks
- [ ] Predictive analytics provide early churn warning indicators

### Performance & Reliability
- [ ] Monitoring system maintains 99.9% uptime
- [ ] Metrics collection overhead under 2% of total system resources
- [ ] Dashboard load times under 3 seconds
- [ ] Alert notification delivery under 60 seconds
- [ ] Historical data retention for 12 months minimum

## Dependencies

### Technical Dependencies
- **Error Tracking Service**: Sentry or equivalent for frontend/backend error capture
- **Time Series Database**: Optimized storage for metrics data with partitioning
- **Real-Time Communications**: WebSocket infrastructure for live dashboard updates
- **Notification Services**: Slack, email, PagerDuty integrations

### Data Dependencies
- **Application Instrumentation**: Comprehensive logging and metrics emission
- **User Activity Tracking**: Session management and user interaction events
- **Performance Monitoring**: API response time and database query tracking
- **Business Event Tracking**: Form submissions, user actions, revenue events

### Infrastructure Dependencies
- **High Availability Setup**: Redundant monitoring infrastructure
- **Alert Delivery Channels**: Reliable notification service integrations
- **Dashboard Hosting**: Low-latency access to real-time monitoring interfaces
- **Data Backup**: Monitoring configuration and historical data protection

## Effort Estimation

### Development Phase (4-5 weeks)
- **Core Monitoring Engine**: 2 weeks
  - Metrics collection infrastructure
  - Alert evaluation and triggering system
  - Health check automation
- **Alert Management System**: 1 week
  - Notification routing and delivery
  - Escalation policy implementation
  - Alert deduplication and suppression
- **Dashboards & Visualization**: 1.5 weeks
  - Real-time monitoring dashboard
  - Business intelligence interface
  - Incident management interface
- **Integration & Testing**: 0.5 weeks
  - Third-party service integrations
  - Alert notification testing
  - Dashboard performance optimization

### Configuration & Tuning Phase (1-2 weeks)
- **Alert Threshold Tuning**: 3 days
  - Baseline performance measurement
  - Alert sensitivity optimization
  - False positive elimination
- **Dashboard Optimization**: 2 days
  - Performance metrics refinement
  - Business intelligence accuracy validation
  - User experience improvements
- **Incident Response Setup**: 2 days
  - Escalation policy configuration
  - Runbook integration
  - Team training and documentation

**Total Estimated Effort: 5-7 weeks** (including comprehensive testing and alerting setup)

---

**Status**: Ready for Development  
**Priority**: Critical Infrastructure  
**Technical Complexity**: High  
**Business Impact**: Critical - Platform reliability and operational excellence

This comprehensive monitoring system provides complete observability into the WedSync platform with intelligent alerting, proactive incident management, and actionable business intelligence. The system ensures platform reliability through early detection, automated response, and comprehensive analytics that support both technical operations and business decision-making.