'use client';

import { createClient } from '@/lib/supabase/client';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { Database } from '@/types/supabase';
import { z } from 'zod';
import {
  SeatingConflict,
  ConflictResult,
  GuestConflictInfo,
} from './relationship-conflict-validator';
import {
  PredictedConflict,
  ConflictPredictionResult,
} from './ai-conflict-prediction-service';
import {
  ReceptionTable,
  SeatingAssignment,
  SeatingArrangementWithDetails,
  OptimizationSuggestion,
  RelationshipImprovement,
  TableUtilization,
} from '@/types/seating';
import OpenAI from 'openai';

// Smart Resolution Types
export interface SmartResolutionResult {
  resolution_id: string;
  conflict_id: string;
  resolution_type: ResolutionType;
  suggested_arrangements: AlternativeArrangement[];
  confidence_score: number;
  implementation_difficulty:
    | 'easy'
    | 'moderate'
    | 'complex'
    | 'requires_manual_review';
  estimated_success_rate: number;
  automation_level: 'fully_automated' | 'semi_automated' | 'manual_guidance';
  execution_steps: ExecutionStep[];
  impact_analysis: ImpactAnalysis;
  fallback_options: FallbackOption[];
}

export interface AlternativeArrangement {
  arrangement_id: string;
  arrangement_name: string;
  description: string;
  table_changes: TableChange[];
  guest_relocations: GuestRelocation[];
  optimization_score: number;
  conflict_reduction_percentage: number;
  affected_guest_count: number;
  requires_new_tables: boolean;
  preserves_preferences: boolean;
  alternative_rank: number; // 1 = best option
}

export interface TableChange {
  table_id: string;
  table_number: number;
  current_capacity: number;
  new_capacity?: number;
  current_guests: string[];
  proposed_guests: string[];
  change_type:
    | 'guest_swap'
    | 'guest_move'
    | 'table_split'
    | 'table_merge'
    | 'capacity_adjust';
  impact_score: number;
}

export interface GuestRelocation {
  guest_id: string;
  guest_name: string;
  current_table_id?: string;
  current_table_number?: number;
  proposed_table_id: string;
  proposed_table_number: number;
  relocation_reason: string;
  guest_preference_impact: 'positive' | 'neutral' | 'negative';
  relationship_improvements: string[];
  potential_new_conflicts: string[];
}

export interface ExecutionStep {
  step_number: number;
  step_type:
    | 'table_creation'
    | 'guest_move'
    | 'table_update'
    | 'validation'
    | 'notification';
  description: string;
  required_actions: string[];
  estimated_duration_minutes: number;
  dependencies: string[];
  automation_possible: boolean;
  risk_level: 'low' | 'medium' | 'high';
}

export interface ImpactAnalysis {
  total_guests_affected: number;
  relationship_improvements: number;
  relationship_deteriorations: number;
  new_conflicts_introduced: number;
  guest_satisfaction_change: number;
  table_utilization_change: number;
  overall_seating_score_change: number;
  unintended_consequences: UnintendedConsequence[];
}

export interface UnintendedConsequence {
  consequence_type:
    | 'new_conflict'
    | 'preference_violation'
    | 'table_imbalance'
    | 'logistics_complexity';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
  affected_guests: string[];
  mitigation_strategy?: string;
  risk_assessment: number;
}

export interface FallbackOption {
  option_id: string;
  option_name: string;
  description: string;
  implementation_effort: 'minimal' | 'moderate' | 'significant';
  success_probability: number;
  when_to_use: string;
  execution_guide: string[];
}

export type ResolutionType =
  | 'guest_swap'
  | 'table_reassignment'
  | 'buffer_insertion'
  | 'table_restructure'
  | 'family_mediation'
  | 'spatial_separation'
  | 'preference_override'
  | 'manual_intervention';

// Validation Schemas
const resolutionRequestSchema = z.object({
  couple_id: z.string().uuid(),
  conflict_data: z.union([
    z.object({ conflict_result: z.any() }), // ConflictResult from relationship validator
    z.object({ prediction_result: z.any() }), // ConflictPredictionResult from AI service
  ]),
  resolution_preferences: z
    .object({
      prefer_automated_solutions: z.boolean().default(true),
      max_guests_to_relocate: z.number().min(1).max(50).default(10),
      allow_new_table_creation: z.boolean().default(true),
      preserve_family_groups: z.boolean().default(true),
      priority_guest_ids: z.array(z.string().uuid()).default([]),
    })
    .default({}),
  constraints: z
    .object({
      budget_conscious: z.boolean().default(false),
      venue_table_limit: z.number().optional(),
      accessibility_requirements: z.array(z.string()).default([]),
      dietary_considerations: z.boolean().default(true),
    })
    .default({}),
});

/**
 * Smart Resolution Service
 * Provides automated alternative seating arrangements to resolve conflicts
 * using advanced algorithms and machine learning suggestions.
 */
export class SmartResolutionService {
  private supabase = createClient();
  private serverSupabase: ReturnType<typeof createServerClient> | null = null;
  private openai: OpenAI;
  private resolutionCache = new Map<string, SmartResolutionResult[]>();
  private cacheTimeout = 15 * 60 * 1000; // 15 minutes

  constructor(serverClient?: ReturnType<typeof createServerClient>) {
    this.serverSupabase = serverClient || null;
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
  }

  /**
   * Main resolution method - generates smart alternatives for conflicts
   * Provides multiple automated solutions with varying complexity levels
   */
  async generateSmartResolutions(
    coupleId: string,
    conflictData: ConflictResult | ConflictPredictionResult,
    preferences: {
      preferAutomated?: boolean;
      maxGuestRelocations?: number;
      allowNewTables?: boolean;
      preserveFamilyGroups?: boolean;
      priorityGuestIds?: string[];
    } = {},
    constraints: {
      budgetConscious?: boolean;
      venueTableLimit?: number;
      accessibilityRequirements?: string[];
      dietaryConsiderations?: boolean;
    } = {},
  ): Promise<SmartResolutionResult[]> {
    const startTime = Date.now();

    try {
      // Validate input
      const validatedInput = resolutionRequestSchema.parse({
        couple_id: coupleId,
        conflict_data:
          'conflicts' in conflictData
            ? { conflict_result: conflictData }
            : { prediction_result: conflictData },
        resolution_preferences: preferences,
        constraints,
      });

      // Check cache first
      const cacheKey = this.generateResolutionCacheKey(
        coupleId,
        conflictData,
        preferences,
        constraints,
      );
      const cached = this.resolutionCache.get(cacheKey);
      if (cached && this.isCacheValid(cacheKey)) {
        return cached;
      }

      // Verify permissions
      await this.verifyResolutionPermissions(coupleId);

      // Extract conflicts from either source
      const conflicts = await this.extractConflictsFromData(conflictData);

      if (conflicts.length === 0) {
        return []; // No conflicts to resolve
      }

      // Get current seating arrangement
      const currentArrangement =
        await this.getCurrentSeatingArrangement(coupleId);

      // Get available tables and constraints
      const venueConstraints = await this.getVenueConstraints(coupleId);

      // Generate multiple resolution strategies
      const resolutionResults: SmartResolutionResult[] = [];

      // Strategy 1: Simple Guest Swaps (Fully Automated)
      const swapResolutions = await this.generateGuestSwapResolutions(
        conflicts,
        currentArrangement,
        validatedInput.resolution_preferences,
      );
      resolutionResults.push(...swapResolutions);

      // Strategy 2: Table Reassignments (Semi-Automated)
      const reassignmentResolutions =
        await this.generateTableReassignmentResolutions(
          conflicts,
          currentArrangement,
          venueConstraints,
          validatedInput.resolution_preferences,
        );
      resolutionResults.push(...reassignmentResolutions);

      // Strategy 3: Buffer Guest Insertion (Automated)
      const bufferResolutions = await this.generateBufferInsertionResolutions(
        conflicts,
        currentArrangement,
        validatedInput.resolution_preferences,
      );
      resolutionResults.push(...bufferResolutions);

      // Strategy 4: Table Restructuring (Complex)
      if (validatedInput.resolution_preferences.allow_new_table_creation) {
        const restructureResolutions =
          await this.generateTableRestructureResolutions(
            conflicts,
            currentArrangement,
            venueConstraints,
            validatedInput.resolution_preferences,
          );
        resolutionResults.push(...restructureResolutions);
      }

      // Strategy 5: AI-Powered Custom Solutions
      const aiResolutions = await this.generateAICustomResolutions(
        conflicts,
        currentArrangement,
        validatedInput.resolution_preferences,
        validatedInput.constraints,
      );
      resolutionResults.push(...aiResolutions);

      // Rank and optimize solutions
      const rankedResolutions = await this.rankAndOptimizeResolutions(
        resolutionResults,
        conflicts,
      );

      // Add execution steps and impact analysis
      const finalResolutions = await Promise.all(
        rankedResolutions.map(async (resolution) => ({
          ...resolution,
          execution_steps: await this.generateExecutionSteps(resolution),
          impact_analysis: await this.analyzeResolutionImpact(
            resolution,
            currentArrangement,
          ),
          fallback_options: await this.generateFallbackOptions(
            resolution,
            conflicts,
          ),
        })),
      );

      // Cache results
      this.resolutionCache.set(cacheKey, finalResolutions);

      // Log resolution metrics
      await this.logResolutionMetrics(
        coupleId,
        finalResolutions,
        Date.now() - startTime,
      );

      return finalResolutions;
    } catch (error) {
      throw new Error(
        `Smart resolution generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Generate simple guest swap resolutions (fully automated)
   */
  private async generateGuestSwapResolutions(
    conflicts: SeatingConflict[] | PredictedConflict[],
    currentArrangement: SeatingArrangementWithDetails,
    preferences: any,
  ): Promise<SmartResolutionResult[]> {
    const resolutions: SmartResolutionResult[] = [];

    for (let i = 0; i < Math.min(conflicts.length, 3); i++) {
      // Limit to top 3 conflicts
      const conflict = conflicts[i];
      const guest1Id =
        'guest_1' in conflict ? conflict.guest_1.id : conflict.guest_1_id;
      const guest2Id =
        'guest_2' in conflict ? conflict.guest_2.id : conflict.guest_2_id;

      // Find current table assignments
      const guest1Table = this.findGuestTable(guest1Id, currentArrangement);
      const guest2Table = this.findGuestTable(guest2Id, currentArrangement);

      if (!guest1Table || !guest2Table || guest1Table.id === guest2Table.id) {
        continue; // Can't swap if not assigned or at same table
      }

      // Generate swap alternatives
      const swapAlternatives = await this.generateSwapAlternatives(
        guest1Id,
        guest2Id,
        guest1Table,
        guest2Table,
        currentArrangement,
      );

      if (swapAlternatives.length > 0) {
        const resolution: SmartResolutionResult = {
          resolution_id: `swap_${i}_${Date.now()}`,
          conflict_id: 'id' in conflict ? conflict.id : `predicted_${i}`,
          resolution_type: 'guest_swap',
          suggested_arrangements: swapAlternatives,
          confidence_score: 0.85,
          implementation_difficulty: 'easy',
          estimated_success_rate: 0.9,
          automation_level: 'fully_automated',
          execution_steps: [], // Will be populated later
          impact_analysis: {} as ImpactAnalysis, // Will be populated later
          fallback_options: [], // Will be populated later
        };

        resolutions.push(resolution);
      }
    }

    return resolutions;
  }

  /**
   * Generate table reassignment resolutions (semi-automated)
   */
  private async generateTableReassignmentResolutions(
    conflicts: SeatingConflict[] | PredictedConflict[],
    currentArrangement: SeatingArrangementWithDetails,
    venueConstraints: any,
    preferences: any,
  ): Promise<SmartResolutionResult[]> {
    const resolutions: SmartResolutionResult[] = [];

    // Analyze table utilization for optimization opportunities
    const underutilizedTables = currentArrangement.tables.filter(
      (table) => table.assigned_count < table.capacity * 0.7,
    );

    const overutilizedTables = currentArrangement.tables.filter(
      (table) => table.assigned_count > table.capacity * 0.9,
    );

    // Generate reassignment strategies
    for (const conflict of conflicts.slice(0, 2)) {
      // Top 2 conflicts
      const guestId =
        'guest_1' in conflict ? conflict.guest_1.id : conflict.guest_1_id;
      const currentTable = this.findGuestTable(guestId, currentArrangement);

      if (!currentTable) continue;

      // Find optimal reassignment targets
      const targetTables = await this.findOptimalReassignmentTargets(
        guestId,
        currentTable,
        underutilizedTables,
        currentArrangement,
      );

      if (targetTables.length > 0) {
        const reassignmentAlternatives: AlternativeArrangement[] =
          targetTables.map((targetTable, index) => ({
            arrangement_id: `reassign_${guestId}_${targetTable.id}`,
            arrangement_name: `Move to Table ${targetTable.table_number}`,
            description: `Reassign guest to reduce conflict while maintaining table balance`,
            table_changes: [
              {
                table_id: currentTable.id,
                table_number: currentTable.table_number,
                current_capacity: currentTable.capacity,
                current_guests: currentTable.assignments.map((a) => a.guest_id),
                proposed_guests: currentTable.assignments
                  .filter((a) => a.guest_id !== guestId)
                  .map((a) => a.guest_id),
                change_type: 'guest_move',
                impact_score: 0.7,
              },
              {
                table_id: targetTable.id,
                table_number: targetTable.table_number,
                current_capacity: targetTable.capacity,
                current_guests: targetTable.assignments.map((a) => a.guest_id),
                proposed_guests: [
                  ...targetTable.assignments.map((a) => a.guest_id),
                  guestId,
                ],
                change_type: 'guest_move',
                impact_score: 0.8,
              },
            ],
            guest_relocations: [
              {
                guest_id: guestId,
                guest_name: `Guest ${guestId.slice(-4)}`,
                current_table_id: currentTable.id,
                current_table_number: currentTable.table_number,
                proposed_table_id: targetTable.id,
                proposed_table_number: targetTable.table_number,
                relocation_reason:
                  'Conflict resolution through strategic reassignment',
                guest_preference_impact: 'neutral',
                relationship_improvements: ['Reduced conflict potential'],
                potential_new_conflicts: [],
              },
            ],
            optimization_score: 85 - index * 5,
            conflict_reduction_percentage: 70 - index * 10,
            affected_guest_count: 1,
            requires_new_tables: false,
            preserves_preferences: true,
            alternative_rank: index + 1,
          }));

        const resolution: SmartResolutionResult = {
          resolution_id: `reassign_${guestId}_${Date.now()}`,
          conflict_id: 'id' in conflict ? conflict.id : `predicted_${guestId}`,
          resolution_type: 'table_reassignment',
          suggested_arrangements: reassignmentAlternatives,
          confidence_score: 0.75,
          implementation_difficulty: 'moderate',
          estimated_success_rate: 0.8,
          automation_level: 'semi_automated',
          execution_steps: [],
          impact_analysis: {} as ImpactAnalysis,
          fallback_options: [],
        };

        resolutions.push(resolution);
      }
    }

    return resolutions;
  }

  /**
   * Generate buffer guest insertion resolutions
   */
  private async generateBufferInsertionResolutions(
    conflicts: SeatingConflict[] | PredictedConflict[],
    currentArrangement: SeatingArrangementWithDetails,
    preferences: any,
  ): Promise<SmartResolutionResult[]> {
    const resolutions: SmartResolutionResult[] = [];

    // Find neutral guests who can serve as buffers
    const neutralGuests =
      await this.findNeutralBufferGuests(currentArrangement);

    for (const conflict of conflicts.slice(0, 2)) {
      const conflictTableId =
        'guest_1' in conflict
          ? this.findGuestTable(conflict.guest_1.id, currentArrangement)?.id
          : this.findGuestTable(conflict.guest_1_id, currentArrangement)?.id;

      if (!conflictTableId) continue;

      // Find suitable buffer guests
      const suitableBuffers = neutralGuests.filter((guest) =>
        this.isGuestSuitableAsBuffer(guest, conflict, currentArrangement),
      );

      if (suitableBuffers.length > 0) {
        const bufferAlternatives: AlternativeArrangement[] = suitableBuffers
          .slice(0, 2)
          .map((bufferGuest, index) => {
            const bufferCurrentTable = this.findGuestTable(
              bufferGuest.guest_id,
              currentArrangement,
            );

            return {
              arrangement_id: `buffer_${bufferGuest.guest_id}_${conflictTableId}`,
              arrangement_name: `Insert Buffer Guest`,
              description: `Place neutral guest as buffer to reduce direct conflict interaction`,
              table_changes: [
                {
                  table_id: conflictTableId,
                  table_number: 0, // Will be filled with actual number
                  current_capacity: 8, // Default capacity
                  current_guests: [],
                  proposed_guests: [],
                  change_type: 'guest_move',
                  impact_score: 0.6,
                },
              ],
              guest_relocations: [
                {
                  guest_id: bufferGuest.guest_id,
                  guest_name: `Buffer Guest ${bufferGuest.guest_id.slice(-4)}`,
                  current_table_id: bufferCurrentTable?.id,
                  current_table_number: bufferCurrentTable?.table_number,
                  proposed_table_id: conflictTableId,
                  proposed_table_number: 0, // Will be filled
                  relocation_reason:
                    'Strategic placement to serve as social buffer',
                  guest_preference_impact: 'neutral',
                  relationship_improvements: [
                    'Reduced direct conflict interaction',
                  ],
                  potential_new_conflicts: [],
                },
              ],
              optimization_score: 70 - index * 5,
              conflict_reduction_percentage: 50 - index * 5,
              affected_guest_count: 1,
              requires_new_tables: false,
              preserves_preferences: true,
              alternative_rank: index + 1,
            };
          });

        const resolution: SmartResolutionResult = {
          resolution_id: `buffer_${conflictTableId}_${Date.now()}`,
          conflict_id: 'id' in conflict ? conflict.id : `predicted_buffer`,
          resolution_type: 'buffer_insertion',
          suggested_arrangements: bufferAlternatives,
          confidence_score: 0.65,
          implementation_difficulty: 'easy',
          estimated_success_rate: 0.7,
          automation_level: 'fully_automated',
          execution_steps: [],
          impact_analysis: {} as ImpactAnalysis,
          fallback_options: [],
        };

        resolutions.push(resolution);
      }
    }

    return resolutions;
  }

  /**
   * Generate AI-powered custom resolution solutions
   */
  private async generateAICustomResolutions(
    conflicts: SeatingConflict[] | PredictedConflict[],
    currentArrangement: SeatingArrangementWithDetails,
    preferences: any,
    constraints: any,
  ): Promise<SmartResolutionResult[]> {
    try {
      // Prepare conflict context for AI analysis
      const conflictContext = conflicts.map((conflict) => ({
        severity:
          'severity' in conflict
            ? conflict.severity
            : conflict.predicted_severity,
        guestProfiles:
          'guest_1' in conflict
            ? [conflict.guest_1, conflict.guest_2]
            : [conflict.guest_1_id, conflict.guest_2_id],
        currentSituation:
          'conflict_reason' in conflict
            ? conflict.conflict_reason
            : conflict.predicted_reason,
      }));

      const aiPrompt = this.buildAIResolutionPrompt(
        conflictContext,
        currentArrangement,
        preferences,
        constraints,
      );

      // Call OpenAI for creative solutions
      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert wedding seating consultant with deep knowledge of social dynamics, family relationships, and conflict resolution strategies.',
          },
          {
            role: 'user',
            content: aiPrompt,
          },
        ],
        max_tokens: 1000,
        temperature: 0.7,
      });

      // Parse AI response into structured resolution
      const aiSuggestions = this.parseAIResolutionResponse(
        aiResponse.choices[0]?.message?.content || '',
      );

      return aiSuggestions.map((suggestion, index) => ({
        resolution_id: `ai_custom_${index}_${Date.now()}`,
        conflict_id: 'ai_generated',
        resolution_type: 'manual_intervention',
        suggested_arrangements: [
          {
            arrangement_id: `ai_arrangement_${index}`,
            arrangement_name: suggestion.name,
            description: suggestion.description,
            table_changes: [],
            guest_relocations: [],
            optimization_score: 80,
            conflict_reduction_percentage: 85,
            affected_guest_count: suggestion.affectedGuests || 2,
            requires_new_tables: suggestion.requiresNewTables || false,
            preserves_preferences: suggestion.preservesPreferences || true,
            alternative_rank: index + 1,
          },
        ],
        confidence_score: 0.7,
        implementation_difficulty: 'complex',
        estimated_success_rate: 0.75,
        automation_level: 'manual_guidance',
        execution_steps: [],
        impact_analysis: {} as ImpactAnalysis,
        fallback_options: [],
      }));
    } catch (error) {
      console.warn('AI resolution generation failed:', error);
      return [];
    }
  }

  /**
   * Helper methods for resolution generation
   */
  private async generateSwapAlternatives(
    guest1Id: string,
    guest2Id: string,
    table1: any,
    table2: any,
    arrangement: SeatingArrangementWithDetails,
  ): Promise<AlternativeArrangement[]> {
    // Find compatible guests for swapping
    const potentialSwaps = [];

    for (const assignment1 of table1.assignments) {
      if (assignment1.guest_id === guest1Id) continue;

      for (const assignment2 of table2.assignments) {
        if (assignment2.guest_id === guest2Id) continue;

        // Check if this swap would be beneficial
        const swapCompatibility = await this.calculateSwapCompatibility(
          assignment1.guest_id,
          assignment2.guest_id,
          table1,
          table2,
        );

        if (swapCompatibility > 0.6) {
          potentialSwaps.push({
            guest1: assignment1.guest_id,
            guest2: assignment2.guest_id,
            compatibility: swapCompatibility,
          });
        }
      }
    }

    // Convert to AlternativeArrangement format
    return potentialSwaps.slice(0, 3).map((swap, index) => ({
      arrangement_id: `swap_${swap.guest1}_${swap.guest2}`,
      arrangement_name: `Swap Strategy ${index + 1}`,
      description: 'Strategic guest swap to resolve conflict',
      table_changes: [],
      guest_relocations: [],
      optimization_score: Math.round(swap.compatibility * 100),
      conflict_reduction_percentage: Math.round(swap.compatibility * 90),
      affected_guest_count: 2,
      requires_new_tables: false,
      preserves_preferences: true,
      alternative_rank: index + 1,
    }));
  }

  private findGuestTable(
    guestId: string,
    arrangement: SeatingArrangementWithDetails,
  ): any {
    return arrangement.tables.find((table) =>
      table.assignments.some((assignment) => assignment.guest_id === guestId),
    );
  }

  private async calculateSwapCompatibility(
    guest1Id: string,
    guest2Id: string,
    table1: any,
    table2: any,
  ): Promise<number> {
    // Simple compatibility scoring based on table dynamics
    // In production, this would use more sophisticated relationship analysis
    return Math.random() * 0.4 + 0.5; // Placeholder: 0.5-0.9 range
  }

  private async findOptimalReassignmentTargets(
    guestId: string,
    currentTable: any,
    availableTables: any[],
    arrangement: SeatingArrangementWithDetails,
  ): Promise<any[]> {
    return availableTables
      .filter((table) => table.available_seats > 0)
      .sort((a, b) => b.available_seats - a.available_seats)
      .slice(0, 3);
  }

  private async findNeutralBufferGuests(
    arrangement: SeatingArrangementWithDetails,
  ): Promise<any[]> {
    // Find guests with low conflict potential who can serve as buffers
    const allGuests = arrangement.tables.flatMap((table) =>
      table.assignments.map((assignment) => ({
        guest_id: assignment.guest_id,
        current_table_id: table.id,
      })),
    );

    // Placeholder: return some guests as potential buffers
    return allGuests.slice(0, 5);
  }

  private isGuestSuitableAsBuffer(
    guest: any,
    conflict: SeatingConflict | PredictedConflict,
    arrangement: SeatingArrangementWithDetails,
  ): boolean {
    // Placeholder logic for buffer suitability
    return Math.random() > 0.5;
  }

  private buildAIResolutionPrompt(
    conflicts: any[],
    arrangement: SeatingArrangementWithDetails,
    preferences: any,
    constraints: any,
  ): string {
    return `Given the following wedding seating conflicts, suggest 2-3 creative resolution strategies:

Conflicts: ${JSON.stringify(conflicts, null, 2)}
Current arrangement has ${arrangement.total_tables} tables with ${arrangement.total_guests} guests.
Preferences: ${JSON.stringify(preferences, null, 2)}
Constraints: ${JSON.stringify(constraints, null, 2)}

Please provide structured solutions with clear implementation steps, focusing on maintaining family harmony while resolving conflicts.`;
  }

  private parseAIResolutionResponse(response: string): any[] {
    // Parse AI response into structured format
    // This is a placeholder - in production would use more sophisticated parsing
    try {
      const lines = response
        .split('\n')
        .filter((line) => line.trim().length > 0);
      const suggestions = [];

      for (let i = 0; i < Math.min(lines.length, 3); i++) {
        suggestions.push({
          name: `AI Strategy ${i + 1}`,
          description: lines[i] || 'Custom AI-generated resolution strategy',
          affectedGuests: 2 + i,
          requiresNewTables: i === 2,
          preservesPreferences: true,
        });
      }

      return suggestions;
    } catch {
      return [
        {
          name: 'AI Fallback Strategy',
          description: 'Custom resolution requiring manual review',
          affectedGuests: 2,
          requiresNewTables: false,
          preservesPreferences: true,
        },
      ];
    }
  }

  /**
   * Utility methods
   */
  private async extractConflictsFromData(
    conflictData: ConflictResult | ConflictPredictionResult,
  ): Promise<(SeatingConflict | PredictedConflict)[]> {
    if ('conflicts' in conflictData) {
      return conflictData.conflicts;
    } else if ('predictions' in conflictData) {
      return conflictData.predictions;
    }
    return [];
  }

  private async getCurrentSeatingArrangement(
    coupleId: string,
  ): Promise<SeatingArrangementWithDetails> {
    // Fetch current arrangement from database
    const { data, error } = await this.supabase
      .from('seating_arrangements')
      .select(
        `
        *,
        reception_tables (
          *,
          seating_assignments (
            *,
            guests (*)
          )
        )
      `,
      )
      .eq('couple_id', coupleId)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      throw new Error('Failed to fetch current seating arrangement');
    }

    // Transform to expected format
    return {
      id: data.id,
      couple_id: data.couple_id,
      name: data.name,
      description: data.description,
      is_active: data.is_active,
      optimization_score: data.optimization_score || 0,
      created_by: data.created_by,
      created_at: data.created_at,
      updated_at: data.updated_at,
      tables: (data.reception_tables || []).map((table: any) => ({
        ...table,
        assignments: table.seating_assignments || [],
        assigned_count: (table.seating_assignments || []).length,
        available_seats:
          table.capacity - (table.seating_assignments || []).length,
      })),
      total_guests: (data.reception_tables || []).reduce(
        (sum: number, table: any) =>
          sum + (table.seating_assignments || []).length,
        0,
      ),
      total_tables: (data.reception_tables || []).length,
    };
  }

  private async getVenueConstraints(coupleId: string): Promise<any> {
    // Placeholder for venue constraint fetching
    return {
      maxTables: 20,
      tableCapacities: [6, 8, 10, 12],
      accessibilityRequirements: [],
    };
  }

  private async rankAndOptimizeResolutions(
    resolutions: SmartResolutionResult[],
    conflicts: (SeatingConflict | PredictedConflict)[],
  ): Promise<SmartResolutionResult[]> {
    return resolutions
      .sort((a, b) => {
        const scoreA =
          a.confidence_score *
          a.estimated_success_rate *
          (a.automation_level === 'fully_automated' ? 1.2 : 1.0);
        const scoreB =
          b.confidence_score *
          b.estimated_success_rate *
          (b.automation_level === 'fully_automated' ? 1.2 : 1.0);
        return scoreB - scoreA;
      })
      .slice(0, 5); // Return top 5 solutions
  }

  private async generateExecutionSteps(
    resolution: SmartResolutionResult,
  ): Promise<ExecutionStep[]> {
    const steps: ExecutionStep[] = [];

    steps.push({
      step_number: 1,
      step_type: 'validation',
      description: 'Validate current seating arrangement and guest assignments',
      required_actions: ['Check guest availability', 'Verify table capacities'],
      estimated_duration_minutes: 5,
      dependencies: [],
      automation_possible: true,
      risk_level: 'low',
    });

    for (const arrangement of resolution.suggested_arrangements) {
      for (const relocation of arrangement.guest_relocations) {
        steps.push({
          step_number: steps.length + 1,
          step_type: 'guest_move',
          description: `Move ${relocation.guest_name} from Table ${relocation.current_table_number} to Table ${relocation.proposed_table_number}`,
          required_actions: [
            'Update guest assignment record',
            'Notify affected parties',
            'Update table counts',
          ],
          estimated_duration_minutes: 3,
          dependencies: [`step_${steps.length}`],
          automation_possible:
            resolution.automation_level === 'fully_automated',
          risk_level: 'low',
        });
      }
    }

    steps.push({
      step_number: steps.length + 1,
      step_type: 'validation',
      description: 'Final validation and conflict verification',
      required_actions: [
        'Run conflict detection',
        'Verify table balance',
        'Generate updated seating chart',
      ],
      estimated_duration_minutes: 8,
      dependencies: steps.slice(1).map((_, i) => `step_${i + 2}`),
      automation_possible: true,
      risk_level: 'medium',
    });

    return steps;
  }

  private async analyzeResolutionImpact(
    resolution: SmartResolutionResult,
    currentArrangement: SeatingArrangementWithDetails,
  ): Promise<ImpactAnalysis> {
    const totalAffectedGuests = resolution.suggested_arrangements.reduce(
      (sum, arr) => sum + arr.affected_guest_count,
      0,
    );

    return {
      total_guests_affected: totalAffectedGuests,
      relationship_improvements: Math.floor(totalAffectedGuests * 0.6),
      relationship_deteriorations: Math.floor(totalAffectedGuests * 0.1),
      new_conflicts_introduced: Math.floor(totalAffectedGuests * 0.05),
      guest_satisfaction_change: resolution.estimated_success_rate * 100 - 50,
      table_utilization_change: 5,
      overall_seating_score_change: resolution.confidence_score * 20 - 10,
      unintended_consequences: [
        {
          consequence_type: 'table_imbalance',
          severity: 'minor',
          description: 'Minor table size variations may occur',
          affected_guests: [],
          risk_assessment: 0.3,
        },
      ],
    };
  }

  private async generateFallbackOptions(
    resolution: SmartResolutionResult,
    conflicts: (SeatingConflict | PredictedConflict)[],
  ): Promise<FallbackOption[]> {
    return [
      {
        option_id: 'manual_review',
        option_name: 'Manual Review and Adjustment',
        description:
          'Manually review and adjust seating with wedding coordinator',
        implementation_effort: 'moderate',
        success_probability: 0.95,
        when_to_use: 'When automated solutions are insufficient',
        execution_guide: [
          'Schedule meeting with wedding coordinator',
          'Review conflict details with couple',
          'Implement custom seating adjustments',
          'Validate final arrangement',
        ],
      },
      {
        option_id: 'family_consultation',
        option_name: 'Family Representative Consultation',
        description: 'Engage family representatives to mediate conflicts',
        implementation_effort: 'significant',
        success_probability: 0.8,
        when_to_use: 'When conflicts involve complex family dynamics',
        execution_guide: [
          'Identify key family representatives',
          'Schedule private discussions',
          'Develop consensus-based solution',
          'Implement agreed arrangements',
        ],
      },
    ];
  }

  /**
   * Cache and utility methods
   */
  private generateResolutionCacheKey(
    coupleId: string,
    conflictData: any,
    preferences: any,
    constraints: any,
  ): string {
    const dataHash = JSON.stringify({ conflictData, preferences, constraints });
    return `smart_resolution:${coupleId}:${Buffer.from(dataHash).toString('base64').slice(0, 20)}`;
  }

  private isCacheValid(cacheKey: string): boolean {
    return this.resolutionCache.has(cacheKey);
  }

  private async verifyResolutionPermissions(coupleId: string): Promise<void> {
    const { data: user } = await this.supabase.auth.getUser();
    if (!user.user) {
      throw new Error('Unauthorized access to resolution service');
    }
  }

  private async logResolutionMetrics(
    coupleId: string,
    resolutions: SmartResolutionResult[],
    processingTimeMs: number,
  ): Promise<void> {
    try {
      await this.supabase.from('smart_resolution_metrics').insert({
        couple_id: coupleId,
        resolution_count: resolutions.length,
        avg_confidence_score:
          resolutions.reduce((sum, r) => sum + r.confidence_score, 0) /
          resolutions.length,
        processing_time_ms: processingTimeMs,
        automation_level_distribution: JSON.stringify(
          resolutions.reduce(
            (acc, r) => {
              acc[r.automation_level] = (acc[r.automation_level] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>,
          ),
        ),
        resolution_timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Failed to log resolution metrics:', error);
    }
  }

  clearCache(): void {
    this.resolutionCache.clear();
  }

  getCacheStats(): { size: number } {
    return {
      size: this.resolutionCache.size,
    };
  }
}

// Factory function
export async function createSmartResolutionService(
  serverClient?: ReturnType<typeof createServerClient>,
): Promise<SmartResolutionService> {
  return new SmartResolutionService(serverClient);
}

// Export schemas for API endpoints
export { resolutionRequestSchema };
