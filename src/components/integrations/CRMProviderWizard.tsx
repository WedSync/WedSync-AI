'use client';

/**
 * CRM Provider Wizard Component
 * WS-343 - Team A - Round 1
 *
 * Multi-step wizard for setting up CRM integrations
 * Steps: Provider Selection → Authentication → Field Mapping → Settings → Confirmation
 */

import { useState, useCallback, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Star,
  Shield,
  Zap,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// UI Components (Untitled UI)
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Types
import type {
  CRMProviderWizardProps,
  CRMProvider,
  CRMProviderType,
  WizardStep,
  AuthType,
  SyncDirection,
  ConflictResolution,
} from '@/types/crm';

// Utils
import { cn } from '@/lib/utils';
import {
  CRM_PROVIDERS,
  CRM_PROVIDER_DISPLAY_NAMES,
  apiKeyConfigSchema,
  oauth2ConfigSchema,
  basicAuthConfigSchema,
  syncConfigSchema,
} from '@/types/crm';

// Child Components
import { OAuthFlowHandler } from './OAuthFlowHandler';
import { FieldMappingInterface } from './FieldMappingInterface';

// Validation Schemas
const providerSelectionSchema = z.object({
  provider: z.enum([
    'tave',
    'honeybook',
    'lightblue',
    'seventeen',
    'shootq',
    'pixieset',
    'iris_works',
    'dubsado',
    'studio_ninja',
    'custom',
  ]),
  connectionName: z.string().min(1, 'Connection name is required').max(50),
});

const authConfigSchema = z.discriminatedUnion('authType', [
  z.object({
    authType: z.literal('api_key'),
    apiKey: z.string().min(16, 'API key must be at least 16 characters'),
    apiUrl: z.string().url().optional(),
  }),
  z.object({
    authType: z.literal('oauth2'),
    // OAuth fields handled by OAuthFlowHandler
  }),
  z.object({
    authType: z.literal('basic_auth'),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    apiUrl: z.string().url('Valid API URL required'),
  }),
]);

type ProviderFormData = z.infer<typeof providerSelectionSchema>;
type AuthFormData = z.infer<typeof authConfigSchema>;
type SyncFormData = z.infer<typeof syncConfigSchema>;

export function CRMProviderWizard({
  organizationId,
  onComplete,
  onCancel,
  preSelectedProvider,
}: CRMProviderWizardProps) {
  // State Management
  const [currentStep, setCurrentStep] =
    useState<WizardStep>('provider_selection');
  const [selectedProvider, setSelectedProvider] = useState<CRMProvider | null>(
    preSelectedProvider ? CRM_PROVIDERS[preSelectedProvider] : null,
  );
  const [authData, setAuthData] = useState<any>(null);
  const [fieldMappings, setFieldMappings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Forms
  const providerForm = useForm<ProviderFormData>({
    resolver: zodResolver(providerSelectionSchema),
    defaultValues: {
      provider: preSelectedProvider || 'tave',
      connectionName: '',
    },
  });

  const authForm = useForm<AuthFormData>({
    resolver: zodResolver(authConfigSchema),
  });

  const syncForm = useForm<SyncFormData>({
    resolver: zodResolver(syncConfigSchema),
    defaultValues: {
      auto_sync_enabled: true,
      sync_interval_minutes: 60,
      sync_direction: 'import_only',
      conflict_resolution: 'crm_wins',
      import_historical_data: false,
      batch_size: 100,
      retry_attempts: 3,
      retry_delay_seconds: 30,
    },
  });

  // Step Configuration
  const steps: { key: WizardStep; title: string; description: string }[] = [
    {
      key: 'provider_selection',
      title: 'Choose Provider',
      description: 'Select your CRM system',
    },
    {
      key: 'authentication',
      title: 'Connect',
      description: 'Authenticate with your CRM',
    },
    {
      key: 'field_mapping',
      title: 'Map Fields',
      description: 'Configure data mapping',
    },
    {
      key: 'sync_settings',
      title: 'Sync Settings',
      description: 'Configure sync options',
    },
    {
      key: 'confirmation',
      title: 'Review',
      description: 'Confirm and create',
    },
  ];

  const currentStepIndex = steps.findIndex((step) => step.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  // Navigation Handlers
  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex].key);
    }
  }, [currentStepIndex, steps]);

  const goToPreviousStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex].key);
    }
  }, [currentStepIndex, steps]);

  // Step Handlers
  const handleProviderSelection = useCallback(
    (data: ProviderFormData) => {
      const provider = CRM_PROVIDERS[data.provider];
      setSelectedProvider(provider);
      goToNextStep();
    },
    [goToNextStep],
  );

  const handleAuthentication = useCallback(
    (authConfig: any) => {
      setAuthData(authConfig);
      goToNextStep();
    },
    [goToNextStep],
  );

  const handleFieldMapping = useCallback(
    (mappings: any[]) => {
      setFieldMappings(mappings);
      goToNextStep();
    },
    [goToNextStep],
  );

  const handleSyncSettings = useCallback(
    (data: SyncFormData) => {
      goToNextStep();
    },
    [goToNextStep],
  );

  const handleCompletion = useCallback(async () => {
    if (!selectedProvider || !authData) return;

    setIsLoading(true);

    try {
      // Create integration
      const integrationData = {
        crm_provider: selectedProvider.id,
        connection_name: providerForm.getValues('connectionName'),
        auth_config: authData,
        sync_config: syncForm.getValues(),
        field_mappings: fieldMappings,
      };

      // TODO: API call to create integration
      const response = await fetch(
        `/api/organizations/${organizationId}/crm-integrations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(integrationData),
        },
      );

      if (!response.ok) throw new Error('Failed to create integration');

      const integration = await response.json();
      onComplete(integration);
    } catch (error) {
      console.error('Integration creation failed:', error);
      // TODO: Show error message
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedProvider,
    authData,
    fieldMappings,
    organizationId,
    providerForm,
    syncForm,
    onComplete,
  ]);

  // Popular providers for highlighting
  const popularProviders = Object.values(CRM_PROVIDERS)
    .sort((a, b) => a.popularity_rank - b.popularity_rank)
    .slice(0, 3)
    .map((p) => p.id);

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Add CRM Integration</DialogTitle>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <div className="flex justify-between text-sm text-muted-foreground">
              {steps.map((step, index) => (
                <div
                  key={step.key}
                  className={cn(
                    'flex flex-col items-center text-center',
                    index <= currentStepIndex
                      ? 'text-blue-600'
                      : 'text-gray-400',
                  )}
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium mb-1',
                      index < currentStepIndex
                        ? 'bg-blue-600 text-white'
                        : index === currentStepIndex
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-400',
                    )}
                  >
                    {index < currentStepIndex ? (
                      <Check className="w-3 h-3" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  <span className="text-xs hidden sm:block">{step.title}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Step Content */}
          {currentStep === 'provider_selection' && (
            <ProviderSelectionStep
              form={providerForm}
              onNext={handleProviderSelection}
              popularProviders={popularProviders}
            />
          )}

          {currentStep === 'authentication' && selectedProvider && (
            <AuthenticationStep
              provider={selectedProvider}
              form={authForm}
              onNext={handleAuthentication}
              onBack={goToPreviousStep}
            />
          )}

          {currentStep === 'field_mapping' && selectedProvider && (
            <FieldMappingStep
              provider={selectedProvider}
              currentMappings={fieldMappings}
              onNext={handleFieldMapping}
              onBack={goToPreviousStep}
            />
          )}

          {currentStep === 'sync_settings' && (
            <SyncSettingsStep
              form={syncForm}
              onNext={handleSyncSettings}
              onBack={goToPreviousStep}
            />
          )}

          {currentStep === 'confirmation' && selectedProvider && (
            <ConfirmationStep
              provider={selectedProvider}
              connectionName={providerForm.getValues('connectionName')}
              authData={authData}
              syncConfig={syncForm.getValues()}
              fieldMappings={fieldMappings}
              isLoading={isLoading}
              onComplete={handleCompletion}
              onBack={goToPreviousStep}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Step Components
interface ProviderSelectionStepProps {
  form: any;
  onNext: (data: ProviderFormData) => void;
  popularProviders: string[];
}

function ProviderSelectionStep({
  form,
  onNext,
  popularProviders,
}: ProviderSelectionStepProps) {
  const providers = Object.values(CRM_PROVIDERS).sort(
    (a, b) => a.popularity_rank - b.popularity_rank,
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Choose Your CRM System</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Select the CRM system you want to connect to WedSync
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <FormField
            control={form.control}
            name="connectionName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Connection Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., My Tave Account" {...field} />
                </FormControl>
                <FormDescription>
                  Give this connection a name to identify it
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CRM Provider</FormLabel>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {providers.map((provider) => {
                    const isSelected = field.value === provider.id;
                    const isPopular = popularProviders.includes(provider.id);

                    return (
                      <Card
                        key={provider.id}
                        className={cn(
                          'cursor-pointer transition-all hover:shadow-md',
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-200 bg-blue-50'
                            : 'hover:border-gray-300',
                        )}
                        onClick={() => field.onChange(provider.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10 rounded-lg">
                              <AvatarImage
                                src={provider.logo_url}
                                alt={`${provider.name} logo`}
                              />
                              <AvatarFallback className="rounded-lg text-xs">
                                {provider.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">
                                  {CRM_PROVIDER_DISPLAY_NAMES[provider.id]}
                                </p>
                                {isPopular && (
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    <Star className="w-3 h-3 mr-1" />
                                    Popular
                                  </Badge>
                                )}
                              </div>

                              <p className="text-xs text-muted-foreground truncate">
                                {provider.description}
                              </p>

                              <div className="flex items-center gap-1 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {provider.auth_type.replace('_', ' ')}
                                </Badge>
                                {provider.real_time_sync && (
                                  <Zap className="w-3 h-3 text-yellow-500" />
                                )}
                                {provider.webhook_support && (
                                  <Shield className="w-3 h-3 text-green-500" />
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end">
            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Authentication Step Component (simplified - full OAuth implementation would be more complex)
interface AuthenticationStepProps {
  provider: CRMProvider;
  form: any;
  onNext: (data: any) => void;
  onBack: () => void;
}

function AuthenticationStep({
  provider,
  form,
  onNext,
  onBack,
}: AuthenticationStepProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleOAuthSuccess = useCallback(
    (authConfig: any) => {
      onNext(authConfig);
    },
    [onNext],
  );

  const handleOAuthError = useCallback((error: string) => {
    console.error('OAuth failed:', error);
    // TODO: Show error message
  }, []);

  if (provider.auth_type === 'oauth2') {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold">
            Connect to {CRM_PROVIDER_DISPLAY_NAMES[provider.id]}
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            You'll be securely redirected to authorize the connection
          </p>
        </div>

        <OAuthFlowHandler
          provider={provider}
          onSuccess={handleOAuthSuccess}
          onError={handleOAuthError}
          onCancel={onBack}
        />

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  // API Key or Basic Auth form
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          Connect to {CRM_PROVIDER_DISPLAY_NAMES[provider.id]}
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Enter your{' '}
          {provider.auth_type === 'api_key' ? 'API key' : 'credentials'} to
          connect
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-4">
          {provider.auth_type === 'api_key' && (
            <>
              <FormField
                control={form.control}
                name="apiKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="Enter your API key"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      You can find this in your {provider.name} account settings
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {provider.id !== 'tave' && (
                <FormField
                  control={form.control}
                  name="apiUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>API URL (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://your-domain.com/api"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </>
          )}

          {provider.auth_type === 'basic_auth' && (
            <>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="apiUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://your-domain.com/api"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              type="submit"
              disabled={isConnecting}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isConnecting ? 'Testing...' : 'Test Connection'}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Field Mapping Step (simplified - would use FieldMappingInterface component)
interface FieldMappingStepProps {
  provider: CRMProvider;
  currentMappings: any[];
  onNext: (mappings: any[]) => void;
  onBack: () => void;
}

function FieldMappingStep({
  provider,
  currentMappings,
  onNext,
  onBack,
}: FieldMappingStepProps) {
  const handleMappingsChange = useCallback(
    (mappings: any[]) => {
      // Auto-proceed with basic mappings for now
      onNext(mappings);
    },
    [onNext],
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Map Your Data Fields</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We've automatically mapped common fields. You can customize these
          later.
        </p>
      </div>

      {/* Simplified field mapping preview */}
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            Automatic field mapping will be configured for:
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Client Name</span>
              <span className="text-muted-foreground">→ Contact Name</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Email Address</span>
              <span className="text-muted-foreground">→ Email</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Wedding Date</span>
              <span className="text-muted-foreground">→ Event Date</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Phone Number</span>
              <span className="text-muted-foreground">→ Phone</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={() => handleMappingsChange([])}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          Continue
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Sync Settings Step
interface SyncSettingsStepProps {
  form: any;
  onNext: (data: SyncFormData) => void;
  onBack: () => void;
}

function SyncSettingsStep({ form, onNext, onBack }: SyncSettingsStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Configure Sync Settings</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose how often to sync data and handle conflicts
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onNext)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="auto_sync_enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Auto Sync</FormLabel>
                    <FormDescription>
                      Automatically sync data on schedule
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="import_historical_data"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      Import Historical Data
                    </FormLabel>
                    <FormDescription>
                      Import existing client data on first sync
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="sync_interval_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sync Frequency</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    defaultValue={field.value.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                      <SelectItem value="30">Every 30 minutes</SelectItem>
                      <SelectItem value="60">Every hour</SelectItem>
                      <SelectItem value="240">Every 4 hours</SelectItem>
                      <SelectItem value="1440">Once daily</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="conflict_resolution"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conflict Resolution</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="crm_wins">CRM data wins</SelectItem>
                      <SelectItem value="wedsync_wins">
                        WedSync data wins
                      </SelectItem>
                      <SelectItem value="newest_wins">
                        Newest data wins
                      </SelectItem>
                      <SelectItem value="manual_review">
                        Manual review
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    How to handle conflicting data during sync
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>

            <Button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// Confirmation Step
interface ConfirmationStepProps {
  provider: CRMProvider;
  connectionName: string;
  authData: any;
  syncConfig: any;
  fieldMappings: any[];
  isLoading: boolean;
  onComplete: () => void;
  onBack: () => void;
}

function ConfirmationStep({
  provider,
  connectionName,
  authData,
  syncConfig,
  fieldMappings,
  isLoading,
  onComplete,
  onBack,
}: ConfirmationStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold">Review Your Integration</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Confirm your settings before creating the integration
        </p>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Connection Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Provider:</span>
              <span>{CRM_PROVIDER_DISPLAY_NAMES[provider.id]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connection Name:</span>
              <span>{connectionName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Authentication:</span>
              <span className="capitalize">
                {provider.auth_type.replace('_', ' ')}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sync Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auto Sync:</span>
              <span>
                {syncConfig.auto_sync_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frequency:</span>
              <span>Every {syncConfig.sync_interval_minutes} minutes</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Historical Data:</span>
              <span>
                {syncConfig.import_historical_data ? 'Import' : 'Skip'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Conflicts:</span>
              <span className="capitalize">
                {syncConfig.conflict_resolution.replace('_', ' ')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Button
          onClick={onComplete}
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {isLoading ? 'Creating...' : 'Create Integration'}
          {!isLoading && <Check className="ml-2 h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
