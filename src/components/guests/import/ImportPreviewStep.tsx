'use client';

import React, { useState, useCallback } from 'react';
import {
  ImportPreview,
  DuplicateGuest,
  ImportError,
} from '@/types/guest-management';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserGroupIcon,
  ArrowPathIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface ImportPreviewStepProps {
  preview: ImportPreview | null;
  duplicates: DuplicateGuest[];
  errors: ImportError[];
  onStartImport: (
    duplicateHandling: 'skip' | 'merge' | 'create_anyway',
  ) => void;
  loading: boolean;
}

interface DuplicateDecision {
  guestId: string;
  action: 'skip' | 'merge' | 'create_anyway';
}

export function ImportPreviewStep({
  preview,
  duplicates,
  errors,
  onStartImport,
  loading,
}: ImportPreviewStepProps) {
  const [duplicateHandling, setDuplicateHandling] = useState<
    'skip' | 'merge' | 'create_anyway'
  >('skip');
  const [duplicateDecisions, setDuplicateDecisions] = useState<
    Record<string, DuplicateDecision>
  >({});
  const [activeTab, setActiveTab] = useState('preview');

  const handleStartImport = useCallback(() => {
    onStartImport(duplicateHandling);
  }, [duplicateHandling, onStartImport]);

  const handleDuplicateDecision = useCallback(
    (guestId: string, action: 'skip' | 'merge' | 'create_anyway') => {
      setDuplicateDecisions((prev) => ({
        ...prev,
        [guestId]: { guestId, action },
      }));
    },
    [],
  );

  const getDuplicateMatchStrength = (score: number) => {
    if (score >= 90)
      return {
        label: 'Exact Match',
        color: 'bg-red-100 text-red-700 border-red-200',
      };
    if (score >= 70)
      return {
        label: 'Strong Match',
        color: 'bg-orange-100 text-orange-700 border-orange-200',
      };
    if (score >= 50)
      return {
        label: 'Possible Match',
        color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      };
    return {
      label: 'Weak Match',
      color: 'bg-gray-100 text-gray-700 border-gray-200',
    };
  };

  const getErrorSeverity = (error: ImportError) => {
    const critical = ['first_name', 'last_name'].includes(error.field);
    return critical ? 'critical' : 'warning';
  };

  if (loading) {
    return (
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">
            Starting import...
          </h3>
          <p className="text-gray-600">
            Please wait while we process your guests.
          </p>
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <XCircleIcon className="w-4 h-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Preview data not available. Please go back and try again.
        </AlertDescription>
      </Alert>
    );
  }

  const criticalErrors = errors.filter(
    (error) => getErrorSeverity(error) === 'critical',
  );
  const warnings = errors.filter(
    (error) => getErrorSeverity(error) === 'warning',
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <EyeIcon className="w-5 h-5" />
          Import Summary
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {preview.total_rows}
            </div>
            <div className="text-sm text-gray-600">Total Guests</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {preview.total_rows - errors.length}
            </div>
            <div className="text-sm text-gray-600">Valid</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {duplicates.length}
            </div>
            <div className="text-sm text-gray-600">Duplicates</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {criticalErrors.length}
            </div>
            <div className="text-sm text-gray-600">Errors</div>
          </div>
        </div>
      </Card>

      {/* Critical Errors */}
      {criticalErrors.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <XCircleIcon className="w-4 h-4 text-red-600" />
          <AlertDescription>
            <div className="font-medium text-red-800 mb-2">
              Critical Errors Found ({criticalErrors.length})
            </div>
            <div className="text-red-700 text-sm">
              These errors must be fixed before import can proceed. Please go
              back and check your data.
            </div>
            <div className="mt-3 space-y-1 text-sm">
              {criticalErrors.slice(0, 5).map((error, index) => (
                <div key={index} className="text-red-600">
                  Row {error.row}: {error.message} (Field: {error.field})
                </div>
              ))}
              {criticalErrors.length > 5 && (
                <div className="text-red-600">
                  ... and {criticalErrors.length - 5} more errors
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs for detailed view */}
      <Tabs defaultValue={activeTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="preview">Preview Data</TabsTrigger>
          <TabsTrigger value="duplicates" className="relative">
            Duplicates
            {duplicates.length > 0 && (
              <Badge className="ml-1 bg-orange-100 text-orange-700 text-xs">
                {duplicates.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="warnings" className="relative">
            Warnings
            {warnings.length > 0 && (
              <Badge className="ml-1 bg-yellow-100 text-yellow-700 text-xs">
                {warnings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Import Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="preview" className="space-y-4">
          <Card className="p-6">
            <h4 className="font-medium text-gray-900 mb-4">
              Sample Data Preview
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(preview.sample_data[0] || {}).map((field) => (
                      <th
                        key={field}
                        className="px-3 py-2 text-left font-medium text-gray-700 border"
                      >
                        {field
                          .replace('_', ' ')
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sample_data.map((row, index) => (
                    <tr key={index} className="border-b">
                      {Object.values(row).map((value: any, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="px-3 py-2 border text-gray-900"
                        >
                          {value || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Showing sample of processed data that will be imported
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          {duplicates.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No Duplicates Found
              </h3>
              <p className="text-gray-600">
                All guests appear to be unique based on our analysis.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">
                    Potential Duplicates
                  </h4>
                  <Badge className="bg-orange-100 text-orange-700">
                    {duplicates.length} found
                  </Badge>
                </div>

                <div className="space-y-4">
                  {duplicates.map((duplicate, index) => {
                    const matchStrength = getDuplicateMatchStrength(
                      duplicate.match_score,
                    );

                    return (
                      <Card
                        key={index}
                        className="p-4 border-l-4 border-orange-500"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h5 className="font-medium text-gray-900">
                              {duplicate.guest_name}
                            </h5>
                            {duplicate.guest_email && (
                              <p className="text-sm text-gray-600">
                                {duplicate.guest_email}
                              </p>
                            )}
                          </div>
                          <Badge className={cn('border', matchStrength.color)}>
                            {matchStrength.label} ({duplicate.match_score}%)
                          </Badge>
                        </div>

                        <div className="mb-3">
                          <p className="text-sm text-gray-600 mb-1">
                            Matching fields:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {duplicate.match_fields.map((field) => (
                              <Badge
                                key={field}
                                variant="secondary"
                                className="text-xs"
                              >
                                {field.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">Action:</span>
                          <Select
                            defaultValue="skip"
                            onValueChange={(
                              value: 'skip' | 'merge' | 'create_anyway',
                            ) =>
                              handleDuplicateDecision(duplicate.guest_id, value)
                            }
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="skip">
                                Skip (keep existing)
                              </SelectItem>
                              <SelectItem value="merge">
                                Update existing
                              </SelectItem>
                              <SelectItem value="create_anyway">
                                Create as new
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="warnings" className="space-y-4">
          {warnings.length === 0 ? (
            <Card className="p-8 text-center">
              <CheckCircleIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                No Warnings
              </h3>
              <p className="text-gray-600">All data looks good for import.</p>
            </Card>
          ) : (
            <Card className="p-6">
              <h4 className="font-medium text-gray-900 mb-4">
                Import Warnings ({warnings.length})
              </h4>
              <div className="space-y-2">
                {warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-2 p-2 bg-yellow-50 rounded border border-yellow-200"
                  >
                    <ExclamationTriangleIcon className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <span className="font-medium text-yellow-800">
                        Row {warning.row}:
                      </span>
                      <span className="text-yellow-700 ml-1">
                        {warning.message}
                      </span>
                      {warning.field && (
                        <span className="text-yellow-600 text-xs ml-1">
                          (Field: {warning.field})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-yellow-700 mt-3">
                These warnings won't prevent import, but you may want to review
                and fix them.
              </p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card className="p-6">
            <h4 className="font-medium text-gray-900 mb-4">Import Settings</h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duplicate Handling Strategy
                </label>
                <Select
                  value={duplicateHandling}
                  onValueChange={(value: 'skip' | 'merge' | 'create_anyway') =>
                    setDuplicateHandling(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">
                      Skip duplicates (keep existing guests)
                    </SelectItem>
                    <SelectItem value="merge">
                      Update existing guests with new data
                    </SelectItem>
                    <SelectItem value="create_anyway">
                      Create all guests (allow duplicates)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">
                  This applies to all duplicates unless you've set individual
                  actions above.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="household_grouping"
                  defaultChecked
                  className="rounded border-gray-300"
                />
                <label
                  htmlFor="household_grouping"
                  className="text-sm text-gray-700"
                >
                  Automatically group guests into households by last name and
                  address
                </label>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Import Button */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {criticalErrors.length === 0 ? (
            <span className="flex items-center gap-2 text-green-600">
              <CheckCircleIcon className="w-4 h-4" />
              Ready to import {preview.total_rows - criticalErrors.length}{' '}
              guests
            </span>
          ) : (
            <span className="flex items-center gap-2 text-red-600">
              <XCircleIcon className="w-4 h-4" />
              Cannot import with {criticalErrors.length} critical errors
            </span>
          )}
        </div>

        <Button
          onClick={handleStartImport}
          disabled={criticalErrors.length > 0}
          size="lg"
          className="bg-green-600 hover:bg-green-700"
        >
          <UserGroupIcon className="w-5 h-5 mr-2" />
          Start Import
        </Button>
      </div>
    </div>
  );
}
