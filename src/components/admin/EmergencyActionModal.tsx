'use client';

import { useState } from 'react';

interface EmergencyAction {
  id: string;
  title: string;
  description: string;
  type: 'emergency' | 'warning' | 'info';
  requiresMFA?: boolean;
  confirmationMessage?: string;
}

interface EmergencyActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: EmergencyAction;
  onConfirm: (actionId: string, data?: any) => Promise<void>;
}

export function EmergencyActionModal({
  isOpen,
  onClose,
  action,
  onConfirm,
}: EmergencyActionModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [additionalData, setAdditionalData] = useState<Record<string, string>>(
    {},
  );
  const [step, setStep] = useState<'confirm' | 'mfa' | 'data'>('confirm');

  if (!isOpen) return null;

  const handleInitialConfirm = () => {
    if (action.requiresMFA) {
      setStep('mfa');
    } else if (needsAdditionalData()) {
      setStep('data');
    } else {
      handleFinalConfirm();
    }
  };

  const handleMfaSubmit = () => {
    // TODO: Verify MFA code with backend
    if (needsAdditionalData()) {
      setStep('data');
    } else {
      handleFinalConfirm();
    }
  };

  const handleFinalConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(action.id, {
        mfaCode: action.requiresMFA ? mfaCode : undefined,
        ...additionalData,
      });
    } finally {
      setIsConfirming(false);
      resetModal();
    }
  };

  const resetModal = () => {
    setStep('confirm');
    setMfaCode('');
    setAdditionalData({});
    setIsConfirming(false);
  };

  const needsAdditionalData = () => {
    return (
      action.id === 'emergency-user-suspend' || action.id === 'maintenance-mode'
    );
  };

  const getModalColorClass = () => {
    switch (action.type) {
      case 'emergency':
        return 'border-error-200';
      case 'warning':
        return 'border-warning-200';
      case 'info':
        return 'border-blue-200';
      default:
        return 'border-gray-200';
    }
  };

  const getIconColorClass = () => {
    switch (action.type) {
      case 'emergency':
        return 'text-error-600';
      case 'warning':
        return 'text-warning-600';
      case 'info':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const renderConfirmationStep = () => (
    <div className="p-6">
      <div className="flex items-center space-x-3">
        <div className={`flex-shrink-0 ${getIconColorClass()}`}>
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {action.title}
          </h3>
          <p className="text-sm text-gray-500 mt-1">{action.description}</p>
        </div>
      </div>

      {action.confirmationMessage && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            action.type === 'emergency'
              ? 'bg-error-50 border border-error-200'
              : action.type === 'warning'
                ? 'bg-warning-50 border border-warning-200'
                : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <p className="text-sm text-gray-700">{action.confirmationMessage}</p>
        </div>
      )}

      {action.requiresMFA && (
        <div className="mt-4 flex items-center space-x-2 p-3 bg-primary-50 border border-primary-200 rounded-lg">
          <svg
            className="w-5 h-5 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <span className="text-sm font-medium text-primary-800">
            Multi-factor authentication required
          </span>
        </div>
      )}

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleInitialConfirm}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            action.type === 'emergency'
              ? 'bg-error-600 hover:bg-error-700 focus:ring-error-500'
              : action.type === 'warning'
                ? 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          Confirm Action
        </button>
      </div>
    </div>
  );

  const renderMfaStep = () => (
    <div className="p-6">
      <div className="text-center">
        <svg
          className="w-12 h-12 mx-auto text-primary-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h3 className="text-lg font-semibold text-gray-900 mt-4">
          Multi-Factor Authentication
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          Enter the verification code from your authenticator app
        </p>
      </div>

      <div className="mt-6">
        <label
          htmlFor="mfa-code"
          className="block text-sm font-medium text-gray-700"
        >
          Verification Code
        </label>
        <input
          type="text"
          id="mfa-code"
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value)}
          placeholder="000000"
          maxLength={6}
          className="mt-1 block w-full px-3 py-2 text-center text-lg font-mono border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          autoComplete="one-time-code"
        />
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={() => setStep('confirm')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleMfaSubmit}
          disabled={mfaCode.length !== 6}
          className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Verify
        </button>
      </div>
    </div>
  );

  const renderDataStep = () => (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900">
        Additional Information
      </h3>
      <p className="text-sm text-gray-500 mt-1">
        Please provide the required details for this action
      </p>

      <div className="mt-6 space-y-4">
        {action.id === 'emergency-user-suspend' && (
          <>
            <div>
              <label
                htmlFor="user-email"
                className="block text-sm font-medium text-gray-700"
              >
                User Email or ID
              </label>
              <input
                type="text"
                id="user-email"
                value={additionalData.userIdentifier || ''}
                onChange={(e) =>
                  setAdditionalData((prev) => ({
                    ...prev,
                    userIdentifier: e.target.value,
                  }))
                }
                placeholder="user@example.com or user ID"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label
                htmlFor="suspension-reason"
                className="block text-sm font-medium text-gray-700"
              >
                Reason for Suspension
              </label>
              <textarea
                id="suspension-reason"
                value={additionalData.reason || ''}
                onChange={(e) =>
                  setAdditionalData((prev) => ({
                    ...prev,
                    reason: e.target.value,
                  }))
                }
                rows={3}
                placeholder="Describe the reason for this emergency suspension..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </>
        )}

        {action.id === 'maintenance-mode' && (
          <div>
            <label
              htmlFor="maintenance-message"
              className="block text-sm font-medium text-gray-700"
            >
              Maintenance Message
            </label>
            <textarea
              id="maintenance-message"
              value={additionalData.message || ''}
              onChange={(e) =>
                setAdditionalData((prev) => ({
                  ...prev,
                  message: e.target.value,
                }))
              }
              rows={3}
              placeholder="We're performing scheduled maintenance. We'll be back shortly!"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          type="button"
          onClick={() => setStep(action.requiresMFA ? 'mfa' : 'confirm')}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleFinalConfirm}
          disabled={isConfirming}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
            action.type === 'emergency'
              ? 'bg-error-600 hover:bg-error-700 focus:ring-error-500'
              : action.type === 'warning'
                ? 'bg-warning-600 hover:bg-warning-700 focus:ring-warning-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
          }`}
        >
          {isConfirming ? 'Executing...' : 'Execute Action'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div
          className={`inline-block align-bottom bg-white rounded-2xl shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border ${getModalColorClass()}`}
        >
          {step === 'confirm' && renderConfirmationStep()}
          {step === 'mfa' && renderMfaStep()}
          {step === 'data' && renderDataStep()}
        </div>
      </div>
    </div>
  );
}
