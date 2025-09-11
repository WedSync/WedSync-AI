'use client';

/**
 * WS-224: Progress Charts System - Vendor Metrics Component
 * Vendor performance analytics and supplier relationship metrics
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  Users,
  Star,
  Clock,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Phone,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type {
  VendorMetric,
  ProgressOverview,
  WeddingMilestone,
} from '@/types/charts';

interface VendorMetricsProps {
  vendors: VendorMetric[];
  milestones: WeddingMilestone[];
  overview: ProgressOverview | null;
  className?: string;
}

export function VendorMetrics({
  vendors,
  milestones,
  overview,
  className,
}: VendorMetricsProps) {
  const [selectedView, setSelectedView] = useState<
    'overview' | 'performance' | 'satisfaction' | 'revenue'
  >('overview');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories
  const categories = Array.from(
    new Set(vendors.map((vendor) => vendor.category)),
  );

  // Filter vendors by category
  const filteredVendors =
    selectedCategory === 'all'
      ? vendors
      : vendors.filter((vendor) => vendor.category === selectedCategory);

  // Calculate vendor statistics
  const avgResponseTime =
    vendors.length > 0
      ? vendors.reduce((sum, v) => sum + v.responseTime, 0) / vendors.length
      : 0;

  const avgSatisfaction =
    vendors.length > 0
      ? vendors.reduce((sum, v) => sum + v.satisfaction, 0) / vendors.length
      : 0;

  const avgCompletionRate =
    vendors.length > 0
      ? vendors.reduce((sum, v) => sum + v.completionRate, 0) / vendors.length
      : 0;

  const totalRevenue = vendors.reduce((sum, v) => sum + v.revenue, 0);

  // Performance categories
  const performanceData = vendors.map((vendor) => ({
    name: vendor.name,
    satisfaction: vendor.satisfaction,
    responseTime: 24 - Math.min(24, vendor.responseTime), // Invert for better visualization
    completionRate: vendor.completionRate,
    onTimeDelivery: vendor.onTimeDelivery,
    totalBookings: vendor.totalBookings,
    revenue: vendor.revenue,
  }));

  // Category performance
  const categoryPerformance = categories.map((category) => {
    const categoryVendors = vendors.filter((v) => v.category === category);
    const avgSat =
      categoryVendors.reduce((sum, v) => sum + v.satisfaction, 0) /
      categoryVendors.length;
    const avgResp =
      categoryVendors.reduce((sum, v) => sum + v.responseTime, 0) /
      categoryVendors.length;
    const avgComp =
      categoryVendors.reduce((sum, v) => sum + v.completionRate, 0) /
      categoryVendors.length;
    const totalRev = categoryVendors.reduce((sum, v) => sum + v.revenue, 0);

    return {
      category,
      averageSatisfaction: avgSat,
      averageResponseTime: avgResp,
      averageCompletionRate: avgComp,
      totalRevenue: totalRev,
      vendorCount: categoryVendors.length,
    };
  });

  // Top performers
  const topPerformers = [...vendors]
    .sort((a, b) => {
      const scoreA =
        a.satisfaction * 0.3 + a.completionRate * 0.3 + a.onTimeDelivery * 0.4;
      const scoreB =
        b.satisfaction * 0.3 + b.completionRate * 0.3 + b.onTimeDelivery * 0.4;
      return scoreB - scoreA;
    })
    .slice(0, 5);

  // Response time distribution
  const responseTimeData = [
    { range: '< 2h', count: vendors.filter((v) => v.responseTime < 2).length },
    {
      range: '2-6h',
      count: vendors.filter((v) => v.responseTime >= 2 && v.responseTime < 6)
        .length,
    },
    {
      range: '6-24h',
      count: vendors.filter((v) => v.responseTime >= 6 && v.responseTime < 24)
        .length,
    },
    {
      range: '> 24h',
      count: vendors.filter((v) => v.responseTime >= 24).length,
    },
  ];

  // Satisfaction distribution
  const satisfactionData = [
    {
      rating: '5 Star',
      count: vendors.filter((v) => v.satisfaction >= 4.5).length,
      color: '#22c55e',
    },
    {
      rating: '4 Star',
      count: vendors.filter(
        (v) => v.satisfaction >= 3.5 && v.satisfaction < 4.5,
      ).length,
      color: '#3b82f6',
    },
    {
      rating: '3 Star',
      count: vendors.filter(
        (v) => v.satisfaction >= 2.5 && v.satisfaction < 3.5,
      ).length,
      color: '#f59e0b',
    },
    {
      rating: '< 3 Star',
      count: vendors.filter((v) => v.satisfaction < 2.5).length,
      color: '#dc2626',
    },
  ];

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Get satisfaction color
  const getSatisfactionColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 bg-green-100';
    if (rating >= 3.5) return 'text-blue-600 bg-blue-100';
    if (rating >= 2.5) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  // Get response time badge
  const getResponseTimeBadge = (hours: number) => {
    if (hours < 2) return { variant: 'success' as const, text: 'Excellent' };
    if (hours < 6) return { variant: 'default' as const, text: 'Good' };
    if (hours < 24) return { variant: 'warning' as const, text: 'Fair' };
    return { variant: 'destructive' as const, text: 'Poor' };
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with view controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">
            Vendor Performance Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Monitor supplier relationships, performance metrics, and
            satisfaction scores
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border p-1">
            {['overview', 'performance', 'satisfaction', 'revenue'].map(
              (view) => (
                <Button
                  key={view}
                  variant={selectedView === view ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setSelectedView(view as any)}
                  className="capitalize"
                >
                  {view}
                </Button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{vendors.length}</div>
            <p className="text-xs text-muted-foreground">Active suppliers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Satisfaction
            </CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgSatisfaction.toFixed(1)}/5
            </div>
            <p className="text-xs text-muted-foreground">Overall rating</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Response Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgResponseTime.toFixed(0)}h
            </div>
            <p className="text-xs text-muted-foreground">Time to respond</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">Generated revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={selectedCategory === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setSelectedCategory('all')}
        >
          All Categories
        </Button>
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* View Content */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Vendors</CardTitle>
              <CardDescription>
                Vendors ranked by overall performance score
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topPerformers.map((vendor, index) => {
                  const overallScore =
                    vendor.satisfaction * 0.3 +
                    vendor.completionRate * 0.3 +
                    vendor.onTimeDelivery * 0.4;
                  const responseTimeBadge = getResponseTimeBadge(
                    vendor.responseTime,
                  );

                  return (
                    <div
                      key={vendor.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <Badge
                          variant="outline"
                          className="w-8 h-8 rounded-full flex items-center justify-center"
                        >
                          {index + 1}
                        </Badge>
                        <div>
                          <h4 className="font-medium">{vendor.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="outline"
                              className="capitalize text-xs"
                            >
                              {vendor.category}
                            </Badge>
                            <Badge
                              variant={responseTimeBadge.variant}
                              className="text-xs"
                            >
                              {responseTimeBadge.text} Response
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="flex items-center gap-1 mb-1">
                          <Star className="h-4 w-4 text-yellow-400 fill-current" />
                          <span className="font-medium">
                            {vendor.satisfaction.toFixed(1)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Score: {overallScore.toFixed(1)}/5
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Response Time & Satisfaction Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Response Time Distribution</CardTitle>
                <CardDescription>
                  How quickly vendors typically respond
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Satisfaction Ratings</CardTitle>
                <CardDescription>
                  Distribution of vendor satisfaction scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={satisfactionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rating" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill={(entry: any) => entry.color} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {selectedView === 'performance' && (
        <div className="space-y-6">
          {/* Performance Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Category Performance Overview</CardTitle>
              <CardDescription>
                Multi-dimensional performance analysis by vendor category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <RadarChart data={categoryPerformance}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="category" />
                  <PolarRadiusAxis angle={90} domain={[0, 5]} />
                  <Radar
                    name="Avg Satisfaction"
                    dataKey="averageSatisfaction"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                  />
                  <Radar
                    name="Completion Rate"
                    dataKey="averageCompletionRate"
                    stroke="#22c55e"
                    fill="#22c55e"
                    fillOpacity={0.3}
                  />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Individual Vendor Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Vendor Performance Matrix</CardTitle>
              <CardDescription>
                Satisfaction vs completion rate analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="satisfaction"
                    name="Satisfaction"
                    domain={[0, 5]}
                    label={{
                      value: 'Satisfaction Rating',
                      position: 'insideBottom',
                      offset: -5,
                    }}
                  />
                  <YAxis
                    dataKey="completionRate"
                    name="Completion Rate"
                    domain={[0, 100]}
                    label={{
                      value: 'Completion Rate (%)',
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm">
                              Satisfaction: {data.satisfaction}/5
                            </p>
                            <p className="text-sm">
                              Completion: {data.completionRate}%
                            </p>
                            <p className="text-sm">
                              Revenue: {formatCurrency(data.revenue)}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter dataKey="completionRate" fill="#3b82f6" />
                </ScatterChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedView === 'satisfaction' && (
        <div className="space-y-4">
          {filteredVendors
            .sort((a, b) => b.satisfaction - a.satisfaction)
            .map((vendor) => {
              const responseTimeBadge = getResponseTimeBadge(
                vendor.responseTime,
              );

              return (
                <Card key={vendor.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="h-12 w-12">
                          <div className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {vendor.name.charAt(0)}
                          </div>
                        </Avatar>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{vendor.name}</h4>
                            <Badge variant="outline" className="capitalize">
                              {vendor.category}
                            </Badge>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Satisfaction
                              </p>
                              <div className="flex items-center gap-1">
                                <Star className="h-4 w-4 text-yellow-400 fill-current" />
                                <span className="font-medium">
                                  {vendor.satisfaction.toFixed(1)}/5
                                </span>
                              </div>
                            </div>

                            <div>
                              <p className="text-xs text-muted-foreground">
                                Response Time
                              </p>
                              <Badge
                                variant={responseTimeBadge.variant}
                                size="sm"
                              >
                                {vendor.responseTime}h
                              </Badge>
                            </div>

                            <div>
                              <p className="text-xs text-muted-foreground">
                                Completion Rate
                              </p>
                              <p className="font-medium">
                                {vendor.completionRate}%
                              </p>
                            </div>

                            <div>
                              <p className="text-xs text-muted-foreground">
                                On-Time Delivery
                              </p>
                              <p className="font-medium">
                                {vendor.onTimeDelivery}%
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                            <span>{vendor.totalBookings} bookings</span>
                            <span>
                              Last contact:{' '}
                              {new Date(
                                vendor.lastContact,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-medium text-lg">
                          {formatCurrency(vendor.revenue)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Total revenue
                        </p>

                        <div className="flex gap-1 mt-2">
                          <Button size="sm" variant="outline">
                            <Phone className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline">
                            <Mail className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {selectedView === 'revenue' && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
            <CardDescription>
              Revenue generation across vendor categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value: any) => formatCurrency(value)}
                  labelFormatter={(label) => `${label} Category`}
                />
                <Bar dataKey="totalRevenue" fill="#22c55e" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {filteredVendors.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h4 className="font-medium text-gray-900 mb-2">
                No vendors found
              </h4>
              <p className="text-gray-600">
                {selectedCategory === 'all'
                  ? 'No vendors have been added yet.'
                  : `No vendors found for ${selectedCategory} category.`}
              </p>
              <Button variant="outline" className="mt-4">
                Add Vendor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default VendorMetrics;
