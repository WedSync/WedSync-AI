export interface BulkOperation {
  type:
    | 'status_update'
    | 'tag_add'
    | 'tag_remove'
    | 'delete'
    | 'export'
    | 'email'
    | 'form';
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  requiresConfirmation?: boolean;
  destructive?: boolean;
  mobileOptimized?: boolean;
}

export interface BulkOperationResult {
  success: boolean;
  processedCount: number;
  failedCount: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
  duration: number;
}

export interface BulkSelectionState {
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  lastSelectedIndex: number | null;
  maxSelection: number;
}

export interface MobileBulkActionConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
  requiresConfiguration: boolean;
  order: number;
}

export interface BulkEmailParameters {
  template:
    | 'timeline_request'
    | 'payment_reminder'
    | 'final_details'
    | 'custom';
  custom_message?: string;
  subject?: string;
  send_time?: 'now' | 'scheduled';
  scheduled_time?: string;
}

export interface BulkFormParameters {
  form_id: 'timeline_form' | 'details_form' | 'preferences_form';
  deadline?: string;
  reminder_enabled?: boolean;
}

export interface BulkTagParameters {
  tags: string[];
  replace_existing?: boolean;
}

export interface BulkStatusParameters {
  new_status: 'lead' | 'booked' | 'completed' | 'archived';
  reason?: string;
  notify_client?: boolean;
}

export interface BulkExportParameters {
  format: 'csv' | 'excel' | 'pdf';
  fields: string[];
  include_activities?: boolean;
  include_notes?: boolean;
  date_range?: {
    start: string;
    end: string;
  };
}

export interface TouchGestureState {
  isActive: boolean;
  startY: number;
  currentY: number;
  startTime: number;
  velocity: number;
}

export interface MobileOptimizations {
  hapticFeedback: boolean;
  swipeToSelect: boolean;
  pullToRefresh: boolean;
  offlineSupport: boolean;
  backgroundSync: boolean;
}

export interface BulkOperationMetrics {
  operationType: string;
  clientCount: number;
  duration: number;
  successRate: number;
  averageTimePerItem: number;
  memoryUsage: number;
  networkRequests: number;
  errorTypes: Record<string, number>;
}

export interface OfflineBulkOperation {
  id: string;
  operation: string;
  clientIds: string[];
  parameters: any;
  createdAt: string;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
  lastError?: string;
}

export interface BulkOperationQueue {
  operations: OfflineBulkOperation[];
  isProcessing: boolean;
  addOperation: (
    operation: Omit<
      OfflineBulkOperation,
      'id' | 'createdAt' | 'status' | 'retryCount'
    >,
  ) => void;
  removeOperation: (id: string) => void;
  retryOperation: (id: string) => void;
  processQueue: () => Promise<void>;
  clearCompleted: () => void;
}

// Wedding-specific bulk operation types
export interface WeddingBulkOperations {
  timelineRequest: {
    clientIds: string[];
    weddingDate: string;
    deadlineHours: number;
  };
  finalDetailsCheck: {
    clientIds: string[];
    checklistItems: string[];
    daysBeforeWedding: number;
  };
  paymentReminder: {
    clientIds: string[];
    amountDue: number;
    dueDate: string;
    paymentMethod: string[];
  };
  packageUpgrade: {
    clientIds: string[];
    currentPackage: string;
    suggestedPackage: string;
    upgradeDeadline: string;
  };
}

// Performance monitoring
export interface BulkOperationPerformance {
  startTime: number;
  endTime?: number;
  memoryStart: number;
  memoryPeak: number;
  networkStart: number;
  networkEnd: number;
  batchTimes: number[];
  renderTimes: number[];
}

// Error tracking
export interface BulkOperationError {
  id: string;
  operation: string;
  clientId: string;
  errorType: 'network' | 'validation' | 'permission' | 'server' | 'timeout';
  errorMessage: string;
  timestamp: string;
  retryable: boolean;
  context?: Record<string, any>;
}

// Mobile-specific types
export interface MobileGestureRecognizer {
  onSwipeStart: (e: TouchEvent) => void;
  onSwipeMove: (e: TouchEvent) => void;
  onSwipeEnd: (e: TouchEvent) => void;
  onLongPress: (e: TouchEvent) => void;
  onDoubleTap: (e: TouchEvent) => void;
}

export interface MobileBulkUIState {
  isBottomSheetOpen: boolean;
  selectedAction: string | null;
  configurationStep: number;
  keyboardVisible: boolean;
  orientation: 'portrait' | 'landscape';
}

// Accessibility types
export interface BulkOperationA11y {
  announceSelection: (count: number) => void;
  announceProgress: (progress: number) => void;
  announceCompletion: (result: BulkOperationResult) => void;
  announceError: (error: string) => void;
}

// Integration types for Team dependencies
export interface TeamIntegrationTypes {
  // Team A: Client list selection states
  clientListState: {
    selectedClients: string[];
    filterCriteria: Record<string, any>;
    sortOrder: string;
    viewMode: 'grid' | 'list' | 'table';
  };

  // Team B: Bulk operation API endpoints
  bulkApiEndpoints: {
    execute: string;
    progress: string;
    cancel: string;
    retry: string;
  };

  // Team C: Import progress consistency
  importProgressInterface: {
    showProgress: boolean;
    progressType: 'bulk' | 'import';
    canCancel: boolean;
  };

  // Team E: WedMe mobile UX patterns
  wedMePatterns: {
    actionSheet: boolean;
    floatingButton: boolean;
    swipeGestures: boolean;
    hapticFeedback: boolean;
  };
}
