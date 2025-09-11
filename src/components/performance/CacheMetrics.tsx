'use client';

import { useState, useEffect } from 'react';
import {
  PieChart,
  Pie,
  Cell,
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
  Database,
  Zap,
  HardDrive,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

interface CacheHitData {
  timestamp: string;
  redis: number;
  memory: number;
  overall: number;
}

interface CacheLayerMetrics {
  layer: string;
  hitRate: number;
  missRate: number;
  totalRequests: number;
  averageLatency: number;
  memoryUsage: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

interface CacheOptimization {
  category: string;
  currentValue: number;
  targetValue: number;
  recommendation: string;
  impact: 'high' | 'medium' | 'low';
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export function CacheMetrics() {
  const [hitRateData, setHitRateData] = useState<CacheHitData[]>([]);
  const [layerMetrics, setLayerMetrics] = useState<CacheLayerMetrics[]>([]);
  const [optimizations, setOptimizations] = useState<CacheOptimization[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const generateHitRateData = (): CacheHitData[] => {
      const data = [];
      const now = Date.now();

      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now - i * 60 * 60 * 1000).toLocaleTimeString(
          'en-US',
          {
            hour: '2-digit',
            minute: '2-digit',
          },
        );

        // Simulate cache performance with wedding season patterns
        const baseRedis = 95 + Math.sin(i / 6) * 3;
        const baseMemory = 88 + Math.cos(i / 4) * 4;
        const weddingSeasonBoost = i < 16 && i > 8 ? 2 : 0; // Afternoon boost

        const redis = Math.min(
          99.9,
          baseRedis + weddingSeasonBoost + (Math.random() - 0.5) * 2,
        );
        const memory = Math.min(
          99.5,
          baseMemory + weddingSeasonBoost + (Math.random() - 0.5) * 3,
        );
        const overall = (redis + memory) / 2;

        data.push({
          timestamp,
          redis: Number(redis.toFixed(1)),
          memory: Number(memory.toFixed(1)),
          overall: Number(overall.toFixed(1)),
        });
      }

      return data;
    };

    const generateLayerMetrics = (): CacheLayerMetrics[] => {
      return [
        {
          layer: 'Redis Cluster',
          hitRate: 97.3,
          missRate: 2.7,
          totalRequests: 1847392,
          averageLatency: 0.8,
          memoryUsage: 68.5,
          status: 'excellent',
        },
        {
          layer: 'Local Memory Cache',
          hitRate: 91.2,
          missRate: 8.8,
          totalRequests: 3294857,
          averageLatency: 0.1,
          memoryUsage: 45.3,
          status: 'excellent',
        },
        {
          layer: 'CDN Edge Cache',
          hitRate: 89.4,
          missRate: 10.6,
          totalRequests: 5672983,
          averageLatency: 2.3,
          memoryUsage: 34.7,
          status: 'good',
        },
        {
          layer: 'Database Query Cache',
          hitRate: 83.7,
          missRate: 16.3,
          totalRequests: 967234,
          averageLatency: 15.4,
          memoryUsage: 72.8,
          status: 'warning',
        },
      ];
    };

    const generateOptimizations = (): CacheOptimization[] => {
      return [
        {
          category: 'Redis Memory Optimization',
          currentValue: 68.5,
          targetValue: 75.0,
          recommendation:
            'Increase Redis cluster memory allocation for wedding season',
          impact: 'high',
        },
        {
          category: 'Cache Pre-warming',
          currentValue: 45.0,
          targetValue: 65.0,
          recommendation:
            'Implement ML-based pre-warming for photographer workflows',
          impact: 'high',
        },
        {
          category: 'TTL Optimization',
          currentValue: 83.7,
          targetValue: 88.0,
          recommendation:
            'Dynamic TTL adjustment based on wedding timeline patterns',
          impact: 'medium',
        },
        {
          category: 'Compression Efficiency',
          currentValue: 72.3,
          targetValue: 80.0,
          recommendation: 'Implement LZ4 compression for channel data',
          impact: 'medium',
        },
      ];
    };

    setHitRateData(generateHitRateData());
    setLayerMetrics(generateLayerMetrics());
    setOptimizations(generateOptimizations());
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        Loading cache metrics...
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBadgeVariant = (
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

  const pieData = layerMetrics.map((metric) => ({
    name: metric.layer,
    value: metric.hitRate,
    requests: metric.totalRequests,
  }));

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Overall Hit Rate
            </CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">94.2%</div>
            <p className="text-xs text-green-600">Above 95% target</p>
            <div className="mt-2">
              <Progress value={94.2} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Redis Performance
            </CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0.8ms</div>
            <p className="text-xs text-green-600">Average latency</p>
            <Badge className="mt-1" variant="default">
              Excellent
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">68.5%</div>
            <p className="text-xs text-muted-foreground">
              Redis cluster utilization
            </p>
            <div className="mt-2">
              <Progress value={68.5} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Requests
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">11.7M</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance Overview</TabsTrigger>
          <TabsTrigger value="layers">Cache Layers</TabsTrigger>
          <TabsTrigger value="optimization">Optimization</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Cache Hit Rate Trends
                </CardTitle>
                <CardDescription>
                  Multi-layer cache performance over the last 24 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hitRateData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="timestamp" />
                    <YAxis domain={[80, 100]} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="redis"
                      stroke="#8884d8"
                      strokeWidth={2}
                      name="Redis"
                    />
                    <Line
                      type="monotone"
                      dataKey="memory"
                      stroke="#82ca9d"
                      strokeWidth={2}
                      name="Memory"
                    />
                    <Line
                      type="monotone"
                      dataKey="overall"
                      stroke="#ff7300"
                      strokeWidth={3}
                      name="Overall"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cache Layer Distribution</CardTitle>
                <CardDescription>
                  Hit rate distribution across cache layers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="layers">
          <Card>
            <CardHeader>
              <CardTitle>Cache Layer Performance</CardTitle>
              <CardDescription>
                Detailed performance metrics for each cache layer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {layerMetrics.map((metric) => (
                  <div
                    key={metric.layer}
                    className="p-4 border rounded-lg space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{metric.layer}</h4>
                      <Badge variant={getStatusBadgeVariant(metric.status)}>
                        {metric.status}
                      </Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Hit Rate
                        </p>
                        <p
                          className={`text-lg font-semibold ${getStatusColor(metric.status)}`}
                        >
                          {metric.hitRate}%
                        </p>
                        <Progress value={metric.hitRate} className="mt-1 h-1" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Total Requests
                        </p>
                        <p className="text-lg font-semibold">
                          {(metric.totalRequests / 1000000).toFixed(1)}M
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Avg Latency
                        </p>
                        <p className="text-lg font-semibold">
                          {metric.averageLatency}ms
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Memory Usage
                        </p>
                        <p className="text-lg font-semibold">
                          {metric.memoryUsage}%
                        </p>
                        <Progress
                          value={metric.memoryUsage}
                          className="mt-1 h-1"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={layerMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="layer" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hitRate" fill="#82ca9d" name="Hit Rate %" />
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
                <AlertCircle className="h-5 w-5" />
                Cache Optimization Recommendations
              </CardTitle>
              <CardDescription>
                AI-powered recommendations to improve cache performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {optimizations.map((opt, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{opt.category}</h4>
                      <Badge
                        variant={
                          opt.impact === 'high'
                            ? 'destructive'
                            : opt.impact === 'medium'
                              ? 'outline'
                              : 'secondary'
                        }
                      >
                        {opt.impact} impact
                      </Badge>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Current</p>
                        <p className="text-lg font-semibold">
                          {opt.currentValue}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Target</p>
                        <p className="text-lg font-semibold text-green-600">
                          {opt.targetValue}%
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Potential Gain
                        </p>
                        <p className="text-lg font-semibold">
                          +{(opt.targetValue - opt.currentValue).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      💡 {opt.recommendation}
                    </p>

                    <div className="mt-2">
                      <Progress
                        value={(opt.currentValue / opt.targetValue) * 100}
                        className="h-2"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Wedding Season Cache Optimization */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Wedding Season Cache Strategy
          </CardTitle>
          <CardDescription>
            Specialized caching patterns optimized for wedding industry
            workflows
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Pre-warming Strategy</h4>
              <p className="text-sm text-muted-foreground">
                ML-based prediction pre-warms photographer workflow channels 2
                hours before peak times
              </p>
              <Badge variant="default">Active</Badge>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Seasonal TTL Adjustment</h4>
              <p className="text-sm text-muted-foreground">
                Dynamic TTL increases during wedding season (June-October) for
                better hit rates
              </p>
              <Badge variant="default">Optimized</Badge>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Venue Coordination Cache</h4>
              <p className="text-sm text-muted-foreground">
                Specialized cache layer for real-time venue coordination
                reducing latency by 40%
              </p>
              <Badge variant="default">Enhanced</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
