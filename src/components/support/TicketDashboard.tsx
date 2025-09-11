/**
 * Ticket Dashboard Component
 * WS-235: Support Operations Ticket Management System
 *
 * Comprehensive dashboard for managing support tickets with:
 * - Real-time updates via Supabase
 * - Advanced filtering and sorting
 * - SLA monitoring and alerts
 * - Wedding emergency prioritization
 * - Quick actions and bulk operations
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
  Search,
  Filter,
  AlertTriangle,
  Clock,
  User,
  Tag,
  ChevronDown,
  MoreVertical,
  Calendar,
  Heart,
  Zap,
  CheckCircle,
  XCircle,
  Eye,
  MessageSquare,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';

// Types
interface Ticket {
  id: string;
  smart_ticket_id: string;
  subject: string;
  description: string;
  status: 'open' | 'in_progress' | 'pending_response' | 'resolved' | 'closed';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  vendor_type?: string;
  is_wedding_emergency: boolean;
  escalation_level: number;
  tags: string[];
  created_at: string;
  updated_at: string;
  first_response_at?: string;
  resolved_at?: string;
  wedding_date?: string;
  user_profiles: {
    full_name: string;
    email: string;
    user_tier: string;
    organizations?: {
      name: string;
    };
  };
  support_agents?: {
    full_name: string;
    wedding_expertise_level: string;
  };
  messageCount: number;
  lastActivity: string;
  slaStatus?: {
    responseTimeUsed: number;
    resolutionTimeUsed: number;
    isResponseBreached: boolean;
    isResolutionBreached: boolean;
    timeToDeadline: number;
  };
}

interface DashboardFilters {
  search: string;
  status: string;
  priority: string;
  category: string;
  assignedAgentId: string;
  isWeddingEmergency: boolean | null;
  escalationLevel: number | null;
  userTier: string;
  createdAfter: string;
  createdBefore: string;
}

interface DashboardStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  weddingEmergencies: number;
  breachedSLA: number;
  unassigned: number;
  avgResponseTime: number;
  avgResolutionTime: number;
}

const INITIAL_FILTERS: DashboardFilters = {
  search: '',
  status: '',
  priority: '',
  category: '',
  assignedAgentId: '',
  isWeddingEmergency: null,
  escalationLevel: null,
  userTier: '',
  createdAfter: '',
  createdBefore: '',
};

export default function TicketDashboard() {
  // State management
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<DashboardFilters>(INITIAL_FILTERS);
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(
    new Set(),
  );
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [realtimeChannel, setRealtimeChannel] =
    useState<RealtimeChannel | null>(null);

  // Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Priority and status configurations
  const priorityColors = {
    critical: 'bg-red-100 text-red-800 border-red-200',
    high: 'bg-orange-100 text-orange-800 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-green-100 text-green-800 border-green-200',
  };

  const statusColors = {
    open: 'bg-blue-100 text-blue-800 border-blue-200',
    in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
    pending_response: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    resolved: 'bg-green-100 text-green-800 border-green-200',
    closed: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  // Fetch tickets with current filters
  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: '50',
        offset: '0',
        sortBy,
        sortOrder,
      });

      // Add filters to params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) {
          params.append(key, value.toString());
        }
      });

      const response = await fetch(`/api/tickets?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch tickets: ${response.statusText}`);
      }

      const data = await response.json();

      setTickets(data.tickets || []);
      setStats(data.summary || null);

      console.log(`Loaded ${data.tickets?.length || 0} tickets`);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, sortOrder, supabase]);

  // Set up real-time subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('ticket_dashboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'support_tickets',
        },
        (payload) => {
          console.log('Real-time ticket update:', payload);

          if (payload.eventType === 'INSERT') {
            // Add new ticket
            fetchTickets();
          } else if (payload.eventType === 'UPDATE') {
            // Update existing ticket
            setTickets((prev) =>
              prev.map((ticket) =>
                ticket.id === payload.new.id
                  ? { ...ticket, ...payload.new }
                  : ticket,
              ),
            );
          } else if (payload.eventType === 'DELETE') {
            // Remove deleted ticket
            setTickets((prev) =>
              prev.filter((ticket) => ticket.id !== payload.old.id),
            );
          }
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ticket_messages',
        },
        (payload) => {
          console.log('New ticket message:', payload);
          // Update message count and last activity
          setTickets((prev) =>
            prev.map((ticket) =>
              ticket.id === payload.new.ticket_id
                ? {
                    ...ticket,
                    messageCount: ticket.messageCount + 1,
                    lastActivity: payload.new.created_at,
                  }
                : ticket,
            ),
          );
        },
      )
      .subscribe();

    setRealtimeChannel(channel);

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [supabase, fetchTickets]);

  // Initial load
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Filter handlers
  const handleFilterChange = (key: keyof DashboardFilters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

  // Selection handlers
  const handleTicketSelect = (ticketId: string, selected: boolean) => {
    setSelectedTickets((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(ticketId);
      } else {
        newSet.delete(ticketId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedTickets(new Set(tickets.map((t) => t.id)));
    } else {
      setSelectedTickets(new Set());
    }
  };

  // Bulk operations
  const handleBulkAssign = async (agentId: string) => {
    if (selectedTickets.size === 0) return;

    try {
      const response = await fetch('/api/tickets', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketIds: Array.from(selectedTickets),
          updates: { assigned_agent_id: agentId },
        }),
      });

      if (response.ok) {
        fetchTickets();
        setSelectedTickets(new Set());
      }
    } catch (error) {
      console.error('Bulk assign failed:', error);
    }
  };

  // Quick actions
  const handleQuickAction = async (
    ticketId: string,
    action: string,
    value?: any,
  ) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [action]: value }),
      });

      if (response.ok) {
        fetchTickets();
      }
    } catch (error) {
      console.error(`Quick action ${action} failed:`, error);
    }
  };

  // Filtered and sorted tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (
          !ticket.smart_ticket_id.toLowerCase().includes(searchLower) &&
          !ticket.subject.toLowerCase().includes(searchLower) &&
          !ticket.user_profiles.full_name.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [tickets, filters.search]);

  // Statistics
  const dashboardStats = useMemo(() => {
    if (!stats) return null;

    return {
      ...stats,
      breachedSLA: tickets.filter(
        (t) =>
          t.slaStatus?.isResponseBreached || t.slaStatus?.isResolutionBreached,
      ).length,
      unassigned: tickets.filter((t) => !t.support_agents).length,
    };
  }, [stats, tickets]);

  // Get SLA urgency color
  const getSLAUrgencyColor = (ticket: Ticket) => {
    if (!ticket.slaStatus) return '';

    const maxUsed = Math.max(
      ticket.slaStatus.responseTimeUsed || 0,
      ticket.slaStatus.resolutionTimeUsed || 0,
    );

    if (maxUsed >= 100) return 'text-red-600';
    if (maxUsed >= 90) return 'text-orange-600';
    if (maxUsed >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading && tickets.length === 0) {
    return (
      <div className="p-6 space-y-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Support Dashboard
          </h1>
          <p className="text-gray-600">Manage and monitor support tickets</p>
        </div>

        <div className="flex items-center gap-4">
          {selectedTickets.size > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedTickets.size} selected
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkAssign('agent_id')}
              >
                Bulk Assign
              </Button>
            </div>
          )}

          <Button onClick={fetchTickets} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {dashboardStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Tickets
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{dashboardStats.total}</div>
              <p className="text-xs text-muted-foreground">
                {dashboardStats.byStatus.open} open
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Wedding Emergencies
              </CardTitle>
              <Heart className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {dashboardStats.weddingEmergencies}
              </div>
              <p className="text-xs text-muted-foreground">
                Require immediate attention
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                SLA Breaches
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {dashboardStats.breachedSLA}
              </div>
              <p className="text-xs text-muted-foreground">Need escalation</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
              <User className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {dashboardStats.unassigned}
              </div>
              <p className="text-xs text-muted-foreground">Need assignment</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Ticket ID, subject, or customer..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="pending_response">
                    Pending Response
                  </SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={filters.priority}
                onValueChange={(value) => handleFilterChange('priority', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All priorities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">User Tier</label>
              <Select
                value={filters.userTier}
                onValueChange={(value) => handleFilterChange('userTier', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All tiers</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Sort by:</span>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="created_at">Created</SelectItem>
                  <SelectItem value="updated_at">Updated</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="escalation_level">Escalation</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')
                }
              >
                {sortOrder === 'desc' ? '↓' : '↑'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <XCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              Tickets ({filteredTickets.length})
            </CardTitle>

            <div className="flex items-center gap-2">
              <Checkbox
                checked={
                  selectedTickets.size === filteredTickets.length &&
                  filteredTickets.length > 0
                }
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {loading ? 'Loading tickets...' : 'No tickets found'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className={`p-4 rounded-lg border transition-colors hover:bg-gray-50 ${
                    ticket.is_wedding_emergency
                      ? 'border-red-200 bg-red-50'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Checkbox
                        checked={selectedTickets.has(ticket.id)}
                        onCheckedChange={(checked) =>
                          handleTicketSelect(ticket.id, !!checked)
                        }
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-mono text-sm text-gray-600">
                            {ticket.smart_ticket_id}
                          </span>

                          {ticket.is_wedding_emergency && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              <Heart className="h-3 w-3 mr-1" />
                              Wedding Emergency
                            </Badge>
                          )}

                          <Badge className={priorityColors[ticket.priority]}>
                            {ticket.priority}
                          </Badge>

                          <Badge className={statusColors[ticket.status]}>
                            {ticket.status.replace('_', ' ')}
                          </Badge>

                          {ticket.escalation_level > 0 && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                              Level {ticket.escalation_level}
                            </Badge>
                          )}
                        </div>

                        <h3 className="font-medium text-gray-900 truncate mb-1">
                          {ticket.subject}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {ticket.user_profiles.full_name}
                          </span>

                          <span className="flex items-center gap-1">
                            <Tag className="h-4 w-4" />
                            {ticket.user_profiles.user_tier}
                          </span>

                          {ticket.support_agents && (
                            <span className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              Assigned to {ticket.support_agents.full_name}
                            </span>
                          )}

                          <span className="flex items-center gap-1">
                            <MessageSquare className="h-4 w-4" />
                            {ticket.messageCount} messages
                          </span>

                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(ticket.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        {/* SLA Progress */}
                        {ticket.slaStatus && (
                          <div className="mt-2">
                            <div className="flex items-center gap-2 text-xs">
                              <span className={getSLAUrgencyColor(ticket)}>
                                SLA:{' '}
                                {Math.max(
                                  ticket.slaStatus.responseTimeUsed || 0,
                                  ticket.slaStatus.resolutionTimeUsed || 0,
                                ).toFixed(0)}
                                % used
                              </span>

                              {(ticket.slaStatus.isResponseBreached ||
                                ticket.slaStatus.isResolutionBreached) && (
                                <Badge className="bg-red-100 text-red-800 border-red-200">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Breached
                                </Badge>
                              )}
                            </div>

                            <Progress
                              value={Math.max(
                                ticket.slaStatus.responseTimeUsed || 0,
                                ticket.slaStatus.resolutionTimeUsed || 0,
                              )}
                              className="mt-1 h-2"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(`/tickets/${ticket.id}`, '_blank')
                        }
                      >
                        <Eye className="h-4 w-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {ticket.status === 'open' && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleQuickAction(
                                  ticket.id,
                                  'status',
                                  'in_progress',
                                )
                              }
                            >
                              <Zap className="h-4 w-4 mr-2" />
                              Start Progress
                            </DropdownMenuItem>
                          )}

                          {ticket.status !== 'resolved' && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleQuickAction(
                                  ticket.id,
                                  'status',
                                  'resolved',
                                )
                              }
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Resolved
                            </DropdownMenuItem>
                          )}

                          {ticket.escalation_level < 3 && (
                            <DropdownMenuItem
                              onClick={() =>
                                handleQuickAction(
                                  ticket.id,
                                  'escalationLevel',
                                  ticket.escalation_level + 1,
                                )
                              }
                            >
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Escalate
                            </DropdownMenuItem>
                          )}

                          <DropdownMenuSeparator />

                          <DropdownMenuItem
                            onClick={() =>
                              handleQuickAction(ticket.id, 'status', 'closed')
                            }
                            className="text-red-600"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Close Ticket
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
