/**
 * WS-189 Touch Preferences API - Team B Backend
 * User preference management with cross-device synchronization
 * AI-powered touch optimization recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

// Touch Preferences Schema
const TouchPreferencesSchema = z.object({
  user_id: z.string(),
  device_id: z.string(),
  preferences: z.object({
    touch_target_size: z.enum(['small', 'medium', 'large', 'extra-large']),
    haptic_feedback: z.boolean(),
    visual_feedback: z.boolean(),
    response_sensitivity: z.enum(['low', 'medium', 'high']),
    gesture_shortcuts: z.boolean(),
    accessibility_mode: z.boolean(),
    gesture_confirmations: z.boolean(),
  }),
  workflow_preferences: z.object({
    emergency_gestures: z.boolean(),
    photo_confirmation_style: z.enum([
      'single-tap',
      'double-tap',
      'long-press',
    ]),
    navigation_swipes: z.boolean(),
    quick_actions: z.array(z.string()).max(5),
  }),
  device_specific: z
    .object({
      screen_size: z.enum(['small', 'medium', 'large']),
      orientation_lock: z.boolean(),
      force_touch_support: z.boolean(),
      vibration_intensity: z.number().min(0).max(1),
    })
    .optional(),
});

// Preference Sync Schema
const PreferenceSyncSchema = z.object({
  user_id: z.string(),
  source_device_id: z.string(),
  target_devices: z.array(z.string()),
  sync_scope: z.enum(['all', 'workflow-only', 'accessibility-only']),
  conflict_resolution: z.enum(['source-wins', 'merge', 'user-prompt']),
});

// Helper function to hash user identifiers
function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex');
}

/**
 * POST /api/touch/preferences
 * Save user touch preferences with device-specific optimization
 */
export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    const data = await request.json();

    // Validate input data
    const validatedData = TouchPreferencesSchema.parse(data);

    const supabase = createClient();
    const hashedUserId = hashUserId(validatedData.user_id);

    // Check if preferences already exist
    const { data: existingPrefs } = await supabase
      .from('user_touch_preferences')
      .select('id, preferences, workflow_preferences')
      .eq('hashed_user_id', hashedUserId)
      .eq('device_id', validatedData.device_id)
      .single();

    // Merge with existing preferences if they exist
    let mergedPreferences = validatedData.preferences;
    let mergedWorkflowPreferences = validatedData.workflow_preferences;

    if (existingPrefs) {
      mergedPreferences = {
        ...existingPrefs.preferences,
        ...validatedData.preferences,
      };
      mergedWorkflowPreferences = {
        ...existingPrefs.workflow_preferences,
        ...validatedData.workflow_preferences,
      };
    }

    // Upsert preferences
    const { data: result, error } = await supabase
      .from('user_touch_preferences')
      .upsert(
        {
          hashed_user_id: hashedUserId,
          device_id: validatedData.device_id,
          preferences: mergedPreferences,
          workflow_preferences: mergedWorkflowPreferences,
          device_specific: validatedData.device_specific,
          last_updated: new Date().toISOString(),
          version: existingPrefs ? (existingPrefs.version || 0) + 1 : 1,
        },
        {
          onConflict: 'hashed_user_id,device_id',
        },
      )
      .select();

    if (error) {
      console.error('Preference save error:', error);
      return NextResponse.json(
        { error: 'Failed to save preferences', details: error.message },
        { status: 500 },
      );
    }

    // Trigger cross-device sync if user has multiple devices
    await triggerCrossDeviceSync(
      supabase,
      hashedUserId,
      validatedData.device_id,
    );

    // Generate AI-powered recommendations based on new preferences
    const recommendations = await generateOptimizationRecommendations(
      supabase,
      hashedUserId,
      mergedPreferences,
      mergedWorkflowPreferences,
    );

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      preferences: result?.[0],
      recommendations,
      cross_device_sync_initiated: true,
      processing_time: processingTime,
    });
  } catch (error) {
    console.error('Touch preferences API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', validation_errors: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/touch/preferences/[userId]
 * Retrieve personalized touch settings with preference inheritance
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();
    const deviceId = url.searchParams.get('deviceId');

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const supabase = createClient();
    const hashedUserId = hashUserId(userId);

    let query = supabase
      .from('user_touch_preferences')
      .select('*')
      .eq('hashed_user_id', hashedUserId);

    if (deviceId) {
      query = query.eq('device_id', deviceId);
    }

    const { data: preferences, error } = await query.order('last_updated', {
      ascending: false,
    });

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 },
      );
    }

    // If no device-specific preferences, return inherited defaults
    if (!preferences || preferences.length === 0) {
      const defaultPreferences = getDefaultPreferences();
      return NextResponse.json({
        success: true,
        preferences: defaultPreferences,
        inheritance_source: 'default',
        device_count: 0,
      });
    }

    // Apply preference inheritance logic
    const inheritedPreferences = applyPreferenceInheritance(
      preferences,
      deviceId,
    );

    return NextResponse.json({
      success: true,
      preferences: inheritedPreferences,
      inheritance_source: deviceId ? 'device-specific' : 'merged',
      device_count: preferences.length,
      last_sync: preferences[0]?.last_updated,
    });
  } catch (error) {
    console.error('Preferences fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve preferences' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/touch/preferences/sync
 * Cross-device preference synchronization with conflict resolution
 */
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json();
    const validatedData = PreferenceSyncSchema.parse(data);

    const supabase = createClient();
    const hashedUserId = hashUserId(validatedData.user_id);

    // Get source device preferences
    const { data: sourcePrefs, error: sourceError } = await supabase
      .from('user_touch_preferences')
      .select('*')
      .eq('hashed_user_id', hashedUserId)
      .eq('device_id', validatedData.source_device_id)
      .single();

    if (sourceError || !sourcePrefs) {
      return NextResponse.json(
        { error: 'Source device preferences not found' },
        { status: 404 },
      );
    }

    // Get target devices' current preferences
    const { data: targetPrefs, error: targetError } = await supabase
      .from('user_touch_preferences')
      .select('*')
      .eq('hashed_user_id', hashedUserId)
      .in('device_id', validatedData.target_devices);

    if (targetError) {
      return NextResponse.json(
        { error: 'Failed to fetch target device preferences' },
        { status: 500 },
      );
    }

    // Apply conflict resolution strategy
    const syncResults = [];
    for (const deviceId of validatedData.target_devices) {
      const existingPrefs = targetPrefs?.find((p) => p.device_id === deviceId);
      const resolvedPrefs = resolvePreferenceConflicts(
        sourcePrefs,
        existingPrefs,
        validatedData.conflict_resolution,
        validatedData.sync_scope,
      );

      // Update target device preferences
      const { data: syncResult, error: syncError } = await supabase
        .from('user_touch_preferences')
        .upsert(
          {
            hashed_user_id: hashedUserId,
            device_id: deviceId,
            preferences: resolvedPrefs.preferences,
            workflow_preferences: resolvedPrefs.workflow_preferences,
            device_specific: existingPrefs?.device_specific || null,
            last_updated: new Date().toISOString(),
            sync_source: validatedData.source_device_id,
            version: (existingPrefs?.version || 0) + 1,
          },
          {
            onConflict: 'hashed_user_id,device_id',
          },
        )
        .select();

      syncResults.push({
        device_id: deviceId,
        success: !syncError,
        error: syncError?.message,
        preferences: syncResult?.[0],
      });
    }

    // Log sync operation for audit
    await supabase.from('preference_sync_log').insert({
      hashed_user_id: hashedUserId,
      source_device: validatedData.source_device_id,
      target_devices: validatedData.target_devices,
      sync_scope: validatedData.sync_scope,
      conflict_resolution: validatedData.conflict_resolution,
      sync_timestamp: new Date().toISOString(),
      results: syncResults,
    });

    const successCount = syncResults.filter((r) => r.success).length;

    return NextResponse.json({
      success: true,
      sync_results: syncResults,
      successful_syncs: successCount,
      total_targets: validatedData.target_devices.length,
      sync_timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Preference sync error:', error);
    return NextResponse.json(
      { error: 'Failed to sync preferences' },
      { status: 500 },
    );
  }
}

// Helper Functions

async function triggerCrossDeviceSync(
  supabase: any,
  hashedUserId: string,
  sourceDeviceId: string,
) {
  try {
    // Get all user devices
    const { data: devices } = await supabase
      .from('user_touch_preferences')
      .select('device_id')
      .eq('hashed_user_id', hashedUserId)
      .neq('device_id', sourceDeviceId);

    if (devices && devices.length > 0) {
      // Queue background sync job
      await supabase.from('sync_queue').insert({
        hashed_user_id: hashedUserId,
        source_device: sourceDeviceId,
        target_devices: devices.map((d) => d.device_id),
        sync_type: 'preference_update',
        status: 'pending',
        created_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to trigger cross-device sync:', error);
  }
}

async function generateOptimizationRecommendations(
  supabase: any,
  hashedUserId: string,
  preferences: any,
  workflowPreferences: any,
) {
  try {
    // Get user's recent performance data
    const { data: performance } = await supabase
      .from('touch_analytics')
      .select('gesture_type, response_time, success, workflow_context')
      .eq('hashed_user_id', hashedUserId)
      .gte(
        'timestamp',
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      )
      .limit(100);

    if (!performance || performance.length === 0) {
      return [];
    }

    const recommendations = [];

    // Analyze response times
    const avgResponseTime =
      performance.reduce((sum, p) => sum + p.response_time, 0) /
      performance.length;
    if (avgResponseTime > 100) {
      recommendations.push({
        type: 'performance_optimization',
        title: 'Increase Touch Target Size',
        description:
          'Your average response time is above optimal. Larger touch targets may help.',
        current_setting: preferences.touch_target_size,
        recommended_setting: 'large',
        confidence: 0.85,
        expected_improvement: '15-25% faster response times',
      });
    }

    // Analyze gesture success rates
    const successRate =
      performance.filter((p) => p.success).length / performance.length;
    if (successRate < 0.9 && !preferences.haptic_feedback) {
      recommendations.push({
        type: 'feedback_enhancement',
        title: 'Enable Haptic Feedback',
        description:
          'Low success rate detected. Haptic feedback can improve touch accuracy.',
        current_setting: false,
        recommended_setting: true,
        confidence: 0.78,
        expected_improvement: '10-15% higher success rate',
      });
    }

    // Analyze workflow-specific patterns
    const emergencyGestures = performance.filter(
      (p) => p.workflow_context?.urgency_level === 'emergency',
    );

    if (
      emergencyGestures.length > 0 &&
      !workflowPreferences.emergency_gestures
    ) {
      recommendations.push({
        type: 'workflow_optimization',
        title: 'Enable Emergency Gestures',
        description:
          'You frequently use emergency workflows. Quick gestures can save time.',
        current_setting: false,
        recommended_setting: true,
        confidence: 0.92,
        expected_improvement: 'Faster emergency response',
      });
    }

    return recommendations;
  } catch (error) {
    console.error('Failed to generate optimization recommendations:', error);
    return [];
  }
}

function getDefaultPreferences() {
  return {
    hashed_user_id: null,
    device_id: 'default',
    preferences: {
      touch_target_size: 'medium',
      haptic_feedback: true,
      visual_feedback: true,
      response_sensitivity: 'medium',
      gesture_shortcuts: false,
      accessibility_mode: false,
      gesture_confirmations: true,
    },
    workflow_preferences: {
      emergency_gestures: true,
      photo_confirmation_style: 'double-tap',
      navigation_swipes: true,
      quick_actions: [],
    },
    device_specific: null,
    last_updated: new Date().toISOString(),
    version: 1,
  };
}

function applyPreferenceInheritance(preferences: any[], deviceId?: string) {
  if (!preferences || preferences.length === 0) {
    return getDefaultPreferences();
  }

  // If specific device requested, return its preferences
  if (deviceId) {
    const devicePrefs = preferences.find((p) => p.device_id === deviceId);
    if (devicePrefs) {
      return devicePrefs;
    }
  }

  // Otherwise, merge preferences with priority to most recent
  const sortedPrefs = [...preferences].sort(
    (a, b) =>
      new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime(),
  );

  const merged = {
    ...sortedPrefs[0],
    preferences: {},
    workflow_preferences: {},
  };

  // Merge preferences (most recent wins for conflicts)
  for (const pref of sortedPrefs.reverse()) {
    merged.preferences = { ...merged.preferences, ...pref.preferences };
    merged.workflow_preferences = {
      ...merged.workflow_preferences,
      ...pref.workflow_preferences,
    };
  }

  return merged;
}

function resolvePreferenceConflicts(
  sourcePrefs: any,
  targetPrefs: any,
  conflictResolution: string,
  syncScope: string,
) {
  let resolvedPrefs = { ...sourcePrefs };

  // Apply sync scope filtering
  if (syncScope === 'workflow-only') {
    resolvedPrefs.preferences =
      targetPrefs?.preferences || sourcePrefs.preferences;
  } else if (syncScope === 'accessibility-only') {
    resolvedPrefs = {
      ...resolvedPrefs,
      preferences: {
        ...(targetPrefs?.preferences || {}),
        accessibility_mode: sourcePrefs.preferences.accessibility_mode,
        touch_target_size: sourcePrefs.preferences.touch_target_size,
        haptic_feedback: sourcePrefs.preferences.haptic_feedback,
      },
    };
  }

  // Apply conflict resolution strategy
  if (targetPrefs && conflictResolution === 'merge') {
    resolvedPrefs.preferences = {
      ...targetPrefs.preferences,
      ...sourcePrefs.preferences,
    };
    resolvedPrefs.workflow_preferences = {
      ...targetPrefs.workflow_preferences,
      ...sourcePrefs.workflow_preferences,
    };
  }

  return resolvedPrefs;
}
