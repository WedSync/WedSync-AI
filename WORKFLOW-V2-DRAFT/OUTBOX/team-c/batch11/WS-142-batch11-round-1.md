# TEAM C - ROUND 1: WS-142 - Customer Success System - Core Integration Implementation

**Date:** 2025-08-24  
**Feature ID:** WS-142 (Track all work with this ID)
**Priority:** P0 from roadmap  
**Mission:** Implement customer health scoring, milestone tracking, and automated interventions  
**Context:** You are Team C working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer growing my business
**I want to:** Receive proactive guidance and support based on my usage patterns
**So that:** I can maximize the value from WedSync and avoid churning due to confusion or low adoption

**Real Wedding Problem This Solves:**
Sarah, a wedding photographer, signed up 2 weeks ago but has only imported 5 clients and created 1 form. The customer success system detects she's at risk based on low activity and sends her a personalized email with tips on importing her 2024 client list, plus offers a 15-minute setup call. This intervention increases her feature adoption by 300% and prevents churn.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification WS-142:**
- Health scores accurately reflect user engagement and feature adoption
- At-risk users receive proactive interventions within 24 hours  
- Milestone celebrations trigger immediately when achievements occur
- In-app coach appears contextually based on user state and current page
- Support call scheduling works for high-risk users
- Intervention emails are personalized with user's actual data

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED - Direct Supabase access available)
- Backend: Supabase (PostgreSQL 15), Edge Functions
- Testing: Playwright MCP, Vitest
- Integration: Email automation, analytics pipelines

**Integration Points:**
- Email Service: Automated intervention sequences
- Analytics: User behavior tracking for health scoring
- Billing: Trial and subscription data for success metrics
- Support: Schedule and manage success calls

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);

// 2. INTEGRATION PATTERN ANALYSIS:
await mcp__serena__search_for_pattern("email.*template.*service");
await mcp__serena__find_symbol("EmailService NotificationService", "", true);
await mcp__serena__get_symbols_overview("/src/lib/services");

// 3. CONTEXT7 MCP - Load latest docs for THIS SPECIFIC TASK:
await mcp__context7__resolve-library-id("supabase");
await mcp__context7__get-library-docs("/supabase/supabase", "database triggers functions", 3000);
await mcp__context7__get-library-docs("/sendgrid/sendgrid-node", "email automation", 2000);
await mcp__context7__get-library-docs("/vercel/next.js", "cron jobs scheduling", 2000);

// 4. HEALTH SCORING PATTERNS:
await mcp__serena__search_for_pattern("user.*activity.*tracking");
await mcp__serena__find_symbol("analytics tracking metrics", "", true);
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS

1. **task-tracker-coordinator** --think-hard "Track customer success system development"
2. **integration-specialist** --think-ultra-hard "Email automation and external service integration"
3. **analytics-engineer** --think-ultra-hard "Health scoring and user behavior analysis"
4. **automation-architect** --think-hard "Automated intervention system design"
5. **test-automation-architect** --tdd-approach "Customer success flow testing"
6. **code-quality-guardian** --match-codebase-style "Service integration patterns"

---

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### Core Integration Services:

#### 1. Health Scoring Engine
- [ ] **CustomerHealthService**: Calculate health scores from user activity
- [ ] **ActivityTracker**: Monitor feature adoption and usage patterns
- [ ] **RiskAssessment**: Identify at-risk users with declining engagement
- [ ] **MetricsAggregator**: Daily health score calculations and caching

#### 2. Milestone Tracking System  
- [ ] **MilestoneService**: Track and celebrate user achievements
- [ ] **ProgressMonitor**: Monitor user progress toward key milestones
- [ ] **CelebrationEngine**: Trigger milestone celebrations immediately
- [ ] **RewardManager**: Manage milestone rewards and benefits

#### 3. Automated Intervention System
- [ ] **InterventionEngine**: Execute automated success interventions
- [ ] **EmailAutomation**: Personalized intervention email sequences
- [ ] **TriggerManager**: Detect conditions requiring interventions
- [ ] **SchedulingService**: Schedule and manage success calls

#### 4. Integration Pipeline
- [ ] **DataSyncService**: Sync user data across systems for personalization
- [ ] **WebhookManager**: Handle external system webhooks and events
- [ ] **AnalyticsConnector**: Feed success metrics to analytics systems
- [ ] **NotificationService**: Multi-channel success notifications

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### API Route Security Checklist:
- [ ] **Zod validation on EVERY input** - Use withSecureValidation middleware
- [ ] **Authentication check** - getServerSession() for protected routes
- [ ] **Rate limiting applied** - Prevent success system abuse
- [ ] **PII protection** - Secure handling of customer success data
- [ ] **Email security** - Prevent intervention email spam
- [ ] **Data privacy** - GDPR compliant success communications

### Required Security Pattern:
```typescript
import { withSecureValidation } from '@/lib/validation/middleware';
import { z } from 'zod';
import { secureStringSchema } from '@/lib/validation/schemas';

const healthScoreSchema = z.object({
  supplierId: z.string().uuid(),
  timeRange: z.enum(['7d', '30d', '90d']).default('30d'),
  includeBreakdown: z.boolean().default(false)
});

export const GET = withSecureValidation(
  healthScoreSchema,
  async (request, validatedData) => {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Users can only access their own health scores
    if (session.user.id !== validatedData.supplierId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    const healthScore = await calculateHealthScore(validatedData.supplierId, validatedData.timeRange);
    return NextResponse.json(healthScore);
  }
);
```

---

## 🔗 DEPENDENCIES

### What you NEED from other teams:
- FROM Team A: UI components for in-app coach and milestone celebrations
- FROM Team B: User activity data and analytics events

### What other teams NEED from you:
- TO Team A: Health scoring APIs and intervention trigger data  
- TO Team D: Customer success data for marketing automation
- TO All Teams: Automated success intervention system

---

## 🎭 MCP SERVER USAGE

### Required MCP Servers:
- [ ] **PostgreSQL MCP**: Execute complex health scoring queries
- [ ] **Supabase MCP**: Configure database triggers for real-time milestone detection  
- [ ] **Context7 MCP**: Load current documentation for email automation services

### Health Scoring SQL Patterns:
```sql
-- Health score calculation (COPY THIS PATTERN):
WITH user_metrics AS (
  SELECT 
    s.id as supplier_id,
    COALESCE(EXTRACT(EPOCH FROM (NOW() - s.last_sign_in_at)) / 86400, 999) as days_since_login,
    COALESCE(feature_usage.adoption_rate, 0) as feature_adoption,
    COALESCE(client_stats.activity_rate, 0) as client_activity,
    COALESCE(form_stats.completion_rate, 0) as form_completion,
    COALESCE(journey_stats.performance, 0) as journey_performance
  FROM suppliers s
  LEFT JOIN (
    SELECT 
      supplier_id,
      COUNT(DISTINCT feature_name)::decimal / 4 as adoption_rate
    FROM supplier_feature_usage 
    WHERE feature_name IN ('forms_created', 'clients_imported', 'journeys_created', 'templates_used')
    GROUP BY supplier_id
  ) feature_usage ON s.id = feature_usage.supplier_id
  LEFT JOIN (
    SELECT 
      supplier_id,
      COUNT(CASE WHEN last_activity_at >= NOW() - INTERVAL '30 days' THEN 1 END)::decimal /
      NULLIF(COUNT(*), 0) as activity_rate
    FROM clients
    GROUP BY supplier_id
  ) client_stats ON s.id = client_stats.supplier_id
  WHERE s.id = $1
),
health_calculation AS (
  SELECT 
    supplier_id,
    CASE 
      WHEN days_since_login < 3 THEN 30
      WHEN days_since_login < 7 THEN 20
      WHEN days_since_login < 14 THEN 10
      WHEN days_since_login < 30 THEN 5
      ELSE 0
    END +
    LEAST(25, feature_adoption * 25) +
    LEAST(25, client_activity * 25) +
    LEAST(10, form_completion * 10) +
    LEAST(10, journey_performance * 10) as health_score
  FROM user_metrics
)
SELECT 
  health_score,
  CASE 
    WHEN health_score < 40 THEN 'critical'
    WHEN health_score < 70 THEN 'at_risk'
    ELSE 'healthy'
  END as risk_level
FROM health_calculation;
```

---

## 🎭 EMAIL AUTOMATION INTEGRATION

### Intervention Email Service:
```typescript
// src/lib/services/customer-success-service.ts
export class CustomerSuccessService {
  static async runDailyHealthCheck(): Promise<void> {
    const suppliers = await this.getAllActiveSuppliers();
    
    for (const supplier of suppliers) {
      try {
        const health = await this.calculateHealthScore(supplier.id);
        
        // Update health record
        await this.updateHealthRecord(supplier.id, health);
        
        // Check for intervention triggers
        if (health.risk === 'critical' || health.risk === 'at_risk') {
          await this.checkInterventionTriggers(supplier, health);
        }
        
        // Check milestone achievements
        await this.checkMilestoneProgress(supplier.id);
        
      } catch (error) {
        console.error(`Health check failed for supplier ${supplier.id}:`, error);
      }
    }
  }
  
  private static async checkInterventionTriggers(
    supplier: any, 
    health: HealthScore
  ): Promise<void> {
    const interventions = await this.getApplicableInterventions(supplier.id, health);
    
    for (const intervention of interventions) {
      // Check if recently sent to avoid spam
      const recentlySent = await this.hasRecentIntervention(
        supplier.id, 
        intervention.template,
        intervention.maxPerWeek || 1
      );
      
      if (!recentlySent) {
        await this.sendIntervention(supplier, intervention, health);
      }
    }
  }
  
  private static async sendIntervention(
    supplier: any,
    intervention: InterventionConfig,
    health: HealthScore
  ): Promise<void> {
    // Personalize intervention content
    const personalization = await this.gatherPersonalizationData(supplier.id);
    
    // Send via appropriate channel
    switch (intervention.channel) {
      case 'email':
        await this.sendInterventionEmail(supplier, intervention, personalization);
        break;
      case 'in_app':
        await this.triggerInAppNotification(supplier, intervention);
        break;
      case 'sms':
        await this.sendInterventionSMS(supplier, intervention, personalization);
        break;
    }
    
    // Track intervention
    await this.trackIntervention(supplier.id, intervention, health);
  }
}
```

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Services: `/wedsync/src/lib/services/customer-success-service.ts`
- Services: `/wedsync/src/lib/services/health-scoring-engine.ts`
- Services: `/wedsync/src/lib/services/milestone-tracking-service.ts`
- API Routes: `/wedsync/src/app/api/success/`, `/wedsync/src/app/api/health/`
- Database: `/wedsync/supabase/migrations/20250824200001_customer_success_system.sql`
- Tests: `/wedsync/src/__tests__/integration/customer-success.test.ts`

### Team Report:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-c/batch11/WS-142-round-1-complete.md`

---

## 🏁 ACCEPTANCE CRITERIA & EVIDENCE

### Technical Implementation Evidence:
- [ ] **Health scoring service** - Show health calculation working with test users
- [ ] **Milestone tracking** - Demonstrate milestone detection and celebration
- [ ] **Intervention system** - Show automated email sending with personalization
- [ ] **Integration pipeline** - Verify data flowing between systems
- [ ] **Security validation** - All APIs use withSecureValidation middleware

### Performance Requirements:
- [ ] **Health score calculation** - Under 200ms per user
- [ ] **Milestone detection** - Real-time triggers under 100ms
- [ ] **Intervention personalization** - Email generation under 500ms
- [ ] **Data sync** - Cross-system sync under 1s

### Code Quality Evidence:
```typescript
// Show integration service pattern compliance:
// File: src/lib/services/customer-success-service.ts:67-89
export class CustomerSuccessService {
  // Serena confirmed: Follows service pattern from analytics-service.ts:34-56
  static async calculateHealthScore(supplierId: string): Promise<HealthScore> {
    const metrics = await this.gatherHealthMetrics(supplierId);
    const score = this.computeHealthScore(metrics);
    
    // Cache result for performance
    await this.cacheHealthScore(supplierId, score);
    return score;
  }
}
```

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY