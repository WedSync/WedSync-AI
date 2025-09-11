'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertTriangle,
  Bell,
  Shield,
  Clock,
  Mail,
  Smartphone,
  Calendar,
  DollarSign,
  Settings,
  Save,
  AlertCircle,
  CheckCircle,
  StopCircle,
} from 'lucide-react';
import type {
  BudgetAlertsManagerProps,
  BudgetSettings,
  AIUsageMetrics,
} from '@/types/ai-optimization';

const BudgetAlertsManager: React.FC<BudgetAlertsManagerProps> = ({
  settings,
  currentUsage,
  onSettingsUpdate,
  className,
}) => {
  const [localSettings, setLocalSettings] = useState<BudgetSettings>(settings);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Calculate current budget usage
  const monthlySpend = currentUsage.totalCostPence * 20; // Assume 20 days in month
  const budgetUsedPercentage =
    (monthlySpend / settings.monthlyBudgetPence) * 100;

  // Format currency
  const formatPence = (pence: number): string => {
    return `£${(pence / 100).toFixed(2)}`;
  };

  // Get alert level based on usage
  const getAlertLevel = (
    percentage: number,
  ): {
    level: 'none' | 'warning' | 'critical' | 'emergency';
    color: string;
    icon: React.ReactNode;
    message: string;
  } => {
    if (percentage >= settings.alertThresholds.emergency) {
      return {
        level: 'emergency',
        color: 'bg-red-500',
        icon: <StopCircle className="h-4 w-4 text-white" />,
        message: 'Emergency: Budget nearly exceeded!',
      };
    }
    if (percentage >= settings.alertThresholds.critical) {
      return {
        level: 'critical',
        color: 'bg-orange-500',
        icon: <AlertCircle className="h-4 w-4 text-white" />,
        message: 'Critical: Budget usage is very high',
      };
    }
    if (percentage >= settings.alertThresholds.warning) {
      return {
        level: 'warning',
        color: 'bg-yellow-500',
        icon: <AlertTriangle className="h-4 w-4 text-white" />,
        message: 'Warning: Budget usage is high',
      };
    }
    return {
      level: 'none',
      color: 'bg-green-500',
      icon: <CheckCircle className="h-4 w-4 text-white" />,
      message: 'Budget usage is healthy',
    };
  };

  // Handle settings updates
  const updateSettings = (updates: Partial<BudgetSettings>) => {
    const newSettings = { ...localSettings, ...updates };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  // Handle nested settings updates
  const updateNestedSettings = <T extends keyof BudgetSettings>(
    section: T,
    updates: Partial<BudgetSettings[T]>,
  ) => {
    const newSettings = {
      ...localSettings,
      [section]: { ...localSettings[section], ...updates },
    };
    setLocalSettings(newSettings);
    setHasUnsavedChanges(true);
  };

  // Save settings
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSettingsUpdate(localSettings);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to original settings
  const handleReset = () => {
    setLocalSettings(settings);
    setHasUnsavedChanges(false);
  };

  const currentAlert = getAlertLevel(budgetUsedPercentage);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Budget Alerts Manager
          </h2>
          <p className="text-gray-600">
            Configure budget thresholds and automated protections
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={`${currentAlert.color} text-white`}>
            {currentAlert.icon}
            <span className="ml-1">{currentAlert.level.toUpperCase()}</span>
          </Badge>
          {hasUnsavedChanges && (
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? (
                  <>
                    <Settings className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Current Budget Status */}
      <Alert
        className={`border-2 ${
          currentAlert.level === 'emergency'
            ? 'border-red-300 bg-red-50'
            : currentAlert.level === 'critical'
              ? 'border-orange-300 bg-orange-50'
              : currentAlert.level === 'warning'
                ? 'border-yellow-300 bg-yellow-50'
                : 'border-green-300 bg-green-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {currentAlert.icon}
            <div>
              <h3 className="font-medium">{currentAlert.message}</h3>
              <p className="text-sm opacity-80">
                You've used {budgetUsedPercentage.toFixed(1)}% of your monthly
                budget ({formatPence(monthlySpend)} of{' '}
                {formatPence(settings.monthlyBudgetPence)})
              </p>
            </div>
          </div>
          {settings.autoDisable.enabled && budgetUsedPercentage >= 95 && (
            <div className="text-right">
              <Badge variant="destructive" className="mb-1">
                Auto-Disable Active
              </Badge>
              <p className="text-xs">
                AI services will be disabled at 100% to prevent overages
              </p>
            </div>
          )}
        </div>
      </Alert>

      {/* Budget Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Budget */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5" />
              <span>Monthly Budget</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="monthlyBudget">Monthly Budget (£)</Label>
              <Input
                id="monthlyBudget"
                type="number"
                step="0.01"
                min="0"
                value={(localSettings.monthlyBudgetPence / 100).toFixed(2)}
                onChange={(e) =>
                  updateSettings({
                    monthlyBudgetPence: Math.round(
                      parseFloat(e.target.value) * 100,
                    ),
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-gray-600 mt-1">
                Set your maximum monthly AI spending limit
              </p>
            </div>

            {/* Seasonal Budget Adjustment */}
            <div className="space-y-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between">
                <Label htmlFor="seasonalAdjust" className="text-sm font-medium">
                  Wedding Season Adjustment
                </Label>
                <Switch
                  id="seasonalAdjust"
                  checked={localSettings.seasonalSettings.adjustBudgetForSeason}
                  onCheckedChange={(checked) =>
                    updateNestedSettings('seasonalSettings', {
                      adjustBudgetForSeason: checked,
                    })
                  }
                />
              </div>

              {localSettings.seasonalSettings.adjustBudgetForSeason && (
                <div>
                  <Label htmlFor="seasonMultiplier">
                    Peak Season Multiplier
                  </Label>
                  <Input
                    id="seasonMultiplier"
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="3.0"
                    value={localSettings.seasonalSettings.peakSeasonMultiplier}
                    onChange={(e) =>
                      updateNestedSettings('seasonalSettings', {
                        peakSeasonMultiplier: parseFloat(e.target.value),
                      })
                    }
                    className="mt-1"
                  />
                  <p className="text-xs text-orange-700 mt-1">
                    Budget will be{' '}
                    {formatPence(
                      localSettings.monthlyBudgetPence *
                        localSettings.seasonalSettings.peakSeasonMultiplier,
                    )}{' '}
                    during peak season (March-October)
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alert Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Alert Thresholds</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="warningThreshold">Warning Alert (%)</Label>
              <Input
                id="warningThreshold"
                type="number"
                min="50"
                max="100"
                value={localSettings.alertThresholds.warning}
                onChange={(e) =>
                  updateNestedSettings('alertThresholds', {
                    warning: parseInt(e.target.value),
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-yellow-700 mt-1">
                Get notified when budget usage reaches this level
              </p>
            </div>

            <div>
              <Label htmlFor="criticalThreshold">Critical Alert (%)</Label>
              <Input
                id="criticalThreshold"
                type="number"
                min="70"
                max="100"
                value={localSettings.alertThresholds.critical}
                onChange={(e) =>
                  updateNestedSettings('alertThresholds', {
                    critical: parseInt(e.target.value),
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-orange-700 mt-1">
                Urgent notification when approaching budget limit
              </p>
            </div>

            <div>
              <Label htmlFor="emergencyThreshold">Emergency Alert (%)</Label>
              <Input
                id="emergencyThreshold"
                type="number"
                min="90"
                max="100"
                value={localSettings.alertThresholds.emergency}
                onChange={(e) =>
                  updateNestedSettings('alertThresholds', {
                    emergency: parseInt(e.target.value),
                  })
                }
                className="mt-1"
              />
              <p className="text-xs text-red-700 mt-1">
                Final warning before auto-disable activation
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Disable Protection */}
      <Card className="border-2 border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-800">
            <Shield className="h-5 w-5" />
            <span>Auto-Disable Protection</span>
          </CardTitle>
          <p className="text-sm text-red-700 mt-1">
            Automatically disable AI services to prevent budget overruns
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label
                htmlFor="autoDisableEnabled"
                className="text-sm font-medium"
              >
                Enable Auto-Disable
              </Label>
              <p className="text-xs text-red-600 mt-1">
                Automatically disable AI when budget is exceeded
              </p>
            </div>
            <Switch
              id="autoDisableEnabled"
              checked={localSettings.autoDisable.enabled}
              onCheckedChange={(checked) =>
                updateNestedSettings('autoDisable', {
                  enabled: checked,
                })
              }
            />
          </div>

          {localSettings.autoDisable.enabled && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="disablePercentage">Disable at Budget (%)</Label>
                <Input
                  id="disablePercentage"
                  type="number"
                  min="100"
                  max="110"
                  value={localSettings.autoDisable.atPercentage}
                  onChange={(e) =>
                    updateNestedSettings('autoDisable', {
                      atPercentage: parseInt(e.target.value),
                    })
                  }
                  className="mt-1"
                />
                <p className="text-xs text-red-600 mt-1">
                  AI services will be disabled at this budget usage level
                </p>
              </div>

              <div>
                <Label htmlFor="gracePeriod">Grace Period (hours)</Label>
                <Input
                  id="gracePeriod"
                  type="number"
                  min="0"
                  max="72"
                  value={localSettings.autoDisable.gracePeriod}
                  onChange={(e) =>
                    updateNestedSettings('autoDisable', {
                      gracePeriod: parseInt(e.target.value),
                    })
                  }
                  className="mt-1"
                />
                <p className="text-xs text-red-600 mt-1">
                  Time before auto-disable activates after threshold is reached
                </p>
              </div>
            </div>
          )}

          {localSettings.autoDisable.enabled && (
            <div className="p-3 bg-white rounded border-l-4 border-l-red-500">
              <h4 className="font-medium text-red-800 mb-2">
                Wedding Day Protection:
              </h4>
              <p className="text-sm text-red-700">
                Auto-disable will be temporarily suspended during confirmed
                wedding days to ensure critical AI services remain available for
                your clients. You'll receive emergency notifications instead.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Notification Preferences</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Notification Channels */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Email Alerts</span>
              </div>
              <Switch
                checked={localSettings.notifications.email}
                onCheckedChange={(checked) =>
                  updateNestedSettings('notifications', {
                    email: checked,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Smartphone className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">SMS Alerts</span>
              </div>
              <Switch
                checked={localSettings.notifications.sms}
                onCheckedChange={(checked) =>
                  updateNestedSettings('notifications', {
                    sms: checked,
                  })
                }
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Dashboard</span>
              </div>
              <Switch
                checked={localSettings.notifications.dashboard}
                onCheckedChange={(checked) =>
                  updateNestedSettings('notifications', {
                    dashboard: checked,
                  })
                }
              />
            </div>
          </div>

          {/* Notification Frequency */}
          <div>
            <Label htmlFor="notificationFrequency">
              Notification Frequency
            </Label>
            <Select
              value={localSettings.notifications.frequency}
              onValueChange={(value) =>
                updateNestedSettings('notifications', {
                  frequency: value as 'instant' | 'daily' | 'weekly',
                })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instant">
                  Instant (as they happen)
                </SelectItem>
                <SelectItem value="daily">Daily Summary</SelectItem>
                <SelectItem value="weekly">Weekly Summary</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600 mt-1">
              How often you want to receive budget notifications
            </p>
          </div>

          {/* Pre-Season Warning */}
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
            <div>
              <Label htmlFor="preSeasonWarning" className="text-sm font-medium">
                Pre-Season Budget Warning
              </Label>
              <p className="text-xs text-orange-700 mt-1">
                Get notified in February to prepare for wedding season cost
                increases
              </p>
            </div>
            <Switch
              id="preSeasonWarning"
              checked={localSettings.seasonalSettings.preSeasonWarning}
              onCheckedChange={(checked) =>
                updateNestedSettings('seasonalSettings', {
                  preSeasonWarning: checked,
                })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Wedding Industry Context */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span>Wedding Business Protection</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Smart Budget Management:
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Auto-disable suspends during confirmed wedding days</li>
                  <li>
                    • Emergency notifications replace service cuts on Saturdays
                  </li>
                  <li>
                    • Peak season budgets automatically adjust (March-October)
                  </li>
                  <li>
                    • Grace periods allow completion of critical client work
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-2">
                  Cost Control Benefits:
                </h4>
                <ul className="text-sm text-gray-700 space-y-1">
                  <li>• Prevent surprise AI bills during busy months</li>
                  <li>• Maintain service quality while controlling costs</li>
                  <li>• Get early warnings to optimize before limits</li>
                  <li>• Protect business cash flow during peak season</li>
                </ul>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border-2 border-blue-300">
              <h4 className="font-medium text-blue-900 mb-2">
                Example: Photography Studio Alert Strategy
              </h4>
              <p className="text-sm text-blue-800">
                Set warning at 80% (£120 of £150 budget), critical at 90%
                (£135), with auto-disable at 100%. During June (peak wedding
                season), budget automatically adjusts to £240 with same
                percentage thresholds. On confirmed wedding days, auto-disable
                is suspended but emergency SMS alerts are sent instead.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BudgetAlertsManager;
