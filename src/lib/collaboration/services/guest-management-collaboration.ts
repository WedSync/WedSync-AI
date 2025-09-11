// WS-342: Real-Time Wedding Collaboration - Guest Management Collaboration Service
// Team B Backend Development - Batch 1 Round 1

import { EventEmitter } from 'events';
import EventStreamingService from '../event-streaming';
import WebSocketManager from '../websocket-manager';
import ConflictResolutionEngine from '../conflict-resolver';
import {
  CollaborationEvent,
  GuestUpdate,
  RSVPUpdate,
  CollaborationPermissions,
  WeddingRole,
} from '../types/collaboration';

interface GuestManagementConfig {
  weddingId: string;
  eventStreaming: EventStreamingService;
  websocketManager: WebSocketManager;
  conflictResolver: ConflictResolutionEngine;
}

interface Guest {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  party_size: number;
  dietary_restrictions?: string[];
  accommodation_needed: boolean;
  transport_needed: boolean;
  plus_one_allowed: boolean;
  table_assignment?: string;
  rsvp_status: 'pending' | 'attending' | 'not_attending' | 'maybe';
  rsvp_date?: Date;
  guest_type: 'bride_side' | 'groom_side' | 'mutual';
  special_requirements?: string;
  contact_preference: 'email' | 'phone' | 'mail';
  created_at: Date;
  updated_at: Date;
}

interface RSVPResponse {
  id: string;
  guest_id: string;
  response_status: 'attending' | 'not_attending' | 'maybe';
  attending_count: number;
  dietary_requirements?: string[];
  accommodation_request?: string;
  transport_request?: string;
  song_requests?: string[];
  special_requests?: string;
  response_date: Date;
  response_method: 'online' | 'phone' | 'email' | 'mail';
}

interface GuestListUpdate {
  field: keyof Guest;
  value: any;
  previous_value?: any;
  updated_by: string;
  update_reason?: string;
}

interface SeatingArrangement {
  table_id: string;
  table_name: string;
  capacity: number;
  assigned_guests: string[];
  special_requirements?: string[];
  location_preference?: string;
}

export class GuestManagementCollaborationService extends EventEmitter {
  private weddingId: string;
  private eventStreaming: EventStreamingService;
  private websocketManager: WebSocketManager;
  private conflictResolver: ConflictResolutionEngine;

  // Guest management state
  private activeGuestEditors: Map<
    string,
    { userId: string; guestId: string; lastActivity: Date; field?: string }
  > = new Map();
  private pendingGuestUpdates: Map<string, GuestListUpdate[]> = new Map();
  private pendingRSVPs: Map<string, RSVPResponse> = new Map();
  private seatingArrangements: Map<string, SeatingArrangement> = new Map();
  private guestCommunicationQueue: Map<string, any> = new Map();
  private rsvpStatistics: Map<string, any> = new Map();

  constructor(config: GuestManagementConfig) {
    super();
    this.weddingId = config.weddingId;
    this.eventStreaming = config.eventStreaming;
    this.websocketManager = config.websocketManager;
    this.conflictResolver = config.conflictResolver;

    this.setupEventListeners();
    this.startGuestManagementMonitoring();
  }

  private setupEventListeners(): void {
    // Listen for guest management events
    this.eventStreaming.on(
      'collaboration_event',
      this.handleCollaborationEvent.bind(this),
    );

    // Listen for RSVP submissions
    this.eventStreaming.on(
      'rsvp_submitted',
      this.handleRSVPSubmission.bind(this),
    );

    // Listen for guest communication events
    this.eventStreaming.on(
      'guest_communication',
      this.handleGuestCommunication.bind(this),
    );

    // Listen for seating arrangement updates
    this.eventStreaming.on(
      'seating_update',
      this.handleSeatingUpdate.bind(this),
    );
  }

  private startGuestManagementMonitoring(): void {
    // Monitor RSVP deadlines and guest communication
    setInterval(() => {
      this.checkRSVPDeadlines();
      this.updateRSVPStatistics();
    }, 60000); // Check every minute
  }

  // Start editing guest information
  async startEditingGuest(
    userId: string,
    guestId: string,
    field?: keyof Guest,
    userRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): Promise<{
    success: boolean;
    lockAcquired: boolean;
    currentEditor?: string;
  }> {
    try {
      // Check permissions for guest management
      if (!this.canManageGuests(userRole, permissions)) {
        throw new Error('Insufficient permissions to manage guests');
      }

      const lockKey = field ? `${guestId}_${field}` : guestId;
      const currentEditor = this.activeGuestEditors.get(lockKey);

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
          this.activeGuestEditors.delete(lockKey);
        }
      }

      // Acquire editing lock
      this.activeGuestEditors.set(lockKey, {
        userId,
        guestId,
        lastActivity: new Date(),
        field,
      });

      // Broadcast guest editing start event
      const collaborationEvent: CollaborationEvent = {
        id: `guest_edit_start_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'guest_edit_start',
        wedding_id: this.weddingId,
        user_id: userId,
        timestamp: new Date(),
        data: {
          guest_id: guestId,
          field: field,
          user_role: userRole,
        },
        metadata: {
          source: 'guest_management',
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
      console.error('Failed to start editing guest:', error);
      return {
        success: false,
        lockAcquired: false,
      };
    }
  }

  // Update guest information with real-time collaboration
  async updateGuestInformation(
    userId: string,
    guestId: string,
    update: GuestListUpdate,
    userRole: WeddingRole,
  ): Promise<{
    success: boolean;
    conflicts?: any[];
    notifications?: string[];
  }> {
    try {
      const lockKey = update.field ? `${guestId}_${update.field}` : guestId;
      const currentEditor = this.activeGuestEditors.get(lockKey);

      if (!currentEditor || currentEditor.userId !== userId) {
        throw new Error('No editing lock acquired for this guest');
      }

      // Update last activity
      currentEditor.lastActivity = new Date();

      // Validate guest update
      const validationResult = await this.validateGuestUpdate(update);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Check for guest information conflicts
      const conflicts = await this.checkGuestConflicts(guestId, update);

      // Apply operational transformation for concurrent edits
      const transformedUpdate = await this.applyGuestTransform(guestId, update);

      // Add to pending updates queue
      if (!this.pendingGuestUpdates.has(guestId)) {
        this.pendingGuestUpdates.set(guestId, []);
      }
      this.pendingGuestUpdates.get(guestId)!.push(transformedUpdate);

      // Determine who needs to be notified
      const notifications = await this.determineGuestUpdateNotifications(
        update,
        userRole,
      );

      // Broadcast guest update event
      const collaborationEvent: CollaborationEvent = {
        id: `guest_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'guest_update',
        wedding_id: this.weddingId,
        user_id: userId,
        timestamp: new Date(),
        data: {
          guest_id: guestId,
          update: transformedUpdate,
          user_role: userRole,
          conflicts: conflicts,
          notifications: notifications,
        },
        metadata: {
          source: 'guest_management',
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

      // Send specific notifications if needed
      for (const notifyUserId of notifications) {
        await this.websocketManager.broadcastToUser(
          notifyUserId,
          collaborationEvent,
        );
      }

      return {
        success: true,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        notifications: notifications.length > 0 ? notifications : undefined,
      };
    } catch (error) {
      console.error('Failed to update guest information:', error);
      return {
        success: false,
      };
    }
  }

  // Process RSVP submission
  async processRSVPSubmission(
    guestId: string,
    rsvpResponse: Omit<RSVPResponse, 'id' | 'response_date'>,
    submissionMethod: 'online' | 'phone' | 'email' | 'mail' = 'online',
  ): Promise<{
    success: boolean;
    conflicts?: any[];
    seating_update_needed?: boolean;
  }> {
    try {
      const rsvpId = `rsvp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const fullRSVPResponse: RSVPResponse = {
        id: rsvpId,
        guest_id: guestId,
        response_status: rsvpResponse.response_status,
        attending_count: rsvpResponse.attending_count,
        dietary_requirements: rsvpResponse.dietary_requirements,
        accommodation_request: rsvpResponse.accommodation_request,
        transport_request: rsvpResponse.transport_request,
        song_requests: rsvpResponse.song_requests,
        special_requests: rsvpResponse.special_requests,
        response_date: new Date(),
        response_method: submissionMethod,
      };

      // Store pending RSVP
      this.pendingRSVPs.set(rsvpId, fullRSVPResponse);

      // Check for conflicts (e.g., party size changes affecting seating)
      const conflicts = await this.checkRSVPConflicts(
        guestId,
        fullRSVPResponse,
      );

      // Determine if seating arrangement update is needed
      const seatingUpdateNeeded = await this.checkSeatingImpact(
        guestId,
        fullRSVPResponse,
      );

      // Create collaboration event
      const collaborationEvent: CollaborationEvent = {
        id: `rsvp_submitted_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'rsvp_submission',
        wedding_id: this.weddingId,
        user_id: 'guest_portal', // RSVPs can come from guest portal
        timestamp: new Date(),
        data: {
          guest_id: guestId,
          rsvp_response: fullRSVPResponse,
          conflicts: conflicts,
          seating_update_needed: seatingUpdateNeeded,
        },
        metadata: {
          source: 'guest_management',
          priority: 4,
        },
        vector_clock: {},
        priority: 4,
      };

      await this.eventStreaming.publishEvent(collaborationEvent);
      await this.websocketManager.broadcastToRoom(
        this.weddingId,
        collaborationEvent,
      );

      // Update RSVP statistics
      await this.updateRSVPStatistics();

      return {
        success: true,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        seating_update_needed: seatingUpdateNeeded,
      };
    } catch (error) {
      console.error('Failed to process RSVP submission:', error);
      return {
        success: false,
      };
    }
  }

  // Manage seating arrangements collaboratively
  async updateSeatingArrangement(
    userId: string,
    arrangementUpdate: {
      table_id: string;
      action: 'assign_guest' | 'remove_guest' | 'move_guest' | 'update_table';
      guest_id?: string;
      new_table_id?: string;
      table_updates?: Partial<SeatingArrangement>;
    },
    userRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): Promise<{
    success: boolean;
    conflicts?: any[];
    capacity_warnings?: any[];
  }> {
    try {
      // Check permissions for seating management
      if (!this.canManageSeating(userRole, permissions)) {
        throw new Error(
          'Insufficient permissions to manage seating arrangements',
        );
      }

      // Validate seating update
      const validationResult =
        await this.validateSeatingUpdate(arrangementUpdate);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }

      // Check for seating conflicts and capacity issues
      const conflicts = await this.checkSeatingConflicts(arrangementUpdate);
      const capacityWarnings = await this.checkTableCapacity(arrangementUpdate);

      // Apply seating arrangement update
      await this.applySeatingUpdate(arrangementUpdate);

      // Create collaboration event
      const collaborationEvent: CollaborationEvent = {
        id: `seating_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'seating_arrangement_update',
        wedding_id: this.weddingId,
        user_id: userId,
        timestamp: new Date(),
        data: {
          seating_update: arrangementUpdate,
          user_role: userRole,
          conflicts: conflicts,
          capacity_warnings: capacityWarnings,
        },
        metadata: {
          source: 'guest_management',
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
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        capacity_warnings:
          capacityWarnings.length > 0 ? capacityWarnings : undefined,
      };
    } catch (error) {
      console.error('Failed to update seating arrangement:', error);
      return {
        success: false,
      };
    }
  }

  // Send communications to guests
  async sendGuestCommunication(
    senderId: string,
    communication: {
      recipient_type:
        | 'all_guests'
        | 'rsvp_pending'
        | 'attending'
        | 'not_attending'
        | 'specific_guests';
      specific_guest_ids?: string[];
      subject: string;
      message: string;
      communication_method: 'email' | 'sms' | 'both';
      scheduled_send?: Date;
      include_rsvp_link: boolean;
    },
    senderRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): Promise<{
    success: boolean;
    recipients_count?: number;
    scheduled?: boolean;
  }> {
    try {
      // Check permissions for guest communication
      if (!this.canCommunicateWithGuests(senderRole, permissions)) {
        throw new Error(
          'Insufficient permissions to send guest communications',
        );
      }

      // Determine recipients
      const recipients =
        await this.determineGuestCommunicationRecipients(communication);

      const communicationId = `guest_comm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store communication in queue
      this.guestCommunicationQueue.set(communicationId, {
        id: communicationId,
        sender_id: senderId,
        recipients: recipients,
        communication: communication,
        created_at: new Date(),
        status: communication.scheduled_send ? 'scheduled' : 'queued',
      });

      // Create collaboration event
      const collaborationEvent: CollaborationEvent = {
        id: `guest_communication_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'guest_communication_sent',
        wedding_id: this.weddingId,
        user_id: senderId,
        timestamp: new Date(),
        data: {
          communication_id: communicationId,
          communication: communication,
          recipients_count: recipients.length,
          scheduled: !!communication.scheduled_send,
        },
        metadata: {
          source: 'guest_management',
          priority: 4,
        },
        vector_clock: {},
        priority: 4,
      };

      await this.eventStreaming.publishEvent(collaborationEvent);
      await this.websocketManager.broadcastToRoom(
        this.weddingId,
        collaborationEvent,
      );

      return {
        success: true,
        recipients_count: recipients.length,
        scheduled: !!communication.scheduled_send,
      };
    } catch (error) {
      console.error('Failed to send guest communication:', error);
      return {
        success: false,
      };
    }
  }

  // Get guest management dashboard
  async getGuestManagementDashboard(): Promise<{
    guest_statistics: any;
    rsvp_statistics: any;
    seating_summary: any;
    pending_communications: any[];
    recent_activities: any[];
  }> {
    const guestStatistics = await this.calculateGuestStatistics();
    const rsvpStatistics = Array.from(this.rsvpStatistics.values())[0] || {};
    const seatingSummary = await this.calculateSeatingSummary();
    const pendingCommunications = Array.from(
      this.guestCommunicationQueue.values(),
    ).filter((comm) => comm.status === 'queued' || comm.status === 'scheduled');

    // Get recent activities (placeholder - would be from event stream)
    const recentActivities: any[] = [];

    return {
      guest_statistics: guestStatistics,
      rsvp_statistics: rsvpStatistics,
      seating_summary: seatingSummary,
      pending_communications: pendingCommunications,
      recent_activities: recentActivities,
    };
  }

  // Finish editing guest
  async finishEditingGuest(
    userId: string,
    guestId: string,
    field?: string,
    saveChanges: boolean = true,
  ): Promise<{ success: boolean }> {
    try {
      const lockKey = field ? `${guestId}_${field}` : guestId;
      const currentEditor = this.activeGuestEditors.get(lockKey);

      if (!currentEditor || currentEditor.userId !== userId) {
        throw new Error('No editing lock acquired for this guest');
      }

      // Apply pending updates if saving changes
      if (saveChanges && this.pendingGuestUpdates.has(guestId)) {
        const updates = this.pendingGuestUpdates.get(guestId)!;
        await this.applyPendingGuestUpdates(guestId, updates);
        this.pendingGuestUpdates.delete(guestId);
      } else if (!saveChanges) {
        // Discard pending updates
        this.pendingGuestUpdates.delete(guestId);
      }

      // Release lock
      this.activeGuestEditors.delete(lockKey);

      // Broadcast guest editing end event
      const collaborationEvent: CollaborationEvent = {
        id: `guest_edit_end_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'guest_edit_end',
        wedding_id: this.weddingId,
        user_id: userId,
        timestamp: new Date(),
        data: {
          guest_id: guestId,
          field: field,
          changes_saved: saveChanges,
        },
        metadata: {
          source: 'guest_management',
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
      console.error('Failed to finish editing guest:', error);
      return { success: false };
    }
  }

  // Private helper methods
  private canManageGuests(
    userRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): boolean {
    return (
      permissions.can_manage_guests ||
      userRole === 'couple' ||
      userRole === 'wedding_coordinator'
    );
  }

  private canManageSeating(
    userRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): boolean {
    return (
      permissions.can_manage_guests ||
      userRole === 'couple' ||
      userRole === 'wedding_coordinator'
    );
  }

  private canCommunicateWithGuests(
    userRole: WeddingRole,
    permissions: CollaborationPermissions,
  ): boolean {
    return (
      permissions.can_send_messages ||
      userRole === 'couple' ||
      userRole === 'wedding_coordinator'
    );
  }

  private async validateGuestUpdate(
    update: GuestListUpdate,
  ): Promise<{ valid: boolean; error?: string }> {
    // Validate guest update based on field type
    if (update.field === 'party_size' && update.value < 1) {
      return { valid: false, error: 'Party size must be at least 1' };
    }

    if (
      update.field === 'email' &&
      update.value &&
      !this.isValidEmail(update.value)
    ) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  private async validateSeatingUpdate(
    update: any,
  ): Promise<{ valid: boolean; error?: string }> {
    // Validate seating arrangement update
    if (update.action === 'assign_guest' && !update.guest_id) {
      return { valid: false, error: 'Guest ID required for assignment' };
    }

    return { valid: true };
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async checkGuestConflicts(
    guestId: string,
    update: GuestListUpdate,
  ): Promise<any[]> {
    // Check for concurrent edits and conflicts
    return [];
  }

  private async checkRSVPConflicts(
    guestId: string,
    rsvp: RSVPResponse,
  ): Promise<any[]> {
    // Check for RSVP conflicts (e.g., party size changes)
    return [];
  }

  private async checkSeatingConflicts(update: any): Promise<any[]> {
    // Check for seating conflicts
    return [];
  }

  private async checkTableCapacity(update: any): Promise<any[]> {
    // Check table capacity constraints
    return [];
  }

  private async checkSeatingImpact(
    guestId: string,
    rsvp: RSVPResponse,
  ): Promise<boolean> {
    // Check if RSVP affects seating arrangements
    return rsvp.response_status === 'attending' && rsvp.attending_count > 1;
  }

  private async applyGuestTransform(
    guestId: string,
    update: GuestListUpdate,
  ): Promise<GuestListUpdate> {
    // Apply operational transformation for guest updates
    return update;
  }

  private async determineGuestUpdateNotifications(
    update: GuestListUpdate,
    userRole: WeddingRole,
  ): Promise<string[]> {
    // Determine who needs to be notified about guest updates
    const notifications: string[] = [];

    // Notify coordinators for significant changes
    if (update.field === 'rsvp_status' || update.field === 'party_size') {
      // Would add coordinator user IDs
    }

    return notifications;
  }

  private async applySeatingUpdate(update: any): Promise<void> {
    // Apply seating arrangement update to local state
    console.log('Applying seating update:', update);
  }

  private async determineGuestCommunicationRecipients(
    communication: any,
  ): Promise<string[]> {
    // Determine which guests should receive the communication
    return [];
  }

  private async calculateGuestStatistics(): Promise<any> {
    return {
      total_guests: 0,
      rsvp_pending: 0,
      attending: 0,
      not_attending: 0,
      maybe: 0,
    };
  }

  private async calculateSeatingSummary(): Promise<any> {
    return {
      total_tables: this.seatingArrangements.size,
      guests_seated: 0,
      guests_unseated: 0,
      table_capacity_used: 0,
    };
  }

  private async checkRSVPDeadlines(): Promise<void> {
    // Check for approaching RSVP deadlines and send reminders
    console.log('Checking RSVP deadlines');
  }

  private async updateRSVPStatistics(): Promise<void> {
    // Update RSVP statistics
    const stats = {
      total_invitations_sent: 0,
      total_responses: this.pendingRSVPs.size,
      response_rate: 0,
      attending_count: 0,
      not_attending_count: 0,
      maybe_count: 0,
      last_updated: new Date(),
    };

    this.rsvpStatistics.set(this.weddingId, stats);
  }

  private async applyPendingGuestUpdates(
    guestId: string,
    updates: GuestListUpdate[],
  ): Promise<void> {
    // Apply pending guest updates to database
    console.log(
      `Applying ${updates.length} pending guest updates for ${guestId}`,
    );
  }

  // Event handlers
  private async handleCollaborationEvent(
    event: CollaborationEvent,
  ): Promise<void> {
    switch (event.type) {
      case 'guest_update':
        await this.processGuestUpdate(event);
        break;
      case 'rsvp_submission':
        await this.processRSVPSubmission(event);
        break;
      case 'seating_arrangement_update':
        await this.processSeatingUpdate(event);
        break;
    }
  }

  private async handleRSVPSubmission(event: any): Promise<void> {
    // Handle external RSVP submissions
    console.log('RSVP submission received:', event);
  }

  private async handleGuestCommunication(event: any): Promise<void> {
    // Handle guest communication events
    console.log('Guest communication event:', event);
  }

  private async handleSeatingUpdate(event: any): Promise<void> {
    // Handle seating arrangement updates
    console.log('Seating update event:', event);
  }

  private async processGuestUpdate(event: CollaborationEvent): Promise<void> {
    this.emit('guest_updated', event);
  }

  private async processRSVPSubmission(
    event: CollaborationEvent,
  ): Promise<void> {
    this.emit('rsvp_processed', event);
  }

  private async processSeatingUpdate(event: CollaborationEvent): Promise<void> {
    this.emit('seating_updated', event);
  }
}
