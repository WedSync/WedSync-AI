'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { HeartIcon } from '@heroicons/react/24/outline';
import CoupleSignupForm from '@/components/auth/CoupleSignupForm';

function SignupContent() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [userType, setUserType] = useState<'couple' | 'supplier'>('couple');

  useEffect(() => {
    // Get error from URL params
    const urlError = searchParams.get('error');
    if (urlError) {
      setError(decodeURIComponent(urlError));
    }

    // Get user type from URL params
    const type = searchParams.get('type');
    if (type === 'supplier') {
      setUserType('supplier');
    } else {
      setUserType('couple');
    }

    // Get invitation token
    const invitation = searchParams.get('invitation');
    if (invitation) {
      setInvitationToken(invitation);
      loadInvitationData(invitation);
    }
  }, [searchParams]);

  const loadInvitationData = async (token: string) => {
    try {
      const response = await fetch(`/api/auth/signup?invitation=${token}`);
      if (response.ok) {
        const data = await response.json();
        setInvitationData(data.invitation);
      }
    } catch (error) {
      console.error('Failed to load invitation data:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <HeartIcon className={`h-16 w-16 ${userType === 'supplier' ? 'text-indigo-600' : 'text-pink-600'}`} />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {userType === 'supplier' 
              ? 'Join WedSync for Suppliers' 
              : invitationData 
                ? 'Complete Your Wedding Setup' 
                : 'Join WedMe for Couples'
            }
          </h1>
          <p className="text-gray-600 text-lg">
            {userType === 'supplier' 
              ? 'Grow your wedding business with professional tools and client management'
              : invitationData
                ? `You've been invited by ${invitationData.supplier_name} to get started`
                : 'Create your account and start planning your perfect wedding'
            }
          </p>

          {invitationData && (
            <div className="mt-4 p-4 bg-pink-100 rounded-lg border border-pink-200 inline-block">
              <div className="text-sm text-pink-800">
                <p className="font-semibold">Wedding Details Pre-filled:</p>
                {invitationData.wedding_date && (
                  <p>
                    📅 Date:{' '}
                    {new Date(invitationData.wedding_date).toLocaleDateString()}
                  </p>
                )}
                {invitationData.venue_name && (
                  <p>🏛️ Venue: {invitationData.venue_name}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Global error display */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Signup Form */}
        {userType === 'supplier' ? (
          <div className="text-center mb-8">
            <p className="text-gray-600 mb-4">
              Supplier registration is coming soon! For now, please contact us to get started.
            </p>
            <a href="mailto:hello@wedsync.com" className="text-indigo-600 hover:underline font-medium">
              Contact Us to Join as a Supplier
            </a>
          </div>
        ) : (
          <CoupleSignupForm
            invitationToken={invitationToken || undefined}
            className="mb-8"
          />
        )}

        {/* Footer Links */}
        <div className="text-center space-y-4">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link
              href={
                invitationToken
                  ? `/login?invitation=${invitationToken}`
                  : '/login'
              }
              className="text-pink-600 hover:text-pink-700 font-medium"
            >
              Sign in
            </Link>
          </p>

          <div className="flex justify-center space-x-6 text-sm text-gray-500">
            <Link href="/terms" className="hover:text-gray-700">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-gray-700">
              Privacy Policy
            </Link>
            <Link href="/support" className="hover:text-gray-700">
              Support
            </Link>
          </div>

          <p className="text-xs text-gray-400 mt-6">
            By creating an account, you agree to our Terms of Service and
            Privacy Policy.
            <br />
            Your data is encrypted and secure with industry-standard protection.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
          <div className="text-center">
            <HeartIcon className="h-16 w-16 text-pink-600 mx-auto mb-4 animate-pulse" />
            <p className="text-gray-600">Loading signup form...</p>
          </div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
