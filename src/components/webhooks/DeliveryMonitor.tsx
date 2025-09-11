'use client';

// WS-201 Team A - DeliveryMonitor Component
// Real-time webhook delivery monitoring with troubleshooting tools
// Location: /wedsync/src/components/webhooks/DeliveryMonitor.tsx

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  WebhookEndpoint,
  WebhookDelivery,
  FailedDelivery,
  getDeliveryStatusColor,
  WebhookDeliveryStatus,
} from '@/types/webhooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Activity,
  Search,
  Filter,
  RefreshCw,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Download,
  Eye,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

interface DeliveryMonitorProps {
  endpoints: WebhookEndpoint[];
  onRefresh: () => void;
}

interface DeliveryFilters {
  endpointId?: string;
  status?: WebhookDeliveryStatus;
  eventType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

const ITEMS_PER_PAGE = 20;

export function DeliveryMonitor({
  endpoints,
  onRefresh,
}: DeliveryMonitorProps) {
  const [filters, setFilters] = useState<DeliveryFilters>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDelivery, setSelectedDelivery] =
    useState<WebhookDelivery | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const queryClient = useQueryClient();

  // Fetch deliveries with pagination and filtering
  const {
    data: deliveriesData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['webhook-deliveries', currentPage, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(
            ([_, value]) => value !== undefined && value !== '',
          ),
        ),
      });

      const response = await fetch(`/api/webhooks/deliveries?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch deliveries');
      }

      return response.json();
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    staleTime: 10000,
  });

  // Fetch failed deliveries for dead letter queue
  const { data: failedDeliveries } = useQuery({
    queryKey: ['webhook-failed-deliveries'],
    queryFn: async (): Promise<FailedDelivery[]> => {
      const response = await fetch('/api/webhooks/deliveries/failed');
      if (!response.ok) {
        throw new Error('Failed to fetch failed deliveries');
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Retry delivery mutation
  const retryMutation = useMutation({
    mutationFn: async (deliveryId: string) => {
      const response = await fetch(
        `/api/webhooks/deliveries/${deliveryId}/retry`,
        {
          method: 'POST',
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to retry delivery');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Delivery retry initiated');
      queryClient.invalidateQueries({ queryKey: ['webhook-deliveries'] });
      queryClient.invalidateQueries({
        queryKey: ['webhook-failed-deliveries'],
      });
      onRefresh();
    },
    onError: (error) => {
      toast.error(
        `Retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    },
  });

  const deliveries = deliveriesData?.deliveries || [];
  const totalCount = deliveriesData?.total || 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleRetry = (deliveryId: string) => {
    retryMutation.mutate(deliveryId);
  };

  const handleFilterChange = (key: keyof DeliveryFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value || undefined,
    }));
    setCurrentPage(1); // Reset to first page when filtering
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const exportDeliveries = async () => {
    try {
      const params = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(
            ([_, value]) => value !== undefined && value !== '',
          ),
        ),
      );

      const response = await fetch(`/api/webhooks/deliveries/export?${params}`);
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `webhook-deliveries-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success('Deliveries exported successfully');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  const getStatusIcon = (status: WebhookDeliveryStatus) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'retrying':
        return <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="text-red-800 flex items-center">
            <AlertTriangle className="mr-2 h-5 w-5" />
            Error Loading Deliveries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700">
            Failed to load webhook deliveries. Please try again.
          </p>
          <Button
            variant="outline"
            onClick={() => refetch()}
            className="mt-4 border-red-300 text-red-700 hover:bg-red-100"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Activity className="mr-3 h-6 w-6" />
            Delivery Monitor
          </h2>
          <p className="text-gray-600">
            Real-time monitoring of webhook deliveries to your endpoints
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={exportDeliveries}
            className="flex items-center"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center"
          >
            <RefreshCw
              className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Dead Letter Queue Alert */}
      {failedDeliveries && failedDeliveries.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-red-600" />
              <CardTitle className="text-red-800">
                Failed Deliveries Require Attention
              </CardTitle>
            </div>
            <Badge variant="destructive" className="bg-red-600">
              {failedDeliveries.length}
            </Badge>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 mb-3">
              {failedDeliveries.length} webhook deliveries have failed and need
              manual intervention.
            </p>
            <div className="space-y-2">
              {failedDeliveries.slice(0, 3).map((failed) => (
                <div
                  key={failed.id}
                  className="flex items-center justify-between p-2 bg-white rounded border"
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium">
                      {failed.eventType}
                    </span>
                    <span className="text-xs text-gray-600">
                      Failed {failed.attempts} times
                    </span>
                  </div>
                  {failed.canRetry && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRetry(failed.id)}
                      disabled={retryMutation.isPending}
                      className="text-red-700 border-red-300 hover:bg-red-100"
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      Retry
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Input
                    placeholder="Search by event type..."
                    value={filters.search || ''}
                    onChange={(e) =>
                      handleFilterChange('search', e.target.value)
                    }
                    className="pl-9"
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Endpoint</label>
                <Select
                  value={filters.endpointId || ''}
                  onValueChange={(value) =>
                    handleFilterChange('endpointId', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All endpoints" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All endpoints</SelectItem>
                    {endpoints.map((endpoint) => (
                      <SelectItem key={endpoint.id} value={endpoint.id}>
                        {new URL(endpoint.url).hostname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={filters.status || ''}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All statuses</SelectItem>
                    <SelectItem value="success">Success</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="retrying">Retrying</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date From</label>
                <Input
                  type="date"
                  value={filters.dateFrom || ''}
                  onChange={(e) =>
                    handleFilterChange('dateFrom', e.target.value)
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-600">
                {totalCount} deliveries found
              </div>
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-600">Loading deliveries...</span>
            </div>
          ) : deliveries.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">No webhook deliveries found</p>
              <p className="text-sm text-gray-500">
                {Object.keys(filters).length > 0
                  ? 'Try adjusting your filters or create some webhook activity'
                  : 'Webhook deliveries will appear here once you start receiving events'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((delivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(delivery.status)}
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                getDeliveryStatusColor(delivery.status),
                              )}
                            >
                              {delivery.status}
                            </Badge>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-medium">{delivery.eventType}</p>
                            <p className="text-xs text-gray-500">
                              Attempt {delivery.attempts}/{delivery.maxAttempts}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <p className="text-sm">
                            {endpoints.find((e) => e.id === delivery.endpointId)
                              ?.url
                              ? new URL(
                                  endpoints.find(
                                    (e) => e.id === delivery.endpointId,
                                  )!.url,
                                ).hostname
                              : 'Unknown'}
                          </p>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center space-x-2">
                            {delivery.responseCode && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-xs',
                                  delivery.responseCode >= 200 &&
                                    delivery.responseCode < 300
                                    ? 'border-green-300 text-green-700'
                                    : 'border-red-300 text-red-700',
                                )}
                              >
                                {delivery.responseCode}
                              </Badge>
                            )}
                            {delivery.responseTime && (
                              <span className="text-xs text-gray-500">
                                {delivery.responseTime}ms
                              </span>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">
                            <p>
                              {format(
                                new Date(delivery.createdAt),
                                'MMM d, HH:mm',
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(
                                new Date(delivery.createdAt),
                                { addSuffix: true },
                              )}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedDelivery(delivery)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>Delivery Details</DialogTitle>
                                  <DialogDescription>
                                    Webhook delivery information and payload
                                  </DialogDescription>
                                </DialogHeader>
                                {selectedDelivery && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <label className="text-sm font-medium">
                                          Status
                                        </label>
                                        <div className="flex items-center space-x-2 mt-1">
                                          {getStatusIcon(
                                            selectedDelivery.status,
                                          )}
                                          <span className="capitalize">
                                            {selectedDelivery.status}
                                          </span>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">
                                          Event Type
                                        </label>
                                        <p className="mt-1">
                                          {selectedDelivery.eventType}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">
                                          Response Code
                                        </label>
                                        <p className="mt-1">
                                          {selectedDelivery.responseCode ||
                                            'N/A'}
                                        </p>
                                      </div>
                                      <div>
                                        <label className="text-sm font-medium">
                                          Response Time
                                        </label>
                                        <p className="mt-1">
                                          {selectedDelivery.responseTime}ms
                                        </p>
                                      </div>
                                    </div>

                                    {selectedDelivery.errorMessage && (
                                      <div>
                                        <label className="text-sm font-medium text-red-700">
                                          Error Message
                                        </label>
                                        <p className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">
                                          {selectedDelivery.errorMessage}
                                        </p>
                                      </div>
                                    )}

                                    <div>
                                      <label className="text-sm font-medium">
                                        Payload
                                      </label>
                                      <pre className="mt-1 text-xs bg-gray-50 p-3 rounded overflow-auto max-h-40">
                                        {JSON.stringify(
                                          selectedDelivery.payload,
                                          null,
                                          2,
                                        )}
                                      </pre>
                                    </div>

                                    {selectedDelivery.responseBody && (
                                      <div>
                                        <label className="text-sm font-medium">
                                          Response Body
                                        </label>
                                        <pre className="mt-1 text-xs bg-gray-50 p-3 rounded overflow-auto max-h-40">
                                          {selectedDelivery.responseBody}
                                        </pre>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            {delivery.status === 'failed' &&
                              delivery.attempts < delivery.maxAttempts && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRetry(delivery.id)}
                                  disabled={retryMutation.isPending}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {deliveries.map((delivery) => (
                  <div
                    key={delivery.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(delivery.status)}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            getDeliveryStatusColor(delivery.status),
                          )}
                        >
                          {delivery.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(delivery.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <div>
                      <p className="font-medium">{delivery.eventType}</p>
                      <p className="text-sm text-gray-600">
                        {endpoints.find((e) => e.id === delivery.endpointId)
                          ?.url
                          ? new URL(
                              endpoints.find(
                                (e) => e.id === delivery.endpointId,
                              )!.url,
                            ).hostname
                          : 'Unknown endpoint'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {delivery.responseCode && (
                          <Badge variant="outline" className="text-xs">
                            {delivery.responseCode}
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {delivery.attempts}/{delivery.maxAttempts} attempts
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedDelivery(delivery)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {delivery.status === 'failed' &&
                          delivery.attempts < delivery.maxAttempts && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRetry(delivery.id)}
                              disabled={retryMutation.isPending}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </Button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-600">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{' '}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of{' '}
                    {totalCount} deliveries
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from(
                        { length: Math.min(5, totalPages) },
                        (_, i) => {
                          const page = i + 1;
                          if (totalPages <= 5) {
                            return (
                              <Button
                                key={page}
                                variant={
                                  currentPage === page ? 'default' : 'outline'
                                }
                                size="sm"
                                onClick={() => setCurrentPage(page)}
                                className="w-8 h-8 p-0"
                              >
                                {page}
                              </Button>
                            );
                          }
                          return null;
                        },
                      )}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
