'use client';

import React, { useState, useEffect } from 'react';
import { APIKeySetupWizardProps } from '@/types/ai-features';
import {
  X,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Loader2,
  Shield,
  DollarSign,
  Clock,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

/**
 * API Key Setup Wizard Component
 * Step-by-step guided setup for client API configuration with validation and testing
 */
export function APIKeySetupWizard({
  provider,
  existingConfig,
  onSave,
  onTest,
  onCancel,
  isVisible,
}: APIKeySetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState(existingConfig?.encryptedKey || '');
  const [keyName, setKeyName] = useState(existingConfig?.keyName || '');
  const [showKey, setShowKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(
    null,
  );
  const [testError, setTestError] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isVisible) {
      // Reset form when modal closes
      setCurrentStep(1);
      setApiKey(existingConfig?.encryptedKey || '');
      setKeyName(existingConfig?.keyName || '');
      setShowKey(false);
      setTestResult(null);
      setTestError('');
      setAgreedToTerms(false);
    }
  }, [isVisible, existingConfig]);

  const steps = [
    {
      id: 1,
      name: 'Provider Info',
      description: 'Learn about the AI provider',
    },
    {
      id: 2,
      name: 'API Key Setup',
      description: 'Enter and configure your API key',
    },
    { id: 3, name: 'Test & Verify', description: 'Test the connection' },
    { id: 4, name: 'Complete', description: 'Finalize setup' },
  ];

  const handleTestApiKey = async () => {
    if (!apiKey.trim()) return;

    setIsTestingKey(true);
    setTestResult(null);
    setTestError('');

    try {
      const isValid = await onTest(apiKey);
      setTestResult(isValid ? 'success' : 'error');
      if (!isValid) {
        setTestError(
          'API key validation failed. Please check your key and try again.',
        );
      }
    } catch (error) {
      setTestResult('error');
      setTestError(
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setIsTestingKey(false);
    }
  };

  const handleSubmit = async () => {
    if (!apiKey || !keyName || !agreedToTerms) return;

    setIsSubmitting(true);
    try {
      await onSave({
        providerId: provider.id,
        keyName,
        isConfigured: testResult === 'success',
        lastTested: testResult === 'success' ? new Date() : null,
        testStatus: testResult === 'success' ? 'success' : 'error',
        errorMessage: testResult === 'error' ? testError : undefined,
        encryptedKey: apiKey,
      });
    } catch (error) {
      console.error('Failed to save API key:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return apiKey.trim() && keyName.trim();
      case 3:
        return testResult === 'success';
      case 4:
        return agreedToTerms;
      default:
        return false;
    }
  };

  const getProviderInstructions = () => {
    switch (provider.id) {
      case 'openai-vision':
      case 'openai-gpt':
        return {
          signupUrl: 'https://platform.openai.com/signup',
          apiKeyUrl: 'https://platform.openai.com/api-keys',
          steps: [
            'Sign up or log in to OpenAI Platform',
            'Navigate to API Keys section',
            'Click "Create new secret key"',
            'Copy the generated key (it will only be shown once)',
            'Paste it in the field below',
          ],
          securityNotes: [
            'Keep your API key secure and never share it',
            'Set usage limits in OpenAI dashboard to control costs',
            'Monitor usage regularly through OpenAI dashboard',
          ],
        };
      default:
        return {
          signupUrl: '#',
          apiKeyUrl: '#',
          steps: [
            "Visit the provider's website",
            'Create an account or log in',
            'Generate an API key',
            'Copy and paste it below',
          ],
          securityNotes: [
            'Keep your API key secure',
            'Monitor usage and costs',
            'Set appropriate usage limits',
          ],
        };
    }
  };

  const instructions = getProviderInstructions();

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-900 bg-opacity-50 backdrop-blur-sm">
        <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Setup {provider.name}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure your API key for unlimited usage
              </p>
            </div>
            <button
              onClick={onCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <React.Fragment key={step.id}>
                  <div className="flex items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        currentStep > step.id
                          ? 'bg-green-100 text-green-600'
                          : currentStep === step.id
                            ? 'bg-primary-100 text-primary-600'
                            : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {currentStep > step.id ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        step.id
                      )}
                    </div>
                    <div className="ml-2 hidden md:block">
                      <div
                        className={`text-sm font-medium ${
                          currentStep >= step.id
                            ? 'text-gray-900'
                            : 'text-gray-400'
                        }`}
                      >
                        {step.name}
                      </div>
                    </div>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-px mx-4 ${
                        currentStep > step.id ? 'bg-green-200' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Step 1: Provider Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    About {provider.name}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center text-blue-600 mb-2">
                        <DollarSign className="w-5 h-5 mr-2" />
                        <span className="font-medium">Est. Cost</span>
                      </div>
                      <div className="text-2xl font-bold text-blue-800">
                        £{provider.estimatedCostPerMonth}
                      </div>
                      <div className="text-sm text-blue-600">per month</div>
                    </div>

                    <div className="bg-green-50 rounded-lg p-4">
                      <div className="flex items-center text-green-600 mb-2">
                        <Clock className="w-5 h-5 mr-2" />
                        <span className="font-medium">Setup</span>
                      </div>
                      <div className="text-2xl font-bold text-green-800 capitalize">
                        {provider.setupComplexity}
                      </div>
                      <div className="text-sm text-green-600">complexity</div>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-4">
                      <div className="flex items-center text-purple-600 mb-2">
                        <Shield className="w-5 h-5 mr-2" />
                        <span className="font-medium">Features</span>
                      </div>
                      <div className="text-2xl font-bold text-purple-800">
                        {provider.supportedFeatures.length}
                      </div>
                      <div className="text-sm text-purple-600">supported</div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <h4 className="font-medium text-gray-900 mb-2">
                      Supported Features
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {provider.supportedFeatures.map((feature) => (
                        <span
                          key={feature}
                          className="px-2 py-1 bg-white border border-gray-200 rounded text-sm text-gray-700"
                        >
                          {feature
                            .replace('-', ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">
                      Getting Started
                    </h4>
                    <ol className="space-y-2">
                      {instructions.steps.map((step, index) => (
                        <li key={index} className="flex items-start">
                          <span className="flex-shrink-0 w-6 h-6 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="text-gray-700">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <a
                      href={instructions.signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                    >
                      Open {provider.name}
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                    <a
                      href={instructions.apiKeyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      API Keys Page
                      <ExternalLink className="w-4 h-4 ml-2" />
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: API Key Setup */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Configure API Key
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="keyName"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Configuration Name
                      </label>
                      <input
                        type="text"
                        id="keyName"
                        value={keyName}
                        onChange={(e) => setKeyName(e.target.value)}
                        placeholder="e.g., Production OpenAI Key"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Give your API key configuration a memorable name
                      </p>
                    </div>

                    <div>
                      <label
                        htmlFor="apiKey"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        API Key
                      </label>
                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          id="apiKey"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Enter your API key..."
                          className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showKey ? (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-gray-400" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Your API key will be encrypted and stored securely
                      </p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                    <div className="flex">
                      <Shield className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-amber-800">
                          Security Best Practices
                        </h4>
                        <ul className="mt-2 text-sm text-amber-700 space-y-1">
                          {instructions.securityNotes.map((note, index) => (
                            <li key={index}>• {note}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Test & Verify */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Test Connection
                  </h3>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-900">
                          {keyName}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {apiKey.substring(0, 8)}...
                          {apiKey.substring(apiKey.length - 4)}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(apiKey);
                        }}
                        className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        title="Copy API key"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={handleTestApiKey}
                      disabled={isTestingKey || !apiKey.trim()}
                      className="w-full flex items-center justify-center px-4 py-3 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isTestingKey ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testing Connection...
                        </>
                      ) : (
                        'Test API Key'
                      )}
                    </button>

                    {testResult === 'success' && (
                      <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-green-800">
                            Connection Successful!
                          </div>
                          <div className="text-sm text-green-700">
                            Your API key is working correctly.
                          </div>
                        </div>
                      </div>
                    )}

                    {testResult === 'error' && (
                      <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-500" />
                        <div className="ml-3">
                          <div className="text-sm font-medium text-red-800">
                            Connection Failed
                          </div>
                          <div className="text-sm text-red-700">
                            {testError}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Complete */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Complete Setup
                  </h3>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
                    <div className="flex items-start">
                      <CheckCircle2 className="w-6 h-6 text-green-500 mt-0.5" />
                      <div className="ml-3">
                        <h4 className="text-green-800 font-medium">
                          Ready to Use!
                        </h4>
                        <p className="text-green-700 text-sm mt-1">
                          Your {provider.name} integration is configured and
                          tested. You can now use unlimited AI features with
                          direct billing to your provider account.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreedToTerms}
                        onChange={(e) => setAgreedToTerms(e.target.checked)}
                        className="mt-1 h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor="terms"
                        className="ml-3 text-sm text-gray-700"
                      >
                        I understand that usage will be billed directly by{' '}
                        {provider.name} and I'm responsible for monitoring my
                        usage and costs through their platform.
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <button
              onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
              disabled={currentStep === 1}
              className="flex items-center px-4 py-2 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </button>

            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>

              {currentStep < 4 ? (
                <button
                  onClick={() =>
                    canProceedToNext() && setCurrentStep(currentStep + 1)
                  }
                  disabled={!canProceedToNext()}
                  className="flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={!agreedToTerms || isSubmitting}
                  className="flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Complete Setup'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
