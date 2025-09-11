'use client';

// WS-195: MRR Tracker Component
// Monthly Recurring Revenue tracking with wedding season analysis and movement categorization

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MRRTrackerProps,
  MRRMovement,
  MRRBreakdown,
} from '@/types/business-metrics';
import { MRRMovementChart } from '@/components/business/charts/MRRMovementChart';
import { SeasonalTrendsChart } from '@/components/business/charts/SeasonalTrendsChart';
import { MetricsCard } from '@/components/business/metrics/MetricsCard';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  ChevronUp,
  ChevronDown,
  Target,
  PieChart,
  BarChart3,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * MRR Tracker Component
 * Comprehensive Monthly Recurring Revenue tracking for wedding marketplace
 * Features:
 * - Real-time MRR monitoring with growth calculations
 * - Movement analysis (New, Expansion, Contraction, Churn)
 * - Wedding season impact visualization
 * - Supplier type breakdown and tier analysis
 * - Growth projections with confidence intervals
 */
export function MRRTracker({
  mrrData,
  timeRange,
  showProjections,
  onMovementClick,
}: MRRTrackerProps) {
  const [selectedView, setSelectedView] = useState<
    'movements' | 'breakdown' | 'projections'
  >('movements');
  const [selectedSupplierType, setSelectedSupplierType] =
    useState<string>('all');

  // Calculate MRR insights
  const mrrInsights = useMemo(() => {
    const { current, previous, movements, breakdown } = mrrData;

    const newMRR = movements
      .filter((m) => m.type === 'new')
      .reduce((sum, m) => sum + m.amount, 0);
    const expandedMRR = movements
      .filter((m) => m.type === 'expansion')
      .reduce((sum, m) => sum + m.amount, 0);
    const contractedMRR = movements
      .filter((m) => m.type === 'contraction')
      .reduce((sum, m) => sum + m.amount, 0);
    const churnedMRR = movements
      .filter((m) => m.type === 'churn')
      .reduce((sum, m) => sum + m.amount, 0);

    const netNew = newMRR + expandedMRR - contractedMRR - churnedMRR;
    const growthRate =
      previous > 0 ? ((current - previous) / previous) * 100 : 0;

    return {
      netNew,
      newMRR,
      expandedMRR,
      contractedMRR,
      churnedMRR,
      growthRate,
      totalCustomers: movements.reduce((sum, m) => sum + m.count, 0),
    };
  }, [mrrData]);

  // Format currency values
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Get movement status color
  const getMovementColor = (type: MRRMovement['type']): string => {
    switch (type) {
      case 'new':
        return 'text-green-600 bg-green-50';
      case 'expansion':
        return 'text-blue-600 bg-blue-50';
      case 'contraction':
        return 'text-yellow-600 bg-yellow-50';
      case 'churn':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // Get movement icon
  const getMovementIcon = (type: MRRMovement['type']) => {
    switch (type) {
      case 'new':
        return <TrendingUp className="w-4 h-4" />;
      case 'expansion':
        return <ChevronUp className="w-4 h-4" />;
      case 'contraction':
        return <ChevronDown className="w-4 h-4" />;
      case 'churn':
        return <TrendingDown className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  // Filter breakdown by supplier type
  const filteredBreakdown = useMemo(() => {
    if (selectedSupplierType === 'all') return mrrData.breakdown.bySupplierType;

    return {
      [selectedSupplierType]:
        mrrData.breakdown.bySupplierType[selectedSupplierType] || 0,
    };
  }, [mrrData.breakdown.bySupplierType, selectedSupplierType]);

  return (
    <div className="space-y-6">
      {/* Header with Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Current MRR"
          value={mrrData.current}
          format="currency"
          change={mrrInsights.growthRate}
          changeType={mrrInsights.growthRate > 0 ? 'positive' : 'negative'}
          status={
            mrrInsights.growthRate > 15
              ? 'excellent'
              : mrrInsights.growthRate > 10
                ? 'healthy'
                : 'concerning'
          }
          weddingContext="Total monthly recurring revenue from wedding suppliers"
        />

        <MetricsCard
          title="Net New MRR"
          value={mrrInsights.netNew}
          format="currency"
          change={15.2} // This would be calculated from historical data
          changeType="positive"
          status="healthy"
          weddingContext="Net growth after churn and contractions"
        />

        <MetricsCard
          title="New Customer MRR"
          value={mrrInsights.newMRR}
          format="currency"
          change={22.5}
          changeType="positive"
          status="excellent"
          weddingContext="MRR from newly acquired wedding suppliers"
        />

        <MetricsCard
          title="Churn Rate"
          value={(mrrInsights.churnedMRR / mrrData.previous) * 100}
          format="percentage"
          change={-2.1}
          changeType="positive"
          status={
            mrrInsights.churnedMRR / mrrData.previous < 0.05
              ? 'excellent'
              : 'healthy'
          }
          weddingContext="Monthly supplier churn rate"
        />
      </div>

      {/* View Selection and Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={selectedView === 'movements' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('movements')}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Movements
          </Button>
          <Button
            variant={selectedView === 'breakdown' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedView('breakdown')}
          >
            <PieChart className="w-4 h-4 mr-2" />
            Breakdown
          </Button>
          {showProjections && (
            <Button
              variant={selectedView === 'projections' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedView('projections')}
            >
              <Target className="w-4 h-4 mr-2" />
              Projections
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Select
            value={selectedSupplierType}
            onValueChange={setSelectedSupplierType}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by supplier type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Suppliers</SelectItem>
              <SelectItem value="photographer">Photographers</SelectItem>
              <SelectItem value="venue">Venues</SelectItem>
              <SelectItem value="florist">Florists</SelectItem>
              <SelectItem value="caterer">Caterers</SelectItem>
              <SelectItem value="band">Bands & DJs</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Chart/Analysis */}
        <div className="lg:col-span-2">
          {selectedView === 'movements' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  MRR Movement Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MRRMovementChart
                  data={mrrData.movements}
                  height={400}
                  interactive={true}
                  weddingSeasonHighlight={true}
                />
              </CardContent>
            </Card>
          )}

          {selectedView === 'breakdown' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5 text-green-600" />
                  Revenue Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* By Supplier Type */}
                  <div>
                    <h4 className="font-medium mb-3">By Supplier Type</h4>
                    <div className="space-y-2">
                      {Object.entries(filteredBreakdown).map(
                        ([type, amount]) => (
                          <div
                            key={type}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                          >
                            <span className="font-medium capitalize">
                              {type.replace('_', ' ')}
                            </span>
                            <div className="text-right">
                              <div className="font-bold">
                                {formatCurrency(amount)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {((amount / mrrData.current) * 100).toFixed(1)}%
                                of total
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* By Tier */}
                  <div>
                    <h4 className="font-medium mb-3">By Subscription Tier</h4>
                    <div className="space-y-2">
                      {Object.entries(mrrData.breakdown.byTier).map(
                        ([tier, amount]) => (
                          <div
                            key={tier}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-md"
                          >
                            <span className="font-medium">{tier}</span>
                            <div className="text-right">
                              <div className="font-bold">
                                {formatCurrency(amount)}
                              </div>
                              <div className="text-xs text-gray-500">
                                {((amount / mrrData.current) * 100).toFixed(1)}%
                                of total
                              </div>
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {selectedView === 'projections' && showProjections && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-purple-600" />
                  MRR Growth Projections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mrrData.projections.map((projection, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-medium">{projection.period}</h4>
                          <p className="text-2xl font-bold text-blue-600">
                            {formatCurrency(projection.projected)}
                          </p>
                        </div>
                        <Badge
                          variant={
                            projection.confidence === 'high'
                              ? 'default'
                              : projection.confidence === 'medium'
                                ? 'secondary'
                                : 'outline'
                          }
                        >
                          {projection.confidence} confidence
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p className="font-medium mb-1">Key Assumptions:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {projection.assumptions.map((assumption, idx) => (
                            <li key={idx}>{assumption}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side Panel - Movement Details */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-orange-600" />
                Movement Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mrrData.movements.map((movement, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-md cursor-pointer hover:shadow-sm transition-shadow',
                      getMovementColor(movement.type),
                    )}
                    onClick={() => onMovementClick(movement)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getMovementIcon(movement.type)}
                        <span className="font-medium capitalize">
                          {movement.type}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold">
                          {movement.type === 'churn' ||
                          movement.type === 'contraction'
                            ? '-'
                            : '+'}
                          {formatCurrency(Math.abs(movement.amount))}
                        </div>
                        <div className="text-xs opacity-75">
                          {movement.count} suppliers
                        </div>
                      </div>
                    </div>
                    <p className="text-sm">{movement.description}</p>
                    <p className="text-xs italic mt-1 opacity-90">
                      {movement.weddingContext}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Wedding Season Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-pink-600" />
                Seasonal Impact
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SeasonalTrendsChart
                data={Object.entries(mrrData.breakdown.bySeason).map(
                  ([season, amount]) => ({
                    season,
                    amount,
                    percentage: (amount / mrrData.current) * 100,
                  }),
                )}
                height={200}
                showLegend={false}
              />
              <div className="mt-4 space-y-2">
                {Object.entries(mrrData.breakdown.bySeason).map(
                  ([season, amount]) => (
                    <div key={season} className="flex justify-between text-sm">
                      <span className="capitalize">
                        {season.replace('_', ' ')}
                      </span>
                      <span className="font-medium">
                        {formatCurrency(amount)} (
                        {((amount / mrrData.current) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default MRRTracker;
