'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Button } from '@/components/untitled-ui/button';
import { Input } from '@/components/untitled-ui/input';
import { Select } from '@/components/untitled-ui/select';
import { createClient } from '@/lib/supabase/client';
import {
  AlertTriangle,
  Bell,
  Settings,
  Check,
  X,
  Plus,
  Clock,
  Users,
  FileText,
  TrendingDown,
  Mail,
  Smartphone,
  MessageCircle,
  Eye,
  EyeOff,
} from 'lucide-react';

interface AlertThreshold {
  id: string;
  alert_type: string;
  threshold_value: number;
  comparison_operator: string;
  notification_channels: string[];
  is_active: boolean;
  last_triggered_at?: string;
}

interface AlertHistory {
  id: string;
  alert_type: string;
  actual_value: number;
  threshold_value: number;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  acknowledged: boolean;
  acknowledged_by?: string;
  acknowledged_at?: string;
  created_at: string;
}

const ALERT_TYPES = [
  { value: 'response_rate', label: 'Response Rate', icon: TrendingDown },
  { value: 'vendor_delay', label: 'Vendor Delays', icon: Clock },
  { value: 'guest_rsvp', label: 'RSVP Status', icon: Users },
];

const COMPARISON_OPERATORS = [
  { value: '<', label: 'Less than' },
  { value: '<=', label: 'Less than or equal' },
  { value: '>', label: 'Greater than' },
  { value: '>=', label: 'Greater than or equal' },
  { value: '=', label: 'Equal to' },
];

const NOTIFICATION_CHANNELS = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'in_app', label: 'In-App', icon: Bell },
  { value: 'sms', label: 'SMS', icon: Smartphone },
  { value: 'slack', label: 'Slack', icon: MessageCircle },
];

const SEVERITY_COLORS = {
  low: 'blue',
  medium: 'warning',
  high: 'error',
  critical: 'error',
};

export function AlertSystem() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistory[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingThreshold, setEditingThreshold] =
    useState<AlertThreshold | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'thresholds' | 'history'>(
    'thresholds',
  );
  const supabase = await createClient();

  const [formData, setFormData] = useState({
    alert_type: '',
    threshold_value: 0,
    comparison_operator: '<',
    notification_channels: ['email', 'in_app'] as string[],
    is_active: true,
  });

  useEffect(() => {
    fetchAlertData();
  }, []);

  const fetchAlertData = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const orgId = user?.user_metadata.organization_id;

      // Fetch alert thresholds
      const { data: thresholdData, error: thresholdError } = await supabase
        .from('analytics.alert_thresholds')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (thresholdError) throw thresholdError;
      setThresholds(thresholdData || []);

      // Fetch alert history
      const { data: historyData, error: historyError } = await supabase
        .from('analytics.alert_history')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (historyError) throw historyError;
      setAlertHistory(historyData || []);
    } catch (error) {
      console.error('Error fetching alert data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveThreshold = async () => {
    try {
      const user = (await supabase.auth.getUser()).data.user;
      const orgId = user?.user_metadata.organization_id;

      const dataToSave = {
        organization_id: orgId,
        ...formData,
      };

      if (editingThreshold) {
        const { error } = await supabase
          .from('analytics.alert_thresholds')
          .update(dataToSave)
          .eq('id', editingThreshold.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('analytics.alert_thresholds')
          .insert(dataToSave);

        if (error) throw error;
      }

      await fetchAlertData();
      resetForm();
    } catch (error) {
      console.error('Error saving threshold:', error);
    }
  };

  const deleteThreshold = async (id: string) => {
    try {
      const { error } = await supabase
        .from('analytics.alert_thresholds')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchAlertData();
    } catch (error) {
      console.error('Error deleting threshold:', error);
    }
  };

  const toggleThreshold = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('analytics.alert_thresholds')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;
      await fetchAlertData();
    } catch (error) {
      console.error('Error toggling threshold:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const user = (await supabase.auth.getUser()).data.user;

      const { error } = await supabase
        .from('analytics.alert_history')
        .update({
          acknowledged: true,
          acknowledged_by: user?.id,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', alertId);

      if (error) throw error;
      await fetchAlertData();
    } catch (error) {
      console.error('Error acknowledging alert:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      alert_type: '',
      threshold_value: 0,
      comparison_operator: '<',
      notification_channels: ['email', 'in_app'],
      is_active: true,
    });
    setEditingThreshold(null);
    setShowForm(false);
  };

  const editThreshold = (threshold: AlertThreshold) => {
    setFormData({
      alert_type: threshold.alert_type,
      threshold_value: threshold.threshold_value,
      comparison_operator: threshold.comparison_operator,
      notification_channels: threshold.notification_channels,
      is_active: threshold.is_active,
    });
    setEditingThreshold(threshold);
    setShowForm(true);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAlertTypeLabel = (type: string) => {
    return ALERT_TYPES.find((t) => t.value === type)?.label || type;
  };

  const getOperatorLabel = (operator: string) => {
    return (
      COMPARISON_OPERATORS.find((o) => o.value === operator)?.label || operator
    );
  };

  const activeAlerts = alertHistory.filter((alert) => !alert.acknowledged);
  const criticalAlerts = activeAlerts.filter(
    (alert) => alert.severity === 'critical',
  ).length;
  const highAlerts = activeAlerts.filter(
    (alert) => alert.severity === 'high',
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">Loading alert system...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Alert Summary */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Alert System</h2>
          <p className="text-sm text-gray-500 mt-1">
            Automated monitoring and notifications for wedding planning metrics
          </p>
        </div>

        {activeAlerts.length > 0 && (
          <div className="flex gap-2">
            {criticalAlerts > 0 && (
              <Badge variant="error">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {criticalAlerts} Critical
              </Badge>
            )}
            {highAlerts > 0 && (
              <Badge variant="warning">{highAlerts} High Priority</Badge>
            )}
          </div>
        )}
      </div>

      {/* Active Alerts Banner */}
      {activeAlerts.length > 0 && (
        <Card className="p-4 border-error-200 bg-error-50">
          <div className="flex items-start justify-between">
            <div className="flex items-start">
              <AlertTriangle className="w-5 h-5 text-error-600 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-semibold text-error-900">
                  Active Alerts
                </h4>
                <p className="text-sm text-error-700 mt-1">
                  You have {activeAlerts.length} unacknowledged alert
                  {activeAlerts.length !== 1 ? 's' : ''}
                  requiring your attention.
                </p>
                <div className="mt-3 space-y-2">
                  {activeAlerts.slice(0, 3).map((alert) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between bg-white rounded p-2"
                    >
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">
                          {alert.message}
                        </span>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                          <span>{getAlertTypeLabel(alert.alert_type)}</span>
                          <span>Actual: {alert.actual_value}%</span>
                          <span>Threshold: {alert.threshold_value}%</span>
                          <Badge variant={SEVERITY_COLORS[alert.severity]}>
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        <Check className="w-4 h-4" />
                        Acknowledge
                      </Button>
                    </div>
                  ))}
                  {activeAlerts.length > 3 && (
                    <p className="text-xs text-error-600 mt-2">
                      And {activeAlerts.length - 3} more alerts...
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('thresholds')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'thresholds'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Settings className="w-4 h-4 inline mr-2" />
          Alert Thresholds ({thresholds.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2 text-sm font-medium border-b-2 ${
            activeTab === 'history'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-4 h-4 inline mr-2" />
          Alert History ({alertHistory.length})
        </button>
      </div>

      {activeTab === 'thresholds' ? (
        <>
          {/* Threshold Management */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">
              Alert Thresholds
            </h3>
            <Button onClick={() => setShowForm(true)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Threshold
            </Button>
          </div>

          {/* Threshold Form */}
          {showForm && (
            <Card className="p-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4">
                {editingThreshold ? 'Edit Threshold' : 'Create New Threshold'}
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Alert Type
                  </label>
                  <Select
                    value={formData.alert_type}
                    onValueChange={(value) =>
                      setFormData({ ...formData, alert_type: value })
                    }
                  >
                    <option value="">Select alert type</option>
                    {ALERT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comparison
                  </label>
                  <Select
                    value={formData.comparison_operator}
                    onValueChange={(value) =>
                      setFormData({ ...formData, comparison_operator: value })
                    }
                  >
                    {COMPARISON_OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Threshold Value{' '}
                    {formData.alert_type === 'response_rate' ? '(%)' : ''}
                  </label>
                  <Input
                    type="number"
                    value={formData.threshold_value}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        threshold_value: Number(e.target.value),
                      })
                    }
                    min="0"
                    max={
                      formData.alert_type === 'response_rate'
                        ? '100'
                        : undefined
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Channels
                  </label>
                  <div className="space-y-2">
                    {NOTIFICATION_CHANNELS.map((channel) => (
                      <label key={channel.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.notification_channels.includes(
                            channel.value,
                          )}
                          onChange={(e) => {
                            const channels = e.target.checked
                              ? [
                                  ...formData.notification_channels,
                                  channel.value,
                                ]
                              : formData.notification_channels.filter(
                                  (c) => c !== channel.value,
                                );
                            setFormData({
                              ...formData,
                              notification_channels: channels,
                            });
                          }}
                          className="mr-2"
                        />
                        <channel.icon className="w-4 h-4 mr-1" />
                        {channel.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  onClick={saveThreshold}
                  disabled={
                    !formData.alert_type || formData.threshold_value === 0
                  }
                >
                  {editingThreshold ? 'Update' : 'Create'} Threshold
                </Button>
              </div>
            </Card>
          )}

          {/* Threshold List */}
          <div className="space-y-4">
            {thresholds.map((threshold) => {
              const AlertIcon =
                ALERT_TYPES.find((t) => t.value === threshold.alert_type)
                  ?.icon || Bell;

              return (
                <Card key={threshold.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-lg ${threshold.is_active ? 'bg-primary-50' : 'bg-gray-100'}`}
                      >
                        <AlertIcon
                          className={`w-5 h-5 ${threshold.is_active ? 'text-primary-600' : 'text-gray-400'}`}
                        />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {getAlertTypeLabel(threshold.alert_type)}
                        </h4>
                        <p className="text-sm text-gray-600">
                          Alert when value is{' '}
                          {getOperatorLabel(
                            threshold.comparison_operator,
                          ).toLowerCase()}{' '}
                          {threshold.threshold_value}
                          {threshold.alert_type === 'response_rate' ? '%' : ''}
                        </p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex gap-1">
                            {threshold.notification_channels.map((channel) => {
                              const ChannelIcon =
                                NOTIFICATION_CHANNELS.find(
                                  (c) => c.value === channel,
                                )?.icon || Bell;
                              return (
                                <ChannelIcon
                                  key={channel}
                                  className="w-3 h-3 text-gray-400"
                                />
                              );
                            })}
                          </div>
                          {threshold.last_triggered_at && (
                            <span className="text-xs text-gray-500">
                              Last triggered:{' '}
                              {formatDate(threshold.last_triggered_at)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={threshold.is_active ? 'success' : 'secondary'}
                      >
                        {threshold.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          toggleThreshold(threshold.id, threshold.is_active)
                        }
                      >
                        {threshold.is_active ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => editThreshold(threshold)}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteThreshold(threshold.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}

            {thresholds.length === 0 && (
              <Card className="p-8 text-center">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Alert Thresholds
                </h3>
                <p className="text-gray-500 mb-4">
                  Set up automated alerts to monitor your wedding planning
                  metrics
                </p>
                <Button onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Threshold
                </Button>
              </Card>
            )}
          </div>
        </>
      ) : (
        /* Alert History */
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Alert History</h3>

          {alertHistory.map((alert) => (
            <Card
              key={alert.id}
              className={`p-4 ${!alert.acknowledged ? 'border-error-200' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={SEVERITY_COLORS[alert.severity]}>
                      {alert.severity}
                    </Badge>
                    <span className="text-sm font-medium text-gray-900">
                      {getAlertTypeLabel(alert.alert_type)}
                    </span>
                    {!alert.acknowledged && (
                      <Badge variant="error">Unacknowledged</Badge>
                    )}
                  </div>
                  <p className="text-gray-700 mb-2">{alert.message}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span>Actual: {alert.actual_value}%</span>
                    <span>Threshold: {alert.threshold_value}%</span>
                    <span>{formatDate(alert.created_at)}</span>
                  </div>
                  {alert.acknowledged && alert.acknowledged_at && (
                    <p className="text-xs text-gray-500 mt-2">
                      Acknowledged on {formatDate(alert.acknowledged_at)}
                    </p>
                  )}
                </div>
                {!alert.acknowledged && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => acknowledgeAlert(alert.id)}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Acknowledge
                  </Button>
                )}
              </div>
            </Card>
          ))}

          {alertHistory.length === 0 && (
            <Card className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No Alert History
              </h3>
              <p className="text-gray-500">
                Alert history will appear here when thresholds are triggered
              </p>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
