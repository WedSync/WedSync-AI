# TEAM C - ROUND 1: WS-047 - Review Collection System - Platform Integrations & Email Service

**Date:** 2025-01-20  
**Feature ID:** WS-047 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build platform integrations and email automation for review collection system  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer who just completed a wedding
**I want to:** Automatically collect reviews 10 days post-wedding when couples are happiest
**So that:** I get 67% more bookings from online reviews instead of manually chasing testimonials for months

**Real Wedding Problem This Solves:**
When the system determines optimal timing (based on photo delivery completion and positive couple interactions), it automatically sends personalized review requests via email that route couples to the right platform (Google Business, Facebook, or internal review system) with one-click submission.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Integration layer for external review platforms and automated email campaigns. This is core SAAS functionality helping suppliers showcase their work to attract new couples through authentic testimonials.

**Technology Stack (VERIFIED):**
- Integration: Google Business Profile API, Facebook Graph API
- Email: Existing email service integration
- Queue: Supabase Edge Functions with cron triggers
- Storage: Encrypted credential storage
- Testing: Playwright MCP, API testing tools

**Integration Points:**
- Email Service: Automated review request campaigns
- Google Business: Direct review posting
- Facebook Pages: Social proof reviews
- Webhook System: Platform response handling

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. REF MCP - Load latest docs for THIS SPECIFIC TASK:
# Use Ref MCP to search for:
# - "Google Business Profile API reviews"
# - "Facebook Graph API page reviews"
# - "Email automation templates personalization"
# - "Supabase Edge Functions webhooks"
# - "OAuth 2.0 integration patterns"

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing integration patterns:
await mcp__serena__find_symbol("webhook", "", true);
await mcp__serena__get_symbols_overview("src/lib/services");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Review platform integrations"
2. **integration-specialist** --think-hard --use-loaded-docs "Third-party API integrations"
3. **api-architect** --think-ultra-hard --follow-existing-patterns "Webhook and OAuth systems" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --integration-testing --external-api-mocking
6. **devops-sre-engineer** --reliability-focus --error-handling-strategies
7. **performance-optimization-expert** --api-optimization --rate-limiting

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Email Integration System:
- [ ] **ReviewEmailService** - `/src/lib/reviews/email-service.ts`
  - Automated email scheduling
  - Personalized message templates
  - Email tracking and analytics
  - Unsubscribe handling

- [ ] **Email Templates** - `/src/lib/reviews/templates/`
  - Review request email template
  - Thank you email template
  - Follow-up reminder template
  - HTML and plain text versions

### Platform Integration Services:
- [ ] **GoogleBusinessIntegration** - `/src/lib/reviews/integrations/google-business.ts`
  - OAuth 2.0 authentication flow
  - Review submission to Google Business Profile
  - Business profile verification
  - Error handling and retries

- [ ] **FacebookIntegration** - `/src/lib/reviews/integrations/facebook.ts`
  - Facebook App authentication
  - Page review posting
  - Page permissions validation
  - Rate limiting compliance

- [ ] **PlatformManager** - `/src/lib/reviews/platform-manager.ts`
  - Unified platform interface
  - Credential management
  - Platform status monitoring
  - Automatic failover handling

### Webhook System:
- [ ] **POST** `/api/reviews/webhooks/google` - Google Business webhook handler
- [ ] **POST** `/api/reviews/webhooks/facebook` - Facebook webhook handler
- [ ] **POST** `/api/reviews/webhooks/email` - Email delivery status webhook

### Automation Engine:
- [ ] **ReviewScheduler** - `/src/lib/reviews/scheduler.ts`
  - Cron job management for review requests
  - Sentiment-based timing optimization
  - Retry logic for failed sends
  - Performance monitoring

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Review campaigns database schema - Required for integration
- FROM Team B: API endpoints for review submission - For platform posting
- FROM Team A: UI component requirements - For OAuth flow interfaces

### What other teams NEED from you:
- TO Team A: Platform connection status API - For UI status indicators
- TO Team B: Webhook endpoint specifications - For API integration
- TO Team D: Email template API - For WedMe review requests
- TO Team E: Integration test data - For E2E platform testing

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### CRITICAL SECURITY FOR PLATFORM INTEGRATIONS

```typescript
// ✅ SECURE CREDENTIAL STORAGE (MANDATORY):
import { encrypt, decrypt } from '@/lib/security/encryption';

export async function storeGoogleCredentials(supplierId: string, credentials: GoogleCredentials) {
  const encryptedCredentials = await encrypt(JSON.stringify(credentials));
  
  const { error } = await supabase
    .from('platform_integrations')
    .upsert({
      supplier_id: supplierId,
      platform: 'google',
      api_credentials: encryptedCredentials,
      is_active: true
    });
    
  if (error) throw error;
}

// ✅ SECURE WEBHOOK VALIDATION (MANDATORY):
export async function validateGoogleWebhook(signature: string, body: string) {
  const expectedSignature = crypto
    .createHmac('sha256', process.env.GOOGLE_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
    
  if (!crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  )) {
    throw new Error('Invalid webhook signature');
  }
}
```

### SECURITY CHECKLIST FOR ALL INTEGRATIONS:
- [ ] OAuth 2.0 flows with PKCE for public clients
- [ ] API credentials encrypted at rest in database
- [ ] Webhook signature validation for all platforms
- [ ] Rate limiting on all external API calls
- [ ] HTTPS-only for all OAuth redirects
- [ ] Secure token refresh handling
- [ ] Audit logging for all platform interactions
- [ ] Error messages don't expose credentials

---

## 🎭 INTEGRATION TESTING WITH PLAYWRIGHT MCP (MANDATORY)

```javascript
// 1. GOOGLE BUSINESS INTEGRATION TESTING
test('Google Business Profile integration flow', async () => {
  // Test OAuth flow
  await mcp__playwright__browser_navigate({url: '/reviews/platforms/google/connect'});
  await mcp__playwright__browser_click({element: 'Connect Google Business', ref: 'button[data-platform="google"]'});
  
  // Mock Google OAuth response
  await mcp__playwright__browser_wait_for({text: 'Connected successfully'});
  
  // Test review submission
  const reviewSubmission = await request.post('/api/reviews/platforms/google/submit', {
    data: {
      businessId: 'test-business-123',
      review: {
        rating: 5,
        text: 'Amazing photographer!',
        reviewer: 'Sarah Johnson'
      }
    }
  });
  expect(reviewSubmission.ok()).toBeTruthy();
});

// 2. EMAIL AUTOMATION TESTING
test('Review request email automation', async () => {
  // Trigger review request
  await request.post('/api/reviews/request/send', {
    data: {
      campaignId: 'campaign-123',
      coupleId: 'couple-456'
    }
  });
  
  // Verify email sent
  // Check email tracking
  // Test unsubscribe flow
});

// 3. WEBHOOK HANDLING
test('Platform webhook processing', async () => {
  // Send mock Google webhook
  const webhookResponse = await request.post('/api/reviews/webhooks/google', {
    data: mockGoogleWebhookPayload,
    headers: {
      'X-Google-Signature': 'valid-signature'
    }
  });
  expect(webhookResponse.ok()).toBeTruthy();
});
```

---

## 🚨 OAUTH & API INTEGRATION PATTERNS

### Google Business Profile Integration:
```typescript
// OAuth 2.0 Flow Implementation
export class GoogleBusinessIntegration {
  async initiateOAuth(supplierId: string): Promise<string> {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', `${process.env.APP_URL}/api/oauth/google/callback`);
    authUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/business.manage');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', supplierId);
    
    return authUrl.toString();
  }
  
  async handleCallback(code: string, state: string): Promise<void> {
    // Exchange code for tokens
    // Store encrypted credentials
    // Verify business profile access
  }
  
  async submitReview(businessId: string, reviewData: ReviewData): Promise<void> {
    // Submit review to Google Business Profile
    // Handle API errors and rate limits
    // Log success/failure
  }
}
```

### Email Template System:
```typescript
export class ReviewEmailService {
  async sendReviewRequest(requestId: string): Promise<boolean> {
    const request = await this.getRequestData(requestId);
    
    const emailContent = this.renderTemplate('review-request', {
      coupleNames: request.couple.names,
      supplierName: request.supplier.business_name,
      weddingDate: request.wedding_date,
      reviewUrl: `${process.env.APP_URL}/review/${request.token}`,
      unsubscribeUrl: `${process.env.APP_URL}/unsubscribe/${request.token}`
    });
    
    return await this.sendEmail({
      to: request.couple.email,
      subject: `How was your wedding with ${request.supplier.business_name}?`,
      html: emailContent.html,
      text: emailContent.text
    });
  }
}
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] Google Business Profile integration working end-to-end
- [ ] Facebook page integration functional
- [ ] Email automation sending personalized requests
- [ ] Webhook handlers processing platform responses
- [ ] OAuth flows secure and user-friendly

### Security & Performance:
- [ ] All API credentials encrypted at rest
- [ ] Webhook signatures validated
- [ ] Rate limiting implemented for all platforms
- [ ] Error handling graceful with no credential exposure
- [ ] Integration tests covering all external APIs

### Evidence Package Required:
- [ ] Live integration test with Google Business (sandbox)
- [ ] Facebook integration test results
- [ ] Email delivery confirmations
- [ ] Webhook processing logs
- [ ] Security audit of credential handling

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Integrations: `/wedsync/src/lib/reviews/integrations/`
- Email Service: `/wedsync/src/lib/reviews/email-service.ts`
- Templates: `/wedsync/src/lib/reviews/templates/`
- Webhooks: `/wedsync/src/app/api/reviews/webhooks/`
- Tests: `/wedsync/tests/integrations/reviews/`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch18A/WS-047-team-c-round-1-complete.md`

---

**END OF ROUND PROMPT - EXECUTE IMMEDIATELY**