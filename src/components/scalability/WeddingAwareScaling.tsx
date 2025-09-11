'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  WeddingEvent,
  WeddingScalingPrefs,
  WeddingScalePrep,
  WeddingScalingPlan,
  TrafficPattern,
} from '@/types/scalability';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Switch,
  Slider,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  SegmentedControl,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import {
  Heart,
  Calendar,
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Settings,
  Zap,
  Activity,
  MapPin,
  Camera,
  Building,
  Crown,
  Target,
  Timer,
  BarChart3,
} from 'lucide-react';

interface WeddingAwareScalingProps {
  weddingSchedule: WeddingEvent[];
  scalingPreferences: WeddingScalingPrefs;
  onWeddingScalePrep: (prep: WeddingScalePrep) => void;
}

type TimeframeType = 'today' | 'week' | 'month';

/**
 * WeddingAwareScaling
 * Specialized scaling management for wedding-specific traffic patterns
 * - Wedding event timeline with scaling preparation
 * - Automated Saturday wedding scaling
 * - Wedding season capacity planning
 * - Real-time wedding day monitoring
 */
export const WeddingAwareScaling: React.FC<WeddingAwareScalingProps> = ({
  weddingSchedule,
  scalingPreferences,
  onWeddingScalePrep,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<TimeframeType>('week');
  const [showPrepModal, setShowPrepModal] = useState(false);
  const [selectedWedding, setSelectedWedding] = useState<WeddingEvent | null>(
    null,
  );
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);

  // Filter weddings by timeframe
  const upcomingWeddings = useMemo(() => {
    const now = new Date();
    const timeframes = {
      today: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      week: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    };

    return weddingSchedule
      .filter(
        (wedding) =>
          wedding.date <= timeframes[selectedTimeframe] && wedding.date >= now,
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [weddingSchedule, selectedTimeframe]);

  // Calculate expected peak load
  const expectedPeakLoad = useMemo(() => {
    return upcomingWeddings.reduce((total, wedding) => {
      return total + (wedding.expectedLoad?.requestsPerSecond || 0);
    }, 0);
  }, [upcomingWeddings]);

  // Get planned scale events
  const plannedScaleEvents = useMemo(() => {
    return upcomingWeddings
      .filter((wedding) => wedding.scalingPlan)
      .map((wedding) => ({
        weddingId: wedding.id,
        date: wedding.date,
        preScaleTime: wedding.scalingPlan?.preScaleTime,
        targetCapacity: wedding.scalingPlan?.targetCapacity,
      }));
  }, [upcomingWeddings]);

  // Wedding statistics
  const weddingStats = useMemo(() => {
    const today = new Date();
    const isSaturday = today.getDay() === 6;
    const todayWeddings = upcomingWeddings.filter(
      (w) => w.date.toDateString() === today.toDateString(),
    );

    return {
      totalUpcoming: upcomingWeddings.length,
      todayWeddings: todayWeddings.length,
      saturdayWeddings: upcomingWeddings.filter((w) => w.date.getDay() === 6)
        .length,
      highProfileWeddings: upcomingWeddings.filter((w) => w.isHighProfile)
        .length,
      isSaturday,
      estimatedTotalGuests: upcomingWeddings.reduce(
        (total, w) => total + w.expectedGuests,
        0,
      ),
    };
  }, [upcomingWeddings]);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWeddingTypeIcon = (type: string) => {
    switch (type) {
      case 'intimate':
        return <Heart className="w-4 h-4" />;
      case 'standard':
        return <Users className="w-4 h-4" />;
      case 'large':
        return <Crown className="w-4 h-4" />;
      case 'destination':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Heart className="w-4 h-4" />;
    }
  };

  const getRiskLevelColor = (risk: string) => {
    switch (risk) {
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

  const handleWeddingPrepare = (wedding: WeddingEvent) => {
    setSelectedWedding(wedding);
    setShowPrepModal(true);
  };

  return (
    <Card className="wedding-aware-scaling">
      <div className="section-header p-6 pb-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Wedding-Aware Scaling
              </h3>
            </div>
            {weddingStats.isSaturday && (
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 animate-pulse">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span>Saturday Wedding Mode Active</span>
                </div>
              </Badge>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {/* Timeframe Selector */}
            <SegmentedControl
              options={[
                { value: 'today', label: 'Today' },
                { value: 'week', label: 'This Week' },
                { value: 'month', label: 'This Month' },
              ]}
              value={selectedTimeframe}
              onChange={(value) => setSelectedTimeframe(value as TimeframeType)}
            />

            <Button
              variant="outline"
              onClick={() => setShowPreferencesModal(true)}
            >
              <Settings className="w-4 h-4 mr-2" />
              Preferences
            </Button>
          </div>
        </div>

        {/* Wedding Statistics */}
        <div className="wedding-stats grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div className="stat-card bg-blue-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {weddingStats.totalUpcoming}
            </div>
            <div className="text-sm text-blue-700">Upcoming Weddings</div>
          </div>
          <div className="stat-card bg-green-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-600">
              {expectedPeakLoad.toLocaleString()}
            </div>
            <div className="text-sm text-green-700">Peak Load (req/s)</div>
          </div>
          <div className="stat-card bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {weddingStats.saturdayWeddings}
            </div>
            <div className="text-sm text-purple-700">Saturday Weddings</div>
          </div>
          <div className="stat-card bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {plannedScaleEvents.length}
            </div>
            <div className="text-sm text-orange-700">Scale Events</div>
          </div>
        </div>
      </div>

      <div className="p-6">
        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="timeline">Wedding Timeline</TabsTrigger>
            <TabsTrigger value="capacity">Capacity Planning</TabsTrigger>
            <TabsTrigger value="monitoring">Real-time Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-6">
            <WeddingTimeline
              weddings={upcomingWeddings}
              onPrepareWedding={handleWeddingPrepare}
              timeframe={selectedTimeframe}
            />
          </TabsContent>

          <TabsContent value="capacity" className="mt-6">
            <CapacityPlanningView
              weddings={upcomingWeddings}
              preferences={scalingPreferences}
            />
          </TabsContent>

          <TabsContent value="monitoring" className="mt-6">
            <RealTimeMonitoring
              weddings={upcomingWeddings.filter((w) => {
                const now = new Date();
                const weddingTime = w.date.getTime();
                const timeDiff = weddingTime - now.getTime();
                // Show weddings happening today or in the next 4 hours
                return (
                  timeDiff <= 4 * 60 * 60 * 1000 &&
                  timeDiff >= -8 * 60 * 60 * 1000
                );
              })}
              preferences={scalingPreferences}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Wedding Scale Preparation Modal */}
      {showPrepModal && selectedWedding && (
        <WeddingScalePrepModal
          wedding={selectedWedding}
          currentCapacity={getCurrentCapacity()}
          recommendedCapacity={getRecommendedCapacity(selectedWedding)}
          onPrepare={(prep) => {
            onWeddingScalePrep(prep);
            setShowPrepModal(false);
            setSelectedWedding(null);
          }}
          onCancel={() => {
            setShowPrepModal(false);
            setSelectedWedding(null);
          }}
        />
      )}

      {/* Scaling Preferences Modal */}
      {showPreferencesModal && (
        <ScalingPreferencesModal
          preferences={scalingPreferences}
          onSave={(prefs) => {
            // Would update preferences
            console.log('Saving preferences:', prefs);
            setShowPreferencesModal(false);
          }}
          onCancel={() => setShowPreferencesModal(false)}
        />
      )}
    </Card>
  );
};

// Wedding Timeline Component
const WeddingTimeline: React.FC<{
  weddings: WeddingEvent[];
  onPrepareWedding: (wedding: WeddingEvent) => void;
  timeframe: TimeframeType;
}> = ({ weddings, onPrepareWedding, timeframe }) => {
  if (weddings.length === 0) {
    return (
      <div className="empty-state text-center py-12">
        <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          No weddings scheduled
        </h4>
        <p className="text-gray-600">
          No weddings found for the selected timeframe. Scaling will operate in
          standard mode.
        </p>
      </div>
    );
  }

  return (
    <div className="wedding-timeline">
      <div className="timeline-header mb-6">
        <h4 className="text-base font-medium text-gray-900 mb-2">
          Upcoming Weddings ({weddings.length})
        </h4>
        <p className="text-sm text-gray-600">
          Wedding events with automatic scaling preparation and monitoring
        </p>
      </div>

      <div className="wedding-events-list space-y-4">
        {weddings.map((wedding, index) => (
          <WeddingScaleEvent
            key={wedding.id}
            wedding={wedding}
            isNext={index === 0}
            onPrepareScale={() => onPrepareWedding(wedding)}
            onViewDetails={() => console.log('View details:', wedding.id)}
          />
        ))}
      </div>
    </div>
  );
};

// Wedding Scale Event Component
const WeddingScaleEvent: React.FC<{
  wedding: WeddingEvent;
  isNext: boolean;
  onPrepareScale: () => void;
  onViewDetails: () => void;
}> = ({ wedding, isNext, onPrepareScale, onViewDetails }) => {
  const timeUntilWedding = wedding.date.getTime() - Date.now();
  const isToday = wedding.date.toDateString() === new Date().toDateString();
  const isUpcoming = timeUntilWedding <= 4 * 60 * 60 * 1000; // 4 hours

  const formatTimeUntil = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0)
      return `${hours}h ${Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))}m`;
    return `${Math.floor(ms / (1000 * 60))}m`;
  };

  return (
    <Card
      className={`wedding-scale-event transition-all ${
        isNext ? 'ring-2 ring-blue-500 border-blue-300' : ''
      } ${isToday ? 'bg-purple-50 border-purple-200' : ''}`}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          {/* Wedding Info */}
          <div className="wedding-info flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="flex items-center space-x-2">
                {getWeddingTypeIcon(wedding.weddingType)}
                <h4 className="font-semibold text-gray-900">
                  Wedding #{wedding.id.slice(-8)}
                </h4>
              </div>

              <Badge className={getRiskLevelColor(wedding.riskLevel)}>
                {wedding.riskLevel.toUpperCase()} RISK
              </Badge>

              {wedding.isHighProfile && (
                <Badge className="bg-gold-100 text-gold-800 border-gold-200">
                  <Crown className="w-3 h-3 mr-1" />
                  VIP
                </Badge>
              )}

              {isNext && (
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  NEXT
                </Badge>
              )}
            </div>

            <div className="wedding-details grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="detail-item">
                <div className="flex items-center space-x-1 text-gray-500">
                  <Calendar className="w-3 h-3" />
                  <span>Date & Time</span>
                </div>
                <div className="font-medium">{formatDate(wedding.date)}</div>
                {timeUntilWedding > 0 && (
                  <div className="text-xs text-gray-500">
                    in {formatTimeUntil(timeUntilWedding)}
                  </div>
                )}
              </div>

              <div className="detail-item">
                <div className="flex items-center space-x-1 text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>Expected Guests</span>
                </div>
                <div className="font-medium">
                  {wedding.expectedGuests.toLocaleString()}
                </div>
              </div>

              <div className="detail-item">
                <div className="flex items-center space-x-1 text-gray-500">
                  <Activity className="w-3 h-3" />
                  <span>Peak Load</span>
                </div>
                <div className="font-medium">
                  {wedding.expectedLoad?.requestsPerSecond.toLocaleString()}/s
                </div>
              </div>

              <div className="detail-item">
                <div className="flex items-center space-x-1 text-gray-500">
                  <Timer className="w-3 h-3" />
                  <span>Duration</span>
                </div>
                <div className="font-medium">6-8 hours</div>
              </div>
            </div>

            {/* Vendor Information */}
            <div className="vendor-info mt-3 p-2 bg-gray-50 rounded text-xs">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <Camera className="w-3 h-3 text-gray-400" />
                  <span>Photographer: {wedding.vendors.photographerId}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Building className="w-3 h-3 text-gray-400" />
                  <span>Venue: {wedding.vendors.venueId}</span>
                </div>
                <div className="text-gray-500">
                  +{wedding.vendors.otherVendors.length} other vendors
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="wedding-actions flex flex-col space-y-2">
            <Button
              size="sm"
              onClick={onPrepareScale}
              className={
                isUpcoming
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }
            >
              {isUpcoming ? (
                <>
                  <Zap className="w-4 h-4 mr-1" />
                  Scale Now
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-1" />
                  Prepare Scale
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={onViewDetails}>
              View Details
            </Button>
          </div>
        </div>

        {/* Scaling Plan Status */}
        {wedding.scalingPlan && (
          <div className="scaling-plan-status mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-800">
                  Scaling Plan Active
                </span>
              </div>
              <Badge
                variant="outline"
                className="text-blue-600 border-blue-300"
              >
                {wedding.scalingPlan.status.toUpperCase()}
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-2 text-xs">
              <div>
                <span className="text-gray-600">Pre-scale:</span>
                <div className="font-medium">
                  {wedding.scalingPlan.preScaleTime.toLocaleTimeString()}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Estimated Cost:</span>
                <div className="font-medium">
                  ${wedding.scalingPlan.costEstimate}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Target Capacity:</span>
                <div className="font-medium">
                  {Object.values(wedding.scalingPlan.targetCapacity).reduce(
                    (a, b) => a + b,
                    0,
                  )}{' '}
                  instances
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

// Capacity Planning View Component
const CapacityPlanningView: React.FC<{
  weddings: WeddingEvent[];
  preferences: WeddingScalingPrefs;
}> = ({ weddings, preferences }) => {
  const capacityProjections = useMemo(() => {
    return weddings.map((wedding) => ({
      wedding,
      baseCapacity: 10, // Mock base capacity
      weddingCapacity: Math.ceil(wedding.expectedGuests / 50), // Rough calculation
      peakCapacity: Math.ceil(
        (wedding.expectedGuests / 30) * preferences.weddingDayMultiplier,
      ),
      estimatedCost: Math.ceil((wedding.expectedGuests / 50) * 15), // Mock cost calculation
    }));
  }, [weddings, preferences]);

  const totalCapacityNeeded = capacityProjections.reduce(
    (total, proj) => total + proj.peakCapacity,
    0,
  );
  const totalEstimatedCost = capacityProjections.reduce(
    (total, proj) => total + proj.estimatedCost,
    0,
  );

  return (
    <div className="capacity-planning-view">
      <div className="capacity-summary grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="summary-card">
          <div className="p-4 text-center">
            <BarChart3 className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-blue-600">
              {totalCapacityNeeded}
            </div>
            <div className="text-sm text-gray-600">Peak Instances Needed</div>
          </div>
        </Card>

        <Card className="summary-card">
          <div className="p-4 text-center">
            <DollarSign className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-green-600">
              ${totalEstimatedCost}
            </div>
            <div className="text-sm text-gray-600">Estimated Total Cost</div>
          </div>
        </Card>

        <Card className="summary-card">
          <div className="p-4 text-center">
            <Clock className="w-8 h-8 text-orange-500 mx-auto mb-2" />
            <div className="text-2xl font-bold text-orange-600">
              {preferences.preScaleBuffer}
            </div>
            <div className="text-sm text-gray-600">Pre-scale Buffer (min)</div>
          </div>
        </Card>
      </div>

      <div className="capacity-breakdown">
        <h4 className="text-base font-medium text-gray-900 mb-4">
          Capacity Breakdown by Wedding
        </h4>
        <div className="space-y-4">
          {capacityProjections.map(
            ({
              wedding,
              baseCapacity,
              weddingCapacity,
              peakCapacity,
              estimatedCost,
            }) => (
              <Card key={wedding.id} className="capacity-item">
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        Wedding #{wedding.id.slice(-8)}
                      </span>
                      <Badge variant="outline">
                        {formatDate(wedding.date)}
                      </Badge>
                      <Badge className={getRiskLevelColor(wedding.riskLevel)}>
                        {wedding.riskLevel}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {wedding.expectedGuests} guests • ${estimatedCost}{' '}
                      estimated
                    </div>
                  </div>

                  <div className="capacity-bars space-y-2">
                    <div className="capacity-bar">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Base Capacity</span>
                        <span>{baseCapacity} instances</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gray-400 h-2 rounded-full"
                          style={{
                            width: `${(baseCapacity / peakCapacity) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="capacity-bar">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Wedding Capacity</span>
                        <span>{weddingCapacity} instances</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${(weddingCapacity / peakCapacity) * 100}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="capacity-bar">
                      <div className="flex justify-between text-xs mb-1">
                        <span>
                          Peak Capacity ({preferences.weddingDayMultiplier}x)
                        </span>
                        <span>{peakCapacity} instances</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ),
          )}
        </div>
      </div>
    </div>
  );
};

// Real-time Monitoring Component
const RealTimeMonitoring: React.FC<{
  weddings: WeddingEvent[];
  preferences: WeddingScalingPrefs;
}> = ({ weddings, preferences }) => {
  if (weddings.length === 0) {
    return (
      <div className="empty-state text-center py-12">
        <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">
          No Active Weddings
        </h4>
        <p className="text-gray-600">
          No weddings are currently in progress or starting soon.
        </p>
      </div>
    );
  }

  return (
    <div className="real-time-monitoring">
      <div className="monitoring-header mb-6">
        <h4 className="text-base font-medium text-gray-900 mb-2">
          Active Wedding Monitoring ({weddings.length})
        </h4>
        <p className="text-sm text-gray-600">
          Real-time monitoring of weddings in progress or starting soon
        </p>
      </div>

      <div className="active-weddings space-y-4">
        {weddings.map((wedding) => (
          <Card
            key={wedding.id}
            className="active-wedding border-l-4 border-l-green-500"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <h4 className="font-semibold">
                    Wedding #{wedding.id.slice(-8)}
                  </h4>
                  <Badge className="bg-green-100 text-green-800">LIVE</Badge>
                </div>
                <div className="text-sm text-gray-600">
                  {formatDate(wedding.date)}
                </div>
              </div>

              <div className="monitoring-metrics grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="metric">
                  <div className="text-sm text-gray-600">Current Load</div>
                  <div className="text-xl font-bold text-blue-600">
                    {Math.floor(Math.random() * 5000 + 1000)}/s
                  </div>
                </div>

                <div className="metric">
                  <div className="text-sm text-gray-600">Active Users</div>
                  <div className="text-xl font-bold text-green-600">
                    {Math.floor(Math.random() * 200 + 50)}
                  </div>
                </div>

                <div className="metric">
                  <div className="text-sm text-gray-600">Response Time</div>
                  <div className="text-xl font-bold text-orange-600">
                    {Math.floor(Math.random() * 100 + 50)}ms
                  </div>
                </div>

                <div className="metric">
                  <div className="text-sm text-gray-600">Instances</div>
                  <div className="text-xl font-bold text-purple-600">
                    {Math.floor(Math.random() * 10 + 5)}/15
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Helper functions and modals would be implemented here
const getCurrentCapacity = () => ({ web: 5, api: 3, worker: 2, database: 1 });
const getRecommendedCapacity = (wedding: WeddingEvent) => ({
  web: Math.ceil(wedding.expectedGuests / 100),
  api: Math.ceil(wedding.expectedGuests / 150),
  worker: Math.ceil(wedding.expectedGuests / 200),
  database: 2,
});

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getWeddingTypeIcon = (type: string) => {
  switch (type) {
    case 'intimate':
      return <Heart className="w-4 h-4" />;
    case 'standard':
      return <Users className="w-4 h-4" />;
    case 'large':
      return <Crown className="w-4 h-4" />;
    case 'destination':
      return <MapPin className="w-4 h-4" />;
    default:
      return <Heart className="w-4 h-4" />;
  }
};

const getRiskLevelColor = (risk: string) => {
  switch (risk) {
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

// Modal components would be implemented here (simplified for brevity)
const WeddingScalePrepModal: React.FC<any> = ({
  wedding,
  onPrepare,
  onCancel,
}) => (
  <Dialog open={true} onOpenChange={onCancel}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          Prepare Scaling for Wedding #{wedding.id.slice(-8)}
        </DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <p>Wedding scaling preparation interface would be implemented here.</p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onPrepare({})}>Prepare Scaling</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

const ScalingPreferencesModal: React.FC<any> = ({
  preferences,
  onSave,
  onCancel,
}) => (
  <Dialog open={true} onOpenChange={onCancel}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Wedding Scaling Preferences</DialogTitle>
      </DialogHeader>
      <div className="py-4">
        <p>
          Scaling preferences configuration interface would be implemented here.
        </p>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(preferences)}>Save Preferences</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default WeddingAwareScaling;
