'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Settings,
  BarChart3,
  Shield,
  Users,
  Database,
  Activity,
  AlertTriangle,
  Zap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAdminSecurity } from '../../../contexts/AdminSecurityProvider';
interface NavigationItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  requiredRole?: 'admin' | 'super_admin';
  badge?: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'overview',
    name: 'Overview',
    href: '/admin',
    icon: BarChart3,
    description: 'System overview and key metrics',
  },
  {
    id: 'api-management',
    name: 'API Management',
    href: '/admin/api-management',
    icon: Activity,
    description: 'API performance monitoring and controls',
    badge: 'New',
  },
  {
    id: 'security',
    name: 'Security',
    href: '/admin/security',
    icon: Shield,
    description: 'Security monitoring and threat management',
  },
  {
    id: 'users',
    name: 'User Management',
    href: '/admin/users',
    icon: Users,
    description: 'Manage user accounts and permissions',
  },
  {
    id: 'database',
    name: 'Database',
    href: '/admin/database',
    icon: Database,
    description: 'Database health and maintenance',
    requiredRole: 'super_admin',
  },
  {
    id: 'emergency',
    name: 'Emergency Controls',
    href: '/admin/emergency',
    icon: AlertTriangle,
    description: 'Emergency lockdown and incident response',
  },
  {
    id: 'settings',
    name: 'System Settings',
    href: '/admin/settings',
    icon: Settings,
    description: 'Global system configuration',
  },
];
export function AdminNavigation() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { isSuperAdmin, lockdownMode, emergencyMode } = useAdminSecurity();
  const filteredItems = navigationItems.filter((item) => {
    if (item.requiredRole === 'super_admin' && !isSuperAdmin) {
      return false;
    }
    return true;
  });
  return (
    <nav
      className={`bg-white shadow-sm border-r border-gray-200 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Navigation Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        {!isCollapsed && (
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">WedSync Admin</h2>
              <p className="text-xs text-gray-500">System Administration</p>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4 text-gray-600" />
          ) : (
            <ChevronLeft className="h-4 w-4 text-gray-600" />
          )}
        </button>
      </div>

      {/* Emergency Status */}
      {(lockdownMode || emergencyMode) && (
        <div
          className={`mx-4 my-3 p-3 rounded-lg ${
            emergencyMode
              ? 'bg-red-100 border border-red-300'
              : 'bg-yellow-100 border border-yellow-300'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertTriangle
              className={`h-4 w-4 ${
                emergencyMode ? 'text-red-600' : 'text-yellow-600'
              }`}
            />
            {!isCollapsed && (
              <div>
                <p
                  className={`font-medium text-xs ${
                    emergencyMode ? 'text-red-800' : 'text-yellow-800'
                  }`}
                >
                  {emergencyMode ? 'Emergency Mode' : 'Lockdown Active'}
                </p>
                <p
                  className={`text-xs ${
                    emergencyMode ? 'text-red-600' : 'text-yellow-600'
                  }`}
                >
                  Enhanced monitoring active
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Items */}
      <div className="px-3 py-4 space-y-1">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors relative ${
                isActive
                  ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
              title={isCollapsed ? item.name : undefined}
            >
              <Icon
                className={`mr-3 h-5 w-5 flex-shrink-0 ${
                  isActive
                    ? 'text-blue-500'
                    : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />

              {!isCollapsed && (
                <>
                  <span className="flex-1">{item.name}</span>

                  {item.badge && (
                    <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </>
              )}

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-sm rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50">
                  {item.name}
                  <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Wedding Day Protection Indicator */}
      {!isCollapsed && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <div className="flex-shrink-0">
                <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <p className="text-xs font-medium text-pink-800">
                  Wedding Protection
                </p>
                <p className="text-xs text-pink-600">
                  Enhanced monitoring active
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
