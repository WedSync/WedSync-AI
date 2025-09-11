'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  Shield,
  Activity,
  ChevronDown,
  AlertTriangle,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { useAdminSecurity } from '../../../contexts/AdminSecurityProvider';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export function AdminHeader() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClientComponentClient();

  const {
    user,
    isAdmin,
    isSuperAdmin,
    lockdownMode,
    emergencyMode,
    triggerEmergencyLockdown,
    clearEmergencyState,
  } = useAdminSecurity();

  // Mock notifications - in real implementation, this would come from your API
  const notifications = [
    {
      id: '1',
      type: 'security',
      message: 'High API request volume detected',
      severity: 'warning',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      read: false,
    },
    {
      id: '2',
      type: 'system',
      message: 'System backup completed successfully',
      severity: 'info',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      read: true,
    },
    {
      id: '3',
      type: 'wedding',
      message: 'Saturday wedding protection activated',
      severity: 'info',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      read: false,
    },
  ];

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleEmergencyToggle = async () => {
    if (lockdownMode || emergencyMode) {
      await clearEmergencyState();
    } else {
      await triggerEmergencyLockdown('Manual admin activation');
    }
    setShowUserMenu(false);
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 h-16 flex items-center justify-between px-6">
      {/* Left section - Search */}
      <div className="flex items-center space-x-4 flex-1">
        <div className="relative max-w-md w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Search admin panel..."
          />
        </div>
      </div>

      {/* Right section - Status indicators and user menu */}
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div
          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Emergency Status */}
        {(lockdownMode || emergencyMode) && (
          <div
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
              emergencyMode
                ? 'bg-red-100 text-red-700 animate-pulse'
                : 'bg-yellow-100 text-yellow-700'
            }`}
          >
            <AlertTriangle className="h-3 w-3" />
            <span>{emergencyMode ? 'Emergency' : 'Lockdown'}</span>
          </div>
        )}

        {/* System Health */}
        <div className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Activity className="h-3 w-3" />
          <span>Healthy</span>
        </div>

        {/* Notifications */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Notifications
                </h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border ${
                        notification.read
                          ? 'bg-gray-50 border-gray-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className="flex items-start space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                            notification.severity === 'warning'
                              ? 'bg-yellow-500'
                              : notification.severity === 'error'
                                ? 'bg-red-500'
                                : 'bg-blue-500'
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {notification.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <button className="text-sm text-blue-600 hover:text-blue-500 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2 p-2 rounded-md text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-medium">
              {user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div className="hidden md:block text-left">
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-gray-500">
                {isSuperAdmin ? 'Super Admin' : isAdmin ? 'Admin' : 'User'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
              <div className="py-1">
                <div className="px-4 py-2 border-b border-gray-100">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 flex items-center mt-1">
                    <Shield className="h-3 w-3 mr-1" />
                    {isSuperAdmin ? 'Super Administrator' : 'Administrator'}
                  </p>
                </div>

                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <User className="h-4 w-4 mr-2" />
                  Profile Settings
                </button>

                <button className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  <Settings className="h-4 w-4 mr-2" />
                  Admin Preferences
                </button>

                <div className="border-t border-gray-100">
                  <button
                    onClick={handleEmergencyToggle}
                    className={`flex items-center w-full px-4 py-2 text-sm font-medium ${
                      lockdownMode || emergencyMode
                        ? 'text-green-700 hover:bg-green-50'
                        : 'text-red-700 hover:bg-red-50'
                    }`}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {lockdownMode || emergencyMode
                      ? 'Clear Emergency'
                      : 'Emergency Lockdown'}
                  </button>
                </div>

                <div className="border-t border-gray-100">
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
