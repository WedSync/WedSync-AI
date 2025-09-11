'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/untitled-ui/button';
import { Input } from '@/components/untitled-ui/input';
import { Label } from '@/components/untitled-ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import { Switch } from '@/components/untitled-ui/switch';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/untitled-ui/tabs';
import { Alert, AlertDescription } from '@/components/untitled-ui/alert';
import { Separator } from '@/components/untitled-ui/separator';
import {
  MessageCircle,
  Check,
  X,
  Settings,
  Webhook,
  Shield,
  DollarSign,
  ExternalLink,
  Copy,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  WHATSAPP_TEMPLATE_CATEGORIES,
  WHATSAPP_LANGUAGE_CODES,
} from '@/types/whatsapp';

interface WhatsAppConfigurationProps {
  organizationId: string;
  currentUserId: string;
}

interface Configuration {
  id?: string;
  business_account_id: string;
  phone_number_id: string;
  phone_number: string;
  display_name: string;
  access_token: string;
  webhook_verify_token: string;
  webhook_url: string;
  is_active: boolean;
  is_verified: boolean;
  cost_per_message: number;
  daily_limit?: number;
}

interface Template {
  id: string;
  template_name: string;
  display_name: string;
  category: string;
  language_code: string;
  header_text?: string;
  body_text: string;
  footer_text?: string;
  approval_status: string;
  is_approved_template: boolean;
}

export function WhatsAppConfiguration({
  organizationId,
  currentUserId,
}: WhatsAppConfigurationProps) {
  const [config, setConfig] = useState<Configuration>({
    business_account_id: '',
    phone_number_id: '',
    phone_number: '',
    display_name: '',
    access_token: '',
    webhook_verify_token: '',
    webhook_url: '',
    is_active: false,
    is_verified: false,
    cost_per_message: 0.005,
    daily_limit: 1000,
  });

  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplate, setNewTemplate] = useState({
    template_name: '',
    display_name: '',
    category: 'UTILITY',
    language_code: 'en',
    header_text: '',
    body_text: '',
    footer_text: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<
    'pending' | 'verified' | 'failed'
  >('pending');

  const supabase = await createClient();

  useEffect(() => {
    loadConfiguration();
    generateWebhookUrl();
  }, [organizationId]);

  useEffect(() => {
    if (config.id) {
      loadTemplates();
    }
  }, [config.id]);

  const generateWebhookUrl = () => {
    const baseUrl =
      typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : process.env.NEXT_PUBLIC_SITE_URL;
    setWebhookUrl(`${baseUrl}/api/whatsapp/webhooks`);
  };

  const loadConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_configurations')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Failed to load WhatsApp configuration:', error);
        return;
      }

      if (data) {
        setConfig(data);
        setVerificationStatus(data.is_verified ? 'verified' : 'pending');
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const saveConfiguration = async () => {
    try {
      setSaving(true);

      const configData = {
        ...config,
        organization_id: organizationId,
        user_id: currentUserId,
        webhook_url: webhookUrl,
        updated_at: new Date().toISOString(),
      };

      if (config.id) {
        const { error } = await supabase
          .from('whatsapp_configurations')
          .update(configData)
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('whatsapp_configurations')
          .insert({
            ...configData,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        setConfig((prev) => ({ ...prev, id: data.id }));
      }

      setTestResult({
        success: true,
        message: 'Configuration saved successfully!',
      });
    } catch (error) {
      console.error('Failed to save configuration:', error);
      setTestResult({
        success: false,
        message:
          'Failed to save configuration: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    try {
      setTesting(true);
      setTestResult(null);

      const response = await fetch('/api/whatsapp?action=test_connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const result = await response.json();
      setTestResult(result);

      if (result.success) {
        setVerificationStatus('verified');
        setConfig((prev) => ({ ...prev, is_verified: true }));
      } else {
        setVerificationStatus('failed');
      }
    } catch (error) {
      setTestResult({
        success: false,
        message:
          'Connection test failed: ' +
          (error instanceof Error ? error.message : 'Unknown error'),
      });
      setVerificationStatus('failed');
    } finally {
      setTesting(false);
    }
  };

  const createTemplate = async () => {
    try {
      const { error } = await supabase.from('whatsapp_templates').insert({
        ...newTemplate,
        organization_id: organizationId,
        user_id: currentUserId,
        approval_status: 'PENDING',
        is_approved_template: false,
        usage_count: 0,
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Reset form
      setNewTemplate({
        template_name: '',
        display_name: '',
        category: 'UTILITY',
        language_code: 'en',
        header_text: '',
        body_text: '',
        footer_text: '',
      });

      // Reload templates
      loadTemplates();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderConfigurationForm = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          WhatsApp Business Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You need a WhatsApp Business account and access to the WhatsApp
            Business API. Visit the{' '}
            <a
              href="https://developers.facebook.com/docs/whatsapp/getting-started"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline inline-flex items-center gap-1"
            >
              WhatsApp Business API documentation
              <ExternalLink className="h-3 w-3" />
            </a>{' '}
            to get started.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="business_account_id">Business Account ID</Label>
            <Input
              id="business_account_id"
              value={config.business_account_id}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  business_account_id: e.target.value,
                }))
              }
              placeholder="Your WhatsApp Business Account ID"
            />
          </div>

          <div>
            <Label htmlFor="phone_number_id">Phone Number ID</Label>
            <Input
              id="phone_number_id"
              value={config.phone_number_id}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  phone_number_id: e.target.value,
                }))
              }
              placeholder="Your WhatsApp Phone Number ID"
            />
          </div>

          <div>
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input
              id="phone_number"
              value={config.phone_number}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, phone_number: e.target.value }))
              }
              placeholder="+1234567890"
            />
          </div>

          <div>
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              value={config.display_name}
              onChange={(e) =>
                setConfig((prev) => ({ ...prev, display_name: e.target.value }))
              }
              placeholder="Your Business Name"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="access_token">Access Token</Label>
          <Input
            id="access_token"
            type="password"
            value={config.access_token}
            onChange={(e) =>
              setConfig((prev) => ({ ...prev, access_token: e.target.value }))
            }
            placeholder="Your WhatsApp Business API Access Token"
          />
        </div>

        <div>
          <Label htmlFor="webhook_verify_token">Webhook Verify Token</Label>
          <Input
            id="webhook_verify_token"
            value={config.webhook_verify_token}
            onChange={(e) =>
              setConfig((prev) => ({
                ...prev,
                webhook_verify_token: e.target.value,
              }))
            }
            placeholder="A secure token for webhook verification"
          />
          <p className="text-sm text-gray-500 mt-1">
            Create a secure random string for webhook verification
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label htmlFor="cost_per_message">Cost per Message (USD)</Label>
            <Input
              id="cost_per_message"
              type="number"
              step="0.001"
              value={config.cost_per_message}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  cost_per_message: parseFloat(e.target.value) || 0,
                }))
              }
            />
          </div>

          <div>
            <Label htmlFor="daily_limit">Daily Message Limit</Label>
            <Input
              id="daily_limit"
              type="number"
              value={config.daily_limit || ''}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  daily_limit: parseInt(e.target.value) || undefined,
                }))
              }
              placeholder="1000"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="is_active">Enable WhatsApp Integration</Label>
            <p className="text-sm text-gray-500">
              Activate WhatsApp messaging for your organization
            </p>
          </div>
          <Switch
            id="is_active"
            checked={config.is_active}
            onCheckedChange={(checked) =>
              setConfig((prev) => ({ ...prev, is_active: checked }))
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                verificationStatus === 'verified' ? 'default' : 'secondary'
              }
              className={
                verificationStatus === 'verified'
                  ? 'bg-green-100 text-green-800'
                  : verificationStatus === 'failed'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
              }
            >
              {verificationStatus === 'verified' && (
                <Check className="h-3 w-3 mr-1" />
              )}
              {verificationStatus === 'failed' && (
                <X className="h-3 w-3 mr-1" />
              )}
              {verificationStatus === 'verified'
                ? 'Verified'
                : verificationStatus === 'failed'
                  ? 'Failed'
                  : 'Not Verified'}
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={testConnection}
              disabled={
                testing || !config.access_token || !config.phone_number_id
              }
              variant="outline"
            >
              {testing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Test Connection'
              )}
            </Button>

            <Button onClick={saveConfiguration} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Configuration'
              )}
            </Button>
          </div>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            <AlertDescription>{testResult.message}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );

  const renderWebhookSetup = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5" />
          Webhook Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Configure this webhook URL in your WhatsApp Business Manager to
            receive message delivery status and incoming messages.
          </AlertDescription>
        </Alert>

        <div>
          <Label>Webhook URL</Label>
          <div className="flex gap-2 mt-1">
            <Input value={webhookUrl} readOnly className="font-mono text-sm" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(webhookUrl)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label>Verify Token</Label>
          <div className="flex gap-2 mt-1">
            <Input
              value={config.webhook_verify_token}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyToClipboard(config.webhook_verify_token)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium mb-2">Setup Instructions:</h4>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Go to your WhatsApp Business Manager</li>
            <li>Navigate to App Settings → Webhooks</li>
            <li>Add the webhook URL above</li>
            <li>Enter the verify token above</li>
            <li>Subscribe to: messages, message_deliveries, message_reads</li>
            <li>Save and verify the webhook</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );

  const renderTemplateManagement = () => (
    <Card>
      <CardHeader>
        <CardTitle>Message Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-4">Create New Template</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="template_name">Template Name</Label>
              <Input
                id="template_name"
                value={newTemplate.template_name}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    template_name: e.target.value,
                  }))
                }
                placeholder="my_template_name"
              />
            </div>

            <div>
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={newTemplate.display_name}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    display_name: e.target.value,
                  }))
                }
                placeholder="My Template"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={newTemplate.category}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    category: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {WHATSAPP_TEMPLATE_CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label} - {cat.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="language_code">Language</Label>
              <select
                id="language_code"
                value={newTemplate.language_code}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    language_code: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                {WHATSAPP_LANGUAGE_CODES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="header_text">Header Text (Optional)</Label>
              <Input
                id="header_text"
                value={newTemplate.header_text}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    header_text: e.target.value,
                  }))
                }
                placeholder="Header text"
              />
            </div>

            <div>
              <Label htmlFor="body_text">Body Text</Label>
              <textarea
                id="body_text"
                value={newTemplate.body_text}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    body_text: e.target.value,
                  }))
                }
                placeholder="Hello {{1}}, your appointment is confirmed for {{2}}."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-sm text-gray-500 mt-1">
                Use &#123;&#123;1&#125;&#125;, &#123;&#123;2&#125;&#125;, etc.
                for variables
              </p>
            </div>

            <div>
              <Label htmlFor="footer_text">Footer Text (Optional)</Label>
              <Input
                id="footer_text"
                value={newTemplate.footer_text}
                onChange={(e) =>
                  setNewTemplate((prev) => ({
                    ...prev,
                    footer_text: e.target.value,
                  }))
                }
                placeholder="Footer text"
              />
            </div>

            <Button
              onClick={createTemplate}
              disabled={!newTemplate.template_name || !newTemplate.body_text}
            >
              Create Template
            </Button>
          </div>
        </div>

        <div>
          <h4 className="font-medium mb-4">Existing Templates</h4>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No templates created yet
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div key={template.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium">{template.display_name}</h5>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          template.approval_status === 'APPROVED'
                            ? 'default'
                            : 'secondary'
                        }
                        className={
                          template.approval_status === 'APPROVED'
                            ? 'bg-green-100 text-green-800'
                            : template.approval_status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                        }
                      >
                        {template.approval_status}
                      </Badge>
                      <Badge variant="outline">{template.category}</Badge>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>
                      <strong>Name:</strong> {template.template_name}
                    </div>
                    <div>
                      <strong>Language:</strong> {template.language_code}
                    </div>
                    <div>
                      <strong>Body:</strong> {template.body_text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">
          WhatsApp Business Configuration
        </h1>
      </div>

      <Tabs defaultValue="configuration" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-6">
          {renderConfigurationForm()}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6">
          {renderWebhookSetup()}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          {renderTemplateManagement()}
        </TabsContent>
      </Tabs>
    </div>
  );
}
