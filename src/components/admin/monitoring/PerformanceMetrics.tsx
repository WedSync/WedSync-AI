'use client';

import { useState, useEffect } from 'react';
import {
  BoltIcon,
  ClockIcon,
  ChartBarIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  GlobeAltIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';

interface PerformanceMetricsProps {
  userId: string;
  userProfile: any;
  isRefreshing: boolean;
  lastRefresh: Date;
}

interface WebVital {
  name: string;
  value: number;
  unit: string;
  threshold: {
    good: number;
    needsImprovement: number;
  };
  status: 'good' | 'needs-improvement' | 'poor';
  trend: 'up' | 'down' | 'stable';
  weddingImpact: string;
}

interface PagePerformance {
  page: string;
  avgLoadTime: number;
  p95LoadTime: number;
  bounceRate: number;
  sessions: number;
  weddingStage: string;
  criticalPath: boolean;
}

interface ApiPerformance {
  endpoint: string;
  avgResponseTime: number;
  p95ResponseTime: number;
  errorRate: number;
  requestsPerMinute: number;
  weddingFunction: string;
}

export function PerformanceMetrics({
  userId,
  userProfile,
  isRefreshing,
  lastRefresh,
}: PerformanceMetricsProps) {
  const [webVitals, setWebVitals] = useState<WebVital[]>([]);
  const [pagePerformance, setPagePerformance] = useState<PagePerformance[]>([]);
  const [apiPerformance, setApiPerformance] = useState<ApiPerformance[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');
  const [selectedDevice, setSelectedDevice] = useState<string>('all');

  useEffect(() => {
    fetchPerformanceData();
  }, [lastRefresh, selectedTimeframe, selectedDevice]);

  const fetchPerformanceData = async () => {
    // Mock performance data - In production, integrate with Real User Monitoring
    const mockWebVitals: WebVital[] = [
      {
        name: 'Largest Contentful Paint (LCP)',
        value: 1.8,
        unit: 's',
        threshold: { good: 2.5, needsImprovement: 4.0 },
        status: 'good',
        trend: 'down',
        weddingImpact:
          'How quickly couples see venue photos and supplier galleries',
      },
      {
        name: 'First Input Delay (FID)',
        value: 45,
        unit: 'ms',
        threshold: { good: 100, needsImprovement: 300 },
        status: 'good',
        trend: 'stable',
        weddingImpact:
          'Responsiveness when couples interact with booking forms',
      },
      {
        name: 'Cumulative Layout Shift (CLS)',
        value: 0.08,
        unit: '',
        threshold: { good: 0.1, needsImprovement: 0.25 },
        status: 'good',
        trend: 'up',
        weddingImpact: 'Visual stability during photo gallery browsing',
      },
      {
        name: 'First Contentful Paint (FCP)',
        value: 1.2,
        unit: 's',
        threshold: { good: 1.8, needsImprovement: 3.0 },
        status: 'good',
        trend: 'down',
        weddingImpact: 'Initial page load for wedding planning sessions',
      },
      {
        name: 'Time to Interactive (TTI)',
        value: 2.8,
        unit: 's',
        threshold: { good: 3.8, needsImprovement: 7.3 },
        status: 'good',
        trend: 'stable',
        weddingImpact: 'When couples can start using booking forms and filters',
      },
      {
        name: 'Total Blocking Time (TBT)',
        value: 180,
        unit: 'ms',
        threshold: { good: 200, needsImprovement: 600 },
        status: 'good',
        trend: 'up',
        weddingImpact: 'Smooth interaction during vendor search and comparison',
      },
    ];

    const mockPagePerformance: PagePerformance[] = [
      {
        page: '/vendors/photography',
        avgLoadTime: 1.4,
        p95LoadTime: 2.8,
        bounceRate: 12.3,
        sessions: 1247,
        weddingStage: 'Discovery',
        criticalPath: true,
      },
      {
        page: '/booking/payment',
        avgLoadTime: 2.1,
        p95LoadTime: 4.2,
        bounceRate: 8.7,
        sessions: 456,
        weddingStage: 'Booking',
        criticalPath: true,
      },
      {
        page: '/dashboard/couples',
        avgLoadTime: 1.8,
        p95LoadTime: 3.1,
        bounceRate: 5.2,
        sessions: 892,
        weddingStage: 'Planning',
        criticalPath: false,
      },
      {
        page: '/venues/gallery',
        avgLoadTime: 3.2,
        p95LoadTime: 6.4,
        bounceRate: 15.8,
        sessions: 2134,
        weddingStage: 'Discovery',
        criticalPath: true,
      },
      {
        page: '/suppliers/reviews',
        avgLoadTime: 1.9,
        p95LoadTime: 3.7,
        bounceRate: 9.4,
        sessions: 743,
        weddingStage: 'Evaluation',
        criticalPath: false,
      },
    ];

    const mockApiPerformance: ApiPerformance[] = [
      {
        endpoint: '/api/venues/search',
        avgResponseTime: 240,
        p95ResponseTime: 480,
        errorRate: 0.8,
        requestsPerMinute: 145,
        weddingFunction: 'Venue Discovery',
      },
      {
        endpoint: '/api/booking/create',
        avgResponseTime: 420,
        p95ResponseTime: 850,
        errorRate: 2.1,
        requestsPerMinute: 32,
        weddingFunction: 'Booking Creation',
      },
      {
        endpoint: '/api/suppliers/filter',
        avgResponseTime: 180,
        p95ResponseTime: 320,
        errorRate: 0.3,
        requestsPerMinute: 89,
        weddingFunction: 'Supplier Filtering',
      },
      {
        endpoint: '/api/payments/process',
        avgResponseTime: 1200,
        p95ResponseTime: 2400,
        errorRate: 1.5,
        requestsPerMinute: 28,
        weddingFunction: 'Payment Processing',
      },
    ];

    setWebVitals(mockWebVitals);
    setPagePerformance(mockPagePerformance);
    setApiPerformance(mockApiPerformance);
  };

  const getVitalStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-success-600 bg-success-50 border-success-200';
      case 'needs-improvement':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'poor':
        return 'text-error-600 bg-error-50 border-error-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-error-500" />;
      case 'down':
        return <ArrowTrendingDownIcon className="w-4 h-4 text-success-500" />;
      default:
        return (
          <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>
        );
    }
  };

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value <= threshold) return 'text-success-600';
    if (value <= threshold * 1.5) return 'text-warning-600';
    return 'text-error-600';
  };

  const avgLCP = webVitals.find((v) => v.name.includes('LCP'))?.value || 0;
  const avgFID = webVitals.find((v) => v.name.includes('FID'))?.value || 0;
  const avgCLS = webVitals.find((v) => v.name.includes('CLS'))?.value || 0;

  const overallScore = Math.round(
    (avgLCP <= 2.5 ? 100 : avgLCP <= 4.0 ? 70 : 40) * 0.25 +
      (avgFID <= 100 ? 100 : avgFID <= 300 ? 70 : 40) * 0.25 +
      (avgCLS <= 0.1 ? 100 : avgCLS <= 0.25 ? 70 : 40) * 0.25 +
      75 * 0.25, // Base score for other metrics
  );

  return (
    <div className="space-y-8">
      {/* Performance Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-primary-50 rounded-xl border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Performance Overview
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Core Web Vitals and user experience metrics
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-700">
              {overallScore}
            </div>
            <div className="text-sm text-blue-600">Performance Score</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ComputerDesktopIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-700">2.1s</div>
            <div className="text-sm text-gray-600">Avg Load Time</div>
            <div className="text-xs text-blue-600 mt-1">Desktop</div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <DevicePhoneMobileIcon className="w-8 h-8 text-primary-600" />
            </div>
            <div className="text-2xl font-bold text-primary-700">3.4s</div>
            <div className="text-sm text-gray-600">Avg Load Time</div>
            <div className="text-xs text-primary-600 mt-1">
              Mobile (70% traffic)
            </div>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <GlobeAltIcon className="w-8 h-8 text-success-600" />
            </div>
            <div className="text-2xl font-bold text-success-700">98.5%</div>
            <div className="text-sm text-gray-600">Availability</div>
            <div className="text-xs text-success-600 mt-1">
              Wedding season ready
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Time Period:
            </label>
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mr-2">
              Device:
            </label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
            >
              <option value="all">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="tablet">Tablet</option>
            </select>
          </div>
        </div>
      </div>

      {/* Core Web Vitals */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          Core Web Vitals
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {webVitals.map((vital) => (
            <div
              key={vital.name}
              className="border border-gray-200 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <BoltIcon className="w-5 h-5 text-gray-400" />
                  <h4 className="text-sm font-medium text-gray-900">
                    {vital.name.split(' (')[0]}
                  </h4>
                </div>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(vital.trend)}
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getVitalStatusColor(vital.status)}`}
                  >
                    {vital.status === 'needs-improvement'
                      ? 'Needs Work'
                      : vital.status}
                  </span>
                </div>
              </div>

              <div className="mb-3">
                <div className="text-2xl font-bold text-gray-900">
                  {vital.value}
                  {vital.unit}
                </div>
                <div className="text-xs text-gray-500">
                  Good: &lt;{vital.threshold.good}
                  {vital.unit} | Poor: &gt;{vital.threshold.needsImprovement}
                  {vital.unit}
                </div>
              </div>

              <div className="p-3 bg-primary-50 rounded border border-primary-200">
                <div className="text-xs text-primary-600 font-medium mb-1">
                  Wedding Impact:
                </div>
                <div className="text-sm text-primary-700">
                  {vital.weddingImpact}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Page Performance */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Page Performance
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Load times and user engagement by page
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Load Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  95th Percentile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Bounce Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sessions
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Wedding Stage
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {pagePerformance.map((page) => (
                <tr key={page.page} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <code className="text-sm font-mono text-gray-900">
                        {page.page}
                      </code>
                      {page.criticalPath && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-error-100 text-error-700">
                          Critical
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${getPerformanceColor(page.avgLoadTime, 2.0)}`}
                    >
                      {page.avgLoadTime.toFixed(1)}s
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm ${getPerformanceColor(page.p95LoadTime, 4.0)}`}
                    >
                      {page.p95LoadTime.toFixed(1)}s
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm ${getPerformanceColor(page.bounceRate, 20)}`}
                    >
                      {page.bounceRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {page.sessions.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {page.weddingStage}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* API Performance */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            API Performance
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Backend response times and error rates
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Endpoint
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Response
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  95th Percentile
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requests/min
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Function
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {apiPerformance.map((api) => (
                <tr key={api.endpoint} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <code className="text-sm font-mono text-gray-900">
                      {api.endpoint}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium ${getPerformanceColor(api.avgResponseTime, 500)}`}
                    >
                      {api.avgResponseTime}ms
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm ${getPerformanceColor(api.p95ResponseTime, 1000)}`}
                    >
                      {api.p95ResponseTime}ms
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`text-sm ${getPerformanceColor(api.errorRate, 5)}`}
                    >
                      {api.errorRate.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {api.requestsPerMinute}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      {api.weddingFunction}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Recommendations */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <ChartBarIcon className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-amber-900 mb-2">
              Performance Recommendations
            </h3>
            <ul className="space-y-2 text-sm text-amber-800">
              <li>
                • Optimize venue gallery images - consider WebP format and lazy
                loading
              </li>
              <li>
                • Implement service worker caching for wedding planning
                dashboards
              </li>
              <li>
                • Add CDN for wedding photo galleries to improve global load
                times
              </li>
              <li>
                • Consider pagination for supplier search results (&gt;50 items)
              </li>
              <li>• Optimize database queries for payment processing API</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
