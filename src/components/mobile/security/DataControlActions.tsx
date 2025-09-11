'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download,
  Trash2,
  Eye,
  FileText,
  Camera,
  Share2,
  Mail,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';

interface DataControlActionsProps {
  privacyStats: {
    photosShared: number;
    dataPoints: number;
    consentGiven: boolean;
    lastUpdated: Date;
  };
  isSecureMode: boolean;
}

interface DataItem {
  id: string;
  type: 'photo' | 'contact' | 'timeline' | 'message' | 'location';
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  size: string;
  sharedWith: string[];
  canDelete: boolean;
  lastModified: Date;
}

/**
 * WS-338 Team D: Guest data control actions
 * Easy data export and deletion requests for wedding guests
 * GDPR-compliant data management with wedding context
 */
export const DataControlActions: React.FC<DataControlActionsProps> = ({
  privacyStats,
  isSecureMode,
}) => {
  const [exportingData, setExportingData] = useState(false);
  const [deletingData, setDeletingData] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Mock data - in real app this would come from API
  const [userData] = useState<DataItem[]>([
    {
      id: 'photos_1',
      type: 'photo',
      title: 'Wedding Photos',
      description: `${privacyStats.photosShared} photos from the ceremony and reception`,
      icon: Camera,
      size: '45.2 MB',
      sharedWith: ['Couple', 'All Guests'],
      canDelete: true,
      lastModified: new Date(),
    },
    {
      id: 'contact_1',
      type: 'contact',
      title: 'Contact Information',
      description: 'Name, email, phone number, and mailing address',
      icon: Mail,
      size: '0.5 KB',
      sharedWith: ['Couple'],
      canDelete: false,
      lastModified: new Date(Date.now() - 86400000),
    },
    {
      id: 'timeline_1',
      type: 'timeline',
      title: 'Wedding Timeline Data',
      description: 'Your activities and participation in wedding events',
      icon: Clock,
      size: '2.1 KB',
      sharedWith: ['Couple', 'Wedding Party'],
      canDelete: true,
      lastModified: new Date(Date.now() - 3600000),
    },
    {
      id: 'messages_1',
      type: 'message',
      title: 'Messages & Comments',
      description: 'Your messages to the couple and other guests',
      icon: Share2,
      size: '5.7 KB',
      sharedWith: ['Couple', 'Selected Guests'],
      canDelete: true,
      lastModified: new Date(Date.now() - 7200000),
    },
  ]);

  const exportData = async () => {
    setExportingData(true);
    try {
      // Simulate export process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Create mock export data
      const exportData = {
        exportDate: new Date().toISOString(),
        guestId: 'guest_' + Math.random().toString(36).substr(2, 9),
        weddingId: 'wedding_' + Math.random().toString(36).substr(2, 9),
        privacySettings: {
          consentGiven: privacyStats.consentGiven,
          secureMode: isSecureMode,
          lastUpdated: privacyStats.lastUpdated,
        },
        data: userData.map((item) => ({
          type: item.type,
          title: item.title,
          size: item.size,
          sharedWith: item.sharedWith,
          lastModified: item.lastModified,
        })),
      };

      // In a real app, this would trigger a download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wedding-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportingData(false);
    }
  };

  const deleteSelectedData = async () => {
    setDeletingData(true);
    try {
      // Simulate deletion process
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // In real app, this would call API to mark data for deletion
      console.log('Deleting items:', selectedItems);

      setSelectedItems([]);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error('Deletion failed:', error);
    } finally {
      setDeletingData(false);
    }
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const getTypeColor = (type: string) => {
    const colors = {
      photo: 'bg-purple-50 text-purple-600 border-purple-200',
      contact: 'bg-blue-50 text-blue-600 border-blue-200',
      timeline: 'bg-green-50 text-green-600 border-green-200',
      message: 'bg-orange-50 text-orange-600 border-orange-200',
      location: 'bg-red-50 text-red-600 border-red-200',
    };
    return (
      colors[type as keyof typeof colors] ||
      'bg-gray-50 text-gray-600 border-gray-200'
    );
  };

  return (
    <div className="space-y-6">
      {/* Data Summary */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Your Wedding Data
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <FileText className="w-6 h-6 mx-auto mb-2 text-blue-600" />
            <div className="text-xl font-bold text-blue-900">
              {userData.length}
            </div>
            <div className="text-sm text-blue-700">Data Categories</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <CheckCircle className="w-6 h-6 mx-auto mb-2 text-green-600" />
            <div className="text-xl font-bold text-green-900">
              {userData
                .reduce((acc, item) => acc + parseFloat(item.size), 0)
                .toFixed(1)}{' '}
              MB
            </div>
            <div className="text-sm text-green-700">Total Size</div>
          </div>
        </div>

        <div className="text-xs text-gray-500 text-center">
          Last updated: {privacyStats.lastUpdated.toLocaleString()}
        </div>
      </div>

      {/* Data Items */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Your Data Items
            </h3>
            {selectedItems.length > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Delete Selected ({selectedItems.length})
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-gray-200">
          {userData.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedItems.includes(item.id);

            return (
              <motion.div
                key={item.id}
                whileTap={{ scale: 0.98 }}
                className={`p-4 transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex items-start space-x-3">
                  <div
                    className={`p-2 rounded-lg border ${getTypeColor(item.type)}`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {item.title}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.description}
                        </p>
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                          <span>{item.size}</span>
                          <span>•</span>
                          <span>Shared with: {item.sharedWith.join(', ')}</span>
                        </div>
                      </div>

                      {item.canDelete && (
                        <button
                          onClick={() => toggleItemSelection(item.id)}
                          className={`w-5 h-5 rounded border-2 transition-colors ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {isSelected && (
                            <CheckCircle className="w-3 h-3 text-white" />
                          )}
                        </button>
                      )}
                    </div>

                    {!item.canDelete && (
                      <div className="mt-2 flex items-center space-x-2 text-xs text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Required for wedding coordination</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={exportData}
          disabled={exportingData}
          className="w-full flex items-center justify-center space-x-2 bg-blue-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {exportingData ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <Download className="w-5 h-5" />
              </motion.div>
              <span>Exporting Data...</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Export All My Data</span>
            </>
          )}
        </button>

        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={userData.filter((item) => item.canDelete).length === 0}
          className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white py-3 px-4 rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Trash2 className="w-5 h-5" />
          <span>Request Data Deletion</span>
        </button>
      </div>

      {/* GDPR Notice */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-start space-x-3">
          <Eye className="w-5 h-5 text-gray-400 mt-0.5" />
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-2">Your Data Rights</p>
            <ul className="space-y-1 text-xs">
              <li>• Export your data at any time in a portable format</li>
              <li>• Request deletion of non-essential data</li>
              <li>• View who has access to your information</li>
              <li>• Withdraw consent for optional data sharing</li>
            </ul>
            <p className="mt-2 text-xs text-gray-500">
              Some data may be retained for legal compliance or wedding
              coordination purposes.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-xl p-6 max-w-sm w-full"
          >
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Delete Data?
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {selectedItems.length > 0
                  ? `Delete ${selectedItems.length} selected items? This action cannot be undone.`
                  : 'Request deletion of all removable data? This may affect your wedding experience.'}
              </p>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={deleteSelectedData}
                  disabled={deletingData}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {deletingData ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default DataControlActions;
