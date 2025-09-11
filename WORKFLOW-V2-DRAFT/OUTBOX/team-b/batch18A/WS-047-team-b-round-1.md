# TEAM B - ROUND 1: WS-047 - Review Collection System - Backend APIs & Database

**Date:** 2025-01-20  
**Feature ID:** WS-047 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build the backend infrastructure and APIs for automated review collection campaigns  
**Context:** You are Team B working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer who just completed a wedding
**I want to:** Automatically collect reviews 10 days post-wedding when couples are happiest
**So that:** I get 67% more bookings from online reviews instead of manually chasing testimonials for months

**Real Wedding Problem This Solves:**
The system automatically schedules review requests based on wedding completion dates and sentiment analysis. When Emma & Mike's wedding photos are delivered and they've interacted positively with the supplier's journey system, an automated review request is triggered with optimal timing for maximum response rates.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Core SAAS backend for automated review collection - helps suppliers grow their business through authentic testimonials from happy couples. This is about showcasing completed wedding success stories, not generating leads.

**Technology Stack (VERIFIED):**
- Backend: Next.js 15 API Routes, Supabase Edge Functions
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Queue: Supabase cron jobs for scheduling
- Email: Integration with existing email service
- Testing: Vitest, Playwright MCP

**Integration Points:**
- Couples Database: Wedding dates and contact info
- Email Service: Automated review requests
- Platform APIs: Google Business, Facebook integrations
- Analytics: Review performance tracking

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

```typescript
// 1. REF MCP - Load latest docs for THIS SPECIFIC TASK:
# Use Ref MCP to search for:
# - "Next.js 15 API routes server actions"
# - "Supabase database functions RLS security"
# - "Supabase cron jobs scheduling"
# - "Google Business Profile API integration"
# - "PostgreSQL JSON operations advanced"

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing API patterns:
await mcp__serena__find_symbol("route.ts", "", true);
await mcp__serena__get_symbols_overview("src/app/api");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Review collection backend APIs"
2. **nextjs-fullstack-developer** --think-hard --use-loaded-docs "API routes with validation"
3. **database-mcp-specialist** --think-ultra-hard --follow-existing-patterns "Review collection schema" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **api-architect** --comprehensive-api-design --use-openapi-patterns
6. **test-automation-architect** --tdd-approach --api-testing-focus
7. **integration-specialist** --external-apis --platform-integrations

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Database Schema (CRITICAL FOUNDATION):
- [ ] **Create migration:** `/wedsync/supabase/migrations/[timestamp]_review_collection_system.sql`

```sql
-- Review Campaigns table
CREATE TABLE IF NOT EXISTS review_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  name VARCHAR(100) NOT NULL,
  trigger_days_after_wedding INTEGER DEFAULT 10,
  secondary_trigger_days INTEGER, -- After gallery delivery
  message_template TEXT NOT NULL,
  incentive_type VARCHAR(20), -- 'discount', 'credit', 'gift', 'none'
  incentive_value DECIMAL(10,2),
  target_platforms TEXT[] DEFAULT '{google,facebook,internal}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Review Requests table  
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES review_campaigns(id),
  couple_id UUID NOT NULL REFERENCES couples(id),
  wedding_date DATE NOT NULL,
  request_token VARCHAR(64) UNIQUE NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  responded_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'completed', 'expired')),
  platform_preference VARCHAR(20),
  sentiment_score DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collected Reviews table
CREATE TABLE IF NOT EXISTS collected_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES review_requests(id),
  platform VARCHAR(20) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  reviewer_name VARCHAR(100),
  reviewer_email VARCHAR(255),
  photos TEXT[],
  is_verified BOOLEAN DEFAULT FALSE,
  external_review_id VARCHAR(100),
  external_review_url TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  response_text TEXT,
  response_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### API Endpoints to Build:
- [ ] **POST** `/api/reviews/campaigns` - Create review campaign
- [ ] **GET** `/api/reviews/campaigns/[supplierId]` - List supplier campaigns  
- [ ] **PUT** `/api/reviews/campaigns/[id]` - Update campaign
- [ ] **POST** `/api/reviews/request/send` - Send review request
- [ ] **GET** `/api/reviews/request/[token]` - Get review form data
- [ ] **POST** `/api/reviews/collect` - Submit review
- [ ] **GET** `/api/reviews/analytics/[campaignId]` - Get campaign analytics

### Core Backend Services:
- [ ] **ReviewEngine** - `/src/lib/reviews/review-engine.ts`
  - Campaign scheduling logic
  - Sentiment analysis integration
  - Automated request sending

- [ ] **PlatformIntegrations** - `/src/lib/reviews/platform-integrations.ts`
  - Google Business API integration
  - Facebook Graph API integration
  - Review submission handlers

### Validation Schemas:
- [ ] Add to `/src/lib/validation/schemas.ts`:
  - `reviewCampaignSchema`
  - `reviewRequestSchema`  
  - `reviewSubmissionSchema`

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: Form validation requirements - For API input validation
- FROM Team C: Email template format - For review request emails
- FROM Team D: WedMe integration points - For couple engagement data

### What other teams NEED from you:
- TO Team A: API endpoint contracts - Required for form submissions
- TO Team C: Webhook endpoints - For platform integrations
- TO Team E: API test fixtures - For E2E testing
- TO All Teams: Database schema completion - Blocking dependency

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

### MANDATORY SECURITY IMPLEMENTATION FOR ALL API ROUTES

```typescript
// ✅ ALWAYS DO THIS (MANDATORY PATTERN):
import { withSecureValidation } from '@/lib/validation/middleware';
import { reviewCampaignSchema } from '@/lib/validation/schemas';

export const POST = withSecureValidation(
  reviewCampaignSchema.extend({
    supplier_id: z.string().uuid()
  }),
  async (request, validatedData) => {
    // Verify supplier ownership
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id')
      .eq('id', validatedData.supplier_id)
      .eq('user_id', request.userId)
      .single();
      
    if (!supplier) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 403 }
      );
    }
    
    // Implementation with validated data
  }
);
```

### SECURITY CHECKLIST FOR ALL ENDPOINTS:
- [ ] Authentication middleware on all routes
- [ ] Input validation with Zod schemas - MANDATORY
- [ ] Rate limiting on email sending endpoints
- [ ] CSRF protection on state-changing operations
- [ ] Encrypt platform API credentials in database
- [ ] Validate review tokens with expiration
- [ ] Sanitize all review content before storage
- [ ] Audit logging for review submissions

---

## ⚠️ DATABASE MIGRATION PROTOCOL (CRITICAL)

```markdown
⚠️ DATABASE MIGRATION HANDOVER:
1. CREATE migration files but DO NOT APPLY them
2. Migration file: /wedsync/supabase/migrations/[timestamp]_review_collection_system.sql
3. SEND migration request to SQL Expert inbox
4. SQL Expert handles ALL migration application

HANDOVER REQUIREMENT:
- Create file: /WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-047.md
- Include: migration file path, dependencies, RLS policies
- SQL Expert will validate and apply safely
```

---

## 🎭 API TESTING WITH PLAYWRIGHT MCP (MANDATORY)

```javascript
// 1. API ENDPOINT TESTING
test('Review campaign CRUD operations', async () => {
  // Create campaign
  const createResponse = await request.post('/api/reviews/campaigns', {
    data: {
      name: 'Post-Wedding Reviews',
      trigger_days_after_wedding: 10,
      message_template: 'Hi {couple_names}! How was your wedding?',
      target_platforms: ['google', 'internal']
    }
  });
  expect(createResponse.ok()).toBeTruthy();
  
  // Get campaigns
  const getResponse = await request.get('/api/reviews/campaigns/supplier-123');
  expect(getResponse.ok()).toBeTruthy();
  
  // Send review request
  const sendResponse = await request.post('/api/reviews/request/send', {
    data: {
      campaignId: campaignId,
      coupleId: 'couple-123'
    }
  });
  expect(sendResponse.ok()).toBeTruthy();
});

// 2. PLATFORM INTEGRATION TESTING
test('External platform integrations', async () => {
  // Mock Google Business API
  // Test review submission to multiple platforms
  // Verify error handling for API failures
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

### Technical Implementation:
- [ ] All database migrations created and validated
- [ ] All API endpoints complete with proper validation
- [ ] Review engine scheduling logic working
- [ ] Platform integrations functional
- [ ] Tests written FIRST and passing (>80% coverage)

### Security & Performance:
- [ ] All endpoints use validation middleware
- [ ] Rate limiting implemented
- [ ] Platform credentials encrypted
- [ ] API responses <500ms
- [ ] Review tokens expire properly (30 days)

### Evidence Package Required:
- [ ] Postman/API test results
- [ ] Database migration validation
- [ ] Platform integration test results
- [ ] Security audit compliance
- [ ] Performance benchmarks

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Backend: `/wedsync/src/app/api/reviews/`
- Services: `/wedsync/src/lib/reviews/`
- Types: `/wedsync/src/types/reviews.ts`
- Tests: `/wedsync/tests/api/reviews/`
- Migrations: `/wedsync/supabase/migrations/`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-b/batch18A/WS-047-team-b-round-1-complete.md`
- **Migration request:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-047.md`

---

**END OF ROUND PROMPT - EXECUTE IMMEDIATELY**