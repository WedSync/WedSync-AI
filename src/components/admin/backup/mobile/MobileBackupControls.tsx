'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Download,
  Upload,
  Pause,
  Play,
  StopCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Smartphone,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface MobileBackupControlsProps {
  isBackupRunning?: boolean;
  canTriggerBackup?: boolean;
  isOnline?: boolean;
  systemHealth?: 'healthy' | 'warning' | 'critical';
  onStartEmergencyBackup?: () => Promise<void>;
  onStartIncrementalBackup?: () => Promise<void>;
  onPauseBackup?: () => Promise<void>;
  onResumeBackup?: () => Promise<void>;
  onStopBackup?: () => Promise<void>;
  className?: string;
}

type BackupType = 'emergency' | 'incremental' | 'full';

export function MobileBackupControls({
  isBackupRunning = false,
  canTriggerBackup = true,
  isOnline = true,
  systemHealth = 'healthy',
  onStartEmergencyBackup,
  onStartIncrementalBackup,
  onPauseBackup,
  onResumeBackup,
  onStopBackup,
  className,
}: MobileBackupControlsProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: BackupType | 'stop' | null;
    title: string;
    description: string;
  }>({
    open: false,
    type: null,
    title: '',
    description: '',
  });

  const triggerHapticFeedback = (pattern?: number | number[]) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern || 50);
    }
  };

  const showConfirmDialog = (
    type: BackupType | 'stop',
    title: string,
    description: string,
  ) => {
    setConfirmDialog({
      open: true,
      type,
      title,
      description,
    });
  };

  const closeConfirmDialog = () => {
    setConfirmDialog({
      open: false,
      type: null,
      title: '',
      description: '',
    });
  };

  const executeAction = async (
    action: () => Promise<void>,
    actionName: string,
  ) => {
    try {
      setIsProcessing(true);
      setPendingAction(actionName);
      await action();
      triggerHapticFeedback([100, 50, 100]); // Success pattern
      toast({
        title: 'Action Completed',
        description: `${actionName} executed successfully`,
        variant: 'default',
      });
    } catch (error) {
      console.error(`Error executing ${actionName}:`, error);
      triggerHapticFeedback([200, 100, 200, 100, 200]); // Error pattern
      toast({
        title: 'Action Failed',
        description: `Failed to execute ${actionName}. Please try again.`,
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setPendingAction(null);
      closeConfirmDialog();
    }
  };

  const handleEmergencyBackup = () => {
    if (!onStartEmergencyBackup) return;

    showConfirmDialog(
      'emergency',
      'Start Emergency Backup',
      'This will immediately start a high-priority backup of critical wedding data. This action should only be used during emergencies or system issues.',
    );
  };

  const handleIncrementalBackup = () => {
    if (!onStartIncrementalBackup) return;

    showConfirmDialog(
      'incremental',
      'Start Incremental Backup',
      'This will backup only the data that has changed since the last backup. This is typically faster and uses less storage.',
    );
  };

  const handlePauseResume = async () => {
    if (!isBackupRunning) return;

    try {
      setIsProcessing(true);

      if (isPaused) {
        if (onResumeBackup) {
          await onResumeBackup();
          setIsPaused(false);
          triggerHapticFeedback(100);
          toast({
            title: 'Backup Resumed',
            description: 'Backup process has been resumed successfully',
            variant: 'default',
          });
        }
      } else {
        if (onPauseBackup) {
          await onPauseBackup();
          setIsPaused(true);
          triggerHapticFeedback(150);
          toast({
            title: 'Backup Paused',
            description:
              'Backup process has been paused. You can resume it anytime.',
            variant: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Error pausing/resuming backup:', error);
      triggerHapticFeedback([200, 100, 200]);
      toast({
        title: 'Action Failed',
        description: 'Failed to pause/resume backup. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopBackup = () => {
    if (!onStopBackup) return;

    showConfirmDialog(
      'stop',
      'Stop Current Backup',
      'Are you sure you want to stop the current backup? This action cannot be undone and you may lose backup progress.',
    );
  };

  const confirmAction = async () => {
    const { type } = confirmDialog;

    switch (type) {
      case 'emergency':
        if (onStartEmergencyBackup) {
          await executeAction(onStartEmergencyBackup, 'Emergency Backup');
        }
        break;
      case 'incremental':
        if (onStartIncrementalBackup) {
          await executeAction(onStartIncrementalBackup, 'Incremental Backup');
        }
        break;
      case 'stop':
        if (onStopBackup) {
          await executeAction(onStopBackup, 'Stop Backup');
        }
        break;
    }
  };

  const getSystemHealthColor = () => {
    switch (systemHealth) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getSystemHealthIcon = () => {
    switch (systemHealth) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <>
      <Card className={`p-4 ${className}`}>
        {/* Header with mobile indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Smartphone className="w-5 h-5 text-gray-500" />
            <h3 className="font-semibold text-lg">Backup Controls</h3>
          </div>

          <div className="flex items-center space-x-2">
            {getSystemHealthIcon()}
            <Badge
              variant={systemHealth === 'healthy' ? 'secondary' : 'destructive'}
            >
              {systemHealth}
            </Badge>
          </div>
        </div>

        {/* System status indicator */}
        <div className={`p-3 rounded-lg border mb-4 ${getSystemHealthColor()}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">
                {systemHealth === 'healthy'
                  ? 'System Ready'
                  : systemHealth === 'warning'
                    ? 'System Warning'
                    : 'System Critical'}
              </div>
              <div className="text-sm opacity-75">
                {isOnline ? 'Connected' : 'Offline'} •
                {isBackupRunning
                  ? isPaused
                    ? ' Backup Paused'
                    : ' Backup Running'
                  : ' Ready for Backup'}
              </div>
            </div>
          </div>
        </div>

        {/* Primary action buttons - touch optimized */}
        <div className="space-y-3">
          {!isBackupRunning ? (
            // Backup start controls
            <div className="space-y-3">
              <Button
                onClick={handleEmergencyBackup}
                disabled={!canTriggerBackup || isProcessing || !isOnline}
                className="w-full min-h-[44px] bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                {isProcessing && pendingAction === 'Emergency Backup' ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Starting Emergency Backup...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5" />
                    <span>Emergency Backup</span>
                  </div>
                )}
              </Button>

              <Button
                onClick={handleIncrementalBackup}
                disabled={
                  !canTriggerBackup ||
                  isProcessing ||
                  systemHealth === 'critical'
                }
                className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {isProcessing && pendingAction === 'Incremental Backup' ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Starting Incremental Backup...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Download className="w-5 h-5" />
                    <span>Incremental Backup</span>
                  </div>
                )}
              </Button>
            </div>
          ) : (
            // Backup control buttons during operation
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handlePauseResume}
                disabled={isProcessing}
                variant="outline"
                className="min-h-[44px] border-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <div className="flex items-center space-x-2">
                    {isPaused ? (
                      <Play className="w-5 h-5" />
                    ) : (
                      <Pause className="w-5 h-5" />
                    )}
                    <span>{isPaused ? 'Resume' : 'Pause'}</span>
                  </div>
                )}
              </Button>

              <Button
                onClick={handleStopBackup}
                disabled={isProcessing}
                variant="outline"
                className="min-h-[44px] border-2 border-red-200 text-red-600 hover:bg-red-50"
              >
                {isProcessing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <div className="flex items-center space-x-2">
                    <StopCircle className="w-5 h-5" />
                    <span>Stop</span>
                  </div>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Status messages and warnings */}
        <div className="mt-4 space-y-2">
          {!isOnline && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2 text-orange-800">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">Offline Mode</span>
              </div>
              <p className="text-sm text-orange-700 mt-1">
                Backup will start automatically when connection is restored
              </p>
            </div>
          )}

          {systemHealth === 'critical' && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2 text-red-800">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Critical System Status
                </span>
              </div>
              <p className="text-sm text-red-700 mt-1">
                Only emergency backups are available. Contact system
                administrator.
              </p>
            </div>
          )}

          {isBackupRunning && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Backup {isPaused ? 'Paused' : 'In Progress'}
                </span>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                {isPaused
                  ? 'Backup is paused. Tap Resume to continue.'
                  : 'Keep your device connected for optimal performance.'}
              </p>
            </div>
          )}
        </div>

        {/* Usage tips for mobile */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 mb-2">
            Mobile Backup Tips
          </h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Keep device connected to power during backups</li>
            <li>• Use Wi-Fi for faster backup speeds</li>
            <li>• Emergency backups prioritize critical wedding data</li>
            <li>• Tap and hold buttons for additional options</li>
          </ul>
        </div>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={closeConfirmDialog}>
        <AlertDialogContent className="mx-4 max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg">
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <AlertDialogCancel
              className="w-full sm:w-auto min-h-[44px]"
              disabled={isProcessing}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              className={`w-full sm:w-auto min-h-[44px] ${
                confirmDialog.type === 'stop'
                  ? 'bg-red-600 hover:bg-red-700'
                  : confirmDialog.type === 'emergency'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
              }`}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : (
                'Confirm'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MobileBackupControls;
