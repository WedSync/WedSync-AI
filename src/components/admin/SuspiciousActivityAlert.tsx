'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { SecurityAlert, AuditRiskLevel } from '@/types/audit';

interface SuspiciousActivityAlertProps {
  alerts: SecurityAlert[];
  onAlertAction: (
    alertId: string,
    action: 'resolve' | 'investigate' | 'dismiss',
  ) => void;
  showAll?: boolean;
  maxVisible?: number;
  className?: string;
}

const RISK_LEVEL_COLORS = {
  CRITICAL: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-900 dark:text-red-100',
    badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  HIGH: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    text: 'text-orange-900 dark:text-orange-100',
    badge:
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  MEDIUM: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-900 dark:text-yellow-100',
    badge:
      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  },
  LOW: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-900 dark:text-blue-100',
    badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
};

const ALERT_TYPE_ICONS = {
  SUSPICIOUS_LOGIN: '🔒',
  BULK_OPERATION: '📦',
  PERMISSION_ESCALATION: '⚠️',
  DATA_BREACH: '🚨',
  SYSTEM_ANOMALY: '⚡',
};

const ALERT_TYPE_DESCRIPTIONS = {
  SUSPICIOUS_LOGIN: 'Unusual login activity detected',
  BULK_OPERATION: 'Large-scale data operation performed',
  PERMISSION_ESCALATION: 'User permissions unexpectedly elevated',
  DATA_BREACH: 'Potential data security breach detected',
  SYSTEM_ANOMALY: 'Abnormal system behavior identified',
};

export default function SuspiciousActivityAlert({
  alerts,
  onAlertAction,
  showAll = false,
  maxVisible = 5,
  className = '',
}: SuspiciousActivityAlertProps) {
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [processingActions, setProcessingActions] = useState<Set<string>>(
    new Set(),
  );

  // Sort alerts by risk level and creation time
  const sortedAlerts = useMemo(() => {
    const riskPriority = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

    return alerts
      .filter((alert) => alert.status === 'active')
      .sort((a, b) => {
        // First by risk level (highest first)
        const riskDiff =
          riskPriority[b.risk_level] - riskPriority[a.risk_level];
        if (riskDiff !== 0) return riskDiff;

        // Then by creation time (newest first)
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      });
  }, [alerts]);

  // Limit visible alerts if not showing all
  const visibleAlerts = useMemo(() => {
    return showAll ? sortedAlerts : sortedAlerts.slice(0, maxVisible);
  }, [sortedAlerts, showAll, maxVisible]);

  const toggleExpanded = (alertId: string) => {
    setExpandedAlerts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  };

  const handleAction = async (
    alertId: string,
    action: 'resolve' | 'investigate' | 'dismiss',
  ) => {
    setProcessingActions((prev) => new Set([...prev, alertId]));

    try {
      await onAlertAction(alertId, action);
    } catch (error) {
      console.error('Error processing alert action:', error);
    } finally {
      setProcessingActions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const alertTime = new Date(dateString);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getWeddingContext = (alert: SecurityAlert) => {
    const metadata = alert.metadata;
    if (metadata.affected_users && metadata.affected_users.length > 0) {
      return `Affects ${metadata.affected_users.length} user${metadata.affected_users.length > 1 ? 's' : ''}`;
    }

    if (alert.affected_resource_type === 'GUEST') {
      return 'Guest data involved';
    }

    if (alert.affected_resource_type === 'WEDDING') {
      return 'Wedding data involved';
    }

    return null;
  };

  if (visibleAlerts.length === 0) {
    return (
      <div
        className={`bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center ${className}`}
      >
        <div className="text-green-600 dark:text-green-400 text-4xl mb-2">
          ✅
        </div>
        <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-1">
          No Active Security Alerts
        </h3>
        <p className="text-sm text-green-700 dark:text-green-300">
          Your wedding platform security is operating normally. All systems are
          being monitored continuously.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {visibleAlerts.map((alert) => {
        const colors = RISK_LEVEL_COLORS[alert.risk_level];
        const isExpanded = expandedAlerts.has(alert.id);
        const isProcessing = processingActions.has(alert.id);
        const weddingContext = getWeddingContext(alert);
        const icon = ALERT_TYPE_ICONS[alert.alert_type] || '🔔';

        return (
          <div
            key={alert.id}
            className={`${colors.bg} ${colors.border} border rounded-lg transition-all duration-200 ${
              alert.risk_level === 'CRITICAL' ? 'shadow-lg' : 'shadow'
            }`}
          >
            {/* Alert Header */}
            <div className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1 min-w-0">
                  <div className="text-2xl">{icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className={`font-semibold ${colors.text} truncate`}>
                        {alert.title}
                      </h4>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${colors.badge}`}
                      >
                        {alert.risk_level}
                      </span>
                    </div>

                    <p className={`text-sm ${colors.text} opacity-90 mb-2`}>
                      {alert.description}
                    </p>

                    <div className="flex items-center space-x-4 text-xs opacity-75">
                      <span className={colors.text}>
                        {formatTimeAgo(alert.created_at)}
                      </span>
                      <span className={colors.text}>
                        {ALERT_TYPE_DESCRIPTIONS[alert.alert_type]}
                      </span>
                      {weddingContext && (
                        <span className={`${colors.text} font-medium`}>
                          {weddingContext}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleExpanded(alert.id)}
                    className="text-xs h-8"
                  >
                    {isExpanded ? 'Less' : 'Details'}
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 mt-4">
                <Button
                  size="sm"
                  onClick={() => handleAction(alert.id, 'resolve')}
                  disabled={isProcessing}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isProcessing ? 'Processing...' : 'Resolve'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAction(alert.id, 'investigate')}
                  disabled={isProcessing}
                >
                  Investigate
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAction(alert.id, 'dismiss')}
                  disabled={isProcessing}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Dismiss
                </Button>
              </div>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
              <div className="border-t border-current border-opacity-20 p-4 space-y-4">
                {/* Technical Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className={`font-medium ${colors.text} mb-2`}>
                      Alert Information
                    </h5>
                    <div className="space-y-1 text-sm">
                      <div className={colors.text}>
                        <span className="font-medium">Alert ID:</span>{' '}
                        {alert.id}
                      </div>
                      <div className={colors.text}>
                        <span className="font-medium">Type:</span>{' '}
                        {alert.alert_type.replace('_', ' ')}
                      </div>
                      <div className={colors.text}>
                        <span className="font-medium">Resource:</span>{' '}
                        {alert.affected_resource_type}
                        {alert.affected_resource_id &&
                          ` (${alert.affected_resource_id})`}
                      </div>
                      <div className={colors.text}>
                        <span className="font-medium">Created:</span>{' '}
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  {alert.metadata && (
                    <div>
                      <h5 className={`font-medium ${colors.text} mb-2`}>
                        Additional Context
                      </h5>
                      <div className="space-y-1 text-sm">
                        {alert.metadata.trigger_conditions &&
                          alert.metadata.trigger_conditions.length > 0 && (
                            <div className={colors.text}>
                              <span className="font-medium">Triggers:</span>
                              <ul className="mt-1 ml-4 list-disc">
                                {alert.metadata.trigger_conditions.map(
                                  (condition, index) => (
                                    <li key={index}>{condition}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}

                        {alert.metadata.ip_addresses &&
                          alert.metadata.ip_addresses.length > 0 && (
                            <div className={colors.text}>
                              <span className="font-medium">IP Addresses:</span>{' '}
                              {alert.metadata.ip_addresses.join(', ')}
                            </div>
                          )}

                        {alert.metadata.threat_indicators &&
                          alert.metadata.threat_indicators.length > 0 && (
                            <div className={colors.text}>
                              <span className="font-medium">
                                Threat Indicators:
                              </span>
                              <ul className="mt-1 ml-4 list-disc">
                                {alert.metadata.threat_indicators.map(
                                  (indicator, index) => (
                                    <li key={index}>{indicator}</li>
                                  ),
                                )}
                              </ul>
                            </div>
                          )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Recommended Actions */}
                {alert.metadata.recommended_actions &&
                  alert.metadata.recommended_actions.length > 0 && (
                    <div>
                      <h5 className={`font-medium ${colors.text} mb-2`}>
                        Recommended Actions
                      </h5>
                      <ul
                        className={`space-y-1 text-sm ${colors.text} ml-4 list-disc`}
                      >
                        {alert.metadata.recommended_actions.map(
                          (action, index) => (
                            <li key={index}>{action}</li>
                          ),
                        )}
                      </ul>
                    </div>
                  )}

                {/* Wedding-Specific Context */}
                {alert.affected_resource_type === 'GUEST' && (
                  <div
                    className={`p-3 rounded-lg bg-pink-100 dark:bg-pink-900/30 border border-pink-200 dark:border-pink-800`}
                  >
                    <h5 className="font-medium text-pink-900 dark:text-pink-100 mb-1">
                      Wedding Data Protection Alert
                    </h5>
                    <p className="text-sm text-pink-800 dark:text-pink-200">
                      This alert involves guest data which may include personal
                      information, dietary requirements, and RSVP details.
                      Ensure compliance with data protection regulations.
                    </p>
                  </div>
                )}

                {alert.affected_resource_type === 'VENDOR' && (
                  <div
                    className={`p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800`}
                  >
                    <h5 className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                      Vendor Security Alert
                    </h5>
                    <p className="text-sm text-purple-800 dark:text-purple-200">
                      This alert involves vendor operations. Check supplier
                      access permissions and ensure all vendor activities are
                      properly authorized.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Show More Button */}
      {!showAll && sortedAlerts.length > maxVisible && (
        <div className="text-center pt-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Showing {maxVisible} of {sortedAlerts.length} active alerts
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // This would typically be handled by parent component
              console.log('Show all alerts requested');
            }}
          >
            View All {sortedAlerts.length} Alerts
          </Button>
        </div>
      )}
    </div>
  );
}
