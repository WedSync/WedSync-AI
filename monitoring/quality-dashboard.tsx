// Quality Monitoring Dashboard
// Real-time visualization of WedSync wedding platform quality metrics
// Comprehensive monitoring for performance, errors, user experience, and business KPIs

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { 
  AlertTriangle, CheckCircle, XCircle, Clock, 
  Users, Camera, Calendar, CreditCard, Heart,
  TrendingUp, TrendingDown, Activity, Bell
} from 'lucide-react';

interface QualityDashboardData {
  timeRange: { start: Date; end: Date };
  overview: {
    totalMetrics: number;
    totalAlerts: number;
    criticalAlerts: number;
    systemHealth: number;
  };
  metricSummary: Record<string, any>;
  recentAlerts: any[];
  weddingSpecificMetrics: {
    totalWeddingMetrics: number;
    byPhase: Record<string, any[]>;
    criticalWeddingAlerts: number;
  };
}

const COLORS = {
  primary: '#667eea',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  gray: '#6b7280'
};

const SEVERITY_COLORS = {
  info: COLORS.info,
  warning: COLORS.warning,
  critical: COLORS.error,
  emergency: '#dc2626'
};

export function QualityDashboard() {
  const [dashboardData, setDashboardData] = useState<QualityDashboardData | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadDashboardData();
    
    if (autoRefresh) {
      refreshInterval.current = setInterval(loadDashboardData, 30000); // 30 seconds
    }
    
    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [selectedTimeRange, autoRefresh]);

  const loadDashboardData = async () => {
    try {
      const timeRangeSeconds = getTimeRangeSeconds(selectedTimeRange);
      const response = await fetch(`/api/quality-dashboard?timeRange=${timeRangeSeconds}`);
      const data = await response.json();
      
      setDashboardData(data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoading(false);
    }
  };

  const getTimeRangeSeconds = (range: string): number => {
    const ranges: Record<string, number> = {
      '15m': 900,
      '1h': 3600,
      '6h': 21600,
      '24h': 86400,
      '7d': 604800
    };
    return ranges[range] || 3600;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-gray-600">Loading quality metrics...</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p className="text-gray-600">Failed to load dashboard data</p>
          <button 
            onClick={loadDashboardData}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                🛡️ WedSync Quality Dashboard
              </h1>
              <p className="text-gray-600">
                Real-time monitoring of wedding platform quality metrics
              </p>
            </div>
            
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Time Range:</label>
                <select
                  value={selectedTimeRange}
                  onChange={(e) => setSelectedTimeRange(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="15m">Last 15 minutes</option>
                  <option value="1h">Last hour</option>
                  <option value="6h">Last 6 hours</option>
                  <option value="24h">Last 24 hours</option>
                  <option value="7d">Last 7 days</option>
                </select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="autoRefresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                <label htmlFor="autoRefresh" className="text-sm font-medium text-gray-700">
                  Auto-refresh
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* System Health Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <HealthCard
            title="System Health"
            value={`${dashboardData.overview.systemHealth}%`}
            icon={Activity}
            trend="up"
            color={dashboardData.overview.systemHealth >= 95 ? 'success' : 
                   dashboardData.overview.systemHealth >= 85 ? 'warning' : 'error'}
          />
          
          <HealthCard
            title="Total Metrics"
            value={dashboardData.overview.totalMetrics.toLocaleString()}
            icon={TrendingUp}
            trend="neutral"
            color="info"
          />
          
          <HealthCard
            title="Active Alerts"
            value={dashboardData.overview.totalAlerts.toString()}
            icon={Bell}
            trend={dashboardData.overview.totalAlerts > 0 ? 'down' : 'neutral'}
            color={dashboardData.overview.totalAlerts > 0 ? 'warning' : 'success'}
          />
          
          <HealthCard
            title="Critical Alerts"
            value={dashboardData.overview.criticalAlerts.toString()}
            icon={AlertTriangle}
            trend={dashboardData.overview.criticalAlerts > 0 ? 'down' : 'neutral'}
            color={dashboardData.overview.criticalAlerts > 0 ? 'error' : 'success'}
          />
        </div>

        {/* Wedding-Specific Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <WeddingMetricsCard data={dashboardData.weddingSpecificMetrics} />
          <WeddingPhaseDistribution data={dashboardData.weddingSpecificMetrics.byPhase} />
          <RecentAlerts alerts={dashboardData.recentAlerts} />
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PerformanceChart 
            title="🎉 RSVP Response Time"
            data={transformMetricData(dashboardData.metricSummary.rsvp_response_time)}
            dataKey="value"
            color={COLORS.primary}
            unit="ms"
          />
          
          <PerformanceChart 
            title="📸 Photo Upload Time"
            data={transformMetricData(dashboardData.metricSummary.photo_upload_time)}
            dataKey="value"
            color={COLORS.success}
            unit="ms"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <PerformanceChart 
            title="📅 Timeline Load Time"
            data={transformMetricData(dashboardData.metricSummary.timeline_load_time)}
            dataKey="value"
            color={COLORS.warning}
            unit="ms"
          />
          
          <ErrorRateChart 
            title="💳 Payment Error Rate"
            data={transformMetricData(dashboardData.metricSummary.payment_failure_rate)}
            dataKey="value"
            color={COLORS.error}
            unit="%"
          />
        </div>

        {/* Core Web Vitals */}
        <CoreWebVitalsSection metricSummary={dashboardData.metricSummary} />

        {/* Business Metrics */}
        <BusinessMetricsSection metricSummary={dashboardData.metricSummary} />
      </div>
    </div>
  );
}

interface HealthCardProps {
  title: string;
  value: string;
  icon: React.ElementType;
  trend: 'up' | 'down' | 'neutral';
  color: 'success' | 'warning' | 'error' | 'info';
}

function HealthCard({ title, value, icon: Icon, trend, color }: HealthCardProps) {
  const colorClasses = {
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-blue-50 border-blue-200 text-blue-700'
  };

  const iconColors = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    info: 'text-blue-500'
  };

  return (
    <div className={`p-6 rounded-lg border-2 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-4">
        <Icon className={`w-8 h-8 ${iconColors[color]}`} />
        {trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
      </div>
      
      <div className="space-y-2">
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium opacity-80">{title}</p>
      </div>
    </div>
  );
}

function WeddingMetricsCard({ data }: { data: any }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">💒 Wedding Metrics</h3>
        <Heart className="w-5 h-5 text-pink-500" />
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Wedding Events</span>
          <span className="font-semibold text-gray-900">{data.totalWeddingMetrics}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Critical Alerts</span>
          <span className={`font-semibold ${data.criticalWeddingAlerts > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {data.criticalWeddingAlerts}
          </span>
        </div>
        
        <div className="pt-2">
          <div className="text-xs text-gray-500 mb-2">Wedding Phases Active</div>
          <div className="flex flex-wrap gap-2">
            {Object.keys(data.byPhase).map(phase => (
              <span 
                key={phase}
                className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
              >
                {phase} ({data.byPhase[phase].length})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeddingPhaseDistribution({ data }: { data: Record<string, any[]> }) {
  const chartData = Object.entries(data).map(([phase, events]) => ({
    name: phase,
    value: events.length,
    color: getPhaseColor(phase)
  }));

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">🎉 Events by Wedding Phase</h3>
      
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              outerRadius={70}
              fill="#8884d8"
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No wedding events in selected time range</p>
          </div>
        </div>
      )}
    </div>
  );
}

function getPhaseColor(phase: string): string {
  const colors: Record<string, string> = {
    planning: '#3b82f6',
    preparation: '#f59e0b',
    'day-of': '#ef4444',
    'post-wedding': '#10b981'
  };
  return colors[phase] || '#6b7280';
}

function RecentAlerts({ alerts }: { alerts: any[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">🚨 Recent Alerts</h3>
        <Bell className="w-5 h-5 text-orange-500" />
      </div>
      
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {alerts.length > 0 ? (
          alerts.map((alert, index) => (
            <div 
              key={index}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-200"
            >
              <div 
                className={`w-3 h-3 rounded-full mt-1 ${getSeverityDot(alert.severity)}`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {alert.metric_name}
                </p>
                <p className="text-xs text-gray-600">
                  Value: {alert.value} | Threshold: {alert.threshold}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(alert.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <div className="text-center">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <p>No recent alerts</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getSeverityDot(severity: string): string {
  const dots: Record<string, string> = {
    info: 'bg-blue-500',
    warning: 'bg-yellow-500',
    critical: 'bg-red-500',
    emergency: 'bg-red-700'
  };
  return dots[severity] || 'bg-gray-500';
}

interface PerformanceChartProps {
  title: string;
  data: any[];
  dataKey: string;
  color: string;
  unit: string;
}

function PerformanceChart({ title, data, dataKey, color, unit }: PerformanceChartProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip 
              formatter={(value: any) => [`${value}${unit}`, 'Value']}
              labelFormatter={(label: any) => `Time: ${label}`}
            />
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No data available</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorRateChart({ title, data, dataKey, color, unit }: PerformanceChartProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip 
              formatter={(value: any) => [`${value}${unit}`, 'Error Rate']}
              labelFormatter={(label: any) => `Time: ${label}`}
            />
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={color} 
              fill={color}
              fillOpacity={0.3}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-48 text-gray-500">
          <div className="text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p>No errors detected</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CoreWebVitalsSection({ metricSummary }: { metricSummary: Record<string, any> }) {
  const webVitals = [
    { key: 'core_web_vitals_lcp', title: 'LCP (Largest Contentful Paint)', unit: 'ms', threshold: 2500 },
    { key: 'core_web_vitals_fid', title: 'FID (First Input Delay)', unit: 'ms', threshold: 100 },
    { key: 'core_web_vitals_cls', title: 'CLS (Cumulative Layout Shift)', unit: '', threshold: 0.1 }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">⚡ Core Web Vitals</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {webVitals.map(vital => {
          const data = metricSummary[vital.key];
          const value = data?.average || 0;
          const isGood = value <= vital.threshold;
          
          return (
            <div key={vital.key} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-600">{vital.title}</h3>
                {isGood ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
              </div>
              
              <div className="space-y-2">
                <p className={`text-2xl font-bold ${isGood ? 'text-green-600' : 'text-red-600'}`}>
                  {value.toFixed(vital.key.includes('cls') ? 3 : 0)}{vital.unit}
                </p>
                <p className="text-xs text-gray-500">
                  Threshold: {vital.threshold}{vital.unit}
                </p>
                {data && (
                  <p className="text-xs text-gray-400">
                    Min: {data.min?.toFixed(vital.key.includes('cls') ? 3 : 0)}{vital.unit} | 
                    Max: {data.max?.toFixed(vital.key.includes('cls') ? 3 : 0)}{vital.unit}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BusinessMetricsSection({ metricSummary }: { metricSummary: Record<string, any> }) {
  const businessMetrics = [
    { 
      key: 'wedding_completion_rate', 
      title: 'Wedding Completion Rate', 
      icon: Heart, 
      unit: '%', 
      target: 95,
      color: COLORS.success
    },
    { 
      key: 'vendor_booking_success_rate', 
      title: 'Vendor Booking Success', 
      icon: Users, 
      unit: '%', 
      target: 98,
      color: COLORS.primary
    },
    { 
      key: 'guest_satisfaction_score', 
      title: 'Guest Satisfaction', 
      icon: Heart, 
      unit: '/5', 
      target: 4.5,
      color: COLORS.warning
    }
  ];

  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">📊 Business Metrics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {businessMetrics.map(metric => {
          const data = metricSummary[metric.key];
          const value = data?.average || 0;
          const isGood = value >= metric.target;
          
          return (
            <div key={metric.key} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <metric.icon className={`w-6 h-6`} style={{ color: metric.color }} />
                {isGood ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
              </div>
              
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-600">{metric.title}</h3>
                <p className={`text-2xl font-bold ${isGood ? 'text-green-600' : 'text-yellow-600'}`}>
                  {value.toFixed(1)}{metric.unit}
                </p>
                <p className="text-xs text-gray-500">
                  Target: {metric.target}{metric.unit}
                </p>
                {data && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${isGood ? 'bg-green-500' : 'bg-yellow-500'}`}
                      style={{ width: `${Math.min(100, (value / metric.target) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to transform metric data for charts
function transformMetricData(metricData: any): any[] {
  if (!metricData?.values) return [];
  
  return metricData.values.slice(-20).map((value: number, index: number) => ({
    timestamp: `${index * 5}min ago`,
    value
  }));
}

export default QualityDashboard;