'use client';

/**
 * WS-038: Enhanced Navigation Bar Component
 * Desktop navigation with role-based access and context awareness
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  MagnifyingGlassIcon,
  BellIcon,
  UserCircleIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  HeartIcon,
  Cog8ToothIcon,
  ArrowRightStartOnRectangleIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
  DropdownItem,
  DropdownLabel,
  DropdownDivider,
} from '@/components/ui/dropdown';
import {
  useNavigation,
  useNavigationBadges,
} from '@/lib/navigation/navigationContext';
import { RealtimeIndicator } from '@/components/ui/RealtimeIndicator';
import { useRealtime } from '@/components/providers/RealtimeProvider';

interface NavigationBarProps {
  className?: string;
  userProfile?: {
    id: string;
    full_name?: string;
    email: string;
    avatar_url?: string;
    organization_name?: string;
  };
  onSearchToggle?: () => void;
  onMobileMenuToggle?: () => void;
}

export function NavigationBar({
  className,
  userProfile,
  onSearchToggle,
  onMobileMenuToggle,
}: NavigationBarProps) {
  const pathname = usePathname();
  const { items, activeItem, contextAwareItems } = useNavigation();
  const { badges } = useNavigationBadges();
  const realtime = useRealtime();
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Get total notification count
  const totalNotifications = Object.values(badges).reduce(
    (sum, count) => sum + count,
    0,
  );

  return (
    <nav
      className={cn(
        'sticky top-0 z-40 bg-white border-b border-gray-200 transition-shadow duration-200',
        isScrolled && 'shadow-sm',
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 justify-between items-center">
          {/* Left section - Logo & Primary Nav */}
          <div className="flex items-center gap-8">
            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={onMobileMenuToggle}
              aria-label="Toggle mobile menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </Button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <img 
                src="/wedsync-logo.jpg" 
                alt="WedSync Logo" 
                className="h-8 w-auto"
              />
              <div className="hidden sm:flex flex-col">
                <span className="text-sm font-semibold text-zinc-900">
                  WedSync
                </span>
                <span className="text-xs text-zinc-500">Supplier Platform</span>
              </div>
            </Link>

            {/* Primary navigation - Desktop */}
            <div className="hidden lg:flex items-center space-x-1">
              {items.slice(0, 6).map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + '/');
                const itemBadge = badges[item.id];

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors relative',
                      isActive
                        ? 'bg-purple-100 text-purple-700'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50',
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                    {itemBadge && itemBadge > 0 && (
                      <Badge
                        variant="destructive"
                        className="h-5 min-w-[20px] text-xs"
                      >
                        {itemBadge > 99 ? '99+' : itemBadge}
                      </Badge>
                    )}
                  </Link>
                );
              })}

              {/* Context-aware items */}
              {contextAwareItems.map((item) => {
                const Icon = item.icon;
                const itemBadge = item.badge || badges[item.id];

                return (
                  <Link
                    key={`context-${item.id}`}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 relative"
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
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
            </div>
          </div>

          {/* Right section - Search, Notifications, Profile */}
          <div className="flex items-center gap-3">
            {/* Search button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onSearchToggle}
              className="hidden sm:flex"
              aria-label="Search (Cmd+K)"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              <span className="hidden md:inline ml-2">Search</span>
              <kbd className="hidden lg:inline-flex ml-2 pointer-events-none select-none items-center gap-1 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono font-medium text-muted-foreground">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>

            {/* Realtime Connection Status */}
            <div className="hidden sm:flex">
              <RealtimeIndicator
                connected={realtime.isConnected}
                lastUpdate={realtime.lastUpdate}
                messageCount={realtime.messageCount}
                size="sm"
                compact={true}
                showTooltip={true}
                connectionQuality={realtime.connectionQuality}
                onRetry={realtime.retry}
                weddingDayMode={new Date().getDay() === 6} // Saturday detection
              />
            </div>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="sm"
              className="relative"
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5" />
              {totalNotifications > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 min-w-[20px] text-xs"
                >
                  {totalNotifications > 99 ? '99+' : totalNotifications}
                </Badge>
              )}
            </Button>

            {/* User profile dropdown */}
            <Dropdown>
              <DropdownButton className="flex items-center gap-2 rounded-full">
                <Avatar
                  src={userProfile?.avatar_url}
                  className="h-8 w-8"
                  fallback={
                    userProfile?.full_name?.[0] ||
                    userProfile?.email?.[0] ||
                    'U'
                  }
                />
                <ChevronDownIcon className="h-4 w-4 text-gray-400 hidden sm:block" />
              </DropdownButton>

              <DropdownMenu className="w-64 mt-2" align="end">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {userProfile?.full_name || 'User'}
                  </p>
                  <p className="text-xs text-gray-500">{userProfile?.email}</p>
                  {userProfile?.organization_name && (
                    <p className="text-xs text-gray-400 mt-1">
                      {userProfile.organization_name}
                    </p>
                  )}
                </div>

                <DropdownItem href="/profile">
                  <UserCircleIcon className="mr-3 h-4 w-4" />
                  <DropdownLabel>My Profile</DropdownLabel>
                </DropdownItem>

                <DropdownItem href="/settings">
                  <Cog8ToothIcon className="mr-3 h-4 w-4" />
                  <DropdownLabel>Settings</DropdownLabel>
                </DropdownItem>

                <DropdownDivider />

                <DropdownItem href="/logout">
                  <ArrowRightStartOnRectangleIcon className="mr-3 h-4 w-4" />
                  <DropdownLabel>Sign Out</DropdownLabel>
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>

        {/* Secondary navigation for overflow items - Desktop only */}
        {items.length > 6 && (
          <div className="hidden lg:flex items-center border-t border-gray-100 py-2 space-x-1">
            {items.slice(6).map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + '/');
              const itemBadge = badges[item.id];

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1 rounded text-xs font-medium transition-colors relative',
                    isActive
                      ? 'bg-purple-100 text-purple-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{item.label}</span>
                  {itemBadge && itemBadge > 0 && (
                    <Badge
                      variant="destructive"
                      className="h-4 min-w-[16px] text-[10px]"
                    >
                      {itemBadge > 99 ? '99+' : itemBadge}
                    </Badge>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </nav>
  );
}

// Quick actions toolbar for context-sensitive actions
export function NavigationToolbar({ className }: { className?: string }) {
  const { quickActions } = useNavigation();
  const pathname = usePathname();

  if (!quickActions.length) return null;

  return (
    <div className={cn('border-b border-gray-200 bg-gray-50', className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 py-2">
          <span className="text-xs font-medium text-gray-500 mr-2">
            Quick Actions:
          </span>
          {quickActions.slice(0, 4).map((action) => {
            const Icon = action.icon;

            return (
              <Link
                key={action.id}
                href={action.href}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-gray-600 hover:text-purple-600 hover:bg-white transition-colors"
              >
                <Icon className="h-3 w-3" />
                <span>{action.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default NavigationBar;
