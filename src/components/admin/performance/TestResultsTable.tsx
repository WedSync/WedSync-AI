'use client';

import React, { useState, useMemo } from 'react';
import {
  ChevronUp,
  ChevronDown,
  Filter,
  Download,
  Calendar,
  Search,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  Target,
  Timer,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import {
  TestResultsTableProps,
  PerformanceTestRun,
  TestType,
  TestStatus,
} from '@/types/performance-testing';

type SortField =
  | 'startTime'
  | 'name'
  | 'type'
  | 'duration'
  | 'errorRate'
  | 'responseTime'
  | 'throughput'
  | 'passed';
type SortDirection = 'asc' | 'desc';

const testTypeIcons = {
  load: Users,
  stress: Zap,
  spike: Target,
  endurance: Timer,
};

const testTypeColors = {
  load: 'text-blue-600 bg-blue-50 border-blue-200',
  stress: 'text-warning-600 bg-warning-50 border-warning-200',
  spike: 'text-error-600 bg-error-50 border-error-200',
  endurance: 'text-primary-600 bg-primary-50 border-primary-200',
};

export const TestResultsTable: React.FC<TestResultsTableProps> = ({
  testResults,
  pagination,
  filters,
  onFiltersChange,
  onPageChange,
  onExport,
  loading = false,
}) => {
  const [sortField, setSortField] = useState<SortField>('startTime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Local filter states
  const [localFilters, setLocalFilters] = useState(filters);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedResults = useMemo(() => {
    return [...testResults].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'startTime':
          aValue = new Date(a.startTime);
          bValue = new Date(b.startTime);
          break;
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'type':
          aValue = a.type;
          bValue = b.type;
          break;
        case 'duration':
          aValue = a.duration;
          bValue = b.duration;
          break;
        case 'errorRate':
          aValue = a.results.errorRate;
          bValue = b.results.errorRate;
          break;
        case 'responseTime':
          aValue = a.results.responseTime.p95;
          bValue = b.results.responseTime.p95;
          break;
        case 'throughput':
          aValue = a.results.throughput.average;
          bValue = b.results.throughput.average;
          break;
        case 'passed':
          aValue = a.passed;
          bValue = b.passed;
          break;
        default:
          aValue = a.startTime;
          bValue = b.startTime;
      }

      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
  }, [testResults, sortField, sortDirection]);

  const filteredResults = useMemo(() => {
    return sortedResults.filter((result) => {
      if (
        searchQuery &&
        !result.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [sortedResults, searchQuery]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setShowFilters(false);
  };

  const resetFilters = () => {
    const emptyFilters = {
      type: undefined,
      environment: undefined,
      status: undefined,
      dateRange: undefined,
      passed: undefined,
      tags: undefined,
    };
    setLocalFilters(emptyFilters);
    onFiltersChange(emptyFilters);
    setSearchQuery('');
  };

  const getStatusBadge = (result: PerformanceTestRun) => {
    if (result.passed) {
      return (
        <div className="inline-flex items-center px-2 py-1 bg-success-50 text-success-700 text-xs font-medium rounded-full border border-success-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          Passed
        </div>
      );
    } else {
      return (
        <div className="inline-flex items-center px-2 py-1 bg-error-50 text-error-700 text-xs font-medium rounded-full border border-error-200">
          <XCircle className="w-3 h-3 mr-1" />
          Failed
        </div>
      );
    }
  };

  const getThresholdBadge = (breaches: number) => {
    if (breaches === 0) return null;

    return (
      <div className="inline-flex items-center px-2 py-1 bg-warning-50 text-warning-700 text-xs font-medium rounded-full border border-warning-200">
        <AlertTriangle className="w-3 h-3 mr-1" />
        {breaches}
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xs">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Test Results
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {pagination.total} total results • Page {pagination.page} of{' '}
              {Math.ceil(pagination.total / pagination.pageSize)}
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search tests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center px-3 py-2 border rounded-lg text-sm font-medium transition-colors duration-200 ${
                showFilters
                  ? 'border-primary-300 bg-primary-50 text-primary-700'
                  : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onExport('csv')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <Download className="w-4 h-4 mr-1" />
                CSV
              </button>
              <button
                onClick={() => onExport('json')}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200"
              >
                <Download className="w-4 h-4 mr-1" />
                JSON
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Test Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Test Type
                </label>
                <select
                  value={localFilters.type || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      type: (e.target.value as TestType) || undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">All Types</option>
                  <option value="load">Load</option>
                  <option value="stress">Stress</option>
                  <option value="spike">Spike</option>
                  <option value="endurance">Endurance</option>
                </select>
              </div>

              {/* Environment Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Environment
                </label>
                <select
                  value={localFilters.environment || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      environment: e.target.value || undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">All Environments</option>
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Result
                </label>
                <select
                  value={localFilters.passed?.toString() || ''}
                  onChange={(e) =>
                    setLocalFilters({
                      ...localFilters,
                      passed: e.target.value
                        ? e.target.value === 'true'
                        : undefined,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
                >
                  <option value="">All Results</option>
                  <option value="true">Passed</option>
                  <option value="false">Failed</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="flex items-end space-x-2">
                <button
                  onClick={applyFilters}
                  className="flex-1 px-3 py-2 bg-primary-600 text-white text-sm font-medium rounded-md hover:bg-primary-700 transition-colors duration-200"
                >
                  Apply
                </button>
                <button
                  onClick={resetFilters}
                  className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors duration-200"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center space-x-1">
                  <span>Test Name</span>
                  {getSortIcon('name')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center space-x-1">
                  <span>Type</span>
                  {getSortIcon('type')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('startTime')}
              >
                <div className="flex items-center space-x-1">
                  <span>Started</span>
                  {getSortIcon('startTime')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('duration')}
              >
                <div className="flex items-center space-x-1">
                  <span>Duration</span>
                  {getSortIcon('duration')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('responseTime')}
              >
                <div className="flex items-center space-x-1">
                  <span>P95 Response</span>
                  {getSortIcon('responseTime')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('errorRate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Error Rate</span>
                  {getSortIcon('errorRate')}
                </div>
              </th>
              <th
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('throughput')}
              >
                <div className="flex items-center space-x-1">
                  <span>Throughput</span>
                  {getSortIcon('throughput')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mr-2"></div>
                    Loading test results...
                  </div>
                </td>
              </tr>
            ) : filteredResults.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-12 text-center text-gray-500"
                >
                  No test results found
                </td>
              </tr>
            ) : (
              filteredResults.map((result) => {
                const TypeIcon = testTypeIcons[result.type];

                return (
                  <tr
                    key={result.id}
                    className="hover:bg-gray-50 transition-colors duration-150"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <TypeIcon className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {result.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {result.environment}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${testTypeColors[result.type]}`}
                      >
                        {result.type.toUpperCase()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(result.startTime)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {formatDuration(result.duration)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result.results.responseTime.p95.toFixed(0)}ms
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={
                          result.results.errorRate > 5
                            ? 'text-error-600 font-semibold'
                            : 'text-gray-900'
                        }
                      >
                        {result.results.errorRate.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result.results.throughput.average.toFixed(1)} RPS
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {getStatusBadge(result)}
                        {getThresholdBadge(result.thresholdBreaches.length)}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filteredResults.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing{' '}
              <span className="font-medium">
                {Math.min(
                  (pagination.page - 1) * pagination.pageSize + 1,
                  pagination.total,
                )}
              </span>{' '}
              to{' '}
              <span className="font-medium">
                {Math.min(
                  pagination.page * pagination.pageSize,
                  pagination.total,
                )}
              </span>{' '}
              of <span className="font-medium">{pagination.total}</span> results
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Previous
              </button>

              <span className="text-sm text-gray-700">
                Page {pagination.page} of{' '}
                {Math.ceil(pagination.total / pagination.pageSize)}
              </span>

              <button
                onClick={() => onPageChange(pagination.page + 1)}
                disabled={
                  pagination.page >=
                  Math.ceil(pagination.total / pagination.pageSize)
                }
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
