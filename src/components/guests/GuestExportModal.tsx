'use client';

import React, { useState, useCallback } from 'react';
import { GuestListFilters, GuestAnalytics } from '@/types/guest-management';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  ArrowDownTrayIcon,
  DocumentTextIcon,
  TableCellsIcon,
  DocumentIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface GuestExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  coupleId: string;
  selectedGuests?: string[];
  filters: GuestListFilters;
  analytics: GuestAnalytics | undefined;
  className?: string;
}

interface ExportConfig {
  format: 'csv' | 'xlsx' | 'pdf';
  include_fields: string[];
  grouping: 'none' | 'category' | 'household' | 'table';
  include_statistics: boolean;
  include_rsvp_summary: boolean;
  include_dietary_summary: boolean;
}

const EXPORT_FORMATS = [
  {
    value: 'csv',
    label: 'CSV (Comma Separated)',
    description: 'Excel compatible, easy to import',
    icon: DocumentTextIcon,
    color: 'text-green-600',
  },
  {
    value: 'xlsx',
    label: 'Excel Spreadsheet',
    description: 'Native Excel format with formatting',
    icon: TableCellsIcon,
    color: 'text-blue-600',
  },
  {
    value: 'pdf',
    label: 'PDF Document',
    description: 'Printable format for vendors',
    icon: DocumentIcon,
    color: 'text-red-600',
  },
];

const AVAILABLE_FIELDS = [
  { key: 'name', label: 'Full Name', recommended: true },
  { key: 'email', label: 'Email Address', recommended: true },
  { key: 'phone', label: 'Phone Number', recommended: true },
  { key: 'category', label: 'Category', recommended: true },
  { key: 'side', label: 'Wedding Side', recommended: false },
  { key: 'rsvp_status', label: 'RSVP Status', recommended: true },
  { key: 'age_group', label: 'Age Group', recommended: false },
  { key: 'plus_one', label: 'Plus One Status', recommended: true },
  { key: 'plus_one_name', label: 'Plus One Name', recommended: false },
  { key: 'table_number', label: 'Table Assignment', recommended: true },
  { key: 'household', label: 'Household Name', recommended: false },
  {
    key: 'dietary_restrictions',
    label: 'Dietary Restrictions',
    recommended: true,
  },
  { key: 'special_needs', label: 'Special Needs', recommended: false },
  { key: 'helper_role', label: 'Wedding Role', recommended: false },
  { key: 'notes', label: 'Notes', recommended: false },
];

export function GuestExportModal({
  isOpen,
  onClose,
  coupleId,
  selectedGuests,
  filters,
  analytics,
  className,
}: GuestExportModalProps) {
  const [config, setConfig] = useState<ExportConfig>({
    format: 'csv',
    include_fields: AVAILABLE_FIELDS.filter((f) => f.recommended).map(
      (f) => f.key,
    ),
    grouping: 'none',
    include_statistics: true,
    include_rsvp_summary: true,
    include_dietary_summary: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const exportData = {
        couple_id: coupleId,
        format: config.format,
        include_fields: config.include_fields,
        grouping: config.grouping,
        include_statistics: config.include_statistics,
        filters: selectedGuests
          ? undefined
          : {
              search: filters.search,
              category:
                filters.category !== 'all' ? filters.category : undefined,
              rsvp_status:
                filters.rsvp_status !== 'all' ? filters.rsvp_status : undefined,
              age_group:
                filters.age_group !== 'all' ? filters.age_group : undefined,
              side: filters.side !== 'all' ? filters.side : undefined,
              has_dietary_restrictions: filters.has_dietary_restrictions,
              has_plus_one: filters.has_plus_one,
            },
        selected_guests: selectedGuests,
      };

      const response = await fetch('/api/guests/bulk?action=export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportData),
      });

      if (response.ok) {
        // Handle file download
        const contentType = response.headers.get('content-type');

        if (contentType?.includes('application/json')) {
          // JSON response with download URL
          const result = await response.json();
          setDownloadUrl(result.download_url);
        } else {
          // Direct file download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `guest-list-export.${config.format}`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }

        setSuccess(true);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setLoading(false);
    }
  }, [config, coupleId, selectedGuests, filters]);

  const handleFieldToggle = useCallback(
    (fieldKey: string, included: boolean) => {
      setConfig((prev) => ({
        ...prev,
        include_fields: included
          ? [...prev.include_fields, fieldKey]
          : prev.include_fields.filter((f) => f !== fieldKey),
      }));
    },
    [],
  );

  const handleSelectAllFields = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      include_fields: AVAILABLE_FIELDS.map((f) => f.key),
    }));
  }, []);

  const handleSelectRecommended = useCallback(() => {
    setConfig((prev) => ({
      ...prev,
      include_fields: AVAILABLE_FIELDS.filter((f) => f.recommended).map(
        (f) => f.key,
      ),
    }));
  }, []);

  const getGuestCount = () => {
    if (selectedGuests) return selectedGuests.length;
    if (analytics) return analytics.total_guests;
    return 0;
  };

  const selectedFormat = EXPORT_FORMATS.find((f) => f.value === config.format);

  if (success) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={cn('sm:max-w-[500px]', className)}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-green-700">
              <CheckCircleIcon className="w-6 h-6" />
              Export Complete
            </DialogTitle>
          </DialogHeader>

          <div className="py-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ArrowDownTrayIcon className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Your guest list has been exported successfully!
            </h3>
            <p className="text-gray-600 mb-4">
              {getGuestCount()} guests exported in {config.format.toUpperCase()}{' '}
              format
            </p>

            {downloadUrl && (
              <Button asChild>
                <a href={downloadUrl} download>
                  Download File
                </a>
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={cn(
          'sm:max-w-[700px] max-h-[90vh] overflow-y-auto',
          className,
        )}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <ArrowDownTrayIcon className="w-6 h-6 text-primary-600" />
            Export Guest List
            <Badge variant="secondary" className="ml-auto">
              {getGuestCount()} guests
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Export Format Selection */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Export Format</h4>
            <div className="grid grid-cols-1 gap-3">
              {EXPORT_FORMATS.map((format) => {
                const Icon = format.icon;
                const isSelected = config.format === format.value;

                return (
                  <Card
                    key={format.value}
                    className={cn(
                      'p-4 cursor-pointer transition-all',
                      isSelected
                        ? 'border-primary-500 bg-primary-25 ring-1 ring-primary-500'
                        : 'hover:border-gray-300',
                    )}
                    onClick={() =>
                      setConfig((prev) => ({
                        ...prev,
                        format: format.value as any,
                      }))
                    }
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={cn('w-6 h-6', format.color)} />
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {format.label}
                        </div>
                        <div className="text-sm text-gray-600">
                          {format.description}
                        </div>
                      </div>
                      <div
                        className={cn(
                          'w-4 h-4 rounded-full border-2',
                          isSelected
                            ? 'border-primary-500 bg-primary-500'
                            : 'border-gray-300',
                        )}
                      >
                        {isSelected && (
                          <div className="w-full h-full rounded-full bg-white scale-50" />
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Field Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">Include Fields</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectRecommended}
                >
                  Recommended
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllFields}
                >
                  Select All
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_FIELDS.map((field) => {
                const isIncluded = config.include_fields.includes(field.key);

                return (
                  <label
                    key={field.key}
                    className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={isIncluded}
                      onChange={(e) =>
                        handleFieldToggle(field.key, e.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {field.label}
                        {field.recommended && (
                          <Badge className="ml-1 bg-blue-100 text-blue-700 text-xs">
                            Rec
                          </Badge>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Grouping Options */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Grouping</h4>
            <Select
              value={config.grouping}
              onValueChange={(
                value: 'none' | 'category' | 'household' | 'table',
              ) => setConfig((prev) => ({ ...prev, grouping: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Grouping</SelectItem>
                <SelectItem value="category">Group by Category</SelectItem>
                <SelectItem value="household">Group by Household</SelectItem>
                <SelectItem value="table">Group by Table</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Additional Options */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Additional Options</h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    Include Statistics Summary
                  </div>
                  <div className="text-sm text-gray-600">
                    Add guest counts and RSVP breakdown
                  </div>
                </div>
                <Switch
                  checked={config.include_statistics}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      include_statistics: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">RSVP Summary</div>
                  <div className="text-sm text-gray-600">
                    Include RSVP status breakdown
                  </div>
                </div>
                <Switch
                  checked={config.include_rsvp_summary}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      include_rsvp_summary: checked,
                    }))
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">
                    Dietary Summary
                  </div>
                  <div className="text-sm text-gray-600">
                    List all dietary restrictions
                  </div>
                </div>
                <Switch
                  checked={config.include_dietary_summary}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      include_dietary_summary: checked,
                    }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Export Preview */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Export Preview</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <div>
                Format: <strong>{selectedFormat?.label}</strong>
              </div>
              <div>
                Guests: <strong>{getGuestCount()}</strong>
              </div>
              <div>
                Fields: <strong>{config.include_fields.length}</strong>
              </div>
              <div>
                Grouping:{' '}
                <strong>
                  {config.grouping === 'none' ? 'None' : config.grouping}
                </strong>
              </div>
            </div>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert className="border-red-200 bg-red-50">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Loading Progress */}
          {loading && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Generating export...</span>
                <span>Please wait</span>
              </div>
              <Progress value={75} className="w-full" />
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || config.include_fields.length === 0}
          >
            {loading ? 'Exporting...' : `Export ${getGuestCount()} Guests`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
