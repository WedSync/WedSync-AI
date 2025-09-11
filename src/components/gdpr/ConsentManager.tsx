'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Shield,
  Clock,
  History,
  Settings,
  Eye,
  CheckCircle,
  XCircle,
  Info,
  Download,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import {
  ConsentSettings,
  GDPRComplianceManager,
  DATA_PROCESSING_PURPOSES,
  DATA_RETENTION_POLICIES,
} from '@/lib/compliance/gdpr-compliance';
import { ConsentType, ConsentStatus } from '@/types/gdpr';

interface ConsentHistoryEntry {
  id: string;
  timestamp: Date;
  settings: ConsentSettings;
  userAgent: string;
  action: 'granted' | 'withdrawn' | 'updated';
  version: string;
}

interface ConsentManagerProps {
  initialSettings?: ConsentSettings;
  onSettingsChange?: (settings: ConsentSettings) => void;
  onViewHistory?: () => void;
  className?: string;
  showAdvanced?: boolean;
}

interface ConsentManagerState {
  currentSettings: ConsentSettings | null;
  isLoading: boolean;
  hasError: boolean;
  errorMessage?: string;
  isDirty: boolean;
  history: ConsentHistoryEntry[];
  activeTab: 'overview' | 'detailed' | 'history';
}

export function ConsentManager({
  initialSettings,
  onSettingsChange,
  onViewHistory,
  className,
  showAdvanced = false,
}: ConsentManagerProps) {
  const [state, setState] = React.useState<ConsentManagerState>({
    currentSettings: null,
    isLoading: true,
    hasError: false,
    isDirty: false,
    history: [],
    activeTab: 'overview',
  });

  // Load current consent settings
  React.useEffect(() => {
    const loadSettings = () => {
      try {
        const settings =
          initialSettings || GDPRComplianceManager.getConsentSettings();
        setState((prev) => ({
          ...prev,
          currentSettings: settings,
          isLoading: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          hasError: true,
          errorMessage: 'Failed to load consent settings',
        }));
      }
    };

    loadSettings();
  }, [initialSettings]);

  // Mock consent history (in real app, this would come from API)
  React.useEffect(() => {
    if (state.currentSettings) {
      const mockHistory: ConsentHistoryEntry[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          settings: {
            necessary: true,
            analytics: true,
            marketing: true,
            functional: true,
            timestamp: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            version: '1.0',
          },
          userAgent: 'Chrome 91',
          action: 'granted',
          version: '1.0',
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
          settings: {
            necessary: true,
            analytics: true,
            marketing: false,
            functional: true,
            timestamp: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            version: '1.0',
          },
          userAgent: 'Chrome 91',
          action: 'updated',
          version: '1.0',
        },
      ];

      setState((prev) => ({ ...prev, history: mockHistory }));
    }
  }, [state.currentSettings]);

  const handleConsentToggle = React.useCallback(
    async (
      consentType: keyof Omit<ConsentSettings, 'timestamp' | 'version'>,
      value: boolean,
    ) => {
      if (!state.currentSettings) return;

      const updatedSettings: ConsentSettings = {
        ...state.currentSettings,
        [consentType]: value,
        timestamp: new Date().toISOString(),
      };

      setState((prev) => ({
        ...prev,
        currentSettings: updatedSettings,
        isDirty: true,
      }));
    },
    [state.currentSettings],
  );

  const handleSaveSettings = React.useCallback(async () => {
    if (!state.currentSettings || !state.isDirty) return;

    setState((prev) => ({ ...prev, isLoading: true }));

    try {
      GDPRComplianceManager.setConsentSettings({
        necessary: state.currentSettings.necessary,
        analytics: state.currentSettings.analytics,
        marketing: state.currentSettings.marketing,
        functional: state.currentSettings.functional,
      });

      setState((prev) => ({
        ...prev,
        isLoading: false,
        isDirty: false,
      }));

      onSettingsChange?.(state.currentSettings);
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasError: true,
        errorMessage: 'Failed to save consent settings',
      }));
    }
  }, [state.currentSettings, state.isDirty, onSettingsChange]);

  const handleResetSettings = React.useCallback(() => {
    const originalSettings =
      initialSettings || GDPRComplianceManager.getConsentSettings();
    setState((prev) => ({
      ...prev,
      currentSettings: originalSettings,
      isDirty: false,
    }));
  }, [initialSettings]);

  const handleExportData = React.useCallback(() => {
    if (!state.currentSettings) return;

    const exportData = {
      consent_settings: state.currentSettings,
      export_date: new Date().toISOString(),
      data_processing_purposes: DATA_PROCESSING_PURPOSES,
      retention_policies: DATA_RETENTION_POLICIES,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wedsync-consent-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [state.currentSettings]);

  if (state.isLoading) {
    return (
      <Card className={cn('max-w-4xl mx-auto', className)}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading consent settings...</p>
        </CardContent>
      </Card>
    );
  }

  if (state.hasError || !state.currentSettings) {
    return (
      <Card className={cn('max-w-4xl mx-auto', className)}>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-destructive mb-2">
            Error Loading Settings
          </h3>
          <p className="text-muted-foreground mb-4">
            {state.errorMessage || 'Unable to load your consent settings'}
          </p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('max-w-4xl mx-auto', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Consent Management
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              Manage your data processing preferences and view consent history
            </p>
          </div>
          <div className="flex items-center gap-2">
            {state.isDirty && (
              <Badge variant="secondary" className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Unsaved Changes
              </Badge>
            )}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleExportData}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export consent data</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs
          value={state.activeTab}
          onValueChange={(value) =>
            setState((prev) => ({ ...prev, activeTab: value as any }))
          }
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="detailed" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Detailed Settings
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <History className="w-4 h-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Current Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Necessary Cookies</span>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium">Active</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Analytics</span>
                    <div className="flex items-center gap-2">
                      {state.currentSettings.analytics ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {state.currentSettings.analytics
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Marketing</span>
                    <div className="flex items-center gap-2">
                      {state.currentSettings.marketing ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {state.currentSettings.marketing
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Functional</span>
                    <div className="flex items-center gap-2">
                      {state.currentSettings.functional ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm font-medium">
                        {state.currentSettings.functional
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">
                    Consent Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Last Updated</span>
                    <span className="text-sm font-medium">
                      {format(
                        new Date(state.currentSettings.timestamp),
                        'MMM dd, yyyy',
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Consent Version</span>
                    <Badge variant="secondary" className="text-xs">
                      v{state.currentSettings.version}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant="default" className="text-xs">
                      Valid
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Expires</span>
                    <span className="text-sm font-medium">
                      {format(
                        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
                        'MMM dd, yyyy',
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">
                    Your Rights
                  </h4>
                  <p className="text-sm text-blue-800 mb-3">
                    Under GDPR, you have the right to access, rectify, erase,
                    restrict processing, port your data, object to processing,
                    and withdraw consent at any time.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={onViewHistory}>
                      View History
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportData}
                    >
                      Export Data
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Detailed Settings Tab */}
          <TabsContent value="detailed" className="space-y-6 mt-6">
            <div className="space-y-6">
              {DATA_PROCESSING_PURPOSES.map((purpose) => (
                <Card key={purpose.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 max-w-2xl">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold">
                            {purpose.name}
                          </h3>
                          {purpose.required && (
                            <Badge variant="default" className="text-xs">
                              Required
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {purpose.legalBasis.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-4">
                          {purpose.description}
                        </p>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Legal Basis:</span>
                            <span className="capitalize">
                              {purpose.legalBasis.replace('_', ' ')}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">
                              Data Categories:
                            </span>
                            <div className="flex gap-1">
                              {purpose.categories.map((category) => (
                                <Badge
                                  key={category}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {category.replace('_', ' ')}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4">
                        {purpose.id === 'wedding_planning' ? (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Switch checked disabled className="opacity-50" />
                            <span>Always required</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={
                                purpose.id === 'analytics'
                                  ? state.currentSettings.analytics
                                  : purpose.id === 'marketing'
                                    ? state.currentSettings.marketing
                                    : state.currentSettings.functional
                              }
                              onCheckedChange={(checked) =>
                                handleConsentToggle(
                                  purpose.id === 'analytics'
                                    ? 'analytics'
                                    : purpose.id === 'marketing'
                                      ? 'marketing'
                                      : 'functional',
                                  checked,
                                )
                              }
                            />
                            <span className="text-sm">
                              {(
                                purpose.id === 'analytics'
                                  ? state.currentSettings.analytics
                                  : purpose.id === 'marketing'
                                    ? state.currentSettings.marketing
                                    : state.currentSettings.functional
                              )
                                ? 'Enabled'
                                : 'Disabled'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-medium">Data Retention</h4>
                <p className="text-sm text-muted-foreground">
                  Your data is retained according to our data retention policies
                </p>
              </div>
              <Button variant="outline" size="sm">
                View Retention Policies
              </Button>
            </div>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6 mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Consent History</h3>
                <p className="text-sm text-muted-foreground">
                  {state.history.length} record(s)
                </p>
              </div>

              {state.history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No History Available
                  </h3>
                  <p className="text-muted-foreground">
                    Your consent history will appear here as you make changes
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {state.history.map((entry) => (
                    <Card key={entry.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge
                                variant={
                                  entry.action === 'granted'
                                    ? 'default'
                                    : 'secondary'
                                }
                                className="text-xs"
                              >
                                {entry.action}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {format(entry.timestamp, 'MMM dd, yyyy')} at{' '}
                                {format(entry.timestamp, 'h:mm a')}
                              </span>
                            </div>
                            <div className="grid grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">
                                  Analytics:
                                </span>
                                <span
                                  className={cn(
                                    'ml-2 font-medium',
                                    entry.settings.analytics
                                      ? 'text-green-600'
                                      : 'text-red-600',
                                  )}
                                >
                                  {entry.settings.analytics ? '✓' : '✗'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Marketing:
                                </span>
                                <span
                                  className={cn(
                                    'ml-2 font-medium',
                                    entry.settings.marketing
                                      ? 'text-green-600'
                                      : 'text-red-600',
                                  )}
                                >
                                  {entry.settings.marketing ? '✓' : '✗'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Functional:
                                </span>
                                <span
                                  className={cn(
                                    'ml-2 font-medium',
                                    entry.settings.functional
                                      ? 'text-green-600'
                                      : 'text-red-600',
                                  )}
                                >
                                  {entry.settings.functional ? '✓' : '✗'}
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  Version:
                                </span>
                                <span className="ml-2 font-medium">
                                  v{entry.version}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              User Agent: {entry.userAgent}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <Separator className="my-6" />
        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            {state.isDirty && (
              <Button
                variant="outline"
                onClick={handleResetSettings}
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset Changes
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleSaveSettings}
              disabled={!state.isDirty || state.isLoading}
              className="flex items-center gap-2"
            >
              {state.isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
