'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';

export default function WedMeSignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    partnerFirstName: '',
    partnerLastName: '',
    weddingDate: '',
    agreeToTerms: false,
    agreeToPrivacy: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!formData.agreeToTerms || !formData.agreeToPrivacy) {
      setError('Please agree to the terms and privacy policy');
      return;
    }

    setIsLoading(true);

    try {
      // Sign up with Supabase
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            partner_first_name: formData.partnerFirstName,
            partner_last_name: formData.partnerLastName,
            user_type: 'couple',
            role: 'couple'
          }
        }
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        // Create couple profile
        const { error: profileError } = await supabase
          .from('couples')
          .insert({
            user_id: data.user.id,
            first_name: formData.firstName,
            last_name: formData.lastName,
            partner_first_name: formData.partnerFirstName,
            partner_last_name: formData.partnerLastName,
            email: formData.email,
            wedding_date: formData.weddingDate || null,
            onboarding_completed: false
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Redirect to couple dashboard
        router.push('/client/dashboard');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-rose-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">♥</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">WedMe.app</h1>
          </div>
          <h2 className="text-xl text-gray-600">Start Planning Your Wedding</h2>
          <p className="text-sm text-gray-500 mt-2">
            Create your account and begin your wedding planning journey
          </p>
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Your First Name *</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Your Last Name *</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  required
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="partnerFirstName">Partner's First Name</Label>
                <Input
                  id="partnerFirstName"
                  name="partnerFirstName"
                  value={formData.partnerFirstName}
                  onChange={handleInputChange}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="partnerLastName">Partner's Last Name</Label>
                <Input
                  id="partnerLastName"
                  name="partnerLastName"
                  value={formData.partnerLastName}
                  onChange={handleInputChange}
                  className="mt-1"
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
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="weddingDate">Wedding Date (Optional)</Label>
              <Input
                id="weddingDate"
                name="weddingDate"
                type="date"
                value={formData.weddingDate}
                onChange={handleInputChange}
                className="mt-1"
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
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                required
                className="mt-1"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) => handleCheckboxChange('agreeToTerms', checked as boolean)}
                />
                <Label htmlFor="agreeToTerms" className="text-sm">
                  I agree to the{' '}
                  <Link href="/terms" className="text-pink-600 hover:underline">
                    Terms of Service
                  </Link>
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="agreeToPrivacy"
                  checked={formData.agreeToPrivacy}
                  onCheckedChange={(checked) => handleCheckboxChange('agreeToPrivacy', checked as boolean)}
                />
                <Label htmlFor="agreeToPrivacy" className="text-sm">
                  I agree to the{' '}
                  <Link href="/privacy" className="text-pink-600 hover:underline">
                    Privacy Policy
                  </Link>
                </Label>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-pink-500 hover:bg-pink-600"
            >
              {isLoading ? 'Creating Account...' : 'Start Planning Your Wedding'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 text-center">
            <div className="text-sm text-gray-600">
              Already have an account?{' '}
              <Link
                href="/wedme/login"
                className="text-pink-600 hover:underline font-medium"
              >
                Sign in here
              </Link>
            </div>
          </div>
        </div>

        {/* Platform Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Are you a wedding supplier?</p>
          <Link
            href="/wedsync/signup"
            className="text-pink-600 hover:underline font-medium"
          >
            Join WedSync →
          </Link>
        </div>
      </div>
    </div>
  );
}
