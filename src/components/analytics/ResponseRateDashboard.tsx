'use client';

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Select } from '@/components/untitled-ui/select';
import { Button } from '@/components/untitled-ui/button';
import { createClient } from '@/lib/supabase/client';
import {
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Calendar,
  Users,
  FileText,
  Clock,
  Download,
} from 'lucide-react';

interface FormResponseMetrics {
  form_type: string;
  total_sent: number;
  total_completed: number;
  response_rate: number;
  open_rate: number;
  completion_rate: number;
  avg_response_time_seconds: number;
}

interface TimeSeriesData {
  date: string;
  rsvp: number;
  vendor: number;
  dietary: number;
  preference: number;
  general: number;
}

interface ResponseTrend {
  period: string;
  current: number;
  previous: number;
  change: number;
}

const COLORS = {
  primary: '#7F56D9',
  success: '#12B76A',
  warning: '#F79009',
  error: '#F04438',
  blue: '#2E90FA',
  purple: '#9E77ED',
  pink: '#DD2590',
  teal: '#15B79E',
};

export function ResponseRateDashboard() {
  const [metrics, setMetrics] = useState<FormResponseMetrics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedFormType, setSelectedFormType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [realTimeUpdate, setRealTimeUpdate] = useState(0);
  const supabase = await createClient();

  // Fetch response rate metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(selectedPeriod));

        // Fetch aggregated metrics
        const { data: metricsData, error: metricsError } = await supabase.rpc(
          'calculate_response_rate',
          {
            p_organization_id: (await supabase.auth.getUser()).data.user
              ?.user_metadata.organization_id,
            p_form_type: selectedFormType === 'all' ? null : selectedFormType,
            p_start_date: startDate.toISOString().split('T')[0],
            p_end_date: endDate.toISOString().split('T')[0],
          },
        );

        if (metricsError) throw metricsError;
        setMetrics(metricsData || []);

        // Fetch time series data
        const { data: timeData, error: timeError } = await supabase
          .from('analytics.response_rate_metrics')
          .select('*')
          .gte('metric_date', startDate.toISOString().split('T')[0])
          .lte('metric_date', endDate.toISOString().split('T')[0])
          .order('metric_date', { ascending: true });

        if (timeError) throw timeError;

        // Transform time series data
        const transformedData = transformTimeSeriesData(timeData || []);
        setTimeSeriesData(transformedData);
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [selectedPeriod, selectedFormType, realTimeUpdate]);

  // Real-time subscription for updates
  useEffect(() => {
    const channel = supabase
      .channel('response-metrics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'analytics',
          table: 'form_responses',
        },
        () => {
          setRealTimeUpdate((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const transformTimeSeriesData = (data: any[]): TimeSeriesData[] => {
    const grouped = data.reduce((acc, item) => {
      const date = item.metric_date;
      if (!acc[date]) {
        acc[date] = {
          date,
          rsvp: 0,
          vendor: 0,
          dietary: 0,
          preference: 0,
          general: 0,
        };
      }
      acc[date][item.form_type] = item.response_rate;
      return acc;
    }, {});

    return Object.values(grouped);
  };

  const calculateOverallRate = () => {
    if (metrics.length === 0) return 0;
    const totalSent = metrics.reduce((sum, m) => sum + m.total_sent, 0);
    const totalCompleted = metrics.reduce(
      (sum, m) => sum + m.total_completed,
      0,
    );
    return totalSent > 0 ? Math.round((totalCompleted / totalSent) * 100) : 0;
  };

  const getStatusColor = (rate: number) => {
    if (rate >= 90) return COLORS.success;
    if (rate >= 70) return COLORS.warning;
    return COLORS.error;
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    );
  }

  const overallRate = calculateOverallRate();

  return (
    <div className="space-y-6">
      {/* Header with Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">
            Response Rate Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Track form submission rates and guest engagement
          </p>
        </div>

        <div className="flex gap-3">
          <Select
            value={selectedPeriod}
            onValueChange={setSelectedPeriod}
            className="w-32"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </Select>

          <Select
            value={selectedFormType}
            onValueChange={setSelectedFormType}
            className="w-40"
          >
            <option value="all">All Forms</option>
            <option value="rsvp">RSVP</option>
            <option value="vendor">Vendor</option>
            <option value="dietary">Dietary</option>
            <option value="preference">Preference</option>
            <option value="general">General</option>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Overall Response Rate
              </p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {overallRate}%
              </p>
              <div className="flex items-center mt-2">
                {overallRate >= 70 ? (
                  <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-error-600 mr-1" />
                )}
                <span
                  className={`text-sm font-medium ${overallRate >= 70 ? 'text-success-600' : 'text-error-600'}`}
                >
                  {overallRate >= 70 ? 'Above target' : 'Below target'}
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg bg-gray-50`}>
              <Users className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Forms Sent
              </p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {metrics.reduce((sum, m) => sum + m.total_sent, 0)}
              </p>
              <p className="text-sm text-gray-500 mt-2">Across all types</p>
            </div>
            <div className="p-3 rounded-lg bg-primary-50">
              <FileText className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {metrics.reduce((sum, m) => sum + m.total_completed, 0)}
              </p>
              <Badge className="mt-2" variant="success">
                <CheckCircle className="w-3 h-3 mr-1" />
                Submitted
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-success-50">
              <CheckCircle className="w-6 h-6 text-success-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Avg Response Time
              </p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">
                {formatTime(
                  metrics.reduce(
                    (sum, m) => sum + (m.avg_response_time_seconds || 0),
                    0,
                  ) / (metrics.length || 1),
                )}
              </p>
              <p className="text-sm text-gray-500 mt-2">Per form</p>
            </div>
            <div className="p-3 rounded-lg bg-blue-50">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Response Rate Trend Chart */}
      <Card className="p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Response Rate Trends
          </h3>
          <p className="text-sm text-gray-500">
            Daily response rates by form type
          </p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={timeSeriesData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
            <XAxis
              dataKey="date"
              stroke="#667085"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) =>
                new Date(value).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              }
            />
            <YAxis
              stroke="#667085"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #EAECF0',
                borderRadius: '8px',
                padding: '12px',
              }}
              formatter={(value: any) => `${value}%`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="rsvp"
              stroke={COLORS.primary}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="vendor"
              stroke={COLORS.blue}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="dietary"
              stroke={COLORS.success}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="preference"
              stroke={COLORS.warning}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="general"
              stroke={COLORS.purple}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Form Type Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Rate by Form Type */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Response Rate by Form Type
            </h3>
            <p className="text-sm text-gray-500">Current period performance</p>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={metrics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EAECF0" />
              <XAxis
                dataKey="form_type"
                stroke="#667085"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="#667085"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EAECF0',
                  borderRadius: '8px',
                  padding: '12px',
                }}
                formatter={(value: any) => `${value}%`}
              />
              <Bar
                dataKey="response_rate"
                fill={COLORS.primary}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Completion Funnel */}
        <Card className="p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Completion Funnel
            </h3>
            <p className="text-sm text-gray-500">Form engagement breakdown</p>
          </div>
          <div className="space-y-4">
            {metrics.map((metric, index) => (
              <div key={metric.form_type} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700 capitalize">
                    {metric.form_type}
                  </span>
                  <span className="text-sm text-gray-500">
                    {metric.total_completed}/{metric.total_sent}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${metric.response_rate}%`,
                      backgroundColor: getStatusColor(metric.response_rate),
                    }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    Open: {metric.open_rate}%
                  </span>
                  <span className="text-xs text-gray-500">
                    Complete: {metric.completion_rate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Alert Status */}
      {overallRate < 70 && (
        <Card className="p-4 border-warning-200 bg-warning-50">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-warning-600 mt-0.5 mr-3 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-warning-900">
                Low Response Rate Alert
              </h4>
              <p className="text-sm text-warning-700 mt-1">
                Current response rate ({overallRate}%) is below the target
                threshold of 70%. Consider sending reminder notifications to
                pending respondents.
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
