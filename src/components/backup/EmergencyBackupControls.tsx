/**
 * WS-258: Backup Strategy Implementation System - Emergency Backup Controls
 * Critical P1 system for protecting irreplaceable wedding data
 * Team A - React Component Development
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  Zap,
  Phone,
  Shield,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Database,
  HardDrive,
  Cloud,
  Server,
  Users,
  Camera,
  FileText,
  ArrowRight,
  PlayCircle,
  StopCircle,
  RotateCcw,
  MessageSquare,
  Bell,
  Eye,
  Activity,
} from 'lucide-react';
import {
  EmergencyResponse,
  EmergencyRecoveryDashboardProps,
  EmergencyAction,
  RecoveryProgress,
  BackupOperation,
  DataType,
} from './types';
import { cn } from '@/lib/utils';

interface EmergencyBackupControlsProps {
  emergencyStatus: EmergencyResponse | null;
  organizationId: string;
  onEmergencyAction: (action: EmergencyAction) => void;
  allowManualOverride?: boolean;
}

interface RecoverySession {
  id: string;
  type:
    | 'emergency-full'
    | 'selective-recovery'
    | 'wedding-specific'
    | 'system-restore';
  status: 'preparing' | 'in-progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startTime: Date;
  estimatedCompletion?: Date;
  recoveredFiles: number;
  totalFiles: number;
  recoveredSize: number;
  totalSize: number;
  weddingEventIds: string[];
  affectedDataTypes: DataType[];
}

// Helper function to get severity color
function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'low':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'high':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'critical':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

// Helper function to get incident type display name
function getIncidentTypeDisplay(type: string): string {
  switch (type) {
    case 'data-loss':
      return 'Data Loss Detected';
    case 'system-failure':
      return 'System Failure';
    case 'corruption':
      return 'Data Corruption';
    case 'security-breach':
      return 'Security Breach';
    default:
      return type.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }
}

// Helper function to format time duration
function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  } else {
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  }
}

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function EmergencyBackupControls({
  emergencyStatus,
  organizationId,
  onEmergencyAction,
  allowManualOverride = false,
}: EmergencyBackupControlsProps) {
  const [activeRecoverySession, setActiveRecoverySession] =
    useState<RecoverySession | null>(null);
  const [isInitiatingRecovery, setIsInitiatingRecovery] = useState(false);
  const [emergencyContacts, setEmergencyContacts] = useState({
    primaryContact: false,
    secondaryContact: false,
    supportTeam: false,
    emergencyServices: false,
  });
  const [systemStatus, setSystemStatus] = useState({
    localBackup: 'unknown',
    cloudBackup: 'unknown',
    offsiteBackup: 'unknown',
    replication: 'unknown',
  });

  // Simulate real-time updates for recovery progress
  useEffect(() => {
    if (
      activeRecoverySession &&
      activeRecoverySession.status === 'in-progress'
    ) {
      const interval = setInterval(() => {
        setActiveRecoverySession((prev) => {
          if (!prev) return null;

          const newProgress = Math.min(prev.progress + Math.random() * 5, 100);
          const isComplete = newProgress >= 100;

          return {
            ...prev,
            progress: newProgress,
            status: isComplete ? 'completed' : prev.status,
            recoveredFiles: Math.floor((newProgress / 100) * prev.totalFiles),
            recoveredSize: Math.floor((newProgress / 100) * prev.totalSize),
          };
        });
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [activeRecoverySession]);

  const handleEmergencyRecovery = async (recoveryType: string) => {
    setIsInitiatingRecovery(true);

    try {
      // Create new recovery session
      const newSession: RecoverySession = {
        id: `recovery-${Date.now()}`,
        type: recoveryType as any,
        status: 'preparing',
        progress: 0,
        startTime: new Date(),
        recoveredFiles: 0,
        totalFiles: 15420, // Simulated
        recoveredSize: 0,
        totalSize: 2.4 * 1024 * 1024 * 1024, // 2.4 GB simulated
        weddingEventIds: emergencyStatus?.affected_weddings || [],
        affectedDataTypes: emergencyStatus?.affected_data_types || [
          'photos',
          'client-data',
        ],
      };

      setActiveRecoverySession(newSession);

      // Simulate preparation phase
      setTimeout(() => {
        setActiveRecoverySession((prev) =>
          prev ? { ...prev, status: 'in-progress' } : null,
        );
      }, 3000);

      // Notify emergency action
      onEmergencyAction({
        type: 'initiate-recovery',
        parameters: { recoveryType, sessionId: newSession.id },
        authorization_required: recoveryType === 'emergency-full',
      });
    } catch (error) {
      console.error('Failed to initiate emergency recovery:', error);
    } finally {
      setIsInitiatingRecovery(false);
    }
  };

  const handleContactEmergencySupport = async () => {
    try {
      // Simulate contacting emergency support
      setEmergencyContacts((prev) => ({ ...prev, supportTeam: true }));

      onEmergencyAction({
        type: 'escalate-support',
        parameters: { urgency: 'critical', weddingDay: true },
        authorization_required: false,
      });
    } catch (error) {
      console.error('Failed to contact emergency support:', error);
    }
  };

  const handleSystemFailover = async () => {
    try {
      onEmergencyAction({
        type: 'activate-failover',
        parameters: {
          failoverType: 'cloud-backup',
          emergencyMode: true,
        },
        authorization_required: true,
      });
    } catch (error) {
      console.error('Failed to activate failover:', error);
    }
  };

  const isEmergencyActive =
    emergencyStatus && emergencyStatus.status !== 'normal';

  return (
    <div className="space-y-6">
      {/* Emergency Status Overview */}
      {isEmergencyActive ? (
        <Card className="border-red-600 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              ACTIVE EMERGENCY
              <Badge variant="destructive" className="animate-pulse">
                {emergencyStatus.severity.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Emergency backup recovery procedures are active
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Incident Type
                  </div>
                  <div className="font-semibold">
                    {getIncidentTypeDisplay(emergencyStatus.incident_type)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Affected Weddings
                  </div>
                  <div className="font-semibold text-red-600">
                    {emergencyStatus.affected_weddings.length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Response Time
                  </div>
                  <div className="font-semibold">
                    {emergencyStatus.response_time.toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">
                    Recovery Status
                  </div>
                  <div className="font-semibold">
                    {emergencyStatus.recovery_initiated ? (
                      <Badge
                        variant="default"
                        className="flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        In Progress
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Not Started</Badge>
                    )}
                  </div>
                </div>
              </div>

              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Critical Wedding Data at Risk</AlertTitle>
                <AlertDescription>
                  {emergencyStatus.affected_data_types.length} data type(s)
                  affected: {emergencyStatus.affected_data_types.join(', ')}
                  {emergencyStatus.estimated_recovery_time && (
                    <span className="block mt-1">
                      <strong>Estimated Recovery Time:</strong>{' '}
                      {emergencyStatus.estimated_recovery_time.toLocaleString()}
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-green-500" />
              Emergency Response Center
              <Badge variant="default">Standby</Badge>
            </CardTitle>
            <CardDescription>
              Emergency backup controls and disaster recovery procedures
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium mb-2">
                All Systems Operational
              </h3>
              <p className="text-muted-foreground mb-4">
                No emergency situations detected. Emergency response systems are
                ready and monitoring.
              </p>
              <div className="flex justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleEmergencyRecovery('system-restore')}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Test Emergency Systems
                </Button>
                <Button
                  variant="outline"
                  onClick={handleContactEmergencySupport}
                >
                  <Phone className="w-4 h-4 mr-1" />
                  Contact Support
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Action Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Immediate Recovery Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-red-500" />
              Immediate Recovery
            </CardTitle>
            <CardDescription>
              Critical recovery actions for wedding day emergencies
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              className="w-full bg-red-600 hover:bg-red-700"
              onClick={() => handleEmergencyRecovery('emergency-full')}
              disabled={
                isInitiatingRecovery ||
                activeRecoverySession?.status === 'in-progress'
              }
            >
              <Zap className="w-4 h-4 mr-2" />
              Full Emergency Recovery
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleEmergencyRecovery('wedding-specific')}
              disabled={
                isInitiatingRecovery ||
                activeRecoverySession?.status === 'in-progress'
              }
            >
              <Camera className="w-4 h-4 mr-2" />
              Wedding-Specific Recovery
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleEmergencyRecovery('selective-recovery')}
              disabled={
                isInitiatingRecovery ||
                activeRecoverySession?.status === 'in-progress'
              }
            >
              <Database className="w-4 h-4 mr-2" />
              Selective Data Recovery
            </Button>
          </CardContent>
        </Card>

        {/* Emergency Communications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5 text-blue-500" />
              Emergency Communications
            </CardTitle>
            <CardDescription>
              Contact emergency support and stakeholders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleContactEmergencySupport}
              disabled={emergencyContacts.supportTeam}
            >
              {emergencyContacts.supportTeam ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <Phone className="w-4 h-4 mr-2" />
              )}
              24/7 Emergency Support
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                setEmergencyContacts((prev) => ({
                  ...prev,
                  primaryContact: true,
                }))
              }
              disabled={emergencyContacts.primaryContact}
            >
              {emergencyContacts.primaryContact ? (
                <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
              ) : (
                <MessageSquare className="w-4 h-4 mr-2" />
              )}
              Alert Primary Contacts
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                onEmergencyAction({
                  type: 'notify-stakeholders',
                  parameters: { urgency: 'high', includeClients: true },
                  authorization_required: true,
                })
              }
            >
              <Bell className="w-4 h-4 mr-2" />
              Notify Affected Couples
            </Button>
          </CardContent>
        </Card>

        {/* System Failover */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-orange-500" />
              System Failover
            </CardTitle>
            <CardDescription>
              Activate backup systems and failover procedures
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSystemFailover}
            >
              <Cloud className="w-4 h-4 mr-2" />
              Activate Cloud Failover
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                onEmergencyAction({
                  type: 'activate-failover',
                  parameters: { failoverType: 'local-backup' },
                  authorization_required: false,
                })
              }
            >
              <HardDrive className="w-4 h-4 mr-2" />
              Switch to Local Backup
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                onEmergencyAction({
                  type: 'activate-failover',
                  parameters: { failoverType: 'offsite-backup' },
                  authorization_required: true,
                })
              }
            >
              <Server className="w-4 h-4 mr-2" />
              Emergency Offsite Access
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Active Recovery Session */}
      {activeRecoverySession && (
        <Card className="border-blue-600 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Active Recovery Session
              <Badge
                variant={
                  activeRecoverySession.status === 'completed'
                    ? 'default'
                    : 'secondary'
                }
                className="capitalize"
              >
                {activeRecoverySession.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              {activeRecoverySession.type
                .replace(/-/g, ' ')
                .replace(/\b\w/g, (l) => l.toUpperCase())}{' '}
              - Started {activeRecoverySession.startTime.toLocaleTimeString()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Recovery Progress</span>
                <span className="text-sm text-muted-foreground">
                  {activeRecoverySession.progress.toFixed(1)}%
                </span>
              </div>
              <Progress
                value={activeRecoverySession.progress}
                className="h-3"
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Files Recovered</div>
                <div className="font-medium">
                  {activeRecoverySession.recoveredFiles.toLocaleString()} /{' '}
                  {activeRecoverySession.totalFiles.toLocaleString()}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Data Recovered</div>
                <div className="font-medium">
                  {formatBytes(activeRecoverySession.recoveredSize)} /{' '}
                  {formatBytes(activeRecoverySession.totalSize)}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Elapsed Time</div>
                <div className="font-medium">
                  {formatDuration(
                    (new Date().getTime() -
                      activeRecoverySession.startTime.getTime()) /
                      1000,
                  )}
                </div>
              </div>

              <div>
                <div className="text-muted-foreground">Status</div>
                <div
                  className={cn(
                    'font-medium capitalize',
                    activeRecoverySession.status === 'completed'
                      ? 'text-green-600'
                      : activeRecoverySession.status === 'failed'
                        ? 'text-red-600'
                        : activeRecoverySession.status === 'in-progress'
                          ? 'text-blue-600'
                          : 'text-gray-600',
                  )}
                >
                  {activeRecoverySession.status}
                </div>
              </div>
            </div>

            {activeRecoverySession.weddingEventIds.length > 0 && (
              <Alert>
                <Camera className="h-4 w-4" />
                <AlertDescription>
                  <strong>Wedding Events:</strong> Recovering data for{' '}
                  {activeRecoverySession.weddingEventIds.length} wedding
                  event(s)
                  <div className="mt-1">
                    <strong>Data Types:</strong>{' '}
                    {activeRecoverySession.affectedDataTypes.join(', ')}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              {activeRecoverySession.status === 'in-progress' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setActiveRecoverySession((prev) =>
                      prev ? { ...prev, status: 'cancelled' } : null,
                    )
                  }
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Cancel Recovery
                </Button>
              )}

              {activeRecoverySession.status === 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveRecoverySession(null)}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Close Session
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Download recovery log
                  const logData = `Recovery Session Report
Session ID: ${activeRecoverySession.id}
Type: ${activeRecoverySession.type}
Start Time: ${activeRecoverySession.startTime.toISOString()}
Status: ${activeRecoverySession.status}
Progress: ${activeRecoverySession.progress}%
Files Recovered: ${activeRecoverySession.recoveredFiles}/${activeRecoverySession.totalFiles}
Data Recovered: ${formatBytes(activeRecoverySession.recoveredSize)}/${formatBytes(activeRecoverySession.totalSize)}
Wedding Events: ${activeRecoverySession.weddingEventIds.join(', ')}
Data Types: ${activeRecoverySession.affectedDataTypes.join(', ')}`;

                  const blob = new Blob([logData], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `recovery-session-${activeRecoverySession.id}.log`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <FileText className="w-4 h-4 mr-1" />
                Download Log
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Emergency Procedures Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Emergency Procedures
          </CardTitle>
          <CardDescription>
            Step-by-step emergency response procedures for wedding day disasters
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📸 Photo Loss Emergency</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Stop all current operations</li>
                  <li>2. Initiate wedding-specific recovery</li>
                  <li>3. Contact couples immediately</li>
                  <li>4. Document incident for insurance</li>
                  <li>5. Activate backup photographers if needed</li>
                </ol>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🖥️ System Failure</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Activate cloud failover immediately</li>
                  <li>2. Switch to mobile backup systems</li>
                  <li>3. Notify emergency support team</li>
                  <li>4. Document system status</li>
                  <li>5. Begin full system recovery</li>
                </ol>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">🔒 Data Corruption</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Isolate corrupted systems</li>
                  <li>2. Verify backup integrity</li>
                  <li>3. Start selective recovery</li>
                  <li>4. Run integrity verification</li>
                  <li>5. Update security protocols</li>
                </ol>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">⚡ Wedding Day Crisis</h4>
                <ol className="text-sm space-y-1 text-muted-foreground">
                  <li>1. Activate emergency response team</li>
                  <li>2. Switch to battery backup systems</li>
                  <li>3. Enable real-time replication</li>
                  <li>4. Contact venue IT support</li>
                  <li>5. Prepare contingency equipment</li>
                </ol>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
