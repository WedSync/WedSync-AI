'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  format,
  parseISO,
  isWithinInterval,
  subDays,
  subHours,
} from 'date-fns';

// Types for audit investigation
interface AuditEvent {
  id: string;
  timestamp: string;
  userId?: string;
  userEmail?: string;
  action: string;
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: 'web' | 'api' | 'mobile' | 'system';
  ipAddress: string;
  userAgent?: string;
  sessionId?: string;
  details: Record<string, any>;
  metadata?: {
    requestId?: string;
    correlationId?: string;
    duration?: number;
    location?: string;
  };
}

interface SearchFilters {
  query?: string;
  userId?: string;
  userEmail?: string;
  action?: string;
  resource?: string;
  outcome?: 'success' | 'failure' | 'warning' | '';
  severity?: 'low' | 'medium' | 'high' | 'critical' | '';
  source?: 'web' | 'api' | 'mobile' | 'system' | '';
  dateRange?: {
    start: Date;
    end: Date;
  };
  ipAddress?: string;
}

interface TimelineGroup {
  date: string;
  events: AuditEvent[];
}

interface ExportOptions {
  format: 'json' | 'csv' | 'excel';
  includeDetails: boolean;
  includeMetadata: boolean;
}

export function AuditInvestigationInterface() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AuditEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Predefined filter options
  const actionOptions = [
    'login',
    'logout',
    'create',
    'update',
    'delete',
    'view',
    'download',
    'upload',
    'permission_change',
    'password_change',
    'mfa_setup',
    'api_access',
    'data_export',
  ];

  const resourceOptions = [
    'user',
    'client',
    'guest',
    'vendor',
    'document',
    'photo',
    'message',
    'payment',
    'booking',
    'task',
    'timeline',
    'report',
    'system_setting',
  ];

  // Fetch audit events with filters
  const fetchEvents = async () => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...Object.fromEntries(
          Object.entries(filters)
            .map(([key, value]) => {
              if (key === 'dateRange' && value) {
                return [`${key}_start`, value.start.toISOString()];
              }
              return [key, value?.toString() || ''];
            })
            .filter(([, value]) => value !== ''),
        ),
      });

      if (filters.dateRange?.end) {
        queryParams.append(
          'dateRange_end',
          filters.dateRange.end.toISOString(),
        );
      }

      const response = await fetch(`/api/audit/events?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
        setTotalCount(data.totalCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch audit events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [currentPage, filters]);

  // Filter events based on current filters
  const applyFilters = useMemo(() => {
    let filtered = events;

    if (filters.query) {
      const query = filters.query.toLowerCase();
      filtered = filtered.filter(
        (event) =>
          event.action.toLowerCase().includes(query) ||
          event.resource.toLowerCase().includes(query) ||
          event.userEmail?.toLowerCase().includes(query) ||
          event.ipAddress.includes(query) ||
          JSON.stringify(event.details).toLowerCase().includes(query),
      );
    }

    setFilteredEvents(filtered);
  }, [events, filters]);

  // Group events by date for timeline view
  const timelineData = useMemo(() => {
    const grouped = filteredEvents.reduce(
      (acc, event) => {
        const date = format(parseISO(event.timestamp), 'yyyy-MM-dd');
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(event);
        return acc;
      },
      {} as Record<string, AuditEvent[]>,
    );

    return Object.entries(grouped)
      .map(([date, events]) => ({
        date,
        events: events.sort(
          (a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
        ),
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredEvents]);

  // Handle filter updates
  const updateFilter = (key: keyof SearchFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
    setCurrentPage(1);
  };

  // Quick date range filters
  const setQuickDateRange = (
    range: 'today' | '24h' | '7d' | '30d' | 'clear',
  ) => {
    const now = new Date();
    let dateRange;

    switch (range) {
      case 'today':
        dateRange = {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
          end: now,
        };
        break;
      case '24h':
        dateRange = {
          start: subHours(now, 24),
          end: now,
        };
        break;
      case '7d':
        dateRange = {
          start: subDays(now, 7),
          end: now,
        };
        break;
      case '30d':
        dateRange = {
          start: subDays(now, 30),
          end: now,
        };
        break;
      case 'clear':
        dateRange = undefined;
        break;
      default:
        return;
    }

    updateFilter('dateRange', dateRange);
  };

  // Export functionality
  const handleExport = async (options: ExportOptions) => {
    try {
      setIsExporting(true);

      const exportData = {
        events: filteredEvents,
        filters,
        exportOptions: options,
        exportedAt: new Date().toISOString(),
        totalCount: filteredEvents.length,
      };

      const response = await fetch('/api/audit/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportData),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_export_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.${options.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    } finally {
      setIsExporting(false);
    }
  };

  // Utility functions
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'success':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'failure':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'warning':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'web':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9"
            />
          </svg>
        );
      case 'api':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        );
      case 'mobile':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18h.01M8 21h8a1 1 0 001-1V4a1 1 0 00-1-1H8a1 1 0 00-1 1v16a1 1 0 001 1z"
            />
          </svg>
        );
      case 'system':
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  if (isLoading && events.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Audit Investigation
          </h1>
          <p className="text-gray-600 mt-1">
            Advanced search and analysis of security audit logs
          </p>
        </div>

        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'timeline'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Timeline
            </button>
          </div>

          {/* Export Button */}
          <div className="relative">
            <button
              onClick={() =>
                handleExport({
                  format: 'csv',
                  includeDetails: true,
                  includeMetadata: false,
                })
              }
              disabled={isExporting || filteredEvents.length === 0}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
            >
              {isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        {/* Main Search */}
        <div className="flex flex-col lg:flex-row lg:items-center space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search events, users, actions, resources, or IP addresses..."
                value={filters.query || ''}
                onChange={(e) => updateFilter('query', e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            Advanced Filters
            <svg
              className={`w-4 h-4 ml-2 inline-block transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>

        {/* Quick Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-gray-700">
            Quick filters:
          </span>
          {[
            { label: 'Today', value: 'today' },
            { label: 'Last 24h', value: '24h' },
            { label: 'Last 7 days', value: '7d' },
            { label: 'Last 30 days', value: '30d' },
            { label: 'Clear dates', value: 'clear' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setQuickDateRange(item.value as any)}
              className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded-full hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
            {/* User Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User Email
              </label>
              <input
                type="email"
                value={filters.userEmail || ''}
                onChange={(e) => updateFilter('userEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="user@example.com"
              />
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filters.action || ''}
                onChange={(e) => updateFilter('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Actions</option>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>
                    {action
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resource
              </label>
              <select
                value={filters.resource || ''}
                onChange={(e) => updateFilter('resource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Resources</option>
                {resourceOptions.map((resource) => (
                  <option key={resource} value={resource}>
                    {resource
                      .replace(/_/g, ' ')
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>

            {/* Outcome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Outcome
              </label>
              <select
                value={filters.outcome || ''}
                onChange={(e) => updateFilter('outcome', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
                <option value="warning">Warning</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Severity
              </label>
              <select
                value={filters.severity || ''}
                onChange={(e) => updateFilter('severity', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Source */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Source
              </label>
              <select
                value={filters.source || ''}
                onChange={(e) => updateFilter('source', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Sources</option>
                <option value="web">Web</option>
                <option value="api">API</option>
                <option value="mobile">Mobile</option>
                <option value="system">System</option>
              </select>
            </div>

            {/* IP Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                IP Address
              </label>
              <input
                type="text"
                value={filters.ipAddress || ''}
                onChange={(e) => updateFilter('ipAddress', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                placeholder="192.168.1.1"
              />
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({});
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Info */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredEvents.length} of {totalCount} events
          {Object.keys(filters).length > 0 && ' (filtered)'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className={`${selectedEvent ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          {viewMode === 'table' ? (
            /* Table View */
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {filteredEvents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredEvents.map((event) => (
                        <tr
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="flex-shrink-0">
                                {getSourceIcon(event.source)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {event.action
                                    .replace(/_/g, ' ')
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {event.resource}{' '}
                                  {event.resourceId && `#${event.resourceId}`}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {event.userEmail || 'System'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {event.ipAddress}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getOutcomeColor(event.outcome)}`}
                              >
                                {event.outcome}
                              </span>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(event.severity)}`}
                              >
                                {event.severity}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(
                              parseISO(event.timestamp),
                              'MMM d, yyyy h:mm:ss a',
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-600">
                    No events found
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try adjusting your search filters
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* Timeline View */
            <div className="space-y-6">
              {timelineData.length > 0 ? (
                timelineData.map((group) => (
                  <div
                    key={group.date}
                    className="bg-white rounded-lg shadow-sm border p-6"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {format(new Date(group.date), 'EEEE, MMMM d, yyyy')}
                    </h3>
                    <div className="space-y-4">
                      {group.events.map((event) => (
                        <div
                          key={event.id}
                          onClick={() => setSelectedEvent(event)}
                          className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 cursor-pointer border-l-4"
                          style={{
                            borderLeftColor:
                              event.outcome === 'success'
                                ? '#10B981'
                                : event.outcome === 'failure'
                                  ? '#EF4444'
                                  : '#F59E0B',
                          }}
                        >
                          <div className="flex-shrink-0 mt-1">
                            {getSourceIcon(event.source)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-gray-900">
                                {event.action
                                  .replace(/_/g, ' ')
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </p>
                              <span
                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(event.severity)}`}
                              >
                                {event.severity}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {event.userEmail || 'System'} • {event.resource} •{' '}
                              {event.ipAddress}
                            </p>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-sm text-gray-500">
                              {format(parseISO(event.timestamp), 'h:mm:ss a')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-4 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-gray-600">
                    No events found
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Try adjusting your search filters
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Event Details Panel */}
        {selectedEvent && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Event Details
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Basic Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Event ID:</span>
                      <span className="text-gray-900 font-mono text-xs">
                        {selectedEvent.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Timestamp:</span>
                      <span className="text-gray-900">
                        {format(
                          parseISO(selectedEvent.timestamp),
                          'MMM d, h:mm:ss a',
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Action:</span>
                      <span className="text-gray-900">
                        {selectedEvent.action}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Resource:</span>
                      <span className="text-gray-900">
                        {selectedEvent.resource}
                      </span>
                    </div>
                    {selectedEvent.resourceId && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Resource ID:</span>
                        <span className="text-gray-900 font-mono text-xs">
                          {selectedEvent.resourceId}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* User Info */}
                {selectedEvent.userEmail && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      User Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="text-gray-900">
                          {selectedEvent.userEmail}
                        </span>
                      </div>
                      {selectedEvent.userId && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">User ID:</span>
                          <span className="text-gray-900 font-mono text-xs">
                            {selectedEvent.userId}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-500">IP Address:</span>
                        <span className="text-gray-900">
                          {selectedEvent.ipAddress}
                        </span>
                      </div>
                      {selectedEvent.sessionId && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Session ID:</span>
                          <span className="text-gray-900 font-mono text-xs">
                            {selectedEvent.sessionId}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Status
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getOutcomeColor(selectedEvent.outcome)}`}
                      >
                        {selectedEvent.outcome}
                      </span>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(selectedEvent.severity)}`}
                      >
                        {selectedEvent.severity}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getSourceIcon(selectedEvent.source)}
                      <span className="text-sm text-gray-600">
                        {selectedEvent.source}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Details */}
                {Object.keys(selectedEvent.details).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Event Details
                    </h4>
                    <div className="bg-gray-50 rounded-md p-3">
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                        {JSON.stringify(selectedEvent.details, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selectedEvent.metadata &&
                  Object.keys(selectedEvent.metadata).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">
                        Metadata
                      </h4>
                      <div className="space-y-2 text-sm">
                        {selectedEvent.metadata.requestId && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Request ID:</span>
                            <span className="text-gray-900 font-mono text-xs">
                              {selectedEvent.metadata.requestId}
                            </span>
                          </div>
                        )}
                        {selectedEvent.metadata.correlationId && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">
                              Correlation ID:
                            </span>
                            <span className="text-gray-900 font-mono text-xs">
                              {selectedEvent.metadata.correlationId}
                            </span>
                          </div>
                        )}
                        {selectedEvent.metadata.duration && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Duration:</span>
                            <span className="text-gray-900">
                              {selectedEvent.metadata.duration}ms
                            </span>
                          </div>
                        )}
                        {selectedEvent.metadata.location && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Location:</span>
                            <span className="text-gray-900">
                              {selectedEvent.metadata.location}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="bg-white rounded-lg shadow-sm border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{' '}
              results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-600">
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(Math.ceil(totalCount / pageSize), prev + 1),
                  )
                }
                disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
