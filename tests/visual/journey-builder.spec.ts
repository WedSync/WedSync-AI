import { test, expect } from '@playwright/test';

/**
 * Journey Builder Visual Regression Tests
 * Focused testing of React Flow canvas and Journey Builder UI
 */

test.describe('Journey Builder Visual Regression', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Mock journey data for consistent testing
    await page.route('**/api/journeys**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          journeys: [
            {
              id: 'journey-1',
              name: 'Wedding Planning Journey',
              nodes: [
                { id: '1', type: 'start', position: { x: 100, y: 100 }, data: { label: 'Start' } },
                { id: '2', type: 'email', position: { x: 300, y: 100 }, data: { label: 'Welcome Email' } },
                { id: '3', type: 'condition', position: { x: 500, y: 100 }, data: { label: 'Response Check' } }
              ],
              edges: [
                { id: 'e1-2', source: '1', target: '2', type: 'smoothstep' },
                { id: 'e2-3', source: '2', target: '3', type: 'smoothstep' }
              ]
            }
          ]
        })
      });
    });
    
    // Mock authentication
    await page.route('**/api/auth/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'test-user', email: 'test@example.com' } })
      });
    });
  });

  test('Journey Builder - Empty Canvas', async ({ page }) => {
    await page.goto('/journeys/new');
    await page.waitForLoadState('networkidle');
    
    // Wait for React Flow to initialize
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    
    // Disable animations for consistent screenshots
    await page.addStyleTag({
      content: `
        .react-flow__node,
        .react-flow__edge,
        .react-flow__connection,
        .react-flow__handle {
          transition: none !important;
          animation: none !important;
        }
        .react-flow__minimap {
          display: none !important;
        }
      `
    });
    
    await expect(page.locator('.react-flow')).toHaveScreenshot('journey-canvas-empty.png');
  });

  test('Journey Builder - With Sample Journey', async ({ page }) => {
    await page.goto('/journeys/journey-1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    await page.waitForSelector('.react-flow__node', { timeout: 10000 });
    
    await page.addStyleTag({
      content: `
        .react-flow__node,
        .react-flow__edge,
        .react-flow__connection,
        .react-flow__handle {
          transition: none !important;
          animation: none !important;
        }
        .react-flow__minimap {
          display: none !important;
        }
      `
    });
    
    await expect(page.locator('.react-flow')).toHaveScreenshot('journey-canvas-with-nodes.png');
  });

  test('Journey Builder - Node Palette', async ({ page }) => {
    await page.goto('/journeys/new');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="node-palette"]', { timeout: 10000 });
    
    await expect(page.locator('[data-testid="node-palette"]')).toHaveScreenshot('journey-node-palette.png');
  });

  test('Journey Builder - Node Types', async ({ page }) => {
    await page.goto('/journeys/new');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    
    // Add different node types for visual testing
    const nodeTypes = ['start', 'email', 'sms', 'condition', 'delay', 'webhook'];
    
    for (let i = 0; i < nodeTypes.length; i++) {
      const nodeType = nodeTypes[i];
      
      // Drag node from palette to canvas
      await page.dragAndDrop(
        `[data-testid="node-${nodeType}"]`,
        '.react-flow',
        {
          targetPosition: { x: 200 + (i * 150), y: 200 }
        }
      );
    }
    
    await page.waitForTimeout(1000); // Wait for nodes to settle
    
    await page.addStyleTag({
      content: `
        .react-flow__node,
        .react-flow__edge,
        .react-flow__connection {
          transition: none !important;
          animation: none !important;
        }
      `
    });
    
    await expect(page.locator('.react-flow')).toHaveScreenshot('journey-node-types.png');
  });

  test('Journey Builder - Node Configuration Panel', async ({ page }) => {
    await page.goto('/journeys/journey-1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('.react-flow__node', { timeout: 10000 });
    
    // Click on a node to open configuration panel
    await page.click('.react-flow__node[data-id="2"]');
    
    await page.waitForSelector('[data-testid="node-config-panel"]', { timeout: 5000 });
    
    await expect(page.locator('[data-testid="node-config-panel"]')).toHaveScreenshot('journey-node-config.png');
  });

  test('Journey Builder - Connection States', async ({ page }) => {
    await page.goto('/journeys/new');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    
    // Add two nodes
    await page.dragAndDrop('[data-testid="node-start"]', '.react-flow', {
      targetPosition: { x: 200, y: 200 }
    });
    
    await page.dragAndDrop('[data-testid="node-email"]', '.react-flow', {
      targetPosition: { x: 400, y: 200 }
    });
    
    // Start connection mode
    await page.hover('.react-flow__node[data-id="1"] .react-flow__handle-right');
    
    await page.addStyleTag({
      content: `
        .react-flow__node,
        .react-flow__edge,
        .react-flow__connection {
          transition: none !important;
          animation: none !important;
        }
      `
    });
    
    await expect(page.locator('.react-flow')).toHaveScreenshot('journey-connection-mode.png');
  });

  test('Journey Builder - Mobile View', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/journeys/journey-1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    
    await page.addStyleTag({
      content: `
        .react-flow__node,
        .react-flow__edge,
        .react-flow__connection {
          transition: none !important;
          animation: none !important;
        }
      `
    });
    
    await expect(page).toHaveScreenshot('journey-builder-mobile.png');
  });

  test('Journey Builder - Zoom and Pan Controls', async ({ page }) => {
    await page.goto('/journeys/journey-1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('.react-flow__controls', { timeout: 10000 });
    
    await expect(page.locator('.react-flow__controls')).toHaveScreenshot('journey-controls.png');
  });

  test('Journey Builder - Minimap', async ({ page }) => {
    await page.goto('/journeys/journey-1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('.react-flow__minimap', { timeout: 10000 });
    
    await expect(page.locator('.react-flow__minimap')).toHaveScreenshot('journey-minimap.png');
  });

  test('Journey Builder - Context Menu', async ({ page }) => {
    await page.goto('/journeys/journey-1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('.react-flow__node', { timeout: 10000 });
    
    // Right-click on a node to open context menu
    await page.click('.react-flow__node[data-id="2"]', { button: 'right' });
    
    await page.waitForSelector('[data-testid="context-menu"]', { timeout: 5000 });
    
    await expect(page.locator('[data-testid="context-menu"]')).toHaveScreenshot('journey-context-menu.png');
  });

  test('Journey Builder - Error States', async ({ page }) => {
    // Mock API error for testing error states
    await page.route('**/api/journeys/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to load journey' })
      });
    });
    
    await page.goto('/journeys/journey-1');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('[data-testid="error-state"]', { timeout: 10000 });
    
    await expect(page.locator('[data-testid="error-state"]')).toHaveScreenshot('journey-error-state.png');
  });

  test('Journey Builder - Loading States', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/journeys/**', (route) => {
      setTimeout(() => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ journeys: [] })
        });
      }, 3000);
    });
    
    await page.goto('/journeys');
    
    await page.waitForSelector('[data-testid="loading-spinner"]', { timeout: 5000 });
    
    await expect(page.locator('[data-testid="loading-spinner"]')).toHaveScreenshot('journey-loading-state.png');
  });

  test('Journey Builder - Overflow UI Integration', async ({ page }) => {
    await page.goto('/journeys/new');
    await page.waitForLoadState('networkidle');
    
    // Test Overflow UI components integration
    await page.waitForSelector('[data-testid="overflow-sidebar"]', { timeout: 10000 });
    await page.waitForSelector('[data-testid="overflow-toolbar"]', { timeout: 10000 });
    
    await expect(page).toHaveScreenshot('journey-overflow-ui.png');
  });

  test('Journey Builder - Dark Theme', async ({ page }) => {
    await page.goto('/journeys/journey-1');
    await page.waitForLoadState('networkidle');
    
    // Switch to dark theme
    await page.evaluate(() => {
      document.documentElement.classList.add('dark');
    });
    
    await page.waitForTimeout(500);
    
    await page.addStyleTag({
      content: `
        .react-flow__node,
        .react-flow__edge,
        .react-flow__connection {
          transition: none !important;
          animation: none !important;
        }
      `
    });
    
    await expect(page).toHaveScreenshot('journey-builder-dark.png');
  });

  test('Journey Builder - Performance with Many Nodes', async ({ page }) => {
    // Mock journey with many nodes for performance testing
    await page.route('**/api/journeys/large-journey', (route) => {
      const nodes = [];
      const edges = [];
      
      for (let i = 1; i <= 50; i++) {
        nodes.push({
          id: `node-${i}`,
          type: i % 4 === 0 ? 'condition' : i % 3 === 0 ? 'email' : i % 2 === 0 ? 'sms' : 'delay',
          position: { x: (i % 10) * 150, y: Math.floor(i / 10) * 100 },
          data: { label: `Node ${i}` }
        });
        
        if (i > 1) {
          edges.push({
            id: `edge-${i-1}-${i}`,
            source: `node-${i-1}`,
            target: `node-${i}`,
            type: 'smoothstep'
          });
        }
      }
      
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ nodes, edges })
      });
    });
    
    await page.goto('/journeys/large-journey');
    await page.waitForLoadState('networkidle');
    
    await page.waitForSelector('.react-flow', { timeout: 15000 });
    await page.waitForSelector('.react-flow__node', { timeout: 10000 });
    
    await page.addStyleTag({
      content: `
        .react-flow__node,
        .react-flow__edge,
        .react-flow__connection {
          transition: none !important;
          animation: none !important;
        }
      `
    });
    
    await expect(page.locator('.react-flow')).toHaveScreenshot('journey-many-nodes.png');
  });
});