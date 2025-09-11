# TEAM E - ROUND 1: WS-037 - Main Dashboard Layout
## 2025-08-31 - Development Round 1

**YOUR MISSION:** Implement comprehensive testing suite, quality assurance processes, and complete documentation for Main Dashboard Layout with focus on wedding professional workflows
**FEATURE ID:** WS-037 (Track all work with this ID)
**TIME LIMIT:** 2-3 hours per round  
**THINK ULTRA HARD** about wedding industry quality standards and dashboard reliability requirements for professional users

## 🚨 CRITICAL: EVIDENCE OF REALITY REQUIREMENTS (NON-NEGOTIABLE)

**⚠️ MANDATORY: Before claiming completion, you MUST provide:**

1. **COMPREHENSIVE TEST SUITE PROOF:**
```bash
ls -la $WS_ROOT/wedsync/tests/dashboard/
cat $WS_ROOT/wedsync/tests/dashboard/Dashboard.spec.ts | head -30
ls -la $WS_ROOT/wedsync/tests/e2e/dashboard/
cat $WS_ROOT/wedsync/tests/e2e/dashboard/dashboard-workflow.spec.ts | head -20
```

2. **TEST COVERAGE RESULTS:**
```bash
npm run test:coverage -- dashboard
# MUST show: "Statements: >90%, Branches: >85%, Functions: >90%, Lines: >90%"
```

3. **QUALITY ASSURANCE METRICS:**
```bash
npm run qa:dashboard-full-suite
# MUST show: "All QA checks passed: Security ✓, Performance ✓, Accessibility ✓, Mobile ✓, Integration ✓"
```

4. **DOCUMENTATION COMPLETENESS:**
```bash
ls -la $WS_ROOT/docs/dashboard/
cat $WS_ROOT/docs/dashboard/user-guide.md | head -20
ls -la $WS_ROOT/docs/dashboard/technical/
```

**Teams submitting incomplete test coverage or missing documentation will be rejected immediately.**

## 🧭 CRITICAL: TESTING INTEGRATION REQUIREMENTS (MANDATORY FOR QA FEATURES)

**❌ FORBIDDEN: Manual testing only without comprehensive automated coverage**
**✅ MANDATORY: Dashboard must have automated testing for all user scenarios**

### TESTING INTEGRATION CHECKLIST
- [ ] Unit tests for all dashboard components (>90% coverage)
- [ ] Integration tests for drag-and-drop widget functionality
- [ ] End-to-end tests for complete wedding professional workflows
- [ ] Performance tests for mobile and desktop platforms
- [ ] Security tests for dashboard data access and widget preferences
- [ ] Accessibility tests for WCAG 2.1 AA compliance
- [ ] Cross-browser compatibility testing (Chrome, Safari, Firefox, Edge)
- [ ] Real-time subscription testing with connection failures

### TESTING ARCHITECTURE PATTERN:
```typescript
// File: $WS_ROOT/wedsync/tests/dashboard/Dashboard.test.ts
describe('Main Dashboard Layout', () => {
  describe('Widget Management', () => {
    it('should allow drag-and-drop repositioning', async () => {
      // Comprehensive drag-drop test implementation
    });
    
    it('should persist widget preferences', async () => {
      // Widget persistence testing
    });
  });
  
  describe('Real-time Updates', () => {
    it('should update activity feed in real-time', async () => {
      // Real-time subscription testing
    });
  });
});
```

## 📚 STEP 1: ENHANCED DOCUMENTATION & TESTING FRAMEWORK ANALYSIS (MANDATORY - 10 MINUTES!)

### A. TESTING FRAMEWORK ACTIVATION (MINUTES 1-3)
```typescript
// CRITICAL: Understand existing testing patterns
await mcp__serena__search_for_pattern("test spec describe it expect dashboard");
await mcp__serena__find_symbol("describe it expect beforeEach afterEach", "", true);
await mcp__serena__get_symbols_overview("$WS_ROOT/wedsync/tests/");
```

### B. QUALITY ASSURANCE TECHNOLOGY REQUIREMENTS (MANDATORY FOR ALL QA WORK)
```typescript
// CRITICAL: Load testing and QA best practices
await mcp__ref__ref_search_documentation("Jest testing React dashboard components");
await mcp__ref__ref_search_documentation("Playwright dashboard automation testing");
await mcp__ref__ref_search_documentation("React Testing Library drag drop testing");
await mcp__ref__ref_search_documentation("Dashboard performance testing Lighthouse");
```

**🚨 CRITICAL QA TECHNOLOGY STACK:**
- **Jest 29**: Unit and integration testing framework
- **React Testing Library**: Component testing utilities with drag-drop support
- **Playwright**: End-to-end and cross-browser testing
- **Lighthouse CI**: Performance and accessibility auditing
- **MSW (Mock Service Worker)**: API mocking for reliable dashboard tests
- **Testing Library User Events**: Realistic user interaction simulation

**❌ DO NOT USE:**
- Outdated testing patterns that don't match current React patterns
- Manual testing processes that should be automated
- Testing approaches that don't cover wedding professional workflows

### C. REF MCP TESTING DOCS (MINUTES 3-5)
```typescript
// Load documentation SPECIFIC to dashboard testing
# Use Ref MCP to search for:
# - "Testing drag and drop React components @dnd-kit"
# - "Real-time subscription testing Jest MSW"
# - "Dashboard performance testing metrics"
# - "React Hook Form testing patterns"
# - "Accessibility testing dashboard interfaces"
# - "Mobile dashboard testing responsive design"
```

## 🧠 STEP 2A: SEQUENTIAL THINKING FOR COMPREHENSIVE DASHBOARD QA STRATEGY

### Testing-Focused Sequential Thinking for Dashboard QA

```typescript
// Comprehensive dashboard QA strategy analysis
mcp__sequential-thinking__sequential_thinking({
  thought: "Dashboard QA requires multi-layered testing approach: Unit tests for individual widgets (drag-drop, real-time updates, preferences), integration tests for widget interactions and API communications, E2E tests for complete wedding professional workflows, performance tests for mobile/desktop responsiveness, security tests for data isolation and preferences protection, and accessibility tests for screen readers and keyboard navigation.",
  nextThoughtNeeded: true,
  thoughtNumber: 1,
  totalThoughts: 7
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Wedding professional workflow testing complexity: Morning dashboard check scenario (urgent weddings, overdue responses), multi-client management workflows, mobile venue access patterns, command bar search testing across different data types, widget customization persistence, and emergency scenario handling (network failures, data sync issues).",
  nextThoughtNeeded: true,
  thoughtNumber: 2,
  totalThoughts: 7
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Performance testing critical requirements: Dashboard load time <3 seconds on first visit, drag-drop responsiveness <100ms, real-time updates without UI blocking, mobile performance on 3G networks, battery impact during extended sessions, memory usage during long-running sessions, and cache effectiveness measurement.",
  nextThoughtNeeded: true,
  thoughtNumber: 3,
  totalThoughts: 7
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Cross-device and browser testing matrix: Chrome/Safari/Firefox/Edge compatibility, iOS Safari mobile testing, Android Chrome testing, tablet landscape/portrait orientations, responsive breakpoint validation (320px to 1920px), touch vs mouse interaction testing, and PWA functionality across devices.",
  nextThoughtNeeded: true,
  thoughtNumber: 4,
  totalThoughts: 7
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Real-time integration testing challenges: Supabase subscription connection/disconnection scenarios, multiple user collaborative editing, data consistency during network interruptions, widget preference synchronization, activity feed real-time updates, and graceful degradation when real-time fails.",
  nextThoughtNeeded: true,
  thoughtNumber: 5,
  totalThoughts: 7
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Documentation requirements for wedding professionals: Dashboard user guide with real wedding scenarios, widget customization tutorials, troubleshooting guides for venue connectivity issues, keyboard shortcuts reference, mobile optimization guide, and administrator setup documentation for agencies with multiple users.",
  nextThoughtNeeded: true,
  thoughtNumber: 6,
  totalThoughts: 7
});

mcp__sequential-thinking__sequential_thinking({
  thought: "Implementation strategy: Build comprehensive test pyramid with high unit test coverage (>90%), create realistic E2E workflows based on wedding professional usage patterns, implement visual regression testing for dashboard layouts, set up performance monitoring with realistic data loads, create comprehensive user documentation with screenshots and videos, and establish continuous quality monitoring.",
  nextThoughtNeeded: false,
  thoughtNumber: 7,
  totalThoughts: 7
});
```

## 🚀 STEP 2B: LAUNCH ENHANCED AGENTS WITH COMPREHENSIVE QA FOCUS

Launch these agents with comprehensive testing and documentation requirements:

1. **test-automation-architect** --dashboard-testing --drag-drop-testing --real-time-testing --wedding-workflows
   - Mission: Build complete testing pyramid with comprehensive dashboard coverage
   
2. **documentation-chronicler** --dashboard-user-guides --technical-documentation --wedding-scenarios --troubleshooting
   - Mission: Create comprehensive documentation for all user types and technical scenarios
   
3. **security-compliance-officer** --dashboard-security-testing --widget-data-protection --authentication-testing
   - Mission: Ensure dashboard security testing covers all attack vectors and data protection
   
4. **performance-optimization-expert** --dashboard-performance-testing --mobile-benchmarks --real-time-performance
   - Mission: Establish performance baselines and continuous monitoring for dashboard
   
5. **user-impact-analyzer** --dashboard-usability-testing --wedding-workflow-validation --accessibility-compliance
   - Mission: Ensure dashboard meets real-world wedding professional workflow needs
   
6. **verification-cycle-coordinator** --dashboard-qa-orchestration --quality-gates --cross-team-integration
   - Mission: Coordinate all dashboard quality assurance processes and verification cycles

## 🎯 TECHNICAL SPECIFICATION

**Core QA Requirements from WS-037:**
- Comprehensive test coverage for responsive dashboard with widget functionality
- Performance testing for mobile and desktop platforms with realistic data loads
- Security testing for widget preferences and dashboard data access
- Accessibility compliance for professional DJ tools and interfaces
- Cross-browser compatibility verification across all major browsers
- Real-time subscription testing with connection failure scenarios
- Documentation for all user personas (wedding planners, photographers, venue coordinators)

## 🧪 QA IMPLEMENTATION REQUIREMENTS

### Core Testing Components to Build:

**1. Unit Test Suite (`tests/dashboard/components/`)**
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DragDropContext, Droppable, Draggable } from '@dnd-kit/core';
import { Dashboard } from '$WS_ROOT/wedsync/src/components/dashboard/Dashboard';

describe('Dashboard Component', () => {
  const mockDashboardData = {
    quickActions: [
      { id: 'new-client', label: 'Add Client', icon: 'Plus', usageCount: 10 }
    ],
    todaysFocus: [
      { id: '1', type: 'urgent_wedding', title: 'Sarah & Mike Timeline Review', priority: 'high' }
    ],
    recentActivity: [
      { id: '1', type: 'form_submission', message: 'New form submitted', timestamp: new Date() }
    ],
    metrics: { activeClients: 25, upcomingWeddings: 8, pendingTasks: 3 },
    widgets: [
      { id: 'todays-focus', position: 0, size: 'medium', visible: true },
      { id: 'activity-feed', position: 1, size: 'large', visible: true }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard with all widgets', () => {
    render(<Dashboard initialData={mockDashboardData} />);
    
    expect(screen.getByTestId('dashboard-grid')).toBeInTheDocument();
    expect(screen.getByTestId('widget-todays-focus')).toBeInTheDocument();
    expect(screen.getByTestId('widget-activity-feed')).toBeInTheDocument();
  });

  it('should handle widget drag and drop', async () => {
    const mockOnWidgetMove = jest.fn();
    
    render(
      <Dashboard 
        initialData={mockDashboardData} 
        onWidgetMove={mockOnWidgetMove}
      />
    );

    const todaysFocusWidget = screen.getByTestId('widget-todays-focus');
    const activityFeedWidget = screen.getByTestId('widget-activity-feed');

    // Simulate drag and drop using React DnD test utilities
    fireEvent.dragStart(todaysFocusWidget);
    fireEvent.dragOver(activityFeedWidget);
    fireEvent.drop(activityFeedWidget);

    await waitFor(() => {
      expect(mockOnWidgetMove).toHaveBeenCalledWith('todays-focus', 'activity-feed');
    });
  });

  it('should display today\'s focus items with priority sorting', () => {
    const dataWithMultipleFocus = {
      ...mockDashboardData,
      todaysFocus: [
        { id: '1', type: 'urgent_wedding', title: 'High Priority', priority: 'high' },
        { id: '2', type: 'overdue_response', title: 'Medium Priority', priority: 'medium' },
        { id: '3', type: 'timeline_review', title: 'Low Priority', priority: 'low' }
      ]
    };

    render(<Dashboard initialData={dataWithMultipleFocus} />);

    const focusItems = screen.getAllByTestId(/focus-item/);
    expect(focusItems[0]).toHaveTextContent('High Priority');
    expect(focusItems[1]).toHaveTextContent('Medium Priority');
    expect(focusItems[2]).toHaveTextContent('Low Priority');
  });

  it('should handle real-time activity updates', async () => {
    const { rerender } = render(<Dashboard initialData={mockDashboardData} />);

    expect(screen.getAllByTestId(/activity-item/)).toHaveLength(1);

    const updatedData = {
      ...mockDashboardData,
      recentActivity: [
        ...mockDashboardData.recentActivity,
        { id: '2', type: 'client_signup', message: 'New client signed up', timestamp: new Date() }
      ]
    };

    rerender(<Dashboard initialData={updatedData} />);

    await waitFor(() => {
      expect(screen.getAllByTestId(/activity-item/)).toHaveLength(2);
      expect(screen.getByText('New client signed up')).toBeInTheDocument();
    });
  });

  it('should persist widget preferences', async () => {
    const mockUpdatePreferences = jest.fn();
    
    render(
      <Dashboard 
        initialData={mockDashboardData}
        onUpdatePreferences={mockUpdatePreferences}
      />
    );

    const widget = screen.getByTestId('widget-todays-focus');
    const resizeHandle = screen.getByTestId('widget-resize-handle');

    fireEvent.mouseDown(resizeHandle);
    fireEvent.mouseMove(resizeHandle, { clientX: 100, clientY: 100 });
    fireEvent.mouseUp(resizeHandle);

    await waitFor(() => {
      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 'todays-focus',
            size: 'large'
          })
        ])
      );
    });
  });
});

describe('Command Bar Component', () => {
  it('should open with Cmd+K shortcut', () => {
    render(<Dashboard initialData={mockDashboardData} />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });

    expect(screen.getByTestId('command-bar')).toBeVisible();
    expect(screen.getByPlaceholderText(/Search clients, forms/)).toHaveFocus();
  });

  it('should search and display results', async () => {
    const mockSearchResults = [
      { id: '1', type: 'client', title: 'Sarah Johnson', subtitle: 'Wedding: June 15, 2025' },
      { id: '2', type: 'form', title: 'Wedding Details Form', subtitle: 'Last updated: 2 days ago' }
    ];

    // Mock search API
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { results: mockSearchResults } })
      })
    ) as jest.Mock;

    render(<Dashboard initialData={mockDashboardData} />);

    fireEvent.keyDown(document, { key: 'k', metaKey: true });
    
    const searchInput = screen.getByPlaceholderText(/Search clients, forms/);
    fireEvent.change(searchInput, { target: { value: 'sarah' } });

    await waitFor(() => {
      expect(screen.getByText('Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Wedding Details Form')).toBeInTheDocument();
    });
  });
});
```

**2. Integration Test Suite (`tests/dashboard/integration/`)**
```typescript
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const server = setupServer(
  rest.get('/api/dashboard/data', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      data: mockDashboardData
    }));
  }),

  rest.put('/api/dashboard/preferences', (req, res, ctx) => {
    return res(ctx.json({
      success: true,
      message: 'Preferences updated'
    }));
  }),

  rest.get('/api/dashboard/search', (req, res, ctx) => {
    const query = req.url.searchParams.get('query');
    return res(ctx.json({
      success: true,
      data: {
        results: query === 'sarah' ? mockSearchResults : []
      }
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Dashboard API Integration', () => {
  it('should load dashboard data from API', async () => {
    render(<DashboardContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-loaded')).toBeInTheDocument();
      expect(screen.getByText('Sarah & Mike Timeline Review')).toBeInTheDocument();
    });
  });

  it('should save widget preferences to API', async () => {
    render(<DashboardContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('dashboard-loaded')).toBeInTheDocument();
    });

    // Simulate widget reordering
    const widget = screen.getByTestId('widget-todays-focus');
    fireEvent.dragStart(widget);
    fireEvent.drop(screen.getByTestId('widget-activity-feed'));

    await waitFor(() => {
      expect(screen.getByTestId('preferences-saved-indicator')).toBeInTheDocument();
    });
  });

  it('should handle API errors gracefully', async () => {
    server.use(
      rest.get('/api/dashboard/data', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }));
      })
    );

    render(<DashboardContainer />);

    await waitFor(() => {
      expect(screen.getByTestId('error-state')).toBeInTheDocument();
      expect(screen.getByText(/Unable to load dashboard/)).toBeInTheDocument();
    });
  });
});
```

**3. End-to-End Test Suite (`tests/e2e/dashboard/`)**
```typescript
import { test, expect, devices } from '@playwright/test';

test.describe('Dashboard Wedding Professional Workflows', () => {
  test('Complete morning dashboard check workflow', async ({ page }) => {
    // Wedding professional logs in Monday morning
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'photographer@wedding.com');
    await page.fill('[data-testid="password"]', 'password123');
    await page.click('[data-testid="login-button"]');

    // Dashboard should load quickly
    const startTime = Date.now();
    await page.waitForSelector('[data-testid="dashboard-loaded"]');
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(3000);

    // Should see urgent items immediately
    await expect(page.locator('[data-testid="todays-focus"]')).toBeVisible();
    await expect(page.locator('[data-testid="urgent-wedding"]')).toContainText('this weekend');

    // Check recent activity
    await expect(page.locator('[data-testid="activity-feed"]')).toBeVisible();
    await expect(page.locator('[data-testid="new-form-notification"]')).toBeVisible();

    // Use quick actions
    await page.click('[data-testid="quick-action-new-client"]');
    await expect(page).toHaveURL(/.*\/clients\/new/);
  });

  test('Command bar search workflow', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Open command bar with keyboard shortcut
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[data-testid="command-bar"]')).toBeVisible();

    // Search for client
    await page.fill('[cmdk-input]', 'Sarah Johnson');
    await page.waitForSelector('[data-testid="search-results"]');

    // Should see client in results
    await expect(page.locator('[data-testid="result-client-1"]')).toContainText('Sarah Johnson');
    await expect(page.locator('[data-testid="result-client-1"]')).toContainText('Wedding: June 15');

    // Navigate to client
    await page.click('[data-testid="result-client-1"]');
    await expect(page).toHaveURL(/.*\/clients\/sarah-johnson/);
  });

  test('Widget customization workflow', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Drag and drop widget to reorder
    await page.dragAndDrop(
      '[data-testid="widget-todays-focus"]',
      '[data-testid="widget-activity-feed"]'
    );

    // Wait for preferences to save
    await page.waitForSelector('[data-testid="preferences-saved"]');

    // Reload page to verify persistence
    await page.reload();
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Verify new widget order
    const widgets = page.locator('.widget-container');
    await expect(widgets.first()).toHaveAttribute('data-testid', 'widget-activity-feed');
    await expect(widgets.nth(1)).toHaveAttribute('data-testid', 'widget-todays-focus');
  });

  test('Real-time updates workflow', async ({ page, context }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Open second tab to simulate another user
    const page2 = await context.newPage();
    await page2.goto('/clients/new');
    await page2.fill('[data-testid="client-name"]', 'Test Wedding Client');
    await page2.click('[data-testid="save-client"]');

    // Original dashboard should update in real-time
    await page.waitForSelector('[data-testid="new-activity-notification"]');
    await expect(page.locator('[data-testid="activity-feed"]')).toContainText('Test Wedding Client');
  });
});

// Mobile-specific dashboard tests
test.describe('Mobile Dashboard Workflows', () => {
  test.use({ ...devices['iPhone 12'] });

  test('Mobile dashboard layout and navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Should show single column layout
    const grid = page.locator('[data-testid="dashboard-grid"]');
    const gridColumns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    expect(gridColumns).toBe('1fr');

    // Mobile navigation should be visible
    await expect(page.locator('[data-testid="mobile-nav-bar"]')).toBeVisible();

    // Touch targets should be appropriately sized
    const navButtons = page.locator('[data-testid="mobile-nav-bar"] button');
    const buttonSizes = await navButtons.evaluateAll(buttons => 
      buttons.map(btn => {
        const rect = btn.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      })
    );

    buttonSizes.forEach(size => {
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
    });
  });

  test('Mobile widget interaction', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Long press for context menu
    await page.locator('[data-testid="widget-todays-focus"]').tap({ force: true });
    await page.waitForTimeout(600); // Long press duration

    await expect(page.locator('[data-testid="widget-context-menu"]')).toBeVisible();
  });
});
```

**4. Performance Test Suite (`tests/dashboard/performance/`)**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Dashboard Performance', () => {
  test('Dashboard loads within performance budgets', async ({ page }) => {
    // Navigate to dashboard with performance tracking
    const startTime = Date.now();
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // 3 second budget

    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals: any = {};
        new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.fid = entry.processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift') {
              if (!vitals.cls) vitals.cls = 0;
              vitals.cls += (entry as any).value;
            }
          });
          
          // Resolve after reasonable time
          setTimeout(() => resolve(vitals), 3000);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      });
    });

    if (vitals.lcp) expect(vitals.lcp).toBeLessThan(2500); // LCP < 2.5s
    if (vitals.fid) expect(vitals.fid).toBeLessThan(100);  // FID < 100ms
    if (vitals.cls) expect(vitals.cls).toBeLessThan(0.1);  // CLS < 0.1
  });

  test('Dashboard handles large data sets efficiently', async ({ page }) => {
    // Mock large data response
    await page.route('/api/dashboard/data', route => {
      route.fulfill({
        json: {
          success: true,
          data: {
            quickActions: Array(20).fill(0).map((_, i) => ({ id: `action-${i}`, label: `Action ${i}` })),
            todaysFocus: Array(50).fill(0).map((_, i) => ({ id: `focus-${i}`, title: `Focus Item ${i}` })),
            recentActivity: Array(100).fill(0).map((_, i) => ({ id: `activity-${i}`, message: `Activity ${i}` })),
            widgets: Array(10).fill(0).map((_, i) => ({ id: `widget-${i}`, position: i }))
          }
        }
      });
    });

    const startTime = Date.now();
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(5000); // Should handle large data in <5s

    // Test virtual scrolling performance
    const activityFeed = page.locator('[data-testid="activity-feed"]');
    for (let i = 0; i < 10; i++) {
      await activityFeed.scroll({ top: i * 1000 });
      await page.waitForTimeout(100);
    }

    // Should maintain smooth scrolling
    const fps = await page.evaluate(() => {
      let frameCount = 0;
      let lastTime = performance.now();
      
      return new Promise((resolve) => {
        function frame() {
          frameCount++;
          const currentTime = performance.now();
          if (currentTime - lastTime >= 1000) {
            resolve(frameCount);
          } else {
            requestAnimationFrame(frame);
          }
        }
        requestAnimationFrame(frame);
      });
    });

    expect(fps).toBeGreaterThan(30); // Maintain >30fps
  });
});
```

**5. Accessibility Test Suite (`tests/dashboard/accessibility/`)**
```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Dashboard Accessibility', () => {
  test('Dashboard meets WCAG 2.1 AA standards', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    await injectAxe(page);
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true }
    });
  });

  test('Keyboard navigation works throughout dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'quick-action-0');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'quick-action-1');

    // Test command bar keyboard shortcut
    await page.keyboard.press('Meta+k');
    await expect(page.locator('[cmdk-input]:focus')).toBeVisible();

    // Test arrow key navigation in command bar
    await page.fill('[cmdk-input]', 'client');
    await page.waitForSelector('[data-testid="search-results"]');
    
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('[data-testid="result-0"]')).toHaveClass(/selected/);

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/.*\/clients/);
  });

  test('Screen reader announcements work correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Check ARIA labels
    const todaysFocusWidget = page.locator('[data-testid="widget-todays-focus"]');
    await expect(todaysFocusWidget).toHaveAttribute('aria-label', /Today's focus widget/);

    const activityFeed = page.locator('[data-testid="widget-activity-feed"]');
    await expect(activityFeed).toHaveAttribute('aria-label', /Activity feed widget/);

    // Check live region for real-time updates
    await expect(page.locator('[aria-live="polite"]')).toBeVisible();
  });

  test('High contrast mode support', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', forcedColors: 'active' });
    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="dashboard-loaded"]');

    // Verify elements are visible in high contrast
    await expect(page.locator('[data-testid="widget-todays-focus"]')).toBeVisible();
    await expect(page.locator('[data-testid="widget-activity-feed"]')).toBeVisible();
    
    // Check focus indicators are visible
    await page.keyboard.press('Tab');
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toHaveCSS('outline-width', /[1-9]/);
  });
});
```

## 🎯 SPECIFIC DELIVERABLES FOR ROUND 1

- [ ] Complete unit test suite with >90% code coverage for all dashboard components
- [ ] Integration tests for drag-and-drop widget functionality and API communications
- [ ] End-to-end tests for complete wedding professional workflows
- [ ] Performance benchmarks and continuous monitoring setup
- [ ] Security test suite covering widget preferences and data access
- [ ] Accessibility compliance verification (WCAG 2.1 AA)
- [ ] Cross-browser compatibility test results
- [ ] Comprehensive user and technical documentation

## 💾 WHERE TO SAVE YOUR WORK

- **Unit Tests**: `$WS_ROOT/wedsync/tests/dashboard/components/`
- **Integration Tests**: `$WS_ROOT/wedsync/tests/dashboard/integration/`
- **E2E Tests**: `$WS_ROOT/wedsync/tests/e2e/dashboard/`
- **Performance Tests**: `$WS_ROOT/wedsync/tests/dashboard/performance/`
- **Accessibility Tests**: `$WS_ROOT/wedsync/tests/dashboard/accessibility/`
- **User Documentation**: `$WS_ROOT/docs/dashboard/user-guides/`
- **Technical Documentation**: `$WS_ROOT/docs/dashboard/technical/`
- **API Documentation**: `$WS_ROOT/docs/api/dashboard-endpoints.md`

## 🏁 COMPLETION CHECKLIST

### Testing Implementation:
- [ ] Unit test suite with >90% coverage for dashboard components
- [ ] Integration tests for widget drag-and-drop and real-time updates
- [ ] End-to-end tests for wedding professional workflows
- [ ] Performance benchmarks established with monitoring
- [ ] Security testing covering all dashboard access patterns
- [ ] Accessibility compliance verified (WCAG 2.1 AA)
- [ ] Cross-browser compatibility confirmed across all major browsers
- [ ] Mobile responsive testing across device sizes

### Documentation Quality:
- [ ] User guides for wedding professionals with real scenarios
- [ ] Technical documentation for developers
- [ ] API documentation with comprehensive examples
- [ ] Troubleshooting guides for common dashboard issues
- [ ] Performance optimization guides
- [ ] Security implementation documentation

### Quality Assurance:
- [ ] Automated CI/CD pipeline configured for dashboard tests
- [ ] Quality gates established for deployments
- [ ] Performance monitoring in place with alerting
- [ ] Error tracking and monitoring configured
- [ ] User feedback collection implemented

### Integration Verification:
- [ ] All Team A UI components thoroughly tested
- [ ] Team B API endpoints validated and documented
- [ ] Team C integrations security tested and verified
- [ ] Team D mobile optimizations tested across devices
- [ ] Cross-team integration workflows verified

### Evidence Package:
- [ ] Test coverage reports (>90% across all metrics)
- [ ] Performance benchmark documentation
- [ ] Accessibility audit results with WCAG compliance
- [ ] Security testing report
- [ ] Cross-browser compatibility matrix
- [ ] User documentation with screenshots and workflow videos

---

**EXECUTE IMMEDIATELY - This is a comprehensive QA and documentation prompt covering all dashboard testing requirements!**