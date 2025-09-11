'use client';

import { useEffect, useState } from 'react';
import { WifiOff, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    // Check initial online status
    setIsOnline(navigator.onLine);

    // Set up event listeners
    const handleOnline = () => {
      setIsOnline(true);
      setLastChecked(new Date());
    };

    const handleOffline = () => {
      setIsOnline(false);
      setLastChecked(new Date());
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setLastChecked(new Date());
    window.location.reload();
  };

  const goToDashboard = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Connection Status Icon */}
        <div className="mx-auto w-16 h-16 mb-6 flex items-center justify-center rounded-full bg-gray-100">
          {isOnline ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <WifiOff className="w-8 h-8 text-red-500" />
          )}
        </div>

        {/* Status Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {isOnline ? 'Connection Restored!' : "You're Offline"}
        </h1>

        <div className="space-y-4 text-gray-600">
          {isOnline ? (
            <>
              <p className="text-lg">
                Great! Your internet connection has been restored.
              </p>
              <p className="text-sm">
                Your offline work has been automatically synced with the server.
              </p>
            </>
          ) : (
            <>
              <p className="text-lg">
                Don't worry - WedSync works offline too!
              </p>
              <div className="bg-blue-50 rounded-lg p-4 text-left space-y-2">
                <h3 className="font-semibold text-blue-900 mb-2">
                  What you can do offline:
                </h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                    View and edit wedding timelines
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                    Fill out forms (auto-saved)
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                    Check vendor status
                  </li>
                  <li className="flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
                    Add notes and updates
                  </li>
                </ul>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 text-left">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-semibold">Automatic Sync</p>
                    <p>
                      All your offline changes will automatically sync when your
                      connection returns.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Connection Status */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>Connection Status:</span>
            <span
              className={`font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}
            >
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm text-gray-500 mt-2">
            <span>Last Checked:</span>
            <span>{lastChecked.toLocaleTimeString()}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-8 space-y-3">
          {isOnline ? (
            <button
              onClick={goToDashboard}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          ) : (
            <>
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Connection
              </button>
              <button
                onClick={goToDashboard}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Continue Offline
              </button>
            </>
          )}
        </div>

        {/* Offline Features Footer */}
        {!isOnline && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              WedSync's offline functionality ensures you never miss a beat on
              wedding day. All your work is automatically saved locally and will
              sync when you're back online.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
