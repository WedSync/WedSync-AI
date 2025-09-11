'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Upload,
  CheckCircle,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';

interface ResponsiveSubmissionFormProps {
  storeType: StoreType;
  currentStep: number;
  totalSteps: number;
  onStepChange: (step: number) => void;
  mobileOptimized: boolean;
}

type StoreType = 'apple' | 'google' | 'microsoft';

interface FormData {
  appName: string;
  description: string;
  category: string;
  keywords: string[];
  screenshots: string[];
  icon: string;
  privacyPolicy: string;
  supportEmail: string;
}

interface ValidationError {
  field: string;
  message: string;
}

export default function ResponsiveSubmissionForm({
  storeType,
  currentStep,
  totalSteps,
  onStepChange,
  mobileOptimized,
}: ResponsiveSubmissionFormProps) {
  const [formData, setFormData] = useState<FormData>({
    appName: '',
    description: '',
    category: '',
    keywords: [],
    screenshots: [],
    icon: '',
    privacyPolicy: '',
    supportEmail: '',
  });

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touchFeedback, setTouchFeedback] = useState(false);

  const steps = [
    { id: 1, title: 'App Info', description: 'Basic app information' },
    { id: 2, title: 'Media', description: 'Screenshots and icon' },
    { id: 3, title: 'Metadata', description: 'Keywords and category' },
    { id: 4, title: 'Legal', description: 'Privacy and support' },
    { id: 5, title: 'Review', description: 'Final review' },
  ];

  // Progressive form saving with offline capability
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Auto-save functionality
    if (autoSaveEnabled) {
      const autoSaveInterval = setInterval(() => {
        saveFormData();
      }, 30000); // Auto-save every 30 seconds

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(autoSaveInterval);
      };
    }
  }, [formData, autoSaveEnabled]);

  // Load saved data on component mount
  useEffect(() => {
    loadSavedData();
  }, []);

  const saveFormData = async () => {
    try {
      const dataToSave = {
        ...formData,
        currentStep,
        lastModified: new Date().toISOString(),
        storeType,
      };

      if (isOnline) {
        // Save to server
        await fetch('/api/mobile-store/save-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dataToSave),
        });
      }

      // Always save locally
      localStorage.setItem('app-store-submission', JSON.stringify(dataToSave));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  };

  const loadSavedData = () => {
    try {
      const savedData = localStorage.getItem('app-store-submission');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        if (parsed.storeType === storeType) {
          setFormData(parsed);
          if (parsed.currentStep && parsed.currentStep !== currentStep) {
            onStepChange(parsed.currentStep);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  };

  const validateCurrentStep = (): ValidationError[] => {
    const errors: ValidationError[] = [];

    switch (currentStep) {
      case 1:
        if (!formData.appName.trim()) {
          errors.push({ field: 'appName', message: 'App name is required' });
        }
        if (!formData.description.trim()) {
          errors.push({
            field: 'description',
            message: 'Description is required',
          });
        }
        if (formData.description.length > 4000) {
          errors.push({
            field: 'description',
            message: 'Description too long (max 4000 characters)',
          });
        }
        break;
      case 2:
        if (formData.screenshots.length === 0) {
          errors.push({
            field: 'screenshots',
            message: 'At least one screenshot is required',
          });
        }
        if (!formData.icon) {
          errors.push({ field: 'icon', message: 'App icon is required' });
        }
        break;
      case 3:
        if (!formData.category) {
          errors.push({ field: 'category', message: 'Category is required' });
        }
        if (formData.keywords.length === 0) {
          errors.push({
            field: 'keywords',
            message: 'At least one keyword is required',
          });
        }
        break;
      case 4:
        if (!formData.privacyPolicy) {
          errors.push({
            field: 'privacyPolicy',
            message: 'Privacy policy URL is required',
          });
        }
        if (!formData.supportEmail) {
          errors.push({
            field: 'supportEmail',
            message: 'Support email is required',
          });
        }
        break;
    }

    return errors;
  };

  const handleNext = () => {
    const errors = validateCurrentStep();
    setValidationErrors(errors);

    if (errors.length === 0 && currentStep < totalSteps) {
      saveFormData();
      onStepChange(currentStep + 1);
      triggerTouchFeedback();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      onStepChange(currentStep - 1);
      triggerTouchFeedback();
    }
  };

  const handleSubmit = async () => {
    const errors = validateCurrentStep();
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    try {
      // Get CSRF token for security
      const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

      const response = await fetch('/api/mobile-store/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
        },
        body: JSON.stringify({ ...formData, storeType }),
      });

      if (response.ok) {
        localStorage.removeItem('app-store-submission');
        // Handle successful submission
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      // Only log in development, avoid exposing sensitive data in production
      if (process.env.NODE_ENV === 'development') {
        console.error('Submission error:', error);
      }
      // Log to monitoring service instead
      // errorTracker.captureError(error, { context: 'mobile_store_submission' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerTouchFeedback = () => {
    setTouchFeedback(true);
    if (navigator.vibrate) {
      navigator.vibrate(10); // Subtle haptic feedback
    }
    setTimeout(() => setTouchFeedback(false), 150);
  };

  const updateFormField = (field: keyof FormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error for this field
    setValidationErrors((prev) =>
      prev.filter((error) => error.field !== field),
    );
  };

  const getStoreSpecificInfo = () => {
    switch (storeType) {
      case 'apple':
        return {
          name: 'App Store',
          color: 'blue',
          maxScreenshots: 10,
          iconSize: '1024x1024',
        };
      case 'google':
        return {
          name: 'Play Store',
          color: 'green',
          maxScreenshots: 8,
          iconSize: '512x512',
        };
      case 'microsoft':
        return {
          name: 'Microsoft Store',
          color: 'indigo',
          maxScreenshots: 10,
          iconSize: '300x300',
        };
      default:
        return {
          name: 'Store',
          color: 'gray',
          maxScreenshots: 10,
          iconSize: '512x512',
        };
    }
  };

  const renderCurrentStep = () => {
    const hasErrors = (field: string) =>
      validationErrors.some((error) => error.field === field);
    const getError = (field: string) =>
      validationErrors.find((error) => error.field === field)?.message;

    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Name *
              </label>
              <input
                type="text"
                value={formData.appName}
                onChange={(e) => updateFormField('appName', e.target.value)}
                className={`
                  w-full px-4 py-3 border rounded-lg text-base
                  ${hasErrors('appName') ? 'border-red-500' : 'border-gray-300'}
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${mobileOptimized ? 'min-h-[48px] text-16px' : ''}
                `}
                placeholder="Your app name"
              />
              {hasErrors('appName') && (
                <p className="mt-1 text-sm text-red-600">
                  {getError('appName')}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => updateFormField('description', e.target.value)}
                rows={6}
                className={`
                  w-full px-4 py-3 border rounded-lg text-base resize-none
                  ${hasErrors('description') ? 'border-red-500' : 'border-gray-300'}
                  focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  ${mobileOptimized ? 'min-h-[120px] text-16px' : ''}
                `}
                placeholder="Describe your wedding photography app..."
              />
              <div className="flex justify-between mt-1">
                {hasErrors('description') && (
                  <p className="text-sm text-red-600">
                    {getError('description')}
                  </p>
                )}
                <span className="text-sm text-gray-500">
                  {formData.description.length}/4000
                </span>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Icon * ({getStoreSpecificInfo().iconSize})
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                {formData.icon ? (
                  <div className="flex items-center justify-center">
                    <img
                      src={formData.icon}
                      alt="App Icon"
                      className="w-24 h-24 rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-600">
                      Tap to upload app icon
                    </p>
                  </div>
                )}
              </div>
              {hasErrors('icon') && (
                <p className="mt-1 text-sm text-red-600">{getError('icon')}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Screenshots * (max {getStoreSpecificInfo().maxScreenshots})
              </label>
              <div className="grid grid-cols-2 gap-4">
                {formData.screenshots.map((screenshot, index) => (
                  <div key={index} className="relative">
                    <img
                      src={screenshot}
                      alt={`Screenshot ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                ))}
                {formData.screenshots.length <
                  getStoreSpecificInfo().maxScreenshots && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg h-32 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              {hasErrors('screenshots') && (
                <p className="mt-1 text-sm text-red-600">
                  {getError('screenshots')}
                </p>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">
                Ready to Submit
              </h3>
              <p className="text-sm text-gray-600">
                Review your {getStoreSpecificInfo().name} submission
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">App Name:</span>
                <span>{formData.appName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Category:</span>
                <span>{formData.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Screenshots:</span>
                <span>{formData.screenshots.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Keywords:</span>
                <span>{formData.keywords.length}</span>
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step content for step {currentStep}</div>;
    }
  };

  const storeInfo = getStoreSpecificInfo();

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Header with progress */}
      <div className={`bg-${storeInfo.color}-500 text-white p-4`}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{storeInfo.name} Submission</h2>
          <div className="flex items-center">
            {isOnline ? (
              <Wifi className="w-4 h-4" />
            ) : (
              <WifiOff className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white bg-opacity-20 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        <div className="flex justify-between mt-2 text-sm">
          <span>
            Step {currentStep} of {totalSteps}
          </span>
          <span>{steps[currentStep - 1]?.title}</span>
        </div>
      </div>

      {/* Form content */}
      <div className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {steps[currentStep - 1]?.title}
          </h3>
          <p className="text-sm text-gray-600">
            {steps[currentStep - 1]?.description}
          </p>
        </div>

        {renderCurrentStep()}

        {/* Auto-save status */}
        {lastSaved && (
          <div className="mt-4 flex items-center text-sm text-gray-500">
            <Save className="w-4 h-4 mr-1" />
            Last saved: {lastSaved.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Navigation footer */}
      <div className="bg-gray-50 px-6 py-4">
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className={`
              flex items-center px-4 py-2 rounded-lg font-medium transition-all
              ${touchFeedback ? 'scale-95' : ''}
              ${
                currentStep === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:scale-95'
              }
              ${mobileOptimized ? 'min-h-[48px] px-6' : ''}
            `}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Previous
          </button>

          {currentStep === totalSteps ? (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className={`
                flex items-center px-6 py-2 rounded-lg font-medium transition-all
                ${touchFeedback ? 'scale-95' : ''}
                bg-${storeInfo.color}-500 text-white hover:bg-${storeInfo.color}-600
                disabled:opacity-50 disabled:cursor-not-allowed
                ${mobileOptimized ? 'min-h-[48px] px-8' : ''}
              `}
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Submitting...
                </div>
              ) : (
                <>
                  Submit to {storeInfo.name}
                  <Upload className="w-4 h-4 ml-2" />
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              className={`
                flex items-center px-4 py-2 rounded-lg font-medium transition-all
                ${touchFeedback ? 'scale-95' : ''}
                bg-${storeInfo.color}-500 text-white hover:bg-${storeInfo.color}-600 active:scale-95
                ${mobileOptimized ? 'min-h-[48px] px-6' : ''}
              `}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
