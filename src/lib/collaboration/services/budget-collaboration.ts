// WS-342: Real-Time Wedding Collaboration - Budget Collaboration Service
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';
import EventStreamingService from '../event-streaming';
import WebSocketManager from '../websocket-manager';
import ConflictResolutionEngine from '../conflict-resolver';
import {
  CollaborationEvent,
  BudgetItem,
  BudgetUpdate,
  CollaborationPermissions,
  VendorCollaborationContext,
  WeddingRole,
} from '../types/collaboration';

interface BudgetCollaborationConfig {
  weddingId: string;
  eventStreaming: EventStreamingService;
  websocketManager: WebSocketManager;
  conflictResolver: ConflictResolutionEngine;
}

interface BudgetAlert {
  id: string;
  type:
    | 'overspend'
    | 'vendor_estimate_change'
    | 'payment_due'
    | 'category_limit';
  category?: string;
  vendor_id?: string;
  amount: number;
  threshold?: number;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: Date;
}

interface BudgetCollaborationSession {
  userId: string;
  category?: string;
  itemId?: string;
  lastActivity: Date;
  editingType: 'amount' | 'description' | 'vendor' | 'notes';
}

export class BudgetCollaborationService extends EventEmitter {
  private weddingId: string;
  private eventStreaming: EventStreamingService;
  private websocketManager: WebSocketManager;
  private conflictResolver: ConflictResolutionEngine;

  // Budget-specific state
  private activeBudgetEditors: Map<string, BudgetCollaborationSession> =
    new Map();
  private pendingBudgetUpdates: Map<string, BudgetUpdate[]> = new Map();
  private vendorQuoteCache: Map<string, any> = new Map();
  private budgetAlerts: Map<string, BudgetAlert> = new Map();
  private budgetSnapshot: Map<string, any> = new Map();

  constructor(config: BudgetCollaborationConfig) {
    super();
    this.weddingId = config.weddingId;
    this.eventStreaming = config.eventStreaming;
    this.websocketManager = config.websocketManager;
    this.conflictResolver = config.conflictResolver;

    this.setupEventListeners();
    this.startBudgetMonitoring();
  }

  private setupEventListeners(): void {
    // Listen for budget collaboration events
    this.eventStreaming.on(
      'collaboration_event',
      this.handleCollaborationEvent.bind(this),
    );

    // Listen for vendor quote updates
    this.eventStreaming.on(
      'vendor_quote_update',
      this.handleVendorQuoteUpdate.bind(this),
    );

    // Listen for payment events
    this.eventStreaming.on(
      'payment_processed',
      this.handlePaymentProcessed.bind(this),
    );

    // Listen for budget conflicts
    this.conflictResolver.on(
      'budget_conflict_detected',
      this.handleBudgetConflict.bind(this),
    );
  }

  private startBudgetMonitoring(): void {
    // Start periodic budget monitoring for alerts
    setInterval(() => {
      this.checkBudgetAlerts();
    }, 30000); // Check every 30 seconds
  }

  // Start editing a budget item
  async startEditingBudgetItem(
    userId: string,
    itemId: string,
    category: string,
    editingType: 'amount' | 'description' | 'vendor' | 'notes',
    userRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): Promise<{
    success: boolean;
    lockAcquired: boolean;
    currentEditor?: string;
  }> {
    try {
      // Check permissions
      if (!this.canEditBudget(userRole, permissions)) {
        throw new Error('Insufficient permissions to edit budget');
      }

      const lockKey = `${itemId}_${editingType}`;
      const currentEditor = this.activeBudgetEditors.get(lockKey);

      if (currentEditor && currentEditor.userId !== userId) {
        // Check if current editor is still active (within 30 seconds)
        const inactiveThreshold = new Date(Date.now() - 30000);

        if (currentEditor.lastActivity > inactiveThreshold) {
          return {
            success: true,
            lockAcquired: false,
            currentEditor: currentEditor.userId,
          };
        } else {
          // Remove inactive editor
          this.activeBudgetEditors.delete(lockKey);
        }
      }

      // Acquire editing lock
      this.activeBudgetEditors.set(lockKey, {
        userId,
        category,
        itemId,
        lastActivity: new Date(),
        editingType,
      });

      // Broadcast budget editing start event
      const collaborationEvent: CollaborationEvent = {
        id: `budget_edit_start_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'budget_edit_start',
        wedding_id: this.weddingId,
        user_id: userId,
        timestamp: new Date(),
        data: {
          item_id: itemId,
          category: category,
          editing_type: editingType,
          user_role: userRole,
        },
        metadata: {
          source: 'budget_collaboration',
          priority: 3,
        },
        vector_clock: {},
        priority: 3,
      };

      await this.eventStreaming.publishEvent(collaborationEvent);
      await this.websocketManager.broadcastToRoom(
        this.weddingId,
        collaborationEvent,
      );

      return {
        success: true,
        lockAcquired: true,
      };
    } catch (error) {
      console.error('Failed to start editing budget item:', error);
      return {
        success: false,
        lockAcquired: false,
      };
    }
  }

  // Update budget item with real-time collaboration
  async updateBudgetItem(
    userId: string,
    itemId: string,
    update: BudgetUpdate,
    userRole: WeddingRole,
  ): Promise<{ success: boolean; alerts?: BudgetAlert[]; conflicts?: any[] }> {
    try {
      const lockKey = `${itemId}_${update.field}`;
      const currentEditor = this.activeBudgetEditors.get(lockKey);

      if (!currentEditor || currentEditor.userId !== userId) {
        throw new Error('No editing lock acquired for this budget item');
      }

      // Update last activity
      currentEditor.lastActivity = new Date();

      // Validate budget update
      const validationResult = await this.validateBudgetUpdate(update);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Check for budget conflicts and overspend alerts
      const conflicts = await this.checkBudgetConflicts(itemId, update);
      const alerts = await this.checkBudgetAlerts(update);

      // Apply operational transformation for concurrent edits
      const transformedUpdate = await this.applyBudgetTransform(itemId, update);

      // Add to pending updates queue
      if (!this.pendingBudgetUpdates.has(itemId)) {
        this.pendingBudgetUpdates.set(itemId, []);
      }
      this.pendingBudgetUpdates.get(itemId)!.push(transformedUpdate);

      // Broadcast budget update event
      const collaborationEvent: CollaborationEvent = {
        id: `budget_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'budget_change',
        wedding_id: this.weddingId,
        user_id: userId,
        timestamp: new Date(),
        data: {
          item_id: itemId,
          update: transformedUpdate,
          user_role: userRole,
          budget_alerts: alerts,
          conflicts: conflicts,
        },
        metadata: {
          source: 'budget_collaboration',
          priority: 4,
        },
        vector_clock: {},
        priority: 4,
      };

      await this.eventStreaming.publishEvent(collaborationEvent);
      await this.websocketManager.broadcastToRoom(
        this.weddingId,
        collaborationEvent,
        userId,
      );

      // Handle critical overspend alerts
      const criticalAlerts = alerts.filter(
        (alert) => alert.priority === 'critical',
      );
      if (criticalAlerts.length > 0) {
        await this.escalateBudgetAlert(criticalAlerts, userRole);
      }

      return {
        success: true,
        alerts: alerts.length > 0 ? alerts : undefined,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      console.error('Failed to update budget item:', error);
      return {
        success: false,
      };
    }
  }

  // Handle vendor quote submissions
  async handleVendorQuoteSubmission(
    vendorUserId: string,
    vendorId: string,
    quote: {
      item_id?: string;
      category: string;
      amount: number;
      description: string;
      breakdown?: any[];
      valid_until: Date;
      terms?: string;
    },
  ): Promise<{
    success: boolean;
    budget_impact?: any;
    approval_needed?: boolean;
  }> {
    try {
      // Create vendor quote event
      const collaborationEvent: CollaborationEvent = {
        id: `vendor_quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'vendor_quote_submitted',
        wedding_id: this.weddingId,
        user_id: vendorUserId,
        timestamp: new Date(),
        data: {
          vendor_id: vendorId,
          quote: quote,
          submission_timestamp: new Date(),
        },
        metadata: {
          source: 'budget_collaboration',
          priority: 4,
        },
        vector_clock: {},
        priority: 4,
      };

      // Calculate budget impact
      const budgetImpact = await this.calculateBudgetImpact(quote);

      // Check if approval is needed (significant budget changes)
      const approvalNeeded =
        budgetImpact.variance_percentage > 10 ||
        budgetImpact.total_overspend > 0;

      // Update vendor quote cache
      this.vendorQuoteCache.set(`${vendorId}_${quote.category}`, {
        ...quote,
        submitted_at: new Date(),
        status: approvalNeeded ? 'pending_approval' : 'submitted',
      });

      await this.eventStreaming.publishEvent(collaborationEvent);
      await this.websocketManager.broadcastToRoom(
        this.weddingId,
        collaborationEvent,
      );

      // Generate budget alerts if needed
      if (budgetImpact.alerts.length > 0) {
        await this.generateBudgetAlerts(budgetImpact.alerts);
      }

      return {
        success: true,
        budget_impact: budgetImpact,
        approval_needed: approvalNeeded,
      };
    } catch (error) {
      console.error('Failed to handle vendor quote submission:', error);
      return {
        success: false,
      };
    }
  }

  // Handle budget approval workflow
  async handleBudgetApproval(
    approverId: string,
    approverRole: WeddingRole,
    approval: {
      item_id?: string;
      vendor_quote_id?: string;
      action: 'approve' | 'reject' | 'request_changes';
      amount_adjustment?: number;
      notes?: string;
    },
  ): Promise<{ success: boolean; budget_updated?: boolean }> {
    try {
      // Check approval permissions
      if (!this.canApproveBudget(approverRole)) {
        throw new Error('Insufficient permissions to approve budget changes');
      }

      let budgetUpdated = false;

      // Process the approval
      if (approval.action === 'approve') {
        if (approval.vendor_quote_id) {
          // Apply vendor quote to budget
          budgetUpdated = await this.applyVendorQuoteToBudget(
            approval.vendor_quote_id,
            approval.amount_adjustment,
          );
        }
      }

      // Create approval event
      const collaborationEvent: CollaborationEvent = {
        id: `budget_approval_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'budget_approval',
        wedding_id: this.weddingId,
        user_id: approverId,
        timestamp: new Date(),
        data: {
          approval: approval,
          approver_role: approverRole,
          budget_updated: budgetUpdated,
        },
        metadata: {
          source: 'budget_collaboration',
          priority: 5,
        },
        vector_clock: {},
        priority: 5,
      };

      await this.eventStreaming.publishEvent(collaborationEvent);
      await this.websocketManager.broadcastToRoom(
        this.weddingId,
        collaborationEvent,
      );

      return {
        success: true,
        budget_updated: budgetUpdated,
      };
    } catch (error) {
      console.error('Failed to handle budget approval:', error);
      return {
        success: false,
      };
    }
  }

  // Get real-time budget collaboration status
  async getBudgetCollaborationStatus(): Promise<{
    active_editors: any[];
    pending_updates_count: number;
    budget_alerts: BudgetAlert[];
    vendor_quotes: any[];
    budget_health: any;
  }> {
    const activeEditors = Array.from(this.activeBudgetEditors.entries()).map(
      ([lockKey, editor]) => ({
        lock_key: lockKey,
        user_id: editor.userId,
        item_id: editor.itemId,
        category: editor.category,
        editing_type: editor.editingType,
        last_activity: editor.lastActivity,
      }),
    );

    const pendingUpdatesCount = Array.from(
      this.pendingBudgetUpdates.values(),
    ).reduce((total, updates) => total + updates.length, 0);

    const budgetAlerts = Array.from(this.budgetAlerts.values());

    const vendorQuotes = Array.from(this.vendorQuoteCache.values());

    const budgetHealth = await this.calculateBudgetHealth();

    return {
      active_editors: activeEditors,
      pending_updates_count: pendingUpdatesCount,
      budget_alerts: budgetAlerts,
      vendor_quotes: vendorQuotes,
      budget_health: budgetHealth,
    };
  }

  // Finish editing budget item
  async finishEditingBudgetItem(
    userId: string,
    itemId: string,
    editingType: string,
    saveChanges: boolean = true,
  ): Promise<{ success: boolean }> {
    try {
      const lockKey = `${itemId}_${editingType}`;
      const currentEditor = this.activeBudgetEditors.get(lockKey);

      if (!currentEditor || currentEditor.userId !== userId) {
        throw new Error('No editing lock acquired for this budget item');
      }

      // Apply pending updates if saving changes
      if (saveChanges && this.pendingBudgetUpdates.has(itemId)) {
        const updates = this.pendingBudgetUpdates.get(itemId)!;
        await this.applyPendingBudgetUpdates(itemId, updates);
        this.pendingBudgetUpdates.delete(itemId);
      } else if (!saveChanges) {
        // Discard pending updates
        this.pendingBudgetUpdates.delete(itemId);
      }

      // Release lock
      this.activeBudgetEditors.delete(lockKey);

      // Broadcast budget editing end event
      const collaborationEvent: CollaborationEvent = {
        id: `budget_edit_end_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'budget_edit_end',
        wedding_id: this.weddingId,
        user_id: userId,
        timestamp: new Date(),
        data: {
          item_id: itemId,
          editing_type: editingType,
          changes_saved: saveChanges,
        },
        metadata: {
          source: 'budget_collaboration',
          priority: 2,
        },
        vector_clock: {},
        priority: 2,
      };

      await this.eventStreaming.publishEvent(collaborationEvent);
      await this.websocketManager.broadcastToRoom(
        this.weddingId,
        collaborationEvent,
      );

      return { success: true };
    } catch (error) {
      console.error('Failed to finish editing budget item:', error);
      return { success: false };
    }
  }

  // Private helper methods
  private canEditBudget(
    userRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): boolean {
    return (
      permissions.can_edit_budget ||
      userRole === 'couple' ||
      userRole === 'wedding_coordinator'
    );
  }

  private canApproveBudget(userRole: WeddingRole): boolean {
    return userRole === 'couple' || userRole === 'wedding_coordinator';
  }

  private async validateBudgetUpdate(
    update: BudgetUpdate,
  ): Promise<{ valid: boolean; error?: string }> {
    // Validate amount is positive
    if (update.field === 'amount' && update.value < 0) {
      return { valid: false, error: 'Budget amount cannot be negative' };
    }

    // Add more validation rules as needed
    return { valid: true };
  }

  private async checkBudgetConflicts(
    itemId: string,
    update: BudgetUpdate,
  ): Promise<any[]> {
    // Implementation would check for concurrent edits and conflicts
    return [];
  }

  private async checkBudgetAlerts(
    update?: BudgetUpdate,
  ): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];

    // Check for overspend alerts
    if (update && update.field === 'amount') {
      // Implementation would check against category limits and total budget
    }

    return alerts;
  }

  private async applyBudgetTransform(
    itemId: string,
    update: BudgetUpdate,
  ): Promise<BudgetUpdate> {
    // Implement operational transformation for budget updates
    return update;
  }

  private async calculateBudgetImpact(quote: any): Promise<any> {
    // Calculate impact of vendor quote on overall budget
    return {
      variance_percentage: 0,
      total_overspend: 0,
      alerts: [],
    };
  }

  private async generateBudgetAlerts(alertData: any[]): Promise<void> {
    for (const data of alertData) {
      const alert: BudgetAlert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: data.type,
        category: data.category,
        vendor_id: data.vendor_id,
        amount: data.amount,
        threshold: data.threshold,
        message: data.message,
        priority: data.priority,
        created_at: new Date(),
      };

      this.budgetAlerts.set(alert.id, alert);
    }
  }

  private async escalateBudgetAlert(
    alerts: BudgetAlert[],
    userRole: WeddingRole,
  ): Promise<void> {
    for (const alert of alerts) {
      const escalationEvent: CollaborationEvent = {
        id: `budget_escalation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'budget_alert_escalation',
        wedding_id: this.weddingId,
        user_id: 'system',
        timestamp: new Date(),
        data: {
          alert: alert,
          escalation_reason: 'critical_overspend',
          requires_approval: true,
        },
        metadata: {
          source: 'budget_collaboration',
          priority: 5,
        },
        vector_clock: {},
        priority: 5,
      };

      await this.eventStreaming.publishEvent(escalationEvent);
      await this.websocketManager.broadcastToRoom(
        this.weddingId,
        escalationEvent,
      );
    }
  }

  private async applyVendorQuoteToBudget(
    quoteId: string,
    adjustment?: number,
  ): Promise<boolean> {
    // Implementation would apply vendor quote to budget items
    return true;
  }

  private async calculateBudgetHealth(): Promise<any> {
    // Calculate overall budget health metrics
    return {
      total_budget: 0,
      total_spent: 0,
      remaining_budget: 0,
      overspend_categories: [],
      vendor_quote_pending: 0,
    };
  }

  private async applyPendingBudgetUpdates(
    itemId: string,
    updates: BudgetUpdate[],
  ): Promise<void> {
    // Implementation would apply updates to database
    console.log(
      `Applying ${updates.length} pending budget updates for item ${itemId}`,
    );
  }

  // Event handlers
  private async handleCollaborationEvent(
    event: CollaborationEvent,
  ): Promise<void> {
    switch (event.type) {
      case 'budget_change':
        await this.processBudgetUpdate(event);
        break;
      case 'vendor_quote_submitted':
        await this.processVendorQuote(event);
        break;
      case 'budget_approval':
        await this.processBudgetApproval(event);
        break;
    }
  }

  private async handleVendorQuoteUpdate(event: any): Promise<void> {
    // Update vendor quote cache
    if (event.vendor_id && event.category) {
      this.vendorQuoteCache.set(
        `${event.vendor_id}_${event.category}`,
        event.quote,
      );
    }
  }

  private async handlePaymentProcessed(event: any): Promise<void> {
    // Update budget with actual payment
    console.log('Payment processed:', event);
  }

  private async handleBudgetConflict(conflict: any): Promise<void> {
    // Handle budget-specific conflicts
    console.log('Budget conflict detected:', conflict);
  }

  private async processBudgetUpdate(event: CollaborationEvent): Promise<void> {
    this.emit('budget_updated', event);
  }

  private async processVendorQuote(event: CollaborationEvent): Promise<void> {
    this.emit('vendor_quote_received', event);
  }

  private async processBudgetApproval(
    event: CollaborationEvent,
  ): Promise<void> {
    this.emit('budget_approval_processed', event);
  }
}
