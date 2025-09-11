'use client';

import React, { useState, useCallback } from 'react';
import {
  Shield,
  Check,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  X,
  Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Types for OAuth flow
export interface OAuthProvider {
  id: 'google' | 'outlook' | 'apple';
  name: string;
  displayName: string;
  authUrl: string;
  icon: React.ReactNode;
  permissions: OAuthPermission[];
  description: string;
  privacyUrl: string;
  termsUrl: string;
}

export interface OAuthPermission {
  id: string;
  name: string;
  description: string;
  required: boolean;
  risk: 'low' | 'medium' | 'high';
}

export interface AuthFlowStep {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  current: boolean;
  error?: string;
}

interface CalendarAuthFlowProps {
  provider: OAuthProvider;
  onConnect: (provider: OAuthProvider, permissions: string[]) => Promise<void>;
  onCancel: () => void;
  onBack?: () => void;
  isOpen: boolean;
  className?: string;
}

export function CalendarAuthFlow({
  provider,
  onConnect,
  onCancel,
  onBack,
  isOpen,
  className,
}: CalendarAuthFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showPrivacyDetails, setShowPrivacyDetails] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: AuthFlowStep[] = [
    {
      id: 'permissions',
      name: 'Review Permissions',
      description: 'Choose what WedSync can access',
      completed: false,
      current: currentStep === 0,
    },
    {
      id: 'privacy',
      name: 'Privacy & Terms',
      description: 'Review privacy policy and terms',
      completed: false,
      current: currentStep === 1,
    },
    {
      id: 'connect',
      name: 'Connect Account',
      description: 'Authorize with your calendar provider',
      completed: false,
      current: currentStep === 2,
    },
  ];

  // Initialize with required permissions
  React.useEffect(() => {
    const requiredPermissions = provider.permissions
      .filter((p) => p.required)
      .map((p) => p.id);
    setSelectedPermissions(requiredPermissions);
  }, [provider]);

  const handlePermissionToggle = useCallback(
    (permissionId: string) => {
      const permission = provider.permissions.find(
        (p) => p.id === permissionId,
      );
      if (permission?.required) return; // Can't toggle required permissions

      setSelectedPermissions((prev) =>
        prev.includes(permissionId)
          ? prev.filter((id) => id !== permissionId)
          : [...prev, permissionId],
      );
    },
    [provider.permissions],
  );

  const handleNextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      setError(null);
    }
  }, [currentStep, steps.length]);

  const handlePreviousStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      setError(null);
    }
  }, [currentStep]);

  const handleConnect = useCallback(async () => {
    if (!acceptedTerms) {
      setError('You must accept the terms and privacy policy to continue.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await onConnect(provider, selectedPermissions);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to connect calendar',
      );
    } finally {
      setIsConnecting(false);
    }
  }, [provider, selectedPermissions, acceptedTerms, onConnect]);

  const getRiskColor = (risk: OAuthPermission['risk']) => {
    switch (risk) {
      case 'low':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20';
      case 'medium':
        return 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/20';
      case 'high':
        return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div
        className={cn(
          'bg-background rounded-lg border border-border shadow-lg',
          'w-full max-w-2xl max-h-[90vh] overflow-y-auto',
          className,
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            {provider.icon}
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Connect {provider.displayName}
              </h2>
              <p className="text-sm text-muted-foreground">
                {provider.description}
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors',
                    step.completed
                      ? 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400'
                      : step.current
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-muted text-muted-foreground',
                  )}
                >
                  {step.completed ? <Check className="h-4 w-4" /> : index + 1}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-px w-16 mx-3 transition-colors',
                      step.completed
                        ? 'bg-green-200 dark:bg-green-800'
                        : 'bg-border',
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="mt-3">
            <h3 className="font-medium text-foreground">
              {steps[currentStep].name}
            </h3>
            <p className="text-sm text-muted-foreground">
              {steps[currentStep].description}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {/* Step 1: Permissions */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">
                      Why does WedSync need these permissions?
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-200 mt-1">
                      We only request the minimum permissions needed to sync
                      your wedding timeline with your calendar. You can modify
                      these at any time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-foreground">
                  Calendar Permissions
                </h4>
                {provider.permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className={cn(
                      'border border-border rounded-lg p-4 transition-colors',
                      selectedPermissions.includes(permission.id)
                        ? 'bg-accent/10 border-accent/30'
                        : 'bg-background',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        disabled={permission.required}
                        className={cn(
                          'mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent/40',
                          permission.required &&
                            'opacity-50 cursor-not-allowed',
                        )}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor={permission.id}
                            className="font-medium text-foreground cursor-pointer"
                          >
                            {permission.name}
                          </label>
                          <span
                            className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              getRiskColor(permission.risk),
                            )}
                          >
                            {permission.risk} risk
                          </span>
                          {permission.required && (
                            <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full text-xs font-medium">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-accent mt-0.5" />
                  <div>
                    <h4 className="font-medium text-foreground">
                      Your Data is Protected
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      All calendar data is encrypted and only used for wedding
                      timeline synchronization. We never store your personal
                      calendar events permanently.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Privacy & Terms */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium text-foreground">
                  Privacy & Data Usage
                </h4>

                <div className="bg-elevated border border-border rounded-lg p-4">
                  <button
                    onClick={() => setShowPrivacyDetails(!showPrivacyDetails)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <span className="font-medium text-foreground">
                      How WedSync uses your calendar data
                    </span>
                    {showPrivacyDetails ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>

                  {showPrivacyDetails && (
                    <div className="mt-3 pt-3 border-t border-border space-y-3 text-sm text-muted-foreground">
                      <p>
                        • We only read calendar availability to prevent
                        double-bookings
                      </p>
                      <p>
                        • Wedding timeline events are synced to your connected
                        calendars
                      </p>
                      <p>
                        • No personal events outside wedding activities are
                        accessed
                      </p>
                      <p>• All data is encrypted in transit and at rest</p>
                      <p>
                        • You can revoke access and delete all data at any time
                      </p>
                      <p>• Data is never sold or shared with third parties</p>
                    </div>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="accept-terms"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-border text-accent focus:ring-accent/40"
                  />
                  <label
                    htmlFor="accept-terms"
                    className="text-sm text-foreground cursor-pointer"
                  >
                    I agree to WedSync's{' '}
                    <a
                      href={provider.termsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-1"
                    >
                      Terms of Service
                      <ExternalLink className="h-3 w-3" />
                    </a>{' '}
                    and{' '}
                    <a
                      href={provider.privacyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:underline inline-flex items-center gap-1"
                    >
                      Privacy Policy
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </label>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900 dark:text-amber-100">
                      Important: Wedding Day Access
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-200 mt-1">
                      This integration allows WedSync to manage your calendar on
                      wedding days. This ensures your timeline stays
                      synchronized if changes are made during the event.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Connect */}
          {currentStep === 2 && (
            <div className="space-y-6 text-center">
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center">
                  <Calendar className="h-8 w-8 text-accent" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-2">
                    Ready to Connect {provider.displayName}
                  </h4>
                  <p className="text-muted-foreground">
                    Clicking "Connect Now" will open {provider.displayName} to
                    authorize WedSync. You'll be redirected back here once
                    connected.
                  </p>
                </div>
              </div>

              <div className="bg-elevated border border-border rounded-lg p-4 text-left">
                <h5 className="font-medium text-foreground mb-3">
                  Selected Permissions:
                </h5>
                <div className="space-y-2">
                  {selectedPermissions.map((permissionId) => {
                    const permission = provider.permissions.find(
                      (p) => p.id === permissionId,
                    );
                    if (!permission) return null;
                    return (
                      <div
                        key={permissionId}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Check className="h-4 w-4 text-green-500" />
                        <span className="text-foreground">
                          {permission.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {error}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <div>
            {currentStep > 0 && (
              <button
                onClick={handlePreviousStep}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
            )}
            {currentStep === 0 && onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Dashboard
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium border border-border rounded-md hover:bg-muted transition-colors"
            >
              Cancel
            </button>

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNextStep}
                disabled={currentStep === 1 && !acceptedTerms}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-accent text-accent-foreground hover:bg-accent/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={handleConnect}
                disabled={isConnecting || !acceptedTerms}
                className={cn(
                  'flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-md transition-colors',
                  'bg-accent text-accent-foreground hover:bg-accent/90',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                )}
              >
                {isConnecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4" />
                    Connect Now
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Predefined OAuth providers configuration
export const OAUTH_PROVIDERS: Record<string, OAuthProvider> = {
  google: {
    id: 'google',
    name: 'google',
    displayName: 'Google Calendar',
    authUrl: '/api/auth/google/calendar',
    icon: <Calendar className="h-6 w-6 text-blue-600" />,
    description: 'Sync with Google Calendar and Google Workspace',
    privacyUrl: 'https://policies.google.com/privacy',
    termsUrl: 'https://policies.google.com/terms',
    permissions: [
      {
        id: 'read_calendar',
        name: 'Read Calendar Events',
        description:
          'View your existing calendar events to prevent scheduling conflicts',
        required: true,
        risk: 'low',
      },
      {
        id: 'write_calendar',
        name: 'Create Calendar Events',
        description: 'Create new events for your wedding timeline',
        required: true,
        risk: 'medium',
      },
      {
        id: 'manage_calendar',
        name: 'Manage Calendar Events',
        description: 'Update and delete wedding-related calendar events',
        required: false,
        risk: 'medium',
      },
    ],
  },
  outlook: {
    id: 'outlook',
    name: 'outlook',
    displayName: 'Microsoft Outlook',
    authUrl: '/api/auth/microsoft/calendar',
    icon: <Calendar className="h-6 w-6 text-blue-700" />,
    description: 'Sync with Outlook and Microsoft 365 calendars',
    privacyUrl: 'https://privacy.microsoft.com/privacystatement',
    termsUrl: 'https://www.microsoft.com/servicesagreement',
    permissions: [
      {
        id: 'read_calendar',
        name: 'Read Calendar Events',
        description:
          'View your existing calendar events to prevent scheduling conflicts',
        required: true,
        risk: 'low',
      },
      {
        id: 'write_calendar',
        name: 'Create Calendar Events',
        description: 'Create new events for your wedding timeline',
        required: true,
        risk: 'medium',
      },
      {
        id: 'manage_calendar',
        name: 'Manage Calendar Events',
        description: 'Update and delete wedding-related calendar events',
        required: false,
        risk: 'medium',
      },
    ],
  },
  apple: {
    id: 'apple',
    name: 'apple',
    displayName: 'Apple Calendar',
    authUrl: '/api/auth/apple/calendar',
    icon: <Calendar className="h-6 w-6 text-gray-700" />,
    description: 'Sync with Apple Calendar via CalDAV',
    privacyUrl: 'https://www.apple.com/privacy/',
    termsUrl: 'https://www.apple.com/legal/internet-services/terms/site.html',
    permissions: [
      {
        id: 'read_calendar',
        name: 'Read Calendar Events',
        description:
          'View your existing calendar events to prevent scheduling conflicts',
        required: true,
        risk: 'low',
      },
      {
        id: 'write_calendar',
        name: 'Create Calendar Events',
        description: 'Create new events for your wedding timeline via CalDAV',
        required: true,
        risk: 'medium',
      },
    ],
  },
};

export default CalendarAuthFlow;
