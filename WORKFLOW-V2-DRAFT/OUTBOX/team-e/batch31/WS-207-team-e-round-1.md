# TEAM E - ROUND 1: WS-207 - FAQ Extraction AI - Full-Stack Implementation & Testing

**Date:** 2025-08-28  
**Feature ID:** WS-207 (Track all work with this ID)
**Priority:** P1 from roadmap  
**Mission:** Build complete FAQ extraction system with AI categorization and website scraping  
**Context:** You are Team E working in parallel with 4 other teams. ALL must complete before next round.

---

## 🎯 USER STORY & WEDDING CONTEXT (CRITICAL - THINK HARD)

**As a:** Wedding vendor who has a website with FAQs scattered across multiple pages
**I want to:** Automatically import all my existing FAQs into WedSync with proper categorization
**So that:** Couples can find answers instantly without me answering the same 20 questions daily, saving 5+ hours per week

**Real Wedding Problem This Solves:**
A wedding photographer has 50+ FAQs on their website about pricing, travel fees, album options, and timeline questions. Currently, they copy-paste answers from a Word document 20+ times per week to respond to couples. With FAQ extraction, they enter their website URL once, the AI finds and extracts all FAQs, categorizes them (pricing, booking, service, logistics), and makes them instantly available to couples through the chatbot. When a couple asks "Do you charge travel fees?", they get the answer immediately instead of waiting 24 hours for an email response.

---

## 🎯 TECHNICAL REQUIREMENTS

**From Technical Specification:**
Build complete FAQ extraction system including:
- Website scraping service for FAQ content discovery
- AI-powered FAQ extraction from unstructured content
- Automatic categorization system (pricing, booking, service, logistics)
- FAQ review and editing interface
- Integration with existing FAQ management system

**Technology Stack (VERIFIED):**
- Frontend: Next.js 15 App Router, React 19, Tailwind CSS v4
- Database: PostgreSQL via MCP Server (✅ CONNECTED)
- AI: OpenAI GPT-4 for content analysis and categorization
- Scraping: Playwright for website content extraction
- Backend: Supabase Edge Functions
- Testing: Playwright MCP, Vitest

**Integration Points:**
- FAQ Management: Integration with existing FAQ system
- AI Infrastructure: OpenAI API for content analysis
- Website Scraping: Automated content extraction
- User Interface: FAQ extraction wizard and review queue

---

## 📚 STEP 1: LOAD CURRENT DOCUMENTATION (MANDATORY FIRST STEP!)

**⚠️ CRITICAL: Complete this BEFORE any coding or agent work begins!**

```typescript
// 1. LOAD CORRECT UI STYLE GUIDE (MANDATORY FOR UI WORK):
await mcp__serena__read_file("/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");

// 2. REF MCP - Load latest docs for THIS SPECIFIC TASK:
// Use Ref MCP to search for:
// - "Web scraping with Playwright Next.js"
// - "OpenAI text analysis and categorization"
// - "FAQ management system patterns"

// For this specific feature, also search:
// - "AI content extraction algorithms"
// - "Website crawling best practices"
// - "Q&A categorization systems"

// 3. SERENA MCP - Initialize codebase intelligence:
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// 4. REVIEW existing patterns:
await mcp__serena__find_symbol("FAQManager", "", true);
await mcp__serena__get_symbols_overview("/src/components/settings");
await mcp__serena__get_symbols_overview("/src/lib/ai");
```

---

## 🚀 STEP 2: LAUNCH PARALLEL AGENTS (AFTER documentation loaded!)

1. **task-tracker-coordinator** --think-hard --with-ref-docs "FAQ extraction full-stack system"
2. **ai-ml-engineer** --think-hard --use-loaded-docs "AI content analysis and FAQ categorization"
3. **playwright-visual-testing-specialist** --think-ultra-hard --follow-existing-patterns "Website scraping and content extraction" 
4. **react-ui-specialist** --think-hard --faq-management-interfaces
5. **security-compliance-officer** --think-ultra-hard --check-current-best-practices
6. **test-automation-architect** --tdd-approach --use-testing-patterns-from-docs
7. **code-quality-guardian** --check-patterns --match-codebase-style

**AGENT INSTRUCTIONS:** "Build complete end-to-end FAQ extraction with AI categorization."

---

## 🎯 SPECIFIC DELIVERABLES FOR THIS ROUND

### Round 1 (Core Implementation):
- [ ] WebsiteScraper service using Playwright for content extraction
- [ ] FAQExtractor AI service for question-answer identification
- [ ] FAQCategorizer for automatic categorization (pricing, booking, service, logistics)
- [ ] FAQExtractionWizard React component for URL input and preview
- [ ] FAQReviewQueue component for extracted FAQ review and editing
- [ ] Database schema for FAQ extraction history and categorization
- [ ] Integration with existing FAQ management system
- [ ] Unit tests with >80% coverage including AI and scraping mocks
- [ ] E2E tests with real website scraping scenarios

### What other teams NEED from you:
- TO Team A: FAQ extraction wizard UI specifications
- TO Team D: AI categorization service integration patterns

### What you NEED from other teams:
- FROM Team A: UI/UX requirements for FAQ extraction workflow
- FROM Team D: AI service patterns and security requirements

---

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE)

```typescript
// ✅ MANDATORY SECURITY PATTERN for website scraping:
import { validateUrl, rateLimitScraping } from '@/lib/security/scraping-security';
import { sanitizeExtractedContent } from '@/lib/security/content-validation';

export class SecureFAQExtractor {
  async extractFAQsFromWebsite(
    url: string,
    userId: string
  ): Promise<ExtractedFAQ[]> {
    // 1. Validate and sanitize URL
    const validatedUrl = await validateUrl(url);
    if (!validatedUrl.isValid) {
      throw new Error('Invalid or unsafe URL provided');
    }
    
    // 2. Rate limit scraping per user
    await rateLimitScraping(userId, 5); // Max 5 sites/hour
    
    // 3. Secure scraping with timeout
    const content = await this.scrapeWithSecurity(validatedUrl.url);
    
    // 4. Sanitize extracted content
    const sanitizedContent = sanitizeExtractedContent(content);
    
    // 5. AI extraction with validation
    const faqs = await this.aiExtractFAQs(sanitizedContent);
    
    // 6. Audit logging
    await this.logExtractionAttempt(userId, url, faqs.length);
    
    return faqs;
  }
  
  private async scrapeWithSecurity(url: string) {
    // Implement secure scraping with:
    // - User agent rotation
    // - Request timeout (30s max)
    // - Content size limits (1MB max)
    // - Malware scanning
    return await this.playwright.extractContent(url);
  }
}

// ✅ ALWAYS validate extracted content
const validateExtractedFAQ = (faq: any) => {
  // Check for malicious content
  // Validate Q&A structure
  // Ensure no sensitive data
  return sanitizedFAQ;
};
```

**SECURITY CHECKLIST:**
- [ ] **URL Validation**: Validate and sanitize all website URLs
- [ ] **Rate Limiting**: Limit scraping requests (5 sites/hour per user)
- [ ] **Content Sanitization**: Sanitize all extracted content
- [ ] **Scraping Limits**: Max 1MB content, 30s timeout per site
- [ ] **Malware Protection**: Scan extracted content for threats
- [ ] **User Permissions**: Verify user owns/can scrape the website
- [ ] **Audit Logging**: Log all scraping attempts and results

---

## 💾 DATABASE MIGRATION REQUIREMENTS

**⚠️ CRITICAL: CREATE MIGRATION REQUEST FOR SQL EXPERT**

Create file: `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-207.md`

```markdown
# Migration Request: WS-207 FAQ Extraction AI System

**Tables Required:**
- faq_extraction_jobs (tracking scraping jobs and status)
- extracted_faqs (temporary storage for review before approval)
- faq_categories (standardized categorization system)

**Key Requirements:**
- Job status tracking (pending, processing, completed, failed)
- FAQ review workflow with approval states
- Category hierarchy for wedding industry FAQs

**Dependencies:** Requires existing faqs table
**Testing Status:** Will be tested after implementation completion
```

---

## 🎭 REVOLUTIONARY PLAYWRIGHT MCP TESTING (MANDATORY)

```javascript
// 1. Website scraping functionality
test('FAQ extraction scrapes website content correctly', async () => {
  // Create test website with known FAQs
  await mcp__playwright__browser_navigate({
    url: 'https://test-wedding-photographer.com/faq'
  });
  
  // Extract FAQs using our service
  const extractedFAQs = await extractFAQsFromWebsite(
    'https://test-wedding-photographer.com/faq',
    'test-user'
  );
  
  // Verify extraction quality
  expect(extractedFAQs.length).toBeGreaterThan(5);
  expect(extractedFAQs[0]).toHaveProperty('question');
  expect(extractedFAQs[0]).toHaveProperty('answer');
  expect(extractedFAQs[0]).toHaveProperty('category');
});

// 2. AI categorization accuracy
test('AI correctly categorizes wedding industry FAQs', async () => {
  const testFAQs = [
    {
      question: "Do you charge travel fees for destination weddings?",
      answer: "Yes, travel fees apply for weddings over 50 miles from our studio."
    },
    {
      question: "How many photos do you deliver?",
      answer: "We typically deliver 500-800 edited photos per wedding."
    }
  ];
  
  const categorized = await categorizeFAQs(testFAQs);
  
  expect(categorized[0].category).toBe('pricing');
  expect(categorized[1].category).toBe('service');
});

// 3. End-to-end extraction workflow
test('Complete FAQ extraction workflow from URL to review', async () => {
  // Start extraction wizard
  await mcp__playwright__browser_navigate({url: '/settings/faq-extraction'});
  
  // Input website URL
  await mcp__playwright__browser_type({
    element: 'URL input field',
    ref: '[data-testid="website-url"]',
    text: 'https://test-photographer.com'
  });
  
  // Start extraction
  await mcp__playwright__browser_click({
    element: 'Extract FAQs button',
    ref: '[data-testid="start-extraction"]'
  });
  
  // Wait for extraction completion
  await mcp__playwright__browser_wait_for({text: 'Extraction completed'});
  
  // Verify review queue populated
  const reviewQueue = await mcp__playwright__browser_snapshot();
  expect(reviewQueue).toContain('Review extracted FAQs');
});

// 4. Security and rate limiting
test('FAQ extraction respects security and rate limits', async () => {
  const userId = 'test-user-123';
  
  // Test malicious URL rejection
  await expect(
    extractFAQsFromWebsite('javascript:alert(1)', userId)
  ).rejects.toThrow('Invalid or unsafe URL');
  
  // Test rate limiting
  for (let i = 0; i < 5; i++) {
    await extractFAQsFromWebsite('https://valid-site.com', userId);
  }
  
  // 6th request should fail
  await expect(
    extractFAQsFromWebsite('https://another-site.com', userId)
  ).rejects.toThrow('Rate limit exceeded');
});
```

---

## ✅ SUCCESS CRITERIA (NON-NEGOTIABLE)

**You CANNOT claim completion unless:**

### Technical Implementation:
- [ ] All Round 1 deliverables complete and tested
- [ ] Website scraping extracts FAQs from 80%+ of tested websites
- [ ] AI categorization achieves 85%+ accuracy on wedding industry FAQs
- [ ] Extraction wizard provides smooth user experience
- [ ] Review queue allows editing and approval workflow

### Integration & Performance:
- [ ] Scraping completes within 60 seconds for typical websites
- [ ] AI categorization processes 100+ FAQs within 10 seconds
- [ ] Integration with existing FAQ system seamless
- [ ] Rate limiting prevents abuse and cost overruns
- [ ] Security validation blocks malicious URLs

### Evidence Package Required:
- [ ] FAQ extraction test results with real websites
- [ ] AI categorization accuracy metrics
- [ ] Performance benchmarks for scraping and processing
- [ ] Security validation report
- [ ] End-to-end workflow demonstration

---

## 💾 WHERE TO SAVE YOUR WORK

### Code Files:
- Scraping: `/wedsync/src/lib/scraping/website-scraper.ts`
- AI Services: `/wedsync/src/lib/ai/faq-extractor.ts`
- Components: `/wedsync/src/components/faq/`
- Edge Functions: `/wedsync/supabase/functions/faq-extraction/`
- Tests: `/wedsync/tests/faq-extraction/`
- Types: `/wedsync/src/types/faq-extraction.ts`

### CRITICAL - Team Reports:
- **Output to:** `/WORKFLOW-V2-DRAFT/OUTBOX/team-e/batch31/WS-207-team-e-round-1-complete.md`
- **Migration request:** `/WORKFLOW-V2-DRAFT/INBOX/sql-expert/migration-request-WS-207.md`
- **Update tracker:** 
  ```bash
  echo "$(date '+%Y-%m-%d %H:%M') | WS-207 | ROUND_1_COMPLETE | team-e | batch31" >> /WORKFLOW-V2-DRAFT/00-STATUS/feature-tracker.log
  ```

---

## ⚠️ CRITICAL WARNINGS
- Do NOT scrape websites without user permission/ownership verification
- Do NOT skip content sanitization - extracted content could be malicious
- Do NOT exceed rate limits - AI and scraping costs can escalate
- REMEMBER: Build complete end-to-end functionality including UI

## 🏁 ROUND 1 COMPLETION CHECKLIST
- [ ] Website scraping service built with security controls
- [ ] AI FAQ extraction and categorization working
- [ ] User interface for extraction wizard and review queue
- [ ] Integration with existing FAQ management system
- [ ] Security validation and rate limiting implemented
- [ ] Performance targets met for scraping and AI processing

---

END OF ROUND 1 PROMPT - EXECUTE IMMEDIATELY