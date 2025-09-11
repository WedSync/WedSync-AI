# TEAM E - ROUND 1: WS-306 - Forms System Section Overview
## 2025-01-25 - 08:00 AM

**YOUR MISSION:** Develop comprehensive testing and documentation for forms system with AI validation, mobile optimization testing, and wedding vendor form guides
**FEATURE ID:** WS-306 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round
**THINK ULTRA HARD** about form system testing, AI integration validation, and comprehensive wedding vendor documentation

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **COMPREHENSIVE FORM TESTING VERIFICATION:**
```bash
npm test forms
# MUST show: >90% coverage, all form workflows tested, AI integration validated
```

2. **MOBILE FORM OPTIMIZATION TESTING:**
```bash
npm run test:mobile-forms
# MUST show: Touch interaction tests passing, mobile performance validated
```

3. **DOCUMENTATION COMPLETENESS CHECK:**
```bash
ls -la $WS_ROOT/wedsync/docs/forms/vendor-guides/
# MUST show: Complete form guides for all wedding vendor types
```

## 🧠 SEQUENTIAL THINKING FOR FORMS SYSTEM QA

```typescript
// Forms system testing complexity analysis
mcp__sequential-thinking__sequentialthinking({
  thought: "Forms system testing needs: End-to-end form creation and submission workflows, AI form generation validation with multiple vendor types, mobile form builder testing across devices, drag-and-drop interface testing, real-time form analytics validation, webhook integration testing, and cross-platform synchronization verification.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Wedding vendor form testing scenarios: Photographer timeline forms with date validation, venue capacity forms with guest count limits, florist seasonal availability forms, coordinator multi-vendor forms, caterer dietary restriction forms, each requiring specific validation rules and integration patterns.",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "AI integration testing requirements: Validate AI-generated forms match vendor type specifications, test form optimization suggestions accuracy, verify mobile optimization algorithms, validate wedding field mapping correctness, test AI response parsing and error handling, ensure consistent AI performance across different prompts.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 4
});

mcp__sequential-thinking__sequentialthinking({
  thought: "Documentation scope: Step-by-step form builder guides for each vendor type, mobile form creation workflows, AI optimization explanations, troubleshooting guides for common issues, integration setup documentation, security best practices, and wedding-specific form design principles.",
  nextThoughtNeeded: false,
  thoughtNumber: 4,
  totalThoughts: 4
});
```

## 📚 ENHANCED SERENA + REF SETUP

### A. SERENA TESTING PATTERN DISCOVERY
```typescript
// MANDATORY FIRST - Activate WedSync project context
await mcp__serena__activate_project("wedsync");

// Find existing testing patterns and AI integration
await mcp__serena__search_for_pattern("test AI integration form validation");
await mcp__serena__find_symbol("TestSuite AI mock", "$WS_ROOT/wedsync/src/__tests__/");
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/src/__tests__/forms/");

// Study existing documentation and QA patterns
await mcp__serena__find_referencing_symbols("documentation test coverage");
```

### B. TESTING DOCUMENTATION LOADING
```typescript
// Load testing framework and AI testing documentation
// Use Ref MCP to search for:
# - "Jest React Testing Library AI integration"
# - "Playwright mobile form testing strategies"
# - "AI API testing and validation patterns"

// Load documentation and QA best practices
// Use Ref MCP to search for:
# - "Technical documentation wedding industry"
# - "Form testing accessibility compliance"
# - "Mobile form validation testing"
```

## 🎯 SPECIFIC DELIVERABLES

### ROUND 1 DELIVERABLES (WITH EVIDENCE):
- [ ] **Form Builder Test Suite** (`$WS_ROOT/wedsync/src/__tests__/forms/form-builder.test.ts`)
  - Unit tests for drag-and-drop form building
  - Integration tests for form creation and publication
  - Real-time preview validation testing
  - Evidence: >90% test coverage, all form builder workflows validated

- [ ] **AI Integration Test Suite** (`$WS_ROOT/wedsync/src/__tests__/ai/form-generation.test.ts`)
  - AI form generation testing with mock responses
  - Validation of generated forms against specifications
  - Error handling and fallback testing
  - Evidence: AI integration reliability validated across vendor types

- [ ] **Mobile Form Testing Suite** (`$WS_ROOT/wedsync/src/__tests__/mobile/form-mobile.test.ts`)
  - Touch interaction and gesture testing
  - Offline form building validation
  - Mobile optimization testing
  - Evidence: Mobile form functionality fully validated

- [ ] **Wedding Vendor Form Guides** (`$WS_ROOT/wedsync/docs/forms/vendor-guides/`)
  - Complete form builder guides for photographers, venues, florists
  - AI-powered form optimization tutorials
  - Mobile form creation workflows
  - Evidence: Comprehensive guides covering all vendor workflows

- [ ] **Form Security & Accessibility Testing** (`$WS_ROOT/wedsync/src/__tests__/security/form-security.test.ts`)
  - Form submission security validation
  - WCAG 2.1 AA compliance testing
  - Data validation and sanitization testing
  - Evidence: All security and accessibility requirements verified

## 🧪 COMPREHENSIVE FORM TESTING IMPLEMENTATION

### Form Builder End-to-End Test Suite
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/forms/form-builder-e2e.test.ts

import { test, expect, Page } from '@playwright/test';

test.describe('Form Builder End-to-End Workflows', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    await page.goto('/forms/builder');
    
    // Login as wedding photographer
    await page.fill('[data-testid="email-input"]', 'photographer@test.com');
    await page.fill('[data-testid="password-input"]', 'testpass123');
    await page.click('[data-testid="login-button"]');
    
    await page.waitForLoadState('networkidle');
  });

  test('should create complete wedding form with drag-and-drop', async () => {
    // Step 1: Set form title and description
    await page.fill('[data-testid="form-title"]', 'Wedding Photography Details');
    await page.fill('[data-testid="form-description"]', 'Please provide your wedding details for photography planning');

    // Step 2: Drag wedding date field
    const weddingDateField = page.locator('[data-field-type="wedding_date"]');
    const formCanvas = page.locator('[data-testid="form-canvas"]');
    
    await weddingDateField.dragTo(formCanvas);
    await expect(page.locator('[data-testid="form-field"]').first()).toContainText('Wedding Date');

    // Step 3: Drag venue address field
    const venueField = page.locator('[data-field-type="venue_address"]');
    await venueField.dragTo(formCanvas);
    
    // Step 4: Add guest count field
    const guestCountField = page.locator('[data-field-type="guest_count"]');
    await guestCountField.dragTo(formCanvas);

    // Step 5: Configure field properties
    await page.click('[data-testid="form-field"]').first();
    await page.check('[data-testid="field-required"]');
    await page.fill('[data-testid="field-label"]', 'Your Wedding Date');

    // Step 6: Verify real-time preview updates
    await expect(page.locator('[data-testid="form-preview"]')).toContainText('Your Wedding Date');

    // Step 7: Save form
    await page.click('[data-testid="save-form-button"]');
    await expect(page.locator('[data-testid="success-message"]')).toContainText('Form saved successfully');

    // Step 8: Verify form appears in forms list
    await page.goto('/forms');
    await expect(page.locator('[data-testid="form-card"]').first()).toContainText('Wedding Photography Details');
  });

  test('should handle AI form generation workflow', async () => {
    // Test AI form generation
    await page.click('[data-testid="ai-generate-button"]');
    await page.selectOption('[data-testid="vendor-type-select"]', 'photographer');
    await page.click('[data-testid="generate-form-button"]');

    // Wait for AI generation
    await page.waitForSelector('[data-testid="ai-generating-indicator"]', { state: 'hidden' });

    // Verify AI generated appropriate fields
    const fieldCount = await page.locator('[data-testid="form-field"]').count();
    expect(fieldCount).toBeGreaterThan(5); // Should generate multiple relevant fields

    // Verify wedding-specific fields are included
    await expect(page.locator('[data-testid="form-canvas"]')).toContainText('Wedding Date');
    await expect(page.locator('[data-testid="form-canvas"]')).toContainText('Photography Style');

    // Test AI optimization suggestions
    await page.click('[data-testid="ai-optimize-button"]');
    await page.waitForSelector('[data-testid="optimization-suggestions"]');
    
    const suggestions = page.locator('[data-testid="optimization-suggestion"]');
    const suggestionCount = await suggestions.count();
    expect(suggestionCount).toBeGreaterThan(0);
  });

  test('should validate mobile form optimization', async () => {
    // Switch to mobile preview
    await page.click('[data-testid="mobile-preview-button"]');
    
    // Add multiple fields to test mobile optimization
    const fieldTypes = ['wedding_date', 'venue_address', 'guest_count', 'email', 'phone'];
    
    for (const fieldType of fieldTypes) {
      const field = page.locator(`[data-field-type="${fieldType}"]`);
      const canvas = page.locator('[data-testid="form-canvas"]');
      await field.dragTo(canvas);
    }

    // Test mobile optimization
    await page.click('[data-testid="mobile-optimize-button"]');
    await page.waitForSelector('[data-testid="mobile-optimization-results"]');

    // Verify optimization score
    const mobileScore = await page.locator('[data-testid="mobile-score"]').textContent();
    const score = parseInt(mobileScore?.replace(/\D/g, '') || '0');
    expect(score).toBeGreaterThan(70); // Minimum acceptable mobile score

    // Verify touch targets are adequate
    const formFields = page.locator('[data-testid="mobile-form-field"]');
    const fieldCount = await formFields.count();
    
    for (let i = 0; i < fieldCount; i++) {
      const field = formFields.nth(i);
      const boundingBox = await field.boundingBox();
      
      // Verify minimum touch target size (48x48px)
      expect(boundingBox?.height).toBeGreaterThanOrEqual(48);
      expect(boundingBox?.width).toBeGreaterThanOrEqual(300); // Full width on mobile
    }
  });

  test('should handle form publishing and sharing', async () => {
    // Create simple form
    await page.fill('[data-testid="form-title"]', 'Test Wedding Form');
    
    const weddingDateField = page.locator('[data-field-type="wedding_date"]');
    const formCanvas = page.locator('[data-testid="form-canvas"]');
    await weddingDateField.dragTo(formCanvas);

    // Save form
    await page.click('[data-testid="save-form-button"]');
    await page.waitForSelector('[data-testid="success-message"]');

    // Publish form
    await page.click('[data-testid="publish-form-button"]');
    await expect(page.locator('[data-testid="form-published-message"]')).toBeVisible();

    // Verify shareable link is generated
    const shareLink = page.locator('[data-testid="shareable-form-link"]');
    await expect(shareLink).toBeVisible();
    
    const linkText = await shareLink.textContent();
    expect(linkText).toMatch(/https?:\/\/.+\/forms\/[a-f0-9-]+/);

    // Test form accessibility from share link
    const formUrl = await shareLink.getAttribute('href');
    await page.goto(formUrl!);
    
    // Verify public form loads correctly
    await expect(page.locator('[data-testid="public-form-title"]')).toContainText('Test Wedding Form');
    await expect(page.locator('[data-testid="wedding-date-field"]')).toBeVisible();
  });

  test('should validate form submission workflow', async () => {
    // Navigate to a published form
    await page.goto('/forms/test-form-id'); // Assuming a test form exists

    // Fill out form
    await page.fill('[data-testid="wedding-date-input"]', '2025-06-15');
    await page.fill('[data-testid="client-email-input"]', 'couple@example.com');
    await page.fill('[data-testid="venue-address-input"]', '123 Wedding Venue St, City, State');
    await page.fill('[data-testid="guest-count-input"]', '150');

    // Submit form
    await page.click('[data-testid="submit-form-button"]');

    // Verify success message
    await expect(page.locator('[data-testid="form-success-message"]')).toContainText('Thank you for your submission');

    // Verify confirmation details
    await expect(page.locator('[data-testid="confirmation-details"]')).toContainText('We\'ll be in touch soon');
  });
});
```

### AI Integration Testing Suite
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/ai/form-generation.test.ts

import { FormGenerationService } from '@/lib/services/form-generation-service';
import { OpenAI } from 'openai';

// Mock OpenAI
jest.mock('openai');
const mockOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe('AI Form Generation Testing', () => {
  let formService: FormGenerationService;

  beforeEach(() => {
    formService = new FormGenerationService();
    
    // Setup OpenAI mock
    mockOpenAI.prototype.chat = {
      completions: {
        create: jest.fn()
      }
    } as any;
  });

  test('should generate photographer form with appropriate fields', async () => {
    // Mock AI response for photographer form
    const mockAIResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            title: "Wedding Photography Details",
            description: "Please provide details for your wedding photography",
            fields: [
              {
                id: "1",
                type: "wedding_date",
                label: "Wedding Date",
                required: true,
                mapping: "wedding_date"
              },
              {
                id: "2",
                type: "text",
                label: "Photography Style Preference",
                required: false,
                options: ["Traditional", "Photojournalistic", "Fine Art", "Lifestyle"]
              },
              {
                id: "3",
                type: "venue_address",
                label: "Wedding Venue",
                required: true,
                mapping: "venue_address"
              },
              {
                id: "4",
                type: "guest_count",
                label: "Expected Guest Count",
                required: true,
                mapping: "estimated_guest_count"
              }
            ]
          })
        }
      }],
      usage: {
        total_tokens: 500
      }
    };

    (mockOpenAI.prototype.chat.completions.create as jest.Mock).mockResolvedValue(mockAIResponse);

    const result = await formService.generateFormForVendor('photographer');

    expect(result.fields).toHaveLength(4);
    expect(result.fields).toContainEqual(
      expect.objectContaining({
        type: 'wedding_date',
        mapping: 'wedding_date'
      })
    );
    expect(result.fields).toContainEqual(
      expect.objectContaining({
        type: 'venue_address',
        mapping: 'venue_address'
      })
    );
  });

  test('should generate venue form with capacity and catering fields', async () => {
    const mockVenueResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            title: "Wedding Venue Booking Form",
            description: "Complete wedding venue details",
            fields: [
              {
                id: "1",
                type: "wedding_date",
                label: "Preferred Wedding Date",
                required: true,
                mapping: "wedding_date"
              },
              {
                id: "2",
                type: "guest_count",
                label: "Guest Count",
                required: true,
                mapping: "estimated_guest_count"
              },
              {
                id: "3",
                type: "select",
                label: "Catering Style",
                required: true,
                options: ["Buffet", "Plated Dinner", "Family Style", "Cocktail Reception"]
              },
              {
                id: "4",
                type: "textarea",
                label: "Dietary Restrictions",
                required: false
              }
            ]
          })
        }
      }],
      usage: { total_tokens: 450 }
    };

    (mockOpenAI.prototype.chat.completions.create as jest.Mock).mockResolvedValue(mockVenueResponse);

    const result = await formService.generateFormForVendor('venue');

    expect(result.fields).toContainEqual(
      expect.objectContaining({
        label: 'Catering Style',
        options: expect.arrayContaining(['Buffet', 'Plated Dinner'])
      })
    );
    expect(result.fields).toContainEqual(
      expect.objectContaining({
        label: 'Dietary Restrictions',
        type: 'textarea'
      })
    );
  });

  test('should handle AI service failures gracefully', async () => {
    // Mock AI service failure
    (mockOpenAI.prototype.chat.completions.create as jest.Mock).mockRejectedValue(
      new Error('OpenAI API rate limit exceeded')
    );

    const result = await formService.generateFormForVendor('photographer');

    // Should fallback to default form template
    expect(result.fields).toBeDefined();
    expect(result.fields.length).toBeGreaterThan(0);
    expect(result.title).toContain('Wedding Form');
    expect(result.error).toBe('AI generation failed, using template');
  });

  test('should validate AI-generated forms against schema', async () => {
    const invalidAIResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            title: "", // Invalid: empty title
            fields: [
              {
                // Missing required fields: id, type, label
                type: "invalid_type",
                required: "not a boolean"
              }
            ]
          })
        }
      }],
      usage: { total_tokens: 100 }
    };

    (mockOpenAI.prototype.chat.completions.create as jest.Mock).mockResolvedValue(invalidAIResponse);

    const result = await formService.generateFormForVendor('photographer');

    // Should validate and correct invalid fields
    expect(result.title).toBeTruthy(); // Should have fallback title
    expect(result.fields).toBeDefined();
    
    result.fields.forEach(field => {
      expect(field.id).toBeDefined();
      expect(field.type).toBeDefined();
      expect(field.label).toBeDefined();
      expect(typeof field.required).toBe('boolean');
    });
  });

  test('should optimize mobile forms with AI', async () => {
    const originalFields = [
      { id: '1', type: 'textarea', label: 'Long Description', position: 0 },
      { id: '2', type: 'wedding_date', label: 'Wedding Date', position: 1 },
      { id: '3', type: 'email', label: 'Email', position: 2 },
      { id: '4', type: 'textarea', label: 'Another Long Text', position: 3 },
      { id: '5', type: 'select', label: 'Complex Selection', position: 4, options: Array.from({length: 20}, (_, i) => `Option ${i}`) }
    ];

    const mockOptimizationResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            optimized_fields: [
              { id: '2', type: 'wedding_date', label: 'Wedding Date', position: 0 }, // Moved to top
              { id: '3', type: 'email', label: 'Email', position: 1 },
              { id: '1', type: 'textarea', label: 'Long Description', position: 2 },
              { id: '5', type: 'select', label: 'Style Preference', position: 3, options: ['Modern', 'Classic', 'Rustic'] } // Simplified
            ],
            recommendations: [
              "Moved wedding date to top for better mobile completion",
              "Simplified selection options for mobile users",
              "Removed redundant text fields"
            ],
            mobile_score: 85
          })
        }
      }],
      usage: { total_tokens: 300 }
    };

    (mockOpenAI.prototype.chat.completions.create as jest.Mock).mockResolvedValue(mockOptimizationResponse);

    const optimization = await formService.optimizeForMobile('test-form', originalFields);

    expect(optimization.mobile_score).toBe(85);
    expect(optimization.recommendations).toHaveLength(3);
    expect(optimization.optimized_fields).toHaveLength(4); // One field removed
    
    // Verify wedding date moved to position 0
    const weddingDateField = optimization.optimized_fields.find(f => f.type === 'wedding_date');
    expect(weddingDateField?.position).toBe(0);
  });
});
```

### Mobile Form Testing Suite
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/mobile/mobile-form-interactions.test.ts

import { render, fireEvent, waitFor } from '@testing-library/react';
import { MobileFormCanvas } from '@/components/mobile/forms/mobile-form-canvas';
import { MobileFormBuilderPWA } from '@/lib/pwa/mobile-form-builder';

describe('Mobile Form Interactions', () => {
  let formBuilder: MobileFormBuilderPWA;

  beforeEach(async () => {
    formBuilder = new MobileFormBuilderPWA();
    await formBuilder.initialize();
  });

  test('should handle touch drag-and-drop for field reordering', async () => {
    const mockFields = [
      { id: '1', type: 'text', label: 'Field 1', position: 0, required: false },
      { id: '2', type: 'email', label: 'Field 2', position: 1, required: false }
    ];

    const onFieldUpdate = jest.fn();

    const { container } = render(
      <MobileFormCanvas
        fields={mockFields}
        selectedFieldId={null}
        onFieldSelect={jest.fn()}
        onFieldUpdate={onFieldUpdate}
        onFieldDelete={jest.fn()}
        onFieldAdd={jest.fn()}
        onAIOptimize={jest.fn()}
      />
    );

    // Get first field
    const firstField = container.querySelector('[data-field-index="0"]');
    expect(firstField).toBeTruthy();

    // Simulate touch drag sequence
    fireEvent.touchStart(firstField!, {
      touches: [{ clientX: 100, clientY: 100, identifier: 0 }]
    });

    fireEvent.touchMove(firstField!, {
      touches: [{ clientX: 100, clientY: 200, identifier: 0 }]
    });

    fireEvent.touchEnd(firstField!, {
      changedTouches: [{ clientX: 100, clientY: 200, identifier: 0 }]
    });

    // Verify field position update was called
    await waitFor(() => {
      expect(onFieldUpdate).toHaveBeenCalled();
    });
  });

  test('should validate touch target sizes for accessibility', async () => {
    const mockFields = [
      { id: '1', type: 'wedding_date', label: 'Wedding Date', position: 0, required: true }
    ];

    const { container } = render(
      <MobileFormCanvas
        fields={mockFields}
        selectedFieldId={null}
        onFieldSelect={jest.fn()}
        onFieldUpdate={jest.fn()}
        onFieldDelete={jest.fn()}
        onFieldAdd={jest.fn()}
        onAIOptimize={jest.fn()}
      />
    );

    // Check touch target sizes
    const touchTargets = container.querySelectorAll('[data-testid*="button"], button, [role="button"]');
    
    touchTargets.forEach(target => {
      const styles = window.getComputedStyle(target);
      const minSize = 48; // WCAG minimum touch target size
      
      const height = parseInt(styles.height) || parseInt(styles.minHeight);
      const width = parseInt(styles.width) || parseInt(styles.minWidth);
      
      expect(height).toBeGreaterThanOrEqual(minSize);
      expect(width).toBeGreaterThanOrEqual(minSize);
    });
  });

  test('should handle offline form creation and sync', async () => {
    // Mock offline state
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false,
    });

    const formData = {
      title: 'Offline Test Form',
      description: 'Created while offline',
      fields: [
        {
          id: '1',
          type: 'wedding_date',
          label: 'Wedding Date',
          required: true,
          position: 0
        }
      ]
    };

    const formId = await formBuilder.createFormOffline(formData);
    expect(formId).toMatch(/^offline_/);

    // Verify form stored locally
    const offlineForm = await formBuilder.getFormFromStorage(formId);
    expect(offlineForm).toBeTruthy();
    expect(offlineForm.title).toBe('Offline Test Form');
    expect(offlineForm.offline_created).toBe(true);

    // Mock going back online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });

    // Mock successful sync response
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 'server-form-id', ...formData })
    });

    const syncResult = await formBuilder.syncWhenOnline();
    expect(syncResult.success).toBe(1);
    expect(syncResult.failed).toBe(0);
  });

  test('should optimize form layout for mobile devices', async () => {
    const longFormFields = Array.from({ length: 15 }, (_, i) => ({
      id: `field-${i}`,
      type: i % 2 === 0 ? 'text' : 'textarea',
      label: `Field ${i + 1}`,
      position: i,
      required: false
    }));

    const optimization = await formBuilder.optimizeFormForMobile('test-form', longFormFields);

    // Should provide optimization recommendations
    expect(optimization.recommendations).toBeInstanceOf(Array);
    expect(optimization.recommendations.length).toBeGreaterThan(0);

    // Should have reasonable mobile score
    expect(optimization.mobile_score).toBeGreaterThan(0);
    expect(optimization.mobile_score).toBeLessThanOrEqual(100);

    // Should reorder fields for better mobile UX
    const optimizedFields = optimization.optimized_fields;
    expect(optimizedFields).toBeDefined();
    
    // Wedding-specific fields should be prioritized
    const weddingFields = optimizedFields.filter(f => 
      ['wedding_date', 'client_email', 'venue_address'].includes(f.type)
    );
    
    if (weddingFields.length > 0) {
      weddingFields.forEach(field => {
        expect(field.position).toBeLessThan(5); // Should be in top 5
      });
    }
  });

  test('should handle gesture recognition for form interactions', async () => {
    const mockFields = [
      { id: '1', type: 'text', label: 'Test Field', position: 0, required: false }
    ];

    const onFieldSelect = jest.fn();
    const onFieldDelete = jest.fn();

    const { container } = render(
      <MobileFormCanvas
        fields={mockFields}
        selectedFieldId={null}
        onFieldSelect={onFieldSelect}
        onFieldUpdate={jest.fn()}
        onFieldDelete={onFieldDelete}
        onFieldAdd={jest.fn()}
        onAIOptimize={jest.fn()}
      />
    );

    const fieldElement = container.querySelector('[data-field-index="0"]');

    // Test tap gesture (short touch)
    fireEvent.touchStart(fieldElement!, {
      touches: [{ clientX: 100, clientY: 100, identifier: 0 }]
    });

    setTimeout(() => {
      fireEvent.touchEnd(fieldElement!, {
        changedTouches: [{ clientX: 100, clientY: 100, identifier: 0 }]
      });
    }, 100); // Short tap

    await waitFor(() => {
      expect(onFieldSelect).toHaveBeenCalledWith('1');
    });

    // Test long press (would typically open context menu)
    fireEvent.touchStart(fieldElement!, {
      touches: [{ clientX: 100, clientY: 100, identifier: 0 }]
    });

    setTimeout(() => {
      fireEvent.touchEnd(fieldElement!, {
        changedTouches: [{ clientX: 100, clientY: 100, identifier: 0 }]
      });
    }, 600); // Long press

    // Long press behavior would depend on implementation
    // This test ensures the gesture is recognized
  });
});
```

### Wedding Vendor Documentation Guide
```markdown
# Wedding Photographers: Complete Form Builder Guide

## Getting Started with WedSync Form Builder

Welcome to the comprehensive form builder designed specifically for wedding photographers. This guide will help you create professional forms that collect all the essential information you need from your couples.

### Quick Start for Photographers

#### Your Essential Wedding Photography Forms
1. **Initial Inquiry Form** - Capture basic wedding details and photography needs
2. **Wedding Details Form** - Comprehensive wedding information collection
3. **Timeline Planning Form** - Detailed schedule and shot list preferences
4. **Final Details Form** - Last-minute updates and special requests

### Step-by-Step: Creating Your First Photography Form

#### Step 1: Access the Form Builder
1. Navigate to **Forms** → **Create New Form**
2. Choose **"Start from Template"** and select **"Wedding Photography"**
3. Or choose **"AI Generate"** and select **"Photographer"** for intelligent form creation

#### Step 2: Essential Fields for Photography Forms

**Must-Have Wedding Fields:**
- [x] **Wedding Date** - Automatically validates date and checks availability
- [x] **Venue Address** - Integrates with maps for location scouting
- [x] **Ceremony & Reception Times** - Critical for timeline planning
- [x] **Guest Count** - Helps determine equipment and positioning needs
- [x] **Photography Style Preference** - Traditional, photojournalistic, fine art, lifestyle

**Contact & Communication Fields:**
- [x] **Couple's Names** - Bride, groom, or partner names
- [x] **Primary Email** - Main communication channel
- [x] **Phone Numbers** - Essential for wedding day coordination
- [x] **Preferred Communication Method** - Email, text, or phone

**Photography-Specific Fields:**
- [x] **Photography Package Interest** - Engagement, wedding day, trash the dress
- [x] **Special Requests** - Cultural ceremonies, religious requirements, family dynamics
- [x] **Photo Restrictions** - Areas where photography isn't allowed
- [x] **Family Photo Requirements** - Key family combinations and VIP guests

#### Step 3: Using AI Form Generation for Photographers

The AI form generator creates intelligent photography forms based on your business type:

1. Click **"AI Generate Form"**
2. Select **"Wedding Photographer"**
3. Choose form purpose:
   - **Initial Inquiry** - For website contact forms
   - **Wedding Details** - Comprehensive information gathering
   - **Timeline Planning** - Schedule and shot list coordination
   - **Final Details** - Week-of-wedding updates

**AI Generated Fields Include:**
- Smart photography timeline questions
- Venue-specific photography considerations
- Equipment planning questions
- Seasonal photography adjustments
- Cultural and religious ceremony requirements

#### Step 4: Mobile Optimization for Photographers

**Why Mobile Matters for Wedding Photographers:**
- 70% of couples browse wedding vendors on mobile devices
- Engagement shoots often involve on-site form completion
- Wedding day updates require mobile-friendly interfaces

**Mobile Optimization Features:**
- **Touch-Optimized Fields** - Large, easy-to-tap input areas
- **Camera Integration** - Photo upload directly from phone camera
- **Location Services** - Auto-fill venue addresses with GPS
- **Offline Capability** - Forms work without internet at remote venues

### Advanced Photography Form Features

#### Real-Time Client Integration
When couples submit your forms, the information automatically:
- Creates or updates their client profile
- Populates wedding timeline templates
- Integrates with your calendar system
- Triggers automated email sequences

#### Wedding Timeline Integration
Photography forms smart-map to timeline creation:
- **Ceremony start time** → **Photographer arrival time calculation**
- **Guest count** → **Group photo time estimates**
- **Venue address** → **Travel time calculations**
- **Special requests** → **Timeline buffer adjustments**

#### Seasonal Photography Adjustments
Forms automatically adapt based on wedding season:
- **Summer weddings** - Heat considerations and golden hour timing
- **Winter weddings** - Indoor lighting and weather backup plans
- **Spring/Fall** - Seasonal décor and changing light conditions

### Photography Business Integration

#### CRM Integration Options
Your WedSync forms integrate seamlessly with:
- **Tave** - Automatic lead creation and workflow triggers
- **HoneyBook** - Project creation and timeline population
- **Dubsado** - Client onboarding automation
- **17hats** - Lead management and follow-up sequences

#### Email Marketing Integration
Form submissions can trigger:
- **Engagement session welcome emails**
- **Wedding planning timeline guides**
- **Vendor recommendation sharing**
- **Review request sequences post-wedding**

### Wedding Day Emergency Protocols

#### Critical Information Collection
Every photography form should collect:
- **Emergency contacts** - Both families' key coordinators
- **Vendor contact list** - Coordinator, DJ, videographer contacts
- **Timeline backup plans** - Weather and scheduling contingencies
- **VIP guest list** - Must-photograph family members

#### Mobile Access During Weddings
- Forms sync across all devices instantly
- Offline access to client information at venues
- Real-time client updates during wedding day
- Emergency contact quick-dial functionality

### Troubleshooting Common Photography Form Issues

#### Low Form Completion Rates
**Problem:** Couples start but don't finish forms
**Solutions:**
- Keep initial inquiry forms to 5 fields maximum
- Use progressive disclosure for detailed information
- Implement auto-save every 30 seconds
- Send gentle reminder emails for incomplete forms

#### Missing Critical Information
**Problem:** Important photography details not captured
**Solutions:**
- Use conditional logic to reveal relevant follow-up questions
- Mark essential fields as required with clear explanations
- Include helpful tooltips for complex photography terms
- Provide examples for subjective preferences

#### Mobile Form Problems
**Problem:** Forms difficult to complete on phones
**Solutions:**
- Test forms on actual mobile devices regularly
- Use large, thumb-friendly touch targets
- Minimize typing with smart selection options
- Implement voice-to-text for longer responses

### Performance Metrics for Photography Forms

#### Key Metrics to Track
- **Completion Rate** - Percentage of started forms completed
- **Time to Complete** - Average duration for form completion
- **Field Abandonment** - Where couples typically stop filling out forms
- **Conversion Rate** - Forms that lead to booked sessions

#### Optimization Recommendations
- **Forms under 2 minutes** typically see 80%+ completion rates
- **Mobile-optimized forms** convert 40% better than desktop-only
- **Wedding date fields** should validate against your availability
- **Photography style examples** increase engagement by 25%

### Getting Advanced with Form Logic

#### Conditional Field Display
Create smart forms that adapt based on responses:
- **Engagement session interest** → **Show engagement-specific questions**
- **Cultural ceremony** → **Display cultural photography requirements**
- **Multiple venues** → **Reveal venue-specific timing questions**
- **Destination wedding** → **Show travel and accommodation fields**

#### Smart Validation Rules
Protect your business with intelligent validation:
- **Wedding dates** must be future dates and not on your blocked calendar
- **Guest counts** trigger appropriate photography package recommendations
- **Venue addresses** verify against your service areas
- **Contact information** validates email formats and phone numbers

### Integration with Wedding Vendor Network

#### Vendor Referral Forms
Create forms that benefit your vendor network:
- **Venue information** shared with preferred planners
- **Catering needs** forwarded to trusted caterers
- **Floral preferences** sent to partner florists
- **Music requirements** connected to recommended DJs

#### Collaborative Planning
Photography forms that enhance vendor coordination:
- **Shared timeline access** for all wedding vendors
- **Vendor contact synchronization** across planning platforms
- **Unified couple communication** preventing information silos
- **Real-time update notifications** to all wedding professionals

### Seasonal Photography Form Strategies

#### Peak Wedding Season (May - October)
- **Simplified quick-inquiry forms** for high-volume periods
- **Automated screening** based on budget and date availability
- **Priority booking** systems for premium packages
- **Waitlist management** for popular dates

#### Off-Season Engagement (November - April)
- **Detailed consultation forms** for thorough client vetting
- **Engagement session promotions** during slower periods
- **Wedding planning education** through extended forms
- **Next-season booking** incentives and early-bird packages

### Legal and Contract Integration

#### Information Collection for Contracts
Photography forms that support contract generation:
- **Complete couple information** for legal documents
- **Wedding details** for service agreement specifics
- **Package selections** for pricing and deliverable clarity
- **Special requirements** for contract addendums

#### Model Release Integration
Streamline legal compliance:
- **Guest photography permissions** collected upfront
- **Social media usage** agreements integrated into forms
- **Vendor photography** permissions for marketing use
- **Publication rights** clearly explained and agreed upon

---

**This comprehensive guide ensures your photography forms collect all essential information while providing an excellent client experience. Regular updates and optimization based on client feedback and conversion metrics will maximize your form effectiveness.**
```

## 🔍 ACCESSIBILITY & SECURITY TESTING

### Comprehensive Accessibility Testing Suite
```typescript
// File: $WS_ROOT/wedsync/src/__tests__/accessibility/form-accessibility.test.ts

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Form Accessibility Compliance', () => {
  test('form builder meets WCAG 2.1 AA standards', async ({ page }) => {
    await page.goto('/forms/builder');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude(['[data-testid="ai-loading"]']) // Exclude loading states
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('mobile forms support screen readers', async ({ page }) => {
    await page.goto('/forms/test-form');
    
    // Check for proper ARIA labels
    const formFields = page.locator('[role="textbox"], [role="combobox"], [role="button"]');
    const fieldCount = await formFields.count();
    
    for (let i = 0; i < fieldCount; i++) {
      const field = formFields.nth(i);
      
      // Every interactive element should have an accessible name
      const accessibleName = await field.getAttribute('aria-label') || 
                            await field.getAttribute('aria-labelledby') ||
                            await field.textContent();
      
      expect(accessibleName).toBeTruthy();
    }
  });

  test('keyboard navigation works throughout form builder', async ({ page }) => {
    await page.goto('/forms/builder');
    
    // Tab through all focusable elements
    await page.keyboard.press('Tab'); // Form title
    await expect(page.locator('[data-testid="form-title"]')).toBeFocused();
    
    await page.keyboard.press('Tab'); // Form description
    await expect(page.locator('[data-testid="form-description"]')).toBeFocused();
    
    // Continue through all major interactive elements
    await page.keyboard.press('Tab'); // Add field button
    await expect(page.locator('[data-testid="add-field-button"]')).toBeFocused();
    
    // Test Enter key activation
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="field-palette"]')).toBeVisible();
  });
});
```

## 📊 MANDATORY: UPDATE PROJECT DASHBOARD AFTER COMPLETION

```json
{
  "id": "WS-306-forms-system-section-overview",
  "status": "completed",
  "completion": "100%",
  "completed_date": "2025-01-25",
  "testing_status": "completed",
  "team": "Team E",
  "notes": "Forms system QA completed. Comprehensive testing suite, AI validation, mobile optimization testing, accessibility compliance, complete wedding vendor documentation."
}
```

---

**WedSync Forms System QA - Tested, Validated, Wedding-Ready! ✅📋📚**