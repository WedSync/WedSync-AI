'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Thermometer,
  Users,
  DollarSign,
  Target,
  Sun,
  CloudRain,
  Snowflake,
  Flower,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SeasonalData {
  season: 'spring' | 'summer' | 'autumn' | 'winter';
  month: string;
  demandMultiplier: number;
  averageCost: number;
  bookingRate: number;
  trend: 'up' | 'down' | 'stable';
  isOptimal: boolean;
}

interface WeddingSeasonProjectorProps {
  weddingDate?: Date;
  currentBudget?: number;
  className?: string;
  onSeasonSelect?: (season: SeasonalData) => void;
}

export default function WeddingSeasonProjector({
  weddingDate = new Date(2024, 5, 15), // June 15th default
  currentBudget = 5000,
  className,
  onSeasonSelect,
}: WeddingSeasonProjectorProps) {
  const [selectedMonth, setSelectedMonth] = useState<number>(
    weddingDate.getMonth(),
  );
  const [isLoading, setIsLoading] = useState(false);

  // Seasonal wedding cost data
  const seasonalData: SeasonalData[] = useMemo(
    () => [
      {
        season: 'spring',
        month: 'March',
        demandMultiplier: 0.85,
        averageCost: 4250,
        bookingRate: 75,
        trend: 'up',
        isOptimal: true,
      },
      {
        season: 'spring',
        month: 'April',
        demandMultiplier: 1.1,
        averageCost: 5500,
        bookingRate: 85,
        trend: 'up',
        isOptimal: false,
      },
      {
        season: 'spring',
        month: 'May',
        demandMultiplier: 1.2,
        averageCost: 6000,
        bookingRate: 90,
        trend: 'up',
        isOptimal: false,
      },
      {
        season: 'summer',
        month: 'June',
        demandMultiplier: 1.4,
        averageCost: 7000,
        bookingRate: 95,
        trend: 'stable',
        isOptimal: false,
      },
      {
        season: 'summer',
        month: 'July',
        demandMultiplier: 1.3,
        averageCost: 6500,
        bookingRate: 90,
        trend: 'down',
        isOptimal: false,
      },
      {
        season: 'summer',
        month: 'August',
        demandMultiplier: 1.25,
        averageCost: 6250,
        bookingRate: 88,
        trend: 'down',
        isOptimal: false,
      },
      {
        season: 'autumn',
        month: 'September',
        demandMultiplier: 1.15,
        averageCost: 5750,
        bookingRate: 82,
        trend: 'down',
        isOptimal: true,
      },
      {
        season: 'autumn',
        month: 'October',
        demandMultiplier: 1.05,
        averageCost: 5250,
        bookingRate: 78,
        trend: 'down',
        isOptimal: true,
      },
      {
        season: 'autumn',
        month: 'November',
        demandMultiplier: 0.8,
        averageCost: 4000,
        bookingRate: 60,
        trend: 'down',
        isOptimal: true,
      },
      {
        season: 'winter',
        month: 'December',
        demandMultiplier: 0.7,
        averageCost: 3500,
        bookingRate: 45,
        trend: 'stable',
        isOptimal: true,
      },
      {
        season: 'winter',
        month: 'January',
        demandMultiplier: 0.6,
        averageCost: 3000,
        bookingRate: 35,
        trend: 'up',
        isOptimal: true,
      },
      {
        season: 'winter',
        month: 'February',
        demandMultiplier: 0.75,
        averageCost: 3750,
        bookingRate: 55,
        trend: 'up',
        isOptimal: true,
      },
    ],
    [],
  );

  const currentSeasonData = seasonalData[selectedMonth];
  const projectedCost = currentBudget * currentSeasonData.demandMultiplier;
  const savings =
    currentSeasonData.averageCost < currentBudget
      ? currentBudget - currentSeasonData.averageCost
      : 0;
  const extraCost =
    currentSeasonData.averageCost > currentBudget
      ? currentSeasonData.averageCost - currentBudget
      : 0;

  const getSeasonIcon = (season: string) => {
    switch (season) {
      case 'spring':
        return <Flower className="h-4 w-4 text-green-500" />;
      case 'summer':
        return <Sun className="h-4 w-4 text-yellow-500" />;
      case 'autumn':
        return <CloudRain className="h-4 w-4 text-orange-500" />;
      case 'winter':
        return <Snowflake className="h-4 w-4 text-blue-500" />;
      default:
        return <Calendar className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Target className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getOptimalMonths = () => {
    return seasonalData.filter((data) => data.isOptimal);
  };

  const handleMonthSelect = (monthIndex: number) => {
    setSelectedMonth(monthIndex);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      onSeasonSelect?.(seasonalData[monthIndex]);
    }, 500);
  };

  return (
    <div className={cn('w-full max-w-md mx-auto p-4 space-y-4', className)}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Wedding Season Projector
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center">
            <div className="text-sm text-muted-foreground mb-1">
              Current Wedding Date
            </div>
            <div className="text-lg font-semibold">
              {seasonalData[selectedMonth].month} ({currentSeasonData.season})
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Month Analysis */}
      <Card
        className={cn(
          'border-2',
          currentSeasonData.isOptimal
            ? 'border-green-500 bg-green-50'
            : 'border-amber-500 bg-amber-50',
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              {getSeasonIcon(currentSeasonData.season)}
              <span className="font-semibold">{currentSeasonData.month}</span>
            </div>
            <div className="flex items-center gap-2">
              {getTrendIcon(currentSeasonData.trend)}
              <Badge
                variant={currentSeasonData.isOptimal ? 'default' : 'secondary'}
              >
                {currentSeasonData.isOptimal ? 'Optimal' : 'Peak Season'}
              </Badge>
            </div>
          </div>

          {/* Cost Comparison */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Average Cost</div>
              <div
                className={cn(
                  'text-lg font-bold',
                  currentSeasonData.averageCost > currentBudget
                    ? 'text-red-500'
                    : 'text-green-500',
                )}
              >
                {formatCurrency(currentSeasonData.averageCost)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Your Budget</div>
              <div className="text-lg font-bold text-primary">
                {formatCurrency(currentBudget)}
              </div>
            </div>
          </div>

          {/* Booking Demand */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Booking Demand</span>
              <span>{currentSeasonData.bookingRate}%</span>
            </div>
            <Progress value={currentSeasonData.bookingRate} className="h-3" />
          </div>

          {/* Impact Analysis */}
          {savings > 0 ? (
            <div className="bg-green-100 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <TrendingDown className="h-4 w-4" />
                <span className="font-semibold">Potential Savings</span>
              </div>
              <div className="text-green-600 font-bold">
                {formatCurrency(savings)}
              </div>
            </div>
          ) : extraCost > 0 ? (
            <div className="bg-red-100 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-700">
                <TrendingUp className="h-4 w-4" />
                <span className="font-semibold">Additional Cost</span>
              </div>
              <div className="text-red-600 font-bold">
                +{formatCurrency(extraCost)}
              </div>
            </div>
          ) : (
            <div className="bg-blue-100 rounded-lg p-3">
              <div className="flex items-center gap-2 text-blue-700">
                <Target className="h-4 w-4" />
                <span className="font-semibold">On Budget</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Month Selector Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Compare Other Months</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {seasonalData.map((data, index) => (
              <Button
                key={data.month}
                variant={selectedMonth === index ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleMonthSelect(index)}
                className={cn(
                  'h-16 flex flex-col justify-center items-center p-2 touch-manipulation',
                  data.isOptimal &&
                    selectedMonth !== index &&
                    'border-green-300',
                  selectedMonth === index && isLoading && 'animate-pulse',
                )}
                disabled={isLoading}
              >
                {getSeasonIcon(data.season)}
                <span className="text-xs font-medium">
                  {data.month.substring(0, 3)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {data.isOptimal ? '£' : '££'}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Optimal Recommendations */}
      <Card className="bg-green-50 border-green-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-green-700 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Optimal Wedding Months
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {getOptimalMonths()
              .slice(0, 3)
              .map((data, index) => (
                <div
                  key={data.month}
                  className="flex items-center justify-between p-2 bg-white rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    {getSeasonIcon(data.season)}
                    <span className="font-medium">{data.month}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {formatCurrency(data.averageCost)}
                    </div>
                    <div className="text-xs text-green-500">
                      Save {formatCurrency(currentBudget - data.averageCost)}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-12 touch-manipulation">
          <Thermometer className="h-4 w-4 mr-2" />
          Set Alert
        </Button>
        <Button className="h-12 touch-manipulation">
          <DollarSign className="h-4 w-4 mr-2" />
          Optimize Date
        </Button>
      </div>
    </div>
  );
}
