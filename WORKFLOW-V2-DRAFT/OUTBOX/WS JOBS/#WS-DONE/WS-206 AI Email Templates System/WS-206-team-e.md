# TEAM E - ROUND 1: WS-206 - AI Email Templates System
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive testing infrastructure, quality assurance, and documentation for the AI email templates system with performance validation and user acceptance testing
**FEATURE ID:** WS-206 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about AI content quality testing, email delivery validation, and comprehensive documentation for wedding vendor workflows

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/ai/email-template-generator.test.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/integration/ai-email-templates-e2e.test.ts
ls -la /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/docs/ai/AI-Email-Templates-User-Guide.md
cat /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/ai/email-template-generator.test.ts | head -20
```

2. **TEST COVERAGE RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run test:coverage -- --testPathPattern=ai
# MUST show: "Coverage >90% for all AI email template code"
```

3. **E2E TEST RESULTS:**
```bash
cd /Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync && npm run test:e2e -- --testPathPattern=ai-email
# MUST show: "All E2E tests passing"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query specific areas relevant to testing and documentation
await mcp__serena__search_for_pattern("test");
await mcp__serena__find_symbol("describe", "", true);
await mcp__serena__get_symbols_overview("src/__tests__");
await mcp__serena__get_symbols_overview("docs/");
```

### B. TESTING ARCHITECTURE PATTERNS (MANDATORY)
```typescript
// Load existing testing patterns and documentation standards
await mcp__serena__read_file("src/__tests__/setup.ts");
await mcp__serena__search_for_pattern("jest.config");
await mcp__serena__search_for_pattern("playwright");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to this feature
await mcp__Ref__ref_search_documentation("Jest testing React components");
await mcp__Ref__ref_search_documentation("Playwright E2E testing");
await mcp__Ref__ref_search_documentation("Testing AI API integrations");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPLEX FEATURE PLANNING

### Use Sequential Thinking MCP for Complex Analysis
```typescript
mcp__sequential-thinking__sequentialthinking({
  thought: "Comprehensive testing of AI email templates requires: 1) Unit tests for AI generation logic, 2) Integration tests with OpenAI API mocking, 3) E2E tests for complete user workflows, 4) Performance tests for template generation speed, 5) Quality assurance for AI content accuracy, 6) User acceptance testing with real wedding scenarios. I need to ensure reliability, performance, and user experience quality.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **test-automation-architect** - Build comprehensive test suites for AI functionality
2. **playwright-visual-testing-specialist** - Create E2E tests with visual validation
3. **performance-optimization-expert** - Implement performance testing and benchmarks
4. **security-compliance-officer** - Test security aspects of AI integration
5. **documentation-chronicler** - Create comprehensive user and technical documentation
6. **user-impact-analyzer** - Validate user experience and workflow effectiveness

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### TESTING SECURITY CHECKLIST:
- [ ] **API key protection tests** - Verify keys never exposed in logs/responses
- [ ] **Input sanitization tests** - Test AI prompt injection prevention
- [ ] **Authentication tests** - Verify all endpoints require proper auth
- [ ] **Rate limiting tests** - Test AI generation limits work correctly
- [ ] **Data privacy tests** - Ensure client data isn't leaked to AI logs
- [ ] **Content validation tests** - Test AI response sanitization
- [ ] **Webhook security tests** - Verify webhook signature validation
- [ ] **Error message tests** - Ensure no sensitive data in error responses

## 🎯 TEAM E SPECIALIZATION:

**QA/TESTING & DOCUMENTATION FOCUS:**
- Comprehensive test suite (>90% coverage)
- E2E testing with Playwright MCP
- Documentation with screenshots
- Bug tracking and resolution
- Performance benchmarking
- Cross-browser compatibility

## 📋 TECHNICAL SPECIFICATION
**Real Wedding Scenario Testing:**
Create comprehensive test scenarios that validate: A photographer generates personalized inquiry emails for 5 different wedding scenarios (beach, barn, hotel, church, outdoor), verifies AI generates appropriate content for each venue type, tests A/B performance tracking, validates mobile responsiveness, and confirms email delivery integration works correctly.

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### PRIMARY TESTING COMPONENTS (MUST BUILD):

#### 1. AI Email Template Generator Unit Tests
**Location:** `src/__tests__/ai/email-template-generator.test.ts`

**Test Coverage Areas:**
- Template generation with different vendor types
- Merge tag extraction and processing
- Error handling for API failures
- Performance benchmarks
- Content validation and sanitization
- Wedding-specific context processing

**Test Implementation:**
```typescript
describe('EmailTemplateGenerator', () => {
  let generator: EmailTemplateGenerator;
  let mockOpenAI: jest.MockedClass<typeof OpenAI>;

  beforeEach(() => {
    mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;
    generator = new EmailTemplateGenerator();
  });

  describe('generateTemplates', () => {
    it('should generate 5 unique variants for photographer inquiry stage', async () => {
      const mockResponse = {
        choices: [{ message: { content: JSON.stringify({
          subject: "Capturing Your Beach Wedding Dreams",
          body: "Dear Sarah & Mike, I'm thrilled about your June beach wedding..."
        })}}]
      };
      
      mockOpenAI.prototype.chat.completions.create.mockResolvedValue(mockResponse);

      const templates = await generator.generateTemplates({
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        includeElements: ['portfolio', 'pricing'],
        clientContext: {
          coupleName: 'Sarah & Mike',
          venue: 'Beach Resort',
          weddingDate: '2025-06-15'
        },
        variantCount: 5
      });

      expect(templates).toHaveLength(5);
      expect(templates[0].subject).toContain('Sarah & Mike');
      expect(templates[0].body).toContain('beach');
      expect(templates[0].mergeTags).toContain('{{couple_names}}');
    });

    it('should handle OpenAI API failures gracefully', async () => {
      mockOpenAI.prototype.chat.completions.create.mockRejectedValue(
        new Error('Rate limit exceeded')
      );

      await expect(generator.generateTemplates({
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'formal',
        includeElements: []
      })).rejects.toThrow('Rate limit exceeded');
    });

    it('should validate and sanitize AI responses', async () => {
      const maliciousResponse = {
        choices: [{ message: { content: JSON.stringify({
          subject: "Test <script>alert('xss')</script>",
          body: "Email with malicious content"
        })}}]
      };
      
      mockOpenAI.prototype.chat.completions.create.mockResolvedValue(maliciousResponse);

      const templates = await generator.generateTemplates({
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        includeElements: []
      });

      expect(templates[0].subject).not.toContain('<script>');
      expect(templates[0].subject).toBe('Test');
    });
  });
});
```

#### 2. Integration Tests for AI Email Workflows
**Location:** `src/__tests__/integration/ai-email-templates-integration.test.ts`

**Integration Test Areas:**
- Complete API endpoint flows
- Database operations for template storage
- Email service integration
- Performance tracking webhooks
- Error handling across service boundaries

**Test Implementation:**
```typescript
describe('AI Email Templates Integration', () => {
  beforeEach(async () => {
    await setupTestDatabase();
    await seedTestData();
  });

  afterEach(async () => {
    await cleanupTestDatabase();
  });

  it('should handle complete template generation workflow', async () => {
    // 1. Generate templates via API
    const response = await fetch('/api/ai/email-templates/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vendorType: 'photographer',
        stage: 'inquiry',
        tone: 'friendly',
        includeElements: ['portfolio']
      })
    });

    expect(response.status).toBe(200);
    const { templates } = await response.json();
    expect(templates).toHaveLength(5);

    // 2. Verify database storage
    const storedTemplates = await db.emailTemplates.findMany({
      where: { ai_generated: true }
    });
    expect(storedTemplates).toHaveLength(5);

    // 3. Test personalization
    const personalizeResponse = await fetch('/api/ai/email-templates/personalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        templateId: templates[0].id,
        clientId: 'test-client-id'
      })
    });

    expect(personalizeResponse.status).toBe(200);
    const { personalizedEmail } = await personalizeResponse.json();
    expect(personalizedEmail.subject).toContain('Sarah & Mike');
  });
});
```

#### 3. E2E Tests with Playwright MCP
**Location:** `src/__tests__/e2e/ai-email-templates-e2e.test.ts`

**E2E Test Scenarios:**
- Complete user journey from template generation to sending
- Cross-browser testing
- Mobile responsiveness validation
- Performance testing
- Visual regression testing

**Playwright Implementation:**
```typescript
test('Wedding photographer generates AI email templates', async () => {
  // Navigate to communications page
  await mcp__playwright__browser_navigate({
    url: 'http://localhost:3000/dashboard/communications'
  });

  // Open AI template generator
  await mcp__playwright__browser_click({
    element: 'AI Generate Templates button',
    ref: 'ai-generate-btn'
  });

  // Configure generation settings
  await mcp__playwright__browser_select_option({
    element: 'Vendor type selector',
    ref: 'vendor-type-select',
    values: ['photographer']
  });

  await mcp__playwright__browser_select_option({
    element: 'Stage selector',
    ref: 'stage-select',
    values: ['inquiry']
  });

  await mcp__playwright__browser_select_option({
    element: 'Tone selector',
    ref: 'tone-select',
    values: ['friendly']
  });

  // Add client context
  await mcp__playwright__browser_type({
    element: 'Couple names input',
    ref: 'couple-names-input',
    text: 'Sarah & Mike'
  });

  await mcp__playwright__browser_type({
    element: 'Venue input',
    ref: 'venue-input',
    text: 'Sunset Beach Resort'
  });

  // Generate templates
  await mcp__playwright__browser_click({
    element: 'Generate Templates button',
    ref: 'generate-templates-btn'
  });

  // Wait for generation to complete
  await mcp__playwright__browser_wait_for({
    text: 'Templates Generated Successfully'
  });

  // Verify 5 variants are shown
  const variantCards = await page.locator('[data-testid="template-variant"]');
  expect(await variantCards.count()).toBe(5);

  // Take screenshot for visual validation
  await mcp__playwright__browser_take_screenshot({
    filename: 'ai-templates-generated.png',
    fullPage: true
  });

  // Select a variant
  await mcp__playwright__browser_click({
    element: 'Use This button on first variant',
    ref: 'use-variant-0'
  });

  // Verify template is loaded in composer
  const composerSubject = await page.locator('[data-testid="email-subject"]');
  expect(await composerSubject.textContent()).toContain('Sarah & Mike');

  // Test mobile responsiveness
  await mcp__playwright__browser_resize({
    width: 375,
    height: 667
  });

  await mcp__playwright__browser_take_screenshot({
    filename: 'ai-templates-mobile.png'
  });

  // Verify mobile UI works
  const mobileVariants = await page.locator('[data-testid="mobile-variant"]');
  expect(await mobileVariants.first().isVisible()).toBe(true);
});
```

#### 4. Performance and Load Testing
**Location:** `src/__tests__/performance/ai-template-performance.test.ts`

**Performance Test Areas:**
- AI generation response times
- Database query performance
- Memory usage during generation
- Concurrent user load testing
- Mobile performance benchmarks

#### 5. Documentation Suite
**Location:** `docs/ai/AI-Email-Templates-User-Guide.md`

**Documentation Components:**
- User guide with screenshots
- Technical implementation guide
- API documentation
- Troubleshooting guide
- Wedding vendor workflow examples

### TESTING REQUIREMENTS:
- [ ] Unit test coverage >90% for all AI components
- [ ] Integration tests for complete workflows
- [ ] E2E tests covering user journeys
- [ ] Performance benchmarks established
- [ ] Cross-browser compatibility verified
- [ ] Mobile responsiveness validated
- [ ] Accessibility testing completed
- [ ] Security testing comprehensive

### QUALITY ASSURANCE REQUIREMENTS:
- [ ] AI content quality validation
- [ ] Wedding context accuracy testing
- [ ] Email delivery confirmation testing
- [ ] A/B test tracking validation
- [ ] Error handling verification
- [ ] Performance regression prevention
- [ ] User acceptance testing

### DOCUMENTATION REQUIREMENTS:
- [ ] Complete user guide with screenshots
- [ ] API documentation with examples
- [ ] Technical architecture documentation
- [ ] Troubleshooting and FAQ guide
- [ ] Wedding vendor workflow examples
- [ ] Mobile usage instructions

## 💾 WHERE TO SAVE YOUR WORK
- Unit Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/ai/`
- Integration Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/integration/`
- E2E Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/e2e/`
- Performance Tests: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/src/__tests__/performance/`
- Documentation: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/wedsync/docs/ai/`
- Reports: `/Users/skyphotography/CODE/WedSync-2.0/WedSync2/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## 🏁 COMPLETION CHECKLIST
- [ ] Comprehensive unit tests implemented (>90% coverage)
- [ ] Integration tests for all AI workflows
- [ ] E2E tests with Playwright MCP functional
- [ ] Performance benchmarks established
- [ ] Cross-browser testing completed
- [ ] Mobile responsiveness validated
- [ ] Security testing comprehensive
- [ ] User documentation created with screenshots
- [ ] Technical documentation complete
- [ ] Bug tracking system configured
- [ ] Test automation pipeline working
- [ ] Evidence package with test results prepared
- [ ] Senior dev review prompt created

## 🧪 TESTING PATTERNS:

### Mock AI Responses:
```typescript
// Mock OpenAI for consistent testing
const mockAIResponse = {
  choices: [{
    message: {
      content: JSON.stringify({
        subject: "Your Beach Wedding Photography",
        body: "Dear {{couple_names}}, I'm excited about capturing your {{wedding_date}} celebration at {{venue_name}}..."
      })
    }
  }]
};

jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue(mockAIResponse)
      }
    }
  }))
}));
```

### Performance Testing:
```typescript
test('AI template generation completes within 10 seconds', async () => {
  const startTime = Date.now();
  
  const templates = await generator.generateTemplates({
    vendorType: 'photographer',
    stage: 'inquiry',
    tone: 'friendly',
    includeElements: ['portfolio'],
    variantCount: 5
  });
  
  const endTime = Date.now();
  const duration = endTime - startTime;
  
  expect(duration).toBeLessThan(10000); // 10 seconds
  expect(templates).toHaveLength(5);
});
```

### Visual Testing:
```typescript
test('Template variants display correctly', async () => {
  await mcp__playwright__browser_navigate({
    url: '/dashboard/communications/ai-templates'
  });

  // Generate templates
  await generateSampleTemplates();

  // Take reference screenshot
  await mcp__playwright__browser_take_screenshot({
    filename: 'template-variants-reference.png'
  });

  // Compare with baseline
  await expect(page).toHaveScreenshot('template-variants-baseline.png');
});
```

---

**EXECUTE IMMEDIATELY - This is a comprehensive prompt with all requirements for building the complete testing and documentation infrastructure for the AI email templates system!**