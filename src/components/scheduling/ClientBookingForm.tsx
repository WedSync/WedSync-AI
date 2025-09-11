'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  User,
  Mail,
  Phone,
  Calendar,
  Users,
  MapPin,
  MessageSquare,
  CheckCircle,
  AlertTriangle,
  Lock,
  Clock,
  ArrowRight,
  ArrowLeft,
  Send,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button-untitled';
import { Input } from '@/components/ui/input-untitled';
import { Card } from '@/components/ui/card-untitled';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import moment from 'moment-timezone';

// Types
interface TimeSlot {
  id: string;
  start: Date;
  end: Date;
  isAvailable: boolean;
  meetingType?: MeetingType;
}

interface MeetingType {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  color: string;
  is_paid: boolean;
  price?: number;
  currency: string;
  meeting_location: string;
  video_call_platform?: string;
  requires_questionnaire: boolean;
  questionnaire_questions: QuestionnaireQuestion[];
}

interface QuestionnaireQuestion {
  id: string;
  question: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
}

interface ExistingClient {
  id: string;
  name: string;
  email: string;
  phone?: string;
  wedding_date?: string;
  partner_name?: string;
  venue_name?: string;
  guest_count?: number;
  wedding_style?: string;
}

interface BookingFormData {
  // Client verification
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone: string;

  // Wedding details
  wedding_date: string;
  partner_name: string;
  venue_location: string;
  guest_count: number;
  wedding_style: string;

  // Meeting details
  special_requirements: string;
  preferred_contact_method: 'email' | 'phone' | 'sms';

  // Questionnaire responses
  questionnaire_responses: Record<string, string>;

  // Agreement
  terms_accepted: boolean;
  privacy_accepted: boolean;
}

interface ClientBookingFormProps {
  // Required props
  supplierId: string;
  bookingPageSlug: string;
  selectedSlot: TimeSlot;
  timezone: string;

  // Optional configuration
  existingClients?: ExistingClient[];
  requiresClientVerification?: boolean;
  allowGuestBooking?: boolean;

  // Event handlers
  onBookingSubmit: (
    bookingData: BookingFormData,
  ) => Promise<{ success: boolean; bookingId?: string; error?: string }>;
  onBack: () => void;
  onClientLookup: (email: string) => Promise<ExistingClient | null>;

  // UI configuration
  compactMode?: boolean;
  className?: string;
}

const weddingStyleOptions = [
  'Traditional',
  'Modern',
  'Rustic',
  'Bohemian',
  'Classic',
  'Vintage',
  'Garden',
  'Beach',
  'Destination',
  'Intimate',
  'Grand',
  'Cultural',
];

const guestCountOptions = [
  { value: '1-25', label: '1-25 guests (Intimate)' },
  { value: '26-50', label: '26-50 guests (Small)' },
  { value: '51-100', label: '51-100 guests (Medium)' },
  { value: '101-150', label: '101-150 guests (Large)' },
  { value: '151-200', label: '151-200 guests (Very Large)' },
  { value: '200+', label: '200+ guests (Grand)' },
];

export default function ClientBookingForm({
  supplierId,
  bookingPageSlug,
  selectedSlot,
  timezone,
  existingClients = [],
  requiresClientVerification = true,
  allowGuestBooking = false,
  onBookingSubmit,
  onBack,
  onClientLookup,
  compactMode = false,
  className,
}: ClientBookingFormProps) {
  // State
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<BookingFormData>({
    client_id: '',
    client_name: '',
    client_email: '',
    client_phone: '',
    wedding_date: '',
    partner_name: '',
    venue_location: '',
    guest_count: 0,
    wedding_style: '',
    special_requirements: '',
    preferred_contact_method: 'email',
    questionnaire_responses: {},
    terms_accepted: false,
    privacy_accepted: false,
  });

  const [verifiedClient, setVerifiedClient] = useState<ExistingClient | null>(
    null,
  );
  const [isVerifying, setVerifying] = useState(false);
  const [isSubmitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string>('');
  const [bookingConfirmed, setBookingConfirmed] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');

  // Meeting type from selected slot
  const meetingType = selectedSlot.meetingType;

  // Steps configuration
  const steps = useMemo(() => {
    const baseSteps = [
      {
        id: 1,
        name: 'Client Verification',
        description: 'Verify your client account',
      },
      {
        id: 2,
        name: 'Wedding Details',
        description: 'Tell us about your wedding',
      },
      {
        id: 3,
        name: 'Meeting Preferences',
        description: 'Special requirements and preferences',
      },
    ];

    if (
      meetingType?.requires_questionnaire &&
      meetingType.questionnaire_questions.length > 0
    ) {
      baseSteps.push({
        id: 4,
        name: 'Questionnaire',
        description: 'Additional questions',
      });
    }

    baseSteps.push({
      id: baseSteps.length + 1,
      name: 'Review & Confirm',
      description: 'Review your booking',
    });

    return baseSteps;
  }, [meetingType]);

  // Client verification
  const verifyClient = useCallback(
    async (email: string) => {
      if (!email || !email.includes('@')) return;

      setVerifying(true);
      setErrors((prev) => ({ ...prev, client_email: '' }));

      try {
        const client = await onClientLookup(email);
        if (client) {
          setVerifiedClient(client);
          setFormData((prev) => ({
            ...prev,
            client_id: client.id,
            client_name: client.name,
            client_email: client.email,
            client_phone: client.phone || '',
            wedding_date: client.wedding_date || '',
            partner_name: client.partner_name || '',
            venue_location: client.venue_name || '',
            guest_count: client.guest_count || 0,
            wedding_style: client.wedding_style || '',
          }));
        } else if (requiresClientVerification) {
          setErrors((prev) => ({
            ...prev,
            client_email:
              'Email not found. This booking system is for existing clients only. Please contact us directly to become a client first.',
          }));
          setVerifiedClient(null);
        }
      } catch (error) {
        setErrors((prev) => ({
          ...prev,
          client_email:
            'Unable to verify client. Please try again or contact us directly.',
        }));
      } finally {
        setVerifying(false);
      }
    },
    [onClientLookup, requiresClientVerification],
  );

  // Form validation by step
  const validateStep = useCallback(
    (step: number): boolean => {
      const newErrors: Record<string, string> = {};

      switch (step) {
        case 1: // Client Verification
          if (!formData.client_email) {
            newErrors.client_email = 'Email address is required';
          } else if (!/\S+@\S+\.\S+/.test(formData.client_email)) {
            newErrors.client_email = 'Please enter a valid email address';
          } else if (requiresClientVerification && !verifiedClient) {
            newErrors.client_email = 'Please verify your client account first';
          }

          if (!formData.client_name) {
            newErrors.client_name = 'Full name is required';
          }

          if (!formData.client_phone) {
            newErrors.client_phone = 'Phone number is required';
          }
          break;

        case 2: // Wedding Details
          if (!formData.wedding_date) {
            newErrors.wedding_date = 'Wedding date is required';
          } else {
            const weddingDate = new Date(formData.wedding_date);
            const today = new Date();
            if (weddingDate <= today) {
              newErrors.wedding_date = 'Wedding date must be in the future';
            }
          }

          if (!formData.partner_name) {
            newErrors.partner_name = 'Partner name is required';
          }

          if (!formData.venue_location) {
            newErrors.venue_location = 'Venue location is required';
          }

          if (formData.guest_count <= 0) {
            newErrors.guest_count = 'Guest count is required';
          }
          break;

        case 4: // Questionnaire (if applicable)
          if (meetingType?.requires_questionnaire) {
            meetingType.questionnaire_questions.forEach((question) => {
              if (
                question.required &&
                !formData.questionnaire_responses[question.id]
              ) {
                newErrors[`question_${question.id}`] =
                  'This question is required';
              }
            });
          }
          break;

        case steps.length: // Final Review
          if (!formData.terms_accepted) {
            newErrors.terms_accepted =
              'You must accept the terms and conditions';
          }

          if (!formData.privacy_accepted) {
            newErrors.privacy_accepted = 'You must accept the privacy policy';
          }
          break;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    },
    [
      formData,
      verifiedClient,
      requiresClientVerification,
      meetingType,
      steps.length,
    ],
  );

  // Navigation
  const nextStep = useCallback(() => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length));
    }
  }, [currentStep, validateStep, steps.length]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // Form submission
  const submitBooking = useCallback(async () => {
    if (!validateStep(steps.length)) return;

    setSubmitting(true);
    setSubmitError('');

    try {
      const result = await onBookingSubmit(formData);
      if (result.success) {
        setBookingConfirmed(true);
        setBookingId(result.bookingId || '');
      } else {
        setSubmitError(
          result.error || 'Failed to create booking. Please try again.',
        );
      }
    } catch (error) {
      setSubmitError('An unexpected error occurred. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [formData, onBookingSubmit, validateStep, steps.length]);

  // Auto-verify email when it changes
  useEffect(() => {
    if (
      formData.client_email &&
      formData.client_email.includes('@') &&
      !verifiedClient
    ) {
      const timeoutId = setTimeout(() => {
        verifyClient(formData.client_email);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [formData.client_email, verifiedClient, verifyClient]);

  // Show booking confirmation
  if (bookingConfirmed) {
    return (
      <Card className={cn('max-w-2xl mx-auto p-6', className)}>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-success-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-success-600" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Booking Confirmed!
            </h2>
            <p className="text-gray-600 mt-1">
              Your meeting has been successfully scheduled
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Booking Reference:
              </span>
              <code className="text-sm font-mono bg-white px-2 py-1 rounded">
                {bookingId}
              </code>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Meeting:
              </span>
              <span className="text-sm">{meetingType?.name}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Date & Time:
              </span>
              <span className="text-sm">
                {moment(selectedSlot.start)
                  .tz(timezone)
                  .format('dddd, MMMM D, YYYY [at] h:mm A')}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Duration:
              </span>
              <span className="text-sm">
                {meetingType?.duration_minutes} minutes
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                Location:
              </span>
              <span className="text-sm">{meetingType?.meeting_location}</span>
            </div>
          </div>

          <Alert>
            <Mail className="h-4 w-4" />
            <AlertDescription>
              A confirmation email has been sent to{' '}
              <strong>{formData.client_email}</strong> with all the meeting
              details and joining instructions.
            </AlertDescription>
          </Alert>

          <div className="flex gap-3 justify-center">
            <Button
              variant="primary"
              onClick={() => (window.location.href = '/dashboard')}
            >
              Go to Dashboard
            </Button>
            <Button
              variant="secondary"
              onClick={() => window.location.reload()}
            >
              Book Another Meeting
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className={cn('max-w-4xl mx-auto space-y-6', className)}>
      {/* Progress Steps */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <nav aria-label="Progress">
          <ol className="flex items-center justify-between">
            {steps.map((step, index) => (
              <li
                key={step.id}
                className={cn(
                  'flex items-center',
                  index !== steps.length - 1 && 'flex-1',
                )}
              >
                <div className="flex items-center">
                  <div
                    className={cn(
                      'flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors',
                      currentStep === step.id
                        ? 'bg-primary-600 border-primary-600 text-white'
                        : currentStep > step.id
                          ? 'bg-success-600 border-success-600 text-white'
                          : 'bg-white border-gray-300 text-gray-500',
                    )}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <span className="text-sm font-medium">{step.id}</span>
                    )}
                  </div>

                  <div className="ml-3 hidden sm:block">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        currentStep >= step.id
                          ? 'text-gray-900'
                          : 'text-gray-500',
                      )}
                    >
                      {step.name}
                    </p>
                    <p className="text-xs text-gray-500">{step.description}</p>
                  </div>
                </div>

                {index !== steps.length - 1 && (
                  <div
                    className={cn(
                      'hidden sm:block flex-1 h-0.5 mx-4 transition-colors',
                      currentStep > step.id ? 'bg-success-600' : 'bg-gray-200',
                    )}
                  />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>

      {/* Meeting Summary */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-3 h-3 rounded-full mt-2"
            style={{ backgroundColor: meetingType?.color || '#7F56D9' }}
          />
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{meetingType?.name}</h3>
            <p className="text-gray-600 text-sm mb-3">
              {meetingType?.description}
            </p>

            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span>
                  {moment(selectedSlot.start)
                    .tz(timezone)
                    .format('dddd, MMMM D, YYYY')}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>
                  {moment(selectedSlot.start).tz(timezone).format('h:mm A')} -
                  {moment(selectedSlot.end).tz(timezone).format('h:mm A')} (
                  {timezone})
                </span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>{meetingType?.meeting_location}</span>
              </div>
            </div>

            {meetingType?.is_paid && (
              <div className="mt-2">
                <Badge variant="secondary">
                  £{meetingType.price} {meetingType.currency}
                </Badge>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Form Content */}
      <Card className="p-6">
        {/* Step 1: Client Verification */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Shield className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold">Client Verification</h2>
              <p className="text-gray-600 text-sm">
                {requiresClientVerification
                  ? 'This booking system is for existing clients only. Enter your email to verify your account.'
                  : 'Please provide your contact information to proceed with booking.'}
              </p>
            </div>

            {requiresClientVerification && (
              <Alert>
                <Lock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Existing Clients Only:</strong> You must be an
                  existing client to book through this system. If you're a new
                  client, please contact us directly first.
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                value={formData.client_email}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    client_email: e.target.value,
                  }))
                }
                placeholder="your@email.com"
                error={errors.client_email}
                leftIcon={<Mail className="h-4 w-4" />}
                required
                helperText={isVerifying ? 'Verifying client account...' : ''}
              />

              {verifiedClient && (
                <div className="p-4 bg-success-50 border border-success-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-success-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-success-900">
                        Client Account Verified
                      </p>
                      <p className="text-sm text-success-700">
                        Welcome back, {verifiedClient.name}! We've pre-filled
                        your information below.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Input
                label="Full Name"
                value={formData.client_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    client_name: e.target.value,
                  }))
                }
                placeholder="John & Jane Smith"
                error={errors.client_name}
                leftIcon={<User className="h-4 w-4" />}
                required
              />

              <Input
                label="Phone Number"
                type="tel"
                value={formData.client_phone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    client_phone: e.target.value,
                  }))
                }
                placeholder="+44 7xxx xxx xxx"
                error={errors.client_phone}
                leftIcon={<Phone className="h-4 w-4" />}
                required
              />
            </div>
          </div>
        )}

        {/* Step 2: Wedding Details */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Calendar className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold">Wedding Details</h2>
              <p className="text-gray-600 text-sm">
                Tell us about your special day so we can prepare for our meeting
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                label="Wedding Date"
                type="date"
                value={formData.wedding_date}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    wedding_date: e.target.value,
                  }))
                }
                error={errors.wedding_date}
                required
              />

              <Input
                label="Partner's Name"
                value={formData.partner_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    partner_name: e.target.value,
                  }))
                }
                placeholder="Jane Smith"
                error={errors.partner_name}
                required
              />

              <Input
                label="Venue Location"
                value={formData.venue_location}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    venue_location: e.target.value,
                  }))
                }
                placeholder="The Grand Hotel, London"
                error={errors.venue_location}
                leftIcon={<MapPin className="h-4 w-4" />}
                required
              />

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Expected Guest Count <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.guest_count.toString()}
                  onValueChange={(value) =>
                    setFormData((prev) => ({
                      ...prev,
                      guest_count: parseInt(value),
                    }))
                  }
                >
                  <SelectTrigger
                    className={errors.guest_count ? 'border-error-300' : ''}
                  >
                    <SelectValue placeholder="Select guest count" />
                  </SelectTrigger>
                  <SelectContent>
                    {guestCountOptions.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value.split('-')[0]}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.guest_count && (
                  <p className="text-sm text-error-600">{errors.guest_count}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Wedding Style
              </label>
              <Select
                value={formData.wedding_style}
                onValueChange={(value) =>
                  setFormData((prev) => ({ ...prev, wedding_style: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select wedding style" />
                </SelectTrigger>
                <SelectContent>
                  {weddingStyleOptions.map((style) => (
                    <SelectItem key={style} value={style}>
                      {style}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 3: Meeting Preferences */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MessageSquare className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold">Meeting Preferences</h2>
              <p className="text-gray-600 text-sm">
                Let us know about any special requirements or preferences
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Special Requirements or Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300 transition-colors"
                  rows={4}
                  value={formData.special_requirements}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      special_requirements: e.target.value,
                    }))
                  }
                  placeholder="Any accessibility needs, dietary requirements, or specific topics you'd like to discuss..."
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Preferred Contact Method
                </label>
                <Select
                  value={formData.preferred_contact_method}
                  onValueChange={(value: 'email' | 'phone' | 'sms') =>
                    setFormData((prev) => ({
                      ...prev,
                      preferred_contact_method: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="phone">Phone Call</SelectItem>
                    <SelectItem value="sms">SMS/Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Questionnaire (if required) */}
        {currentStep === 4 && meetingType?.requires_questionnaire && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <MessageSquare className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold">Additional Questions</h2>
              <p className="text-gray-600 text-sm">
                Please answer these questions to help us prepare for your
                meeting
              </p>
            </div>

            <div className="space-y-4">
              {meetingType.questionnaire_questions.map((question) => (
                <div key={question.id} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {question.question}
                    {question.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>

                  {question.type === 'select' ? (
                    <Select
                      value={
                        formData.questionnaire_responses[question.id] || ''
                      }
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          questionnaire_responses: {
                            ...prev.questionnaire_responses,
                            [question.id]: value,
                          },
                        }))
                      }
                    >
                      <SelectTrigger
                        className={
                          errors[`question_${question.id}`]
                            ? 'border-error-300'
                            : ''
                        }
                      >
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {question.options?.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : question.type === 'textarea' ? (
                    <textarea
                      className={cn(
                        'w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-300 transition-colors',
                        errors[`question_${question.id}`]
                          ? 'border-error-300'
                          : 'border-gray-300',
                      )}
                      rows={3}
                      value={
                        formData.questionnaire_responses[question.id] || ''
                      }
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          questionnaire_responses: {
                            ...prev.questionnaire_responses,
                            [question.id]: e.target.value,
                          },
                        }))
                      }
                      placeholder="Your answer..."
                    />
                  ) : (
                    <Input
                      type={question.type}
                      value={
                        formData.questionnaire_responses[question.id] || ''
                      }
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          questionnaire_responses: {
                            ...prev.questionnaire_responses,
                            [question.id]: e.target.value,
                          },
                        }))
                      }
                      placeholder="Your answer..."
                      error={errors[`question_${question.id}`]}
                    />
                  )}

                  {errors[`question_${question.id}`] && (
                    <p className="text-sm text-error-600">
                      {errors[`question_${question.id}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Final Step: Review & Confirm */}
        {currentStep === steps.length && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="w-12 h-12 text-primary-600 mx-auto mb-3" />
              <h2 className="text-xl font-semibold">Review & Confirm</h2>
              <p className="text-gray-600 text-sm">
                Please review your booking details before confirming
              </p>
            </div>

            {/* Booking Summary */}
            <div className="bg-gray-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-lg">Booking Summary</h3>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Contact Information</h4>
                  <div className="space-y-1 text-gray-600">
                    <p>{formData.client_name}</p>
                    <p>{formData.client_email}</p>
                    <p>{formData.client_phone}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Wedding Details</h4>
                  <div className="space-y-1 text-gray-600">
                    <p>
                      Date:{' '}
                      {moment(formData.wedding_date).format('MMMM D, YYYY')}
                    </p>
                    <p>Partner: {formData.partner_name}</p>
                    <p>Venue: {formData.venue_location}</p>
                    <p>Guests: {formData.guest_count}</p>
                    {formData.wedding_style && (
                      <p>Style: {formData.wedding_style}</p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Meeting Details</h4>
                <div className="text-gray-600 text-sm space-y-1">
                  <p>
                    {meetingType?.name} ({meetingType?.duration_minutes}{' '}
                    minutes)
                  </p>
                  <p>
                    {moment(selectedSlot.start)
                      .tz(timezone)
                      .format('dddd, MMMM D, YYYY [at] h:mm A')}
                  </p>
                  <p>Location: {meetingType?.meeting_location}</p>
                  {meetingType?.is_paid && (
                    <p>
                      Cost: £{meetingType.price} {meetingType.currency}
                    </p>
                  )}
                </div>
              </div>

              {formData.special_requirements && (
                <div>
                  <h4 className="font-medium mb-2">Special Requirements</h4>
                  <p className="text-gray-600 text-sm">
                    {formData.special_requirements}
                  </p>
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.terms_accepted}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      terms_accepted: e.target.checked,
                    }))
                  }
                  className="mt-1"
                />
                <label htmlFor="terms" className="text-sm text-gray-600">
                  I accept the{' '}
                  <a
                    href="/terms"
                    className="text-primary-600 hover:underline"
                    target="_blank"
                  >
                    terms and conditions
                  </a>{' '}
                  and understand the cancellation policy
                  {errors.terms_accepted && (
                    <span className="text-error-600 block">
                      {errors.terms_accepted}
                    </span>
                  )}
                </label>
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="privacy"
                  checked={formData.privacy_accepted}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      privacy_accepted: e.target.checked,
                    }))
                  }
                  className="mt-1"
                />
                <label htmlFor="privacy" className="text-sm text-gray-600">
                  I accept the{' '}
                  <a
                    href="/privacy"
                    className="text-primary-600 hover:underline"
                    target="_blank"
                  >
                    privacy policy
                  </a>{' '}
                  and consent to data processing
                  {errors.privacy_accepted && (
                    <span className="text-error-600 block">
                      {errors.privacy_accepted}
                    </span>
                  )}
                </label>
              </div>
            </div>

            {submitError && (
              <Alert className="border-error-200 bg-error-50">
                <AlertTriangle className="h-4 w-4 text-error-600" />
                <AlertDescription className="text-error-700">
                  {submitError}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div>
            {currentStep > 1 ? (
              <Button
                variant="secondary"
                onClick={prevStep}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Back
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={onBack}
                leftIcon={<ArrowLeft className="h-4 w-4" />}
              >
                Change Time
              </Button>
            )}
          </div>

          <div className="text-sm text-gray-500">
            Step {currentStep} of {steps.length}
          </div>

          <div>
            {currentStep < steps.length ? (
              <Button
                variant="primary"
                onClick={nextStep}
                rightIcon={<ArrowRight className="h-4 w-4" />}
                disabled={isVerifying}
              >
                {isVerifying ? 'Verifying...' : 'Continue'}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={submitBooking}
                loading={isSubmitting}
                leftIcon={<Send className="h-4 w-4" />}
              >
                {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
