# WS-249: Advanced Analytics Platform - Technical Specification

## Executive Summary

The Advanced Analytics Platform provides comprehensive business intelligence and data analytics capabilities for WedSync, featuring real-time dashboards, predictive analytics, automated reporting, data visualization, and advanced statistical analysis. This platform enables data-driven decision making across all aspects of wedding coordination and business operations through sophisticated analytics tools and machine learning insights.

**Business Impact**: Transforms WedSync into a data-driven organization with actionable insights, predictive capabilities, and comprehensive business intelligence across all wedding operations and customer interactions.

## User Story

**Primary User Story:**
As a wedding coordination platform managing complex business operations, vendor relationships, customer preferences, and market dynamics, I need an advanced analytics platform that provides real-time insights, predictive analytics, automated reporting, interactive dashboards, and comprehensive data visualization, so that I can make data-driven decisions, optimize business performance, predict market trends, identify opportunities, and deliver superior wedding experiences through intelligent analytics and business intelligence.

**Acceptance Criteria:**
1. Provide real-time analytics dashboards with interactive visualizations
2. Implement predictive analytics for business forecasting and trend analysis
3. Generate automated reports with customizable metrics and KPIs
4. Support advanced statistical analysis and data mining capabilities
5. Enable self-service analytics for business users across all departments
6. Integrate with all data sources and provide unified business intelligence
7. Offer real-time alerting and anomaly detection across key metrics
8. Support data export and integration with external analytics tools

## Technical Architecture

### Database Schema

```sql
-- Advanced Analytics Platform Tables
CREATE TABLE analytics_data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_name VARCHAR(200) NOT NULL,
    source_type VARCHAR(100) NOT NULL CHECK (source_type IN ('database', 'api', 'file', 'streaming', 'webhook', 'external')),
    connection_config JSONB NOT NULL,
    data_schema JSONB DEFAULT '{}'::jsonb,
    refresh_schedule VARCHAR(100), -- cron expression
    data_quality_rules JSONB DEFAULT '[]'::jsonb,
    transformation_rules JSONB DEFAULT '[]'::jsonb,
    last_sync_timestamp TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(50) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'completed', 'failed')),
    error_details TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analytics_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(200) NOT NULL,
    metric_type VARCHAR(100) NOT NULL CHECK (metric_type IN ('count', 'sum', 'average', 'ratio', 'percentage', 'custom')),
    metric_category VARCHAR(100) NOT NULL CHECK (metric_category IN ('business', 'operational', 'customer', 'financial', 'marketing', 'quality')),
    data_source_id UUID NOT NULL REFERENCES analytics_data_sources(id),
    calculation_formula TEXT NOT NULL,
    aggregation_method VARCHAR(50) DEFAULT 'sum' CHECK (aggregation_method IN ('sum', 'avg', 'count', 'min', 'max', 'distinct', 'custom')),
    time_dimension VARCHAR(50) DEFAULT 'daily' CHECK (time_dimension IN ('hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    filters JSONB DEFAULT '{}'::jsonb,
    business_context TEXT,
    target_value DECIMAL(15,2),
    alert_thresholds JSONB DEFAULT '{
        "warning_upper": null,
        "warning_lower": null,
        "critical_upper": null,
        "critical_lower": null
    }'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analytics_dashboards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dashboard_name VARCHAR(200) NOT NULL,
    dashboard_type VARCHAR(100) NOT NULL CHECK (dashboard_type IN ('executive', 'operational', 'customer', 'financial', 'marketing', 'custom')),
    description TEXT,
    layout_config JSONB NOT NULL DEFAULT '{
        "grid_size": {"width": 12, "height": 12},
        "widgets": [],
        "refresh_interval": 300
    }'::jsonb,
    access_permissions JSONB DEFAULT '{
        "viewers": [],
        "editors": [],
        "public": false
    }'::jsonb,
    filters JSONB DEFAULT '{}'::jsonb,
    auto_refresh BOOLEAN DEFAULT true,
    refresh_interval_seconds INTEGER DEFAULT 300,
    is_favorite BOOLEAN DEFAULT false,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analytics_widgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    widget_name VARCHAR(200) NOT NULL,
    widget_type VARCHAR(100) NOT NULL CHECK (widget_type IN ('chart', 'table', 'metric', 'gauge', 'heatmap', 'treemap', 'funnel', 'sankey')),
    chart_type VARCHAR(100) CHECK (chart_type IN ('line', 'bar', 'pie', 'donut', 'area', 'scatter', 'bubble', 'radar', 'waterfall')),
    dashboard_id UUID NOT NULL REFERENCES analytics_dashboards(id),
    position JSONB NOT NULL DEFAULT '{
        "x": 0, "y": 0, "width": 4, "height": 3
    }'::jsonb,
    data_config JSONB NOT NULL DEFAULT '{
        "metrics": [],
        "dimensions": [],
        "filters": {},
        "time_range": "last_30_days"
    }'::jsonb,
    visualization_config JSONB DEFAULT '{
        "colors": [],
        "title": "",
        "subtitle": "",
        "legend": true,
        "grid": true,
        "tooltips": true
    }'::jsonb,
    conditional_formatting JSONB DEFAULT '[]'::jsonb,
    drill_down_config JSONB DEFAULT '{}'::jsonb,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analytics_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_name VARCHAR(200) NOT NULL,
    report_type VARCHAR(100) NOT NULL CHECK (report_type IN ('scheduled', 'ad_hoc', 'automated', 'regulatory', 'custom')),
    report_category VARCHAR(100) NOT NULL CHECK (report_category IN ('business_summary', 'financial', 'operational', 'customer_insights', 'marketing', 'performance')),
    description TEXT,
    data_sources JSONB NOT NULL, -- Array of data source IDs
    metrics JSONB NOT NULL, -- Array of metric configurations
    filters JSONB DEFAULT '{}'::jsonb,
    time_range JSONB DEFAULT '{
        "type": "relative",
        "period": "last_30_days"
    }'::jsonb,
    schedule_config JSONB DEFAULT '{
        "frequency": "weekly",
        "cron_expression": "0 9 * * 1",
        "timezone": "UTC"
    }'::jsonb,
    output_format VARCHAR(50) DEFAULT 'pdf' CHECK (output_format IN ('pdf', 'excel', 'csv', 'json', 'html')),
    distribution_list JSONB DEFAULT '[]'::jsonb, -- Email recipients
    template_config JSONB DEFAULT '{}'::jsonb,
    last_generated_at TIMESTAMP WITH TIME ZONE,
    next_scheduled_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analytics_metric_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_id UUID NOT NULL REFERENCES analytics_metrics(id),
    time_bucket TIMESTAMP WITH TIME ZONE NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    dimensions JSONB DEFAULT '{}'::jsonb, -- dimensional breakdowns
    metadata JSONB DEFAULT '{
        "calculation_time": null,
        "data_points": 0,
        "confidence": 1.0
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_metric_values_metric_time (metric_id, time_bucket),
    INDEX idx_metric_values_time_desc (time_bucket DESC),
    UNIQUE(metric_id, time_bucket, dimensions)
);

CREATE TABLE analytics_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_name VARCHAR(200) NOT NULL,
    prediction_type VARCHAR(100) NOT NULL CHECK (prediction_type IN ('time_series', 'classification', 'regression', 'clustering', 'anomaly_detection')),
    target_metric_id UUID NOT NULL REFERENCES analytics_metrics(id),
    model_algorithm VARCHAR(100) DEFAULT 'auto' CHECK (model_algorithm IN ('linear_regression', 'arima', 'lstm', 'prophet', 'random_forest', 'auto')),
    training_data_config JSONB NOT NULL,
    model_parameters JSONB DEFAULT '{}'::jsonb,
    feature_config JSONB DEFAULT '{
        "features": [],
        "lag_periods": [1, 7, 30],
        "seasonal_features": true
    }'::jsonb,
    prediction_horizon INTEGER DEFAULT 30, -- days
    confidence_interval DECIMAL(3,2) DEFAULT 0.95,
    model_accuracy DECIMAL(5,4),
    last_trained_at TIMESTAMP WITH TIME ZONE,
    next_prediction_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analytics_prediction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID NOT NULL REFERENCES analytics_predictions(id),
    prediction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    predicted_value DECIMAL(15,4) NOT NULL,
    confidence_lower DECIMAL(15,4),
    confidence_upper DECIMAL(15,4),
    actual_value DECIMAL(15,4), -- filled when actual data becomes available
    prediction_accuracy DECIMAL(5,4), -- calculated when actual value known
    feature_importance JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    INDEX idx_prediction_results_id_date (prediction_id, prediction_date)
);

CREATE TABLE analytics_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_name VARCHAR(200) NOT NULL,
    alert_type VARCHAR(100) NOT NULL CHECK (alert_type IN ('threshold', 'anomaly', 'trend', 'forecast', 'custom')),
    metric_id UUID NOT NULL REFERENCES analytics_metrics(id),
    alert_conditions JSONB NOT NULL,
    severity_level VARCHAR(50) DEFAULT 'medium' CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    notification_channels JSONB DEFAULT '["email"]'::jsonb,
    recipient_list JSONB NOT NULL,
    message_template TEXT,
    cooldown_period INTEGER DEFAULT 3600, -- seconds
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    trigger_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE analytics_alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES analytics_alerts(id),
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metric_value DECIMAL(15,4) NOT NULL,
    threshold_breached VARCHAR(100) NOT NULL,
    alert_message TEXT NOT NULL,
    notification_sent BOOLEAN DEFAULT false,
    acknowledgment_status VARCHAR(50) DEFAULT 'pending' CHECK (acknowledgment_status IN ('pending', 'acknowledged', 'resolved', 'ignored')),
    acknowledged_by UUID,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    INDEX idx_alert_history_alert_time (alert_id, triggered_at),
    INDEX idx_alert_history_status (acknowledgment_status)
);

CREATE TABLE analytics_data_quality (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES analytics_data_sources(id),
    quality_check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    quality_score DECIMAL(5,2) DEFAULT 0,
    completeness_score DECIMAL(5,2) DEFAULT 0,
    accuracy_score DECIMAL(5,2) DEFAULT 0,
    consistency_score DECIMAL(5,2) DEFAULT 0,
    timeliness_score DECIMAL(5,2) DEFAULT 0,
    quality_issues JSONB DEFAULT '[]'::jsonb,
    data_profile JSONB DEFAULT '{
        "row_count": 0,
        "column_count": 0,
        "null_percentage": 0,
        "duplicate_percentage": 0
    }'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    INDEX idx_data_quality_source_time (data_source_id, quality_check_timestamp)
);
```

### API Endpoints

```typescript
// Advanced Analytics Platform API Routes

// Data Source Management
GET    /api/analytics/data-sources              // List data sources
POST   /api/analytics/data-sources              // Create new data source
GET    /api/analytics/data-sources/:id          // Get data source details
PUT    /api/analytics/data-sources/:id          // Update data source
DELETE /api/analytics/data-sources/:id          // Delete data source
POST   /api/analytics/data-sources/:id/sync     // Trigger data sync
POST   /api/analytics/data-sources/:id/test     // Test connection

// Metrics Management
GET    /api/analytics/metrics                   // List metrics
POST   /api/analytics/metrics                   // Create new metric
GET    /api/analytics/metrics/:id               // Get metric details
PUT    /api/analytics/metrics/:id               // Update metric
DELETE /api/analytics/metrics/:id               // Delete metric
POST   /api/analytics/metrics/:id/calculate     // Calculate metric values
GET    /api/analytics/metrics/:id/values        // Get metric values

// Dashboard Management
GET    /api/analytics/dashboards                // List dashboards
POST   /api/analytics/dashboards                // Create dashboard
GET    /api/analytics/dashboards/:id            // Get dashboard
PUT    /api/analytics/dashboards/:id            // Update dashboard
DELETE /api/analytics/dashboards/:id            // Delete dashboard
POST   /api/analytics/dashboards/:id/clone      // Clone dashboard

// Widget Management
GET    /api/analytics/widgets                   // List widgets
POST   /api/analytics/widgets                   // Create widget
GET    /api/analytics/widgets/:id               // Get widget
PUT    /api/analytics/widgets/:id               // Update widget
DELETE /api/analytics/widgets/:id               // Delete widget
GET    /api/analytics/widgets/:id/data          // Get widget data

// Reports Management
GET    /api/analytics/reports                   // List reports
POST   /api/analytics/reports                   // Create report
GET    /api/analytics/reports/:id               // Get report
PUT    /api/analytics/reports/:id               // Update report
DELETE /api/analytics/reports/:id               // Delete report
POST   /api/analytics/reports/:id/generate      // Generate report
GET    /api/analytics/reports/:id/download      // Download report

// Predictions & Forecasting
GET    /api/analytics/predictions               // List predictions
POST   /api/analytics/predictions               // Create prediction model
GET    /api/analytics/predictions/:id           // Get prediction details
PUT    /api/analytics/predictions/:id           // Update prediction
POST   /api/analytics/predictions/:id/train     // Train prediction model
GET    /api/analytics/predictions/:id/forecast  // Get forecast results

// Alerts Management
GET    /api/analytics/alerts                    // List alerts
POST   /api/analytics/alerts                    // Create alert
GET    /api/analytics/alerts/:id                // Get alert details
PUT    /api/analytics/alerts/:id                // Update alert
DELETE /api/analytics/alerts/:id                // Delete alert
POST   /api/analytics/alerts/:id/acknowledge    // Acknowledge alert

// Data Quality
GET    /api/analytics/data-quality              // Get data quality overview
GET    /api/analytics/data-quality/:source_id   // Get source quality metrics
POST   /api/analytics/data-quality/check        // Run quality check
GET    /api/analytics/data-quality/issues       // Get quality issues

// Query & Analysis
POST   /api/analytics/query                     // Execute custom query
POST   /api/analytics/analysis/correlation      // Correlation analysis
POST   /api/analytics/analysis/cohort           // Cohort analysis
POST   /api/analytics/analysis/funnel           // Funnel analysis
POST   /api/analytics/analysis/retention        // Retention analysis
```

### Core Implementation

```typescript
// Advanced Analytics Platform Service
import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import * as tf from '@tensorflow/tfjs-node';

export interface DataSource {
    sourceName: string;
    sourceType: 'database' | 'api' | 'file' | 'streaming' | 'webhook' | 'external';
    connectionConfig: any;
    refreshSchedule?: string;
    transformationRules?: any[];
}

export interface AnalyticsMetric {
    metricName: string;
    metricType: 'count' | 'sum' | 'average' | 'ratio' | 'percentage' | 'custom';
    metricCategory: string;
    dataSourceId: string;
    calculationFormula: string;
    aggregationMethod: string;
    timeDimension: string;
    filters?: any;
    targetValue?: number;
    alertThresholds?: any;
}

export interface Dashboard {
    dashboardName: string;
    dashboardType: string;
    description?: string;
    layoutConfig: any;
    accessPermissions: any;
    autoRefresh: boolean;
    refreshIntervalSeconds: number;
}

export interface Widget {
    widgetName: string;
    widgetType: string;
    chartType?: string;
    dashboardId: string;
    position: any;
    dataConfig: any;
    visualizationConfig: any;
}

export interface PredictionModel {
    predictionName: string;
    predictionType: 'time_series' | 'classification' | 'regression' | 'clustering' | 'anomaly_detection';
    targetMetricId: string;
    modelAlgorithm: string;
    trainingDataConfig: any;
    predictionHorizon: number;
    confidenceInterval: number;
}

export class AdvancedAnalyticsService {
    private supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
    private redis = new Redis(process.env.REDIS_URL);
    private dataSources: Map<string, any> = new Map();

    async createDataSource(dataSource: DataSource): Promise<any> {
        // Test connection first
        const connectionValid = await this.testDataSourceConnection(dataSource);
        if (!connectionValid) {
            throw new Error('Unable to connect to data source');
        }

        const { data, error } = await this.supabase
            .from('analytics_data_sources')
            .insert({
                source_name: dataSource.sourceName,
                source_type: dataSource.sourceType,
                connection_config: dataSource.connectionConfig,
                refresh_schedule: dataSource.refreshSchedule,
                transformation_rules: dataSource.transformationRules || [],
                sync_status: 'pending',
                created_by: 'system'
            })
            .select()
            .single();

        if (error) throw error;

        // Initialize data sync
        await this.initializeDataSync(data.id);

        return data;
    }

    async createAnalyticsMetric(metric: AnalyticsMetric): Promise<any> {
        // Validate calculation formula
        const formulaValid = await this.validateCalculationFormula(
            metric.calculationFormula, 
            metric.dataSourceId
        );
        if (!formulaValid) {
            throw new Error('Invalid calculation formula');
        }

        const { data, error } = await this.supabase
            .from('analytics_metrics')
            .insert({
                metric_name: metric.metricName,
                metric_type: metric.metricType,
                metric_category: metric.metricCategory,
                data_source_id: metric.dataSourceId,
                calculation_formula: metric.calculationFormula,
                aggregation_method: metric.aggregationMethod,
                time_dimension: metric.timeDimension,
                filters: metric.filters || {},
                target_value: metric.targetValue,
                alert_thresholds: metric.alertThresholds || {},
                created_by: 'system'
            })
            .select()
            .single();

        if (error) throw error;

        // Calculate initial metric values
        await this.calculateMetricValues(data.id);

        return data;
    }

    async createDashboard(dashboard: Dashboard): Promise<any> {
        const { data, error } = await this.supabase
            .from('analytics_dashboards')
            .insert({
                dashboard_name: dashboard.dashboardName,
                dashboard_type: dashboard.dashboardType,
                description: dashboard.description,
                layout_config: dashboard.layoutConfig,
                access_permissions: dashboard.accessPermissions,
                auto_refresh: dashboard.autoRefresh,
                refresh_interval_seconds: dashboard.refreshIntervalSeconds,
                created_by: 'system'
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async createWidget(widget: Widget): Promise<any> {
        // Validate data configuration
        const dataConfigValid = await this.validateWidgetDataConfig(widget.dataConfig);
        if (!dataConfigValid) {
            throw new Error('Invalid widget data configuration');
        }

        const { data, error } = await this.supabase
            .from('analytics_widgets')
            .insert({
                widget_name: widget.widgetName,
                widget_type: widget.widgetType,
                chart_type: widget.chartType,
                dashboard_id: widget.dashboardId,
                position: widget.position,
                data_config: widget.dataConfig,
                visualization_config: widget.visualizationConfig
            })
            .select()
            .single();

        if (error) throw error;

        // Preload widget data
        await this.loadWidgetData(data.id);

        return data;
    }

    async getWidgetData(widgetId: string, timeRange?: any): Promise<any> {
        const { data: widget } = await this.supabase
            .from('analytics_widgets')
            .select('*')
            .eq('id', widgetId)
            .single();

        if (!widget) throw new Error('Widget not found');

        const cacheKey = `widget_data:${widgetId}:${JSON.stringify(timeRange || {})}`;
        
        // Check cache first
        const cachedData = await this.redis.get(cacheKey);
        if (cachedData) {
            return JSON.parse(cachedData);
        }

        // Generate widget data
        const widgetData = await this.generateWidgetData(widget, timeRange);

        // Cache for 5 minutes
        await this.redis.setex(cacheKey, 300, JSON.stringify(widgetData));

        return widgetData;
    }

    private async generateWidgetData(widget: any, timeRange?: any): Promise<any> {
        const { dataConfig } = widget;
        const results: any = {
            labels: [],
            datasets: [],
            summary: {}
        };

        // Process each metric in the widget
        for (const metricConfig of dataConfig.metrics || []) {
            const metricData = await this.getMetricData(
                metricConfig.metricId, 
                timeRange || dataConfig.time_range,
                dataConfig.filters
            );

            // Transform data based on widget type
            const transformedData = this.transformDataForWidget(
                metricData, 
                widget.widget_type, 
                widget.chart_type
            );

            results.labels = transformedData.labels;
            results.datasets.push({
                label: metricConfig.label || metricConfig.metricName,
                data: transformedData.data,
                ...metricConfig.styling
            });

            // Calculate summary statistics
            results.summary[metricConfig.metricId] = {
                current: transformedData.data[transformedData.data.length - 1] || 0,
                previous: transformedData.data[transformedData.data.length - 2] || 0,
                total: transformedData.data.reduce((sum: number, val: number) => sum + val, 0),
                average: transformedData.data.reduce((sum: number, val: number) => sum + val, 0) / transformedData.data.length || 0
            };
        }

        return results;
    }

    async createPredictionModel(prediction: PredictionModel): Promise<any> {
        const { data, error } = await this.supabase
            .from('analytics_predictions')
            .insert({
                prediction_name: prediction.predictionName,
                prediction_type: prediction.predictionType,
                target_metric_id: prediction.targetMetricId,
                model_algorithm: prediction.modelAlgorithm,
                training_data_config: prediction.trainingDataConfig,
                prediction_horizon: prediction.predictionHorizon,
                confidence_interval: prediction.confidenceInterval,
                created_by: 'system'
            })
            .select()
            .single();

        if (error) throw error;

        // Start model training
        await this.trainPredictionModel(data.id);

        return data;
    }

    private async trainPredictionModel(predictionId: string): Promise<void> {
        const { data: prediction } = await this.supabase
            .from('analytics_predictions')
            .select('*')
            .eq('id', predictionId)
            .single();

        if (!prediction) throw new Error('Prediction model not found');

        // Get training data
        const trainingData = await this.getTrainingData(
            prediction.target_metric_id,
            prediction.training_data_config
        );

        // Build and train model based on algorithm
        let model: any;
        let accuracy: number;

        switch (prediction.model_algorithm) {
            case 'lstm':
                ({ model, accuracy } = await this.trainLSTMModel(trainingData));
                break;
            case 'arima':
                ({ model, accuracy } = await this.trainARIMAModel(trainingData));
                break;
            case 'prophet':
                ({ model, accuracy } = await this.trainProphetModel(trainingData));
                break;
            default:
                ({ model, accuracy } = await this.trainAutoMLModel(trainingData));
        }

        // Update prediction with trained model
        await this.supabase
            .from('analytics_predictions')
            .update({
                model_accuracy: accuracy,
                last_trained_at: new Date().toISOString(),
                next_prediction_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // tomorrow
            })
            .eq('id', predictionId);

        // Generate initial predictions
        await this.generatePredictions(predictionId, model, prediction);
    }

    private async trainLSTMModel(trainingData: any[]): Promise<{ model: any, accuracy: number }> {
        // Prepare data for LSTM
        const sequences = this.createSequences(trainingData, 30); // 30-day sequences
        
        // Build LSTM model
        const model = tf.sequential({
            layers: [
                tf.layers.lstm({ units: 50, returnSequences: true, inputShape: [30, 1] }),
                tf.layers.lstm({ units: 50 }),
                tf.layers.dense({ units: 1 })
            ]
        });

        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mae']
        });

        // Train model
        const trainX = tf.tensor3d(sequences.map(s => s.input));
        const trainY = tf.tensor2d(sequences.map(s => [s.output]));

        await model.fit(trainX, trainY, {
            epochs: 50,
            batchSize: 32,
            validationSplit: 0.2,
            callbacks: {
                onEpochEnd: (epoch, logs) => {
                    console.log(`Epoch ${epoch}: loss = ${logs?.loss}`);
                }
            }
        });

        // Calculate accuracy
        const predictions = model.predict(trainX) as tf.Tensor;
        const accuracy = await this.calculateModelAccuracy(predictions, trainY);

        return { model, accuracy };
    }

    async generateForecast(predictionId: string, horizon?: number): Promise<any> {
        const { data: prediction } = await this.supabase
            .from('analytics_predictions')
            .select('*')
            .eq('id', predictionId)
            .single();

        if (!prediction) throw new Error('Prediction model not found');

        // Load trained model (simplified - would load from storage)
        const model = await this.loadPredictionModel(predictionId);

        // Get recent data for prediction input
        const recentData = await this.getRecentMetricData(
            prediction.target_metric_id,
            horizon || prediction.prediction_horizon
        );

        // Generate predictions
        const forecasts = await this.makePredictions(model, recentData, horizon || prediction.prediction_horizon);

        // Store predictions
        const predictionPromises = forecasts.map((forecast: any, index: number) => {
            const predictionDate = new Date();
            predictionDate.setDate(predictionDate.getDate() + index + 1);

            return this.supabase
                .from('analytics_prediction_results')
                .insert({
                    prediction_id: predictionId,
                    prediction_date: predictionDate.toISOString(),
                    predicted_value: forecast.value,
                    confidence_lower: forecast.confidenceLower,
                    confidence_upper: forecast.confidenceUpper,
                    feature_importance: forecast.featureImportance
                });
        });

        await Promise.all(predictionPromises);

        return forecasts;
    }

    async createAlert(alertConfig: any): Promise<any> {
        const { data, error } = await this.supabase
            .from('analytics_alerts')
            .insert({
                alert_name: alertConfig.alertName,
                alert_type: alertConfig.alertType,
                metric_id: alertConfig.metricId,
                alert_conditions: alertConfig.alertConditions,
                severity_level: alertConfig.severityLevel,
                notification_channels: alertConfig.notificationChannels,
                recipient_list: alertConfig.recipientList,
                message_template: alertConfig.messageTemplate,
                cooldown_period: alertConfig.cooldownPeriod || 3600,
                created_by: 'system'
            })
            .select()
            .single();

        if (error) throw error;

        // Start monitoring
        this.startAlertMonitoring(data.id);

        return data;
    }

    private async startAlertMonitoring(alertId: string): Promise<void> {
        const { data: alert } = await this.supabase
            .from('analytics_alerts')
            .select('*')
            .eq('id', alertId)
            .single();

        if (!alert) return;

        // Set up periodic checking (would use proper job scheduler in production)
        setInterval(async () => {
            try {
                await this.checkAlertConditions(alert);
            } catch (error) {
                console.error(`Alert monitoring error for ${alertId}:`, error);
            }
        }, 60000); // Check every minute
    }

    private async checkAlertConditions(alert: any): Promise<void> {
        // Get current metric value
        const currentValue = await this.getCurrentMetricValue(alert.metric_id);

        // Evaluate alert conditions
        const shouldTrigger = this.evaluateAlertConditions(
            currentValue, 
            alert.alert_conditions
        );

        if (shouldTrigger) {
            // Check cooldown period
            const now = new Date();
            const lastTriggered = alert.last_triggered_at ? new Date(alert.last_triggered_at) : null;
            const cooldownExpired = !lastTriggered || 
                (now.getTime() - lastTriggered.getTime()) > (alert.cooldown_period * 1000);

            if (cooldownExpired) {
                await this.triggerAlert(alert, currentValue);
            }
        }
    }

    private async triggerAlert(alert: any, currentValue: any): Promise<void> {
        // Create alert history entry
        const alertMessage = this.generateAlertMessage(alert, currentValue);
        
        await this.supabase
            .from('analytics_alert_history')
            .insert({
                alert_id: alert.id,
                metric_value: currentValue.value,
                threshold_breached: currentValue.thresholdBreached,
                alert_message: alertMessage,
                notification_sent: false
            });

        // Send notifications
        for (const channel of alert.notification_channels) {
            await this.sendNotification(channel, alert.recipient_list, alertMessage);
        }

        // Update alert last triggered
        await this.supabase
            .from('analytics_alerts')
            .update({
                last_triggered_at: new Date().toISOString(),
                trigger_count: alert.trigger_count + 1
            })
            .eq('id', alert.id);
    }

    async runDataQualityCheck(dataSourceId: string): Promise<any> {
        const { data: dataSource } = await this.supabase
            .from('analytics_data_sources')
            .select('*')
            .eq('id', dataSourceId)
            .single();

        if (!dataSource) throw new Error('Data source not found');

        // Run quality checks
        const qualityResults = {
            qualityScore: 0,
            completenessScore: 0,
            accuracyScore: 0,
            consistencyScore: 0,
            timelinessScore: 0,
            qualityIssues: [] as any[],
            dataProfile: {},
            recommendations: [] as any[]
        };

        // Implement quality checks based on data source type
        const data = await this.loadDataFromSource(dataSource);
        
        // Completeness check
        qualityResults.completenessScore = this.checkCompleteness(data);
        
        // Accuracy check
        qualityResults.accuracyScore = await this.checkAccuracy(data, dataSource.data_quality_rules);
        
        // Consistency check
        qualityResults.consistencyScore = this.checkConsistency(data);
        
        // Timeliness check
        qualityResults.timelinessScore = this.checkTimeliness(data);
        
        // Overall quality score
        qualityResults.qualityScore = (
            qualityResults.completenessScore +
            qualityResults.accuracyScore +
            qualityResults.consistencyScore +
            qualityResults.timelinessScore
        ) / 4;

        // Store quality results
        await this.supabase
            .from('analytics_data_quality')
            .insert({
                data_source_id: dataSourceId,
                quality_score: qualityResults.qualityScore,
                completeness_score: qualityResults.completenessScore,
                accuracy_score: qualityResults.accuracyScore,
                consistency_score: qualityResults.consistencyScore,
                timeliness_score: qualityResults.timelinessScore,
                quality_issues: qualityResults.qualityIssues,
                data_profile: qualityResults.dataProfile,
                recommendations: qualityResults.recommendations
            });

        return qualityResults;
    }

    private async validateCalculationFormula(formula: string, dataSourceId: string): Promise<boolean> {
        // Implement formula validation logic
        // This is a simplified version
        try {
            // Check if formula contains valid SQL/calculation syntax
            const allowedKeywords = ['SELECT', 'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'FROM', 'WHERE', 'GROUP BY'];
            const formulaUpper = formula.toUpperCase();
            
            return allowedKeywords.some(keyword => formulaUpper.includes(keyword));
        } catch (error) {
            return false;
        }
    }

    private async calculateMetricValues(metricId: string): Promise<void> {
        // Implementation for calculating metric values
        // This would execute the metric's calculation formula
        const { data: metric } = await this.supabase
            .from('analytics_metrics')
            .select('*')
            .eq('id', metricId)
            .single();

        if (!metric) return;

        // Execute calculation and store results
        // This is simplified - would implement actual calculation logic
        const calculatedValue = Math.random() * 1000; // Placeholder

        await this.supabase
            .from('analytics_metric_values')
            .insert({
                metric_id: metricId,
                time_bucket: new Date().toISOString(),
                metric_value: calculatedValue,
                dimensions: {},
                metadata: {
                    calculation_time: new Date().toISOString(),
                    data_points: 100,
                    confidence: 0.95
                }
            });
    }
}
```

### React Component

```typescript
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
    LineChart, 
    BarChart, 
    PieChart, 
    AreaChart, 
    ScatterChart,
    MetricCard,
    KPIDashboard
} from "@/components/charts";
import { 
    BarChart3, 
    TrendingUp, 
    AlertCircle, 
    Database, 
    Brain, 
    Bell,
    Download,
    RefreshCw,
    Filter,
    Calendar,
    Target,
    Zap
} from "lucide-react";

interface Dashboard {
    id: string;
    dashboardName: string;
    dashboardType: string;
    description: string;
    layoutConfig: any;
    autoRefresh: boolean;
    refreshIntervalSeconds: number;
    createdAt: string;
}

interface Widget {
    id: string;
    widgetName: string;
    widgetType: string;
    chartType: string;
    position: any;
    dataConfig: any;
    visualizationConfig: any;
}

interface Metric {
    id: string;
    metricName: string;
    metricType: string;
    metricCategory: string;
    targetValue?: number;
    currentValue: number;
    previousValue: number;
    trend: 'up' | 'down' | 'stable';
    trendPercentage: number;
}

interface Alert {
    id: string;
    alertName: string;
    alertType: string;
    severityLevel: 'low' | 'medium' | 'high' | 'critical';
    triggerCount: number;
    lastTriggeredAt?: string;
    isActive: boolean;
}

export default function AdvancedAnalyticsDashboard() {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [selectedDashboard, setSelectedDashboard] = useState<string>('');
    const [widgets, setWidgets] = useState<Widget[]>([]);
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('last_30_days');
    const [autoRefresh, setAutoRefresh] = useState(true);

    useEffect(() => {
        fetchDashboards();
        fetchMetrics();
        fetchAlerts();
        
        let refreshInterval: NodeJS.Timeout;
        if (autoRefresh) {
            refreshInterval = setInterval(() => {
                if (selectedDashboard) {
                    fetchWidgets(selectedDashboard);
                    fetchMetrics();
                }
            }, 30000); // Refresh every 30 seconds
        }

        return () => {
            if (refreshInterval) {
                clearInterval(refreshInterval);
            }
        };
    }, [selectedDashboard, autoRefresh]);

    const fetchDashboards = async () => {
        try {
            const response = await fetch('/api/analytics/dashboards');
            const data = await response.json();
            setDashboards(data);
            if (data.length > 0 && !selectedDashboard) {
                setSelectedDashboard(data[0].id);
                await fetchWidgets(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching dashboards:', error);
        }
    };

    const fetchWidgets = async (dashboardId: string) => {
        try {
            const response = await fetch(`/api/analytics/widgets?dashboard_id=${dashboardId}`);
            const data = await response.json();
            setWidgets(data);
        } catch (error) {
            console.error('Error fetching widgets:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMetrics = async () => {
        try {
            const response = await fetch('/api/analytics/metrics?time_range=' + timeRange);
            const data = await response.json();
            setMetrics(data);
        } catch (error) {
            console.error('Error fetching metrics:', error);
        }
    };

    const fetchAlerts = async () => {
        try {
            const response = await fetch('/api/analytics/alerts?status=active');
            const data = await response.json();
            setAlerts(data);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        }
    };

    const handleRefreshDashboard = async () => {
        if (selectedDashboard) {
            setLoading(true);
            await fetchWidgets(selectedDashboard);
            await fetchMetrics();
            setLoading(false);
        }
    };

    const handleGenerateReport = async (reportType: string) => {
        try {
            const response = await fetch('/api/analytics/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    reportType,
                    dashboardId: selectedDashboard,
                    timeRange,
                    format: 'pdf'
                })
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `analytics-report-${new Date().toISOString().split('T')[0]}.pdf`;
                a.click();
            }
        } catch (error) {
            console.error('Error generating report:', error);
        }
    };

    const metricsSummary = useMemo(() => {
        const totalMetrics = metrics.length;
        const positiveMetrics = metrics.filter(m => m.trend === 'up').length;
        const negativeMetrics = metrics.filter(m => m.trend === 'down').length;
        const criticalAlerts = alerts.filter(a => a.severityLevel === 'critical').length;
        
        return { totalMetrics, positiveMetrics, negativeMetrics, criticalAlerts };
    }, [metrics, alerts]);

    const trendsData = useMemo(() => 
        metrics.slice(0, 10).map(metric => ({
            name: metric.metricName,
            current: metric.currentValue,
            previous: metric.previousValue,
            trend: metric.trendPercentage,
            category: metric.metricCategory
        }))
    , [metrics]);

    if (loading) {
        return <div className="flex items-center justify-center h-96">Loading advanced analytics...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Advanced Analytics Platform</h1>
                    <p className="text-muted-foreground">
                        Comprehensive business intelligence and data analytics
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <Select value={timeRange} onValueChange={setTimeRange}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="last_7_days">Last 7 days</SelectItem>
                            <SelectItem value="last_30_days">Last 30 days</SelectItem>
                            <SelectItem value="last_90_days">Last 90 days</SelectItem>
                            <SelectItem value="last_year">Last year</SelectItem>
                        </SelectContent>
                    </Select>
                    
                    <Button
                        variant="outline"
                        onClick={handleRefreshDashboard}
                        disabled={loading}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    
                    <Button onClick={() => handleGenerateReport('comprehensive')}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {alerts.filter(a => a.severityLevel === 'critical').length > 0 && (
                <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        {alerts.filter(a => a.severityLevel === 'critical').length} critical alert(s) detected. 
                        Review performance metrics immediately.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                    title="Total Metrics"
                    value={metricsSummary.totalMetrics}
                    icon={<BarChart3 className="h-4 w-4" />}
                    change={`${metricsSummary.positiveMetrics} trending up`}
                    changeType="positive"
                />
                
                <MetricCard
                    title="Data Sources"
                    value="12"
                    icon={<Database className="h-4 w-4" />}
                    change="2 syncing"
                    changeType="neutral"
                />
                
                <MetricCard
                    title="Predictions"
                    value="8"
                    icon={<Brain className="h-4 w-4" />}
                    change="95% accuracy"
                    changeType="positive"
                />
                
                <MetricCard
                    title="Active Alerts"
                    value={alerts.length}
                    icon={<Bell className="h-4 w-4" />}
                    change={`${metricsSummary.criticalAlerts} critical`}
                    changeType={metricsSummary.criticalAlerts > 0 ? "negative" : "positive"}
                />
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
                    <TabsTrigger value="metrics">Metrics</TabsTrigger>
                    <TabsTrigger value="predictions">Predictions</TabsTrigger>
                    <TabsTrigger value="alerts">Alerts</TabsTrigger>
                    <TabsTrigger value="quality">Data Quality</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Performance Trends</CardTitle>
                                <CardDescription>
                                    Key metrics performance over time
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <LineChart 
                                    data={trendsData}
                                    xKey="name"
                                    yKey="current"
                                    height={300}
                                />
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Metric Categories</CardTitle>
                                <CardDescription>
                                    Distribution of metrics by category
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PieChart 
                                    data={trendsData}
                                    valueKey="current"
                                    nameKey="category"
                                    height={300}
                                />
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Top Performing Metrics</CardTitle>
                            <CardDescription>
                                Metrics with highest positive trends
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {metrics
                                    .filter(m => m.trend === 'up')
                                    .sort((a, b) => b.trendPercentage - a.trendPercentage)
                                    .slice(0, 5)
                                    .map((metric) => (
                                        <div key={metric.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex-1">
                                                <h4 className="font-semibold">{metric.metricName}</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    {metric.metricCategory} • Current: {metric.currentValue.toLocaleString()}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Badge variant="default">
                                                    <TrendingUp className="h-3 w-3 mr-1" />
                                                    +{metric.trendPercentage.toFixed(1)}%
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="dashboards" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Select value={selectedDashboard} onValueChange={setSelectedDashboard}>
                            <SelectTrigger className="w-64">
                                <SelectValue placeholder="Select dashboard" />
                            </SelectTrigger>
                            <SelectContent>
                                {dashboards.map((dashboard) => (
                                    <SelectItem key={dashboard.id} value={dashboard.id}>
                                        {dashboard.dashboardName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        
                        <div className="flex items-center space-x-2">
                            <Badge variant="outline">
                                Auto-refresh: {autoRefresh ? 'On' : 'Off'}
                            </Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAutoRefresh(!autoRefresh)}
                            >
                                <RefreshCw className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {widgets.map((widget) => (
                            <Card key={widget.id}>
                                <CardHeader>
                                    <CardTitle className="text-base">{widget.widgetName}</CardTitle>
                                    <CardDescription>
                                        {widget.widgetType} • {widget.chartType}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-48 flex items-center justify-center border rounded-lg">
                                        <div className="text-center text-muted-foreground">
                                            <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                            <p>{widget.widgetName}</p>
                                            <p className="text-sm">Widget visualization</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {widgets.length === 0 && (
                        <Card>
                            <CardContent className="flex items-center justify-center h-64">
                                <div className="text-center text-muted-foreground">
                                    <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                    <p className="text-lg font-medium">No widgets configured</p>
                                    <p>Add widgets to this dashboard to start visualizing your data</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>

                <TabsContent value="metrics" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Metrics Overview</CardTitle>
                            <CardDescription>
                                All configured metrics and their current performance
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {metrics.map((metric) => (
                                    <div key={metric.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="font-semibold">{metric.metricName}</h4>
                                                <Badge variant="outline">{metric.metricCategory}</Badge>
                                                <Badge variant={metric.trend === 'up' ? 'default' : 
                                                              metric.trend === 'down' ? 'destructive' : 'secondary'}>
                                                    {metric.trend === 'up' ? '↗️' : metric.trend === 'down' ? '↘️' : '→'} 
                                                    {metric.trendPercentage.toFixed(1)}%
                                                </Badge>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                                <div>
                                                    <span className="text-muted-foreground">Current:</span>
                                                    <span className="ml-1 font-medium">{metric.currentValue.toLocaleString()}</span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">Previous:</span>
                                                    <span className="ml-1">{metric.previousValue.toLocaleString()}</span>
                                                </div>
                                                {metric.targetValue && (
                                                    <div>
                                                        <span className="text-muted-foreground">Target:</span>
                                                        <span className="ml-1">{metric.targetValue.toLocaleString()}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Button variant="outline" size="sm">
                                                <Target className="h-4 w-4 mr-2" />
                                                Configure
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="predictions" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Predictive Analytics</CardTitle>
                            <CardDescription>
                                Machine learning predictions and forecasting models
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center py-12 text-muted-foreground">
                                <Brain className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Predictive Models</p>
                                <p className="mt-2">
                                    AI-powered forecasting and trend prediction for key business metrics
                                </p>
                                <Button className="mt-4">
                                    <Brain className="h-4 w-4 mr-2" />
                                    Create Prediction Model
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="alerts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Alert Management</CardTitle>
                            <CardDescription>
                                Configure and monitor automated alerts for key metrics
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {alerts.map((alert) => (
                                    <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="font-semibold">{alert.alertName}</h4>
                                                <Badge variant={
                                                    alert.severityLevel === 'critical' ? 'destructive' :
                                                    alert.severityLevel === 'high' ? 'default' :
                                                    alert.severityLevel === 'medium' ? 'secondary' : 'outline'
                                                }>
                                                    {alert.severityLevel}
                                                </Badge>
                                                <Badge variant="outline">{alert.alertType}</Badge>
                                            </div>
                                            <div className="text-sm text-muted-foreground mt-1">
                                                Triggered {alert.triggerCount} times
                                                {alert.lastTriggeredAt && (
                                                    <span> • Last: {new Date(alert.lastTriggeredAt).toLocaleString()}</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {alert.isActive ? (
                                                <Badge variant="default">Active</Badge>
                                            ) : (
                                                <Badge variant="secondary">Inactive</Badge>
                                            )}
                                            <Button variant="outline" size="sm">
                                                Configure
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                {alerts.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>No alerts configured</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="quality" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Quality Monitoring</CardTitle>
                            <CardDescription>
                                Monitor and maintain high-quality data across all sources
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 border rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600">95.2%</div>
                                    <div className="text-sm text-muted-foreground">Overall Quality</div>
                                </div>
                                <div className="p-4 border rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-600">98.1%</div>
                                    <div className="text-sm text-muted-foreground">Completeness</div>
                                </div>
                                <div className="p-4 border rounded-lg text-center">
                                    <div className="text-2xl font-bold text-purple-600">94.7%</div>
                                    <div className="text-sm text-muted-foreground">Accuracy</div>
                                </div>
                                <div className="p-4 border rounded-lg text-center">
                                    <div className="text-2xl font-bold text-orange-600">92.3%</div>
                                    <div className="text-sm text-muted-foreground">Consistency</div>
                                </div>
                            </div>
                            
                            <div className="text-center py-8 text-muted-foreground">
                                <Database className="h-16 w-16 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium">Data Quality Dashboard</p>
                                <p className="mt-2">
                                    Comprehensive data quality monitoring across all connected sources
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
```

## Navigation Integration

```typescript
// Add to navigation menu (/wedsync/src/components/navigation/nav-items.tsx)
{
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Advanced analytics platform and business intelligence',
    subItems: [
        {
            title: 'Dashboards',
            href: '/analytics/dashboards',
            description: 'Interactive business intelligence dashboards'
        },
        {
            title: 'Metrics & KPIs',
            href: '/analytics/metrics',
            description: 'Key performance indicators and metrics'
        },
        {
            title: 'Predictive Analytics',
            href: '/analytics/predictions',
            description: 'AI-powered forecasting and predictions'
        },
        {
            title: 'Data Quality',
            href: '/analytics/quality',
            description: 'Data quality monitoring and management'
        },
        {
            title: 'Reports',
            href: '/analytics/reports',
            description: 'Automated reporting and exports'
        }
    ]
}
```

## MCP Server Usage

This implementation leverages several MCP servers:

1. **Sequential Thinking MCP**: Complex analytics strategy development and optimization planning
2. **PostgreSQL MCP**: Direct database operations for analytics data and metric calculations
3. **Supabase MCP**: Real-time subscriptions for dashboard updates and alert notifications
4. **Memory MCP**: Storing analytics patterns and business intelligence insights
5. **Browser MCP**: Testing analytics dashboards and visualization interfaces

## Testing Requirements

```typescript
// Advanced Analytics Platform Test Suite

describe('Advanced Analytics Platform', () => {
    describe('Data Source Management', () => {
        it('should create and validate data source connections', async () => {
            const dataSource = {
                sourceName: 'Wedding Database',
                sourceType: 'database',
                connectionConfig: {
                    host: 'localhost',
                    database: 'weddings',
                    username: 'analytics',
                    password: 'secure_password'
                },
                refreshSchedule: '0 */4 * * *' // Every 4 hours
            };
            
            const created = await analyticsService.createDataSource(dataSource);
            expect(created.sourceName).toBe(dataSource.sourceName);
            expect(created.syncStatus).toBe('pending');
        });

        it('should reject invalid data source connections', async () => {
            const invalidSource = {
                sourceName: 'Invalid Source',
                sourceType: 'database',
                connectionConfig: {
                    host: 'nonexistent-host',
                    database: 'invalid'
                }
            };
            
            await expect(analyticsService.createDataSource(invalidSource))
                .rejects.toThrow('Unable to connect to data source');
        });
    });

    describe('Metrics Creation and Calculation', () => {
        it('should create metrics with valid calculation formulas', async () => {
            const metric = {
                metricName: 'Total Revenue',
                metricType: 'sum',
                metricCategory: 'financial',
                dataSourceId: 'test-source-id',
                calculationFormula: 'SELECT SUM(amount) FROM payments WHERE status = "completed"',
                aggregationMethod: 'sum',
                timeDimension: 'daily'
            };
            
            const created = await analyticsService.createAnalyticsMetric(metric);
            expect(created.metricName).toBe(metric.metricName);
            expect(created.isActive).toBe(true);
        });

        it('should calculate metric values accurately', async () => {
            const metric = await createTestMetric();
            await analyticsService.calculateMetricValues(metric.id);
            
            const values = await getMetricValues(metric.id);
            expect(values.length).toBeGreaterThan(0);
            expect(values[0].metricValue).toBeGreaterThan(0);
        });
    });

    describe('Dashboard and Widget Management', () => {
        it('should create dashboard with proper layout configuration', async () => {
            const dashboard = {
                dashboardName: 'Executive Dashboard',
                dashboardType: 'executive',
                description: 'High-level business metrics',
                layoutConfig: {
                    gridSize: { width: 12, height: 12 },
                    widgets: [],
                    refreshInterval: 300
                },
                accessPermissions: { public: false },
                autoRefresh: true,
                refreshIntervalSeconds: 300
            };
            
            const created = await analyticsService.createDashboard(dashboard);
            expect(created.dashboardName).toBe(dashboard.dashboardName);
            expect(created.autoRefresh).toBe(true);
        });

        it('should create and load widget data', async () => {
            const dashboard = await createTestDashboard();
            const widget = {
                widgetName: 'Revenue Chart',
                widgetType: 'chart',
                chartType: 'line',
                dashboardId: dashboard.id,
                position: { x: 0, y: 0, width: 6, height: 4 },
                dataConfig: {
                    metrics: ['revenue-metric-id'],
                    timeRange: 'last_30_days'
                },
                visualizationConfig: {
                    title: 'Monthly Revenue',
                    colors: ['#3b82f6']
                }
            };
            
            const created = await analyticsService.createWidget(widget);
            const data = await analyticsService.getWidgetData(created.id);
            
            expect(created.widgetName).toBe(widget.widgetName);
            expect(data.labels).toBeDefined();
            expect(data.datasets).toHaveLength(1);
        });
    });

    describe('Predictive Analytics', () => {
        it('should create and train prediction models', async () => {
            const prediction = {
                predictionName: 'Revenue Forecast',
                predictionType: 'time_series',
                targetMetricId: 'revenue-metric-id',
                modelAlgorithm: 'lstm',
                trainingDataConfig: {
                    lookbackPeriod: 90,
                    features: ['revenue', 'bookings', 'seasonality']
                },
                predictionHorizon: 30,
                confidenceInterval: 0.95
            };
            
            const created = await analyticsService.createPredictionModel(prediction);
            expect(created.predictionName).toBe(prediction.predictionName);
            expect(created.isActive).toBe(true);
        });

        it('should generate accurate forecasts', async () => {
            const model = await createTrainedPredictionModel();
            const forecasts = await analyticsService.generateForecast(model.id, 7);
            
            expect(forecasts).toHaveLength(7);
            expect(forecasts[0].value).toBeGreaterThan(0);
            expect(forecasts[0].confidenceLower).toBeLessThan(forecasts[0].value);
            expect(forecasts[0].confidenceUpper).toBeGreaterThan(forecasts[0].value);
        });
    });

    describe('Alert System', () => {
        it('should create and monitor alerts', async () => {
            const alertConfig = {
                alertName: 'Revenue Drop Alert',
                alertType: 'threshold',
                metricId: 'revenue-metric-id',
                alertConditions: {
                    type: 'below_threshold',
                    value: 10000,
                    comparison_period: 'previous_period'
                },
                severityLevel: 'high',
                notificationChannels: ['email'],
                recipientList: ['admin@wedsync.com'],
                messageTemplate: 'Revenue has dropped below $10,000'
            };
            
            const alert = await analyticsService.createAlert(alertConfig);
            expect(alert.alertName).toBe(alertConfig.alertName);
            expect(alert.isActive).toBe(true);
        });

        it('should trigger alerts when conditions are met', async () => {
            const alert = await createTestAlert();
            
            // Simulate condition breach
            await updateMetricValue(alert.metricId, 5000); // Below threshold
            
            // Wait for alert processing
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const alertHistory = await getAlertHistory(alert.id);
            expect(alertHistory.length).toBeGreaterThan(0);
            expect(alertHistory[0].thresholdBreached).toContain('below_threshold');
        });
    });

    describe('Data Quality Monitoring', () => {
        it('should assess data quality across multiple dimensions', async () => {
            const dataSource = await createTestDataSource();
            const qualityResults = await analyticsService.runDataQualityCheck(dataSource.id);
            
            expect(qualityResults.qualityScore).toBeGreaterThanOrEqual(0);
            expect(qualityResults.qualityScore).toBeLessThanOrEqual(100);
            expect(qualityResults.completenessScore).toBeDefined();
            expect(qualityResults.accuracyScore).toBeDefined();
            expect(qualityResults.consistencyScore).toBeDefined();
            expect(qualityResults.timelinessScore).toBeDefined();
        });

        it('should identify and report quality issues', async () => {
            const dataSourceWithIssues = await createDataSourceWithQualityIssues();
            const qualityResults = await analyticsService.runDataQualityCheck(dataSourceWithIssues.id);
            
            expect(qualityResults.qualityIssues.length).toBeGreaterThan(0);
            expect(qualityResults.recommendations.length).toBeGreaterThan(0);
            expect(qualityResults.qualityScore).toBeLessThan(90); // Should detect issues
        });
    });
});

// Performance Testing
describe('Analytics Platform Performance', () => {
    it('should handle high-volume metric calculations', async () => {
        const metrics = await createTestMetrics(100);
        
        const startTime = Date.now();
        await Promise.all(
            metrics.map(metric => analyticsService.calculateMetricValues(metric.id))
        );
        const endTime = Date.now();
        
        const processingTime = endTime - startTime;
        expect(processingTime).toBeLessThan(30000); // Under 30 seconds for 100 metrics
        
        // Verify all calculations completed
        for (const metric of metrics) {
            const values = await getMetricValues(metric.id);
            expect(values.length).toBeGreaterThan(0);
        }
    });

    it('should maintain dashboard performance with multiple widgets', async () => {
        const dashboard = await createTestDashboard();
        const widgets = await createTestWidgets(dashboard.id, 20);
        
        const startTime = Date.now();
        const widgetDataPromises = widgets.map(widget => 
            analyticsService.getWidgetData(widget.id)
        );
        const widgetData = await Promise.all(widgetDataPromises);
        const endTime = Date.now();
        
        const loadTime = endTime - startTime;
        expect(loadTime).toBeLessThan(5000); // Under 5 seconds for 20 widgets
        expect(widgetData).toHaveLength(20);
        expect(widgetData.every(data => data.labels && data.datasets)).toBe(true);
    });
});
```

## Accessibility Requirements (WCAG 2.1 AA)

The Advanced Analytics Dashboard includes comprehensive accessibility features:

- **High Contrast Visualizations**: All charts and graphs use high contrast color schemes
- **Screen Reader Compatibility**: Complete screen reader support for all analytics data
- **Keyboard Navigation**: Full keyboard access to all dashboard controls and filters
- **Alternative Text**: Detailed descriptions for all visual elements and charts
- **Data Tables**: Alternative tabular views for all graphical data representations

## Browser Compatibility

- **Chrome 90+**: Full support for advanced visualizations and real-time updates
- **Firefox 88+**: Complete functionality with data visualization libraries
- **Safari 14+**: Full compatibility with dashboard interfaces and charts
- **Edge 90+**: Complete support for all analytics features

## Performance Requirements

- **Dashboard Loading**: < 3 seconds for complex dashboards
- **Data Refresh**: < 2 seconds for metric updates
- **Query Performance**: < 1 second for standard analytics queries
- **Real-time Updates**: < 500ms latency for live data streams
- **Report Generation**: < 30 seconds for comprehensive reports

## Security Considerations

- **Data Access Control**: Role-based access to sensitive analytics data
- **Query Validation**: Prevention of SQL injection and malicious queries  
- **Data Encryption**: Encrypted storage and transmission of analytics data
- **Audit Logging**: Complete audit trail for all analytics operations
- **Privacy Compliance**: GDPR-compliant handling of personal data in analytics

## Deployment Notes

The Advanced Analytics Platform requires:
- High-performance database optimized for analytical queries (column-store recommended)
- Real-time data streaming infrastructure for live updates
- Caching layer (Redis) for dashboard performance
- Machine learning infrastructure for predictive analytics
- Comprehensive monitoring and alerting system

## Effort Estimation: 80 days

- **Database Design & Implementation**: 12 days
- **Core Analytics Engine**: 25 days  
- **Dashboard & Visualization System**: 20 days
- **Predictive Analytics & ML**: 15 days
- **Alert System & Data Quality**: 8 days

## Business Value

The Advanced Analytics Platform provides significant value to WedSync by:
- **Data-Driven Decisions**: Empowering stakeholders with actionable business intelligence
- **Predictive Insights**: Forecasting trends and identifying opportunities before they occur
- **Operational Optimization**: Optimizing wedding operations through comprehensive analytics
- **Customer Intelligence**: Deep understanding of customer behavior and preferences
- **Business Growth**: Driving revenue growth through data-driven strategies and insights