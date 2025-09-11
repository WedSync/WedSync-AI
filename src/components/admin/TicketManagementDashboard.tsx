'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Users,
  Calendar,
  Filter,
  Search,
  BarChart3,
  Settings,
  Bell,
  Heart,
  Star,
  TrendingUp,
  MessageSquare,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent' | 'wedding_emergency';
  category: string;
  subcategory: string;
  created_at: string;
  updated_at: string;
  sla_due_at: string;
  customer_name: string;
  customer_tier: 'free' | 'starter' | 'professional' | 'scale' | 'enterprise';
  assigned_agent: string | null;
  tags: string[];
  is_wedding_emergency: boolean;
  ai_confidence: number;
  response_time_minutes: number | null;
  resolution_time_hours: number | null;
}

interface DashboardStats {
  total_tickets: number;
  open_tickets: number;
  sla_breaches: number;
  avg_response_time: number;
  wedding_emergencies: number;
  resolution_rate: number;
  customer_satisfaction: number;
  tier_distribution: Record<string, number>;
}

export default function TicketManagementDashboard() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<string>('today');

  // Load dashboard data
  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [timeFilter]);

  const loadDashboardData = async () => {
    try {
      const [ticketsResponse, statsResponse] = await Promise.all([
        fetch(
          '/api/admin/support/tickets?' +
            new URLSearchParams({
              status: selectedStatus,
              priority: selectedPriority,
              tier: selectedTier,
              timeframe: timeFilter,
              search: searchTerm,
            }),
        ),
        fetch(`/api/admin/support/stats?timeframe=${timeFilter}`),
      ]);

      if (ticketsResponse.ok && statsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        const statsData = await statsResponse.json();
        setTickets(ticketsData.tickets);
        setStats(statsData);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'wedding_emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'urgent':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-green-50 text-green-700 border-green-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'closed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'enterprise':
        return 'bg-purple-100 text-purple-800';
      case 'scale':
        return 'bg-blue-100 text-blue-800';
      case 'professional':
        return 'bg-green-100 text-green-800';
      case 'starter':
        return 'bg-yellow-100 text-yellow-800';
      case 'free':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60),
    );

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const isSlaBreach = (slaDate: string) => {
    return new Date(slaDate) < new Date();
  };

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Support Operations Center
          </h1>
          <p className="text-gray-600">
            Wedding industry support management dashboard
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="w-4 h-4 mr-2" />
            Reports
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Tickets
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.total_tickets}
                  </p>
                </div>
                <MessageSquare className="w-8 h-8 text-blue-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-green-600">
                  {stats.open_tickets} currently open
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    SLA Performance
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {(
                      (1 - stats.sla_breaches / stats.total_tickets) *
                      100
                    ).toFixed(1)}
                    %
                  </p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="mt-2">
                <span
                  className={`text-sm ${stats.sla_breaches > 0 ? 'text-red-600' : 'text-green-600'}`}
                >
                  {stats.sla_breaches} breaches
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Wedding Emergencies
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats.wedding_emergencies}
                  </p>
                </div>
                <Heart className="w-8 h-8 text-red-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">
                  Critical wedding day issues
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Satisfaction Score
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats.customer_satisfaction.toFixed(1)}/5.0
                  </p>
                </div>
                <Star className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="mt-2">
                <span className="text-sm text-green-600">
                  {stats.resolution_rate.toFixed(1)}% resolution rate
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search tickets, customers, or issues..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
                icon={<Search className="w-4 h-4" />}
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedPriority}
                onValueChange={setSelectedPriority}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="wedding_emergency">
                    Wedding Emergency
                  </SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                  <SelectItem value="scale">Scale</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="starter">Starter</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>

              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Time" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Support Tickets</span>
            <Badge variant="secondary">{tickets.length} tickets</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Ticket
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Customer
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Status
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Priority
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">
                    SLA
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Agent
                  </th>
                  <th className="text-left p-4 font-medium text-gray-900">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-start gap-3">
                        {ticket.is_wedding_emergency && (
                          <AlertTriangle className="w-4 h-4 text-red-500 mt-1 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">
                            {ticket.title}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {ticket.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">
                              #{ticket.id.slice(-8)}
                            </span>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(ticket.created_at)}
                            </span>
                            {ticket.ai_confidence && (
                              <>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-blue-600">
                                  AI: {Math.round(ticket.ai_confidence * 100)}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {ticket.customer_name}
                        </p>
                        <Badge
                          variant="secondary"
                          className={getTierColor(ticket.customer_tier)}
                        >
                          {ticket.customer_tier}
                        </Badge>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={getStatusColor(ticket.status)}
                      >
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge
                        variant="outline"
                        className={getPriorityColor(ticket.priority)}
                      >
                        {ticket.priority.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span
                          className={`text-sm ${
                            isSlaBreach(ticket.sla_due_at)
                              ? 'text-red-600 font-medium'
                              : 'text-gray-600'
                          }`}
                        >
                          {formatTimeAgo(ticket.sla_due_at)}
                        </span>
                        {isSlaBreach(ticket.sla_due_at) && (
                          <Badge variant="destructive" className="text-xs">
                            Breach
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      {ticket.assigned_agent ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-blue-700">
                              {ticket.assigned_agent.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-sm text-gray-900">
                            {ticket.assigned_agent}
                          </span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-gray-500">
                          Unassigned
                        </Badge>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {tickets.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tickets found
              </h3>
              <p className="text-gray-600">
                Try adjusting your filters or search terms.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wedding Emergency Alert */}
      {stats && stats.wedding_emergencies > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div className="flex-1">
                <h3 className="font-medium text-red-900">
                  {stats.wedding_emergencies} Wedding Day Emergency
                  {stats.wedding_emergencies > 1 ? 'ies' : 'y'} Active
                </h3>
                <p className="text-sm text-red-700">
                  Immediate attention required for live wedding events
                </p>
              </div>
              <Button
                size="sm"
                className="bg-red-600 text-white hover:bg-red-700"
              >
                <Bell className="w-4 h-4 mr-2" />
                View Emergencies
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
