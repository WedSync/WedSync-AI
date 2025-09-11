'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { createClient } from '@/lib/supabase/client';
import {
  CalendarDaysIcon,
  HeartIcon,
  MapPinIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import OAuthSignupButtons from './OAuthSignupButtons';

interface InvitationData {
  supplier_name?: string;
  wedding_date?: string;
  venue_name?: string;
  couple_name?: string;
  prefilled_data?: any;
}

interface CoupleSignupFormProps {
  invitationToken?: string;
  className?: string;
}

export default function CoupleSignupForm({
  invitationToken,
  className = '',
}: CoupleSignupFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<InvitationData | null>(
    null,
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [formData, setFormData] = useState({
    // Step 1: Account Creation
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',

    // Step 2: Wedding Details
    weddingDate: '',
    venueName: '',
    venueAddress: '',
    guestCount: '',
    budget: '',

    // Step 3: Partner Details (Optional)
    hasPartner: false,
    partnerFirstName: '',
    partnerLastName: '',
    partnerEmail: '',
    partnerPhone: '',

    // Step 4: Preferences
    weddingStyle: '',
    weddingTheme: '',
    communicationPreference: 'email',
    notifications: {
      email: true,
      sms: false,
      push: true,
    },

    // Legal
    agreeToTerms: false,
    agreeToPrivacy: false,
    agreeToMarketing: false,
  });

  // Load invitation data if token provided
  useEffect(() => {
    const loadInvitationData = async () => {
      if (!invitationToken) return;

      try {
        const { data, error } = await supabase
          .from('invitation_links')
          .select(
            `
            *,
            vendors!supplier_id (
              business_name,
              first_name,
              last_name
            )
          `,
          )
          .eq('token', invitationToken)
          .eq('status', 'pending')
          .single();

        if (error || !data) {
          setError('Invalid or expired invitation link');
          return;
        }

        const supplierName =
          data.vendors?.business_name ||
          `${data.vendors?.first_name} ${data.vendors?.last_name}`.trim();

        setInvitationData({
          supplier_name: supplierName,
          wedding_date: data.wedding_date,
          venue_name: data.venue_name,
          couple_name: data.couple_name,
          prefilled_data: data.prefilled_data,
        });

        // Pre-fill form data
        setFormData((prev) => ({
          ...prev,
          email: data.couple_email || '',
          weddingDate: data.wedding_date || '',
          venueName: data.venue_name || '',
          ...(data.prefilled_data || {}),
        }));
      } catch (error) {
        console.error('Error loading invitation:', error);
        setError('Failed to load invitation details');
      }
    };

    loadInvitationData();
  }, [invitationToken, supabase]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      if (name.startsWith('notifications.')) {
        const notificationKey = name.split('.')[1];
        setFormData((prev) => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            [notificationKey]: checked,
          },
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          [name]: checked,
        }));
      }
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const validateStep = (step: number): boolean => {
    setError(null);

    switch (step) {
      case 1:
        if (
          !formData.email ||
          !formData.password ||
          !formData.firstName ||
          !formData.lastName
        ) {
          setError('Please fill in all required fields');
          return false;
        }
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters');
          return false;
        }
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          return false;
        }
        if (!formData.agreeToTerms || !formData.agreeToPrivacy) {
          setError('Please agree to the Terms of Service and Privacy Policy');
          return false;
        }
        break;

      case 2:
        if (!formData.weddingDate) {
          setError('Wedding date is required');
          return false;
        }
        break;

      case 3:
        if (
          formData.hasPartner &&
          (!formData.partnerFirstName || !formData.partnerLastName)
        ) {
          setError('Please provide partner details');
          return false;
        }
        break;
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(currentStep)) return;

    setIsLoading(true);
    setError(null);

    try {
      // Call our custom signup API
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          invitationToken,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Signup failed');
      }

      // Redirect to onboarding for couples
      if (result.redirect) {
        router.push(result.redirect);
      } else {
        router.push('/onboarding');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <HeartIcon className="h-12 w-12 text-pink-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Create Your Account
              </h2>
              {invitationData?.supplier_name && (
                <p className="text-gray-600 mt-2">
                  Invited by{' '}
                  <span className="font-semibold text-pink-600">
                    {invitationData.supplier_name}
                  </span>
                </p>
              )}
            </div>

            <OAuthSignupButtons
              invitationToken={invitationToken}
              onSignupError={setError}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isLoading}
                required
                minLength={8}
              />
              <p className="text-sm text-gray-500 mt-1">Minimum 8 characters</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      agreeToTerms: checked as boolean,
                    }))
                  }
                  required
                />
                <Label htmlFor="agreeToTerms" className="text-sm">
                  I agree to the{' '}
                  <a
                    href="/terms"
                    className="text-pink-600 hover:underline"
                    target="_blank"
                  >
                    Terms of Service
                  </a>{' '}
                  *
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToPrivacy"
                  name="agreeToPrivacy"
                  checked={formData.agreeToPrivacy}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      agreeToPrivacy: checked as boolean,
                    }))
                  }
                  required
                />
                <Label htmlFor="agreeToPrivacy" className="text-sm">
                  I agree to the{' '}
                  <a
                    href="/privacy"
                    className="text-pink-600 hover:underline"
                    target="_blank"
                  >
                    Privacy Policy
                  </a>{' '}
                  *
                </Label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="agreeToMarketing"
                  name="agreeToMarketing"
                  checked={formData.agreeToMarketing}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      agreeToMarketing: checked as boolean,
                    }))
                  }
                />
                <Label htmlFor="agreeToMarketing" className="text-sm">
                  I'd like to receive wedding planning tips and updates
                </Label>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <CalendarDaysIcon className="h-12 w-12 text-pink-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Wedding Details
              </h2>
              <p className="text-gray-600 mt-2">
                Tell us about your special day
              </p>
            </div>

            <div>
              <Label htmlFor="weddingDate">Wedding Date *</Label>
              <Input
                id="weddingDate"
                name="weddingDate"
                type="date"
                value={formData.weddingDate}
                onChange={handleInputChange}
                disabled={isLoading}
                required
              />
            </div>

            <div>
              <Label htmlFor="venueName">Venue Name</Label>
              <Input
                id="venueName"
                name="venueName"
                value={formData.venueName}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Enter venue name"
              />
            </div>

            <div>
              <Label htmlFor="venueAddress">Venue Address</Label>
              <Input
                id="venueAddress"
                name="venueAddress"
                value={formData.venueAddress}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="Enter venue address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="guestCount">Expected Guest Count</Label>
                <Input
                  id="guestCount"
                  name="guestCount"
                  type="number"
                  value={formData.guestCount}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  placeholder="Number of guests"
                />
              </div>
              <div>
                <Label htmlFor="budget">Budget (Optional)</Label>
                <Input
                  id="budget"
                  name="budget"
                  type="number"
                  value={formData.budget}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  placeholder="Total budget"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <UsersIcon className="h-12 w-12 text-pink-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Partner Information
              </h2>
              <p className="text-gray-600 mt-2">
                Add your partner's details (optional)
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="hasPartner"
                name="hasPartner"
                checked={formData.hasPartner}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    hasPartner: checked as boolean,
                  }))
                }
              />
              <Label htmlFor="hasPartner">
                I want to add my partner to this account
              </Label>
            </div>

            {formData.hasPartner && (
              <div className="space-y-4 p-4 bg-pink-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partnerFirstName">
                      Partner's First Name
                    </Label>
                    <Input
                      id="partnerFirstName"
                      name="partnerFirstName"
                      value={formData.partnerFirstName}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="partnerLastName">Partner's Last Name</Label>
                    <Input
                      id="partnerLastName"
                      name="partnerLastName"
                      value={formData.partnerLastName}
                      onChange={handleInputChange}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="partnerEmail">Partner's Email</Label>
                  <Input
                    id="partnerEmail"
                    name="partnerEmail"
                    type="email"
                    value={formData.partnerEmail}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="Partner's email address"
                  />
                </div>

                <div>
                  <Label htmlFor="partnerPhone">Partner's Phone</Label>
                  <Input
                    id="partnerPhone"
                    name="partnerPhone"
                    type="tel"
                    value={formData.partnerPhone}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    placeholder="Partner's phone number"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <MapPinIcon className="h-12 w-12 text-pink-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Preferences</h2>
              <p className="text-gray-600 mt-2">Customize your experience</p>
            </div>

            <div>
              <Label htmlFor="weddingStyle">Wedding Style</Label>
              <select
                id="weddingStyle"
                name="weddingStyle"
                value={formData.weddingStyle}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="">Select style</option>
                <option value="traditional">Traditional</option>
                <option value="modern">Modern</option>
                <option value="rustic">Rustic</option>
                <option value="vintage">Vintage</option>
                <option value="boho">Bohemian</option>
                <option value="classic">Classic</option>
                <option value="destination">Destination</option>
              </select>
            </div>

            <div>
              <Label htmlFor="weddingTheme">Wedding Theme</Label>
              <Input
                id="weddingTheme"
                name="weddingTheme"
                value={formData.weddingTheme}
                onChange={handleInputChange}
                disabled={isLoading}
                placeholder="e.g., Garden Party, Black Tie, Beach"
              />
            </div>

            <div>
              <Label htmlFor="communicationPreference">
                Preferred Communication
              </Label>
              <select
                id="communicationPreference"
                name="communicationPreference"
                value={formData.communicationPreference}
                onChange={handleInputChange}
                disabled={isLoading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="phone">Phone</option>
                <option value="app">In-App Only</option>
              </select>
            </div>

            <div className="space-y-3">
              <Label>Notification Preferences</Label>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifications.email"
                  name="notifications.email"
                  checked={formData.notifications.email}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        email: checked as boolean,
                      },
                    }))
                  }
                />
                <Label htmlFor="notifications.email">Email notifications</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifications.sms"
                  name="notifications.sms"
                  checked={formData.notifications.sms}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        sms: checked as boolean,
                      },
                    }))
                  }
                />
                <Label htmlFor="notifications.sms">SMS notifications</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="notifications.push"
                  name="notifications.push"
                  checked={formData.notifications.push}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        push: checked as boolean,
                      },
                    }))
                  }
                />
                <Label htmlFor="notifications.push">Push notifications</Label>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={`w-full max-w-2xl mx-auto ${className}`}>
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            {error && (
              <Alert className="mt-6 border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-between mt-8">
              {currentStep > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={isLoading}
                >
                  Previous
                </Button>
              )}

              <div className="ml-auto">
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={isLoading}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    Next Step
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="bg-pink-600 hover:bg-pink-700"
                  >
                    {isLoading ? 'Creating Account...' : 'Create Account'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
