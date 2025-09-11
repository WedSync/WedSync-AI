'use client';

import React, { ReactNode } from 'react';
import { Shield, AlertTriangle } from 'lucide-react';
import { useAdminSecurity } from '../../../contexts/AdminSecurityProvider';

interface AdminAuthGuardProps {
  children: ReactNode;
  requiredLevel?: 'low' | 'medium' | 'high';
}

export default function AdminAuthGuard({
  children,
  requiredLevel = 'medium',
}: AdminAuthGuardProps) {
  const { isSecureSession, securityLevel } = useAdminSecurity();

  // Security level hierarchy
  const securityLevels = { low: 1, medium: 2, high: 3 };
  const hasRequiredLevel =
    securityLevels[securityLevel] >= securityLevels[requiredLevel];

  // If session is not secure or doesn't meet required level
  if (!isSecureSession || !hasRequiredLevel) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>

            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Access Denied
            </h2>

            <p className="text-gray-600 mb-6">
              {!isSecureSession
                ? 'Your session is not secure enough to access this admin area.'
                : `This area requires ${requiredLevel} security clearance. Your current level: ${securityLevel}.`}
            </p>

            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Refresh Security Token
              </button>

              <button
                onClick={() => window.history.back()}
                className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render protected content with security indicator
  return (
    <div className="relative">
      {/* Security Level Indicator */}
      <div className="fixed top-4 right-4 z-50">
        <div
          className={`
          flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium
          ${
            securityLevel === 'high'
              ? 'bg-green-100 text-green-800'
              : securityLevel === 'medium'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800'
          }
        `}
        >
          <Shield size={12} />
          <span className="capitalize">{securityLevel} Security</span>
        </div>
      </div>

      {children}
    </div>
  );
}
