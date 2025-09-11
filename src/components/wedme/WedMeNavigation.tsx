'use client';

import React from 'react';
import {
  Home,
  Calendar,
  Users,
  MapPin,
  Camera,
  MessageCircle,
  Settings,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface WedMeNavigationProps {
  currentPage:
    | 'dashboard'
    | 'timeline'
    | 'guests'
    | 'seating'
    | 'photos'
    | 'messages'
    | 'settings';
  className?: string;
}

/**
 * WedMeNavigation - WS-154 WedMe Platform Navigation
 *
 * Mobile-optimized bottom navigation for WedMe platform:
 * - Touch-friendly tab bar design
 * - Wedding-specific navigation items
 * - Active state indicators
 * - Notification badges
 * - Responsive mobile layout
 * - One-handed operation support
 */
export const WedMeNavigation: React.FC<WedMeNavigationProps> = ({
  currentPage,
  className = '',
}) => {
  // Mock notification counts - in production, these would come from context/API
  const notificationCounts = {
    messages: 3,
    timeline: 1,
    guests: 0,
    photos: 2,
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: Home,
      href: '/wedme/dashboard',
      notifications: 0,
    },
    {
      id: 'timeline',
      label: 'Timeline',
      icon: Calendar,
      href: '/wedme/timeline',
      notifications: notificationCounts.timeline,
    },
    {
      id: 'guests',
      label: 'Guests',
      icon: Users,
      href: '/wedme/guests',
      notifications: notificationCounts.guests,
    },
    {
      id: 'seating',
      label: 'Seating',
      icon: MapPin,
      href: '/wedme/seating',
      notifications: 0,
    },
    {
      id: 'photos',
      label: 'Photos',
      icon: Camera,
      href: '/wedme/photos',
      notifications: notificationCounts.photos,
    },
  ];

  const handleNavigation = (href: string) => {
    window.location.href = href;
  };

  const getItemColor = (itemId: string) => {
    if (currentPage === itemId) {
      return {
        container: 'bg-pink-100 text-pink-600',
        icon: 'text-pink-600',
        label: 'text-pink-600 font-semibold',
      };
    }

    return {
      container: 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
      icon: 'text-gray-500 group-hover:text-gray-700',
      label: 'text-gray-500 group-hover:text-gray-700',
    };
  };

  return (
    <nav
      className={`
      bg-white border-t border-gray-200 shadow-lg
      fixed bottom-0 left-0 right-0 z-40
      safe-area-pb
      ${className}
    `}
    >
      <div className="px-2 py-1">
        <div className="flex items-center justify-between">
          {navigationItems.map((item) => {
            const colors = getItemColor(item.id);
            const isActive = currentPage === item.id;

            return (
              <Button
                key={item.id}
                variant="ghost"
                size="sm"
                onClick={() => handleNavigation(item.href)}
                className={`
                  group relative flex-1 flex flex-col items-center space-y-1 p-2 h-auto min-h-[56px]
                  touch-manipulation transition-all duration-150
                  ${colors.container}
                  ${isActive ? 'active:scale-95' : 'active:scale-95'}
                `}
                aria-label={`Navigate to ${item.label}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Icon with notification badge */}
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${colors.icon}`} />

                  {item.notifications > 0 && (
                    <Badge
                      className="absolute -top-2 -right-2 w-4 h-4 p-0 flex items-center justify-center bg-red-500 text-white text-xs border border-white"
                      variant="destructive"
                    >
                      {item.notifications > 9 ? '9+' : item.notifications}
                    </Badge>
                  )}
                </div>

                {/* Label */}
                <span className={`text-xs leading-none ${colors.label}`}>
                  {item.label}
                </span>

                {/* Active indicator */}
                {isActive && (
                  <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-pink-500 rounded-full" />
                )}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Secondary action bar (optional) */}
      <div className="px-4 py-2 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          {/* Quick actions */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleNavigation('/wedme/messages')}
              className="group flex items-center space-x-2 text-gray-600 hover:text-gray-800 touch-manipulation"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">Messages</span>
              {notificationCounts.messages > 0 && (
                <Badge variant="destructive" className="w-4 h-4 p-0 text-xs">
                  {notificationCounts.messages}
                </Badge>
              )}
            </Button>
          </div>

          {/* Wedding date indicator */}
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            <Heart className="w-3 h-3 text-pink-400" />
            <span>June 15, 2024</span>
          </div>

          {/* Settings */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleNavigation('/wedme/settings')}
            className="p-2 text-gray-600 hover:text-gray-800 touch-manipulation"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Safe area for iOS devices */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
};
