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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Calendar,
  CalendarDays,
  Clock,
  Link,
  Unlink,
  Settings,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  Zap,
  Globe,
  Smartphone,
  Loader2,
  ExternalLink,
  ChevronRight,
  Calendar as CalendarIcon,
  Users,
  Target,
  Activity,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface CalendarIntegrationManagerProps {
  weddingId: string;
  userId: string;
  tasks: {
    id: string;
    title: string;
    deadline: string;
    status: string;
    priority: string;
    category: string;
    has_calendar_event?: boolean;
  }[];
  onRefresh?: () => void;
}

interface CalendarSync {
  user_id: string;
  provider: 'google' | 'outlook' | 'apple';
  provider_account_id: string;
  calendar_id: string;
  calendar_name: string;
  sync_enabled: boolean;
  last_sync_at?: Date;
  sync_direction: 'import' | 'export' | 'bidirectional';
}

interface CalendarEvent {
  id: string;
  title: string;
  start_time: Date;
  end_time: Date;
  all_day: boolean;
  task_id?: string;
  calendar_provider?: string;
  external_id?: string;
}

interface CalendarHealth {
  unmapped_tasks_count: number;
  failed_syncs_count: number;
  active_connections_count: number;
  health_score: number;
  recommendations: string[];
}

export default function CalendarIntegrationManager({
  weddingId,
  userId,
  tasks,
  onRefresh,
}: CalendarIntegrationManagerProps) {
  const [syncSettings, setSyncSettings] = useState<CalendarSync[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [calendarHealth, setCalendarHealth] = useState<CalendarHealth | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [showBulkSync, setShowBulkSync] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [syncType, setSyncType] = useState<
    'deadline' | 'work_block' | 'milestone'
  >('deadline');

  useEffect(() => {
    fetchCalendarData();
  }, [weddingId, userId]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const [syncRes, eventsRes, healthRes] = await Promise.all([
        fetch(`/api/tasks/calendar?action=get_sync_settings&userId=${userId}`),
        fetch(
          `/api/tasks/calendar?action=get_events&weddingId=${weddingId}&startDate=${new Date().toISOString()}&endDate=${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()}`,
        ),
        fetch(
          `/api/tasks/calendar?action=calendar_health&weddingId=${weddingId}`,
        ),
      ]);

      const [syncData, eventsData, healthData] = await Promise.all([
        syncRes.json(),
        eventsRes.json(),
        healthRes.json(),
      ]);

      if (syncData.success) {
        setSyncSettings(syncData.sync_settings);
      }

      if (eventsData.success) {
        setCalendarEvents(eventsData.events);
      }

      if (healthData.success) {
        setCalendarHealth(healthData.health);
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load calendar data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectCalendar = async (provider: string) => {
    try {
      const redirectUri = `${window.location.origin}/api/auth/calendar/callback`;
      const response = await fetch(
        `/api/tasks/calendar?action=get_oauth_url&provider=${provider}&redirectUri=${redirectUri}&userId=${userId}`,
      );
      const data = await response.json();

      if (data.success) {
        window.location.href = data.oauth_url;
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to connect calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to connect calendar',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnectCalendar = async (provider: string) => {
    try {
      const response = await fetch('/api/tasks/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_sync_settings',
          data: {
            userId,
            provider,
            settings: { sync_enabled: false },
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Calendar disconnected successfully',
        });
        await fetchCalendarData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to disconnect calendar:', error);
      toast({
        title: 'Error',
        description: 'Failed to disconnect calendar',
        variant: 'destructive',
      });
    }
  };

  const handleSyncTaskToCalendar = async (
    taskId: string,
    mappingType: string = 'deadline',
  ) => {
    try {
      const response = await fetch('/api/tasks/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_event_from_task',
          data: { taskId, mapping_type: mappingType },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Task synced to calendar successfully',
        });
        await fetchCalendarData();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to sync task:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync task to calendar',
        variant: 'destructive',
      });
    }
  };

  const handleBulkSync = async () => {
    if (selectedTasks.length === 0) {
      toast({
        title: 'No Tasks Selected',
        description: 'Please select tasks to sync',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/tasks/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'bulk_create_events',
          data: { taskIds: selectedTasks, mapping_type: syncType },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Bulk Sync Complete',
          description: `${data.results.success} tasks synced successfully`,
        });

        setShowBulkSync(false);
        setSelectedTasks([]);
        await fetchCalendarData();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Bulk sync failed:', error);
      toast({
        title: 'Error',
        description: 'Bulk sync failed',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAllDeadlines = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/tasks/calendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_all_deadlines',
          data: { weddingId },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'All task deadlines synced to calendar',
        });
        await fetchCalendarData();
        if (onRefresh) onRefresh();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to sync all deadlines:', error);
      toast({
        title: 'Error',
        description: 'Failed to sync all deadlines',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'google':
        return '📅';
      case 'outlook':
        return '📧';
      case 'apple':
        return '🍎';
      default:
        return '📅';
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const unmappedTasks = tasks.filter(
    (task) => !task.has_calendar_event && task.status !== 'completed',
  );
  const mappedTasks = tasks.filter((task) => task.has_calendar_event);

  return (
    <div className="space-y-6">
      {/* Header with Health Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Calendar Integration</h2>
          {calendarHealth && (
            <Badge className={getHealthColor(calendarHealth.health_score)}>
              Health: {calendarHealth.health_score}%
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={fetchCalendarData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Sync All Deadlines
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Sync All Task Deadlines?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will create calendar events for all tasks that don't
                  already have them.
                  {unmappedTasks.length} tasks will be synced.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleSyncAllDeadlines}>
                  Sync {unmappedTasks.length} Tasks
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Health Dashboard */}
      {calendarHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Health Score
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calendarHealth.health_score}%
              </div>
              <p className="text-xs text-muted-foreground">
                {calendarHealth.health_score >= 80
                  ? 'Excellent'
                  : calendarHealth.health_score >= 60
                    ? 'Good'
                    : calendarHealth.health_score >= 40
                      ? 'Fair'
                      : 'Poor'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Unmapped Tasks
              </CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calendarHealth.unmapped_tasks_count}
              </div>
              <p className="text-xs text-muted-foreground">
                tasks without calendar events
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Connections
              </CardTitle>
              <Link className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {calendarHealth.active_connections_count}
              </div>
              <p className="text-xs text-muted-foreground">
                connected calendars
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Calendar Events
              </CardTitle>
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{calendarEvents.length}</div>
              <p className="text-xs text-muted-foreground">upcoming events</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs Interface */}
      <Tabs defaultValue="connections" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="connections" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Calendar Providers</CardTitle>
              <CardDescription>
                Connect your external calendars to sync task deadlines and
                events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['google', 'outlook', 'apple'].map((provider) => {
                  const connection = syncSettings.find(
                    (s) => s.provider === provider,
                  );
                  const isConnected = connection?.sync_enabled;

                  return (
                    <Card key={provider} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">
                            {getProviderIcon(provider)}
                          </span>
                          <div>
                            <h3 className="font-medium capitalize">
                              {provider} Calendar
                            </h3>
                            {isConnected && (
                              <p className="text-sm text-green-600">
                                Connected
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge variant={isConnected ? 'default' : 'outline'}>
                          {isConnected ? 'Active' : 'Disconnected'}
                        </Badge>
                      </div>

                      {isConnected ? (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-600">
                            <p>Calendar: {connection.calendar_name}</p>
                            {connection.last_sync_at && (
                              <p>
                                Last sync:{' '}
                                {new Date(
                                  connection.last_sync_at,
                                ).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisconnectCalendar(provider)}
                            className="w-full"
                          >
                            <Unlink className="h-4 w-4 mr-2" />
                            Disconnect
                          </Button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => handleConnectCalendar(provider)}
                          className="w-full"
                          disabled={provider === 'apple'} // Apple integration not implemented
                        >
                          <Link className="h-4 w-4 mr-2" />
                          Connect {provider === 'apple' ? '(Coming Soon)' : ''}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Health Recommendations */}
          {calendarHealth && calendarHealth.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {calendarHealth.recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-blue-50 rounded"
                    >
                      <ChevronRight className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">{rec}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tasks" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Task Calendar Sync</h3>
              <p className="text-sm text-gray-600">
                Manage which tasks appear in your calendar
              </p>
            </div>

            <Dialog open={showBulkSync} onOpenChange={setShowBulkSync}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Bulk Sync
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Bulk Sync Tasks to Calendar</DialogTitle>
                  <DialogDescription>
                    Select tasks and sync type to create calendar events
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Sync Type</Label>
                    <Select
                      value={syncType}
                      onValueChange={(value: any) => setSyncType(value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deadline">
                          Deadline Events
                        </SelectItem>
                        <SelectItem value="work_block">Work Blocks</SelectItem>
                        <SelectItem value="milestone">Milestones</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Tasks to Sync ({selectedTasks.length} selected)
                    </Label>
                    <div className="max-h-64 overflow-y-auto border rounded p-2">
                      {unmappedTasks.map((task) => (
                        <label
                          key={task.id}
                          className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTasks((prev) => [...prev, task.id]);
                              } else {
                                setSelectedTasks((prev) =>
                                  prev.filter((id) => id !== task.id),
                                );
                              }
                            }}
                          />
                          <span className="flex-1 text-sm">{task.title}</span>
                          <Badge variant="outline" className="text-xs">
                            {task.priority}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowBulkSync(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleBulkSync}
                      disabled={loading || selectedTasks.length === 0}
                    >
                      {loading && (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      )}
                      Sync {selectedTasks.length} Tasks
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Unmapped Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Tasks Without Calendar Events ({unmappedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {unmappedTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    <p>All tasks have calendar events!</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unmappedTasks.slice(0, 10).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 border rounded"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{task.priority}</Badge>
                            <span className="text-sm text-gray-600">
                              Due:{' '}
                              {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSyncTaskToCalendar(task.id)}
                        >
                          <Calendar className="h-4 w-4 mr-1" />
                          Sync
                        </Button>
                      </div>
                    ))}
                    {unmappedTasks.length > 10 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        And {unmappedTasks.length - 10} more tasks...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mapped Tasks */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Synced Tasks ({mappedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mappedTasks.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-8 w-8 mx-auto mb-2" />
                    <p>No tasks synced yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mappedTasks.slice(0, 10).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 border rounded bg-green-50"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{task.title}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{task.priority}</Badge>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-sm text-green-600">
                              Synced
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-green-600">
                          In Calendar
                        </Badge>
                      </div>
                    ))}
                    {mappedTasks.length > 10 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        And {mappedTasks.length - 10} more synced tasks...
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="events" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Calendar Events</CardTitle>
              <CardDescription>
                Events created from your wedding tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {calendarEvents.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <CalendarDays className="h-8 w-8 mx-auto mb-2" />
                  <p>No calendar events found</p>
                  <p className="text-sm">Sync some tasks to see events here</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Task</TableHead>
                      <TableHead>Provider</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calendarEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{event.title}</p>
                            {event.all_day && (
                              <Badge variant="outline" className="text-xs">
                                All Day
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>
                              {new Date(event.start_time).toLocaleDateString()}
                            </p>
                            {!event.all_day && (
                              <p className="text-gray-600">
                                {new Date(
                                  event.start_time,
                                ).toLocaleTimeString()}{' '}
                                -{' '}
                                {new Date(event.end_time).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {event.task_id ? (
                            <Badge variant="outline">Linked</Badge>
                          ) : (
                            <span className="text-gray-500">No task</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span>
                              {getProviderIcon(
                                event.calendar_provider || 'internal',
                              )}
                            </span>
                            <span className="text-sm capitalize">
                              {event.calendar_provider || 'Internal'}
                            </span>
                            {event.external_id && (
                              <ExternalLink className="h-3 w-3" />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sync Settings</CardTitle>
              <CardDescription>
                Configure how tasks sync with your calendars
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-sync new tasks</Label>
                    <p className="text-sm text-gray-600">
                      Automatically create calendar events for new tasks
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sync task updates</Label>
                    <p className="text-sm text-gray-600">
                      Update calendar events when tasks change
                    </p>
                  </div>
                  <Switch />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Two-way sync</Label>
                    <p className="text-sm text-gray-600">
                      Update tasks when calendar events change
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>

              <div className="border-t pt-6">
                <h4 className="font-medium mb-4">Default Event Settings</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Default reminder time</Label>
                    <Select defaultValue="60">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="1440">1 day</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Event visibility</Label>
                    <Select defaultValue="team">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">Private</SelectItem>
                        <SelectItem value="team">Team</SelectItem>
                        <SelectItem value="public">Public</SelectItem>
                      </SelectContent>
                    </Select>
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
