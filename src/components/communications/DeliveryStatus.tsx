'use client';

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import {
  DeliveryStatusProps,
  BulkMessageData,
  BulkDeliveryStats,
} from '@/types/communications';
import {
  ActivityIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  MailIcon,
  SmartphoneIcon,
  MessageCircleIcon,
  RefreshCwIcon,
  EyeIcon,
  TrendingUpIcon,
  AlertCircleIcon,
  BarChart3Icon,
} from 'lucide-react';

interface DetailedDeliveryStatus {
  guest_id: string;
  guest_name: string;
  email?: string;
  phone?: string;
  email_status?:
    | 'sent'
    | 'delivered'
    | 'failed'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'spam';
  sms_status?: 'sent' | 'delivered' | 'failed' | 'clicked';
  whatsapp_status?: 'sent' | 'delivered' | 'failed' | 'read';
  error_message?: string;
  sent_at?: string;
  delivered_at?: string;
  opened_at?: string;
  clicked_at?: string;
}

// Mock detailed status data - in real app this would come from API
const generateMockDetailedStatus = (
  recipientIds: string[],
): DetailedDeliveryStatus[] => {
  return recipientIds.map((id, index) => ({
    guest_id: id,
    guest_name: `Guest ${index + 1}`,
    email: `guest${index + 1}@example.com`,
    phone: `+1555000${String(index).padStart(4, '0')}`,
    email_status: (
      ['sent', 'delivered', 'opened', 'clicked', 'failed'] as const
    )[index % 5],
    sms_status:
      index % 3 === 0
        ? (['sent', 'delivered', 'clicked'] as const)[index % 3]
        : undefined,
    sent_at: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    delivered_at:
      index % 4 !== 3
        ? new Date(Date.now() - Math.random() * 1800000).toISOString()
        : undefined,
    opened_at:
      index % 5 === 2
        ? new Date(Date.now() - Math.random() * 900000).toISOString()
        : undefined,
    clicked_at:
      index % 8 === 1
        ? new Date(Date.now() - Math.random() * 600000).toISOString()
        : undefined,
    error_message: index % 5 === 4 ? 'Invalid email address' : undefined,
  }));
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'sent':
      return 'text-blue-600 bg-blue-100';
    case 'delivered':
      return 'text-green-600 bg-green-100';
    case 'opened':
      return 'text-purple-600 bg-purple-100';
    case 'clicked':
      return 'text-indigo-600 bg-indigo-100';
    case 'failed':
    case 'bounced':
    case 'spam':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'sent':
      return <ClockIcon className="w-4 h-4" />;
    case 'delivered':
      return <CheckCircleIcon className="w-4 h-4" />;
    case 'opened':
      return <EyeIcon className="w-4 h-4" />;
    case 'clicked':
      return <TrendingUpIcon className="w-4 h-4" />;
    case 'failed':
    case 'bounced':
    case 'spam':
      return <XCircleIcon className="w-4 h-4" />;
    default:
      return <ClockIcon className="w-4 h-4" />;
  }
};

export function DeliveryStatus({
  bulkMessage,
  onRefresh,
  onViewDetails,
  className,
}: DeliveryStatusProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [detailedStatus, setDetailedStatus] = useState<
    DetailedDeliveryStatus[]
  >([]);
  const [selectedChannel, setSelectedChannel] = useState<
    'all' | 'email' | 'sms' | 'whatsapp'
  >('all');

  // Auto-refresh every 30 seconds if message is still sending
  useEffect(() => {
    if (bulkMessage.status === 'sending') {
      const interval = setInterval(() => {
        handleRefresh();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [bulkMessage.status]);

  // Generate mock detailed status
  useEffect(() => {
    if (showDetails && detailedStatus.length === 0) {
      setDetailedStatus(generateMockDetailedStatus(bulkMessage.recipient_ids));
    }
  }, [showDetails, bulkMessage.recipient_ids, detailedStatus.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      // Update detailed status if showing
      if (showDetails) {
        setDetailedStatus(
          generateMockDetailedStatus(bulkMessage.recipient_ids),
        );
      }
    } catch (error) {
      console.error('Failed to refresh status:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const overallStats = useMemo(() => {
    const stats = bulkMessage.delivery_stats;
    const totalSent = stats.email.sent + stats.sms.sent + stats.whatsapp.sent;
    const totalDelivered =
      stats.email.delivered + stats.sms.delivered + stats.whatsapp.delivered;
    const totalFailed =
      stats.email.failed + stats.sms.failed + stats.whatsapp.failed;
    const totalOpened = stats.email.opened;
    const totalClicked = stats.email.clicked + stats.sms.clicked;

    return {
      sent: totalSent,
      delivered: totalDelivered,
      failed: totalFailed,
      opened: totalOpened,
      clicked: totalClicked,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0,
      openRate:
        stats.email.delivered > 0
          ? (stats.email.opened / stats.email.delivered) * 100
          : 0,
      clickRate:
        stats.email.delivered > 0
          ? (stats.email.clicked / stats.email.delivered) * 100
          : 0,
    };
  }, [bulkMessage.delivery_stats]);

  const filteredDetailedStatus = useMemo(() => {
    if (selectedChannel === 'all') return detailedStatus;
    return detailedStatus.filter((status) => {
      if (selectedChannel === 'email') return status.email_status;
      if (selectedChannel === 'sms') return status.sms_status;
      if (selectedChannel === 'whatsapp') return status.whatsapp_status;
      return false;
    });
  }, [detailedStatus, selectedChannel]);

  const getOverallStatus = () => {
    if (bulkMessage.status === 'sending')
      return {
        icon: <ActivityIcon className="w-6 h-6" />,
        label: 'Sending...',
        color: 'text-blue-600 bg-blue-100',
      };
    if (bulkMessage.status === 'sent')
      return {
        icon: <CheckCircleIcon className="w-6 h-6" />,
        label: 'Completed',
        color: 'text-green-600 bg-green-100',
      };
    if (bulkMessage.status === 'failed')
      return {
        icon: <XCircleIcon className="w-6 h-6" />,
        label: 'Failed',
        color: 'text-red-600 bg-red-100',
      };
    if (bulkMessage.status === 'scheduled')
      return {
        icon: <ClockIcon className="w-6 h-6" />,
        label: 'Scheduled',
        color: 'text-yellow-600 bg-yellow-100',
      };
    return {
      icon: <ClockIcon className="w-6 h-6" />,
      label: 'Unknown',
      color: 'text-gray-600 bg-gray-100',
    };
  };

  const status = getOverallStatus();

  return (
    <div className={cn('space-y-8', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn('p-2 rounded-lg', status.color)}>
            {status.icon}
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Delivery Status
            </h2>
            <p className="text-sm text-gray-600">
              Track the progress of your message delivery
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={cn(
              'flex items-center px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100',
              isRefreshing && 'opacity-50 cursor-not-allowed',
            )}
          >
            <RefreshCwIcon
              className={cn('w-4 h-4 mr-2', isRefreshing && 'animate-spin')}
            />
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
          >
            <BarChart3Icon className="w-4 h-4 mr-2" />
            {showDetails ? 'Hide Details' : 'View Details'}
          </button>
        </div>
      </div>

      {/* Overall Status Card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className={cn('p-3 rounded-xl', status.color)}>
              {status.icon}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">
                {status.label}
              </h3>
              <p className="text-sm text-gray-600">
                {bulkMessage.sent_at
                  ? `Sent ${new Date(bulkMessage.sent_at).toLocaleString()}`
                  : 'Ready to send'}
              </p>
            </div>
          </div>

          {bulkMessage.scheduled_for && bulkMessage.status === 'scheduled' && (
            <div className="text-right">
              <div className="text-sm text-gray-600">Scheduled for</div>
              <div className="text-lg font-semibold text-gray-900">
                {new Date(bulkMessage.scheduled_for).toLocaleString()}
              </div>
            </div>
          )}
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {overallStats.sent}
            </div>
            <div className="text-sm text-gray-600">Sent</div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {overallStats.delivered}
            </div>
            <div className="text-sm text-gray-600">Delivered</div>
            <div className="text-xs text-gray-500">
              {overallStats.deliveryRate.toFixed(1)}%
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {overallStats.opened}
            </div>
            <div className="text-sm text-gray-600">Opened</div>
            <div className="text-xs text-gray-500">
              {overallStats.openRate.toFixed(1)}%
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">
              {overallStats.clicked}
            </div>
            <div className="text-sm text-gray-600">Clicked</div>
            <div className="text-xs text-gray-500">
              {overallStats.clickRate.toFixed(1)}%
            </div>
          </div>

          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {overallStats.failed}
            </div>
            <div className="text-sm text-gray-600">Failed</div>
          </div>
        </div>
      </div>

      {/* Channel Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Email Stats */}
        {bulkMessage.delivery_options.channels.includes('email') && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <MailIcon className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-medium text-gray-900">Email</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sent</span>
                <span className="font-medium">
                  {bulkMessage.delivery_stats.email.sent}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Delivered</span>
                <span className="font-medium text-green-600">
                  {bulkMessage.delivery_stats.email.delivered}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Opened</span>
                <span className="font-medium text-purple-600">
                  {bulkMessage.delivery_stats.email.opened}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Clicked</span>
                <span className="font-medium text-indigo-600">
                  {bulkMessage.delivery_stats.email.clicked}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Failed</span>
                <span className="font-medium text-red-600">
                  {bulkMessage.delivery_stats.email.failed}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* SMS Stats */}
        {bulkMessage.delivery_options.channels.includes('sms') && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <SmartphoneIcon className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">SMS</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sent</span>
                <span className="font-medium">
                  {bulkMessage.delivery_stats.sms.sent}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Delivered</span>
                <span className="font-medium text-green-600">
                  {bulkMessage.delivery_stats.sms.delivered}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Clicked</span>
                <span className="font-medium text-indigo-600">
                  {bulkMessage.delivery_stats.sms.clicked}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Failed</span>
                <span className="font-medium text-red-600">
                  {bulkMessage.delivery_stats.sms.failed}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* WhatsApp Stats */}
        {bulkMessage.delivery_options.channels.includes('whatsapp') && (
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <MessageCircleIcon className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-medium text-gray-900">WhatsApp</h3>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Sent</span>
                <span className="font-medium">
                  {bulkMessage.delivery_stats.whatsapp.sent}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Delivered</span>
                <span className="font-medium text-green-600">
                  {bulkMessage.delivery_stats.whatsapp.delivered}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Read</span>
                <span className="font-medium text-blue-600">
                  {bulkMessage.delivery_stats.whatsapp.read}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Failed</span>
                <span className="font-medium text-red-600">
                  {bulkMessage.delivery_stats.whatsapp.failed}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detailed Status */}
      {showDetails && (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Individual Guest Status
            </h3>

            <div className="flex space-x-2">
              {(['all', 'email', 'sms', 'whatsapp'] as const).map((channel) => {
                if (
                  channel !== 'all' &&
                  !bulkMessage.delivery_options.channels.includes(channel)
                ) {
                  return null;
                }

                return (
                  <button
                    key={channel}
                    onClick={() => setSelectedChannel(channel)}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg capitalize transition-colors duration-200',
                      selectedChannel === channel
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                    )}
                  >
                    {channel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden border border-gray-200 rounded-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Guest
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    {(selectedChannel === 'all' ||
                      selectedChannel === 'email') && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email Status
                      </th>
                    )}
                    {(selectedChannel === 'all' ||
                      selectedChannel === 'sms') && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SMS Status
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Updated
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredDetailedStatus.slice(0, 50).map((status, index) => (
                    <tr
                      key={status.guest_id}
                      className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {status.guest_name}
                        </div>
                        {status.error_message && (
                          <div className="flex items-center mt-1">
                            <AlertCircleIcon className="w-4 h-4 text-red-500 mr-1" />
                            <span className="text-xs text-red-600">
                              {status.error_message}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {status.email && <div>📧 {status.email}</div>}
                        {status.phone && <div>📱 {status.phone}</div>}
                      </td>

                      {(selectedChannel === 'all' ||
                        selectedChannel === 'email') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {status.email_status ? (
                            <span
                              className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                getStatusColor(status.email_status),
                              )}
                            >
                              {getStatusIcon(status.email_status)}
                              <span className="ml-1 capitalize">
                                {status.email_status}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      )}

                      {(selectedChannel === 'all' ||
                        selectedChannel === 'sms') && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          {status.sms_status ? (
                            <span
                              className={cn(
                                'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                                getStatusColor(status.sms_status),
                              )}
                            >
                              {getStatusIcon(status.sms_status)}
                              <span className="ml-1 capitalize">
                                {status.sms_status}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      )}

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {status.delivered_at
                          ? new Date(status.delivered_at).toLocaleString()
                          : status.sent_at
                            ? new Date(status.sent_at).toLocaleString()
                            : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredDetailedStatus.length > 50 && (
              <div className="bg-gray-50 px-6 py-3 text-center">
                <span className="text-sm text-gray-600">
                  Showing 50 of {filteredDetailedStatus.length} recipients
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
