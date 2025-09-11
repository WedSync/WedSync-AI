import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { WeddingDaySafetyService } from '@/lib/services/wedding-safety/WeddingDaySafetyService';
import { rateLimit } from '@/lib/utils/rate-limit';

const safetyStatusLimiter = rateLimit({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: 'Too many wedding safety status requests',
});

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    const rateLimitResult = await safetyStatusLimiter(request);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 },
      );
    }

    const headersList = await headers();
    const organizationId = headersList.get('x-organization-id');

    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization context required' },
        { status: 401 },
      );
    }

    const safetyService = new WeddingDaySafetyService();

    // Get comprehensive wedding day status
    const weddingDayStatus =
      await safetyService.isWeddingDayProtectionActive(organizationId);

    // Get emergency contacts
    const emergencyContacts =
      await safetyService.getEmergencyContacts(organizationId);

    // Get current date/time info for context
    const now = new Date();
    const dayOfWeek = now.getDay();
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];

    const response = {
      wedding_day_status: weddingDayStatus,
      current_time: {
        timestamp: now.toISOString(),
        day_of_week: dayNames[dayOfWeek],
        is_saturday: dayOfWeek === 6,
        hour: now.getHours(),
        minute: now.getMinutes(),
      },
      emergency_contacts: {
        total_contacts: emergencyContacts.length,
        available_contacts: emergencyContacts.filter(
          (ec) => ec.availability_status === 'available',
        ).length,
        primary_contact: emergencyContacts.find((ec) => ec.is_primary),
        contacts: emergencyContacts.map((ec) => ({
          id: ec.id,
          name: ec.name,
          role: ec.role,
          availability_status: ec.availability_status,
          response_time_minutes: ec.response_time_minutes,
          is_primary: ec.is_primary,
        })),
      },
      protection_windows: {
        friday_cutoff: '18:00 (6 PM)',
        saturday_readonly: 'All day',
        sunday_resume: '10:00 (10 AM)',
        current_window: getCurrentProtectionWindow(now),
      },
      system_health: {
        score: weddingDayStatus.system_health_score,
        status: getHealthStatus(weddingDayStatus.system_health_score),
        last_check: weddingDayStatus.last_health_check.toISOString(),
        next_maintenance:
          weddingDayStatus.next_maintenance_window?.toISOString() || null,
      },
      recommendations: generateSafetyRecommendations(
        weddingDayStatus,
        emergencyContacts,
        now,
      ),
      emergency_procedures: {
        override_available:
          weddingDayStatus.emergency_override_active ||
          emergencyContacts.length > 0,
        rollback_available: true,
        enhanced_monitoring: weddingDayStatus.emergency_override_active,
        escalation_path: generateEscalationPath(emergencyContacts),
      },
    };

    return NextResponse.json(response, {
      headers: {
        'X-Wedding-Day': weddingDayStatus.is_wedding_day.toString(),
        'X-Read-Only': weddingDayStatus.read_only_active.toString(),
        'X-Emergency-Override':
          weddingDayStatus.emergency_override_active.toString(),
        'X-Health-Score': weddingDayStatus.system_health_score.toString(),
      },
    });
  } catch (error) {
    console.error('Wedding safety status check failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to get wedding safety status',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// Helper functions
function getCurrentProtectionWindow(now: Date): string {
  const dayOfWeek = now.getDay();
  const hour = now.getHours();

  if (dayOfWeek === 5 && hour >= 18) {
    return 'Friday evening protection active - deployment restrictions in effect';
  } else if (dayOfWeek === 6) {
    return 'Saturday wedding day protection - full read-only mode active';
  } else if (dayOfWeek === 0 && hour < 10) {
    return 'Sunday morning protection - restrictions continue until 10 AM';
  } else {
    return 'Normal operations - no wedding day restrictions';
  }
}

function getHealthStatus(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 80) return 'Good';
  if (score >= 70) return 'Fair';
  if (score >= 60) return 'Poor';
  return 'Critical';
}

function generateSafetyRecommendations(
  status: any,
  contacts: any[],
  now: Date,
): string[] {
  const recommendations: string[] = [];

  if (status.is_wedding_day && status.read_only_active) {
    recommendations.push(
      '🛡️ Wedding day protection is active - avoid non-critical changes',
    );
  }

  if (status.active_weddings_count > 0) {
    recommendations.push(
      `📸 ${status.active_weddings_count} active wedding(s) today - extra caution required`,
    );
  }

  if (status.system_health_score < 90) {
    recommendations.push('⚠️ System health below optimal - monitor closely');
  }

  if (
    contacts.filter((c) => c.availability_status === 'available').length === 0
  ) {
    recommendations.push(
      '🚨 No emergency contacts available - ensure backup coverage',
    );
  }

  if (status.is_wedding_season && !status.is_wedding_day) {
    recommendations.push(
      '🌸 Wedding season active - prepare for higher activity levels',
    );
  }

  if (recommendations.length === 0) {
    recommendations.push('✅ All wedding safety systems operating normally');
  }

  return recommendations;
}

function generateEscalationPath(contacts: any[]): string[] {
  const path: string[] = [];

  const primaryContact = contacts.find((c) => c.is_primary);
  if (primaryContact) {
    path.push(
      `1. Primary Contact: ${primaryContact.name} (${primaryContact.role})`,
    );
  }

  const availableContacts = contacts.filter(
    (c) => !c.is_primary && c.availability_status === 'available',
  );
  availableContacts.forEach((contact, index) => {
    path.push(`${index + 2}. ${contact.name} (${contact.role})`);
  });

  if (path.length === 0) {
    path.push('No emergency contacts configured');
  }

  return path;
}
