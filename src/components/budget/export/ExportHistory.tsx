'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import {
  Download,
  Trash2,
  FileText,
  Sheet,
  Table,
  Calendar,
  Clock,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import type {
  ExportHistoryProps,
  ExportHistoryRecord,
  ExportFormat,
} from '@/types/budget-export';

const formatIcons = {
  pdf: FileText,
  csv: Sheet,
  excel: Table,
};

/**
 * ExportHistory - List of previous exports with download/re-download functionality
 * Shows export metadata, status, and provides actions for download and deletion
 */
export function ExportHistory({
  userId,
  clientId,
  onDownload,
  onDelete,
  maxRecords = 20,
}: ExportHistoryProps) {
  const [history, setHistory] = useState<ExportHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mock data for demonstration - in real implementation, this would fetch from API
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Simulate API call delay
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Mock data - replace with actual API call
        const mockHistory: ExportHistoryRecord[] = [
          {
            id: '1',
            userId,
            clientId,
            format: 'pdf',
            filters: {
              categories: ['Venue', 'Catering'],
              dateRange: {
                start: new Date('2024-01-01'),
                end: new Date('2024-12-31'),
              },
              paymentStatus: 'all',
              includeNotes: true,
              includeReceipts: false,
              includeVendors: true,
            },
            fileName: 'wedding-budget-report-2024-01-15.pdf',
            fileSize: 2457600, // 2.4 MB
            downloadUrl: 'https://example.com/exports/1',
            downloadCount: 3,
            status: 'completed',
            createdAt: new Date('2024-01-15T10:30:00'),
            expiresAt: new Date('2024-02-15T10:30:00'),
            metadata: {
              categoriesCount: 2,
              transactionsCount: 45,
              totalAmount: 25000,
              dateRange: {
                start: new Date('2024-01-01'),
                end: new Date('2024-12-31'),
              },
            },
          },
          {
            id: '2',
            userId,
            clientId,
            format: 'excel',
            filters: {
              categories: [],
              dateRange: null,
              paymentStatus: 'paid',
              includeNotes: true,
              includeReceipts: true,
              includeVendors: true,
            },
            fileName: 'budget-analysis-2024-01-10.xlsx',
            fileSize: 1024000, // 1 MB
            downloadUrl: 'https://example.com/exports/2',
            downloadCount: 1,
            status: 'completed',
            createdAt: new Date('2024-01-10T14:20:00'),
            expiresAt: new Date('2024-02-10T14:20:00'),
            metadata: {
              categoriesCount: 8,
              transactionsCount: 23,
              totalAmount: 15750,
            },
          },
          {
            id: '3',
            userId,
            clientId,
            format: 'csv',
            filters: {
              categories: ['Photography', 'Flowers'],
              dateRange: {
                start: new Date('2023-12-01'),
                end: new Date('2024-01-01'),
              },
              paymentStatus: 'pending',
              includeNotes: false,
              includeReceipts: false,
              includeVendors: false,
            },
            fileName: 'vendor-payments-pending.csv',
            fileSize: 52000, // 52 KB
            downloadUrl: 'https://example.com/exports/3',
            downloadCount: 0,
            status: 'failed',
            createdAt: new Date('2024-01-05T09:15:00'),
            expiresAt: new Date('2024-02-05T09:15:00'),
            error: 'Generation failed due to missing data',
            metadata: {
              categoriesCount: 2,
              transactionsCount: 8,
              totalAmount: 3200,
            },
          },
        ];

        setHistory(mockHistory.slice(0, maxRecords));
      } catch (err) {
        setError('Failed to load export history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId, clientId, maxRecords]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string, error?: string) => {
    switch (status) {
      case 'completed':
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 border-green-300"
          >
            Completed
          </Badge>
        );
      case 'failed':
        return (
          <Badge
            variant="destructive"
            className="bg-red-100 text-red-800 border-red-300"
          >
            Failed
          </Badge>
        );
      case 'generating':
        return (
          <Badge
            variant="secondary"
            className="bg-blue-100 text-blue-800 border-blue-300"
          >
            Generating
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDownload = (record: ExportHistoryRecord) => {
    onDownload(record);
  };

  const handleDelete = async (recordId: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this export? This action cannot be undone.',
      )
    ) {
      try {
        await onDelete?.(recordId);
        setHistory((prev) => prev.filter((record) => record.id !== recordId));
      } catch (error) {
        console.error('Failed to delete export:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <LoadingSpinner size="lg" />
        <span className="ml-2 text-gray-600">Loading export history...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No exports yet
        </h3>
        <p className="text-gray-600">
          Your export history will appear here once you create your first budget
          report.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Export History</h3>
        <Badge variant="outline" className="text-sm">
          {history.length} {history.length === 1 ? 'export' : 'exports'}
        </Badge>
      </div>

      <div className="space-y-3">
        {history.map((record) => {
          const FormatIcon = formatIcons[record.format];
          const isExpired = new Date() > record.expiresAt;
          const canDownload = record.status === 'completed' && !isExpired;

          return (
            <Card key={record.id} className="transition-shadow hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {/* Format Icon */}
                    <div
                      className={cn(
                        'p-2 rounded-lg',
                        record.status === 'completed'
                          ? 'bg-blue-100'
                          : 'bg-gray-100',
                      )}
                    >
                      <FormatIcon
                        className={cn(
                          'h-5 w-5',
                          record.status === 'completed'
                            ? 'text-blue-600'
                            : 'text-gray-500',
                        )}
                      />
                    </div>

                    {/* Export Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">
                          {record.fileName}
                        </h4>
                        {getStatusBadge(record.status, record.error)}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(record.createdAt, 'MMM d, yyyy')}
                          </span>
                          <span>{formatFileSize(record.fileSize)}</span>
                          {record.downloadCount > 0 && (
                            <span>{record.downloadCount} downloads</span>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="text-xs text-gray-500">
                          {record.metadata.categoriesCount} categories •{' '}
                          {record.metadata.transactionsCount} transactions
                          {record.metadata.dateRange && (
                            <>
                              {' '}
                              •{' '}
                              {format(
                                record.metadata.dateRange.start,
                                'MMM d',
                              )}{' '}
                              -{' '}
                              {format(
                                record.metadata.dateRange.end,
                                'MMM d, yyyy',
                              )}
                            </>
                          )}
                        </div>

                        {/* Expiration Warning */}
                        {isExpired && record.status === 'completed' && (
                          <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                            This export has expired and is no longer available
                            for download
                          </div>
                        )}

                        {/* Error Message */}
                        {record.status === 'failed' && record.error && (
                          <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                            {record.error}
                          </div>
                        )}

                        {/* Time Information */}
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(record.createdAt, {
                            addSuffix: true,
                          })}
                          {!isExpired && record.status === 'completed' && (
                            <>
                              {' '}
                              • Expires{' '}
                              {formatDistanceToNow(record.expiresAt, {
                                addSuffix: true,
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {canDownload && (
                        <DropdownMenuItem
                          onClick={() => handleDownload(record)}
                          className="flex items-center gap-2"
                        >
                          <Download className="h-4 w-4" />
                          Download
                        </DropdownMenuItem>
                      )}
                      {onDelete && (
                        <DropdownMenuItem
                          onClick={() => handleDelete(record.id)}
                          className="flex items-center gap-2 text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Load More Button (if needed) */}
      {history.length === maxRecords && (
        <div className="text-center pt-4">
          <Button variant="outline" size="sm">
            Load more exports
          </Button>
        </div>
      )}
    </div>
  );
}

export default ExportHistory;
