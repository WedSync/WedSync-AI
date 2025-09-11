import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { headers } from 'next/headers';

// Simple in-memory rate limiting (in production, use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 downloads per hour
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(identifier);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verify user authentication
    const { data: user } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check rate limit
    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const rateLimitKey = `export_${user.id}_${clientIp}`;

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { error: 'Too many export requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '3600',
            'X-RateLimit-Limit': RATE_LIMIT.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(
              Date.now() + RATE_LIMIT_WINDOW,
            ).toISOString(),
          },
        },
      );
    }

    // Verify export belongs to user and is valid
    const { data: exportData, error: exportError } = await supabase
      .from('data_exports')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (exportError || !exportData) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    // Check if export has expired
    if (new Date(exportData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Export has expired' },
        { status: 410 },
      );
    }

    // Check if export is ready
    if (exportData.status !== 'ready') {
      return NextResponse.json(
        { error: 'Export is still being generated' },
        { status: 202 },
      );
    }

    // Collect all user data
    const userData = await collectUserData(supabase, user.id);

    // Format based on requested format
    const format = exportData.metadata?.format || 'json';
    let content: string;
    let contentType: string;
    let filename: string;

    if (format === 'csv') {
      content = await formatAsCSV(userData);
      contentType = 'text/csv';
      filename = `wedsync-data-export-${new Date().toISOString().split('T')[0]}.csv`;
    } else {
      content = JSON.stringify(userData, null, 2);
      contentType = 'application/json';
      filename = `wedsync-data-export-${new Date().toISOString().split('T')[0]}.json`;
    }

    // Log the export download
    await supabase.from('audit_trail').insert({
      user_id: user.id,
      event_type: 'data_export_downloaded',
      event_data: {
        export_id: id,
        format: format,
        file_size: Buffer.byteLength(content),
      },
      ip_address:
        request.headers.get('x-forwarded-for') ||
        request.headers.get('x-real-ip'),
      user_agent: request.headers.get('user-agent'),
    });

    // Return the file
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Export download error:', error);
    return NextResponse.json(
      { error: 'Failed to download export' },
      { status: 500 },
    );
  }
}

async function collectUserData(supabase: any, userId: string) {
  const userData: any = {
    export_metadata: {
      exported_at: new Date().toISOString(),
      user_id: userId,
      gdpr_compliant: true,
      data_categories: [],
    },
    personal_data: {},
    wedding_data: {},
    guest_list: [],
    vendor_interactions: [],
    communications: [],
    documents: [],
    analytics: {},
    consent_history: [],
  };

  // Collect user profile
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (profile) {
    userData.personal_data = {
      ...profile,
      password: '[REDACTED]',
      sensitive_fields: '[REDACTED]',
    };
    userData.export_metadata.data_categories.push('personal_data');
  }

  // Collect organization/wedding data
  const { data: orgs } = await supabase
    .from('organizations')
    .select('*')
    .eq('owner_id', userId);

  if (orgs && orgs.length > 0) {
    userData.wedding_data = orgs;
    userData.export_metadata.data_categories.push('wedding_data');
  }

  // Collect clients
  const { data: clients } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId);

  if (clients) {
    userData.guest_list = clients.map((client: any) => ({
      ...client,
      sensitive_data: '[REDACTED IF APPLICABLE]',
    }));
    userData.export_metadata.data_categories.push('guest_list');
  }

  // Collect vendor relationships
  const { data: vendors } = await supabase
    .from('vendor_client_relationships')
    .select(
      `
      *,
      vendors (*)
    `,
    )
    .eq('client_id', userId);

  if (vendors) {
    userData.vendor_interactions = vendors;
    userData.export_metadata.data_categories.push('vendor_interactions');
  }

  // Collect communications (anonymized)
  const { data: comms } = await supabase
    .from('communications')
    .select('id, type, sent_at, status, template_id')
    .eq('user_id', userId)
    .limit(100);

  if (comms) {
    userData.communications = comms;
    userData.export_metadata.data_categories.push('communications');
  }

  // Collect consent history
  const { data: consents } = await supabase
    .from('consent_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (consents) {
    userData.consent_history = consents;
    userData.export_metadata.data_categories.push('consent_history');
  }

  // Add data integrity hash
  const dataString = JSON.stringify(userData);
  userData.export_metadata.integrity_hash = createHash('sha256')
    .update(dataString)
    .digest('hex');

  return userData;
}

async function formatAsCSV(data: any): Promise<string> {
  const csv: string[] = [];

  // Personal Data Section
  csv.push('PERSONAL DATA');
  csv.push('Field,Value');
  if (data.personal_data) {
    Object.entries(data.personal_data).forEach(([key, value]) => {
      if (typeof value !== 'object') {
        csv.push(`"${key}","${value}"`);
      }
    });
  }
  csv.push('');

  // Wedding Data Section
  csv.push('WEDDING DATA');
  csv.push('Field,Value');
  if (data.wedding_data && Array.isArray(data.wedding_data)) {
    data.wedding_data.forEach((wedding: any) => {
      Object.entries(wedding).forEach(([key, value]) => {
        if (typeof value !== 'object') {
          csv.push(`"${key}","${value}"`);
        }
      });
    });
  }
  csv.push('');

  // Guest List Section
  if (data.guest_list && data.guest_list.length > 0) {
    csv.push('GUEST LIST');
    const guestHeaders = Object.keys(data.guest_list[0]).filter(
      (key) => typeof data.guest_list[0][key] !== 'object',
    );
    csv.push(guestHeaders.map((h) => `"${h}"`).join(','));

    data.guest_list.forEach((guest: any) => {
      const row = guestHeaders.map((header) => `"${guest[header] || ''}"`);
      csv.push(row.join(','));
    });
    csv.push('');
  }

  // Vendor Interactions Section
  if (data.vendor_interactions && data.vendor_interactions.length > 0) {
    csv.push('VENDOR INTERACTIONS');
    csv.push('Vendor Name,Relationship Status,Created At');
    data.vendor_interactions.forEach((vendor: any) => {
      csv.push(
        `"${vendor.vendors?.name || 'Unknown'}","${vendor.status}","${vendor.created_at}"`,
      );
    });
    csv.push('');
  }

  // Consent History
  if (data.consent_history && data.consent_history.length > 0) {
    csv.push('CONSENT HISTORY');
    csv.push('Consent Type,Granted,Date,Legal Basis');
    data.consent_history.forEach((consent: any) => {
      csv.push(
        `"${consent.consent_type}","${consent.is_granted}","${consent.created_at}","${consent.legal_basis}"`,
      );
    });
  }

  return csv.join('\n');
}
