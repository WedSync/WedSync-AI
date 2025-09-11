'use client';

import React, { useState, useCallback } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDropzone } from 'react-dropzone';
import {
  Receipt,
  Upload,
  DollarSign,
  X,
  Check,
  AlertCircle,
  FileText,
  Image,
} from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';

interface BudgetCategory {
  id: string;
  name: string;
  category_type: string;
  budgeted_amount: number;
  spent_amount: number;
  remaining_amount: number;
}

interface ExpenseFormData {
  category_id: string;
  description: string;
  amount: string;
  transaction_date: string;
  payment_method: string;
  vendor_name: string;
  notes: string;
}

const ExpenseSchema = z.object({
  category_id: z.string().uuid('Please select a valid category'),
  description: z
    .string()
    .min(1, 'Description is required')
    .max(255, 'Description too long'),
  amount: z.string().refine((val) => {
    const num = parseFloat(val);
    return !isNaN(num) && num > 0 && num <= 1000000;
  }, 'Amount must be between $0.01 and $1,000,000'),
  transaction_date: z.string().min(1, 'Date is required'),
  payment_method: z.string().optional(),
  vendor_name: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
});

export default function ManualExpenseEntry({
  weddingId,
  organizationId,
  categories,
  onExpenseAdded,
  onCancel,
}: {
  weddingId: string;
  organizationId: string;
  categories: BudgetCategory[];
  onExpenseAdded: () => void;
  onCancel?: () => void;
}) {
  const [formData, setFormData] = useState<ExpenseFormData>({
    category_id: '',
    description: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    payment_method: '',
    vendor_name: '',
    notes: '',
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const supabase = createClientComponentClient();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      // Validate file
      const maxSize = 10 * 1024 * 1024; // 10MB
      const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
      ];

      if (file.size > maxSize) {
        toast.error('File size must be less than 10MB');
        return;
      }

      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPEG, PNG, WebP, and PDF files are allowed');
        return;
      }

      setReceipt(file);

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setReceiptPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        setReceiptPreview(null);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    multiple: false,
  });

  const handleInputChange = (field: keyof ExpenseFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    try {
      ExpenseSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const formErrors: Record<string, string> = {};
        err.errors.forEach((error) => {
          if (error.path[0]) {
            formErrors[error.path[0] as string] = error.message;
          }
        });
        setErrors(formErrors);
      }
      return false;
    }
  };

  const uploadReceipt = async (): Promise<string | null> => {
    if (!receipt) return null;

    try {
      const fileExt = receipt.name.split('.').pop();
      const fileName = `receipt_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `receipts/${weddingId}/${fileName}`;

      setUploadProgress(10);

      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(filePath, receipt, {
          contentType: receipt.type,
          metadata: {
            uploadedBy: (await supabase.auth.getUser()).data.user?.id,
            weddingId,
            originalName: receipt.name,
          },
        });

      setUploadProgress(50);

      if (error) {
        console.error('Receipt upload error:', error);
        throw new Error('Failed to upload receipt');
      }

      setUploadProgress(100);
      return data.path;
    } catch (err) {
      console.error('Receipt upload failed:', err);
      throw err;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    try {
      let receiptUrl: string | null = null;
      let receiptFilename: string | null = null;

      // Upload receipt if provided
      if (receipt) {
        receiptUrl = await uploadReceipt();
        receiptFilename = receipt.name;
      }

      // Create expense transaction
      const transactionData = {
        wedding_id: weddingId,
        organization_id: organizationId,
        category_id: formData.category_id,
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        transaction_date: formData.transaction_date,
        payment_method: formData.payment_method || null,
        vendor_name: formData.vendor_name.trim() || null,
        notes: formData.notes.trim() || null,
        receipt_url: receiptUrl,
        receipt_filename: receiptFilename,
        status: 'PAID', // Since this is manual entry, assume paid
      };

      const { data, error } = await supabase
        .from('budget_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) {
        console.error('Transaction creation error:', error);
        throw new Error('Failed to create expense transaction');
      }

      // Reset form
      setFormData({
        category_id: '',
        description: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: '',
        vendor_name: '',
        notes: '',
      });
      setReceipt(null);
      setReceiptPreview(null);
      setUploadProgress(0);

      toast.success('Expense logged successfully!');
      onExpenseAdded();
    } catch (err) {
      console.error('Expense creation failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to log expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeReceipt = () => {
    setReceipt(null);
    setReceiptPreview(null);
    setUploadProgress(0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const selectedCategory = categories.find(
    (cat) => cat.id === formData.category_id,
  );
  const willExceedBudget =
    selectedCategory &&
    formData.amount &&
    selectedCategory.spent_amount + parseFloat(formData.amount) >
      selectedCategory.budgeted_amount;

  return (
    <Card className="w-full max-w-2xl mx-auto bg-white border border-gray-200 rounded-xl shadow-xs">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-gray-900">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary-600" />
            Log New Expense
          </div>
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Budget Category *
              </label>
              <Select
                value={formData.category_id}
                onValueChange={(value) =>
                  handleInputChange('category_id', value)
                }
              >
                <SelectTrigger
                  className={`w-full ${errors.category_id ? 'border-red-300' : ''}`}
                >
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{category.name}</span>
                        <span className="text-xs text-gray-500 ml-2">
                          {formatCurrency(category.remaining_amount)} left
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category_id && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.category_id}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1000000"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', e.target.value)}
                  placeholder="0.00"
                  className={`pl-8 ${errors.amount ? 'border-red-300' : ''}`}
                  data-testid="expense-amount"
                />
              </div>
              {errors.amount && (
                <p className="text-sm text-red-600 mt-1">{errors.amount}</p>
              )}
              {willExceedBudget && (
                <div className="flex items-center gap-1 mt-1 text-sm text-yellow-600">
                  <AlertCircle className="w-3 h-3" />
                  This will exceed the category budget
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Description *
            </label>
            <Input
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="e.g., Florist deposit for centerpieces"
              maxLength={255}
              className={errors.description ? 'border-red-300' : ''}
              data-testid="expense-description"
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Date *
              </label>
              <Input
                type="date"
                value={formData.transaction_date}
                onChange={(e) =>
                  handleInputChange('transaction_date', e.target.value)
                }
                max={new Date().toISOString().split('T')[0]}
                className={errors.transaction_date ? 'border-red-300' : ''}
              />
              {errors.transaction_date && (
                <p className="text-sm text-red-600 mt-1">
                  {errors.transaction_date}
                </p>
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">
                Payment Method
              </label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) =>
                  handleInputChange('payment_method', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="debit_card">Debit Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="zelle">Zelle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Vendor/Supplier Name
            </label>
            <Input
              value={formData.vendor_name}
              onChange={(e) => handleInputChange('vendor_name', e.target.value)}
              placeholder="e.g., ABC Flowers & Events"
              maxLength={100}
            />
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Receipt (Optional)
            </label>

            {!receipt ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all duration-200 ${
                  isDragActive
                    ? 'border-primary-400 bg-primary-25'
                    : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Drop receipt here or click to browse
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Supports JPEG, PNG, WebP, PDF (max 10MB)
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {receipt.type.startsWith('image/') ? (
                      <Image className="w-8 h-8 text-blue-500" />
                    ) : (
                      <FileText className="w-8 h-8 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {receipt.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(receipt.size / (1024 * 1024)).toFixed(1)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={removeReceipt}
                    className="h-8 w-8 p-0 hover:bg-red-100 text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {receiptPreview && (
                  <div className="mt-3">
                    <img
                      src={receiptPreview}
                      alt="Receipt preview"
                      className="max-h-48 rounded border object-contain mx-auto"
                    />
                  </div>
                )}

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Uploading...</span>
                      <span className="text-gray-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              Notes
            </label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about this expense..."
              rows={3}
              maxLength={1000}
              className="resize-none"
            />
            <div className="text-xs text-gray-500 mt-1">
              {formData.notes.length}/1000 characters
            </div>
          </div>

          {/* Budget Impact Summary */}
          {selectedCategory && formData.amount && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  Budget Impact
                </h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Current spent:</span>
                    <span className="text-blue-900 font-medium">
                      {formatCurrency(selectedCategory.spent_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">This expense:</span>
                    <span className="text-blue-900 font-medium">
                      {formatCurrency(parseFloat(formData.amount) || 0)}
                    </span>
                  </div>
                  <div className="border-t border-blue-200 pt-1 flex justify-between">
                    <span className="text-blue-700 font-medium">
                      New total:
                    </span>
                    <span
                      className={`font-semibold ${
                        willExceedBudget ? 'text-red-600' : 'text-blue-900'
                      }`}
                    >
                      {formatCurrency(
                        selectedCategory.spent_amount +
                          (parseFloat(formData.amount) || 0),
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Budget remaining:</span>
                    <span
                      className={`font-medium ${
                        selectedCategory.remaining_amount -
                          (parseFloat(formData.amount) || 0) <
                        0
                          ? 'text-red-600'
                          : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(
                        selectedCategory.remaining_amount -
                          (parseFloat(formData.amount) || 0),
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1"
              >
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                !formData.category_id ||
                !formData.description ||
                !formData.amount
              }
              className="flex-1"
              data-testid="submit-expense"
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Logging Expense...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Log Expense
                </div>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
