'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Settings,
  Bell,
  Zap,
  Target,
  Shield,
  Smartphone,
  Battery,
  Vibrate,
  Volume2,
  Moon,
  Sun,
  AlertTriangle,
  CheckCircle,
  Save,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizationSettings {
  notifications: {
    enabled: boolean;
    sound: boolean;
    vibration: boolean;
    budgetAlerts: number; // percentage threshold
    emergencyAlerts: boolean;
  };
  automation: {
    autoOptimize: boolean;
    aggressiveness: number; // 1-5 scale
    seasonalAdjustments: boolean;
    smartRecommendations: boolean;
  };
  display: {
    darkMode: boolean;
    batterySaver: boolean;
    hapticFeedback: boolean;
    dataUsageMode: 'full' | 'reduced' | 'minimal';
  };
  thresholds: {
    warningLevel: number;
    criticalLevel: number;
    emergencyLevel: number;
  };
}

interface MobileOptimizationSettingsProps {
  initialSettings?: Partial<OptimizationSettings>;
  onSettingsChange?: (settings: OptimizationSettings) => void;
  className?: string;
}

export default function MobileOptimizationSettings({
  initialSettings,
  onSettingsChange,
  className,
}: MobileOptimizationSettingsProps) {
  const [settings, setSettings] = useState<OptimizationSettings>({
    notifications: {
      enabled: true,
      sound: true,
      vibration: true,
      budgetAlerts: 85,
      emergencyAlerts: true,
    },
    automation: {
      autoOptimize: false,
      aggressiveness: 3,
      seasonalAdjustments: true,
      smartRecommendations: true,
    },
    display: {
      darkMode: false,
      batterySaver: false,
      hapticFeedback: true,
      dataUsageMode: 'full',
    },
    thresholds: {
      warningLevel: 75,
      criticalLevel: 90,
      emergencyLevel: 110,
    },
    ...initialSettings,
  });

  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState(100);

  // Monitor battery level
  useEffect(() => {
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(Math.round(battery.level * 100));

        // Auto-enable battery saver on low battery
        if (battery.level < 0.2 && !settings.display.batterySaver) {
          updateSettings('display', {
            ...settings.display,
            batterySaver: true,
          });
        }
      });
    }
  }, [settings.display]);

  const updateSettings = useCallback(
    (section: keyof OptimizationSettings, newSectionSettings: any) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          [section]: newSectionSettings,
        };
        setHasChanges(true);
        return updated;
      });
    },
    [],
  );

  const updateNestedSetting = useCallback(
    (section: keyof OptimizationSettings, key: string, value: any) => {
      setSettings((prev) => {
        const updated = {
          ...prev,
          [section]: {
            ...prev[section],
            [key]: value,
          },
        };
        setHasChanges(true);
        return updated;
      });
    },
    [],
  );

  const handleSave = useCallback(async () => {
    setIsSaving(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onSettingsChange?.(settings);
    setHasChanges(false);
    setIsSaving(false);

    // Trigger haptic feedback if enabled
    if (settings.display.hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate([50, 100, 50]);
    }
  }, [settings, onSettingsChange]);

  const handleReset = useCallback(() => {
    setSettings({
      notifications: {
        enabled: true,
        sound: true,
        vibration: true,
        budgetAlerts: 85,
        emergencyAlerts: true,
      },
      automation: {
        autoOptimize: false,
        aggressiveness: 3,
        seasonalAdjustments: true,
        smartRecommendations: true,
      },
      display: {
        darkMode: false,
        batterySaver: false,
        hapticFeedback: true,
        dataUsageMode: 'full',
      },
      thresholds: {
        warningLevel: 75,
        criticalLevel: 90,
        emergencyLevel: 110,
      },
    });
    setHasChanges(true);
  }, []);

  const getAggressivenessLabel = (level: number) => {
    switch (level) {
      case 1:
        return 'Conservative';
      case 2:
        return 'Gentle';
      case 3:
        return 'Balanced';
      case 4:
        return 'Aggressive';
      case 5:
        return 'Maximum';
      default:
        return 'Balanced';
    }
  };

  const getDataUsageIcon = () => {
    switch (settings.display.dataUsageMode) {
      case 'full':
        return <Zap className="h-4 w-4 text-green-500" />;
      case 'reduced':
        return <Target className="h-4 w-4 text-amber-500" />;
      case 'minimal':
        return <Shield className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className={cn('w-full max-w-md mx-auto p-4 space-y-4', className)}>
      {/* Header */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Optimization Settings
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Battery
                className={cn(
                  'h-4 w-4',
                  batteryLevel < 20 ? 'text-red-500' : 'text-green-500',
                )}
              />
              <span>{batteryLevel}%</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Notifications Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Enable Notifications</div>
              <div className="text-sm text-muted-foreground">
                Get cost alerts and optimization tips
              </div>
            </div>
            <Switch
              checked={settings.notifications.enabled}
              onCheckedChange={(checked) =>
                updateNestedSetting('notifications', 'enabled', checked)
              }
            />
          </div>

          {settings.notifications.enabled && (
            <>
              <div className="flex items-center justify-between">
                <div className="font-medium">Sound</div>
                <Switch
                  checked={settings.notifications.sound}
                  onCheckedChange={(checked) =>
                    updateNestedSetting('notifications', 'sound', checked)
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="font-medium">Vibration</div>
                <Switch
                  checked={settings.notifications.vibration}
                  onCheckedChange={(checked) =>
                    updateNestedSetting('notifications', 'vibration', checked)
                  }
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Budget Alert Threshold</span>
                  <Badge variant="outline">
                    {settings.notifications.budgetAlerts}%
                  </Badge>
                </div>
                <Slider
                  value={[settings.notifications.budgetAlerts]}
                  onValueChange={([value]) =>
                    updateNestedSetting('notifications', 'budgetAlerts', value)
                  }
                  max={100}
                  min={50}
                  step={5}
                  className="touch-manipulation"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Automation Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Automation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Auto-Optimize</div>
              <div className="text-sm text-muted-foreground">
                Apply AI recommendations automatically
              </div>
            </div>
            <Switch
              checked={settings.automation.autoOptimize}
              onCheckedChange={(checked) =>
                updateNestedSetting('automation', 'autoOptimize', checked)
              }
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Optimization Aggressiveness</span>
              <Badge variant="outline">
                {getAggressivenessLabel(settings.automation.aggressiveness)}
              </Badge>
            </div>
            <Slider
              value={[settings.automation.aggressiveness]}
              onValueChange={([value]) =>
                updateNestedSetting('automation', 'aggressiveness', value)
              }
              max={5}
              min={1}
              step={1}
              className="touch-manipulation"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="font-medium">Seasonal Adjustments</div>
            <Switch
              checked={settings.automation.seasonalAdjustments}
              onCheckedChange={(checked) =>
                updateNestedSetting(
                  'automation',
                  'seasonalAdjustments',
                  checked,
                )
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="font-medium">Smart Recommendations</div>
            <Switch
              checked={settings.automation.smartRecommendations}
              onCheckedChange={(checked) =>
                updateNestedSetting(
                  'automation',
                  'smartRecommendations',
                  checked,
                )
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Display Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Display & Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {settings.display.darkMode ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4" />
              )}
              <span className="font-medium">Dark Mode</span>
            </div>
            <Switch
              checked={settings.display.darkMode}
              onCheckedChange={(checked) =>
                updateNestedSetting('display', 'darkMode', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Battery Saver</div>
              <div className="text-sm text-muted-foreground">
                Reduce animations and background updates
              </div>
            </div>
            <Switch
              checked={settings.display.batterySaver}
              onCheckedChange={(checked) =>
                updateNestedSetting('display', 'batterySaver', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate className="h-4 w-4" />
              <span className="font-medium">Haptic Feedback</span>
            </div>
            <Switch
              checked={settings.display.hapticFeedback}
              onCheckedChange={(checked) =>
                updateNestedSetting('display', 'hapticFeedback', checked)
              }
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="font-medium">Data Usage Mode</span>
              <div className="flex items-center gap-1">
                {getDataUsageIcon()}
                <span className="text-sm capitalize">
                  {settings.display.dataUsageMode}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['minimal', 'reduced', 'full'] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={
                    settings.display.dataUsageMode === mode
                      ? 'default'
                      : 'outline'
                  }
                  size="sm"
                  onClick={() =>
                    updateNestedSetting('display', 'dataUsageMode', mode)
                  }
                  className="text-xs touch-manipulation"
                >
                  {mode}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Thresholds */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Alert Thresholds
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Warning Level</span>
              <Badge variant="outline" className="bg-amber-50">
                {settings.thresholds.warningLevel}%
              </Badge>
            </div>
            <Slider
              value={[settings.thresholds.warningLevel]}
              onValueChange={([value]) =>
                updateNestedSetting('thresholds', 'warningLevel', value)
              }
              max={100}
              min={50}
              step={5}
              className="touch-manipulation"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Critical Level</span>
              <Badge variant="outline" className="bg-red-50">
                {settings.thresholds.criticalLevel}%
              </Badge>
            </div>
            <Slider
              value={[settings.thresholds.criticalLevel]}
              onValueChange={([value]) =>
                updateNestedSetting('thresholds', 'criticalLevel', value)
              }
              max={100}
              min={settings.thresholds.warningLevel}
              step={5}
              className="touch-manipulation"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm">Emergency Level</span>
              <Badge variant="destructive">
                {settings.thresholds.emergencyLevel}%
              </Badge>
            </div>
            <Slider
              value={[settings.thresholds.emergencyLevel]}
              onValueChange={([value]) =>
                updateNestedSetting('thresholds', 'emergencyLevel', value)
              }
              max={150}
              min={100}
              step={5}
              className="touch-manipulation"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-4">
        <Button
          variant="outline"
          onClick={handleReset}
          className="h-12 touch-manipulation"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="h-12 touch-manipulation"
        >
          {isSaving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>

      {/* Status */}
      {hasChanges && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">You have unsaved changes</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
