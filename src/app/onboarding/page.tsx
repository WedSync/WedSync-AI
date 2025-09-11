'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { HeartIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase/client';

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [coupleData, setCoupleData] = useState<any>(null);
  const fromInvitation = searchParams.get('from') === 'invitation';
  const step = searchParams.get('step');

  useEffect(() => {
    loadCoupleData();
    if (step === 'wedding-details') {
      setCurrentStep(2);
    } else if (step === 'continue') {
      setCurrentStep(3);
    }
  }, [step]);

  const loadCoupleData = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: couple } = await supabase
        .from('couples')
        .select(
          `
          *,
          couple_preferences (*),
          couple_vendor_relationships (
            *,
            vendors (*)
          )
        `,
        )
        .eq('user_id', user.id)
        .single();

      setCoupleData(couple);
    } catch (error) {
      console.error('Error loading couple data:', error);
    }
  };

  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      if (coupleData) {
        await supabase
          .from('couples')
          .update({
            onboarding_completed: true,
            onboarding_progress: {
              steps_completed: 5,
              total_steps: 5,
              current_step: 'completed',
            },
          })
          .eq('id', coupleData.id);
      }

      router.push('/client/dashboard?welcome=true');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
    setIsLoading(false);
  };

  const progress = (currentStep / 3) * 100;

  const onboardingSteps = [
    {
      title: 'Welcome to WedSync!',
      description: 'Your account has been created successfully.',
      content: (
        <div className="text-center space-y-6">
          <CheckCircleIcon className="h-20 w-20 text-green-500 mx-auto" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              🎉 Welcome to WedSync!
            </h3>
            <p className="text-gray-600 text-lg">
              Your wedding planning journey starts here
            </p>
          </div>

          {fromInvitation && (
            <div className="p-4 bg-pink-100 rounded-lg">
              <p className="text-pink-800 font-medium">
                ✨ Great news! Your vendor connection has been established
                automatically.
              </p>
            </div>
          )}

          <div className="space-y-3 text-left max-w-md mx-auto">
            <h4 className="font-semibold text-gray-900">What's next:</h4>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span>Account created & secured</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span>
                  Wedding details{' '}
                  {fromInvitation ? 'pre-filled' : 'ready to add'}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                <span>
                  Vendor connections {fromInvitation ? 'established' : 'ready'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Your Wedding Details',
      description: 'Review and complete your wedding information.',
      content: (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              📅 Your Wedding Details
            </h3>
            <p className="text-gray-600">
              {fromInvitation
                ? "We've pre-filled some details from your vendor invitation"
                : "Let's add your wedding details"}
            </p>
          </div>

          {coupleData && (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">
                    Wedding Date:
                  </span>
                  <p className="text-gray-900">
                    {coupleData.wedding_date
                      ? new Date(coupleData.wedding_date).toLocaleDateString()
                      : 'Not set'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Venue:</span>
                  <p className="text-gray-900">
                    {coupleData.venue_name || 'Not set'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">
                    Guest Count:
                  </span>
                  <p className="text-gray-900">
                    {coupleData.guest_count || 'Not set'}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">Style:</span>
                  <p className="text-gray-900">
                    {coupleData.wedding_style || 'Not set'}
                  </p>
                </div>
              </div>

              {coupleData.partner_first_name && (
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <h4 className="font-medium text-pink-800 mb-2">
                    Partner Details:
                  </h4>
                  <p className="text-pink-700">
                    {coupleData.partner_first_name}{' '}
                    {coupleData.partner_last_name}
                  </p>
                  {coupleData.partner_email && (
                    <p className="text-sm text-pink-600">
                      {coupleData.partner_email}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Ready to Start!',
      description: 'Everything is set up for your wedding planning journey.',
      content: (
        <div className="text-center space-y-6">
          <HeartIcon className="h-20 w-20 text-pink-500 mx-auto" />
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              🚀 You're All Set!
            </h3>
            <p className="text-gray-600 text-lg">
              Your wedding planning dashboard is ready
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto text-sm">
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900">Planning Tools</h4>
              <p className="text-blue-700">
                Timeline, tasks, and budget tracking
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900">
                Vendor Management
              </h4>
              <p className="text-green-700">Connect and manage your vendors</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <h4 className="font-semibold text-purple-900">Guest Lists</h4>
              <p className="text-purple-700">Manage RSVPs and guest details</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900">Analytics</h4>
              <p className="text-yellow-700">Track progress and insights</p>
            </div>
          </div>

          <div className="p-4 bg-gradient-to-r from-pink-100 to-purple-100 rounded-lg border">
            <p className="font-medium text-gray-800">
              🎁 Pro Tip: Your dashboard includes a getting started checklist to
              help you begin planning right away!
            </p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to WedSync
          </h1>
          <p className="text-gray-600">
            Let's get your wedding planning started!
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of 3</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>

        {/* Content Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-center">
              {onboardingSteps[currentStep - 1]?.title}
            </CardTitle>
            <p className="text-center text-gray-600">
              {onboardingSteps[currentStep - 1]?.description}
            </p>
          </CardHeader>
          <CardContent className="min-h-[400px] flex items-center justify-center">
            {onboardingSteps[currentStep - 1]?.content}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              disabled={isLoading}
            >
              Previous
            </Button>
          )}

          <div className="ml-auto">
            {currentStep < 3 ? (
              <Button
                onClick={() => setCurrentStep((prev) => prev + 1)}
                disabled={isLoading}
                className="bg-pink-600 hover:bg-pink-700"
              >
                Continue
              </Button>
            ) : (
              <Button
                onClick={completeOnboarding}
                disabled={isLoading}
                className="bg-pink-600 hover:bg-pink-700 text-lg px-8 py-3"
              >
                {isLoading ? 'Setting up...' : 'Enter Dashboard 🎉'}
              </Button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>
            Need help? Visit our{' '}
            <a href="/support" className="text-pink-600 hover:underline">
              Support Center
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
          <div className="text-center">
            <HeartIcon className="h-16 w-16 text-pink-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Setting up your onboarding...</p>
          </div>
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
