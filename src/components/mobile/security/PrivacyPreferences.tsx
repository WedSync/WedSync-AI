'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Camera,
  Share2,
  Eye,
  EyeOff,
  Users,
  Heart,
  MapPin,
  Clock,
  Bell,
  Smartphone,
  Wifi,
  Lock,
  Globe,
} from 'lucide-react';

interface PrivacyPreferencesProps {
  privacyLevel: 'minimal' | 'balanced' | 'strict';
  isSecureMode: boolean;
  onStatsUpdate: (stats: any) => void;
}

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  category: 'photos' | 'sharing' | 'visibility' | 'communication';
  enabled: boolean;
  weddingContext: string;
}

/**
 * WS-338 Team D: Wedding-specific privacy preferences
 * Controls for photo sharing, guest visibility, and wedding data usage
 */
export const PrivacyPreferences: React.FC<PrivacyPreferencesProps> = ({
  privacyLevel,
  isSecureMode,
  onStatsUpdate,
}) => {
  const [preferences, setPreferences] = useState<PrivacySetting[]>([
    {
      id: 'photo_auto_share',
      title: 'Auto-Share Photos',
      description: 'Automatically share photos you take during the wedding',
      icon: Camera,
      category: 'photos',
      enabled: privacyLevel === 'minimal',
      weddingContext: 'Your photos help create shared memories for everyone',
    },
    {
      id: 'tagged_photos_approval',
      title: 'Photo Tag Approval',
      description: 'Require approval before being tagged in photos',
      icon: Eye,
      category: 'photos',
      enabled: privacyLevel === 'strict',
      weddingContext: 'Control how you appear in the wedding album',
    },
    {
      id: 'guest_visibility',
      title: 'Visible to Other Guests',
      description: 'Allow other guests to see your profile and activities',
      icon: Users,
      category: 'visibility',
      enabled: privacyLevel !== 'strict',
      weddingContext: 'Help other guests connect and share the celebration',
    },
    {
      id: 'location_sharing',
      title: 'Share Current Location',
      description: 'Share your location during wedding events',
      icon: MapPin,
      category: 'sharing',
      enabled: privacyLevel === 'minimal',
      weddingContext: 'Help coordinate group photos and activities',
    },
    {
      id: 'activity_timeline',
      title: 'Activity Timeline',
      description: 'Include your activities in the wedding timeline',
      icon: Clock,
      category: 'sharing',
      enabled: privacyLevel !== 'strict',
      weddingContext: 'Contribute to the complete wedding story',
    },
    {
      id: 'guest_messaging',
      title: 'Guest Messaging',
      description: 'Allow other guests to send you messages',
      icon: Bell,
      category: 'communication',
      enabled: false,
      weddingContext: 'Connect with other wedding guests privately',
    },
    {
      id: 'couple_updates',
      title: 'Couple Updates',
      description: 'Receive updates and messages from the couple',
      icon: Heart,
      category: 'communication',
      enabled: true,
      weddingContext: 'Stay connected with the happy couple after the wedding',
    },
    {
      id: 'offline_mode',
      title: 'Offline Privacy Mode',
      description: 'Limit data sharing when offline or low signal',
      icon: Wifi,
      category: 'sharing',
      enabled: isSecureMode,
      weddingContext: 'Conserve data and enhance privacy in poor signal areas',
    },
  ]);

  const [privacyInsights, setPrivacyInsights] = useState({
    photosSharedToday: 0,
    guestsCanSeeProfile: 0,
    dataPointsShared: 0,
    privacyScore: 85,
  });

  useEffect(() => {
    // Calculate privacy insights based on current settings
    const activeSettings = preferences.filter((p) => p.enabled).length;
    const totalSettings = preferences.length;
    const privacyScore = Math.round(
      ((totalSettings - activeSettings) / totalSettings) * 100,
    );

    const mockStats = {
      photosShared: Math.floor(Math.random() * 20) + 5,
      dataPoints: activeSettings * 3,
      consentGiven: activeSettings > 0,
      lastUpdated: new Date(),
    };

    setPrivacyInsights((prev) => ({
      ...prev,
      privacyScore,
      dataPointsShared: activeSettings * 3,
    }));

    onStatsUpdate(mockStats);
  }, [preferences, onStatsUpdate]);

  const togglePreference = (preferenceId: string) => {
    setPreferences((prev) =>
      prev.map((pref) =>
        pref.id === preferenceId ? { ...pref, enabled: !pref.enabled } : pref,
      ),
    );
  };

  const categoryConfig = {
    photos: {
      icon: Camera,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      label: 'Photo Privacy',
    },
    sharing: {
      icon: Share2,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      label: 'Data Sharing',
    },
    visibility: {
      icon: Eye,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      label: 'Profile Visibility',
    },
    communication: {
      icon: Bell,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      label: 'Communication',
    },
  };

  // Group preferences by category
  const groupedPreferences = preferences.reduce(
    (acc, pref) => {
      if (!acc[pref.category]) {
        acc[pref.category] = [];
      }
      acc[pref.category].push(pref);
      return acc;
    },
    {} as Record<string, PrivacySetting[]>,
  );

  const getPrivacyScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Privacy Score Overview */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Privacy Score</h3>
          <div
            className={`text-2xl font-bold ${getPrivacyScoreColor(privacyInsights.privacyScore)}`}
          >
            {privacyInsights.privacyScore}/100
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <motion.div
            className={`h-2 rounded-full ${
              privacyInsights.privacyScore >= 80
                ? 'bg-green-500'
                : privacyInsights.privacyScore >= 60
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            initial={{ width: 0 }}
            animate={{ width: `${privacyInsights.privacyScore}%` }}
            transition={{ duration: 0.8 }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {privacyInsights.dataPointsShared}
            </div>
            <div className="text-gray-500">Data Points</div>
          </div>
          <div className="text-center">
            <div className="font-semibold text-gray-900">
              {privacyInsights.guestsCanSeeProfile}
            </div>
            <div className="text-gray-500">Can See Profile</div>
          </div>
        </div>
      </div>

      {/* Privacy Preference Categories */}
      {Object.entries(groupedPreferences).map(([category, categoryPrefs]) => {
        const config = categoryConfig[category as keyof typeof categoryConfig];
        const CategoryIcon = config.icon;

        return (
          <div
            key={category}
            className="bg-white rounded-xl shadow-sm overflow-hidden"
          >
            <div
              className={`p-4 border-l-4 ${config.bgColor} ${config.borderColor}`}
            >
              <div className="flex items-center space-x-2">
                <CategoryIcon className={`w-5 h-5 ${config.color}`} />
                <h3 className="text-lg font-semibold text-gray-900">
                  {config.label}
                </h3>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {categoryPrefs.map((pref) => {
                const Icon = pref.icon;
                return (
                  <motion.div
                    key={pref.id}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div
                      className={`p-2 rounded-lg ${config.bgColor} ${config.borderColor} border`}
                    >
                      <Icon className={`w-4 h-4 ${config.color}`} />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">
                          {pref.title}
                        </h4>

                        {/* Touch-friendly toggle */}
                        <button
                          onClick={() => togglePreference(pref.id)}
                          className={`w-12 h-6 rounded-full transition-colors ${
                            pref.enabled ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                        >
                          <motion.div
                            className="w-5 h-5 bg-white rounded-full shadow-sm"
                            animate={{ x: pref.enabled ? 28 : 2 }}
                            transition={{
                              type: 'spring',
                              stiffness: 500,
                              damping: 30,
                            }}
                          />
                        </button>
                      </div>

                      <p className="text-sm text-gray-500 mt-1">
                        {pref.description}
                      </p>

                      {/* Wedding Context */}
                      <div className="mt-2 p-2 bg-pink-50 border border-pink-200 rounded-lg">
                        <p className="text-xs text-pink-700">
                          💒 <strong>Wedding Context:</strong>{' '}
                          {pref.weddingContext}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quick Privacy Actions */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => {
              setPreferences((prev) =>
                prev.map((p) => ({ ...p, enabled: false })),
              );
            }}
            className="flex items-center justify-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 hover:bg-red-100 transition-colors"
          >
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">Maximum Privacy</span>
          </button>

          <button
            onClick={() => {
              setPreferences((prev) =>
                prev.map((p) => ({
                  ...p,
                  enabled: p.category === 'photos' || p.category === 'sharing',
                })),
              );
            }}
            className="flex items-center justify-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">Social Mode</span>
          </button>
        </div>
      </div>

      {/* Secure Mode Notice */}
      {isSecureMode && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start space-x-3">
            <Lock className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">
                Enhanced Privacy Active
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                Some sharing features are automatically limited while secure
                mode is enabled. Your wedding experience may be more private but
                less social.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyPreferences;
