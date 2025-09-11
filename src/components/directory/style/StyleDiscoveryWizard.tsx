'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Eye,
  Palette,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { StyleCategorySelector } from './StyleCategorySelector';
import { ColorPalettePicker } from './ColorPalettePicker';
import { AestheticPreferenceSliders } from './AestheticPreferenceSliders';
import { StyleMatchResults } from './StyleMatchResults';
import { cn } from '@/lib/utils';
import type { StylePreferences } from '@/types/style-matching';

interface StyleDiscoveryWizardProps {
  onComplete: (preferences: StylePreferences) => void;
  onClose: () => void;
  initialPreferences?: Partial<StylePreferences>;
  className?: string;
}

const STEPS = [
  {
    id: 'categories',
    title: 'Style Categories',
    subtitle: 'Choose aesthetics that inspire you',
    icon: Eye,
    description: 'Select the wedding styles that resonate with your vision',
  },
  {
    id: 'colors',
    title: 'Color Palette',
    subtitle: 'Create your perfect color harmony',
    icon: Palette,
    description: 'Choose colors that will define your wedding atmosphere',
  },
  {
    id: 'preferences',
    title: 'Aesthetic Preferences',
    subtitle: 'Fine-tune your style vision',
    icon: Heart,
    description:
      'Adjust style elements to match your perfect wedding aesthetic',
  },
  {
    id: 'results',
    title: 'Style Matches',
    subtitle: 'Discover your curated matches',
    icon: Sparkles,
    description: 'See venues and vendors that match your unique style',
  },
];

export function StyleDiscoveryWizard({
  onComplete,
  onClose,
  initialPreferences,
  className,
}: StyleDiscoveryWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [preferences, setPreferences] = useState<StylePreferences>({
    categories: initialPreferences?.categories || [],
    colors: initialPreferences?.colors || {
      primary: '#8B5CF6',
      secondary: '#EC4899',
      accent: '#F59E0B',
      neutral: '#6B7280',
    },
    preferences: initialPreferences?.preferences || {
      elegance: 50,
      modernity: 50,
      intimacy: 50,
      luxury: 50,
      naturalness: 50,
      boldness: 50,
    },
    inspiration: initialPreferences?.inspiration,
  });

  const [isValidStep, setIsValidStep] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const currentStepData = STEPS[currentStep];
  const progress = useMemo(
    () => (currentStep / (STEPS.length - 1)) * 100,
    [currentStep],
  );
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = useCallback(async () => {
    if (!isValidStep && !isLastStep) return;

    if (isLastStep) {
      setIsLoading(true);
      try {
        await onComplete(preferences);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    setIsValidStep(false);
  }, [isValidStep, isLastStep, preferences, onComplete]);

  const handlePrevious = useCallback(() => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleStepComplete = useCallback((isValid: boolean) => {
    setIsValidStep(isValid);
  }, []);

  const updatePreferences = useCallback(
    (updates: Partial<StylePreferences>) => {
      setPreferences((prev) => ({
        ...prev,
        ...updates,
      }));
    },
    [],
  );

  const renderStepContent = () => {
    const stepId = STEPS[currentStep]?.id;

    switch (stepId) {
      case 'categories':
        return (
          <StyleCategorySelector
            selectedCategories={preferences.categories}
            onSelectionChange={(categories) => {
              updatePreferences({ categories });
              handleStepComplete(categories.length > 0);
            }}
            onComplete={handleStepComplete}
          />
        );

      case 'colors':
        return (
          <ColorPalettePicker
            colors={preferences.colors}
            onColorsChange={(colors) => {
              updatePreferences({ colors });
              handleStepComplete(true);
            }}
            preferences={preferences}
            onComplete={handleStepComplete}
          />
        );

      case 'preferences':
        return (
          <AestheticPreferenceSliders
            preferences={preferences.preferences}
            onPreferencesChange={(prefs) => {
              updatePreferences({ preferences: prefs });
              handleStepComplete(true);
            }}
            colors={preferences.colors}
            categories={preferences.categories}
            onComplete={handleStepComplete}
          />
        );

      case 'results':
        return (
          <StyleMatchResults
            preferences={preferences}
            onComplete={() => handleStepComplete(true)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        'fixed inset-0 bg-black/50 flex items-center justify-center z-50',
        className,
      )}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="border-b border-gray-100 px-8 py-6 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center justify-between mb-4">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center space-x-3"
            >
              <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl text-white">
                <currentStepData.icon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentStepData.title}
                </h2>
                <p className="text-gray-600">{currentStepData.subtitle}</p>
              </div>
            </motion.div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ×
            </Button>
          </div>

          {/* Progress Indicator */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep + 1} of {STEPS.length}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progress)}% Complete
              </span>
            </div>

            <Progress value={progress} className="h-2" />

            {/* Step Pills */}
            <div className="flex justify-between mt-4">
              {STEPS.map((step, index) => (
                <motion.div
                  key={step.id}
                  className={cn(
                    'flex items-center space-x-2 px-3 py-2 rounded-full text-sm transition-all',
                    index <= currentStep
                      ? 'bg-purple-100 text-purple-700 ring-2 ring-purple-200'
                      : 'bg-gray-100 text-gray-500',
                  )}
                  whileHover={{ scale: index <= currentStep ? 1.05 : 1 }}
                >
                  {index < currentStep ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <step.icon className="h-4 w-4" />
                  )}
                  <span className="font-medium">{step.title}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[calc(90vh-200px)]">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -50, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              <div className="mb-6">
                <p className="text-gray-600 text-lg leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-8 py-6 bg-gray-50 flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={isFirstStep || isLoading}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Previous</span>
          </Button>

          <div className="flex items-center space-x-4">
            {!isLastStep && (
              <Button
                variant="ghost"
                onClick={onClose}
                disabled={isLoading}
                className="text-gray-600 hover:text-gray-800"
              >
                Save & Exit
              </Button>
            )}

            <Button
              onClick={handleNext}
              disabled={!isValidStep || isLoading}
              className={cn(
                'flex items-center space-x-2 min-w-32',
                isLastStep
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                  : 'bg-purple-600 hover:bg-purple-700',
              )}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>{isLastStep ? 'Complete Discovery' : 'Continue'}</span>
                  {isLastStep ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default StyleDiscoveryWizard;
