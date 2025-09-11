import { test, expect } from '@playwright/test';
import { mockWeddingScenarios, weddingTestData } from '../utils/chatbot-test-utils';

// Configure test timeout for longer E2E scenarios
test.setTimeout(120000); // 2 minutes

test.describe('WS-243 Chatbot End-to-End User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for consistent testing
    await page.route('**/api/chat/**', route => {
      const url = route.request().url();
      
      if (url.includes('/send-message')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'I\'d be happy to help with your wedding planning!',
            messageId: 'msg-' + Date.now(),
            confidence: 0.9,
            timestamp: new Date().toISOString()
          })
        });
      } else if (url.includes('/conversation')) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            conversationId: 'conv-' + Date.now(),
            history: [],
            context: {}
          })
        });
      }
    });

    // Navigate to dashboard page
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.describe('WS-243-E2E001: First-time user complete journey', () => {
    test('completes full onboarding and venue search flow', async ({ page }) => {
      // Step 1: Open chat widget
      await page.click('[data-testid="chat-widget-trigger"]');
      await expect(page.locator('[role="dialog"][aria-label*="chat"]')).toBeVisible();

      // Step 2: Welcome message should appear
      await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
      await expect(page.locator('text=Welcome to WedSync!')).toBeVisible();

      // Step 3: User sends first message
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('I need help planning my wedding');
      await page.click('[data-testid="send-message"]');

      // Step 4: Verify message appears in conversation
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText('I need help planning my wedding');

      // Step 5: AI response should appear
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="typing-indicator"]')).toBeHidden();

      // Step 6: Follow-up with venue search
      await chatInput.fill('I need to find a venue for 120 guests');
      await page.click('[data-testid="send-message"]');

      // Step 7: Venue recommendations should appear
      await expect(page.locator('[data-testid="venue-card"]').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('[data-testid="venue-name"]').first()).toBeVisible();

      // Step 8: Interact with venue recommendation
      await page.click('[data-testid="view-venue-details"]');
      await expect(page.locator('[data-testid="venue-details-modal"]')).toBeVisible();

      // Step 9: Close venue details and continue conversation
      await page.click('[data-testid="close-venue-details"]');
      await chatInput.fill('That venue looks great! What about photographers?');
      await page.click('[data-testid="send-message"]');

      // Step 10: Vendor recommendations should appear
      await expect(page.locator('[data-testid="vendor-card"]').first()).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=photographer')).toBeVisible();

      // Verify conversation persistence
      expect(await page.locator('[data-testid="message-bubble"]').count()).toBeGreaterThan(4);
    });

    test('handles wedding details collection flow', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Initial wedding details request
      await chatInput.fill('I\'m planning a rustic wedding for June 2024');
      await page.click('[data-testid="send-message"]');

      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible();

      // Should prompt for more details
      await expect(page.locator('text=guest count')).toBeVisible();
      await expect(page.locator('text=budget')).toBeVisible();

      // Provide guest count
      await chatInput.fill('We\'re expecting 120 guests');
      await page.click('[data-testid="send-message"]');

      // Verify context retention
      await chatInput.fill('What\'s a good budget for that size wedding?');
      await page.click('[data-testid="send-message"]');

      // Should receive budget recommendations
      await expect(page.locator('[data-testid="budget-breakdown"]')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=$')).toBeVisible();
      await expect(page.locator('text=120 guests')).toBeVisible(); // Context retention
    });

    test('completes vendor recommendation and contact flow', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      const chatInput = page.locator('[data-testid="chat-input"]');
      
      // Request photographer recommendations
      await chatInput.fill('I need a photographer for my outdoor rustic wedding');
      await page.click('[data-testid="send-message"]');

      // Wait for vendor recommendations
      await expect(page.locator('[data-testid="vendor-card"]').first()).toBeVisible({ timeout: 10000 });

      // Verify vendor card contains required information
      const vendorCard = page.locator('[data-testid="vendor-card"]').first();
      await expect(vendorCard.locator('[data-testid="vendor-name"]')).toBeVisible();
      await expect(vendorCard.locator('[data-testid="vendor-rating"]')).toBeVisible();
      await expect(vendorCard.locator('[data-testid="vendor-price-range"]')).toBeVisible();
      await expect(vendorCard.locator('[data-testid="vendor-specialties"]')).toBeVisible();

      // Click view portfolio
      await vendorCard.locator('[data-testid="view-portfolio"]').click();
      await expect(page.locator('[data-testid="portfolio-modal"]')).toBeVisible();

      // Close portfolio and contact vendor
      await page.click('[data-testid="close-portfolio"]');
      await vendorCard.locator('[data-testid="contact-vendor"]').click();

      // Verify contact information displayed
      await expect(page.locator('[data-testid="vendor-contact-info"]')).toBeVisible();
      await expect(page.locator('[data-testid="vendor-phone"]')).toBeVisible();
      await expect(page.locator('[data-testid="vendor-email"]')).toBeVisible();
    });
  });

  test.describe('WS-243-E2E002: Returning user experience', () => {
    test.beforeEach(async ({ page }) => {
      // Set up returning user session
      await page.evaluate(() => {
        localStorage.setItem('wedsync_chat_conversation', JSON.stringify([
          {
            id: 'msg-1',
            role: 'user',
            content: 'I need help with my rustic wedding',
            timestamp: new Date().toISOString()
          },
          {
            id: 'msg-2',
            role: 'assistant',
            content: 'I remember we were discussing your rustic wedding! How can I help you today?',
            timestamp: new Date().toISOString()
          }
        ]));

        localStorage.setItem('wedsync_chat_context', JSON.stringify({
          weddingStyle: 'rustic',
          guestCount: 120,
          preferredVendors: []
        }));
      });
    });

    test('restores conversation context successfully', async ({ page }) => {
      await page.reload();
      await page.click('[data-testid="chat-widget-trigger"]');

      // Should restore previous conversation
      await expect(page.locator('[data-testid="user-message"]')).toContainText('rustic wedding');
      await expect(page.locator('[data-testid="ai-message"]')).toContainText('remember we were discussing');

      // Context should be maintained for new questions
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('What flowers work well with that style?');
      await page.click('[data-testid="send-message"]');

      // Response should reference rustic style
      await expect(page.locator('[data-testid="ai-message"]').last()).toContainText('rustic');
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible();
    });

    test('handles progress continuation correctly', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      // Should show progress indicators
      await expect(page.locator('[data-testid="planning-progress"]')).toBeVisible();
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('What\'s my next step?');
      await page.click('[data-testid="send-message"]');

      // Should provide contextual next steps
      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible();
      await expect(page.locator('[data-testid="next-steps"]')).toBeVisible();
    });

    test('provides updated recommendations based on history', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Show me more venue options');
      await page.click('[data-testid="send-message"]');

      // Should filter based on known preferences
      await expect(page.locator('[data-testid="venue-card"]')).toBeVisible({ timeout: 10000 });
      
      // Venues should match rustic style
      const venueCards = page.locator('[data-testid="venue-card"]');
      const firstVenue = venueCards.first();
      await expect(firstVenue.locator('text=rustic')).toBeVisible();
    });
  });

  test.describe('WS-243-E2E003: Multi-device conversation continuity', () => {
    test('maintains session across browser refresh', async ({ page }) => {
      // Start conversation
      await page.click('[data-testid="chat-widget-trigger"]');
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('I need help with my wedding planning');
      await page.click('[data-testid="send-message"]');

      await expect(page.locator('[data-testid="ai-message"]').last()).toBeVisible();

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Reopen chat
      await page.click('[data-testid="chat-widget-trigger"]');

      // Conversation should be restored
      await expect(page.locator('[data-testid="user-message"]')).toContainText('wedding planning');
      await expect(page.locator('[data-testid="ai-message"]')).toBeVisible();
    });

    test('handles mobile viewport correctly', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="chat-widget-trigger"]');

      // Chat should be fullscreen on mobile
      const chatWidget = page.locator('[data-testid="chat-widget"]');
      await expect(chatWidget).toHaveClass(/mobile-optimized/);
      
      const bbox = await chatWidget.boundingBox();
      expect(bbox?.width).toBe(375);
      expect(bbox?.height).toBe(667);

      // Input should be accessible
      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeVisible();
      
      await chatInput.fill('Mobile test message');
      await page.click('[data-testid="send-message"]');

      await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Mobile test message');
    });

    test('synchronizes across browser tabs', async ({ context, page }) => {
      // Start conversation in first tab
      await page.click('[data-testid="chat-widget-trigger"]');
      
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('First tab message');
      await page.click('[data-testid="send-message"]');

      // Open second tab
      const secondTab = await context.newPage();
      await secondTab.goto('/dashboard');
      await secondTab.waitForLoadState('networkidle');

      await secondTab.click('[data-testid="chat-widget-trigger"]');

      // Should show synchronized conversation
      await expect(secondTab.locator('[data-testid="user-message"]')).toContainText('First tab message');

      // Send message from second tab
      const secondChatInput = secondTab.locator('[data-testid="chat-input"]');
      await secondChatInput.fill('Second tab message');
      await secondTab.click('[data-testid="send-message"]');

      // Check synchronization back to first tab
      await page.waitForTimeout(1000); // Allow sync time
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText('Second tab message');
    });
  });

  test.describe('WS-243-E2E005: Emergency scenario handling', () => {
    test('handles venue cancellation emergency', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('EMERGENCY: Our venue just canceled our wedding in 2 weeks!');
      await page.click('[data-testid="send-message"]');

      // Should recognize emergency
      await expect(page.locator('[data-testid="emergency-alert"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="ai-message"]').last()).toContainText('urgent');

      // Should offer immediate help
      await expect(page.locator('[data-testid="emergency-actions"]')).toBeVisible();
      await expect(page.locator('[data-testid="human-support-offer"]')).toBeVisible();

      // Click emergency support
      await page.click('[data-testid="contact-emergency-support"]');
      await expect(page.locator('[data-testid="emergency-contact-modal"]')).toBeVisible();
    });

    test('provides weather contingency planning', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Heavy rain is predicted for our outdoor wedding this Saturday. What should we do?');
      await page.click('[data-testid="send-message"]');

      // Should provide weather contingency advice
      await expect(page.locator('[data-testid="ai-message"]').last()).toContainText('weather');
      await expect(page.locator('[data-testid="weather-backup-plans"]')).toBeVisible({ timeout: 10000 });

      // Should show specific actions
      await expect(page.locator('text=tent')).toBeVisible();
      await expect(page.locator('text=indoor')).toBeVisible();
      await expect(page.locator('text=backup')).toBeVisible();
    });

    test('manages budget crisis situation', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('We just realized we\'re $10,000 over budget and the wedding is in 3 weeks!');
      await page.click('[data-testid="send-message"]');

      // Should provide budget crisis management
      await expect(page.locator('[data-testid="ai-message"]').last()).toContainText('budget');
      await expect(page.locator('[data-testid="cost-cutting-suggestions"]')).toBeVisible({ timeout: 10000 });

      // Should prioritize essential vs. optional items
      await expect(page.locator('[data-testid="priority-items"]')).toBeVisible();
      await expect(page.locator('[data-testid="optional-items"]')).toBeVisible();
    });

    test('handles last-minute timeline changes', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('We need to move our ceremony time from 4 PM to 2 PM - wedding is tomorrow!');
      await page.click('[data-testid="send-message"]');

      // Should provide timeline adjustment help
      await expect(page.locator('[data-testid="ai-message"]').last()).toContainText('timeline');
      await expect(page.locator('[data-testid="timeline-adjustments"]')).toBeVisible({ timeout: 10000 });

      // Should show vendor notification checklist
      await expect(page.locator('[data-testid="vendor-notification-list"]')).toBeVisible();
      await expect(page.locator('text=photographer')).toBeVisible();
      await expect(page.locator('text=florist')).toBeVisible();
    });
  });

  test.describe('WS-243-E2E007: Accessibility-focused journey', () => {
    test('works with keyboard navigation only', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      // Navigate using Tab key
      await page.keyboard.press('Tab'); // Focus on input
      await expect(page.locator('[data-testid="chat-input"]')).toBeFocused();

      // Type message
      await page.keyboard.type('I need help planning my wedding');
      
      // Navigate to send button
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="send-message"]')).toBeFocused();
      
      // Send message with Enter
      await page.keyboard.press('Enter');
      await expect(page.locator('[data-testid="user-message"]').last()).toContainText('planning my wedding');

      // Navigate to response actions
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      
      // Should be able to interact with quick reply buttons
      const quickReplyButton = page.locator('[data-testid="quick-reply-button"]').first();
      if (await quickReplyButton.isVisible()) {
        await expect(quickReplyButton).toBeFocused();
        await page.keyboard.press('Enter');
      }
    });

    test('provides screen reader friendly experience', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      // Check ARIA labels and roles
      await expect(page.locator('[role="dialog"]')).toBeVisible();
      await expect(page.locator('[role="log"]')).toBeVisible(); // Message history
      await expect(page.locator('[aria-label="Type your wedding planning question"]')).toBeVisible();

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('Test message for screen reader');
      await page.click('[data-testid="send-message"]');

      // Messages should have proper ARIA labels
      await expect(page.locator('[role="article"][aria-label*="User message"]')).toBeVisible();
      
      // Status updates should be announced
      await expect(page.locator('[role="status"][aria-live="polite"]')).toBeVisible();
    });

    test('supports high contrast mode', async ({ page }) => {
      // Simulate high contrast preference
      await page.emulateMedia({ prefersColorScheme: 'dark' });
      await page.addStyleTag({
        content: `
          @media (prefers-contrast: high) {
            * { 
              filter: contrast(150%); 
            }
          }
        `
      });

      await page.click('[data-testid="chat-widget-trigger"]');

      // Check that high contrast styles are applied
      const chatWidget = page.locator('[data-testid="chat-widget"]');
      await expect(chatWidget).toHaveClass(/high-contrast/);

      // Verify color contrast ratios meet WCAG standards
      const inputField = page.locator('[data-testid="chat-input"]');
      const inputStyles = await inputField.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          color: styles.color,
          backgroundColor: styles.backgroundColor,
          borderColor: styles.borderColor
        };
      });

      // Colors should be high contrast (this is a simplified check)
      expect(inputStyles.color).not.toBe(inputStyles.backgroundColor);
    });

    test('handles voice input correctly', async ({ page }) => {
      // Mock speech recognition API
      await page.evaluateOnNewDocument(() => {
        class MockSpeechRecognition extends EventTarget {
          continuous = false;
          interimResults = false;
          lang = 'en-US';
          
          start() {
            setTimeout(() => {
              const event = new Event('result');
              event.results = [{
                0: { transcript: 'I need help with my wedding planning' },
                isFinal: true
              }];
              this.dispatchEvent(event);
            }, 1000);
          }
          
          stop() {}
        }
        
        window.SpeechRecognition = MockSpeechRecognition;
        window.webkitSpeechRecognition = MockSpeechRecognition;
      });

      await page.click('[data-testid="chat-widget-trigger"]');

      // Click voice input button if available
      const voiceButton = page.locator('[data-testid="voice-input-button"]');
      if (await voiceButton.isVisible()) {
        await voiceButton.click();
        
        // Should show listening indicator
        await expect(page.locator('[data-testid="listening-indicator"]')).toBeVisible();
        
        // Wait for mock speech recognition to complete
        await page.waitForTimeout(1500);
        
        // Input should be filled with transcribed text
        await expect(page.locator('[data-testid="chat-input"]')).toHaveValue('I need help with my wedding planning');
      }
    });
  });

  test.describe('Performance and Reliability', () => {
    test('maintains performance under load', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      const startTime = Date.now();
      
      // Send multiple messages rapidly
      for (let i = 0; i < 10; i++) {
        const chatInput = page.locator('[data-testid="chat-input"]');
        await chatInput.fill(`Performance test message ${i + 1}`);
        await page.click('[data-testid="send-message"]');
        
        // Don't wait for AI response to simulate rapid sending
        await page.waitForTimeout(100);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle all messages within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds max

      // All messages should be visible
      expect(await page.locator('[data-testid="user-message"]').count()).toBe(10);
    });

    test('recovers gracefully from connection errors', async ({ page }) => {
      await page.click('[data-testid="chat-widget-trigger"]');

      // Simulate network failure
      await page.route('**/api/chat/**', route => {
        route.abort('failed');
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill('This message should fail');
      await page.click('[data-testid="send-message"]');

      // Should show connection error
      await expect(page.locator('[data-testid="connection-error"]')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

      // Restore network and retry
      await page.unroute('**/api/chat/**');
      await page.route('**/api/chat/**', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            message: 'Connection restored!',
            messageId: 'msg-retry',
            timestamp: new Date().toISOString()
          })
        });
      });

      await page.click('[data-testid="retry-button"]');
      await expect(page.locator('[data-testid="ai-message"]').last()).toContainText('Connection restored');
    });
  });
});