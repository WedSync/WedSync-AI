'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export interface MobileSecurityState {
  securityLevel: 'basic' | 'standard' | 'enhanced';
  isOffline: boolean;
  networkQuality: 'poor' | 'good' | 'excellent';
  deviceTrusted: boolean;
  biometricAvailable: boolean;
  sessionValid: boolean;
}

export interface MobileSecurityActions {
  validateTaskAccess: (taskId: string) => Promise<boolean>;
  validateMobileSession: () => Promise<{ user: any } | null>;
  enableBiometric: () => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

export function useMobileSecurity(): MobileSecurityState &
  MobileSecurityActions {
  const [state, setState] = useState<MobileSecurityState>({
    securityLevel: 'standard',
    isOffline: !navigator.onLine,
    networkQuality: 'good',
    deviceTrusted: true,
    biometricAvailable: false,
    sessionValid: true,
  });

  const supabase = createClient();

  // Monitor network status
  useEffect(() => {
    const handleOnline = () =>
      setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () =>
      setState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check biometric availability
    if ('credentials' in navigator && 'get' in navigator.credentials) {
      setState((prev) => ({ ...prev, biometricAvailable: true }));
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Network quality monitoring
  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      const updateNetworkQuality = () => {
        const effectiveType = connection.effectiveType;
        let quality: 'poor' | 'good' | 'excellent' = 'good';

        if (effectiveType === 'slow-2g' || effectiveType === '2g') {
          quality = 'poor';
        } else if (effectiveType === '4g') {
          quality = 'excellent';
        }

        setState((prev) => ({ ...prev, networkQuality: quality }));
      };

      connection.addEventListener('change', updateNetworkQuality);
      updateNetworkQuality();

      return () =>
        connection.removeEventListener('change', updateNetworkQuality);
    }
  }, []);

  const validateMobileSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('Session validation error:', error);
        setState((prev) => ({ ...prev, sessionValid: false }));
        return null;
      }

      const isValid = !!session?.user;
      setState((prev) => ({ ...prev, sessionValid: isValid }));

      return session;
    } catch (error) {
      console.error('Mobile session validation failed:', error);
      setState((prev) => ({ ...prev, sessionValid: false }));
      return null;
    }
  }, [supabase.auth]);

  const validateTaskAccess = useCallback(
    async (taskId: string): Promise<boolean> => {
      try {
        const session = await validateMobileSession();
        if (!session?.user) {
          throw new Error('Mobile authentication required');
        }

        // Check if user has access to this task
        const { data: task, error } = await supabase
          .from('wedding_tasks')
          .select('id, wedding_id, assigned_to, created_by')
          .eq('id', taskId)
          .single();

        if (error || !task) {
          console.error('Task access validation error:', error);
          return false;
        }

        // User can access if they created it or are assigned to it
        const hasAccess =
          task.created_by === session.user.id ||
          task.assigned_to === session.user.id;

        return hasAccess;
      } catch (error) {
        console.error('Task access validation failed:', error);
        return false;
      }
    },
    [supabase, validateMobileSession],
  );

  const enableBiometric = useCallback(async (): Promise<boolean> => {
    if (!state.biometricAvailable) return false;

    try {
      // Request biometric authentication
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          timeout: 60000,
          userVerification: 'required',
        },
      });

      return !!credential;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }, [state.biometricAvailable]);

  const refreshSession = useCallback(async () => {
    try {
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('Session refresh error:', error);
        setState((prev) => ({ ...prev, sessionValid: false }));
      } else {
        setState((prev) => ({ ...prev, sessionValid: true }));
      }
    } catch (error) {
      console.error('Session refresh failed:', error);
      setState((prev) => ({ ...prev, sessionValid: false }));
    }
  }, [supabase.auth]);

  return {
    ...state,
    validateTaskAccess,
    validateMobileSession,
    enableBiometric,
    refreshSession,
  };
}
