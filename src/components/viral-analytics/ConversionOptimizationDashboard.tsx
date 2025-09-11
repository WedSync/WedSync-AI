'use client';

import React, { useState, useEffect } from 'react';
import { useSupabase } from '@/lib/supabase/client';
import {
  ChartBarIcon,
  LightBulbIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayCircleIcon,
  PauseCircleIcon,
} from '@heroicons/react/24/outline';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import { Alert, AlertDescription } from '@/components/ui/Alert';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
} from 'recharts';

interface OptimizationRecommendation {
  id: string;
  type: 'template' | 'timing' | 'channel' | 'targeting' | 'frequency';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  expected_impact: number;
  confidence_score: number;
  implementation_effort: 'low' | 'medium' | 'high';
  based_on_data: {
    sample_size: number;
    time_period: string;
    key_metrics: Record<string, number>;
  };
  recommended_actions: string[];
  created_at: string;
}

interface ConversionTest {
  id: string;
  name: string;
  test_type: string;
  status: 'draft' | 'running' | 'completed' | 'paused';
  start_date: string;
  end_date?: string;
  variants: Array<{
    name: string;
    traffic_allocation: number;
    is_control: boolean;
  }>;
  results?: {
    summary: {
      total_invitations: number;
      total_conversions: number;
      overall_conversion_rate: number;
      has_statistical_significance: boolean;
    };
    recommendation: {
      action: string;
      reason: string;
    };
  };
}

interface FunnelStage {
  stage: string;
  total_users: number;
  converted_users: number;
  conversion_rate: number;
  drop_off_rate: number;
}

export default function ConversionOptimizationDashboard() {
  const { user } = useSupabase();
  const [recommendations, setRecommendations] = useState<
    OptimizationRecommendation[]
  >([]);
  const [tests, setTests] = useState<ConversionTest[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recommendations');

  useEffect(() => {
    if (user) {
      loadOptimizationData();
    }
  }, [user]);

  const loadOptimizationData = async () => {
    try {
      setLoading(true);

      // Load recommendations
      const recommendationsResponse = await fetch(
        '/api/viral/optimization?type=recommendations',
      );
      if (recommendationsResponse.ok) {
        const recommendationsData = await recommendationsResponse.json();
        setRecommendations(recommendationsData.data.recommendations);
      }

      // Load A/B tests
      const testsResponse = await fetch('/api/viral/ab-tests');
      if (testsResponse.ok) {
        const testsData = await testsResponse.json();
        const testsWithResults = await Promise.all(
          testsData.data.map(async (test: ConversionTest) => {
            if (test.status === 'running' || test.status === 'completed') {
              try {
                const resultsResponse = await fetch(
                  `/api/viral/ab-tests/${test.id}/results`,
                );
                if (resultsResponse.ok) {
                  const resultsData = await resultsResponse.json();
                  return { ...test, results: resultsData.data.results };
                }
              } catch (error) {
                console.error(
                  `Failed to load results for test ${test.id}:`,
                  error,
                );
              }
            }
            return test;
          }),
        );
        setTests(testsWithResults);
      }

      // Load funnel analysis
      const funnelResponse = await fetch(
        '/api/viral/optimization?type=funnel-analysis',
      );
      if (funnelResponse.ok) {
        const funnelData = await funnelResponse.json();
        setFunnelData(funnelData.data.funnel_stages);
      }
    } catch (error) {
      console.error('Error loading optimization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEffortColor = (effort: string) => {
    switch (effort) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTestStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <PlayCircleIcon className="h-5 w-5 text-green-500" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-blue-500" />;
      case 'paused':
        return <PauseCircleIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ExclamationTriangleIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const highPriorityCount = recommendations.filter(
    (r) => r.priority === 'high',
  ).length;
  const runningTestsCount = tests.filter((t) => t.status === 'running').length;
  const avgConversionRate =
    funnelData.length > 0
      ? funnelData.reduce((sum, stage) => sum + stage.conversion_rate, 0) /
        funnelData.length
      : 0;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Conversion Optimization
        </h2>
        <Button onClick={loadOptimizationData} variant="outline">
          Refresh Data
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold text-gray-900">
                {highPriorityCount}
              </p>
              <p className="text-xs text-gray-500">Recommendations</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <PlayCircleIcon className="h-8 w-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Running Tests</p>
              <p className="text-2xl font-bold text-gray-900">
                {runningTestsCount}
              </p>
              <p className="text-xs text-gray-500">A/B Tests</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Avg Conversion</p>
              <p className="text-2xl font-bold text-gray-900">
                {avgConversionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500">Across Funnel</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-purple-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Tests</p>
              <p className="text-2xl font-bold text-gray-900">{tests.length}</p>
              <p className="text-xs text-gray-500">All Time</p>
            </div>
          </div>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          <TabsTrigger value="ab-tests">A/B Tests</TabsTrigger>
          <TabsTrigger value="funnel">Conversion Funnel</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          {recommendations.length === 0 ? (
            <Card className="p-8 text-center">
              <LightBulbIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Recommendations Available
              </h3>
              <p className="text-gray-600">
                Send more invitations to generate optimization recommendations.
              </p>
            </Card>
          ) : (
            recommendations.map((recommendation) => (
              <Card key={recommendation.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <Badge
                        className={getPriorityColor(recommendation.priority)}
                      >
                        {recommendation.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline">{recommendation.type}</Badge>
                      <span
                        className={`text-sm font-medium ${getEffortColor(recommendation.implementation_effort)}`}
                      >
                        {recommendation.implementation_effort} effort
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {recommendation.title}
                    </h3>

                    <p className="text-gray-700 mb-4">
                      {recommendation.description}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="text-center p-3 bg-blue-50 rounded">
                        <p className="text-2xl font-bold text-blue-600">
                          +{recommendation.expected_impact.toFixed(1)}%
                        </p>
                        <p className="text-sm text-blue-600">Expected Impact</p>
                      </div>

                      <div className="text-center p-3 bg-green-50 rounded">
                        <p className="text-2xl font-bold text-green-600">
                          {(recommendation.confidence_score * 100).toFixed(0)}%
                        </p>
                        <p className="text-sm text-green-600">Confidence</p>
                      </div>

                      <div className="text-center p-3 bg-gray-50 rounded">
                        <p className="text-2xl font-bold text-gray-600">
                          {recommendation.based_on_data.sample_size}
                        </p>
                        <p className="text-sm text-gray-600">Sample Size</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">
                        Recommended Actions:
                      </h4>
                      <ul className="space-y-1">
                        {recommendation.recommended_actions.map(
                          (action, index) => (
                            <li key={index} className="flex items-start">
                              <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5 mr-2" />
                              <span className="text-gray-700 text-sm">
                                {action}
                              </span>
                            </li>
                          ),
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="ab-tests" className="space-y-4">
          {tests.length === 0 ? (
            <Card className="p-8 text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No A/B Tests Found
              </h3>
              <p className="text-gray-600">
                Create your first A/B test to start optimizing conversions.
              </p>
              <Button className="mt-4">Create A/B Test</Button>
            </Card>
          ) : (
            tests.map((test) => (
              <Card key={test.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      {getTestStatusIcon(test.status)}
                      <h3 className="text-lg font-semibold text-gray-900">
                        {test.name}
                      </h3>
                      <Badge variant="outline">{test.test_type}</Badge>
                    </div>

                    <p className="text-sm text-gray-600">
                      Started: {new Date(test.start_date).toLocaleDateString()}
                      {test.end_date &&
                        ` • Ended: ${new Date(test.end_date).toLocaleDateString()}`}
                    </p>
                  </div>

                  <Badge
                    className={
                      test.status === 'running'
                        ? 'bg-green-100 text-green-800'
                        : test.status === 'completed'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {test.status.toUpperCase()}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Variants ({test.variants.length})
                    </h4>
                    <div className="space-y-2">
                      {test.variants.map((variant, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded"
                        >
                          <span className="text-sm text-gray-700">
                            {variant.name} {variant.is_control && '(Control)'}
                          </span>
                          <span className="text-sm text-gray-600">
                            {variant.traffic_allocation}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {test.results && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">
                        Results Summary
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Total Invitations:
                          </span>
                          <span className="font-medium">
                            {test.results.summary.total_invitations}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Conversions:</span>
                          <span className="font-medium">
                            {test.results.summary.total_conversions}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Conversion Rate:
                          </span>
                          <span className="font-medium">
                            {test.results.summary.overall_conversion_rate.toFixed(
                              2,
                            )}
                            %
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            Statistical Significance:
                          </span>
                          <span
                            className={`font-medium ${test.results.summary.has_statistical_significance ? 'text-green-600' : 'text-red-600'}`}
                          >
                            {test.results.summary.has_statistical_significance
                              ? 'Yes'
                              : 'No'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {test.results?.recommendation && (
                  <Alert>
                    <LightBulbIcon className="h-4 w-4" />
                    <AlertDescription>
                      <strong>
                        Recommendation ({test.results.recommendation.action}):
                      </strong>{' '}
                      {test.results.recommendation.reason}
                    </AlertDescription>
                  </Alert>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="funnel" className="space-y-6">
          {funnelData.length === 0 ? (
            <Card className="p-8 text-center">
              <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Funnel Data Available
              </h3>
              <p className="text-gray-600">
                Send invitations to generate funnel analysis.
              </p>
            </Card>
          ) : (
            <>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Conversion Funnel Overview
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="stage" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        `${Number(value).toFixed(1)}%`,
                        name === 'conversion_rate'
                          ? 'Conversion Rate'
                          : 'Drop-off Rate',
                      ]}
                    />
                    <Bar
                      dataKey="conversion_rate"
                      fill="#3B82F6"
                      name="conversion_rate"
                    />
                    <Bar
                      dataKey="drop_off_rate"
                      fill="#EF4444"
                      name="drop_off_rate"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {funnelData.map((stage, index) => (
                  <Card key={stage.stage} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">
                        {stage.stage}
                      </h4>
                      <Badge variant="outline">Stage {index + 1}</Badge>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>Conversion Rate</span>
                          <span>{stage.conversion_rate.toFixed(1)}%</span>
                        </div>
                        <Progress
                          value={stage.conversion_rate}
                          className="h-2"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-600">Total Users</p>
                          <p className="font-semibold">
                            {stage.total_users.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Converted</p>
                          <p className="font-semibold">
                            {stage.converted_users.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {stage.drop_off_rate > 50 && (
                        <Alert className="p-2">
                          <ExclamationTriangleIcon className="h-3 w-3" />
                          <AlertDescription className="text-xs">
                            High drop-off rate: {stage.drop_off_rate.toFixed(1)}
                            %
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
