'use client';

import React, { useMemo } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  HardDrive,
  Calendar,
  TrendingUp,
  Database,
  Shield,
} from 'lucide-react';
import type { BackupMetrics } from '../../../types/backup';

interface BackupStatusCardProps {
  metrics: BackupMetrics;
  isLoading: boolean;
  weddingId?: string;
}

interface StatusIndicator {
  label: string;
  value: string | number;
  status: 'success' | 'warning' | 'error' | 'info';
  icon: React.ElementType;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
}

export function BackupStatusCard({
  metrics,
  isLoading,
  weddingId,
}: BackupStatusCardProps) {
  const statusIndicators = useMemo<StatusIndicator[]>(() => {
    const indicators: StatusIndicator[] = [];

    // Success Rate Indicator
    const successRate = metrics.successRate;
    indicators.push({
      label: 'Success Rate',
      value: `${successRate.toFixed(1)}%`,
      status:
        successRate >= 95 ? 'success' : successRate >= 85 ? 'warning' : 'error',
      icon: successRate >= 90 ? CheckCircle : AlertCircle,
      description: `${metrics.totalBackups} total backups`,
      trend: 'stable',
    });

    // Last Backup Status
    const lastBackup = metrics.lastSuccessfulBackup;
    if (lastBackup) {
      const hoursAgo = Math.floor(
        (Date.now() - new Date(lastBackup).getTime()) / (1000 * 60 * 60),
      );
      const daysAgo = Math.floor(hoursAgo / 24);

      let timeDisplay: string;
      let status: 'success' | 'warning' | 'error';

      if (hoursAgo < 24) {
        timeDisplay = `${hoursAgo}h ago`;
        status = hoursAgo <= 25 ? 'success' : 'warning';
      } else {
        timeDisplay = `${daysAgo}d ago`;
        status = daysAgo <= 1 ? 'success' : daysAgo <= 7 ? 'warning' : 'error';
      }

      indicators.push({
        label: 'Last Backup',
        value: timeDisplay,
        status,
        icon: Clock,
        description: new Date(lastBackup).toLocaleDateString(),
        trend: 'stable',
      });
    }

    // Storage Usage
    const storagePercent = (metrics.storageUsed / metrics.storageLimit) * 100;
    indicators.push({
      label: 'Storage Used',
      value: `${storagePercent.toFixed(1)}%`,
      status:
        storagePercent < 70
          ? 'success'
          : storagePercent < 90
            ? 'warning'
            : 'error',
      icon: HardDrive,
      description: `${formatBytes(metrics.storageUsed)} of ${formatBytes(metrics.storageLimit)}`,
      trend: 'up',
    });

    // Next Scheduled Backup
    const nextBackup = metrics.nextScheduledBackup;
    if (nextBackup) {
      const hoursUntil = Math.floor(
        (new Date(nextBackup).getTime() - Date.now()) / (1000 * 60 * 60),
      );
      const daysUntil = Math.floor(hoursUntil / 24);

      let timeDisplay: string;
      if (hoursUntil < 24) {
        timeDisplay = `${hoursUntil}h`;
      } else {
        timeDisplay = `${daysUntil}d`;
      }

      indicators.push({
        label: 'Next Backup',
        value: timeDisplay,
        status: 'info',
        icon: Calendar,
        description: new Date(nextBackup).toLocaleString(),
        trend: 'stable',
      });
    }

    return indicators;
  }, [metrics]);

  // Format bytes to human readable format
  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Get status color classes
  function getStatusClasses(status: StatusIndicator['status']) {
    switch (status) {
      case 'success':
        return {
          bg: 'bg-success-50',
          border: 'border-success-200',
          icon: 'text-success-500',
          text: 'text-success-900',
          value: 'text-success-700',
        };
      case 'warning':
        return {
          bg: 'bg-warning-50',
          border: 'border-warning-200',
          icon: 'text-warning-500',
          text: 'text-warning-900',
          value: 'text-warning-700',
        };
      case 'error':
        return {
          bg: 'bg-error-50',
          border: 'border-error-200',
          icon: 'text-error-500',
          text: 'text-error-900',
          value: 'text-error-700',
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: 'text-gray-500',
          text: 'text-gray-900',
          value: 'text-gray-700',
        };
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-lg border border-gray-200 p-6 shadow-xs animate-pulse"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
              <div className="w-4 h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="space-y-2">
              <div className="w-16 h-8 bg-gray-200 rounded"></div>
              <div className="w-24 h-4 bg-gray-200 rounded"></div>
              <div className="w-20 h-3 bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statusIndicators.map((indicator, index) => {
        const Icon = indicator.icon;
        const classes = getStatusClasses(indicator.status);

        return (
          <div
            key={index}
            className={`bg-white rounded-lg border p-6 shadow-xs hover:shadow-sm transition-shadow ${classes.border}`}
            role="region"
            aria-labelledby={`indicator-${index}-label`}
          >
            <div className="flex items-center justify-between mb-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${classes.bg}`}
              >
                <Icon
                  className={`w-5 h-5 ${classes.icon}`}
                  aria-hidden="true"
                />
              </div>

              {indicator.trend && (
                <div className="flex items-center">
                  <TrendingUp
                    className={`w-4 h-4 ${
                      indicator.trend === 'up'
                        ? 'text-success-500'
                        : indicator.trend === 'down'
                          ? 'text-error-500'
                          : 'text-gray-400'
                    }`}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1">
              <div className={`text-2xl font-bold ${classes.value}`}>
                {indicator.value}
              </div>

              <div
                id={`indicator-${index}-label`}
                className={`text-sm font-medium ${classes.text}`}
              >
                {indicator.label}
              </div>

              {indicator.description && (
                <div className="text-xs text-gray-500">
                  {indicator.description}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Overall System Health Card */}
      <div className="sm:col-span-2 lg:col-span-4">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Wedding Data Protection Status
              </h3>
              <p className="text-sm text-gray-600">
                Your precious memories and important information are being
                protected
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Photos Protection */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Database className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  Wedding Photos
                </div>
                <div className="text-xs text-gray-600">
                  {formatBytes(metrics.totalDataSize * 0.6)} backed up
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-success-500" />
            </div>

            {/* Guest Data Protection */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Database className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  Guest Lists
                </div>
                <div className="text-xs text-gray-600">
                  Contact data secured
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-success-500" />
            </div>

            {/* Vendor Information */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Database className="w-5 h-5 text-gray-600" />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  Vendor Info
                </div>
                <div className="text-xs text-gray-600">
                  Contracts & payments
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-success-500" />
            </div>
          </div>

          {/* Emergency Access Note */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <strong>Emergency Access:</strong> Your data can be quickly
                restored if needed during wedding coordination. Contact support
                at (555) 123-4567 for immediate assistance.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BackupStatusCard;
