'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Calendar,
  Users,
  DollarSign,
  Lightbulb,
  BarChart3,
} from 'lucide-react';
import {
  CohortAnalysisResult,
  AutomatedInsight,
  CohortTrend,
} from '@/types/cohort-analysis';

interface CohortInsightsPanelProps {
  cohortAnalysis: CohortAnalysisResult;
  insights: AutomatedInsight[];
  trends: CohortTrend[];
  className?: string;
}

const CohortInsightsPanel: React.FC<CohortInsightsPanelProps> = ({
  cohortAnalysis,
  insights,
  trends,
  className = '',
}) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity':
        return <Target className="w-5 h-5 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-warning-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-success-600" />;
      case 'trend':
        return <TrendingUp className="w-5 h-5 text-primary-600" />;
      default:
        return <Lightbulb className="w-5 h-5 text-gray-600" />;
    }
  };

  const getInsightBorderClass = (type: string) => {
    switch (type) {
      case 'opportunity':
        return 'border-l-blue-500 bg-blue-50';
      case 'warning':
        return 'border-l-warning-500 bg-warning-50';
      case 'success':
        return 'border-l-success-500 bg-success-50';
      case 'trend':
        return 'border-l-primary-500 bg-primary-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="w-4 h-4 text-success-600" />;
      case 'declining':
        return <TrendingDown className="w-4 h-4 text-error-600" />;
      default:
        return <BarChart3 className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatConfidence = (confidence: number) => {
    if (confidence >= 0.9) return 'Very High';
    if (confidence >= 0.7) return 'High';
    if (confidence >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics Summary */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="w-5 h-5 mr-2 text-primary-600" />
          Executive Summary
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-700 font-medium">
                  Average Retention
                </p>
                <p className="text-2xl font-bold text-primary-900">
                  {(
                    cohortAnalysis.overall_metrics.average_retention * 100
                  ).toFixed(1)}
                  %
                </p>
              </div>
              <Users className="w-8 h-8 text-primary-600" />
            </div>
          </div>

          <div className="bg-success-50 rounded-lg p-4 border border-success-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-success-700 font-medium">
                  Best Cohort
                </p>
                <p className="text-lg font-bold text-success-900">
                  {new Date(
                    cohortAnalysis.overall_metrics.best_cohort_month,
                  ).toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-success-600" />
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">
                  Total Suppliers
                </p>
                <p className="text-2xl font-bold text-blue-900">
                  {cohortAnalysis.overall_metrics.total_suppliers_analyzed.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-warning-50 rounded-lg p-4 border border-warning-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-warning-700 font-medium">
                  Revenue Attribution
                </p>
                <p className="text-lg font-bold text-warning-900">
                  $
                  {(
                    cohortAnalysis.overall_metrics.revenue_attribution_total /
                    1000000
                  ).toFixed(1)}
                  M
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-warning-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Seasonal Performance */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-primary-600" />
          Seasonal Performance Analysis
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Q1 (Jan-Mar)</p>
            <p className="text-xl font-bold text-gray-900">
              {(
                cohortAnalysis.seasonal_insights.q1_average_retention * 100
              ).toFixed(1)}
              %
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Q2 (Apr-Jun)</p>
            <p className="text-xl font-bold text-gray-900">
              {(
                cohortAnalysis.seasonal_insights.q2_average_retention * 100
              ).toFixed(1)}
              %
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Q3 (Jul-Sep)</p>
            <p className="text-xl font-bold text-gray-900">
              {(
                cohortAnalysis.seasonal_insights.q3_average_retention * 100
              ).toFixed(1)}
              %
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 mb-1">Q4 (Oct-Dec)</p>
            <p className="text-xl font-bold text-gray-900">
              {(
                cohortAnalysis.seasonal_insights.q4_average_retention * 100
              ).toFixed(1)}
              %
            </p>
          </div>
        </div>

        <div className="bg-primary-50 rounded-lg p-4 border border-primary-100">
          <p className="text-sm text-primary-700 font-medium mb-1">
            Peak Season Performance
          </p>
          <p className="text-base text-primary-900">
            <strong>
              {cohortAnalysis.seasonal_insights.peak_season_performance}
            </strong>{' '}
            shows the highest supplier retention rates, indicating optimal
            onboarding conditions during peak wedding season.
          </p>
        </div>
      </div>

      {/* Automated Insights */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Lightbulb className="w-5 h-5 mr-2 text-primary-600" />
          Automated Business Insights
        </h3>

        <div className="space-y-4">
          {insights.slice(0, 5).map((insight) => (
            <div
              key={insight.id}
              className={`border-l-4 p-4 rounded-lg ${getInsightBorderClass(insight.type)}`}
            >
              <div className="flex items-start space-x-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">
                      {insight.title}
                    </h4>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="bg-white px-2 py-1 rounded border">
                        Impact: {insight.impact_score}/10
                      </span>
                      <span className="bg-white px-2 py-1 rounded border">
                        Confidence: {formatConfidence(insight.confidence_level)}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-gray-700 mb-3">
                    {insight.description}
                  </p>

                  <div className="bg-white rounded-lg p-3 border">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Recommended Action:
                    </p>
                    <p className="text-sm text-gray-700">
                      {insight.actionable_recommendation}
                    </p>
                  </div>

                  {insight.affected_cohorts.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">
                        Affects cohorts:{' '}
                        {insight.affected_cohorts.slice(0, 3).join(', ')}
                        {insight.affected_cohorts.length > 3 &&
                          ` and ${insight.affected_cohorts.length - 3} more`}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trends Analysis */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
          Performance Trends
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trends.map((trend, index) => (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 capitalize">
                  {trend.metric} Trend
                </h4>
                {getTrendIcon(trend.trend_direction)}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Direction:</span>
                  <span
                    className={`font-medium capitalize ${
                      trend.trend_direction === 'improving'
                        ? 'text-success-700'
                        : trend.trend_direction === 'declining'
                          ? 'text-error-700'
                          : 'text-gray-700'
                    }`}
                  >
                    {trend.trend_direction}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Change:</span>
                  <span
                    className={`font-medium ${
                      trend.change_percentage > 0
                        ? 'text-success-700'
                        : trend.change_percentage < 0
                          ? 'text-error-700'
                          : 'text-gray-700'
                    }`}
                  >
                    {trend.change_percentage > 0 ? '+' : ''}
                    {trend.change_percentage.toFixed(1)}%
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Period:</span>
                  <span className="text-gray-900">
                    {trend.period_comparison}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Significance:</span>
                  <span className="text-gray-900">
                    {(trend.statistical_significance * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CohortInsightsPanel;
