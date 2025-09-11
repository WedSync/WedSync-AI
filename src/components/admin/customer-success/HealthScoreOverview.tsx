'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  DashboardMetrics,
  HealthScoreResponse,
} from '@/types/customer-success-api';
import { cn } from '@/lib/utils';

interface HealthScoreOverviewProps {
  metrics?: DashboardMetrics;
  healthScores?: HealthScoreResponse[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function HealthScoreOverview({
  metrics,
  healthScores,
  isLoading,
  onRefresh,
}: HealthScoreOverviewProps) {
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'high':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="h-4 w-4" />;
      case 'medium':
        return <Clock className="h-4 w-4" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4" />;
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-[100px]" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[60px] mb-2" />
                <Skeleton className="h-3 w-[80px]" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Risk Distribution */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-800">
                Low Risk
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700">
                {metrics.risk_distribution.low}
              </div>
              <p className="text-xs text-green-600">Healthy clients</p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">
                Medium Risk
              </CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-700">
                {metrics.risk_distribution.medium}
              </div>
              <p className="text-xs text-yellow-600">Monitor closely</p>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-orange-800">
                High Risk
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-700">
                {metrics.risk_distribution.high}
              </div>
              <p className="text-xs text-orange-600">Need intervention</p>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-red-800">
                Critical Risk
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-700">
                {metrics.risk_distribution.critical}
              </div>
              <p className="text-xs text-red-600">Immediate action</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Health Scores */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Health Scores</CardTitle>
              <CardDescription>
                Latest client health assessments
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {healthScores?.slice(0, 5).map((score) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {getRiskIcon(score.risk_level)}
                      <div>
                        <p className="font-medium text-sm">
                          {score.client_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Updated{' '}
                          {new Date(score.last_updated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getTrendIcon(score.trend_direction)}
                    <div className="text-right">
                      <p className="font-semibold text-sm">
                        {score.current_score}/100
                      </p>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          getRiskColor(score.risk_level),
                        )}
                      >
                        {score.risk_level}
                      </Badge>
                    </div>
                  </div>
                </div>
              )) || (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No health scores available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Health Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Health Score Distribution</CardTitle>
            <CardDescription>Overall client health breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Excellent (90-100)</span>
                  <span className="font-medium">
                    {healthScores?.filter((s) => s.current_score >= 90)
                      .length || 0}{' '}
                    clients
                  </span>
                </div>
                <Progress
                  value={
                    ((healthScores?.filter((s) => s.current_score >= 90)
                      .length || 0) /
                      (healthScores?.length || 1)) *
                    100
                  }
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Good (70-89)</span>
                  <span className="font-medium">
                    {healthScores?.filter(
                      (s) => s.current_score >= 70 && s.current_score < 90,
                    ).length || 0}{' '}
                    clients
                  </span>
                </div>
                <Progress
                  value={
                    ((healthScores?.filter(
                      (s) => s.current_score >= 70 && s.current_score < 90,
                    ).length || 0) /
                      (healthScores?.length || 1)) *
                    100
                  }
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Fair (50-69)</span>
                  <span className="font-medium">
                    {healthScores?.filter(
                      (s) => s.current_score >= 50 && s.current_score < 70,
                    ).length || 0}{' '}
                    clients
                  </span>
                </div>
                <Progress
                  value={
                    ((healthScores?.filter(
                      (s) => s.current_score >= 50 && s.current_score < 70,
                    ).length || 0) /
                      (healthScores?.length || 1)) *
                    100
                  }
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Poor (0-49)</span>
                  <span className="font-medium text-red-600">
                    {healthScores?.filter((s) => s.current_score < 50).length ||
                      0}{' '}
                    clients
                  </span>
                </div>
                <Progress
                  value={
                    ((healthScores?.filter((s) => s.current_score < 50)
                      .length || 0) /
                      (healthScores?.length || 1)) *
                    100
                  }
                  className="h-2 bg-red-100 [&>div]:bg-red-500"
                />
              </div>
            </div>

            {metrics && (
              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Average Score</span>
                  <span className="font-semibold text-lg">
                    {Math.round(metrics.overview.avg_health_score)}/100
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
