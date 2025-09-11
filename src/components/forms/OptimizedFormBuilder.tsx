'use client';

import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { FormCanvas } from './FormCanvas';
import { FieldPalette } from './FieldPalette';
import { FormField, FormBuilderState } from '../../types/forms';
import { useAutoSave, SaveStatusIndicator } from '../../hooks/useAutoSave';
import { createFormSchema } from '../../lib/form-validation';
import { generateAlphanumericId } from '../../lib/crypto-utils';

// Lazy load the preview component and core fields mapper
const FormPreview = lazy(() =>
  import('./FormPreview').then((mod) => ({ default: mod.FormPreview })),
);
const CoreFieldsMapper = lazy(() =>
  import('./CoreFieldsMapper').then((mod) => ({
    default: mod.CoreFieldsMapper,
  })),
);

// Memoized form builder component
export const OptimizedFormBuilder = React.memo(function FormBuilder() {
  const [state, setState] = useState<FormBuilderState>({
    fields: [],
    selectedField: null,
    isPreview: false,
  });

  const [isMobilePaletteOpen, setIsMobilePaletteOpen] = useState(false);
  const [showCoreFieldsMapper, setShowCoreFieldsMapper] = useState(false);

  // Auto-save hook with 30-second interval
  const { saveStatus, lastSaved, saveNow, debouncedSave } = useAutoSave(state, {
    intervalMs: 30000,
    debounceMs: 1000,
    onSave: async (data) => {
      // Save to localStorage or Supabase
      localStorage.setItem('form-builder-draft', JSON.stringify(data));
      console.log('Form auto-saved:', new Date().toISOString());
    },
    enabled: true,
  });

  // Memoized validation schema
  const validationSchema = useMemo(
    () => createFormSchema(state.fields),
    [state.fields],
  );

  // Optimized callbacks with useCallback
  const handleAddField = useCallback(
    (fieldType: string) => {
      const newField: FormField = {
        id: `field-${Date.now()}-${generateAlphanumericId(9)}`,
        type: fieldType as FormField['type'],
        label: `New ${fieldType} Field`,
        required: false,
        placeholder: '',
        options: ['select', 'radio', 'checkbox'].includes(fieldType)
          ? ['Option 1']
          : undefined,
      };

      setState((prev) => ({
        ...prev,
        fields: [...prev.fields, newField],
        selectedField: newField.id,
      }));

      setIsMobilePaletteOpen(false);
      debouncedSave();
    },
    [debouncedSave],
  );

  const handleUpdateField = useCallback(
    (fieldId: string, updates: Partial<FormField>) => {
      setState((prev) => ({
        ...prev,
        fields: prev.fields.map((field) =>
          field.id === fieldId ? { ...field, ...updates } : field,
        ),
      }));
      debouncedSave();
    },
    [debouncedSave],
  );

  const handleDeleteField = useCallback(
    (fieldId: string) => {
      setState((prev) => ({
        ...prev,
        fields: prev.fields.filter((field) => field.id !== fieldId),
        selectedField:
          prev.selectedField === fieldId ? null : prev.selectedField,
      }));
      debouncedSave();
    },
    [debouncedSave],
  );

  const handleReorderFields = useCallback(
    (startIndex: number, endIndex: number) => {
      setState((prev) => {
        const result = Array.from(prev.fields);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);

        return {
          ...prev,
          fields: result,
        };
      });
      debouncedSave();
    },
    [debouncedSave],
  );

  const handleSelectField = useCallback((fieldId: string | null) => {
    setState((prev) => ({
      ...prev,
      selectedField: fieldId,
    }));
  }, []);

  const togglePreview = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPreview: !prev.isPreview,
      selectedField: null,
    }));
  }, []);

  const toggleMobilePalette = useCallback(() => {
    setIsMobilePaletteOpen((prev) => !prev);
  }, []);

  const toggleCoreFieldsMapper = useCallback(() => {
    setShowCoreFieldsMapper((prev) => !prev);
  }, []);

  // Memoized selected field data
  const selectedFieldData = useMemo(
    () => state.fields.find((f) => f.id === state.selectedField) || null,
    [state.fields, state.selectedField],
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50 md:flex-row">
      {/* Mobile Header */}
      <div className="flex items-center justify-between p-4 bg-white border-b md:hidden">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-gray-900">Form Builder</h1>
          <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={togglePreview}
            className="px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={state.isPreview ? 'Edit mode' : 'Preview mode'}
          >
            {state.isPreview ? 'Edit' : 'Preview'}
          </button>
          {!state.isPreview && (
            <button
              onClick={toggleMobilePalette}
              className="p-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Open field palette"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-80 md:flex-col md:bg-white md:border-r">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-xl font-semibold text-gray-900">
              Form Builder
            </h1>
            <button
              onClick={togglePreview}
              className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {state.isPreview ? 'Edit' : 'Preview'}
            </button>
          </div>
          <SaveStatusIndicator status={saveStatus} lastSaved={lastSaved} />

          {/* Core Fields Mapper Button */}
          <button
            onClick={toggleCoreFieldsMapper}
            className="mt-3 w-full px-4 py-2 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
            Map to Core Fields
          </button>
        </div>

        <FieldPalette
          onAddField={handleAddField}
          selectedField={state.selectedField}
          fields={state.fields}
          onUpdateField={handleUpdateField}
          className="flex-1 overflow-y-auto"
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {state.isPreview ? (
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <svg
                    className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <p className="text-gray-600">Loading preview...</p>
                </div>
              </div>
            }
          >
            <FormPreview
              fields={state.fields}
              title="Form Preview"
              className="flex-1 overflow-y-auto p-4"
            />
          </Suspense>
        ) : (
          <FormCanvas
            fields={state.fields}
            selectedField={state.selectedField}
            onSelectField={handleSelectField}
            onUpdateField={handleUpdateField}
            onDeleteField={handleDeleteField}
            onReorderFields={handleReorderFields}
            isPreview={false}
            className="flex-1"
          />
        )}
      </div>

      {/* Mobile Drawer */}
      {isMobilePaletteOpen && !state.isPreview && (
        <MobileDrawer
          onClose={toggleMobilePalette}
          onAddField={handleAddField}
          selectedField={selectedFieldData}
          fields={state.fields}
          onUpdateField={handleUpdateField}
        />
      )}

      {/* Mobile Bottom Navigation */}
      {!state.isPreview && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 safe-area-pb md:hidden">
          <div className="flex justify-between items-center">
            <button
              onClick={saveNow}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:text-gray-900"
              disabled={saveStatus === 'saving'}
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2"
                />
              </svg>
              Save
            </button>
            <button
              onClick={toggleMobilePalette}
              className="flex items-center justify-center w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Add field"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Core Fields Mapper Modal */}
      {showCoreFieldsMapper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">
                Map Form Fields to Core Fields
              </h2>
              <button
                onClick={toggleCoreFieldsMapper}
                className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-lg"
                aria-label="Close mapper"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center">
                      <svg
                        className="animate-spin h-8 w-8 text-purple-600 mx-auto mb-4"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      <p className="text-gray-600">
                        Loading Core Fields Mapper...
                      </p>
                    </div>
                  </div>
                }
              >
                <CoreFieldsMapper
                  availableFields={[
                    {
                      id: 'cf-1',
                      type: 'text',
                      label: 'First Name',
                      required: false,
                    },
                    {
                      id: 'cf-2',
                      type: 'text',
                      label: 'Last Name',
                      required: false,
                    },
                    {
                      id: 'cf-3',
                      type: 'email',
                      label: 'Email Address',
                      required: true,
                    },
                    {
                      id: 'cf-4',
                      type: 'tel',
                      label: 'Phone Number',
                      required: false,
                    },
                    {
                      id: 'cf-5',
                      type: 'date',
                      label: 'Wedding Date',
                      required: true,
                    },
                    {
                      id: 'cf-6',
                      type: 'text',
                      label: 'Venue Name',
                      required: false,
                    },
                    {
                      id: 'cf-7',
                      type: 'textarea',
                      label: 'Special Notes',
                      required: false,
                    },
                  ]}
                  mappedFields={state.fields}
                  onFieldsChange={(fields) => {
                    setState((prev) => ({ ...prev, fields }));
                    debouncedSave();
                  }}
                />
              </Suspense>
            </div>
            <div className="flex justify-end gap-3 p-6 border-t">
              <button
                onClick={toggleCoreFieldsMapper}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  saveNow();
                  toggleCoreFieldsMapper();
                }}
                className="px-6 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                Save Mappings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// Memoized mobile drawer component
const MobileDrawer = React.memo(function MobileDrawer({
  onClose,
  onAddField,
  selectedField,
  fields,
  onUpdateField,
}: {
  onClose: () => void;
  onAddField: (type: string) => void;
  selectedField: FormField | null;
  fields: FormField[];
  onUpdateField: (id: string, updates: Partial<FormField>) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] flex flex-col animate-slide-in-bottom">
        {/* Drag Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pb-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Add Fields</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded-lg"
            aria-label="Close palette"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <FieldPalette
          onAddField={onAddField}
          selectedField={selectedField?.id || null}
          fields={fields}
          onUpdateField={onUpdateField}
          className="flex-1 overflow-y-auto px-6 pb-6"
          isMobile={true}
        />
      </div>
    </div>
  );
});
