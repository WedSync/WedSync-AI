'use client';

import React, { useState, useMemo } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Eye,
  EyeOff,
  RotateCcw,
  Check,
  AlertCircle,
  Heart,
  Calendar,
  MapPin,
  Users,
  Camera,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WeddingFormField,
  ViewportSize,
  FormPreviewData,
} from '@/types/form-builder';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FormPreviewProps {
  fields: WeddingFormField[];
  formTitle?: string;
  formDescription?: string;
  isVisible: boolean;
  onVisibilityToggle: () => void;
  onFormSubmit?: (data: Record<string, any>) => void;
  className?: string;
}

type PreviewMode = 'preview' | 'test';

/**
 * FormPreview - Real-time form preview with multiple viewport sizes
 *
 * Features:
 * - Real-time updates as canvas changes
 * - Desktop/Tablet/Mobile viewport switching
 * - Interactive form testing mode
 * - Wedding-specific styling and validation
 * - Responsive design with touch-friendly controls
 * - Auto-scroll to newly added fields
 */
export function FormPreview({
  fields,
  formTitle = 'Wedding Inquiry Form',
  formDescription = 'Help us understand your perfect wedding day',
  isVisible,
  onVisibilityToggle,
  onFormSubmit,
  className,
}: FormPreviewProps) {
  const [currentViewport, setCurrentViewport] =
    useState<ViewportSize>('desktop');
  const [previewMode, setPreviewMode] = useState<PreviewMode>('preview');
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  // Viewport size configurations
  const viewportSizes: Record<
    ViewportSize,
    { width: string; height: string; label: string }
  > = {
    desktop: { width: '100%', height: '100%', label: 'Desktop' },
    tablet: { width: '768px', height: '1024px', label: 'Tablet' },
    mobile: { width: '375px', height: '667px', label: 'Mobile' },
  };

  // Get preview statistics
  const previewStats = useMemo(() => {
    const totalFields = fields.length;
    const requiredFields = fields.filter((f) => f.validation?.required).length;
    const weddingSpecificFields = fields.filter(
      (f) => f.isWeddingSpecific,
    ).length;
    const estimatedTime = Math.ceil(totalFields * 1.5); // 1.5 minutes per field average

    return {
      totalFields,
      requiredFields,
      weddingSpecificFields,
      estimatedTime,
    };
  }, [fields]);

  // Handle form field changes
  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    // Clear validation error when user starts typing
    if (validationErrors[fieldId]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldId];
        return newErrors;
      });
    }
  };

  // Handle form reset
  const handleFormReset = () => {
    setFormData({});
    setValidationErrors({});
  };

  // Handle form submission (test mode)
  const handleFormSubmit = () => {
    // Basic validation
    const errors: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.validation?.required && !formData[field.id]) {
        errors[field.id] = `${field.label} is required`;
      }
    });

    setValidationErrors(errors);

    if (Object.keys(errors).length === 0) {
      onFormSubmit?.(formData);
    }
  };

  if (!isVisible) {
    return (
      <div className="w-0 overflow-hidden transition-all duration-300">
        <Button
          variant="ghost"
          size="sm"
          onClick={onVisibilityToggle}
          className="fixed right-4 top-20 z-50 shadow-lg"
        >
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex flex-col h-full bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 transition-all duration-300',
          className,
        )}
      >
        {/* Preview Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                Live Preview
              </h2>
            </div>
            <Badge variant="outline" className="text-xs">
              {previewStats.totalFields} fields
            </Badge>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onVisibilityToggle}
            className="p-2 h-8 w-8"
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>

        {/* Viewport Controls */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          {/* Viewport Size Buttons */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-950 rounded-lg p-1 border border-gray-200 dark:border-gray-700">
            {Object.entries(viewportSizes).map(([size, config]) => (
              <Tooltip key={size}>
                <TooltipTrigger asChild>
                  <Button
                    variant={currentViewport === size ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setCurrentViewport(size as ViewportSize)}
                    className="p-2 h-8 w-8"
                  >
                    {size === 'desktop' && <Monitor className="w-4 h-4" />}
                    {size === 'tablet' && <Tablet className="w-4 h-4" />}
                    {size === 'mobile' && <Smartphone className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{config.label} Preview</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Preview Mode Toggle */}
          <Tabs
            value={previewMode}
            onValueChange={(value) => setPreviewMode(value as PreviewMode)}
            className="w-auto"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview" className="text-xs">
                Preview
              </TabsTrigger>
              <TabsTrigger value="test" className="text-xs">
                Test
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Preview Statistics */}
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {previewStats.totalFields}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                Total Fields
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                {previewStats.requiredFields}
              </div>
              <div className="text-gray-500 dark:text-gray-400">Required</div>
            </div>
            <div className="text-center">
              <div className="font-medium text-rose-600 dark:text-rose-400">
                {previewStats.weddingSpecificFields}
              </div>
              <div className="text-gray-500 dark:text-gray-400">
                Wedding Fields
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-gray-100">
                ~{previewStats.estimatedTime}min
              </div>
              <div className="text-gray-500 dark:text-gray-400">Est. Time</div>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 p-4 overflow-hidden">
          <div className="h-full flex items-center justify-center">
            {/* Viewport Container */}
            <div
              className={cn(
                'bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden transition-all duration-300',
                currentViewport === 'mobile' && 'max-w-sm mx-auto',
                currentViewport === 'tablet' && 'max-w-3xl mx-auto',
                currentViewport === 'desktop' && 'w-full max-w-4xl mx-auto',
              )}
              style={{
                width:
                  currentViewport !== 'desktop'
                    ? viewportSizes[currentViewport].width
                    : '100%',
                height:
                  currentViewport !== 'desktop'
                    ? viewportSizes[currentViewport].height
                    : 'auto',
                minHeight: currentViewport === 'desktop' ? '600px' : undefined,
                maxHeight: '80vh',
              }}
            >
              {/* Form Container */}
              <ScrollArea className="h-full">
                <div className="p-6">
                  {/* Form Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      {formTitle}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                      {formDescription}
                    </p>
                  </div>

                  {/* Form Fields */}
                  {fields.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Heart className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
                        No fields added yet
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Start building your questionnaire by dragging fields
                        from the palette
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {fields.map((field, index) => (
                        <div key={field.id} className="group">
                          <PreviewFormField
                            field={field}
                            value={formData[field.id]}
                            error={validationErrors[field.id]}
                            isInteractive={previewMode === 'test'}
                            onChange={(value) =>
                              handleFieldChange(field.id, value)
                            }
                          />
                        </div>
                      ))}

                      {/* Form Actions (Test Mode) */}
                      {previewMode === 'test' && fields.length > 0 && (
                        <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex flex-col sm:flex-row gap-3 justify-between">
                            <Button
                              variant="outline"
                              onClick={handleFormReset}
                              className="flex items-center gap-2"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Reset Form
                            </Button>
                            <Button
                              onClick={handleFormSubmit}
                              className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700"
                            >
                              <Check className="w-4 h-4" />
                              Submit Inquiry
                            </Button>
                          </div>

                          {/* Validation Summary */}
                          {Object.keys(validationErrors).length > 0 && (
                            <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
                              <div className="flex items-center gap-2 text-red-700 dark:text-red-300 text-sm">
                                <AlertCircle className="w-4 h-4" />
                                Please fix{' '}
                                {Object.keys(validationErrors).length} error(s)
                                before submitting
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Wedding Context Footer */}
                  <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700 text-center">
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
                      <Heart className="w-3 h-3 text-rose-400" />
                      Powered by WedSync - Designed for Wedding Professionals
                      <Heart className="w-3 h-3 text-rose-400" />
                    </p>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

/**
 * PreviewFormField - Individual field preview component
 */
interface PreviewFormFieldProps {
  field: WeddingFormField;
  value: any;
  error?: string;
  isInteractive: boolean;
  onChange: (value: any) => void;
}

function PreviewFormField({
  field,
  value,
  error,
  isInteractive,
  onChange,
}: PreviewFormFieldProps) {
  // Get wedding-specific icon
  const getFieldIcon = (fieldType: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      'wedding-date': <Calendar className="w-4 h-4 text-rose-500" />,
      venue: <MapPin className="w-4 h-4 text-blue-500" />,
      'guest-count': <Users className="w-4 h-4 text-green-500" />,
      'photo-preferences': <Camera className="w-4 h-4 text-purple-500" />,
      'budget-range': <DollarSign className="w-4 h-4 text-amber-500" />,
      email: <span className="text-blue-500">📧</span>,
      tel: <span className="text-green-500">📞</span>,
      text: <span className="text-gray-500">📝</span>,
      textarea: <span className="text-gray-500">📄</span>,
      select: <span className="text-purple-500">📋</span>,
      radio: <span className="text-orange-500">⚪</span>,
      checkbox: <span className="text-green-500">☑️</span>,
    };
    return iconMap[fieldType] || <span className="text-gray-500">📝</span>;
  };

  return (
    <div
      className={cn(
        'group relative',
        field.isWeddingSpecific &&
          'ring-1 ring-rose-100 dark:ring-rose-900 rounded-lg p-4',
      )}
    >
      {/* Field Label */}
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-shrink-0 mt-1">{getFieldIcon(field.type)}</div>
        <div className="flex-1 min-w-0">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
            {field.validation?.required && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </label>
          {field.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {field.description}
            </p>
          )}
          {field.weddingContext?.helpText && (
            <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 italic">
              💡 {field.weddingContext.helpText}
            </p>
          )}
        </div>
        {field.isWeddingSpecific && (
          <Badge
            variant="secondary"
            className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300"
          >
            💍
          </Badge>
        )}
      </div>

      {/* Field Input */}
      <div className="ml-7">
        {/* Text Input */}
        {(field.type === 'text' ||
          field.type === 'email' ||
          field.type === 'tel') && (
          <input
            type={field.type}
            value={value || ''}
            onChange={
              isInteractive ? (e) => onChange(e.target.value) : undefined
            }
            placeholder={
              field.placeholder || field.weddingContext?.exampleValue
            }
            readOnly={!isInteractive}
            className={cn(
              'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm',
              'focus:ring-2 focus:ring-rose-500 focus:border-rose-500',
              'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
              !isInteractive && 'bg-gray-50 dark:bg-gray-800 cursor-default',
              error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            )}
          />
        )}

        {/* Textarea */}
        {field.type === 'textarea' && (
          <textarea
            value={value || ''}
            onChange={
              isInteractive ? (e) => onChange(e.target.value) : undefined
            }
            placeholder={
              field.placeholder || field.weddingContext?.exampleValue
            }
            readOnly={!isInteractive}
            rows={3}
            className={cn(
              'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm resize-y',
              'focus:ring-2 focus:ring-rose-500 focus:border-rose-500',
              'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
              !isInteractive && 'bg-gray-50 dark:bg-gray-800 cursor-default',
              error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            )}
          />
        )}

        {/* Select Dropdown */}
        {field.type === 'select' && (
          <select
            value={value || ''}
            onChange={
              isInteractive ? (e) => onChange(e.target.value) : undefined
            }
            disabled={!isInteractive}
            className={cn(
              'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm',
              'focus:ring-2 focus:ring-rose-500 focus:border-rose-500',
              'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100',
              !isInteractive && 'bg-gray-50 dark:bg-gray-800 cursor-default',
              error && 'border-red-500 focus:ring-red-500 focus:border-red-500',
            )}
          >
            <option value="">Select an option...</option>
            {field.options?.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}

        {/* Radio Options */}
        {field.type === 'radio' && (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={value === option.value}
                  onChange={
                    isInteractive ? (e) => onChange(e.target.value) : undefined
                  }
                  disabled={!isInteractive}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Checkboxes */}
        {field.type === 'checkbox' && (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(value || []).includes(option.value)}
                  onChange={
                    isInteractive
                      ? (e) => {
                          const currentValues = value || [];
                          if (e.target.checked) {
                            onChange([...currentValues, option.value]);
                          } else {
                            onChange(
                              currentValues.filter(
                                (v: any) => v !== option.value,
                              ),
                            );
                          }
                        }
                      : undefined
                  }
                  disabled={!isInteractive}
                  className="text-rose-600 focus:ring-rose-500 rounded"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default FormPreview;
