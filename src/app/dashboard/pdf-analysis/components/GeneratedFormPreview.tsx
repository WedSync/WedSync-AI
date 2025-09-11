'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  Settings,
  Download,
  Share2,
  RefreshCw,
  Palette,
  Type,
  Layout,
  Sparkles,
  Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ExtractedField {
  id: string;
  name: string;
  type:
    | 'text'
    | 'email'
    | 'phone'
    | 'date'
    | 'textarea'
    | 'select'
    | 'checkbox'
    | 'radio';
  value: string;
  confidence: number;
  category: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  weddingContext?: {
    importance: 'critical' | 'important' | 'optional';
    tips: string[];
    relatedFields: string[];
  };
}

interface FormStyle {
  theme: 'elegant' | 'modern' | 'rustic' | 'minimal';
  primaryColor: string;
  fontFamily: string;
  spacing: 'compact' | 'comfortable' | 'spacious';
  cornerRadius: 'sharp' | 'rounded' | 'pill';
}

interface DeviceViewport {
  name: string;
  width: number;
  height: number;
  icon: React.ComponentType<any>;
  label: string;
}

interface GeneratedFormPreviewProps {
  extractedFields: ExtractedField[];
  onFieldUpdate: (fieldId: string, updates: Partial<ExtractedField>) => void;
  onStyleUpdate: (style: Partial<FormStyle>) => void;
  onExport: (format: 'pdf' | 'html' | 'json') => void;
  isLoading?: boolean;
}

const deviceViewports: DeviceViewport[] = [
  {
    name: 'desktop',
    width: 1200,
    height: 800,
    icon: Monitor,
    label: 'Desktop',
  },
  {
    name: 'tablet',
    width: 768,
    height: 1024,
    icon: Tablet,
    label: 'Tablet',
  },
  {
    name: 'mobile',
    width: 375,
    height: 667,
    icon: Smartphone,
    label: 'Mobile',
  },
];

const formThemes = {
  elegant: {
    name: 'Elegant Wedding',
    colors: ['#8B5CF6', '#EC4899', '#EF4444', '#F59E0B'],
    font: 'font-serif',
    description: 'Classic and sophisticated for luxury weddings',
  },
  modern: {
    name: 'Modern Minimalist',
    colors: ['#3B82F6', '#10B981', '#6366F1', '#8B5CF6'],
    font: 'font-sans',
    description: 'Clean and contemporary for modern couples',
  },
  rustic: {
    name: 'Rustic Romance',
    colors: ['#92400E', '#059669', '#DC2626', '#D97706'],
    font: 'font-mono',
    description: 'Warm and natural for outdoor weddings',
  },
  minimal: {
    name: 'Clean & Simple',
    colors: ['#6B7280', '#374151', '#111827', '#1F2937'],
    font: 'font-sans',
    description: 'Understated elegance for any wedding style',
  },
};

export function GeneratedFormPreview({
  extractedFields,
  onFieldUpdate,
  onStyleUpdate,
  onExport,
  isLoading = false,
}: GeneratedFormPreviewProps) {
  const [currentDevice, setCurrentDevice] = useState<DeviceViewport>(
    deviceViewports[0],
  );
  const [formStyle, setFormStyle] = useState<FormStyle>({
    theme: 'elegant',
    primaryColor: '#8B5CF6',
    fontFamily: 'font-serif',
    spacing: 'comfortable',
    cornerRadius: 'rounded',
  });
  const [showStylePanel, setShowStylePanel] = useState(false);
  const [previewMode, setPreviewMode] = useState<'edit' | 'preview'>('preview');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Group fields by category
  const fieldsByCategory = extractedFields.reduce(
    (acc, field) => {
      const category = field.category || 'Other Details';
      if (!acc[category]) acc[category] = [];
      acc[category].push(field);
      return acc;
    },
    {} as Record<string, ExtractedField[]>,
  );

  const handleStyleUpdate = (updates: Partial<FormStyle>) => {
    const newStyle = { ...formStyle, ...updates };
    setFormStyle(newStyle);
    onStyleUpdate(newStyle);
  };

  const handleRefreshPreview = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const renderField = (field: ExtractedField) => {
    const baseClasses = cn(
      'w-full transition-all duration-200',
      formStyle.cornerRadius === 'sharp' && 'rounded-none',
      formStyle.cornerRadius === 'rounded' && 'rounded-md',
      formStyle.cornerRadius === 'pill' && 'rounded-full',
      formStyle.fontFamily,
    );

    const inputClasses = cn(
      baseClasses,
      'border-2 border-gray-200 focus:border-primary focus:outline-none px-4 py-3',
      'bg-white hover:border-gray-300',
    );

    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            className={cn(
              inputClasses,
              formStyle.cornerRadius === 'pill' && 'rounded-lg',
            )}
            placeholder={
              field.placeholder || `Enter ${field.name.toLowerCase()}...`
            }
            rows={4}
            defaultValue={field.value}
          />
        );

      case 'select':
        return (
          <select className={inputClasses} defaultValue={field.value}>
            <option value="">Choose {field.name.toLowerCase()}...</option>
            {field.options?.map((option, idx) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              className={cn(
                'h-5 w-5 text-primary border-2 border-gray-300 rounded focus:ring-primary',
                formStyle.cornerRadius === 'sharp' && 'rounded-none',
              )}
              defaultChecked={field.value === 'true'}
            />
            <label className={cn('text-gray-700', formStyle.fontFamily)}>
              {field.name}
            </label>
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-3">
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-3">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  className="h-5 w-5 text-primary border-2 border-gray-300 focus:ring-primary"
                  defaultChecked={field.value === option}
                />
                <label className={cn('text-gray-700', formStyle.fontFamily)}>
                  {option}
                </label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <input
            type={field.type}
            className={inputClasses}
            placeholder={
              field.placeholder || `Enter ${field.name.toLowerCase()}...`
            }
            defaultValue={field.value}
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-purple-600" />
                <span>Generated Form Preview</span>
                <Badge variant="secondary" className="ml-2">
                  {extractedFields.length} fields
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Preview how your wedding form will appear to couples
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPreview}
                disabled={isRefreshing}
              >
                <RefreshCw
                  className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')}
                />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowStylePanel(!showStylePanel)}
              >
                <Palette className="h-4 w-4 mr-2" />
                Style
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onExport('html')}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {/* Device Selection */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              {deviceViewports.map((device) => (
                <button
                  key={device.name}
                  onClick={() => setCurrentDevice(device)}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
                    currentDevice.name === device.name
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900',
                  )}
                >
                  <device.icon className="h-4 w-4" />
                  <span>{device.label}</span>
                </button>
              ))}
            </div>

            <div className="text-sm text-gray-500">
              {currentDevice.width} × {currentDevice.height}px
            </div>
          </div>

          {/* Style Panel */}
          <AnimatePresence>
            {showStylePanel && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-4 bg-gray-50 rounded-lg border"
              >
                <h4 className="font-medium text-gray-900 mb-4">Form Styling</h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Theme Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wedding Theme
                    </label>
                    <div className="space-y-2">
                      {Object.entries(formThemes).map(([key, theme]) => (
                        <button
                          key={key}
                          onClick={() =>
                            handleStyleUpdate({
                              theme: key as FormStyle['theme'],
                              primaryColor: theme.colors[0],
                              fontFamily: theme.font,
                            })
                          }
                          className={cn(
                            'w-full text-left p-3 rounded-lg border transition-all',
                            formStyle.theme === key
                              ? 'border-primary bg-primary/5'
                              : 'border-gray-200 hover:border-gray-300',
                          )}
                        >
                          <div className="font-medium text-sm">
                            {theme.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {theme.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accent Color
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {formThemes[formStyle.theme].colors.map((color) => (
                        <button
                          key={color}
                          onClick={() =>
                            handleStyleUpdate({ primaryColor: color })
                          }
                          className={cn(
                            'h-12 rounded-lg border-2 transition-all',
                            formStyle.primaryColor === color
                              ? 'border-gray-900'
                              : 'border-gray-200 hover:border-gray-300',
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Spacing */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Field Spacing
                    </label>
                    <div className="space-y-2">
                      {[
                        { key: 'compact', label: 'Compact' },
                        { key: 'comfortable', label: 'Comfortable' },
                        { key: 'spacious', label: 'Spacious' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() =>
                            handleStyleUpdate({
                              spacing: key as FormStyle['spacing'],
                            })
                          }
                          className={cn(
                            'w-full px-3 py-2 text-sm rounded-md border transition-all',
                            formStyle.spacing === key
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-gray-200 hover:border-gray-300',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Corner Radius */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Corner Style
                    </label>
                    <div className="space-y-2">
                      {[
                        { key: 'sharp', label: 'Sharp' },
                        { key: 'rounded', label: 'Rounded' },
                        { key: 'pill', label: 'Pill' },
                      ].map(({ key, label }) => (
                        <button
                          key={key}
                          onClick={() =>
                            handleStyleUpdate({
                              cornerRadius: key as FormStyle['cornerRadius'],
                            })
                          }
                          className={cn(
                            'w-full px-3 py-2 text-sm border transition-all',
                            key === 'sharp' && 'rounded-none',
                            key === 'rounded' && 'rounded-md',
                            key === 'pill' && 'rounded-full',
                            formStyle.cornerRadius === key
                              ? 'border-primary bg-primary/5 text-primary'
                              : 'border-gray-200 hover:border-gray-300',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Form Preview */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-center bg-gray-100 p-8">
            <motion.div
              key={currentDevice.name}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="bg-white rounded-lg shadow-xl overflow-hidden border"
              style={{
                width: Math.min(currentDevice.width, 1000),
                maxHeight: '80vh',
                minHeight: '500px',
              }}
            >
              {/* Mock Browser Chrome */}
              <div className="bg-gray-100 px-4 py-3 flex items-center space-x-2 border-b">
                <div className="flex space-x-1">
                  <div className="h-3 w-3 bg-red-400 rounded-full"></div>
                  <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                  <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                </div>
                <div className="flex-1 bg-white rounded-md px-3 py-1 text-sm text-gray-600">
                  wedsync.com/forms/wedding-details
                </div>
              </div>

              {/* Form Content */}
              <div className="overflow-y-auto" style={{ maxHeight: '70vh' }}>
                <div
                  className={cn(
                    'p-6',
                    formStyle.fontFamily,
                    formStyle.spacing === 'compact' && 'space-y-4',
                    formStyle.spacing === 'comfortable' && 'space-y-6',
                    formStyle.spacing === 'spacious' && 'space-y-8',
                  )}
                >
                  {/* Form Header */}
                  <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                      <Heart className="h-8 w-8 text-pink-500 mr-2" />
                      <h1
                        className={cn(
                          'text-2xl font-bold',
                          formStyle.fontFamily,
                        )}
                        style={{ color: formStyle.primaryColor }}
                      >
                        Wedding Details Form
                      </h1>
                    </div>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Help us create your perfect wedding day by sharing your
                      preferences and details.
                    </p>
                  </div>

                  {/* Form Sections */}
                  {Object.entries(fieldsByCategory).map(
                    ([category, categoryFields]) => (
                      <div key={category} className="mb-8">
                        <h3
                          className={cn(
                            'text-lg font-semibold mb-4 pb-2 border-b',
                            formStyle.fontFamily,
                          )}
                          style={{ color: formStyle.primaryColor }}
                        >
                          {category}
                        </h3>

                        <div
                          className={cn(
                            'grid gap-4',
                            currentDevice.name === 'mobile'
                              ? 'grid-cols-1'
                              : 'grid-cols-2',
                          )}
                        >
                          {categoryFields.map((field) => (
                            <div
                              key={field.id}
                              className={cn(
                                field.type === 'textarea' && 'col-span-full',
                              )}
                            >
                              <label
                                className={cn(
                                  'block text-sm font-medium text-gray-700 mb-2',
                                  formStyle.fontFamily,
                                )}
                              >
                                {field.name}
                                {field.required && (
                                  <span className="text-red-500 ml-1">*</span>
                                )}
                                {field.weddingContext?.importance ===
                                  'critical' && (
                                  <Sparkles className="inline h-4 w-4 text-yellow-500 ml-1" />
                                )}
                              </label>

                              {renderField(field)}

                              {field.weddingContext?.tips &&
                                field.weddingContext.tips.length > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    💡 {field.weddingContext.tips[0]}
                                  </p>
                                )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ),
                  )}

                  {/* Form Footer */}
                  <div className="pt-8 border-t">
                    <div
                      className={cn(
                        'flex gap-4',
                        currentDevice.name === 'mobile'
                          ? 'flex-col'
                          : 'flex-row justify-between',
                      )}
                    >
                      <Button variant="outline" className="flex-1">
                        Save as Draft
                      </Button>
                      <Button
                        className="flex-1"
                        style={{ backgroundColor: formStyle.primaryColor }}
                      >
                        Submit Wedding Details
                      </Button>
                    </div>

                    <p className="text-xs text-gray-500 text-center mt-4">
                      Your information is secure and will only be shared with
                      your selected wedding vendors.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {extractedFields.filter((f) => f.required).length}
              </div>
              <div className="text-sm text-gray-600">Required Fields</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(
                  extractedFields.reduce((sum, f) => sum + f.confidence, 0) /
                    extractedFields.length,
                )}
                %
              </div>
              <div className="text-sm text-gray-600">Avg. Confidence</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.keys(fieldsByCategory).length}
              </div>
              <div className="text-sm text-gray-600">Form Sections</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
