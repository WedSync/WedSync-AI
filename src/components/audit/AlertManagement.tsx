'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, subDays, isAfter } from 'date-fns';

// Types for alert management
interface Alert {
  id: string;
  name: string;
  description: string;
  type: 'security' | 'performance' | 'system' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'acknowledged' | 'suppressed';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  source: string;
  count: number;
  lastTriggered?: string;
  conditions: AlertCondition[];
  actions: AlertAction[];
  metadata?: Record<string, any>;
}

interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: 'threshold' | 'anomaly' | 'pattern' | 'sequence';
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownPeriod: number; // minutes
  createdAt: string;
  updatedAt: string;
  triggeredCount: number;
  lastTriggered?: string;
}

interface AlertCondition {
  id: string;
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'greater_than'
    | 'less_than'
    | 'contains'
    | 'regex'
    | 'in_range';
  value: any;
  timeWindow?: number; // minutes
}

interface AlertAction {
  id: string;
  type: 'email' | 'slack' | 'webhook' | 'sms' | 'push';
  configuration: Record<string, any>;
  enabled: boolean;
}

interface AlertStats {
  total: number;
  active: number;
  resolved: number;
  critical: number;
  averageResolutionTime: number; // minutes
  mostCommonType: string;
  trendData: { date: string; count: number }[];
}

interface NotificationSettings {
  email: {
    enabled: boolean;
    addresses: string[];
    severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  };
  slack: {
    enabled: boolean;
    webhookUrl: string;
    channel: string;
    severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  };
  sms: {
    enabled: boolean;
    phoneNumbers: string[];
    severityThreshold: 'high' | 'critical';
  };
  pushNotifications: {
    enabled: boolean;
    severityThreshold: 'medium' | 'high' | 'critical';
  };
}

export function AlertManagement() {
  const [activeTab, setActiveTab] = useState<
    'alerts' | 'rules' | 'settings' | 'statistics'
  >('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [notificationSettings, setNotificationSettings] =
    useState<NotificationSettings | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch data on component mount
  useEffect(() => {
    fetchAlertData();
  }, []);

  const fetchAlertData = async () => {
    try {
      setIsLoading(true);

      const [alertsRes, rulesRes, statsRes, settingsRes] = await Promise.all([
        fetch('/api/audit/alerts'),
        fetch('/api/audit/alert-rules'),
        fetch('/api/audit/alert-statistics'),
        fetch('/api/audit/notification-settings'),
      ]);

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData.alerts || []);
      }

      if (rulesRes.ok) {
        const rulesData = await rulesRes.json();
        setAlertRules(rulesData.rules || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setNotificationSettings(settingsData);
      }
    } catch (error) {
      console.error('Failed to fetch alert data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Alert actions
  const acknowledgeAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/audit/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });

      if (response.ok) {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId ? { ...alert, status: 'acknowledged' } : alert,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/audit/alerts/${alertId}/resolve`, {
        method: 'POST',
      });

      if (response.ok) {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId
              ? {
                  ...alert,
                  status: 'resolved',
                  resolvedAt: new Date().toISOString(),
                }
              : alert,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const suppressAlert = async (alertId: string, duration: number) => {
    try {
      const response = await fetch(`/api/audit/alerts/${alertId}/suppress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration }),
      });

      if (response.ok) {
        setAlerts((prev) =>
          prev.map((alert) =>
            alert.id === alertId ? { ...alert, status: 'suppressed' } : alert,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to suppress alert:', error);
    }
  };

  // Rule actions
  const toggleRule = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/audit/alert-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });

      if (response.ok) {
        setAlertRules((prev) =>
          prev.map((rule) =>
            rule.id === ruleId ? { ...rule, enabled } : rule,
          ),
        );
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((alert) => {
    if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity)
      return false;
    if (filterType !== 'all' && alert.type !== filterType) return false;
    if (
      searchQuery &&
      !alert.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !alert.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // Filter rules
  const filteredRules = alertRules.filter((rule) => {
    if (
      searchQuery &&
      !rule.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !rule.description.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    return true;
  });

  // Utility functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'acknowledged':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'resolved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'suppressed':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'high':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'low':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'security':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'performance':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'system':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'compliance':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <svg
            className="w-4 h-4 text-red-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'high':
        return (
          <svg
            className="w-4 h-4 text-orange-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'medium':
        return (
          <svg
            className="w-4 h-4 text-yellow-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-4 h-4 text-blue-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[...Array(6)].map((_, i) => (
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
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Alert Management</h1>
          <p className="text-gray-600 mt-1">
            Configure, monitor, and manage security alerts and notifications
          </p>
        </div>

        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <button
            onClick={() => setShowCreateRule(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm transition-colors"
          >
            Create Alert Rule
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Alerts
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-5 5v-5zM9.243 16.314l7.071-7.071M9 12h6m-6 4h6M7 8h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V10a2 2 0 012-2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Alerts
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.active}
                </p>
              </div>
              <div className="p-3 bg-red-50 rounded-full">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Critical Alerts
                </p>
                <p className="text-3xl font-bold text-red-800">
                  {stats.critical}
                </p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <svg
                  className="w-6 h-6 text-red-800"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Avg Resolution
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {Math.round(stats.averageResolutionTime)}m
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            {
              key: 'alerts',
              label: 'Active Alerts',
              count: alerts.filter((a) => a.status === 'active').length,
            },
            { key: 'rules', label: 'Alert Rules', count: alertRules.length },
            { key: 'statistics', label: 'Statistics', count: null },
            { key: 'settings', label: 'Settings', count: null },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span
                  className={`ml-2 py-0.5 px-2 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'alerts' && (
        <div className="space-y-6">
          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg
                      className="h-5 w-5 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Search alerts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
                <option value="suppressed">Suppressed</option>
              </select>

              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Types</option>
                <option value="security">Security</option>
                <option value="performance">Performance</option>
                <option value="system">System</option>
                <option value="compliance">Compliance</option>
              </select>
            </div>
          </div>

          {/* Alerts List */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {filteredAlerts.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-6 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedAlert(alert)}
                  >
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 mt-1">
                        {getSeverityIcon(alert.severity)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {alert.name}
                          </h3>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusColor(alert.status)}`}
                          >
                            {alert.status}
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(alert.severity)}`}
                          >
                            {alert.severity}
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getTypeColor(alert.type)}`}
                          >
                            {alert.type}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {alert.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Source: {alert.source}</span>
                          <span>•</span>
                          <span>Count: {alert.count}</span>
                          <span>•</span>
                          <span>
                            Created:{' '}
                            {format(parseISO(alert.createdAt), 'MMM d, h:mm a')}
                          </span>
                          {alert.lastTriggered && (
                            <>
                              <span>•</span>
                              <span>
                                Last triggered:{' '}
                                {format(
                                  parseISO(alert.lastTriggered),
                                  'MMM d, h:mm a',
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <div className="flex items-center space-x-2">
                          {alert.status === 'active' && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acknowledgeAlert(alert.id);
                                }}
                                className="px-3 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 border border-yellow-200 rounded-md hover:bg-yellow-200 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                              >
                                Acknowledge
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  resolveAlert(alert.id);
                                }}
                                className="px-3 py-1 text-xs font-medium text-green-700 bg-green-100 border border-green-200 rounded-md hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                              >
                                Resolve
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-5 5v-5zM9.243 16.314l7.071-7.071M9 12h6m-6 4h6M7 8h10a2 2 0 012 2v8a2 2 0 01-2 2H7a2 2 0 01-2-2V10a2 2 0 012-2z"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-600">
                  No alerts found
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Alerts will appear here when they are triggered
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Search */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search alert rules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Rules List */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {filteredRules.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredRules.map((rule) => (
                  <div key={rule.id} className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-lg font-medium text-gray-900">
                            {rule.name}
                          </h3>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                              rule.enabled
                                ? 'bg-green-50 text-green-700 border-green-200'
                                : 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(rule.severity)}`}
                          >
                            {rule.severity}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {rule.description}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500">
                          <span>Type: {rule.type}</span>
                          <span>•</span>
                          <span>Triggered: {rule.triggeredCount} times</span>
                          <span>•</span>
                          <span>Cooldown: {rule.cooldownPeriod}m</span>
                          {rule.lastTriggered && (
                            <>
                              <span>•</span>
                              <span>
                                Last:{' '}
                                {format(
                                  parseISO(rule.lastTriggered),
                                  'MMM d, h:mm a',
                                )}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) =>
                              toggleRule(rule.id, e.target.checked)
                            }
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
                <p className="text-sm font-medium text-gray-600">
                  No alert rules configured
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Create your first alert rule to get started
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'statistics' && stats && (
        <div className="space-y-6">
          {/* Trend Chart */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Alert Trends (Last 30 Days)
            </h3>
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <svg
                  className="w-12 h-12 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <p>Alert trend visualization</p>
                <p className="text-sm">
                  ({stats.trendData.length} data points)
                </p>
                <p className="text-xs mt-2">
                  Interactive charts would be shown here in production
                </p>
              </div>
            </div>
          </div>

          {/* Statistics Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">
                Alert Distribution
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Most Common Type:
                  </span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {stats.mostCommonType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Resolution Rate:
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round((stats.resolved / stats.total) * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Critical Alert Rate:
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round((stats.critical / stats.total) * 100)}%
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h4 className="text-sm font-medium text-gray-700 mb-4">
                Performance Metrics
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Avg Resolution Time:
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {Math.round(stats.averageResolutionTime)} minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Active Alerts:</span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.active}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">
                    Total This Month:
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {stats.total}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && notificationSettings && (
        <div className="space-y-6">
          {/* Email Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Email Notifications
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.email.enabled}
                  onChange={(e) =>
                    setNotificationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            email: { ...prev.email, enabled: e.target.checked },
                          }
                        : prev,
                    )
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity Threshold
                </label>
                <select
                  value={notificationSettings.email.severityThreshold}
                  onChange={(e) =>
                    setNotificationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            email: {
                              ...prev.email,
                              severityThreshold: e.target.value as any,
                            },
                          }
                        : prev,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!notificationSettings.email.enabled}
                >
                  <option value="low">Low and above</option>
                  <option value="medium">Medium and above</option>
                  <option value="high">High and above</option>
                  <option value="critical">Critical only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Addresses
                </label>
                <textarea
                  value={notificationSettings.email.addresses.join(', ')}
                  onChange={(e) =>
                    setNotificationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            email: {
                              ...prev.email,
                              addresses: e.target.value
                                .split(',')
                                .map((addr) => addr.trim()),
                            },
                          }
                        : prev,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  placeholder="admin@example.com, security@example.com"
                  disabled={!notificationSettings.email.enabled}
                />
              </div>
            </div>
          </div>

          {/* Slack Settings */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Slack Notifications
              </h3>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings.slack.enabled}
                  onChange={(e) =>
                    setNotificationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            slack: { ...prev.slack, enabled: e.target.checked },
                          }
                        : prev,
                    )
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Severity Threshold
                </label>
                <select
                  value={notificationSettings.slack.severityThreshold}
                  onChange={(e) =>
                    setNotificationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            slack: {
                              ...prev.slack,
                              severityThreshold: e.target.value as any,
                            },
                          }
                        : prev,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  disabled={!notificationSettings.slack.enabled}
                >
                  <option value="low">Low and above</option>
                  <option value="medium">Medium and above</option>
                  <option value="high">High and above</option>
                  <option value="critical">Critical only</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  value={notificationSettings.slack.webhookUrl}
                  onChange={(e) =>
                    setNotificationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            slack: {
                              ...prev.slack,
                              webhookUrl: e.target.value,
                            },
                          }
                        : prev,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://hooks.slack.com/services/..."
                  disabled={!notificationSettings.slack.enabled}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel
                </label>
                <input
                  type="text"
                  value={notificationSettings.slack.channel}
                  onChange={(e) =>
                    setNotificationSettings((prev) =>
                      prev
                        ? {
                            ...prev,
                            slack: { ...prev.slack, channel: e.target.value },
                          }
                        : prev,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#alerts"
                  disabled={!notificationSettings.slack.enabled}
                />
              </div>
            </div>
          </div>

          {/* Save Settings Button */}
          <div className="flex justify-end">
            <button
              onClick={async () => {
                try {
                  await fetch('/api/audit/notification-settings', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(notificationSettings),
                  });
                  // Show success message
                } catch (error) {
                  console.error('Failed to save settings:', error);
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm transition-colors"
            >
              Save Settings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
