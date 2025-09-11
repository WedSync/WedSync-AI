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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Bell,
  BellOff,
  Smartphone,
  Globe,
  Settings,
  Send,
  History,
  BarChart3,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Users,
  Calendar,
  Zap,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  TestTube,
  Target,
  Activity,
} from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface PushNotificationManagerProps {
  userId: string;
  weddingId?: string;
  onRefresh?: () => void;
}

interface NotificationPreferences {
  task_reminders: boolean;
  deadline_alerts: boolean;
  assignments: boolean;
  system_notifications: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  timezone: string;
}

interface SubscriptionStatus {
  total_subscriptions: number;
  active_subscriptions: number;
  devices: { type: string; last_used: string }[];
  has_web_push: boolean;
  has_mobile_push: boolean;
  last_activity: number | null;
}

interface NotificationHistory {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  priority: string;
  delivery_status: string;
  sent_at: string;
  click_action?: string;
}

interface NotificationAnalytics {
  total_sent: number;
  delivery_rates: {
    sent: string;
    delivered: string;
    failed: string;
  };
  type_breakdown: Record<string, number>;
  priority_breakdown: Record<string, number>;
}

export default function PushNotificationManager({
  userId,
  weddingId,
  onRefresh,
}: PushNotificationManagerProps) {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] =
    useState<SubscriptionStatus | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<
    NotificationHistory[]
  >([]);
  const [analytics, setAnalytics] = useState<NotificationAnalytics | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>('default');
  const [showTestDialog, setShowTestDialog] = useState(false);
  const [testNotification, setTestNotification] = useState({
    title: 'Test Notification',
    body: 'This is a test notification to verify your push notification setup.',
    priority: 'normal' as 'high' | 'normal' | 'low',
  });

  useEffect(() => {
    checkPushSupport();
    fetchNotificationData();
  }, [userId]);

  const checkPushSupport = () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setPermission(Notification.permission);
    }
  };

  const fetchNotificationData = async () => {
    setLoading(true);
    try {
      const [prefsRes, statusRes, historyRes, analyticsRes] = await Promise.all(
        [
          fetch(
            `/api/push-notifications?action=get_preferences&userId=${userId}`,
          ),
          fetch(
            `/api/push-notifications?action=check_subscription_status&userId=${userId}`,
          ),
          fetch(
            `/api/push-notifications?action=get_history&userId=${userId}&limit=20`,
          ),
          fetch(
            `/api/push-notifications?action=get_analytics&userId=${userId}`,
          ),
        ],
      );

      const [prefsData, statusData, historyData, analyticsData] =
        await Promise.all([
          prefsRes.json(),
          statusRes.json(),
          historyRes.json(),
          analyticsRes.json(),
        ]);

      if (prefsData.success) {
        setPreferences(prefsData.preferences);
      }

      if (statusData.success) {
        setSubscriptionStatus(statusData.subscription_status);
      }

      if (historyData.success) {
        setNotificationHistory(historyData.notifications);
      }

      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
      }
    } catch (error) {
      console.error('Failed to fetch notification data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notification data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!pushSupported) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser',
        variant: 'destructive',
      });
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setPermission(permission);

      if (permission === 'granted') {
        await registerServiceWorker();
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive push notifications',
        });
      } else {
        toast({
          title: 'Permission Denied',
          description: 'Push notifications have been disabled',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      toast({
        title: 'Error',
        description: 'Failed to enable notifications',
        variant: 'destructive',
      });
    }
  };

  const registerServiceWorker = async () => {
    try {
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');

      // Get VAPID public key
      const vapidResponse = await fetch(
        '/api/push-notifications?action=vapid_public_key',
      );
      const vapidData = await vapidResponse.json();

      if (!vapidData.success) {
        throw new Error('Failed to get VAPID key');
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidData.vapid_public_key,
      });

      // Register subscription with our backend
      const registerResponse = await fetch('/api/push-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'register_subscription',
          data: {
            userId,
            subscription: subscription.toJSON(),
            deviceInfo: {
              type: 'web',
              name: `${navigator.platform} - ${navigator.userAgent.split(' ').pop()}`,
              userAgent: navigator.userAgent,
            },
          },
        }),
      });

      const registerData = await registerResponse.json();

      if (registerData.success) {
        await fetchNotificationData();
      }
    } catch (error) {
      console.error('Failed to register service worker:', error);
      throw error;
    }
  };

  const updatePreferences = async (
    newPreferences: Partial<NotificationPreferences>,
  ) => {
    try {
      const updatedPrefs = { ...preferences, ...newPreferences };

      const response = await fetch('/api/push-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_preferences',
          data: {
            userId,
            preferences: updatedPrefs,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPreferences(updatedPrefs);
        toast({
          title: 'Preferences Updated',
          description: 'Your notification preferences have been saved',
        });
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast({
        title: 'Error',
        description: 'Failed to update preferences',
        variant: 'destructive',
      });
    }
  };

  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/push-notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_system_notification',
          data: {
            userId,
            title: testNotification.title,
            body: testNotification.body,
            options: {
              priority: testNotification.priority,
              tag: 'test-notification',
              data: { test: true },
            },
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Test Sent',
          description: 'Test notification has been sent',
        });
        setShowTestDialog(false);
        await fetchNotificationData();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast({
        title: 'Error',
        description: 'Failed to send test notification',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      sent: 'text-green-600 bg-green-100',
      delivered: 'text-blue-600 bg-blue-100',
      failed: 'text-red-600 bg-red-100',
      pending: 'text-yellow-600 bg-yellow-100',
      cancelled: 'text-gray-600 bg-gray-100',
    };
    return colors[status as keyof typeof colors] || 'text-gray-600 bg-gray-100';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'text-red-600',
      normal: 'text-blue-600',
      low: 'text-gray-600',
    };
    return colors[priority as keyof typeof colors] || 'text-gray-600';
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'web':
        return <Globe className="h-4 w-4" />;
      case 'ios':
      case 'android':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  if (!preferences) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">Push Notifications</h2>
          {permission === 'granted' ? (
            <Badge className="text-green-600 bg-green-100">
              <CheckCircle className="h-3 w-3 mr-1" />
              Enabled
            </Badge>
          ) : (
            <Badge variant="outline" className="text-orange-600">
              <BellOff className="h-3 w-3 mr-1" />
              Disabled
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {permission !== 'granted' && (
            <Button onClick={requestNotificationPermission}>
              <Bell className="h-4 w-4 mr-2" />
              Enable Notifications
            </Button>
          )}

          <Dialog open={showTestDialog} onOpenChange={setShowTestDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <TestTube className="h-4 w-4 mr-2" />
                Test Notification
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Test Notification</DialogTitle>
                <DialogDescription>
                  Send a test notification to verify your setup is working
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={testNotification.title}
                    onChange={(e) =>
                      setTestNotification((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Notification title"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={testNotification.body}
                    onChange={(e) =>
                      setTestNotification((prev) => ({
                        ...prev,
                        body: e.target.value,
                      }))
                    }
                    placeholder="Notification message"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select
                    value={testNotification.priority}
                    onValueChange={(value: any) =>
                      setTestNotification((prev) => ({
                        ...prev,
                        priority: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowTestDialog(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={sendTestNotification}>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={fetchNotificationData}
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      {subscriptionStatus && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Devices
              </CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscriptionStatus.active_subscriptions}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscriptionStatus.total_subscriptions} total subscriptions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Web Push</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {subscriptionStatus.has_web_push ? (
                  <Badge className="text-green-600 bg-green-100">Enabled</Badge>
                ) : (
                  <Badge variant="outline">Disabled</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Browser notifications
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mobile Push</CardTitle>
              <Smartphone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {subscriptionStatus.has_mobile_push ? (
                  <Badge className="text-green-600 bg-green-100">Enabled</Badge>
                ) : (
                  <Badge variant="outline">Disabled</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                iOS/Android apps
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Last Activity
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {subscriptionStatus.last_activity
                  ? new Date(
                      subscriptionStatus.last_activity,
                    ).toLocaleDateString()
                  : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground">
                Recent notification
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="grid w-full max-w-lg grid-cols-4">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="devices">Devices</TabsTrigger>
        </TabsList>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Types</CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Bell className="h-5 w-5 text-blue-600" />
                    <div>
                      <Label>Task Reminders</Label>
                      <p className="text-sm text-gray-600">
                        Get reminded about upcoming task deadlines
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.task_reminders}
                    onCheckedChange={(checked) =>
                      updatePreferences({ task_reminders: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <div>
                      <Label>Deadline Alerts</Label>
                      <p className="text-sm text-gray-600">
                        Critical alerts for approaching deadlines
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.deadline_alerts}
                    onCheckedChange={(checked) =>
                      updatePreferences({ deadline_alerts: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-green-600" />
                    <div>
                      <Label>Task Assignments</Label>
                      <p className="text-sm text-gray-600">
                        When you are assigned new tasks
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.assignments}
                    onCheckedChange={(checked) =>
                      updatePreferences({ assignments: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Settings className="h-5 w-5 text-purple-600" />
                    <div>
                      <Label>System Notifications</Label>
                      <p className="text-sm text-gray-600">
                        Important system updates and announcements
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={preferences.system_notifications}
                    onCheckedChange={(checked) =>
                      updatePreferences({ system_notifications: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quiet Hours</CardTitle>
              <CardDescription>
                Set times when you don't want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={preferences.quiet_hours_start}
                    onChange={(e) =>
                      updatePreferences({ quiet_hours_start: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={preferences.quiet_hours_end}
                    onChange={(e) =>
                      updatePreferences({ quiet_hours_end: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="mt-4">
                <Label>Timezone</Label>
                <Select
                  value={preferences.timezone}
                  onValueChange={(value) =>
                    updatePreferences({ timezone: value })
                  }
                >
                  <SelectTrigger className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">
                      Eastern Time
                    </SelectItem>
                    <SelectItem value="America/Chicago">
                      Central Time
                    </SelectItem>
                    <SelectItem value="America/Denver">
                      Mountain Time
                    </SelectItem>
                    <SelectItem value="America/Los_Angeles">
                      Pacific Time
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Notifications</CardTitle>
              <CardDescription>
                View your notification history and delivery status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {notificationHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2" />
                  <p>No notifications yet</p>
                  <p className="text-sm">
                    Notifications you receive will appear here
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notification</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {notificationHistory.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{notification.title}</p>
                            <p className="text-sm text-gray-600">
                              {notification.body}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {notification.notification_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={getPriorityColor(notification.priority)}
                          >
                            {notification.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={getStatusColor(
                              notification.delivery_status,
                            )}
                          >
                            {notification.delivery_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {new Date(notification.sent_at).toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {analytics && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Sent
                    </CardTitle>
                    <Send className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.total_sent}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      notifications sent
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Delivery Rate
                    </CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {analytics.delivery_rates.sent}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      successfully delivered
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Failed Rate
                    </CardTitle>
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {analytics.delivery_rates.failed}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      delivery failures
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>By Type</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.type_breakdown).map(
                        ([type, count]) => (
                          <div
                            key={type}
                            className="flex items-center justify-between"
                          >
                            <span className="text-sm capitalize">
                              {type.replace('_', ' ')}
                            </span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>By Priority</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(analytics.priority_breakdown).map(
                        ([priority, count]) => (
                          <div
                            key={priority}
                            className="flex items-center justify-between"
                          >
                            <span
                              className={`text-sm capitalize ${getPriorityColor(priority)}`}
                            >
                              {priority}
                            </span>
                            <Badge variant="outline">{count}</Badge>
                          </div>
                        ),
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="devices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connected Devices</CardTitle>
              <CardDescription>
                Manage devices that receive push notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              {subscriptionStatus && subscriptionStatus.devices.length > 0 ? (
                <div className="space-y-3">
                  {subscriptionStatus.devices.map((device, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(device.type)}
                        <div>
                          <p className="font-medium capitalize">
                            {device.type} Device
                          </p>
                          <p className="text-sm text-gray-600">
                            Last used:{' '}
                            {new Date(device.last_used).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className="text-green-600 bg-green-100">
                          Active
                        </Badge>
                        <Button variant="outline" size="sm">
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Smartphone className="h-8 w-8 mx-auto mb-2" />
                  <p>No devices connected</p>
                  <p className="text-sm">
                    Enable notifications to see your devices here
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Push Support Information */}
          <Card>
            <CardHeader>
              <CardTitle>Browser Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Service Worker Support</span>
                  {'serviceWorker' in navigator ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Push Manager Support</span>
                  {'PushManager' in window ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Notification Permission</span>
                  {permission === 'granted' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : permission === 'denied' ? (
                    <XCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
