'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw,
  Search,
  Filter,
  AlertTriangle,
  Users,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { HealthScoreOverview } from './HealthScoreOverview';
import { RiskSegmentation } from './RiskSegmentation';
import { InterventionQueue } from './InterventionQueue';
import { MetricsCharts } from './MetricsCharts';
import { useCustomerSuccessData } from '@/hooks/useCustomerSuccessData';
import {
  DashboardMetrics,
  HealthScoreResponse,
  InterventionResponse,
} from '@/types/customer-success-api';

interface CustomerSuccessDashboardProps {
  initialData?: {
    metrics: DashboardMetrics;
    healthScores: HealthScoreResponse[];
    interventions: InterventionResponse[];
  };
}

export function CustomerSuccessDashboard({
  initialData,
}: CustomerSuccessDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const { metrics, healthScores, interventions, isLoading, error, refetch } =
    useCustomerSuccessData({
      searchQuery,
      refreshTrigger,
      initialData,
    });

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
    refetch();
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Error Loading Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Failed to load customer success data. Please try refreshing.
            </p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Customer Success Dashboard
          </h1>
          <p className="text-muted-foreground">
            Monitor client health, manage interventions, and prevent churn
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-[250px] pl-8"
            />
          </div>
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="icon"
            disabled={isLoading}
            className={isLoading ? 'animate-spin' : ''}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.overview.total_clients}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.overview.active_clients} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">At Risk</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.overview.clients_at_risk}
              </div>
              <p className="text-xs text-muted-foreground">
                Require intervention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Health Score
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(metrics.overview.avg_health_score)}
              </div>
              <p className="text-xs text-muted-foreground">Out of 100</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Interventions
              </CardTitle>
              <Clock className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.interventions.total_active}
              </div>
              <p className="text-xs text-muted-foreground">
                {metrics.interventions.overdue} overdue
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk-segments">
            Risk Segments
            {metrics?.overview.clients_at_risk > 0 && (
              <Badge variant="secondary" className="ml-2">
                {metrics.overview.clients_at_risk}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="interventions">
            Interventions
            {metrics?.interventions.total_active > 0 && (
              <Badge variant="secondary" className="ml-2">
                {metrics.interventions.total_active}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <HealthScoreOverview
            metrics={metrics}
            healthScores={healthScores}
            isLoading={isLoading}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="risk-segments" className="space-y-4">
          <RiskSegmentation
            searchQuery={searchQuery}
            onSearchChange={handleSearch}
            isLoading={isLoading}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>

        <TabsContent value="interventions" className="space-y-4">
          <InterventionQueue
            interventions={interventions}
            isLoading={isLoading}
            onRefresh={handleRefresh}
            searchQuery={searchQuery}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <MetricsCharts
            metrics={metrics}
            isLoading={isLoading}
            refreshTrigger={refreshTrigger}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
