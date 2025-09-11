'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineData } from '@/hooks/useOfflineData';
import { useBatteryOptimization } from '@/hooks/useBatteryOptimization';
import {
  WiFiOff,
  Battery,
  Sync,
  AlertTriangle,
  CheckCircle,
  Clock,
  Signal,
  Smartphone,
  Settings,
  RefreshCw,
} from 'lucide-react';
import type { MobileOfflineManagerProps } from './types';

interface OfflineStatus {
  isOnline: boolean;
  syncStatus: 'idle' | 'syncing' | 'error' | 'complete';
  queuedItems: number;
  batteryLevel: number;
  lastSync: Date | null;
  criticalDataCached: boolean;
}

export const MobileOfflineManager: React.FC<MobileOfflineManagerProps> = ({
  weddingId,
  professionalId,
  onEmergencyAccess,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<
    'status' | 'conflicts' | 'sync' | 'emergency'
  >('status');
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const { isOnline, queuedData, conflicts, syncData } = useOfflineData();

  const { batteryLevel, isLowPower, enableBatterySaver, optimizeForBattery } =
    useBatteryOptimization();

  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({
    isOnline: true,
    syncStatus: 'idle',
    queuedItems: 0,
    batteryLevel: 100,
    lastSync: null,
    criticalDataCached: false,
  });

  // Update offline status
  useEffect(() => {
    setOfflineStatus((prev) => ({
      ...prev,
      isOnline,
      queuedItems: queuedData?.length || 0,
      batteryLevel: batteryLevel || 100,
      criticalDataCached: true,
    }));
  }, [isOnline, queuedData, batteryLevel]);

  // Handle manual refresh with haptic feedback
  const handleRefresh = useCallback(async () => {
    if ('navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }

    setRefreshing(true);
    try {
      await syncData();
      setOfflineStatus((prev) => ({
        ...prev,
        lastSync: new Date(),
        syncStatus: 'complete',
      }));
    } catch (error) {
      setOfflineStatus((prev) => ({
        ...prev,
        syncStatus: 'error',
      }));
    } finally {
      setRefreshing(false);
    }
  }, [syncData]);

  // Auto-optimize for battery when low
  useEffect(() => {
    if (isLowPower && !optimizeForBattery) {
      enableBatterySaver();
    }
  }, [isLowPower, optimizeForBattery, enableBatterySaver]);

  const statusIndicators = {
    connection: isOnline ? (
      <div className="flex items-center gap-2 text-green-600">
        <Signal className="w-4 h-4" />
        <span className="text-sm font-medium">Online</span>
      </div>
    ) : (
      <div className="flex items-center gap-2 text-orange-600">
        <WiFiOff className="w-4 h-4" />
        <span className="text-sm font-medium">Offline Mode</span>
      </div>
    ),
    battery: (
      <div
        className={`flex items-center gap-2 ${
          batteryLevel < 20
            ? 'text-red-600'
            : batteryLevel < 50
              ? 'text-yellow-600'
              : 'text-green-600'
        }`}
      >
        <Battery className="w-4 h-4" />
        <span className="text-sm font-medium">{batteryLevel}%</span>
      </div>
    ),
    sync:
      offlineStatus.queuedItems > 0 ? (
        <div className="flex items-center gap-2 text-blue-600">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">
            {offlineStatus.queuedItems} queued
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Synced</span>
        </div>
      ),
  };

  // Tab navigation with large touch targets
  const tabButtons = [
    { id: 'status', label: 'Status', icon: Smartphone },
    {
      id: 'conflicts',
      label: 'Conflicts',
      icon: AlertTriangle,
      badge: conflicts.length,
    },
    { id: 'sync', label: 'Sync', icon: RefreshCw },
    { id: 'emergency', label: 'Emergency', icon: AlertTriangle },
  ];

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header with status indicators */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">
            Offline Manager
          </h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-gray-100 active:bg-gray-200 transition-colors"
            style={{ minHeight: '44px', minWidth: '44px' }}
          >
            <Settings className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Status indicators */}
        <div className="grid grid-cols-3 gap-3">
          {Object.values(statusIndicators)}
        </div>

        {/* Low battery warning */}
        {isLowPower && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-center gap-2 text-yellow-800">
              <Battery className="w-4 h-4" />
              <span className="text-sm font-medium">
                Battery Saver Mode Enabled
              </span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Tab navigation */}
      <div className="border-b border-gray-100">
        <div className="flex">
          {tabButtons.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs font-medium transition-colors relative ${
                activeTab === tab.id
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-900 active:bg-gray-50'
              }`}
              style={{ minHeight: '56px' }}
            >
              <tab.icon className="w-5 h-5 mb-1" />
              <span>{tab.label}</span>

              {/* Badge for conflicts */}
              {tab.badge && tab.badge > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white font-bold">
                    {tab.badge > 9 ? '9+' : tab.badge}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === 'status' && (
            <motion.div
              key="status"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              {/* Sync button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-blue-600 text-white rounded-lg font-medium active:bg-blue-700 transition-colors disabled:opacity-50"
                style={{ minHeight: '56px' }}
              >
                <RefreshCw
                  className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
                />
                <span>{refreshing ? 'Syncing...' : 'Sync Now'}</span>
              </button>

              {/* Wedding context reminder */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Wedding Context:</strong> Your mobile offline system
                  enables a wedding photographer working a beachside ceremony
                  with poor cellular coverage to access their complete shot list
                  on their phone, resolve timeline conflicts by swiping between
                  versions while holding their camera, and maintain access to
                  emergency vendor contacts - all while conserving battery life
                  for the 12-hour wedding day ahead.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-100 p-4 bg-gray-50"
          >
            <div className="space-y-3">
              <button
                onClick={enableBatterySaver}
                className="w-full flex items-center justify-between py-3 px-4 bg-white rounded-lg border border-gray-200 active:bg-gray-50 transition-colors"
                style={{ minHeight: '52px' }}
              >
                <span className="font-medium">Battery Optimization</span>
                <div
                  className={`w-6 h-6 rounded-full ${
                    optimizeForBattery ? 'bg-green-500' : 'bg-gray-300'
                  } flex items-center justify-center`}
                >
                  {optimizeForBattery && (
                    <CheckCircle className="w-4 h-4 text-white" />
                  )}
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
