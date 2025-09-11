/**
 * Advanced Seating Optimization Engine
 * Implements graph-based algorithms for optimal table assignment
 * Optimized for 200+ guests with <5 second processing time
 */

import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

// Types and Interfaces
export interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  category: 'family' | 'friends' | 'work' | 'other';
  side: 'partner1' | 'partner2' | 'mutual';
  age_group: 'adult' | 'child' | 'infant';
  plus_one: boolean;
  dietary_restrictions?: string | null;
  special_needs?: string | null;
  household_id?: string | null;
  tags: string[];
}

export interface GuestRelationship {
  id: string;
  couple_id: string;
  guest1_id: string;
  guest2_id: string;
  relationship_type:
    | 'family'
    | 'friends'
    | 'colleagues'
    | 'acquaintances'
    | 'avoid';
  relationship_strength: number; // -10 to 10 scale
  notes?: string;
  created_at: string;
}

export interface TableConfiguration {
  table_number: number;
  capacity: number;
  table_shape: 'round' | 'rectangular' | 'square';
  location_notes?: string;
  special_requirements?: string;
}

export interface OptimizationPreferences {
  prioritize_families: boolean;
  separate_conflicting_guests: boolean;
  balance_age_groups: boolean;
  consider_dietary_needs: boolean;
}

export interface SeatingArrangement {
  [tableNumber: number]: {
    guests: string[]; // guest IDs
    capacity: number;
    utilization: number;
  };
}

export interface OptimizationResult {
  arrangement: SeatingArrangement;
  score: number;
  conflicts: ConflictDetail[];
  recommendations: string[];
  processingTime: number;
  metadata: {
    algorithm_version: string;
    guest_count: number;
    table_count: number;
    optimization_iterations: number;
  };
}

export interface ConflictDetail {
  type: 'relationship' | 'capacity' | 'dietary' | 'age' | 'household';
  severity: 'high' | 'medium' | 'low';
  guests_involved: string[];
  table_numbers: number[];
  description: string;
  suggested_resolution?: string;
}

// Weighted Graph for Guest Relationships
class RelationshipGraph {
  private adjacencyList: Map<string, Map<string, number>> = new Map();
  private guestData: Map<string, Guest> = new Map();

  constructor(guests: Guest[], relationships: GuestRelationship[]) {
    // Initialize graph with guests
    guests.forEach((guest) => {
      this.guestData.set(guest.id, guest);
      this.adjacencyList.set(guest.id, new Map());
    });

    // Add relationships with weights
    relationships.forEach((rel) => {
      this.addEdge(rel.guest1_id, rel.guest2_id, rel.relationship_strength);
    });

    // Add implicit relationships based on categories and households
    this.addImplicitRelationships(guests);
  }

  private addEdge(guest1: string, guest2: string, weight: number): void {
    if (!this.adjacencyList.has(guest1) || !this.adjacencyList.has(guest2)) {
      return;
    }
    this.adjacencyList.get(guest1)!.set(guest2, weight);
    this.adjacencyList.get(guest2)!.set(guest1, weight);
  }

  private addImplicitRelationships(guests: Guest[]): void {
    // Group by household
    const households = new Map<string, Guest[]>();
    guests.forEach((guest) => {
      if (guest.household_id) {
        if (!households.has(guest.household_id)) {
          households.set(guest.household_id, []);
        }
        households.get(guest.household_id)!.push(guest);
      }
    });

    // Add strong positive relationships within households
    households.forEach((householdGuests) => {
      for (let i = 0; i < householdGuests.length; i++) {
        for (let j = i + 1; j < householdGuests.length; j++) {
          const guest1 = householdGuests[i];
          const guest2 = householdGuests[j];
          if (!this.getRelationshipStrength(guest1.id, guest2.id)) {
            this.addEdge(guest1.id, guest2.id, 8); // Strong household bond
          }
        }
      }
    });

    // Add moderate relationships for same category/side
    for (let i = 0; i < guests.length; i++) {
      for (let j = i + 1; j < guests.length; j++) {
        const guest1 = guests[i];
        const guest2 = guests[j];

        if (!this.getRelationshipStrength(guest1.id, guest2.id)) {
          let weight = 0;

          // Same family category gets positive weight
          if (guest1.category === 'family' && guest2.category === 'family') {
            weight += 3;
          }

          // Same side gets small positive weight
          if (guest1.side === guest2.side && guest1.side !== 'mutual') {
            weight += 1;
          }

          // Similar age groups
          if (guest1.age_group === guest2.age_group) {
            weight += 1;
          }

          if (weight > 0) {
            this.addEdge(guest1.id, guest2.id, weight);
          }
        }
      }
    }
  }

  getRelationshipStrength(guest1: string, guest2: string): number {
    return this.adjacencyList.get(guest1)?.get(guest2) || 0;
  }

  getConnectedGuests(guestId: string): string[] {
    return Array.from(this.adjacencyList.get(guestId)?.keys() || []);
  }

  getGuestData(guestId: string): Guest | undefined {
    return this.guestData.get(guestId);
  }

  getAllGuests(): Guest[] {
    return Array.from(this.guestData.values());
  }
}

// Advanced Seating Optimization Engine
export class SeatingOptimizationEngine {
  private performanceTracker = performanceMonitor;

  async optimize(params: {
    guests: Guest[];
    relationships: GuestRelationship[];
    tableConfigurations: TableConfiguration[];
    preferences: OptimizationPreferences;
    optimizationLevel: 'basic' | 'standard' | 'advanced';
  }): Promise<OptimizationResult> {
    const startTime = performance.now();

    try {
      // Build relationship graph
      const graph = new RelationshipGraph(params.guests, params.relationships);

      // Initialize optimization algorithm
      const optimizer = new ConstraintSatisfactionOptimizer(
        graph,
        params.tableConfigurations,
        params.preferences,
      );

      // Run optimization based on level
      let arrangement: SeatingArrangement;
      let iterations = 0;

      switch (params.optimizationLevel) {
        case 'basic':
          arrangement = await optimizer.greedyOptimization();
          iterations = 1;
          break;
        case 'standard':
          arrangement = await optimizer.simulatedAnnealingOptimization();
          iterations = 100;
          break;
        case 'advanced':
          arrangement = await optimizer.hybridOptimization();
          iterations = 500;
          break;
        default:
          throw new Error('Invalid optimization level');
      }

      // Calculate final score and detect conflicts
      const score = this.calculateArrangementScore(
        arrangement,
        graph,
        params.preferences,
      );
      const conflicts = this.detectConflicts(
        arrangement,
        graph,
        params.tableConfigurations,
      );
      const recommendations = this.generateRecommendations(
        arrangement,
        graph,
        conflicts,
      );

      const processingTime = performance.now() - startTime;

      // Performance validation - must be under 5 seconds for 200+ guests
      if (params.guests.length >= 200 && processingTime > 5000) {
        console.warn(
          `Optimization exceeded time limit: ${processingTime}ms for ${params.guests.length} guests`,
        );
      }

      return {
        arrangement,
        score: Math.round(score * 100) / 100,
        conflicts,
        recommendations,
        processingTime: Math.round(processingTime),
        metadata: {
          algorithm_version: '1.0',
          guest_count: params.guests.length,
          table_count: params.tableConfigurations.length,
          optimization_iterations: iterations,
        },
      };
    } catch (error) {
      const processingTime = performance.now() - startTime;
      console.error('Optimization failed:', error);
      throw new Error(
        `Optimization failed after ${processingTime}ms: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private calculateArrangementScore(
    arrangement: SeatingArrangement,
    graph: RelationshipGraph,
    preferences: OptimizationPreferences,
  ): number {
    let totalScore = 0;
    let totalPairs = 0;

    // Evaluate each table
    Object.values(arrangement).forEach((table) => {
      const guests = table.guests;

      // Calculate relationship scores within table
      for (let i = 0; i < guests.length; i++) {
        for (let j = i + 1; j < guests.length; j++) {
          const relationshipStrength = graph.getRelationshipStrength(
            guests[i],
            guests[j],
          );
          totalScore += relationshipStrength;
          totalPairs++;
        }
      }

      // Penalize over/under capacity
      const utilization = guests.length / table.capacity;
      if (utilization > 1.0) {
        totalScore -= (utilization - 1.0) * 20; // Heavy penalty for overcapacity
      } else if (utilization < 0.5) {
        totalScore -= (0.5 - utilization) * 5; // Light penalty for underutilization
      }
    });

    // Normalize score
    return totalPairs > 0 ? totalScore / totalPairs : 0;
  }

  private detectConflicts(
    arrangement: SeatingArrangement,
    graph: RelationshipGraph,
    tableConfigurations: TableConfiguration[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    Object.entries(arrangement).forEach(([tableNum, table]) => {
      const tableNumber = parseInt(tableNum);
      const tableConfig = tableConfigurations.find(
        (t) => t.table_number === tableNumber,
      );

      // Check capacity violations
      if (tableConfig && table.guests.length > tableConfig.capacity) {
        conflicts.push({
          type: 'capacity',
          severity: 'high',
          guests_involved: table.guests,
          table_numbers: [tableNumber],
          description: `Table ${tableNumber} exceeds capacity (${table.guests.length}/${tableConfig.capacity})`,
          suggested_resolution:
            'Move guests to other tables or increase table capacity',
        });
      }

      // Check relationship conflicts
      for (let i = 0; i < table.guests.length; i++) {
        for (let j = i + 1; j < table.guests.length; j++) {
          const guest1Id = table.guests[i];
          const guest2Id = table.guests[j];
          const relationshipStrength = graph.getRelationshipStrength(
            guest1Id,
            guest2Id,
          );

          if (relationshipStrength < -5) {
            const guest1 = graph.getGuestData(guest1Id);
            const guest2 = graph.getGuestData(guest2Id);

            conflicts.push({
              type: 'relationship',
              severity: relationshipStrength < -8 ? 'high' : 'medium',
              guests_involved: [guest1Id, guest2Id],
              table_numbers: [tableNumber],
              description: `${guest1?.first_name} ${guest1?.last_name} and ${guest2?.first_name} ${guest2?.last_name} have a negative relationship`,
              suggested_resolution:
                'Consider seating these guests at different tables',
            });
          }
        }
      }

      // Check age appropriateness (children should be with adults)
      const children = table.guests.filter((gId) => {
        const guest = graph.getGuestData(gId);
        return guest?.age_group === 'child';
      });

      const adults = table.guests.filter((gId) => {
        const guest = graph.getGuestData(gId);
        return guest?.age_group === 'adult';
      });

      if (children.length > 0 && adults.length === 0) {
        conflicts.push({
          type: 'age',
          severity: 'medium',
          guests_involved: children,
          table_numbers: [tableNumber],
          description: `Table ${tableNumber} has children without adult supervision`,
          suggested_resolution:
            'Ensure at least one adult is seated at tables with children',
        });
      }
    });

    return conflicts;
  }

  private generateRecommendations(
    arrangement: SeatingArrangement,
    graph: RelationshipGraph,
    conflicts: ConflictDetail[],
  ): string[] {
    const recommendations: string[] = [];

    // High-level recommendations based on conflicts
    const highSeverityConflicts = conflicts.filter(
      (c) => c.severity === 'high',
    );
    if (highSeverityConflicts.length > 0) {
      recommendations.push(
        `Address ${highSeverityConflicts.length} high-priority conflicts before finalizing seating`,
      );
    }

    // Utilization recommendations
    const underutilizedTables = Object.entries(arrangement).filter(
      ([_, table]) => table.guests.length / table.capacity < 0.5,
    );

    if (underutilizedTables.length > 0) {
      recommendations.push(
        `Consider consolidating ${underutilizedTables.length} underutilized tables to improve intimacy`,
      );
    }

    // Relationship optimization suggestions
    const totalTables = Object.keys(arrangement).length;
    const averageScore = this.calculateArrangementScore(arrangement, graph, {
      prioritize_families: true,
      separate_conflicting_guests: true,
      balance_age_groups: true,
      consider_dietary_needs: true,
    });

    if (averageScore < 3) {
      recommendations.push(
        'Consider running advanced optimization to improve guest satisfaction',
      );
    }

    return recommendations;
  }
}

// Constraint Satisfaction Optimization Algorithm
class ConstraintSatisfactionOptimizer {
  constructor(
    private graph: RelationshipGraph,
    private tables: TableConfiguration[],
    private preferences: OptimizationPreferences,
  ) {}

  async greedyOptimization(): Promise<SeatingArrangement> {
    const arrangement: SeatingArrangement = {};
    const guests = this.graph.getAllGuests();
    const unassigned = new Set(guests.map((g) => g.id));

    // Initialize tables
    this.tables.forEach((table) => {
      arrangement[table.table_number] = {
        guests: [],
        capacity: table.capacity,
        utilization: 0,
      };
    });

    // Greedy assignment - prioritize high-value relationships
    while (unassigned.size > 0) {
      const guestId = this.selectNextGuest(unassigned, arrangement);
      const bestTable = this.findBestTable(guestId, arrangement);

      if (bestTable !== -1) {
        arrangement[bestTable].guests.push(guestId);
        arrangement[bestTable].utilization =
          arrangement[bestTable].guests.length /
          arrangement[bestTable].capacity;
        unassigned.delete(guestId);
      } else {
        // Fallback: assign to least full table
        const leastFullTable = this.findLeastFullTable(arrangement);
        arrangement[leastFullTable].guests.push(guestId);
        arrangement[leastFullTable].utilization =
          arrangement[leastFullTable].guests.length /
          arrangement[leastFullTable].capacity;
        unassigned.delete(guestId);
      }
    }

    return arrangement;
  }

  async simulatedAnnealingOptimization(): Promise<SeatingArrangement> {
    // Start with greedy solution
    let currentArrangement = await this.greedyOptimization();
    let currentScore = this.calculateScore(currentArrangement);

    const maxIterations = 100;
    let temperature = 100;
    const coolingRate = 0.95;

    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const newArrangement = this.generateNeighborSolution(currentArrangement);
      const newScore = this.calculateScore(newArrangement);

      const delta = newScore - currentScore;

      if (delta > 0 || Math.random() < Math.exp(delta / temperature)) {
        currentArrangement = newArrangement;
        currentScore = newScore;
      }

      temperature *= coolingRate;
    }

    return currentArrangement;
  }

  async hybridOptimization(): Promise<SeatingArrangement> {
    // Combine multiple approaches for best results
    const greedySolution = await this.greedyOptimization();
    const annealingSolution = await this.simulatedAnnealingOptimization();

    const greedyScore = this.calculateScore(greedySolution);
    const annealingScore = this.calculateScore(annealingSolution);

    // Return the better solution
    return greedyScore > annealingScore ? greedySolution : annealingSolution;
  }

  private selectNextGuest(
    unassigned: Set<string>,
    arrangement: SeatingArrangement,
  ): string {
    // Prioritize guests with family members already assigned
    for (const guestId of unassigned) {
      const guest = this.graph.getGuestData(guestId);
      if (guest?.household_id) {
        // Check if household members are already seated
        for (const tableNumber of Object.keys(arrangement).map(Number)) {
          const tableGuests = arrangement[tableNumber].guests;
          for (const seatedGuestId of tableGuests) {
            const seatedGuest = this.graph.getGuestData(seatedGuestId);
            if (seatedGuest?.household_id === guest.household_id) {
              return guestId;
            }
          }
        }
      }
    }

    // Fallback: return first unassigned guest
    return unassigned.values().next().value;
  }

  private findBestTable(
    guestId: string,
    arrangement: SeatingArrangement,
  ): number {
    let bestTable = -1;
    let bestScore = -Infinity;

    for (const tableNumber of Object.keys(arrangement).map(Number)) {
      const table = arrangement[tableNumber];

      // Skip if table is full
      if (table.guests.length >= table.capacity) continue;

      // Calculate score for placing guest at this table
      let tableScore = 0;

      for (const seatedGuestId of table.guests) {
        const relationshipStrength = this.graph.getRelationshipStrength(
          guestId,
          seatedGuestId,
        );
        tableScore += relationshipStrength;
      }

      if (tableScore > bestScore) {
        bestScore = tableScore;
        bestTable = tableNumber;
      }
    }

    return bestTable;
  }

  private findLeastFullTable(arrangement: SeatingArrangement): number {
    let leastFullTable = -1;
    let minUtilization = Infinity;

    for (const tableNumber of Object.keys(arrangement).map(Number)) {
      const table = arrangement[tableNumber];
      if (
        table.utilization < minUtilization &&
        table.guests.length < table.capacity
      ) {
        minUtilization = table.utilization;
        leastFullTable = tableNumber;
      }
    }

    return leastFullTable;
  }

  private generateNeighborSolution(
    arrangement: SeatingArrangement,
  ): SeatingArrangement {
    // Create a copy
    const newArrangement = JSON.parse(JSON.stringify(arrangement));

    // Randomly swap two guests between tables
    const tableNumbers = Object.keys(newArrangement).map(Number);
    const table1Num =
      tableNumbers[Math.floor(Math.random() * tableNumbers.length)];
    const table2Num =
      tableNumbers[Math.floor(Math.random() * tableNumbers.length)];

    if (
      table1Num !== table2Num &&
      newArrangement[table1Num].guests.length > 0 &&
      newArrangement[table2Num].guests.length > 0
    ) {
      const guest1Idx = Math.floor(
        Math.random() * newArrangement[table1Num].guests.length,
      );
      const guest2Idx = Math.floor(
        Math.random() * newArrangement[table2Num].guests.length,
      );

      // Swap guests
      const temp = newArrangement[table1Num].guests[guest1Idx];
      newArrangement[table1Num].guests[guest1Idx] =
        newArrangement[table2Num].guests[guest2Idx];
      newArrangement[table2Num].guests[guest2Idx] = temp;

      // Update utilization
      newArrangement[table1Num].utilization =
        newArrangement[table1Num].guests.length /
        newArrangement[table1Num].capacity;
      newArrangement[table2Num].utilization =
        newArrangement[table2Num].guests.length /
        newArrangement[table2Num].capacity;
    }

    return newArrangement;
  }

  private calculateScore(arrangement: SeatingArrangement): number {
    let totalScore = 0;
    let totalPairs = 0;

    Object.values(arrangement).forEach((table) => {
      for (let i = 0; i < table.guests.length; i++) {
        for (let j = i + 1; j < table.guests.length; j++) {
          const relationshipStrength = this.graph.getRelationshipStrength(
            table.guests[i],
            table.guests[j],
          );
          totalScore += relationshipStrength;
          totalPairs++;
        }
      }

      // Penalty for over/under capacity
      const utilization = table.guests.length / table.capacity;
      if (utilization > 1.0) {
        totalScore -= (utilization - 1.0) * 20;
      } else if (utilization < 0.5) {
        totalScore -= (0.5 - utilization) * 5;
      }
    });

    return totalPairs > 0 ? totalScore / totalPairs : 0;
  }
}

// Conflict Detection Engine
export class ConflictDetector {
  async validate(params: {
    guests: Guest[];
    relationships: GuestRelationship[];
    tableAssignments: Array<{
      guest_id: string;
      table_number: number;
      seat_number?: number;
    }>;
    tableConfigurations: TableConfiguration[];
    checkOptions: {
      checkRelationships: boolean;
      checkCapacity: boolean;
      checkDietaryNeeds: boolean;
      checkAgeAppropriateness: boolean;
    };
  }): Promise<{
    isValid: boolean;
    conflicts: ConflictDetail[];
    warnings: ConflictDetail[];
    suggestions: string[];
    conflictTypes: string[];
    severityBreakdown: { high: number; medium: number; low: number };
  }> {
    const conflicts: ConflictDetail[] = [];
    const warnings: ConflictDetail[] = [];

    // Build arrangement from assignments
    const arrangement: SeatingArrangement = {};
    const guestMap = new Map(params.guests.map((g) => [g.id, g]));

    params.tableAssignments.forEach((assignment) => {
      if (!arrangement[assignment.table_number]) {
        const tableConfig = params.tableConfigurations.find(
          (t) => t.table_number === assignment.table_number,
        );
        arrangement[assignment.table_number] = {
          guests: [],
          capacity: tableConfig?.capacity || 8,
          utilization: 0,
        };
      }
      arrangement[assignment.table_number].guests.push(assignment.guest_id);
    });

    // Update utilization
    Object.values(arrangement).forEach((table) => {
      table.utilization = table.guests.length / table.capacity;
    });

    const graph = new RelationshipGraph(params.guests, params.relationships);

    // Run validations based on check options
    if (params.checkOptions.checkCapacity) {
      conflicts.push(
        ...this.checkCapacityViolations(
          arrangement,
          params.tableConfigurations,
        ),
      );
    }

    if (params.checkOptions.checkRelationships) {
      conflicts.push(...this.checkRelationshipConflicts(arrangement, graph));
    }

    if (params.checkOptions.checkAgeAppropriateness) {
      conflicts.push(...this.checkAgeAppropriateness(arrangement, graph));
    }

    if (params.checkOptions.checkDietaryNeeds) {
      warnings.push(...this.checkDietaryConsiderations(arrangement, graph));
    }

    // Generate suggestions
    const suggestions = this.generateValidationSuggestions(
      conflicts,
      warnings,
      arrangement,
    );

    // Calculate metrics
    const conflictTypes = Array.from(new Set(conflicts.map((c) => c.type)));
    const severityBreakdown = {
      high: conflicts.filter((c) => c.severity === 'high').length,
      medium: conflicts.filter((c) => c.severity === 'medium').length,
      low: conflicts.filter((c) => c.severity === 'low').length,
    };

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings,
      suggestions,
      conflictTypes,
      severityBreakdown,
    };
  }

  private checkCapacityViolations(
    arrangement: SeatingArrangement,
    tableConfigurations: TableConfiguration[],
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    Object.entries(arrangement).forEach(([tableNumStr, table]) => {
      const tableNumber = parseInt(tableNumStr);
      const config = tableConfigurations.find(
        (t) => t.table_number === tableNumber,
      );

      if (!config) return;

      if (table.guests.length > config.capacity) {
        conflicts.push({
          type: 'capacity',
          severity: 'high',
          guests_involved: table.guests,
          table_numbers: [tableNumber],
          description: `Table ${tableNumber} exceeds capacity (${table.guests.length}/${config.capacity})`,
          suggested_resolution: `Remove ${table.guests.length - config.capacity} guests from this table`,
        });
      }
    });

    return conflicts;
  }

  private checkRelationshipConflicts(
    arrangement: SeatingArrangement,
    graph: RelationshipGraph,
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    Object.entries(arrangement).forEach(([tableNumStr, table]) => {
      const tableNumber = parseInt(tableNumStr);

      for (let i = 0; i < table.guests.length; i++) {
        for (let j = i + 1; j < table.guests.length; j++) {
          const guest1Id = table.guests[i];
          const guest2Id = table.guests[j];
          const relationshipStrength = graph.getRelationshipStrength(
            guest1Id,
            guest2Id,
          );

          if (relationshipStrength < -5) {
            const guest1 = graph.getGuestData(guest1Id);
            const guest2 = graph.getGuestData(guest2Id);

            conflicts.push({
              type: 'relationship',
              severity: relationshipStrength < -8 ? 'high' : 'medium',
              guests_involved: [guest1Id, guest2Id],
              table_numbers: [tableNumber],
              description: `${guest1?.first_name} ${guest1?.last_name} and ${guest2?.first_name} ${guest2?.last_name} should not be seated together`,
              suggested_resolution:
                'Move one of these guests to a different table',
            });
          }
        }
      }
    });

    return conflicts;
  }

  private checkAgeAppropriateness(
    arrangement: SeatingArrangement,
    graph: RelationshipGraph,
  ): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    Object.entries(arrangement).forEach(([tableNumStr, table]) => {
      const tableNumber = parseInt(tableNumStr);

      const children = table.guests.filter((gId) => {
        const guest = graph.getGuestData(gId);
        return guest?.age_group === 'child';
      });

      const adults = table.guests.filter((gId) => {
        const guest = graph.getGuestData(gId);
        return guest?.age_group === 'adult';
      });

      if (children.length > 0 && adults.length === 0) {
        conflicts.push({
          type: 'age',
          severity: 'medium',
          guests_involved: children,
          table_numbers: [tableNumber],
          description: `Table ${tableNumber} has children without adult supervision`,
          suggested_resolution:
            'Add at least one adult to this table or move children to a table with adults',
        });
      }

      // Check infant ratios
      const infants = table.guests.filter((gId) => {
        const guest = graph.getGuestData(gId);
        return guest?.age_group === 'infant';
      });

      if (infants.length > adults.length) {
        conflicts.push({
          type: 'age',
          severity: 'high',
          guests_involved: infants,
          table_numbers: [tableNumber],
          description: `Table ${tableNumber} has more infants than adults for supervision`,
          suggested_resolution:
            'Ensure adequate adult-to-infant ratio for proper care',
        });
      }
    });

    return conflicts;
  }

  private checkDietaryConsiderations(
    arrangement: SeatingArrangement,
    graph: RelationshipGraph,
  ): ConflictDetail[] {
    const warnings: ConflictDetail[] = [];

    Object.entries(arrangement).forEach(([tableNumStr, table]) => {
      const tableNumber = parseInt(tableNumStr);

      // Group by dietary restrictions
      const dietaryGroups = new Map<string, string[]>();

      table.guests.forEach((guestId) => {
        const guest = graph.getGuestData(guestId);
        if (guest?.dietary_restrictions) {
          const restrictions = guest.dietary_restrictions.toLowerCase();
          if (!dietaryGroups.has(restrictions)) {
            dietaryGroups.set(restrictions, []);
          }
          dietaryGroups.get(restrictions)!.push(guestId);
        }
      });

      // Check for potential cross-contamination concerns
      const allergicGuests = table.guests.filter((gId) => {
        const guest = graph.getGuestData(gId);
        return guest?.dietary_restrictions?.toLowerCase().includes('allerg');
      });

      if (
        allergicGuests.length > 0 &&
        table.guests.length > allergicGuests.length
      ) {
        warnings.push({
          type: 'dietary',
          severity: 'low',
          guests_involved: allergicGuests,
          table_numbers: [tableNumber],
          description: `Table ${tableNumber} has guests with allergies seated with others`,
          suggested_resolution:
            'Consider informing catering staff about allergy considerations for this table',
        });
      }
    });

    return warnings;
  }

  private generateValidationSuggestions(
    conflicts: ConflictDetail[],
    warnings: ConflictDetail[],
    arrangement: SeatingArrangement,
  ): string[] {
    const suggestions: string[] = [];

    const highPriorityConflicts = conflicts.filter(
      (c) => c.severity === 'high',
    );
    if (highPriorityConflicts.length > 0) {
      suggestions.push(
        `Resolve ${highPriorityConflicts.length} high-priority conflicts before proceeding`,
      );
    }

    const capacityIssues = conflicts.filter((c) => c.type === 'capacity');
    if (capacityIssues.length > 0) {
      suggestions.push(
        'Review table capacities and redistribute guests to resolve overcrowding',
      );
    }

    const relationshipIssues = conflicts.filter(
      (c) => c.type === 'relationship',
    );
    if (relationshipIssues.length > 0) {
      suggestions.push(
        `Consider alternative seating for ${relationshipIssues.length} relationship conflicts`,
      );
    }

    if (warnings.length > 0) {
      suggestions.push(
        'Review dietary and special needs considerations for optimal guest experience',
      );
    }

    return suggestions;
  }
}

// Export singleton instances
export const seatingOptimizationEngine = new SeatingOptimizationEngine();
export const conflictDetector = new ConflictDetector();
