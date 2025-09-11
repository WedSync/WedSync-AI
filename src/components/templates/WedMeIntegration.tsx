'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  Download,
  Share2,
  Star,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  Calendar,
  PieChart,
  Activity,
  Target,
  Award,
  Zap,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

interface TemplatePerformanceData {
  templateId: string;
  templateTitle: string;
  views: number;
  installs: number;
  revenue: number;
  rating: number;
  reviews: number;
  conversionRate: number;
  completionRate: number;
  refundRate: number;
  lastUpdated: string;
  category: string;
  tags: string[];
  status: 'active' | 'pending' | 'suspended' | 'archived';
}

interface CreatorDashboardData {
  totalTemplates: number;
  totalRevenue: number;
  totalInstalls: number;
  avgRating: number;
  monthlyGrowth: number;
  topPerformingTemplate: string;
  pendingReviews: number;
  recentActivities: Array<{
    id: string;
    type: 'install' | 'review' | 'revenue' | 'update';
    description: string;
    timestamp: string;
    amount?: number;
    rating?: number;
  }>;
  templates: TemplatePerformanceData[];
}

interface WedMeIntegrationProps {
  creatorId: string;
  onNavigateToBuilder: () => void;
  onNavigateToMarketplace: () => void;
}

export function WedMeCreatorDashboard({
  creatorId,
  onNavigateToBuilder,
  onNavigateToMarketplace,
}: WedMeIntegrationProps) {
  const [dashboardData, setDashboardData] =
    useState<CreatorDashboardData | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    '7d' | '30d' | '90d' | '1y'
  >('30d');
  const [isLoading, setIsLoading] = useState(true);

  // Mock data - in real implementation, this would come from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const mockData: CreatorDashboardData = {
          totalTemplates: 12,
          totalRevenue: 18420.5,
          totalInstalls: 1247,
          avgRating: 4.8,
          monthlyGrowth: 23.5,
          topPerformingTemplate: 'Luxury Photography Intake',
          pendingReviews: 3,
          recentActivities: [
            {
              id: 'activity-1',
              type: 'revenue',
              description: 'New purchase: Wedding Timeline Builder',
              timestamp: new Date(
                Date.now() - 2 * 60 * 60 * 1000,
              ).toISOString(),
              amount: 47,
            },
            {
              id: 'activity-2',
              type: 'review',
              description: 'New 5-star review on Photography Intake Template',
              timestamp: new Date(
                Date.now() - 4 * 60 * 60 * 1000,
              ).toISOString(),
              rating: 5,
            },
            {
              id: 'activity-3',
              type: 'install',
              description: 'Template installed: Vendor Contact System',
              timestamp: new Date(
                Date.now() - 6 * 60 * 60 * 1000,
              ).toISOString(),
            },
            {
              id: 'activity-4',
              type: 'update',
              description: 'Template updated: RSVP Management System v2.1',
              timestamp: new Date(
                Date.now() - 12 * 60 * 60 * 1000,
              ).toISOString(),
            },
          ],
          templates: [
            {
              templateId: 'template-1',
              templateTitle: 'Luxury Photography Client Intake',
              views: 1420,
              installs: 234,
              revenue: 10998,
              rating: 4.9,
              reviews: 87,
              conversionRate: 16.5,
              completionRate: 94.2,
              refundRate: 2.1,
              lastUpdated: new Date().toISOString(),
              category: 'photography',
              tags: ['client-intake', 'luxury', 'high-conversion'],
              status: 'active',
            },
            {
              templateId: 'template-2',
              templateTitle: 'Wedding Timeline Builder',
              views: 892,
              installs: 156,
              revenue: 7332,
              rating: 4.7,
              reviews: 43,
              conversionRate: 17.5,
              completionRate: 89.1,
              refundRate: 1.3,
              lastUpdated: new Date(
                Date.now() - 2 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              category: 'planning',
              tags: ['timeline', 'organization', 'planning'],
              status: 'active',
            },
            {
              templateId: 'template-3',
              templateTitle: 'Vendor Communication Suite',
              views: 654,
              installs: 89,
              revenue: 4187,
              rating: 4.6,
              reviews: 28,
              conversionRate: 13.6,
              completionRate: 91.5,
              refundRate: 3.4,
              lastUpdated: new Date(
                Date.now() - 5 * 24 * 60 * 60 * 1000,
              ).toISOString(),
              category: 'communication',
              tags: ['vendor', 'communication', 'coordination'],
              status: 'pending',
            },
          ],
        };

        setDashboardData(mockData);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [creatorId, selectedTimeframe]);

  if (isLoading || !dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Creator Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Manage your wedding business templates and track performance
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={onNavigateToMarketplace}>
                <Eye className="w-4 h-4 mr-2" />
                View Marketplace
              </Button>
              <Button onClick={onNavigateToBuilder}>
                <Zap className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricCard
            title="Total Revenue"
            value={`£${dashboardData.totalRevenue.toLocaleString()}`}
            change={`+${dashboardData.monthlyGrowth}%`}
            changeType="positive"
            icon={DollarSign}
            color="green"
          />
          <MetricCard
            title="Template Installs"
            value={dashboardData.totalInstalls.toLocaleString()}
            change="+14.2%"
            changeType="positive"
            icon={Download}
            color="blue"
          />
          <MetricCard
            title="Average Rating"
            value={dashboardData.avgRating.toFixed(1)}
            change="+0.2"
            changeType="positive"
            icon={Star}
            color="yellow"
          />
          <MetricCard
            title="Active Templates"
            value={dashboardData.totalTemplates.toString()}
            change={
              dashboardData.pendingReviews > 0
                ? `${dashboardData.pendingReviews} pending`
                : 'All approved'
            }
            changeType={
              dashboardData.pendingReviews > 0 ? 'warning' : 'positive'
            }
            icon={Activity}
            color="purple"
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="templates">My Templates</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <OverviewTab
              dashboardData={dashboardData}
              onNavigateToBuilder={onNavigateToBuilder}
            />
          </TabsContent>

          <TabsContent value="templates" className="space-y-6">
            <TemplatesTab
              templates={dashboardData.templates}
              onNavigateToBuilder={onNavigateToBuilder}
            />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AnalyticsTab
              templates={dashboardData.templates}
              timeframe={selectedTimeframe}
              onTimeframeChange={setSelectedTimeframe}
            />
          </TabsContent>

          <TabsContent value="earnings" className="space-y-6">
            <EarningsTab
              dashboardData={dashboardData}
              timeframe={selectedTimeframe}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'warning';
  icon: React.ComponentType<any>;
  color: 'green' | 'blue' | 'yellow' | 'purple';
}) {
  const colorClasses = {
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const changeClasses = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    warning: 'text-yellow-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
            <p className={cn('text-sm mt-1', changeClasses[changeType])}>
              {change}
            </p>
          </div>
          <div className={cn('p-3 rounded-lg', colorClasses[color])}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab({
  dashboardData,
  onNavigateToBuilder,
}: {
  dashboardData: CreatorDashboardData;
  onNavigateToBuilder: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Recent Activity */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {dashboardData.recentActivities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-shrink-0">
                    {activity.type === 'revenue' && (
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                    {activity.type === 'review' && (
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <Star className="w-4 h-4 text-yellow-600" />
                      </div>
                    )}
                    {activity.type === 'install' && (
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Download className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    {activity.type === 'update' && (
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Zap className="w-4 h-4 text-purple-600" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(activity.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>

                  {activity.amount && (
                    <Badge variant="secondary">+£{activity.amount}</Badge>
                  )}
                  {activity.rating && (
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-700"
                    >
                      {activity.rating}★
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Conversion Rate</span>
              <span className="text-sm font-medium">16.2%</span>
            </div>
            <Progress value={16.2} className="h-2" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Completion Rate</span>
              <span className="text-sm font-medium">92.1%</span>
            </div>
            <Progress value={92.1} className="h-2" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                Customer Satisfaction
              </span>
              <span className="text-sm font-medium">4.8/5.0</span>
            </div>
            <Progress value={96} className="h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Template</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="font-medium text-sm">
                {dashboardData.topPerformingTemplate}
              </p>
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>234 installs</span>
                <span>£10,998 earned</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                <span className="text-xs">4.9 (87 reviews)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <Award className="w-8 h-8 text-purple-600 mx-auto" />
              <div>
                <p className="font-medium text-sm">Creator Level</p>
                <p className="text-xs text-gray-600">Professional Creator</p>
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-100 text-purple-700"
              >
                Level 3
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TemplatesTab({
  templates,
  onNavigateToBuilder,
}: {
  templates: TemplatePerformanceData[];
  onNavigateToBuilder: () => void;
}) {
  const [sortBy, setSortBy] = useState<'installs' | 'revenue' | 'rating'>(
    'installs',
  );

  const sortedTemplates = [...templates].sort((a, b) => {
    switch (sortBy) {
      case 'installs':
        return b.installs - a.installs;
      case 'revenue':
        return b.revenue - a.revenue;
      case 'rating':
        return b.rating - a.rating;
      default:
        return 0;
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">
          My Templates ({templates.length})
        </h3>
        <div className="flex items-center gap-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md"
          >
            <option value="installs">Sort by Installs</option>
            <option value="revenue">Sort by Revenue</option>
            <option value="rating">Sort by Rating</option>
          </select>
          <Button onClick={onNavigateToBuilder}>
            <Zap className="w-4 h-4 mr-2" />
            New Template
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {sortedTemplates.map((template) => (
          <Card key={template.templateId}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900">
                          {template.templateTitle}
                        </h4>
                        <Badge
                          variant={
                            template.status === 'active'
                              ? 'default'
                              : 'secondary'
                          }
                          className={cn(
                            template.status === 'pending' &&
                              'bg-yellow-100 text-yellow-700',
                            template.status === 'suspended' &&
                              'bg-red-100 text-red-700',
                          )}
                        >
                          {template.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {template.views.toLocaleString()} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="w-4 h-4" />
                          {template.installs} installs
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {template.rating} ({template.reviews} reviews)
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />£
                          {template.revenue.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        {template.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Conversion</span>
                          <div className="font-medium">
                            {template.conversionRate}%
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Completion</span>
                          <div className="font-medium">
                            {template.completionRate}%
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-600">Refund Rate</span>
                          <div className="font-medium">
                            {template.refundRate}%
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-6">
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AnalyticsTab({
  templates,
  timeframe,
  onTimeframeChange,
}: {
  templates: TemplatePerformanceData[];
  timeframe: string;
  onTimeframeChange: (timeframe: '7d' | '30d' | '90d' | '1y') => void;
}) {
  const totalViews = templates.reduce((sum, t) => sum + t.views, 0);
  const totalInstalls = templates.reduce((sum, t) => sum + t.installs, 0);
  const avgConversionRate =
    templates.reduce((sum, t) => sum + t.conversionRate, 0) / templates.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Analytics Overview</h3>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d', '1y'] as const).map((period) => (
            <Button
              key={period}
              variant={timeframe === period ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTimeframeChange(period)}
            >
              {period}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {totalViews.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  +18.2% vs last period
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Conversion Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {avgConversionRate.toFixed(1)}%
                </p>
                <p className="text-sm text-green-600 mt-1">
                  +2.1% vs last period
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Install Rate
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {((totalInstalls / totalViews) * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-green-600 mt-1">
                  +1.4% vs last period
                </p>
              </div>
              <Download className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Performance by Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {templates.map((template) => (
              <div
                key={template.templateId}
                className="p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">{template.templateTitle}</h4>
                  <Badge variant="outline">{template.category}</Badge>
                </div>

                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Views</span>
                    <div className="font-medium">
                      {template.views.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Installs</span>
                    <div className="font-medium">{template.installs}</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Conversion</span>
                    <div className="font-medium">
                      {template.conversionRate}%
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-600">Revenue</span>
                    <div className="font-medium">
                      £{template.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress value={template.conversionRate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function EarningsTab({
  dashboardData,
  timeframe,
}: {
  dashboardData: CreatorDashboardData;
  timeframe: string;
}) {
  const monthlyRevenue = dashboardData.totalRevenue * 0.3; // Mock monthly revenue
  const projectedAnnual = monthlyRevenue * 12;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Earnings
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  £{dashboardData.totalRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-green-600 mt-1">
                  +{dashboardData.monthlyGrowth}% this month
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Monthly Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  £{monthlyRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-blue-600 mt-1">Current month</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Annual Projection
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  £{projectedAnnual.toLocaleString()}
                </p>
                <p className="text-sm text-purple-600 mt-1">
                  Based on current trend
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revenue by Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.templates.map((template) => (
              <div
                key={template.templateId}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div>
                  <h4 className="font-medium">{template.templateTitle}</h4>
                  <p className="text-sm text-gray-600">
                    {template.installs} installs • {template.rating}★ rating
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-lg">
                    £{template.revenue.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600">
                    £{Math.round(template.revenue / template.installs)} avg per
                    install
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payout Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
              <div>
                <p className="font-medium text-green-900">
                  Available for Payout
                </p>
                <p className="text-sm text-green-700">Ready to transfer</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-xl text-green-900">
                  £{(dashboardData.totalRevenue * 0.15).toLocaleString()}
                </p>
                <Button size="sm" className="mt-2">
                  Request Payout
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <p className="font-medium text-blue-900">Pending Revenue</p>
                <p className="text-sm text-blue-700">Processing (7-day hold)</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-xl text-blue-900">
                  £{(dashboardData.totalRevenue * 0.05).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export functions for easy integration
export { WedMeCreatorDashboard as default };
