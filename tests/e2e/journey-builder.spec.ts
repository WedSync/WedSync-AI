import { test, expect } from '@playwright/test'

test.describe('Journey Builder E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/journeys')
  })

  test('Create journey from scratch → Save → Execute', async ({ page }) => {
    await page.click('text=New Journey')
    await page.waitForURL('**/journeys/new')

    await page.fill('input[name="name"]', 'Test Journey E2E')
    await page.fill('textarea[name="description"]', 'E2E test journey creation')
    
    const canvas = page.locator('.journey-canvas')
    await expect(canvas).toBeVisible()

    await page.dragAndDrop('[data-node-type="email"]', '.journey-canvas')
    
    await page.click('[data-node-id]')
    await page.fill('input[name="emailSubject"]', 'Welcome Email')
    await page.fill('textarea[name="emailBody"]', 'Welcome to our platform!')
    
    await page.click('button:has-text("Save Journey")')
    await expect(page.locator('text=Journey saved successfully')).toBeVisible()

    await page.click('button:has-text("Execute")')
    await expect(page.locator('text=Journey execution started')).toBeVisible()
  })

  test('Load template → Customize → Save as new', async ({ page }) => {
    await page.goto('/journeys/new')
    
    await page.click('button:has-text("Use Template")')
    await page.click('[data-template="welcome-series"]')
    
    await expect(page.locator('.journey-canvas')).toContainText('Welcome Series')
    
    await page.fill('input[name="name"]', 'Customized Welcome Series')
    
    const emailNode = page.locator('[data-node-type="email"]').first()
    await emailNode.click()
    await page.fill('input[name="emailSubject"]', 'Custom Welcome')
    
    await page.click('button:has-text("Save as New")')
    await expect(page.locator('text=Journey created successfully')).toBeVisible()
  })

  test('Execute journey with email node → Verify send', async ({ page }) => {
    await page.goto('/journeys/new')
    
    await page.fill('input[name="name"]', 'Email Test Journey')
    
    await page.dragAndDrop('[data-node-type="trigger"]', '.journey-canvas')
    await page.dragAndDrop('[data-node-type="email"]', '.journey-canvas')
    await page.dragAndDrop('[data-node-type="end"]', '.journey-canvas')
    
    const emailNode = page.locator('[data-node-type="email"]')
    await emailNode.click()
    await page.fill('input[name="emailTo"]', 'test@example.com')
    await page.fill('input[name="emailSubject"]', 'Test Email')
    await page.fill('textarea[name="emailBody"]', 'Test email content')
    
    await page.click('button:has-text("Save Journey")')
    await page.click('button:has-text("Execute")')
    
    await page.waitForSelector('text=Email sent successfully', { timeout: 10000 })
    
    const executionLog = page.locator('.execution-log')
    await expect(executionLog).toContainText('Email sent to test@example.com')
  })

  test('Execute journey with condition → Verify branching', async ({ page }) => {
    await page.goto('/journeys/new')
    
    await page.fill('input[name="name"]', 'Conditional Journey')
    
    await page.dragAndDrop('[data-node-type="trigger"]', '.journey-canvas')
    await page.dragAndDrop('[data-node-type="condition"]', '.journey-canvas')
    await page.dragAndDrop('[data-node-type="email"]', '.journey-canvas', { targetPosition: { x: 200, y: 300 } })
    await page.dragAndDrop('[data-node-type="sms"]', '.journey-canvas', { targetPosition: { x: 200, y: 400 } })
    
    const conditionNode = page.locator('[data-node-type="condition"]')
    await conditionNode.click()
    await page.selectOption('select[name="conditionField"]', 'preferredChannel')
    await page.selectOption('select[name="conditionOperator"]', 'equals')
    await page.fill('input[name="conditionValue"]', 'email')
    
    await page.click('button:has-text("Save Journey")')
    await page.click('button:has-text("Execute")')
    
    await page.waitForSelector('.execution-path')
    const executionPath = page.locator('.execution-path')
    await expect(executionPath).toContainText('Condition evaluated: true')
    await expect(executionPath).toContainText('Email branch executed')
  })

  test('Pause journey → Resume → Verify state', async ({ page }) => {
    await page.goto('/journeys')
    
    const activeJourney = page.locator('[data-journey-status="active"]').first()
    await activeJourney.click()
    
    await page.click('button:has-text("Pause")')
    await expect(page.locator('[data-status="paused"]')).toBeVisible()
    
    const pausedState = await page.locator('.journey-state').textContent()
    
    await page.waitForTimeout(2000)
    
    await page.click('button:has-text("Resume")')
    await expect(page.locator('[data-status="active"]')).toBeVisible()
    
    const resumedState = await page.locator('.journey-state').textContent()
    expect(resumedState).toBe(pausedState)
  })

  test('Delete journey → Verify cleanup', async ({ page }) => {
    await page.goto('/journeys/new')
    
    const journeyName = `Delete Test ${Date.now()}`
    await page.fill('input[name="name"]', journeyName)
    await page.click('button:has-text("Save Journey")')
    
    await page.goto('/journeys')
    
    const journeyRow = page.locator(`tr:has-text("${journeyName}")`)
    await expect(journeyRow).toBeVisible()
    
    await journeyRow.locator('button[aria-label="Delete"]').click()
    
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toContainText('Are you sure')
    await dialog.locator('button:has-text("Delete")').click()
    
    await expect(page.locator('text=Journey deleted successfully')).toBeVisible()
    
    await page.reload()
    await expect(page.locator(`tr:has-text("${journeyName}")`)).not.toBeVisible()
    
    const response = await page.request.get(`/api/journeys?name=${journeyName}`)
    const data = await response.json()
    expect(data.journeys).toHaveLength(0)
  })

  test('Journey Builder performance - 50 nodes', async ({ page }) => {
    await page.goto('/journeys/new')
    
    const startTime = Date.now()
    
    for (let i = 0; i < 50; i++) {
      const nodeType = ['email', 'sms', 'condition', 'delay'][i % 4]
      await page.dragAndDrop(`[data-node-type="${nodeType}"]`, '.journey-canvas', {
        targetPosition: { x: (i % 10) * 100, y: Math.floor(i / 10) * 100 }
      })
    }
    
    const renderTime = Date.now() - startTime
    expect(renderTime).toBeLessThan(5000)
    
    const saveStart = Date.now()
    await page.click('button:has-text("Save Journey")')
    await page.waitForSelector('text=Journey saved successfully')
    const saveTime = Date.now() - saveStart
    expect(saveTime).toBeLessThan(500)
  })

  test('Mobile responsiveness', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/journeys')
    await expect(page.locator('.journey-list')).toBeVisible()
    
    await page.click('button[aria-label="Menu"]')
    await page.click('text=New Journey')
    
    await page.waitForURL('**/journeys/new')
    await expect(page.locator('.journey-canvas')).toBeVisible()
    
    const nodePalette = page.locator('.node-palette')
    await expect(nodePalette).toHaveCSS('position', 'fixed')
    
    await page.dragAndDrop('[data-node-type="email"]', '.journey-canvas')
    await expect(page.locator('[data-node-type="email"]')).toBeVisible()
  })

  test('Error handling and user feedback', async ({ page }) => {
    await page.route('/api/journeys', route => {
      route.fulfill({ status: 500, body: 'Internal Server Error' })
    })
    
    await page.goto('/journeys/new')
    await page.fill('input[name="name"]', 'Error Test Journey')
    await page.click('button:has-text("Save Journey")')
    
    await expect(page.locator('text=Failed to save journey')).toBeVisible()
    await expect(page.locator('.error-message')).toContainText('Please try again')
  })

  test('Template loading and customization', async ({ page }) => {
    await page.goto('/journeys/new')
    
    await page.click('button:has-text("Templates")')
    
    const templates = ['Welcome Series', 'Lead Nurture', 'Event Follow-up', 'Customer Onboarding', 'Re-engagement']
    for (const template of templates) {
      await expect(page.locator(`text=${template}`)).toBeVisible()
    }
    
    await page.click('[data-template="welcome-series"]')
    
    await expect(page.locator('[data-node-type="trigger"]')).toBeVisible()
    await expect(page.locator('[data-node-type="email"]')).toHaveCount(3)
    await expect(page.locator('[data-node-type="delay"]')).toHaveCount(2)
    await expect(page.locator('[data-node-type="end"]')).toBeVisible()
  })
})