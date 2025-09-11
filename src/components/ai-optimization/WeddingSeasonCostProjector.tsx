'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Heart,
  Camera,
  DollarSign,
  Settings,
} from 'lucide-react';
import type {
  WeddingSeasonCostProjectorProps,
  WeddingSeasonProjection,
} from '@/types/ai-optimization';

const WeddingSeasonCostProjector: React.FC<WeddingSeasonCostProjectorProps> = ({
  projections,
  currentBudget,
  onBudgetUpdate,
  className,
}) => {
  const [showBudgetEditor, setShowBudgetEditor] = useState(false);
  const [newBudget, setNewBudget] = useState(currentBudget);

  // Calculate total annual cost
  const totalAnnualCost = projections.reduce(
    (sum, p) => sum + p.projectedCostPence,
    0,
  );
  const peakSeasonMonths = projections.filter((p) => p.isWeddingSeason);
  const lowSeasonMonths = projections.filter((p) => !p.isWeddingSeason);

  const peakSeasonTotal = peakSeasonMonths.reduce(
    (sum, p) => sum + p.projectedCostPence,
    0,
  );
  const lowSeasonTotal = lowSeasonMonths.reduce(
    (sum, p) => sum + p.projectedCostPence,
    0,
  );

  // Format currency
  const formatPence = (pence: number): string => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  // Get month color based on season and intensity
  const getMonthColor = (projection: WeddingSeasonProjection): string => {
    if (!projection.isWeddingSeason)
      return 'bg-blue-50 border-blue-200 text-blue-800';

    switch (projection.aiIntensity) {
      case 'high':
        return 'bg-red-50 border-red-300 text-red-800';
      case 'medium':
        return 'bg-orange-50 border-orange-300 text-orange-800';
      case 'low':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  // Get intensity icon
  const getIntensityIcon = (intensity: string) => {
    switch (intensity) {
      case 'high':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'medium':
        return <Camera className="h-4 w-4 text-orange-500" />;
      case 'low':
        return <Calendar className="h-4 w-4 text-yellow-500" />;
      default:
        return <Calendar className="h-4 w-4 text-gray-500" />;
    }
  };

  // Calculate budget recommendations
  const recommendedMonthlyBudget = Math.max(
    ...projections.map((p) => p.projectedCostPence),
  );

  const budgetGap = recommendedMonthlyBudget - currentBudget;
  const needsBudgetIncrease = budgetGap > 0;

  // Handle budget update
  const handleBudgetSave = () => {
    onBudgetUpdate(newBudget);
    setShowBudgetEditor(false);
  };

  // Wedding season timeline
  const currentMonth = new Date().getMonth(); // 0-based
  const isCurrentlyPeakSeason = currentMonth >= 2 && currentMonth <= 9; // March-October

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Wedding Season Cost Projections
          </h2>
          <p className="text-gray-600">
            Plan your AI budget around peak wedding demand
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge
            variant={isCurrentlyPeakSeason ? 'default' : 'secondary'}
            className={isCurrentlyPeakSeason ? 'bg-orange-500' : ''}
          >
            {isCurrentlyPeakSeason
              ? 'Currently Peak Season'
              : 'Currently Low Season'}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBudgetEditor(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Adjust Budget
          </Button>
        </div>
      </div>

      {/* Budget Alert */}
      {needsBudgetIncrease && (
        <Alert className="border-orange-300 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            Your current budget ({formatPence(currentBudget)}) may not cover
            peak wedding season costs. Consider increasing to{' '}
            {formatPence(recommendedMonthlyBudget)} to avoid service
            interruptions during busy months.
          </AlertDescription>
        </Alert>
      )}

      {/* Annual Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Annual Projection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatPence(totalAnnualCost)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Total AI costs for the year
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Peak Season Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatPence(peakSeasonTotal)}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              March-October costs ({peakSeasonMonths.length} months)
            </p>
            <div className="text-xs text-orange-600 mt-2">
              +{((peakSeasonTotal / lowSeasonTotal - 1) * 100).toFixed(0)}% vs
              low season
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600">
              Peak Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatPence(
                Math.max(...projections.map((p) => p.projectedCostPence)),
              )}
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Highest projected monthly cost
            </p>
            <div className="text-xs text-gray-500 mt-2">
              Usually June (peak wedding month)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Projections Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Month-by-Month Projections</CardTitle>
          <p className="text-sm text-gray-600">
            AI cost projections based on wedding booking patterns and seasonal
            demand
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {projections.map((projection, index) => {
              const isCurrentMonth = index === currentMonth;
              const costIncrease =
                projection.projectedCostPence -
                (index > 0
                  ? projections[index - 1].projectedCostPence
                  : projection.projectedCostPence);

              return (
                <div
                  key={projection.month}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    isCurrentMonth
                      ? 'border-blue-400 bg-blue-50 shadow-md'
                      : getMonthColor(projection)
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {/* Month Info */}
                      <div className="flex items-center space-x-2">
                        <div className="font-bold text-lg">
                          {projection.month}
                          {isCurrentMonth && (
                            <Badge className="ml-2 text-xs">Current</Badge>
                          )}
                        </div>
                        {getIntensityIcon(projection.aiIntensity)}
                      </div>

                      {/* Wedding Volume */}
                      <div className="text-sm">
                        <div className="font-medium">
                          {projection.bookingVolume} weddings
                        </div>
                        <div className="text-xs opacity-75">
                          {projection.aiIntensity} AI intensity
                        </div>
                      </div>

                      {/* Season Badge */}
                      <Badge
                        variant={
                          projection.isWeddingSeason ? 'default' : 'secondary'
                        }
                        className={
                          projection.isWeddingSeason ? 'bg-orange-500' : ''
                        }
                      >
                        {projection.isWeddingSeason
                          ? `Peak (${projection.multiplier}x)`
                          : 'Low Season'}
                      </Badge>
                    </div>

                    {/* Cost Information */}
                    <div className="text-right">
                      <div className="flex items-center space-x-2">
                        {costIncrease > 500 && ( // Show trend if change > £5
                          <div className="flex items-center text-xs">
                            {costIncrease > 0 ? (
                              <TrendingUp className="h-3 w-3 text-red-500 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 text-green-500 mr-1" />
                            )}
                            <span
                              className={
                                costIncrease > 0
                                  ? 'text-red-600'
                                  : 'text-green-600'
                              }
                            >
                              {costIncrease > 0 ? '+' : ''}
                              {formatPence(Math.abs(costIncrease))}
                            </span>
                          </div>
                        )}

                        <div className="font-bold text-lg">
                          {formatPence(projection.projectedCostPence)}
                        </div>
                      </div>

                      {/* Show baseline vs projected if different */}
                      {projection.baselineCostPence !==
                        projection.projectedCostPence && (
                        <div className="text-xs opacity-75 line-through">
                          {formatPence(projection.baselineCostPence)} baseline
                        </div>
                      )}

                      {/* Budget status for this month */}
                      {projection.projectedCostPence > currentBudget && (
                        <div className="text-xs text-red-600 font-medium">
                          Over budget by{' '}
                          {formatPence(
                            projection.projectedCostPence - currentBudget,
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional month details */}
                  {projection.isWeddingSeason && (
                    <div className="mt-3 p-2 bg-white/50 rounded text-xs">
                      <div className="flex justify-between items-center">
                        <span>Wedding season multiplier applied</span>
                        <span className="font-medium">
                          {formatPence(projection.baselineCostPence)} ×{' '}
                          {projection.multiplier} ={' '}
                          {formatPence(projection.projectedCostPence)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Budget Editor Modal */}
      {showBudgetEditor && (
        <Card className="border-2 border-blue-300 bg-blue-50">
          <CardHeader>
            <CardTitle>Adjust Monthly Budget</CardTitle>
            <p className="text-sm text-gray-600">
              Set your monthly AI budget to match wedding season demands
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="budget">Monthly Budget (£)</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                min="0"
                value={(newBudget / 100).toFixed(2)}
                onChange={(e) =>
                  setNewBudget(Math.round(parseFloat(e.target.value) * 100))
                }
                className="mt-1"
              />
              <p className="text-xs text-gray-600 mt-1">
                Current: {formatPence(currentBudget)} · Recommended:{' '}
                {formatPence(recommendedMonthlyBudget)}
              </p>
            </div>

            {/* Budget Impact Visualization */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Budget Coverage:</Label>
              {projections.slice(0, 6).map((projection) => {
                const willCover = newBudget >= projection.projectedCostPence;
                return (
                  <div
                    key={projection.month}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>
                      {projection.month} (
                      {formatPence(projection.projectedCostPence)})
                    </span>
                    <Badge
                      variant={willCover ? 'default' : 'destructive'}
                      className={willCover ? 'bg-green-500' : ''}
                    >
                      {willCover ? 'Covered' : 'Over Budget'}
                    </Badge>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center space-x-3">
              <Button onClick={handleBudgetSave}>Save Budget</Button>
              <Button
                variant="outline"
                onClick={() => setShowBudgetEditor(false)}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => setNewBudget(recommendedMonthlyBudget)}
              >
                Use Recommended ({formatPence(recommendedMonthlyBudget)})
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wedding Season Tips */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span>Wedding Season Optimization Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Peak Season Preparation (March-October):
              </h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Enable aggressive caching in February</li>
                <li>• Switch to GPT-3.5 for internal communications</li>
                <li>• Batch process non-urgent AI tasks</li>
                <li>• Set budget alerts at 80% threshold</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">
                Cost Optimization Strategies:
              </h4>
              <ul className="space-y-1 text-gray-700">
                <li>• Pre-cache wedding templates in low season</li>
                <li>• Use GPT-4 only for client-facing content</li>
                <li>• Schedule photo processing during off-hours</li>
                <li>• Monitor weekly spend during peak months</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeddingSeasonCostProjector;
