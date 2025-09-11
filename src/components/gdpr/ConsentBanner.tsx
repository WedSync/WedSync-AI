'use client';

import * as React from 'react';
import { X, Shield, Settings, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ConsentType,
  ConsentStatus,
  ConsentBundle,
  GDPRLegalBasis,
} from '@/types/gdpr';
import {
  ConsentSettings,
  GDPRComplianceManager,
  DATA_PROCESSING_PURPOSES,
} from '@/lib/compliance/gdpr-compliance';

interface ConsentBannerProps {
  onAcceptAll?: () => void;
  onRejectAll?: () => void;
  onCustomize?: () => void;
  onClose?: () => void;
  className?: string;
  position?: 'top' | 'bottom';
  theme?: 'light' | 'dark';
  showLogo?: boolean;
}

interface ConsentBannerState {
  isVisible: boolean;
  isLoading: boolean;
  hasError: boolean;
  currentView: 'banner' | 'details' | 'success';
  selectedConsents: Record<string, boolean>;
  showPrivacyDetails: boolean;
}

export function ConsentBanner({
  onAcceptAll,
  onRejectAll,
  onCustomize,
  onClose,
  className,
  position = 'bottom',
  theme = 'light',
  showLogo = true,
}: ConsentBannerProps) {
  const [state, setState] = React.useState<ConsentBannerState>({
    isVisible: true,
    isLoading: false,
    hasError: false,
    currentView: 'banner',
    selectedConsents: {
      necessary: true, // Always true and disabled
      analytics: false,
      marketing: false,
      functional: false,
    },
    showPrivacyDetails: false,
  });

  // Check if consent is already given
  React.useEffect(() => {
    const hasValidConsent = GDPRComplianceManager.hasValidConsent();
    if (hasValidConsent) {
      setState((prev) => ({ ...prev, isVisible: false }));
    }
  }, []);

  const handleAcceptAll = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const settings: ConsentSettings = {
        necessary: true,
        analytics: true,
        marketing: true,
        functional: true,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      GDPRComplianceManager.setConsentSettings(settings);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentView: 'success',
        selectedConsents: {
          necessary: true,
          analytics: true,
          marketing: true,
          functional: true,
        },
      }));

      // Auto-hide after success
      setTimeout(() => {
        setState((prev) => ({ ...prev, isVisible: false }));
        onAcceptAll?.();
      }, 2000);
    } catch (error) {
      console.error('Error saving consent settings:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasError: true,
      }));
    }
  }, [onAcceptAll]);

  const handleRejectAll = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const settings: ConsentSettings = {
        necessary: true, // Necessary cookies cannot be rejected
        analytics: false,
        marketing: false,
        functional: false,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      GDPRComplianceManager.setConsentSettings(settings);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentView: 'success',
        selectedConsents: {
          necessary: true,
          analytics: false,
          marketing: false,
          functional: false,
        },
      }));

      setTimeout(() => {
        setState((prev) => ({ ...prev, isVisible: false }));
        onRejectAll?.();
      }, 2000);
    } catch (error) {
      console.error('Error saving consent settings:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasError: true,
      }));
    }
  }, [onRejectAll]);

  const handleCustomize = React.useCallback(() => {
    setState((prev) => ({ ...prev, currentView: 'details' }));
    onCustomize?.();
  }, [onCustomize]);

  const handleSaveCustom = React.useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      const settings: ConsentSettings = {
        necessary: true, // Always true
        analytics: state.selectedConsents.analytics,
        marketing: state.selectedConsents.marketing,
        functional: state.selectedConsents.functional,
        timestamp: new Date().toISOString(),
        version: '1.0',
      };

      GDPRComplianceManager.setConsentSettings(settings);

      setState((prev) => ({
        ...prev,
        isLoading: false,
        currentView: 'success',
      }));

      setTimeout(() => {
        setState((prev) => ({ ...prev, isVisible: false }));
      }, 2000);
    } catch (error) {
      console.error('Error saving consent settings:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasError: true,
      }));
    }
  }, [state.selectedConsents]);

  const handleConsentToggle = React.useCallback(
    (consentType: string, value: boolean) => {
      setState((prev) => ({
        ...prev,
        selectedConsents: {
          ...prev.selectedConsents,
          [consentType]: value,
        },
      }));
    },
    [],
  );

  const handleClose = React.useCallback(() => {
    setState((prev) => ({ ...prev, isVisible: false }));
    onClose?.();
  }, [onClose]);

  if (!state.isVisible) return null;

  const positionClasses = {
    top: 'top-4 left-4 right-4 md:top-6 md:left-6 md:right-6',
    bottom: 'bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-6',
  };

  const themeClasses = {
    light: 'bg-background border-border',
    dark: 'bg-gray-900 border-gray-700 text-white',
  };

  // Success View
  if (state.currentView === 'success') {
    return (
      <div
        className={cn('fixed z-50 max-w-md mx-auto', positionClasses[position])}
      >
        <Card
          className={cn(
            'shadow-lg border-2 border-green-200 bg-green-50',
            className,
          )}
        >
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <Shield className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-900">Preferences Saved</p>
                <p className="text-sm text-green-700">
                  Your privacy settings have been updated
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Detailed Consent View
  if (state.currentView === 'details') {
    return (
      <div
        className={cn(
          'fixed z-50 max-w-2xl mx-auto',
          positionClasses[position],
        )}
      >
        <Card
          className={cn('shadow-2xl border-2', themeClasses[theme], className)}
        >
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center space-x-3">
                {showLogo && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-semibold">Privacy Preferences</h3>
                  <p className="text-sm text-muted-foreground">
                    Choose which data processing you consent to
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  setState((prev) => ({ ...prev, currentView: 'banner' }))
                }
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 mb-6">
              {DATA_PROCESSING_PURPOSES.map((purpose) => (
                <div
                  key={purpose.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h4 className="font-medium">{purpose.name}</h4>
                      {purpose.required && (
                        <Badge variant="secondary" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {purpose.legalBasis === 'consent' && (
                        <Info className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {purpose.description}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      Legal basis:{' '}
                      <span className="capitalize">
                        {purpose.legalBasis.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {purpose.id === 'wedding_planning' ? (
                      <div className="w-11 h-6 bg-primary rounded-full flex items-center justify-end px-1 opacity-50">
                        <div className="w-5 h-5 bg-primary-foreground rounded-full" />
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          handleConsentToggle(
                            purpose.id === 'analytics'
                              ? 'analytics'
                              : purpose.id === 'marketing'
                                ? 'marketing'
                                : 'functional',
                            !state.selectedConsents[
                              purpose.id === 'analytics'
                                ? 'analytics'
                                : purpose.id === 'marketing'
                                  ? 'marketing'
                                  : 'functional'
                            ],
                          )
                        }
                        className={cn(
                          'w-11 h-6 rounded-full transition-colors duration-200 flex items-center px-1',
                          state.selectedConsents[
                            purpose.id === 'analytics'
                              ? 'analytics'
                              : purpose.id === 'marketing'
                                ? 'marketing'
                                : 'functional'
                          ]
                            ? 'bg-primary justify-end'
                            : 'bg-input justify-start',
                        )}
                        aria-label={`${
                          state.selectedConsents[
                            purpose.id === 'analytics'
                              ? 'analytics'
                              : purpose.id === 'marketing'
                                ? 'marketing'
                                : 'functional'
                          ]
                            ? 'Disable'
                            : 'Enable'
                        } ${purpose.name}`}
                      >
                        <div className="w-5 h-5 bg-background rounded-full shadow-sm transition-transform duration-200" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleSaveCustom}
                disabled={state.isLoading}
                className="flex-1"
              >
                {state.isLoading ? 'Saving...' : 'Save Preferences'}
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setState((prev) => ({ ...prev, currentView: 'banner' }))
                }
                className="flex-1"
              >
                Back
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main Banner View
  return (
    <div
      className={cn('fixed z-50 max-w-4xl mx-auto', positionClasses[position])}
    >
      <Card
        className={cn('shadow-2xl border-2', themeClasses[theme], className)}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {showLogo && (
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold">We value your privacy</h3>
                <p className="text-sm text-muted-foreground">
                  WedSync uses cookies and processes personal data to enhance
                  your wedding planning experience
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-6">
            <p className="text-sm text-muted-foreground mb-3">
              By clicking "Accept All", you consent to our use of cookies for
              analytics, marketing, and enhanced functionality. Essential
              cookies are always active.
            </p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                Essential
              </Badge>
              <Badge variant="outline" className="text-xs">
                Analytics
              </Badge>
              <Badge variant="outline" className="text-xs">
                Marketing
              </Badge>
              <Badge variant="outline" className="text-xs">
                Functional
              </Badge>
            </div>
          </div>

          {state.hasError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive">
                There was an error saving your preferences. Please try again.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleAcceptAll}
              disabled={state.isLoading}
              className="sm:flex-1"
            >
              {state.isLoading ? 'Saving...' : 'Accept All'}
            </Button>
            <Button
              variant="outline"
              onClick={handleRejectAll}
              disabled={state.isLoading}
              className="sm:flex-1"
            >
              Reject Non-Essential
            </Button>
            <Button
              variant="secondary"
              onClick={handleCustomize}
              className="sm:flex-1 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Customize
            </Button>
          </div>

          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-muted-foreground text-center">
              You can change your preferences at any time in{' '}
              <button
                onClick={handleCustomize}
                className="underline hover:no-underline"
              >
                Privacy Settings
              </button>
              . Read our{' '}
              <a
                href="/privacy-policy"
                className="underline hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                Privacy Policy
              </a>{' '}
              for more information.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
