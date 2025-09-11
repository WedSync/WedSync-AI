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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Calendar,
  Camera,
  Heart,
  MapPin,
  Music,
  Flower2,
  Users,
  TrendingUp,
  Clock,
  Activity,
  Star,
  Wedding,
  Baby,
} from 'lucide-react';

// Wedding Analytics Data Types
interface WeddingAPIMetrics {
  totalWeddings: number;
  activeVendors: number;
  peakSeasonMultiplier: number;
  weddingDayApiCalls: number;
  averageResponseTime: number;
  clientSatisfactionScore: number;
}

interface VendorUsageData {
  vendorType: string;
  apiCalls: number;
  dataTransfer: number;
  averageResponseTime: number;
  errorRate: number;
  peakUsageHour: number;
  color: string;
}

interface SeasonalTrend {
  month: string;
  weddings: number;
  apiCalls: number;
  revenue: number;
  satisfaction: number;
}

interface WeddingDayHourlyData {
  hour: string;
  apiCalls: number;
  photoUploads: number;
  clientMessages: number;
  emergencyCalls: number;
}

const VENDOR_TYPES = {
  photographer: { name: 'Photographers', icon: Camera, color: '#E11D48' },
  venue: { name: 'Venues', icon: MapPin, color: '#7C3AED' },
  florist: { name: 'Florists', icon: Flower2, color: '#10B981' },
  musician: { name: 'Musicians', icon: Music, color: '#3B82F6' },
  planner: { name: 'Planners', icon: Users, color: '#F59E0B' },
  caterer: { name: 'Caterers', icon: Baby, color: '#8B5CF6' },
};

export default function WeddingAPIUsageAnalytics(): JSX.Element {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>(
    '30d',
  );
  const [selectedVendorType, setSelectedVendorType] = useState<string>('all');
  const [metrics, setMetrics] = useState<WeddingAPIMetrics | null>(null);
  const [vendorData, setVendorData] = useState<VendorUsageData[]>([]);
  const [seasonalData, setSeasonalData] = useState<SeasonalTrend[]>([]);
  const [hourlyData, setHourlyData] = useState<WeddingDayHourlyData[]>([]);

  useEffect(() => {
    // Mock data generation
    const mockMetrics: WeddingAPIMetrics = {
      totalWeddings: 342,
      activeVendors: 89,
      peakSeasonMultiplier: 2.3,
      weddingDayApiCalls: 45000,
      averageResponseTime: 145,
      clientSatisfactionScore: 4.8,
    };

    const mockVendorData: VendorUsageData[] = [
      {
        vendorType: 'photographer',
        apiCalls: 15420,
        dataTransfer: 2.3, // GB
        averageResponseTime: 180,
        errorRate: 0.8,
        peakUsageHour: 16,
        color: '#E11D48',
      },
      {
        vendorType: 'venue',
        apiCalls: 8950,
        dataTransfer: 0.8,
        averageResponseTime: 120,
        errorRate: 0.3,
        peakUsageHour: 14,
        color: '#7C3AED',
      },
      {
        vendorType: 'florist',
        apiCalls: 4200,
        dataTransfer: 0.4,
        averageResponseTime: 160,
        errorRate: 0.5,
        peakUsageHour: 10,
        color: '#10B981',
      },
    ];

    const mockSeasonalData: SeasonalTrend[] = [
      {
        month: 'Jan',
        weddings: 12,
        apiCalls: 8500,
        revenue: 2400,
        satisfaction: 4.7,
      },
      {
        month: 'Feb',
        weddings: 18,
        apiCalls: 12000,
        revenue: 3600,
        satisfaction: 4.8,
      },
      {
        month: 'Mar',
        weddings: 28,
        apiCalls: 18500,
        revenue: 5600,
        satisfaction: 4.8,
      },
      {
        month: 'Apr',
        weddings: 45,
        apiCalls: 28000,
        revenue: 9000,
        satisfaction: 4.9,
      },
      {
        month: 'May',
        weddings: 68,
        apiCalls: 42000,
        revenue: 13600,
        satisfaction: 4.9,
      },
      {
        month: 'Jun',
        weddings: 89,
        apiCalls: 55000,
        revenue: 17800,
        satisfaction: 4.8,
      },
      {
        month: 'Jul',
        weddings: 92,
        apiCalls: 58000,
        revenue: 18400,
        satisfaction: 4.9,
      },
      {
        month: 'Aug',
        weddings: 87,
        apiCalls: 54000,
        revenue: 17400,
        satisfaction: 4.8,
      },
      {
        month: 'Sep',
        weddings: 78,
        apiCalls: 48000,
        revenue: 15600,
        satisfaction: 4.9,
      },
      {
        month: 'Oct',
        weddings: 52,
        apiCalls: 32000,
        revenue: 10400,
        satisfaction: 4.7,
      },
      {
        month: 'Nov',
        weddings: 25,
        apiCalls: 16000,
        revenue: 5000,
        satisfaction: 4.6,
      },
      {
        month: 'Dec',
        weddings: 15,
        apiCalls: 10000,
        revenue: 3000,
        satisfaction: 4.7,
      },
    ];

    const mockHourlyData: WeddingDayHourlyData[] = Array.from(
      { length: 24 },
      (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        apiCalls:
          Math.floor(Math.random() * 2000) + (i >= 8 && i <= 22 ? 1000 : 200),
        photoUploads:
          Math.floor(Math.random() * 500) + (i >= 14 && i <= 20 ? 800 : 100),
        clientMessages:
          Math.floor(Math.random() * 300) + (i >= 10 && i <= 18 ? 400 : 50),
        emergencyCalls:
          Math.floor(Math.random() * 10) + (i >= 12 && i <= 18 ? 5 : 0),
      }),
    );

    setMetrics(mockMetrics);
    setVendorData(mockVendorData);
    setSeasonalData(mockSeasonalData);
    setHourlyData(mockHourlyData);
  }, [timeRange]);

  const filteredVendorData = useMemo(() => {
    if (selectedVendorType === 'all') return vendorData;
    return vendorData.filter(
      (vendor) => vendor.vendorType === selectedVendorType,
    );
  }, [vendorData, selectedVendorType]);

  const totalApiCalls = useMemo(() => {
    return vendorData.reduce((sum, vendor) => sum + vendor.apiCalls, 0);
  }, [vendorData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Wedding API Analytics
          </h1>
          <p className="text-muted-foreground">
            Comprehensive insights into your wedding vendor API usage patterns
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <Select
            value={selectedVendorType}
            onValueChange={setSelectedVendorType}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vendors</SelectItem>
              {Object.entries(VENDOR_TYPES).map(([key, vendor]) => (
                <SelectItem key={key} value={key}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={timeRange}
            onValueChange={(value: any) => setTimeRange(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Weddings
            </CardTitle>
            <Wedding className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-pink-600">
              {metrics?.totalWeddings}
            </div>
            <p className="text-xs text-muted-foreground">
              This {timeRange.replace('d', ' days').replace('y', ' year')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Vendors
            </CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics?.activeVendors}
            </div>
            <p className="text-xs text-muted-foreground">Using API actively</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {totalApiCalls.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +23% from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Client Satisfaction
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {metrics?.clientSatisfactionScore}/5
            </div>
            <p className="text-xs text-muted-foreground">Average rating</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Analytics</TabsTrigger>
          <TabsTrigger value="seasonal">Seasonal Trends</TabsTrigger>
          <TabsTrigger value="wedding-day">Wedding Day</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Usage by Vendor Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vendorData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ vendorType, value }) =>
                          `${VENDOR_TYPES[vendorType as keyof typeof VENDOR_TYPES]?.name}: ${((value / totalApiCalls) * 100).toFixed(1)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="apiCalls"
                      >
                        {vendorData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [
                          value.toLocaleString(),
                          'API Calls',
                        ]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Response Time by Vendor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vendorData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="vendorType"
                        tickFormatter={(value) =>
                          VENDOR_TYPES[
                            value as keyof typeof VENDOR_TYPES
                          ]?.name.split(' ')[0] || value
                        }
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) =>
                          VENDOR_TYPES[value as keyof typeof VENDOR_TYPES]
                            ?.name || value
                        }
                        formatter={(value: number) => [
                          `${value}ms`,
                          'Response Time',
                        ]}
                      />
                      <Bar
                        dataKey="averageResponseTime"
                        fill="#8B5CF6"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Error Rate Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Error Rate Analysis</CardTitle>
              <CardDescription>
                API error rates by vendor type with wedding impact assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {vendorData.map((vendor) => {
                  const VendorIcon =
                    VENDOR_TYPES[vendor.vendorType as keyof typeof VENDOR_TYPES]
                      ?.icon || Users;
                  const vendorName =
                    VENDOR_TYPES[vendor.vendorType as keyof typeof VENDOR_TYPES]
                      ?.name || vendor.vendorType;

                  return (
                    <div
                      key={vendor.vendorType}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <VendorIcon
                          className="h-5 w-5"
                          style={{ color: vendor.color }}
                        />
                        <div>
                          <p className="font-medium">{vendorName}</p>
                          <p className="text-sm text-muted-foreground">
                            {vendor.apiCalls.toLocaleString()} calls • Peak at{' '}
                            {vendor.peakUsageHour}:00
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">{vendor.errorRate}%</p>
                          <p className="text-sm text-muted-foreground">
                            Error rate
                          </p>
                        </div>
                        <Progress
                          value={vendor.errorRate}
                          max={5}
                          className="w-24"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Transfer by Vendor</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={vendorData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="vendorType"
                        tickFormatter={(value) =>
                          VENDOR_TYPES[
                            value as keyof typeof VENDOR_TYPES
                          ]?.name.split(' ')[0] || value
                        }
                      />
                      <YAxis />
                      <Tooltip
                        labelFormatter={(value) =>
                          VENDOR_TYPES[value as keyof typeof VENDOR_TYPES]
                            ?.name || value
                        }
                        formatter={(value: number) => [
                          `${value} GB`,
                          'Data Transfer',
                        ]}
                      />
                      <Bar
                        dataKey="dataTransfer"
                        fill="#10B981"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Usage Hours</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {vendorData.map((vendor) => {
                    const VendorIcon =
                      VENDOR_TYPES[
                        vendor.vendorType as keyof typeof VENDOR_TYPES
                      ]?.icon || Users;
                    const vendorName =
                      VENDOR_TYPES[
                        vendor.vendorType as keyof typeof VENDOR_TYPES
                      ]?.name || vendor.vendorType;

                    return (
                      <div
                        key={vendor.vendorType}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div className="flex items-center space-x-3">
                          <VendorIcon
                            className="h-5 w-5"
                            style={{ color: vendor.color }}
                          />
                          <div>
                            <p className="font-medium">{vendorName}</p>
                            <p className="text-sm text-muted-foreground">
                              Peak usage analysis
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {vendor.peakUsageHour}:00
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Peak hour
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Seasonal Trends Tab */}
        <TabsContent value="seasonal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Season Analytics</CardTitle>
              <CardDescription>
                API usage patterns throughout the wedding season
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={seasonalData}>
                    <defs>
                      <linearGradient
                        id="weddingsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#E11D48"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#E11D48"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="apiCallsGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3B82F6"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#3B82F6"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="weddings"
                      stroke="#E11D48"
                      fillOpacity={1}
                      fill="url(#weddingsGradient)"
                      name="Weddings"
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="apiCalls"
                      stroke="#3B82F6"
                      fillOpacity={0.6}
                      fill="url(#apiCallsGradient)"
                      name="API Calls (K)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Peak Season Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Peak Season (May-September)</span>
                    <Badge variant="destructive">2.3x Normal Load</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Busiest Month</span>
                    <Badge variant="default">July (92 weddings)</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>API Load Increase</span>
                    <Badge variant="secondary">+340% in peak season</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Client Satisfaction</span>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-500 mr-1" />
                      <span>4.8/5 average</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Correlation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={seasonalData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip
                        formatter={(value: number) => [
                          `£${value.toLocaleString()}`,
                          'Revenue',
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#10B981"
                        strokeWidth={3}
                        dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Wedding Day Tab */}
        <TabsContent value="wedding-day" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Day Hourly Activity</CardTitle>
              <CardDescription>
                API usage patterns during a typical wedding day
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="apiCalls"
                      stackId="1"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      name="API Calls"
                    />
                    <Area
                      type="monotone"
                      dataKey="photoUploads"
                      stackId="1"
                      stroke="#E11D48"
                      fill="#E11D48"
                      name="Photo Uploads"
                    />
                    <Area
                      type="monotone"
                      dataKey="clientMessages"
                      stackId="1"
                      stroke="#10B981"
                      fill="#10B981"
                      name="Client Messages"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Morning Preparation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  8AM - 12PM
                </div>
                <p className="text-xs text-muted-foreground">
                  Vendor coordination and setup activities
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Ceremony Peak</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">
                  2PM - 6PM
                </div>
                <p className="text-xs text-muted-foreground">
                  Highest API activity during ceremonies
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Reception Wind-down</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  8PM - 12AM
                </div>
                <p className="text-xs text-muted-foreground">
                  Photo uploads and client communications
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
