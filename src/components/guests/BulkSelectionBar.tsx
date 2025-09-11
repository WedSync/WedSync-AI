'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  XMarkIcon,
  PencilSquareIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  TableCellsIcon,
  EnvelopeIcon,
  CheckIcon,
} from '@heroicons/react/20/solid';
import { cn } from '@/lib/utils';

interface BulkSelectionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkUpdate: () => void;
  onBulkDelete: () => void;
  onBulkExport: () => void;
  onTableAssignment: () => void;
  onSendInvitations?: () => void;
  className?: string;
}

export function BulkSelectionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkUpdate,
  onBulkDelete,
  onBulkExport,
  onTableAssignment,
  onSendInvitations,
  className,
}: BulkSelectionBarProps) {
  const isAllSelected = selectedCount === totalCount;

  return (
    <div
      className={cn(
        'bg-primary-50 border border-primary-200 rounded-lg p-4',
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
        'animate-in slide-in-from-top-2 duration-200',
        className,
      )}
      data-testid="bulk-selection-bar"
    >
      {/* Selection Info */}
      <div className="flex items-center gap-3">
        <Badge
          variant="secondary"
          className="bg-primary-100 text-primary-800 border-primary-300"
        >
          {selectedCount} selected
        </Badge>

        <div className="text-sm text-primary-700">
          {selectedCount} of {totalCount} guests selected
        </div>

        <div className="hidden sm:flex items-center gap-2">
          {!isAllSelected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="text-primary-700 hover:text-primary-900 hover:bg-primary-100 h-8"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Select all {totalCount}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-primary-700 hover:text-primary-900 hover:bg-primary-100 h-8"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Clear selection
          </Button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkUpdate}
          className="bg-white border-primary-300 text-primary-700 hover:bg-primary-50"
          data-testid="bulk-update-btn"
        >
          <PencilSquareIcon className="w-4 h-4 mr-2" />
          Update
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onBulkExport}
          className="bg-white border-primary-300 text-primary-700 hover:bg-primary-50"
          data-testid="bulk-export-btn"
        >
          <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
          Export
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onTableAssignment}
          className="bg-white border-primary-300 text-primary-700 hover:bg-primary-50"
          data-testid="bulk-table-assignment-btn"
        >
          <TableCellsIcon className="w-4 h-4 mr-2" />
          Assign Tables
        </Button>

        {onSendInvitations && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSendInvitations}
            className="bg-white border-primary-300 text-primary-700 hover:bg-primary-50"
          >
            <EnvelopeIcon className="w-4 h-4 mr-2" />
            Send Invitations
          </Button>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onBulkDelete}
          className="bg-white border-red-300 text-red-700 hover:bg-red-50"
          data-testid="bulk-delete-btn"
        >
          <TrashIcon className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>

      {/* Mobile Clear Button */}
      <div className="sm:hidden w-full">
        <div className="flex items-center gap-2">
          {!isAllSelected && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onSelectAll}
              className="text-primary-700 hover:text-primary-900 hover:bg-primary-100 flex-1"
            >
              <CheckIcon className="w-4 h-4 mr-1" />
              Select all {totalCount}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            className="text-primary-700 hover:text-primary-900 hover:bg-primary-100 flex-1"
          >
            <XMarkIcon className="w-4 h-4 mr-1" />
            Clear selection
          </Button>
        </div>
      </div>
    </div>
  );
}
