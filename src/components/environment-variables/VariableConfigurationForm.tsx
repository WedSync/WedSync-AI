'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Eye, EyeOff, Plus, Shield, Lock } from 'lucide-react';
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

interface VariableConfigurationFormProps {
  onVariableAdded: () => void;
  isReadOnly?: boolean;
  editingVariable?: any;
}

export function VariableConfigurationForm({
  onVariableAdded,
  isReadOnly = false,
  editingVariable,
}: VariableConfigurationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const supabase = createClientComponentClient();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(environmentVariableSchema),
    defaultValues: editingVariable || {
      environment: 'development',
      security_level: 'Internal',
      is_encrypted: false,
    },
  });

  const watchedSecurityLevel = watch('security_level');
  const watchedEnvironment = watch('environment');
  const watchedKey = watch('key');

  const isHighSecurity =
    watchedSecurityLevel === 'Confidential' ||
    watchedSecurityLevel === 'Wedding-Day-Critical';
  const isProductionEnvironment =
    watchedEnvironment === 'production' ||
    watchedEnvironment === 'wedding-day-critical';

  // Auto-encrypt high security variables
  useState(() => {
    if (isHighSecurity) {
      setValue('is_encrypted', true);
    }
  }, [isHighSecurity]);

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

      // Log the audit trail
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

      toast.success(
        editingVariable
          ? 'Environment variable updated successfully'
          : 'Environment variable created successfully',
      );

      reset();
      onVariableAdded();
    } catch (error) {
      console.error('Error saving environment variable:', error);
      toast.error('Failed to save environment variable');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSecurityBadge = (level: string) => {
    switch (level) {
      case 'Public':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700">
            Public
          </Badge>
        );
      case 'Internal':
        return <Badge variant="secondary">Internal</Badge>;
      case 'Confidential':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            Confidential
          </Badge>
        );
      case 'Wedding-Day-Critical':
        return <Badge variant="destructive">Wedding Critical</Badge>;
      default:
        return <Badge variant="outline">{level}</Badge>;
    }
  };

  const getEnvironmentBadge = (env: string) => {
    switch (env) {
      case 'production':
        return <Badge variant="destructive">Production</Badge>;
      case 'staging':
        return (
          <Badge variant="secondary" className="bg-orange-100 text-orange-700">
            Staging
          </Badge>
        );
      case 'development':
        return <Badge variant="outline">Development</Badge>;
      case 'wedding-day-critical':
        return (
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            Wedding Critical
          </Badge>
        );
      default:
        return <Badge variant="outline">{env}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>
            {editingVariable
              ? 'Edit Environment Variable'
              : 'Add Environment Variable'}
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="key">Variable Key</Label>
              <Input
                id="key"
                {...register('key')}
                placeholder="API_KEY_NAME"
                className={errors.key ? 'border-red-500' : ''}
                disabled={isReadOnly || isSubmitting}
              />
              {errors.key && (
                <p className="text-sm text-red-600">{errors.key.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Use UPPERCASE with underscores (e.g., STRIPE_SECRET_KEY)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment">Environment</Label>
              <Select
                value={watchedEnvironment}
                onValueChange={(value) => setValue('environment', value as any)}
                disabled={isReadOnly || isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="development">Development</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="wedding-day-critical">
                    Wedding Day Critical
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center space-x-2">
                {getEnvironmentBadge(watchedEnvironment)}
                {isProductionEnvironment && (
                  <Badge
                    variant="outline"
                    className="bg-yellow-50 text-yellow-700"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    High Impact
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Variable Value */}
          <div className="space-y-2">
            <Label htmlFor="value">Variable Value</Label>
            <div className="relative">
              {showValue ? (
                <Textarea
                  id="value"
                  {...register('value')}
                  placeholder="Enter the variable value..."
                  className={`min-h-[100px] ${errors.value ? 'border-red-500' : ''}`}
                  disabled={isReadOnly || isSubmitting}
                />
              ) : (
                <Input
                  id="value"
                  type="password"
                  {...register('value')}
                  placeholder="••••••••••••"
                  className={errors.value ? 'border-red-500' : ''}
                  disabled={isReadOnly || isSubmitting}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-2"
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
              <p className="text-sm text-red-600">{errors.value.message}</p>
            )}
          </div>

          {/* Security Configuration */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4" />
              <h3 className="text-sm font-medium">Security Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="security_level">Security Level</Label>
                <Select
                  value={watchedSecurityLevel}
                  onValueChange={(value) =>
                    setValue('security_level', value as any)
                  }
                  disabled={isReadOnly || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Public">Public</SelectItem>
                    <SelectItem value="Internal">Internal</SelectItem>
                    <SelectItem value="Confidential">Confidential</SelectItem>
                    <SelectItem value="Wedding-Day-Critical">
                      Wedding Day Critical
                    </SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center space-x-2">
                  {getSecurityBadge(watchedSecurityLevel)}
                  {isHighSecurity && (
                    <Badge variant="outline" className="bg-red-50 text-red-700">
                      <Lock className="h-3 w-3 mr-1" />
                      Auto-Encrypt
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="is_encrypted">Encrypt Value</Label>
                  <Switch
                    id="is_encrypted"
                    checked={watch('is_encrypted')}
                    onCheckedChange={(checked) =>
                      setValue('is_encrypted', checked)
                    }
                    disabled={isReadOnly || isSubmitting || isHighSecurity}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  {isHighSecurity
                    ? 'Auto-enabled for high security variables'
                    : 'Encrypt the variable value in storage'}
                </p>
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm"
            >
              Advanced Options {showAdvanced ? '▲' : '▼'}
            </Button>

            {showAdvanced && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    {...register('description')}
                    placeholder="Describe the purpose of this environment variable..."
                    className="min-h-[60px]"
                    disabled={isReadOnly || isSubmitting}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Production Warning */}
          {isProductionEnvironment && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
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
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-500">
              {isDirty && 'You have unsaved changes'}
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => reset()}
                disabled={isSubmitting || !isDirty}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || isReadOnly}
                className="min-w-[120px]"
              >
                {isSubmitting
                  ? 'Saving...'
                  : editingVariable
                    ? 'Update Variable'
                    : 'Add Variable'}
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
