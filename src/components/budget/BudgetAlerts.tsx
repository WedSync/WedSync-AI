'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format, parseISO, addDays, isBefore, isAfter } from 'date-fns';
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCircle,
  X,
  DollarSign,
  Calendar,
  TrendingUp,
  Settings,
  Mail,
  Smartphone,
  Monitor,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface Alert {
  id: string;
  category_id?: string;
  alert_type: string;
  threshold_percentage: number;
  is_active: boolean;
  notification_channels: string[];
  last_triggered_at?: string;
  trigger_count: number;
  category?: {
    name: string;
    color: string;
    spent_amount: number;
    allocated_amount: number;
  };
}

interface AlertNotification {
  id: string;
  type: 'budget_alert' | 'payment_due' | 'milestone_reminder';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  data: any;
  is_read: boolean;
  created_at: string;
}

export default function BudgetAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notifications, setNotifications] = useState<AlertNotification[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newAlert, setNewAlert] = useState({
    category_id: '',
    alert_type: 'threshold_80',
    threshold_percentage: 80,
    notification_channels: ['email', 'in_app'] as string[],
  });

  const supabase = await createClient();

  const alertTypes = [
    { value: 'threshold_80', label: '80% Budget Used', icon: AlertTriangle },
    { value: 'threshold_90', label: '90% Budget Used', icon: AlertTriangle },
    { value: 'threshold_100', label: '100% Budget Used', icon: AlertTriangle },
    { value: 'overspend', label: 'Over Budget', icon: TrendingUp },
    { value: 'upcoming_payment', label: 'Payment Due Soon', icon: Calendar },
    { value: 'payment_due', label: 'Payment Overdue', icon: Calendar },
  ];

  const notificationChannels = [
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'in_app', label: 'In-App', icon: Bell },
    { value: 'sms', label: 'SMS', icon: Smartphone },
    { value: 'push', label: 'Push Notification', icon: Monitor },
  ];

  useEffect(() => {
    fetchData();
    const subscription = setupRealtimeSubscription();
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch alerts with category information
      const { data: alertsData } = await supabase
        .from('budget_alerts')
        .select(
          `
          *,
          category:budget_categories(name, color, spent_amount, allocated_amount)
        `,
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      setAlerts(alertsData || []);

      // Fetch categories for dropdown
      const { data: categoriesData } = await supabase
        .from('budget_categories')
        .select('id, name, color, allocated_amount, spent_amount')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('name');

      setCategories(categoriesData || []);

      // Fetch recent notifications
      const { data: notificationsData } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .in('type', ['budget_alert', 'payment_due', 'milestone_reminder'])
        .order('created_at', { ascending: false })
        .limit(20);

      setNotifications(notificationsData || []);
    } catch (error) {
      console.error('Error fetching alerts data:', error);
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = () => {
    return supabase
      .channel('budget-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: 'type=in.(budget_alert,payment_due,milestone_reminder)',
        },
        (payload) => {
          setNotifications((prev) => [
            payload.new as AlertNotification,
            ...prev,
          ]);
          if (soundEnabled) {
            playNotificationSound(payload.new.severity);
          }
        },
      )
      .subscribe();
  };

  const playNotificationSound = (severity: string) => {
    const audio = new Audio();
    switch (severity) {
      case 'error':
        audio.src = '/sounds/alert-error.mp3';
        break;
      case 'warning':
        audio.src = '/sounds/alert-warning.mp3';
        break;
      default:
        audio.src = '/sounds/alert-info.mp3';
    }
    audio.play().catch(console.error);
  };

  const createAlert = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !newAlert.category_id) return;

      const { error } = await supabase.from('budget_alerts').insert([
        {
          user_id: user.id,
          ...newAlert,
        },
      ]);

      if (!error) {
        setNewAlert({
          category_id: '',
          alert_type: 'threshold_80',
          threshold_percentage: 80,
          notification_channels: ['email', 'in_app'],
        });
        fetchData();
      }
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('budget_alerts')
        .update({ is_active: !isActive })
        .eq('id', alertId);

      if (!error) {
        fetchData();
      }
    } catch (error) {
      console.error('Error toggling alert:', error);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const { error } = await supabase
        .from('budget_alerts')
        .delete()
        .eq('id', alertId);

      if (!error) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, is_read: true } : n,
          ),
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-error-600 bg-error-50 border-error-200';
      case 'warning':
        return 'text-warning-600 bg-warning-50 border-warning-200';
      case 'success':
        return 'text-success-600 bg-success-50 border-success-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return AlertTriangle;
      case 'warning':
        return AlertTriangle;
      case 'success':
        return CheckCircle;
      default:
        return Bell;
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-semibold text-gray-900">
              Budget Alerts
            </h2>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-error-600" />
                <span className="px-2 py-1 bg-error-100 text-error-700 text-xs font-medium rounded-full">
                  {unreadCount} new
                </span>
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Stay informed about your budget status and upcoming payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-lg transition-all duration-200 ${
              soundEnabled
                ? 'bg-success-100 text-success-600 hover:bg-success-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={soundEnabled ? 'Sound enabled' : 'Sound disabled'}
          >
            {soundEnabled ? (
              <Volume2 className="w-5 h-5" />
            ) : (
              <VolumeX className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Alert Settings
          </button>
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Notifications
          </h3>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {notifications.map((notification) => {
                const Icon = getSeverityIcon(notification.severity);
                return (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-all duration-200 ${
                      !notification.is_read ? 'bg-primary-25' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className={`p-2 rounded-lg ${getSeverityColor(notification.severity)}`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-gray-900">
                            {notification.title}
                          </h4>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">
                              {format(
                                parseISO(notification.created_at),
                                'MMM dd, HH:mm',
                              )}
                            </span>
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-primary-600 hover:text-primary-800 p-1"
                                title="Mark as read"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alert Configuration */}
      {showSettings && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Configure Alerts
            </h3>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Add New Alert */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-4">Add New Alert</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={newAlert.category_id}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, category_id: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alert Type
                </label>
                <select
                  value={newAlert.alert_type}
                  onChange={(e) =>
                    setNewAlert({ ...newAlert, alert_type: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                >
                  {alertTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Threshold %
                </label>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={newAlert.threshold_percentage}
                  onChange={(e) =>
                    setNewAlert({
                      ...newAlert,
                      threshold_percentage: parseInt(e.target.value) || 80,
                    })
                  }
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channels
                </label>
                <div className="flex flex-wrap gap-2">
                  {notificationChannels.map((channel) => (
                    <button
                      key={channel.value}
                      onClick={() => {
                        const channels =
                          newAlert.notification_channels.includes(channel.value)
                            ? newAlert.notification_channels.filter(
                                (c) => c !== channel.value,
                              )
                            : [
                                ...newAlert.notification_channels,
                                channel.value,
                              ];
                        setNewAlert({
                          ...newAlert,
                          notification_channels: channels,
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                        newAlert.notification_channels.includes(channel.value)
                          ? 'bg-primary-100 text-primary-700 border border-primary-200'
                          : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}
                    >
                      <channel.icon className="w-3 h-3 mr-1 inline" />
                      {channel.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={createAlert}
                disabled={!newAlert.category_id}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white rounded-lg text-sm font-semibold transition-all duration-200"
              >
                Create Alert
              </button>
            </div>
          </div>

          {/* Existing Alerts */}
          <div>
            <h4 className="font-medium text-gray-900 mb-4">Active Alerts</h4>
            {alerts.length === 0 ? (
              <p className="text-gray-500 text-sm">No alerts configured</p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => {
                  const alertTypeConfig = alertTypes.find(
                    (t) => t.value === alert.alert_type,
                  );
                  const Icon = alertTypeConfig?.icon || AlertTriangle;

                  return (
                    <div
                      key={alert.id}
                      className={`flex items-center justify-between p-4 rounded-lg border transition-all duration-200 ${
                        alert.is_active
                          ? 'border-primary-200 bg-primary-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <Icon
                          className={`w-5 h-5 ${
                            alert.is_active
                              ? 'text-primary-600'
                              : 'text-gray-400'
                          }`}
                        />
                        <div>
                          <p className="font-medium text-gray-900">
                            {alertTypeConfig?.label || alert.alert_type}
                          </p>
                          <p className="text-sm text-gray-500">
                            {alert.category?.name || 'All categories'} •{' '}
                            {alert.threshold_percentage}% threshold
                          </p>
                          {alert.last_triggered_at && (
                            <p className="text-xs text-gray-400 mt-1">
                              Last triggered:{' '}
                              {format(
                                parseISO(alert.last_triggered_at),
                                'MMM dd, yyyy',
                              )}
                              {alert.trigger_count > 0 &&
                                ` (${alert.trigger_count} times)`}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex flex-wrap gap-1">
                          {alert.notification_channels.map((channel) => {
                            const channelConfig = notificationChannels.find(
                              (c) => c.value === channel,
                            );
                            if (!channelConfig) return null;
                            const ChannelIcon = channelConfig.icon;
                            return (
                              <ChannelIcon
                                key={channel}
                                className="w-4 h-4 text-gray-400"
                                title={channelConfig.label}
                              />
                            );
                          })}
                        </div>

                        <button
                          onClick={() => toggleAlert(alert.id, alert.is_active)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                            alert.is_active
                              ? 'bg-success-100 text-success-700 hover:bg-success-200'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {alert.is_active ? 'Active' : 'Inactive'}
                        </button>

                        <button
                          onClick={() => deleteAlert(alert.id)}
                          className="text-gray-400 hover:text-error-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
