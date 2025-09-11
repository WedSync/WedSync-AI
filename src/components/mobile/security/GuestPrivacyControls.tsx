'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Eye,
  EyeOff,
  Download,
  Trash2,
  Settings,
  Camera,
  Share2,
} from 'lucide-react';
import { ConsentManager } from './ConsentManager';
import { PrivacyPreferences } from './PrivacyPreferences';
import { DataControlActions } from './DataControlActions';

/**
 * WS-338 Team D Round 1: Mobile Guest Privacy Controls
 * Touch-friendly consent management for wedding guests
 * Privacy settings for photo sharing and data usage
 * Easy data export and deletion requests
 * Wedding-specific privacy preferences
 */
export const GuestPrivacyControls: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'consent' | 'privacy' | 'data'>(
    'consent',
  );
  const [privacyLevel, setPrivacyLevel] = useState<
    'minimal' | 'balanced' | 'strict'
  >('balanced');
  const [isSecureMode, setIsSecureMode] = useState(false);

  // Wedding guest privacy analytics
  const [privacyStats, setPrivacyStats] = useState({
    photosShared: 0,
    dataPoints: 0,
    consentGiven: true,
    lastUpdated: new Date(),
  });

  useEffect(() => {
    // Load guest privacy preferences from local storage
    const savedPrivacy = localStorage.getItem('guest_privacy_settings');
    if (savedPrivacy) {
      const parsed = JSON.parse(savedPrivacy);
      setPrivacyLevel(parsed.level || 'balanced');
      setIsSecureMode(parsed.secureMode || false);
    }
  }, []);

  const privacyLevelConfig = {
    minimal: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: '🟢',
      description: 'Basic privacy protection',
    },
    balanced: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: '🟡',
      description: 'Balanced privacy and sharing',
    },
    strict: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: '🔴',
      description: 'Maximum privacy protection',
    },
  };

  const tabConfig = [
    { id: 'consent', label: 'Consent', icon: Shield },
    { id: 'privacy', label: 'Privacy', icon: Settings },
    { id: 'data', label: 'My Data', icon: Download },
  ] as const;

  return (
    <div className="mobile-guest-privacy min-h-screen bg-gray-50">
      {/* Security Header */}
      <div
        className={`sticky top-0 z-10 ${privacyLevelConfig[privacyLevel].bgColor} ${privacyLevelConfig[privacyLevel].borderColor} border-b`}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Shield
                className={`w-5 h-5 ${privacyLevelConfig[privacyLevel].color}`}
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                Privacy Controls
              </h1>
              <p
                className={`text-sm ${privacyLevelConfig[privacyLevel].color}`}
              >
                {privacyLevelConfig[privacyLevel].icon}{' '}
                {privacyLevelConfig[privacyLevel].description}
              </p>
            </div>
          </div>

          {/* Secure Mode Toggle */}
          <button
            onClick={() => setIsSecureMode(!isSecureMode)}
            className={`p-2 rounded-full transition-colors ${
              isSecureMode
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-400 hover:text-gray-600'
            }`}
            aria-label={
              isSecureMode ? 'Disable secure mode' : 'Enable secure mode'
            }
          >
            {isSecureMode ? (
              <EyeOff className="w-5 h-5" />
            ) : (
              <Eye className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Privacy Quick Stats */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="bg-white rounded-lg p-2 text-center">
              <Camera className="w-4 h-4 mx-auto mb-1 text-gray-400" />
              <span className="block font-semibold text-gray-900">
                {privacyStats.photosShared}
              </span>
              <span className="text-xs text-gray-500">Photos</span>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <Share2 className="w-4 h-4 mx-auto mb-1 text-gray-400" />
              <span className="block font-semibold text-gray-900">
                {privacyStats.dataPoints}
              </span>
              <span className="text-xs text-gray-500">Shared</span>
            </div>
            <div className="bg-white rounded-lg p-2 text-center">
              <Settings className="w-4 h-4 mx-auto mb-1 text-gray-400" />
              <span
                className={`block font-semibold ${privacyStats.consentGiven ? 'text-green-600' : 'text-red-600'}`}
              >
                {privacyStats.consentGiven ? 'Active' : 'Paused'}
              </span>
              <span className="text-xs text-gray-500">Status</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="flex">
          {tabConfig.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-5 h-5 mb-1" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 p-4">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'consent' && (
            <ConsentManager
              privacyLevel={privacyLevel}
              isSecureMode={isSecureMode}
              onPrivacyLevelChange={setPrivacyLevel}
            />
          )}
          {activeTab === 'privacy' && (
            <PrivacyPreferences
              privacyLevel={privacyLevel}
              isSecureMode={isSecureMode}
              onStatsUpdate={setPrivacyStats}
            />
          )}
          {activeTab === 'data' && (
            <DataControlActions
              privacyStats={privacyStats}
              isSecureMode={isSecureMode}
            />
          )}
        </motion.div>
      </div>

      {/* Emergency Privacy Actions */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-2">
          <button className="flex-1 bg-red-100 text-red-700 py-2 px-4 rounded-lg font-medium text-sm hover:bg-red-200 transition-colors">
            <Trash2 className="w-4 h-4 inline mr-2" />
            Stop All Sharing
          </button>
          <button className="flex-1 bg-blue-100 text-blue-700 py-2 px-4 rounded-lg font-medium text-sm hover:bg-blue-200 transition-colors">
            <Download className="w-4 h-4 inline mr-2" />
            Export My Data
          </button>
        </div>

        {isSecureMode && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            🔐 Secure mode active - Enhanced privacy protection enabled
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestPrivacyControls;
