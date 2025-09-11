'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText,
  Download,
  Trash2,
  Edit3,
  Shield,
  Upload,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';

import {
  DataSubjectRights,
  RequestStatus,
  DataSubjectRequest,
} from '@/types/gdpr';
import { emailSchema, nameSchema, messageSchema } from '@/lib/validations/form';

// Extend base schemas for GDPR-specific validation
const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number is too long')
  .optional();

const dataRequestSchema = z.object({
  type: z.nativeEnum(DataSubjectRights, {
    required_error: 'Please select a request type',
  }),
  email: emailSchema,
  firstName: nameSchema,
  lastName: nameSchema,
  phoneNumber: phoneSchema,
  description: messageSchema.min(
    20,
    'Please provide a detailed description (minimum 20 characters)',
  ),
  confirmIdentity: z
    .boolean()
    .refine((val) => val === true, 'You must confirm your identity to proceed'),
  consentToProcess: z
    .boolean()
    .refine(
      (val) => val === true,
      'You must consent to processing this request',
    ),
  documents: z
    .array(z.instanceof(File))
    .max(5, 'Maximum 5 files allowed')
    .optional(),
});

type DataRequestFormData = z.infer<typeof dataRequestSchema>;

interface DataRequestFormProps {
  onSubmit?: (request: DataSubjectRequest) => Promise<void>;
  onCancel?: () => void;
  initialType?: DataSubjectRights;
  className?: string;
  maxFileSize?: number;
  allowedFileTypes?: string[];
}

interface FormState {
  isSubmitting: boolean;
  hasError: boolean;
  errorMessage?: string;
  successMessage?: string;
  uploadedFiles: File[];
  currentStep: 'form' | 'confirmation' | 'success';
}

const REQUEST_TYPE_INFO = {
  [DataSubjectRights.ACCESS]: {
    title: 'Access Your Data',
    description: 'Get a copy of all personal data we hold about you',
    icon: Download,
    processingTime: '30 days',
    details:
      "We'll provide you with a comprehensive export of all your personal data in machine-readable format.",
  },
  [DataSubjectRights.RECTIFICATION]: {
    title: 'Correct Your Data',
    description: 'Request correction of inaccurate or incomplete data',
    icon: Edit3,
    processingTime: '30 days',
    details:
      "We'll review and correct any inaccurate information we hold about you.",
  },
  [DataSubjectRights.ERASURE]: {
    title: 'Delete Your Data',
    description:
      'Request deletion of your personal data (right to be forgotten)',
    icon: Trash2,
    processingTime: '30 days',
    details:
      "We'll permanently delete your data where legally possible, considering retention obligations.",
  },
  [DataSubjectRights.RESTRICT_PROCESSING]: {
    title: 'Restrict Processing',
    description: 'Limit how we use your personal data',
    icon: Shield,
    processingTime: '30 days',
    details:
      "We'll restrict processing of your data while maintaining minimal records for legal purposes.",
  },
  [DataSubjectRights.DATA_PORTABILITY]: {
    title: 'Port Your Data',
    description: 'Transfer your data to another service provider',
    icon: FileText,
    processingTime: '30 days',
    details:
      "We'll provide your data in a structured, machine-readable format for transfer.",
  },
  [DataSubjectRights.OBJECT]: {
    title: 'Object to Processing',
    description: 'Object to processing based on legitimate interests',
    icon: AlertCircle,
    processingTime: '30 days',
    details:
      "We'll stop processing your data unless we can demonstrate compelling legitimate grounds.",
  },
  [DataSubjectRights.WITHDRAW_CONSENT]: {
    title: 'Withdraw Consent',
    description: 'Withdraw your consent for data processing',
    icon: X,
    processingTime: 'Immediate',
    details: "We'll immediately stop processing data based on your consent.",
  },
};

export function DataRequestForm({
  onSubmit,
  onCancel,
  initialType,
  className,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  allowedFileTypes = [
    'image/jpeg',
    'image/png',
    'application/pdf',
    'text/plain',
  ],
}: DataRequestFormProps) {
  const [state, setState] = React.useState<FormState>({
    isSubmitting: false,
    hasError: false,
    currentStep: 'form',
    uploadedFiles: [],
  });

  const form = useForm<DataRequestFormData>({
    resolver: zodResolver(dataRequestSchema),
    defaultValues: {
      type: initialType || DataSubjectRights.ACCESS,
      email: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      description: '',
      confirmIdentity: false,
      consentToProcess: false,
      documents: [],
    },
  });

  const watchedType = form.watch('type');
  const requestInfo = REQUEST_TYPE_INFO[watchedType];

  const handleFileUpload = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);

      // Validate file size and type
      const validFiles = files.filter((file) => {
        if (file.size > maxFileSize) {
          setState((prev) => ({
            ...prev,
            hasError: true,
            errorMessage: `File "${file.name}" exceeds ${Math.round(maxFileSize / 1024 / 1024)}MB limit`,
          }));
          return false;
        }

        if (!allowedFileTypes.includes(file.type)) {
          setState((prev) => ({
            ...prev,
            hasError: true,
            errorMessage: `File "${file.name}" type not allowed`,
          }));
          return false;
        }

        return true;
      });

      if (validFiles.length > 0) {
        setState((prev) => ({
          ...prev,
          uploadedFiles: [...prev.uploadedFiles, ...validFiles].slice(0, 5),
          hasError: false,
          errorMessage: undefined,
        }));
        form.setValue(
          'documents',
          [...state.uploadedFiles, ...validFiles].slice(0, 5),
        );
      }
    },
    [form, maxFileSize, allowedFileTypes, state.uploadedFiles],
  );

  const handleRemoveFile = React.useCallback(
    (index: number) => {
      const newFiles = state.uploadedFiles.filter((_, i) => i !== index);
      setState((prev) => ({ ...prev, uploadedFiles: newFiles }));
      form.setValue('documents', newFiles);
    },
    [form, state.uploadedFiles],
  );

  const handleSubmit = React.useCallback(async (data: DataRequestFormData) => {
    setState((prev) => ({ ...prev, currentStep: 'confirmation' }));
  }, []);

  const handleConfirm = React.useCallback(async () => {
    if (!onSubmit) return;

    setState((prev) => ({ ...prev, isSubmitting: true, hasError: false }));

    try {
      const formData = form.getValues();
      const request: DataSubjectRequest = {
        type: formData.type,
        userId: '', // Will be set server-side
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        description: formData.description,
        requestDate: new Date(),
        status: 'pending',
        documents: state.uploadedFiles,
      };

      await onSubmit(request);

      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        currentStep: 'success',
        successMessage:
          'Your data subject request has been submitted successfully',
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isSubmitting: false,
        hasError: true,
        errorMessage:
          error instanceof Error ? error.message : 'Failed to submit request',
      }));
    }
  }, [form, onSubmit, state.uploadedFiles]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Success view
  if (state.currentStep === 'success') {
    return (
      <Card className={cn('max-w-2xl mx-auto', className)}>
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-semibold text-green-900 mb-2">
            Request Submitted
          </h2>
          <p className="text-green-700 mb-6">{state.successMessage}</p>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-green-800">
              <strong>What happens next:</strong>
              <br />
              • We'll verify your identity within 72 hours
              <br />• Processing will complete within{' '}
              {requestInfo.processingTime}
              <br />
              • You'll receive email updates on the status
              <br />• Check your spam folder for our communications
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => window.location.reload()}>
              Submit Another Request
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Confirmation view
  if (state.currentStep === 'confirmation') {
    const formData = form.getValues();

    return (
      <Card className={cn('max-w-2xl mx-auto', className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <requestInfo.icon className="w-5 h-5" />
            Confirm Your Request
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">
              {requestInfo.title}
            </h3>
            <p className="text-blue-800 text-sm mb-3">{requestInfo.details}</p>
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <Clock className="w-4 h-4" />
              Processing time: {requestInfo.processingTime}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Contact Information</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Name:</strong> {formData.firstName}{' '}
                  {formData.lastName}
                </p>
                <p>
                  <strong>Email:</strong> {formData.email}
                </p>
                {formData.phoneNumber && (
                  <p>
                    <strong>Phone:</strong> {formData.phoneNumber}
                  </p>
                )}
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Request Details</h4>
              <div className="space-y-2 text-sm">
                <p>
                  <strong>Type:</strong> {requestInfo.title}
                </p>
                {state.uploadedFiles.length > 0 && (
                  <p>
                    <strong>Documents:</strong> {state.uploadedFiles.length}{' '}
                    file(s)
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded border">
              {formData.description}
            </p>
          </div>

          {state.uploadedFiles.length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Attached Documents</h4>
              <div className="space-y-2">
                {state.uploadedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded"
                  >
                    <span className="text-sm">{file.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(file.size)}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {state.hasError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-destructive text-sm">{state.errorMessage}</p>
            </div>
          )}

          <div className="flex gap-4">
            <Button
              onClick={handleConfirm}
              disabled={state.isSubmitting}
              className="flex-1"
            >
              {state.isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                setState((prev) => ({ ...prev, currentStep: 'form' }))
              }
              className="flex-1"
            >
              Back to Form
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Main form view
  return (
    <Card className={cn('max-w-2xl mx-auto', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <requestInfo.icon className="w-5 h-5" />
          Data Subject Request
        </CardTitle>
        <p className="text-muted-foreground">
          Exercise your rights under GDPR data protection regulation
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
          >
            {/* Request Type Selection */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type of request" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(REQUEST_TYPE_INFO).map(([key, info]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            <info.icon className="w-4 h-4" />
                            {info.title}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>{requestInfo.description}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Request Type Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <requestInfo.icon className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 mb-1">
                    {requestInfo.title}
                  </h4>
                  <p className="text-sm text-blue-800 mb-2">
                    {requestInfo.details}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <Clock className="w-4 h-4" />
                    Processing time: {requestInfo.processingTime}
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Personal Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your first name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="your.email@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      We'll use this to verify your identity
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Request Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide detailed information about your request..."
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Provide specific details to help us process your request
                    efficiently
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* File Upload */}
            <div>
              <FormLabel>Supporting Documents (Optional)</FormLabel>
              <div className="mt-2">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600 mb-2">
                    Upload identity verification documents
                  </p>
                  <input
                    type="file"
                    multiple
                    accept={allowedFileTypes.join(',')}
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById('file-upload')?.click()
                    }
                  >
                    Choose Files
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">
                    PDF, JPEG, PNG files up to{' '}
                    {Math.round(maxFileSize / 1024 / 1024)}MB each
                  </p>
                </div>

                {state.uploadedFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {state.uploadedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{file.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {formatFileSize(file.size)}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Confirmations */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="confirmIdentity"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Identity Confirmation</FormLabel>
                      <FormDescription>
                        I confirm that I am the data subject or authorized
                        representative making this request, and all information
                        provided is accurate.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="consentToProcess"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Processing Consent</FormLabel>
                      <FormDescription>
                        I consent to the processing of this request and the
                        provided personal data for verification and response
                        purposes.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {state.hasError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-destructive text-sm">
                    {state.errorMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4">
              <Button type="submit" className="flex-1">
                Review Request
              </Button>
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
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
