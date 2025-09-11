'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Camera,
  Users,
  Calendar,
  Heart,
  Database,
  Shield,
  Cloud,
  Download,
  Settings,
  CheckCircle,
  AlertTriangle,
  Info,
  Globe,
  Smartphone,
} from 'lucide-react';

interface WeddingDataProtectionProps {
  metrics: {
    overallScore: number;
    guestPrivacyCompliance: number;
    dataEncryptionStatus: number;
    accessControlHealth: number;
    backupStatus: number;
    lastSecurityScan: Date;
  };
  weddingStats: {
    totalGuests: number;
    guestsWithPrivacyConsent: number;
    photosProtected: number;
    dataEncrypted: boolean;
    lastBackup: Date;
  };
}

interface DataCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  dataCount: number;
  protectionLevel: 'high' | 'medium' | 'low';
  encrypted: boolean;
  backedUp: boolean;
  sharedWith: string[];
  weddingContext: string;
}

/**
 * WS-338 Team D: Wedding data protection overview
 * Shows what data is protected and how for wedding couples
 */
export const WeddingDataProtection: React.FC<WeddingDataProtectionProps> = ({
  metrics,
  weddingStats,
}) => {
  const [showDetails, setShowDetails] = useState<string | null>(null);

  const dataCategories: DataCategory[] = [
    {
      id: 'wedding_photos',
      title: 'Wedding Photos',
      description: 'Photos from your ceremony, reception, and events',
      icon: Camera,
      dataCount: weddingStats.photosProtected,
      protectionLevel: 'high',
      encrypted: true,
      backedUp: true,
      sharedWith: ['Couple', 'Photographer', 'Selected Guests'],
      weddingContext:
        'Your precious memories are fully protected with encryption and regular backups',
    },
    {
      id: 'guest_information',
      title: 'Guest Details',
      description: 'Guest contact info, dietary needs, and preferences',
      icon: Users,
      dataCount: weddingStats.totalGuests,
      protectionLevel: 'high',
      encrypted: true,
      backedUp: true,
      sharedWith: ['Couple', 'Vendors', 'Wedding Planner'],
      weddingContext:
        'Guest privacy is respected while allowing necessary coordination with vendors',
    },
    {
      id: 'wedding_timeline',
      title: 'Wedding Schedule',
      description: 'Timeline, vendor schedules, and event coordination',
      icon: Calendar,
      dataCount: 47,
      protectionLevel: 'medium',
      encrypted: true,
      backedUp: true,
      sharedWith: ['Couple', 'Vendors', 'Wedding Party'],
      weddingContext:
        'Schedule details are shared securely with authorized vendors and wedding party',
    },
    {
      id: 'vendor_contracts',
      title: 'Vendor Information',
      description: 'Contracts, payments, and vendor communications',
      icon: Heart,
      dataCount: 12,
      protectionLevel: 'high',
      encrypted: true,
      backedUp: true,
      sharedWith: ['Couple', 'Vendors'],
      weddingContext:
        'Financial and contract information is highly secured and only shared when necessary',
    },
    {
      id: 'rsvp_responses',
      title: 'RSVP Responses',
      description: 'Guest responses, meal choices, and special requests',
      icon: Database,
      dataCount: weddingStats.guestsWithPrivacyConsent,
      protectionLevel: 'medium',
      encrypted: true,
      backedUp: true,
      sharedWith: ['Couple', 'Caterer', 'Venue'],
      weddingContext:
        'Response data is shared with relevant vendors while maintaining guest privacy',
    },
  ];

  const protectionLevelConfig = {
    high: {
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200',
      label: '🛡️ Maximum Protection',
      icon: Shield,
    },
    medium: {
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      label: '🔒 Standard Protection',
      icon: Lock,
    },
    low: {
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      label: '⚠️ Basic Protection',
      icon: AlertTriangle,
    },
  };

  const toggleDetails = (categoryId: string) => {
    setShowDetails(showDetails === categoryId ? null : categoryId);
  };

  const protectionSummary = {
    totalDataPoints: dataCategories.reduce(
      (sum, cat) => sum + cat.dataCount,
      0,
    ),
    encryptedItems: dataCategories.filter((cat) => cat.encrypted).length,
    backedUpItems: dataCategories.filter((cat) => cat.backedUp).length,
    highProtection: dataCategories.filter(
      (cat) => cat.protectionLevel === 'high',
    ).length,
  };

  return (
    <div className="space-y-6">
      {/* Protection Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Data Protection Summary
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Shield className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-xl font-bold text-green-900">
              {protectionSummary.totalDataPoints}
            </div>
            <div className="text-sm text-green-700">Protected Items</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Cloud className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-xl font-bold text-blue-900">100%</div>
            <div className="text-sm text-blue-700">Backed Up</div>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">All data encrypted</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">GDPR Compliant</span>
          </div>
        </div>
      </div>

      {/* Data Categories */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Wedding Data Categories
        </h3>

        {dataCategories.map((category, index) => {
          const Icon = category.icon;
          const config = protectionLevelConfig[category.protectionLevel];
          const ConfigIcon = config.icon;
          const isExpanded = showDetails === category.id;

          return (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleDetails(category.id)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg ${config.bg} ${config.border} border`}
                  >
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {category.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-900">
                          {category.dataCount.toLocaleString()}
                        </span>
                        <motion.div
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        </motion.div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-2">
                      {category.description}
                    </p>

                    <div className="flex items-center space-x-4 text-xs">
                      <span
                        className={`flex items-center space-x-1 ${config.color}`}
                      >
                        <ConfigIcon className="w-3 h-3" />
                        <span>{config.label}</span>
                      </span>

                      <div className="flex items-center space-x-2">
                        {category.encrypted && (
                          <span className="flex items-center space-x-1 text-green-600">
                            <Lock className="w-3 h-3" />
                            <span>Encrypted</span>
                          </span>
                        )}

                        {category.backedUp && (
                          <span className="flex items-center space-x-1 text-blue-600">
                            <Cloud className="w-3 h-3" />
                            <span>Backed Up</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              <motion.div
                initial={false}
                animate={{
                  height: isExpanded ? 'auto' : 0,
                  opacity: isExpanded ? 1 : 0,
                }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden' }}
              >
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="mt-3 space-y-3">
                    {/* Shared With */}
                    <div>
                      <h5 className="text-sm font-medium text-gray-900 mb-2">
                        Shared With:
                      </h5>
                      <div className="flex flex-wrap gap-2">
                        {category.sharedWith.map((entity) => (
                          <span
                            key={entity}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {entity}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Wedding Context */}
                    <div className="bg-pink-50 border border-pink-200 rounded-lg p-3">
                      <p className="text-xs text-pink-700">
                        💒 <strong>Wedding Context:</strong>{' '}
                        {category.weddingContext}
                      </p>
                    </div>

                    {/* Security Details */}
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${category.encrypted ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span className="text-gray-600">
                          {category.encrypted
                            ? 'AES-256 Encrypted'
                            : 'Not Encrypted'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <div
                          className={`w-2 h-2 rounded-full ${category.backedUp ? 'bg-blue-500' : 'bg-red-500'}`}
                        />
                        <span className="text-gray-600">
                          {category.backedUp ? 'Daily Backups' : 'No Backups'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>

      {/* Data Rights & Controls */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Your Data Rights
        </h3>

        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
            <Download className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900">Export Your Data</h4>
              <p className="text-sm text-blue-700">
                Download all your wedding data in a portable format
              </p>
              <button className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium">
                Request Export →
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-lg">
            <Settings className="w-5 h-5 text-purple-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-purple-900">Manage Sharing</h4>
              <p className="text-sm text-purple-700">
                Control who can access your wedding information
              </p>
              <button className="mt-2 text-sm text-purple-600 hover:text-purple-700 font-medium">
                Privacy Settings →
              </button>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-900">Data Retention</h4>
              <p className="text-sm text-green-700">
                Your data is kept secure and deleted per your preferences
              </p>
              <button className="mt-2 text-sm text-green-600 hover:text-green-700 font-medium">
                Retention Policy →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Last Backup Info */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center space-x-3">
          <Cloud className="w-5 h-5 text-gray-400" />
          <div className="text-sm text-gray-600">
            <span className="font-medium">Last backup:</span>{' '}
            {weddingStats.lastBackup.toLocaleString()}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          All your wedding data is automatically backed up every 6 hours to
          secure, encrypted storage.
        </p>
      </div>
    </div>
  );
};

// Helper component for chevron icon
const ChevronDown: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

export default WeddingDataProtection;
