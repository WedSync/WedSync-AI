/**
 * WedSync Conflict Resolution Dialog
 * Feature: WS-172 - Offline Functionality - Conflict Resolution
 * Team: C - Batch 21 - Round 3
 *
 * Main dialog component for resolving wedding data conflicts with
 * intelligent UI and navigation integration.
 */

'use client';

import { useState, useCallback } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  FileText,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import type {
  DataConflict,
  ResolutionResult,
  UserContext,
  WeddingDataType,
} from '@/lib/offline/conflict-resolution';

// Form validation schema
const conflictResolutionSchema = z.object({
  resolution: z.enum(
    ['accept_local', 'accept_remote', 'merge_changes', 'manual_review'],
    {
      required_error: 'Please select a resolution strategy',
    },
  ),
  comments: z
    .string()
    .min(10, 'Comments must be at least 10 characters')
    .max(500, 'Comments cannot exceed 500 characters'),
  priority: z.enum(['low', 'medium', 'high'], {
    required_error: 'Please select a priority level',
  }),
  notifyUsers: z.boolean().default(false),
});

type ConflictResolutionFormData = z.infer<typeof conflictResolutionSchema>;

interface ConflictResolutionDialogProps {
  conflict: DataConflict<any> | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onResolve: (
    resolution: ConflictResolutionFormData,
  ) => Promise<ResolutionResult<any>>;
  currentUser: UserContext;
  isLoading?: boolean;
}

interface ConflictFieldComparisionProps {
  fieldName: string;
  localValue: unknown;
  remoteValue: unknown;
  dataType: WeddingDataType;
}

/**
 * Component to display field-by-field comparison
 */
function ConflictFieldComparision({
  fieldName,
  localValue,
  remoteValue,
  dataType,
}: ConflictFieldComparisionProps) {
  const formatValue = useCallback((value: unknown): string => {
    if (value == null) return 'Not set';
    if (value instanceof Date) return value.toLocaleString();
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  }, []);

  const getFieldDisplayName = (field: string): string => {
    const displayNames: Record<string, string> = {
      startTime: 'Start Time',
      endTime: 'End Time',
      assignedTo: 'Assigned To',
      contractStatus: 'Contract Status',
      rsvpStatus: 'RSVP Status',
      budgetAmount: 'Budget Amount',
      contactEmail: 'Contact Email',
      contactPhone: 'Contact Phone',
    };
    return (
      displayNames[field] || field.charAt(0).toUpperCase() + field.slice(1)
    );
  };

  const isValuesDifferent =
    JSON.stringify(localValue) !== JSON.stringify(remoteValue);

  if (!isValuesDifferent) return null;

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <div className="font-medium text-sm text-muted-foreground">
        {getFieldDisplayName(fieldName)}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-sm font-medium">Your Version</span>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {formatValue(localValue)}
            </pre>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500"></div>
            <span className="text-sm font-medium">Remote Version</span>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-3 text-sm">
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {formatValue(remoteValue)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Main conflict resolution dialog component
 */
export function ConflictResolutionDialog({
  conflict,
  isOpen,
  onOpenChange,
  onResolve,
  currentUser,
  isLoading = false,
}: ConflictResolutionDialogProps) {
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);

  const form = useForm<ConflictResolutionFormData>({
    resolver: zodResolver(conflictResolutionSchema),
    defaultValues: {
      resolution: 'merge_changes',
      comments: '',
      priority: 'medium',
      notifyUsers: false,
    },
  });

  const handleResolve = async (data: ConflictResolutionFormData) => {
    if (!conflict) return;

    setIsResolving(true);
    setResolutionError(null);

    try {
      const result = await onResolve(data);

      if (result.success) {
        onOpenChange(false);
        form.reset();
      } else {
        setResolutionError(result.error.message);
      }
    } catch (error) {
      setResolutionError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
      );
    } finally {
      setIsResolving(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'high':
        return <AlertTriangle className="w-4 h-4" />;
      case 'medium':
        return <Clock className="w-4 h-4" />;
      case 'low':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <AlertTriangle className="w-4 h-4" />;
    }
  };

  if (!conflict) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {getSeverityIcon(conflict.metadata.severity)}
              <span>Resolve Wedding Data Conflict</span>
            </div>
            <Badge variant={getSeverityColor(conflict.metadata.severity)}>
              {conflict.metadata.severity.toUpperCase()}
            </Badge>
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground">
            A conflict has been detected between your local changes and remote
            updates. Please review the differences and choose how to resolve
            this conflict.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-6">
            {/* Conflict Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Conflict Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Data Type:</span>
                    <div className="mt-1 capitalize">
                      {conflict.dataType.replace('-', ' ')}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium">Affected Fields:</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {conflict.metadata.affectedFields.map((field) => (
                        <Badge
                          key={field}
                          variant="outline"
                          className="text-xs"
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="font-medium">Modified by:</span>
                    <span>
                      {conflict.localVersion.modifiedBy.role} (
                      {conflict.localVersion.modifiedBy.id})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Detected:</span>
                    <span>
                      {new Date(
                        conflict.metadata.detectedAt.timestamp,
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>

                {conflict.metadata.autoResolvable && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertTitle>Auto-Resolution Available</AlertTitle>
                    <AlertDescription>
                      This conflict can be automatically resolved. The system
                      can merge compatible changes safely.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Field Comparisons */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Field Comparisons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {conflict.metadata.affectedFields.map((fieldName) => (
                  <ConflictFieldComparision
                    key={fieldName}
                    fieldName={fieldName}
                    localValue={conflict.localVersion.data[fieldName]}
                    remoteValue={conflict.remoteVersion.data[fieldName]}
                    dataType={conflict.dataType}
                  />
                ))}
              </CardContent>
            </Card>

            {/* Resolution Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Resolution Options</CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(handleResolve)}
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="resolution"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resolution Strategy</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select how to resolve this conflict" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="accept_local">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                  Accept Your Changes
                                </div>
                              </SelectItem>
                              <SelectItem value="accept_remote">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                  Accept Remote Changes
                                </div>
                              </SelectItem>
                              <SelectItem value="merge_changes">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                  Merge Compatible Changes
                                </div>
                              </SelectItem>
                              <SelectItem value="manual_review">
                                <div className="flex items-center gap-2">
                                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                  Escalate for Manual Review
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Choose how to handle the conflicting changes.
                            Merging will attempt to combine compatible changes
                            automatically.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Priority Level</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Low Priority</SelectItem>
                              <SelectItem value="medium">
                                Medium Priority
                              </SelectItem>
                              <SelectItem value="high">
                                High Priority
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="comments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Resolution Comments</FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="Explain your resolution decision and any important notes for the audit trail..."
                              className="min-h-[100px]"
                            />
                          </FormControl>
                          <FormDescription>
                            Provide details about your resolution decision. This
                            will be recorded in the audit trail.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {resolutionError && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Resolution Failed</AlertTitle>
                        <AlertDescription>{resolutionError}</AlertDescription>
                      </Alert>
                    )}
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>

        <DialogFooter className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isResolving}
          >
            Cancel
          </Button>

          <div className="flex gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                form.setValue('resolution', 'manual_review');
                form.handleSubmit(handleResolve)();
              }}
              disabled={isResolving || isLoading}
            >
              Escalate
            </Button>

            <Button
              onClick={form.handleSubmit(handleResolve)}
              disabled={isResolving || isLoading}
              className="min-w-[120px]"
            >
              {isResolving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Resolving...
                </>
              ) : (
                'Resolve Conflict'
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
