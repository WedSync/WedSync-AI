'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';
import {
  passwordResetRequestSchema,
  type PasswordResetRequestInput,
} from '@/lib/validations/auth';
import { HeartIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function ForgotPasswordForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(passwordResetRequestSchema),
  });

  const onSubmit = async (data: PasswordResetRequestInput) => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setIsSuccess(true);
    } catch (error: any) {
      setError('email', {
        type: 'manual',
        message: error.message || 'Failed to send reset email',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <CheckCircleIcon className="h-12 w-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">
              Check your email
            </h1>
            <p className="text-gray-600 mt-2">
              We've sent a password reset link to your email
            </p>
          </div>

          <Card>
            <CardContent>
              <div className="space-y-6 text-center">
                <div>
                  <p className="text-gray-700 mb-4">
                    If an account with that email exists, you'll receive a
                    password reset link within a few minutes.
                  </p>
                  <p className="text-sm text-gray-500">
                    Didn't receive an email? Check your spam folder or try
                    again.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => setIsSuccess(false)}
                    variant="outline"
                    className="w-full"
                  >
                    Try another email
                  </Button>

                  <Link href="/login" className="block">
                    <Button variant="ghost" className="w-full">
                      Back to sign in
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <HeartIcon className="h-12 w-12 text-pink-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Forgot password?</h1>
          <p className="text-gray-600 mt-2">
            Enter your email to reset your password
          </p>
        </div>

        <Card>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <Label htmlFor="email">Email address</Label>
                <Input
                  {...register('email')}
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  disabled={isLoading}
                  className="mt-1"
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
                {errors.email && (
                  <p
                    id="email-error"
                    className="mt-2 text-sm text-red-600"
                    role="alert"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Sending reset link...' : 'Send reset link'}
              </Button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Remember your password? Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center mt-6 text-gray-600">
          Need help?{' '}
          <Link
            href="/support"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
