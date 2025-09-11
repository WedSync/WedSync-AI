'use client';

import React from 'react';
import { WeddingFormField } from '@/types/form-builder';
import { cn } from '@/lib/utils';
import {
  Calendar,
  MapPin,
  Users,
  DollarSign,
  Utensils,
  Camera,
  FileText,
  Signature,
} from 'lucide-react';

interface FormFieldPreviewProps {
  field: WeddingFormField;
  className?: string;
}

/**
 * FormFieldPreview - Shows a preview of how the field will appear to couples
 *
 * This component renders a non-interactive preview of form fields,
 * showing couples what they'll see when filling out the questionnaire.
 * Wedding-specific fields have custom previews with appropriate icons and styling.
 */
export function FormFieldPreview({ field, className }: FormFieldPreviewProps) {
  const baseClasses =
    'w-full p-3 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed';

  const renderFieldPreview = () => {
    switch (field.type) {
      case 'wedding-date':
        return (
          <div className={cn(baseClasses, 'flex items-center gap-2')}>
            <Calendar className="w-4 h-4 text-rose-500" />
            <span>
              {field.weddingContext?.exampleValue || 'Select your wedding date'}
            </span>
          </div>
        );

      case 'venue':
        return (
          <div className={cn(baseClasses, 'flex items-center gap-2')}>
            <MapPin className="w-4 h-4 text-blue-500" />
            <span>
              {field.weddingContext?.exampleValue ||
                'Enter venue name and address'}
            </span>
          </div>
        );

      case 'guest-count':
        return (
          <div className={cn(baseClasses, 'flex items-center gap-2')}>
            <Users className="w-4 h-4 text-green-500" />
            <span>{field.weddingContext?.exampleValue || '150'}</span>
          </div>
        );

      case 'budget-range':
        return (
          <div className={cn(baseClasses, 'flex items-center gap-2')}>
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span>
              {field.weddingContext?.exampleValue || '£2,500 - £4,000'}
            </span>
          </div>
        );

      case 'dietary-restrictions':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Utensils className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Dietary Requirements
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {['Vegetarian', 'Gluten-free', 'Dairy-free', 'No allergies'].map(
                (option) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-not-allowed"
                  >
                    <input
                      type="checkbox"
                      disabled
                      className="rounded cursor-not-allowed"
                    />
                    {option}
                  </label>
                ),
              )}
            </div>
          </div>
        );

      case 'photo-preferences':
        return (
          <div className={cn(baseClasses, 'flex items-center gap-2')}>
            <Camera className="w-4 h-4 text-indigo-500" />
            <span>
              {field.weddingContext?.exampleValue ||
                'Natural, candid moments with traditional poses'}
            </span>
          </div>
        );

      case 'package-selection':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-teal-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Photography Package
              </span>
            </div>
            <select disabled className={baseClasses}>
              <option>Full Day Coverage (10 hours)</option>
              <option>Half Day Coverage (6 hours)</option>
              <option>Ceremony Only (3 hours)</option>
            </select>
          </div>
        );

      case 'signature':
        return (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Signature className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Digital Signature
              </span>
            </div>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md h-24 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
              <span className="text-gray-500 dark:text-gray-400 text-sm">
                Click to sign
              </span>
            </div>
          </div>
        );

      case 'text':
      case 'email':
      case 'tel':
        return (
          <input
            type={
              field.type === 'email'
                ? 'email'
                : field.type === 'tel'
                  ? 'tel'
                  : 'text'
            }
            placeholder={
              field.placeholder || `Enter ${field.label?.toLowerCase()}`
            }
            disabled
            className={baseClasses}
          />
        );

      case 'textarea':
        return (
          <textarea
            placeholder={
              field.placeholder || `Enter ${field.label?.toLowerCase()}`
            }
            disabled
            rows={3}
            className={baseClasses}
          />
        );

      case 'date':
        return <input type="date" disabled className={baseClasses} />;

      case 'time':
        return <input type="time" disabled className={baseClasses} />;

      case 'number':
        return (
          <input
            type="number"
            placeholder={field.placeholder || '0'}
            disabled
            className={baseClasses}
          />
        );

      case 'select':
        return (
          <select disabled className={baseClasses}>
            <option>Please select...</option>
            {field.options?.map((option) => (
              <option key={option.id} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-not-allowed"
              >
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  disabled
                  className="cursor-not-allowed"
                />
                {option.label}
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label
                key={option.id}
                className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-not-allowed"
              >
                <input
                  type="checkbox"
                  value={option.value}
                  disabled
                  className="rounded cursor-not-allowed"
                />
                {option.label}
              </label>
            ))}
          </div>
        );

      case 'file':
        return (
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md p-6 text-center bg-gray-50 dark:bg-gray-800">
            <div className="text-gray-500 dark:text-gray-400">
              <svg
                className="mx-auto h-8 w-8 mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="text-sm">Click to upload or drag and drop</p>
              <p className="text-xs">PNG, JPG, PDF up to 10MB</p>
            </div>
          </div>
        );

      case 'heading':
        return (
          <div className="py-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {field.label || 'Section Heading'}
            </h3>
          </div>
        );

      case 'paragraph':
        return (
          <div className="py-2">
            <p className="text-gray-700 dark:text-gray-300">
              {field.label ||
                'This is descriptive text that helps explain the form section.'}
            </p>
          </div>
        );

      case 'divider':
        return (
          <div className="py-3">
            <hr className="border-gray-200 dark:border-gray-700" />
          </div>
        );

      case 'image':
        return (
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden bg-gray-50 dark:bg-gray-800">
            <div className="aspect-video flex items-center justify-center text-gray-500 dark:text-gray-400">
              <svg
                className="w-12 h-12"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        );

      default:
        return (
          <div className={cn(baseClasses, 'text-center italic')}>
            {field.type} field preview
          </div>
        );
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      {/* Field Label (if not heading/paragraph/divider) */}
      {!['heading', 'paragraph', 'divider'].includes(field.type) && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {field.label || `Untitled ${field.type} field`}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* Field Preview */}
      {renderFieldPreview()}

      {/* Helper Text */}
      {field.helperText &&
        !['heading', 'paragraph', 'divider'].includes(field.type) && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {field.helperText}
          </p>
        )}
    </div>
  );
}

export default FormFieldPreview;
