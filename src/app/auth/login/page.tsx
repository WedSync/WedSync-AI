'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { HeartIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useWeddingAnalytics } from '@/hooks/useWeddingAnalytics';
import { useWeddingErrorMonitoring } from '@/hooks/useWeddingErrorMonitoring';

export default function AuthLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const { trackConversionStep, identifyVendor, trackError } = useWeddingAnalytics();
  const { reportAuthError, setVendorContext, addWeddingBreadcrumb } = useWeddingErrorMonitoring();

  const redirect = searchParams.get('redirect') || 'dashboard';

  // Track login page view
  useEffect(() => {
    trackConversionStep('landing', {
      page: 'login',
      redirect_param: redirect,
      is_supplier_portal: redirect === 'supplier-portal'
    });
    
    // Add breadcrumb for error tracking
    addWeddingBreadcrumb('Login page loaded', {
      redirect_param: redirect,
      is_wedding_day: new Date().getDay() === 6
    });
  }, [redirect, trackConversionStep, addWeddingBreadcrumb]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Get user profile to determine role and redirect appropriately
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, user_type')
          .eq('id', data.user.id)
          .single();

        // Track successful login
        trackConversionStep('signup', {
          user_id: data.user.id,
          user_role: profile?.role || profile?.user_type,
          login_method: 'email_password',
          redirect_intended: redirect
        });

        // Identify user for future tracking
        if (profile && (profile.role === 'vendor' || profile.role === 'supplier')) {
          // Get additional supplier info for analytics
          const { data: supplierProfile } = await supabase
            .from('suppliers')
            .select('business_name, business_type, subscription_tier')
            .eq('user_id', data.user.id)
            .single();

          if (supplierProfile) {
            const vendorData = {
              email: data.user.email!,
              vendorType: (supplierProfile.business_type as any) || 'OTHER',
              businessName: supplierProfile.business_name || 'Unknown Business',
              subscription_tier: supplierProfile.subscription_tier || 'free'
            };
            
            // Track in analytics
            identifyVendor(data.user.id, vendorData);
            
            // Set error monitoring context
            setVendorContext(data.user.id, vendorData.vendorType, {
              businessName: vendorData.businessName,
              subscriptionTier: vendorData.subscription_tier
            });
            
            // Add breadcrumb for successful login
            addWeddingBreadcrumb('Vendor login successful', {
              vendor_type: vendorData.vendorType,
              subscription_tier: vendorData.subscription_tier
            });
          }
        }

        // Determine redirect based on user role and original redirect parameter
        let redirectPath = '/dashboard'; // Default fallback

        if (profile) {
          const userRole = profile.role || profile.user_type;
          
          switch (userRole) {
            case 'admin':
            case 'super_admin':
              redirectPath = '/admin/dashboard';
              break;
            case 'vendor':
            case 'supplier':
              // For suppliers, check if they have completed setup
              const { data: supplierProfile } = await supabase
                .from('suppliers')
                .select('onboarding_completed')
                .eq('user_id', data.user.id)
                .single();
              
              // Since there's no supplier-specific onboarding, redirect to dashboard
              // The supplier can complete their profile from the dashboard
              redirectPath = redirect === 'supplier-portal' ? '/supplier-portal' : '/dashboard';
              break;
            case 'couple':
            case 'client':
              // Check if onboarding is complete
              const { data: coupleProfile } = await supabase
                .from('couples')
                .select('onboarding_completed')
                .eq('user_id', data.user.id)
                .single();
              
              if (!coupleProfile?.onboarding_completed) {
                redirectPath = '/onboarding';
              } else {
                redirectPath = '/client/dashboard';
              }
              break;
            default:
              // If no specific role, redirect to general dashboard
              redirectPath = '/dashboard';
          }
        } else {
          // If no profile found, might be a new user needing onboarding
          redirectPath = '/onboarding';
        }

        router.push(redirectPath);
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Invalid email or password';
      setError(errorMessage);
      
      // Track login error in analytics
      trackError('login_failed', errorMessage, {
        email_domain: email.split('@')[1],
        redirect_param: redirect,
        error_code: error.status || 'unknown'
      });
      
      // Report to Bugsnag for monitoring
      reportAuthError(error, {
        loginAttempt: email.split('@')[1], // Domain only for privacy
        redirectPath: redirect,
        vendorType: redirect === 'supplier-portal' ? 'supplier' : 'unknown'
      });
      
      // Add breadcrumb
      addWeddingBreadcrumb('Login failed', {
        error_type: error.name || 'Unknown',
        email_domain: email.split('@')[1]
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <HeartIcon className="h-12 w-12 text-pink-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-600 mt-2">
            {redirect === 'supplier-portal' 
              ? 'Sign in to your WedSync supplier account'
              : 'Sign in to your account'
            }
          </p>
        </div>

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  required
                  className="mt-1"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>

              <div className="text-center space-y-2">
                <Link
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Forgot your password?
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-gray-600">
          Don't have an account?{' '}
          <Link
            href="/signup"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
