# WS-282 Dashboard Tour System - Team E QA & Testing Development

## Mission Statement
Design and implement a comprehensive quality assurance and testing framework for the dashboard tour system, ensuring flawless user experiences across all devices, platforms, and wedding scenarios while maintaining the highest standards of reliability during critical wedding planning moments.

## Wedding Context: Zero-Tolerance for Wedding Day Failures
"It's Saturday morning, and Emma is frantically trying to show her wedding timeline to her bridesmaids through the WedMe app while getting ready. If the tour system crashes, glitches, or shows incorrect information, her entire wedding day coordination could fall apart. Our testing must ensure that every tap, swipe, and interaction works perfectly under the pressure and emotion of real wedding moments. We're not just testing software - we're protecting once-in-a-lifetime memories."

## Core Responsibilities (QA/Testing Focus)
- Comprehensive test suite development for dashboard tour functionality
- Cross-device and cross-browser compatibility testing
- Performance testing under wedding-day stress conditions
- Accessibility compliance testing for all user types
- Integration testing between WedSync supplier and WedMe couple platforms
- Mobile-first responsive design validation
- Offline functionality and PWA reliability testing
- Load testing for high-traffic wedding seasons
- User acceptance testing with real couples and suppliers

## Sequential Thinking Integration
Before starting implementation, use the Sequential Thinking MCP to analyze:
1. Testing pyramid strategy for tour system components (unit, integration, E2E)
2. Wedding-specific edge cases and failure scenarios
3. Cross-platform testing requirements and device compatibility matrix
4. Performance benchmarks and wedding-critical response time requirements
5. Automated testing vs manual testing balance for tour interactions

Example Sequential Thinking prompt:
```
"I need to design a comprehensive testing strategy for dashboard tours. Key considerations: 1) Wedding-critical scenarios where failure is not acceptable, 2) Mobile-first testing across iOS/Android devices, 3) Cross-platform sync testing between WedSync/WedMe, 4) Performance under wedding season load, 5) Accessibility for users with varying technical skills. Let me analyze the optimal testing architecture..."
```

## Evidence of Reality Requirements
**CRITICAL**: Your implementation must include these NON-NEGOTIABLE file outputs:

### 1. Comprehensive Test Suites (Required)
- `src/__tests__/tours/dashboard-tour.test.tsx` - Main tour component testing
- `src/__tests__/tours/mobile-tour.test.tsx` - Mobile-specific functionality
- `src/__tests__/tours/cross-platform-sync.test.ts` - Platform synchronization
- `src/__tests__/tours/offline-functionality.test.ts` - PWA and offline features

### 2. Integration Testing (Required)
- `src/__tests__/integration/tour-api.test.ts` - API endpoint testing
- `src/__tests__/integration/real-time-sync.test.ts` - Real-time synchronization
- `src/__tests__/integration/crm-integration.test.ts` - CRM system integration
- `src/__tests__/integration/wedding-scenarios.test.ts` - Wedding-specific workflows

### 3. Performance Testing (Required)
- `tests/performance/tour-load-testing.js` - Load and stress testing
- `tests/performance/mobile-performance.test.ts` - Mobile performance benchmarks
- `tests/performance/wedding-season-simulation.js` - High-traffic testing
- `lighthouse-config.js` - Lighthouse performance configuration

### 4. Accessibility Testing (Required)
- `src/__tests__/accessibility/tour-accessibility.test.tsx` - A11y compliance
- `src/__tests__/accessibility/keyboard-navigation.test.tsx` - Keyboard accessibility
- `src/__tests__/accessibility/screen-reader.test.tsx` - Screen reader compatibility
- `cypress/integration/accessibility-flow.spec.js` - End-to-end a11y testing

### 5. Cross-Browser Testing (Required)
- `tests/cross-browser/tour-compatibility.test.js` - Browser compatibility
- `playwright.config.ts` - Playwright configuration for cross-browser testing
- `tests/visual-regression/tour-screenshots.test.ts` - Visual regression testing
- `tests/device-testing/responsive-tour.test.ts` - Device-specific testing

**Verification Command**: After implementation, run this exact command to verify your work:
```bash
find . -name "*test*" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \) | grep -E "(tour|dashboard)" | wc -l && echo "Minimum 25 test files required"
```

## Testing Architecture Overview

### Testing Pyramid Strategy

#### Unit Tests (60% of test coverage)
```typescript
// src/__tests__/tours/dashboard-tour.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { DashboardTour } from '@/components/tours/DashboardTour';
import { TourProvider } from '@/contexts/TourContext';
import { mockTourData, mockCoupleData, mockSupplierData } from '@/tests/__mocks__/tour-mocks';

// Mock external dependencies
jest.mock('@/lib/analytics/tour-analytics', () => ({
  trackTourEvent: jest.fn(),
  trackTourCompletion: jest.fn()
}));

jest.mock('@/hooks/useTourProgress', () => ({
  useTourProgress: () => ({
    progress: mockTourData.progress,
    updateProgress: jest.fn(),
    completeStep: jest.fn(),
    skipStep: jest.fn()
  })
}));

describe('DashboardTour Component', () => {
  const defaultProps = {
    tourType: 'onboarding',
    isActive: true,
    onComplete: jest.fn(),
    onSkip: jest.fn(),
    onStepChange: jest.fn()
  };

  const renderTourComponent = (props = {}) => {
    return render(
      <TourProvider>
        <DashboardTour {...defaultProps} {...props} />
      </TourProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window dimensions for responsive testing
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
  });

  describe('Initial Render', () => {
    it('renders tour overlay when active', () => {
      renderTourComponent();
      
      expect(screen.getByTestId('dashboard-tour-overlay')).toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-label', 'Dashboard Tour');
    });

    it('does not render when inactive', () => {
      renderTourComponent({ isActive: false });
      
      expect(screen.queryByTestId('dashboard-tour-overlay')).not.toBeInTheDocument();
    });

    it('displays correct step information', () => {
      renderTourComponent();
      
      expect(screen.getByText('Welcome to WedSync')).toBeInTheDocument();
      expect(screen.getByText(/step 1 of/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    });

    it('shows appropriate wedding context messaging', () => {
      renderTourComponent({ tourType: 'couple_onboarding' });
      
      expect(screen.getByText(/planning your dream wedding/i)).toBeInTheDocument();
      expect(screen.getByText(/💕/)).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('advances to next step on continue button click', async () => {
      const user = userEvent.setup();
      renderTourComponent();
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      await waitFor(() => {
        expect(screen.getByText(/step 2 of/i)).toBeInTheDocument();
      });
    });

    it('goes to previous step on back button click', async () => {
      const user = userEvent.setup();
      renderTourComponent();
      
      // Advance to step 2 first
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      await waitFor(() => {
        expect(screen.getByText(/step 2 of/i)).toBeInTheDocument();
      });
      
      // Click back
      const backButton = screen.getByRole('button', { name: /previous/i });
      await user.click(backButton);
      
      await waitFor(() => {
        expect(screen.getByText(/step 1 of/i)).toBeInTheDocument();
      });
    });

    it('skips step when skip button clicked', async () => {
      const mockOnSkip = jest.fn();
      const user = userEvent.setup();
      
      renderTourComponent({ onSkip: mockOnSkip });
      
      const skipButton = screen.getByRole('button', { name: /skip/i });
      await user.click(skipButton);
      
      expect(mockOnSkip).toHaveBeenCalled();
    });

    it('handles keyboard navigation', async () => {
      renderTourComponent();
      
      const overlay = screen.getByTestId('dashboard-tour-overlay');
      
      // Test Escape key closes tour
      fireEvent.keyDown(overlay, { key: 'Escape', code: 'Escape' });
      expect(defaultProps.onComplete).toHaveBeenCalled();
      
      // Test Arrow keys for navigation
      fireEvent.keyDown(overlay, { key: 'ArrowRight', code: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByText(/step 2 of/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      Object.defineProperty(window, 'innerHeight', { value: 667 });
    });

    it('renders mobile layout on small screens', () => {
      renderTourComponent();
      
      const overlay = screen.getByTestId('dashboard-tour-overlay');
      expect(overlay).toHaveClass('mobile-tour-overlay');
    });

    it('handles touch gestures for navigation', async () => {
      renderTourComponent();
      
      const tourContent = screen.getByTestId('tour-content');
      
      // Simulate swipe left (next step)
      fireEvent.touchStart(tourContent, {
        touches: [{ clientX: 200, clientY: 300 }]
      });
      
      fireEvent.touchEnd(tourContent, {
        changedTouches: [{ clientX: 100, clientY: 300 }]
      });
      
      await waitFor(() => {
        expect(screen.getByText(/step 2 of/i)).toBeInTheDocument();
      });
    });

    it('shows mobile-specific UI elements', () => {
      renderTourComponent();
      
      expect(screen.getByTestId('mobile-progress-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('swipe-hint')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      renderTourComponent();
      
      const overlay = screen.getByRole('dialog');
      expect(overlay).toHaveAttribute('aria-modal', 'true');
      expect(overlay).toHaveAttribute('aria-labelledby');
      expect(overlay).toHaveAttribute('aria-describedby');
    });

    it('manages focus correctly', () => {
      renderTourComponent();
      
      const overlay = screen.getByRole('dialog');
      expect(overlay).toHaveFocus();
    });

    it('supports screen readers', () => {
      renderTourComponent();
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', 'Tour progress');
    });

    it('has sufficient color contrast', () => {
      renderTourComponent();
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      const styles = window.getComputedStyle(continueButton);
      
      // Basic contrast check (full implementation would use actual contrast calculation)
      expect(styles.backgroundColor).not.toBe('transparent');
      expect(styles.color).not.toBe('transparent');
    });
  });

  describe('Error Handling', () => {
    it('handles API errors gracefully', async () => {
      // Mock API failure
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockFetch = jest.fn().mockRejectedValue(new Error('API Error'));
      global.fetch = mockFetch;
      
      renderTourComponent();
      
      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
      
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('shows fallback content when tour data fails to load', () => {
      // Mock missing tour data
      jest.mocked(useTourProgress).mockReturnValue({
        progress: null,
        error: 'Failed to load tour data',
        updateProgress: jest.fn(),
        completeStep: jest.fn(),
        skipStep: jest.fn()
      });
      
      renderTourComponent();
      
      expect(screen.getByText(/unable to load tour/i)).toBeInTheDocument();
    });

    it('handles offline scenarios', () => {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      
      renderTourComponent();
      
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();
      expect(screen.getByText(/your progress will be saved/i)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('does not cause memory leaks', async () => {
      const { unmount } = renderTourComponent();
      
      // Simulate user interactions
      const continueButton = screen.getByRole('button', { name: /continue/i });
      fireEvent.click(continueButton);
      
      // Unmount component
      unmount();
      
      // Check that event listeners are cleaned up
      expect(window.removeEventListener).toHaveBeenCalled();
    });

    it('renders within performance budget', () => {
      const startTime = performance.now();
      renderTourComponent();
      const renderTime = performance.now() - startTime;
      
      // Should render in under 100ms
      expect(renderTime).toBeLessThan(100);
    });

    it('handles rapid user interactions without crashes', async () => {
      renderTourComponent();
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      
      // Rapidly click continue button
      for (let i = 0; i < 10; i++) {
        fireEvent.click(continueButton);
      }
      
      // Should not crash
      expect(screen.getByTestId('dashboard-tour-overlay')).toBeInTheDocument();
    });
  });

  describe('Wedding-Specific Scenarios', () => {
    it('handles high-stress wedding day usage', async () => {
      // Simulate wedding day - high emotion, quick interactions
      renderTourComponent({ 
        tourType: 'wedding_day_coordination',
        urgentMode: true 
      });
      
      expect(screen.getByText(/wedding day mode/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /quick start/i })).toBeInTheDocument();
    });

    it('shows appropriate messages for different wedding phases', () => {
      const phases = ['engagement', 'planning', 'final_month', 'wedding_week'];
      
      phases.forEach(phase => {
        renderTourComponent({ weddingPhase: phase });
        
        switch (phase) {
          case 'engagement':
            expect(screen.getByText(/just got engaged/i)).toBeInTheDocument();
            break;
          case 'final_month':
            expect(screen.getByText(/final details/i)).toBeInTheDocument();
            break;
          case 'wedding_week':
            expect(screen.getByText(/almost there/i)).toBeInTheDocument();
            break;
        }
      });
    });

    it('handles vendor-couple synchronization correctly', async () => {
      renderTourComponent({ 
        hasConnectedVendors: true,
        vendorCount: 5 
      });
      
      expect(screen.getByText(/5 vendors connected/i)).toBeInTheDocument();
      expect(screen.getByTestId('vendor-sync-indicator')).toBeInTheDocument();
    });
  });
});
```

#### Integration Tests (30% of test coverage)
```typescript
// src/__tests__/integration/tour-api.test.ts
import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { TourService } from '@/lib/services/tour-service';
import { WebSocketMockServer } from '@/tests/__mocks__/websocket-mock';

// Mock server for API testing
const server = setupServer(
  rest.get('/api/tours/:tourId', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.tourId,
        name: 'Test Tour',
        steps: [
          { id: 'step-1', title: 'Welcome', order: 0 },
          { id: 'step-2', title: 'Getting Started', order: 1 }
        ]
      })
    );
  }),

  rest.post('/api/tours/:tourId/progress', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        progressId: 'progress-123',
        currentStep: 1
      })
    );
  }),

  rest.put('/api/tours/progress/:progressId', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        progress: { currentStep: 2, completed: false }
      })
    );
  })
);

describe('Tour API Integration', () => {
  let tourService: TourService;
  let wsServer: WebSocketMockServer;

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
    wsServer = new WebSocketMockServer('ws://localhost:3001');
  });

  afterAll(() => {
    server.close();
    wsServer.close();
  });

  beforeEach(() => {
    tourService = new TourService();
    server.resetHandlers();
  });

  describe('Tour Data Fetching', () => {
    it('successfully fetches tour configuration', async () => {
      const tourConfig = await tourService.getTourConfig('tour-123');
      
      expect(tourConfig).toEqual({
        id: 'tour-123',
        name: 'Test Tour',
        steps: expect.arrayContaining([
          expect.objectContaining({ title: 'Welcome' })
        ])
      });
    });

    it('handles API errors gracefully', async () => {
      server.use(
        rest.get('/api/tours/:tourId', (req, res, ctx) => {
          return res(ctx.status(500), ctx.json({ error: 'Server Error' }));
        })
      );

      await expect(tourService.getTourConfig('tour-123')).rejects.toThrow('Server Error');
    });

    it('retries failed requests with exponential backoff', async () => {
      let attemptCount = 0;
      
      server.use(
        rest.get('/api/tours/:tourId', (req, res, ctx) => {
          attemptCount++;
          if (attemptCount < 3) {
            return res(ctx.status(503), ctx.json({ error: 'Service Unavailable' }));
          }
          return res(ctx.json({ id: 'tour-123', name: 'Test Tour', steps: [] }));
        })
      );

      const config = await tourService.getTourConfig('tour-123');
      expect(attemptCount).toBe(3);
      expect(config).toEqual(expect.objectContaining({ id: 'tour-123' }));
    });
  });

  describe('Progress Tracking', () => {
    it('successfully starts tour and tracks progress', async () => {
      const startResult = await tourService.startTour({
        tourId: 'tour-123',
        userId: 'user-123',
        organizationId: 'org-123'
      });

      expect(startResult).toEqual({
        success: true,
        progressId: 'progress-123',
        currentStep: 1
      });
    });

    it('updates progress correctly', async () => {
      const updateResult = await tourService.updateProgress({
        progressId: 'progress-123',
        action: 'next_step',
        stepIndex: 1
      });

      expect(updateResult).toEqual({
        success: true,
        progress: expect.objectContaining({ currentStep: 2 })
      });
    });

    it('handles concurrent progress updates', async () => {
      const promises = Array.from({ length: 5 }, (_, i) =>
        tourService.updateProgress({
          progressId: 'progress-123',
          action: 'next_step',
          stepIndex: i
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      expect(successful).toBeGreaterThan(0);
      expect(successful).toBeLessThanOrEqual(5);
    });
  });

  describe('Real-Time Synchronization', () => {
    it('receives real-time tour progress updates', (done) => {
      const ws = wsServer.createConnection();
      
      ws.on('message', (message) => {
        const data = JSON.parse(message.toString());
        
        if (data.type === 'tour_progress_update') {
          expect(data.payload).toEqual({
            progressId: 'progress-123',
            currentStep: 2,
            userId: 'user-123'
          });
          done();
        }
      });

      // Simulate server sending update
      wsServer.broadcast({
        type: 'tour_progress_update',
        payload: {
          progressId: 'progress-123',
          currentStep: 2,
          userId: 'user-123'
        }
      });
    });

    it('handles WebSocket disconnections gracefully', async () => {
      const ws = wsServer.createConnection();
      let reconnectAttempts = 0;

      ws.on('close', () => {
        reconnectAttempts++;
      });

      // Simulate connection loss
      wsServer.close();
      
      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      expect(reconnectAttempts).toBeGreaterThan(0);
    });
  });

  describe('Cross-Platform Integration', () => {
    it('syncs tour progress between WedSync and WedMe', async () => {
      const syncResult = await tourService.syncCrossPlatform({
        coupleId: 'couple-123',
        supplierIds: ['supplier-123'],
        tourProgress: {
          tourId: 'tour-123',
          currentStep: 3,
          completedSteps: [0, 1, 2]
        }
      });

      expect(syncResult.success).toBe(true);
      expect(syncResult.syncedPlatforms).toContain('wedme');
      expect(syncResult.syncedPlatforms).toContain('wedsync');
    });

    it('handles sync conflicts appropriately', async () => {
      // Mock conflicting data
      server.use(
        rest.post('/api/sync/cross-platform', (req, res, ctx) => {
          return res(
            ctx.status(409),
            ctx.json({
              error: 'Sync conflict',
              conflictData: {
                wedme: { currentStep: 3 },
                wedsync: { currentStep: 2 }
              }
            })
          );
        })
      );

      const syncResult = await tourService.syncCrossPlatform({
        coupleId: 'couple-123',
        supplierIds: ['supplier-123'],
        tourProgress: { currentStep: 3 }
      });

      expect(syncResult.success).toBe(false);
      expect(syncResult.conflictResolution).toBeDefined();
    });
  });

  describe('Performance Under Load', () => {
    it('handles multiple concurrent tour sessions', async () => {
      const concurrentSessions = 50;
      const promises = Array.from({ length: concurrentSessions }, (_, i) =>
        tourService.startTour({
          tourId: `tour-${i}`,
          userId: `user-${i}`,
          organizationId: 'org-123'
        })
      );

      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      
      // Should handle at least 80% successfully
      expect(successful / concurrentSessions).toBeGreaterThan(0.8);
    });

    it('maintains performance under high request volume', async () => {
      const startTime = Date.now();
      const requestCount = 100;
      
      const promises = Array.from({ length: requestCount }, () =>
        tourService.getTourConfig('tour-123')
      );

      await Promise.all(promises);
      
      const totalTime = Date.now() - startTime;
      const avgResponseTime = totalTime / requestCount;
      
      // Average response time should be under 500ms
      expect(avgResponseTime).toBeLessThan(500);
    });
  });
});
```

#### End-to-End Tests (10% of test coverage)
```typescript
// cypress/integration/tour-wedding-scenarios.spec.js
describe('Wedding Tour End-to-End Scenarios', () => {
  beforeEach(() => {
    cy.visit('/dashboard');
    cy.login('couple@example.com', 'password123');
  });

  describe('Couple Onboarding Journey', () => {
    it('completes full couple onboarding tour', () => {
      // Start the tour
      cy.get('[data-testid="start-tour"]').click();
      
      // Verify tour overlay appears
      cy.get('[data-testid="dashboard-tour-overlay"]').should('be.visible');
      cy.get('[role="dialog"]').should('have.attr', 'aria-modal', 'true');
      
      // Step 1: Welcome
      cy.contains('Welcome to WedMe').should('be.visible');
      cy.get('[data-testid="tour-progress"]').should('contain', 'Step 1 of 5');
      cy.get('[data-testid="continue-button"]').click();
      
      // Step 2: Profile Setup
      cy.contains('Set Up Your Wedding Profile').should('be.visible');
      cy.get('input[placeholder="Wedding Date"]').type('2024-06-15');
      cy.get('input[placeholder="Venue Location"]').type('California');
      cy.get('[data-testid="continue-button"]').click();
      
      // Step 3: Connect with Vendors
      cy.contains('Connect with Your Vendors').should('be.visible');
      cy.get('[data-testid="invite-vendor-button"]').click();
      cy.get('input[placeholder="Vendor Email"]').type('photographer@example.com');
      cy.get('[data-testid="send-invite"]').click();
      cy.contains('Invitation sent').should('be.visible');
      cy.get('[data-testid="continue-button"]').click();
      
      // Step 4: Photo Sharing Setup
      cy.contains('Share Your Beautiful Moments').should('be.visible');
      cy.get('[data-testid="upload-engagement-photos"]').click();
      cy.fixture('engagement-photo.jpg').then(fileContent => {
        cy.get('input[type="file"]').attachFile({
          fileContent: fileContent.toString(),
          fileName: 'engagement-photo.jpg',
          mimeType: 'image/jpeg'
        });
      });
      cy.contains('Photo uploaded').should('be.visible');
      cy.get('[data-testid="continue-button"]').click();
      
      // Step 5: Tour Completion
      cy.contains('You\'re All Set!').should('be.visible');
      cy.get('[data-testid="celebration-animation"]').should('be.visible');
      cy.get('[data-testid="complete-tour-button"]').click();
      
      // Verify completion
      cy.url().should('include', '/dashboard/home');
      cy.contains('Welcome back').should('be.visible');
      cy.get('[data-testid="tour-completed-badge"]').should('be.visible');
    });

    it('handles tour interruption and resumption', () => {
      cy.get('[data-testid="start-tour"]').click();
      
      // Complete first step
      cy.get('[data-testid="continue-button"]').click();
      
      // Interrupt tour (close browser, simulate)
      cy.window().then(win => {
        win.localStorage.setItem('tour-interrupted', 'true');
      });
      
      // Refresh page
      cy.reload();
      
      // Should show resume tour option
      cy.contains('Resume Your Tour').should('be.visible');
      cy.get('[data-testid="resume-tour-button"]').click();
      
      // Should be on step 2
      cy.get('[data-testid="tour-progress"]').should('contain', 'Step 2 of 5');
    });
  });

  describe('Mobile Tour Experience', () => {
    beforeEach(() => {
      cy.viewport('iphone-x');
    });

    it('completes mobile tour with touch interactions', () => {
      cy.get('[data-testid="start-tour"]').click();
      
      // Verify mobile layout
      cy.get('[data-testid="mobile-tour-overlay"]').should('be.visible');
      cy.get('[data-testid="swipe-hint"]').should('be.visible');
      
      // Test swipe navigation
      cy.get('[data-testid="tour-content"]').swipe('left');
      cy.get('[data-testid="tour-progress"]').should('contain', 'Step 2 of 5');
      
      // Test swipe back
      cy.get('[data-testid="tour-content"]').swipe('right');
      cy.get('[data-testid="tour-progress"]').should('contain', 'Step 1 of 5');
      
      // Complete tour on mobile
      cy.get('[data-testid="mobile-continue"]').tap();
      cy.get('[data-testid="mobile-continue"]').tap();
      cy.get('[data-testid="mobile-continue"]').tap();
      cy.get('[data-testid="mobile-continue"]').tap();
      cy.get('[data-testid="complete-mobile-tour"]').tap();
      
      // Verify mobile completion animation
      cy.get('[data-testid="mobile-celebration"]').should('be.visible');
    });

    it('handles portrait/landscape orientation changes', () => {
      cy.get('[data-testid="start-tour"]').click();
      
      // Start in portrait
      cy.viewport('iphone-x');
      cy.get('[data-testid="mobile-tour-overlay"]').should('have.class', 'portrait-layout');
      
      // Rotate to landscape
      cy.viewport(812, 375);
      cy.get('[data-testid="mobile-tour-overlay"]').should('have.class', 'landscape-layout');
      
      // Tour should still function correctly
      cy.get('[data-testid="mobile-continue"]').should('be.visible').tap();
    });
  });

  describe('Offline Functionality', () => {
    it('continues tour when offline', () => {
      cy.get('[data-testid="start-tour"]').click();
      
      // Complete first step while online
      cy.get('[data-testid="continue-button"]').click();
      
      // Go offline
      cy.window().then(win => {
        cy.stub(win.navigator, 'onLine').value(false);
        win.dispatchEvent(new Event('offline'));
      });
      
      // Should show offline indicator
      cy.contains('Offline Mode').should('be.visible');
      cy.contains('Your progress will be saved').should('be.visible');
      
      // Should still be able to continue tour
      cy.get('[data-testid="continue-button"]').click();
      cy.get('[data-testid="tour-progress"]').should('contain', 'Step 3 of 5');
      
      // Go back online
      cy.window().then(win => {
        cy.stub(win.navigator, 'onLine').value(true);
        win.dispatchEvent(new Event('online'));
      });
      
      // Should show sync indicator
      cy.contains('Syncing progress').should('be.visible');
      cy.contains('Progress synced').should('be.visible');
    });
  });

  describe('Accessibility Compliance', () => {
    it('supports keyboard navigation throughout tour', () => {
      cy.get('[data-testid="start-tour"]').click();
      
      // Tab through tour elements
      cy.get('body').tab();
      cy.focused().should('have.attr', 'data-testid', 'continue-button');
      
      cy.focused().type('{enter}');
      cy.get('[data-testid="tour-progress"]').should('contain', 'Step 2 of 5');
      
      // Test arrow key navigation
      cy.focused().type('{rightarrow}');
      cy.get('[data-testid="tour-progress"]').should('contain', 'Step 3 of 5');
      
      cy.focused().type('{leftarrow}');
      cy.get('[data-testid="tour-progress"]').should('contain', 'Step 2 of 5');
      
      // Test escape key closes tour
      cy.focused().type('{esc}');
      cy.get('[data-testid="dashboard-tour-overlay"]').should('not.exist');
    });

    it('announces step changes to screen readers', () => {
      cy.get('[data-testid="start-tour"]').click();
      
      cy.get('[role="status"]').should('contain', 'Step 1: Welcome to WedMe');
      
      cy.get('[data-testid="continue-button"]').click();
      cy.get('[role="status"]').should('contain', 'Step 2: Set Up Your Wedding Profile');
    });

    it('maintains focus management correctly', () => {
      cy.get('[data-testid="start-tour"]').click();
      
      // Focus should be on tour overlay
      cy.focused().should('have.attr', 'role', 'dialog');
      
      // After step completion, focus should remain in tour
      cy.get('[data-testid="continue-button"]').click();
      cy.focused().closest('[role="dialog"]').should('exist');
    });
  });

  describe('Performance Under Load', () => {
    it('maintains performance with multiple concurrent users', () => {
      // Simulate multiple tour sessions
      for (let i = 0; i < 5; i++) {
        cy.window().then(win => {
          win.open(`/dashboard?session=${i}`, `_blank${i}`);
        });
      }
      
      // Main session should still perform well
      cy.get('[data-testid="start-tour"]').click();
      
      const startTime = Date.now();
      cy.get('[data-testid="continue-button"]').click();
      cy.get('[data-testid="tour-progress"]').should('contain', 'Step 2 of 5').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(1000); // Should load within 1 second
      });
    });

    it('handles rapid user interactions without lag', () => {
      cy.get('[data-testid="start-tour"]').click();
      
      // Rapidly click through tour
      const rapidClicks = () => {
        for (let i = 0; i < 10; i++) {
          cy.get('[data-testid="continue-button"]').click({ force: true });
        }
      };
      
      rapidClicks();
      
      // Should not crash or become unresponsive
      cy.get('[data-testid="dashboard-tour-overlay"]').should('be.visible');
    });
  });

  describe('Wedding-Day Critical Scenarios', () => {
    it('handles wedding day high-stress usage', () => {
      // Simulate wedding day scenario
      cy.window().then(win => {
        win.localStorage.setItem('wedding-date', new Date().toISOString());
        win.localStorage.setItem('wedding-mode', 'active');
      });
      
      cy.visit('/dashboard');
      
      // Should show wedding day mode
      cy.contains('Wedding Day Mode').should('be.visible');
      cy.get('[data-testid="emergency-contact"]').should('be.visible');
      
      // Tour should be streamlined for urgency
      cy.get('[data-testid="start-quick-tour"]').click();
      cy.contains('Quick Setup').should('be.visible');
      
      // Should complete in under 2 minutes
      const startTime = Date.now();
      cy.get('[data-testid="quick-continue"]').click();
      cy.get('[data-testid="quick-continue"]').click();
      cy.get('[data-testid="complete-quick-tour"]').click();
      
      cy.contains('Ready for your big day').should('be.visible').then(() => {
        const completionTime = Date.now() - startTime;
        expect(completionTime).to.be.lessThan(120000); // Under 2 minutes
      });
    });

    it('provides emergency support during tour failures', () => {
      // Simulate tour system failure
      cy.intercept('GET', '/api/tours/*', { statusCode: 500 }).as('tourError');
      
      cy.get('[data-testid="start-tour"]').click();
      cy.wait('@tourError');
      
      // Should show emergency fallback
      cy.contains('Technical Difficulties').should('be.visible');
      cy.get('[data-testid="emergency-support"]').should('be.visible');
      cy.get('[data-testid="phone-support"]').should('contain', '1-800-WEDSYNC');
      
      // Should provide alternative access
      cy.get('[data-testid="skip-to-dashboard"]').click();
      cy.url().should('include', '/dashboard/home');
    });
  });
});
```

### Performance Testing Framework

```javascript
// tests/performance/tour-load-testing.js
const { check, group, sleep } = require('k6');
const http = require('k6/http');

export let options = {
  stages: [
    { duration: '5m', target: 100 },   // Ramp up
    { duration: '10m', target: 500 },  // Wedding season load
    { duration: '5m', target: 1000 },  // Peak Saturday load
    { duration: '10m', target: 500 },  // Scale down
    { duration: '5m', target: 0 },     // Cool down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests under 2s
    http_req_failed: ['rate<0.1'],     // Error rate under 10%
    checks: ['rate>0.95'],             // 95% of checks pass
  },
};

export default function () {
  group('Wedding Tour Load Test', function () {
    // Test tour initialization
    group('Tour Initialization', function () {
      let tourResponse = http.get(`${__ENV.BASE_URL}/api/tours/onboarding`);
      
      check(tourResponse, {
        'tour loads successfully': (r) => r.status === 200,
        'tour load time < 1s': (r) => r.timings.duration < 1000,
        'tour has steps': (r) => JSON.parse(r.body).steps.length > 0,
      });
      
      sleep(1);
    });

    // Test progress updates
    group('Progress Updates', function () {
      let progressData = {
        action: 'next_step',
        stepIndex: Math.floor(Math.random() * 5),
        timestamp: new Date().toISOString()
      };
      
      let progressResponse = http.put(
        `${__ENV.BASE_URL}/api/tours/progress/test-progress-${__VU}`,
        JSON.stringify(progressData),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${__ENV.TEST_TOKEN}`
          }
        }
      );
      
      check(progressResponse, {
        'progress updates successfully': (r) => r.status === 200,
        'progress update time < 500ms': (r) => r.timings.duration < 500,
        'progress response valid': (r) => JSON.parse(r.body).success === true,
      });
      
      sleep(0.5);
    });

    // Test cross-platform sync
    group('Cross-Platform Sync', function () {
      let syncData = {
        coupleId: `couple-${__VU}`,
        supplierIds: [`supplier-${__VU}`],
        tourProgress: {
          currentStep: Math.floor(Math.random() * 5),
          completedSteps: [0, 1, 2]
        }
      };
      
      let syncResponse = http.post(
        `${__ENV.BASE_URL}/api/sync/cross-platform`,
        JSON.stringify(syncData),
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${__ENV.TEST_TOKEN}`
          }
        }
      );
      
      check(syncResponse, {
        'sync completes successfully': (r) => r.status === 200,
        'sync time < 1s': (r) => r.timings.duration < 1000,
        'sync affects multiple platforms': (r) => {
          const body = JSON.parse(r.body);
          return body.syncedPlatforms && body.syncedPlatforms.length > 1;
        },
      });
      
      sleep(2);
    });

    // Test mobile performance
    group('Mobile Performance', function () {
      let mobileHeaders = {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        'Authorization': `Bearer ${__ENV.TEST_TOKEN}`
      };
      
      let mobileResponse = http.get(
        `${__ENV.BASE_URL}/api/tours/mobile/onboarding`,
        { headers: mobileHeaders }
      );
      
      check(mobileResponse, {
        'mobile tour loads': (r) => r.status === 200,
        'mobile load time < 800ms': (r) => r.timings.duration < 800,
        'mobile response optimized': (r) => r.body.length < 50000, // Under 50KB
      });
      
      sleep(1.5);
    });
  });
}

export function handleSummary(data) {
  return {
    'wedding-tour-load-test.html': htmlReport(data),
    'wedding-tour-load-test.json': JSON.stringify(data),
  };
}

function htmlReport(data) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Wedding Tour Load Test Results</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .pass { border-left: 5px solid #4CAF50; }
        .fail { border-left: 5px solid #f44336; }
        .warn { border-left: 5px solid #ff9800; }
      </style>
    </head>
    <body>
      <h1>Wedding Tour System Load Test Results</h1>
      <h2>Test Summary</h2>
      <div class="metric ${data.metrics.http_req_duration.values.avg < 2000 ? 'pass' : 'fail'}">
        <strong>Average Response Time:</strong> ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms
        <br><strong>95th Percentile:</strong> ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
      </div>
      
      <div class="metric ${data.metrics.http_req_failed.values.rate < 0.1 ? 'pass' : 'fail'}">
        <strong>Error Rate:</strong> ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
      </div>
      
      <div class="metric ${data.metrics.checks.values.rate > 0.95 ? 'pass' : 'fail'}">
        <strong>Check Success Rate:</strong> ${(data.metrics.checks.values.rate * 100).toFixed(2)}%
      </div>
      
      <h2>Wedding-Critical Performance Metrics</h2>
      <div class="metric">
        <strong>Wedding Day Readiness:</strong> ${data.metrics.http_req_duration.values['p(95)'] < 2000 ? '✅ Ready' : '❌ Needs optimization'}
        <br><em>Tours must complete quickly during high-stress wedding coordination</em>
      </div>
      
      <div class="metric">
        <strong>Mobile Performance:</strong> ${data.metrics.http_req_duration.values.avg < 1000 ? '✅ Excellent' : '⚠️ Needs improvement'}
        <br><em>Most couples use mobile devices during wedding planning</em>
      </div>
      
      <div class="metric">
        <strong>Cross-Platform Sync:</strong> ${data.metrics.checks.values.rate > 0.95 ? '✅ Reliable' : '❌ Sync issues detected'}
        <br><em>Vendor-couple synchronization must be flawless</em>
      </div>
    </body>
    </html>
  `;
}
```

### Accessibility Testing Suite

```typescript
// src/__tests__/accessibility/tour-accessibility.test.tsx
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { DashboardTour } from '@/components/tours/DashboardTour';

expect.extend(toHaveNoViolations);

describe('Tour Accessibility Compliance', () => {
  const defaultProps = {
    tourType: 'onboarding',
    isActive: true,
    onComplete: jest.fn(),
    onSkip: jest.fn(),
    onStepChange: jest.fn()
  };

  it('meets WCAG 2.1 AA standards', async () => {
    const { container } = render(<DashboardTour {...defaultProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('provides proper heading hierarchy', () => {
    render(<DashboardTour {...defaultProps} />);
    
    const headings = screen.getAllByRole('heading');
    expect(headings[0]).toHaveProperty('tagName', 'H1');
    expect(headings[1]).toHaveProperty('tagName', 'H2');
  });

  it('has sufficient color contrast ratios', async () => {
    render(<DashboardTour {...defaultProps} />);
    
    const results = await axe(document.body, {
      rules: {
        'color-contrast': { enabled: true }
      }
    });
    
    expect(results).toHaveNoViolations();
  });

  it('supports screen readers with proper ARIA labels', () => {
    render(<DashboardTour {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label');
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('provides keyboard navigation support', () => {
    render(<DashboardTour {...defaultProps} />);
    
    const focusableElements = screen.getAllByRole('button');
    focusableElements.forEach(element => {
      expect(element).not.toHaveAttribute('tabindex', '-1');
    });
  });

  it('announces dynamic content changes', async () => {
    const { rerender } = render(<DashboardTour {...defaultProps} />);
    
    // Simulate step change
    rerender(<DashboardTour {...defaultProps} currentStep={1} />);
    
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/step 2/i);
  });

  it('supports high contrast mode', async () => {
    // Mock high contrast media query
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-contrast: high)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    render(<DashboardTour {...defaultProps} />);
    
    const results = await axe(document.body, {
      tags: ['wcag21aa']
    });
    
    expect(results).toHaveNoViolations();
  });

  it('provides text alternatives for non-text content', () => {
    render(<DashboardTour {...defaultProps} />);
    
    const images = screen.getAllByRole('img');
    images.forEach(img => {
      expect(img).toHaveAttribute('alt');
    });
  });

  it('supports reduced motion preferences', () => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
      })),
    });

    render(<DashboardTour {...defaultProps} />);
    
    const animatedElements = screen.getAllByTestId(/animation/i);
    animatedElements.forEach(element => {
      const styles = window.getComputedStyle(element);
      expect(['none', 'paused']).toContain(styles.animationPlayState);
    });
  });
});
```

### Cross-Browser Testing Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/cross-browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/wedding-tour-results.json' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },

  projects: [
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile browsers (critical for wedding planning)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
    {
      name: 'iPad',
      use: { ...devices['iPad Pro'] },
    },

    // Wedding-critical device testing
    {
      name: 'iPhone SE - Common wedding phone',
      use: { 
        ...devices['iPhone SE'],
        viewport: { width: 375, height: 667 }
      },
    },
    {
      name: 'Samsung Galaxy - Android wedding phone',
      use: {
        browserName: 'chromium',
        ...devices['Galaxy S9+']
      },
    }
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

```typescript
// tests/cross-browser/tour-compatibility.test.ts
import { test, expect } from '@playwright/test';

test.describe('Cross-Browser Tour Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.fill('input[type="email"]', 'test@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard/home');
  });

  test('tour works correctly in all browsers', async ({ page, browserName }) => {
    // Start tour
    await page.click('[data-testid="start-tour"]');
    
    // Verify tour overlay appears
    await expect(page.locator('[data-testid="dashboard-tour-overlay"]')).toBeVisible();
    
    // Complete first step
    await page.click('[data-testid="continue-button"]');
    
    // Verify progress update
    await expect(page.locator('[data-testid="tour-progress"]')).toContainText('Step 2 of 5');
    
    // Test browser-specific features
    if (browserName === 'webkit') {
      // Safari-specific tests
      await expect(page.locator('.safari-optimized')).toBeVisible();
    } else if (browserName === 'firefox') {
      // Firefox-specific tests
      await expect(page.locator('.firefox-compatible')).toBeVisible();
    }
  });

  test('mobile gestures work on touch devices', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'This test is only for mobile devices');
    
    await page.click('[data-testid="start-tour"]');
    
    // Test swipe gestures
    await page.locator('[data-testid="tour-content"]').swipe('left');
    await expect(page.locator('[data-testid="tour-progress"]')).toContainText('Step 2 of 5');
  });

  test('keyboard navigation works consistently', async ({ page }) => {
    await page.click('[data-testid="start-tour"]');
    
    // Tab through elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('data-testid', 'continue-button');
    
    // Use arrow keys for navigation
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-testid="tour-progress"]')).toContainText('Step 2 of 5');
  });

  test('animations perform smoothly across browsers', async ({ page }) => {
    await page.click('[data-testid="start-tour"]');
    
    // Measure animation performance
    const animationMetrics = await page.evaluate(() => {
      return new Promise(resolve => {
        const startTime = performance.now();
        const observer = new PerformanceObserver(list => {
          const entries = list.getEntries();
          const animationEntry = entries.find(entry => entry.name === 'tour-animation');
          if (animationEntry) {
            resolve({
              duration: animationEntry.duration,
              startTime: animationEntry.startTime
            });
            observer.disconnect();
          }
        });
        observer.observe({ entryTypes: ['measure'] });
        
        // Trigger animation
        document.querySelector('[data-testid="continue-button"]').click();
        
        setTimeout(() => {
          performance.measure('tour-animation', { start: startTime });
        }, 100);
      });
    });
    
    expect(animationMetrics.duration).toBeLessThan(500); // Under 500ms
  });
});
```

### Wedding-Specific Test Scenarios

```typescript
// src/__tests__/integration/wedding-scenarios.test.ts
describe('Wedding-Specific Tour Scenarios', () => {
  describe('Wedding Phase Adaptations', () => {
    const phases = [
      { phase: 'engagement', urgency: 'low', duration: 'long' },
      { phase: 'planning', urgency: 'medium', duration: 'medium' },
      { phase: 'final_month', urgency: 'high', duration: 'short' },
      { phase: 'wedding_week', urgency: 'critical', duration: 'minimal' }
    ];

    phases.forEach(({ phase, urgency, duration }) => {
      it(`adapts tour for ${phase} phase`, async () => {
        const tourService = new TourService({
          weddingPhase: phase,
          weddingDate: getWeddingDateForPhase(phase)
        });

        const tourConfig = await tourService.getTourConfig('onboarding');
        
        expect(tourConfig.adaptations.urgency).toBe(urgency);
        expect(tourConfig.adaptations.duration).toBe(duration);
        
        // Verify phase-specific content
        switch (phase) {
          case 'engagement':
            expect(tourConfig.steps).toHaveLength(5); // Full tour
            expect(tourConfig.steps[0].content).toContain('congratulations');
            break;
          case 'wedding_week':
            expect(tourConfig.steps).toHaveLength(2); // Minimal tour
            expect(tourConfig.steps[0].content).toContain('ready for your big day');
            break;
        }
      });
    });
  });

  describe('Vendor-Couple Synchronization', () => {
    it('syncs tour progress between vendor and couple platforms', async () => {
      const mockCouple = { id: 'couple-123', names: 'Emma & James' };
      const mockVendor = { id: 'vendor-123', type: 'photographer', name: 'Sarah Photography' };

      // Start tour on couple side (WedMe)
      const coupleProgress = await startCoupletour(mockCouple.id);
      expect(coupleProgress.step).toBe(0);

      // Vendor should receive notification
      const vendorNotifications = await getVendorNotifications(mockVendor.id);
      expect(vendorNotifications).toContainEqual(
        expect.objectContaining({
          type: 'couple_tour_started',
          coupleId: mockCouple.id
        })
      );

      // Complete step on couple side
      await completeStepForCouple(mockCouple.id, 1);

      // Vendor should see updated progress
      const updatedNotifications = await getVendorNotifications(mockVendor.id);
      expect(updatedNotifications).toContainEqual(
        expect.objectContaining({
          type: 'couple_tour_progress',
          step: 1,
          completionPercentage: 20
        })
      );
    });

    it('handles vendor responses during couple tour', async () => {
      const mockCouple = { id: 'couple-123' };
      const mockVendor = { id: 'vendor-123' };

      await startCoupletour(mockCouple.id);
      
      // Vendor sends welcome message during tour
      await sendVendorMessage(mockVendor.id, mockCouple.id, {
        type: 'welcome',
        message: 'Welcome to our service! Excited to work with you!'
      });

      // Couple should see vendor message in tour
      const couplenotifications = await getCoupleNotifications(mockCouple.id);
      expect(couplenotifications).toContainEqual(
        expect.objectContaining({
          type: 'vendor_message',
          vendorId: mockVendor.id,
          message: expect.stringContaining('Welcome to our service')
        })
      );
    });
  });

  describe('High-Stress Scenarios', () => {
    it('handles wedding day tour usage under pressure', async () => {
      // Simulate wedding day (high stress, time pressure)
      const weddingDayContext = {
        isWeddingDay: true,
        timeRemaining: '2 hours',
        stressLevel: 'high',
        criticalTasks: ['timeline_review', 'vendor_contact', 'emergency_numbers']
      };

      const tourService = new TourService(weddingDayContext);
      const emergencyTour = await tourService.getTourConfig('emergency_coordination');

      // Should be ultra-streamlined
      expect(emergencyTour.steps).toHaveLength(3);
      expect(emergencyTour.estimatedDuration).toBeLessThan(300); // Under 5 minutes
      
      // Should prioritize critical information
      const criticalStep = emergencyTour.steps.find(step => 
        step.title.includes('Emergency Contacts')
      );
      expect(criticalStep).toBeDefined();
      expect(criticalStep.priority).toBe('critical');
    });

    it('provides fallback options when systems fail on wedding day', async () => {
      // Simulate system failure
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const mockApiFailure = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      global.fetch = mockApiFailure;

      const emergencyService = new EmergencyTourService();
      const fallbackTour = await emergencyService.getEmergencyFallback();

      expect(fallbackTour).toEqual({
        type: 'emergency_fallback',
        contactNumbers: expect.arrayContaining([
          expect.stringMatching(/^\d{3}-\d{3}-\d{4}$/)
        ]),
        criticalInfo: expect.objectContaining({
          supportHotline: '1-800-WEDSYNC',
          emergencyEmail: 'emergency@wedsync.com',
          statusPage: 'status.wedsync.com'
        })
      });
    });
  });

  describe('Real Wedding Testing', () => {
    it('completes actual wedding supplier onboarding flow', async () => {
      const realSupplierData = {
        businessName: 'Bella Vista Photography',
        contactEmail: 'sarah@bellavista.com',
        businessType: 'photographer',
        location: 'San Francisco, CA',
        yearsInBusiness: 8,
        averageWeddingCount: 25
      };

      const onboardingService = new SupplierOnboardingService();
      const tourResult = await onboardingService.completeOnboarding(realSupplierData);

      expect(tourResult).toMatchObject({
        completed: true,
        setupTime: expect.any(Number),
        completionRate: 100,
        supplierReady: true,
        integrations: expect.arrayContaining(['stripe', 'calendar'])
      });

      // Verify supplier can immediately start working with couples
      const readinessCheck = await onboardingService.checkSupplierReadiness(realSupplierData.contactEmail);
      expect(readinessCheck.canAcceptClients).toBe(true);
    });

    it('handles real couple planning workflow', async () => {
      const realCoupleData = {
        partner1: { name: 'Emma Rodriguez', email: 'emma.r@email.com' },
        partner2: { name: 'James Chen', email: 'james.c@email.com' },
        weddingDate: '2024-07-20',
        venue: 'Napa Valley Resort',
        estimatedBudget: 75000,
        guestCount: 120
      };

      const coupleService = new CoupleOnboardingService();
      const planningResult = await coupleService.completeInitialPlanning(realCoupleData);

      expect(planningResult).toMatchObject({
        profileComplete: true,
        budgetAllocated: true,
        vendorConnectionsReady: true,
        timelineCreated: true,
        planningScore: expect.numberMatching(score => score >= 0.8) // 80%+ completion
      });

      // Verify couple can immediately start collaborating with vendors
      const collaborationCheck = await coupleService.checkCollaborationReadiness(
        realCoupleData.partner1.email
      );
      expect(collaborationCheck.canConnectWithVendors).toBe(true);
    });
  });
});

// Helper functions for wedding-specific testing
function getWeddingDateForPhase(phase: string): string {
  const now = new Date();
  switch (phase) {
    case 'engagement':
      return new Date(now.getFullYear() + 1, 5, 15).toISOString(); // Next year
    case 'planning':
      return new Date(now.getFullYear(), now.getMonth() + 6, 15).toISOString(); // 6 months
    case 'final_month':
      return new Date(now.getFullYear(), now.getMonth() + 1, 15).toISOString(); // 1 month
    case 'wedding_week':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3).toISOString(); // 3 days
    default:
      return new Date(now.getFullYear(), now.getMonth() + 3, 15).toISOString();
  }
}
```

### Continuous Integration Setup

```yaml
# .github/workflows/wedding-tour-qa.yml
name: Wedding Tour QA Pipeline

on:
  pull_request:
    paths:
      - 'src/components/tours/**'
      - 'src/lib/services/tour-**'
      - 'src/__tests__/tours/**'
      - 'tests/**'
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20]
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - run: npm ci
    - run: npm run test:unit -- --coverage --watchAll=false
    - run: npm run test:integration
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
        flags: unittests

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm ci
    - run: npm run test:accessibility
    - run: npm run lighthouse:ci
    
    - name: Upload accessibility report
      uses: actions/upload-artifact@v3
      with:
        name: accessibility-report
        path: accessibility-report.html

  cross-browser-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm ci
    - run: npx playwright install
    - run: npm run test:cross-browser
    
    - name: Upload Playwright results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-results
        path: test-results/

  mobile-tests:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm ci
    - run: npm run test:mobile
    - run: npm run test:pwa

  performance-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'push' || contains(github.event.pull_request.labels.*.name, 'performance-test')
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm ci
    - run: npm run build
    - run: npm run test:performance
    
    - name: Upload performance results
      uses: actions/upload-artifact@v3
      with:
        name: performance-results
        path: test-results/performance/

  wedding-scenario-tests:
    runs-on: ubuntu-latest
    if: contains(github.event.pull_request.labels.*.name, 'wedding-critical')
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm ci
    - run: npm run test:wedding-scenarios
    - run: npm run test:emergency-fallbacks
    
    - name: Notify on wedding-critical failures
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: failure
        text: '🚨 Wedding-critical tour tests failed! Immediate attention required.'
      env:
        SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK }}

  deploy-preview:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'
    needs: [unit-tests, accessibility-tests, cross-browser-tests]
    
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - run: npm ci
    - run: npm run build
    - run: npm run deploy:preview
    
    - name: Comment PR with preview link
      uses: actions/github-script@v6
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '🎉 Tour preview deployed! Test it here: https://tour-preview-${{ github.event.number }}.wedsync.dev'
          })

  quality-gate:
    runs-on: ubuntu-latest
    needs: [unit-tests, accessibility-tests, cross-browser-tests, mobile-tests]
    if: always()
    
    steps:
    - name: Check test results
      run: |
        if [[ "${{ needs.unit-tests.result }}" == "failure" || 
              "${{ needs.accessibility-tests.result }}" == "failure" || 
              "${{ needs.cross-browser-tests.result }}" == "failure" || 
              "${{ needs.mobile-tests.result }}" == "failure" ]]; then
          echo "❌ Quality gate failed - tour system not ready for production"
          exit 1
        else
          echo "✅ Quality gate passed - tour system ready for wedding couples!"
        fi
```

This comprehensive QA and testing framework ensures the dashboard tour system meets the highest standards of reliability, accessibility, and performance required for wedding planning software. Every interaction is tested across multiple devices, browsers, and wedding-specific scenarios to guarantee flawless experiences during the most important moments of couples' lives.

---

**Estimated Implementation Time**: 20-25 development days
**Team Dependencies**: Requires close coordination with Teams A, B, C, and D for comprehensive testing coverage
**Critical Success Metrics**:
- 100% accessibility compliance (WCAG 2.1 AA)
- <2 second load times on mobile devices
- >99% cross-browser compatibility
- Zero failures in wedding-critical scenarios
- >95% code coverage across all tour functionality
- Performance budget compliance in all testing environments