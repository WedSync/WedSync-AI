'use client';

/**
 * Test Results Dashboard - QA Monitoring Interface
 * WS-342 Real-Time Wedding Collaboration - Team E QA & Documentation
 *
 * Comprehensive dashboard for monitoring test results, quality metrics, and system health
 * Real-time visualization of testing outcomes and quality assurance status
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Zap,
  Users,
  Globe,
  RefreshCw,
  Download,
  Filter,
  Search,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
} from 'lucide-react';

// Test result types and interfaces
interface TestResult {
  id: string;
  testSuite:
    | 'websocket'
    | 'wedding-simulation'
    | 'cross-platform'
    | 'security'
    | 'performance';
  testName: string;
  status: 'passed' | 'failed' | 'warning' | 'running' | 'pending';
  duration: number; // milliseconds
  startTime: Date;
  endTime?: Date;
  metrics: Record<string, number>;
  errors: string[];
  warnings: string[];
  coverage: number;
  environment: 'development' | 'staging' | 'production';
  weddingId?: string;
  userCount?: number;
}

interface QualityMetrics {
  overallScore: number;
  testCoverage: number;
  passRate: number;
  performanceScore: number;
  securityScore: number;
  reliabilityScore: number;
  trendsLastWeek: {
    testCoverage: number;
    passRate: number;
    performanceScore: number;
  };
}

interface TestResultsDashboardProps {
  refreshInterval?: number; // milliseconds
  autoRefresh?: boolean;
  showFilters?: boolean;
  initialTimeRange?: 'today' | 'week' | 'month';
  className?: string;
}

const TEST_SUITE_CONFIG = {
  websocket: {
    name: 'WebSocket Load Testing',
    icon: Activity,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  'wedding-simulation': {
    name: 'Wedding Day Simulation',
    icon: Users,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  'cross-platform': {
    name: 'Cross-Platform Integration',
    icon: Globe,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  security: {
    name: 'Security & Privacy',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  performance: {
    name: 'Performance Benchmarks',
    icon: Zap,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
} as const;

export function TestResultsDashboard({
  refreshInterval = 30000, // 30 seconds
  autoRefresh = true,
  showFilters = true,
  initialTimeRange = 'today',
  className,
}: TestResultsDashboardProps) {
  // State management
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [qualityMetrics, setQualityMetrics] = useState<QualityMetrics>({
    overallScore: 0,
    testCoverage: 0,
    passRate: 0,
    performanceScore: 0,
    securityScore: 0,
    reliabilityScore: 0,
    trendsLastWeek: { testCoverage: 0, passRate: 0, performanceScore: 0 },
  });

  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [selectedTimeRange, setSelectedTimeRange] = useState(initialTimeRange);
  const [selectedSuites, setSelectedSuites] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Fetch test results and metrics
  const fetchTestResults = async () => {
    try {
      setIsLoading(true);

      const [resultsResponse, metricsResponse] = await Promise.all([
        fetch(
          `/api/qa/test-results?timeRange=${selectedTimeRange}&suites=${selectedSuites.join(',')}&search=${searchTerm}`,
        ),
        fetch('/api/qa/quality-metrics'),
      ]);

      if (resultsResponse.ok && metricsResponse.ok) {
        const results = await resultsResponse.json();
        const metrics = await metricsResponse.json();

        setTestResults(results.testResults);
        setQualityMetrics(metrics);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch test results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-refresh functionality
  useEffect(() => {
    fetchTestResults();

    if (autoRefresh) {
      const interval = setInterval(fetchTestResults, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [
    selectedTimeRange,
    selectedSuites,
    searchTerm,
    autoRefresh,
    refreshInterval,
  ]);

  // Filter and process test results
  const processedResults = useMemo(() => {
    return testResults.filter((result) => {
      const matchesSearch =
        !searchTerm ||
        result.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        result.testSuite.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesSuite =
        selectedSuites.length === 0 ||
        selectedSuites.includes(result.testSuite);

      return matchesSearch && matchesSuite;
    });
  }, [testResults, searchTerm, selectedSuites]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const total = processedResults.length;
    const passed = processedResults.filter((r) => r.status === 'passed').length;
    const failed = processedResults.filter((r) => r.status === 'failed').length;
    const warnings = processedResults.filter(
      (r) => r.status === 'warning',
    ).length;
    const running = processedResults.filter(
      (r) => r.status === 'running',
    ).length;

    const averageDuration =
      total > 0
        ? processedResults.reduce((sum, r) => sum + r.duration, 0) / total
        : 0;

    const averageCoverage =
      total > 0
        ? processedResults.reduce((sum, r) => sum + r.coverage, 0) / total
        : 0;

    return {
      total,
      passed,
      failed,
      warnings,
      running,
      averageDuration,
      averageCoverage,
    };
  }, [processedResults]);

  // Export test results
  const exportResults = async (format: 'json' | 'csv') => {
    try {
      const response = await fetch(
        `/api/qa/export-results?format=${format}&timeRange=${selectedTimeRange}`,
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `test-results-${new Date().toISOString().split('T')[0]}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export results:', error);
    }
  };

  // Get status color and icon
  const getStatusDisplay = (status: TestResult['status']) => {
    switch (status) {
      case 'passed':
        return {
          icon: CheckCircle,
          color: 'text-success-600',
          bgColor: 'bg-success-50',
        };
      case 'failed':
        return {
          icon: XCircle,
          color: 'text-error-600',
          bgColor: 'bg-error-50',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: 'text-warning-600',
          bgColor: 'bg-warning-50',
        };
      case 'running':
        return {
          icon: RefreshCw,
          color: 'text-primary-600',
          bgColor: 'bg-primary-50',
        };
      case 'pending':
        return { icon: Clock, color: 'text-gray-600', bgColor: 'bg-gray-50' };
    }
  };

  // Render quality metrics overview
  const renderQualityMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Overall Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">
              Overall Quality Score
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {qualityMetrics.overallScore.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">/10.0</span>
            </div>
          </div>
          <div className="p-3 bg-primary-50 rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <TrendingUp className="w-4 h-4 text-success-600 mr-1" />
          <span className="text-success-600">+0.3 from last week</span>
        </div>
      </motion.div>

      {/* Test Coverage */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Test Coverage</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {qualityMetrics.testCoverage.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <PieChart className="w-6 h-6 text-green-600" />
          </div>
        </div>
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-green-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${qualityMetrics.testCoverage}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </div>
      </motion.div>

      {/* Pass Rate */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Pass Rate</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {qualityMetrics.passRate.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <CheckCircle className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          <span className="text-gray-600">
            {summaryStats.passed}/{summaryStats.total} tests passed
          </span>
        </div>
      </motion.div>

      {/* Security Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Security Score</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {qualityMetrics.securityScore.toFixed(1)}
              </span>
              <span className="text-sm text-gray-500">/10.0</span>
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <Shield className="w-6 h-6 text-red-600" />
          </div>
        </div>
        <div className="mt-4 flex items-center text-sm">
          {qualityMetrics.securityScore >= 8 ? (
            <>
              <CheckCircle className="w-4 h-4 text-success-600 mr-1" />
              <span className="text-success-600">Excellent security</span>
            </>
          ) : (
            <>
              <AlertTriangle className="w-4 h-4 text-warning-600 mr-1" />
              <span className="text-warning-600">Needs attention</span>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );

  // Render test results grid/list
  const renderTestResults = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Test Results</h2>
          <p className="text-sm text-gray-600">
            {summaryStats.total} tests • Last updated{' '}
            {lastUpdate.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportResults('json')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-1 inline" />
            Export JSON
          </button>
          <button
            onClick={() => exportResults('csv')}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4 mr-1 inline" />
            Export CSV
          </button>
          <button
            onClick={fetchTestResults}
            className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw
              className={cn('w-4 h-4 mr-1 inline', isLoading && 'animate-spin')}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Results */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading test results...</span>
          </div>
        ) : processedResults.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No test results found
            </h3>
            <p className="text-gray-600">
              {searchTerm || selectedSuites.length > 0
                ? 'Try adjusting your filters or search terms'
                : 'Test results will appear here once tests are run'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {processedResults.map((result, index) => (
              <motion.div
                key={result.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Status Icon */}
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        getStatusDisplay(result.status).bgColor,
                      )}
                    >
                      {React.createElement(
                        getStatusDisplay(result.status).icon,
                        {
                          className: cn(
                            'w-5 h-5',
                            getStatusDisplay(result.status).color,
                          ),
                        },
                      )}
                    </div>

                    {/* Test Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-gray-900">
                          {result.testName}
                        </h3>
                        <span
                          className={cn(
                            'px-2 py-1 rounded-full text-xs font-medium',
                            TEST_SUITE_CONFIG[result.testSuite].bgColor,
                            TEST_SUITE_CONFIG[result.testSuite].color,
                          )}
                        >
                          {TEST_SUITE_CONFIG[result.testSuite].name}
                        </span>
                      </div>

                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <span>
                          Duration: {(result.duration / 1000).toFixed(2)}s
                        </span>
                        <span>Coverage: {result.coverage.toFixed(1)}%</span>
                        <span>Environment: {result.environment}</span>
                        {result.userCount && (
                          <span>Users: {result.userCount}</span>
                        )}
                      </div>

                      {result.errors.length > 0 && (
                        <div className="mt-2 p-2 bg-error-50 rounded border border-error-200">
                          <p className="text-sm text-error-800 font-medium">
                            Errors:
                          </p>
                          <ul className="text-sm text-error-700 mt-1">
                            {result.errors.slice(0, 3).map((error, i) => (
                              <li key={i} className="truncate">
                                • {error}
                              </li>
                            ))}
                            {result.errors.length > 3 && (
                              <li>
                                • And {result.errors.length - 3} more errors
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-right">
                    <p className="text-sm text-gray-600">
                      {result.startTime.toLocaleString()}
                    </p>
                    {result.endTime && (
                      <p className="text-xs text-gray-500">
                        Completed {result.endTime.toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn('test-results-dashboard space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Test Results Dashboard
          </h1>
          <p className="text-gray-600">
            Monitor quality assurance metrics and test outcomes in real-time
          </p>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3">
            {/* Time Range Filter */}
            <select
              value={selectedTimeRange}
              onChange={(e) =>
                setSelectedTimeRange(e.target.value as typeof selectedTimeRange)
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>

            {/* Suite Filter */}
            <select
              multiple
              value={selectedSuites}
              onChange={(e) =>
                setSelectedSuites(
                  Array.from(
                    e.target.selectedOptions,
                    (option) => option.value,
                  ),
                )
              }
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Suites</option>
              {Object.entries(TEST_SUITE_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>
                  {config.name}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Quality Metrics Overview */}
      {renderQualityMetrics()}

      {/* Test Results */}
      {renderTestResults()}
    </div>
  );
}
