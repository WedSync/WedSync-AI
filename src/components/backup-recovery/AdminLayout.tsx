'use client';

import React, { useState, useEffect } from 'react';
import AdminBackupNavigation from './AdminBackupNavigation';
import BackupDashboard from './BackupDashboard';
import EmergencyRecovery from './EmergencyRecovery';
import DataRecoveryPreview from './DataRecoveryPreview';
import DisasterTimelineVisualizer from './DisasterTimelineVisualizer';
import {
  BackupStatusWidget,
  CriticalDataProtectionWidget,
  RecoveryEstimatorWidget,
  SystemAlertsWidget,
  BackupPerformanceWidget,
  WeddingSeasonWidget,
} from './BackupMonitoringWidgets';

// Types for admin layout
interface AdminLayoutProps {
  children?: React.ReactNode;
  currentView?:
    | 'dashboard'
    | 'emergency'
    | 'timeline'
    | 'monitoring'
    | 'settings';
  userRole?: 'admin' | 'super-admin' | 'operator';
}

// Mock data - in real implementation, these would come from APIs/hooks
const mockSystemHealth = {
  overallStatus: 'healthy' as const,
  lastBackup: '2025-01-22T10:00:00Z',
  nextScheduled: '2025-01-22T22:00:00Z',
  backupSuccess: true,
  storageUsed: '45.2 GB',
  storageLimit: '100 GB',
  replicationStatus: 'active' as const,
  alerts: [],
};

const mockRecentBackups = [
  {
    id: 'backup-001',
    timestamp: '2025-01-22T10:00:00Z',
    type: 'scheduled',
    status: 'completed',
    size: '2.1 GB',
    weddingCount: 15,
    duration: '12m 34s',
    dataTypes: ['guest-lists', 'photos', 'timelines'],
  },
];

const mockWeddingCriticalData = [
  {
    weddingId: 'wedding-001',
    coupleName: 'Sarah & John',
    weddingDate: '2025-01-25T14:00:00Z',
    daysUntil: 3,
    lastBackup: '2025-01-22T10:00:00Z',
    backupStatus: 'recent',
    criticalSystems: ['guest-list', 'timeline', 'photos'],
    riskLevel: 'low',
  },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({
  children,
  currentView = 'dashboard',
  userRole = 'admin',
}) => {
  const [systemHealth, setSystemHealth] = useState<
    'healthy' | 'warning' | 'critical'
  >('healthy');
  const [criticalAlerts, setCriticalAlerts] = useState(0);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [activeRecovery, setActiveRecovery] = useState<any>(null);

  // Simulate system health monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      // In real implementation, this would fetch from monitoring API
      const healthStates = ['healthy', 'warning', 'critical'] as const;
      const randomHealth =
        healthStates[Math.floor(Math.random() * healthStates.length)];
      setSystemHealth(randomHealth);
      setCriticalAlerts(
        randomHealth === 'critical' ? 2 : randomHealth === 'warning' ? 1 : 0,
      );
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleEmergencyAccess = () => {
    setEmergencyMode(true);
    // Navigate to emergency recovery or trigger emergency modal
  };

  const handleEmergencyRestore = async (backupId: string) => {
    console.log('Emergency restore initiated for backup:', backupId);
    setActiveRecovery({
      id: 'recovery-001',
      backupId,
      startTime: new Date().toISOString(),
      status: 'in-progress',
    });
  };

  const handleSelectiveRestore = async (dataTypes: string[], options: any) => {
    console.log('Selective restore initiated:', { dataTypes, options });
    // Implementation for selective restore
  };

  const handleRefreshData = async () => {
    console.log('Refreshing backup data...');
    // Implementation for data refresh
  };

  const handleScheduleBackup = async () => {
    console.log('Scheduling backup...');
    // Implementation for backup scheduling
  };

  const handleForceBackup = async () => {
    console.log('Forcing immediate backup...');
    // Implementation for immediate backup
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            {/* Main Dashboard */}
            <BackupDashboard
              systemHealth={mockSystemHealth}
              recentBackups={mockRecentBackups}
              weddingCriticalData={mockWeddingCriticalData}
              onEmergencyRestore={handleEmergencyRestore}
              onRefreshData={handleRefreshData}
              onScheduleBackup={handleScheduleBackup}
              onForceBackup={handleForceBackup}
            />

            {/* Quick Access Widgets */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <BackupStatusWidget />
              <CriticalDataProtectionWidget />
              <RecoveryEstimatorWidget />
              <SystemAlertsWidget />
              <BackupPerformanceWidget />
              <WeddingSeasonWidget />
            </div>
          </div>
        );

      case 'emergency':
        return (
          <EmergencyRecovery
            availableBackups={mockRecentBackups.map((backup) => ({
              ...backup,
              integrity: 'verified' as const,
              encryption: 'encrypted' as const,
            }))}
            affectedWeddings={mockWeddingCriticalData.map((wedding) => ({
              weddingId: wedding.weddingId,
              coupleName: wedding.coupleName,
              weddingDate: wedding.weddingDate,
              daysUntil: wedding.daysUntil,
              urgencyLevel:
                wedding.riskLevel === 'high'
                  ? ('critical' as const)
                  : ('high' as const),
              affectedSystems: wedding.criticalSystems,
              dataLossRisk: 'moderate' as const,
              businessImpact: 'high' as const,
            }))}
            emergencyContext={{
              incidentId: 'incident-001',
              incidentType: 'data-corruption',
              severity: 'critical',
              detectedAt: new Date().toISOString(),
              affectedSystems: ['database', 'photo-storage'],
              estimatedImpactUsers: 145,
            }}
            onInitiateRecovery={handleEmergencyRestore}
            onCancel={() => setEmergencyMode(false)}
          />
        );

      case 'timeline':
        return activeRecovery ? (
          <DisasterTimelineVisualizer
            incidentTimeline={{
              incidentId: activeRecovery.id,
              startTime: activeRecovery.startTime,
              incidentType: 'data-corruption',
              severity: 'critical',
              affectedWeddings: mockWeddingCriticalData.map((wedding) => ({
                weddingId: wedding.weddingId,
                coupleName: wedding.coupleName,
                weddingDate: wedding.weddingDate,
                daysUntilWedding: wedding.daysUntil,
                impactLevel: 'severe' as const,
                affectedSystems: wedding.criticalSystems,
                priorityLevel: wedding.riskLevel === 'high' ? 1 : 2,
              })),
              detectedBy: 'system-monitoring',
              initialResponse: 'Emergency recovery initiated',
            }}
            recoveryProgress={{
              currentStep: 2,
              totalSteps: 6,
              milestones: [
                {
                  id: 'milestone-001',
                  order: 1,
                  title: 'Impact Assessment',
                  description: 'Evaluating scope of data loss',
                  status: 'completed',
                  dependencies: [],
                  weddingImpact: 'none',
                  automatedStep: true,
                  successCriteria: ['Scope identified'],
                },
                {
                  id: 'milestone-002',
                  order: 2,
                  title: 'Data Recovery',
                  description: 'Restoring critical wedding data',
                  status: 'in-progress',
                  dependencies: ['milestone-001'],
                  weddingImpact: 'high',
                  automatedStep: false,
                  successCriteria: ['Data restored', 'Integrity verified'],
                },
              ],
              overallStatus: 'in-progress',
              startedAt: activeRecovery.startTime,
              lastUpdated: new Date().toISOString(),
              nextMilestoneEta: new Date(Date.now() + 900000).toISOString(),
            }}
            estimatedCompletion={new Date(Date.now() + 3600000).toISOString()}
          />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No active recovery process</p>
          </div>
        );

      case 'monitoring':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <BackupStatusWidget />
            <CriticalDataProtectionWidget />
            <RecoveryEstimatorWidget />
            <SystemAlertsWidget />
            <BackupPerformanceWidget />
            <WeddingSeasonWidget />
          </div>
        );

      default:
        return (
          children || (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                Select a section from the navigation menu
              </p>
            </div>
          )
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <AdminBackupNavigation
        currentUserRole={userRole}
        systemHealth={systemHealth}
        criticalAlerts={criticalAlerts}
        onEmergencyAccess={handleEmergencyAccess}
      />

      {/* Main Content */}
      <main className="lg:pl-80 min-h-screen">
        <div className="p-6 max-w-7xl mx-auto">
          {/* Emergency Mode Banner */}
          {emergencyMode && (
            <div className="mb-6 bg-danger/10 border border-danger/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-danger rounded-full animate-pulse" />
                  <span className="font-semibold text-danger">
                    Emergency Mode Active
                  </span>
                </div>
                <button
                  onClick={() => setEmergencyMode(false)}
                  className="px-3 py-1 text-sm bg-danger text-danger-foreground rounded hover:bg-danger/90 transition-colors"
                >
                  Exit Emergency Mode
                </button>
              </div>
            </div>
          )}

          {/* Page Content */}
          {renderCurrentView()}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
