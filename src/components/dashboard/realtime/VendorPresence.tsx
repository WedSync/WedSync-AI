'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePresence } from '@/hooks/useRealtime';
import { formatDistanceToNow } from 'date-fns';
import {
  User,
  Circle,
  MapPin,
  Clock,
  Activity,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VendorPresence } from '@/types/realtime';

interface VendorPresenceIndicatorProps {
  vendorId: string;
  vendorName: string;
  showDetails?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function VendorPresenceIndicator({
  vendorId,
  vendorName,
  showDetails = false,
  size = 'md',
  className,
}: VendorPresenceIndicatorProps) {
  const { onlineUsers, isTracking } = usePresence(`vendor-${vendorId}`, {
    userId: vendorId,
    userData: { name: vendorName, role: 'vendor' },
  });

  const vendorPresence = useMemo(() => {
    return onlineUsers.find((user) => user.userId === vendorId);
  }, [onlineUsers, vendorId]);

  const isOnline = !!vendorPresence;
  const status = vendorPresence?.status || 'offline';

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-400',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <Circle
          className={cn(
            sizeClasses[size],
            statusColors[status as keyof typeof statusColors],
            'rounded-full',
            isOnline && 'animate-pulse',
          )}
          fill="currentColor"
        />
      </div>

      {showDetails && (
        <div className="text-sm">
          <span className="font-medium">{vendorName}</span>
          {vendorPresence?.lastSeen && (
            <span className="text-gray-500 ml-1">
              (
              {formatDistanceToNow(vendorPresence.lastSeen, {
                addSuffix: true,
              })}
              )
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface VendorPresenceListProps {
  vendors: Array<{
    id: string;
    name: string;
    role?: string;
    avatar?: string;
  }>;
  roomId: string;
  showOffline?: boolean;
  className?: string;
}

export function VendorPresenceList({
  vendors,
  roomId,
  showOffline = true,
  className,
}: VendorPresenceListProps) {
  const { onlineUsers, activeUserCount, isTracking } = usePresence(roomId, {
    userId: 'system',
    userData: { role: 'system' },
  });

  const vendorStatuses = useMemo(() => {
    return vendors.map((vendor) => {
      const presence = onlineUsers.find((user) => user.userId === vendor.id);
      return {
        ...vendor,
        isOnline: !!presence,
        status: presence?.status || 'offline',
        lastSeen: presence?.lastSeen || presence?.onlineAt,
        location: presence?.location,
        currentTask: presence?.currentTask,
        eta: presence?.eta,
      };
    });
  }, [vendors, onlineUsers]);

  const onlineVendors = vendorStatuses.filter((v) => v.isOnline);
  const offlineVendors = vendorStatuses.filter((v) => !v.isOnline);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium">
            {activeUserCount} of {vendors.length} vendors active
          </span>
        </div>
        {isTracking && <Wifi className="w-4 h-4 text-green-500" />}
      </div>

      {/* Online Vendors */}
      {onlineVendors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-700">Online</h3>
          {onlineVendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}

      {/* Offline Vendors */}
      {showOffline && offlineVendors.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-400">Offline</h3>
          {offlineVendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
}

interface VendorCardProps {
  vendor: {
    id: string;
    name: string;
    role?: string;
    avatar?: string;
    isOnline: boolean;
    status: string;
    lastSeen?: number;
    location?: { lat: number; lng: number };
    currentTask?: string;
    eta?: string;
  };
}

function VendorCard({ vendor }: VendorCardProps) {
  const statusColors = {
    online: 'border-green-200 bg-green-50',
    away: 'border-yellow-200 bg-yellow-50',
    busy: 'border-red-200 bg-red-50',
    offline: 'border-gray-200 bg-gray-50',
  };

  const statusIcons = {
    online: <CheckCircle className="w-4 h-4 text-green-500" />,
    away: <Clock className="w-4 h-4 text-yellow-500" />,
    busy: <AlertCircle className="w-4 h-4 text-red-500" />,
    offline: <WifiOff className="w-4 h-4 text-gray-400" />,
  };

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-all duration-200',
        statusColors[vendor.status as keyof typeof statusColors],
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative">
            {vendor.avatar ? (
              <img
                src={vendor.avatar}
                alt={vendor.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <User className="w-6 h-6 text-gray-600" />
              </div>
            )}
            {/* Status indicator */}
            <div
              className={cn(
                'absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white',
                vendor.isOnline ? 'bg-green-500' : 'bg-gray-400',
              )}
            />
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-gray-900">{vendor.name}</h4>
              {statusIcons[vendor.status as keyof typeof statusIcons]}
            </div>

            {vendor.role && (
              <p className="text-sm text-gray-600">{vendor.role}</p>
            )}

            {vendor.currentTask && (
              <p className="text-sm text-gray-700 mt-1">
                Working on:{' '}
                <span className="font-medium">{vendor.currentTask}</span>
              </p>
            )}

            {vendor.eta && (
              <p className="text-sm text-blue-600 mt-1">ETA: {vendor.eta}</p>
            )}

            {vendor.location && (
              <div className="flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-xs text-gray-500">Location tracked</span>
              </div>
            )}

            {vendor.lastSeen && !vendor.isOnline && (
              <p className="text-xs text-gray-400 mt-1">
                Last seen{' '}
                {formatDistanceToNow(vendor.lastSeen, { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface VendorMapProps {
  vendors: Array<{
    id: string;
    name: string;
    location?: { lat: number; lng: number };
    status: string;
  }>;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

export function VendorMap({
  vendors,
  center = { lat: 40.7128, lng: -74.006 },
  zoom = 12,
  className,
}: VendorMapProps) {
  // This would integrate with a map library like Google Maps or Mapbox
  // For now, showing a placeholder
  return (
    <div
      className={cn(
        'relative bg-gray-100 rounded-lg overflow-hidden',
        className,
      )}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-600">Map View</p>
          <p className="text-sm text-gray-500 mt-1">
            {vendors.filter((v) => v.location).length} vendors with location
          </p>
        </div>
      </div>

      {/* Vendor markers would go here */}
      {vendors
        .filter((v) => v.location)
        .map((vendor) => (
          <div
            key={vendor.id}
            className="absolute w-6 h-6 bg-blue-500 rounded-full border-2 border-white shadow-lg"
            style={{
              // Calculate position based on lat/lng
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            title={vendor.name}
          />
        ))}
    </div>
  );
}

interface VendorActivityTimelineProps {
  vendorId: string;
  activities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: number;
    icon?: React.ReactNode;
  }>;
  className?: string;
}

export function VendorActivityTimeline({
  vendorId,
  activities,
  className,
}: VendorActivityTimelineProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-3">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                index === 0 ? 'bg-blue-100' : 'bg-gray-100',
              )}
            >
              {activity.icon || <Activity className="w-4 h-4 text-gray-600" />}
            </div>
            {index < activities.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-200 mt-2" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <p className="text-sm text-gray-900">{activity.description}</p>
            <p className="text-xs text-gray-500 mt-1">
              {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
