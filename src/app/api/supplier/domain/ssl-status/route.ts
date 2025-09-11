import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// Validation schema
const sslStatusSchema = z.object({
  supplier_id: z.string().uuid(),
});

// POST /api/supplier/domain/ssl-status - Check SSL certificate status
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const body = await request.json();

    const { supplier_id } = sslStatusSchema.parse(body);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    // Get supplier's domain configuration
    const { data: domainData, error: domainError } = await supabase
      .from('supplier_domains')
      .select(
        `
        *,
        ssl_certificates (*)
      `,
      )
      .eq('supplier_id', supplier_id)
      .eq('is_active', true)
      .single();

    if (domainError || !domainData) {
      return NextResponse.json(
        { success: false, error: 'No domain configuration found' },
        { status: 404 },
      );
    }

    const domain = domainData.domain_name;

    // Perform SSL certificate check
    const sslStatus = await checkSSLCertificate(domain);

    // Update SSL certificate record if exists
    if (domainData.ssl_certificates && domainData.ssl_certificates.length > 0) {
      const certId = domainData.ssl_certificates[0].id;

      await supabase
        .from('ssl_certificates')
        .update({
          status: sslStatus.status,
          expires_at: sslStatus.expires_at,
          certificate_fingerprint: sslStatus.fingerprint,
          updated_at: new Date().toISOString(),
        })
        .eq('id', certId);
    } else if (sslStatus.status === 'active') {
      // Create new SSL certificate record
      await supabase.from('ssl_certificates').insert({
        domain_id: domainData.id,
        certificate_authority: sslStatus.issuer || 'Unknown',
        certificate_type: 'domain_validated',
        status: sslStatus.status,
        expires_at: sslStatus.expires_at,
        certificate_fingerprint: sslStatus.fingerprint,
        auto_renew: true,
        renewal_threshold_days: 30,
        renewal_attempts: 0,
      });
    }

    // Update domain last checked timestamp
    await supabase
      .from('supplier_domains')
      .update({
        last_checked_at: new Date().toISOString(),
      })
      .eq('id', domainData.id);

    return NextResponse.json({
      success: true,
      data: {
        domain,
        ssl_status: sslStatus.status,
        expires_at: sslStatus.expires_at,
        issuer: sslStatus.issuer,
        valid: sslStatus.valid,
        days_until_expiry: sslStatus.days_until_expiry,
        error: sslStatus.error,
      },
    });
  } catch (error) {
    console.error('SSL status check error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { success: false, error: 'SSL status check failed' },
      { status: 500 },
    );
  }
}

interface SSLCheckResult {
  status:
    | 'pending'
    | 'provisioning'
    | 'issued'
    | 'active'
    | 'expiring'
    | 'expired'
    | 'revoked'
    | 'failed';
  valid: boolean;
  expires_at?: string;
  issued_at?: string;
  issuer?: string;
  fingerprint?: string;
  days_until_expiry?: number;
  error?: string;
}

// Helper function to check SSL certificate
async function checkSSLCertificate(domain: string): Promise<SSLCheckResult> {
  try {
    // In a real implementation, this would use the tls module to connect
    // and retrieve certificate information. For demo purposes, we'll simulate:

    // Simulate SSL certificate check
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate different SSL statuses based on domain
        const now = new Date();
        const expiryDate = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days from now
        const issuedDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
        );

        // Determine status based on days until expiry
        let status: SSLCheckResult['status'] = 'active';
        if (daysUntilExpiry <= 0) {
          status = 'expired';
        } else if (daysUntilExpiry <= 30) {
          status = 'expiring';
        }

        // Simulate some domains not having SSL yet
        if (domain.includes('test-') || domain.includes('staging-')) {
          resolve({
            status: 'provisioning',
            valid: false,
            error: 'SSL certificate is being provisioned',
          });
          return;
        }

        // Simulate successful SSL certificate
        resolve({
          status,
          valid: status === 'active' || status === 'expiring',
          expires_at: expiryDate.toISOString(),
          issued_at: issuedDate.toISOString(),
          issuer: "Let's Encrypt",
          fingerprint: generateMockFingerprint(),
          days_until_expiry: Math.max(0, daysUntilExpiry),
        });
      }, 1000); // Simulate network delay
    });
  } catch (error) {
    console.error('SSL certificate check failed:', error);
    return {
      status: 'failed',
      valid: false,
      error:
        error instanceof Error ? error.message : 'SSL certificate check failed',
    };
  }
}

function generateMockFingerprint(): string {
  // Generate a mock SHA-256 fingerprint for demo purposes
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < 64; i++) {
    if (i > 0 && i % 2 === 0) result += ':';
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
