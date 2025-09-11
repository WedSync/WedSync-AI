'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Calendar,
  Clock,
  MessageSquare,
  User,
  Bell,
  Home,
  FileText,
  QrCode,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSupplierNotifications } from '@/hooks/useSupplierNotifications';

const navigationItems = [
  {
    id: 'home',
    label: 'Home',
    icon: Home,
    href: '/supplier-portal',
    activePattern: /^\/supplier-portal$/,
  },
  {
    id: 'schedule',
    label: 'Schedule',
    icon: Calendar,
    href: '/supplier-portal/schedule',
    activePattern: /^\/supplier-portal\/schedule/,
  },
  {
    id: 'timeline',
    label: 'Timeline',
    icon: Clock,
    href: '/supplier-portal/timeline',
    activePattern: /^\/supplier-portal\/timeline/,
  },
  {
    id: 'qr-scanner',
    label: 'QR Scan',
    icon: QrCode,
    href: '/supplier-portal/qr-scanner',
    activePattern: /^\/supplier-portal\/qr-scanner/,
  },
  {
    id: 'profile',
    label: 'Profile',
    icon: User,
    href: '/supplier-portal/profile',
    activePattern: /^\/supplier-portal\/profile/,
  },
];

export function SupplierMobileNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { unreadCount } = useSupplierNotifications();

  const handleNavigation = (href: string) => {
    // Add haptic feedback for mobile devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }

    router.push(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-50">
      <div className="flex items-center justify-around px-2 py-2">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.activePattern.test(pathname);

          return (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.href)}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg transition-all duration-200 relative',
                'min-w-[64px] min-h-[64px]', // Ensure touch target meets accessibility standards
                isActive
                  ? 'text-pink-600 bg-pink-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50 active:bg-gray-100',
              )}
              type="button"
              aria-label={item.label}
            >
              <div className="relative">
                <Icon
                  className={cn(
                    'w-6 h-6 mb-1',
                    isActive ? 'text-pink-600' : 'text-current',
                  )}
                />

                {/* Notification badge */}
                {item.id === 'home' && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </div>

              <span
                className={cn(
                  'text-xs font-medium leading-none',
                  isActive ? 'text-pink-600' : 'text-current',
                )}
              >
                {item.label}
              </span>

              {/* Active indicator */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-pink-600 rounded-full" />
              )}
            </button>
          );
        })}
      </div>

      {/* Safe area spacing for devices with bottom indicators */}
      <div className="h-safe-area-inset-bottom bg-white" />
    </nav>
  );
}

// Quick action floating button for primary actions
export function SupplierQuickActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const quickActions = [
    {
      id: 'confirm-availability',
      label: 'Confirm Availability',
      icon: Calendar,
      action: () => router.push('/supplier-portal/schedule/confirm'),
      color: 'bg-green-500 text-white',
    },
    {
      id: 'report-conflict',
      label: 'Report Conflict',
      icon: MessageSquare,
      action: () => router.push('/supplier-portal/schedule/conflicts/new'),
      color: 'bg-red-500 text-white',
    },
    {
      id: 'export-schedule',
      label: 'Export Schedule',
      icon: FileText,
      action: () => router.push('/supplier-portal/schedule/export'),
      color: 'bg-blue-500 text-white',
    },
  ];

  return (
    <div className="fixed bottom-24 right-4 z-40">
      {/* Quick action menu */}
      {isOpen && (
        <div className="mb-4 space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => {
                  action.action();
                  setIsOpen(false);
                }}
                className={cn(
                  'flex items-center space-x-2 px-4 py-3 rounded-full shadow-lg',
                  'transform transition-all duration-200 hover:scale-105',
                  action.color,
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-14 h-14 bg-pink-600 text-white rounded-full shadow-lg',
          'flex items-center justify-center',
          'transform transition-all duration-200 hover:scale-105 active:scale-95',
          isOpen && 'rotate-45',
        )}
        aria-label="Quick actions"
      >
        <Bell className="w-6 h-6" />
      </button>
    </div>
  );
}
