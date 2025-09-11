'use client';

/**
 * WS-239: AI Feature Migration Mobile
 * Guided migration wizard for switching between platform and client AI modes
 * Mobile-optimized with step-by-step guidance
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Zap,
  Shield,
  DollarSign,
  Clock,
  Users,
  Camera,
  Calendar,
  Utensils,
  MapPin,
  X,
  Loader2,
} from 'lucide-react';

import type { PlatformType } from '@/types/wedme-ai';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface AIFeatureMigrationMobileProps {
  fromMode: PlatformType;
  toMode: PlatformType;
  onComplete: () => void;
  onCancel: () => void;
  className?: string;
}

// Migration scenarios with wedding industry context
const MIGRATION_SCENARIOS = {
  'platform-to-client': {
    title: 'Switch to Client API',
    description: 'Use your own AI provider for unlimited usage',
    benefits: [
      'Unlimited photo processing for busy seasons',
      'No monthly limits on description generation',
      'Priority access during peak wedding months',
      'Custom AI model fine-tuning options',
    ],
    considerations: [
      "You'll need to set up API keys",
      'Variable costs based on usage',
      'Higher complexity to manage',
      'Requires monitoring spending',
    ],
    steps: [
      'Impact Assessment',
      'API Key Setup',
      'Feature Migration',
      'Final Activation',
    ],
  },
  'client-to-platform': {
    title: 'Switch to Platform AI',
    description: 'Simplify with included AI features',
    benefits: [
      'Fixed monthly cost - no surprises',
      'No API key management needed',
      'Included in your WedSync subscription',
      'Perfect for consistent usage patterns',
    ],
    considerations: [
      'Monthly usage limits apply',
      'May not suit high-volume periods',
      'Less customization available',
      'Shared infrastructure',
    ],
    steps: [
      'Usage Analysis',
      'Data Backup',
      'Platform Migration',
      'Feature Activation',
    ],
  },
} as const;

// Wedding industry use case examples
const USE_CASES = [
  {
    icon: Camera,
    title: 'Wedding Photography',
    platformCase: '500 photos/month limit - perfect for boutique photographers',
    clientCase: 'Unlimited processing - ideal for high-volume wedding seasons',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: MapPin,
    title: 'Venue Management',
    platformCase: 'Description generation for 20 spaces/month included',
    clientCase: 'Generate unlimited venue descriptions and marketing copy',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Utensils,
    title: 'Catering Services',
    platformCase: 'Menu AI for small operations with fixed monthly cost',
    clientCase: 'Scale AI usage for large catering companies and events',
    gradient: 'from-orange-500 to-red-500',
  },
  {
    icon: Calendar,
    title: 'Wedding Planning',
    platformCase: 'Timeline optimization included in subscription',
    clientCase: 'Advanced AI planning for complex multi-day events',
    gradient: 'from-blue-500 to-indigo-500',
  },
];

const AIFeatureMigrationMobile: React.FC<AIFeatureMigrationMobileProps> = ({
  fromMode,
  toMode,
  onComplete,
  onCancel,
  className = '',
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([]);

  const { triggerHaptic, isSupported: hapticSupported } = useHapticFeedback();

  const migrationKey =
    `${fromMode}-to-${toMode}` as keyof typeof MIGRATION_SCENARIOS;
  const migrationConfig = MIGRATION_SCENARIOS[migrationKey];

  // Handle use case selection
  const toggleUseCase = useCallback(
    (title: string) => {
      setSelectedUseCases((prev) => {
        const newSelection = prev.includes(title)
          ? prev.filter((item) => item !== title)
          : [...prev, title];

        if (hapticSupported) {
          triggerHaptic('selection');
        }

        return newSelection;
      });
    },
    [hapticSupported, triggerHaptic],
  );

  // Navigate steps
  const nextStep = useCallback(() => {
    if (currentStep < migrationConfig.steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      if (hapticSupported) triggerHaptic('selection');
    }
  }, [
    currentStep,
    migrationConfig.steps.length,
    hapticSupported,
    triggerHaptic,
  ]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      if (hapticSupported) triggerHaptic('selection');
    }
  }, [currentStep, hapticSupported, triggerHaptic]);

  // Complete migration
  const completeMigration = useCallback(async () => {
    setIsProcessing(true);

    try {
      // Simulate migration process
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (hapticSupported) {
        triggerHaptic('notification', 1.0);
      }

      onComplete();
    } catch (error) {
      console.error('Migration failed:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [hapticSupported, triggerHaptic, onComplete]);

  // Render impact assessment step
  const renderImpactAssessment = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div
          className={`w-16 h-16 bg-gradient-to-br ${toMode === 'client' ? 'from-blue-100 to-purple-100' : 'from-green-100 to-blue-100'} rounded-full flex items-center justify-center mx-auto mb-4`}
        >
          <ArrowRight
            className={`w-8 h-8 ${toMode === 'client' ? 'text-blue-600' : 'text-green-600'}`}
          />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {migrationConfig.title}
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          {migrationConfig.description}
        </p>
      </div>

      {/* Benefits vs Considerations */}
      <div className="grid grid-cols-1 gap-4">
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Benefits
          </h3>
          <ul className="space-y-2">
            {migrationConfig.benefits.map((benefit, index) => (
              <li
                key={index}
                className="text-sm text-green-800 flex items-start gap-2"
              >
                <span className="text-green-500 mt-1">•</span>
                <span>{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Considerations
          </h3>
          <ul className="space-y-2">
            {migrationConfig.considerations.map((consideration, index) => (
              <li
                key={index}
                className="text-sm text-amber-800 flex items-start gap-2"
              >
                <span className="text-amber-500 mt-1">•</span>
                <span>{consideration}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Wedding industry use cases */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          Choose your use cases:
        </h3>
        <div className="grid grid-cols-1 gap-3">
          {USE_CASES.map((useCase, index) => {
            const IconComponent = useCase.icon;
            const isSelected = selectedUseCases.includes(useCase.title);

            return (
              <motion.button
                key={useCase.title}
                whileTap={{ scale: 0.98 }}
                onClick={() => toggleUseCase(useCase.title)}
                className={`p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
                style={{ touchAction: 'manipulation' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 bg-gradient-to-br ${useCase.gradient} rounded-lg flex items-center justify-center`}
                  >
                    <IconComponent className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 mb-1">
                      {useCase.title}
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <strong>
                        {fromMode === 'platform' ? 'Current' : 'Platform'}:
                      </strong>{' '}
                      {useCase.platformCase}
                    </div>
                    <div className="text-sm text-gray-600">
                      <strong>
                        {toMode === 'client' ? 'Client API' : 'Platform'}:
                      </strong>{' '}
                      {useCase.clientCase}
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Render setup/analysis step
  const renderSetupStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {migrationConfig.steps[1]}
        </h2>
        <p className="text-sm text-gray-600">
          {toMode === 'client'
            ? 'Configure your API keys for seamless integration'
            : 'Analyzing your current usage patterns'}
        </p>
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-4">
          <Zap className="w-6 h-6 text-blue-600" />
          <div>
            <h3 className="font-semibold text-blue-900">
              {toMode === 'client' ? 'API Configuration' : 'Usage Analysis'}
            </h3>
            <p className="text-sm text-blue-700">
              {toMode === 'client'
                ? 'Your selected use cases require the following setup:'
                : "Based on your selected use cases, here's our analysis:"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {selectedUseCases.length > 0 ? (
            selectedUseCases.map((useCase, index) => (
              <div
                key={useCase}
                className="flex items-center gap-3 bg-white rounded-lg p-3"
              >
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-900">
                  {useCase}
                </span>
                {toMode === 'client' && (
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full ml-auto">
                    API Required
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">
                Please select at least one use case to continue
              </p>
            </div>
          )}
        </div>
      </div>

      {toMode === 'client' && selectedUseCases.length > 0 && (
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-900">Setup Requirements</h4>
              <p className="text-sm text-amber-800 mt-1">
                You'll need to configure API keys for your selected AI providers
                in the next step. Make sure you have your credentials ready.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render migration step
  const renderMigrationStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <ArrowRight className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {migrationConfig.steps[2]}
        </h2>
        <p className="text-sm text-gray-600">
          Preparing to migrate your AI features and configurations
        </p>
      </div>

      <div className="space-y-4">
        {/* Migration checklist */}
        {[
          'Backing up current configurations',
          'Preparing feature mappings',
          'Setting up new infrastructure',
          'Configuring usage monitoring',
        ].map((task, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.2 }}
            className="flex items-center gap-3 bg-white rounded-lg p-4 border border-gray-200"
          >
            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-900">{task}</span>
          </motion.div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100">
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-purple-600" />
          <h4 className="font-medium text-purple-900">Migration Timeline</h4>
        </div>
        <div className="text-sm text-purple-800">
          The migration process typically takes 2-5 minutes. Your existing AI
          features will continue to work during the migration process.
        </div>
      </div>
    </div>
  );

  // Render completion step
  const renderCompletionStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          {isProcessing ? (
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          ) : (
            <CheckCircle className="w-8 h-8 text-green-600" />
          )}
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          {isProcessing ? 'Migration in Progress' : 'Ready to Complete'}
        </h2>
        <p className="text-sm text-gray-600">
          {isProcessing
            ? 'Please wait while we complete the migration process...'
            : 'Everything is ready for the final migration step'}
        </p>
      </div>

      {!isProcessing && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-xl p-6 border border-green-100">
          <h3 className="font-semibold text-green-900 mb-3">
            Migration Summary
          </h3>
          <div className="space-y-2 text-sm text-green-800">
            <div className="flex items-center justify-between">
              <span>From:</span>
              <span className="font-medium">
                {fromMode === 'platform' ? 'Platform AI' : 'Client API'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>To:</span>
              <span className="font-medium">
                {toMode === 'client' ? 'Client API' : 'Platform AI'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Use Cases:</span>
              <span className="font-medium">
                {selectedUseCases.length} selected
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Downtime:</span>
              <span className="font-medium">None expected</span>
            </div>
          </div>
        </div>
      )}

      {!isProcessing && (
        <button
          onClick={completeMigration}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-xl p-4 font-semibold min-h-[56px] hover:shadow-lg transition-all duration-200 active:scale-95 flex items-center justify-center gap-2"
          style={{ touchAction: 'manipulation' }}
        >
          <Zap className="w-5 h-5" />
          <span>Complete Migration</span>
        </button>
      )}
    </div>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return renderImpactAssessment();
      case 1:
        return renderSetupStep();
      case 2:
        return renderMigrationStep();
      case 3:
        return renderCompletionStep();
      default:
        return null;
    }
  };

  return (
    <div className={`ai-feature-migration-mobile ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={onCancel}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          style={{ touchAction: 'manipulation' }}
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>
        <div className="text-center">
          <h1 className="font-semibold text-gray-900">AI Migration</h1>
          <p className="text-xs text-gray-500">
            Step {currentStep + 1} of {migrationConfig.steps.length}
          </p>
        </div>
        <div className="w-9" /> {/* Spacer */}
      </div>

      {/* Progress bar */}
      <div className="px-4 py-2">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${((currentStep + 1) / migrationConfig.steps.length) * 100}%`,
            }}
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
            transition={{ duration: 0.3 }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          {migrationConfig.steps.map((step, index) => (
            <span
              key={index}
              className={`${index <= currentStep ? 'text-blue-600 font-medium' : 'text-gray-400'}`}
            >
              {step}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div
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
      </div>

      {/* Footer navigation */}
      {!isProcessing && currentStep < migrationConfig.steps.length - 1 && (
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={prevStep}
                className="flex-1 bg-gray-100 text-gray-700 rounded-xl p-3 font-medium min-h-[48px] transition-colors hover:bg-gray-200 active:scale-95 flex items-center justify-center gap-2"
                style={{ touchAction: 'manipulation' }}
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}
            <button
              onClick={nextStep}
              disabled={currentStep === 0 && selectedUseCases.length === 0}
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

export default AIFeatureMigrationMobile;
