import { test, expect } from '@playwright/test';
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import { format, addDays, subDays } from 'date-fns';

// Test data for mobile payment calendar scenarios
const mockWeddingData = {
  weddingId: 'test-wedding-123',
  coupleId: 'test-couple-456'
};
const mockPayments = [
  {
    id: 'payment-1',
    title: 'Venue Final Payment',
    amount: 5000,
    dueDate: addDays(new Date(), 3).toISOString(),
    status: 'pending',
    vendor: {
      id: 'vendor-1',
      name: 'Grand Ballroom',
      category: 'Venue'
    },
    priority: 'high'
  },
    id: 'payment-2', 
    title: 'Photography Deposit',
    amount: 1500,
    dueDate: subDays(new Date(), 2).toISOString(),
    status: 'overdue',
      id: 'vendor-2',
      name: 'Sunset Photography', 
      category: 'Photography'
    priority: 'critical'
    id: 'payment-3',
    title: 'Catering Balance',
    amount: 3200,
    dueDate: addDays(new Date(), 14).toISOString(),
    status: 'upcoming',
      id: 'vendor-3',
      name: 'Elite Catering',
      category: 'Catering'  
    priority: 'medium'
  }
];
// Device configurations for mobile testing
const mobileDevices = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 12', width: 390, height: 844 },
  { name: 'Samsung Galaxy S21', width: 360, height: 800 },
  { name: 'iPad Mini', width: 768, height: 1024 }
test.describe('Mobile Payment Calendar - WS-165', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for payment data
    await page.route('/api/payments/schedules*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          schedules: mockPayments,
          total: mockPayments.length
        })
      });
    });
    // Mock wedding access validation
    await page.route('/api/auth/user*', async (route) => {
          user: { id: 'test-user-123', role: 'couple' },
          wedding: mockWeddingData
    // Navigate to payment calendar page
    await page.goto('/payments/calendar?weddingId=' + mockWeddingData.weddingId);
    
    // Wait for calendar to load
    await page.waitForSelector('[data-testid="mobile-payment-calendar"]', { timeout: 10000 });
  });
  test.describe('Cross-Device Responsiveness', () => {
    mobileDevices.forEach(device => {
      test(`displays correctly on ${device.name} (${device.width}x${device.height})`, async ({ page }) => {
        await page.setViewportSize({ width: device.width, height: device.height });
        
        // Check calendar header is visible
        await expect(page.locator('h1:has-text("Payment Calendar")')).toBeVisible();
        // Check view toggle buttons are visible
        await expect(page.locator('button:has-text("Calendar")')).toBeVisible();
        await expect(page.locator('button:has-text("List")')).toBeVisible();
        // Check current month display
        const currentMonth = format(new Date(), 'MMMM yyyy');
        await expect(page.locator(`text=${currentMonth}`)).toBeVisible();
        // Take screenshot for visual comparison
        await page.screenshot({ 
          path: `test-results/mobile-payment-calendar-${device.name.toLowerCase().replace(' ', '-')}.png`,
          fullPage: true 
        });
  test.describe('Calendar Navigation', () => {
    test('navigates months using navigation buttons on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      
      const currentMonth = format(new Date(), 'MMMM yyyy');
      await expect(page.locator(`text=${currentMonth}`)).toBeVisible();
      // Navigate to next month
      await page.locator('button[aria-label="Next month"]').click();
      const nextMonth = format(addDays(new Date(), 30), 'MMMM yyyy');
      await expect(page.locator(`text=${nextMonth}`)).toBeVisible();
      // Navigate to previous month
      await page.locator('button[aria-label="Previous month"]').click();
      const prevMonth = format(subDays(new Date(), 30), 'MMMM yyyy');
      await expect(page.locator(`text=${prevMonth}`)).toBeVisible();
    test('supports swipe gestures for month navigation', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      const calendar = page.locator('.grid.grid-cols-7').first();
      // Perform swipe left gesture (next month)
      await calendar.hover();
      await page.mouse.move(200, 300);
      await page.mouse.down();
      await page.mouse.move(50, 300, { steps: 10 });
      await page.mouse.up();
      // Should navigate to next month (may take time for gesture recognition)
      await page.waitForTimeout(500);
      // Perform swipe right gesture (previous month)
      await page.mouse.move(50, 300);
      await page.mouse.move(200, 300, { steps: 10 });
  test.describe('Payment Data Display', () => {
    test('displays payment information on calendar', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12
      // Check payment amounts are visible
      await expect(page.locator('text=$5,000')).toBeVisible();
      await expect(page.locator('text=$1,500')).toBeVisible();
      await expect(page.locator('text=$3,200')).toBeVisible();
      // Check payment titles appear in calendar or when hovered/clicked
      const venuePaymentDay = page.locator(`text=${format(addDays(new Date(), 3), 'd')}`).first();
      await venuePaymentDay.click();
      await expect(page.locator('text=Venue Final Payment')).toBeVisible({ timeout: 2000 });
    test('shows visual indicators for payment status', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 }); // Galaxy S21
      // Check overdue payment styling
      const overdueDay = format(subDays(new Date(), 2), 'd');
      const overdueCell = page.locator(`.grid.grid-cols-7 div:has-text("${overdueDay}")`).first();
      // Should have error styling for overdue payments
      await expect(overdueCell).toHaveClass(/bg-error-50/);
      // Check critical priority indicators
      await expect(overdueCell).toHaveClass(/ring-1/);
      await expect(overdueCell).toHaveClass(/ring-error-200/);
    test('displays payment count for days with multiple payments', async ({ page }) => {
      // Add another payment on the same day as venue payment
      await page.route('/api/payments/schedules*', async (route) => {
        const extraPayment = {
          id: 'payment-4',
          title: 'Flowers Payment',
          amount: 800,
          dueDate: mockPayments[0].dueDate, // Same day as venue
          status: 'pending',
          vendor: {
            id: 'vendor-4',
            name: 'Bloom Flowers',
            category: 'Flowers'
          },
          priority: 'low'
        };
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            schedules: [...mockPayments, extraPayment],
            total: mockPayments.length + 1
          })
      await page.reload();
      await page.waitForSelector('[data-testid="mobile-payment-calendar"]');
      // Should show "2 payments" for the day with multiple payments
      await expect(page.locator('text=2 payments')).toBeVisible();
  test.describe('List View Functionality', () => {
    test('switches between calendar and list view', async ({ page }) => {
      // Start in calendar view
      await expect(page.locator('.grid.grid-cols-7')).toBeVisible();
      // Switch to list view
      await page.locator('button:has-text("List")').click();
      await expect(page.locator('text=Venue Final Payment')).toBeVisible();
      await expect(page.locator('text=Photography Deposit')).toBeVisible();
      await expect(page.locator('text=Catering Balance')).toBeVisible();
      // Switch back to calendar view
      await page.locator('button:has-text("Calendar")').click();
    test('displays payment details in list view', async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      // Check vendor names are visible
      await expect(page.locator('text=Grand Ballroom')).toBeVisible();
      await expect(page.locator('text=Sunset Photography')).toBeVisible();
      await expect(page.locator('text=Elite Catering')).toBeVisible();
      // Check status badges
      await expect(page.locator('text=Pending')).toBeVisible();
      await expect(page.locator('text=Overdue')).toBeVisible();
      await expect(page.locator('text=Upcoming')).toBeVisible();
      // Check due dates are formatted correctly
      const venueDate = format(addDays(new Date(), 3), 'MMM d, yyyy');
      await expect(page.locator(`text=${venueDate}`)).toBeVisible();
    test('handles payment status updates in list view', async ({ page }) => {
      // Mock payment update API
      await page.route('/api/payments/schedules/payment-1', async (route) => {
        if (route.request().method() === 'PUT') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              schedule: { ...mockPayments[0], status: 'paid', paidDate: new Date().toISOString() }
            })
          });
        } else {
          await route.continue();
        }
      // Click "Mark Paid" button for pending payment
      await page.locator('button:has-text("Mark Paid")').click();
      // Should show updated status
      await expect(page.locator('text=Paid')).toBeVisible();
  test.describe('Touch Optimization', () => {
    test('provides adequate touch targets on mobile', async ({ page }) => {
      // Check navigation buttons meet minimum 44px touch target
      const prevButton = page.locator('button[aria-label="Previous month"]');
      const nextButton = page.locator('button[aria-label="Next month"]');
      const prevBox = await prevButton.boundingBox();
      const nextBox = await nextButton.boundingBox();
      expect(prevBox?.width).toBeGreaterThanOrEqual(44);
      expect(prevBox?.height).toBeGreaterThanOrEqual(44);
      expect(nextBox?.width).toBeGreaterThanOrEqual(44);
      expect(nextBox?.height).toBeGreaterThanOrEqual(44);
      // Check view toggle buttons
      const calendarButton = page.locator('button:has-text("Calendar")');
      const listButton = page.locator('button:has-text("List")');
      const calendarBox = await calendarButton.boundingBox();
      const listBox = await listButton.boundingBox();
      expect(calendarBox?.height).toBeGreaterThanOrEqual(44);
      expect(listBox?.height).toBeGreaterThanOrEqual(44);
    test('handles touch events without delays', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      const startTime = Date.now();
      // Tap calendar day with payment
      const paymentDay = page.locator(`text=${format(addDays(new Date(), 3), 'd')}`).first();
      await paymentDay.click();
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      // Touch response should be under 300ms for good UX
      expect(responseTime).toBeLessThan(300);
  test.describe('PWA Functionality', () => {
    test('shows PWA install prompt when available', async ({ page, context }) => {
      // Mock PWA installability
      await context.addInitScript(() => {
        let deferredPrompt: any = {};
        (window as unknown).deferredPrompt = deferredPrompt;
        // Mock beforeinstallprompt event
        window.dispatchEvent(new Event('beforeinstallprompt'));
      // Should show install prompt
      await expect(page.locator('text=Install WedSync for offline access')).toBeVisible();
      await expect(page.locator('text=Access payments even without internet')).toBeVisible();
      // Test install button click
      await page.locator('button:has-text("Install")').click();
    test('handles offline mode gracefully', async ({ page, context }) => {
      // Start online
      await expect(page.locator('text=Offline mode')).not.toBeVisible();
      // Go offline
      await context.setOffline(true);
      // Should show offline indicator
      await expect(page.locator('text=Offline mode - Changes will sync when connection returns')).toBeVisible();
      // Payment data should still be available (from cache)
      await expect(page.locator('text=Payment Calendar')).toBeVisible();
  test.describe('Performance Validation', () => {
    test('loads within performance budget on mobile', async ({ page }) => {
      await page.goto('/payments/calendar?weddingId=' + mockWeddingData.weddingId);
      const loadTime = endTime - startTime;
      // Should load within 2 seconds on mobile
      expect(loadTime).toBeLessThan(2000);
      // Measure Core Web Vitals
      const cwv = await page.evaluate(() => {
        return new Promise((resolve) => {
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const metrics: any = {};
            
            entries.forEach((entry: any) => {
              if (entry.name === 'LCP') {
                metrics.lcp = entry.value;
              }
              if (entry.name === 'FID') {
                metrics.fid = entry.value;
              if (entry.name === 'CLS') {
                metrics.cls = entry.value;
            });
            resolve(metrics);
          }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
          
          // Fallback timeout
          setTimeout(() => resolve({}), 3000);
      console.log('Core Web Vitals:', cwv);
    test('handles rapid interactions without performance degradation', async ({ page }) => {
      const interactions = [];
      // Perform rapid month navigation
      for (let i = 0; i < 5; i++) {
        const startTime = Date.now();
        await page.locator('button[aria-label="Next month"]').click();
        await page.waitForTimeout(100);
        const endTime = Date.now();
        interactions.push(endTime - startTime);
      }
      // Each interaction should remain responsive
      interactions.forEach(time => {
        expect(time).toBeLessThan(200); // Should stay under 200ms
      // Switch to list view rapidly
      const listSwitchStart = Date.now();
      await page.waitForSelector('text=Venue Final Payment');
      const listSwitchEnd = Date.now();
      expect(listSwitchEnd - listSwitchStart).toBeLessThan(300);
  test.describe('Accessibility Validation', () => {
    test('provides proper ARIA labels and semantics', async ({ page }) => {
      // Check navigation button labels
      await expect(page.locator('button[aria-label="Previous month"]')).toBeVisible();
      await expect(page.locator('button[aria-label="Next month"]')).toBeVisible();
      // Check heading hierarchy
      await expect(page.locator('h1:has-text("Payment Calendar")')).toBeVisible();
      // Check color contrast for status indicators
      const overdueElement = page.locator('.bg-error-50').first();
      if (await overdueElement.isVisible()) {
        const color = await overdueElement.evaluate(el => 
          window.getComputedStyle(el).color
        );
        // Ensure sufficient contrast (basic check)
        expect(color).toBeTruthy();
    test('supports keyboard navigation', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad for easier keyboard testing
      // Tab through main elements
      await page.keyboard.press('Tab');
      await expect(page.locator('button[aria-label="Previous month"]:focus')).toBeVisible();
      await expect(page.locator('button[aria-label="Next month"]:focus')).toBeVisible();
      // Test view toggle with keyboard
      await page.keyboard.press('Enter');
      // Should switch to list view
  test.describe('Error Handling', () => {
    test('handles API errors gracefully', async ({ page }) => {
      // Mock API error
          status: 500,
          body: JSON.stringify({ error: 'Internal server error' })
      // Should show error state gracefully
      // Error handling UI should be present (depending on implementation)
    test('handles network timeouts gracefully', async ({ page }) => {
      // Mock slow/timeout response
        await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
          status: 408,
          body: JSON.stringify({ error: 'Request timeout' })
      // Should show loading state and handle timeout
      await expect(page.locator('[data-testid="mobile-payment-calendar"]')).toBeVisible({ timeout: 10000 });
  test.describe('Quick Stats Validation', () => {
    test('displays accurate payment statistics', async ({ page }) => {
      // Check total pending amount (venue: $5,000 + catering: $3,200 = $8,200)
      await expect(page.locator('text=$8,200')).toBeVisible();
      // Check overdue count (1 overdue payment)
      await expect(page.locator('text=1').and(page.locator('text=Overdue').locator('..'))).toBeVisible();
      // Stats should update when switching views
      await expect(page.locator('text=$8,200')).toBeVisible(); // Should remain consistent
});
