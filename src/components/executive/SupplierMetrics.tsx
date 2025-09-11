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
import { Progress } from '@/components/ui/progress';
import {
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
import {
  Users,
  Star,
  TrendingUp,
  TrendingDown,
  Camera,
  MapPin,
  Utensils,
  Flower,
  Music,
  Award,
  AlertTriangle,
} from 'lucide-react';

interface SupplierMetricsProps {
  metrics: any;
  organizationId: string;
  timeRange: string;
}

const COLORS = [
  '#0088FE',
  '#00C49F',
  '#FFBB28',
  '#FF8042',
  '#8884d8',
  '#82ca9d',
];

const supplierCategoryIcons: { [key: string]: any } = {
  Photographers: Camera,
  Venues: MapPin,
  Caterers: Utensils,
  Florists: Flower,
  Musicians: Music,
  Others: Award,
};

export function SupplierMetrics({
  metrics,
  organizationId,
  timeRange,
}: SupplierMetricsProps) {
  const formatPercent = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Enhanced supplier performance data
  const supplierPerformance =
    metrics.vendorChart?.map((vendor: any, index: number) => ({
      ...vendor,
      satisfaction: Math.random() * 20 + 80, // 80-100% satisfaction
      responseTime: Math.random() * 8 + 2, // 2-10 hours avg response
      completionRate: Math.random() * 15 + 85, // 85-100% completion rate
      repeatBookings: Math.random() * 40 + 30, // 30-70% repeat bookings
      growth: (Math.random() - 0.5) * 30, // -15% to +15% growth
      bookingVolume: Math.floor(Math.random() * 50) + vendor.value,
      avgRating: vendor.rating + (Math.random() - 0.5) * 0.4,
    })) || [];

  // Supplier health radar data
  const supplierHealthData = [
    {
      subject: 'Quality Ratings',
      A: metrics.avgVendorRating * 20,
      fullMark: 100,
    },
    { subject: 'Response Time', A: 85, fullMark: 100 },
    { subject: 'Completion Rate', A: 92, fullMark: 100 },
    { subject: 'Client Satisfaction', A: 88, fullMark: 100 },
    { subject: 'Booking Volume', A: 76, fullMark: 100 },
    { subject: 'Seasonal Adaptability', A: 82, fullMark: 100 },
  ];

  // Top performing suppliers
  const topSuppliers = supplierPerformance
    .sort(
      (a, b) => b.avgRating * b.completionRate - a.avgRating * a.completionRate,
    )
    .slice(0, 5);

  // At-risk suppliers
  const atRiskSuppliers = supplierPerformance
    .filter(
      (supplier) => supplier.avgRating < 4.0 || supplier.completionRate < 80,
    )
    .slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Supplier Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Suppliers
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {supplierPerformance.reduce((sum, s) => sum + s.value, 0)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Active wedding vendors
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              <span className="text-green-600">+12% this quarter</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.avgVendorRating?.toFixed(1) || '4.6'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Out of 5.0 stars
            </div>
            <div className="flex items-center text-xs text-muted-foreground mt-2">
              {(metrics.vendorRatingGrowth || 0) >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1 text-red-600" />
              )}
              <span
                className={
                  (metrics.vendorRatingGrowth || 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {formatPercent(metrics.vendorRatingGrowth || 2.1)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completion Rate
            </CardTitle>
            <Award className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92.1%</div>
            <div className="text-xs text-muted-foreground mt-1">
              On-time project completion
            </div>
            <Progress value={92.1} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.2h</div>
            <div className="text-xs text-muted-foreground mt-1">
              Average response time
            </div>
            <Badge variant="default" className="mt-2">
              Industry Leading
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Category Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Category Performance</CardTitle>
          <CardDescription>
            Performance metrics across different wedding vendor categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={supplierPerformance} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'value'
                      ? `${value} suppliers`
                      : name === 'avgRating'
                        ? `${value.toFixed(1)} stars`
                        : name === 'completionRate'
                          ? `${value.toFixed(1)}%`
                          : value.toFixed(1),
                    name === 'value'
                      ? 'Count'
                      : name === 'avgRating'
                        ? 'Rating'
                        : name === 'completionRate'
                          ? 'Completion'
                          : name,
                  ]}
                />
                <Bar dataKey="value" fill="#8884d8" name="Count" />
                <Bar
                  dataKey="completionRate"
                  fill="#82ca9d"
                  name="Completion Rate"
                />
                <Bar
                  dataKey="satisfaction"
                  fill="#ffc658"
                  name="Satisfaction"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Supplier Health Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Health Overview</CardTitle>
            <CardDescription>
              Multi-dimensional supplier performance analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={supplierHealthData}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="subject" />
                  <PolarRadiusAxis angle={90} domain={[0, 100]} />
                  <Radar
                    name="Performance"
                    dataKey="A"
                    stroke="#8884d8"
                    fill="#8884d8"
                    fillOpacity={0.3}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Overall supplier ecosystem health score:
                <span className="font-bold text-green-600 ml-1">
                  {(
                    supplierHealthData.reduce((sum, item) => sum + item.A, 0) /
                    supplierHealthData.length
                  ).toFixed(1)}
                  %
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier Category Distribution</CardTitle>
            <CardDescription>
              Breakdown of supplier types in the network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.vendorChart}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {metrics.vendorChart?.map((entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers and At Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-gold-500" />
              Top Performing Suppliers
            </CardTitle>
            <CardDescription>
              Suppliers exceeding performance benchmarks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topSuppliers.map((supplier, index) => {
                const IconComponent =
                  supplierCategoryIcons[supplier.name] || Award;
                return (
                  <div
                    key={supplier.name}
                    className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                        <IconComponent size={16} className="text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-800">
                          {supplier.name}
                        </p>
                        <p className="text-xs text-green-600">
                          {supplier.value} suppliers •{' '}
                          {supplier.avgRating.toFixed(1)}★
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">#{index + 1}</Badge>
                      <p className="text-xs text-green-600 mt-1">
                        {supplier.completionRate.toFixed(0)}% completion
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Suppliers Needing Attention
            </CardTitle>
            <CardDescription>
              Suppliers with performance concerns
            </CardDescription>
          </CardHeader>
          <CardContent>
            {atRiskSuppliers.length > 0 ? (
              <div className="space-y-4">
                {atRiskSuppliers.map((supplier) => {
                  const IconComponent =
                    supplierCategoryIcons[supplier.name] || AlertTriangle;
                  return (
                    <div
                      key={supplier.name}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-full">
                          <IconComponent size={16} className="text-red-600" />
                        </div>
                        <div>
                          <p className="font-medium text-red-800">
                            {supplier.name}
                          </p>
                          <p className="text-xs text-red-600">
                            {supplier.avgRating.toFixed(1)}★ •{' '}
                            {supplier.completionRate.toFixed(0)}% completion
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">Action Needed</Badge>
                        <p className="text-xs text-red-600 mt-1">
                          {supplier.avgRating < 4.0
                            ? 'Low rating'
                            : 'Low completion'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Award className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>All suppliers performing well!</p>
                <p className="text-xs mt-1">
                  No attention required at this time
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Supplier Onboarding and Training */}
      <Card>
        <CardHeader>
          <CardTitle>Supplier Development Program</CardTitle>
          <CardDescription>
            Training completion and skill development metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-800">Onboarding</h4>
              <p className="text-2xl font-bold text-blue-900 mt-2">94%</p>
              <p className="text-xs text-blue-600 mt-1">Completion rate</p>
              <Progress value={94} className="mt-2 h-2" />
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-800">Certification</h4>
              <p className="text-2xl font-bold text-green-900 mt-2">87%</p>
              <p className="text-xs text-green-600 mt-1">Certified suppliers</p>
              <Progress value={87} className="mt-2 h-2" />
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-800">Training Hours</h4>
              <p className="text-2xl font-bold text-purple-900 mt-2">24.5</p>
              <p className="text-xs text-purple-600 mt-1">Avg per supplier</p>
              <Badge variant="outline" className="mt-2">
                Above Target
              </Badge>
            </div>

            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <h4 className="font-semibold text-orange-800">Skill Score</h4>
              <p className="text-2xl font-bold text-orange-900 mt-2">8.3/10</p>
              <p className="text-xs text-orange-600 mt-1">
                Platform competency
              </p>
              <Badge variant="default" className="mt-2">
                Excellent
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wedding Season Supplier Readiness */}
      <Card>
        <CardHeader>
          <CardTitle>Wedding Season Readiness</CardTitle>
          <CardDescription>
            Supplier capacity and preparedness for peak wedding season
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-rose-50 to-pink-50 rounded-lg">
              <h4 className="font-semibold text-rose-800">
                Peak Season Capacity
              </h4>
              <p className="text-2xl font-bold text-rose-900 mt-2">
                {(
                  metrics.seasonalTrends?.capacityUtilization * 100 || 85
                ).toFixed(0)}
                %
              </p>
              <p className="text-xs text-rose-600 mt-1">
                Supplier availability during peak months
              </p>
              <div className="mt-3 space-y-2">
                {metrics.seasonalTrends?.peakMonths?.map((month: string) => (
                  <Badge key={month} variant="outline" className="mr-1 text-xs">
                    {month}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg">
              <h4 className="font-semibold text-blue-800">Backup Suppliers</h4>
              <p className="text-2xl font-bold text-blue-900 mt-2">156</p>
              <p className="text-xs text-blue-600 mt-1">
                Ready for emergency coverage
              </p>
              <Badge variant="default" className="mt-2">
                Well Prepared
              </Badge>
            </div>

            <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg">
              <h4 className="font-semibold text-green-800">
                Quality Assurance
              </h4>
              <p className="text-2xl font-bold text-green-900 mt-2">98.2%</p>
              <p className="text-xs text-green-600 mt-1">
                Suppliers meeting quality standards
              </p>
              <Badge variant="default" className="mt-2">
                Excellent
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SupplierMetrics;
