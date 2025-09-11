'use client';

/**
 * Feedback Form Component
 * Feature: WS-236 User Feedback System
 * Handles feedback submission with validation and file attachments
 */

import { useState, useCallback, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MessageSquare,
  Bug,
  Lightbulb,
  HelpCircle,
  AlertTriangle,
  Users,
  Calendar,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

// Validation schema
const feedbackFormSchema = z.object({
  feedback_type: z.enum([
    'bug_report',
    'feature_request',
    'general_feedback',
    'support_request',
    'billing_inquiry',
    'wedding_day_issue',
    'vendor_complaint',
    'couple_complaint',
    'performance_issue',
  ]),
  category: z.string().optional(),
  subject: z.string().min(3, 'Subject must be at least 3 characters').max(200),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(5000),
  steps_to_reproduce: z.string().optional(),
  expected_behavior: z.string().optional(),
  actual_behavior: z.string().optional(),
  priority: z
    .enum(['low', 'medium', 'high', 'critical', 'wedding_day_urgent'])
    .default('medium'),
  wedding_date: z.string().optional(),
  is_wedding_day_critical: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  page_url: z.string().url().optional(),
});

type FeedbackFormData = z.infer<typeof feedbackFormSchema>;

interface FeedbackFormProps {
  onSubmit?: (data: FeedbackFormData) => Promise<void>;
  onCancel?: () => void;
  initialData?: Partial<FeedbackFormData>;
  categories?: Array<{ id: string; name: string; color: string }>;
}

// Feedback type configurations
const feedbackTypeConfig = {
  bug_report: {
    icon: Bug,
    label: 'Bug Report',
    description: 'Report a technical issue or problem',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  feature_request: {
    icon: Lightbulb,
    label: 'Feature Request',
    description: 'Suggest a new feature or improvement',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  general_feedback: {
    icon: MessageSquare,
    label: 'General Feedback',
    description: 'Share your thoughts and suggestions',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  support_request: {
    icon: HelpCircle,
    label: 'Support Request',
    description: 'Get help using the platform',
    color: 'bg-green-100 text-green-700 border-green-200',
  },
  billing_inquiry: {
    icon: MessageSquare,
    label: 'Billing Question',
    description: 'Questions about billing or subscriptions',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  wedding_day_issue: {
    icon: AlertTriangle,
    label: 'Wedding Day Issue',
    description: 'Critical issue during a wedding event',
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  vendor_complaint: {
    icon: Users,
    label: 'Vendor Issue',
    description: 'Problem with a vendor or supplier',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  couple_complaint: {
    icon: Users,
    label: 'Couple Issue',
    description: 'Problem with a couple or client',
    color: 'bg-orange-100 text-orange-700 border-orange-200',
  },
  performance_issue: {
    icon: Zap,
    label: 'Performance Issue',
    description: 'Slow loading or performance problems',
    color: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
};

const priorityConfig = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-700' },
  medium: { label: 'Medium', color: 'bg-blue-100 text-blue-700' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
  wedding_day_urgent: {
    label: 'Wedding Day Urgent',
    color: 'bg-red-100 text-red-700',
  },
};

export function FeedbackForm({
  onSubmit,
  onCancel,
  initialData,
  categories = [],
}: FeedbackFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedType, setSelectedType] = useState<string>(
    initialData?.feedback_type || '',
  );

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackFormSchema),
    defaultValues: {
      feedback_type: initialData?.feedback_type || 'general_feedback',
      category: initialData?.category || '',
      subject: initialData?.subject || '',
      description: initialData?.description || '',
      steps_to_reproduce: initialData?.steps_to_reproduce || '',
      expected_behavior: initialData?.expected_behavior || '',
      actual_behavior: initialData?.actual_behavior || '',
      priority: initialData?.priority || 'medium',
      wedding_date: initialData?.wedding_date || '',
      is_wedding_day_critical: initialData?.is_wedding_day_critical || false,
      tags: initialData?.tags || [],
      page_url:
        initialData?.page_url ||
        (typeof window !== 'undefined' ? window.location.href : ''),
    },
  });

  const watchFeedbackType = form.watch('feedback_type');
  const watchIsWeddingDayCritical = form.watch('is_wedding_day_critical');

  // Auto-adjust priority for wedding day critical feedback
  const handleWeddingDayCriticalChange = useCallback(
    (checked: boolean) => {
      form.setValue('is_wedding_day_critical', checked);
      if (checked) {
        form.setValue('priority', 'wedding_day_urgent');
      }
    },
    [form],
  );

  const handleFormSubmit = async (data: FeedbackFormData) => {
    startTransition(async () => {
      try {
        // Add browser and device info
        const browserInfo = {
          user_agent: navigator.userAgent,
          screen_resolution: `${screen.width}x${screen.height}`,
          viewport_size: `${window.innerWidth}x${window.innerHeight}`,
          browser_language: navigator.language,
        };

        const deviceInfo = {
          platform: navigator.platform,
          device_type: /Mobile|Android|iPhone|iPad/.test(navigator.userAgent)
            ? 'mobile'
            : 'desktop',
          operating_system: navigator.platform,
        };

        const feedbackData = {
          ...data,
          browser_info: browserInfo,
          device_info: deviceInfo,
        };

        if (onSubmit) {
          await onSubmit(feedbackData);
        } else {
          // Default submission to API
          const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(feedbackData),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit feedback');
          }

          toast.success(
            "Feedback submitted successfully! We'll get back to you soon.",
          );
          form.reset();
          onCancel?.();
        }
      } catch (error) {
        console.error('Error submitting feedback:', error);
        toast.error(
          error instanceof Error ? error.message : 'Failed to submit feedback',
        );
      }
    });
  };

  const typeConfig =
    feedbackTypeConfig[watchFeedbackType as keyof typeof feedbackTypeConfig];
  const TypeIcon = typeConfig?.icon || MessageSquare;

  const showTechnicalFields = ['bug_report', 'performance_issue'].includes(
    watchFeedbackType,
  );

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader className="space-y-4">
        <CardTitle className="flex items-center gap-3 text-xl">
          <TypeIcon className="h-6 w-6 text-primary" />
          Share Your Feedback
        </CardTitle>

        {typeConfig && (
          <Badge variant="secondary" className={`${typeConfig.color} w-fit`}>
            {typeConfig.label}: {typeConfig.description}
          </Badge>
        )}

        {watchIsWeddingDayCritical && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-medium text-red-800">
                Wedding Day Critical Issue
              </span>
            </div>
            <p className="text-red-700 text-sm mt-1">
              This feedback has been marked as wedding day critical and will be
              prioritized for immediate response.
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        <form
          onSubmit={form.handleSubmit(handleFormSubmit)}
          className="space-y-6"
        >
          {/* Feedback Type Selection */}
          <div className="space-y-3">
            <Label htmlFor="feedback_type" className="text-base font-medium">
              What type of feedback is this? *
            </Label>
            <Controller
              name="feedback_type"
              control={form.control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
                >
                  {Object.entries(feedbackTypeConfig).map(([value, config]) => {
                    const Icon = config.icon;
                    return (
                      <Label
                        key={value}
                        htmlFor={value}
                        className={`flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all hover:bg-gray-50 ${
                          field.value === value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200'
                        }`}
                      >
                        <RadioGroupItem
                          value={value}
                          id={value}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium text-sm">
                              {config.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 leading-tight">
                            {config.description}
                          </p>
                        </div>
                      </Label>
                    );
                  })}
                </RadioGroup>
              )}
            />
            {form.formState.errors.feedback_type && (
              <p className="text-red-600 text-sm">
                {form.formState.errors.feedback_type.message}
              </p>
            )}
          </div>

          {/* Category Selection (if categories available) */}
          {categories.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Controller
                name="category"
                control={form.control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: category.color }}
                            />
                            {category.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              {...form.register('subject')}
              placeholder="Brief description of your feedback"
              className={form.formState.errors.subject ? 'border-red-500' : ''}
            />
            {form.formState.errors.subject && (
              <p className="text-red-600 text-sm">
                {form.formState.errors.subject.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Please provide detailed information about your feedback..."
              rows={4}
              className={
                form.formState.errors.description ? 'border-red-500' : ''
              }
            />
            {form.formState.errors.description && (
              <p className="text-red-600 text-sm">
                {form.formState.errors.description.message}
              </p>
            )}
          </div>

          {/* Technical Fields for Bug Reports */}
          {showTechnicalFields && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900">Technical Details</h4>

              <div className="space-y-2">
                <Label htmlFor="steps_to_reproduce">Steps to Reproduce</Label>
                <Textarea
                  id="steps_to_reproduce"
                  {...form.register('steps_to_reproduce')}
                  placeholder="1. Go to...&#10;2. Click on...&#10;3. See error"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expected_behavior">Expected Behavior</Label>
                <Textarea
                  id="expected_behavior"
                  {...form.register('expected_behavior')}
                  placeholder="What did you expect to happen?"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual_behavior">Actual Behavior</Label>
                <Textarea
                  id="actual_behavior"
                  {...form.register('actual_behavior')}
                  placeholder="What actually happened?"
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Wedding Date (for wedding-related feedback) */}
          {[
            'wedding_day_issue',
            'vendor_complaint',
            'couple_complaint',
          ].includes(watchFeedbackType) && (
            <div className="space-y-2">
              <Label htmlFor="wedding_date">Wedding Date</Label>
              <Input
                id="wedding_date"
                type="date"
                {...form.register('wedding_date')}
                className="w-fit"
              />
            </div>
          )}

          {/* Priority and Wedding Day Critical */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Priority *</Label>
              <Controller
                name="priority"
                control={form.control}
                render={({ field }) => (
                  <RadioGroup
                    value={field.value}
                    onValueChange={field.onChange}
                    className="flex flex-wrap gap-4"
                    disabled={watchIsWeddingDayCritical}
                  >
                    {Object.entries(priorityConfig).map(([value, config]) => (
                      <Label
                        key={value}
                        htmlFor={`priority-${value}`}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <RadioGroupItem
                          value={value}
                          id={`priority-${value}`}
                        />
                        <Badge variant="secondary" className={config.color}>
                          {config.label}
                        </Badge>
                      </Label>
                    ))}
                  </RadioGroup>
                )}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="is_wedding_day_critical"
                control={form.control}
                render={({ field }) => (
                  <Checkbox
                    id="wedding_day_critical"
                    checked={field.value}
                    onCheckedChange={handleWeddingDayCriticalChange}
                  />
                )}
              />
              <Label
                htmlFor="wedding_day_critical"
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4 text-red-600" />
                This is a wedding day critical issue requiring immediate
                attention
              </Label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 sm:flex-none"
            >
              {isPending ? 'Submitting...' : 'Submit Feedback'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isPending}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
