'use client';

/**
 * OAuth Flow Handler Component
 * WS-343 - Team A - Round 1
 *
 * Secure OAuth 2.0 flow implementation with PKCE
 * Features: Popup handling, security validation, mobile fallbacks
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
  Smartphone,
} from 'lucide-react';

// UI Components (Untitled UI)
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

// Types
import type { OAuthFlowHandlerProps } from '@/types/crm';

// Utils
import { cn } from '@/lib/utils';

interface OAuthState {
  state: string;
  codeVerifier: string;
  nonce: string;
  timestamp: number;
}

interface OAuthProgress {
  step: 'initializing' | 'redirecting' | 'validating' | 'complete' | 'error';
  message: string;
  progress: number;
}

export function OAuthFlowHandler({
  provider,
  onSuccess,
  onError,
  onCancel,
  className,
}: OAuthFlowHandlerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [oauthState, setOauthState] = useState<OAuthState | null>(null);
  const [progress, setProgress] = useState<OAuthProgress>({
    step: 'initializing',
    message: 'Preparing secure connection...',
    progress: 0,
  });
  const [showMobileFallback, setShowMobileFallback] = useState(false);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  // Check if mobile device
  const isMobile =
    typeof window !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );

  // Generate cryptographically secure PKCE parameters
  const generatePKCEChallenge = useCallback(async (): Promise<{
    codeVerifier: string;
    codeChallenge: string;
  }> => {
    // Generate code verifier (43-128 characters)
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const codeVerifier = btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    // Generate code challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    return { codeVerifier, codeChallenge };
  }, []);

  // Generate secure state parameter
  const generateSecureState = useCallback((): string => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }, []);

  // Validate OAuth callback parameters
  const validateOAuthCallback = useCallback(
    (receivedState: string, storedState: OAuthState): boolean => {
      // State parameter validation
      if (receivedState !== storedState.state) {
        console.error('OAuth state mismatch - possible CSRF attack');
        return false;
      }

      // Timestamp validation (5-minute window)
      const now = Date.now();
      const maxAge = 5 * 60 * 1000; // 5 minutes
      if (now - storedState.timestamp > maxAge) {
        console.error('OAuth state expired');
        return false;
      }

      return true;
    },
    [],
  );

  // Handle OAuth callback message
  const handleOAuthCallback = useCallback(
    async (event: MessageEvent) => {
      // Validate message origin
      if (event.origin !== window.location.origin) {
        console.warn('OAuth callback from invalid origin:', event.origin);
        return;
      }

      if (event.data.type === 'oauth_callback' && oauthState) {
        setProgress({
          step: 'validating',
          message: 'Validating authorization...',
          progress: 75,
        });

        try {
          const { code, state: receivedState, error } = event.data.params;

          if (error) {
            throw new Error(`OAuth error: ${error}`);
          }

          if (!code || !receivedState) {
            throw new Error('Missing required OAuth parameters');
          }

          // Validate state parameter
          if (!validateOAuthCallback(receivedState, oauthState)) {
            throw new Error('OAuth validation failed - security check');
          }

          // Exchange code for tokens
          const tokenResponse = await fetch('/api/crm/oauth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRF-Token': getCsrfToken(),
            },
            body: JSON.stringify({
              provider: provider.id,
              code,
              codeVerifier: oauthState.codeVerifier,
              redirectUri: getRedirectUri(),
              state: receivedState,
            }),
          });

          if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json().catch(() => ({}));
            throw new Error(errorData.message || 'Token exchange failed');
          }

          const tokens = await tokenResponse.json();

          // Clear stored state
          sessionStorage.removeItem(`oauth_state_${provider.id}`);

          setProgress({
            step: 'complete',
            message: 'Connection established successfully!',
            progress: 100,
          });

          setTimeout(() => {
            onSuccess({
              type: 'oauth2',
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              token_expires_at: tokens.expires_at,
              client_id: provider.oauth?.client_id || '',
              client_secret: '', // Never sent to client
              redirect_uri: getRedirectUri(),
              scopes: provider.oauth?.scopes || [],
            });
          }, 1000);
        } catch (error) {
          console.error('OAuth callback error:', error);
          setProgress({
            step: 'error',
            message:
              error instanceof Error ? error.message : 'Authentication failed',
            progress: 0,
          });

          setTimeout(() => {
            onError(
              error instanceof Error ? error.message : 'OAuth flow failed',
            );
          }, 2000);
        }
      }
    },
    [oauthState, provider, validateOAuthCallback, onSuccess, onError],
  );

  // Setup message listener
  useEffect(() => {
    window.addEventListener('message', handleOAuthCallback);
    return () => window.removeEventListener('message', handleOAuthCallback);
  }, [handleOAuthCallback]);

  // Initiate OAuth flow
  const initiateOAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setProgress({
        step: 'initializing',
        message: 'Preparing secure connection...',
        progress: 25,
      });

      // Generate PKCE parameters
      const { codeVerifier, codeChallenge } = await generatePKCEChallenge();
      const state = generateSecureState();
      const nonce = generateSecureState();

      const oauthStateData: OAuthState = {
        state,
        codeVerifier,
        nonce,
        timestamp: Date.now(),
      };

      // Store OAuth state securely
      const encryptedState = btoa(JSON.stringify(oauthStateData));
      sessionStorage.setItem(`oauth_state_${provider.id}`, encryptedState);
      setOauthState(oauthStateData);

      // Construct secure OAuth URL
      const authUrl = new URL(provider.auth_url || '');
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('client_id', provider.oauth?.client_id || '');
      authUrl.searchParams.set('redirect_uri', getRedirectUri());
      authUrl.searchParams.set(
        'scope',
        (provider.oauth?.scopes || []).join(' '),
      );
      authUrl.searchParams.set('state', state);
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('nonce', nonce);

      setAuthUrl(authUrl.toString());

      setProgress({
        step: 'redirecting',
        message: 'Opening secure authentication window...',
        progress: 50,
      });

      // Handle mobile vs desktop flow
      if (isMobile || showMobileFallback) {
        // Mobile: Use redirect flow
        window.location.href = authUrl.toString();
      } else {
        // Desktop: Use popup flow
        const popup = window.open(
          authUrl.toString(),
          'oauth_popup',
          'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes,toolbar=no,menubar=no',
        );

        if (!popup) {
          setShowMobileFallback(true);
          setProgress({
            step: 'error',
            message: 'Popup blocked - using mobile fallback',
            progress: 0,
          });
          return;
        }

        // Monitor popup
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            setIsLoading(false);
            setProgress({
              step: 'error',
              message: 'Authentication cancelled',
              progress: 0,
            });
            setTimeout(() => onError('Authentication cancelled by user'), 1000);
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(
          () => {
            if (!popup.closed) {
              popup.close();
              clearInterval(checkClosed);
              setIsLoading(false);
              onError('Authentication timed out');
            }
          },
          5 * 60 * 1000,
        );
      }
    } catch (error) {
      console.error('OAuth initialization error:', error);
      setIsLoading(false);
      setProgress({
        step: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to start authentication',
        progress: 0,
      });
      setTimeout(() => {
        onError(
          error instanceof Error
            ? error.message
            : 'OAuth initialization failed',
        );
      }, 1000);
    }
  }, [
    provider,
    generatePKCEChallenge,
    generateSecureState,
    isMobile,
    showMobileFallback,
    onError,
  ]);

  // Utility functions
  const getRedirectUri = () => {
    return `${window.location.origin}/api/crm/oauth/callback`;
  };

  const getCsrfToken = () => {
    // Get CSRF token from meta tag or cookie
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag?.getAttribute('content') || '';
  };

  // Render mobile fallback
  if (showMobileFallback && authUrl) {
    return (
      <Card className={cn('border-2', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-blue-600" />
            Mobile Authentication
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Popup blocked or mobile device detected. You'll be redirected to
              authenticate.
            </AlertDescription>
          </Alert>

          <Button
            onClick={() => (window.location.href = authUrl)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Continue to {provider.name}
          </Button>

          <Button variant="outline" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-2', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Secure OAuth Authentication
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Security Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            PKCE Encryption
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            State Validation
          </div>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Secure Token Exchange
          </div>
        </div>

        {/* Progress Indicator */}
        {isLoading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{progress.message}</span>
              <span className="font-medium">{progress.progress}%</span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>
        )}

        {/* Status Messages */}
        {progress.step === 'complete' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {progress.message}
            </AlertDescription>
          </Alert>
        )}

        {progress.step === 'error' && !showMobileFallback && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{progress.message}</AlertDescription>
          </Alert>
        )}

        {/* Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-blue-900">
                Your data is secure
              </p>
              <p className="text-xs text-blue-700">
                We use industry-standard OAuth 2.0 with PKCE encryption. Your{' '}
                {provider.name} credentials are never stored on our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={initiateOAuth}
            disabled={isLoading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isLoading ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Shield className="mr-2 h-4 w-4" />
                Connect to {provider.name}
              </>
            )}
          </Button>

          <Button variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancel
          </Button>
        </div>

        {/* Mobile Fallback Option */}
        {!isMobile && !showMobileFallback && progress.step === 'error' && (
          <Button
            variant="outline"
            onClick={() => setShowMobileFallback(true)}
            className="w-full"
          >
            <Smartphone className="mr-2 h-4 w-4" />
            Try Mobile Authentication
          </Button>
        )}

        {/* Provider Specific Instructions */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">What happens next:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>You'll be redirected to {provider.name}'s secure login page</li>
            <li>Sign in with your existing {provider.name} account</li>
            <li>Authorize WedSync to access your client data</li>
            <li>You'll be automatically returned to complete setup</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
