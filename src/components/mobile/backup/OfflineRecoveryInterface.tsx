'use client';

import { useState, useEffect, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  WifiIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  DocumentIcon,
  UserGroupIcon,
  CameraIcon,
  CalendarIcon,
  ClockIcon,
  ChevronRightIcon,
  ChevronLeftIcon,
  SignalSlashIcon,
  ServerIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface RecoveryItem {
  id: string;
  type: 'wedding' | 'client' | 'form' | 'document' | 'photo' | 'timeline';
  name: string;
  size: number;
  lastModified: Date;
  localVersion: string | null;
  cloudVersion: string | null;
  conflictResolution: 'local' | 'cloud' | 'manual' | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recoverable: boolean;
  previewData?: any;
}

interface RecoverySession {
  id: string;
  startedAt: Date;
  totalItems: number;
  recoveredItems: number;
  failedItems: number;
  status: 'scanning' | 'ready' | 'recovering' | 'completed' | 'failed';
  estimatedTimeRemaining: number;
}

type RecoveryStep = 'scan' | 'select' | 'resolve' | 'recover' | 'complete';

export default function OfflineRecoveryInterface() {
  const [isOnline, setIsOnline] = useState(true);
  const [currentStep, setCurrentStep] = useState<RecoveryStep>('scan');
  const [recoveryItems, setRecoveryItems] = useState<RecoveryItem[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [session, setSession] = useState<RecoverySession | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [recoveryProgress, setRecoveryProgress] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [showConflicts, setShowConflicts] = useState(false);

  useEffect(() => {
    // Monitor online status
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    // Auto-start scan if offline
    if (!navigator.onLine) {
      startRecoveryScan();
    }

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  const startRecoveryScan = async () => {
    setCurrentStep('scan');
    setScanProgress(0);

    // Create new recovery session
    const newSession: RecoverySession = {
      id: `recovery_${Date.now()}`,
      startedAt: new Date(),
      totalItems: 0,
      recoveredItems: 0,
      failedItems: 0,
      status: 'scanning',
      estimatedTimeRemaining: 0,
    };
    setSession(newSession);

    // Simulate scanning offline data
    const mockItems: RecoveryItem[] = [
      {
        id: '1',
        type: 'wedding',
        name: 'Johnson Wedding - Complete Data',
        size: 15728640,
        lastModified: new Date(Date.now() - 7200000),
        localVersion: '2024-09-03-v1.2',
        cloudVersion: '2024-09-03-v1.1',
        conflictResolution: 'manual',
        priority: 'critical',
        recoverable: true,
        previewData: {
          weddingDate: '2024-09-15',
          couple: 'Sarah & Mike Johnson',
          venue: 'Grand Ballroom',
          vendors: 12,
        },
      },
      {
        id: '2',
        type: 'client',
        name: 'Emergency Contact List',
        size: 524288,
        localVersion: '2024-09-03-v1.0',
        cloudVersion: null,
        conflictResolution: null,
        priority: 'critical',
        recoverable: true,
        lastModified: new Date(Date.now() - 3600000),
      },
      {
        id: '3',
        type: 'timeline',
        name: 'Wedding Day Schedule',
        size: 1048576,
        lastModified: new Date(Date.now() - 1800000),
        localVersion: '2024-09-03-v2.1',
        cloudVersion: '2024-09-03-v2.0',
        conflictResolution: 'local',
        priority: 'high',
        recoverable: true,
        previewData: {
          events: 15,
          startTime: '08:00',
          endTime: '23:00',
        },
      },
      {
        id: '4',
        type: 'document',
        name: 'Vendor Contracts PDF',
        size: 5242880,
        lastModified: new Date(Date.now() - 86400000),
        localVersion: null,
        cloudVersion: '2024-09-02-v1.0',
        conflictResolution: null,
        priority: 'medium',
        recoverable: false,
      },
      {
        id: '5',
        type: 'photo',
        name: 'Engagement Photos Backup',
        size: 104857600,
        lastModified: new Date(Date.now() - 172800000),
        localVersion: '2024-09-01-v1.0',
        cloudVersion: '2024-09-01-v1.0',
        conflictResolution: null,
        priority: 'low',
        recoverable: true,
      },
    ];

    // Simulate scanning progress
    for (let i = 0; i <= 100; i += 10) {
      setScanProgress(i);
      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    setRecoveryItems(mockItems);
    setSession((prev) =>
      prev ? { ...prev, totalItems: mockItems.length, status: 'ready' } : prev,
    );
    setCurrentStep('select');
  };

  const handleItemSelection = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const selectAllRecoverable = () => {
    const recoverableIds = recoveryItems
      .filter((item) => item.recoverable)
      .map((item) => item.id);
    setSelectedItems(recoverableIds);
  };

  const proceedToConflictResolution = () => {
    const hasConflicts = selectedItems.some((id) => {
      const item = recoveryItems.find((i) => i.id === id);
      return item?.conflictResolution === 'manual';
    });

    if (hasConflicts) {
      setCurrentStep('resolve');
    } else {
      startRecovery();
    }
  };

  const resolveConflict = (itemId: string, resolution: 'local' | 'cloud') => {
    setRecoveryItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, conflictResolution: resolution } : item,
      ),
    );
  };

  const startRecovery = async () => {
    if (selectedItems.length === 0) return;

    setCurrentStep('recover');
    setRecoveryProgress(0);
    setSession((prev) => (prev ? { ...prev, status: 'recovering' } : prev));

    // Simulate recovery process
    const totalSteps = selectedItems.length * 10;
    let currentProgress = 0;

    for (const itemId of selectedItems) {
      const item = recoveryItems.find((i) => i.id === itemId);
      if (!item) continue;

      // Simulate item recovery
      for (let i = 0; i < 10; i++) {
        currentProgress++;
        setRecoveryProgress((currentProgress / totalSteps) * 100);
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      // Update session stats
      setSession((prev) =>
        prev
          ? {
              ...prev,
              recoveredItems: prev.recoveredItems + 1,
              estimatedTimeRemaining: Math.max(
                0,
                ((totalSteps - currentProgress) * 300) / 1000,
              ),
            }
          : prev,
      );
    }

    setSession((prev) => (prev ? { ...prev, status: 'completed' } : prev));
    setCurrentStep('complete');
  };

  const getItemIcon = (type: RecoveryItem['type']) => {
    switch (type) {
      case 'wedding':
        return CalendarIcon;
      case 'client':
        return UserGroupIcon;
      case 'document':
        return DocumentIcon;
      case 'photo':
        return CameraIcon;
      case 'timeline':
        return ClockIcon;
      default:
        return DocumentIcon;
    }
  };

  const getPriorityColor = (priority: RecoveryItem['priority']) => {
    switch (priority) {
      case 'critical':
        return 'text-red-600 bg-red-50';
      case 'high':
        return 'text-orange-600 bg-orange-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

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

  const getStepProgress = () => {
    const stepIndex = [
      'scan',
      'select',
      'resolve',
      'recover',
      'complete',
    ].indexOf(currentStep);
    return ((stepIndex + 1) / 5) * 100;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Data Recovery</h1>
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
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Recovery Progress</span>
              <span>{Math.round(getStepProgress())}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${getStepProgress()}%` }}
                animate={{ width: `${getStepProgress()}%` }}
              />
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex justify-between text-xs text-gray-500 mb-6">
            {['Scan', 'Select', 'Resolve', 'Recover', 'Complete'].map(
              (step, index) => {
                const currentIndex = [
                  'scan',
                  'select',
                  'resolve',
                  'recover',
                  'complete',
                ].indexOf(currentStep);
                return (
                  <div key={step} className="flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        index <= currentIndex
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                    <span className="mt-1">{step}</span>
                  </div>
                );
              },
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Scanning Step */}
          {currentStep === 'scan' && (
            <motion.div
              key="scan"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mx-auto mb-6"
                >
                  <ServerIcon className="h-16 w-16 text-blue-600" />
                </motion.div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Scanning for Recoverable Data
                </h2>
                <p className="text-gray-600 mb-6">
                  Looking for wedding data that can be recovered offline...
                </p>
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <motion.div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${scanProgress}%` }}
                    animate={{ width: `${scanProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">
                  {scanProgress}% Complete
                </p>
              </div>
            </motion.div>
          )}

          {/* Selection Step */}
          {currentStep === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Select Items to Recover
                </h2>
                <p className="text-gray-600 mb-4">
                  Choose which items you'd like to recover from your local
                  backup.
                </p>

                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-600">
                    {selectedItems.length} of{' '}
                    {recoveryItems.filter((i) => i.recoverable).length} selected
                  </span>
                  <button
                    onClick={selectAllRecoverable}
                    className="text-blue-600 text-sm font-medium touch-manipulation"
                    style={{ minHeight: '44px' }}
                  >
                    Select All Recoverable
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {recoveryItems.map((item) => {
                  const ItemIcon = getItemIcon(item.type);
                  return (
                    <div
                      key={item.id}
                      className={`bg-white rounded-lg border-2 p-4 ${
                        selectedItems.includes(item.id)
                          ? 'border-blue-500 bg-blue-50'
                          : item.recoverable
                            ? 'border-gray-200'
                            : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => handleItemSelection(item.id)}
                          disabled={!item.recoverable}
                          className="mt-1 w-6 h-6 rounded border-2 border-gray-300 flex-shrink-0 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                          style={{ minWidth: '44px', minHeight: '44px' }}
                        >
                          {selectedItems.includes(item.id) && (
                            <CheckCircleIcon className="h-4 w-4 text-blue-600" />
                          )}
                        </button>

                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-2 mb-2">
                              <ItemIcon className="h-5 w-5 text-gray-400" />
                              <h3 className="font-semibold text-gray-900">
                                {item.name}
                              </h3>
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(item.priority)}`}
                              >
                                {item.priority}
                              </span>
                            </div>
                            {item.conflictResolution === 'manual' && (
                              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                            )}
                          </div>

                          <div className="text-sm text-gray-600 space-y-1">
                            <p>
                              Size: {formatSize(item.size)} • Modified:{' '}
                              {formatTimeAgo(item.lastModified)}
                            </p>
                            {item.localVersion && (
                              <p>Local: {item.localVersion}</p>
                            )}
                            {item.cloudVersion && (
                              <p>Cloud: {item.cloudVersion}</p>
                            )}
                            {!item.recoverable && (
                              <p className="text-red-600 font-medium">
                                Not available offline
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep('scan')}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold touch-manipulation"
                  style={{ minHeight: '48px' }}
                >
                  <ChevronLeftIcon className="h-5 w-5 inline mr-2" />
                  Back
                </button>
                <button
                  onClick={proceedToConflictResolution}
                  disabled={selectedItems.length === 0}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  style={{ minHeight: '48px' }}
                >
                  Next
                  <ChevronRightIcon className="h-5 w-5 inline ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Conflict Resolution Step */}
          {currentStep === 'resolve' && (
            <motion.div
              key="resolve"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Resolve Conflicts
                </h2>
                <p className="text-gray-600 mb-4">
                  Some items have conflicts between local and cloud versions.
                  Choose which version to keep.
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {selectedItems
                  .map((id) => recoveryItems.find((item) => item.id === id))
                  .filter((item) => item?.conflictResolution === 'manual')
                  .map((item) => {
                    if (!item) return null;
                    const ItemIcon = getItemIcon(item.type);
                    return (
                      <div
                        key={item.id}
                        className="bg-white rounded-lg border p-4"
                      >
                        <div className="flex items-center space-x-2 mb-3">
                          <ItemIcon className="h-5 w-5 text-gray-400" />
                          <h3 className="font-semibold text-gray-900">
                            {item.name}
                          </h3>
                          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => resolveConflict(item.id, 'local')}
                            className={`p-3 rounded-lg border-2 text-left touch-manipulation ${
                              item.conflictResolution === 'local'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200'
                            }`}
                            style={{ minHeight: '60px' }}
                          >
                            <div className="font-medium text-gray-900">
                              Use Local
                            </div>
                            <div className="text-sm text-gray-600">
                              {item.localVersion}
                            </div>
                          </button>

                          <button
                            onClick={() => resolveConflict(item.id, 'cloud')}
                            className={`p-3 rounded-lg border-2 text-left touch-manipulation ${
                              item.conflictResolution === 'cloud'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200'
                            }`}
                            style={{ minHeight: '60px' }}
                          >
                            <div className="font-medium text-gray-900">
                              Use Cloud
                            </div>
                            <div className="text-sm text-gray-600">
                              {item.cloudVersion}
                            </div>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setCurrentStep('select')}
                  className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold touch-manipulation"
                  style={{ minHeight: '48px' }}
                >
                  <ChevronLeftIcon className="h-5 w-5 inline mr-2" />
                  Back
                </button>
                <button
                  onClick={startRecovery}
                  disabled={selectedItems.some((id) => {
                    const item = recoveryItems.find((i) => i.id === id);
                    return item?.conflictResolution === 'manual';
                  })}
                  className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                  style={{ minHeight: '48px' }}
                >
                  Start Recovery
                  <ArrowPathIcon className="h-5 w-5 inline ml-2" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Recovery Step */}
          {currentStep === 'recover' && session && (
            <motion.div
              key="recover"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="mx-auto mb-6"
                >
                  <ArrowPathIcon className="h-16 w-16 text-blue-600" />
                </motion.div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Recovering Your Data
                </h2>
                <p className="text-gray-600 mb-6">
                  Please wait while we restore your wedding data...
                </p>

                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <motion.div
                    className="bg-blue-600 h-3 rounded-full"
                    style={{ width: `${recoveryProgress}%` }}
                    animate={{ width: `${recoveryProgress}%` }}
                  />
                </div>

                <div className="text-sm text-gray-500 space-y-1">
                  <p>{Math.round(recoveryProgress)}% Complete</p>
                  <p>
                    {session.recoveredItems} of {selectedItems.length} items
                    recovered
                  </p>
                  {session.estimatedTimeRemaining > 0 && (
                    <p>
                      Est. time remaining:{' '}
                      {Math.ceil(session.estimatedTimeRemaining)}s
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Complete Step */}
          {currentStep === 'complete' && session && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="mb-8">
                <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-6" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Recovery Complete!
                </h2>
                <p className="text-gray-600 mb-6">
                  Your wedding data has been successfully recovered and is ready
                  to use.
                </p>

                <div className="bg-green-50 rounded-lg p-6 mb-6 text-left">
                  <h3 className="font-semibold text-green-900 mb-3">
                    Recovery Summary
                  </h3>
                  <div className="space-y-2 text-sm text-green-800">
                    <p>
                      • {session.recoveredItems} items recovered successfully
                    </p>
                    <p>• {session.failedItems} items failed to recover</p>
                    <p>
                      • Total recovery time:{' '}
                      {Math.round(
                        (Date.now() - session.startedAt.getTime()) / 1000,
                      )}
                      s
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setCurrentStep('scan');
                    setSelectedItems([]);
                    setRecoveryItems([]);
                    setSession(null);
                    setScanProgress(0);
                    setRecoveryProgress(0);
                  }}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold touch-manipulation"
                  style={{ minHeight: '48px' }}
                >
                  Start New Recovery
                </button>

                <button
                  onClick={() => window.history.back()}
                  className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold touch-manipulation"
                  style={{ minHeight: '48px' }}
                >
                  Return to Backup Manager
                </button>
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
              <p className="font-medium">Offline Mode</p>
              <p className="text-sm text-red-100">
                Recovery is available using local data only
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
