# TEAM E - ROUND 1: WS-326 - Wedding Website Section Overview
## 2025-01-22 - Development Round 1

**YOUR MISSION:** Create comprehensive QA/testing strategy and documentation for wedding website builder with >90% test coverage, E2E testing, and user-friendly documentation
**FEATURE ID:** WS-326 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about testing wedding websites that must work flawlessly for real couples' special days - no room for errors

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/__tests__/wedding-website/
ls -la $WS_ROOT/wedsync/docs/wedding-website/
cat $WS_ROOT/wedsync/src/__tests__/wedding-website/e2e/website-builder.test.tsx | head -20
cat $WS_ROOT/wedsync/docs/wedding-website/user-guide.md | head-20
```

2. **COMPREHENSIVE TEST RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm test -- --coverage --testPathPattern="wedding-website"
# MUST show: ">90% coverage for all wedding website components"
```

3. **E2E TEST RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm run test:e2e -- --grep "wedding.*website"
# MUST show: "All E2E tests passing"
```

4. **ACCESSIBILITY TEST RESULTS:**
```bash
cd $WS_ROOT/wedsync && npm run test:a11y -- --testPathPattern="wedding-website"
# MUST show: "All accessibility tests passing (WCAG 2.1 AA)"
```

**Teams submitting hallucinated implementations will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query existing testing patterns and documentation structure
await mcp__serena__search_for_pattern("test.*spec|test.*util|documentation|user.*guide");
await mcp__serena__find_symbol("testHelper", "", true);
await mcp__serena__get_symbols_overview("src/__tests__");
await mcp__serena__find_symbol("DocumentationHelper", "", true);
```

### B. UI STYLE GUIDES & TECHNOLOGY STACK (MANDATORY FOR QA WORK)
```typescript
// Load testing standards and documentation requirements
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/SAAS-UI-STYLE-GUIDE.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation specific to testing frameworks and documentation tools
await mcp__Ref__ref_search_documentation("Jest React Testing Library E2E testing Playwright");
await mcp__Ref__ref_search_documentation("Accessibility testing axe-core WCAG guidelines");
await mcp__Ref__ref_search_documentation("Documentation writing user guides technical writing");
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPREHENSIVE TESTING STRATEGY

### Use Sequential Thinking MCP for QA Planning
```typescript
// Plan the comprehensive testing and documentation strategy
mcp__sequential-thinking__sequential_thinking({
  thought: "For wedding website QA, I need: 1) Unit tests for all UI components, 2) API integration tests for backend, 3) E2E tests for complete user workflows, 4) Mobile responsive testing, 5) Accessibility compliance testing, 6) Performance testing, 7) Cross-browser compatibility, 8) User documentation and guides.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Testing priorities: Wedding website builder must be bulletproof - couples only get one chance at their wedding. Test scenarios: Creating website from scratch, Customizing themes, Adding photos and content, RSVP form functionality, Mobile responsiveness, Domain publishing, Offline functionality, Error handling and recovery.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Track all testing deliverables and documentation requirements
2. **test-automation-architect** - Focus on comprehensive test suite architecture
3. **security-compliance-officer** - Security testing and vulnerability assessment
4. **code-quality-guardian** - Code quality metrics and standards enforcement
5. **documentation-chronicler** - Create user-friendly documentation and guides
6. **verification-cycle-coordinator** - Ensure all verification cycles pass

## 🔒 TESTING SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### SECURITY TESTING CHECKLIST:
- [ ] **Input validation testing** - Test all form inputs for XSS/injection attacks
- [ ] **Authentication testing** - Verify secure access to wedding website data
- [ ] **HTTPS enforcement testing** - Ensure all connections are encrypted
- [ ] **File upload security testing** - Test image/media upload security
- [ ] **Domain verification testing** - Test custom domain ownership verification
- [ ] **Rate limiting testing** - Verify API rate limits work correctly
- [ ] **Session security testing** - Test session management and timeout
- [ ] **Data privacy testing** - Verify guest data protection and GDPR compliance

## 🎯 TEAM E SPECIALIZATION: QA/TESTING & DOCUMENTATION

**PRIMARY RESPONSIBILITIES:**
- Comprehensive test suite development (>90% coverage)
- End-to-end testing with real user workflows
- Documentation creation with screenshots and examples
- Bug tracking and resolution coordination
- Performance benchmarking and optimization
- Cross-browser and cross-device compatibility testing
- Accessibility compliance validation (WCAG 2.1 AA)
- User acceptance testing with real wedding scenarios

### COMPREHENSIVE TESTING REQUIREMENTS

#### 1. UNIT TESTING SUITE
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/wedding-website/components/WebsiteBuilder.test.tsx

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WebsiteBuilder } from '$WS_ROOT/wedsync/src/components/wedding-website/WebsiteBuilder';
import { mockWeddingWebsite, mockThemes } from '../__mocks__/wedding-website-data';

describe('WebsiteBuilder Component', () => {
  beforeEach(() => {
    // Setup test environment
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  describe('Theme Selection', () => {
    it('should display all available themes', async () => {
      render(
        <WebsiteBuilder 
          coupleId="test-couple-123" 
          existingWebsite={mockWeddingWebsite}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Classic Elegance')).toBeInTheDocument();
        expect(screen.getByText('Modern Minimalist')).toBeInTheDocument();
        expect(screen.getByText('Rustic Charm')).toBeInTheDocument();
        expect(screen.getByText('Beach Bliss')).toBeInTheDocument();
        expect(screen.getByText('Garden Party')).toBeInTheDocument();
      });
    });

    it('should allow theme selection with live preview', async () => {
      const mockOnThemeChange = jest.fn();
      
      render(
        <WebsiteBuilder 
          coupleId="test-couple-123"
          onThemeChange={mockOnThemeChange}
        />
      );

      const modernTheme = screen.getByTestId('theme-modern');
      fireEvent.click(modernTheme);

      await waitFor(() => {
        expect(mockOnThemeChange).toHaveBeenCalledWith('modern');
        expect(screen.getByTestId('preview-panel')).toHaveClass('theme-modern');
      });
    });

    it('should persist theme selection on page refresh', async () => {
      // Test localStorage persistence
      const mockWebsite = { ...mockWeddingWebsite, themeId: 'rustic' };
      Storage.prototype.getItem = jest.fn(() => JSON.stringify(mockWebsite));

      render(<WebsiteBuilder coupleId="test-couple-123" />);

      await waitFor(() => {
        expect(screen.getByTestId('theme-rustic')).toHaveClass('selected');
      });
    });
  });

  describe('Content Editing', () => {
    it('should allow editing our story section', async () => {
      render(<WebsiteBuilder coupleId="test-couple-123" />);

      const storyTextarea = screen.getByLabelText('Our Story');
      const storyText = 'Emma and James met in college and fell in love over their shared passion for photography...';
      
      fireEvent.change(storyTextarea, { target: { value: storyText } });

      await waitFor(() => {
        expect(storyTextarea.value).toBe(storyText);
        expect(screen.getByTestId('preview-story')).toHaveTextContent(storyText);
      });
    });

    it('should validate content length limits', async () => {
      render(<WebsiteBuilder coupleId="test-couple-123" />);

      const storyTextarea = screen.getByLabelText('Our Story');
      const longText = 'a'.repeat(5001); // Exceeds 5000 character limit
      
      fireEvent.change(storyTextarea, { target: { value: longText } });
      fireEvent.blur(storyTextarea);

      await waitFor(() => {
        expect(screen.getByText('Story too long (maximum 5000 characters)')).toBeInTheDocument();
      });
    });

    it('should auto-save content changes', async () => {
      const mockSave = jest.fn();
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      render(<WebsiteBuilder coupleId="test-couple-123" onSave={mockSave} />);

      const titleInput = screen.getByLabelText('Wedding Title');
      fireEvent.change(titleInput, { target: { value: 'Emma & James Wedding' } });

      // Wait for auto-save (debounced)
      await waitFor(() => {
        expect(mockSave).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Emma & James Wedding'
          })
        );
      }, { timeout: 2000 });
    });
  });

  describe('Mobile Responsiveness', () => {
    it('should adapt to mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
      
      render(<WebsiteBuilder coupleId="test-couple-123" />);

      expect(screen.getByTestId('website-builder')).toHaveClass('mobile-layout');
      expect(screen.getByTestId('theme-selector')).toHaveClass('mobile-grid');
    });

    it('should have touch-friendly buttons on mobile', () => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5 });
      
      render(<WebsiteBuilder coupleId="test-couple-123" />);

      const saveButton = screen.getByText('Save Changes');
      const styles = window.getComputedStyle(saveButton);
      
      // Minimum 48px touch target
      expect(parseInt(styles.minHeight)).toBeGreaterThanOrEqual(48);
      expect(parseInt(styles.minWidth)).toBeGreaterThanOrEqual(48);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('API Error'));

      render(<WebsiteBuilder coupleId="test-couple-123" />);

      const saveButton = screen.getByText('Save Changes');
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText('Unable to save changes. Please try again.')).toBeInTheDocument();
        expect(screen.getByTestId('error-banner')).toHaveClass('error-visible');
      });
    });

    it('should show offline indicator when network is unavailable', async () => {
      // Mock offline status
      Object.defineProperty(navigator, 'onLine', { value: false });
      
      render(<WebsiteBuilder coupleId="test-couple-123" />);

      fireEvent(window, new Event('offline'));

      await waitFor(() => {
        expect(screen.getByText(/You're currently offline/)).toBeInTheDocument();
        expect(screen.getByTestId('offline-banner')).toBeVisible();
      });
    });
  });
});
```

#### 2. API INTEGRATION TESTING
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/wedding-website/api/wedding-websites.integration.test.ts

import { NextRequest } from 'next/server';
import { POST, GET, PUT, DELETE } from '$WS_ROOT/wedsync/src/app/api/wedding-websites/route';
import { setupTestDatabase, cleanupTestDatabase } from '../__helpers__/test-db';

describe('Wedding Websites API Integration', () => {
  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(async () => {
    await cleanupTestDatabase();
  });

  describe('POST /api/wedding-websites', () => {
    it('should create a new wedding website with valid data', async () => {
      const validWebsiteData = {
        coupleId: 'test-couple-123',
        title: 'Emma & James Wedding',
        themeId: 'classic',
        content: {
          ourStory: 'We met in college...',
          weddingDetails: {
            date: '2024-06-15T14:00:00Z',
            venue: 'Sunset Garden Venue',
            address: '123 Wedding Lane, Love City, LC 12345'
          }
        }
      };

      const request = new NextRequest('http://localhost:3000/api/wedding-websites', {
        method: 'POST',
        body: JSON.stringify(validWebsiteData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      expect(result.website).toMatchObject({
        title: 'Emma & James Wedding',
        themeId: 'classic',
        isPublished: false
      });
      expect(result.website.id).toBeDefined();
      expect(result.website.subdomain).toMatch(/^[a-z0-9-]+$/);
    });

    it('should reject invalid wedding website data', async () => {
      const invalidData = {
        coupleId: 'invalid-uuid',
        title: '', // Empty title should fail validation
        themeId: 'non-existent-theme'
      };

      const request = new NextRequest('http://localhost:3000/api/wedding-websites', {
        method: 'POST',
        body: JSON.stringify(invalidData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: 'Title is required' })
      );
      expect(result.errors).toContainEqual(
        expect.objectContaining({ message: 'Invalid couple ID' })
      );
    });

    it('should enforce rate limiting on website creation', async () => {
      const websiteData = {
        coupleId: 'test-couple-rate-limit',
        title: 'Rate Limit Test',
        themeId: 'modern'
      };

      // Make multiple requests quickly to trigger rate limit
      const requests = Array.from({ length: 6 }, () => 
        new NextRequest('http://localhost:3000/api/wedding-websites', {
          method: 'POST',
          body: JSON.stringify(websiteData),
          headers: { 
            'Content-Type': 'application/json',
            'x-forwarded-for': '192.168.1.100' // Same IP for all requests
          }
        })
      );

      const responses = await Promise.all(requests.map(req => POST(req)));
      const rateLimitedResponses = responses.filter(res => res.status === 429);

      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/wedding-websites/[id]', () => {
    let testWebsiteId: string;

    beforeEach(async () => {
      // Create test website
      const createResponse = await POST(new NextRequest('http://localhost:3000/api/wedding-websites', {
        method: 'POST',
        body: JSON.stringify({
          coupleId: 'test-couple-get',
          title: 'Test Get Website',
          themeId: 'garden'
        }),
        headers: { 'Content-Type': 'application/json' }
      }));
      const created = await createResponse.json();
      testWebsiteId = created.website.id;
    });

    it('should return website by ID', async () => {
      const request = new NextRequest(`http://localhost:3000/api/wedding-websites/${testWebsiteId}`);
      const response = await GET(request, { params: { id: testWebsiteId } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.website.id).toBe(testWebsiteId);
      expect(result.website.title).toBe('Test Get Website');
    });

    it('should return 404 for non-existent website', async () => {
      const fakeId = 'non-existent-uuid';
      const request = new NextRequest(`http://localhost:3000/api/wedding-websites/${fakeId}`);
      const response = await GET(request, { params: { id: fakeId } });

      expect(response.status).toBe(404);
    });
  });

  describe('Security Testing', () => {
    it('should prevent SQL injection in website content', async () => {
      const maliciousData = {
        coupleId: 'test-couple-security',
        title: 'Test Website',
        content: {
          ourStory: "'; DROP TABLE wedding_websites; --"
        }
      };

      const request = new NextRequest('http://localhost:3000/api/wedding-websites', {
        method: 'POST',
        body: JSON.stringify(maliciousData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      
      // Should not cause database error, should sanitize input
      expect(response.status).toBe(201);
      
      const result = await response.json();
      expect(result.website.content.ourStory).not.toContain('DROP TABLE');
    });

    it('should prevent XSS in website content', async () => {
      const xssData = {
        coupleId: 'test-couple-xss',
        title: 'XSS Test',
        content: {
          ourStory: '<script>alert("XSS")</script>We met...'
        }
      };

      const request = new NextRequest('http://localhost:3000/api/wedding-websites', {
        method: 'POST',
        body: JSON.stringify(xssData),
        headers: { 'Content-Type': 'application/json' }
      });

      const response = await POST(request);
      const result = await response.json();

      expect(response.status).toBe(201);
      // Script tags should be sanitized
      expect(result.website.content.ourStory).not.toContain('<script>');
      expect(result.website.content.ourStory).toContain('We met...');
    });
  });
});
```

#### 3. END-TO-END TESTING
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/wedding-website/e2e/website-builder.e2e.test.tsx

import { test, expect } from '@playwright/test';

test.describe('Wedding Website Builder E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.fill('[data-testid=email]', 'test@example.com');
    await page.fill('[data-testid=password]', 'testpassword');
    await page.click('[data-testid=login-button]');
    
    // Navigate to couples and create new website
    await page.goto('/dashboard/couples/test-couple-123/website');
  });

  test('should create complete wedding website from scratch', async ({ page }) => {
    // Step 1: Choose theme
    await expect(page.locator('[data-testid=theme-selector]')).toBeVisible();
    await page.click('[data-testid=theme-modern]');
    
    // Verify theme selection updates preview
    await expect(page.locator('[data-testid=preview-panel]')).toHaveClass(/theme-modern/);

    // Step 2: Add wedding title
    await page.fill('[data-testid=wedding-title]', 'Emma & James Wedding');
    
    // Verify title appears in preview
    await expect(page.locator('[data-testid=preview-title]')).toHaveText('Emma & James Wedding');

    // Step 3: Add our story
    const storyText = 'We met in college during our photography class and fell in love over our shared passion for capturing beautiful moments. After 5 years together, James proposed during a sunset photo shoot at our favorite beach.';
    await page.fill('[data-testid=our-story-editor]', storyText);
    
    // Verify story appears in preview
    await expect(page.locator('[data-testid=preview-story]')).toContainText('We met in college');

    // Step 4: Add wedding details
    await page.fill('[data-testid=wedding-date]', '2024-06-15');
    await page.fill('[data-testid=wedding-venue]', 'Sunset Garden Venue');
    await page.fill('[data-testid=wedding-address]', '123 Wedding Lane, Love City, LC 12345');
    
    // Step 5: Configure RSVP settings
    await page.check('[data-testid=rsvp-enabled]');
    await page.fill('[data-testid=rsvp-deadline]', '2024-05-15');
    await page.check('[data-testid=guest-plus-one]');
    
    // Add meal choices
    await page.click('[data-testid=add-meal-choice]');
    await page.fill('[data-testid=meal-choice-0]', 'Chicken Breast with Herbs');
    await page.click('[data-testid=add-meal-choice]');
    await page.fill('[data-testid=meal-choice-1]', 'Grilled Salmon');
    await page.click('[data-testid=add-meal-choice]');
    await page.fill('[data-testid=meal-choice-2]', 'Vegetarian Pasta');

    // Step 6: Add registry links
    await page.click('[data-testid=add-registry-link]');
    await page.fill('[data-testid=registry-name-0]', 'Amazon Wedding Registry');
    await page.fill('[data-testid=registry-url-0]', 'https://amazon.com/wedding/emma-james');

    // Step 7: Save website
    await page.click('[data-testid=save-website]');
    
    // Verify save success
    await expect(page.locator('[data-testid=save-success]')).toBeVisible();
    await expect(page.locator('[data-testid=save-success]')).toHaveText('Website saved successfully');

    // Step 8: Preview on mobile
    await page.click('[data-testid=mobile-preview]');
    
    // Verify mobile preview loads
    await expect(page.locator('[data-testid=mobile-preview-frame]')).toBeVisible();
    
    // Check mobile responsiveness
    const mobileFrame = page.frameLocator('[data-testid=mobile-preview-frame]');
    await expect(mobileFrame.locator('[data-testid=mobile-title]')).toHaveText('Emma & James Wedding');
    await expect(mobileFrame.locator('[data-testid=mobile-rsvp-form]')).toBeVisible();
  });

  test('should publish website with custom domain', async ({ page, context }) => {
    // Create and save website first
    await page.click('[data-testid=theme-classic]');
    await page.fill('[data-testid=wedding-title]', 'Test Wedding Publication');
    await page.click('[data-testid=save-website]');
    await expect(page.locator('[data-testid=save-success]')).toBeVisible();

    // Step 1: Open publish settings
    await page.click('[data-testid=publish-settings]');
    await expect(page.locator('[data-testid=publish-modal]')).toBeVisible();

    // Step 2: Enter custom domain
    await page.fill('[data-testid=custom-domain]', 'emma-james-wedding.com');
    
    // Step 3: Verify domain ownership instructions
    await expect(page.locator('[data-testid=domain-verification-instructions]')).toBeVisible();
    await expect(page.locator('[data-testid=txt-record]')).toContainText('wedsync-verification=');

    // Step 4: Mock domain verification (in real test, would need actual DNS setup)
    await page.evaluate(() => {
      window.__mockDomainVerified = true;
    });

    // Step 5: Attempt to publish
    await page.click('[data-testid=publish-website]');
    
    // Verify domain verification process
    await expect(page.locator('[data-testid=domain-verification-status]')).toHaveText('Verifying domain ownership...');
    
    // Wait for verification to complete (mocked)
    await page.waitForSelector('[data-testid=domain-verified]', { timeout: 10000 });
    
    // Step 6: Complete publication
    await expect(page.locator('[data-testid=publish-success]')).toBeVisible();
    await expect(page.locator('[data-testid=website-url]')).toHaveText('https://emma-james-wedding.com');
    
    // Step 7: Test published website in new tab
    const [newPage] = await Promise.all([
      context.waitForEvent('page'),
      page.click('[data-testid=view-published-website]')
    ]);
    
    // Verify published website loads correctly
    await expect(newPage.locator('[data-testid=published-title]')).toHaveText('Test Wedding Publication');
    await expect(newPage.locator('[data-testid=published-rsvp-form]')).toBeVisible();
  });

  test('should handle RSVP submission on published website', async ({ page }) => {
    // Navigate to published website (assuming it exists from previous test)
    await page.goto('/wedding/test-published-website');
    
    // Fill out RSVP form
    await page.fill('[data-testid=guest-name]', 'John Smith');
    await page.click('[data-testid=attending-yes]');
    await page.selectOption('[data-testid=guest-count]', '2');
    await page.click('[data-testid=meal-choice-chicken]');
    await page.fill('[data-testid=special-requests]', 'Vegetarian option for my partner');
    
    // Submit RSVP
    await page.click('[data-testid=submit-rsvp]');
    
    // Verify submission success
    await expect(page.locator('[data-testid=rsvp-success]')).toBeVisible();
    await expect(page.locator('[data-testid=rsvp-success]')).toHaveText('Thank you! Your RSVP has been submitted successfully.');
    
    // Verify form is disabled after submission
    await expect(page.locator('[data-testid=guest-name]')).toBeDisabled();
    await expect(page.locator('[data-testid=submit-rsvp]')).toBeDisabled();
  });

  test('should work offline with service worker', async ({ page, context }) => {
    // Go to published website
    await page.goto('/wedding/test-published-website');
    
    // Wait for service worker to register
    await page.waitForFunction(() => 'serviceWorker' in navigator && navigator.serviceWorker.ready);
    
    // Go offline
    await context.setOffline(true);
    
    // Refresh page - should load from cache
    await page.reload();
    await expect(page.locator('[data-testid=wedding-title]')).toBeVisible();
    
    // Try to submit RSVP while offline
    await page.fill('[data-testid=guest-name]', 'Offline Guest');
    await page.click('[data-testid=attending-yes]');
    await page.click('[data-testid=submit-rsvp]');
    
    // Verify offline RSVP handling
    await expect(page.locator('[data-testid=offline-rsvp-message]')).toBeVisible();
    await expect(page.locator('[data-testid=offline-rsvp-message]')).toHaveText('RSVP saved offline! It will be submitted when you\'re back online.');
    
    // Go back online
    await context.setOffline(false);
    
    // Verify RSVP syncs when online
    await page.waitForSelector('[data-testid=rsvp-synced]', { timeout: 5000 });
    await expect(page.locator('[data-testid=rsvp-synced]')).toHaveText('RSVP submitted successfully!');
  });
});
```

#### 4. USER DOCUMENTATION
```markdown
<!-- File: $WS_ROOT/wedsync/docs/wedding-website/user-guide.md -->

# Wedding Website Builder - User Guide

## Getting Started

Your wedding website is a beautiful way to share your love story, wedding details, and collect RSVPs from your guests. This guide will walk you through creating the perfect wedding website in just a few simple steps.

### Step 1: Choose Your Theme

1. Navigate to your couple dashboard
2. Click on "Wedding Website" in the menu
3. Browse through our 5 beautiful themes:
   - **Classic Elegance**: Timeless and sophisticated with serif fonts
   - **Modern Minimalist**: Clean and contemporary design
   - **Rustic Charm**: Natural and warm with earthy tones
   - **Beach Bliss**: Coastal and relaxed with ocean colors
   - **Garden Party**: Fresh and floral with green accents

![Theme Selection Screenshot]

### Step 2: Add Your Content

#### Our Story Section
Tell your unique love story in your own words:
- How you met
- Your favorite memories together
- The proposal story
- What makes your love special

**Tips:**
- Keep it heartfelt and personal
- Maximum 5,000 characters (about 800 words)
- Your story will appear prominently on your website

#### Wedding Details
Add all the important information your guests need:
- **Wedding Date**: The date and time of your ceremony
- **Venue Name**: The name of your wedding venue
- **Address**: Complete address with directions
- **Ceremony Details**: Special instructions or traditions
- **Reception Details**: Location if different from ceremony

### Step 3: Set Up RSVP

Make it easy for guests to respond:

1. **Enable RSVP**: Toggle on to collect responses
2. **RSVP Deadline**: Set a deadline for responses (recommended: 4-6 weeks before wedding)
3. **Plus-One Settings**: Allow guests to bring a guest if applicable
4. **Meal Choices**: Add meal options if needed

**RSVP Features:**
- Guests can respond on any device
- Automatic confirmation emails
- Dietary restrictions and special requests
- Works offline at venues with poor cell service

### Step 4: Add Photos and Registry

#### Photo Gallery
- Upload up to 50 photos
- Supported formats: JPG, PNG, WebP
- Automatic optimization for fast loading
- Mobile-friendly gallery with touch gestures

#### Registry Links
Add links to your gift registries:
- Up to 10 registry links
- Popular registries: Amazon, Target, Williams Sonoma, etc.
- Custom registry names and descriptions

### Step 5: Preview and Publish

#### Preview Your Website
- **Desktop Preview**: See how it looks on computers
- **Mobile Preview**: Test on phone screens (most guests use mobile)
- **Live Preview**: Changes update in real-time as you edit

#### Publishing Options

##### Free Subdomain (Included)
- Get a free subdomain like: `emma-james-wedding.wedsync.com`
- Automatic SSL certificate
- Fast global delivery
- No setup required

##### Custom Domain (Premium)
Want your own domain like `emma-james-wedding.com`?

1. Purchase your domain from any registrar (GoDaddy, Namecheap, etc.)
2. Enter your domain in the custom domain field
3. Follow the DNS setup instructions
4. We'll verify ownership and set up SSL automatically

**DNS Setup Instructions:**
```
Add this TXT record to your domain:
Name: @
Value: wedsync-verification=your-unique-code

Add these records for your website:
Name: @
Type: A
Value: [We'll provide the IP address]

Name: www
Type: CNAME
Value: your-domain.com
```

### Step 6: Share with Guests

Once published, you can:
- Share the website URL in your invitations
- Include QR codes for easy mobile access
- Post on social media
- Email the link directly to guests

## Mobile Optimization

Your website is automatically optimized for mobile devices:
- **Fast Loading**: Optimized for slow cell connections
- **Touch-Friendly**: Large buttons and easy navigation
- **Offline RSVP**: Guests can RSVP even with poor signal
- **iOS/Android Compatible**: Works perfectly on all phones

## Common Questions

### Can guests RSVP without creating an account?
Yes! Guests simply visit your website and fill out the RSVP form. No login required.

### What happens if guests can't connect to the internet at my venue?
Our websites work offline! Guests can still view your information and submit RSVPs, which will be sent automatically when they have signal again.

### Can I change my theme after publishing?
Yes! You can change themes anytime without affecting your content or RSVPs.

### How do I see who has RSVP'd?
Go to your couple dashboard and click "RSVP Responses" to see all submissions, dietary restrictions, and guest counts.

### Can I edit my website after the wedding?
Yes! Your website stays active for one year after your wedding date, and you can continue editing it to add photos, thank you messages, etc.

## Need Help?

- **Email Support**: support@wedsync.com
- **Live Chat**: Available in your dashboard
- **Help Articles**: Visit our help center for more guides
- **Video Tutorials**: Step-by-step video guides available

Your wedding website should be as unique and beautiful as your love story. If you need any help creating the perfect website for your special day, we're here to help!
```

## 📋 REAL WEDDING USER STORIES FOR TESTING

**Emma & James (Photography Couple):**
*Testing needs: Test high-resolution photo uploads, verify RSVP handling for 150 guests, test custom domain setup process, validate mobile performance at venues*

**Sarah & Mike (Destination Wedding):**
*Testing needs: Test international guest access, verify multiple time zone handling, test offline functionality for remote locations, validate cross-browser compatibility*

**Lisa & David (Garden Party Wedding):**
*Testing needs: Test simple interface for older relatives, verify large text and touch targets, test basic RSVP flow, validate accessibility compliance*

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1
- [ ] Comprehensive unit test suite (>90% coverage)
- [ ] API integration tests with security validation
- [ ] End-to-end test scenarios for complete user workflows
- [ ] Mobile responsive testing across devices
- [ ] Accessibility testing (WCAG 2.1 AA compliance)
- [ ] Performance testing and benchmarks
- [ ] Cross-browser compatibility testing
- [ ] User documentation with screenshots
- [ ] Developer documentation for API endpoints
- [ ] Bug tracking and resolution system
- [ ] Test automation CI/CD integration
- [ ] Evidence package with comprehensive test results

## 💾 WHERE TO SAVE YOUR WORK
- Unit Tests: `$WS_ROOT/wedsync/src/__tests__/wedding-website/`
- Integration Tests: `$WS_ROOT/wedsync/src/__tests__/api/wedding-website/`
- E2E Tests: `$WS_ROOT/wedsync/e2e/wedding-website/`
- Documentation: `$WS_ROOT/wedsync/docs/wedding-website/`
- Test Helpers: `$WS_ROOT/wedsync/src/__tests__/__helpers__/`
- Performance Tests: `$WS_ROOT/wedsync/src/__tests__/performance/wedding-website/`

## 🏁 COMPLETION CHECKLIST
- [ ] Unit test suite with >90% coverage implemented
- [ ] API integration tests with security validation
- [ ] End-to-end tests for complete user workflows
- [ ] Mobile responsive tests passing on all devices
- [ ] Accessibility tests meeting WCAG 2.1 AA standards
- [ ] Performance benchmarks meeting targets (<3s load time)
- [ ] Cross-browser compatibility verified (Chrome, Firefox, Safari, Edge)
- [ ] User documentation with screenshots and examples
- [ ] Developer documentation for API endpoints
- [ ] Bug tracking system implemented
- [ ] CI/CD integration for automated testing
- [ ] Evidence package with comprehensive test results
- [ ] All tests passing in CI/CD pipeline

---

**EXECUTE IMMEDIATELY - Ensure the wedding website system is bulletproof and ready for real couples' special days!**