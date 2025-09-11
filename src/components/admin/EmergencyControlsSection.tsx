'use client';

import { useState } from 'react';

export function EmergencyControlsSection() {
  const [emergencyStop, setEmergencyStop] = useState(false);
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  const handleEmergencyStop = async () => {
    const confirmed = window.confirm(
      'EMERGENCY STOP will immediately disable all system operations except admin access. This is irreversible without manual intervention. Continue?',
    );

    if (!confirmed) return;

    try {
      // This would trigger the most severe emergency action
      const response = await fetch('/api/admin/emergency-stop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'emergency_stop',
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setEmergencyStop(true);
        // Show success notification
        console.log('Emergency stop activated');
      }
    } catch (error) {
      console.error('Failed to activate emergency stop:', error);
    }
  };

  const handleReadOnlyMode = async () => {
    try {
      const response = await fetch('/api/admin/system-features/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          featureId: 'read_only_mode',
          enabled: !readOnlyMode,
        }),
      });

      if (response.ok) {
        setReadOnlyMode(!readOnlyMode);
      }
    } catch (error) {
      console.error('Failed to toggle read-only mode:', error);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <svg
            className="w-5 h-5 text-error-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">
            Emergency Controls
          </h2>
        </div>
        <p className="text-sm text-gray-500 mt-1">Critical system overrides</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Emergency Stop */}
        <div className="p-4 rounded-lg border border-error-200 bg-error-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-error-900 flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 9l6 6m0-6l-6 6"
                  />
                </svg>
                <span>Emergency Stop</span>
              </h3>
              <p className="text-xs text-error-700 mt-1">
                Immediately halt all operations except admin access
              </p>
            </div>
            <button
              type="button"
              onClick={handleEmergencyStop}
              disabled={emergencyStop}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all focus:outline-none focus:ring-4 ${
                emergencyStop
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-error-600 hover:bg-error-700 text-white focus:ring-error-100'
              }`}
            >
              {emergencyStop ? 'STOPPED' : 'STOP ALL'}
            </button>
          </div>
        </div>

        {/* Read-Only Mode */}
        <div className="p-4 rounded-lg border border-warning-200 bg-warning-50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-warning-900 flex items-center space-x-2">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
                <span>Read-Only Mode</span>
              </h3>
              <p className="text-xs text-warning-700 mt-1">
                Disable all write operations system-wide
              </p>
            </div>
            <button
              type="button"
              onClick={handleReadOnlyMode}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all focus:outline-none focus:ring-4 ${
                readOnlyMode
                  ? 'bg-warning-600 hover:bg-warning-700 text-white focus:ring-warning-100'
                  : 'bg-white border border-warning-300 text-warning-700 hover:bg-warning-50 focus:ring-warning-100'
              }`}
            >
              {readOnlyMode ? 'DISABLE' : 'ENABLE'}
            </button>
          </div>
        </div>

        {/* System Diagnostics */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            Quick Diagnostics
          </h3>

          <div className="grid grid-cols-1 gap-3">
            <button
              type="button"
              className="flex items-center justify-between p-3 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-blue-600"
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
                <span className="text-sm font-medium text-gray-700">
                  Test Database Connection
                </span>
              </div>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <button
              type="button"
              className="flex items-center justify-between p-3 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-green-600"
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
                <span className="text-sm font-medium text-gray-700">
                  Check External APIs
                </span>
              </div>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>

            <button
              type="button"
              className="flex items-center justify-between p-3 text-left rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <div className="flex items-center space-x-2">
                <svg
                  className="w-4 h-4 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  Performance Check
                </span>
              </div>
              <svg
                className="w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Recovery Actions */}
        <div className="pt-4 border-t border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Recovery Actions
          </h3>
          <div className="flex space-x-2">
            <button
              type="button"
              className="flex-1 px-3 py-2 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
            >
              Restart Services
            </button>
            <button
              type="button"
              className="flex-1 px-3 py-2 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
            >
              Health Check
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
