'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Mail,
  Target,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  AlertCircle,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { CampaignBuilder } from './CampaignBuilder';
import { ViralTracker } from './ViralTracker';
import { AttributionVisualizer } from './AttributionVisualizer';

interface DashboardMetrics {
  totalRevenue: number;
  revenueGrowth: number;
  activeCampaigns: number;
  conversionRate: number;
  conversionGrowth: number;
  viralCoefficient: number;
  viralGrowth: number;
  customerAcquisitionCost: number;
  cacChange: number;
  roi: number;
  roiChange: number;
  activeUsers: number;
  userGrowth: number;
}

interface CampaignPerformance {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'paused' | 'completed';
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
  revenue: number;
  roi: number;
  lastUpdated: string;
}

interface ChannelPerformance {
  channel: string;
  sends: number;
  conversions: number;
  revenue: number;
  cost: number;
  roi: number;
}

export function MarketingDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([]);
  const [channelData, setChannelData] = useState<ChannelPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsRefreshing(true);
      const [metricsRes, campaignsRes, channelRes] = await Promise.all([
        fetch('/api/marketing/dashboard/metrics'),
        fetch('/api/marketing/dashboard/campaigns'),
        fetch('/api/marketing/dashboard/channels'),
      ]);

      if (metricsRes.ok && campaignsRes.ok && channelRes.ok) {
        const [metricsData, campaignsData, channelData] = await Promise.all([
          metricsRes.json(),
          campaignsRes.json(),
          channelRes.json(),
        ]);

        setMetrics(metricsData);
        setCampaigns(campaignsData);
        setChannelData(channelData);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'paused':
        return 'bg-yellow-500';
      case 'completed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading marketing dashboard...</p>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const radarData = [
    { metric: 'Conversion', value: metrics.conversionRate, fullMark: 50 },
    { metric: 'Viral', value: metrics.viralCoefficient * 30, fullMark: 50 },
    { metric: 'ROI', value: metrics.roi / 10, fullMark: 50 },
    {
      metric: 'CAC',
      value: 50 - metrics.customerAcquisitionCost / 10,
      fullMark: 50,
    },
    { metric: 'Growth', value: metrics.revenueGrowth, fullMark: 50 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Marketing Command Center</h1>
          <p className="text-muted-foreground">
            Real-time marketing performance and automation
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </div>
          <Button
            onClick={loadDashboardData}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
          >
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics.totalRevenue)}
                </p>
                <p
                  className={`text-xs flex items-center gap-1 ${metrics.revenueGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.revenueGrowth > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercentage(metrics.revenueGrowth)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {metrics.conversionRate.toFixed(1)}%
                </p>
                <p
                  className={`text-xs flex items-center gap-1 ${metrics.conversionGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.conversionGrowth > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercentage(metrics.conversionGrowth)}
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Viral Coefficient
                </p>
                <p className="text-2xl font-bold">
                  {metrics.viralCoefficient.toFixed(2)}
                </p>
                <p
                  className={`text-xs flex items-center gap-1 ${metrics.viralGrowth > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.viralGrowth > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercentage(metrics.viralGrowth)}
                </p>
              </div>
              <Users className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CAC</p>
                <p className="text-2xl font-bold">
                  ${metrics.customerAcquisitionCost}
                </p>
                <p
                  className={`text-xs flex items-center gap-1 ${metrics.cacChange < 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.cacChange < 0 ? (
                    <ArrowDownRight className="h-3 w-3" />
                  ) : (
                    <ArrowUpRight className="h-3 w-3" />
                  )}
                  {formatPercentage(Math.abs(metrics.cacChange))}
                </p>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">ROI</p>
                <p className="text-2xl font-bold">{metrics.roi}%</p>
                <p
                  className={`text-xs flex items-center gap-1 ${metrics.roiChange > 0 ? 'text-green-600' : 'text-red-600'}`}
                >
                  {metrics.roiChange > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercentage(metrics.roiChange)}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-cyan-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="viral">Viral Tracking</TabsTrigger>
          <TabsTrigger value="attribution">Attribution</TabsTrigger>
          <TabsTrigger value="builder">Campaign Builder</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Performance Radar */}
            <Card>
              <CardHeader>
                <CardTitle>Marketing Performance Index</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" />
                    <PolarRadiusAxis angle={90} domain={[0, 50]} />
                    <Radar
                      name="Performance"
                      dataKey="value"
                      stroke="#8b5cf6"
                      fill="#8b5cf6"
                      fillOpacity={0.6}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Channel Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="channel" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="roi" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Active Campaigns Table */}
          <Card>
            <CardHeader>
              <CardTitle>Active Campaigns Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {campaigns.slice(0, 5).map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${getStatusColor(campaign.status)}`}
                      />
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {campaign.type} • {campaign.sent.toLocaleString()}{' '}
                          sent
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <p className="font-medium">
                          {((campaign.opened / campaign.sent) * 100).toFixed(1)}
                          %
                        </p>
                        <p className="text-xs text-muted-foreground">Open</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">
                          {((campaign.clicked / campaign.opened) * 100).toFixed(
                            1,
                          )}
                          %
                        </p>
                        <p className="text-xs text-muted-foreground">Click</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">
                          {((campaign.converted / campaign.sent) * 100).toFixed(
                            1,
                          )}
                          %
                        </p>
                        <p className="text-xs text-muted-foreground">Convert</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-green-600">
                          {formatCurrency(campaign.revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">Revenue</p>
                      </div>
                      <Badge
                        variant={campaign.roi > 300 ? 'default' : 'secondary'}
                      >
                        {campaign.roi}% ROI
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <div
                    key={campaign.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${getStatusColor(campaign.status)}`}
                      />
                      <div>
                        <p className="font-medium">{campaign.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{campaign.type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            Updated{' '}
                            {new Date(campaign.lastUpdated).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-8">
                      <div className="grid grid-cols-4 gap-4 text-sm">
                        <div className="text-center">
                          <p className="font-medium">
                            {campaign.sent.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">Sent</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">
                            {campaign.opened.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Opened
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">
                            {campaign.converted.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Converted
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-green-600">
                            {formatCurrency(campaign.revenue)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Revenue
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="viral">
          <ViralTracker />
        </TabsContent>

        <TabsContent value="attribution">
          <AttributionVisualizer />
        </TabsContent>

        <TabsContent value="builder">
          <CampaignBuilder />
        </TabsContent>
      </Tabs>
    </div>
  );
}
