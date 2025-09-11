'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  StopCircle,
  Shield,
  Phone,
  MessageCircle,
  Clock,
  DollarSign,
  Zap,
  CheckCircle,
  XCircle,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmergencyState {
  isActive: boolean;
  level: 'warning' | 'critical' | 'emergency';
  triggeredAt?: Date;
  reason: string;
  estimatedOverage: number;
}

interface EmergencyCostStopProps {
  currentSpend: number;
  budgetLimit: number;
  onEmergencyTrigger?: (emergency: EmergencyState) => void;
  onEmergencyStop?: () => void;
  className?: string;
}

export default function EmergencyCostStop({
  currentSpend = 4800,
  budgetLimit = 5000,
  onEmergencyTrigger,
  onEmergencyStop,
  className,
}: EmergencyCostStopProps) {
  const [emergency, setEmergency] = useState<EmergencyState>({
    isActive: false,
    level: 'warning',
    reason: '',
    estimatedOverage: 0,
  });

  const [isStopConfirming, setIsStopConfirming] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [confirmationStep, setConfirmationStep] = useState(0);

  // Calculate emergency metrics
  const budgetUsage = (currentSpend / budgetLimit) * 100;
  const overageAmount = Math.max(0, currentSpend - budgetLimit);
  const isOverBudget = currentSpend > budgetLimit;
  const isNearLimit = budgetUsage > 90;
  const isCritical = budgetUsage > 110;

  // Emergency level determination
  const getEmergencyLevel = useCallback(():
    | 'warning'
    | 'critical'
    | 'emergency' => {
    if (isCritical) return 'emergency';
    if (isOverBudget) return 'critical';
    if (isNearLimit) return 'warning';
    return 'warning';
  }, [isCritical, isOverBudget, isNearLimit]);

  // Auto-trigger emergency states
  useEffect(() => {
    const level = getEmergencyLevel();
    const shouldTrigger = isNearLimit || isOverBudget || isCritical;

    if (shouldTrigger && !emergency.isActive) {
      const newEmergency: EmergencyState = {
        isActive: true,
        level,
        triggeredAt: new Date(),
        reason: isCritical
          ? 'Budget exceeded by more than 10%'
          : isOverBudget
            ? 'Budget limit exceeded'
            : 'Approaching budget limit',
        estimatedOverage: overageAmount,
      };

      setEmergency(newEmergency);
      onEmergencyTrigger?.(newEmergency);

      // Play alert sound if enabled
      if (soundEnabled && 'AudioContext' in window) {
        playAlertSound();
      }
    }
  }, [
    currentSpend,
    budgetLimit,
    isNearLimit,
    isOverBudget,
    isCritical,
    overageAmount,
    getEmergencyLevel,
    emergency.isActive,
    onEmergencyTrigger,
    soundEnabled,
  ]);

  // Alert sound function
  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;

    try {
      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime + 0.2);

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }, [soundEnabled]);

  // Emergency stop countdown
  useEffect(() => {
    if (isStopConfirming && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isStopConfirming && countdown === 0) {
      handleEmergencyStop();
    }
  }, [isStopConfirming, countdown]);

  const handleEmergencyStop = useCallback(() => {
    setEmergency((prev) => ({ ...prev, isActive: false }));
    setIsStopConfirming(false);
    setCountdown(10);
    setConfirmationStep(0);
    onEmergencyStop?.();
  }, [onEmergencyStop]);

  const startEmergencyStop = useCallback(() => {
    setIsStopConfirming(true);
    setCountdown(10);
    setConfirmationStep(1);
  }, []);

  const cancelEmergencyStop = useCallback(() => {
    setIsStopConfirming(false);
    setCountdown(10);
    setConfirmationStep(0);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getEmergencyColor = (level: string) => {
    switch (level) {
      case 'emergency':
        return 'destructive';
      case 'critical':
        return 'destructive';
      case 'warning':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getEmergencyBgColor = (level: string) => {
    switch (level) {
      case 'emergency':
        return 'bg-red-600';
      case 'critical':
        return 'bg-red-500';
      case 'warning':
        return 'bg-amber-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (!emergency.isActive && !isStopConfirming) {
    return (
      <div className={cn('w-full max-w-md mx-auto p-4', className)}>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <div className="text-green-700 font-semibold mb-2">
              Budget On Track
            </div>
            <div className="text-green-600 text-sm">
              {formatCurrency(budgetLimit - currentSpend)} remaining
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('w-full max-w-md mx-auto p-4 space-y-4', className)}>
      {/* Emergency Alert Header */}
      <Card
        className={cn(
          'border-4 animate-pulse',
          emergency.level === 'emergency' && 'border-red-600 bg-red-50',
          emergency.level === 'critical' && 'border-red-500 bg-red-50',
          emergency.level === 'warning' && 'border-amber-500 bg-amber-50',
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle
                className={cn(
                  'h-6 w-6 animate-bounce',
                  emergency.level === 'emergency' && 'text-red-600',
                  emergency.level === 'critical' && 'text-red-500',
                  emergency.level === 'warning' && 'text-amber-500',
                )}
              />
              COST ALERT
            </CardTitle>
            <Badge
              variant={getEmergencyColor(emergency.level)}
              className="animate-pulse"
            >
              {emergency.level.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-3">
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(currentSpend)}
            </div>
            <div className="text-sm text-muted-foreground">
              Budget: {formatCurrency(budgetLimit)}
            </div>
            <div className="text-sm font-medium text-red-600">
              {emergency.reason}
            </div>

            {overageAmount > 0 && (
              <div className="bg-red-100 rounded-lg p-3">
                <div className="text-red-700 font-semibold">
                  Over Budget: {formatCurrency(overageAmount)}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Budget Usage Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span>Budget Usage</span>
            <span>{budgetUsage.toFixed(1)}%</span>
          </div>
          <Progress
            value={Math.min(budgetUsage, 150)}
            className={cn(
              'h-4',
              budgetUsage > 100 && '[&>div]:bg-red-500 [&>div]:animate-pulse',
              budgetUsage > 90 && budgetUsage <= 100 && '[&>div]:bg-amber-500',
            )}
          />
        </CardContent>
      </Card>

      {/* Emergency Stop Confirmation */}
      {isStopConfirming ? (
        <Card className="bg-red-600 text-white border-red-700">
          <CardContent className="p-6 text-center">
            <StopCircle className="h-16 w-16 mx-auto mb-4 animate-pulse" />
            <div className="text-xl font-bold mb-2">EMERGENCY STOP</div>
            <div className="text-red-100 mb-4">
              This will halt all spending immediately
            </div>
            <div className="text-4xl font-bold mb-4 animate-pulse">
              {countdown}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={cancelEmergencyStop}
                className="bg-white text-red-600 hover:bg-gray-100 h-12 touch-manipulation"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleEmergencyStop}
                className="bg-red-800 hover:bg-red-900 h-12 touch-manipulation"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                STOP NOW
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Emergency Actions */
        <div className="space-y-3">
          {/* Big Red Stop Button */}
          <Button
            onClick={startEmergencyStop}
            className={cn(
              'w-full h-16 text-xl font-bold text-white touch-manipulation animate-pulse',
              getEmergencyBgColor(emergency.level),
              'hover:opacity-90',
            )}
          >
            <StopCircle className="h-6 w-6 mr-3" />
            EMERGENCY STOP
          </Button>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-12 touch-manipulation"
              onClick={() => window.open('tel:+441234567890')}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Support
            </Button>
            <Button variant="outline" className="h-12 touch-manipulation">
              <MessageCircle className="h-4 w-4 mr-2" />
              Get Help
            </Button>
          </div>

          {/* Sound Toggle */}
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="touch-manipulation"
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4 mr-2" />
              ) : (
                <VolumeX className="h-4 w-4 mr-2" />
              )}
              {soundEnabled ? 'Sound On' : 'Sound Off'}
            </Button>
          </div>
        </div>
      )}

      {/* Emergency Info */}
      {emergency.triggeredAt && (
        <Card className="bg-gray-50">
          <CardContent className="p-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Alert triggered</span>
              </div>
              <span>{emergency.triggeredAt.toLocaleTimeString()}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
