'use client';

import { useState, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  FileText,
  Users,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MagicButton, SuccessCelebration } from './MagicAnimations';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: ReactNode;
  icon: ReactNode;
  ctaText?: string;
  skipable?: boolean;
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to WedSync',
    description: 'Transform how you manage wedding vendor relationships',
    content: (
      <div className="text-center space-y-4">
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 p-8 rounded-full w-32 h-32 mx-auto flex items-center justify-center">
          <Sparkles className="h-16 w-16 text-purple-600" />
        </div>
        <p className="text-lg text-gray-600">
          Save 10+ hours per wedding with intelligent form auto-population and
          seamless vendor coordination.
        </p>
      </div>
    ),
    icon: <Sparkles className="h-6 w-6" />,
    ctaText: 'Get Started',
  },
  {
    id: 'forms',
    title: 'Smart Form Builder',
    description: 'Create forms that auto-populate across vendors',
    content: (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-lg border-2 border-purple-200">
          <FileText className="h-12 w-12 text-purple-600 mb-4" />
          <h4 className="font-semibold mb-2">AI-Powered PDF Import</h4>
          <p className="text-gray-600 mb-4">
            Upload existing PDFs and watch AI extract form fields automatically.
          </p>
          <div className="bg-green-50 p-3 rounded-lg">
            <span className="text-green-700 text-sm">
              ✨ 95% accuracy • 30 seconds processing
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-50 p-4 rounded-lg text-center">
            <span className="font-bold text-purple-600">10+ hours</span>
            <p className="text-sm text-gray-600">saved per wedding</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg text-center">
            <span className="font-bold text-green-600">95%</span>
            <p className="text-sm text-gray-600">accuracy rate</p>
          </div>
        </div>
      </div>
    ),
    icon: <FileText className="h-6 w-6" />,
    ctaText: 'Learn More',
    skipable: true,
  },
  {
    id: 'clients',
    title: 'Client Management',
    description: 'Organize wedding details and vendor coordination',
    content: (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
          <Users className="h-12 w-12 text-blue-600 mb-4" />
          <h4 className="font-semibold mb-2">Centralized Wedding Data</h4>
          <p className="text-gray-600">
            All wedding details sync automatically across vendors who work on
            the same event.
          </p>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Couple information auto-fills</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Venue details shared instantly</span>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm">Timeline coordination simplified</span>
          </div>
        </div>
      </div>
    ),
    icon: <Users className="h-6 w-6" />,
    ctaText: 'Explore Features',
    skipable: true,
  },
  {
    id: 'ready',
    title: 'Ready to Transform Your Workflow?',
    description: 'Start creating your first form or import an existing PDF',
    content: (
      <div className="text-center space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <button className="p-6 bg-purple-50 hover:bg-purple-100 rounded-lg border-2 border-purple-200 transition-colors group">
            <FileText className="h-12 w-12 text-purple-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-purple-800">Create New Form</h4>
            <p className="text-sm text-purple-600 mt-1">Start from scratch</p>
          </button>
          <button className="p-6 bg-green-50 hover:bg-green-100 rounded-lg border-2 border-green-200 transition-colors group">
            <Calendar className="h-12 w-12 text-green-600 mx-auto mb-3 group-hover:scale-110 transition-transform" />
            <h4 className="font-semibold text-green-800">Import PDF</h4>
            <p className="text-sm text-green-600 mt-1">Upload existing form</p>
          </button>
        </div>
        <p className="text-gray-600">
          You can always access these options from the dashboard later.
        </p>
      </div>
    ),
    icon: <Check className="h-6 w-6" />,
    ctaText: 'Complete Setup',
  },
];

interface OnboardingFlowProps {
  show: boolean;
  onComplete: () => void;
  onSkip?: () => void;
}

export function OnboardingFlow({
  show,
  onComplete,
  onSkip,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);
  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    } else {
      setShowCelebration(true);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onComplete();
    }
  };

  const handleComplete = () => {
    setShowCelebration(false);
    onComplete();
  };

  const currentStepData = onboardingSteps[currentStep];
  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;

  return (
    <>
      <AnimatePresence>
        {show && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            >
              {/* Header */}
              <div className="p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                      {currentStepData.icon}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {currentStepData.title}
                      </h2>
                      <p className="text-purple-100">
                        {currentStepData.description}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>
                      Step {currentStep + 1} of {onboardingSteps.length}
                    </span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
                    <motion.div
                      className="bg-white h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-8 min-h-[400px] flex items-center">
                <AnimatePresence mode="wait" custom={direction}>
                  <motion.div
                    key={currentStep}
                    custom={direction}
                    initial={{ x: direction > 0 ? 300 : -300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: direction > 0 ? -300 : 300, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="w-full"
                  >
                    {currentStepData.content}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Footer */}
              <div className="p-6 border-t bg-gray-50 flex items-center justify-between">
                <div className="flex gap-2">
                  {onboardingSteps.map((_, index) => (
                    <motion.div
                      key={index}
                      className={cn(
                        'w-3 h-3 rounded-full transition-colors',
                        index <= currentStep ? 'bg-purple-600' : 'bg-gray-300',
                      )}
                      whileHover={{ scale: 1.2 }}
                      onClick={() => setCurrentStep(index)}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </div>

                <div className="flex gap-3">
                  {currentStep > 0 && (
                    <Button
                      variant="outline"
                      onClick={handlePrevious}
                      className="flex items-center gap-2"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Previous
                    </Button>
                  )}

                  {currentStepData.skipable && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(onboardingSteps.length - 1)}
                    >
                      Skip to End
                    </Button>
                  )}

                  <MagicButton
                    onClick={handleNext}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    {currentStepData.ctaText || 'Next'}
                    {currentStep < onboardingSteps.length - 1 && (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </MagicButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <SuccessCelebration
        show={showCelebration}
        onComplete={handleComplete}
        type="confetti"
        message="Welcome to WedSync!"
      />
    </>
  );
}

// Quick tour tooltip component
export function TourTooltip({
  show,
  target,
  title,
  description,
  onNext,
  onSkip,
  position = 'bottom',
}: {
  show: boolean;
  target: string;
  title: string;
  description: string;
  onNext: () => void;
  onSkip: () => void;
  position?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (show && target) {
      const element = document.querySelector(target) as HTMLElement;
      setTargetElement(element);
    }
  }, [show, target]);

  if (!show || !targetElement) return null;

  const rect = targetElement.getBoundingClientRect();
  const tooltipPositions = {
    top: {
      top: rect.top - 10,
      left: rect.left + rect.width / 2,
      transform: 'translate(-50%, -100%)',
    },
    bottom: {
      top: rect.bottom + 10,
      left: rect.left + rect.width / 2,
      transform: 'translate(-50%, 0)',
    },
    left: {
      top: rect.top + rect.height / 2,
      left: rect.left - 10,
      transform: 'translate(-100%, -50%)',
    },
    right: {
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
      transform: 'translate(0, -50%)',
    },
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-40" />

      {/* Highlight */}
      <div
        className="fixed z-50 border-4 border-purple-400 rounded-lg pointer-events-none"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
        }}
      />

      {/* Tooltip */}
      <motion.div
        className="fixed z-50 bg-white p-4 rounded-lg shadow-xl max-w-sm"
        style={tooltipPositions[position]}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
      >
        <h4 className="font-semibold mb-2">{title}</h4>
        <p className="text-gray-600 text-sm mb-4">{description}</p>
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
          >
            Skip
          </button>
          <MagicButton
            onClick={onNext}
            variant="primary"
            className="px-4 py-1 text-sm"
          >
            Next
          </MagicButton>
        </div>
      </motion.div>
    </>
  );
}
