'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangleIcon,
  ShieldIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  RefreshCwIcon,
  BellIcon,
  HeartIcon,
  CameraIcon,
  CalendarIcon,
  ZapIcon,
} from 'lucide-react';
import {
  RateViolation,
  UpgradeRecommendation,
  ViolationType,
  SubscriptionTier,
  WeddingContextType,
  SupplierType,
  PlanningPhase,
  UrgencyLevel,
  isPeakWeddingSeason,
} from '@/types/rate-limiting';

interface ViolationAlertCenterProps {
  violations: RateViolation[];
  upgradeRecommendations: UpgradeRecommendation[];
  onResolveViolation?: (
    violationId: string,
    action: 'ignore' | 'upgrade' | 'block',
  ) => void;
  onSendUpgradeOffer?: (
    userId: string,
    recommendedTier: SubscriptionTier,
  ) => void;
  onContactUser?: (userId: string, violationId: string) => void;
  autoRefresh?: boolean;
}

export default function ViolationAlertCenter({
  violations,
  upgradeRecommendations,
  onResolveViolation,
  onSendUpgradeOffer,
  onContactUser,
  autoRefresh = true,
}: ViolationAlertCenterProps) {
  const [selectedViolation, setSelectedViolation] =
    useState<RateViolation | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<
    'all' | 'high' | 'medium' | 'low'
  >('all');
  const [filterType, setFilterType] = useState<ViolationType | 'all'>('all');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Auto refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      setLastRefresh(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Calculate alert metrics
  const criticalViolations = violations.filter(
    (v) =>
      v.violationType === ViolationType.MONTHLY_LIMIT_EXCEEDED ||
      v.violationType === ViolationType.AUTOMATED_ABUSE ||
      new Date().getTime() - v.timestamp.getTime() < 300000, // Last 5 minutes
  );

  const recentViolations = violations.filter(
    (v) => new Date().getTime() - v.timestamp.getTime() < 3600000, // Last hour
  );

  const weddingRelatedViolations = violations.filter(
    (v) =>
      v.endpoint.includes('wedding') ||
      v.endpoint.includes('supplier') ||
      v.endpoint.includes('couple'),
  );

  const upgradeOpportunities = upgradeRecommendations.filter(
    (rec) => rec.urgencyScore > 60,
  );

  // Wedding season context
  const isWeddingSeason = isPeakWeddingSeason();
  const seasonalViolations = violations.filter(
    (v) =>
      new Date().getTime() - v.timestamp.getTime() < 86400000 && // Last 24 hours
      isWeddingSeason,
  );

  const getViolationSeverity = (
    violation: RateViolation,
  ): 'high' | 'medium' | 'low' => {
    if (
      violation.violationType === ViolationType.AUTOMATED_ABUSE ||
      violation.violationType === ViolationType.MONTHLY_LIMIT_EXCEEDED
    ) {
      return 'high';
    }
    if (
      violation.violationType === ViolationType.DAILY_LIMIT_EXCEEDED ||
      violation.violationType === ViolationType.SUSPICIOUS_PATTERN
    ) {
      return 'medium';
    }
    return 'low';
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low'): string => {
    switch (severity) {
      case 'high':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low':
        return 'text-blue-600 bg-blue-100 border-blue-200';
    }
  };

  const getViolationIcon = (violationType: ViolationType) => {
    switch (violationType) {
      case ViolationType.RATE_LIMIT_EXCEEDED:
        return <ClockIcon className="w-4 h-4" />;
      case ViolationType.BURST_LIMIT_EXCEEDED:
        return <ZapIcon className="w-4 h-4" />;
      case ViolationType.DAILY_LIMIT_EXCEEDED:
        return <CalendarIcon className="w-4 h-4" />;
      case ViolationType.MONTHLY_LIMIT_EXCEEDED:
        return <AlertTriangleIcon className="w-4 h-4" />;
      case ViolationType.SUSPICIOUS_PATTERN:
        return <ShieldIcon className="w-4 h-4" />;
      case ViolationType.AUTOMATED_ABUSE:
        return <ShieldIcon className="w-4 h-4" />;
    }
  };

  const getViolationTypeLabel = (violationType: ViolationType): string => {
    return violationType
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const getWeddingContextLabel = (endpoint: string): string => {
    if (endpoint.includes('supplier')) return 'Supplier API';
    if (endpoint.includes('couple') || endpoint.includes('wedding'))
      return 'Wedding Planning';
    if (endpoint.includes('photo') || endpoint.includes('media'))
      return 'Photography';
    if (endpoint.includes('booking')) return 'Booking System';
    if (endpoint.includes('payment')) return 'Payment Processing';
    return 'General API';
  };

  const getWeddingContextIcon = (endpoint: string) => {
    if (endpoint.includes('supplier')) return <UserIcon className="w-4 h-4" />;
    if (endpoint.includes('couple') || endpoint.includes('wedding'))
      return <HeartIcon className="w-4 h-4" />;
    if (endpoint.includes('photo') || endpoint.includes('media'))
      return <CameraIcon className="w-4 h-4" />;
    if (endpoint.includes('booking'))
      return <CalendarIcon className="w-4 h-4" />;
    return <AlertTriangleIcon className="w-4 h-4" />;
  };

  const filteredViolations = violations.filter((violation) => {
    const severity = getViolationSeverity(violation);
    const severityMatch =
      filterSeverity === 'all' || severity === filterSeverity;
    const typeMatch =
      filterType === 'all' || violation.violationType === filterType;
    return severityMatch && typeMatch;
  });

  const handleResolveViolation = (
    violationId: string,
    action: 'ignore' | 'upgrade' | 'block',
  ) => {
    onResolveViolation?.(violationId, action);
    setSelectedViolation(null);
  };

  const getTimeAgo = (timestamp: Date): string => {
    const now = new Date();
    const diffMinutes = Math.floor(
      (now.getTime() - timestamp.getTime()) / (1000 * 60),
    );

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Violation Alert Center
          </h2>
          <p className="text-gray-600 mt-1">
            Monitor and resolve rate limit violations with clear upgrade
            guidance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-gray-600">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <Button variant="outline" size="sm">
            <RefreshCwIcon
              className={`w-4 h-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`}
            />
            {autoRefresh ? 'Auto' : 'Manual'}
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalViolations.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangleIcon className="h-4 w-4" />
          <AlertDescription>
            {criticalViolations.length} critical violation
            {criticalViolations.length > 1 ? 's' : ''} requiring immediate
            attention. Check for abuse patterns and consider rate limit
            adjustments.
          </AlertDescription>
        </Alert>
      )}

      {/* Wedding Season Alert */}
      {isWeddingSeason && seasonalViolations.length > 0 && (
        <Alert>
          <HeartIcon className="h-4 w-4" />
          <AlertDescription>
            Peak wedding season detected: {seasonalViolations.length} violations
            in the last 24 hours. Consider temporary rate limit increases for
            wedding-critical endpoints.
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Violations
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {violations.length}
                </p>
              </div>
              <AlertTriangleIcon className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {criticalViolations.length}
                </p>
              </div>
              <ShieldIcon className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Recent (1h)</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {recentViolations.length}
                </p>
              </div>
              <ClockIcon className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Upgrade Opportunities
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {upgradeOpportunities.length}
                </p>
              </div>
              <ArrowUpIcon className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="violations" className="w-full">
        <TabsList>
          <TabsTrigger value="violations">Active Violations</TabsTrigger>
          <TabsTrigger value="recommendations">
            Upgrade Recommendations
          </TabsTrigger>
          <TabsTrigger value="wedding">Wedding Context</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="violations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Violations</CardTitle>
              <CardDescription>
                Current rate limit violations requiring attention
              </CardDescription>
              <div className="flex gap-3">
                <Select
                  value={filterSeverity}
                  onValueChange={(value) => setFilterSeverity(value as any)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="high">High Priority</SelectItem>
                    <SelectItem value="medium">Medium Priority</SelectItem>
                    <SelectItem value="low">Low Priority</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filterType}
                  onValueChange={(value) => setFilterType(value as any)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="RATE_LIMIT_EXCEEDED">
                      Rate Limit
                    </SelectItem>
                    <SelectItem value="DAILY_LIMIT_EXCEEDED">
                      Daily Limit
                    </SelectItem>
                    <SelectItem value="MONTHLY_LIMIT_EXCEEDED">
                      Monthly Limit
                    </SelectItem>
                    <SelectItem value="SUSPICIOUS_PATTERN">
                      Suspicious
                    </SelectItem>
                    <SelectItem value="AUTOMATED_ABUSE">Abuse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredViolations.map((violation) => {
                  const severity = getViolationSeverity(violation);
                  const weddingContext = getWeddingContextLabel(
                    violation.endpoint,
                  );

                  return (
                    <div
                      key={violation.id}
                      className={`p-4 border rounded-lg ${getSeverityColor(severity)}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-full">
                            {getViolationIcon(violation.violationType)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {getViolationTypeLabel(violation.violationType)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {violation.endpoint} •{' '}
                              {getTimeAgo(violation.timestamp)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {violation.requestsAttempted} attempts •{' '}
                              {violation.requestsAllowed} allowed
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {severity}
                          </Badge>
                          <Badge variant="secondary">{weddingContext}</Badge>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedViolation(violation)}
                              >
                                Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl">
                              <DialogHeader>
                                <DialogTitle>Violation Details</DialogTitle>
                                <DialogDescription>
                                  Comprehensive information about this rate
                                  limit violation
                                </DialogDescription>
                              </DialogHeader>

                              {selectedViolation && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <p className="font-medium">User ID</p>
                                      <p className="text-sm text-gray-600">
                                        {selectedViolation.userId}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium">
                                        Organization
                                      </p>
                                      <p className="text-sm text-gray-600">
                                        {selectedViolation.organizationId}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium">IP Address</p>
                                      <p className="text-sm text-gray-600">
                                        {selectedViolation.ipAddress}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium">User Agent</p>
                                      <p
                                        className="text-sm text-gray-600 truncate"
                                        title={selectedViolation.userAgent}
                                      >
                                        {selectedViolation.userAgent}
                                      </p>
                                    </div>
                                  </div>

                                  <div>
                                    <p className="font-medium">Endpoint</p>
                                    <p className="text-sm text-gray-600">
                                      {selectedViolation.endpoint}
                                    </p>
                                  </div>

                                  <div className="grid grid-cols-3 gap-4">
                                    <div>
                                      <p className="font-medium">
                                        Requests Attempted
                                      </p>
                                      <p className="text-lg font-bold text-red-600">
                                        {selectedViolation.requestsAttempted.toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium">
                                        Requests Allowed
                                      </p>
                                      <p className="text-lg font-bold text-green-600">
                                        {selectedViolation.requestsAllowed.toLocaleString()}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="font-medium">Retry After</p>
                                      <p className="text-lg font-bold text-yellow-600">
                                        {selectedViolation.retryAfter}s
                                      </p>
                                    </div>
                                  </div>

                                  {selectedViolation.upgradeRecommendation && (
                                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                                      <h4 className="font-medium text-green-900 mb-2">
                                        Upgrade Recommendation
                                      </h4>
                                      <p className="text-sm text-green-700 mb-3">
                                        {
                                          selectedViolation
                                            .upgradeRecommendation.customMessage
                                        }
                                      </p>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() =>
                                            onSendUpgradeOffer?.(
                                              selectedViolation.userId,
                                              selectedViolation
                                                .upgradeRecommendation!
                                                .recommendedTier,
                                            )
                                          }
                                        >
                                          Send Upgrade Offer
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            onContactUser?.(
                                              selectedViolation.userId,
                                              selectedViolation.id,
                                            )
                                          }
                                        >
                                          Contact User
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() =>
                                        handleResolveViolation(
                                          selectedViolation.id,
                                          'ignore',
                                        )
                                      }
                                    >
                                      <CheckCircleIcon className="w-4 h-4 mr-2" />
                                      Ignore
                                    </Button>
                                    <Button
                                      onClick={() =>
                                        handleResolveViolation(
                                          selectedViolation.id,
                                          'upgrade',
                                        )
                                      }
                                    >
                                      <ArrowUpIcon className="w-4 h-4 mr-2" />
                                      Suggest Upgrade
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={() =>
                                        handleResolveViolation(
                                          selectedViolation.id,
                                          'block',
                                        )
                                      }
                                    >
                                      <XCircleIcon className="w-4 h-4 mr-2" />
                                      Block User
                                    </Button>
                                  </div>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-3 flex items-center gap-2">
                        {violation.upgradeRecommendation && (
                          <div className="text-sm text-green-700 bg-green-100 px-2 py-1 rounded">
                            Upgrade to{' '}
                            {violation.upgradeRecommendation.recommendedTier}{' '}
                            recommended
                          </div>
                        )}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <MapPinIcon className="w-3 h-3" />
                          {violation.ipAddress}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredViolations.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <CheckCircleIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">No violations found</p>
                    <p className="text-sm">
                      All users are within their rate limits
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Upgrade Recommendations</CardTitle>
              <CardDescription>
                Users who would benefit from tier upgrades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upgradeRecommendations.map((recommendation) => (
                  <div
                    key={`${recommendation.currentTier}-${recommendation.recommendedTier}`}
                    className="p-4 border rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <ArrowUpIcon className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="font-medium text-gray-900">
                            {recommendation.currentTier} →{' '}
                            {recommendation.recommendedTier}
                          </p>
                          <p className="text-sm text-gray-600">
                            {recommendation.customMessage}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>Urgency: {recommendation.urgencyScore}%</span>
                            <span>
                              +
                              {recommendation.additionalRequests.toLocaleString()}{' '}
                              requests
                            </span>
                            {recommendation.monthlySavings && (
                              <span className="text-green-600">
                                Save ${recommendation.monthlySavings}/month
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {recommendation.weddingDeadlineImpact && (
                          <Badge
                            variant="outline"
                            className="border-red-300 text-red-700"
                          >
                            Wedding Deadline
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          onClick={() =>
                            onSendUpgradeOffer?.(
                              recommendation.currentTier,
                              recommendation.recommendedTier,
                            )
                          }
                        >
                          Send Offer
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="wedding" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Industry Context</CardTitle>
              <CardDescription>
                Violations with wedding industry implications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weddingRelatedViolations.map((violation) => (
                  <div
                    key={violation.id}
                    className="p-4 bg-purple-50 border border-purple-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getWeddingContextIcon(violation.endpoint)}
                        <div>
                          <p className="font-medium text-purple-900">
                            {getWeddingContextLabel(violation.endpoint)}
                          </p>
                          <p className="text-sm text-purple-700">
                            {violation.endpoint}
                          </p>
                          <p className="text-xs text-purple-600">
                            {getTimeAgo(violation.timestamp)} •{' '}
                            {violation.requestsAttempted} attempts
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-purple-300 text-purple-700"
                      >
                        {getViolationTypeLabel(violation.violationType)}
                      </Badge>
                    </div>

                    {violation.upgradeRecommendation && (
                      <div className="mt-3 p-3 bg-white rounded">
                        <p className="text-sm text-purple-800">
                          💡 {violation.upgradeRecommendation.customMessage}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {weddingRelatedViolations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <HeartIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No wedding-related violations detected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Violation Trends */}
            <Card>
              <CardHeader>
                <CardTitle>Violation Trends</CardTitle>
                <CardDescription>
                  Patterns and trends in rate limit violations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-red-50 rounded-lg">
                    <p className="font-medium text-red-800">
                      High Priority Violations
                    </p>
                    <p className="text-2xl font-bold text-red-900">
                      {criticalViolations.length}
                    </p>
                    <p className="text-sm text-red-700">
                      Requiring immediate attention
                    </p>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg">
                    <p className="font-medium text-yellow-800">
                      Recent Activity
                    </p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {recentViolations.length}
                    </p>
                    <p className="text-sm text-yellow-700">
                      Violations in the last hour
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <p className="font-medium text-green-800">
                      Resolution Rate
                    </p>
                    <p className="text-2xl font-bold text-green-900">
                      {violations.length > 0
                        ? Math.round(
                            (upgradeOpportunities.length / violations.length) *
                              100,
                          )
                        : 0}
                      %
                    </p>
                    <p className="text-sm text-green-700">
                      Violations with upgrade paths
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Bulk operations and system-wide settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <BellIcon className="w-4 h-4 mr-2" />
                    Send Bulk Upgrade Notifications (
                    {upgradeOpportunities.length})
                  </Button>

                  <Button className="w-full justify-start" variant="outline">
                    <ShieldIcon className="w-4 h-4 mr-2" />
                    Review Security Patterns ({criticalViolations.length})
                  </Button>

                  <Button className="w-full justify-start" variant="outline">
                    <HeartIcon className="w-4 h-4 mr-2" />
                    Wedding Season Rate Adjustments
                  </Button>

                  <Button className="w-full justify-start" variant="outline">
                    <RefreshCwIcon className="w-4 h-4 mr-2" />
                    Auto-resolve Low Priority Violations
                  </Button>
                </div>

                {isWeddingSeason && (
                  <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm font-medium text-purple-800">
                      Wedding Season Active
                    </p>
                    <p className="text-xs text-purple-600 mt-1">
                      Consider temporary rate limit increases for critical
                      wedding endpoints
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
