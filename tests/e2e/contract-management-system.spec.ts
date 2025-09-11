import { test, expect } from '@playwright/test'
import { setupTestDatabase, cleanupTestDatabase } from '../helpers/database-setup'
import { createTestUser, loginTestUser } from '../helpers/auth-helpers'

test.describe('Contract Management System', () => {
  let testUser: any
  let testOrganization: any
  let testClient: any
  let testSupplier: any

  test.beforeAll(async () => {
    // Set up test data
    const testData = await setupTestDatabase()
    testUser = testData.user
    testOrganization = testData.organization
    testClient = testData.client
    testSupplier = testData.supplier
  })

  test.afterAll(async () => {
    await cleanupTestDatabase()
  })

  test.beforeEach(async ({ page }) => {
    await loginTestUser(page, testUser)
  })

  test.describe('Contract CRUD Operations', () => {
    test('should create a new contract successfully', async ({ page }) => {
      // Navigate to contracts page
      await page.goto('/dashboard/contracts')
      await expect(page.getByTestId('page-title')).toContainText('Contracts')

      // Click create contract button
      await page.getByTestId('create-contract-btn').click()
      await expect(page.getByTestId('contract-form-modal')).toBeVisible()

      // Fill contract form
      await page.getByTestId('contract-title').fill('Wedding Photography Contract')
      await page.getByTestId('contract-description').fill('Professional wedding photography services')
      
      // Select client
      await page.getByTestId('client-select').click()
      await page.getByTestId(`client-option-${testClient.id}`).click()

      // Select supplier
      await page.getByTestId('supplier-select').click()
      await page.getByTestId(`supplier-option-${testSupplier.id}`).click()

      // Select contract category
      await page.getByTestId('category-select').click()
      await page.getByTestId('category-option-photography').click()

      // Fill contract details
      await page.getByTestId('contract-type-select').selectOption('vendor_service')
      await page.getByTestId('total-amount').fill('2500.00')
      await page.getByTestId('deposit-amount').fill('500.00')
      await page.getByTestId('deposit-percentage').fill('20')

      // Set dates
      await page.getByTestId('contract-date').fill('2025-01-15')
      await page.getByTestId('service-start-date').fill('2025-06-15')
      await page.getByTestId('service-end-date').fill('2025-06-15')

      // Accept terms
      await page.getByTestId('privacy-policy-checkbox').check()
      await page.getByTestId('gdpr-consent-checkbox').check()

      // Submit form
      await page.getByTestId('submit-contract-btn').click()

      // Verify success
      await expect(page.getByTestId('success-message')).toContainText('Contract created successfully')
      await expect(page.getByTestId('contract-list')).toContainText('Wedding Photography Contract')
    })

    test('should display contract validation errors', async ({ page }) => {
      await page.goto('/dashboard/contracts')
      await page.getByTestId('create-contract-btn').click()

      // Submit form without required fields
      await page.getByTestId('submit-contract-btn').click()

      // Check for validation errors
      await expect(page.getByTestId('title-error')).toContainText('Title is required')
      await expect(page.getByTestId('client-error')).toContainText('Client is required')
      await expect(page.getByTestId('amount-error')).toContainText('Total amount is required')
    })

    test('should edit an existing contract', async ({ page }) => {
      // Create a contract first via API
      const contractResponse = await page.request.post('/api/contracts', {
        data: {
          client_id: testClient.id,
          supplier_id: testSupplier.id,
          category_id: 'photography-category-id',
          title: 'Original Contract Title',
          contract_type: 'vendor_service',
          total_amount: 2000.00,
          contract_date: '2025-01-15T00:00:00.000Z'
        }
      })
      const contract = await contractResponse.json()

      await page.goto('/dashboard/contracts')
      
      // Find and edit the contract
      await page.getByTestId(`contract-${contract.contract.id}-edit-btn`).click()
      await expect(page.getByTestId('edit-contract-modal')).toBeVisible()

      // Update title
      await page.getByTestId('contract-title').fill('Updated Contract Title')
      await page.getByTestId('total-amount').fill('2250.00')

      await page.getByTestId('update-contract-btn').click()

      // Verify update
      await expect(page.getByTestId('success-message')).toContainText('Contract updated successfully')
      await expect(page.getByTestId('contract-list')).toContainText('Updated Contract Title')
    })
  })

  test.describe('Payment Milestones', () => {
    let testContract: any

    test.beforeEach(async ({ page }) => {
      // Create test contract
      const contractResponse = await page.request.post('/api/contracts', {
        data: {
          client_id: testClient.id,
          supplier_id: testSupplier.id,
          category_id: 'photography-category-id',
          title: 'Test Contract for Milestones',
          contract_type: 'vendor_service',
          total_amount: 3000.00,
          deposit_amount: 600.00,
          contract_date: '2025-01-15T00:00:00.000Z'
        }
      })
      testContract = (await contractResponse.json()).contract
    })

    test('should display default milestones after contract creation', async ({ page }) => {
      await page.goto(`/dashboard/contracts/${testContract.id}`)
      
      // Check milestones tab
      await page.getByTestId('milestones-tab').click()
      
      // Verify default milestones were created
      await expect(page.getByTestId('milestone-list')).toContainText('Deposit Payment')
      await expect(page.getByTestId('milestone-list')).toContainText('Final Payment')
      
      // Verify deposit milestone amount
      await expect(page.getByTestId('milestone-deposit-amount')).toContainText('£600.00')
      await expect(page.getByTestId('milestone-final-amount')).toContainText('£2,400.00')
    })

    test('should create a custom milestone', async ({ page }) => {
      await page.goto(`/dashboard/contracts/${testContract.id}`)
      await page.getByTestId('milestones-tab').click()

      // Add new milestone
      await page.getByTestId('add-milestone-btn').click()
      await expect(page.getByTestId('milestone-form-modal')).toBeVisible()

      await page.getByTestId('milestone-name').fill('Progress Payment')
      await page.getByTestId('milestone-amount').fill('900.00')
      await page.getByTestId('milestone-type').selectOption('progress_payment')
      await page.getByTestId('sequence-order').fill('2')
      await page.getByTestId('due-date').fill('2025-04-15')

      await page.getByTestId('create-milestone-btn').click()

      // Verify milestone created
      await expect(page.getByTestId('success-message')).toContainText('Milestone created successfully')
      await expect(page.getByTestId('milestone-list')).toContainText('Progress Payment')
    })

    test('should mark milestone as paid', async ({ page }) => {
      await page.goto(`/dashboard/contracts/${testContract.id}`)
      await page.getByTestId('milestones-tab').click()

      // Mark deposit as paid
      await page.getByTestId('milestone-deposit-status-btn').click()
      await page.getByTestId('mark-paid-option').click()

      // Fill payment details
      await expect(page.getByTestId('payment-form-modal')).toBeVisible()
      await page.getByTestId('paid-amount').fill('600.00')
      await page.getByTestId('payment-reference').fill('PAY-001')
      await page.getByTestId('payment-method').selectOption('bank_transfer')
      await page.getByTestId('paid-date').fill('2025-01-20')

      await page.getByTestId('confirm-payment-btn').click()

      // Verify payment recorded
      await expect(page.getByTestId('success-message')).toContainText('Payment recorded successfully')
      await expect(page.getByTestId('milestone-deposit-status')).toContainText('Paid')
      await expect(page.getByTestId('milestone-deposit-badge')).toHaveClass(/bg-green/)
    })

    test('should prevent overpayment of milestone', async ({ page }) => {
      await page.goto(`/dashboard/contracts/${testContract.id}`)
      await page.getByTestId('milestones-tab').click()

      await page.getByTestId('milestone-deposit-status-btn').click()
      await page.getByTestId('mark-paid-option').click()

      // Try to overpay
      await page.getByTestId('paid-amount').fill('800.00') // More than milestone amount
      await page.getByTestId('confirm-payment-btn').click()

      // Verify error
      await expect(page.getByTestId('error-message')).toContainText('Paid amount cannot exceed milestone amount')
    })
  })

  test.describe('Vendor Deliverables', () => {
    let testContract: any

    test.beforeEach(async ({ page }) => {
      const contractResponse = await page.request.post('/api/contracts', {
        data: {
          client_id: testClient.id,
          supplier_id: testSupplier.id,
          category_id: 'photography-category-id',
          title: 'Test Contract for Deliverables',
          contract_type: 'vendor_service',
          total_amount: 2500.00,
          contract_date: '2025-01-15T00:00:00.000Z',
          service_start_date: '2025-06-15T00:00:00.000Z'
        }
      })
      testContract = (await contractResponse.json()).contract
    })

    test('should create a deliverable', async ({ page }) => {
      await page.goto(`/dashboard/contracts/${testContract.id}`)
      await page.getByTestId('deliverables-tab').click()

      await page.getByTestId('add-deliverable-btn').click()
      await expect(page.getByTestId('deliverable-form-modal')).toBeVisible()

      // Fill deliverable form
      await page.getByTestId('deliverable-name').fill('Wedding Album Design')
      await page.getByTestId('deliverable-description').fill('Create custom wedding photo album')
      await page.getByTestId('deliverable-type').selectOption('document')
      await page.getByTestId('priority').selectOption('high')
      await page.getByTestId('due-date').fill('2025-06-01')
      await page.getByTestId('estimated-hours').fill('8')

      await page.getByTestId('create-deliverable-btn').click()

      // Verify creation
      await expect(page.getByTestId('success-message')).toContainText('Deliverable created successfully')
      await expect(page.getByTestId('deliverable-list')).toContainText('Wedding Album Design')
    })

    test('should update deliverable progress', async ({ page }) => {
      // Create deliverable first
      const deliverableResponse = await page.request.post(`/api/contracts/${testContract.id}/deliverables`, {
        data: {
          deliverable_name: 'Test Deliverable',
          deliverable_type: 'document',
          due_date: '2025-06-01T00:00:00.000Z',
          priority: 'medium'
        }
      })
      const deliverable = (await deliverableResponse.json()).deliverable

      await page.goto(`/dashboard/contracts/${testContract.id}`)
      await page.getByTestId('deliverables-tab').click()

      // Update progress
      await page.getByTestId(`deliverable-${deliverable.id}-progress-btn`).click()
      await page.getByTestId('progress-slider').fill('75')
      await page.getByTestId('status-select').selectOption('in_progress')
      await page.getByTestId('update-progress-btn').click()

      // Verify update
      await expect(page.getByTestId('success-message')).toContainText('Deliverable updated successfully')
      await expect(page.getByTestId(`deliverable-${deliverable.id}-progress`)).toContainText('75%')
      await expect(page.getByTestId(`deliverable-${deliverable.id}-status`)).toContainText('In Progress')
    })

    test('should mark deliverable as completed', async ({ page }) => {
      const deliverableResponse = await page.request.post(`/api/contracts/${testContract.id}/deliverables`, {
        data: {
          deliverable_name: 'Complete This Task',
          deliverable_type: 'service',
          due_date: '2025-06-01T00:00:00.000Z',
          priority: 'high'
        }
      })
      const deliverable = (await deliverableResponse.json()).deliverable

      await page.goto(`/dashboard/contracts/${testContract.id}`)
      await page.getByTestId('deliverables-tab').click()

      // Mark as completed
      await page.getByTestId(`deliverable-${deliverable.id}-actions-btn`).click()
      await page.getByTestId('mark-completed-option').click()

      // Fill completion form
      await page.getByTestId('completion-notes').fill('Task completed successfully')
      await page.getByTestId('quality-score').selectOption('5')
      await page.getByTestId('confirm-completion-btn').click()

      // Verify completion
      await expect(page.getByTestId('success-message')).toContainText('Deliverable marked as completed')
      await expect(page.getByTestId(`deliverable-${deliverable.id}-status`)).toContainText('Completed')
      await expect(page.getByTestId(`deliverable-${deliverable.id}-progress`)).toContainText('100%')
    })

    test('should filter deliverables by status', async ({ page }) => {
      await page.goto(`/dashboard/contracts/${testContract.id}`)
      await page.getByTestId('deliverables-tab').click()

      // Apply status filter
      await page.getByTestId('status-filter').selectOption('pending')
      
      // Verify filter applied
      await expect(page.getByTestId('filtered-results-count')).toBeVisible()
      
      // Clear filter
      await page.getByTestId('clear-filters-btn').click()
      await expect(page.getByTestId('status-filter')).toHaveValue('')
    })
  })

  test.describe('Contract Upload', () => {
    let testContract: any

    test.beforeEach(async ({ page }) => {
      const contractResponse = await page.request.post('/api/contracts', {
        data: {
          client_id: testClient.id,
          supplier_id: testSupplier.id,
          category_id: 'photography-category-id',
          title: 'Test Contract for Upload',
          contract_type: 'vendor_service',
          total_amount: 2500.00,
          contract_date: '2025-01-15T00:00:00.000Z'
        }
      })
      testContract = (await contractResponse.json()).contract
    })

    test('should upload contract document successfully', async ({ page }) => {
      await page.goto(`/dashboard/contracts/${testContract.id}`)
      await page.getByTestId('documents-tab').click()

      // Upload original contract
      await page.getByTestId('upload-contract-btn').click()
      await expect(page.getByTestId('upload-modal')).toBeVisible()

      // Select document type
      await page.getByTestId('document-type').selectOption('original')
      await page.getByTestId('document-title').fill('Wedding Photography Contract - Original')
      await page.getByTestId('security-level').selectOption('standard')

      // Upload file (mock PDF file)
      const fileInput = page.getByTestId('file-input')
      await fileInput.setInputFiles({
        name: 'contract.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('Mock PDF content')
      })

      await page.getByTestId('upload-btn').click()

      // Verify upload
      await expect(page.getByTestId('success-message')).toContainText('Contract uploaded successfully')
      await expect(page.getByTestId('document-list')).toContainText('Wedding Photography Contract - Original')
    })

    test('should reject non-PDF files', async ({ page }) => {
      await page.goto(`/dashboard/contracts/${testContract.id}`)
      await page.getByTestId('documents-tab').click()

      await page.getByTestId('upload-contract-btn').click()
      await page.getByTestId('document-type').selectOption('original')
      await page.getByTestId('document-title').fill('Invalid Document')

      // Try to upload non-PDF file
      const fileInput = page.getByTestId('file-input')
      await fileInput.setInputFiles({
        name: 'document.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: Buffer.from('Mock Word document')
      })

      await page.getByTestId('upload-btn').click()

      // Verify error
      await expect(page.getByTestId('error-message')).toContainText('Only PDF files are allowed')
    })
  })

  test.describe('Contract Analytics Dashboard', () => {
    test('should display contract statistics', async ({ page }) => {
      await page.goto('/dashboard/contracts')

      // Check dashboard stats
      await expect(page.getByTestId('total-contracts-stat')).toBeVisible()
      await expect(page.getByTestId('active-contracts-stat')).toBeVisible()
      await expect(page.getByTestId('pending-payments-stat')).toBeVisible()
      await expect(page.getByTestId('overdue-deliverables-stat')).toBeVisible()

      // Verify stats have numeric values
      await expect(page.getByTestId('total-contracts-value')).toMatch(/\d+/)
      await expect(page.getByTestId('active-contracts-value')).toMatch(/\d+/)
    })

    test('should filter contracts by various criteria', async ({ page }) => {
      await page.goto('/dashboard/contracts')

      // Test status filter
      await page.getByTestId('status-filter').selectOption('active')
      await expect(page.url()).toContain('status=active')

      // Test client filter
      await page.getByTestId('client-filter').selectOption(testClient.id)
      await expect(page.url()).toContain(`client_id=${testClient.id}`)

      // Test search
      await page.getByTestId('search-input').fill('photography')
      await page.getByTestId('search-btn').click()
      await expect(page.url()).toContain('search=photography')

      // Clear all filters
      await page.getByTestId('clear-all-filters-btn').click()
      await expect(page.url()).not.toContain('status=')
      await expect(page.url()).not.toContain('client_id=')
      await expect(page.url()).not.toContain('search=')
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test('should be mobile-friendly', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/dashboard/contracts')

      // Check mobile navigation
      await expect(page.getByTestId('mobile-menu-btn')).toBeVisible()
      await page.getByTestId('mobile-menu-btn').click()
      await expect(page.getByTestId('mobile-nav-menu')).toBeVisible()

      // Check responsive contract cards
      await expect(page.getByTestId('contract-card')).toBeVisible()
      
      // Verify buttons are touch-friendly
      const createBtn = page.getByTestId('create-contract-btn')
      await expect(createBtn).toBeVisible()
      
      // Check minimum touch target size (44px)
      const btnBox = await createBtn.boundingBox()
      expect(btnBox?.height).toBeGreaterThanOrEqual(44)
    })
  })

  test.describe('Accessibility', () => {
    test('should meet basic accessibility standards', async ({ page }) => {
      await page.goto('/dashboard/contracts')

      // Check for proper headings hierarchy
      await expect(page.locator('h1')).toHaveCount(1)
      
      // Check form labels
      await page.getByTestId('create-contract-btn').click()
      await expect(page.getByLabel('Contract Title')).toBeVisible()
      await expect(page.getByLabel('Total Amount')).toBeVisible()

      // Check ARIA attributes
      await expect(page.getByTestId('contract-form-modal')).toHaveAttribute('role', 'dialog')
      await expect(page.getByTestId('status-filter')).toHaveAttribute('aria-label')

      // Check keyboard navigation
      await page.keyboard.press('Tab')
      await expect(page.locator(':focus')).toBeVisible()
    })
  })
})