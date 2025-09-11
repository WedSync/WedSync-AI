'use client';

/**
 * Feedback List Component
 * Feature: WS-236 User Feedback System
 * Admin dashboard component for managing feedback submissions
 */

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  Eye,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Circle,
  ArrowUpDown,
  Filter,
  Search,
  Plus,
  MoreHorizontal,
  Trash2,
  Edit3,
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface FeedbackSubmission {
  id: string;
  feedback_type: string;
  category?: string;
  subject: string;
  description: string;
  priority: string;
  status: string;
  is_wedding_day_critical: boolean;
  wedding_date?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  user: {
    email: string;
    raw_user_meta_data?: any;
  };
  assigned_user?: {
    email: string;
    raw_user_meta_data?: any;
  };
  feedback_responses?: Array<{
    id: string;
    response_text: string;
    is_customer_visible: boolean;
  }>;
}

interface FeedbackListProps {
  onFeedbackClick?: (feedback: FeedbackSubmission) => void;
  onStatusChange?: (feedbackId: string, newStatus: string) => void;
  compactView?: boolean;
}

const feedbackTypeLabels = {
  bug_report: 'Bug Report',
  feature_request: 'Feature Request',
  general_feedback: 'General Feedback',
  support_request: 'Support Request',
  billing_inquiry: 'Billing Inquiry',
  wedding_day_issue: 'Wedding Day Issue',
  vendor_complaint: 'Vendor Complaint',
  couple_complaint: 'Couple Complaint',
  performance_issue: 'Performance Issue',
};

const statusConfig = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-700', icon: Circle },
  in_progress: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Clock,
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  closed: {
    label: 'Closed',
    color: 'bg-gray-100 text-gray-700',
    icon: CheckCircle,
  },
  duplicate: {
    label: 'Duplicate',
    color: 'bg-purple-100 text-purple-700',
    icon: Circle,
  },
  wont_fix: {
    label: "Won't Fix",
    color: 'bg-red-100 text-red-700',
    icon: Circle,
  },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
  wedding_day_urgent: {
    label: 'Wedding Day Urgent',
    color: 'bg-red-100 text-red-700',
  },
};

export function FeedbackList({
  onFeedbackClick,
  onStatusChange,
  compactView = false,
}: FeedbackListProps) {
  const queryClient = useQueryClient();

  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Build query parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: currentPage.toString(),
      limit: pageSize.toString(),
      sort: sortBy,
      order: sortOrder,
    });

    if (searchTerm) params.append('search', searchTerm);
    if (statusFilter) params.append('status', statusFilter);
    if (priorityFilter) params.append('priority', priorityFilter);
    if (typeFilter) params.append('feedback_type', typeFilter);

    return params.toString();
  }, [
    searchTerm,
    statusFilter,
    priorityFilter,
    typeFilter,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  // Fetch feedback submissions
  const {
    data: feedbackData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['feedback-submissions', queryParams],
    queryFn: async () => {
      const response = await fetch(`/api/feedback?${queryParams}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch feedback');
      }
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  // Update feedback status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      feedbackId,
      status,
      resolution_notes,
    }: {
      feedbackId: string;
      status: string;
      resolution_notes?: string;
    }) => {
      const response = await fetch('/api/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: feedbackId, status, resolution_notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update feedback');
      }

      return response.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['feedback-submissions'] });
      toast.success(
        `Feedback status updated to ${statusConfig[variables.status as keyof typeof statusConfig]?.label || variables.status}`,
      );
      onStatusChange?.(variables.feedbackId, variables.status);
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to update feedback status',
      );
    },
  });

  // Delete feedback mutation
  const deleteMutation = useMutation({
    mutationFn: async (feedbackId: string) => {
      const response = await fetch(`/api/feedback/${feedbackId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete feedback');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feedback-submissions'] });
      toast.success('Feedback deleted successfully');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete feedback',
      );
    },
  });

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const handleStatusUpdate = (feedbackId: string, newStatus: string) => {
    let resolution_notes: string | undefined;

    if (['resolved', 'closed'].includes(newStatus)) {
      resolution_notes = prompt('Please provide resolution notes:');
      if (!resolution_notes) {
        toast.error('Resolution notes are required when resolving feedback');
        return;
      }
    }

    updateStatusMutation.mutate({
      feedbackId,
      status: newStatus,
      resolution_notes,
    });
  };

  const handleDelete = (feedbackId: string, subject: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete the feedback: "${subject}"?`,
      )
    ) {
      deleteMutation.mutate(feedbackId);
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-red-600">
            Failed to load feedback submissions:{' '}
            {error instanceof Error ? error.message : 'Unknown error'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const submissions = feedbackData?.data || [];
  const pagination = feedbackData?.pagination;

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Management
              {pagination && (
                <Badge variant="secondary" className="ml-2">
                  {pagination.total} total
                </Badge>
              )}
            </CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search" className="sr-only">
                Search feedback
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search feedback..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {Object.entries(statusConfig).map(([status, config]) => (
                  <SelectItem key={status} value={status}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priorities</SelectItem>
                {Object.entries(priorityConfig).map(([priority, config]) => (
                  <SelectItem key={priority} value={priority}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
                {Object.entries(feedbackTypeLabels).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('priority')}
                      className="p-0 h-auto"
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('subject')}
                      className="p-0 h-auto font-medium"
                    >
                      Subject <ArrowUpDown className="h-4 w-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort('created_at')}
                      className="p-0 h-auto font-medium"
                    >
                      Created <ArrowUpDown className="h-4 w-4 ml-1" />
                    </Button>
                  </TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="w-12">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-4" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-48" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-6 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-8 w-8" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : submissions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-gray-500"
                    >
                      No feedback submissions found
                    </TableCell>
                  </TableRow>
                ) : (
                  submissions.map((feedback: FeedbackSubmission) => {
                    const statusInfo =
                      statusConfig[
                        feedback.status as keyof typeof statusConfig
                      ];
                    const priorityInfo =
                      priorityConfig[
                        feedback.priority as keyof typeof priorityConfig
                      ];
                    const StatusIcon = statusInfo?.icon || Circle;

                    return (
                      <TableRow
                        key={feedback.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => onFeedbackClick?.(feedback)}
                      >
                        <TableCell>
                          {feedback.is_wedding_day_critical && (
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                          )}
                        </TableCell>

                        <TableCell className="max-w-xs">
                          <div>
                            <p className="font-medium text-sm truncate">
                              {feedback.subject}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {feedback.description.substring(0, 100)}...
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {feedbackTypeLabels[
                              feedback.feedback_type as keyof typeof feedbackTypeLabels
                            ] || feedback.feedback_type}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${statusInfo?.color || ''}`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo?.label || feedback.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={`text-xs ${priorityInfo?.color || ''}`}
                          >
                            {priorityInfo?.label || feedback.priority}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(
                              new Date(feedback.created_at),
                              'MMM dd, yyyy',
                            )}
                          </div>
                          {feedback.wedding_date && (
                            <div className="text-xs text-gray-500 mt-1">
                              Wedding:{' '}
                              {format(
                                new Date(feedback.wedding_date),
                                'MMM dd, yyyy',
                              )}
                            </div>
                          )}
                        </TableCell>

                        <TableCell className="text-sm">
                          <div
                            className="truncate max-w-32"
                            title={feedback.user.email}
                          >
                            {feedback.user.raw_user_meta_data?.full_name ||
                              feedback.user.email.split('@')[0]}
                          </div>
                          <div className="text-xs text-gray-500">
                            {feedback.feedback_responses?.length || 0} responses
                          </div>
                        </TableCell>

                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => onFeedbackClick?.(feedback)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>

                              {feedback.status !== 'resolved' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate(feedback.id, 'resolved')
                                  }
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark Resolved
                                </DropdownMenuItem>
                              )}

                              {feedback.status !== 'in_progress' && (
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleStatusUpdate(
                                      feedback.id,
                                      'in_progress',
                                    )
                                  }
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Mark In Progress
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuItem
                                onClick={() =>
                                  handleDelete(feedback.id, feedback.subject)
                                }
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, pagination.total)} of{' '}
            {pagination.total} results
          </p>

          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>

            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                const pageNum =
                  Math.max(1, Math.min(pagination.pages - 4, currentPage - 2)) +
                  i;
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage(Math.min(pagination.pages, currentPage + 1))
              }
              disabled={currentPage === pagination.pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
