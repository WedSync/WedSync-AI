// WS-342: Real-Time Wedding Collaboration - Vendor Coordination Service
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';
import EventStreamingService from '../event-streaming';
import WebSocketManager from '../websocket-manager';
import ConflictResolutionEngine from '../conflict-resolver';
import {
  CollaborationEvent,
  VendorTask,
  VendorCoordinationUpdate,
  CollaborationPermissions,
  VendorCollaborationContext,
  WeddingRole,
} from '../types/collaboration';

interface VendorCoordinationConfig {
  weddingId: string;
  eventStreaming: EventStreamingService;
  websocketManager: WebSocketManager;
  conflictResolver: ConflictResolutionEngine;
}

interface VendorCommunication {
  id: string;
  from_vendor_id: string;
  to_vendor_ids: string[];
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  requires_response: boolean;
  due_date?: Date;
  attachments?: string[];
  created_at: Date;
  responses: VendorResponse[];
}

interface VendorResponse {
  id: string;
  from_vendor_id: string;
  message: string;
  attachments?: string[];
  created_at: Date;
}

interface VendorTaskAssignment {
  id: string;
  task_id: string;
  assigned_to_vendor: string;
  assigned_by: string;
  due_date: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'overdue';
  progress_percentage: number;
  notes?: string;
}

interface VendorAvailability {
  vendor_id: string;
  date: Date;
  time_slots: {
    start: Date;
    end: Date;
    status: 'available' | 'busy' | 'tentative';
    description?: string;
  }[];
  last_updated: Date;
}

export class VendorCoordinationService extends EventEmitter {
  private weddingId: string;
  private eventStreaming: EventStreamingService;
  private websocketManager: WebSocketManager;
  private conflictResolver: ConflictResolutionEngine;

  // Vendor coordination state
  private activeVendorCommunications: Map<string, VendorCommunication> =
    new Map();
  private vendorTaskAssignments: Map<string, VendorTaskAssignment> = new Map();
  private vendorAvailabilities: Map<string, VendorAvailability> = new Map();
  private vendorDependencyGraph: Map<string, string[]> = new Map();
  private urgentNotifications: Map<string, any> = new Map();

  constructor(config: VendorCoordinationConfig) {
    super();
    this.weddingId = config.weddingId;
    this.eventStreaming = config.eventStreaming;
    this.websocketManager = config.websocketManager;
    this.conflictResolver = config.conflictResolver;

    this.setupEventListeners();
    this.startVendorCoordinationMonitoring();
  }

  private setupEventListeners(): void {
    // Listen for vendor coordination events
    this.eventStreaming.on(
      'collaboration_event',
      this.handleCollaborationEvent.bind(this),
    );

    // Listen for vendor task updates
    this.eventStreaming.on(
      'vendor_task_update',
      this.handleVendorTaskUpdate.bind(this),
    );

    // Listen for vendor availability changes
    this.eventStreaming.on(
      'vendor_availability_change',
      this.handleVendorAvailabilityChange.bind(this),
    );

    // Listen for vendor communication
    this.eventStreaming.on(
      'vendor_communication',
      this.handleVendorCommunication.bind(this),
    );
  }

  private startVendorCoordinationMonitoring(): void {
    // Monitor for overdue tasks and urgent communications
    setInterval(() => {
      this.checkOverdueTasks();
      this.checkUrgentCommunications();
    }, 60000); // Check every minute
  }

  // Create vendor-to-vendor communication
  async createVendorCommunication(
    fromVendorId: string,
    communication: {
      to_vendor_ids: string[];
      subject: string;
      message: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      requires_response: boolean;
      due_date?: Date;
      attachments?: string[];
    },
    userRole: WeddingRole,
  ): Promise<{ success: boolean; communication_id?: string }> {
    try {
      const communicationId = `comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const vendorCommunication: VendorCommunication = {
        id: communicationId,
        from_vendor_id: fromVendorId,
        to_vendor_ids: communication.to_vendor_ids,
        subject: communication.subject,
        message: communication.message,
        priority: communication.priority,
        requires_response: communication.requires_response,
        due_date: communication.due_date,
        attachments: communication.attachments || [],
        created_at: new Date(),
        responses: [],
      };

      // Store communication
      this.activeVendorCommunications.set(communicationId, vendorCommunication);

      // Create collaboration event
      const collaborationEvent: CollaborationEvent = {
        id: `vendor_comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'vendor_communication',
        wedding_id: this.weddingId,
        user_id: fromVendorId,
        timestamp: new Date(),
        data: {
          communication: vendorCommunication,
          sender_role: userRole,
        },
        metadata: {
          source: 'vendor_coordination',
          priority: this.getPriorityNumber(communication.priority),
        },
        vector_clock: {},
        priority: this.getPriorityNumber(communication.priority),
      };

      await this.eventStreaming.publishEvent(collaborationEvent);

      // Broadcast to specific vendors
      for (const vendorId of communication.to_vendor_ids) {
        await this.websocketManager.broadcastToUser(
          vendorId,
          collaborationEvent,
        );
      }

      // Also broadcast to couple/coordinators if high priority
      if (
        communication.priority === 'high' ||
        communication.priority === 'urgent'
      ) {
        await this.websocketManager.broadcastToRoom(
          this.weddingId,
          collaborationEvent,
        );
      }

      return {
        success: true,
        communication_id: communicationId,
      };
    } catch (error) {
      console.error('Failed to create vendor communication:', error);
      return {
        success: false,
      };
    }
  }

  // Respond to vendor communication
  async respondToVendorCommunication(
    communicationId: string,
    fromVendorId: string,
    response: {
      message: string;
      attachments?: string[];
    },
  ): Promise<{ success: boolean }> {
    try {
      const communication =
        this.activeVendorCommunications.get(communicationId);
      if (!communication) {
        throw new Error('Communication not found');
      }

      // Check if vendor is authorized to respond
      if (!communication.to_vendor_ids.includes(fromVendorId)) {
        throw new Error(
          'Vendor not authorized to respond to this communication',
        );
      }

      const responseId = `resp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const vendorResponse: VendorResponse = {
        id: responseId,
        from_vendor_id: fromVendorId,
        message: response.message,
        attachments: response.attachments || [],
        created_at: new Date(),
      };

      // Add response to communication
      communication.responses.push(vendorResponse);

      // Create collaboration event for response
      const collaborationEvent: CollaborationEvent = {
        id: `vendor_response_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'vendor_communication_response',
        wedding_id: this.weddingId,
        user_id: fromVendorId,
        timestamp: new Date(),
        data: {
          communication_id: communicationId,
          response: vendorResponse,
          original_sender: communication.from_vendor_id,
        },
        metadata: {
          source: 'vendor_coordination',
          priority: this.getPriorityNumber(communication.priority),
        },
        vector_clock: {},
        priority: this.getPriorityNumber(communication.priority),
      };

      await this.eventStreaming.publishEvent(collaborationEvent);

      // Notify original sender and other participants
      const notifyVendors = [
        communication.from_vendor_id,
        ...communication.to_vendor_ids,
      ].filter((id) => id !== fromVendorId);

      for (const vendorId of notifyVendors) {
        await this.websocketManager.broadcastToUser(
          vendorId,
          collaborationEvent,
        );
      }

      return { success: true };
    } catch (error) {
      console.error('Failed to respond to vendor communication:', error);
      return { success: false };
    }
  }

  // Assign task to vendor
  async assignTaskToVendor(
    assignerId: string,
    assignment: {
      task_id: string;
      assigned_to_vendor: string;
      due_date: Date;
      priority: 'low' | 'medium' | 'high' | 'critical';
      dependencies?: string[];
      notes?: string;
    },
    assignerRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): Promise<{
    success: boolean;
    assignment_id?: string;
    dependency_conflicts?: string[];
  }> {
    try {
      // Check permissions for task assignment
      if (!this.canAssignTasks(assignerRole, permissions)) {
        throw new Error('Insufficient permissions to assign tasks to vendors');
      }

      const assignmentId = `assign_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Check for dependency conflicts
      const dependencyConflicts = await this.checkTaskDependencies(
        assignment.assigned_to_vendor,
        assignment.dependencies || [],
      );

      const taskAssignment: VendorTaskAssignment = {
        id: assignmentId,
        task_id: assignment.task_id,
        assigned_to_vendor: assignment.assigned_to_vendor,
        assigned_by: assignerId,
        due_date: assignment.due_date,
        priority: assignment.priority,
        dependencies: assignment.dependencies || [],
        status: 'pending',
        progress_percentage: 0,
        notes: assignment.notes,
      };

      // Store assignment
      this.vendorTaskAssignments.set(assignmentId, taskAssignment);

      // Update dependency graph
      this.updateDependencyGraph(
        assignment.assigned_to_vendor,
        assignment.dependencies || [],
      );

      // Create collaboration event
      const collaborationEvent: CollaborationEvent = {
        id: `task_assignment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'vendor_task_assigned',
        wedding_id: this.weddingId,
        user_id: assignerId,
        timestamp: new Date(),
        data: {
          assignment: taskAssignment,
          assigner_role: assignerRole,
          dependency_conflicts: dependencyConflicts,
        },
        metadata: {
          source: 'vendor_coordination',
          priority: this.getPriorityNumber(assignment.priority),
        },
        vector_clock: {},
        priority: this.getPriorityNumber(assignment.priority),
      };

      await this.eventStreaming.publishEvent(collaborationEvent);

      // Notify assigned vendor
      await this.websocketManager.broadcastToUser(
        assignment.assigned_to_vendor,
        collaborationEvent,
      );

      // Notify vendors with dependent tasks
      for (const dependentVendor of dependencyConflicts) {
        await this.websocketManager.broadcastToUser(
          dependentVendor,
          collaborationEvent,
        );
      }

      return {
        success: true,
        assignment_id: assignmentId,
        dependency_conflicts:
          dependencyConflicts.length > 0 ? dependencyConflicts : undefined,
      };
    } catch (error) {
      console.error('Failed to assign task to vendor:', error);
      return {
        success: false,
      };
    }
  }

  // Update task progress
  async updateTaskProgress(
    vendorId: string,
    assignmentId: string,
    update: {
      status?: 'pending' | 'in_progress' | 'blocked' | 'completed' | 'overdue';
      progress_percentage?: number;
      notes?: string;
      blocking_reason?: string;
      estimated_completion?: Date;
    },
  ): Promise<{ success: boolean; notifications_sent?: string[] }> {
    try {
      const assignment = this.vendorTaskAssignments.get(assignmentId);
      if (!assignment) {
        throw new Error('Task assignment not found');
      }

      // Verify vendor authorization
      if (assignment.assigned_to_vendor !== vendorId) {
        throw new Error('Vendor not authorized to update this task');
      }

      // Update assignment
      if (update.status) assignment.status = update.status;
      if (update.progress_percentage !== undefined)
        assignment.progress_percentage = update.progress_percentage;
      if (update.notes) assignment.notes = update.notes;

      // Create collaboration event
      const collaborationEvent: CollaborationEvent = {
        id: `task_progress_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'vendor_task_progress',
        wedding_id: this.weddingId,
        user_id: vendorId,
        timestamp: new Date(),
        data: {
          assignment_id: assignmentId,
          task_id: assignment.task_id,
          update: update,
          previous_status: assignment.status,
          current_progress: assignment.progress_percentage,
        },
        metadata: {
          source: 'vendor_coordination',
          priority: this.getPriorityNumber(assignment.priority),
        },
        vector_clock: {},
        priority: this.getPriorityNumber(assignment.priority),
      };

      await this.eventStreaming.publishEvent(collaborationEvent);

      // Determine who to notify
      const notificationsTo: string[] = [assignment.assigned_by];

      // Notify dependent vendors if task is completed or blocked
      if (update.status === 'completed' || update.status === 'blocked') {
        const dependentVendors = this.getDependentVendors(assignment.task_id);
        notificationsTo.push(...dependentVendors);
      }

      // Send notifications
      for (const userId of notificationsTo) {
        await this.websocketManager.broadcastToUser(userId, collaborationEvent);
      }

      // Broadcast to room if critical task
      if (assignment.priority === 'critical') {
        await this.websocketManager.broadcastToRoom(
          this.weddingId,
          collaborationEvent,
        );
      }

      return {
        success: true,
        notifications_sent: notificationsTo,
      };
    } catch (error) {
      console.error('Failed to update task progress:', error);
      return {
        success: false,
      };
    }
  }

  // Update vendor availability
  async updateVendorAvailability(
    vendorId: string,
    availability: {
      date: Date;
      time_slots: {
        start: Date;
        end: Date;
        status: 'available' | 'busy' | 'tentative';
        description?: string;
      }[];
    },
  ): Promise<{ success: boolean; coordination_needed?: boolean }> {
    try {
      const vendorAvailability: VendorAvailability = {
        vendor_id: vendorId,
        date: availability.date,
        time_slots: availability.time_slots,
        last_updated: new Date(),
      };

      // Store availability
      this.vendorAvailabilities.set(
        `${vendorId}_${availability.date.toISOString().split('T')[0]}`,
        vendorAvailability,
      );

      // Check if this affects any scheduled coordination
      const coordinationNeeded = await this.checkAvailabilityImpact(
        vendorId,
        availability,
      );

      // Create collaboration event
      const collaborationEvent: CollaborationEvent = {
        id: `vendor_availability_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'vendor_availability_update',
        wedding_id: this.weddingId,
        user_id: vendorId,
        timestamp: new Date(),
        data: {
          vendor_id: vendorId,
          availability: vendorAvailability,
          coordination_needed: coordinationNeeded,
        },
        metadata: {
          source: 'vendor_coordination',
          priority: 3,
        },
        vector_clock: {},
        priority: 3,
      };

      await this.eventStreaming.publishEvent(collaborationEvent);

      // Broadcast to coordinators and other vendors if coordination needed
      if (coordinationNeeded) {
        await this.websocketManager.broadcastToRoom(
          this.weddingId,
          collaborationEvent,
        );
      }

      return {
        success: true,
        coordination_needed: coordinationNeeded,
      };
    } catch (error) {
      console.error('Failed to update vendor availability:', error);
      return {
        success: false,
      };
    }
  }

  // Get vendor coordination dashboard
  async getVendorCoordinationDashboard(viewerRole: WeddingRole): Promise<{
    active_communications: VendorCommunication[];
    task_assignments: VendorTaskAssignment[];
    vendor_availabilities: VendorAvailability[];
    urgent_items: any[];
    coordination_metrics: any;
  }> {
    const activeCommunications = Array.from(
      this.activeVendorCommunications.values(),
    );
    const taskAssignments = Array.from(this.vendorTaskAssignments.values());
    const vendorAvailabilities = Array.from(this.vendorAvailabilities.values());
    const urgentItems = Array.from(this.urgentNotifications.values());

    const coordinationMetrics = {
      total_vendors: new Set([
        ...activeCommunications.map((c) => c.from_vendor_id),
        ...activeCommunications.flatMap((c) => c.to_vendor_ids),
        ...taskAssignments.map((t) => t.assigned_to_vendor),
      ]).size,
      active_communications: activeCommunications.length,
      pending_tasks: taskAssignments.filter((t) => t.status === 'pending')
        .length,
      overdue_tasks: taskAssignments.filter((t) => t.status === 'overdue')
        .length,
      completed_tasks: taskAssignments.filter((t) => t.status === 'completed')
        .length,
      urgent_items: urgentItems.length,
    };

    return {
      active_communications: activeCommunications,
      task_assignments: taskAssignments,
      vendor_availabilities: vendorAvailabilities,
      urgent_items: urgentItems,
      coordination_metrics: coordinationMetrics,
    };
  }

  // Private helper methods
  private canAssignTasks(
    userRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): boolean {
    return (
      permissions.can_manage_tasks ||
      userRole === 'couple' ||
      userRole === 'wedding_coordinator'
    );
  }

  private getPriorityNumber(priority: string): number {
    const priorityMap: { [key: string]: number } = {
      low: 1,
      medium: 3,
      high: 4,
      urgent: 5,
      critical: 5,
    };
    return priorityMap[priority] || 3;
  }

  private async checkTaskDependencies(
    vendorId: string,
    dependencies: string[],
  ): Promise<string[]> {
    const conflicts: string[] = [];

    // Check if any dependencies create circular references or conflicts
    for (const dep of dependencies) {
      if (this.vendorDependencyGraph.get(dep)?.includes(vendorId)) {
        conflicts.push(dep);
      }
    }

    return conflicts;
  }

  private updateDependencyGraph(
    vendorId: string,
    dependencies: string[],
  ): void {
    this.vendorDependencyGraph.set(vendorId, dependencies);
  }

  private getDependentVendors(taskId: string): string[] {
    const dependentVendors: string[] = [];

    for (const [vendorId, deps] of this.vendorDependencyGraph.entries()) {
      if (deps.includes(taskId)) {
        dependentVendors.push(vendorId);
      }
    }

    return dependentVendors;
  }

  private async checkAvailabilityImpact(
    vendorId: string,
    availability: any,
  ): Promise<boolean> {
    // Check if availability change affects scheduled events or other vendors
    // This would involve checking against timeline events and coordination requests
    return false;
  }

  private async checkOverdueTasks(): Promise<void> {
    const now = new Date();

    for (const [id, assignment] of this.vendorTaskAssignments.entries()) {
      if (assignment.due_date < now && assignment.status !== 'completed') {
        if (assignment.status !== 'overdue') {
          assignment.status = 'overdue';

          // Create urgent notification
          const urgentNotification = {
            id: `overdue_${id}`,
            type: 'task_overdue',
            vendor_id: assignment.assigned_to_vendor,
            task_id: assignment.task_id,
            due_date: assignment.due_date,
            days_overdue: Math.floor(
              (now.getTime() - assignment.due_date.getTime()) /
                (1000 * 60 * 60 * 24),
            ),
            priority: assignment.priority,
            created_at: now,
          };

          this.urgentNotifications.set(
            urgentNotification.id,
            urgentNotification,
          );
        }
      }
    }
  }

  private async checkUrgentCommunications(): Promise<void> {
    const urgentThreshold = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    for (const [id, comm] of this.activeVendorCommunications.entries()) {
      if (
        comm.priority === 'urgent' &&
        comm.requires_response &&
        comm.responses.length === 0 &&
        comm.created_at < urgentThreshold
      ) {
        const urgentNotification = {
          id: `urgent_comm_${id}`,
          type: 'urgent_communication_no_response',
          communication_id: id,
          from_vendor: comm.from_vendor_id,
          to_vendors: comm.to_vendor_ids,
          subject: comm.subject,
          hours_since: Math.floor(
            (Date.now() - comm.created_at.getTime()) / (1000 * 60 * 60),
          ),
          created_at: new Date(),
        };

        this.urgentNotifications.set(urgentNotification.id, urgentNotification);
      }
    }
  }

  // Event handlers
  private async handleCollaborationEvent(
    event: CollaborationEvent,
  ): Promise<void> {
    switch (event.type) {
      case 'vendor_communication':
        await this.processVendorCommunication(event);
        break;
      case 'vendor_task_assigned':
        await this.processTaskAssignment(event);
        break;
      case 'vendor_task_progress':
        await this.processTaskProgress(event);
        break;
    }
  }

  private async handleVendorTaskUpdate(event: any): Promise<void> {
    // Handle task updates from external sources
    console.log('Vendor task update:', event);
  }

  private async handleVendorAvailabilityChange(event: any): Promise<void> {
    // Handle availability changes
    if (event.vendor_id) {
      // Update local cache or trigger coordination checks
    }
  }

  private async handleVendorCommunication(event: any): Promise<void> {
    // Handle vendor communication events
    console.log('Vendor communication:', event);
  }

  private async processVendorCommunication(
    event: CollaborationEvent,
  ): Promise<void> {
    this.emit('vendor_communication_processed', event);
  }

  private async processTaskAssignment(
    event: CollaborationEvent,
  ): Promise<void> {
    this.emit('task_assignment_processed', event);
  }

  private async processTaskProgress(event: CollaborationEvent): Promise<void> {
    this.emit('task_progress_processed', event);
  }
}
