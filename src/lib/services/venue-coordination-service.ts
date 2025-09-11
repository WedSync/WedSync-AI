/**
 * WS-219 Venue Coordination Service
 * Team C - Round 1 Implementation
 *
 * Coordinates venue changes across wedding management systems,
 * ensures data consistency, and manages supplier communication workflows.
 */

import { createClient } from '@supabase/supabase-js';
import { PlacesWeddingSyncService } from '../integrations/places-wedding-sync';

interface VenueCoordinationConfig {
  autoNotifySuppliers: boolean;
  autoUpdateTimeline: boolean;
  conflictResolutionMode: 'manual' | 'automatic' | 'priority-based';
  validationRules: {
    requireAvailabilityCheck: boolean;
    requireCapacityValidation: boolean;
    requireSupplierApproval: boolean;
  };
}

interface VenueConflict {
  id: string;
  weddingId: string;
  conflictType:
    | 'double_booking'
    | 'capacity_mismatch'
    | 'availability_conflict'
    | 'supplier_conflict';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedParties: string[]; // supplier IDs, couple ID, etc.
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  metadata: Record<string, any>;
}

interface VenueChangeRequest {
  id: string;
  weddingId: string;
  requestedBy: string;
  changeType:
    | 'venue_selection'
    | 'venue_change'
    | 'date_change'
    | 'capacity_change';
  currentVenue?: {
    venueId: string;
    date: Date;
    capacity: number;
  };
  proposedVenue: {
    venueId: string;
    date: Date;
    capacity: number;
  };
  reason: string;
  impact: {
    suppliersAffected: string[];
    timelinesAffected: string[];
    estimatedCost: number;
  };
  status: 'pending' | 'approved' | 'rejected' | 'implemented';
  approvals: Array<{
    approverId: string;
    approverType: 'couple' | 'supplier' | 'coordinator';
    status: 'pending' | 'approved' | 'rejected';
    timestamp: Date;
    comments?: string;
  }>;
  createdAt: Date;
  processedAt?: Date;
}

interface CoordinationRule {
  id: string;
  name: string;
  condition: {
    changeType: string[];
    minimumNotice?: number; // days
    maxCapacityChange?: number;
    requiredApprovers: string[];
  };
  actions: {
    notifySuppliers: boolean;
    updateTimeline: boolean;
    requireApproval: boolean;
    lockVenue: boolean;
  };
  priority: number;
}

export class VenueCoordinationService {
  private supabase: any;
  private placesSync?: PlacesWeddingSyncService;
  private config: VenueCoordinationConfig;
  private coordinationRules: CoordinationRule[] = [];
  private activeConflicts = new Map<string, VenueConflict>();

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    placesSync?: PlacesWeddingSyncService,
    config?: Partial<VenueCoordinationConfig>,
  ) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.placesSync = placesSync;

    this.config = {
      autoNotifySuppliers: true,
      autoUpdateTimeline: true,
      conflictResolutionMode: 'manual',
      validationRules: {
        requireAvailabilityCheck: true,
        requireCapacityValidation: true,
        requireSupplierApproval: false,
      },
      ...config,
    };

    this.initializeDefaultRules();
  }

  /**
   * Process venue change request with full coordination
   */
  async processVenueChangeRequest(request: VenueChangeRequest): Promise<{
    success: boolean;
    requestId: string;
    conflicts?: VenueConflict[];
    error?: string;
  }> {
    try {
      // Store the change request
      const { data: storedRequest, error } = await this.supabase
        .from('venue_change_requests')
        .insert({
          ...request,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          requestId: '',
          error: `Failed to store venue change request: ${error.message}`,
        };
      }

      // Validate the proposed change
      const validation = await this.validateVenueChange(request);
      if (!validation.isValid) {
        await this.updateRequestStatus(
          storedRequest.id,
          'rejected',
          validation.reason,
        );
        return {
          success: false,
          requestId: storedRequest.id,
          error: validation.reason,
        };
      }

      // Check for conflicts
      const conflicts = await this.detectVenueConflicts(request);
      if (conflicts.length > 0) {
        // Store conflicts
        for (const conflict of conflicts) {
          await this.storeConflict(conflict);
          this.activeConflicts.set(conflict.id, conflict);
        }

        // Handle based on severity
        const criticalConflicts = conflicts.filter(
          (c) => c.severity === 'critical',
        );
        if (criticalConflicts.length > 0) {
          await this.updateRequestStatus(
            storedRequest.id,
            'rejected',
            'Critical conflicts detected - manual resolution required',
          );
          return {
            success: false,
            requestId: storedRequest.id,
            conflicts,
            error: 'Critical venue conflicts detected',
          };
        }
      }

      // Apply coordination rules
      const applicableRules = this.getApplicableRules(request);
      const requiresApproval = applicableRules.some(
        (rule) => rule.actions.requireApproval,
      );

      if (requiresApproval) {
        await this.initiateApprovalProcess(storedRequest.id, applicableRules);
        await this.updateRequestStatus(storedRequest.id, 'pending');
      } else {
        // Auto-approve and implement
        await this.implementVenueChange(storedRequest.id, request);
      }

      return {
        success: true,
        requestId: storedRequest.id,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
      };
    } catch (error) {
      return {
        success: false,
        requestId: '',
        error: `Venue change processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Implement venue change after approval
   */
  async implementVenueChange(
    requestId: string,
    request: VenueChangeRequest,
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Start transaction-like operations
      const operations: Array<() => Promise<void>> = [];

      // 1. Update venue in wedding record
      operations.push(async () => {
        await this.supabase
          .from('weddings')
          .update({
            venue_id: request.proposedVenue.venueId,
            venue_date: request.proposedVenue.date.toISOString(),
            venue_capacity: request.proposedVenue.capacity,
            updated_at: new Date().toISOString(),
            updated_by: request.requestedBy,
          })
          .eq('id', request.weddingId);
      });

      // 2. Update venue coordination data
      operations.push(async () => {
        await this.supabase.from('venue_coordination_history').insert({
          wedding_id: request.weddingId,
          change_request_id: requestId,
          change_type: request.changeType,
          previous_venue: request.currentVenue,
          new_venue: request.proposedVenue,
          implemented_at: new Date().toISOString(),
          implemented_by: request.requestedBy,
        });
      });

      // 3. Notify suppliers if configured
      if (this.config.autoNotifySuppliers) {
        operations.push(async () => {
          await this.notifyAffectedSuppliers(request);
        });
      }

      // 4. Update timeline if configured
      if (this.config.autoUpdateTimeline) {
        operations.push(async () => {
          await this.updateAffectedTimelines(request);
        });
      }

      // 5. Sync with Places API if available
      if (this.placesSync) {
        operations.push(async () => {
          await this.placesSync!.handleVenueSelection(
            request.weddingId,
            request.proposedVenue.venueId,
            request.proposedVenue.date,
          );
        });
      }

      // Execute all operations
      const results = await Promise.allSettled(operations.map((op) => op()));

      // Check for failures
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        // Log failures but don't fail the entire operation
        await this.logCoordinationEvent(
          request.weddingId,
          'implementation_partial_failure',
          {
            requestId,
            failures: failures.length,
            totalOperations: operations.length,
          },
        );
      }

      // Update request status
      await this.updateRequestStatus(requestId, 'implemented');

      // Clear any related conflicts
      await this.resolveRelatedConflicts(request.weddingId, requestId);

      return { success: true };
    } catch (error) {
      await this.logCoordinationEvent(
        request.weddingId,
        'implementation_failed',
        {
          requestId,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      );

      return {
        success: false,
        error: `Venue change implementation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Detect potential conflicts with venue changes
   */
  async detectVenueConflicts(
    request: VenueChangeRequest,
  ): Promise<VenueConflict[]> {
    const conflicts: VenueConflict[] = [];

    try {
      // Check for double booking
      const { data: existingBookings } = await this.supabase
        .from('weddings')
        .select('id, couple_name, venue_date')
        .eq('venue_id', request.proposedVenue.venueId)
        .eq('venue_date', request.proposedVenue.date.toISOString())
        .neq('id', request.weddingId);

      if (existingBookings && existingBookings.length > 0) {
        conflicts.push({
          id: `double-booking-${Date.now()}`,
          weddingId: request.weddingId,
          conflictType: 'double_booking',
          severity: 'critical',
          description: `Venue already booked for ${existingBookings[0].couple_name} on ${request.proposedVenue.date}`,
          affectedParties: [
            request.weddingId,
            ...existingBookings.map((b) => b.id),
          ],
          detectedAt: new Date(),
          metadata: { existingBookings },
        });
      }

      // Check supplier availability conflicts
      const supplierConflicts = await this.checkSupplierAvailability(request);
      conflicts.push(...supplierConflicts);

      // Check capacity conflicts
      const capacityConflict = await this.validateVenueCapacity(request);
      if (capacityConflict) {
        conflicts.push(capacityConflict);
      }

      // Check travel time impacts
      const travelConflicts = await this.checkTravelTimeImpacts(request);
      conflicts.push(...travelConflicts);

      return conflicts;
    } catch (error) {
      console.error('Error detecting venue conflicts:', error);
      return conflicts;
    }
  }

  /**
   * Validate venue change request
   */
  private async validateVenueChange(request: VenueChangeRequest): Promise<{
    isValid: boolean;
    reason?: string;
  }> {
    // Check minimum notice period
    const daysDifference = Math.ceil(
      (request.proposedVenue.date.getTime() - new Date().getTime()) /
        (1000 * 3600 * 24),
    );
    if (daysDifference < 30) {
      // Minimum 30 days notice
      return {
        isValid: false,
        reason:
          'Insufficient notice - minimum 30 days required for venue changes',
      };
    }

    // Check if venue exists
    if (this.placesSync) {
      const venueDetails = await this.placesSync.getWeddingVenue(
        request.weddingId,
        request.proposedVenue.venueId,
      );

      if (!venueDetails) {
        return {
          isValid: false,
          reason: 'Proposed venue not found or not available',
        };
      }
    }

    // Validate capacity requirements
    if (this.config.validationRules.requireCapacityValidation) {
      const { data: guestCount } = await this.supabase
        .from('wedding_guests')
        .select('id')
        .eq('wedding_id', request.weddingId);

      if (guestCount && guestCount.length > request.proposedVenue.capacity) {
        return {
          isValid: false,
          reason: `Venue capacity (${request.proposedVenue.capacity}) insufficient for guest count (${guestCount.length})`,
        };
      }
    }

    return { isValid: true };
  }

  /**
   * Check supplier availability for the new date/venue
   */
  private async checkSupplierAvailability(
    request: VenueChangeRequest,
  ): Promise<VenueConflict[]> {
    const conflicts: VenueConflict[] = [];

    try {
      const { data: suppliers } = await this.supabase
        .from('wedding_suppliers')
        .select('id, name, service_type, availability_calendar')
        .eq('wedding_id', request.weddingId);

      if (!suppliers) return conflicts;

      for (const supplier of suppliers) {
        // Check if supplier is available on new date
        const isAvailable = await this.checkSupplierDateAvailability(
          supplier.id,
          request.proposedVenue.date,
        );

        if (!isAvailable) {
          conflicts.push({
            id: `supplier-conflict-${supplier.id}-${Date.now()}`,
            weddingId: request.weddingId,
            conflictType: 'supplier_conflict',
            severity: 'high',
            description: `${supplier.name} (${supplier.service_type}) not available on proposed date`,
            affectedParties: [request.weddingId, supplier.id],
            detectedAt: new Date(),
            metadata: { supplierId: supplier.id, supplierName: supplier.name },
          });
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking supplier availability:', error);
      return conflicts;
    }
  }

  /**
   * Validate venue capacity
   */
  private async validateVenueCapacity(
    request: VenueChangeRequest,
  ): Promise<VenueConflict | null> {
    try {
      const { data: guestCount } = await this.supabase
        .from('wedding_guests')
        .select('id, rsvp_status')
        .eq('wedding_id', request.weddingId);

      if (!guestCount) return null;

      const confirmedGuests = guestCount.filter(
        (g) => g.rsvp_status === 'confirmed',
      ).length;
      const totalGuests = guestCount.length;

      // Check if venue can accommodate guests
      const capacityBuffer = 0.9; // 90% capacity threshold
      const effectiveCapacity = request.proposedVenue.capacity * capacityBuffer;

      if (confirmedGuests > effectiveCapacity) {
        return {
          id: `capacity-conflict-${Date.now()}`,
          weddingId: request.weddingId,
          conflictType: 'capacity_mismatch',
          severity: 'high',
          description: `Venue capacity (${request.proposedVenue.capacity}) insufficient for confirmed guests (${confirmedGuests})`,
          affectedParties: [request.weddingId],
          detectedAt: new Date(),
          metadata: {
            venueCapacity: request.proposedVenue.capacity,
            confirmedGuests,
            totalGuests,
          },
        };
      }

      return null;
    } catch (error) {
      console.error('Error validating venue capacity:', error);
      return null;
    }
  }

  /**
   * Check travel time impacts for suppliers
   */
  private async checkTravelTimeImpacts(
    request: VenueChangeRequest,
  ): Promise<VenueConflict[]> {
    const conflicts: VenueConflict[] = [];

    if (!this.placesSync) return conflicts;

    try {
      const travelTimes = await this.placesSync.calculateSupplierTravelTimes(
        request.weddingId,
        request.proposedVenue.venueId,
      );

      if (!travelTimes.success) return conflicts;

      // Check for excessive travel times (over 2 hours)
      const excessiveTravelThreshold = 120; // minutes

      for (const [supplierId, travelTime] of Object.entries(travelTimes.data)) {
        if (travelTime > excessiveTravelThreshold) {
          const { data: supplier } = await this.supabase
            .from('wedding_suppliers')
            .select('name, service_type')
            .eq('id', supplierId)
            .single();

          if (supplier) {
            conflicts.push({
              id: `travel-conflict-${supplierId}-${Date.now()}`,
              weddingId: request.weddingId,
              conflictType: 'supplier_conflict',
              severity: 'medium',
              description: `Excessive travel time for ${supplier.name}: ${Math.round(travelTime / 60)} hours`,
              affectedParties: [request.weddingId, supplierId],
              detectedAt: new Date(),
              metadata: {
                supplierId,
                supplierName: supplier.name,
                travelTimeMinutes: travelTime,
              },
            });
          }
        }
      }

      return conflicts;
    } catch (error) {
      console.error('Error checking travel time impacts:', error);
      return conflicts;
    }
  }

  /**
   * Notify affected suppliers of venue changes
   */
  private async notifyAffectedSuppliers(
    request: VenueChangeRequest,
  ): Promise<void> {
    try {
      const notifications = request.impact.suppliersAffected.map(
        (supplierId) => ({
          recipient_type: 'supplier',
          recipient_id: supplierId,
          notification_type: 'venue_change',
          title: 'Venue Change Notification',
          message: `Venue has been changed for wedding on ${request.proposedVenue.date.toDateString()}`,
          data: {
            weddingId: request.weddingId,
            changeRequestId: request.id,
            newVenue: request.proposedVenue,
            oldVenue: request.currentVenue,
          },
          created_at: new Date().toISOString(),
        }),
      );

      await this.supabase.from('notifications').insert(notifications);

      // Log notification activity
      await this.logCoordinationEvent(request.weddingId, 'suppliers_notified', {
        changeRequestId: request.id,
        suppliersNotified: request.impact.suppliersAffected.length,
      });
    } catch (error) {
      console.error('Failed to notify suppliers:', error);
    }
  }

  /**
   * Update affected timelines
   */
  private async updateAffectedTimelines(
    request: VenueChangeRequest,
  ): Promise<void> {
    try {
      // Update timeline entries with venue-specific information
      await this.supabase
        .from('wedding_timeline')
        .update({
          location: `New venue: ${request.proposedVenue.venueId}`,
          updated_at: new Date().toISOString(),
          updated_by: request.requestedBy,
        })
        .eq('wedding_id', request.weddingId)
        .in('type', ['venue_setup', 'vendor_arrival', 'ceremony', 'reception']);

      // Recalculate travel times for timeline
      if (this.placesSync) {
        await this.placesSync.calculateSupplierTravelTimes(
          request.weddingId,
          request.proposedVenue.venueId,
        );
      }

      await this.logCoordinationEvent(request.weddingId, 'timeline_updated', {
        changeRequestId: request.id,
      });
    } catch (error) {
      console.error('Failed to update timelines:', error);
    }
  }

  // Helper methods
  private initializeDefaultRules(): void {
    this.coordinationRules = [
      {
        id: 'venue-change-30-day',
        name: '30 Day Venue Change Rule',
        condition: {
          changeType: ['venue_change'],
          minimumNotice: 30,
          requiredApprovers: ['couple'],
        },
        actions: {
          notifySuppliers: true,
          updateTimeline: true,
          requireApproval: true,
          lockVenue: false,
        },
        priority: 1,
      },
      {
        id: 'capacity-increase',
        name: 'Capacity Increase Rule',
        condition: {
          changeType: ['capacity_change'],
          maxCapacityChange: 50,
          requiredApprovers: ['couple', 'coordinator'],
        },
        actions: {
          notifySuppliers: true,
          updateTimeline: false,
          requireApproval: true,
          lockVenue: false,
        },
        priority: 2,
      },
    ];
  }

  private getApplicableRules(request: VenueChangeRequest): CoordinationRule[] {
    return this.coordinationRules.filter((rule) =>
      rule.condition.changeType.includes(request.changeType),
    );
  }

  private async initiateApprovalProcess(
    requestId: string,
    rules: CoordinationRule[],
  ): Promise<void> {
    const requiredApprovers = new Set<string>();
    rules.forEach((rule) =>
      rule.condition.requiredApprovers.forEach((approver) =>
        requiredApprovers.add(approver),
      ),
    );

    const approvals = Array.from(requiredApprovers).map((approverType) => ({
      change_request_id: requestId,
      approver_type: approverType,
      status: 'pending',
      created_at: new Date().toISOString(),
    }));

    await this.supabase.from('venue_change_approvals').insert(approvals);
  }

  private async checkSupplierDateAvailability(
    supplierId: string,
    date: Date,
  ): Promise<boolean> {
    const { data: conflicts } = await this.supabase
      .from('supplier_bookings')
      .select('id')
      .eq('supplier_id', supplierId)
      .eq('booking_date', date.toISOString().split('T')[0]);

    return !conflicts || conflicts.length === 0;
  }

  private async updateRequestStatus(
    requestId: string,
    status: string,
    reason?: string,
  ): Promise<void> {
    await this.supabase
      .from('venue_change_requests')
      .update({
        status,
        reason,
        processed_at: new Date().toISOString(),
      })
      .eq('id', requestId);
  }

  private async storeConflict(conflict: VenueConflict): Promise<void> {
    await this.supabase.from('venue_conflicts').insert({
      ...conflict,
      detected_at: conflict.detectedAt.toISOString(),
      resolved_at: conflict.resolvedAt?.toISOString(),
    });
  }

  private async resolveRelatedConflicts(
    weddingId: string,
    requestId: string,
  ): Promise<void> {
    await this.supabase
      .from('venue_conflicts')
      .update({
        resolved_at: new Date().toISOString(),
        resolution: `Resolved by implementing change request ${requestId}`,
      })
      .eq('wedding_id', weddingId)
      .is('resolved_at', null);
  }

  private async logCoordinationEvent(
    weddingId: string,
    eventType: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    await this.supabase.from('venue_coordination_logs').insert({
      wedding_id: weddingId,
      event_type: eventType,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Health check for the coordination service
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const results = {
      supabaseConnection: false,
      placesIntegration: false,
      activeConflicts: this.activeConflicts.size,
      coordinationRules: this.coordinationRules.length,
    };

    try {
      // Test database connection
      const { error } = await this.supabase
        .from('weddings')
        .select('id')
        .limit(1);
      results.supabaseConnection = !error;

      // Test places integration
      if (this.placesSync) {
        const placesHealth = await this.placesSync.healthCheck();
        results.placesIntegration = placesHealth.status !== 'unhealthy';
      }

      const healthyServices = [
        results.supabaseConnection,
        results.placesIntegration || !this.placesSync,
      ].filter(Boolean).length;

      if (healthyServices >= 2) {
        return { status: 'healthy', details: results };
      } else if (healthyServices >= 1) {
        return { status: 'degraded', details: results };
      } else {
        return { status: 'unhealthy', details: results };
      }
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          ...results,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
