'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button-untitled';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Square,
  MoreHorizontal,
  Download,
  Tag,
  Trash2,
  Edit,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { ClientData } from '@/components/clients/ClientListViews';
import { BulkOperationsModal } from './BulkOperationsModal';
import { notificationEngine } from '@/lib/notifications/engine';
import { BulkOperation, BulkSelectionInterfaceProps } from './types';

interface LocalBulkSelectionInterfaceProps extends BulkSelectionInterfaceProps {
  clients: ClientData[];
}

const BULK_OPERATIONS: BulkOperation[] = [
  {
    type: 'status_update',
    label: 'Update Status',
    icon: Edit,
    description: 'Change status for selected clients',
    requiresConfirmation: false,
  },
  {
    type: 'tag_add',
    label: 'Add Tags',
    icon: Tag,
    description: 'Add tags to selected clients',
    requiresConfirmation: false,
  },
  {
    type: 'tag_remove',
    label: 'Remove Tags',
    icon: Tag,
    description: 'Remove tags from selected clients',
    requiresConfirmation: false,
  },
  {
    type: 'export',
    label: 'Export to CSV',
    icon: Download,
    description: 'Download selected clients data',
    requiresConfirmation: false,
  },
  {
    type: 'delete',
    label: 'Delete Clients',
    icon: Trash2,
    description: 'Permanently delete selected clients',
    requiresConfirmation: true,
    destructive: true,
  },
];

export function BulkSelectionInterface({
  clients,
  onSelectionChange,
  disabled = false,
}: LocalBulkSelectionInterfaceProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedOperation, setSelectedOperation] =
    useState<BulkOperation | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds));
  }, [selectedIds, onSelectionChange]);

  const toggleSelection = useCallback(
    (clientId: string) => {
      if (disabled) return;

      setSelectedIds((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(clientId)) {
          newSet.delete(clientId);
        } else {
          newSet.add(clientId);
        }
        return newSet;
      });
    },
    [disabled],
  );

  const selectAll = useCallback(() => {
    if (disabled) return;

    if (selectedIds.size === clients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(clients.map((c) => c.id)));
    }
  }, [clients, selectedIds.size, disabled]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBulkOperation = async (operation: BulkOperation) => {
    if (selectedIds.size === 0) return;

    setSelectedOperation(operation);
    setShowBulkModal(true);
  };

  const executeBulkOperation = async (
    operationType: string,
    parameters: any,
  ) => {
    if (selectedIds.size === 0) return;

    setIsProcessing(true);

    try {
      // Send progress notification via Team E's notification system
      await notificationEngine.sendNotification({
        template_id: 'bulk_operation_started',
        recipients: [
          {
            id: 'current_user',
            name: 'User',
            email: 'user@example.com',
            type: 'planner',
            preferences: {
              channels: [{ type: 'in_app', enabled: true, priority: 1 }],
            },
          },
        ],
        variables: {
          operation_type: operationType,
          client_count: selectedIds.size,
          progress: '0%',
        },
        context: {
          wedding_id: 'current_wedding',
          urgency_override: 'normal',
        },
      });

      const response = await fetch('/api/clients/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: operationType,
          clientIds: Array.from(selectedIds),
          parameters,
        }),
      });

      if (!response.ok) {
        throw new Error('Bulk operation failed');
      }

      const result = await response.json();

      // Send completion notification
      await notificationEngine.sendNotification({
        template_id: 'bulk_operation_completed',
        recipients: [
          {
            id: 'current_user',
            name: 'User',
            email: 'user@example.com',
            type: 'planner',
            preferences: {
              channels: [{ type: 'in_app', enabled: true, priority: 1 }],
            },
          },
        ],
        variables: {
          operation_type: operationType,
          client_count: selectedIds.size,
          success_count: result.successCount || selectedIds.size,
          failure_count: result.failureCount || 0,
        },
        context: {
          wedding_id: 'current_wedding',
          urgency_override: 'normal',
        },
      });

      // Clear selection after successful operation
      clearSelection();

      // Refresh the page to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Bulk operation failed:', error);

      // Send error notification
      await notificationEngine.sendNotification({
        template_id: 'bulk_operation_failed',
        recipients: [
          {
            id: 'current_user',
            name: 'User',
            email: 'user@example.com',
            type: 'planner',
            preferences: {
              channels: [{ type: 'in_app', enabled: true, priority: 1 }],
            },
          },
        ],
        variables: {
          operation_type: operationType,
          client_count: selectedIds.size,
          error_message:
            error instanceof Error ? error.message : 'Unknown error',
        },
        context: {
          wedding_id: 'current_wedding',
          urgency_override: 'high',
        },
      });
    } finally {
      setIsProcessing(false);
      setShowBulkModal(false);
      setSelectedOperation(null);
    }
  };

  const selectedClients = clients.filter((client) =>
    selectedIds.has(client.id),
  );
  const isAllSelected =
    selectedIds.size === clients.length && clients.length > 0;
  const isPartiallySelected =
    selectedIds.size > 0 && selectedIds.size < clients.length;

  if (selectedIds.size === 0) {
    return (
      <div className="flex items-center gap-3 text-sm text-gray-500">
        <button
          onClick={selectAll}
          className="flex items-center gap-2 hover:text-gray-700 transition-colors"
          disabled={disabled || clients.length === 0}
        >
          <Square className="w-4 h-4" />
          Select clients to enable bulk actions
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-blue-700 hover:text-blue-800 transition-colors"
            disabled={disabled}
            data-testid="bulk-select-toggle"
          >
            {isAllSelected ? (
              <CheckCircle className="w-5 h-5 text-blue-600" />
            ) : isPartiallySelected ? (
              <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                <div className="w-3 h-0.5 bg-white rounded" />
              </div>
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span className="font-medium">
              {isAllSelected ? 'Deselect All' : 'Select All'}
            </span>
          </button>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span
              className="font-medium text-blue-900"
              data-testid="selection-count"
            >
              {selectedIds.size} client{selectedIds.size !== 1 ? 's' : ''}{' '}
              selected
            </span>
          </div>

          <Badge className="bg-blue-100 text-blue-800 border border-blue-300">
            {Math.round((selectedIds.size / clients.length) * 100)}% selected
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            className="text-blue-700 border-blue-300 hover:bg-blue-100"
            disabled={disabled}
          >
            Clear Selection
          </Button>

          <div className="relative">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={() => setShowBulkModal(true)}
              disabled={disabled || isProcessing}
              data-testid="bulk-actions"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <MoreHorizontal className="w-4 h-4" />
                  Bulk Actions
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Enhanced bulk actions modal */}
      {showBulkModal && (
        <BulkOperationsModal
          isOpen={showBulkModal}
          onClose={() => {
            setShowBulkModal(false);
            setSelectedOperation(null);
          }}
          selectedClients={selectedClients}
          operations={BULK_OPERATIONS}
          selectedOperation={selectedOperation}
          onExecute={executeBulkOperation}
          isProcessing={isProcessing}
        />
      )}
    </>
  );
}

// Hook for integrating bulk selection with existing client list
export function useBulkSelection(clients: ClientData[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkInterface, setShowBulkInterface] = useState(false);

  // Auto-show bulk interface when clients are selected
  useEffect(() => {
    setShowBulkInterface(selectedIds.length > 0);
  }, [selectedIds.length]);

  const isClientSelected = useCallback(
    (clientId: string) => {
      return selectedIds.includes(clientId);
    },
    [selectedIds],
  );

  const toggleClientSelection = useCallback((clientId: string) => {
    setSelectedIds((prev) =>
      prev.includes(clientId)
        ? prev.filter((id) => id !== clientId)
        : [...prev, clientId],
    );
  }, []);

  return {
    selectedIds,
    showBulkInterface,
    isClientSelected,
    toggleClientSelection,
    setSelectedIds,
    selectedClients: clients.filter((c) => selectedIds.includes(c.id)),
  };
}
