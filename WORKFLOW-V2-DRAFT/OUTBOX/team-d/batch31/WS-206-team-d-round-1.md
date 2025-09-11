# TEAM D - ROUND 1: WS-206 - AI Email Templates System - AI Integration & Template Engine

**Date:** 2025-08-28  
**Feature ID:** WS-206 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build AI-powered email template generation system with personalization engine  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding photographer who sends 50+ emails per week to couples
**I want to:** Generate professional, personalized email templates instantly for each stage of the wedding journey
**So that:** I can respond to inquiries in 2 minutes instead of 20 minutes, saving 15 hours per week on email writing

**Real Wedding Problem This Solves:**
A photographer receives an inquiry at 9pm about a beach wedding. Instead of spending 20 minutes crafting a perfect response, they select "inquiry stage, outdoor venue, friendly tone" and the AI generates 5 personalized email variants mentioning their beach wedding experience, asking about the couple's vision, and including relevant portfolio links. They pick the best variant, tweak one sentence, and send. Total time: 2 minutes. Without this, they'd either send a generic template that converts poorly or spend valuable evening time writing custom emails.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Build AI email template generation system including:
- AI-powered template generator with wedding context awareness
- Email personalization engine with merge tag processing
- Template variant generation (5+ options per request)
- Wedding-specific content adaptation (venue types, seasons, styles)
- Integration with existing email communication system

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- AI: OpenAI GPT-4, custom wedding industry prompts
- Backend: Supabase Edge Functions for AI processing
- Email: Integration with existing communication system
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Email System: Integration with existing EmailComposer component
- AI Infrastructure: OpenAI API integration and prompt engineering
- User Data: Access to supplier profiles and wedding context
- Template Storage: Generated templates persistence

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "OpenAI API integration Next.js"
// - "AI prompt engineering best practices"
// - "Supabase edge functions AI"

// For this specific feature, also search:
// - "Email template generation AI patterns"
// - "Personalization engine implementation"
// - "Merge tag processing systems"

// 2. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 3. REVIEW existing patterns:
await mcp__serena__find_symbol("EmailComposer", "", true);
await mcp__serena__get_symbols_overview("/src/components/communications");
await mcp__serena__get_symbols_overview("/src/lib/ai");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "AI email template generation system"
2. **ai-ml-engineer** --think-hard --use-loaded-docs "AI-powered content generation and personalization"
3. **openai-ai-specialist** --think-ultra-hard --follow-existing-patterns "GPT-4 integration and prompt engineering" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **integration-specialist** --think-hard --third-party-ai-apis
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Focus on wedding industry-specific AI prompt engineering and personalization."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] EmailTemplateGenerator service with OpenAI integration
- [ ] Wedding-specific AI prompt templates for different scenarios
- [ ] PersonalizationEngine for merge tag processing
- [ ] Template variant generation system (5+ variants per request)
- [ ] AI response validation and quality scoring
- [ ] Integration with existing email communication system
- [ ] Unit tests with >80% coverage including AI mocking
- [ ] Edge Function deployment for AI processing

### What other teams NEED from you:
- TO Team A: AI template generation API specifications
- TO Team E: Generated template testing scenarios

### What you NEED from other teams:
- FROM Team A: Frontend requirements for template selection UI
- FROM Team E: Email system integration patterns and requirements

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ MANDATORY SECURITY PATTERN for AI API calls:
import { validateApiKey, rateLimitAiRequests } from '@/lib/security/ai-security';
import { sanitizeTemplateData } from '@/lib/security/input-validation';

export class SecureEmailTemplateGenerator {
  async generateTemplate(
    context: EmailContext,
    userId: string
  ): Promise<EmailTemplate[]> {
    // 1. Rate limit AI requests per user
    await rateLimitAiRequests(userId, 'email_template', 10); // Max 10/hour
    
    // 2. Sanitize input data
    const sanitizedContext = sanitizeTemplateData(context);
    
    // 3. Validate user permissions
    if (!await canGenerateTemplates(userId)) {
      throw new Error('Insufficient permissions for AI template generation');
    }
    
    // 4. Generate with audit logging
    await this.logAiRequest(userId, 'email_template', sanitizedContext);
    return await this.callAiService(sanitizedContext);
  }
  
  private async callAiService(context: EmailContext) {
    // Secure API call with timeout and error handling
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: await this.buildWeddingPrompt(context),
        max_tokens: 800,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(30000) // 30s timeout
    });
    
    if (!response.ok) {
      throw new Error(`AI API error: ${response.status}`);
    }
    
    return await response.json();
  }
}

// ✅ ALWAYS validate and sanitize AI-generated content
const validateAiResponse = (generatedContent: string) => {
  // Check for inappropriate content
  // Validate template structure
  // Ensure no sensitive data exposure
  return sanitizedContent;
};
```

**SECURITY CHECKLIST:**
- [ ] **API Key Security**: Never expose OpenAI API keys to frontend
- [ ] **Rate Limiting**: Limit AI requests to prevent cost abuse (10/hour per user)
- [ ] **Input Sanitization**: Sanitize all user data before sending to AI
- [ ] **Output Validation**: Validate AI responses for inappropriate content
- [ ] **Cost Monitoring**: Track AI usage costs per user/organization
- [ ] **Audit Logging**: Log all AI requests with user context

---

## 💾 DATABASE MIGRATION REQUIREMENTS

**⚠️ CRITICAL: CREATE MIGRATION REQUEST FOR TEAM E**

Create file: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-206.md`

```markdown
# Migration Request: WS-206 AI Email Templates System

**Tables Required:**
- ai_email_templates (generated template storage)
- template_generation_history (usage tracking and favorites)
- ai_usage_tracking (cost monitoring and rate limiting)

**Key Requirements:**
- Template versioning and history
- Usage analytics for AI optimization
- Rate limiting data storage

**Dependencies:** Requires users table for ownership
**Testing Status:** Will be tested after AI integration implementation
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. AI template generation testing with mocks
test('AI generates appropriate wedding email templates', async () => {
  // Mock OpenAI API response
  const mockAiResponse = {
    choices: [{
      message: {
        content: JSON.stringify({
          templates: [
            {
              subject: "Thank you for your beach wedding inquiry!",
              body: "Hi Sarah & Mike,\n\nI'm thrilled you're considering me for your beach wedding...",
              tone: "friendly",
              personalization: ["beach", "outdoor", "sunset"]
            }
          ]
        })
      }
    }]
  };
  
  // Test template generation
  const result = await generateEmailTemplates({
    stage: 'inquiry',
    venueType: 'beach',
    tone: 'friendly',
    supplierType: 'photographer'
  });
  
  expect(result.templates).toHaveLength(5);
  expect(result.templates[0].body).toContain('beach');
});

// 2. Personalization engine testing
test('Template personalization processes merge tags correctly', async () => {
  const template = "Hi {couple_names}, your {venue_type} wedding on {date} will be amazing!";
  
  const personalized = await personalizeTemplate(template, {
    couple_names: "Sarah & Mike",
    venue_type: "beach",
    date: "June 15th"
  });
  
  expect(personalized).toBe("Hi Sarah & Mike, your beach wedding on June 15th will be amazing!");
});

// 3. Rate limiting and security testing
test('AI requests respect rate limits and security rules', async () => {
  const userId = 'test-user-123';
  
  // Make 10 requests (at limit)
  for (let i = 0; i < 10; i++) {
    await generateEmailTemplates({ stage: 'inquiry' }, userId);
  }
  
  // 11th request should fail
  await expect(
    generateEmailTemplates({ stage: 'inquiry' }, userId)
  ).rejects.toThrow('Rate limit exceeded');
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 deliverables complete and tested
- [ ] AI generates 5 distinct template variants per request
- [ ] Templates contextually appropriate for wedding industry
- [ ] Personalization engine processes merge tags correctly
- [ ] API response time <5 seconds for template generation

### Integration & Performance:
- [ ] Integration with OpenAI API working reliably
- [ ] Wedding-specific prompts produce high-quality output
- [ ] Rate limiting prevents API cost abuse
- [ ] Template quality scoring system functional
- [ ] Edge Function deployment successful

### Evidence Package Required:
- [ ] AI template generation test results with sample outputs
- [ ] Personalization engine validation
- [ ] Rate limiting and security test results
- [ ] Performance metrics for AI response times
- [ ] Cost monitoring dashboard for AI usage

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- AI Services: `/wedsync/src/lib/ai/email-template-generator.ts`
- Edge Functions: `/wedsync/supabase/functions/ai-email-templates/`
- Personalization: `/wedsync/src/lib/ai/personalization-engine.ts`
- Tests: `/wedsync/tests/ai/email-templates/`
- Types: `/wedsync/src/types/ai-email.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch31/WS-206-team-d-round-1-complete.md`
- **Migration request:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-206.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-206 | ROUND_1_COMPLETE | team-d | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT expose OpenAI API keys to frontend code
- Do NOT skip rate limiting - AI costs can escalate quickly
- Do NOT generate templates without content validation
- REMEMBER: Focus on wedding industry-specific AI prompts

## 🏁 ROUND 1 COMPLETION CHECKLIST
- [ ] AI email template generation system built
- [ ] Wedding-specific prompts engineered and tested
- [ ] Personalization engine functional
- [ ] Security and rate limiting implemented
- [ ] OpenAI integration deployed via Edge Functions
- [ ] Cost monitoring and audit logging active

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY