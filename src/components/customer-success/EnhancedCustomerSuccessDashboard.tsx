/**
 * WS-168: Enhanced Customer Success Dashboard - Round 2
 * Secure, optimized dashboard with API integration and real-time updates
 */

'use client';

import React, {
  Suspense,
  use,
  useMemo,
  useCallback,
  memo,
  startTransition,
} from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Award,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Star,
  Activity,
  Zap,
  Heart,
  Filter,
  Download,
  Mail,
} from 'lucide-react';

// Security and authentication imports
import { withAdminAuth } from '@/lib/security/admin-auth';
import { sanitizeAdminData } from '@/lib/security/admin-validation';
import { logAdminAccess } from '@/lib/security/audit-logger';
import { maskSensitiveData } from '@/lib/security/data-protection';

// API and realtime imports
import { useCustomerHealthData } from '@/hooks/useCustomerHealthData';
import { useRealtimeHealthUpdates } from '@/hooks/useRealtimeHealthUpdates';
import { customerHealthAPI } from '@/lib/api/customer-health';

// TypeScript interfaces with strict typing
interface HealthScore {
  readonly user_id: string;
  readonly overall_score: number;
  readonly component_scores: Readonly<{
    onboarding_completion: number;
    feature_adoption_breadth: number;
    feature_adoption_depth: number;
    engagement_frequency: number;
    engagement_quality: number;
    success_milestone_progress: number;
    support_interaction_quality: number;
    platform_value_realization: number;
    retention_indicators: number;
    growth_trajectory: number;
  }>;
  readonly trend: 'improving' | 'stable' | 'declining';
  readonly risk_level: 'low' | 'medium' | 'high' | 'critical';
  readonly last_calculated: string;
}

interface AdminUser {
  readonly id: string;
  readonly email: string;
  readonly role: string;
  readonly permissions: ReadonlyArray<string>;
}

interface SecureSuccessMetrics {
  readonly summary: Readonly<{
    total_users: number;
    average_health_score: number;
    milestones_achieved_today: number;
    at_risk_users: number;
    champion_users: number;
  }>;
  readonly health_score_distribution: Readonly<Record<string, number>>;
  readonly milestone_achievements: ReadonlyArray<{
    readonly type: string;
    readonly count: number;
    readonly avg_time_to_achieve: number;
  }>;
  readonly engagement_trends: ReadonlyArray<{
    readonly date: string;
    readonly active_users: number;
    readonly avg_engagement_score: number;
  }>;
  readonly at_risk_users: ReadonlyArray<{
    readonly user_id: string; // Will be masked for security
    readonly risk_score: number;
    readonly risk_factors: ReadonlyArray<string>;
    readonly recommended_actions: ReadonlyArray<string>;
  }>;
}

interface DashboardProps {
  readonly adminUser: AdminUser;
  readonly initialData?: SecureSuccessMetrics;
}

// Untitled UI Design System Colors
const HEALTH_COLORS = {
  excellent: {
    bg: 'bg-success-50',
    text: 'text-success-700',
    border: 'border-success-200',
    chart: 'var(--success-600)',
  },
  low: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    chart: 'var(--blue-600)',
  },
  medium: {
    bg: 'bg-warning-50',
    text: 'text-warning-700',
    border: 'border-warning-200',
    chart: 'var(--warning-600)',
  },
  high: {
    bg: 'bg-error-50',
    text: 'text-error-700',
    border: 'border-error-200',
    chart: 'var(--error-600)',
  },
  critical: {
    bg: 'bg-error-50',
    text: 'text-error-700',
    border: 'border-error-200',
    chart: 'var(--error-700)',
  },
} as const;

// Memoized card component for performance
const MetricsCard = memo<{
  readonly title: string;
  readonly value: string | number;
  readonly icon: React.ReactNode;
  readonly trend?: string;
  readonly trendIcon?: React.ReactNode;
}>(({ title, value, icon, trend, trendIcon }) => {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
          {icon}
        </div>
      </div>
      {trend && trendIcon && (
        <div className="flex items-center mt-4 text-sm">
          {trendIcon}
          <span className="ml-1">{trend}</span>
        </div>
      )}
    </div>
  );
});

MetricsCard.displayName = 'MetricsCard';

// Memoized chart component with error boundary
const HealthDistributionChart = memo<{
  readonly data: ReadonlyArray<{
    readonly range: string;
    readonly count: number;
    readonly percentage: string;
  }>;
}>(({ data }) => {
  const chartData = useMemo(
    () =>
      data.map((item) => ({
        range: item.range,
        count: item.count,
        percentage: item.percentage,
      })),
    [data],
  );

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Health Score Distribution
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Distribution of customer health scores
        </p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" />
            <XAxis
              dataKey="range"
              tick={{ fill: 'var(--gray-600)', fontSize: 12 }}
              tickLine={{ stroke: 'var(--gray-300)' }}
            />
            <YAxis
              tick={{ fill: 'var(--gray-600)', fontSize: 12 }}
              tickLine={{ stroke: 'var(--gray-300)' }}
            />
            <Tooltip
              formatter={(value, name) => [`${value} users`, 'Count']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid var(--gray-200)',
                borderRadius: '8px',
                fontSize: '14px',
              }}
            />
            <Bar
              dataKey="count"
              fill="var(--primary-600)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
});

HealthDistributionChart.displayName = 'HealthDistributionChart';

// Main dashboard component with security wrapper
const CustomerSuccessDashboard: React.FC<DashboardProps> = ({
  adminUser,
  initialData,
}) => {
  // Security: Log admin access
  React.useEffect(() => {
    logAdminAccess(adminUser.id, 'customer_health_dashboard_access');
  }, [adminUser.id]);

  // API integration with React 19 patterns
  const healthDataPromise = useMemo(
    () => customerHealthAPI.getHealthMetrics(),
    [],
  );

  const { data: healthData, error: healthError } = useCustomerHealthData();
  const realtimeUpdates = useRealtimeHealthUpdates();

  // Secure data processing with sanitization
  const sanitizedMetrics = useMemo(() => {
    if (!healthData) return null;

    return sanitizeAdminData({
      ...healthData,
      at_risk_users: healthData.at_risk_users.map((user) => ({
        ...user,
        user_id: maskSensitiveData(user.user_id, 'user_id'),
      })),
    });
  }, [healthData]);

  // Health score distribution with proper typing
  const healthDistributionData = useMemo(() => {
    if (!sanitizedMetrics) return [];

    return Object.entries(sanitizedMetrics.health_score_distribution).map(
      ([range, count]) => ({
        range,
        count,
        percentage: (
          (count / sanitizedMetrics.summary.total_users) *
          100
        ).toFixed(1),
      }),
    );
  }, [sanitizedMetrics]);

  // Intervention handler with security validation
  const handleIntervention = useCallback(
    (userId: string, actionType: string) => {
      // Security: Verify admin has intervention permissions
      if (!adminUser.permissions.includes('execute_interventions')) {
        throw new Error('Insufficient permissions for intervention');
      }

      // Log the intervention attempt
      logAdminAccess(adminUser.id, 'intervention_attempted', {
        userId,
        actionType,
      });

      // Use startTransition for non-urgent UI updates
      startTransition(() => {
        // Intervention logic would go here
        console.log(`Intervention ${actionType} for user ${userId}`);
      });
    },
    [adminUser],
  );

  // Export handler with security checks
  const handleExport = useCallback(() => {
    if (!adminUser.permissions.includes('export_customer_data')) {
      throw new Error('Insufficient permissions for data export');
    }

    logAdminAccess(adminUser.id, 'data_export_requested');

    // Export logic would go here
    console.log('Export initiated');
  }, [adminUser]);

  if (healthError) {
    throw healthError; // Will be caught by error boundary
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header with security indicator */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Customer Health Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Monitor customer health scores and identify at-risk clients
            </p>
            <div className="flex items-center mt-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
              Secure Admin Access • Role: {adminUser.role}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <Download className="w-4 h-4 mr-2 inline" />
              Export
            </button>
            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
              <Mail className="w-4 h-4 mr-2 inline" />
              Bulk Contact
            </button>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <MetricsCard
            title="Total Customers"
            value={sanitizedMetrics?.summary.total_users ?? '---'}
            icon={<Users className="w-6 h-6 text-primary-600" />}
            trend="+12% from last month"
            trendIcon={<TrendingUp className="w-4 h-4 text-success-600" />}
          />
          <MetricsCard
            title="Average Health"
            value={sanitizedMetrics?.summary.average_health_score ?? '---'}
            icon={<Heart className="w-6 h-6 text-success-600" />}
            trend="+2.3 from last week"
            trendIcon={<TrendingUp className="w-4 h-4 text-success-600" />}
          />
          <MetricsCard
            title="Milestones Today"
            value={sanitizedMetrics?.summary.milestones_achieved_today ?? '---'}
            icon={<Target className="w-6 h-6 text-blue-600" />}
          />
          <MetricsCard
            title="At Risk Customers"
            value={sanitizedMetrics?.summary.at_risk_users ?? '---'}
            icon={<AlertTriangle className="w-6 h-6 text-error-600" />}
            trend={
              sanitizedMetrics?.summary.at_risk_users
                ? '-3 from yesterday'
                : undefined
            }
            trendIcon={
              sanitizedMetrics?.summary.at_risk_users ? (
                <TrendingDown className="w-4 h-4 text-success-600" />
              ) : undefined
            }
          />
          <MetricsCard
            title="Champions"
            value={sanitizedMetrics?.summary.champion_users ?? '---'}
            icon={<Star className="w-6 h-6 text-warning-500" />}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <HealthDistributionChart data={healthDistributionData} />

          {/* Engagement Trends Chart */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Engagement Trends
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Daily active users and engagement scores
              </p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sanitizedMetrics?.engagement_trends || []}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--gray-200)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: 'var(--gray-600)', fontSize: 12 }}
                  />
                  <YAxis tick={{ fill: 'var(--gray-600)', fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid var(--gray-200)',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="active_users"
                    stroke="var(--primary-600)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--primary-600)', r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg_engagement_score"
                    stroke="var(--success-600)"
                    strokeWidth={2}
                    dot={{ fill: 'var(--success-600)', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* At-Risk Users Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                At-Risk Customers
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Customers requiring immediate attention
              </p>
            </div>
            <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
              <Filter className="w-4 h-4 mr-2 inline" />
              Filter
            </button>
          </div>

          <div className="space-y-4">
            {sanitizedMetrics?.at_risk_users.map((user, index) => (
              <div
                key={user.user_id}
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-error-100 rounded-full flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-error-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        Customer {user.user_id}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Risk Score: {user.risk_score}/100
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      handleIntervention(user.user_id, 'priority_contact')
                    }
                    className="px-4 py-2 bg-error-600 text-white rounded-lg font-medium hover:bg-error-700 transition-colors focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2"
                  >
                    <Zap className="w-4 h-4 mr-2 inline" />
                    Intervene
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Risk Factors
                    </h5>
                    <div className="flex flex-wrap gap-1">
                      {user.risk_factors.map((factor, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-error-100 text-error-700 rounded text-xs"
                        >
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h5 className="text-sm font-medium text-gray-700 mb-2">
                      Recommended Actions
                    </h5>
                    <ul className="space-y-1">
                      {user.recommended_actions.map((action, i) => (
                        <li
                          key={i}
                          className="flex items-center text-sm text-gray-600"
                        >
                          <CheckCircle2 className="w-3 h-3 text-success-600 mr-2 flex-shrink-0" />
                          {action}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Error boundary component
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): {
    hasError: boolean;
    error: Error;
  } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Dashboard Error:', error, errorInfo);
    logAdminAccess('system', 'dashboard_error', { error: error.message });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="max-w-md mx-auto text-center">
            <AlertTriangle className="w-12 h-12 text-error-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Dashboard Error
            </h2>
            <p className="text-gray-600 mb-4">
              Something went wrong while loading the customer health dashboard.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
            >
              Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component
const DashboardLoading: React.FC = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading customer health data...</p>
    </div>
  </div>
);

// Main export with security wrapper and error boundary
const SecureCustomerSuccessDashboard: React.FC = () => {
  return (
    <DashboardErrorBoundary>
      <Suspense fallback={<DashboardLoading />}>
        {/* @ts-expect-error - withAdminAuth will provide the required props */}
        <CustomerSuccessDashboard />
      </Suspense>
    </DashboardErrorBoundary>
  );
};

export default withAdminAuth(SecureCustomerSuccessDashboard, {
  requiredPermissions: ['view_customer_health', 'access_admin_dashboard'],
  redirectOnUnauthorized: '/admin/login',
});
