import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll, Mock } from 'vitest';
import userEvent from '@testing-library/user-event'
import { TemplateBulkActions } from '../TemplateBulkActions'
import { BulkAction } from '@/types/email-template-library'

describe('TemplateBulkActions', () => {
  const mockSelectedTemplates = ['template-1', 'template-2', 'template-3']
  const mockOnAction = jest.fn()
  const mockOnClearSelection = jest.fn()
  beforeEach(() => {
    jest.clearAllMocks()
  })
  describe('Component Rendering', () => {
    it('renders selection count and actions', () => {
      render(
        <TemplateBulkActions
          selectedTemplates={mockSelectedTemplates}
          onAction={mockOnAction}
          onClearSelection={mockOnClearSelection}
        />
      )
      expect(screen.getByText('3 selected')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /activate/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /archive/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
    })
    it('shows correct text for single selection', () => {
          selectedTemplates={['template-1']}
      expect(screen.getByText('1 selected')).toBeInTheDocument()
    it('includes clear selection button', () => {
      expect(screen.getByRole('button', { name: /clear selection/i })).toBeInTheDocument()
  describe('Action Buttons', () => {
    it('calls onAction with activate when activate button clicked', async () => {
      const user = userEvent.setup()
      const activateButton = screen.getByRole('button', { name: /activate/i })
      await user.click(activateButton)
      expect(mockOnAction).toHaveBeenCalledWith({
        type: 'activate',
        templateIds: mockSelectedTemplates
      })
    it('calls onAction with archive when archive button clicked', async () => {
      const archiveButton = screen.getByRole('button', { name: /archive/i })
      await user.click(archiveButton)
        type: 'archive',
    it('shows confirmation dialog for delete action', async () => {
      const deleteButton = screen.getByRole('button', { name: /delete/i })
      await user.click(deleteButton)
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument()
      expect(screen.getByText('3 templates')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    it('executes delete when confirmed', async () => {
      // Open delete confirmation
      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: /confirm delete/i })
      await user.click(confirmButton)
        type: 'delete',
    it('cancels delete when cancelled', async () => {
      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)
      expect(mockOnAction).not.toHaveBeenCalled()
      expect(screen.queryByText(/are you sure you want to delete/i)).not.toBeInTheDocument()
  describe('Move to Folder Action', () => {
    it('shows folder selection when move button clicked', async () => {
      const mockFolders = [
        { id: 'folder-1', name: 'Client Communications' },
        { id: 'folder-2', name: 'Payment Reminders' }
      ]
          folders={mockFolders}
      const moveButton = screen.getByRole('button', { name: /move to folder/i })
      await user.click(moveButton)
      expect(screen.getByText('Select Folder')).toBeInTheDocument()
      expect(screen.getByText('Client Communications')).toBeInTheDocument()
      expect(screen.getByText('Payment Reminders')).toBeInTheDocument()
    it('executes move to folder action', async () => {
      // Open folder selection
      // Select a folder
      const folderOption = screen.getByText('Client Communications')
      await user.click(folderOption)
        type: 'move_folder',
        templateIds: mockSelectedTemplates,
        metadata: { folderId: 'folder-1' }
    it('creates new folder when requested', async () => {
        { id: 'folder-1', name: 'Client Communications' }
      // Click create new folder
      const createButton = screen.getByRole('button', { name: /create new folder/i })
      await user.click(createButton)
      expect(screen.getByPlaceholderText(/folder name/i)).toBeInTheDocument()
      // Type folder name and submit
      const nameInput = screen.getByPlaceholderText(/folder name/i)
      await user.type(nameInput, 'New Folder')
      const submitButton = screen.getByRole('button', { name: /create/i })
      await user.click(submitButton)
        type: 'create_folder',
        metadata: { folderName: 'New Folder' }
  describe('Export Action', () => {
    it('calls onAction with export when export button clicked', async () => {
      const exportButton = screen.getByRole('button', { name: /export/i })
      await user.click(exportButton)
        type: 'export',
    it('shows export format selection', async () => {
      expect(screen.getByText('Export Format')).toBeInTheDocument()
      expect(screen.getByText('JSON')).toBeInTheDocument()
      expect(screen.getByText('CSV')).toBeInTheDocument()
      expect(screen.getByText('HTML Archive')).toBeInTheDocument()
  describe('Clear Selection', () => {
    it('calls onClearSelection when clear button clicked', async () => {
      const clearButton = screen.getByRole('button', { name: /clear selection/i })
      await user.click(clearButton)
      expect(mockOnClearSelection).toHaveBeenCalled()
  describe('Loading States', () => {
    it('shows loading state during action execution', async () => {
          isLoading={true}
      expect(screen.getByRole('progressbar')).toBeInTheDocument()
      
      // Buttons should be disabled during loading
      expect(screen.getByRole('button', { name: /activate/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /archive/i })).toBeDisabled()
      expect(screen.getByRole('button', { name: /delete/i })).toBeDisabled()
    it('shows progress for long-running operations', () => {
          progress={{ current: 2, total: 3, operation: 'activating' }}
      expect(screen.getByText('Activating templates... 2 of 3')).toBeInTheDocument()
      expect(screen.getByRole('progressbar')).toHaveAttribute('value', '66')
  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      expect(screen.getByRole('toolbar', { name: /bulk actions/i })).toBeInTheDocument()
      expect(screen.getByRole('status', { name: /selection count/i })).toBeInTheDocument()
    it('supports keyboard navigation', async () => {
      // Tab through action buttons
      await user.tab()
      expect(screen.getByRole('button', { name: /activate/i })).toHaveFocus()
      expect(screen.getByRole('button', { name: /archive/i })).toHaveFocus()
      expect(screen.getByRole('button', { name: /delete/i })).toHaveFocus()
    it('announces selection changes to screen readers', () => {
      const { rerender } = render(
      rerender(
          selectedTemplates={['template-1', 'template-2']}
      expect(screen.getByRole('status', { name: /selection count/i })).toHaveTextContent('2 selected')
  describe('Action Validation', () => {
    it('disables actions when no templates selected', () => {
          selectedTemplates={[]}
    it('shows appropriate action labels based on selection', () => {
          selectionInfo={{ 
            allActive: false, 
            allArchived: true, 
            mixed: false 
          }}
      // Should show "Activate" for archived templates
      expect(screen.queryByRole('button', { name: /archive/i })).not.toBeInTheDocument()
  describe('Error Handling', () => {
    it('displays error message when action fails', () => {
          error="Failed to update templates"
      expect(screen.getByText('Failed to update templates')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument()
    it('dismisses error when dismiss button clicked', async () => {
      const mockOnDismissError = jest.fn()
          onDismissError={mockOnDismissError}
      const dismissButton = screen.getByRole('button', { name: /dismiss/i })
      await user.click(dismissButton)
      expect(mockOnDismissError).toHaveBeenCalled()
  describe('Batch Size Warnings', () => {
    it('warns about large batch operations', () => {
      const largeSelection = Array.from({ length: 50 }, (_, i) => `template-${i}`)
          selectedTemplates={largeSelection}
      expect(screen.getByText(/large selection/i)).toBeInTheDocument()
      expect(screen.getByText(/this operation may take longer/i)).toBeInTheDocument()
    it('suggests batch processing for very large selections', () => {
      const veryLargeSelection = Array.from({ length: 200 }, (_, i) => `template-${i}`)
          selectedTemplates={veryLargeSelection}
      expect(screen.getByText(/very large selection/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /process in batches/i })).toBeInTheDocument()
})
