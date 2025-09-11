'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Tags,
  Eye,
  Save,
  RefreshCw,
  User,
  Calendar,
  MapPin,
  Users,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  EmailPersonalizationPanelProps,
  PersonalizationRule,
  EmailPreviewData,
} from '@/types/ai-email';
import { useEmailTemplateStore } from '@/stores/useEmailTemplateStore';

const EmailPersonalizationPanel: React.FC<EmailPersonalizationPanelProps> = ({
  template,
  clientData,
  personalizationRules,
  onPersonalize,
  onPreview,
  showLivePreview = true,
  className = '',
}) => {
  const {
    mergeTagValues,
    previewData,
    updateMergeTagValue,
    updatePersonalizationRule,
    generatePreview,
    personalizationRules: storeRules,
  } = useEmailTemplateStore();

  const [activeTab, setActiveTab] = useState<'rules' | 'preview'>('rules');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Use store rules if not provided as prop
  const currentRules = personalizationRules || storeRules;

  // Auto-populate merge tags from client data
  useEffect(() => {
    if (clientData) {
      const autoValues: Record<string, string> = {};

      if (clientData.couple_names)
        autoValues['{couple_names}'] = clientData.couple_names;
      if (clientData.wedding_date)
        autoValues['{wedding_date}'] = clientData.wedding_date;
      if (clientData.venue_name)
        autoValues['{venue_name}'] = clientData.venue_name;
      if (clientData.guest_count)
        autoValues['{guest_count}'] = clientData.guest_count.toString();

      Object.entries(autoValues).forEach(([token, value]) => {
        if (value && !mergeTagValues[token]) {
          updateMergeTagValue(token, value);
        }
      });
    }
  }, [clientData, mergeTagValues, updateMergeTagValue]);

  // Validate merge tag values
  const validateMergeTag = (
    rule: PersonalizationRule,
    value: string,
  ): string | null => {
    if (rule.is_required && !value.trim()) {
      return 'This field is required';
    }

    if (rule.validation_pattern && value) {
      const regex = new RegExp(rule.validation_pattern);
      if (!regex.test(value)) {
        return 'Invalid format';
      }
    }

    return null;
  };

  // Handle merge tag value change
  const handleMergeTagChange = (token: string, value: string) => {
    updateMergeTagValue(token, value);

    // Validate if rule exists
    const rule = currentRules.find((r) => r.token === token);
    if (rule) {
      const error = validateMergeTag(rule, value);
      setValidationErrors((prev) => ({
        ...prev,
        [token]: error || '',
      }));
    }

    // Generate live preview if enabled
    if (showLivePreview && template) {
      setTimeout(() => handleGeneratePreview(), 300); // Debounce
    }
  };

  // Handle preview generation
  const handleGeneratePreview = async () => {
    if (!template) return;

    setIsGeneratingPreview(true);
    try {
      await generatePreview(template);
      onPreview(previewData!);
    } catch (error) {
      console.error('Preview generation failed:', error);
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Handle personalization save
  const handleSavePersonalization = () => {
    onPersonalize(currentRules, mergeTagValues);
  };

  // Get merge tags from template content
  const templateMergeTags = useMemo(() => {
    if (!template) return [];

    const content = `${template.subject} ${template.content}`;
    const tagPattern = /\{([^}]+)\}/g;
    const tags = new Set<string>();

    let match;
    while ((match = tagPattern.exec(content)) !== null) {
      tags.add(match[0]);
    }

    return Array.from(tags);
  }, [template]);

  // Get preview content with replaced merge tags
  const getPreviewContent = () => {
    if (!template) return { subject: '', content: '' };

    let subject = template.subject;
    let content = template.content;

    Object.entries(mergeTagValues).forEach(([token, value]) => {
      const regex = new RegExp(token.replace(/[{}]/g, '\\$&'), 'g');
      subject = subject.replace(regex, value);
      content = content.replace(regex, value);
    });

    return { subject, content };
  };

  const previewContent = getPreviewContent();
  const hasRequiredMissing = currentRules.some(
    (rule) => rule.is_required && !mergeTagValues[rule.token]?.trim(),
  );

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-lg">
            <Tags className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Email Personalization
            </h2>
            <p className="text-sm text-gray-600">
              Customize merge tags and preview your email
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGeneratePreview}
            disabled={isGeneratingPreview}
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {isGeneratingPreview ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
            Preview
          </button>

          <button
            onClick={handleSavePersonalization}
            disabled={hasRequiredMissing}
            className="px-3 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Save className="w-4 h-4 mr-1" />
            Save
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200">
        {[
          { id: 'rules', label: 'Merge Tags', icon: Tags },
          { id: 'preview', label: 'Live Preview', icon: Eye },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'rules' | 'preview')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-6">
        {activeTab === 'rules' && (
          <div className="space-y-6">
            {/* Client Context Summary */}
            {clientData && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-3 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Client Information
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {clientData.couple_names && (
                    <div className="flex items-center gap-2 text-blue-700">
                      <Users className="w-3 h-3" />
                      {clientData.couple_names}
                    </div>
                  )}
                  {clientData.wedding_date && (
                    <div className="flex items-center gap-2 text-blue-700">
                      <Calendar className="w-3 h-3" />
                      {clientData.wedding_date}
                    </div>
                  )}
                  {clientData.venue_name && (
                    <div className="flex items-center gap-2 text-blue-700">
                      <MapPin className="w-3 h-3" />
                      {clientData.venue_name}
                    </div>
                  )}
                  {clientData.guest_count && (
                    <div className="flex items-center gap-2 text-blue-700">
                      <Users className="w-3 h-3" />
                      {clientData.guest_count} guests
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Merge Tags List */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900">Merge Tags</h3>

              {templateMergeTags.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Tags className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No merge tags found in this template</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {templateMergeTags.map((token) => {
                    const rule = currentRules.find((r) => r.token === token);
                    const value = mergeTagValues[token] || '';
                    const error = validationErrors[token];
                    const displayName =
                      rule?.display_name ||
                      token.replace(/[{}]/g, '').replace(/_/g, ' ');

                    return (
                      <div key={token} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                            {displayName}
                            {rule?.is_required && (
                              <span className="text-error-500">*</span>
                            )}
                            <code className="px-2 py-0.5 bg-gray-100 text-xs text-gray-600 rounded">
                              {token}
                            </code>
                          </label>

                          {rule?.auto_populate && value && (
                            <span className="flex items-center gap-1 text-xs text-success-600">
                              <CheckCircle2 className="w-3 h-3" />
                              Auto-filled
                            </span>
                          )}
                        </div>

                        {rule?.description && (
                          <p className="text-xs text-gray-600">
                            {rule.description}
                          </p>
                        )}

                        <div className="relative">
                          <input
                            type="text"
                            value={value}
                            onChange={(e) =>
                              handleMergeTagChange(token, e.target.value)
                            }
                            placeholder={
                              rule?.default_value ||
                              `Enter ${displayName.toLowerCase()}`
                            }
                            className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-gray-900 placeholder-gray-500 shadow-xs focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-300 transition-all duration-200 ${
                              error
                                ? 'border-error-300 focus:border-error-300 focus:ring-error-100'
                                : 'border-gray-300'
                            }`}
                          />

                          {error && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-error-600">
                              <AlertTriangle className="w-3 h-3" />
                              {error}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Personalization Rules Management */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">
                  Personalization Rules
                </h3>
                <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                  Add Custom Rule
                </button>
              </div>

              <div className="text-sm text-gray-600">
                {currentRules.length} active rules configured
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="space-y-6">
            {/* Preview Controls */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                Email Preview
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">
                  {Object.keys(mergeTagValues).length} tags populated
                </span>
                {hasRequiredMissing && (
                  <div className="flex items-center gap-1 text-xs text-warning-600">
                    <AlertTriangle className="w-3 h-3" />
                    Missing required tags
                  </div>
                )}
              </div>
            </div>

            {/* Preview Content */}
            <div className="border border-gray-200 rounded-lg">
              {/* Email Header */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Subject:</div>
                <div className="font-medium text-gray-900">
                  {previewContent.subject || template?.subject}
                </div>
              </div>

              {/* Email Content */}
              <div className="p-4">
                <div
                  className="prose prose-sm max-w-none text-gray-900"
                  dangerouslySetInnerHTML={{
                    __html:
                      previewContent.content ||
                      template?.content ||
                      'No content available',
                  }}
                />
              </div>
            </div>

            {/* Preview Stats */}
            {previewData && (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-semibold text-gray-900">
                    {previewData.merge_tags_used.length}
                  </div>
                  <div className="text-sm text-gray-600">Tags Used</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-semibold text-gray-900">
                    {previewData.estimated_render_time}ms
                  </div>
                  <div className="text-sm text-gray-600">Render Time</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-lg font-semibold text-gray-900">
                    {previewData.personalized_subject.length}
                  </div>
                  <div className="text-sm text-gray-600">Subject Length</div>
                </div>
              </div>
            )}

            {/* Preview Warnings */}
            {previewData?.content_warnings &&
              previewData.content_warnings.length > 0 && (
                <div className="bg-warning-50 border border-warning-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-warning-700 mb-2">
                    Content Warnings
                  </h4>
                  <ul className="text-sm text-warning-600 space-y-1">
                    {previewData.content_warnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Auto-save indicator */}
      {showLivePreview && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-600">
          Live preview enabled - changes update automatically
        </div>
      )}
    </div>
  );
};

export default EmailPersonalizationPanel;
