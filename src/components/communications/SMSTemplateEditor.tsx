'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MessageSquare,
  Hash,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Zap,
  Shield,
  Plus,
  X,
  Type,
} from 'lucide-react';
import type { SMSTemplate, SMSMergeField, SMSMetrics } from '@/types/sms';

// Template form validation schema
const templateSchema = z.object({
  name: z
    .string()
    .min(1, 'Template name is required')
    .max(200, 'Name too long'),
  category: z.enum([
    'welcome',
    'payment_reminder',
    'meeting_confirmation',
    'thank_you',
    'client_communication',
    'custom',
  ]),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(1600, 'Content too long (max 1600 chars)'),
  status: z.enum(['active', 'draft', 'archived']).optional().default('draft'),
  description: z.string().optional(),
  opt_out_required: z.boolean().optional().default(true),
  tcpa_compliant: z.boolean().optional().default(false),
  consent_required: z.boolean().optional().default(true),
});

type TemplateFormData = z.infer<typeof templateSchema>;

interface SMSTemplateEditorProps {
  template?: SMSTemplate;
  onSave: (template: SMSTemplate) => void;
  onCancel: () => void;
  mergeFields: SMSMergeField[];
}

// Category options with wedding context
const CATEGORIES = [
  {
    value: 'welcome' as const,
    label: 'Welcome',
    description: 'Initial client welcome messages',
  },
  {
    value: 'payment_reminder' as const,
    label: 'Payment Reminder',
    description: 'Payment due notifications',
  },
  {
    value: 'meeting_confirmation' as const,
    label: 'Meeting Confirmation',
    description: 'Appointment confirmations',
  },
  {
    value: 'thank_you' as const,
    label: 'Thank You',
    description: 'Post-event gratitude messages',
  },
  {
    value: 'client_communication' as const,
    label: 'Client Communication',
    description: 'General client updates',
  },
  {
    value: 'custom' as const,
    label: 'Custom',
    description: 'Custom message templates',
  },
];

export default function SMSTemplateEditor({
  template,
  onSave,
  onCancel,
  mergeFields,
}: SMSTemplateEditorProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [metrics, setMetrics] = useState<SMSMetrics>({
    character_count: 0,
    segment_count: 1,
    has_unicode: false,
    encoding: 'GSM 7-bit',
    estimated_cost: 0,
    character_limit: 160,
    characters_remaining: 160,
  });
  const [validationIssues, setValidationIssues] = useState<{
    errors: string[];
    warnings: string[];
    compliance_issues: string[];
  }>({ errors: [], warnings: [], compliance_issues: [] });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: template?.name || '',
      category: template?.category || 'custom',
      content: template?.content || '',
      status: template?.status || 'draft',
      description: template?.metadata?.description || '',
      opt_out_required: template?.opt_out_required ?? true,
      tcpa_compliant: template?.tcpa_compliant ?? false,
      consent_required: template?.consent_required ?? true,
    },
  });

  const watchContent = form.watch('content');

  // Calculate SMS metrics in real-time
  const calculateMetrics = useCallback((content: string) => {
    const characterCount = content.length;
    const hasUnicode = /[^\x00-\x7F]/.test(content);

    let segmentCount = 1;
    let characterLimit = 160;

    if (hasUnicode) {
      characterLimit = 70;
      if (characterCount <= 70) {
        segmentCount = 1;
      } else {
        segmentCount = Math.ceil(characterCount / 67);
      }
    } else {
      characterLimit = 160;
      if (characterCount <= 160) {
        segmentCount = 1;
      } else {
        segmentCount = Math.ceil(characterCount / 153);
      }
    }

    const estimatedCost = segmentCount * 0.0075;
    const charactersRemaining = Math.max(
      0,
      characterLimit - (characterCount % characterLimit || characterLimit),
    );

    return {
      character_count: characterCount,
      segment_count: segmentCount,
      has_unicode: hasUnicode,
      encoding: hasUnicode ? ('UCS-2' as const) : ('GSM 7-bit' as const),
      estimated_cost: estimatedCost,
      character_limit: characterLimit,
      characters_remaining: charactersRemaining,
    };
  }, []);

  // Validate content for compliance
  const validateContent = useCallback(
    (content: string, optOutRequired: boolean) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const complianceIssues: string[] = [];

      // Character limit validation
      if (content.length > 1600) {
        errors.push('Message exceeds maximum length (1600 characters)');
      }

      // Check for opt-out language
      const optOutKeywords = ['STOP', 'QUIT', 'UNSUBSCRIBE', 'END', 'CANCEL'];
      const hasOptOut = optOutKeywords.some((keyword) =>
        content.toUpperCase().includes(keyword.toUpperCase()),
      );

      if (optOutRequired && !hasOptOut) {
        complianceIssues.push(
          'TCPA Compliance: Message should include opt-out instructions (e.g., "Reply STOP to opt out")',
        );
      }

      // Check for problematic characters
      const problematicChars = content.match(/[""'']/g);
      if (problematicChars) {
        warnings.push('Smart quotes detected - may cause encoding issues');
      }

      // Cost warnings
      const currentMetrics = calculateMetrics(content);
      if (currentMetrics.estimated_cost > 0.05) {
        warnings.push(
          `High cost message: $${currentMetrics.estimated_cost.toFixed(4)} (${currentMetrics.segment_count} segments)`,
        );
      }

      // Segment warnings
      if (currentMetrics.segment_count > 5) {
        warnings.push(
          `Message will be split into ${currentMetrics.segment_count} segments`,
        );
      }

      return { errors, warnings, compliance_issues: complianceIssues };
    },
    [calculateMetrics],
  );

  // Update metrics when content changes
  useEffect(() => {
    const content = watchContent || '';
    const newMetrics = calculateMetrics(content);
    const validation = validateContent(
      content,
      form.getValues('opt_out_required'),
    );

    setMetrics(newMetrics);
    setValidationIssues(validation);
  }, [watchContent, calculateMetrics, validateContent, form]);

  // Insert merge field
  const insertMergeField = (field: SMSMergeField) => {
    const currentContent = form.getValues('content');
    const mergeFieldText = `{{${field.key}}}`;

    // Simple insertion at the end for now
    form.setValue('content', currentContent + mergeFieldText, {
      shouldValidate: true,
    });
  };

  // Handle form submission
  const onSubmit = async (data: TemplateFormData) => {
    setIsLoading(true);
    try {
      const templateData = {
        ...data,
        id: template?.id || '',
        user_id: template?.user_id || '',
        created_by: template?.created_by || '',
        created_at: template?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        usage_count: template?.usage_count || 0,
        is_favorite: template?.is_favorite || false,
        variables: extractVariables(data.content),

        // SMS-specific fields
        character_count: metrics.character_count,
        segment_count: metrics.segment_count,
        character_limit: metrics.character_limit,

        metadata: {
          description: data.description,
          compliance_notes: validationIssues.compliance_issues.join('; '),
          warnings: validationIssues.warnings.join('; '),
        },
      } as SMSTemplate;

      onSave(templateData);
    } catch (error) {
      console.error('Error saving template:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Extract variables from content
  const extractVariables = (content: string): string[] => {
    const matches = content.match(/{{([^}]+)}}/g) || [];
    return [...new Set(matches.map((match) => match.replace(/[{}]/g, '')))];
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xs">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <MessageSquare className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {template ? 'Edit SMS Template' : 'Create SMS Template'}
            </h2>
            <p className="text-sm text-gray-500">
              Design SMS templates with merge fields and compliance features
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)} className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Editor */}
          <div className="lg:col-span-2 space-y-6">
            {/* Template Details */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  {...form.register('name')}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                  placeholder="e.g., Payment Reminder - 7 Days"
                />
                {form.formState.errors.name && (
                  <p className="mt-1 text-sm text-error-600">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    {...form.register('category')}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    {...form.register('status')}
                    className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  {...form.register('description')}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200"
                  placeholder="Brief description of this template's purpose..."
                />
              </div>
            </div>

            {/* Message Content */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Message Content
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <span
                    className={`flex items-center gap-1 ${
                      metrics.character_count > metrics.character_limit
                        ? 'text-error-600'
                        : 'text-gray-500'
                    }`}
                  >
                    <Hash className="w-3 h-3" />
                    {metrics.character_count}/{metrics.character_limit}
                  </span>
                  <span className="text-gray-500">
                    {metrics.segment_count} segment
                    {metrics.segment_count !== 1 ? 's' : ''}
                  </span>
                  <span className="text-gray-500">
                    ${metrics.estimated_cost.toFixed(4)}
                  </span>
                </div>
              </div>

              <textarea
                {...form.register('content')}
                rows={6}
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 font-mono text-sm"
                placeholder="Hi {{client_first_name}}, your payment of {{amount}} is due on {{due_date}}. Reply STOP to opt out."
              />

              {form.formState.errors.content && (
                <p className="text-sm text-error-600">
                  {form.formState.errors.content.message}
                </p>
              )}

              {/* Character Count Indicator */}
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-200 ${
                      metrics.character_count > metrics.character_limit
                        ? 'bg-error-500'
                        : metrics.character_count >
                            metrics.character_limit * 0.8
                          ? 'bg-warning-500'
                          : 'bg-success-500'
                    }`}
                    style={{
                      width: `${Math.min(100, (metrics.character_count / metrics.character_limit) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 min-w-0">
                  {metrics.characters_remaining} remaining
                </span>
              </div>

              {/* Encoding Info */}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span>Encoding: {metrics.encoding}</span>
                {metrics.has_unicode && (
                  <span className="text-warning-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Unicode detected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Merge Fields */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Type className="w-4 h-4" />
                Merge Fields
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {mergeFields.map((field) => (
                  <button
                    key={field.key}
                    type="button"
                    onClick={() => insertMergeField(field)}
                    className={`w-full text-left p-2 rounded-lg border text-sm transition-all duration-200 hover:shadow-sm ${
                      field.sms_safe === false
                        ? 'border-warning-200 bg-warning-50 hover:bg-warning-100'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-900">
                        {field.key}
                      </span>
                      {field.sms_safe === false && (
                        <AlertCircle className="w-3 h-3 text-warning-500" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {field.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Compliance Settings */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Compliance
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    {...form.register('opt_out_required')}
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Require opt-out language
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    {...form.register('tcpa_compliant')}
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    TCPA compliant
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    {...form.register('consent_required')}
                    type="checkbox"
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Consent required
                  </span>
                </label>
              </div>
            </div>

            {/* Validation Issues */}
            {(validationIssues.errors.length > 0 ||
              validationIssues.warnings.length > 0 ||
              validationIssues.compliance_issues.length > 0) && (
              <div className="space-y-3">
                {validationIssues.errors.length > 0 && (
                  <div className="bg-error-50 border border-error-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-error-800 flex items-center gap-2">
                      <XCircle className="w-4 h-4" />
                      Errors
                    </h4>
                    <ul className="mt-1 text-xs text-error-700 space-y-1">
                      {validationIssues.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationIssues.warnings.length > 0 && (
                  <div className="bg-warning-50 border border-warning-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-warning-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Warnings
                    </h4>
                    <ul className="mt-1 text-xs text-warning-700 space-y-1">
                      {validationIssues.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {validationIssues.compliance_issues.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-blue-800 flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Compliance
                    </h4>
                    <ul className="mt-1 text-xs text-blue-700 space-y-1">
                      {validationIssues.compliance_issues.map(
                        (issue, index) => (
                          <li key={index}>• {issue}</li>
                        ),
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Cost Estimate */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Cost Estimate
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Segments:</span>
                  <span className="font-medium">{metrics.segment_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cost per send:</span>
                  <span className="font-medium">
                    ${metrics.estimated_cost.toFixed(4)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between">
                    <span className="text-gray-600">1,000 sends:</span>
                    <span className="font-medium">
                      ${(metrics.estimated_cost * 1000).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-gray-100"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {validationIssues.errors.length === 0 && (
              <div className="flex items-center gap-2 text-sm text-success-600">
                <CheckCircle className="w-4 h-4" />
                <span>Ready to save</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || validationIssues.errors.length > 0}
              className="inline-flex items-center px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm rounded-lg shadow-xs hover:shadow-sm transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading
                ? 'Saving...'
                : template
                  ? 'Update Template'
                  : 'Create Template'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
