# TEAM C - ROUND 1: WS-343 - CRM Integration Hub Third-Party Integration
## 2025-01-31 - Development Round 1

**YOUR MISSION:** Build the comprehensive CRM provider integrations, OAuth flows, data synchronization bridges, and webhook handling systems
**FEATURE ID:** WS-343 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about reliable data flow between 9+ different CRM systems with varying APIs, auth methods, and data formats

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/services/crm-providers/
cat $WS_ROOT/wedsync/src/services/crm-providers/TaveCRMProvider.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **INTEGRATION TEST RESULTS:**
```bash
npm test integration/crm
# MUST show: "All CRM integrations passing"
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
await mcp__serena__search_for_pattern("Provider.*class|OAuth.*flow|webhook.*handler");
await mcp__serena__find_symbol("IntegrationService", "", true);
await mcp__serena__get_symbols_overview("src/services/integrations/");
```

### B. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load CRM API documentation and OAuth implementation patterns
mcp__Ref__ref_search_documentation("OAuth2 PKCE flow implementation security best practices");
mcp__Ref__ref_search_documentation("Tave API documentation authentication endpoints");
mcp__Ref__ref_search_documentation("HoneyBook API integration webhook handling");
mcp__Ref__ref_search_documentation("webhook processing Node.js security validation");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequential_thinking({
  thought: "I need to integrate with 9+ different CRM providers, each with different authentication methods: Tave (API key), HoneyBook (OAuth2), Light Blue (screen scraping), Seventeen (basic auth), etc. Each has different rate limits, data formats, and field structures. I need a unified abstraction layer that handles auth flows, data mapping, error recovery, and webhook processing while respecting each provider's constraints.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 7
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down CRM provider integrations by priority
2. **integration-specialist** - Design unified CRM provider interface
3. **security-compliance-officer** - Secure OAuth flows and webhook validation
4. **code-quality-guardian** - Consistent integration patterns
5. **test-automation-architect** - CRM provider testing with sandboxes
6. **documentation-chronicler** - Document all provider integration details

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### INTEGRATION SECURITY CHECKLIST:
- [ ] **OAuth2 PKCE implementation** - Enhanced security for public clients
- [ ] **Webhook signature validation** - Verify all incoming webhooks
- [ ] **Rate limiting compliance** - Respect all CRM provider limits
- [ ] **Credential rotation handling** - Automatic token refresh
- [ ] **API key secure storage** - Never log or expose sensitive credentials
- [ ] **Request/response sanitization** - Clean all data before processing
- [ ] **SSL/TLS enforcement** - All CRM communications over HTTPS
- [ ] **Error message sanitization** - Never expose internal system details

## 🎯 TEAM C SPECIALIZATION: INTEGRATION FOCUS

**INTEGRATION REQUIREMENTS:**
- Multi-system integration with unified interfaces
- Real-time data synchronization capabilities
- Webhook handling and processing systems
- Data flow orchestration between systems
- Integration health monitoring and alerting
- Failure handling and recovery mechanisms

## 📋 DETAILED TECHNICAL SPECIFICATION

### Real Wedding Scenario Context
**Integration Challenge:** Sarah (photographer) has been using Tave for 3 years with 200+ clients. She also gets some clients through HoneyBook. When she imports from Tave, some clients might already exist from HoneyBook imports. The system needs to intelligently merge duplicate clients while preserving all wedding details and maintaining data integrity across both systems.

### CRM Provider Interface Design

#### 1. Base CRM Provider Interface
```typescript
// File: src/services/crm-providers/CRMProviderInterface.ts
export interface CRMProviderInterface {
  readonly id: string;
  readonly name: string;
  readonly authType: 'oauth2' | 'api_key' | 'basic_auth' | 'scraping';
  readonly rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    batchSize?: number;
  };

  // Connection Management
  testConnection(authConfig: AuthConfig): Promise<ConnectionTestResult>;
  refreshAuth(authConfig: AuthConfig): Promise<AuthConfig>;
  
  // Data Operations
  getAllClients(authConfig: AuthConfig, options?: SyncOptions): Promise<CRMClient[]>;
  getClientById(authConfig: AuthConfig, clientId: string): Promise<CRMClient>;
  createClient(authConfig: AuthConfig, clientData: Partial<CRMClient>): Promise<string>;
  updateClient(authConfig: AuthConfig, clientId: string, clientData: Partial<CRMClient>): Promise<void>;
  
  // Metadata
  getAvailableFields(): Promise<CRMFieldDefinition[]>;
  getDefaultFieldMappings(): CRMFieldMapping[];
  
  // Webhook Support (if available)
  setupWebhooks?(authConfig: AuthConfig, webhookUrl: string): Promise<void>;
  validateWebhook?(payload: any, signature: string): boolean;
  processWebhook?(payload: any): Promise<WebhookProcessResult>;
}

export interface AuthConfig {
  [key: string]: string | number | boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  accountInfo?: {
    accountName: string;
    userEmail: string;
    planType: string;
  };
  rateLimitStatus?: {
    remaining: number;
    resetTime: Date;
  };
  error?: string;
}

export interface CRMClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  weddingDate?: string;
  partnerName?: string;
  venueInfo?: {
    name: string;
    address: string;
    coordinator?: string;
  };
  customFields: Record<string, any>;
  lastModified: Date;
  tags?: string[];
}
```

#### 2. Tave CRM Provider Implementation
```typescript
// File: src/services/crm-providers/TaveCRMProvider.ts
import { CRMProviderInterface, AuthConfig, CRMClient } from './CRMProviderInterface';

export class TaveCRMProvider implements CRMProviderInterface {
  readonly id = 'tave';
  readonly name = 'Tave';
  readonly authType = 'api_key';
  readonly rateLimits = {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    batchSize: 100
  };

  private baseUrl = 'https://tave.com/api/v1';

  async testConnection(authConfig: AuthConfig): Promise<ConnectionTestResult> {
    try {
      const response = await this.makeRequest('/studios', authConfig);
      
      return {
        success: true,
        accountInfo: {
          accountName: response.studio.name,
          userEmail: response.studio.contact_email,
          planType: response.studio.plan_type
        },
        rateLimitStatus: {
          remaining: parseInt(response.headers['x-ratelimit-remaining'] || '0'),
          resetTime: new Date(parseInt(response.headers['x-ratelimit-reset']) * 1000)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Connection failed: ${error.message}`
      };
    }
  }

  async getAllClients(authConfig: AuthConfig, options?: SyncOptions): Promise<CRMClient[]> {
    const clients: CRMClient[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      try {
        const response = await this.makeRequest(
          `/clients?page=${page}&limit=${this.rateLimits.batchSize}&include=jobs,contacts`,
          authConfig
        );

        const taveClients = response.clients || [];
        
        for (const taveClient of taveClients) {
          clients.push(this.transformTaveClient(taveClient));
        }

        hasMore = taveClients.length === this.rateLimits.batchSize;
        page++;

        // Rate limiting - respect API limits
        await this.rateLimitDelay();

      } catch (error) {
        console.error(`Tave API error on page ${page}:`, error);
        
        if (error.status === 429) {
          // Rate limit exceeded - wait and retry
          await this.handleRateLimit(error);
          continue;
        }
        
        throw error;
      }
    }

    return clients;
  }

  async createClient(authConfig: AuthConfig, clientData: Partial<CRMClient>): Promise<string> {
    const taveClientData = this.transformToTaveFormat(clientData);
    
    const response = await this.makeRequest('/clients', authConfig, {
      method: 'POST',
      body: JSON.stringify(taveClientData),
      headers: { 'Content-Type': 'application/json' }
    });

    return response.client.id;
  }

  async updateClient(authConfig: AuthConfig, clientId: string, clientData: Partial<CRMClient>): Promise<void> {
    const taveClientData = this.transformToTaveFormat(clientData);
    
    await this.makeRequest(`/clients/${clientId}`, authConfig, {
      method: 'PUT',
      body: JSON.stringify(taveClientData),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  getDefaultFieldMappings(): CRMFieldMapping[] {
    return [
      {
        wedsyncField: 'firstName',
        crmField: 'primary_contact.first_name',
        fieldType: 'text',
        syncDirection: 'bidirectional',
        isRequired: true
      },
      {
        wedsyncField: 'lastName', 
        crmField: 'primary_contact.last_name',
        fieldType: 'text',
        syncDirection: 'bidirectional',
        isRequired: true
      },
      {
        wedsyncField: 'email',
        crmField: 'primary_contact.email',
        fieldType: 'email',
        syncDirection: 'bidirectional',
        isRequired: true
      },
      {
        wedsyncField: 'phone',
        crmField: 'primary_contact.phone',
        fieldType: 'phone',
        syncDirection: 'bidirectional',
        isRequired: false
      },
      {
        wedsyncField: 'weddingDate',
        crmField: 'jobs.0.event_date',
        fieldType: 'date',
        syncDirection: 'bidirectional',
        isRequired: false,
        transformRules: {
          format: 'ISO8601'
        }
      },
      {
        wedsyncField: 'venueInfo.name',
        crmField: 'jobs.0.venue_name',
        fieldType: 'text',
        syncDirection: 'bidirectional',
        isRequired: false
      }
    ];
  }

  private async makeRequest(endpoint: string, authConfig: AuthConfig, options: RequestInit = {}): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authConfig.api_key}`,
        'User-Agent': 'WedSync/1.0',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Tave API error (${response.status}): ${errorBody}`);
    }

    return response.json();
  }

  private transformTaveClient(taveClient: any): CRMClient {
    const primaryContact = taveClient.primary_contact || {};
    const firstJob = taveClient.jobs?.[0] || {};

    return {
      id: taveClient.id,
      firstName: primaryContact.first_name || '',
      lastName: primaryContact.last_name || '',
      email: primaryContact.email || '',
      phone: primaryContact.phone || undefined,
      weddingDate: firstJob.event_date || undefined,
      partnerName: taveClient.secondary_contact?.first_name 
        ? `${taveClient.secondary_contact.first_name} ${taveClient.secondary_contact.last_name}`
        : undefined,
      venueInfo: firstJob.venue_name ? {
        name: firstJob.venue_name,
        address: firstJob.venue_address || '',
        coordinator: firstJob.venue_coordinator || undefined
      } : undefined,
      customFields: {
        taveClientId: taveClient.id,
        taveJobId: firstJob.id,
        jobType: firstJob.job_type,
        status: taveClient.status
      },
      lastModified: new Date(taveClient.updated_at),
      tags: taveClient.tags || []
    };
  }

  private transformToTaveFormat(clientData: Partial<CRMClient>): any {
    return {
      primary_contact: {
        first_name: clientData.firstName,
        last_name: clientData.lastName,
        email: clientData.email,
        phone: clientData.phone
      },
      secondary_contact: clientData.partnerName ? {
        first_name: clientData.partnerName.split(' ')[0],
        last_name: clientData.partnerName.split(' ').slice(1).join(' ')
      } : undefined,
      jobs: clientData.weddingDate || clientData.venueInfo ? [{
        event_date: clientData.weddingDate,
        venue_name: clientData.venueInfo?.name,
        venue_address: clientData.venueInfo?.address
      }] : undefined,
      tags: clientData.tags
    };
  }

  private async rateLimitDelay(): Promise<void> {
    // Conservative rate limiting - slightly below the actual limit
    const delayMs = (60 * 1000) / (this.rateLimits.requestsPerMinute * 0.8);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  private async handleRateLimit(error: any): Promise<void> {
    const retryAfter = error.headers?.['retry-after'];
    const delaySeconds = retryAfter ? parseInt(retryAfter) : 60;
    
    console.log(`Rate limit exceeded, waiting ${delaySeconds} seconds...`);
    await new Promise(resolve => setTimeout(resolve, delaySeconds * 1000));
  }
}
```

#### 3. HoneyBook OAuth2 Provider Implementation
```typescript
// File: src/services/crm-providers/HoneyBookCRMProvider.ts
import { CRMProviderInterface, AuthConfig, CRMClient } from './CRMProviderInterface';
import { generatePKCEChallenge, verifyPKCEChallenge } from '@/lib/oauth-utils';

export class HoneyBookCRMProvider implements CRMProviderInterface {
  readonly id = 'honeybook';
  readonly name = 'HoneyBook';
  readonly authType = 'oauth2';
  readonly rateLimits = {
    requestsPerMinute: 120,
    requestsPerHour: 2000,
    batchSize: 50
  };

  private baseUrl = 'https://api.honeybook.com/v2';
  private authUrl = 'https://api.honeybook.com/oauth/authorize';
  private tokenUrl = 'https://api.honeybook.com/oauth/token';

  async generateAuthUrl(integrationId: string, redirectUri: string): Promise<string> {
    const { challenge, verifier } = generatePKCEChallenge();
    
    // Store verifier temporarily (in Redis or database)
    await this.storePKCEVerifier(integrationId, verifier);
    
    const params = new URLSearchParams({
      client_id: process.env.HONEYBOOK_CLIENT_ID!,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'read:contacts read:projects',
      state: integrationId,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });

    return `${this.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, integrationId: string, redirectUri: string): Promise<AuthConfig> {
    const verifier = await this.retrievePKCEVerifier(integrationId);
    
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.HONEYBOOK_CLIENT_ID!,
        client_secret: process.env.HONEYBOOK_CLIENT_SECRET!,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code_verifier: verifier
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Token exchange failed: ${errorBody}`);
    }

    const tokens = await response.json();
    
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_type: tokens.token_type,
      expires_at: Date.now() + (tokens.expires_in * 1000)
    };
  }

  async refreshAuth(authConfig: AuthConfig): Promise<AuthConfig> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.HONEYBOOK_CLIENT_ID!,
        client_secret: process.env.HONEYBOOK_CLIENT_SECRET!,
        refresh_token: authConfig.refresh_token,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();
    
    return {
      ...authConfig,
      access_token: tokens.access_token,
      expires_at: Date.now() + (tokens.expires_in * 1000)
    };
  }

  async testConnection(authConfig: AuthConfig): Promise<ConnectionTestResult> {
    try {
      const response = await this.makeRequest('/user/profile', authConfig);
      
      return {
        success: true,
        accountInfo: {
          accountName: response.business_name,
          userEmail: response.email,
          planType: response.plan_type || 'unknown'
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getAllClients(authConfig: AuthConfig): Promise<CRMClient[]> {
    const clients: CRMClient[] = [];
    let cursor = null;
    
    do {
      try {
        const queryParams = new URLSearchParams({
          limit: this.rateLimits.batchSize.toString(),
          include: 'contact_info,projects'
        });
        
        if (cursor) {
          queryParams.set('cursor', cursor);
        }

        const response = await this.makeRequest(`/contacts?${queryParams}`, authConfig);
        
        for (const honeyBookContact of response.data) {
          clients.push(this.transformHoneyBookClient(honeyBookContact));
        }

        cursor = response.pagination?.next_cursor;
        await this.rateLimitDelay();

      } catch (error) {
        console.error('HoneyBook API error:', error);
        throw error;
      }
    } while (cursor);

    return clients;
  }

  // Webhook handling for real-time updates
  async setupWebhooks(authConfig: AuthConfig, webhookUrl: string): Promise<void> {
    await this.makeRequest('/webhooks', authConfig, {
      method: 'POST',
      body: JSON.stringify({
        url: webhookUrl,
        events: ['contact.created', 'contact.updated', 'project.created', 'project.updated']
      }),
      headers: { 'Content-Type': 'application/json' }
    });
  }

  validateWebhook(payload: any, signature: string): boolean {
    const expectedSignature = createHmac('sha256', process.env.HONEYBOOK_WEBHOOK_SECRET!)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return signature === `sha256=${expectedSignature}`;
  }

  async processWebhook(payload: any): Promise<WebhookProcessResult> {
    const { event_type, data } = payload;
    
    switch (event_type) {
      case 'contact.created':
      case 'contact.updated':
        return {
          action: event_type.includes('created') ? 'create' : 'update',
          recordType: 'client',
          recordId: data.id,
          data: this.transformHoneyBookClient(data)
        };
      
      case 'project.created':
      case 'project.updated':
        return {
          action: event_type.includes('created') ? 'create' : 'update',
          recordType: 'project',
          recordId: data.id,
          data: data
        };
      
      default:
        return { action: 'ignore', recordType: 'unknown', recordId: null };
    }
  }

  private async makeRequest(endpoint: string, authConfig: AuthConfig, options: RequestInit = {}): Promise<any> {
    // Check if token needs refresh
    if (authConfig.expires_at && Date.now() >= authConfig.expires_at) {
      authConfig = await this.refreshAuth(authConfig);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${authConfig.access_token}`,
        'User-Agent': 'WedSync/1.0',
        ...options.headers
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HoneyBook API error (${response.status}): ${errorBody}`);
    }

    return response.json();
  }

  private transformHoneyBookClient(honeyBookClient: any): CRMClient {
    const contact = honeyBookClient.contact_info || {};
    const project = honeyBookClient.projects?.[0] || {};

    return {
      id: honeyBookClient.id,
      firstName: contact.first_name || '',
      lastName: contact.last_name || '', 
      email: contact.email || '',
      phone: contact.phone || undefined,
      weddingDate: project.event_date || undefined,
      partnerName: honeyBookClient.partner_name || undefined,
      venueInfo: project.venue ? {
        name: project.venue.name,
        address: project.venue.address,
        coordinator: project.venue.coordinator
      } : undefined,
      customFields: {
        honeyBookId: honeyBookClient.id,
        projectId: project.id,
        leadSource: honeyBookClient.lead_source,
        status: honeyBookClient.status
      },
      lastModified: new Date(honeyBookClient.updated_at),
      tags: honeyBookClient.tags || []
    };
  }

  private async storePKCEVerifier(integrationId: string, verifier: string): Promise<void> {
    // Store in Redis or temporary database table with expiration
    // Implementation depends on your caching strategy
  }

  private async retrievePKCEVerifier(integrationId: string): Promise<string> {
    // Retrieve from Redis or temporary storage
    // Implementation depends on your caching strategy
    return '';
  }

  private async rateLimitDelay(): Promise<void> {
    const delayMs = (60 * 1000) / (this.rateLimits.requestsPerMinute * 0.8);
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  getDefaultFieldMappings(): CRMFieldMapping[] {
    return [
      {
        wedsyncField: 'firstName',
        crmField: 'contact_info.first_name',
        fieldType: 'text',
        syncDirection: 'bidirectional',
        isRequired: true
      },
      {
        wedsyncField: 'lastName',
        crmField: 'contact_info.last_name', 
        fieldType: 'text',
        syncDirection: 'bidirectional',
        isRequired: true
      },
      {
        wedsyncField: 'email',
        crmField: 'contact_info.email',
        fieldType: 'email',
        syncDirection: 'bidirectional',
        isRequired: true
      },
      {
        wedsyncField: 'weddingDate',
        crmField: 'projects.0.event_date',
        fieldType: 'date',
        syncDirection: 'bidirectional',
        isRequired: false
      }
    ];
  }
}
```

#### 4. Light Blue Screen Scraping Provider
```typescript
// File: src/services/crm-providers/LightBlueCRMProvider.ts
import { CRMProviderInterface } from './CRMProviderInterface';
import { chromium } from 'playwright';

export class LightBlueCRMProvider implements CRMProviderInterface {
  readonly id = 'lightblue';
  readonly name = 'Light Blue';
  readonly authType = 'basic_auth';
  readonly rateLimits = {
    requestsPerMinute: 20, // Conservative for scraping
    requestsPerHour: 300,
    batchSize: 10
  };

  private baseUrl = 'https://app.lightblue.com';

  async testConnection(authConfig: AuthConfig): Promise<ConnectionTestResult> {
    const browser = await chromium.launch({ headless: true });
    
    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
      
      await page.goto(`${this.baseUrl}/login`);
      await page.fill('input[name="email"]', authConfig.username as string);
      await page.fill('input[name="password"]', authConfig.password as string);
      await page.click('button[type="submit"]');
      
      // Wait for successful login or error
      const result = await Promise.race([
        page.waitForURL('**/dashboard', { timeout: 10000 }).then(() => 'success'),
        page.waitForSelector('.error-message', { timeout: 10000 }).then(() => 'error')
      ]);

      if (result === 'success') {
        // Extract account information from dashboard
        const accountName = await page.textContent('[data-testid="account-name"]') || 'Unknown';
        
        return {
          success: true,
          accountInfo: {
            accountName,
            userEmail: authConfig.username as string,
            planType: 'unknown'
          }
        };
      } else {
        return {
          success: false,
          error: 'Invalid credentials'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    } finally {
      await browser.close();
    }
  }

  async getAllClients(authConfig: AuthConfig): Promise<CRMClient[]> {
    const browser = await chromium.launch({ headless: true });
    
    try {
      const page = await browser.newPage();
      await this.login(page, authConfig);
      
      // Navigate to clients page
      await page.goto(`${this.baseUrl}/clients`);
      await page.waitForLoadState('networkidle');
      
      const clients: CRMClient[] = [];
      let pageNum = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        // Extract client data from current page
        const pageClients = await page.evaluate(() => {
          const clientRows = document.querySelectorAll('[data-testid="client-row"]');
          
          return Array.from(clientRows).map(row => {
            const nameElement = row.querySelector('[data-testid="client-name"]');
            const emailElement = row.querySelector('[data-testid="client-email"]');
            const phoneElement = row.querySelector('[data-testid="client-phone"]');
            const weddingDateElement = row.querySelector('[data-testid="wedding-date"]');
            const venueElement = row.querySelector('[data-testid="venue-name"]');
            
            const fullName = nameElement?.textContent?.trim() || '';
            const [firstName = '', ...lastNameParts] = fullName.split(' ');
            const lastName = lastNameParts.join(' ');
            
            return {
              id: row.getAttribute('data-client-id') || '',
              firstName,
              lastName,
              email: emailElement?.textContent?.trim() || '',
              phone: phoneElement?.textContent?.trim() || undefined,
              weddingDate: weddingDateElement?.textContent?.trim() || undefined,
              venueInfo: venueElement?.textContent?.trim() ? {
                name: venueElement.textContent.trim(),
                address: '',
                coordinator: undefined
              } : undefined,
              customFields: {
                lightBlueId: row.getAttribute('data-client-id'),
                scraped: true
              },
              lastModified: new Date(), // Light Blue doesn't provide modification dates
              tags: []
            };
          });
        });
        
        clients.push(...pageClients.map(client => ({
          ...client,
          id: `lightblue_${client.id}` // Prefix to avoid ID conflicts
        })));
        
        // Check for next page
        const nextButton = page.locator('[data-testid="next-page"]');
        hasMorePages = await nextButton.isEnabled();
        
        if (hasMorePages) {
          await nextButton.click();
          await page.waitForLoadState('networkidle');
          pageNum++;
          
          // Rate limiting for scraping
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      return clients;
      
    } finally {
      await browser.close();
    }
  }

  async createClient(authConfig: AuthConfig, clientData: Partial<CRMClient>): Promise<string> {
    // Light Blue write operations would require form filling
    // This is read-only for now due to complexity of scraping forms
    throw new Error('Light Blue integration is read-only (no API available)');
  }

  async updateClient(authConfig: AuthConfig, clientId: string, clientData: Partial<CRMClient>): Promise<void> {
    throw new Error('Light Blue integration is read-only (no API available)');
  }

  private async login(page: any, authConfig: AuthConfig): Promise<void> {
    await page.goto(`${this.baseUrl}/login`);
    await page.fill('input[name="email"]', authConfig.username as string);
    await page.fill('input[name="password"]', authConfig.password as string);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  }

  getDefaultFieldMappings(): CRMFieldMapping[] {
    return [
      {
        wedsyncField: 'firstName',
        crmField: 'client_name_first',
        fieldType: 'text',
        syncDirection: 'import_only', // Read-only
        isRequired: true
      },
      {
        wedsyncField: 'lastName',
        crmField: 'client_name_last',
        fieldType: 'text',
        syncDirection: 'import_only',
        isRequired: true
      },
      {
        wedsyncField: 'email',
        crmField: 'client_email',
        fieldType: 'email',
        syncDirection: 'import_only',
        isRequired: true
      },
      {
        wedsyncField: 'phone',
        crmField: 'client_phone',
        fieldType: 'phone',
        syncDirection: 'import_only',
        isRequired: false
      },
      {
        wedsyncField: 'weddingDate',
        crmField: 'wedding_date',
        fieldType: 'date',
        syncDirection: 'import_only',
        isRequired: false
      }
    ];
  }
}
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### CRM Provider Implementations (PRIORITY 1)
- [ ] TaveCRMProvider with API key authentication
- [ ] HoneyBookCRMProvider with OAuth2 PKCE flow
- [ ] LightBlueCRMProvider with screen scraping
- [ ] Base CRMProviderInterface with unified contract
- [ ] Provider factory pattern for dynamic loading

### Authentication & Security (PRIORITY 2)
- [ ] OAuth2 PKCE flow implementation
- [ ] Secure credential handling and encryption
- [ ] Rate limiting per provider specifications
- [ ] Webhook signature validation
- [ ] Error handling with exponential backoff

### Data Integration (PRIORITY 3)
- [ ] Field mapping engine with transformations
- [ ] Duplicate detection and merging logic
- [ ] Data validation and sanitization
- [ ] Real-time webhook processing
- [ ] Sync conflict resolution

## 💾 WHERE TO SAVE YOUR WORK

**Provider Implementation Files:**
- `$WS_ROOT/wedsync/src/services/crm-providers/CRMProviderInterface.ts`
- `$WS_ROOT/wedsync/src/services/crm-providers/TaveCRMProvider.ts`
- `$WS_ROOT/wedsync/src/services/crm-providers/HoneyBookCRMProvider.ts`
- `$WS_ROOT/wedsync/src/services/crm-providers/LightBlueCRMProvider.ts`

**Integration Utilities:**
- `$WS_ROOT/wedsync/src/services/integrations/CRMProviderFactory.ts`
- `$WS_ROOT/wedsync/src/services/integrations/FieldMappingEngine.ts`
- `$WS_ROOT/wedsync/src/services/integrations/WebhookProcessor.ts`

**OAuth & Security:**
- `$WS_ROOT/wedsync/src/lib/oauth-utils.ts`
- `$WS_ROOT/wedsync/src/lib/crypto.ts`

**Webhook Endpoints:**
- `$WS_ROOT/wedsync/src/app/api/webhooks/crm/[provider]/route.ts`

## 🧪 TESTING REQUIREMENTS

### Integration Tests Required
```bash
# Test files to create:
$WS_ROOT/wedsync/src/services/crm-providers/__tests__/TaveCRMProvider.test.ts
$WS_ROOT/wedsync/src/services/crm-providers/__tests__/HoneyBookCRMProvider.test.ts
$WS_ROOT/wedsync/src/services/integrations/__tests__/FieldMappingEngine.test.ts
```

### Testing Scenarios
- [ ] Test connection with valid/invalid credentials
- [ ] OAuth2 flow complete cycle
- [ ] Client data retrieval with pagination
- [ ] Field mapping transformations
- [ ] Webhook signature validation
- [ ] Rate limiting compliance
- [ ] Error handling and recovery

## 🏁 COMPLETION CHECKLIST

### Provider Implementations
- [ ] All 3 priority providers implemented (Tave, HoneyBook, Light Blue)
- [ ] Unified CRMProviderInterface adhered to
- [ ] Rate limiting respected for each provider
- [ ] Error handling with appropriate retries
- [ ] Field mappings configured with defaults

### Security & Authentication
- [ ] OAuth2 PKCE flow working end-to-end
- [ ] Secure credential storage implemented
- [ ] Webhook signature validation working
- [ ] All API calls over HTTPS enforced
- [ ] Error messages don't leak sensitive data

### Data Integration
- [ ] Field mapping engine transforming data correctly
- [ ] Duplicate detection preventing data corruption
- [ ] Real-time webhooks processing updates
- [ ] Sync conflict resolution strategies implemented
- [ ] Data validation preventing bad imports

### Wedding Context
- [ ] Field mappings use wedding-specific terminology
- [ ] Error messages reference real wedding scenarios
- [ ] Provider selection shows photography/wedding focus
- [ ] Integration preserves wedding date relationships
- [ ] Guest list data handled appropriately

---

**EXECUTE IMMEDIATELY - Build the rock-solid CRM integration layer that wedding suppliers can trust with their precious client data!**