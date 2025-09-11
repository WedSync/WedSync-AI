'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Globe,
  MapPin,
  DollarSign,
  Users,
  Calendar,
  Zap,
  Award,
} from 'lucide-react';

interface MarketInsightsProps {
  metrics: any;
  organizationId: string;
  timeRange: string;
}

export function MarketInsights({
  metrics,
  organizationId,
  timeRange,
}: MarketInsightsProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Market share and competitive data
  const marketShareData = [
    { month: 'Jan', wedSync: 12, honeyBook: 45, theKnot: 25, others: 18 },
    { month: 'Feb', wedSync: 14, honeyBook: 44, theKnot: 24, others: 18 },
    { month: 'Mar', wedSync: 16, honeyBook: 43, theKnot: 24, others: 17 },
    { month: 'Apr', wedSync: 18, honeyBook: 42, theKnot: 23, others: 17 },
    { month: 'May', wedSync: 20, honeyBook: 41, theKnot: 23, others: 16 },
    { month: 'Jun', wedSync: 22, honeyBook: 40, theKnot: 22, others: 16 },
  ];

  // Regional performance data
  const regionalData = [
    {
      region: 'London',
      marketShare: 28,
      revenue: 2.4,
      growth: 15.2,
      suppliers: 450,
    },
    {
      region: 'Manchester',
      marketShare: 18,
      revenue: 1.8,
      growth: 22.1,
      suppliers: 320,
    },
    {
      region: 'Birmingham',
      marketShare: 15,
      revenue: 1.2,
      growth: 18.5,
      suppliers: 280,
    },
    {
      region: 'Edinburgh',
      marketShare: 12,
      revenue: 0.9,
      growth: 25.3,
      suppliers: 190,
    },
    {
      region: 'Bristol',
      marketShare: 10,
      revenue: 0.7,
      growth: 19.8,
      suppliers: 150,
    },
    {
      region: 'Others',
      marketShare: 17,
      revenue: 1.5,
      growth: 12.4,
      suppliers: 380,
    },
  ];

  // Wedding industry trends
  const industryTrends = [
    { trend: 'Micro Weddings', growth: 145, impact: 'High', adoptionRate: 68 },
    {
      trend: 'Sustainable Weddings',
      growth: 89,
      impact: 'Medium',
      adoptionRate: 42,
    },
    { trend: 'Tech Integration', growth: 78, impact: 'High', adoptionRate: 73 },
    {
      trend: 'Destination Weddings',
      growth: 34,
      impact: 'Medium',
      adoptionRate: 28,
    },
    { trend: 'DIY Elements', growth: 52, impact: 'Low', adoptionRate: 55 },
  ];

  // Seasonal market analysis
  const seasonalMarketData = [
    { month: 'Jan', bookings: 850, avgSpend: 12500, marketActivity: 45 },
    { month: 'Feb', bookings: 1200, avgSpend: 13200, marketActivity: 62 },
    { month: 'Mar', bookings: 1800, avgSpend: 14500, marketActivity: 78 },
    { month: 'Apr', bookings: 2400, avgSpend: 15800, marketActivity: 85 },
    { month: 'May', bookings: 3200, avgSpend: 17200, marketActivity: 95 },
    { month: 'Jun', bookings: 4100, avgSpend: 18500, marketActivity: 100 },
    { month: 'Jul', bookings: 4500, avgSpend: 19200, marketActivity: 98 },
    { month: 'Aug', bookings: 4200, avgSpend: 18800, marketActivity: 92 },
    { month: 'Sep', bookings: 3800, avgSpend: 17500, marketActivity: 88 },
    { month: 'Oct', bookings: 2200, avgSpend: 15500, marketActivity: 68 },
    { month: 'Nov', bookings: 1500, avgSpend: 14200, marketActivity: 58 },
    { month: 'Dec', bookings: 900, avgSpend: 13800, marketActivity: 52 },
  ];

  const currentMarketShare = 22; // WedSync current market share
  const marketGrowthRate = 18.5; // Overall wedding tech market growth

  return (
    <div className="space-y-6">
      {/* Market Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Share</CardTitle>
            <Globe className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentMarketShare}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              UK wedding tech market
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">+2.5% this quarter</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marketGrowthRate}%</div>
            <div className="text-xs text-muted-foreground mt-1">
              Annual market expansion
            </div>
            <Badge variant="default" className="mt-2">
              Strong Growth
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Size</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">£2.8B</div>
            <div className="text-xs text-muted-foreground mt-1">
              UK wedding industry TAM
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              WedSync addressable: £450M
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Competitive Position
            </CardTitle>
            <Award className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">#3</div>
            <div className="text-xs text-muted-foreground mt-1">
              Market position
            </div>
            <Badge variant="secondary" className="mt-2">
              Challenger
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Market Share Evolution */}
      <Card>
        <CardHeader>
          <CardTitle>Market Share Evolution</CardTitle>
          <CardDescription>
            Competitive positioning in the UK wedding technology market
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={marketShareData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value}%`,
                    name,
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="wedSync"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="WedSync"
                />
                <Area
                  type="monotone"
                  dataKey="honeyBook"
                  stackId="1"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="HoneyBook"
                />
                <Area
                  type="monotone"
                  dataKey="theKnot"
                  stackId="1"
                  stroke="#ffc658"
                  fill="#ffc658"
                  name="The Knot"
                />
                <Area
                  type="monotone"
                  dataKey="others"
                  stackId="1"
                  stroke="#ff7c7c"
                  fill="#ff7c7c"
                  name="Others"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 text-blue-800">
              <Target size={16} />
              <span className="font-medium">Strategic Insight</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              WedSync is gaining 2-3% market share per quarter, primarily from
              HoneyBook and smaller competitors. Current trajectory suggests #2
              position achievable by Q4 2025.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Regional Market Performance
            </CardTitle>
            <CardDescription>
              Geographic market penetration and growth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {regionalData.map((region, index) => (
                <div
                  key={region.region}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-600">
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{region.region}</p>
                      <p className="text-xs text-gray-600">
                        {region.suppliers} suppliers • {region.marketShare}%
                        share
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      {formatCurrency(region.revenue * 1000000)}
                    </p>
                    <div className="flex items-center text-xs">
                      <TrendingUp size={12} className="mr-1 text-green-600" />
                      <span className="text-green-600">
                        {formatPercent(region.growth)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Industry Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Wedding Industry Trends
            </CardTitle>
            <CardDescription>
              Emerging trends and their growth impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {industryTrends.map((trend, index) => (
                <div
                  key={trend.trend}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div>
                    <p className="font-medium">{trend.trend}</p>
                    <p className="text-xs text-gray-600">
                      {trend.adoptionRate}% adoption rate
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          trend.impact === 'High'
                            ? 'default'
                            : trend.impact === 'Medium'
                              ? 'secondary'
                              : 'outline'
                        }
                      >
                        {trend.impact} Impact
                      </Badge>
                    </div>
                    <div className="flex items-center text-xs mt-1">
                      <TrendingUp size={12} className="mr-1 text-green-600" />
                      <span className="text-green-600">+{trend.growth}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Seasonal Market Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Market Activity</CardTitle>
          <CardDescription>
            Wedding booking patterns and average spend throughout the year
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={seasonalMarketData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'bookings'
                      ? `${value.toLocaleString()} bookings`
                      : name === 'avgSpend'
                        ? formatCurrency(value)
                        : `${value}% activity`,
                    name === 'bookings'
                      ? 'Wedding Bookings'
                      : name === 'avgSpend'
                        ? 'Average Spend'
                        : 'Market Activity',
                  ]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="bookings"
                  fill="#8884d8"
                  name="bookings"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgSpend"
                  stroke="#82ca9d"
                  strokeWidth={3}
                  name="avgSpend"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="marketActivity"
                  stroke="#ff7300"
                  strokeWidth={2}
                  name="marketActivity"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Competitive Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Competitive Landscape Analysis</CardTitle>
          <CardDescription>
            Strategic positioning against key competitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              <h4 className="font-semibold text-blue-800">
                HoneyBook (Leader)
              </h4>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Market Share:</span>
                  <span className="font-bold">40%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pricing:</span>
                  <span className="font-bold">$39/mo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Strength:</span>
                  <span className="font-bold">Brand Recognition</span>
                </div>
              </div>
              <Badge variant="outline" className="mt-3">
                Primary Competitor
              </Badge>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <h4 className="font-semibold text-green-800">
                WedSync (Challenger)
              </h4>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Market Share:</span>
                  <span className="font-bold">22%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pricing:</span>
                  <span className="font-bold">£19-149/mo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Strength:</span>
                  <span className="font-bold">UK Focus</span>
                </div>
              </div>
              <Badge variant="default" className="mt-3">
                Our Position
              </Badge>
            </div>

            <div className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg">
              <h4 className="font-semibold text-yellow-800">
                The Knot (Follower)
              </h4>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Market Share:</span>
                  <span className="font-bold">22%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Pricing:</span>
                  <span className="font-bold">$49/mo</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Strength:</span>
                  <span className="font-bold">Directory Focus</span>
                </div>
              </div>
              <Badge variant="secondary" className="mt-3">
                Direct Competitor
              </Badge>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg">
            <h4 className="font-semibold text-purple-800 mb-2">
              Strategic Opportunities
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Price Positioning</p>
                  <p className="text-purple-700">
                    More affordable than HoneyBook while offering comparable
                    features
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Local Expertise</p>
                  <p className="text-purple-700">
                    Deep UK wedding market knowledge and vendor relationships
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Innovation Edge</p>
                  <p className="text-purple-700">
                    AI-powered features and modern tech stack advantage
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium">Customer Focus</p>
                  <p className="text-purple-700">
                    Better customer support and photographer-specific features
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Opportunity Assessment */}
      <Card>
        <CardHeader>
          <CardTitle>Market Opportunity Assessment</CardTitle>
          <CardDescription>
            Total Addressable Market and growth projections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg">
              <h4 className="font-semibold text-blue-800">TAM</h4>
              <p className="text-2xl font-bold text-blue-900 mt-2">£2.8B</p>
              <p className="text-xs text-blue-600 mt-1">
                Total Addressable Market
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <h4 className="font-semibold text-green-800">SAM</h4>
              <p className="text-2xl font-bold text-green-900 mt-2">£450M</p>
              <p className="text-xs text-green-600 mt-1">
                Serviceable Addressable Market
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg">
              <h4 className="font-semibold text-purple-800">SOM</h4>
              <p className="text-2xl font-bold text-purple-900 mt-2">£99M</p>
              <p className="text-xs text-purple-600 mt-1">
                Serviceable Obtainable Market
              </p>
            </div>

            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-lg">
              <h4 className="font-semibold text-orange-800">Current</h4>
              <p className="text-2xl font-bold text-orange-900 mt-2">£8.4M</p>
              <p className="text-xs text-orange-600 mt-1">
                Current Market Position
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MarketInsights;
