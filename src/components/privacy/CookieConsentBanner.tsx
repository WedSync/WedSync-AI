'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Cookie, X, Settings, Shield, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  getConsentManager,
  type ConsentSettings,
} from '@/lib/privacy/consent-manager';
import { analytics } from '@/lib/analytics/providers';

interface ConsentPreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  advertising: boolean;
  personalization: boolean;
}

export default function CookieConsentBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false,
    advertising: false,
    personalization: false,
  });
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeConsent = async () => {
      try {
        // Initialize analytics with no consent initially
        await analytics.initialize({
          posthog: {
            apiKey: process.env.NEXT_PUBLIC_POSTHOG_KEY || '',
            apiHost:
              process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
          },
          googleAnalytics: {
            measurementId: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '',
          },
          mixpanel: {
            projectToken: process.env.NEXT_PUBLIC_MIXPANEL_TOKEN || '',
          },
        });

        // Check if user has already given consent
        const hasStoredConsent = localStorage.getItem('privacy-consent-v2');

        if (!hasStoredConsent) {
          // Show banner for new users after delay
          setTimeout(() => setShowBanner(true), 1000);
        } else {
          // Load existing preferences from localStorage
          try {
            const stored = JSON.parse(hasStoredConsent);
            if (stored.preferences) {
              setPreferences(stored.preferences);
              // Apply consent to analytics providers
              await getConsentManager().applyConsentToProviders();
            } else {
              // Invalid stored data, show banner
              setTimeout(() => setShowBanner(true), 1000);
            }
          } catch (parseError) {
            console.warn('Invalid stored consent data, showing banner');
            localStorage.removeItem('privacy-consent-v2'); // Clear invalid data
            setTimeout(() => setShowBanner(true), 1000);
          }
        }

        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize consent management:', error);
        setInitialized(true);
      }
    };

    initializeConsent();
  }, []);

  const savePreferences = async (prefs: ConsentPreferences) => {
    if (!initialized) return;

    setSaving(true);

    try {
      // First, ensure consent is stored locally immediately
      const consentData = {
        timestamp: new Date().toISOString(),
        preferences: prefs,
        version: '2.0',
      };
      localStorage.setItem('privacy-consent-v2', JSON.stringify(consentData));

      // Update local state
      setPreferences(prefs);

      // Try to update consent through the consent manager (non-blocking)
      try {
        await getConsentManager().updateConsent(prefs as ConsentSettings, 'banner');
      } catch (managerError) {
        console.warn('Consent manager update failed:', managerError);
        // Continue - local storage is sufficient
      }

      // Try to track consent events (non-blocking)
      try {
        analytics.trackEvent('consent_updated', {
          analytics_granted: prefs.analytics,
          marketing_granted: prefs.marketing,
          functional_granted: prefs.functional,
          advertising_granted: prefs.advertising,
          personalization_granted: prefs.personalization,
          consent_method: 'cookie_banner',
        });
      } catch (analyticsError) {
        console.warn('Analytics tracking failed:', analyticsError);
        // Continue - consent is still saved
      }

      // Save additional consent data to API
      try {
        await fetch('/api/privacy/consent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            preferences: prefs,
            source: 'cookie_banner',
            timestamp: new Date().toISOString(),
            consents: [
              {
                consentType: 'essential_cookies',
                isGranted: prefs.essential,
                legalBasis: 'legitimate_interests',
                purpose:
                  'Required for basic website functionality and security',
                processingPurpose: 'Essential website operations',
              },
              {
                consentType: 'functional_cookies',
                isGranted: prefs.functional,
                legalBasis: 'consent',
                purpose:
                  'Remember your preferences and enhance personalization',
                processingPurpose: 'User experience optimization',
                explicitConsent: true,
              },
              {
                consentType: 'analytics_cookies',
                isGranted: prefs.analytics,
                legalBasis: 'consent',
                purpose:
                  'Help us understand how you use WedSync to improve our services',
                processingPurpose: 'Service improvement and analytics',
                explicitConsent: true,
              },
              {
                consentType: 'marketing_cookies',
                isGranted: prefs.marketing,
                legalBasis: 'consent',
                purpose:
                  'Show relevant ads and measure marketing effectiveness',
                processingPurpose: 'Marketing and advertising',
                explicitConsent: true,
              },
              {
                consentType: 'advertising_cookies',
                isGranted: prefs.advertising,
                legalBasis: 'consent',
                purpose: 'Deliver personalized advertisements',
                processingPurpose: 'Targeted advertising',
                explicitConsent: true,
              },
              {
                consentType: 'personalization_cookies',
                isGranted: prefs.personalization,
                legalBasis: 'consent',
                purpose: 'Customize content based on your preferences',
                processingPurpose: 'Content personalization',
                explicitConsent: true,
              },
            ],
          }),
        });
      } catch (error) {
        console.warn('Failed to sync consent to backend:', error);
        // Continue - local consent is still valid
      }
    } catch (error) {
      console.error('Failed to save consent preferences:', error);
      analytics.trackEvent('consent_error', {
        error_type: 'save_failure',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSaving(false);
      setShowBanner(false);
      setShowSettings(false);
    }
  };

  const acceptAll = () => {
    const allAccepted = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true,
      advertising: true,
      personalization: true,
    };

    // Try to track analytics event (non-blocking)
    try {
      analytics.trackEvent('consent_accept_all', {
        timestamp: new Date().toISOString(),
        consent_method: 'accept_all_button',
      });
    } catch (error) {
      console.warn('Failed to track consent_accept_all event:', error);
    }

    setPreferences(allAccepted);
    savePreferences(allAccepted);
  };

  const acceptEssential = () => {
    const essentialOnly = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false,
      advertising: false,
      personalization: false,
    };

    // Try to track analytics event (non-blocking)
    try {
      analytics.trackEvent('consent_essential_only', {
        timestamp: new Date().toISOString(),
        consent_method: 'essential_only_button',
      });
    } catch (error) {
      console.warn('Failed to track consent_essential_only event:', error);
    }

    setPreferences(essentialOnly);
    savePreferences(essentialOnly);
  };

  const togglePreference = (key: keyof ConsentPreferences) => {
    if (key === 'essential') return; // Can't disable essential cookies
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 100 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
        >
          <div className="mx-auto max-w-7xl">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {!showSettings ? (
                // Main Banner
                <div className="p-6 md:p-8">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-full">
                        <Cookie className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">
                          We value your privacy
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          We use cookies to enhance your wedding planning
                          experience
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBanner(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Close cookie banner"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <p className="text-sm text-gray-700 mb-6">
                    We use cookies and similar technologies to personalize your
                    experience, analyze site traffic, and provide social media
                    features. Some cookies are essential for the site to
                    function, while others help us understand how you use
                    WedSync to improve our services.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button onClick={acceptAll} className="flex-1 sm:flex-none">
                      Accept All Cookies
                    </Button>
                    <Button
                      onClick={acceptEssential}
                      variant="outline"
                      className="flex-1 sm:flex-none"
                    >
                      Essential Only
                    </Button>
                    <Button
                      onClick={() => setShowSettings(!showSettings)}
                      variant="ghost"
                      className="flex-1 sm:flex-none"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Preferences
                    </Button>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between text-xs">
                    <div className="flex gap-4">
                      <Link
                        href="/privacy"
                        className="text-gray-600 hover:text-primary transition-colors underline"
                      >
                        Privacy Policy
                      </Link>
                      <Link
                        href="/cookies"
                        className="text-gray-600 hover:text-primary transition-colors underline"
                      >
                        Cookie Policy
                      </Link>
                    </div>
                    <div className="flex items-center gap-1 text-gray-700">
                      <Shield className="h-3 w-3 text-green-600" />
                      <span className="font-medium">GDPR & CCPA Compliant</span>
                    </div>
                  </div>
                </div>
              ) : (
                // Settings Panel
                <div className="p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">
                      Cookie Preferences
                    </h3>
                    <button
                      onClick={() => setShowSettings(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                      aria-label="Back to main banner"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>

                  <div className="space-y-4 mb-6">
                    {/* Essential Cookies */}
                    <div className="flex items-start justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">Essential Cookies</h4>
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Always Active
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Required for the website to function. Include
                          authentication, security, and basic features.
                        </p>
                      </div>
                      <div className="ml-4">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                    </div>

                    {/* Functional Cookies */}
                    <div className="flex items-start justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">Functional Cookies</h4>
                        <p className="text-sm text-muted-foreground">
                          Remember your preferences, language settings, and
                          enhance personalization.
                        </p>
                      </div>
                      <button
                        onClick={() => togglePreference('functional')}
                        className={cn(
                          'ml-4 w-12 h-6 rounded-full transition-colors relative',
                          preferences.functional ? 'bg-primary' : 'bg-gray-300',
                        )}
                        aria-label="Toggle functional cookies"
                      >
                        <span
                          className={cn(
                            'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                            preferences.functional && 'translate-x-6',
                          )}
                        />
                      </button>
                    </div>

                    {/* Analytics Cookies */}
                    <div className="flex items-start justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">Analytics Cookies</h4>
                        <p className="text-sm text-muted-foreground">
                          Help us understand how you use WedSync to improve our
                          services.
                        </p>
                      </div>
                      <button
                        onClick={() => togglePreference('analytics')}
                        className={cn(
                          'ml-4 w-12 h-6 rounded-full transition-colors relative',
                          preferences.analytics ? 'bg-primary' : 'bg-gray-300',
                        )}
                        aria-label="Toggle analytics cookies"
                      >
                        <span
                          className={cn(
                            'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                            preferences.analytics && 'translate-x-6',
                          )}
                        />
                      </button>
                    </div>

                    {/* Marketing Cookies */}
                    <div className="flex items-start justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">Marketing Cookies</h4>
                        <p className="text-sm text-muted-foreground">
                          Used to show relevant ads and measure marketing
                          effectiveness.
                        </p>
                      </div>
                      <button
                        onClick={() => togglePreference('marketing')}
                        className={cn(
                          'ml-4 w-12 h-6 rounded-full transition-colors relative',
                          preferences.marketing ? 'bg-primary' : 'bg-gray-300',
                        )}
                        aria-label="Toggle marketing cookies"
                      >
                        <span
                          className={cn(
                            'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                            preferences.marketing && 'translate-x-6',
                          )}
                        />
                      </button>
                    </div>

                    {/* Advertising Cookies */}
                    <div className="flex items-start justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">
                          Advertising Cookies
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Enable personalized advertising based on your wedding
                          preferences.
                        </p>
                      </div>
                      <button
                        onClick={() => togglePreference('advertising')}
                        className={cn(
                          'ml-4 w-12 h-6 rounded-full transition-colors relative',
                          preferences.advertising
                            ? 'bg-primary'
                            : 'bg-gray-300',
                        )}
                        aria-label="Toggle advertising cookies"
                      >
                        <span
                          className={cn(
                            'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                            preferences.advertising && 'translate-x-6',
                          )}
                        />
                      </button>
                    </div>

                    {/* Personalization Cookies */}
                    <div className="flex items-start justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <h4 className="font-medium mb-1">
                          Personalization Cookies
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          Customize WedSync content and features to match your
                          wedding style and preferences.
                        </p>
                      </div>
                      <button
                        onClick={() => togglePreference('personalization')}
                        className={cn(
                          'ml-4 w-12 h-6 rounded-full transition-colors relative',
                          preferences.personalization
                            ? 'bg-primary'
                            : 'bg-gray-300',
                        )}
                        aria-label="Toggle personalization cookies"
                      >
                        <span
                          className={cn(
                            'absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform',
                            preferences.personalization && 'translate-x-6',
                          )}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => savePreferences(preferences)}
                      disabled={saving}
                      className="flex-1"
                    >
                      {saving ? 'Saving...' : 'Save Preferences'}
                    </Button>
                    <Button onClick={acceptAll} variant="outline">
                      Accept All
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
