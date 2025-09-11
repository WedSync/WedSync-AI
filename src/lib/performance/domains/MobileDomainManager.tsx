/**
 * WS-222: Custom Domains System - Mobile Domain Manager
 * Team D - Performance Optimization & Mobile Optimization
 *
 * Mobile-optimized domain management interface for wedding suppliers
 */

'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import { createClient } from '@supabase/supabase-js';
import DomainCache, { DomainConfig, DomainResolution } from './DomainCache';
import DomainPerformanceMonitor, {
  DomainHealthCheck,
  MobilePerformanceProfile,
} from './DomainPerformanceMonitor';

interface MobileDomainManagerProps {
  organizationId: string;
  onDomainStatusChange?: (
    domain: string,
    status: 'active' | 'pending' | 'failed',
  ) => void;
  onPerformanceAlert?: (domain: string, message: string) => void;
  className?: string;
}

interface DomainFormData {
  domain: string;
  subdomain?: string;
  autoSSL: boolean;
  redirectWWW: boolean;
}

const MobileDomainManager: React.FC<MobileDomainManagerProps> = memo(
  ({
    organizationId,
    onDomainStatusChange,
    onPerformanceAlert,
    className = '',
  }) => {
    // State management
    const [domains, setDomains] = useState<DomainConfig[]>([]);
    const [healthChecks, setHealthChecks] = useState<
      Map<string, DomainHealthCheck>
    >(new Map());
    const [loading, setLoading] = useState(true);
    const [isAddingDomain, setIsAddingDomain] = useState(false);
    const [formData, setFormData] = useState<DomainFormData>({
      domain: '',
      subdomain: '',
      autoSSL: true,
      redirectWWW: false,
    });
    const [networkStatus, setNetworkStatus] = useState<'online' | 'offline'>(
      'online',
    );
    const [connectionType, setConnectionType] = useState<
      '2g' | '3g' | '4g' | '5g' | 'wifi' | 'unknown'
    >('unknown');

    // Initialize services
    const [domainCache] = useState(() => new DomainCache());
    const [performanceMonitor] = useState(() => new DomainPerformanceMonitor());
    const [supabase] = useState(() =>
      createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL ||
          (() => {
            throw new Error(
              'Missing environment variable: NEXT_PUBLIC_SUPABASE_URL',
            );
          })(),
        process.env.SUPABASE_ANON_KEY ||
          (() => {
            throw new Error('Missing environment variable: SUPABASE_ANON_KEY');
          })(),
      ),
    );

    // Mobile optimization: Detect network conditions
    useEffect(() => {
      const updateNetworkInfo = () => {
        setNetworkStatus(navigator.onLine ? 'online' : 'offline');

        if ('connection' in navigator) {
          const connection = (navigator as any).connection;
          if (connection) {
            const effectiveType = connection.effectiveType;
            setConnectionType(effectiveType || 'unknown');
          }
        }
      };

      updateNetworkInfo();
      window.addEventListener('online', updateNetworkInfo);
      window.addEventListener('offline', updateNetworkInfo);

      if ('connection' in navigator) {
        (navigator as any).connection?.addEventListener(
          'change',
          updateNetworkInfo,
        );
      }

      return () => {
        window.removeEventListener('online', updateNetworkInfo);
        window.removeEventListener('offline', updateNetworkInfo);
        if ('connection' in navigator) {
          (navigator as any).connection?.removeEventListener(
            'change',
            updateNetworkInfo,
          );
        }
      };
    }, []);

    // Load domains on component mount
    useEffect(() => {
      loadDomains();
    }, [organizationId]);

    // Performance monitoring
    useEffect(() => {
      if (domains.length > 0) {
        startPerformanceMonitoring();
      }
    }, [domains]);

    // Mobile profile for performance monitoring
    const getMobileProfile = useCallback(
      (): MobilePerformanceProfile => ({
        connectionType,
        deviceType:
          window.innerWidth < 768
            ? 'mobile'
            : window.innerWidth < 1024
              ? 'tablet'
              : 'desktop',
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        location: {
          country: 'Unknown', // Would be determined by geolocation
          region: 'Unknown',
        },
      }),
      [connectionType],
    );

    const loadDomains = useCallback(async () => {
      try {
        setLoading(true);

        const { data, error } = await supabase
          .from('custom_domains')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setDomains(data || []);

        // Preload domain cache for better mobile performance
        if (data && data.length > 0) {
          domainCache.preloadDomains(organizationId);
        }
      } catch (error) {
        console.error('Failed to load domains:', error);
      } finally {
        setLoading(false);
      }
    }, [organizationId, supabase, domainCache]);

    const startPerformanceMonitoring = useCallback(async () => {
      if (networkStatus === 'offline') return;

      const profile = getMobileProfile();
      const activeDomains = domains
        .filter((d) => d.status === 'active')
        .map((d) => d.domain);

      if (activeDomains.length === 0) return;

      try {
        // Batch monitor domains with mobile optimization
        const healthResults = await performanceMonitor.monitorDomainsBatch(
          activeDomains,
          profile,
        );
        setHealthChecks(healthResults);

        // Check for alerts
        healthResults.forEach((healthCheck, domain) => {
          if (
            healthCheck.status === 'unhealthy' ||
            healthCheck.status === 'degraded'
          ) {
            onPerformanceAlert?.(
              domain,
              `Domain ${domain} is ${healthCheck.status}`,
            );
          }
        });
      } catch (error) {
        console.error('Performance monitoring failed:', error);
      }
    }, [
      domains,
      networkStatus,
      getMobileProfile,
      performanceMonitor,
      onPerformanceAlert,
    ]);

    const addDomain = useCallback(async () => {
      if (!formData.domain.trim()) return;

      try {
        setIsAddingDomain(true);

        const newDomain: Partial<DomainConfig> = {
          domain: formData.domain.toLowerCase().trim(),
          subdomain: formData.subdomain?.trim() || undefined,
          organizationId,
          status: 'pending',
          verificationToken: generateVerificationToken(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const { data, error } = await supabase
          .from('custom_domains')
          .insert(newDomain)
          .select()
          .single();

        if (error) throw error;

        setDomains((prev) => [data, ...prev]);
        setFormData({
          domain: '',
          subdomain: '',
          autoSSL: true,
          redirectWWW: false,
        });

        // Start verification process
        verifyDomain(data);

        onDomainStatusChange?.(data.domain, 'pending');
      } catch (error) {
        console.error('Failed to add domain:', error);
      } finally {
        setIsAddingDomain(false);
      }
    }, [formData, organizationId, supabase, onDomainStatusChange]);

    const verifyDomain = useCallback(
      async (domain: DomainConfig) => {
        try {
          // Verify domain with mobile-optimized settings
          const profile = getMobileProfile();
          const healthCheck = await performanceMonitor.monitorDomain(
            domain.domain,
            profile,
          );

          let newStatus: 'active' | 'failed' = 'failed';

          if (
            healthCheck.status === 'healthy' ||
            healthCheck.status === 'degraded'
          ) {
            newStatus = 'active';
          }

          // Update domain status
          const { error } = await supabase
            .from('custom_domains')
            .update({
              status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', domain.id);

          if (error) throw error;

          // Update local state
          setDomains((prev) =>
            prev.map((d) =>
              d.id === domain.id ? { ...d, status: newStatus } : d,
            ),
          );

          setHealthChecks((prev) =>
            new Map(prev).set(domain.domain, healthCheck),
          );
          onDomainStatusChange?.(domain.domain, newStatus);
        } catch (error) {
          console.error(
            `Domain verification failed for ${domain.domain}:`,
            error,
          );
          onDomainStatusChange?.(domain.domain, 'failed');
        }
      },
      [getMobileProfile, performanceMonitor, supabase, onDomainStatusChange],
    );

    const removeDomain = useCallback(
      async (domainId: string) => {
        try {
          const { error } = await supabase
            .from('custom_domains')
            .delete()
            .eq('id', domainId);

          if (error) throw error;

          setDomains((prev) => prev.filter((d) => d.id !== domainId));

          // Clean up cache
          const domain = domains.find((d) => d.id === domainId);
          if (domain) {
            domainCache.invalidateDomain(domain.domain);
            setHealthChecks((prev) => {
              const newMap = new Map(prev);
              newMap.delete(domain.domain);
              return newMap;
            });
          }
        } catch (error) {
          console.error('Failed to remove domain:', error);
        }
      },
      [supabase, domains, domainCache],
    );

    const generateVerificationToken = (): string => {
      return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
      );
    };

    const getStatusColor = (status: DomainConfig['status']): string => {
      switch (status) {
        case 'active':
          return 'text-green-600 bg-green-50';
        case 'pending':
          return 'text-yellow-600 bg-yellow-50';
        case 'failed':
          return 'text-red-600 bg-red-50';
        case 'expired':
          return 'text-gray-600 bg-gray-50';
        default:
          return 'text-gray-600 bg-gray-50';
      }
    };

    const getHealthStatusColor = (
      status?: 'healthy' | 'degraded' | 'unhealthy',
    ): string => {
      switch (status) {
        case 'healthy':
          return 'text-green-500';
        case 'degraded':
          return 'text-yellow-500';
        case 'unhealthy':
          return 'text-red-500';
        default:
          return 'text-gray-400';
      }
    };

    if (loading) {
      return (
        <div className={`mobile-domain-manager ${className}`}>
          <div className="animate-pulse space-y-4 p-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="space-y-3">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={`mobile-domain-manager ${className}`}>
        {/* Header with network status */}
        <div className="flex items-center justify-between p-4 bg-white border-b">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Custom Domains
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <div
                className={`w-2 h-2 rounded-full ${networkStatus === 'online' ? 'bg-green-500' : 'bg-red-500'}`}
              />
              <span>{networkStatus}</span>
              {connectionType !== 'unknown' && (
                <span className="uppercase font-mono text-xs px-1 py-0.5 bg-gray-100 rounded">
                  {connectionType}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsAddingDomain(!isAddingDomain)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium touch-manipulation active:bg-blue-700 disabled:opacity-50"
            disabled={networkStatus === 'offline'}
          >
            {isAddingDomain ? 'Cancel' : 'Add Domain'}
          </button>
        </div>

        {/* Add domain form */}
        {isAddingDomain && (
          <div className="p-4 bg-gray-50 border-b">
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain Name
                </label>
                <input
                  type="text"
                  value={formData.domain}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, domain: e.target.value }))
                  }
                  placeholder="mydomain.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ fontSize: '16px' }} // Prevent zoom on iOS
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subdomain (optional)
                </label>
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subdomain: e.target.value,
                    }))
                  }
                  placeholder="www"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ fontSize: '16px' }}
                />
              </div>

              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.autoSSL}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        autoSSL: e.target.checked,
                      }))
                    }
                    className="mr-2 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Auto SSL</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.redirectWWW}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        redirectWWW: e.target.checked,
                      }))
                    }
                    className="mr-2 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">Redirect WWW</span>
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={addDomain}
                  disabled={!formData.domain.trim() || isAddingDomain}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium touch-manipulation active:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAddingDomain ? 'Adding...' : 'Add Domain'}
                </button>
                <button
                  onClick={() => setIsAddingDomain(false)}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium touch-manipulation active:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Domain list */}
        <div className="divide-y divide-gray-200">
          {domains.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-400 text-sm">
                No custom domains configured yet
              </div>
              <button
                onClick={() => setIsAddingDomain(true)}
                className="mt-2 text-blue-600 text-sm font-medium"
                disabled={networkStatus === 'offline'}
              >
                Add your first domain
              </button>
            </div>
          ) : (
            domains.map((domain) => {
              const healthCheck = healthChecks.get(domain.domain);

              return (
                <div key={domain.id} className="p-4 touch-manipulation">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {domain.subdomain ? `${domain.subdomain}.` : ''}
                          {domain.domain}
                        </h3>
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(domain.status)}`}
                        >
                          {domain.status}
                        </span>
                      </div>

                      {healthCheck && (
                        <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <div
                              className={`w-2 h-2 rounded-full ${getHealthStatusColor(healthCheck.status)}`}
                            />
                            <span>Health: {healthCheck.status}</span>
                          </div>
                          <span>Response: {healthCheck.responseTime}ms</span>
                          {healthCheck.sslStatus !== 'valid' && (
                            <span className="text-red-500">
                              SSL: {healthCheck.sslStatus}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="mt-1 text-xs text-gray-500">
                        Added {new Date(domain.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-2">
                      {domain.status === 'pending' && (
                        <button
                          onClick={() => verifyDomain(domain)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded touch-manipulation active:bg-blue-200"
                          disabled={networkStatus === 'offline'}
                        >
                          Verify
                        </button>
                      )}

                      <button
                        onClick={() => removeDomain(domain.id)}
                        className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded touch-manipulation active:bg-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Performance insights for mobile */}
                  {healthCheck && healthCheck.status === 'degraded' && (
                    <div className="mt-2 p-2 bg-yellow-50 rounded text-xs text-yellow-800">
                      ⚠️ Performance issue detected. Consider optimizing for
                      mobile users.
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer stats */}
        {domains.length > 0 && (
          <div className="p-4 bg-gray-50 border-t">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-semibold text-green-600">
                  {domains.filter((d) => d.status === 'active').length}
                </div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-yellow-600">
                  {domains.filter((d) => d.status === 'pending').length}
                </div>
                <div className="text-xs text-gray-500">Pending</div>
              </div>
              <div>
                <div className="text-lg font-semibold text-red-600">
                  {domains.filter((d) => d.status === 'failed').length}
                </div>
                <div className="text-xs text-gray-500">Failed</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
);

MobileDomainManager.displayName = 'MobileDomainManager';

export default MobileDomainManager;
export type { MobileDomainManagerProps, DomainFormData };
