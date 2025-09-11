'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Target,
  Smartphone,
  Wifi,
  WifiOff,
  Battery,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CostMetrics {
  currentSpend: number;
  budgetLimit: number;
  projectedSpend: number;
  dailyRate: number;
  trend: 'up' | 'down' | 'stable';
  efficiency: number;
  lastUpdated: Date;
}

interface MobileCostMonitorProps {
  weddingId?: string;
  supplierId?: string;
  className?: string;
}

export default function MobileCostMonitor({
  weddingId,
  supplierId,
  className,
}: MobileCostMonitorProps) {
  const [metrics, setMetrics] = useState<CostMetrics>({
    currentSpend: 4250.0,
    budgetLimit: 5000.0,
    projectedSpend: 4800.0,
    dailyRate: 125.5,
    trend: 'up',
    efficiency: 85,
    lastUpdated: new Date(),
  });

  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isLowPower, setIsLowPower] = useState(false);

  // Real-time cost monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        lastUpdated: new Date(),
        // Simulate real-time cost updates
        currentSpend: prev.currentSpend + (Math.random() - 0.5) * 10,
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Battery and connectivity monitoring
  useEffect(() => {
    const updateNetworkStatus = () => setIsOnline(navigator.onLine);

    window.addEventListener('online', updateNetworkStatus);
    window.addEventListener('offline', updateNetworkStatus);

    // Battery API if available
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));
        setIsLowPower(battery.level < 0.2);
      });
    }

    return () => {
      window.removeEventListener('online', updateNetworkStatus);
      window.removeEventListener('offline', updateNetworkStatus);
    };
  }, []);

  const budgetUsage = (metrics.currentSpend / metrics.budgetLimit) * 100;
  const isOverBudget = metrics.currentSpend > metrics.budgetLimit;
  const isNearLimit = budgetUsage > 85;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const getTrendIcon = () => {
    switch (metrics.trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      default:
        return <Target className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    if (isOverBudget) return 'destructive';
    if (isNearLimit) return 'warning';
    return 'default';
  };

  return (
    <div className={cn('w-full max-w-md mx-auto p-4 space-y-4', className)}>
      {/* Mobile Status Bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground bg-secondary/20 rounded-lg p-2">
        <div className="flex items-center gap-2">
          <Smartphone className="h-3 w-3" />
          <span>Cost Monitor</span>
        </div>
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-red-500" />
          )}
          <Battery
            className={cn(
              'h-3 w-3',
              isLowPower ? 'text-red-500' : 'text-green-500',
            )}
          />
          <span>{batteryLevel}%</span>
        </div>
      </div>

      {/* Main Cost Display */}
      <Card
        className={cn(
          'border-2 transition-all duration-300',
          isOverBudget && 'border-red-500 bg-red-50',
          isNearLimit && !isOverBudget && 'border-amber-500 bg-amber-50',
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Current Spend
            </CardTitle>
            {getTrendIcon()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center space-y-3">
            <div className="text-3xl font-bold text-primary">
              {formatCurrency(metrics.currentSpend)}
            </div>
            <div className="text-sm text-muted-foreground">
              of {formatCurrency(metrics.budgetLimit)} budget
            </div>

            {/* Progress Bar */}
            <Progress
              value={Math.min(budgetUsage, 100)}
              className={cn(
                'h-3 transition-all duration-500',
                isOverBudget && '[&>div]:bg-red-500',
                isNearLimit && !isOverBudget && '[&>div]:bg-amber-500',
              )}
            />

            <div className="flex justify-between text-xs">
              <span>{budgetUsage.toFixed(1)}% used</span>
              <span>
                {metrics.budgetLimit - metrics.currentSpend > 0
                  ? `${formatCurrency(metrics.budgetLimit - metrics.currentSpend)} left`
                  : `${formatCurrency(metrics.currentSpend - metrics.budgetLimit)} over`}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Badge */}
      {(isOverBudget || isNearLimit) && (
        <div className="flex justify-center">
          <Badge
            variant={isOverBudget ? 'destructive' : 'warning'}
            className="px-4 py-2 text-sm animate-pulse"
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            {isOverBudget ? 'Budget Exceeded!' : 'Approaching Limit'}
          </Badge>
        </div>
      )}

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-3">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Daily Rate</div>
            <div className="text-lg font-semibold text-primary">
              {formatCurrency(metrics.dailyRate)}
            </div>
          </div>
        </Card>

        <Card className="p-3">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">Projected</div>
            <div
              className={cn(
                'text-lg font-semibold',
                metrics.projectedSpend > metrics.budgetLimit
                  ? 'text-red-500'
                  : 'text-green-500',
              )}
            >
              {formatCurrency(metrics.projectedSpend)}
            </div>
          </div>
        </Card>
      </div>

      {/* Efficiency Meter */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Cost Efficiency</span>
          <Badge variant="outline">
            <Zap className="h-3 w-3 mr-1" />
            {metrics.efficiency}%
          </Badge>
        </div>
        <Progress value={metrics.efficiency} className="h-2" />
      </Card>

      {/* Last Updated */}
      <div className="text-center text-xs text-muted-foreground">
        Last updated: {metrics.lastUpdated.toLocaleTimeString()}
        {!isOnline && <span className="text-red-500 ml-2">(Offline)</span>}
      </div>

      {/* Mobile-Optimized Touch Targets */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <Button variant="outline" size="lg" className="h-12 touch-manipulation">
          View Details
        </Button>
        <Button size="lg" className="h-12 touch-manipulation">
          Optimize Costs
        </Button>
      </div>
    </div>
  );
}
