/**
 * Global Error Handler with Sentry Integration
 * Catches React rendering errors and reports to Sentry
 */

'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report error to Sentry
    Sentry.captureException(error, {
      tags: {
        component: 'global_error_boundary',
        business_type: 'wedding_services',
      },
      extra: {
        digest: error.digest,
        pathname: window.location.pathname,
        timestamp: new Date().toISOString(),
        wedding_day: new Date().getDay() === 6 ? 'true' : 'false',
      },
    });
  }, [error]);

  return (
    <html>
      <body>
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                    />
                  </svg>
                </div>

                <h2 className="mt-4 text-lg font-semibold text-gray-900">
                  Something went wrong!
                </h2>

                <p className="mt-2 text-sm text-gray-600">
                  {new Date().getDay() === 6
                    ? "We know it's a wedding day! Our team has been automatically notified and is working on a fix."
                    : "An unexpected error occurred. Our team has been notified and we're working on a solution."}
                </p>

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={reset}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Try Again
                  </Button>

                  <Button
                    onClick={() => (window.location.href = '/dashboard')}
                    variant="outline"
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>

                {process.env.NODE_ENV === 'development' && (
                  <details className="mt-4 text-left">
                    <summary className="text-sm text-gray-500 cursor-pointer">
                      Error Details (Development Only)
                    </summary>
                    <pre className="mt-2 text-xs text-red-600 whitespace-pre-wrap break-all">
                      {error.message}
                      {error.stack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
