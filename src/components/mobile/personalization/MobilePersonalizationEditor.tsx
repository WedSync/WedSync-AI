/**
 * WS-209: Mobile AI Content Personalization Editor
 * Touch-optimized interface for personalizing content across wedding platforms
 * Supports offline editing with PWA capabilities
 */

'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  Sparkles,
  Edit3,
  Save,
  RefreshCw,
  Eye,
  EyeOff,
  Palette,
  Type,
  Image,
  MessageSquare,
  Heart,
  Star,
  Wand2,
  Settings,
  Copy,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { TouchPersonalizationControls } from './TouchPersonalizationControls';

interface PersonalizationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'form' | 'timeline' | 'dashboard';
  content: string;
  variables: PersonalizationVariable[];
  style: PersonalizationStyle;
  preview: string;
  lastModified: string;
  isActive: boolean;
  category: string;
}

interface PersonalizationVariable {
  key: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'image';
  defaultValue: any;
  currentValue?: any;
  options?: string[];
  required: boolean;
  description?: string;
}

interface PersonalizationStyle {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  fontSize: number;
  borderRadius: number;
  spacing: number;
  animation: 'none' | 'fade' | 'slide' | 'bounce';
}

interface MobilePersonalizationEditorProps {
  template?: PersonalizationTemplate;
  onSave: (template: PersonalizationTemplate) => void;
  onPreview: (template: PersonalizationTemplate) => void;
  isOffline?: boolean;
  className?: string;
}

const defaultTemplate: PersonalizationTemplate = {
  id: '',
  name: 'New Template',
  type: 'email',
  content:
    'Hello {{customerName}}, your wedding journey with {{vendorName}} is about to begin!',
  variables: [
    {
      key: 'customerName',
      label: 'Customer Name',
      type: 'text',
      defaultValue: 'Sarah & John',
      required: true,
      description: "The couple's names",
    },
    {
      key: 'vendorName',
      label: 'Vendor Name',
      type: 'text',
      defaultValue: 'Your Wedding Photography',
      required: true,
      description: 'Your business name',
    },
    {
      key: 'weddingDate',
      label: 'Wedding Date',
      type: 'date',
      defaultValue: new Date().toISOString().split('T')[0],
      required: false,
      description: 'The wedding date',
    },
  ],
  style: {
    primaryColor: '#8B5CF6',
    secondaryColor: '#06B6D4',
    fontFamily: 'Inter',
    fontSize: 16,
    borderRadius: 8,
    spacing: 16,
    animation: 'fade',
  },
  preview: '',
  lastModified: new Date().toISOString(),
  isActive: true,
  category: 'welcome',
};

export function MobilePersonalizationEditor({
  template: initialTemplate,
  onSave,
  onPreview,
  isOffline = false,
  className = '',
}: MobilePersonalizationEditorProps) {
  const [template, setTemplate] = useState<PersonalizationTemplate>(
    initialTemplate || defaultTemplate,
  );
  const [isEditing, setIsEditing] = useState(false);
  const [showVariables, setShowVariables] = useState(false);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['content']),
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { toast } = useToast();

  // Generate live preview
  const generatedPreview = useMemo(() => {
    let content = template.content;
    template.variables.forEach((variable) => {
      const value = variable.currentValue || variable.defaultValue;
      const regex = new RegExp(`{{${variable.key}}}`, 'g');
      content = content.replace(regex, String(value));
    });
    return content;
  }, [template.content, template.variables]);

  // Update preview when content changes
  useEffect(() => {
    setTemplate((prev) => ({ ...prev, preview: generatedPreview }));
  }, [generatedPreview]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const updatedTemplate = {
        ...template,
        lastModified: new Date().toISOString(),
      };

      await onSave(updatedTemplate);
      setTemplate(updatedTemplate);
      setIsEditing(false);

      toast({
        title: 'Template saved',
        description: isOffline
          ? 'Saved offline - will sync when connected'
          : 'Template saved successfully',
        duration: 2000,
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Save failed',
        description: 'Failed to save template. Try again.',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  }, [template, onSave, isOffline, toast]);

  const handlePreview = useCallback(() => {
    setPreviewMode(!previewMode);
    if (!previewMode) {
      onPreview(template);
    }
  }, [previewMode, template, onPreview]);

  const handleContentChange = useCallback((content: string) => {
    setTemplate((prev) => ({ ...prev, content }));
    setIsEditing(true);
  }, []);

  const handleVariableChange = useCallback((key: string, value: any) => {
    setTemplate((prev) => ({
      ...prev,
      variables: prev.variables.map((variable) =>
        variable.key === key ? { ...variable, currentValue: value } : variable,
      ),
    }));
    setIsEditing(true);
  }, []);

  const handleStyleChange = useCallback(
    (styleKey: keyof PersonalizationStyle, value: any) => {
      setTemplate((prev) => ({
        ...prev,
        style: { ...prev.style, [styleKey]: value },
      }));
      setIsEditing(true);
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedPreview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied to clipboard',
        description: 'Template content copied successfully',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Copy failed',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
        duration: 2000,
      });
    }
  }, [generatedPreview, toast]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  const addVariable = useCallback(() => {
    const newVariable: PersonalizationVariable = {
      key: `variable_${Date.now()}`,
      label: 'New Variable',
      type: 'text',
      defaultValue: '',
      required: false,
    };

    setTemplate((prev) => ({
      ...prev,
      variables: [...prev.variables, newVariable],
    }));
    setIsEditing(true);
  }, []);

  const removeVariable = useCallback((key: string) => {
    setTemplate((prev) => ({
      ...prev,
      variables: prev.variables.filter((v) => v.key !== key),
    }));
    setIsEditing(true);
  }, []);

  if (previewMode) {
    return (
      <div className={`mobile-personalization-preview ${className}`}>
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          {/* Preview Header */}
          <div className="bg-gradient-to-r from-purple-500 to-cyan-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Eye className="w-5 h-5" />
                <span className="font-medium">Preview Mode</span>
              </div>
              <button
                onClick={handlePreview}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                aria-label="Exit preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div
              className="prose prose-sm max-w-none"
              style={{
                fontFamily: template.style.fontFamily,
                fontSize: `${template.style.fontSize}px`,
                color: template.style.primaryColor,
              }}
              dangerouslySetInnerHTML={{ __html: generatedPreview }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`mobile-personalization-editor bg-white ${className}`}>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-500 to-cyan-500 p-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-6 h-6" />
            <div>
              <h2 className="font-semibold">{template.name}</h2>
              <p className="text-xs opacity-90">
                {template.type} • {isOffline && '📱 Offline'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreview}
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              aria-label="Preview"
            >
              <Eye className="w-5 h-5" />
            </button>

            <button
              onClick={handleSave}
              disabled={!isEditing || saving}
              className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-white/20 hover:bg-white/30 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="text-sm">Save</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-6">
        {/* Content Editor Section */}
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('content')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <Edit3 className="w-5 h-5 text-purple-600" />
              <span className="font-medium">Content Editor</span>
            </div>
            {expandedSections.has('content') ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {expandedSections.has('content') && (
            <div className="space-y-3">
              <textarea
                value={template.content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Enter your template content..."
                className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none text-sm"
                style={{ fontSize: '16px' }} // Prevent zoom on iOS
              />

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Use {{ variableName }} for dynamic content
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 px-2 py-1 text-xs bg-gray-100 rounded-lg"
                >
                  {copied ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Variables Section */}
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('variables')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <Wand2 className="w-5 h-5 text-cyan-600" />
              <span className="font-medium">
                Variables ({template.variables.length})
              </span>
            </div>
            {expandedSections.has('variables') ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {expandedSections.has('variables') && (
            <div className="space-y-3">
              {template.variables.map((variable) => (
                <div
                  key={variable.key}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      {variable.label}
                      {variable.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    <button
                      onClick={() => removeVariable(variable.key)}
                      className="p-1 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>

                  {variable.type === 'select' ? (
                    <select
                      value={variable.currentValue || variable.defaultValue}
                      onChange={(e) =>
                        handleVariableChange(variable.key, e.target.value)
                      }
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    >
                      {variable.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : variable.type === 'boolean' ? (
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={variable.currentValue || variable.defaultValue}
                        onChange={(e) =>
                          handleVariableChange(variable.key, e.target.checked)
                        }
                        className="rounded"
                      />
                      <span className="text-sm">Enable</span>
                    </label>
                  ) : (
                    <input
                      type={variable.type}
                      value={variable.currentValue || variable.defaultValue}
                      onChange={(e) =>
                        handleVariableChange(variable.key, e.target.value)
                      }
                      placeholder={`Enter ${variable.label.toLowerCase()}`}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                      style={{ fontSize: '16px' }} // Prevent zoom on iOS
                    />
                  )}

                  {variable.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {variable.description}
                    </p>
                  )}
                </div>
              ))}

              <button
                onClick={addVariable}
                className="w-full flex items-center justify-center space-x-2 p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-400 hover:text-purple-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="text-sm">Add Variable</span>
              </button>
            </div>
          )}
        </div>

        {/* Style Editor Section */}
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('style')}
            className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <Palette className="w-5 h-5 text-pink-600" />
              <span className="font-medium">Style Settings</span>
            </div>
            {expandedSections.has('style') ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>

          {expandedSections.has('style') && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Primary Color
                </label>
                <input
                  type="color"
                  value={template.style.primaryColor}
                  onChange={(e) =>
                    handleStyleChange('primaryColor', e.target.value)
                  }
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Secondary Color
                </label>
                <input
                  type="color"
                  value={template.style.secondaryColor}
                  onChange={(e) =>
                    handleStyleChange('secondaryColor', e.target.value)
                  }
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Font Size
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={template.style.fontSize}
                  onChange={(e) =>
                    handleStyleChange('fontSize', Number(e.target.value))
                  }
                  className="w-full"
                />
                <span className="text-xs text-gray-500">
                  {template.style.fontSize}px
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Border Radius
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={template.style.borderRadius}
                  onChange={(e) =>
                    handleStyleChange('borderRadius', Number(e.target.value))
                  }
                  className="w-full"
                />
                <span className="text-xs text-gray-500">
                  {template.style.borderRadius}px
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Live Preview */}
        <div className="space-y-3">
          <h3 className="flex items-center space-x-2 font-medium text-gray-800">
            <Eye className="w-5 h-5 text-purple-600" />
            <span>Live Preview</span>
          </h3>

          <div
            className="p-4 border border-gray-200 rounded-lg bg-gray-50 min-h-[100px]"
            style={{
              borderRadius: `${template.style.borderRadius}px`,
              borderColor: template.style.secondaryColor,
            }}
          >
            <div
              className="prose prose-sm max-w-none"
              style={{
                fontFamily: template.style.fontFamily,
                fontSize: `${template.style.fontSize}px`,
                color: template.style.primaryColor,
              }}
              dangerouslySetInnerHTML={{ __html: generatedPreview }}
            />
          </div>
        </div>

        {/* Touch Controls */}
        <TouchPersonalizationControls
          template={template}
          onTemplateChange={setTemplate}
          isEditing={isEditing}
        />
      </div>

      {/* Offline Status Banner */}
      {isOffline && (
        <div className="fixed bottom-4 left-4 right-4 bg-amber-100 border border-amber-400 text-amber-800 px-3 py-2 rounded-lg text-sm flex items-center space-x-2">
          <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
          <span>Working offline - changes will sync when connected</span>
        </div>
      )}
    </div>
  );
}
