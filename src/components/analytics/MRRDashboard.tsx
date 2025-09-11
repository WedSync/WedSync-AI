'use client';

import { useState, useEffect } from 'react';
import {
  CurrencyDollarIcon,
  UsersIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
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
} from 'recharts';

interface MRRMetrics {
  current_mrr: number;
  previous_mrr: number;
  mrr_growth: number;
  total_customers: number;
  new_customers: number;
  churned_customers: number;
  arpu: number;
  ltv: number;
  churn_rate: number;
  quick_ratio: number;
}

interface MRRSnapshot {
  date: string;
  mrr: number;
  new: number;
  expansion: number;
  contraction: number;
  churn: number;
  reactivation: number;
  net: number;
  customers: number;
}

interface CohortData {
  [key: string]: {
    [key: number]: {
      retention_rate: number;
      revenue_retention: number;
      customers: number;
      mrr: number;
    };
  };
}

export default function MRRDashboard() {
  const [metrics, setMetrics] = useState<MRRMetrics | null>(null);
  const [snapshots, setSnapshots] = useState<MRRSnapshot[]>([]);
  const [cohortData, setCohortData] = useState<CohortData>({});
  const [churnPredictions, setChurnPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchMRRData();
  }, [period]);

  const fetchMRRData = async () => {
    setLoading(true);
    try {
      // Fetch MRR snapshots
      const snapshotRes = await fetch(
        `/api/analytics/mrr?period=${period}&type=snapshot`,
      );
      const snapshotData = await snapshotRes.json();

      if (snapshotData.summary) {
        setMetrics(snapshotData.summary);
      }
      if (snapshotData.chart_data) {
        setSnapshots(snapshotData.chart_data);
      }

      // Fetch cohort analysis
      const cohortRes = await fetch(
        `/api/analytics/mrr?period=${period}&type=cohort`,
      );
      const cohortResult = await cohortRes.json();
      if (cohortResult.matrix) {
        setCohortData(cohortResult.matrix);
      }

      // Fetch churn predictions
      const churnRes = await fetch('/api/analytics/mrr?type=churn');
      const churnResult = await churnRes.json();
      if (churnResult.predictions) {
        setChurnPredictions(churnResult.predictions);
      }
    } catch (error) {
      console.error('Error fetching MRR data:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerSnapshot = async () => {
    try {
      const response = await fetch('/api/analytics/mrr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calculate_snapshot' }),
      });

      if (response.ok) {
        await fetchMRRData();
      }
    } catch (error) {
      console.error('Error triggering snapshot:', error);
    }
  };

  const exportData = async () => {
    try {
      const response = await fetch(
        `/api/analytics/mrr?period=${period}&type=snapshot`,
      );
      const data = await response.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mrr-data-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const getMetricTrend = (value: number) => {
    if (value > 0) {
      return { icon: ArrowUpIcon, color: 'text-green-600', bg: 'bg-green-100' };
    } else if (value < 0) {
      return { icon: ArrowDownIcon, color: 'text-red-600', bg: 'bg-red-100' };
    }
    return { icon: null, color: 'text-gray-600', bg: 'bg-gray-100' };
  };

  const COLORS = [
    '#10B981',
    '#3B82F6',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#EC4899',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading MRR data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Monthly Recurring Revenue Dashboard
          </h2>
          <p className="text-gray-600">
            Track revenue growth, churn, and customer metrics
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="365d">Last year</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={triggerSnapshot}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Calculate Snapshot
          </button>
          <button
            onClick={exportData}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Export
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'growth', 'churn', 'cohorts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Current MRR</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metrics.current_mrr)}
                  </p>
                  <div className="flex items-center mt-2">
                    {metrics.mrr_growth !== 0 && (
                      <>
                        {getMetricTrend(metrics.mrr_growth).icon && (
                          <ArrowUpIcon
                            className={`h-4 w-4 ${getMetricTrend(metrics.mrr_growth).color}`}
                          />
                        )}
                        <span
                          className={`text-sm ml-1 ${getMetricTrend(metrics.mrr_growth).color}`}
                        >
                          {formatPercentage(Math.abs(metrics.mrr_growth))}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <CurrencyDollarIcon className="h-12 w-12 text-blue-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Customers</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics.total_customers}
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    +{metrics.new_customers} new
                  </p>
                </div>
                <UsersIcon className="h-12 w-12 text-green-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">ARPU</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(metrics.arpu)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">Per customer</p>
                </div>
                <ChartBarIcon className="h-12 w-12 text-purple-600" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Churn Rate</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatPercentage(metrics.churn_rate)}
                  </p>
                  <p className="text-sm text-red-600 mt-2">
                    -{metrics.churned_customers} lost
                  </p>
                </div>
                <ExclamationTriangleIcon className="h-12 w-12 text-red-600" />
              </div>
            </div>
          </div>

          {/* MRR Trend Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">MRR Trend</h3>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={snapshots}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="mrr"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  name="Total MRR"
                />
                <Area
                  type="monotone"
                  dataKey="new"
                  stackId="2"
                  stroke="#10B981"
                  fill="#10B981"
                  name="New MRR"
                />
                <Area
                  type="monotone"
                  dataKey="churn"
                  stackId="2"
                  stroke="#EF4444"
                  fill="#EF4444"
                  name="Churned MRR"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Growth Tab */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          {/* Growth Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">MRR Movement</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Bar dataKey="new" fill="#10B981" name="New" />
                  <Bar dataKey="expansion" fill="#3B82F6" name="Expansion" />
                  <Bar
                    dataKey="reactivation"
                    fill="#8B5CF6"
                    name="Reactivation"
                  />
                  <Bar
                    dataKey="contraction"
                    fill="#F59E0B"
                    name="Contraction"
                  />
                  <Bar dataKey="churn" fill="#EF4444" name="Churn" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Net MRR Growth</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="net"
                    stroke="#3B82F6"
                    name="Net MRR Change"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Ratio */}
          {metrics && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Growth Efficiency</h3>
              <div className="grid grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Quick Ratio</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.quick_ratio.toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    {metrics.quick_ratio >= 4
                      ? 'Excellent'
                      : metrics.quick_ratio >= 2
                        ? 'Good'
                        : metrics.quick_ratio >= 1
                          ? 'Fair'
                          : 'Poor'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">LTV</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(metrics.ltv)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Customer lifetime value
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">CAC Payback</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {metrics.arpu > 0 ? Math.ceil(500 / metrics.arpu) : 0}{' '}
                    months
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Time to recover CAC
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Churn Tab */}
      {activeTab === 'churn' && (
        <div className="space-y-6">
          {/* Churn Predictions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">At-Risk Customers</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Risk Level
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Churn Probability
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usage Trend
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {churnPredictions.slice(0, 10).map((prediction, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {prediction.user?.email || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            prediction.risk_level === 'critical'
                              ? 'bg-red-100 text-red-800'
                              : prediction.risk_level === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : prediction.risk_level === 'medium'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {prediction.risk_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatPercentage(prediction.churn_probability)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span
                          className={`flex items-center ${
                            prediction.usage_trend === 'decreasing'
                              ? 'text-red-600'
                              : prediction.usage_trend === 'increasing'
                                ? 'text-green-600'
                                : 'text-gray-600'
                          }`}
                        >
                          {prediction.usage_trend === 'decreasing' ? (
                            <TrendingDownIcon className="h-4 w-4 mr-1" />
                          ) : prediction.usage_trend === 'increasing' ? (
                            <TrendingUpIcon className="h-4 w-4 mr-1" />
                          ) : null}
                          {prediction.usage_trend}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-600 hover:text-blue-900">
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Churn Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">
                Churn by Risk Level
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      {
                        name: 'Critical',
                        value: churnPredictions.filter(
                          (p) => p.risk_level === 'critical',
                        ).length,
                      },
                      {
                        name: 'High',
                        value: churnPredictions.filter(
                          (p) => p.risk_level === 'high',
                        ).length,
                      },
                      {
                        name: 'Medium',
                        value: churnPredictions.filter(
                          (p) => p.risk_level === 'medium',
                        ).length,
                      },
                      {
                        name: 'Low',
                        value: churnPredictions.filter(
                          (p) => p.risk_level === 'low',
                        ).length,
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[0, 1, 2, 3].map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Churn Rate Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={snapshots}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number) => formatPercentage(value)}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="churn_rate"
                    stroke="#EF4444"
                    name="Churn Rate %"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Cohorts Tab */}
      {activeTab === 'cohorts' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Cohort Retention Analysis
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Cohort
                    </th>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => (
                      <th
                        key={month}
                        className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                      >
                        M{month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cohortData)
                    .slice(0, 12)
                    .map(([cohortMonth, data]) => (
                      <tr key={cohortMonth}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {cohortMonth}
                        </td>
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((month) => {
                          const cellData = data[month];
                          const retention = cellData?.retention_rate || 0;
                          const bgColor =
                            retention >= 80
                              ? 'bg-green-100'
                              : retention >= 60
                                ? 'bg-green-50'
                                : retention >= 40
                                  ? 'bg-yellow-50'
                                  : retention >= 20
                                    ? 'bg-orange-50'
                                    : retention > 0
                                      ? 'bg-red-50'
                                      : 'bg-gray-50';

                          return (
                            <td
                              key={month}
                              className={`px-4 py-2 text-center text-sm ${bgColor}`}
                            >
                              {cellData ? `${retention.toFixed(0)}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Revenue Retention */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">
              Revenue Retention by Cohort
            </h3>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Cohort
                    </th>
                    {[0, 1, 2, 3, 4, 5, 6].map((month) => (
                      <th
                        key={month}
                        className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase"
                      >
                        M{month}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(cohortData)
                    .slice(0, 6)
                    .map(([cohortMonth, data]) => (
                      <tr key={cohortMonth}>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                          {cohortMonth}
                        </td>
                        {[0, 1, 2, 3, 4, 5, 6].map((month) => {
                          const cellData = data[month];
                          const retention = cellData?.revenue_retention || 0;
                          const bgColor =
                            retention >= 100
                              ? 'bg-purple-100'
                              : retention >= 80
                                ? 'bg-blue-100'
                                : retention >= 60
                                  ? 'bg-blue-50'
                                  : retention >= 40
                                    ? 'bg-yellow-50'
                                    : retention > 0
                                      ? 'bg-red-50'
                                      : 'bg-gray-50';

                          return (
                            <td
                              key={month}
                              className={`px-4 py-2 text-center text-sm ${bgColor}`}
                            >
                              {cellData ? `${retention.toFixed(0)}%` : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
