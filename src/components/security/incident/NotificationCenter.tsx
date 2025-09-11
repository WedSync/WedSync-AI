'use client';

import React, { useState } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Phone,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  Eye,
  EyeOff,
  Heart,
  Building,
} from 'lucide-react';

export interface NotificationRule {
  id: string;
  name: string;
  triggerSeverity: ('P1' | 'P2' | 'P3' | 'P4')[];
  triggerEvents: (
    | 'incident_created'
    | 'status_changed'
    | 'escalated'
    | 'resolved'
  )[];
  channels: ('email' | 'sms' | 'webhook' | 'in_app' | 'phone')[];
  recipients: {
    type: 'role' | 'user' | 'external';
    identifier: string;
    name: string;
  }[];
  weddingDayOverride: boolean;
  enabled: boolean;
  template?: string;
}

export interface Notification {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'in_app' | 'phone';
  recipient: {
    name: string;
    contact: string;
    role?: string;
  };
  subject: string;
  content: string;
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  incidentId: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  isWeddingRelated: boolean;
  retryCount: number;
  templateUsed?: string;
}

interface NotificationCenterProps {
  incidentId: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  notifications: Notification[];
  rules: NotificationRule[];
  isWeddingDay?: boolean;
  onSendNotification: (notification: Partial<Notification>) => void;
  onRetryNotification: (notificationId: string) => void;
  onUpdateRule: (rule: NotificationRule) => void;
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  incidentId,
  severity,
  notifications,
  rules,
  isWeddingDay = false,
  onSendNotification,
  onRetryNotification,
  onUpdateRule,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<
    'notifications' | 'rules' | 'compose'
  >('notifications');
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [composeForm, setComposeForm] = useState({
    type: 'email' as Notification['type'],
    recipient: '',
    subject: '',
    content: '',
    urgent: false,
  });

  const channelConfig = {
    email: {
      icon: Mail,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Email',
    },
    sms: {
      icon: MessageSquare,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'SMS',
    },
    webhook: {
      icon: Send,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      label: 'Webhook',
    },
    in_app: {
      icon: Bell,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      label: 'In-App',
    },
    phone: {
      icon: Phone,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      label: 'Phone',
    },
  };

  const statusConfig = {
    pending: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Pending' },
    sent: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Sent' },
    delivered: {
      color: 'text-green-600',
      bg: 'bg-green-100',
      label: 'Delivered',
    },
    failed: { color: 'text-red-600', bg: 'bg-red-100', label: 'Failed' },
    bounced: {
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      label: 'Bounced',
    },
  };

  const formatTime = (date?: Date) => {
    if (!date) return 'N/A';
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getWeddingStakeholders = () => [
    {
      type: 'role',
      identifier: 'wedding_coordinator',
      name: 'Wedding Coordinators',
    },
    { type: 'role', identifier: 'venue_manager', name: 'Venue Managers' },
    { type: 'role', identifier: 'photographer', name: 'Photographers' },
    { type: 'role', identifier: 'catering_team', name: 'Catering Teams' },
    {
      type: 'external',
      identifier: 'couple_emergency',
      name: 'Couple (Emergency)',
    },
    { type: 'external', identifier: 'venue_security', name: 'Venue Security' },
  ];

  const getNotificationsByStatus = (status: Notification['status']) =>
    notifications.filter((n) => n.status === status);

  const handleComposeSubmit = () => {
    onSendNotification({
      type: composeForm.type,
      recipient: {
        name: composeForm.recipient.split('(')[0].trim(),
        contact: composeForm.recipient,
        role: 'manual',
      },
      subject: composeForm.subject,
      content: composeForm.content,
      incidentId,
      severity,
      isWeddingRelated: isWeddingDay,
      status: 'pending',
      retryCount: 0,
    });

    setComposeForm({
      type: 'email',
      recipient: '',
      subject: '',
      content: '',
      urgent: false,
    });
    setShowComposeModal(false);
  };

  const renderNotifications = () => (
    <div className="space-y-4">
      {/* Wedding Day Emergency Banner */}
      {isWeddingDay && severity === 'P1' && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center text-red-800 font-medium mb-2">
            <Heart className="w-5 h-5 mr-2" />
            Wedding Day Emergency Protocol Active
          </div>
          <p className="text-red-700 text-sm">
            All P1 notifications include wedding day context and emergency
            contacts. Venues and couples receive immediate alerts.
          </p>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const count = getNotificationsByStatus(
            status as Notification['status'],
          ).length;
          return (
            <div
              key={status}
              className={`p-3 rounded-lg border ${config.bg} border-gray-200`}
            >
              <div className={`text-lg font-semibold ${config.color}`}>
                {count}
              </div>
              <div className="text-sm text-gray-600">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-2">
        {notifications.map((notification) => {
          const channelStyle = channelConfig[notification.type];
          const statusStyle = statusConfig[notification.status];
          const ChannelIcon = channelStyle.icon;

          return (
            <div
              key={notification.id}
              className={`
                p-4 rounded-lg border transition-all
                ${channelStyle.bgColor} ${channelStyle.borderColor}
                ${notification.isWeddingRelated ? 'ring-1 ring-purple-300' : ''}
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div
                    className={`p-2 rounded-lg ${channelStyle.bgColor} border ${channelStyle.borderColor}`}
                  >
                    <ChannelIcon className={`w-4 h-4 ${channelStyle.color}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-800">
                        {notification.recipient.name}
                      </h4>
                      <span className="text-sm text-gray-500">
                        ({notification.recipient.contact})
                      </span>
                      {notification.isWeddingRelated && (
                        <div className="flex items-center text-purple-600">
                          <Heart className="w-3 h-3 mr-1" />
                          <span className="text-xs">Wedding</span>
                        </div>
                      )}
                    </div>

                    <h5 className="font-medium text-gray-700 text-sm mb-2">
                      {notification.subject}
                    </h5>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {notification.content}
                    </p>

                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        Sent: {formatTime(notification.sentAt)}
                      </div>
                      {notification.deliveredAt && (
                        <div>
                          Delivered: {formatTime(notification.deliveredAt)}
                        </div>
                      )}
                      {notification.retryCount > 0 && (
                        <div>Retries: {notification.retryCount}</div>
                      )}
                    </div>

                    {notification.failureReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        Failure: {notification.failureReason}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <span
                    className={`
                    px-2 py-1 rounded-full text-xs font-medium
                    ${statusStyle.bg} ${statusStyle.color}
                  `}
                  >
                    {statusStyle.label}
                  </span>

                  {notification.status === 'failed' && (
                    <button
                      onClick={() => onRetryNotification(notification.id)}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {notifications.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No notifications sent for this incident yet.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderRules = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800">Notification Rules</h3>
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
          Add Rule
        </button>
      </div>

      {rules.map((rule) => (
        <div
          key={rule.id}
          className="p-4 bg-white border border-gray-200 rounded-lg"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <h4 className="font-medium text-gray-800">{rule.name}</h4>
                <button
                  onClick={() =>
                    onUpdateRule({ ...rule, enabled: !rule.enabled })
                  }
                  className="flex items-center text-sm"
                >
                  {rule.enabled ? (
                    <Eye className="w-4 h-4 text-green-600" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                {rule.weddingDayOverride && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                    Wedding Override
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-600">Triggers: </span>
                  <span className="text-gray-800">
                    {rule.triggerSeverity.join(', ')} |{' '}
                    {rule.triggerEvents.join(', ')}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-gray-600">Channels: </span>
                  <span className="text-gray-800">
                    {rule.channels.join(', ')}
                  </span>
                </div>

                <div>
                  <span className="font-medium text-gray-600">
                    Recipients:{' '}
                  </span>
                  <span className="text-gray-800">
                    {rule.recipients.map((r) => r.name).join(', ')}
                  </span>
                </div>
              </div>
            </div>

            <button className="text-blue-600 hover:text-blue-800 text-sm">
              Edit
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Bell className="w-6 h-6 mr-2" />
            Notification Center
          </h2>
          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
            {notifications.length} notifications
          </span>
        </div>

        <button
          onClick={() => setShowComposeModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center text-sm font-medium"
        >
          <Send className="w-4 h-4 mr-2" />
          Send Manual Alert
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {[
          {
            key: 'notifications',
            label: 'Notifications',
            count: notifications.length,
          },
          { key: 'rules', label: 'Rules', count: rules.length },
        ].map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key as any)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'notifications' && renderNotifications()}
      {activeTab === 'rules' && renderRules()}

      {/* Compose Modal */}
      {showComposeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <Send className="w-6 h-6 mr-2 text-blue-600" />
              <h3 className="text-lg font-semibold">Send Manual Alert</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel
                </label>
                <select
                  value={composeForm.type}
                  onChange={(e) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      type: e.target.value as any,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  {Object.entries(channelConfig).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient
                </label>
                <input
                  type="text"
                  value={composeForm.recipient}
                  onChange={(e) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      recipient: e.target.value,
                    }))
                  }
                  placeholder="Enter email, phone, or name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={composeForm.subject}
                  onChange={(e) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      subject: e.target.value,
                    }))
                  }
                  placeholder="Alert subject"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={composeForm.content}
                  onChange={(e) =>
                    setComposeForm((prev) => ({
                      ...prev,
                      content: e.target.value,
                    }))
                  }
                  placeholder="Alert message content"
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>

              {isWeddingDay && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center text-purple-800 text-sm">
                    <Heart className="w-4 h-4 mr-2" />
                    Wedding context will be automatically included
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowComposeModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleComposeSubmit}
                disabled={
                  !composeForm.recipient ||
                  !composeForm.subject ||
                  !composeForm.content
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
