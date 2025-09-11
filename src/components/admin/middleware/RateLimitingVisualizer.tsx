'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ClockIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  StopIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  CreditCardIcon,
} from '@heroicons/react/24/outline';

interface RateLimitingVisualizerProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface RateLimitMetrics {
  endpoint: string;
  requestCount: number;
  limit: number;
  windowSize: string;
  violationCount: number;
  lastViolation?: Date;
  weddingContext: string;
}

interface TierUsageBreakdown {
  tier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  activeUsers: number;
  requestsPerHour: number;
  violationRate: number;
  allowedRequests: number;
  weddingSpecificUsage: string;
  color: string;
}

interface ViolationPattern {
  id: string;
  timestamp: Date;
  sourceIp: string;
  userTier: string;
  endpoint: string;
  requestCount: number;
  blockDuration: string;
  weddingDataAttempt: string;
  severity: 'low' | 'medium' | 'high';
}

interface WeddingSeasonMetrics {
  isPeakSeason: boolean;
  seasonName: string;
  trafficIncrease: number;
  mostActiveHours: string;
  topEndpoints: { endpoint: string; usage: number }[];
  supplierActivitySpikes: boolean;
}

export function RateLimitingVisualizer({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: RateLimitingVisualizerProps) {
  const [rateLimitMetrics, setRateLimitMetrics] = useState<RateLimitMetrics[]>(
    [],
  );
  const [tierBreakdown, setTierBreakdown] = useState<TierUsageBreakdown[]>([]);
  const [violationPatterns, setViolationPatterns] = useState<
    ViolationPattern[]
  >([]);
  const [seasonMetrics, setSeasonMetrics] =
    useState<WeddingSeasonMetrics | null>(null);
  const [timeframe, setTimeframe] = useState<string>('1h');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(true);

  const fetchRateLimitData = useCallback(async () => {
    // Mock rate limiting data - In production, integrate with rate limiting middleware
    const mockRateLimitMetrics: RateLimitMetrics[] = [
      {
        endpoint: '/api/forms/wedding-consultation',
        requestCount: 847,
        limit: 1000,
        windowSize: '1 hour',
        violationCount: 12,
        lastViolation: new Date(Date.now() - 15 * 60000),
        weddingContext:
          'Couple consultation form submissions during bridal show season',
      },
      {
        endpoint: '/api/venues/search',
        requestCount: 2341,
        limit: 2500,
        windowSize: '1 hour',
        violationCount: 8,
        lastViolation: new Date(Date.now() - 8 * 60000),
        weddingContext: 'Wedding venue discovery and comparison searches',
      },
      {
        endpoint: '/api/photos/upload',
        requestCount: 156,
        limit: 200,
        windowSize: '1 hour',
        violationCount: 3,
        weddingContext: 'Wedding photographer portfolio and gallery uploads',
      },
      {
        endpoint: '/api/auth/login',
        requestCount: 445,
        limit: 500,
        windowSize: '1 hour',
        violationCount: 15,
        lastViolation: new Date(Date.now() - 5 * 60000),
        weddingContext: 'Supplier and couple account authentication attempts',
      },
      {
        endpoint: '/api/bookings/availability',
        requestCount: 1876,
        limit: 2000,
        windowSize: '1 hour',
        violationCount: 6,
        weddingContext: 'Real-time venue and supplier availability checks',
      },
    ];

    const mockTierBreakdown: TierUsageBreakdown[] = [
      {
        tier: 'free',
        activeUsers: 1247,
        requestsPerHour: 50,
        violationRate: 8.3,
        allowedRequests: 100,
        weddingSpecificUsage:
          'Basic venue searches and consultation form submissions',
        color: 'bg-gray-100 text-gray-800',
      },
      {
        tier: 'starter',
        activeUsers: 423,
        requestsPerHour: 180,
        violationRate: 3.2,
        allowedRequests: 500,
        weddingSpecificUsage:
          'Enhanced venue searches, supplier browsing, basic bookings',
        color: 'bg-blue-100 text-blue-800',
      },
      {
        tier: 'professional',
        activeUsers: 234,
        requestsPerHour: 750,
        violationRate: 1.1,
        allowedRequests: 2000,
        weddingSpecificUsage:
          'Full marketplace access, AI features, unlimited searches',
        color: 'bg-primary-100 text-primary-800',
      },
      {
        tier: 'scale',
        activeUsers: 89,
        requestsPerHour: 2100,
        violationRate: 0.4,
        allowedRequests: 5000,
        weddingSpecificUsage: 'API access, advanced analytics, bulk operations',
        color: 'bg-purple-100 text-purple-800',
      },
      {
        tier: 'enterprise',
        activeUsers: 12,
        requestsPerHour: 8900,
        violationRate: 0.1,
        allowedRequests: 20000,
        weddingSpecificUsage:
          'White-label solutions, unlimited access, custom integrations',
        color: 'bg-yellow-100 text-yellow-800',
      },
    ];

    const mockViolationPatterns: ViolationPattern[] = [
      {
        id: 'viol_001',
        timestamp: new Date(Date.now() - 5 * 60000),
        sourceIp: '192.168.1.105',
        userTier: 'free',
        endpoint: '/api/auth/login',
        requestCount: 125,
        blockDuration: '15 minutes',
        weddingDataAttempt:
          'Brute force attack on wedding supplier login accounts',
        severity: 'high',
      },
      {
        id: 'viol_002',
        timestamp: new Date(Date.now() - 12 * 60000),
        sourceIp: '203.0.113.78',
        userTier: 'starter',
        endpoint: '/api/venues/search',
        requestCount: 520,
        blockDuration: '30 minutes',
        weddingDataAttempt:
          'Automated venue data scraping for competitive analysis',
        severity: 'medium',
      },
      {
        id: 'viol_003',
        timestamp: new Date(Date.now() - 25 * 60000),
        sourceIp: '45.33.32.199',
        userTier: 'free',
        endpoint: '/api/forms/wedding-consultation',
        requestCount: 105,
        blockDuration: '1 hour',
        weddingDataAttempt:
          'Spam submission of fake wedding consultation requests',
        severity: 'medium',
      },
    ];

    const mockSeasonMetrics: WeddingSeasonMetrics = {
      isPeakSeason: true,
      seasonName: 'Spring Bridal Show Season',
      trafficIncrease: 185,
      mostActiveHours: '10 AM - 2 PM, 6 PM - 9 PM',
      topEndpoints: [
        { endpoint: '/api/venues/search', usage: 45 },
        { endpoint: '/api/forms/wedding-consultation', usage: 28 },
        { endpoint: '/api/suppliers/browse', usage: 22 },
        { endpoint: '/api/bookings/availability', usage: 18 },
      ],
      supplierActivitySpikes: true,
    };

    setRateLimitMetrics(mockRateLimitMetrics);
    setTierBreakdown(mockTierBreakdown);
    setViolationPatterns(mockViolationPatterns);
    setSeasonMetrics(mockSeasonMetrics);
  }, [timeframe]);

  useEffect(() => {
    fetchRateLimitData();
  }, [fetchRateLimitData, lastRefresh]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isRealTimeEnabled) {
      interval = setInterval(fetchRateLimitData, 10000); // Refresh every 10 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRealTimeEnabled, fetchRateLimitData]);

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-error-500';
    if (percentage >= 75) return 'bg-warning-500';
    if (percentage >= 50) return 'bg-primary-500';
    return 'bg-success-500';
  };

  const getUsageTextColor = (percentage: number) => {
    if (percentage >= 90) return 'text-error-700';
    if (percentage >= 75) return 'text-warning-700';
    if (percentage >= 50) return 'text-primary-700';
    return 'text-success-700';
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'text-error-700 bg-error-50 border-error-200';
      case 'medium':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      case 'low':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const filteredTierData =
    selectedTier === 'all'
      ? tierBreakdown
      : tierBreakdown.filter((tier) => tier.tier === selectedTier);

  const totalViolations = violationPatterns.length;
  const recentViolations = violationPatterns.filter(
    (v) => new Date(v.timestamp) > new Date(Date.now() - 60 * 60000), // Last hour
  ).length;
  const highSeverityViolations = violationPatterns.filter(
    (v) => v.severity === 'high',
  ).length;

  if (!seasonMetrics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <span className="ml-3 text-gray-600">
          Loading rate limiting data...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Rate Limiting Visualizer
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Monitor API usage patterns and subscription tier violations
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700">Real-time:</span>
            <button
              onClick={() => setIsRealTimeEnabled(!isRealTimeEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isRealTimeEnabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isRealTimeEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* Wedding Season Context */}
      {seasonMetrics.isPeakSeason && (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl border border-orange-200 p-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-8 h-8 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-orange-900">
                {seasonMetrics.seasonName} - Peak Traffic Period
              </h3>
              <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-orange-700">
                    <strong>Traffic Increase:</strong> +
                    {seasonMetrics.trafficIncrease}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-700">
                    <strong>Peak Hours:</strong> {seasonMetrics.mostActiveHours}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-orange-700">
                    <strong>Supplier Activity:</strong>{' '}
                    {seasonMetrics.supplierActivitySpikes ? 'High' : 'Normal'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rate Limiting Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                Total Violations
              </p>
              <p className="text-3xl font-bold text-error-700 mt-1">
                {totalViolations}
              </p>
              <p className="text-sm text-error-600 mt-1">Rate limit breaches</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-error-100 rounded-lg">
              <StopIcon className="w-6 h-6 text-error-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent (1h)</p>
              <p className="text-3xl font-bold text-warning-700 mt-1">
                {recentViolations}
              </p>
              <p className="text-sm text-warning-600 mt-1">Active violations</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-warning-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-warning-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">High Severity</p>
              <p className="text-3xl font-bold text-orange-700 mt-1">
                {highSeverityViolations}
              </p>
              <p className="text-sm text-orange-600 mt-1">Security threats</p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
              <ShieldCheckIcon className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-3xl font-bold text-primary-700 mt-1">
                {tierBreakdown
                  .reduce((sum, tier) => sum + tier.activeUsers, 0)
                  .toLocaleString()}
              </p>
              <p className="text-sm text-primary-600 mt-1">
                All subscription tiers
              </p>
            </div>
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg">
              <UserGroupIcon className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Endpoint Usage Metrics */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          API Endpoint Usage
        </h3>

        <div className="space-y-4">
          {rateLimitMetrics.map((metric) => {
            const percentage = getUsagePercentage(
              metric.requestCount,
              metric.limit,
            );
            return (
              <div
                key={metric.endpoint}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {metric.endpoint}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {metric.weddingContext}
                    </p>
                  </div>
                  <div className="text-right">
                    <div
                      className={`text-lg font-bold ${getUsageTextColor(percentage)}`}
                    >
                      {metric.requestCount} / {metric.limit}
                    </div>
                    <div className="text-xs text-gray-500">
                      {metric.windowSize}
                    </div>
                  </div>
                </div>

                <div className="mb-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${getUsageColor(percentage)}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>{percentage.toFixed(1)}% used</span>
                    {metric.violationCount > 0 && (
                      <span className="text-error-600">
                        {metric.violationCount} violations
                        {metric.lastViolation && (
                          <span className="ml-1">
                            (last:{' '}
                            {new Date(
                              metric.lastViolation,
                            ).toLocaleTimeString()}
                            )
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Subscription Tier Analysis */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Subscription Tier Usage
          </h3>
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
          >
            <option value="all">All Tiers</option>
            <option value="free">Free</option>
            <option value="starter">Starter</option>
            <option value="professional">Professional</option>
            <option value="scale">Scale</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredTierData.map((tier) => (
            <div
              key={tier.tier}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <CreditCardIcon className="w-6 h-6 text-gray-400" />
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 capitalize">
                      {tier.tier}
                    </h4>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${tier.color}`}
                    >
                      {tier.activeUsers} active users
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">
                    {tier.requestsPerHour}/h
                  </div>
                  <div className="text-xs text-gray-500">
                    {tier.allowedRequests} limit
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Violation Rate:</span>
                  <span
                    className={`font-medium ${
                      tier.violationRate > 5
                        ? 'text-error-700'
                        : tier.violationRate > 2
                          ? 'text-warning-700'
                          : 'text-success-700'
                    }`}
                  >
                    {tier.violationRate.toFixed(1)}%
                  </span>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-600 font-medium mb-1">
                    Wedding Usage:
                  </div>
                  <div className="text-sm text-gray-700">
                    {tier.weddingSpecificUsage}
                  </div>
                </div>

                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getUsageColor((tier.requestsPerHour / tier.allowedRequests) * 100)}`}
                    style={{
                      width: `${Math.min((tier.requestsPerHour / tier.allowedRequests) * 100, 100)}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Wedding Endpoints */}
      {seasonMetrics.isPeakSeason && (
        <div className="bg-gradient-to-r from-purple-50 to-primary-50 rounded-xl border border-primary-200 p-6">
          <h3 className="text-lg font-semibold text-primary-900 mb-4">
            Peak Season - Top Wedding Endpoints
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {seasonMetrics.topEndpoints.map((endpoint, index) => (
              <div key={endpoint.endpoint} className="text-center">
                <div className="text-2xl font-bold text-primary-900">
                  {endpoint.usage}%
                </div>
                <div className="text-sm text-primary-700 truncate">
                  {endpoint.endpoint}
                </div>
                <div className="text-xs text-primary-600">of total traffic</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Violations */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Rate Limit Violations
          </h3>
        </div>

        <div className="divide-y divide-gray-200">
          {violationPatterns.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-8 h-8 text-success-600" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                No rate limit violations
              </h4>
              <p className="text-gray-600">
                All wedding platform APIs operating within limits.
              </p>
            </div>
          ) : (
            violationPatterns.map((violation) => (
              <div key={violation.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getSeverityColor(violation.severity)}`}
                    >
                      {violation.severity.toUpperCase()}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {violation.endpoint}
                        </h4>
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                          {violation.userTier}
                        </span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <span>{violation.sourceIp}</span>
                        <span>•</span>
                        <span>{violation.requestCount} requests</span>
                        <span>•</span>
                        <span>Blocked for {violation.blockDuration}</span>
                        <span>•</span>
                        <span>
                          {new Date(violation.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="p-2 bg-orange-50 rounded border border-orange-200">
                        <div className="text-xs text-orange-600 font-medium mb-1">
                          Wedding Data Context:
                        </div>
                        <div className="text-sm text-orange-700">
                          {violation.weddingDataAttempt}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
