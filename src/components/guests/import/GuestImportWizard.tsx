'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  ImportWizardStep,
  ColumnMapping,
  ImportPreview,
  DuplicateGuest,
  ImportError,
} from '@/types/guest-management';
import {
  CloudArrowUpIcon,
  Cog6ToothIcon,
  EyeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

// Step Components
import { FileUploadStep } from './FileUploadStep';
import { FieldMappingStep } from './FieldMappingStep';
import { ImportPreviewStep } from './ImportPreviewStep';
import { ProcessingStep } from './ProcessingStep';
import { CompletionStep } from './CompletionStep';

interface GuestImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  coupleId: string;
  clientName: string;
  onSuccess: () => void;
  className?: string;
}

const IMPORT_STEPS: ImportWizardStep[] = [
  {
    id: 'upload',
    title: 'Upload File',
    description: 'Select and upload your guest list file',
    completed: false,
  },
  {
    id: 'mapping',
    title: 'Map Fields',
    description: 'Map your data columns to guest fields',
    completed: false,
  },
  {
    id: 'preview',
    title: 'Preview & Review',
    description: 'Review mapped data and handle duplicates',
    completed: false,
  },
  {
    id: 'process',
    title: 'Import',
    description: 'Process and import your guests',
    completed: false,
  },
  {
    id: 'complete',
    title: 'Complete',
    description: 'Import completed successfully',
    completed: false,
  },
];

interface ImportState {
  currentStep: number;
  steps: ImportWizardStep[];
  file: File | null;
  fileType: 'csv' | 'excel' | null;
  rawData: any[];
  columnMappings: ColumnMapping[];
  preview: ImportPreview | null;
  duplicates: DuplicateGuest[];
  errors: ImportError[];
  processing: boolean;
  sessionId: string | null;
  results: {
    successful: number;
    failed: number;
    skipped: number;
    households_created?: number;
  } | null;
}

export function GuestImportWizard({
  isOpen,
  onClose,
  coupleId,
  clientName,
  onSuccess,
  className,
}: GuestImportWizardProps) {
  const [state, setState] = useState<ImportState>({
    currentStep: 0,
    steps: [...IMPORT_STEPS],
    file: null,
    fileType: null,
    rawData: [],
    columnMappings: [],
    preview: null,
    duplicates: [],
    errors: [],
    processing: false,
    sessionId: null,
    results: null,
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setState({
        currentStep: 0,
        steps: [...IMPORT_STEPS],
        file: null,
        fileType: null,
        rawData: [],
        columnMappings: [],
        preview: null,
        duplicates: [],
        errors: [],
        processing: false,
        sessionId: null,
        results: null,
      });
    }
  }, [isOpen]);

  const updateStep = useCallback((stepIndex: number, completed: boolean) => {
    setState((prev) => ({
      ...prev,
      steps: prev.steps.map((step, index) =>
        index === stepIndex ? { ...step, completed } : step,
      ),
    }));
  }, []);

  const nextStep = useCallback(() => {
    setState((prev) => {
      const newStep = Math.min(prev.currentStep + 1, prev.steps.length - 1);
      return {
        ...prev,
        currentStep: newStep,
      };
    });
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 0),
    }));
  }, []);

  // File upload handler
  const handleFileUpload = useCallback(
    async (file: File, fileType: 'csv' | 'excel') => {
      setState((prev) => ({ ...prev, file, fileType, processing: true }));

      try {
        // Parse file locally for preview
        let rawData: any[] = [];

        if (fileType === 'csv') {
          rawData = await parseCSVFile(file);
        } else if (fileType === 'excel') {
          rawData = await parseExcelFile(file);
        }

        // Generate initial column mappings with confidence scoring
        const columnMappings = generateColumnMappings(rawData[0] || {});

        setState((prev) => ({
          ...prev,
          rawData,
          columnMappings,
          processing: false,
        }));

        updateStep(0, true);
        nextStep();
      } catch (error) {
        setState((prev) => ({
          ...prev,
          processing: false,
          errors: [
            {
              row: 0,
              field: 'file',
              message:
                error instanceof Error ? error.message : 'File parsing failed',
              value: file.name,
            },
          ],
        }));
      }
    },
    [updateStep, nextStep],
  );

  // Column mapping update handler
  const handleMappingUpdate = useCallback((mappings: ColumnMapping[]) => {
    setState((prev) => ({ ...prev, columnMappings: mappings }));
  }, []);

  // Generate preview
  const handleGeneratePreview = useCallback(async () => {
    setState((prev) => ({ ...prev, processing: true }));

    try {
      const response = await fetch('/api/guests/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couple_id: coupleId,
          raw_data: state.rawData.slice(0, 10), // First 10 rows for preview
          column_mappings: Object.fromEntries(
            state.columnMappings
              .filter((mapping) => mapping.target && mapping.target !== '')
              .map((mapping) => [mapping.source, mapping.target]),
          ),
        }),
      });

      const preview: ImportPreview = await response.json();

      setState((prev) => ({
        ...prev,
        preview,
        duplicates: preview.duplicate_previews || [],
        errors: preview.validation_errors || [],
        processing: false,
      }));

      updateStep(1, true);
      nextStep();
    } catch (error) {
      setState((prev) => ({
        ...prev,
        processing: false,
        errors: [
          {
            row: 0,
            field: 'preview',
            message: 'Failed to generate preview',
            value: '',
          },
        ],
      }));
    }
  }, [coupleId, state.rawData, state.columnMappings, updateStep, nextStep]);

  // Start import process
  const handleStartImport = useCallback(
    async (duplicateHandling: 'skip' | 'merge' | 'create_anyway') => {
      setState((prev) => ({ ...prev, processing: true }));

      try {
        const formData = new FormData();
        formData.append('file', state.file!);
        formData.append(
          'metadata',
          JSON.stringify({
            couple_id: coupleId,
            import_type: state.fileType,
            column_mapping: Object.fromEntries(
              state.columnMappings
                .filter((mapping) => mapping.target && mapping.target !== '')
                .map((mapping) => [mapping.source, mapping.target]),
            ),
            duplicate_handling: duplicateHandling,
            household_grouping: true,
          }),
        );

        const response = await fetch('/api/guests/import', {
          method: 'POST',
          body: formData,
        });

        const results = await response.json();

        if (results.success) {
          setState((prev) => ({
            ...prev,
            sessionId: results.import_session_id,
            results: {
              successful: results.successful_imports,
              failed: results.failed_imports,
              skipped:
                results.total_clients -
                results.successful_imports -
                results.failed_imports,
              households_created: results.households_created,
            },
            processing: false,
          }));

          updateStep(2, true);
          updateStep(3, true);
          nextStep();
          nextStep();

          // Notify parent of success
          onSuccess();
        } else {
          throw new Error(results.error || 'Import failed');
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          processing: false,
          errors: [
            {
              row: 0,
              field: 'import',
              message: error instanceof Error ? error.message : 'Import failed',
              value: '',
            },
          ],
        }));
      }
    },
    [
      state.file,
      state.fileType,
      state.columnMappings,
      coupleId,
      updateStep,
      nextStep,
      onSuccess,
    ],
  );

  const getCurrentStepComponent = () => {
    const currentStep = state.steps[state.currentStep];

    switch (currentStep.id) {
      case 'upload':
        return (
          <FileUploadStep
            onFileUpload={handleFileUpload}
            loading={state.processing}
            error={state.errors.find((e) => e.field === 'file')?.message}
          />
        );

      case 'mapping':
        return (
          <FieldMappingStep
            rawData={state.rawData}
            columnMappings={state.columnMappings}
            onMappingUpdate={handleMappingUpdate}
            onNext={handleGeneratePreview}
            loading={state.processing}
          />
        );

      case 'preview':
        return (
          <ImportPreviewStep
            preview={state.preview}
            duplicates={state.duplicates}
            errors={state.errors}
            onStartImport={handleStartImport}
            loading={state.processing}
          />
        );

      case 'process':
        return (
          <ProcessingStep
            processing={state.processing}
            sessionId={state.sessionId}
            results={state.results}
          />
        );

      case 'complete':
        return (
          <CompletionStep
            results={state.results}
            onClose={onClose}
            clientName={clientName}
          />
        );

      default:
        return null;
    }
  };

  const canGoNext = () => {
    const currentStep = state.steps[state.currentStep];
    return currentStep.completed && state.currentStep < state.steps.length - 1;
  };

  const canGoPrev = () => {
    return state.currentStep > 0 && state.currentStep < state.steps.length - 1;
  };

  const getStepIcon = (step: ImportWizardStep, index: number) => {
    if (step.completed) {
      return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
    } else if (index === state.currentStep) {
      switch (step.id) {
        case 'upload':
          return <CloudArrowUpIcon className="w-5 h-5 text-primary-600" />;
        case 'mapping':
          return <Cog6ToothIcon className="w-5 h-5 text-primary-600" />;
        case 'preview':
          return <EyeIcon className="w-5 h-5 text-primary-600" />;
        case 'process':
          return (
            <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
          );
        case 'complete':
          return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
        default:
          return <div className="w-5 h-5 bg-primary-600 rounded-full" />;
      }
    } else {
      return <div className="w-5 h-5 bg-gray-300 rounded-full" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'sm:max-w-[900px] max-h-[90vh] overflow-hidden',
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <CloudArrowUpIcon className="w-6 h-6 text-primary-600" />
            Import Guest List
            <Badge variant="secondary" className="ml-auto">
              {clientName}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col h-[600px]">
          {/* Step Indicator */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              {state.steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        'flex items-center justify-center w-10 h-10 rounded-full mb-2',
                        step.completed
                          ? 'bg-green-100'
                          : index === state.currentStep
                            ? 'bg-primary-100'
                            : 'bg-gray-100',
                      )}
                    >
                      {getStepIcon(step, index)}
                    </div>
                    <div className="text-center">
                      <div
                        className={cn(
                          'text-sm font-medium',
                          step.completed
                            ? 'text-green-700'
                            : index === state.currentStep
                              ? 'text-primary-700'
                              : 'text-gray-500',
                        )}
                      >
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-500 max-w-[80px]">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < state.steps.length - 1 && (
                    <div className="w-16 h-px bg-gray-300 mx-4 mb-8" />
                  )}
                </div>
              ))}
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <Progress
                value={(state.currentStep / (state.steps.length - 1)) * 100}
                className="w-full"
              />
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {state.errors.length > 0 &&
              state.errors.some((e) => e.field !== 'validation') && (
                <Alert className="border-red-200 bg-red-50 mb-6">
                  <XCircleIcon className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {
                      state.errors.find((e) => e.field !== 'validation')
                        ?.message
                    }
                  </AlertDescription>
                </Alert>
              )}

            {getCurrentStepComponent()}
          </div>

          {/* Navigation */}
          {state.currentStep < state.steps.length - 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between">
              <Button
                variant="outline"
                onClick={canGoPrev() ? prevStep : onClose}
                disabled={state.processing}
              >
                {canGoPrev() ? 'Previous' : 'Cancel'}
              </Button>

              <div className="flex gap-2">
                {canGoNext() && (
                  <Button onClick={nextStep} disabled={state.processing}>
                    Next
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper functions
async function parseCSVFile(file: File): Promise<any[]> {
  const Papa = await import('papaparse');

  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) =>
        header
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, '_'),
      complete: (results) => {
        resolve(results.data as any[]);
      },
      error: (error) =>
        reject(new Error(`CSV parsing failed: ${error.message}`)),
    });
  });
}

async function parseExcelFile(file: File): Promise<any[]> {
  try {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
    }) as any[][];

    if (jsonData.length < 2) {
      throw new Error(
        'Excel file must contain at least a header row and one data row',
      );
    }

    const headers = jsonData[0].map(
      (h: any) =>
        h
          ?.toString()
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]/g, '_') || '',
    );
    const rows = jsonData.slice(1);

    return rows
      .map((row: any[]) => {
        const record: any = {};
        headers.forEach((header: string, index: number) => {
          const value = row[index]?.toString().trim();
          if (value) {
            record[header] = value;
          }
        });
        return record;
      })
      .filter((record) => Object.keys(record).length > 0);
  } catch (error) {
    throw new Error(
      `Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

function generateColumnMappings(
  sampleRow: Record<string, any>,
): ColumnMapping[] {
  const sourceColumns = Object.keys(sampleRow);
  const targetFields: Array<keyof Guest | ''> = [
    '',
    'first_name',
    'last_name',
    'email',
    'phone',
    'category',
    'side',
    'plus_one',
    'plus_one_name',
    'age_group',
    'dietary_restrictions',
    'special_needs',
    'helper_role',
    'notes',
  ];

  return sourceColumns.map((source) => {
    let bestMatch: keyof Guest | '' = '';
    let confidence = 0;

    // Simple fuzzy matching for common field names
    const normalizedSource = source.toLowerCase().replace(/[^a-z]/g, '');

    for (const target of targetFields.slice(1)) {
      // Skip empty option
      if (target) {
        const normalizedTarget = target.replace(/_/g, '');

        if (
          normalizedSource.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedSource)
        ) {
          if (normalizedSource === normalizedTarget) {
            confidence = 100;
          } else if (normalizedSource.includes(normalizedTarget)) {
            confidence = Math.max(confidence, 80);
          } else {
            confidence = Math.max(confidence, 60);
          }

          if (confidence >= 80) {
            bestMatch = target;
            break;
          } else if (confidence > 0) {
            bestMatch = target;
          }
        }
      }
    }

    return {
      source,
      target: bestMatch,
      confidence,
      required: ['first_name', 'last_name'].includes(bestMatch as string),
    };
  });
}
