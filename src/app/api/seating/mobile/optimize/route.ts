/**
 * WS-154 Round 2: Lightweight Mobile Seating Optimization API
 * Team B - Optimized for Team D Mobile Performance
 * Minimal payload, fast response, offline-capable seating optimization
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  verifyCoupleAccess,
  withSecureValidation,
} from '@/lib/validation/middleware';
import { seatingCacheManager } from '@/lib/cache/seating-redis-cache';
import { performanceMonitor } from '@/lib/monitoring/performance-monitor';

// Mobile-optimized validation schema (minimal required fields)
const mobileSeatingSchema = z.object({
  couple_id: z.string().uuid(),
  guest_count: z.number().min(1).max(500), // Mobile limit
  table_configurations: z.array(
    z.object({
      id: z.number(),
      capacity: z.number().min(2).max(12), // Mobile typical sizes
      shape: z.enum(['round', 'square']).default('round'), // Simplified shapes
    }),
  ),
  preferences: z
    .object({
      families_together: z.boolean().default(true),
      avoid_conflicts: z.boolean().default(true),
    })
    .optional(),

  // Mobile-specific options
  quality_level: z.enum(['fast', 'balanced', 'thorough']).default('fast'),
  offline_mode: z.boolean().default(false),
  max_time_ms: z.number().min(500).max(5000).default(2000), // Mobile timeout
  minimal_response: z.boolean().default(true),
  cache_for_offline: z.boolean().default(true),

  // Device info for optimization
  device_info: z
    .object({
      type: z.enum(['phone', 'tablet']).default('phone'),
      connection: z.enum(['wifi', '4g', '3g', 'slow']).default('4g'),
      memory_limit_mb: z.number().min(128).max(2048).default(512),
    })
    .optional(),
});

// Mobile-optimized response interface
interface MobileOptimizationResponse {
  success: boolean;
  arrangement_id: string;
  score: number;

  // Minimal arrangement data
  tables: Array<{
    id: number;
    guests: string[]; // Just guest IDs
    utilization: number;
  }>;

  // Compressed conflict info
  conflicts: {
    high: number;
    medium: number;
    low: number;
    details?: Array<{
      type: string;
      tables: number[];
      severity: 'high' | 'medium' | 'low';
    }>;
  };

  // Essential metadata
  processing_ms: number;
  cached: boolean;
  quality_level: string;

  // Mobile-specific optimizations
  mobile_data: {
    response_size_bytes: number;
    cache_keys: string[];
    offline_support: boolean;
    next_sync_recommended_ms?: number;
    touch_optimized: boolean;
  };

  // Minimal recommendations (top 3 only)
  recommendations: string[];
}

// POST /api/seating/mobile/optimize - Mobile-optimized seating optimization
export const POST = withSecureValidation(
  mobileSeatingSchema,
  async (
    request: NextRequest,
    validatedData: z.infer<typeof mobileSeatingSchema>,
  ) => {
    const startTime = performance.now();
    const isMobile = true;

    try {
      const supabase = await createClient();

      // Verify couple ownership
      await verifyCoupleAccess(request, validatedData.couple_id);

      // Mobile performance tracking
      const mobilePerf = performanceMonitor.startOperation(
        'mobile_seating_optimization',
        {
          guest_count: validatedData.guest_count,
          device_type: validatedData.device_info?.type || 'phone',
          connection: validatedData.device_info?.connection || '4g',
          quality_level: validatedData.quality_level,
        },
      );

      // Aggressive caching for mobile
      let cachedResult = null;
      if (validatedData.cache_for_offline) {
        const cacheKey = generateMobileCacheKey(validatedData);
        cachedResult = await seatingCacheManager.getCachedArrangement(
          cacheKey,
          validatedData.couple_id,
        );

        if (cachedResult) {
          console.log('Using cached mobile optimization result');

          const mobileResponse: MobileOptimizationResponse = {
            success: true,
            arrangement_id: cachedResult.arrangement_id,
            score: cachedResult.metadata.optimization_score,
            tables: convertArrangementToMobile(cachedResult.arrangement),
            conflicts: compressConflictData([]), // Would use cached conflicts
            processing_ms: Math.round(performance.now() - startTime),
            cached: true,
            quality_level: validatedData.quality_level,
            mobile_data: {
              response_size_bytes: 0, // Will be calculated
              cache_keys: [cacheKey],
              offline_support: true,
              touch_optimized: true,
            },
            recommendations:
              (cachedResult as any).recommendations?.slice(0, 3) || [],
          };

          // Calculate response size
          const responseString = JSON.stringify(mobileResponse);
          mobileResponse.mobile_data.response_size_bytes = new Blob([
            responseString,
          ]).size;

          mobilePerf.end({ success: true, cached: true });
          return NextResponse.json(mobileResponse);
        }
      }

      // Mobile-optimized guest query (essential fields only)
      const { data: guests, error: guestsError } = await supabase
        .from('guests')
        .select(
          'id, first_name, last_name, category, side, age_group, household_id',
        )
        .eq('couple_id', validatedData.couple_id)
        .eq('rsvp_status', 'attending')
        .limit(validatedData.guest_count); // Enforce mobile limit

      if (guestsError || !guests) {
        return NextResponse.json(
          {
            error: 'Failed to fetch guest data',
            mobile_optimized: true,
          },
          { status: 500 },
        );
      }

      // Mobile-optimized relationships query (critical relationships only)
      const { data: relationships } = await supabase
        .from('guest_relationships')
        .select('guest1_id, guest2_id, relationship_strength')
        .eq('couple_id', validatedData.couple_id)
        .or('relationship_strength.gte.5,relationship_strength.lte.-5') // Only strong relationships
        .limit(100); // Mobile limit

      // Fast mobile optimization
      let optimizationResult;
      const timeLimit = Math.min(validatedData.max_time_ms, 2000); // Enforce mobile time limit

      switch (validatedData.quality_level) {
        case 'fast':
          optimizationResult = await fastMobileOptimization({
            guests,
            relationships: relationships || [],
            tables: validatedData.table_configurations,
            preferences: validatedData.preferences || {},
            timeLimit,
          });
          break;

        case 'balanced':
          optimizationResult = await balancedMobileOptimization({
            guests,
            relationships: relationships || [],
            tables: validatedData.table_configurations,
            preferences: validatedData.preferences || {},
            timeLimit,
          });
          break;

        case 'thorough':
          // Still time-limited for mobile
          optimizationResult = await thoroughMobileOptimization({
            guests,
            relationships: relationships || [],
            tables: validatedData.table_configurations,
            preferences: validatedData.preferences || {},
            timeLimit: Math.min(timeLimit, 5000),
          });
          break;

        default:
          optimizationResult = await fastMobileOptimization({
            guests,
            relationships: relationships || [],
            tables: validatedData.table_configurations,
            preferences: validatedData.preferences || {},
            timeLimit,
          });
      }

      // Save minimal arrangement data for mobile
      const { data: savedArrangement } = await supabase
        .from('seating_arrangements')
        .insert({
          couple_id: validatedData.couple_id,
          arrangement_name: `Mobile ${validatedData.quality_level} ${new Date().toISOString().split('T')[0]}`,
          arrangement_data: optimizationResult.arrangement,
          optimization_score: optimizationResult.score,
          metadata: {
            mobile_optimized: true,
            quality_level: validatedData.quality_level,
            device_type: validatedData.device_info?.type || 'unknown',
            processing_time_ms: optimizationResult.processingTime,
            version: 'mobile-1.0',
          },
        })
        .select('id')
        .single();

      // Cache for offline use
      const cacheKeys: string[] = [];
      if (validatedData.cache_for_offline && optimizationResult.score > 5.0) {
        const cacheKey = generateMobileCacheKey(validatedData);
        await seatingCacheManager.cacheArrangement({
          arrangement_id: savedArrangement?.id || 'temp',
          couple_id: validatedData.couple_id,
          arrangement: optimizationResult.arrangement,
          guests,
          tables: validatedData.table_configurations.map((t) => ({
            table_number: t.id,
            capacity: t.capacity,
            table_shape: t.shape as any,
            location_notes: '',
            special_requirements: '',
          })),
          preferences: validatedData.preferences || {},
          optimization_score: optimizationResult.score,
          processing_time_ms: optimizationResult.processingTime,
        });
        cacheKeys.push(cacheKey);
      }

      const totalTime = performance.now() - startTime;

      // Build mobile response
      const mobileResponse: MobileOptimizationResponse = {
        success: true,
        arrangement_id: savedArrangement?.id || 'temp',
        score: optimizationResult.score,
        tables: convertArrangementToMobile(optimizationResult.arrangement),
        conflicts: compressConflictData(optimizationResult.conflicts || []),
        processing_ms: Math.round(totalTime),
        cached: false,
        quality_level: validatedData.quality_level,
        mobile_data: {
          response_size_bytes: 0, // Will be calculated below
          cache_keys: cacheKeys,
          offline_support: validatedData.cache_for_offline,
          next_sync_recommended_ms: validatedData.offline_mode
            ? undefined
            : 300000, // 5 minutes
          touch_optimized: true,
        },
        recommendations: (optimizationResult.recommendations || []).slice(0, 3),
      };

      // Calculate and optimize response size
      const responseString = JSON.stringify(mobileResponse);
      mobileResponse.mobile_data.response_size_bytes = new Blob([
        responseString,
      ]).size;

      // Optimize for slow connections
      if (
        validatedData.device_info?.connection === 'slow' ||
        validatedData.device_info?.connection === '3g'
      ) {
        mobileResponse.conflicts.details = undefined; // Remove detailed conflicts
        mobileResponse.recommendations = mobileResponse.recommendations.slice(
          0,
          2,
        ); // Fewer recommendations
      }

      mobilePerf.end({
        success: true,
        cached: false,
        response_size: mobileResponse.mobile_data.response_size_bytes,
      });

      // Performance warning for mobile
      if (totalTime > validatedData.max_time_ms) {
        console.warn(
          `Mobile optimization exceeded time limit: ${totalTime}ms > ${validatedData.max_time_ms}ms`,
        );
      }

      return NextResponse.json(mobileResponse, {
        headers: {
          'Cache-Control': validatedData.cache_for_offline
            ? 'public, max-age=300'
            : 'no-cache',
          'Content-Encoding': 'gzip', // Suggest compression
          'X-Mobile-Optimized': 'true',
          'X-Response-Size':
            mobileResponse.mobile_data.response_size_bytes.toString(),
        },
      });
    } catch (error) {
      const totalTime = performance.now() - startTime;
      console.error('Mobile seating optimization error:', error);

      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : 'Optimization failed',
          mobile_optimized: true,
          processing_ms: Math.round(totalTime),
          success: false,
        },
        { status: 500 },
      );
    }
  },
);

// Mobile optimization algorithms (simplified and fast)

async function fastMobileOptimization(params: {
  guests: any[];
  relationships: any[];
  tables: any[];
  preferences: any;
  timeLimit: number;
}): Promise<any> {
  const startTime = performance.now();

  // Ultra-fast greedy algorithm
  const arrangement: any = {};
  const unassigned = new Set(params.guests.map((g) => g.id));

  // Initialize tables
  params.tables.forEach((table) => {
    arrangement[table.id] = {
      guests: [],
      capacity: table.capacity,
      utilization: 0,
    };
  });

  // Quick assignment prioritizing families
  const householdGroups = new Map();
  params.guests.forEach((guest) => {
    if (guest.household_id) {
      if (!householdGroups.has(guest.household_id)) {
        householdGroups.set(guest.household_id, []);
      }
      householdGroups.get(guest.household_id).push(guest.id);
    }
  });

  // Assign households together
  for (const [_, householdMembers] of householdGroups) {
    const availableTable = findBestAvailableTable(
      arrangement,
      householdMembers.length,
    );
    if (availableTable !== -1) {
      arrangement[availableTable].guests.push(...householdMembers);
      arrangement[availableTable].utilization =
        arrangement[availableTable].guests.length /
        arrangement[availableTable].capacity;
      householdMembers.forEach((guestId: string) => unassigned.delete(guestId));
    }
  }

  // Assign remaining guests quickly
  for (const guestId of unassigned) {
    const availableTable = findBestAvailableTable(arrangement, 1);
    if (availableTable !== -1) {
      arrangement[availableTable].guests.push(guestId);
      arrangement[availableTable].utilization =
        arrangement[availableTable].guests.length /
        arrangement[availableTable].capacity;
      unassigned.delete(guestId);
    }
  }

  const processingTime = performance.now() - startTime;
  const score = calculateQuickScore(arrangement, params.relationships);

  return {
    arrangement,
    score,
    conflicts: [],
    recommendations:
      score < 6 ? ['Consider manual adjustments for better results'] : [],
    processingTime,
  };
}

async function balancedMobileOptimization(params: any): Promise<any> {
  // Balanced approach - slightly more sophisticated
  const fastResult = await fastMobileOptimization(params);

  // Quick improvement pass
  const improved = improveArrangement(
    fastResult.arrangement,
    params.relationships,
    3,
  ); // 3 iterations max

  return {
    ...fastResult,
    arrangement: improved.arrangement,
    score: improved.score,
    recommendations:
      improved.score > 7
        ? ['Good arrangement found']
        : ['Consider using thorough optimization for better results'],
  };
}

async function thoroughMobileOptimization(params: any): Promise<any> {
  // Most sophisticated mobile version (still time-limited)
  const balancedResult = await balancedMobileOptimization(params);

  // More improvement iterations within time limit
  const startTime = performance.now();
  let currentResult = balancedResult;
  let iterations = 0;

  while (
    performance.now() - startTime < params.timeLimit - 500 &&
    iterations < 10
  ) {
    const improved = improveArrangement(
      currentResult.arrangement,
      params.relationships,
      1,
    );
    if (improved.score > currentResult.score) {
      currentResult = { ...currentResult, ...improved };
    }
    iterations++;
  }

  return {
    ...currentResult,
    recommendations:
      currentResult.score > 8
        ? ['Excellent arrangement achieved']
        : ['Good arrangement found within time limit'],
  };
}

// Utility functions

function generateMobileCacheKey(data: any): string {
  return `mobile_${data.couple_id}_${data.guest_count}_${data.table_configurations.length}_${data.quality_level}`;
}

function convertArrangementToMobile(
  arrangement: any,
): Array<{ id: number; guests: string[]; utilization: number }> {
  return Object.entries(arrangement).map(([tableId, table]: [string, any]) => ({
    id: parseInt(tableId),
    guests: table.guests || [],
    utilization: Math.round((table.utilization || 0) * 100) / 100,
  }));
}

function compressConflictData(conflicts: any[]): {
  high: number;
  medium: number;
  low: number;
  details?: any[];
} {
  const summary = { high: 0, medium: 0, low: 0 };

  conflicts.forEach((conflict) => {
    summary[conflict.severity as keyof typeof summary]++;
  });

  // Include details only if there are significant conflicts
  const totalConflicts = summary.high + summary.medium + summary.low;
  const details =
    totalConflicts > 0 && totalConflicts <= 5
      ? conflicts.map((c) => ({
          type: c.type,
          tables: c.table_numbers || [],
          severity: c.severity,
        }))
      : undefined;

  return { ...summary, details };
}

function findBestAvailableTable(
  arrangement: any,
  guestsNeeded: number,
): number {
  let bestTable = -1;
  let bestScore = -1;

  for (const [tableId, table] of Object.entries(arrangement) as [
    string,
    any,
  ][]) {
    if (table.guests.length + guestsNeeded <= table.capacity) {
      const utilizationScore =
        (table.guests.length + guestsNeeded) / table.capacity;
      if (utilizationScore > bestScore && utilizationScore <= 1.0) {
        bestScore = utilizationScore;
        bestTable = parseInt(tableId);
      }
    }
  }

  return bestTable;
}

function calculateQuickScore(arrangement: any, relationships: any[]): number {
  let score = 5.0; // Base score
  let totalUtilization = 0;
  let tableCount = 0;

  // Calculate utilization score
  for (const table of Object.values(arrangement) as any[]) {
    totalUtilization += table.utilization;
    tableCount++;

    // Bonus for good utilization
    if (table.utilization >= 0.6 && table.utilization <= 0.9) {
      score += 0.5;
    }
  }

  const avgUtilization = totalUtilization / tableCount;
  score += avgUtilization * 2;

  // Simple relationship bonus
  const relationshipMap = new Map();
  relationships.forEach((rel) => {
    relationshipMap.set(
      `${rel.guest1_id}-${rel.guest2_id}`,
      rel.relationship_strength,
    );
    relationshipMap.set(
      `${rel.guest2_id}-${rel.guest1_id}`,
      rel.relationship_strength,
    );
  });

  let relationshipScore = 0;
  let relationshipCount = 0;

  for (const table of Object.values(arrangement) as any[]) {
    for (let i = 0; i < table.guests.length; i++) {
      for (let j = i + 1; j < table.guests.length; j++) {
        const relKey = `${table.guests[i]}-${table.guests[j]}`;
        const relStrength = relationshipMap.get(relKey) || 0;
        relationshipScore += relStrength > 0 ? relStrength * 0.1 : 0;
        relationshipCount++;
      }
    }
  }

  if (relationshipCount > 0) {
    score += relationshipScore / relationshipCount;
  }

  return Math.max(1, Math.min(10, score));
}

function improveArrangement(
  arrangement: any,
  relationships: any[],
  maxIterations: number,
): { arrangement: any; score: number } {
  let currentArrangement = JSON.parse(JSON.stringify(arrangement));
  let currentScore = calculateQuickScore(currentArrangement, relationships);

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    // Try random swaps
    const tables = Object.keys(currentArrangement).map(Number);
    if (tables.length < 2) break;

    const table1 = tables[Math.floor(Math.random() * tables.length)];
    const table2 = tables[Math.floor(Math.random() * tables.length)];

    if (
      table1 !== table2 &&
      currentArrangement[table1].guests.length > 0 &&
      currentArrangement[table2].guests.length > 0
    ) {
      // Try swapping one guest
      const guest1Idx = Math.floor(
        Math.random() * currentArrangement[table1].guests.length,
      );
      const guest2Idx = Math.floor(
        Math.random() * currentArrangement[table2].guests.length,
      );

      // Make the swap
      const testArrangement = JSON.parse(JSON.stringify(currentArrangement));
      const temp = testArrangement[table1].guests[guest1Idx];
      testArrangement[table1].guests[guest1Idx] =
        testArrangement[table2].guests[guest2Idx];
      testArrangement[table2].guests[guest2Idx] = temp;

      // Update utilizations
      testArrangement[table1].utilization =
        testArrangement[table1].guests.length /
        testArrangement[table1].capacity;
      testArrangement[table2].utilization =
        testArrangement[table2].guests.length /
        testArrangement[table2].capacity;

      const testScore = calculateQuickScore(testArrangement, relationships);

      if (testScore > currentScore) {
        currentArrangement = testArrangement;
        currentScore = testScore;
      }
    }
  }

  return { arrangement: currentArrangement, score: currentScore };
}

// Configure for mobile optimization
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10; // Mobile APIs should be fast
