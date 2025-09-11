/**
 * Support Metrics Dashboard
 * WS-235: Support Operations Ticket Management System
 *
 * Comprehensive dashboard for tracking support performance metrics
 * Features:
 * - Agent performance tracking
 * - SLA compliance monitoring
 * - Ticket volume and trends
 * - Customer satisfaction metrics
 * - Wedding emergency response times
 * - Template usage analytics
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Clock,
  TrendingUp,
  TrendingDown,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Target,
  Award,
  Calendar,
  RefreshCw,
  Download,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for metrics
interface AgentMetrics {
  agent_id: string;
  agent_name: string;
  agent_email: string;
  tickets_assigned: number;
  tickets_resolved: number;
  avg_response_time: number;
  avg_resolution_time: number;
  sla_compliance_rate: number;
  customer_satisfaction: number;
  templates_used: number;
  escalations_received: number;
  wedding_emergencies_handled: number;
  status: 'online' | 'offline' | 'busy';
  shift_start?: string;
  shift_end?: string;
}

interface SystemMetrics {
  total_tickets: number;
  total_resolved: number;
  total_pending: number;
  total_escalated: number;
  avg_response_time: number;
  avg_resolution_time: number;
  sla_compliance_rate: number;
  customer_satisfaction: number;
  wedding_emergencies: number;
  weekend_tickets: number;
  tier_breakdown: Record<string, number>;
  category_breakdown: Record<string, number>;
}

interface TrendData {
  date: string;
  tickets_created: number;
  tickets_resolved: number;
  response_time: number;
  satisfaction_score: number;
}

interface MetricsDashboardProps {
  className?: string;
}

export default function MetricsDashboard({ className }: MetricsDashboardProps) {
  const [agentMetrics, setAgentMetrics] = useState<AgentMetrics[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics | null>(
    null,
  );
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>(
    '7d',
  );
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load metrics data
  const loadMetrics = async () => {
    setLoading(true);
    try {
      const [agentsRes, systemRes, trendsRes] = await Promise.all([
        fetch(`/api/support/metrics/agents?range=${timeRange}`),
        fetch(`/api/support/metrics/system?range=${timeRange}`),
        fetch(`/api/support/metrics/trends?range=${timeRange}`),
      ]);

      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgentMetrics(agentsData.agents || []);
      }

      if (systemRes.ok) {
        const systemData = await systemRes.json();
        setSystemMetrics(systemData.metrics);
      }

      if (trendsRes.ok) {
        const trendsData = await trendsRes.json();
        setTrendData(trendsData.trends || []);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [timeRange]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(loadMetrics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [timeRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'busy':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-gray-400';
      default:
        return 'bg-gray-400';
    }
  };

  const getPerformanceColor = (score: number, threshold: number = 80) => {
    if (score >= threshold) return 'text-green-600';
    if (score >= threshold * 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const formatPercentage = (value: number) => `${Math.round(value)}%`;

  const renderSystemOverview = () => {
    if (!systemMetrics) return null;

    const metrics = [
      {
        title: 'Total Tickets',
        value: systemMetrics.total_tickets,
        icon: MessageSquare,
        description: `${systemMetrics.total_resolved} resolved`,
        trend:
          (systemMetrics.total_resolved / systemMetrics.total_tickets) * 100,
      },
      {
        title: 'Avg Response Time',
        value: formatTime(systemMetrics.avg_response_time),
        icon: Clock,
        description: 'Target: 15min (Enterprise)',
        color:
          systemMetrics.avg_response_time <= 15
            ? 'text-green-600'
            : 'text-red-600',
      },
      {
        title: 'SLA Compliance',
        value: formatPercentage(systemMetrics.sla_compliance_rate),
        icon: Target,
        description: 'Target: 95%',
        color: getPerformanceColor(systemMetrics.sla_compliance_rate, 95),
      },
      {
        title: 'Customer Satisfaction',
        value: systemMetrics.customer_satisfaction.toFixed(1),
        icon: Heart,
        description: 'Out of 5.0',
        color: getPerformanceColor(
          systemMetrics.customer_satisfaction * 20,
          80,
        ),
      },
      {
        title: 'Wedding Emergencies',
        value: systemMetrics.wedding_emergencies,
        icon: AlertTriangle,
        description: 'Critical priority',
        color:
          systemMetrics.wedding_emergencies > 0
            ? 'text-red-600'
            : 'text-green-600',
      },
      {
        title: 'Weekend Tickets',
        value: systemMetrics.weekend_tickets,
        icon: Calendar,
        description: 'Saturday & Sunday',
        color: 'text-blue-600',
      },
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className={cn('text-2xl font-bold', metric.color)}>
                    {metric.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </div>
                <metric.icon className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderAgentPerformance = () => {
    const sortedAgents = [...agentMetrics].sort(
      (a, b) => b.sla_compliance_rate - a.sla_compliance_rate,
    );

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium">Agent Performance</h3>
          <Badge variant="secondary">
            {agentMetrics.filter((a) => a.status === 'online').length} online
          </Badge>
        </div>

        <div className="grid gap-4">
          {sortedAgents.map((agent, index) => (
            <Card key={agent.agent_id} className="relative">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-medium">
                        {agent.agent_name.charAt(0).toUpperCase()}
                      </div>
                      <div
                        className={cn(
                          'absolute -top-1 -right-1 w-3 h-3 rounded-full',
                          getStatusColor(agent.status),
                        )}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{agent.agent_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {agent.agent_email}
                      </p>
                    </div>
                  </div>

                  {index < 3 && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Award className="w-3 h-3 mr-1" />
                      Top {index + 1}
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Tickets</p>
                    <p className="font-medium">
                      {agent.tickets_resolved}/{agent.tickets_assigned}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Response</p>
                    <p className="font-medium">
                      {formatTime(agent.avg_response_time)}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Resolution</p>
                    <p className="font-medium">
                      {formatTime(agent.avg_resolution_time)}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">SLA</p>
                    <p
                      className={cn(
                        'font-medium',
                        getPerformanceColor(agent.sla_compliance_rate, 95),
                      )}
                    >
                      {formatPercentage(agent.sla_compliance_rate)}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">CSAT</p>
                    <p
                      className={cn(
                        'font-medium',
                        getPerformanceColor(
                          agent.customer_satisfaction * 20,
                          80,
                        ),
                      )}
                    >
                      {agent.customer_satisfaction.toFixed(1)}
                    </p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Templates</p>
                    <p className="font-medium">{agent.templates_used}</p>
                  </div>

                  <div>
                    <p className="text-muted-foreground">Emergencies</p>
                    <p
                      className={cn(
                        'font-medium',
                        agent.wedding_emergencies_handled > 0
                          ? 'text-red-600'
                          : '',
                      )}
                    >
                      {agent.wedding_emergencies_handled}
                    </p>
                  </div>
                </div>

                {agent.escalations_received > 0 && (
                  <div className="mt-3 p-2 bg-yellow-50 rounded-md">
                    <p className="text-xs text-yellow-800">
                      {agent.escalations_received} escalations received this
                      period
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderTierAnalysis = () => {
    if (!systemMetrics) return null;

    const tiers = Object.entries(systemMetrics.tier_breakdown).map(
      ([tier, count]) => ({
        tier: tier.charAt(0).toUpperCase() + tier.slice(1),
        count,
        percentage: (count / systemMetrics.total_tickets) * 100,
      }),
    );

    const categories = Object.entries(systemMetrics.category_breakdown).map(
      ([category, count]) => ({
        category: category
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (l) => l.toUpperCase()),
        count,
        percentage: (count / systemMetrics.total_tickets) * 100,
      }),
    );

    return (
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Tickets by Customer Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {tiers.map((tier) => (
                <div
                  key={tier.tier}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm">{tier.tier}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${tier.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{tier.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tickets by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categories.map((category) => (
                <div
                  key={category.category}
                  className="flex justify-between items-center"
                >
                  <span className="text-sm">{category.category}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${category.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {category.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Support Metrics</h2>
          <p className="text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={timeRange}
            onValueChange={(value: any) => setTimeRange(value)}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={loadMetrics}
            disabled={loading}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </Button>

          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {loading && !systemMetrics && (
        <div className="text-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading metrics...</p>
        </div>
      )}

      {systemMetrics && (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="agents">Agents</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {renderSystemOverview()}
          </TabsContent>

          <TabsContent value="agents" className="space-y-6">
            {renderAgentPerformance()}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {renderTierAnalysis()}
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Track key metrics over time to identify patterns and
                  improvement opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  Trend charts would be implemented here using a charting
                  library like Recharts
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
