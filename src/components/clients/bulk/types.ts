/**
 * Bulk Operations - Shared Type Definitions
 *
 * Shared type definitions for bulk operations to prevent circular dependencies
 * between BulkSelectionInterface and BulkOperationsModal components.
 */

// Bulk operation interface
export interface BulkOperation {
  type: 'status_update' | 'tag_add' | 'tag_remove' | 'delete' | 'export';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  requiresConfirmation?: boolean;
  destructive?: boolean;
}

// Operation parameters interface
export interface OperationParameters {
  status_update: {
    new_status: 'lead' | 'booked' | 'completed' | 'archived';
  };
  tag_add: {
    tags: string[];
  };
  tag_remove: {
    tags: string[];
  };
  delete: {
    confirmation: string;
  };
  export: {
    format: 'csv' | 'excel';
    include_fields: string[];
  };
}

// Bulk selection interface props
export interface BulkSelectionInterfaceProps {
  clients: any[]; // ClientData[] - avoiding import to prevent circular dependency
  onSelectionChange?: (selectedIds: string[]) => void;
  disabled?: boolean;
}

// Bulk operations modal props
export interface BulkOperationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedClients: any[]; // ClientData[] - avoiding import to prevent circular dependency
  operations: BulkOperation[];
  selectedOperation: BulkOperation | null;
  onExecute: (operation: string, parameters: any) => Promise<void>;
  isProcessing: boolean;
}
