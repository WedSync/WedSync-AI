# TEAM D - ROUND 2: WS-206 - AI Email Templates System - Advanced AI Personalization & Learning Engine

**Date:** 2025-08-28  
**Feature ID:** WS-206 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Enhance AI email system with advanced personalization, learning algorithms, and performance optimization  
**Context:** You are Team D working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding venue coordinator managing diverse client personalities and event styles
**I want to:** AI that learns my communication style and adapts templates based on client preferences and successful past interactions
**So that:** Each email feels personally written by me, with increasing effectiveness over time as the AI learns what works best

**Real Wedding Problem This Solves:**
The venue coordinator has 3 very different clients: Sarah (formal, detail-oriented bride), Mike (laid-back groom who prefers brief updates), and Emma (creative couple wanting unique touches). The AI system has learned from past successful interactions: with Sarah, it generates detailed, structured emails with bullet points; with Mike, it creates concise, friendly messages; with Emma, it uses creative language and suggests unique options. The coordinator's response rate improved from 60% to 95% as the AI learned to match communication styles.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Enhance Round 1 AI system with:
- Advanced personalization based on client profiles and history
- Learning algorithms that improve template quality over time
- Multi-variant A/B testing for template optimization
- Sentiment analysis and tone adaptation
- Performance optimization for instant generation

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- AI: OpenAI GPT-4, custom wedding industry prompts
- Backend: Supabase Edge Functions for AI processing
- Email: Integration with existing communication system
- Testing: Playwright MCP, Vitest

**Integration Points:**
- Enhanced integration with real-time broadcast system (Team C)
- Client behavior data from presence tracking (Team B)
- Channel-specific template adaptation (Team A)
- Learning data storage and analytics

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR ALL UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "OpenAI fine-tuning and prompt engineering"
// - "Machine learning personalization algorithms"
// - "A/B testing implementation patterns"

// For this specific feature, also search:
// - "Sentiment analysis integration"
// - "AI learning feedback loops"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW Round 1 AI email system:
await mcp__serena__find_symbol("AITemplateGenerator", "", true);
await mcp__serena__get_symbols_overview("/src/lib/ai/email");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "Advanced AI personalization engine"
2. **openai-ai-specialist** --think-hard --use-loaded-docs "AI learning and optimization"
3. **ai-ml-engineer** --think-ultra-hard --follow-existing-patterns "Personalization algorithms" 
4. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
5. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
6. **performance-optimization-expert** --ai-performance --response-time-optimization
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Build advanced AI personalization on top of Round 1 foundation. Focus on learning and optimization."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 2 (Advanced AI Personalization):
- [ ] AIPersonalizationEngine with client profile analysis
- [ ] EmailLearningSystem that improves from user feedback
- [ ] TemplateABTester for continuous optimization
- [ ] SentimentAnalyzer for tone adaptation
- [ ] PerformanceOptimizer for sub-second AI responses
- [ ] Advanced analytics dashboard for template effectiveness
- [ ] Comprehensive AI testing with realistic wedding scenarios

### What other teams NEED from you:
- TO Team C: AI insights for broadcast content optimization
- TO Team E: AI-generated FAQ content and suggestions

### What you NEED from other teams:
- FROM Team B: User interaction patterns for personalization
- FROM Team C: Broadcast engagement data for learning

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ ALWAYS validate and sanitize AI prompts
const sanitizeAIPrompt = (userInput: any, clientData: any) => {
  const sanitizedInput = {
    templateType: sanitizeString(userInput.templateType),
    clientPreferences: sanitizeObject(userInput.clientPreferences),
    weddingDetails: sanitizeWeddingData(userInput.weddingDetails)
  };
  
  // Remove any potential prompt injection attempts
  const cleanPrompt = removePromptInjection(sanitizedInput);
  
  // Validate client data access permissions
  if (!canAccessClientData(sanitizedInput.userId, clientData.clientId)) {
    throw new SecurityError('Unauthorized client data access');
  }
  
  return cleanPrompt;
};

// ✅ ALWAYS protect learning data
const encryptLearningData = (feedbackData: any) => {
  return {
    ...feedbackData,
    clientId: hashClientId(feedbackData.clientId),
    templateContent: encryptSensitiveContent(feedbackData.templateContent),
    userFeedback: anonymizeFeedback(feedbackData.userFeedback)
  };
};

// ✅ ALWAYS rate limit AI requests
const aiRequestLimiter = createRateLimiter({
  max: 50, // 50 AI requests per hour per user
  windowMs: 3600000
});
```

**SECURITY CHECKLIST:**
- [ ] **AI Prompt Security**: Prevent prompt injection and manipulation
- [ ] **Data Privacy**: Protect client data used in personalization
- [ ] **Learning Data Protection**: Encrypt and anonymize learning datasets
- [ ] **Rate Limiting**: Prevent AI API abuse and cost control
- [ ] **Content Validation**: Validate AI-generated content before delivery

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. AI personalization learning test
await mcp__playwright__browser_navigate({url: "http://localhost:3000/ai/email-templates"});

// Create client profile with specific preferences
await mcp__playwright__browser_evaluate({
  function: `async () => {
    await window.createTestClient({
      id: 'sarah-formal-bride',
      communicationStyle: 'formal',
      preferences: {
        detailLevel: 'high',
        tone: 'professional',
        formatPreference: 'structured'
      },
      weddingType: 'traditional'
    });
  }`
});

// Generate initial template
const initialTemplate = await mcp__playwright__browser_evaluate({
  function: `async () => {
    return await fetch('/api/ai/email-templates/generate', {
      method: 'POST',
      body: JSON.stringify({
        clientId: 'sarah-formal-bride',
        templateType: 'venue_inquiry_response',
        context: 'First contact with formal bride'
      })
    }).then(r => r.json());
  }`
});

expect(initialTemplate.templates).toHaveLength(5);
expect(initialTemplate.templates[0].tone).toBe('professional');

// Provide feedback to learning system
await mcp__playwright__browser_evaluate({
  function: `async () => {
    await fetch('/api/ai/email-templates/feedback', {
      method: 'POST',
      body: JSON.stringify({
        templateId: '${initialTemplate.templates[0].id}',
        feedback: 'positive',
        clientResponse: 'very detailed response received',
        improvementSuggestions: 'perfect level of detail'
      })
    });
  }`
});

// Generate template again after learning
const improvedTemplate = await mcp__playwright__browser_evaluate({
  function: `async () => {
    return await fetch('/api/ai/email-templates/generate', {
      method: 'POST',
      body: JSON.stringify({
        clientId: 'sarah-formal-bride',
        templateType: 'venue_inquiry_response',
        context: 'Follow-up with formal bride'
      })
    }).then(r => r.json());
  }`
});

// Verify AI learned from feedback
expect(improvedTemplate.templates[0].detailLevel).toBeGreaterThan(initialTemplate.templates[0].detailLevel);

// 2. A/B testing validation
const abTestResults = await mcp__playwright__browser_evaluate({
  function: `async () => {
    // Create A/B test for template variants
    const testId = await fetch('/api/ai/email-templates/ab-test', {
      method: 'POST',
      body: JSON.stringify({
        templateType: 'inquiry_response',
        variants: ['formal', 'friendly', 'creative'],
        testDuration: '1_week',
        successMetric: 'response_rate'
      })
    }).then(r => r.json());
    
    // Simulate user interactions with variants
    const interactions = [];
    for (let i = 0; i < 100; i++) {
      const variant = ['formal', 'friendly', 'creative'][i % 3];
      const success = Math.random() > 0.3; // 70% success rate simulation
      
      interactions.push(
        fetch('/api/ai/email-templates/ab-test/interaction', {
          method: 'POST',
          body: JSON.stringify({
            testId: testId.id,
            variant: variant,
            success: success,
            responseTime: Math.random() * 24 * 60 // random minutes
          })
        })
      );
    }
    
    await Promise.all(interactions);
    
    // Get test results
    return await fetch('/api/ai/email-templates/ab-test/' + testId.id + '/results')
      .then(r => r.json());
  }`
});

expect(abTestResults.winningVariant).toBeDefined();
expect(abTestResults.confidenceLevel).toBeGreaterThan(0.8);

// 3. Performance optimization testing
const performanceTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const startTime = Date.now();
    
    // Test rapid template generation
    const promises = Array.from({length: 20}, (_, i) => 
      fetch('/api/ai/email-templates/generate', {
        method: 'POST',
        body: JSON.stringify({
          clientId: 'test-client-' + i,
          templateType: 'quick_update',
          priority: 'high_speed'
        })
      })
    );
    
    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    return {
      totalTime: endTime - startTime,
      averageTime: (endTime - startTime) / 20,
      successRate: results.filter(r => r.ok).length / 20
    };
  }`
});

// Should generate templates quickly
expect(performanceTest.averageTime).toBeLessThan(2000); // <2 seconds average
expect(performanceTest.successRate).toBe(1); // 100% success

// 4. Sentiment analysis testing
const sentimentTest = await mcp__playwright__browser_evaluate({
  function: `async () => {
    const testScenarios = [
      { context: 'urgent_complaint', expectedTone: 'apologetic' },
      { context: 'celebration_message', expectedTone: 'joyful' },
      { context: 'business_inquiry', expectedTone: 'professional' }
    ];
    
    const results = [];
    for (const scenario of testScenarios) {
      const template = await fetch('/api/ai/email-templates/generate', {
        method: 'POST',
        body: JSON.stringify({
          templateType: scenario.context,
          sentimentAnalysis: true
        })
      }).then(r => r.json());
      
      results.push({
        scenario: scenario.context,
        expectedTone: scenario.expectedTone,
        actualTone: template.analyzedTone,
        match: template.analyzedTone === scenario.expectedTone
      });
    }
    
    return results;
  }`
});

// Verify sentiment analysis accuracy
const sentimentAccuracy = sentimentTest.filter(r => r.match).length / sentimentTest.length;
expect(sentimentAccuracy).toBeGreaterThan(0.8); // >80% accuracy
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] AI personalization demonstrates measurable improvement over baseline
- [ ] Learning system shows template effectiveness improvement over time
- [ ] A/B testing system identifies winning variants with statistical confidence
- [ ] Sentiment analysis achieves >85% accuracy in tone matching
- [ ] Performance optimization delivers templates in <2 seconds average

### Integration & Performance:
- [ ] Enhanced AI system integrates seamlessly with Round 1 foundation
- [ ] Learning algorithms update efficiently without impacting performance  
- [ ] Personalization uses real client data to improve relevance
- [ ] System maintains quality while optimizing for speed
- [ ] AI insights enhance other team systems effectively

### Evidence Package Required:
- [ ] Learning effectiveness metrics and improvement curves
- [ ] A/B testing results showing statistical significance
- [ ] Performance benchmarks for AI response times
- [ ] Personalization accuracy validation results
- [ ] Integration success validation with other team systems

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- AI Personalization: `/wedsync/src/lib/ai/email/personalization-engine.ts`
- Learning System: `/wedsync/src/lib/ai/email/learning-system.ts`
- A/B Testing: `/wedsync/src/lib/ai/email/ab-testing.ts`
- Sentiment Analysis: `/wedsync/src/lib/ai/email/sentiment-analyzer.ts`
- Performance: `/wedsync/src/lib/ai/email/performance-optimizer.ts`
- Tests: `/wedsync/tests/ai/email-advanced/`

### Database Migrations:
- **CRITICAL**: Create migration file but DO NOT APPLY
- **Send to SQL Expert**: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-206.md`
- Migration file: `/wedsync/supabase/migrations/[timestamp]_ai_learning_tables.sql`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-d/batch31/WS-206-team-d-round-2-complete.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-206 | ROUND_2_COMPLETE | team-d | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Build UPON Round 1 AI system, don't recreate it
- AI personalization must respect user privacy and consent
- Learning algorithms must be transparent and explainable
- Performance is critical for user adoption
- Do NOT apply database migrations yourself (SQL Expert responsibility)

## 🏁 ROUND 2 COMPLETION CHECKLIST
- [ ] Advanced AI personalization implemented
- [ ] Learning system demonstrating improvement
- [ ] A/B testing framework operational
- [ ] Performance optimizations complete
- [ ] Integration with other systems successful
- [ ] Migration request sent to SQL Expert

---

END OF ROUND 2 PROMPT - EXECUTE IMMEDIATELY