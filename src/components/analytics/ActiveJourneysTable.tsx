'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useSearchParams } from 'next/navigation';
import { TableSkeleton } from './Skeletons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChevronRight,
  Users,
  Clock,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export function ActiveJourneysTable() {
  const searchParams = useSearchParams();
  const timeframe = searchParams.get('timeframe') || '30d';
  const {
    data: analytics,
    isLoading,
    isRealTime,
  } = useAnalyticsData(timeframe);

  if (isLoading || !analytics) return <TableSkeleton />;

  const getEngagementColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getEngagementBadgeVariant = (
    level: string,
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (level) {
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  return (
    <Card className="transition-all hover:shadow-lg">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle>Active Journeys</CardTitle>
            {isRealTime && (
              <Badge variant="outline" className="animate-pulse">
                <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                Live
              </Badge>
            )}
          </div>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {analytics.active_journeys.length} Active
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Real-time tracking of client journey progress
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Journey</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Started</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analytics.active_journeys.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-8 text-muted-foreground"
                  >
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    No active journeys at the moment
                  </TableCell>
                </TableRow>
              ) : (
                analytics.active_journeys.map((journey) => (
                  <TableRow
                    key={journey.id}
                    className="group hover:bg-muted/50 transition-colors"
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">
                          {journey.journey_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium truncate max-w-[150px]">
                          {journey.client_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {journey.client_email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 min-w-[120px]">
                        <Progress value={journey.completion} className="h-2" />
                        <span className="text-xs text-muted-foreground">
                          {journey.completion.toFixed(0)}% complete
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={getEngagementBadgeVariant(journey.engagement)}
                        className="capitalize"
                      >
                        <span
                          className={`h-2 w-2 rounded-full mr-1.5 ${getEngagementColor(journey.engagement)}`}
                        />
                        {journey.engagement}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(journey.started_at)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/analytics/journeys/${journey.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors"
                      >
                        View
                        <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
