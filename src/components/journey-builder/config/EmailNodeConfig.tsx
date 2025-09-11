'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, User, Users, Clock, Wand2, Eye } from 'lucide-react';

interface EmailNodeConfigProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const emailTemplates = [
  {
    id: 'welcome',
    name: 'Welcome Email',
    description: 'Initial welcome message for new clients',
  },
  {
    id: 'consultation',
    name: 'Consultation Booking',
    description: 'Schedule initial consultation',
  },
  {
    id: 'contract',
    name: 'Contract Follow-up',
    description: 'Follow up on contract signing',
  },
  {
    id: 'payment-reminder',
    name: 'Payment Reminder',
    description: 'Gentle payment reminder',
  },
  {
    id: 'pre-wedding',
    name: 'Pre-Wedding Checklist',
    description: 'Final details before the big day',
  },
  {
    id: 'post-wedding',
    name: 'Thank You & Gallery',
    description: 'Post-wedding thank you with gallery link',
  },
];

export function EmailNodeConfig({ config, onChange }: EmailNodeConfigProps) {
  const handleFieldChange = (field: string, value: any) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-4">
      {/* Email Template Selection */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Email Template
        </label>
        <select
          value={config.template || ''}
          onChange={(e) => handleFieldChange('template', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select a template...</option>
          {emailTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        {config.template && (
          <p className="text-xs text-muted-foreground mt-1">
            {emailTemplates.find((t) => t.id === config.template)?.description}
          </p>
        )}
      </div>

      {/* Subject Line */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Subject Line
        </label>
        <input
          type="text"
          value={config.subject || ''}
          onChange={(e) => handleFieldChange('subject', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="e.g., Welcome to [Studio Name]!"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Use [Studio Name], [Client Name], [Wedding Date] for personalization
        </p>
      </div>

      {/* Recipient */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Recipient
        </label>
        <div className="grid grid-cols-2 gap-2">
          {[
            {
              value: 'client',
              label: 'Client',
              icon: <User className="h-3 w-3" />,
            },
            {
              value: 'vendor',
              label: 'Vendor',
              icon: <Users className="h-3 w-3" />,
            },
            {
              value: 'team',
              label: 'Team',
              icon: <Users className="h-3 w-3" />,
            },
            {
              value: 'custom',
              label: 'Custom',
              icon: <Mail className="h-3 w-3" />,
            },
          ].map((option) => (
            <Button
              key={option.value}
              variant={
                config.recipient === option.value ? 'default' : 'outline'
              }
              size="sm"
              onClick={() => handleFieldChange('recipient', option.value)}
              className="flex items-center space-x-1"
            >
              {option.icon}
              <span>{option.label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Delivery Settings */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Delivery Settings
        </label>

        {/* Delay */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Send after</span>
            <input
              type="number"
              min="0"
              max="1440"
              value={config.delay || 0}
              onChange={(e) =>
                handleFieldChange('delay', parseInt(e.target.value) || 0)
              }
              className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
            />
            <span className="text-sm text-muted-foreground">minutes</span>
          </div>
        </div>
      </div>

      {/* Email Options */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Email Options
        </label>
        <div className="space-y-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.personalized || false}
              onChange={(e) =>
                handleFieldChange('personalized', e.target.checked)
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm">Personalize with client data</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.trackOpens || false}
              onChange={(e) =>
                handleFieldChange('trackOpens', e.target.checked)
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm">Track email opens</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config.trackClicks || false}
              onChange={(e) =>
                handleFieldChange('trackClicks', e.target.checked)
              }
              className="rounded border-gray-300"
            />
            <span className="text-sm">Track link clicks</span>
          </label>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-2 space-y-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center space-x-2"
        >
          <Eye className="h-4 w-4" />
          <span>Preview Email</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full flex items-center justify-center space-x-2"
        >
          <Wand2 className="h-4 w-4" />
          <span>AI Generate Content</span>
        </Button>
      </div>

      {/* Template Preview */}
      {config.template && (
        <div className="mt-4 p-3 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Template Preview</h4>
          <div className="text-xs text-muted-foreground">
            <p>Subject: {config.subject || 'Welcome to [Studio Name]!'}</p>
            <p>To: {config.recipient || 'client'}</p>
            <p>Delay: {config.delay || 0} minutes</p>
          </div>
        </div>
      )}
    </div>
  );
}
