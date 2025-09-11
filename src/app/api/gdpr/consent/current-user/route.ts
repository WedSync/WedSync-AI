/**
 * GDPR Current User Consent Status API
 * GET /api/gdpr/consent/current-user
 * WS-149: Retrieves the current consent status for the authenticated user
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all consent records for the user
    const { data: consentRecords, error } = await supabase
      .from('gdpr.consent_records')
      .select('*')
      .eq('data_subject_id', user.id)
      .is('withdrawn_at', null)
      .order('consent_given_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Process consent records into a simplified format
    const consentStatus: Record<string, any> = {
      essential: true, // Always true as it's required for service
      analytics: false,
      marketing: false,
      personalization: false,
    };

    // Update status based on records
    consentRecords?.forEach((record) => {
      if (record.purpose in consentStatus) {
        consentStatus[record.purpose] = record.consent_given;
      }
    });

    // Get the latest consent method and evidence
    const latestRecord = consentRecords?.[0];

    const response = {
      ...consentStatus,
      consent_method: latestRecord?.consent_method || null,
      last_modified: latestRecord?.updated_at || null,
      evidence: latestRecord
        ? {
            timestamp: latestRecord.consent_given_at,
            ip_address: latestRecord.consent_evidence?.ip_address,
            user_agent: latestRecord.consent_evidence?.user_agent,
          }
        : null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching consent status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consent status' },
      { status: 500 },
    );
  }
}
