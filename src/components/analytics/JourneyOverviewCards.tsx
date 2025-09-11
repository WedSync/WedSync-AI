'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Target,
} from 'lucide-react';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { useSearchParams } from 'next/navigation';
import { OverviewCardsSkeleton } from './Skeletons';

export function JourneyOverviewCards() {
  const searchParams = useSearchParams();
  const timeframe = searchParams.get('timeframe') || '30d';
  const {
    data: analytics,
    isLoading,
    isRealTime,
  } = useAnalyticsData(timeframe);

  if (isLoading || !analytics) return <OverviewCardsSkeleton />;

  const cards = [
    {
      title: 'Total Journeys',
      value: analytics.overview.total_journeys,
      change: '+12%',
      trend: 'up' as const,
      icon: Activity,
      description: 'Active journey campaigns',
      testId: 'total-journeys',
    },
    {
      title: 'Active Instances',
      value: analytics.overview.total_instances.toLocaleString(),
      change: '+8%',
      trend: 'up' as const,
      icon: Users,
      description: 'Clients in journeys',
      testId: 'total-instances',
    },
    {
      title: 'Conversion Rate',
      value: `${(analytics.overview.avg_conversion_rate * 100).toFixed(1)}%`,
      change: '+2.4%',
      trend: 'up' as const,
      icon: Target,
      description: 'Average across all journeys',
      testId: 'conversion-rate',
    },
    {
      title: 'Revenue Attribution',
      value: `£${analytics.overview.total_revenue.toLocaleString()}`,
      change: '+18%',
      trend: 'up' as const,
      icon: DollarSign,
      description: 'Revenue from automation',
      testId: 'total-revenue',
    },
  ];

  return (
    <div
      data-testid="overview-cards"
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
    >
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card
            key={index}
            data-testid="overview-card"
            className="relative overflow-hidden transition-all hover:shadow-lg"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className="relative">
                <Icon className="h-4 w-4 text-muted-foreground" />
                {isRealTime && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid={card.testId}>
                {card.value}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground mt-1">
                <Badge
                  variant={card.trend === 'up' ? 'default' : 'destructive'}
                  className="text-xs px-1.5 py-0"
                >
                  {card.trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 mr-1" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-1" />
                  )}
                  {card.change}
                </Badge>
                <span className="truncate">{card.description}</span>
              </div>
            </CardContent>
            {/* Decorative gradient */}
            <div
              className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${
                card.trend === 'up'
                  ? 'from-green-500 to-emerald-500'
                  : 'from-red-500 to-orange-500'
              }`}
            />
          </Card>
        );
      })}
    </div>
  );
}
