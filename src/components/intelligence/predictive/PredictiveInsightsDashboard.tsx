// WS-055: Predictive Insights Dashboard
// Main dashboard component for client intelligence and booking predictions

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  AlertTriangle,
  Clock,
  DollarSign,
  Star,
  Activity,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';

import { BookingPredictor } from '@/lib/ml/prediction/booking-predictor';
import { ClientIntentScorer } from '@/lib/ml/prediction/intent-scorer';
import { RealTimeScoring } from '@/lib/ml/prediction/real-time-scoring';

import type {
  BookingPrediction,
  IntentScore,
  BehaviorPattern,
  ClientBehaviorData,
} from '@/lib/ml/prediction/types';

import { ClientIntentWidget } from './ClientIntentWidget';
import { BookingProbabilityChart } from './BookingProbabilityChart';
import { BehaviorPatternAnalytics } from './BehaviorPatternAnalytics';
import { RiskAssessmentPanel } from './RiskAssessmentPanel';
import { ActionRecommendations } from './ActionRecommendations';

interface DashboardMetrics {
  totalClients: number;
  highIntentClients: number;
  bookingProbabilityAvg: number;
  conversionRate: number;
  churnRiskClients: number;
  revenueOpportunity: number;
}

interface DashboardProps {
  clientId?: string;
  timeRange?: '24h' | '7d' | '30d' | '90d';
  autoRefresh?: boolean;
}

export function PredictiveInsightsDashboard({
  clientId,
  timeRange = '7d',
  autoRefresh = true,
}: DashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [predictions, setPredictions] = useState<BookingPrediction[]>([]);
  const [intentScores, setIntentScores] = useState<IntentScore[]>([]);
  const [behaviorPatterns, setBehaviorPatterns] = useState<BehaviorPattern[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);

  // Initialize ML services
  const [bookingPredictor] = useState(() => new BookingPredictor());
  const [intentScorer] = useState(() => new ClientIntentScorer());
  const [realTimeScoring] = useState(() => new RealTimeScoring());

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();

    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [timeRange, clientId, autoRefresh]);

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      // Load metrics and predictions based on scope
      if (clientId) {
        await loadSingleClientData(clientId);
      } else {
        await loadOverviewData();
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSingleClientData = async (id: string) => {
    const [prediction, intentScore] = await Promise.all([
      bookingPredictor.predictBookingProbability(id),
      intentScorer.calculateIntentScore(id),
    ]);

    setPredictions([prediction]);
    setIntentScores([intentScore]);

    // Single client metrics
    setMetrics({
      totalClients: 1,
      highIntentClients:
        intentScore.category === 'high' || intentScore.category === 'very_high'
          ? 1
          : 0,
      bookingProbabilityAvg: prediction.probability * 100,
      conversionRate: prediction.probability * 100,
      churnRiskClients: intentScore.category === 'low' ? 1 : 0,
      revenueOpportunity: prediction.probability * 15000, // Avg wedding spend
    });
  };

  const loadOverviewData = async () => {
    // For demo - would fetch from API
    const mockMetrics: DashboardMetrics = {
      totalClients: 156,
      highIntentClients: 42,
      bookingProbabilityAvg: 67.8,
      conversionRate: 34.2,
      churnRiskClients: 18,
      revenueOpportunity: 2100000,
    };

    setMetrics(mockMetrics);

    // Mock data - would come from actual client queries
    setPredictions([]);
    setIntentScores([]);
    setBehaviorPatterns([]);
  };

  const handleExportData = () => {
    // Export dashboard data to CSV
    const csvData = predictions.map((p) => ({
      client_id: p.client_id,
      booking_probability: p.probability,
      confidence: p.confidence,
      prediction_date: p.prediction_date.toISOString(),
    }));

    const csv =
      'data:text/csv;charset=utf-8,' +
      Object.keys(csvData[0] || {}).join(',') +
      '\n' +
      csvData.map((row) => Object.values(row).join(',')).join('\n');

    const link = document.createElement('a');
    link.href = encodeURI(csv);
    link.download = `predictive-insights-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading && !metrics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Loading predictive insights...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Predictive Intelligence</h1>
          <p className="text-muted-foreground">
            AI-powered client insights and booking predictions
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="text-xs">
            Updated {lastRefresh.toLocaleTimeString()}
          </Badge>
          <Button variant="outline" size="sm" onClick={loadDashboardData}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportData}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{metrics.totalClients}</p>
                  <p className="text-xs text-muted-foreground">Total Clients</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {metrics.highIntentClients}
                  </p>
                  <p className="text-xs text-muted-foreground">High Intent</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-purple-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {metrics.bookingProbabilityAvg.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Avg Booking Prob
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {metrics.conversionRate.toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Conversion Rate
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {metrics.churnRiskClients}
                  </p>
                  <p className="text-xs text-muted-foreground">Churn Risk</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-2xl font-bold">
                    ${(metrics.revenueOpportunity / 1000000).toFixed(1)}M
                  </p>
                  <p className="text-xs text-muted-foreground">Revenue Opp</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Content */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="intent">Intent Scoring</TabsTrigger>
          <TabsTrigger value="predictions">Booking Predictions</TabsTrigger>
          <TabsTrigger value="patterns">Behavior Patterns</TabsTrigger>
          <TabsTrigger value="actions">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Real-Time Client Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ClientIntentWidget
                  clientScores={intentScores}
                  timeRange={timeRange}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Booking Probability Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BookingProbabilityChart
                  predictions={predictions}
                  timeRange={timeRange}
                />
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Behavior Pattern Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <BehaviorPatternAnalytics
                    patterns={behaviorPatterns}
                    clientData={predictions.map((p) => ({
                      client_id: p.client_id,
                    }))}
                  />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Risk Assessment</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RiskAssessmentPanel
                  predictions={predictions}
                  riskThreshold={0.3}
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="intent" className="space-y-4">
          <ClientIntentWidget
            clientScores={intentScores}
            timeRange={timeRange}
            detailed={true}
          />
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <BookingProbabilityChart
            predictions={predictions}
            timeRange={timeRange}
            detailed={true}
          />
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <BehaviorPatternAnalytics
            patterns={behaviorPatterns}
            clientData={predictions.map((p) => ({ client_id: p.client_id }))}
            detailed={true}
          />
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <ActionRecommendations
            predictions={predictions}
            intentScores={intentScores}
            behaviorPatterns={behaviorPatterns}
          />
        </TabsContent>
      </Tabs>

      {/* Performance Alert */}
      {metrics && metrics.bookingProbabilityAvg < 50 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Performance Alert</AlertTitle>
          <AlertDescription>
            Average booking probability is below 50%. Consider reviewing client
            engagement strategies and focusing on high-intent prospects.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
