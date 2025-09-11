import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import { EmailTemplateEditor } from '../EmailTemplateEditor'
import { EmailTemplate, MergeField } from '@/types/email-template-library'
import { createEmailTemplate, updateEmailTemplate } from '@/app/actions/email-templates'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('@/app/actions/email-templates', () => ({
  createEmailTemplate: jest.fn(),
  updateEmailTemplate: jest.fn(),
}))
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(() => ({
    getHTML: () => '<p>Mocked content</p>',
    getText: () => 'Mocked content',
    commands: {
      setContent: jest.fn(),
      focus: jest.fn(),
      insertContent: jest.fn(),
    },
    on: jest.fn(),
    off: jest.fn(),
    destroy: jest.fn(),
  })),
  EditorContent: ({ children }: { children: React.ReactNode }) => <div data-testid="editor-content">{children}</div>,
// Mock template data
const mockTemplate: EmailTemplate = {
  id: '1',
  name: 'Test Template',
  subject: 'Test Subject {{client_name}}',
  content: '<p>Hello {{client_name}}, welcome to WedSync!</p>',
  category: 'welcome',
  status: 'active',
  created_at: '2025-01-15T10:00:00Z',
  updated_at: '2025-01-15T10:00:00Z',
  usage_count: 5,
  is_favorite: false,
  variables: ['client_name', 'wedding_date'],
  metadata: {
    author_name: 'John Doe',
    description: 'Welcome template for new clients',
}
const mockMergeFields: MergeField[] = [
  {
    key: 'client_name',
    label: 'Client Name',
    description: 'Full name of the client',
    type: 'text',
    required: true
    key: 'wedding_date',
    label: 'Wedding Date',
    description: 'Date of the wedding ceremony',
    type: 'date',
    required: false
    key: 'venue_name',
    label: 'Venue Name',
    description: 'Name of the wedding venue',
  }
]
const mockCreateEmailTemplate = createEmailTemplate as jest.MockedFunction<typeof createEmailTemplate>
const mockUpdateEmailTemplate = updateEmailTemplate as jest.MockedFunction<typeof updateEmailTemplate>
describe('EmailTemplateEditor', () => {
  const mockOnSave = jest.fn()
  const mockOnCancel = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('Component Rendering', () => {
    it('renders all form sections', () => {
      render(
        <EmailTemplateEditor
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          mergeFields={mockMergeFields}
        />
      )
      expect(screen.getByText('Template Details')).toBeInTheDocument()
      expect(screen.getByLabelText(/template name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/category/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/subject line/i)).toBeInTheDocument()
      expect(screen.getByTestId('editor-content')).toBeInTheDocument()
    })
    it('renders with existing template data', () => {
          template={mockTemplate}
      expect(screen.getByDisplayValue('Test Template')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test Subject {{client_name}}')).toBeInTheDocument()
      expect(screen.getByDisplayValue('welcome')).toBeInTheDocument()
    it('shows correct title for new vs edit mode', () => {
      const { rerender } = render(
      expect(screen.getByText('Create Email Template')).toBeInTheDocument()
      rerender(
      expect(screen.getByText('Edit Email Template')).toBeInTheDocument()
  describe('Form Validation', () => {
    it('validates required fields', async () => {
      const user = userEvent.setup()
      const saveButton = screen.getByRole('button', { name: /save template/i })
      await user.click(saveButton)
      expect(screen.getByText(/template name is required/i)).toBeInTheDocument()
      expect(screen.getByText(/subject line is required/i)).toBeInTheDocument()
    it('validates template name length', async () => {
      const nameInput = screen.getByLabelText(/template name/i)
      await user.type(nameInput, 'A'.repeat(201))
      expect(screen.getByText(/name must be 200 characters or less/i)).toBeInTheDocument()
    it('validates subject line length', async () => {
      const subjectInput = screen.getByLabelText(/subject line/i)
      await user.type(subjectInput, 'A'.repeat(501))
      expect(screen.getByText(/subject must be 500 characters or less/i)).toBeInTheDocument()
    it('validates category selection', async () => {
      await user.type(nameInput, 'Valid Name')
      await user.type(subjectInput, 'Valid Subject')
      // Don't select a category
      expect(screen.getByText(/category is required/i)).toBeInTheDocument()
  describe('Merge Fields Integration', () => {
    it('displays merge fields panel', () => {
      expect(screen.getByText('Merge Fields')).toBeInTheDocument()
      expect(screen.getByText('Client Name')).toBeInTheDocument()
      expect(screen.getByText('Wedding Date')).toBeInTheDocument()
      expect(screen.getByText('Venue Name')).toBeInTheDocument()
    it('shows merge field descriptions', () => {
      expect(screen.getByText('Full name of the client')).toBeInTheDocument()
      expect(screen.getByText('Date of the wedding ceremony')).toBeInTheDocument()
      expect(screen.getByText('Name of the wedding venue')).toBeInTheDocument()
    it('marks required fields in merge fields panel', () => {
      // Should show required indicator for client_name
      const clientNameField = screen.getByText('Client Name').closest('[data-testid="merge-field"]')
      expect(clientNameField).toHaveTextContent('*')
    it('inserts merge field into subject line', async () => {
      await user.click(subjectInput)
      const clientNameField = screen.getByRole('button', { name: /insert client name/i })
      await user.click(clientNameField)
      expect(subjectInput).toHaveValue(expect.stringContaining('{{client_name}}'))
    it('groups merge fields by category', () => {
      const categorizedMergeFields = [
        ...mockMergeFields,
        {
          key: 'payment_amount',
          label: 'Payment Amount',
          description: 'Outstanding payment amount',
          type: 'currency',
          category: 'payment'
        }
      ]
          mergeFields={categorizedMergeFields}
      expect(screen.getByText('Client Information')).toBeInTheDocument()
      expect(screen.getByText('Payment Information')).toBeInTheDocument()
  describe('WYSIWYG Editor', () => {
    it('renders TipTap editor', () => {
    it('shows editor toolbar', () => {
      expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /underline/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /bullet list/i })).toBeInTheDocument()
    it('toggles between visual and HTML view', async () => {
      const htmlViewButton = screen.getByRole('button', { name: /html view/i })
      await user.click(htmlViewButton)
      expect(screen.getByTestId('html-editor')).toBeInTheDocument()
      const visualViewButton = screen.getByRole('button', { name: /visual view/i })
      await user.click(visualViewButton)
  describe('Preview Functionality', () => {
    it('opens preview modal', async () => {
      const previewButton = screen.getByRole('button', { name: /preview/i })
      await user.click(previewButton)
      expect(screen.getByText('Email Preview')).toBeInTheDocument()
      expect(screen.getByText('Subject:')).toBeInTheDocument()
    it('renders template with sample data in preview', async () => {
      // Should show template with sample data
      expect(screen.getByText(/hello.*sample.*client/i)).toBeInTheDocument()
    it('allows customizing preview data', async () => {
      // Should show form to customize preview data
      expect(screen.getByLabelText(/client name/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/wedding date/i)).toBeInTheDocument()
      const clientNameInput = screen.getByLabelText(/client name/i)
      await user.clear(clientNameInput)
      await user.type(clientNameInput, 'John & Jane Smith')
      const updateButton = screen.getByRole('button', { name: /update preview/i })
      await user.click(updateButton)
      expect(screen.getByText(/john.*jane.*smith/i)).toBeInTheDocument()
  describe('Template Saving', () => {
    it('creates new template successfully', async () => {
      mockCreateEmailTemplate.mockResolvedValue(mockTemplate)
      // Fill in form
      await user.type(screen.getByLabelText(/template name/i), 'New Template')
      await user.type(screen.getByLabelText(/subject line/i), 'New Subject')
      await user.selectOptions(screen.getByLabelText(/category/i), 'welcome')
      await waitFor(() => {
        expect(mockCreateEmailTemplate).toHaveBeenCalledWith({
          name: 'New Template',
          subject: 'New Subject',
          content: '<p>Mocked content</p>',
          category: 'welcome',
          status: 'draft'
        })
      })
      expect(toast.success).toHaveBeenCalledWith('Template created successfully!')
      expect(mockOnSave).toHaveBeenCalledWith(mockTemplate)
    it('updates existing template successfully', async () => {
      mockUpdateEmailTemplate.mockResolvedValue({ ...mockTemplate, name: 'Updated Template' })
      const nameInput = screen.getByDisplayValue('Test Template')
      await user.clear(nameInput)
      await user.type(nameInput, 'Updated Template')
      const saveButton = screen.getByRole('button', { name: /save changes/i })
        expect(mockUpdateEmailTemplate).toHaveBeenCalledWith('1', {
          name: 'Updated Template',
          subject: 'Test Subject {{client_name}}',
          category: 'welcome'
      expect(toast.success).toHaveBeenCalledWith('Template updated successfully!')
    it('handles save errors gracefully', async () => {
      mockCreateEmailTemplate.mockRejectedValue(new Error('Save failed'))
        expect(toast.error).toHaveBeenCalledWith('Failed to save template. Please try again.')
  describe('Draft Auto-Save', () => {
    it('auto-saves draft periodically', async () => {
      jest.useFakeTimers()
      // Make changes
      await user.type(screen.getByLabelText(/template name/i), 'Auto-save test')
      // Fast-forward time to trigger auto-save
      jest.advanceTimersByTime(30000) // 30 seconds
      expect(screen.getByText(/draft saved/i)).toBeInTheDocument()
      jest.useRealTimers()
    it('shows unsaved changes indicator', async () => {
      await user.type(nameInput, ' Modified')
      expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument()
  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      expect(screen.getByRole('form')).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /template name/i })).toBeInTheDocument()
      expect(screen.getByRole('textbox', { name: /subject line/i })).toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: /category/i })).toBeInTheDocument()
    it('supports keyboard navigation', async () => {
      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/template name/i)).toHaveFocus()
      expect(screen.getByLabelText(/category/i)).toHaveFocus()
      expect(screen.getByLabelText(/subject line/i)).toHaveFocus()
    it('announces form validation errors to screen readers', async () => {
      const errorMessage = screen.getByText(/template name is required/i)
      expect(errorMessage).toHaveAttribute('role', 'alert')
  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375, writable: true })
      
      const mergeFieldsPanel = screen.getByTestId('merge-fields-panel')
      expect(mergeFieldsPanel).toHaveClass('mobile-layout')
    it('collapses merge fields panel on mobile by default', () => {
      expect(screen.getByTestId('merge-fields-panel')).toHaveClass('collapsed')
})
