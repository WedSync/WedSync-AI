'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  CheckCircle,
  DollarSign,
  CreditCard,
  AlertTriangle,
  FileText,
  X,
  Upload,
} from 'lucide-react';
import { format } from 'date-fns';
import type { PaymentScheduleItem, MarkAsPaidFormData } from '@/types/payment';
import { PaymentStatusIndicator } from './PaymentStatusIndicator';

interface MarkAsPaidModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentScheduleItem | null;
  onSubmit: (data: MarkAsPaidFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}

interface FormErrors {
  paidDate?: string;
  paymentMethod?: string;
  confirmationNumber?: string;
  amount?: string;
  notes?: string;
}

const PAYMENT_METHODS = [
  { value: 'credit_card', label: 'Credit Card', icon: CreditCard },
  { value: 'debit_card', label: 'Debit Card', icon: CreditCard },
  { value: 'bank_transfer', label: 'Bank Transfer', icon: DollarSign },
  { value: 'cash', label: 'Cash', icon: DollarSign },
  { value: 'check', label: 'Check', icon: FileText },
  { value: 'wire_transfer', label: 'Wire Transfer', icon: DollarSign },
  { value: 'paypal', label: 'PayPal', icon: DollarSign },
  { value: 'venmo', label: 'Venmo', icon: DollarSign },
  { value: 'zelle', label: 'Zelle', icon: DollarSign },
  { value: 'other', label: 'Other', icon: DollarSign },
];

export function MarkAsPaidModal({
  open,
  onOpenChange,
  payment,
  onSubmit,
  onCancel,
  loading = false,
  className,
}: MarkAsPaidModalProps) {
  // Form state
  const [paidDate, setPaidDate] = useState<Date>();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [actualAmount, setActualAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  // Reset form when modal opens/closes or payment changes
  useEffect(() => {
    if (open && payment) {
      setPaidDate(new Date());
      setPaymentMethod('');
      setConfirmationNumber('');
      setActualAmount(payment.amount.toString());
      setNotes('');
      setReceipt(null);
      setErrors({});
    }
  }, [open, payment]);

  // Wedding-specific urgency calculation
  const getUrgencyLevel = useCallback(() => {
    if (!payment) return 'low';

    const daysUntilDue = Math.ceil(
      (new Date(payment.due_date).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24),
    );

    if (payment.status === 'overdue') return 'critical';
    if (daysUntilDue <= 3) return 'high';
    if (daysUntilDue <= 7) return 'medium';
    return 'low';
  }, [payment]);

  // Form validation
  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!paidDate) {
      newErrors.paidDate = 'Payment date is required';
    } else if (paidDate > new Date()) {
      newErrors.paidDate = 'Payment date cannot be in the future';
    }

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Payment method is required';
    }

    if (!actualAmount || parseFloat(actualAmount) <= 0) {
      newErrors.amount = 'Valid payment amount is required';
    } else if (payment && parseFloat(actualAmount) > payment.amount * 1.1) {
      newErrors.amount = 'Payment amount seems unusually high - please verify';
    }

    if (
      paymentMethod &&
      ['check', 'wire_transfer', 'bank_transfer'].includes(paymentMethod) &&
      !confirmationNumber.trim()
    ) {
      newErrors.confirmationNumber = `${PAYMENT_METHODS.find((m) => m.value === paymentMethod)?.label} requires confirmation number`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [paidDate, paymentMethod, actualAmount, confirmationNumber, payment]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!payment || !validateForm()) {
        return;
      }

      try {
        const formData: MarkAsPaidFormData = {
          paymentId: payment.id,
          paidDate: format(paidDate!, 'yyyy-MM-dd'),
          paymentMethod,
          confirmationNumber: confirmationNumber.trim(),
          notes: notes.trim(),
        };

        await onSubmit(formData);
      } catch (error) {
        console.error('Error marking payment as paid:', error);
        setErrors({
          notes:
            'Failed to process payment. Please try again or contact support.',
        });
      }
    },
    [
      payment,
      paidDate,
      paymentMethod,
      confirmationNumber,
      notes,
      validateForm,
      onSubmit,
    ],
  );

  // Handle file upload
  const handleReceiptUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        // Validate file type and size
        const validTypes = [
          'image/jpeg',
          'image/png',
          'image/webp',
          'application/pdf',
        ];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
          setErrors((prev) => ({
            ...prev,
            notes: 'Please upload a valid image (JPEG, PNG, WebP) or PDF file',
          }));
          return;
        }

        if (file.size > maxSize) {
          setErrors((prev) => ({
            ...prev,
            notes: 'File size must be less than 5MB',
          }));
          return;
        }

        setReceipt(file);
        setErrors((prev) => ({ ...prev, notes: undefined }));
      }
    },
    [],
  );

  // Handle modal close
  const handleClose = useCallback(() => {
    if (onCancel) {
      onCancel();
    }
    onOpenChange(false);
  }, [onCancel, onOpenChange]);

  if (!payment) return null;

  const urgencyLevel = getUrgencyLevel();
  const isOverdue = payment.status === 'overdue';
  const amountDifference = actualAmount
    ? parseFloat(actualAmount) - payment.amount
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-w-2xl max-h-[90vh] overflow-y-auto',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          className,
        )}
        role="dialog"
        aria-labelledby="mark-paid-title"
        aria-describedby="mark-paid-description"
      >
        <DialogHeader className="space-y-4">
          <DialogTitle
            id="mark-paid-title"
            className="flex items-center gap-3 text-xl font-semibold"
          >
            <CheckCircle
              className="w-6 h-6 text-green-600"
              aria-hidden="true"
            />
            Mark Payment as Paid
          </DialogTitle>

          <DialogDescription id="mark-paid-description" className="sr-only">
            Form to record payment completion for {payment.vendor_name} payment
            of {payment.currency}
            {payment.amount}
          </DialogDescription>

          {/* Payment Summary Card */}
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium text-gray-900">
                  {payment.vendor_name}
                </h3>
                <p className="text-sm text-gray-600">{payment.description}</p>
              </div>
              <PaymentStatusIndicator
                status={payment.status}
                size="sm"
                showText
                className="ml-2"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Due Date:</span>
                <span
                  className={cn(
                    'ml-2 font-medium',
                    isOverdue && 'text-red-600',
                  )}
                >
                  {format(new Date(payment.due_date), 'MMM dd, yyyy')}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Amount:</span>
                <span className="ml-2 font-medium">
                  {payment.currency}
                  {payment.amount.toLocaleString()}
                </span>
              </div>
            </div>

            {urgencyLevel === 'critical' && (
              <Alert className="mt-3 border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  This payment is overdue and may affect your wedding services.
                  Please contact {payment.vendor_name} to confirm service
                  status.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Date */}
          <div className="space-y-2">
            <Label htmlFor="paid-date" className="text-sm font-medium">
              Payment Date *
            </Label>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  id="paid-date"
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !paidDate && 'text-muted-foreground',
                    errors.paidDate && 'border-red-500 focus:ring-red-500',
                  )}
                  aria-expanded={isDatePickerOpen}
                  aria-haspopup="dialog"
                  aria-label={
                    paidDate
                      ? `Selected payment date: ${format(paidDate, 'PPP')}`
                      : 'Select payment date'
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {paidDate ? format(paidDate, 'PPP') : 'Select payment date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={paidDate}
                  onSelect={(date) => {
                    setPaidDate(date);
                    setIsDatePickerOpen(false);
                    if (errors.paidDate) {
                      setErrors((prev) => ({ ...prev, paidDate: undefined }));
                    }
                  }}
                  disabled={(date) =>
                    date > new Date() || date < new Date('1900-01-01')
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.paidDate && (
              <p className="text-sm text-red-600" role="alert">
                {errors.paidDate}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="payment-method" className="text-sm font-medium">
              Payment Method *
            </Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => {
                setPaymentMethod(value);
                if (errors.paymentMethod) {
                  setErrors((prev) => ({ ...prev, paymentMethod: undefined }));
                }
              }}
            >
              <SelectTrigger
                id="payment-method"
                className={cn(
                  errors.paymentMethod && 'border-red-500 focus:ring-red-500',
                )}
              >
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => {
                  const IconComponent = method.icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="w-4 h-4" aria-hidden="true" />
                        {method.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-sm text-red-600" role="alert">
                {errors.paymentMethod}
              </p>
            )}
          </div>

          {/* Confirmation Number */}
          <div className="space-y-2">
            <Label
              htmlFor="confirmation-number"
              className="text-sm font-medium"
            >
              Confirmation Number
              {paymentMethod &&
                ['check', 'wire_transfer', 'bank_transfer'].includes(
                  paymentMethod,
                ) &&
                ' *'}
            </Label>
            <Input
              id="confirmation-number"
              value={confirmationNumber}
              onChange={(e) => {
                setConfirmationNumber(e.target.value);
                if (errors.confirmationNumber) {
                  setErrors((prev) => ({
                    ...prev,
                    confirmationNumber: undefined,
                  }));
                }
              }}
              placeholder="Enter confirmation or reference number"
              className={cn(
                errors.confirmationNumber &&
                  'border-red-500 focus:ring-red-500',
              )}
            />
            {errors.confirmationNumber && (
              <p className="text-sm text-red-600" role="alert">
                {errors.confirmationNumber}
              </p>
            )}
          </div>

          {/* Actual Amount */}
          <div className="space-y-2">
            <Label htmlFor="actual-amount" className="text-sm font-medium">
              Actual Amount Paid *
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="actual-amount"
                type="number"
                step="0.01"
                min="0"
                value={actualAmount}
                onChange={(e) => {
                  setActualAmount(e.target.value);
                  if (errors.amount) {
                    setErrors((prev) => ({ ...prev, amount: undefined }));
                  }
                }}
                className={cn(
                  'pl-10',
                  errors.amount && 'border-red-500 focus:ring-red-500',
                )}
                placeholder="0.00"
              />
            </div>
            {amountDifference !== 0 && actualAmount && (
              <div className="flex items-center gap-2 text-sm">
                {amountDifference > 0 ? (
                  <Badge variant="destructive" className="text-xs">
                    +{payment.currency}
                    {Math.abs(amountDifference).toLocaleString()} over expected
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    -{payment.currency}
                    {Math.abs(amountDifference).toLocaleString()} under expected
                  </Badge>
                )}
              </div>
            )}
            {errors.amount && (
              <p className="text-sm text-red-600" role="alert">
                {errors.amount}
              </p>
            )}
          </div>

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label htmlFor="receipt-upload" className="text-sm font-medium">
              Receipt or Proof of Payment
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="receipt-upload"
                type="file"
                onChange={handleReceiptUpload}
                accept="image/*,.pdf"
                className="flex-1"
              />
              {receipt && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setReceipt(null)}
                  className="shrink-0"
                >
                  <X className="w-4 h-4" />
                  Remove
                </Button>
              )}
            </div>
            {receipt && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <Upload className="w-4 h-4" />
                {receipt.name} ({(receipt.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                if (errors.notes) {
                  setErrors((prev) => ({ ...prev, notes: undefined }));
                }
              }}
              placeholder="Add any additional notes about this payment..."
              rows={3}
              className={cn(
                'resize-none',
                errors.notes && 'border-red-500 focus:ring-red-500',
              )}
            />
            <p className="text-xs text-gray-500">
              {notes.length}/500 characters
            </p>
            {errors.notes && (
              <p className="text-sm text-red-600" role="alert">
                {errors.notes}
              </p>
            )}
          </div>

          {/* Wedding Planning Tip */}
          <Alert className="border-blue-200 bg-blue-50">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Wedding Planning Tip:</strong> Keep digital copies of all
              payment confirmations and receipts. Consider creating a shared
              folder with your partner for easy access during vendor meetings.
            </AlertDescription>
          </Alert>
        </form>

        <DialogFooter className="flex justify-between items-center pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="min-w-[140px] bg-green-600 hover:bg-green-700 text-white"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Mark as Paid
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default MarkAsPaidModal;
