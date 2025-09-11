'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Filter,
  Clock,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Calendar,
  MapPin,
  RefreshCw,
  Plus,
  ArrowUpDown,
  ChevronRight,
  Zap,
  Timer,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SupportTicket {
  id: string;
  ticket_number: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'wedding_day';
  category: string;
  created_at: string;
  updated_at: string;
  venue_name?: string;
  wedding_date?: string;
  assigned_to?: string;
  support_ticket_comments: Array<{
    id: string;
    content: string;
    created_at: string;
    author_name: string;
  }>;
}

interface TicketListViewProps {
  onTicketSelect?: (ticketId: string) => void;
  showCreateButton?: boolean;
  filters?: {
    status?: string[];
    priority?: string[];
  };
}

const STATUS_CONFIG = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800', icon: Clock },
  in_progress: {
    label: 'In Progress',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Timer,
  },
  waiting_response: {
    label: 'Waiting',
    color: 'bg-purple-100 text-purple-800',
    icon: MessageSquare,
  },
  resolved: {
    label: 'Resolved',
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
  },
  closed: {
    label: 'Closed',
    color: 'bg-gray-100 text-gray-800',
    icon: CheckCircle,
  },
};

const PRIORITY_CONFIG = {
  wedding_day: {
    label: 'Wedding Day',
    color: 'bg-red-500 text-white',
    urgent: true,
  },
  urgent: { label: 'Urgent', color: 'bg-orange-500 text-white', urgent: true },
  high: { label: 'High', color: 'bg-yellow-500 text-white' },
  normal: { label: 'Normal', color: 'bg-blue-500 text-white' },
  low: { label: 'Low', color: 'bg-gray-500 text-white' },
};

export const TicketListView: React.FC<TicketListViewProps> = ({
  onTicketSelect,
  showCreateButton = true,
  filters = {},
}) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const router = useRouter();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<
    'created_at' | 'updated_at' | 'priority'
  >('updated_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load tickets
  const loadTickets = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) setLoading(true);
        else setRefreshing(true);

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        let query = supabase
          .from('support_tickets')
          .select(
            `
          *,
          support_ticket_comments:support_ticket_comments(
            id,
            content,
            created_at,
            author_name
          )
        `,
          )
          .eq('user_id', user.id)
          .order(sortBy, { ascending: sortOrder === 'asc' });

        // Apply filters
        if (filters.status && filters.status.length > 0) {
          query = query.in('status', filters.status);
        }
        if (filters.priority && filters.priority.length > 0) {
          query = query.in('priority', filters.priority);
        }

        const { data, error } = await query;

        if (error) throw error;

        setTickets(data || []);
      } catch (error) {
        console.error('Error loading tickets:', error);
        toast.error('Failed to load tickets');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase, sortBy, sortOrder, filters],
  );

  // Initial load
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('support-tickets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          console.log('Ticket update:', payload);
          loadTickets(false); // Refresh without loader
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_ticket_comments' },
        (payload) => {
          console.log('Comment update:', payload);
          loadTickets(false); // Refresh without loader
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, loadTickets]);

  // Filter and search tickets
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (ticket) =>
          ticket.title.toLowerCase().includes(term) ||
          ticket.description.toLowerCase().includes(term) ||
          ticket.ticket_number.toLowerCase().includes(term) ||
          ticket.venue_name?.toLowerCase().includes(term),
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((ticket) => ticket.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(
        (ticket) => ticket.priority === priorityFilter,
      );
    }

    return filtered;
  }, [tickets, searchTerm, statusFilter, priorityFilter]);

  // Handle ticket selection
  const handleTicketClick = (ticketId: string) => {
    if (onTicketSelect) {
      onTicketSelect(ticketId);
    } else {
      router.push(`/support/tickets/${ticketId}`);
    }
  };

  // Handle refresh
  const handleRefresh = () => {
    loadTickets(false);
  };

  // Handle create new ticket
  const handleCreateTicket = () => {
    router.push('/support/create');
  };

  // Toggle sort
  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  // Get ticket status icon and color
  const getStatusDisplay = (status: string) => {
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!config)
      return { label: status, color: 'bg-gray-100 text-gray-800', icon: Clock };
    return config;
  };

  // Get priority display
  const getPriorityDisplay = (priority: string) => {
    const config = PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG];
    if (!config) return { label: priority, color: 'bg-gray-500 text-white' };
    return config;
  };

  // Get last comment count
  const getCommentCount = (ticket: SupportTicket) => {
    return ticket.support_ticket_comments?.length || 0;
  };

  // Get time since last update
  const getTimeSinceUpdate = (updatedAt: string) => {
    return formatDistanceToNow(new Date(updatedAt), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-5 w-full" />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Search and Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Support Tickets</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </Button>
          {showCreateButton && (
            <Button
              size="sm"
              onClick={handleCreateTicket}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tickets..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="waiting_response">Waiting</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="wedding_day">Wedding Day</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort('updated_at')}
            className="flex items-center gap-1"
          >
            <ArrowUpDown className="h-3 w-3" />
            Updated
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {filteredTickets.length} of {tickets.length} tickets
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Tickets List */}
      <div className="space-y-3">
        {filteredTickets.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <div className="space-y-3">
                <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    No tickets found
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {searchTerm ||
                    statusFilter !== 'all' ||
                    priorityFilter !== 'all'
                      ? 'Try adjusting your filters or search terms'
                      : 'Create your first support ticket to get started'}
                  </p>
                </div>
                {showCreateButton &&
                  !searchTerm &&
                  statusFilter === 'all' &&
                  priorityFilter === 'all' && (
                    <Button onClick={handleCreateTicket}>
                      <Plus className="h-4 w-4 mr-1" />
                      Create Ticket
                    </Button>
                  )}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredTickets.map((ticket) => {
            const statusDisplay = getStatusDisplay(ticket.status);
            const priorityDisplay = getPriorityDisplay(ticket.priority);
            const commentCount = getCommentCount(ticket);
            const StatusIcon = statusDisplay.icon;

            return (
              <Card
                key={ticket.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleTicketClick(ticket.id)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header Row */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs font-mono"
                        >
                          {ticket.ticket_number}
                        </Badge>
                        {priorityDisplay.urgent && (
                          <Zap className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-xs ${priorityDisplay.color}`}
                          variant="secondary"
                        >
                          {priorityDisplay.label}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="font-medium text-gray-900 line-clamp-2">
                      {ticket.title}
                    </h3>

                    {/* Wedding Context */}
                    {ticket.venue_name && (
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="h-3 w-3" />
                        <span>{ticket.venue_name}</span>
                        {ticket.wedding_date && (
                          <>
                            <Calendar className="h-3 w-3 ml-2" />
                            <span>
                              {new Date(
                                ticket.wedding_date,
                              ).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                    )}

                    {/* Footer Row */}
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${statusDisplay.color}`}
                          >
                            {statusDisplay.label}
                          </span>
                        </div>

                        {commentCount > 0 && (
                          <div className="flex items-center gap-1 text-gray-500">
                            <MessageSquare className="h-3 w-3" />
                            <span>{commentCount}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-gray-500">
                        {getTimeSinceUpdate(ticket.updated_at)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Pull to Refresh Indicator (for mobile) */}
      {refreshing && (
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 text-sm text-gray-600">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Refreshing tickets...
          </div>
        </div>
      )}
    </div>
  );
};
