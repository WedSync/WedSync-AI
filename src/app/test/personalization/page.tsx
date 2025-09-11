/**
 * WS-209: Personalization Engine Test Page
 * Test page for mobile-first personalization interface
 */

'use client';

import React from 'react';
import { MobilePersonalizationEditor } from '@/components/mobile/personalization/MobilePersonalizationEditor';

const testTemplate = {
  id: 'test-template-1',
  name: 'Welcome Email Template',
  type: 'email' as const,
  content:
    'Hello {{customerName}}, welcome to {{vendorName}}! Your wedding date is {{weddingDate}} and we are excited to work with you. {{personalMessage}}',
  variables: [
    {
      key: 'customerName',
      label: 'Customer Name',
      type: 'text' as const,
      defaultValue: 'Sarah & John',
      required: true,
      description: "The couple's names",
    },
    {
      key: 'vendorName',
      label: 'Vendor Name',
      type: 'text' as const,
      defaultValue: 'Dream Wedding Photography',
      required: true,
      description: 'Your business name',
    },
    {
      key: 'weddingDate',
      label: 'Wedding Date',
      type: 'date' as const,
      defaultValue: '2025-06-15',
      required: false,
      description: "The couple's wedding date",
    },
    {
      key: 'personalMessage',
      label: 'Personal Message',
      type: 'text' as const,
      defaultValue: "We can't wait to capture your special day!",
      required: false,
      description: 'Add a personal touch to your message',
    },
  ],
  style: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#06B6D4',
    fontFamily: 'Inter',
    fontSize: 16,
    borderRadius: 8,
    spacing: 16,
    animation: 'fade' as const,
  },
  preview: '',
  lastModified: new Date().toISOString(),
  isActive: true,
  category: 'welcome',
};

export default function PersonalizationTestPage() {
  const handleSave = async (template: any) => {
    console.log('Saving template:', template);
    // Simulate save operation
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const handlePreview = (template: any) => {
    console.log('Preview template:', template);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <MobilePersonalizationEditor
        template={testTemplate}
        onSave={handleSave}
        onPreview={handlePreview}
        isOffline={false}
      />
    </div>
  );
}
