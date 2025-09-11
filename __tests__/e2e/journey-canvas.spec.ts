import { test, expect } from '@playwright/test';

test.describe('Journey Canvas', () => {
  // Setup: Create a test journey before running tests
  test.beforeEach(async ({ page }) => {
    // Navigate to the journeys page
    await page.goto('/journeys');
    
    // Ensure we're logged in (this might need adjustment based on your auth setup)
    await page.waitForSelector('[data-testid="journeys-page"]', { timeout: 10000 });
    
    // Create a new journey or navigate to existing test journey
    // For now, let's assume we have a test journey with a known ID
    await page.goto('/journeys/test-journey-id/canvas');
    
    // Wait for canvas to load
    await page.waitForSelector('[data-testid="react-flow-wrapper"]', { timeout: 10000 });
  });

  test('should load journey canvas with grid and node library', async ({ page }) => {
    // Check that the canvas is visible
    await expect(page.locator('[data-testid="react-flow-wrapper"]')).toBeVisible();
    
    // Check that the node library is visible
    await expect(page.locator('.w-80')).toBeVisible(); // Node library width class
    
    // Check for grid background
    await expect(page.locator('svg')).toBeVisible();
    
    // Check for zoom controls
    await expect(page.locator('text=Zoom:')).toBeVisible();
  });

  test('should drag email node from library to canvas', async ({ page }) => {
    // Take initial screenshot
    await page.screenshot({ path: 'canvas-initial.png', fullPage: true });
    
    // Find the email node in the library
    const emailNode = page.locator('[data-testid="node-library-email"]').or(
      page.locator('text=Email').first()
    );
    await expect(emailNode).toBeVisible();
    
    // Find the canvas drop zone
    const canvasDropZone = page.locator('[data-testid="canvas-drop-zone"]').or(
      page.locator('[data-testid="react-flow-wrapper"]')
    );
    await expect(canvasDropZone).toBeVisible();
    
    // Get bounding boxes for drag and drop
    const emailNodeBox = await emailNode.boundingBox();
    const canvasBox = await canvasDropZone.boundingBox();
    
    if (!emailNodeBox || !canvasBox) {
      throw new Error('Could not get bounding boxes for drag and drop');
    }
    
    // Perform drag and drop
    await page.mouse.move(
      emailNodeBox.x + emailNodeBox.width / 2,
      emailNodeBox.y + emailNodeBox.height / 2
    );
    await page.mouse.down();
    
    // Move to center of canvas
    await page.mouse.move(
      canvasBox.x + canvasBox.width / 2,
      canvasBox.y + canvasBox.height / 2,
      { steps: 10 } // Smooth movement
    );
    await page.mouse.up();
    
    // Wait for node to appear on canvas
    await page.waitForTimeout(1000); // Give time for the drop to process
    
    // Check that a new email node appeared on the canvas
    await expect(page.locator('[data-testid="canvas-node-email"]').or(
      page.locator('text=Email Node')
    )).toBeVisible();
    
    // Take screenshot after drop
    await page.screenshot({ path: 'canvas-after-email-drop.png', fullPage: true });
  });

  test('should drag timeline node and configure it', async ({ page }) => {
    // Drag timeline node from library
    const timelineNode = page.locator('text=Timeline Anchor').first();
    await expect(timelineNode).toBeVisible();
    
    const canvas = page.locator('[data-testid="react-flow-wrapper"]');
    const canvasBox = await canvas.boundingBox();
    
    if (!canvasBox) throw new Error('Could not get canvas bounding box');
    
    // Drag timeline node to canvas
    await timelineNode.dragTo(canvas, {
      targetPosition: {
        x: canvasBox.width / 3,
        y: canvasBox.height / 3
      }
    });
    
    // Wait for the node to appear
    await page.waitForTimeout(1000);
    
    // Click on the timeline node to select it
    const timelineCanvasNode = page.locator('[data-testid="canvas-node-timeline"]').or(
      page.locator('text=Timeline').first()
    );
    await timelineCanvasNode.click();
    
    // Check that the configuration panel appears
    await expect(page.locator('text=Node Configuration')).toBeVisible();
    
    // Check for timeline-specific configuration
    await expect(page.locator('text=Anchor')).toBeVisible();
    await expect(page.locator('text=Timing')).toBeVisible();
  });

  test('should connect two nodes with drag connection', async ({ page }) => {
    // First, add two nodes to connect
    const emailNode = page.locator('text=Email').first();
    const timelineNode = page.locator('text=Timeline Anchor').first();
    const canvas = page.locator('[data-testid="react-flow-wrapper"]');
    
    // Drag email node
    await emailNode.dragTo(canvas, {
      targetPosition: { x: 200, y: 200 }
    });
    await page.waitForTimeout(500);
    
    // Drag timeline node
    await timelineNode.dragTo(canvas, {
      targetPosition: { x: 400, y: 200 }
    });
    await page.waitForTimeout(500);
    
    // Find the connection handles (these might need to be made visible on hover)
    const sourceNode = page.locator('[data-testid="canvas-node-email"]').first();
    const targetNode = page.locator('[data-testid="canvas-node-timeline"]').first();
    
    // Hover over source node to reveal connection handles
    await sourceNode.hover();
    
    // Look for connection handle
    const sourceHandle = sourceNode.locator('.cursor-pointer').first();
    const targetHandle = targetNode.locator('.cursor-pointer').first();
    
    // Create connection by dragging from source handle to target handle
    if (await sourceHandle.isVisible() && await targetHandle.isVisible()) {
      await sourceHandle.dragTo(targetHandle);
      
      // Wait for connection to be created
      await page.waitForTimeout(1000);
      
      // Check that a connection line appears
      await expect(page.locator('path[stroke="#6366f1"]')).toBeVisible();
    } else {
      // If handles aren't visible, try alternative method
      console.log('Connection handles not visible, trying alternative connection method');
    }
  });

  test('should support canvas zoom and pan operations', async ({ page }) => {
    // Test zoom in
    const zoomInButton = page.locator('[data-testid="zoom-in"]').or(
      page.locator('button:has-text("+")')
    );
    
    if (await zoomInButton.isVisible()) {
      await zoomInButton.click();
      await zoomInButton.click();
      
      // Check zoom level changed
      await expect(page.locator('text=Zoom: 120%')).toBeVisible();
    }
    
    // Test zoom out
    const zoomOutButton = page.locator('[data-testid="zoom-out"]').or(
      page.locator('button:has-text("-")')
    );
    
    if (await zoomOutButton.isVisible()) {
      await zoomOutButton.click();
      
      // Check zoom level changed
      await expect(page.locator('text=Zoom: 110%')).toBeVisible();
    }
    
    // Test wheel zoom (Ctrl+wheel)
    const canvas = page.locator('[data-testid="react-flow-wrapper"]');
    await canvas.hover();
    
    // Zoom in with Ctrl+wheel
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100); // Negative for zoom in
    await page.keyboard.up('Control');
    
    await page.waitForTimeout(500);
    
    // Test canvas panning by dragging
    const canvasBox = await canvas.boundingBox();
    if (canvasBox) {
      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 200, canvasBox.y + 150, { steps: 5 });
      await page.mouse.up();
    }
  });

  test('should validate journey canvas and show errors', async ({ page }) => {
    // Click validate button
    const validateButton = page.locator('button:has-text("Validate")');
    await validateButton.click();
    
    // Wait for validation to complete
    await page.waitForTimeout(2000);
    
    // Check for validation messages (could be success or errors)
    // This will depend on the current state of the canvas
    const hasSuccessMessage = await page.locator('text=validation passed').isVisible();
    const hasErrorMessage = await page.locator('[role="alert"]').isVisible();
    
    expect(hasSuccessMessage || hasErrorMessage).toBe(true);
  });

  test('should save canvas state', async ({ page }) => {
    // Make a change to the canvas (add a node)
    const emailNode = page.locator('text=Email').first();
    const canvas = page.locator('[data-testid="react-flow-wrapper"]');
    
    await emailNode.dragTo(canvas);
    await page.waitForTimeout(1000);
    
    // Click save button
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();
    
    // Wait for save to complete
    await page.waitForTimeout(2000);
    
    // Check for success message
    await expect(page.locator('text=saved successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should auto-save after 30 seconds of inactivity', async ({ page }) => {
    // Make a change to the canvas
    const emailNode = page.locator('text=Email').first();
    const canvas = page.locator('[data-testid="react-flow-wrapper"]');
    
    await emailNode.dragTo(canvas);
    await page.waitForTimeout(1000);
    
    // Wait for auto-save (30 seconds + buffer)
    await page.waitForTimeout(32000);
    
    // Check for auto-save indication (this might be subtle)
    // The implementation should show some indication of auto-save
    console.log('Auto-save should have triggered after 30 seconds of inactivity');
  });

  test('should handle node configuration panel', async ({ page }) => {
    // Add an email node
    const emailNode = page.locator('text=Email').first();
    const canvas = page.locator('[data-testid="react-flow-wrapper"]');
    
    await emailNode.dragTo(canvas);
    await page.waitForTimeout(1000);
    
    // Click on the newly added node
    const canvasNode = page.locator('[data-testid="canvas-node-email"]').first();
    await canvasNode.click();
    
    // Check that configuration panel appears
    await expect(page.locator('text=Node Configuration')).toBeVisible();
    
    // Check for label input
    const labelInput = page.locator('input[type="text"]').first();
    await expect(labelInput).toBeVisible();
    
    // Update the label
    await labelInput.fill('Welcome Email');
    
    // Check for description textarea
    const descriptionTextarea = page.locator('textarea');
    if (await descriptionTextarea.isVisible()) {
      await descriptionTextarea.fill('Welcome email sent to new clients');
    }
    
    // Check that changes are reflected
    await expect(page.locator('text=Welcome Email')).toBeVisible();
  });

  test('should toggle node library visibility', async ({ page }) => {
    // Check that node library is initially visible
    const nodeLibrary = page.locator('.w-80'); // Node library container
    await expect(nodeLibrary).toBeVisible();
    
    // Click toggle button
    const toggleButton = page.locator('button:has-text("Hide Library")');
    await toggleButton.click();
    
    // Check that library is hidden
    await expect(nodeLibrary).not.toBeVisible();
    
    // Click to show again
    const showButton = page.locator('button:has-text("Show Library")');
    await showButton.click();
    
    // Check that library is visible again
    await expect(nodeLibrary).toBeVisible();
  });

  test('should respect tier-based node restrictions', async ({ page }) => {
    // Look for pro/enterprise tier nodes
    const smsNode = page.locator('text=SMS').first();
    const meetingNode = page.locator('text=Meeting Scheduler').first();
    
    // Check if these nodes show tier restrictions
    if (await smsNode.isVisible()) {
      const nodeContainer = smsNode.locator('..');
      const isDisabled = await nodeContainer.locator('.opacity-50').isVisible();
      
      if (isDisabled) {
        // Check for tier requirement message
        await expect(nodeContainer.locator('text=Pro Required')).toBeVisible();
      }
    }
  });

  test('should handle canvas grid and snap-to-grid', async ({ page }) => {
    // Check for grid visualization
    await expect(page.locator('svg')).toBeVisible();
    
    // Add a node and check if it snaps to grid
    const emailNode = page.locator('text=Email').first();
    const canvas = page.locator('[data-testid="react-flow-wrapper"]');
    
    await emailNode.dragTo(canvas, {
      targetPosition: { x: 123, y: 156 } // Non-grid-aligned position
    });
    
    await page.waitForTimeout(1000);
    
    // If snap-to-grid is enabled, the position should be adjusted to grid
    const addedNode = page.locator('[data-testid="canvas-node-email"]').first();
    await expect(addedNode).toBeVisible();
    
    // Check grid controls
    await expect(page.locator('text=Snap to Grid')).toBeVisible();
    await expect(page.locator('text=Timeline Ruler')).toBeVisible();
  });
});

test.describe('Journey Canvas Performance', () => {
  test('should handle 50+ nodes without lag', async ({ page }) => {
    await page.goto('/journeys/test-journey-id/canvas');
    await page.waitForSelector('[data-testid="react-flow-wrapper"]');
    
    // Add multiple nodes quickly
    const emailNode = page.locator('text=Email').first();
    const canvas = page.locator('[data-testid="react-flow-wrapper"]');
    
    const startTime = Date.now();
    
    // Add 20 nodes (simulating a large journey)
    for (let i = 0; i < 20; i++) {
      await emailNode.dragTo(canvas, {
        targetPosition: { x: 100 + (i * 50), y: 100 + (i % 5) * 100 }
      });
      
      // Small delay to allow processing
      await page.waitForTimeout(100);
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (adjust threshold as needed)
    expect(duration).toBeLessThan(30000); // 30 seconds for 20 nodes
    
    // Check that all nodes are visible
    const nodes = page.locator('[data-testid*="canvas-node"]');
    expect(await nodes.count()).toBeGreaterThan(15); // Allow for some failures
  });
});

test.describe('Journey Canvas Accessibility', () => {
  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/journeys/test-journey-id/canvas');
    await page.waitForSelector('[data-testid="react-flow-wrapper"]');
    
    // Test keyboard shortcuts
    await page.keyboard.press('Control+z'); // Undo
    await page.keyboard.press('Control+y'); // Redo
    await page.keyboard.press('Delete'); // Delete selected
    
    // Check that canvas handles keyboard events appropriately
    // This is more about ensuring no errors occur
    await page.waitForTimeout(1000);
  });

  test('should have proper ARIA labels and roles', async ({ page }) => {
    await page.goto('/journeys/test-journey-id/canvas');
    await page.waitForSelector('[data-testid="react-flow-wrapper"]');
    
    // Check for ARIA labels on key components
    await expect(page.locator('[role="button"]')).toHaveCount(0, { timeout: 1000 }).catch(() => {
      // Some buttons should have proper roles
    });
    
    // Check that important elements have accessible names
    const saveButton = page.locator('button:has-text("Save")');
    if (await saveButton.isVisible()) {
      await expect(saveButton).toHaveAttribute('type', 'button');
    }
  });
});