import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import { TransactionEntry } from '@/components/wedme/budget/TransactionEntry'

// Mock fetch globally
global.fetch = jest.fn()
// Mock file reader
const mockFileReader = {
  readAsDataURL: jest.fn(),
  onload: null as any,
  result: 'data:image/jpeg;base64,mock-image-data'
}
global.FileReader = jest.fn(() => mockFileReader) as any
const mockCategories = [
  {
    id: '1',
    name: 'Venue',
    color: '#9E77ED'
  },
    id: '2', 
    name: 'Catering',
    color: '#2E90FA'
    id: '3',
    name: 'Photography',
    color: '#12B76A'
  }
]
const defaultProps = {
  clientId: 'client-123',
  categories: mockCategories,
  onTransactionAdded: jest.fn(),
  onClose: jest.fn()
describe('TransactionEntry', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    ;(global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes('/api/budget/transactions')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ 
            transaction: { id: 'new-transaction-123' }
          })
        })
      }
      if (url.includes('/api/budget/receipts/process')) {
          json: () => Promise.resolve({
            success: true,
            data: {
              total_amount: 150,
              vendor_name: 'Test Vendor',
              description: 'Test Receipt',
              date: '2025-01-15'
            }
      return Promise.resolve({ ok: true })
    })
  })
  it('renders form fields correctly', () => {
    render(<TransactionEntry {...defaultProps} />)
    expect(screen.getByText('Add Expense')).toBeInTheDocument()
    expect(screen.getByLabelText(/Amount/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Date/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Category/)).toBeInTheDocument()
    expect(screen.getByLabelText(/Vendor/)).toBeInTheDocument()
    expect(screen.getByText('Receipt')).toBeInTheDocument()
    expect(screen.getByText('Tags')).toBeInTheDocument()
    expect(screen.getByText('Notes')).toBeInTheDocument()
  it('displays category options correctly', () => {
    const categorySelect = screen.getByLabelText(/Category/)
    expect(categorySelect).toBeInTheDocument()
    fireEvent.click(categorySelect)
    expect(screen.getByText('Venue')).toBeInTheDocument()
    expect(screen.getByText('Catering')).toBeInTheDocument()
    expect(screen.getByText('Photography')).toBeInTheDocument()
  it('validates required fields', async () => {
    const user = userEvent.setup()
    // Try to submit empty form
    await user.click(screen.getByText('Add Expense'))
    await waitFor(() => {
      expect(screen.getByText('Amount must be greater than 0')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
      expect(screen.getByText('Category is required')).toBeInTheDocument()
  it('submits valid transaction successfully', async () => {
    // Fill out form
    await user.type(screen.getByLabelText(/Amount/), '150.50')
    await user.type(screen.getByLabelText(/Description/), 'Wedding flowers')
    await user.selectOptions(screen.getByLabelText(/Category/), ['1'])
    await user.type(screen.getByLabelText(/Vendor/), 'Flower Shop')
      expect(fetch).toHaveBeenCalledWith('/api/budget/transactions', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Wedding flowers')
      }))
      expect(defaultProps.onTransactionAdded).toHaveBeenCalled()
  it('shows selected category color', async () => {
      const colorDot = document.querySelector('[style*="background-color: rgb(158, 119, 237)"]')
      expect(colorDot).toBeInTheDocument()
      expect(screen.getByText('Venue')).toBeInTheDocument()
  it('handles receipt upload', async () => {
    const file = new File(['mock receipt'], 'receipt.jpg', { type: 'image/jpeg' })
    const fileInput = screen.getByRole('button', { name: /click to upload receipt/i }).parentElement?.querySelector('input[type="file"]')
    if (fileInput) {
      await user.upload(fileInput, file)
    }
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file)
    // Simulate FileReader onload
    if (mockFileReader.onload) {
      mockFileReader.onload({ target: mockFileReader } as any)
      expect(screen.getByText('receipt.jpg')).toBeInTheDocument()
  it('processes receipt with OCR and auto-fills form', async () => {
      expect(screen.getByText('Processing receipt...')).toBeInTheDocument()
      expect(screen.getByText('Receipt processed! Form has been auto-filled with extracted data.')).toBeInTheDocument()
      expect(screen.getByDisplayValue('150')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Vendor')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Receipt')).toBeInTheDocument()
  it('validates receipt file type and size', async () => {
    // Test invalid file type
    const invalidFile = new File(['content'], 'document.txt', { type: 'text/plain' })
      await user.upload(fileInput, invalidFile)
      expect(screen.getByText('Only images and PDF files are allowed')).toBeInTheDocument()
  it('validates large file size', async () => {
    // Create a mock large file (over 10MB)
    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' })
    Object.defineProperty(largeFile, 'size', {
      value: 11 * 1024 * 1024,
      writable: false
      await user.upload(fileInput, largeFile)
      expect(screen.getByText('File size must be less than 10MB')).toBeInTheDocument()
  it('allows removing uploaded receipt', async () => {
    // Click remove button
    const removeButton = screen.getByRole('button', { name: '' }) // X button
    await user.click(removeButton)
    expect(screen.queryByText('receipt.jpg')).not.toBeInTheDocument()
    expect(screen.getByText('Click to upload receipt')).toBeInTheDocument()
  it('manages tags correctly', async () => {
    // Add a tag
    await user.click(screen.getByText('Add Tag'))
    await user.type(screen.getByPlaceholderText('Tag name'), 'urgent')
    await user.click(screen.getByRole('button', { name: '' })) // Check button
    expect(screen.getByText('urgent')).toBeInTheDocument()
    // Add another tag
    await user.type(screen.getByPlaceholderText('Tag name'), 'deposit')
    await user.keyboard('{Enter}')
    expect(screen.getByText('deposit')).toBeInTheDocument()
    // Remove a tag
    const tagRemoveButtons = screen.getAllByRole('button', { name: '' })
    const urgentTagRemoveButton = tagRemoveButtons.find(btn => 
      btn.closest('span')?.textContent?.includes('urgent')
    )
    if (urgentTagRemoveButton) {
      await user.click(urgentTagRemoveButton)
    expect(screen.queryByText('urgent')).not.toBeInTheDocument()
  it('cancels tag input', async () => {
    await user.type(screen.getByPlaceholderText('Tag name'), 'test')
    // Cancel tag input
    const cancelButton = screen.getAllByRole('button', { name: '' }).find(btn => 
      btn.querySelector('svg') && btn.classList.contains('hover:bg-gray-50')
    if (cancelButton) {
      await user.click(cancelButton)
    expect(screen.queryByPlaceholderText('Tag name')).not.toBeInTheDocument()
    expect(screen.queryByText('test')).not.toBeInTheDocument()
  it('prefills form with provided data', () => {
    const prefillData = {
      amount: 100,
      description: 'Test expense',
      category_id: '1',
      vendor_name: 'Test Vendor',
      date: '2025-01-15',
      notes: 'Test notes',
      tags: ['test', 'prefill']
    render(<TransactionEntry {...defaultProps} prefillData={prefillData} />)
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test expense')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Vendor')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2025-01-15')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument()
    expect(screen.getByText('test')).toBeInTheDocument()
    expect(screen.getByText('prefill')).toBeInTheDocument()
  it('handles form cancellation', async () => {
    await user.click(screen.getByText('Cancel'))
    expect(defaultProps.onClose).toHaveBeenCalled()
  it('handles close button click', async () => {
    const closeButton = screen.getByRole('button', { name: '' })
    await user.click(closeButton)
  it('shows loading state during submission', async () => {
    // Mock slow API response
    ;(global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          json: () => Promise.resolve({ transaction: { id: 'test' } })
        }), 1000)
      )
    // Fill out minimal form
    await user.type(screen.getByLabelText(/Amount/), '100')
    await user.type(screen.getByLabelText(/Description/), 'Test')
    expect(screen.getByText('Adding...')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Adding.../ })).toBeDisabled()
  it('handles API submission errors', async () => {
      Promise.resolve({ ok: false })
      expect(screen.getByText('Failed to create transaction')).toBeInTheDocument()
  it('uploads receipt after transaction creation', async () => {
    ;(global.fetch as jest.Mock).mockImplementation((url: string, options: any) => {
      if (url.includes('/api/budget/transactions') && options?.method === 'POST') {
          json: () => Promise.resolve({ transaction: { id: 'transaction-123' } })
      if (url.includes('/api/budget/receipts') && options?.method === 'POST') {
        return Promise.resolve({ ok: true })
    // Upload receipt first
      expect(fetch).toHaveBeenCalledWith('/api/budget/receipts', expect.objectContaining({
        body: expect.any(FormData)
  it('sets current date by default', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(screen.getByDisplayValue(today)).toBeInTheDocument()
  it('prevents duplicate tags', async () => {
    // Add first tag
    await user.type(screen.getByPlaceholderText('Tag name'), 'duplicate')
    expect(screen.getByText('duplicate')).toBeInTheDocument()
    // Try to add same tag again
    // Should still only have one instance
    const duplicateTags = screen.getAllByText('duplicate')
    expect(duplicateTags).toHaveLength(1)
})
