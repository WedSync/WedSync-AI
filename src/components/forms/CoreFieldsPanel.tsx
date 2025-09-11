'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SparklesIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { coreFieldsManager } from '@/lib/core-fields-manager';
import {
  getCoreFieldDisplayName,
  getCategoryDisplayName,
  type CoreFieldCategory,
} from '@/types/core-fields';
import { AutoPopulateIndicator } from './AutoPopulateIndicator';
import { BatchConfidenceActions } from './FieldConfidenceScore';

interface CoreFieldData {
  fieldKey: string;
  value: any;
  confidence: number;
  source: 'pdf' | 'manual' | 'previous_form';
  isAccepted: boolean;
}

interface CoreFieldsPanelProps {
  formId: string;
  clientId: string;
  onFieldsPopulated: (fields: Record<string, any>) => void;
  extractedPDFData?: {
    fields: Record<string, any>;
    confidence: Record<string, number>;
    sourceFile: string;
  };
}

export function CoreFieldsPanel({
  formId,
  clientId,
  onFieldsPopulated,
  extractedPDFData,
}: CoreFieldsPanelProps) {
  const [status, setStatus] = useState<
    'idle' | 'detecting' | 'populating' | 'completed' | 'error'
  >('idle');
  const [coreFields, setCoreFields] = useState<CoreFieldData[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CoreFieldCategory>('couple_info');
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-populate when PDF data is received
  useEffect(() => {
    if (extractedPDFData && status === 'idle') {
      handlePDFDataReceived(extractedPDFData);
    }
  }, [extractedPDFData]);

  const handlePDFDataReceived = async (pdfData: typeof extractedPDFData) => {
    if (!pdfData) return;

    setStatus('detecting');
    setIsExpanded(true);

    try {
      // Simulate field detection (in real app, this would be an API call)
      await new Promise((resolve) => setTimeout(resolve, 800));

      const detectedFields: CoreFieldData[] = Object.entries(pdfData.fields)
        .filter(([key]) => pdfData.confidence[key] > 0.5)
        .map(([key, value]) => ({
          fieldKey: key,
          value,
          confidence: pdfData.confidence[key] || 0.7,
          source: 'pdf' as const,
          isAccepted: false,
        }));

      setCoreFields(detectedFields);
      setStatus('populating');

      // Simulate population animation
      await new Promise((resolve) => setTimeout(resolve, 500));

      setStatus('completed');

      // Auto-accept high confidence fields
      const autoAcceptedFields = detectedFields.filter(
        (f) => f.confidence >= 0.9,
      );
      if (autoAcceptedFields.length > 0) {
        handleAcceptFields(autoAcceptedFields.map((f) => f.fieldKey));
      }
    } catch (err) {
      setStatus('error');
      setError('Failed to process PDF data');
      console.error('Error processing PDF data:', err);
    }
  };

  const handleAutoPopulate = async () => {
    setStatus('detecting');
    setError(null);

    try {
      // Get wedding data for this client
      const weddingData =
        await coreFieldsManager.getOrCreateWeddingData(clientId);

      if (!weddingData) {
        throw new Error('Could not load wedding data');
      }

      setStatus('populating');

      // Get core fields for this form
      const fields = await coreFieldsManager.getCoreFieldsForForm(
        formId,
        weddingData.id,
      );

      // Convert to our format
      const detectedFields: CoreFieldData[] = Object.entries(fields)
        .filter(([_, value]) => value != null)
        .map(([key, value]) => ({
          fieldKey: key,
          value,
          confidence: 0.95, // High confidence for existing data
          source: 'previous_form' as const,
          isAccepted: false,
        }));

      setCoreFields(detectedFields);
      setStatus('completed');
    } catch (err) {
      setStatus('error');
      setError('Failed to load core fields');
      console.error('Error auto-populating:', err);
    }
  };

  const handleAcceptAll = () => {
    const acceptedFields: Record<string, any> = {};
    coreFields.forEach((field) => {
      acceptedFields[field.fieldKey] = field.value;
      field.isAccepted = true;
    });
    setCoreFields([...coreFields]);
    onFieldsPopulated(acceptedFields);
  };

  const handleAcceptHighConfidence = () => {
    const acceptedFields: Record<string, any> = {};
    coreFields.forEach((field) => {
      if (field.confidence >= 0.9) {
        acceptedFields[field.fieldKey] = field.value;
        field.isAccepted = true;
      }
    });
    setCoreFields([...coreFields]);
    onFieldsPopulated(acceptedFields);
  };

  const handleRejectAll = () => {
    setCoreFields([]);
    setStatus('idle');
  };

  const handleAcceptFields = (fieldKeys: string[]) => {
    const acceptedFields: Record<string, any> = {};
    coreFields.forEach((field) => {
      if (fieldKeys.includes(field.fieldKey)) {
        acceptedFields[field.fieldKey] = field.value;
        field.isAccepted = true;
      }
    });
    setCoreFields([...coreFields]);
    onFieldsPopulated(acceptedFields);
  };

  const getFieldsByCategory = () => {
    return coreFields.filter((field) => {
      // Map field keys to categories
      if (
        field.fieldKey.includes('bride') ||
        field.fieldKey.includes('groom')
      ) {
        return selectedCategory === 'couple_info';
      }
      if (
        field.fieldKey.includes('venue') ||
        field.fieldKey.includes('ceremony') ||
        field.fieldKey.includes('reception')
      ) {
        return selectedCategory === 'venue_info';
      }
      if (field.fieldKey.includes('time') || field.fieldKey.includes('_at')) {
        return selectedCategory === 'timeline';
      }
      return selectedCategory === 'wedding_details';
    });
  };

  const categories: CoreFieldCategory[] = [
    'couple_info',
    'wedding_details',
    'venue_info',
    'timeline',
  ];

  const fieldsInCategory = getFieldsByCategory();
  const highConfidenceCount = coreFields.filter(
    (f) => f.confidence >= 0.9,
  ).length;
  const mediumConfidenceCount = coreFields.filter(
    (f) => f.confidence >= 0.7 && f.confidence < 0.9,
  ).length;
  const lowConfidenceCount = coreFields.filter(
    (f) => f.confidence < 0.7,
  ).length;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <SparklesIcon className="h-5 w-5 text-indigo-600" />
            <h3 className="text-sm font-medium text-gray-900">
              Core Fields Auto-Population
            </h3>
            <span className="text-xs text-gray-500">
              THE differentiator - saves 10+ minutes per form
            </span>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className={cn(
                'h-5 w-5 transition-transform',
                isExpanded && 'rotate-180',
              )}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Status Indicator */}
            <div className="px-4 py-3">
              <AutoPopulateIndicator
                status={status}
                fieldsDetected={coreFields.length}
                fieldsPopulated={coreFields.filter((f) => f.isAccepted).length}
                confidence={
                  coreFields.length > 0
                    ? coreFields.reduce((acc, f) => acc + f.confidence, 0) /
                      coreFields.length
                    : 0
                }
                error={error || undefined}
                sourcePDF={extractedPDFData?.sourceFile}
                onRetry={handleAutoPopulate}
              />
            </div>

            {/* Actions */}
            {status === 'idle' && (
              <div className="px-4 pb-3">
                <button
                  onClick={handleAutoPopulate}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors"
                >
                  <SparklesIcon className="h-4 w-4" />
                  <span>Auto-Populate from Previous Forms</span>
                </button>
              </div>
            )}

            {/* Batch Actions */}
            {coreFields.length > 0 && status === 'completed' && (
              <div className="px-4 pb-3">
                <BatchConfidenceActions
                  fieldsCount={coreFields.length}
                  highConfidenceCount={highConfidenceCount}
                  mediumConfidenceCount={mediumConfidenceCount}
                  lowConfidenceCount={lowConfidenceCount}
                  onAcceptAll={handleAcceptAll}
                  onRejectAll={handleRejectAll}
                  onAcceptHighConfidence={handleAcceptHighConfidence}
                />
              </div>
            )}

            {/* Category Tabs */}
            {coreFields.length > 0 && (
              <div className="border-t border-gray-200">
                <div className="flex space-x-1 px-4 py-2 bg-gray-50">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                        selectedCategory === category
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900',
                      )}
                    >
                      {getCategoryDisplayName(category)}
                    </button>
                  ))}
                </div>

                {/* Fields List */}
                <div className="px-4 py-3 max-h-64 overflow-y-auto">
                  {fieldsInCategory.length > 0 ? (
                    <div className="space-y-2">
                      {fieldsInCategory.map((field) => (
                        <div
                          key={field.fieldKey}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-md border',
                            field.isAccepted
                              ? 'bg-green-50 border-green-200'
                              : 'bg-gray-50 border-gray-200',
                          )}
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-700">
                                {getCoreFieldDisplayName(field.fieldKey)}
                              </span>
                              {field.isAccepted && (
                                <CheckCircleIcon className="h-4 w-4 text-green-500" />
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {field.value}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={cn(
                                'text-xs font-medium px-2 py-0.5 rounded-full',
                                field.confidence >= 0.9
                                  ? 'bg-green-100 text-green-700'
                                  : field.confidence >= 0.7
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700',
                              )}
                            >
                              {Math.round(field.confidence * 100)}%
                            </span>
                            <span className="text-xs text-gray-400">
                              {field.source === 'pdf'
                                ? '📄'
                                : field.source === 'previous_form'
                                  ? '📝'
                                  : '✏️'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No fields detected in this category
                    </p>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
