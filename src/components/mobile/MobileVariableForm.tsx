'use client';

/**
 * Mobile-Optimized Environment Variable Form for WedSync
 * Team D - Performance Optimization & Mobile Experience
 * Mobile-first form with keyboard optimization, voice input, and haptic feedback
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Save,
  X,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  Zap,
  Smartphone,
  CheckCircle,
  AlertCircle,
  Loader2,
  QrCode,
  Camera,
  Type,
  Hash,
  ToggleLeft,
  FileJson,
} from 'lucide-react';
import { useGestureHandler } from '@/hooks/useGestureHandler';
import { cn } from '@/lib/utils';

// Form validation schema
const variableFormSchema = z.object({
  key: z
    .string()
    .min(1, 'Variable key is required')
    .max(100, 'Key must be less than 100 characters')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Key must be uppercase with underscores only'),
  value: z.string().min(1, 'Value is required'),
  type: z.enum(['string', 'number', 'boolean', 'json']),
  category: z.enum(['system', 'integration', 'ui', 'performance', 'security']),
  environment: z.enum(['production', 'staging', 'development']),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional(),
  isPublic: z.boolean().default(false),
  isEncrypted: z.boolean().default(false),
  isRequired: z.boolean().default(false),
});

type VariableFormData = z.infer<typeof variableFormSchema>;

interface MobileVariableFormProps {
  initialData?: Partial<VariableFormData>;
  onSubmit: (data: VariableFormData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  isOffline?: boolean;
  className?: string;
}

interface VoiceRecognition {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  confidence: number;
}

/**
 * Mobile-optimized form for creating/editing environment variables
 * Designed for wedding suppliers working on mobile devices at venues
 */
export function MobileVariableForm({
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
  isOffline = false,
  className,
}: MobileVariableFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [voiceRecognition, setVoiceRecognition] = useState<VoiceRecognition>({
    isSupported: false,
    isListening: false,
    transcript: '',
    confidence: 0,
  });

  const formRef = useRef<HTMLFormElement>(null);
  const recognitionRef = useRef<any>(null);
  const lastFocusedElementRef = useRef<HTMLElement | null>(null);

  // Form setup with React Hook Form
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, dirtyFields },
    clearErrors,
    trigger,
  } = useForm<VariableFormData>({
    resolver: zodResolver(variableFormSchema),
    defaultValues: {
      key: initialData?.key || '',
      value: initialData?.value || '',
      type: initialData?.type || 'string',
      category: initialData?.category || 'system',
      environment: initialData?.environment || 'development',
      description: initialData?.description || '',
      isPublic: initialData?.isPublic || false,
      isEncrypted: initialData?.isEncrypted || false,
      isRequired: initialData?.isRequired || false,
    },
    mode: 'onChange',
  });

  const watchedType = watch('type');
  const watchedValue = watch('value');

  // Gesture handler for form interactions
  const { triggerHaptic } = useGestureHandler(
    {},
    {
      enableHaptics: true,
    },
  );

  // Initialize voice recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onstart = () => {
        setVoiceRecognition((prev) => ({ ...prev, isListening: true }));
        triggerHaptic('light');
      };

      recognitionRef.current.onend = () => {
        setVoiceRecognition((prev) => ({ ...prev, isListening: false }));
      };

      recognitionRef.current.onresult = (event: any) => {
        let transcript = '';
        let confidence = 0;

        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
          confidence = Math.max(confidence, event.results[i][0].confidence);
        }

        setVoiceRecognition((prev) => ({ ...prev, transcript, confidence }));

        // Auto-fill the focused field if confidence is high enough
        if (event.results[0].isFinal && confidence > 0.7 && focusedField) {
          setValue(focusedField as any, transcript.trim());
          trigger(focusedField as any);
          triggerHaptic('medium');
        }
      };

      setVoiceRecognition((prev) => ({ ...prev, isSupported: true }));
    }
  }, [setValue, trigger, triggerHaptic, focusedField]);

  // Keyboard height detection (iOS Safari)
  useEffect(() => {
    const handleResize = () => {
      const viewport = window.visualViewport;
      if (viewport) {
        const currentHeight = window.innerHeight;
        const heightDifference = currentHeight - viewport.height;
        setKeyboardHeight(heightDifference > 150 ? heightDifference : 0);
      }
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
      return () =>
        window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, []);

  // Auto-scroll to focused field when keyboard appears
  useEffect(() => {
    if (keyboardHeight > 0 && lastFocusedElementRef.current) {
      const element = lastFocusedElementRef.current;
      const rect = element.getBoundingClientRect();
      const visibleHeight = window.innerHeight - keyboardHeight;

      if (rect.bottom > visibleHeight) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [keyboardHeight]);

  // Handle voice input
  const startVoiceInput = useCallback(
    (fieldName: string) => {
      if (!voiceRecognition.isSupported || !recognitionRef.current) return;

      setFocusedField(fieldName);
      recognitionRef.current.start();
    },
    [voiceRecognition.isSupported],
  );

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  // Handle field focus
  const handleFieldFocus = useCallback(
    (fieldName: string, element: HTMLElement) => {
      setFocusedField(fieldName);
      lastFocusedElementRef.current = element;

      // Clear any previous errors for this field
      clearErrors(fieldName as any);
    },
    [clearErrors],
  );

  // Handle field blur
  const handleFieldBlur = useCallback(() => {
    setFocusedField(null);
    lastFocusedElementRef.current = null;
  }, []);

  // Form submission
  const handleFormSubmit = async (data: VariableFormData) => {
    if (isOffline) {
      // Store for later sync
      localStorage.setItem('pendingVariableForm', JSON.stringify(data));
      triggerHaptic('heavy');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(data);
      triggerHaptic('heavy');
    } catch (error) {
      console.error('Form submission error:', error);
      triggerHaptic('heavy');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Value validation and formatting based on type
  const validateAndFormatValue = useCallback((value: string, type: string) => {
    switch (type) {
      case 'number':
        return !isNaN(Number(value));
      case 'boolean':
        return ['true', 'false'].includes(value.toLowerCase());
      case 'json':
        try {
          JSON.parse(value);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }, []);

  // Get input mode for mobile keyboards
  const getInputMode = (
    type: string,
  ): React.HTMLAttributes<HTMLInputElement>['inputMode'] => {
    switch (type) {
      case 'number':
        return 'numeric';
      case 'string':
        return 'text';
      default:
        return 'text';
    }
  };

  // Get keyboard type for better mobile experience
  const getKeyboardType = (fieldName: string, type: string) => {
    if (fieldName === 'key') return 'text';
    if (type === 'number') return 'number';
    return 'text';
  };

  return (
    <div
      className={cn('w-full max-w-2xl mx-auto', className)}
      style={{
        paddingBottom: keyboardHeight > 0 ? `${keyboardHeight + 20}px` : '20px',
        transition: 'padding-bottom 0.3s ease-in-out',
      }}
    >
      <Card className="shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-blue-600" />
              <span>{isEditing ? 'Edit' : 'Create'} Environment Variable</span>
            </div>
            {isOffline && (
              <Badge variant="outline" className="text-orange-600">
                Offline Mode
              </Badge>
            )}
          </CardTitle>
        </CardHeader>

        <form ref={formRef} onSubmit={handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-6">
            {/* Variable Key */}
            <div className="space-y-2">
              <Label
                htmlFor="key"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Type className="h-4 w-4" />
                Variable Key *
                {voiceRecognition.isSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-auto"
                    onClick={() => startVoiceInput('key')}
                    disabled={voiceRecognition.isListening}
                  >
                    {voiceRecognition.isListening && focusedField === 'key' ? (
                      <MicOff className="h-4 w-4 text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </Label>

              <Controller
                name="key"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="key"
                    placeholder="MY_VARIABLE_NAME"
                    className="font-mono text-sm"
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    onFocus={(e) => handleFieldFocus('key', e.target)}
                    onBlur={handleFieldBlur}
                    disabled={isEditing || isSubmitting}
                  />
                )}
              />

              {errors.key && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.key.message}
                </p>
              )}
            </div>

            {/* Variable Type */}
            <div className="space-y-2">
              <Label
                htmlFor="type"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Hash className="h-4 w-4" />
                Variable Type *
              </Label>

              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="string">
                        <div className="flex items-center gap-2">
                          <Type className="h-4 w-4" />
                          String
                        </div>
                      </SelectItem>
                      <SelectItem value="number">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          Number
                        </div>
                      </SelectItem>
                      <SelectItem value="boolean">
                        <div className="flex items-center gap-2">
                          <ToggleLeft className="h-4 w-4" />
                          Boolean
                        </div>
                      </SelectItem>
                      <SelectItem value="json">
                        <div className="flex items-center gap-2">
                          <FileJson className="h-4 w-4" />
                          JSON
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Variable Value */}
            <div className="space-y-2">
              <Label
                htmlFor="value"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                Value *
                <div className="ml-auto flex items-center gap-2">
                  {voiceRecognition.isSupported && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => startVoiceInput('value')}
                      disabled={voiceRecognition.isListening}
                    >
                      {voiceRecognition.isListening &&
                      focusedField === 'value' ? (
                        <MicOff className="h-4 w-4 text-red-500" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setShowValue(!showValue)}
                  >
                    {showValue ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </Label>

              <Controller
                name="value"
                control={control}
                render={({ field }) =>
                  watchedType === 'json' ? (
                    <Textarea
                      {...field}
                      id="value"
                      placeholder="Enter JSON value..."
                      className="font-mono text-sm min-h-[100px] resize-y"
                      inputMode="text"
                      type={showValue ? 'text' : 'password'}
                      onFocus={(e) => handleFieldFocus('value', e.target)}
                      onBlur={handleFieldBlur}
                      disabled={isSubmitting}
                    />
                  ) : (
                    <Input
                      {...field}
                      id="value"
                      placeholder={
                        watchedType === 'boolean'
                          ? 'true or false'
                          : watchedType === 'number'
                            ? '123'
                            : 'Enter value...'
                      }
                      className="font-mono text-sm"
                      type={showValue ? 'text' : 'password'}
                      inputMode={getInputMode(watchedType)}
                      onFocus={(e) => handleFieldFocus('value', e.target)}
                      onBlur={handleFieldBlur}
                      disabled={isSubmitting}
                    />
                  )
                }
              />

              {/* Value validation indicator */}
              {watchedValue && (
                <div className="flex items-center gap-2 text-xs">
                  {validateAndFormatValue(watchedValue, watchedType) ? (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Valid {watchedType}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-red-600">
                      <AlertCircle className="h-3 w-3" />
                      Invalid {watchedType} format
                    </div>
                  )}
                </div>
              )}

              {errors.value && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.value.message}
                </p>
              )}
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">
                Category *
              </Label>

              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">System</SelectItem>
                      <SelectItem value="integration">Integration</SelectItem>
                      <SelectItem value="ui">User Interface</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="security">Security</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Environment */}
            <div className="space-y-2">
              <Label htmlFor="environment" className="text-sm font-medium">
                Environment *
              </Label>

              <Controller
                name="environment"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="development">Development</SelectItem>
                      <SelectItem value="staging">Staging</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label
                htmlFor="description"
                className="text-sm font-medium flex items-center gap-2"
              >
                Description (Optional)
                {voiceRecognition.isSupported && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 ml-auto"
                    onClick={() => startVoiceInput('description')}
                    disabled={voiceRecognition.isListening}
                  >
                    {voiceRecognition.isListening &&
                    focusedField === 'description' ? (
                      <MicOff className="h-4 w-4 text-red-500" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </Label>

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Textarea
                    {...field}
                    id="description"
                    placeholder="Describe what this variable is used for..."
                    className="text-sm resize-none"
                    rows={3}
                    onFocus={(e) => handleFieldFocus('description', e.target)}
                    onBlur={handleFieldBlur}
                    disabled={isSubmitting}
                  />
                )}
              />

              {errors.description && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Toggle Options */}
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Public API Access
                  </Label>
                  <p className="text-xs text-gray-500">
                    Allow this variable to be accessed via public API
                  </p>
                </div>
                <Controller
                  name="isPublic"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        triggerHaptic('light');
                      }}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Encrypted Storage
                  </Label>
                  <p className="text-xs text-gray-500">
                    Encrypt this variable in the database
                  </p>
                </div>
                <Controller
                  name="isEncrypted"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        triggerHaptic('light');
                      }}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label className="text-sm font-medium">
                    Required Variable
                  </Label>
                  <p className="text-xs text-gray-500">
                    Mark as required for system operation
                  </p>
                </div>
                <Controller
                  name="isRequired"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        triggerHaptic('light');
                      }}
                      disabled={isSubmitting}
                    />
                  )}
                />
              </div>
            </div>

            {/* Voice Recognition Status */}
            {voiceRecognition.isListening && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
                <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                  <Mic className="h-4 w-4 animate-pulse" />
                  <span>Listening for "{focusedField}" input...</span>
                </div>
                {voiceRecognition.transcript && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    "{voiceRecognition.transcript}"
                  </p>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={stopVoiceInput}
                >
                  Stop Listening
                </Button>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="w-full sm:w-auto order-2 sm:order-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={!isValid || isSubmitting || (isOffline && !initialData)}
              className="w-full sm:w-auto order-1 sm:order-2 sm:ml-auto"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isOffline ? 'Save for Later' : isEditing ? 'Update' : 'Create'}{' '}
              Variable
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Mobile-specific instructions */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Mobile Tips
        </h4>
        <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
          {voiceRecognition.isSupported && (
            <li>• Tap the microphone icon to use voice input</li>
          )}
          <li>• Use the eye icon to toggle value visibility</li>
          <li>• Form auto-saves when working offline</li>
          <li>• Variable keys must be UPPERCASE_WITH_UNDERSCORES</li>
        </ul>
      </div>
    </div>
  );
}

export default MobileVariableForm;
