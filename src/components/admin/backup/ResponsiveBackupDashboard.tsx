'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import BackupStatusWidget, {
  BackupProgress,
  BackupOperation,
  BackupSystemHealth,
} from './mobile/BackupStatusWidget';
import {
  Database,
  Activity,
  Settings,
  BarChart3,
  Shield,
  Smartphone,
  Monitor,
  Tablet,
} from 'lucide-react';

interface ResponsiveBackupDashboardProps {
  className?: string;
}

interface BackupMetrics {
  totalBackups: number;
  successRate: number;
  totalDataProtected: string;
  avgBackupTime: string;
  lastWeekBackups: number;
  criticalErrors: number;
}

interface BackupHistory {
  backups: BackupOperation[];
  totalCount: number;
}

export function ResponsiveBackupDashboard({
  className,
}: ResponsiveBackupDashboardProps) {
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>(
    'desktop',
  );
  const [currentBackup, setCurrentBackup] = useState<
    BackupProgress | undefined
  >();
  const [lastBackup, setLastBackup] = useState<BackupOperation | undefined>();
  const [systemHealth, setSystemHealth] = useState<BackupSystemHealth>({
    status: 'healthy',
    lastCheck: new Date().toISOString(),
    storageUsed: 750,
    storageTotal: 1000,
    uptime: '99.9%',
    activeConnections: 12,
    errorRate: 0.1,
    performance: 'excellent',
  });
  const [metrics, setMetrics] = useState<BackupMetrics>({
    totalBackups: 1247,
    successRate: 99.2,
    totalDataProtected: '2.4 TB',
    avgBackupTime: '15m 32s',
    lastWeekBackups: 28,
    criticalErrors: 0,
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Responsive breakpoint detection
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    handleResize(); // Set initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mock data initialization
  useEffect(() => {
    // Simulate current backup progress
    const hasCurrentBackup = Math.random() > 0.7;
    if (hasCurrentBackup) {
      setCurrentBackup({
        id: 'backup-current-001',
        type: 'incremental',
        progress: Math.floor(Math.random() * 90) + 5,
        startTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        estimatedCompletion: new Date(
          Date.now() + 10 * 60 * 1000,
        ).toISOString(),
        processedFiles: Math.floor(Math.random() * 5000) + 1000,
        totalFiles: 6234,
        currentOperation: 'Processing wedding photos from Q4 2024',
        speed: '45.2 MB/s',
      });
    }

    // Set last backup
    setLastBackup({
      id: 'backup-last-001',
      type: 'full',
      status: 'completed',
      startTime: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      endTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      filesBackedUp: 15847,
      totalSize: '847 GB',
      errorCount: 0,
      location: 'AWS S3 eu-west-1/wedsync-backup-prod',
    });
  }, []);

  const handleManualBackup = async () => {
    console.log('Manual backup triggered from responsive dashboard');
    // Simulate backup trigger
    setCurrentBackup({
      id: 'backup-manual-001',
      type: 'emergency',
      progress: 0,
      startTime: new Date().toISOString(),
      processedFiles: 0,
      totalFiles: 1000,
      currentOperation: 'Initializing emergency backup...',
      speed: '0 MB/s',
    });
  };

  const handleRefresh = async () => {
    console.log('Refreshing backup dashboard data');
    // Update system health check time
    setSystemHealth((prev) => ({
      ...prev,
      lastCheck: new Date().toISOString(),
    }));
  };

  const getDeviceIcon = () => {
    switch (screenSize) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  // Mobile View (320px - 767px)
  const MobileView = () => (
    <div className="space-y-4 p-4">
      {/* Device indicator */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Backup Monitor</h1>
        <div className="flex items-center space-x-2 text-gray-500">
          {getDeviceIcon()}
          <span className="text-sm">Mobile</span>
        </div>
      </div>

      {/* Primary status widget - mobile optimized */}
      <BackupStatusWidget
        currentBackup={currentBackup}
        lastSuccessfulBackup={lastBackup}
        nextScheduledBackup={new Date(Date.now() + 6 * 60 * 60 * 1000)}
        systemHealth={systemHealth}
        mobileOptimized={true}
        onManualBackup={handleManualBackup}
        onRefresh={handleRefresh}
      />

      {/* Simplified metrics cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {metrics.successRate}%
            </div>
            <div className="text-xs text-gray-600">Success Rate</div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {metrics.totalDataProtected}
            </div>
            <div className="text-xs text-gray-600">Protected</div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {metrics.lastWeekBackups}
            </div>
            <div className="text-xs text-gray-600">This Week</div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {metrics.avgBackupTime}
            </div>
            <div className="text-xs text-gray-600">Avg Time</div>
          </div>
        </Card>
      </div>

      {/* Critical alerts */}
      {metrics.criticalErrors > 0 && (
        <Card className="p-4 border-red-200 bg-red-50">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-red-500" />
            <div>
              <div className="font-semibold text-red-700">Critical Issues</div>
              <div className="text-sm text-red-600">
                {metrics.criticalErrors} issues require attention
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );

  // Tablet View (768px - 1023px)
  const TabletView = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Database className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">Backup Dashboard</h1>
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          {getDeviceIcon()}
          <span className="text-sm">Tablet</span>
        </div>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <Activity className="w-4 h-4" />
            <span>Status</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center space-x-2">
            <BarChart3 className="w-4 h-4" />
            <span>Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Two column layout for tablet */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Status widget */}
            <div className="lg:col-span-1">
              <BackupStatusWidget
                currentBackup={currentBackup}
                lastSuccessfulBackup={lastBackup}
                nextScheduledBackup={new Date(Date.now() + 6 * 60 * 60 * 1000)}
                systemHealth={systemHealth}
                mobileOptimized={true}
                onManualBackup={handleManualBackup}
                onRefresh={handleRefresh}
              />
            </div>

            {/* Metrics overview */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="p-4">
                <h3 className="font-semibold mb-3">Performance Metrics</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">
                      {metrics.totalBackups}
                    </div>
                    <div className="text-sm text-gray-600">Total Backups</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      {metrics.successRate}%
                    </div>
                    <div className="text-sm text-gray-600">Success Rate</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">
                      {metrics.totalDataProtected}
                    </div>
                    <div className="text-sm text-gray-600">Data Protected</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-orange-600">
                      {metrics.avgBackupTime}
                    </div>
                    <div className="text-sm text-gray-600">Average Time</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">System Status</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uptime</span>
                    <Badge variant="secondary">{systemHealth.uptime}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Active Connections</span>
                    <span className="font-medium">
                      {systemHealth.activeConnections}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Error Rate</span>
                    <span className="font-medium">
                      {systemHealth.errorRate}%
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Backup Frequency</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>This Week</span>
                  <span className="font-medium">
                    {metrics.lastWeekBackups} backups
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full"
                    style={{
                      width: `${(metrics.lastWeekBackups / 35) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  Target: 35 backups/week
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="font-semibold mb-4">Storage Utilization</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Used Space</span>
                  <span className="font-medium">
                    {systemHealth.storageUsed} GB / {systemHealth.storageTotal}{' '}
                    GB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full"
                    style={{
                      width: `${(systemHealth.storageUsed / systemHealth.storageTotal) * 100}%`,
                    }}
                  />
                </div>
                <div className="text-sm text-gray-600">
                  {Math.round(
                    (systemHealth.storageUsed / systemHealth.storageTotal) *
                      100,
                  )}
                  % utilized
                </div>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Backup Configuration</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Automatic Backups</div>
                  <div className="text-sm text-gray-600">
                    Run backups every 6 hours
                  </div>
                </div>
                <Badge variant="secondary">Enabled</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Emergency Notifications</div>
                  <div className="text-sm text-gray-600">
                    Alert when backups fail
                  </div>
                </div>
                <Badge variant="secondary">Enabled</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Mobile Optimization</div>
                  <div className="text-sm text-gray-600">
                    Reduce battery usage on mobile
                  </div>
                </div>
                <Badge variant="secondary">Active</Badge>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );

  // Desktop View (1024px+)
  const DesktopView = () => (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Database className="w-10 h-10 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold">Backup System Dashboard</h1>
            <p className="text-gray-600">
              Comprehensive backup monitoring and management
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-gray-500">
          {getDeviceIcon()}
          <span className="text-sm">Desktop</span>
        </div>
      </div>

      {/* Desktop full-width layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Main status area */}
        <div className="col-span-8">
          <BackupStatusWidget
            currentBackup={currentBackup}
            lastSuccessfulBackup={lastBackup}
            nextScheduledBackup={new Date(Date.now() + 6 * 60 * 60 * 1000)}
            systemHealth={systemHealth}
            mobileOptimized={false}
            onManualBackup={handleManualBackup}
            onRefresh={handleRefresh}
          />
        </div>

        {/* Sidebar metrics */}
        <div className="col-span-4 space-y-6">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Key Metrics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total Backups</span>
                <span className="text-2xl font-bold text-blue-600">
                  {metrics.totalBackups}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Success Rate</span>
                <span className="text-2xl font-bold text-green-600">
                  {metrics.successRate}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Data Protected</span>
                <span className="text-2xl font-bold text-purple-600">
                  {metrics.totalDataProtected}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Avg Duration</span>
                <span className="text-2xl font-bold text-orange-600">
                  {metrics.avgBackupTime}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold mb-4">System Performance</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Performance</span>
                <Badge
                  variant={
                    systemHealth.performance === 'excellent'
                      ? 'default'
                      : 'secondary'
                  }
                >
                  {systemHealth.performance}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Uptime</span>
                <span className="font-medium">{systemHealth.uptime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Connections</span>
                <span className="font-medium">
                  {systemHealth.activeConnections}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Error Rate</span>
                <span className="font-medium">{systemHealth.errorRate}%</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen bg-gray-50 ${className}`}>
      {screenSize === 'mobile' && <MobileView />}
      {screenSize === 'tablet' && <TabletView />}
      {screenSize === 'desktop' && <DesktopView />}
    </div>
  );
}

export default ResponsiveBackupDashboard;
