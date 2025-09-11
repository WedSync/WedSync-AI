'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Clock,
  AlertTriangle,
  Heart,
  User,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  UserCheck,
  Timer,
  Zap,
  Bell,
  Volume2,
  VolumeX,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';

interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'waiting_response' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical' | 'wedding_day';
  category: string;
  subcategory?: string;
  tags: string[];
  customer_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  assigned_agent_id?: string;
  assigned_agent_name?: string;
  created_at: string;
  updated_at: string;
  due_at?: string;
  first_response_at?: string;
  resolved_at?: string;
  wedding_date?: string;
  days_until_wedding?: number;
  organization_id: string;
  ai_category?: string;
  ai_priority?: string;
  ai_sentiment?: 'positive' | 'neutral' | 'negative';
  is_escalated: boolean;
  escalation_reason?: string;
  sla_breach_risk: 'low' | 'medium' | 'high' | 'critical';
  unread_messages?: number;
}

interface QueueFilters {
  status: string[];
  priority: string[];
  category: string[];
  assigned: string; // 'all', 'assigned', 'unassigned', 'mine'
  search: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  timeRange: string; // 'today', 'week', 'month', 'all'
  weddingUrgency: string; // 'all', 'today', 'tomorrow', 'weekend', 'week'
}

const PRIORITY_COLORS = {
  low: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-blue-100 text-blue-800 border-blue-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
  wedding_day: 'bg-pink-100 text-pink-800 border-pink-200 animate-pulse',
};

const STATUS_COLORS = {
  open: 'bg-gray-100 text-gray-800 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  waiting_response: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

export default function TicketQueue() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentAgent, setCurrentAgent] = useState<any>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);

  const [filters, setFilters] = useState<QueueFilters>({
    status: ['open', 'in_progress', 'waiting_response'],
    priority: [],
    category: [],
    assigned: 'all',
    search: '',
    sortBy: 'priority_score',
    sortOrder: 'desc',
    timeRange: 'all',
    weddingUrgency: 'all',
  });

  const supabase = createClient();

  // Load tickets and set up real-time subscription
  useEffect(() => {
    loadTickets();
    setupRealtimeSubscription();

    // Auto-refresh interval
    let intervalId: NodeJS.Timeout;
    if (autoRefresh) {
      intervalId = setInterval(loadTickets, refreshInterval);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [autoRefresh, refreshInterval]);

  // Get current user
  useEffect(() => {
    getCurrentAgent();
  }, []);

  const getCurrentAgent = async () => {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      if (user) {
        setCurrentAgent({
          id: user.id,
          name: user.user_metadata?.full_name || user.email,
          email: user.email,
        });
      }
    } catch (error) {
      console.error('Error getting current agent:', error);
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('support_tickets')
        .select(
          `
          *,
          organization:organizations(name),
          assigned_agent:support_agents(name, email),
          _count_messages:support_ticket_messages(count)
        `,
        )
        .order('created_at', { ascending: false });

      // Apply status filter
      if (filters.status.length > 0) {
        query = query.in('status', filters.status);
      }

      // Apply priority filter
      if (filters.priority.length > 0) {
        query = query.in('priority', filters.priority);
      }

      // Apply assignment filter
      if (filters.assigned === 'unassigned') {
        query = query.is('assigned_agent_id', null);
      } else if (filters.assigned === 'mine' && currentAgent) {
        query = query.eq('assigned_agent_id', currentAgent.id);
      } else if (filters.assigned === 'assigned') {
        query = query.not('assigned_agent_id', 'is', null);
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,description.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`,
        );
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process tickets with calculated fields
      const processedTickets =
        data?.map((ticket) => ({
          ...ticket,
          unread_messages: ticket._count_messages?.length || 0,
          priority_score: calculatePriorityScore(ticket),
          sla_breach_risk: calculateSLABreachRisk(ticket),
          days_until_wedding: ticket.wedding_date
            ? Math.ceil(
                (new Date(ticket.wedding_date).getTime() -
                  new Date().getTime()) /
                  (1000 * 60 * 60 * 24),
              )
            : null,
        })) || [];

      setTickets(processedTickets);
    } catch (error: any) {
      console.error('Error loading tickets:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculatePriorityScore = (ticket: any): number => {
    let score = 0;

    // Base priority score
    const priorityScores = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
      wedding_day: 5,
    };
    score +=
      priorityScores[ticket.priority as keyof typeof priorityScores] || 1;

    // Wedding proximity bonus
    if (ticket.wedding_date) {
      const daysUntil = Math.ceil(
        (new Date(ticket.wedding_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24),
      );
      if (daysUntil <= 1) score += 5;
      else if (daysUntil <= 7) score += 3;
      else if (daysUntil <= 30) score += 1;
    }

    // Escalation bonus
    if (ticket.is_escalated) score += 2;

    // Age penalty
    const hoursOld =
      (new Date().getTime() - new Date(ticket.created_at).getTime()) /
      (1000 * 60 * 60);
    if (hoursOld > 24) score += 1;
    if (hoursOld > 72) score += 2;

    return score;
  };

  const calculateSLABreachRisk = (
    ticket: any,
  ): 'low' | 'medium' | 'high' | 'critical' => {
    if (!ticket.due_at) return 'low';

    const now = new Date();
    const dueDate = new Date(ticket.due_at);
    const hoursRemaining =
      (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursRemaining < 0) return 'critical';
    if (hoursRemaining < 2) return 'high';
    if (hoursRemaining < 8) return 'medium';
    return 'low';
  };

  const setupRealtimeSubscription = () => {
    const subscription = supabase
      .channel('support_tickets_queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        (payload) => {
          console.log('Realtime ticket update:', payload);

          // Play notification sound for new tickets or escalations
          if (
            payload.eventType === 'INSERT' ||
            (payload.eventType === 'UPDATE' &&
              payload.new.is_escalated &&
              !payload.old.is_escalated)
          ) {
            playNotificationSound(payload.new.priority);
          }

          // Refresh tickets
          loadTickets();
        },
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  };

  const playNotificationSound = (priority: string) => {
    if (!audioEnabled) return;

    // Different sounds for different priorities
    const audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Wedding day and critical get urgent sound
    if (priority === 'wedding_day' || priority === 'critical') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
    } else {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    }

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5,
    );

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  // Filter and sort tickets
  const filteredAndSortedTickets = useMemo(() => {
    let filtered = [...tickets];

    // Apply wedding urgency filter
    if (filters.weddingUrgency !== 'all') {
      const now = new Date();
      filtered = filtered.filter((ticket) => {
        if (!ticket.wedding_date) return false;
        const daysUntil = Math.ceil(
          (new Date(ticket.wedding_date).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        switch (filters.weddingUrgency) {
          case 'today':
            return daysUntil === 0;
          case 'tomorrow':
            return daysUntil === 1;
          case 'weekend':
            return (
              daysUntil <= 2 &&
              [0, 6].includes(new Date(ticket.wedding_date).getDay())
            );
          case 'week':
            return daysUntil <= 7;
          default:
            return true;
        }
      });
    }

    // Apply category filter
    if (filters.category.length > 0) {
      filtered = filtered.filter((ticket) =>
        filters.category.includes(ticket.category),
      );
    }

    // Sort tickets
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (filters.sortBy) {
        case 'priority_score':
          compareValue = a.priority_score - b.priority_score;
          break;
        case 'created_at':
          compareValue =
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'updated_at':
          compareValue =
            new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
          break;
        case 'wedding_date':
          if (!a.wedding_date && !b.wedding_date) compareValue = 0;
          else if (!a.wedding_date) compareValue = 1;
          else if (!b.wedding_date) compareValue = -1;
          else
            compareValue =
              new Date(a.wedding_date).getTime() -
              new Date(b.wedding_date).getTime();
          break;
        case 'customer_name':
          compareValue = a.customer_name.localeCompare(b.customer_name);
          break;
        default:
          compareValue = a.priority_score - b.priority_score;
      }

      return filters.sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return filtered;
  }, [tickets, filters]);

  // Group tickets by status for tabs
  const groupedTickets = useMemo(() => {
    const groups = {
      urgent: filteredAndSortedTickets.filter(
        (t) =>
          t.priority === 'wedding_day' ||
          t.priority === 'critical' ||
          t.sla_breach_risk === 'critical',
      ),
      assigned_to_me: filteredAndSortedTickets.filter(
        (t) => t.assigned_agent_id === currentAgent?.id,
      ),
      unassigned: filteredAndSortedTickets.filter((t) => !t.assigned_agent_id),
      all: filteredAndSortedTickets,
    };

    return groups;
  }, [filteredAndSortedTickets, currentAgent]);

  const assignTicketToMe = async (ticketId: string) => {
    if (!currentAgent) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_agent_id: currentAgent.id,
          status: 'in_progress',
        })
        .eq('id', ticketId);

      if (error) throw error;

      // Refresh tickets
      loadTickets();
    } catch (error) {
      console.error('Error assigning ticket:', error);
    }
  };

  const updateTicketStatus = async (ticketId: string, status: string) => {
    try {
      const updates: any = { status };

      // Set timestamps based on status
      if (status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticketId);

      if (error) throw error;

      // Refresh tickets
      loadTickets();
    } catch (error) {
      console.error('Error updating ticket status:', error);
    }
  };

  const bulkAssignTickets = async (agentId: string) => {
    if (selectedTickets.length === 0) return;

    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({ assigned_agent_id: agentId })
        .in('id', selectedTickets);

      if (error) throw error;

      setSelectedTickets([]);
      loadTickets();
    } catch (error) {
      console.error('Error bulk assigning tickets:', error);
    }
  };

  const renderTicketCard = (ticket: SupportTicket) => (
    <Card
      key={ticket.id}
      className="mb-3 hover:shadow-md transition-shadow cursor-pointer"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={selectedTickets.includes(ticket.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedTickets([...selectedTickets, ticket.id]);
                  } else {
                    setSelectedTickets(
                      selectedTickets.filter((id) => id !== ticket.id),
                    );
                  }
                }}
                className="rounded border-gray-300"
              />

              <Badge className={PRIORITY_COLORS[ticket.priority]}>
                {ticket.priority === 'wedding_day' && (
                  <Heart className="w-3 h-3 mr-1" />
                )}
                {ticket.priority}
              </Badge>

              <Badge className={STATUS_COLORS[ticket.status]}>
                {ticket.status.replace('_', ' ')}
              </Badge>

              {ticket.sla_breach_risk === 'critical' && (
                <Badge className="bg-red-100 text-red-800 border-red-200 animate-pulse">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  SLA BREACH
                </Badge>
              )}

              {ticket.is_escalated && (
                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                  <Zap className="w-3 h-3 mr-1" />
                  Escalated
                </Badge>
              )}
            </div>

            <CardTitle className="text-lg mb-1 line-clamp-2">
              {ticket.title}
            </CardTitle>

            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {ticket.customer_name}
              </div>

              <div className="flex items-center gap-1">
                <Mail className="w-4 h-4" />
                {ticket.customer_email}
              </div>

              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {format(new Date(ticket.created_at), 'MMM dd, HH:mm')}
              </div>
            </div>

            {ticket.wedding_date && (
              <div className="flex items-center gap-1 text-sm text-pink-600 mb-2">
                <Calendar className="w-4 h-4" />
                Wedding: {format(new Date(ticket.wedding_date), 'MMM dd, yyyy')}
                {ticket.days_until_wedding !== null && (
                  <span
                    className={
                      ticket.days_until_wedding <= 1
                        ? 'font-semibold text-red-600'
                        : ''
                    }
                  >
                    ({ticket.days_until_wedding} days)
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            {ticket.due_at && (
              <div
                className={`text-xs px-2 py-1 rounded ${
                  ticket.sla_breach_risk === 'critical'
                    ? 'bg-red-100 text-red-800'
                    : ticket.sla_breach_risk === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600'
                }`}
              >
                <Timer className="w-3 h-3 inline mr-1" />
                Due: {format(new Date(ticket.due_at), 'HH:mm')}
              </div>
            )}

            {ticket.unread_messages > 0 && (
              <Badge className="bg-blue-100 text-blue-800">
                <MessageSquare className="w-3 h-3 mr-1" />
                {ticket.unread_messages} new
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {ticket.assigned_agent_id ? (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <UserCheck className="w-4 h-4" />
                {ticket.assigned_agent_name || 'Assigned'}
              </div>
            ) : (
              <Button
                size="sm"
                onClick={() => assignTicketToMe(ticket.id)}
                disabled={!currentAgent}
                className="h-8"
              >
                <UserCheck className="w-4 h-4 mr-1" />
                Assign to Me
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={ticket.status}
              onValueChange={(status) => updateTicketStatus(ticket.id, status)}
            >
              <SelectTrigger className="h-8 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting_response">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                window.open(`/support/tickets/${ticket.id}`, '_blank')
              }
              className="h-8"
            >
              View
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">Support Queue</h1>

          <Button
            variant="outline"
            size="sm"
            onClick={loadTickets}
            disabled={loading}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAudioEnabled(!audioEnabled)}
            >
              {audioEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Queue Settings</DialogTitle>
                  <DialogDescription>
                    Configure your queue preferences
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Auto Refresh</label>
                    <input
                      type="checkbox"
                      checked={autoRefresh}
                      onChange={(e) => setAutoRefresh(e.target.checked)}
                      className="rounded"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium">
                      Refresh Interval (seconds)
                    </label>
                    <Input
                      type="number"
                      value={refreshInterval / 1000}
                      onChange={(e) =>
                        setRefreshInterval(Number(e.target.value) * 1000)
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {selectedTickets.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              {selectedTickets.length} selected
            </span>
            <Button
              size="sm"
              onClick={() => bulkAssignTickets(currentAgent?.id)}
              disabled={!currentAgent}
            >
              Assign to Me
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedTickets([])}
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Search</label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Search tickets..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="pl-9"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Assignment
              </label>
              <Select
                value={filters.assigned}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, assigned: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tickets</SelectItem>
                  <SelectItem value="mine">My Tickets</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Wedding Urgency
              </label>
              <Select
                value={filters.weddingUrgency}
                onValueChange={(value) =>
                  setFilters((prev) => ({ ...prev, weddingUrgency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="tomorrow">Tomorrow</SelectItem>
                  <SelectItem value="weekend">This Weekend</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Sort By</label>
              <div className="flex gap-1">
                <Select
                  value={filters.sortBy}
                  onValueChange={(value) =>
                    setFilters((prev) => ({ ...prev, sortBy: value }))
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="priority_score">
                      Priority Score
                    </SelectItem>
                    <SelectItem value="created_at">Created</SelectItem>
                    <SelectItem value="updated_at">Updated</SelectItem>
                    <SelectItem value="wedding_date">Wedding Date</SelectItem>
                    <SelectItem value="customer_name">Customer</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc',
                    }))
                  }
                  className="px-3"
                >
                  {filters.sortOrder === 'asc' ? (
                    <SortAsc className="w-4 h-4" />
                  ) : (
                    <SortDesc className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Tabs */}
      <Tabs defaultValue="urgent" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="urgent" className="relative">
            Urgent ({groupedTickets.urgent.length})
            {groupedTickets.urgent.length > 0 && (
              <Badge className="ml-2 bg-red-500 text-white text-xs">
                {
                  groupedTickets.urgent.filter(
                    (t) => t.priority === 'wedding_day',
                  ).length
                }
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="assigned_to_me">
            My Tickets ({groupedTickets.assigned_to_me.length})
          </TabsTrigger>
          <TabsTrigger value="unassigned">
            Unassigned ({groupedTickets.unassigned.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({groupedTickets.all.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="urgent" className="mt-6">
          {groupedTickets.urgent.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No urgent tickets - great job! 🎉
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Wedding Day Emergencies First */}
              {groupedTickets.urgent
                .filter((t) => t.priority === 'wedding_day')
                .map(renderTicketCard)}

              {groupedTickets.urgent.filter((t) => t.priority === 'wedding_day')
                .length > 0 &&
                groupedTickets.urgent.filter(
                  (t) => t.priority !== 'wedding_day',
                ).length > 0 && <Separator />}

              {/* Other Urgent Tickets */}
              {groupedTickets.urgent
                .filter((t) => t.priority !== 'wedding_day')
                .map(renderTicketCard)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="assigned_to_me" className="mt-6">
          {groupedTickets.assigned_to_me.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No tickets assigned to you
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {groupedTickets.assigned_to_me.map(renderTicketCard)}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="unassigned" className="mt-6">
          {groupedTickets.unassigned.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center text-gray-500">
                No unassigned tickets
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {groupedTickets.unassigned.map(renderTicketCard)}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-6">
          <ScrollArea className="h-[600px]">
            <div className="space-y-4 pr-4">
              {groupedTickets.all.map(renderTicketCard)}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
