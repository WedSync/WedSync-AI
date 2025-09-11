'use client';

import { useState, useEffect } from 'react';
import { signIn, getProviders } from 'next-auth/react';
import {
  ChevronRight,
  Check,
  Sparkles,
  Shield,
  Clock,
  Users,
  Calendar,
  CheckCircle,
  Globe,
  Smartphone,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SupplierPreview from './SupplierPreview';

interface InvitationData {
  code: string;
  supplier_name: string;
  supplier_type: string;
  supplier_logo_url?: string;
  supplier_brand_color: string;
  couple_names?: string;
  wedding_date?: string;
  personalized_message?: string;
}

interface SupplierSettings {
  welcome_message_template: string;
  value_proposition: string;
  call_to_action: string;
  featured_benefits: string[];
  google_analytics_id?: string;
  facebook_pixel_id?: string;
}

interface InvitationLandingProps {
  invitation: InvitationData;
  supplierSettings?: SupplierSettings;
  visitId?: string;
  tracking?: {
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  };
  className?: string;
}

export default function InvitationLanding({
  invitation,
  supplierSettings,
  visitId,
  tracking,
  className,
}: InvitationLandingProps) {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [signupMethod, setSignupMethod] = useState<'oauth' | 'email' | null>(
    null,
  );
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [providers, setProviders] = useState<any>(null);
  const [hasTrackedConversion, setHasTrackedConversion] = useState(false);

  // Initialize auth providers
  useEffect(() => {
    getProviders().then(setProviders);
  }, []);

  // Default values
  const welcomeMessage =
    supplierSettings?.welcome_message_template ||
    `Welcome! Your ${invitation.supplier_type} has set up your wedding dashboard.`;

  const valueProposition =
    supplierSettings?.value_proposition ||
    'Never fill the same form twice. Everything in one place.';

  const callToAction =
    supplierSettings?.call_to_action || 'Start Planning Your Wedding';

  const featuredBenefits = supplierSettings?.featured_benefits || [
    'Guest Management',
    'Timeline Builder',
    'Vendor Coordination',
    'Budget Tracking',
  ];

  // Track conversion when user starts signup process
  const trackConversion = async (oauthProvider?: string) => {
    if (hasTrackedConversion) return;

    try {
      const response = await fetch(`/api/invite/${invitation.code}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'conversion',
          visit_id: visitId,
          email: email || 'pending',
          full_name: fullName || undefined,
          oauth_provider: oauthProvider || signupMethod,
          time_to_convert: visitId ? undefined : 0, // Will be calculated server-side
          attributed_utm_source: tracking?.utm_source,
          attributed_utm_medium: tracking?.utm_medium,
          attributed_utm_campaign: tracking?.utm_campaign,
        }),
      });

      if (response.ok) {
        setHasTrackedConversion(true);
      }
    } catch (error) {
      console.error('Failed to track conversion:', error);
    }
  };

  // Handle OAuth signup
  const handleOAuthSignup = async (provider: string) => {
    setIsSigningUp(true);
    await trackConversion(provider);

    try {
      await signIn(provider, {
        callbackUrl: `/dashboard?welcome=true&source=invitation&code=${invitation.code}`,
      });
    } catch (error) {
      console.error('OAuth signup failed:', error);
      setIsSigningUp(false);
    }
  };

  // Handle email signup
  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName) return;

    setIsSigningUp(true);
    await trackConversion('email');

    try {
      // Redirect to email signup flow with pre-filled data
      const params = new URLSearchParams({
        email,
        name: fullName,
        source: 'invitation',
        code: invitation.code,
        welcome: 'true',
      });

      window.location.href = `/signup?${params.toString()}`;
    } catch (error) {
      console.error('Email signup failed:', error);
      setIsSigningUp(false);
    }
  };

  return (
    <div className={cn('max-w-4xl mx-auto px-4 py-4 md:py-8', className)}>
      {/* Header with supplier branding - Mobile optimized */}
      <div className="text-center mb-6 md:mb-8">
        <div className="mb-4 md:mb-6">
          <SupplierPreview
            supplierName={invitation.supplier_name}
            supplierType={invitation.supplier_type}
            supplierLogoUrl={invitation.supplier_logo_url}
            brandColor={invitation.supplier_brand_color}
            coupleNames={invitation.couple_names}
            weddingDate={invitation.wedding_date}
            personalizedMessage={invitation.personalized_message}
          />
        </div>

        <div className="space-y-3 md:space-y-4">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 leading-tight px-2">
            {welcomeMessage}
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-2">
            {valueProposition}
          </p>
        </div>
      </div>

      {/* Value proposition cards - Mobile optimized grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-12">
        {featuredBenefits.map((benefit, index) => {
          const icons = {
            'Guest Management': Users,
            'Timeline Builder': Calendar,
            'Vendor Coordination': Globe,
            'Budget Tracking': CheckCircle,
          };

          const IconComponent =
            icons[benefit as keyof typeof icons] || CheckCircle;

          return (
            <Card
              key={index}
              className="p-4 md:p-6 text-center hover:shadow-lg transition-shadow"
            >
              <div
                className="w-10 h-10 md:w-12 md:h-12 rounded-lg mx-auto mb-3 md:mb-4 flex items-center justify-center"
                style={{
                  backgroundColor: `${invitation.supplier_brand_color}20`,
                }}
              >
                <IconComponent
                  className="w-5 h-5 md:w-6 md:h-6"
                  style={{ color: invitation.supplier_brand_color }}
                />
              </div>
              <h3 className="font-semibold text-gray-900 text-sm md:text-base">
                {benefit}
              </h3>
            </Card>
          );
        })}
      </div>

      {/* Signup section - Mobile optimized */}
      <div className="max-w-md mx-auto px-2">
        <Card className="p-6 md:p-8">
          <div className="text-center mb-6 md:mb-8">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
              {callToAction}
            </h2>
            <p className="text-gray-600 text-sm md:text-base">
              Get started in 30 seconds
            </p>
          </div>

          {!signupMethod && (
            <div className="space-y-4">
              {/* OAuth Providers */}
              {providers?.google && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleOAuthSignup('google')}
                  disabled={isSigningUp}
                >
                  <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Continue with Google
                </Button>
              )}

              {providers?.apple && (
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full"
                  onClick={() => handleOAuthSignup('apple')}
                  disabled={isSigningUp}
                >
                  <svg
                    className="w-5 h-5 mr-3"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.49-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                  </svg>
                  Continue with Apple
                </Button>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">or</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="lg"
                className="w-full"
                onClick={() => setSignupMethod('email')}
              >
                <Mail className="w-5 h-5 mr-3" />
                Continue with Email
              </Button>
            </div>
          )}

          {signupMethod === 'email' && (
            <form onSubmit={handleEmailSignup} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  disabled={isSigningUp}
                />
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isSigningUp}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={isSigningUp || !email || !fullName}
                style={{ backgroundColor: invitation.supplier_brand_color }}
              >
                {isSigningUp ? 'Creating Account...' : 'Create Account'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setSignupMethod(null)}
                disabled={isSigningUp}
              >
                Back to other options
              </Button>
            </form>
          )}

          {/* Trust indicators - Mobile responsive */}
          <div className="mt-6 md:mt-8 pt-4 md:pt-6 border-t border-gray-100">
            <div className="flex items-center justify-center space-x-4 md:space-x-6 text-xs md:text-sm text-gray-500">
              <div className="flex items-center">
                <Shield className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                <span>Secure</span>
              </div>
              <div className="flex items-center">
                <Clock className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                <span className="hidden sm:inline">30-second setup</span>
                <span className="sm:hidden">Quick setup</span>
              </div>
              <div className="flex items-center">
                <Sparkles className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                <span>Free to start</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Social proof */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            Trusted by over 50,000 couples worldwide
          </p>
          <div className="flex justify-center mt-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                className="w-4 h-4 text-yellow-400 fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
              </svg>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
