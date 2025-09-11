'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  X,
  AlertCircle,
  Camera,
  Share2,
  Mail,
  Phone,
  MapPin,
  Clock,
} from 'lucide-react';

interface ConsentManagerProps {
  privacyLevel: 'minimal' | 'balanced' | 'strict';
  isSecureMode: boolean;
  onPrivacyLevelChange: (level: 'minimal' | 'balanced' | 'strict') => void;
}

interface ConsentItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'photos' | 'data' | 'communication' | 'location';
  required: boolean;
  granted: boolean;
  weddingSpecific: boolean;
}

/**
 * WS-338 Team D: Touch-optimized consent management system
 * Handles wedding-specific privacy consent with large touch targets
 * Provides granular control over photo sharing and data usage
 */
export const ConsentManager: React.FC<ConsentManagerProps> = ({
  privacyLevel,
  isSecureMode,
  onPrivacyLevelChange,
}) => {
  const [consents, setConsents] = useState<ConsentItem[]>([
    {
      id: 'photo_sharing',
      title: 'Photo Sharing',
      description:
        'Allow your photos to be shared with the couple and other guests',
      icon: Camera,
      category: 'photos',
      required: false,
      granted: privacyLevel !== 'strict',
      weddingSpecific: true,
    },
    {
      id: 'photo_recognition',
      title: 'Photo Recognition',
      description: 'Help identify you in photos taken by other guests',
      icon: Camera,
      category: 'photos',
      required: false,
      granted: privacyLevel === 'minimal',
      weddingSpecific: true,
    },
    {
      id: 'contact_sharing',
      title: 'Contact Information',
      description:
        'Share your contact details with the couple for thank you notes',
      icon: Mail,
      category: 'data',
      required: true,
      granted: true,
      weddingSpecific: true,
    },
    {
      id: 'location_tracking',
      title: 'Event Location',
      description: 'Track your location during the wedding for photo memories',
      icon: MapPin,
      category: 'location',
      required: false,
      granted: privacyLevel === 'minimal',
      weddingSpecific: true,
    },
    {
      id: 'timeline_participation',
      title: 'Timeline Sharing',
      description: 'Include your activities in the wedding timeline',
      icon: Clock,
      category: 'data',
      required: false,
      granted: privacyLevel !== 'strict',
      weddingSpecific: true,
    },
    {
      id: 'guest_communication',
      title: 'Guest Communication',
      description: 'Allow other guests to connect with you through the app',
      icon: Share2,
      category: 'communication',
      required: false,
      granted: false,
      weddingSpecific: true,
    },
    {
      id: 'future_events',
      title: 'Future Events',
      description: 'Get notifications about future events from this couple',
      icon: Mail,
      category: 'communication',
      required: false,
      granted: privacyLevel === 'minimal',
      weddingSpecific: false,
    },
  ]);

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    // Auto-adjust consents based on privacy level changes
    setConsents((prev) =>
      prev.map((consent) => {
        if (consent.required) return consent;

        let shouldGrant = false;
        switch (privacyLevel) {
          case 'minimal':
            shouldGrant = true;
            break;
          case 'balanced':
            shouldGrant = ['photo_sharing', 'timeline_participation'].includes(
              consent.id,
            );
            break;
          case 'strict':
            shouldGrant = false;
            break;
        }

        return { ...consent, granted: shouldGrant };
      }),
    );
  }, [privacyLevel]);

  const toggleConsent = (consentId: string) => {
    setConsents((prev) =>
      prev.map((consent) =>
        consent.id === consentId
          ? { ...consent, granted: !consent.granted }
          : consent,
      ),
    );
    setHasChanges(true);
  };

  const saveConsents = async () => {
    try {
      // Save to localStorage and trigger API call
      localStorage.setItem(
        'guest_consent_preferences',
        JSON.stringify({
          consents: consents.filter((c) => c.granted).map((c) => c.id),
          privacyLevel,
          timestamp: new Date().toISOString(),
          secureMode: isSecureMode,
        }),
      );

      // In a real app, this would sync with the backend
      await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate API call

      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save consent preferences:', error);
    }
  };

  const categoryIcons = {
    photos: Camera,
    data: Share2,
    communication: Mail,
    location: MapPin,
  };

  const categoryColors = {
    photos: 'bg-purple-50 text-purple-600 border-purple-200',
    data: 'bg-blue-50 text-blue-600 border-blue-200',
    communication: 'bg-green-50 text-green-600 border-green-200',
    location: 'bg-orange-50 text-orange-600 border-orange-200',
  };

  // Group consents by category
  const groupedConsents = consents.reduce(
    (acc, consent) => {
      if (!acc[consent.category]) {
        acc[consent.category] = [];
      }
      acc[consent.category].push(consent);
      return acc;
    },
    {} as Record<string, ConsentItem[]>,
  );

  return (
    <div className="space-y-6">
      {/* Privacy Level Selector */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          Privacy Level
        </h3>
        <div className="space-y-2">
          {[
            {
              level: 'minimal' as const,
              label: 'Minimal Protection',
              desc: 'Share freely for best experience',
            },
            {
              level: 'balanced' as const,
              label: 'Balanced',
              desc: 'Share key items only',
            },
            {
              level: 'strict' as const,
              label: 'Maximum Protection',
              desc: 'Minimal sharing',
            },
          ].map((option) => (
            <button
              key={option.level}
              onClick={() => onPrivacyLevelChange(option.level)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                privacyLevel === option.level
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-500">{option.desc}</div>
                </div>
                {privacyLevel === option.level && (
                  <Check className="w-5 h-5 text-blue-500" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Consent Categories */}
      {Object.entries(groupedConsents).map(([category, categoryConsents]) => {
        const CategoryIcon =
          categoryIcons[category as keyof typeof categoryIcons];
        return (
          <div
            key={category}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            <div
              className={`p-4 border-l-4 ${categoryColors[category as keyof typeof categoryColors]}`}
            >
              <div className="flex items-center space-x-2">
                <CategoryIcon className="w-5 h-5" />
                <h3 className="text-lg font-semibold capitalize">{category}</h3>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {categoryConsents.map((consent) => {
                const Icon = consent.icon;
                return (
                  <motion.div
                    key={consent.id}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-start justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-start space-x-3 flex-1">
                      <div
                        className={`p-2 rounded-lg ${categoryColors[consent.category]}`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-gray-900">
                            {consent.title}
                          </h4>
                          {consent.weddingSpecific && (
                            <span className="px-2 py-1 text-xs bg-pink-100 text-pink-600 rounded-full">
                              Wedding
                            </span>
                          )}
                          {consent.required && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded-full">
                              Required
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {consent.description}
                        </p>
                      </div>
                    </div>

                    {/* Touch-friendly toggle */}
                    <button
                      onClick={() =>
                        !consent.required && toggleConsent(consent.id)
                      }
                      disabled={consent.required}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        consent.granted ? 'bg-green-500' : 'bg-gray-300'
                      } ${consent.required ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <motion.div
                        className="w-5 h-5 bg-white rounded-full shadow-sm"
                        animate={{ x: consent.granted ? 28 : 2 }}
                        transition={{
                          type: 'spring',
                          stiffness: 500,
                          damping: 30,
                        }}
                      />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Secure Mode Notice */}
      {isSecureMode && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Secure Mode Active</h4>
              <p className="text-sm text-blue-700 mt-1">
                Enhanced privacy protection is enabled. Some features may be
                limited for your security.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      {hasChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="sticky bottom-4"
        >
          <button
            onClick={saveConsents}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg"
          >
            Save Privacy Preferences
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default ConsentManager;
