'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Eye, EyeOff, Save, Lock } from 'lucide-react';
import { toast } from 'sonner';

const environmentVariableSchema = z.object({
  key: z
    .string()
    .min(1, 'Variable key is required')
    .regex(/^[A-Z][A-Z0-9_]*$/, 'Key must be uppercase with underscores only')
    .max(100, 'Key must be less than 100 characters'),
  value: z
    .string()
    .min(1, 'Variable value is required')
    .max(5000, 'Value must be less than 5000 characters'),
  environment: z.enum([
    'development',
    'staging',
    'production',
    'wedding-day-critical',
  ]),
  security_level: z.enum([
    'Public',
    'Internal',
    'Confidential',
    'Wedding-Day-Critical',
  ]),
  description: z.string().optional(),
  is_encrypted: z.boolean().default(false),
});

type FormData = z.infer<typeof environmentVariableSchema>;

interface MobileVariableFormProps {
  onVariableAdded: () => void;
  isReadOnly?: boolean;
  editingVariable?: any;
}

export function MobileVariableForm({
  onVariableAdded,
  isReadOnly = false,
  editingVariable,
}: MobileVariableFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const supabase = createClientComponentClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(environmentVariableSchema),
    defaultValues: editingVariable || {
      environment: 'development',
      security_level: 'Internal',
      is_encrypted: false,
    },
  });

  const watchedFields = watch();
  const watchedSecurityLevel = watch('security_level');
  const watchedEnvironment = watch('environment');

  const isHighSecurity =
    watchedSecurityLevel === 'Confidential' ||
    watchedSecurityLevel === 'Wedding-Day-Critical';
  const isProductionEnvironment =
    watchedEnvironment === 'production' ||
    watchedEnvironment === 'wedding-day-critical';

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    if (isDirty && !isReadOnly) {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);

      const timeout = setTimeout(() => {
        const formData = JSON.stringify(watchedFields);
        localStorage.setItem('draft_environment_variable', formData);
        toast.success('Draft saved locally', { duration: 2000 });
      }, 30000);

      setAutoSaveTimeout(timeout);
    }

    return () => {
      if (autoSaveTimeout) clearTimeout(autoSaveTimeout);
    };
  }, [watchedFields, isDirty, isReadOnly]);

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('draft_environment_variable');
    if (savedDraft && !editingVariable) {
      try {
        const draftData = JSON.parse(savedDraft);
        Object.keys(draftData).forEach((key) => {
          setValue(key as keyof FormData, draftData[key]);
        });
        setIsDirty(true);
        toast.success('Draft loaded from local storage');
      } catch (error) {
        console.error('Failed to load draft:', error);
      }
    }
  }, [setValue, editingVariable]);

  // Auto-encrypt high security variables
  useEffect(() => {
    if (isHighSecurity) {
      setValue('is_encrypted', true);
    }
  }, [isHighSecurity, setValue]);

  // Track form changes
  useEffect(() => {
    setIsDirty(true);
  }, [watchedFields]);

  const onSubmit = async (data: FormData) => {
    if (isReadOnly) {
      toast.error('Cannot modify variables during wedding day mode');
      return;
    }

    setIsSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        toast.error('You must be logged in to manage environment variables');
        return;
      }

      const variableData = {
        ...data,
        created_by: user.id,
        updated_at: new Date().toISOString(),
      };

      let result;
      if (editingVariable) {
        result = await supabase
          .from('environment_variables')
          .update(variableData)
          .eq('id', editingVariable.id);
      } else {
        result = await supabase
          .from('environment_variables')
          .insert([variableData]);
      }

      if (result.error) throw result.error;

      // Log audit trail
      await supabase.from('environment_variable_audit').insert([
        {
          variable_key: data.key,
          environment: data.environment,
          action: editingVariable ? 'updated' : 'created',
          user_id: user.id,
          metadata: {
            security_level: data.security_level,
            is_encrypted: data.is_encrypted,
          },
        },
      ]);

      // Clear localStorage draft
      localStorage.removeItem('draft_environment_variable');

      toast.success(
        editingVariable
          ? 'Environment variable updated successfully'
          : 'Environment variable created successfully',
      );

      reset();
      setIsDirty(false);
      onVariableAdded();
    } catch (error) {
      console.error('Error saving environment variable:', error);
      toast.error('Failed to save environment variable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('draft_environment_variable');
    reset();
    setIsDirty(false);
    toast.success('Draft cleared');
  };

  return (
    <div className="space-y-4">
      {/* Auto-save indicator */}
      {isDirty && !isReadOnly && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-3">
            <div className="flex items-center space-x-2">
              <Save className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-800">
                Changes auto-save every 30 seconds
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Variable Key *
              </label>
              <Input
                {...register('key')}
                placeholder="API_KEY_NAME"
                className={`min-h-[48px] ${errors.key ? 'border-red-500' : ''}`}
                disabled={isReadOnly || isSubmitting}
              />
              {errors.key && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.key.message}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Use UPPERCASE with underscores (e.g., STRIPE_SECRET_KEY)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Environment *
              </label>
              <select
                {...register('environment')}
                className={`w-full min-h-[48px] p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${errors.environment ? 'border-red-500' : 'border-gray-300'}`}
                disabled={isReadOnly || isSubmitting}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
                <option value="wedding-day-critical">
                  Wedding Day Critical
                </option>
              </select>
              {isProductionEnvironment && (
                <Badge
                  variant="secondary"
                  className="bg-yellow-100 text-yellow-700 text-xs mt-2"
                >
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  High Impact Environment
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Variable Value */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Variable Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              {showValue ? (
                <Textarea
                  {...register('value')}
                  placeholder="Enter the variable value..."
                  className={`min-h-[120px] ${errors.value ? 'border-red-500' : ''}`}
                  disabled={isReadOnly || isSubmitting}
                />
              ) : (
                <Input
                  {...register('value')}
                  type="password"
                  placeholder="••••••••••••"
                  className={`min-h-[48px] ${errors.value ? 'border-red-500' : ''}`}
                  disabled={isReadOnly || isSubmitting}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2 p-2 min-h-[44px] min-w-[44px]"
                onClick={() => setShowValue(!showValue)}
              >
                {showValue ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {errors.value && (
              <p className="text-sm text-red-600 mt-1">
                {errors.value.message}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Security Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Security Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Level *
              </label>
              <select
                {...register('security_level')}
                className="w-full min-h-[48px] p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                disabled={isReadOnly || isSubmitting}
              >
                <option value="Public">Public</option>
                <option value="Internal">Internal</option>
                <option value="Confidential">Confidential</option>
                <option value="Wedding-Day-Critical">
                  Wedding Day Critical
                </option>
              </select>

              <div className="flex items-center space-x-2 mt-2">
                {isHighSecurity && (
                  <Badge
                    variant="secondary"
                    className="bg-red-50 text-red-700 text-xs"
                  >
                    <Lock className="h-3 w-3 mr-1" />
                    Auto-Encrypted
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Encrypt Value
                </label>
                <p className="text-xs text-gray-500">
                  {isHighSecurity
                    ? 'Auto-enabled for high security variables'
                    : 'Encrypt the variable value in storage'}
                </p>
              </div>
              <input
                type="checkbox"
                {...register('is_encrypted')}
                disabled={isReadOnly || isSubmitting || isHighSecurity}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Optional Description */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Description (Optional)</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              {...register('description')}
              placeholder="Describe the purpose of this environment variable..."
              className="min-h-[80px]"
              disabled={isReadOnly || isSubmitting}
            />
          </CardContent>
        </Card>

        {/* Production Warning */}
        {isProductionEnvironment && (
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Production Environment Warning
                </span>
              </div>
              <p className="text-sm text-yellow-700 mt-1">
                You are configuring a variable for production or
                wedding-critical environment. Changes could impact live wedding
                operations. Please verify carefully.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Form Actions */}
        <div className="flex flex-col space-y-3">
          <Button
            type="submit"
            disabled={isSubmitting || isReadOnly}
            className="w-full min-h-[48px] text-base font-medium"
          >
            {isSubmitting
              ? 'Saving...'
              : editingVariable
                ? 'Update Variable'
                : 'Add Variable'}
          </Button>

          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => reset()}
              disabled={isSubmitting || !isDirty}
              className="min-h-[48px]"
            >
              Reset Form
            </Button>

            {isDirty && (
              <Button
                type="button"
                variant="outline"
                onClick={clearDraft}
                disabled={isSubmitting}
                className="min-h-[48px]"
              >
                Clear Draft
              </Button>
            )}
          </div>
        </div>

        {/* Form Status */}
        {isDirty && (
          <div className="text-center text-sm text-gray-500">
            You have unsaved changes
          </div>
        )}
      </form>
    </div>
  );
}
