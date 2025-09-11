'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Search,
  Filter,
  Calendar,
  MessageSquare,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { RiskSegmentClient } from '@/types/customer-success-api';
import { cn } from '@/lib/utils';
import { useRiskSegmentData } from '@/hooks/useRiskSegmentData';

interface RiskSegmentationProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  isLoading?: boolean;
  refreshTrigger: number;
}

export function RiskSegmentation({
  searchQuery,
  onSearchChange,
  isLoading: parentLoading,
  refreshTrigger,
}: RiskSegmentationProps) {
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { clients, summary, isLoading, error, pagination, refetch } =
    useRiskSegmentData({
      riskLevel:
        selectedRiskLevel === 'all' ? undefined : (selectedRiskLevel as any),
      searchQuery,
      sortBy: sortBy as any,
      sortOrder,
      refreshTrigger,
    });

  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return 'text-green-700 bg-green-100 border-green-300';
      case 'medium':
        return 'text-yellow-700 bg-yellow-100 border-yellow-300';
      case 'high':
        return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'critical':
        return 'text-red-700 bg-red-100 border-red-300';
      default:
        return 'text-gray-700 bg-gray-100 border-gray-300';
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
        return <Users className="h-4 w-4" />;
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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const isUpcomingWedding = (weddingDate: string | null) => {
    if (!weddingDate) return false;
    const wedding = new Date(weddingDate);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return wedding <= thirtyDaysFromNow && wedding >= new Date();
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-red-500 mb-2" />
            <p className="text-red-600 font-medium">
              Error loading risk segments
            </p>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && !isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clients
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.total_clients}</div>
              <p className="text-xs text-muted-foreground">
                Avg Score: {Math.round(summary.avg_score)}
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
                {summary.risk_distribution.high +
                  summary.risk_distribution.critical}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.risk_distribution.critical} critical
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improving</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {summary.trend_distribution.improving}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.trend_distribution.declining} declining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Upcoming Weddings
              </CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {summary.upcoming_weddings}
              </div>
              <p className="text-xs text-muted-foreground">Next 30 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <CardTitle>Risk Segments</CardTitle>
              <CardDescription>
                Clients grouped by risk level and health metrics
              </CardDescription>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-[200px] pl-8"
                />
              </div>

              <Select
                value={selectedRiskLevel}
                onValueChange={setSelectedRiskLevel}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risk Levels</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Health Score</SelectItem>
                  <SelectItem value="last_updated">Last Updated</SelectItem>
                  <SelectItem value="client_name">Client Name</SelectItem>
                  <SelectItem value="wedding_date">Wedding Date</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
                }
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading || parentLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[200px]" />
                      <Skeleton className="h-3 w-[150px]" />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </div>
              ))}
            </div>
          ) : clients?.length > 0 ? (
            <div className="space-y-4">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={cn(
                        'p-2 rounded-full',
                        getRiskColor(client.risk_level),
                      )}
                    >
                      {getRiskIcon(client.risk_level)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">{client.client_name}</p>
                        {isUpcomingWedding(client.wedding_date) && (
                          <Badge
                            variant="outline"
                            className="text-blue-600 border-blue-300"
                          >
                            <Calendar className="h-3 w-3 mr-1" />
                            Soon
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>Wedding: {formatDate(client.wedding_date)}</span>
                        <span>•</span>
                        <span>
                          {client.recent_interactions} interactions (30d)
                        </span>
                        {client.active_interventions > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-orange-600">
                              {client.active_interventions} active intervention
                              {client.active_interventions !== 1 ? 's' : ''}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {getTrendIcon(client.trend_direction)}

                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-lg">
                          {client.current_score}
                        </span>
                        <span className="text-muted-foreground">/100</span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          getRiskColor(client.risk_level),
                        )}
                      >
                        {client.risk_level} risk
                      </Badge>
                    </div>

                    <div className="flex items-center space-x-1">
                      <Button variant="ghost" size="icon">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">
                No clients found matching your criteria
              </p>
              {(searchQuery || selectedRiskLevel !== 'all') && (
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => {
                    onSearchChange('');
                    setSelectedRiskLevel('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
                of {pagination.total} clients
              </p>

              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.has_prev}
                  onClick={() => refetch({ page: pagination.page - 1 })}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.has_next}
                  onClick={() => refetch({ page: pagination.page + 1 })}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
