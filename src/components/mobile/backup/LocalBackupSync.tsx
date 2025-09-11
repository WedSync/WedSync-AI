'use client';

import { useState, useEffect, useActionState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  CloudArrowDownIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  ComputerDesktopIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  WifiIcon,
  SignalSlashIcon,
  CogIcon,
  PlayIcon,
  PauseIcon,
  InformationCircleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface Device {
  id: string;
  name: string;
  type: 'mobile' | 'tablet' | 'desktop';
  platform: 'ios' | 'android' | 'windows' | 'macos' | 'web';
  lastSeen: Date;
  isOnline: boolean;
  isCurrentDevice: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'paused';
  lastSync: Date | null;
  pendingChanges: number;
  storageUsed: number;
  storageLimit: number;
}

interface SyncItem {
  id: string;
  type: 'wedding' | 'client' | 'form' | 'document' | 'photo';
  name: string;
  size: number;
  localVersion: string | null;
  cloudVersion: string | null;
  lastModified: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';
  conflictType?: 'newer_local' | 'newer_remote' | 'both_modified';
  deviceOrigin: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface SyncSession {
  id: string;
  deviceId: string;
  startedAt: Date;
  status: 'active' | 'paused' | 'completed' | 'error';
  totalItems: number;
  syncedItems: number;
  conflictItems: number;
  errorItems: number;
  bytesTransferred: number;
  estimatedTimeRemaining: number;
}

async function syncAction(
  prevState: any,
  formData: FormData,
): Promise<{
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  data?: any;
}> {
  const action = formData.get('action') as string;
  const deviceId = formData.get('deviceId') as string;
  const itemId = formData.get('itemId') as string;

  try {
    // Simulate sync operations
    await new Promise((resolve) => setTimeout(resolve, 2000));

    switch (action) {
      case 'start_sync':
        return {
          status: 'success',
          message: 'Sync started successfully',
        };
      case 'pause_sync':
        return {
          status: 'success',
          message: 'Sync paused',
        };
      case 'resume_sync':
        return {
          status: 'success',
          message: 'Sync resumed',
        };
      case 'force_sync':
        return {
          status: 'success',
          message: 'Force sync completed',
        };
      case 'resolve_conflict':
        const resolution = formData.get('resolution') as string;
        return {
          status: 'success',
          message: `Conflict resolved using ${resolution} version`,
        };
      default:
        return {
          status: 'error',
          message: 'Unknown action',
        };
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Sync operation failed',
    };
  }
}

export default function LocalBackupSync() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [syncItems, setSyncItems] = useState<SyncItem[]>([]);
  const [activeSessions, setActiveSessions] = useState<SyncSession[]>([]);
  const [activeTab, setActiveTab] = useState<
    'devices' | 'items' | 'conflicts' | 'settings'
  >('devices');
  const [isOnline, setIsOnline] = useState(true);
  const [selectedConflicts, setSelectedConflicts] = useState<string[]>([]);
  const [autoSync, setAutoSync] = useState(true);
  const [syncOnlyOnWifi, setSyncOnlyOnWifi] = useState(false);
  const [actionState, submitAction] = useActionState(syncAction, {
    status: 'idle' as const,
    message: '',
  });

  useEffect(() => {
    // Monitor online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Load sync data
    loadSyncData();

    // Update sync status every 10 seconds
    const syncInterval = setInterval(updateSyncStatus, 10000);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
      clearInterval(syncInterval);
    };
  }, []);

  const loadSyncData = async () => {
    try {
      // Mock devices
      const mockDevices: Device[] = [
        {
          id: 'current',
          name: 'iPhone 15 Pro',
          type: 'mobile',
          platform: 'ios',
          lastSeen: new Date(),
          isOnline: true,
          isCurrentDevice: true,
          syncStatus: 'idle',
          lastSync: new Date(Date.now() - 1800000),
          pendingChanges: 3,
          storageUsed: 2.1 * 1024 * 1024 * 1024,
          storageLimit: 16 * 1024 * 1024 * 1024,
        },
        {
          id: 'ipad',
          name: 'iPad Pro',
          type: 'tablet',
          platform: 'ios',
          lastSeen: new Date(Date.now() - 3600000),
          isOnline: true,
          isCurrentDevice: false,
          syncStatus: 'syncing',
          lastSync: new Date(Date.now() - 7200000),
          pendingChanges: 7,
          storageUsed: 8.5 * 1024 * 1024 * 1024,
          storageLimit: 64 * 1024 * 1024 * 1024,
        },
        {
          id: 'macbook',
          name: 'MacBook Pro',
          type: 'desktop',
          platform: 'macos',
          lastSeen: new Date(Date.now() - 14400000),
          isOnline: false,
          isCurrentDevice: false,
          syncStatus: 'error',
          lastSync: new Date(Date.now() - 86400000),
          pendingChanges: 15,
          storageUsed: 45 * 1024 * 1024 * 1024,
          storageLimit: 256 * 1024 * 1024 * 1024,
        },
      ];

      // Mock sync items
      const mockSyncItems: SyncItem[] = [
        {
          id: '1',
          type: 'wedding',
          name: 'Johnson Wedding Complete Package',
          size: 15728640,
          localVersion: '2024-09-03-v1.2',
          cloudVersion: '2024-09-03-v1.1',
          lastModified: new Date(Date.now() - 3600000),
          syncStatus: 'conflict',
          conflictType: 'newer_local',
          deviceOrigin: 'current',
          priority: 'critical',
        },
        {
          id: '2',
          type: 'client',
          name: 'Wedding Vendor Contact List',
          size: 524288,
          localVersion: '2024-09-03-v1.0',
          cloudVersion: null,
          lastModified: new Date(Date.now() - 1800000),
          syncStatus: 'pending',
          deviceOrigin: 'current',
          priority: 'high',
        },
        {
          id: '3',
          type: 'document',
          name: 'Vendor Contracts Bundle',
          size: 5242880,
          localVersion: '2024-09-02-v1.0',
          cloudVersion: '2024-09-03-v1.1',
          lastModified: new Date(Date.now() - 7200000),
          syncStatus: 'conflict',
          conflictType: 'newer_remote',
          deviceOrigin: 'macbook',
          priority: 'medium',
        },
        {
          id: '4',
          type: 'photo',
          name: 'Engagement Session Photos',
          size: 104857600,
          localVersion: null,
          cloudVersion: '2024-09-01-v1.0',
          lastModified: new Date(Date.now() - 172800000),
          syncStatus: 'syncing',
          deviceOrigin: 'ipad',
          priority: 'low',
        },
      ];

      // Mock active sessions
      const mockSessions: SyncSession[] = [
        {
          id: 'session1',
          deviceId: 'ipad',
          startedAt: new Date(Date.now() - 300000),
          status: 'active',
          totalItems: 12,
          syncedItems: 8,
          conflictItems: 1,
          errorItems: 0,
          bytesTransferred: 25165824,
          estimatedTimeRemaining: 120,
        },
      ];

      setDevices(mockDevices);
      setSyncItems(mockSyncItems);
      setActiveSessions(mockSessions);
    } catch (error) {
      console.error('Failed to load sync data:', error);
    }
  };

  const updateSyncStatus = useCallback(async () => {
    // Update sync progress for active sessions
    setActiveSessions((prev) =>
      prev.map((session) => {
        if (session.status === 'active') {
          const progress = Math.min(
            session.syncedItems + 1,
            session.totalItems,
          );
          return {
            ...session,
            syncedItems: progress,
            bytesTransferred:
              session.bytesTransferred + Math.random() * 1048576,
            estimatedTimeRemaining: Math.max(
              0,
              session.estimatedTimeRemaining - 10,
            ),
          };
        }
        return session;
      }),
    );
  }, []);

  const startSync = async (deviceId: string, forced = false) => {
    const formData = new FormData();
    formData.append('action', forced ? 'force_sync' : 'start_sync');
    formData.append('deviceId', deviceId);

    await submitAction(formData);

    // Update device sync status
    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, syncStatus: 'syncing' } : device,
      ),
    );
  };

  const pauseSync = async (deviceId: string) => {
    const formData = new FormData();
    formData.append('action', 'pause_sync');
    formData.append('deviceId', deviceId);

    await submitAction(formData);

    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId ? { ...device, syncStatus: 'paused' } : device,
      ),
    );
  };

  const resolveConflict = async (
    itemId: string,
    resolution: 'local' | 'remote',
  ) => {
    const formData = new FormData();
    formData.append('action', 'resolve_conflict');
    formData.append('itemId', itemId);
    formData.append('resolution', resolution);

    await submitAction(formData);

    setSyncItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, syncStatus: 'synced', conflictType: undefined }
          : item,
      ),
    );
  };

  const getDeviceIcon = (device: Device) => {
    switch (device.type) {
      case 'mobile':
        return DevicePhoneMobileIcon;
      case 'tablet':
        return DeviceTabletIcon;
      case 'desktop':
        return ComputerDesktopIcon;
      default:
        return DevicePhoneMobileIcon;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'synced':
      case 'idle':
        return 'text-green-600';
      case 'syncing':
        return 'text-blue-600';
      case 'pending':
        return 'text-yellow-600';
      case 'conflict':
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'synced':
      case 'idle':
        return CheckCircleIcon;
      case 'syncing':
        return ArrowPathIcon;
      case 'pending':
        return ClockIcon;
      case 'conflict':
      case 'error':
        return ExclamationTriangleIcon;
      default:
        return InformationCircleIcon;
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const conflictItems = syncItems.filter(
    (item) => item.syncStatus === 'conflict',
  );
  const pendingItems = syncItems.filter(
    (item) => item.syncStatus === 'pending',
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Device Sync</h1>
            <div className="flex items-center space-x-2">
              {!isOnline ? (
                <div className="flex items-center text-red-600">
                  <SignalSlashIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Offline</span>
                </div>
              ) : (
                <div className="flex items-center text-green-600">
                  <WifiIcon className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium">Online</span>
                </div>
              )}
              <button
                onClick={() => startSync('current', true)}
                disabled={!isOnline}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                style={{ minHeight: '40px' }}
              >
                <ArrowPathIcon className="h-4 w-4 inline mr-2" />
                Sync Now
              </button>
            </div>
          </div>

          {/* Status Message */}
          {actionState.message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-3 rounded-lg mb-4 ${
                actionState.status === 'error'
                  ? 'bg-red-50 text-red-700'
                  : actionState.status === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-blue-50 text-blue-700'
              }`}
            >
              {actionState.message}
            </motion.div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-blue-900">
                {devices.length}
              </p>
              <p className="text-sm text-blue-700">Devices</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-yellow-900">
                {conflictItems.length}
              </p>
              <p className="text-sm text-yellow-700">Conflicts</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-green-900">
                {pendingItems.length}
              </p>
              <p className="text-sm text-green-700">Pending</p>
            </div>
          </div>

          {/* Active Sync Progress */}
          {activeSessions
            .filter((s) => s.status === 'active')
            .map((session) => {
              const device = devices.find((d) => d.id === session.deviceId);
              const progress = (session.syncedItems / session.totalItems) * 100;

              return (
                <div
                  key={session.id}
                  className="bg-blue-50 rounded-lg p-4 mb-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <ArrowPathIcon className="h-5 w-5 text-blue-600 animate-spin" />
                      <span className="font-medium text-blue-900">
                        Syncing {device?.name}
                      </span>
                    </div>
                    <button
                      onClick={() => pauseSync(session.deviceId)}
                      className="text-blue-600 p-1 touch-manipulation"
                    >
                      <PauseIcon className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                    <motion.div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${progress}%` }}
                      animate={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-sm text-blue-700">
                    <span>
                      {session.syncedItems}/{session.totalItems} items
                    </span>
                    <span>
                      {Math.round(progress)}% • {session.estimatedTimeRemaining}
                      s remaining
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="flex">
          {[
            { key: 'devices', label: 'Devices', count: devices.length },
            { key: 'items', label: 'Items', count: syncItems.length },
            {
              key: 'conflicts',
              label: 'Conflicts',
              count: conflictItems.length,
            },
            { key: 'settings', label: 'Settings', count: null },
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as any)}
              className={`flex-1 py-3 px-2 text-center border-b-2 touch-manipulation ${
                activeTab === key
                  ? 'border-blue-600 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-600'
              }`}
              style={{ minHeight: '56px' }}
            >
              <div className="text-xs font-medium">{label}</div>
              {count !== null && (
                <div className="text-lg font-bold">{count}</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {/* Devices Tab */}
          {activeTab === 'devices' && (
            <motion.div
              key="devices"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-4">
                {devices.map((device) => {
                  const DeviceIcon = getDeviceIcon(device);
                  const StatusIcon = getStatusIcon(device.syncStatus);
                  const storagePercent =
                    (device.storageUsed / device.storageLimit) * 100;

                  return (
                    <div
                      key={device.id}
                      className={`bg-white rounded-lg border p-4 ${
                        device.isCurrentDevice
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <DeviceIcon className="h-8 w-8 text-gray-600 flex-shrink-0 mt-1" />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 truncate">
                                {device.name}
                                {device.isCurrentDevice && (
                                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                    This Device
                                  </span>
                                )}
                              </h3>
                              <p className="text-sm text-gray-600 capitalize">
                                {device.type} • {device.platform}
                              </p>
                            </div>

                            <div className="flex items-center space-x-2">
                              <div
                                className={`w-3 h-3 rounded-full ${
                                  device.isOnline
                                    ? 'bg-green-500'
                                    : 'bg-gray-400'
                                }`}
                              />
                              <StatusIcon
                                className={`h-5 w-5 ${getStatusColor(device.syncStatus)}`}
                              />
                            </div>
                          </div>

                          <div className="text-sm text-gray-600 space-y-2">
                            <div className="flex justify-between">
                              <span>Last seen:</span>
                              <span>{formatTimeAgo(device.lastSeen)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Last sync:</span>
                              <span>
                                {device.lastSync
                                  ? formatTimeAgo(device.lastSync)
                                  : 'Never'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Pending changes:</span>
                              <span
                                className={
                                  device.pendingChanges > 0
                                    ? 'text-yellow-600 font-medium'
                                    : ''
                                }
                              >
                                {device.pendingChanges}
                              </span>
                            </div>
                          </div>

                          {/* Storage Usage */}
                          <div className="mt-3">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Storage</span>
                              <span>
                                {formatSize(device.storageUsed)} /{' '}
                                {formatSize(device.storageLimit)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  storagePercent > 80
                                    ? 'bg-red-500'
                                    : storagePercent > 60
                                      ? 'bg-yellow-500'
                                      : 'bg-green-500'
                                }`}
                                style={{ width: `${storagePercent}%` }}
                              />
                            </div>
                          </div>

                          {/* Device Actions */}
                          <div className="flex space-x-2 mt-4">
                            {device.syncStatus === 'idle' ||
                            device.syncStatus === 'error' ? (
                              <button
                                onClick={() => startSync(device.id)}
                                disabled={!device.isOnline || !isOnline}
                                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
                                style={{ minHeight: '40px' }}
                              >
                                <PlayIcon className="h-4 w-4 mr-2" />
                                Sync
                              </button>
                            ) : device.syncStatus === 'syncing' ? (
                              <button
                                onClick={() => pauseSync(device.id)}
                                className="flex-1 bg-yellow-600 text-white px-3 py-2 rounded-lg font-medium flex items-center justify-center touch-manipulation"
                                style={{ minHeight: '40px' }}
                              >
                                <PauseIcon className="h-4 w-4 mr-2" />
                                Pause
                              </button>
                            ) : null}

                            {device.pendingChanges > 0 && (
                              <button
                                onClick={() => startSync(device.id, true)}
                                disabled={!device.isOnline || !isOnline}
                                className="flex-1 bg-orange-600 text-white px-3 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation"
                                style={{ minHeight: '40px' }}
                              >
                                Force Sync
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Items Tab */}
          {activeTab === 'items' && (
            <motion.div
              key="items"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-3">
                {syncItems.map((item) => {
                  const StatusIcon = getStatusIcon(item.syncStatus);
                  const originDevice = devices.find(
                    (d) => d.id === item.deviceOrigin,
                  );

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-lg border p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {item.name}
                          </h3>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              Size: {formatSize(item.size)} • Type: {item.type}
                            </p>
                            <p>
                              Origin: {originDevice?.name || 'Unknown device'}
                            </p>
                            <p>Modified: {formatTimeAgo(item.lastModified)}</p>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 ml-4">
                          <StatusIcon
                            className={`h-5 w-5 ${getStatusColor(item.syncStatus)}`}
                          />
                          <span
                            className={`text-sm font-medium capitalize ${getStatusColor(item.syncStatus)}`}
                          >
                            {item.syncStatus}
                          </span>
                        </div>
                      </div>

                      {/* Version Information */}
                      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="font-medium text-gray-700">
                            Local Version
                          </p>
                          <p className="text-gray-600">
                            {item.localVersion || 'None'}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded">
                          <p className="font-medium text-gray-700">
                            Cloud Version
                          </p>
                          <p className="text-gray-600">
                            {item.cloudVersion || 'None'}
                          </p>
                        </div>
                      </div>

                      {/* Conflict Resolution */}
                      {item.syncStatus === 'conflict' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                          <div className="flex items-center space-x-2 mb-2">
                            <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">
                              Sync Conflict -{' '}
                              {item.conflictType?.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => resolveConflict(item.id, 'local')}
                              className="bg-blue-600 text-white px-3 py-2 rounded text-sm font-medium touch-manipulation"
                              style={{ minHeight: '36px' }}
                            >
                              Use Local
                            </button>
                            <button
                              onClick={() => resolveConflict(item.id, 'remote')}
                              className="bg-green-600 text-white px-3 py-2 rounded text-sm font-medium touch-manipulation"
                              style={{ minHeight: '36px' }}
                            >
                              Use Remote
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Sync Progress */}
                      {item.syncStatus === 'syncing' && (
                        <div className="bg-blue-50 rounded-lg p-2">
                          <div className="flex items-center space-x-2">
                            <ArrowPathIcon className="h-4 w-4 text-blue-600 animate-spin" />
                            <span className="text-sm text-blue-800">
                              Syncing...
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Conflicts Tab */}
          {activeTab === 'conflicts' && (
            <motion.div
              key="conflicts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {conflictItems.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Conflicts
                  </h3>
                  <p className="text-gray-500">All your devices are in sync!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                    <h2 className="text-lg font-semibold text-yellow-900 mb-2">
                      Resolve Sync Conflicts
                    </h2>
                    <p className="text-sm text-yellow-800">
                      These items have conflicting versions between devices.
                      Choose which version to keep.
                    </p>
                  </div>

                  {conflictItems.map((item) => {
                    const originDevice = devices.find(
                      (d) => d.id === item.deviceOrigin,
                    );

                    return (
                      <div
                        key={item.id}
                        className="bg-white border-2 border-yellow-300 rounded-lg p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-1">
                              {item.name}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Conflict: {item.conflictType?.replace('_', ' ')}{' '}
                              from {originDevice?.name}
                            </p>
                          </div>
                          <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium text-gray-900 mb-2">
                              Local Version
                            </h4>
                            <p className="text-sm text-gray-600 mb-1">
                              {item.localVersion}
                            </p>
                            <p className="text-xs text-gray-500">
                              Modified: {formatTimeAgo(item.lastModified)}
                            </p>
                          </div>
                          <div className="border rounded-lg p-3">
                            <h4 className="font-medium text-gray-900 mb-2">
                              Remote Version
                            </h4>
                            <p className="text-sm text-gray-600 mb-1">
                              {item.cloudVersion}
                            </p>
                            <p className="text-xs text-gray-500">In cloud</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => resolveConflict(item.id, 'local')}
                            className="bg-blue-600 text-white px-4 py-3 rounded-lg font-medium touch-manipulation"
                            style={{ minHeight: '48px' }}
                          >
                            Keep Local
                          </button>
                          <button
                            onClick={() => resolveConflict(item.id, 'remote')}
                            className="bg-green-600 text-white px-4 py-3 rounded-lg font-medium touch-manipulation"
                            style={{ minHeight: '48px' }}
                          >
                            Keep Remote
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="space-y-4">
                <div className="bg-white rounded-lg border p-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Sync Settings
                  </h2>

                  <div className="space-y-6">
                    <label className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-medium text-gray-700">
                          Auto Sync
                        </span>
                        <p className="text-sm text-gray-500">
                          Automatically sync when devices come online
                        </p>
                      </div>
                      <button
                        onClick={() => setAutoSync(!autoSync)}
                        className={`w-12 h-6 rounded-full relative transition-colors touch-manipulation ${
                          autoSync ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            autoSync ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </label>

                    <label className="flex items-center justify-between">
                      <div>
                        <span className="text-base font-medium text-gray-700">
                          WiFi Only Sync
                        </span>
                        <p className="text-sm text-gray-500">
                          Only sync when connected to WiFi
                        </p>
                      </div>
                      <button
                        onClick={() => setSyncOnlyOnWifi(!syncOnlyOnWifi)}
                        className={`w-12 h-6 rounded-full relative transition-colors touch-manipulation ${
                          syncOnlyOnWifi ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <div
                          className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            syncOnlyOnWifi ? 'translate-x-6' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </label>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <h3 className="text-base font-semibold text-gray-900 mb-3">
                      Sync Statistics
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Total Devices</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {devices.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Items Synced</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {
                            syncItems.filter((i) => i.syncStatus === 'synced')
                              .length
                          }
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Data Transferred</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatSize(
                            activeSessions.reduce(
                              (sum, s) => sum + s.bytesTransferred,
                              0,
                            ),
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Last Full Sync</p>
                        <p className="text-lg font-semibold text-gray-900">
                          2h ago
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Offline Notice */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg">
          <div className="flex items-center">
            <SignalSlashIcon className="h-5 w-5 mr-2" />
            <div className="flex-1">
              <p className="font-medium">Device Offline</p>
              <p className="text-sm text-red-100">
                Sync will resume when connection is restored
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
