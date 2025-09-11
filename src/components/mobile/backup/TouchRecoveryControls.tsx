'use client';

import React, { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Download,
  Upload,
  RefreshCw,
  Zap,
  Clock,
  Users,
  Calendar,
  Camera,
  FileText,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface RecoveryAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedTime: string;
  riskLevel: 'safe' | 'caution' | 'risky';
  weddingDayCompatible: boolean;
}

interface RecoveryProgress {
  actionId: string;
  progress: number;
  status: 'idle' | 'running' | 'completed' | 'failed';
  message: string;
}

const TouchRecoveryControls: React.FC = () => {
  const { triggerHaptic } = useHapticFeedback();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [recoveryProgress, setRecoveryProgress] = useState<RecoveryProgress[]>(
    [],
  );
  const [isWeddingDay, setIsWeddingDay] = useState(false);

  // Recovery actions optimized for touch interaction
  const recoveryActions: RecoveryAction[] = [
    {
      id: 'emergency-backup',
      title: 'Emergency Backup',
      description: 'Save all wedding data immediately',
      icon: <Shield className="w-8 h-8" />,
      priority: 'critical',
      estimatedTime: '2-3 minutes',
      riskLevel: 'safe',
      weddingDayCompatible: true,
    },
    {
      id: 'restore-timeline',
      title: 'Restore Wedding Timeline',
      description: 'Recover your wedding day schedule',
      icon: <Calendar className="w-8 h-8" />,
      priority: 'critical',
      estimatedTime: '1 minute',
      riskLevel: 'safe',
      weddingDayCompatible: true,
    },
    {
      id: 'restore-guests',
      title: 'Restore Guest List',
      description: 'Recover guest information and RSVPs',
      icon: <Users className="w-8 h-8" />,
      priority: 'high',
      estimatedTime: '1-2 minutes',
      riskLevel: 'safe',
      weddingDayCompatible: true,
    },
    {
      id: 'restore-photos',
      title: 'Restore Photo Gallery',
      description: 'Recover wedding photos and albums',
      icon: <Camera className="w-8 h-8" />,
      priority: 'medium',
      estimatedTime: '5-10 minutes',
      riskLevel: 'caution',
      weddingDayCompatible: false,
    },
    {
      id: 'restore-forms',
      title: 'Restore Forms & Documents',
      description: 'Recover contracts and forms',
      icon: <FileText className="w-8 h-8" />,
      priority: 'medium',
      estimatedTime: '2-3 minutes',
      riskLevel: 'safe',
      weddingDayCompatible: true,
    },
    {
      id: 'full-restore',
      title: 'Complete Recovery',
      description: 'Restore everything from last backup',
      icon: <Heart className="w-8 h-8" />,
      priority: 'high',
      estimatedTime: '10-15 minutes',
      riskLevel: 'risky',
      weddingDayCompatible: false,
    },
  ];

  // Check if today is wedding day
  useEffect(() => {
    const checkWeddingDay = () => {
      try {
        const weddingDetails = localStorage.getItem('wedding_details');
        if (weddingDetails) {
          const details = JSON.parse(weddingDetails);
          if (details.date) {
            const weddingDate = new Date(details.date);
            const today = new Date();
            const isToday =
              weddingDate.getDate() === today.getDate() &&
              weddingDate.getMonth() === today.getMonth() &&
              weddingDate.getFullYear() === today.getFullYear();
            setIsWeddingDay(isToday);
          }
        }
      } catch (error) {
        console.error('Error checking wedding day:', error);
      }
    };

    checkWeddingDay();
  }, []);

  const getPriorityColor = (priority: RecoveryAction['priority']) => {
    switch (priority) {
      case 'critical':
        return 'border-red-500 bg-red-50';
      case 'high':
        return 'border-orange-500 bg-orange-50';
      case 'medium':
        return 'border-yellow-500 bg-yellow-50';
      case 'low':
        return 'border-gray-500 bg-gray-50';
    }
  };

  const getRiskColor = (risk: RecoveryAction['riskLevel']) => {
    switch (risk) {
      case 'safe':
        return 'text-green-600';
      case 'caution':
        return 'text-yellow-600';
      case 'risky':
        return 'text-red-600';
    }
  };

  const handleActionTap = async (action: RecoveryAction) => {
    // Haptic feedback for touch interaction
    triggerHaptic('impact');

    // Wedding day safety check
    if (isWeddingDay && !action.weddingDayCompatible) {
      alert(
        `⚠️ ${action.title} is not recommended on your wedding day. This action might take too long or be risky during your special day.`,
      );
      return;
    }

    if (action.riskLevel === 'risky') {
      const confirmed = confirm(
        `⚠️ ${action.title} is a risky operation that might affect your current data. Are you sure you want to continue?`,
      );
      if (!confirmed) return;
    }

    setActiveAction(action.id);

    // Initialize progress tracking
    setRecoveryProgress((prev) => [
      ...prev.filter((p) => p.actionId !== action.id),
      {
        actionId: action.id,
        progress: 0,
        status: 'running',
        message: `Starting ${action.title}...`,
      },
    ]);

    try {
      await simulateRecoveryProcess(action);
    } catch (error) {
      console.error(`Recovery action failed: ${action.id}`, error);
      setRecoveryProgress((prev) =>
        prev.map((p) =>
          p.actionId === action.id
            ? {
                ...p,
                status: 'failed',
                message: `Failed to ${action.title.toLowerCase()}`,
              }
            : p,
        ),
      );
    } finally {
      setActiveAction(null);
    }
  };

  const simulateRecoveryProcess = async (action: RecoveryAction) => {
    const steps = [
      { progress: 10, message: 'Checking backup availability...' },
      { progress: 25, message: 'Validating data integrity...' },
      { progress: 50, message: `Restoring ${action.title.toLowerCase()}...` },
      { progress: 75, message: 'Synchronizing changes...' },
      { progress: 90, message: 'Finalizing recovery...' },
      { progress: 100, message: `${action.title} completed successfully!` },
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, 800));

      setRecoveryProgress((prev) =>
        prev.map((p) =>
          p.actionId === action.id
            ? { ...p, progress: step.progress, message: step.message }
            : p,
        ),
      );
    }

    // Mark as completed
    setTimeout(() => {
      setRecoveryProgress((prev) =>
        prev.map((p) =>
          p.actionId === action.id ? { ...p, status: 'completed' } : p,
        ),
      );
    }, 1000);
  };

  const getActionProgress = (actionId: string) => {
    return recoveryProgress.find((p) => p.actionId === actionId);
  };

  // Filter actions based on wedding day compatibility
  const availableActions = isWeddingDay
    ? recoveryActions.filter((action) => action.weddingDayCompatible)
    : recoveryActions;

  // Sort by priority
  const sortedActions = availableActions.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  return (
    <div className="touch-recovery-controls p-4 space-y-6">
      {/* Wedding Day Warning */}
      {isWeddingDay && (
        <Alert className="bg-red-50 border-red-200">
          <Heart className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-800 font-medium">
            <strong>Wedding Day Mode Active</strong> - Only essential, quick
            recovery actions are available. More complex operations have been
            disabled to protect your special day.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Emergency Actions Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Recovery Controls
        </h2>
        <p className="text-sm text-gray-600">
          Large buttons designed for emergency situations. Tap any action to
          begin recovery.
        </p>
      </div>

      {/* Recovery Action Cards */}
      <div className="grid grid-cols-1 gap-4">
        {sortedActions.map((action) => {
          const progress = getActionProgress(action.id);
          const isActive = activeAction === action.id;

          return (
            <Card
              key={action.id}
              className={`${getPriorityColor(action.priority)} border-2 transition-all duration-200 ${
                isActive
                  ? 'scale-[0.98] shadow-lg'
                  : 'hover:shadow-md active:scale-[0.98]'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Icon */}
                  <div
                    className={`flex-shrink-0 p-3 rounded-full ${
                      action.priority === 'critical'
                        ? 'bg-red-100 text-red-600'
                        : action.priority === 'high'
                          ? 'bg-orange-100 text-orange-600'
                          : action.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {action.icon}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {action.description}
                    </p>

                    {/* Metadata */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {action.estimatedTime}
                      </span>
                      <span
                        className={`font-medium ${getRiskColor(action.riskLevel)}`}
                      >
                        {action.riskLevel.toUpperCase()}
                      </span>
                      {!action.weddingDayCompatible && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                          Not Wedding Day Safe
                        </span>
                      )}
                    </div>

                    {/* Progress Bar */}
                    {progress && progress.status === 'running' && (
                      <div className="mt-4 space-y-2">
                        <Progress value={progress.progress} className="h-2" />
                        <p className="text-xs text-gray-600 flex items-center">
                          <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          {progress.message}
                        </p>
                      </div>
                    )}

                    {/* Success/Error Messages */}
                    {progress && progress.status === 'completed' && (
                      <div className="mt-3 flex items-center text-green-600 text-sm">
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Recovery completed successfully!
                      </div>
                    )}

                    {progress && progress.status === 'failed' && (
                      <div className="mt-3 flex items-center text-red-600 text-sm">
                        <AlertTriangle className="w-4 h-4 mr-2" />
                        Recovery failed. Please try again or contact support.
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Button */}
                <Button
                  onClick={() => handleActionTap(action)}
                  disabled={isActive || progress?.status === 'running'}
                  className={`w-full mt-4 h-14 text-base font-medium transition-all duration-200 ${
                    action.priority === 'critical'
                      ? 'bg-red-600 hover:bg-red-700'
                      : action.priority === 'high'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : action.priority === 'medium'
                          ? 'bg-yellow-600 hover:bg-yellow-700 text-black'
                          : 'bg-gray-600 hover:bg-gray-700'
                  } ${isActive ? 'opacity-75' : ''}`}
                >
                  {isActive ? (
                    <>
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : progress?.status === 'completed' ? (
                    <>
                      <CheckCircle className="w-5 h-5 mr-2" />
                      Completed
                    </>
                  ) : progress?.status === 'failed' ? (
                    <>
                      <AlertTriangle className="w-5 h-5 mr-2" />
                      Retry
                    </>
                  ) : (
                    <>
                      {action.priority === 'critical' && (
                        <Zap className="w-5 h-5 mr-2" />
                      )}
                      Start {action.title}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Emergency Support Card */}
      <Card className="bg-blue-50 border-blue-200 border-2">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-blue-900 mb-2">
            Need Help?
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Our emergency support team is available 24/7 for wedding day
            assistance.
          </p>
          <Button
            onClick={() => {
              triggerHaptic('impact');
              window.open('tel:+448001234567', '_self');
            }}
            className="bg-blue-600 hover:bg-blue-700 h-12 px-8 text-base font-medium"
          >
            Call Emergency Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default TouchRecoveryControls;
