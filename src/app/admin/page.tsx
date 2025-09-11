import { Metadata } from 'next';
import {
  Activity,
  Shield,
  Users,
  Database,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Admin Overview - WedSync',
  description: 'WedSync administrative dashboard overview',
};

export default function AdminOverviewPage() {
  // Mock data - in real implementation, this would come from your APIs
  const stats = [
    {
      name: 'API Requests (24h)',
      value: '125,847',
      change: '+12%',
      changeType: 'increase' as const,
      icon: Activity,
    },
    {
      name: 'Active Users',
      value: '2,394',
      change: '+4.3%',
      changeType: 'increase' as const,
      icon: Users,
    },
    {
      name: 'System Health',
      value: '99.9%',
      change: 'Stable',
      changeType: 'stable' as const,
      icon: Shield,
    },
    {
      name: 'Database Size',
      value: '2.4 GB',
      change: '+0.8%',
      changeType: 'increase' as const,
      icon: Database,
    },
  ];

  const quickActions = [
    {
      name: 'API Management',
      description: 'Monitor API performance and manage integrations',
      href: '/admin/api-management',
      icon: Activity,
      color: 'blue',
      badge: 'New',
    },
    {
      name: 'Security Center',
      description: 'View security alerts and manage threats',
      href: '/admin/security',
      icon: Shield,
      color: 'green',
    },
    {
      name: 'Emergency Controls',
      description: 'Access emergency lockdown and incident response',
      href: '/admin/emergency',
      icon: AlertTriangle,
      color: 'red',
    },
    {
      name: 'System Analytics',
      description: 'Deep dive into system performance metrics',
      href: '/admin/analytics',
      icon: TrendingUp,
      color: 'purple',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome to WedSync Admin
        </h1>
        <p className="mt-2 text-gray-600">
          Monitor system health, manage APIs, and ensure reliable wedding day
          operations
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.name}
              className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {stat.name}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Icon className="h-8 w-8 text-gray-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center">
                <span
                  className={`text-sm font-medium ${
                    stat.changeType === 'increase'
                      ? 'text-green-600'
                      : stat.changeType === 'decrease'
                        ? 'text-red-600'
                        : 'text-gray-600'
                  }`}
                >
                  {stat.change}
                </span>
                <span className="text-sm text-gray-500 ml-2">
                  from yesterday
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.name}
                href={action.href}
                className="group bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all hover:border-gray-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`p-3 rounded-lg ${
                      action.color === 'blue'
                        ? 'bg-blue-100 text-blue-600'
                        : action.color === 'green'
                          ? 'bg-green-100 text-green-600'
                          : action.color === 'red'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-purple-100 text-purple-600'
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  {action.badge && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                      {action.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 mb-2">
                  {action.name}
                </h3>
                <p className="text-sm text-gray-600 group-hover:text-gray-500">
                  {action.description}
                </p>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Recent System Activity
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-900">
                API Management Dashboard deployed successfully
              </span>
              <span className="text-sm text-gray-500">2 minutes ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-900">
                Security audit completed with no issues
              </span>
              <span className="text-sm text-gray-500">15 minutes ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-900">
                Database backup completed
              </span>
              <span className="text-sm text-gray-500">1 hour ago</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-900">
                Real-time monitoring system activated
              </span>
              <span className="text-sm text-gray-500">2 hours ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* Wedding Day Protection Status */}
      <div className="bg-gradient-to-r from-pink-50 to-purple-50 border border-pink-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-3 h-3 bg-pink-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h3 className="font-semibold text-pink-900">
              Wedding Day Protection Active
            </h3>
            <p className="text-sm text-pink-700 mt-1">
              Enhanced monitoring and reliability measures are in place to
              ensure perfect wedding day operations. All critical systems are
              being monitored with zero tolerance for disruptions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
