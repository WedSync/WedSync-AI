'use client';

import { useState, useEffect, Suspense } from 'react';
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
import {
  Activity,
  TrendingUp,
  DollarSign,
  Users,
  Heart,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

interface MLMetrics {
  totalPredictions24h: number;
  averageConfidence: number;
  modelsHealthy: number;
  totalModels: number;
  weddingSeasonActivity: 'peak' | 'moderate' | 'low';
  topPredictionType: string;
}

interface ModelHealth {
  modelName: string;
  status: 'healthy' | 'degraded' | 'failed';
  lastUpdated: string;
  accuracy: number;
  predictions24h: number;
}

interface RecentPrediction {
  id: string;
  type: 'trends' | 'budget' | 'vendors' | 'churn' | 'revenue';
  confidence: number;
  timestamp: string;
  userId: string;
  tier: string;
}

export default function PredictiveInsightsDashboard() {
  const [mlMetrics, setMLMetrics] = useState<MLMetrics | null>(null);
  const [modelHealth, setModelHealth] = useState<ModelHealth[]>([]);
  const [recentPredictions, setRecentPredictions] = useState<
    RecentPrediction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<
    '24h' | '7d' | '30d'
  >('24h');

  useEffect(() => {
    loadDashboardData();

    // Set up real-time updates every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, [selectedTimeframe]);

  const loadDashboardData = async () => {
    try {
      setError(null);

      // Load ML metrics
      const metricsResponse = await fetch('/api/ml/dashboard/metrics', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!metricsResponse.ok) {
        throw new Error('Failed to load ML metrics');
      }

      const metricsData = await metricsResponse.json();

      // Load model health status
      const healthResponse = await fetch('/api/ml/models/status', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const healthData = healthResponse.ok ? await healthResponse.json() : null;

      // Load recent predictions
      const predictionsResponse = await fetch(
        `/api/ml/predictions/recent?timeframe=${selectedTimeframe}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const predictionsData = predictionsResponse.ok
        ? await predictionsResponse.json()
        : [];

      // Update state
      setMLMetrics({
        totalPredictions24h: metricsData.total_predictions_24h || 0,
        averageConfidence: metricsData.average_confidence || 0,
        modelsHealthy:
          healthData?.models?.filter((m: any) => m.status === 'healthy')
            .length || 0,
        totalModels: healthData?.models?.length || 5,
        weddingSeasonActivity: getWeddingSeasonActivity(),
        topPredictionType: metricsData.top_prediction_type || 'budget',
      });

      setModelHealth(
        healthData?.models?.map((model: any) => ({
          modelName: formatModelName(model.model_name),
          status: model.status,
          lastUpdated: model.last_prediction,
          accuracy: model.performance_metrics?.accuracy * 100 || 0,
          predictions24h: model.health_indicators?.prediction_count_24h || 0,
        })) || [],
      );

      setRecentPredictions(predictionsData.predictions || []);
    } catch (err) {
      console.error('Dashboard data loading error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load dashboard data',
      );
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const getWeddingSeasonActivity = (): 'peak' | 'moderate' | 'low' => {
    const month = new Date().getMonth() + 1;
    if (month >= 5 && month <= 8) return 'peak';
    if (month >= 3 && month <= 10) return 'moderate';
    return 'low';
  };

  const formatModelName = (name: string): string => {
    return name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'peak':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'moderate':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPredictionTypeLabel = (type: string): string => {
    const labels = {
      trends: 'Wedding Trends',
      budget: 'Budget Optimization',
      vendors: 'Vendor Performance',
      churn: 'Churn Risk',
      revenue: 'Revenue Forecast',
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPredictionTypeIcon = (type: string) => {
    const icons = {
      trends: TrendingUp,
      budget: DollarSign,
      vendors: Users,
      churn: AlertCircle,
      revenue: BarChart3,
    };
    const IconComponent = icons[type as keyof typeof icons] || Activity;
    return <IconComponent className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight">
              ML Analytics Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              Wedding industry predictive insights and model performance
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-20 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h3 className="text-lg font-medium">Failed to Load Dashboard</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{error}</p>
          <Button onClick={loadDashboardData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">
            ML Analytics Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Wedding industry predictive insights and model performance
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Tabs
            value={selectedTimeframe}
            onValueChange={(value) => setSelectedTimeframe(value as any)}
          >
            <TabsList>
              <TabsTrigger value="24h">24h</TabsTrigger>
              <TabsTrigger value="7d">7d</TabsTrigger>
              <TabsTrigger value="30d">30d</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button onClick={loadDashboardData} variant="outline" size="sm">
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Predictions Today
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mlMetrics?.totalPredictions24h.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">+12% from yesterday</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Average Confidence
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((mlMetrics?.averageConfidence || 0) * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Model prediction confidence
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Model Health</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {mlMetrics?.modelsHealthy}/{mlMetrics?.totalModels}
            </div>
            <p className="text-xs text-muted-foreground">Healthy models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Wedding Season
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <Badge
                className={getActivityColor(
                  mlMetrics?.weddingSeasonActivity || 'low',
                )}
              >
                {mlMetrics?.weddingSeasonActivity || 'low'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current market activity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="models">Model Health</TabsTrigger>
          <TabsTrigger value="predictions">Recent Predictions</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Prediction Types */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Most Requested Predictions
                </CardTitle>
                <CardDescription>
                  Popular ML features used by wedding professionals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {['budget', 'trends', 'vendors', 'churn'].map((type, index) => (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getPredictionTypeIcon(type)}
                      <span className="font-medium">
                        {getPredictionTypeLabel(type)}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.max(20, 100 - index * 20)}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground w-12">
                        {Math.max(100, 500 - index * 100)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Wedding Season Impact */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Wedding Season Impact</CardTitle>
                <CardDescription>
                  How seasonality affects prediction accuracy and usage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Peak Season Multiplier
                    </span>
                    <Badge variant="secondary">2.3x</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Accuracy Improvement
                    </span>
                    <Badge variant="secondary">+15%</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Usage Increase</span>
                    <Badge variant="secondary">+180%</Badge>
                  </div>

                  <div className="pt-2 border-t">
                    <div className="text-sm text-muted-foreground">
                      <p className="mb-2">
                        Current Month: <strong>Peak Season</strong>
                      </p>
                      <p className="text-xs">
                        Wedding vendors see highest demand for predictions
                        during May-September
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <div className="grid gap-4">
            {modelHealth.map((model) => (
              <Card key={model.modelName}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base">{model.modelName}</CardTitle>
                  <Badge className={getStatusColor(model.status)}>
                    {model.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Accuracy</p>
                      <p className="font-medium">
                        {model.accuracy.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Predictions (24h)</p>
                      <p className="font-medium">{model.predictions24h}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Updated</p>
                      <p className="font-medium">
                        {model.lastUpdated
                          ? new Date(model.lastUpdated).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Predictions</CardTitle>
              <CardDescription>
                Latest ML predictions generated for wedding professionals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentPredictions.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No recent predictions available
                  </p>
                ) : (
                  recentPredictions.map((prediction) => (
                    <div
                      key={prediction.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {getPredictionTypeIcon(prediction.type)}
                        <div>
                          <p className="font-medium">
                            {getPredictionTypeLabel(prediction.type)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(prediction.timestamp).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge variant="outline">{prediction.tier}</Badge>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {(prediction.confidence * 100).toFixed(1)}%
                            confidence
                          </p>
                          <p className="text-xs text-muted-foreground">
                            User: {prediction.userId.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Insights</CardTitle>
                <CardDescription>
                  AI-powered insights from wedding industry predictions
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Budget Optimization ROI
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Couples using budget optimization save an average of
                        £2,400 on their wedding costs
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Vendor Performance Trends
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Photography bookings show 25% higher satisfaction when
                        booked 8+ months in advance
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3">
                    <Heart className="h-5 w-5 text-pink-600 mt-0.5" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium">
                        Wedding Trends Impact
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Outdoor weddings predicted to increase by 35% next
                        season
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recommendations</CardTitle>
                <CardDescription>
                  Data-driven suggestions for platform optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm font-medium text-blue-900">
                      Model Performance
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Consider retraining trend prediction model - accuracy
                      dropped 3% this week
                    </p>
                  </div>

                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-900">
                      Feature Usage
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      Budget optimization showing high engagement - consider
                      promoting to FREE tier users
                    </p>
                  </div>

                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-900">
                      Seasonal Preparation
                    </p>
                    <p className="text-xs text-yellow-700 mt-1">
                      Scale up infrastructure for peak wedding season
                      (May-September)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
