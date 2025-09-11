'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  SupplierDomain,
  DomainConfig,
  DomainValidationResult,
} from '@/types/domains';

interface UseDomainStatusReturn {
  config: DomainConfig | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  fetchConfig: () => Promise<void>;
  validateDomain: (domain: string) => Promise<DomainValidationResult>;
  configureDomain: (domain: string) => Promise<boolean>;
  verifyDomain: () => Promise<boolean>;
  removeDomain: () => Promise<boolean>;
  checkSSLStatus: () => Promise<void>;
}

export function useDomainStatus(supplierId?: string): UseDomainStatusReturn {
  const [config, setConfig] = useState<DomainConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConfig = useCallback(async () => {
    if (!supplierId) {
      setLoading(false);
      return;
    }

    try {
      setRefreshing(true);
      const response = await fetch(
        `/api/supplier/domain?supplier_id=${supplierId}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const result = await response.json();

      if (result.success) {
        setConfig(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch domain configuration');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching domain config:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supplierId]);

  const validateDomain = useCallback(
    async (domain: string): Promise<DomainValidationResult> => {
      try {
        const response = await fetch('/api/supplier/domain/validate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ domain }),
        });

        const result = await response.json();
        return (
          result.data || {
            valid: false,
            available: false,
            errors: ['Validation failed'],
          }
        );
      } catch (err) {
        console.error('Error validating domain:', err);
        return { valid: false, available: false, errors: ['Validation error'] };
      }
    },
    [],
  );

  const configureDomain = useCallback(
    async (domain: string): Promise<boolean> => {
      if (!supplierId) return false;

      try {
        const response = await fetch('/api/supplier/domain', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            supplier_id: supplierId,
            domain: domain.trim(),
            action: 'configure',
          }),
        });

        const result = await response.json();

        if (result.success) {
          await fetchConfig();
          setError(null);
          return true;
        } else {
          setError(result.error || 'Failed to configure domain');
          return false;
        }
      } catch (err) {
        setError('Error configuring domain');
        console.error('Error configuring domain:', err);
        return false;
      }
    },
    [supplierId, fetchConfig],
  );

  const verifyDomain = useCallback(async (): Promise<boolean> => {
    if (!supplierId) return false;

    try {
      const response = await fetch('/api/supplier/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplier_id: supplierId,
          action: 'verify',
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchConfig();
        setError(null);
        return true;
      } else {
        setError(result.error || 'Failed to verify domain');
        return false;
      }
    } catch (err) {
      setError('Error verifying domain');
      console.error('Error verifying domain:', err);
      return false;
    }
  }, [supplierId, fetchConfig]);

  const removeDomain = useCallback(async (): Promise<boolean> => {
    if (!supplierId) return false;

    try {
      const response = await fetch('/api/supplier/domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplier_id: supplierId,
          action: 'remove',
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchConfig();
        setError(null);
        return true;
      } else {
        setError(result.error || 'Failed to remove domain');
        return false;
      }
    } catch (err) {
      setError('Error removing domain');
      console.error('Error removing domain:', err);
      return false;
    }
  }, [supplierId, fetchConfig]);

  const checkSSLStatus = useCallback(async () => {
    if (!supplierId || !config?.current_domain) return;

    try {
      const response = await fetch('/api/supplier/domain/ssl-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          supplier_id: supplierId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        await fetchConfig(); // Refresh to get updated SSL status
      }
    } catch (err) {
      console.error('Error checking SSL status:', err);
    }
  }, [supplierId, config?.current_domain, fetchConfig]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Auto-refresh every 30 seconds if domain is being configured
  useEffect(() => {
    if (
      config?.status.dns_status === 'pending' ||
      config?.status.ssl_status === 'pending'
    ) {
      const interval = setInterval(() => {
        fetchConfig();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [config?.status.dns_status, config?.status.ssl_status, fetchConfig]);

  return {
    config,
    loading,
    error,
    refreshing,
    fetchConfig,
    validateDomain,
    configureDomain,
    verifyDomain,
    removeDomain,
    checkSSLStatus,
  };
}
