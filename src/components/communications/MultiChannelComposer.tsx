'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/untitled-ui/button';
import { Input } from '@/components/untitled-ui/input';
import { Textarea } from '@/components/untitled-ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/untitled-ui/select';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/untitled-ui/card';
import { Badge } from '@/components/untitled-ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/untitled-ui/tabs';
import { Switch } from '@/components/untitled-ui/switch';
import { Label } from '@/components/untitled-ui/label';
import { Separator } from '@/components/untitled-ui/separator';
import { Progress } from '@/components/untitled-ui/progress';
import { Alert, AlertDescription } from '@/components/untitled-ui/alert';
import {
  Mail,
  MessageSquare,
  MessageCircle,
  Upload,
  Send,
  Eye,
  DollarSign,
  Clock,
  Users,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type {
  CommunicationChannel,
  UnifiedMessageConfig,
} from '@/lib/services/unifiedCommunicationService';

interface Template {
  id: string;
  name: string;
  channels: {
    email?: { subject: string; htmlTemplate: string };
    sms?: { template: string };
    whatsapp?: { templateName: string; language: string };
  };
  variables: string[];
  category: string;
}

interface Recipient {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  preferences?: {
    primary: CommunicationChannel;
    excludeChannels?: CommunicationChannel[];
  };
}

interface MultiChannelComposerProps {
  organizationId: string;
  currentUserId: string;
  onSent?: (result: any) => void;
}

const CHANNEL_CONFIG = {
  email: {
    icon: Mail,
    label: 'Email',
    color: 'blue',
    description: 'Professional email communication',
  },
  sms: {
    icon: MessageSquare,
    label: 'SMS',
    color: 'green',
    description: 'Quick text messages',
  },
  whatsapp: {
    icon: MessageCircle,
    label: 'WhatsApp',
    color: 'emerald',
    description: 'Rich media messaging',
  },
} as const;

export function MultiChannelComposer({
  organizationId,
  currentUserId,
  onSent,
}: MultiChannelComposerProps) {
  const [selectedChannels, setSelectedChannels] = useState<
    CommunicationChannel[]
  >(['email']);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string>('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [enableScheduling, setEnableScheduling] = useState(false);
  const [enableTracking, setEnableTracking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const [costEstimate, setCostEstimate] = useState(0);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const supabase = await createClient();

  useEffect(() => {
    loadRecipients();
    loadTemplates();
  }, [organizationId]);

  useEffect(() => {
    if (selectedTemplate) {
      loadTemplateData();
    }
  }, [selectedTemplate]);

  useEffect(() => {
    if (message || selectedTemplate) {
      generatePreview();
    }
  }, [selectedChannels, message, variables, mediaFile, selectedTemplate]);

  const loadRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          phone,
          whatsapp_number,
          communication_preferences
        `,
        )
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;

      const formattedRecipients: Recipient[] = data.map((client) => ({
        id: client.id,
        name: `${client.first_name} ${client.last_name}`,
        email: client.email,
        phone: client.phone,
        whatsapp: client.whatsapp_number,
        preferences: client.communication_preferences,
      }));

      setRecipients(formattedRecipients);
    } catch (error) {
      console.error('Failed to load recipients:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('unified_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadTemplateData = () => {
    const template = templates.find((t) => t.id === selectedTemplate);
    if (!template) return;

    // Set message content based on selected channels
    if (selectedChannels.includes('email') && template.channels.email) {
      setSubject(template.channels.email.subject);
      setMessage(template.channels.email.htmlTemplate);
    } else if (selectedChannels.includes('sms') && template.channels.sms) {
      setMessage(template.channels.sms.template);
    } else if (
      selectedChannels.includes('whatsapp') &&
      template.channels.whatsapp
    ) {
      setMessage(template.channels.whatsapp.templateName);
    }

    // Initialize variables
    const initialVariables: Record<string, string> = {};
    template.variables.forEach((variable) => {
      initialVariables[variable] = '';
    });
    setVariables(initialVariables);
  };

  const generatePreview = async () => {
    if (!message && !selectedTemplate) return;

    try {
      setLoading(true);

      const config: UnifiedMessageConfig = {
        channels: selectedChannels,
        recipient: {
          email: 'preview@example.com',
          phone: '+1234567890',
          whatsapp: '+1234567890',
          name: 'Preview User',
        },
        content: {
          subject,
          message,
          templateId: selectedTemplate,
          variables,
        },
        media: mediaFile
          ? {
              url: mediaPreview,
              type: mediaFile.type.startsWith('image/') ? 'image' : 'document',
              caption: 'Media file',
            }
          : undefined,
      };

      const response = await fetch('/api/communications/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        const data = await response.json();
        setPreview(data.previews);
        setCostEstimate(
          data.previews.reduce((sum: number, p: any) => sum + p.cost, 0),
        );
      }
    } catch (error) {
      console.error('Failed to generate preview:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMediaFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setMediaPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const validateMessage = (): boolean => {
    const errors: string[] = [];

    if (selectedRecipients.length === 0) {
      errors.push('Please select at least one recipient');
    }

    if (selectedChannels.length === 0) {
      errors.push('Please select at least one communication channel');
    }

    if (!message && !selectedTemplate) {
      errors.push('Please enter a message or select a template');
    }

    if (selectedChannels.includes('email') && !subject) {
      errors.push('Email subject is required');
    }

    // Check if recipients have required contact information
    const selectedRecipientsData = recipients.filter((r) =>
      selectedRecipients.includes(r.id),
    );
    for (const recipient of selectedRecipientsData) {
      if (selectedChannels.includes('email') && !recipient.email) {
        errors.push(`${recipient.name} does not have an email address`);
      }
      if (selectedChannels.includes('sms') && !recipient.phone) {
        errors.push(`${recipient.name} does not have a phone number`);
      }
      if (selectedChannels.includes('whatsapp') && !recipient.whatsapp) {
        errors.push(`${recipient.name} does not have a WhatsApp number`);
      }
    }

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSend = async () => {
    if (!validateMessage()) return;

    try {
      setSending(true);

      const selectedRecipientsData = recipients.filter((r) =>
        selectedRecipients.includes(r.id),
      );
      const results = [];

      for (const recipient of selectedRecipientsData) {
        const config: UnifiedMessageConfig = {
          channels: selectedChannels,
          recipient: {
            email: recipient.email,
            phone: recipient.phone,
            whatsapp: recipient.whatsapp,
            name: recipient.name,
          },
          content: {
            subject,
            message,
            templateId: selectedTemplate,
            variables: {
              ...variables,
              recipient_name: recipient.name,
              sender_name: 'WedSync Team',
            },
          },
          media: mediaFile
            ? {
                url: mediaPreview,
                type: mediaFile.type.startsWith('image/')
                  ? 'image'
                  : 'document',
                caption: 'Attachment',
              }
            : undefined,
          scheduling:
            enableScheduling && scheduleDate && scheduleTime
              ? {
                  sendAt: new Date(`${scheduleDate}T${scheduleTime}`),
                }
              : undefined,
          tracking: {
            trackOpens: enableTracking,
            trackClicks: enableTracking,
          },
        };

        const response = await fetch('/api/communications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config),
        });

        if (response.ok) {
          const result = await response.json();
          results.push(result);
        }
      }

      // Clear form
      setMessage('');
      setSubject('');
      setSelectedRecipients([]);
      setMediaFile(null);
      setMediaPreview('');
      setVariables({});

      if (onSent) {
        onSent(results);
      }
    } catch (error) {
      console.error('Failed to send messages:', error);
    } finally {
      setSending(false);
    }
  };

  const renderChannelSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Communication Channels
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(CHANNEL_CONFIG).map(([channel, config]) => {
            const Icon = config.icon;
            const isSelected = selectedChannels.includes(
              channel as CommunicationChannel,
            );

            return (
              <div
                key={channel}
                className={`relative p-4 border rounded-lg cursor-pointer transition-all ${
                  isSelected
                    ? `border-${config.color}-500 bg-${config.color}-50`
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  if (isSelected) {
                    setSelectedChannels((prev) =>
                      prev.filter((c) => c !== channel),
                    );
                  } else {
                    setSelectedChannels((prev) => [
                      ...prev,
                      channel as CommunicationChannel,
                    ]);
                  }
                }}
              >
                {isSelected && (
                  <div
                    className={`absolute top-2 right-2 w-3 h-3 rounded-full bg-${config.color}-500`}
                  />
                )}
                <Icon
                  className={`h-6 w-6 mb-2 ${isSelected ? `text-${config.color}-600` : 'text-gray-500'}`}
                />
                <h3 className="font-medium text-sm">{config.label}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {config.description}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderRecipientSelector = () => (
    <Card>
      <CardHeader>
        <CardTitle>Recipients ({selectedRecipients.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="max-h-48 overflow-y-auto">
          {recipients.map((recipient) => {
            const isSelected = selectedRecipients.includes(recipient.id);
            const availableChannels = [];
            if (recipient.email) availableChannels.push('email');
            if (recipient.phone) availableChannels.push('sms');
            if (recipient.whatsapp) availableChannels.push('whatsapp');

            return (
              <div
                key={recipient.id}
                className={`flex items-center justify-between p-3 border rounded-lg mb-2 cursor-pointer ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  if (isSelected) {
                    setSelectedRecipients((prev) =>
                      prev.filter((id) => id !== recipient.id),
                    );
                  } else {
                    setSelectedRecipients((prev) => [...prev, recipient.id]);
                  }
                }}
              >
                <div>
                  <div className="font-medium">{recipient.name}</div>
                  <div className="text-sm text-gray-500">
                    {availableChannels.join(', ')}
                  </div>
                </div>
                {isSelected && <Badge variant="secondary">Selected</Badge>}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );

  const renderMessageComposer = () => (
    <Card>
      <CardHeader>
        <CardTitle>Message Content</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="template">Template (Optional)</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Select a template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedChannels.includes('email') && (
          <div>
            <Label htmlFor="subject">Email Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
            />
          </div>
        )}

        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter your message..."
            rows={6}
          />
        </div>

        {(selectedChannels.includes('whatsapp') ||
          selectedChannels.includes('email')) && (
          <div>
            <Label htmlFor="media">Media Attachment (Optional)</Label>
            <div className="mt-2">
              <input
                type="file"
                id="media"
                accept="image/*,video/*,.pdf,.doc,.docx"
                onChange={handleMediaUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('media')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Media
              </Button>
              {mediaFile && (
                <div className="mt-2 p-2 border rounded-lg">
                  <div className="text-sm font-medium">{mediaFile.name}</div>
                  <div className="text-xs text-gray-500">
                    {(mediaFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Template Variables */}
        {selectedTemplate &&
          templates.find((t) => t.id === selectedTemplate)?.variables.length >
            0 && (
            <div>
              <Label>Template Variables</Label>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {templates
                  .find((t) => t.id === selectedTemplate)
                  ?.variables.map((variable) => (
                    <div key={variable}>
                      <Label htmlFor={variable} className="text-sm">
                        {variable
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </Label>
                      <Input
                        id={variable}
                        value={variables[variable] || ''}
                        onChange={(e) =>
                          setVariables((prev) => ({
                            ...prev,
                            [variable]: e.target.value,
                          }))
                        }
                        placeholder={`Enter ${variable}...`}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
      </CardContent>
    </Card>
  );

  const renderAdvancedOptions = () => (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Options</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="scheduling">Schedule Delivery</Label>
            <p className="text-sm text-gray-500">
              Send messages at a specific time
            </p>
          </div>
          <Switch
            id="scheduling"
            checked={enableScheduling}
            onCheckedChange={setEnableScheduling}
          />
        </div>

        {enableScheduling && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduleDate">Date</Label>
              <Input
                id="scheduleDate"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="scheduleTime">Time</Label>
              <Input
                id="scheduleTime"
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="tracking">Enable Tracking</Label>
            <p className="text-sm text-gray-500">Track opens and clicks</p>
          </div>
          <Switch
            id="tracking"
            checked={enableTracking}
            onCheckedChange={setEnableTracking}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderPreview = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Message Preview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : preview.length > 0 ? (
          <Tabs defaultValue={preview[0]?.channel} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              {preview.map((p) => (
                <TabsTrigger key={p.channel} value={p.channel}>
                  {CHANNEL_CONFIG[p.channel as CommunicationChannel].label}
                </TabsTrigger>
              ))}
            </TabsList>
            {preview.map((p) => (
              <TabsContent key={p.channel} value={p.channel}>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="secondary">{p.channel.toUpperCase()}</Badge>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <DollarSign className="h-4 w-4" />${p.cost.toFixed(4)}
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap text-sm">{p.preview}</pre>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Enter message content to see preview
          </div>
        )}

        {costEstimate > 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Estimated Total Cost</span>
              <span className="text-lg font-semibold text-blue-600">
                ${(costEstimate * selectedRecipients.length).toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              ${costEstimate.toFixed(4)} per recipient ×{' '}
              {selectedRecipients.length} recipients
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Multi-Channel Message Composer
          </h1>
          <p className="text-gray-600 mt-1">
            Send unified messages across Email, SMS, and WhatsApp
          </p>
        </div>
      </div>

      {validationErrors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-disc list-inside">
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-6">
          {renderChannelSelector()}
          {renderRecipientSelector()}
          {renderAdvancedOptions()}
        </div>

        <div className="space-y-6">
          {renderMessageComposer()}
          {renderPreview()}
        </div>
      </div>

      <div className="flex items-center justify-between pt-6 border-t">
        <div className="text-sm text-gray-500">
          Ready to send to {selectedRecipients.length} recipients via{' '}
          {selectedChannels.length} channels
        </div>
        <Button
          onClick={handleSend}
          disabled={
            sending ||
            selectedRecipients.length === 0 ||
            selectedChannels.length === 0
          }
          size="lg"
        >
          {sending ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4 mr-2" />
              Send Messages
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
