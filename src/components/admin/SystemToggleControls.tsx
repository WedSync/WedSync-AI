'use client';

import { useState, useEffect } from 'react';

interface SystemFeature {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  critical: boolean;
  icon: React.ReactNode;
}

export function SystemToggleControls() {
  const [features, setFeatures] = useState<SystemFeature[]>([
    {
      id: 'messaging_system',
      name: 'Messaging System',
      description: 'SMS, WhatsApp, and Email communications',
      enabled: true,
      critical: true,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      ),
    },
    {
      id: 'form_submissions',
      name: 'Form Submissions',
      description: 'RSVP forms, contact forms, and questionnaires',
      enabled: true,
      critical: false,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
      ),
    },
    {
      id: 'user_registration',
      name: 'User Registration',
      description: 'New user sign-ups for couples and vendors',
      enabled: true,
      critical: false,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
          />
        </svg>
      ),
    },
    {
      id: 'payment_processing',
      name: 'Payment Processing',
      description: 'Stripe payments and billing operations',
      enabled: true,
      critical: true,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
          />
        </svg>
      ),
    },
    {
      id: 'file_uploads',
      name: 'File Uploads',
      description: 'Photo uploads and document attachments',
      enabled: true,
      critical: false,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
      ),
    },
    {
      id: 'api_endpoints',
      name: 'Public API',
      description: 'External API access and integrations',
      enabled: true,
      critical: false,
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
          />
        </svg>
      ),
    },
  ]);

  const [isLoading, setIsLoading] = useState(false);

  // Simulate fetching current feature states
  useEffect(() => {
    const fetchFeatureStates = async () => {
      try {
        const response = await fetch('/api/admin/system-features');
        if (response.ok) {
          const data = await response.json();
          setFeatures((prev) =>
            prev.map((feature) => ({
              ...feature,
              enabled: data[feature.id] ?? feature.enabled,
            })),
          );
        }
      } catch (error) {
        console.error('Failed to fetch feature states:', error);
      }
    };

    fetchFeatureStates();
  }, []);

  const toggleFeature = async (featureId: string) => {
    setIsLoading(true);
    try {
      const feature = features.find((f) => f.id === featureId);
      if (!feature) return;

      const response = await fetch('/api/admin/system-features/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureId,
          enabled: !feature.enabled,
        }),
      });

      if (response.ok) {
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === featureId ? { ...f, enabled: !f.enabled } : f,
          ),
        );
      } else {
        throw new Error('Failed to toggle feature');
      }
    } catch (error) {
      console.error('Failed to toggle feature:', error);
      // TODO: Show error notification
    } finally {
      setIsLoading(false);
    }
  };

  const getToggleClass = (enabled: boolean, critical: boolean) => {
    if (enabled) {
      return critical
        ? 'bg-primary-600 focus:ring-primary-600 focus:ring-offset-2'
        : 'bg-success-600 focus:ring-success-600 focus:ring-offset-2';
    }
    return 'bg-gray-200 focus:ring-primary-600 focus:ring-offset-2';
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">
            System Controls
          </h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Enable or disable system features
        </p>
      </div>

      <div className="p-6 space-y-4">
        {features.map((feature) => (
          <div
            key={feature.id}
            className="flex items-center justify-between p-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div
                className={`flex-shrink-0 ${
                  feature.enabled
                    ? feature.critical
                      ? 'text-primary-600'
                      : 'text-success-600'
                    : 'text-gray-400'
                }`}
              >
                {feature.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {feature.name}
                  </h3>
                  {feature.critical && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                      Critical
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {feature.description}
                </p>
              </div>
            </div>

            <div className="flex items-center">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => toggleFeature(feature.id)}
                className={`${getToggleClass(feature.enabled, feature.critical)} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50`}
                role="switch"
                aria-checked={feature.enabled}
                aria-labelledby={`toggle-${feature.id}`}
              >
                <span className="sr-only">Toggle {feature.name}</span>
                <span
                  aria-hidden="true"
                  className={`${
                    feature.enabled ? 'translate-x-5' : 'translate-x-0'
                  } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                />
              </button>
            </div>
          </div>
        ))}

        {/* Global Actions */}
        <div className="pt-4 border-t border-gray-100">
          <div className="flex space-x-3">
            <button
              type="button"
              className="flex-1 px-3 py-2 text-sm font-medium text-success-700 bg-success-50 border border-success-200 rounded-lg hover:bg-success-100 transition-colors focus:outline-none focus:ring-2 focus:ring-success-600 focus:ring-offset-2"
            >
              Enable All
            </button>
            <button
              type="button"
              className="flex-1 px-3 py-2 text-sm font-medium text-error-700 bg-error-50 border border-error-200 rounded-lg hover:bg-error-100 transition-colors focus:outline-none focus:ring-2 focus:ring-error-600 focus:ring-offset-2"
            >
              Disable All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
