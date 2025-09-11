'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RefreshCw,
  Activity,
  TrendingUp,
  AlertTriangle,
  Play,
  Clock,
  Database,
  Zap,
  Target,
  CheckCircle,
} from 'lucide-react';
import {
  PerformanceTestDashboardProps,
  PerformanceTestRun,
  RunningTest,
  TestConfiguration,
  TestResultFilters,
  PaginationConfig,
  MetricType,
} from '@/types/performance-testing';
import { TestExecutionPanel } from './TestExecutionPanel';
import { PerformanceMetricsChart } from './PerformanceMetricsChart';
import { TestResultsTable } from './TestResultsTable';
import { TestProgressIndicator } from './TestProgressIndicator';

export const PerformanceTestDashboard: React.FC<
  PerformanceTestDashboardProps
> = ({ testRuns, activeTests, realTimeUpdates, onRefresh }) => {
  // State management
  const [selectedMetric, setSelectedMetric] =
    useState<MetricType>('response_time');
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [filters, setFilters] = useState<TestResultFilters>({});
  const [pagination, setPagination] = useState<PaginationConfig>({
    page: 1,
    pageSize: 20,
    total: testRuns.length,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Mock available test configurations
  const availableTestConfigs: TestConfiguration[] = [
    {
      id: 'wedding-peak-load',
      name: 'Wedding Season Peak Load',
      type: 'load',
      targetUrl: 'https://api.wedsync.com',
      duration: 600,
      userCount: 100,
      rampUpTime: 120,
      thresholds: {
        responseTime: { p95: 2000, p99: 5000 },
        errorRate: 2,
        throughput: 50,
      },
      tags: ['wedding', 'peak-season'],
      environment: 'production',
    },
    {
      id: 'vendor-portal-stress',
      name: 'Vendor Portal Stress Test',
      type: 'stress',
      targetUrl: 'https://vendors.wedsync.com',
      duration: 900,
      userCount: 300,
      rampUpTime: 180,
      thresholds: {
        responseTime: { p95: 3000, p99: 8000 },
        errorRate: 5,
        throughput: 30,
      },
      tags: ['vendor', 'portal'],
      environment: 'staging',
    },
    {
      id: 'guest-rsvp-spike',
      name: 'Guest RSVP Deadline Spike',
      type: 'spike',
      targetUrl: 'https://rsvp.wedsync.com',
      duration: 300,
      userCount: 500,
      rampUpTime: 60,
      thresholds: {
        responseTime: { p95: 1500, p99: 3000 },
        errorRate: 3,
        throughput: 100,
      },
      tags: ['guest', 'rsvp'],
      environment: 'production',
    },
    {
      id: 'platform-endurance',
      name: 'Platform Endurance Test',
      type: 'endurance',
      targetUrl: 'https://app.wedsync.com',
      duration: 3600,
      userCount: 150,
      rampUpTime: 300,
      thresholds: {
        responseTime: { p95: 2500, p99: 6000 },
        errorRate: 3,
        throughput: 40,
      },
      tags: ['platform', 'endurance'],
      environment: 'staging',
    },
  ];

  // Calculate dashboard stats
  const dashboardStats = useMemo(() => {
    const recentTests = testRuns.slice(-10);
    const totalTests = testRuns.length;
    const passedTests = testRuns.filter((test) => test.passed).length;
    const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    const totalBreaches = testRuns.reduce(
      (sum, test) => sum + test.thresholdBreaches.length,
      0,
    );

    const avgResponseTime =
      recentTests.length > 0
        ? recentTests.reduce(
            (sum, test) => sum + test.results.responseTime.p95,
            0,
          ) / recentTests.length
        : 0;

    const avgThroughput =
      recentTests.length > 0
        ? recentTests.reduce(
            (sum, test) => sum + test.results.throughput.average,
            0,
          ) / recentTests.length
        : 0;

    return {
      totalTests,
      passRate,
      totalBreaches,
      avgResponseTime,
      avgThroughput,
      runningTests: activeTests.length,
    };
  }, [testRuns, activeTests]);

  // Handle refresh with loading state
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await onRefresh();
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to refresh:', error);
    } finally {
      setIsLoading(false);
    }
  }, [onRefresh]);

  // Auto refresh when real-time updates are enabled
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      handleRefresh();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [realTimeUpdates, handleRefresh]);

  // Mock test execution handlers
  const handleTestTrigger = async (
    config: TestConfiguration,
  ): Promise<void> => {
    console.log('Triggering test:', config);
    // In a real implementation, this would call the API to start the test
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate API call
    await handleRefresh();
  };

  const handleTestStop = async (testId: string): Promise<void> => {
    console.log('Stopping test:', testId);
    // In a real implementation, this would call the API to stop the test
    await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call
    await handleRefresh();
  };

  const handleExport = (format: 'csv' | 'json') => {
    console.log('Exporting data as:', format);
    // In a real implementation, this would generate and download the file
  };

  const filteredTestRuns = useMemo(() => {
    return testRuns.filter((run) => {
      if (filters.type && run.type !== filters.type) return false;
      if (filters.environment && run.environment !== filters.environment)
        return false;
      if (filters.passed !== undefined && run.passed !== filters.passed)
        return false;
      if (filters.dateRange) {
        const runDate = new Date(run.startTime);
        const startDate = new Date(filters.dateRange.start);
        const endDate = new Date(filters.dateRange.end);
        if (runDate < startDate || runDate > endDate) return false;
      }
      return true;
    });
  }, [testRuns, filters]);

  const paginatedResults = useMemo(() => {
    const start = (pagination.page - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredTestRuns.slice(start, end);
  }, [filteredTestRuns, pagination]);

  // Update pagination total when filtered results change
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      total: filteredTestRuns.length,
      page: 1, // Reset to first page when filters change
    }));
  }, [filteredTestRuns]);

  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, page }));
  };

  const getTimeRangeLabel = (range: string): string => {
    switch (range) {
      case '1d':
        return 'Last 24 hours';
      case '7d':
        return 'Last 7 days';
      case '30d':
        return 'Last 30 days';
      case '90d':
        return 'Last 3 months';
      default:
        return 'Last 7 days';
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Performance Testing Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Monitor and execute performance tests for WedSync platform
              reliability during peak wedding seasons
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {realTimeUpdates && (
              <div className="flex items-center text-sm text-success-600">
                <div className="w-2 h-2 bg-success-500 rounded-full mr-2 animate-pulse"></div>
                Live Updates
              </div>
            )}

            <div className="text-xs text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>

            <button
              onClick={handleRefresh}
              disabled={isLoading}
              className="inline-flex items-center px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors duration-200"
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <Play className="w-5 h-5 text-blue-600" />
              <div className="ml-3">
                <div className="text-xs text-blue-600 font-medium">
                  Running Tests
                </div>
                <div className="text-lg font-bold text-blue-900">
                  {dashboardStats.runningTests}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex items-center">
              <Database className="w-5 h-5 text-gray-600" />
              <div className="ml-3">
                <div className="text-xs text-gray-600 font-medium">
                  Total Tests
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {dashboardStats.totalTests}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-success-50 rounded-lg p-4 border border-success-200">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-success-600" />
              <div className="ml-3">
                <div className="text-xs text-success-600 font-medium">
                  Pass Rate
                </div>
                <div className="text-lg font-bold text-success-900">
                  {dashboardStats.passRate.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          <div className="bg-warning-50 rounded-lg p-4 border border-warning-200">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-warning-600" />
              <div className="ml-3">
                <div className="text-xs text-warning-600 font-medium">
                  Breaches
                </div>
                <div className="text-lg font-bold text-warning-900">
                  {dashboardStats.totalBreaches}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-50 rounded-lg p-4 border border-primary-200">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-primary-600" />
              <div className="ml-3">
                <div className="text-xs text-primary-600 font-medium">
                  Avg P95
                </div>
                <div className="text-lg font-bold text-primary-900">
                  {dashboardStats.avgResponseTime.toFixed(0)}ms
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <div className="ml-3">
                <div className="text-xs text-purple-600 font-medium">
                  Avg RPS
                </div>
                <div className="text-lg font-bold text-purple-900">
                  {dashboardStats.avgThroughput.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Test Execution Panel */}
      <TestExecutionPanel
        availableTests={availableTestConfigs}
        runningTests={activeTests}
        onTestTrigger={handleTestTrigger}
        onTestStop={handleTestStop}
        loading={isLoading}
      />

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Performance Metrics
            </h3>
            <div className="flex items-center space-x-2">
              <select
                value={selectedMetric}
                onChange={(e) =>
                  setSelectedMetric(e.target.value as MetricType)
                }
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="response_time">Response Time</option>
                <option value="throughput">Throughput</option>
                <option value="error_rate">Error Rate</option>
                <option value="concurrent_users">Concurrent Users</option>
              </select>

              <select
                value={selectedTimeRange}
                onChange={(e) => setSelectedTimeRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 3 months</option>
              </select>
            </div>
          </div>

          <PerformanceMetricsChart
            testResults={testRuns}
            metricType={selectedMetric}
            timeRange={getTimeRangeLabel(selectedTimeRange)}
            showThresholds={true}
            height={350}
          />
        </div>

        {/* Running Tests Overview */}
        <div className="space-y-4">
          {activeTests.length > 0 ? (
            activeTests.map((test) => (
              <TestProgressIndicator
                key={test.id}
                runningTest={test}
                showMetrics={true}
                compact={false}
              />
            ))
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
              <div className="text-center py-12">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Running Tests
                </h3>
                <p className="text-gray-500 mb-4">
                  Start a performance test to monitor real-time metrics
                </p>
                <div className="text-sm text-gray-400">
                  Use the Test Execution Panel above to start a new test
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Results Table */}
      <TestResultsTable
        testResults={paginatedResults}
        pagination={pagination}
        filters={filters}
        onFiltersChange={setFilters}
        onPageChange={handlePageChange}
        onExport={handleExport}
        loading={isLoading}
      />
    </div>
  );
};
