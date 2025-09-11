/**
 * Cookie Consent Banner Component
 * WS-149: GDPR-compliant cookie consent management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Settings, X } from 'lucide-react';

interface ConsentOptions {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  personalization: boolean;
}

interface ConsentBannerProps {
  onConsentUpdate?: (consents: ConsentOptions) => void;
}

export default function CookieConsentBanner({
  onConsentUpdate,
}: ConsentBannerProps) {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [consents, setConsents] = useState<ConsentOptions>({
    essential: true, // Always true, cannot be disabled
    analytics: false,
    marketing: false,
    personalization: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    checkExistingConsent();
  }, []);

  const checkExistingConsent = async () => {
    try {
      const response = await fetch('/api/gdpr/consent/current-user');
      if (response.ok) {
        const data = await response.json();
        if (!data.evidence) {
          // No consent recorded yet, show banner
          setShowBanner(true);
        } else {
          // Update local state with existing consents
          setConsents({
            essential: true,
            analytics: data.analytics || false,
            marketing: data.marketing || false,
            personalization: data.personalization || false,
          });
        }
      } else {
        // Not authenticated or error, show banner for anonymous users
        const storedConsent = localStorage.getItem('cookie_consent');
        if (!storedConsent) {
          setShowBanner(true);
        }
      }
    } catch (error) {
      console.error('Error checking consent:', error);
      setShowBanner(true);
    }
  };

  const handleAcceptAll = async () => {
    const allConsents: ConsentOptions = {
      essential: true,
      analytics: true,
      marketing: true,
      personalization: true,
    };
    await saveConsent(allConsents);
  };

  const handleRejectNonEssential = async () => {
    const minimalConsents: ConsentOptions = {
      essential: true,
      analytics: false,
      marketing: false,
      personalization: false,
    };
    await saveConsent(minimalConsents);
  };

  const handleSavePreferences = async () => {
    await saveConsent(consents);
  };

  const saveConsent = async (consentOptions: ConsentOptions) => {
    setLoading(true);
    try {
      // Save to local storage for anonymous users
      localStorage.setItem(
        'cookie_consent',
        JSON.stringify({
          ...consentOptions,
          timestamp: new Date().toISOString(),
        }),
      );

      // Try to save to database if authenticated
      const purposes = Object.entries(consentOptions)
        .filter(([purpose, given]) => purpose !== 'essential' && given)
        .map(([purpose]) => purpose);

      for (const purpose of purposes) {
        await fetch('/api/gdpr/consent/record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data_subject_id: crypto.randomUUID(), // Will be replaced with actual user ID if authenticated
            data_subject_type: 'guest',
            purpose,
            legal_basis: 'consent',
            consent_given: true,
            consent_method: 'explicit',
            consent_evidence: {
              ip_address: 'auto',
              timestamp: new Date().toISOString(),
              user_agent: navigator.userAgent,
              method_details: {
                banner_interaction: true,
                preferences_selected: consentOptions,
              },
            },
            data_categories: getCategoriesForPurpose(purpose),
          }),
        });
      }

      // Notify parent component
      if (onConsentUpdate) {
        onConsentUpdate(consentOptions);
      }

      setShowBanner(false);
      setShowDetails(false);
    } catch (error) {
      console.error('Error saving consent:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCategoriesForPurpose = (purpose: string): string[] => {
    const categories: Record<string, string[]> = {
      analytics: ['usage_patterns', 'device_info', 'performance_metrics'],
      marketing: ['email', 'preferences', 'engagement_history'],
      personalization: ['preferences', 'behavior', 'interests'],
    };
    return categories[purpose] || [];
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/20 backdrop-blur-sm">
      <Card
        className="max-w-6xl mx-auto p-6 bg-white shadow-xl"
        data-testid="cookie-consent-banner"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold">Your Privacy Matters</h2>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-gray-600 mb-6">
          We use cookies to enhance your experience on WedSync. You can choose
          which cookies you'd like to accept below. Essential cookies are always
          active as they're necessary for the platform to function properly.
        </p>

        {!showDetails ? (
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={handleAcceptAll}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Accept All
            </Button>
            <Button
              onClick={handleRejectNonEssential}
              disabled={loading}
              variant="outline"
            >
              Essential Only
            </Button>
            <Button
              onClick={() => setShowDetails(true)}
              disabled={loading}
              variant="ghost"
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage Preferences
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4">
              {/* Essential Cookies */}
              <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  checked={true}
                  disabled={true}
                  data-testid="consent-option-essential"
                />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Essential Cookies</h3>
                  <p className="text-sm text-gray-600">
                    Required for the website to function properly. These cookies
                    enable core functionality such as security, authentication,
                    and session management.
                  </p>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="flex items-start gap-3 p-4 bg-white border rounded-lg">
                <Checkbox
                  checked={consents.analytics}
                  onCheckedChange={(checked) =>
                    setConsents((prev) => ({
                      ...prev,
                      analytics: checked as boolean,
                    }))
                  }
                  data-testid="consent-option-analytics"
                />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Analytics Cookies</h3>
                  <p className="text-sm text-gray-600">
                    Help us understand how visitors interact with our website by
                    collecting and reporting information anonymously. This helps
                    us improve our services.
                  </p>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="flex items-start gap-3 p-4 bg-white border rounded-lg">
                <Checkbox
                  checked={consents.marketing}
                  onCheckedChange={(checked) =>
                    setConsents((prev) => ({
                      ...prev,
                      marketing: checked as boolean,
                    }))
                  }
                  data-testid="consent-option-marketing"
                />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Marketing Cookies</h3>
                  <p className="text-sm text-gray-600">
                    Used to deliver relevant advertisements and track the
                    effectiveness of our marketing campaigns. These help us show
                    you more relevant content.
                  </p>
                </div>
              </div>

              {/* Personalization Cookies */}
              <div className="flex items-start gap-3 p-4 bg-white border rounded-lg">
                <Checkbox
                  checked={consents.personalization}
                  onCheckedChange={(checked) =>
                    setConsents((prev) => ({
                      ...prev,
                      personalization: checked as boolean,
                    }))
                  }
                  data-testid="consent-option-personalization"
                />
                <div className="flex-1">
                  <h3 className="font-medium mb-1">Personalization Cookies</h3>
                  <p className="text-sm text-gray-600">
                    Allow us to remember your preferences and customize your
                    experience, such as your preferred language or region.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                onClick={handleSavePreferences}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="save-consent-preferences"
              >
                Save Preferences
              </Button>
              <Button
                onClick={() => setShowDetails(false)}
                disabled={loading}
                variant="outline"
              >
                Back
              </Button>
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t">
          <p className="text-xs text-gray-500">
            By using our website, you agree to our{' '}
            <a href="/privacy-policy" className="underline hover:text-gray-700">
              Privacy Policy
            </a>{' '}
            and{' '}
            <a href="/cookie-policy" className="underline hover:text-gray-700">
              Cookie Policy
            </a>
            . You can withdraw your consent at any time in your{' '}
            <a
              href="/privacy/manage-consent"
              className="underline hover:text-gray-700"
            >
              privacy settings
            </a>
            .
          </p>
        </div>

        {loading && (
          <div
            className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg"
            data-testid="consent-saved-confirmation"
          >
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm text-gray-600">
                Saving your preferences...
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
