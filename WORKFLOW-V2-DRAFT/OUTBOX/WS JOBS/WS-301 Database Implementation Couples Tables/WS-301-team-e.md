# TEAM E - ROUND 1: WS-301 - Database Implementation - Couples Tables
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Build comprehensive QA testing suite and documentation for couples database system
**FEATURE ID:** WS-301 (Track all work with this ID)  
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about wedding data integrity, user experience validation, and comprehensive testing scenarios

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/tests/couples/
cat $WS_ROOT/wedsync/tests/couples/integration.test.ts | head -20
```

2. **TEST EXECUTION PROOF:**
```bash
npm test couples
# MUST show: ">90% coverage" and "All tests passing"
```

3. **DOCUMENTATION PROOF:**
```bash
ls -la $WS_ROOT/wedsync/docs/couples/
cat $WS_ROOT/wedsync/docs/couples/user-guide.md | head -20
```

4. **ACCESSIBILITY TESTING PROOF:**
```bash
npm run test:a11y couples
# MUST show: "WCAG 2.1 AA compliance verified"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query testing patterns and documentation structures
await mcp__serena__search_for_pattern("test spec describe couples");
await mcp__serena__find_symbol("test describe it", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/tests/");
```

### B. TESTING PATTERNS ANALYSIS
```typescript
// Load existing testing patterns and documentation
await mcp__serena__search_for_pattern("jest playwright vitest testing");
await mcp__serena__find_symbol("expect toBeInTheDocument", "", true);
await mcp__serena__read_file("$WS_ROOT/wedsync/tests/setup.ts");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Use Ref MCP to search for:
ref_search_documentation("Jest testing best practices database testing")
ref_search_documentation("Playwright accessibility testing WCAG")
ref_search_documentation("React Testing Library user interactions")
ref_search_documentation("Supabase testing patterns mock data")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPREHENSIVE QA STRATEGY

### QA-Specific Sequential Thinking Patterns

#### Pattern 1: Comprehensive Wedding Data Testing Strategy
```typescript
// Before creating couples database testing strategy
mcp__sequential-thinking__sequential_thinking({
  thought: "Couples database testing needs comprehensive coverage: unit tests for all database operations, integration tests for API endpoints, E2E tests for complete wedding workflows, accessibility testing for all age groups, performance testing for large guest lists, security testing for data privacy, mobile testing for wedding day usage.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding-specific test scenarios: couple profile creation with both partners, guest list management for 500+ people, RSVP tracking with dietary requirements, task delegation to wedding party members, supplier connection with permission boundaries, timeline coordination across multiple vendors, budget privacy enforcement.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Critical failure scenarios to test: data loss during wedding planning, privacy breaches between couples, unauthorized access to budget information, RSVP system failures during deadline periods, task assignment notifications not delivered, real-time sync failures between partner devices, mobile app crashes during ceremony.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "User experience testing priorities: intuitive navigation for stressed couples, form completion under time pressure, mobile usability at venues with poor lighting, accessibility for older family members helping with planning, error recovery when network fails, data recovery after accidental deletion.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Documentation needs: user guides for couples and wedding party, technical documentation for integration teams, API documentation for suppliers, troubleshooting guides for common wedding scenarios, accessibility compliance reports, security audit documentation, performance benchmarks.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Test-driven development with wedding user stories, comprehensive fixture data for realistic testing, automated accessibility testing with Playwright, performance testing with large datasets, security testing with penetration scenarios, cross-browser compatibility for all devices, continuous monitoring and alerting.",
  nextThoughtNeeded: false,
  thoughtNumber: 6,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Track testing coverage across all team implementations
2. **test-automation-architect** - Use Serena for testing pattern consistency and comprehensive coverage
3. **security-compliance-officer** - Security testing and vulnerability assessment
4. **code-quality-guardian** - Code quality metrics and performance benchmarks
5. **documentation-chronicler** - Comprehensive user and technical documentation
6. **user-impact-analyzer** - User experience validation and accessibility compliance

## 🔒 SECURITY TESTING REQUIREMENTS (NON-NEGOTIABLE!)

### DATABASE SECURITY TESTING CHECKLIST:
- [ ] **RLS policy testing** - Verify couples can only access their own data
- [ ] **Permission boundary testing** - Ensure suppliers see only permitted data
- [ ] **SQL injection testing** - Validate all database queries are parameterized
- [ ] **Data encryption testing** - Verify sensitive data is encrypted at rest
- [ ] **Audit logging testing** - Ensure all sensitive operations are logged
- [ ] **Access control testing** - Test authentication and authorization flows
- [ ] **Privacy compliance testing** - GDPR compliance for guest data
- [ ] **Data retention testing** - Verify soft delete and recovery procedures

### API SECURITY TESTING CHECKLIST:
- [ ] **Input validation testing** - Test all API endpoints with malicious input
- [ ] **Authentication testing** - Verify JWT token validation and expiration
- [ ] **Rate limiting testing** - Test API rate limits prevent abuse
- [ ] **CORS testing** - Verify cross-origin requests are properly handled
- [ ] **Error handling testing** - Ensure no sensitive data leaked in errors
- [ ] **Session management testing** - Test session timeout and invalidation

## 🎯 TEAM E SPECIALIZATION: QA/TESTING & DOCUMENTATION FOCUS

**QA/TESTING REQUIREMENTS:**
- Comprehensive test suite with >90% code coverage
- End-to-end testing with Playwright for complete user workflows
- Accessibility testing ensuring WCAG 2.1 AA compliance
- Performance testing for wedding-scale data loads
- Cross-browser and cross-device compatibility testing
- Security testing and penetration testing
- User acceptance testing with real wedding scenarios
- Continuous integration and automated testing

**DOCUMENTATION REQUIREMENTS:**
- User guides with step-by-step screenshots
- Technical documentation for developers
- API documentation with examples
- Troubleshooting guides for common issues
- Accessibility compliance documentation
- Security audit reports
- Performance benchmarks and optimization guides

## 📋 TECHNICAL SPECIFICATION

**Comprehensive Testing Suite to Build:**

### 1. Unit Tests for Database Operations
```typescript
// tests/couples/database.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';
import { CouplesDatabase } from '@/lib/database/couples';

describe('Couples Database Operations', () => {
  let couplesDb: CouplesDatabase;
  let testCouple: any;

  beforeEach(async () => {
    couplesDb = new CouplesDatabase();
    // Create test data
    testCouple = await couplesDb.createCouple({
      partner1_first_name: 'Emma',
      partner1_email: 'emma@test.com',
      partner2_first_name: 'James',
      partner2_email: 'james@test.com'
    });
  });

  afterEach(async () => {
    // Clean up test data
    await couplesDb.deleteCouple(testCouple.id);
  });

  describe('Couple Profile Management', () => {
    it('should create couple with valid data', async () => {
      expect(testCouple.id).toBeDefined();
      expect(testCouple.partner1_first_name).toBe('Emma');
      expect(testCouple.partner2_first_name).toBe('James');
    });

    it('should enforce email uniqueness', async () => {
      await expect(couplesDb.createCouple({
        partner1_first_name: 'John',
        partner1_email: 'emma@test.com' // Duplicate email
      })).rejects.toThrow('Email already exists');
    });

    it('should validate email format', async () => {
      await expect(couplesDb.createCouple({
        partner1_first_name: 'John',
        partner1_email: 'invalid-email' // Invalid format
      })).rejects.toThrow('Invalid email format');
    });

    it('should update couple profile', async () => {
      const updates = { 
        couple_display_name: 'Emma & James',
        wedding_hashtag: '#EmmaAndJames2025'
      };
      
      await couplesDb.updateCoupleProfile(testCouple.id, updates);
      const updated = await couplesDb.getCoupleProfile(testCouple.id);
      
      expect(updated.couple_display_name).toBe('Emma & James');
      expect(updated.wedding_hashtag).toBe('#EmmaAndJames2025');
    });
  });

  describe('Core Wedding Fields', () => {
    it('should create default core fields when couple created', async () => {
      const coreFields = await couplesDb.getCoreFields(testCouple.id);
      
      expect(coreFields).toBeDefined();
      expect(coreFields.couple_id).toBe(testCouple.id);
      expect(coreFields.completion_percentage).toBe(0);
    });

    it('should calculate completion percentage correctly', async () => {
      await couplesDb.updateCoreFields(testCouple.id, {
        wedding_date: '2025-06-15',
        ceremony_venue_name: 'Central Park',
        guest_count_estimated: 150
      });
      
      const coreFields = await couplesDb.getCoreFields(testCouple.id);
      expect(coreFields.completion_percentage).toBeGreaterThan(0);
    });

    it('should trigger supplier notifications on core field updates', async () => {
      const mockSupplier = await createMockSupplier();
      await couplesDb.connectSupplier(testCouple.id, mockSupplier.id, {
        service_type: 'photography'
      });
      
      const notificationSpy = jest.spyOn(couplesDb, 'notifyConnectedSuppliers');
      
      await couplesDb.updateCoreFields(testCouple.id, {
        guest_count_estimated: 200
      });
      
      expect(notificationSpy).toHaveBeenCalledWith(testCouple.id, 
        expect.objectContaining({ guest_count_estimated: 200 })
      );
    });
  });

  describe('Guest Management', () => {
    it('should add guests to couple', async () => {
      const guest = await couplesDb.createGuest(testCouple.id, {
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        guest_side: 'partner1',
        plus_one_allowed: true
      });
      
      expect(guest.id).toBeDefined();
      expect(guest.first_name).toBe('John');
      expect(guest.couple_id).toBe(testCouple.id);
    });

    it('should handle RSVP updates', async () => {
      const guest = await couplesDb.createGuest(testCouple.id, {
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        guest_side: 'partner2'
      });
      
      await couplesDb.updateGuestRSVP(guest.id, {
        rsvp_status: 'yes',
        attending_ceremony: true,
        attending_reception: true,
        dietary_requirements: ['vegetarian']
      });
      
      const updatedGuest = await couplesDb.getGuest(guest.id);
      expect(updatedGuest.rsvp_status).toBe('yes');
      expect(updatedGuest.dietary_requirements).toContain('vegetarian');
      expect(updatedGuest.rsvp_date).toBeDefined();
    });

    it('should filter guests correctly', async () => {
      // Create test guests with different statuses
      await couplesDb.createGuest(testCouple.id, {
        first_name: 'Attending',
        last_name: 'Guest',
        rsvp_status: 'yes'
      });
      
      await couplesDb.createGuest(testCouple.id, {
        first_name: 'Declined',
        last_name: 'Guest',
        rsvp_status: 'no'
      });
      
      const attendingGuests = await couplesDb.getGuestList(testCouple.id, {
        rsvp_status: 'yes'
      });
      
      expect(attendingGuests).toHaveLength(1);
      expect(attendingGuests[0].first_name).toBe('Attending');
    });
  });

  describe('Task Delegation', () => {
    it('should create and assign tasks', async () => {
      const helper = await couplesDb.createGuest(testCouple.id, {
        first_name: 'Helper',
        last_name: 'Friend',
        is_helper: true,
        helper_role: 'Maid of Honor'
      });
      
      const task = await couplesDb.createTask(testCouple.id, {
        task_title: 'Setup ceremony chairs',
        task_description: 'Arrange chairs for 150 guests',
        task_category: 'setup',
        task_timing: 'before_ceremony',
        priority: 'high'
      });
      
      await couplesDb.assignTask(task.id, {
        assigned_to_guest_id: helper.id,
        assigned_to_name: 'Helper Friend',
        delivery_method: 'email'
      });
      
      const assignedTask = await couplesDb.getTask(task.id);
      expect(assignedTask.status).toBe('assigned');
      expect(assignedTask.assigned_to_guest_id).toBe(helper.id);
      expect(assignedTask.assigned_at).toBeDefined();
    });
  });

  describe('Security and Permissions', () => {
    it('should enforce RLS policies', async () => {
      // Test that couple can only access their own data
      const otherCouple = await couplesDb.createCouple({
        partner1_first_name: 'Other',
        partner1_email: 'other@test.com'
      });
      
      // Should not be able to access other couple's data
      await expect(couplesDb.getCoupleProfile(otherCouple.id))
        .rejects.toThrow('Access denied');
    });

    it('should filter supplier data based on permissions', async () => {
      const supplier = await createMockSupplier();
      await couplesDb.connectSupplier(testCouple.id, supplier.id, {
        service_type: 'photography',
        can_view_guests: false,
        can_view_budget: false
      });
      
      const supplierData = await couplesDb.getSupplierVisibleData(
        testCouple.id, 
        supplier.id
      );
      
      expect(supplierData.guests).toBeUndefined();
      expect(supplierData.budget_total).toBeUndefined();
      expect(supplierData.core_fields).toBeDefined();
    });
  });
});
```

### 2. Integration Tests for API Endpoints
```typescript
// tests/couples/api.test.ts
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import { POST as createCoupleHandler } from '@/app/api/couples/profile/route';
import { GET as getCoupleHandler } from '@/app/api/couples/profile/route';

describe('Couples API Endpoints', () => {
  describe('POST /api/couples/profile', () => {
    it('should require authentication', async () => {
      const { req, res } = createMocks({
        method: 'POST',
        body: { partner1_first_name: 'Test' }
      });

      await createCoupleHandler(req);
      
      expect(res._getStatusCode()).toBe(401);
      expect(JSON.parse(res._getData())).toEqual({
        error: 'Authentication required'
      });
    });

    it('should validate input data', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: { invalid: 'data' }
      });

      const response = await createCoupleHandler(req);
      const responseData = await response.json();
      
      expect(response.status).toBe(400);
      expect(responseData.error).toContain('Validation failed');
    });

    it('should create couple with valid data', async () => {
      const { req } = createMocks({
        method: 'POST',
        headers: { authorization: 'Bearer valid-token' },
        body: {
          partner1_first_name: 'Emma',
          partner1_email: 'emma@example.com',
          partner2_first_name: 'James'
        }
      });

      const response = await createCoupleHandler(req);
      const responseData = await response.json();
      
      expect(response.status).toBe(201);
      expect(responseData.id).toBeDefined();
      expect(responseData.partner1_first_name).toBe('Emma');
    });
  });

  describe('GET /api/couples/guests', () => {
    it('should return filtered guest list', async () => {
      const { req } = createMocks({
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' },
        query: { rsvp_status: 'yes' }
      });

      const response = await getCoupleHandler(req);
      const responseData = await response.json();
      
      expect(response.status).toBe(200);
      expect(Array.isArray(responseData)).toBe(true);
      expect(responseData.every(guest => guest.rsvp_status === 'yes')).toBe(true);
    });
  });
});
```

### 3. End-to-End Tests with Playwright
```typescript
// tests/couples/e2e.test.ts
import { test, expect } from '@playwright/test';

test.describe('Couples Database E2E Workflows', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test couple
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'emma@test.com');
    await page.fill('[data-testid="password"]', 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page).toHaveURL('/couples/dashboard');
  });

  test('complete couple profile creation workflow', async ({ page }) => {
    await page.click('[data-testid="profile-settings"]');
    
    // Fill partner 1 information
    await page.fill('[data-testid="partner1-first-name"]', 'Emma');
    await page.fill('[data-testid="partner1-last-name"]', 'Wilson');
    await page.fill('[data-testid="partner1-phone"]', '+1-555-0123');
    
    // Fill partner 2 information
    await page.fill('[data-testid="partner2-first-name"]', 'James');
    await page.fill('[data-testid="partner2-last-name"]', 'Wilson');
    await page.fill('[data-testid="partner2-email"]', 'james@example.com');
    
    // Set couple preferences
    await page.fill('[data-testid="couple-display-name"]', 'Emma & James');
    await page.selectOption('[data-testid="contact-method"]', 'email');
    await page.selectOption('[data-testid="contact-person"]', 'both');
    
    await page.click('[data-testid="save-profile"]');
    
    // Verify success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Profile updated successfully'
    );
    
    // Verify data persisted
    await page.reload();
    await expect(page.locator('[data-testid="partner1-first-name"]')).toHaveValue('Emma');
    await expect(page.locator('[data-testid="couple-display-name"]')).toHaveValue('Emma & James');
  });

  test('wedding planning workflow with core fields', async ({ page }) => {
    await page.click('[data-testid="wedding-details"]');
    
    // Set wedding date
    await page.fill('[data-testid="wedding-date"]', '2025-06-15');
    
    // Set ceremony details
    await page.fill('[data-testid="ceremony-venue"]', 'Central Park Conservatory');
    await page.fill('[data-testid="ceremony-time"]', '15:00');
    
    // Set reception details
    await page.check('[data-testid="different-reception-venue"]');
    await page.fill('[data-testid="reception-venue"]', 'Plaza Hotel Ballroom');
    await page.fill('[data-testid="reception-time"]', '18:00');
    
    // Set guest count
    await page.fill('[data-testid="guest-count"]', '150');
    
    await page.click('[data-testid="save-wedding-details"]');
    
    // Verify completion percentage updated
    await expect(page.locator('[data-testid="completion-percentage"]')).toContainText('60%');
    
    // Verify supplier notification triggered
    await expect(page.locator('[data-testid="supplier-notification"]')).toContainText(
      'Connected suppliers have been notified of your updates'
    );
  });

  test('guest management workflow', async ({ page }) => {
    await page.click('[data-testid="guest-management"]');
    
    // Add new guest
    await page.click('[data-testid="add-guest-button"]');
    await page.fill('[data-testid="guest-first-name"]', 'John');
    await page.fill('[data-testid="guest-last-name"]', 'Smith');
    await page.fill('[data-testid="guest-email"]', 'john@example.com');
    await page.selectOption('[data-testid="guest-side"]', 'partner1');
    await page.selectOption('[data-testid="guest-type"]', 'family');
    await page.fill('[data-testid="guest-relationship"]', 'Brother');
    await page.check('[data-testid="plus-one-allowed"]');
    
    await page.click('[data-testid="save-guest"]');
    
    // Verify guest appears in list
    await expect(page.locator('[data-testid="guest-list"]')).toContainText('John Smith');
    
    // Test RSVP update
    await page.click('[data-testid="guest-john-smith"]');
    await page.selectOption('[data-testid="rsvp-status"]', 'yes');
    await page.check('[data-testid="attending-ceremony"]');
    await page.check('[data-testid="attending-reception"]');
    await page.fill('[data-testid="dietary-requirements"]', 'Vegetarian');
    
    await page.click('[data-testid="update-rsvp"]');
    
    // Verify RSVP stats updated
    await expect(page.locator('[data-testid="attending-count"]')).toContainText('1');
  });

  test('task delegation workflow', async ({ page }) => {
    // First create a helper
    await page.click('[data-testid="guest-management"]');
    await page.click('[data-testid="add-guest-button"]');
    await page.fill('[data-testid="guest-first-name"]', 'Sarah');
    await page.fill('[data-testid="guest-last-name"]', 'Johnson');
    await page.check('[data-testid="is-helper"]');
    await page.fill('[data-testid="helper-role"]', 'Maid of Honor');
    await page.click('[data-testid="save-guest"]');
    
    // Create and assign task
    await page.click('[data-testid="task-management"]');
    await page.click('[data-testid="create-task-button"]');
    
    await page.fill('[data-testid="task-title"]', 'Setup bridal suite');
    await page.fill('[data-testid="task-description"]', 'Prepare bridal suite with flowers and refreshments');
    await page.selectOption('[data-testid="task-category"]', 'setup');
    await page.selectOption('[data-testid="task-timing"]', 'before_ceremony');
    await page.selectOption('[data-testid="priority"]', 'high');
    
    await page.click('[data-testid="save-task"]');
    
    // Assign task to helper
    await page.click('[data-testid="assign-task"]');
    await page.selectOption('[data-testid="assign-to-helper"]', 'Sarah Johnson');
    await page.selectOption('[data-testid="delivery-method"]', 'email');
    
    await page.click('[data-testid="assign-task-confirm"]');
    
    // Verify task assigned
    await expect(page.locator('[data-testid="task-status"]')).toContainText('Assigned');
    await expect(page.locator('[data-testid="assigned-to"]')).toContainText('Sarah Johnson');
  });

  test('mobile responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/couples/dashboard');
    
    // Verify mobile navigation works
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    
    // Test touch interactions
    await page.tap('[data-testid="guest-management-card"]');
    await expect(page).toHaveURL(/guest/);
    
    // Test swipe gesture on guest card
    const guestCard = page.locator('[data-testid="guest-card-1"]');
    await guestCard.hover();
    await page.mouse.down();
    await page.mouse.move(200, 0); // Swipe right
    await page.mouse.up();
    
    // Verify RSVP action triggered
    await expect(page.locator('[data-testid="rsvp-confirmation"]')).toBeVisible();
  });
});
```

### 4. Accessibility Testing
```typescript
// tests/couples/accessibility.test.ts
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Couples Database Accessibility', () => {
  test('should meet WCAG 2.1 AA standards', async ({ page }) => {
    await page.goto('/couples/profile');
    await injectAxe(page);
    
    // Check accessibility of main profile page
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    await page.goto('/couples/profile');
    
    // Test tab navigation through form fields
    await page.keyboard.press('Tab'); // First name field
    await expect(page.locator('[data-testid="partner1-first-name"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Last name field
    await expect(page.locator('[data-testid="partner1-last-name"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Email field
    await expect(page.locator('[data-testid="partner1-email"]')).toBeFocused();
    
    // Test form submission with Enter key
    await page.fill('[data-testid="partner1-first-name"]', 'Test');
    await page.keyboard.press('Enter');
    
    // Should trigger form validation
    await expect(page.locator('[data-testid="validation-message"]')).toBeVisible();
  });

  test('should have proper ARIA labels and descriptions', async ({ page }) => {
    await page.goto('/couples/guest-management');
    
    // Check ARIA labels on guest list
    await expect(page.locator('[role="list"]')).toHaveAttribute('aria-label', 'Wedding guest list');
    
    // Check guest cards have proper labels
    const guestCard = page.locator('[data-testid="guest-card-1"]');
    await expect(guestCard).toHaveAttribute('role', 'listitem');
    await expect(guestCard).toHaveAttribute('aria-label', /Guest: .+ RSVP status: .+/);
    
    // Check form fields have labels
    await page.click('[data-testid="add-guest-button"]');
    await expect(page.locator('[data-testid="guest-first-name"]')).toHaveAttribute('aria-labelledby');
    await expect(page.locator('[data-testid="guest-email"]')).toHaveAttribute('aria-describedby');
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/couples/timeline');
    
    // Check that timeline events are properly announced
    const timelineEvent = page.locator('[data-testid="timeline-event-1"]');
    await expect(timelineEvent).toHaveAttribute('role', 'article');
    await expect(timelineEvent).toHaveAttribute('aria-labelledby');
    
    // Check live regions for dynamic updates
    await page.click('[data-testid="update-event-time"]');
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
  });
});
```

### 5. Performance Testing
```typescript
// tests/couples/performance.test.ts
import { test, expect } from '@playwright/test';

test.describe('Couples Database Performance', () => {
  test('should load couple dashboard quickly', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/couples/dashboard');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // Under 2 seconds
    
    // Check Core Web Vitals
    const metrics = await page.evaluate(() => ({
      LCP: performance.getEntriesByType('largest-contentful-paint')[0]?.startTime,
      FCP: performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')?.startTime,
      CLS: performance.getEntriesByType('layout-shift').reduce((sum, entry) => sum + entry.value, 0)
    }));
    
    expect(metrics.LCP).toBeLessThan(2500); // LCP under 2.5s
    expect(metrics.FCP).toBeLessThan(1800); // FCP under 1.8s
    expect(metrics.CLS).toBeLessThan(0.1); // CLS under 0.1
  });

  test('should handle large guest lists efficiently', async ({ page }) => {
    // Create test data with 500 guests
    await page.goto('/couples/guest-management');
    
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="guest-list"]');
    const renderTime = Date.now() - startTime;
    
    expect(renderTime).toBeLessThan(1000); // Render 500 guests in under 1s
    
    // Test scrolling performance
    await page.evaluate(() => {
      const guestList = document.querySelector('[data-testid="guest-list"]');
      guestList?.scrollTo({ top: 5000, behavior: 'smooth' });
    });
    
    // Should maintain 60fps during scroll
    const scrollMetrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        const frames: number[] = [];
        let lastTime = performance.now();
        
        function measureFrame() {
          const currentTime = performance.now();
          frames.push(1000 / (currentTime - lastTime));
          lastTime = currentTime;
          
          if (frames.length < 60) {
            requestAnimationFrame(measureFrame);
          } else {
            const avgFPS = frames.reduce((a, b) => a + b) / frames.length;
            resolve(avgFPS);
          }
        }
        
        requestAnimationFrame(measureFrame);
      });
    });
    
    expect(scrollMetrics).toBeGreaterThan(55); // Maintain >55 FPS
  });
});
```

## 💾 WHERE TO SAVE YOUR WORK
- Unit Tests: $WS_ROOT/wedsync/tests/couples/
- Integration Tests: $WS_ROOT/wedsync/tests/api/couples/
- E2E Tests: $WS_ROOT/wedsync/tests/e2e/couples/
- Accessibility Tests: $WS_ROOT/wedsync/tests/a11y/couples/
- Performance Tests: $WS_ROOT/wedsync/tests/performance/couples/
- Documentation: $WS_ROOT/wedsync/docs/couples/
- User Guides: $WS_ROOT/wedsync/docs/user-guides/couples/

## 📚 COMPREHENSIVE DOCUMENTATION TO CREATE

### 1. User Guide for Couples
```markdown
# WedSync Couples Guide - Managing Your Wedding Data

## Getting Started

### Creating Your Couple Profile
Your couple profile is the heart of your wedding planning on WedSync. Here's how to set it up:

1. **Partner Information**
   - Add both partners' names, emails, and contact preferences
   - Set pronouns for inclusive communication
   - Choose your preferred contact method and primary contact person

2. **Wedding Display Name**
   - This appears across all your wedding materials
   - Examples: "Emma & James", "The Wilson Wedding", "E+J 2025"

3. **Wedding Hashtag**
   - Create a unique hashtag for your wedding
   - This will be used across social media and your wedding website

### Setting Up Your Wedding Details

Your core wedding fields auto-populate across all connected suppliers, saving you time:

- **Wedding Date**: Set your ceremony date and flexibility options
- **Venue Information**: Ceremony and reception locations
- **Guest Count**: Estimated numbers help suppliers plan appropriately
- **Wedding Style**: Colors and themes for consistent vendor communication

### Managing Your Guest List

#### Adding Guests
1. Click "Guest Management" from your dashboard
2. Select "Add Guest" 
3. Fill in guest information:
   - Names and contact details
   - Which partner's side (for seating arrangements)
   - Relationship to couple
   - Plus-one permissions
   - Dietary restrictions and accessibility needs

#### RSVP Tracking
- Monitor RSVP responses in real-time
- View dietary requirements summary for catering
- Track attendance for ceremony vs. reception
- Export guest lists for vendors as needed

#### Photo Groups
Organize guests into photo groups to help your photographer:
- Immediate family
- Extended family
- Wedding party
- College friends
- Work colleagues

### Task Delegation

Assign wedding tasks to your helpers:

1. **Create Tasks**
   - Task title and detailed description
   - Category (setup, guest management, emergency, etc.)
   - Timing (before ceremony, during reception, etc.)
   - Priority level and estimated duration

2. **Assign to Helpers**
   - Select from your guest list who are marked as helpers
   - Choose delivery method (email, SMS, in-app)
   - Set task deadlines and reminders

3. **Track Progress**
   - Monitor task completion status
   - Send thank you messages to helpers
   - Update task assignments as needed

### Working with Suppliers

#### Connecting Suppliers
When suppliers invite you to connect:
1. Review the invitation details
2. Set permission levels:
   - Can view guest list (for photographers, caterers)
   - Can view other suppliers (for coordination)
   - Can edit timeline (for wedding coordinators)
   - Budget information always stays private

#### Auto-Population Benefits
When you update your core wedding details, connected suppliers automatically receive:
- Updated guest counts
- Venue changes
- Timeline adjustments
- Contact preference updates

This eliminates the need to manually update each vendor separately.

### Privacy and Security

#### What Suppliers Can See
- Basic wedding details (date, venue, guest count)
- Guest information (only if you grant permission)
- Timeline events relevant to their services
- **NEVER**: Budget information or private notes

#### What Stays Private
- Your wedding budget and financial information
- Private conversations between partners
- Personal family details unless specifically shared
- Guest information for vendors without permission

### Mobile Access

Use WedSync on your phone for:
- Quick RSVP updates during family calls
- Task assignments while coordinating with wedding party
- Timeline reviews during vendor meetings
- Photo sharing with suppliers
- Emergency contact access on wedding day

### Troubleshooting

#### Common Issues
**"My supplier can't see my guest count"**
- Check supplier permissions in "Connected Suppliers"
- Ensure supplier connection status is "Connected"
- Verify you've saved your core wedding details

**"Changes aren't showing for my partner"**
- Both partners need to be logged in to see real-time updates
- Try refreshing the page or logging out and back in
- Check your internet connection

**"I accidentally deleted a guest"**
- Deleted guests are recoverable for 30 days
- Contact support with the guest's name and email
- We can restore the guest and their RSVP information

#### Getting Help
- Email: support@wedsync.com
- Phone: 1-800-WEDSYNC (weekdays 9am-6pm EST)
- Live chat: Available in the app during business hours
- Emergency wedding day support: 24/7 hotline for critical issues
```

### 2. Technical Documentation
```markdown
# Couples Database Technical Documentation

## Architecture Overview

The couples database system consists of 5 interconnected PostgreSQL tables designed for wedding coordination data management:

### Database Schema

#### Couples Table
Primary table storing couple account information with support for both partners.

**Key Features:**
- Support for different-sex and same-sex couples
- Flexible contact preferences
- Audit trails for all changes
- Soft delete with 30-day recovery

#### Core Fields Table
Auto-population system for wedding details that sync across suppliers.

**Triggers:**
- Automatic completion percentage calculation
- Real-time supplier notifications via Supabase channels
- Wedding website updates when public fields change

#### Guest Management
Comprehensive guest tracking with RSVP management.

**Features:**
- Household grouping for mailing addresses
- Photo group organization for photographers
- Dietary restriction tracking
- Helper designation for task assignment

### API Endpoints

All API endpoints use the `withSecureValidation` middleware pattern:

```typescript
export const POST = withSecureValidation(
  validationSchema,
  async (request, validatedData) => {
    // Implementation
  }
);
```

#### Security Middleware
- Input validation with Zod schemas
- SQL injection prevention
- Rate limiting (5 requests/minute for mutations)
- Authentication verification
- Audit logging for sensitive operations

### Real-Time Integration

#### Supabase Realtime Channels
- `couple_{id}_core_fields` - Core wedding field updates
- `couple_{id}_guests` - Guest list and RSVP changes  
- `couple_{id}_tasks` - Task assignment and completion updates

#### Supplier Notifications
When core fields update, the system:
1. Queries connected suppliers with permissions
2. Filters data based on permission settings
3. Broadcasts filtered updates to supplier channels
4. Logs notification delivery for audit

### Performance Considerations

#### Database Indexes
- `idx_couples_auth_user` - Primary user lookup
- `idx_guests_couple_rsvp` - Guest list filtering
- `idx_tasks_couple_status` - Task queries by status

#### Caching Strategy
- Core fields cached for 5 minutes
- Guest lists cached for 1 minute
- Real-time updates invalidate relevant caches

### Security Architecture

#### Row Level Security Policies
- Couples can only access their own data
- Suppliers see only permitted data based on connections
- Budget information never visible to suppliers
- Soft deletes prevent accidental data loss

#### Data Encryption
- All sensitive data encrypted at rest
- Budget amounts stored with additional encryption
- Guest personal information protected under GDPR

### Testing Strategy

#### Unit Tests (90%+ coverage required)
- Database operations with mock data
- API endpoint validation
- Permission boundary testing
- Data integrity verification

#### Integration Tests
- Multi-user workflow testing
- Real-time synchronization validation
- Supplier permission filtering
- Cross-browser compatibility

#### End-to-End Tests
- Complete wedding planning workflows
- Mobile responsive design validation
- Accessibility compliance (WCAG 2.1 AA)
- Performance benchmarks
```

## ✅ COMPLETION CHECKLIST

### Comprehensive Testing:
- [ ] Unit tests with >90% code coverage for all database operations
- [ ] Integration tests for all API endpoints with security validation
- [ ] E2E tests covering complete wedding planning workflows
- [ ] Accessibility tests ensuring WCAG 2.1 AA compliance
- [ ] Performance tests validating load times and responsiveness
- [ ] Cross-browser compatibility testing (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing on iOS and Android
- [ ] Security penetration testing for data privacy

### Documentation Complete:
- [ ] User guide with step-by-step instructions and screenshots
- [ ] Technical documentation with API specifications
- [ ] Troubleshooting guides for common issues
- [ ] Accessibility compliance documentation
- [ ] Security audit report with compliance verification
- [ ] Performance benchmark report with optimization recommendations
- [ ] Integration guides for supplier connections
- [ ] Mobile usage guide with PWA installation instructions

### Quality Assurance:
- [ ] All team implementations tested and validated
- [ ] User acceptance testing with real wedding scenarios  
- [ ] Error handling tested under failure conditions
- [ ] Data recovery procedures tested and documented
- [ ] Real-time synchronization validated across devices
- [ ] Supplier permission boundaries verified
- [ ] Wedding data privacy compliance confirmed

### Production Readiness:
- [ ] Load testing with 1000+ concurrent users
- [ ] Database performance optimized for wedding-scale data
- [ ] Security vulnerabilities identified and resolved
- [ ] Backup and disaster recovery procedures tested
- [ ] Monitoring and alerting systems configured
- [ ] Support documentation and procedures complete

---

**EXECUTE IMMEDIATELY - This is the comprehensive QA and documentation foundation ensuring enterprise-grade quality for wedding couples database system!**