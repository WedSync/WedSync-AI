# TEAM C - ROUND 1: WS-326 - Wedding Website Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build integration systems for wedding website domain management, DNS configuration, CDN delivery, and external service connections for website publishing
**FEATURE ID:** WS-326 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating seamless domain integration that makes custom domains work automatically for couples without technical knowledge

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/lib/integrations/domain-management/
ls -la $WS_ROOT/wedsync/src/app/api/wedding-websites/publish/
cat $WS_ROOT/wedsync/src/lib/integrations/domain-management/service.ts | head -20
cat $WS_ROOT/wedsync/src/lib/integrations/cdn/cloudflare.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm test -- --testPathPattern="domain-management|cdn"
# MUST show: "All tests passing"
```

4. **INTEGRATION TEST:**
```bash
cd $WS_ROOT/wedsync && npm run test:integration -- --testNamePattern="Domain.*Integration"
# MUST show: "Integration tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing integration patterns
await mcp__serena__search_for_pattern("integration.*service|domain.*management|cdn.*config");
await mcp__serena__find_symbol("SupabaseClient", "", true);
await mcp__serena__get_symbols_overview("src/lib/integrations");
await mcp__serena__find_symbol("CloudflareService", "", true);
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR INTEGRATION WORK)
```typescript
// Load integration patterns and system architecture
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation specific to domain/DNS management and CDN integration
await mcp__Ref__ref_search_documentation("Cloudflare API domain management DNS configuration");
await mcp__Ref__ref_search_documentation("Vercel domains custom domain integration Next.js");
await mcp__Ref__ref_search_documentation("AWS Route53 DNS management programmatic domain setup");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX INTEGRATION ARCHITECTURE

### Use Sequential Thinking MCP for Integration Planning
```typescript
// Plan the domain and publishing integration system
mcp__sequential-thinking__sequential_thinking({
  thought: "For wedding website integration, I need: 1) Custom domain verification and DNS management, 2) SSL certificate automation, 3) CDN configuration for fast global delivery, 4) Subdomain management for free tier, 5) Integration with Vercel/hosting platform, 6) Domain health monitoring and troubleshooting.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Domain workflow: User enters custom domain -> Verify domain ownership -> Configure DNS records -> Provision SSL certificate -> Configure CDN/proxy -> Health check and monitoring. Need fallback to subdomain if custom domain fails.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down integration components, track external dependencies
2. **integration-specialist** - Focus on third-party service integration patterns
3. **security-compliance-officer** - Ensure domain security and SSL certificate management
4. **code-quality-guardian** - Maintain integration code standards
5. **test-automation-architect** - Integration testing with mock external services
6. **documentation-chronicler** - Evidence-based integration documentation

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### DOMAIN INTEGRATION SECURITY CHECKLIST:
- [ ] **Domain ownership verification** - TXT record verification before activation
- [ ] **SSL certificate automation** - Let's Encrypt or Cloudflare SSL
- [ ] **DNS hijacking prevention** - Monitor domain records for unauthorized changes
- [ ] **Rate limiting on domain operations** - Prevent abuse of domain API calls
- [ ] **Secure credential storage** - API keys in environment variables only
- [ ] **Domain validation** - Prevent subdomain takeover attacks
- [ ] **Audit logging** - Log all domain configuration changes
- [ ] **Error handling** - Never expose API keys in error messages

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**PRIMARY RESPONSIBILITIES:**
- Third-party service integration (Cloudflare, Vercel, AWS)
- Real-time data synchronization between services
- Webhook handling and processing
- Data flow orchestration between systems
- Integration health monitoring and alerting
- Failure handling and recovery mechanisms
- External API management and rate limiting

### WEDDING WEBSITE INTEGRATION REQUIREMENTS

#### 1. DOMAIN MANAGEMENT SERVICE
```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/domain-management/service.ts

export interface DomainProvider {
  verifyOwnership(domain: string, websiteId: string): Promise<DomainVerificationResult>;
  configureDNS(domain: string, config: DNSConfig): Promise<DNSResult>;
  provisionSSL(domain: string): Promise<SSLResult>;
  checkDomainHealth(domain: string): Promise<DomainHealthResult>;
  removeDomain(domain: string): Promise<void>;
}

export class DomainManagementService {
  private cloudflareProvider: CloudflareDomainProvider;
  private vercelProvider: VercelDomainProvider;

  constructor() {
    this.cloudflareProvider = new CloudflareDomainProvider();
    this.vercelProvider = new VercelDomainProvider();
  }

  async setupCustomDomain(websiteId: string, domain: string): Promise<DomainSetupResult> {
    try {
      // Step 1: Verify domain ownership
      const verification = await this.verifyDomainOwnership(domain, websiteId);
      if (!verification.verified) {
        return {
          success: false,
          error: 'Domain ownership verification failed',
          verificationRecord: verification.txtRecord
        };
      }

      // Step 2: Configure DNS records
      const dnsResult = await this.configureDomainDNS(domain, websiteId);
      if (!dnsResult.success) {
        return {
          success: false,
          error: 'DNS configuration failed'
        };
      }

      // Step 3: Provision SSL certificate
      const sslResult = await this.provisionSSLCertificate(domain);
      if (!sslResult.success) {
        return {
          success: false,
          error: 'SSL certificate provisioning failed'
        };
      }

      // Step 4: Update database with domain configuration
      await this.updateWebsiteDomainConfig(websiteId, domain, {
        verified: true,
        dnsConfigured: true,
        sslProvisioned: true,
        status: 'active'
      });

      return {
        success: true,
        domain,
        status: 'active',
        sslEnabled: true
      };

    } catch (error) {
      // Log error and return failure
      console.error(`Domain setup failed for ${domain}:`, error);
      return {
        success: false,
        error: 'Domain setup failed due to technical error'
      };
    }
  }

  async generateSubdomain(coupleNames: { bride: string; groom: string }): Promise<string> {
    const cleanName = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const brideName = cleanName(coupleNames.bride);
    const groomName = cleanName(coupleNames.groom);
    
    // Try different subdomain patterns
    const patterns = [
      `${brideName}and${groomName}`,
      `${brideName}-${groomName}`,
      `${brideName}${groomName}wedding`,
      `${brideName}-${groomName}-wedding`
    ];

    for (const pattern of patterns) {
      const subdomain = `${pattern}.wedsync.com`;
      const isAvailable = await this.checkSubdomainAvailability(subdomain);
      if (isAvailable) {
        return subdomain;
      }
    }

    // Fallback with random number
    const randomNum = Math.floor(Math.random() * 10000);
    return `${brideName}${groomName}${randomNum}.wedsync.com`;
  }

  private async verifyDomainOwnership(domain: string, websiteId: string): Promise<DomainVerificationResult> {
    const txtRecord = `wedsync-verification=${websiteId}`;
    
    // Check if TXT record exists
    try {
      const records = await this.cloudflareProvider.getDNSRecords(domain, 'TXT');
      const verificationRecord = records.find(record => 
        record.content.includes(`wedsync-verification=${websiteId}`)
      );

      return {
        verified: !!verificationRecord,
        txtRecord,
        instructions: `Please add this TXT record to your domain's DNS: ${txtRecord}`
      };
    } catch (error) {
      return {
        verified: false,
        txtRecord,
        error: 'Unable to verify domain ownership'
      };
    }
  }
}
```

#### 2. CLOUDFLARE INTEGRATION
```typescript
// File: $WS_ROOT/wedsync/src/lib/integrations/cdn/cloudflare.ts

export class CloudflareDomainProvider implements DomainProvider {
  private apiKey: string;
  private email: string;
  private baseUrl = 'https://api.cloudflare.com/client/v4';

  constructor() {
    this.apiKey = process.env.CLOUDFLARE_API_KEY!;
    this.email = process.env.CLOUDFLARE_EMAIL!;
    
    if (!this.apiKey || !this.email) {
      throw new Error('Cloudflare credentials not configured');
    }
  }

  async verifyOwnership(domain: string, websiteId: string): Promise<DomainVerificationResult> {
    try {
      const zoneId = await this.getZoneId(domain);
      const records = await this.getDNSRecords(domain, 'TXT');
      
      const verificationRecord = records.find(record =>
        record.content.includes(`wedsync-verification=${websiteId}`)
      );

      return {
        verified: !!verificationRecord,
        txtRecord: `wedsync-verification=${websiteId}`,
        zoneId
      };
    } catch (error) {
      return {
        verified: false,
        txtRecord: `wedsync-verification=${websiteId}`,
        error: error.message
      };
    }
  }

  async configureDNS(domain: string, config: DNSConfig): Promise<DNSResult> {
    try {
      const zoneId = await this.getZoneId(domain);
      
      // Create or update A record pointing to Vercel/hosting IP
      const aRecord = await this.createDNSRecord(zoneId, {
        type: 'A',
        name: domain,
        content: config.ipAddress,
        ttl: 300
      });

      // Create CNAME record for www subdomain
      const cnameRecord = await this.createDNSRecord(zoneId, {
        type: 'CNAME',
        name: `www.${domain}`,
        content: domain,
        ttl: 300
      });

      return {
        success: true,
        records: [aRecord, cnameRecord]
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async provisionSSL(domain: string): Promise<SSLResult> {
    try {
      const zoneId = await this.getZoneId(domain);
      
      // Enable SSL for the domain
      const sslConfig = await this.updateSSLSettings(zoneId, {
        ssl: 'flexible', // Start with flexible, upgrade to strict later
        always_use_https: true,
        automatic_https_rewrites: true
      });

      return {
        success: true,
        sslMode: 'flexible',
        certificateStatus: 'active'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  private async makeCloudflareRequest(endpoint: string, method: string = 'GET', data?: any) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: {
        'X-Auth-Email': this.email,
        'X-Auth-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });

    if (!response.ok) {
      throw new Error(`Cloudflare API error: ${response.statusText}`);
    }

    return response.json();
  }

  private async getZoneId(domain: string): Promise<string> {
    const response = await this.makeCloudflareRequest(`/zones?name=${domain}`);
    
    if (response.result.length === 0) {
      throw new Error(`Domain ${domain} not found in Cloudflare account`);
    }

    return response.result[0].id;
  }
}
```

#### 3. WEBSITE PUBLISHING API
```typescript
// File: $WS_ROOT/wedsync/src/app/api/wedding-websites/[id]/publish/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { withSecureValidation } from '$WS_ROOT/wedsync/src/lib/validation/middleware';
import { publishWebsiteSchema } from '$WS_ROOT/wedsync/src/lib/validation/wedding-website-schemas';
import { DomainManagementService } from '$WS_ROOT/wedsync/src/lib/integrations/domain-management/service';
import { WeddingWebsiteService } from '$WS_ROOT/wedsync/src/lib/wedding-websites/service';

export const POST = withSecureValidation(
  publishWebsiteSchema,
  async (request: NextRequest, validatedData, { params }) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const websiteId = params.id;
    const { isPublished, customDomain } = validatedData;

    try {
      // Get the website
      const website = await WeddingWebsiteService.getById(websiteId, session.user.organizationId);
      if (!website) {
        return NextResponse.json({ error: 'Website not found' }, { status: 404 });
      }

      const domainService = new DomainManagementService();

      if (isPublished && customDomain) {
        // Setup custom domain
        const domainResult = await domainService.setupCustomDomain(websiteId, customDomain);
        
        if (!domainResult.success) {
          return NextResponse.json({
            error: 'Custom domain setup failed',
            details: domainResult.error,
            verificationRecord: domainResult.verificationRecord
          }, { status: 400 });
        }

        // Update website with custom domain
        await WeddingWebsiteService.update(websiteId, {
          isPublished: true,
          customDomain,
          publishedAt: new Date().toISOString()
        }, session.user.organizationId);

        return NextResponse.json({
          success: true,
          message: 'Website published with custom domain',
          domain: customDomain,
          url: `https://${customDomain}`
        });

      } else if (isPublished) {
        // Publish with subdomain
        let subdomain = website.subdomain;
        if (!subdomain) {
          subdomain = await domainService.generateSubdomain({
            bride: website.couple.bride_name,
            groom: website.couple.groom_name
          });
        }

        await WeddingWebsiteService.update(websiteId, {
          isPublished: true,
          subdomain,
          publishedAt: new Date().toISOString()
        }, session.user.organizationId);

        return NextResponse.json({
          success: true,
          message: 'Website published with subdomain',
          domain: subdomain,
          url: `https://${subdomain}`
        });

      } else {
        // Unpublish website
        await WeddingWebsiteService.update(websiteId, {
          isPublished: false,
          publishedAt: null
        }, session.user.organizationId);

        return NextResponse.json({
          success: true,
          message: 'Website unpublished'
        });
      }

    } catch (error) {
      console.error('Website publishing error:', error);
      return NextResponse.json({
        error: 'Publishing failed',
        details: error.message
      }, { status: 500 });
    }
  }
);
```

#### 4. WEBHOOK HANDLER FOR DOMAIN STATUS
```typescript
// File: $WS_ROOT/wedsync/src/app/api/webhooks/cloudflare/route.ts

export const POST = async (request: NextRequest) => {
  try {
    const signature = request.headers.get('x-cloudflare-webhook-signature');
    const body = await request.text();
    
    // Verify webhook signature
    const isValid = await verifyCloudflareWebhook(body, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    
    switch (event.type) {
      case 'ssl.certificate.issued':
        await handleSSLCertificateIssued(event);
        break;
      case 'dns.record.changed':
        await handleDNSRecordChanged(event);
        break;
      case 'domain.verification.completed':
        await handleDomainVerificationCompleted(event);
        break;
      default:
        console.log(`Unhandled Cloudflare webhook event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Cloudflare webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
};

async function handleSSLCertificateIssued(event: any) {
  // Update website SSL status in database
  const domain = event.data.domain;
  await updateWebsiteSSLStatus(domain, 'active');
}
```

## 📋 REAL WEDDING USER STORIES FOR INTEGRATION

**Emma & James (Photography Couple):**
*Integration needs: Custom domain "emma-james-wedding.com" setup, SSL certificate automation, CDN for fast photo loading, subdomain fallback if custom domain fails*

**Sarah & Mike (Destination Wedding):**
*Integration needs: International domain setup, multiple language CDN optimization, integration with international DNS providers, backup hosting*

**Lisa & David (Garden Party Wedding):**
*Integration needs: Simple subdomain setup, basic SSL, integration with existing family domain, easy publishing process*

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] DomainManagementService with custom domain setup workflow
- [ ] CloudflareDomainProvider for DNS and SSL management
- [ ] Website publishing API with domain integration
- [ ] Subdomain generation and management system
- [ ] Webhook handlers for domain status updates
- [ ] Domain health monitoring and alerting
- [ ] Integration tests with mock external services
- [ ] Error handling and recovery mechanisms
- [ ] Documentation for domain setup process
- [ ] Evidence package with integration testing results

## 💾 WHERE TO SAVE YOUR WORK
- Domain Service: `$WS_ROOT/wedsync/src/lib/integrations/domain-management/`
- CDN Integration: `$WS_ROOT/wedsync/src/lib/integrations/cdn/`
- Publishing API: `$WS_ROOT/wedsync/src/app/api/wedding-websites/[id]/publish/`
- Webhooks: `$WS_ROOT/wedsync/src/app/api/webhooks/cloudflare/`
- Types: `$WS_ROOT/wedsync/src/types/domain-management.ts`
- Tests: `$WS_ROOT/wedsync/src/__tests__/integrations/domain-management/`

## 🏁 COMPLETION CHECKLIST
- [ ] Domain management service implemented and tested
- [ ] Cloudflare integration working with API keys
- [ ] Website publishing API with custom domain support
- [ ] Subdomain generation and availability checking
- [ ] SSL certificate automation implemented
- [ ] DNS configuration and health monitoring
- [ ] Webhook handlers for external service events
- [ ] TypeScript compilation successful with no errors
- [ ] All integration tests passing (>90% coverage)
- [ ] Error handling and recovery mechanisms tested
- [ ] Security validation for domain operations
- [ ] Evidence package with integration testing results
- [ ] Performance tested (domain setup <30 seconds)

---

**EXECUTE IMMEDIATELY - Build the integration layer that makes custom domains work seamlessly for couples!**