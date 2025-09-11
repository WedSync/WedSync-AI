'use client';

/**
 * WS-147: MFA Setup Wizard Component
 * Guides users through multi-factor authentication setup
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Smartphone,
  Key,
  CheckCircle,
  Copy,
  AlertTriangle,
} from 'lucide-react';
import { AuthSecurityService } from '@/lib/services/auth-security-service';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface MFASetupWizardProps {
  userEmail: string;
  userId: string;
  onComplete: () => void;
  onCancel: () => void;
}

enum SetupStep {
  INTRODUCTION = 'introduction',
  GENERATE_SECRET = 'generate_secret',
  SCAN_QR = 'scan_qr',
  VERIFY_CODE = 'verify_code',
  BACKUP_CODES = 'backup_codes',
  COMPLETE = 'complete',
}

export function MFASetupWizard({
  userEmail,
  userId,
  onComplete,
  onCancel,
}: MFASetupWizardProps) {
  const [currentStep, setCurrentStep] = useState<SetupStep>(
    SetupStep.INTRODUCTION,
  );
  const [mfaSecret, setMfaSecret] = useState<string>('');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [downloadedBackupCodes, setDownloadedBackupCodes] = useState(false);

  const handleGenerateSecret = () => {
    const setupData = AuthSecurityService.generateMFASetup(userEmail);
    setMfaSecret(setupData.secret);
    setQrCodeUrl(setupData.qrCodeUrl);
    setBackupCodes(setupData.backupCodes);
    setCurrentStep(SetupStep.SCAN_QR);
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);

    try {
      // Verify the TOTP code
      const isValid = AuthSecurityService.verifyTOTPCode(
        mfaSecret,
        verificationCode,
      );

      if (!isValid) {
        toast.error('Invalid code. Please try again.');
        setIsVerifying(false);
        return;
      }

      // Save MFA settings to database
      const { error } = await supabase
        .from('auth_security.user_security_profiles')
        .update({
          mfa_enabled: true,
          mfa_secret: mfaSecret, // In production, this should be encrypted
          mfa_backup_codes: backupCodes, // In production, these should be hashed
          mfa_enforced_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Log security event
      await AuthSecurityService.logSecurityEvent({
        userId,
        eventType: AuthSecurityService.SecurityEventType.MFA_ENABLED,
        severity: 'medium',
        eventData: {
          method: 'totp',
          timestamp: new Date().toISOString(),
        },
      });

      toast.success('Multi-factor authentication enabled successfully!');
      setCurrentStep(SetupStep.BACKUP_CODES);
    } catch (error) {
      console.error('Failed to enable MFA:', error);
      toast.error('Failed to enable MFA. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success('Code copied to clipboard');

    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleDownloadBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    const blob = new Blob(
      [
        `WedSync MFA Backup Codes\n\nSave these codes in a secure location. Each code can only be used once.\n\n${codesText}\n\nGenerated: ${new Date().toLocaleString()}`,
      ],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wedsync-mfa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setDownloadedBackupCodes(true);
    toast.success('Backup codes downloaded');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case SetupStep.INTRODUCTION:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Secure Your Account
              </h2>
              <p className="mt-2 text-gray-600">
                Add an extra layer of security to protect your wedding business
                data
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Enhanced Protection
                  </h3>
                  <p className="text-sm text-gray-600">
                    Protect against unauthorized access even if your password is
                    compromised
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Industry Standard
                  </h3>
                  <p className="text-sm text-gray-600">
                    Uses Time-based One-Time Password (TOTP) compatible with
                    Google Authenticator
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Backup Options
                  </h3>
                  <p className="text-sm text-gray-600">
                    Recovery codes ensure you never lose access to your account
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={onCancel}
                className="px-6 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerateSecret}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Get Started
              </button>
            </div>
          </motion.div>
        );

      case SetupStep.SCAN_QR:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Smartphone className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Scan QR Code</h2>
              <p className="mt-2 text-gray-600">
                Use your authenticator app to scan this code
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <img
                src={qrCodeUrl}
                alt="MFA QR Code"
                className="mx-auto"
                data-testid="mfa-qr-code"
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Can't scan? Enter manually:
              </p>
              <div className="flex items-center space-x-2">
                <code className="flex-1 p-2 bg-gray-50 rounded text-xs font-mono break-all">
                  {mfaSecret}
                </code>
                <button
                  onClick={() => handleCopyCode(mfaSecret)}
                  className="p-2 text-gray-600 hover:text-gray-900"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-900">
                    Recommended Apps:
                  </p>
                  <ul className="mt-1 text-amber-700 space-y-1">
                    <li>• Google Authenticator</li>
                    <li>• Microsoft Authenticator</li>
                    <li>• Authy</li>
                    <li>• 1Password</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(SetupStep.INTRODUCTION)}
                className="px-6 py-2 text-gray-600 hover:text-gray-900"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(SetupStep.VERIFY_CODE)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Next
              </button>
            </div>
          </motion.div>
        );

      case SetupStep.VERIFY_CODE:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Key className="w-16 h-16 mx-auto text-blue-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">Verify Setup</h2>
              <p className="mt-2 text-gray-600">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="max-w-xs mx-auto">
              <input
                type="text"
                value={verificationCode}
                onChange={(e) =>
                  setVerificationCode(
                    e.target.value.replace(/\D/g, '').slice(0, 6),
                  )
                }
                placeholder="000000"
                maxLength={6}
                className="w-full text-center text-2xl font-mono p-4 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                data-testid="totp-code"
              />
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(SetupStep.SCAN_QR)}
                className="px-6 py-2 text-gray-600 hover:text-gray-900"
                disabled={isVerifying}
              >
                Back
              </button>
              <button
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isVerifying}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="verify-mfa"
              >
                {isVerifying ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </motion.div>
        );

      case SetupStep.BACKUP_CODES:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <Shield className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Save Backup Codes
              </h2>
              <p className="mt-2 text-gray-600">
                Store these codes safely - each can be used once if you lose
                access to your app
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2">
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-white px-3 py-2 rounded border"
                  >
                    <code className="text-sm font-mono">{code}</code>
                    <button
                      onClick={() => handleCopyCode(code)}
                      className={`p-1 transition-colors ${
                        copiedCode === code
                          ? 'text-green-600'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {copiedCode === code ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-semibold text-amber-900">Important:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• Save these codes in a secure location</li>
                    <li>• Do not store them with your password</li>
                    <li>• Each code can only be used once</li>
                    <li>• You can generate new codes anytime from settings</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleDownloadBackupCodes}
                className={`px-6 py-2 rounded-lg ${
                  downloadedBackupCodes
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {downloadedBackupCodes ? 'Downloaded ✓' : 'Download Codes'}
              </button>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(SetupStep.VERIFY_CODE)}
                className="px-6 py-2 text-gray-600 hover:text-gray-900"
              >
                Back
              </button>
              <button
                onClick={() => setCurrentStep(SetupStep.COMPLETE)}
                disabled={!downloadedBackupCodes}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Setup
              </button>
            </div>
          </motion.div>
        );

      case SetupStep.COMPLETE:
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <CheckCircle className="w-16 h-16 mx-auto text-green-600 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900">
                Setup Complete!
              </h2>
              <p className="mt-2 text-gray-600">
                Your account is now protected with multi-factor authentication
              </p>
            </div>

            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">
                What's Next?
              </h3>
              <ul className="space-y-2 text-sm text-green-700">
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5" />
                  <span>
                    You'll be asked for a code from your app when logging in
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5" />
                  <span>Trusted devices can skip MFA for 30 days</span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5" />
                  <span>
                    You can manage MFA settings from your security dashboard
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <CheckCircle className="w-4 h-4 mt-0.5" />
                  <span>
                    Use backup codes if you lose access to your authenticator
                    app
                  </span>
                </li>
              </ul>
            </div>

            <div className="flex justify-center">
              <button
                onClick={onComplete}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                data-testid="mfa-complete"
              >
                Go to Dashboard
              </button>
            </div>
          </motion.div>
        );
    }
  };

  const getStepIndicator = () => {
    const steps = [
      { key: SetupStep.INTRODUCTION, label: 'Intro' },
      { key: SetupStep.SCAN_QR, label: 'Setup' },
      { key: SetupStep.VERIFY_CODE, label: 'Verify' },
      { key: SetupStep.BACKUP_CODES, label: 'Backup' },
      { key: SetupStep.COMPLETE, label: 'Done' },
    ];

    const currentIndex = steps.findIndex((s) => s.key === currentStep);

    return (
      <div className="flex items-center justify-center space-x-2 mb-8">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                index <= currentIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index < currentIndex ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                index + 1
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-1 ${
                  index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-xl shadow-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {getStepIndicator()}
        <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>
      </motion.div>
    </div>
  );
}
