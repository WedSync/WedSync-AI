'use client';

import React, { useState, useEffect } from 'react';
import { BulkUpdateData } from '@/types/guest-management';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  TableCellsIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  operationType:
    | 'update'
    | 'delete'
    | 'export'
    | 'assign_table'
    | 'send_invitations'
    | undefined;
  selectedGuests: string[];
  onBulkUpdate: (updates: BulkUpdateData) => Promise<void>;
  onBulkDelete: () => Promise<void>;
  coupleId: string;
  className?: string;
}

interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  include_fields: string[];
  include_statistics: boolean;
  grouping: 'none' | 'category' | 'household' | 'table';
}

interface TableAssignmentOptions {
  table_number: number | null;
  assign_strategy: 'manual' | 'auto_family' | 'auto_random';
}

export function BulkOperationsModal({
  isOpen,
  onClose,
  operationType,
  selectedGuests,
  onBulkUpdate,
  onBulkDelete,
  coupleId,
  className,
}: BulkOperationsModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Update form state
  const [updateData, setUpdateData] = useState<BulkUpdateData>({});

  // Export form state
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    include_fields: ['name', 'email', 'phone', 'category', 'rsvp_status'],
    include_statistics: true,
    grouping: 'none',
  });

  // Table assignment state
  const [tableOptions, setTableOptions] = useState<TableAssignmentOptions>({
    table_number: null,
    assign_strategy: 'manual',
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setSuccess(null);
      setUpdateData({});
    }
  }, [isOpen]);

  const handleUpdate = async () => {
    if (Object.keys(updateData).length === 0) {
      setError('Please select at least one field to update');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onBulkUpdate(updateData);
      setSuccess(`Successfully updated ${selectedGuests.length} guests`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update guests');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await onBulkDelete();
      setSuccess(`Successfully deleted ${selectedGuests.length} guests`);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete guests');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        action: 'export',
        couple_id: coupleId,
        guest_ids: selectedGuests.join(','),
        format: exportOptions.format,
        include_fields: exportOptions.include_fields.join(','),
        include_statistics: exportOptions.include_statistics.toString(),
        grouping: exportOptions.grouping,
      });

      const response = await fetch(`/api/guests/bulk?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest_ids: selectedGuests,
          export_options: exportOptions,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `guests-export.${exportOptions.format}`;
        a.click();
        window.URL.revokeObjectURL(url);

        setSuccess(`Successfully exported ${selectedGuests.length} guests`);
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Export failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export guests');
    } finally {
      setLoading(false);
    }
  };

  const handleTableAssignment = async () => {
    if (
      tableOptions.assign_strategy === 'manual' &&
      !tableOptions.table_number
    ) {
      setError('Please select a table number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onBulkUpdate({
        table_number: tableOptions.table_number,
      });
      setSuccess(
        `Successfully assigned ${selectedGuests.length} guests to tables`,
      );
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign tables');
    } finally {
      setLoading(false);
    }
  };

  const getModalTitle = () => {
    switch (operationType) {
      case 'update':
        return 'Update Guests';
      case 'delete':
        return 'Delete Guests';
      case 'export':
        return 'Export Guests';
      case 'assign_table':
        return 'Assign Tables';
      case 'send_invitations':
        return 'Send Invitations';
      default:
        return 'Bulk Operation';
    }
  };

  const getModalIcon = () => {
    switch (operationType) {
      case 'update':
        return <PencilSquareIcon className="w-6 h-6 text-blue-600" />;
      case 'delete':
        return <TrashIcon className="w-6 h-6 text-red-600" />;
      case 'export':
        return <ArrowDownTrayIcon className="w-6 h-6 text-green-600" />;
      case 'assign_table':
        return <TableCellsIcon className="w-6 h-6 text-purple-600" />;
      case 'send_invitations':
        return <EnvelopeIcon className="w-6 h-6 text-orange-600" />;
      default:
        return null;
    }
  };

  const renderContent = () => {
    if (success) {
      return (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircleIcon className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {success}
          </AlertDescription>
        </Alert>
      );
    }

    switch (operationType) {
      case 'update':
        return (
          <div className="space-y-6">
            <Alert>
              <ExclamationTriangleIcon className="w-4 h-4" />
              <AlertDescription>
                The following changes will be applied to {selectedGuests.length}{' '}
                selected guests.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  onValueChange={(value) =>
                    setUpdateData((prev) => ({
                      ...prev,
                      category: value as BulkUpdateData['category'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="work">Work</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="side">Wedding Side</Label>
                <Select
                  onValueChange={(value) =>
                    setUpdateData((prev) => ({
                      ...prev,
                      side: value as BulkUpdateData['side'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select side..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="partner1">Partner 1</SelectItem>
                    <SelectItem value="partner2">Partner 2</SelectItem>
                    <SelectItem value="mutual">Mutual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rsvp_status">RSVP Status</Label>
                <Select
                  onValueChange={(value) =>
                    setUpdateData((prev) => ({
                      ...prev,
                      rsvp_status: value as BulkUpdateData['rsvp_status'],
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select RSVP status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="attending">Attending</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="maybe">Maybe</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="table_number">Table Number</Label>
                <Input
                  id="table_number"
                  type="number"
                  min="1"
                  placeholder="Enter table number..."
                  onChange={(e) =>
                    setUpdateData((prev) => ({
                      ...prev,
                      table_number: e.target.value
                        ? parseInt(e.target.value)
                        : undefined,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dietary_restrictions">Dietary Restrictions</Label>
              <Textarea
                id="dietary_restrictions"
                placeholder="Enter dietary restrictions..."
                onChange={(e) =>
                  setUpdateData((prev) => ({
                    ...prev,
                    dietary_restrictions: e.target.value || undefined,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="helper_role">Helper Role</Label>
              <Input
                id="helper_role"
                placeholder="e.g., Usher, Photographer, etc."
                onChange={(e) =>
                  setUpdateData((prev) => ({
                    ...prev,
                    helper_role: e.target.value || undefined,
                  }))
                }
              />
            </div>
          </div>
        );

      case 'delete':
        return (
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>Warning:</strong> This action cannot be undone. You are
                about to permanently delete {selectedGuests.length} guests and
                all their associated data.
              </AlertDescription>
            </Alert>

            <Card className="p-4 bg-gray-50">
              <h4 className="font-medium text-gray-900 mb-2">
                What will be deleted:
              </h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Guest profiles and contact information</li>
                <li>• RSVP responses and preferences</li>
                <li>• Table assignments and seating arrangements</li>
                <li>• Associated household information (if applicable)</li>
                <li>• Any notes or tags attached to these guests</li>
              </ul>
            </Card>

            <p className="text-sm text-gray-600">
              Please type <strong>DELETE</strong> below to confirm:
            </p>
            <Input
              placeholder="Type DELETE to confirm"
              onChange={(e) => {
                // Simple confirmation - in production, you might want more robust validation
              }}
            />
          </div>
        );

      case 'export':
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Export Format</Label>
              <Select
                value={exportOptions.format}
                onValueChange={(value: 'csv' | 'xlsx' | 'pdf') =>
                  setExportOptions((prev) => ({ ...prev, format: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Excel compatible)</SelectItem>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Include Fields</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'name',
                  'email',
                  'phone',
                  'category',
                  'side',
                  'rsvp_status',
                  'age_group',
                  'plus_one',
                  'table_number',
                  'household',
                  'dietary_restrictions',
                  'special_needs',
                ].map((field) => (
                  <label
                    key={field}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={exportOptions.include_fields.includes(field)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setExportOptions((prev) => ({
                            ...prev,
                            include_fields: [...prev.include_fields, field],
                          }));
                        } else {
                          setExportOptions((prev) => ({
                            ...prev,
                            include_fields: prev.include_fields.filter(
                              (f) => f !== field,
                            ),
                          }));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="capitalize">
                      {field.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Grouping</Label>
              <Select
                value={exportOptions.grouping}
                onValueChange={(
                  value: 'none' | 'category' | 'household' | 'table',
                ) => setExportOptions((prev) => ({ ...prev, grouping: value }))}
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

            <div className="flex items-center space-x-2">
              <Switch
                checked={exportOptions.include_statistics}
                onCheckedChange={(checked) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    include_statistics: checked,
                  }))
                }
              />
              <Label>Include summary statistics</Label>
            </div>
          </div>
        );

      case 'assign_table':
        return (
          <div className="space-y-6">
            <Alert>
              <TableCellsIcon className="w-4 h-4" />
              <AlertDescription>
                Assign {selectedGuests.length} guests to wedding reception
                tables.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Assignment Strategy</Label>
                <Select
                  value={tableOptions.assign_strategy}
                  onValueChange={(
                    value: 'manual' | 'auto_family' | 'auto_random',
                  ) =>
                    setTableOptions((prev) => ({
                      ...prev,
                      assign_strategy: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">
                      Manual - Assign to specific table
                    </SelectItem>
                    <SelectItem value="auto_family">
                      Auto - Group families together
                    </SelectItem>
                    <SelectItem value="auto_random">
                      Auto - Distribute evenly
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {tableOptions.assign_strategy === 'manual' && (
                <div className="space-y-2">
                  <Label htmlFor="table_number">Table Number</Label>
                  <Input
                    id="table_number"
                    type="number"
                    min="1"
                    placeholder="Enter table number..."
                    onChange={(e) =>
                      setTableOptions((prev) => ({
                        ...prev,
                        table_number: e.target.value
                          ? parseInt(e.target.value)
                          : null,
                      }))
                    }
                  />
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const renderFooter = () => {
    if (success) {
      return <Button onClick={onClose}>Close</Button>;
    }

    switch (operationType) {
      case 'update':
        return (
          <>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={loading || Object.keys(updateData).length === 0}
            >
              {loading
                ? 'Updating...'
                : `Update ${selectedGuests.length} Guests`}
            </Button>
          </>
        );

      case 'delete':
        return (
          <>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading
                ? 'Deleting...'
                : `Delete ${selectedGuests.length} Guests`}
            </Button>
          </>
        );

      case 'export':
        return (
          <>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading
                ? 'Exporting...'
                : `Export ${selectedGuests.length} Guests`}
            </Button>
          </>
        );

      case 'assign_table':
        return (
          <>
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleTableAssignment} disabled={loading}>
              {loading
                ? 'Assigning...'
                : `Assign ${selectedGuests.length} Guests`}
            </Button>
          </>
        );

      default:
        return <Button onClick={onClose}>Close</Button>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cn('sm:max-w-[600px]', className)}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {getModalIcon()}
            {getModalTitle()}
            <Badge variant="secondary" className="ml-auto">
              {selectedGuests.length} selected
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {error && (
            <Alert className="border-red-200 bg-red-50 mb-4">
              <XCircleIcon className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {renderContent()}
        </div>

        <DialogFooter className="flex gap-2">{renderFooter()}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
