'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Zap,
  Target,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface ChannelPerformanceProps {
  viewMode?: 'summary' | 'detailed';
}

interface ChannelSwitchMetrics {
  timestamp: string;
  averageTime: number;
  p95Time: number;
  p99Time: number;
  successRate: number;
}

interface SupplierTypePerformance {
  type: string;
  averageTime: number;
  p95Time: number;
  totalSwitches: number;
  successRate: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface ChannelOptimizationInsight {
  category: string;
  currentPerformance: number;
  target: number;
  improvement: string;
  impact: 'high' | 'medium' | 'low';
}

export function ChannelPerformance({
  viewMode = 'summary',
}: ChannelPerformanceProps) {
  const [switchingMetrics, setSwitchingMetrics] = useState<
    ChannelSwitchMetrics[]
  >([]);
  const [supplierPerformance, setSupplierPerformance] = useState<
    SupplierTypePerformance[]
  >([]);
  const [optimizationInsights, setOptimizationInsights] = useState<
    ChannelOptimizationInsight[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock data generation - in production this would come from performance tracker
    const generateSwitchingMetrics = (): ChannelSwitchMetrics[] => {
      const data = [];
      const now = Date.now();

      for (let i = 47; i >= 0; i--) {
        const timestamp = new Date(now - i * 30 * 60 * 1000).toLocaleTimeString(
          'en-US',
          {
            hour: '2-digit',
            minute: '2-digit',
          },
        );

        // Simulate channel switching performance with wedding day patterns
        const baseTime = 85 + Math.sin(i / 8) * 20;
        const weddingDaySpike = i < 16 && i > 8 ? 1.3 : 1.0; // Afternoon wedding prep spike

        data.push({
          timestamp,
          averageTime: Math.round(
            baseTime * weddingDaySpike + (Math.random() - 0.5) * 8,
          ),
          p95Time: Math.round(
            baseTime * weddingDaySpike * 1.4 + (Math.random() - 0.5) * 12,
          ),
          p99Time: Math.round(
            baseTime * weddingDaySpike * 1.8 + (Math.random() - 0.5) * 15,
          ),
          successRate: Math.max(0.985, 0.998 - Math.random() * 0.01),
        });
      }

      return data;
    };

    const generateSupplierPerformance = (): SupplierTypePerformance[] => {
      return [
        {
          type: 'Photographers',
          averageTime: 89,
          p95Time: 124,
          totalSwitches: 15672,
          successRate: 0.9987,
          status: 'excellent',
        },
        {
          type: 'Venues',
          averageTime: 105,
          p95Time: 145,
          totalSwitches: 8934,
          successRate: 0.9982,
          status: 'excellent',
        },
        {
          type: 'Florists',
          averageTime: 92,
          p95Time: 128,
          totalSwitches: 4567,
          successRate: 0.9985,
          status: 'excellent',
        },
        {
          type: 'Caterers',
          averageTime: 118,
          p95Time: 167,
          totalSwitches: 6789,
          successRate: 0.9976,
          status: 'good',
        },
        {
          type: 'Musicians',
          averageTime: 134,
          p95Time: 189,
          totalSwitches: 2345,
          successRate: 0.9968,
          status: 'good',
        },
        {
          type: 'Transportation',
          averageTime: 156,
          p95Time: 234,
          totalSwitches: 1234,
          successRate: 0.9951,
          status: 'warning',
        },
      ];
    };

    const generateOptimizationInsights = (): ChannelOptimizationInsight[] => {
      return [
        {
          category: 'Connection Pool Efficiency',
          currentPerformance: 127,
          target: 100,
          improvement: 'Optimize connection reuse patterns',
          impact: 'high',
        },
        {
          category: 'Cache Hit Ratio',
          currentPerformance: 97.3,
          target: 98.0,
          improvement: 'Pre-warm wedding day channels',
          impact: 'medium',
        },
        {
          category: 'Memory Usage',
          currentPerformance: 78,
          target: 65,
          improvement: 'Implement connection cleanup',
          impact: 'medium',
        },
        {
          category: 'Peak Load Handling',
          currentPerformance: 85,
          target: 95,
          improvement: 'Auto-scaling threshold tuning',
          impact: 'high',
        },
      ];
    };

    setSwitchingMetrics(generateSwitchingMetrics());
    setSupplierPerformance(generateSupplierPerformance());
    setOptimizationInsights(generateOptimizationInsights());
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        Loading channel performance...
      </div>
    );
  }

  const formatTime = (value: number) => `${value}ms`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'bg-green-500';
      case 'good':
        return 'bg-blue-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusVariant = (
    status: string,
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'excellent':
        return 'default';
      case 'good':
        return 'secondary';
      case 'warning':
        return 'outline';
      case 'critical':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  if (viewMode === 'summary') {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Average Switch Time</span>
              <span className="text-sm font-medium">127ms</span>
            </div>
            <Progress value={63.5} className="h-2" />
            <p className="text-xs text-green-600">
              36% faster than 200ms target
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Success Rate</span>
              <span className="text-sm font-medium">99.87%</span>
            </div>
            <Progress value={99.87} className="h-2" />
            <p className="text-xs text-green-600">Above 99.5% target</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={150}>
          <LineChart data={switchingMetrics.slice(-12)}>
            <Line
              type="monotone"
              dataKey="averageTime"
              stroke="#8884d8"
              strokeWidth={2}
              dot={false}
            />
            <XAxis dataKey="timestamp" hide />
            <YAxis hide />
            <Tooltip formatter={formatTime} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Switch Time
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">127ms</div>
            <p className="text-xs text-green-600">↓ 15ms from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">P95 Latency</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">156ms</div>
            <p className="text-xs text-green-600">22% below 200ms target</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">99.87%</div>
            <p className="text-xs text-green-600">Above 99.5% SLA</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Switches
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">39.2K</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="suppliers">By Supplier Type</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Channel Switching Trends (Last 24 Hours)
              </CardTitle>
              <CardDescription>
                Real-time channel switching performance with P95 and P99
                percentiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={switchingMetrics}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip formatter={formatTime} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="averageTime"
                    stroke="#82ca9d"
                    strokeWidth={2}
                    name="Average Time"
                  />
                  <Line
                    type="monotone"
                    dataKey="p95Time"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="95th Percentile"
                  />
                  <Line
                    type="monotone"
                    dataKey="p99Time"
                    stroke="#ff7300"
                    strokeWidth={2}
                    name="99th Percentile"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Supplier Type</CardTitle>
              <CardDescription>
                Channel switching performance breakdown by wedding supplier
                category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {supplierPerformance.map((supplier) => (
                  <div
                    key={supplier.type}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div
                        className={`w-3 h-3 rounded-full ${getStatusColor(supplier.status)}`}
                      />
                      <div>
                        <h4 className="font-medium">{supplier.type}</h4>
                        <p className="text-sm text-muted-foreground">
                          {supplier.totalSwitches.toLocaleString()} switches
                        </p>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">
                          Avg: {formatTime(supplier.averageTime)}
                        </span>
                        <Badge variant={getStatusVariant(supplier.status)}>
                          {supplier.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>P95: {formatTime(supplier.p95Time)}</span>
                        <span>
                          Success: {formatPercentage(supplier.successRate)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={supplierPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="type" />
                    <YAxis />
                    <Tooltip formatter={formatTime} />
                    <Legend />
                    <Bar
                      dataKey="averageTime"
                      fill="#82ca9d"
                      name="Average Time"
                    />
                    <Bar
                      dataKey="p95Time"
                      fill="#8884d8"
                      name="95th Percentile"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimization">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Performance Optimization Opportunities
              </CardTitle>
              <CardDescription>
                AI-powered recommendations to improve channel switching
                performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizationInsights.map((insight, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{insight.category}</h4>
                      <Badge
                        variant={
                          insight.impact === 'high'
                            ? 'destructive'
                            : insight.impact === 'medium'
                              ? 'outline'
                              : 'secondary'
                        }
                      >
                        {insight.impact} impact
                      </Badge>
                    </div>

                    <div className="grid gap-2 md:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Current</p>
                        <p className="font-medium">
                          {typeof insight.currentPerformance === 'number' &&
                          insight.currentPerformance > 10
                            ? `${insight.currentPerformance}ms`
                            : `${insight.currentPerformance}%`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Target</p>
                        <p className="font-medium text-green-600">
                          {typeof insight.target === 'number' &&
                          insight.target > 10
                            ? `${insight.target}ms`
                            : `${insight.target}%`}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Potential Gain
                        </p>
                        <p className="font-medium">
                          {typeof insight.currentPerformance === 'number' &&
                          insight.currentPerformance > 10
                            ? `${Math.abs(insight.currentPerformance - insight.target)}ms`
                            : `${Math.abs(insight.currentPerformance - insight.target)}%`}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      💡 {insight.improvement}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Wedding Day Performance Guarantee */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Wedding Day Performance Status
          </CardTitle>
          <CardDescription>
            Critical performance metrics for wedding day operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm font-medium">Sub-200ms Switching</p>
              <p className="text-xs text-muted-foreground">127ms average</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm font-medium">99.9% Uptime SLA</p>
              <p className="text-xs text-muted-foreground">99.97% actual</p>
            </div>
            <div className="text-center space-y-2">
              <div className="text-2xl font-bold text-green-600">✓</div>
              <p className="text-sm font-medium">Wedding Season Ready</p>
              <p className="text-xs text-muted-foreground">
                10x capacity available
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
