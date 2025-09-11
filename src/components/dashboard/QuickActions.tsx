'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  PlusIcon,
  DocumentTextIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  CalendarIcon,
  PhotoIcon,
  CurrencyPoundIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapIcon,
  FolderIcon,
  ClockIcon,
} from '@heroicons/react/20/solid';
import { Dialog } from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  shortcut?: string;
  color: string;
  usageCount?: number;
  category: 'client' | 'content' | 'business' | 'communication';
  description: string;
  modalContent?: React.ReactNode;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  onActionClick?: (action: QuickAction) => void;
  maxVisible?: number;
  enablePersonalization?: boolean;
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'add-client',
    label: 'Add New Client',
    icon: PlusIcon,
    href: '/clients/new',
    shortcut: 'Cmd+N',
    color: 'bg-blue-600 hover:bg-blue-700',
    category: 'client',
    description: 'Create a new client profile',
    usageCount: 0,
  },
  {
    id: 'send-timeline',
    label: 'Send Timeline Form',
    icon: CalendarIcon,
    href: '/forms/timeline',
    shortcut: 'Cmd+T',
    color: 'bg-purple-600 hover:bg-purple-700',
    category: 'content',
    description: 'Send timeline questionnaire to client',
    usageCount: 0,
  },
  {
    id: 'upload-gallery',
    label: 'Create Gallery',
    icon: PhotoIcon,
    href: '/galleries/new',
    shortcut: 'Cmd+G',
    color: 'bg-pink-600 hover:bg-pink-700',
    category: 'content',
    description: 'Upload and share wedding photos',
    usageCount: 0,
  },
  {
    id: 'send-invoice',
    label: 'Send Invoice',
    icon: CurrencyPoundIcon,
    href: '/invoices/new',
    shortcut: 'Cmd+I',
    color: 'bg-green-600 hover:bg-green-700',
    category: 'business',
    description: 'Create and send invoice to client',
    usageCount: 0,
  },
  {
    id: 'import-clients',
    label: 'Import Clients',
    icon: DocumentTextIcon,
    href: '/clients/import',
    shortcut: 'Cmd+Shift+I',
    color: 'bg-orange-600 hover:bg-orange-700',
    category: 'client',
    description: 'Bulk import clients from CSV/Excel',
    usageCount: 0,
  },
  {
    id: 'send-email',
    label: 'Quick Email',
    icon: EnvelopeIcon,
    shortcut: 'Cmd+E',
    color: 'bg-indigo-600 hover:bg-indigo-700',
    category: 'communication',
    description: 'Send quick email to client',
    usageCount: 0,
  },
  {
    id: 'schedule-meeting',
    label: 'Schedule Meeting',
    icon: ClockIcon,
    href: '/meetings/new',
    shortcut: 'Cmd+M',
    color: 'bg-teal-600 hover:bg-teal-700',
    category: 'communication',
    description: 'Schedule consultation or planning meeting',
    usageCount: 0,
  },
  {
    id: 'view-analytics',
    label: 'View Analytics',
    icon: ChartBarIcon,
    href: '/analytics',
    shortcut: 'Cmd+A',
    color: 'bg-slate-600 hover:bg-slate-700',
    category: 'business',
    description: 'View business performance metrics',
    usageCount: 0,
  },
];

export function QuickActions({
  actions = DEFAULT_ACTIONS,
  onActionClick,
  maxVisible = 6,
  enablePersonalization = true,
}: QuickActionsProps) {
  const router = useRouter();
  const [personalizedActions, setPersonalizedActions] =
    useState<QuickAction[]>(actions);
  const [showEmailModal, setShowEmailModal] = useState(false);

  // Load usage data from localStorage on mount
  useEffect(() => {
    if (enablePersonalization && typeof window !== 'undefined') {
      const savedUsage = localStorage.getItem('quickActions_usage');
      if (savedUsage) {
        try {
          const usageData = JSON.parse(savedUsage);
          const updatedActions = actions.map((action) => ({
            ...action,
            usageCount: usageData[action.id] || 0,
          }));
          setPersonalizedActions(updatedActions);
        } catch (error) {
          console.error('Failed to load usage data:', error);
        }
      }
    }
  }, [actions, enablePersonalization]);

  // Sort actions by usage count for personalization
  const sortedActions = enablePersonalization
    ? [...personalizedActions].sort(
        (a, b) => (b.usageCount || 0) - (a.usageCount || 0),
      )
    : personalizedActions;

  const visibleActions = sortedActions.slice(0, maxVisible);

  // Track action usage
  const trackUsage = useCallback(
    (actionId: string) => {
      if (!enablePersonalization || typeof window === 'undefined') return;

      const savedUsage = localStorage.getItem('quickActions_usage');
      const usageData = savedUsage ? JSON.parse(savedUsage) : {};
      usageData[actionId] = (usageData[actionId] || 0) + 1;
      localStorage.setItem('quickActions_usage', JSON.stringify(usageData));

      // Update state
      setPersonalizedActions((prev) =>
        prev.map((action) =>
          action.id === actionId
            ? { ...action, usageCount: usageData[actionId] }
            : action,
        ),
      );
    },
    [enablePersonalization],
  );

  // Handle action click with performance tracking
  const handleActionClick = useCallback(
    (action: QuickAction) => {
      const startTime = performance.now();

      trackUsage(action.id);

      if (action.id === 'send-email') {
        setShowEmailModal(true);
      } else if (action.onClick) {
        action.onClick();
      } else if (action.href) {
        router.push(action.href);
      }

      const endTime = performance.now();
      console.debug(
        `Quick action "${action.id}" executed in ${endTime - startTime}ms`,
      );

      onActionClick?.(action);
    },
    [router, trackUsage, onActionClick],
  );

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        const action = personalizedActions.find((a) => {
          if (!a.shortcut) return false;
          const keys = a.shortcut
            .toLowerCase()
            .replace('cmd+', '')
            .replace('ctrl+', '');

          if (keys.includes('shift+')) {
            const key = keys.replace('shift+', '');
            return event.shiftKey && event.key.toLowerCase() === key;
          }

          return !event.shiftKey && event.key.toLowerCase() === keys;
        });

        if (action) {
          event.preventDefault();
          handleActionClick(action);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [personalizedActions, handleActionClick]);

  return (
    <>
      <div className="bg-white dark:bg-zinc-900 shadow rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-white">
              Quick Actions
            </h3>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {enablePersonalization
                ? 'Personalized by usage'
                : 'Standard layout'}
            </span>
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {visibleActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className={`${action.color} text-white flex flex-col items-center gap-2 p-4 h-auto min-h-[80px] transition-all duration-200 hover:scale-105 focus:scale-105 group relative`}
                  title={`${action.description} (${action.shortcut || 'No shortcut'})`}
                  aria-label={`${action.label} - ${action.description}`}
                >
                  <Icon className="h-6 w-6 flex-shrink-0" />
                  <span className="text-sm font-medium text-center leading-tight">
                    {action.label}
                  </span>
                  {action.shortcut && (
                    <span className="absolute top-1 right-1 text-xs opacity-70 bg-black/20 px-1 rounded">
                      {action.shortcut
                        .replace('Cmd+', '⌘')
                        .replace('Ctrl+', 'Ctrl+')}
                    </span>
                  )}
                  {enablePersonalization && action.usageCount! > 0 && (
                    <span className="absolute top-1 left-1 text-xs bg-yellow-400 text-yellow-900 px-1 rounded">
                      {action.usageCount}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Usage hint */}
          <div className="mt-4 text-center">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              💡 Use keyboard shortcuts for faster access. Most used actions
              appear first.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Email Modal */}
      <Dialog open={showEmailModal} onClose={() => setShowEmailModal(false)}>
        <div className="p-6">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-white mb-4">
            Quick Email
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                To (Client)
              </label>
              <select className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800">
                <option>Select a client...</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Subject
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800"
                placeholder="Email subject..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Message
              </label>
              <textarea
                rows={4}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md bg-white dark:bg-zinc-800"
                placeholder="Your message..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEmailModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  // TODO: Implement email sending
                  setShowEmailModal(false);
                }}
              >
                Send Email
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
