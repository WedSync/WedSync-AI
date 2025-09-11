'use client';

import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Brain,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
  LineChart,
  Zap,
  Settings,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import {
  LTVPrediction,
  LTVPredictionModel,
  ConfidenceInterval,
  ValidationResult,
  ModelAccuracyMetrics,
  PredictionFactor,
} from '@/types/ltv-analytics';

interface LTVPredictionVisualizerProps {
  predictions: LTVPrediction[];
  confidenceIntervals: ConfidenceInterval[];
  modelAccuracy: ModelAccuracyMetrics;
  historicalValidation: ValidationResult[];
  models: LTVPredictionModel[];
  selectedModelId?: string;
  onModelSelect?: (modelId: string) => void;
  onRefreshPredictions?: () => void;
  onExportPredictions?: (modelId: string) => void;
}

interface ModelCardProps {
  model: LTVPredictionModel;
  isSelected: boolean;
  onSelect: () => void;
  accuracy: number;
  validationResults: ValidationResult[];
}

const ModelCard: React.FC<ModelCardProps> = ({
  model,
  isSelected,
  onSelect,
  accuracy,
  validationResults,
}) => {
  const getModelIcon = (type: string) => {
    switch (type) {
      case 'machine_learning':
        return <Brain className="h-5 w-5" />;
      case 'cohort_based':
        return <BarChart3 className="h-5 w-5" />;
      case 'probabilistic':
        return <Activity className="h-5 w-5" />;
      case 'regression':
        return <LineChart className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 85)
      return 'text-success-600 bg-success-50 border-success-200';
    if (accuracy >= 70)
      return 'text-warning-600 bg-warning-50 border-warning-200';
    return 'text-error-600 bg-error-50 border-error-200';
  };

  const getModelTypeLabel = (type: string) => {
    return type
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const recentValidation = validationResults[0];
  const accuracyColor = getAccuracyColor(accuracy);

  return (
    <div
      onClick={onSelect}
      className={`p-6 rounded-xl border cursor-pointer transition-all duration-200 ${
        isSelected
          ? 'border-primary-300 bg-primary-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div
            className={`p-2 rounded-lg ${isSelected ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-600'}`}
          >
            {getModelIcon(model.modelType)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{model.name}</h3>
            <p className="text-sm text-gray-600">
              {getModelTypeLabel(model.modelType)}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${accuracyColor}`}
        >
          {accuracy.toFixed(1)}% Accurate
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Predictions</span>
          <span className="font-medium text-gray-900">
            {model.predictions.length}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Last Trained</span>
          <span className="text-sm text-gray-900">
            {format(model.lastTrained, 'MMM dd, yyyy')}
          </span>
        </div>

        {recentValidation && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Validation Status</span>
            <div className="flex items-center space-x-1">
              {recentValidation.passed ? (
                <CheckCircle className="h-4 w-4 text-success-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-error-600" />
              )}
              <span
                className={`text-xs font-medium ${recentValidation.passed ? 'text-success-600' : 'text-error-600'}`}
              >
                {recentValidation.passed ? 'Passed' : 'Issues Found'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

interface PredictionChartProps {
  predictions: LTVPrediction[];
  showConfidenceIntervals: boolean;
  timeHorizon: number;
}

const PredictionChart: React.FC<PredictionChartProps> = ({
  predictions,
  showConfidenceIntervals,
  timeHorizon,
}) => {
  // Generate time series data for visualization
  const chartData = useMemo(() => {
    const months = Array.from({ length: timeHorizon }, (_, i) => i + 1);

    return months.map((month) => {
      const monthPredictions = predictions.filter(
        (p) => p.timeHorizon >= month,
      );
      const avgPrediction =
        monthPredictions.reduce((sum, p) => sum + p.predictedLTV, 0) /
          monthPredictions.length || 0;

      let confidence = { lower: 0, upper: 0 };
      if (showConfidenceIntervals && monthPredictions.length > 0) {
        const avgLower =
          monthPredictions.reduce(
            (sum, p) => sum + p.confidenceInterval.lower,
            0,
          ) / monthPredictions.length;
        const avgUpper =
          monthPredictions.reduce(
            (sum, p) => sum + p.confidenceInterval.upper,
            0,
          ) / monthPredictions.length;
        confidence = { lower: avgLower, upper: avgUpper };
      }

      return {
        month,
        prediction: avgPrediction,
        confidence,
        date: addMonths(new Date(), month - 1),
      };
    });
  }, [predictions, showConfidenceIntervals, timeHorizon]);

  const maxValue = Math.max(
    ...chartData.map((d) =>
      showConfidenceIntervals ? d.confidence.upper : d.prediction,
    ),
  );
  const minValue = Math.min(
    ...chartData.map((d) =>
      showConfidenceIntervals ? d.confidence.lower : d.prediction,
    ),
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold text-gray-900">LTV Prediction Trend</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <div className="w-3 h-3 bg-primary-500 rounded"></div>
            <span>Predicted LTV</span>
          </div>
          {showConfidenceIntervals && (
            <div className="flex items-center space-x-1">
              <div className="w-3 h-3 bg-primary-200 rounded"></div>
              <span>Confidence Interval</span>
            </div>
          )}
        </div>
      </div>

      <div className="h-64 relative">
        <svg className="w-full h-full">
          {/* Chart area */}
          <defs>
            <linearGradient
              id="confidenceGradient"
              x1="0%"
              y1="0%"
              x2="0%"
              y2="100%"
            >
              <stop
                offset="0%"
                stopColor="rgb(139, 92, 246)"
                stopOpacity="0.1"
              />
              <stop
                offset="100%"
                stopColor="rgb(139, 92, 246)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[...Array(5)].map((_, i) => (
            <line
              key={i}
              x1="40"
              y1={40 + i * 36}
              x2="100%"
              y2={40 + i * 36}
              stroke="#f3f4f6"
              strokeWidth="1"
            />
          ))}

          {/* Confidence intervals */}
          {showConfidenceIntervals && chartData.length > 0 && (
            <path
              d={`M ${chartData
                .map((d, i) => {
                  const x = 40 + i * (100 / chartData.length);
                  const yUpper =
                    40 +
                    ((maxValue - d.confidence.upper) / (maxValue - minValue)) *
                      180;
                  const yLower =
                    40 +
                    ((maxValue - d.confidence.lower) / (maxValue - minValue)) *
                      180;
                  return i === 0
                    ? `${x},${yUpper} L ${x},${yLower}`
                    : `L ${x},${yUpper} L ${x},${yLower}`;
                })
                .join(' ')} Z`}
              fill="url(#confidenceGradient)"
              opacity="0.3"
            />
          )}

          {/* Prediction line */}
          <polyline
            points={chartData
              .map((d, i) => {
                const x = 40 + i * (300 / chartData.length);
                const y =
                  40 +
                  ((maxValue - d.prediction) / (maxValue - minValue)) * 180;
                return `${x},${y}`;
              })
              .join(' ')}
            fill="none"
            stroke="rgb(139, 92, 246)"
            strokeWidth="2"
          />

          {/* Data points */}
          {chartData.map((d, i) => {
            const x = 40 + i * (300 / chartData.length);
            const y =
              40 + ((maxValue - d.prediction) / (maxValue - minValue)) * 180;
            return (
              <circle key={i} cx={x} cy={y} r="3" fill="rgb(139, 92, 246)" />
            );
          })}

          {/* Y-axis labels */}
          {[...Array(5)].map((_, i) => {
            const value = maxValue - i * ((maxValue - minValue) / 4);
            return (
              <text
                key={i}
                x="35"
                y={45 + i * 36}
                textAnchor="end"
                className="text-xs fill-gray-500"
              >
                ${Math.round(value).toLocaleString()}
              </text>
            );
          })}
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-10 right-0 flex justify-between text-xs text-gray-500">
          {chartData
            .filter((_, i) => i % Math.ceil(chartData.length / 6) === 0)
            .map((d, i) => (
              <span key={i}>{format(d.date, 'MMM yyyy')}</span>
            ))}
        </div>
      </div>
    </div>
  );
};

interface AccuracyMetricsProps {
  accuracy: ModelAccuracyMetrics;
}

const AccuracyMetrics: React.FC<AccuracyMetricsProps> = ({ accuracy }) => {
  const getAccuracyStatus = (value: number) => {
    if (value >= 85) return { color: 'text-success-600', label: 'Excellent' };
    if (value >= 70) return { color: 'text-blue-600', label: 'Good' };
    if (value >= 50) return { color: 'text-warning-600', label: 'Fair' };
    return { color: 'text-error-600', label: 'Poor' };
  };

  const overallStatus = getAccuracyStatus(accuracy.overall);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-4">
        Model Accuracy Metrics
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {accuracy.overall.toFixed(1)}%
          </div>
          <div className={`text-sm font-medium ${overallStatus.color} mb-1`}>
            {overallStatus.label}
          </div>
          <div className="text-xs text-gray-500">Overall Accuracy</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {Object.keys(accuracy.bySegment).length}
          </div>
          <div className="text-sm font-medium text-blue-600 mb-1">Segments</div>
          <div className="text-xs text-gray-500">Tracked</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {Object.keys(accuracy.byTimeHorizon).length}
          </div>
          <div className="text-sm font-medium text-purple-600 mb-1">
            Horizons
          </div>
          <div className="text-xs text-gray-500">Forecasted</div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900 mb-1">
            {accuracy.trend.length}
          </div>
          <div className="text-sm font-medium text-indigo-600 mb-1">
            Periods
          </div>
          <div className="text-xs text-gray-500">Historical</div>
        </div>
      </div>

      {/* Segment Accuracy Breakdown */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-3">Accuracy by Segment</h4>
        <div className="space-y-2">
          {Object.entries(accuracy.bySegment)
            .slice(0, 5)
            .map(([segment, value]) => {
              const status = getAccuracyStatus(value);
              return (
                <div
                  key={segment}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-gray-700 capitalize">
                    {segment.replace('_', ' ')}
                  </span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          value >= 85
                            ? 'bg-success-500'
                            : value >= 70
                              ? 'bg-blue-500'
                              : value >= 50
                                ? 'bg-warning-500'
                                : 'bg-error-500'
                        }`}
                        style={{ width: `${Math.min(value, 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${status.color}`}>
                      {value.toFixed(1)}%
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Accuracy Trend */}
      <div>
        <h4 className="font-medium text-gray-900 mb-3">Accuracy Trend</h4>
        <div className="flex items-end space-x-2 h-16">
          {accuracy.trend.slice(-8).map((period, index) => {
            const height = (period.accuracy / 100) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center">
                <div
                  className={`w-full rounded-t ${
                    period.accuracy >= 85
                      ? 'bg-success-500'
                      : period.accuracy >= 70
                        ? 'bg-blue-500'
                        : period.accuracy >= 50
                          ? 'bg-warning-500'
                          : 'bg-error-500'
                  }`}
                  style={{ height: `${height}%` }}
                />
                <span className="text-xs text-gray-500 mt-1">
                  {period.period}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface PredictionFactorsProps {
  factors: PredictionFactor[];
  segmentId: string;
}

const PredictionFactors: React.FC<PredictionFactorsProps> = ({
  factors,
  segmentId,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="font-semibold text-gray-900 mb-4">
        Key Prediction Factors
      </h3>
      <div className="space-y-3">
        {factors
          .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
          .map((factor, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    factor.impact === 'positive'
                      ? 'bg-success-500'
                      : factor.impact === 'negative'
                        ? 'bg-error-500'
                        : 'bg-gray-400'
                  }`}
                />
                <span className="text-sm font-medium text-gray-900 capitalize">
                  {factor.name.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900">
                    {factor.weight.toFixed(3)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {factor.value.toLocaleString()}
                  </div>
                </div>
                <div
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    factor.impact === 'positive'
                      ? 'bg-success-100 text-success-800'
                      : factor.impact === 'negative'
                        ? 'bg-error-100 text-error-800'
                        : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {factor.impact}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export const LTVPredictionVisualizer: React.FC<
  LTVPredictionVisualizerProps
> = ({
  predictions,
  confidenceIntervals,
  modelAccuracy,
  historicalValidation,
  models,
  selectedModelId,
  onModelSelect,
  onRefreshPredictions,
  onExportPredictions,
}) => {
  const [showConfidenceIntervals, setShowConfidenceIntervals] = useState(true);
  const [timeHorizon, setTimeHorizon] = useState(12);
  const [selectedFactorSegment, setSelectedFactorSegment] =
    useState<string>('');

  const selectedModel =
    models.find((m) => m.modelId === selectedModelId) || models[0];
  const selectedPredictions = selectedModel
    ? selectedModel.predictions
    : predictions;

  // Get unique segments for factor analysis
  const availableSegments = useMemo(() => {
    const segments = [...new Set(selectedPredictions.map((p) => p.segmentId))];
    return segments;
  }, [selectedPredictions]);

  // Sample prediction factors for the selected segment
  const selectedFactors = useMemo(() => {
    if (!selectedFactorSegment) return [];

    const prediction = selectedPredictions.find(
      (p) => p.segmentId === selectedFactorSegment,
    );
    return prediction?.factors || [];
  }, [selectedPredictions, selectedFactorSegment]);

  const handleModelSelect = (modelId: string) => {
    onModelSelect?.(modelId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Predictive LTV Models
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Advanced forecasting with confidence intervals and model validation
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Horizon Selector */}
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(Number(e.target.value))}
            className="px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 text-sm shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value={6}>6 Months</option>
            <option value={12}>12 Months</option>
            <option value={18}>18 Months</option>
            <option value={24}>24 Months</option>
          </select>

          {/* Toggle Confidence Intervals */}
          <button
            onClick={() => setShowConfidenceIntervals(!showConfidenceIntervals)}
            className={`inline-flex items-center px-4 py-2.5 border rounded-lg shadow-xs transition-all duration-200 ${
              showConfidenceIntervals
                ? 'bg-primary-600 border-primary-600 text-white'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {showConfidenceIntervals ? (
              <Eye className="h-4 w-4 mr-2" />
            ) : (
              <EyeOff className="h-4 w-4 mr-2" />
            )}
            Confidence
          </button>

          {/* Export */}
          {onExportPredictions && selectedModel && (
            <button
              onClick={() => onExportPredictions(selectedModel.modelId)}
              className="inline-flex items-center px-4 py-2.5 bg-white border border-gray-300 rounded-lg shadow-xs hover:shadow-sm transition-all duration-200"
            >
              <Download className="h-4 w-4 mr-2 text-gray-500" />
              Export
            </button>
          )}

          {/* Refresh */}
          {onRefreshPredictions && (
            <button
              onClick={onRefreshPredictions}
              className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Model Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {models.map((model) => (
          <ModelCard
            key={model.modelId}
            model={model}
            isSelected={
              selectedModelId === model.modelId ||
              (!selectedModelId && model === models[0])
            }
            onSelect={() => handleModelSelect(model.modelId)}
            accuracy={
              modelAccuracy.bySegment[model.modelType] || modelAccuracy.overall
            }
            validationResults={historicalValidation.filter(
              (v) => v.modelId === model.modelId,
            )}
          />
        ))}
      </div>

      {/* Main Visualization */}
      <PredictionChart
        predictions={selectedPredictions}
        showConfidenceIntervals={showConfidenceIntervals}
        timeHorizon={timeHorizon}
      />

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Accuracy Metrics */}
        <AccuracyMetrics accuracy={modelAccuracy} />

        {/* Prediction Factors */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Prediction Factors</h3>
            <select
              value={selectedFactorSegment}
              onChange={(e) => setSelectedFactorSegment(e.target.value)}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded text-sm"
            >
              <option value="">Select Segment</option>
              {availableSegments.map((segment) => (
                <option key={segment} value={segment}>
                  {segment}
                </option>
              ))}
            </select>
          </div>
          {selectedFactors.length > 0 && (
            <PredictionFactors
              factors={selectedFactors}
              segmentId={selectedFactorSegment}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default LTVPredictionVisualizer;
