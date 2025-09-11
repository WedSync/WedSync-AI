'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import type { CoupleAuth, SeatingPermission } from '@/types/mobile-seating';

interface CoupleAuthGuardProps {
  children: React.ReactNode;
  requiredPermissions?: SeatingPermission[];
  redirectTo?: string;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  coupleAuth?: CoupleAuth;
  error?: string;
}

/**
 * CoupleAuthGuard - WS-154 Mobile Security Component
 *
 * Secure authentication guard for WedMe seating access
 * Features:
 * - Couple verification middleware
 * - Permission-based routing
 * - Session management
 * - Multi-device login detection
 * - Mobile-specific rate limiting
 */
export const CoupleAuthGuard: React.FC<CoupleAuthGuardProps> = ({
  children,
  requiredPermissions = ['view'],
  redirectTo = '/login',
}) => {
  const router = useRouter();
  const [authState, setAuthState] = useState<AuthState>({
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      setAuthState((prev) => ({ ...prev, isLoading: true, error: undefined }));

      // Check for existing session
      const sessionToken = localStorage.getItem('wedme_session_token');
      const coupleId = localStorage.getItem('wedme_couple_id');

      if (!sessionToken || !coupleId) {
        throw new Error('No valid session found');
      }

      // Verify session with server
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'X-Couple-ID': coupleId,
          'X-Client-Type': 'mobile-seating',
        },
      });

      if (!response.ok) {
        throw new Error('Session validation failed');
      }

      const authData = await response.json();

      // Check session expiration
      const expiresAt = new Date(authData.expiresAt);
      if (expiresAt < new Date()) {
        throw new Error('Session expired');
      }

      // Validate permissions
      const hasRequiredPermissions = requiredPermissions.every((permission) =>
        authData.permissions.includes(permission),
      );

      if (!hasRequiredPermissions) {
        throw new Error('Insufficient permissions');
      }

      // Check for mobile-specific rate limiting
      await checkMobileRateLimit(coupleId, sessionToken);

      setAuthState({
        isLoading: false,
        isAuthenticated: true,
        coupleAuth: authData,
      });
    } catch (error) {
      console.error('Authentication failed:', error);

      setAuthState({
        isLoading: false,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : 'Authentication failed',
      });

      // Clear invalid session data
      localStorage.removeItem('wedme_session_token');
      localStorage.removeItem('wedme_couple_id');

      // Redirect to login after a delay
      setTimeout(() => {
        router.push(redirectTo);
      }, 2000);
    }
  };

  const checkMobileRateLimit = async (
    coupleId: string,
    sessionToken: string,
  ) => {
    try {
      const response = await fetch('/api/auth/mobile-rate-limit', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coupleId,
          action: 'seating_access',
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Rate limit exceeded');
      }
    } catch (error) {
      throw new Error('Mobile rate limit check failed');
    }
  };

  const handleRetry = () => {
    checkAuthentication();
  };

  const handleLogin = () => {
    router.push(redirectTo);
  };

  // Loading state
  if (authState.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4">
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Verifying Access
            </h3>
            <p className="text-sm text-gray-600">
              Checking your seating permissions...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!authState.isAuthenticated && authState.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full space-y-4">
          <Alert variant="destructive" className="mb-4">
            <div className="space-y-2">
              <h4 className="font-semibold">Authentication Required</h4>
              <p className="text-sm">{authState.error}</p>
            </div>
          </Alert>

          <div className="space-y-3">
            <Button onClick={handleLogin} className="w-full" size="lg">
              Sign In to Continue
            </Button>

            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Try Again
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center mt-4">
            <p>Need help? Contact your wedding planner.</p>
          </div>
        </div>
      </div>
    );
  }

  // Authentication successful
  if (authState.isAuthenticated && authState.coupleAuth) {
    return (
      <div className="min-h-screen">
        {/* Session info for debugging (remove in production) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-green-50 border-b border-green-200 px-4 py-2">
            <div className="text-xs text-green-700">
              ✓ Authenticated: {authState.coupleAuth.coupleId} | Permissions:{' '}
              {authState.coupleAuth.permissions.join(', ')} | Expires:{' '}
              {new Date(authState.coupleAuth.expiresAt).toLocaleTimeString()}
            </div>
          </div>
        )}

        {children}
      </div>
    );
  }

  // Fallback - should not reach here
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <div className="text-lg font-semibold text-gray-900">
          Something went wrong
        </div>
        <Button onClick={handleRetry}>Retry</Button>
      </div>
    </div>
  );
};
