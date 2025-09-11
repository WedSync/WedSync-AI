'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TaskCategory, CategoryTask } from '@/types/task-categories';
import { cn } from '@/lib/utils';
import {
  DevicePhoneMobileIcon,
  ShareIcon,
  QrCodeIcon,
  BellIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  LinkIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';

interface WedMeCategoryIntegrationProps {
  categories: TaskCategory[];
  organizationId: string;
  clientId?: string;
  onCategorySync?: (category: TaskCategory) => void;
  className?: string;
}

interface MobileSession {
  id: string;
  deviceName: string;
  deviceType: 'ios' | 'android' | 'web';
  lastActive: Date;
  isConnected: boolean;
  permissions: string[];
}

interface ShareableLink {
  id: string;
  categoryId: string;
  url: string;
  accessLevel: 'view' | 'edit' | 'admin';
  expiresAt?: Date;
  usageCount: number;
}

export default function WedMeCategoryIntegration({
  categories,
  organizationId,
  clientId,
  onCategorySync,
  className,
}: WedMeCategoryIntegrationProps) {
  const [mobileSessions, setMobileSessions] = useState<MobileSession[]>([]);
  const [shareableLinks, setShareableLinks] = useState<ShareableLink[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load mobile sessions and shareable links
  useEffect(() => {
    loadMobileSessions();
    loadShareableLinks();
  }, [organizationId, clientId]);

  const loadMobileSessions = async () => {
    try {
      const response = await fetch(
        `/api/mobile/sessions?organization_id=${organizationId}`,
      );
      if (response.ok) {
        const sessions = await response.json();
        setMobileSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to load mobile sessions:', error);
    }
  };

  const loadShareableLinks = async () => {
    try {
      const response = await fetch(
        `/api/mobile/shareable-links?organization_id=${organizationId}`,
      );
      if (response.ok) {
        const links = await response.json();
        setShareableLinks(links);
      }
    } catch (error) {
      console.error('Failed to load shareable links:', error);
    }
  };

  // Generate shareable link for categories
  const generateShareableLink = useCallback(async () => {
    if (selectedCategories.length === 0) return;

    setIsGeneratingLink(true);
    try {
      const response = await fetch('/api/mobile/generate-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: organizationId,
          client_id: clientId,
          category_ids: selectedCategories,
          access_level: 'edit',
          expires_in_hours: 24,
        }),
      });

      if (response.ok) {
        const { url, qr_code_url } = await response.json();
        setQrCodeUrl(qr_code_url);
        await loadShareableLinks();

        // Copy to clipboard
        await navigator.clipboard.writeText(url);

        // Show success notification
        if (navigator.vibrate) {
          navigator.vibrate([10, 5, 10]);
        }
      }
    } catch (error) {
      console.error('Failed to generate shareable link:', error);
    } finally {
      setIsGeneratingLink(false);
    }
  }, [selectedCategories, organizationId, clientId]);

  // Handle native mobile app connection
  const handleNativeAppConnection = useCallback(async () => {
    setIsConnecting(true);

    try {
      // Check if WedMe app is installed
      const isAppInstalled = await checkWedMeAppInstalled();

      if (isAppInstalled) {
        // Deep link to WedMe app
        const deepLinkUrl = `wedme://categories?org=${organizationId}&client=${clientId}&categories=${selectedCategories.join(',')}`;
        window.location.href = deepLinkUrl;

        // Fallback to app store after timeout
        setTimeout(() => {
          window.open(getAppStoreLink(), '_blank');
        }, 3000);
      } else {
        // Redirect to app store
        window.open(getAppStoreLink(), '_blank');
      }
    } catch (error) {
      console.error('Failed to connect to native app:', error);
      // Fallback to web version
      const webUrl = `/mobile/categories?org=${organizationId}&client=${clientId}`;
      window.open(webUrl, '_blank');
    } finally {
      setIsConnecting(false);
    }
  }, [organizationId, clientId, selectedCategories]);

  // Check if WedMe mobile app is installed
  const checkWedMeAppInstalled = async (): Promise<boolean> => {
    // This would typically use custom URL schemes or app links
    // For now, we'll simulate the check
    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(false), 1000);

      // Try to open the app
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = 'wedme://check';

      document.body.appendChild(iframe);

      // If app opens successfully, this won't execute
      setTimeout(() => {
        document.body.removeChild(iframe);
        clearTimeout(timeout);
        resolve(true);
      }, 500);
    });
  };

  // Get app store link based on device
  const getAppStoreLink = () => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'https://apps.apple.com/app/wedme-wedding-planner/id123456789';
    } else {
      return 'https://play.google.com/store/apps/details?id=com.wedsync.wedme';
    }
  };

  // Handle category selection
  const handleCategoryToggle = useCallback((categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }, []);

  // Get device icon
  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'ios':
      case 'android':
        return <DevicePhoneMobileIcon className="w-5 h-5" />;
      default:
        return <LinkIcon className="w-5 h-5" />;
    }
  };

  // Get connection status color
  const getConnectionStatusColor = (isConnected: boolean) => {
    return isConnected ? 'text-green-600' : 'text-gray-400';
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Mobile Integration Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center space-x-3 mb-4">
          <DevicePhoneMobileIcon className="w-8 h-8" />
          <div>
            <h3 className="text-xl font-bold">WedMe Mobile Integration</h3>
            <p className="text-purple-100 text-sm">
              Access task categories on your mobile device
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold">{categories.length}</div>
            <div className="text-sm text-purple-100">Categories Available</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="text-2xl font-bold">{mobileSessions.length}</div>
            <div className="text-sm text-purple-100">Connected Devices</div>
          </div>
        </div>
      </div>

      {/* Category Selection */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Select Categories to Share
        </h4>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              onClick={() => handleCategoryToggle(category.id)}
              className={cn(
                'flex items-center justify-between p-3 rounded-xl border transition-all',
                selectedCategories.includes(category.id)
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300',
              )}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center space-x-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-sm font-medium text-gray-900">
                  {category.display_name}
                </span>
              </div>

              {selectedCategories.includes(category.id) && (
                <CheckCircleIcon className="w-5 h-5 text-purple-600" />
              )}
            </motion.button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={handleNativeAppConnection}
            disabled={selectedCategories.length === 0 || isConnecting}
            className={cn(
              'flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl font-medium transition-colors',
              selectedCategories.length > 0 && !isConnecting
                ? 'bg-purple-600 text-white hover:bg-purple-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            )}
          >
            <DevicePhoneMobileIcon className="w-5 h-5" />
            <span>{isConnecting ? 'Connecting...' : 'Open in WedMe App'}</span>
            {!isConnecting && <ArrowRightIcon className="w-4 h-4" />}
          </button>

          <button
            onClick={generateShareableLink}
            disabled={selectedCategories.length === 0 || isGeneratingLink}
            className={cn(
              'flex items-center justify-center px-4 py-3 rounded-xl font-medium transition-colors',
              selectedCategories.length > 0 && !isGeneratingLink
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed',
            )}
          >
            {isGeneratingLink ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <ShareIcon className="w-5 h-5" />
              </motion.div>
            ) : (
              <ShareIcon className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* QR Code Modal */}
      <AnimatePresence>
        {qrCodeUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setQrCodeUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-4">
                <QrCodeIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Scan to Open on Mobile
                </h3>
                <p className="text-sm text-gray-500">
                  Scan this QR code with your phone's camera
                </p>
              </div>

              <div className="flex justify-center mb-4">
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  className="w-48 h-48 rounded-xl"
                />
              </div>

              <button
                onClick={() => setQrCodeUrl(null)}
                className="w-full py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connected Devices */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">
          Connected Mobile Devices
        </h4>

        {mobileSessions.length > 0 ? (
          <div className="space-y-3">
            {mobileSessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={cn(
                      'p-2 rounded-lg',
                      getConnectionStatusColor(session.isConnected),
                    )}
                  >
                    {getDeviceIcon(session.deviceType)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {session.deviceName}
                    </div>
                    <div className="text-xs text-gray-500">
                      Last active: {session.lastActive.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <div
                    className={cn(
                      'w-2 h-2 rounded-full',
                      session.isConnected ? 'bg-green-500' : 'bg-gray-300',
                    )}
                  />
                  <span className="text-xs text-gray-500">
                    {session.isConnected ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <DevicePhoneMobileIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No mobile devices connected yet</p>
            <p className="text-xs">
              Select categories and create a shareable link to get started
            </p>
          </div>
        )}
      </div>

      {/* Shareable Links */}
      {shareableLinks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">
            Active Shareable Links
          </h4>

          <div className="space-y-3">
            {shareableLinks.map((link) => {
              const category = categories.find(
                (cat) => cat.id === link.categoryId,
              );
              return (
                <div
                  key={link.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: category?.color || '#gray' }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {category?.display_name || 'Unknown Category'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {link.usageCount} uses • {link.accessLevel} access
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(link.url);
                      if (navigator.vibrate) {
                        navigator.vibrate(10);
                      }
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <ShareIcon className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
