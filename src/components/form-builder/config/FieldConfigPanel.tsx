'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  X,
  Settings,
  Plus,
  Minus,
  Crown,
  Info,
  Heart,
  Camera,
  MapPin,
  Users,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  WeddingFormField,
  TierLimitations,
  WeddingDateConfig,
  VenueConfig,
  GuestCountConfig,
  BudgetRangeConfig,
} from '@/types/form-builder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface FieldConfigPanelProps {
  selectedField: WeddingFormField | null;
  onFieldUpdate: (field: WeddingFormField) => void;
  onFieldDelete: () => void;
  onFieldDuplicate: () => void;
  tierLimitations: TierLimitations;
  className?: string;
}

// Form validation schema
const fieldConfigSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  placeholder: z.string().optional(),
  helperText: z.string().optional(),
  required: z.boolean().default(false),
  width: z.enum(['full', 'half', 'third']).default('full'),
  options: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
});

type FieldConfigForm = z.infer<typeof fieldConfigSchema>;

/**
 * FieldConfigPanel - Dynamic field configuration sidebar
 *
 * Features:
 * - Field-specific configuration options
 * - Wedding-specific field settings
 * - Validation rules configuration
 * - Option management for select/radio/checkbox fields
 * - Tier-based feature restrictions
 * - Wedding industry context and tips
 * - Real-time preview updates
 */
export function FieldConfigPanel({
  selectedField,
  onFieldUpdate,
  onFieldDelete,
  onFieldDuplicate,
  tierLimitations,
  className,
}: FieldConfigPanelProps) {
  const [activeTab, setActiveTab] = useState('basic');

  // Initialize form
  const form = useForm<FieldConfigForm>({
    resolver: zodResolver(fieldConfigSchema),
    defaultValues: {
      label: selectedField?.label || '',
      placeholder: selectedField?.placeholder || '',
      helperText: selectedField?.helperText || '',
      required: selectedField?.required || false,
      width: selectedField?.width || 'full',
      options: selectedField?.options || [],
    },
  });

  // Options field array for dynamic option management
  const {
    fields: optionFields,
    append: addOption,
    remove: removeOption,
  } = useFieldArray({
    control: form.control,
    name: 'options',
  });

  // Update form when selected field changes
  useEffect(() => {
    if (selectedField) {
      form.reset({
        label: selectedField.label || '',
        placeholder: selectedField.placeholder || '',
        helperText: selectedField.helperText || '',
        required: selectedField.required || false,
        width: selectedField.width || 'full',
        options: selectedField.options || [],
      });
    }
  }, [selectedField, form]);

  // Handle form submission
  const onSubmit = (data: FieldConfigForm) => {
    if (!selectedField) return;

    const updatedField: WeddingFormField = {
      ...selectedField,
      ...data,
    };

    onFieldUpdate(updatedField);
  };

  // Auto-save on form changes
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (selectedField) {
        const updatedField: WeddingFormField = {
          ...selectedField,
          ...(data as FieldConfigForm),
        };
        onFieldUpdate(updatedField);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, selectedField, onFieldUpdate]);

  // Check if field has options
  const hasOptions =
    selectedField &&
    ['select', 'radio', 'checkbox', 'dietary-restrictions'].includes(
      selectedField.type,
    );

  // Check if advanced features are available
  const canUseAdvancedFeatures = tierLimitations.allowConditionalLogic;

  if (!selectedField) {
    return (
      <div
        className={cn(
          'w-80 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800',
          className,
        )}
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Settings className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Select a field to configure
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Choose a field from your questionnaire to customize its settings and
            options
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-80 bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800 flex flex-col',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            {getFieldIcon(selectedField.type)}
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">
              Field Settings
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {selectedField.type} field
            </p>
          </div>
        </div>

        {/* Close button for mobile */}
        <Button variant="ghost" size="sm" className="p-1 h-8 w-8 lg:hidden">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Wedding Context */}
      {selectedField.weddingContext && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border-b border-rose-200 dark:border-rose-800">
          <div className="flex items-start gap-2">
            <Heart className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p className="text-sm text-rose-700 dark:text-rose-300">
                {selectedField.weddingContext.helpText}
              </p>
              {selectedField.weddingContext.photographerTip && (
                <p className="text-xs text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-900 p-2 rounded">
                  <Camera className="w-3 h-3 inline mr-1" />
                  <strong>Photographer tip:</strong>{' '}
                  {selectedField.weddingContext.photographerTip}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="px-4 pt-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="options" disabled={!hasOptions}>
                    Options
                  </TabsTrigger>
                  <TabsTrigger
                    value="advanced"
                    disabled={!canUseAdvancedFeatures}
                  >
                    Advanced
                    {!canUseAdvancedFeatures && (
                      <Crown className="w-3 h-3 ml-1" />
                    )}
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-4">
                {/* Basic Configuration */}
                <TabsContent value="basic" className="space-y-4 mt-0">
                  <FormField
                    control={form.control}
                    name="label"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Label *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Your wedding date"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          What couples will see above this field
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="placeholder"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Placeholder Text</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Select date..."
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Hint text shown inside the field
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="helperText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Help Text</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional guidance for couples..."
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Extra context shown below the field
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="required"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Required Field
                          </FormLabel>
                          <FormDescription>
                            Couples must fill this out to submit
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="width"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Field Width</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select width" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="full">Full width</SelectItem>
                            <SelectItem value="half">Half width</SelectItem>
                            <SelectItem value="third">Third width</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How much horizontal space the field takes
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  {/* Wedding-specific configurations */}
                  {renderWeddingSpecificConfig(selectedField)}
                </TabsContent>

                {/* Options Configuration */}
                <TabsContent value="options" className="space-y-4 mt-0">
                  {hasOptions && (
                    <>
                      <div className="flex items-center justify-between">
                        <Label>Field Options</Label>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            addOption({
                              id: `option-${Date.now()}`,
                              label: '',
                              value: '',
                            })
                          }
                          className="h-8"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Option
                        </Button>
                      </div>

                      <div className="space-y-2 max-h-64 overflow-auto">
                        {optionFields.map((field, index) => (
                          <div
                            key={field.id}
                            className="flex items-center gap-2 p-2 border rounded-lg"
                          >
                            <div className="flex-1 space-y-2">
                              <Input
                                placeholder="Option label"
                                {...form.register(`options.${index}.label`)}
                              />
                              <Input
                                placeholder="Option value"
                                {...form.register(`options.${index}.value`)}
                              />
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeOption(index)}
                              className="p-2 h-8 w-8 text-red-500 hover:text-red-600"
                            >
                              <Minus className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {selectedField.type === 'dietary-restrictions' && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">
                              Dietary Restrictions Presets
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const presets = [
                                  {
                                    id: 'vegetarian',
                                    label: 'Vegetarian',
                                    value: 'vegetarian',
                                  },
                                  {
                                    id: 'vegan',
                                    label: 'Vegan',
                                    value: 'vegan',
                                  },
                                  {
                                    id: 'gluten-free',
                                    label: 'Gluten-free',
                                    value: 'gluten-free',
                                  },
                                  {
                                    id: 'dairy-free',
                                    label: 'Dairy-free',
                                    value: 'dairy-free',
                                  },
                                  {
                                    id: 'nut-allergy',
                                    label: 'Nut allergy',
                                    value: 'nut-allergy',
                                  },
                                  {
                                    id: 'shellfish-allergy',
                                    label: 'Shellfish allergy',
                                    value: 'shellfish-allergy',
                                  },
                                ];
                                presets.forEach((preset) => addOption(preset));
                              }}
                              className="w-full"
                            >
                              Add Common Dietary Options
                            </Button>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>

                {/* Advanced Configuration */}
                <TabsContent value="advanced" className="space-y-4 mt-0">
                  {canUseAdvancedFeatures ? (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Info className="w-4 h-4" />
                            Conditional Logic
                          </CardTitle>
                          <CardDescription>
                            Show or hide this field based on other answers
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Conditional logic builder coming soon...
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            Validation Rules
                          </CardTitle>
                          <CardDescription>
                            Advanced validation options
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {selectedField.type === 'text' && (
                            <>
                              <div>
                                <Label className="text-xs">
                                  Minimum Length
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">
                                  Maximum Length
                                </Label>
                                <Input
                                  type="number"
                                  placeholder="No limit"
                                  className="mt-1"
                                />
                              </div>
                            </>
                          )}

                          {selectedField.type === 'number' && (
                            <>
                              <div>
                                <Label className="text-xs">Minimum Value</Label>
                                <Input
                                  type="number"
                                  placeholder="No minimum"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Maximum Value</Label>
                                <Input
                                  type="number"
                                  placeholder="No maximum"
                                  className="mt-1"
                                />
                              </div>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm flex items-center gap-2">
                          <Crown className="w-4 h-4 text-amber-500" />
                          Premium Features
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Unlock advanced field configuration with Professional
                          plan or higher:
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          <li>• Conditional logic and field dependencies</li>
                          <li>• Advanced validation rules</li>
                          <li>• Custom field styling</li>
                          <li>• Integration with external services</li>
                        </ul>
                        <Button className="w-full mt-3" size="sm">
                          Upgrade Plan
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </form>
        </Form>
      </div>

      {/* Actions Footer */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onFieldDuplicate}
            className="flex-1"
          >
            Duplicate
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onFieldDelete}
            className="flex-1 text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
          >
            Delete
          </Button>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Changes auto-save as you type
        </div>
      </div>
    </div>
  );
}

/**
 * Render wedding-specific configuration options
 */
function renderWeddingSpecificConfig(field: WeddingFormField) {
  switch (field.type) {
    case 'wedding-date':
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="text-lg">💍</span>
              Wedding Date Options
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Include ceremony time</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Separate reception time</Label>
              <Switch />
            </div>
            <div>
              <Label className="text-xs">Venue timezone</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Auto-detect" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto-detect</SelectItem>
                  <SelectItem value="GMT">GMT</SelectItem>
                  <SelectItem value="EST">EST</SelectItem>
                  <SelectItem value="PST">PST</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      );

    case 'venue':
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Venue Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Require full address</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Allow multiple venues</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Enable Google Places</Label>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>
      );

    case 'guest-count':
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4" />
              Guest Count Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Separate adults/children</Label>
              <Switch />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Include plus-ones</Label>
              <Switch />
            </div>
            <div>
              <Label className="text-xs">Maximum guests</Label>
              <Input type="number" placeholder="No limit" className="mt-1" />
            </div>
          </CardContent>
        </Card>
      );

    case 'budget-range':
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Budget Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Minimum budget</Label>
                <Input type="number" placeholder="1000" className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Maximum budget</Label>
                <Input type="number" placeholder="10000" className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Currency</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="GBP" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      );

    default:
      return null;
  }
}

/**
 * Get field type icon
 */
function getFieldIcon(fieldType: string) {
  const iconMap: Record<string, React.ReactNode> = {
    text: <span className="text-sm">📝</span>,
    email: <span className="text-sm">📧</span>,
    tel: <span className="text-sm">📞</span>,
    textarea: <span className="text-sm">📄</span>,
    select: <span className="text-sm">📋</span>,
    radio: <span className="text-sm">⚪</span>,
    checkbox: <span className="text-sm">☑️</span>,
    date: <span className="text-sm">📅</span>,
    time: <span className="text-sm">🕐</span>,
    file: <span className="text-sm">📎</span>,
    number: <span className="text-sm">#️⃣</span>,
    'wedding-date': <span className="text-sm">💍</span>,
    venue: <MapPin className="w-4 h-4" />,
    'guest-count': <Users className="w-4 h-4" />,
    'budget-range': <DollarSign className="w-4 h-4" />,
  };

  return iconMap[fieldType] || <Settings className="w-4 h-4" />;
}

export default FieldConfigPanel;
