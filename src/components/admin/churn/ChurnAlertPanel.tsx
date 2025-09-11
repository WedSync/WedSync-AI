'use client';

import React, { useState, useEffect } from 'react';
import {
  ChurnAlertPanelProps,
  ChurnAlert,
  AlertUrgency,
  ChurnRiskLevel,
} from '@/types/churn-intelligence';
import { Card } from '@/components/ui/card-untitled';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  X,
  Phone,
  Mail,
  User,
  Clock,
  CheckCircle,
  ExternalLink,
  Bell,
  BellOff,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function ChurnAlertPanel({
  alerts = [],
  onAlertDismiss,
  onAlertAction,
  onAlertAcknowledge,
  maxDisplayAlerts = 5,
}: ChurnAlertPanelProps) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());
  const [processingAlert, setProcessingAlert] = useState<string | null>(null);

  // Play notification sound for critical alerts
  useEffect(() => {
    const criticalAlerts = alerts.filter(
      (alert) => alert.urgency === AlertUrgency.CRITICAL && !alert.isRead,
    );

    if (criticalAlerts.length > 0 && soundEnabled) {
      // In production, would play actual notification sound
      console.log('🔊 Critical churn alert sound would play');
    }
  }, [alerts, soundEnabled]);

  // Auto-dismiss expired alerts
  useEffect(() => {
    const now = new Date();
    alerts.forEach((alert) => {
      if (alert.expiresAt && alert.expiresAt < now && !alert.isDismissed) {
        onAlertDismiss(alert.id);
      }
    });
  }, [alerts, onAlertDismiss]);

  const getUrgencyColor = (urgency: AlertUrgency) => {
    switch (urgency) {
      case AlertUrgency.CRITICAL:
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: 'text-red-600',
          badge: 'bg-red-100 text-red-800',
        };
      case AlertUrgency.URGENT:
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          text: 'text-orange-800',
          icon: 'text-orange-600',
          badge: 'bg-orange-100 text-orange-800',
        };
      case AlertUrgency.WARNING:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-800',
        };
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-600',
          badge: 'bg-blue-100 text-blue-800',
        };
    }
  };

  const getRiskLevelColor = (level: ChurnRiskLevel) => {
    switch (level) {
      case ChurnRiskLevel.CRITICAL:
        return 'bg-red-500';
      case ChurnRiskLevel.HIGH_RISK:
        return 'bg-orange-500';
      case ChurnRiskLevel.ATTENTION:
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  const handleAlertAction = async (alertId: string, action: string) => {
    setProcessingAlert(alertId);

    try {
      await onAlertAction(alertId, action);
      onAlertAcknowledge(alertId);
      toast.success(`Action "${action}" executed successfully`);
    } catch (error) {
      toast.error(`Failed to execute action: ${action}`);
    } finally {
      setProcessingAlert(null);
    }
  };

  const handleExpandToggle = (alertId: string) => {
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

  const sortedAlerts = alerts
    .filter((alert) => !alert.isDismissed)
    .sort((a, b) => {
      // Sort by urgency first, then by creation time
      const urgencyOrder = {
        [AlertUrgency.CRITICAL]: 0,
        [AlertUrgency.URGENT]: 1,
        [AlertUrgency.WARNING]: 2,
        [AlertUrgency.INFO]: 3,
      };

      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }

      return b.createdAt.getTime() - a.createdAt.getTime();
    })
    .slice(0, maxDisplayAlerts);

  if (sortedAlerts.length === 0) {
    return null;
  }

  return (
    <Card
      variant="default"
      padding="md"
      className="border-l-4 border-l-red-500"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Churn Risk Alerts
            </h3>
            <p className="text-sm text-gray-600">
              {sortedAlerts.length} active alert
              {sortedAlerts.length !== 1 ? 's' : ''} requiring attention
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={soundEnabled ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="gap-1 px-3"
          >
            {soundEnabled ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            {soundEnabled ? 'On' : 'Off'}
          </Button>

          <Badge className="bg-red-100 text-red-800">
            {alerts.filter((a) => a.urgency === AlertUrgency.CRITICAL).length}{' '}
            Critical
          </Badge>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedAlerts.map((alert) => {
          const urgencyColors = getUrgencyColor(alert.urgency);
          const isExpanded = expandedAlerts.has(alert.id);
          const isProcessing = processingAlert === alert.id;

          return (
            <div
              key={alert.id}
              className={cn(
                'border rounded-lg p-4 transition-all duration-200',
                urgencyColors.bg,
                urgencyColors.border,
                !alert.isRead && 'ring-2 ring-red-200',
                alert.urgency === AlertUrgency.CRITICAL &&
                  !alert.isRead &&
                  'animate-pulse',
              )}
            >
              {/* Alert Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className={cn('p-1 rounded', urgencyColors.bg)}>
                    <AlertTriangle
                      className={cn('h-4 w-4', urgencyColors.icon)}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className={cn(
                          'font-semibold text-sm',
                          urgencyColors.text,
                        )}
                      >
                        {alert.title}
                      </h4>
                      <Badge className={urgencyColors.badge}>
                        {alert.urgency}
                      </Badge>
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          getRiskLevelColor(alert.riskLevel),
                        )}
                      />
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-600 mb-2">
                      <span className="font-medium text-gray-900">
                        {alert.supplierName}
                      </span>
                      <span>Risk: {alert.riskScore}/100</span>
                      <span>
                        {formatDistanceToNow(alert.createdAt, {
                          addSuffix: true,
                        })}
                      </span>
                    </div>

                    <p className="text-sm text-gray-700">{alert.message}</p>

                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        <div className="p-3 bg-white rounded border border-gray-200">
                          <div className="flex items-center gap-2 mb-2">
                            <target className="h-4 w-4 text-blue-600" />
                            <span className="text-sm font-medium text-gray-900">
                              Required Action
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">
                            {alert.actionRequired}
                          </p>
                        </div>

                        {/* Suggested Actions */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {alert.suggestedActions
                            .slice(0, 3)
                            .map((action, index) => (
                              <Button
                                key={index}
                                variant="secondary"
                                size="sm"
                                onClick={() =>
                                  handleAlertAction(alert.id, action)
                                }
                                disabled={isProcessing}
                                className="gap-2 text-xs"
                              >
                                {action === 'schedule_call' && (
                                  <Phone className="h-3 w-3" />
                                )}
                                {action === 'send_email' && (
                                  <Mail className="h-3 w-3" />
                                )}
                                {action === 'assign_csm' && (
                                  <User className="h-3 w-3" />
                                )}
                                {action.replace('_', ' ')}
                              </Button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Alert Controls */}
                <div className="flex items-center gap-1">
                  {!alert.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onAlertAcknowledge(alert.id)}
                      className="gap-1 px-2"
                      title="Mark as read"
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExpandToggle(alert.id)}
                    className="gap-1 px-2"
                    title={isExpanded ? 'Collapse' : 'Expand'}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAlertDismiss(alert.id)}
                    className="gap-1 px-2 text-gray-500 hover:text-red-600"
                    title="Dismiss alert"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Quick Actions for Critical Alerts */}
              {alert.urgency === AlertUrgency.CRITICAL && !isExpanded && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-red-200">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() =>
                      handleAlertAction(alert.id, 'escalate_critical')
                    }
                    disabled={isProcessing}
                    className="gap-1 flex-1"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Emergency Response
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAlertAction(alert.id, 'schedule_call')}
                    disabled={isProcessing}
                    className="gap-1 flex-1"
                  >
                    <Phone className="h-3 w-3" />
                    Call Now
                  </Button>
                </div>
              )}

              {/* Processing Indicator */}
              {isProcessing && (
                <div className="flex items-center justify-center mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    Processing intervention...
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Alert Summary Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <span>
              {alerts.filter((a) => a.urgency === AlertUrgency.CRITICAL).length}{' '}
              Critical
            </span>
          </div>

          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-orange-500 rounded-full" />
            <span>
              {alerts.filter((a) => a.urgency === AlertUrgency.URGENT).length}{' '}
              Urgent
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{alerts.filter((a) => !a.isRead).length} Unread</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {alerts.length > maxDisplayAlerts && (
            <span className="text-xs text-gray-500">
              Showing {maxDisplayAlerts} of {alerts.length} alerts
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              alerts.forEach((alert) => onAlertAcknowledge(alert.id));
              toast.success('All alerts marked as read');
            }}
            className="gap-1 text-xs"
          >
            <CheckCircle className="h-3 w-3" />
            Mark All Read
          </Button>
        </div>
      </div>

      {/* Critical Alert Count Indicator */}
      {alerts.filter(
        (a) => a.urgency === AlertUrgency.CRITICAL && !a.isDismissed,
      ).length > 0 && (
        <div className="absolute -top-2 -right-2">
          <div className="w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold animate-bounce">
            {
              alerts.filter(
                (a) => a.urgency === AlertUrgency.CRITICAL && !a.isDismissed,
              ).length
            }
          </div>
        </div>
      )}
    </Card>
  );
}
