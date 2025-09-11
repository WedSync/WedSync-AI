'use client';

import { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  DocumentTextIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  detail?: string;
}

interface PDFProcessingProgressProps {
  uploadId: string;
  onComplete?: (result: any) => void;
  onError?: (error: Error) => void;
}

export function PDFProcessingProgress({
  uploadId,
  onComplete,
  onError,
}: PDFProcessingProgressProps) {
  const [steps, setSteps] = useState<ProcessingStep[]>([
    { id: 'upload', label: 'Uploading PDF', status: 'completed' },
    { id: 'ocr', label: 'Extracting text with AI', status: 'pending' },
    { id: 'fields', label: 'Detecting wedding fields', status: 'pending' },
    { id: 'mapping', label: 'Mapping to core fields', status: 'pending' },
    { id: 'validation', label: 'Validating data', status: 'pending' },
    { id: 'form', label: 'Creating form', status: 'pending' },
  ]);

  const [progress, setProgress] = useState(0);
  const [fieldCount, setFieldCount] = useState(0);
  const [accuracy, setAccuracy] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!uploadId) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/pdf/process?uploadId=${uploadId}`);
        const data = await response.json();

        if (data.upload?.status === 'processing') {
          // Update steps based on processing progress
          updateProcessingSteps(data.processing?.status);

          // Update metrics
          if (data.processing?.result) {
            setFieldCount(data.processing.result.fields?.length || 0);
            setAccuracy(
              Math.round((data.processing.result.accuracy || 0) * 100),
            );
          }
        }

        if (data.upload?.status === 'processed') {
          // All steps completed
          setSteps((prev) =>
            prev.map((step) => ({ ...step, status: 'completed' })),
          );
          setProgress(100);

          if (data.processing?.result && onComplete) {
            onComplete(data.processing.result);
          }

          clearInterval(pollInterval);
        }

        if (data.upload?.status === 'failed') {
          // Mark current step as error
          setSteps((prev) => {
            const errorIndex = prev.findIndex((s) => s.status === 'processing');
            if (errorIndex >= 0) {
              prev[errorIndex].status = 'error';
              prev[errorIndex].detail = 'Processing failed';
            }
            return [...prev];
          });

          if (onError) {
            onError(new Error('PDF processing failed'));
          }

          clearInterval(pollInterval);
        }

        // Update estimated time based on queue position
        if (data.queue?.estimatedWait) {
          setEstimatedTime(data.queue.estimatedWait);
        }
      } catch (error) {
        console.error('Failed to check processing status:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Timer for elapsed time
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => {
      clearInterval(pollInterval);
      clearInterval(timer);
    };
  }, [uploadId, onComplete, onError]);

  const updateProcessingSteps = (status: any) => {
    // Simulate step progression based on time
    const progressPercent = Math.min((elapsedTime / estimatedTime) * 100, 95);
    setProgress(progressPercent);

    const stepProgress = Math.floor((progressPercent / 100) * steps.length);

    setSteps((prev) =>
      prev.map((step, index) => {
        if (index < stepProgress) {
          return { ...step, status: 'completed' };
        } else if (index === stepProgress) {
          return { ...step, status: 'processing' };
        }
        return step;
      }),
    );
  };

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'processing':
        return (
          <div className="relative">
            <SparklesIcon className="w-5 h-5 text-blue-500 animate-pulse" />
            <div className="absolute inset-0 animate-ping">
              <SparklesIcon className="w-5 h-5 text-blue-400 opacity-75" />
            </div>
          </div>
        );
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <DocumentTextIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Processing Your Wedding Document
        </h3>
        <p className="text-sm text-gray-600">
          Our AI is extracting and organizing your wedding information...
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Processing Steps */}
      <div className="space-y-3 mb-6">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center space-x-3">
            {getStepIcon(step.status)}
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  step.status === 'completed'
                    ? 'text-green-700'
                    : step.status === 'processing'
                      ? 'text-blue-700'
                      : step.status === 'error'
                        ? 'text-red-700'
                        : 'text-gray-500'
                }`}
              >
                {step.label}
              </p>
              {step.detail && (
                <p className="text-xs text-gray-500">{step.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Metrics */}
      {fieldCount > 0 && (
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{fieldCount}</p>
            <p className="text-xs text-gray-600">Fields Detected</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{accuracy}%</p>
            <p className="text-xs text-gray-600">Accuracy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{elapsedTime}s</p>
            <p className="text-xs text-gray-600">Time Elapsed</p>
          </div>
        </div>
      )}

      {/* Magic Message */}
      {progress === 100 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="w-5 h-5 text-purple-600" />
            <p className="text-sm font-medium text-purple-900">
              Magic complete! Your wedding form is ready.
            </p>
          </div>
          <p className="text-xs text-purple-700 mt-1">
            We've extracted {fieldCount} fields with {accuracy}% accuracy in
            just {elapsedTime} seconds!
          </p>
        </div>
      )}
    </div>
  );
}
