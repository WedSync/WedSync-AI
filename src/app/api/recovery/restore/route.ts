import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { DisasterRecoveryEngine } from '@/lib/services/backup/DisasterRecoveryEngine';
import { BackupValidationService } from '@/lib/services/backup/BackupValidationService';
import { EmergencyRecoveryService } from '@/lib/services/backup/EmergencyRecoveryService';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large restore operations

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      backupId,
      organizationId,
      restoreType,
      targetTables,
      isEmergencyRestore,
      confirmationToken,
    } = body;

    // Validate required fields
    if (!backupId || !organizationId) {
      return NextResponse.json(
        { error: 'Backup ID and organization ID are required' },
        { status: 400 },
      );
    }

    // Initialize services
    const recoveryEngine = new DisasterRecoveryEngine(supabase);
    const validationService = new BackupValidationService(supabase);
    const emergencyService = new EmergencyRecoveryService(supabase);

    // Validate backup integrity before restore
    const validationResult = await validationService.validateBackup(backupId);
    if (!validationResult.isValid) {
      return NextResponse.json(
        {
          error: 'Backup validation failed',
          issues: validationResult.issues,
        },
        { status: 400 },
      );
    }

    // Handle emergency restore with elevated priority
    if (isEmergencyRestore) {
      if (!confirmationToken) {
        return NextResponse.json(
          { error: 'Emergency restore requires confirmation token' },
          { status: 400 },
        );
      }

      const emergencyResult = await emergencyService.executeEmergencyRestore({
        backupId,
        organizationId,
        userId: user.id,
        confirmationToken,
        targetTables: targetTables || [],
      });

      return NextResponse.json({
        success: true,
        restoreId: emergencyResult.restoreId,
        status: 'EMERGENCY_RESTORE_INITIATED',
        priority: 'CRITICAL',
        estimatedCompletion: emergencyResult.estimatedCompletion,
        message: 'Emergency restore initiated with highest priority',
      });
    }

    // Standard restore process
    const restoreConfig = {
      backupId,
      organizationId,
      restoreType: restoreType || 'FULL',
      targetTables: targetTables || [],
      userId: user.id,
      initiatedAt: new Date(),
    };

    const restoreResult = await recoveryEngine.initiateRestore(restoreConfig);

    return NextResponse.json({
      success: true,
      restoreId: restoreResult.restoreId,
      status: restoreResult.status,
      estimatedCompletion: restoreResult.estimatedCompletion,
      affectedTables: restoreResult.affectedTables,
      message: 'Data restore initiated successfully',
    });
  } catch (error) {
    console.error('Data restore error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate data restore' },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const restoreId = searchParams.get('restoreId');
    const organizationId = searchParams.get('organizationId');

    if (restoreId) {
      // Get specific restore status
      const recoveryEngine = new DisasterRecoveryEngine(supabase);
      const restoreStatus = await recoveryEngine.getRestoreStatus(restoreId);

      return NextResponse.json({
        success: true,
        restore: restoreStatus,
      });
    }

    if (organizationId) {
      // Get organization restore history
      const recoveryEngine = new DisasterRecoveryEngine(supabase);
      const restoreHistory =
        await recoveryEngine.getRestoreHistory(organizationId);

      return NextResponse.json({
        success: true,
        restores: restoreHistory,
      });
    }

    return NextResponse.json(
      { error: 'Restore ID or Organization ID is required' },
      { status: 400 },
    );
  } catch (error) {
    console.error('Get restore status error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve restore status' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          },
        },
      },
    );

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const restoreId = searchParams.get('restoreId');

    if (!restoreId) {
      return NextResponse.json(
        { error: 'Restore ID is required' },
        { status: 400 },
      );
    }

    const recoveryEngine = new DisasterRecoveryEngine(supabase);
    await recoveryEngine.cancelRestore(restoreId);

    return NextResponse.json({
      success: true,
      message: 'Restore operation cancelled successfully',
    });
  } catch (error) {
    console.error('Cancel restore error:', error);
    return NextResponse.json(
      { error: 'Failed to cancel restore operation' },
      { status: 500 },
    );
  }
}
