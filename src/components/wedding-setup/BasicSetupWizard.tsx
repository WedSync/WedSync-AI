'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  MapPin,
  Users,
  Camera,
  Music,
  Utensils,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Zod schema for wedding setup
const weddingSetupSchema = z.object({
  // Basic wedding information
  coupleName: z.string().min(2, 'Couple name must be at least 2 characters'),
  weddingDate: z.string().min(1, 'Wedding date is required'),
  guestCount: z.coerce
    .number()
    .min(1, 'Guest count must be at least 1')
    .max(1000, 'Guest count cannot exceed 1000'),
  budget: z.coerce.number().min(100, 'Budget must be at least £100').optional(),

  // Venue information
  venueName: z.string().min(2, 'Venue name must be at least 2 characters'),
  venueAddress: z.string().min(10, 'Full venue address is required'),
  ceremonyTime: z.string().min(1, 'Ceremony time is required'),
  receptionTime: z.string().min(1, 'Reception time is required'),

  // Special requirements
  dietaryRequirements: z.string().optional(),
  specialRequests: z.string().optional(),

  // Contact information
  primaryContactName: z.string().min(2, 'Primary contact name is required'),
  primaryContactEmail: z.string().email('Valid email address is required'),
  primaryContactPhone: z.string().min(10, 'Valid phone number is required'),

  // Secondary contact (optional)
  secondaryContactName: z.string().optional(),
  secondaryContactEmail: z
    .string()
    .email('Valid email address is required')
    .optional()
    .or(z.literal('')),
  secondaryContactPhone: z.string().optional(),
});

type WeddingSetupForm = z.infer<typeof weddingSetupSchema>;

interface BasicSetupWizardProps {
  onComplete: (data: WeddingSetupForm) => void;
  onSkip?: () => void;
  initialData?: Partial<WeddingSetupForm>;
  className?: string;
}

const SETUP_STEPS = [
  {
    id: 'basic',
    title: 'Wedding Basics',
    description: 'Essential wedding information',
    icon: Calendar,
    fields: ['coupleName', 'weddingDate', 'guestCount', 'budget'],
  },
  {
    id: 'venue',
    title: 'Venue & Timing',
    description: 'Location and schedule details',
    icon: MapPin,
    fields: ['venueName', 'venueAddress', 'ceremonyTime', 'receptionTime'],
  },
  {
    id: 'requirements',
    title: 'Special Requirements',
    description: 'Dietary needs and special requests',
    icon: Utensils,
    fields: ['dietaryRequirements', 'specialRequests'],
  },
  {
    id: 'contacts',
    title: 'Contact Information',
    description: 'Primary and secondary contacts',
    icon: Users,
    fields: [
      'primaryContactName',
      'primaryContactEmail',
      'primaryContactPhone',
      'secondaryContactName',
      'secondaryContactEmail',
      'secondaryContactPhone',
    ],
  },
];

export function BasicSetupWizard({
  onComplete,
  onSkip,
  initialData = {},
  className,
}: BasicSetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const form = useForm<WeddingSetupForm>({
    resolver: zodResolver(weddingSetupSchema),
    defaultValues: {
      coupleName: '',
      weddingDate: '',
      guestCount: 50,
      budget: undefined,
      venueName: '',
      venueAddress: '',
      ceremonyTime: '',
      receptionTime: '',
      dietaryRequirements: '',
      specialRequests: '',
      primaryContactName: '',
      primaryContactEmail: '',
      primaryContactPhone: '',
      secondaryContactName: '',
      secondaryContactEmail: '',
      secondaryContactPhone: '',
      ...initialData,
    },
    mode: 'onChange',
  });

  const currentStepData = SETUP_STEPS[currentStep];
  const isLastStep = currentStep === SETUP_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // Check if current step is valid
  const isCurrentStepValid = () => {
    const fieldsToValidate = currentStepData.fields;
    const formValues = form.getValues();
    const errors = form.formState.errors;

    return fieldsToValidate.every((field) => {
      const value = formValues[field as keyof WeddingSetupForm];
      const hasError = errors[field as keyof WeddingSetupForm];

      // For required fields, check if they have values and no errors
      if (
        [
          'coupleName',
          'weddingDate',
          'guestCount',
          'venueName',
          'venueAddress',
          'ceremonyTime',
          'receptionTime',
          'primaryContactName',
          'primaryContactEmail',
          'primaryContactPhone',
        ].includes(field)
      ) {
        return value && !hasError;
      }

      // For optional fields, only check for errors if they have values
      return !hasError;
    });
  };

  const handleNext = async () => {
    const isValid = await form.trigger(currentStepData.fields as any);

    if (isValid) {
      setCompletedSteps((prev) => new Set(prev).add(currentStep));

      if (isLastStep) {
        const formData = form.getValues();
        onComplete(formData);
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    // Allow navigation to completed steps or the next step
    if (completedSteps.has(stepIndex) || stepIndex === currentStep + 1) {
      setCurrentStep(stepIndex);
    }
  };

  return (
    <div className={cn('max-w-4xl mx-auto p-6', className)}>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute top-8 left-8 right-8 h-0.5 bg-gray-200">
            <div
              className="h-full bg-purple-600 transition-all duration-500"
              style={{
                width: `${(currentStep / (SETUP_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>

          {SETUP_STEPS.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = completedSteps.has(index);
            const isCurrent = index === currentStep;
            const isAccessible = isCompleted || index <= currentStep + 1;

            return (
              <div
                key={step.id}
                className="flex flex-col items-center relative"
              >
                <button
                  onClick={() => isAccessible && handleStepClick(index)}
                  disabled={!isAccessible}
                  className={cn(
                    'w-16 h-16 rounded-full border-2 flex items-center justify-center transition-all duration-300 relative z-10',
                    'hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2',
                    {
                      'bg-purple-600 border-purple-600 text-white': isCurrent,
                      'bg-green-600 border-green-600 text-white': isCompleted,
                      'bg-white border-gray-300 text-gray-600':
                        !isCurrent && !isCompleted,
                      'cursor-pointer': isAccessible,
                      'cursor-not-allowed opacity-50': !isAccessible,
                    },
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </button>
                <div className="mt-3 text-center">
                  <p
                    className={cn('text-sm font-medium', {
                      'text-purple-600': isCurrent,
                      'text-green-600': isCompleted,
                      'text-gray-600': !isCurrent && !isCompleted,
                    })}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 max-w-24">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Form */}
      <Card className="min-h-[600px]">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <currentStepData.icon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-2xl">
                {currentStepData.title}
              </CardTitle>
              <CardDescription>{currentStepData.description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <Form {...form}>
            <form className="space-y-6">
              {/* Step 1: Wedding Basics */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="coupleName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Couple Names *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Sarah & James"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            How should we refer to the happy couple?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="weddingDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wedding Date *</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription>The big day!</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="guestCount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Guest Count *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="1000"
                              placeholder="50"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Approximate number of guests expected
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="budget"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Budget (Optional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                £
                              </span>
                              <Input
                                type="number"
                                min="100"
                                placeholder="15000"
                                className="pl-8"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Total wedding budget (helps with planning)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 2: Venue & Timing */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <FormField
                      control={form.control}
                      name="venueName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., The Grand Hotel"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Where is the wedding taking place?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="venueAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Venue Address *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Full address including postcode..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Complete address for vendors to find the venue
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="ceremonyTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ceremony Time *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormDescription>
                            When does the ceremony start?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="receptionTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Reception Time *</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormDescription>
                            When does the reception begin?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Special Requirements */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="dietaryRequirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dietary Requirements</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., 3 vegetarian meals, 1 gluten-free, 2 halal..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Any special dietary needs for guests?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialRequests"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Requests</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Any special requirements, accessibility needs, or important notes..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Anything else vendors should know about?
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              {/* Step 4: Contact Information */}
              {currentStep === 3 && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Badge variant="outline">Primary Contact</Badge>
                      <span className="text-red-500">*</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="primaryContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., Sarah Johnson"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="primaryContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 07123 456 789"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="primaryContactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address *</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="sarah@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Badge variant="outline">Secondary Contact</Badge>
                      <span className="text-gray-500 text-sm">(Optional)</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="secondaryContactName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Full Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., James Johnson"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="secondaryContactPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g., 07123 456 789"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mt-4">
                      <FormField
                        control={form.control}
                        name="secondaryContactEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="james@example.com"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              )}
            </form>
          </Form>
        </CardContent>

        {/* Navigation */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-3">
              {onSkip && (
                <Button type="button" variant="ghost" onClick={onSkip}>
                  Skip Setup
                </Button>
              )}
              {!isFirstStep && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Previous
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <p className="text-sm text-gray-500">
                Step {currentStep + 1} of {SETUP_STEPS.length}
              </p>
              <Button
                type="button"
                onClick={handleNext}
                disabled={!isCurrentStepValid()}
                className="flex items-center gap-2"
              >
                {isLastStep ? 'Complete Setup' : 'Next'}
                {!isLastStep && <ArrowRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
