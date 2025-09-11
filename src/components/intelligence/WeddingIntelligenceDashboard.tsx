'use client';

import React, { useState } from 'react';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer,
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
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Star,
  Lightbulb,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Zap,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

// Wedding industry color palette
const WEDDING_COLORS = {
  romantic: '#E91E63',
  elegant: '#9C27B0',
  rustic: '#8BC34A',
  modern: '#2196F3',
  classic: '#FF9800',
  beach: '#00BCD4',
};

const INSIGHT_COLORS = {
  positive: '#10B981',
  warning: '#F59E0B',
  negative: '#EF4444',
  neutral: '#6B7280',
};

interface SeasonalTrendData {
  month: string;
  bookings: number;
  revenue: number;
  avgPrice: number;
  popularStyles: string[];
  demand: 'high' | 'medium' | 'low';
}

interface PriceOptimizationData {
  category: string;
  currentPrice: number;
  suggestedPrice: number;
  marketAverage: number;
  competitorRange: { min: number; max: number };
  demandLevel: number;
  priceElasticity: number;
  recommendation: 'increase' | 'decrease' | 'maintain';
  potentialRevenue: number;
}

interface MarketComparisonData {
  region: string;
  avgWeddingCost: number;
  marketShare: number;
  competitorCount: number;
  growthRate: number;
  opportunity: 'high' | 'medium' | 'low';
}

interface ClientBehaviorData {
  segment: string;
  avgBudget: number;
  bookingLeadTime: number;
  preferredVendors: string[];
  conversionRate: number;
  lifetimeValue: number;
  churnRisk: 'high' | 'medium' | 'low';
}

interface VendorNetworkData {
  vendor: string;
  category: string;
  referralCount: number;
  bookingValue: number;
  clientSatisfaction: number;
  availability: number;
  partnership: 'strong' | 'moderate' | 'weak';
}

// Mock data for wedding industry intelligence
const mockSeasonalData: SeasonalTrendData[] = [
  {
    month: 'Jan',
    bookings: 23,
    revenue: 145000,
    avgPrice: 6300,
    popularStyles: ['Winter', 'Indoor'],
    demand: 'low',
  },
  {
    month: 'Feb',
    bookings: 67,
    revenue: 425000,
    avgPrice: 6350,
    popularStyles: ['Valentine', 'Romantic'],
    demand: 'medium',
  },
  {
    month: 'Mar',
    bookings: 89,
    revenue: 568000,
    avgPrice: 6380,
    popularStyles: ['Spring', 'Garden'],
    demand: 'medium',
  },
  {
    month: 'Apr',
    bookings: 134,
    revenue: 867000,
    avgPrice: 6470,
    popularStyles: ['Outdoor', 'Floral'],
    demand: 'high',
  },
  {
    month: 'May',
    bookings: 156,
    revenue: 1024000,
    avgPrice: 6560,
    popularStyles: ['Garden', 'Vintage'],
    demand: 'high',
  },
  {
    month: 'Jun',
    bookings: 189,
    revenue: 1267000,
    avgPrice: 6710,
    popularStyles: ['Summer', 'Beach'],
    demand: 'high',
  },
  {
    month: 'Jul',
    bookings: 201,
    revenue: 1354000,
    avgPrice: 6740,
    popularStyles: ['Beach', 'Outdoor'],
    demand: 'high',
  },
  {
    month: 'Aug',
    bookings: 178,
    revenue: 1198000,
    avgPrice: 6730,
    popularStyles: ['Summer', 'Modern'],
    demand: 'high',
  },
  {
    month: 'Sep',
    bookings: 145,
    revenue: 967000,
    avgPrice: 6670,
    popularStyles: ['Autumn', 'Rustic'],
    demand: 'high',
  },
  {
    month: 'Oct',
    bookings: 123,
    revenue: 812000,
    avgPrice: 6600,
    popularStyles: ['Fall', 'Vintage'],
    demand: 'medium',
  },
  {
    month: 'Nov',
    bookings: 78,
    revenue: 498000,
    avgPrice: 6380,
    popularStyles: ['Indoor', 'Elegant'],
    demand: 'medium',
  },
  {
    month: 'Dec',
    bookings: 45,
    revenue: 289000,
    avgPrice: 6420,
    popularStyles: ['Holiday', 'Winter'],
    demand: 'low',
  },
];

const mockPriceOptimization: PriceOptimizationData[] = [
  {
    category: 'Photography',
    currentPrice: 2500,
    suggestedPrice: 2750,
    marketAverage: 2650,
    competitorRange: { min: 2200, max: 3200 },
    demandLevel: 0.8,
    priceElasticity: -0.4,
    recommendation: 'increase',
    potentialRevenue: 15000,
  },
  {
    category: 'Catering',
    currentPrice: 85,
    suggestedPrice: 80,
    marketAverage: 78,
    competitorRange: { min: 65, max: 95 },
    demandLevel: 0.6,
    priceElasticity: -0.8,
    recommendation: 'decrease',
    potentialRevenue: -5000,
  },
  {
    category: 'Venue',
    currentPrice: 3500,
    suggestedPrice: 3500,
    marketAverage: 3450,
    competitorRange: { min: 2800, max: 4200 },
    demandLevel: 0.75,
    priceElasticity: -0.6,
    recommendation: 'maintain',
    potentialRevenue: 0,
  },
];

const mockMarketComparison: MarketComparisonData[] = [
  {
    region: 'Downtown',
    avgWeddingCost: 45000,
    marketShare: 15,
    competitorCount: 8,
    growthRate: 12,
    opportunity: 'high',
  },
  {
    region: 'Suburbs',
    avgWeddingCost: 38000,
    marketShare: 22,
    competitorCount: 12,
    growthRate: 8,
    opportunity: 'medium',
  },
  {
    region: 'Beach Area',
    avgWeddingCost: 52000,
    marketShare: 8,
    competitorCount: 5,
    growthRate: 18,
    opportunity: 'high',
  },
  {
    region: 'Mountains',
    avgWeddingCost: 35000,
    marketShare: 12,
    competitorCount: 6,
    growthRate: 5,
    opportunity: 'low',
  },
];

function SeasonalTrendsCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Seasonal Wedding Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={mockSeasonalData}>
            <defs>
              <linearGradient id="bookingsGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={WEDDING_COLORS.romantic}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={WEDDING_COLORS.romantic}
                  stopOpacity={0}
                />
              </linearGradient>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor={WEDDING_COLORS.elegant}
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor={WEDDING_COLORS.elegant}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="month" stroke="#6B7280" fontSize={12} />
            <YAxis
              yAxisId="bookings"
              orientation="left"
              stroke="#6B7280"
              fontSize={12}
            />
            <YAxis
              yAxisId="revenue"
              orientation="right"
              stroke="#6B7280"
              fontSize={12}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
              }}
            />
            <Legend />
            <Area
              yAxisId="bookings"
              type="monotone"
              dataKey="bookings"
              stroke={WEDDING_COLORS.romantic}
              fillOpacity={1}
              fill="url(#bookingsGradient)"
              name="Bookings"
            />
            <Line
              yAxisId="revenue"
              type="monotone"
              dataKey="revenue"
              stroke={WEDDING_COLORS.elegant}
              strokeWidth={3}
              dot={{ fill: WEDDING_COLORS.elegant, strokeWidth: 2, r: 4 }}
              name="Revenue"
            />
          </AreaChart>
        </ResponsiveContainer>

        <div className="mt-4 grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-500">Peak Season</p>
            <p className="text-lg font-semibold text-green-600">Jun-Sep</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Off Season</p>
            <p className="text-lg font-semibold text-orange-600">Nov-Feb</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-500">Growth Rate</p>
            <p className="text-lg font-semibold text-blue-600">+12%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PriceOptimizationCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Price Optimization Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockPriceOptimization.map((item, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{item.category}</h4>
                <Badge
                  className={cn(
                    'text-xs',
                    item.recommendation === 'increase' &&
                      'bg-green-100 text-green-700',
                    item.recommendation === 'decrease' &&
                      'bg-red-100 text-red-700',
                    item.recommendation === 'maintain' &&
                      'bg-blue-100 text-blue-700',
                  )}
                >
                  {item.recommendation === 'increase' && (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  )}
                  {item.recommendation === 'decrease' && (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  )}
                  {item.recommendation === 'maintain' && (
                    <Target className="w-3 h-3 mr-1" />
                  )}
                  {item.recommendation.charAt(0).toUpperCase() +
                    item.recommendation.slice(1)}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Current Price</p>
                  <p className="font-medium">
                    ${item.currentPrice.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Suggested Price</p>
                  <p className="font-medium text-blue-600">
                    ${item.suggestedPrice.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Market Average</p>
                  <p className="font-medium">
                    ${item.marketAverage.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500">
                    Demand:{' '}
                    <span className="font-medium">
                      {Math.round(item.demandLevel * 100)}%
                    </span>
                  </span>
                  <span className="text-gray-500">
                    Elasticity:{' '}
                    <span className="font-medium">{item.priceElasticity}</span>
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Revenue Impact</p>
                  <p
                    className={cn(
                      'font-semibold',
                      item.potentialRevenue > 0
                        ? 'text-green-600'
                        : item.potentialRevenue < 0
                          ? 'text-red-600'
                          : 'text-gray-600',
                    )}
                  >
                    {item.potentialRevenue > 0 ? '+' : ''}$
                    {item.potentialRevenue.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MarketComparisonCard() {
  const getOpportunityColor = (opportunity: string) => {
    switch (opportunity) {
      case 'high':
        return 'bg-green-100 text-green-700';
      case 'medium':
        return 'bg-yellow-100 text-yellow-700';
      case 'low':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Market Comparison & Opportunities
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockMarketComparison.map((market, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{market.region}</h4>
                <Badge className={getOpportunityColor(market.opportunity)}>
                  {market.opportunity.charAt(0).toUpperCase() +
                    market.opportunity.slice(1)}{' '}
                  Opportunity
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Avg Wedding Cost</p>
                  <p className="font-medium">
                    ${market.avgWeddingCost.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Market Share</p>
                  <p className="font-medium">{market.marketShare}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Competitors</p>
                  <p className="font-medium">{market.competitorCount}</p>
                </div>
                <div>
                  <p className="text-gray-500">Growth Rate</p>
                  <p
                    className={cn(
                      'font-medium flex items-center gap-1',
                      market.growthRate > 10
                        ? 'text-green-600'
                        : market.growthRate > 5
                          ? 'text-yellow-600'
                          : 'text-red-600',
                    )}
                  >
                    {market.growthRate > 0 ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                    {market.growthRate}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={mockMarketComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="region" stroke="#6B7280" fontSize={12} />
              <YAxis stroke="#6B7280" fontSize={12} />
              <Tooltip />
              <Bar
                dataKey="marketShare"
                fill={WEDDING_COLORS.modern}
                name="Market Share %"
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientBehaviorInsights() {
  const mockClientBehavior: ClientBehaviorData[] = [
    {
      segment: 'Luxury Couples',
      avgBudget: 75000,
      bookingLeadTime: 18,
      preferredVendors: ['Premium Venues', 'Celebrity Photographers'],
      conversionRate: 0.65,
      lifetimeValue: 85000,
      churnRisk: 'low',
    },
    {
      segment: 'Budget-Conscious',
      avgBudget: 25000,
      bookingLeadTime: 12,
      preferredVendors: ['Community Centers', 'DIY Photographers'],
      conversionRate: 0.45,
      lifetimeValue: 28000,
      churnRisk: 'medium',
    },
    {
      segment: 'Millennials',
      avgBudget: 45000,
      bookingLeadTime: 15,
      preferredVendors: ['Instagram Venues', 'Social Media Photographers'],
      conversionRate: 0.55,
      lifetimeValue: 52000,
      churnRisk: 'medium',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Client Behavior Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockClientBehavior.map((segment, index) => (
            <div key={index} className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">
                  {segment.segment}
                </h4>
                <Badge
                  className={cn(
                    'text-xs',
                    segment.churnRisk === 'low' &&
                      'bg-green-100 text-green-700',
                    segment.churnRisk === 'medium' &&
                      'bg-yellow-100 text-yellow-700',
                    segment.churnRisk === 'high' && 'bg-red-100 text-red-700',
                  )}
                >
                  {segment.churnRisk.charAt(0).toUpperCase() +
                    segment.churnRisk.slice(1)}{' '}
                  Risk
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Avg Budget</p>
                  <p className="font-medium">
                    ${segment.avgBudget.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Lead Time</p>
                  <p className="font-medium">
                    {segment.bookingLeadTime} months
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Conversion Rate</p>
                  <p className="font-medium">
                    {Math.round(segment.conversionRate * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Lifetime Value</p>
                  <p className="font-medium">
                    ${segment.lifetimeValue.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="mt-3">
                <p className="text-sm text-gray-500">Preferred Vendors</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {segment.preferredVendors.map((vendor, vIndex) => (
                    <Badge key={vIndex} variant="outline" className="text-xs">
                      {vendor}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function IntelligenceInsights() {
  const insights = [
    {
      type: 'positive',
      icon: <Lightbulb className="w-5 h-5" />,
      title: 'Peak Season Opportunity',
      description:
        'June-September bookings are 45% above average. Consider premium pricing during peak months.',
      action: 'Implement dynamic pricing',
    },
    {
      type: 'warning',
      icon: <AlertCircle className="w-5 h-5" />,
      title: 'Pricing Below Market',
      description:
        'Photography services are priced 15% below market average with high demand.',
      action: 'Increase photography prices',
    },
    {
      type: 'positive',
      icon: <CheckCircle className="w-5 h-5" />,
      title: 'Strong Client Retention',
      description: 'Luxury segment shows 85% satisfaction and low churn risk.',
      action: 'Expand luxury offerings',
    },
    {
      type: 'neutral',
      icon: <Activity className="w-5 h-5" />,
      title: 'Market Expansion',
      description: 'Beach area shows 18% growth rate with limited competition.',
      action: 'Consider beach market entry',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          AI-Powered Business Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="flex gap-4 p-4 border rounded-lg">
              <div
                className={cn(
                  'flex items-center justify-center w-10 h-10 rounded-full',
                  insight.type === 'positive' && 'bg-green-100 text-green-600',
                  insight.type === 'warning' && 'bg-yellow-100 text-yellow-600',
                  insight.type === 'negative' && 'bg-red-100 text-red-600',
                  insight.type === 'neutral' && 'bg-gray-100 text-gray-600',
                )}
              >
                {insight.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">
                  {insight.title}
                </h4>
                <p className="text-sm text-gray-600 mb-2">
                  {insight.description}
                </p>
                <Button variant="outline" size="sm">
                  {insight.action}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function WeddingIntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState<
    'trends' | 'pricing' | 'market' | 'clients' | 'insights'
  >('trends');

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Wedding Industry Intelligence
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          AI-powered insights for wedding business optimization and market
          analysis
        </p>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap justify-center gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {[
          { key: 'trends', label: 'Seasonal Trends', icon: Calendar },
          { key: 'pricing', label: 'Price Optimization', icon: Target },
          { key: 'market', label: 'Market Analysis', icon: BarChart3 },
          { key: 'clients', label: 'Client Behavior', icon: Users },
          { key: 'insights', label: 'AI Insights', icon: Zap },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={activeTab === key ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(key as any)}
            className="flex items-center gap-2"
          >
            <Icon className="w-4 h-4" />
            {label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'trends' && <SeasonalTrendsCard />}
        {activeTab === 'pricing' && <PriceOptimizationCard />}
        {activeTab === 'market' && <MarketComparisonCard />}
        {activeTab === 'clients' && <ClientBehaviorInsights />}
        {activeTab === 'insights' && <IntelligenceInsights />}
      </div>
    </div>
  );
}
