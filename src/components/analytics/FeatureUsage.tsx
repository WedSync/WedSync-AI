'use client';

import React, { useMemo } from 'react';
import {
  Camera,
  Calendar,
  FileText,
  Users,
  CheckSquare,
  MessageSquare,
  MapPin,
  Star,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Dynamic imports for chart components
const ResponsiveContainer = dynamic(
  () =>
    import('recharts').then((mod) => ({ default: mod.ResponsiveContainer })),
  { ssr: false },
);
const PieChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.PieChart })),
  { ssr: false },
);
const Pie = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Pie })),
  { ssr: false },
);
const Cell = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Cell })),
  { ssr: false },
);
const BarChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.BarChart })),
  { ssr: false },
);
const Bar = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Bar })),
  { ssr: false },
);
const LineChart = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.LineChart })),
  { ssr: false },
);
const Line = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Line })),
  { ssr: false },
);
const XAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.XAxis })),
  { ssr: false },
);
const YAxis = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.YAxis })),
  { ssr: false },
);
const CartesianGrid = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.CartesianGrid })),
  { ssr: false },
);
const Tooltip = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Tooltip })),
  { ssr: false },
);
const Legend = dynamic(
  () => import('recharts').then((mod) => ({ default: mod.Legend })),
  { ssr: false },
);

interface FeatureUsageData {
  features: Array<{
    name: string;
    icon: string;
    totalUsage: number;
    activeUsers: number;
    avgTimeSpent: number;
    adoptionRate: number;
    retentionRate: number;
    trend: 'up' | 'down' | 'stable';
    trendValue: number;
  }>;
  timeSeriesData: Array<{
    date: string;
    photoGallery: number;
    timeline: number;
    tasks: number;
    messaging: number;
    documents: number;
    vendors: number;
  }>;
  userAdoption: {
    newUsers: number;
    returningUsers: number;
    superUsers: number;
  };
  featureCorrelations: Array<{
    feature1: string;
    feature2: string;
    correlation: number;
  }>;
}

interface FeatureUsageProps {
  data: FeatureUsageData;
  timeRange: string;
  onExport?: () => void;
}

const COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#f97316',
];

const featureIcons: Record<string, React.ComponentType<any>> = {
  'Photo Gallery': Camera,
  Timeline: Calendar,
  Documents: FileText,
  'Vendor Directory': Users,
  'Task Checklist': CheckSquare,
  Messaging: MessageSquare,
  'Venue Info': MapPin,
  Reviews: Star,
};

const FeatureCard = ({ feature, index }: { feature: any; index: number }) => {
  const IconComponent = featureIcons[feature.name] || Activity;

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <IconComponent className="w-5 h-5 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900">{feature.name}</h3>
        </div>
        <div
          className={`flex items-center space-x-1 text-sm font-medium ${
            feature.trend === 'up'
              ? 'text-green-600'
              : feature.trend === 'down'
                ? 'text-red-600'
                : 'text-gray-600'
          }`}
        >
          {feature.trend === 'up' && <TrendingUp className="w-4 h-4" />}
          {feature.trend === 'down' && <TrendingDown className="w-4 h-4" />}
          <span>
            {feature.trendValue > 0 ? '+' : ''}
            {feature.trendValue}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {feature.totalUsage.toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Total Usage</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {feature.activeUsers}
          </p>
          <p className="text-sm text-gray-500">Active Users</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {Math.round(feature.avgTimeSpent / 60)}m
          </p>
          <p className="text-sm text-gray-500">Avg. Time</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">
            {feature.adoptionRate}%
          </p>
          <p className="text-sm text-gray-500">Adoption Rate</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Retention Rate</span>
          <span className="font-medium text-gray-900">
            {feature.retentionRate}%
          </span>
        </div>
        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${feature.retentionRate}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export function FeatureUsage({ data, timeRange, onExport }: FeatureUsageProps) {
  const chartData = useMemo(() => {
    return data.timeSeriesData.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      }),
    }));
  }, [data.timeSeriesData]);

  const pieChartData = useMemo(() => {
    return data.features.map((feature, index) => ({
      name: feature.name,
      value: feature.totalUsage,
      color: COLORS[index % COLORS.length],
    }));
  }, [data.features]);

  const adoptionData = [
    { name: 'New Users', value: data.userAdoption.newUsers, color: '#3b82f6' },
    {
      name: 'Returning Users',
      value: data.userAdoption.returningUsers,
      color: '#10b981',
    },
    {
      name: 'Super Users',
      value: data.userAdoption.superUsers,
      color: '#f59e0b',
    },
  ];

  return (
    <div className="space-y-6" data-testid="feature-usage">
      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.features.map((feature, index) => (
          <FeatureCard key={feature.name} feature={feature} index={index} />
        ))}
      </div>

      {/* Feature Usage Trends */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Feature Usage Trends
          </h3>
          {onExport && (
            <button
              onClick={onExport}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Export Data
            </button>
          )}
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="photoGallery"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Photo Gallery"
              />
              <Line
                type="monotone"
                dataKey="timeline"
                stroke="#10b981"
                strokeWidth={2}
                name="Timeline"
              />
              <Line
                type="monotone"
                dataKey="tasks"
                stroke="#f59e0b"
                strokeWidth={2}
                name="Tasks"
              />
              <Line
                type="monotone"
                dataKey="messaging"
                stroke="#ef4444"
                strokeWidth={2}
                name="Messaging"
              />
              <Line
                type="monotone"
                dataKey="documents"
                stroke="#8b5cf6"
                strokeWidth={2}
                name="Documents"
              />
              <Line
                type="monotone"
                dataKey="vendors"
                stroke="#06b6d4"
                strokeWidth={2}
                name="Vendors"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feature Distribution and User Adoption */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Usage Distribution */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            Feature Usage Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    'Usage',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* User Adoption Levels */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">
            User Adoption Levels
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={adoptionData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                />
                <Tooltip
                  formatter={(value: number) => [
                    value.toLocaleString(),
                    'Users',
                  ]}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feature Correlation Matrix */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Feature Usage Correlations
        </h3>
        <div className="space-y-3">
          {data.featureCorrelations.map((correlation, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 text-sm font-medium text-gray-900">
                  <span>{correlation.feature1}</span>
                  <span className="text-gray-400">×</span>
                  <span>{correlation.feature2}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-24 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      correlation.correlation > 0.7
                        ? 'bg-green-500'
                        : correlation.correlation > 0.4
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                    }`}
                    style={{
                      width: `${Math.abs(correlation.correlation) * 100}%`,
                    }}
                  ></div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-12">
                  {(correlation.correlation * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Insights */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border border-purple-200">
        <div className="flex items-start space-x-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">
              Feature Usage Insights
            </h3>
            <ul className="space-y-2 text-purple-800">
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span>
                  Photo Gallery is the most popular feature with 87% adoption
                  rate
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span>
                  Users who engage with Timeline are 3x more likely to complete
                  tasks
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span>
                  Messaging feature shows strongest correlation with overall
                  satisfaction
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <span>
                  Super users engage with 5+ features and have 90% retention
                  rate
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureUsage;
