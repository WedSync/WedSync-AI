import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function backupSecurityMiddleware(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has admin/backup permissions
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, permissions')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 403 },
      );
    }

    // Only allow super_admin or users with backup permissions
    if (
      profile.role !== 'super_admin' &&
      !profile.permissions?.includes('backup:manage')
    ) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions for backup operations',
        },
        { status: 403 },
      );
    }

    // Rate limiting check for backup operations
    const userBackupKey = `backup:${user.id}`;
    const backupCount = await checkBackupRateLimit(userBackupKey);

    if (backupCount > 5) {
      // Max 5 backup operations per hour
      return NextResponse.json(
        {
          error: 'Backup rate limit exceeded. Please try again later.',
        },
        { status: 429 },
      );
    }

    return null; // Allow request to proceed
  } catch (error) {
    console.error('Backup security middleware error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 },
    );
  }
}

async function checkBackupRateLimit(key: string): Promise<number> {
  // In production, this would use Redis or similar
  // For now, we'll use a simple in-memory store
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;

  // This is a simplified implementation
  // In production, you'd use Redis with expiring keys
  return 0; // Placeholder - always allow for now
}
