/**
 * Outlook OAuth Authentication Flow Component
 * Microsoft OAuth2 authentication interface for wedding professionals
 *
 * Features:
 * - Microsoft branding and OAuth2 flow
 * - Calendar selection after authentication
 * - Error handling with user-friendly messages
 * - Loading states during OAuth process
 * - CSRF protection with state parameter
 */

'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/untitled-ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/untitled-ui/Card';
import { Badge } from '@/components/untitled-ui/Badge';
import {
  Loader2,
  Calendar,
  Shield,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { OutlookOAuthFlowProps, OutlookAuthState } from '@/types/outlook';
import { useOutlookSync } from '@/hooks/useOutlookSync';

export function OutlookOAuthFlow({
  onSuccess,
  onError,
  onCancel,
  className = '',
}: OutlookOAuthFlowProps) {
  const { authState, authenticate } = useOutlookSync();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authStep, setAuthStep] = useState<
    'initial' | 'authenticating' | 'selecting-calendars' | 'completed'
  >('initial');

  const handleAuthenticate = useCallback(async () => {
    try {
      setIsAuthenticating(true);
      setAuthStep('authenticating');

      const success = await authenticate();

      if (success) {
        setAuthStep('selecting-calendars');
        onSuccess?.(authState.userAccount!);
      } else {
        onError?.('Authentication failed. Please try again.');
        setAuthStep('initial');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Authentication failed';
      onError?.(message);
      setAuthStep('initial');
    } finally {
      setIsAuthenticating(false);
    }
  }, [authenticate, authState.userAccount, onSuccess, onError]);

  const handleCancel = useCallback(() => {
    setAuthStep('initial');
    setIsAuthenticating(false);
    onCancel?.();
  }, [onCancel]);

  // Authentication Steps Component
  const AuthSteps = () => (
    <div className="flex items-center justify-center space-x-4 mb-6">
      <div
        className={`flex items-center space-x-2 ${authStep === 'initial' || authStep === 'authenticating' ? 'text-primary-600' : 'text-gray-400'}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            authStep === 'authenticating'
              ? 'bg-primary-100 border-2 border-primary-600'
              : authStep === 'initial'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100'
          }`}
        >
          {authStep === 'authenticating' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            '1'
          )}
        </div>
        <span className="text-sm font-medium">Authenticate</span>
      </div>
      <div className="flex-1 h-0.5 bg-gray-200" />
      <div
        className={`flex items-center space-x-2 ${authStep === 'selecting-calendars' ? 'text-primary-600' : 'text-gray-400'}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            authStep === 'selecting-calendars'
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100'
          }`}
        >
          2
        </div>
        <span className="text-sm font-medium">Select Calendars</span>
      </div>
      <div className="flex-1 h-0.5 bg-gray-200" />
      <div
        className={`flex items-center space-x-2 ${authStep === 'completed' ? 'text-success-600' : 'text-gray-400'}`}
      >
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center ${
            authStep === 'completed'
              ? 'bg-success-600 text-white'
              : 'bg-gray-100'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
        </div>
        <span className="text-sm font-medium">Complete</span>
      </div>
    </div>
  );

  // Initial Authentication View
  if (authStep === 'initial' && !authState.isAuthenticated) {
    return (
      <Card className={`w-full max-w-lg mx-auto ${className}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className="text-blue-600"
              >
                <path
                  fill="currentColor"
                  d="M11.44 0v8.53H0v1.47h11.44V24h1.11V10h11.45V8.53H12.56V0z"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-2xl text-gray-900">
            Connect Your Outlook Calendar
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            Sync your wedding consultations, venue visits, and client meetings
            seamlessly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AuthSteps />

          {/* Benefits */}
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-start space-x-3">
              <Calendar className="w-5 h-5 text-primary-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">
                  Bidirectional Sync
                </h4>
                <p className="text-sm text-gray-600">
                  Changes in WedSync appear in Outlook and vice versa
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-primary-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">Secure Connection</h4>
                <p className="text-sm text-gray-600">
                  Your data is encrypted and never stored on our servers
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-primary-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-gray-900">
                  Wedding Event Types
                </h4>
                <p className="text-sm text-gray-600">
                  Automatically categorizes consultations, venues, and
                  ceremonies
                </p>
              </div>
            </div>
          </div>

          {/* Microsoft OAuth Button */}
          <div className="space-y-4">
            <Button
              onClick={handleAuthenticate}
              disabled={isAuthenticating}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              size="lg"
            >
              {isAuthenticating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Connecting to Microsoft...
                </>
              ) : (
                <>
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    className="mr-2"
                  >
                    <rect width="8" height="8" fill="#f25022" />
                    <rect x="10" width="8" height="8" fill="#7fba00" />
                    <rect y="10" width="8" height="8" fill="#00a4ef" />
                    <rect x="10" y="10" width="8" height="8" fill="#ffb900" />
                  </svg>
                  Sign in with Microsoft
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              By connecting, you agree to share calendar data with WedSync.{' '}
              <a href="/privacy" className="text-primary-600 hover:underline">
                Privacy Policy
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calendar Selection View
  if (authStep === 'selecting-calendars' && authState.isAuthenticated) {
    return (
      <Card className={`w-full max-w-lg mx-auto ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle2 className="w-5 h-5 text-success-600 mr-2" />
            Connected to Microsoft
          </CardTitle>
          <CardDescription>
            Welcome {authState.userAccount?.name}! Select which calendars to
            sync.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AuthSteps />

          {/* Account Info */}
          <div className="bg-success-50 border border-success-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-success-600 mt-0.5" />
              <div>
                <p className="font-medium text-success-900">
                  Successfully Connected
                </p>
                <p className="text-sm text-success-700">
                  {authState.userAccount?.username}
                </p>
              </div>
            </div>
          </div>

          {/* Calendar Selection */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">
              Select Calendars to Sync
            </h4>
            <div className="space-y-2">
              {/* Mock calendar options - in real implementation, fetch from Microsoft Graph */}
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-primary-600"
                  defaultChecked
                />
                <Calendar className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Calendar</p>
                  <p className="text-sm text-gray-600">Your primary calendar</p>
                </div>
                <Badge variant="secondary">Primary</Badge>
              </label>
              <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  className="form-checkbox text-primary-600"
                />
                <Calendar className="w-4 h-4 text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Work</p>
                  <p className="text-sm text-gray-600">Business appointments</p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3">
            <Button onClick={() => setAuthStep('completed')} className="flex-1">
              Complete Setup
            </Button>
            <Button variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error State
  if (authState.error) {
    return (
      <Card className={`w-full max-w-lg mx-auto ${className}`}>
        <CardContent className="text-center py-8">
          <XCircle className="w-12 h-12 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Connection Failed
          </h3>
          <p className="text-gray-600 mb-6">{authState.error}</p>
          <div className="space-y-3">
            <Button onClick={handleAuthenticate} className="w-full">
              Try Again
            </Button>
            <Button variant="outline" onClick={handleCancel} className="w-full">
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Loading State
  return (
    <Card className={`w-full max-w-lg mx-auto ${className}`}>
      <CardContent className="text-center py-8">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Connecting to Microsoft Outlook...</p>
      </CardContent>
    </Card>
  );
}
