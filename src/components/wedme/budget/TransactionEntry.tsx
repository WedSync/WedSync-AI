'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Receipt,
  Upload,
  X,
  Calendar,
  DollarSign,
  Tag,
  Building2,
  FileText,
  Camera,
  Check,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BudgetCategory {
  id: string;
  name: string;
  color: string;
}

interface TransactionFormData {
  amount: number;
  description: string;
  category_id: string;
  vendor_name: string;
  date: string;
  notes: string;
  tags: string[];
  receipt_file?: File;
}

interface TransactionEntryProps {
  clientId: string;
  categories: BudgetCategory[];
  className?: string;
  onTransactionAdded?: () => void;
  onClose?: () => void;
  prefillData?: Partial<TransactionFormData>;
}

export function TransactionEntry({
  clientId,
  categories,
  className,
  onTransactionAdded,
  onClose,
  prefillData,
}: TransactionEntryProps) {
  // Form state
  const [formData, setFormData] = useState<TransactionFormData>({
    amount: 0,
    description: '',
    category_id: '',
    vendor_name: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    tags: [],
    ...prefillData,
  });

  // UI state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Receipt processing state
  const [receiptProcessing, setReceiptProcessing] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.category_id) {
      newErrors.category_id = 'Category is required';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // Create transaction data
      const transactionData = {
        client_id: clientId,
        amount: formData.amount,
        description: formData.description,
        category_id: formData.category_id,
        vendor_name: formData.vendor_name || null,
        transaction_date: formData.date,
        notes: formData.notes || null,
        tags: formData.tags,
      };

      // Submit transaction
      const response = await fetch('/api/budget/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transactionData),
      });

      if (!response.ok) {
        throw new Error('Failed to create transaction');
      }

      const result = await response.json();
      const transactionId = result.transaction.id;

      // Upload receipt if provided
      if (formData.receipt_file) {
        await uploadReceipt(transactionId, formData.receipt_file);
      }

      // Notify parent and close
      onTransactionAdded?.();
      onClose?.();
      resetForm();
    } catch (err) {
      setErrors({
        submit:
          err instanceof Error ? err.message : 'Failed to create transaction',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const uploadReceipt = async (transactionId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('transaction_id', transactionId);

    const response = await fetch('/api/budget/receipts', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to upload receipt');
    }
  };

  const handleReceiptUpload = async (file: File) => {
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrors({ receipt: 'Only images and PDF files are allowed' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      // 10MB limit
      setErrors({ receipt: 'File size must be less than 10MB' });
      return;
    }

    setFormData((prev) => ({ ...prev, receipt_file: file }));

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setReceiptPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }

    // Process receipt with OCR (if available)
    await processReceiptOCR(file);
  };

  const processReceiptOCR = async (file: File) => {
    setReceiptProcessing(true);

    try {
      const formDataOCR = new FormData();
      formDataOCR.append('file', file);

      const response = await fetch('/api/budget/receipts/process', {
        method: 'POST',
        body: formDataOCR,
      });

      if (response.ok) {
        const ocrData = await response.json();

        if (ocrData.success && ocrData.data) {
          setReceiptData(ocrData.data);

          // Auto-fill form with OCR data
          setFormData((prev) => ({
            ...prev,
            amount: ocrData.data.total_amount || prev.amount,
            description: ocrData.data.description || prev.description,
            vendor_name: ocrData.data.vendor_name || prev.vendor_name,
            date: ocrData.data.date
              ? format(new Date(ocrData.data.date), 'yyyy-MM-dd')
              : prev.date,
          }));
        }
      }
    } catch (err) {
      console.warn('OCR processing failed:', err);
    } finally {
      setReceiptProcessing(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()],
      }));
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const resetForm = () => {
    setFormData({
      amount: 0,
      description: '',
      category_id: '',
      vendor_name: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: '',
      tags: [],
    });
    setErrors({});
    setReceiptPreview(null);
    setReceiptData(null);
    setNewTag('');
    setShowTagInput(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const selectedCategory = categories.find(
    (cat) => cat.id === formData.category_id,
  );

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-xl shadow-xs',
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Add Expense</h3>
          <p className="text-sm text-gray-600 mt-1">
            Record a new wedding expense
          </p>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* OCR Processing Banner */}
      {receiptProcessing && (
        <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
            <span className="text-sm text-blue-700">Processing receipt...</span>
          </div>
        </div>
      )}

      {/* OCR Success Banner */}
      {receiptData && (
        <div className="px-6 py-3 bg-green-50 border-b border-green-200">
          <div className="flex items-center gap-3">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700">
              Receipt processed! Form has been auto-filled with extracted data.
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Amount and Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-error-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    amount: parseFloat(e.target.value) || 0,
                  }))
                }
                className={cn(
                  'w-full pl-8 pr-3 py-2.5 border rounded-lg text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                  errors.amount ? 'border-error-300' : 'border-gray-300',
                )}
                placeholder="0.00"
              />
            </div>
            {errors.amount && (
              <p className="mt-1 text-xs text-error-600">{errors.amount}</p>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date <span className="text-error-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, date: e.target.value }))
                }
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                  errors.date ? 'border-error-300' : 'border-gray-300',
                )}
              />
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.date && (
              <p className="mt-1 text-xs text-error-600">{errors.date}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-error-500">*</span>
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            className={cn(
              'w-full px-3 py-2.5 border rounded-lg text-sm',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
              errors.description ? 'border-error-300' : 'border-gray-300',
            )}
            placeholder="What was this expense for?"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-error-600">{errors.description}</p>
          )}
        </div>

        {/* Category and Vendor Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-error-500">*</span>
            </label>
            <select
              value={formData.category_id}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  category_id: e.target.value,
                }))
              }
              className={cn(
                'w-full px-3 py-2.5 border rounded-lg text-sm',
                'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent',
                errors.category_id ? 'border-error-300' : 'border-gray-300',
              )}
            >
              <option value="">Select a category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {selectedCategory && (
              <div className="mt-1 flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: selectedCategory.color }}
                />
                <span className="text-xs text-gray-500">
                  {selectedCategory.name}
                </span>
              </div>
            )}
            {errors.category_id && (
              <p className="mt-1 text-xs text-error-600">
                {errors.category_id}
              </p>
            )}
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Vendor/Store
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.vendor_name}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    vendor_name: e.target.value,
                  }))
                }
                className="w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="e.g., David's Bridal, The Knot"
              />
              <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Receipt Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Receipt
          </label>

          {!formData.receipt_file ? (
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleReceiptUpload(file);
                }}
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 hover:bg-primary-50 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-1">
                  Click to upload receipt
                </p>
                <p className="text-xs text-gray-500">
                  PNG, JPG, PDF up to 10MB
                </p>
              </div>
            </label>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {receiptPreview ? (
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="w-12 h-12 object-cover rounded border"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded border flex items-center justify-center">
                      <FileText className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {formData.receipt_file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(formData.receipt_file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      receipt_file: undefined,
                    }));
                    setReceiptPreview(null);
                    setReceiptData(null);
                  }}
                  className="p-1 text-gray-400 hover:text-error-600 hover:bg-error-50 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {errors.receipt && (
            <p className="mt-1 text-xs text-error-600">{errors.receipt}</p>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>

          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary-50 text-primary-700 text-xs rounded-full border border-primary-200"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="p-0.5 hover:bg-primary-100 rounded-full transition-colors"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}

            {showTagInput ? (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) =>
                    e.key === 'Enter' && (e.preventDefault(), addTag())
                  }
                  className="px-2 py-1 text-xs border border-gray-300 rounded"
                  placeholder="Tag name"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTagInput(false);
                    setNewTag('');
                  }}
                  className="p-1 text-gray-400 hover:bg-gray-50 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowTagInput(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-dashed border-gray-300 rounded-full hover:border-primary-300 hover:text-primary-600 transition-colors"
              >
                <Plus className="w-3 h-3" />
                Add Tag
              </button>
            )}
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, notes: e.target.value }))
            }
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            rows={3}
            placeholder="Additional notes about this expense..."
          />
        </div>

        {/* Form Errors */}
        {errors.submit && (
          <div className="p-3 bg-error-50 border border-error-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-error-600" />
              <span className="text-sm text-error-700">{errors.submit}</span>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={onClose || resetForm}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Add Expense
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
