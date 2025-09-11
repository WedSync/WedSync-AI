'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import {
  Calendar,
  TrendingUp,
  Sun,
  Snowflake,
  Flower2,
  Leaf,
  Settings,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeasonalAdjustment {
  season: 'spring' | 'summer' | 'fall' | 'winter';
  multiplier: number;
  active: boolean;
  thresholds: {
    excellent: number;
    good: number;
    warning: number;
    critical: number;
  };
  description: string;
}

interface WeddingSeasonData {
  currentSeason: 'spring' | 'summer' | 'fall' | 'winter';
  isPeakSeason: boolean;
  peakMonths: string[];
  adjustmentActive: boolean;
  currentMultiplier: number;
  affectedSuppliers: number;
  expectedImpact: string;
  seasonalTrends: Array<{
    month: string;
    bookings: number;
    avgHealthScore: number;
    season: string;
  }>;
}

/**
 * Wedding Season Adjustments Component
 *
 * Manages seasonal adjustments to health scoring:
 * - Peak wedding season multipliers
 * - Adjusted thresholds for high-demand periods
 * - Seasonal trend analysis
 * - Dynamic scoring algorithms
 */
export default function WeddingSeasonAdjustments() {
  const [seasonData, setSeasonData] = useState<WeddingSeasonData | null>(null);
  const [adjustments, setAdjustments] = useState<SeasonalAdjustment[]>([]);
  const [loading, setLoading] = useState(true);

  // Load seasonal data and adjustments
  useEffect(() => {
    const loadSeasonalData = async () => {
      try {
        // Mock data - in real implementation, this would come from the API
        const mockSeasonData: WeddingSeasonData = {
          currentSeason: getCurrentSeason(),
          isPeakSeason: isPeakWeddingSeason(),
          peakMonths: ['May', 'June', 'July', 'August', 'September', 'October'],
          adjustmentActive: isPeakWeddingSeason(),
          currentMultiplier: isPeakWeddingSeason() ? 1.15 : 1.0,
          affectedSuppliers: 142,
          expectedImpact: '+12% stricter health scoring during peak season',
          seasonalTrends: generateSeasonalTrends(),
        };

        const mockAdjustments: SeasonalAdjustment[] = [
          {
            season: 'spring',
            multiplier: 1.1,
            active: mockSeasonData.currentSeason === 'spring',
            thresholds: { excellent: 92, good: 78, warning: 65, critical: 55 },
            description: 'Early wedding season - increased expectations',
          },
          {
            season: 'summer',
            multiplier: 1.15,
            active: mockSeasonData.currentSeason === 'summer',
            thresholds: { excellent: 95, good: 82, warning: 70, critical: 60 },
            description: 'Peak wedding season - highest standards applied',
          },
          {
            season: 'fall',
            multiplier: 1.12,
            active: mockSeasonData.currentSeason === 'fall',
            thresholds: { excellent: 93, good: 80, warning: 68, critical: 58 },
            description: 'Popular fall weddings - elevated expectations',
          },
          {
            season: 'winter',
            multiplier: 1.0,
            active: mockSeasonData.currentSeason === 'winter',
            thresholds: { excellent: 90, good: 75, warning: 60, critical: 50 },
            description: 'Off-season - standard scoring applied',
          },
        ];

        setSeasonData(mockSeasonData);
        setAdjustments(mockAdjustments);
      } catch (error) {
        console.error('Error loading seasonal data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSeasonalData();
  }, []);

  const toggleAdjustment = async (season: string, enabled: boolean) => {
    try {
      // In real implementation, this would call the API
      setAdjustments((prev) =>
        prev.map((adj) =>
          adj.season === season ? { ...adj, active: enabled } : adj,
        ),
      );

      if (seasonData) {
        setSeasonData((prev) =>
          prev
            ? {
                ...prev,
                adjustmentActive: enabled && prev.currentSeason === season,
              }
            : null,
        );
      }
    } catch (error) {
      console.error('Error toggling seasonal adjustment:', error);
    }
  };

  if (loading) {
    return <WeddingSeasonAdjustmentsSkeleton />;
  }

  if (!seasonData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">Unable to load seasonal data</p>
        </CardContent>
      </Card>
    );
  }

  const currentAdjustment = adjustments.find(
    (adj) => adj.season === seasonData.currentSeason,
  );
  const SeasonIcon = getSeasonIcon(seasonData.currentSeason);

  return (
    <div className="space-y-4">
      {/* Current Season Status */}
      <Card
        className={cn(
          'border-l-4',
          seasonData.isPeakSeason &&
            'border-l-orange-500 bg-orange-50 dark:bg-orange-950/20',
        )}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <SeasonIcon className="h-5 w-5" />
            Wedding Season Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-medium capitalize">
                    {seasonData.currentSeason} Season
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {currentAdjustment?.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    seasonData.isPeakSeason ? 'destructive' : 'secondary'
                  }
                >
                  {seasonData.isPeakSeason ? 'Peak Season' : 'Off Season'}
                </Badge>

                {seasonData.adjustmentActive && (
                  <Badge variant="outline">
                    {seasonData.currentMultiplier}× Multiplier
                  </Badge>
                )}
              </div>
            </div>

            {seasonData.isPeakSeason && (
              <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-orange-800 dark:text-orange-200">
                      Peak Wedding Season Active
                    </p>
                    <p className="text-orange-700 dark:text-orange-300">
                      {seasonData.expectedImpact} affecting{' '}
                      {seasonData.affectedSuppliers} suppliers
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Peak Months Display */}
            <div>
              <div className="text-sm font-medium mb-2">
                Peak Wedding Months:
              </div>
              <div className="flex flex-wrap gap-2">
                {seasonData.peakMonths.map((month) => (
                  <Badge
                    key={month}
                    variant={isCurrentMonth(month) ? 'default' : 'outline'}
                    className="text-xs"
                  >
                    {month}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Adjustments Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Seasonal Adjustments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {adjustments.map((adjustment) => (
              <div key={adjustment.season} className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getSeasonIcon(adjustment.season, 'h-4 w-4')}
                    <div>
                      <div className="font-medium capitalize">
                        {adjustment.season} Season
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {adjustment.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      {adjustment.multiplier}× multiplier
                    </Badge>
                    <Switch
                      checked={adjustment.active}
                      onCheckedChange={(checked) =>
                        toggleAdjustment(adjustment.season, checked)
                      }
                    />
                  </div>
                </div>

                {/* Threshold Display */}
                <div className="ml-7 space-y-2">
                  <div className="text-sm font-medium">
                    Health Score Thresholds:
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded" />
                      <span>Excellent: {adjustment.thresholds.excellent}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded" />
                      <span>Good: {adjustment.thresholds.good}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-yellow-500 rounded" />
                      <span>Warning: {adjustment.thresholds.warning}%</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-red-500 rounded" />
                      <span>Critical: {adjustment.thresholds.critical}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Seasonal Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Seasonal Performance Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {seasonData.seasonalTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium">{trend.month}</div>
                  <div className="text-sm text-muted-foreground">
                    {trend.season}
                  </div>
                </div>

                <div className="flex items-center gap-4 flex-1 max-w-sm">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span>Health Score: {trend.avgHealthScore}%</span>
                      <span>{trend.bookings} bookings</span>
                    </div>
                    <Progress value={trend.avgHealthScore} className="h-2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function WeddingSeasonAdjustmentsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <div className="h-6 bg-muted rounded animate-pulse w-1/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function getSeasonIcon(season: string, className?: string) {
  const iconClass = className || 'h-5 w-5';

  switch (season) {
    case 'spring':
      return <Flower2 className={cn(iconClass, 'text-green-600')} />;
    case 'summer':
      return <Sun className={cn(iconClass, 'text-yellow-600')} />;
    case 'fall':
      return <Leaf className={cn(iconClass, 'text-orange-600')} />;
    case 'winter':
      return <Snowflake className={cn(iconClass, 'text-blue-600')} />;
    default:
      return <Calendar className={iconClass} />;
  }
}

function getCurrentSeason(): 'spring' | 'summer' | 'fall' | 'winter' {
  const month = new Date().getMonth() + 1; // 1-based month

  if (month >= 3 && month <= 5) return 'spring';
  if (month >= 6 && month <= 8) return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter';
}

function isPeakWeddingSeason(): boolean {
  const month = new Date().getMonth() + 1; // 1-based month
  // Peak wedding season: May through October
  return month >= 5 && month <= 10;
}

function isCurrentMonth(monthName: string): boolean {
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });
  return monthName === currentMonth;
}

function generateSeasonalTrends() {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];

  const seasons = [
    'winter',
    'winter',
    'spring',
    'spring',
    'spring',
    'summer',
    'summer',
    'summer',
    'fall',
    'fall',
    'fall',
    'winter',
  ];

  return months.map((month, index) => {
    const isPeak = index >= 4 && index <= 9; // May-Oct
    const baseScore = isPeak ? 85 : 75;
    const variance = Math.random() * 10;

    return {
      month,
      season: seasons[index],
      avgHealthScore: Math.round(baseScore + variance),
      bookings: isPeak
        ? Math.floor(80 + Math.random() * 40)
        : Math.floor(20 + Math.random() * 30),
    };
  });
}
