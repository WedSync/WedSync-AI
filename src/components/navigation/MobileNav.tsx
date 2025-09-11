'use client';

/**
 * WS-038: Enhanced Mobile Navigation Component
 * Mobile navigation with gestures, role-based access, and wedding vendor optimizations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  XMarkIcon,
  Bars3Icon,
  HeartIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  ChevronRightIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  useNavigation,
  useNavigationBadges,
  useQuickActions,
} from '@/lib/navigation/navigationContext';
import { RealtimeIndicator } from '@/components/ui/RealtimeIndicator';
import { useRealtime } from '@/components/providers/RealtimeProvider';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile?: {
    id: string;
    full_name?: string;
    email: string;
    avatar_url?: string;
    organization_name?: string;
  };
  onSearchToggle?: () => void;
}

export function MobileNav({
  isOpen,
  onClose,
  userProfile,
  onSearchToggle,
}: MobileNavProps) {
  const pathname = usePathname();
  const { items, contextAwareItems } = useNavigation();
  const { badges } = useNavigationBadges();
  const quickActions = useQuickActions();
  const realtime = useRealtime();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Close menu on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle swipe gestures
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && isOpen) {
      onClose();
    }
  }, [touchStart, touchEnd, isOpen, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  const totalNotifications = Object.values(badges).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <div
        ref={sidebarRef}
        className={cn(
          'fixed top-0 left-0 h-full w-80 bg-white shadow-xl z-50 transform transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <img 
                src="/wedsync-logo.jpg" 
                alt="WedSync Logo" 
                className="h-8 w-auto"
              />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-purple-600">
                  WedSync
                </span>
                <span className="text-xs text-gray-500">Supplier Platform</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label="Close menu"
            >
              <XMarkIcon className="h-6 w-6" />
            </Button>
          </div>

          {/* User Profile Section */}
          {userProfile && (
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Avatar
                  src={userProfile.avatar_url}
                  className="h-10 w-10"
                  fallback={
                    userProfile.full_name?.[0] || userProfile.email?.[0] || 'U'
                  }
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {userProfile.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {userProfile.email}
                  </p>
                  {userProfile.organization_name && (
                    <p className="text-xs text-gray-400 truncate">
                      {userProfile.organization_name}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search & Notifications & Realtime Status */}
          <div className="p-4 border-b border-gray-200">
            {/* Realtime Connection Status */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <RealtimeIndicator
                connected={realtime.isConnected}
                lastUpdate={realtime.lastUpdate}
                messageCount={realtime.messageCount}
                size="md"
                showDetails={true}
                weddingDayMode={new Date().getDay() === 6} // Saturday detection
                connectionQuality={realtime.connectionQuality}
                onRetry={realtime.retry}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={onSearchToggle}
                className="flex items-center justify-center gap-2"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                <span>Search</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-2 relative"
              >
                <BellIcon className="h-4 w-4" />
                <span>Alerts</span>
                {totalNotifications > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 h-5 min-w-[20px] text-xs"
                  >
                    {totalNotifications > 99 ? '99+' : totalNotifications}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {/* Context-aware items first */}
            {contextAwareItems.map((item) => {
              const Icon = item.icon;
              const itemBadge = item.badge || badges[item.id];

              return (
                <Link
                  key={`context-${item.id}`}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg bg-blue-50 text-blue-700 font-medium transition-colors"
                >
                  <Icon className="h-6 w-6 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {itemBadge && itemBadge > 0 && (
                    <Badge
                      variant="secondary"
                      className="h-5 min-w-[20px] text-xs"
                    >
                      {itemBadge > 99 ? '99+' : itemBadge}
                    </Badge>
                  )}
                </Link>
              );
            })}

            {/* Main navigation items */}
            {items.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');
              const itemBadge = badges[item.id];
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedSection === item.id;

              return (
                <div key={item.id}>
                  {hasChildren ? (
                    <button
                      onClick={() => toggleSection(item.id)}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg transition-colors w-full text-left',
                        isActive
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
                      )}
                    >
                      <Icon className="h-6 w-6 flex-shrink-0" />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {itemBadge && itemBadge > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 min-w-[20px] text-xs"
                        >
                          {itemBadge > 99 ? '99+' : itemBadge}
                        </Badge>
                      )}
                      <ChevronRightIcon
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isExpanded && 'rotate-90',
                        )}
                      />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg transition-colors relative',
                        isActive
                          ? 'bg-purple-100 text-purple-700'
                          : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200',
                      )}
                    >
                      <Icon className="h-6 w-6 flex-shrink-0" />
                      <span className="flex-1 font-medium">{item.label}</span>
                      {itemBadge && itemBadge > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 min-w-[20px] text-xs"
                        >
                          {itemBadge > 99 ? '99+' : itemBadge}
                        </Badge>
                      )}
                    </Link>
                  )}

                  {/* Children items */}
                  {hasChildren && isExpanded && (
                    <div className="ml-6 mt-1 space-y-1">
                      {item.children?.map((child) => {
                        const ChildIcon = child.icon;
                        const isChildActive = pathname === child.href;
                        const childBadge = badges[child.id];

                        return (
                          <Link
                            key={child.id}
                            href={child.href}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2 min-h-[40px] rounded-lg transition-colors text-sm',
                              isChildActive
                                ? 'bg-purple-50 text-purple-600'
                                : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100',
                            )}
                          >
                            <ChildIcon className="h-5 w-5 flex-shrink-0" />
                            <span className="flex-1">{child.label}</span>
                            {childBadge && childBadge > 0 && (
                              <Badge
                                variant="destructive"
                                className="h-4 min-w-[16px] text-xs"
                              >
                                {childBadge > 99 ? '99+' : childBadge}
                              </Badge>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick Actions Section */}
            {quickActions.length > 0 && (
              <div className="pt-4 border-t border-gray-200 mt-4">
                <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  {quickActions.slice(0, 4).map((action) => {
                    const Icon = action.icon;

                    return (
                      <Link
                        key={action.id}
                        href={action.href}
                        className="flex items-center gap-3 px-4 py-3 min-h-[48px] rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                      >
                        <Icon className="h-6 w-6 flex-shrink-0" />
                        <span className="font-medium">{action.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 space-y-2">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <UserCircleIcon className="h-5 w-5" />
              <span>Profile & Settings</span>
            </Link>
            <button
              onClick={() => {
                // Handle logout
                console.log('Logout');
              }}
              className="flex items-center gap-3 px-4 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full text-left"
            >
              <ArrowRightStartOnRectangleIcon className="h-5 w-5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Enhanced Bottom Navigation for Mobile
export function BottomNav() {
  const pathname = usePathname();
  const { items } = useNavigation();
  const { badges } = useNavigationBadges();

  // Get the most important items for bottom nav
  const bottomNavItems = items.slice(0, 4).map((item) => ({
    ...item,
    badge: badges[item.id],
  }));

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-40 safe-area-pb">
      <div className="grid grid-cols-4 gap-1 px-2 py-1">
        {bottomNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-1 min-h-[48px] rounded-lg transition-all duration-200 relative active:scale-95',
                isActive
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-600 hover:bg-gray-50 active:bg-gray-100',
              )}
            >
              <div className="relative">
                <Icon
                  className={cn('h-6 w-6', isActive && 'text-purple-600')}
                />
                {item.badge && item.badge > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-4 min-w-[16px] text-[10px]"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
              <span
                className={cn(
                  'text-[10px] leading-tight',
                  isActive && 'font-semibold',
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Floating Action Button */}
      <Link
        href="/forms/builder"
        className="absolute -top-6 right-4 bg-purple-600 text-white p-3 rounded-full shadow-lg active:scale-95 transition-transform duration-200"
        aria-label="Create new form"
      >
        <PlusIcon className="h-6 w-6" />
      </Link>
    </div>
  );
}

export default MobileNav;
