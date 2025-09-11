'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Database,
  HardDrive,
  Shield,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { RecoveryPointTimeline } from './RecoveryPointTimeline';
import { ManualBackupForm } from './ManualBackupForm';
import { BackupHistoryTable } from './BackupHistoryTable';
import { ExtendedBackupStatus, RecoveryPoint } from '../../../types/backup';

interface BackupDashboardProps {
  // Optional props for integration with admin system
  organizationId?: string;
  userRole?: 'admin' | 'manager';
}

const WS191BackupDashboard: React.FC<BackupDashboardProps> = ({
  organizationId,
  userRole = 'admin',
}) => {
  const [backupStatuses, setBackupStatuses] = useState<ExtendedBackupStatus[]>(
    [],
  );
  const [recoveryPoints, setRecoveryPoints] = useState<RecoveryPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Mock data for demonstration - Team B will provide real API integration
  useEffect(() => {
    const mockBackupStatuses: ExtendedBackupStatus[] = [
      {
        id: '1',
        type: 'full',
        status: 'success',
        startTime: new Date(Date.now() - 3600000),
        duration: 480, // 8 minutes in seconds
        dataSize: 2400000000, // 2.4 GB
        progress: 100,
        lastBackup: new Date(Date.now() - 3600000),
        nextScheduled: new Date(Date.now() + 7200000),
        storageUsage: { used: 2.4, total: 10 },
        health: 'healthy',
      },
      {
        id: '2',
        type: 'incremental',
        status: 'running',
        startTime: new Date(Date.now() - 1800000),
        dataSize: 0,
        progress: 65,
        lastBackup: new Date(Date.now() - 86400000),
        nextScheduled: new Date(Date.now() + 3600000),
        storageUsage: { used: 15.2, total: 50 },
        health: 'healthy',
      },
      {
        id: '3',
        type: 'differential',
        status: 'failed',
        startTime: new Date(Date.now() - 172800000),
        duration: 0,
        dataSize: 0,
        errorMessage: 'Storage connection timeout',
        lastBackup: new Date(Date.now() - 172800000),
        nextScheduled: new Date(Date.now() + 1800000),
        storageUsage: { used: 125.6, total: 200 },
        health: 'critical',
      },
      {
        id: '4',
        type: 'full',
        status: 'success',
        startTime: new Date(Date.now() - 604800000),
        duration: 2700, // 45 minutes
        dataSize: 18700000000, // 18.7 GB
        lastBackup: new Date(Date.now() - 604800000),
        nextScheduled: new Date(Date.now() + 86400000),
        storageUsage: { used: 143.2, total: 260 },
        health: 'warning',
      },
    ];

    const mockRecoveryPoints: RecoveryPoint[] = [
      {
        id: '1',
        timestamp: new Date(Date.now() - 3600000),
        type: 'automatic',
        status: 'healthy',
        size: 2.4,
        description: 'Daily database backup',
      },
      {
        id: '2',
        timestamp: new Date(Date.now() - 86400000),
        type: 'manual',
        status: 'healthy',
        size: 15.8,
        description: 'Pre-deployment backup',
      },
      {
        id: '3',
        timestamp: new Date(Date.now() - 172800000),
        type: 'automatic',
        status: 'corrupted',
        size: 14.2,
        description: 'Weekly full backup',
      },
      {
        id: '4',
        timestamp: new Date(Date.now() - 604800000),
        type: 'automatic',
        status: 'healthy',
        size: 18.7,
        description: 'Weekly full system backup',
      },
      {
        id: '5',
        timestamp: new Date(Date.now() - 1209600000),
        type: 'manual',
        status: 'healthy',
        size: 12.3,
        description: 'Pre-maintenance backup',
      },
    ];

    setTimeout(() => {
      setBackupStatuses(mockBackupStatuses);
      setRecoveryPoints(mockRecoveryPoints);
      setIsLoading(false);
    }, 1000);
  }, []);

  // Real-time updates simulation - Team B will implement WebSocket/polling
  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefresh(new Date());
      // Update backup statuses here
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsLoading(true);
    setLastRefresh(new Date());
    // Trigger manual refresh - Team B will implement
    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  const getOverallHealth = () => {
    const criticalCount = backupStatuses.filter(
      (status) => status.health === 'critical',
    ).length;
    const warningCount = backupStatuses.filter(
      (status) => status.health === 'warning',
    ).length;

    if (criticalCount > 0) return 'critical';
    if (warningCount > 0) return 'warning';
    return 'healthy';
  };

  const overallHealth = getOverallHealth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      {/* Header Section */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Backup Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor and manage wedding data protection systems
            </p>
          </div>

          <div className="flex items-center space-x-4 mt-4 sm:mt-0">
            {/* Overall Health Indicator */}
            <div className="flex items-center space-x-2">
              {overallHealth === 'healthy' && (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              )}
              {overallHealth === 'warning' && (
                <AlertCircle className="w-5 h-5 text-yellow-500" />
              )}
              {overallHealth === 'critical' && (
                <AlertCircle className="w-5 h-5 text-red-500" />
              )}
              <span
                className={`text-sm font-medium ${
                  overallHealth === 'healthy'
                    ? 'text-green-700 dark:text-green-300'
                    : overallHealth === 'warning'
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-red-700 dark:text-red-300'
                }`}
              >
                System{' '}
                {overallHealth === 'healthy'
                  ? 'Healthy'
                  : overallHealth === 'warning'
                    ? 'Attention'
                    : 'Critical'}
              </span>
            </div>

            {/* Last Refresh */}
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>Updated {lastRefresh.toLocaleTimeString()}</span>
            </div>

            {/* Manual Refresh Button */}
            <button
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 dark:focus:ring-offset-gray-900 transition-colors duration-200"
              disabled={isLoading}
            >
              <Database className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Status Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {backupStatuses.map((status) => {
          const getStatusColor = () => {
            switch (status.status) {
              case 'success':
                return 'text-green-600 dark:text-green-400';
              case 'running':
                return 'text-blue-600 dark:text-blue-400';
              case 'failed':
                return 'text-red-600 dark:text-red-400';
              default:
                return 'text-gray-600 dark:text-gray-400';
            }
          };

          const getStatusIcon = () => {
            const iconClass = 'w-5 h-5';
            switch (status.status) {
              case 'success':
                return (
                  <CheckCircle2
                    className={`${iconClass} text-green-600 dark:text-green-400`}
                  />
                );
              case 'running':
                return (
                  <Clock
                    className={`${iconClass} text-blue-600 dark:text-blue-400 animate-pulse`}
                  />
                );
              case 'failed':
                return (
                  <AlertCircle
                    className={`${iconClass} text-red-600 dark:text-red-400`}
                  />
                );
              default:
                return (
                  <Clock
                    className={`${iconClass} text-gray-600 dark:text-gray-400`}
                  />
                );
            }
          };

          const getProgressPercentage = () => {
            return Math.min(
              (status.storageUsage.used / status.storageUsage.total) * 100,
              100,
            );
          };

          const getProgressColor = () => {
            const percentage = getProgressPercentage();
            if (percentage >= 90) return 'bg-red-500';
            if (percentage >= 75) return 'bg-yellow-500';
            return 'bg-green-500';
          };

          return (
            <div
              key={status.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                    <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                      {status.type} Backup
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusIcon()}
                      <span
                        className={`text-sm font-medium capitalize ${getStatusColor()}`}
                      >
                        {status.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Storage Usage */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Storage Usage
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {status.storageUsage.used.toFixed(1)} /{' '}
                    {status.storageUsage.total} GB
                  </span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor()} transition-all duration-300 ease-out`}
                    style={{ width: `${getProgressPercentage()}%` }}
                  >
                    {status.status === 'running' && (
                      <div className="h-full w-full bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Details */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Last backup:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {Math.floor(
                      (Date.now() - status.lastBackup.getTime()) /
                        (1000 * 60 * 60),
                    )}
                    h ago
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Next scheduled:
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {Math.floor(
                      (status.nextScheduled.getTime() - Date.now()) /
                        (1000 * 60 * 60),
                    )}
                    h
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Timeline and History */}
        <div className="xl:col-span-2 space-y-8">
          {/* Recovery Point Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recovery Points
              </h2>
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <RecoveryPointTimeline recoveryPoints={recoveryPoints} />
          </div>

          {/* Backup History */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Backup History
              </h2>
              <HardDrive className="w-5 h-5 text-purple-600" />
            </div>
            <BackupHistoryTable />
          </div>
        </div>

        {/* Right Column - Manual Backup */}
        <div className="xl:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 sticky top-8">
            <ManualBackupForm onBackupTrigger={() => handleRefresh()} />
          </div>
        </div>
      </div>
    </div>
  );
};

export { WS191BackupDashboard };
export default WS191BackupDashboard;
