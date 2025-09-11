import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface SSLCertificate {
  status: 'pending' | 'issued' | 'expired' | 'error';
  issued_at?: string;
  expires_at?: string;
  issuer?: string;
  certificate_authority: 'letsencrypt' | 'custom';
  auto_renewal: boolean;
  domains: string[];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('website_id');

    if (!websiteId) {
      return NextResponse.json(
        { error: 'Website ID is required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Get website SSL configuration
    const { data: website, error: websiteError } = await supabase
      .from('wedding_websites')
      .select(
        `
        id,
        domain,
        ssl_enabled,
        ssl_config,
        domain_verified
      `,
      )
      .eq('id', websiteId)
      .single();

    if (websiteError || !website) {
      return NextResponse.json(
        { error: 'Wedding website not found' },
        { status: 404 },
      );
    }

    let sslInfo: SSLCertificate | null = null;

    if (website.domain && website.ssl_enabled) {
      // Check SSL certificate status
      sslInfo = await checkSSLCertificate(website.domain, website.ssl_config);
    }

    return NextResponse.json({
      success: true,
      data: {
        website_id: website.id,
        domain: website.domain,
        ssl_enabled: website.ssl_enabled,
        domain_verified: website.domain_verified,
        certificate: sslInfo,
        can_provision:
          website.domain && website.domain_verified && !website.ssl_enabled,
        recommendations: generateSSLRecommendations(website, sslInfo),
      },
    });
  } catch (error) {
    console.error('Error in SSL status endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { websiteId, action, options } = await request.json();

    if (!websiteId) {
      return NextResponse.json(
        { error: 'Website ID is required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    switch (action) {
      case 'provision':
        return await provisionSSLCertificate(supabase, websiteId, options);
      case 'renew':
        return await renewSSLCertificate(supabase, websiteId);
      case 'revoke':
        return await revokeSSLCertificate(supabase, websiteId);
      case 'force_https':
        return await configureHTTPSRedirect(
          supabase,
          websiteId,
          options.enabled,
        );
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in SSL configuration endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function provisionSSLCertificate(
  supabase: any,
  websiteId: string,
  options: any = {},
) {
  // Get website domain information
  const { data: website, error: websiteError } = await supabase
    .from('wedding_websites')
    .select('domain, domain_verified, ssl_enabled')
    .eq('id', websiteId)
    .single();

  if (websiteError || !website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  }

  if (!website.domain) {
    return NextResponse.json(
      { error: 'No custom domain configured' },
      { status: 400 },
    );
  }

  if (!website.domain_verified) {
    return NextResponse.json(
      { error: 'Domain must be verified before SSL can be provisioned' },
      { status: 400 },
    );
  }

  if (website.ssl_enabled) {
    return NextResponse.json(
      { error: 'SSL certificate already exists for this domain' },
      { status: 409 },
    );
  }

  // Generate SSL configuration
  const sslConfig = {
    certificate_authority: options.ca || 'letsencrypt',
    auto_renewal: options.auto_renewal !== false,
    force_https: options.force_https !== false,
    domains: [website.domain],
    provisioned_at: new Date().toISOString(),
    status: 'pending',
  };

  // In a real implementation, this would integrate with SSL providers like Let's Encrypt
  // For now, we'll simulate the process
  const provisionResult = await simulateSSLProvisioning(
    website.domain,
    sslConfig,
  );

  if (provisionResult.success) {
    // Update website with SSL configuration
    const { data, error: updateError } = await supabase
      .from('wedding_websites')
      .update({
        ssl_enabled: true,
        ssl_config: {
          ...sslConfig,
          status: 'issued',
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 90 days
          certificate_fingerprint: provisionResult.fingerprint,
        },
      })
      .eq('id', websiteId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating SSL configuration:', updateError);
      return NextResponse.json(
        { error: 'Failed to save SSL configuration' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        message: 'SSL certificate provisioned successfully',
        certificate: {
          status: 'issued',
          issued_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 90 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          domains: [website.domain],
          auto_renewal: sslConfig.auto_renewal,
        },
      },
    });
  } else {
    return NextResponse.json(
      { error: provisionResult.error || 'Failed to provision SSL certificate' },
      { status: 500 },
    );
  }
}

async function renewSSLCertificate(supabase: any, websiteId: string) {
  const { data: website, error: websiteError } = await supabase
    .from('wedding_websites')
    .select('domain, ssl_enabled, ssl_config')
    .eq('id', websiteId)
    .single();

  if (websiteError || !website || !website.ssl_enabled) {
    return NextResponse.json(
      { error: 'No SSL certificate found to renew' },
      { status: 404 },
    );
  }

  // Simulate renewal process
  const renewalResult = await simulateSSLRenewal(
    website.domain,
    website.ssl_config,
  );

  if (renewalResult.success) {
    const updatedConfig = {
      ...website.ssl_config,
      renewed_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      certificate_fingerprint: renewalResult.fingerprint,
    };

    await supabase
      .from('wedding_websites')
      .update({ ssl_config: updatedConfig })
      .eq('id', websiteId);

    return NextResponse.json({
      success: true,
      data: {
        message: 'SSL certificate renewed successfully',
        expires_at: updatedConfig.expires_at,
      },
    });
  } else {
    return NextResponse.json(
      { error: renewalResult.error || 'Failed to renew SSL certificate' },
      { status: 500 },
    );
  }
}

async function revokeSSLCertificate(supabase: any, websiteId: string) {
  const { data, error } = await supabase
    .from('wedding_websites')
    .update({
      ssl_enabled: false,
      ssl_config: null,
    })
    .eq('id', websiteId)
    .select()
    .single();

  if (error) {
    console.error('Error revoking SSL certificate:', error);
    return NextResponse.json(
      { error: 'Failed to revoke SSL certificate' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: { message: 'SSL certificate revoked successfully' },
  });
}

async function configureHTTPSRedirect(
  supabase: any,
  websiteId: string,
  enabled: boolean,
) {
  const { data: website, error: websiteError } = await supabase
    .from('wedding_websites')
    .select('ssl_config')
    .eq('id', websiteId)
    .single();

  if (websiteError || !website) {
    return NextResponse.json({ error: 'Website not found' }, { status: 404 });
  }

  const updatedConfig = {
    ...website.ssl_config,
    force_https: enabled,
    https_redirect_updated: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from('wedding_websites')
    .update({ ssl_config: updatedConfig })
    .eq('id', websiteId);

  if (updateError) {
    console.error('Error updating HTTPS redirect:', updateError);
    return NextResponse.json(
      { error: 'Failed to update HTTPS redirect setting' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      message: `HTTPS redirect ${enabled ? 'enabled' : 'disabled'} successfully`,
      force_https: enabled,
    },
  });
}

async function checkSSLCertificate(
  domain: string,
  sslConfig: any,
): Promise<SSLCertificate> {
  // In a real implementation, this would check actual SSL certificate status
  // For simulation, we'll use the stored configuration

  if (!sslConfig) {
    return {
      status: 'pending',
      certificate_authority: 'letsencrypt',
      auto_renewal: true,
      domains: [domain],
    };
  }

  const now = new Date();
  const expiresAt = new Date(sslConfig.expires_at);
  const daysUntilExpiry = Math.floor(
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  return {
    status: daysUntilExpiry > 0 ? 'issued' : 'expired',
    issued_at: sslConfig.issued_at,
    expires_at: sslConfig.expires_at,
    issuer: "Let's Encrypt",
    certificate_authority: sslConfig.certificate_authority || 'letsencrypt',
    auto_renewal: sslConfig.auto_renewal !== false,
    domains: sslConfig.domains || [domain],
  };
}

async function simulateSSLProvisioning(domain: string, config: any) {
  // Simulate SSL provisioning process
  // In a real implementation, this would integrate with ACME protocol for Let's Encrypt

  return new Promise<{
    success: boolean;
    error?: string;
    fingerprint?: string;
  }>((resolve) => {
    setTimeout(() => {
      // Simulate 95% success rate
      if (Math.random() > 0.05) {
        resolve({
          success: true,
          fingerprint: generateCertificateFingerprint(),
        });
      } else {
        resolve({
          success: false,
          error: 'DNS validation failed - please check your DNS configuration',
        });
      }
    }, 1000);
  });
}

async function simulateSSLRenewal(domain: string, config: any) {
  // Simulate SSL renewal process
  return new Promise<{
    success: boolean;
    error?: string;
    fingerprint?: string;
  }>((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        fingerprint: generateCertificateFingerprint(),
      });
    }, 500);
  });
}

function generateCertificateFingerprint(): string {
  // Generate a simulated certificate fingerprint
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < 40; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
    if (i > 0 && (i + 1) % 2 === 0 && i < 39) {
      result += ':';
    }
  }
  return result;
}

function generateSSLRecommendations(
  website: any,
  certificate: SSLCertificate | null,
) {
  const recommendations = [];

  if (!website.domain) {
    recommendations.push({
      type: 'info',
      title: 'Custom Domain Required',
      description:
        'Configure a custom domain first to enable SSL certificates.',
      action: 'Configure Domain',
    });
  } else if (!website.domain_verified) {
    recommendations.push({
      type: 'warning',
      title: 'Domain Verification Required',
      description:
        'Verify your domain ownership before SSL can be provisioned.',
      action: 'Verify Domain',
    });
  } else if (!website.ssl_enabled) {
    recommendations.push({
      type: 'success',
      title: 'Ready for SSL',
      description:
        'Your domain is verified and ready for SSL certificate provisioning.',
      action: 'Provision SSL',
    });
  } else if (certificate) {
    const now = new Date();
    const expiresAt = new Date(certificate.expires_at || now);
    const daysUntilExpiry = Math.floor(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilExpiry <= 0) {
      recommendations.push({
        type: 'error',
        title: 'Certificate Expired',
        description:
          'Your SSL certificate has expired and needs to be renewed.',
        action: 'Renew Certificate',
      });
    } else if (daysUntilExpiry <= 30) {
      recommendations.push({
        type: 'warning',
        title: 'Certificate Expiring Soon',
        description: `Your SSL certificate expires in ${daysUntilExpiry} days.`,
        action: certificate.auto_renewal
          ? 'Auto-renewal enabled'
          : 'Renew Certificate',
      });
    } else {
      recommendations.push({
        type: 'success',
        title: 'Certificate Active',
        description: `Your SSL certificate is valid until ${expiresAt.toLocaleDateString()}.`,
        action: 'View Details',
      });
    }
  }

  return recommendations;
}
