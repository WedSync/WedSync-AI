import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface DomainStatus {
  configured: boolean;
  dns_status: 'pending' | 'configured' | 'error';
  ssl_status: 'pending' | 'issued' | 'error';
  verification_record?: {
    type: string;
    name: string;
    value: string;
  };
  error_message?: string;
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

    // Get website domain configuration
    const { data: website, error: websiteError } = await supabase
      .from('wedding_websites')
      .select(
        `
        id,
        domain,
        custom_domain_config,
        domain_verified,
        ssl_enabled,
        created_at
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

    // Check domain status if custom domain is configured
    let domainStatus: DomainStatus = {
      configured: false,
      dns_status: 'pending',
      ssl_status: 'pending',
    };

    if (website.domain) {
      domainStatus = await checkDomainStatus(
        website.domain,
        website.custom_domain_config,
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        website_id: website.id,
        current_domain: website.domain,
        domain_verified: website.domain_verified,
        ssl_enabled: website.ssl_enabled,
        status: domainStatus,
        default_domain: `${website.id}.wedsync.app`, // Assuming a default domain pattern
        setup_instructions: generateSetupInstructions(
          website.domain,
          domainStatus,
        ),
      },
    });
  } catch (error) {
    console.error('Error in domain status endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { websiteId, domain, action } = await request.json();

    if (!websiteId) {
      return NextResponse.json(
        { error: 'Website ID is required' },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    switch (action) {
      case 'configure':
        return await configureDomain(supabase, websiteId, domain);
      case 'verify':
        return await verifyDomain(supabase, websiteId);
      case 'remove':
        return await removeDomain(supabase, websiteId);
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in domain configuration endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

async function configureDomain(
  supabase: any,
  websiteId: string,
  domain: string,
) {
  // Validate domain format
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.([a-zA-Z]{2,})$/;
  if (!domainRegex.test(domain)) {
    return NextResponse.json(
      { error: 'Invalid domain format' },
      { status: 400 },
    );
  }

  // Check if domain is already in use
  const { data: existingDomain } = await supabase
    .from('wedding_websites')
    .select('id')
    .eq('domain', domain)
    .neq('id', websiteId)
    .single();

  if (existingDomain) {
    return NextResponse.json(
      { error: 'Domain is already in use' },
      { status: 409 },
    );
  }

  // Generate verification record
  const verificationRecord = {
    type: 'TXT',
    name: `_wedsync-verification.${domain}`,
    value: `wedsync-verification=${generateVerificationToken(websiteId)}`,
  };

  // Generate domain configuration
  const domainConfig = {
    cname_record: {
      type: 'CNAME',
      name: domain,
      value: 'websites.wedsync.app',
    },
    verification_record: verificationRecord,
    configured_at: new Date().toISOString(),
  };

  // Update website with domain configuration
  const { data, error } = await supabase
    .from('wedding_websites')
    .update({
      domain,
      custom_domain_config: domainConfig,
      domain_verified: false,
      ssl_enabled: false,
    })
    .eq('id', websiteId)
    .select()
    .single();

  if (error) {
    console.error('Error updating domain configuration:', error);
    return NextResponse.json(
      { error: 'Failed to configure domain' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      domain,
      verification_record: verificationRecord,
      cname_record: domainConfig.cname_record,
      next_steps: [
        "Add the verification TXT record to your domain's DNS",
        'Add the CNAME record to point your domain to our servers',
        'Click "Verify Domain" once DNS changes have propagated',
      ],
    },
  });
}

async function verifyDomain(supabase: any, websiteId: string) {
  // Get current domain configuration
  const { data: website, error: websiteError } = await supabase
    .from('wedding_websites')
    .select('domain, custom_domain_config')
    .eq('id', websiteId)
    .single();

  if (websiteError || !website?.domain) {
    return NextResponse.json(
      { error: 'No domain configured for this website' },
      { status: 400 },
    );
  }

  // Check domain status
  const domainStatus = await checkDomainStatus(
    website.domain,
    website.custom_domain_config,
  );

  // Update domain verification status
  const updateData: any = {};

  if (domainStatus.dns_status === 'configured') {
    updateData.domain_verified = true;

    // If DNS is configured, attempt to provision SSL
    if (domainStatus.ssl_status === 'pending') {
      // In a real implementation, this would trigger SSL certificate provisioning
      // For now, we'll simulate it
      updateData.ssl_enabled = true;
      domainStatus.ssl_status = 'issued';
    }
  }

  if (Object.keys(updateData).length > 0) {
    const { error: updateError } = await supabase
      .from('wedding_websites')
      .update(updateData)
      .eq('id', websiteId);

    if (updateError) {
      console.error('Error updating domain verification:', updateError);
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      domain: website.domain,
      status: domainStatus,
      verified: domainStatus.dns_status === 'configured',
      ssl_enabled: domainStatus.ssl_status === 'issued',
    },
  });
}

async function removeDomain(supabase: any, websiteId: string) {
  const { data, error } = await supabase
    .from('wedding_websites')
    .update({
      domain: null,
      custom_domain_config: null,
      domain_verified: false,
      ssl_enabled: false,
    })
    .eq('id', websiteId)
    .select()
    .single();

  if (error) {
    console.error('Error removing domain:', error);
    return NextResponse.json(
      { error: 'Failed to remove domain' },
      { status: 500 },
    );
  }

  return NextResponse.json({
    success: true,
    data: { message: 'Domain removed successfully' },
  });
}

async function checkDomainStatus(
  domain: string,
  config: any,
): Promise<DomainStatus> {
  // In a real implementation, this would check actual DNS records
  // For demo purposes, we'll simulate the checks

  try {
    // Simulate DNS verification check
    const dnsConfigured = await simulateDNSCheck(domain, config);

    // Simulate SSL status check
    const sslStatus = dnsConfigured ? 'issued' : 'pending';

    return {
      configured: dnsConfigured,
      dns_status: dnsConfigured ? 'configured' : 'pending',
      ssl_status: sslStatus as 'pending' | 'issued' | 'error',
      verification_record: config?.verification_record,
    };
  } catch (error) {
    console.error('Error checking domain status:', error);
    return {
      configured: false,
      dns_status: 'error',
      ssl_status: 'error',
      error_message: 'Failed to check domain status',
    };
  }
}

async function simulateDNSCheck(domain: string, config: any): Promise<boolean> {
  // In a real implementation, this would use DNS lookup libraries
  // to check if the required records exist

  // For simulation, we'll return true if config exists and it's been more than 5 minutes
  if (!config || !config.configured_at) return false;

  const configuredAt = new Date(config.configured_at);
  const now = new Date();
  const timeDiff = now.getTime() - configuredAt.getTime();
  const minutesDiff = timeDiff / (1000 * 60);

  // Simulate DNS propagation taking 5 minutes
  return minutesDiff > 5;
}

function generateVerificationToken(websiteId: string): string {
  // In a real implementation, this would generate a secure token
  return `ws_${websiteId.slice(0, 8)}_${Date.now().toString(36)}`;
}

function generateSetupInstructions(
  domain: string | null,
  status: DomainStatus,
) {
  if (!domain) {
    return [
      'Enter your custom domain name',
      'Click "Configure Domain" to get DNS instructions',
      'Add the required DNS records to your domain',
      'Verify your domain configuration',
    ];
  }

  const instructions = [];

  if (status.dns_status === 'pending') {
    instructions.push(
      "Add the verification TXT record to your domain's DNS",
      'Add the CNAME record to point your domain to our servers',
      'Wait for DNS propagation (usually 5-60 minutes)',
      'Click "Verify Domain" to check configuration',
    );
  } else if (status.dns_status === 'configured') {
    instructions.push('✅ DNS configuration complete');

    if (status.ssl_status === 'pending') {
      instructions.push('🔄 SSL certificate is being provisioned');
    } else if (status.ssl_status === 'issued') {
      instructions.push('✅ SSL certificate active - your site is ready!');
    }
  } else if (status.dns_status === 'error') {
    instructions.push(
      '❌ DNS configuration error',
      'Please check your DNS records and try again',
      'Contact support if the problem persists',
    );
  }

  return instructions;
}
