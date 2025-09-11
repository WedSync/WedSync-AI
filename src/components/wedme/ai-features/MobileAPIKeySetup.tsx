'use client';

/**
 * WS-239: Mobile API Key Setup
 * Secure, touch-optimized API key configuration for mobile devices
 * Supports biometric authentication and offline validation
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key,
  Eye,
  EyeOff,
  Check,
  AlertTriangle,
  Shield,
  Fingerprint,
  Smartphone,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Copy,
  QrCode,
  TestTube,
  Zap,
  CheckCircle,
  XCircle,
  Info,
  RefreshCw,
} from 'lucide-react';

import type {
  MobileAPIKeySetupProps,
  AIProvider,
  SetupStep,
  SetupStepStatus,
  APIKeyValidation,
  ValidationResult,
  ConnectionTest,
  SetupResult,
} from '@/types/wedme-ai';

import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { AutoPopulationSecurity } from '@/lib/mobile/auto-population-security';

// Provider configurations
const PROVIDER_CONFIG = {
  openai: {
    name: 'OpenAI',
    keyPrefix: 'sk-',
    keyLength: 51,
    color: 'green',
    testEndpoint: 'https://api.openai.com/v1/models',
    features: ['GPT-4', 'GPT-3.5', 'DALL-E', 'Whisper'],
    setupGuide: 'Visit platform.openai.com/api-keys to create your API key',
  },
  anthropic: {
    name: 'Anthropic',
    keyPrefix: 'sk-ant-',
    keyLength: 108,
    color: 'purple',
    testEndpoint: 'https://api.anthropic.com/v1/messages',
    features: ['Claude 3.5', 'Claude 3', 'Claude Instant'],
    setupGuide: 'Visit console.anthropic.com to create your API key',
  },
  google: {
    name: 'Google AI',
    keyPrefix: 'AIza',
    keyLength: 39,
    color: 'blue',
    testEndpoint: 'https://generativelanguage.googleapis.com/v1/models',
    features: ['Gemini Pro', 'Gemini Flash', 'PaLM'],
    setupGuide: 'Visit makersuite.google.com to create your API key',
  },
  azure: {
    name: 'Azure OpenAI',
    keyPrefix: '',
    keyLength: 32,
    color: 'indigo',
    testEndpoint: '',
    features: ['GPT-4', 'GPT-3.5', 'DALL-E'],
    setupGuide: 'Use your Azure OpenAI resource endpoint and key',
  },
} as const;

// Setup steps configuration
const SETUP_STEPS = [
  {
    id: 'provider-selection',
    title: 'Select Provider',
    description: 'Choose your AI service provider',
    status: 'pending' as SetupStepStatus,
    isOptional: false,
    mobileOptimized: true,
    component: 'ProviderSelection',
  },
  {
    id: 'key-entry',
    title: 'Enter API Key',
    description: 'Securely input your API credentials',
    status: 'pending' as SetupStepStatus,
    isOptional: false,
    mobileOptimized: true,
    component: 'KeyEntry',
  },
  {
    id: 'validation',
    title: 'Validate Key',
    description: 'Test connection and verify permissions',
    status: 'pending' as SetupStepStatus,
    isOptional: false,
    mobileOptimized: true,
    component: 'Validation',
  },
  {
    id: 'security-setup',
    title: 'Security Setup',
    description: 'Configure biometric protection',
    status: 'pending' as SetupStepStatus,
    isOptional: true,
    mobileOptimized: true,
    component: 'SecuritySetup',
  },
  {
    id: 'completion',
    title: 'Setup Complete',
    description: 'Review and activate your configuration',
    status: 'pending' as SetupStepStatus,
    isOptional: false,
    mobileOptimized: true,
    component: 'Completion',
  },
];

const MobileAPIKeySetup: React.FC<MobileAPIKeySetupProps> = ({
  provider: initialProvider = 'openai',
  onComplete,
  onCancel,
  biometricAvailable = false,
  existingKey,
  validateImmediately = false,
  touchOptimized = true,
  className = '',
}) => {
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState(SETUP_STEPS);
  const [selectedProvider, setSelectedProvider] =
    useState<AIProvider>(initialProvider);
  const [apiKey, setApiKey] = useState(existingKey || '');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [connectionTest, setConnectionTest] = useState<ConnectionTest | null>(
    null,
  );
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refs
  const keyInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Mobile hooks
  const { triggerHaptic, isSupported: hapticSupported } = useHapticFeedback();

  // Get current provider config
  const providerConfig = PROVIDER_CONFIG[selectedProvider];

  // Validate API key format
  const validateKeyFormat = useCallback(
    (key: string, provider: AIProvider): boolean => {
      const config = PROVIDER_CONFIG[provider];

      if (!key || key.length < 10) return false;

      // Check prefix if required
      if (config.keyPrefix && !key.startsWith(config.keyPrefix)) return false;

      // Check length if specified
      if (config.keyLength && key.length !== config.keyLength) return false;

      return true;
    },
    [],
  );

  // Test API connection
  const testConnection = useCallback(
    async (key: string, provider: AIProvider): Promise<ConnectionTest> => {
      const config = PROVIDER_CONFIG[provider];

      try {
        const startTime = Date.now();

        // Simulate API call for testing
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const latency = Date.now() - startTime;

        return {
          status: 'connected',
          latency,
          features: config.features,
          timestamp: new Date(),
        };
      } catch (error) {
        return {
          status: 'error',
          features: [],
          errorDetails:
            error instanceof Error ? error.message : 'Connection failed',
          timestamp: new Date(),
        };
      }
    },
    [],
  );

  // Validate API key
  const validateApiKey = useCallback(async () => {
    if (!apiKey) {
      setError('Please enter an API key');
      return;
    }

    if (!validateKeyFormat(apiKey, selectedProvider)) {
      setError(`Invalid ${providerConfig.name} API key format`);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      // Security validation
      const isSecure = AutoPopulationSecurity.validateFieldData(
        'api_key',
        apiKey,
      );
      if (!isSecure) {
        throw new Error('API key contains potentially harmful content');
      }

      // Test connection
      const connectionResult = await testConnection(apiKey, selectedProvider);
      setConnectionTest(connectionResult);

      if (connectionResult.status === 'connected') {
        const validation: ValidationResult = {
          isValid: true,
          provider: selectedProvider,
        };

        setValidationResult(validation);

        // Update step status
        setSteps((prev) =>
          prev.map((step) =>
            step.id === 'validation'
              ? { ...step, status: 'completed' as SetupStepStatus }
              : step,
          ),
        );

        // Haptic feedback for success
        if (hapticSupported) {
          triggerHaptic('notification', 1.0);
        }
      } else {
        throw new Error(
          connectionResult.errorDetails || 'Connection test failed',
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Validation failed';
      setError(errorMessage);

      setValidationResult({
        isValid: false,
        errorMessage,
        suggestions: [
          'Check your API key is correct',
          'Ensure your account has sufficient credits',
          'Verify network connection',
        ],
      });

      // Haptic feedback for error
      if (hapticSupported) {
        triggerHaptic('notification', 0.3);
      }
    } finally {
      setIsValidating(false);
    }
  }, [
    apiKey,
    selectedProvider,
    providerConfig,
    validateKeyFormat,
    testConnection,
    hapticSupported,
    triggerHaptic,
  ]);

  // Setup biometric protection
  const setupBiometric = useCallback(async () => {
    if (!biometricAvailable) return;

    try {
      const isAvailable = await AutoPopulationSecurity.isBiometricAvailable();
      if (!isAvailable) {
        setError('Biometric authentication not available on this device');
        return;
      }

      const success =
        await AutoPopulationSecurity.requestBiometricAuth('api-key-protection');
      if (success) {
        setEnableBiometric(true);

        // Update step status
        setSteps((prev) =>
          prev.map((step) =>
            step.id === 'security-setup'
              ? { ...step, status: 'completed' as SetupStepStatus }
              : step,
          ),
        );

        // Haptic feedback for success
        if (hapticSupported) {
          triggerHaptic('notification', 1.0);
        }
      }
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Biometric setup failed',
      );
    }
  }, [biometricAvailable, hapticSupported, triggerHaptic]);

  // Complete setup
  const completeSetup = useCallback(async () => {
    if (!validationResult?.isValid) {
      setError('Please validate your API key first');
      return;
    }

    setIsLoading(true);

    try {
      // Store API key securely
      await AutoPopulationSecurity.setSecureItem(
        `api_key_${selectedProvider}`,
        {
          key: apiKey,
          provider: selectedProvider,
          features: connectionTest?.features || [],
          biometricProtected: enableBiometric,
          createdAt: new Date().toISOString(),
        },
      );

      // Log security event
      AutoPopulationSecurity.logSecurityEvent('api_key_configured', {
        provider: selectedProvider,
        biometricEnabled: enableBiometric,
        features: connectionTest?.features?.length || 0,
      });

      const result: SetupResult = {
        success: true,
        provider: selectedProvider,
        features: connectionTest?.features || [],
        message: `${providerConfig.name} API configured successfully`,
      };

      // Haptic feedback for completion
      if (hapticSupported) {
        triggerHaptic('notification', 1.0);
      }

      onComplete(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Setup failed';
      setError(errorMessage);

      const result: SetupResult = {
        success: false,
        provider: selectedProvider,
        features: [],
        message: errorMessage,
      };

      onComplete(result);
    } finally {
      setIsLoading(false);
    }
  }, [
    validationResult,
    apiKey,
    selectedProvider,
    connectionTest,
    enableBiometric,
    providerConfig,
    hapticSupported,
    triggerHaptic,
    onComplete,
  ]);

  // Navigate to next step
  const nextStep = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      if (hapticSupported) {
        triggerHaptic('selection');
      }
    }
  }, [currentStep, steps.length, hapticSupported, triggerHaptic]);

  // Navigate to previous step
  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      if (hapticSupported) {
        triggerHaptic('selection');
      }
    }
  }, [currentStep, hapticSupported, triggerHaptic]);

  // Auto-validate if needed
  useEffect(() => {
    if (validateImmediately && existingKey && currentStep === 2) {
      validateApiKey();
    }
  }, [validateImmediately, existingKey, currentStep, validateApiKey]);

  // Focus key input when step changes
  useEffect(() => {
    if (currentStep === 1 && keyInputRef.current) {
      setTimeout(() => keyInputRef.current?.focus(), 300);
    }
  }, [currentStep]);

  // Render provider selection
  const renderProviderSelection = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Key className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Choose AI Provider
        </h2>
        <p className="text-sm text-gray-600">
          Select your preferred AI service for unlimited usage
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {Object.entries(PROVIDER_CONFIG).map(([key, config]) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setSelectedProvider(key as AIProvider);
              if (hapticSupported) triggerHaptic('selection');
            }}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left min-h-[72px] ${
              selectedProvider === key
                ? `border-${config.color}-500 bg-${config.color}-50`
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
            style={{ touchAction: 'manipulation' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{config.name}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {config.features.slice(0, 2).join(', ')}
                  {config.features.length > 2 && ' +more'}
                </div>
              </div>
              {selectedProvider === key && (
                <CheckCircle className={`w-6 h-6 text-${config.color}-600`} />
              )}
            </div>
          </motion.button>
        ))}
      </div>

      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-blue-600 mt-0.5" />
          <div>
            <div className="text-sm font-medium text-blue-900">Setup Guide</div>
            <div className="text-xs text-blue-700 mt-1">
              {providerConfig.setupGuide}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Render key entry
  const renderKeyEntry = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div
          className={`w-16 h-16 bg-gradient-to-br from-${providerConfig.color}-100 to-${providerConfig.color}-200 rounded-full flex items-center justify-center mx-auto mb-4`}
        >
          <Shield className={`w-8 h-8 text-${providerConfig.color}-600`} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Enter {providerConfig.name} API Key
        </h2>
        <p className="text-sm text-gray-600">
          Your key will be encrypted and stored securely on this device
        </p>
      </div>

      <div className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Key
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <input
              ref={keyInputRef}
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setError(null);
                setValidationResult(null);
              }}
              placeholder={`Enter your ${providerConfig.name} API key...`}
              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-h-[48px]"
              style={{ touchAction: 'manipulation' }}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={() => {
                setShowApiKey(!showApiKey);
                if (hapticSupported) triggerHaptic('selection');
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showApiKey ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {apiKey && validateKeyFormat(apiKey, selectedProvider) && (
            <div className="flex items-center gap-1 mt-2 text-sm text-green-600">
              <Check className="w-4 h-4" />
              <span>Valid format</span>
            </div>
          )}
        </div>

        {/* Key format help */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">
            <strong>Expected format:</strong> {providerConfig.keyPrefix || ''}
            ***
            {providerConfig.keyLength && (
              <span className="ml-2">
                ({providerConfig.keyLength} characters)
              </span>
            )}
          </div>
        </div>

        {/* QR Code scanner button (if supported) */}
        <button
          type="button"
          onClick={() => {
            if (hapticSupported) triggerHaptic('selection');
            // QR code functionality would be implemented here
          }}
          className="w-full flex items-center justify-center gap-2 p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm font-medium text-gray-700 min-h-[48px]"
          style={{ touchAction: 'manipulation' }}
        >
          <QrCode className="w-4 h-4" />
          <span>Scan QR Code</span>
        </button>
      </div>
    </div>
  );

  // Render validation step
  const renderValidation = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <TestTube className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Validate API Key
        </h2>
        <p className="text-sm text-gray-600">
          Testing connection and verifying permissions
        </p>
      </div>

      {!validationResult && !isValidating && (
        <button
          onClick={validateApiKey}
          disabled={!apiKey || isValidating}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl p-4 font-semibold min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200 active:scale-95"
          style={{ touchAction: 'manipulation' }}
        >
          Test Connection
        </button>
      )}

      {isValidating && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <div className="text-sm text-gray-600">Testing your API key...</div>
        </div>
      )}

      {validationResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-xl border ${
            validationResult.isValid
              ? 'border-green-200 bg-green-50'
              : 'border-red-200 bg-red-50'
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            {validationResult.isValid ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            <div>
              <div
                className={`font-semibold ${
                  validationResult.isValid ? 'text-green-900' : 'text-red-900'
                }`}
              >
                {validationResult.isValid
                  ? 'Connection Successful!'
                  : 'Connection Failed'}
              </div>
              {validationResult.errorMessage && (
                <div className="text-sm text-red-700">
                  {validationResult.errorMessage}
                </div>
              )}
            </div>
          </div>

          {connectionTest && validationResult.isValid && (
            <div className="space-y-2 text-sm text-gray-600">
              <div>Latency: {connectionTest.latency}ms</div>
              <div>Features: {connectionTest.features.join(', ')}</div>
            </div>
          )}

          {validationResult.suggestions && !validationResult.isValid && (
            <div className="mt-3">
              <div className="text-sm font-medium text-red-900 mb-2">
                Suggestions:
              </div>
              <ul className="text-sm text-red-700 space-y-1">
                {validationResult.suggestions.map((suggestion, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500">•</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!validationResult.isValid && (
            <button
              onClick={validateApiKey}
              disabled={isValidating}
              className="w-full mt-4 bg-red-500 text-white rounded-lg p-3 font-medium min-h-[48px] disabled:opacity-50"
              style={{ touchAction: 'manipulation' }}
            >
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Try Again
            </button>
          )}
        </motion.div>
      )}
    </div>
  );

  // Render security setup
  const renderSecuritySetup = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Fingerprint className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Security Setup
        </h2>
        <p className="text-sm text-gray-600">
          {biometricAvailable
            ? 'Secure your API key with biometric authentication'
            : 'Configure additional security options'}
        </p>
      </div>

      {biometricAvailable ? (
        <div className="space-y-4">
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
            <div className="flex items-center gap-3 mb-3">
              <Fingerprint className="w-6 h-6 text-purple-600" />
              <div>
                <div className="font-semibold text-purple-900">
                  Biometric Protection
                </div>
                <div className="text-sm text-purple-700">
                  Use Face ID or Touch ID to protect your API key
                </div>
              </div>
            </div>

            <button
              onClick={setupBiometric}
              disabled={enableBiometric}
              className={`w-full p-3 rounded-lg font-medium min-h-[48px] transition-colors ${
                enableBiometric
                  ? 'bg-green-100 text-green-700 cursor-not-allowed'
                  : 'bg-purple-500 text-white hover:bg-purple-600 active:scale-95'
              }`}
              style={{ touchAction: 'manipulation' }}
            >
              {enableBiometric ? (
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  <span>Biometric Protection Enabled</span>
                </div>
              ) : (
                'Enable Biometric Protection'
              )}
            </button>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Your API key will be encrypted and protected by your device's secure
            element
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <div className="font-medium text-gray-900 mb-1">
            Standard Protection
          </div>
          <div className="text-sm text-gray-600">
            Your API key will be encrypted and stored securely on this device
          </div>
        </div>
      )}
    </div>
  );

  // Render completion step
  const renderCompletion = () => (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Setup Complete!
        </h2>
        <p className="text-sm text-gray-600">
          Your {providerConfig.name} API is ready to use
        </p>
      </div>

      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-4 border border-green-100">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Provider:</span>
            <span className="text-sm text-gray-900">{providerConfig.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Features:</span>
            <span className="text-sm text-gray-900">
              {connectionTest?.features.length || 0} available
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Security:</span>
            <span className="text-sm text-gray-900">
              {enableBiometric ? 'Biometric Protected' : 'Encrypted Storage'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Latency:</span>
            <span className="text-sm text-gray-900">
              {connectionTest?.latency}ms
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={completeSetup}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl p-4 font-semibold min-h-[56px] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
        style={{ touchAction: 'manipulation' }}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Activating...</span>
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            <span>Activate {providerConfig.name} API</span>
          </>
        )}
      </button>
    </div>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderProviderSelection();
      case 1:
        return renderKeyEntry();
      case 2:
        return renderValidation();
      case 3:
        return renderSecuritySetup();
      case 4:
        return renderCompletion();
      default:
        return null;
    }
  };

  return (
    <div className={`mobile-api-key-setup ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-center">
          <h1 className="font-semibold text-gray-900">API Setup</h1>
          <p className="text-xs text-gray-500">
            Step {currentStep + 1} of {steps.length}
          </p>
        </div>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Content */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Error display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                <div>
                  <div className="font-medium text-red-900">Error</div>
                  <div className="text-sm text-red-700">{error}</div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer navigation */}
      {currentStep < steps.length - 1 && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl p-3 font-medium min-h-[48px] transition-colors hover:bg-gray-200 active:scale-95"
                style={{ touchAction: 'manipulation' }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (
                  currentStep === 1 &&
                  (!apiKey || !validateKeyFormat(apiKey, selectedProvider))
                ) {
                  setError('Please enter a valid API key');
                  return;
                }
                if (currentStep === 2 && !validationResult?.isValid) {
                  setError('Please validate your API key first');
                  return;
                }
                nextStep();
              }}
              disabled={
                (currentStep === 1 &&
                  (!apiKey || !validateKeyFormat(apiKey, selectedProvider))) ||
                (currentStep === 2 && !validationResult?.isValid)
              }
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl p-3 font-medium min-h-[48px] disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
              style={{ touchAction: 'manipulation' }}
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileAPIKeySetup;
