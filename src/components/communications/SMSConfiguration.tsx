'use client';

import React, { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Phone,
  Shield,
  DollarSign,
} from 'lucide-react';
import type { SMSConfiguration } from '@/types/sms';

// Untitled UI styling following the style guide
const configSchema = z.object({
  phone_number: z.string().min(1, 'Phone number is required'),
  account_sid_encrypted: z.string().min(1, 'Account SID is required'),
  auth_token_encrypted: z.string().min(1, 'Auth Token is required'),
  webhook_url: z.string().url().optional().or(z.literal('')),
  status_callback_url: z.string().url().optional().or(z.literal('')),
  auto_opt_out: z.boolean().optional().default(true),
  monthly_limit: z.number().min(1).max(50000).optional().default(1000),
  cost_per_message: z.number().min(0).max(1).optional().default(0.0075),
  opt_out_keywords: z.array(z.string()).optional(),
  opt_in_keywords: z.array(z.string()).optional(),
});

type ConfigFormData = z.infer<typeof configSchema>;

interface SMSConfigurationProps {
  onConfigChange?: (config: SMSConfiguration | null) => void;
}

export default function SMSConfiguration({
  onConfigChange,
}: SMSConfigurationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message?: string;
    messageId?: string;
  } | null>(null);
  const [configuration, setConfiguration] = useState<SMSConfiguration | null>(
    null,
  );
  const [testPhone, setTestPhone] = useState('');

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      phone_number: '',
      account_sid_encrypted: '',
      auth_token_encrypted: '',
      webhook_url: '',
      status_callback_url: '',
      auto_opt_out: true,
      monthly_limit: 1000,
      cost_per_message: 0.0075,
      opt_out_keywords: ['STOP', 'QUIT', 'UNSUBSCRIBE', 'END', 'CANCEL'],
      opt_in_keywords: ['START', 'YES', 'UNSTOP'],
    },
  });

  // Load existing configuration
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      const response = await fetch('/api/sms/config');
      const data = await response.json();

      if (data.configuration) {
        setConfiguration(data.configuration);
        onConfigChange?.(data.configuration);

        // Update form with loaded data (except sensitive fields)
        form.reset({
          phone_number: data.configuration.phone_number,
          account_sid_encrypted: data.configuration.account_sid_encrypted
            ? '***masked***'
            : '',
          auth_token_encrypted: data.configuration.auth_token_encrypted
            ? '***masked***'
            : '',
          webhook_url: data.configuration.webhook_url || '',
          status_callback_url: data.configuration.status_callback_url || '',
          auto_opt_out: data.configuration.auto_opt_out,
          monthly_limit: data.configuration.monthly_limit,
          cost_per_message: data.configuration.cost_per_message,
          opt_out_keywords: data.configuration.opt_out_keywords,
          opt_in_keywords: data.configuration.opt_in_keywords,
        });
      }
    } catch (error) {
      console.error('Failed to load SMS configuration:', error);
    }
  };

  const onSubmit = async (data: ConfigFormData) => {
    setIsLoading(true);
    try {
      // Don't submit masked credentials
      const submitData = { ...data };
      if (data.account_sid_encrypted === '***masked***') {
        delete submitData.account_sid_encrypted;
      }
      if (data.auth_token_encrypted === '***masked***') {
        delete submitData.auth_token_encrypted;
      }

      const response = await fetch('/api/sms/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();

      if (response.ok) {
        setConfiguration(result.configuration);
        onConfigChange?.(result.configuration);
        setTestResult({
          success: true,
          message: 'Configuration saved successfully!',
        });
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to save configuration',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConfiguration = async () => {
    if (!testPhone) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          content:
            'Test message from WedSync SMS configuration. Reply STOP to opt out.',
          consent_verified: true,
          bypass_opt_out: true,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setTestResult({
          success: true,
          message: `Test SMS sent successfully! Message ID: ${result.messageId}`,
          messageId: result.messageId,
        });
      } else {
        throw new Error(result.error || 'Failed to send test SMS');
      }
    } catch (error) {
      setTestResult({
        success: false,
        message:
          error instanceof Error ? error.message : 'Failed to send test SMS',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-xs">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary-50 rounded-lg">
            <Phone className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              SMS Configuration
            </h2>
            <p className="text-sm text-gray-500">
              Configure Twilio SMS integration for template messaging
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Twilio Credentials */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary-600" />
            Twilio Credentials
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account SID
              </label>
              <input
                {...form.register('account_sid_encrypted')}
                type="password"
                placeholder="AC..."
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              />
              {form.formState.errors.account_sid_encrypted && (
                <p className="mt-1 text-sm text-error-600">
                  {form.formState.errors.account_sid_encrypted.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auth Token
              </label>
              <input
                {...form.register('auth_token_encrypted')}
                type="password"
                placeholder="Enter auth token"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              />
              {form.formState.errors.auth_token_encrypted && (
                <p className="mt-1 text-sm text-error-600">
                  {form.formState.errors.auth_token_encrypted.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Twilio Phone Number
            </label>
            <input
              {...form.register('phone_number')}
              type="tel"
              placeholder="+1234567890"
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
            />
            {form.formState.errors.phone_number && (
              <p className="mt-1 text-sm text-error-600">
                {form.formState.errors.phone_number.message}
              </p>
            )}
          </div>
        </div>

        {/* Webhook Configuration */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">
            Webhook Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Webhook URL (Optional)
              </label>
              <input
                {...form.register('webhook_url')}
                type="url"
                placeholder="https://your-domain.com/webhook"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Callback URL (Optional)
              </label>
              <input
                {...form.register('status_callback_url')}
                type="url"
                placeholder="https://your-domain.com/status"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              />
            </div>
          </div>
        </div>

        {/* Usage & Cost Settings */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900 flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary-600" />
            Usage & Cost Settings
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly Limit
              </label>
              <input
                {...form.register('monthly_limit', { valueAsNumber: true })}
                type="number"
                min="1"
                max="50000"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum SMS messages per month
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cost per Message ($)
              </label>
              <input
                {...form.register('cost_per_message', { valueAsNumber: true })}
                type="number"
                step="0.0001"
                min="0"
                max="1"
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
              />
              <p className="mt-1 text-xs text-gray-500">
                Cost per SMS segment (typically $0.0075)
              </p>
            </div>
          </div>
        </div>

        {/* Compliance Settings */}
        <div className="space-y-4">
          <h3 className="text-base font-medium text-gray-900">
            Compliance Settings
          </h3>

          <div className="flex items-center">
            <input
              {...form.register('auto_opt_out')}
              type="checkbox"
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label className="ml-2 text-sm text-gray-700">
              Automatically process opt-out requests (TCPA compliance)
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center justify-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </button>

          {configuration && (
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+1234567890"
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                />
              </div>
              <button
                type="button"
                onClick={testConfiguration}
                disabled={isTesting || !testPhone}
                className="inline-flex items-center px-4 py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  'Send Test SMS'
                )}
              </button>
            </div>
          )}
        </div>

        {/* Test Result */}
        {testResult && (
          <div
            className={`flex items-start gap-3 p-4 rounded-lg ${
              testResult.success
                ? 'bg-success-50 border border-success-200'
                : 'bg-error-50 border border-error-200'
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
            )}
            <div>
              <p
                className={`text-sm font-medium ${
                  testResult.success ? 'text-success-800' : 'text-error-800'
                }`}
              >
                {testResult.message}
              </p>
              {testResult.messageId && (
                <p className="text-xs text-success-600 mt-1">
                  Message ID: {testResult.messageId}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Configuration Status */}
        {configuration && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-success-600" />
              <span className="text-sm font-medium text-gray-900">
                SMS Configuration Active
              </span>
            </div>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Phone: {configuration.phone_number}</p>
              <p>
                Monthly Usage: {configuration.monthly_usage}/
                {configuration.monthly_limit} messages
              </p>
              <p>
                Last Updated:{' '}
                {new Date(configuration.updated_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
