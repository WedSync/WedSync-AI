'use client';

/**
 * Automated Monitoring Dashboard
 * Real-time security incident monitoring and notification management
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Bell,
  Phone,
  Mail,
  MessageSquare,
  Activity,
  PlayCircle,
  StopCircle,
  RefreshCw,
  Target,
  TrendingUp,
  Calendar,
  Heart,
  Zap,
} from 'lucide-react';

interface MonitoringStatus {
  monitoring: {
    isActive: boolean;
    triggersCount: number;
    uptime: number;
    lastCheck: string;
    organizationId: string;
  };
  notifications: {
    activeExecutions: number;
    totalRecipients: number;
    successfulDeliveries: number;
    failedDeliveries: number;
  };
  recentIncidents: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    lastIncident: string | null;
    triggersActive: number;
    responsiveness: 'optimal' | 'degraded' | 'poor';
  };
}

interface SecurityIncident {
  id: string;
  title: string;
  severity_level: 'critical' | 'high' | 'medium' | 'low';
  status: string;
  affected_wedding_count: number;
  affected_couple_count: number;
  affected_guest_count: number;
  created_at: string;
  incident_type: string;
  is_personal_data_breach: boolean;
}

interface NotificationExecution {
  id: string;
  workflowId: string;
  incidentId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  startTime: string;
  completionTime?: string;
  metrics: {
    totalRecipients: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    responseRate: number;
  };
  weddingContext: {
    isWeddingDay: boolean;
    urgencyLevel: string;
    affectedWeddingsCount: number;
  };
}

interface WeddingTrigger {
  id: string;
  name: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  weddingContext: string;
  responseActions: string[];
  notificationRequirements: {
    couples: boolean;
    guests: boolean;
    vendors: boolean;
    authorities: boolean;
    internal: boolean;
  };
  seasonalConsiderations: {
    peakSeasonEscalation: boolean;
    weddingDayProtocol: boolean;
  };
}

interface AutomatedMonitoringDashboardProps {
  organizationId: string;
}

export function AutomatedMonitoringDashboard({
  organizationId,
}: AutomatedMonitoringDashboardProps) {
  const [monitoringStatus, setMonitoringStatus] =
    useState<MonitoringStatus | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<SecurityIncident[]>(
    [],
  );
  const [activeNotifications, setActiveNotifications] = useState<
    NotificationExecution[]
  >([]);
  const [triggers, setTriggers] = useState<WeddingTrigger[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const refreshInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadMonitoringData();
    startAutoRefresh();

    return () => {
      if (refreshInterval.current) {
        clearInterval(refreshInterval.current);
      }
    };
  }, [organizationId]);

  const startAutoRefresh = () => {
    if (refreshInterval.current) {
      clearInterval(refreshInterval.current);
    }

    // Refresh every 15 seconds
    refreshInterval.current = setInterval(() => {
      loadMonitoringData();
    }, 15000);
  };

  const loadMonitoringData = async () => {
    try {
      const [statusRes, incidentsRes, notificationsRes, triggersRes] =
        await Promise.all([
          fetch(
            `/api/security/automated-monitoring?organizationId=${organizationId}&type=status`,
          ),
          fetch(
            `/api/security/automated-monitoring?organizationId=${organizationId}&type=recent_incidents`,
          ),
          fetch(
            `/api/security/automated-monitoring?organizationId=${organizationId}&type=active_notifications`,
          ),
          fetch(
            `/api/security/automated-monitoring?organizationId=${organizationId}&type=trigger_config`,
          ),
        ]);

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setMonitoringStatus(statusData);
      }

      if (incidentsRes.ok) {
        const incidentsData = await incidentsRes.json();
        setRecentIncidents(incidentsData.incidents || []);
      }

      if (notificationsRes.ok) {
        const notificationsData = await notificationsRes.json();
        setActiveNotifications(notificationsData.activeExecutions || []);
      }

      if (triggersRes.ok) {
        const triggersData = await triggersRes.json();
        setTriggers(triggersData.triggers || []);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMonitoring = async (enable: boolean) => {
    try {
      const action = enable ? 'start' : 'stop';
      const response = await fetch('/api/security/automated-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          organizationId,
        }),
      });

      if (response.ok) {
        await loadMonitoringData();
      } else {
        throw new Error('Failed to toggle monitoring');
      }
    } catch (error) {
      console.error('Error toggling monitoring:', error);
    }
  };

  const testNotificationWorkflow = async (incidentType: string) => {
    try {
      const response = await fetch('/api/security/automated-monitoring', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'test_notification',
          organizationId,
          testIncidentType: incidentType,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Test notification initiated:', result);
        await loadMonitoringData();
      } else {
        throw new Error('Failed to test notification');
      }
    } catch (error) {
      console.error('Error testing notification:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'critical':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      case 'phone':
        return <Phone className="h-4 w-4" />;
      case 'push':
        return <Bell className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="h-8 w-8 text-blue-600" />
            Automated Security Monitoring
          </h1>
          <p className="text-gray-600 mt-2">
            Real-time wedding data protection with automated incident response
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMonitoringData}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Monitoring Control */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Monitoring Control
            </span>
            {monitoringStatus && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Active</span>
                <Switch
                  checked={monitoringStatus.monitoring.isActive}
                  onCheckedChange={toggleMonitoring}
                />
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Control automated security monitoring for wedding platform
          </CardDescription>
        </CardHeader>
        {monitoringStatus && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${monitoringStatus.monitoring.isActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}
                />
                <div>
                  <div className="font-medium">
                    {monitoringStatus.monitoring.isActive
                      ? 'Active'
                      : 'Inactive'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {monitoringStatus.monitoring.isActive
                      ? `Uptime: ${formatUptime(monitoringStatus.monitoring.uptime)}`
                      : 'Monitoring stopped'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Target className="h-5 w-5 text-purple-600" />
                <div>
                  <div className="font-medium">
                    {monitoringStatus.monitoring.triggersCount} Triggers
                  </div>
                  <div className="text-sm text-gray-600">Wedding-specific</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-orange-600" />
                <div>
                  <div className="font-medium">
                    {monitoringStatus.notifications.activeExecutions} Active
                  </div>
                  <div className="text-sm text-gray-600">Notifications</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Heart
                  className={`h-5 w-5 ${getStatusColor(monitoringStatus.systemHealth.status)}`}
                />
                <div>
                  <div
                    className={`font-medium ${getStatusColor(monitoringStatus.systemHealth.status)}`}
                  >
                    {monitoringStatus.systemHealth.status
                      .charAt(0)
                      .toUpperCase() +
                      monitoringStatus.systemHealth.status.slice(1)}
                  </div>
                  <div className="text-sm text-gray-600">System Health</div>
                </div>
              </div>
            </div>

            {monitoringStatus.systemHealth.lastIncident && (
              <Alert className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Last incident:{' '}
                  {new Date(
                    monitoringStatus.systemHealth.lastIncident,
                  ).toLocaleString()}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        )}
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="incidents">Recent Incidents</TabsTrigger>
          <TabsTrigger value="notifications">Active Notifications</TabsTrigger>
          <TabsTrigger value="triggers">Security Triggers</TabsTrigger>
          <TabsTrigger value="testing">Testing & Validation</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Critical Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">
                  {
                    recentIncidents.filter(
                      (i) => i.severity_level === 'critical',
                    ).length
                  }
                </div>
                <p className="text-sm text-gray-600">Last 24 hours</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Affected Guests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {recentIncidents.reduce(
                    (sum, i) => sum + (i.affected_guest_count || 0),
                    0,
                  )}
                </div>
                <p className="text-sm text-gray-600">Total impacted</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Response Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {monitoringStatus
                    ? Math.round(
                        (monitoringStatus.notifications.successfulDeliveries /
                          Math.max(
                            monitoringStatus.notifications.totalRecipients,
                            1,
                          )) *
                          100,
                      )
                    : 0}
                  %
                </div>
                <p className="text-sm text-gray-600">Notification success</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity Stream */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Live security monitoring events</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {recentIncidents.slice(0, 10).map((incident) => (
                    <div
                      key={incident.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div
                        className={`w-3 h-3 rounded-full ${getSeverityColor(incident.severity_level)}`}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{incident.title}</div>
                        <div className="text-sm text-gray-600">
                          {incident.affected_couple_count} couples,{' '}
                          {incident.affected_guest_count} guests affected
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            incident.severity_level === 'critical'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {incident.severity_level}
                        </Badge>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(incident.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))}

                  {recentIncidents.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No recent incidents detected</p>
                      <p className="text-sm">Your wedding platform is secure</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="incidents" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Incidents</CardTitle>
              <CardDescription>
                Detailed view of security incidents and automated responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentIncidents.map((incident) => (
                  <div key={incident.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{incident.title}</h4>
                      <div className="flex items-center gap-2">
                        {incident.is_personal_data_breach && (
                          <Badge
                            variant="outline"
                            className="text-red-600 border-red-600"
                          >
                            Data Breach
                          </Badge>
                        )}
                        <Badge
                          className={`${getSeverityColor(incident.severity_level)} text-white`}
                        >
                          {incident.severity_level}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="font-medium">Type:</span>
                        <div className="capitalize">
                          {incident.incident_type.replace('_', ' ')}
                        </div>
                      </div>
                      <div>
                        <span className="font-medium">Status:</span>
                        <div className="capitalize">{incident.status}</div>
                      </div>
                      <div>
                        <span className="font-medium">Weddings:</span>
                        <div>{incident.affected_wedding_count}</div>
                      </div>
                      <div>
                        <span className="font-medium">Detected:</span>
                        <div>
                          {new Date(incident.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>👰 {incident.affected_couple_count} couples</span>
                      <span>👥 {incident.affected_guest_count} guests</span>
                      {incident.severity_level === 'critical' && (
                        <span className="text-red-600 font-medium">
                          ⚠️ Critical Response Active
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {recentIncidents.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-300" />
                    <p className="font-medium">No Security Incidents</p>
                    <p className="text-sm">
                      Your wedding platform is operating securely
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Active Notification Workflows</CardTitle>
              <CardDescription>
                Real-time status of automated notification executions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeNotifications.map((execution) => (
                  <div key={execution.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">
                        Workflow: {execution.workflowId.replace('_', ' ')}
                      </h4>
                      <Badge
                        variant={
                          execution.status === 'completed'
                            ? 'default'
                            : execution.status === 'running'
                              ? 'secondary'
                              : execution.status === 'failed'
                                ? 'destructive'
                                : 'outline'
                        }
                      >
                        {execution.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <span className="text-sm font-medium">Progress:</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress
                            value={(execution.currentStep / 4) * 100}
                            className="flex-1"
                          />
                          <span className="text-sm text-gray-600">
                            Step {execution.currentStep}/4
                          </span>
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium">Recipients:</span>
                        <div className="text-lg font-semibold text-blue-600">
                          {execution.metrics.totalRecipients}
                        </div>
                      </div>

                      <div>
                        <span className="text-sm font-medium">
                          Success Rate:
                        </span>
                        <div className="text-lg font-semibold text-green-600">
                          {execution.metrics.totalRecipients > 0
                            ? Math.round(
                                (execution.metrics.successfulDeliveries /
                                  execution.metrics.totalRecipients) *
                                  100,
                              )
                            : 0}
                          %
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>
                        🕒 Started:{' '}
                        {new Date(execution.startTime).toLocaleTimeString()}
                      </span>
                      {execution.weddingContext.isWeddingDay && (
                        <span className="text-red-600 font-medium">
                          💒 Wedding Day Protocol
                        </span>
                      )}
                      <span>
                        ⚡ {execution.weddingContext.urgencyLevel} Priority
                      </span>
                    </div>
                  </div>
                ))}

                {activeNotifications.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No Active Notifications</p>
                    <p className="text-sm">
                      Notification workflows will appear here when triggered
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="triggers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Wedding Security Triggers</CardTitle>
              <CardDescription>
                Automated detection rules for wedding-specific security threats
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {triggers.map((trigger) => (
                  <div key={trigger.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{trigger.name}</h4>
                      <Badge
                        className={`${getSeverityColor(trigger.severity)} text-white`}
                      >
                        {trigger.severity}
                      </Badge>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">
                      {trigger.description}
                    </p>

                    <div className="bg-blue-50 p-3 rounded-md mb-3">
                      <div className="text-sm font-medium text-blue-800 mb-1">
                        Wedding Context:
                      </div>
                      <div className="text-sm text-blue-700">
                        {trigger.weddingContext}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">
                          Notification Requirements:
                        </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(trigger.notificationRequirements)
                            .filter(([_, required]) => required)
                            .map(([type, _]) => (
                              <Badge
                                key={type}
                                variant="outline"
                                className="text-xs"
                              >
                                {type}
                              </Badge>
                            ))}
                        </div>
                      </div>

                      <div>
                        <span className="font-medium">Response Actions:</span>
                        <div className="text-gray-600 mt-1">
                          {trigger.responseActions.slice(0, 2).join(', ')}
                          {trigger.responseActions.length > 2 &&
                            ` +${trigger.responseActions.length - 2} more`}
                        </div>
                      </div>
                    </div>

                    {(trigger.seasonalConsiderations.peakSeasonEscalation ||
                      trigger.seasonalConsiderations.weddingDayProtocol) && (
                      <div className="mt-3 flex gap-2">
                        {trigger.seasonalConsiderations
                          .peakSeasonEscalation && (
                          <Badge variant="outline" className="text-xs">
                            <Calendar className="h-3 w-3 mr-1" />
                            Peak Season Escalation
                          </Badge>
                        )}
                        {trigger.seasonalConsiderations.weddingDayProtocol && (
                          <Badge variant="outline" className="text-xs">
                            <Heart className="h-3 w-3 mr-1" />
                            Wedding Day Protocol
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Testing & Validation</CardTitle>
              <CardDescription>
                Test notification workflows and validate security responses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">
                    Test Notification Workflows
                  </h4>
                  <div className="space-y-2">
                    {[
                      {
                        id: 'guest_list_unauthorized_access',
                        name: 'Guest Data Breach',
                        icon: Users,
                      },
                      {
                        id: 'wedding_photo_exposure',
                        name: 'Photo Privacy Breach',
                        icon: Heart,
                      },
                      {
                        id: 'payment_data_breach',
                        name: 'Payment Data Breach',
                        icon: Zap,
                      },
                      {
                        id: 'wedding_day_system_breach',
                        name: 'Wedding Day Emergency',
                        icon: AlertTriangle,
                      },
                    ].map((test) => {
                      const Icon = test.icon;
                      return (
                        <Button
                          key={test.id}
                          variant="outline"
                          className="w-full justify-start"
                          onClick={() => testNotificationWorkflow(test.id)}
                        >
                          <Icon className="h-4 w-4 mr-2" />
                          Test {test.name}
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">System Validation</h4>
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Testing Guidelines</AlertTitle>
                    <AlertDescription>
                      Test notifications are sent to designated test recipients
                      only. No actual clients or guests will receive test
                      notifications. Test incidents are automatically marked as
                      resolved.
                    </AlertDescription>
                  </Alert>

                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Last Full Test:</span>
                      <span className="text-gray-600">2 hours ago</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Test Success Rate:</span>
                      <span className="text-green-600 font-medium">98.5%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Next Scheduled Test:</span>
                      <span className="text-gray-600">Tomorrow 2:00 AM</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Wedding Day Emergency Protocols</CardTitle>
              <CardDescription>
                Special procedures for security incidents during active weddings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Heart className="h-4 w-4" />
                  <AlertTitle>Wedding Day Priority</AlertTitle>
                  <AlertDescription>
                    During active wedding operations (typically weekends), all
                    security incidents trigger enhanced notification protocols
                    to minimize disruption to wedding celebrations.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="border rounded p-3">
                    <div className="font-medium text-red-600 mb-1">
                      Critical Response
                    </div>
                    <div className="text-gray-600">
                      • Immediate coordinator notification
                      <br />
                      • Discreet couple communication
                      <br />
                      • Vendor coordination
                      <br />• Offline backup activation
                    </div>
                  </div>

                  <div className="border rounded p-3">
                    <div className="font-medium text-orange-600 mb-1">
                      Guest Protection
                    </div>
                    <div className="text-gray-600">
                      • Privacy-first approach
                      <br />
                      • Minimal disruption policy
                      <br />
                      • Post-event notifications
                      <br />• Coordinator briefings
                    </div>
                  </div>

                  <div className="border rounded p-3">
                    <div className="font-medium text-blue-600 mb-1">
                      Documentation
                    </div>
                    <div className="text-gray-600">
                      • Complete incident logging
                      <br />
                      • Response effectiveness
                      <br />
                      • Guest experience impact
                      <br />• Recovery procedures
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AutomatedMonitoringDashboard;
