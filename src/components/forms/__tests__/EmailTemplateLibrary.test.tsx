import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import { EmailTemplateLibrary } from '../EmailTemplateLibrary'
import { getEmailTemplates, bulkUpdateTemplates } from '@/app/actions/email-templates'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/app/actions/email-templates', () => ({
  getEmailTemplates: jest.fn(),
  createEmailTemplate: jest.fn(),
  updateEmailTemplate: jest.fn(),
  deleteEmailTemplate: jest.fn(),
  bulkUpdateTemplates: jest.fn(),
}))
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
// Mock templates data
const mockTemplates = [
  {
    id: '1',
    name: 'Welcome Email',
    subject: 'Welcome to WedSync!',
    content: '<p>Welcome to our platform</p>',
    category: 'welcome' as const,
    status: 'active' as const,
    created_at: '2025-01-15T10:00:00Z',
    updated_at: '2025-01-15T10:00:00Z',
    usage_count: 5,
    is_favorite: false,
    variables: ['client_name'],
    metadata: {
      author_name: 'John Doe',
      description: 'Welcome email template',
    },
    id: '2',
    name: 'Payment Reminder',
    subject: 'Payment Due Soon',
    content: '<p>Your payment is due</p>',
    category: 'payment_reminder' as const,
    status: 'draft' as const,
    created_at: '2025-01-14T10:00:00Z',
    updated_at: '2025-01-14T10:00:00Z',
    usage_count: 2,
    is_favorite: true,
    variables: ['amount', 'due_date'],
      author_name: 'Jane Smith',
]
const mockGetEmailTemplates = getEmailTemplates as jest.MockedFunction<typeof getEmailTemplates>
const mockBulkUpdateTemplates = bulkUpdateTemplates as jest.MockedFunction<typeof bulkUpdateTemplates>
describe('EmailTemplateLibrary', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetEmailTemplates.mockResolvedValue({
      templates: mockTemplates,
      totalPages: 1,
      totalCount: 2,
    })
  })
  describe('Component Rendering', () => {
    it('renders the main interface elements', async () => {
      render(<EmailTemplateLibrary />)
      expect(screen.getByRole('heading', { name: /email templates/i })).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/search templates/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /filters/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /new template/i })).toBeInTheDocument()
    it('displays templates after loading', async () => {
      await waitFor(() => {
        expect(screen.getByText('Welcome Email')).toBeInTheDocument()
        expect(screen.getByText('Payment Reminder')).toBeInTheDocument()
      })
    it('shows loading state initially', () => {
      expect(screen.getByRole('status', { name: /loading/i })).toBeInTheDocument()
  describe('Search Functionality', () => {
    it('updates search filter when typing', async () => {
      const user = userEvent.setup()
      const searchInput = screen.getByPlaceholderText(/search templates/i)
      await user.type(searchInput, 'welcome')
        expect(mockGetEmailTemplates).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'welcome',
          })
        )
    it('calls getEmailTemplates with search term', async () => {
      await user.type(searchInput, 'payment')
            search: 'payment',
  describe('View Mode Toggle', () => {
    it('toggles between grid and list view', async () => {
        expect(screen.getByTestId('template-grid-view')).toBeInTheDocument()
      const listButton = screen.getByRole('button', { name: /list view/i })
      await user.click(listButton)
        expect(screen.getByTestId('template-list-view')).toBeInTheDocument()
      const gridButton = screen.getByRole('button', { name: /grid view/i })
      await user.click(gridButton)
  describe('Filters', () => {
    it('toggles filters sidebar', async () => {
      const filtersButton = screen.getByRole('button', { name: /filters/i })
      
      // Open filters
      await user.click(filtersButton)
        expect(screen.getByTestId('filters-sidebar')).toBeInTheDocument()
      // Close filters
        expect(screen.queryByTestId('filters-sidebar')).not.toBeInTheDocument()
  describe('Template Selection', () => {
    it('selects templates for bulk operations', async () => {
      const checkboxes = screen.getAllByRole('checkbox')
      await user.click(checkboxes[0])
        expect(screen.getByTestId('bulk-actions-bar')).toBeInTheDocument()
        expect(screen.getByText('1 selected')).toBeInTheDocument()
    it('shows bulk actions when templates selected', async () => {
      await user.click(checkboxes[1])
        expect(screen.getByText('2 selected')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument()
  describe('Bulk Operations', () => {
    it('performs bulk activate operation', async () => {
      mockBulkUpdateTemplates.mockResolvedValue()
      // Select templates
      // Click activate
      const activateButton = screen.getByRole('button', { name: /activate/i })
      await user.click(activateButton)
        expect(mockBulkUpdateTemplates).toHaveBeenCalledWith({
          type: 'activate',
          templateIds: ['1'],
        })
        expect(toast.success).toHaveBeenCalledWith(
          expect.stringContaining('Successfully activate')
    it('handles bulk operation errors', async () => {
      mockBulkUpdateTemplates.mockRejectedValue(new Error('Network error'))
      // Select and try to activate
        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to activate')
  describe('Template Editor Modal', () => {
    it('opens editor for new template', async () => {
      const newTemplateButton = screen.getByRole('button', { name: /new template/i })
      await user.click(newTemplateButton)
        expect(screen.getByTestId('template-editor-modal')).toBeInTheDocument()
    it('opens editor for existing template', async () => {
      // Click on a template card to edit it
      const templateCard = screen.getByText('Welcome Email').closest('[data-testid="template-card"]')
      expect(templateCard).toBeInTheDocument()
      await user.click(templateCard!)
  describe('Error Handling', () => {
    it('displays error message when loading fails', async () => {
      mockGetEmailTemplates.mockRejectedValue(new Error('Failed to load'))
        expect(screen.getByText(/failed to load templates/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument()
    it('retries loading when try again is clicked', async () => {
      mockGetEmailTemplates
        .mockRejectedValueOnce(new Error('Failed to load'))
        .mockResolvedValue({
          templates: mockTemplates,
          totalPages: 1,
          totalCount: 2,
      const retryButton = screen.getByRole('button', { name: /try again/i })
      await user.click(retryButton)
  describe('Empty State', () => {
    it('shows empty state when no templates found', async () => {
      mockGetEmailTemplates.mockResolvedValue({
        templates: [],
        totalPages: 0,
        totalCount: 0,
        expect(screen.getByText('No templates found')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /create your first template/i })).toBeInTheDocument()
  describe('Pagination', () => {
    it('displays pagination when multiple pages exist', async () => {
        templates: mockTemplates,
        totalPages: 3,
        totalCount: 50,
        expect(screen.getByText('Page 1 of 3')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument()
    it('navigates to next page', async () => {
      const nextButton = screen.getByRole('button', { name: /next/i })
      await user.click(nextButton)
            page: 2,
  describe('Selection Mode', () => {
    it('calls onSelectTemplate in selection mode', async () => {
      const mockOnSelect = jest.fn()
      render(<EmailTemplateLibrary onSelectTemplate={mockOnSelect} selectionMode />)
      expect(mockOnSelect).toHaveBeenCalledWith(mockTemplates[0])
  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', async () => {
      expect(screen.getByRole('searchbox')).toBeInTheDocument()
    it('supports keyboard navigation', async () => {
      // Tab to search input
      await user.tab()
      expect(screen.getByPlaceholderText(/search templates/i)).toHaveFocus()
      // Continue tabbing through interface
      expect(screen.getByRole('button', { name: /grid view/i })).toHaveFocus()
})
