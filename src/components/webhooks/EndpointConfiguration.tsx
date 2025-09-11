'use client';

// WS-201 Team A - EndpointConfiguration Component
// Secure webhook endpoint configuration with HTTPS validation and testing
// Location: /wedsync/src/components/webhooks/EndpointConfiguration.tsx

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  WebhookEndpoint,
  WebhookConfig,
  WebhookTestResult,
  getAllWebhookEvents,
  maskWebhookSecret,
} from '@/types/webhooks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Shield,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  TestTube,
  Lock,
  Globe,
  Save,
  Trash2,
  ArrowLeft,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Validation schema with security requirements
const webhookConfigSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Must be a valid URL')
    .refine(
      (url) => url.startsWith('https://'),
      'URL must use HTTPS for security',
    )
    .refine((url) => {
      try {
        const parsed = new URL(url);
        // Block localhost and private IPs for security
        return !parsed.hostname.match(
          /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/,
        );
      } catch {
        return false;
      }
    }, 'Private/localhost URLs are not allowed for security'),

  events: z
    .array(z.string())
    .min(1, 'Select at least one event to subscribe to'),

  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .transform((val) => val?.trim() || undefined),

  isActive: z.boolean().default(true),

  retryConfig: z
    .object({
      maxAttempts: z.number().min(1).max(10).default(3),
      backoffMultiplier: z.number().min(1).max(5).default(2),
      initialDelay: z.number().min(1000).max(60000).default(1000),
      maxDelay: z.number().min(60000).max(3600000).default(300000),
    })
    .optional(),
});

type WebhookConfigFormData = z.infer<typeof webhookConfigSchema>;

interface EndpointConfigurationProps {
  endpoint?: WebhookEndpoint | null;
  onSave: () => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function EndpointConfiguration({
  endpoint,
  onSave,
  onDelete,
  onCancel,
}: EndpointConfigurationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<WebhookTestResult | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [generatedSecret, setGeneratedSecret] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const isEditing = !!endpoint;
  const availableEvents = getAllWebhookEvents();

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
    reset,
  } = useForm<WebhookConfigFormData>({
    resolver: zodResolver(webhookConfigSchema),
    defaultValues: {
      url: endpoint?.url || '',
      events: endpoint?.events.map((e) => e.id || e) || [],
      description: endpoint?.description || '',
      isActive: endpoint?.isActive ?? true,
      retryConfig: {
        maxAttempts: 3,
        backoffMultiplier: 2,
        initialDelay: 1000,
        maxDelay: 300000,
      },
    },
  });

  const watchedUrl = watch('url');
  const watchedEvents = watch('events');

  // Generate webhook secret for new endpoints
  useEffect(() => {
    if (!isEditing && !generatedSecret) {
      const secret = `ws_${crypto.randomUUID().replace(/-/g, '')}${Date.now().toString(36)}`;
      setGeneratedSecret(secret);
    }
  }, [isEditing, generatedSecret]);

  const testEndpoint = async (url: string) => {
    if (!url || !url.startsWith('https://')) {
      toast.error('Please enter a valid HTTPS URL before testing');
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const testPayload = {
        event: 'webhook.test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'This is a test webhook from WedSync',
          test: true,
          wedding_id: 'test-wedding-123',
          supplier_id: 'test-supplier-456',
        },
      };

      const startTime = Date.now();
      const response = await fetch('/api/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          payload: testPayload,
          secret: generatedSecret || endpoint?.secret,
        }),
      });

      const responseTime = Date.now() - startTime;
      const result = await response.json();

      setTestResult({
        success: response.ok,
        responseCode: response.status,
        responseTime,
        errorMessage: result.error,
        timestamp: new Date().toISOString(),
      });

      if (response.ok) {
        toast.success(
          `Webhook test successful! Response time: ${responseTime}ms`,
        );
      } else {
        toast.error(`Webhook test failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Webhook test error:', error);
      setTestResult({
        success: false,
        responseTime: 0,
        errorMessage: 'Network error - unable to reach endpoint',
        timestamp: new Date().toISOString(),
      });
      toast.error('Unable to test webhook - network error');
    } finally {
      setIsTesting(false);
    }
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast.success('Secret copied to clipboard');
  };

  const onSubmit = async (data: WebhookConfigFormData) => {
    setIsLoading(true);

    try {
      const payload = {
        ...data,
        secret: generatedSecret || endpoint?.secret,
        events: data.events,
      };

      const url = isEditing
        ? `/api/webhooks/endpoints/${endpoint!.id}`
        : '/api/webhooks/endpoints';

      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save webhook');
      }

      toast.success(
        `Webhook ${isEditing ? 'updated' : 'created'} successfully`,
      );
      onSave();
    } catch (error) {
      console.error('Save webhook error:', error);
      toast.error(
        `Failed to ${isEditing ? 'update' : 'create'} webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!endpoint) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/webhooks/endpoints/${endpoint.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete webhook');
      }

      toast.success('Webhook deleted successfully');
      onDelete?.();
    } catch (error) {
      console.error('Delete webhook error:', error);
      toast.error(
        `Failed to delete webhook: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const selectAllEvents = () => {
    setValue(
      'events',
      availableEvents.map((e) => e.id),
      { shouldDirty: true },
    );
  };

  const clearAllEvents = () => {
    setValue('events', [], { shouldDirty: true });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="flex items-center"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Overview
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900">
          {isEditing ? 'Edit Webhook Endpoint' : 'Create Webhook Endpoint'}
        </h1>
      </div>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="flex flex-row items-center space-y-0 pb-2">
          <Shield className="mr-2 h-5 w-5 text-amber-600" />
          <CardTitle className="text-amber-800">
            Security Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-amber-700 space-y-2">
            <p>• HTTPS URLs only - HTTP is not allowed for security</p>
            <p>• Webhook secrets are automatically generated and encrypted</p>
            <p>• Private/localhost URLs are blocked for security</p>
            <p>• All webhook data is encrypted in transit and at rest</p>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* URL Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="mr-2 h-5 w-5" />
              Endpoint URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url" className="text-sm font-medium">
                Webhook URL *
              </Label>
              <div className="relative">
                <Input
                  id="url"
                  type="url"
                  placeholder="https://your-crm.com/webhooks/wedsync"
                  className={cn(
                    'pl-10',
                    errors.url && 'border-red-300 focus:border-red-500',
                  )}
                  {...register('url')}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
              {errors.url && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertTriangle className="mr-1 h-4 w-4" />
                  {errors.url.message}
                </p>
              )}
              <p className="text-xs text-gray-500">
                Must be HTTPS. This is where we'll send your wedding event
                notifications.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="e.g., Photography CRM integration for client bookings"
                rows={2}
                maxLength={500}
                className={errors.description ? 'border-red-300' : ''}
                {...register('description')}
              />
              {errors.description && (
                <p className="text-sm text-red-600">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Test Endpoint */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Test Webhook Endpoint
                </p>
                <p className="text-xs text-gray-600">
                  Send a test payload to verify your endpoint is working
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => testEndpoint(watchedUrl)}
                disabled={isTesting || !watchedUrl}
                className="flex items-center"
              >
                {isTesting ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="mr-2 h-4 w-4" />
                )}
                {isTesting ? 'Testing...' : 'Test'}
              </Button>
            </div>

            {/* Test Results */}
            {testResult && (
              <div
                className={cn(
                  'p-4 rounded-lg border',
                  testResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200',
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {testResult.success ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={cn(
                        'font-medium',
                        testResult.success ? 'text-green-800' : 'text-red-800',
                      )}
                    >
                      {testResult.success ? 'Test Successful' : 'Test Failed'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    {testResult.responseCode && `${testResult.responseCode} • `}
                    {testResult.responseTime}ms
                  </div>
                </div>
                {testResult.errorMessage && (
                  <p className="text-sm text-red-700 mt-2">
                    {testResult.errorMessage}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhook Secret */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="mr-2 h-5 w-5" />
              Security Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Webhook Secret</Label>
              <div className="flex items-center space-x-2">
                <Input
                  type={showSecret ? 'text' : 'password'}
                  value={
                    generatedSecret ||
                    (endpoint?.secret ? maskWebhookSecret(endpoint.secret) : '')
                  }
                  readOnly
                  className="font-mono text-sm bg-gray-50"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    copySecret(generatedSecret || endpoint?.secret || '')
                  }
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Use this secret to verify webhook authenticity. Include it in
                your HMAC-SHA256 signature validation.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Active</Label>
                <p className="text-xs text-gray-500">
                  Enable or disable this webhook endpoint
                </p>
              </div>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Event Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Event Subscriptions</CardTitle>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selectAllEvents}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllEvents}
              >
                Clear All
              </Button>
              <span className="text-sm text-gray-500">
                {watchedEvents.length} events selected
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {errors.events && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700 flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4" />
                  {errors.events.message}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.entries({
                'Client Management': availableEvents.filter(
                  (e) => e.category === 'client_management',
                ),
                'Forms & Documents': availableEvents.filter(
                  (e) => e.category === 'forms_documents',
                ),
                Payments: availableEvents.filter(
                  (e) => e.category === 'payments',
                ),
                Communications: availableEvents.filter(
                  (e) => e.category === 'communications',
                ),
                Bookings: availableEvents.filter(
                  (e) => e.category === 'bookings',
                ),
                Timeline: availableEvents.filter(
                  (e) => e.category === 'timeline',
                ),
                Gallery: availableEvents.filter(
                  (e) => e.category === 'gallery',
                ),
                Reports: availableEvents.filter(
                  (e) => e.category === 'reports',
                ),
              }).map(([category, events]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-medium text-gray-900">{category}</h4>
                  <div className="space-y-2">
                    {events.map((event) => (
                      <Controller
                        key={event.id}
                        name="events"
                        control={control}
                        render={({ field }) => (
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              id={event.id}
                              checked={field.value.includes(event.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  field.onChange([...field.value, event.id]);
                                } else {
                                  field.onChange(
                                    field.value.filter((id) => id !== event.id),
                                  );
                                }
                              }}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <label
                              htmlFor={event.id}
                              className="flex-1 text-sm text-gray-700 cursor-pointer"
                            >
                              {event.name}
                            </label>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-xs',
                                event.frequency === 'high' &&
                                  'border-red-300 text-red-700',
                                event.frequency === 'medium' &&
                                  'border-yellow-300 text-yellow-700',
                                event.frequency === 'low' &&
                                  'border-green-300 text-green-700',
                              )}
                            >
                              {event.frequency}
                            </Badge>
                          </div>
                        )}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6">
          <div>
            {isEditing && onDelete && (
              <AlertDialog
                open={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
              >
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isLoading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Webhook
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Webhook Endpoint</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this webhook endpoint?
                      This action cannot be undone. All delivery history will be
                      permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Delete Webhook
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !isDirty}
              className="flex items-center"
            >
              {isLoading ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isLoading
                ? isEditing
                  ? 'Updating...'
                  : 'Creating...'
                : isEditing
                  ? 'Update Webhook'
                  : 'Create Webhook'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
