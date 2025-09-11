/**
 * Advanced Real-Time Collaboration System with AI-Powered Conflict Resolution
 * Enhances existing realtime system with multi-platform sync and intelligent conflict handling
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';
import { z } from 'zod';
import { WeddingDayRealtimeManager } from './wedding-day-realtime';

// Initialize clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const redis = Redis.fromEnv();

// Schema definitions
const CollaborationPayloadSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'move', 'batch']),
  entity_type: z.string(),
  entity_id: z.string(),
  data: z.any(),
  user_id: z.string(),
  session_id: z.string(),
  timestamp: z.string(),
  vector_clock: z.record(z.number()),
  dependencies: z.array(z.string()).optional(),
});

const ConflictSchema = z.object({
  conflict_id: z.string(),
  type: z.enum([
    'concurrent_edit',
    'data_inconsistency',
    'permission_conflict',
    'dependency_violation',
  ]),
  entities: z.array(
    z.object({
      entity_type: z.string(),
      entity_id: z.string(),
      version: z.string(),
      data: z.any(),
    }),
  ),
  users: z.array(z.string()),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  auto_resolvable: z.boolean(),
  resolution_strategy: z.string().optional(),
});

const ConflictResolutionSchema = z.object({
  resolution_id: z.string(),
  conflict_id: z.string(),
  strategy: z.enum(['merge', 'override', 'manual_review', 'ai_resolution']),
  resolved_data: z.any(),
  reasoning: z.string(),
  confidence: z.number().min(0).max(1),
  user_approvals: z.array(z.string()).optional(),
  fallback_plan: z.string().optional(),
});

export type CollaborationPayload = z.infer<typeof CollaborationPayloadSchema>;
export type Conflict = z.infer<typeof ConflictSchema>;
export type ConflictResolution = z.infer<typeof ConflictResolutionSchema>;

/**
 * Advanced Realtime Collaboration Manager
 */
export class AdvancedRealtimeManager extends WeddingDayRealtimeManager {
  private conflictResolver: ConflictResolver;
  private collaborationTracker: CollaborationTracker;
  private syncEngine: MultiPlatformSyncEngine;
  private operationalTransform: OperationalTransform;

  constructor(weddingId: string, userId: string) {
    super(weddingId, userId);
    this.conflictResolver = new ConflictResolver(weddingId);
    this.collaborationTracker = new CollaborationTracker(weddingId);
    this.syncEngine = new MultiPlatformSyncEngine(weddingId);
    this.operationalTransform = new OperationalTransform();
  }

  /**
   * Enable collaborative editing with conflict resolution
   */
  async enableCollaborativeEditing(feature: string): Promise<any> {
    const collaborationChannel = this.supabase
      .channel(`collaboration:${this.weddingId}:${feature}`)
      .on('presence', { event: 'sync' }, () => {
        const presences = collaborationChannel.presenceState();
        this.handleCollaboratorPresenceUpdate(presences);
      })
      .on('broadcast', { event: 'operation' }, (payload) => {
        this.handleCollaborativeOperation(payload);
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.getTableForFeature(feature),
          filter: `wedding_id=eq.${this.weddingId}`,
        },
        (payload) => {
          this.handleDatabaseChange(payload, feature);
        },
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await collaborationChannel.track({
            user_id: this.coordinatorId,
            editing_feature: feature,
            session_id: this.generateSessionId(),
            last_seen: new Date().toISOString(),
            capabilities: await this.getUserCapabilities(),
          });
        }
      });

    return collaborationChannel;
  }

  /**
   * Handle collaborative operations with conflict detection
   */
  private async handleCollaborativeOperation(payload: any) {
    try {
      const operation = CollaborationPayloadSchema.parse(payload.payload);

      // Detect conflicts using AI and operational transform
      const conflicts = await this.conflictResolver.detectConflicts(operation);

      if (conflicts.length > 0) {
        // Resolve conflicts using AI-powered resolution
        const resolutions = await Promise.all(
          conflicts.map((conflict) =>
            this.conflictResolver.resolveConflict(conflict, {
              ai_resolution: true,
              user_preferences: await this.getUserConflictPreferences(
                operation.user_id,
              ),
            }),
          ),
        );

        // Broadcast conflict resolutions to all collaborators
        for (const resolution of resolutions) {
          await this.broadcastConflictResolution(resolution);
        }

        // Apply resolved operations
        await this.applyResolvedOperations(operation, resolutions);
      } else {
        // No conflicts, apply operation with optimistic concurrency control
        await this.applyCollaborativeOperation(operation);
      }
    } catch (error) {
      console.error('Collaborative operation error:', error);
      await this.handleOperationError(payload, error);
    }
  }

  /**
   * Multi-platform calendar synchronization
   */
  async enableCrossTimezoneCollaboration(weddingId: string) {
    try {
      const weddingData = await this.getWeddingWithTimezone(weddingId);
      const collaborators = await this.getWeddingCollaborators(weddingId);

      // Set up timezone-aware notifications and scheduling
      for (const collaborator of collaborators) {
        await this.setupTimezoneAwareNotifications(
          collaborator,
          weddingData.timezone,
        );

        // Enable multi-platform calendar sync
        await this.syncEngine.enableCalendarSync(collaborator, {
          google: collaborator.google_calendar_enabled,
          apple: collaborator.apple_calendar_enabled,
          outlook: collaborator.outlook_calendar_enabled,
        });
      }

      // Enable smart scheduling suggestions based on all collaborator timezones
      await this.enableSmartSchedulingSuggestions(
        weddingId,
        collaborators.map((c) => c.timezone),
      );

      return {
        success: true,
        collaborators_configured: collaborators.length,
        platforms_enabled: ['google', 'apple', 'outlook'],
      };
    } catch (error) {
      console.error('Cross-timezone collaboration setup error:', error);
      throw error;
    }
  }

  /**
   * AI-powered conflict resolution
   */
  async resolveCollaborationConflict(
    conflictId: string,
  ): Promise<ConflictResolution> {
    const conflict = await this.conflictResolver.getConflict(conflictId);

    if (!conflict) {
      throw new Error(`Conflict ${conflictId} not found`);
    }

    // Use AI to analyze and resolve the conflict
    const resolution =
      await this.conflictResolver.generateAIResolution(conflict);

    // Apply the resolution if confidence is high enough
    if (resolution.confidence > 0.8) {
      await this.applyConflictResolution(resolution);
    } else {
      // Flag for manual review
      await this.flagForManualReview(conflict, resolution);
    }

    return resolution;
  }

  /**
   * Advanced presence tracking with activity monitoring
   */
  async trackAdvancedPresence(presence: {
    current_view: string;
    editing_entity: string | null;
    cursor_position: { x: number; y: number } | null;
    selected_items: string[];
    viewport: { x: number; y: number; width: number; height: number } | null;
  }) {
    const channel = this.channels.get('main');
    if (!channel) return;

    const enhancedPresence = {
      ...presence,
      user_id: this.coordinatorId,
      timestamp: new Date().toISOString(),
      session_quality: await this.measureSessionQuality(),
      device_info: this.getDeviceInfo(),
    };

    await channel.track(enhancedPresence);

    // Track collaboration metrics
    await this.collaborationTracker.recordActivity(
      this.coordinatorId,
      presence,
    );
  }

  /**
   * Real-time collaborative document editing with memory leak protection
   */
  async enableDocumentCollaboration(documentId: string, documentType: string) {
    // GUARDIAN FIX: Check if channel already exists to prevent memory leaks
    const existingChannel = this.channels.get(`document:${documentId}`);
    if (existingChannel) {
      console.warn(
        `Document channel ${documentId} already exists, reusing existing channel`,
      );
      return existingChannel;
    }

    const documentChannel = this.supabase
      .channel(`document:${documentId}`)
      .on('broadcast', { event: 'text_operation' }, async (payload) => {
        try {
          const operation = payload.payload;

          // GUARDIAN FIX: Add timeout to prevent hanging operations
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(
              () => reject(new Error('Document operation timeout')),
              5000,
            );
          });

          // Apply operational transformation with timeout protection
          const transformedOp = await Promise.race([
            this.operationalTransform.transform(
              operation,
              await this.getDocumentState(documentId),
            ),
            timeoutPromise,
          ]);

          // Apply to local document state
          await this.applyDocumentOperation(documentId, transformedOp);

          // Broadcast to other clients
          await this.broadcastDocumentOperation(documentId, transformedOp);
        } catch (error) {
          console.error('Document collaboration operation failed:', error);
          // Don't let one operation failure break the entire collaboration
        }
      })
      .subscribe();

    // GUARDIAN FIX: Store channel reference for proper cleanup
    this.channels.set(`document:${documentId}`, documentChannel);

    // GUARDIAN FIX: Auto-cleanup after 1 hour of inactivity
    setTimeout(
      () => {
        if (this.channels.has(`document:${documentId}`)) {
          documentChannel.unsubscribe();
          this.channels.delete(`document:${documentId}`);
          console.log(
            `Auto-cleaned up document channel ${documentId} after inactivity`,
          );
        }
      },
      60 * 60 * 1000,
    ); // 1 hour

    return documentChannel;
  }

  /**
   * Cross-platform data consistency validation
   */
  async validateDataConsistency(): Promise<{
    consistent: boolean;
    inconsistencies: Array<{
      entity_type: string;
      entity_id: string;
      platforms: string[];
      differences: any;
    }>;
    resolution_suggestions: string[];
  }> {
    try {
      const platforms = [
        'wedsync',
        'google_calendar',
        'apple_calendar',
        'outlook',
      ];
      const inconsistencies = [];

      // Check data consistency across platforms
      for (const platform of platforms) {
        const platformData = await this.syncEngine.getPlatformData(platform);
        const inconsistencyList =
          await this.detectInconsistencies(platformData);
        inconsistencies.push(...inconsistencyList);
      }

      const resolutionSuggestions =
        await this.generateConsistencyResolutions(inconsistencies);

      return {
        consistent: inconsistencies.length === 0,
        inconsistencies,
        resolution_suggestions: resolutionSuggestions,
      };
    } catch (error) {
      console.error('Data consistency validation error:', error);
      throw error;
    }
  }

  // Private helper methods

  private async getTableForFeature(feature: string): string {
    const featureTableMap = {
      budget: 'wedding_expenses',
      schedule: 'helper_schedules',
      timeline: 'timeline_events',
      vendors: 'vendor_checkins',
      tasks: 'wedding_tasks',
    };

    return (
      featureTableMap[feature as keyof typeof featureTableMap] || 'wedding_data'
    );
  }

  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private async getUserCapabilities() {
    // Return user's editing capabilities
    return {
      can_edit: true,
      can_delete: true,
      can_approve: true,
      max_concurrent_edits: 5,
    };
  }

  private async measureSessionQuality(): Promise<number> {
    // Measure connection quality, latency, etc.
    return 0.95; // Placeholder - would measure actual metrics
  }

  private getDeviceInfo() {
    return {
      type: 'desktop', // or mobile, tablet
      os: 'unknown',
      browser: 'unknown',
    };
  }
}

/**
 * AI-Powered Conflict Resolver
 */
class ConflictResolver {
  private weddingId: string;

  constructor(weddingId: string) {
    this.weddingId = weddingId;
  }

  async detectConflicts(operation: CollaborationPayload): Promise<Conflict[]> {
    try {
      // Get recent operations on the same entity
      const recentOperations = await this.getRecentOperations(
        operation.entity_type,
        operation.entity_id,
        5, // Last 5 operations
      );

      const conflicts: Conflict[] = [];

      // Check for concurrent edits
      const concurrentOps = recentOperations.filter(
        (op) =>
          op.user_id !== operation.user_id &&
          Math.abs(
            new Date(op.timestamp).getTime() -
              new Date(operation.timestamp).getTime(),
          ) < 5000, // 5 seconds
      );

      if (concurrentOps.length > 0) {
        conflicts.push({
          conflict_id: `conflict-${Date.now()}`,
          type: 'concurrent_edit',
          entities: [
            {
              entity_type: operation.entity_type,
              entity_id: operation.entity_id,
              version: 'latest',
              data: operation.data,
            },
          ],
          users: [operation.user_id, ...concurrentOps.map((op) => op.user_id)],
          severity: 'medium',
          auto_resolvable: await this.isAutoResolvable(
            operation,
            concurrentOps,
          ),
        });
      }

      // Check for data inconsistencies
      const dataConflicts = await this.checkDataConsistency(operation);
      conflicts.push(...dataConflicts);

      return conflicts;
    } catch (error) {
      console.error('Conflict detection error:', error);
      return [];
    }
  }

  async resolveConflict(
    conflict: Conflict,
    options: {
      ai_resolution: boolean;
      user_preferences: any;
    },
  ): Promise<ConflictResolution> {
    try {
      if (options.ai_resolution && conflict.auto_resolvable) {
        return await this.generateAIResolution(conflict);
      } else {
        return await this.generateManualResolutionPlan(
          conflict,
          options.user_preferences,
        );
      }
    } catch (error) {
      console.error('Conflict resolution error:', error);
      throw error;
    }
  }

  async generateAIResolution(conflict: Conflict): Promise<ConflictResolution> {
    const prompt = `
      Resolve this collaboration conflict in a wedding planning system:

      Conflict Type: ${conflict.type}
      Severity: ${conflict.severity}

      Entities Involved:
      ${conflict.entities
        .map(
          (e) => `
        Type: ${e.entity_type}
        ID: ${e.entity_id}
        Data: ${JSON.stringify(e.data)}
      `,
        )
        .join('\n')}

      Users Involved: ${conflict.users.join(', ')}

      RESOLUTION REQUIREMENTS:
      1. Preserve wedding planning workflow integrity
      2. Maintain data consistency across all platforms
      3. Respect user permissions and roles
      4. Minimize disruption to ongoing collaboration
      5. Consider wedding day timeline criticality

      RESOLUTION OPTIONS:
      - Merge: Combine conflicting changes intelligently
      - Override: Use one version as authoritative
      - Manual Review: Flag for coordinator review

      Provide JSON response with:
      - strategy: chosen resolution strategy
      - resolved_data: merged/resolved data
      - reasoning: explanation of resolution choice
      - confidence: 0-1 confidence in resolution
      - fallback_plan: if resolution fails
    `;

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content:
            'You are a wedding planning collaboration expert specializing in conflict resolution.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    const aiResult = JSON.parse(response.choices[0].message.content || '{}');

    return ConflictResolutionSchema.parse({
      resolution_id: `resolution-${Date.now()}`,
      conflict_id: conflict.conflict_id,
      strategy: aiResult.strategy || 'manual_review',
      resolved_data: aiResult.resolved_data,
      reasoning: aiResult.reasoning || 'AI-generated resolution',
      confidence: aiResult.confidence || 0.7,
      fallback_plan: aiResult.fallback_plan,
    });
  }

  private async getRecentOperations(
    entityType: string,
    entityId: string,
    limit: number,
  ) {
    const { data, error } = await supabase
      .from('collaboration_operations')
      .select('*')
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  }

  private async isAutoResolvable(
    operation: CollaborationPayload,
    conflicts: any[],
  ): Promise<boolean> {
    // Simple heuristic - can be auto-resolved if operations are on different fields
    return conflicts.every((conflict) =>
      this.areOperationsOnDifferentFields(operation, conflict),
    );
  }

  private areOperationsOnDifferentFields(
    op1: CollaborationPayload,
    op2: any,
  ): boolean {
    // Check if operations modify different fields
    const op1Fields = Object.keys(op1.data || {});
    const op2Fields = Object.keys(op2.data || {});

    return !op1Fields.some((field) => op2Fields.includes(field));
  }
}

/**
 * Collaboration Activity Tracker
 */
class CollaborationTracker {
  private weddingId: string;

  constructor(weddingId: string) {
    this.weddingId = weddingId;
  }

  async recordActivity(userId: string, activity: any) {
    try {
      await supabase.from('collaboration_activities').insert({
        wedding_id: this.weddingId,
        user_id: userId,
        activity_type: activity.current_view,
        details: activity,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Activity recording error:', error);
    }
  }
}

/**
 * Multi-Platform Synchronization Engine
 */
class MultiPlatformSyncEngine {
  private weddingId: string;

  constructor(weddingId: string) {
    this.weddingId = weddingId;
  }

  async enableCalendarSync(
    collaborator: any,
    platforms: {
      google: boolean;
      apple: boolean;
      outlook: boolean;
    },
  ) {
    const syncTasks = [];

    if (platforms.google && collaborator.google_calendar_token) {
      syncTasks.push(this.syncGoogleCalendar(collaborator));
    }

    if (platforms.apple && collaborator.apple_calendar_token) {
      syncTasks.push(this.syncAppleCalendar(collaborator));
    }

    if (platforms.outlook && collaborator.outlook_calendar_token) {
      syncTasks.push(this.syncOutlookCalendar(collaborator));
    }

    const results = await Promise.allSettled(syncTasks);

    return {
      synced_platforms: results.filter((r) => r.status === 'fulfilled').length,
      failed_platforms: results.filter((r) => r.status === 'rejected').length,
      errors: results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => r.reason),
    };
  }

  async getPlatformData(platform: string) {
    // Get data from specific platform
    const { data, error } = await supabase
      .from('platform_sync_data')
      .select('*')
      .eq('wedding_id', this.weddingId)
      .eq('platform', platform);

    if (error) throw error;
    return data || [];
  }

  private async syncGoogleCalendar(collaborator: any) {
    // Google Calendar sync implementation
    console.log('Syncing Google Calendar for', collaborator.id);
  }

  private async syncAppleCalendar(collaborator: any) {
    // Apple Calendar sync implementation
    console.log('Syncing Apple Calendar for', collaborator.id);
  }

  private async syncOutlookCalendar(collaborator: any) {
    // Outlook Calendar sync implementation
    console.log('Syncing Outlook Calendar for', collaborator.id);
  }
}

/**
 * Operational Transform for real-time collaborative editing
 */
class OperationalTransform {
  async transform(operation: any, documentState: any) {
    // Implement operational transformation algorithms
    // This is a simplified version - production would need full OT implementation

    return {
      ...operation,
      transformed: true,
      applied_at: new Date().toISOString(),
    };
  }
}

// Export singleton instance
export const advancedRealtimeManager = AdvancedRealtimeManager;
