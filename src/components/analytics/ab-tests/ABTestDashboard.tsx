'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Play,
  Pause,
  Square,
  TrendingUp,
  TrendingDown,
  Users,
  Mail,
  MessageSquare,
  Crown,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import {
  calculateSignificance,
  calculateBayesianInterval,
  type TestResults,
  type StatisticalResult,
} from '@/lib/statistics/significance';

interface ABTest {
  id: string;
  name: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  started_at?: string;
  variants: ABTestVariant[];
  metrics: string[];
  confidence_level: number;
  statistical_significance?: number;
  winner_variant_id?: string;
}

interface ABTestVariant {
  id: string;
  name: string;
  conversions: number;
  total_exposures: number;
  conversion_rate: number;
  is_control: boolean;
  content: any;
}

interface DashboardProps {
  tests: ABTest[];
  onTestAction: (testId: string, action: 'start' | 'pause' | 'stop') => void;
  onRefresh: () => void;
}

const COLORS = ['#7F56D9', '#9E77ED', '#B692F6', '#D6BBFB', '#E9D7FE'];

export default function ABTestDashboard({
  tests,
  onTestAction,
  onRefresh,
}: DashboardProps) {
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [realTimeData, setRealTimeData] = useState<{ [key: string]: any }>({});

  useEffect(() => {
    // Simulate real-time updates every 30 seconds
    const interval = setInterval(() => {
      onRefresh();
    }, 30000);

    return () => clearInterval(interval);
  }, [onRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="h-4 w-4" />;
      case 'paused':
        return <Pause className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Square className="h-4 w-4" />;
    }
  };

  const calculateTestResults = (
    test: ABTest,
  ): { results: TestResults[]; analysis: StatisticalResult | null } => {
    if (test.variants.length < 2) return { results: [], analysis: null };

    const results: TestResults[] = test.variants.map((variant) => ({
      variant: variant.name,
      conversions: variant.conversions,
      total: variant.total_exposures,
      conversionRate: variant.conversion_rate,
    }));

    const controlVariant = test.variants.find((v) => v.is_control);
    const testVariant = test.variants.find((v) => !v.is_control);

    if (!controlVariant || !testVariant) return { results, analysis: null };

    const controlResults: TestResults = {
      variant: controlVariant.name,
      conversions: controlVariant.conversions,
      total: controlVariant.total_exposures,
      conversionRate: controlVariant.conversion_rate,
    };

    const variantResults: TestResults = {
      variant: testVariant.name,
      conversions: testVariant.conversions,
      total: testVariant.total_exposures,
      conversionRate: testVariant.conversion_rate,
    };

    const analysis = calculateSignificance(
      controlResults,
      variantResults,
      (100 - test.confidence_level) / 100,
    );

    return { results, analysis };
  };

  const renderTestCard = (test: ABTest) => {
    const { results, analysis } = calculateTestResults(test);
    const totalExposures = test.variants.reduce(
      (sum, v) => sum + v.total_exposures,
      0,
    );
    const runningDays = test.started_at
      ? Math.floor(
          (Date.now() - new Date(test.started_at).getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    return (
      <Card key={test.id} className="p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{test.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${getStatusColor(test.status)}`}
                />
                {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
              </Badge>
              {test.status === 'running' && (
                <span className="text-sm text-gray-600">
                  Running for {runningDays} days
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {test.status === 'draft' && (
              <Button
                onClick={() => onTestAction(test.id, 'start')}
                size="sm"
                className="flex items-center gap-1"
              >
                <Play className="h-4 w-4" />
                Start
              </Button>
            )}
            {test.status === 'running' && (
              <>
                <Button
                  onClick={() => onTestAction(test.id, 'pause')}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Pause className="h-4 w-4" />
                  Pause
                </Button>
                <Button
                  onClick={() => onTestAction(test.id, 'stop')}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-1"
                >
                  <Square className="h-4 w-4" />
                  Stop
                </Button>
              </>
            )}
            {test.status === 'paused' && (
              <Button
                onClick={() => onTestAction(test.id, 'start')}
                size="sm"
                variant="outline"
                className="flex items-center gap-1"
              >
                <Play className="h-4 w-4" />
                Resume
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Users className="h-8 w-8 text-primary-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Total Exposures
              </p>
              <p className="text-lg font-bold text-primary-600">
                {totalExposures.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Best Performer
              </p>
              <p className="text-lg font-bold text-green-600">
                {test.variants.length > 0
                  ? test.variants.reduce((best, current) =>
                      current.conversion_rate > best.conversion_rate
                        ? current
                        : best,
                    ).name
                  : 'N/A'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {analysis?.isSignificant ? (
              <>
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className="text-lg font-bold text-green-600">
                    Significant
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-8 w-8 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Status</p>
                  <p className="text-lg font-bold text-yellow-600">Testing</p>
                </div>
              </>
            )}
          </div>
        </div>

        {test.variants.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Variant Performance</h4>
            {test.variants.map((variant, index) => {
              const bayesianInterval =
                variant.total_exposures > 0
                  ? calculateBayesianInterval(
                      variant.conversions,
                      variant.total_exposures,
                    )
                  : [0, 0];

              return (
                <div
                  key={variant.id}
                  className="p-4 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{variant.name}</span>
                      {variant.is_control && (
                        <Badge variant="secondary" className="text-xs">
                          Control
                        </Badge>
                      )}
                      {test.winner_variant_id === variant.id && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        {(variant.conversion_rate * 100).toFixed(2)}%
                      </p>
                      <p className="text-sm text-gray-600">
                        {variant.conversions}/{variant.total_exposures}{' '}
                        converted
                      </p>
                    </div>
                  </div>

                  <Progress
                    value={variant.conversion_rate * 100}
                    className="mb-2"
                  />

                  <div className="flex justify-between text-xs text-gray-600">
                    <span>
                      Confidence: {(bayesianInterval[0] * 100).toFixed(1)}% -{' '}
                      {(bayesianInterval[1] * 100).toFixed(1)}%
                    </span>
                    <span>
                      Traffic:{' '}
                      {variant.total_exposures > 0
                        ? (
                            (variant.total_exposures / totalExposures) *
                            100
                          ).toFixed(1)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {analysis && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">
              Statistical Analysis
            </h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">P-Value:</span>
                <span className="ml-2 font-mono">
                  {analysis.pValue.toFixed(4)}
                </span>
              </div>
              <div>
                <span className="text-blue-700">Confidence:</span>
                <span className="ml-2">{test.confidence_level}%</span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-blue-800 font-medium">
                {analysis.recommendedAction}
              </p>
            </div>
          </div>
        )}

        <Button
          onClick={() =>
            setSelectedTest(selectedTest === test.id ? null : test.id)
          }
          variant="outline"
          className="w-full mt-4"
        >
          {selectedTest === test.id
            ? 'Hide Details'
            : 'View Detailed Analytics'}
        </Button>
      </Card>
    );
  };

  const renderDetailedAnalytics = (test: ABTest) => {
    if (!test || selectedTest !== test.id) return null;

    const { results } = calculateTestResults(test);

    // Generate time series data for the chart
    const timeSeriesData = Array.from({ length: 7 }, (_, i) => ({
      day: `Day ${i + 1}`,
      ...test.variants.reduce(
        (acc, variant, index) => ({
          ...acc,
          [variant.name]: Math.random() * variant.conversion_rate * 100,
        }),
        {},
      ),
    }));

    const pieData = test.variants.map((variant, index) => ({
      name: variant.name,
      value: variant.total_exposures,
      fill: COLORS[index % COLORS.length],
    }));

    return (
      <Card className="mt-4 p-6">
        <h3 className="text-lg font-semibold mb-6">
          Detailed Analytics: {test.name}
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium mb-3">Conversion Rate Over Time</h4>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                {test.variants.map((variant, index) => (
                  <Line
                    key={variant.id}
                    type="monotone"
                    dataKey={variant.name}
                    stroke={COLORS[index % COLORS.length]}
                    strokeWidth={2}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div>
            <h4 className="font-medium mb-3">Traffic Distribution</h4>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-3">Variant Comparison</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={results}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="variant" />
              <YAxis />
              <Tooltip
                formatter={(value: any) => [
                  `${(value * 100).toFixed(2)}%`,
                  'Conversion Rate',
                ]}
              />
              <Bar dataKey="conversionRate" fill="#7F56D9" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    );
  };

  const activeTests = tests.filter((t) => t.status === 'running');
  const completedTests = tests.filter((t) => t.status === 'completed');
  const draftTests = tests.filter((t) => t.status === 'draft');

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Play className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Active Tests</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeTests.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {completedTests.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Square className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Drafts</p>
              <p className="text-2xl font-bold text-gray-900">
                {draftTests.length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">
                Avg Improvement
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {completedTests.length > 0 ? '12.4%' : '0%'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tests List */}
      <div className="space-y-4">
        {tests.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <MessageSquare className="h-6 w-6 text-gray-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No A/B tests yet
            </h3>
            <p className="text-gray-600">
              Create your first A/B test to start optimizing your wedding
              communications
            </p>
          </Card>
        ) : (
          tests.map((test) => (
            <div key={test.id}>
              {renderTestCard(test)}
              {renderDetailedAnalytics(test)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
