'use client';

import React, { useState, useMemo } from 'react';
import { ScalingAlert } from '@/types/scalability';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Zap,
  CheckCircle,
  Clock,
  User,
  Bell,
  BellOff,
  X,
  ArrowUp,
  Settings,
  Filter,
} from 'lucide-react';

interface AlertsAndNotificationsProps {
  activeAlerts: ScalingAlert[];
  onAlertAcknowledge: (alertId: string) => void;
  onAlertEscalate: (alertId: string) => void;
}

export const AlertsAndNotifications: React.FC<AlertsAndNotificationsProps> = ({
  activeAlerts,
  onAlertAcknowledge,
  onAlertEscalate,
}) => {
  const [filter, setFilter] = useState<
    'all' | 'emergency' | 'critical' | 'warning' | 'unacknowledged'
  >('unacknowledged');
  const [isMinimized, setIsMinimized] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let filtered = activeAlerts;

    switch (filter) {
      case 'emergency':
        filtered = activeAlerts.filter((alert) => alert.level === 'emergency');
        break;
      case 'critical':
        filtered = activeAlerts.filter((alert) => alert.level === 'critical');
        break;
      case 'warning':
        filtered = activeAlerts.filter((alert) => alert.level === 'warning');
        break;
      case 'unacknowledged':
        filtered = activeAlerts.filter(
          (alert) => !alert.acknowledged && !alert.resolved,
        );
        break;
      default:
        filtered = activeAlerts;
    }

    return filtered.sort((a, b) => {
      // Sort by priority: emergency > critical > warning > info
      const priorityOrder = { emergency: 4, critical: 3, warning: 2, info: 1 };
      const priorityDiff = priorityOrder[b.level] - priorityOrder[a.level];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by timestamp (newest first)
      return b.timestamp.getTime() - a.timestamp.getTime();
    });
  }, [activeAlerts, filter]);

  // Alert statistics
  const alertStats = useMemo(() => {
    return {
      total: activeAlerts.length,
      emergency: activeAlerts.filter(
        (a) => a.level === 'emergency' && !a.resolved,
      ).length,
      critical: activeAlerts.filter(
        (a) => a.level === 'critical' && !a.resolved,
      ).length,
      warning: activeAlerts.filter((a) => a.level === 'warning' && !a.resolved)
        .length,
      unacknowledged: activeAlerts.filter((a) => !a.acknowledged && !a.resolved)
        .length,
      escalated: activeAlerts.filter((a) => a.escalated).length,
    };
  }, [activeAlerts]);

  // Show the notification panel only if there are alerts or in non-minimized mode
  if (isMinimized && filteredAlerts.length === 0) {
    return (
      <div className="alerts-minimized fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 shadow-lg"
          size="sm"
        >
          <Bell className="w-4 h-4 mr-2" />
          {alertStats.unacknowledged > 0 && (
            <Badge className="bg-red-500 text-white ml-1">
              {alertStats.unacknowledged}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  const formatRelativeTime = (date: Date): string => {
    const now = Date.now();
    const diff = now - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return `${minutes}m ago`;
  };

  return (
    <div
      className={`alerts-and-notifications fixed bottom-4 right-4 z-50 transition-all duration-300 ${
        isMinimized ? 'w-16' : 'w-96'
      }`}
    >
      <Card className="alerts-panel shadow-xl border border-gray-200">
        {/* Panel Header */}
        <div className="panel-header p-4 pb-3 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {soundEnabled ? (
                  <Bell className="w-5 h-5 text-blue-600" />
                ) : (
                  <BellOff className="w-5 h-5 text-gray-500" />
                )}
                <h3 className="font-semibold text-gray-900">Alerts</h3>
              </div>

              {alertStats.unacknowledged > 0 && (
                <Badge className="bg-red-100 text-red-800 border-red-200">
                  {alertStats.unacknowledged} New
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-1"
              >
                {soundEnabled ? (
                  <Bell className="w-4 h-4" />
                ) : (
                  <BellOff className="w-4 h-4 text-gray-400" />
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1"
              >
                {isMinimized ? (
                  <ArrowUp className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Alert Statistics */}
              <div className="alert-stats grid grid-cols-4 gap-2 mt-3">
                <div className="stat-item text-center">
                  <div className="text-lg font-bold text-red-600">
                    {alertStats.emergency}
                  </div>
                  <div className="text-xs text-gray-600">Emergency</div>
                </div>
                <div className="stat-item text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {alertStats.critical}
                  </div>
                  <div className="text-xs text-gray-600">Critical</div>
                </div>
                <div className="stat-item text-center">
                  <div className="text-lg font-bold text-yellow-600">
                    {alertStats.warning}
                  </div>
                  <div className="text-xs text-gray-600">Warning</div>
                </div>
                <div className="stat-item text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {alertStats.escalated}
                  </div>
                  <div className="text-xs text-gray-600">Escalated</div>
                </div>
              </div>

              {/* Filter Controls */}
              <div className="filter-controls mt-3">
                <div className="flex flex-wrap gap-1">
                  {[
                    {
                      key: 'unacknowledged',
                      label: 'New',
                      count: alertStats.unacknowledged,
                    },
                    { key: 'all', label: 'All', count: alertStats.total },
                    {
                      key: 'emergency',
                      label: 'Emergency',
                      count: alertStats.emergency,
                    },
                    {
                      key: 'critical',
                      label: 'Critical',
                      count: alertStats.critical,
                    },
                    {
                      key: 'warning',
                      label: 'Warning',
                      count: alertStats.warning,
                    },
                  ].map((filterOption) => (
                    <Button
                      key={filterOption.key}
                      variant={
                        filter === filterOption.key ? 'default' : 'ghost'
                      }
                      size="sm"
                      onClick={() => setFilter(filterOption.key as any)}
                      className="px-2 py-1 text-xs"
                    >
                      <span>{filterOption.label}</span>
                      {filterOption.count > 0 && (
                        <Badge variant="secondary" className="text-xs ml-1">
                          {filterOption.count}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Alerts List */}
        {!isMinimized && (
          <div className="alerts-list max-h-96 overflow-y-auto">
            {filteredAlerts.length === 0 ? (
              <div className="empty-alerts text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">
                  No Active Alerts
                </h4>
                <p className="text-sm text-gray-600">
                  {filter === 'unacknowledged'
                    ? 'All alerts have been acknowledged.'
                    : 'All systems are running normally.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 p-4">
                {filteredAlerts.map((alert) => (
                  <AlertItem
                    key={alert.id}
                    alert={alert}
                    onAcknowledge={() => onAlertAcknowledge(alert.id)}
                    onEscalate={() => onAlertEscalate(alert.id)}
                    formatRelativeTime={formatRelativeTime}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

// Alert Item Component
const AlertItem: React.FC<{
  alert: ScalingAlert;
  onAcknowledge: () => void;
  onEscalate: () => void;
  formatRelativeTime: (date: Date) => string;
}> = ({ alert, onAcknowledge, onEscalate, formatRelativeTime }) => {
  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'emergency':
        return <Zap className="w-4 h-4" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4" />;
      case 'warning':
        return <AlertCircle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getAlertColor = (
    level: string,
    acknowledged: boolean,
    resolved: boolean,
  ) => {
    if (resolved) return 'text-gray-600 bg-gray-50 border-gray-200';
    if (acknowledged) {
      switch (level) {
        case 'emergency':
          return 'text-red-500 bg-red-50 border-red-200 opacity-60';
        case 'critical':
          return 'text-orange-500 bg-orange-50 border-orange-200 opacity-60';
        case 'warning':
          return 'text-yellow-500 bg-yellow-50 border-yellow-200 opacity-60';
        default:
          return 'text-blue-500 bg-blue-50 border-blue-200 opacity-60';
      }
    }

    switch (level) {
      case 'emergency':
        return 'text-red-600 bg-red-50 border-red-200 animate-pulse';
      case 'critical':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card
      className={`alert-item transition-all hover:shadow-md border-l-4 ${getAlertColor(
        alert.level,
        alert.acknowledged,
        alert.resolved,
      )
        .split(' ')
        .slice(1)
        .join(' ')}`}
    >
      <div className="p-3">
        <div className="flex items-start space-x-3">
          {/* Alert Icon */}
          <div
            className={`alert-icon flex-shrink-0 p-1 rounded ${getAlertColor(
              alert.level,
              alert.acknowledged,
              alert.resolved,
            )}`}
          >
            {getAlertIcon(alert.level)}
          </div>

          {/* Alert Content */}
          <div className="alert-content flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div className="alert-header">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-medium text-gray-900 text-sm truncate">
                    {alert.title}
                  </h4>
                  <Badge
                    className={getAlertColor(
                      alert.level,
                      alert.acknowledged,
                      alert.resolved,
                    )}
                  >
                    {alert.level.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {alert.service}
                  </Badge>
                </div>
              </div>

              <div className="alert-timestamp text-xs text-gray-500 flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{formatRelativeTime(alert.timestamp)}</span>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-2 line-clamp-2">
              {alert.message}
            </p>

            {/* Alert Status */}
            <div className="alert-status flex items-center space-x-3 text-xs text-gray-600 mb-2">
              {alert.acknowledged && (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>Acknowledged by {alert.acknowledgedBy}</span>
                  <span>at {alert.acknowledgedAt?.toLocaleTimeString()}</span>
                </div>
              )}

              {alert.escalated && (
                <div className="flex items-center space-x-1">
                  <ArrowUp className="w-3 h-3 text-red-500" />
                  <span>Escalated to {alert.escalatedTo?.join(', ')}</span>
                </div>
              )}

              {alert.resolved && (
                <div className="flex items-center space-x-1">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span>
                    Resolved at {alert.resolvedAt?.toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>

            {/* Suggested Actions */}
            {alert.metadata.suggestedActions &&
              alert.metadata.suggestedActions.length > 0 && (
                <div className="suggested-actions mb-3">
                  <div className="text-xs font-medium text-gray-700 mb-1">
                    Suggested Actions:
                  </div>
                  <ul className="space-y-1">
                    {alert.metadata.suggestedActions
                      .slice(0, 2)
                      .map((action, index) => (
                        <li
                          key={index}
                          className="text-xs text-gray-600 flex items-start space-x-1"
                        >
                          <span className="text-blue-500">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

            {/* Current Metrics */}
            {alert.metadata.currentMetrics && (
              <div className="current-metrics mb-3 p-2 bg-gray-50 rounded text-xs">
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(alert.metadata.currentMetrics).map(
                    ([metric, value]) => (
                      <div key={metric} className="metric-item">
                        <span className="text-gray-600 capitalize">
                          {metric.replace('_', ' ')}:
                        </span>
                        <span className="font-mono ml-1">
                          {typeof value === 'number' ? value.toFixed(1) : value}
                        </span>
                      </div>
                    ),
                  )}
                </div>

                {alert.metadata.thresholds && (
                  <div className="thresholds mt-2 text-gray-500">
                    Thresholds:
                    {Object.entries(alert.metadata.thresholds).map(
                      ([level, threshold], index) => (
                        <span key={level} className="ml-1">
                          {index > 0 && ', '}
                          {level}: {threshold}
                        </span>
                      ),
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Alert Actions */}
            {!alert.resolved && (
              <div className="alert-actions flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {!alert.acknowledged && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAcknowledge}
                      className="text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Acknowledge
                    </Button>
                  )}

                  {!alert.escalated && alert.level !== 'info' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEscalate}
                      className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <ArrowUp className="w-3 h-3 mr-1" />
                      Escalate
                    </Button>
                  )}
                </div>

                <div className="alert-id text-xs text-gray-500">
                  ID: <code>{alert.id.slice(-8)}</code>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default AlertsAndNotifications;
