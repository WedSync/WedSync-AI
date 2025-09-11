'use client';

import React, { useState, useEffect } from 'react';
import {
  BackupSchedule,
  RetentionPolicy,
  BackupDataType,
  BackupFrequency,
  BackupDestination,
  DataProtectionPanelProps,
} from '@/types/backup';

/**
 * Data Protection Management Panel
 * Automated backup configuration for wedding suppliers with multi-tier strategy
 */
export function DataProtectionPanel({
  schedules,
  policies,
  onUpdateSchedule,
  onUpdatePolicy,
}: DataProtectionPanelProps) {
  const [activeTab, setActiveTab] = useState<
    'schedules' | 'policies' | 'destinations'
  >('schedules');
  const [editingSchedule, setEditingSchedule] = useState<BackupSchedule | null>(
    null,
  );
  const [editingPolicy, setEditingPolicy] = useState<RetentionPolicy | null>(
    null,
  );
  const [showNewScheduleForm, setShowNewScheduleForm] = useState(false);

  const [destinations] = useState<BackupDestination[]>([
    {
      id: '1',
      type: 'local',
      name: 'Local NAS Storage',
      isOnline: true,
      storageUsed: 850000000000, // 850 GB
      storageLimit: 2000000000000, // 2 TB
      encryptionEnabled: true,
    },
    {
      id: '2',
      type: 'cloud',
      name: 'AWS S3 Primary',
      endpoint: 's3.amazonaws.com',
      isOnline: true,
      storageUsed: 1200000000000, // 1.2 TB
      storageLimit: 5000000000000, // 5 TB
      encryptionEnabled: true,
    },
    {
      id: '3',
      type: 'offsite',
      name: 'Offsite Vault',
      isOnline: true,
      storageUsed: 500000000000, // 500 GB
      storageLimit: 10000000000000, // 10 TB
      encryptionEnabled: true,
    },
  ]);

  const dataTypeOptions: {
    value: BackupDataType;
    label: string;
    icon: string;
  }[] = [
    { value: 'wedding_photos', label: 'Wedding Photos', icon: '📸' },
    { value: 'client_data', label: 'Client Information', icon: '👰' },
    { value: 'business_files', label: 'Business Documents', icon: '📄' },
    { value: 'contracts', label: 'Contracts & Agreements', icon: '📝' },
    { value: 'timelines', label: 'Wedding Timelines', icon: '📅' },
    { value: 'communications', label: 'Client Communications', icon: '💬' },
    { value: 'system_config', label: 'System Configuration', icon: '⚙️' },
  ];

  const frequencyOptions: { value: BackupFrequency; label: string }[] = [
    { value: 'real_time', label: 'Real-time (Live sync)' },
    { value: 'hourly', label: 'Every Hour' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const formatBytes = (bytes: number): string => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  const getStoragePercentage = (used: number, total: number): number => {
    return Math.round((used / total) * 100);
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleCreateSchedule = () => {
    const newSchedule: BackupSchedule = {
      id: `schedule-${Date.now()}`,
      name: 'New Backup Schedule',
      dataType: 'wedding_photos',
      frequency: 'daily',
      retentionDays: 30,
      destinations: [destinations[0]],
      isActive: true,
      priority: 'medium',
      weddingSeasonOptimized: false,
      nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000),
    };
    setEditingSchedule(newSchedule);
    setShowNewScheduleForm(true);
  };

  const handleSaveSchedule = () => {
    if (editingSchedule) {
      onUpdateSchedule(editingSchedule);
      setEditingSchedule(null);
      setShowNewScheduleForm(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <span className="mr-3">🛡️</span>
              Data Protection Management
            </h1>
            <p className="text-gray-600 mt-1">
              Configure automated backup schedules and retention policies for
              your wedding business
            </p>
          </div>

          <button
            onClick={handleCreateSchedule}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center"
          >
            <span className="mr-2">➕</span>
            New Schedule
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          <button
            onClick={() => setActiveTab('schedules')}
            className={`py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'schedules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📅 Backup Schedules
          </button>

          <button
            onClick={() => setActiveTab('policies')}
            className={`py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'policies'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            📋 Retention Policies
          </button>

          <button
            onClick={() => setActiveTab('destinations')}
            className={`py-4 px-2 border-b-2 font-medium text-sm ${
              activeTab === 'destinations'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            💾 Storage Destinations
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Backup Schedules Tab */}
        {activeTab === 'schedules' && (
          <div className="space-y-6">
            {/* Wedding Season Alert */}
            <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💍</span>
                <div>
                  <h3 className="text-lg font-semibold text-purple-800">
                    Wedding Season Optimization
                  </h3>
                  <p className="text-purple-700 mt-1">
                    Automatically adjust backup frequency during peak wedding
                    season (May-October)
                  </p>
                </div>
              </div>
            </div>

            {/* Schedules Grid */}
            <div className="grid gap-6">
              {schedules.map((schedule) => (
                <div
                  key={schedule.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">
                          {
                            dataTypeOptions.find(
                              (opt) => opt.value === schedule.dataType,
                            )?.icon
                          }
                        </span>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {schedule.name}
                        </h3>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(schedule.priority)}`}
                        >
                          {schedule.priority.toUpperCase()}
                        </span>
                        {schedule.weddingSeasonOptimized && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                            🏔️ Season Optimized
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-sm text-gray-500">Data Type</p>
                          <p className="font-medium capitalize">
                            {schedule.dataType.replace('_', ' ')}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">Frequency</p>
                          <p className="font-medium capitalize">
                            {schedule.frequency.replace('_', ' ')}
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">Retention</p>
                          <p className="font-medium">
                            {schedule.retentionDays} days
                          </p>
                        </div>

                        <div>
                          <p className="text-sm text-gray-500">Next Run</p>
                          <p className="font-medium text-sm">
                            {new Date(schedule.nextRun).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4">
                        <p className="text-sm text-gray-500 mb-2">
                          Backup Destinations
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {schedule.destinations.map((dest) => (
                            <span
                              key={dest.id}
                              className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center"
                            >
                              <div
                                className={`w-2 h-2 rounded-full mr-1 ${dest.isOnline ? 'bg-green-500' : 'bg-red-500'}`}
                              ></div>
                              {dest.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={schedule.isActive}
                          onChange={(e) =>
                            onUpdateSchedule({
                              ...schedule,
                              isActive: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">Active</span>
                      </div>

                      <button
                        onClick={() => setEditingSchedule(schedule)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retention Policies Tab */}
        {activeTab === 'policies' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">📋</span>
                <div>
                  <h3 className="text-lg font-semibold text-blue-800">
                    Smart Retention Policies
                  </h3>
                  <p className="text-blue-700 mt-1">
                    Automatically manage data lifecycle with wedding-specific
                    retention rules
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {policies.map((policy) => (
                <div
                  key={policy.id}
                  className="border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-2xl">
                          {
                            dataTypeOptions.find(
                              (opt) => opt.value === policy.dataType,
                            )?.icon
                          }
                        </span>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {policy.name}
                        </h3>
                        {policy.weddingDataSpecial && (
                          <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs rounded-full">
                            💒 Wedding Special
                          </span>
                        )}
                      </div>

                      <div className="mt-4">
                        <h4 className="font-medium text-gray-700 mb-2">
                          Retention Rules
                        </h4>
                        <div className="space-y-2">
                          {policy.rules.map((rule, index) => (
                            <div
                              key={index}
                              className="flex items-center space-x-4 text-sm"
                            >
                              <span className="px-2 py-1 bg-gray-100 rounded capitalize">
                                {rule.frequency.replace('_', ' ')}
                              </span>
                              <span>
                                Keep for {rule.keepFor} {rule.unit}
                              </span>
                              {rule.afterWeddingDate && (
                                <span className="text-purple-600">
                                  📅 After wedding date
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={policy.isActive}
                          onChange={(e) =>
                            onUpdatePolicy({
                              ...policy,
                              isActive: e.target.checked,
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">Active</span>
                      </div>

                      <button
                        onClick={() => setEditingPolicy(policy)}
                        className="text-blue-600 hover:text-blue-800 p-2"
                      >
                        ✏️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Storage Destinations Tab */}
        {activeTab === 'destinations' && (
          <div className="space-y-6">
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">💾</span>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">
                    Multi-Tier Storage Strategy
                  </h3>
                  <p className="text-green-700 mt-1">
                    Distribute your wedding data across multiple secure storage
                    locations
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              {destinations.map((destination) => (
                <div
                  key={destination.id}
                  className="border border-gray-200 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-4 h-4 rounded-full ${destination.isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}
                      ></div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {destination.name}
                        </h3>
                        <p className="text-sm text-gray-600 capitalize">
                          {destination.type} Storage
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {destination.encryptionEnabled && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          🔒 Encrypted
                        </span>
                      )}
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          destination.isOnline
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {destination.isOnline ? '🟢 Online' : '🔴 Offline'}
                      </span>
                    </div>
                  </div>

                  {/* Storage Usage */}
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm text-gray-600">
                        Storage Usage
                      </span>
                      <span className="text-sm font-medium">
                        {formatBytes(destination.storageUsed)} /{' '}
                        {formatBytes(destination.storageLimit)}
                      </span>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          getStoragePercentage(
                            destination.storageUsed,
                            destination.storageLimit,
                          ) >= 90
                            ? 'bg-red-500'
                            : getStoragePercentage(
                                  destination.storageUsed,
                                  destination.storageLimit,
                                ) >= 75
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                        }`}
                        style={{
                          width: `${getStoragePercentage(destination.storageUsed, destination.storageLimit)}%`,
                        }}
                      ></div>
                    </div>

                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">
                        {getStoragePercentage(
                          destination.storageUsed,
                          destination.storageLimit,
                        )}
                        % used
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatBytes(
                          destination.storageLimit - destination.storageUsed,
                        )}{' '}
                        free
                      </span>
                    </div>
                  </div>

                  {destination.endpoint && (
                    <div className="mt-4 text-sm text-gray-600">
                      <span className="font-medium">Endpoint:</span>{' '}
                      {destination.endpoint}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Schedule Modal */}
      {(editingSchedule || showNewScheduleForm) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                {showNewScheduleForm
                  ? 'Create New Backup Schedule'
                  : 'Edit Backup Schedule'}
              </h2>
              <button
                onClick={() => {
                  setEditingSchedule(null);
                  setShowNewScheduleForm(false);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✖️
              </button>
            </div>

            {editingSchedule && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule Name
                  </label>
                  <input
                    type="text"
                    value={editingSchedule.name}
                    onChange={(e) =>
                      setEditingSchedule({
                        ...editingSchedule,
                        name: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Type
                    </label>
                    <select
                      value={editingSchedule.dataType}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          dataType: e.target.value as BackupDataType,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {dataTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.icon} {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frequency
                    </label>
                    <select
                      value={editingSchedule.frequency}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          frequency: e.target.value as BackupFrequency,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {frequencyOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingSchedule.isActive}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          isActive: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Active Schedule
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editingSchedule.weddingSeasonOptimized}
                      onChange={(e) =>
                        setEditingSchedule({
                          ...editingSchedule,
                          weddingSeasonOptimized: e.target.checked,
                        })
                      }
                      className="mr-2"
                    />
                    Wedding Season Optimized
                  </label>
                </div>

                <div className="flex justify-end space-x-4 pt-6">
                  <button
                    onClick={() => {
                      setEditingSchedule(null);
                      setShowNewScheduleForm(false);
                    }}
                    className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSchedule}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Save Schedule
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataProtectionPanel;
