'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Share2,
  Target,
  Zap,
  Award,
  Activity,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
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
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface ViralMetrics {
  currentCoefficient: number;
  targetCoefficient: number;
  trend: 'up' | 'down' | 'stable';
  invitesSent: number;
  invitesAccepted: number;
  conversionRate: number;
  networkDepth: number;
  superConnectors: number;
  viralRevenue: number;
  marketingAssisted: number;
}

interface ViralChain {
  userId: string;
  userName: string;
  generation: number;
  referrals: number;
  revenue: number;
  coefficient: number;
}

interface TimeSeriesData {
  timestamp: string;
  coefficient: number;
  invites: number;
  conversions: number;
}

export function ViralTracker() {
  const [metrics, setMetrics] = useState<ViralMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [topChains, setTopChains] = useState<ViralChain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  useEffect(() => {
    loadViralData();
    const interval = setInterval(loadViralData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const loadViralData = async () => {
    try {
      const [metricsRes, timeSeriesRes, chainsRes] = await Promise.all([
        fetch('/api/marketing/viral/metrics'),
        fetch('/api/marketing/viral/timeseries'),
        fetch('/api/marketing/viral/top-chains'),
      ]);

      if (metricsRes.ok && timeSeriesRes.ok && chainsRes.ok) {
        const [metricsData, tsData, chainsData] = await Promise.all([
          metricsRes.json(),
          timeSeriesRes.json(),
          chainsRes.json(),
        ]);

        setMetrics(metricsData);
        setTimeSeriesData(tsData);
        setTopChains(chainsData);
      }
    } catch (error) {
      console.error('Error loading viral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getCoefficientColor = (value: number, target: number) => {
    if (value >= target) return 'text-green-600';
    if (value >= target * 0.8) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCoefficientStatus = (value: number, target: number) => {
    if (value >= target)
      return { label: 'On Target', variant: 'default' as const };
    if (value >= target * 0.8)
      return { label: 'Below Target', variant: 'secondary' as const };
    return { label: 'Critical', variant: 'destructive' as const };
  };

  const formatRevenue = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card className="animate-pulse">
          <CardHeader className="h-20 bg-gray-200" />
          <CardContent className="h-40 bg-gray-100" />
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  const coefficientStatus = getCoefficientStatus(
    metrics.currentCoefficient,
    metrics.targetCoefficient,
  );
  const coefficientProgress =
    (metrics.currentCoefficient / metrics.targetCoefficient) * 100;

  const channelData = [
    {
      name: 'Direct Viral',
      value: metrics.invitesAccepted - metrics.marketingAssisted,
      fill: '#8b5cf6',
    },
    {
      name: 'Marketing Assisted',
      value: metrics.marketingAssisted,
      fill: '#06b6d4',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Viral Coefficient Card */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-600" />
              Viral Coefficient Tracker
            </CardTitle>
            <Badge variant={coefficientStatus.variant}>
              {coefficientStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Main Coefficient Display */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span
                  className={`text-6xl font-bold ${getCoefficientColor(metrics.currentCoefficient, metrics.targetCoefficient)}`}
                >
                  {metrics.currentCoefficient.toFixed(2)}
                </span>
                {metrics.trend === 'up' ? (
                  <ArrowUp className="h-8 w-8 text-green-600" />
                ) : metrics.trend === 'down' ? (
                  <ArrowDown className="h-8 w-8 text-red-600" />
                ) : null}
              </div>
              <p className="text-sm text-muted-foreground">
                Target: {metrics.targetCoefficient} | Progress:{' '}
                {coefficientProgress.toFixed(1)}%
              </p>
              <Progress value={coefficientProgress} className="mt-2" />
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <Share2 className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <p className="text-2xl font-bold">
                  {metrics.invitesSent.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Invites Sent</p>
              </div>
              <div className="text-center">
                <Users className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <p className="text-2xl font-bold">
                  {metrics.invitesAccepted.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Accepted</p>
              </div>
              <div className="text-center">
                <Target className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <p className="text-2xl font-bold">
                  {metrics.conversionRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">Conversion</p>
              </div>
              <div className="text-center">
                <Award className="h-5 w-5 mx-auto mb-1 text-yellow-600" />
                <p className="text-2xl font-bold">{metrics.superConnectors}</p>
                <p className="text-xs text-muted-foreground">
                  Super Connectors
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Time Series Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Viral Coefficient Trend (7 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="coefficient"
                stroke="#8b5cf6"
                fill="#8b5cf6"
                fillOpacity={0.3}
              />
              <Line
                type="monotone"
                dataKey="coefficient"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-6">
        {/* Marketing Attribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Viral Attribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {channelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              {channelData.map((channel) => (
                <div
                  key={channel.name}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: channel.fill }}
                    />
                    <span>{channel.name}</span>
                  </div>
                  <span className="font-medium">
                    {channel.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Impact */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Viral Revenue Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    Total Viral Revenue
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatRevenue(metrics.viralRevenue)}
                  </span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    Marketing Boosted
                  </span>
                  <span className="font-medium">
                    +
                    {(
                      (metrics.marketingAssisted / metrics.invitesAccepted) *
                      100
                    ).toFixed(1)}
                    %
                  </span>
                </div>
                <Progress
                  value={
                    (metrics.marketingAssisted / metrics.invitesAccepted) * 100
                  }
                  className="h-2"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">
                    Network Depth
                  </span>
                  <span className="font-medium">
                    {metrics.networkDepth} levels
                  </span>
                </div>
                <Progress value={metrics.networkDepth * 20} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Viral Chains */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Top Viral Chains
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topChains.map((chain, index) => (
              <div
                key={chain.userId}
                className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{chain.userName}</p>
                    <p className="text-xs text-muted-foreground">
                      Gen {chain.generation} • {chain.referrals} referrals
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-purple-600">
                    {chain.coefficient.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatRevenue(chain.revenue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
