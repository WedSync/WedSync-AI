# TEAM E - ROUND 1: WS-282 - Interactive Dashboard Tour
## 2025-01-20 - Development Round 1

**YOUR MISSION:** Build comprehensive QA testing suite and documentation system for interactive dashboard tour with >90% test coverage and complete user guides
**FEATURE ID:** WS-282 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about comprehensive testing strategies and user experience documentation for wedding industry couples

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/__tests__/tour/comprehensive/
cat $WS_ROOT/wedsync/__tests__/tour/comprehensive/InteractiveTourE2E.test.ts | head -20
```

2. **TYPECHECK RESULTS:**
```bash
npm run typecheck
# MUST show: "No errors found"
```

3. **TEST RESULTS:**
```bash
npm test interactive-tour
# MUST show: "All tests passing" with >90% coverage
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 🧠 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing test patterns and documentation
await mcp__serena__search_for_pattern("test spec documentation guide");
await mcp__serena__find_symbol("test setup coverage", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/__tests__/");
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR ALL UI WORK)
```typescript
// CRITICAL: Load the correct UI Style Guide - General SaaS UI
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load testing and documentation-specific resources
# Use Ref MCP to search for:
# - "Jest React Testing Library patterns"
# - "Playwright E2E testing accessibility"
# - "Next.js testing-strategies integration"
# - "TypeScript test-types coverage"
# - "User documentation best-practices"
```

### D. ANALYZE EXISTING PATTERNS (MINUTES 5-10)
```typescript
// Find existing testing and documentation patterns
await mcp__serena__find_referencing_symbols("test describe expect");
await mcp__serena__search_for_pattern("user guide documentation");
await mcp__serena__find_symbol("test utils helper", "", true);
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPREHENSIVE QA STRATEGY

### QA-Specific Sequential Thinking Patterns

#### Pattern 1: Comprehensive Testing Strategy
```typescript
// Before creating comprehensive test plans
mcp__sequential-thinking__sequential_thinking({
  thought: "Interactive tour testing requires: unit tests for each tour component/function, integration tests between teams A-D implementations, E2E tests for complete couple onboarding flows, accessibility testing for wedding industry compliance, performance testing under load, cross-browser compatibility across devices.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific test scenarios: Couple onboarding with different wedding types (traditional, modern, destination), multi-device tour synchronization testing, educational content accuracy verification, tour abandonment and recovery flows, supplier-couple interaction during tour, mobile venue connectivity simulation.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Documentation needs: User guides for couples with screenshots and step-by-step flows, technical documentation for developers including API specs, accessibility compliance documentation with WCAG standards, troubleshooting guides for common issues, mobile app installation guides with device-specific instructions.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Quality assurance process: Test all team implementations with integration verification, validate team A UI components work with team B APIs and team C analytics, verify team D mobile experience integrates seamlessly, document all bugs with reproduction steps, create user acceptance criteria for couple experience, ensure >90% test coverage across all components.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

**Launch these agents with Serena-enhanced capabilities AND Sequential Thinking guidance:**

1. **task-tracker-coordinator** --think-hard --use-serena --track-dependencies --sequential-thinking-enabled
   - Mission: Break down comprehensive testing requirements, track documentation needs, identify quality gaps
   
2. **test-automation-architect** --think-ultra-hard --semantic-analysis --sequential-thinking-for-architecture
   - Mission: Design comprehensive test strategy, create testing infrastructure, ensure >90% coverage
   
3. **security-compliance-officer** --think-ultra-hard --code-flow-analysis --sequential-thinking-security
   - Mission: Security testing for tour data collection, validate couple data protection, GDPR compliance
   
4. **code-quality-guardian** --continuous --pattern-checking --sequential-thinking-quality
   - Mission: Code quality validation across all teams, pattern consistency, technical debt prevention
   
5. **documentation-specialist** --detailed-evidence --user-journey-focus --sequential-thinking-docs
   - Mission: Create comprehensive user guides, technical docs, accessibility documentation
   
6. **accessibility-champion** --wcag-compliance --inclusive-design --sequential-thinking-accessibility
   - Mission: Accessibility testing, inclusive design validation, compliance documentation

## 📋 STEP 3: SERENA-ENHANCED DEVELOPMENT WORKFLOW

### **EXPLORE PHASE (MANDATORY - NO CODING YET!)**
```typescript
// Find all testing patterns and documentation standards
await mcp__serena__find_symbol("test utility helper", "", true);
await mcp__serena__search_for_pattern("documentation template guide");
await mcp__serena__find_referencing_symbols("accessibility test compliance");
```
- [ ] Identified existing testing patterns to follow
- [ ] Found all documentation standards and templates
- [ ] Understood accessibility testing requirements
- [ ] Located similar comprehensive test suites

### **PLAN PHASE (THINK ULTRA HARD!)**
- [ ] Testing architecture decisions based on existing patterns
- [ ] Test cases written FIRST covering all team integrations (TDD)
- [ ] Documentation structure planned for user and developer needs
- [ ] Quality metrics defined for comprehensive coverage

### **CODE PHASE (FOLLOW PATTERNS!)**
- [ ] Use testing patterns discovered by Serena
- [ ] Maintain consistency with existing test infrastructure
- [ ] Include comprehensive documentation with code examples and screenshots
- [ ] Test continuously across all team implementations

## 🎯 TEAM E SPECIALIZATION: QA/TESTING & DOCUMENTATION FOCUS

**Core Testing & Documentation Components to Build:**

1. **ComprehensiveTourTestSuite** - Complete test coverage for all tour functionality
2. **CrossTeamIntegrationTests** - Integration testing between teams A-D implementations
3. **AccessibilityComplianceValidator** - WCAG compliance testing and validation
4. **PerformanceBenchmarkSuite** - Load testing and performance validation
5. **UserDocumentationSystem** - Complete user guides with interactive examples
6. **TechnicalDocumentationFramework** - Developer documentation with API specs

### Key Testing Areas:
- **Unit Testing**: Every component, function, and utility (>90% coverage)
- **Integration Testing**: Team A-D integration points and data flow
- **E2E Testing**: Complete couple onboarding flows with Playwright
- **Accessibility Testing**: WCAG AA compliance across all tour components
- **Performance Testing**: Load testing, mobile performance, analytics impact
- **Security Testing**: Tour data protection, GDPR compliance, input validation

### Documentation Deliverables:
- **Couple User Guides**: Step-by-step tour guides with screenshots
- **Supplier Integration Docs**: How tour affects supplier workflows
- **Technical Documentation**: API specs, component docs, testing guides
- **Accessibility Documentation**: Compliance reports and inclusive design guides
- **Troubleshooting Guides**: Common issues and resolution steps
- **Mobile Installation Guides**: Device-specific PWA installation instructions

## 📋 TECHNICAL SPECIFICATION

### Comprehensive Testing Requirements:
- **Test Coverage**: >90% line coverage across all tour components
- **Integration Coverage**: Test all team A-D integration points  
- **Performance Benchmarks**: Load testing with 1000+ concurrent tour users
- **Accessibility Compliance**: WCAG AA compliance validation
- **Cross-browser Testing**: Chrome, Safari, Firefox, Edge compatibility
- **Mobile Testing**: iOS Safari, Android Chrome, tablet responsiveness

### Testing Architecture:
```typescript
interface ComprehensiveTourTestSuite {
  // Unit testing framework
  setupUnitTests(): Promise<TestEnvironment>;
  validateComponentFunctionality(component: string): Promise<TestResults>;
  measureCodeCoverage(): Promise<CoverageReport>;
  
  // Integration testing
  testTeamIntegrations(teams: TeamImplementation[]): Promise<IntegrationResults>;
  validateDataFlow(dataPath: DataFlowPath): Promise<ValidationResult>;
  testRealtimeSync(syncScenario: SyncScenario): Promise<SyncResults>;
  
  // E2E testing with Playwright
  runCoupleOnboardingFlow(weddingType: WeddingType): Promise<E2EResults>;
  testMobileExperience(device: MobileDevice): Promise<MobileTestResults>;
  validateAccessibility(page: string): Promise<AccessibilityReport>;
  
  // Performance testing
  loadTestTourSystem(concurrentUsers: number): Promise<LoadTestResults>;
  measureTourPerformance(metrics: PerformanceMetric[]): Promise<PerformanceReport>;
  
  // Documentation generation
  generateUserGuides(userType: UserType): Promise<UserDocumentation>;
  createTechnicalDocs(apiSpecs: APISpecification[]): Promise<TechnicalDocumentation>;
}
```

## 🎯 SPECIFIC DELIVERABLES

### Core Testing Components:
- [ ] **InteractiveTourE2E.test.ts** - Complete E2E test suite for tour flows
- [ ] **TourComponentUnit.test.ts** - Unit tests for all tour components (>90% coverage)
- [ ] **CrossTeamIntegration.test.ts** - Integration tests between teams A-D
- [ ] **TourAccessibility.test.ts** - WCAG compliance and accessibility validation
- [ ] **TourPerformance.test.ts** - Load testing and performance benchmarks

### Documentation System:
- [ ] **CoupleUserGuide.md** - Complete couple onboarding guide with screenshots
- [ ] **SupplierTourIntegration.md** - How tour affects supplier workflows
- [ ] **TechnicalAPIDocumentation.md** - API specifications and integration guides
- [ ] **AccessibilityComplianceReport.md** - WCAG compliance documentation
- [ ] **TroubleshootingGuide.md** - Common issues and resolution procedures

### Quality Assurance Framework:
- [ ] **test-setup-utils.ts** - Shared testing utilities and mock data
- [ ] **tour-test-data.ts** - Comprehensive test data for wedding scenarios
- [ ] **accessibility-test-helpers.ts** - Accessibility testing utilities
- [ ] **performance-benchmarks.ts** - Performance testing and measurement tools

## 🔗 DEPENDENCIES

### What You Need from Other Teams:
- **Team A**: Complete UI components for comprehensive testing
- **Team B**: API endpoints and database schemas for integration testing
- **Team C**: Analytics integration points for data flow testing
- **Team D**: Mobile components for cross-device testing

### What Others Need from You:
- Testing standards and patterns for code quality
- Documentation templates for consistent documentation
- Accessibility requirements for compliant implementation
- Performance benchmarks for optimization targets
- Quality gates for deployment readiness

## 🔒 SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### Security Testing Checklist:
- [ ] **Input validation testing** - Test all tour form inputs for injection attacks
- [ ] **Authentication testing** - Validate couple authentication across tour flows
- [ ] **Session management testing** - Test tour progress session security
- [ ] **Data encryption testing** - Validate tour data encryption in transit and at rest
- [ ] **GDPR compliance testing** - Test data collection consent and deletion flows
- [ ] **Mobile security testing** - Validate PWA security and offline data protection
- [ ] **Analytics security testing** - Test user behavior data collection compliance
- [ ] **Cross-device sync security** - Validate secure synchronization mechanisms

### Security Testing Implementation:
```typescript
// Security test patterns for tour functionality
const securityTestSchema = z.object({
  tourData: z.object({
    coupleId: secureStringSchema,
    tourProgress: z.number().min(0).max(100),
    sessionData: z.object({}).optional(),
    sensitiveData: z.string().optional() // Should be encrypted
  }),
  testScenario: z.enum(['sql_injection', 'xss_attack', 'csrf_test', 'data_leak']),
  expectedResult: z.enum(['blocked', 'sanitized', 'logged', 'encrypted'])
});

// Test security validation middleware
export const testTourSecurity = withSecureValidation(
  securityTestSchema,
  async (request, validatedData) => {
    // Security test implementation
  }
);
```

## 🧪 COMPREHENSIVE TESTING REQUIREMENTS

### 1. UNIT TESTING (>90% Coverage Target)
```typescript
// Tour component unit tests
describe('InteractiveTour Component Suite', () => {
  test('TourStepManager handles step progression correctly', () => {
    // Test step navigation, validation, progress tracking
  });
  
  test('TourAnalyticsTracker records interaction data accurately', () => {
    // Test analytics data collection, validation, transmission
  });
  
  test('EducationalContent loads and displays correctly', () => {
    // Test content loading, caching, mobile optimization
  });
  
  test('TourCompletion triggers proper billing transitions', () => {
    // Test trial-to-paid conversion, webhook triggers
  });
});
```

### 2. INTEGRATION TESTING (Team A-D Integration Points)
```typescript
// Cross-team integration tests
describe('Tour Integration Test Suite', () => {
  test('UI components integrate with backend APIs', async () => {
    // Test Team A components with Team B APIs
    const tourComponent = render(<InteractiveTour />);
    await waitFor(() => expect(mockAPI.getTourContent).toHaveBeenCalled());
  });
  
  test('Analytics integration captures UI interactions', async () => {
    // Test Team A components with Team C analytics
    fireEvent.click(screen.getByTestId('tour-next'));
    expect(mockAnalytics.trackInteraction).toHaveBeenCalledWith('tour_step_advance');
  });
  
  test('Mobile components sync with platform APIs', async () => {
    // Test Team D mobile with Team B APIs
    const mobileComponent = render(<MobileTourInterface />);
    expect(mockDeviceSync.syncProgress).toHaveBeenCalled();
  });
});
```

### 3. E2E TESTING WITH PLAYWRIGHT
```typescript
// Complete user journey testing
describe('Couple Onboarding E2E Flows', () => {
  test('Complete traditional wedding onboarding flow', async ({ page }) => {
    // Test complete couple onboarding journey
    await page.goto('/wedme/tour');
    await page.click('[data-testid="start-tour"]');
    
    // Step through entire tour flow
    for (let step = 1; step <= 8; step++) {
      await page.click('[data-testid="tour-next"]');
      await page.waitForSelector(`[data-testid="tour-step-${step}"]`);
    }
    
    await page.click('[data-testid="complete-tour"]');
    await page.waitForSelector('[data-testid="tour-completion-celebration"]');
  });
  
  test('Mobile cross-device synchronization flow', async ({ browser }) => {
    // Test tour progress sync across devices
    const mobileContext = await browser.newContext({ 
      ...devices['iPhone 12'] 
    });
    const desktopContext = await browser.newContext();
    
    const mobilePage = await mobileContext.newPage();
    const desktopPage = await desktopContext.newPage();
    
    // Start tour on mobile
    await mobilePage.goto('/wedme/tour');
    await mobilePage.click('[data-testid="start-tour"]');
    
    // Continue on desktop
    await desktopPage.goto('/wedme/tour');
    await desktopPage.waitForSelector('[data-testid="tour-resume"]');
  });
});
```

### 4. ACCESSIBILITY TESTING (WCAG AA Compliance)
```typescript
// Comprehensive accessibility validation
describe('Tour Accessibility Compliance', () => {
  test('All tour components meet WCAG AA standards', async () => {
    const { container } = render(<InteractiveTour />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
  
  test('Mobile touch targets meet size requirements', async () => {
    const { container } = render(<MobileTourInterface />);
    const buttons = container.querySelectorAll('button');
    
    buttons.forEach(button => {
      const rect = button.getBoundingClientRect();
      expect(rect.width).toBeGreaterThanOrEqual(44);
      expect(rect.height).toBeGreaterThanOrEqual(44);
    });
  });
  
  test('Color contrast ratios meet accessibility standards', async () => {
    // Test color contrast across all tour components
    const contrastResults = await checkContrast();
    expect(contrastResults.minimumRatio).toBeGreaterThanOrEqual(4.5);
  });
});
```

### 5. PERFORMANCE TESTING
```typescript
// Load testing and performance validation
describe('Tour Performance Benchmarks', () => {
  test('Tour handles 1000+ concurrent users', async () => {
    const loadTestResults = await runLoadTest({
      concurrent: 1000,
      duration: '5m',
      endpoint: '/api/tour/progress'
    });
    
    expect(loadTestResults.averageResponseTime).toBeLessThan(200);
    expect(loadTestResults.errorRate).toBeLessThan(0.01);
  });
  
  test('Mobile tour performance meets benchmarks', async () => {
    const performanceMetrics = await measureMobilePerformance();
    expect(performanceMetrics.firstContentfulPaint).toBeLessThan(1500);
    expect(performanceMetrics.largestContentfulPaint).toBeLessThan(2500);
  });
});
```

## 📚 DOCUMENTATION DELIVERABLES

### 1. USER DOCUMENTATION
- [ ] **Couple Onboarding Guide** - Step-by-step tour guide with screenshots
- [ ] **Mobile Installation Guide** - PWA installation for iOS and Android
- [ ] **Troubleshooting FAQ** - Common issues and quick solutions
- [ ] **Wedding Type Customization** - How tour adapts to different wedding styles
- [ ] **Accessibility Features Guide** - Inclusive design features documentation

### 2. TECHNICAL DOCUMENTATION
- [ ] **API Documentation** - Complete tour API specifications
- [ ] **Component Library Docs** - Interactive tour component documentation
- [ ] **Testing Guide** - How to test tour functionality
- [ ] **Integration Guide** - How tour integrates with existing platform
- [ ] **Performance Optimization** - Best practices for tour performance

### 3. COMPLIANCE DOCUMENTATION
- [ ] **Accessibility Compliance Report** - WCAG AA compliance validation
- [ ] **Security Audit Report** - Security testing results and recommendations
- [ ] **GDPR Compliance Documentation** - Data protection and privacy compliance
- [ ] **Performance Benchmark Report** - Load testing and optimization results

## ✅ ENHANCED SUCCESS CRITERIA (WITH EVIDENCE)

### Testing Implementation:
- [ ] All testing deliverables complete WITH EVIDENCE
- [ ] Tests written FIRST and achieving >90% coverage (show coverage reports)
- [ ] Serena testing patterns followed (list testing patterns used)
- [ ] Zero test failures (show test suite results)
- [ ] Zero accessibility violations (show accessibility audit results)

### Testing Evidence:
```typescript
// Include actual testing code showing:
// 1. Comprehensive unit test coverage
// 2. Integration tests between all teams
// 3. E2E testing with real user scenarios
// 4. Accessibility compliance validation
describe('Interactive Tour Comprehensive Test Suite', () => {
  // Following pattern from __tests__/components/base.test.ts:12-34
  // Serena confirmed this matches 15+ other component test suites
  
  beforeEach(() => {
    // Test setup following established patterns
  });
  
  test('tour component integration with all teams', async () => {
    // Comprehensive integration testing implementation
  });
});
```

### Quality Evidence:
```javascript
// Required testing metrics with actual measurements
const qualityMetrics = {
  unitTestCoverage: "94.7%", // Target: >90%
  integrationTestCoverage: "87.3%", // Target: >80%
  e2eTestSuccess: "100%", // Target: 100%
  accessibilityScore: "98/100", // Target: >95
  performanceScore: "96/100", // Target: >90
  securityTestsPassed: "45/45" // Target: 100%
}
```

## 💾 WHERE TO SAVE

### Testing Files:
- **Unit Tests**: `$WS_ROOT/wedsync/__tests__/tour/unit/`
- **Integration Tests**: `$WS_ROOT/wedsync/__tests__/tour/integration/`
- **E2E Tests**: `$WS_ROOT/wedsync/__tests__/tour/e2e/`
- **Performance Tests**: `$WS_ROOT/wedsync/__tests__/tour/performance/`

### Documentation Files:
- **User Guides**: `$WS_ROOT/wedsync/docs/user-guides/tour/`
- **Technical Docs**: `$WS_ROOT/wedsync/docs/technical/tour/`
- **API Documentation**: `$WS_ROOT/wedsync/docs/api/tour/`
- **Compliance Reports**: `$WS_ROOT/wedsync/docs/compliance/tour/`

### Quality Assurance Files:
- **Test Utilities**: `$WS_ROOT/wedsync/__tests__/utils/tour/`
- **Test Data**: `$WS_ROOT/wedsync/__tests__/fixtures/tour/`
- **Reports**: `$WS_ROOT/WORKFLOW-V2-DRAFT/INBOX/senior-dev/`

## ⚠️ CRITICAL WARNINGS

### Testing-Specific Risks:
- **False Positives**: Tests that pass but don't actually validate functionality - ensure comprehensive assertions
- **Integration Gaps**: Missing tests between team implementations - validate all integration points
- **Performance Regression**: Tour additions could impact site performance - benchmark before/after
- **Accessibility Violations**: Tour components must meet WCAG standards - automated and manual testing required
- **Mobile Testing Gaps**: Desktop-focused tests missing mobile edge cases - comprehensive device testing required

### Wedding Industry Testing Considerations:
- **Peak Usage Testing**: Engagement season (Nov-Feb) brings 10x traffic - load test for peak conditions
- **Emotional Context**: Wedding planning is stressful - test error recovery and user forgiveness patterns
- **Multi-Device Reality**: Couples switch devices frequently - test synchronization extensively
- **Real Wedding Data**: Test with realistic wedding data volumes and complexity
- **Vendor Integration**: Tour affects supplier workflows - test supplier impact and integration points

## 🏁 COMPLETION CHECKLIST (WITH COMPREHENSIVE VERIFICATION)

### Testing Coverage Verification:
```bash
# Verify comprehensive test coverage >90%
npm run test -- --coverage --verbose
# Should show >90% line coverage across all tour components

# Run all test suites
npm run test:unit && npm run test:integration && npm run test:e2e
# Should show all tests passing

# Accessibility testing
npm run test:accessibility
# Should show zero WCAG violations

# Performance testing
npm run test:performance
# Should show benchmarks met

# Security testing
npm run test:security
# Should show all security tests passing
```

### Final Quality Assurance Checklist:
- [ ] Unit test coverage >90% with meaningful assertions
- [ ] Integration tests cover all team A-D interaction points
- [ ] E2E tests cover complete couple onboarding flows
- [ ] Accessibility tests show WCAG AA compliance
- [ ] Performance tests meet mobile and desktop benchmarks
- [ ] Security tests validate data protection and privacy
- [ ] Cross-browser compatibility verified
- [ ] Mobile device testing completed across iOS and Android
- [ ] Documentation complete with screenshots and examples
- [ ] TypeScript compiles with NO errors
- [ ] All tests pass including edge cases

### Documentation Completeness Verification:
- [ ] Couple user guides complete with step-by-step instructions
- [ ] Technical documentation covers all APIs and components
- [ ] Accessibility documentation shows compliance validation
- [ ] Troubleshooting guides cover common issues
- [ ] Mobile installation guides are device-specific
- [ ] Performance optimization guidelines documented

### Quality Metrics Achieved:
- [ ] Test coverage: >90% (unit), >80% (integration), 100% (E2E)
- [ ] Accessibility score: >95/100 (Lighthouse)
- [ ] Performance score: >90/100 (mobile and desktop)
- [ ] Security tests: 100% passing
- [ ] Cross-browser compatibility: Chrome, Safari, Firefox, Edge
- [ ] Mobile compatibility: iOS Safari, Android Chrome

---

**EXECUTE IMMEDIATELY - Build the comprehensive testing and documentation system that ensures tour quality exceeds wedding industry standards!**