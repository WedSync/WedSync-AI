'use client';

import { useState } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Check,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineIndicatorProps {
  isOffline: boolean;
  lastSync?: Date | null;
  syncInProgress?: boolean;
  onSync?: () => void;
  offlineArticleCount?: number;
}

export function OfflineIndicator({
  isOffline,
  lastSync,
  syncInProgress = false,
  onSync,
  offlineArticleCount = 0,
}: OfflineIndicatorProps) {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusIcon = () => {
    if (syncInProgress) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }
    if (isOffline) {
      return <WifiOff className="w-4 h-4" />;
    }
    return <Wifi className="w-4 h-4" />;
  };

  const getStatusColor = () => {
    if (syncInProgress) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (isOffline) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getStatusText = () => {
    if (syncInProgress) return 'Syncing...';
    if (isOffline) return 'Offline';
    return 'Online';
  };

  const getLastSyncText = () => {
    if (!lastSync) return 'Never synced';

    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  const handleSync = () => {
    if (onSync && !syncInProgress && !isOffline) {
      onSync();
    }
  };

  return (
    <div className="relative">
      {/* Main Status Button */}
      <motion.button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border transition-all duration-200 ${getStatusColor()}`}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{ minHeight: '36px', minWidth: '80px' }}
      >
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </motion.button>

      {/* Detailed Status Popup */}
      <AnimatePresence>
        {showDetails && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-transparent z-10"
              onClick={() => setShowDetails(false)}
            />

            {/* Popup Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-20"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">
                  Connection Status
                </h3>
                <div
                  className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor()}`}
                >
                  {getStatusIcon()}
                  <span>{getStatusText()}</span>
                </div>
              </div>

              {/* Connection Details */}
              <div className="space-y-3">
                {/* Online Status */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <Wifi
                      className={`w-4 h-4 ${isOffline ? 'text-gray-400' : 'text-green-500'}`}
                    />
                    <span className="text-sm text-gray-700">
                      Internet Connection
                    </span>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${
                      isOffline
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {isOffline ? 'Disconnected' : 'Connected'}
                  </span>
                </div>

                {/* Last Sync */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-700">Last Sync</span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {getLastSyncText()}
                  </span>
                </div>

                {/* Offline Articles */}
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-2">
                    <WifiOff className="w-4 h-4 text-amber-500" />
                    <span className="text-sm text-gray-700">
                      Offline Articles
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {offlineArticleCount} available
                  </span>
                </div>
              </div>

              {/* Status Messages */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                {isOffline ? (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-amber-700 font-medium">
                        You're offline
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        You can still access {offlineArticleCount} saved
                        articles and use basic features. Your changes will sync
                        when you're back online.
                      </p>
                    </div>
                  </div>
                ) : syncInProgress ? (
                  <div className="flex items-start space-x-2">
                    <RefreshCw className="w-4 h-4 text-blue-500 mt-0.5 animate-spin flex-shrink-0" />
                    <div>
                      <p className="text-sm text-blue-700 font-medium">
                        Syncing data
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Updating your offline articles and syncing your
                        bookmarks...
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm text-green-700 font-medium">
                        All synced
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Your content is up to date and ready for offline use.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="mt-4 flex space-x-2">
                {!isOffline && (
                  <motion.button
                    onClick={handleSync}
                    disabled={syncInProgress}
                    className="flex items-center space-x-2 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-1"
                    style={{ minHeight: '40px' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${syncInProgress ? 'animate-spin' : ''}`}
                    />
                    <span>{syncInProgress ? 'Syncing...' : 'Sync Now'}</span>
                  </motion.button>
                )}

                <button
                  onClick={() => setShowDetails(false)}
                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex-1"
                  style={{ minHeight: '40px' }}
                >
                  Close
                </button>
              </div>

              {/* Offline Help */}
              {isOffline && (
                <motion.div
                  className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <h4 className="text-sm font-medium text-blue-900 mb-2">
                    💡 Offline Tips
                  </h4>
                  <ul className="text-xs text-blue-700 space-y-1">
                    <li>• Voice search works with cached content</li>
                    <li>• Bookmarks and notes are saved locally</li>
                    <li>• Changes sync automatically when online</li>
                    <li>• Check your saved articles in the offline section</li>
                  </ul>
                </motion.div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
