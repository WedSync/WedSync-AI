'use client';

import { useState, useEffect } from 'react';

interface AuditEntry {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  status: 'success' | 'failed' | 'error';
  details: Record<string, any>;
  timestamp: string;
  clientIP: string;
  requiresMFA: boolean;
  userAgent?: string;
}

interface AuditFilters {
  status?: 'success' | 'failed' | 'error';
  action?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
}

export function AdminAuditLog() {
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<AuditFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAuditEntries();
  }, [filters, currentPage]);

  const fetchAuditEntries = async () => {
    try {
      setIsLoading(true);

      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        ...filters,
      });

      const response = await fetch(`/api/admin/audit-log?${queryParams}`);
      if (response.ok) {
        const data = await response.json();
        setAuditEntries(data.entries || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error('Failed to fetch audit entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-success-50 text-success-700 border-success-200';
      case 'failed':
        return 'bg-warning-50 text-warning-700 border-warning-200';
      case 'error':
        return 'bg-error-50 text-error-700 border-error-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getActionIcon = (action: string) => {
    const iconClass = 'w-4 h-4';

    if (action.includes('maintenance')) {
      return (
        <svg
          className={`${iconClass} text-warning-600`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
        </svg>
      );
    }

    if (action.includes('suspend') || action.includes('logout')) {
      return (
        <svg
          className={`${iconClass} text-error-600`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
          />
        </svg>
      );
    }

    if (action.includes('backup')) {
      return (
        <svg
          className={`${iconClass} text-blue-600`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        </svg>
      );
    }

    return (
      <svg
        className={`${iconClass} text-gray-600`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
  };

  const handleFilterChange = (key: keyof AuditFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value === 'all' ? undefined : value,
    }));
    setCurrentPage(1);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded flex-1"></div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Admin Audit Log
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Complete history of administrative actions
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-4">
            {/* Status Filter */}
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="error">Error</option>
            </select>

            {/* Time Range Filter */}
            <select
              value={filters.timeRange || '24h'}
              onChange={(e) => handleFilterChange('timeRange', e.target.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden">
        {auditEntries.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto text-gray-300 mb-4"
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
              No audit entries found
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Admin actions will appear here when they occur
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {auditEntries.map((entry) => {
              const { date, time } = formatTimestamp(entry.timestamp);

              return (
                <div
                  key={entry.id || `${entry.timestamp}-${entry.action}`}
                  className="p-6 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start space-x-4">
                    {/* Action Icon */}
                    <div className="flex-shrink-0 mt-1">
                      {getActionIcon(entry.action)}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {entry.action
                            .replace(/-/g, ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(entry.status)}`}
                        >
                          {entry.status}
                        </span>
                        {entry.requiresMFA && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 border border-primary-200">
                            MFA
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                        <span>{entry.adminEmail}</span>
                        <span>•</span>
                        <span>{entry.clientIP}</span>
                        <span>•</span>
                        <span>
                          {date} at {time}
                        </span>
                      </div>

                      {/* Action Details */}
                      {Object.keys(entry.details).length > 0 && (
                        <div className="mt-2 text-xs text-gray-600">
                          {entry.details.targetUser && (
                            <span className="inline-flex items-center space-x-1">
                              <span className="font-medium">Target:</span>
                              <span>{entry.details.targetUser}</span>
                            </span>
                          )}
                          {entry.details.reason && (
                            <div className="mt-1">
                              <span className="font-medium">Reason:</span>{' '}
                              {entry.details.reason}
                            </div>
                          )}
                          {entry.details.maintenanceMessage && (
                            <div className="mt-1">
                              <span className="font-medium">Message:</span>{' '}
                              {entry.details.maintenanceMessage}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-500">
                        <div>{time}</div>
                        <div className="mt-0.5">{date}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() =>
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
