import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/database';

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  mse?: number; // For regression models
  mae?: number; // For regression models
  calibrationScore: number;
}

export interface FeatureDrift {
  featureName: string;
  driftScore: number;
  pValue: number;
  isDrifting: boolean;
  driftType: 'mean' | 'variance' | 'distribution';
  recommendation: string;
}

export interface ModelHealth {
  modelId: string;
  modelName: string;
  status: 'healthy' | 'warning' | 'critical' | 'failing';
  overallScore: number;
  lastEvaluated: string;
  metrics: ModelMetrics;
  featureDrifts: FeatureDrift[];
  alerts: ModelAlert[];
  recommendations: string[];
  performanceTrend: 'improving' | 'stable' | 'degrading';
}

export interface ModelAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  type:
    | 'performance_degradation'
    | 'feature_drift'
    | 'prediction_anomaly'
    | 'data_quality';
  message: string;
  createdAt: string;
  resolvedAt?: string;
  autoAction?: string;
}

export interface ModelPerformanceReport {
  modelName: string;
  timeRange: string;
  totalPredictions: number;
  correctPredictions: number;
  averageConfidence: number;
  performanceBySegment: Record<string, ModelMetrics>;
  businessImpact: {
    revenueImpact: number;
    churnPrevented: number;
    accuracyGains: number;
  };
}

export class ModelMonitor {
  private supabase = createClientComponentClient<Database>();

  /**
   * Evaluate model performance against ground truth
   */
  async evaluateModelPerformance(
    modelId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ModelMetrics> {
    try {
      const { data, error } = await this.supabase.rpc(
        'evaluate_model_performance',
        {
          model_id: modelId,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      );

      if (error || !data) {
        throw new Error(
          `Failed to evaluate model performance: ${error?.message}`,
        );
      }

      const metrics: ModelMetrics = {
        accuracy: data.accuracy || 0,
        precision: data.precision || 0,
        recall: data.recall || 0,
        f1Score: data.f1_score || 0,
        auc: data.auc || 0,
        mse: data.mse,
        mae: data.mae,
        calibrationScore: data.calibration_score || 0,
      };

      // Store metrics for trending
      await this.storeModelMetrics(modelId, metrics);

      return metrics;
    } catch (error) {
      console.error('Error evaluating model performance:', error);
      throw error;
    }
  }

  /**
   * Detect feature drift using statistical methods
   */
  async detectFeatureDrift(
    modelId: string,
    referencePeriod: { start: Date; end: Date },
    comparisonPeriod: { start: Date; end: Date },
  ): Promise<FeatureDrift[]> {
    try {
      const { data, error } = await this.supabase.rpc('detect_feature_drift', {
        model_id: modelId,
        reference_start: referencePeriod.start.toISOString(),
        reference_end: referencePeriod.end.toISOString(),
        comparison_start: comparisonPeriod.start.toISOString(),
        comparison_end: comparisonPeriod.end.toISOString(),
      });

      if (error || !data) {
        return [];
      }

      return data.map((drift: any) => ({
        featureName: drift.feature_name,
        driftScore: drift.drift_score,
        pValue: drift.p_value,
        isDrifting: drift.is_drifting,
        driftType: drift.drift_type,
        recommendation: this.generateDriftRecommendation(drift),
      }));
    } catch (error) {
      console.error('Error detecting feature drift:', error);
      return [];
    }
  }

  /**
   * Get comprehensive model health assessment
   */
  async getModelHealth(modelId: string): Promise<ModelHealth | null> {
    try {
      // Get current model info
      const { data: model, error: modelError } = await this.supabase
        .from('ml_models')
        .select('*')
        .eq('id', modelId)
        .single();

      if (modelError || !model) {
        return null;
      }

      // Evaluate recent performance
      const endDate = new Date();
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const metrics = await this.evaluateModelPerformance(
        modelId,
        startDate,
        endDate,
      );

      // Check for feature drift
      const referenceStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const referenceEnd = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000); // 14 days ago
      const comparisonStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const comparisonEnd = new Date();

      const featureDrifts = await this.detectFeatureDrift(
        modelId,
        { start: referenceStart, end: referenceEnd },
        { start: comparisonStart, end: comparisonEnd },
      );

      // Get active alerts
      const alerts = await this.getActiveAlerts(modelId);

      // Calculate overall health score
      const healthScore = this.calculateHealthScore(
        metrics,
        featureDrifts,
        alerts,
      );
      const status = this.determineModelStatus(healthScore, alerts);

      // Generate recommendations
      const recommendations = this.generateHealthRecommendations(
        metrics,
        featureDrifts,
        alerts,
      );

      // Get performance trend
      const performanceTrend = await this.getPerformanceTrend(modelId);

      return {
        modelId,
        modelName: model.model_name,
        status,
        overallScore: healthScore,
        lastEvaluated: new Date().toISOString(),
        metrics,
        featureDrifts,
        alerts,
        recommendations,
        performanceTrend,
      };
    } catch (error) {
      console.error('Error getting model health:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(
    modelName: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ModelPerformanceReport | null> {
    try {
      const { data, error } = await this.supabase.rpc(
        'generate_performance_report',
        {
          model_name: modelName,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
        },
      );

      if (error || !data) {
        return null;
      }

      return {
        modelName,
        timeRange: `${startDate.toISOString()} to ${endDate.toISOString()}`,
        totalPredictions: data.total_predictions,
        correctPredictions: data.correct_predictions,
        averageConfidence: data.average_confidence,
        performanceBySegment: data.performance_by_segment,
        businessImpact: {
          revenueImpact: data.revenue_impact || 0,
          churnPrevented: data.churn_prevented || 0,
          accuracyGains: data.accuracy_gains || 0,
        },
      };
    } catch (error) {
      console.error('Error generating performance report:', error);
      return null;
    }
  }

  /**
   * Create model alert
   */
  async createAlert(
    modelId: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    type: string,
    message: string,
    autoAction?: string,
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('ml_model_alerts').insert({
        model_id: modelId,
        severity,
        alert_type: type,
        message,
        auto_action: autoAction,
        created_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Error creating alert:', error);
        return false;
      }

      // If critical alert, trigger immediate notification
      if (severity === 'critical') {
        await this.triggerCriticalAlert(modelId, message);
      }

      return true;
    } catch (error) {
      console.error('Error creating model alert:', error);
      return false;
    }
  }

  /**
   * Auto-retrain model if performance degrades
   */
  async scheduleModelRetraining(
    modelId: string,
    reason: string,
  ): Promise<boolean> {
    try {
      // Add to retraining queue
      const { error } = await this.supabase.from('ml_retraining_queue').insert({
        model_id: modelId,
        reason,
        priority: 'high',
        scheduled_for: new Date().toISOString(),
        status: 'queued',
      });

      if (!error) {
        await this.createAlert(
          modelId,
          'medium',
          'auto_retraining',
          `Model scheduled for retraining: ${reason}`,
          'automatic_retraining',
        );
      }

      return !error;
    } catch (error) {
      console.error('Error scheduling retraining:', error);
      return false;
    }
  }

  /**
   * Monitor all models and trigger alerts
   */
  async monitorAllModels(): Promise<ModelHealth[]> {
    try {
      const { data: models, error } = await this.supabase
        .from('ml_models')
        .select('id, model_name')
        .eq('status', 'deployed');

      if (error || !models) {
        return [];
      }

      const healthReports = await Promise.all(
        models.map((model) => this.getModelHealth(model.id)),
      );

      // Filter out null results and trigger alerts for unhealthy models
      const validReports = healthReports.filter(
        (report) => report !== null,
      ) as ModelHealth[];

      for (const report of validReports) {
        if (report.status === 'critical' || report.status === 'failing') {
          await this.handleUnhealthyModel(report);
        }
      }

      return validReports;
    } catch (error) {
      console.error('Error monitoring all models:', error);
      return [];
    }
  }

  /**
   * Private helper methods
   */
  private async storeModelMetrics(
    modelId: string,
    metrics: ModelMetrics,
  ): Promise<void> {
    await this.supabase.from('ml_model_metrics').insert({
      model_id: modelId,
      metrics,
      measured_at: new Date().toISOString(),
    });
  }

  private generateDriftRecommendation(drift: any): string {
    if (!drift.is_drifting) {
      return 'No action required - feature is stable';
    }

    switch (drift.drift_type) {
      case 'mean':
        return `Mean drift detected - consider rebalancing training data or feature normalization`;
      case 'variance':
        return `Variance drift detected - review data collection process and outlier handling`;
      case 'distribution':
        return `Distribution drift detected - model may need retraining with recent data`;
      default:
        return `Feature drift detected - monitor closely and consider model update`;
    }
  }

  private calculateHealthScore(
    metrics: ModelMetrics,
    drifts: FeatureDrift[],
    alerts: ModelAlert[],
  ): number {
    // Base score from model metrics
    let score =
      ((metrics.accuracy +
        metrics.f1Score +
        metrics.precision +
        metrics.recall) /
        4) *
      100;

    // Penalize for feature drift
    const driftingFeatures = drifts.filter((d) => d.isDrifting).length;
    score -= driftingFeatures * 10;

    // Penalize for active alerts
    const criticalAlerts = alerts.filter(
      (a) => a.severity === 'critical',
    ).length;
    const highAlerts = alerts.filter((a) => a.severity === 'high').length;
    score -= criticalAlerts * 20 + highAlerts * 10;

    return Math.max(0, Math.min(100, score));
  }

  private determineModelStatus(
    score: number,
    alerts: ModelAlert[],
  ): 'healthy' | 'warning' | 'critical' | 'failing' {
    const criticalAlerts = alerts.filter(
      (a) => a.severity === 'critical',
    ).length;

    if (criticalAlerts > 0 || score < 30) return 'failing';
    if (score < 50) return 'critical';
    if (score < 70) return 'warning';
    return 'healthy';
  }

  private generateHealthRecommendations(
    metrics: ModelMetrics,
    drifts: FeatureDrift[],
    alerts: ModelAlert[],
  ): string[] {
    const recommendations: string[] = [];

    // Performance recommendations
    if (metrics.accuracy < 0.8) {
      recommendations.push(
        'Model accuracy below 80% - consider retraining with more diverse data',
      );
    }
    if (metrics.precision < 0.7) {
      recommendations.push(
        'Low precision - review feature engineering and model hyperparameters',
      );
    }
    if (metrics.recall < 0.7) {
      recommendations.push('Low recall - consider class balancing techniques');
    }

    // Drift recommendations
    const driftingFeatures = drifts.filter((d) => d.isDrifting);
    if (driftingFeatures.length > 0) {
      recommendations.push(
        `${driftingFeatures.length} features showing drift - schedule retraining soon`,
      );
    }

    // Alert-based recommendations
    const criticalAlerts = alerts.filter((a) => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(
        'Critical alerts detected - immediate attention required',
      );
    }

    // General maintenance
    recommendations.push(
      'Review feature importance scores for potential model simplification',
    );
    recommendations.push(
      'Monitor business metrics impact alongside model metrics',
    );

    return recommendations;
  }

  private async getActiveAlerts(modelId: string): Promise<ModelAlert[]> {
    const { data, error } = await this.supabase
      .from('ml_model_alerts')
      .select('*')
      .eq('model_id', modelId)
      .is('resolved_at', null)
      .order('created_at', { ascending: false });

    if (error || !data) return [];

    return data.map((alert) => ({
      id: alert.id,
      severity: alert.severity,
      type: alert.alert_type,
      message: alert.message,
      createdAt: alert.created_at,
      resolvedAt: alert.resolved_at,
      autoAction: alert.auto_action,
    }));
  }

  private async getPerformanceTrend(
    modelId: string,
  ): Promise<'improving' | 'stable' | 'degrading'> {
    // Get last 30 days of metrics
    const { data, error } = await this.supabase
      .from('ml_model_metrics')
      .select('metrics, measured_at')
      .eq('model_id', modelId)
      .gte(
        'measured_at',
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .order('measured_at', { ascending: true });

    if (error || !data || data.length < 3) return 'stable';

    // Calculate trend from accuracy scores
    const accuracyScores = data.map((d) => d.metrics.accuracy);
    const firstHalf = accuracyScores.slice(
      0,
      Math.floor(accuracyScores.length / 2),
    );
    const secondHalf = accuracyScores.slice(
      Math.floor(accuracyScores.length / 2),
    );

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const improvement = secondAvg - firstAvg;

    if (improvement > 0.02) return 'improving';
    if (improvement < -0.02) return 'degrading';
    return 'stable';
  }

  private async triggerCriticalAlert(
    modelId: string,
    message: string,
  ): Promise<void> {
    // This would integrate with your notification system
    console.error(`CRITICAL ML MODEL ALERT - Model ${modelId}: ${message}`);

    // Could send to Slack, email, PagerDuty, etc.
    // For now, just log to anomalies table
    await this.supabase.from('ml_anomalies').insert({
      anomaly_type: 'model_performance',
      severity: 'critical',
      metrics: { modelId, message },
      description: `Critical model performance alert: ${message}`,
      auto_action_taken: false,
    });
  }

  private async handleUnhealthyModel(report: ModelHealth): Promise<void> {
    if (report.status === 'failing') {
      // Auto-schedule retraining for failing models
      await this.scheduleModelRetraining(
        report.modelId,
        `Model failing with score ${report.overallScore}`,
      );
    }

    // Create appropriate alerts
    const severity = report.status === 'failing' ? 'critical' : 'high';
    await this.createAlert(
      report.modelId,
      severity,
      'performance_degradation',
      `Model health degraded to ${report.status} (score: ${report.overallScore})`,
      report.status === 'failing' ? 'schedule_retraining' : 'monitor_closely',
    );
  }
}

export default ModelMonitor;
