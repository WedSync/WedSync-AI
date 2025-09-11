/**
 * GDPR Data Breach Notification Assessment API
 * GET /api/gdpr/breach/assess-notification/[id]
 * WS-149: Assesses notification requirements for a data breach
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = createClient();
    const breachId = params.id;

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to view breach information
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['admin', 'dpo', 'privacy_officer', 'security_admin'];
    if (!profile || !allowedRoles.includes(profile.role)) {
      return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
    }

    // Get breach details
    const { data: breach, error: breachError } = await supabase
      .from('gdpr.data_breaches')
      .select('*')
      .eq('breach_id', breachId)
      .single();

    if (breachError || !breach) {
      return NextResponse.json({ error: 'Breach not found' }, { status: 404 });
    }

    // Assess notification requirements
    const highRisk =
      breach.severity_level === 'high' ||
      breach.severity_level === 'critical' ||
      breach.data_subjects_affected > 100 ||
      breach.data_categories_affected.includes('financial_data') ||
      breach.data_categories_affected.includes('health_data') ||
      breach.data_categories_affected.includes('sensitive_personal_data');

    const supervisoryAuthorityRequired =
      breach.breach_type !== 'availability' || highRisk;

    const dataSubjectNotificationRequired =
      highRisk && ['confidentiality', 'combined'].includes(breach.breach_type);

    // Calculate time remaining for notification
    const discoveredAt = new Date(breach.discovered_at);
    const deadlineTime = new Date(discoveredAt.getTime() + 72 * 60 * 60 * 1000); // 72 hours
    const now = new Date();
    const hoursRemaining = Math.max(
      0,
      (deadlineTime.getTime() - now.getTime()) / (1000 * 60 * 60),
    );

    const assessment = {
      breach_id: breach.breach_id,
      high_risk: highRisk,
      supervisory_authority_required: supervisoryAuthorityRequired,
      data_subject_notification_required: dataSubjectNotificationRequired,
      deadline_hours: 72,
      hours_remaining: Math.floor(hoursRemaining),
      deadline_timestamp: deadlineTime.toISOString(),
      assessment_timestamp: now.toISOString(),
      severity_level: breach.severity_level,
      data_subjects_affected: breach.data_subjects_affected,
      notification_status: {
        supervisory_authority_notified:
          !!breach.supervisory_authority_notified_at,
        data_subjects_notified: !!breach.data_subject_notifications_sent_at,
        dpo_notified: !!breach.dpo_notified_at,
        legal_team_notified: !!breach.legal_team_notified_at,
      },
    };

    return NextResponse.json(assessment);
  } catch (error) {
    console.error('Error assessing breach notification:', error);
    return NextResponse.json(
      { error: 'Failed to assess breach notification requirements' },
      { status: 500 },
    );
  }
}
