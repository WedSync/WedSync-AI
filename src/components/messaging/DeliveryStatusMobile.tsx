'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { TouchButton } from '@/components/touch/TouchButton';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Check,
  Clock,
  X,
  AlertCircle,
  MessageSquare,
  Send,
  Mail,
  Phone,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
  ExternalLink,
} from 'lucide-react';

interface DeliveryStatus {
  id: string;
  status: 'queued' | 'sending' | 'delivered' | 'read' | 'failed' | 'offline';
  timestamp: Date;
  error?: string;
}

interface MessageDelivery {
  id: string;
  message: string;
  sentAt: Date;
  recipientCount: number;
  channel: 'sms' | 'email' | 'push' | 'whatsapp';
  deliveries: {
    guestId: string;
    guestName: string;
    status: DeliveryStatus;
  }[];
  overallStatus: 'pending' | 'partial' | 'complete' | 'failed';
  isUrgent?: boolean;
}

interface DeliveryStatusMobileProps {
  messages: MessageDelivery[];
  onRefresh?: () => void;
  onRetry?: (messageId: string, failedGuestIds: string[]) => void;
  onViewDetails?: (messageId: string) => void;
  isRefreshing?: boolean;
  isOffline?: boolean;
}

const statusConfig = {
  queued: {
    icon: Clock,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    label: 'Queued',
    description: 'Waiting to send',
  },
  sending: {
    icon: Send,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    label: 'Sending',
    description: 'Being sent',
  },
  delivered: {
    icon: Check,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    label: 'Delivered',
    description: 'Successfully delivered',
  },
  read: {
    icon: Eye,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    label: 'Read',
    description: 'Opened/Read',
  },
  failed: {
    icon: X,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    label: 'Failed',
    description: 'Delivery failed',
  },
  offline: {
    icon: WifiOff,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    label: 'Offline',
    description: 'Will send when online',
  },
};

const channelConfig = {
  sms: { icon: Phone, label: 'SMS', color: 'text-green-600' },
  email: { icon: Mail, label: 'Email', color: 'text-blue-600' },
  push: { icon: MessageSquare, label: 'Push', color: 'text-purple-600' },
  whatsapp: { icon: MessageSquare, label: 'WhatsApp', color: 'text-green-600' },
};

const overallStatusColors = {
  pending: 'secondary',
  partial: 'outline',
  complete: 'default',
  failed: 'destructive',
} as const;

export function DeliveryStatusMobile({
  messages,
  onRefresh,
  onRetry,
  onViewDetails,
  isRefreshing = false,
  isOffline = false,
}: DeliveryStatusMobileProps) {
  const [expandedMessage, setExpandedMessage] = useState<string | null>(null);

  const getDeliveryProgress = (message: MessageDelivery) => {
    const total = message.deliveries.length;
    const delivered = message.deliveries.filter((d) =>
      ['delivered', 'read'].includes(d.status.status),
    ).length;
    return {
      delivered,
      total,
      percentage: total > 0 ? (delivered / total) * 100 : 0,
    };
  };

  const getFailedDeliveries = (message: MessageDelivery) => {
    return message.deliveries.filter((d) => d.status.status === 'failed');
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const toggleExpanded = (messageId: string) => {
    setExpandedMessage(expandedMessage === messageId ? null : messageId);
  };

  const handleRetry = (messageId: string) => {
    const failedDeliveries = getFailedDeliveries(
      messages.find((m) => m.id === messageId)!,
    );
    const failedGuestIds = failedDeliveries.map((d) => d.guestId);
    onRetry?.(messageId, failedGuestIds);
  };

  if (messages.length === 0) {
    return (
      <Card className="p-6 text-center">
        <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium mb-1">No messages sent</h3>
        <p className="text-sm text-muted-foreground">
          Message delivery status will appear here
        </p>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-muted/50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Message Status</h3>
          <div className="flex items-center gap-2">
            {isOffline && (
              <div className="flex items-center gap-1 text-orange-600">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm">Offline</span>
              </div>
            )}
            {onRefresh && (
              <TouchButton
                size="sm"
                variant="outline"
                onClick={onRefresh}
                disabled={isRefreshing}
                className="h-8"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                />
              </TouchButton>
            )}
          </div>
        </div>
      </div>

      {/* Messages List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {messages.map((message) => {
            const progress = getDeliveryProgress(message);
            const failedDeliveries = getFailedDeliveries(message);
            const isExpanded = expandedMessage === message.id;
            const ChannelIcon = channelConfig[message.channel].icon;

            return (
              <Card key={message.id} className="p-4">
                {/* Message Summary */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <ChannelIcon
                          className={`w-4 h-4 ${channelConfig[message.channel].color}`}
                        />
                        <Badge
                          variant={overallStatusColors[message.overallStatus]}
                        >
                          {message.overallStatus}
                        </Badge>
                        {message.isUrgent && (
                          <Badge variant="destructive" className="text-xs">
                            Urgent
                          </Badge>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {message.message}
                      </p>

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{formatRelativeTime(message.sentAt)}</span>
                        <span>{message.recipientCount} recipients</span>
                        <span>{channelConfig[message.channel].label}</span>
                      </div>
                    </div>

                    {onViewDetails && (
                      <TouchButton
                        size="sm"
                        variant="ghost"
                        onClick={() => onViewDetails(message.id)}
                        className="h-8 w-8 p-0 shrink-0"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </TouchButton>
                    )}
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Delivery Progress</span>
                      <span className="text-muted-foreground">
                        {progress.delivered}/{progress.total}
                      </span>
                    </div>
                    <Progress value={progress.percentage} className="h-2" />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <TouchButton
                      size="sm"
                      variant="outline"
                      onClick={() => toggleExpanded(message.id)}
                      className="flex-1"
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </TouchButton>

                    {failedDeliveries.length > 0 && onRetry && (
                      <TouchButton
                        size="sm"
                        variant="outline"
                        onClick={() => handleRetry(message.id)}
                        className="flex-1"
                      >
                        <RefreshCw className="w-3 h-3 mr-1" />
                        Retry Failed ({failedDeliveries.length})
                      </TouchButton>
                    )}
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <h4 className="text-sm font-medium mb-3">
                        Individual Status
                      </h4>
                      <div className="space-y-2">
                        {message.deliveries.map((delivery) => {
                          const statusInfo =
                            statusConfig[delivery.status.status];
                          const StatusIcon = statusInfo.icon;

                          return (
                            <div
                              key={delivery.guestId}
                              className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                            >
                              <div
                                className={`p-1.5 rounded-full ${statusInfo.bgColor}`}
                              >
                                <StatusIcon
                                  className={`w-3 h-3 ${statusInfo.color}`}
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">
                                  {delivery.guestName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {statusInfo.description}
                                  {delivery.status.timestamp && (
                                    <>
                                      {' '}
                                      •{' '}
                                      {formatRelativeTime(
                                        delivery.status.timestamp,
                                      )}
                                    </>
                                  )}
                                </p>
                                {delivery.status.error && (
                                  <p className="text-xs text-red-600 mt-1">
                                    {delivery.status.error}
                                  </p>
                                )}
                              </div>

                              <Badge
                                variant="outline"
                                className="text-xs shrink-0"
                              >
                                {statusInfo.label}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}
