import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    // Verify admin authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 },
      );
    }

    // Fetch security metrics
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    // Get failed login attempts (last 24h)
    const { data: failedLogins } = await supabase
      .from('auth_audit_logs')
      .select('id')
      .eq('event_type', 'failed_login')
      .gte('created_at', last24h.toISOString());
    // Get suspicious activities (last hour)
    const { data: suspiciousActivities } = await supabase
      .from('security_incidents')
      .select('id')
      .in('type', ['unusual_activity', 'potential_breach', 'anomaly_detected'])
      .gte('created_at', lastHour.toISOString())
      .eq('resolved', false);
    // Get active threats
    const { data: activeThreats } = await supabase
      .from('security_incidents')
      .select('id, severity')
      .eq('active', true)
      .eq('resolved', false);
    // Calculate risk level
    const failedLoginCount = failedLogins?.length || 0;
    const suspiciousActivityCount = suspiciousActivities?.length || 0;
    const activeThreatsCount = activeThreats?.length || 0;
    const criticalThreats =
      activeThreats?.filter((t) => t.severity === 'critical').length || 0;
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalThreats > 0) {
      riskLevel = 'critical';
    } else if (failedLoginCount > 100 || activeThreatsCount > 5) {
      riskLevel = 'high';
    } else if (failedLoginCount > 20 || suspiciousActivityCount > 10) {
      riskLevel = 'medium';
    }

    // Check if today is Saturday (wedding day)
    const isWeddingDay = now.getDay() === 6;
    const metrics = {
      failedLoginAttempts: failedLoginCount,
      suspiciousActivity: suspiciousActivityCount,
      activeThreats: activeThreatsCount,
      lastSecurityScan: now.toISOString(),
      riskLevel,
      weddingDayProtection: isWeddingDay,
      systemHealth: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        responseTime: Date.now() % 1000, // Simulated response time
      },
    };
    // Log the metrics request
    await supabase.from('audit_logs').insert({
      user_id: session.user.id,
      action: 'security_metrics_accessed',
      table_name: 'security_metrics',
      details: { riskLevel, activeThreatsCount },
    });
    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Security metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch security metrics' },
      { status: 500 },
    );
  }
}
