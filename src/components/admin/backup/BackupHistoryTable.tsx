'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  RotateCcw,
  Eye,
  Filter,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Database,
  FileText,
  Image,
  HardDrive,
  User,
  Play,
} from 'lucide-react';
import { BackupOperation } from '../../../types/backup';

const BackupHistoryTable: React.FC = () => {
  const [operations, setOperations] = useState<BackupOperation[]>([]);
  const [filteredOperations, setFilteredOperations] = useState<
    BackupOperation[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedOperation, setSelectedOperation] =
    useState<BackupOperation | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Filter states
  const [filters, setFilters] = useState({
    status: 'all',
    type: 'all',
    mode: 'all',
    dateRange: 'all',
    search: '',
  });

  const [showFilters, setShowFilters] = useState(false);

  // Mock data - Team B will replace with real API calls
  useEffect(() => {
    const mockOperations: BackupOperation[] = [
      {
        id: '1',
        backup_id: 'backup_001',
        backup_type: 'full',
        timestamp: new Date(Date.now() - 3600000), // 1 hour ago
        type: 'database',
        mode: 'automatic',
        status: 'success',
        started_at: new Date(Date.now() - 3600000).toISOString(),
        completed_at: new Date(Date.now() - 3120000).toISOString(),
        duration: 8,
        size: 2.4,
        size_bytes: 2400000000,
        components_backed_up: ['user_profiles', 'wedding_data', 'vendor_info'],
        integrity_verified: true,
        storageLocation: 'AWS S3 - us-east-1',
        verified: true,
        triggeredBy: 'system',
        components: ['user_profiles', 'wedding_data', 'vendor_info'],
        priority: 'normal',
      },
      {
        id: '2',
        backup_id: 'backup_002',
        backup_type: 'manual',
        timestamp: new Date(Date.now() - 86400000), // 1 day ago
        type: 'full',
        mode: 'manual',
        status: 'success',
        started_at: new Date(Date.now() - 86400000).toISOString(),
        completed_at: new Date(Date.now() - 83700000).toISOString(),
        duration: 45,
        size: 18.7,
        size_bytes: 18700000000,
        components_backed_up: ['database', 'files', 'images', 'config'],
        integrity_verified: true,
        storageLocation: 'AWS S3 - us-east-1',
        verified: true,
        triggeredBy: 'admin@wedsync.com',
        reason: 'Pre-deployment backup before v2.1.0 release',
        components: ['database', 'files', 'images', 'config'],
        priority: 'high',
      },
      {
        id: '3',
        backup_id: 'backup_003',
        backup_type: 'incremental',
        timestamp: new Date(Date.now() - 172800000), // 2 days ago
        type: 'images',
        mode: 'automatic',
        status: 'failed',
        started_at: new Date(Date.now() - 172800000).toISOString(),
        duration: 0,
        size: 0,
        size_bytes: 0,
        components_backed_up: [],
        integrity_verified: false,
        storageLocation: 'AWS S3 - us-east-1',
        verified: false,
        triggeredBy: 'system',
        components: ['wedding_photos', 'vendor_images'],
        priority: 'normal',
      },
      {
        id: '4',
        backup_id: 'backup_004',
        backup_type: 'manual',
        timestamp: new Date(Date.now() - 259200000), // 3 days ago
        type: 'files',
        mode: 'manual',
        status: 'success',
        started_at: new Date(Date.now() - 259200000).toISOString(),
        completed_at: new Date(Date.now() - 258480000).toISOString(),
        duration: 12,
        size: 3.2,
        size_bytes: 3200000000,
        components_backed_up: ['contracts', 'invoices', 'documents'],
        integrity_verified: true,
        storageLocation: 'AWS S3 - us-east-1',
        verified: true,
        triggeredBy: 'support@wedsync.com',
        reason: 'Client data export request',
        components: ['contracts', 'invoices', 'documents'],
        priority: 'low',
      },
      {
        id: '5',
        backup_id: 'backup_005',
        backup_type: 'incremental',
        timestamp: new Date(Date.now() - 345600000), // 4 days ago
        type: 'database',
        mode: 'automatic',
        status: 'running',
        started_at: new Date(Date.now() - 345600000).toISOString(),
        duration: 0,
        size: 0,
        size_bytes: 0,
        components_backed_up: [],
        integrity_verified: false,
        storageLocation: 'AWS S3 - us-east-1',
        verified: false,
        triggeredBy: 'system',
        components: ['user_profiles', 'wedding_data'],
        priority: 'normal',
      },
    ];

    setTimeout(() => {
      setOperations(mockOperations);
      setFilteredOperations(mockOperations);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...operations];

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter((op) => op.status === filters.status);
    }

    // Type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter((op) => op.type === filters.type);
    }

    // Mode filter
    if (filters.mode !== 'all') {
      filtered = filtered.filter((op) => op.mode === filters.mode);
    }

    // Date range filter
    if (filters.dateRange !== 'all') {
      const now = new Date();
      const ranges = {
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
      };

      if (ranges[filters.dateRange as keyof typeof ranges]) {
        const cutoff = new Date(
          now.getTime() - ranges[filters.dateRange as keyof typeof ranges],
        );
        filtered = filtered.filter((op) => op.timestamp >= cutoff);
      }
    }

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (op) =>
          op.triggeredBy.toLowerCase().includes(searchLower) ||
          op.reason?.toLowerCase().includes(searchLower) ||
          op.storageLocation.toLowerCase().includes(searchLower) ||
          op.components.some((comp) =>
            comp.toLowerCase().includes(searchLower),
          ),
      );
    }

    setFilteredOperations(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [operations, filters]);

  // Pagination
  const totalPages = Math.ceil(filteredOperations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedOperations = filteredOperations.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const getStatusIcon = (status: BackupOperation['status']) => {
    const iconClass = 'w-4 h-4';
    switch (status) {
      case 'success':
        return <CheckCircle2 className={`${iconClass} text-green-500`} />;
      case 'failed':
        return <XCircle className={`${iconClass} text-red-500`} />;
      case 'running':
        return <Clock className={`${iconClass} text-blue-500 animate-pulse`} />;
      case 'cancelled':
        return <XCircle className={`${iconClass} text-gray-500`} />;
      default:
        return <Clock className={`${iconClass} text-gray-400`} />;
    }
  };

  const getTypeIcon = (type: BackupOperation['type']) => {
    const iconClass = 'w-4 h-4 text-gray-600 dark:text-gray-400';
    switch (type) {
      case 'database':
        return <Database className={iconClass} />;
      case 'files':
        return <FileText className={iconClass} />;
      case 'images':
        return <Image className={iconClass} />;
      case 'full':
        return <HardDrive className={iconClass} />;
      default:
        return <Database className={iconClass} />;
    }
  };

  const getModeIcon = (mode: BackupOperation['mode']) => {
    const iconClass = 'w-3 h-3';
    return mode === 'manual' ? (
      <User className={`${iconClass} text-blue-500`} />
    ) : (
      <Play className={`${iconClass} text-purple-500`} />
    );
  };

  const getStatusBadgeColor = (status: BackupOperation['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes === 0) return '-';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const formatFileSize = (sizeInGB: number) => {
    if (sizeInGB === 0) return '-';
    if (sizeInGB < 1) {
      return `${(sizeInGB * 1024).toFixed(0)} MB`;
    }
    return `${sizeInGB.toFixed(1)} GB`;
  };

  const formatDate = (date: Date) => {
    return {
      date: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year:
          date.getFullYear() !== new Date().getFullYear()
            ? 'numeric'
            : undefined,
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    };
  };

  const handleDownload = (operation: BackupOperation) => {
    // Team B will implement download functionality
    console.log('Download backup:', operation.id);
    alert(
      `Download functionality will be implemented by Team B for backup: ${operation.id}`,
    );
  };

  const handleRestore = (operation: BackupOperation) => {
    // Team B will implement restore functionality
    console.log('Restore from backup:', operation.id);
    alert(
      `Restore functionality will be implemented by Team B for backup: ${operation.id}`,
    );
  };

  const handleViewDetails = (operation: BackupOperation) => {
    setSelectedOperation(operation);
    setShowDetails(true);
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      type: 'all',
      mode: 'all',
      dateRange: 'all',
      search: '',
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
            ></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Operations
          </h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {filteredOperations.length} of {operations.length} operations
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search operations..."
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
              className="pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white w-full sm:w-64"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
            <ChevronDown
              className={`w-4 h-4 ml-2 transform transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 text-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type
              </label>
              <select
                value={filters.type}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, type: e.target.value }))
                }
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 text-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="database">Database</option>
                <option value="files">Files</option>
                <option value="images">Images</option>
                <option value="full">Full System</option>
              </select>
            </div>

            {/* Mode Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Mode
              </label>
              <select
                value={filters.mode}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, mode: e.target.value }))
                }
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 text-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Modes</option>
                <option value="automatic">Automatic</option>
                <option value="manual">Manual</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Date Range
              </label>
              <select
                value={filters.dateRange}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, dateRange: e.target.value }))
                }
                className="block w-full rounded-lg border-gray-300 dark:border-gray-600 text-sm focus:border-purple-500 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Time</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <button
              onClick={resetFilters}
              className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Backup Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Storage
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedOperations.map((operation) => {
                const { date, time } = formatDate(operation.timestamp);

                return (
                  <tr
                    key={operation.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-start space-x-3">
                        <div className="flex items-center space-x-2">
                          {getTypeIcon(operation.type)}
                          {getModeIcon(operation.mode)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                              {operation.type} Backup
                            </p>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                operation.mode === 'manual'
                                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                                  : 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                              }`}
                            >
                              {operation.mode}
                            </span>
                          </div>

                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            <div>
                              {date} at {time}
                            </div>
                            <div className="truncate">
                              by {operation.triggeredBy}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(operation.status)}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusBadgeColor(operation.status)}`}
                        >
                          {operation.status}
                        </span>
                      </div>

                      {operation.verified && operation.status === 'success' && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                          ✓ Verified
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatDuration(operation.duration)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {formatFileSize(operation.size)}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {operation.storageLocation}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(operation)}
                          className="text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {operation.status === 'success' && (
                          <>
                            <button
                              onClick={() => handleDownload(operation)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Download backup"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleRestore(operation)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Restore from backup"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredOperations.length === 0 && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No backup operations found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {filters.search ||
              filters.status !== 'all' ||
              filters.type !== 'all' ||
              filters.mode !== 'all' ||
              filters.dateRange !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Backup operations will appear here once they start running.'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Showing {startIndex + 1} to{' '}
              {Math.min(startIndex + itemsPerPage, filteredOperations.length)}{' '}
              of {filteredOperations.length} results
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>

            <div className="flex space-x-1">
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                        page === currentPage
                          ? 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/20'
                          : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (
                  page === currentPage - 2 ||
                  page === currentPage + 2
                ) {
                  return (
                    <span
                      key={page}
                      className="inline-flex items-center px-2 py-2 text-sm text-gray-500"
                    >
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>

            <button
              onClick={() =>
                setCurrentPage((prev) => Math.min(prev + 1, totalPages))
              }
              disabled={currentPage === totalPages}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetails && selectedOperation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Backup Operation Details
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      ID:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {selectedOperation.id}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Type:
                    </span>
                    <p className="text-gray-900 dark:text-white capitalize">
                      {selectedOperation.type}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Components:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {selectedOperation.components.join(', ')}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600 dark:text-gray-400">
                      Priority:
                    </span>
                    <p className="text-gray-900 dark:text-white capitalize">
                      {selectedOperation.priority}
                    </p>
                  </div>
                </div>

                {selectedOperation.reason && (
                  <div>
                    <span className="block font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Reason:
                    </span>
                    <p className="text-gray-900 dark:text-white">
                      {selectedOperation.reason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { BackupHistoryTable };
export default BackupHistoryTable;
