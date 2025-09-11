'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Download, Share2, X } from 'lucide-react';

interface FormPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  form: {
    id: string;
    title: string;
    description?: string;
    fields: Array<{
      id: string;
      type: string;
      label: string;
      required?: boolean;
      options?: string[];
    }>;
  };
  onPublish?: () => void;
  onExport?: () => void;
}

export function FormPreviewModal({
  isOpen,
  onClose,
  form,
  onPublish,
  onExport,
}: FormPreviewModalProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      await onPublish?.();
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const renderField = (field: any) => {
    const baseClasses = 'w-full rounded-md border border-gray-300 px-3 py-2';

    switch (field.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <input
            type={field.type}
            placeholder={field.label}
            className={baseClasses}
            disabled
          />
        );
      case 'textarea':
        return (
          <textarea
            placeholder={field.label}
            className={`${baseClasses} min-h-[100px]`}
            disabled
          />
        );
      case 'select':
        return (
          <select className={baseClasses} disabled>
            <option>Select {field.label}</option>
            {field.options?.map((option: string) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <input type="checkbox" id={field.id} disabled />
            <label htmlFor={field.id}>{field.label}</label>
          </div>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.id}
                  id={`${field.id}-${option}`}
                  disabled
                />
                <label htmlFor={`${field.id}-${option}`}>{option}</label>
              </div>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Form Preview
          </DialogTitle>
          <DialogDescription>
            Preview how your form will appear to recipients
          </DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[60vh] space-y-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key="form-preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Form Header */}
              <div className="border-b pb-4">
                <h2 className="text-2xl font-bold">{form.title}</h2>
                {form.description && (
                  <p className="mt-2 text-gray-600">{form.description}</p>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                {form.fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="space-y-2"
                  >
                    <label className="block text-sm font-medium text-gray-700">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>
                    {renderField(field)}
                  </motion.div>
                ))}
              </div>

              {/* Submit Button Preview */}
              <div className="pt-4 border-t">
                <Button className="w-full sm:w-auto" disabled>
                  Submit Form
                </Button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={onExport}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(
                  `${window.location.origin}/forms/${form.id}`,
                );
              }}
              className="flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share Link
            </Button>
            <Button
              onClick={handlePublish}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Publishing...
                </>
              ) : (
                <>Publish Form</>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
