/**
 * WS-133: Customer Success Metrics Dashboard
 * Comprehensive dashboard for tracking customer success, health scores, and engagement
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  CheckCircle,
  Clock,
  Star,
  Activity,
  Zap,
  Heart,
} from 'lucide-react';

interface HealthScore {
  user_id: string;
  overall_score: number;
  component_scores: {
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
  };
  trend: 'improving' | 'stable' | 'declining';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  last_calculated: string;
}

interface MilestoneAnalytics {
  user_id: string;
  period_days: number;
  summary: {
    total_milestones_completed: number;
    total_points_earned: number;
    average_completion_time_hours: number;
    completion_rate_percentage: number;
    streak_days: number;
    difficulty_progression: string;
  };
  category_breakdown: Record<
    string,
    {
      completed: number;
      in_progress: number;
      average_time: number;
      success_rate: number;
    }
  >;
  recent_achievements: any[];
  upcoming_milestones: any[];
  performance_trend: 'improving' | 'stable' | 'declining';
  recommendations: string[];
}

interface SuccessMetrics {
  summary: {
    total_users: number;
    average_health_score: number;
    milestones_achieved_today: number;
    at_risk_users: number;
    champion_users: number;
  };
  health_score_distribution: Record<string, number>;
  milestone_achievements: {
    type: string;
    count: number;
    avg_time_to_achieve: number;
  }[];
  engagement_trends: {
    date: string;
    active_users: number;
    avg_engagement_score: number;
  }[];
  at_risk_users: {
    user_id: string;
    risk_score: number;
    risk_factors: string[];
    recommended_actions: string[];
  }[];
}

interface TriggerAnalytics {
  overview: {
    total_triggers_sent: number;
    success_rate: number;
    average_response_time_hours: number;
    user_satisfaction_score: number;
  };
  by_category: Record<
    string,
    {
      sent: number;
      success_rate: number;
      avg_response_time: number;
      user_satisfaction: number;
    }
  >;
  top_performing_triggers: {
    trigger_name: string;
    success_rate: number;
    user_satisfaction: number;
    total_sent: number;
  }[];
  improvement_recommendations: string[];
}

const CustomerSuccessDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(true);
  const [successMetrics, setSuccessMetrics] = useState<SuccessMetrics | null>(
    null,
  );
  const [healthData, setHealthData] = useState<HealthScore[]>([]);
  const [milestoneData, setMilestoneData] = useState<MilestoneAnalytics | null>(
    null,
  );
  const [triggerData, setTriggerData] = useState<TriggerAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // In a real implementation, these would be API calls
      const [
        metricsResponse,
        healthResponse,
        milestonesResponse,
        triggersResponse,
      ] = await Promise.allSettled([
        fetch('/api/customer-success/metrics'),
        fetch('/api/customer-success/health-scores'),
        fetch('/api/customer-success/milestones'),
        fetch('/api/customer-success/triggers'),
      ]);

      // Mock data for demonstration
      setSuccessMetrics({
        summary: {
          total_users: 1247,
          average_health_score: 78,
          milestones_achieved_today: 23,
          at_risk_users: 45,
          champion_users: 189,
        },
        health_score_distribution: {
          '90-100': 189,
          '80-89': 342,
          '70-79': 398,
          '60-69': 201,
          '50-59': 87,
          '40-49': 23,
          '30-39': 7,
        },
        milestone_achievements: [
          { type: 'onboarding', count: 156, avg_time_to_achieve: 2.4 },
          { type: 'feature_adoption', count: 134, avg_time_to_achieve: 18.7 },
          { type: 'engagement', count: 98, avg_time_to_achieve: 72.1 },
          { type: 'business_growth', count: 45, avg_time_to_achieve: 168.5 },
        ],
        engagement_trends: [
          { date: '2024-01-01', active_users: 876, avg_engagement_score: 72 },
          { date: '2024-01-02', active_users: 923, avg_engagement_score: 74 },
          { date: '2024-01-03', active_users: 945, avg_engagement_score: 76 },
          { date: '2024-01-04', active_users: 1001, avg_engagement_score: 78 },
          { date: '2024-01-05', active_users: 1089, avg_engagement_score: 79 },
        ],
        at_risk_users: [
          {
            user_id: 'user_123',
            risk_score: 85,
            risk_factors: ['Low engagement', 'Incomplete onboarding'],
            recommended_actions: ['Schedule check-in', 'Send tutorial'],
          },
          {
            user_id: 'user_456',
            risk_score: 78,
            risk_factors: ['No recent activity', 'Support tickets'],
            recommended_actions: ['Personal outreach', 'Feature demo'],
          },
        ],
      });

      setTriggerData({
        overview: {
          total_triggers_sent: 3456,
          success_rate: 67,
          average_response_time_hours: 4.2,
          user_satisfaction_score: 82,
        },
        by_category: {
          onboarding: {
            sent: 567,
            success_rate: 78,
            avg_response_time: 2.1,
            user_satisfaction: 85,
          },
          feature_adoption: {
            sent: 892,
            success_rate: 65,
            avg_response_time: 5.4,
            user_satisfaction: 79,
          },
          at_risk_intervention: {
            sent: 234,
            success_rate: 45,
            avg_response_time: 8.7,
            user_satisfaction: 74,
          },
        },
        top_performing_triggers: [
          {
            trigger_name: 'Welcome Sequence',
            success_rate: 85,
            user_satisfaction: 88,
            total_sent: 234,
          },
          {
            trigger_name: 'First Milestone Celebration',
            success_rate: 82,
            user_satisfaction: 91,
            total_sent: 189,
          },
          {
            trigger_name: 'Feature Discovery',
            success_rate: 71,
            user_satisfaction: 83,
            total_sent: 456,
          },
        ],
        improvement_recommendations: [
          'Improve personalization in at-risk intervention triggers',
          'Reduce response time for progress nudge triggers',
          'A/B test different celebration message formats',
        ],
      });

      setMilestoneData({
        user_id: 'aggregate',
        period_days: 30,
        summary: {
          total_milestones_completed: 2341,
          total_points_earned: 125670,
          average_completion_time_hours: 36.8,
          completion_rate_percentage: 73,
          streak_days: 12,
          difficulty_progression: 'Advancing to expert level',
        },
        category_breakdown: {
          getting_started: {
            completed: 456,
            in_progress: 123,
            average_time: 2.4,
            success_rate: 89,
          },
          core_features: {
            completed: 678,
            in_progress: 234,
            average_time: 18.7,
            success_rate: 76,
          },
          advanced_features: {
            completed: 234,
            in_progress: 156,
            average_time: 45.2,
            success_rate: 65,
          },
        },
        recent_achievements: [],
        upcoming_milestones: [],
        performance_trend: 'improving',
        recommendations: [
          'Focus on advanced feature adoption',
          'Implement peer learning programs',
        ],
      });
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error('Dashboard loading error:', err);
    } finally {
      setLoading(false);
    }
  };

  const healthScoreColor = (score: number) => {
    if (score >= 90) return '#10B981'; // Green
    if (score >= 80) return '#3B82F6'; // Blue
    if (score >= 70) return '#F59E0B'; // Yellow
    if (score >= 60) return '#EF4444'; // Orange
    return '#DC2626'; // Red
  };

  const riskLevelColor = (level: string) => {
    switch (level) {
      case 'low':
        return 'bg-green-100 text-green-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const trendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-blue-600" />;
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const healthDistributionData = useMemo(() => {
    if (!successMetrics) return [];
    return Object.entries(successMetrics.health_score_distribution).map(
      ([range, count]) => ({
        range,
        count,
        percentage: (
          (count / successMetrics.summary.total_users) *
          100
        ).toFixed(1),
      }),
    );
  }, [successMetrics]);

  const COLORS = [
    '#10B981',
    '#3B82F6',
    '#F59E0B',
    '#EF4444',
    '#8B5CF6',
    '#F97316',
    '#EC4899',
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading customer success data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="mx-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {error}. Please try refreshing the page or contact support if the
          problem persists.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Customer Success Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor customer health, engagement, and success metrics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border rounded-lg"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <Button onClick={loadDashboardData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="health">Health Scores</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="at-risk">At Risk</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(successMetrics?.summary.total_users || 0)}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Active customer accounts
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Health Score
                </CardTitle>
                <Heart className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div
                  className="text-2xl font-bold"
                  style={{
                    color: healthScoreColor(
                      successMetrics?.summary.average_health_score || 0,
                    ),
                  }}
                >
                  {successMetrics?.summary.average_health_score || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Out of 100 points</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Milestones Today
                </CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {successMetrics?.summary.milestones_achieved_today || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Achieved today</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  At Risk Users
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {successMetrics?.summary.at_risk_users || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Need attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Champion Users
                </CardTitle>
                <Star className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {successMetrics?.summary.champion_users || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">Highly engaged</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Health Score Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Health Score Distribution</CardTitle>
                <CardDescription>
                  Distribution of customer health scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={healthDistributionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        formatNumber(value as number),
                        'Users',
                      ]}
                    />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Engagement Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Trends</CardTitle>
                <CardDescription>
                  Daily active users and engagement scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={successMetrics?.engagement_trends || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="active_users" fill="#8884d8" />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="avg_engagement_score"
                      stroke="#ff7300"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Milestone Achievements */}
          <Card>
            <CardHeader>
              <CardTitle>Milestone Achievements by Type</CardTitle>
              <CardDescription>
                Breakdown of completed milestones and average completion times
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {successMetrics?.milestone_achievements.map(
                  (milestone, index) => (
                    <div key={milestone.type} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Award
                          className="h-5 w-5"
                          style={{ color: COLORS[index % COLORS.length] }}
                        />
                        <h3 className="font-semibold capitalize">
                          {milestone.type.replace('_', ' ')}
                        </h3>
                      </div>
                      <p className="text-2xl font-bold">{milestone.count}</p>
                      <p className="text-sm text-gray-600">
                        Avg: {milestone.avg_time_to_achieve.toFixed(1)}h
                      </p>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Health Score Components */}
            <Card>
              <CardHeader>
                <CardTitle>Health Score Components</CardTitle>
                <CardDescription>
                  Breakdown of factors contributing to customer health
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  {
                    name: 'Onboarding Completion',
                    value: 85,
                    icon: CheckCircle,
                  },
                  { name: 'Feature Adoption', value: 72, icon: Zap },
                  { name: 'Engagement Frequency', value: 68, icon: Activity },
                  { name: 'Milestone Progress', value: 79, icon: Target },
                  { name: 'Support Quality', value: 91, icon: Heart },
                ].map((component) => (
                  <div
                    key={component.name}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <component.icon className="h-4 w-4 text-gray-600" />
                      <span className="text-sm">{component.name}</span>
                    </div>
                    <div className="flex items-center gap-2 min-w-24">
                      <Progress value={component.value} className="w-16" />
                      <span className="text-sm font-medium w-8">
                        {component.value}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Health Score Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Health Score Trends</CardTitle>
                <CardDescription>
                  Average health score over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={[
                      { date: 'Week 1', score: 72 },
                      { date: 'Week 2', score: 74 },
                      { date: 'Week 3', score: 76 },
                      { date: 'Week 4', score: 78 },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[60, 90]} />
                    <Tooltip />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#3B82F6"
                      fill="#93C5FD"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Risk Factors */}
          <Card>
            <CardHeader>
              <CardTitle>Common Risk Factors</CardTitle>
              <CardDescription>
                Most frequent factors contributing to customer health risks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    factor: 'Incomplete Onboarding',
                    count: 45,
                    severity: 'high',
                  },
                  {
                    factor: 'Low Feature Adoption',
                    count: 32,
                    severity: 'medium',
                  },
                  { factor: 'Poor Engagement', count: 28, severity: 'high' },
                  {
                    factor: 'No Recent Activity',
                    count: 23,
                    severity: 'critical',
                  },
                  { factor: 'Support Issues', count: 19, severity: 'medium' },
                  { factor: 'Failed Milestones', count: 15, severity: 'low' },
                ].map((risk) => (
                  <div key={risk.factor} className="p-3 border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm">{risk.factor}</h3>
                      <Badge
                        className={`text-xs ${riskLevelColor(risk.severity)}`}
                      >
                        {risk.severity}
                      </Badge>
                    </div>
                    <p className="text-xl font-bold">{risk.count}</p>
                    <p className="text-xs text-gray-600">affected users</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="milestones" className="space-y-6">
          {/* Milestone Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed This Month
                </CardTitle>
                <Award className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {milestoneData?.summary.total_milestones_completed || 0}
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  +
                  {Math.round(
                    (milestoneData?.summary.total_milestones_completed || 0) *
                      0.15,
                  )}{' '}
                  vs last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Completion Time
                </CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {milestoneData?.summary.average_completion_time_hours.toFixed(
                    1,
                  )}
                  h
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Average time to complete
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completion Rate
                </CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {milestoneData?.summary.completion_rate_percentage}%
                </div>
                <Progress
                  value={milestoneData?.summary.completion_rate_percentage || 0}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Current Streak
                </CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {milestoneData?.summary.streak_days} days
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  {milestoneData?.summary.difficulty_progression}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Milestones by Category</CardTitle>
              <CardDescription>
                Progress across different milestone categories
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {milestoneData &&
                  Object.entries(milestoneData.category_breakdown).map(
                    ([category, data], index) => (
                      <div key={category} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium capitalize">
                            {category.replace('_', ' ')}
                          </h3>
                          <Badge variant="outline">
                            {data.success_rate.toFixed(0)}% success rate
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <p className="text-gray-600">Completed</p>
                            <p className="text-xl font-bold text-green-600">
                              {data.completed}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">In Progress</p>
                            <p className="text-xl font-bold text-blue-600">
                              {data.in_progress}
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Avg Time</p>
                            <p className="text-xl font-bold text-gray-900">
                              {data.average_time.toFixed(1)}h
                            </p>
                          </div>
                        </div>
                        <Progress value={data.success_rate} className="mt-3" />
                      </div>
                    ),
                  )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-6">
          {/* Trigger Analytics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Triggers Sent
                </CardTitle>
                <Zap className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(triggerData?.overview.total_triggers_sent || 0)}
                </div>
                <p className="text-xs text-gray-600 mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Success Rate
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {triggerData?.overview.success_rate}%
                </div>
                <Progress
                  value={triggerData?.overview.success_rate || 0}
                  className="mt-2"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Response Time
                </CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {triggerData?.overview.average_response_time_hours.toFixed(1)}
                  h
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  Time to user response
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Satisfaction Score
                </CardTitle>
                <Star className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {triggerData?.overview.user_satisfaction_score}
                </div>
                <p className="text-xs text-gray-600 mt-1">Out of 100</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Performing Triggers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Triggers</CardTitle>
              <CardDescription>
                Highest success rates and user satisfaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {triggerData?.top_performing_triggers.map((trigger, index) => (
                  <div
                    key={trigger.trigger_name}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-bold text-blue-600">
                          {index + 1}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium">{trigger.trigger_name}</h3>
                        <p className="text-sm text-gray-600">
                          {trigger.total_sent} sent
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {trigger.success_rate}%
                      </p>
                      <p className="text-sm text-gray-600">
                        Satisfaction: {trigger.user_satisfaction}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Improvement Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Improvement Recommendations</CardTitle>
              <CardDescription>
                AI-generated suggestions to optimize engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {triggerData?.improvement_recommendations.map(
                  (recommendation, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg"
                    >
                      <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5" />
                      <p className="text-sm">{recommendation}</p>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="at-risk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>At-Risk Users</CardTitle>
              <CardDescription>
                Users requiring immediate attention and intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {successMetrics?.at_risk_users.map((user, index) => (
                  <div key={user.user_id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                          <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">User {user.user_id}</h3>
                          <p className="text-sm text-gray-600">
                            Risk Score: {user.risk_score}/100
                          </p>
                        </div>
                      </div>
                      <Badge
                        className={riskLevelColor(
                          user.risk_score > 80 ? 'critical' : 'high',
                        )}
                      >
                        {user.risk_score > 80 ? 'Critical' : 'High Risk'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Risk Factors
                        </h4>
                        <div className="space-y-1">
                          {user.risk_factors.map((factor, i) => (
                            <span
                              key={i}
                              className="inline-block text-xs bg-red-100 text-red-800 px-2 py-1 rounded mr-1"
                            >
                              {factor}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-2">
                          Recommended Actions
                        </h4>
                        <div className="space-y-1">
                          {user.recommended_actions.map((action, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-2 text-sm"
                            >
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span>{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <Button size="sm" variant="outline">
                        Schedule Call
                      </Button>
                      <Button size="sm" variant="outline">
                        Send Resources
                      </Button>
                      <Button size="sm" variant="outline">
                        Create Task
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerSuccessDashboard;
