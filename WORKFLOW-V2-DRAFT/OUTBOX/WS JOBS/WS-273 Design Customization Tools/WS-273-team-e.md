# TEAM E - ROUND 1: WS-273 - Design Customization Tools
## 2025-01-14 - Development Round 1

**YOUR MISSION:** Ensure bulletproof quality for design customization with comprehensive testing, documentation, performance validation, and user acceptance testing for wedding couples customizing their websites
**FEATURE ID:** WS-273 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about creating comprehensive quality assurance that ensures every couple can create their perfect wedding website without any bugs, performance issues, or confusion

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **FILE EXISTENCE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/src/__tests__/components/wedme/website/
ls -la $WS_ROOT/wedsync/docs/features/design-customization/
ls -la $WS_ROOT/wedsync/playwright-tests/design-customization/
cat $WS_ROOT/wedsync/src/__tests__/components/wedme/website/DesignCustomizer.test.tsx | head -20
cat $WS_ROOT/wedsync/docs/features/design-customization/user-guide.md | head -20
```

2. **TEST COVERAGE RESULTS:**
```bash
npm run test:coverage
# MUST show: >90% coverage for design customization components
```

3. **E2E TEST RESULTS:**
```bash
npm run test:e2e design-customization
# MUST show: "All E2E tests passing"
```

4. **PERFORMANCE TEST RESULTS:**
```bash
npm run test:performance design-customization
# MUST show performance benchmarks within acceptable ranges
```

**Teams submitting hallucinated test results will be rejected immediately.**

## 📚 STEP 1: ENHANCED DOCUMENTATION & CODEBASE ANALYSIS (MANDATORY - 10 MINUTES!)

### A. SERENA PROJECT ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Activate Serena for semantic code understanding
await mcp__serena__activate_project("$WS_ROOT/wedsync");
await mcp__serena__switch_modes(["editing", "interactive"]);
await mcp__serena__check_onboarding_performed();

// Query testing patterns and documentation structure
await mcp__serena__search_for_pattern("test|spec|documentation|user.*guide|qa");
await mcp__serena__find_symbol("test", "", true);
await mcp__serena__find_symbol("describe", "", true);
await mcp__serena__get_symbols_overview("src/__tests__");
await mcp__serena__get_symbols_overview("docs");
await mcp__serena__search_for_pattern("playwright|jest|testing.*library");
```

### B. TESTING & QA DOCUMENTATION (MANDATORY)
```typescript
// CRITICAL: Load testing standards and patterns
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/TESTING-STANDARDS.md");
await mcp__serena__read_file("$WS_ROOT/.claude/QA-CHECKLIST.md");
await mcp__serena__read_file("$WS_ROOT/WORKFLOW-V2-DRAFT/DOCUMENTATION-STANDARDS.md");
```

### C. REF MCP CURRENT DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to testing and QA
mcp__Ref__ref_search_documentation("React Testing Library best practices component testing")
mcp__Ref__ref_search_documentation("Jest testing framework mocking API calls React hooks")
mcp__Ref__ref_search_documentation("Playwright E2E testing visual regression screenshots")
mcp__Ref__ref_search_documentation("Performance testing React components bundle size optimization")
mcp__Ref__ref_search_documentation("Accessibility testing screen readers WCAG compliance")
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPREHENSIVE QA STRATEGY

### Use Sequential Thinking MCP for Complex Analysis
```typescript
// Use for comprehensive QA strategy planning
mcp__sequential-thinking__sequential_thinking({
  thought: "Comprehensive QA for design customization requires: 1) Unit tests for all React components with 90%+ coverage 2) Integration tests for API endpoints and data flow 3) E2E tests for complete user workflows with Playwright 4) Performance tests for mobile devices and slow networks 5) Accessibility tests for screen readers and keyboard navigation 6) Visual regression tests for design consistency 7) User acceptance testing with real couples 8) Documentation for users and developers. The key is testing the actual wedding use case - couples creating their dream website design.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 6
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH SPECIFIC MISSIONS

Launch these agents with comprehensive requirements:

1. **task-tracker-coordinator** - Break down testing tasks, track coverage dependencies
2. **test-automation-architect** - Comprehensive testing strategy with multiple test types
3. **security-compliance-officer** - Security testing and vulnerability assessment
4. **code-quality-guardian** - Code quality metrics and standards compliance
5. **playwright-visual-testing-specialist** - Visual regression and E2E testing
6. **documentation-chronicler** - User guides, API docs, and technical documentation

## 🔒 TESTING SECURITY REQUIREMENTS (NON-NEGOTIABLE!)

### SECURITY TESTING CHECKLIST:
- [ ] **Input validation testing** - Test all color/font inputs with malicious data
- [ ] **CSS injection testing** - Test custom CSS input with XSS payloads
- [ ] **API security testing** - Test all design API endpoints for vulnerabilities
- [ ] **Authentication testing** - Verify proper access control for design operations
- [ ] **Rate limiting testing** - Ensure API rate limits prevent abuse
- [ ] **Data sanitization testing** - Verify all user inputs are properly sanitized
- [ ] **CSRF protection testing** - Test cross-site request forgery protection
- [ ] **Audit logging testing** - Verify all design changes are properly logged
- [ ] **Offline security testing** - Test PWA offline storage encryption
- [ ] **Mobile security testing** - Test touch hijacking and viewport manipulation

## 🧪 COMPREHENSIVE TESTING STRATEGY

### 1. Unit Testing (90%+ Coverage Required)
```typescript
// Location: /src/__tests__/components/wedme/website/DesignCustomizer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { DesignCustomizer } from '@/components/wedme/website/DesignCustomizer';
import { DesignEngine } from '@/lib/website/design-engine';
import { GoogleFontsIntegration } from '@/lib/integrations/google-fonts';

// Mock external dependencies
jest.mock('@/lib/website/design-engine');
jest.mock('@/lib/integrations/google-fonts');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn()
  })
}));

const mockDesignEngine = jest.mocked(DesignEngine);
const mockGoogleFonts = jest.mocked(GoogleFontsIntegration);

describe('DesignCustomizer Component', () => {
  const defaultProps = {
    coupleId: 'test-couple-123',
    websiteId: 'test-website-456',
    onDesignChange: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful responses
    mockDesignEngine.prototype.generateCSS = jest.fn().mockResolvedValue('/* generated css */');
    mockGoogleFonts.prototype.getFontList = jest.fn().mockResolvedValue([
      { family: 'Inter', category: 'sans-serif', variants: ['400', '500', '600'] },
      { family: 'Playfair Display', category: 'serif', variants: ['400', '500', '600'] }
    ]);
  });

  describe('Initialization and Loading', () => {
    it('should render loading state initially', () => {
      render(<DesignCustomizer {...defaultProps} />);
      
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
      expect(screen.queryByText('Customize Your Website')).not.toBeInTheDocument();
    });

    it('should load design and presets on mount', async () => {
      // Mock API responses
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            design: {
              id: 'design-123',
              primary_color: '#6B7280',
              secondary_color: '#9CA3AF',
              heading_font: 'Inter',
              body_font: 'Inter'
            },
            presets: [
              {
                id: 'preset-1',
                name: 'Elegant',
                category: 'classic',
                primary_color: '#1F2937'
              }
            ]
          })
        });

      render(<DesignCustomizer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText('Customize Your Website')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/wedme/website/design')
      );
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(new Error('API Error'));

      render(<DesignCustomizer {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByText(/error loading design/i)).toBeInTheDocument();
      });
    });
  });

  describe('Color Customization', () => {
    beforeEach(async () => {
      // Setup component with loaded state
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          design: { primary_color: '#6B7280' },
          presets: []
        })
      });

      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Customize Your Website')).toBeInTheDocument();
      });
    });

    it('should update primary color when color picker changes', async () => {
      // Click on Colors tab
      const colorsTab = screen.getByRole('tab', { name: /colors/i });
      fireEvent.click(colorsTab);

      // Find and change primary color
      const primaryColorInput = screen.getByLabelText(/primary color/i);
      fireEvent.change(primaryColorInput, { target: { value: '#FF0000' } });

      await waitFor(() => {
        expect(mockDesignEngine.prototype.generateCSS).toHaveBeenCalledWith(
          expect.objectContaining({
            primary_color: '#FF0000'
          })
        );
      });
    });

    it('should validate color format', async () => {
      const colorsTab = screen.getByRole('tab', { name: /colors/i });
      fireEvent.click(colorsTab);

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      fireEvent.change(primaryColorInput, { target: { value: 'invalid-color' } });

      await waitFor(() => {
        expect(screen.getByText(/invalid color format/i)).toBeInTheDocument();
      });
    });

    it('should apply wedding color palettes', async () => {
      const colorsTab = screen.getByRole('tab', { name: /colors/i });
      fireEvent.click(colorsTab);

      const classicPalette = screen.getByText(/classic/i);
      fireEvent.click(classicPalette);

      // Should apply preset colors
      await waitFor(() => {
        expect(mockDesignEngine.prototype.generateCSS).toHaveBeenCalled();
      });
    });
  });

  describe('Typography Customization', () => {
    it('should load and display Google Fonts', async () => {
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          design: { heading_font: 'Inter' },
          presets: []
        })
      });

      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Customize Your Website')).toBeInTheDocument();
      });

      const typographyTab = screen.getByRole('tab', { name: /typography/i });
      fireEvent.click(typographyTab);

      await waitFor(() => {
        expect(mockGoogleFonts.prototype.getFontList).toHaveBeenCalled();
        expect(screen.getByText('Playfair Display')).toBeInTheDocument();
      });
    });

    it('should update font selection', async () => {
      // Test font selection change
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            design: { heading_font: 'Inter' },
            presets: []
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            design: { heading_font: 'Playfair Display' }
          })
        });

      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Customize Your Website')).toBeInTheDocument();
      });

      const typographyTab = screen.getByRole('tab', { name: /typography/i });
      fireEvent.click(typographyTab);

      const fontSelector = screen.getByLabelText(/heading font/i);
      fireEvent.change(fontSelector, { target: { value: 'Playfair Display' } });

      const saveButton = screen.getByRole('button', { name: /save design/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/wedme/website/design',
          expect.objectContaining({
            method: 'PUT',
            body: expect.stringContaining('Playfair Display')
          })
        );
      });
    });
  });

  describe('Preset Application', () => {
    it('should apply design preset', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            design: { primary_color: '#6B7280' },
            presets: [{
              id: 'elegant-preset',
              name: 'Elegant',
              category: 'classic',
              primary_color: '#1F2937'
            }]
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            design: { primary_color: '#1F2937' }
          })
        });

      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Elegant')).toBeInTheDocument();
      });

      const elegantPreset = screen.getByText('Elegant');
      fireEvent.click(elegantPreset);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/wedme/website/design/preset/elegant-preset',
          expect.objectContaining({
            method: 'POST'
          })
        );
      });
    });
  });

  describe('Live Preview', () => {
    it('should update live preview when design changes', async () => {
      render(<DesignCustomizer {...defaultProps} />);
      
      // Setup loaded state
      await waitFor(() => {
        expect(screen.getByText('Live Preview')).toBeInTheDocument();
      });

      // Change a design element
      const colorsTab = screen.getByRole('tab', { name: /colors/i });
      fireEvent.click(colorsTab);

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      fireEvent.change(primaryColorInput, { target: { value: '#FF0000' } });

      // Should generate new CSS
      await waitFor(() => {
        expect(mockDesignEngine.prototype.generateCSS).toHaveBeenCalledWith(
          expect.objectContaining({
            primary_color: '#FF0000'
          })
        );
      });
    });

    it('should switch between responsive preview modes', async () => {
      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('Live Preview')).toBeInTheDocument();
      });

      const mobileButton = screen.getByRole('button', { name: /mobile/i });
      fireEvent.click(mobileButton);

      expect(screen.getByText('📱 Mobile')).toHaveClass('bg-blue-500');
    });
  });

  describe('Form Validation and Error Handling', () => {
    it('should validate required fields', async () => {
      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save design/i })).toBeInTheDocument();
      });

      // Clear required field and try to save
      const colorsTab = screen.getByRole('tab', { name: /colors/i });
      fireEvent.click(colorsTab);

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      fireEvent.change(primaryColorInput, { target: { value: '' } });

      const saveButton = screen.getByRole('button', { name: /save design/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/primary color is required/i)).toBeInTheDocument();
      });
    });

    it('should handle save errors gracefully', async () => {
      global.fetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            design: { primary_color: '#6B7280' },
            presets: []
          })
        })
        .mockRejectedValueOnce(new Error('Save failed'));

      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save design/i })).toBeInTheDocument();
      });

      const saveButton = screen.getByRole('button', { name: /save design/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/failed to save design changes/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', async () => {
      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/primary color/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/heading font/i)).toBeInTheDocument();
        expect(screen.getByRole('tablist')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation', async () => {
      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        const firstTab = screen.getAllByRole('tab')[0];
        firstTab.focus();
        
        expect(document.activeElement).toBe(firstTab);
      });
    });
  });

  describe('Performance', () => {
    it('should debounce design changes', async () => {
      jest.useFakeTimers();
      
      render(<DesignCustomizer {...defaultProps} />);
      
      await waitFor(() => {
        const colorsTab = screen.getByRole('tab', { name: /colors/i });
        fireEvent.click(colorsTab);
      });

      const primaryColorInput = screen.getByLabelText(/primary color/i);
      
      // Rapid changes
      fireEvent.change(primaryColorInput, { target: { value: '#FF0000' } });
      fireEvent.change(primaryColorInput, { target: { value: '#00FF00' } });
      fireEvent.change(primaryColorInput, { target: { value: '#0000FF' } });

      // Only last change should be processed after debounce
      jest.advanceTimersByTime(500);

      await waitFor(() => {
        expect(mockDesignEngine.prototype.generateCSS).toHaveBeenCalledWith(
          expect.objectContaining({
            primary_color: '#0000FF'
          })
        );
      });

      jest.useRealTimers();
    });
  });
});
```

### 2. Integration Testing
```typescript
// Location: /src/__tests__/api/wedme/website/design.test.ts
import { createMocks } from 'node-mocks-http';
import { POST, GET, PUT } from '@/app/api/wedme/website/design/route';
import { DesignEngine } from '@/lib/website/design-engine';

jest.mock('@/lib/website/design-engine');
jest.mock('@/lib/supabase/server', () => ({
  createServerComponentClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({
            data: {
              id: 'test-design',
              primary_color: '#6B7280'
            }
          })
        })
      }),
      insert: () => ({
        select: () => Promise.resolve({
          data: [{ id: 'new-design' }]
        })
      }),
      update: () => ({
        eq: () => ({
          select: () => Promise.resolve({
            data: [{ id: 'updated-design' }]
          })
        })
      })
    })
  })
}));

describe('/api/wedme/website/design', () => {
  describe('GET', () => {
    it('should return design and presets for valid couple', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/wedme/website/design?coupleId=test-couple&websiteId=test-website',
      });

      await GET(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.design).toBeDefined();
      expect(data.presets).toBeInstanceOf(Array);
    });

    it('should require authentication', async () => {
      const { req, res } = createMocks({
        method: 'GET',
        url: '/api/wedme/website/design',
      });

      // Mock unauthenticated request
      jest.spyOn(require('@/lib/auth/server'), 'getServerSession')
        .mockResolvedValueOnce(null);

      await GET(req, res);

      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('PUT', () => {
    it('should update design with valid data', async () => {
      const updateData = {
        coupleId: 'test-couple',
        websiteId: 'test-website',
        theme: {
          primary_color: '#FF0000',
          secondary_color: '#00FF00'
        },
        typography: {
          heading_font: 'Playfair Display',
          body_font: 'Inter'
        }
      };

      const { req, res } = createMocks({
        method: 'PUT',
        body: updateData,
      });

      const mockGenerateCSS = jest.fn().mockResolvedValue('/* generated css */');
      (DesignEngine.prototype.generateCSS as jest.Mock) = mockGenerateCSS;

      await PUT(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.design).toBeDefined();
      expect(data.generated_css).toBe('/* generated css */');
    });

    it('should validate input data', async () => {
      const invalidData = {
        theme: {
          primary_color: 'invalid-color' // Invalid hex color
        }
      };

      const { req, res } = createMocks({
        method: 'PUT',
        body: invalidData,
      });

      await PUT(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(false);
      expect(data.error).toContain('Invalid color format');
    });

    it('should handle database errors', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: { coupleId: 'test-couple' },
      });

      // Mock database error
      jest.spyOn(require('@/lib/supabase/server'), 'createServerComponentClient')
        .mockImplementationOnce(() => ({
          from: () => ({
            update: () => ({
              eq: () => {
                throw new Error('Database error');
              }
            })
          })
        }));

      await PUT(req, res);

      expect(res._getStatusCode()).toBe(500);
    });
  });
});
```

### 3. End-to-End Testing with Playwright
```typescript
// Location: /playwright-tests/design-customization/design-workflow.spec.ts
import { test, expect, Page } from '@playwright/test';

test.describe('Design Customization Workflow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    
    // Login as a couple
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'emma@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Navigate to design customizer
    await page.goto('/wedme/website/customize');
  });

  test('should complete full design customization workflow', async () => {
    // Wait for customizer to load
    await expect(page.locator('text=Customize Your Website')).toBeVisible();

    // Step 1: Apply a preset
    await page.click('[data-testid="presets-tab"]');
    await page.click('[data-testid="preset-elegant"]');
    
    // Verify preset applied
    await expect(page.locator('text=Preset applied')).toBeVisible();

    // Step 2: Customize colors
    await page.click('[data-testid="colors-tab"]');
    await page.fill('[data-testid="primary-color-input"]', '#4F46E5');
    
    // Wait for live preview to update
    await page.waitForTimeout(500);
    
    // Step 3: Change typography
    await page.click('[data-testid="typography-tab"]');
    await page.selectOption('[data-testid="heading-font-select"]', 'Montserrat');
    
    // Step 4: Adjust layout
    await page.click('[data-testid="layout-tab"]');
    await page.click('[data-testid="header-style-hero"]');

    // Step 5: Test responsive preview
    await page.click('[data-testid="preview-mobile"]');
    await expect(page.locator('[data-testid="live-preview"]')).toHaveAttribute('data-viewport', 'mobile');
    
    await page.click('[data-testid="preview-tablet"]');
    await expect(page.locator('[data-testid="live-preview"]')).toHaveAttribute('data-viewport', 'tablet');
    
    await page.click('[data-testid="preview-desktop"]');
    await expect(page.locator('[data-testid="live-preview"]')).toHaveAttribute('data-viewport', 'desktop');

    // Step 6: Save design
    await page.click('[data-testid="save-design-button"]');
    await expect(page.locator('text=Design updated')).toBeVisible();

    // Step 7: Verify persistence
    await page.reload();
    await expect(page.locator('[data-testid="primary-color-input"]')).toHaveValue('#4F46E5');
    await expect(page.locator('[data-testid="heading-font-select"]')).toHaveValue('Montserrat');
  });

  test('should handle network errors gracefully', async () => {
    // Simulate network failure
    await page.route('**/api/wedme/website/design', route => {
      route.abort('failed');
    });

    await page.goto('/wedme/website/customize');

    // Should show error message
    await expect(page.locator('text=Error loading design')).toBeVisible();
    
    // Should allow retry
    await page.click('[data-testid="retry-button"]');
  });

  test('should be accessible via keyboard', async () => {
    await expect(page.locator('text=Customize Your Website')).toBeVisible();

    // Tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="presets-tab"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="colors-tab"]')).toBeFocused();

    // Enter to activate tab
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="colors-panel"]')).toBeVisible();

    // Navigate within color panel
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="primary-color-input"]')).toBeFocused();
  });

  test('should work on mobile devices', async () => {
    // Simulate iPhone
    await page.setViewportSize({ width: 375, height: 667 });

    await expect(page.locator('text=Customize Your Website')).toBeVisible();

    // Mobile-specific interactions
    await page.tap('[data-testid="colors-tab"]');
    
    // Touch-friendly color picker
    await page.tap('[data-testid="color-swatch-red"]');
    
    // Mobile preview should be default
    await expect(page.locator('[data-testid="preview-mobile"]')).toHaveClass(/active/);

    // Save should work on mobile
    await page.tap('[data-testid="save-design-button"]');
    await expect(page.locator('text=Design updated')).toBeVisible();
  });

  test('should validate user inputs', async () => {
    await expect(page.locator('text=Customize Your Website')).toBeVisible();

    // Try invalid color
    await page.click('[data-testid="colors-tab"]');
    await page.fill('[data-testid="primary-color-input"]', 'invalid-color');
    await page.click('[data-testid="save-design-button"]');
    
    await expect(page.locator('text=Invalid color format')).toBeVisible();

    // Try empty required field
    await page.fill('[data-testid="primary-color-input"]', '');
    await page.click('[data-testid="save-design-button"]');
    
    await expect(page.locator('text=Primary color is required')).toBeVisible();
  });

  test('should perform well on slow networks', async () => {
    // Simulate slow 3G
    await page.emulateNetworkConditions({
      offline: false,
      downloadThroughput: 1.5 * 1024, // 1.5 KB/s
      uploadThroughput: 750, // 750 B/s
      latency: 300
    });

    const startTime = Date.now();
    await page.goto('/wedme/website/customize');
    await expect(page.locator('text=Customize Your Website')).toBeVisible();
    const loadTime = Date.now() - startTime;

    // Should load within reasonable time even on slow network
    expect(loadTime).toBeLessThan(10000); // 10 seconds max
  });
});
```

## 🎯 TEAM E SPECIALIZATION: QA/TESTING & DOCUMENTATION FOCUS

**QA/TESTING & DOCUMENTATION FOCUS:**
- Comprehensive test suite (>90% coverage)
- E2E testing with Playwright MCP
- Documentation with screenshots
- Bug tracking and resolution
- Performance benchmarking
- Cross-browser compatibility

### TESTING DELIVERABLES:

#### 1. Complete Test Coverage
```typescript
// Coverage requirements by component:
// - DesignCustomizer.tsx: >95% coverage
// - ColorPicker.tsx: >90% coverage
// - FontSelector.tsx: >90% coverage
// - LivePreview.tsx: >90% coverage
// - API routes: >95% coverage
// - Integration services: >85% coverage
```

#### 2. Performance Testing
```typescript
// Location: /src/__tests__/performance/design-customization.perf.test.ts
import { chromium, Browser, Page } from 'playwright';

describe('Design Customization Performance', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch();
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('should load within performance budget', async () => {
    await page.goto('/wedme/website/customize');

    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise(resolve => {
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              vitals.loadTime = entry.loadEventEnd - entry.loadEventStart;
              vitals.domContentLoaded = entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart;
            }
            if (entry.entryType === 'paint') {
              if (entry.name === 'first-contentful-paint') {
                vitals.fcp = entry.startTime;
              }
            }
          });
          
          resolve(vitals);
        });
        
        observer.observe({ entryTypes: ['navigation', 'paint'] });
      });
    });

    // Performance assertions
    expect(vitals.fcp).toBeLessThan(2000); // FCP < 2s
    expect(vitals.loadTime).toBeLessThan(3000); // Load < 3s
  });

  test('should handle color changes performantly', async () => {
    await page.goto('/wedme/website/customize');
    await page.waitForSelector('[data-testid="colors-tab"]');
    
    const startTime = Date.now();
    
    // Make multiple rapid color changes
    for (let i = 0; i < 10; i++) {
      const color = `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
      await page.fill('[data-testid="primary-color-input"]', color);
      await page.waitForTimeout(50);
    }
    
    const totalTime = Date.now() - startTime;
    
    // Should handle rapid changes efficiently
    expect(totalTime / 10).toBeLessThan(100); // <100ms per change
  });

  test('should maintain 60fps during animations', async () => {
    await page.goto('/wedme/website/customize');
    
    // Start performance monitoring
    await page.evaluate(() => {
      window.performanceMetrics = [];
      const observer = new PerformanceObserver(list => {
        window.performanceMetrics.push(...list.getEntries());
      });
      observer.observe({ entryTypes: ['measure', 'frame'] });
    });

    // Trigger animations
    await page.click('[data-testid="preset-elegant"]');
    await page.waitForTimeout(1000);

    const frameMetrics = await page.evaluate(() => {
      return window.performanceMetrics
        .filter(entry => entry.entryType === 'frame')
        .map(entry => entry.duration);
    });

    // Calculate average frame time
    const averageFrameTime = frameMetrics.reduce((a, b) => a + b, 0) / frameMetrics.length;
    
    // Should maintain 60fps (16.67ms per frame)
    expect(averageFrameTime).toBeLessThan(20);
  });
});
```

#### 3. Accessibility Testing
```typescript
// Location: /src/__tests__/accessibility/design-customization.a11y.test.ts
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { DesignCustomizer } from '@/components/wedme/website/DesignCustomizer';

expect.extend(toHaveNoViolations);

describe('Design Customization Accessibility', () => {
  test('should have no accessibility violations', async () => {
    const { container } = render(
      <DesignCustomizer coupleId="test-couple" websiteId="test-website" />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('should support screen reader navigation', async () => {
    const { getByRole, getByLabelText } = render(
      <DesignCustomizer coupleId="test-couple" websiteId="test-website" />
    );

    // Check for proper ARIA labels
    expect(getByLabelText('Primary Color')).toBeInTheDocument();
    expect(getByLabelText('Heading Font')).toBeInTheDocument();
    
    // Check for proper roles
    expect(getByRole('tablist')).toBeInTheDocument();
    expect(getByRole('tabpanel')).toBeInTheDocument();
  });

  test('should have proper color contrast', async () => {
    // Test color contrast ratios meet WCAG standards
    const { container } = render(
      <DesignCustomizer coupleId="test-couple" websiteId="test-website" />
    );

    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
        'color-contrast-enhanced': { enabled: true }
      }
    });

    expect(results.violations).toHaveLength(0);
  });
});
```

## 📖 DOCUMENTATION DELIVERABLES

### 1. User Guide
```markdown
# Location: /docs/features/design-customization/user-guide.md

# Design Customization User Guide

## Overview
The Design Customization feature allows couples to personalize their wedding website's appearance to match their wedding theme and personal style.

## Getting Started

### Accessing Design Customization
1. Log in to your WedMe account
2. Navigate to Website → Customize
3. The design customizer will load with your current website design

### Understanding the Interface
The design customizer is organized into four main sections:
- **Presets**: Pre-designed wedding themes
- **Colors**: Color palette customization
- **Typography**: Font selection and sizing
- **Layout**: Website structure options

## Using Design Presets

### Applying a Preset
1. Click the "Presets" tab
2. Browse available wedding themes
3. Click on a preset to apply it instantly
4. Your live preview will update immediately

### Available Preset Categories
- **Classic**: Traditional wedding styles
- **Modern**: Contemporary clean designs
- **Rustic**: Natural, outdoor wedding themes
- **Elegant**: Sophisticated formal styles
- **Bohemian**: Free-spirited artistic designs

## Customizing Colors

### Color Selection
1. Click the "Colors" tab
2. Use the color picker for each element:
   - Primary Color: Main brand color
   - Secondary Color: Supporting color
   - Accent Color: Highlighting and buttons
   - Background Color: Page backgrounds
   - Text Color: Main text content

### Wedding Color Palettes
Choose from pre-designed wedding color combinations:
- **Classic White & Gold**
- **Romantic Blush & Rose**
- **Rustic Sage & Cream**
- **Modern Navy & Silver**

### Custom Colors
1. Click the color box next to any color option
2. Use the color wheel to select your exact color
3. Enter a hex code for precise color matching
4. Save your custom palette for future use

## Typography Customization

### Font Selection
1. Click the "Typography" tab
2. Choose fonts for different text elements:
   - **Heading Font**: Used for titles and headers
   - **Body Font**: Used for paragraphs and general text

### Available Fonts
We provide wedding-appropriate fonts from Google Fonts:
- **Serif Fonts**: Traditional, elegant (Playfair Display, Lora)
- **Sans-Serif**: Modern, clean (Inter, Montserrat)
- **Display Fonts**: Decorative headers (Dancing Script)

### Font Size Scaling
- Use the slider to adjust overall text size
- Preview changes in real-time
- Ensure readability on all devices

## Layout Options

### Header Styles
- **Centered**: Traditional centered layout
- **Left Aligned**: Modern left-aligned navigation
- **Hero Style**: Large banner header

### Navigation Position
- **Top Navigation**: Horizontal menu at top
- **Side Navigation**: Vertical menu on left

### Content Width
- **Narrow**: Focus on readability
- **Medium**: Balanced layout (recommended)
- **Wide**: Full-width modern design

## Live Preview

### Responsive Testing
Test your design across different devices:
1. Click device icons at the top of the preview
2. See how your design looks on:
   - Mobile phones (375px width)
   - Tablets (768px width)
   - Desktop computers (1920px width)

### What You'll See
The live preview shows your actual wedding website with:
- Your uploaded photos
- Your wedding information
- Real RSVP forms
- Guest list pages

## Saving and Publishing

### Save Draft
- Changes are automatically saved as you work
- Your progress is preserved if you leave and return
- Preview your changes without publishing

### Publish Changes
1. When satisfied with your design, click "Publish"
2. Changes go live immediately
3. Guests will see the updated design
4. You can unpublish and make more changes anytime

## Tips for Best Results

### Color Guidelines
- Ensure good contrast between text and background
- Test colors on both light and dark elements
- Consider how colors will look in photos

### Typography Best Practices
- Don't use more than 2-3 different fonts
- Ensure fonts are readable at small sizes
- Consider your wedding style when choosing fonts

### Mobile Optimization
- Always test your design on mobile
- Ensure buttons are large enough for touch
- Check that text is readable on small screens

### Performance Tips
- Avoid using too many custom fonts
- Compress large images before uploading
- Test loading speed on slower connections

## Troubleshooting

### Common Issues

**Colors not appearing correctly**
- Clear your browser cache
- Try a different browser
- Check if you're using the latest version

**Fonts not loading**
- Check your internet connection
- Try refreshing the page
- Switch to a different font temporarily

**Preview not updating**
- Wait a few seconds for changes to process
- Refresh the preview area
- Check the browser console for errors

### Getting Help
If you encounter issues:
1. Check this guide for solutions
2. Contact our support team
3. Include screenshots of any problems
4. Mention your browser and device type

## Advanced Features

### Custom CSS (Coming Soon)
- Add your own CSS code
- Advanced styling options
- Developer-friendly customization

### Design Collaboration
- Share preview links with your partner
- Get feedback before publishing
- Version history and rollback options
```

### 2. API Documentation
```markdown
# Location: /docs/api/design-customization.md

# Design Customization API

## Overview
The Design Customization API allows couples to manage their wedding website's visual design programmatically.

## Authentication
All endpoints require authentication via JWT token in the Authorization header.

```http
Authorization: Bearer <jwt-token>
```

## Endpoints

### GET /api/wedme/website/design
Get current design and available presets for a wedding website.

#### Parameters
- `coupleId` (string): The couple's unique identifier
- `websiteId` (string): The website's unique identifier

#### Response
```json
{
  "success": true,
  "design": {
    "id": "design-uuid",
    "primary_color": "#6B7280",
    "secondary_color": "#9CA3AF",
    "accent_color": "#F59E0B",
    "background_color": "#FFFFFF",
    "text_color": "#1F2937",
    "heading_font": "Playfair Display",
    "body_font": "Inter",
    "font_size_scale": 1.0,
    "header_style": "centered",
    "navigation_position": "top",
    "content_width": "medium",
    "is_published": true,
    "created_at": "2025-01-14T10:00:00Z",
    "updated_at": "2025-01-14T10:30:00Z"
  },
  "presets": [
    {
      "id": "preset-uuid",
      "name": "Elegant Classic",
      "category": "classic",
      "preview_image_url": "https://example.com/preview.jpg",
      "primary_color": "#1F2937",
      "secondary_color": "#6B7280",
      "is_premium": false
    }
  ]
}
```

### PUT /api/wedme/website/design
Update the design configuration for a wedding website.

#### Request Body
```json
{
  "coupleId": "couple-uuid",
  "websiteId": "website-uuid",
  "theme": {
    "primary_color": "#4F46E5",
    "secondary_color": "#6B7280",
    "accent_color": "#F59E0B",
    "background_color": "#FFFFFF",
    "text_color": "#1F2937"
  },
  "typography": {
    "heading_font": "Montserrat",
    "body_font": "Open Sans",
    "font_size_scale": 1.1
  },
  "layout": {
    "header_style": "hero",
    "navigation_position": "top",
    "content_width": "wide"
  },
  "custom_css": "/* Optional custom CSS */"
}
```

#### Response
```json
{
  "success": true,
  "design": { /* Updated design object */ },
  "generated_css": "/* Generated CSS for the design */",
  "preview_url": "https://example.com/preview/unique-token"
}
```

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "error": "Invalid color format for primary_color",
  "validation_errors": [
    {
      "field": "primary_color",
      "message": "Must be a valid hex color (e.g., #FF0000)"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Access denied. You can only modify your own website design."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "An unexpected error occurred. Please try again."
}
```

## Rate Limits
- 100 requests per minute per authenticated user
- 10 design updates per minute per website
- Exceeding limits returns HTTP 429

## Validation Rules

### Colors
- Must be valid 6-character hex codes (e.g., #FF0000)
- All color fields are required
- Custom CSS limited to 10,000 characters

### Typography
- Font families must be available in Google Fonts
- Font scale must be between 0.8 and 1.5
- Font names are case-sensitive

### Layout
- header_style: "centered", "left", or "hero"
- navigation_position: "top" or "side"
- content_width: "narrow", "medium", or "wide"
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

### TESTING DELIVERABLES:
- [ ] **Unit test suites** - 90%+ coverage for all components
- [ ] **Integration test suites** - API endpoints and data flow
- [ ] **E2E test suites** - Complete user workflows with Playwright
- [ ] **Performance test suites** - Load time, memory usage, responsiveness
- [ ] **Accessibility test suites** - WCAG 2.1 AA compliance verification
- [ ] **Cross-browser test suites** - Chrome, Safari, Firefox, Edge
- [ ] **Mobile device test suites** - iOS, Android, responsive breakpoints

### DOCUMENTATION DELIVERABLES:
- [ ] **User Guide** - Complete guide for couples using design customization
- [ ] **API Documentation** - Developer reference for all endpoints
- [ ] **Technical Documentation** - Architecture and implementation details
- [ ] **Testing Documentation** - Test plans, procedures, and results
- [ ] **Troubleshooting Guide** - Common issues and solutions
- [ ] **Performance Benchmarks** - Documented performance metrics
- [ ] **Accessibility Report** - WCAG compliance audit results

### QUALITY ASSURANCE DELIVERABLES:
- [ ] **QA Test Plan** - Comprehensive testing strategy and procedures
- [ ] **Bug Reports** - Identified issues with reproduction steps
- [ ] **Performance Report** - Detailed performance analysis and recommendations
- [ ] **Security Audit** - Security testing results and recommendations
- [ ] **Browser Compatibility Matrix** - Tested browser/device combinations
- [ ] **User Acceptance Criteria** - Validation against business requirements

### MONITORING & METRICS:
- [ ] **Test Coverage Reports** - Detailed coverage analysis
- [ ] **Performance Dashboards** - Real-time performance monitoring
- [ ] **Error Tracking Setup** - Production error monitoring
- [ ] **User Analytics Integration** - Usage metrics and insights
- [ ] **A/B Testing Framework** - Design variation testing capability

## 💾 WHERE TO SAVE YOUR WORK
- **Unit Tests**: `$WS_ROOT/wedsync/src/__tests__/components/wedme/website/`
- **Integration Tests**: `$WS_ROOT/wedsync/src/__tests__/api/wedme/website/`
- **E2E Tests**: `$WS_ROOT/wedsync/playwright-tests/design-customization/`
- **Performance Tests**: `$WS_ROOT/wedsync/src/__tests__/performance/`
- **Documentation**: `$WS_ROOT/wedsync/docs/features/design-customization/`

## 🏁 COMPLETION CHECKLIST

### TESTING IMPLEMENTATION:
- [ ] Unit tests with >90% coverage for all components
- [ ] Integration tests for all API endpoints
- [ ] E2E tests covering complete user workflows
- [ ] Performance tests meeting benchmark requirements
- [ ] Accessibility tests ensuring WCAG 2.1 AA compliance
- [ ] Cross-browser compatibility testing completed
- [ ] Mobile device testing on real devices

### DOCUMENTATION COMPLETION:
- [ ] User guide with screenshots and examples
- [ ] API documentation with request/response examples
- [ ] Technical architecture documentation
- [ ] Testing procedures and results documentation
- [ ] Troubleshooting guide with common solutions
- [ ] Performance benchmarks and optimization guide

### QUALITY VALIDATION:
- [ ] All tests passing with no critical failures
- [ ] Performance benchmarks within acceptable ranges
- [ ] No accessibility violations (WCAG 2.1 AA)
- [ ] Security audit passed with no high-risk issues
- [ ] Cross-browser compatibility verified
- [ ] User acceptance criteria validated

### PRODUCTION READINESS:
- [ ] Error monitoring and alerting configured
- [ ] Performance monitoring dashboards active
- [ ] User analytics tracking implemented
- [ ] A/B testing framework ready for use
- [ ] Production deployment checklist completed
- [ ] Rollback procedures documented and tested

### EVIDENCE PACKAGE:
- [ ] File existence proof (ls output)
- [ ] Test coverage reports (>90% achieved)
- [ ] E2E test results (all scenarios passing)
- [ ] Performance benchmark results
- [ ] Accessibility audit report
- [ ] Browser compatibility matrix
- [ ] User acceptance validation results

---

**EXECUTE IMMEDIATELY - Ensure bulletproof quality that makes every couple's wedding website design experience flawless and magical! Every test should pass, every edge case covered, every user delighted! 💍✅🎯**