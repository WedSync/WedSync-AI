'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon,
  ExternalLinkIcon,
  RefreshIcon,
  SettingsIcon,
  PlusIcon,
  InfoIcon,
  ShieldCheckIcon,
  KeyIcon,
  GlobeIcon,
} from 'lucide-react';

interface Platform {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync?: string;
  accountInfo?: {
    email?: string;
    businessName?: string;
    profileUrl?: string;
  };
  features: string[];
  setupUrl?: string;
  errorMessage?: string;
}

interface ReviewPlatformIntegrationsProps {
  supplierId: string;
  onConnectionChange?: (platformId: string, connected: boolean) => void;
}

export function ReviewPlatformIntegrations({
  supplierId,
  onConnectionChange,
}: ReviewPlatformIntegrationsProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState<string | null>(null);

  useEffect(() => {
    loadPlatformData();
  }, [supplierId]);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      // In real implementation, this would fetch from your API
      // For now, using mock data that demonstrates the component structure

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setPlatforms([
        {
          id: 'google',
          name: 'Google Business',
          icon: '🌟',
          description:
            'Connect your Google My Business profile to automatically request and manage reviews',
          status: 'connected',
          lastSync: '2024-01-20T10:30:00Z',
          accountInfo: {
            email: 'info@yourphotography.com',
            businessName: 'Your Photography Studio',
            profileUrl: 'https://business.google.com/b/123456789',
          },
          features: [
            'Automatic review requests',
            'Review response management',
            'Rating analytics',
            'Business profile insights',
          ],
        },
        {
          id: 'facebook',
          name: 'Facebook Pages',
          icon: '👍',
          description:
            'Connect your Facebook business page to collect reviews and recommendations',
          status: 'connected',
          lastSync: '2024-01-19T16:45:00Z',
          accountInfo: {
            businessName: 'Your Photography Studio',
            profileUrl: 'https://facebook.com/yourphotographystudio',
          },
          features: [
            'Page recommendations',
            'Review notifications',
            'Social proof widgets',
            'Engagement analytics',
          ],
        },
        {
          id: 'yelp',
          name: 'Yelp for Business',
          icon: '📝',
          description:
            'Manage your Yelp business profile and respond to customer reviews',
          status: 'error',
          errorMessage: 'API key expired. Please reconnect your account.',
          features: [
            'Review monitoring',
            'Business messaging',
            'Customer insights',
            'Competitor analysis',
          ],
        },
        {
          id: 'weddingwire',
          name: 'WeddingWire',
          icon: '💍',
          description:
            'Connect your WeddingWire vendor profile for wedding-specific reviews',
          status: 'disconnected',
          setupUrl: 'https://weddingwire.com/vendor/api',
          features: [
            'Wedding review collection',
            'Vendor profile optimization',
            'Lead generation insights',
            'Industry benchmarking',
          ],
        },
        {
          id: 'theknot',
          name: 'The Knot',
          icon: '🎗️',
          description:
            'Integrate with The Knot vendor directory for comprehensive wedding reviews',
          status: 'disconnected',
          setupUrl: 'https://theknot.com/vendor/connect',
          features: [
            'Bridal directory reviews',
            'Wedding showcase integration',
            'Couple matching insights',
            'Seasonal trend analysis',
          ],
        },
      ]);
    } catch (error) {
      console.error('Error loading platform data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platformId: string) => {
    setConnecting(platformId);
    try {
      // In real implementation, this would initiate OAuth flow or API connection
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setPlatforms((prev) =>
        prev.map((platform) =>
          platform.id === platformId
            ? {
                ...platform,
                status: 'connected',
                lastSync: new Date().toISOString(),
                accountInfo: {
                  email: 'info@yourphotography.com',
                  businessName: 'Your Photography Studio',
                },
              }
            : platform,
        ),
      );

      onConnectionChange?.(platformId, true);
    } catch (error) {
      console.error(`Error connecting to ${platformId}:`, error);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (platformId: string) => {
    try {
      setPlatforms((prev) =>
        prev.map((platform) =>
          platform.id === platformId
            ? {
                ...platform,
                status: 'disconnected',
                accountInfo: undefined,
                lastSync: undefined,
              }
            : platform,
        ),
      );

      onConnectionChange?.(platformId, false);
    } catch (error) {
      console.error(`Error disconnecting from ${platformId}:`, error);
    }
  };

  const handleSync = async (platformId: string) => {
    try {
      setPlatforms((prev) =>
        prev.map((platform) =>
          platform.id === platformId
            ? { ...platform, lastSync: new Date().toISOString() }
            : platform,
        ),
      );
    } catch (error) {
      console.error(`Error syncing ${platformId}:`, error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircleIcon className="h-5 w-5 text-success-500" />;
      case 'error':
        return <XCircleIcon className="h-5 w-5 text-error-500" />;
      case 'pending':
        return <AlertCircleIcon className="h-5 w-5 text-warning-500" />;
      default:
        return (
          <div className="w-5 h-5 border-2 border-gray-300 rounded-full" />
        );
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      case 'pending':
        return 'Connecting...';
      default:
        return 'Not Connected';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-success-700 bg-success-50 border-success-200';
      case 'error':
        return 'text-error-700 bg-error-50 border-error-200';
      case 'pending':
        return 'text-warning-700 bg-warning-50 border-warning-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const formatLastSync = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hours ago`;
    } else {
      return `${diffDays} days ago`;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 rounded-xl mb-4"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start space-x-3">
          <ShieldCheckIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Platform Integrations
            </h2>
            <p className="text-blue-700 text-sm leading-relaxed">
              Connect your review platforms to automatically collect feedback
              from clients. All connections are secured with industry-standard
              OAuth protocols and can be disconnected at any time.
            </p>
          </div>
        </div>
      </div>

      {/* Connected Platforms Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Connected</p>
              <p className="text-2xl font-bold text-gray-900">
                {platforms.filter((p) => p.status === 'connected').length}
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-success-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Available</p>
              <p className="text-2xl font-bold text-gray-900">
                {platforms.length}
              </p>
            </div>
            <GlobeIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Issues</p>
              <p className="text-2xl font-bold text-gray-900">
                {platforms.filter((p) => p.status === 'error').length}
              </p>
            </div>
            <XCircleIcon className="h-8 w-8 text-error-500" />
          </div>
        </div>
      </div>

      {/* Platform Cards */}
      <div className="space-y-4">
        {platforms.map((platform) => (
          <div
            key={platform.id}
            className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs hover:shadow-md transition-all duration-200"
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              {/* Platform Info */}
              <div className="flex items-start space-x-4 mb-4 lg:mb-0">
                <div className="flex-shrink-0">
                  <span
                    className="text-3xl"
                    role="img"
                    aria-label={platform.name}
                  >
                    {platform.icon}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {platform.name}
                    </h3>
                    {getStatusIcon(platform.status)}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(platform.status)}`}
                    >
                      {getStatusText(platform.status)}
                    </span>
                  </div>

                  <p className="text-gray-600 text-sm mb-3">
                    {platform.description}
                  </p>

                  {/* Account Info */}
                  {platform.accountInfo && platform.status === 'connected' && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        {platform.accountInfo.email && (
                          <div>
                            <span className="text-gray-500">Email:</span>
                            <span className="ml-2 text-gray-900">
                              {platform.accountInfo.email}
                            </span>
                          </div>
                        )}
                        {platform.accountInfo.businessName && (
                          <div>
                            <span className="text-gray-500">Business:</span>
                            <span className="ml-2 text-gray-900">
                              {platform.accountInfo.businessName}
                            </span>
                          </div>
                        )}
                      </div>
                      {platform.lastSync && (
                        <div className="mt-2 text-xs text-gray-500">
                          Last synced: {formatLastSync(platform.lastSync)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error Message */}
                  {platform.status === 'error' && platform.errorMessage && (
                    <div className="bg-error-50 border border-error-200 rounded-lg p-3 mb-3">
                      <p className="text-error-700 text-sm">
                        {platform.errorMessage}
                      </p>
                    </div>
                  )}

                  {/* Features */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">
                      Features:
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {platform.features.map((feature, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex flex-col space-y-2 lg:ml-6">
                {platform.status === 'connected' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSync(platform.id)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
                    >
                      <RefreshIcon className="h-4 w-4 mr-2" />
                      Sync Now
                    </button>

                    {platform.accountInfo?.profileUrl && (
                      <a
                        href={platform.accountInfo.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
                      >
                        <ExternalLinkIcon className="h-4 w-4 mr-2" />
                        View Profile
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowSetupModal(platform.id)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all duration-200"
                    >
                      <SettingsIcon className="h-4 w-4 mr-2" />
                      Settings
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDisconnect(platform.id)}
                      className="inline-flex items-center justify-center px-4 py-2 border border-error-300 rounded-lg text-sm font-medium text-error-700 bg-white hover:bg-error-50 focus:outline-none focus:ring-4 focus:ring-error-100 transition-all duration-200"
                    >
                      Disconnect
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnect(platform.id)}
                    disabled={connecting === platform.id}
                    className="inline-flex items-center justify-center px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100"
                  >
                    {connecting === platform.id ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Connecting...
                      </>
                    ) : (
                      <>
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Connect
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Security Notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <KeyIcon className="h-5 w-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Security & Privacy
            </h4>
            <p className="text-sm text-gray-600">
              All integrations use secure OAuth 2.0 authentication. We never
              store your platform passwords. You can revoke access at any time
              through your platform's security settings or by disconnecting
              here.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
