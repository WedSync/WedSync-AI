'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Users,
  UserX,
  Clock,
  Target,
  Activity,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  Shield,
  Zap,
  Heart,
  ArrowRight,
} from 'lucide-react';

interface ChurnRiskUser {
  userId: string;
  organizationId: string;
  name: string;
  email: string;
  tier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  subscriptionDate: string;
  lastActivity: string;
  churnScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
  interventionRecommendations: Array<{
    type: 'email' | 'call' | 'discount' | 'training' | 'feature';
    priority: 'high' | 'medium' | 'low';
    description: string;
    expectedImpact: number;
  }>;
  engagementMetrics: {
    loginFrequency: number;
    featureUsage: number;
    supportTickets: number;
    lastPayment: string;
    billingIssues: boolean;
  };
  predictionConfidence: number;
  timeToChurn: number; // days
  lifetimeValue: number;
  retentionProbability: number;
}

interface ChurnAnalytics {
  overallChurnRate: number;
  predictedChurnRate: number;
  churnTrend: 'increasing' | 'stable' | 'decreasing';
  highRiskUsers: ChurnRiskUser[];
  churnByTier: Array<{
    tier: string;
    churnRate: number;
    userCount: number;
    revenue: number;
  }>;
  churnFactors: Array<{
    factor: string;
    frequency: number;
    impact: number;
    category: 'product' | 'billing' | 'support' | 'engagement' | 'external';
  }>;
  retentionStrategies: Array<{
    strategy: string;
    effectiveness: number;
    cost: number;
    applicableUsers: number;
  }>;
  timelineAnalysis: Array<{
    month: string;
    churnRate: number;
    newUsers: number;
    lostUsers: number;
    retainedUsers: number;
    interventionSuccess: number;
  }>;
  cohortAnalysis: Array<{
    cohort: string;
    month0: number;
    month1: number;
    month3: number;
    month6: number;
    month12: number;
  }>;
}

interface ChurnRiskMonitorProps {
  timeRange?: '30d' | '90d' | '6m' | '1y';
  riskLevel?: 'all' | 'low' | 'medium' | 'high' | 'critical';
  tier?: 'all' | 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  onUserAction?: (userId: string, action: string) => void;
}

const RISK_COLORS = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#EF4444',
  critical: '#DC2626',
};

const TIER_COLORS = {
  free: '#6B7280',
  starter: '#8B5CF6',
  professional: '#06B6D4',
  scale: '#10B981',
  enterprise: '#F59E0B',
};

export default function ChurnRiskMonitor({
  timeRange = '90d',
  riskLevel = 'all',
  tier = 'all',
  onUserAction,
}: ChurnRiskMonitorProps) {
  const [churnData, setChurnData] = useState<ChurnAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedView, setSelectedView] = useState<
    'overview' | 'users' | 'factors' | 'strategies' | 'cohorts'
  >('overview');
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState(riskLevel);
  const [selectedTier, setSelectedTier] = useState(tier);
  const [error, setError] = useState<string | null>(null);

  const fetchChurnAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ml/predictions/churn-risk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timeRange: selectedTimeRange,
          riskLevel:
            selectedRiskLevel === 'all' ? undefined : selectedRiskLevel,
          tier: selectedTier === 'all' ? undefined : selectedTier,
          includeInterventions: true,
          includeCohortAnalysis: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch churn analytics');
      }

      const data = await response.json();
      setChurnData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Churn analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChurnAnalytics();
  }, [selectedTimeRange, selectedRiskLevel, selectedTier]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getRiskColor = (riskLevel: string) => {
    return RISK_COLORS[riskLevel as keyof typeof RISK_COLORS] || '#6B7280';
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'high':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'low':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInterventionIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'call':
        return <Phone className="h-4 w-4" />;
      case 'discount':
        return <CreditCard className="h-4 w-4" />;
      case 'training':
        return <Users className="h-4 w-4" />;
      case 'feature':
        return <Zap className="h-4 w-4" />;
      default:
        return <Target className="h-4 w-4" />;
    }
  };

  const handleUserAction = (userId: string, action: string) => {
    if (onUserAction) {
      onUserAction(userId, action);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-red-600" />
            Churn Risk Monitor
          </CardTitle>
          <CardDescription>
            Analyzing user retention and churn risk patterns...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Error loading churn analytics: {error}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchChurnAnalytics}
                className="ml-2"
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!churnData) {
    return null;
  }

  const criticalRiskCount = churnData.highRiskUsers.filter(
    (u) => u.riskLevel === 'critical',
  ).length;
  const highRiskCount = churnData.highRiskUsers.filter(
    (u) => u.riskLevel === 'high',
  ).length;
  const potentialRevenueLoss = churnData.highRiskUsers
    .filter((u) => u.riskLevel === 'critical' || u.riskLevel === 'high')
    .reduce((sum, user) => sum + user.lifetimeValue, 0);

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-red-600" />
            Churn Risk Monitor
          </CardTitle>
          <CardDescription>
            AI-powered user retention analysis and early warning system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Time Range
              </label>
              <Select
                value={selectedTimeRange}
                onValueChange={setSelectedTimeRange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="6m">Last 6 months</SelectItem>
                  <SelectItem value="1y">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Risk Level
              </label>
              <Select
                value={selectedRiskLevel}
                onValueChange={setSelectedRiskLevel}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="critical">Critical Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="low">Low Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Subscription Tier
              </label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={fetchChurnAnalytics} className="w-full">
                Refresh Analysis
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Summary */}
      {(criticalRiskCount > 0 || highRiskCount > 0) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Immediate Action Required:</strong> {criticalRiskCount}{' '}
            users at critical risk and {highRiskCount} at high risk of churning.
            Potential revenue loss: {formatCurrency(potentialRevenueLoss)}
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Current Churn Rate
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {churnData.overallChurnRate.toFixed(1)}%
                </p>
                <div className="flex items-center gap-1 mt-1">
                  {churnData.churnTrend === 'increasing' ? (
                    <TrendingUp className="h-3 w-3 text-red-600" />
                  ) : churnData.churnTrend === 'decreasing' ? (
                    <TrendingDown className="h-3 w-3 text-green-600" />
                  ) : (
                    <Activity className="h-3 w-3 text-gray-600" />
                  )}
                  <span className="text-xs text-gray-500 capitalize">
                    {churnData.churnTrend}
                  </span>
                </div>
              </div>
              <UserX className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Predicted Churn Rate
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {churnData.predictedChurnRate.toFixed(1)}%
                </p>
                <p className="text-sm text-gray-500">next 30 days</p>
              </div>
              <Target className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  High-Risk Users
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {criticalRiskCount + highRiskCount}
                </p>
                <p className="text-sm text-gray-500">need intervention</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Revenue at Risk
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(potentialRevenueLoss)}
                </p>
                <p className="text-sm text-gray-500">potential loss</p>
              </div>
              <CreditCard className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Analysis */}
      <Tabs value={selectedView} onValueChange={setSelectedView as any}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">At-Risk Users</TabsTrigger>
          <TabsTrigger value="factors">Risk Factors</TabsTrigger>
          <TabsTrigger value="strategies">Strategies</TabsTrigger>
          <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Churn by Tier */}
            <Card>
              <CardHeader>
                <CardTitle>Churn Rate by Tier</CardTitle>
                <CardDescription>
                  User retention across subscription tiers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={churnData.churnByTier}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="tier" />
                    <YAxis />
                    <Tooltip
                      formatter={(value, name) => [
                        name === 'churnRate'
                          ? `${(value as number).toFixed(1)}%`
                          : name === 'revenue'
                            ? formatCurrency(value as number)
                            : value,
                        name === 'churnRate'
                          ? 'Churn Rate'
                          : name === 'userCount'
                            ? 'Users'
                            : 'Revenue',
                      ]}
                    />
                    <Bar dataKey="churnRate" fill="#EF4444" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Timeline Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Retention Timeline</CardTitle>
                <CardDescription>
                  User acquisition and retention over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={churnData.timelineAnalysis}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="newUsers"
                      stackId="1"
                      stroke="#10B981"
                      fill="#10B981"
                      name="New Users"
                    />
                    <Area
                      type="monotone"
                      dataKey="retainedUsers"
                      stackId="1"
                      stroke="#06B6D4"
                      fill="#06B6D4"
                      name="Retained Users"
                    />
                    <Area
                      type="monotone"
                      dataKey="lostUsers"
                      stackId="2"
                      stroke="#EF4444"
                      fill="#EF4444"
                      name="Lost Users"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Risk Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Risk Level Distribution</CardTitle>
              <CardDescription>
                Current risk assessment across all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {Object.entries(RISK_COLORS).map(([level, color]) => {
                  const count = churnData.highRiskUsers.filter(
                    (u) => u.riskLevel === level,
                  ).length;
                  const percentage =
                    churnData.highRiskUsers.length > 0
                      ? (count / churnData.highRiskUsers.length) * 100
                      : 0;

                  return (
                    <div
                      key={level}
                      className="text-center p-4 border rounded-lg"
                    >
                      <div className="flex items-center justify-center mb-2">
                        {getRiskIcon(level)}
                      </div>
                      <p className="text-2xl font-bold" style={{ color }}>
                        {count}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">
                        {level} Risk
                      </p>
                      <p className="text-xs text-gray-500">
                        {percentage.toFixed(1)}%
                      </p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Users at Risk</CardTitle>
              <CardDescription>
                Users with high churn probability requiring immediate
                intervention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {churnData.highRiskUsers
                  .sort((a, b) => b.churnScore - a.churnScore)
                  .slice(0, 20)
                  .map((user, index) => (
                    <div key={user.userId} className="border rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage
                              src={`/api/users/${user.userId}/avatar`}
                            />
                            <AvatarFallback>
                              {user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{user.name}</h3>
                              <Badge
                                style={{
                                  backgroundColor: getRiskColor(user.riskLevel),
                                  color: 'white',
                                }}
                              >
                                {user.riskLevel}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600">
                              {user.email}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="capitalize">
                                {user.tier}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                Customer for{' '}
                                {Math.round(
                                  (Date.now() -
                                    new Date(user.subscriptionDate).getTime()) /
                                    (1000 * 60 * 60 * 24),
                                )}{' '}
                                days
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Churn Score</p>
                          <p className="text-xl font-bold text-red-600">
                            {user.churnScore}
                          </p>
                          <p className="text-xs text-gray-500">
                            {Math.round(user.predictionConfidence * 100)}%
                            confidence
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-sm text-gray-600">Time to Churn</p>
                          <p className="font-medium">{user.timeToChurn} days</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Lifetime Value
                          </p>
                          <p className="font-medium">
                            {formatCurrency(user.lifetimeValue)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Last Activity</p>
                          <p className="font-medium">
                            {new Date(user.lastActivity).toLocaleDateString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">
                            Retention Probability
                          </p>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={user.retentionProbability * 100}
                              className="h-2 flex-1"
                            />
                            <span className="text-sm">
                              {Math.round(user.retentionProbability * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Risk Factors */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-red-600 mb-2">
                          Primary Risk Factors
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {user.riskFactors.slice(0, 4).map((factor, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-sm"
                            >
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              <span>{factor.factor}</span>
                              <Badge variant="destructive" className="ml-auto">
                                {factor.impact.toFixed(1)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recommended Interventions */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-blue-600 mb-2">
                          Recommended Actions
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {user.interventionRecommendations
                            .slice(0, 4)
                            .map((intervention, idx) => (
                              <div
                                key={idx}
                                className="flex items-center gap-2 p-2 bg-blue-50 rounded"
                              >
                                {getInterventionIcon(intervention.type)}
                                <span className="text-sm flex-1">
                                  {intervention.description}
                                </span>
                                <Badge
                                  variant={
                                    intervention.priority === 'high'
                                      ? 'destructive'
                                      : 'default'
                                  }
                                >
                                  {intervention.priority}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() =>
                            handleUserAction(user.userId, 'contact')
                          }
                          className="flex items-center gap-2"
                        >
                          <Mail className="h-3 w-3" />
                          Contact
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUserAction(user.userId, 'discount')
                          }
                          className="flex items-center gap-2"
                        >
                          <CreditCard className="h-3 w-3" />
                          Offer Discount
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleUserAction(user.userId, 'training')
                          }
                          className="flex items-center gap-2"
                        >
                          <Users className="h-3 w-3" />
                          Schedule Training
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="factors" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Churn Risk Factors</CardTitle>
              <CardDescription>
                Most common factors contributing to user churn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {churnData.churnFactors
                  .sort((a, b) => b.impact - a.impact)
                  .map((factor, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">#{index + 1}</Badge>
                        <div>
                          <p className="font-medium">{factor.factor}</p>
                          <p className="text-sm text-gray-600 capitalize">
                            {factor.category}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm text-gray-600">Impact:</span>
                          <span className="font-medium text-red-600">
                            {factor.impact.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            Frequency:
                          </span>
                          <span className="font-medium">
                            {factor.frequency}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Retention Strategies</CardTitle>
              <CardDescription>
                Effectiveness and cost analysis of retention interventions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {churnData.retentionStrategies
                  .sort((a, b) => b.effectiveness - a.effectiveness)
                  .map((strategy, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-medium">{strategy.strategy}</h3>
                          <p className="text-sm text-gray-600">
                            Applicable to {strategy.applicableUsers} users
                          </p>
                        </div>
                        <Badge
                          variant={
                            strategy.effectiveness > 70
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {strategy.effectiveness}% effective
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-gray-600">Effectiveness</p>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={strategy.effectiveness}
                              className="h-2 flex-1"
                            />
                            <span className="text-sm font-medium">
                              {strategy.effectiveness}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">Cost per User</p>
                          <p className="font-medium">
                            {formatCurrency(strategy.cost)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">ROI Estimate</p>
                          <p className="font-medium text-green-600">
                            {(
                              (((strategy.effectiveness / 100) * 500 -
                                strategy.cost) /
                                strategy.cost) *
                              100
                            ).toFixed(0)}
                            %
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cohorts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cohort Retention Analysis</CardTitle>
              <CardDescription>
                User retention rates by signup cohort over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Cohort</th>
                      <th className="text-center p-2">Month 0</th>
                      <th className="text-center p-2">Month 1</th>
                      <th className="text-center p-2">Month 3</th>
                      <th className="text-center p-2">Month 6</th>
                      <th className="text-center p-2">Month 12</th>
                    </tr>
                  </thead>
                  <tbody>
                    {churnData.cohortAnalysis.map((cohort, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 font-medium">{cohort.cohort}</td>
                        <td className="text-center p-2">
                          <Badge variant="default">{cohort.month0}</Badge>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center gap-1">
                            <span>{cohort.month1}</span>
                            <span className="text-sm text-gray-500">
                              (
                              {Math.round(
                                (cohort.month1 / cohort.month0) * 100,
                              )}
                              %)
                            </span>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center gap-1">
                            <span>{cohort.month3}</span>
                            <span className="text-sm text-gray-500">
                              (
                              {Math.round(
                                (cohort.month3 / cohort.month0) * 100,
                              )}
                              %)
                            </span>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center gap-1">
                            <span>{cohort.month6}</span>
                            <span className="text-sm text-gray-500">
                              (
                              {Math.round(
                                (cohort.month6 / cohort.month0) * 100,
                              )}
                              %)
                            </span>
                          </div>
                        </td>
                        <td className="text-center p-2">
                          <div className="flex items-center justify-center gap-1">
                            <span>{cohort.month12}</span>
                            <span className="text-sm text-gray-500">
                              (
                              {Math.round(
                                (cohort.month12 / cohort.month0) * 100,
                              )}
                              %)
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cohort Visualization */}
          <Card>
            <CardHeader>
              <CardTitle>Retention Curve</CardTitle>
              <CardDescription>
                Visual representation of cohort retention over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={churnData.cohortAnalysis}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cohort" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="month1"
                    stroke="#8B5CF6"
                    name="Month 1 Retention"
                  />
                  <Line
                    type="monotone"
                    dataKey="month3"
                    stroke="#06B6D4"
                    name="Month 3 Retention"
                  />
                  <Line
                    type="monotone"
                    dataKey="month6"
                    stroke="#10B981"
                    name="Month 6 Retention"
                  />
                  <Line
                    type="monotone"
                    dataKey="month12"
                    stroke="#F59E0B"
                    name="Month 12 Retention"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
