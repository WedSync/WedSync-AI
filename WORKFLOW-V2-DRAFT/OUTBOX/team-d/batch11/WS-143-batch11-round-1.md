# TEAM D - ROUND 1: WS-143 - Marketing Automation Engine - Core Campaign Implementation

**Date:** 2025-08-24  
**Feature ID:** WS-143 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Implement automated marketing campaigns and viral attribution system  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding supplier who wants to grow my client base
**I want to:** Automatically market to my existing clients to generate referrals and reviews
**So that:** I can leverage the viral loop where my clients invite other vendors, who then invite more couples

**Real Wedding Problem This Solves:**
Emma, a wedding photographer, just completed a wedding. The marketing automation system automatically sends a review request to the couple 3 days later, then follows up with a referral request offering £50 off their next session for each vendor they successfully refer. When Sarah (florist) gets invited by Emma's couple, she receives a personalized email showing the couple's wedding date and venue, making her 5x more likely to join than a cold outreach.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-143:**
- Viral coefficient tracking shows accurate invitation/conversion rates
- Supplier invitations include personalized wedding context (date, venue, couple names)
- Couple invitations highlight value proposition from their specific supplier
- Email sequences trigger correctly based on user actions and timing
- Attribution tracking works through multi-generation referral chains
- A/B testing framework allows testing different invitation templates

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Email: SendGrid integration, template management

**Integration Points:**
- Email Service: Multi-channel campaign delivery
- Analytics: Campaign performance tracking
- Customer Success: Feed attribution data for health scoring
- Viral System: Attribution events from viral invitations

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 2. EMAIL AND CAMPAIGN PATTERN ANALYSIS:
await mcp__serena__search_for_pattern("email.*template.*campaign");
await mcp__serena__find_symbol("EmailService CampaignManager", "", true);
await mcp__serena__get_symbols_overview("/src/lib/services");

// 3. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("sendgrid");
await mcp__context7__get-library-docs("/sendgrid/sendgrid-node", "marketing campaigns", 3000);
await mcp__context7__get-library-docs("/supabase/supabase", "database triggers", 2000);
await mcp__context7__get-library-docs("/vercel/next.js", "scheduled functions", 2000);

// 4. MARKETING AUTOMATION PATTERNS:
await mcp__serena__search_for_pattern("automation.*trigger.*sequence");
await mcp__serena__find_symbol("webhook.*handler", "", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Track marketing automation development"
2. **marketing-automation-specialist** --think-ultra-hard "Campaign automation and email sequences"
3. **attribution-architect** --think-ultra-hard "Viral attribution and tracking system"
4. **email-template-engineer** --think-hard "Dynamic email template system"
5. **test-automation-architect** --tdd-approach "Campaign flow testing"
6. **code-quality-guardian** --match-codebase-style "Marketing service patterns"

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Marketing Automation:

#### 1. Campaign Management System
- [ ] **CampaignManager**: Create and manage marketing campaigns
- [ ] **EmailSequenceEngine**: Automated email sequence execution
- [ ] **TriggerSystem**: Event-based campaign triggers
- [ ] **TemplateManager**: Dynamic email template management

#### 2. Attribution Tracking System
- [ ] **AttributionService**: Track referral chains and viral attribution
- [ ] **ConversionTracker**: Monitor campaign conversion rates
- [ ] **RevenueAttribution**: Calculate attributed revenue from campaigns
- [ ] **ViralChainAnalyzer**: Multi-generation referral analysis

#### 3. Automated Email Sequences
- [ ] **SupplierNurtureSequence**: Automated supplier onboarding and engagement
- [ ] **CoupleActivationSequence**: Couple engagement and wedding timeline emails
- [ ] **ReviewRequestSequence**: Post-wedding review and testimonial requests
- [ ] **ReferralCampaignSequence**: Referral generation and reward campaigns

#### 4. Personalization Engine
- [ ] **PersonalizationService**: Dynamic email content personalization
- [ ] **WeddingContextEngine**: Wedding-specific content insertion
- [ ] **UserSegmentation**: Behavioral segmentation for targeted campaigns
- [ ] **A/BTestingFramework**: Campaign variant testing system

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API Route Security Checklist:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - Prevent campaign spam and abuse
- [ ] **Email security** - Prevent unauthorized email sending
- [ ] **PII protection** - Secure handling of marketing data
- [ ] **Unsubscribe compliance** - GDPR/CAN-SPAM compliance

### Required Security Pattern:
```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema, emailSchema } from '@/lib/validation/schemas';

const campaignTriggerSchema = z.object({
  eventType: z.enum(['supplier_signup', 'wedding_completed', 'form_submitted']),
  userId: z.string().uuid(),
  userType: z.enum(['supplier', 'couple']),
  metadata: z.object({
    weddingDate: z.string().date().optional(),
    venue: secureStringSchema.max(200).optional(),
    supplierType: z.enum(['photographer', 'florist', 'caterer', 'dj', 'venue']).optional()
  }).optional()
});

export const POST = withSecureValidation(
  campaignTriggerSchema,
  async (request, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Rate limiting for campaign triggers
    const rateLimitResult = await rateLimitService.checkCampaignTriggers(session.user.id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({ error: 'Campaign rate limit exceeded' }, { status: 429 });
    }
    
    // Process campaign trigger
    const result = await MarketingAutomationService.triggerCampaign(validatedData);
    return NextResponse.json(result);
  }
);
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team B: Viral invitation data and attribution events
- FROM Team C: Customer success scores for campaign targeting

### What other teams NEED from you:
- TO Team A: Campaign performance data for dashboard display
- TO Team C: Attribution events for customer success scoring
- TO All Teams: Marketing campaign system for user engagement

---

## 🎭 MCP SERVER USAGE

### Required MCP Servers:
- [ ] **PostgreSQL MCP**: Execute campaign performance queries and attribution analysis
- [ ] **Supabase MCP**: Configure database triggers for real-time campaign events
- [ ] **Context7 MCP**: Load current SendGrid and email automation documentation

### Attribution Tracking SQL Patterns:
```sql
-- Attribution chain analysis (COPY THIS PATTERN):
WITH RECURSIVE attribution_chain AS (
  -- Base case: original users (no referrer)
  SELECT 
    user_id,
    user_type,
    source,
    referrer_id,
    1 as generation,
    ARRAY[user_id] as chain_path,
    user_id::text as root_user
  FROM attribution 
  WHERE referrer_id IS NULL
  
  UNION ALL
  
  -- Recursive case: referred users
  SELECT 
    a.user_id,
    a.user_type,
    a.source,
    a.referrer_id,
    ac.generation + 1,
    ac.chain_path || a.user_id,
    ac.root_user
  FROM attribution a
  INNER JOIN attribution_chain ac ON a.referrer_id = ac.user_id
  WHERE ac.generation < 10 -- Prevent infinite recursion
),
viral_metrics AS (
  SELECT 
    root_user,
    COUNT(*) as total_referrals,
    MAX(generation) as max_depth,
    SUM(CASE WHEN converted THEN conversion_value_cents ELSE 0 END) as total_attributed_revenue
  FROM attribution_chain ac
  LEFT JOIN attribution a ON ac.user_id = a.user_id
  GROUP BY root_user
)
SELECT 
  vm.root_user,
  vm.total_referrals,
  vm.max_depth as viral_depth,
  vm.total_attributed_revenue / 100.0 as attributed_revenue_dollars,
  ROUND(vm.total_referrals::decimal / GREATEST(vm.max_depth, 1), 2) as viral_coefficient
FROM viral_metrics vm
WHERE vm.total_referrals >= 1
ORDER BY vm.total_attributed_revenue DESC
LIMIT 100;
```

---

## 🎭 EMAIL AUTOMATION IMPLEMENTATION

### Marketing Automation Service:
```typescript
// src/lib/services/marketing-automation-service.ts
export class MarketingAutomationService {
  static async triggerAutomatedSequence(
    eventType: 'supplier_signup' | 'wedding_completed' | 'couple_signup',
    userId: string,
    metadata: Record<string, any>
  ): Promise<void> {
    // Get applicable campaigns for this trigger
    const campaigns = await this.getActiveCampaigns(eventType);
    
    for (const campaign of campaigns) {
      // Check if user matches campaign filters
      if (await this.userMatchesFilters(userId, campaign.filters)) {
        await this.scheduleCampaignSequence(campaign.id, userId, metadata);
      }
    }
  }
  
  static async processViralInvitation(
    actorId: string,
    recipientEmail: string,
    weddingContext: WeddingContext
  ): Promise<string> {
    // Generate personalized viral invitation
    const inviteCode = crypto.randomUUID();
    
    // Create personalized email content
    const personalization = await this.gatherPersonalizationData(actorId, weddingContext);
    
    // Select email template based on relationship type
    const template = await this.selectOptimalTemplate(
      personalization.relationship,
      personalization.recipientType
    );
    
    // Track viral action for attribution
    await this.trackViralInvitation(actorId, recipientEmail, inviteCode, weddingContext);
    
    // Send personalized invitation
    await this.sendViralInvitation(recipientEmail, template, personalization, inviteCode);
    
    return inviteCode;
  }
  
  private static async gatherPersonalizationData(
    actorId: string, 
    weddingContext: WeddingContext
  ): Promise<PersonalizationData> {
    const actor = await this.getUserData(actorId);
    
    return {
      actorName: actor.first_name,
      businessName: actor.business_name,
      supplierType: actor.supplier_type,
      coupleName: weddingContext.coupleName,
      weddingDate: weddingContext.weddingDate,
      venue: weddingContext.venue,
      daysUntilWedding: this.calculateDaysUntilWedding(weddingContext.weddingDate),
      relationship: this.determineRelationship(actor, weddingContext),
      valueProposition: this.generateValueProposition(actor.supplier_type)
    };
  }
  
  private static generateValueProposition(supplierType: string): string[] {
    const valueProps: Record<string, string[]> = {
      photographer: [
        'Professional wedding photography with 2,847+ couples served',
        'Seamless photo sharing and timeline coordination',
        'Free client management tools worth $200/month'
      ],
      florist: [
        'Connect with couples who love your floral designs',
        'Streamlined wedding day coordination with all vendors',
        'Automated client communication saves 10+ hours per wedding'
      ],
      venue: [
        'Coordinate with all wedding vendors in one platform',
        'Reduce venue coordination calls by 80%',
        'Premium vendor network for guest referrals'
      ],
      caterer: [
        'Menu planning and dietary restriction management',
        'Seamless coordination with venue and other vendors',
        'Automated guest count updates for accurate planning'
      ]
    };
    
    return valueProps[supplierType] || [
      'Streamlined wedding vendor coordination',
      'Professional tools for wedding planning',
      'Join 15,000+ wedding professionals'
    ];
  }
}
```

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Services: `/wedsync/src/lib/services/marketing-automation-service.ts`
- Services: `/wedsync/src/lib/services/email-personalization-engine.ts`
- Services: `/wedsync/src/lib/services/attribution-tracking-service.ts`
- API Routes: `/wedsync/src/app/api/marketing/`
- Database: `/wedsync/supabase/migrations/20250824190001_marketing_automation_system.sql`
- Templates: `/wedsync/src/templates/marketing/`
- Tests: `/wedsync/src/__tests__/integration/marketing-automation.test.ts`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch11/WS-143-round-1-complete.md`

---

## 🏁 ACCEPTANCE CRITERIA & EVIDENCE

### Technical Implementation Evidence:
- [ ] **Campaign management** - Show campaign creation and execution working
- [ ] **Attribution tracking** - Demonstrate multi-generation referral chains
- [ ] **Email personalization** - Show dynamic content based on wedding context
- [ ] **Automated sequences** - Verify trigger-based email campaigns
- [ ] **Security validation** - All APIs use withSecureValidation middleware

### Performance Requirements:
- [ ] **Campaign trigger processing** - Under 200ms per trigger
- [ ] **Email personalization** - Template rendering under 300ms
- [ ] **Attribution calculation** - Complex chains resolved under 500ms
- [ ] **A/B test selection** - Variant selection under 50ms

### Code Quality Evidence:
```typescript
// Show marketing automation pattern compliance:
// File: src/lib/services/marketing-automation-service.ts:45-67
export class MarketingAutomationService {
  // Serena confirmed: Follows service pattern from customer-success-service.ts:89-112
  static async triggerAutomatedSequence(eventType: string, userId: string): Promise<void> {
    const campaigns = await this.getActiveCampaigns(eventType);
    
    // Process campaigns with error handling
    for (const campaign of campaigns) {
      await this.executeCampaignWithTracking(campaign, userId);
    }
  }
}
```

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY