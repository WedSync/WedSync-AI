'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Check,
  X,
  MessageSquare,
  MapPin,
  Briefcase,
  Users,
  ChevronDown,
  ChevronUp,
  Clock,
  Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionRequest {
  id: string;
  status: 'pending' | 'connected' | 'declined';
  connection_type:
    | 'professional'
    | 'referral_partner'
    | 'collaboration'
    | 'mentor'
    | 'peer';
  trust_level: number;
  initial_message?: string;
  requested_at: string;
  other_vendor: {
    id: string;
    business_name: string;
    primary_category: string;
    city: string;
    featured_image?: string;
    years_in_business?: number;
    description?: string;
  };
  perspective: 'sent' | 'received';
}

interface ConnectionRequestCardProps {
  connection: ConnectionRequest;
  onAccept?: (connectionId: string) => Promise<void>;
  onDecline?: (connectionId: string) => Promise<void>;
  onMessage?: (vendorId: string) => void;
  className?: string;
}

export default function ConnectionRequestCard({
  connection,
  onAccept,
  onDecline,
  onMessage,
  className,
}: ConnectionRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [processing, setProcessing] = useState<'accept' | 'decline' | null>(
    null,
  );

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60),
    );

    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return `${Math.floor(diffInDays / 7)}w ago`;
  };

  const getConnectionTypeLabel = (type: string) => {
    switch (type) {
      case 'referral_partner':
        return 'Referral Partner';
      case 'collaboration':
        return 'Collaboration';
      case 'mentor':
        return 'Mentor';
      case 'peer':
        return 'Peer';
      default:
        return 'Professional';
    }
  };

  const getConnectionTypeColor = (type: string) => {
    switch (type) {
      case 'referral_partner':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'collaboration':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'mentor':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'peer':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const handleAccept = async () => {
    if (!onAccept) return;

    try {
      setProcessing('accept');
      await onAccept(connection.id);
    } catch (error) {
      console.error('Error accepting connection:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleDecline = async () => {
    if (!onDecline) return;

    try {
      setProcessing('decline');
      await onDecline(connection.id);
    } catch (error) {
      console.error('Error declining connection:', error);
    } finally {
      setProcessing(null);
    }
  };

  const isPending = connection.status === 'pending';
  const isReceived = connection.perspective === 'received';
  const canRespond = isPending && isReceived;

  return (
    <Card className={cn('transition-all duration-200', className)}>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-start space-x-3">
            <Avatar className="h-14 w-14 ring-2 ring-white shadow-sm">
              <AvatarImage src={connection.other_vendor.featured_image} />
              <AvatarFallback className="text-lg font-semibold">
                {getInitials(connection.other_vendor.business_name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-lg text-gray-900 truncate">
                    {connection.other_vendor.business_name}
                  </h3>
                  <p className="text-sm text-gray-600 font-medium">
                    {connection.other_vendor.primary_category}
                  </p>
                </div>

                <div className="flex flex-col items-end space-y-1">
                  <Badge
                    variant={
                      connection.status === 'connected'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="text-xs"
                  >
                    {connection.status}
                  </Badge>
                  <div className="flex items-center text-xs text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTimeAgo(connection.requested_at)}
                  </div>
                </div>
              </div>

              {/* Connection details */}
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  <span>{connection.other_vendor.city}</span>
                </div>
                {connection.other_vendor.years_in_business && (
                  <div className="flex items-center">
                    <Briefcase className="h-4 w-4 mr-1" />
                    <span>
                      {connection.other_vendor.years_in_business}y exp
                    </span>
                  </div>
                )}
              </div>

              {/* Connection type */}
              <div className="mt-2">
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border',
                    getConnectionTypeColor(connection.connection_type),
                  )}
                >
                  {getConnectionTypeLabel(connection.connection_type)}
                </span>
              </div>
            </div>
          </div>

          {/* Message preview or description */}
          <div className="space-y-2">
            {connection.initial_message && (
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {expanded
                        ? connection.initial_message
                        : connection.initial_message.length > 120
                          ? `${connection.initial_message.slice(0, 120)}...`
                          : connection.initial_message}
                    </p>
                  </div>
                  {connection.initial_message.length > 120 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpanded(!expanded)}
                      className="ml-2 p-1"
                    >
                      {expanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {connection.other_vendor.description && expanded && (
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">
                  About {connection.other_vendor.business_name}:
                </p>
                <p>{connection.other_vendor.description}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex items-center space-x-2">
              {/* Trust level indicator */}
              <div className="flex items-center text-xs text-gray-500">
                <Star className="h-4 w-4 mr-1 fill-current text-yellow-400" />
                <span>{connection.trust_level}/5</span>
              </div>

              {/* Message button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMessage?.(connection.other_vendor.id)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>

            {/* Response buttons (only for pending received requests) */}
            {canRespond && (
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDecline}
                  disabled={processing !== null}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  {processing === 'decline' ? (
                    <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>

                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={processing !== null}
                >
                  {processing === 'accept' ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      Accepting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Accept
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Status for sent requests */}
            {connection.perspective === 'sent' && isPending && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                Awaiting response
              </Badge>
            )}

            {/* Connected status */}
            {connection.status === 'connected' && (
              <Badge
                variant="secondary"
                className="text-xs bg-green-50 text-green-700"
              >
                <Users className="h-3 w-3 mr-1" />
                Connected
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
