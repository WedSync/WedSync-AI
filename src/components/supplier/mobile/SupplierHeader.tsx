'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Settings,
  Menu,
  User,
  LogOut,
  RefreshCw,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SupplierProfile } from '@/types/supplier';
import { useSupplierNotifications } from '@/hooks/useSupplierNotifications';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SupplierHeaderProps {
  supplier?: SupplierProfile | null;
}

export function SupplierHeader({ supplier }: SupplierHeaderProps) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { unreadCount } = useSupplierNotifications();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Listen for online/offline status
  useState(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Trigger a page refresh or data refetch
    window.location.reload();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/auth/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        {/* Left side - Business info */}
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            {supplier?.portfolio_images?.[0] ? (
              <img
                src={supplier.portfolio_images[0]}
                alt="Business logo"
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-pink-600" />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate">
              {supplier?.business_name || 'Supplier Portal'}
            </h1>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span className="capitalize">{supplier?.vendor_type}</span>
              {!isOnline && (
                <div className="flex items-center space-x-1 text-red-500">
                  <WifiOff className="w-3 h-3" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
              {isOnline && (
                <div className="flex items-center space-x-1 text-green-500">
                  <Wifi className="w-3 h-3" />
                  <span className="text-xs">Online</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-2">
          {/* Refresh button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 w-10"
          >
            <RefreshCw
              className={cn('w-5 h-5', isRefreshing && 'animate-spin')}
            />
          </Button>

          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/supplier-portal/notifications')}
            className="h-10 w-10 relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium">
                {unreadCount > 99 ? '99' : unreadCount}
              </span>
            )}
          </Button>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => router.push('/supplier-portal/profile')}
              >
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push('/supplier-portal/settings')}
              >
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status indicator bar */}
      {supplier?.status === 'pending_approval' && (
        <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded-md p-2">
          <p className="text-xs text-yellow-800">
            Your account is pending approval. Some features may be limited.
          </p>
        </div>
      )}

      {supplier?.status === 'inactive' && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-2">
          <p className="text-xs text-red-800">
            Your account is inactive. Contact support to reactivate.
          </p>
        </div>
      )}
    </header>
  );
}
