'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Activity,
  Server,
  AlertTriangle,
  Settings,
  Home,
  BarChart3,
  Users,
  Calendar,
  FileText,
  Phone,
  Menu,
  X,
  ChevronLeft,
  Search,
  Bell,
  Plus,
  Filter,
} from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { useGesture } from 'react-use-gesture';

// Types
interface NavigationItem {
  id: string;
  label: string;
  icon: any;
  path: string;
  badge?: number;
  color?: string;
  disabled?: boolean;
}

interface MobileNavigationProps {
  currentPath?: string;
  weddingId?: string;
  isWeddingDay?: boolean;
  emergencyMode?: boolean;
  onNavigate?: (path: string) => void;
  className?: string;
}

export function MobileNavigation({
  currentPath,
  weddingId,
  isWeddingDay = false,
  emergencyMode = false,
  onNavigate,
  className = '',
}: MobileNavigationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notificationCount, setNotificationCount] = useState(3);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  // Navigation items for bottom tabs
  const bottomNavItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Activity,
      path: '/dashboard/infrastructure',
      color: 'text-blue-600',
    },
    {
      id: 'servers',
      label: 'Servers',
      icon: Server,
      path: '/dashboard/infrastructure/servers',
      color: 'text-green-600',
    },
    {
      id: 'alerts',
      label: 'Alerts',
      icon: AlertTriangle,
      path: '/dashboard/infrastructure/alerts',
      badge: 2,
      color: 'text-red-600',
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: BarChart3,
      path: '/dashboard/infrastructure/analytics',
      color: 'text-purple-600',
    },
  ];

  // Drawer navigation items
  const drawerNavItems: NavigationItem[] = [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/dashboard',
    },
    {
      id: 'weddings',
      label: 'Weddings',
      icon: Calendar,
      path: '/dashboard/weddings',
      badge: isWeddingDay ? 1 : 0,
    },
    {
      id: 'guests',
      label: 'Guest Management',
      icon: Users,
      path: `/dashboard/weddings/${weddingId}/guests`,
      disabled: !weddingId,
    },
    {
      id: 'vendors',
      label: 'Vendors',
      icon: FileText,
      path: `/dashboard/weddings/${weddingId}/vendors`,
      disabled: !weddingId,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/dashboard/settings',
    },
  ];

  // Emergency quick actions
  const emergencyActions = [
    {
      id: 'emergency_contact',
      label: 'Emergency Call',
      icon: Phone,
      action: () => {
        // Trigger emergency contact
        if (typeof window !== 'undefined' && 'navigator' in window) {
          window.location.href = 'tel:+1-800-WEDDING';
        }
      },
      className: 'bg-red-600 text-white',
    },
    {
      id: 'escalate',
      label: 'Escalate Issue',
      icon: AlertTriangle,
      action: () => {
        // Escalate to support
        console.log('Escalating to support...');
      },
      className: 'bg-orange-600 text-white',
    },
  ];

  // Update active tab based on current path
  useEffect(() => {
    const currentItem = bottomNavItems.find(
      (item) => pathname.startsWith(item.path) || currentPath === item.path,
    );
    if (currentItem) {
      setActiveTab(currentItem.id);
    }
  }, [pathname, currentPath]);

  // Handle navigation
  const handleNavigation = useCallback(
    (item: NavigationItem) => {
      if (item.disabled) return;

      setActiveTab(item.id);
      setIsDrawerOpen(false);

      if (onNavigate) {
        onNavigate(item.path);
      } else {
        router.push(item.path);
      }

      // Haptic feedback for supported devices
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    },
    [onNavigate, router],
  );

  // Swipe gesture for drawer
  const bind = useGesture({
    onDrag: ({ movement: [mx], velocity: [vx], direction: [dx] }) => {
      // Open drawer on right swipe from left edge
      if (mx > 100 && dx > 0 && vx > 0.5) {
        setIsDrawerOpen(true);
      }
      // Close drawer on left swipe
      else if (isDrawerOpen && mx < -100 && dx < 0 && vx > 0.5) {
        setIsDrawerOpen(false);
      }
    },
  });

  // Touch handlers for long press on tabs
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null,
  );

  const handleTouchStart = useCallback((item: NavigationItem) => {
    const timer = setTimeout(() => {
      if (item.id === 'alerts') {
        // Show quick alert actions on long press
        setQuickActionsOpen(true);
        navigator.vibrate?.(100);
      }
    }, 800);
    setLongPressTimer(timer);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  }, [longPressTimer]);

  return (
    <>
      {/* Top Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {/* Left side */}
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              className="p-2"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div>
              <h1 className="text-lg font-semibold">Infrastructure</h1>
              {isWeddingDay && (
                <Badge variant="destructive" className="text-xs">
                  Wedding Day
                </Badge>
              )}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="p-2 relative">
              <Bell className="h-5 w-5" />
              {notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {notificationCount}
                </Badge>
              )}
            </Button>

            <Button variant="ghost" size="sm" className="p-2">
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Emergency Mode Banner */}
        <AnimatePresence>
          {emergencyMode && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-2 p-2 bg-red-100 rounded-lg border border-red-200"
            >
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Emergency Mode Active
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Bottom Navigation */}
      <div
        {...bind()}
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe z-30"
      >
        <div className="grid grid-cols-4 py-1">
          {bottomNavItems.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.95 }}
              onTouchStart={() => handleTouchStart(item)}
              onTouchEnd={handleTouchEnd}
              onClick={() => handleNavigation(item)}
              className={`flex flex-col items-center py-2 px-1 text-xs transition-colors ${
                activeTab === item.id
                  ? `${item.color} font-medium`
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                <item.icon className="h-6 w-6 mb-1" />
                {item.badge && item.badge > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="truncate max-w-full">{item.label}</span>

              {/* Active indicator */}
              {activeTab === item.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-0.5 bg-current rounded-full"
                />
              )}
            </motion.button>
          ))}
        </div>
      </div>
      {/* Floating Action Button */}
      <AnimatePresence>
        {(isWeddingDay || emergencyMode) && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-20 right-4 z-40"
          >
            <Button
              size="lg"
              onClick={() => setQuickActionsOpen(true)}
              className={`rounded-full h-14 w-14 shadow-lg ${
                emergencyMode
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-orange-600 hover:bg-orange-700'
              }`}
            >
              <Plus className="h-6 w-6" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Side Drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
            />

            {/* Drawer Content */}
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-white shadow-xl z-50 flex flex-col"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold">WedSync</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDrawerOpen(false)}
                  className="p-2"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Wedding Status */}
              {weddingId && (
                <div className="p-4 bg-blue-50 border-b border-gray-200">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900">
                      Wedding {weddingId.slice(0, 8)}
                    </span>
                    {isWeddingDay && (
                      <Badge variant="destructive" className="text-xs">
                        Today
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Navigation Items */}
              <div className="flex-1 py-4">
                {drawerNavItems.map((item) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleNavigation(item)}
                    disabled={item.disabled}
                    className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                      item.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : pathname.startsWith(item.path)
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <Badge className="ml-auto bg-red-500 text-white">
                        {item.badge}
                      </Badge>
                    )}
                  </motion.button>
                ))}
              </div>

              {/* Emergency Actions */}
              {(isWeddingDay || emergencyMode) && (
                <div className="border-t border-gray-200 p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Emergency Actions
                  </h3>
                  <div className="space-y-2">
                    {emergencyActions.map((action) => (
                      <Button
                        key={action.id}
                        size="sm"
                        onClick={action.action}
                        className={`w-full justify-start ${action.className}`}
                      >
                        <action.icon className="h-4 w-4 mr-2" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 text-center">
                <p className="text-xs text-gray-500">
                  WedSync Infrastructure v2.0
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      {/* Quick Actions Modal */}
      <AnimatePresence>
        {quickActionsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setQuickActionsOpen(false)}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center p-4"
          >
            <motion.div
              initial={{ y: 300 }}
              animate={{ y: 0 }}
              exit={{ y: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-xl w-full max-w-sm"
            >
              {/* Handle */}
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mt-3 mb-4" />

              {/* Actions */}
              <div className="px-4 pb-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-20 flex-col"
                    onClick={() => {
                      setQuickActionsOpen(false);
                      // Add filter action
                    }}
                  >
                    <Filter className="h-6 w-6 mb-2" />
                    <span className="text-xs">Filter Alerts</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    className="h-20 flex-col"
                    onClick={() => {
                      setQuickActionsOpen(false);
                      // Add escalate action
                    }}
                  >
                    <AlertTriangle className="h-6 w-6 mb-2" />
                    <span className="text-xs">Escalate</span>
                  </Button>
                </div>

                {emergencyMode && (
                  <div className="mt-4 space-y-2">
                    {emergencyActions.map((action) => (
                      <Button
                        key={action.id}
                        size="lg"
                        onClick={() => {
                          setQuickActionsOpen(false);
                          action.action();
                        }}
                        className={`w-full ${action.className}`}
                      >
                        <action.icon className="h-4 w-4 mr-2" />
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="lg"
                  onClick={() => setQuickActionsOpen(false)}
                  className="w-full mt-4"
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Safe area padding for bottom */}
      <div className="h-16" /> {/* Spacer for fixed bottom nav */}
    </>
  );
}

export default MobileNavigation;
