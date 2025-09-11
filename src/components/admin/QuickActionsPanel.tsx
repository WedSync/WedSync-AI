'use client';

import { useState } from 'react';
import { EmergencyActionModal } from './EmergencyActionModal';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: 'emergency' | 'warning' | 'info';
  requiresMFA?: boolean;
  confirmationMessage?: string;
}

export function QuickActionsPanel() {
  const [selectedAction, setSelectedAction] = useState<QuickAction | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  const quickActions: QuickAction[] = [
    {
      id: 'maintenance-mode',
      title: 'Enable Maintenance Mode',
      description: 'Put system into maintenance mode with custom message',
      type: 'warning',
      requiresMFA: true,
      confirmationMessage:
        'This will make the system unavailable to all users except admins.',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
    {
      id: 'clear-cache',
      title: 'Clear System Cache',
      description: 'Clear all application caches for performance issues',
      type: 'info',
      requiresMFA: false,
      confirmationMessage:
        'This may temporarily slow down the system as caches rebuild.',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      ),
    },
    {
      id: 'acknowledge-alerts',
      title: 'Acknowledge All Alerts',
      description: 'Mark all system alerts as acknowledged',
      type: 'info',
      requiresMFA: false,
      confirmationMessage: 'This will acknowledge all current system alerts.',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
    {
      id: 'emergency-user-suspend',
      title: 'Suspend Problem User',
      description: 'Immediately suspend a user account causing issues',
      type: 'emergency',
      requiresMFA: true,
      confirmationMessage:
        'This will immediately lock the specified user account.',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728"
          />
        </svg>
      ),
    },
    {
      id: 'force-logout-all',
      title: 'Force Logout All Users',
      description: 'Immediately terminate all user sessions',
      type: 'emergency',
      requiresMFA: true,
      confirmationMessage:
        'This will force logout ALL users including vendors and couples.',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      ),
    },
    {
      id: 'emergency-backup',
      title: 'Emergency Database Backup',
      description: 'Create immediate backup of critical data',
      type: 'info',
      requiresMFA: false,
      confirmationMessage:
        'This will create a full database backup. This may take several minutes.',
      icon: (
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
          />
        </svg>
      ),
    },
  ];

  const handleActionClick = (action: QuickAction) => {
    setSelectedAction(action);
    setIsModalOpen(true);
  };

  const handleActionConfirm = async (actionId: string, data?: any) => {
    try {
      // Call the appropriate API endpoint based on action
      const response = await fetch('/api/admin/quick-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: actionId,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Action failed');
      }

      // Show success notification
      // TODO: Implement toast notification system
      console.log(`Action ${actionId} executed successfully`);
    } catch (error) {
      console.error('Action failed:', error);
      // TODO: Implement error notification system
    } finally {
      setIsModalOpen(false);
      setSelectedAction(null);
    }
  };

  const getActionButtonClass = (type: string) => {
    const baseClass =
      'p-6 rounded-xl border shadow-xs hover:shadow-md transition-all duration-200 focus:outline-none focus:ring-4 cursor-pointer';

    switch (type) {
      case 'emergency':
        return `${baseClass} bg-error-50 border-error-200 hover:bg-error-100 focus:ring-error-100`;
      case 'warning':
        return `${baseClass} bg-warning-50 border-warning-200 hover:bg-warning-100 focus:ring-warning-100`;
      case 'info':
        return `${baseClass} bg-blue-50 border-blue-200 hover:bg-blue-100 focus:ring-blue-100`;
      default:
        return `${baseClass} bg-gray-50 border-gray-200 hover:bg-gray-100 focus:ring-gray-100`;
    }
  };

  const getIconColorClass = (type: string) => {
    switch (type) {
      case 'emergency':
        return 'text-error-600';
      case 'warning':
        return 'text-warning-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Quick Actions
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Emergency controls for critical situations
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-success-500 rounded-full animate-pulse"></div>
            <span className="text-xs font-medium text-success-700">
              System Ready
            </span>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quickActions.map((action) => (
            <div
              key={action.id}
              className={getActionButtonClass(action.type)}
              onClick={() => handleActionClick(action)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleActionClick(action);
                }
              }}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`flex-shrink-0 ${getIconColorClass(action.type)}`}
                >
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {action.title}
                    </h3>
                    {action.requiresMFA && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        MFA
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Action Confirmation Modal */}
      {selectedAction && (
        <EmergencyActionModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedAction(null);
          }}
          action={selectedAction}
          onConfirm={handleActionConfirm}
        />
      )}
    </div>
  );
}
