'use client';

import React from 'react';
import {
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
} from '@heroicons/react/20/solid';
import Link from 'next/link';

interface CalendarIntegration {
  id: string;
  name: string;
  provider: string;
  description: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  logo: string;
  features: string[];
  setupUrl: string;
  lastSync?: Date;
  eventsCount?: number;
  isAvailable: boolean;
  comingSoon?: boolean;
}

export default function CalendarIntegrationPage() {
  const integrations: CalendarIntegration[] = [
    {
      id: 'apple',
      name: 'Apple Calendar',
      provider: 'Apple iCloud',
      description:
        'Sync with Apple Calendar using CalDAV protocol. Perfect for iPhone, iPad, and Mac users.',
      status: 'disconnected',
      logo: '🍎',
      features: [
        'Bidirectional sync',
        'Real-time updates',
        'Conflict resolution',
        'Wedding event types',
      ],
      setupUrl: '/settings/calendar-integration/apple',
      isAvailable: true,
      eventsCount: 0,
    },
    {
      id: 'outlook',
      name: 'Outlook Calendar',
      provider: 'Microsoft',
      description:
        'Connect with Outlook and Microsoft 365 calendars. Supports Exchange and Outlook.com.',
      status: 'connected',
      logo: '📅',
      features: [
        'Exchange sync',
        'Office 365 integration',
        'Meeting invitations',
        'Room booking',
      ],
      setupUrl: '/settings/calendar-integration/outlook',
      isAvailable: true,
      lastSync: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      eventsCount: 42,
    },
    {
      id: 'google',
      name: 'Google Calendar',
      provider: 'Google Workspace',
      description:
        'Integrate with Google Calendar and Google Workspace. Most popular choice for wedding professionals.',
      status: 'disconnected',
      logo: '📆',
      features: [
        'Google Workspace',
        'Multiple calendars',
        'Smart suggestions',
        'Mobile notifications',
      ],
      setupUrl: '/settings/calendar-integration/google',
      isAvailable: true,
      comingSoon: true,
    },
  ];

  const getStatusIcon = (status: CalendarIntegration['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <ClockIcon className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'error':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return (
          <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
        );
    }
  };

  const getStatusText = (status: CalendarIntegration['status']) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'error':
        return 'Connection Error';
      default:
        return 'Not Connected';
    }
  };

  const getStatusColor = (status: CalendarIntegration['status']) => {
    switch (status) {
      case 'connected':
        return 'text-green-600';
      case 'connecting':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex mb-6" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-3">
          <li className="inline-flex items-center">
            <Link
              href="/settings"
              className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-indigo-600"
            >
              Settings
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2">
                Calendar Integration
              </span>
            </div>
          </li>
        </ol>
      </nav>

      {/* Header */}
      <div className="pb-5 border-b border-gray-200">
        <div className="flex items-center">
          <CalendarIcon className="h-8 w-8 text-indigo-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate">
              Calendar Integration
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Connect your external calendars to sync wedding events and
              appointments
            </p>
          </div>
        </div>
      </div>

      {/* Integration Benefits */}
      <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <CalendarIcon className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-indigo-800">
              Why integrate your calendar?
            </h3>
            <div className="mt-2 text-sm text-indigo-700">
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  Automatically sync wedding events to your personal calendar
                </li>
                <li>
                  Avoid double-booking by seeing all appointments in one place
                </li>
                <li>Get mobile notifications on your phone and smartwatch</li>
                <li>Share wedding schedules with team members and vendors</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Available Integrations */}
      <div className="mt-8">
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          Available Calendar Providers
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => (
            <div
              key={integration.id}
              className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200"
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center">
                    <div className="text-3xl mr-3">{integration.logo}</div>
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 flex items-center">
                        {integration.name}
                        {integration.comingSoon && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            Coming Soon
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {integration.provider}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {getStatusIcon(integration.status)}
                    <span
                      className={`ml-2 text-sm font-medium ${getStatusColor(integration.status)}`}
                    >
                      {getStatusText(integration.status)}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <p className="mt-3 text-sm text-gray-600">
                  {integration.description}
                </p>

                {/* Features */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900">
                    Features:
                  </h4>
                  <ul className="mt-2 space-y-1">
                    {integration.features.slice(0, 3).map((feature, index) => (
                      <li
                        key={index}
                        className="flex items-center text-sm text-gray-600"
                      >
                        <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Connection Status */}
                {integration.status === 'connected' && integration.lastSync && (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Last synced
                        </p>
                        <p className="text-sm text-green-600">
                          {integration.lastSync.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-green-800">
                          Events
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {integration.eventsCount}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="mt-6">
                  {integration.isAvailable && !integration.comingSoon ? (
                    <Link
                      href={integration.setupUrl}
                      className={`w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 ${
                        integration.status === 'connected'
                          ? 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'
                          : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                      }`}
                    >
                      {integration.status === 'connected' ? (
                        <>Configure Settings</>
                      ) : (
                        <>
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Connect {integration.name}
                        </>
                      )}
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-500 bg-gray-100 cursor-not-allowed"
                    >
                      {integration.comingSoon ? 'Coming Soon' : 'Unavailable'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sync Settings */}
      <div className="mt-12 bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Global Sync Settings
          </h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>These settings apply to all connected calendar integrations.</p>
          </div>
          <div className="mt-5 space-y-4">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="auto-sync"
                  name="auto-sync"
                  type="checkbox"
                  defaultChecked
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="auto-sync"
                  className="font-medium text-gray-700"
                >
                  Auto-sync enabled
                </label>
                <p className="text-gray-500">
                  Automatically sync changes every 15 minutes
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="wedding-events"
                  name="wedding-events"
                  type="checkbox"
                  defaultChecked
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="wedding-events"
                  className="font-medium text-gray-700"
                >
                  Sync wedding events
                </label>
                <p className="text-gray-500">
                  Include ceremony, reception, and wedding-related events
                </p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="notifications"
                  name="notifications"
                  type="checkbox"
                  defaultChecked
                  className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <label
                  htmlFor="notifications"
                  className="font-medium text-gray-700"
                >
                  Sync notifications
                </label>
                <p className="text-gray-500">
                  Get notified when calendar sync completes or encounters errors
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Help Section */}
      <div className="mt-8 bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900">Need Help?</h3>
        <p className="mt-1 text-sm text-gray-600">
          Having trouble connecting your calendar? Check our troubleshooting
          guide or contact support.
        </p>
        <div className="mt-4 flex space-x-4">
          <Link
            href="/help/calendar-integration"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Troubleshooting Guide
          </Link>
          <Link
            href="/support/calendar"
            className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
          >
            Contact Support
          </Link>
        </div>
      </div>
    </div>
  );
}
