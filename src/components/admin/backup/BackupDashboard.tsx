'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertCircle,
  Shield,
  Settings,
  Download,
  RefreshCw,
} from 'lucide-react';
import { BackupStatusCard } from './BackupStatusCard';
import { BackupHistoryTable } from './BackupHistoryTable';
import { BackupConfigPanel } from './BackupConfigPanel';
import type {
  BackupMetrics,
  BackupHistoryEntry,
  BackupConfig,
  BackupDashboardProps,
  BackupFilters,
  BackupError,
} from '../../../types/backup';

interface BackupDashboardState {
  metrics: BackupMetrics | null;
  history: BackupHistoryEntry[];
  configs: BackupConfig[];
  filters: BackupFilters;
  isLoading: boolean;
  error: BackupError | null;
  showConfigPanel: boolean;
  lastRefresh: Date;
}

export function BackupDashboard({
  weddingId,
  userRole = 'couple',
  onConfigChange,
  onRestore,
}: BackupDashboardProps) {
  const [state, setState] = useState<BackupDashboardState>({
    metrics: null,
    history: [],
    configs: [],
    filters: {
      status: 'all',
      dateRange: '30d',
    },
    isLoading: true,
    error: null,
    showConfigPanel: false,
    lastRefresh: new Date(),
  });

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      const [metricsResponse, historyResponse, configsResponse] =
        await Promise.all([
          fetch(
            `/api/backup/metrics${weddingId ? `?weddingId=${weddingId}` : ''}`,
          ),
          fetch(
            `/api/backup/history${weddingId ? `?weddingId=${weddingId}` : ''}`,
          ),
          userRole === 'admin'
            ? fetch(
                `/api/backup/configs${weddingId ? `?weddingId=${weddingId}` : ''}`,
              )
            : Promise.resolve({ ok: true, json: () => [] }),
        ]);

      if (!metricsResponse.ok || !historyResponse.ok) {
        throw new Error('Failed to fetch backup data');
      }

      const [metrics, history, configs] = await Promise.all([
        metricsResponse.json(),
        historyResponse.json(),
        configsResponse.ok ? configsResponse.json() : [],
      ]);

      setState((prev) => ({
        ...prev,
        metrics,
        history,
        configs,
        isLoading: false,
        lastRefresh: new Date(),
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: new BackupError(
          error instanceof Error
            ? error.message
            : 'Failed to load backup dashboard',
          'FETCH_ERROR',
          'high',
        ),
        isLoading: false,
      }));
    }
  };

  // Set up real-time updates
  useEffect(() => {
    fetchDashboardData();

    // Set up WebSocket for real-time updates if available
    if (typeof window !== 'undefined' && 'WebSocket' in window) {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${window.location.host}/api/backup/ws${weddingId ? `?weddingId=${weddingId}` : ''}`;

      try {
        const ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'backup_update') {
              fetchDashboardData(); // Refresh data on updates
            }
          } catch (e) {
            console.warn('Failed to parse WebSocket message:', e);
          }
        };

        ws.onerror = () => {
          console.warn('WebSocket connection failed, falling back to polling');
        };

        // Cleanup on unmount
        return () => {
          ws.close();
        };
      } catch (e) {
        console.warn('WebSocket not available, using polling');
      }
    }

    // Fallback polling every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [weddingId, userRole]);

  // Calculate critical alerts
  const criticalAlerts = useMemo(() => {
    const alerts = [];

    if (state.metrics) {
      if (state.metrics.successRate < 90) {
        alerts.push({
          level: 'critical',
          message: `Backup success rate is ${state.metrics.successRate.toFixed(1)}% (below 90% threshold)`,
          action: 'Review failed backups and configuration',
        });
      }

      if (state.metrics.lastSuccessfulBackup) {
        const daysSinceLastBackup = Math.floor(
          (new Date().getTime() -
            new Date(state.metrics.lastSuccessfulBackup).getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysSinceLastBackup > 7) {
          alerts.push({
            level: 'critical',
            message: `Last successful backup was ${daysSinceLastBackup} days ago`,
            action: 'Run manual backup immediately',
          });
        }
      }

      if (state.metrics.storageUsed / state.metrics.storageLimit > 0.9) {
        alerts.push({
          level: 'warning',
          message: `Storage usage is ${Math.round((state.metrics.storageUsed / state.metrics.storageLimit) * 100)}%`,
          action: 'Consider increasing storage or adjusting retention',
        });
      }
    }

    return alerts;
  }, [state.metrics]);

  const handleRefresh = () => {
    fetchDashboardData();
  };

  const handleConfigPanelToggle = () => {
    setState((prev) => ({ ...prev, showConfigPanel: !prev.showConfigPanel }));
  };

  if (state.error) {
    return (
      <div className="min-h-screen bg-gray-25 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white border border-error-300 rounded-lg p-6 shadow-xs">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-error-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-error-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Backup Dashboard Error
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {state.error.message}
                </p>
              </div>
            </div>
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-25">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Backup Dashboard
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Protect your precious wedding data
                  {state.lastRefresh && (
                    <span className="ml-2">
                      • Last updated {state.lastRefresh.toLocaleTimeString()}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={state.isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Refresh dashboard data"
              >
                <RefreshCw
                  className={`w-4 h-4 ${state.isLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </button>

              {userRole === 'admin' && (
                <button
                  onClick={handleConfigPanelToggle}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Configure</span>
                </button>
              )}
            </div>
          </div>

          {/* Critical Alerts */}
          {criticalAlerts.length > 0 && (
            <div className="mt-6 space-y-3">
              {criticalAlerts.map((alert, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    alert.level === 'critical'
                      ? 'bg-error-50 border-error-200 text-error-800'
                      : 'bg-warning-50 border-warning-200 text-warning-800'
                  }`}
                  role="alert"
                >
                  <div className="flex items-start gap-3">
                    <AlertCircle
                      className={`w-5 h-5 flex-shrink-0 ${
                        alert.level === 'critical'
                          ? 'text-error-500'
                          : 'text-warning-500'
                      }`}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{alert.message}</p>
                      <p className="text-sm mt-1 opacity-90">{alert.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="grid gap-6">
          {/* Status Cards */}
          {state.metrics && (
            <BackupStatusCard
              metrics={state.metrics}
              isLoading={state.isLoading}
              weddingId={weddingId}
            />
          )}

          {/* History Table */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-xs">
            <div className="p-6 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Backup History
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Recent backup operations and their status
                  </p>
                </div>

                <button
                  onClick={() => {
                    // Export backup history functionality
                    const csvData = state.history.map((entry) => ({
                      Date: new Date(entry.startTime).toLocaleString(),
                      Type: entry.type,
                      Status: entry.status,
                      Duration: entry.duration
                        ? `${Math.round(entry.duration / 1000)}s`
                        : 'N/A',
                      Size: `${Math.round(entry.dataSize / 1024 / 1024)} MB`,
                    }));

                    const csv = [
                      Object.keys(csvData[0] || {}).join(','),
                      ...csvData.map((row) => Object.values(row).join(',')),
                    ].join('\n');

                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup-history-${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
              </div>
            </div>

            <BackupHistoryTable
              history={state.history}
              filters={state.filters}
              onFiltersChange={(filters) =>
                setState((prev) => ({ ...prev, filters }))
              }
              onRestore={onRestore}
              isLoading={state.isLoading}
              userRole={userRole}
            />
          </div>

          {/* Configuration Panel */}
          {state.showConfigPanel && userRole === 'admin' && (
            <BackupConfigPanel
              configs={state.configs}
              onConfigChange={(config) => {
                onConfigChange?.(config);
                fetchDashboardData(); // Refresh after changes
              }}
              onClose={handleConfigPanelToggle}
              weddingId={weddingId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default BackupDashboard;
