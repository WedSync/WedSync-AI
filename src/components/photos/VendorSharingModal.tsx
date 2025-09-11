'use client';

/**
 * VendorSharingModal Component - WS-079 Photo Gallery System
 * Vendor-specific photo sharing controls using Untitled UI patterns
 */

import React, { useState, useCallback } from 'react';
import {
  X,
  Share2,
  Users,
  Calendar,
  Lock,
  Globe,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { VendorType, PhotoSharingPermission } from '@/types/photos';
import { photoService } from '@/lib/services/photoService';

interface VendorSharingModalProps {
  photoIds: string[];
  onClose: () => void;
  onComplete: () => void;
  className?: string;
}

const VENDOR_TYPES: {
  type: VendorType;
  label: string;
  icon: string;
  description: string;
}[] = [
  {
    type: 'photographer',
    label: 'Photographer',
    icon: '📸',
    description: 'Wedding photographer',
  },
  {
    type: 'videographer',
    label: 'Videographer',
    icon: '🎥',
    description: 'Wedding videographer',
  },
  {
    type: 'florist',
    label: 'Florist',
    icon: '🌸',
    description: 'Floral arrangements',
  },
  { type: 'venue', label: 'Venue', icon: '🏛️', description: 'Wedding venue' },
  {
    type: 'caterer',
    label: 'Caterer',
    icon: '🍽️',
    description: 'Food and beverage service',
  },
  {
    type: 'dj',
    label: 'DJ',
    icon: '🎵',
    description: 'Music and entertainment',
  },
  { type: 'band', label: 'Band', icon: '🎸', description: 'Live music' },
  {
    type: 'officiant',
    label: 'Officiant',
    icon: '👔',
    description: 'Wedding officiant',
  },
  {
    type: 'planner',
    label: 'Planner',
    icon: '📋',
    description: 'Wedding planner',
  },
  {
    type: 'decorator',
    label: 'Decorator',
    icon: '🎨',
    description: 'Event decoration',
  },
  { type: 'baker', label: 'Baker', icon: '🎂', description: 'Wedding cake' },
  { type: 'other', label: 'Other', icon: '🔧', description: 'Other vendors' },
];

const PERMISSION_LEVELS = [
  { value: 'view', label: 'View Only', description: 'Can view photos only' },
  {
    value: 'download',
    label: 'Download',
    description: 'Can view and download photos',
  },
  {
    value: 'edit',
    label: 'Edit',
    description: 'Can view, download and edit metadata',
  },
  {
    value: 'share',
    label: 'Share',
    description: 'Full access including sharing',
  },
] as const;

export function VendorSharingModal({
  photoIds,
  onClose,
  onComplete,
  className = '',
}: VendorSharingModalProps) {
  const [selectedVendors, setSelectedVendors] = useState<VendorType[]>([]);
  const [permissionLevel, setPermissionLevel] = useState<
    'view' | 'download' | 'edit' | 'share'
  >('view');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [allowReshare, setAllowReshare] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Toggle vendor selection
  const toggleVendor = useCallback((vendorType: VendorType) => {
    setSelectedVendors((prev) =>
      prev.includes(vendorType)
        ? prev.filter((v) => v !== vendorType)
        : [...prev, vendorType],
    );
  }, []);

  // Handle sharing
  const handleShare = useCallback(async () => {
    if (selectedVendors.length === 0) {
      setError('Please select at least one vendor type');
      return;
    }

    setIsSharing(true);
    setError(null);

    try {
      // For each photo, create sharing permissions
      const sharePromises = photoIds.map((photoId) =>
        photoService.shareWithVendors(
          photoId,
          undefined, // albumId
          undefined, // bucketId
          selectedVendors,
          permissionLevel,
          expiresAt || undefined,
        ),
      );

      await Promise.all(sharePromises);

      setSuccess(true);

      setTimeout(() => {
        onComplete();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share photos');
      setIsSharing(false);
    }
  }, [photoIds, selectedVendors, permissionLevel, expiresAt, onComplete]);

  // Generate expiry date options
  const getExpiryOptions = () => {
    const now = new Date();
    return [
      { value: '', label: 'Never expires' },
      {
        value: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        label: '1 week',
      },
      {
        value: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        label: '1 month',
      },
      {
        value: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        label: '3 months',
      },
      {
        value: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        label: '1 year',
      },
    ];
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="p-3 bg-success-100 rounded-full">
              <CheckCircle2 className="w-8 h-8 text-success-600" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Photos Shared Successfully!
              </h3>
              <p className="text-sm text-gray-500">
                {photoIds.length} photo{photoIds.length !== 1 ? 's' : ''} shared
                with {selectedVendors.length} vendor type
                {selectedVendors.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        className={`bg-white rounded-2xl max-w-2xl w-full shadow-xl overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Share2 className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-display-xs font-bold text-gray-900">
                Share with Vendors
              </h2>
              <p className="text-sm text-gray-500">
                {photoIds.length} photo{photoIds.length !== 1 ? 's' : ''}{' '}
                selected
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-50 transition-all"
            disabled={isSharing}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
          {/* Vendor Type Selection */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Users className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">
                Select Vendor Types
              </h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {VENDOR_TYPES.map((vendor) => (
                <button
                  key={vendor.type}
                  onClick={() => toggleVendor(vendor.type)}
                  className={`p-3 border rounded-lg text-left transition-all hover:bg-gray-50 ${
                    selectedVendors.includes(vendor.type)
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200'
                  }`}
                  disabled={isSharing}
                >
                  <div className="flex items-start space-x-2">
                    <span className="text-lg">{vendor.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">
                        {vendor.label}
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {vendor.description}
                      </p>
                    </div>
                    {selectedVendors.includes(vendor.type) && (
                      <CheckCircle2 className="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Permission Level */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Lock className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">
                Permission Level
              </h3>
            </div>

            <div className="space-y-2">
              {PERMISSION_LEVELS.map((level) => (
                <label
                  key={level.value}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all hover:bg-gray-50 ${
                    permissionLevel === level.value
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="permissionLevel"
                    value={level.value}
                    checked={permissionLevel === level.value}
                    onChange={(e) => setPermissionLevel(e.target.value as any)}
                    className="sr-only"
                    disabled={isSharing}
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-gray-900">
                        {level.label}
                      </h4>
                      {permissionLevel === level.value && (
                        <CheckCircle2 className="w-4 h-4 text-primary-600" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {level.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Expiry Settings */}
          <div>
            <div className="flex items-center space-x-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-600" />
              <h3 className="text-sm font-medium text-gray-900">
                Access Duration
              </h3>
            </div>

            <select
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all"
              disabled={isSharing}
            >
              {getExpiryOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Additional Settings */}
          <div className="space-y-3">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={allowReshare}
                onChange={(e) => setAllowReshare(e.target.checked)}
                className="mt-1 w-4 h-4 text-primary-600 bg-white border border-gray-300 rounded focus:ring-4 focus:ring-primary-100"
                disabled={isSharing}
              />
              <div>
                <span className="text-sm font-medium text-gray-900">
                  Allow vendors to reshare
                </span>
                <p className="text-xs text-gray-500 mt-0.5">
                  Vendors can share these photos with their own network
                </p>
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-error-50 border border-error-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-error-700">{error}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-sm text-gray-500">
            {selectedVendors.length} vendor type
            {selectedVendors.length !== 1 ? 's' : ''} selected
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all"
              disabled={isSharing}
            >
              Cancel
            </button>

            <button
              onClick={handleShare}
              disabled={selectedVendors.length === 0 || isSharing}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-4 focus:ring-primary-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSharing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-2 inline-block" />
                  Share Photos
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
